'use strict';

/** Routes for teams. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn, ensureAdmin } = require('../middleware/auth');
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

/** GET /stats
 * 
 * 	Returns [ { teamStats } ]
 * 
 **/

router.get('/stats', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const teamStats = await Team.allStats()
		return res.json({teamStats})
	} catch(err) {
		return next(err);
	}	
});

/** PATCH /stats =>{ updateTeamStats } 
 * 
 * 	Updates team season stats
 * 
 * 	Authorization required: must be admin
 **/

router.patch('/stats', authenticateJWT, ensureAdmin, async function (req, res, next) {
	try {
		await Team.updateStats();
		return res.json({ updateTeamStats: 'success' });
	} catch (err) {
		return next(err);
	}
});

/** GET /stats/sort
 * 
 *  Must include stat and order in body of request
 * 
 * 	Stat to sort by can include games, fast_break_points, points_in_paint, 
 * 	second_chance_points, points_off_turnovers, points, fgm, fga, fgp, ftm, 
 * 	fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, 
 * 	steals, turnovers, blocks, plus_minus
 * 
 * 	Order may be DESC or ASC (case insensitive)
 * 
 * 	Returns [ {teamStats}, ... ]
 * 
 * 	Where teamStats is { id, name, games, fastBreakPoints, pointsInPaint, 
 * 						 secondChancePoints, pointsOffTurnovers, points, fgm, 
 * 						 fga,fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, 
 * 						 totalReb, assists, fouls, steals, turnovers, blocks, 
 * 						 plusMinus }
 * 
 * 	Authorization required: must be logged in
 **/

router.get('/stats/sort', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const {stat, order} = req.body
		const teamStats = await Team.sortByStats(stat, order)
		return res.json({teamStats})
	} catch (err) {
		return next(err)
	}
})

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
 *            fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, totalReb 
 * 			  assists,fouls, steals, turnovers, blocks, plusMinus }
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

/** GET /[teamId]/stats/top 
 * 
 * 	Returns { teamId, points, rebounds, blocks, assists }
 * 
 * 	Authorization Required: must be logged in
 **/

router.get('/:teamId/stats/top', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const teamId = req.params.teamId
		const topPerformers = await Team.topPerformers(teamId)
		return res.json({topPerformers})
	} catch (err) {
		return next(err)
	}
})

/** GET /[teamId]/games => { teamGames }
 *
 *  Returns [ { id, date, location, home, away, clock, score } ]
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
 *  Returns [ { id, name, birthday, height,
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
