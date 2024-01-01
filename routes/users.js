'use strict';

/** Routes for users. */

const express = require('express');
const { ensureCorrectUser, ensureLoggedIn } = require('../middleware/auth');
const User = require('../models/user');

const router = express.Router();

/** GET /[username] => { user }
 *
 * Returns { username, wins, losses, followedTeams, followedPlayers }
 *   where followedTeams is [team_id, team_id, ...]
 *   where followedPlayers is [player_id, player_id, ...]
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

/** POST /[username]/teams/[teamId]  { state } => { application }
 *
 * Returns { user }
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/teams/:teamId', ensureCorrectUser, async function (req, res, next) {
	try {
		const teamId = +req.params.teamId;
		const user = await User.follow(req.params.username, teamId);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/[playerId]  { state } => { application }
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

/** DELETE /[username]/teams/[teamId]  { state } => { application }
 *
 * Returns { user }
 *
 * Authorization required: same-user-as-:username
 **/

router.delete('/:username/teams/:teamId', ensureCorrectUser, async function (req, res, next) {
	try {
		const teamId = +req.params.teamId;
		const user = await User.unfollow(req.params.username, teamId);
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
 * 	Body must include { playerId, gameId, stat, over_under, value }
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
		const { playerId, gameId, stat, over_under, value } = req.body;
		const pick = await User.playerPick(req.params.username, playerId, gameId, stat, over_under, value);
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
		const { teamId, gameId, win_spread, value } = req.body;
		const pick = await User.teamPick(req.params.username, teamId, gameId, win_spread, value);
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
