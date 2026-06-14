//===== OWNER.JS =====

function openOwnerModal(){
  if(currentUser.role !== 'owner') return
  document.getElementById('owner-modal').classList.remove('hidden')
  ownerTab('users')
}

function closeOwnerModal(){
  document.getElementById('owner-modal').classList.add('hidden')
}

function ownerTab(tab){
  document.querySelectorAll('.otab').forEach(b=>b.classList.remove('active'))
  document.querySelectorAll('.otab-content').forEach(c=>c.classList.add('hidden'))
  
  const tabs = ['users','kick','permban']
  const idx = tabs.indexOf(tab)
  document.querySelectorAll('.otab')[idx].classList.add('active')
  document.getElementById('otab-'+tab).classList.remove('hidden')
  
  if(tab==='users') renderUserList()
  if(tab==='kick') renderKickedList()
  if(tab==='permban') renderBannedList()
}

function renderUserList(){
  const users = DB.getUsers()
  const container = document.getElementById('users-list')
  container.innerHTML = ''
  
  const userArr = Object.values(users).sort((a,b)=>(b.lastActive||0)-(a.lastActive||0))
  
  if(userArr.length===0){
    container.innerHTML='<div style="color:var(--text2);font-size:0.85rem">Belum ada pengguna</div>'
    return
  }
  
  userArr.forEach(u=>{
    const card = document.createElement('div')
    card.className = 'user-card'
    const lastActive = u.lastActive ? new Date(u.lastActive).toLocaleString('id-ID') : '-'
    const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'
    
    card.innerHTML = `
      <div class="uc-name">
        <span>${escHtml(u.username)}</span>
        <span class="badge ${u.role==='owner'?'owner':'user'}">${u.role}</span>
        ${u.banned?'<span class="badge banned">BANNED</span>':''}
        ${u.kicked?'<span class="badge kicked">KICKED</span>':''}
      </div>
      <div class="uc-meta">
        🔑 Password: <strong>${escHtml(u.password)}</strong><br>
        📅 Daftar: ${created} | 🕐 Terakhir aktif: ${lastActive}<br>
        💬 Total pesan: ${u.messageCount||0}
      </div>
      ${u.role!=='owner'?`
      <div style="display:flex;gap:6px;margin-top:8px">
        ${!u.kicked?`<button onclick="ownerKickFromPanel('${escHtml(u.username)}')" class="btn-warning" style="padding:5px 10px;font-size:0.75rem">🦵 Kick</button>`:''}
        ${!u.banned?`<button onclick="ownerBanFromPanel('${escHtml(u.username)}')" class="btn-danger" style="padding:5px 10px;font-size:0.75rem">🚫 Ban</button>`:''}
        ${u.kicked||u.banned?`<button onclick="ownerUnban('${escHtml(u.username)}')" style="padding:5px 10px;font-size:0.75rem;background:var(--success);border:none;border-radius:6px;color:#fff;cursor:pointer">✅ Restore</button>`:''}
      </div>`:''}
    `
    container.appendChild(card)
  })
}

function renderKickedList(){
  const kicked = DB.getKicked()
  const el = document.getElementById('kicked-list')
  if(kicked.length===0){
    el.innerHTML='<div style="color:var(--text2);font-size:0.82rem">Belum ada yang di-kick</div>'
    return
  }
  el.innerHTML = '<div style="color:var(--text2);font-size:0.82rem;margin-bottom:6px">Daftar yang pernah di-kick:</div>' +
    kicked.map(u=>`<div style="background:var(--bg3);padding:8px 12px;border-radius:8px;margin-bottom:4px;font-size:0.85rem">🦵 ${escHtml(u)}</div>`).join('')
}

function renderBannedList(){
  const banned = DB.getBanned()
  const el = document.getElementById('banned-list')
  if(banned.length===0){
    el.innerHTML='<div style="color:var(--text2);font-size:0.82rem">Belum ada yang di-ban</div>'
    return
  }
  el.innerHTML = '<div style="color:var(--text2);font-size:0.82rem;margin-bottom:6px">Daftar yang di-ban permanen:</div>' +
    banned.map(u=>`<div style="background:var(--bg3);padding:8px 12px;border-radius:8px;margin-bottom:4px;font-size:0.85rem;color:var(--danger)">🚫 ${escHtml(u)}</div>`).join('')
}

function ownerKickFromPanel(username){
  if(!confirm('Kick user "'+username+'"?')) return
  DB.kickUser(username)
  renderUserList()
  renderKickedList()
}

function ownerBanFromPanel(username){
  if(!confirm('Ban permanen user "'+username+'"?')) return
  DB.banUser(username)
  renderUserList()
  renderBannedList()
}

function ownerUnban(username){
  const users = DB.getUsers()
  const key = username.toLowerCase()
  if(users[key]){
    users[key].banned = false
    users[key].kicked = false
    users[key].status = 'active'
    DB.saveUsers(users)
  }
  DB.unkickUser(username)
  // Also remove from banned
  const banned = DB.getBanned().filter(u=>u!==key)
  localStorage.setItem('cf_banned', JSON.stringify(banned))
  renderUserList()
}

function kickUser(){
  const username = document.getElementById('kick-username').value.trim()
  if(!username){ alert('Masukkan username!'); return }
  const user = DB.getUser(username)
  if(!user){ alert('User tidak ditemukan!'); return }
  if(!confirm('Kick user "'+username+'"?')) return
  DB.kickUser(username)
  document.getElementById('kick-username').value=''
  renderKickedList()
  alert('✅ User "'+username+'" berhasil di-kick!')
}

function permBanUser(){
  const username = document.getElementById('ban-username').value.trim()
  if(!username){ alert('Masukkan username!'); return }
  const user = DB.getUser(username)
  if(!user){ alert('User tidak ditemukan!'); return }
  if(!confirm('Ban PERMANEN user "'+username+'"? Ini tidak bisa di-undo kecuali manual!')) return
  DB.banUser(username)
  document.getElementById('ban-username').value=''
  renderBannedList()
  alert('🚫 User "'+username+'" telah di-ban permanen!')
      }
