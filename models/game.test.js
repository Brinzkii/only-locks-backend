const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError.js');
const db = require('../db.js');
const Game = require('./game.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('../_testCommon.js');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** Get game details */

describe('get game', function () {
	test('works', async function () {
		const game = await Game.get(1);
		expect(game instanceof Object).toBeTruthy();
		expect(game.winner).toEqual(1);
		expect(game.status).toEqual('finished');
	});

	test('not found if bad game', async function () {
		try {
			await Game.get(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Get all games */

describe('get all games', function () {
	test('works', async function () {
		const games = await Game.getAll();
		expect(games.length).toEqual(2);
	});
});

/** Get stats */

describe('get stats', function () {
	test('works', async function () {
		const stats = await Game.getStats(1);
		expect(stats.home instanceof Object).toBeTruthy();
		expect(stats.away instanceof Object).toBeTruthy();
		expect(stats.home.points).toEqual(100);
		expect(stats.away.points).toEqual(90);
	});

	test('not found if bad game', async function () {
		try {
			await Game.getStats(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Filter games */

describe('filter games', function () {
	test('works by date', async function () {
		const game = await Game.filter(null, '20240102');
		expect(game.length).toEqual(1);
		expect(game[0].winner).toEqual(1);
		expect(game[0].score).toEqual('100 - 90');
	});

	test('works by team', async function () {
		const games = await Game.filter(1);
		expect(games.length).toEqual(2);
	});

	test('bad request if no team or date used', async function () {
		try {
			await Game.filter();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/** Head to head */

describe('head to head', function () {
	test('works', async function () {
		const h2h = await Game.h2h(1, 2);
		expect(h2h.games.length).toEqual(2);
		expect(Object.keys(h2h.totals)).toContain('BOS');
		expect(Object.keys(h2h.totals)).toContain('NYK');
	});

	test('bad request if dup team', async function () {
		try {
			await Game.h2h(1, 1);
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('not found if no games between valid teams', async function () {
		try {
			await Game.h2h(1, 3);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
