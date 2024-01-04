const db = require('../db');
const axios = require('axios');
const { NotFoundError } = require('../expressError');
const API_KEY = require('../secrets');

const BASE_URL = 'https://v2.nba.api-sports.io/';
const headers = {
	'x-rapidapi-key': API_KEY || process.env.API_KEY,
	'x-rapidapi-host': 'v2.nba.api-sports.io',
};

/** Related functions for teams */

class Team {
	/** Given a username, check if in database and throws NotFoundError if not */

	static async checkValid(teamId) {
		const teamRes = await db.query(
			`SELECT id
            FROM teams
            WHERE id = $1`,
			[teamId]
		);

		const team = teamRes.rows[0];

		if (!team) throw new NotFoundError(`No team: ${teamId}`);

		return team;
	}

	/** Given a teamId, return data about that team.
	 *
	 *  Returns { id, code, nickname, name, city, logo, conference, division }
	 *
	 * Throws NotFoundError if not found.
	 **/

	static async get(id) {
		const teamRes = await db.query(
			`SELECT id, code, nickname, name, city, logo, conference, division
            FROM teams
            WHERE id = $1`,
			[id]
		);

		const team = teamRes.rows[0];

		if (!team) throw new NotFoundError(`No team: ${id}`);

		return team;
	}

	/** Return information about all teams
	 *
	 * 	Returns [ { team }, { team } ]
	 **/

	static async getAll() {
		const teamsRes = await db.query(
			`SELECT id, code, nickname, name, city, logo, conference, division
			FROM teams`
		);

		return teamsRes.rows;
	}

	/** Given a teamId, return all players on team
	 *
	 *  Returns [ { id, name, birthday, height,
	 *              weight, college, number, position } ]
	 *
	 *  Throws NotFoundError if not found
	 **/

	static async players(id) {
		const playersRes = await db.query(
			`SELECT id, last_name || ', ' || first_name AS name, birthday, height, weight, college, number, position
            FROM players
            WHERE team_id = $1`,
			[id]
		);

		const players = playersRes.rows;

		if (!players) throw new NotFoundError(`No players found on team: ${id}`);

		return players;
	}

	/** Given a teamId return top performers on team
	 *
	 * 	Returns { teamId, points, rebounds, blocks, assists }
	 *
	 *  Throws NotFoundError if not found.
	 */

	static async topPerformers(id) {
		const team = await this.checkValid(id);
		// Collect top scorer
		const scorerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, ss.points AS value
			FROM season_stats ss
			JOIN players p ON ss.player_id = p.id
			WHERE p.team_id = $1
			ORDER BY points DESC
			LIMIT 1`,
			[team.id]
		);

		// Collect top rebounder
		const rebounderRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, ss.total_reb AS value
			FROM season_stats ss
			JOIN players p ON ss.player_id = p.id
			WHERE p.team_id = $1
			ORDER BY total_reb DESC
			LIMIT 1`,
			[team.id]
		);

		// Collect top assister
		const assisterRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, ss.assists AS value
			FROM season_stats ss
			JOIN players p ON ss.player_id = p.id
			WHERE p.team_id = $1
			ORDER BY assists DESC
			LIMIT 1`,
			[team.id]
		);

		// Collect top blocker
		const blockerRes = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, ss.blocks AS value
			FROM season_stats ss
			JOIN players p ON ss.player_id = p.id
			WHERE p.team_id = $1
			ORDER BY blocks DESC
			LIMIT 1`,
			[team.id]
		);

		const topPerformers = {
			team: team.id,
			points: scorerRes.rows[0],
			totalReb: rebounderRes.rows[0],
			assists: assisterRes.rows[0],
			blocks: blockerRes.rows[0],
		};
		return topPerformers;
	}

	/** Given a team_id, return all games for current season
	 *
	 *  Returns [ { id, date, location, home, away, clock, score } ]
	 *
	 *  Where homeTeam & awayTeam are { id, code, nickname, name, city, logo,
	 *                                 conference, division }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async games(id) {
		const gamesRes = await db.query(
			`SELECT id, date, location, home_team AS home, away_team AS away, clock, score
            FROM games
            WHERE home_team = $1
            OR away_team = $2`,
			[id, id]
		);

		const games = gamesRes.rows;

		if (!games) throw new NotFoundError(`No games found for team: ${id}`);

		// get full home and away team data for each game
		for (let game of games) {
			const homeTeam = await this.get(game.home);
			const awayTeam = await this.get(game.away);
			delete game.home;
			delete game.away;
			game.home = homeTeam;
			game.away = awayTeam;
		}

		return games;
	}

	/** Given a team_id, return team stats for current season
	 *
	 *  Returns { id, name, games, fastBreakPoints, pointsInPaint,
	 *            secondChancePoints, pointsOffTurnovers, points, fgm, fga,
	 *            fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, totalReb,
	 * 			  assists, fouls, steals, turnovers, blocks, plusMinus }
	 *
	 * Throws NotFoundError if not found
	 **/

	static async stats(id) {
		const teamData = await this.get(id);
		const statsRes = await db.query(
			`SELECT t.id, t.name, ts.games, ts.fast_break_points AS "fastBreakPoints", ts.points_in_paint AS "pointsInPaint", ts.second_chance_points AS "secondChancePoints", ts.points_off_turnovers AS "pointsOffTurnovers", ts.points, ts.fgm, ts.fga, ts.fgp, ts.ftm, ts.fta, ts.ftp, ts.tpm, ts.tpa, ts.tpp, ts.off_reb AS "offReb", ts.def_reb AS "defReb", ts.total_reb AS "totalReb", ts.assists, ts.fouls, ts.steals, ts.turnovers, ts.blocks, ts.plus_minus AS "plusMinus"
            FROM team_stats ts
			JOIN teams t ON ts.team_id = t.id
            WHERE team_id = $1`,
			[id]
		);

		const teamStats = statsRes.rows[0];

		return teamStats;
	}

	/**	Get stats for all teams
	 *
	 * 	Returns [ {teamStats}, ... ]
	 *
	 * 	Where teamStats is { id, name, games, fastBreakPoints, pointsInPaint,
	 *              		secondChancePoints, pointsOffTurnovers, points,
	 * 						fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp,
	 * 						offReb, defReb, totalReb, assists, fouls, steals,
	 * 						turnovers, blocks, plusMinus }
	 */

	static async allStats() {
		const statsRes = await db.query(
			`SELECT t.id, t.name, ts.games, ts.fast_break_points AS "fastBreakPoints", ts.points_in_paint AS "pointsInPaint", ts.second_chance_points AS "secondChancePoints", ts.points_off_turnovers AS "pointsOffTurnovers", ts.points, ts.fgm, ts.fga, ts.fgp, ts.ftm, ts.fta, ts.ftp, ts.tpm, ts.tpa, ts.tpp, ts.off_reb AS "offReb", ts.def_reb AS "defReb", ts.total_reb AS "totalReb", ts.assists, ts.fouls, ts.steals, ts.turnovers, ts.blocks, ts.plus_minus AS "plusMinus"
			FROM team_stats ts
			JOIN teams t ON ts.team_id = t.id`
		);

		const teamStats = statsRes.rows;

		return teamStats;
	}

	/** Returns teams sorted by desired stat
	 *
	 *  Method to sort by includes: fast_break_points, points_in_paint,
	 * 	second_chance_points, points_off_turnovers, points, fgm, fga, fgp, ftm,
	 * 	fta, ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls, steals,
	 * 	turnovers, blocks, plusMinus
	 *
	 * 	Order may be DESC or ASC (case insensitive)
	 *
	 * 	Returns [ {teamStats}, ... ]
	 *
	 * 	Where teamStats is { id, name, games, fastBreakPoints, pointsInPaint,
	 *              		secondChancePoints, pointsOffTurnovers, points,
	 * 						fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp,
	 * 						offReb, defReb, totalReb, assists, fouls, steals,
	 * 						turnovers, blocks, plusMinus }
	 *
	 *  Throws BadRequestError if method or order are invalid.
	 **/

	static async sortByStats(method, order) {
		const lowMethod = method.toLowerCase();
		const lowOrder = order.toLowerCase();
		const validMethods = [
			'games',
			'fast_break_points',
			'points_in_paint',
			'second_chance_points',
			'points_off_turnovers',
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

		const teamsRes = await db.query(
			`SELECT t.id, t.name, ts.games, ts.fast_break_points AS "fastBreakPoints", ts.points_in_paint AS "pointsInPaint", ts.second_chance_points AS "secondChancePoints", ts.points_off_turnovers AS "pointsOffTurnovers", ts.points, ts.fgm, ts.fga, ts.fgp, ts.ftm, ts.fta, ts.ftp, ts.tpm, ts.tpa, ts.tpp, ts.off_reb AS "offReb", ts.def_reb AS "defReb", ts.total_reb AS "totalReb", ts.assists, ts.fouls, ts.steals, ts.turnovers, ts.blocks, ts.plus_minus AS "plusMinus"
			FROM team_stats ts
			JOIN teams t ON ts.team_id = t.id
			ORDER BY ${lowMethod} ${lowOrder}`
		);

		const teamStats = teamsRes.rows;

		return teamStats;
	}

	/** Retrieve team stats from external API and update DB */

	static async updateStats() {
		const response = await db.query('SELECT id, name FROM teams');
		let teams = response.rows;
		for (let team of teams) {
			let URL = BASE_URL + `teams/statistics?id=${team.id}&season=2023`;
			const response = await axios.get(URL, { headers });
			let teamStats = response.data.response;
			for (let ts of teamStats) {
				db.query(
					`UPDATE team_stats 
					SET games = $1, fast_break_points = $2, points_in_paint = $3, second_chance_points = $4, points_off_turnovers = $5, points = $6, fgm = $7, fga = $8, fgp = $9, ftm = $10, fta = $11, ftp = $12, tpm = $13, tpa = $14, tpp = $15, off_reb = $16, def_reb = $17, total_reb = $18, assists = $19, fouls = $20, steals = $21, turnovers = $22, blocks = $23, plus_minus = $24
					WHERE team_id = $25`,
					[
						ts.games,
						ts.fastBreakPoints,
						ts.pointsInPaint,
						ts.secondChancePoints,
						ts.pointsOffTurnovers,
						ts.points,
						ts.fgm,
						ts.fga,
						+ts.fgp,
						ts.ftm,
						ts.fta,
						+ts.ftp,
						ts.tpm,
						ts.tpa,
						+ts.tpp,
						ts.offReb,
						ts.defReb,
						ts.defReb + ts.offReb,
						ts.assists,
						ts.pFouls,
						ts.steals,
						ts.turnovers,
						ts.blocks,
						ts.plusMinus,
						team.id,
					]
				);
				console.log(`Updated stats for ${team.name}`);
			}
		}
		return true;
	}
}
module.exports = Team;
