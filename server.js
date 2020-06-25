const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

const rooms = { }
var connections = 0;

app.get('/', (req, res) => {
	res.render('index', { rooms: rooms })
})

app.post('/room', (req, res) => {
	let capacity = 5;
	for (var r in rooms) {
		if (rooms.hasOwnProperty(r)) {
			let roomCount = rooms[r].count;
			console.log("roomcount: " + roomCount);
			if (roomCount < 5) {
				return res.redirect(r);
			}
		}
	}
	// Find a better way to do this.
	let code = Math.floor(Math.random() * 10000);
	rooms[code] = { users: {}, count : 0 }
	io.emit('room-created', code);
	return res.redirect(code);
})

app.get('/:room', (req, res) => {
	if (rooms[req.params.room] == null) {
		return res.redirect('/')
	}
	res.render('room', { roomName: req.params.room })
})

server.listen(3000)

io.on('connection', socket => {
	socket.on('new-user', (room, name) => {
		let roomCount = rooms[room].count;
		rooms[room].count = roomCount+1;
		connections++;
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
			console.log(rooms[room].count);
			if (rooms[room].count == 0) {
				//connections = 0;
				console.log("deleting");
				io.emit('room-deleted', room);
				console.log
				delete rooms[room];
			}
		})
	})
  socket.on('key-pressed', (room, words) => {
    socket.to(room).broadcast.emit('other-player-moved', {words: words, userID: socket.id})
  })
})

function getUserRooms(socket) {
	return Object.entries(rooms).reduce((names, [name, room]) => {
	if (room.users[socket.id] != null) names.push(name)
		return names
	}, [])
}