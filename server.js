const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server,{
cors:{
origin:"*"
}
});

app.use(cors());
app.use(express.json());

app.use(
express.static(
path.join(__dirname,"public")
)
);

const users = {};
const messages = [];

const MAX_MESSAGES = 100;

app.get("/health",(req,res)=>{
res.json({
status:"online",
users:Object.keys(users).length,
uptime:process.uptime()
});
});

io.on("connection",(socket)=>{

console.log(
"Connected:",
socket.id
);

socket.on("join",(username)=>{

users[socket.id] = {
  id:socket.id,
  username:
    username || "مهمان"
};

socket.emit(
  "messageHistory",
  messages
);

io.emit(
  "usersList",
  Object.values(users)
);

io.emit(
  "systemMessage",
  {
    id:uuidv4(),
    text:
    `${username} وارد شد`
  }
);

});

socket.on(
"chatMessage",
(text)=>{

  if(
    !users[socket.id]
  ) return;

  const msg = {
    id:uuidv4(),
    user:
    users[socket.id]
    .username,
    text,
    time:
    Date.now()
  };

  messages.push(msg);

  if(
    messages.length >
    MAX_MESSAGES
  ){
    messages.shift();
  }

  io.emit(
    "chatMessage",
    msg
  );

}

);

socket.on(
"disconnect",
()=>{

  if(
    users[socket.id]
  ){

    io.emit(
      "systemMessage",
      {
        id:uuidv4(),
        text:
        `${users[socket.id].username} خارج شد`
      }
    );

    delete users[
      socket.id
    ];

    io.emit(
      "usersList",
      Object.values(users)
    );

  }

}

);

});

const PORT =
process.env.PORT || 3000;

server.listen(
PORT,
()=>{

console.log(
  `🚀 Server Running On ${PORT}`
);

}
);
