const db = require('../db');
const axios = require('axios');
const { BadRequestError, NotFoundError } = require('../expressError');
const Team = require('./team');
const Game = require('./game');
const API_KEY = require('../secrets');
const moment = require('moment');

const BASE_URL = 'https://v2.nba.api-sports.io/';
const headers = {
	'x-rapidapi-key': API_KEY || process.env.API_KEY,
	'x-rapidapi-host': 'v2.nba.api-sports.io',
};
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/** Related functions for players */

class Player {
	/** Given a playerId, check if in database and throws NotFoundError if not */

	static async checkValid(playerId) {
		const playerRes = await db.query(
			`SELECT id, last_name || ', ' || first_name AS name
            FROM players
            WHERE id = $1`,
			[playerId]
		);

		const player = playerRes.rows[0];

		if (!player) throw new NotFoundError(`No player: ${username}`);

		return player;
	}

	/** Given a playerId, return data about that player.
	 *
	 *  Returns { id, name, teamId, teamName,
	 * 			  conference, division, teamLogo, birthday, height,
	 * 			  weight, college, number, position }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const playerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.id AS "teamId", t.name AS "teamName", t.conference AS conference, t.division AS division, t.logo AS "teamLogo", p.birthday, p.height, p.weight, p.college, p.number, p.position
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
	 *  Where player is { id, name, teamId, teamName,
	 * 			  		  conference, division, teamLogo, birthday, height,
	 * 			  		  weight, college, number, position }
	 *
	 **/

	static async getAll() {
		const playersRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.id AS "teamId", t.name AS "teamName", t.conference AS conference, t.division AS division, t.logo AS "teamLogo", p.birthday, p.height, p.weight, p.college, p.number, p.position
            FROM players p
			JOIN teams t ON p.team_id = t.id`
		);

		return playersRes.rows;
	}

	/** Given a player_id, return season stats for player
	 *
	 *  Returns { id, name, minutes, points, fgm, fga,
	 * 			  fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, totalReb
	 * 			  assists, fouls, steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async seasonStats(id) {
		await this.checkValid(id);
		const playerStatsRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
            FROM season_stats s
			JOIN players p ON s.player_id = p.id
            WHERE s.player_id = $1`,
			[id]
		);

		const seasonStats = playerStatsRes.rows[0];

		if (!seasonStats) throw new NotFoundError(`No season stats for player: ${id}`);

		return seasonStats;
	}

	/** Update season stats for all players in DB */

	static async updateSeasonStats() {
		const playersRes = await db.query(`SELECT id, last_name || ', ' || first_name AS name from players`);
		const players = playersRes.rows;
		for (let player of players) {
			// Find all instances of game stats and sum up before adding to season_stats
			const response = await db.query(
				`SELECT SUM(minutes) AS minutes, SUM(points) AS points, SUM(fgm) AS fgm, SUM(fga) AS fga, AVG(NULLIF(fgp, 0)) AS fgp, SUM(ftm) AS ftm, SUM(fta) AS fta, AVG(NULLIF(ftp, 0)) AS ftp, SUM(tpm) AS tpm, SUM(tpa) AS tpa, AVG(NULLIF(tpp, 0)) AS tpp, SUM(off_reb) AS offReb, SUM(def_reb) AS defReb, SUM(off_reb + def_reb) AS totalReb, SUM(assists) AS assists, SUM(fouls) AS fouls, SUM(steals) AS steals, SUM(turnovers) AS turnovers, SUM(blocks) AS blocks, SUM(plus_minus) AS "plusMinus"
				FROM game_stats
				WHERE player_id = $1`,
				[player.id]
			);
			const stats = response.rows[0];

			await db.query(
				`UPDATE season_stats
				SET minutes = $1, points = $2, fgm = $3, fga = $4, fgp = $5, ftm = $6, fta = $7, ftp = $8, tpm = $9, tpa = $10, tpp = $11, off_reb = $12, def_reb = $13, total_reb = $14, assists = $15, fouls = $16, steals = $17, turnovers = $18, blocks = $19, plus_minus = $20
				WHERE player_id = $21`,
				[
					stats.minutes || 0,
					stats.points || 0,
					stats.fgm || 0,
					stats.fga || 0,
					stats.fgp || 0,
					stats.ftm || 0,
					stats.fta || 0,
					stats.ftp || 0,
					stats.tpm || 0,
					stats.tpa || 0,
					stats.tpp || 0,
					stats.offreb || 0,
					stats.defreb || 0,
					stats.totalreb || 0,
					stats.assists || 0,
					stats.fouls || 0,
					stats.steals || 0,
					stats.turnovers || 0,
					stats.blocks || 0,
					stats.plusminus || 0,
					player.id,
				]
			);
			console.log(`Updated season stats for ${player.name}!`);
		}
		return;
	}

	/** Given a player_id and game_id, return game stats for player
	 *
	 *  Returns { id, name, game, minutes, points, fgm,
	 * 			  fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb,
	 * 			  assists, fouls, steals, turnovers, blocks, plusMinus }
	 *
	 *  Where game is { id, date, location, homeId, homeName,
	 *                  homeCode, homeLogo, awayId,
	 * 					awayName, awayCode, awayLogo, clock,
	 *  				score }
	 *
	 * 	Throws NotFoundError if not found.
	 **/

	static async gameStats(playerId, gameId) {
		if (!playerId || !gameId) throw new BadRequestError('Must include a player ID and game ID to get game stats!');

		const gameStatsRes = await db.query(
			`SELECT p.id AS id, p.last_name || ', ' || p.first_name AS name, g.minutes, g.points, g.fgm, g.fga, g.fgp, g.ftm, g.fta, g.ftp, g.tpm, g.tpa, g.tpp, g.off_reb AS "offReb", g.def_reb AS "defReb", g.assists, g.fouls, g.steals, g.turnovers, g.blocks, g.plus_minus AS "plusMinus"
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

	/** Update game stats for players by gameId */

	static async updateGameStats(gameId) {
		if (!gameId) throw new BadRequestError('Must include a game ID to update player game stats!');

		const game = await Game.checkValid(gameId);
		const playersRes = await db.query(
			`SELECT id, last_name || ', ' || first_name AS name FROM players WHERE team_id = $1 OR team_id = $2`,
			[game.home_team, game.away_team]
		);
		const players = playersRes.rows;

		for (let player of players) {
			await delay(150);
			let URL = BASE_URL + `players/statistics?id=${player.id}&game=${game.id}&season=2023`;
			const response = await axios.get(URL, { headers });
			let playerStats = response.data.response;
			const ps = playerStats[0];
			// If no stats returned skip, otherwise if game stats for player exist in DB update, else insert

			const statsExist = await db.query(`SELECT id from game_stats where player_id = $1 AND game_id = $2`, [
				player.id,
				game.id,
			]);

			if (statsExist.rows.length && ps) {
				db.query(
					`UPDATE game_stats
					SET minutes=$1, points=$2, fgm=$3, fga=$4, fgp=$5, ftm=$6, fta=$7, ftp=$8, tpm=$9, tpa=$10, tpp=$11, off_reb=$12, def_reb=$13, assists=$14, fouls=$15, steals=$16, turnovers=$17, blocks=$18, plus_minus=$19
					WHERE player_id = $20
					AND game_id = $21`,
					[
						+ps.min || 0,
						ps.points || 0,
						ps.fgm || 0,
						ps.fga || 0,
						+ps.fgp || 0,
						ps.ftm || 0,
						ps.fta || 0,
						+ps.ftp || 0,
						ps.tpm || 0,
						ps.tpa || 0,
						+ps.tpp || 0,
						ps.offReb || 0,
						ps.defReb || 0,
						ps.assists || 0,
						ps.pFouls || 0,
						ps.steals || 0,
						ps.turnovers || 0,
						ps.blocks || 0,
						+ps.plusMinus || 0,
						player.id,
						game.id,
					]
				);
				console.log(`Updated stats for ${player.name} from Game: ${ps.game.id}`);
			} else if (ps) {
				db.query(
					'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)',
					[
						player.id,
						game.id,
						+ps.min || 0,
						ps.points || 0,
						ps.fgm || 0,
						ps.fga || 0,
						+ps.fgp || 0,
						ps.ftm || 0,
						ps.fta || 0,
						+ps.ftp || 0,
						ps.tpm || 0,
						ps.tpa || 0,
						+ps.tpp || 0,
						ps.offReb || 0,
						ps.defReb || 0,
						ps.assists || 0,
						ps.pFouls || 0,
						ps.steals || 0,
						ps.turnovers || 0,
						ps.blocks || 0,
						+ps.plusMinus || 0,
					]
				);
				console.log(`Added stats for ${player.name} from Game: ${ps.game.id}`);
			}
		}
		return { players, gameId: game.id };
	}

	/** Update game stats for yesterday, current day and next day
	 *
	 * 	Optionally, pass in "all" to update all game stats
	 *
	 * 	Throws BadRequestError if bad method used.
	 */

	static async adminUpdateGameStats(method = 'default') {
		const lowMethod = method.toLowerCase();
		if (lowMethod != 'all' && lowMethod != 'default') {
			throw new BadRequestError(`Must pass in "all" or nothing to update game stats`);
		}

		if (lowMethod === 'all') {
			// Get all players currently in DB
			const response = await db.query('SELECT id FROM players ORDER BY last_name');
			let players = response.rows;
			// Request each players stats - this returns all games and their stats for the season
			for (let player of players) {
				await delay(250);
				let URL = BASE_URL + `players/statistics?id=${player.id}&season=2023`;
				const response = await axios.get(URL, { headers });
				let playerStats = response.data.response;
				for (let ps of playerStats) {
					// Only add stats if game is in DB
					const validGame = await db.query('SELECT id FROM games WHERE id = $1', [ps.game.id]);
					if (validGame.rows.length) {
						// If game stats for player exist update, otherwise insert
						const statsExist = await db.query(
							`SELECT id from game_stats where player_id = $1 AND game_id = $2`,
							[player.id, ps.game.id]
						);
						if (statsExist.rows.length) {
							db.query(
								`UPDATE game_stats
								SET minutes=$1, points=$2, fgm=$3, fga=$4, fgp=$5, ftm=$6, fta=$7, ftp=$8, tpm=$9, tpa=$10, tpp=$11, off_reb=$12, def_reb=$13, assists=$14, fouls=$15, steals=$16, turnovers=$17, blocks=$18, plus_minus=$19
								WHERE player_id = $20
								AND game_id = $21`,
								[
									+ps.min || 0,
									ps.points || 0,
									ps.fgm || 0,
									ps.fga || 0,
									+ps.fgp || 0,
									ps.ftm || 0,
									ps.fta || 0,
									+ps.ftp || 0,
									ps.tpm || 0,
									ps.tpa || 0,
									+ps.tpp || 0,
									ps.offReb || 0,
									ps.defReb || 0,
									ps.assists || 0,
									ps.pFouls || 0,
									ps.steals || 0,
									ps.turnovers || 0,
									ps.blocks || 0,
									+ps.plusMinus || 0,
									player.id,
									ps.game.id,
								]
							);
							console.log(
								`Updated stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
							);
						} else {
							db.query(
								'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)',
								[
									ps.player.id,
									ps.game.id,
									+ps.min || 0,
									ps.points || 0,
									ps.fgm || 0,
									ps.fga || 0,
									+ps.fgp || 0,
									ps.ftm || 0,
									ps.fta || 0,
									+ps.ftp || 0,
									ps.tpm || 0,
									ps.tpa || 0,
									+ps.tpp || 0,
									ps.offReb || 0,
									ps.defReb || 0,
									ps.assists || 0,
									ps.pFouls || 0,
									ps.steals || 0,
									ps.turnovers || 0,
									ps.blocks || 0,
									+ps.plusMinus || 0,
								]
							);
							console.log(
								`Added stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
							);
						}
					}
				}
			}
		} else {
			// Get only games occurring yesterday, today or tomorrow
			const yesterday = moment().subtract(1, 'days');
			const tomorrow = moment().add(1, 'days');
			const gamesRes = await db.query(
				`SELECT id, home_team, away_team FROM games WHERE date >= $1 AND date <= $2`,
				[yesterday.format('LL'), tomorrow.format('LL')]
			);
			const games = gamesRes.rows;

			// Get all players in a game
			for (let game of games) {
				const playersRes = await db.query(`SELECT id FROM players WHERE team_id = $1 OR team_id = $2`, [
					game.home_team,
					game.away_team,
				]);
				const players = playersRes.rows;

				// For each player, request game stats from external API and either update or insert into DB
				for (let player of players) {
					await delay(150);
					let URL = BASE_URL + `players/statistics?id=${player.id}&game=${game.id}&season=2023`;
					const response = await axios.get(URL, { headers });
					let playerStats = response.data.response;
					const ps = playerStats[0];
					// If game stats for player exist update, otherwise insert

					const statsExist = await db.query(
						`SELECT id from game_stats where player_id = $1 AND game_id = $2`,
						[player.id, game.id]
					);

					if (statsExist.rows.length && ps) {
						db.query(
							`UPDATE game_stats
								SET minutes=$1, points=$2, fgm=$3, fga=$4, fgp=$5, ftm=$6, fta=$7, ftp=$8, tpm=$9, tpa=$10, tpp=$11, off_reb=$12, def_reb=$13, assists=$14, fouls=$15, steals=$16, turnovers=$17, blocks=$18, plus_minus=$19
								WHERE player_id = $20
								AND game_id = $21`,
							[
								+ps.min || 0,
								ps.points || 0,
								ps.fgm || 0,
								ps.fga || 0,
								+ps.fgp || 0,
								ps.ftm || 0,
								ps.fta || 0,
								+ps.ftp || 0,
								ps.tpm || 0,
								ps.tpa || 0,
								+ps.tpp || 0,
								ps.offReb || 0,
								ps.defReb || 0,
								ps.assists || 0,
								ps.pFouls || 0,
								ps.steals || 0,
								ps.turnovers || 0,
								ps.blocks || 0,
								+ps.plusMinus || 0,
								player.id,
								game.id,
							]
						);
						console.log(
							`Updated stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
						);
					} else if (ps) {
						db.query(
							'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)',
							[
								player.id,
								game.id,
								+ps.min || 0,
								ps.points || 0,
								ps.fgm || 0,
								ps.fga || 0,
								+ps.fgp || 0,
								ps.ftm || 0,
								ps.fta || 0,
								+ps.ftp || 0,
								ps.tpm || 0,
								ps.tpa || 0,
								+ps.tpp || 0,
								ps.offReb || 0,
								ps.defReb || 0,
								ps.assists || 0,
								ps.pFouls || 0,
								ps.steals || 0,
								ps.turnovers || 0,
								ps.blocks || 0,
								+ps.plusMinus || 0,
							]
						);
						console.log(
							`Added stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
						);
					}
				}
			}
		}
		console.log('All player stats added / updated!');
		return;
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
	 * 	Where seasonStats is { id, name, points, fgm, fga, fgp, ftm, fta,
	 * 						   ftp, tpm, tpa, tpp, offReb, defReb, assists,
	 * 						   fouls, steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws BadRequestError if method or order are invalid.
	 **/

	static async sortByStats(date, method, order = 'DESC') {
		const lowDate = date.toLowerCase();
		const lowMethod = method.toLowerCase();
		const lowOrder = order.toLowerCase();
		const validMethods = [
			'minutes',
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
			'total_reb',
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
				`SELECT p.id, p.last_name || ', ' || p.first_name AS name, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
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
				`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
				FROM game_stats gs
				JOIN players p ON gs.player_id = p.id
				JOIN games ga ON gs.game_id = ga.id
				WHERE ga.date = $1
				ORDER BY ${lowMethod} ${lowOrder}`,
				[day]
			);
		} else {
			playersRes = await db.query(
				`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
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
