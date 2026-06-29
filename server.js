require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const cors = require('cors');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

// ---------- دیتابیس ----------
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
await db.read();
db.data ||= { users: [], messages: [], verificationCodes: [] };
await db.write();

// ---------- آپلود فایل ----------
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- توابع دیتابیس ----------
const findUser = (phone) => db.data.users.find(u => u.phone === phone);
const findUserById = (id) => db.data.users.find(u => u.id === id);
const getUserMessages = (userId, contactId) => {
  return db.data.messages.filter(m => 
    (m.from === userId && m.to === contactId) || 
    (m.from === contactId && m.to === userId)
  );
};
const saveMessage = (msg) => { db.data.messages.push(msg); db.write(); };
const addUser = (user) => { db.data.users.push(user); db.write(); };
const updateUser = (userId, data) => {
  const user = findUserById(userId);
  if (user) Object.assign(user, data);
  db.write();
};

// ---------- مسیر آپلود ----------
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// ---------- ثبت‌نام و تایید ----------
app.post('/api/register', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) return res.status(400).json({ error: 'شماره نامعتبر' });
  if (findUser(phone)) return res.status(400).json({ error: 'قبلاً ثبت شده' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.data.verificationCodes.push({ phone, code, expires: Date.now() + 120000 });
  await db.write();
  console.log(`📱 کد تایید برای ${phone}: ${code}`);
  res.json({ success: true, code }); // برای تست
});

app.post('/api/verify', async (req, res) => {
  const { phone, code } = req.body;
  const record = db.data.verificationCodes.find(v => v.phone === phone && v.code === code);
  if (!record) return res.status(400).json({ error: 'کد نادرست' });
  if (Date.now() > record.expires) return res.status(400).json({ error: 'کد منقضی شد' });
  db.data.verificationCodes = db.data.verificationCodes.filter(v => v.phone !== phone);
  await db.write();
  const user = {
    id: 'user_' + Date.now(),
    phone,
    username: 'کاربر_' + phone.slice(-4),
    avatar: '',
    bio: '',
    createdAt: new Date().toISOString(),
    settings: { theme: 'dark' }
  };
  addUser(user);
  res.json({ success: true, user });
});

// ---------- بقیه روت‌ها ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Socket.IO ----------
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) return next(new Error('Unauthorized'));
  const user = findUserById(userId);
  if (!user) return next(new Error('User not found'));
  socket.userId = userId;
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  console.log(`🟢 ${socket.user.username} آنلاین شد`);
  socket.join(socket.userId);

  // لیست مخاطب‌ها
  socket.emit('contacts', db.data.users.filter(u => u.id !== socket.userId));

  // پیام خصوصی
  socket.on('private_message', (data) => {
    const { to, text, file } = data;
    const msg = {
      id: 'msg_' + Date.now(),
      from: socket.userId,
      to,
      text: text || '',
      file: file || null,
      timestamp: new Date().toISOString(),
      reactions: [],
      deleted: false,
      deletedFor: []
    };
    saveMessage(msg);
    io.to(to).emit('new_message', msg);
    socket.emit('new_message', msg);
  });

  // ریاکشن
  socket.on('reaction', ({ messageId, emoji }) => {
    const msg = db.data.messages.find(m => m.id === messageId);
    if (!msg) return;
    const existing = msg.reactions.find(r => r.userId === socket.userId);
    if (existing) existing.emoji = emoji;
    else msg.reactions.push({ userId: socket.userId, emoji });
    db.write();
    io.to(msg.from).emit('message_reaction', { messageId, reactions: msg.reactions });
    io.to(msg.to).emit('message_reaction', { messageId, reactions: msg.reactions });
  });

  // حذف پیام
  socket.on('delete_message', ({ messageId, forEveryone }) => {
    const msg = db.data.messages.find(m => m.id === messageId);
    if (!msg || msg.from !== socket.userId) return;
    if (forEveryone) {
      msg.deleted = true;
      db.write();
      io.to(msg.from).emit('message_deleted', messageId);
      io.to(msg.to).emit('message_deleted', messageId);
    } else {
      socket.emit('message_deleted', messageId);
    }
  });

  // تایپ
  socket.on('typing', ({ to, isTyping }) => {
    socket.to(to).emit('user_typing', { from: socket.userId, isTyping });
  });

  // آپدیت پروفایل
  socket.on('update_profile', (data) => {
    updateUser(socket.userId, data);
    io.emit('profile_updated', { userId: socket.userId, ...data });
  });

  socket.on('disconnect', () => {
    console.log(`🔴 ${socket.user.username} قطع شد`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} راه‌اندازی شد`);
});
