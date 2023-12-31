const db = require('../db');
const axios = require('axios');
const { NotFoundError } = require('../expressError');

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

	/** Given a team_id, return data about that team.
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

	/** Given a team_id, return all players on team
	 *
	 *  Returns [ { id, firstName, lastName, birthday, height,
	 *              weight, college, number, position } ]
	 *
	 *  Throws NotFoundError if not found
	 **/

	static async players(id) {
		const playersRes = await db.query(
			`SELECT id, first_name AS firstName, last_name AS lastName, birthday, height, weight, college, number, position
            FROM players
            WHERE team_id = $1`,
			[id]
		);

		const players = playersRes.rows;

		if (!players) throw new NotFoundError(`No players found on team: ${id}`);

		return players;
	}

	/** Given a team_id, return all games for current season
	 *
	 *  Returns [ { id, date, location, homeTeam, awayTeam, clock, score } ]
	 *
	 *  Where homeTeam & awayTeam are { id, code, nickname, name, city, logo,
	 *                                 conference, division }
	 *
	 *  Throws NotFoundError if not found.
	 **/

	static async games(id) {
		const gamesRes = await db.query(
			`SELECT id, date, location, home_team AS homeTeam, away_team AS awayTeam, clock, score
            FROM games
            WHERE home_team = $1
            OR away_team = $2`,
			[id, id]
		);

		const games = gamesRes.rows;

		if (!games) throw new NotFoundError(`No games found for team: ${id}`);

		// get full home and away team data for each game
		for (let game of games) {
			const homeTeam = await this.get(game.hometeam);
			const awayTeam = await this.get(game.awayteam);
			delete game.hometeam;
			delete game.awayteam;
			game.homeTeam = homeTeam;
			game.awayTeam = awayTeam;
		}

		return games;
	}

	/** Given a team_id, return team stats for current season
	 *
	 *  Returns { team, games, fastBreakPoints, pointsInPaint,
	 *            secondChancePoints, pointsOffTurnovers, points, fgm, fga,
	 *            fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, assists,
	 *            fouls, steals, turnovers, blocks, plusMinus }
	 *
	 * Throws NotFoundError if not found
	 **/

	static async stats(id) {
		const teamData = await this.get(id);
		const statsRes = await db.query(
			`SELECT games, fast_break_points AS fastBreakPoints, points_in_paint AS pointsInPaint, second_chance_points AS secondChancePoints, points_off_turnovers AS pointsOffTurnovers, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb AS offReb, def_reb AS defReb, assists, fouls, steals, turnovers, blocks, plus_minus AS plusMinus
            FROM team_stats
            WHERE team_id = $1`,
			[id]
		);

		const teamStats = statsRes.rows[0];
		// add team id and name to stats response
		teamStats.team = {
			id: teamData.id,
			name: teamData.name,
		};

		return teamStats;
	}
}
module.exports = Team;
