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
	test('works', async function () {
		// const playerId = await db.query(`SELECT id FROM players WHERE first_name = 'Jayson'`);
		// const user = await User.follow('User', playerId.rows[0].id);
		// expect(user.followedPlayers).toContain(playerId.rows[0].id);
	});
});
