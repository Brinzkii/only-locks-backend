'use strict';

const app = require('./app');
const { API_PORT } = require('./config');

app.listen(API_PORT, function () {
	console.log(`Started on http://localhost:${API_PORT}`);
});
