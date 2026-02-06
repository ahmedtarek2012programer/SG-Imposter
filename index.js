require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, ChannelType, PermissionsBitField } = require('discord.js');
const GameManager = require('./src/GameManager');
const PointsManager = require('./src/PointsManager');
const { STRINGS, JOIN_TIMEOUT, GAME_STATES, EMBED_COLOR } = require('./src/Constants');

const fs = require('fs');
const path = require('path');
const CONFIG_PATH = path.join(__dirname, 'server_config.json');

// Load Config
let serverConfig = {};
try {
    if (fs.existsSync(CONFIG_PATH)) {
        serverConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
} catch (e) {
    console.error('Failed to load config:', e);
}

const saveConfig = () => {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(serverConfig, null, 2));
    } catch (e) {
        console.error('Failed to save config:', e);
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

const BOT_ADMINS = ['mido_tarek14', 'samasemo14'];

const isAdmin = (member, user) => {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) || BOT_ADMINS.includes(user.username);
};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '#setup') {
        if (!isAdmin(message.member, message.author)) {
            return message.reply(STRINGS.NOT_ADMIN);
        }

        const channels = message.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText)
            .first(25); // Limit to 25 for buttons

        const rows = [];
        let currentRow = new ActionRowBuilder();

        channels.forEach((channel, index) => {
            if (index % 5 === 0 && index !== 0) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`setup_channel_${channel.id}`)
                    .setLabel(channel.name.substring(0, 80))
                    .setStyle(ButtonStyle.Secondary)
            );
        });
        rows.push(currentRow);

        const embed = new EmbedBuilder()
            .setTitle(STRINGS.SETUP_TITLE)
            .setDescription(STRINGS.SETUP_DESC)
            .setColor(EMBED_COLOR);

        return message.reply({ embeds: [embed], components: rows });
    }

    if (message.content === '#imposter') {
        // Enforce Channel Restriction
        if (serverConfig.allowedChannelId && message.channel.id !== serverConfig.allowedChannelId) {
            return message.reply(STRINGS.WRONG_CHANNEL.replace('{channel}', serverConfig.allowedChannelId));
        }

        if (GameManager.hasGame(message.channel.id)) {
            return message.reply(STRINGS.ALREADY_GAME);
        }

        const game = GameManager.createGame(message.channel, message.author);
        game.onEnd = () => GameManager.endGame(message.channel.id);
        
        const embed = new EmbedBuilder()
            .setTitle(STRINGS.GAME_TITLE)
            .setDescription(STRINGS.GAME_DESC)
            .setColor(EMBED_COLOR)
            .addFields({ name: 'Players', value: '0/20' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join_game')
                    .setLabel(STRINGS.JOIN_BTN)
                    .setStyle(ButtonStyle.Success)
            );

        const msg = await message.channel.send({ embeds: [embed], components: [row] });
        game.lobbyMessage = msg;
        
        // Start Join Timer
        setTimeout(async () => {
            if (game.state === GAME_STATES.LOBBY) {
                await game.startGame();
                if (game.state === GAME_STATES.ENDED) {
                    GameManager.endGame(message.channel.id);
                }
            }
        }, JOIN_TIMEOUT);
    }

    if (message.content === '#stop') {
        const game = GameManager.getGame(message.channel.id);
        if (!game) return message.reply(STRINGS.NO_GAME);
        
        // Check permissions (Admin or Host or Bot Admin)
        if (!isAdmin(message.member, message.author) && message.author.id !== game.host.id) {
            return message.reply(STRINGS.NOT_ADMIN);
        }

        game.stop();
        // GameManager.endGame called via onEnd inside stop()
        message.channel.send(STRINGS.GAME_STOPPED);
    }

    if (message.content === '#points') {
        const points = PointsManager.getPoints();
        const sorted = Object.entries(points).sort(([,a], [,b]) => b - a);
        
        if (sorted.length === 0) {
            return message.reply('لا يوجد نقاط مسجلة بعد.');
        }

        const top = sorted.map((entry, i) => `${i + 1}. <@${entry[0]}> : ${entry[1]} نقطة`).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 لوحة المتصدرين')
            .setDescription(top)
            .setColor('#F1C40F');
        
        return message.channel.send({ embeds: [embed] });
    }

    if (message.content === '#reset_points') {
        if (!isAdmin(message.member, message.author)) {
            return message.reply(STRINGS.NOT_ADMIN);
        }
        PointsManager.resetPoints();
        return message.reply('✅ تم تصفير جميع النقاط بنجاح.');
    }
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isButton()) {
            const game = GameManager.getGame(interaction.channelId);
            
            if (!game && interaction.customId === 'join_game') {
                 // Try to reply, but if it fails (e.g. unknown interaction), just ignore
                 try {
                    return await interaction.reply({ content: STRINGS.NO_GAME, ephemeral: true });
                 } catch (e) {
                    console.log('Failed to reply to old interaction:', e.message);
                    return;
                 }
            }
    
            if (interaction.customId === 'join_game') {
                if (game.state !== GAME_STATES.LOBBY) {
                    return await interaction.reply({ content: 'اللعبة بدأت بالفعل!', ephemeral: true });
                }
                
                const success = game.addPlayer(interaction);
                if (success) {
                    await interaction.reply({ content: STRINGS.JOINED_MSG, ephemeral: true });
                    
                    // Update Embed
                    const embed = new EmbedBuilder(game.lobbyMessage.embeds[0].data);
                    embed.setFields({ 
                        name: `Players (${game.playerCount}/20)`, 
                        value: game.playerNamesList 
                    });
                    game.lobbyMessage.edit({ embeds: [embed] }).catch(console.error);
    
                } else {
                    if (game.playerCount >= 20) {
                        await interaction.reply({ content: 'العدد مكتمل!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: STRINGS.ALREADY_JOINED, ephemeral: true });
                    }
                }
            } else if (interaction.customId.startsWith('vote_')) {
               if (!game) {
                   try {
                    await interaction.reply({ content: 'انتهت اللعبة!', ephemeral: true });
                   } catch(e) {}
               }
            } else if (interaction.customId.startsWith('setup_channel_')) {
                if (!isAdmin(interaction.member, interaction.user)) {
                    return interaction.reply({ content: STRINGS.NOT_ADMIN, ephemeral: true });
                }
                
                const channelId = interaction.customId.replace('setup_channel_', '');
                serverConfig.allowedChannelId = channelId;
                saveConfig();

                await interaction.update({ 
                    content: STRINGS.SETUP_COMPLETE.replace('{channel}', channelId), 
                    embeds: [], 
                    components: [] 
                });
            }
        }
    } catch (error) {
        console.error('Interaction error:', error);
        if (interaction.repliable && !interaction.replied) {
            try {
                await interaction.reply({ content: 'حدث خطأ غير متوقع.', ephemeral: true });
            } catch (e) {}
        }
    }
});

// Global Error Handling to prevent crashes
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

client.login(process.env.DISCORD_TOKEN);
const http = require("http");

const PORT = process.env.PORT || 8000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is alive");
}).listen(PORT, () => {
  console.log(`Health server running on port ${PORT}`);
});
