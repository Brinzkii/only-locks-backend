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
		`INSERT INTO teams (id, code, nickname, name, city, logo, conference, division) VALUES (1, 'BOS', 'Celtics', 'Boston Celtics', 'Boston', 'celtics.jpg', 'east', 'atlantic') RETURNING id`
	);
	await db.query(
		`INSERT INTO teams (id, code, nickname, name, city, logo, conference, division) VALUES (2, 'NYK', 'Knicks', 'New York Knicks', 'New York', 'knicks.jpg', 'east', 'atlantic') RETURNING id`
	);
	await db.query(
		`INSERT INTO teams (id, code, nickname, name, city, logo, conference, division) VALUES (3, 'ATL', 'Hawks', 'Atlanta Hawks', 'Atlanta', 'hawks.jpg', 'east', 'atlantic') RETURNING id`
	);
	await db.query(`INSERT INTO conference_standings (team_id, conference, rank) VALUES ($1, $2, $3)`, [1, 'east', 1]);
	await db.query(`INSERT INTO conference_standings (team_id, conference, rank) VALUES ($1, $2, $3)`, [2, 'east', 4]);
	await db.query(`INSERT INTO conference_standings (team_id, conference, rank) VALUES ($1, $2, $3)`, [3, 'east', 7]);
	await db.query(`INSERT INTO division_standings (team_id, division, rank, games_behind) VALUES ($1, $2, $3, $4)`, [
		1,
		'atlantic',
		1,
		0,
	]);
	await db.query(`INSERT INTO division_standings (team_id, division, rank, games_behind) VALUES ($1, $2, $3, $4)`, [
		2,
		'atlantic',
		2,
		2,
	]);
	await db.query(`INSERT INTO division_standings (team_id, division, rank, games_behind) VALUES ($1, $2, $3, $4)`, [
		3,
		'atlantic',
		3,
		4,
	]);
	await db.query(
		`INSERT INTO players (id, first_name, last_name, birthday, height, weight, college, number, position, team_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		[1, 'Jayson', 'Tatum', '1998-03-03', `6'8"`, '210 lbs.', 'Duke', 0, 'F-G', 1]
	);
	await db.query(
		`INSERT INTO players (id, first_name, last_name, birthday, height, weight, college, number, position, team_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		[2, 'Julius', 'Randle', '1994-11-29', `6'8"`, '250 lbs.', 'Kentucky', 30, 'F-C', 2]
	);
	await db.query(
		`INSERT INTO games (id, date, location, home_team, away_team, status, clock, quarter, score, winner) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
		[1, '2024-01-02 19:00:00-04', 'TD Garden (Boston)', 1, 2, 'finished', '', 0, '100 - 90', 1]
	);
	await db.query(
		`INSERT INTO games (id, date, location, home_team, away_team, status, clock, quarter, score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		[2, '2024-04-02 19:00:00-04', 'Madison Square Garden (NYC)', 2, 1, 'scheduled', '', 0, 'TBD']
	);
	await db.query(
		`
	INSERT INTO season_stats (player_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus, gp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
		[
			1, 4234, 432, 6544, 24, 6546, 324, 6546, 423, 6546, 324, 565, 435, 3454, 234, 4324, 3423, 3423, 6546, 3545,
			543, 33,
		]
	);
	await db.query(
		`
	INSERT INTO season_stats (player_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus, gp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
		[2, 434, 656, 765, 435, 65, 534, 65, 3453, 23, 656, 765, 87, 435, 87, 654, 345, 989, 7686, 756, 454, 33]
	);
	await db.query(
		`
	INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
		[1, 1, 54, 76, 45, 87, 98, 54, 34, 65, 34, 63, 75, 85, 34, 65, 34, 23, 67, 23, 45, 3]
	);
	await db.query(
		`
	INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
		[2, 1, 53, 24, 45, 87, 53, 54, 45, 65, 34, 23, 75, 85, 34, 65, 34, 48, 67, 23, 45, 3]
	);
	await db.query(
		`INSERT INTO team_game_stats (team_id, game_id, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus, fast_break_points, points_in_paint, second_chance_points, points_off_turnovers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
		[1, 1, 100, 41, 90, 46, 15, 20, 75, 10, 29, 34.5, 13, 31, 44, 23, 18, 5, 12, 4, 10, 0, 0, 0, 0]
	);
	await db.query(
		`INSERT INTO team_game_stats (team_id, game_id, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus, fast_break_points, points_in_paint, second_chance_points, points_off_turnovers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
		[2, 1, 90, 41, 90, 46, 15, 20, 75, 10, 29, 34.5, 13, 31, 44, 23, 18, 5, 12, 4, -10, 0, 0, 0, 0]
	);
	await db.query(
		`INSERT INTO team_stats (team_id, games, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus, total_reb, wins, losses, fast_break_points, points_in_paint, second_chance_points, points_off_turnovers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
		[
			1, 33, 4338, 1630, 3578, 46, 630, 802, 79.5, 448, 1293, 34.3, 435, 1255, 985, 776, 277, 578, 199, -454,
			1690, 25, 8, 0, 0, 0, 0,
		]
	);
	await db.query(
		`INSERT INTO team_stats (team_id, games, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus, total_reb, wins, losses, fast_break_points, points_in_paint, second_chance_points, points_off_turnovers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
		[
			2, 33, 5024, 1842, 3378, 44, 690, 902, 79.5, 418, 1193, 36.3, 475, 1455, 925, 716, 247, 538, 149, 130, 1580,
			8, 25, 0, 0, 0, 0,
		]
	);
	await db.query(
		`INSERT INTO team_stats (team_id, games, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus, total_reb, wins, losses, fast_break_points, points_in_paint, second_chance_points, points_off_turnovers) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
		[
			3, 33, 5014, 1842, 3378, 44, 690, 902, 79.5, 418, 1193, 36.3, 475, 1455, 925, 716, 247, 538, 149, 130, 1580,
			6, 27, 0, 0, 0, 0,
		]
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
