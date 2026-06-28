const socket = io();

let username = localStorage.getItem("username");

if (!username) {
    username = prompt("نام کاربری خود را وارد کنید:");
    
    if (!username || username.trim() === "") {
        username = "Guest" + Math.floor(Math.random() * 9999);
    }

    localStorage.setItem("username", username);
}

socket.emit("join", username);

const messages = document.getElementById("messages");
const usersList = document.getElementById("usersList");
const onlineCount = document.getElementById("onlineCount");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(user, text, time, mine = false) {

    const msg = document.createElement("div");
    msg.className = mine ? "message me" : "message other";

    const date = new Date(time);

    msg.innerHTML = `
        <div class="username">${user}</div>
        <div>${text}</div>
        <div class="time">
            ${date.toLocaleTimeString("fa-IR")}
        </div>
    `;

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function addSystem(text) {

    const div = document.createElement("div");

    div.className = "system";
    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;
}

sendBtn.onclick = sendMessage;

messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

function sendMessage() {

    const text = messageInput.value.trim();

    if (!text) return;

    socket.emit("group-message", {
        user: username,
        text: text
    });

    messageInput.value = "";
}

socket.on("group-message", (data) => {

    addMessage(
        data.user,
        data.text,
        data.time,
        data.user === username
    );

});

socket.on("system", (data) => {

    addSystem(data.text);

});

socket.on("users", (users) => {

    usersList.innerHTML = "";

    onlineCount.textContent = users.length;

    users.forEach(user => {

        const div = document.createElement("div");

        div.className = "user-item";

        div.innerHTML = `
            <div class="user-dot"></div>
            <div>${user.username}</div>
        `;

        usersList.appendChild(div);

    });

});
