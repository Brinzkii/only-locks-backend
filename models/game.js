const db = require('../db');
const axios = require('axios');
const { NotFoundError, BadRequestError } = require('../expressError');
const Team = require('./team');

/** Related functions for games */

class Game {
	/** Given a game_id, check if in database and throws NotFoundError if not */

	static async checkValid(gameId) {
		const gameRes = await db.query(
			`SELECT id, date, location, home_team, away_team
            FROM games
            WHERE id = $1`,
			[gameId]
		);

		const game = gameRes.rows[0];

		if (!game) throw new NotFoundError(`No game: ${gameId}`);

		return game;
	}

	/** Given a game_id, returns data about game
	 *
	 *  Returns { id, date, location, homeId, homeName,
	 *            homeCode, homeLogo, awayId, awayName,
	 * 			  awayCode, awayLogo, clock, score }
	 *
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const gameRes = await db.query(
			`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score
            FROM games g
			JOIN teams t1 ON g.home_team = t1.id
			JOIN teams t2 ON g.away_team = t2.id
            WHERE g.id = $1`,
			[id]
		);

		const game = gameRes.rows[0];

		if (!game) throw new NotFoundError(`No game found: ${id}`);

		return game;
	}

	/** Returns all NBA games
	 *
	 *  Returns { id, date, location, homeId, homeName,
	 *            homeCode, homeLogo, awayId, awayName,
	 * 			  awayCode, awayLogo, clock, score }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async getAll() {
		const gamesRes = await db.query(
			`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score
            FROM games g
			JOIN teams t1 ON g.home_team = t1.id
			JOIN teams t2 ON g.away_team = t2.id`
		);

		const games = gamesRes.rows;

		if (!games) throw new NotFoundError(`No games found`);

		return games;
	}

	/** Filter games by teamId or date
	 *
	 * 	Returns [ { game } ]
	 *
	 *  Where game is { id, date, location, homeId, homeName,
	 *            		homeCode, homeLogo, awayId, awayName,
	 * 			  		awayCode, awayLogo, clock,
	 * 					score }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async filter(teamId = null, date = null) {
		if (!teamId && !date) throw new BadRequestError('Must filter by a team, player or date!');

		let gamesRes;
		let games;

		if (teamId && date) {
			gamesRes = await db.query(
				`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score
				FROM games g
				JOIN teams t1 ON g.home_team = t1.id
				JOIN teams t2 ON g.away_team = t2.id
				WHERE g.home_team = $1
				OR g.away_team = $1
				AND g.date = $2`,
				[teamId, date]
			);
		} else if (teamId && !date) {
			gamesRes = await db.query(
				`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score
				FROM games g
				JOIN teams t1 ON g.home_team = t1.id
				JOIN teams t2 ON g.away_team = t2.id
				WHERE g.home_team = $1
				OR g.away_team = $1`,
				[teamId]
			);
		} else {
			gamesRes = await db.query(
				`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score
				FROM games g
				JOIN teams t1 ON g.home_team = t1.id
				JOIN teams t2 ON g.away_team = t2.id
				WHERE g.date = $1`,
				[date]
			);
		}

		games = gamesRes.rows;

		if (!games) throw new NotFoundError('No games found with that teamID or date!');

		return games;
	}
}

module.exports = Game;

