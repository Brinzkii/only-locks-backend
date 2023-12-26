const db = require('../db');
const axios = require('axios');
const { BadRequestError, NotFoundError } = require('../expressError');
const Team = require('./team');
const Game = require('./game');

/** Related functions for players */

class Player {
	/** Given a player_id, return data about that player.
	 *
	 *  Returns { id, firstName, lastName, birthday, height,
	 *            weight, college, number, position, team }
	 *
	 *  Where team is { id, code, nickname, name, city, logo, conference,
	 *                  division }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const playerRes = await db.query(
			`SELECT id, first_name AS firstName, last_name AS lastName, birthday, height, weight, college, number, position, team_id
            FROM players
            WHERE id = $1`,
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
	 *  Where player is { id, firstName, lastName, birthday, height,
	 *            		  weight, college, number, position, team }
	 *
	 **/

	static async getAll() {
		const playersRes = await db.query(
			`SELECT id, first_name AS firstName, last_name AS lastName, birthday, height, weight, college, number, position, team_id AS teamId
			FROM players`
		);

		return playersRes.rows;
	}

	/** Given a player_id, return season stats for player
	 *
	 *  Returns { points, fgm, fga, fgp, ftm, fta, ftp, tpm,
	 *            tpa, tpp, offReb, defReb, assists, fouls,
	 *            steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async seasonStats(id) {
		const player = await this.get(id);
		const playerStatsRes = await db.query(
			`SELECT points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb AS offReb, def_reb AS defReb, assists, fouls, steals, turnovers, blocks, plus_minus AS plusMinus
            FROM season_stats
            WHERE player_id = $1`,
			[id]
		);

		const seasonStats = playerStatsRes.rows[0];

		if (!seasonStats) throw new NotFoundError(`No stats for player: ${id}`);

		seasonStats.player = { id: player.id, name: player.name };
		return seasonStats;
	}

	/** Given a player_id and game_id, return game stats for player
	 *
	 *  Returns { player, game, minutes, points, fgm, fga, fgp, ftm, fta,
	 *            ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls, steals
	 *            turnovers, blocks }
	 *
	 *  Where player is { id, name }
	 *
	 *  Where game is { id, date, location, homeTeam, awayTeam, clock, score }
	 *
	 **/

	static async gameStats(playerId, gameId) {
		if (!playerId || !gameId) throw new BadRequestError('Must include a player ID and game ID to get game stats!');

		const player = await this.get(playerId);
		const game = await Game.get(gameId);
		const gameStatsRes = await db.query(
			`SELECT minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb AS offReb, def_reb AS defReb, assists, fouls, steals, turnovers, blocks
            FROM game_stats
            WHERE player_id = $1
            AND game_id = $2`,
			[playerId, gameId]
		);

		const gameStats = gameStatsRes.rows[0];

		if (!gameStats) throw new NotFoundError(`No game stats for player: ${playerId} | game: ${gameId}`);

		gameStats.player = { id: player.id, name: player.name };
		gameStats.homeTeam = { id: game.homeTeam.id, name: game.homeTeam.name };
		gameStats.awayTeam = { id: game.awayTeam.id, name: game.awayTeam.name };

		return gameStats;
	}
}

module.exports = Player;
