// ═══════════════════════════════════════════
//   STATE
// ═══════════════════════════════════════════
const STATE = {
    myId: localStorage.getItem('pm_user_id') || 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    myName: localStorage.getItem('pm_username') || '',
    myBio: localStorage.getItem('pm_bio') || '',
    myAge: localStorage.getItem('pm_age') || '',
    myEmail: localStorage.getItem('pm_email') || '',
    myColor: localStorage.getItem('pm_color') || '#c4956a',
    theme: localStorage.getItem('pm_theme') || 'dark',
    fontSize: parseInt(localStorage.getItem('pm_font_size')) || 15,
    messages: [],
    replyTarget: null,
    ctxTarget: null,
    lastSendTime: 0,
    isLoggedIn: false,
    pendingCode: '',
    privateChatWith: null,
    socket: null,
};

localStorage.setItem('pm_user_id', STATE.myId);

// ── Emojis & Stickers ──
const EMOJIS = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚',
    '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜',
    '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
    '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐',
    '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗',
    '💖', '✨', '⭐', '🌟', '💫', '🔥', '💯', '🎉', '🎊', '🎁', '🎈', '🎀', '🎂', '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍩', '🍪'
];

const STICKERS = ['😊', '😂', '🤣', '❤️', '🔥', '💯', '🎉', '✨', '⭐', '🌟',
    '👋', '🙏', '🤝', '✌️', '🤟', '👌', '👍', '👎', '👊', '✊',
    '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🍕', '🍔', '🌭', '🍿', '🎂', '🍩', '🍪', '☕', '🍵', '🍺'
];

// ── DOM ──
const $ = id => document.getElementById(id);
const chatEl = $('chat');
const messageEl = $('message');
const counterEl = $('counter-small');
const headerAv = $('header-avatar');
const hdrAvText = $('hdr-av-text');
const headerTitle = $('header-title');
const headerStatus = $('header-status');
const onlineCount = $('online-count');
const loginModal = $('login-modal');
const verifyModal = $('verify-modal');
const profileModal = $('profile-modal');
const ctxMenu = $('ctx-menu');
const ctxDelAllItem = $('ctx-delete-all-item');
const replyBar = $('reply-bar');
const replyBarName = $('reply-bar-name');
const replyBarText = $('reply-bar-text');
const settingsPanel = $('settings-panel');
const userPopup = $('user-popup');
const toastEl = $('toast');
const toastText = $('toast-text');
const fileInput = $('file-input');

// ═══════════════════════════════════════════
//   UTILITY
// ═══════════════════════════════════════════
function escapeHtml(t) {
    if (!t) return '';
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function avatarLetter(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
}

function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (today - msgD) / 86400000;
    if (diff === 0) return 'امروز';
    if (diff === 1) return 'دیروز';
    return d.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', year: diff > 365 ? 'numeric' : undefined });
}

function truncate(t, n = 60) {
    return t && t.length > n ? t.slice(0, n) + '…' : t;
}

function randomColor() {
    const colors = ['#c4956a', '#8a6a4a', '#b88a60', '#7aa88a', '#a890b8', '#e8c9a8', '#6B8F71', '#9B8EA8'];
    return colors[Math.floor(Math.random() * colors.length)];
}

let toastTimer;

function showToast(msg, icon = '✨', dur = 2800) {
    toastText.textContent = msg;
    toastEl.querySelector('.toast-icon').textContent = icon;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
}

function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// ═══════════════════════════════════════════
//   SOCKET.IO
// ═══════════════════════════════════════════
function connectSocket() {
    STATE.socket = io();

    STATE.socket.on('connect', () => {
        console.log('✅ متصل به سرور');
        // ارسال اطلاعات کاربر
        if (STATE.isLoggedIn) {
            STATE.socket.emit('user_join', {
                username: STATE.myName,
                avatar_color: STATE.myColor,
                bio: STATE.myBio,
                age: STATE.myAge,
                email: STATE.myEmail
            });
        }
    });

    STATE.socket.on('load_messages', (msgs) => {
        STATE.messages = msgs || [];
        renderMessages();
    });

    STATE.socket.on('new_message', (msg) => {
        STATE.messages.push(msg);
        renderMessages();
        scrollToBottom();
    });

    STATE.socket.on('message_updated', (msg) => {
        const idx = STATE.messages.findIndex(m => m.id === msg.id);
        if (idx > -1) {
            STATE.messages[idx] = msg;
            renderMessages();
        }
    });

    STATE.socket.on('online_count', (count) => {
        onlineCount.textContent = `(${count} آنلاین)`;
    });

    STATE.socket.on('user_joined', (user) => {
        showToast(`${user.username} وارد شد`, '👤', 1500);
    });

    STATE.socket.on('user_left', (id) => {
        // می‌توانید پیام خروج نمایش دهید
    });

    STATE.socket.on('user_typing', ({ userId, username, isTyping }) => {
        // نمایش تایپ ایندیکیتور
    });

    STATE.socket.on('disconnect', () => {
        console.log('🔴 قطع ارتباط با سرور');
        headerStatus.innerHTML = `<span style="color:#c47a7a;">●</span> قطع`;
    });
}

// ═══════════════════════════════════════════
//   LOGIN
// ═══════════════════════════════════════════
window.requestCode = function() {
    const identifier = $('login-identifier').value.trim();
    if (!identifier) {
        showToast('لطفاً شماره یا ایمیل را وارد کنید', '⚠️');
        return;
    }
    STATE.pendingIdentifier = identifier;
    const code = generateCode();
    STATE.pendingCode = code;

    console.log('🔑 کد تایید شما:', code);
    $('code-display').textContent = code;

    loginModal.classList.add('hidden');
    verifyModal.classList.remove('hidden');

    showToast(`کد: ${code} (در کنسول هم هست)`, '📱', 4000);
    $('verify-code').value = '';
    $('verify-code').focus();
};

window.verifyCode = function() {
    const input = $('verify-code').value.trim();
    if (input === STATE.pendingCode) {
        verifyModal.classList.add('hidden');
        profileModal.classList.remove('hidden');
        $('profile-name').value = STATE.myName || '';
        $('profile-bio').value = STATE.myBio || '';
        $('profile-age').value = STATE.myAge || '';
        updateProfilePreview();
    } else {
        showToast('کد نادرست است', '❌');
        $('verify-code').value = '';
        $('verify-code').focus();
    }
};

window.goBackToLogin = function() {
    verifyModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
};

function updateProfilePreview() {
    const name = $('profile-name').value || '?';
    const av = $('profile-avatar-preview');
    av.textContent = avatarLetter(name);
    av.style.background = STATE.myColor || randomColor();
}

$('profile-name').addEventListener('input', updateProfilePreview);

window.saveProfile = function() {
    const name = $('profile-name').value.trim();
    const bio = $('profile-bio').value.trim();
    const age = $('profile-age').value.trim();

    if (!name) {
        showToast('لطفاً نام خود را وارد کنید', '⚠️');
        return;
    }

    STATE.myName = name;
    STATE.myBio = bio;
    STATE.myAge = age;
    STATE.myEmail = STATE.pendingIdentifier || '';
    STATE.myColor = randomColor();

    localStorage.setItem('pm_username', STATE.myName);
    localStorage.setItem('pm_bio', STATE.myBio);
    localStorage.setItem('pm_age', STATE.myAge);
    localStorage.setItem('pm_email', STATE.myEmail);
    localStorage.setItem('pm_color', STATE.myColor);

    STATE.isLoggedIn = true;
    profileModal.classList.add('hidden');

    showToast(`خوش آمدید ${STATE.myName}`, '👋');
    initApp();
};

// ═══════════════════════════════════════════
//   THEME & SETTINGS
// ═══════════════════════════════════════════
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    STATE.theme = theme;
    localStorage.setItem('pm_theme', theme);
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === theme);
    });
}

function applyFontSize(size) {
    document.documentElement.style.setProperty('--font-size', size + 'px');
    STATE.fontSize = size;
    localStorage.setItem('pm_font_size', size);
    $('font-size-label').textContent = size;
}

applyTheme(STATE.theme);
applyFontSize(STATE.fontSize);

document.querySelectorAll('.theme-option').forEach(el => {
    el.addEventListener('click', function() {
        applyTheme(this.dataset.theme);
    });
});

$('font-size-range').addEventListener('input', function() {
    applyFontSize(parseInt(this.value));
});

window.openSettings = function() {
    if (!STATE.isLoggedIn) {
        showToast('لطفاً ابتدا وارد شوید', '⚠️');
        return;
    }
    settingsPanel.classList.remove('hidden');
    $('font-size-range').value = STATE.fontSize;
    $('font-size-label').textContent = STATE.fontSize;
};

window.closeSettings = function() {
    settingsPanel.classList.add('hidden');
};

window.saveSettings = function() {
    showToast('تنظیمات ذخیره شد', '✅');
    closeSettings();
};

settingsPanel.addEventListener('click', function(e) {
    if (e.target === this) closeSettings();
});

// ═══════════════════════════════════════════
//   HEADER
// ═══════════════════════════════════════════
function updateHeader() {
    hdrAvText.textContent = avatarLetter(STATE.myName);
    headerAv.style.background = STATE.myColor || '#c4956a';
}

// ═══════════════════════════════════════════
//   RENDER MESSAGES
// ═══════════════════════════════════════════
function renderMessages() {
    let filtered = STATE.messages;
    if (STATE.privateChatWith) {
        filtered = STATE.messages.filter(m =>
            (m.sender_id === STATE.privateChatWith && m.recipient_id === STATE.myId) ||
            (m.sender_id === STATE.myId && m.recipient_id === STATE.privateChatWith) ||
            (m.is_private && m.sender_id === STATE.privateChatWith) ||
            (m.is_private && m.recipient_id === STATE.privateChatWith)
        );
        if (filtered.length === 0) {
            chatEl.innerHTML = `
                <div style="text-align:center;color:var(--text-muted);margin-top:80px;font-size:15px;">
                    <div style="font-size:56px;margin-bottom:16px;">🔒</div>
                    <div style="font-weight:600;font-size:18px;">چت خصوصی</div>
                    <div style="font-size:13px;margin-top:6px;">هنوز پیامی ارسال نشده</div>
                </div>
            `;
            return;
        }
    } else {
        filtered = STATE.messages.filter(m => !m.is_private || m.sender_id === STATE.myId);
    }

    if (filtered.length === 0) {
        chatEl.innerHTML = `
            <div style="text-align:center;color:var(--text-muted);margin-top:80px;font-size:15px;">
                <div style="font-size:56px;margin-bottom:16px;">💬</div>
                <div style="font-weight:600;font-size:18px;">هنوز پیامی نیست</div>
                <div style="font-size:13px;margin-top:6px;">اولین پیام را شما بفرستید!</div>
            </div>
        `;
        return;
    }

    const nearBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 140;
    let html = '',
        lastDate = '';

    filtered.forEach(msg => {
        const day = formatDate(msg.created_at || msg.timestamp);
        if (day !== lastDate) {
            html += `<div class="date-sep">${day}</div>`;
            lastDate = day;
        }
        html += buildBubble(msg);
    });

    chatEl.innerHTML = html;
    if (nearBottom || filtered.length === 0) {
        scrollToBottom();
    }
}

function buildBubble(msg) {
    const isOwn = msg.sender_id === STATE.myId;
    const deleted = msg.deleted === true;
    const edited = msg.edited === true;
    const color = msg.avatar_color || '#c4956a';
    const name = escapeHtml(msg.username || 'کاربر');
    const time = formatTime(msg.created_at || msg.timestamp || Date.now());

    let nameLine = '';
    if (!isOwn && !deleted) {
        nameLine =
            `<span class="bubble-name" style="color:${color};" onclick="showUserProfile('${msg.sender_id}')">${name}</span>`;
    }

    let replyHtml = '';
    if (msg.reply_to) {
        const ref = STATE.messages.find(m => m.id === msg.reply_to);
        if (ref && !ref.deleted) {
            replyHtml = `
                <div class="reply-preview" onclick="scrollToMsg('${msg.reply_to}')">
                    <div class="reply-preview-name">${escapeHtml(ref.username || 'کاربر')}</div>
                    <div class="reply-preview-text">${escapeHtml(truncate(ref.message || 'پیام', 60))}</div>
                </div>`;
        }
    }

    let content = '';
    if (deleted) {
        content = `<span class="bubble-text" style="color:var(--text-muted);font-style:italic;">🚫 پیام حذف شد</span>`;
    } else {
        if (msg.sticker) {
            content += `<div class="bubble-sticker">${msg.sticker}</div>`;
        }
        if (msg.media) {
            content += buildMediaHtml(msg.media);
        }
        if (msg.message) {
            content += `<span class="bubble-text">${escapeHtml(msg.message)}</span>`;
        }
        if (!content) {
            content = `<span class="bubble-text" style="color:var(--text-muted);">(پیام خالی)</span>`;
        }
    }

    let reactionsHtml = '';
    if (msg.reactions && msg.reactions.length > 0) {
        const grouped = {};
        msg.reactions.forEach(r => {
            grouped[r] = (grouped[r] || 0) + 1;
        });
        reactionsHtml = `<div class="reactions">`;
        for (const [emoji, count] of Object.entries(grouped)) {
            reactionsHtml +=
                `<span class="reaction" onclick="addReaction('${msg.id}','${emoji}')">${emoji} <span class="reaction-count">${count}</span></span>`;
        }
        reactionsHtml += `</div>`;
    }

    const editBadge = edited ? `<span class="bubble-edited" style="font-size:10px;color:var(--text-muted);">ویرایش</span>` : '';
    const isPrivate = msg.is_private ? '🔒 ' : '';

    const avatarHtml = !isOwn && !deleted ?
        `<div class="msg-avatar" style="background:${color};" onclick="showUserProfile('${msg.sender_id}')" title="مشاهده پروفایل">${avatarLetter(msg.username)}</div>` :
        '';

    return `
        <div class="msg-row ${isOwn ? 'own' : 'other'}" data-id="${msg.id}"
             oncontextmenu="handleCtxMenu(event,'${msg.id}')"
             ondblclick="handleDblClick(event,'${msg.id}')">
            ${avatarHtml}
            <div class="bubble${deleted ? ' deleted-msg' : ''}">
                ${nameLine}
                ${replyHtml}
                ${content}
                <div class="bubble-meta">
                    ${editBadge}
                    <span class="bubble-time">${isPrivate}${time}</span>
                </div>
                ${reactionsHtml}
            </div>
        </div>
    `;
}

function buildMediaHtml(media) {
    if (!media) return '';
    const type = media.type || 'file';
    const url = media.url || '#';
    const name = media.name || 'فایل';
    const size = media.size || '';

    if (type === 'image') {
        return `<div class="bubble-media"><img src="${url}" alt="تصویر" loading="lazy" onclick="window.open('${url}','_blank')"></div>`;
    }
    if (type === 'video') {
        return `<div class="bubble-media"><video controls src="${url}" onclick="this.paused?this.play():this.pause()"></video></div>`;
    }
    if (type === 'audio') {
        return `<div class="bubble-media"><audio controls src="${url}"></audio></div>`;
    }
    return `
        <div class="bubble-media">
            <div class="file-attachment">
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(name)}</div>
                    <span class="file-size">${size}</span>
                </div>
            </div>
        </div>
    `;
}

function scrollToBottom() {
    setTimeout(() => {
        chatEl.scrollTop = chatEl.scrollHeight;
    }, 50);
}

// ═══════════════════════════════════════════
//   SEND MESSAGE
// ═══════════════════════════════════════════
window.sendMessage = function() {
    const text = messageEl.value.trim();

    if (!text && !fileInput.files.length) {
        showToast('پیام یا فایل وارد کنید', '⚠️');
        return;
    }

    if (Date.now() - STATE.lastSendTime < 1500) {
        showToast('لطفاً کمی صبر کنید', '⏳');
        return;
    }

    STATE.lastSendTime = Date.now();

    const msg = {
        message: text || '',
        reply_to: STATE.replyTarget ? STATE.replyTarget.id : null,
        is_private: !!STATE.privateChatWith,
        recipient_id: STATE.privateChatWith || null,
        media: null,
        sticker: null,
    };

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            msg.media = {
                type: type,
                url: dataUrl,
                name: file.name,
                size: (file.size / 1024).toFixed(1) + ' KB',
            };
            sendToSocket(msg);
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
        return;
    }

    sendToSocket(msg);
    messageEl.value = '';
    messageEl.style.height = 'auto';
    counterEl.textContent = '';
    counterEl.className = '';
    clearReply();
    messageEl.focus();
};

function sendToSocket(msg) {
    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('send_message', msg);
    } else {
        showToast('ارسال نشد! اتصال برقرار نیست', '❌');
    }
}

// ═══════════════════════════════════════════
//   FILE INPUT
// ═══════════════════════════════════════════
fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        sendMessage();
    }
});

// ═══════════════════════════════════════════
//   EMOJI PICKER
// ═══════════════════════════════════════════
window.openEmojiPicker = function() {
    const grid = $('emoji-grid');
    grid.innerHTML = EMOJIS.map(e =>
        `<span style="cursor:pointer;padding:6px;border-radius:8px;transition:all .15s;font-size:32px;" 
              onmouseover="this.style.background='var(--bg-tertiary)';this.style.transform='scale(1.15)'" 
              onmouseout="this.style.background='transparent';this.style.transform='scale(1)'"
              onclick="insertEmoji('${e}')">${e}</span>`
    ).join('');
    $('emoji-picker').classList.remove('hidden');
};

window.closeEmojiPicker = function() {
    $('emoji-picker').classList.add('hidden');
};

window.insertEmoji = function(emoji) {
    const start = messageEl.selectionStart;
    const end = messageEl.selectionEnd;
    const text = messageEl.value;
    messageEl.value = text.substring(0, start) + emoji + text.substring(end);
    messageEl.focus();
    messageEl.selectionStart = messageEl.selectionEnd = start + emoji.length;
    closeEmojiPicker();
    messageEl.dispatchEvent(new Event('input'));
};

// ═══════════════════════════════════════════
//   STICKER PICKER
// ═══════════════════════════════════════════
window.openStickerPicker = function() {
    const grid = $('sticker-grid');
    grid.innerHTML = STICKERS.map(s =>
        `<span style="cursor:pointer;padding:8px;border-radius:12px;font-size:44px;transition:all .15s;display:inline-block;"
              onmouseover="this.style.background='var(--bg-tertiary)';this.style.transform='scale(1.15)'" 
              onmouseout="this.style.background='transparent';this.style.transform='scale(1)'"
              onclick="sendSticker('${s}')">${s}</span>`
    ).join('');
    $('sticker-picker').classList.remove('hidden');
};

window.closeStickerPicker = function() {
    $('sticker-picker').classList.add('hidden');
};

window.sendSticker = function(sticker) {
    closeStickerPicker();
    const msg = {
        message: '',
        sticker: sticker,
        reply_to: STATE.replyTarget ? STATE.replyTarget.id : null,
        is_private: !!STATE.privateChatWith,
        recipient_id: STATE.privateChatWith || null,
        media: null,
    };
    sendToSocket(msg);
};

// ═══════════════════════════════════════════
//   CONTEXT MENU
// ═══════════════════════════════════════════
window.handleCtxMenu = function(e, msgId) {
    e.preventDefault();
    const msg = STATE.messages.find(m => m.id === msgId);
    if (!msg) return;
    STATE.ctxTarget = msg;
    ctxDelAllItem.style.display = msg.sender_id === STATE.myId ? 'flex' : 'none';
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.remove('hidden');
};

window.handleDblClick = function(e, msgId) {
    const msg = STATE.messages.find(m => m.id === msgId);
    if (msg && !msg.deleted) {
        setReply(msg);
    }
};

document.addEventListener('click', function(e) {
    if (!ctxMenu.contains(e.target)) {
        ctxMenu.classList.add('hidden');
        STATE.ctxTarget = null;
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        ctxMenu.classList.add('hidden');
        clearReply();
        closeUserPopup();
        closeSettings();
        closeMyProfile();
        closeEditProfile();
        closeChatList();
        closeEmojiPicker();
        closeStickerPicker();
        STATE.ctxTarget = null;
    }
});

window.ctxReply = function() {
    if (STATE.ctxTarget) { setReply(STATE.ctxTarget);
        ctxMenu.classList.add('hidden'); }
};

window.ctxReact = function() {
    if (STATE.ctxTarget) {
        addReaction(STATE.ctxTarget.id, '❤️');
        ctxMenu.classList.add('hidden');
    }
};

window.ctxCopy = function() {
    if (STATE.ctxTarget && STATE.ctxTarget.message) {
        navigator.clipboard.writeText(STATE.ctxTarget.message).then(() => {
            showToast('📋 کپی شد', '📋');
        }).catch(() => {
            showToast('کپی نشد', '❌');
        });
        ctxMenu.classList.add('hidden');
    }
};

window.ctxDeleteForMe = function() {
    if (STATE.ctxTarget) {
        const el = chatEl.querySelector(`[data-id="${STATE.ctxTarget.id}"]`);
        if (el) el.style.display = 'none';
        ctxMenu.classList.add('hidden');
        showToast('🗑️ حذف شد', '🗑️');
    }
};

window.ctxDeleteForAll = function() {
    if (STATE.ctxTarget) {
        const msg = STATE.ctxTarget;
        if (msg.sender_id !== STATE.myId) {
            showToast('فقط فرستنده می‌تواند حذف کند', '❌');
            ctxMenu.classList.add('hidden');
            return;
        }
        if (!confirm('حذف برای همه؟')) {
            ctxMenu.classList.add('hidden');
            return;
        }
        if (STATE.socket && STATE.socket.connected) {
            STATE.socket.emit('delete_for_all', msg.id);
        }
        ctxMenu.classList.add('hidden');
        showToast('✅ حذف شد', '✅');
    }
};

window.ctxForward = function() {
    if (STATE.ctxTarget) {
        showToast('به زودی اضافه می‌شود', '↗️');
        ctxMenu.classList.add('hidden');
    }
};

// ═══════════════════════════════════════════
//   REPLY
// ═══════════════════════════════════════════
function setReply(msg) {
    STATE.replyTarget = msg;
    replyBarName.textContent = msg.username || 'کاربر';
    replyBarText.textContent = truncate(msg.message || 'پیام', 70);
    replyBar.classList.remove('hidden');
    messageEl.focus();
}

window.clearReply = function() {
    STATE.replyTarget = null;
    replyBar.classList.add('hidden');
};

window.scrollToMsg = function(msgId) {
    const el = chatEl.querySelector(`[data-id="${msgId}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background .3s';
        el.style.background = 'var(--bg-tertiary)';
        setTimeout(() => {
            el.style.background = '';
        }, 1000);
    }
};

// ═══════════════════════════════════════════
//   REACTIONS
// ═══════════════════════════════════════════
window.addReaction = function(msgId, emoji) {
    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('add_reaction', { msgId, emoji });
    }
};

// ═══════════════════════════════════════════
//   USER PROFILE
// ═══════════════════════════════════════════
window.showUserProfile = function(userId) {
    const userMsg = STATE.messages.find(m => m.sender_id === userId);
    if (!userMsg) {
        showToast('اطلاعات کاربر در دسترس نیست', '⚠️');
        return;
    }

    const popupAv = $('popup-avatar');
    popupAv.textContent = avatarLetter(userMsg.username);
    popupAv.style.background = userMsg.avatar_color || '#c4956a';

    $('popup-name').textContent = userMsg.username || 'کاربر';
    $('popup-bio').textContent = userMsg.bio || 'بیوگرافی موجود نیست';
    $('popup-age').textContent = userMsg.age ? `🎂 ${userMsg.age} سال` : '';
    $('popup-email').innerHTML = userMsg.email ?
        `📧 <a href="mailto:${escapeHtml(userMsg.email)}" style="color:var(--accent-light);text-decoration:none;">${escapeHtml(userMsg.email)}</a>` :
        '';

    STATE._popupUserId = userId;
    STATE._popupUsername = userMsg.username;
    STATE._popupColor = userMsg.avatar_color;

    userPopup.classList.remove('hidden');
};

window.closeUserPopup = function() {
    userPopup.classList.add('hidden');
};

window.startPrivateChat = function() {
    if (STATE._popupUserId) {
        STATE.privateChatWith = STATE._popupUserId;
        closeUserPopup();
        showToast(`💬 چت با ${STATE._popupUsername || 'کاربر'}`, '💬');
        headerTitle.textContent = `💬 ${STATE._popupUsername || 'کاربر'}`;
        renderMessages();
        if (!document.querySelector('.back-btn')) {
            const backBtn = document.createElement('button');
            backBtn.className = 'hdr-btn back-btn';
            backBtn.textContent = '←';
            backBtn.title = 'بازگشت';
            backBtn.style.fontSize = '20px';
            backBtn.onclick = function() {
                STATE.privateChatWith = null;
                headerTitle.textContent = 'گپ گروهی';
                this.remove();
                renderMessages();
            };
            document.querySelector('.header-actions').prepend(backBtn);
        }
    }
};

// ═══════════════════════════════════════════
//   MY PROFILE
// ═══════════════════════════════════════════
window.openMyProfile = function() {
    if (!STATE.isLoggedIn) {
        showToast('لطفاً وارد شوید', '⚠️');
        return;
    }
    const av = $('my-profile-avatar');
    av.textContent = avatarLetter(STATE.myName);
    av.style.background = STATE.myColor || '#c4956a';
    $('my-profile-name').textContent = STATE.myName || 'نام تنظیم نشده';
    $('my-profile-bio').textContent = STATE.myBio || 'بیوگرافی تنظیم نشده';
    $('my-profile-age').textContent = STATE.myAge ? `${STATE.myAge} سال` : 'سن تنظیم نشده';
    $('my-profile-id').textContent = STATE.myId;
    $('my-profile-modal').classList.remove('hidden');
};

window.closeMyProfile = function() {
    $('my-profile-modal').classList.add('hidden');
};

window.editMyProfile = function() {
    closeMyProfile();
    $('edit-profile-name').value = STATE.myName || '';
    $('edit-profile-bio').value = STATE.myBio || '';
    $('edit-profile-age').value = STATE.myAge || '';
    $('edit-profile-avatar').textContent = avatarLetter(STATE.myName);
    $('edit-profile-avatar').style.background = STATE.myColor || '#c4956a';
    $('edit-profile-modal').classList.remove('hidden');
};

window.closeEditProfile = function() {
    $('edit-profile-modal').classList.add('hidden');
};

window.saveEditProfile = function() {
    const name = $('edit-profile-name').value.trim();
    const bio = $('edit-profile-bio').value.trim();
    const age = $('edit-profile-age').value.trim();

    if (!name) {
        showToast('نام نمی‌تواند خالی باشد', '⚠️');
        return;
    }

    STATE.myName = name;
    STATE.myBio = bio;
    STATE.myAge = age;

    localStorage.setItem('pm_username', STATE.myName);
    localStorage.setItem('pm_bio', STATE.myBio);
    localStorage.setItem('pm_age', STATE.myAge);

    // به‌روزرسانی در سرور
    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('user_join', {
            username: STATE.myName,
            avatar_color: STATE.myColor,
            bio: STATE.myBio,
            age: STATE.myAge,
            email: STATE.myEmail
        });
    }

    updateHeader();
    closeEditProfile();
    showToast('پروفایل به‌روز شد', '✅');
    renderMessages();
};

// ═══════════════════════════════════════════
//   CHAT LIST
// ═══════════════════════════════════════════
window.openChatList = function() {
    $('chat-list-modal').classList.remove('hidden');
    updatePrivateChatsList();
};

window.closeChatList = function() {
    $('chat-list-modal').classList.add('hidden');
};

function updatePrivateChatsList() {
    const container = $('private-chats-list');
    const users = new Map();
    STATE.messages.forEach(m => {
        if (m.is_private && m.sender_id !== STATE.myId) {
            users.set(m.sender_id, { username: m.username, avatar_color: m.avatar_color });
        }
        if (m.is_private && m.recipient_id !== STATE.myId && m.recipient_id) {
            users.set(m.recipient_id, { username: m.username || 'کاربر', avatar_color: m.avatar_color });
        }
    });

    if (users.size === 0) {
        container.innerHTML =
            '<div style="text-align:center;color:var(--text-muted);padding:12px;font-size:12px;">چت خصوصی فعالی ندارید</div>';
        return;
    }

    container.innerHTML = '';
    users.forEach((user, id) => {
        const div = document.createElement('div');
        div.style.cssText =
            'display:flex;align-items:center;gap:14px;padding:10px 12px;border-radius:var(--radius);background:var(--bg-input);border:1px solid var(--border);margin-bottom:6px;cursor:pointer;transition:var(--transition);';
        div.onmouseover = function() { this.style.background = 'var(--bg-tertiary)'; };
        div.onmouseout = function() { this.style.background = 'var(--bg-input)'; };
        div.onclick = function() {
            STATE.privateChatWith = id;
            closeChatList();
            headerTitle.textContent = `💬 ${user.username || 'کاربر'}`;
            renderMessages();
            showToast(`چت با ${user.username || 'کاربر'}`, '💬');
        };
        div.innerHTML = `
            <div style="width:40px;height:40px;border-radius:50%;background:${user.avatar_color || '#c4956a'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;">${avatarLetter(user.username)}</div>
            <div style="flex:1;"><div style="font-weight:600;">${escapeHtml(user.username || 'کاربر')}</div><div style="font-size:11px;color:var(--text-muted);">چت خصوصی</div></div>
            <div style="font-size:12px;color:var(--text-muted);">💬</div>
        `;
        container.appendChild(div);
    });
}

window.scrollToTop = function() {
    chatEl.scrollTop = 0;
};

// ═══════════════════════════════════════════
//   TEXTAREA EVENTS
// ═══════════════════════════════════════════
messageEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    const len = this.value.length;
    if (len === 0) {
        counterEl.textContent = '';
        counterEl.className = '';
    } else if (len >= 450) {
        counterEl.textContent = `${len}/500`;
        counterEl.className = 'danger';
    } else if (len >= 350) {
        counterEl.textContent = `${len}/500`;
        counterEl.className = 'warn';
    } else {
        counterEl.textContent = '';
        counterEl.className = '';
    }

    // تایپینگ
    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('typing', { isTyping: this.value.length > 0 });
    }
});

messageEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

$('verify-code').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyCode();
});

$('login-identifier').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') requestCode();
});

// ═══════════════════════════════════════════
//   INIT
// ═══════════════════════════════════════════
function initApp() {
    updateHeader();

    if (STATE.myName) {
        STATE.isLoggedIn = true;
        loginModal.classList.add('hidden');
        verifyModal.classList.add('hidden');
        profileModal.classList.add('hidden');
        updateHeader();
        showToast(`خوش آمدید ${STATE.myName}`, '👋', 2000);
        connectSocket();
    } else {
        loginModal.classList.remove('hidden');
    }

    headerStatus.innerHTML = `<span class="dot"></span><span>آنلاین</span>`;

    console.log('🚀 Persia Messenger v3.0');
    console.log('👤 کاربر:', STATE.myName || '未登录');
    console.log('🆔 شناسه:', STATE.myId);
    console.log('🎨 تم:', STATE.theme);
}

// ── Start ──
document.documentElement.style.setProperty('--font-family', "'Inter', -apple-system, sans-serif");
initApp();

console.log('✨ گپ گروهی - نسخه لوکس با WebSocket');
console.log('📱 برای ورود، روی "دریافت کد" کلیک کنید و کد را از کنسول بگیرید.');
