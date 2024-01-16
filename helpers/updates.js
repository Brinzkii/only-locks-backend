const Game = require('../models/game');
const Team = require('../models/team');
const Player = require('../models/player');
const moment = require('moment');

class Update {
	/** Update game info, team game stats and player game stats
	 *
	 * Intended to run every 15 minutes for accurate up to date data
	 **/
	static async frequent() {
		console.log(`Updating games (${moment().format('LLL')}) ...`);

		await Game.updateRecent();

		console.log(`Finished updating games @ ${moment().format('LLL')}!`);

		console.log(`Updating team game stats (${moment().format('LLL')}) ...`);

		await Team.updateGameStats();

		console.log(`Finished updating team game stats @ ${moment().format('LLL')}!`);

		console.log(`Updating player game stats (${moment().format('LLL')}) ...`);

		await Player.adminUpdateGameStats();

		console.log(`Finished updating player game stats @ console.log${moment().format('LLL')}!`);

		// Run game updates again to make sure we have accurate as possible scores and clocks.
		console.log(`Updating games a second time (${moment().format('LLL')}) ...`);

		await Game.updateRecent();

		console.log(`Finished updating games a second time @ ${moment().format('LLL')}!`);

		return true;
	}

	/** Runs every hour starting at 8pm going until 2am to update status of
	 * picks
	 **/
	static async hourly() {
		console.log(`Updating player picks (${moment().format('LLL')}) ...`);

		await Player.updatePicks();

		console.log(`Finished updating player picks @ ${moment().format('LLL')}!`);

		console.log(`Updating games (${moment().format('LLL')}) ...`);

		await Team.updatePicks();

		console.log(`Finished updating team picks @ ${moment().format('LLL')}!`);

		return true;
	}

	/** Update team season stats and player season stats
	 *
	 * Intended to run every day @ 2:30am after games have finished
	 **/

	static async dailyStats() {
		console.log(`Updating team season stats (${moment().format('LLL')}) ...`);

		await Team.updateSeasonStats();

		console.log(`Finished updating team season stats @ ${moment().format('LLL')}!`);

		console.log(`Updating player season stats (${moment().format('LLL')}) ...`);

		await Player.updateSeasonStats();

		console.log(`Finished updating player season stats @ ${moment().format('LLL')}!`);

		console.log(`Updating conference and division standings (${moment().format('LLL')}) ...`);

		await Team.updateStandings();

		console.log(`Finished updating conference and division standings @ ${moment().format('LLL')}!`);

		return true;
	}

	/** Update player info for all players on each team
	 *
	 *  Intended to run every day at 8am to account for trades
	 */

	static async dailyPlayers() {
		console.log(`Updating player info (${moment().format('LLL')}) ...`);

		await Player.updateInfo();

		console.log(`Finished updating player info @ ${moment().format('LLL')}!`);
	}
}

module.exports = Update;
