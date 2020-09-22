const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const fetch = require("node-fetch");
const quoteURL = 'https://api.whatdoestrumpthink.com/api/v1/quotes/random';

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

const rooms = { }
var connections = 0;
const capacity = 5;

app.get('/', (req, res) => {
	res.render('index', { rooms: rooms })
})

app.post('/room', (req, res) => {
	for (var r in rooms) {
		if (rooms.hasOwnProperty(r)) {
			let roomCount = rooms[r].count;
			if (roomCount < capacity && !rooms[r].started) {
				return res.redirect(r);
			}
		}
	}
	// Find a better way to do this.
	let code = Math.floor(Math.random() * 10000);
	getQuote(code);
	rooms[code] = { users: {}, count : 0, started : false, timer : 10, gameIntervalID : 0, timerHasBeenActivated : false};
	io.emit('room-created', code);
	return res.redirect(code);
})

async function getQuote(code) {
	try {
		const response = await fetch(quoteURL);
		if (!response.ok) {
			throw Error(response.statusText);
		}
		let json = await response.json();
		rooms[code].sentence = json.message;
		io.emit('text-fetched', json.message);
	} catch(err) {
		console.log(err);
		alert("Fetching failed");
	}
}

function waitingTimer(room) {
	let roomTimer = rooms[room].timer;
	io.emit('time-count', roomTimer)
	rooms[room].timer = roomTimer - 1;
	if (roomTimer <= 1) {
		clearInterval(rooms[room].gameIntervalID);
		io.emit('game-on');
	}
}

app.get('/:room', (req, res) => {
	let roomCount;
	if (rooms[req.params.room]) {
		roomCount = rooms[req.params.room].count;
	}
	if (rooms[req.params.room] == null || rooms[req.params.room].started || roomCount >= capacity) {
		return res.redirect('/');
	}
	res.render('room', { roomName: req.params.room })
})

server.listen(process.env.PORT || 3000)
// server.listen(3000)

io.on('connection', socket => {
	socket.on('new-user', (room, name) => {
		let roomCount = rooms[room].count;
		rooms[room].count = roomCount+1;
		connections++;
		let sentence = rooms[room].sentence;
		if (sentence) {
			socket.emit('text-fetched', sentence);
		}
		socket.join(room)
		rooms[room].users[socket.id] = name
		socket.to(room).broadcast.emit('user-connected', {name: name, count: rooms[room].count})
		socket.emit('user-connected', {name: name, count: rooms[room].count})
	})
	socket.on('game-over', room => {
		socket.to(room).broadcast.emit('user-has-won');
	})
	socket.on('disconnect', () => {
		getUserRooms(socket).forEach(room => {
			socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
			delete rooms[room].users[socket.id]
			connections--;
			rooms[room].count -= 1;
			if (rooms[room].count == 1) {
				clearInterval(rooms[room].gameIntervalID);
				rooms[room].timer = 10;
				rooms[room].started = false;
				rooms[room].timerHasBeenActivated = false;
				socket.to(room).emit('game-stopped');
			}
			if (rooms[room].count == 0) {
				//connections = 0;
				io.emit('room-deleted', room);
				delete rooms[room];
			}
		})
	})
  socket.on('key-pressed', (room, words, num) => {
    socket.to(room).broadcast.emit('other-player-moved', {words: words, playerNumber: num})
  })
  socket.on('game-has-started', room => {
  	rooms[room].started = true;
  })
  socket.on('activate-timer', room => {
  	if (!rooms[room].timerHasBeenActivated) {
  		rooms[room].gameIntervalID = setInterval(function() { waitingTimer(room); }, 1000);
  		rooms[room].timerHasBeenActivated = true;
  	}
  })
})

function getUserRooms(socket) {
	return Object.entries(rooms).reduce((names, [name, room]) => {
	if (room.users[socket.id] != null) names.push(name)
		return names
	}, [])
}