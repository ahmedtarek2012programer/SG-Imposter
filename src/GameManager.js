const Game = require('./Game');
const { STRINGS, ALREADY_GAME } = require('./Constants');

class GameManager {
    constructor() {
        this.games = new Map(); // ChannelId -> Game
    }

    createGame(channel, host) {
        if (this.games.has(channel.id)) {
            return null;
        }
        const game = new Game(channel, host);
        this.games.set(channel.id, game);
        return game;
    }

    getGame(channelId) {
        return this.games.get(channelId);
    }

    hasGame(channelId) {
        return this.games.has(channelId);
    }

    endGame(channelId) {
        this.games.delete(channelId);
    }
}

module.exports = new GameManager();
