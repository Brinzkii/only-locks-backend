'use strict';

/** Routes for players. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn } = require('../middleware/auth');
const Player = require('../models/player');

const router = express.Router();

/** GET / => { players }
 *
 * Returns [ { player }, { player }, ...]
 *      Where player is { id, firstName, lastName, team_id, team_name, 
 * 						  team_conference, team_division, team_logo, birthday, 
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
 *  Returns { id, firstName, lastName, team_id, team_name, 
 * 			  team_conference, team_division, team_logo, birthday, 
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
 *	Returns { player_id, name, points, fgm, fga, fgp, ftm, fta, ftp, tpm,
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
 *	Returns { player_id, player_name, game, minutes, points, fgm, fga, fgp,
 * 			  ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, assists, fouls,
 * 			  steals, turnovers, blocks }
 *
 *  Where game is { id, date, location, hometeam_id, hometeam_name,
 *                  hometeam_code, hometeam_logo, awayteam_id,
 * 					awayteam_name, awayteam_code, awayteam_logo, clock,
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

/** GET /sort/[time]/[method]/desc
 * 
 * 	Stat to sort by can include points, fgm, fga, fgp, ftm, fta, ftp, tpm,
 *       tpa, tpp, offReb, defReb, assists, fouls, steals, turnovers, blocks, 
 *       plusMinus
 * 
 * 	Time can be a date string "DD-MM-YYYY", "season", "today", or "yesterday"
 * 
 * 	Order may be DESC or ASC (case insensitive)
 * 
 * 	Returns [ {seasonStats}, ... ]
 * 
 * 	Where seasonStats is { player_id, firstname, lastname, points, fgm, fga, 
 * 			               fgp, ftm, fta, ftp, tpm, tpa, tpp, offReb, defReb, 
 * 						   assists, fouls, steals, turnovers, blocks, 
 * 						   plusMinus }
 * 
 * 	Authorization required: must be logged in
 **/

router.get('/sort/:time/:stat/:order', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const sortedStats = await Player.sortByStats(req.params.time, req.params.stat, req.params.order);
		return res.json({ sortedStats });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
