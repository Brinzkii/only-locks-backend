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

		const team = await Team.get(player.teamId);
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
	 *  Returns { id, name, gp, minutes, points, fgm, fga,
	 * 			  fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, totalReb
	 * 			  assists, fouls, steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async seasonStats(id) {
		await this.checkValid(id);
		const playerStatsRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, s.gp, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
            FROM season_stats s
			JOIN players p ON s.player_id = p.id
			JOIN teams t ON p.team_id = t.id
            WHERE s.player_id = $1`,
			[id]
		);
		const seasonStats = playerStatsRes.rows[0];

		if (!seasonStats) throw new NotFoundError(`No season stats for player: ${id}`);

		const gamesPlayedRes = await db.query(`SELECT COUNT(id) AS gp from game_stats WHERE player_id = $1`, [id]);
		seasonStats.gp = +gamesPlayedRes.rows[0].gp;

		const perGame = {
			name: seasonStats.name,
			code: seasonStats.code,
			assists: seasonStats.assists / seasonStats.gp || 0,
			blocks: seasonStats.blocks / seasonStats.gp || 0,
			defReb: seasonStats.defReb / seasonStats.gp || 0,
			fga: seasonStats.fga / seasonStats.gp || 0,
			fgm: seasonStats.fgm / seasonStats.gp || 0,
			fgp: seasonStats.fgp || 0,
			fouls: seasonStats.fouls / seasonStats.gp || 0,
			fta: seasonStats.fta / seasonStats.gp || 0,
			ftm: seasonStats.ftm / seasonStats.gp || 0,
			ftp: seasonStats.ftp || 0,
			gp: seasonStats.gp || 0,
			id: seasonStats.id || 0,
			minutes: seasonStats.minutes / seasonStats.gp || 0,
			offReb: seasonStats.offReb / seasonStats.gp || 0,
			plusMinus: seasonStats.plusMinus / seasonStats.gp || 0,
			points: seasonStats.points / seasonStats.gp || 0,
			steals: seasonStats.steals / seasonStats.gp || 0,
			totalReb: seasonStats.totalReb / seasonStats.gp || 0,
			tpa: seasonStats.tpa / seasonStats.gp || 0,
			tpm: seasonStats.tpm / seasonStats.gp || 0,
			tpp: seasonStats.tpp || 0,
			turnovers: seasonStats.turnovers / seasonStats.gp || 0,
		};

		const per36 = {
			name: seasonStats.name,
			code: seasonStats.code,
			assists: (seasonStats.assists / seasonStats.minutes) * 36 || 0,
			blocks: (seasonStats.blocks / seasonStats.minutes) * 36 || 0,
			defReb: (seasonStats.defReb / seasonStats.minutes) * 36 || 0,
			fga: (seasonStats.fga / seasonStats.minutes) * 36 || 0,
			fgm: (seasonStats.fgm / seasonStats.minutes) * 36 || 0,
			fgp: seasonStats.fgp || 0,
			fouls: (seasonStats.fouls / seasonStats.minutes) * 36 || 0,
			fta: (seasonStats.fta / seasonStats.minutes) * 36 || 0,
			ftm: (seasonStats.ftm / seasonStats.minutes) * 36 || 0,
			ftp: seasonStats.ftp || 0,
			gp: seasonStats.gp,
			id: seasonStats.id,
			minutes: (seasonStats.minutes / seasonStats.minutes) * 36 || 0,
			offReb: (seasonStats.offReb / seasonStats.minutes) * 36 || 0,
			plusMinus: (seasonStats.plusMinus / seasonStats.minutes) * 36 || 0,
			points: (seasonStats.points / seasonStats.minutes) * 36 || 0,
			steals: (seasonStats.steals / seasonStats.minutes) * 36 || 0,
			totalReb: (seasonStats.totalReb / seasonStats.minutes) * 36 || 0,
			tpa: (seasonStats.tpa / seasonStats.minutes) * 36 || 0,
			tpm: (seasonStats.tpm / seasonStats.minutes) * 36 || 0,
			tpp: seasonStats.tpp || 0,
			turnovers: (seasonStats.turnovers / seasonStats.minutes) * 36 || 0,
		};
		let results = { totals: [seasonStats], per36: [per36], perGame: [perGame] };

		return results;
	}

	/** Update season stats for all players in DB */

	static async updateSeasonStats() {
		const playersRes = await db.query(`SELECT id, last_name || ', ' || first_name AS name from players`);
		const players = playersRes.rows;
		for (let player of players) {
			// Find all instances of game stats and sum up before adding to season_stats
			const response = await db.query(
				`SELECT COUNT(*) AS gp, SUM(minutes) AS minutes, SUM(points) AS points, SUM(fgm) AS fgm, SUM(fga) AS fga, SUM(ftm) AS ftm, SUM(fta) AS fta, SUM(tpm) AS tpm, SUM(tpa) AS tpa, SUM(off_reb) AS "offReb", SUM(def_reb) AS "defReb", SUM(off_reb + def_reb) AS "totalReb", SUM(assists) AS assists, SUM(fouls) AS fouls, SUM(steals) AS steals, SUM(turnovers) AS turnovers, SUM(blocks) AS blocks, SUM(plus_minus) AS "plusMinus"
				FROM game_stats
				WHERE player_id = $1`,
				[player.id]
			);
			const stats = response.rows[0];

			await db.query(
				`UPDATE season_stats
				SET minutes = $1, points = $2, fgm = $3, fga = $4, fgp = $5, ftm = $6, fta = $7, ftp = $8, tpm = $9, tpa = $10, tpp = $11, off_reb = $12, def_reb = $13, total_reb = $14, assists = $15, fouls = $16, steals = $17, turnovers = $18, blocks = $19, plus_minus = $20, gp = $21
				WHERE player_id = $22`,
				[
					stats.minutes || 0,
					stats.points || 0,
					stats.fgm || 0,
					stats.fga || 0,
					(stats.fgm / stats.fga) * 100 || 0,
					stats.ftm || 0,
					stats.fta || 0,
					(stats.ftm / stats.fta) * 100 || 0,
					stats.tpm || 0,
					stats.tpa || 0,
					(stats.tpm / stats.tpa) * 100 || 0,
					stats.offReb || 0,
					stats.defReb || 0,
					stats.totalReb || 0,
					stats.assists || 0,
					stats.fouls || 0,
					stats.steals || 0,
					stats.turnovers || 0,
					stats.blocks || 0,
					stats.plusMinus || 0,
					stats.gp,
					player.id,
				]
			);
			console.log(`Updated season stats for ${player.name}!`);
		}
		return;
	}

	/** Given a player_id and optional game_id, return game stats for player
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

	static async gameStats(playerId, gameId = undefined) {
		if (!playerId) throw new BadRequestError('Must include a player ID to get player game stats!');

		let gameStatsRes;
		let game;
		console.log(gameId);
		if (gameId !== undefined) {
			gameStatsRes = await db.query(
				`SELECT p.id AS id, p.last_name || ', ' || p.first_name AS name, g.game_id AS "gameId", g.minutes, g.points, g.fgm, g.fga, g.fgp, g.ftm, g.fta, g.ftp, g.tpm, g.tpa, g.tpp, g.total_reb AS "totalReb", g.off_reb AS "offReb", g.def_reb AS "defReb", g.assists, g.fouls, g.steals, g.turnovers, g.blocks, g.plus_minus AS "plusMinus"
				FROM game_stats g
				JOIN players p ON g.player_id = p.id
				WHERE g.player_id = $1
				AND g.game_id = $2`,
				[playerId, gameId]
			);
		} else {
			gameStatsRes = await db.query(
				`SELECT p.id AS id, p.last_name || ', ' || p.first_name AS name, g.game_id AS "gameId", g.minutes, g.points, g.fgm, g.fga, g.fgp, g.ftm, g.fta, g.ftp, g.tpm, g.tpa, g.tpp, g.total_reb AS "totalReb", g.off_reb AS "offReb", g.def_reb AS "defReb", g.assists, g.fouls, g.steals, g.turnovers, g.blocks, g.plus_minus AS "plusMinus"
				FROM game_stats g
				JOIN players p ON g.player_id = p.id
				JOIN games ON g.game_id = games.id
				WHERE g.player_id = $1
				ORDER BY games.date ASC`,
				[playerId]
			);
		}

		const gameStats = !gameId ? gameStatsRes.rows : gameStatsRes.rows[0];

		if (!gameStats) throw new NotFoundError(`No game stats for player: ${playerId} | game: ${gameId}`);

		return gameStats;
	}

	/** Update game stats for players by gameId */

	static async updateGameStats(gameId) {
		if (!gameId) throw new BadRequestError('Must include a game ID to update player game stats!');

		const game = await db.query('SELECT id FROM games WHERE id = $1', [gameId])

		if (!game.rows.length) throw new BadRequestError(`Invalid gameId: ${gameId}`)

		const playersRes = await db.query(
			`SELECT id, last_name || ', ' || first_name AS name FROM players WHERE team_id = $1 OR team_id = $2`,
			[game.home_team, game.away_team]
		);
		const players = playersRes.rows;

		for (let player of players) {
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
					SET minutes=$1, points=$2, fgm=$3, fga=$4, fgp=$5, ftm=$6, fta=$7, ftp=$8, tpm=$9, tpa=$10, tpp=$11, off_reb=$12, def_reb=$13, assists=$14, fouls=$15, steals=$16, turnovers=$17, blocks=$18, plus_minus=$19, total_reb = $20
					WHERE player_id = $21
					AND game_id = $22`,
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
						ps.offReb + ps.defReb || 0,
						player.id,
						game.id,
					]
				);
				console.log(`Updated stats for ${player.name} from Game: ${ps.game.id}`);
			} else if (ps) {
				db.query(
					'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, total_reb, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $22)',
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
						ps.defReb + ps.offReb || 0,
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
								SET minutes=$1, points=$2, fgm=$3, fga=$4, fgp=$5, ftm=$6, fta=$7, ftp=$8, tpm=$9, tpa=$10, tpp=$11, off_reb=$12, def_reb=$13, assists=$14, fouls=$15, steals=$16, turnovers=$17, blocks=$18, plus_minus=$19, total_reb=$20
								WHERE player_id = $21
								AND game_id = $22`,
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
									ps.defReb + ps.offReb || 0,
									player.id,
									ps.game.id,
								]
							);
							console.log(
								`Updated stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
							);
						} else {
							db.query(
								'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, total_reb, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)',
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
									ps.offReb + ps.defReb || 0,
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
			const today = moment().format('YYYYMMDD');
			const gamesRes = await db.query(
				`SELECT id, home_team, away_team FROM games WHERE DATE(date) = $1 OR status = $2`,
				[today, 'in play']
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
								SET minutes=$1, points=$2, fgm=$3, fga=$4, fgp=$5, ftm=$6, fta=$7, ftp=$8, tpm=$9, tpa=$10, tpp=$11, off_reb=$12, def_reb=$13, assists=$14, fouls=$15, steals=$16, turnovers=$17, blocks=$18, plus_minus=$19, total_reb=$20
								WHERE player_id = $21
								AND game_id = $22`,
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
								ps.defReb + ps.offReb || 0,
								player.id,
								game.id,
							]
						);
						console.log(
							`Updated stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
						);
					} else if (ps) {
						db.query(
							'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, total_reb, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)',
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
								ps.defReb + ps.offReb || 0,
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
		console.log(`All player stats added / updated @ ${moment().format('LLL')}!`);
		return;
	}

	/** Returns players sorted by desired stat
	 *
	 *  Method to sort by includes: points, fgm, fga, fgp, ftm, fta, ftp,
	 *  tpm, tpa, tpp, totalReb, offReb, defReb, assists, fouls, steals,
	 * 	turnovers, blocks, plusMinus
	 *
	 * 	TeamId is optional
	 *
	 *  Date may be date string "DD-MM-YYYY", "today", "yesterday", "season",
	 * "all games"
	 *
	 * 	Order may be DESC or ASC (case insensitive)
	 *
	 * 	Returns [ {totals, perGame, per36}, ... ]
	 *
	 * 	Where seasonStats is { id, name, points, fgm, fga, fgp, ftm, fta,
	 * 						   ftp, tpm, tpa, tpp, offReb, defReb, assists,
	 * 						   fouls, steals, turnovers, blocks, plusMinus }
	 *
	 *  Throws BadRequestError if method or order are invalid.
	 **/

	static async sortByStats(teamId, gameId, playerId, date = 'season', method = 'minutes', order = 'DESC') {
		const lowDate = date.toLowerCase();
		const lowOrder = order.toLowerCase();
		const lowMethod = method.toLowerCase();
		const validMethods = [
			'gp',
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

		let statsExist = true;

		let playersRes;
		if (lowDate === 'season') {
			if (teamId) {
				const team = await Team.checkValid(teamId);
				playersRes = await db.query(
					`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, s.gp, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
					FROM season_stats s
					JOIN players p ON s.player_id = p.id
					JOIN TEAMS t ON p.team_id = t.id
					WHERE p.team_id = $1
					ORDER BY ${lowMethod} ${lowOrder}`,
					[team.id]
				);
			} else {
				if (lowMethod === 'fgp' || lowMethod === 'ftp' || lowMethod === 'tpp') {
					playersRes = await db.query(
						`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, s.gp, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
					FROM season_stats s
					JOIN players p ON s.player_id = p.id
					JOIN TEAMS t ON p.team_id = t.id
					WHERE ${lowMethod.slice(0, 2) + 'a'} >= 25
					ORDER BY ${lowMethod} ${lowOrder}`
					);
				} else {
					playersRes = await db.query(
						`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, s.gp, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
				FROM season_stats s
				JOIN players p ON s.player_id = p.id
				JOIN TEAMS t ON p.team_id = t.id
				ORDER BY ${lowMethod} ${lowOrder}`
					);
				}
			}
		} else if (moment(lowDate) >= moment().subtract(1, 'days') || lowDate === 'today' || lowDate === 'yesterday') {
			let d = moment();
			let day;
			if (lowDate === 'today' || moment(lowDate) >= moment().subtract(1, 'days')) {
				day = lowDate === 'today' ? d.format('l').replaceAll('/', '-') : lowDate;
				const stats = await db.query(
					`SELECT gs.id 
				FROM game_stats gs
				JOIN games g ON gs.game_id = g.id 
				WHERE DATE(g.date) = $1`,
					[day]
				);
				if (stats.rows.length) {
					playersRes = await db.query(
						`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
						FROM game_stats gs
						JOIN players p ON gs.player_id = p.id
						JOIN games ga ON gs.game_id = ga.id
						JOIN TEAMS t ON p.team_id = t.id
						WHERE DATE(ga.date) = $1
						ORDER BY ${lowMethod} ${lowOrder}
						LIMIT 10`,
						[day]
					);
				} else {
					statsExist = false;
					const teamsToPlay = await db.query(
						`
					SELECT t1.id AS t1, t2.id AS t2
					FROM games g
					JOIN teams t1 ON g.home_team = t1.id
					JOIN teams t2 ON g.away_team = t2.id
					WHERE DATE (g.date)=$1`,
						[day]
					);

					let teams = [];
					teamsToPlay.rows.forEach((t) => {
						teams.push(t.t1);
						teams.push(t.t2);
					});

					const relevantPlayers = await db.query(
						`
					SELECT p.id
					FROM players p
					JOIN teams t ON p.team_id = t.id
					WHERE t.id = ANY($1)`,
						[teams]
					);
					let players = [];
					relevantPlayers.rows.forEach((p) => players.push(p.id));

					if (lowMethod === 'fgp' || lowMethod === 'ftp' || lowMethod === 'tpp') {
						playersRes = await db.query(
							`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, s.gp, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
						FROM season_stats s
						JOIN players p ON s.player_id = p.id
						JOIN TEAMS t ON p.team_id = t.id
						WHERE p.id = ANY($1)
						AND ${lowMethod.slice(0, 2) + 'a'} >= 25
						ORDER BY ${lowMethod} ${lowOrder}
						LIMIT 10`,
							[players]
						);
					} else {
						playersRes = await db.query(
							`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, s.gp, s.minutes, s.points, s.fgm, s.fga, s.fgp, s.ftm, s.fta, s.ftp, s.tpm, s.tpa, s.tpp, s.off_reb AS "offReb", s.def_reb AS "defReb", s.total_reb AS "totalReb", s.assists, s.fouls, s.steals, s.turnovers, s.blocks, s.plus_minus AS "plusMinus"
						FROM season_stats s
						JOIN players p ON s.player_id = p.id
						JOIN TEAMS t ON p.team_id = t.id
						WHERE p.id = ANY($1)
						ORDER BY ${lowMethod} ${lowOrder}
						LIMIT 10`,
							[players]
						);
					}
				}
			} else {
				let yesterday = d.subtract(1, 'days');
				day = yesterday.format('l').replaceAll('/', '-');
				playersRes = await db.query(
					`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
					FROM game_stats gs
					JOIN players p ON gs.player_id = p.id
					JOIN games ga ON gs.game_id = ga.id
					JOIN TEAMS t ON p.team_id = t.id
					WHERE DATE(ga.date) = $1
					ORDER BY ${lowMethod} ${lowOrder}
					LIMIT 10`,
					[day]
				);
			}
		} else if (lowDate === 'all games') {
			if (playerId) {
				playersRes = await db.query(
					`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, ga.id AS "gameId", gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
					FROM game_stats gs
					JOIN players p ON gs.player_id = p.id
					JOIN games ga ON gs.game_id = ga.id
					JOIN TEAMS t ON p.team_id = t.id
					WHERE p.id = $1
					ORDER BY ${lowMethod} ${lowOrder}`,
					[playerId]
				);
			} else if (teamId) {
				if (gameId) {
					playersRes = await db.query(
						`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, ga.id AS "gameId", gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
						FROM game_stats gs
						JOIN players p ON gs.player_id = p.id
						JOIN games ga ON gs.game_id = ga.id
						JOIN TEAMS t ON p.team_id = t.id
						WHERE t.id = $1
						AND ga.id = $2
						ORDER BY ${lowMethod} ${lowOrder}`,
						[teamId, gameId]
					);
				} else {
					playersRes = await db.query(
						`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, ga.id AS "gameId", gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
						FROM game_stats gs
						JOIN players p ON gs.player_id = p.id
						JOIN games ga ON gs.game_id = ga.id
						JOIN TEAMS t ON p.team_id = t.id
						WHERE t.id = $1
						ORDER BY ${lowMethod} ${lowOrder}`,
						[teamId]
					);
				}
			} else if (gameId) {
				playersRes = await db.query(
					`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, ga.id AS "gameId", gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
					FROM game_stats gs
					JOIN players p ON gs.player_id = p.id
					JOIN games ga ON gs.game_id = ga.id
					JOIN TEAMS t ON p.team_id = t.id
					WHERE ga.id = $1
					ORDER BY ${lowMethod} ${lowOrder}`,
					[gameId]
				);
			} else {
				playersRes = await db.query(
					`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, ga.id AS "gameId", gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
					FROM game_stats gs
					JOIN players p ON gs.player_id = p.id
					JOIN games ga ON gs.game_id = ga.id
					JOIN TEAMS t ON p.team_id = t.id
					ORDER BY ${lowMethod} ${lowOrder}`
				);
			}
		} else {
			playersRes = await db.query(
				`SELECT p.id, p.last_name || ', ' || p.first_name AS name, t.code, gs.minutes, gs.points, gs.fgm, gs.fga, gs.fgp, gs.ftm, gs.fta, gs.ftp, gs.tpm, gs.tpa, gs.tpp, gs.total_reb AS "totalReb", gs.off_reb AS "offReb", gs.def_reb AS "defReb", gs.assists, gs.fouls, gs.steals, gs.turnovers, gs.blocks, gs.plus_minus AS "plusMinus"
				FROM game_stats gs
				JOIN players p ON gs.player_id = p.id
				JOIN games ga ON gs.game_id = ga.id
				JOIN TEAMS t ON p.team_id = t.id
				WHERE DATE(ga.date) = $1
				ORDER BY ${lowMethod} ${lowOrder}
				LIMIT 10`,
				[lowDate]
			);
		}

		const players = playersRes.rows;

		if (!players) throw new BadRequestError('Error retrieving player stats, please try again!');

		let results = players;

		if (lowDate === 'season' || !statsExist) {
			results = { totals: [], perGame: [], per36: [] };
			for (let p of players) {
				const perGame = {
					name: p.name,
					code: p.code,
					assists: p.assists / p.gp || 0,
					blocks: p.blocks / p.gp || 0,
					defReb: p.defReb / p.gp || 0,
					fga: p.fga / p.gp || 0,
					fgm: p.fgm / p.gp || 0,
					fgp: p.fgp || 0,
					fouls: p.fouls / p.gp || 0,
					fta: p.fta / p.gp || 0,
					ftm: p.ftm / p.gp || 0,
					ftp: p.ftp || 0,
					gp: p.gp || 0,
					id: p.id || 0,
					minutes: p.minutes / p.gp || 0,
					offReb: p.offReb / p.gp || 0,
					plusMinus: p.plusMinus / p.gp || 0,
					points: p.points / p.gp || 0,
					steals: p.steals / p.gp || 0,
					totalReb: p.totalReb / p.gp || 0,
					tpa: p.tpa / p.gp || 0,
					tpm: p.tpm / p.gp || 0,
					tpp: p.tpp || 0,
					turnovers: p.turnovers / p.gp || 0,
				};

				const per36 = {
					name: p.name,
					code: p.code,
					assists: (p.assists / p.minutes) * 36 || 0,
					blocks: (p.blocks / p.minutes) * 36 || 0,
					defReb: (p.defReb / p.minutes) * 36 || 0,
					fga: (p.fga / p.minutes) * 36 || 0,
					fgm: (p.fgm / p.minutes) * 36 || 0,
					fgp: p.fgp || 0,
					fouls: (p.fouls / p.minutes) * 36 || 0,
					fta: (p.fta / p.minutes) * 36 || 0,
					ftm: (p.ftm / p.minutes) * 36 || 0,
					ftp: p.ftp || 0,
					gp: p.gp,
					id: p.id,
					minutes: (p.minutes / p.minutes) * 36 || 0,
					offReb: (p.offReb / p.minutes) * 36 || 0,
					plusMinus: (p.plusMinus / p.minutes) * 36 || 0,
					points: (p.points / p.minutes) * 36 || 0,
					steals: (p.steals / p.minutes) * 36 || 0,
					totalReb: (p.totalReb / p.minutes) * 36 || 0,
					tpa: (p.tpa / p.minutes) * 36 || 0,
					tpm: Math.round((p.tpm / p.minutes) * 36) || 0,
					tpp: p.tpp || 0,
					turnovers: (p.turnovers / p.minutes) * 36 || 0,
				};

				results.perGame.push(perGame);
				results.per36.push(per36);
			}
			results.totals = players;
		}

		return results;
	}

	/** Return potential player picks given an array of games happening today
	 *
	 * 	Returns [ { player }, ... ]
	 * 		Where player is { id, name, gameId, home, away, date, points,
	 * 						  assists, rebounds, tpm,
	 * 						  blocks, steals }
	 *
	 * 	Throws BadRequestError if games array not included
	 **/

	static async playerPickData(games) {
		if (!games || typeof games !== 'object')
			throw new BadRequestError('Must include an array of games to get player pick data!');
		let playerStats = {};
		for (let game of games) {
			const playerStatsRes = await db.query(
				`
		SELECT p.id, p.last_name || ', ' || p.first_name AS name, g.id AS "gameId", g.home_team AS home, g.away_team AS away, g.date, ss.gp, ss.points, ss.assists, ss.total_reb AS rebounds, ss.tpm, ss.blocks, ss.steals 
		FROM season_stats ss
		JOIN players p ON ss.player_id = p.id
		JOIN teams t ON p.team_id = t.id
		JOIN games g ON t.id = g.home_team OR t.id = g.away_team 
		WHERE g.id = $1
		AND g.status = 'scheduled'`,
				[game.id]
			);
			for (let p of playerStatsRes.rows) {
				const perGame = {
					name: p.name,
					gameId: p.gameId,
					home: p.home,
					away: p.away,
					date: p.date,
					points: Math.floor(p.points / p.gp) + 0.5 || 0,
					assists: Math.floor(p.assists / p.gp) + 0.5 || 0,
					rebounds: Math.floor(p.rebounds / p.gp) + 0.5 || 0,
					tpm: Math.floor(p.tpm / p.gp) + 0.5 || 0,
					blocks: Math.floor(p.blocks / p.gp) + 0.5 || 0,
					steals: Math.floor(p.steals / p.gp) + 0.5 || 0,
				};
				playerStats[p.id] = perGame;
			}
		}
		return playerStats;
	}

	/** Grabs all open player picks and updates them if game stats exist and 
	 * 	the game is finished 
	 */

	static async updatePicks() {
		const picksRes = await db.query(`SELECT pp.id, pp.username, pp.player_id AS "playerId", pp.stat, pp.over_under AS "overUnder", pp.value, pp.game_id AS "gameId", pp.point_value AS "pointValue" 
		FROM player_picks pp 
		JOIN games g ON pp.game_id = g.id
		WHERE result IS NULL
		AND g.status = 'finished'`)
		const picks = picksRes.rows

		console.log('PICKS:', picks)

		if (!picks.length) return {updatePlayerPicks: 'No eligible player picks to update yet'}

		for (let pick of picks) {
			if (pick.stat === 'rebounds') pick.stat = 'off_reb + def_reb'
			const resultRes = await db.query(`SELECT ${pick.stat} AS "amount" FROM game_stats WHERE player_id=$1 AND game_id=$2`, [pick.playerId, pick.gameId])
			const result = resultRes.rows[0]
			console.log(`RESULT:`, result)

			if (!result) {
				console.log(
					`No game stats exist for gameId: ${pick.gameId} and playerId: ${pick.playerId}`
				);
				continue;
			}
				

			switch(pick.overUnder) {
				case 'OVER':
					if (result.amount > pick.value) {
						await db.query('UPDATE player_picks SET result=true WHERE id = $1', [pick.id])
						await db.query('UPDATE users SET wins = wins + 1, points = points + $1 WHERE username = $2', [
							pick.pointValue,
							pick.username,
						]);
					} else {
						await db.query('UPDATE player_picks SET result=false WHERE id = $1', [pick.id])
						await db.query('UPDATE users SET losses = losses + 1 WHERE username = $1', [pick.username])
					}
					console.log(`Pick ${pick.id} and User ${pick.username} successfully updated!`)
					break;

				case 'UNDER':
					if (result.amount < pick.value) {
						await db.query('UPDATE player_picks SET result=true WHERE id = $1', [pick.id])
						await db.query('UPDATE users SET wins = wins + 1, points = points + $1 WHERE username = $1', [
							pick.pointValue,
							pick.username,
						]);
					} else {
						await db.query('UPDATE player_picks SET result=false WHERE id = $1', [pick.id])
						await db.query('UPDATE users SET losses = losses + 1 WHERE username = $1', [pick.username])
					}
					console.log(`Pick ${pick.id} and User ${pick.username} successfully updated!`)
					break;

				default:
					break;
			}
		}
		console.log(`All eligible player picks update finished @ ${moment().format('LLL')}`)
		return {updatePlayerPicks: "success"}
	}
}

module.exports = Player;
