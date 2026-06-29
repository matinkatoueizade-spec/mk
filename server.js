const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
//  حافظه موقت (برای دمو)
// ============================================
let messages = [];
let users = {};
const MAX_MESSAGES = 500;

// ============================================
//  Socket.io
// ============================================
io.on('connection', (socket) => {
    console.log('🟢 کاربر متصل:', socket.id);

    // ارسال پیام‌های قبلی
    socket.emit('load_messages', messages);

    // کاربر جدید
    socket.on('user_join', (userData) => {
        users[socket.id] = {
            id: socket.id,
            ...userData
        };
        io.emit('user_joined', {
            id: socket.id,
            ...userData
        });
        io.emit('online_count', Object.keys(users).length);
        console.log(`👤 ${userData.username} وارد شد`);
    });

    // ارسال پیام
    socket.on('send_message', (msg) => {
        const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            sender_id: socket.id,
            username: users[socket.id]?.username || 'کاربر',
            avatar_color: users[socket.id]?.avatar_color || '#c4956a',
            message: msg.message || '',
            sticker: msg.sticker || null,
            media: msg.media || null,
            reply_to: msg.reply_to || null,
            is_private: msg.is_private || false,
            recipient_id: msg.recipient_id || null,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
            edited: false,
            deleted: false,
            reactions: [],
            bio: users[socket.id]?.bio || '',
            age: users[socket.id]?.age || '',
            email: users[socket.id]?.email || ''
        };

        messages.push(newMsg);
        if (messages.length > MAX_MESSAGES) messages.shift();

        // ارسال به همه یا فقط کاربر مشخص
        if (newMsg.is_private && newMsg.recipient_id) {
            io.to(newMsg.recipient_id).emit('new_message', newMsg);
            socket.emit('new_message', newMsg);
        } else {
            io.emit('new_message', newMsg);
        }
    });

    // واکنش به پیام
    socket.on('add_reaction', ({ msgId, emoji }) => {
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
            if (!msg.reactions) msg.reactions = [];
            const idx = msg.reactions.indexOf(emoji);
            if (idx > -1) {
                msg.reactions.splice(idx, 1);
            } else {
                msg.reactions.push(emoji);
            }
            io.emit('message_updated', msg);
        }
    });

    // حذف برای همه
    socket.on('delete_for_all', (msgId) => {
        const msg = messages.find(m => m.id === msgId);
        if (msg && msg.sender_id === socket.id) {
            msg.deleted = true;
            io.emit('message_updated', msg);
        }
    });

    // تایپینگ
    socket.on('typing', (data) => {
        socket.broadcast.emit('user_typing', {
            userId: socket.id,
            username: users[socket.id]?.username || 'کاربر',
            isTyping: data.isTyping
        });
    });

    // قطع ارتباط
    socket.on('disconnect', () => {
        console.log('🔴 کاربر قطع:', socket.id);
        delete users[socket.id];
        io.emit('online_count', Object.keys(users).length);
        io.emit('user_left', socket.id);
    });
});

// ============================================
//  API Routes
// ============================================
app.get('/api/messages', (req, res) => {
    res.json(messages);
});

app.get('/api/users', (req, res) => {
    const list = Object.values(users).map(u => ({
        id: u.id,
        username: u.username,
        avatar_color: u.avatar_color,
        bio: u.bio,
        age: u.age
    }));
    res.json(list);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
//  شروع سرور
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 سرور روی پورت ${PORT} اجرا شد`);
    console.log(`🌐 http://localhost:${PORT}`);
});
