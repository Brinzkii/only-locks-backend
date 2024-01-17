'use strict';
/** Database setup for Only Locks */
const { Client } = require('pg');
const dotenv = require('dotenv');
const { getDatabaseUri } = require('./config');
dotenv.config();
let db;

let ssl = null;

if (process.env.NODE_ENV === 'production') {
	ssl = {
		rejectUnauthorized: false,
	};
}

if (process.env.CONNECTION_STRING) {
	console.log(process.env.CONNECTION_STRING);
	db = new Client({
		connectionString: process.env.CONNECTION_STRING,
	});
} else {
	const { USER, HOST, PASSWORD, PORT } = process.env;

	db = new Client({
		user: USER,
		host: HOST,
		database: getDatabaseUri(),
		password: 'password',
		port: PORT,
		ssl: ssl,
	});
}

db.connect();

module.exports = db;
