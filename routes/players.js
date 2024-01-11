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

/** GET /[playerId]/stats/game => { gameStats }
 * 
 * 	Can pass in gameId via request body for a specific game's stats
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

router.post('/:playerId/stats/game', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const { gameId } = req.body;
		const gameStats = await Player.gameStats(req.params.playerId, gameId);
		return res.json({ gameStats });
	} catch (err) {
		return next(err);
	}
});

/** POST /stats/season/sort
 *
 *  Must include stat, time and order in body of request
 *
 * 	Stat to sort by can include points, fgm, fga, fgp, ftm, fta, ftp, tpm,
 *       tpa, tpp, offReb, defReb, totalReb (season stats only), assists,
 * 		 fouls, steals, turnovers, blocks, plusMinus
 *
 * 	Time can be a date string "DD-MM-YYYY", "today", or "yesterday"
 * 		Default is "season"
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

router.post('/stats/sort', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const { teamId, gameId, playerId, time, stat, order } = req.body;
		const sortedStats = await Player.sortByStats(teamId, gameId, playerId, time, stat, order);
		return res.json({ sortedStats });
	} catch (err) {
		return next(err);
	}
});

/** POST /stats/picks
 * 
 * 	Must include array of games
 * 
 * 	Returns data to be used for populating player pick options
 * 
 * 	Returns [ { pickData } ]
 * 		Where pickData is { id, name, gameId, home, away, points, rebounds, 	
 * 						    tpm, steals, assists, blocks }
 * 
 *  Authorization required: must be logged in
 */

router.post('/stats/picks', authenticateJWT, ensureLoggedIn, async function (req, res, next) {
	try {
		const {games} = req.body
		const playerPickData = await Player.playerPickData(games)
		return res.json({playerPickData})
	} catch(err) {
		return next(err)
	}
})

module.exports = router;
