var express = require('express');
var chess = require('chess.js');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var swiss = require('./swiss.js')

console.log(io);

games = {}
clients = {}

var new_game = function(user_ids) {
	var colors; 
	if (Math.random() > 0.5) {
		colors = {
			w: user_ids[0],
			b: user_ids[1]
		}
	} else {
		colors = {
			b: user_ids[0],
			w: user_ids[1]
		}
	}
	var game = {
		clock: {
			w: 300,
			b: 300
		},
		chess: new chess.Chess(),
		result: '*',
		colors: colors
	};
	games[user_ids[0]] = game;
	games[user_ids[1]] = game;

	var intervalId = setInterval(tickClock(user_ids[0], intervalId), 1000);
	
	return game;
}

var get_game_state = function(id) {
	// console.log("getting game ", id);
	return JSON.stringify({
		clock: games[id].clock,
		pgn: games[id].chess.pgn(),
		fen: games[id].chess.fen(),
		turn: games[id].result === '*' ? games[id].chess.turn() : null,
		result: games[id].result,
		color: games[id].colors.w === id ? 'w' : 'b'
	});
}

var tickClock = function(id, intervalId) {
	return function() {
		var game = games[id];

		if (game.chess.in_checkmate() === true) {
			game.result = game.chess.turn === 'b' ? '1-0' : '0-1';
		} else if (game.chess.in_draw() === true) {
			game.result = '1/2-1/2';
		} else {
			if (game.result === '*')
				game.clock[game.chess.turn()] -= 1;
			if (game.clock[game.chess.turn()] < 1) {
				game.result = game.chess.turn === 'b' ? '1-0' : '0-1';
			}
		}

		// if (game.clock[game.chess.turn()] % 20 == 0)
		broadcast_state(id);

		if (game.result !== '*') {
			clearInterval(intervalId);
		}
	}
}

var broadcast_state = function(id) {
	var id1 = games[id]['colors']['w'];
	var id2 = games[id]['colors']['b'];
	// console.log("broadcasting", id, "to", id1, id2);
	// console.log(clients);
	if (id1 in clients) {
		clients[id1][1].emit('game_state', get_game_state(id1));
	}
	if (id2 in clients) {
		clients[id2][1].emit('game_state', get_game_state(id2));
	}
}

var register_move = function(id, move) {
	var game = games[id];
	var result = game.chess.move(move);
	if (result !== null) {
		broadcast_state(id);
	}
	return result;
}

var make_random_move = function(id) {
	return function() {
		var game = games[id].chess;
		var possibleMoves = game.moves();
		game.move(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
	}
}

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('update', function(msg) {
  	clients[msg.id] = [socket.id, socket];
  	clients[socket.id] = [msg.id, socket];
  	io.emit('game_state', get_game_state(msg.id));
  	console.log("registered", socket.id, "to game", msg.id);
  })
  socket.on('move', function(move_msg){
  	console.log("move registered", move_msg, "socket", socket.id);
    var game = games[socket.id];
    register_move(move_msg.id, move_msg.san);
    io.emit('game_state', get_game_state(move_msg.id));
  });
  socket.on('disconnect', function(){
    console.log('user', socket.id, 'disconnected');
    if (socket.id in clients) {
	    var game_id = clients[socket.id][0];
	    delete clients[game_id];
	    delete clients[socket.id];
    }
  });
});

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/client_deps/chessboard.js', function(req, res){
	console.log("asked for chessboard");
	res.sendFile('client_deps/chessboard.js', {root:"."});
});

app.get('/client_deps/chessboard.css', function(req, res){
	console.log("asked for chessboard");
	res.sendFile('client_deps/chessboard.css', {root:"."});
});

app.get('/human/:user/:id', function (req, res) {
  console.log("destroy all humanz");
  res.sendFile("client.html", {root:"."});
});

app.get('/pieces/:fn', function(req, res) {
	var fn = req.params.fn;
	res.sendFile(fn, {root:'./pieces/'});
});

var robot_get = function(req, res) {
	var id = req.params.id;
	var user = req.params.user;
	var game_id = user + "/" + id;

	if (!(game_id in games)) {
		console.log("new game requested");
		games[game_id] = new_game([game_id, "test"]);
		if (games[game_id].player_color === 'b') {
			make_random_move(game_id)();
		}			

		// console.log(games[game_id]);
	}

	res.send(get_game_state(game_id));
}

var robot_post_move = function(game_id, move, res) {
	var game = games[game_id];
	var color = game.colors.game_id;
	if (game.chess.turn() !== color) {
		res.send("Not your turn.");
	} else {
		var move_res = register_move(game_id, move);
		if (move_res === null) {
			res.send("Invalid move.");
		} else {
			res.send(move_res);
			// setTimeout(make_random_move(game_id), 5000);
		}
	}
}

var robot_post_san = function(req, res) {
	var id = req.params.id;
	var user = req.params.user;
	var game_id = user + "/" + id;
	var game = games[game_id];

	// console.log(game);

	var move = req.query.move;

	robot_most_move(game_id, move, res);
	console.log(move, "posted to", game_id);
	console.log(game.chess.turn(), game.player_color);
}
var robot_post_sqs = function(req, res) {
	var id = req.params.id;
	var user = req.params.user;
	var game_id = user + "/" + id;
	var game = games[game_id];
	var move = req.query.move;

	try {
		move = {
			from: move.slice(0,2),
			to: move.slice(2,4)
		}
	} catch (err) {
		console.log(err);
	}

	robot_post_move(game_id, move, res);
	console.log(move, "posted to", game_id);
	console.log(game.chess.turn(), game.player_color);
}

app.route('/robot/:user/:id')
	.get(robot_get)
	.post(robot_post_sqs);

app.route('/robot_san/:user/:id')
	.get(robot_get)
	.post(robot_post_san);


var test_players = ["foo", "foo2", "foo3", "foo4"];
var games_list = [];
var next_games = [];
var round = 1;

var setup_next_round = function() {
	for (var i=0; i<next_games.length; i++){
		var id = '' + next_games[i][0] + "/" + (round-1);
		console.log(games);
		console.log(id);
		next_games[i][2] = games[id].result;

		games_list.push(next_games[i]);
	}
	console.log("SCORE SO FAR");
	// console.log(games_list);
	console.log(swiss.get_standings(test_players, games_list));

	next_games = swiss.next_round(test_players, games_list);
	console.log("ROUND", round, "PAIRINGS:");
	
	
	for (var i=0; i<next_games.length; i++){
		console.log(next_games[i]);
		var id1 = '' + next_games[i][0] + "/" + round;
		var id2 = '' + next_games[i][1] + "/" + round;
		new_game([id1, id2]);
	}

	round += 1;
}

http.listen(3000, function () {
	setup_next_round()
	setInterval(setup_next_round, 15 * 60 * 1000);

	// new_game(['foo/bar', 'foo2/bar']);
	// console.log(games);
	// console.log(games_list);
	console.log('This aint draughts');
});