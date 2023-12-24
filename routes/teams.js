'use strict';

/** Routes for teams. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn } = require('../middleware/auth');
const Team = require('../models/team');

const router = express.Router();

/** GET / => { teams }
 *
 * Returns [ {team }, { team }, ...]
 *   where team is { id, code, nickname, name, city, logo, conference,
 *                   division }
 *
 * Authorization required: must be logged in
 **/

router.get('/', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const teams = await Team.getAll();
		return res.json({ teams });
	} catch (err) {
		return next(err);
	}
});

/** GET /[teamId] => { team }
 *
 *  Returns { id, code, nickname, name, city, logo, conference, division }
 *
 *  Authorization required: must be logged in
 **/

router.get('/:teamId', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const team = await Team.get(req.params.teamId);
		return res.json({ team });
	} catch (err) {
		return next(err);
	}
});

/** GET /[teamId]/stats => { teamStats }
 *
 *  Returns { team, games, fastBreakPoints, pointsInPaint,
 *            secondChancePoints, pointsOffTurnovers, points, fgm, fga,
 *            fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, assists,
 *            fouls, steals, turnovers, blocks, plusMinus }
 *
 *  Authorization required: must be logged in
 **/

router.get('/:teamId/stats', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const teamStats = await Team.stats(req.params.teamId);
		return res.json({ teamStats });
	} catch (err) {
		return next(err);
	}
});

/** GET /[teamId]/stats => { teamGames }
 *
 *  Returns [ { id, date, location, homeTeam, awayTeam, clock, score } ]
 *
 *  Authorization required: must be logged in
 **/

router.get('/:teamId/games', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const teamGames = await Team.games(req.params.teamId);
		return res.json({ teamGames });
	} catch (err) {
		return next(err);
	}
});

/** GET /[teamId]/players => { teamPlayers }
 *
 *  Returns [ { id, firstName, lastName, birthday, height,
 *              weight, college, number, position } ]
 *
 *  Authorization required: must be logged in
 **/

router.get('/:teamId/players', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const teamPlayers = await Team.players(req.params.teamId);
		return res.json({ teamPlayers });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
