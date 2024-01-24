const db = require('./db.js');
const User = require('./models/user.js');
const Team = require('./models/team.js');
const Player = require('./models/player.js');
const Game = require('./models/game.js');
const { createToken } = require('./helpers/tokens.js');

async function commonBeforeAll() {
	await db.query('DELETE FROM users');
	await db.query('DELETE FROM teams');
	await db.query('DELETE FROM players');
	await db.query('DELETE FROM games');

	await User.register({ username: 'Admin', password: 'password', isAdmin: true });
	await User.register({ username: 'User', password: 'password', isAdmin: false });
	await db.query(
		`INSERT INTO teams (id, code, nickname, name, city, logo, conference, division) VALUES (1, 'BOS', 'Celtics', 'Boston Celtics', 'Boston', 'celtics.jpg', 'East', 'Atlantic') RETURNING id`
	);
	await db.query(
		`INSERT INTO teams (id, code, nickname, name, city, logo, conference, division) VALUES (2, 'NYK', 'Knicks', 'New York Knicks', 'New York', 'knicks.jpg', 'East', 'Atlantic') RETURNING id`
	);
	await db.query(
		`INSERT INTO players (id, first_name, last_name, birthday, height, weight, college, number, position, team_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		[1, 'Jayson', 'Tatum', '1998-03-03', `6'8"`, '210 lbs.', 'Duke', 0, 'F-G', 1]
	);
	await db.query(
		`INSERT INTO players (id, first_name, last_name, birthday, height, weight, college, number, position, team_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		[2, 'Julius', 'Randle', '1994-11-29', `6'8"`, '250 lbs.', 'Kentucky', 30, 'F-C', 2]
	);
	await db.query(
		`INSERT INTO games (id, date, location, home_team, away_team, status, clock, quarter, score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		[1, '2024-04-02 19:00:00-04', 'TD Garden (Boston)', 1, 2, 'scheduled', '', 0, 'TBD']
	);
}

async function commonBeforeEach() {
	await db.query('BEGIN');
}

async function commonAfterEach() {
	await db.query('ROLLBACK');
}

async function commonAfterAll() {
	await db.end();
}

const adminToken = createToken({ username: 'Admin', isAdmin: true });
const userToken = createToken({ username: 'User', isAdmin: false });

module.exports = {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	adminToken,
	userToken,
};
