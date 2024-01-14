const db = require('../db');
const bcrypt = require('bcrypt');
const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError');
const Team = require('./team');
const Player = require('./player');
const Game = require('./game');

const { BCRYPT_WORK_FACTOR } = require('../config.js');
const e = require('cors');

/** Related functions for users. */

class User {
	/** Create a user (from data), update db, return new user data.
	 *
	 *  Returns { username }
	 *
	 *  Throws UnauthorizedError if user not found or wrong password
	 **/

	static async authenticate(username, password) {
		// try to find the user first
		const result = await db.query(
			`SELECT username, password, is_admin AS "isAdmin"
               FROM users
               WHERE username = $1`,
			[username]
		);

		const user = result.rows[0];

		if (user) {
			// compare hashed password to a new hash from password
			const isValid = await bcrypt.compare(password, user.password);
			if (isValid === true) {
				delete user.password;
				return user;
			}
		}

		throw new UnauthorizedError('Invalid username/password');
	}

	/** Register user with data.
	 *
	 * Returns { username, isAdmin }
	 *
	 * Throws BadRequestError on duplicates.
	 **/

	static async register({ username, password, isAdmin }) {
		const duplicateCheck = await db.query(
			`SELECT username
            FROM users
            WHERE username = $1`,
			[username]
		);

		if (duplicateCheck.rows[0]) {
			throw new BadRequestError(`Duplicate username: ${username}`);
		}

		const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

		const result = await db.query(
			`INSERT INTO users
            (username, password, is_admin)
            VALUES ($1, $2, $3)
            RETURNING username, is_admin AS "isAdmin"`,
			[username, hashedPassword, isAdmin]
		);

		const user = result.rows[0];

		return user;
	}

	/** Given a username, check if in database and throws NotFoundError if not */

	static async checkValid(username) {
		const userRes = await db.query(
			`SELECT username, wins, losses, is_admin AS "isAdmin"
            FROM users
            WHERE username = $1`,
			[username]
		);

		const user = userRes.rows[0];

		if (!user) throw new NotFoundError(`No user: ${username}`);

		return user;
	}

	/** Given a username, return data about user.
	 *
	 *  Returns { username, wins, losses, followedTeams, followedPlayers,
	 * 		      picks }
	 *   where followedTeams is [ { id, code, nickname, name, city, logo,
	 *                              wins, losses, conference, division } ]
	 *   where followedPlayers is [ { id, name, birthday, height,
	 *                               weight, college, number, position, team } ]
	 * 	 Where picks is { playerPicks, teamPicks }
	 *
	 * Throws NotFoundError if user not found.
	 **/

	static async get(username) {
		const user = await this.checkValid(username);

		const userFavTeams = await db.query(
			`SELECT t.id, t.code, t.nickname, t.name, t.city, t.logo, t.conference, t.division, ts.wins, ts.losses 
            FROM followed_teams ft
			JOIN teams t ON ft.team_id = t.id
			JOIN team_stats ts ON ft.team_id = ts.id
            WHERE username = $1`,
			[username]
		);

		user.followedTeams = userFavTeams.rows;

		const userFavPlayers = await db.query(
			`SELECT p.id, p.last_name || ', ' || p.first_name AS name, p.birthday, p.height, p.weight, p.college, p.number, p.position, t.name AS "teamName", t.code AS "teamCode", ss.points / ss.gp AS points, ss.tpm / ss.gp AS tpm, ss.assists / ss.gp AS assists, ss.total_reb / ss.gp AS rebounds, ss.steals / ss.gp AS steals, ss.blocks / ss.gp AS blocks 
            FROM followed_players fp
			JOIN players p ON fp.player_id = p.id
			JOIN season_stats ss ON fp.player_id = ss.player_id
			JOIN teams t ON p.team_id = t.id
            WHERE username = $1`,
			[username]
		);

		user.followedPlayers = userFavPlayers.rows;

		let picks = await this.picks(username);
		user.picks = picks;

		return user;
	}

	/** Given a username and player_id / team_id add
	 *  to db and return updated user
	 *
	 *  Returns { username, wins, losses, followedTeams, followedPlayers }
	 *   where followedTeams is [team_id, team_id, ...]
	 *   where followedPlayers is [player_id, player_id, ...]
	 *
	 *  Throws NotFoundError if user not found.
	 * 	Throws BadRequestError if team or player is already followed.
	 **/

	static async follow(username, playerId = null, teamId = null) {
		const user = await this.checkValid(username);

		// If no player_id passed, work with team_id
		if (!playerId) {
			const checkFollowedTeams = await db.query(
				`SELECT team_id 
                FROM followed_teams
                WHERE username = $1
                AND team_id = $2`,
				[username, teamId]
			);
			// If no entry found with matching username and team_id, add to db.
			if (!checkFollowedTeams.rows.length) {
				await db.query(
					`INSERT INTO followed_teams
                    (username, team_id)
                    VALUES ($1, $2)`,
					[username, teamId]
				);
				// Otherwise throw BadRequestError
			} else {
				throw new BadRequestError(`${username} is already following team ${teamId}`);
			}
			// work with playerId if one was passed
		} else {
			const checkFollowedPlayers = await db.query(
				`SELECT player_id 
                FROM followed_players
                WHERE username = $1
                AND player_id = $2`,
				[username, playerId]
			);
			// If no entry found with matching username and player_id, add to db.
			if (!checkFollowedPlayers.rows.length) {
				await db.query(
					`INSERT INTO followed_players
                    (username, player_id)
                    VALUES ($1, $2)`,
					[username, playerId]
				);
				// Otherwise throw BadRequestError
			} else {
				throw new BadRequestError(`${username} is already following player ${playerId}`);
			}
		}
		const updatedUser = await this.get(username);
		return updatedUser;
	}

	/** Given a username and player_id / team_id remove
	 *  from db and return updated user
	 *
	 *  Returns { username, wins, losses, followedTeams, followedPlayers }
	 *   where followedTeams is [team_id, team_id, ...]
	 *   where followedPlayers is [player_id, player_id, ...]
	 *
	 *  Throws NotFoundError if user not found.
	 * 	Throws BadRequestError if team or player is already followed.
	 **/

	static async unfollow(username, playerId = null, teamId = null) {
		const user = await this.checkValid(username);

		// If no player_id passed, work with team_id
		if (!playerId) {
			const checkFollowedTeams = await db.query(
				`SELECT team_id 
                FROM followed_teams
                WHERE username = $1
                AND team_id = $2`,
				[username, teamId]
			);
			// If no entry found with matching username and team_id throw BadRequestError
			if (!checkFollowedTeams.rows.length) {
				throw new BadRequestError(`${username} is not following team ${teamId}`);
				// Otherwise remove entry from followed_teams table
			} else {
				await db.query(
					`DELETE FROM followed_teams
                    WHERE username = $1
                    AND team_id = $2`,
					[username, teamId]
				);
			}
			// work with playerId if one was passed
		} else {
			const checkFollowedPlayers = await db.query(
				`SELECT player_id 
                FROM followed_players
                WHERE username = $1
                AND player_id = $2`,
				[username, playerId]
			);
			// If no entry found with matching username and player_id throw BadRequestError
			console.log(checkFollowedPlayers.rows);
			if (!checkFollowedPlayers.rows.length) {
				throw new BadRequestError(`${username} is not following player ${playerId}`);
				// Otherwise remove entry from followed_players table
			} else {
				await db.query(
					`DELETE FROM followed_players
                    WHERE username = $1
                    AND player_id = $2`,
					[username, playerId]
				);
			}
		}
		const updatedUser = await this.get(username);
		return updatedUser;
	}

	/**	Given a username, player_id, stat, over_under and value
	 * 	add pick to db
	 *
	 * 	Returns { pick }
	 * 		Where pick is { id, playerId, gameId, stat, overUnder, value }
	 *
	 * 	Throws NotFoundError if user, player or game not found
	 * 	Throws BadRequestError if stat category invalid
	 * 	Throws BadRequestError if game has already started
	 * 	Throws BadRequestError if point_value not included
	 * 	Throws BadRequestError if player has already made a pick for the same
	 * 	player, game and stat
	 **/

	static async playerPick(username, playerId, gameId, stat, over_under, value, point_value) {
		const validMethods = ['points', 'tpm', 'rebounds', 'assists', 'steals', 'blocks'];
		const isValid = validMethods.indexOf(stat.toLowerCase());
		await this.checkValid(username);
		await Player.checkValid(playerId);
		const game = await Game.checkValid(gameId);

		const checkDuplicate = await db.query(
			`SELECT id FROM player_picks WHERE username = $1 AND player_id = $2 AND game_id = $3 AND stat = $4`,
			[username, playerId, gameId, stat]
		);

		if (checkDuplicate.rows.length) throw new BadRequestError('Only one pick may be placed per player/stat/game!');

		if (!point_value) throw new BadRequestError('Must include point_value for a new pick!');

		if (game.status !== 'scheduled')
			throw new BadRequestError('Cannot place picks on games that have already started!');

		if (isValid === -1) throw new BadRequestError(`Stat selection is limited to the following: ${validMethods}`);

		if (over_under.toLowerCase() != 'under' && over_under.toLowerCase() != 'over')
			throw new BadRequestError('Over_Under must be either "over" or "under"');

		const pickRes = await db.query(
			`
		INSERT INTO player_picks (username, player_id, game_id, stat, over_under, value, point_value) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, player_id AS "playerId", game_id AS "gameId", stat, over_under AS "overUnder", value, point_value AS "pointValue"`,
			[username, playerId, gameId, stat, over_under.toUpperCase(), value, point_value]
		);

		const pick = pickRes.rows[0];

		return pick;
	}

	/**	Given a username and pickId remove pick from DB
	 *
	 * 	Returns { pick }
	 * 		Where pick is { id, playerId, gameId, stat, overUnder, value }
	 *
	 * 	Throws NotFoundError if user or pick not found
	 **/

	static async deletePlayerPick(username, pickId) {
		await this.checkValid(username);
		const pickRes = await db.query(
			`SELECT id, player_id AS "playerId", game_id AS "gameId", stat, over_under AS "overUnder", value from player_picks WHERE id = $1`,
			[pickId]
		);

		const pick = pickRes.rows[0];

		if (!pick) throw new NotFoundError(`Pick ${pickId} not found!`);

		await db.query('DELETE FROM player_picks WHERE id = $1', [pickId]);

		return pick;
	}

	/**	Given a username, team_id, game_id, win_spread and value
	 * 	add pick to db
	 *
	 * 	Returns { pick }
	 * 		Where pick is { id, team_id, game_id, win_spread, value }
	 *
	 * 	Throws NotFoundError if user, team or game not found
	 * 	Throws BadRequest error if team pick already exists for given game
	 **/

	static async teamPick(username, teamId, gameId) {
		await this.checkValid(username);
		await Team.checkValid(teamId);
		await Game.checkValid(gameId);

		const checkDuplicate = await db.query('SELECT id FROM team_picks WHERE username = $1 AND game_id = $2', [
			username,
			gameId,
		]);

		if (checkDuplicate.rows.length) throw new BadRequestError('Can only place one team pick per game!');

		const pickRes = await db.query(
			`
		INSERT INTO team_picks (username, team_id, game_id) VALUES ($1, $2, $3) RETURNING id, team_id, game_id`,
			[username, teamId, gameId]
		);

		const pick = pickRes.rows[0];

		return pick;
	}

	/**	Given a username and pickId remove pick from DB
	 *
	 * 	Returns { pick }
	 * 		Where pick is { id, teamId, gameId, winSpread, value }
	 *
	 * 	Throws NotFoundError if user or pick not found
	 **/

	static async deleteTeamPick(username, pickId) {
		const user = await this.checkValid(username);
		const pickRes = await db.query(
			`SELECT id, team_id AS "teamId", game_id AS "gameId" from team_picks WHERE id = $1`,
			[pickId]
		);

		const pick = pickRes.rows[0];

		if (!pick) throw new NotFoundError(`Pick ${pickId} not found!`);

		await db.query('DELETE FROM team_picks WHERE id = $1', [pickId]);

		return pick;
	}

	/**	Given a username return all of that users picks
	 *
	 * 	Returns { picks }
	 * 		Where picks is { playerPicks, teamPicks }
	 *
	 * 	Throws NotFoundError if user not found
	 **/

	static async picks(username) {
		await this.checkValid(username);
		let picks = { playerPicks: [], teamPicks: [] };
		const playerPicks = await db.query(
			`SELECT pp.id AS "pickId", p.last_name || ', ' || p.first_name AS player, p.id AS "playerId", t1.code || ' vs ' || t2.code AS game, g.date, pp.stat, pp.over_under AS "overUnder", pp.value, pp.result, pp.point_value AS "pointValue", g.id AS "gameId", g.location, g.score, g.clock, g.quarter, g.status
		FROM player_picks pp
		JOIN players p ON pp.player_id = p.id
		JOIN games g ON pp.game_id = g.id
		JOIN teams t1 ON g.home_team = t1.id
		JOIN teams t2 ON g.away_team = t2.id
		WHERE pp.username = $1
		ORDER BY g.date DESC`,
			[username]
		);

		for (let pick of playerPicks.rows) {
			if (pick.status === 'in play' || pick.status === 'finished') {
				const liveStats = await db.query(
					`
				SELECT points, assists, tpm, def_reb + off_reb AS rebounds, steals, blocks
				FROM game_stats
				WHERE game_id = $1 AND player_id = $2`,
					[pick.gameId, pick.playerId]
				);
				if (liveStats.rows.length) {
					pick.points = liveStats.rows[0].points || 0;
					pick.tpm = liveStats.rows[0].tpm || 0;
					pick.rebounds = liveStats.rows[0].rebounds || 0;
					pick.steals = liveStats.rows[0].steals || 0;
					pick.blocks = liveStats.rows[0].blocks || 0;
					pick.assists = liveStats.rows[0].assists || 0;
				}
			}
		}

		picks.playerPicks = playerPicks.rows;

		const playerWins = await db.query(
			`SELECT COUNT(*) AS wins FROM player_picks WHERE username = $1 AND result=true`,
			[username]
		);
		const playerLosses = await db.query(
			`SELECT COUNT(*) AS losses FROM player_picks WHERE username = $1 AND result=false`,
			[username]
		);
		picks.playerPickRecord = `${playerWins.rows[0].wins} - ${playerLosses.rows[0].losses}`;

		const teamPicks = await db.query(
			`SELECT tp.id AS "pickId", t.name as selected, t.code AS "selectedCode", t.id AS "selectedId", t1.code || ' vs ' || t2.code AS game, g.id AS "gameId", g.location, g.date, tp.result, g.score, g.clock, g.quarter, g.winner, g.status
		FROM team_picks tp
		JOIN teams t ON tp.team_id = t.id
		JOIN games g ON tp.game_id = g.id
		JOIN teams t1 ON g.home_team = t1.id
		JOIN teams t2 ON g.away_team = t2.id
		WHERE tp.username = $1
		ORDER BY g.date DESC`,
			[username]
		);

		for (let pick of teamPicks.rows) {
			if (pick.score !== 'TBD') {
				let score = {};
				let points = pick.score.split('-');
				pick.game.split('vs').map((code, idx) => {
					score[code.trim()] = Number(points[idx]);
				});

				let opponentScore;
				let selectedScore;
				if (Object.keys(score)[0] === pick.selectedCode) {
					selectedScore = score[pick.selectedCode];
					opponentScore = score[Object.keys(score)[1]];
				} else {
					selectedScore = score[pick.selectedCode];
					opponentScore = score[Object.keys(score)[0]];
				}

				let leading = false;
				let difference;
				if (selectedScore > opponentScore) {
					leading = true;
					difference = Math.abs(selectedScore - opponentScore);
				} else {
					difference = Math.abs(selectedScore - opponentScore) * -1;
				}
				pick.difference = difference;
				pick.isLeading = leading;
			}
		}

		picks.teamPicks = teamPicks.rows;

		const teamWins = await db.query(`SELECT COUNT(*) AS wins FROM team_picks WHERE username = $1 AND result=true`, [
			username,
		]);
		const teamLosses = await db.query(
			`SELECT COUNT(*) AS losses FROM team_picks WHERE username = $1 AND result=false`,
			[username]
		);
		picks.teamPickRecord = `${teamWins.rows[0].wins} - ${teamLosses.rows[0].losses}`;

		return picks;
	}
}

module.exports = User;