const db = require('../db');
const axios = require('axios');
const { NotFoundError } = require('../expressError');
const Team = require('./team');

/** Related functions for games */

class Game {
	/** Given a game_id, returns data about game
	 *
	 *  Returns { id, date, location, homeTeam, awayTeam, clock, score }
	 *
	 *  Where homeTeam and awayTeam are { id, code, nickname, name, city, logo,
	 *                                    conference, division }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const gameRes = await db.query(
			`SELECT id, date, location, home_team AS homeTeam, away_team AS awayTeam, clock, score
            FROM games
            WHERE id = $1`,
			[id]
		);

		const game = gameRes.rows[0];

		if (!game) throw new NotFoundError(`No game found: ${id}`);

		const homeTeam = await Team.get(game.homeTeam);
		const awayTeam = await Team.get(game.awayTeam);
		game.homeTeam = homeTeam;
		game.awayTeam = awayTeam;

		return game;
	}
}

module.exports = Game;
