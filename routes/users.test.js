const request = require('supertest');
const app = require('../app.js');
const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	adminToken,
	userToken,
} = require('../_testCommon.js');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** POST /users/ */

describe('POST /user/', function () {
	test('works if admin', async function () {
		const resp = await request(app)
			.post('/users')
			.send({
				username: 'u-new',
				password: 'password-new',
				isAdmin: false,
			})
			.set('authorization', adminToken);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({ user: { username: 'u-new', isAdmin: false }, token: expect.any(String) });
	});

	test('unauth if not admin', async function () {
		const resp = await request(app)
			.post('/users')
			.send({
				username: 'u-new',
				password: 'password-new',
				isAdmin: false,
			})
			.set('authorization', userToken);
		expect(resp.statusCode).toEqual(401);
	});

	test('bad request if missing data', async function () {
		const resp = await request(app)
			.post('/users')
			.send({
				username: 'u-new',
				isAdmin: false,
			})
			.set('authorization', adminToken);
		expect(resp.statusCode).toEqual(500);
	});
});

/** GET /users/[username] */

describe('GET /users/[username]', function () {
	test('works', async function () {
		const resp = await request(app).get('/users/User');
		expect(resp.statusCode).toEqual(200);
	});
});

/** POST /users/[username]/players/[playerId] */

describe('POST /users/[username]/[playerId]', function () {
	test('works', async function () {
		const resp = await request(app).post('/users/User/players/1').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({ user: expect.any(Object) });
		expect(resp.body.user.followedPlayers.length).toEqual(1);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).post('/users/User/players/1');
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth if wrong user', async function () {
		const resp = await request(app).post('/users/User/players/1').set('authorization', adminToken);
		expect(resp.statusCode).toEqual(401);
	});
});

/** DELETE /users/[username]/players/[playerId] */

describe('DELETE /users/[username]/player/[playerId]', function () {
	test('works', async function () {
		let resp = await request(app).post('/users/User/players/1').set('authorization', userToken);
		expect(resp.body.user.followedPlayers.length).toEqual(1);

		resp = await request(app).delete('/users/User/players/1').set('authorization', userToken);
		expect(resp.body.user.followedPlayers.length).toEqual(0);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).delete('/users/User/players/1');
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth if wrong user', async function () {
		await request(app).post('/users/User/players/1').set('authorization', userToken);
		const resp = await request(app).delete('/users/User/players/1').set('authorization', adminToken);
		expect(resp.statusCode).toEqual(401);
	});
});

/** POST /users/[username]/teams/[teamId] */

describe('POST /users/[username]/teams/[teamId]', function () {
	test('works', async function () {
		const resp = await request(app).post('/users/User/teams/1').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({ user: expect.any(Object) });
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).post('/users/User/teams/1');
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth if wrong user', async function () {
		const resp = await request(app).post('/users/User/teams/1').set('authorization', adminToken);
		expect(resp.statusCode).toEqual(401);
	});
});

/** DELETE /users/[username]/teams/[teamId] */

describe('DELETE /users/[username]/teams/[teamId]', function () {
	test('works', async function () {
		await request(app).post('/users/User/teams/1').set('authorization', userToken);

		resp = await request(app).delete('/users/User/teams/1').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.user.followedTeams.length).toEqual(0);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).delete('/users/User/teams/1');
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth if wrong user', async function () {
		await request(app).post('/users/User/teams/1').set('authorization', userToken);
		const resp = await request(app).delete('/users/User/teams/1').set('authorization', adminToken);
		expect(resp.statusCode).toEqual(401);
	});
});

/** POST /users/[username]/picks/players */

describe('POST /users/[username]/picks/players', function () {
	test('works', async function () {
		const resp = await request(app)
			.post('/users/User/teams/1')
			.send({ playerId: 1, gameId: 2, stat: 'points', over_under: 'over', value: 19.5, point_value: 100 })
			.set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({ user: expect.any(Object) });
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app)
			.post('/users/User/teams/1')
			.send({ playerId: 1, gameId: 2, stat: 'points', over_under: 'over', value: 19.5, point_value: 100 });
		expect(resp.statusCode).toEqual(401);
	});
});

/** POST /users/[username]/picks/teams */

describe('POST /users/[username]/picks/teams', function () {
	test('works', async function () {
		const resp = await request(app)
			.post('/users/User/teams/1')
			.send({ teamId: 1, gameId: 2 })
			.set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({ user: expect.any(Object) });
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).post('/users/User/teams/1').send({ teamId: 1, gameId: 2 });
		expect(resp.statusCode).toEqual(401);
	});
});
