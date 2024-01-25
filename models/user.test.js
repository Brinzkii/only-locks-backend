const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError.js');
const db = require('../db.js');
const User = require('./user.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('../_testCommon.js');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** Authenticate */

describe('authenticate', function () {
	test('works', async function () {
		const adminUser = await User.authenticate('Admin', 'password');
		const regUser = await User.authenticate('User', 'password');

		expect(adminUser).toEqual({
			username: 'Admin',
			isAdmin: true,
		});
		expect(regUser).toEqual({
			username: 'User',
			isAdmin: false,
		});
	});

	test('unauth if no such user', async function () {
		try {
			await User.authenticate('nope', 'password');
			fail();
		} catch (err) {
			expect(err instanceof UnauthorizedError).toBeTruthy();
		}
	});

	test('unauth if wrong password', async function () {
		try {
			await User.authenticate('Admin', 'wrongpassword');
			fail();
		} catch (err) {
			expect(err instanceof UnauthorizedError).toBeTruthy();
		}
	});
});

/** Register */

describe('register', function () {
	const newUser = {
		username: 'new',
		isAdmin: false,
	};

	test('works', async function () {
		let user = await User.register({ ...newUser, password: 'password' });
		expect(user).toEqual(newUser);
		const found = await db.query("SELECT * FROM users WHERE username = 'new'");
		expect(found.rows.length).toEqual(1);
		expect(found.rows[0].is_admin).toEqual(false);
		expect(found.rows[0].password.startsWith('$2b$')).toEqual(true);
	});

	test('works: adds admin', async function () {
		let user = await User.register({
			...newUser,
			password: 'password',
			isAdmin: true,
		});
		expect(user).toEqual({ ...newUser, isAdmin: true });
		const found = await db.query("SELECT * FROM users WHERE username = 'new'");
		expect(found.rows.length).toEqual(1);
		expect(found.rows[0].is_admin).toEqual(true);
		expect(found.rows[0].password.startsWith('$2b$')).toEqual(true);
	});

	test('bad request with dup data', async function () {
		try {
			await User.register({
				...newUser,
				password: 'password',
			});
			await User.register({
				...newUser,
				password: 'password',
			});
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/** Get user */

describe('get user', function () {
	test('works', async function () {
		const user = await User.get('User');
		expect(user).toEqual({
			username: 'User',
			wins: 0,
			losses: 0,
			followedTeams: [],
			followedPlayers: [],
			picks: { playerPicks: [], playerPickRecord: '0 - 0', teamPicks: [], teamPickRecord: '0 - 0' },
			points: 0,
			isAdmin: false,
		});
	});

	test('not found with bad data', async function () {
		try {
			await User.get('nope');
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Follow / unfollow player */

describe('follow / unfollow a player', function () {
	test('follow works', async function () {
		await User.follow('User', 1);
		const checkFollow = await db.query('SELECT username, player_id FROM followed_players');
		expect(checkFollow.rows.length).toEqual(1);
		expect(checkFollow.rows[0].username).toEqual('User');
		expect(checkFollow.rows[0].player_id).toEqual(1);
	});

	test('bad request if already following', async function () {
		try {
			await User.follow('User', 1);
			await User.follow('User', 1);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('not found if bad user', async function () {
		try {
			await User.follow('nope', 1);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('unfollow works', async function () {
		await User.follow('User', 1);
		let checkFollow = await db.query('SELECT username, player_id FROM followed_players');
		expect(checkFollow.rows.length).toEqual(1);

		await User.unfollow('User', 1);
		checkFollow = await db.query('SELECT username, player_id FROM followed_players');
		expect(checkFollow.rows.length).toEqual(0);
	});

	test('bad request if not following', async function () {
		try {
			await User.unfollow('User', 1);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('not found if bad user', async function () {
		try {
			await User.unfollow('nope', 1);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Follow / unfollow team */

describe('follow / unfollow a team', function () {
	test('follow works', async function () {
		await User.follow('User', null, 1);
		const checkFollow = await db.query('SELECT username, team_id FROM followed_teams');
		expect(checkFollow.rows.length).toEqual(1);
		expect(checkFollow.rows[0].username).toEqual('User');
		expect(checkFollow.rows[0].team_id).toEqual(1);
	});

	test('bad request if already following', async function () {
		try {
			await User.follow('User', null, 1);
			await User.follow('User', null, 1);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('not found if bad user', async function () {
		try {
			await User.follow('nope', null, 1);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('unfollow works', async function () {
		await User.follow('User', null, 1);
		let checkFollow = await db.query('SELECT username, team_id FROM followed_teams');
		expect(checkFollow.rows.length).toEqual(1);

		await User.unfollow('User', null, 1);
		checkFollow = await db.query('SELECT username, team_id FROM followed_teams');
		expect(checkFollow.rows.length).toEqual(0);
	});

	test('bad request if not following', async function () {
		try {
			await User.unfollow('User', null, 1);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('not found if bad user', async function () {
		try {
			await User.unfollow('nope', null, 1);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Player picks */

describe('player pick', function () {
	test('works', async function () {
		const pick = await User.playerPick('User', 1, 2, 'points', 'over', 19.5, 100);
		expect(pick instanceof Object).toBeTruthy();
		expect(pick.playerId).toEqual(1);
		expect(pick.gameId).toEqual(2);
		expect(pick.stat).toEqual('points');
		expect(pick.overUnder).toEqual('OVER');
	});

	test('bad request if game has happened / started', async function () {
		try {
			await User.playerPick('User', 1, 1, 'points', 'over', 19.5, 100);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('not found if bad player', async function () {
		try {
			await User.playerPick('User', 5, 2, 'points', 'over', 19.5, 100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('not found if bad user', async function () {
		try {
			await User.playerPick('nope', 1, 2, 'points', 'over', 19.5, 100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('not found if bad game', async function () {
		try {
			await User.playerPick('User', 1, 5, 'points', 'over', 19.5, 100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('bad request for dup pick', async function () {
		try {
			await User.playerPick('User', 1, 2, 'points', 'over', 19.5, 100);
			await User.playerPick('User', 1, 2, 'points', 'under', 19.5, 100);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('bad request for invalid stat category', async function () {
		try {
			await User.playerPick('User', 1, 2, 'nope', 'over', 19.5, 100);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/** Team picks */

describe('team pick', function () {
	test('works', async function () {
		const pick = await User.teamPick('User', 1, 2);
		expect(pick instanceof Object).toBeTruthy();
		expect(pick.team_id).toEqual(1);
		expect(pick.game_id).toEqual(2);
	});

	test('not found if bad team', async function () {
		try {
			await await User.teamPick('User', 5, 2);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('not found if bad user', async function () {
		try {
			await await User.teamPick('nope', 1, 2);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('not found if bad game', async function () {
		try {
			await await User.teamPick('User', 1, 5);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('bad request for dup pick', async function () {
		try {
			await User.teamPick('User', 1, 2);
			await User.teamPick('User', 1, 2);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/** Get all user picks */

describe('get user picks', function () {
	test('works', async function () {
		await User.teamPick('User', 1, 2);
		await User.playerPick('User', 1, 2, 'points', 'over', 19.5, 100);
		const picks = await User.picks('User');
		expect(picks.playerPicks.length).toEqual(1);
		expect(picks.teamPicks.length).toEqual(1);
	});
});