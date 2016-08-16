// Test the rss parser

var rss = require('./rss.js');

var config = {feeds: [{url: 'https://coloniagazette.wordpress.com/?feed=rss', server: '212411687926497280', channel: '#general'}]};

rss.setup(config);