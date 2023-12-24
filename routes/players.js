'use strict';

/** Routes for players. */

const express = require('express');
const { authenticateJWT, ensureLoggedIn } = require('../middleware/auth');
const Player = require('../models/team');

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

module.exports = router;
