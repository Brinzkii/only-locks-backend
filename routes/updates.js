'use strict';

/** Routes for updating database. */

const express = require('express');
const { ensureAdmin } = require('../middleware/auth');
const Game = require('../models/game');
const Player = require('../models/player');
const Team = require('../models/team');

const router = express.Router();

/** PATCH /games/all => { updateAllGames }
 *
 * Updates all games in database
 *
 * Authorization required: special update request
 **/

router.patch('/games/all', ensureAdmin, async function (req, res, next) {
	try {
		await Game.updateAll();
		return res.json({ updateAllGames: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /games/recent => { updateRecentGames }
 *
 *  Updates yesterday and today's games
 *
 * Authorization required: special update request
 */

router.patch('/games/recent', ensureAdmin, async function (req, res, next) {
	try {
		await Game.updateRecent();
		return res.json({ updateRecentGames: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /players/season =>{ updatePlayerSeasonStats }
 *
 * 	Updates player season stats
 *
 * 	Authorization required: special update request
 **/

router.patch('/players/season', ensureAdmin, async function (req, res, next) {
	try {
		await Player.updateSeasonStats();
		return res.json({ updatePlayerSeasonStats: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /players/games =>{ updatePlayerGameStats }
 *
 * 	Updates all recent player game stats
 *
 * 	Include { game: gameId } in request body
 *
 * 	Authorization required: special update request
 **/

router.patch('/players/games', ensureAdmin, async function (req, res, next) {
	try {
		const { method } = req.body;
		await Player.adminUpdateGameStats(method);
		const updatePlayerGameStats = {
			status: 'success',
		};
		return res.json({ updatePlayerGameStats });
	} catch (err) {
		return next(err);
	}
});

/** PATCH players/game/[gameId] =>{ updatePlayerGameStats }
 *
 * 	Updates all player game stats for a given game
 *
 * 	Include { game: gameId } in request body
 *
 * 	Authorization required: special update request
 **/

router.patch('/players/game/:gameId', ensureAdmin, async function (req, res, next) {
	try {
		const { gameId } = req.params;
		const { players, game } = await Player.updateGameStats(gameId);
		const updatePlayerGameStats = {
			status: 'success',
			gameId,
			players,
		};
		return res.json({ updatePlayerGameStats });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /teams/season =>{ updateTeamStats }
 *
 * 	Updates team season stats
 *
 * 	Authorization required: special update request
 **/

router.patch('/teams/season', ensureAdmin, async function (req, res, next) {
	try {
		await Team.updateSeasonStats();
		return res.json({ updateTeamStats: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /teams/games =>{ updateTeamStats }
 *
 * 	Updates team game stats
 *
 * 	Method in request body can be left off or "all"
 *
 * 	Authorization required: special update request
 **/

router.patch('/teams/games', ensureAdmin, async function (req, res, next) {
	try {
		const { method } = req.body;
		await Team.updateGameStats(method);
		return res.json({ updateTeamStats: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /picks/players
 *
 * 	Updates existing player picks in DB with end result
 *
 * 	Authorization required: authenitcated update request
 */

router.patch('/picks/players', ensureAdmin, async function (req, res, next) {
	try {
		const updatePlayerPicks = await Player.updatePicks();
		return res.json(updatePlayerPicks);
	} catch (err) {
		return next(err);
	}
});

/** PATCH /picks/teams
 *
 * 	Updates existing player picks in DB with end result
 *
 * 	Authorization required: authenitcated update request
 */

router.patch('/picks/teams', ensureAdmin, async function (req, res, next) {
	try {
		const updateTeamPicks = await Team.updatePicks();
		return res.json(updateTeamPicks);
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
