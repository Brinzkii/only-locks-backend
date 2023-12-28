const axios = require('axios');
const db = require('./db');

const BASE_URL = 'https://v2.nba.api-sports.io/';
const headers = {
	'x-rapidapi-key': 'c9ad8c5298160b466f4320b236e3eae3',
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
			console.log(`TEAM_ID: ${team.id}`);
			let URL = BASE_URL + `players?team=${team.id}&season=2023`;
			const response = await axios.get(URL, { headers });
			let players = response.data.response;
			console.log(`PLAYERS: ${players}`);
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
		const response = await db.query('SELECT id from teams');
		let teams = response.rows;
		let count = 0;
		for (let team of teams) {
			count++;
			if (count % 10 === 0) await delay(45000);
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
						ts.fgp,
						ts.ftm,
						ts.fta,
						ts.ftp,
						ts.tpm,
						ts.tpa,
						ts.tpp,
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

getTeamStats();

