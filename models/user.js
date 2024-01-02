const db = require('../db');
const bcrypt = require('bcrypt');
const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError');
const Team = require('./team');
const Player = require('./player');
const Game = require('./game');

const { BCRYPT_WORK_FACTOR } = require('../config.js');

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
	 *  Returns { username, wins, losses, followedTeams, followedPlayers }
	 *   where followedTeams is [ { id, code, nickname, name, city, logo,
	 *                              conference, division } ]
	 *   where followedPlayers is [ { id, firstName, lastName, birthday, height,
	 *                               weight, college, number, position, team } ]
	 *
	 * Throws NotFoundError if user not found.
	 **/

	static async get(username) {
		const user = await this.checkValid(username);

		const userFavTeamIds = await db.query(
			`SELECT team_id AS id
            FROM followed_teams
            WHERE username = $1`,
			[username]
		);

		let userFavTeams = [];

		for (let team of userFavTeamIds.rows) {
			const teamInfo = await Team.get(team.id);
			userFavTeams.push(teamInfo);
		}

		user.followedTeams = userFavTeams;

		const userFavPlayerIds = await db.query(
			`SELECT player_id AS id
            FROM followed_players
            WHERE username = $1`,
			[username]
		);

		let userFavPlayers = [];

		for (let player of userFavPlayerIds.rows) {
			const playerInfo = await Player.get(player.id);
			userFavPlayers.push(playerInfo);
		}

		user.followedPlayers = userFavPlayers;

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
	 * 	Throws BadRequest error if stat category invalid
	 **/

	static async playerPick(username, playerId, gameId, stat, over_under, value) {
		const validMethods = [
			'points',
			'fgm',
			'fga',
			'ftm',
			'fta',
			'tpm',
			'tpa',
			'rebounds',
			'assists',
			'steals',
			'turnovers',
			'blocks',
		];
		const isValid = validMethods.indexOf(stat.toLowerCase());
		await this.checkValid(username);
		await Player.checkValid(playerId);
		await Game.checkValid(gameId);

		if (isValid === -1) throw new BadRequestError(`Stat selection is limited to the following: ${validMethods}`);

		if (over_under.toLowerCase() != 'under' && over_under.toLowerCase() != 'over')
			throw new BadRequestError('Over_Under must be either "over" or "under"');

		const pickRes = await db.query(
			`
		INSERT INTO player_picks (username, player_id, game_id, stat, over_under, value) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, player_id AS "playerId", game_id AS "gameId", stat, over_under AS "overUnder", value`,
			[username, playerId, gameId, stat, over_under.toUpperCase(), value]
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
	 * 	Throws BadRequest error if win_spread invalid
	 **/

	static async teamPick(username, teamId, gameId, win_spread, value) {
		await this.checkValid(username);
		await Team.checkValid(teamId);
		await Game.checkValid(gameId);
		const winOrSpread = win_spread.toLowerCase();

		if (winOrSpread != 'win' && winOrSpread != 'spread') {
			throw new BadRequestError('Win_spread must be either "win" or "spread"');
		}

		const pickRes = await db.query(
			`
		INSERT INTO team_picks (username, team_id, game_id, win_spread, value) VALUES ($1, $2, $3, $4, $5) RETURNING id, team_id, game_id, win_spread, value`,
			[username, teamId, gameId, win_spread.toUpperCase(), value]
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
			`SELECT id, team_id AS "teamId", game_id AS "gameId", win_spread AS "winSpread", value from team_picks WHERE id = $1`,
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
		const playerPicksRes = await db.query(
			`SELECT pp.id, p.last_name || ', ' || p.first_name AS player, t1.code || ' vs ' || t2.code AS game, g.date, pp.stat, pp.over_under, pp.value, pp.result
		FROM player_picks pp
		JOIN players p ON pp.player_id = p.id
		JOIN games g ON pp.game_id = g.id
		JOIN teams t1 ON g.home_team = t1.id
		JOIN teams t2 ON g.away_team = t2.id
		WHERE pp.username = $1
		ORDER BY g.date DESC`,
			[username]
		);
		picks.playerPicks = playerPicksRes.rows;

		const teamPicksRes = await db.query(
			`SELECT tp.id, t.name, t1.code || ' vs ' || t2.code AS game, g.date, tp.win_spread, tp.value
		FROM team_picks tp
		JOIN teams t ON tp.team_id = t.id
		JOIN games g ON tp.game_id = g.id
		JOIN teams t1 ON g.home_team = t1.id
		JOIN teams t2 ON g.away_team = t2.id
		WHERE tp.username = $1
		ORDER BY g.date DESC`,
			[username]
		);
		picks.teamPicks = teamPicksRes.rows;

		return picks;
	}
}

module.exports = User;