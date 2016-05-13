// players = []

// // ["white_name", "black_name", "1-0"] draw is "1/2-1/2", ongoing is "*"
// games = []

// games_by_round = []

// const Swiss = {

const get_standings = (players, games) => {
	const table = get_table(players, games)
	return table.map(([player, record]) => { return [player, score(record)] })
}

const get_record = (games, player) => {
	// console.log(games, player)
	let record = []
	games.map((game) => {
		if (game[0] == player) {
			if (game[2] == "1-0") {
				record.push(["white", game[1], 1])
			} else if (game[2] == "0-1") {
				record.push(["white", game[1], 0])
			} else if (game[2] == "1/2-1/2") {
				record.push(["white", game[1], 0.5])
			}
		} else if (game[1] == player) {
			if (game[2] == "1-0") {
				record.push(["black", game[0], 0])
			} else if (game[2] == "0-1") {
				record.push(["black", game[0], 1])
			} else if (game[2] == "1/2-1/2") {
				record.push(["black", game[0], 0.5])
			}
		}
	})
	return record
}

// returns a list of players' records, sorted by highest score
const get_table = (players, games) => {
	// console.log(players, games)
	let records = players.map(function(player){
		return [player, get_record(games, player)]
	})
	// console.log(records)
	return records.sort((a,b) => {return score(b[1]) - score(a[1])})
}

const color_count = (record, color) => {
	return record.reduce((total, game) => {return total + (game[0] === color)}, 0)
}

const color_diff = (record) => {
	return color_count(record, "white") - color_count(record, "black")
}

const games_against = (player, record) => {
	return record.reduce((total, game) => {return total + (game[1] === player)}, 0)
}

const colsum = (matrix, col) => {
	return matrix.reduce((sum,row) => {return sum + row[col]}, 0)
}

const score = (record) => {
	return colsum(record, 2)
}

const potential_opponents = (player, record, players_to_pair, max_games) => {
	// get all players with the highest score who have not yet played more than max_games
	// against the given player
	max_games = max_games || 0

	let potential_opps = {}
	// console.log("finding matches")
	for (let i=0; i<players_to_pair.length; i++) {
		let [other_player, other_record] = players_to_pair[i]
		// console.log("checking ", other_player)

		if (games_against(player, other_record) > max_games) {
			// console.log("already played--continuing")
			continue
		}

		if (Object.keys(potential_opps).length != 0) {
			if ( score(other_record) != score(some_value_of(potential_opps)[1]) ){
				break
			}
		}

		potential_opps[i] = [other_player, other_record]
	}
	if (Object.keys(potential_opps).length != 0){
		return potential_opps
	}
	return potential_opponents(player, record, players_to_pair, max_games+1)
}

const next_round = (players, games) => {
	games = games || []

	// order players by score
	const players_to_pair = get_table(players, games)

	let pairings = []
	while (players_to_pair.length > 1) {
		const [player, record] = players_to_pair.shift()
		// console.log("pairing ", player)

		const opps = potential_opponents(player, record, players_to_pair)
		// console.log("potential_opps:\n", JSON.stringify(opps))
		
		// of potential opponents, find the one with the most complementary white-black record
		const wb_diff = color_diff(record)
		let best_diff = 9999999
		let best_opp = null
		for (let i in opps) {
			const diff = Math.abs(color_diff(opps[i][1]) - wb_diff)
			// console.log(opps[i][0], " has diff ", diff)
			if (diff < best_diff) {
				best_diff = diff
				best_opp = i
			}
		}

		const chosen_player = players_to_pair.splice(best_opp, 1)[0]
		// console.log("selecting ", chosen_player[0], " with diff ", best_diff)

		// add them to the pairings, with the player who has played fewer blacks as black
		if (wb_diff > color_diff(chosen_player[1])) {
			pairings.push([chosen_player[0], player, "*"])
		} else {
			pairings.push([player, chosen_player[0], "*"])
		}
	}
	if (players_to_pair.length) {
		pairings.push([players_to_pair[0][0], null, "*"])
	}

	return pairings
}

const some_value_of = (obj) => {
	return obj[Object.keys(obj)[0]]
}

const assert = (condition, message) => {
    if (!condition) {
        throw message || "Assertion failed"
    }
}

const print_table = (table) => {
	for (let [player, record] of table) {
		console.log(player, JSON.stringify(record))
	}
}

const print_scores = (table) => {
	for (let [player, record] of table) {
		console.log(player, score(record), color_diff(record))
	}
}

const test = () => {
	let test_players = ["a", "b", "c", "d", "e"]
	let games = []

	for (let i=1; i<16; i++){
		for (let game of games) {
			game[2] = "1-0"
		}
		games = games.concat(next_round(test_players, games))
		console.log("\n\n==round ", i, "==\npairings: ", games, "\n")
		console.log("table: ")
		print_scores(get_table(test_players, games))
	}
}

module.exports = {
	get_standings : get_standings,
	get_record : get_record,
	get_table : get_table,
	color_count : color_count,
	color_diff : color_diff,
	games_against : games_against,
	colsum : colsum,
	score : score,
	potential_opponents : potential_opponents,
	next_round : next_round,
	some_value_of : some_value_of,
	assert : assert,
	print_table : print_table,
	print_scores : print_scores,
	test : test
}

// }

// if (typeof exports !== 'undefined') exports.Swiss = Swiss;
// if (typeof define !== 'undefined') define( function () { return Swiss;  });