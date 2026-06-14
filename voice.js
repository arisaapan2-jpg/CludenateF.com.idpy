// ===== VOICE.JS =====

let recognition = null
let isRecording = false

function toggleVoice(){
  if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
    alert('Browser kamu tidak mendukung voice chat. Coba pakai Chrome!')
    return
  }
  if(isRecording){
    stopVoice()
  } else {
    startVoice()
  }
}

function startVoice(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'id-ID'
  recognition.continuous = false
  recognition.interimResults = false
  
  recognition.onstart = ()=>{
    isRecording = true
    document.getElementById('voice-btn').classList.add('recording')
    document.getElementById('voice-btn').textContent = '🔴'
    showVoiceStatus('🎤 Sedang mendengarkan...')
  }
  
  recognition.onresult = (e)=>{
    const transcript = e.results[0][0].transcript
    const input = document.getElementById('msg-input')
    input.value = transcript
    autoResize(input)
    hideVoiceStatus()
    stopVoice()
    setTimeout(()=>sendMessage(), 500)
  }
  
  recognition.onerror = (e)=>{
    hideVoiceStatus()
    stopVoice()
    if(e.error !== 'aborted'){
      alert('Gagal mendengarkan: ' + e.error)
    }
  }
  
  recognition.onend = ()=>{
    stopVoice()
    hideVoiceStatus()
  }
  
  recognition.start()
}

function stopVoice(){
  isRecording = false
  document.getElementById('voice-btn').classList.remove('recording')
  document.getElementById('voice-btn').textContent = '🎤'
  if(recognition){
    try{ recognition.stop() }catch(e){}
    recognition = null
  }
}

let voiceStatusEl = null
function showVoiceStatus(text){
  if(!voiceStatusEl){
    voiceStatusEl = document.createElement('div')
    voiceStatusEl.className = 'voice-status'
    document.body.appendChild(voiceStatusEl)
  }
  voiceStatusEl.textContent = text
  voiceStatusEl.classList.add('show')
}
function hideVoiceStatus(){
  if(voiceStatusEl) voiceStatusEl.classList.remove('show')
}

function speakText(text){
  if(!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'id-ID'
  utterance.rate = 1.0
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
      }
