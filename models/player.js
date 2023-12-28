const db = require('../db');
const axios = require('axios');
const { BadRequestError, NotFoundError } = require('../expressError');
const Team = require('./team');
const Game = require('./game');

/** Related functions for players */

class Player {
	/** Given a player_id, return data about that player.
	 *
	 *  Returns { player_id, firstName, lastName, team_id, team_name,
	 * 			  team_conference, team_division, team_logo, birthday, height,
	 * 			  weight, college, number, position }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const playerRes = await db.query(
			`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, t.id AS team_id, t.name AS team_name, t.conference AS team_conference, t.division AS team_division, t.logo AS team_logo, p.birthday, p.height, p.weight, p.college, p.number, p.position
            FROM players p
			JOIN teams t ON p.team_id = t.id
            WHERE p.id = $1`,
			[id]
		);

		const player = playerRes.rows[0];

		if (!player) throw new NotFoundError(`No player: ${id}`);

		const team = await Team.get(player.team_id);
		player.team = team;

		return player;
	}

	/** Return data about all players.
	 *
	 *  Returns [ { player }, { player }, ... ]
	 *
	 *  Where player is { player_id, firstName, lastName, team_id, team_name,
	 * 					  team_conference, team_division, team_logo, birthday,
	 * 					  height, weight, college, number, position }
	 *
	 **/

	static async getAll() {
		const playersRes = await db.query(
			`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, t.id AS team_id, t.name AS team_name, t.conference AS team_conference, t.division AS team_division, t.logo AS team_logo, p.birthday, p.height, p.weight, p.college, p.number, p.position
            FROM players p
			JOIN teams t ON p.team_id = t.id`
		);

		return playersRes.rows;
	}

	/** Given a player_id, return season stats for player
	 *
	 *  Returns { player_id, firstname, lastname, points, fgm, fga, fgp, ftm,
	 * 			  fta, ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls,
	 *            steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async seasonStats(id) {
		const player = await this.get(id);
		const playerStatsRes = await db.query(
			`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS offReb, s.def_reb AS defReb, s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS plusMinus
            FROM season_stats s
			JOIN players p ON s.player_id = p.id
            WHERE s.player_id = $1`,
			[id]
		);

		const seasonStats = playerStatsRes.rows[0];

		if (!seasonStats) throw new NotFoundError(`No season stats for player: ${id}`);

		return seasonStats;
	}

	/** Given a player_id and game_id, return game stats for player
	 *
	 *  Returns { player_id, firstname, lastname game, minutes, points, fgm,
	 * 			  fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb,
	 * 			  assists, fouls, steals, turnovers, blocks }
	 *
	 *  Where game is { id, date, location, hometeam_id, hometeam_name,
	 *                  hometeam_code, hometeam_logo, awayteam_id,
	 * 					awayteam_name, awayteam_code, awayteam_logo, clock,
	 *  				score }
	 *
	 * 	Throws NotFoundError if not found.
	 **/

	static async gameStats(playerId, gameId) {
		if (!playerId || !gameId) throw new BadRequestError('Must include a player ID and game ID to get game stats!');

		const gameStatsRes = await db.query(
			`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, g.minutes, g.points, g.fgm, g.fga, g.fgp, g.ftm, g.fta, g.ftp, g.tpm, g.tpa, g.tpp, g.off_reb AS offReb, g.def_reb AS defReb, g.assists, g.fouls, g.steals, g.turnovers, g.blocks
            FROM game_stats g
			JOIN players p ON g.player_id = p.id
            WHERE g.player_id = $1
            AND g.game_id = $2`,
			[playerId, gameId]
		);

		const gameStats = gameStatsRes.rows[0];

		if (!gameStats) throw new NotFoundError(`No game stats for player: ${playerId} | game: ${gameId}`);

		const game = await Game.get(gameId);
		gameStats.game = game;

		return gameStats;
	}

	/** Returns players sorted by desired stat
	 *
	 *  Method to sort by includes: points, fgm, fga, fgp, ftm, fta, ftp,
	 *  tpm, tpa, tpp, offReb, defReb, assists, fouls, steals, turnovers,
	 *  blocks, plusMinus
	 *
	 *  Date may be date string "DD-MM-YYYY", "today", "yesterday", "season"
	 *
	 * 	Order may be DESC or ASC (case insensitive)
	 *
	 * 	Returns [ {seasonStats}, ... ]
	 *
	 * 	Where seasonStats is { player_id, name, points, fgm, fga, fgp, ftm, fta,
	 * 						   ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls,
	 *                         steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws BadRequestError if method or order are invalid.
	 **/

	static async sortByStats(date, method, order = 'DESC') {
		const lowDate = date.toLowerCase();
		const lowMethod = method.toLowerCase();
		const lowOrder = order.toLowerCase();
		const validMethods = [
			'points',
			'fgm',
			'fga',
			'fgp',
			'ftm',
			'fta',
			'ftp',
			'tpm',
			'tpa',
			'tpp',
			'off_reb',
			'def_reb',
			'assists',
			'fouls',
			'steals',
			'turnovers',
			'blocks',
			'plus_minus',
		];
		const isValid = validMethods.indexOf(lowMethod);

		if (isValid === -1) throw new BadRequestError(`Sort method is limited to the following: ${validMethods}`);

		if (lowOrder != 'asc' && lowOrder != 'desc') throw new BadRequestError('Order must be DESC or ASC');

		let playersRes;
		if (lowDate === 'season') {
			playersRes = await db.query(
				`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS offReb, s.def_reb AS defReb, s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS plusMinus
				FROM season_stats s
				JOIN players p ON s.player_id = p.id
				ORDER BY ${lowMethod} ${lowOrder}`
			);
		} else if (lowDate === 'today' || lowDate === 'yesterday') {
			let d;
			let day;
			let yesterday;
			if (lowDate === 'today') {
				d = new Date();
				day = d.toISOString().slice(0, 10);
			} else {
				d = new Date();
				yesterday = d.getDate() - 1;
				d.setDate(yesterday);
				day = d.toISOString().slice(0, 10);
			}

			playersRes = await db.query(
				`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.off_reb AS offReb, gs.def_reb AS defReb, gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks
				FROM game_stats gs
				JOIN players p ON gs.player_id = p.id
				JOIN games ga ON gs.game_id = ga.id
				WHERE ga.date = $1
				ORDER BY ${lowMethod} ${lowOrder}`,
				[day]
			);
		} else {
			playersRes = await db.query(
				`SELECT p.id AS player_id, p.first_name AS firstName, p.last_name AS lastName, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.off_reb AS offReb, gs.def_reb AS defReb, gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks
				FROM game_stats gs
				JOIN players p ON gs.player_id = p.id
				JOIN games ga ON gs.game_id = ga.id
				WHERE ga.date = $1
				ORDER BY ${lowMethod} ${lowOrder}`,
				[lowDate]
			);
		}

		const players = playersRes.rows;

		if (!players) throw new BadRequestError('Error retrieving player stats, please try again!');

		return players;
	}
}

module.exports = Player;
