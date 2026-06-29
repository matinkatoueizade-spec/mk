const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// سرویس فایل‌های استاتیک (public)
app.use(express.static(path.join(__dirname, 'public')));

// همه درخواست‌ها به index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// راه‌اندازی Socket.IO با تنظیمات رندر
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

// ---------- حافظه موقت ----------
const messages = [];        // حداکثر ۵۰ پیام
const users = new Map();    // socket.id -> { username, color }

// ---------- رنگ ثابت بر اساس نام ----------
function getUserColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
}

// ---------- اتصالات ----------
io.on('connection', (socket) => {
  console.log(`🟢 متصل: ${socket.id}`);

  // ثبت نام کاربر
  socket.on('register', (username) => {
    const cleanName = username?.trim().slice(0, 20) || 'ناشناس';
    const color = getUserColor(cleanName);
    
    users.set(socket.id, { username: cleanName, color });
    
    // ارسال تاریخچه و تایید ثبت‌نام
    socket.emit('registered', { username: cleanName, color });
    socket.emit('history', messages);
    
    // اعلام به همه
    io.emit('user_joined', {
      id: socket.id,
      username: cleanName,
      color,
      onlineList: getOnlineList()
    });
    io.emit('user_count', users.size);
  });

  // دریافت پیام
  socket.on('message', (text) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    const msg = {
      id: Date.now().toString(36),
      userId: socket.id,
      username: user.username,
      color: user.color,
      text: text.trim().slice(0, 500),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };
    
    messages.push(msg);
    if (messages.length > 50) messages.shift();
    
    io.emit('message', msg);
  });

  // وضعیت تایپ
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('typing_status', {
      userId: socket.id,
      username: user.username,
      isTyping
    });
  });

  // قطع اتصال
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    
    if (user) {
      io.emit('user_left', { userId: socket.id, username: user.username });
      io.emit('user_count', users.size);
      io.emit('online_list', getOnlineList());
    }
    console.log(`🔴 قطع: ${socket.id}`);
  });
});

// لیست آنلاین‌ها
function getOnlineList() {
  const list = [];
  for (const [id, user] of users.entries()) {
    list.push({ id, username: user.username, color: user.color });
  }
  return list;
}

// ---------- راه‌اندازی ----------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} روشن شد`);
  console.log(`🌐 http://localhost:${PORT}`);
});
