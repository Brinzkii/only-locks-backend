'use strict';

/** Routes for users. */

const jsonschema = require('jsonschema');
const express = require('express');
const { ensureCorrectUser, ensureLoggedIn, ensureAdmin } = require('../middleware/auth');
const userRegisterSchema = require('../schemas/userNew.json');
const { createToken } = require('../helpers/tokens');
const User = require('../models/user');

const router = express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead,
 * this is only for admin users to add new users. The new user being
 * added can be anadmin.
 *
 * This returns the newly created user and an authentication token for
 * them:{user: { username, firstName, lastName, email, isAdmin },
 * token }
 *
 * Authorization required: admin
 **/

router.post('/', ensureAdmin, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, userRegisterSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const user = await User.register(req.body);
		const token = createToken(user);
		return res.status(201).json({ user, token });
	} catch (err) {
		return next(err);
	}
});

/** GET /[username] => { user }
 *
 * Returns { username, wins, losses, followedTeams, followedPlayers }
 *   where followedTeams is [ {team}, {team}, ...]
 *   where followedPlayers is [ {player}, {player}, ...]
 *
 * Authorization required: none
 **/

router.get('/:username', async function (req, res, next) {
	try {
		const user = await User.get(req.params.username);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** POST /[username]/[playerId]  { state } => { application }
 *
 * Follow a player
 *
 * Returns { user }
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/players/:playerId', ensureCorrectUser, async function (req, res, next) {
	try {
		const playerId = +req.params.playerId;
		const user = await User.follow(req.params.username, playerId);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/[playerId]  { state } => { application }
 *
 * Unfollow a player
 *
 * Returns { user }
 *
 * Authorization required: same-user-as-:username
 **/

router.delete('/:username/players/:playerId', ensureCorrectUser, async function (req, res, next) {
	try {
		const playerId = +req.params.playerId;
		const user = await User.unfollow(req.params.username, playerId);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** POST /[username]/teams/[teamId]  { state } => { application }
 *
 * Follow a team
 *
 * Returns { user }
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/teams/:teamId', ensureCorrectUser, async function (req, res, next) {
	try {
		const teamId = +req.params.teamId;
		const playerId = undefined;
		const user = await User.follow(req.params.username, playerId, teamId);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/teams/[teamId]  { state } => { application }
 *
 * Unfollow a team
 *
 * Returns { user }
 *
 * Authorization required: same-user-as-:username
 **/

router.delete('/:username/teams/:teamId', ensureCorrectUser, async function (req, res, next) {
	try {
		const teamId = +req.params.teamId;
		const playerId = undefined;
		const user = await User.unfollow(req.params.username, playerId, teamId);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/**	GET /[username]/picks
 *
 * 	Returns { picks }
 *
 * 	Authorization required: must be logged in
 **/

router.get('/:username/picks', ensureLoggedIn, async function (req, res, next) {
	try {
		const picks = await User.picks(req.params.username);
		return res.json({ picks });
	} catch (err) {
		return next(err);
	}
});

/** POST /[username]/picks/player  { state } => { application }
 *
 * 	Body must include { playerId, gameId, stat, over_under, value, point_value }
 * 		Where playerId is an integer
 *
 * 		Where gameId is an integer
 *
 * 		Where stat can be points, fgm, fga, ftm, fta, tpm, tpa, rebounds,
 * 		assists, steals, turnovers, blocks
 *
 * 		Where over_under can be 'over' or 'under'
 *
 * 		Where value is an integer
 *
 * Returns { pick }
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/picks/players', ensureCorrectUser, async function (req, res, next) {
	try {
		const { playerId, gameId, stat, over_under, value, point_value } = req.body;
		const pick = await User.playerPick(req.params.username, playerId, gameId, stat, over_under, value, point_value);
		return res.json({ pick });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/picks/[pickId]  { state } => { application }
 *
 * 	Removes a player pick from DB.
 *
 * 	Returns { removed: { pick } }
 *
 * 	Authorization required: same-user-as-:username
 **/

router.delete('/:username/picks/players/:pickId', ensureCorrectUser, async function (req, res, next) {
	try {
		const pickId = +req.params.pickId;
		const username = req.params.username;
		const pick = await User.deletePlayerPick(username, pickId);
		return res.json({ removed: pick });
	} catch (err) {
		return next(err);
	}
});

/** POST /[username]/picks/team/  { state } => { application }
 *
 * 	Body must include { teamId, gameId, win_spread, value }
 * 		Where teamId is an integer
 *
 * 		Where gameId is an integer
 *
 * 		Where win_spread can be 'win' or 'spread'
 *
 * 		Where value is an integer
 *
 * Returns { pick }
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/picks/teams', ensureCorrectUser, async function (req, res, next) {
	try {
		const { teamId, gameId } = req.body;
		const pick = await User.teamPick(req.params.username, teamId, gameId);
		return res.json({ pick });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/picks/[pickId]  { state } => { application }
 *
 * 	Removes a team pick from DB.
 *
 * 	Returns { removed: { pick } }
 *
 * 	Authorization required: same-user-as-:username
 **/

router.delete('/:username/picks/teams/:pickId', ensureCorrectUser, async function (req, res, next) {
	try {
		const pickId = +req.params.pickId;
		const username = req.params.username;
		const pick = await User.deleteTeamPick(username, pickId);
		return res.json({ removed: pick });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
