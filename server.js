require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ماژول‌های خودمان
const chatController = require('./src/controllers/chatController');
const messageStore = require('./src/services/messageStore');

const app = express();
const server = http.createServer(app);

// ---------- امنیت و بهینه‌سازی ----------
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting (جلوگیری از اسپم)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 100
});
app.use('/api/', limiter);

// ---------- راه‌اندازی Socket.IO ----------
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ---------- اتصال کنترلر چت به Socket ----------
chatController(io);

// ---------- روت ساده برای سلامتی ----------
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ---------- همه‌ی روت‌های دیگر به index.html ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- شروع سرور ----------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور حرفه‌ای متین روی پورت ${PORT} روشن شد`);
  console.log(`🌐 آدرس: http://localhost:${PORT}`);
  console.log(`📨 ظرفیت حافظه: ${process.env.MAX_MESSAGES || 100} پیام`);
});
