const fs = require('fs');
const path = require('path');
const POINTS_PATH = path.join(__dirname, '../points.json');

class PointsManager {
    static getPoints() {
        try {
            if (fs.existsSync(POINTS_PATH)) {
                return JSON.parse(fs.readFileSync(POINTS_PATH, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load points:', e);
        }
        return {};
    }

    static addPoints(userId, amount) {
        const points = this.getPoints();
        points[userId] = (points[userId] || 0) + amount;
        this.savePoints(points);
    }

    static savePoints(points) {
        try {
            fs.writeFileSync(POINTS_PATH, JSON.stringify(points, null, 2));
        } catch (e) {
            console.error('Failed to save points:', e);
        }
    }

    static resetPoints() {
        this.savePoints({});
    }
}

module.exports = PointsManager;
