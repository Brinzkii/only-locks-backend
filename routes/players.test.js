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

/** GET /players */

describe('GET /players', function () {
	test('works', async function () {
		const resp = await request(app).get('/players').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.players.length).toEqual(2);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/players');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /players/[playerId] */

describe('GET /players/[playerId]', function () {
	test('works', async function () {
		const resp = await request(app).get('/players/1').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.player.id).toEqual(1);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/players/1');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /players/[playerId]/stats/season */

describe('GET /players/[playerId]/stats/season', function () {
	test('works', async function () {
		const resp = await request(app).get('/players/1/stats/season').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(Object.keys(resp.body)).toContain('seasonStats');
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/players/1/stats/season');
		expect(resp.statusCode).toEqual(401);
	});
});

/** POST /players/[playerId]/stats/game */

describe('POST /players/[playerId]/stats/game', function () {
	test('works', async function () {
		const resp = await request(app)
			.post('/players/1/stats/game')
			.send({ gameId: 1 })
			.set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(Object.keys(resp.body)).toContain('gameStats');
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).post('/players/1/stats/game').send({ gameId: 1 });
		expect(resp.statusCode).toEqual(401);
	});
});

/** POST /players/stats/sort */

describe('POST /players/stats/sort', function () {
	test('works', async function () {
		const resp = await request(app)
			.post('/players/stats/sort')
			.send({ time: 'season', stat: 'points', order: 'desc' })
			.set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.sortedStats.totals.length).toEqual(2);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app)
			.post('/players/stats/sort')
			.send({ time: 'season', stat: 'points', order: 'desc' });
		expect(resp.statusCode).toEqual(401);
	});
});
