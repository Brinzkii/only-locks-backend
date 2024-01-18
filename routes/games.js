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

/** GET /[gameId]/stats => { teamStats }
 *
 * 	Returns { gameId, score, home, away }
 * 		Where home and away are { id, name, fast_break_points, points_in_paint,
 * 		second_chance_points, points_off_turnovers, points, fgm, fga, fgp, ftm,
 * 		fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls,
 * 		steals, turnovers, blocks, plus_minus }
 *
 * 	Authorization required: must be logged in
 **/

router.get('/:gameId/stats', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const gameId = req.params.gameId;
		const gameStats = await Game.getStats(gameId);
		return res.json({ gameStats });
	} catch (err) {
		return next(err);
	}
});

/** GET /[gameId]/top => { topPerformers }
 *
 * 	Returns { game, home, away }
 * 		Where home and away are { points: { id, name, value }, rebounds:
 * 				                  { id, name, value }, assists: { id, name,
 * 								  value }, blocks: { id, name, value },
 * 								  steals: { id, name, value }, plusMinus:
 * 								  { id, name, value } }
 *
 *  Authorization required: must be logged in
 */

router.get('/:gameId/top', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const gameId = req.params.gameId;
		const topPerformers = await Game.getTopPerformers(gameId);
		return res.json({ topPerformers });
	} catch (err) {
		return next(err);
	}
});

/** GET /filter/date/[date]=> { games }
 *
 *  Can pass in a date string "YYYYMMDD", "today", "tomorrow", "yesterday"
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
			let day;
			if (date === 'today') {
				day = moment().format('YYYYMMDD');
			} else if (date === 'yesterday') {
				day = moment().subtract(1, 'days').format('YYYYMMDD');
			} else {
				day = moment().add(1, 'days').format('YYYYMMDD');
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



router.get('/h2h/:team1id/:team2id', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const h2h = await Game.h2h(req.params.team1id, req.params.team2id);
		return res.json({ h2h });
	} catch (err) {
		return next(err);
	}
});

/** GET /[gameId]/picks => [ { pick }, ... ] 
 * 
 * 	Filters all picks by gameId and returns randomly ordered array
 * 
 * 	Authorization required: must be logged in
 */

router.get('/:gameId/picks', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const picks = await Game.picks(req.params.gameId);
		return res.json({ picks });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
