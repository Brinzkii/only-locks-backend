'use strict';

/** Routes for players. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn } = require('../middleware/auth');
const Player = require('../models/player');

const router = express.Router();

/** GET / => { players }
 *
 * Returns [ { player }, { player }, ...]
 *      Where player is { id, firstName, lastName, birthday, height,
 *            weight, college, number, position, team }
 *
 *      Where team is { id, code, nickname, name, city, logo, conference,
 *                  division }
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
 *  Returns { id, firstName, lastName, birthday, height,
 *            weight, college, number, position, team }
 *
 *      Where team is { id, code, nickname, name, city, logo, conference,
 *                  division }
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
 *	Returns { points, fgm, fga, fgp, ftm, fta, ftp, tpm,
 *            tpa, tpp, offReb, defReb, assists, fouls,
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
 *	Returns { player, game, minutes, points, fgm, fga, fgp, ftm, fta,
 *            ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls, steals
 *            turnovers, blocks }
 *
 *  Where player is { id, name }
 *
 *  Where game is { id, date, location, homeTeam, awayTeam, clock, score }
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

module.exports = router;
