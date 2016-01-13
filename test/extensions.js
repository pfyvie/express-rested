'use strict';

const test = require('tape');
const createServer = require('./helpers/server');


test('Extensions', function (t) {
	const options = { rights: true };

	let server, collection, http;

	t.test('Start REST server', function (t) {
		createServer(t, options, function (_server, _collection, _http) {
			server = _server;
			collection = _collection;
			http = _http;
			t.end();
		});
	});

	const heineken = {
		name: 'Heineken',
		rating: 1
	};

	t.test('Supported extension', function (t) {
		t.test('PUT /rest/beer/Heineken.txt (non existing resource)', function (t) {
			http.put(t, '/rest/beer/Heineken.txt', { hello: 'world' }, function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
				t.end();
			});
		});

		t.test('PUT /rest/beer/Heineken.txt', function (t) {
			collection.loadOne('Heineken', heineken);

			http.put(t, '/rest/beer/Heineken.txt', { hello: 'world' }, function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(data, 'PUT .txt', 'Response body as expected');
				t.end();
			});
		});

		t.test('GET /rest/beer/Heineken.txt', function (t) {
			http.get(t, '/rest/beer/Heineken.txt', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(data, 'GET .txt', 'Response body as expected');
				t.end();
			});
		});

		t.test('PATCH /rest/beer/Heineken.txt', function (t) {
			http.patch(t, '/rest/beer/Heineken.txt', { hello: 'world' }, function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(data, 'PATCH .txt', 'Response body as expected');
				t.end();
			});
		});

		t.test('DELETE /rest/beer/Heineken.txt', function (t) {
			http.delete(t, '/rest/beer/Heineken.txt', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(data, 'DELETE .txt', 'Response body as expected');
				t.end();
			});
		});

		t.end();
	});

	t.test('Unsupported extension', function (t) {
		t.test('PUT /rest/beer/Heineken.jpg', function (t) {
			http.put(t, '/rest/beer/Heineken.jpg', { hello: 'world' }, function (data, res) {
				t.equal(res.statusCode, 415, 'HTTP status 415 (Unsupported Media Type)');
				t.end();
			});
		});

		t.test('GET /rest/beer/Heineken.jpg', function (t) {
			http.get(t, '/rest/beer/Heineken.jpg', function (data, res) {
				t.equal(res.statusCode, 415, 'HTTP status 415 (Unsupported Media Type)');
				t.end();
			});
		});

		t.test('PATCH /rest/beer/Heineken.jpg', function (t) {
			http.patch(t, '/rest/beer/Heineken.jpg', { hello: 'world' }, function (data, res) {
				t.equal(res.statusCode, 415, 'HTTP status 415 (Unsupported Media Type)');
				t.end();
			});
		});

		t.test('DELETE /rest/beer/Heineken.jpg', function (t) {
			http.delete(t, '/rest/beer/Heineken.jpg', function (data, res) {
				t.equal(res.statusCode, 415, 'HTTP status 415 (Unsupported Media Type)');
				t.end();
			});
		});

		t.end();
	});

	t.test('Overridden JSON handling', function (t) {
		const body = { hello: 'world' };
		collection.loadOne('Heineken', heineken);
		const obj = collection.get('Heineken');

		obj.getJson = function (req, res) {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(body));
		};

		http.get(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.deepEqual(data, body, 'Response body as expected');
			delete obj.getJson;
			t.end();
		});
	});

	t.test('Close REST server', function (t) {
		server.close(function () {
			t.end();
		});
	});
});