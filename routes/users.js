'use strict';

/** Routes for users. */

const express = require('express');
const { ensureCorrectUser } = require('../middleware/auth');
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
 * Returns {"followedPlayer": playerId}
 *
 * Authorization required: same-user-as-:username
 **/

router.post('/:username/players/:id', ensureCorrectUser, async function (req, res, next) {
	try {
		const playerId = +req.params.id;
		const user = await User.follow(req.params.username, playerId);
		return res.json({ user });
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
		const user = await User.follow(req.params.username, teamId);
		return res.json({ user });
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
		const user = await User.unfollow(req.params.username, playerId);
		return res.json({ user });
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
		const user = await User.unfollow(req.params.username, teamId);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** POST /[username]/picks/player/[player_id]  { state } => { application }
 *
 * 	Body must include { gameId, stat, over_under, value }
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

router.post('/:username/picks/players/:playerId', ensureCorrectUser, async function (req, res, next) {
	try {
		const { gameId, stat, over_under, value } = req.body;
		const playerId = +req.params.playerId;
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

/** POST /[username]/picks/team/[team_id]  { state } => { application }
 *
 * 	Body must include { gameId, win_spread, value }
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

router.post('/:username/picks/teams/:teamId', ensureCorrectUser, async function (req, res, next) {
	try {
		const { gameId, win_spread, value } = req.body;
		const teamId = +req.params.teamId;
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
