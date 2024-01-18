'use strict';

/** Express app for OnlyLocks. */

const express = require('express');
const cors = require('cors');
const schedule = require('node-schedule');
const update = require('./helpers/updates');
const moment = require('moment');

const { NotFoundError } = require('./expressError');

const { authenticateJWT } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const userRoutes = require('./routes/users');
const playerRoutes = require('./routes/players');
const gameRoutes = require('./routes/games');
const updateRoutes = require('./routes/updates');

const morgan = require('morgan');

const app = express();

// Schedule updates to run

// Game details (score, clock, quarter), player game stats and teamstats will update every 15 minutes starting at 7pm each day and ending at 2 am
const frequentUpdateJob = schedule.scheduleJob('0,15,30,45 0-6 * * *', async function (fireTime) {
	try {
		console.log(`
		***** REGULAR UPDATES STARTED AT: ${fireTime} *****
		`);
		const result = await update.frequent();
		if (result)
			console.log(`
		***** REGULAR UPDATES COMPLETED AT: ${moment().format('LTS')}*****
		`);
	} catch (err) {
		console.error(err);
	}
});

// PLayer and team picks will update every hour to determine win/loss and update users win/loss total
const hourlyUpdateJob = schedule.scheduleJob('0 0-6 * * *', async function (fireTime) {
	try {
		console.log(`
		***** HOURLY UPDATES STARTED AT: ${fireTime} *****
		`);
		const result = await update.hourly();
		if (result) {
			console.log(`
		***** HOURLY UPDATES COMPLETED AT: ${moment().format('LTS')}*****
		`);
		}
	} catch (err) {
		console.error(err);
	}
});

// Team season stats, player season stats and standings will update once a day at 2:30 am
const dailyStatsUpdateJob = schedule.scheduleJob('30 7 * * *', async function (fireTime) {
	try {
		console.log(
			`
		***** DAILY UPDATES STARTED AT: ${fireTime} *****
		`,
			fireTime
		);
		const result = await update.dailyStats();
		if (result)
			console.log(`
		***** DAILY UPDATES COMPLETED AT: ${moment().format('LTS')} *****
		`);
	} catch (err) {
		console.error(err);
	}
});

// Player info will update once a day at 8am (this is mostly to account for trades)
const dailyPlayerUpdateJob = schedule.scheduleJob('0 13 * * *', async function (fireTime) {
	try {
		console.log(
			`
		***** PLAYER UPDATES STARTED AT: ${fireTime} *****
		`,
			fireTime
		);
		const result = await update.dailyPlayers();
		if (result)
			console.log(`
		***** PLAYER UPDATES COMPLETED AT: ${moment().format('LTS')} *****
		`);
	} catch (err) {
		console.error(err);
	}
});



app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));
app.use(authenticateJWT);

app.use('/auth', authRoutes);
app.use('/teams', teamRoutes);
app.use('/users', userRoutes);
app.use('/players', playerRoutes);
app.use('/games', gameRoutes);
app.use('/update', updateRoutes);

/** Handle 404 errors -- this matches everything */
app.use(function (req, res, next) {
	return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
	if (process.env.NODE_ENV !== 'test') console.error(err.stack);
	const status = err.status || 500;
	const message = err.message;

	return res.status(status).json({
		error: { message, status },
	});
});

module.exports = app;
