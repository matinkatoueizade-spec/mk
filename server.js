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

// ========== دیتابیس ==========
if (!fs.existsSync('data')) fs.mkdirSync('data');
const dbFile = path.join(__dirname, 'data', 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
await db.read();
db.data ||= { 
  users: [], 
  messages: [], 
  groups: [],
  verificationCodes: []
};
await db.write();

// ========== آپلود فایل ==========
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
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// ========== توابع دیتابیس ==========
const findUser = (phone) => db.data.users.find(u => u.phone === phone);
const findUserById = (id) => db.data.users.find(u => u.id === id);
const findUserByUsername = (username) => db.data.users.find(u => u.username === username);
const getMessages = (userId, contactId) => {
  return db.data.messages.filter(m => 
    (m.from === userId && m.to === contactId) ||
    (m.from === contactId && m.to === userId)
  ).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
};
const getGroupMessages = (groupId) => {
  return db.data.messages.filter(m => m.groupId === groupId)
    .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// ========== API ==========
app.post('/api/register', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'شماره موبایل معتبر نیست' });
  }
  if (findUser(phone)) {
    return res.status(400).json({ error: 'این شماره قبلاً ثبت شده است' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.data.verificationCodes = db.data.verificationCodes.filter(v => v.phone !== phone);
  db.data.verificationCodes.push({ phone, code, expires: Date.now() + 180000 });
  await db.write();
  console.log(`📱 کد تایید برای ${phone}: ${code}`);
  res.json({ success: true, code });
});

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
      username: 'user_' + phone.slice(-4),
      fullName: '',
      bio: 'سلام! من از متین‌گرام استفاده می‌کنم',
      avatar: '',
      age: '',
      gender: '',
      email: '',
      website: '',
      location: '',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      settings: {
        theme: 'dark',
        fontSize: 'medium',
        fontFamily: 'default',
        notifications: true,
        sound: true
      },
      contacts: [],
      groups: []
    };
    db.data.users.push(user);
    await db.write();
  }
  res.json({ success: true, user });
});

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

app.post('/api/create-group', async (req, res) => {
  const { name, members, creatorId } = req.body;
  const group = {
    id: 'group_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: name || 'گروه جدید',
    creator: creatorId,
    members: [creatorId, ...members],
    createdAt: new Date().toISOString(),
    avatar: ''
  };
  db.data.groups.push(group);
  await db.write();
  res.json({ success: true, group });
});

app.get('/api/user/:id', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
  res.json(user);
});

app.get('/api/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const results = db.data.users.filter(u => 
    u.id !== req.query.userId &&
    (u.username.toLowerCase().includes(query) || 
     u.phone.includes(query) ||
     (u.fullName && u.fullName.toLowerCase().includes(query)))
  );
  res.json(results);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== Socket.IO ==========
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
  
  const user = findUserById(socket.userId);
  if (user) {
    user.isOnline = true;
    user.lastSeen = new Date().toISOString();
    db.write();
  }
  
  socket.join(socket.userId);
  
  // لیست مخاطبین
  const contacts = db.data.users.filter(u => 
    user.contacts.includes(u.id) && u.id !== socket.userId
  );
  socket.emit('contacts', contacts);
  
  // لیست گروه‌ها
  const groups = db.data.groups.filter(g => g.members.includes(socket.userId));
  socket.emit('groups', groups);
  
  // اطلاعات کاربر
  socket.emit('user_info', user);

  // ========== پیام خصوصی ==========
  socket.on('private_message', (data) => {
    const { to, text, file, replyTo } = data;
    if (!to) return;
    
    // ضد اسپم
    const recent = db.data.messages.filter(m => 
      m.from === socket.userId && 
      Date.now() - new Date(m.timestamp).getTime() < 10000
    );
    if (recent.length >= 5) {
      socket.emit('error', 'لطفاً کمی صبر کنید (ضد اسپم)');
      return;
    }
    
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      from: socket.userId,
      to: to,
      text: text || '',
      file: file || null,
      replyTo: replyTo || null,
      timestamp: new Date().toISOString(),
      reactions: [],
      deleted: false,
      edited: false,
      seen: false,
      seenAt: null
    };
    
    db.data.messages.push(msg);
    db.write();
    
    io.to(to).emit('new_message', msg);
    socket.emit('new_message', msg);
  });

  // ========== پیام گروهی ==========
  socket.on('group_message', (data) => {
    const { groupId, text, file, replyTo } = data;
    if (!groupId) return;
    
    const group = db.data.groups.find(g => g.id === groupId);
    if (!group || !group.members.includes(socket.userId)) return;
    
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      from: socket.userId,
      groupId: groupId,
      text: text || '',
      file: file || null,
      replyTo: replyTo || null,
      timestamp: new Date().toISOString(),
      reactions: [],
      deleted: false,
      edited: false
    };
    
    db.data.messages.push(msg);
    db.write();
    
    group.members.forEach(memberId => {
      io.to(memberId).emit('new_group_message', msg);
    });
  });

  // ========== ریاکشن ==========
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
    
    if (msg.groupId) {
      const group = db.data.groups.find(g => g.id === msg.groupId);
      if (group) {
        group.members.forEach(memberId => {
          io.to(memberId).emit('message_reaction', { messageId, reactions: msg.reactions });
        });
      }
    } else {
      io.to(msg.from).emit('message_reaction', { messageId, reactions: msg.reactions });
      io.to(msg.to).emit('message_reaction', { messageId, reactions: msg.reactions });
    }
  });

  // ========== حذف پیام ==========
  socket.on('delete_message', ({ messageId, forEveryone }) => {
    const msg = db.data.messages.find(m => m.id === messageId);
    if (!msg || msg.from !== socket.userId) return;
    
    if (forEveryone) {
      msg.deleted = true;
      db.write();
      if (msg.groupId) {
        const group = db.data.groups.find(g => g.id === msg.groupId);
        if (group) {
          group.members.forEach(memberId => {
            io.to(memberId).emit('message_deleted', { messageId, forEveryone: true });
          });
        }
      } else {
        io.to(msg.from).emit('message_deleted', { messageId, forEveryone: true });
        io.to(msg.to).emit('message_deleted', { messageId, forEveryone: true });
      }
    } else {
      socket.emit('message_deleted', { messageId, forEveryone: false });
    }
  });

  // ========== ویرایش پیام ==========
  socket.on('edit_message', ({ messageId, text }) => {
    const msg = db.data.messages.find(m => m.id === messageId);
    if (!msg || msg.from !== socket.userId || msg.deleted) return;
    msg.text = text;
    msg.edited = true;
    msg.editedAt = new Date().toISOString();
    db.write();
    
    if (msg.groupId) {
      const group = db.data.groups.find(g => g.id === msg.groupId);
      if (group) {
        group.members.forEach(memberId => {
          io.to(memberId).emit('message_edited', { messageId, text });
        });
      }
    } else {
      io.to(msg.from).emit('message_edited', { messageId, text });
      io.to(msg.to).emit('message_edited', { messageId, text });
    }
  });

  // ========== وضعیت تایپ ==========
  socket.on('typing', ({ to, isTyping }) => {
    socket.to(to).emit('user_typing', { from: socket.userId, isTyping });
  });

  socket.on('group_typing', ({ groupId, isTyping }) => {
    const group = db.data.groups.find(g => g.id === groupId);
    if (group) {
      group.members.forEach(memberId => {
        if (memberId !== socket.userId) {
          io.to(memberId).emit('group_typing', { groupId, from: socket.userId, isTyping });
        }
      });
    }
  });

  // ========== دیده شدن پیام ==========
  socket.on('message_seen', ({ contactId }) => {
    const msgs = db.data.messages.filter(m => 
      m.from === contactId && m.to === socket.userId && !m.seen
    );
    msgs.forEach(m => {
      m.seen = true;
      m.seenAt = new Date().toISOString();
    });
    db.write();
    io.to(contactId).emit('messages_seen', { by: socket.userId, count: msgs.length });
  });

  // ========== آپدیت پروفایل ==========
  socket.on('update_profile', (data) => {
    const user = findUserById(socket.userId);
    if (user) {
      Object.assign(user, data);
      db.write();
      io.emit('profile_updated', { userId: socket.userId, ...data });
      socket.emit('user_info', user);
    }
  });

  // ========== آپدیت تنظیمات ==========
  socket.on('update_settings', (data) => {
    const user = findUserById(socket.userId);
    if (user) {
      user.settings = { ...user.settings, ...data };
      db.write();
      socket.emit('settings_updated', user.settings);
    }
  });

  // ========== اضافه کردن مخاطب ==========
  socket.on('add_contact', ({ contactId }) => {
    const user = findUserById(socket.userId);
    if (user && !user.contacts.includes(contactId)) {
      user.contacts.push(contactId);
      db.write();
      const contact = findUserById(contactId);
      socket.emit('contact_added', contact);
    }
  });

  // ========== قطع اتصال ==========
  socket.on('disconnect', () => {
    const user = findUserById(socket.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date().toISOString();
      db.write();
      io.emit('user_offline', { userId: socket.userId });
    }
    console.log(`🔴 ${socket.user.username} قطع شد`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور روی پورت ${PORT} راه‌اندازی شد`);
});
