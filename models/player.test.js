const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError.js');
const db = require('../db.js');
const Player = require('./player.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('../_testCommon.js');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** Get */

describe('get', function () {
	test('works', async function () {
		const player = await Player.get(1);
		expect(player.id).toEqual(1);
		expect(player.name).toEqual('Tatum, Jayson');
		expect(player.team.name).toEqual('Boston Celtics');
	});

	test('not found if bad player', async function () {
		try {
			await Player.get(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Get all players */

describe('get all', function () {
	test('works', async function () {
		const players = await Player.getAll();
		expect(players.length).toEqual(2);
		expect(players[0].name).toEqual('Tatum, Jayson');
		expect(players[1].name).toEqual('Randle, Julius');
	});
});

/** Season stats */

describe('season stats', function () {
	test('works', async function () {
		const stats = await Player.sortByStats(undefined, undefined, undefined, 'season', 'points', 'desc');
		console.log(stats);
		expect(Object.keys(stats)).toContain('totals');
		expect(Object.keys(stats)).toContain('per36');
		expect(Object.keys(stats)).toContain('perGame');
		expect(stats.totals.length).toEqual(2);
		expect(stats.totals[0].points).toBeGreaterThan(stats.totals[1].points);
	});

	test('bad request if bad stat category', async function () {
		try {
			await Player.sortByStats(undefined, undefined, undefined, 'season', 'nope', 'desc');
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('bad request if bad sort order', async function () {
		try {
			await Player.sortByStats(undefined, undefined, undefined, 'season', 'points', 'nope');
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});
