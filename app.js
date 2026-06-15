// 簡單的 flashcard 與管理頁共用程式
(function(){
  const STORAGE_KEY = 'flash_words_v1'

  function loadWords(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }catch(e){return[]}
  }
  function saveWords(words){ localStorage.setItem(STORAGE_KEY, JSON.stringify(words)) }

  // 嘗試使用公開翻譯服務取得中文翻譯（fallback）
  async function fetchTranslation(word){
    if(!word) return ''
    try{
      const q = encodeURIComponent(word)
      const url = 'https://api.mymemory.translated.net/get?q='+q+'&langpair=en|zh-CN'
      const res = await fetch(url)
      if(!res.ok) return ''
      const d = await res.json()
      if(d && d.responseData && d.responseData.translatedText) return d.responseData.translatedText
    }catch(e){ console.warn('translation fallback failed',e) }
    return ''
  }

  // 如果在 index.html
  if(document.getElementById('card')){
    const front = document.getElementById('card-front')
    const back = document.getElementById('card-back')
    const card = document.getElementById('card')
    let words = loadWords()
    if(!words.length){
      words = [{word:'example',translation:'範例',pos:'n.',example:'This is an example sentence.',root:'ex- (out) + -ample'}]
      saveWords(words)
    }
    let idx=0
    function render(){
      const w = words[idx]
      front.textContent = w.word || ''
      back.innerHTML = '<strong>翻譯：</strong>'+ (w.translation||'') + '<br><strong>詞性：</strong>'+ (w.pos||'') + '<br><strong>例句：</strong>'+ (w.example||'') + '<br><strong>字根分析：</strong>'+ (w.root||'')
    }
    render()

    document.getElementById('flip').addEventListener('click',()=>{
      card.classList.toggle('flipped')
    })
    document.getElementById('next').addEventListener('click',()=>{ idx = (idx+1)%words.length; card.classList.remove('flipped'); render() })
    document.getElementById('prev').addEventListener('click',()=>{ idx = (idx-1+words.length)%words.length; card.classList.remove('flipped'); render() })
    card.addEventListener('click',()=>card.classList.toggle('flipped'))

    // 快速加入單字並自動填入（若有 Apps Script URL 則呼叫後端）
    const quickInput = document.getElementById('quickWord')
    const quickBtn = document.getElementById('addQuick')
    async function autofillAndAdd(word){
      if(!word) return
      const appsUrl = localStorage.getItem('apps_url') || ''
      let entry = {word:word,translation:'',pos:'',example:'',root:''}
      if(appsUrl){
        try{
          const res = await fetch(appsUrl, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'autofill',word})})
          const data = await res.json()
          if(data && data.success){ entry.translation=data.translation||''; entry.pos=data.pos||''; entry.example=data.example||''; entry.root=data.root||'' }
        }catch(e){ console.warn('autofill backend failed',e) }
      }
      // client-side fallback for POS/example using dictionaryapi.dev
      if(!entry.pos || !entry.example){
        try{
          const dict = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word))
          if(dict.ok){
            const d = await dict.json()
            if(Array.isArray(d) && d[0].meanings && d[0].meanings[0]){
              entry.pos = entry.pos || d[0].meanings[0].partOfSpeech || ''
              const def = d[0].meanings[0].definitions && d[0].meanings[0].definitions[0]
              if(def && def.example) entry.example = entry.example || def.example
            }
          }
        }catch(e){ console.warn('dict fetch failed',e) }
      }
      // 若仍無翻譯，使用公開翻譯 API
      if(!entry.translation){
        try{ entry.translation = await fetchTranslation(word) }catch(e){ console.warn('translation fallback failed',e) }
      }
      // 簡單字根分析
      try{ entry.root = entry.root || word.replace(/(ing|ed|ly|s|es)$/i,'') }catch(e){}

      words.push(entry)
      saveWords(words)
      idx = words.length-1
      card.classList.remove('flipped')
      render()
    }

    if(quickBtn){
      quickBtn.addEventListener('click', ()=>{ autofillAndAdd(quickInput.value.trim()); quickInput.value='' })
      quickInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ autofillAndAdd(quickInput.value.trim()); quickInput.value='' } })
    }
  }

  // 如果在 admin.html
  if(document.getElementById('wordForm')){
    const form = document.getElementById('wordForm')
    const status = document.getElementById('status')
    const appsUrlInput = document.getElementById('appsUrl')
    appsUrlInput.value = localStorage.getItem('apps_url') || ''

    document.getElementById('autoFill').addEventListener('click', async ()=>{
      const word = form.word.value.trim()
      if(!word){ status.textContent='請先輸入英文單字'; return }
      const appsUrl = appsUrlInput.value.trim()
      localStorage.setItem('apps_url', appsUrl)
      if(!appsUrl){ status.textContent='請先填入 Apps Script Web App URL'; return }
      status.textContent = '自動填入中...'
      try{
        const res = await fetch(appsUrl, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({action:'autofill', word})
        })
        const data = await res.json()
        if(data.success){
          form.translation.value = data.translation || ''
          form.pos.value = data.pos || ''
          form.example.value = data.example || ''
          form.root.value = data.root || ''
          status.textContent = '自動填入完成'
        } else {
          status.textContent = '自動填入失敗：' + (data.error||'unknown')
        }
      }catch(err){ status.textContent = '自動填入錯誤：'+err }
      // 如果後端沒有提供翻譯，使用公開翻譯 API 作為 fallback
      if(!form.translation.value){
        try{
          const t = await fetchTranslation(word)
          if(t) form.translation.value = t
        }catch(e){ console.warn('fallback translation failed',e) }
      }
    })

    form.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const appsUrl = appsUrlInput.value.trim()
      localStorage.setItem('apps_url', appsUrl)
      const payload = {
        action:'save',
        word: form.word.value.trim(),
        translation: form.translation.value.trim(),
        pos: form.pos.value.trim(),
        example: form.example.value.trim(),
        root: form.root.value.trim()
      }
      // 先儲存在 localStorage
      const words = loadWords()
      words.push({word:payload.word,translation:payload.translation,pos:payload.pos,example:payload.example,root:payload.root})
      saveWords(words)

      if(!appsUrl){ status.textContent='已儲存至本機，但未設定 Apps Script URL'; return }
      status.textContent='儲存中...'
      try{
        const res = await fetch(appsUrl, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
        const data = await res.json()
        if(data.success){ status.textContent='已儲存到 Google 試算表' } else { status.textContent='後端儲存失敗：'+(data.error||'unknown') }
      }catch(err){ status.textContent='後端儲存錯誤：'+err }
    })
  }
})();
