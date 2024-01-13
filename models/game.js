const db = require('../db');
const axios = require('axios');
const { NotFoundError, BadRequestError } = require('../expressError');
const API_KEY = require('../secrets');
const Team = require('./team');
const Moment = require('moment');

const BASE_URL = 'https://v2.nba.api-sports.io/';
const headers = {
	'x-rapidapi-key': API_KEY || process.env.API_KEY,
	'x-rapidapi-host': 'v2.nba.api-sports.io',
};
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/** Related functions for games */

class Game {
	/** Given a game_id, check if in database and throws NotFoundError if not */

	static async checkValid(gameId) {
		const gameRes = await db.query(
			`SELECT id, date, location, home_team, away_team, status
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
	 * 			  awayCode, awayLogo, clock, score, status, winner }
	 *
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const gameRes = await db.query(
			`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score, g.quarter, g.status, g.winner
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
	 * 			  awayCode, awayLogo, clock, score, status, winner }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async getAll() {
		const gamesRes = await db.query(
			`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score, g.quarter, g.status, g.winner
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
	 * 	Returns { gameId, winner, score, home, away }
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
		let result = {};
		const game = await this.get(gameId);
		// Collect home team stats
		const homeStatsRes = await db.query(
			`SELECT t.id, t.name, tgs.fast_break_points AS "fastBreakPoints", tgs.points_in_paint AS "pointsInPaint", tgs.second_chance_points AS "secondChancePoints", tgs.points_off_turnovers AS "pointsOffTurnovers", tgs.points, tgs.fgm, tgs.fga, tgs.fgp, tgs.ftm, tgs.fta, tgs.ftp, tgs.tpm, tgs.tpa, tgs.tpp, tgs.off_reb AS "offReb", tgs.def_reb AS "defReb", tgs.total_reb AS "totalReb", tgs.assists, tgs.fouls, tgs.steals, tgs.turnovers, tgs.blocks, tgs.plus_minus AS "plusMinus"
			FROM team_game_stats tgs
			JOIN teams t ON tgs.team_id = t.id
			WHERE game_id = $1
			AND team_id = $2`,
			[gameId, game.homeId]
		);

		// Collect away team stats
		const awayStatsRes = await db.query(
			`SELECT t.id, t.name, tgs.fast_break_points AS "fastBreakPoints", tgs.points_in_paint AS "pointsInPaint", tgs.second_chance_points AS "secondChancePoints", tgs.points_off_turnovers AS "pointsOffTurnovers", tgs.points, tgs.fgm, tgs.fga, tgs.fgp, tgs.ftm, tgs.fta, tgs.ftp, tgs.tpm, tgs.tpa, tgs.tpp, tgs.off_reb AS "offReb", tgs.def_reb AS "defReb", tgs.total_reb AS "totalReb", tgs.assists, tgs.fouls, tgs.steals, tgs.turnovers, tgs.blocks, tgs.plus_minus AS "plusMinus"
			FROM team_game_stats tgs
			JOIN teams t ON tgs.team_id = t.id
			WHERE game_id = $1
			AND team_id = $2`,
			[gameId, game.awayId]
		);
		if (homeStatsRes.rows.length && awayStatsRes.rows.length) {
			const awayStats = awayStatsRes.rows[0];
			const homeStats = homeStatsRes.rows[0];

			let result = { gameId, winner: game.winner, score: game.score, home: {}, away: {} };
			result.home = homeStats;
			result.away = awayStats;

			return result;
		} else return result;
	}

	/** Returns top performers for each team for a given game
	 *
	 * 	Returns { game, home, away }
	 * 		Where home and away are { points: { id, name, value, fg, ft },
	 * 								  rebounds:{ id, name, value, defReb,
	 * 								  offReb }, assists: { id, name, value,
	 * 								  turnovers, minutes }, blocks: { id, name,
	 * 								  value, fouls, minutes }, steals: { id,
	 * 								  name, value, fouls, minutes }, plusMinus:
	 * 								{ id, name, value, minutes } }
	 *
	 *	Throws NotFoundError if not found.
	 **/

	static async getTopPerformers(gameId) {
		const game = await this.checkValid(gameId);
		// Collect top scorer from each team
		const homeScorerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.points AS value, gs.fgm || '/' || gs.fga AS fg, gs.ftm || '/' || gs.fta AS ft
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY points DESC
			LIMIT 1`,
			[game.id, game.home_team]
		);

		const awayScorerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.points AS value, gs.fgm || '/' || gs.fga AS fg, gs.ftm || '/' || gs.fta AS ft
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY points DESC
			LIMIT 1`,
			[game.id, game.away_team]
		);

		// Collect top rebounder from each team
		const homeRebounderRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.def_reb + gs.off_reb AS value, gs.def_reb AS "defReb", gs.off_reb AS "offReb" 
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY value DESC
			LIMIT 1`,
			[game.id, game.home_team]
		);

		const awayRebounderRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.def_reb + gs.off_reb AS value, gs.def_reb AS "defReb", gs.off_reb AS "offReb"
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY value DESC
			LIMIT 1`,
			[game.id, game.away_team]
		);

		// Collect top assister from each team
		const homeAssisterRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.assists AS value, gs.turnovers, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY assists DESC
			LIMIT 1`,
			[game.id, game.home_team]
		);

		const awayAssisterRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.assists AS value, gs.turnovers, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY assists DESC
			LIMIT 1`,
			[game.id, game.away_team]
		);

		// Collect top blocker from each team
		const homeBlockerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.blocks AS value, gs.fouls, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY blocks DESC
			LIMIT 1`,
			[game.id, game.home_team]
		);

		const awayBlockerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.blocks AS value, gs.fouls, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY blocks DESC
			LIMIT 1`,
			[game.id, game.away_team]
		);

		// Collect top stealer from each team
		const homeStealerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.steals AS value, gs.fouls, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY steals DESC
			LIMIT 1`,
			[game.id, game.home_team]
		);

		const awayStealerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.steals AS value, gs.fouls, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY steals DESC
			LIMIT 1`,
			[game.id, game.away_team]
		);

		// Collect top plus/minus from each team
		const homePositiveRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.plus_minus AS value, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY plus_minus DESC
			LIMIT 1`,
			[game.id, game.home_team]
		);

		const awayPositiveRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, gs.plus_minus AS value, gs.minutes
			FROM game_stats gs
			JOIN players p ON gs.player_id = p.id
			WHERE gs.game_id = $1
			AND p.team_id = $2
			ORDER BY plus_minus DESC
			LIMIT 1`,
			[game.id, game.away_team]
		);

		const topPerformers = {
			game: game.id,
			home: {
				points: homeScorerRes.rows[0],
				totalReb: homeRebounderRes.rows[0],
				assists: homeAssisterRes.rows[0],
				blocks: homeBlockerRes.rows[0],
				steals: homeStealerRes.rows[0],
				plusMinus: homePositiveRes.rows[0],
			},
			away: {
				points: awayScorerRes.rows[0],
				totalReb: awayRebounderRes.rows[0],
				assists: awayAssisterRes.rows[0],
				blocks: awayBlockerRes.rows[0],
				steals: awayStealerRes.rows[0],
				plusMinus: awayPositiveRes.rows[0],
			},
		};
		return topPerformers;
	}

	/** Filter games by teamId or date
	 *
	 * 	Returns [ { game } ]
	 *
	 *  Where game is { id, date, location, homeId, homeName,
	 *            		homeCode, homeLogo, awayId, awayName,
	 * 			  		awayCode, awayLogo, clock,
	 * 					score, status, winner }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async filter(teamId = null, date = null) {
		if (!teamId && !date) throw new BadRequestError('Must filter by a team, player or date!');

		let gamesRes;
		let games;

		if (teamId && date) {
			gamesRes = await db.query(
				`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", ts1.wins || ' - ' || ts1.losses AS "homeRecord", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", ts2.wins || ' - ' || ts2.losses AS "awayRecord", g.clock, g.score, g.quarter, g.status, g.winner
				FROM games g
				JOIN teams t1 ON g.home_team = t1.id
				JOIN teams t2 ON g.away_team = t2.id
				JOIN team_stats ts1 ON t1.id = ts1.team_id
				JOIN team_stats ts2 ON t2.id = ts2.team_id
				WHERE g.home_team = $1
				OR g.away_team = $1
				AND g.date = $2
				ORDER BY g.date ASC`,
				[teamId, date]
			);
		} else if (teamId && !date) {
			gamesRes = await db.query(
				`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", ts1.wins || ' - ' || ts1.losses AS "homeRecord", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", ts2.wins || ' - ' || ts2.losses AS "awayRecord", g.clock, g.score, g.quarter, g.status, g.winner
				FROM games g
				JOIN teams t1 ON g.home_team = t1.id
				JOIN teams t2 ON g.away_team = t2.id
				JOIN team_stats ts1 ON t1.id = ts1.team_id
				JOIN team_stats ts2 ON t2.id = ts2.team_id
				WHERE g.home_team = $1
				OR g.away_team = $1
				ORDER BY g.date ASC`,
				[teamId]
			);
		} else {
			gamesRes = await db.query(
				`SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", ts1.wins || ' - ' || ts1.losses AS "homeRecord", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", ts2.wins || ' - ' || ts2.losses AS "awayRecord", g.clock, g.score, g.quarter, g.status, g.winner
				FROM games g
				JOIN teams t1 ON g.home_team = t1.id
				JOIN teams t2 ON g.away_team = t2.id
				JOIN team_stats ts1 ON t1.id = ts1.team_id
				JOIN team_stats ts2 ON t2.id = ts2.team_id
				WHERE DATE(g.date) = $1
				ORDER BY g.date ASC`,
				[date]
			);
		}

		games = gamesRes.rows;

		if (!games) throw new NotFoundError('No games found with that teamID or date!');

		return games;
	}

	/** Update all games in database */

	static async updateAll() {
		const gamesRes = await db.query('SELECT id FROM games');
		const games = gamesRes.rows;
		for (let game of games) {
			let URL = BASE_URL + `games?id=${game.id}`;
			const response = await axios.get(URL, { headers });
			const updatedGame = response.data.response[0];
			// check if score exists and save in string format along with winning team
			let score = null;
			let winner = null;

			if (updatedGame.status.short === 1) {
				score = 'TBD';
			} else {
				score = `${updatedGame.scores.home.points} - ${updatedGame.scores.visitors.points}`;
			}

			if (updatedGame.status.short === 3) {
				if (updatedGame.scores.home.points > updatedGame.scores.visitors.points) {
					winner = updatedGame.teams.home.id;
				} else {
					winner = updatedGame.teams.visitors.id;
				}
			}

			db.query(
				`UPDATE games 
					SET status=$1, clock=$2, quarter=$3, score=$4, winner=$5, date=$6
					WHERE id=$7`,
				[
					updatedGame.status.long.toLowerCase(),
					updatedGame.status.clock,
					updatedGame.periods.current,
					score,
					winner,
					updatedGame.date.start,
					game.id,
				]
			);
			console.log(`Game(${game.id}) - ${Moment(updatedGame.date.start).format('LLL')} has been updated!`);
			await delay(250);
		}
		console.log('All games have been updated!');
		return;
	}

	/** Update yesterday and today's games */

	static async updateRecent() {
		let currDay = Moment().format('l').replaceAll('/', '-');
		let prevDay = Moment(currDay).subtract(1, 'days').format('l').replaceAll('/', '-');
		const gamesRes = await db.query('SELECT id FROM games WHERE DATE(date) >= $1 AND DATE(date) <= $2', [
			prevDay,
			currDay,
		]);
		const games = gamesRes.rows;
		for (let game of games) {
			let URL = BASE_URL + `games?id=${game.id}`;
			const response = await axios.get(URL, { headers });
			const updatedGame = response.data.response[0];

			// check if score exists and save in string format along with winning team
			let score = null;
			let winner = null;

			if (updatedGame.status.short === 1) {
				score = 'TBD';
			} else {
				score = `${updatedGame.scores.home.points} - ${updatedGame.scores.visitors.points}`;
			}

			if (updatedGame.status.short === 3) {
				if (updatedGame.scores.home.points > updatedGame.scores.visitors.points) {
					winner = updatedGame.teams.home.id;
				} else {
					winner = updatedGame.teams.visitors.id;
				}
			}

			db.query(
				`UPDATE games 
					SET status=$1, clock=$2, quarter=$3, score=$4, winner=$5, date=$6
					WHERE id=$7`,
				[
					updatedGame.status.long.toLowerCase(),
					updatedGame.status.clock,
					updatedGame.periods.current,
					score,
					winner,
					updatedGame.date.start,
					game.id,
				]
			);

			console.log(`Game(${game.id}) - ${Moment(updatedGame.date.start).format('LLL')} has been updated!`);
		}
		console.log('All games have been updated!');
		return;
	}

	/** Get head to head results for two teams
	 *
	 * 	Gets total team stats for both teams from head to head matchups
	 *
	 *  Returns { totals, games, gameStats }
	 *
	 *  Throws NotFoundError if teams not found.
	 *	Throws BadRequestError if same team passed in twice
	 */

	static async h2h(team1, team2) {
		if (team1 === team2) throw new BadRequestError('H2H only works for two different teams!');

		const t1 = await Team.checkValid(team1);
		const t2 = await Team.checkValid(team2);

		const gamesRes = await db.query(
			`
		SELECT g.id, g.date, g.location, t1.id AS "homeId", t1.name AS "homeName", t1.code AS "homeCode", t1.logo AS "homeLogo", t2.id AS "awayId", t2.name AS "awayName", t2.code AS "awayCode", t2.logo AS "awayLogo", g.clock, g.score, g.status, g.winner
		FROM games g
		JOIN teams t1 ON g.home_team = t1.id
		JOIN teams t2 ON g.away_team = t2.id
		WHERE (g.home_team=$1 OR g.away_team=$1)
		AND (g.home_team=$2 OR g.away_team=$2)`,
			[t1.id, t2.id]
		);
		const games = gamesRes.rows;

		if (!games) throw new NotFoundError(`No head to head matchups found for ${t1.name} and ${t2.name}`);
		let response = {
			totals: {
				[t1.code]: {
					points: 0,
					fgm: 0,
					fga: 0,
					fgp: 0,
					ftm: 0,
					fta: 0,
					ftp: 0,
					tpm: 0,
					tpa: 0,
					tpp: 0,
					offReb: 0,
					defReb: 0,
					totalReb: 0,
					assists: 0,
					fouls: 0,
					steals: 0,
					turnovers: 0,
					blocks: 0,
					plusMinus: 0,
					wins: 0,
					losses: 0,
				},
				[t2.code]: {
					points: 0,
					fgm: 0,
					fga: 0,
					fgp: 0,
					ftm: 0,
					fta: 0,
					ftp: 0,
					tpm: 0,
					tpa: 0,
					tpp: 0,
					offReb: 0,
					defReb: 0,
					totalReb: 0,
					assists: 0,
					fouls: 0,
					steals: 0,
					turnovers: 0,
					blocks: 0,
					plusMinus: 0,
					wins: 0,
					losses: 0,
				},
			},
			games,
			gameStats: [],
		};

		console.log(`${t1.code} WINS:`, response.totals[t1.code].wins);
		console.log(`${t2.code} WINS:`, response.totals[t2.code].wins);

		for (let game of games) {
			let stats = await this.getStats(game.id);
			console.log('Stats:', stats);
			if (Object.keys(stats).length > 0) {
				response.gameStats.push(stats);
				if (stats.home.id === t1.id) {
					for (let key of Object.keys(response.totals[t1.code])) {
						if (key !== 'wins' && key !== 'losses') {
							response.totals[t1.code][key] += stats.home[key];
							response.totals[t2.code][key] += stats.away[key];
						}
					}
				} else if (stats.home.id == t2.id) {
					for (let key of Object.keys(response.totals[t1.code])) {
						if (key !== 'wins' && key !== 'losses') {
							response.totals[t1.code][key] += stats.away[key];
							response.totals[t2.code][key] += stats.home[key];
						}
					}
				}

				let t1wins = 0,
					t2wins = 0,
					t1losses = 0,
					t2losses = 0;
				if (stats.winner === t1.id) {
					t1wins++;
					t2losses++;
				} else if (stats.winner === t2.id) {
					t1losses++;
					t2wins++;
				}
				response.totals[t1.code].wins = t1wins;
				response.totals[t1.code].losses = t1losses;
				response.totals[t2.code].wins = t2wins;
				response.totals[t2.code].losses = t2losses;
			}
		}
		return response;
	}
}

module.exports = Game;

