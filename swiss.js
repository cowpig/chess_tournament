players = []

// ["white_name", "black_name", "1-0"] draw is "1/2-1/2", ongoing is "*"
games = []

games_by_round = []

const get_record = (games, player) => {
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
	let records = players.map(function(player){
		return [player, get_record(games, player)]
	})
	return records.sort((a,b) => {return score(b[1]) - score(a[1])})
}

const color_count = (record, color) => {
	return record.reduce((total, game) => {return total + game[0] == color})
}

const color_diff = (record) => {
	return color_count(record, "white") - color_count(record, "black")
}

const has_played_against = (player, record) => {
	return record.reduce((seen_yet, game) => {return seen_yet || (game[1] == player)})
}

const next_round = (players, games) => {
	// order players by score
	const players_to_pair = get_table()
	let pairings = []
	while (players_to_pair.length > 0) {
		const [player, record] = players_to_pair.shift()
		// get all players with the highest score who have not yet played 
		// against the highest-ranked remaining player
		let potential_opponents = {}
		for (let i=1; i<players_to_pair.length; i++) {
			let [other_player, other_record] = players_to_pair[i]

			if (has_played_against(next_player, other_record)) {
				continue
			}

			if (Object.keys(potential_opponents).length != 0) {
				if ( score(other_record) != score( some_value_of(potential_opponents)[1] ) {
					break
				}
			}

			potential_opponents[i] = [other_player, other_record]
		}
		
		// of potential opponents, find the one with the most complementary white-black record
		const wb_diff = color_diff(record)
		let best_diff = 9999999
		let best_opp = null
		for (let i in potential_opponents) {
			const diff = Math.abs(color_diff(potential_opponents[i][1]) - wb_diff)
			if (diff < best_diff) {
				best_diff = diff
				best_opp = i
			}
		}

		const chosen_player = players_to_pair.splice(best_opp, 1)

		// add them to the pairings, with the player who has played fewer blacks as black
		if ()
	}
}

const some_value_of = (obj) => {
	return obj[Object.keys(obj)[0]]
}

const colsum = (matrix, col) => {
	return matrix.reduce((a,b) => {return a[col] + b[col]})
}

const score = (record) => {
	return colsum(record, 2)
}
