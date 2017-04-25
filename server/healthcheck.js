'use strict';

var http = require("http");
var config = require('../config.js');

var PORT = config.HEALTHCHECK_PORT || 8081;

exports.startHealthCheck = function(client) {
	http.createServer(function (request, response) {
		// Send the HTTP header 
		// HTTP Status: 200 : OK
		// Content Type: text/plain
		response.writeHead(200, {'Content-Type': 'text/plain'});

		// Send the response body as "Hello World"
		response.end('Up!\n');
	}).listen(PORT);

	// Console will print the message
	console.log('Healthcheck server running at http://127.0.0.1:' + PORT);
}
