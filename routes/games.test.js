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

/** GET /games/ */

describe('GET /games/', function () {
	test('works', async function () {
		const resp = await request(app).get('/games').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.games.length).toEqual(2);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/games');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /games/[gameId] */

describe('GET /games/[gameId]', function () {
	test('works', async function () {
		const resp = await request(app).get('/games/1').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.game.id).toEqual(1);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/games/1');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /games/[gameId]/stats */

describe('GET /games/[gameId]/stats', function () {
	test('works', async function () {
		const resp = await request(app).get('/games/1/stats').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(Object.keys(resp.body.gameStats)).toContain('gameId');
		expect(Object.keys(resp.body.gameStats)).toContain('home');
		expect(Object.keys(resp.body.gameStats)).toContain('away');
		expect(Object.keys(resp.body.gameStats)).toContain('score');
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/games/1/stats');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /games/[gameId]/top */

describe('GET /games/[gameId]/top', function () {
	test('works', async function () {
		const resp = await request(app).get('/games/1/top').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(Object.keys(resp.body.topPerformers)).toContain('home');
		expect(Object.keys(resp.body.topPerformers)).toContain('away');
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/games/1/top');
		expect(resp.statusCode).toEqual(401);
	});
});
