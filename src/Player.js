/**
 * Player Class
 */
class Player {
    constructor(user, interaction) {
        this.id = user.id;
        this.username = user.username;
        this.displayName = interaction.member ? interaction.member.displayName : (user.globalName || user.username);
        this.user = user; 
        this.interaction = interaction; // Store interaction for ephemeral follow-ups
        this.isImposter = false;
        this.hasParticipatedInRound = false; 
    }
}

module.exports = Player;
