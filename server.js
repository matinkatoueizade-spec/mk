const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Matin Chat</title>
<style>
body{
font-family:Arial;
background:#111;
color:white;
margin:0;
padding:20px;
}
#messages{
height:70vh;
overflow:auto;
border:1px solid #444;
padding:10px;
margin-bottom:10px;
}
input{
width:80%;
padding:10px;
}
button{
padding:10px;
}
</style>
</head>
<body>
<h1>🚀 Matin Chat</h1>

<div id="messages"></div>

<input id="msg" placeholder="پیام بنویس...">
<button onclick="send()">ارسال</button>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
const messages = document.getElementById("messages");

socket.on("message",(msg)=>{
const div=document.createElement("div");
div.textContent=msg;
messages.appendChild(div);
messages.scrollTop=messages.scrollHeight;
});

function send(){
const input=document.getElementById("msg");
socket.emit("message",input.value);
input.value="";
}
</script>
</body>
</html>
`);
});

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", (msg) => {
    io.emit("message", msg);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
