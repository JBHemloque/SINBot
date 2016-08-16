// Test the rss parser

var rss = require('./rss.js');

var config = {feeds: [{url: 'https://coloniagazette.wordpress.com/?feed=rss', channel: 'bar'}]};

rss.setup(config);