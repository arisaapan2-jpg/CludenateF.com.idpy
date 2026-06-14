// ===== AUTH.JS =====

function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'))
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.add('hidden'))
  if(tab==='login'){
    document.querySelectorAll('.tab-btn')[0].classList.add('active')
    document.getElementById('login-form').classList.remove('hidden')
  } else {
    document.querySelectorAll('.tab-btn')[1].classList.add('active')
    document.getElementById('register-form').classList.remove('hidden')
  }
}

function doLogin(){
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value
  const err = document.getElementById('login-error')
  err.textContent = ''
  if(!username||!password){ err.textContent='Isi username dan password dulu!'; return }
  const user = DB.getUser(username)
  if(!user){ err.textContent='Username tidak ditemukan'; return }
  if(user.password !== password){ err.textContent='Password salah'; return }
  if(user.banned){ err.textContent='Akun kamu telah di-banned permanen 🚫'; return }
  if(user.kicked){
    // Reset kicked status on next login (kicked = temp)
    DB.unkickUser(username)
  }
  DB.setSession(user.username)
  window.location.href='chat.html'
}

function doRegister(){
  const username = document.getElementById('reg-username').value.trim()
  const password = document.getElementById('reg-password').value
  const confirm = document.getElementById('reg-confirm').value
  const err = document.getElementById('reg-error')
  err.textContent = ''
  if(!username||!password){ err.textContent='Isi semua field!'; return }
  if(username.length < 3){ err.textContent='Username minimal 3 karakter'; return }
  if(password.length < 5){ err.textContent='Password minimal 5 karakter'; return }
  if(password !== confirm){ err.textContent='Konfirmasi password tidak cocok'; return }
  if(/[^a-zA-Z0-9_\/.-]/.test(username)){ err.textContent='Username hanya boleh huruf, angka, _, /, .'; return }
  const result = DB.createUser(username, password)
  if(!result.ok){ err.textContent = result.msg; return }
  err.style.color = '#10b981'
  err.textContent = 'Berhasil daftar! Silakan login...'
  setTimeout(()=>{
    err.style.color = ''
    switchTab('login')
    document.getElementById('login-username').value = username
    err.textContent = ''
  }, 1200)
}

// Enter key support
document.addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    const loginForm = document.getElementById('login-form')
    const regForm = document.getElementById('register-form')
    if(!loginForm.classList.contains('hidden')) doLogin()
    else if(!regForm.classList.contains('hidden')) doRegister()
  }
})

// Redirect if already logged in
window.addEventListener('DOMContentLoaded', ()=>{
  const session = DB.getSession()
  if(session) window.location.href='chat.html'
})
