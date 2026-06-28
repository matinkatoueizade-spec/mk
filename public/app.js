const socket = io();

/* =========================
Elements
========================= */

const messages =
document.getElementById("messages");

const input =
document.getElementById("messageInput");

const sendBtn =
document.getElementById("sendBtn");

const onlineCount =
document.getElementById("onlineCount");

const loadingScreen =
document.getElementById("loadingScreen");

/* =========================
User Login
========================= */

let username =
localStorage.getItem("chat_username");

if(!username){

username = prompt(
"نام کاربری خود را وارد کنید:"
);

if(
!username ||
username.trim() === ""
){

username =
"مهمان_" +
Math.floor(
Math.random()*9999
);

}

localStorage.setItem(
"chat_username",
username
);

}

socket.emit(
"join",
username
);

/* =========================
Loading Screen
========================= */

window.addEventListener(
"load",
()=>{

setTimeout(()=>{

loadingScreen.classList.add(
"hidden"
);

},1200);

}
);

/* =========================
Send Message
========================= */

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

sendBtn.addEventListener(
"click",
sendMessage
);

input.addEventListener(
"keydown",
(e)=>{

if(
e.key === "Enter"
){

sendMessage();

}

}
);

/* =========================
Create Message
========================= */

function addMessage(
msg,
isMe = false
){

const div =
document.createElement(
"div"
);

div.className =
isMe
? "message me"
: "message other";

const time =
new Date(
msg.time
).toLocaleTimeString(
"fa-IR",
{
hour:"2-digit",
minute:"2-digit"
}
);

div.innerHTML = `

<div class="username">
${msg.user}
</div><div class="text">
${msg.text}
</div><div class="time">
${time}
</div>`;

messages.appendChild(div);

messages.scrollTop =
messages.scrollHeight;

}

/* =========================
System Message
========================= */

function addSystemMessage(
text
){

const div =
document.createElement(
"div"
);

div.className =
"system";

div.textContent =
text;

messages.appendChild(
div
);

messages.scrollTop =
messages.scrollHeight;

}

/* =========================
Receive Messages
========================= */

socket.on(
"chatMessage",
(msg)=>{

addMessage(
msg,
msg.user === username
);

}
);

/* =========================
Message History
========================= */

socket.on(
"messageHistory",
(history)=>{

messages.innerHTML = "";

history.forEach(
(msg)=>{

addMessage(
msg,
msg.user === username
);

}
);

}
);

/* =========================
System Events
========================= */

socket.on(
"systemMessage",
(data)=>{

if(
typeof data ===
"string"
){

addSystemMessage(
data
);

}else{

addSystemMessage(
data.text
);

}

}
);

/* =========================
Online Users
========================= */

socket.on(
"usersList",
(users)=>{

onlineCount.textContent =
users.length;

}
);
/* =========================
Typing System
========================= */

const typingArea =
document.getElementById(
"typingArea"
);

let typingTimeout;

input.addEventListener(
"input",
()=>{

socket.emit(
"typing"
);

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
"typing",
(data)=>{

typingArea.textContent =
"${data.user} در حال تایپ است...";

}
);

socket.on(
"stopTyping",
()=>{

typingArea.textContent =
"";

}
);

/* =========================
Emoji Panel
========================= */

const emojiBtn =
document.getElementById(
"emojiBtn"
);

const emojiPanel =
document.getElementById(
"emojiPanel"
);

emojiBtn.addEventListener(
"click",
()=>{

emojiPanel.classList.toggle(
"show"
);

}
);

document
.querySelectorAll(".emoji")
.forEach((emoji)=>{

emoji.addEventListener(
"click",
()=>{

input.value +=
emoji.textContent;

input.focus();

}
);

});

/* =========================
Search Users
========================= */

const userSearch =
document.getElementById(
"userSearch"
);

userSearch.addEventListener(
"input",
()=>{

const value =
userSearch.value
.toLowerCase();

const users =
document.querySelectorAll(
".user-item"
);

users.forEach((user)=>{

const text =
user.textContent
.toLowerCase();

user.style.display =
text.includes(value)
? "flex"
: "none";

});

}
);

/* =========================
Toast Notification
========================= */

const toast =
document.getElementById(
"toast"
);

function showToast(
text
){

toast.textContent =
text;

toast.classList.add(
"show"
);

setTimeout(()=>{

toast.classList.remove(
"show"
);

},3000);

}

socket.on(
"privateMessage",
(msg)=>{

showToast(
"📩 پیام از ${msg.from}"
);

}
);
/* =========================
Profile Modal
========================= */

const profileBtn =
document.getElementById(
"profileBtn"
);

const profileModal =
document.getElementById(
"profileModal"
);

const closeProfile =
document.getElementById(
"closeProfile"
);

const profileName =
document.getElementById(
"profileName"
);

const profileAvatar =
document.getElementById(
"profileAvatar"
);

profileBtn.addEventListener(
"click",
()=>{

profileName.textContent =
username;

profileAvatar.textContent =
username
.charAt(0)
.toUpperCase();

profileModal.classList.add(
"show"
);

}
);

closeProfile.addEventListener(
"click",
()=>{

profileModal.classList.remove(
"show"
);

}
);

/* =========================
Private Modal
========================= */

const privateModal =
document.getElementById(
"privateModal"
);

const closePrivate =
document.getElementById(
"closePrivate"
);

closePrivate.addEventListener(
"click",
()=>{

privateModal.classList.remove(
"show"
);

}
);

/* =========================
Close Modals By Click
========================= */

window.addEventListener(
"click",
(e)=>{

if(
e.target === profileModal
){

profileModal.classList.remove(
"show"
);

}

if(
e.target === privateModal
){

privateModal.classList.remove(
"show"
);

}

}
);

/* =========================
Settings Panel
========================= */

const settingsBtn =
document.getElementById(
"settingsBtn"
);

const settingsPanel =
document.getElementById(
"settingsPanel"
);

settingsBtn.addEventListener(
"click",
()=>{

settingsPanel.classList.toggle(
"show"
);

}
);

/* =========================
Dark Mode
========================= */

const darkSwitch =
document.getElementById(
"darkModeSwitch"
);

const savedTheme =
localStorage.getItem(
"theme"
);

if(
savedTheme === "light"
){

document.body.classList.add(
"light"
);

darkSwitch.classList.remove(
"active"
);

}

darkSwitch.addEventListener(
"click",
()=>{

darkSwitch.classList.toggle(
"active"
);

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

/* =========================
Notification Switch
========================= */

const notificationSwitch =
document.getElementById(
"notificationSwitch"
);

const notifySaved =
localStorage.getItem(
"notify"
);

if(
notifySaved !== "off"
){

notificationSwitch.classList.add(
"active"
);

}

notificationSwitch.addEventListener(
"click",
()=>{

notificationSwitch.classList.toggle(
"active"
);

const enabled =
notificationSwitch.classList.contains(
"active"
);

localStorage.setItem(
"notify",
enabled
? "on"
: "off"
);

}
);
/* =========================
Online Users Render
========================= */

const usersList =
document.getElementById(
"usersList"
);

socket.on(
"usersList",
(users)=>{

onlineCount.textContent =
users.length;

usersList.innerHTML = "";

users.forEach((user)=>{

const item =
document.createElement(
"div"
);

item.className =
"user-item";

const avatar =
user.username
.charAt(0)
.toUpperCase();

item.innerHTML = `

<div class="user-avatar">
${avatar}
</div><div class="user-info"><div class="user-name">
${user.username}
</div><div class="user-status">
آنلاین
</div></div><div class="user-online">
</div>`;

item.addEventListener(
"click",
()=>{

if(
user.username ===
username
) return;

openPrivateChat(
user
);

}
);

usersList.appendChild(
item
);

});

}
);

/* =========================
Private Chat
========================= */

const privateContent =
document.getElementById(
"privateChatContent"
);

let selectedUser = null;

function openPrivateChat(
user
){

selectedUser = user;

privateModal.classList.add(
"show"
);

privateContent.innerHTML = `

<h3>
گفتگو با
${user.username}
</h3><br><input
id="privateInput"
type="text"
placeholder="پیام خصوصی..."
style="
width:100%;
height:45px;
padding:10px;
border:none;
border-radius:12px;
">

<br><br>

<button
id="privateSendBtn"
class="modal-btn primary">

ارسال

</button>`;

setTimeout(()=>{

const btn =
document.getElementById(
"privateSendBtn"
);

btn.addEventListener(
"click",
sendPrivateMessage
);

},50);

}

function sendPrivateMessage(){

const input =
document.getElementById(
"privateInput"
);

if(
!input ||
!selectedUser
) return;

const text =
input.value.trim();

if(!text) return;

socket.emit(
"privateMessage",
{
targetId:
selectedUser.id,
text
}
);

showToast(
"📩 پیام خصوصی ارسال شد"
);

input.value = "";

}

/* =========================
Receive Private Message
========================= */

socket.on(
"privateMessage",
(msg)=>{

showToast(
"📩 ${msg.from}"
);

if(
privateModal.classList.contains(
"show"
)
){

const div =
document.createElement(
"div"
);

div.style.marginTop =
"10px";

div.innerHTML = `

<b>
${msg.from}
</b><br>${msg.text}

`;

privateContent.appendChild(
div
);

}

}
);

/* =========================
Browser Notification
========================= */

if(
"Notification"
in window
){

Notification.requestPermission();

}

function pushNotification(
title,
body
){

if(
localStorage.getItem(
"notify"
) === "off"
){

return;

}

if(
Notification.permission ===
"granted"
){

new Notification(
title,
{
body
}
);

}

}

socket.on(
"chatMessage",
(msg)=>{

if(
msg.user !== username
){

pushNotification(
msg.user,
msg.text
);

}

}
);

/* =========================
Message Sound
========================= */

const audio =
new Audio(
"https://actions.google.com/sounds/v1/cartoon/pop.ogg"
);

socket.on(
"chatMessage",
(msg)=>{

if(
msg.user !== username
){

audio.play()
.catch(()=>{});

}

}
);

/* =========================
Welcome Toast
========================= */

setTimeout(()=>{

showToast(
"👋 خوش اومدی ${username}"
);

},1500);
/* =========================
   Ultimate Part 5
   Emoji Panel + Theme
========================= */

// Emoji Panel
emojiBtn.addEventListener("click", () => {
  emojiPanel.classList.toggle("show");
});

document.querySelectorAll(".emoji").forEach(emoji => {
  emoji.addEventListener("click", () => {
    messageInput.value += emoji.textContent;
    messageInput.focus();
  });
});

// Dark Mode
darkModeSwitch.addEventListener("click", () => {

  darkModeSwitch.classList.toggle("active");

  document.body.classList.toggle("light");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("light")
      ? "light"
      : "dark"
  );

});

// Load Saved Theme
if(localStorage.getItem("theme") === "light"){

  document.body.classList.add("light");

  darkModeSwitch.classList.remove("active");

}

// ESC Close Panels
document.addEventListener("keydown",(e)=>{

  if(e.key === "Escape"){

    emojiPanel.classList.remove("show");

    profileModal.classList.remove("show");

    privateModal.classList.remove("show");

    settingsPanel.classList.remove("show");

  }

});

// Auto Focus
window.addEventListener("load",()=>{

  messageInput.focus();

});
/* ==========================
ULTIMATE PART 6
Notifications + Sounds
========================== */

let unreadCount = 0;
let pageFocused = true;

/* Focus Detection */

window.addEventListener("focus", () => {
pageFocused = true;
unreadCount = 0;
document.title = "🌍 گروه چت همگانی Ultimate";
});

window.addEventListener("blur", () => {
pageFocused = false;
});

/* Notification Permission */

if ("Notification" in window) {
if (Notification.permission !== "granted") {
Notification.requestPermission();
}
}

/* Message Sound */

function playMessageSound() {
try {
const audio = new Audio(
"https://actions.google.com/sounds/v1/cartoon/pop.ogg"
);
audio.volume = 0.4;
audio.play();
} catch (err) {
console.log("Sound Error");
}
}

/* Browser Notification */

function showNotification(title, body) {

if (!("Notification" in window)) return;

if (Notification.permission !== "granted") return;

new Notification(title, {
    body: body,
    icon: "https://cdn-icons-png.flaticon.com/512/5968/5968756.png"
});

}

/* Unread Counter */

function increaseUnread(username, text) {

if (pageFocused) return;

unreadCount++;

document.title =
    `(${unreadCount}) پیام جدید`;

showNotification(
    username,
    text
);

playMessageSound();

}

/* Socket Messages */

socket.on("chatMessage", (msg) => {

if (
    msg.user !== username
) {

    increaseUnread(
        msg.user,
        msg.text
    );

}

});

/* Toast Upgrade */

function showToast(text) {

const toast =
    document.getElementById("toast");

if (!toast) return;

toast.textContent = text;

toast.classList.add("show");

setTimeout(() => {

    toast.classList.remove(
        "show"
    );

}, 3000);

}

/* Notification Events */

socket.on("privateMessage", (msg) => {

showToast(
    "📩 پیام خصوصی جدید"
);

increaseUnread(
    msg.from,
    msg.text
);

});

socket.on("systemMessage", () => {

playMessageSound();

});
/* ==========================
ULTIMATE PART 7
LocalStorage + Themes + Profile
========================== */

/* Save Username */

function saveProfile(name){

localStorage.setItem(
    "chat_username",
    name
);

}

function loadProfile(){

return (
    localStorage.getItem(
        "chat_username"
    ) || "کاربر"
);

}

/* Profile UI */

const profileName =
document.getElementById(
"profileName"
);

const profileAvatar =
document.getElementById(
"profileAvatar"
);

function updateProfile(){

const name =
loadProfile();

if(profileName){

    profileName.textContent =
    name;

}

if(profileAvatar){

    profileAvatar.textContent =
    name.charAt(0)
    .toUpperCase();

}

}

updateProfile();

/* Save Messages */

function saveMessages(){

const html =
document.getElementById(
    "messages"
).innerHTML;

localStorage.setItem(
    "chat_messages",
    html
);

}

function loadMessages(){

const saved =
localStorage.getItem(
    "chat_messages"
);

if(
    saved &&
    document.getElementById(
        "messages"
    )
){

    document.getElementById(
        "messages"
    ).innerHTML = saved;

}

}

loadMessages();

/* Auto Save */

setInterval(
saveMessages,
3000
);

/* Theme System */

const themes = {

default:
"",

purple:
"theme-purple",

green:
"theme-green",

orange:
"theme-orange"

};

function setTheme(theme){

document.body.classList.remove(
    "theme-purple",
    "theme-green",
    "theme-orange"
);

if(
    themes[theme]
){

    document.body.classList.add(
        themes[theme]
    );

}

localStorage.setItem(
    "chat_theme",
    theme
);

}

function loadTheme(){

const theme =
localStorage.getItem(
    "chat_theme"
);

if(theme){

    setTheme(theme);

}

}

loadTheme();

/* Theme Shortcuts */

document.addEventListener(
"keydown",
(e)=>{

    if(
        e.altKey &&
        e.key==="1"
    ){

        setTheme(
            "purple"
        );

    }

    if(
        e.altKey &&
        e.key==="2"
    ){

        setTheme(
            "green"
        );

    }

    if(
        e.altKey &&
        e.key==="3"
    ){

        setTheme(
            "orange"
        );

    }

}

);

/* Profile Modal */

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

profileBtn.onclick =
()=>{

    profileModal.classList.add(
        "show"
    );

};

}

/* Close Modals */

document
.querySelectorAll(
".modal-close"
)
.forEach(btn=>{

btn.onclick =
()=>{

    btn.closest(
        ".modal"
    ).classList.remove(
        "show"
    );

};

});
/* ==========================
ULTIMATE PART 8
Image + File Sharing
========================== */

/* File Button */

const attachBtn =
document.getElementById(
"attachBtn"
);

const fileInput =
document.createElement(
"input"
);

fileInput.type = "file";

fileInput.accept =
"image/*,.pdf,.zip,.txt";

fileInput.style.display =
"none";

document.body.appendChild(
fileInput
);

/* Open File Picker */

if(attachBtn){

attachBtn.onclick =
()=>{

    fileInput.click();

};

}

/* Upload File */

fileInput.addEventListener(
"change",
()=>{

    const file =
    fileInput.files[0];

    if(!file) return;

    /* Image */

    if(
        file.type.startsWith(
            "image/"
        )
    ){

        const reader =
        new FileReader();

        reader.onload =
        ()=>{

            socket.emit(
                "imageMessage",
                {
                    image:
                    reader.result,
                    name:
                    file.name
                }
            );

        };

        reader.readAsDataURL(
            file
        );

    }

    /* Other Files */

    else{

        socket.emit(
            "fileMessage",
            {
                name:
                file.name,
                size:
                file.size
            }
        );

    }

}

);

/* Receive Image */

socket.on(
"imageMessage",
(data)=>{

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "message other";

    div.innerHTML = `
    <div class="username">
    🖼️ تصویر
    </div>

    <img
    src="${data.image}"
    style="
    max-width:250px;
    border-radius:12px;
    margin-top:8px;
    cursor:pointer;
    ">
    `;

    messages.appendChild(
        div
    );

    messages.scrollTop =
    messages.scrollHeight;

}

);

/* Receive File */

socket.on(
"fileMessage",
(data)=>{

    const div =
    document.createElement(
        "div"
    );

    div.className =
    "system";

    div.innerHTML =
    `📎 ${data.name}`;

    messages.appendChild(
        div
    );

}

);

/* Image Preview */

document.addEventListener(
"click",
(e)=>{

    if(
        e.target.tagName ===
        "IMG"
    ){

        window.open(
            e.target.src,
            "_blank"
        );

    }

}

);
/* ==========================
ULTIMATE PART 9
Rooms + Reply + Edit + Delete
========================== */

let currentRoom = "global";
let replyMessageId = null;

/* ===== Rooms ===== */

function joinRoom(roomName){

currentRoom = roomName;

socket.emit(
    "joinRoom",
    roomName
);

showToast(
    "📁 ورود به اتاق " +
    roomName
);

}

socket.on(
"roomJoined",
(room)=>{

    currentRoom = room;

}

);

/* ===== Reply ===== */

function replyToMessage(
messageId
){

replyMessageId =
messageId;

showToast(
    "↩️ حالت پاسخ فعال شد"
);

}

/* ===== Edit ===== */

function editMessage(
messageId,
oldText
){

const newText =
prompt(
    "ویرایش پیام:",
    oldText
);

if(
    !newText ||
    !newText.trim()
) return;

socket.emit(
    "editMessage",
    {
        id:
        messageId,

        text:
        newText
    }
);

}

socket.on(
"messageEdited",
(data)=>{

    const msg =
    document.querySelector(
        `[data-id="${data.id}"]`
    );

    if(msg){

        const text =
        msg.querySelector(
            ".message-text"
        );

        if(text){

            text.textContent =
            data.text +
            " (ویرایش شد)";

        }

    }

}

);

/* ===== Delete ===== */

function deleteMessage(
messageId
){

if(
    !confirm(
        "حذف شود؟"
    )
) return;

socket.emit(
    "deleteMessage",
    messageId
);

}

socket.on(
"messageDeleted",
(id)=>{

    const msg =
    document.querySelector(
        `[data-id="${id}"]`
    );

    if(msg){

        msg.remove();

    }

}

);

/* ===== Context Menu ===== */

document.addEventListener(
"contextmenu",
(e)=>{

    const msg =
    e.target.closest(
        ".message"
    );

    if(!msg) return;

    e.preventDefault();

    const id =
    msg.dataset.id;

    const text =
    msg.innerText;

    const action =
    prompt(

"1 = پاسخ 2 = ویرایش 3 = حذف"
);

    if(
        action === "1"
    ){

        replyToMessage(
            id
        );

    }

    if(
        action === "2"
    ){

        editMessage(
            id,
            text
        );

    }

    if(
        action === "3"
    ){

        deleteMessage(
            id
        );

    }

}

);

/* ===== Send Reply ===== */

function sendMessage(){

const text =
messageInput.value.trim();

if(!text) return;

socket.emit(
    "chatMessage",
    {
        text,
        room:
        currentRoom,

        replyTo:
        replyMessageId
    }
);

replyMessageId = null;

messageInput.value = "";

}
