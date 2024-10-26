const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const socketIo = require('socket.io');
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://127.0.0.1:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const rooms = {}; // Correct initialization

app.get('/', (req, res) => {
  res.render('index', { rooms: rooms });
});

app.post('/room', (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect('/');
  }
  rooms[req.body.room] = { users: {} }; // Initialize users
  res.redirect(req.body.room);
  io.emit('room-created', req.body.room);
});

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/');
  }
  res.render('room', { roomName: req.params.room });
});

io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    // Check if the room exists before joining
    if (rooms[room]) {
      socket.join(room); 
      rooms[room].users[socket.id] = name; 
      socket.to(room).emit('user-connected', name); // Correct usage
    } else {
      console.error(`Room ${room} does not exist.`);
    }
  });

  socket.on('send-chat-message', (room, message) => {
    // Check if the room exists before sending a message
    if (rooms[room]) {
      socket.to(room).emit('chat-message', {
        message: message,
        name: rooms[room].users[socket.id]
      });
    } else {
      console.error(`Room ${room} does not exist.`);
    }
  });

  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      if (rooms[room]) { // Check if the room exists
        socket.to(room).emit('user-disconnected', rooms[room].users[socket.id]);
        delete rooms[room].users[socket.id];
      }
    });
  });
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users && room.users[socket.id] != null) { // Check if users exists
      names.push(name);
    }
    return names;
  }, []);
}