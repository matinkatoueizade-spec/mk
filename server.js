const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.static(path.join(__dirname, "public")));

const users = {};

io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  socket.on("join", (username) => {

    users[socket.id] = {
      id: socket.id,
      username
    };

    io.emit("system", {
      type: "join",
      text: `${username} وارد گروه شد 🚀`
    });

    io.emit("users", Object.values(users));

  });

  socket.on("group-message", (data) => {

    io.emit("group-message", {
      user: data.user,
      text: data.text,
      time: Date.now()
    });

  });

  socket.on("private-message", (data) => {

    io.to(data.to).emit("private-message", {
      from: users[socket.id]?.username || "Unknown",
      text: data.text,
      time: Date.now()
    });

  });

  socket.on("disconnect", () => {

    if (users[socket.id]) {

      io.emit("system", {
        type: "leave",
        text: `${users[socket.id].username} خارج شد 👋`
      });

      delete users[socket.id];

      io.emit("users", Object.values(users));
    }

    console.log("Disconnected:", socket.id);

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server Started On Port", PORT);
});
