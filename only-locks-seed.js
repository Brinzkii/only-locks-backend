const axios = require('axios');
const db = require('./db');

const BASE_URL = 'https://v2.nba.api-sports.io/';
const headers = {
	'x-rapidapi-key': 'c9ad8c5298160b466f4320b236e3eae3',
	'x-rapidapi-host': 'v2.nba.api-sports.io',
};

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

