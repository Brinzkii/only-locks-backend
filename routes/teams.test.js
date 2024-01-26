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

/** GET /teams */

describe('GET /teams', function () {
	test('works', async function () {
		const resp = await request(app).get('/teams').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.teams.length).toEqual(3);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/teams');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /teams/[teamId] */

describe('GET /teams/[teamId]', function () {
	test('works', async function () {
		const resp = await request(app).get('/teams/1').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.team.id).toEqual(1);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/teams/1');
		expect(resp.statusCode).toEqual(401);
	});
});

/** GET /teams/standings */

describe('GET /teams/standings', function () {
	test('works', async function () {
		const resp = await request(app).get('/teams/standings').set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(Object.keys(resp.body.standings)).toContain('east');
		expect(Object.keys(resp.body.standings)).toContain('west');
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).get('/teams/standings');
		expect(resp.statusCode).toEqual(401);
	});
});

/** POST /teams/stats/sort */

describe('POST /teams/stats/sort', function () {
	test('works', async function () {
		const resp = await request(app)
			.post('/teams/stats/sort')
			.send({ stat: 'wins', order: 'desc' })
			.set('authorization', userToken);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body.teamStats.totals.length).toEqual(3);
	});

	test('unauth if not logged in', async function () {
		const resp = await request(app).post('/teams/stats/sort').send({ stat: 'wins', order: 'desc' });
		expect(resp.statusCode).toEqual(401);
	});
});
