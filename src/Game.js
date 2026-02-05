const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { STATE, STRINGS, ROUND_DURATION, VOTE_TIMEOUT, GAME_STATES, MIN_PLAYERS, MAX_PLAYERS } = require('./Constants');
const Words = require('./Words');
const Player = require('./Player');

class Game {
    constructor(channel, host) {
        this.channel = channel;
        this.host = host; // Maybe useful later
        this.players = new Map(); // Map<UserId, Player>
        this.state = GAME_STATES.LOBBY;
        this.roundCount = 0;
        this.secretWord = null;
        this.imposters = [];
        this.messageCollector = null;
        this.voteCollector = null;
        this.lobbyMessage = null;
        this.currentTimer = null;
        this.roundResolve = null;
        this.onEnd = null; // Callback for cleanup
    }

    addPlayer(interaction) {
        const user = interaction.user;
        if (this.players.has(user.id)) return false;
        if (this.players.size >= MAX_PLAYERS) return false;
        this.players.set(user.id, new Player(user, interaction));
        return true;
    }

    get playerCount() {
        return this.players.size;
    }

    get playerNamesList() {
        return Array.from(this.players.values()).map(p => p.displayName).join('\n') || 'لا يوجد لاعبين بعد';
    }

    async startGame() {
        if (this.playerCount < MIN_PLAYERS) {
            this.state = GAME_STATES.ENDED;
            return await this.channel.send(STRINGS.GAME_CANCELLED);
        }

        this.state = GAME_STATES.PLAYING;
        this.assignRoles();
        this.secretWord = Words.getRandomWord();

        // Notify Channel First (Publicly)
        const startEmbed = new EmbedBuilder()
            .setTitle('🚀 بدأت اللعبة!')
            .setDescription(`${STRINGS.IMPOSTER_COUNT_MSG.replace('{count}', this.imposters.length)}\n\n(راجعوا الرسائل المخفية لمعرفة أدواركم والكلمة السرية!)`)
            .setColor('#2ECC71'); // Green for start

        await this.channel.send({ embeds: [startEmbed] });

        // Notify Players via Ephemeral FollowUp
        const notifyPromises = [];
        this.players.forEach(player => {
            const msg = player.isImposter 
                ? STRINGS.IMPOSTER_DM 
                : STRINGS.CREW_DM.replace('{word}', this.secretWord);
            
            // Use followUp with ephemeral: true
            notifyPromises.push(
                player.interaction.followUp({ content: msg, ephemeral: true })
                    .catch(e => console.log(`Failed to send role to ${player.username}: ${e}`))
            );
        });
        await Promise.all(notifyPromises);

        this.startRounds();
    }

    assignRoles() {
        const playerIds = Array.from(this.players.keys());
        const count = this.playerCount;
        let imposterCount = 1;

        if (count >= 6 && count <= 10) imposterCount = 2;
        else if (count >= 11 && count <= 15) imposterCount = 3;
        else if (count >= 16) imposterCount = 4;

        // Shuffle and pick
        for (let i = playerIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
        }

        for (let i = 0; i < imposterCount; i++) {
            const player = this.players.get(playerIds[i]);
            player.isImposter = true;
            this.imposters.push(player);
        }
    }

    async startRounds() {
        for (let i = 1; i <= 3; i++) {
            this.roundCount = i;
            await this.channel.send(STRINGS.ROUND_START.replace('{round}', i));
            await this.playRound();
            if (this.state === GAME_STATES.ENDED) return; // Stop if game ended externally
        }
        this.startVoting();
    }

    async playRound() {
        return new Promise(async (resolve) => {
            this.roundResolve = resolve;
            
            const playersList = Array.from(this.players.values());
            // Reset participation
            playersList.forEach(p => p.hasParticipatedInRound = false);

            let available = [...playersList];
            
            // Function to run a step of the round
            const runStep = async () => {
                if (this.state === GAME_STATES.ENDED) {
                    resolve();
                    return;
                }

                if (available.length < 2) {
                    this.roundResolve = null;
                    resolve(); // Round end
                    return;
                }

                // Pick 2 random players
                const askerIndex = Math.floor(Math.random() * available.length);
                const asker = available[askerIndex];
                available.splice(askerIndex, 1);

                const answererIndex = Math.floor(Math.random() * available.length);
                const answerer = available[answererIndex];
                available.splice(answererIndex, 1);

                // Send Message
                await this.channel.send(STRINGS.QA_PAIR
                    .replace('{asker}', asker.id)
                    .replace('{answerer}', answerer.id));

                // Wait 40s
                this.currentTimer = setTimeout(() => {
                    if (this.state === GAME_STATES.ENDED) {
                        resolve();
                        return;
                    }
                    runStep();
                }, ROUND_DURATION);
            };

            runStep();
        });
    }

    stop() {
        this.state = GAME_STATES.ENDED;
        if (this.currentTimer) clearTimeout(this.currentTimer);
        if (this.roundResolve) this.roundResolve();
        if (this.voteCollector) this.voteCollector.stop();
        if (this.onEnd) this.onEnd();
    }

    async startVoting() {
        this.state = GAME_STATES.VOTING;
        await this.channel.send(STRINGS.VOTE_START);

        // Collect Votes
        const votes = new Map(); // TargetId -> Count
        const voters = new Set();

        const generateComponents = () => {
             const rows = [];
             let currentRow = new ActionRowBuilder();
             
             Array.from(this.players.values()).forEach((player, index) => {
                 if (index % 5 === 0 && index !== 0) {
                     rows.push(currentRow);
                     currentRow = new ActionRowBuilder();
                 }
                 
                 const voteCount = votes.get(player.id) || 0;
                 currentRow.addComponents(
                     new ButtonBuilder()
                         .setCustomId(`vote_${player.id}`)
                         .setLabel(`${player.displayName} (${voteCount})`)
                         .setStyle(ButtonStyle.Secondary)
                 );
             });
             rows.push(currentRow);
             return rows;
        };

        const voteMsg = await this.channel.send({ components: generateComponents() });

        const collector = voteMsg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: VOTE_TIMEOUT 
        });
        this.voteCollector = collector;

        collector.on('collect', async i => {
            if (voters.has(i.user.id)) {
                return i.reply({ content: 'لقد صوت بالفعل!', ephemeral: true });
            }
            
            const targetId = i.customId.split('_')[1];
            votes.set(targetId, (votes.get(targetId) || 0) + 1);
            voters.add(i.user.id);

            // Update components with new counts
            await i.update({ components: generateComponents() });
        });

        collector.on('end', () => {
             this.handleResults(votes);
        });
    }

    handleResults(votes) {
        this.state = GAME_STATES.ENDED;
        
        // Find who got most votes
        let maxVotes = 0;
        let votedOutId = null;

        votes.forEach((count, id) => {
            if (count > maxVotes) {
                maxVotes = count;
                votedOutId = id;
            }
        });

        // Simple win logic for 1 imposter (expandable for multiple)
        // If multiple imposters, logic is more complex as per prompt
        
        if (!votedOutId) {
             this.channel.send(STRINGS.IMPOSTER_WIN); // No one voted out? Imposter wins? Or just skip?
             // Prompt says "If they fail to reveal him -> Imposter wins"
             return;
        }

        const votedPlayer = this.players.get(votedOutId);
        if (votedPlayer.isImposter) {
             // Check if all imposters caught?
             // For simplicity, let's assume if the voted person is imposter, Crew wins (for 1 imposter scenario)
             this.channel.send(STRINGS.CREW_WIN + `\nالـ Imposter كان <@${votedPlayer.id}>`);
        } else {
             this.channel.send(STRINGS.IMPOSTER_WIN + `\nالضحية البريئة كانت <@${votedPlayer.id}>`);
             // Reveal actual imposters
             const imposterNames = this.imposters.map(p => `<@${p.id}>`).join(', ');
             this.channel.send(`الـ Imposters الحقيقيون هم: ${imposterNames}`);
        }
        
        if (this.onEnd) this.onEnd();
    }
}

module.exports = Game;
