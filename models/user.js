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

	/** Given a username, check if in database and throws NotFoundError if not */

	static async checkValid(username) {
		const userRes = await db.query(
			`SELECT username, wins, losses
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
	 * 	add pick to db and return user picks
	 *
	 * 	Returns { pick }
	 * 		Where pick is { player_id, game_id, stat, over_under, value }
	 *
	 * 	Throws NotFoundError if user, player or game not found
	 * 	Throws BadRequest error is stat category invalid
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
		const user = await this.checkValid(username);
		const player = await Player.checkValid(playerId);
		const game = await Game.checkValid(gameId);

		if (isValid === -1) throw new BadRequestError(`Stat selection is limited to the following: ${validMethods}`);

		if (over_under.toLowerCase() != 'under' && over_under.toLowerCase() != 'over')
			throw new BadRequestError('Over_Under must be either "over" or "under"');

		const pickRes = await db.query(
			`
		INSERT INTO player_picks (username, player_id, game_id, stat, over_under, value) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, player_id, game_id, stat, over_under, value`,
			[username, playerId, gameId, stat, over_under.toUpperCase(), value]
		);

		const pick = pickRes.rows[0];

		return pick;
	}

	/**	Given a username, player_id, stat, over_under and value
	 * 	add pick to db and return user picks
	 *
	 * 	Returns { pick }
	 * 		Where pick is { player_id, game_id, stat, over_under, value }
	 *
	 * 	Throws NotFoundError if user, player or game not found
	 * 	Throws BadRequest error is stat category invalid
	 **/

	static async deletePlayerPick(username, pickId) {
		const user = await this.checkValid(username);
		const pickRes = await db.query(
			`SELECT id, player_id, game_id, stat, over_under, value from player_picks WHERE id = $1`,
			[pickId]
		);

		const pick = pickRes.rows[0];

		if (!pick) throw new NotFoundError(`Pick ${pickId} not found!`);

		await db.query('DELETE FROM player_picks WHERE id = $1', [pickId]);

		return pick;
	}
}

module.exports = User;