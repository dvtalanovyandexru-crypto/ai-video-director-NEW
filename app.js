/* =============================================
   AI Video Director — Application Logic
   ============================================= */

// ─── VOICES DATABASE ────────────────────────────
const VOICES = {
  male: [
    { id:'pNInz6obpgDQGcFmaJgB', name:'Adam',   desc:'Уверенный, глубокий' },
    { id:'ErXwobaYiN019PkySvjV', name:'Antoni',  desc:'Мягкий, дружелюбный' },
    { id:'TxGEqnHWrfWFTfGW9XjX', name:'Josh',    desc:'Энергичный, молодой' },
    { id:'flq6f7yk4E4fJM5XTYuZ', name:'Michael', desc:'Авторитетный, зрелый' },
    { id:'VR6AewLTigWG4xSOukaG', name:'Arnold',  desc:'Хриплый, брутальный' },
    { id:'yoZ06aMxZJJ28mfd3POQ', name:'Sam',     desc:'Нейтральный, ровный' }
  ],
  female: [
    { id:'EXAVITQu4vr4xnSDxMaL', name:'Bella',   desc:'Тёплый, спокойный' },
    { id:'21m00Tcm4TlvDq8ikWAM', name:'Rachel',  desc:'Профессиональный' },
    { id:'MF3mGyEYCl7XYWbV9V6O', name:'Elli',    desc:'Энергичный, молодой' },
    { id:'XrExE9yKIg1WjnnlVkGX', name:'Matilda', desc:'Драматичный, выразительный' },
    { id:'jBpfAIEqE40eXqZr6BAP', name:'Gigi',    desc:'Игривый, лёгкий' },
    { id:'oWAxZDx7w5VEj9dCyTzz', name:'Grace',   desc:'Элегантный, мягкий' }
  ]
};

// ─── STATE ──────────────────────────────────────
const S = {
  step: 1, total: 9,
  charCount: 1,
  lighting: 'natural',
  colorScheme: 'neutral',
  videoModel: 'kling-3',
  ttsModel: 'elevenlabs-multilingual-v2',
  duration: '10',
  aspectRatio: '16:9',
  sceneCount: '1',
  angles: ['medium'],
  quality: 'standard',
  voices: {},       // {1: voiceId, 2: voiceId, 3: voiceId}
  genderTab: {},    // {1: 'male', 2: 'female', ...}
  charFiles: {},
  genActive: false,
  results: {}
};
const STORE_KEY = 'avd_draft';

// ─── INIT ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDropzone('dropScenario','fileScenario', f => readText(f).then(t => eid('scenarioText').value = t));
  initDropzone('dropDialog','fileDialog', f => readText(f).then(t => parseDialogs(t)));
  eid('speechSpeed').addEventListener('input', e => eid('speedVal').textContent = (+e.target.value).toFixed(1)+'x');
  eid('voiceStability').addEventListener('input', e => eid('stabilityVal').textContent = (+e.target.value).toFixed(2));
  addDialog(); addDialog();
  buildChars();
  // Restore persisted api key / webhook
  eid('apiKeyInput').value  = ls('avd_api')  || '';
  eid('webhookInput').value = ls('avd_hook') || '';
  if (localStorage.getItem(STORE_KEY)) eid('toast').classList.remove('hidden');
  updateUI();
});

// ─── NAVIGATION ─────────────────────────────────
function goNext() {
  if (S.step === 6) buildVoices();
  if (S.step === 8) buildSummary();
  if (S.step >= S.total) return;
  eid('step'+S.step).classList.remove('active');
  S.step++;
  eid('step'+S.step).classList.add('active');
  updateUI();
  scrollTo({top:0,behavior:'smooth'});
}
function goBack() {
  if (S.step <= 1) return;
  eid('step'+S.step).classList.remove('active');
  S.step--;
  eid('step'+S.step).classList.add('active');
  updateUI();
  scrollTo({top:0,behavior:'smooth'});
}
function updateUI() {
  const pct = (S.step / S.total * 100).toFixed(0);
  eid('progressBar').style.width = pct + '%';
  eid('stepLabel').textContent = `Шаг ${S.step} из ${S.total}`;
}

// ─── OPTION PICKERS ─────────────────────────────
function pickOpt(el, key) {
  el.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  S[key] = el.dataset.val;
}
function toggleOpt(el, key) {
  el.classList.toggle('selected');
  const arr = [];
  el.closest('.opts').querySelectorAll('.opt.selected').forEach(o => arr.push(o.dataset.val));
  S[key] = arr;
}
function pickModel(el, key) {
  el.closest('.model-list').querySelectorAll('.model').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  S[key] = el.dataset.val;
}

// ─── CHARACTER COUNT ────────────────────────────
function setCharCount(n) {
  S.charCount = n;
  eid('charCountOpts').querySelectorAll('.opt').forEach((o,i) =>
    o.classList.toggle('selected', i === n-1));
  buildChars();
}

// ─── CHARACTER CARDS (step 3) ───────────────────
function buildChars() {
  const g = eid('charsGrid'); g.innerHTML = '';
  for (let i = 1; i <= S.charCount; i++) {
    const d = document.createElement('div');
    d.className = 'char-card';
    d.innerHTML = `
      <h4>Персонаж ${i}</h4>
      <div class="upload-row">
        <div class="upload-box" id="faceBox${i}" onclick="eid('faceIn${i}').click()">
          <span class="u-icon">📷</span><span>Фото лица</span><small>JPG, PNG</small>
          <input type="file" id="faceIn${i}" accept="image/*" hidden onchange="markUpload(${i},'face',this)">
        </div>
        <div class="upload-box" id="vidBox${i}" onclick="eid('vidIn${i}').click()">
          <span class="u-icon">🎬</span><span>Видео-референс</span><small>MP4, MOV</small>
          <input type="file" id="vidIn${i}" accept="video/*" hidden onchange="markUpload(${i},'video',this)">
        </div>
      </div>
      <input type="text" id="cName${i}" placeholder="Имя персонажа">
      <textarea id="cDesc${i}" rows="2" placeholder="Описание: возраст, внешность, характер..."></textarea>`;
    g.appendChild(d);
  }
}
function markUpload(i, type, inp) {
  if (!inp.files[0]) return;
  if (!S.charFiles[i]) S.charFiles[i] = {};
  S.charFiles[i][type] = inp.files[0];
  const box = eid(type==='face'?'faceBox'+i:'vidBox'+i);
  box.classList.add('has');
  box.querySelector('span:nth-child(2)').textContent = inp.files[0].name;
}

// ─── DIALOGS (step 2) ──────────────────────────
function addDialog(name, text) {
  const d = document.createElement('div');
  d.className = 'dlg-row';
  d.innerHTML = `
    <input type="text" class="d-name" placeholder="Имя" value="${name||''}">
    <textarea class="d-text" rows="1" placeholder="Текст реплики...">${text||''}</textarea>
    <button onclick="this.parentElement.remove()">✕</button>`;
  eid('dialogList').appendChild(d);
}
function parseDialogs(txt) {
  eid('dialogList').innerHTML = '';
  txt.split('\n').filter(l=>l.trim()).forEach(l => {
    const ci = l.indexOf(':');
    if (ci > 0) addDialog(l.slice(0,ci).trim(), l.slice(ci+1).trim());
    else addDialog('', l.trim());
  });
}
function getDialogs() {
  const arr = [];
  document.querySelectorAll('.dlg-row').forEach(r => {
    const n = r.querySelector('.d-name').value.trim();
    const t = r.querySelector('.d-text').value.trim();
    if (n||t) arr.push({name:n, text:t});
  });
  return arr;
}

// ─── VOICE SELECTION (step 7) ───────────────────
function buildVoices() {
  const c = eid('voicesCard'); c.innerHTML = '';
  for (let i = 1; i <= S.charCount; i++) {
    const cName = eid('cName'+i)?.value || 'Персонаж '+i;
    if (!S.genderTab[i]) S.genderTab[i] = 'male';
    const gender = S.genderTab[i];
    const sec = document.createElement('div');
    sec.className = 'voice-section';
    sec.id = 'vsec'+i;
    sec.innerHTML = `
      <div class="voice-title">Персонаж ${i}: <em>${esc(cName)}</em></div>
      <div class="gender-tabs">
        <div class="g-tab ${gender==='male'?'on':''}" onclick="switchGender(${i},'male')">👨 Мужские</div>
        <div class="g-tab ${gender==='female'?'on':''}" onclick="switchGender(${i},'female')">👩 Женские</div>
      </div>
      <div class="v-grid" id="vgrid${i}">${voiceCards(i, gender)}</div>`;
    c.appendChild(sec);
  }
}
function voiceCards(ci, gender) {
  return VOICES[gender].map(v =>
    `<div class="v-card ${S.voices[ci]===v.id?'on':''}" onclick="pickVoice(${ci},'${v.id}')">
      <strong>${v.name}</strong><small>${v.desc}</small>
    </div>`
  ).join('');
}
function switchGender(ci, g) {
  S.genderTab[ci] = g;
  const sec = eid('vsec'+ci);
  sec.querySelectorAll('.g-tab').forEach(t => t.classList.toggle('on', t.textContent.includes(g==='male'?'Муж':'Жен')));
  eid('vgrid'+ci).innerHTML = voiceCards(ci, g);
}
function pickVoice(ci, vid) {
  S.voices[ci] = vid;
  eid('vgrid'+ci).querySelectorAll('.v-card').forEach(c =>
    c.classList.toggle('on', c.onclick.toString().includes("'"+vid+"'")));
  // Simpler: rebuild
  eid('vgrid'+ci).innerHTML = voiceCards(ci, S.genderTab[ci]);
}

// ─── SUMMARY (step 9) ──────────────────────────
function buildSummary() {
  const mNames = {'kling-3':'Kling 3','seedance-1-5-pro':'Seedance 1.5 Pro'};
  const tNames = {'elevenlabs-multilingual-v2':'Multilingual v2','elevenlabs-multilingual-v1':'Multilingual v1','elevenlabs-turbo-v2-5':'Turbo v2.5'};
  const qNames = {draft:'Черновик',standard:'Стандарт',high:'Высокое'};
  eid('summaryBlock').innerHTML = [
    si('Сценарий', trunc(eid('scenarioText').value,50)),
    si('Интерьер', trunc(eid('locationText').value,50)),
    si('Персонажей', S.charCount),
    si('Модель видео', mNames[S.videoModel]||S.videoModel),
    si('Озвучка', tNames[S.ttsModel]||S.ttsModel),
    si('Длительность', S.duration+' сек'),
    si('Формат', S.aspectRatio),
    si('Сцен', S.sceneCount),
    si('Качество', qNames[S.quality]||S.quality)
  ].join('');

  const vt = S.videoModel==='kling-3'?'3–5 мин':'1–3 мин';
  const tot = S.videoModel==='kling-3'?'~6–10 минут':'~4–7 минут';
  eid('timeBlock').innerHTML = `
    <div class="time-row"><span class="t-l">Видео (${mNames[S.videoModel]}, ${S.duration}с, ${S.sceneCount} сц.)</span><span class="t-v">${vt}</span></div>
    <div class="time-row"><span class="t-l">Озвучка диалогов</span><span class="t-v">~1 мин</span></div>
    <div class="time-row"><span class="t-l">Синхронизация</span><span class="t-v">~2 мин</span></div>
    <div class="time-row total"><span class="t-l">Итого:</span><span class="t-v">${tot}</span></div>`;
}
function si(l,v){return `<div class="s-item"><span class="s-lbl">${l}</span><span class="s-val">${v||'—'}</span></div>`}
function trunc(s,n){return s?(s.length>n?s.slice(0,n)+'…':s):'—'}

// ─── DROPZONE HELPER ────────────────────────────
function initDropzone(zoneId, inputId, cb) {
  const z = eid(zoneId), inp = eid(inputId);
  z.addEventListener('click', () => inp.click());
  z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over') });
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', e => {
    e.preventDefault(); z.classList.remove('over');
    if (e.dataTransfer.files[0]) { markDrop(z, e.dataTransfer.files[0]); cb(e.dataTransfer.files[0]); }
  });
  inp.addEventListener('change', () => {
    if (inp.files[0]) { markDrop(z, inp.files[0]); cb(inp.files[0]); }
  });
}
function markDrop(z, f) { z.classList.add('has-file'); z.querySelector('p').textContent = f.name; }
function readText(f) {
  return new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsText(f); });
}

// ─── DRAFT SAVE/LOAD ────────────────────────────
function collectAll() {
  const data = {
    scenarioText: eid('scenarioText').value,
    locationText: eid('locationText').value,
    charCount: S.charCount,
    dialogs: getDialogs(),
    characters: [],
    clothingText: eid('clothingText').value,
    lighting: S.lighting,
    colorScheme: S.colorScheme,
    posesText: eid('posesText').value,
    notesText: eid('notesText').value,
    videoModel: S.videoModel,
    ttsModel: S.ttsModel,
    speechSpeed: eid('speechSpeed').value,
    voiceStability: eid('voiceStability').value,
    voices: S.voices,
    genderTab: S.genderTab,
    duration: S.duration,
    aspectRatio: S.aspectRatio,
    sceneCount: S.sceneCount,
    angles: S.angles,
    quality: S.quality,
    savedAt: new Date().toISOString()
  };
  for (let i=1;i<=S.charCount;i++) {
    data.characters.push({
      name: eid('cName'+i)?.value||'',
      description: eid('cDesc'+i)?.value||''
    });
  }
  return data;
}
function saveDraft() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(collectAll()));
    localStorage.setItem('avd_api', eid('apiKeyInput').value);
    localStorage.setItem('avd_hook', eid('webhookInput').value);
    toast('📋 Черновик сохранён!');
  } catch(e) { toast('Ошибка сохранения'); }
}
function loadDraft() {
  hideToast();
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!d) return;
    eid('scenarioText').value = d.scenarioText||'';
    eid('locationText').value = d.locationText||'';
    if (d.charCount) setCharCount(d.charCount);
    if (d.dialogs?.length) {
      eid('dialogList').innerHTML='';
      d.dialogs.forEach(x=>addDialog(x.name,x.text));
    }
    eid('clothingText').value = d.clothingText||'';
    eid('posesText').value = d.posesText||'';
    eid('notesText').value = d.notesText||'';
    if (d.lighting){ S.lighting=d.lighting; restoreOpts('lightingOpts',d.lighting) }
    if (d.colorScheme){ S.colorScheme=d.colorScheme; restoreOpts('colorOpts',d.colorScheme) }
    if (d.videoModel){ S.videoModel=d.videoModel; restoreModel('videoModelList',d.videoModel) }
    if (d.ttsModel){ S.ttsModel=d.ttsModel; restoreModel('ttsModelList',d.ttsModel) }
    if (d.speechSpeed){ eid('speechSpeed').value=d.speechSpeed; eid('speedVal').textContent=(+d.speechSpeed).toFixed(1)+'x' }
    if (d.voiceStability){ eid('voiceStability').value=d.voiceStability; eid('stabilityVal').textContent=(+d.voiceStability).toFixed(2) }
    if (d.voices) S.voices=d.voices;
    if (d.genderTab) S.genderTab=d.genderTab;
    if (d.duration){ S.duration=d.duration; restoreOpts('durationOpts',d.duration) }
    if (d.aspectRatio){ S.aspectRatio=d.aspectRatio; restoreOpts('aspectOpts',d.aspectRatio) }
    if (d.sceneCount){ S.sceneCount=d.sceneCount; restoreOpts('sceneOpts',d.sceneCount) }
    if (d.quality){ S.quality=d.quality; restoreOpts('qualityOpts',d.quality) }
    if (d.angles){ S.angles=d.angles; restoreMulti('anglesOpts',d.angles) }
    setTimeout(()=>{
      if (d.characters) d.characters.forEach((c,i)=>{
        const n=eid('cName'+(i+1)), desc=eid('cDesc'+(i+1));
        if(n)n.value=c.name||''; if(desc)desc.value=c.description||'';
      });
    },80);
    toast('✅ Черновик загружен');
  } catch(e){ toast('Ошибка загрузки черновика'); console.error(e); }
}
function restoreOpts(id,val){
  const el=eid(id);if(!el)return;
  el.querySelectorAll('.opt').forEach(o=>o.classList.toggle('selected',o.dataset.val===String(val)));
}
function restoreModel(id,val){
  const el=eid(id);if(!el)return;
  el.querySelectorAll('.model').forEach(m=>m.classList.toggle('selected',m.dataset.val===val));
}
function restoreMulti(id,arr){
  const el=eid(id);if(!el)return;
  el.querySelectorAll('.opt').forEach(o=>o.classList.toggle('selected',arr.includes(o.dataset.val)));
}
function hideToast(){ eid('toast').classList.add('hidden') }

// ─── PROMPT BUILDER ─────────────────────────────
function buildPrompt(data) {
  const p=[];
  if(data.scenarioText) p.push(data.scenarioText);
  if(data.locationText) p.push('Setting: '+data.locationText);
  const lm={natural:'natural daylight',warm:'warm candlelight',cold:'cool blue lighting',dramatic:'dramatic high-contrast lighting',soft:'soft diffused lighting'};
  const cm={warm:'warm color palette',cold:'cool color palette',neutral:'neutral color palette',cinematic:'cinematic color grading'};
  const l=lm[data.lighting]||'',c=cm[data.colorScheme]||'';
  if(l||c)p.push('Visual style: '+[l,c].filter(Boolean).join(', '));
  if(data.clothingText)p.push('Clothing: '+data.clothingText);
  if(data.posesText)p.push('Actions: '+data.posesText);
  const am={'close-up':'close-up shot',medium:'medium shot',wide:'wide shot','over-shoulder':'over-the-shoulder shot','two-shot':'two-shot'};
  if(data.angles?.length)p.push('Camera: '+data.angles.map(a=>am[a]||a).join(', '));
  if(data.quality==='high')p.push('High quality, cinematic, 1080p');
  if(data.notesText)p.push(data.notesText);
  return p.join('. ');
}

// ─── BUILD PAYLOAD ──────────────────────────────
function buildPayload() {
  const d = collectAll();
  const chars = d.characters.map((c,i)=>{
    const vid = S.voices[i+1]||null;
    let vName=null;
    if(vid){const all=[...VOICES.male,...VOICES.female];const v=all.find(x=>x.id===vid);if(v)vName=v.name;}
    return {index:i+1, name:c.name||('Персонаж '+(i+1)), description:c.description, voiceId:vid, voiceName:vName};
  });
  return {
    timestamp: new Date().toISOString(),
    scenario: { text:d.scenarioText, location:d.locationText },
    characterCount: d.charCount,
    characters: chars,
    dialogs: d.dialogs,
    filming: {clothing:d.clothingText, lighting:d.lighting, colorScheme:d.colorScheme, poses:d.posesText, notes:d.notesText},
    videoGeneration: {model:d.videoModel, duration:+d.duration, aspectRatio:d.aspectRatio, sceneCount:+d.sceneCount, angles:d.angles, quality:d.quality},
    tts: {model:d.ttsModel, speed:+d.speechSpeed, stability:+d.voiceStability},
    assembledPrompt: buildPrompt(d)
  };
}

// ─── API CALLS ──────────────────────────────────
const API = 'https://apiin.one/api/v1';

async function apiPost(path, apiKey, body) {
  const r = await fetch(API+path, {
    method:'POST',
    headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e?.error?.message||'API error '+r.status)}
  const ct=r.headers.get('content-type')||'';
  if(ct.includes('audio'))return{direct:true, blob:await r.blob()};
  return r.json();
}
async function apiGet(path, apiKey) {
  const r = await fetch(API+path, {headers:{'Authorization':'Bearer '+apiKey}});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e?.error?.message||'Status error '+r.status)}
  return r.json();
}
async function pollTask(apiKey, taskId, onStatus, interval=6000, timeout=600000) {
  const t0=Date.now();
  while(Date.now()-t0<timeout){
    const r=await apiGet('/tasks/'+taskId, apiKey);
    const st=r?.data?.status||r?.status||'';
    if(onStatus)onStatus(st,r);
    if(['COMPLETED','completed','SUCCESS','success'].includes(st))return r;
    if(['FAILED','failed','ERROR','error'].includes(st))throw new Error('Task failed: '+(r?.data?.error||''));
    await wait(interval);
  }
  throw new Error('Timeout');
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ─── LAUNCH ─────────────────────────────────────
async function launch() {
  const apiKey = eid('apiKeyInput').value.trim();
  const hook = eid('webhookInput').value.trim();
  if(!apiKey){toast('⚠️ Введите API-ключ!');return}
  localStorage.setItem('avd_api', apiKey);
  if(hook) localStorage.setItem('avd_hook', hook);
  saveDraft(); // auto-save

  const payload = buildPayload();

  // ── Webhook mode (N8N) ──
  if(hook){
    showModal();
    log('info','Отправка данных на N8N webhook...');
    try{
      const r=await fetch(hook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload, apiKey})});
      if(!r.ok) throw new Error('HTTP '+r.status);
      log('ok','✅ Данные отправлены на N8N! Workflow запущен.');
      log('info','Генерация выполняется на стороне N8N.');
      setBar(100,'Отправлено');
    }catch(e){log('err','Ошибка webhook: '+e.message)}
    return;
  }

  // ── Direct API mode ──
  showModal();
  S.genActive=true;
  try{
    // 1) TTS
    const dlgs = payload.dialogs||[];
    if(dlgs.length){
      log('info','🎙️ Генерация озвучки ('+dlgs.length+' реплик)...');
      for(let i=0;i<dlgs.length;i++){
        const d=dlgs[i];
        const ci=payload.characters.findIndex(c=>c.name&&c.name.toLowerCase()===d.name.toLowerCase());
        const vid=ci>=0?payload.characters[ci].voiceId:(payload.characters[0]?.voiceId);
        if(!vid){log('info','Пропуск: голос не выбран для "'+d.name+'"');continue}
        log('info','TTS '+(i+1)+'/'+dlgs.length+': '+trunc(d.text,40));
        try{
          const res=await apiPost('/audio/speech', apiKey, {
            model:payload.tts.model,
            text:d.text,
            voice_id:vid,
            speed:payload.tts.speed,
            stability:payload.tts.stability
          });
          if(res.direct){log('ok','Аудио '+(i+1)+' получено');S.results['tts_'+i]=res.blob}
          else if(res?.data?.task_id){
            log('info','Ожидание TTS задачи...');
            const done=await pollTask(apiKey,res.data.task_id,st=>log('info','TTS: '+st));
            log('ok','Аудио '+(i+1)+' готово');S.results['tts_'+i]=done;
          }
        }catch(te){log('err','TTS ошибка: '+te.message)}
        setBar(((i+1)/dlgs.length)*30,'Озвучка...');
      }
    }

    // 2) Video
    log('info','🎬 Запуск видеогенерации...');
    setBar(35,'Генерация видео...');
    const sc=+payload.videoGeneration.sceneCount;
    const prompts=splitScenes(payload.assembledPrompt, sc);
    for(let s=0;s<prompts.length;s++){
      log('info','Сцена '+(s+1)+'/'+prompts.length+'...');
      try{
        const body={
          model:payload.videoGeneration.model,
          prompt:prompts[s],
          duration:Math.floor(payload.videoGeneration.duration/sc),
          aspect_ratio:payload.videoGeneration.aspectRatio,
          sound:false
        };
        if(payload.videoGeneration.model==='kling-3') body.mode=payload.videoGeneration.quality==='high'?'pro':'std';
        if(payload.videoGeneration.model==='seedance-1-5-pro'){
          body.resolution=payload.videoGeneration.quality==='high'?'720p':'480p';
          body.generateAudio=false;
        }
        const vr=await apiPost('/videos/generations', apiKey, body);
        if(vr?.data?.task_id){
          log('info','Задача: '+vr.data.task_id);
          const done=await pollTask(apiKey, vr.data.task_id, (st)=>{
            log('info','Видео: '+st);
            setBar(35+((s+1)/prompts.length)*55, 'Сцена '+(s+1)+': '+st);
          }, 8000, 600000);
          log('ok','Сцена '+(s+1)+' готова!');
          S.results['video_'+s]=done;
          const url=done?.data?.output?.video_url||done?.data?.video_url||done?.output?.video_url;
          if(url)log('ok','URL: '+url);
        }
      }catch(ve){log('err','Ошибка сцены '+(s+1)+': '+ve.message)}
    }
    setBar(100,'Готово!');
    log('ok','🎬 Генерация завершена!');
    eid('dlBtn').classList.remove('hidden');
    eid('dlBtn').onclick=downloadResults;
  }catch(e){log('err','Критическая ошибка: '+e.message)}
  finally{S.genActive=false}
}

function splitScenes(prompt,n){
  if(n<=1)return[prompt];
  const sents=prompt.split(/[.!?]+/).filter(s=>s.trim());
  if(sents.length<n)return Array.from({length:n},(_,i)=>`Scene ${i+1}/${n}. ${prompt}`);
  const per=Math.ceil(sents.length/n), out=[];
  for(let i=0;i<n;i++)out.push(sents.slice(i*per,Math.min((i+1)*per,sents.length)).join('. ').trim());
  return out;
}

function downloadResults(){
  Object.entries(S.results).forEach(([k,v])=>{
    if(v instanceof Blob){const u=URL.createObjectURL(v);const a=document.createElement('a');a.href=u;a.download=k+'.mp3';a.click();URL.revokeObjectURL(u)}
    else{const url=v?.data?.output?.video_url||v?.data?.video_url||v?.output?.video_url;if(url)window.open(url,'_blank')}
  });
  closeModal();
}

// ─── MODAL ──────────────────────────────────────
function showModal(){eid('modal').classList.remove('hidden');eid('logBox').innerHTML='';eid('genBar').style.width='0';eid('genStatus').textContent='Подготовка...';eid('dlBtn').classList.add('hidden')}
function closeModal(){eid('modal').classList.add('hidden')}
function log(type,msg){
  const t=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  eid('logBox').innerHTML+=`<div class="log-e ${type}"><span class="log-t">[${t}]</span><span class="log-m">${esc(msg)}</span></div>`;
  eid('logBox').scrollTop=9999;
}
function setBar(pct,txt){eid('genBar').style.width=Math.min(pct,100)+'%';if(txt)eid('genStatus').textContent=txt}

// ─── UTILS ──────────────────────────────────────
function eid(id){return document.getElementById(id)}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function ls(k){return localStorage.getItem(k)}
function toast(msg){
  const t=document.createElement('div');t.className='toast';t.innerHTML='<span>'+msg+'</span>';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300)},2200);
}
