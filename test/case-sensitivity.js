'use strict';

const test = require('tape');
const createServer = require('./helpers/server');
const rested = require('..');


test('Case Sensitivity - Detection from Express/Router Settings', function (t) {
	t.test('Collection created by case-sensitive instance using subrouter is also case-sensitive', function (t) {
		const options = { caseSensitive: true };
		createServer(t, options, function (_server, _collection) {
			const server = _server;
			const collection = _collection;
			t.true(collection.getCaseSensitive(), 'Collection getCaseSensitive() is true');
			server.close(function () {
				t.end();
			});
		});
	});

	t.test('Collection created by case-insensitive instance using subrouter is also case-insensitive', function (t) {
		const options = { caseSensitive: false };
		createServer(t, options, function (_server, _collection) {
			const server = _server;
			const collection = _collection;
			t.false(collection.getCaseSensitive(), 'Collection getCaseSensitive() is false');
			server.close(function () {
				t.end();
			});
		});
	});

	t.test('Collection created by case-sensitive instance using base app is also case-sensitive', function (t) {
		const options = { caseSensitive: true, noSubRouter: true };
		createServer(t, options, function (_server, _collection) {
			const server = _server;
			const collection = _collection;
			t.true(collection.getCaseSensitive(), 'Collection getCaseSensitive() is true');
			server.close(function () {
				t.end();
			});
		});
	});

	t.test('Collection created by case-insensitive instance using base app is also case-insensitive', function (t) {
		const options = { caseSensitive: false, noSubRouter: true };
		createServer(t, options, function (_server, _collection) {
			const server = _server;
			const collection = _collection;
			t.false(collection.getCaseSensitive(), 'Collection getCaseSensitive() is false');
			server.close(function () {
				t.end();
			});
		});
	});
});


test('Case Sensitivity - Case Sensitive Mode', function (t) {
	let server, collection, http;

	const vb = {
		name: 'VB',
		rating: 1
	};
	const fourEcks = {
		name: 'XXXX',
		rating: 1
	};

	t.test('Setup case-sensitive REST server', function (t) {
		const options = { rights: true, caseSensitive: true };
		createServer(t, options, function (_server, _collection, _http) {
			server = _server;
			collection = _collection;
			http = _http;
			t.end();
		});
	});

	t.test('Case-sensitive POST: Single resource, ID & key both match createId() verbatim', function (t) {
		http.post(t, '/rest/beer', fourEcks, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			fourEcks.id = fourEcks.name;
			const expectedMap = { XXXX: fourEcks };
			t.deepEqual(collection.getMap(), expectedMap, 'XXXX in collection with verbatim createId() as ID & key');
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Case-insensitive POST: Differently-cased collection name yields 404 Not Found', function (t) {
		http.post(t, '/rest/BeEr', fourEcks, function (data, res) {
			t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			fourEcks.id = fourEcks.name;
			t.deepEqual(collection.getMap(), {}, 'Collection still empty');
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Case-sensitive POST: Identical resources with differently-cased IDs may coexist', function (t) {
		const lowercaseVb = Object.assign({}, vb);
		lowercaseVb.id = 'vb';

		t.test('Setup: Insert lowercase-id VB beer in collection', function (t) {
			collection.set(lowercaseVb.id, lowercaseVb, function () {
				t.deepEqual(collection.getMap(), { vb: lowercaseVb }, 'Lowercase-id VB in collection');
				t.end();
			});
		});

		t.test('POST uppercase-id VB, coexists with lowercase-id VB', function (t) {
			http.post(t, '/rest/beer', vb, function (data, res) {
				t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
				vb.id = 'VB';
				const expectedMap = {
					vb: lowercaseVb,
					VB: vb
				};
				t.deepEqual(collection.getMap(), expectedMap, 'Uppercase-id VB and lowercase-id VB both in collection');
				collection.delAll(function () {
					t.end();
				});
			});
		});
	});

	t.test('Case-sensitive GET & HEAD: Resource and path must have same case', function (t) {
		t.test('Setup: Insert XXXX beer in collection', function (t) {
			collection.set(fourEcks.id, fourEcks, function () {
				t.end();
			});
		});

		t.test('GET same-cased yields 200 OK, differently-cased yields 404 Not Found', function (t) {
			t.plan(5);

			http.get(t, '/rest/beer/XXXX', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, fourEcks, 'XXXX returned');
			});
			http.get(t, '/rest/beer/xxxx', function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			});
			http.get(t, '/rest/BEER/XXXX', function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			});
			http.get(t, '/rest/BEER/xxxx', function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			});
		});

		t.test('HEAD same-cased yields 200 OK, differently-cased yields 404 Not Found', function (t) {
			t.plan(6);

			http.head(t, '/rest/beer/XXXX', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(res.headers['content-type'], 'application/json', 'JSON response');
				t.equal(data, '', 'No response body');
			});
			http.head(t, '/rest/beer/xxxx', function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			});
			http.head(t, '/rest/BEER/XXXX', function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			});
			http.head(t, '/rest/BEER/xxxx', function (data, res) {
				t.equal(res.statusCode, 404, 'HTTP status 404 (Not Found)');
			});
		});

		t.test('Teardown: Clear collection', function (t) {
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Case-sensitive collection PUT', function (t) {
		t.test('Case-sensitive collection PUT: IDs & keys retain original case, existing IDs respected', function (t) {
			// Let's re-set the beers for this test to make it clear what's happening to their IDs during PUT.
			const vb = {
				id: 'arbitraryvbkey',
				name: 'VB',
				rating: 1
			};
			const fourEcks = {
				id: 'XXXX',
				name: 'XXXX',
				rating: 1
			};
			const boag = {
				name: `James Boag's Draught`,
				rating: 3
			};
			const cascade = {
				name: 'Cascade Pale Ale',
				rating: 5
			};
			const allBeers = {
				vb,
				fourEcks,
				boag,
				CASCADE: cascade
			};

			const expectedVb = Object.assign({}, vb);
			expectedVb.id = 'vb'; // Inner ID present: Final ID will be will be assigned from key in request object
			const expectedFourEcks = Object.assign({}, fourEcks);
			expectedFourEcks.id = 'fourEcks'; // Inner ID present: Final ID will be will be assigned from key in request object
			const expectedBoag = Object.assign({}, boag);
			expectedBoag.id = 'boag'; // No inner ID present: Final ID will be assigned from key
			const expectedCascade = Object.assign({}, cascade);
			expectedCascade.id = 'CASCADE'; // No inner ID present: Final ID will be assigned from key

			const expectedAllBeers = {
				vb: expectedVb,
				fourEcks: expectedFourEcks, // key case retained
				boag: expectedBoag,
				CASCADE: expectedCascade // key case retained
			};

			http.put(t, '/rest/beer', allBeers, function (data, res) {
				t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
				t.deepEqual(collection.getMap(), expectedAllBeers, 'Replaced entire collection');
				t.end();
			});
		});

		t.test('Teardown: Clear collection', function (t) {
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Teardown case-sensitive REST server', function (t) {
		server.close(function () {
			t.end();
		});
	});
});


test('Case Sensitivity - Case Insensitive Mode', function (t) {
	let server, collection, http;

	const vb = {
		name: 'VB',
		rating: 1
	};
	const fourEcks = {
		name: 'XXXX',
		rating: 1
	};

	t.test('Setup case-insensitive REST server', function (t) {
		const options = { rights: true, caseSensitive: false };
		createServer(t, options, function (_server, _collection, _http) {
			server = _server;
			collection = _collection;
			http = _http;
			t.end();
		});
	});

	t.test('Case-insensitive POST: Single resource, key from createId() lowercased', function (t) {
		http.post(t, '/rest/beer', fourEcks, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			fourEcks.id = fourEcks.name;
			const expectedMap = { xxxx: fourEcks };
			t.deepEqual(collection.getMap(), expectedMap, 'XXXX in collection with ID = name and key lowercased');
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Case-insensitive POST: Single resource created despite differently-cased collection name', function (t) {
		http.post(t, '/rest/BeEr', fourEcks, function (data, res) {
			t.equal(res.statusCode, 201, 'HTTP status 201 (Created)');
			fourEcks.id = fourEcks.name;
			const expectedMap = { xxxx: fourEcks };
			t.deepEqual(collection.getMap(), expectedMap, 'XXXX in collection');
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Case-insensitive POST: Identical resources with differently-cased IDs conflict', function (t) {
		const lowercaseVb = Object.assign({}, vb);
		lowercaseVb.id = 'vb';

		t.test('Setup: Insert lowercase-id VB beer in collection', function (t) {
			collection.set(lowercaseVb.id, lowercaseVb, function () {
				t.deepEqual(collection.getMap(), { vb: lowercaseVb }, 'Lowercase-id VB in collection');
				t.end();
			});
		});

		t.test('POST uppercase-id VB conflicts with lowercase-id VB, emits error', function (t) {
			let errors = 0;
			rested.on('error', function (error) {
				t.ok(error, 'Error emitted');
				errors += 1;
			});

			http.post(t, '/rest/beer', vb, function (data, res) {
				t.equal(res.statusCode, 500, 'HTTP status 500 (Internal Server Error)');
				const expectedMap = {
					vb: lowercaseVb
				};
				t.deepEqual(collection.getMap(), expectedMap, 'Only lowercase-id VB both in collection');
				t.equal(errors, 1, 'One error was emitted');
				rested.removeAllListeners();

				collection.delAll(function () {
					t.end();
				});
			});
		});
	});

	t.test('Case-insensitive GET & HEAD: Resource and path may be any case', function (t) {
		t.test('Setup: Insert XXXX beer in collection', function (t) {
			collection.set(fourEcks.id, fourEcks, function () {
				t.end();
			});
		});

		t.test('GET any combination of resource & path case yields 200 OK', function (t) {
			t.plan(8);
			http.get(t, '/rest/beer/XxXX', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, fourEcks, 'XXXX returned');
			});
			http.get(t, '/rest/beer/xxxx', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, fourEcks, 'XXXX returned');
			});
			http.get(t, '/REST/BEER/XXXX', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, fourEcks, 'XXXX returned');
			});
			http.get(t, '/rest/BEER/xxxx', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.deepEqual(data, fourEcks, 'XXXX returned');
			});
		});

		t.test('HEAD same-cased resource & path yields 200 OK', function (t) {
			t.plan(12);

			http.head(t, '/rest/beer/XXXX', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(res.headers['content-type'], 'application/json', 'JSON response');
				t.equal(data, '', 'No response body');
			});
			http.head(t, '/rest/beer/xxxx', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(res.headers['content-type'], 'application/json', 'JSON response');
				t.equal(data, '', 'No response body');
			});
			http.head(t, '/rest/BEER/XXXX', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(res.headers['content-type'], 'application/json', 'JSON response');
				t.equal(data, '', 'No response body');
			});
			http.head(t, '/rest/BEER/xxxx', function (data, res) {
				t.equal(res.statusCode, 200, 'HTTP status 200 (OK)');
				t.equal(res.headers['content-type'], 'application/json', 'JSON response');
				t.equal(data, '', 'No response body');
			});
		});

		t.test('Teardown: Clear collection', function (t) {
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Case-insensitive collection PUT', function (t) {
		t.test('Case-insensitive collection PUT: Keys lowercased, existing IDs respected', function (t) {
			// Let's re-set the beers for this test to make it clear what's happening to their IDs during PUT.
			const vb = {
				id: 'arbitraryvbkey',
				name: 'VB',
				rating: 1
			};
			const fourEcks = {
				id: 'XXXX',
				name: 'XXXX',
				rating: 1
			};
			const boag = {
				name: `James Boag's Draught`,
				rating: 3
			};
			const cascade = {
				name: 'Cascade Pale Ale',
				rating: 5
			};
			const allBeers = {
				vb,
				fourEcks,
				boag,
				CASCADE: cascade
			};

			const expectedVb = Object.assign({}, vb); // key will be assigned from ID
			expectedVb.id = 'vb'; // Inner ID present: Final ID will be will be assigned from key in request object
			const expectedFourEcks = Object.assign({}, fourEcks);
			expectedFourEcks.id = 'fourEcks'; // Inner ID present: Final ID will be will be assigned from key in request object
			const expectedBoag = Object.assign({}, boag);
			expectedBoag.id = 'boag'; // ID will be assigned from key
			const expectedCascade = Object.assign({}, cascade);
			expectedCascade.id = 'CASCADE'; // ID will be assigned from key (as passed in request)

			const expectedAllBeers = {
				vb: expectedVb,
				fourecks: expectedFourEcks, // key lowercased
				boag: expectedBoag,
				cascade: expectedCascade // key lowercased
			};

			http.put(t, '/rest/beer', allBeers, function (data, res) {
				t.equal(res.statusCode, 204, 'HTTP status 204 (No Content)');
				t.deepEqual(collection.getMap(), expectedAllBeers, 'Replaced entire collection');
				t.end();
			});
		});

		t.test('Teardown: Clear collection', function (t) {
			collection.delAll(function () {
				t.end();
			});
		});
	});

	t.test('Teardown case-insensitive REST server', function (t) {
		server.close(function () {
			t.end();
		});
	});
});
