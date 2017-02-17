// Test the rss parser

var rss = require('./rss.js');

var config = {feeds: [{url: 'https://eliteccn.com/colonia-news/feed/', server: '212411687926497280', channel: '#general'}]};

rss.setup(config);