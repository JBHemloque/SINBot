'use strict';

var fs = require('fs')
   ,Trello = require('trello-events');

var cfg, trello, discord, handlers;

module.exports = function(config){
	this.config = cfg = config;
	discord = config.discord;

	cfg.trello.boardChannels = {};
	for (var i = 0; i < cfg.trello.boards.length; i++){
		switch(typeof cfg.trello.boards[i]){
			case 'string':
				cfg.trello.boardChannels[cfg.trello.boards[i]] = cfg.trello.boards[i].channel;
				break;
			case 'object':
				cfg.trello.boardChannels[cfg.trello.boards[i].id] = cfg.trello.boards[i].channel;
				cfg.trello.boards[i] = cfg.trello.boards[i].id;
				break;
			default:
				throw 'Unexpected boards array member type (' + typeof cfg.trello.boards[i] + ')';
		}
	}

	var allEvents = false;
	if (!cfg.trello.hasOwnProperty('events')){
		allEvents = true;
	}

	function wantsEvent( evt ){
		if (!cfg.trello.hasOwnProperty('events')){
			return false;
		}
		return cfg.trello.events.indexOf( evt ) > -1;
	}

	bootstrap(function(prev){
		cfg.minId = prev;
		trello = new Trello(cfg);

		trello
			.on('maxId', writePrevId)
			.on('trelloError', function(err){
				console.error(err);
			});

		if ( wantsEvent('createCard') || allEvents ){
			trello.on('createCard', handlers.createCard);
		}
		if ( wantsEvent('commentCard') || allEvents ){
			trello.on('commentCard', handlers.commentCard);
		}
		if ( wantsEvent('addAttachmentToCard') || allEvents ){
			trello.on('addAttachmentToCard', handlers.addAttachmentToCard);
		}
		if ( wantsEvent('updateCard') || allEvents ){
			trello.on('updateCard', handlers.updateCard);
		}
		if ( wantsEvent('updateCheckItemStateOnCard') || allEvents ){
			trello.on('updateCheckItemStateOnCard', handlers.updateCheckItemStateOnCard);
		}
	});
};

module.exports.prototype.getConfig = function(){
	return this.config;
};

function bootstrap(callback){
	//if we can find a file named "last.id" then use that to store the activity timeline bookmark
	if (fs.existsSync('./last.id')){
		callback( fs.readFileSync('./last.id').toString() );
	}
}

function makeCardUrl(boardId, cardId) {
	return 'https://trello.com/c/' + cardId + '/' + boardId;
}

function makeBoardUrl(boardId) {
	return 'https://trello.com/b/' + boardId;
}

handlers = {
	createCard: function(event, boardId){
		var card_name = event.data.card.name
			,card_id = event.data.card.id
			,card_id_short = event.data.card.idShort
			,card_url = makeCardUrl(boardId, card_id)
			,author = event.memberCreator.fullName
			,board_url = makeBoardUrl(boardId)
			,board_name = event.data.board.name
			,msg = ':boom: ' + author + ' created card <' + card_url + '|' + sanitize(card_name) + '> on board <' + board_url + '|' + board_name + '>';
		notify(cfg.trello.boardChannels[boardId], msg);
	}
	,commentCard: function(event, boardId){
		var card_id_short = event.data.card.idShort
			,card_id = event.data.card.id
			,card_url = makeCardUrl(boardId, card_id)
			,card_name = event.data.card.name
			,author = event.memberCreator.fullName
			,msg = ':speech_balloon: ' + author + ' commented on card <' + card_url + '|' + sanitize(card_name) + '>: ' + trunc(event.data.text);
		notify(cfg.trello.boardChannels[boardId], msg);
	}
	,addAttachmentToCard: function(event, boardId){
		var card_id_short = event.data.card.idShort
			,card_id = event.data.card.id
			,card_url = makeCardUrl(boardId, card_id)
			,card_name = event.data.card.name
			,author = event.memberCreator.fullName
			,aurl = event.data.attachment.url;
		var msg = ':paperclip: ' + author + ' added an attachment to card <' + card_url + '|' + sanitize(card_name) + '>: ' + '<' + aurl + '|' + sanitize(event.data.attachment.name) + '>';
		notify(cfg.trello.boardChannels[boardId], msg);
	}
	,updateCard: function(event, boardId){
		if (event.data.old.hasOwnProperty('idList') && event.data.card.hasOwnProperty('idList')){
			//moving between lists
			var oldId = event.data.old.idList
				,newId = event.data.card.idList
				,nameO,nameN
				,card_id_short = event.data.card.idShort
		    	,card_id = event.data.card.id
		    	,card_url = makeCardUrl(boardId, card_id)
		    	,card_name = event.data.card.name
				,author = event.memberCreator.fullName;
			trello.api.get('/1/list/' + oldId, function(err, resp){
				if (err) throw err;
				nameO = resp.name;
				trello.api.get('/1/list/' + newId, function(err, resp){
					if (err) throw err;
					nameN = resp.name;
					var msg = ':arrow_heading_up:' + author + ' moved card <' + card_url + '|' + sanitize(card_name) + '> from list ' + nameO + ' to list ' + nameN;
					notify(cfg.trello.boardChannels[boardId], msg);
				});
			});
		}
	}
	,updateCheckItemStateOnCard: function(event, boardId){
		var card_id_short = event.data.card.idShort
			,card_id = event.data.card.id
			,card_url = makeCardUrl(boardId, card_id)
			,card_name = event.data.card.name
			,author = event.memberCreator.fullName;
		if (event.data.checkItem.state === 'complete'){
			var msg = ':ballot_box_with_check: ' + author + ' completed "' + event.data.checkItem.name + '" in card <' + card_url + '|' + sanitize(card_name) + '>.';
			notify(cfg.trello.boardChannels[boardId], msg);
		}
	}
};
function notify(channel, msg){
	if (channel.startsWith("#")) {
		channel = channel.substr(1);
	}
	var ch = discord.channels.get("name",channel);
	if (ch) {
		console.log("notify(" + ch.name + " [" + ch.id + "], " + msg);
		discord.sendMessage(ch.id, msg);
	} else {
		console.log("notify() couldn't find a channel called #" + channel);
	}
}
function sanitize(msg){
	return msg.replace(/([><])/g, function(match, patt){
		return (
			patt === '>' ? '&gt;' :
			patt === '<' ? '&lt;' : ''
		);
	});
}
function trunc(s){
	s = s || '';
	if (s.length >= 200)
		return s.slice(0,199) + ' [...]';
	return s;
}
function writePrevId(id){
	fs.writeFileSync('./last.id', id);

}