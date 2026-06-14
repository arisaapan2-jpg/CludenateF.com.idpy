// ===== AI.JS – CludenateF Brain =====

const AI_SYSTEM = `Kamu adalah CludenateF, AI serba bisa yang sangat cerdas, ramah, dan helpful.

KEPRIBADIAN:
- Nama kamu: CludenateF
- Kamu pintar, santai, dan bisa ngobrol dengan siapa aja
- Kamu bisa bahasa Indonesia dan Inggris
- Kamu selalu mau bantu dengan apapun yang ditanya

KEMAMPUAN KAMU:
1. 💻 CODING - JavaScript, Python, HTML, CSS, Java, C++, PHP, SQL, React, Node.js, dan bahasa lainnya
2. 📚 SEMUA PELAJARAN - Matematika, Fisika, Kimia, Biologi, Sejarah, Geografi, Bahasa Indonesia, Bahasa Inggris, dll
3. 🧠 ANALISIS - Analisis foto, video, file, dokumen, data, kode
4. 💬 CURHAT & SUPPORT - Bisa dengerin cerita, kasih saran, support emosional
5. 🌍 PENGETAHUAN UMUM - Tentang dunia, manusia, sains, teknologi, budaya, dll
6. ✍️ MENULIS - Esai, puisi, cerita, artikel, laporan, email
7. 🔢 MATEMATIKA - Perhitungan, persamaan, aljabar, kalkulus
8. 🧬 SAINS - Penjelasan ilmiah mendalam
9. 🎮 GAMING, HOBI, HIBURAN - Bisa diskusi apa aja
10. 👥 TENTANG MANUSIA - Psikologi, sosiologi, budaya, hubungan sosial

FORMAT JAWABAN:
- Untuk kode: gunakan markdown code block dengan bahasa yang tepat
- Untuk penjelasan panjang: gunakan struktur yang rapi
- Untuk percakapan biasa: santai dan natural
- Selalu berikan jawaban yang berguna dan akurat
- Jika ada file/gambar yang dikirim, analisis dengan detail

Kamu adalah AI terpintar dan terhelpful. Bantu user semaksimal mungkin!`

async function callAI(messages, files = []) {
  // Build message content
  let userContent = []
  
  // Add files/images if any
  for(const file of files){
    if(file.type && file.type.startsWith('image/')){
      const base64 = await fileToBase64(file)
      const mediaType = file.type
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      })
    } else if(file.type === 'application/pdf'){
      const base64 = await fileToBase64(file)
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 }
      })
    } else if(file.textContent){
      userContent.push({
        type: 'text',
        text: `[File: ${file.name}]\n\`\`\`\n${file.textContent}\n\`\`\``
      })
    }
  }
  
  // Add text message if present
  const lastMsg = messages[messages.length-1]
  if(lastMsg && lastMsg.role === 'user'){
    userContent.push({ type: 'text', text: lastMsg.content || '' })
  }
  
  // Build history (excluding last message which we're building)
  const history = messages.slice(0,-1).map(m=>({
    role: m.role,
    content: m.content
  }))
  
  // Final messages array
  const apiMessages = [
    ...history,
    { role: 'user', content: userContent.length > 0 ? userContent : (lastMsg?.content || '') }
  ]

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: AI_SYSTEM,
        messages: apiMessages
      })
    })
    const data = await resp.json()
    if(data.error) return '❌ Error: ' + data.error.message
    const textBlocks = data.content.filter(c=>c.type==='text').map(c=>c.text).join('\n')
    return textBlocks || '...'
  } catch(e) {
    return '❌ Gagal terhubung ke AI. Periksa koneksi internet kamu.'
  }
}

async function fileToBase64(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader()
    reader.onload = ()=> res(reader.result.split(',')[1])
    reader.onerror = ()=> rej(new Error('Gagal baca file'))
    reader.readAsDataURL(file)
  })
}

async function readTextFile(file){
  return new Promise((res)=>{
    const reader = new FileReader()
    reader.onload = ()=> res(reader.result)
    reader.onerror = ()=> res('[Gagal baca file]')
    reader.readAsText(file)
  })
        }
