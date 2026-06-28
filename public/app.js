const socket = io();

let username = "";

/* ==========================
Username Login
========================== */

while (!username || username.trim().length < 2) {
username = prompt("نام کاربری خود را وارد کنید:");
}

socket.emit("join", username);

/* ==========================
Elements
========================== */

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const usersList = document.getElementById("usersList");
const onlineCount = document.getElementById("onlineCount");

/* ==========================
Add Message
========================== */

function addMessage(data, mine = false) {

const div = document.createElement("div");

div.className = mine
    ? "message me"
    : "message other";

div.innerHTML = `
    <div class="username">
        ${data.username}
    </div>

    <div class="text">
        ${data.message}
    </div>

    <span class="time">
        ${data.time}
    </span>
`;

messages.appendChild(div);

messages.scrollTop =
    messages.scrollHeight;

}

/* ==========================
Send Message
========================== */

function sendMessage() {

const text =
    messageInput.value.trim();

if (!text) return;

socket.emit("chatMessage", {
    message: text
});

messageInput.value = "";

messageInput.focus();

}

sendBtn.addEventListener(
"click",
sendMessage
);

messageInput.addEventListener(
"keypress",
(e) => {
if (e.key === "Enter") {
sendMessage();
}
}
);

/* ==========================
Receive Message
========================== */

socket.on("message", (data) => {

addMessage(
    data,
    data.username === username
);

});

/* ==========================
Online Users
========================== */

socket.on("users", (users) => {

usersList.innerHTML = "";

onlineCount.textContent =
    users.length;

users.forEach(user => {

    const div =
        document.createElement("div");

    div.className = "user-item";

    div.innerHTML = `
        <div class="user-dot"></div>
        <span>${user}</span>
    `;

    usersList.appendChild(div);

});

});

/* ==========================
System Message
========================== */

socket.on("system", (text) => {

const div =
    document.createElement("div");

div.className = "system";

div.textContent = text;

messages.appendChild(div);

messages.scrollTop =
    messages.scrollHeight;

});
/* ==========================
Local Storage Username
========================== */

const savedName =
localStorage.getItem("username");

if(savedName){
username = savedName;
}else{
localStorage.setItem(
"username",
username
);
}

/* ==========================
Emoji Panel
========================== */

const emojiBtn =
document.getElementById("emojiBtn");

const emojiPanel =
document.getElementById("emojiPanel");

if(emojiBtn && emojiPanel){

emojiBtn.addEventListener(
"click",
()=>{
emojiPanel.classList.toggle("show");
}
);

document
.querySelectorAll(".emoji")
.forEach(emoji=>{

emoji.addEventListener(
"click",
()=>{

messageInput.value +=
emoji.textContent;

messageInput.focus();

}

);

});

}

/* ==========================
Typing Status
========================== */

const typingArea =
document.getElementById("typingArea");

let typingTimeout;

messageInput.addEventListener(
"input",
()=>{

socket.emit("typing");

clearTimeout(
typingTimeout
);

typingTimeout =
setTimeout(()=>{

socket.emit(
"stopTyping"
);

},1500);

}
);

socket.on(
"userTyping",
(user)=>{

if(user===username)
return;

if(typingArea){

typingArea.innerHTML =
"✍️ ${user} در حال تایپ است...";

}

}
);

socket.on(
"userStopTyping",
()=>{

if(typingArea){

typingArea.innerHTML="";

}

}
);

/* ==========================
Browser Notification
========================== */

if(
"Notification"
in window
){

Notification.requestPermission();

}

socket.on(
"message",
(data)=>{

if(
data.username !== username &&
document.hidden
){

if(
Notification.permission ===
"granted"
){

new Notification(
data.username,
{
body:data.message,
icon:"/icon.png"
}
);

}

}

}
);

/* ==========================
Profile Modal
========================== */

const profileBtn =
document.getElementById(
"profileBtn"
);

const profileModal =
document.getElementById(
"profileModal"
);

if(
profileBtn &&
profileModal
){

profileBtn.addEventListener(
"click",
()=>{

profileModal.style.display=
"flex";

const profileName =
document.getElementById(
"profileName"
);

const profileAvatar =
document.getElementById(
"profileAvatar"
);

if(profileName){

profileName.textContent =
username;

}

if(profileAvatar){

profileAvatar.textContent =
username
.charAt(0)
.toUpperCase();

}

}
);

}

/* ==========================
Close Modals
========================== */

document
.querySelectorAll(
".modal-close"
)
.forEach(btn=>{

btn.addEventListener(
"click",
()=>{

document
.querySelectorAll(
".modal"
)
.forEach(modal=>{

modal.style.display=
"none";

});

}
);

});

/* ==========================
Dark Mode
========================== */

const darkSwitch =
document.getElementById(
"darkModeSwitch"
);

const savedTheme =
localStorage.getItem(
"theme"
);

if(savedTheme==="light"){

document.body.classList.add(
"light"
);

}

if(darkSwitch){

darkSwitch.addEventListener(
"click",
()=>{

document.body.classList.toggle(
"light"
);

if(
document.body.classList.contains(
"light"
)
){

localStorage.setItem(
"theme",
"light"
);

}else{

localStorage.setItem(
"theme",
"dark"
);

}

}
);

    }
