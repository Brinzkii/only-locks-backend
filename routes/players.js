'use strict';

/** Routes for players. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn, ensureAdmin } = require('../middleware/auth');
const Player = require('../models/player');

const router = express.Router();

/** GET / => { players }
 *
 * Returns [ { player }, { player }, ...]
 *      Where player is { id, name, teamId, teamName,
 * 						  conference, division, teamLogo, birthday,
 * 						  height, weight, college, number, position }
 *
 * Authorization required: must be logged in
 **/

router.get('/', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const players = await Player.getAll();
		return res.json({ players });
	} catch (err) {
		return next(err);
	}
});

/** GET /[playerId] => { player }
 *
 *  Returns { id, name, teamId, teamName,
 * 			  conference, division, teamLogo, birthday,
 * 			  height, weight, college, number, position }
 *
 *  Authorization required: must be logged in
 **/

router.get('/:playerId', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const player = await Player.get(req.params.playerId);
		return res.json({ player });
	} catch (err) {
		return next(err);
	}
});

/** GET /[playerId]/stats/season => { seasonStats }
 *
 *	Returns { id, name, points, fgm, fga, fgp, ftm, fta, ftp, tpm,
 *            tpa, tpp, offReb, defReb, totalReb, assists, fouls,
 *            steals, turnovers, blocks, plusMinus }
 *
 *  Authorization required: must be logged in
 **/

router.get('/:playerId/stats/season', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const seasonStats = await Player.seasonStats(req.params.playerId);
		return res.json({ seasonStats });
	} catch (err) {
		return next(err);
	}
});

/** GET /[playerId]/stats/game/[gameId] => { gameStats }
 *
 *	Returns { id, name, game, minutes, points, fgm, fga, fgp,
 * 			  ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls,
 * 			  steals, turnovers, blocks, plusMinus }
 *
 *  Where game is { id, date, location, homeId, homeName,
 *                  homeCode, homeLogo, awayId,
 * 					awayName, awayCode, awayLogo, clock,
 *  				score }
 *
 *  Authorization required: must be logged in
 **/

router.get('/:playerId/stats/game/:gameId', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const gameStats = await Player.gameStats(req.params.playerId, req.params.gameId);
		return res.json({ gameStats });
	} catch (err) {
		return next(err);
	}
});

/** GET /stats/sort
 *
 *  Must include stat, time and order in body of request
 *
 * 	Stat to sort by can include points, fgm, fga, fgp, ftm, fta, ftp, tpm,
 *       tpa, tpp, offReb, defReb, totalReb (season stats only), assists,
 * 		 fouls, steals, turnovers, blocks, plusMinus
 *
 * 	Time can be a date string "DD-MM-YYYY", "season", "today", or "yesterday"
 *
 * 	Order may be DESC or ASC (case insensitive)
 *
 * 	Returns [ {seasonStats}, ... ]
 *
 * 	Where seasonStats is { id, name, points, fgm, fga,
 * 			               fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb,
 * 						   totalReb, assists, fouls, steals, turnovers, blocks,
 * 						   plusMinus }
 *
 * 	Authorization required: must be logged in
 **/

router.get('/stats', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const { time, stat, order } = req.body;
		const sortedStats = await Player.sortByStats(time, stat, order);
		return res.json({ sortedStats });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /stats/season =>{ updatePlayerSeasonStats }
 *
 * 	Updates player season stats
 *
 * 	Authorization required: must be admin
 **/

router.patch('/stats/season', authenticateJWT, ensureAdmin, async function (req, res, next) {
	try {
		await Player.updateSeasonStats();
		return res.json({ updatePlayerSeasonStats: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /stats/games =>{ updatePlayerGameStats }
 *
 * 	Updates all player game stats for a given game
 *
 * 	Include { game: gameId } in request body
 *
 * 	Authorization required: must be admin
 **/

router.patch('/stats/game/:gameId', authenticateJWT, ensureAdmin, async function (req, res, next) {
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

/** PATCH /stats/games =>{ updatePlayerGameStats }
 *
 * 	Updates all player game stats for a given game
 *
 * 	Include { game: gameId } in request body
 *
 * 	Authorization required: must be admin
 **/

router.patch('/stats/games', authenticateJWT, ensureAdmin, async function (req, res, next) {
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

module.exports = router;
