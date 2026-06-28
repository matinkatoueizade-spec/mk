const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.static(path.join(__dirname, "public")));

const users = {};
const messages = [];

const typingUsers = new Set();
const spamMap = new Map();

const MAX_MESSAGES = 100;
const MESSAGE_LIMIT = 500;
const SPAM_TIME = 1000;

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    users: Object.keys(users).length
  });
});

io.on("connection", (socket) => {

  let lastMessageTime = 0;

  socket.on("join", (username) => {

    users[socket.id] = {
      id: socket.id,
      uid: uuidv4(),
      username: username || "مهمان",
      room: "global"
    };

    socket.join("global");

    socket.emit("messageHistory", messages);

    io.emit("usersList", Object.values(users));

    io.emit("systemMessage", {
      id: uuidv4(),
      text: `${users[socket.id].username} وارد شد 🎉`
    });

  });

  socket.on("typing", () => {

    if (!users[socket.id]) return;

    typingUsers.add(users[socket.id].username);

    socket.broadcast
      .to(users[socket.id].room)
      .emit("typing", {
        user: users[socket.id].username
      });

  });

  socket.on("stopTyping", () => {

    if (!users[socket.id]) return;

    typingUsers.delete(users[socket.id].username);

    socket.broadcast
      .to(users[socket.id].room)
      .emit("stopTyping", {
        user: users[socket.id].username
      });

  });

  socket.on("joinRoom", (room) => {

    if (!users[socket.id]) return;

    socket.leave(users[socket.id].room);

    users[socket.id].room = room;

    socket.join(room);

    socket.emit("roomJoined", room);

  });

  socket.on("chatMessage", (text) => {

    if (!users[socket.id]) return;
    if (!text) return;

    text = String(text).trim();

    if (text.length === 0) return;
    if (text.length > MESSAGE_LIMIT) return;

    const now = Date.now();

    if (now - lastMessageTime < SPAM_TIME) {
      socket.emit(
        "errorMessage",
        "🚫 خیلی سریع پیام میدی!"
      );
      return;
    }

    lastMessageTime = now;

    if (!spamMap.has(socket.id)) {
      spamMap.set(socket.id, []);
    }

    const recent = spamMap.get(socket.id);

    recent.push(now);

    while (
      recent.length &&
      now - recent[0] > 5000
    ) {
      recent.shift();
    }

    if (recent.length > 8) {
      socket.emit(
        "errorMessage",
        "🚫 اسپم شناسایی شد!"
      );
      return;
    }

    const msg = {
      id: uuidv4(),
      user: users[socket.id].username,
      text,
      room: users[socket.id].room,
      time: now
    };

    messages.push(msg);

    if (messages.length > MAX_MESSAGES) {
      messages.shift();
    }

    io.to(users[socket.id].room)
      .emit("chatMessage", msg);

  });

  socket.on("privateMessage", (data) => {

    if (!users[socket.id]) return;

    const target = data.targetId;

    if (!target) return;

    const msg = {
      id: uuidv4(),
      from: users[socket.id].username,
      text: data.text,
      time: Date.now()
    };

    io.to(target).emit(
      "privateMessage",
      msg
    );

    socket.emit(
      "privateMessage",
      msg
    );

  });

  socket.on("disconnect", () => {

    if (!users[socket.id]) return;

    typingUsers.delete(
      users[socket.id].username
    );

    spamMap.delete(socket.id);

    io.emit("systemMessage", {
      id: uuidv4(),
      text: `${users[socket.id].username} خارج شد 👋`
    });

    delete users[socket.id];

    io.emit(
      "usersList",
      Object.values(users)
    );

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(
    "🚀 Matin Chat Ultimate Running On Port " + PORT
  );
});
