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

	/** Returns team stats for a given game
	 *
	 * 	Returns { gameId, score, home, away }
	 *
	 * 		Where home and away are { id, name, fast_break_points,
	 * 		points_in_paint, second_chance_points, points_off_turnovers,
	 * 		points, fgm, fga, fgp,ftm, fta, ftp, tpm, tpa, tpp, off_reb,
	 * 		def_reb, total_reb, assists, fouls,steals, turnovers, blocks,
	 * 		plus_minus }
	 *
	 * 	Throws NotFoundError if not found
	 **/

	static async getStats(gameId) {
		const game = await this.checkValid(gameId);
		// Collect home team stats
		const homeStatsRes = await db.query(
			`SELECT t.id, t.name, tgs.fast_break_points AS "fastBreakPoints", tgs.points_in_paint AS "pointsInPaint", tgs.second_chance_points AS "secondChancePoints", tgs.points_off_turnovers AS "pointsOffTurnovers", tgs.points, tgs.fgm, tgs.fga, tgs.fgp, tgs.ftm, tgs.fta, tgs.ftp, tgs.tpm, tgs.tpa, tgs.tpp, tgs.off_reb AS "offReb", tgs.def_reb AS "defReb", tgs.total_reb AS "totalReb", tgs.assists, tgs.fouls, tgs.steals, tgs.turnovers, tgs.blocks, tgs.plus_minus AS "plusMinus"
			FROM team_game_stats tgs
			JOIN teams t ON tgs.team_id = t.id
			WHERE game_id = $1
			AND team_id = $2`,
			[gameId, game.home_team]
		);
		const homeStats = homeStatsRes.rows[0];

		// Collect away team stats
		const awayStatsRes = await db.query(
			`SELECT t.id, t.name, tgs.fast_break_points AS "fastBreakPoints", tgs.points_in_paint AS "pointsInPaint", tgs.second_chance_points AS "secondChancePoints", tgs.points_off_turnovers AS "pointsOffTurnovers", tgs.points, tgs.fgm, tgs.fga, tgs.fgp, tgs.ftm, tgs.fta, tgs.ftp, tgs.tpm, tgs.tpa, tgs.tpp, tgs.off_reb AS "offReb", tgs.def_reb AS "defReb", tgs.total_reb AS "totalReb", tgs.assists, tgs.fouls, tgs.steals, tgs.turnovers, tgs.blocks, tgs.plus_minus AS "plusMinus"
			FROM team_game_stats tgs
			JOIN teams t ON tgs.team_id = t.id
			WHERE game_id = $1
			AND team_id = $2`,
			[gameId, game.away_team]
		);
		const awayStats = awayStatsRes.rows[0];

		let result = { gameId, score: `${homeStats.points} - ${awayStats.points}`, home: {}, away: {} };
		result.home = homeStats;
		result.away = awayStats;

		return result;
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

