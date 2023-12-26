const db = require('../db');
const axios = require('axios');
const { NotFoundError, BadRequestError } = require('../expressError');
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

		const homeTeam = await Team.get(game.hometeam);
		const awayTeam = await Team.get(game.awayteam);
		game.homeTeam = homeTeam;
		game.awayTeam = awayTeam;

		return game;
	}

	/** Returns all NBA games
	 *
	 *  Returns { id, date, location, homeTeam, awayTeam, clock, score }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async getAll() {
		const gamesRes = await db.query(
			`SELECT id, date, location, home_team AS homeTeam, away_team AS awayTeam, clock, score
            FROM games`
		);

		const games = gamesRes.rows;

		if (!games) throw new NotFoundError(`No games found`);

		return games;
	}

	/** Filter games by teamId or date
	 *
	 * 	Returns [ { game } ]
	 *
	 *  Where game is { id, date, location, homeTeam, awayTeam, clock, score }
	 *
	 *  Where homeTeam and awayTeam are { id, code, nickname, name, city, logo,
	 *                                    conference, division }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async filter(teamId = null, date = null) {
		if (!teamId && !date) throw new BadRequestError('Must filter by a team, player or date!');

		let gamesRes;
		let games;

		if (teamId && date) {
			gamesRes = await db.query(
				`SELECT id, date, location, home_team AS homeTeam, away_team AS awayTeam, clock, score
				FROM games
				WHERE home_team = $1
				OR away_team = $1
				AND date = $2`,
				[teamId, date]
			);
		} else if (teamId && !date) {
			gamesRes = await db.query(
				`SELECT id, date, location, home_team AS homeTeam, away_team AS awayTeam, clock, score
				FROM games
				WHERE home_team = $1
				OR away_team = $1`,
				[teamId]
			);
		} else {
			gamesRes = await db.query(
				`SELECT id, date, location, home_team AS homeTeam, away_team AS awayTeam, clock, score
				FROM games
				WHERE date = $1`,
				[date]
			);
		}

		games = gamesRes.rows;

		if (!games) throw new NotFoundError('No games found with that teamID or date!');

		return games;
	}
}

module.exports = Game;
