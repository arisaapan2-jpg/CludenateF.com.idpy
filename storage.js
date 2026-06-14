// ===== STORAGE.JS – Semua data disimpan di localStorage =====

const DB = {
  // ---- USER ----
  getUsers(){
    return JSON.parse(localStorage.getItem('cf_users')||'{}')
  },
  saveUsers(u){
    localStorage.setItem('cf_users', JSON.stringify(u))
  },
  getUser(username){
    return this.getUsers()[username.toLowerCase()] || null
  },
  createUser(username, password){
    const users = this.getUsers()
    const key = username.toLowerCase()
    if(users[key]) return {ok:false, msg:'Username sudah dipakai'}
    users[key] = {
      username: username,
      password: password,
      role: 'user',
      createdAt: Date.now(),
      lastActive: Date.now(),
      messageCount: 0,
      banned: false,
      kicked: false,
      status: 'active'
    }
    this.saveUsers(users)
    return {ok:true}
  },
  updateUserActivity(username){
    const users = this.getUsers()
    const key = username.toLowerCase()
    if(users[key]){
      users[key].lastActive = Date.now()
      users[key].messageCount = (users[key].messageCount||0)+1
      this.saveUsers(users)
    }
  },
  initOwner(){
    const users = this.getUsers()
    const ownerKey = 'owner/admin10102'
    if(!users[ownerKey]){
      users[ownerKey] = {
        username: 'owner/admin10102',
        password: 'sepatunyamahalcok1',
        role: 'owner',
        createdAt: Date.now(),
        lastActive: Date.now(),
        messageCount: 0,
        banned: false,
        kicked: false,
        status: 'active'
      }
      this.saveUsers(users)
    }
  },

  // ---- SESSION ----
  getSession(){
    const s = sessionStorage.getItem('cf_session')
    return s ? JSON.parse(s) : null
  },
  setSession(username){
    sessionStorage.setItem('cf_session', JSON.stringify({username, loginAt: Date.now()}))
  },
  clearSession(){
    sessionStorage.removeItem('cf_session')
  },

  // ---- CHATS ----
  getChatList(username){
    const key = 'cf_chats_'+username.toLowerCase()
    return JSON.parse(localStorage.getItem(key)||'[]')
  },
  saveChatList(username, list){
    localStorage.setItem('cf_chats_'+username.toLowerCase(), JSON.stringify(list))
  },
  getChat(username, chatId){
    const key = 'cf_chat_'+username.toLowerCase()+'_'+chatId
    return JSON.parse(localStorage.getItem(key)||'null')
  },
  saveChat(username, chatId, data){
    localStorage.setItem('cf_chat_'+username.toLowerCase()+'_'+chatId, JSON.stringify(data))
  },
  deleteChat(username, chatId){
    localStorage.removeItem('cf_chat_'+username.toLowerCase()+'_'+chatId)
    const list = this.getChatList(username).filter(c=>c.id!==chatId)
    this.saveChatList(username, list)
  },

  // ---- SETTINGS ----
  getSettings(username){
    const s = localStorage.getItem('cf_settings_'+username.toLowerCase())
    return s ? JSON.parse(s) : {theme:'dark', voiceReply:false}
  },
  saveSettings(username, settings){
    localStorage.setItem('cf_settings_'+username.toLowerCase(), JSON.stringify(settings))
  },

  // ---- BAN/KICK LISTS ----
  getBanned(){
    return JSON.parse(localStorage.getItem('cf_banned')||'[]')
  },
  getKicked(){
    return JSON.parse(localStorage.getItem('cf_kicked')||'[]')
  },
  banUser(username){
    const users = this.getUsers()
    const key = username.toLowerCase()
    if(users[key]){
      users[key].banned = true
      users[key].status = 'banned'
      this.saveUsers(users)
    }
    const banned = this.getBanned()
    if(!banned.includes(key)) banned.push(key)
    localStorage.setItem('cf_banned', JSON.stringify(banned))
  },
  kickUser(username){
    const users = this.getUsers()
    const key = username.toLowerCase()
    if(users[key]){
      users[key].kicked = true
      users[key].status = 'kicked'
      this.saveUsers(users)
    }
    const kicked = this.getKicked()
    if(!kicked.includes(key)) kicked.push(key)
    localStorage.setItem('cf_kicked', JSON.stringify(kicked))
  },
  unkickUser(username){
    const users = this.getUsers()
    const key = username.toLowerCase()
    if(users[key]){
      users[key].kicked = false
      users[key].status = 'active'
      this.saveUsers(users)
    }
    const kicked = this.getKicked().filter(u=>u!==key)
    localStorage.setItem('cf_kicked', JSON.stringify(kicked))
  }
}

// Init owner on load
DB.initOwner()
