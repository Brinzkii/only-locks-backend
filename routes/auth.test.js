const request = require('supertest');
const app = require('../app.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('../_testCommon.js');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** POST /auth/token */

describe('POST /auth/token', function () {
	test('works', async function () {
		const resp = await request(app).post('/auth/token').send({ username: 'User', password: 'password' });
		expect(resp.body).toEqual({ token: expect.any(String) });
	});

	test('unauth with bad user', async function () {
		const resp = await request(app).post('/auth/token').send({ username: 'Nope', password: 'password' });
		expect(resp.statusCode).toEqual(401);
	});

	test('unauth with bad password', async function () {
		const resp = await request(app).post('/auth/token').send({ username: 'User', password: 'nope' });
		expect(resp.statusCode).toEqual(401);
	});
	test('bad request with missing data', async function () {
		const resp = await request(app).post('/auth/token').send({ username: 'User' });
		expect(resp.statusCode).toEqual(400);
	});
});

/** POST /auth/register */

describe('POST /auth/register', function () {
	test('works', async function () {
		const resp = await request(app).post('/auth/register').send({
			username: 'new',
			password: 'password',
		});
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({ token: expect.any(String) });
	});
	test('bad request with missing fields', async function () {
		const resp = await request(app).post('/auth/register').send({
			username: 'new',
		});
		expect(resp.statusCode).toEqual(400);
	});
});
