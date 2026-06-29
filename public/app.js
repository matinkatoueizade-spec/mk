const socket = io();

const messages = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let username =
localStorage.getItem("chat_username");

if (!username) {
    username = prompt("نام کاربری:");
    if (!username) {
        username = "مهمان";
    }
    localStorage.setItem(
        "chat_username",
        username
    );
}

socket.emit("join", username);

function addMessage(msg) {

    const div =
    document.createElement("div");

    div.className = "message";

    div.innerHTML =
    `<b>${msg.user}</b>: ${msg.text}`;

    messages.appendChild(div);

    messages.scrollTop =
    messages.scrollHeight;
}

sendBtn.addEventListener(
"click",
sendMessage
);

input.addEventListener(
"keydown",
(e)=>{
    if(e.key==="Enter"){
        sendMessage();
    }
});

function sendMessage(){

    const text =
    input.value.trim();

    if(!text) return;

    socket.emit(
        "chatMessage",
        text
    );

    input.value = "";
}

socket.on(
"chatMessage",
(msg)=>{
    addMessage(msg);
}
);

socket.on(
"messageHistory",
(history)=>{

    messages.innerHTML = "";

    history.forEach(msg=>{
        addMessage(msg);
    });

}
);
