// ===== CHAT.JS =====

let currentUser = null
let currentChatId = null
let currentMessages = [] // [{role, content, time, files}]
let pendingFiles = [] // File objects waiting to be sent
let isAiTyping = false

// ---- INIT ----
window.addEventListener('DOMContentLoaded', init)

function init(){
  const session = DB.getSession()
  if(!session){ window.location.href='index.html'; return }
  
  currentUser = DB.getUser(session.username)
  if(!currentUser){ DB.clearSession(); window.location.href='index.html'; return }
  if(currentUser.banned){ DB.clearSession(); window.location.href='index.html'; return }
  
  // Apply settings
  const settings = DB.getSettings(currentUser.username)
  if(settings.theme === 'light') document.body.classList.add('light-theme')
  document.getElementById('theme-select').value = settings.theme
  document.getElementById('voice-reply-toggle').checked = !!settings.voiceReply
  
  // Update UI
  document.getElementById('sidebar-user-info').textContent = 
    '👤 ' + currentUser.username + (currentUser.role==='owner'?' 👑':'')
  document.getElementById('topbar-user').textContent = currentUser.username
  
  loadChatHistory()
  newChat()
}

// ---- SIDEBAR ----
function toggleSidebar(){
  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  sidebar.classList.toggle('open')
  overlay.classList.toggle('show')
}

// ---- CHAT HISTORY ----
function loadChatHistory(){
  const list = DB.getChatList(currentUser.username)
  const el = document.getElementById('chat-history-list')
  el.innerHTML = ''
  if(list.length === 0){
    el.innerHTML = '<div style="color:var(--text2);font-size:0.8rem;padding:12px;text-align:center">Belum ada riwayat chat</div>'
    return
  }
  list.slice().reverse().forEach(item=>{
    const div = document.createElement('div')
    div.className = 'history-item' + (item.id===currentChatId?' active':'')
    div.innerHTML = `
      <span onclick="loadChat('${item.id}')">${escHtml(item.title||'Chat')}</span>
      <button class="del-chat" onclick="deleteChat('${item.id}')">🗑️</button>
    `
    div.querySelector('span').onclick = ()=>loadChat(item.id)
    el.appendChild(div)
  })
}

function newChat(){
  currentChatId = 'chat_'+Date.now()
  currentMessages = []
  document.getElementById('messages-area').innerHTML = `
    <div class="welcome-screen" id="welcome-screen">
      <div class="welcome-logo">⚡</div>
      <h2>Halo! Aku <strong>CludenateF</strong></h2>
      <p>AI Serba Bisa — Coding, Pelajaran, Analisis Foto/Video/File, dan lebih banyak lagi!</p>
      <div class="quick-topics">
        <button onclick="sendQuick('Bantu aku coding JavaScript')">💻 Coding JS</button>
        <button onclick="sendQuick('Bantu aku belajar Python')">🐍 Python</button>
        <button onclick="sendQuick('Bantu aku belajar matematika')">📐 Matematika</button>
        <button onclick="sendQuick('Jelaskan tentang sejarah Indonesia')">📚 Sejarah</button>
        <button onclick="sendQuick('Aku mau curhat')">💬 Curhat</button>
        <button onclick="sendQuick('Bantu aku belajar bahasa Inggris')">🌍 Bahasa Inggris</button>
      </div>
    </div>`
  loadChatHistory()
}

function loadChat(chatId){
  const chatData = DB.getChat(currentUser.username, chatId)
  if(!chatData) return
  currentChatId = chatId
  currentMessages = chatData.messages || []
  
  const area = document.getElementById('messages-area')
  area.innerHTML = ''
  currentMessages.forEach(msg=>renderMessage(msg, false))
  area.scrollTop = area.scrollHeight
  loadChatHistory()
  
  if(window.innerWidth <= 768) toggleSidebar()
}

function deleteChat(chatId){
  DB.deleteChat(currentUser.username, chatId)
  if(chatId === currentChatId) newChat()
  else loadChatHistory()
}

// ---- SEND MESSAGE ----
function handleKey(e){
  if(e.key==='Enter' && !e.shiftKey){
    e.preventDefault()
    sendMessage()
  }
}

function autoResize(ta){
  ta.style.height='auto'
  ta.style.height = Math.min(ta.scrollHeight, 180)+'px'
}

function sendQuick(text){
  document.getElementById('msg-input').value = text
  sendMessage()
}

async function sendMessage(){
  if(isAiTyping) return
  const input = document.getElementById('msg-input')
  const text = input.value.trim()
  if(!text && pendingFiles.length===0) return
  
  // Check special commands
  if(text.startsWith('/')) {
    const handled = handleCommand(text)
    if(handled){ input.value=''; autoResize(input); return }
  }
  
  // Remove welcome screen
  const ws = document.getElementById('welcome-screen')
  if(ws) ws.remove()
  
  // Prepare files for sending
  const filesToSend = [...pendingFiles]
  pendingFiles = []
  document.getElementById('file-preview-area').style.display='none'
  document.getElementById('file-preview-area').innerHTML=''
  
  // Read text files
  for(const f of filesToSend){
    if(!f.type.startsWith('image/') && f.type !== 'application/pdf'){
      f.textContent = await readTextFile(f)
    }
  }
  
  // User message
  const userMsg = {
    role: 'user',
    content: text,
    time: Date.now(),
    files: filesToSend.map(f=>({
      name: f.name,
      type: f.type,
      size: f.size,
      previewUrl: f.previewUrl || null
    }))
  }
  currentMessages.push(userMsg)
  renderMessage(userMsg, true)
  
  input.value = ''
  autoResize(input)
  DB.updateUserActivity(currentUser.username)
  
  // Save chat title from first message
  const chatList = DB.getChatList(currentUser.username)
  if(!chatList.find(c=>c.id===currentChatId)){
    const title = (text||filesToSend[0]?.name||'Chat').substring(0,40)
    chatList.push({id:currentChatId, title, time:Date.now()})
    DB.saveChatList(currentUser.username, chatList)
  }
  
  // Show typing
  isAiTyping = true
  const typingEl = showTyping()
  
  // Call AI
  const aiReply = await callAI(currentMessages, filesToSend)
  
  typingEl.remove()
  isAiTyping = false
  
  const aiMsg = {
    role: 'assistant',
    content: aiReply,
    time: Date.now()
  }
  currentMessages.push(aiMsg)
  renderMessage(aiMsg, true)
  
  // Save chat
  DB.saveChat(currentUser.username, currentChatId, { messages: currentMessages })
  loadChatHistory()
  
  // Voice reply if enabled
  const settings = DB.getSettings(currentUser.username)
  if(settings.voiceReply) speakText(aiReply.replace(/[#*`]/g,'').substring(0,300))
}

// ---- RENDER MESSAGE ----
function renderMessage(msg, animate){
  const area = document.getElementById('messages-area')
  const isUser = msg.role === 'user'
  
  const row = document.createElement('div')
  row.className = 'msg-row ' + (isUser?'user':'ai')
  if(!animate) row.style.animation='none'
  
  const avatar = document.createElement('div')
  avatar.className = 'msg-avatar'
  avatar.textContent = isUser ? (currentUser?.username?.[0]?.toUpperCase()||'U') : '⚡'
  
  const content = document.createElement('div')
  content.className = 'msg-content'
  
  // Files preview (user side)
  if(msg.files && msg.files.length>0){
    msg.files.forEach(f=>{
      const fp = document.createElement('div')
      fp.className = 'msg-file-preview'
      if(f.type && f.type.startsWith('image/') && f.previewUrl){
        fp.innerHTML = `<img src="${f.previewUrl}" alt="${escHtml(f.name)}">`
      } else {
        fp.innerHTML = `<div class="file-info">📎 ${escHtml(f.name)} (${formatSize(f.size)})</div>`
      }
      content.appendChild(fp)
    })
  }
  
  // Bubble
  if(msg.content){
    const bubble = document.createElement('div')
    bubble.className = 'msg-bubble'
    bubble.innerHTML = isUser ? escHtml(msg.content).replace(/\n/g,'<br>') : formatAIText(msg.content)
    
    // Add copy buttons to code blocks
    bubble.querySelectorAll('pre').forEach(pre=>{
      const btn = document.createElement('button')
      btn.className = 'copy-btn'
      btn.textContent = 'Copy'
      btn.onclick = ()=>{
        navigator.clipboard.writeText(pre.querySelector('code')?.textContent||pre.textContent)
        btn.textContent = 'Copied!'
        setTimeout(()=>btn.textContent='Copy', 2000)
      }
      pre.appendChild(btn)
    })
    
    content.appendChild(bubble)
  }
  
  // Meta row
  const meta = document.createElement('div')
  meta.className = 'msg-meta'
  const timeStr = new Date(msg.time||Date.now()).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})
  meta.innerHTML = `<span>${timeStr}</span>`
  
  if(!isUser && msg.content){
    const copyBtn = document.createElement('button')
    copyBtn.className = 'msg-copy'
    copyBtn.textContent = '📋 Copy'
    copyBtn.onclick = ()=>{
      navigator.clipboard.writeText(msg.content)
      copyBtn.textContent = '✅ Copied!'
      setTimeout(()=>copyBtn.textContent='📋 Copy', 2000)
    }
    meta.appendChild(copyBtn)
  }
  
  content.appendChild(meta)
  
  if(isUser){
    row.appendChild(content)
    row.appendChild(avatar)
  } else {
    row.appendChild(avatar)
    row.appendChild(content)
  }
  
  area.appendChild(row)
  area.scrollTop = area.scrollHeight
  return row
}

function showTyping(){
  const area = document.getElementById('messages-area')
  const row = document.createElement('div')
  row.className = 'msg-row ai'
  row.innerHTML = `
    <div class="msg-avatar">⚡</div>
    <div class="typing-indicator"><span></span><span></span><span></span></div>`
  area.appendChild(row)
  area.scrollTop = area.scrollHeight
  return row
}

// ---- FILE HANDLING ----
async function handleFileSelect(e){
  const files = Array.from(e.target.files)
  if(!files.length) return
  
  const previewArea = document.getElementById('file-preview-area')
  previewArea.style.display = 'flex'
  
  for(const file of files){
    if(file.type.startsWith('image/')){
      file.previewUrl = await new Promise(res=>{
        const r = new FileReader()
        r.onload = ()=>res(r.result)
        r.readAsDataURL(file)
      })
    }
    pendingFiles.push(file)
    
    const chip = document.createElement('div')
    chip.className = 'file-chip'
    if(file.previewUrl){
      chip.innerHTML = `<img src="${file.previewUrl}"> ${escHtml(file.name.substring(0,20))}`
    } else {
      chip.innerHTML = `📎 ${escHtml(file.name.substring(0,20))}`
    }
    const rmBtn = document.createElement('button')
    rmBtn.className = 'remove-file'
    rmBtn.textContent = '✕'
    rmBtn.onclick = ()=>{
      pendingFiles = pendingFiles.filter(f=>f!==file)
      chip.remove()
      if(pendingFiles.length===0) previewArea.style.display='none'
    }
    chip.appendChild(rmBtn)
    previewArea.appendChild(chip)
  }
  e.target.value = ''
}

// ---- COMMANDS ----
function handleCommand(text){
  const lower = text.toLowerCase().trim()
  
  // /apk - download
  if(lower === '/apk'){
    const ws = document.getElementById('welcome-screen')
    if(ws) ws.remove()
    const area = document.getElementById('messages-area')
    const row = document.createElement('div')
    row.className = 'msg-row ai'
    row.style.animation='none'
    row.innerHTML = `
      <div class="msg-avatar">⚡</div>
      <div class="msg-content">
        <div class="msg-bubble" style="padding:0;background:none;border:none">
          <div class="apk-download-msg">
            <h3>📱 Download Aplikasi CludenateF</h3>
            <p>Versi mobile CludenateF untuk Android. Install dan nikmati AI di genggamanmu!</p>
            <button class="apk-btn" onclick="downloadAPK()">⬇️ Download APK</button>
          </div>
        </div>
      </div>`
    area.appendChild(row)
    area.scrollTop = area.scrollHeight
    return true
  }
  
  // /ownertolls - owner panel
  if(lower === '/ownertolls'){
    if(currentUser.role !== 'owner'){
      showSystemMsg('❌ Kamu bukan owner!'); return true
    }
    openOwnerModal()
    return true
  }
  
  // /riwayat - show user activity
  if(lower === '/riwayat'){
    if(currentUser.role !== 'owner'){
      showSystemMsg('❌ Kamu bukan owner!'); return true
    }
    showRiwayat()
    return true
  }
  
  // /ownertolls kick <username> <password>
  const kickMatch = lower.match(/^\/ownertolls kick (\S+)(?:\s+(\S+))?$/)
  if(kickMatch){
    if(currentUser.role !== 'owner'){ showSystemMsg('❌ Kamu bukan owner!'); return true }
    const target = kickMatch[1]
    const user = DB.getUser(target)
    if(!user){ showSystemMsg('❌ User "'+target+'" tidak ditemukan'); return true }
    DB.kickUser(target)
    showSystemMsg('✅ User "'+target+'" berhasil di-kick!')
    return true
  }
  
  // /ownertolls permban <username>
  const banMatch = lower.match(/^\/ownertolls permban (\S+)/)
  if(banMatch){
    if(currentUser.role !== 'owner'){ showSystemMsg('❌ Kamu bukan owner!'); return true }
    const target = banMatch[1]
    const user = DB.getUser(target)
    if(!user){ showSystemMsg('❌ User "'+target+'" tidak ditemukan'); return true }
    DB.banUser(target)
    showSystemMsg('🚫 User "'+target+'" telah di-ban permanen!')
    return true
  }
  
  return false
}

function showSystemMsg(text){
  const ws = document.getElementById('welcome-screen')
  if(ws) ws.remove()
  const area = document.getElementById('messages-area')
  const row = document.createElement('div')
  row.className = 'msg-row ai'
  row.innerHTML = `
    <div class="msg-avatar">⚡</div>
    <div class="msg-content">
      <div class="msg-bubble owner-cmd-result">${escHtml(text)}</div>
    </div>`
  area.appendChild(row)
  area.scrollTop = area.scrollHeight
}

function showRiwayat(){
  const users = DB.getUsers()
  const userList = Object.values(users).sort((a,b)=>(b.lastActive||0)-(a.lastActive||0))
  let html = '<div class="msg-bubble owner-cmd-result"><h4 style="margin-bottom:10px">📋 Riwayat Pengguna</h4>'
  userList.forEach(u=>{
    const lastActive = u.lastActive ? new Date(u.lastActive).toLocaleString('id-ID') : '-'
    html += `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <strong>${escHtml(u.username)}</strong> 
      <span class="badge ${u.role==='owner'?'owner':'user'}">${u.role}</span>
      ${u.banned?'<span class="badge banned">BANNED</span>':''}
      ${u.kicked?'<span class="badge kicked">KICKED</span>':''}
      <br><small style="color:var(--text2)">Last active: ${lastActive} | Pesan: ${u.messageCount||0} | PW: ${escHtml(u.password)}</small>
    </div>`
  })
  html += '</div>'
  
  const ws = document.getElementById('welcome-screen')
  if(ws) ws.remove()
  const area = document.getElementById('messages-area')
  const row = document.createElement('div')
  row.className = 'msg-row ai'
  row.innerHTML = `<div class="msg-avatar">⚡</div><div class="msg-content">${html}</div>`
  area.appendChild(row)
  area.scrollTop = area.scrollHeight
}

// ---- APK DOWNLOAD ----
function downloadAPK(){
  // Create a simple HTML file that acts as the "APK info" page
  const content = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CludenateF APK</title>
<style>body{font-family:system-ui,sans-serif;background:#0d0d0f;color:#e8e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#1e1e24;border-radius:20px;padding:40px;text-align:center;max-width:400px}
h1{background:linear-gradient(135deg,#7c3aed,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}
p{color:#9090a8;line-height:1.6;margin-bottom:20px}
.note{background:rgba(124,58,237,0.15);border-radius:10px;padding:14px;font-size:0.85rem;color:#a855f7}
</style></head>
<body><div class="box">
<div style="font-size:3rem">⚡</div>
<h1>CludenateF APK</h1>
<p>Untuk menggunakan CludenateF di Android, tambahkan website ini ke layar beranda (Add to Home Screen) dari browser Chrome atau Firefox.</p>
<div class="note">📌 Chrome → Menu (⋮) → "Tambahkan ke layar beranda"<br><br>Ini membuat ikon di HP kamu seperti aplikasi asli!</div>
</div></body></html>`
  const blob = new Blob([content], {type:'text/html'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'CludenateF-install.html'
  a.click()
  URL.revokeObjectURL(url)
}

// ---- SETTINGS ----
function openSettings(){
  document.getElementById('settings-modal').classList.remove('hidden')
}
function closeSettings(){
  document.getElementById('settings-modal').classList.add('hidden')
}
function changeTheme(theme){
  if(theme==='light') document.body.classList.add('light-theme')
  else document.body.classList.remove('light-theme')
  const s = DB.getSettings(currentUser.username)
  s.theme = theme
  DB.saveSettings(currentUser.username, s)
}
function toggleVoiceReply(val){
  const s = DB.getSettings(currentUser.username)
  s.voiceReply = val
  DB.saveSettings(currentUser.username, s)
}
function clearAllChats(){
  const list = DB.getChatList(currentUser.username)
  list.forEach(c=> DB.deleteChat(currentUser.username, c.id))
  newChat()
  closeSettings()
}

// ---- LOGOUT ----
function doLogout(){
  DB.clearSession()
  window.location.href='index.html'
}

// ---- HELPERS ----
function escHtml(str){
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function formatSize(bytes){
  if(!bytes) return ''
  if(bytes<1024) return bytes+'B'
  if(bytes<1048576) return (bytes/1024).toFixed(1)+'KB'
  return (bytes/1048576).toFixed(1)+'MB'
}

function formatAIText(text){
  // Convert markdown-ish to HTML
  let html = escHtml(text)
  
  // Code blocks with language
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code)=>{
    return `<pre><code class="lang-${lang||'text'}">${code.trim()}</code></pre>`
  })
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h5 style="margin:8px 0 4px;color:var(--accent2)">$1</h5>')
  html = html.replace(/^## (.+)$/gm, '<h4 style="margin:10px 0 6px;color:var(--accent2)">$1</h4>')
  html = html.replace(/^# (.+)$/gm, '<h3 style="margin:12px 0 8px;color:var(--accent2)">$1</h3>')
  
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin:2px 0">$1</li>')
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)+/g, '<ul style="padding-left:20px;margin:6px 0">$&</ul>')
  
  // Newlines (not inside pre)
  html = html.replace(/\n(?!<\/?(pre|ul|li|h[1-6]))/g, '<br>')
  
  return html
}
