'use strict';

/** Routes for users. */

const express = require('express');
const { ensureCorrectUser } = require('../middleware/auth');
const User = require('../models/user');

const router = express.Router();

/** GET /[username] => { user }
 *
 * Returns { username, followedTeams, followedPlayers }
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
 * Returns {"followedPlayer": playerId}
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/players/:id', ensureCorrectUser, async function (req, res, next) {
	try {
		const playerId = +req.params.id;
		await User.toggleFollow(req.params.username, playerId);
		return res.json({ followedPlayer: playerId });
	} catch (err) {
		return next(err);
	}
});

/** POST /[username]/teams/[teamId]  { state } => { application }
 *
 * Returns {"followedTeam": TeamId}
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/teams/:id', ensureCorrectUser, async function (req, res, next) {
	try {
		const teamId = +req.params.id;
		await User.toggleFollow(req.params.username, teamId);
		return res.json({ followedTeam: teamId });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/[playerId]  { state } => { application }
 *
 * Returns {"unfollowedPlayer": playerId}
 *
 * Authorization required: same-user-as-:username
 **/

router.delete('/:username/players/:id', ensureCorrectUser, async function (req, res, next) {
	try {
		const playerId = +req.params.id;
		await User.toggleFollow(req.params.username, playerId);
		return res.json({ unfollowedPlayer: playerId });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]/teams/[teamId]  { state } => { application }
 *
 * Returns {"unfollowedTeam": TeamId}
 *
 * Authorization required: same-user-as-:username
 **/

router.delete('/:username/teams/:id', ensureCorrectUser, async function (req, res, next) {
	try {
		const teamId = +req.params.id;
		await User.toggleFollow(req.params.username, teamId);
		return res.json({ unfollowedTeam: teamId });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
