const axios = require('axios');
const db = require('./db');
const API_KEY = require('./secrets');

const BASE_URL = 'https://v2.nba.api-sports.io/';
const headers = {
	'x-rapidapi-key': API_KEY || process.env.API_KEY,
	'x-rapidapi-host': 'v2.nba.api-sports.io',
};
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function getTeams() {
	try {
		let URL = BASE_URL + 'teams?league=standard';
		const response = await axios.get(URL, { headers });
		let teams = response.data.response;
		for (let team of teams) {
			// Add only NBA teams to DB and filter out weird data
			if (team.nbaFranchise === true && team.id != 37) {
				db.query(
					'INSERT INTO teams (id, code, nickname, name, city, logo, conference, division) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
					[
						team.id,
						team.code,
						team.nickname,
						team.name,
						team.city,
						team.logo,
						team.leagues.standard.conference,
						team.leagues.standard.division,
					]
				);
			}
		}
	} catch (err) {
		console.error(err);
	}
}

async function getPlayers() {
	try {
		const response = await db.query('SELECT id FROM teams');
		const teams = response.rows;
		console.log(`TEAMS: ${teams}`);
		for (let team of teams) {
			let URL = BASE_URL + `players?team=${team.id}&season=2023`;
			const response = await axios.get(URL, { headers });
			let players = response.data.response;
			for (let player of players) {
				let height;
				let weight;
				if (player.height.feets === null) {
					height = 'Unknown';
				} else if (player.height.feets && (player.height.inches === null || player.height.inces == 0)) {
					height = player.height.feets + `'0"`;
				} else {
					height = player.height.feets + "'" + player.height.inches + '"';
				}
				if (player.weight.pounds === null) {
					weight = 'Unknown';
				} else {
					weight = player.weight.pounds + ' lbs.';
				}
				// check database for player (duplicates occur due to trades)
				const isDuplicate = await db.query(`SELECT id FROM players WHERE id = $1`, [player.id]);
				if (isDuplicate.rows.length > 0) {
					console.log(`------- DUPLICATE: ${player.id} -------`);
				} else {
					db.query(
						'INSERT INTO players (id, first_name, last_name, birthday, height, weight, college, number, position, team_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
						[
							player.id,
							player.firstname,
							player.lastname,
							player.birth.date,
							height,
							weight,
							player.college,
							player.leagues.standard.jersey,
							player.leagues.standard.pos,
							team.id,
						]
					);
				}
			}
		}
	} catch (err) {
		console.error(err);
	}
}

async function getGames() {
	try {
		let URL = BASE_URL + 'games?league=standard&season=2023';
		const response = await axios.get(URL, { headers });
		let games = response.data.response;
		for (let game of games) {
			// check if score exists and save in string format
			let score = null;
			if (game.scores.home.points && game.scores.visitors.points) {
				score = `${game.scores.home.points} - ${game.scores.visitors.points}`;
			}

			// check if both teams are in NBA before adding game to db
			let isNba = await db.query('SELECT * FROM teams WHERE id=$1 OR id=$2', [
				game.teams.home.id,
				game.teams.visitors.id,
			]);
			if (isNba.rows.length === 2) {
				db.query(
					'INSERT INTO games (id, date, location, home_team, away_team, clock, score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
					[
						game.id,
						game.date.start.slice(0, 10),
						game.arena.name + ` (${game.arena.city})`,
						game.teams.home.id,
						game.teams.visitors.id,
						game.status.clock,
						score,
					]
				);

				console.log(`Game(${game.id}) has been added!`);
			}
		}
	} catch (err) {
		console.error(err);
	}
}

async function getTeamStats() {
	try {
		const response = await db.query('SELECT id FROM teams');
		let teams = response.rows;
		for (let team of teams) {
			await delay(250);
			let URL = BASE_URL + `teams/statistics?id=${team.id}&season=2023`;
			const response = await axios.get(URL, { headers });
			let teamStats = response.data.response;
			for (let ts of teamStats) {
				db.query(
					'INSERT INTO team_stats (team_id, games, fast_break_points, points_in_paint, second_chance_points, points_off_turnovers, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)',
					[
						team.id,
						ts.games,
						ts.fastBreakPoints,
						ts.pointsInPaint,
						ts.secondChancePoints,
						ts.pointsOffTurnovers,
						ts.points,
						ts.fgm,
						ts.fga,
						+ts.fgp,
						ts.ftm,
						ts.fta,
						+ts.ftp,
						ts.tpm,
						ts.tpa,
						+ts.tpp,
						ts.offReb,
						ts.defReb,
						ts.assists,
						ts.pFouls,
						ts.steals,
						ts.turnovers,
						ts.blocks,
						ts.plusMinus,
					]
				);

				console.log(`Added stats for ${team.name}`);
			}
		}
	} catch (err) {
		console.error(err);
	}
}

async function getGameStats() {
	try {
		// Get all players currently in DB
		const response = await db.query('SELECT id FROM players ORDER BY last_name');
		let players = response.rows;
		// Request each players stats - this returns all games and their stats for the season
		for (let player of players) {
			await delay(250);
			let URL = BASE_URL + `players/statistics?id=${player.id}&season=2023`;
			const response = await axios.get(URL, { headers });
			let playerStats = response.data.response;
			for (let ps of playerStats) {
				// Only add stats if game is in DB
				const validGame = await db.query('SELECT id FROM games WHERE id = $1', [ps.game.id]);
				if (validGame.rows.length) {
					db.query(
						'INSERT INTO game_stats (player_id, game_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)',
						[
							ps.player.id,
							ps.game.id,
							+ps.min || 0,
							ps.points || 0,
							ps.fgm || 0,
							ps.fga || 0,
							+ps.fgp || 0,
							ps.ftm || 0,
							ps.fta || 0,
							+ps.ftp || 0,
							ps.tpm || 0,
							ps.tpa || 0,
							+ps.tpp || 0,
							ps.offReb || 0,
							ps.defReb || 0,
							ps.assists || 0,
							ps.pFouls || 0,
							ps.steals || 0,
							ps.turnovers || 0,
							ps.blocks || 0,
							+ps.plusMinus || 0,
						]
					);

					console.log(
						`Added stats for ${ps.player.lastname}, ${ps.player.firstname} from Game: ${ps.game.id}`
					);
				}
			}
		}
		console.log('All player stats added!');
	} catch (err) {
		console.error(err);
	}
}

async function populateSeasonStats() {
	try {
		// Get all players currently in DB
		const response = await db.query(
			'SELECT id, first_name AS firstname, last_name AS lastname FROM players ORDER BY last_name'
		);
		let players = response.rows;
		for (let player of players) {
			// Find all instances of game stats and sum up before adding to season_stats
			const response = await db.query(
				`SELECT SUM(minutes) AS minutes, SUM(points) AS points, SUM(fgm) AS fgm, SUM(fga) AS fga, AVG(NULLIF(fgp, 0)) AS fgp, SUM(ftm) AS ftm, SUM(fta) AS fta, AVG(NULLIF(ftp, 0)) AS ftp, SUM(tpm) AS tpm, SUM(tpa) AS tpa, AVG(NULLIF(tpp, 0)) AS tpp, SUM(off_reb) AS offReb, SUM(def_reb) AS defReb, SUM(off_reb + def_reb) AS totalReb, SUM(assists) AS assists, SUM(fouls) AS fouls, SUM(steals) AS steals, SUM(turnovers) AS turnovers, SUM(blocks) AS blocks, SUM(plus_minus) AS plusMinus
				FROM game_stats
				WHERE player_id = $1`,
				[player.id]
			);
			const stats = response.rows[0];
			db.query(
				`INSERT INTO season_stats (player_id, minutes, points, fgm, fga, fgp, ftm, fta, ftp, tpm, tpa, tpp, off_reb, def_reb, total_reb, assists, fouls, steals, turnovers, blocks, plus_minus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
				[
					player.id,
					stats.minutes || 0,
					stats.points || 0,
					stats.fgm || 0,
					stats.fga || 0,
					stats.fgp || 0,
					stats.ftm || 0,
					stats.fta || 0,
					stats.ftp || 0,
					stats.tpm || 0,
					stats.tpa || 0,
					stats.tpp || 0,
					stats.offreb || 0,
					stats.defreb || 0,
					stats.totalreb || 0,
					stats.assists || 0,
					stats.fouls || 0,
					stats.steals || 0,
					stats.turnovers || 0,
					stats.blocks || 0,
					stats.plusminus || 0,
				]
			);
			console.log(`Season stats populated for ${player.lastname}, ${player.firstname}`);
		}
		console.log(`Seasons stats for all players added!`);
	} catch (err) {
		console.error(err);
	}
}

populateSeasonStats();

