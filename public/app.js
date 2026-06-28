const socket = io();

let username =
localStorage.getItem("username");

if (!username) {
username = prompt("نام کاربری خود را وارد کن:");

if (!username || username.trim() === "") {
    username = "مهمان" + Math.floor(Math.random() * 9999);
}

localStorage.setItem("username", username);

}

socket.emit("join", username);

const messages =
document.getElementById("messages");

const messageInput =
document.getElementById("messageInput");

const sendBtn =
document.getElementById("sendBtn");

const usersList =
document.getElementById("usersList");

const onlineCount =
document.getElementById("onlineCount");

function addMessage(html, className = "") {

const div =
document.createElement("div");

div.className = className;

div.innerHTML = html;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

function sendMessage() {

const text =
messageInput.value.trim();

if (!text) return;

socket.emit(
    "chatMessage",
    text
);

messageInput.value = "";

}

sendBtn.addEventListener(
"click",
sendMessage
);

messageInput.addEventListener(
"keypress",
(e) => {

    socket.emit("typing");

    if (e.key === "Enter") {
        sendMessage();
    }
}

);

socket.on(
"chatMessage",
(msg) => {

    const time =
    new Date(msg.time)
    .toLocaleTimeString("fa-IR");

    addMessage(
    `
    <div class="message">
    <div class="username">
    ${msg.user}
    </div>

    <div class="text">
    ${msg.text}
    </div>

    <div class="time">
    ${time}
    </div>
    </div>
    `
    );
}

);

socket.on(
"systemMessage",
(msg) => {

    addMessage(
    `
    <div class="system">
    ${msg.text}
    </div>
    `
    );
}

);

socket.on(
"usersList",
(users) => {

    usersList.innerHTML = "";

    onlineCount.textContent =
    users.length;

    users.forEach(user => {

        const div =
        document.createElement("div");

        div.className =
        "user-item";

        div.innerHTML =
        `
        <div class="user-dot"></div>
        <span>${user.username}</span>
        `;

        usersList.appendChild(div);

    });

}

);

socket.on(
"typing",
(data) => {

    const old =
    document.getElementById("typingBox");

    if (old) old.remove();

    const div =
    document.createElement("div");

    div.id = "typingBox";

    div.className = "system";

    div.innerText =
    `${data.user} درحال تایپ است...`;

    messages.appendChild(div);

    setTimeout(() => {

        const t =
        document.getElementById("typingBox");

        if (t) t.remove();

    }, 1500);

}

);

socket.on(
"privateMessage",
(msg) => {

    addMessage(
    `
    <div class="message private">
    📩 پیام خصوصی از
    <b>${msg.from}</b>
    <br><br>
    ${msg.text}
    </div>
    `
    );
}

);
