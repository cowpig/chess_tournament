var express = require('express');
var chess = require('chess.js');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

console.log(io);

games = {}

var new_game = function() { 
	return {
		clock: {
			w: 300,
			b: 300
		},
		chess: new chess.Chess(),
		result: '*',
		player_color: Math.random() > 0.5 ? 'w' : 'b'
	};
}

var get_game_state = function(id) {
	console.log("getting game ", id);
	return JSON.stringify({
		clock: games[id].clock,
		pgn: games[id].chess.pgn(),
		fen: games[id].chess.fen(),
		turn: games[id].result === '*' ? games[id].chess.turn() : null,
		result: games[id].result,
		color: games[id].player_color
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
			game.clock[game.chess.turn()] -= 0.1;
			if (game.clock[game.chess.turn()] < 1) {
				game.result = game.chess.turn === 'b' ? '1-0' : '0-1';
			}
		}

		if (game.result !== '*') {
			clearInterval(intervalId);
		}
	}
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
  socket.on('move', function(msg){
  	console.log("move registered", msg, "on socket", socket);
    io.emit('reply', get_game_state());
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
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

app.route('/robot/:user/:id')
	.get(function(req, res) {
		var id = req.params.id;
		var user = req.params.user;
		var game_id = user + "/" + id;

		if (!(game_id in games)) {
			console.log("new game requested");
			games[game_id] = new_game();
			if (games[game_id].player_color === 'b') {
				make_random_move(game_id)();
			}
			var intervalId = setInterval(tickClock(game_id, intervalId), 100);

			// console.log(games[game_id]);
		}

		res.send(get_game_state(game_id));
	})
	.post(function(req, res) {
		var id = req.params.id;
		var user = req.params.user;
		var game_id = user + "/" + id;
		var game = games[game_id];

		console.log(game);

		var move = req.query.move;

		console.log(move, "posted to", game_id);
		console.log(game.chess.turn(), game.player_color);

		if (game.chess.turn() !== game.player_color) {
			res.send("Not your turn.");
		} else {
			var move_res = game.chess.move(move);
			if (move_res === null) {
				res.send("Invalid move.");
			} else {
				res.send(move_res);
				setTimeout(make_random_move(game_id), 5000);
			}
		}
	});

http.listen(3000, function () {
	games["foo/bar"] = 
	console.log('This aint draughts');
});
