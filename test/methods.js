'use strict';

const test = require('tape');
const createServer = require('./helpers/server');
const basename = require('path').basename;
const rested = require('..');


test('Methods', function (t) {
	const options = { rights: true };

	let server, collection, http, Beer;

	t.test('Start REST server (without body parser)', function (t) {
		createServer(t, options, function (_server, _collection, _http) {
			server = _server;
			collection = _collection;
			Beer = collection.Class;
			http = _http;
			t.end();
		});
	});

	const crazyId = '!"#$%&\'()=-^~¥|/\\';
	const crazyIdEnc = encodeURIComponent(crazyId);

	const heineken = {
		name: 'Heineken',
		rating: 1
	};

	const suntory = {
		name: 'Suntory Premium',
		rating: 4
	};

	const rochefort = {
		name: 'Rochefort',
		rating: 5
	};

	const demolen = {
		id: 'DeMolen',
		name: 'De Molen - Hop en Liefde',
		rating: 5
	};

	const all = {
		Heineken: heineken,
		SuntoryPremium: suntory,
		Rochefort: rochefort,
		DeMolen: demolen
	};

	const enMatchers = {
		DeMolen: demolen,
		Heineken: heineken
	};

	const allButSuntory = {
		Heineken: heineken,
		Rochefort: rochefort,
		DeMolen: demolen
	};

	const allButDeMolen = {
		Heineken: heineken,
		SuntoryPremium: suntory,
		Rochefort: rochefort
	};

	t.test('POST /rest/beer (no data)', function (t) {
		http.post(t, '/rest/beer', '', function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('POST /rest/beer (no createId method)', function (t) {
		const old = Beer.prototype.createId;
		Beer.prototype.createId = undefined;

		http.post(t, '/rest/beer', heineken, function (data, res) {
			t.equal(res.statusCode, 405, 'HTTP status 405 (Method Not Allowed)');
			t.equal(res.headers.allow, 'GET, HEAD, PUT, PATCH, DELETE');
			Beer.prototype.createId = old;
			t.end();
		});
	});

	t.test('POST /rest/beer (save failure)', function (t) {
		collection.persist(function () {
			throw new Error('Oh noes (POST save failure)!');
		});

		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});

		http.post(t, '/rest/beer', heineken, function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error was emitted');

			collection.unpersist();
			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('POST /rest/beer (text/plain)', function (t) {
		http.overrideHeader('content-type', 'text/plain');

		http.post(t, '/rest/beer', heineken, function (data, res) {
			http.overrideHeader('content-type');
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('POST /rest/beer (unknown media type)', function (t) {
		http.overrideHeader('content-type', 'foo/bar');

		http.post(t, '/rest/beer', heineken, function (data, res) {
			http.overrideHeader('content-type');
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('POST /rest/beer (bad content)', function (t) {
		http.post(t, '/rest/beer', new Buffer('foobar'), function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('POST /rest/beer (no content)', function (t) {
		http.post(t, '/rest/beer', new Buffer(0), function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('POST /rest/beer?foo=bar (Heineken)', function (t) {
		http.post(t, '/rest/beer?foo=bar', heineken, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			t.equal(res.headers.location, '/rest/beer/Heineken', 'Location header is correct');

			heineken.id = 'Heineken';

			t.deepEqual(heineken, collection.get('Heineken'), 'Heineken in collection');

			// now retrieve it
			http.get(t, res.headers.location, function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, heineken, 'Heineken retrieved by following Location header');
				t.end();
			});
		});
	});

	t.test('POST /rest/beer (Heineken, again)', function (t) {
		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});

		http.post(t, '/rest/beer', heineken, function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error emitted');

			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('POST /rest/beer (Rochefort)', function (t) {
		http.post(t, '/rest/beer', rochefort, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			t.ok(res.headers.location, 'Location header returned');

			const id = basename(res.headers.location);
			rochefort.id = id;

			t.equal(res.headers.location, '/rest/beer/' + id, 'Location header points to a beer');
			t.deepEqual(rochefort, collection.get(id), 'Rochefort in collection');
			t.end();
		});
	});

	t.test('GET /rest/beer/Heineken', function (t) {
		http.get(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.equal(res.headers['content-type'], 'application/json', 'JSON response');
			t.deepEqual(data, heineken, 'Heineken returned');
			t.deepEqual(data, collection.get('Heineken'), 'Heineken in collection');
			t.end();
		});
	});

	t.test('GET /rest/beer/Heineken.json', function (t) {
		http.get(t, '/rest/beer/Heineken.json', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.equal(res.headers['content-type'], 'application/json', 'JSON response');
			t.deepEqual(data, heineken, 'Heineken returned');
			t.end();
		});
	});

	t.test('HEAD /rest/beer/Heineken', function (t) {
		http.head(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.equal(res.headers['content-type'], 'application/json', 'JSON response');
			t.equal(data, '', 'No response body');
			t.end();
		});
	});

	t.test('PUT /rest/beer/SuntoryPremium (no data)', function (t) {
		http.put(t, '/rest/beer/SuntoryPremium', '', function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('PUT /rest/beer/SuntoryPremium (save failure)', function (t) {
		collection.persist(function (ids, cb) {
			cb(new Error('Oh noes (PUT save failure)!'));
		});

		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});

		http.put(t, '/rest/beer/SuntoryPremium', suntory, function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error emitted');

			collection.unpersist();
			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('PUT /rest/beer/' + crazyIdEnc, function (t) {
		http.put(t, '/rest/beer/' + crazyIdEnc, suntory, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			t.ok(res.headers.location, 'Location header returned');

			const id = decodeURIComponent(basename(res.headers.location));
			t.equal(id, crazyId, 'Crazy ID is correctly returned');

			suntory.id = id;

			http.get(t, '/rest/beer/' + crazyIdEnc, function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, suntory, 'Returned resource is suntory');

				http.delete(t, '/rest/beer/' + crazyIdEnc, function (data, res) {
					t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');

					delete suntory.id;
					t.end();
				});
			});
		});
	});

	t.test('PUT /rest/beer/SuntoryPremium', function (t) {
		http.put(t, '/rest/beer/SuntoryPremium', suntory, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			t.ok(res.headers.location, 'Location header returned');

			const id = basename(res.headers.location);
			suntory.id = id;

			t.equal(res.headers.location, '/rest/beer/' + id, 'Location header points to a beer');
			t.deepEqual(suntory, collection.get(id), 'Suntory in collection');
			t.end();
		});
	});

	t.test('PUT /rest/beer/SuntoryPremium (update, no data)', function (t) {
		http.put(t, '/rest/beer/SuntoryPremium', '', function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('PUT /rest/beer/SuntoryPremium (update)', function (t) {
		suntory.rating = 4.5;

		http.put(t, '/rest/beer/SuntoryPremium', suntory, function (data, res) {
			t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
			t.ok(res.headers.location, 'Location header returned');
			t.equal(res.headers.location, '/rest/beer/' + suntory.id, 'Location header points to a beer');
			t.deepEqual(suntory, collection.get(suntory.id), 'Suntory in collection');
			t.end();
		});
	});

	t.test('PATCH /rest/beer/Heineken (no data)', function (t) {
		http.patch(t, '/rest/beer/Heineken', '', function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('PATCH /rest/beer/Heineken (save failure)', function (t) {
		collection.persist(function (ids, cb) {
			cb(new Error('Oh noes (PATCH save failure)!'));
		});

		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});

		http.patch(t, '/rest/beer/Heineken', heineken, function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error emitted');

			collection.unpersist();
			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('PATCH /rest/beer/FooBar', function (t) {
		const patch = {
			rating: 2
		};

		http.patch(t, '/rest/beer/FooBar', patch, function (data, res) {
			t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			t.end();
		});
	});

	t.test('PATCH /rest/beer/Heineken', function (t) {
		const patch = {
			rating: 2
		};

		http.patch(t, '/rest/beer/Heineken', patch, function (data, res) {
			t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
			heineken.rating = patch.rating;
			t.deepEqual(collection.get('Heineken'), heineken, 'Heineken with new ranking in collection');
			t.end();
		});
	});

	t.test('GET /rest/beer', function (t) {
		http.get(t, '/rest/beer', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.deepEqual(data, allButDeMolen, 'All beers but De Molen returned');
			t.end();
		});
	});

	t.test('GET /rest/beer/ (trailing slash)', function (t) {
		http.get(t, '/rest/beer/', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.deepEqual(data, allButDeMolen, 'All beers but De Molen returned');
			t.end();
		});
	});

	t.test('PUT /rest/beer (no data for collection)', function (t) {
		http.put(t, '/rest/beer', '', function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('PUT /rest/beer (no data for resource)', function (t) {
		http.put(t, '/rest/beer', { foobar: '' }, function (data, res) {
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('PUT /rest/beer', function (t) {
		http.put(t, '/rest/beer', all, function (data, res) {
			t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
			t.deepEqual(collection.getMap(), all, 'Replaced entire collection');
			t.end();
		});
	});

	t.test('GET /rest/beer?name=en (search)', function (t) {
		http.get(t, '/rest/beer?name=en', function (data, res) {
			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.deepEqual(data, enMatchers, 'Heineken and De Molen returned');
			t.end();
		});
	});

	t.test('GET /rest/beer.txt?name=en (search)', function (t) {
		http.get(t, '/rest/beer.txt?name=en', function (data, res) {
			heineken.id = 'Heineken';
			const expectedData = [demolen, heineken];

			t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
			t.deepEqual(data.split('\n').map(JSON.parse), expectedData, 'Heineken and De Molen returned');
			t.end();
		});
	});


	t.test('PUT /rest/beer', function (t) {
		http.put(t, '/rest/beer', allButSuntory, function (data, res) {
			t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
			t.deepEqual(collection.getMap(), allButSuntory, 'Replaced entire collection (Suntory is out)');
			t.end();
		});
	});

	t.test('PUT /rest/beer (no data for one resource)', function (t) {
		const heineken = allButSuntory.Heineken;
		allButSuntory.Heineken = '';

		http.put(t, '/rest/beer', allButSuntory, function (data, res) {
			allButSuntory.Heineken = heineken;
			t.equal(res.statusCode, 400, 'HTTP status 400 (Bad Request)');
			t.end();
		});
	});

	t.test('PUT /rest/beer (save failure)', function (t) {
		collection.persist(function (ids, cb) {
			cb(new Error('Oh noes (PUT save failure)!'));
		});

		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});

		http.put(t, '/rest/beer', allButSuntory, function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error emitted');

			collection.unpersist();
			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('DELETE /rest/beer/Heineken (save failure)', function (t) {
		collection.persist(function (ids, cb) {
			cb(new Error('Oh noes (DELETE save failure)!'));
		});

		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});


		http.delete(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error emitted');

			collection.unpersist();
			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('DELETE /rest/beer/Heineken', function (t) {
		let deletedName;
		Beer.prototype.deleted = function () {
			deletedName = this.name;
		};

		http.delete(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
			t.deepEqual([demolen.id, rochefort.id], collection.getIds().sort(), 'Heineken is out');
			t.equals(deletedName, 'Heineken', 'Heineken deleted() called');
			t.end();
		});
	});

	t.test('DELETE /rest/beer/Heineken (again)', function (t) {
		http.delete(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			t.end();
		});
	});

	t.test('GET /rest/beer/Heineken', function (t) {
		http.get(t, '/rest/beer/Heineken', function (data, res) {
			t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			t.end();
		});
	});

	t.test('DELETE /rest/beer (save failure)', function (t) {
		collection.persist(function (ids, cb) {
			cb(new Error('Oh noes (DELETE save failure)!'));
		});

		let errors = 0;

		rested.on('error', function (error) {
			t.ok(error, 'Error emitted');
			errors += 1;
		});

		http.delete(t, '/rest/beer', function (data, res) {
			t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
			t.equal(errors, 1, 'One error emitted');

			collection.unpersist();
			rested.removeAllListeners();

			t.end();
		});
	});

	t.test('DELETE /rest/beer', function (t) {
		const beerCount = collection.getIds().length;
		let deleteCount = 0;
		Beer.prototype.deleted = () => {
			deleteCount += 1;
			throw new Error('This should not break anything');
		};

		http.delete(t, '/rest/beer', function (data, res) {
			t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
			t.deepEqual([], collection.getIds(), 'All beers are gone');
			t.equal(deleteCount, beerCount, 'All beers deleted() called');
			t.end();
		});
	});

	t.test('Close REST server', function (t) {
		server.close(function () {
			t.end();
		});
	});
});
