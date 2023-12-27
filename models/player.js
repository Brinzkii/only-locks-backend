const db = require('../db');
const axios = require('axios');
const { BadRequestError, NotFoundError } = require('../expressError');
const Team = require('./team');
const Game = require('./game');

/** Related functions for players */

class Player {
	/** Given a player_id, return data about that player.
	 *
	 *  Returns { id, firstName, lastName, team_id, team_name, team_conference,
	 * 			  team_division, team_logo, birthday, height, weight, college, number,
	 * 			  position }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const playerRes = await db.query(
			`SELECT p.id, p.first_name AS firstName, p.last_name AS lastName, t.id AS team_id, t.name AS team_name, t.conference AS team_conference, t.division AS team_division, t.logo AS team_logo, p.birthday, p.height, p.weight, p.college, p.number, p.position
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
	 *  Where player is { id, firstName, lastName, team_id, team_name,
	 * 					  team_conference, team_division, team_logo, birthday,
	 * 					  height, weight, college, number, position }
	 *
	 **/

	static async getAll() {
		const playersRes = await db.query(
			`SELECT p.id, p.first_name AS firstName, p.last_name AS lastName, t.id AS team_id, t.name AS team_name, t.conference AS team_conference, t.division AS team_division, t.logo AS team_logo, p.birthday, p.height, p.weight, p.college, p.number, p.position
            FROM players p
			JOIN teams t ON p.team_id = t.id`
		);

		return playersRes.rows;
	}

	/** Given a player_id, return season stats for player
	 *
	 *  Returns { player_id, name, points, fgm, fga, fgp, ftm, fta, ftp, tpm,
	 *            tpa, tpp, offReb, defReb, assists, fouls,
	 *            steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async seasonStats(id) {
		const player = await this.get(id);
		const playerStatsRes = await db.query(
			`SELECT p.id AS player_id, p.name AS name, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS offReb, s.def_reb AS defReb, s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS plusMinus
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
	 *  Returns { player_id, player_name, game, minutes, points, fgm, fga, fgp,
	 * 			  ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls,
	 * 			  steals, turnovers, blocks }
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
			`SELECT p.id AS player_id, p.name AS player_name, g.minutes, g.points, g.fgm, g.fga, g.fgp, g.ftm, g.fta, g.ftp, g.tpm, g.tpa, g.tpp, g.off_reb AS offReb, g.def_reb AS defReb, g.assists, g.fouls, g.steals, g.turnovers, g.blocks
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
}

module.exports = Player;
