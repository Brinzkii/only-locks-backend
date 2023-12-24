const db = require('../db');
const bcrypt = require('bcrypt');
const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError');
const Team = require('./team.js');
const Player = require('./player');

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
			`SELECT username, password
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
	 * Returns { username, firstName, lastName, email, isAdmin }
	 *
	 * Throws BadRequestError on duplicates.
	 **/

	static async register({ username, password }) {
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
            (username, password)
            VALUES ($1, $2)
            RETURNING username`,
			[username, hashedPassword]
		);

		const user = result.rows[0];

		return user;
	}

	/** Given a username, return data about user.
	 *
	 * Returns { username, followedTeams, followedPlayers }
	 *   where followedTeams is [ { id, code, nickname, name, city, logo,
	 *                              conference, division } ]
	 *   where followedPlayers is [ { id, firstName, lastName, birthday, height,
	 *                               weight, college, number, position, team } ]
	 *
	 * Throws NotFoundError if user not found.
	 **/

	static async get(username) {
		const userRes = await db.query(
			`SELECT username
            FROM users
            WHERE username = $1`,
			[username]
		);

		const user = userRes.rows[0];

		if (!user) throw new NotFoundError(`No user: ${username}`);

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
	 *  to db and return following list
	 *
	 *  Returns { username, followedTeams, followedPlayers }
	 *   where followedTeams is [team_id, team_id, ...]
	 *   where followedPlayers is [player_id, player_id, ...]
	 *
	 *  Throws NotFoundError if user not found.
	 **/

	static async toggleFollow(username, playerId = null, teamId = null) {
		const userRes = await db.query(
			`SELECT username
            FROM users
            WHERE username = $1`,
			[username]
		);

		const user = userRes.rows[0];

		if (!user) throw new NotFoundError(`No user: ${username}`);

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
			if (!checkFollowedTeams.rows[0]) {
				await db.query(
					`INSERT INTO followed_teams
                    (username, team_id)
                    VALUES ($1, $2)`,
					[username, teamId]
				);
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
				[username, teamId]
			);
			// If no entry found with matching username and player_id, add to db.
			if (!checkFollowedPlayers.rows[0]) {
				await db.query(
					`INSERT INTO followed_players
                    (username, player_id)
                    VALUES ($1, $2)`,
					[username, playerId]
				);
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
}

module.exports = User;