const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

io.on("connection", (socket) => {

  console.log("Connected");

  socket.on("join", (username) => {

    socket.username = username;

    io.emit("systemMessage", {
      text: username + " وارد شد"
    });

  });

  socket.on("chatMessage", (text) => {

    io.emit("chatMessage", {
      user: socket.username,
      text: text,
      time: Date.now()
    });

  });

  socket.on("disconnect", () => {

    if(socket.username){

      io.emit("systemMessage", {
        text: socket.username + " خارج شد"
      });

    }

  });

});

server.listen(3000, () => {

  console.log(
    "Server Running On Port 3000"
  );

});
