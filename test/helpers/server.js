'use strict';

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const HttpClient = require('./HttpClient');
const Beer = require('./Beer');

module.exports = function (t, options, cb) {
	const path = '/beer';
	const app = express();
	// Use both app and router in case-insensitive mode by default (coalesce to false)
	app.set('case sensitive routing', options.caseSensitive || false);
	const router = new express.Router({ caseSensitive: options.caseSensitive || false });
	const rested = require('../..');

	if (options.autoParse) {
		app.use(bodyParser.json());
	}

	// By defult, use a subrouter under /rest
	// Option noSubRouter instead uses a base Express app under /
	let route;
	if (options.noSubRouter) {
		route = rested.route(app);
	} else {
		app.use('/rest', router);
		route = rested.route(router);
	}

	const collection = rested.createCollection(Beer);

	route(collection, path, options);

	const server = http.createServer(app);

	server.listen(0, function (error) {
		if (error) {
			t.fail(error);
			t.end();
			return;
		}

		const client = new HttpClient('http://localhost:' + server.address().port + '/rest');

		cb(server, collection, client, route);
	});
};
