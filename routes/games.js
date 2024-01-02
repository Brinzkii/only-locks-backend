'use strict';

/** Routes for teams. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn } = require('../middleware/auth');
const Game = require('../models/game');

const router = express.Router();

/** GET / => { games }
 *
 * Returns [ {game }, { game }, ...]
 *
 *  Where game is { id, date, location, homeId, homeName,
 *                  homeCode, homeLogo, awayId, awayName,
 * 			        awayCode, awayLogo, clock, score }
 *
 * Authorization required: must be logged in
 **/

router.get('/', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const games = await Game.getAll();
		return res.json({ games });
	} catch (err) {
		return next(err);
	}
});

/** GET /[gameId] => { game }
 *
 *  Returns { id, date, location, homeId, homeName,
 *            homeCode, homeLogo, awayId, awayName,
 * 			  awayCode, awayLogo, clock, score }
 *
 * Authorization required: must be logged in
 **/

router.get('/:gameId', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const game = await Game.get(req.params.gameId);
		return res.json({ game });
	} catch (err) {
		return next(err);
	}
});

/** GET /filter/date/[date]=> { games }
 *
 *  Can pass in a date string "DD-MM-YYYY", "today", "tomorrow", "yesterday"
 *
 *  Returns [ {game }, { game }, ...]
 *
 *   Where game is { id, date, location, homeId, homeName,
 *                   homeCode, homeLogo, awayId, awayName,
 * 			         awayCode, awayLogo, clock, score }
 *
 *  Authorization required: must be logged in
 **/

router.get('/filter/date/:date', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const date = req.params.date;
		if (date === 'today' || date === 'yesterday' || date === 'tomorrow') {
			let d = new Date();
			let day;
			if (date === 'today') {
				day = d.toISOString().slice(0, 10);
			} else if (date === 'yesterday') {
				day = d.getDate() - 1;
				d.setDate(day);
				day = d.toISOString().slice(0, 10);
			} else {
				day = d.getDate() + 1;
				d.setDate(day);
				day = d.toISOString().slice(0, 10);
			}

			const games = await Game.filter(null, day);
			return res.json({ games });
		} else {
			const games = await Game.filter(null, date);
			return res.json({ games });
		}
	} catch (err) {
		return next(err);
	}
});

/** GET /filter/team/[teamId]=> { games }
 *
 *  Filters all games by teamId
 *
 *  Returns [ {game }, { game }, ...]
 *
 *   Where game is { id, date, location, homeId, homeName,
 *                   homeCode, homeLogo, awayId, awayName,
 * 			         awayCode, awayLogo, clock, score }
 *
 *  Authorization required: must be logged in
 **/

router.get('/filter/team/:teamId', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const games = await Game.filter(req.params.teamId);
		return res.json({ games });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
