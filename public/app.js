const socket = io();

let username = localStorage.getItem("matin_username") || "مهمان";

const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("joinBtn");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");

usernameInput.value = username;

joinBtn.onclick = () => {

const name = usernameInput.value.trim();

if(!name) return;

username = name;

localStorage.setItem(
"matin_username",
username
);

alert("خوش اومدی " + username + " 🚀");

};

function addMessage(data){

const div = document.createElement("div");

div.className = "message";

const now = new Date();

div.innerHTML = `
<div class="user">${data.user}</div>
<div>${data.text}</div>
<div class="time">
${now.getHours()}:
${String(now.getMinutes()).padStart(2,"0")}
</div>
`;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

socket.on(
"chat message",
(data)=>{
addMessage(data);
}
);

function sendMessage(){

const text =
messageInput.value.trim();

if(!text) return;

socket.emit(
"chat message",
{
user: username,
text: text
}
);

messageInput.value = "";

}

sendBtn.onclick =
sendMessage;

messageInput.addEventListener(
"keypress",
(e)=>{
if(e.key==="Enter"){
sendMessage();
}
}
);
