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
  transports: ['websocket', 'polling'],
  pingTimeout: 60000
});

// ---------- دیتابیس ----------
if (!fs.existsSync('data')) fs.mkdirSync('data');
const dbFile = path.join(__dirname, 'data', 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
await db.read();
db.data ||= { 
  users: [], 
  messages: [], 
  verificationCodes: [],
  userSettings: {}
};
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
const upload = multer({ 
  storage, 
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('فرمت فایل پشتیبانی نمی‌شود'));
  }
});

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
  ).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
};
const saveMessage = (msg) => { 
  db.data.messages.push(msg); 
  db.write(); 
};
const addUser = (user) => { 
  db.data.users.push(user); 
  db.write(); 
};
const updateUser = (userId, data) => {
  const user = findUserById(userId);
  if (user) {
    Object.assign(user, data);
    db.write();
    return user;
  }
  return null;
};

// ---------- مسیرهای API ----------
// ثبت‌نام
app.post('/api/register', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'شماره موبایل معتبر نیست' });
  }
  if (findUser(phone)) {
    return res.status(400).json({ error: 'این شماره قبلاً ثبت شده است' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // حذف کدهای قبلی
  db.data.verificationCodes = db.data.verificationCodes.filter(v => v.phone !== phone);
  db.data.verificationCodes.push({ phone, code, expires: Date.now() + 180000 });
  await db.write();
  console.log(`📱 کد تایید برای ${phone}: ${code}`);
  res.json({ success: true, code }); // برای تست
});

// تایید کد
app.post('/api/verify', async (req, res) => {
  const { phone, code } = req.body;
  const record = db.data.verificationCodes.find(v => v.phone === phone && v.code === code);
  if (!record) {
    return res.status(400).json({ error: 'کد نادرست است' });
  }
  if (Date.now() > record.expires) {
    return res.status(400).json({ error: 'کد منقضی شده است' });
  }
  db.data.verificationCodes = db.data.verificationCodes.filter(v => v.phone !== phone);
  await db.write();
  
  let user = findUser(phone);
  if (!user) {
    user = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      phone,
      username: 'کاربر_' + phone.slice(-4),
      fullName: '',
      bio: '',
      avatar: '',
      age: '',
      gender: '',
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: true
    };
    addUser(user);
  }
  res.json({ success: true, user });
});

// آپلود فایل
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'فایلی ارسال نشده' });
  }
  res.json({ 
    url: `/uploads/${req.file.filename}`, 
    filename: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype
  });
});

// دریافت پیام‌های یک چت
app.post('/api/messages', (req, res) => {
  const { userId, contactId } = req.body;
  const messages = getUserMessages(userId, contactId);
  res.json(messages);
});

// دریافت اطلاعات کاربر
app.get('/api/user/:id', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
  res.json(user);
});

// جستجوی کاربران
app.get('/api/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const results = db.data.users.filter(u => 
    u.username.toLowerCase().includes(query) || 
    u.phone.includes(query) ||
    (u.fullName && u.fullName.toLowerCase().includes(query))
  );
  res.json(results);
});

// ---------- روت اصلی ----------
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
  console.log(`🟢 ${socket.user.username} (${socket.user.phone}) آنلاین شد`);
  
  // بروزرسانی وضعیت آنلاین
  updateUser(socket.userId, { isOnline: true, lastSeen: new Date().toISOString() });
  socket.join(socket.userId);
  
  // ارسال لیست مخاطبین
  const contacts = db.data.users.filter(u => u.id !== socket.userId);
  socket.emit('contacts', contacts);
  
  // ارسال اطلاعات کاربر
  socket.emit('user_info', socket.user);

  // دریافت پیام خصوصی
  socket.on('private_message', (data) => {
    const { to, text, file, type } = data;
    if (!to) return;
    
    // ضد اسپم: بررسی تعداد پیام‌های اخیر
    const recentMessages = db.data.messages.filter(m => 
      m.from === socket.userId && 
      Date.now() - new Date(m.timestamp).getTime() < 10000
    );
    if (recentMessages.length >= 5) {
      socket.emit('error', 'لطفاً کمی صبر کنید (ضد اسپم)');
      return;
    }
    
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      from: socket.userId,
      to: to,
      text: text || '',
      file: file || null,
      type: type || 'text',
      timestamp: new Date().toISOString(),
      reactions: [],
      deleted: false,
      deletedFor: [],
      edited: false,
      seen: false
    };
    
    saveMessage(msg);
    
    // ارسال به گیرنده
    io.to(to).emit('new_message', msg);
    // ارسال به فرستنده
    socket.emit('new_message', msg);
    
    // بروزرسانی آخرین پیام در لیست مخاطبین
    io.emit('contact_update', { contactId: to, lastMessage: msg });
  });

  // ریاکشن
  socket.on('reaction', ({ messageId, emoji }) => {
    const msg = db.data.messages.find(m => m.id === messageId);
    if (!msg || msg.deleted) return;
    
    const existing = msg.reactions.find(r => r.userId === socket.userId);
    if (existing) {
      if (existing.emoji === emoji) {
        msg.reactions = msg.reactions.filter(r => r.userId !== socket.userId);
      } else {
        existing.emoji = emoji;
      }
    } else {
      msg.reactions.push({ userId: socket.userId, emoji });
    }
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
      io.to(msg.from).emit('message_deleted', { messageId, forEveryone: true });
      io.to(msg.to).emit('message_deleted', { messageId, forEveryone: true });
    } else {
      socket.emit('message_deleted', { messageId, forEveryone: false });
    }
  });

  // ویرایش پیام
  socket.on('edit_message', ({ messageId, text }) => {
    const msg = db.data.messages.find(m => m.id === messageId);
    if (!msg || msg.from !== socket.userId || msg.deleted) return;
    msg.text = text;
    msg.edited = true;
    db.write();
    io.to(msg.from).emit('message_edited', { messageId, text });
    io.to(msg.to).emit('message_edited', { messageId, text });
  });

  // وضعیت تایپ
  socket.on('typing', ({ to, isTyping }) => {
    socket.to(to).emit('user_typing', { from: socket.userId, isTyping });
  });

  // دیده شدن پیام
  socket.on('message_seen', ({ contactId }) => {
    const messages = db.data.messages.filter(m => 
      m.from === contactId && m.to === socket.userId && !m.seen
    );
    messages.forEach(m => {
      m.seen = true;
      m.seenAt = new Date().toISOString();
    });
    db.write();
    io.to(contactId).emit('messages_seen', { by: socket.userId, count: messages.length });
  });

  // آپدیت پروفایل
  socket.on('update_profile', (data) => {
    const updated = updateUser(socket.userId, data);
    if (updated) {
      io.emit('profile_updated', { userId: socket.userId, ...data });
      socket.emit('user_info', updated);
    }
  });

  // قطع اتصال
  socket.on('disconnect', () => {
    updateUser(socket.userId, { isOnline: false, lastSeen: new Date().toISOString() });
    io.emit('user_offline', { userId: socket.userId });
    console.log(`🔴 ${socket.user.username} قطع شد`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} راه‌اندازی شد`);
  console.log(`🌐 http://localhost:${PORT}`);
});
