require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events } = require('discord.js');
const GameManager = require('./src/GameManager');
const { STRINGS, JOIN_TIMEOUT, GAME_STATES, EMBED_COLOR } = require('./src/Constants');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '#imposter') {
        const existingGame = GameManager.getGame(message.channel.id);
        if (existingGame) {
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
        
        // Check permissions (Admin or Host)
        if (!message.member.permissions.has('Administrator') && message.author.id !== game.host.id) {
            return message.reply(STRINGS.NOT_ADMIN);
        }

        game.stop();
        // GameManager.endGame called via onEnd inside stop()
        message.channel.send(STRINGS.GAME_STOPPED);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        const game = GameManager.getGame(interaction.channelId);
        
        if (!game && interaction.customId === 'join_game') {
             return interaction.reply({ content: STRINGS.NO_GAME, ephemeral: true });
        }

        if (interaction.customId === 'join_game') {
            if (game.state !== GAME_STATES.LOBBY) {
                return interaction.reply({ content: 'اللعبة بدأت بالفعل!', ephemeral: true });
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
                game.lobbyMessage.edit({ embeds: [embed] });

            } else {
                if (game.playerCount >= 20) {
                    interaction.reply({ content: 'العدد مكتمل!', ephemeral: true });
                } else {
                    interaction.reply({ content: STRINGS.ALREADY_JOINED, ephemeral: true });
                }
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
