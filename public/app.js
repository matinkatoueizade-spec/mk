(function() {
  'use strict';
  
  // ========== عناصر DOM ==========
  const authPage = document.getElementById('auth-page');
  const app = document.getElementById('app');
  const phoneInput = document.getElementById('phone-input');
  const sendCodeBtn = document.getElementById('send-code-btn');
  const codeStep = document.getElementById('code-step');
  const phoneStep = document.getElementById('phone-step');
  const codeInput = document.getElementById('code-input');
  const verifyBtn = document.getElementById('verify-btn');
  const resendCodeBtn = document.getElementById('resend-code-btn');
  const authError = document.getElementById('auth-error');
  const codeDisplay = document.getElementById('code-display');
  
  const contactList = document.getElementById('contact-list');
  const messagesContainer = document.getElementById('messages-container');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const chatContactName = document.getElementById('chat-contact-name');
  const chatContactStatus = document.getElementById('chat-contact-status');
  const chatAvatar = document.getElementById('chat-avatar');
  const typingIndicator = document.getElementById('typing-indicator');
  const searchInput = document.getElementById('search-input');
  
  const profileBtn = document.getElementById('profile-btn');
  const profilePanel = document.getElementById('profile-panel');
  const closePanel = document.getElementById('close-panel');
  const profileFullname = document.getElementById('profile-fullname');
  const profileUsername = document.getElementById('profile-username');
  const profilePhone = document.getElementById('profile-phone');
  const profileBio = document.getElementById('profile-bio');
  const profileAge = document.getElementById('profile-age');
  const profileGender = document.getElementById('profile-gender');
  const profileEmail = document.getElementById('profile-email');
  const profileWebsite = document.getElementById('profile-website');
  const profileLocation = document.getElementById('profile-location');
  const profileAvatarImg = document.getElementById('profile-avatar-img');
  const avatarInput = document.getElementById('avatar-input');
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettings = document.getElementById('close-settings');
  const settingsTheme = document.getElementById('settings-theme');
  const settingsFontSize = document.getElementById('settings-font-size');
  const settingsFontFamily = document.getElementById('settings-font-family');
  const settingsNotifications = document.getElementById('settings-notifications');
  const settingsSound = document.getElementById('settings-sound');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  
  const logoutBtn = document.getElementById('logout-btn');
  const attachBtn = document.getElementById('attach-btn');
  const fileInput = document.getElementById('file-input');
  const emojiBtn = document.getElementById('emoji-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const chatInfoBtn = document.getElementById('chat-info-btn');
  const contactInfoPanel = document.getElementById('contact-info-panel');
  const closeContactInfo = document.getElementById('close-contact-info');
  const contactInfoContent = document.getElementById('contact-info-content');
  const myStatus = document.getElementById('my-status');
  const newGroupBtn = document.getElementById('new-group-btn');
  const chatSettingsBtn = document.getElementById('chat-settings-btn');

  // ========== متغیرهای وضعیت ==========
  let socket = null;
  let currentUser = null;
  let currentContact = null;
  let currentGroup = null;
  let contacts = [];
  let groups = [];
  let messages = {};
  let isDark = true;
  let phoneNumber = '';
  let currentChatType = 'private'; // 'private' | 'group'
  let activeTab = 'chats';

  // ========== احراز هویت ==========
  sendCodeBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim().replace(/\s/g, '');
    if (!phone || phone.length < 10) {
      authError.textContent = 'شماره موبایل را صحیح وارد کنید';
      return;
    }
    phoneNumber = phone;
    authError.textContent = '';
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      phoneStep.style.display = 'none';
      codeStep.style.display = 'block';
      if (data.code) {
        codeDisplay.textContent = `📱 کد تایید: ${data.code}`;
        codeDisplay.style.display = 'block';
      }
      authError.textContent = '✅ کد تایید ارسال شد';
      authError.style.color = '#22c55e';
    } catch (e) {
      authError.textContent = e.message || 'خطا در ارسال کد';
      authError.style.color = '#ef4444';
    }
  });

  verifyBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (!code || code.length !== 6) {
      authError.textContent = 'کد ۶ رقمی را وارد کنید';
      return;
    }
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      currentUser = data.user;
      authPage.style.display = 'none';
      app.style.display = 'flex';
      initSocket();
      loadUserData();
      applyTheme(isDark);
    } catch (e) {
      authError.textContent = e.message || 'کد اشتباه است';
      authError.style.color = '#ef4444';
    }
  });

  resendCodeBtn.addEventListener('click', () => {
    sendCodeBtn.click();
  });

  phoneInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendCodeBtn.click(); });
  codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyBtn.click(); });

  // ========== سوکت ==========
  function initSocket() {
    socket = io({
      auth: { userId: currentUser.id },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('✅ متصل به سرور'));

    socket.on('contacts', (list) => {
      contacts = list;
      renderContacts();
    });

    socket.on('groups', (list) => {
      groups = list;
      renderGroups();
    });

    socket.on('user_info', (user) => {
      currentUser = user;
      updateProfileUI();
      applySettings(user.settings);
    });

    socket.on('new_message', (msg) => {
      handleNewMessage(msg);
    });

    socket.on('new_group_message', (msg) => {
      handleNewGroupMessage(msg);
    });

    socket.on('message_reaction', ({ messageId, reactions }) => {
      updateReactions(messageId, reactions);
    });

    socket.on('message_deleted', ({ messageId, forEveryone }) => {
      deleteMessage(messageId, forEveryone);
    });

    socket.on('message_edited', ({ messageId, text }) => {
      editMessage(messageId, text);
    });

    socket.on('user_typing', ({ from, isTyping }) => {
      if (from === currentContact?.id && currentChatType === 'private') {
        typingIndicator.textContent = isTyping ? '✍️ در حال تایپ...' : '';
      }
    });

    socket.on('group_typing', ({ groupId, from, isTyping }) => {
      if (groupId === currentGroup?.id && currentChatType === 'group') {
        const user = contacts.find(c => c.id === from);
        typingIndicator.textContent = isTyping ? `✍️ ${user?.fullName || 'کاربر'} در حال تایپ...` : '';
      }
    });

    socket.on('profile_updated', (data) => {
      if (data.userId === currentContact?.id) {
        const contact = contacts.find(c => c.id === data.userId);
        if (contact) Object.assign(contact, data);
        renderContacts();
        updateChatHeader();
      }
      if (data.userId === currentUser.id) {
        Object.assign(currentUser, data);
        updateProfileUI();
      }
    });

    socket.on('user_offline', ({ userId }) => {
      if (userId === currentContact?.id) {
        chatContactStatus.textContent = 'آخرین بازدید: لحظاتی پیش';
      }
    });

    socket.on('settings_updated', (settings) => {
      if (currentUser) {
        currentUser.settings = settings;
        applySettings(settings);
      }
    });

    socket.on('error', (msg) => {
      alert('⚠️ ' + msg);
    });

    socket.on('contact_added', (contact) => {
      contacts.push(contact);
      renderContacts();
    });
  }

  // ========== مدیریت پیام‌ها ==========
  function handleNewMessage(msg) {
    const chatId = msg.from === currentUser.id ? msg.to : msg.from;
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push(msg);
    
    if (chatId === currentContact?.id && currentChatType === 'private') {
      renderMessages(chatId);
    }
    updateContactList();
  }

  function handleNewGroupMessage(msg) {
    if (!messages[msg.groupId]) messages[msg.groupId] = [];
    messages[msg.groupId].push(msg);
    
    if (msg.groupId === currentGroup?.id && currentChatType === 'group') {
      renderGroupMessages(msg.groupId);
    }
    updateGroupList();
  }

  function updateReactions(messageId, reactions) {
    for (let key in messages) {
      const msg = messages[key].find(m => m.id === messageId);
      if (msg) { msg.reactions = reactions; break; }
    }
    if (currentChatType === 'private' && currentContact) {
      renderMessages(currentContact.id);
    } else if (currentChatType === 'group' && currentGroup) {
      renderGroupMessages(currentGroup.id);
    }
  }

  function deleteMessage(messageId, forEveryone) {
    for (let key in messages) {
      const idx = messages[key].findIndex(m => m.id === messageId);
      if (idx !== -1) {
        if (forEveryone) {
          messages[key].splice(idx, 1);
        } else {
          messages[key][idx].deleted = true;
          messages[key][idx].text = 'این پیام حذف شد';
        }
        break;
      }
    }
    if (currentChatType === 'private' && currentContact) {
      renderMessages(currentContact.id);
    } else if (currentChatType === 'group' && currentGroup) {
      renderGroupMessages(currentGroup.id);
    }
  }

  function editMessage(messageId, text) {
    for (let key in messages) {
      const msg = messages[key].find(m => m.id === messageId);
      if (msg) { msg.text = text; msg.edited = true; break; }
    }
    if (currentChatType === 'private' && currentContact) {
      renderMessages(currentContact.id);
    } else if (currentChatType === 'group' && currentGroup) {
      renderGroupMessages(currentGroup.id);
    }
  }

  // ========== بارگذاری اطلاعات ==========
  function loadUserData() {
    updateProfileUI();
    if (currentUser.settings) {
      applySettings(currentUser.settings);
    }
  }

  function updateProfileUI() {
    if (!currentUser) return;
    profileFullname.value = currentUser.fullName || '';
    profileUsername.value = currentUser.username || '';
    profilePhone.value = currentUser.phone || '';
    profileBio.value = currentUser.bio || '';
    profileAge.value = currentUser.age || '';
    profileGender.value = currentUser.gender || '';
    profileEmail.value = currentUser.email || '';
    profileWebsite.value = currentUser.website || '';
    profileLocation.value = currentUser.location || '';
    if (currentUser.avatar) {
      profileAvatarImg.src = currentUser.avatar;
    }
    myStatus.textContent = currentUser.isOnline ? '🟢 آنلاین' : '🔴 آفلاین';
    
    // تنظیمات
    if (currentUser.settings) {
      settingsTheme.value = currentUser.settings.theme || 'dark';
      settingsFontSize.value = currentUser.settings.fontSize || 'medium';
      settingsFontFamily.value = currentUser.settings.fontFamily || 'default';
      settingsNotifications.checked = currentUser.settings.notifications !== false;
      settingsSound.checked = currentUser.settings.sound !== false;
    }
  }

  function applySettings(settings) {
    if (!settings) return;
    
    // تم
    const theme = settings.theme || 'dark';
    applyTheme(theme === 'dark');
    
    // اندازه فونت
    const sizeMap = { small: '14px', medium: '16px', large: '18px' };
    document.body.style.fontSize = sizeMap[settings.fontSize] || '16px';
    
    // نوع فونت
    const fontMap = {
      default: "'Segoe UI', system-ui, sans-serif",
      vazir: "'Vazir', 'Segoe UI', sans-serif",
      yekan: "'Yekan', 'Segoe UI', sans-serif",
      tahoma: "Tahoma, 'Segoe UI', sans-serif"
    };
    document.body.style.fontFamily = fontMap[settings.fontFamily] || fontMap.default;
  }

  // ========== رندر مخاطب‌ها ==========
  function renderContacts(filter = '') {
    if (activeTab !== 'chats') return;
    const query = filter.toLowerCase();
    const list = contacts.filter(c => 
      c.username.toLowerCase().includes(query) || 
      c.phone.includes(query) ||
      (c.fullName && c.fullName.toLowerCase().includes(query))
    );
    contactList.innerHTML = '';
    if (list.length === 0) {
      contactList.innerHTML = '<div class="empty-state">مخاطبی یافت نشد</div>';
      return;
    }
    list.forEach(contact => {
      const div = document.createElement('div');
      div.className = 'contact-item';
      if (contact.id === currentContact?.id && currentChatType === 'private') div.classList.add('active');
      const isOnline = contact.isOnline;
      const avatarLetter = (contact.fullName || contact.username).charAt(0).toUpperCase();
      const lastMsg = getLastMessage(contact.id);
      const lastTime = getLastMessageTime(contact.id);
      div.innerHTML = `
        <div class="contact-avatar" style="background:${getColor(contact.id)}">
          ${contact.avatar ? `<img src="${contact.avatar}">` : avatarLetter}
          ${isOnline ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="contact-info">
          <div class="contact-name">${contact.fullName || contact.username}</div>
          <div class="contact-last-msg">${lastMsg || 'شروع مکالمه'}</div>
        </div>
        ${lastTime ? `<div class="contact-time">${lastTime}</div>` : ''}
      `;
      div.addEventListener('click', () => openChat(contact));
      contactList.appendChild(div);
    });
  }

  function renderGroups() {
    if (activeTab !== 'groups') return;
    contactList.innerHTML = '';
    if (groups.length === 0) {
      contactList.innerHTML = '<div class="empty-state">گروهی یافت نشد</div>';
      return;
    }
    groups.forEach(group => {
      const div = document.createElement('div');
      div.className = 'contact-item';
      if (group.id === currentGroup?.id && currentChatType === 'group') div.classList.add('active');
      const avatarLetter = group.name.charAt(0).toUpperCase();
      const lastMsg = getLastGroupMessage(group.id);
      div.innerHTML = `
        <div class="contact-avatar" style="background:${getColor(group.id)}">
          ${group.avatar ? `<img src="${group.avatar}">` : avatarLetter}
        </div>
        <div class="contact-info">
          <div class="contact-name">${group.name}</div>
          <div class="contact-last-msg">${lastMsg || 'شروع مکالمه'}</div>
        </div>
      `;
      div.addEventListener('click', () => openGroup(group));
      contactList.appendChild(div);
    });
  }

  function updateContactList() {
    if (activeTab === 'chats') renderContacts(searchInput.value);
  }

  function updateGroupList() {
    if (activeTab === 'groups') renderGroups();
  }

  function getColor(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
  }

  function getLastMessage(contactId) {
    const msgs = messages[contactId] || [];
    const last = msgs[msgs.length - 1];
    if (!last || last.deleted) return '';
    if (last.file && !last.text) return '📎 فایل';
    if (last.file && last.text) return last.text;
    return last.text || '';
  }

  function getLastMessageTime(contactId) {
    const msgs = messages[contactId] || [];
    const last = msgs[msgs.length - 1];
    if (!last || last.deleted) return '';
    const date = new Date(last.timestamp);
    return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  }

  function getLastGroupMessage(groupId) {
    const msgs = messages[groupId] || [];
    const last = msgs[msgs.length - 1];
    if (!last || last.deleted) return '';
    if (last.file && !last.text) return '📎 فایل';
    if (last.file && last.text) return last.text;
    return last.text || '';
  }

  // ========== باز کردن چت خصوصی ==========
  function openChat(contact) {
    currentContact = contact;
    currentGroup = null;
    currentChatType = 'private';
    chatContactName.textContent = contact.fullName || contact.username;
    updateChatHeader();
    
    if (!messages[contact.id]) {
      messages[contact.id] = [];
    }
    renderMessages(contact.id);
    
    socket.emit('message_seen', { contactId: contact.id });
    
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    const items = contactList.querySelectorAll('.contact-item');
    items.forEach(el => {
      if (el.textContent.includes(contact.username) || el.textContent.includes(contact.fullName || '')) {
        el.classList.add('active');
      }
    });
    
    messageInput.focus();
  }

  // ========== باز کردن گروه ==========
  function openGroup(group) {
    currentGroup = group;
    currentContact = null;
    currentChatType = 'group';
    chatContactName.textContent = group.name;
    chatContactStatus.textContent = `${group.members?.length || 0} عضو`;
    chatAvatar.innerHTML = `<span style="background:${getColor(group.id)}">${group.name.charAt(0).toUpperCase()}</span>`;
    
    if (!messages[group.id]) {
      messages[group.id] = [];
    }
    renderGroupMessages(group.id);
    
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    const items = contactList.querySelectorAll('.contact-item');
    items.forEach(el => {
      if (el.textContent.includes(group.name)) {
        el.classList.add('active');
      }
    });
    
    messageInput.focus();
  }

  function updateChatHeader() {
    if (!currentContact && !currentGroup) return;
    if (currentChatType === 'private' && currentContact) {
      const contact = currentContact;
      const avatarLetter = (contact.fullName || contact.username).charAt(0).toUpperCase();
      chatAvatar.innerHTML = contact.avatar ? 
        `<img src="${contact.avatar}">` : 
        `<span style="background:${getColor(contact.id)}">${avatarLetter}</span>`;
      chatContactStatus.textContent = contact.isOnline ? '🟢 آنلاین' : 'آخرین بازدید: لحظاتی پیش';
    }
  }

  // ========== رندر پیام‌های خصوصی ==========
  function renderMessages(contactId) {
    const msgs = messages[contactId] || [];
    messagesContainer.innerHTML = '';
    
    if (msgs.length === 0) {
      messagesContainer.innerHTML = '<div class="empty-chat">شروع مکالمه</div>';
      return;
    }
    
    msgs.forEach(msg => {
      if (msg.deleted && msg.from !== currentUser.id) return;
      const isMine = msg.from === currentUser.id;
      const div = document.createElement('div');
      div.className = `message ${isMine ? 'mine' : 'other'}`;
      div.dataset.id = msg.id;
      
      let content = renderMessageContent(msg);
      
      const time = new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const date = new Date(msg.timestamp).toLocaleDateString('fa-IR');
      
      div.innerHTML = `
        <div class="bubble">
          ${!isMine ? `<div class="sender-name">${currentContact?.fullName || currentContact?.username || 'ناشناس'}</div>` : ''}
          ${content}
          <div class="time">${time} - ${date}</div>
          ${isMine && !msg.deleted ? renderMessageActions(msg.id) : ''}
          ${!isMine && !msg.deleted ? renderOtherActions(msg.id) : ''}
        </div>
      `;
      messagesContainer.appendChild(div);
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    attachMessageEvents();
  }

  // ========== رندر پیام‌های گروهی ==========
  function renderGroupMessages(groupId) {
    const msgs = messages[groupId] || [];
    messagesContainer.innerHTML = '';
    
    if (msgs.length === 0) {
      messagesContainer.innerHTML = '<div class="empty-chat">شروع مکالمه</div>';
      return;
    }
    
    msgs.forEach(msg => {
      if (msg.deleted) return;
      const isMine = msg.from === currentUser.id;
      const sender = contacts.find(c => c.id === msg.from);
      const senderName = sender?.fullName || sender?.username || 'ناشناس';
      const div = document.createElement('div');
      div.className = `message ${isMine ? 'mine' : 'other'}`;
      div.dataset.id = msg.id;
      
      let content = renderMessageContent(msg);
      
      const time = new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      const date = new Date(msg.timestamp).toLocaleDateString('fa-IR');
      
      div.innerHTML = `
        <div class="bubble">
          ${!isMine ? `<div class="sender-name" style="color:${getColor(msg.from)}">${senderName}</div>` : ''}
          ${content}
          <div class="time">${time} - ${date}</div>
          ${isMine && !msg.deleted ? renderMessageActions(msg.id) : ''}
          ${!isMine && !msg.deleted ? renderOtherActions(msg.id) : ''}
        </div>
      `;
      messagesContainer.appendChild(div);
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    attachMessageEvents();
  }

  function renderMessageContent(msg) {
    let content = '';
    if (msg.file) {
      const ext = msg.file.split('.').pop().toLowerCase();
      if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) {
        content += `<img src="${msg.file}" class="file-preview" onclick="window.open('${msg.file}')">`;
      } else if (['mp4','webm','ogg','mov','avi'].includes(ext)) {
        content += `<video src="${msg.file}" controls class="file-preview"></video>`;
      } else if (['mp3','wav','ogg','m4a'].includes(ext)) {
        content += `<audio src="${msg.file}" controls class="file-preview"></audio>`;
      } else {
        content += `<a href="${msg.file}" target="_blank" class="file-link"><i class="fas fa-file"></i> دانلود فایل</a>`;
      }
    }
    if (msg.text && !msg.deleted) {
      content += `<div class="text">${escapeHtml(msg.text)}${msg.edited ? ' <span class="edited">(ویرایش شده)</span>' : ''}</div>`;
    }
    if (msg.deleted && msg.from === currentUser.id) {
      content += `<div class="text" style="color:var(--text-muted);font-style:italic;">این پیام حذف شد</div>`;
    }
    
    // ریاکشن‌ها
    if (msg.reactions && msg.reactions.length) {
      const grouped = msg.reactions.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
      }, {});
      content += `<div class="reactions">${Object.entries(grouped).map(([emoji, count]) =>
        `<span class="reaction-badge" onclick="window.reactToMessage('${msg.id}','${emoji}')">${emoji} ${count}</span>`
      ).join('')}</div>`;
    }
    return content;
  }

  function renderMessageActions(msgId) {
    return `<div class="msg-actions">
      <button class="react-btn" data-msgid="${msgId}"><i class="fas fa-smile"></i></button>
      <button class="reply-btn" data-msgid="${msgId}"><i class="fas fa-reply"></i></button>
      <button class="edit-btn" data-msgid="${msgId}"><i class="fas fa-edit"></i></button>
      <button class="delete-btn" data-msgid="${msgId}"><i class="fas fa-trash"></i></button>
    </div>`;
  }

  function renderOtherActions(msgId) {
    return `<div class="msg-actions other-actions">
      <button class="react-btn" data-msgid="${msgId}"><i class="fas fa-smile"></i></button>
      <button class="reply-btn" data-msgid="${msgId}"><i class="fas fa-reply"></i></button>
    </div>`;
  }

  function attachMessageEvents() {
    document.querySelectorAll('.react-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.msgid;
        const picker = window.emojiPicker;
        picker.style.display = 'block';
        picker.style.position = 'fixed';
        picker.style.bottom = '80px';
        picker.style.right = '20px';
        picker.style.zIndex = '9999';
        const handler = (ev) => {
          const emoji = ev.detail.unicode;
          socket.emit('reaction', { messageId: msgId, emoji });
          picker.style.display = 'none';
          picker.removeEventListener('emoji-click', handler);
        };
        picker.addEventListener('emoji-click', handler);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.msgid;
        const forEveryone = confirm('آیا برای همه حذف شود؟');
        socket.emit('delete_message', { messageId: msgId, forEveryone });
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.msgid;
        let msgs = [];
        if (currentChatType === 'private' && currentContact) {
          msgs = messages[currentContact.id] || [];
        } else if (currentChatType === 'group' && currentGroup) {
          msgs = messages[currentGroup.id] || [];
        }
        const msg = msgs.find(m => m.id === msgId);
        if (!msg) return;
        const newText = prompt('ویرایش پیام:', msg.text);
        if (newText !== null && newText.trim()) {
          socket.emit('edit_message', { messageId: msgId, text: newText.trim() });
        }
      });
    });

    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = btn.dataset.msgid;
        let msgs = [];
        if (currentChatType === 'private' && currentContact) {
          msgs = messages[currentContact.id] || [];
        } else if (currentChatType === 'group' && currentGroup) {
          msgs = messages[currentGroup.id] || [];
        }
        const msg = msgs.find(m => m.id === msgId);
        if (msg) {
          messageInput.value = `@${msg.from === currentUser.id ? 'من' : (currentContact?.fullName || 'کاربر')}: ${msg.text.substring(0, 30)}...\n`;
          messageInput.focus();
        }
      });
    });
  }

  window.reactToMessage = function(msgId, emoji) {
    socket.emit('reaction', { messageId: msgId, emoji });
  };

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== ارسال پیام ==========
  function sendMessage() {
    if (!currentContact && !currentGroup) {
      alert('لطفاً یک مخاطب یا گروه انتخاب کنید');
      return;
    }
    const text = messageInput.value.trim();
    if (!text && !fileInput.files.length) return;
    
    const sendFn = (data) => {
      if (currentChatType === 'private') {
        socket.emit('private_message', { to: currentContact.id, ...data });
      } else if (currentChatType === 'group') {
        socket.emit('group_message', { groupId: currentGroup.id, ...data });
      }
    };
    
    if (fileInput.files.length) {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      fetch('/api/upload', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
          if (data.url) {
            sendFn({ text: text || '', file: data.url });
            messageInput.value = '';
            fileInput.value = '';
          }
        })
        .catch(err => console.error('Upload error:', err));
    } else {
      sendFn({ text: text, file: null });
      messageInput.value = '';
    }
  }

  // ========== تم ==========
  function applyTheme(dark) {
    isDark = dark;
    document.body.classList.toggle('light', !dark);
    document.body.classList.toggle('dark', dark);
    themeToggle.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }

  themeToggle.addEventListener('click', () => {
    const newTheme = !isDark;
    applyTheme(newTheme);
    socket.emit('update_settings', { theme: newTheme ? 'dark' : 'light' });
  });

  // ========== تنظیمات ==========
  chatSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = 'block';
    updateSettingsUI();
  });

  closeSettings.addEventListener('click', () => settingsPanel.style.display = 'none');

  function updateSettingsUI() {
    if (!currentUser?.settings) return;
    settingsTheme.value = currentUser.settings.theme || 'dark';
    settingsFontSize.value = currentUser.settings.fontSize || 'medium';
    settingsFontFamily.value = currentUser.settings.fontFamily || 'default';
    settingsNotifications.checked = currentUser.settings.notifications !== false;
    settingsSound.checked = currentUser.settings.sound !== false;
  }

  saveSettingsBtn.addEventListener('click', () => {
    const settings = {
      theme: settingsTheme.value,
      fontSize: settingsFontSize.value,
      fontFamily: settingsFontFamily.value,
      notifications: settingsNotifications.checked,
      sound: settingsSound.checked
    };
    socket.emit('update_settings', settings);
    settingsPanel.style.display = 'none';
    applySettings(settings);
  });

  // ========== پروفایل ==========
  profileBtn.addEventListener('click', () => {
    profilePanel.style.display = 'block';
    updateProfileUI();
  });

  closePanel.addEventListener('click', () => profilePanel.style.display = 'none');

  changeAvatarBtn.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        socket.emit('update_profile', { avatar: data.url });
        profileAvatarImg.src = data.url;
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  });

  saveProfileBtn.addEventListener('click', () => {
    const data = {
      fullName: profileFullname.value.trim(),
      username: profileUsername.value.trim(),
      bio: profileBio.value.trim(),
      age: profileAge.value,
      gender: profileGender.value,
      email: profileEmail.value.trim(),
      website: profileWebsite.value.trim(),
      location: profileLocation.value.trim()
    };
    socket.emit('update_profile', data);
    profilePanel.style.display = 'none';
    Object.assign(currentUser, data);
    renderContacts(searchInput.value);
    updateChatHeader();
  });

  // ========== اطلاعات مخاطب ==========
  chatInfoBtn.addEventListener('click', () => {
    if (!currentContact && !currentGroup) return;
    contactInfoPanel.style.display = 'block';
    if (currentChatType === 'private' && currentContact) {
      const c = currentContact;
      contactInfoContent.innerHTML = `
        <div class="contact-info-avatar" style="background:${getColor(c.id)}">
          ${c.avatar ? `<img src="${c.avatar}">` : (c.fullName || c.username).charAt(0).toUpperCase()}
        </div>
        <div class="contact-info-field"><strong>نام:</strong> ${c.fullName || '—'}</div>
        <div class="contact-info-field"><strong>نام کاربری:</strong> ${c.username || '—'}</div>
        <div class="contact-info-field"><strong>شماره:</strong> ${c.phone || '—'}</div>
        <div class="contact-info-field"><strong>وضعیت:</strong> ${c.isOnline ? '🟢 آنلاین' : '🔴 آفلاین'}</div>
        <div class="contact-info-field"><strong>بیو:</strong> ${c.bio || '—'}</div>
        <div class="contact-info-field"><strong>سن:</strong> ${c.age || '—'}</div>
        <div class="contact-info-field"><strong>جنسیت:</strong> ${c.gender === 'male' ? 'مرد' : c.gender === 'female' ? 'زن' : c.gender || '—'}</div>
        <div class="contact-info-field"><strong>ایمیل:</strong> ${c.email || '—'}</div>
        <div class="contact-info-field"><strong>وبسایت:</strong> ${c.website || '—'}</div>
        <div class="contact-info-field"><strong>مکان:</strong> ${c.location || '—'}</div>
      `;
    } else if (currentChatType === 'group' && currentGroup) {
      const g = currentGroup;
      contactInfoContent.innerHTML = `
        <div class="contact-info-avatar" style="background:${getColor(g.id)}">
          ${g.avatar ? `<img src="${g.avatar}">` : g.name.charAt(0).toUpperCase()}
        </div>
        <div class="contact-info-field"><strong>نام گروه:</strong> ${g.name}</div>
        <div class="contact-info-field"><strong>تعداد اعضا:</strong> ${g.members?.length || 0}</div>
        <div class="contact-info-field"><strong>ساخته شده:</strong> ${new Date(g.createdAt).toLocaleDateString('fa-IR')}</div>
      `;
    }
  });

  closeContactInfo.addEventListener('click', () => contactInfoPanel.style.display = 'none');

  // ========== تب‌ها ==========
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      if (activeTab === 'chats') {
        renderContacts(searchInput.value);
      } else if (activeTab === 'groups') {
        renderGroups();
      }
    });
  });

  // ========== گروه جدید ==========
  newGroupBtn.addEventListener('click', () => {
    const name = prompt('نام گروه را وارد کنید:');
    if (!name) return;
    const memberIds = contacts.map(c => c.id);
    fetch('/api/create-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, members: memberIds, creatorId: currentUser.id })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        groups.push(data.group);
        renderGroups();
        openGroup(data.group);
      }
    });
  });

  // ========== خروج ==========
  logoutBtn.addEventListener('click', () => {
    if (socket) socket.disconnect();
    location.reload();
  });

  // ========== رویدادهای چت ==========
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', () => {
    if (currentChatType === 'private' && currentContact) {
      socket.emit('typing', { 
        to: currentContact.id, 
        isTyping: messageInput.value.trim().length > 0 
      });
    } else if (currentChatType === 'group' && currentGroup) {
      socket.emit('group_typing', { 
        groupId: currentGroup.id, 
        isTyping: messageInput.value.trim().length > 0 
      });
    }
  });

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) sendMessage();
  });

  emojiBtn.addEventListener('click', () => {
    const picker = window.emojiPicker;
    if (picker.style.display === 'block') {
      picker.style.display = 'none';
      return;
    }
    picker.style.display = 'block';
    picker.style.position = 'fixed';
    picker.style.bottom = '80px';
    picker.style.left = '20px';
    picker.style.zIndex = '9999';
    const handler = (ev) => {
      messageInput.value += ev.detail.unicode;
      messageInput.focus();
      picker.style.display = 'none';
      picker.removeEventListener('emoji-click', handler);
    };
    picker.addEventListener('emoji-click', handler);
  });

  searchInput.addEventListener('input', () => {
    if (activeTab === 'chats') {
      renderContacts(searchInput.value);
    }
  });

  // بستن پنل‌ها با کلیک خارج
  document.addEventListener('click', (e) => {
    if (profilePanel.style.display === 'block' && 
        !profilePanel.contains(e.target) && 
        e.target.id !== 'profile-btn') {
      profilePanel.style.display = 'none';
    }
    if (settingsPanel.style.display === 'block' && 
        !settingsPanel.contains(e.target) && 
        e.target.id !== 'chat-settings-btn') {
      settingsPanel.style.display = 'none';
    }
    if (contactInfoPanel.style.display === 'block' && 
        !contactInfoPanel.contains(e.target) && 
        e.target.id !== 'chat-info-btn') {
      contactInfoPanel.style.display = 'none';
    }
  });

  console.log('🚀 متین‌گرام راه‌اندازی شد!');
})();
