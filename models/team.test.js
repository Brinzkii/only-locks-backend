const { NotFoundError, BadRequestError, UnauthorizedError } = require('../expressError.js');
const db = require('../db.js');
const Team = require('./team.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('../_testCommon.js');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** Get */

describe('get team', function () {
	test('works', async function () {
		const team = await Team.get(1);
		expect(team instanceof Object).toBeTruthy();
		expect(team.id).toEqual(1);
		expect(team.code).toEqual('BOS');
	});

	test('not found if bad team', async function () {
		try {
			await Team.get(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Get all teams */

describe('get all', function () {
	test('works', async function () {
		const teams = await Team.getAll();
		expect(teams.length).toEqual(3);
	});
});

/** Get standings */

describe('get standings', function () {
	test('works', async function () {
		const standings = await Team.getStandings();
		expect(standings.east.length).toEqual(3);
		expect(standings.west.length).toEqual(0);
	});
});

/** Get players on team */

describe('get players', function () {
	test('works', async function () {
		const players = await Team.players(1);
		expect(players.length).toEqual(1);
		expect(players[0].name).toEqual('Tatum, Jayson');
	});

	test('not found if bad team', async function () {
		try {
			await Team.players(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Get team games */

describe('get team games', function () {
	test('works', async function () {
		const games = await Team.games(1);
		expect(games.length).toEqual(2);
	});

	test('not found if bad team', async function () {
		try {
			await Team.games(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Get team stats */

describe('get team stats', function () {
	test('works', async function () {
		const stats = await Team.stats(1);
		expect(stats.name).toEqual('Boston Celtics');
		expect(stats.wins).toEqual(25);
		expect(stats.totalReb).toEqual(stats.offReb + stats.defReb);
	});

	test('not found if bad team', async function () {
		try {
			await Team.stats(100);
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

/** Get all team stats */

describe('get all team stats', function () {
	test('works', async function () {
		const stats = await Team.allStats();
		expect(stats.length).toEqual(3);
		expect(stats[0].name).toEqual('Boston Celtics');
		expect(stats[1].name).toEqual('New York Knicks');
		expect(stats[2].name).toEqual('Atlanta Hawks');
	});
});

/** Sort teams by stats */

describe('sort teams by stats', function () {
	test('works', async function () {
		let stats = await Team.sortByStats();
		expect(stats.totals[0].wins).toBeGreaterThan(stats.totals[1].wins);
		expect(stats.totals[1].wins).toBeGreaterThan(stats.totals[2].wins);

		stats = await Team.sortByStats('points');
		expect(stats.totals[0].points).toBeGreaterThan(stats.totals[1].points);
		expect(stats.totals[1].points).toBeGreaterThan(stats.totals[2].points);
	});

	test('bad request if bad sort method', async function () {
		try {
			await Team.sortByStats('nope');
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	test('bad request if bad sort order', async function () {
		try {
			await Team.sortByStats('points', 'nope');
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});
