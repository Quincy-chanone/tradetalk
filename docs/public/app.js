(async function () {
  "use strict";
  const C = window.TRADE_TALK_CONTENT;
  const V11 = window.TRADE_TALK_V11 || {modules:{},categories:{},phrases:[],words:{},dialogs:{},vocabulary:[]};
  const PHONETICS = window.TRADE_TALK_PHONETICS || [];
  const fallbackCourseContent = {
    industry:{title:"行业英语",subtitle:"按产品系列学习用途、规格、材质、表面处理、安装、测试与包装",products:[],chapters:[]},
    scenarios:{title:"客户情景实战",subtitle:"把基础外贸英语融入真实客户沟通流程",chapters:[]}
  };
  const [industryContent,scenarioContent,qaContent] = await Promise.all([
    fetch("content/industry.json").then(response=>response.ok?response.json():Promise.reject()).catch(()=>fallbackCourseContent.industry),
    fetch("content/scenarios.json").then(response=>response.ok?response.json():Promise.reject()).catch(()=>fallbackCourseContent.scenarios),
    fetch("content/qa-units.json").then(response=>response.ok?response.json():Promise.reject()).catch(()=>({schema:"tradetalk.qa.v1",units:[],dialogues:[]}))
  ]);
  const COURSE_CONTENT={industry:industryContent,scenarios:scenarioContent};
  const phraseAliases=V11.phraseAliases||{};
  const categoryNames=Object.fromEntries(Object.values(V11.categories||{}).flat().map(item=>[item.id,item.zh]));
  C.phrases=C.phrases.filter(item=>!phraseAliases[item.id]).map(item=>{const assignment=V11.legacyAssignments?.[item.id];return assignment?{...item,module:assignment[0],category:assignment[1],categoryZh:categoryNames[assignment[1]]||item.scene}:item;});
  Object.assign(C.topics,V11.topics||{});C.phrases.push(...(V11.phrases||[]));Object.entries(V11.words||{}).forEach(([word,data])=>{C.words[word]=C.words[word]?[C.words[word][0]||data[0],C.words[word][1]||data[1],data[2]]:data;});Object.assign(C.dialogs,V11.dialogs||{});
  const KEY = "tradeTalkV1";
  const SYNC_KEY = "tradeTalkSyncCode";
  const SYNC_VERSION_KEY = "tradeTalkSyncVersion";
  const SYNC_DIRTY_KEY = "tradeTalkSyncDirty";
  const defaultState = {savedWords:{},savedPhrases:{},wordDetails:{},reviews:{},learned:[],itemProgress:{},dailyPlans:{},qaDailyPlans:{},customQaUnits:[],syncConflicts:[],dialogues:{},spoken:0,mastered:[],days:[],sources:[],knowledgeItems:[],customPhrases:[],customChapters:[],knowledgeCourses:[],dailyTasks:{},generatedCourse:{ids:[],topic:null,level:null,createdAt:null},settings:{rate:.9,accent:"en-GB",level:"A2",theme:null,sidebarCollapsed:false,hideApprovedKnowledge:false},shuffle:0,courseSchemaVersion:3};
  let state = load();
  state=migrateCourseState(state);
  state.settings = {...defaultState.settings,...(state.settings || {})};
  state.dailyTasks = state.dailyTasks || {};
  state.itemProgress = state.itemProgress || {};
  state.dailyPlans = state.dailyPlans || {};
  state.qaDailyPlans = state.qaDailyPlans || {};
  state.customQaUnits = state.customQaUnits || [];
  state.dialogues = state.dialogues || {};
  state.generatedCourse = {...defaultState.generatedCourse,...(state.generatedCourse || {})};
  state.knowledgeItems = (state.knowledgeItems || []).map(item => ({...item,status:item.status || "pending",extracted:item.extracted || [],addedPhraseIds:item.addedPhraseIds || [],courseAssignments:Array.isArray(item.courseAssignments)?item.courseAssignments:[]}));
  state.customPhrases = (state.customPhrases || []).map(item=>({...item,courseAssignments:Array.isArray(item.courseAssignments)?item.courseAssignments:[]}));
  state.customChapters = state.customChapters || [];
  state.customChapters.forEach(chapter=>{C.topics[chapter.id]={name:chapter.name||chapter.zh,zh:chapter.zh,icon:chapter.icon||"＋",color:chapter.color||"mint"};});
  const hadStandaloneKnowledgeCourses=(state.knowledgeCourses||[]).length||state.knowledgeItems?.some(item=>item.courseId);state.knowledgeCourses=[];(state.knowledgeItems||[]).forEach(item=>delete item.courseId);if(hadStandaloneKnowledgeCourses)localStorage.setItem(KEY,JSON.stringify(state));
  state.wordDetails = state.wordDetails || {};
  if (state.sources?.length && !state.sourcesMigrated) {
    state.knowledgeItems.push(...state.sources.map(source => ({id:source.id || `legacy-${Date.now()}-${Math.random()}`,library:"product",title:source.name || "历史采集资料",content:source.excerpt || "",sourceUrl:source.url || "",addedAt:source.addedAt || new Date().toISOString(),origin:"legacy"})));
    state.sourcesMigrated = true; state.sources = []; localStorage.setItem(KEY, JSON.stringify(state));
  }
  let practiceItems = [];
  let practiceIndex = 0;
  let practiceRevealStage = 0;
  let speechRun = 0;
  let speechReady = null;
  let bookTab = "words";
  let selectedWord = null;
  let dialogTurn = 0;
  let dialogScenario = "shower";
  let dialogReveal = 0;
  let dialogScore = 0;
  let dialogMistakes = new Set();
  let dialogReviewIds = new Set();
  let libraryView = "all";
  let selectedTrack = null;
  let selectedChapter = null;
  let selectedUnit = null;
  let reviewedKnowledgeId = null;
  let extractedCandidates = [];
  let reviewCourseAssignments = [];
  const bulkCourseAssignmentKeys = new Set();
  const selectedKnowledgeIds = new Set();
  let visibleKnowledgeIds = [];
  let recorder = null;
  let recordingStream = null;
  let recordingChunks = [];
  let recordingUrl = null;
  let recordingTimer = null;
  let qaRecordingTarget = null;
  let recognition = null;
  let transcript = "";
  let deferredInstall = null;
  let syncTimer = null;
  let syncBusy = false;
  let syncApplying = false;
  let phonemeAudio = null;
  let phonemePlaybackId = 0;
  const $ = id => document.getElementById(id);

  function load() {
    try { const stored=JSON.parse(localStorage.getItem(KEY)||"{}");return {...structuredClone(defaultState),...stored,courseSchemaVersion:Number(stored.courseSchemaVersion||0)}; }
    catch (_) { return structuredClone(defaultState); }
  }
  function canonicalPhraseId(id) { return phraseAliases[id] || id; }
  function migrateCourseState(input,force=false) {
    const next={...structuredClone(defaultState),...(input||{})};
    if(Number(next.courseSchemaVersion||0)>=3&&!force)return next;
    const remapList=list=>[...new Set((list||[]).map(canonicalPhraseId))];
    const remapMap=source=>Object.entries(source||{}).reduce((result,[id,value])=>{const canonical=canonicalPhraseId(id);result[canonical]=value&&typeof value==="object"?{...(result[canonical]||{}),...value}:value;return result;},{});
    next.learned=remapList(next.learned);next.mastered=remapList(next.mastered);next.savedPhrases=remapMap(next.savedPhrases);next.reviews=remapMap(next.reviews);next.itemProgress=remapMap(next.itemProgress);
    Object.values(next.dailyPlans||{}).forEach(plan=>{const seen=new Set();plan.items=(plan.items||[]).map(entry=>({...entry,id:canonicalPhraseId(entry.id)})).filter(entry=>!seen.has(entry.id)&&seen.add(entry.id));plan.completed=remapMap(plan.completed);});
    next.generatedCourse={...defaultState.generatedCourse,...(next.generatedCourse||{}),ids:remapList(next.generatedCourse?.ids)};
    Object.values(next.savedWords||{}).forEach(item=>{if(item?.phraseId)item.phraseId=canonicalPhraseId(item.phraseId);});
    (next.knowledgeItems||[]).forEach(item=>{item.addedPhraseIds=remapList(item.addedPhraseIds);(item.extracted||[]).forEach(candidate=>{if(candidate.phraseId)candidate.phraseId=canonicalPhraseId(candidate.phraseId);});});
    const legacyChapters={shower:"shower",floor:"floor",door:"door",spigot:"spigot",standoff:"standoff",sliding:"sliding",finish:"material"};const customNames=Object.fromEntries((next.customChapters||[]).map(chapter=>[chapter.id,chapter.zh]));
    (next.customPhrases||[]).forEach(item=>{if(!item.module)item.module="industry";if(!item.category)item.category=legacyChapters[item.topic]||item.topic||"door";if(!item.categoryZh)item.categoryZh=customNames[item.category]||categoryNames[item.category]||item.scene||"产品知识";});
    next.qaDailyPlans=next.qaDailyPlans||{};next.customQaUnits=next.customQaUnits||[];
    next.courseSchemaVersion=3;
    try{localStorage.setItem(KEY,JSON.stringify(next));if(localStorage.getItem(SYNC_KEY))localStorage.setItem(SYNC_DIRTY_KEY,"1");}catch(_){/* keep the in-memory migration */}
    return next;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state));if(!syncApplying&&localStorage.getItem(SYNC_KEY))localStorage.setItem(SYNC_DIRTY_KEY,"1"); } catch (_) { toast("本机存储空间不足，请导出备份后删除部分资料"); } renderStats(); if(!syncApplying)scheduleSync(); }
  function uid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
  function day(date = new Date()) { return new Intl.DateTimeFormat("en-CA", {timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}).format(date); }
  function addDay(n) { const d = new Date(); d.setDate(d.getDate() + n); return day(d); }
  function markDay() { const today = day(); if (!state.days.includes(today)) state.days.push(today); }
  function toast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2200); }
  function allPhrases() { return [...C.phrases,...state.customPhrases]; }
  function phraseById(id) { return allPhrases().find(item => item.id === canonicalPhraseId(id)); }
  function allQaUnits() { return [...(qaContent.units||[]),...(state.customQaUnits||[])]; }
  function qaById(id) { return allQaUnits().find(item=>item.id===id); }
  function qaQuestion(unit) { const alternatives=[unit.customerQuestion,...(unit.variants||[])].filter(Boolean);const reps=Number(state.reviews[unit.id]?.reps||0);return alternatives[reps%alternatives.length]||unit.customerQuestion; }
  function validateQaUnit(unit,index=0) {
    const errors=[];if(!unit||unit.type!=="qa-unit")errors.push(`第 ${index+1} 组 type 必须为 qa-unit`);if(!String(unit?.id||"").trim())errors.push(`第 ${index+1} 组缺少 id`);if(!unit?.productId||!unit?.chapterId)errors.push(`${unit?.id||`第 ${index+1} 组`} 缺少产品或章节`);if(!unit?.customerQuestion?.en||!unit?.customerQuestion?.zh)errors.push(`${unit?.id||`第 ${index+1} 组`} 缺少中英客户问题`);if(!Array.isArray(unit?.answer?.en)||!unit.answer.en.length||!Array.isArray(unit?.answer?.zh)||!unit.answer.zh.length)errors.push(`${unit?.id||`第 ${index+1} 组`} 缺少中英参考回答`);if(!unit?.productKnowledge)errors.push(`${unit?.id||`第 ${index+1} 组`} 缺少产品知识`);return errors;
  }
  function qaDailyPlan() {
    const today=day();if(state.qaDailyPlans[today]?.items?.length)return state.qaDailyPlans[today];
    const units=allQaUnits(),used=new Set(),items=[];const add=(list,bucket)=>list.forEach(unit=>{if(unit&&!used.has(unit.id)&&items.length<5){used.add(unit.id);items.push({id:unit.id,bucket});}});
    add(Object.entries(state.reviews).filter(([id,review])=>qaById(id)&&review.due<=today).sort((a,b)=>String(a[1].due).localeCompare(String(b[1].due))).map(([id])=>qaById(id)),"due");
    add(Object.entries(state.reviews).filter(([id,review])=>qaById(id)&&Number(review.errors)>0).sort((a,b)=>Number(b[1].errors)-Number(a[1].errors)).map(([id])=>qaById(id)),"weak");
    add(units.filter(unit=>!state.itemProgress[unit.id]),"new");add(units.filter(unit=>state.itemProgress[unit.id]?.status!=="mastered"),"weak");
    const plan={date:today,createdAt:new Date().toISOString(),items,completed:{}};state.qaDailyPlans[today]=plan;save();return plan;
  }
  function rateDailyQa(id,rating){const plan=qaDailyPlan();if(plan.completed[id])return;plan.completed[id]=rating;schedule(id,rating,rating==="hard");learn(id,"qa-rated");markDay();save();renderToday();}
  function qaCard(unit,index,bucket,completed){
    const question=qaQuestion(unit),article=document.createElement("article");article.className=`qa-card ${completed?"completed":""}`;
    article.innerHTML=`<div class="qa-card-head"><span class="qa-number">${String(index+1).padStart(2,"0")}</span><div><small>${esc(unit.knowledgePoint)} · ${esc(unit.level)}</small><h3>客户问题</h3></div><span class="training-badge ${bucket}">${bucket==="due"?"到期复习":bucket==="weak"?"薄弱巩固":"新学"}</span></div><button class="qa-listen primary" type="button">▶ 先听客户问题</button><div class="qa-question" hidden><p><strong>${esc(question.en)}</strong></p><p>${esc(question.zh)}</p><div class="qa-knowledge"><b>产品知识</b><p>${esc(unit.productKnowledge)}</p></div></div><div class="qa-attempt"><b>先自己口头回答，再查看参考答案</b><button data-record type="button">● 开始回答录音</button><audio data-recording controls hidden></audio></div><div class="qa-answer" hidden><b>参考回答</b><p>${unit.answer.en.map(esc).join(" ")}</p><p>${unit.answer.zh.map(esc).join(" ")}</p><button data-answer-speak type="button">▶ 单独播放参考回答</button><button data-hide-answer type="button">隐藏答案，再回答一次</button></div><div class="qa-flow-actions"><button data-reveal type="button">显示问题、中文和知识</button><button data-answer type="button">展开参考答案</button></div><div class="daily-rating"><button data-qa-rating="hard" type="button">不会</button><button data-qa-rating="unsure" type="button">模糊</button><button data-qa-rating="easy" type="button">会了</button>${completed?`<small>✓ 已完成 · ${completed==="easy"?"会了":completed==="unsure"?"模糊":"不会"}</small>`:""}</div>`;
    article.querySelector(".qa-listen").onclick=()=>{speak(question.en);learn(unit.id,"qa-listen");};article.querySelector("[data-reveal]").onclick=()=>article.querySelector(".qa-question").hidden=false;article.querySelector("[data-answer]").onclick=()=>article.querySelector(".qa-answer").hidden=false;article.querySelector("[data-answer-speak]").onclick=()=>speak(unit.answer.en.join(" "));article.querySelector("[data-hide-answer]").onclick=()=>{article.querySelector(".qa-answer").hidden=true;article.querySelector("[data-record]").focus();};article.querySelector("[data-record]").onclick=()=>toggleRecording(article);article.querySelectorAll("[data-qa-rating]").forEach(button=>{button.disabled=Boolean(completed);button.onclick=()=>rateDailyQa(unit.id,button.dataset.qaRating);});return article;
  }
  function renderQaToday(){const plan=qaDailyPlan(),entries=plan.items.map(entry=>({...entry,item:qaById(entry.id)})).filter(entry=>entry.item),root=$("todayQaList");root.replaceChildren(...entries.map((entry,index)=>qaCard(entry.item,index,entry.bucket,plan.completed[entry.id])));const done=Object.keys(plan.completed).length;$("qaDailyMix").textContent=`${entries.length} 组 · 已完成 ${done} 组`;$("qaEmpty").hidden=entries.length>0;}
  function wordData(word) { const key=String(word||"").toLowerCase();const saved=state.wordDetails[key];return C.words[key] || (saved?[saved.ipa||"",saved.meaning||saved.definition||"待补充释义"]:["", "点击后在线查询释义与音标"]); }
  async function directFreeTranslate(text) { const url=new URL("https://api.mymemory.translated.net/get");url.searchParams.set("q",String(text||"").slice(0,450));url.searchParams.set("langpair","en|zh-CN");const response=await fetch(url);if(!response.ok)throw new Error(`免费翻译限流 ${response.status}`);const data=await response.json();const translated=String(data?.responseData?.translatedText||"").trim();if(!translated||/MYMEMORY WARNING/i.test(translated))throw new Error("免费翻译额度暂时不可用");return translated; }
  async function translateTexts(texts) { try{const response=await fetch("/api/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texts})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"翻译服务不可用");return data.translations||[];}catch(_){const translations=[];for(let index=0;index<texts.length;index+=3)translations.push(...await Promise.all(texts.slice(index,index+3).map(directFreeTranslate)));return translations;} }
  function stopSpeech() {
    speechRun += 1;
    if (!window.EasySpeech || !speechReady) return;
    try { window.EasySpeech.cancel(); } catch (_) { /* Easy Speech may still be initializing. */ }
  }
  function prepareSpeech() {
    if (!window.EasySpeech) return Promise.reject(new Error("Easy Speech 未加载"));
    if (!speechReady) speechReady = window.EasySpeech.init({maxTimeout:5000,interval:250});
    return speechReady;
  }
  async function speak(text, repeat = 1) {
    const run = ++speechRun;
    try {
      await prepareSpeech();
      if (run !== speechRun) return;
      window.EasySpeech.cancel();
      const language = state.settings.accent || "en-GB";
      const voices = window.EasySpeech.voices();
      const voice = voices.find(item => item.lang.toLowerCase() === language.toLowerCase()) || voices.find(item => /^en/i.test(item.lang));
      for (let index = 0; index < Math.min(3, Math.max(1, Number(repeat) || 1)); index += 1) {
        if (run !== speechRun) return;
        await window.EasySpeech.speak({text,voice,rate:Number(state.settings.rate || .9),pitch:1,volume:1});
      }
    } catch (_) {
      if (run === speechRun) toast("当前浏览器暂时无法朗读，请刷新后重试。");
    }
  }
  function playPhoneme(item) {
    const files = Array.isArray(item.audio) ? item.audio : [];
    if (!files.length) { toast("该音标暂时没有独立音频"); return; }
    stopSpeech();
    phonemePlaybackId += 1;
    const playbackId = phonemePlaybackId;
    if (phonemeAudio) { phonemeAudio.pause(); phonemeAudio = null; }
    const playPart = index => {
      if (playbackId !== phonemePlaybackId || index >= files.length) return;
      const audio = new Audio(`audio/phonemes/${files[index]}`);
      phonemeAudio = audio;
      audio.preload = "auto";
      audio.onended = () => playPart(index + 1);
      audio.onerror = () => toast("音标音频加载失败，请刷新后重试");
      audio.play().catch(() => toast("浏览器阻止了音频播放，请再次点击音标"));
    };
    playPart(0);
  }
  function route(name) {
    if(name==="courses")name="industry";
    const parts=String(name||"").split("/").filter(Boolean);const courseRoute=parts[0]==="industry"||parts[0]==="roleplay";
    if(courseRoute){selectedTrack=parts[0];selectedChapter=parts[1]||null;selectedUnit=parts[2]||null;}
    const pageName=courseRoute?"courses":name;
    document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === pageName));
    document.querySelectorAll(".side-nav [data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === (courseRoute?parts[0]:name)));
    // Product and chapter selection is application state, not a separate URL.
    // Keep only the two top-level course entries addressable in the sidebar.
    history.replaceState(null, "", `#${courseRoute?parts[0]:name}`);
    document.documentElement.classList.remove("mobile-nav-open"); $("sidebarOverlay").hidden = true;
    window.scrollTo({top:0,behavior:"smooth"});
    if (name === "practice") beginListeningFirst();
    else stopSpeech();
    if (name === "book") renderBook();
    if (name === "phonetics") renderPhonetics();
    if (courseRoute) renderCourses();
    if (name === "knowledge") renderSources();
    if (name === "profile") renderStats();
  }
  function tokenizedPhrase(item) {
    return String(item.en||"").split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).map(part=>/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(part)?`<button class="word-token" data-word="${esc(part.toLowerCase())}" type="button">${esc(part)}</button>`:esc(part)).join("");
  }
  function phraseCard(item, index, bucket = "new", completed = null) {
    const saved = Boolean(state.savedPhrases[item.id]);
    const bucketLabels = {new:"新学",due:"到期复习",weak:"薄弱巩固"};
    const article = document.createElement("article");
    article.className = `phrase-card ${completed ? "completed" : ""}`;
    article.innerHTML = `<div class="phrase-index">${String(index + 1).padStart(2,"0")}</div><div class="phrase-main phrase-reveal" role="button" tabindex="0" aria-label="点击显示英文，再次点击显示中文"><span class="meta">${esc(item.scene)} · ${esc(C.topics[item.topic]?.zh || item.topic || "外贸英语")}</span><span class="training-badge ${bucket}">${bucketLabels[bucket]}</span><p class="phrase-reveal-hint">正在盲听 · 点击显示英文</p><p class="phrase-en" hidden>${tokenizedPhrase(item)}</p><p class="phrase-zh" hidden>${esc(item.zh)}</p></div><div class="phrase-actions"><button data-speak aria-label="朗读短语" type="button">▶</button><button data-save aria-label="收藏短语" type="button">${saved ? "★" : "☆"}</button></div><div class="daily-rating" aria-label="标记掌握程度"><button data-daily-rating="hard" type="button">不会</button><button data-daily-rating="unsure" type="button">模糊</button><button data-daily-rating="easy" type="button">会了</button>${completed ? `<small>✓ 已完成 · ${completed === "easy" ? "会了" : completed === "unsure" ? "模糊" : "不会"}</small>` : ""}</div>`;
    const reveal = article.querySelector(".phrase-reveal");
    let revealStage = 0;
    const revealSubtitle = () => {
      if (revealStage >= 2) return;
      revealStage += 1;
      const english = article.querySelector(".phrase-en");
      const chinese = article.querySelector(".phrase-zh");
      const hint = article.querySelector(".phrase-reveal-hint");
      english.hidden = revealStage < 1;
      chinese.hidden = revealStage < 2;
      hint.hidden = revealStage >= 2;
      hint.textContent = "已显示英文 · 再次点击显示中文";
      reveal.setAttribute("aria-label", revealStage === 1 ? "再次点击显示中文" : "英文和中文已显示");
      learn(item.id,"reveal");
    };
    reveal.addEventListener("click", revealSubtitle);
    reveal.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); revealSubtitle(); } });
    article.querySelector("[data-speak]").addEventListener("click", () => { speak(item.en); learn(item.id,"listen"); completeTask("listen"); });
    article.querySelector("[data-save]").addEventListener("click", event => togglePhrase(item, event.currentTarget));
    article.querySelectorAll("[data-daily-rating]").forEach(button => { button.disabled=Boolean(completed);button.addEventListener("click",()=>rateDailyPhrase(item.id,button.dataset.dailyRating)); });
    article.querySelectorAll("[data-word]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openWord(button.dataset.word, item); }));
    return article;
  }
  function rotated(items, offset) { return items.length ? [...items.slice(offset % items.length),...items.slice(0,offset % items.length)] : []; }
  function dailyPlan() {
    const today = day();
    if (state.dailyPlans[today]?.items?.length) return state.dailyPlans[today];
    const all = allPhrases(); const seed = Number(today.replaceAll("-","")); const used = new Set(); const entries = [];
    const add = (items,bucket,limit) => { for (const item of items) { if (entries.filter(entry=>entry.bucket===bucket).length>=limit) break;if(!item||used.has(item.id))continue;used.add(item.id);entries.push({id:item.id,bucket}); } };
    const unseen = all.filter(item => !state.learned.includes(item.id) && !state.itemProgress[item.id]);
    add(rotated(unseen.filter(item=>item.scene!=="基础英语"),seed),"new",5);
    add(rotated(unseen.filter(item=>item.scene==="基础英语"),seed),"new",1);
    add(Object.entries(state.reviews).filter(([id,review])=>phraseById(id)&&review.due<=today).sort((a,b)=>String(a[1].due).localeCompare(String(b[1].due))).map(([id])=>phraseById(id)),"due",2);
    add(Object.entries(state.reviews).filter(([id,review])=>phraseById(id)&&Number(review.errors)>0).sort((a,b)=>Number(b[1].errors)-Number(a[1].errors)).map(([id])=>phraseById(id)),"weak",2);
    add(rotated(unseen,seed+7),"new",10);
    add(rotated(all.filter(item=>state.itemProgress[item.id]?.status!=="mastered"),seed+13),"weak",10);
    const plan = {date:today,createdAt:new Date().toISOString(),items:entries.slice(0,10),completed:{}};
    state.dailyPlans[today]=plan;save();return plan;
  }
  function dailyPhrases() {
    return dailyPlan().items.map(entry=>phraseById(entry.id)).filter(Boolean);
  }
  function rateDailyPhrase(id, rating) {
    const plan=dailyPlan();if(plan.completed[id])return;plan.completed[id]=rating;schedule(id,rating,rating==="hard");learn(id,"rated");markDay();save();renderToday();
  }
  function renderToday() {
    renderQaToday();
    const qaPlan=qaDailyPlan();const qaEntries=qaPlan.items.filter(entry=>qaById(entry.id));const qaCompleted=qaEntries.filter(entry=>qaPlan.completed[entry.id]).length;
    const plan = dailyPlan();
    const entries=plan.items.map(entry=>({...entry,item:phraseById(entry.id)})).filter(entry=>entry.item);
    $("todayPhraseList").replaceChildren(...entries.map((entry,index)=>phraseCard(entry.item,index,entry.bucket,plan.completed[entry.id])));
    const mix=entries.reduce((result,entry)=>(result[entry.bucket]+=1,result),{new:0,due:0,weak:0});
    $("dailyMix").textContent=`${mix.new} 新学 · ${mix.due} 到期 · ${mix.weak} 薄弱`;
    const completed=Object.keys(plan.completed).length;const tomorrow=Object.values(state.reviews).filter(review=>review.due===addDay(1)).length;const qaDone=qaEntries.length&&qaCompleted===qaEntries.length;
    $("dailyCompletionReport").innerHTML=`<div><span class="tag">今日问答闭环</span><h3>${qaDone?"今日5组问答已完成":`已完成 ${qaCompleted} / ${qaEntries.length}`}</h3><p>${qaDone?"问答成绩和复习日期已经保存，后续复习会逐步切换不同问法。":"听问题、学习知识、自己回答并跟读后，再选择掌握程度；刷新页面不会换题。"}</p><small>旧单句进度：${completed} / ${entries.length}</small></div><div><strong>${tomorrow}</strong><span>明日复习</span></div>`;
    const due = dueReviews();
    $("reviewDueBadge").textContent = `${due.length} 项`;
    $("reviewHeadline").textContent = due.length ? `${due.length} 个学习项目等你复习` : "今天没有待复习内容";
    $("reviewSubline").textContent = due.length ? "问答单元、短语和生词会按错误次数与到期时间排序。" : "完成问答或短语后，系统会按复习间隔安排内容。";
    $("streakCount").textContent = streak();
    renderDailyPath();
  }
  function taskState() {
    const stored = state.dailyTasks[day()] || {};
    return {listen:Boolean(stored.listen),speak:Boolean(stored.speak),save:Boolean(stored.save),dialog:Boolean(stored.dialog),review:Boolean(stored.review || dueReviews().length === 0)};
  }
  function completeTask(name) {
    state.dailyTasks[day()] = {...(state.dailyTasks[day()] || {}),[name]:true};
    markDay(); save(); renderDailyPath();
  }
  function renderDailyPath() {
    const tasks = taskState(); const order = ["listen","speak","save","dialog","review"];
    const done = order.filter(name => tasks[name]).length;
    $("dailyProgressBar").style.width = `${done / order.length * 100}%`;
    $("dailyProgressText").textContent = `今日 ${done} / ${order.length} 步完成`;
    $("dailyPathScore").textContent = `${done} / ${order.length}`;
    const next = order.find(name => !tasks[name]);
    document.querySelectorAll("[data-task]").forEach(button => { const name=button.dataset.task;button.classList.toggle("done",tasks[name]);button.classList.toggle("current",name===next);button.setAttribute("aria-pressed",String(tasks[name])); });
    const labels={listen:"继续：听标准发音",speak:"继续：跟读录音",save:"继续：收藏表达",dialog:"继续：情景对话",review:"继续：今日复习"};
    $("dailyContinue").firstChild.textContent = next ? `${labels[next]} ` : "今日任务完成 ";
    $("dailyContinue").dataset.nextTask = next || "complete";
  }
  function runTask(name) {
    if (name === "complete") { toast("今天的开口训练已经完成，做得好！"); return; }
    if (name === "listen") { practiceItems=dailyPhrases();practiceIndex=0;renderPractice();route("practice"); toast("已进入今日课程口语训练，请点击“听标准发音”开始播放"); return; }
    if (name === "speak") { if (!practiceItems.length) {practiceItems=dailyPhrases();practiceIndex=0;renderPractice();} route("practice"); setTimeout(()=>$("recordButton").scrollIntoView({behavior:"smooth",block:"center"}),100); return; }
    if (name === "save") { route("today"); setTimeout(()=>$("todayPhraseList").scrollIntoView({behavior:"smooth",block:"start"}),100); toast("点击短语中的生词，或点星标收藏整句。 "); return; }
    if (name === "dialog") { route("practice");resetDialog();setTimeout(()=>document.querySelector(".dialog-card").scrollIntoView({behavior:"smooth",block:"start"}),100);toast("完成全部客户问答后，自动进入第 5 步");return; }
    if (name === "review") { bookTab="review"; route("book"); renderBook(); }
  }
  function learn(id, activity = "practice") {
    if (!state.learned.includes(id)) state.learned.push(id);
    const updatedAt=new Date().toISOString();state.itemProgress[id]={...(state.itemProgress[id]||{}),status:state.itemProgress[id]?.status||"review",lastActivity:activity,lastLearnedAt:updatedAt,updatedAt};
    markDay();save();
  }
  function togglePhrase(item, button) {
    if (state.savedPhrases[item.id]) { delete state.savedPhrases[item.id]; button.textContent = "☆"; toast("已取消收藏"); }
    else { state.savedPhrases[item.id] = {savedAt:new Date().toISOString(),source:item.scene}; schedule(item.id, 1, false); button.textContent = "★"; toast("已加入短语本"); }
    learn(item.id); completeTask("save"); save();
  }
  async function openWord(word, phrase) {
    word=String(word||"").toLowerCase();selectedWord = {word,phraseId:phrase.id,source:phrase.en};
    const data = wordData(word);
    $("wordTitle").textContent = word;
    $("wordIpa").textContent = data[0];
    $("wordMeaning").textContent = data[1];
    $("wordSource").textContent = `来源短语：${phrase.en}`;
    $("saveWord").textContent = state.savedWords[word] ? "✓ 已在单词本" : "＋ 加入单词本";
    $("wordDialog").showModal();speak(word);
    if(!C.words[word]&&!state.wordDetails[word]){try{$("wordIpa").textContent="正在查询音标…";$("wordMeaning").textContent="正在查询中文释义…";const response=await fetch("/api/word-info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({word})});const detail=await response.json().catch(()=>({}));if(!response.ok)throw new Error(detail.error||"查询失败");if(!detail.meaning)detail.meaning=await directFreeTranslate(word).catch(()=>"");state.wordDetails[word]={ipa:detail.ipa||"",meaning:detail.meaning||"",definition:detail.definition||""};save();if(selectedWord?.word===word){$("wordIpa").textContent=detail.ipa||"暂无音标";$("wordMeaning").textContent=detail.meaning||detail.definition||"暂无释义";}}catch(error){if(selectedWord?.word===word){$("wordIpa").textContent="暂无音标";$("wordMeaning").textContent=`查询失败：${error.message}。仍可点读并收藏。`;}}}
  }
  function saveSelectedWord() {
    if (!selectedWord) return;
    const {word,phraseId,source} = selectedWord;
    state.savedWords[word] = {savedAt:new Date().toISOString(),phraseId,source};
    schedule(`word:${word}`, 1, false); save();
    completeTask("save"); $("saveWord").textContent = "✓ 已在单词本"; toast("生词已收藏，并关联来源短语");
  }
  function schedule(id, rating, isError) {
    const intervals=[1,3,7,14,30];const old=state.reviews[id]||{errors:0,reps:0,stage:-1};
    const normalized=rating===0?"hard":rating===1?"unsure":rating===2?"easy":rating;
    const errors=Number(old.errors||0)+(isError||normalized==="hard"?1:0);
    const stage=normalized==="easy"?Math.min(4,Number(old.stage??-1)+1):0;
    const days=normalized==="easy"?intervals[stage]:1;
    const updatedAt=new Date().toISOString();state.reviews[id]={errors,reps:Number(old.reps||0)+1,stage,due:addDay(days),last:day(),rating:normalized,updatedAt};
    if (!id.startsWith("word:")) state.itemProgress[id]={...(state.itemProgress[id]||{}),status:normalized==="easy"&&stage===4?"mastered":"review",nextReview:addDay(days),lastRating:normalized,updatedAt};
  }
  function markWeakPhrase(item, reason) {
    if (!item) return;
    const old = state.savedPhrases[item.id] || {};
    state.savedPhrases[item.id] = {...old,savedAt:old.savedAt || new Date().toISOString(),source:old.source || item.scene,weak:true,reason,lastWeakAt:new Date().toISOString()};
    schedule(item.id, 0, true);
  }
  function setWeakReviewButton(mode = "hidden") {
    const button = $("addWeakReview");
    button.hidden = mode === "hidden";
    button.disabled = mode === "added";
    button.textContent = mode === "added" ? "✓ 已加入明日复习" : "＋ 加入明日复习";
  }
  function dueReviews() {
    return Object.keys(state.reviews).filter(id => (id.startsWith("word:") ? state.savedWords[id.slice(5)] : phraseById(id)||qaById(id)) && state.reviews[id].due <= day()).sort((a,b) => (state.reviews[b]?.errors || 0) - (state.reviews[a]?.errors || 0)||String(state.reviews[a]?.due||"").localeCompare(String(state.reviews[b]?.due||"")));
  }
  function streak() {
    let count = 0; const date = new Date();
    while (state.days.includes(day(date))) { count += 1; date.setDate(date.getDate() - 1); }
    return count;
  }

  function setPractice(topic) {
    practiceItems = allPhrases().filter(item => item.topic === topic);
    if (!practiceItems.length) practiceItems = dailyPhrases().slice(0,3);
    practiceIndex = 0; renderPractice();
    if (C.dialogs[topic]) { dialogScenario = topic; $("dialogScenario").value = topic; resetDialog(); }
  }
  function updatePracticeReveal() {
    const english=$("practicePhrase");const chinese=$("practiceZh");const hint=$("practiceRevealHint");
    english.hidden=practiceRevealStage<1;chinese.hidden=practiceRevealStage<2;hint.hidden=practiceRevealStage>=2;
    hint.textContent=practiceRevealStage===0?"正在盲听 · 点击显示英文":"已显示英文 · 再次点击显示中文";
    $("practiceReveal").setAttribute("aria-label",practiceRevealStage===0?"点击显示英文":practiceRevealStage===1?"再次点击显示中文":"英文和中文已显示");
  }
  function beginListeningFirst() {
    stopSpeech();practiceRevealStage=0;updatePracticeReveal();
  }
  function revealPracticeSubtitle() { if(practiceRevealStage<2){practiceRevealStage+=1;updatePracticeReveal();} }
  function renderPractice() {
    if (!practiceItems.length) practiceItems = dailyPhrases().slice(0,3);
    const item = practiceItems[practiceIndex];
    $("practiceScene").textContent = `${item.scene} · ${C.topics[item.topic].zh}`;
    $("practiceStep").textContent = `${practiceIndex + 1} / ${practiceItems.length}`;
    $("practicePhrase").innerHTML = tokenizedPhrase(item);$("practicePhrase").querySelectorAll("[data-word]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();openWord(button.dataset.word,item);}));
    $("practiceZh").textContent = item.zh;
    $("feedbackPanel").hidden = true; $("recordingPlayback").hidden = true; setWeakReviewButton(); hideManualRecordingRating(); transcript = "";
    beginListeningFirst();
  }
  async function toggleRecording(target=null) {
    if (recorder && recorder.state === "recording") { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { showUnavailable("当前浏览器不支持录音。请用新版 Chrome、Edge 或 Safari，并允许麦克风权限。"); return; }
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({audio:true});
      recordingChunks = []; transcript = "";
      try { recorder = new MediaRecorder(recordingStream,{audioBitsPerSecond:64000}); }
      catch (_) { recorder = new MediaRecorder(recordingStream); }
      recorder.ondataavailable = event => { if (event.data.size) recordingChunks.push(event.data); };
      recorder.onstop = finishRecording;
      recorder.start();
      qaRecordingTarget=target?.classList?.contains("qa-card")?target:null;
      recordingTimer = setTimeout(()=>{if(recorder?.state==="recording"){stopRecording();toast("已达到 30 秒上限，录音自动结束");}},30000);
      startRecognition();
      document.querySelector(".coach-card").classList.add("recording");
      $("recordLabel").textContent = "正在录音，点击结束";
      if(qaRecordingTarget)qaRecordingTarget.querySelector("[data-record]").textContent="■ 结束录音";
      $("recordHint").textContent = "请完整说出刚才听到的英文短语；最长录制 30 秒。";
    } catch (error) { showUnavailable(error.name === "NotAllowedError" ? "麦克风权限被拒绝。请在浏览器设置中允许后重试。" : "无法启动麦克风，请检查系统占用与权限。"); }
  }
  function startRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    recognition = new Recognition(); recognition.lang = state.settings.accent || "en-GB"; recognition.interimResults = true; recognition.continuous = true;
    recognition.onresult = event => { transcript = Array.from(event.results).map(result => result[0].transcript).join(" "); };
    recognition.onerror = () => {};
    try { recognition.start(); } catch (_) {}
  }
  function stopRecording() {
    clearTimeout(recordingTimer); recordingTimer = null;
    if (recorder?.state === "recording") recorder.stop();
    try { recognition?.stop(); } catch (_) {}
    recordingStream?.getTracks().forEach(track => track.stop());
    document.querySelector(".coach-card").classList.remove("recording");
    $("recordLabel").textContent = "按下重新录音";
    if(qaRecordingTarget)qaRecordingTarget.querySelector("[data-record]").textContent="● 重新回答录音";
  }
  function finishRecording() {
    const blob = new Blob(recordingChunks, {type:recorder.mimeType || "audio/webm"});
    if(recordingUrl)URL.revokeObjectURL(recordingUrl);
    recordingUrl = URL.createObjectURL(blob); $("recordingPlayback").src = recordingUrl; $("recordingPlayback").hidden = false;
    if(qaRecordingTarget){const audio=qaRecordingTarget.querySelector("[data-recording]");audio.src=recordingUrl;audio.hidden=false;}
    state.spoken += 1; markDay(); if (!qaRecordingTarget) { evaluateTranscript(); showManualRecordingRating(); } completeTask("speak"); save();
  }
  function normalize(text) { return String(text || "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N} ]/gu," ").replace(/\s+/g," ").trim(); }
  function wordMatch(expected, actual) {
    const target = normalize(expected).split(" "); const heard = new Set(normalize(actual).split(" "));
    return target.length ? Math.round(target.filter(word => heard.has(word)).length / target.length * 100) : 0;
  }
  function renderWordFeedback(item, actual) {
    const heard = new Set(normalize(actual).split(" ").filter(Boolean));
    const words = normalize(item.en).split(" ").filter(Boolean);
    const missing = [];
    const root = $("wordComparison"); root.replaceChildren();
    words.forEach(word => { const hit=heard.has(word);if(!hit)missing.push(word);const span=document.createElement("span");span.className=hit?"hit":"miss";span.textContent=word;span.title=hit?"已识别":"未识别";root.appendChild(span); });
    const keywordHits = item.words.filter(keyword => normalize(actual).includes(normalize(keyword)));
    $("recognizedCount").textContent = `${words.length - missing.length} / ${words.length}`;
    $("keywordCount").textContent = `${keywordHits.length} / ${item.words.length}`;
    $("missingWords").textContent = missing.length ? `建议重点重练：${missing.slice(0,4).join(" · ")}` : "所有目标词都被识别到了。";
    return {missing,keywordHits};
  }
  function evaluateTranscript() {
    const item = practiceItems[practiceIndex];
    const panel = $("feedbackPanel"); panel.hidden = false;
    if (!transcript.trim()) {
      $("feedbackTitle").textContent = "录音已保存"; $("matchBadge").textContent = "未获得识别文本";
      $("transcriptText").textContent = "你的浏览器未提供语音识别，仍可回听录音并与标准发音对比。";
      $("feedbackTip").textContent = "免费替代：在支持 Web Speech 的 Chrome / Edge 中联网重试。这里不会给出虚假的发音分数。";
      $("wordComparison").replaceChildren(); $("recognizedCount").textContent="0 / 0"; $("keywordCount").textContent=`0 / ${item.words.length}`; $("missingWords").textContent="请回听录音，并逐个检查重音、尾音和停顿。";
      setWeakReviewButton("manual"); return;
    }
    const score = wordMatch(item.en, transcript);
    const detail = renderWordFeedback(item, transcript);
    $("feedbackTitle").textContent = "识别到的文字"; $("matchBadge").textContent = `文本匹配 ${score}%`;
    $("transcriptText").textContent = `“${transcript}”`;
    $("feedbackTip").textContent = score >= 85 ? "大部分关键词已识别。请回听录音，再由你决定是否学会。" : `可以重点重练“${detail.missing.slice(0,3).join(" / ") || "目标短语"}”。此百分比只是文本匹配，不是发音评分；掌握程度由你决定。`;
    setWeakReviewButton("manual");
  }
  // 录音后的掌握程度由学习者自主决定，语音识别只作参考，不自动判定学会。
  function hideManualRecordingRating() {
    const panel = $("manualRecordingRating");
    if (panel) panel.hidden = true;
  }
  function showManualRecordingRating() {
    const feedback = $("feedbackPanel");
    let panel = $("manualRecordingRating");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "manualRecordingRating";
      panel.className = "daily-rating";
      panel.setAttribute("aria-label", "自主评价跟读掌握程度");
      panel.innerHTML = '<span>回听后，你自己决定：</span><button type="button" data-record-rating="easy">学会</button><button type="button" data-record-rating="unsure">模糊</button><small data-record-rating-status aria-live="polite"></small>';
      feedback.appendChild(panel);
      panel.querySelectorAll("[data-record-rating]").forEach(button => button.addEventListener("click", () => {
        const item = practiceItems[practiceIndex];
        if (!item) return;
        const rating = button.dataset.recordRating;
        const previous = state.itemProgress[item.id]?.recordingSelfRating;
        if (previous === rating) { toast("已记录你的选择"); return; }
        // 同一录音可以更正选择，但不重复增加复习次数。
        if (previous) {
          const old = state.reviews[item.id] || {};
          const due = rating === "easy" ? addDay(3) : addDay(1);
          state.reviews[item.id] = {...old,rating,stage:rating === "easy" ? Math.max(0,Number(old.stage)||0) : 0,due,last:day(),updatedAt:new Date().toISOString()};
          state.itemProgress[item.id] = {...(state.itemProgress[item.id]||{}),status:"review",nextReview:due,lastRating:rating};
        } else schedule(item.id,rating,false);
        state.itemProgress[item.id] = {...(state.itemProgress[item.id]||{}),recordingSelfRating:rating,recordingSelfRatedAt:new Date().toISOString()};
        learn(item.id,"recording-self-rating");
        panel.querySelector("[data-record-rating-status]").textContent = rating === "easy" ? "✓ 你选择了学会" : "✓ 你选择了模糊，明日复习";
        toast("已按你的选择保存掌握程度");
        renderToday();renderBook();
      }));
    }
    panel.hidden = false;
    const rating = state.itemProgress[practiceItems[practiceIndex]?.id]?.recordingSelfRating;
    panel.querySelector("[data-record-rating-status]").textContent = rating === "easy" ? "✓ 上次选择：学会（可修改）" : rating === "unsure" ? "✓ 上次选择：模糊（可修改）" : "仅由你决定，不自动评分";
  }
  function showUnavailable(message) { $("feedbackPanel").hidden = false; $("feedbackTitle").textContent = "功能提示"; $("matchBadge").textContent = "可继续听读"; $("transcriptText").textContent = message; $("wordComparison").replaceChildren(); $("recognizedCount").textContent="0 / 0"; $("keywordCount").textContent="0 / 0"; $("missingWords").textContent=""; $("feedbackTip").textContent = "你仍可使用标准发音、连续播放和情景对话完成练习。"; setWeakReviewButton("manual"); }

  function currentDialog() { return C.dialogs[dialogScenario] || C.dialogs.shower; }
  function dialogueTurns() {
    const dialog=currentDialog();const prompts=["客户正在提出初步需求，请先确认关键信息。","客户补充了项目条件，请给出专业回应。"];
    const original=dialog.turns.map((turn,index)=>{const recommended=turn.choices.find(choice=>choice.good)||turn.choices[0];const wrong=turn.choices.find(choice=>!choice.good)||turn.choices.at(-1);return{customer:{en:turn.customer,zh:turn.customerZh||prompts[index]||"请根据客户当前问题推进沟通。"},choices:[{...recommended,grade:"recommended",feedback:"表达完整、专业，并推进了当前沟通。"},{text:index===0?"Could you share a little more project information, please?":"Thank you. We will check the details and confirm.",zh:index===0?"可以再提供一些项目资料吗？":"谢谢，我们会核对细节并确认。",grade:"acceptable",reply:recommended.reply,feedback:"可以继续沟通，但还可以更具体。"},{...wrong,grade:"wrong",feedback:"没有回应客户当前问题，请重试。"}]};});
    const followups=[
      {customer:{en:"What is your minimum order quantity for this item?",zh:"这个产品的最小起订量是多少？"},choices:[{text:"Our standard MOQ is 100 pieces, but we can review it for a trial order.",zh:"标准起订量是100件，但试单可以再评估。",grade:"recommended",reply:"That could work for our first order.",feedback:"说明标准条件，同时为试单保留空间。"},{text:"The MOQ is 100 pieces.",zh:"起订量是100件。",grade:"acceptable",reply:"Understood.",feedback:"回答正确，但缺少试单协商空间。"},{text:"Please send the payment first.",zh:"请先付款。",grade:"wrong",feedback:"客户在问起订量，回答与问题无关。"}]},
      {customer:{en:"What information do you need to prepare the quotation?",zh:"准备报价需要我们提供哪些资料？"},choices:[{text:"Please send the drawing, specification, quantity, finish, and delivery address.",zh:"请提供图纸、规格、数量、表面处理和送货地址。",grade:"recommended",reply:"I will prepare those details.",feedback:"一次列清报价所需信息。"},{text:"Please send the drawing and quantity.",zh:"请提供图纸和数量。",grade:"acceptable",reply:"Okay, I will send them.",feedback:"可以推进，但资料还不完整。"},{text:"We will quote later.",zh:"我们稍后报价。",grade:"wrong",feedback:"没有回答需要哪些资料。"}]},
      {customer:{en:"What is the estimated lead time?",zh:"预计交期是多少？"},choices:[{text:"The estimated lead time is 25 to 30 days after drawing approval and deposit receipt.",zh:"图纸确认并收到定金后，预计交期为25至30天。",grade:"recommended",reply:"That timeline is acceptable.",feedback:"交期和起算条件都很清楚。"},{text:"Production takes about 25 days.",zh:"生产大约需要25天。",grade:"acceptable",reply:"Thank you.",feedback:"基本回答了问题，但缺少起算条件。"},{text:"We can ship whenever you need.",zh:"您什么时候需要，我们就什么时候发货。",grade:"wrong",feedback:"承诺不现实，容易造成交付风险。"}]},
      {customer:{en:"What is the next step?",zh:"下一步怎么进行？"},choices:[{text:"Please send the project details. We will prepare the quotation and confirm the next action with you.",zh:"请发送项目资料，我们会准备报价并确认下一步。",grade:"recommended",reply:"Great. I will send the details today.",feedback:"明确资料、报价和下一步行动。"},{text:"Please send us the details.",zh:"请把资料发给我们。",grade:"acceptable",reply:"Okay.",feedback:"方向正确，但下一步说明不够完整。"},{text:"Just wait for our message.",zh:"等我们的消息就可以了。",grade:"wrong",feedback:"行动不明确，也没有告诉客户需要做什么。"}]}
    ];
    return [...original,...followups].slice(0,Math.max(6,Math.min(8,original.length+followups.length)));
  }
  function dialogueReviewPhrase(turn) {
    const recommended=turn.choices.find(choice=>choice.grade==="recommended");const id=`dialog-${dialogScenario}-${dialogTurn}`;let item=phraseById(id);
    if(!item){item={id,en:recommended.text,zh:recommended.zh||"情景对话推荐表达",scene:`情景对话 · ${currentDialog().title}`,topic:C.topics[dialogScenario]?dialogScenario:"shower",words:[],module:"roleplay",level:"A2"};state.customPhrases.push(item);}
    if(!dialogReviewIds.has(id)){dialogReviewIds.add(id);markWeakPhrase(item,"情景对话需要改进");}
    return item;
  }
  function resetDialog() { const dialog=currentDialog();dialogTurn=0;dialogReveal=0;dialogScore=0;dialogMistakes=new Set();dialogReviewIds=new Set();$("dialogContext").textContent=`场景：${dialog.context}`;$("dialogMessages").innerHTML="";renderDialogPrompt();renderChoices(); }
  function addBubble(text, role) { const node = document.createElement("div"); node.className = `bubble ${role}`; node.textContent = text; $("dialogMessages").appendChild(node); $("dialogMessages").scrollTop = $("dialogMessages").scrollHeight; }
  function renderDialogPrompt() {
    const turn=dialogueTurns()[dialogTurn];const root=$("dialogPrompt");if(!turn){root.replaceChildren();return;}
    root.innerHTML=`<div class="dialog-listen"><span>先听客户发言</span><button id="dialogListen" type="button">▶ 听客户</button></div>${dialogReveal>=1?`<p class="dialog-customer-en">${esc(turn.customer.en)}</p>`:`<p class="dialog-hidden-copy">点击播放后，可按需显示字幕。</p>`}${dialogReveal>=2?`<p class="dialog-customer-zh">${esc(turn.customer.zh)}</p>`:`<button id="dialogReveal" class="text-button" type="button">${dialogReveal===0?"显示英文":"显示中文"}</button>`}`;
    $("dialogListen").onclick=()=>speak(turn.customer.en);$("dialogReveal")?.addEventListener("click",()=>{dialogReveal+=1;renderDialogPrompt();});
  }
  function renderChoices() {
    const root = $("dialogChoices"); root.replaceChildren();
    const turns=dialogueTurns();const turn=turns[dialogTurn];
    if (!turn) { const max=turns.length*3;$("dialogProgress").textContent="对话已完成";root.innerHTML=`<div class="dialog-complete"><strong>✓ 完成 ${turns.length} 轮客户沟通</strong><div><span><b>${dialogScore}/${max}</b>得分</span><span><b>${dialogMistakes.size}</b>需改进</span><span><b>${dialogReviewIds.size}</b>加入复习</span></div><button class="primary" data-review-next type="button">进入第 5 步：今日复习 →</button><button data-dialog-again type="button">再练一次</button></div>`;root.querySelector("[data-review-next]").onclick=()=>runTask("review");root.querySelector("[data-dialog-again]").onclick=resetDialog;return; }
    $("dialogProgress").textContent=`第 ${dialogTurn+1} / ${turns.length} 轮`;
    turn.choices.forEach((choice,index) => { const button=document.createElement("button");button.innerHTML=`<b>${String.fromCharCode(65+index)} · ${esc(choice.text)}</b>${choice.zh?`<small>${esc(choice.zh)}</small>`:""}`;button.onclick=()=>chooseDialog(choice);root.appendChild(button); });
  }
  function chooseDialog(choice) {
    const turns=dialogueTurns();const turn=turns[dialogTurn];addBubble(turn.customer.en,"customer");addBubble(choice.text,"me");addBubble(choice.feedback,"note");
    if(choice.grade==="wrong"){dialogMistakes.add(dialogTurn);const review=dialogueReviewPhrase(turn);addBubble(`推荐表达已加入明日复习：${review.en}`,"note");save();renderToday();return;}
    if(choice.grade==="acceptable"){dialogScore+=2;dialogueReviewPhrase(turn);}else dialogScore+=3;
    if(choice.reply)addBubble(choice.reply,"customer");state.spoken+=1;dialogTurn+=1;dialogReveal=0;
    if(dialogTurn>=turns.length){const old=state.dialogues[dialogScenario]||{};state.dialogues[dialogScenario]={attempts:Number(old.attempts||0)+1,completedAt:new Date().toISOString(),lastScore:dialogScore,bestScore:Math.max(Number(old.bestScore||0),dialogScore),lastMistakes:dialogMistakes.size,reviewCount:dialogReviewIds.size};completeTask("dialog");toast("情景对话闭环已完成");}
    markDay();save();renderDialogPrompt();renderChoices();
  }

  function renderBook() {
    document.querySelectorAll("[data-book-tab]").forEach(button => button.classList.toggle("active", button.dataset.bookTab === bookTab));
    const root = $("bookList"); root.replaceChildren();
    $("vocabularySearch").hidden=bookTab!=="vocabulary";
    let items = [];
    if (bookTab === "words") items = Object.entries(state.savedWords).map(([id,data]) => ({id:`word:${id}`,title:id,sub:wordData(id)[1],meta:`${wordData(id)[0]} · 来源：${data.source}`}));
    if (bookTab === "vocabulary") { const query=normalize($("vocabularySearch").value);items=V11.vocabulary.filter(item=>!query||normalize(`${item.word} ${item.meaning} ${item.categoryZh}`).includes(query)).map(item=>({id:`vocab:${item.word}`,title:item.word,sub:item.meaning,meta:`${item.categoryZh} · ${item.level}`,sourcePhraseId:item.sourcePhraseId})); }
    if (bookTab === "phrases") items = Object.entries(state.savedPhrases).map(([id,data]) => { const item=phraseById(id); return item ? {id:item.id,title:item.en,sub:item.zh,meta:data.weak ? `薄弱表达 · ${data.reason || "自动复习"} · 错误 ${state.reviews[id]?.errors || 0} 次` : `${item.scene} · ${C.topics[item.topic].zh}`} : null; }).filter(Boolean);
    if (bookTab === "review") items = dueReviews().map(id => id.startsWith("word:") ? {id,title:id.slice(5),sub:wordData(id.slice(5))[1],meta:"今日到期 · 生词"} : (() => { const qa=qaById(id);if(qa)return{id,title:qaQuestion(qa).en,sub:qa.answer.zh.join(" "),meta:`问答单元 · ${qa.knowledgePoint} · 错误 ${state.reviews[id]?.errors||0} 次`};const item=phraseById(id); return item ? {id,title:item.en,sub:item.zh,meta:`今日到期 · 错误 ${state.reviews[id]?.errors || 0} 次`} : null; })()).filter(Boolean);
    $("savedCount").textContent = `${Object.keys(state.savedWords).length + Object.keys(state.savedPhrases).length} 条收藏`;
    if (!items.length) { root.innerHTML = `<div class="empty"><strong>${bookTab === "review" ? "今天已复习完成" : "这里还没有内容"}</strong>${bookTab === "review" ? "明天再来巩固，或继续学习新短语。" : "在短语里点击生词，或点击星标收藏短语。"}</div>`; return; }
    items.forEach(item => {
      const article = document.createElement("article"); article.className = "library-item";
      const vocabSaved=bookTab==="vocabulary"&&state.savedWords[item.title];
      article.innerHTML = `<div><h3>${esc(item.title)}</h3><p>${esc(item.sub)}</p><p>${esc(item.meta)}</p></div><div class="library-actions"><button data-speak type="button">▶</button>${bookTab === "review" ? '<button data-hard type="button">再学</button><button data-good type="button">会了</button>' : bookTab==="vocabulary"?`<button class="vocab-save" data-vocab-save type="button">${vocabSaved?"✓ 已收藏":"＋ 收藏"}</button>`:'<button class="delete" data-delete type="button">删除</button>'}</div>`;
      article.querySelector("[data-speak]").onclick = () => speak(item.title);
      article.querySelector("[data-hard]")?.addEventListener("click", () => reviewItem(item.id,0));
      article.querySelector("[data-good]")?.addEventListener("click", () => reviewItem(item.id,2));
      article.querySelector("[data-delete]")?.addEventListener("click", () => deleteSaved(item.id));
      article.querySelector("[data-vocab-save]")?.addEventListener("click", event => {const phrase=phraseById(item.sourcePhraseId);state.savedWords[item.title]={savedAt:new Date().toISOString(),phraseId:item.sourcePhraseId,source:phrase?.en||item.meta};schedule(`word:${item.title}`,1,false);save();event.currentTarget.textContent="✓ 已收藏";renderStats();toast("已加入个人生词本");});
      root.appendChild(article);
    });
  }
  function reviewItem(id,rating) { schedule(id,rating,rating===0); if (rating===2 && !state.mastered.includes(id)) state.mastered.push(id); completeTask("review"); markDay(); save(); renderBook(); renderToday(); toast(rating===2 ? "已掌握，复习间隔延长" : "明天优先复习"); }
  function deleteSaved(id) { if (id.startsWith("word:")) delete state.savedWords[id.slice(5)]; else delete state.savedPhrases[id]; delete state.reviews[id]; save(); renderBook(); }

  function startCategoryLesson(module,category,lessonIndex=0) {
    const level=$("lessonLevel").value;const items=allPhrases().filter(item=>item.module===module&&item.category===category&&(level==="all"||item.level===level));
    const lesson=items.slice(lessonIndex*8,lessonIndex*8+8);
    if(!lesson.length){toast("当前难度没有课程内容，请选择全部难度");return;}practiceItems=lesson;practiceIndex=0;renderPractice();route("practice");toast(`已打开 ${lesson[0].categoryZh||"章节课程"} · 第 ${lessonIndex+1} 课`);
  }
  function startRoleplay(id) {
    const dialog=C.dialogs[id];if(!dialog)return;dialogScenario=id;$("dialogScenario").value=id;const texts=dialog.turns.flatMap(turn=>turn.choices.filter(choice=>choice.good).map(choice=>normalize(choice.text)));const matched=allPhrases().filter(item=>texts.includes(normalize(item.en)));practiceItems=(matched.length?matched:dailyPhrases()).slice(0,5);practiceIndex=0;renderPractice();resetDialog();route("practice");setTimeout(()=>document.querySelector(".dialog-card").scrollIntoView({behavior:"smooth",block:"start"}),120);toast("客户情景对话已打开");
  }
  function startListeningLesson(scope) {
    const level=$("lessonLevel").value;const pool=V11.phrases.filter(item=>(scope==="mixed"||item.module===scope)&&(level==="all"||item.level===level));if(!pool.length){toast("当前难度没有听说内容");return;}const start=(Number(day().replaceAll("-",""))+state.shuffle)%pool.length;practiceItems=Array.from({length:Math.min(8,pool.length)},(_,index)=>pool[(start+index)%pool.length]);practiceIndex=0;renderPractice();route("practice");toast(`听说课程已打开 · ${practiceItems.length} 条表达`);
  }
  function courseTracks() {
    const products=[...(COURSE_CONTENT.industry.products||[]).map(item=>({...item,zh:item.title})),...state.customChapters.map(chapter=>({id:chapter.id,title:chapter.zh,zh:chapter.zh,name:chapter.name,description:chapter.description,custom:true}))];
    return [
      {id:"industry",name:"Industry English",zh:COURSE_CONTENT.industry.title||"行业英语",description:COURSE_CONTENT.industry.subtitle||"按产品系列学习",icon:"I",chapters:products},
      {id:"roleplay",name:"Customer Role Play",zh:COURSE_CONTENT.scenarios.title||"客户情景实战",description:COURSE_CONTENT.scenarios.subtitle||"真实客户沟通训练",icon:"R",chapters:(COURSE_CONTENT.scenarios.chapters||[]).map(item=>({...item,zh:item.title}))}
    ];
  }
  function normalizeCourseAssignment(value) {
    if(!value||!value.track||!value.chapter)return null;
    if(value.track==="industry"&&!value.unit)return null;
    if(!["industry","roleplay"].includes(value.track))return null;
    return {track:value.track,chapter:String(value.chapter),...(value.track==="industry"?{unit:String(value.unit)}:{})};
  }
  function courseAssignmentKey(value) { const item=normalizeCourseAssignment(value);return item?`${item.track}:${item.chapter}:${item.unit||""}`:""; }
  function uniqueCourseAssignments(values) { const seen=new Set();return (values||[]).map(normalizeCourseAssignment).filter(item=>item&&!seen.has(courseAssignmentKey(item))&&seen.add(courseAssignmentKey(item))); }
  function courseAssignmentLabel(value) {
    const item=normalizeCourseAssignment(value);if(!item)return "未指定课程";
    if(item.track==="roleplay"){const chapter=(COURSE_CONTENT.scenarios.chapters||[]).find(entry=>entry.id===item.chapter);return `客户情景实战 · ${chapter?.title||item.chapter}`;}
    const product=courseTracks().find(track=>track.id==="industry")?.chapters.find(entry=>entry.id===item.chapter);const unit=(COURSE_CONTENT.industry.chapters||[]).find(entry=>entry.id===item.unit);return `行业英语 · ${product?.title||product?.zh||item.chapter} · ${unit?.title||item.unit}`;
  }
  function allCourseAssignments() {
    const products=courseTracks().find(track=>track.id==="industry")?.chapters||[];const units=COURSE_CONTENT.industry.chapters||[];const scenarios=COURSE_CONTENT.scenarios.chapters||[];
    return [...products.flatMap(product=>units.map(unit=>({track:"industry",chapter:product.id,unit:unit.id}))),...scenarios.map(chapter=>({track:"roleplay",chapter:chapter.id}))];
  }
  function inferIndustryUnit(text) {
    const value=normalize(text);
    if(/pack|carton|crate|pallet|label|shipping|shipment|container|包装|纸箱|木箱|托盘|标签|运输|装柜/.test(value))return "packaging";
    if(/finish|polish|brushed|mirror|pvd|coating|stainless|material|304|316|表面|抛光|拉丝|镜面|材质|不锈钢/.test(value))return "materials";
    if(/install|screw|anchor|fitting|accessor|安装|螺丝|锚栓|配件/.test(value))return "installation";
    if(/test|certif|salt spray|inspection|quality|测试|认证|盐雾|验货|质量/.test(value))return "testing";
    if(/size|dimension|thick|weight|load|drawing|spec|尺寸|厚度|承重|图纸|规格|选型/.test(value))return "specifications";
    if(/question|faq|how|can|could|是否|可以|问题|询问/.test(value))return "customer-questions";
    return "application";
  }
  function inferRoleplayChapter(text) {
    const value=normalize(text);const rules=[
      ["aftersales",/complaint|claim|damage|replace|after.?sales|投诉|索赔|破损|更换|售后/],
      ["quality",/inspection|quality|test report|defect|验货|质量|检测|缺陷/],
      ["packing",/pack|carton|crate|pallet|label|shipment|container|包装|纸箱|木箱|托盘|标签|出货|装柜/],
      ["delivery",/lead time|production|delivery|delay|交期|生产|延期/],
      ["payment",/payment|deposit|balance|bank|付款|定金|余款|银行/],
      ["order",/purchase order|\bpo\b|order confirm|订单|采购单/],
      ["sample",/sample|样品/],
      ["negotiation",/discount|target price|negotia|折扣|目标价|议价|谈判/],
      ["quotation",/quote|quotation|price|incoterm|fob|cif|报价|价格|贸易条款/],
      ["specification",/drawing|dimension|thick|specification|图纸|尺寸|厚度|规格/],
      ["selection",/recommend|selection|choose|application|推荐|选型|选择|用途/],
      ["followup",/follow.?up|project status|跟进|客户维护|项目进展/]
    ];return rules.find(([,pattern])=>pattern.test(value))?.[0]||"inquiry";
  }
  function recommendCourseAssignments(item) {
    const text=`${item?.title||""} ${item?.content||""} ${(item?.tags||[]).join(" ")}`;const product=chapterForTopic(item?.reviewTopic||inferTopic(text));
    return uniqueCourseAssignments([{track:"industry",chapter:product,unit:inferIndustryUnit(text)},{track:"roleplay",chapter:inferRoleplayChapter(text)}]);
  }
  function renderCourseTargetTree(root,selectedKeys,onChange) {
    if(!root)return;root.replaceChildren();const products=courseTracks().find(track=>track.id==="industry")?.chapters||[];const units=COURSE_CONTENT.industry.chapters||[];
    const industry=document.createElement("section");industry.className="target-track";industry.innerHTML='<h4>行业英语</h4>';
    products.forEach(product=>{const details=document.createElement("details");details.className="target-product";const count=units.filter(unit=>selectedKeys.has(courseAssignmentKey({track:"industry",chapter:product.id,unit:unit.id}))).length;details.open=count>0;details.innerHTML=`<summary><span>${esc(product.title||product.zh)}</span><small>${count?`已选 ${count}`:"选择章节"}</small></summary>`;const grid=document.createElement("div");grid.className="target-option-grid";units.forEach(unit=>{const assignment={track:"industry",chapter:product.id,unit:unit.id};const key=courseAssignmentKey(assignment);const label=document.createElement("label");label.innerHTML=`<input type="checkbox" ${selectedKeys.has(key)?"checked":""}> <span>${esc(unit.title)}</span>`;label.querySelector("input").onchange=event=>{event.target.checked?selectedKeys.add(key):selectedKeys.delete(key);onChange?.();};grid.appendChild(label);});details.appendChild(grid);industry.appendChild(details);});root.appendChild(industry);
    const roleplay=document.createElement("section");roleplay.className="target-track";roleplay.innerHTML='<h4>客户情景实战</h4>';const grid=document.createElement("div");grid.className="target-option-grid roleplay-targets";(COURSE_CONTENT.scenarios.chapters||[]).forEach(chapter=>{const assignment={track:"roleplay",chapter:chapter.id};const key=courseAssignmentKey(assignment);const label=document.createElement("label");label.innerHTML=`<input type="checkbox" ${selectedKeys.has(key)?"checked":""}> <span>${esc(chapter.title)}</span>`;label.querySelector("input").onchange=event=>{event.target.checked?selectedKeys.add(key):selectedKeys.delete(key);onChange?.();};grid.appendChild(label);});roleplay.appendChild(grid);root.appendChild(roleplay);
  }
  function assignmentsFromKeys(keys) { const catalog=new Map(allCourseAssignments().map(item=>[courseAssignmentKey(item),item]));return [...keys].map(key=>catalog.get(key)).filter(Boolean); }
  function renderBulkCourseTargets() {
    const automatic=$("bulkAutoTargets")?.checked!==false;renderCourseTargetTree($("bulkCourseTargets"),bulkCourseAssignmentKeys,renderBulkCourseTargets);const count=bulkCourseAssignmentKeys.size;const summary=$("bulkCourseSummary");if(summary)summary.textContent=automatic?(count?`自动推荐 + ${count} 个统一章节`:"自动推荐目标课程"):(count?`已选择 ${count} 个目标章节`:"请选择目标课程");
  }
  function setBulkTrackSelection(track,selected) { allCourseAssignments().filter(item=>item.track===track).forEach(item=>{const key=courseAssignmentKey(item);selected?bulkCourseAssignmentKeys.add(key):bulkCourseAssignmentKeys.delete(key);});renderBulkCourseTargets(); }
  function chapterItems(trackId,chapterId) {
    const level=$("lessonLevel")?.value||"all";
    return allPhrases().filter(item=>(item.module===trackId&&item.category===chapterId||(item.courseAssignments||[]).some(target=>target.track===trackId&&target.chapter===chapterId))&&(level==="all"||item.level===level));
  }
  function sourceItems(productId,chapter) {
    const level=$("lessonLevel")?.value||"all";const seen=new Set();const result=[];
    allPhrases().filter(item=>(item.courseAssignments||[]).some(target=>target.track==="industry"&&target.chapter===productId&&target.unit===chapter?.id)&&(level==="all"||item.level===level)).forEach(item=>{if(!seen.has(item.id)){seen.add(item.id);result.push(item);}});
    (chapter?.sources||[]).forEach(source=>{const category=String(source.category||"").replace("{product}",productId);const items=allPhrases().filter(item=>item.module==="industry"&&item.category===category&&(level==="all"||item.level===level));const start=Math.max(0,Number(source.from||1)-1);const end=Math.max(start+1,Number(source.to||items.length));items.slice(start,end).forEach(item=>{if(!seen.has(item.id)){seen.add(item.id);result.push(item);}});});
    return result;
  }
  function startCourseItems(items,index,label) {
    const lesson=items.slice(index*8,index*8+8);if(!lesson.length){toast("当前难度没有课程内容，请选择全部难度");return;}practiceItems=lesson;practiceIndex=0;renderPractice();route("practice");toast(`已打开 ${label} · 第 ${index+1} 课`);
  }
  function renderLessonCatalog(root,items,label) {
    const catalog=document.createElement("div");catalog.className="lesson-catalog";root.appendChild(catalog);
    for(let index=0;index<Math.ceil(items.length/8);index+=1){const lesson=items.slice(index*8,index*8+8);const learned=lesson.filter(item=>state.learned.includes(item.id)).length;const button=document.createElement("button");button.className="lesson-tile";button.type="button";button.innerHTML=`<span class="lesson-tile-icon">${String(index+1).padStart(2,"0")}</span><span><strong>第 ${index+1} 课</strong><small>${lesson.length} 条表达 · 已学 ${learned} 条 · 听音、跟读、应用</small></span><i>→</i>`;button.onclick=()=>startCourseItems(items,index,label);catalog.appendChild(button);}
    if(!catalog.children.length)catalog.innerHTML='<div class="source-empty">当前难度还没有课程内容，请切换难度或在课程后台补充。</div>';
  }
  function renderQaCourse(root,units){if(!units.length)return;const title=document.createElement("div");title.className="section-title";title.innerHTML=`<div><span>QA UNITS</span><h2>客户问答单元</h2></div><small>${units.length} 组 · 共用单元进度</small>`;root.appendChild(title);const list=document.createElement("div");list.className="qa-course-list";units.forEach(unit=>{const card=document.createElement("article");const question=qaQuestion(unit);card.className="qa-course-card";card.innerHTML=`<small>${esc(unit.knowledgePoint)} · ${esc(unit.level)}</small><h3>${esc(question.en)}</h3><p>${esc(question.zh)}</p><details><summary>产品知识与参考回答</summary><p>${esc(unit.productKnowledge)}</p><p><strong>${esc(unit.answer.en.join(" "))}</strong></p><p>${esc(unit.answer.zh.join(" "))}</p></details><button type="button">▶ 播放客户问题</button>`;card.querySelector("button").onclick=()=>speak(question.en);list.appendChild(card);});root.appendChild(list);}
  function renderChapterCard(root,item,index,meta,onOpen) {
    const article=document.createElement("article");article.className="chapter-card";article.innerHTML=`<div class="chapter-number">${String(index+1).padStart(2,"0")}</div><div><span>${esc(meta)}</span><h3>${esc(item.title||item.zh)}</h3><p>${esc(item.description||item.name||"")}</p></div><div class="chapter-progress"><strong>打开</strong><small>章节学习界面</small></div><button type="button">进入章节 →</button>`;article.querySelector("button").onclick=onOpen;root.appendChild(article);
  }
  function renderIndustry() {
    const products=courseTracks().find(item=>item.id==="industry").chapters;const product=products.find(item=>item.id===selectedChapter);const unit=(COURSE_CONTENT.industry.chapters||[]).find(item=>item.id===selectedUnit);const grid=$("chapterGrid");const lessons=$("chapterLessons");grid.replaceChildren();lessons.replaceChildren();
    $("coursesKicker").textContent="INDUSTRY ENGLISH";$("coursesTitle").textContent=COURSE_CONTENT.industry.title||"行业英语";$("coursesDescription").textContent=COURSE_CONTENT.industry.subtitle||"按产品系列学习";
    if(!product){$("trackDetailKicker").textContent="PRODUCT SERIES";$("trackDetailTitle").textContent="产品系列";$("trackDetailDescription").textContent="选择产品后，再进入用途、规格、表面处理、安装与包装等独立章节。";$("backToTracks").hidden=true;$("openAddChapter").hidden=false;products.forEach((item,index)=>renderChapterCard(grid,item,index,item.custom?"临时产品":"产品系列",()=>route(`industry/${item.id}`)));return;}
    if(!unit){$("trackDetailKicker").textContent=product.name||"PRODUCT COURSE";$("trackDetailTitle").textContent=product.title||product.zh;$("trackDetailDescription").textContent=product.description||"选择一个章节开始学习。";$("backToTracks").hidden=false;$("backToTracks").textContent="← 返回产品系列";$("openAddChapter").hidden=true;(COURSE_CONTENT.industry.chapters||[]).forEach((item,index)=>renderChapterCard(grid,item,index,"产品章节",()=>route(`industry/${product.id}/${item.id}`)));return;}
    const items=sourceItems(product.id,unit);$("trackDetailKicker").textContent=product.title||product.zh;$("trackDetailTitle").textContent=unit.title;$("trackDetailDescription").textContent=unit.description||unit.name||"";$("backToTracks").hidden=false;$("backToTracks").textContent=`← 返回${product.title||product.zh}`;$("openAddChapter").hidden=true;lessons.innerHTML=`<div class="section-title"><div><span>LESSONS</span><h2>${esc(unit.title)}</h2></div><small>每课最多 8 条表达</small></div>`;renderQaCourse(lessons,allQaUnits().filter(item=>item.productId===product.id&&item.chapterId===unit.id));renderLessonCatalog(lessons,items,`${product.title||product.zh} · ${unit.title}`);
  }
  function renderRoleplay() {
    const chapters=COURSE_CONTENT.scenarios.chapters||[];const chapter=chapters.find(item=>item.id===selectedChapter);const grid=$("chapterGrid");const lessons=$("chapterLessons");grid.replaceChildren();lessons.replaceChildren();$("coursesKicker").textContent="CUSTOMER ROLE PLAY";$("coursesTitle").textContent=COURSE_CONTENT.scenarios.title||"客户情景实战";$("coursesDescription").textContent=COURSE_CONTENT.scenarios.subtitle||"真实客户沟通训练";$("openAddChapter").hidden=true;
    if(!chapter){$("trackDetailKicker").textContent="BUSINESS FLOW";$("trackDetailTitle").textContent="客户沟通章节";$("trackDetailDescription").textContent="基础句型已经归入对应情景，不再作为重复的独立课程。";$("backToTracks").hidden=true;chapters.forEach((item,index)=>renderChapterCard(grid,item,index,"客户情景",()=>route(`roleplay/${item.id}`)));return;}
    $("trackDetailKicker").textContent=chapter.name||"CUSTOMER SCENARIO";$("trackDetailTitle").textContent=chapter.title;$("trackDetailDescription").textContent=chapter.description||"";$("backToTracks").hidden=false;$("backToTracks").textContent="← 返回客户情景";
    const level=$("lessonLevel")?.value||"all";const phrases=allPhrases().filter(item=>(item.module==="business"&&item.category===chapter.businessCategory||(item.courseAssignments||[]).some(target=>target.track==="roleplay"&&target.chapter===chapter.id))&&(level==="all"||item.level===level));lessons.innerHTML=`<div class="section-title"><div><span>CORE ENGLISH</span><h2>核心词汇与句型</h2></div><small>${phrases.length} 条表达</small></div>`;renderLessonCatalog(lessons,phrases,chapter.title);
    const roleplayTitle=document.createElement("div");roleplayTitle.className="section-title roleplay-section-title";roleplayTitle.innerHTML='<div><span>ROLE PLAY</span><h2>客户对话练习</h2></div>';lessons.appendChild(roleplayTitle);const catalog=document.createElement("div");catalog.className="lesson-catalog";lessons.appendChild(catalog);(chapter.dialogs||[]).forEach((id,index)=>{const dialog=C.dialogs[id];if(!dialog||(level!=="all"&&dialog.level!==level))return;const button=document.createElement("button");button.className="lesson-tile";button.type="button";button.innerHTML=`<span class="lesson-tile-icon">${String(index+1).padStart(2,"0")}</span><span><strong>${esc(dialog.title)}</strong><small>${esc(dialog.level)} · ${esc(dialog.context)}</small></span><i>→</i>`;button.onclick=()=>startRoleplay(id);catalog.appendChild(button);});const learnedQa=new Set(state.learned.filter(id=>qaById(id)));(qaContent.dialogues||[]).filter(dialog=>dialog.chapterId===chapter.id&&dialog.qaUnitIds?.some(id=>learnedQa.has(id))).forEach(dialog=>{const details=document.createElement("details");details.className="qa-dialogue";details.innerHTML=`<summary>${esc(dialog.title)} · ${dialog.turns.length} 轮已审核对话</summary>${dialog.turns.map((turn,turnIndex)=>`<div><b>${turnIndex+1}. 客户：${esc(turn.customer)}</b><p>回答：${esc(turn.answer)}</p></div>`).join("")}`;catalog.appendChild(details);});if(!catalog.children.length)catalog.innerHTML='<div class="source-empty">当前难度没有情景对话。完成相关问答后，将出现基于已学知识的预编写对话。</div>';
  }
  function renderTrackDetail() { renderCourses(); }
  function renderCourses() { if(selectedTrack==="roleplay")renderRoleplay();else renderIndustry(); }
  function renderSources() {
    const labels={product:"产品知识",terms:"中英术语",personal:"个人表达",scenario:"业务场景"};
    const query=normalize($("knowledgeSearch")?.value || "");const root=$("sourceQueue");const archive=$("approvedSourceQueue");root.replaceChildren();archive.replaceChildren();
    document.querySelectorAll("[data-library]").forEach(button=>button.classList.toggle("active",button.dataset.library===libraryView));
    const filtered=state.knowledgeItems.filter(item=>(libraryView==="all"||item.library===libraryView)&&(!query||normalize(`${item.title} ${item.content} ${(item.tags||[]).join(" ")}`).includes(query)));
    const pending=filtered.filter(item=>item.status!=="approved");const approved=filtered.filter(item=>item.status==="approved");const items=pending.slice(0,80);
    $("knowledgeCount").textContent=`${pending.length} 条待处理 · ${approved.length} 条已入课`;$("knowledgePendingCount").textContent=`${pending.length} 条待处理`;$("approvedKnowledgeCount").textContent=`${approved.length} 条`;
    const approvedHidden=Boolean(state.settings.hideApprovedKnowledge);archive.hidden=approvedHidden;$("approvedKnowledgeNote").hidden=approvedHidden;$("toggleApprovedKnowledge").textContent=approvedHidden?`显示已入课（${approved.length}）`:"隐藏已入课";$("toggleApprovedKnowledge").setAttribute("aria-expanded",String(!approvedHidden));
    visibleKnowledgeIds=items.map(item=>item.id);[...selectedKnowledgeIds].forEach(id=>{const item=state.knowledgeItems.find(entry=>entry.id===id);if(!item||item.status==="approved")selectedKnowledgeIds.delete(id);});
    if(!items.length)root.innerHTML='<div class="source-empty">当前分类没有待处理资料。可继续采集，或在下方查看已入课资料。</div>';
    items.forEach(item=>{const row=document.createElement("div");row.className="source-item";const source=safeUrl(item.sourceUrl);const status=item.status==="extracted"?`已自动提取 · ${item.extracted?.filter(x=>x.en).length||0} 条待确认`:"待确认原文";const meta=[status,new Date(item.addedAt).toLocaleDateString("zh-CN"),item.origin==="website"?"客户网站":"本地导入"].join(" · ");row.innerHTML=`<label class="source-select"><input data-select type="checkbox" aria-label="选择 ${esc(item.title)}" ${selectedKnowledgeIds.has(item.id)?"checked":""}></label><div class="source-item-content"><span class="library-chip">${esc(labels[item.library]||"资料")}</span><strong>${esc(item.title)}</strong><small>${esc(meta)}</small><p>${esc(String(item.content||"").slice(0,420))}${String(item.content||"").length>420?"…":""}</p>${source?`<a href="${esc(source)}" target="_blank" rel="noopener">查看来源 ↗</a>`:""}</div><div class="source-item-actions"><button data-review type="button">继续处理</button><button data-delete type="button">删除</button></div>`;row.querySelector("[data-select]").onchange=event=>{event.target.checked?selectedKnowledgeIds.add(item.id):selectedKnowledgeIds.delete(item.id);updateBulkToolbar();};row.querySelector("[data-review]").onclick=()=>openKnowledgeReview(item.id);row.querySelector("[data-delete]").onclick=()=>deleteKnowledgeItems([item.id]);root.appendChild(row);});
    if(!approved.length)archive.innerHTML='<div class="source-empty">还没有已加入课程的资料。</div>';
    approved.forEach(item=>{const row=document.createElement("div");row.className="source-item approved-source-item";const source=safeUrl(item.sourceUrl);const assignments=uniqueCourseAssignments(item.courseAssignments);const courseText=assignments.length?`${courseAssignmentLabel(assignments[0])}${assignments.length>1?` 等 ${assignments.length} 个章节`:""}`:`行业英语 · ${industryChapterName(chapterForTopic(item.reviewTopic||inferTopic(`${item.title} ${item.content}`)))}`;const meta=[`已加入 ${courseText}`,`${item.addedPhraseIds?.length||0} 条表达`,new Date(item.reviewedAt||item.addedAt).toLocaleDateString("zh-CN")].join(" · ");row.innerHTML=`<div class="source-item-content"><span class="library-chip">${esc(labels[item.library]||"资料")}</span><strong>${esc(item.title)}</strong><small>${esc(meta)}</small><p>${esc(String(item.content||"").slice(0,260))}${String(item.content||"").length>260?"…":""}</p>${source?`<a href="${esc(source)}" target="_blank" rel="noopener">查看来源 ↗</a>`:""}</div><div class="source-item-actions"><button data-course type="button">查看所属课程</button><button data-delete type="button">删除</button></div>`;row.querySelector("[data-course]").onclick=()=>openKnowledgeReview(item.id);row.querySelector("[data-delete]").onclick=()=>deleteKnowledgeItems([item.id]);archive.appendChild(row);});updateBulkToolbar();
  }
  function updateBulkToolbar() {
    const selected=[...selectedKnowledgeIds].filter(id=>state.knowledgeItems.some(item=>item.id===id&&item.status!=="approved"));const visibleSelected=visibleKnowledgeIds.filter(id=>selectedKnowledgeIds.has(id));const toggle=$("selectVisibleKnowledge");toggle.checked=visibleKnowledgeIds.length>0&&visibleSelected.length===visibleKnowledgeIds.length;toggle.indeterminate=visibleSelected.length>0&&visibleSelected.length<visibleKnowledgeIds.length;$("bulkSelectedCount").textContent=`已选择 ${selected.length} 条`;$("bulkRecognizeChinese").disabled=!selected.length;$("bulkReviewKnowledge").disabled=!selected.length;$("bulkDeleteKnowledge").disabled=!selected.length;$("bulkCoursePicker").classList.toggle("disabled",!selected.length);
  }
  function deleteKnowledgeItems(ids) {
    const targets=[...new Set(ids)].filter(id=>state.knowledgeItems.some(item=>item.id===id));if(!targets.length)return;if(!confirm(`确定删除 ${targets.length} 条资料吗？`))return;const targetSet=new Set(targets);state.knowledgeItems=state.knowledgeItems.filter(item=>!targetSet.has(item.id));targets.forEach(id=>selectedKnowledgeIds.delete(id));save();renderSources();renderCourses();toast(`已删除 ${targets.length} 条资料`);
  }
  function safeUrl(value) { try { const url=new URL(value);return /^https?:$/.test(url.protocol)?url.href:""; } catch (_) { return ""; } }
  function commitKnowledge(items) {
    const clean=items.filter(item=>item?.title&&item?.content).slice(0,100).map(item=>({id:item.id||uid(),library:item.library||"product",title:String(item.title).trim().slice(0,180),content:String(item.content).trim().slice(0,20000),sourceUrl:safeUrl(item.sourceUrl),tags:Array.isArray(item.tags)?item.tags.slice(0,20):[],addedAt:item.addedAt||new Date().toISOString(),origin:item.origin||"import",meta:item.meta||{},status:item.status||"pending",extracted:item.extracted||[],addedPhraseIds:item.addedPhraseIds||[],courseAssignments:uniqueCourseAssignments(item.courseAssignments)}));
    state.knowledgeItems=[...clean,...state.knowledgeItems].slice(0,300);save();renderSources();return clean.length;
  }
  function collectBatchMaterials() {
    const input=$("batchSourceInput");const text=input.value.trim();const status=$("batchCollectStatus");if(!text){status.textContent="请先粘贴至少一组资料。";input.focus();return;}const blocks=text.split(/\n\s*\n/).map(block=>block.trim()).filter(Boolean).slice(0,50);const library=$("batchLibrary").value;const items=blocks.map((content,index)=>{const scene=content.match(/^\s*(?:场景|scene)\s*[:：]\s*(.+)$/im)?.[1]?.trim();const english=content.match(/^\s*(?:英文|english|en)\s*[:：]\s*(.+)$/im)?.[1]?.trim();return{library,title:(scene||english||`批量资料 ${index+1}`).slice(0,180),content,sourceUrl:"",origin:"batch-paste"};});const count=commitKnowledge(items);input.value="";status.textContent=`已采集 ${count} 组资料，等待审核。`;toast(`已批量采集 ${count} 组资料`);
  }
  function chapterForTopic(topic) {
    return ({shower:"shower",floor:"floor",door:"door",spigot:"spigot",standoff:"standoff",sliding:"sliding",finish:"material"})[topic]||topic;
  }
  function topicForChapter(category) {
    return ({shower:"shower",floor:"floor",door:"door",spigot:"spigot",standoff:"standoff",sliding:"sliding",material:"finish"})[category]||(C.topics[category]?category:"industry");
  }
  function industryChapterName(id) {
    return courseTracks().find(track=>track.id==="industry")?.chapters.find(chapter=>chapter.id===id)?.zh||C.topics[id]?.zh||"玻璃五金专业英语";
  }
  function refreshTopicOptions() {
    const topics=Object.entries(C.topics).filter(([id])=>!["business","industry"].includes(id));
    const generator=$("generatorTopic");if(generator){const current=generator.value;generator.replaceChildren(...topics.map(([id,topic])=>{const option=document.createElement("option");option.value=id;option.textContent=`${topic.name} · ${topic.zh}`;return option;}));if(topics.some(([id])=>id===current))generator.value=current;}
    renderBulkCourseTargets();
  }
  function addProductChapter() {
    const zh=$("chapterZh").value.trim();const name=$("chapterName").value.trim()||zh;const description=$("chapterDescription").value.trim();const validation=$("chapterValidation");
    if(!zh){validation.hidden=false;validation.textContent="请填写章节中文名称。";$("chapterZh").focus();return;}
    if(state.customChapters.some(chapter=>normalize(chapter.zh)===normalize(zh))){validation.hidden=false;validation.textContent="同名章节已经存在。";return;}
    const id=`product-${uid()}`;const chapter={id,zh,name,description,icon:"＋",color:"mint",createdAt:new Date().toISOString()};state.customChapters.push(chapter);C.topics[id]={name,zh,icon:chapter.icon,color:chapter.color};save();refreshTopicOptions();$("chapterDialog").close();$("chapterZh").value="";$("chapterName").value="";$("chapterDescription").value="";validation.hidden=true;route(`industry/${id}`);toast(`已添加「${zh}」。正式共享给所有用户，请在“管理课程”中新增产品。`);
  }
  function inferTopic(text) {
    const value=normalize(text);const rules=[
      ["shower",/shower|hinge|淋浴|浴室/],["floor",/floor spring|spindle|地弹簧|地轴/],
      ["sliding",/sliding|soft close|滑动|移门|推拉/],["spigot",/spigot|balustrade|railing|栏杆|驳接爪/],
      ["standoff",/standoff|point fixing|point fixed|广告钉|点式|驳接/],["finish",/stainless|finish|corrosion|satin|mirror|不锈钢|表面|拉丝|镜面/],
      ["door",/patch|lock|door|玻璃门|门夹|门锁/]
    ];
    return rules.find(([,pattern])=>pattern.test(value))?.[0] || "door";
  }
  function inferScene(text) {
    const value=normalize(text);
    if(/quote|price|cost|报价|价格/.test(value))return "报价沟通";
    if(/install|installation|安装/.test(value))return "安装指导";
    if(/complaint|problem|issue|after sales|投诉|问题|售后/.test(value))return "售后沟通";
    if(/sample|样品/.test(value))return "样品沟通";
    if(/delivery|lead time|shipment|交期|运输/.test(value))return "交期沟通";
    return "产品沟通";
  }
  function normalizeMaterialLine(value) {
    return String(value || "").trim().replace(/^\s*(?:>|[-*+]\s+|\d+[.)、]\s*)/,"").replace(/^#{1,6}\s*/,"").replace(/[＊*]{2}|_{2}|`/g,"").trim();
  }
  function materialField(value,type) {
    const labels=type==="en"?"english|eng|en|英文|英语|英文表达|英文短语|客户英文":"chinese|cn|zh|中文|汉语|中文释义|中文翻译|译文|翻译|释义";
    const match=normalizeMaterialLine(value).match(new RegExp(`^(?:${labels})\\s*[:：]\\s*(.*)$`,"i"));
    return match?match[1].trim():null;
  }
  function materialScene(value) { return normalizeMaterialLine(value).match(/^(?:scene|场景|使用场景|适用场景)\s*[:：]\s*(.+)$/i)?.[1]?.trim()||null; }
  function cleanCandidateText(value) { return normalizeMaterialLine(value).replace(/^\s*(?:english|eng|en|英文|英语|英文表达|英文短语|客户英文|chinese|cn|zh|中文|汉语|中文释义|中文翻译|译文|翻译|释义)\s*[:：]\s*/i,"").replace(/^[\s\-•\d.)、]+/,"").replace(/^["“']|["”']$/g,"").trim().slice(0,500); }
  function extractKnowledgeCandidates(item) {
    const candidates=[];const seen=new Set();
    const add=(en,zh,scene=inferScene(`${item.title} ${item.content}`))=>{en=cleanCandidateText(en);zh=cleanCandidateText(zh);const key=normalize(en);if(!en||seen.has(key)||candidates.length>=12)return;seen.add(key);candidates.push({selected:true,en,zh,scene});};
    const lines=String(item.content||"").split(/\r?\n/).map(normalizeMaterialLine).filter(Boolean);
    for(let i=0;i<lines.length&&candidates.length<12;i+=1){
      const line=lines[i];
      const inlineFields=line.match(/^(?:english|eng|en|英文|英语|英文表达|英文短语)\s*[:：]\s*(.+?)\s+(?:chinese|cn|zh|中文|汉语|中文释义|中文翻译|译文|翻译|释义)\s*[:：]\s*(.+)$/i);
      if(inlineFields){add(inlineFields[1],inlineFields[2],materialScene(lines[i-1])||inferScene(`${item.title} ${item.content}`));continue;}
      const enField=materialField(line,"en");
      if(enField!==null){let en=enField;let zh="";let consumed=0;if(!en&&lines[i+1]&&materialField(lines[i+1],"en")===null&&materialField(lines[i+1],"zh")===null){en=lines[i+1];consumed=1;}for(let offset=consumed+1;offset<=consumed+3&&i+offset<lines.length;offset+=1){const nextEn=materialField(lines[i+offset],"en");if(nextEn!==null)break;const nextZh=materialField(lines[i+offset],"zh");if(nextZh!==null){zh=nextZh;if(!zh&&lines[i+offset+1]&&materialField(lines[i+offset+1],"en")===null&&materialField(lines[i+offset+1],"zh")===null){zh=lines[i+offset+1];consumed=offset+1;}else consumed=offset;break;}}add(en,zh,materialScene(lines[i-1])||inferScene(`${item.title} ${item.content}`));i+=consumed;continue;}
      const pair=line.split(/\s*(?:\||｜|\t|=>|→)\s*/).map(value=>value.trim()).filter(Boolean);
      if(pair.length>=2&&/^(?:english|英文|en)$/i.test(pair[0])&&/^(?:chinese|中文|zh|cn)$/i.test(pair[1]))continue;
      if(pair.length>=2&&/[a-z]/i.test(pair[0])&&/[\u3400-\u9fff]/.test(pair.slice(1).join(" "))){add(pair[0],pair.slice(1).join(" "));continue;}
      const nextLine=lines[i+1]||"";const rawEnglish=cleanCandidateText(line);const adjacentChinese=materialField(nextLine,"zh")??((/[\u3400-\u9fff]/.test(nextLine)&&!/[A-Za-z]{3,}/.test(nextLine))?nextLine:null);
      if(adjacentChinese!==null&&/[A-Za-z]/.test(rawEnglish)&&!/[\u3400-\u9fff]/.test(rawEnglish)&&rawEnglish.split(/\s+/).length>=2){add(rawEnglish,adjacentChinese,materialScene(lines[i-1])||inferScene(`${item.title} ${item.content}`));i+=1;continue;}
      const quoted=[...line.matchAll(/["“]([^"”]*[A-Za-z][^"”]*)["”]/g)];
      if(quoted.length){const context=(line.match(/[\u3400-\u9fff][^"“”]*/)?.[0]||"").replace(/[，,、;；：:]\s*$/,"").trim();quoted.forEach(match=>{const sentences=match[1].match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];sentences.map(sentence=>sentence.trim()).filter(sentence=>sentence.split(/\s+/).length>=3).forEach(sentence=>add(sentence,context?`场景提示：${context}`:""));});continue;}
      const bilingual=line.match(/^(.{3,300}?[.!?])\s*[-—–]\s*([\u3400-\u9fff].{1,300})$/);
      if(bilingual){add(bilingual[1],bilingual[2]);continue;}
      const english=line.match(/(?:^|[•\-]\s*)((?:[A-Z][A-Za-z'/-]*|[a-z][A-Za-z'/-]*)(?:\s+[A-Za-z0-9'(),.%/+\-]+){2,19}[.!?]?)(?:$|\s{2,})/);
      if(english&&!/:\s*https?/i.test(line)&&!/^https?:/i.test(line))add(english[1],"");
    }
    if(!candidates.length)candidates.push({selected:true,en:"",zh:"",scene:inferScene(`${item.title} ${item.content}`)});
    return candidates;
  }
  function refreshBilingualCandidates(item) {
    const cached=(item.extracted||[]).map(candidate=>({...candidate}));
    if(!cached.length||item.status==="approved"||!cached.some(candidate=>candidate.en&&!candidate.zh)||!/[\u3400-\u9fff]/.test(item.content||""))return{candidates:cached,updated:false};
    const reparsed=extractKnowledgeCandidates(item);const pairedCount=list=>list.filter(candidate=>candidate.en&&candidate.zh).length;
    if(pairedCount(reparsed)<=pairedCount(cached))return{candidates:cached,updated:false};
    item.extracted=reparsed.map(candidate=>({...candidate}));item.status="extracted";item.meta={...(item.meta||{}),bilingualParserVersion:2};return{candidates:reparsed,updated:true};
  }
  function renderCandidateEditor() {
    const root=$("extractionEditor");root.replaceChildren();
    $("reviewValidation").hidden=true;$("reviewValidation").textContent="";
    if(!extractedCandidates.length){root.innerHTML='<div class="candidate-empty">确认原文后，系统会自动提取候选表达。</div>';$("approveKnowledge").disabled=true;return;}
    extractedCandidates.forEach(candidate=>{
      const row=document.createElement("div");row.className="candidate-row";
      const selected=document.createElement("input");selected.type="checkbox";selected.checked=candidate.selected!==false;selected.setAttribute("aria-label","选择此表达");
      const en=document.createElement("input");en.type="text";en.placeholder="英文术语或短语";en.value=candidate.en||"";
      const zh=document.createElement("input");zh.type="text";zh.placeholder="中文释义（入库前必填）";zh.value=candidate.zh||"";
      const scene=document.createElement("input");scene.type="text";scene.placeholder="适用场景";scene.value=candidate.scene||"产品沟通";
      selected.onchange=()=>{candidate.selected=selected.checked;row.classList.remove("has-error");};en.oninput=()=>candidate.en=en.value;zh.oninput=()=>{candidate.zh=zh.value;row.classList.remove("has-error");if(extractedCandidates.filter(entry=>entry.selected!==false&&String(entry.en||"").trim()).every(entry=>String(entry.zh||"").trim()))$("reviewValidation").hidden=true;};scene.oninput=()=>candidate.scene=scene.value;
      row.append(selected,en,zh,scene);root.appendChild(row);
    });
    $("approveKnowledge").disabled=false;
  }
  function openKnowledgeReview(id) {
    const item=state.knowledgeItems.find(entry=>entry.id===id);if(!item)return;reviewedKnowledgeId=id;
    $("reviewTitle").textContent=item.title;$("reviewContent").textContent=item.content;$("reviewStatus").textContent=item.status==="approved"?`已加入现有课程 · ${item.addedPhraseIds?.length||0} 条表达`:item.status==="extracted"?"已自动提取 · 等待人工确认":"待确认原文";
    const source=safeUrl(item.sourceUrl);$("reviewSource").hidden=!source;$("reviewSource").href=source||"#";
    $("reviewLevel").value=item.reviewLevel||state.settings.level||"A2";reviewCourseAssignments=uniqueCourseAssignments(item.courseAssignments?.length?item.courseAssignments:recommendCourseAssignments(item));renderReviewCourseTargets();
    const refreshed=refreshBilingualCandidates(item);extractedCandidates=refreshed.candidates;renderCandidateEditor();if(refreshed.updated){save();renderSources();toast("已从原资料重新识别中英文配对");}
    $("extractKnowledge").textContent=item.extracted?.length?"重新确认并自动提取":"确认原文并自动提取";$("approveKnowledge").textContent=item.status==="approved"?"保存修改并更新课程":"确认审核并生成课程";$("courseFromKnowledge").disabled=!(item.status==="approved"&&item.addedPhraseIds?.length);$("reviewDialog").showModal();
  }
  function renderReviewCourseTargets() {
    const keys=new Set(reviewCourseAssignments.map(courseAssignmentKey));renderCourseTargetTree($("reviewCourseTargets"),keys,()=>{reviewCourseAssignments=assignmentsFromKeys(keys);renderReviewCourseTargets();});$("reviewCourseCount").textContent=`已选择 ${keys.size} 个章节`;
  }
  function recommendReviewCourseTargets() { const item=state.knowledgeItems.find(entry=>entry.id===reviewedKnowledgeId);if(!item)return;reviewCourseAssignments=recommendCourseAssignments(item);renderReviewCourseTargets();toast(`已推荐 ${reviewCourseAssignments.length} 个课程章节，可继续调整`); }
  function extractKnowledge() {
    const item=state.knowledgeItems.find(entry=>entry.id===reviewedKnowledgeId);if(!item)return;extractedCandidates=extractKnowledgeCandidates(item);item.status="extracted";item.reviewConfirmedAt=new Date().toISOString();item.reviewLevel=$("reviewLevel").value;item.extracted=extractedCandidates.map(candidate=>({...candidate}));save();renderCandidateEditor();renderSources();$("reviewStatus").textContent="已自动提取 · 等待人工确认";$("extractKnowledge").textContent="重新确认并自动提取";toast(`已自动提取 ${extractedCandidates.filter(x=>x.en).length} 条候选，请核对后确认`);
  }
  async function translateMissingKnowledge() {
    const item=state.knowledgeItems.find(entry=>entry.id===reviewedKnowledgeId);if(!item)return;if(!extractedCandidates.some(candidate=>String(candidate.en||"").trim()))extractKnowledge();const targets=extractedCandidates.map((candidate,index)=>({candidate,index})).filter(({candidate})=>candidate.selected!==false&&String(candidate.en||"").trim()&&!String(candidate.zh||"").trim());if(!targets.length){toast("当前候选表达已有中文释义");return;}const button=$("translateKnowledge");button.disabled=true;button.textContent=`正在翻译 ${targets.length} 条…`;$("reviewStatus").textContent="正在翻译 · 请稍候";
    try{const translations=await translateTexts(targets.map(({candidate})=>candidate.en));targets.forEach(({candidate},index)=>{if(translations[index])candidate.zh=translations[index];});item.extracted=extractedCandidates.map(candidate=>({...candidate}));item.status="extracted";save();renderCandidateEditor();renderSources();$("reviewStatus").textContent="已自动翻译 · 请人工核对";toast(`已翻译 ${targets.length} 条，请核对后入课`);}
    catch(error){$("reviewStatus").textContent="翻译失败 · 可手动填写";toast(`翻译失败：${error.message}`);}
    finally{button.disabled=false;button.textContent="翻译缺失中文";}
  }
  function addCandidate() { extractedCandidates.push({selected:true,en:"",zh:"",scene:"产品沟通"});renderCandidateEditor();$("extractionEditor").lastElementChild?.querySelector('input[type="text"]')?.focus(); }
  function storeApprovedCandidates(item,candidates,assignments,level) {
    assignments=uniqueCourseAssignments(assignments);const primary=assignments[0];const legacyCategory=primary?.track==="industry"?primary.chapter:(COURSE_CONTENT.scenarios.chapters||[]).find(chapter=>chapter.id===primary?.chapter)?.businessCategory||primary?.chapter||"inquiry";const legacyModule=primary?.track==="roleplay"?"business":"industry";const categoryZh=primary?courseAssignmentLabel(primary):"课程表达";const ids=[];
    candidates.forEach((candidate,index)=>{const en=String(candidate.en).trim();const zh=String(candidate.zh).trim();const scene=String(candidate.scene||"产品沟通").trim();const existing=(candidate.phraseId&&state.customPhrases.find(phrase=>phrase.id===canonicalPhraseId(candidate.phraseId)&&phrase.sourceId===item.id))||state.customPhrases.find(phrase=>phrase.sourceId===item.id&&normalize(phrase.en)===normalize(en));if(existing){Object.assign(existing,{topic:topicForChapter(legacyCategory),module:legacyModule,category:legacyCategory,categoryZh,scene,en,zh,level,sourceUrl:item.sourceUrl||"",courseAssignments:assignments});candidate.phraseId=existing.id;ids.push(existing.id);return;}const id=`custom-${item.id}-${index}-${uid()}`;state.customPhrases.push({id,topic:topicForChapter(legacyCategory),module:legacyModule,category:legacyCategory,categoryZh,scene,en,zh,level,words:[],sourceId:item.id,sourceUrl:item.sourceUrl||"",custom:true,courseAssignments:assignments});candidate.phraseId=id;ids.push(id);});item.status="approved";item.reviewedAt=new Date().toISOString();item.reviewTopic=primary?.chapter||item.reviewTopic;item.reviewLevel=level;item.extracted=candidates.map(candidate=>({...candidate}));item.addedPhraseIds=[...new Set(ids)];item.courseAssignments=assignments;delete item.courseId;state.knowledgeCourses=[];return item.addedPhraseIds.length;
  }
  function approveKnowledge() {
    const item=state.knowledgeItems.find(entry=>entry.id===reviewedKnowledgeId);if(!item)return false;
    const selected=extractedCandidates.filter(candidate=>candidate.selected!==false&&String(candidate.en||"").trim());const validation=$("reviewValidation");document.querySelectorAll(".candidate-row").forEach(row=>row.classList.remove("has-error"));if(!selected.length){validation.textContent="请至少选择一条英文表达。";validation.hidden=false;validation.scrollIntoView({behavior:"smooth",block:"nearest"});return false;}
    const missingIndexes=[];extractedCandidates.forEach((candidate,index)=>{if(candidate.selected!==false&&String(candidate.en||"").trim()&&!String(candidate.zh||"").trim())missingIndexes.push(index);});if(missingIndexes.length){missingIndexes.forEach(index=>$("extractionEditor").children[index]?.classList.add("has-error"));validation.textContent=`还有 ${missingIndexes.length} 条中文释义为空。请补充，或取消勾选后再加入课程。`;validation.hidden=false;validation.scrollIntoView({behavior:"smooth",block:"nearest"});return false;}validation.hidden=true;
    const assignments=uniqueCourseAssignments(reviewCourseAssignments);if(!assignments.length){validation.textContent="请至少选择一个行业英语或客户情景实战章节。";validation.hidden=false;validation.scrollIntoView({behavior:"smooth",block:"nearest"});return false;}const level=$("reviewLevel").value;const added=storeApprovedCandidates(item,selected,assignments,level);
    save();renderSources();renderCourses();$("reviewStatus").textContent=`已加入 ${assignments.length} 个课程章节 · ${item.addedPhraseIds.length} 条表达`;$("approveKnowledge").textContent="✓ 已保存并更新课程";$("courseFromKnowledge").disabled=!added;$("reviewDialog").close();toast(`已生成课程：${item.addedPhraseIds.length} 条表达加入 ${assignments.length} 个章节`);return true;
  }
  function bulkReviewKnowledge() {
    const items=state.knowledgeItems.filter(item=>selectedKnowledgeIds.has(item.id)&&item.status!=="approved");if(!items.length)return;const automatic=$("bulkAutoTargets").checked;const shared=assignmentsFromKeys(bulkCourseAssignmentKeys);if(!automatic&&!shared.length){toast("请启用自动推荐，或至少选择一个目标课程章节");$("bulkCoursePicker").open=true;return;}let expressionCount=0;let missingCount=0;let targetCount=0;items.forEach(item=>{const candidates=(item.extracted?.length?item.extracted:extractKnowledgeCandidates(item)).filter(candidate=>candidate.selected!==false&&String(candidate.en||"").trim());expressionCount+=candidates.length;missingCount+=candidates.filter(candidate=>!String(candidate.zh||"").trim()).length;targetCount+=uniqueCourseAssignments([...(automatic?recommendCourseAssignments(item):[]),...shared]).length;});const duplicateCount=items.flatMap(item=>(item.extracted?.length?item.extracted:extractKnowledgeCandidates(item))).filter((candidate,index,list)=>candidate.en&&list.findIndex(entry=>normalize(entry.en)===normalize(candidate.en))<index).length;const preview=`批量生成预览\n\n资料：${items.length} 条\n候选表达：${expressionCount} 条\n目标章节关联：${targetCount} 个\n重复表达：${duplicateCount} 条（按资料保留，课程中按表达 ID 去重）\n缺少中文：${missingCount} 条\n\n缺少中文的资料将保留在待审核区，其余资料立即生成课程。`;if(!confirm(preview))return;let approved=0;let skipped=0;items.forEach(item=>{const refreshed=refreshBilingualCandidates(item);const candidates=(refreshed.candidates.length?refreshed.candidates:extractKnowledgeCandidates(item));const selected=candidates.filter(candidate=>candidate.selected!==false&&String(candidate.en||"").trim());item.extracted=candidates;item.reviewConfirmedAt=item.reviewConfirmedAt||new Date().toISOString();const assignments=uniqueCourseAssignments([...(automatic?recommendCourseAssignments(item):[]),...shared]);if(!selected.length||selected.some(candidate=>!String(candidate.zh||"").trim())||!assignments.length){item.status="extracted";skipped+=1;return;}storeApprovedCandidates(item,selected,assignments,item.reviewLevel||state.settings.level||"A2");selectedKnowledgeIds.delete(item.id);approved+=1;});save();renderSources();renderCourses();$("bulkChineseStatus").textContent=`批量生成完成：${approved} 条资料已入课${skipped?`；${skipped} 条仍需补充或审核`:""}。`;toast(`已批量生成 ${approved} 条资料课程${skipped?`，${skipped} 条待处理`:""}`);
  }
  async function bulkRecognizeChinese() {
    const items=state.knowledgeItems.filter(item=>selectedKnowledgeIds.has(item.id)&&item.status!=="approved");const status=$("bulkChineseStatus");const button=$("bulkRecognizeChinese");
    if(!items.length){toast("请选择尚未加入课程的资料");return;}if(!confirm(`确定批量识别 ${items.length} 条资料中的中文吗？原文没有中文的表达将使用免费翻译补齐。`))return;
    button.disabled=true;button.textContent="正在识别…";status.textContent=`正在重新分析 ${items.length} 条资料…`;
    let pairedFromSource=0;const missing=[];
    items.forEach(item=>{const cached=new Map((item.extracted||[]).filter(candidate=>candidate.en).map(candidate=>[normalize(candidate.en),candidate]));const parsed=extractKnowledgeCandidates(item).map(candidate=>{const previous=cached.get(normalize(candidate.en));if(previous?.zh&&!candidate.zh)return{...candidate,zh:previous.zh,scene:previous.scene||candidate.scene,selected:previous.selected!==false};return candidate;});item.extracted=parsed;item.status="extracted";item.reviewConfirmedAt=item.reviewConfirmedAt||new Date().toISOString();item.meta={...(item.meta||{}),bilingualParserVersion:2};parsed.forEach(candidate=>{if(!candidate.en)return;if(candidate.zh)pairedFromSource+=1;else if(candidate.selected!==false)missing.push({item,candidate});});});
    let translated=0;let failed=0;
    for(let offset=0;offset<missing.length;offset+=12){const batch=missing.slice(offset,offset+12);status.textContent=`已从原文识别 ${pairedFromSource} 条；正在翻译缺失项 ${Math.min(offset+12,missing.length)}/${missing.length}…`;try{const translations=await translateTexts(batch.map(entry=>entry.candidate.en));batch.forEach((entry,index)=>{if(translations[index]){entry.candidate.zh=translations[index];translated+=1;}else failed+=1;});}catch(_){failed+=batch.length;}}
    save();renderSources();button.textContent="批量识别中文";button.disabled=false;status.textContent=`完成：原文配对 ${pairedFromSource} 条，免费翻译 ${translated} 条${failed?`，${failed} 条仍需核对`:""}。`;toast(`批量中文识别完成：${pairedFromSource+translated} 条`);
  }
  function generateCourseFromKnowledge() {
    const item=state.knowledgeItems.find(entry=>entry.id===reviewedKnowledgeId);if(!item)return;if(item.status!=="approved"){approveKnowledge();return;}const target=uniqueCourseAssignments(item.courseAssignments)[0];$("reviewDialog").close();if(target?.track==="roleplay")route(`roleplay/${target.chapter}`);else if(target)route(`industry/${target.chapter}/${target.unit}`);else route(`industry/${chapterForTopic(item.reviewTopic||inferTopic(`${item.title} ${item.content}`))}`);toast(target?`已打开「${courseAssignmentLabel(target)}」`:"已打开所属课程");
  }
  function parseCsv(text) {
    const rows=[];let row=[];let cell="";let quoted=false;
    for(let i=0;i<text.length;i+=1){const char=text[i];if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i+=1;}else quoted=!quoted;}else if(char===","&&!quoted){row.push(cell.trim());cell="";}else if((char==="\n"||char==="\r")&&!quoted){if(char==="\r"&&text[i+1]==="\n")i+=1;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";}else cell+=char;}
    row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
  }
  function objectItem(value,library,sourceUrl,index=0) {
    const object=value&&typeof value==="object"?value:{text:String(value||"")};const entries=Object.entries(object).filter(([,v])=>v!==null&&v!==undefined&&typeof v!=="object");const find=(...names)=>entries.find(([key])=>names.includes(key.toLowerCase()))?.[1];
    const title=find("title","name","term","english","en","product","scene","主题","标题","英文")||entries[0]?.[1]||`导入资料 ${index+1}`;const link=find("sourceurl","source","url","link","来源");
    return {library,title,content:entries.map(([key,val])=>`${key}: ${val}`).join("\n"),sourceUrl:safeUrl(link)||sourceUrl,origin:"file-import"};
  }
  async function importMaterialFile(file) {
    if(!file)return;if(file.size>1000000){toast("文件超过 1 MB，请拆分后导入");return;}
    const library=$("importLibrary").value;const sourceUrl=safeUrl($("importSourceUrl").value);const text=await file.text();let items=[];
    try{
      if(/\.json$/i.test(file.name)){const parsed=JSON.parse(text);const list=Array.isArray(parsed)?parsed:Array.isArray(parsed.items)?parsed.items:Array.isArray(parsed.data)?parsed.data:[parsed];items=list.slice(0,100).map((value,index)=>objectItem(value,library,sourceUrl,index));}
      else if(/\.csv$/i.test(file.name)){const rows=parseCsv(text);const headers=rows.shift()||[];items=rows.slice(0,100).map((row,index)=>objectItem(Object.fromEntries(headers.map((header,column)=>[header||`字段${column+1}`,row[column]||""])),library,sourceUrl,index));}
      else {items=text.split(/\n\s*\n/).filter(Boolean).slice(0,100).map((block,index)=>{const lines=block.trim().split(/\r?\n/);return{library,title:lines[0].replace(/^#+\s*/,"").slice(0,180)||`${file.name} ${index+1}`,content:block,sourceUrl,origin:"file-import"};});}
      const count=commitKnowledge(items);toast(`已导入 ${count} 条资料，等待审核`);$("materialFile").value="";if(count)openKnowledgeReview(state.knowledgeItems[0].id);
    }catch(_){toast("无法解析该文件，请检查格式");}
  }
  function isPrivateHost(host) { return host==="localhost"||host.endsWith(".local")||/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host); }
  async function collectWebsite() {
    const status=$("websiteStatus");let url;try{url=new URL($("websiteUrl").value);}catch(_){toast("请输入有效的客户网站网址");return;}if(url.protocol!=="https:"||isPrivateHost(url.hostname)){toast("仅支持公开 HTTPS 网站");return;}
    if(!navigator.onLine){status.textContent="当前设备处于离线状态，请联网后重试。";return;}status.textContent=`正在读取 ${url.hostname} 的公开页面…`;$("collectWebsite").disabled=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),40000);
    try{const endpoint=new URL("/api/collect-website",location.origin);let response;try{response=await fetch(endpoint,{method:"POST",credentials:"same-origin",cache:"no-store",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.href})});}catch(_){status.textContent="手机 POST 请求失败，正在切换兼容模式重试…";endpoint.searchParams.set("url",url.href);response=await fetch(endpoint,{method:"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});}if([403,405].includes(response.status)){status.textContent="正在切换手机兼容模式重试…";endpoint.searchParams.set("url",url.href);response=await fetch(endpoint,{method:"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});}const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`采集服务返回 HTTP ${response.status}`);const title=$("websiteName").value.trim()||data.title||url.hostname;const count=commitKnowledge([{library:$("websiteLibrary").value,title,content:data.content,sourceUrl:data.finalUrl||url.href,origin:"website",meta:{host:data.host||url.hostname,collectedAt:new Date().toISOString(),fragmentCount:data.fragmentCount||0}}]);status.textContent=`采集完成：${data.host||url.hostname} · 提取 ${data.fragmentCount||0} 段公开文字`;toast("客户网站资料已保存，等待审核");if(count)openKnowledgeReview(state.knowledgeItems[0].id);}
    catch(error){const detail=error.name==="AbortError"?"请求超过 40 秒":error.message==="Failed to fetch"?"手机未连接到采集接口，请刷新 App 后重试":error.message;status.textContent=`无法自动采集：${detail}。如页面需要登录、验证码或由 JavaScript 动态加载，请复制页面文字后批量采集。`;}
    finally{clearTimeout(timer);$("collectWebsite").disabled=false;}
  }
  function generateCourse() {
    const topic = $("generatorTopic").value; const level = $("generatorLevel").value;
    const rank={A1:1,A2:2,B1:3,B2:4};const selected=[];const add=items=>items.forEach(item=>{if(selected.length<5&&!selected.some(x=>x.id===item.id))selected.push(item);});
    const eligible=item=>(rank[item.level]||1)<=(rank[level]||2);
    const phrases=allPhrases();
    add(phrases.filter(item=>item.topic===topic&&state.savedPhrases[item.id]?.weak&&eligible(item)));
    add(phrases.filter(item=>item.topic===topic&&!state.learned.includes(item.id)&&eligible(item)));
    add(phrases.filter(item=>item.topic===topic&&eligible(item)));
    add(phrases.filter(item=>item.topic===topic));
    add(phrases.filter(item=>item.scene==="基础英语"&&eligible(item)));
    add(phrases.filter(eligible));
    state.generatedCourse={ids:selected.map(item=>item.id),topic,level,createdAt:new Date().toISOString()};save();renderGeneratedCourse();renderCourses();toast("微课程已生成并保存");
  }
  function renderGeneratedCourse() {
    const course=state.generatedCourse;const items=course.ids.map(phraseById).filter(Boolean);const topic=C.topics[course.topic];
    $("generatedPreview").replaceChildren(...items.map((item,index)=>{const div=document.createElement("div");div.className="generated-card";div.innerHTML=`<p><strong>${index+1}. ${esc(item.en)}</strong></p><small>${esc(item.zh)} · ${esc(item.level)}${state.savedPhrases[item.id]?.weak?" · 薄弱项优先":""}</small>`;return div;}));
    $("generatedCourseStatus").textContent=items.length?`${topic?.zh || "个性主题"} · ${course.level} · 已保存，可随时继续`:"";
    $("startGeneratedCourse").hidden=!items.length;
  }
  function startGeneratedCourse() {
    const course=state.generatedCourse;const items=course.ids.map(phraseById).filter(Boolean);if(!items.length){toast("请先生成课程");return;}
    practiceItems=items;practiceIndex=0;dialogScenario=C.dialogs[course.topic]?course.topic:"shower";$("dialogScenario").value=dialogScenario;renderPractice();resetDialog();if($("generatorDialog").open)$("generatorDialog").close();route("practice");toast("已开始个性微课程");
  }

  function normalizeSyncCode(value) { return String(value||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,24); }
  function displaySyncCode(value) { return normalizeSyncCode(value).replace(/(.{4})(?=.)/g,"$1-"); }
  function generateSyncCode() { const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const bytes=crypto.getRandomValues(new Uint8Array(24));return Array.from(bytes,byte=>alphabet[byte%alphabet.length]).join(""); }
  function mergeById(remote=[],local=[]) {
    const map=new Map();[...remote,...local].forEach(item=>{if(!item?.id)return;const old=map.get(item.id);if(!old){map.set(item.id,item);return;}const oldTime=Date.parse(old.updatedAt||old.reviewedAt||old.addedAt||old.createdAt||0)||0;const nextTime=Date.parse(item.updatedAt||item.reviewedAt||item.addedAt||item.createdAt||0)||0;map.set(item.id,nextTime>=oldTime?item:old);});return [...map.values()];
  }
  function mergeRecordMap(remote={},local={}) {
    const result={...remote};Object.entries(local||{}).forEach(([id,value])=>{const old=result[id];if(!old){result[id]=value;return;}const oldTime=Date.parse(old.updatedAt||old.lastActivity||old.lastLearnedAt||old.last||0)||0;const valueTime=Date.parse(value?.updatedAt||value?.lastActivity||value?.lastLearnedAt||value?.last||0)||0;const latest=valueTime>=oldTime?{...old,...value}:{...value,...old};if(old.reps!==undefined||value?.reps!==undefined){latest.reps=Math.max(Number(old.reps)||0,Number(value?.reps)||0);latest.errors=Math.max(Number(old.errors)||0,Number(value?.errors)||0);latest.stage=Math.max(Number(old.stage??-1),Number(value?.stage??-1));if(valueTime===oldTime&&old.rating!==value?.rating){const rank={easy:0,unsure:1,hard:2};latest.rating=(rank[old.rating]||0)>=(rank[value?.rating]||0)?old.rating:value?.rating;latest.due=[old.due,value?.due].filter(Boolean).sort()[0];}}result[id]=latest;});return result;
  }
  function mergePlanMap(remote={},local={}) {
    const rank={easy:0,unsure:1,hard:2};const result={};new Set([...Object.keys(remote||{}),...Object.keys(local||{})]).forEach(date=>{const a=remote?.[date]||{},b=local?.[date]||{},seen=new Set(),items=[],completed={...(a.completed||{})},conflicts=[...(a.conflicts||[]),...(b.conflicts||[])];[...(a.items||[]),...(b.items||[])].forEach(entry=>{if(entry?.id&&!seen.has(entry.id)){seen.add(entry.id);items.push(entry);}});Object.entries(b.completed||{}).forEach(([id,rating])=>{if(completed[id]&&completed[id]!==rating){const resolved=(rank[completed[id]]||0)>=(rank[rating]||0)?completed[id]:rating;conflicts.push({id,remote:completed[id],local:rating,resolved,detectedAt:new Date().toISOString()});completed[id]=resolved;}else completed[id]=rating;});result[date]={...a,...b,createdAt:[a.createdAt,b.createdAt].filter(Boolean).sort()[0],items,completed,conflicts:conflicts.slice(-50)};});return result;
  }
  function mergeSyncedState(local,remote) {
    const localTasks=local.dailyTasks||{};const remoteTasks=remote.dailyTasks||{};const dailyTasks={...remoteTasks};Object.entries(localTasks).forEach(([date,tasks])=>dailyTasks[date]={...(remoteTasks[date]||{}),...tasks});
    const recentCourse=[remote.generatedCourse,local.generatedCourse].filter(Boolean).sort((a,b)=>(Date.parse(b.createdAt||0)||0)-(Date.parse(a.createdAt||0)||0))[0]||defaultState.generatedCourse;
    const dailyPlans=mergePlanMap(remote.dailyPlans,local.dailyPlans),qaDailyPlans=mergePlanMap(remote.qaDailyPlans,local.qaDailyPlans);const syncConflicts=[...Object.entries(dailyPlans),...Object.entries(qaDailyPlans)].flatMap(([date,plan])=>(plan.conflicts||[]).map(conflict=>({date,...conflict}))).slice(-100);
    return {...structuredClone(defaultState),...remote,...local,
      savedWords:mergeRecordMap(remote.savedWords,local.savedWords),savedPhrases:mergeRecordMap(remote.savedPhrases,local.savedPhrases),wordDetails:mergeRecordMap(remote.wordDetails,local.wordDetails),reviews:mergeRecordMap(remote.reviews,local.reviews),itemProgress:mergeRecordMap(remote.itemProgress,local.itemProgress),dailyPlans,qaDailyPlans,syncConflicts,
      learned:[...new Set([...(remote.learned||[]),...(local.learned||[])])],mastered:[...new Set([...(remote.mastered||[]),...(local.mastered||[])])],days:[...new Set([...(remote.days||[]),...(local.days||[])])],
      spoken:Math.max(Number(remote.spoken)||0,Number(local.spoken)||0),shuffle:Math.max(Number(remote.shuffle)||0,Number(local.shuffle)||0),dailyTasks,
      knowledgeItems:mergeById(remote.knowledgeItems,local.knowledgeItems),customPhrases:mergeById(remote.customPhrases,local.customPhrases),customChapters:mergeById(remote.customChapters,local.customChapters),customQaUnits:mergeById(remote.customQaUnits,local.customQaUnits),knowledgeCourses:[],generatedCourse:recentCourse,
      settings:{...defaultState.settings,...(remote.settings||{}),...(local.settings||{})}
    };
  }
  function setSyncUi(message) {
    const code=localStorage.getItem(SYNC_KEY)||"";if(!$("syncCode"))return;$("syncCode").value=displaySyncCode(code);$("syncNow").disabled=!code||syncBusy;$("disconnectSync").disabled=!code||syncBusy;$("createSync").disabled=syncBusy;$("connectSync").disabled=syncBusy;$("syncStatus").textContent=message||(code?"已连接，修改后自动同步":"尚未连接");document.querySelector(".sync-card")?.classList.toggle("syncing",syncBusy);
  }
  function scheduleSync() { const code=localStorage.getItem(SYNC_KEY);if(!code||!navigator.onLine)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow({quiet:true}),2500); }
  async function syncNow({quiet=false}={}) {
    const code=normalizeSyncCode(localStorage.getItem(SYNC_KEY));if(!code||syncBusy)return;if(!navigator.onLine){setSyncUi("当前离线，联网后自动同步");return;}
    syncBusy=true;setSyncUi("正在合并手机与电脑数据…");
    try{
      const headers={Authorization:`Bearer ${code}`};const response=await fetch("/api/sync",{headers,cache:"no-store"});let remote=null;
      if(response.ok)remote=await response.json();else if(response.status!==404)throw new Error((await response.json().catch(()=>({}))).error||`同步读取失败 ${response.status}`);
      const localVersion=Number(localStorage.getItem(SYNC_VERSION_KEY)||0);const dirty=localStorage.getItem(SYNC_DIRTY_KEY)==="1";
      if(remote?.state&&remote.updatedAt>localVersion){state=migrateCourseState(dirty||!localVersion?mergeSyncedState(state,remote.state):{...structuredClone(defaultState),...remote.state,settings:{...defaultState.settings,...(remote.state.settings||{})}},true);state.customChapters.forEach(chapter=>{C.topics[chapter.id]={name:chapter.name||chapter.zh,zh:chapter.zh,icon:chapter.icon||"＋",color:chapter.color||"mint"};});refreshTopicOptions();}
      const upload=await fetch("/api/sync",{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({state})});if(!upload.ok)throw new Error((await upload.json().catch(()=>({}))).error||`同步保存失败 ${upload.status}`);
      const result=await upload.json();localStorage.setItem(SYNC_VERSION_KEY,String(result.updatedAt));localStorage.removeItem(SYNC_DIRTY_KEY);syncApplying=true;save();syncApplying=false;renderAll();const conflictCount=state.syncConflicts?.length||0;setSyncUi(`${conflictCount?`已保守合并 ${conflictCount} 个评分冲突 · `:"同步完成 · "}${new Date(result.updatedAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}`);if(!quiet)toast(conflictCount?`同步完成，${conflictCount} 个评分冲突按较弱结果保留`:"手机与电脑数据已同步");
    }catch(error){setSyncUi(`同步失败：${error.message}`);if(!quiet)toast("同步失败，请稍后重试");}
    finally{syncBusy=false;setSyncUi($("syncStatus")?.textContent);}
  }
  function connectSync() { const code=normalizeSyncCode($("syncCode").value);if(code.length!==24){toast("同步码应为 24 位");return;}if(code!==localStorage.getItem(SYNC_KEY)){localStorage.removeItem(SYNC_VERSION_KEY);localStorage.setItem(SYNC_DIRTY_KEY,"1");}localStorage.setItem(SYNC_KEY,code);setSyncUi("正在连接…");syncNow(); }
  function createSync() { const code=generateSyncCode();localStorage.setItem(SYNC_KEY,code);localStorage.removeItem(SYNC_VERSION_KEY);localStorage.setItem(SYNC_DIRTY_KEY,"1");setSyncUi("已生成同步码，正在保存…");syncNow(); }
  function disconnectSync() { localStorage.removeItem(SYNC_KEY);localStorage.removeItem(SYNC_VERSION_KEY);localStorage.removeItem(SYNC_DIRTY_KEY);clearTimeout(syncTimer);setSyncUi("已断开；本机数据仍保留");toast("已断开同步"); }

  function renderStats() {
    $("statLearned").textContent = state.learned.length;
    $("statSpoken").textContent = state.spoken;
    $("statMastered").textContent = state.mastered.length;
    $("savedCount").textContent = `${Object.keys(state.savedWords).length + Object.keys(state.savedPhrases).length} 条收藏`;
  }
  function renderPhonetics() {
    const root=$("phoneticsGroups");if(root.dataset.rendered)return;const groups=[{id:"monophthong",title:"单元音",sub:"12 个"},{id:"diphthong",title:"双元音",sub:"8 个"},{id:"consonant",title:"辅音",sub:"24 个"}];root.replaceChildren(...groups.map(group=>{const section=document.createElement("section");section.className="phonetic-group";section.innerHTML=`<div class="section-title"><div><span>${esc(group.sub)}</span><h2>${esc(group.title)}</h2></div></div><div class="phonetic-grid"></div>`;const grid=section.querySelector(".phonetic-grid");PHONETICS.filter(item=>item.group===group.id).forEach(item=>{const card=document.createElement("article");card.className="phonetic-card";card.innerHTML=`<button class="phonetic-symbol" type="button" aria-label="播放音标 ${esc(item.ipa)}">/${esc(item.ipa)}/ <span>▶</span></button><div class="phonetic-words"></div>`;const words=card.querySelector(".phonetic-words");item.words.forEach(word=>{const button=document.createElement("button");button.type="button";button.textContent=word;button.onclick=()=>openWord(word,{id:`phonetic-${item.ipa}-${word}`,en:`${word} · 国际音标 /${item.ipa}/`});words.appendChild(button);});card.querySelector(".phonetic-symbol").onclick=()=>playPhoneme(item);grid.appendChild(card);});return section;}));root.dataset.rendered="true";$("phoneticsCount").textContent=`${PHONETICS.length} 个音标`;
  }
  function applyTheme(theme, persist = true) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    $("themeIcon").textContent = next === "dark" ? "☀" : "☾";
    $("themeLabel").textContent = next === "dark" ? "浅色模式" : "深色模式";
    $("themeToggle").setAttribute("aria-label", next === "dark" ? "切换浅色模式" : "切换深色模式");
    if (persist) { state.settings.theme = next; save(); }
  }
  function setSidebarCollapsed(collapsed) {
    state.settings.sidebarCollapsed = Boolean(collapsed);
    document.documentElement.classList.toggle("sidebar-collapsed", state.settings.sidebarCollapsed);
    $("collapseSidebar").setAttribute("aria-expanded", String(!state.settings.sidebarCollapsed));
    $("collapseSidebar").setAttribute("aria-label", state.settings.sidebarCollapsed ? "展开导航栏" : "收起导航栏");
    save();
  }
  function toggleMobileNav(open) {
    document.documentElement.classList.toggle("mobile-nav-open", open);
    $("sidebarOverlay").hidden = !open;
    $("menuButton").setAttribute("aria-expanded", String(open));
  }
  function exportData() {
    const payload = {schema:"tradetalk.v2",schemaVersion:3,exportedAt:new Date().toISOString(),state}; const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"})); const a=document.createElement("a");a.href=url;a.download=`tradetalk-backup-${day()}.json`;a.click();URL.revokeObjectURL(url);toast("学习记录已导出");
  }
  async function importData(file) {
    try { const data=JSON.parse(await file.text()); if(!["tradetalk.v1","tradetalk.v2"].includes(data.schema)||!data.state) throw new Error(); state=migrateCourseState({...structuredClone(defaultState),...data.state,courseSchemaVersion:data.state.courseSchemaVersion||0});state.settings={...defaultState.settings,...(state.settings||{})};state.generatedCourse={...defaultState.generatedCourse,...(state.generatedCourse||{})};state.knowledgeItems=state.knowledgeItems||[];state.knowledgeItems.forEach(item=>delete item.courseId);state.customPhrases=state.customPhrases||[];state.customQaUnits=state.customQaUnits||[];state.qaDailyPlans=state.qaDailyPlans||{};state.customChapters=state.customChapters||[];state.customChapters.forEach(chapter=>{C.topics[chapter.id]={name:chapter.name||chapter.zh,zh:chapter.zh,icon:chapter.icon||"＋",color:chapter.color||"mint"};});state.knowledgeCourses=[];refreshTopicOptions();save();renderAll();toast("学习记录导入成功"); } catch(_){toast("文件格式不正确，未导入");}
  }
  async function importQaUnits(file){
    const status=$("qaImportStatus");try{const data=JSON.parse(await file.text());if(data.schema!=="tradetalk.qa.v1"||!Array.isArray(data.units))throw new Error("文件 schema 必须为 tradetalk.qa.v1，且 units 必须为数组");const errors=data.units.flatMap((unit,index)=>validateQaUnit(unit,index));const seen=new Set(allQaUnits().map(unit=>unit.id));const duplicates=[];data.units.forEach(unit=>{if(seen.has(unit.id))duplicates.push(unit.id);seen.add(unit.id);});if(errors.length||duplicates.length){status.textContent=[...errors,...duplicates.map(id=>`ID 重复：${id}`)].join("；");status.classList.add("error");return;}if(!data.units.length)throw new Error("文件中没有问答单元");const preview=data.units.slice(0,5).map(unit=>`${unit.id}｜${unit.knowledgePoint}`).join("\n");if(!confirm(`问答导入预览\n\n共 ${data.units.length} 组\n${preview}${data.units.length>5?"\n…":""}\n\n确认批量导入？`)){status.textContent="已取消导入，现有数据未改变。";return;}const now=new Date().toISOString();state.customQaUnits.push(...data.units.map(unit=>({...unit,importedAt:now,updatedAt:now})));save();renderAll();status.classList.remove("error");status.textContent=`导入成功：${data.units.length} 组；失败 0 组。`;toast(`已导入 ${data.units.length} 组完整问答`);}catch(error){status.textContent=`导入失败：${error.message||"JSON 格式错误"}`;status.classList.add("error");}}
  function renderAll() { renderToday(); renderPractice(); renderBook(); renderCourses(); renderSources(); renderPhonetics(); renderStats(); }

  document.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", event => { event.preventDefault(); route(button.dataset.route); }));
  $("collapseSidebar").onclick=()=>setSidebarCollapsed(!state.settings.sidebarCollapsed);
  $("menuButton").onclick=()=>toggleMobileNav(!document.documentElement.classList.contains("mobile-nav-open"));
  $("sidebarOverlay").onclick=()=>toggleMobileNav(false);
  $("themeToggle").onclick=()=>applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  document.querySelectorAll(".dialog-close").forEach(button => button.onclick = () => button.closest("dialog").close());
  $("dailyContinue").onclick = () => runTask($("dailyContinue").dataset.nextTask || "listen");
  document.querySelectorAll("[data-task]").forEach(button=>button.onclick=()=>runTask(button.dataset.task));
  $("listenPractice").onclick = () => { speak(practiceItems[practiceIndex].en); completeTask("listen"); };
  $("repeatPractice").onclick = () => { speak(practiceItems[practiceIndex].en,3); completeTask("listen"); };
  $("practiceReveal").onclick=revealPracticeSubtitle;$("practiceReveal").onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();revealPracticeSubtitle();}};
  $("recordButton").onclick = toggleRecording;
  $("addWeakReview").onclick = () => { const item=practiceItems[practiceIndex];markWeakPhrase(item,"手动标记");save();renderToday();renderBook();setWeakReviewButton("added");toast("已加入明日复习"); };
  $("prevPractice").onclick = () => { practiceIndex=(practiceIndex-1+practiceItems.length)%practiceItems.length;renderPractice(); };
  $("nextPractice").onclick = () => { practiceIndex=(practiceIndex+1)%practiceItems.length;renderPractice(); };
  $("resetDialog").onclick = resetDialog;
  $("dialogScenario").onchange = event => { dialogScenario=event.target.value;setPractice(dialogScenario); };
  document.querySelectorAll("[data-book-tab]").forEach(button => button.onclick = () => { bookTab=button.dataset.bookTab;renderBook(); });
  $("vocabularySearch").oninput=renderBook;
  $("lessonLevel").onchange=renderCourses;
  $("backToTracks").onclick=()=>{if(selectedTrack==="industry"&&selectedUnit)route(`industry/${selectedChapter}`);else route(selectedTrack==="roleplay"?"roleplay":"industry");};
  $("openAddChapter").onclick=()=>{$("chapterValidation").hidden=true;$("chapterDialog").showModal();};$("saveChapter").onclick=addProductChapter;
  $("speakWord").onclick = () => selectedWord && speak(selectedWord.word); $("saveWord").onclick = saveSelectedWord;
  $("openGenerator").onclick = () => { if(state.generatedCourse.topic)$("generatorTopic").value=state.generatedCourse.topic;if(state.generatedCourse.level)$("generatorLevel").value=state.generatedCourse.level;renderGeneratedCourse();$("generatorDialog").showModal(); }; $("generateCourse").onclick = generateCourse; $("startGeneratedCourse").onclick=startGeneratedCourse;
  $("sourceForm").onsubmit = event => { event.preventDefault(); const title=$("sourceName").value.trim();const content=$("sourceExcerpt").value.trim();const rawUrl=$("sourceUrl").value.trim();if(rawUrl&&!safeUrl(rawUrl)){toast("请输入有效的来源网址");return;}const count=commitKnowledge([{library:$("sourceLibrary").value,title,content,sourceUrl:rawUrl,origin:"manual"}]);event.target.reset();toast("已保存，等待审核");if(count)openKnowledgeReview(state.knowledgeItems[0].id); };
  $("materialFile").onchange=event=>importMaterialFile(event.target.files[0]);
  $("qaUnitFile").onchange=event=>event.target.files[0]&&importQaUnits(event.target.files[0]);
  $("copyMaterialTemplate").onclick=async()=>{const template="场景：询盘确认\n客户问题：你们的玻璃夹适配多厚的玻璃？\n英文：Our glass clamp is suitable for 8 to 12 mm glass.\n中文：我们的玻璃夹适用于 8 至 12 毫米玻璃。\n\n场景：报价沟通\n英文：The price includes standard export packaging.\n中文：价格包含标准出口包装。";try{await navigator.clipboard.writeText(template);toast("推荐格式已复制");}catch(_){toast("浏览器不允许复制，请手动复制示例");}};
  $("batchCollect").onclick=collectBatchMaterials;
  $("collectWebsite").onclick=collectWebsite;
  $("extractKnowledge").onclick=extractKnowledge;
  $("translateKnowledge").onclick=translateMissingKnowledge;
  $("addCandidate").onclick=addCandidate;
  $("recommendReviewTargets").onclick=recommendReviewCourseTargets;
  $("approveKnowledge").onclick=approveKnowledge;
  $("courseFromKnowledge").onclick=generateCourseFromKnowledge;
  $("selectVisibleKnowledge").onchange=event=>{visibleKnowledgeIds.forEach(id=>event.target.checked?selectedKnowledgeIds.add(id):selectedKnowledgeIds.delete(id));renderSources();};
  $("bulkRecognizeChinese").onclick=bulkRecognizeChinese;
  $("bulkAutoTargets").onchange=renderBulkCourseTargets;
  $("bulkSelectIndustry").onclick=()=>setBulkTrackSelection("industry",true);
  $("bulkSelectRoleplay").onclick=()=>setBulkTrackSelection("roleplay",true);
  $("bulkClearTargets").onclick=()=>{bulkCourseAssignmentKeys.clear();renderBulkCourseTargets();};
  $("bulkReviewKnowledge").onclick=bulkReviewKnowledge;
  $("bulkDeleteKnowledge").onclick=()=>deleteKnowledgeItems([...selectedKnowledgeIds]);
  $("toggleApprovedKnowledge").onclick=()=>{state.settings.hideApprovedKnowledge=!state.settings.hideApprovedKnowledge;save();renderSources();};
  document.querySelectorAll("[data-library]").forEach(button=>button.onclick=()=>{libraryView=button.dataset.library;renderSources();});
  $("knowledgeSearch").oninput=renderSources;
  $("rateInput").value=state.settings.rate; $("rateOutput").textContent=`${state.settings.rate}×`; $("levelSelect").value=`${state.settings.level} ${state.settings.level==="A1"?"入门":state.settings.level==="A2"?"基础沟通":state.settings.level==="B1"?"独立沟通":"熟练沟通"}`;
  $("accentToggle").checked=state.settings.accent==="en-GB";
  $("rateInput").oninput=event=>{$("rateOutput").textContent=`${event.target.value}×`;state.settings.rate=Number(event.target.value);save();};
  $("accentToggle").onchange=event=>{state.settings.accent=event.target.checked?"en-GB":"en-US";save();};
  $("levelSelect").onchange=event=>{state.settings.level=event.target.value.slice(0,2);save();};
  $("exportData").onclick=exportData; $("importData").onchange=event=>event.target.files[0]&&importData(event.target.files[0]);
  $("createSync").onclick=createSync;$("connectSync").onclick=connectSync;$("syncNow").onclick=()=>syncNow();$("disconnectSync").onclick=disconnectSync;$("syncCode").oninput=event=>event.target.value=displaySyncCode(event.target.value);
  $("resetData").onclick=()=>{if(confirm("确定清除这台设备上的学习记录吗？此操作不可撤销。")){state.customChapters.forEach(chapter=>delete C.topics[chapter.id]);localStorage.removeItem(KEY);state=structuredClone(defaultState);selectedTrack=null;selectedChapter=null;refreshTopicOptions();renderAll();toast("本机记录已清除");}};
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;$("installButton").hidden=false;});
  $("installButton").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installButton").hidden=true;}};
  window.addEventListener("online",()=>{$("networkBadge").textContent="已联网";syncNow({quiet:true});}); window.addEventListener("offline",()=>{$("networkBadge").textContent="离线可用";setSyncUi("当前离线，联网后自动同步");});
  window.addEventListener("beforeunload",()=>{if(recordingUrl)URL.revokeObjectURL(recordingUrl);recordingStream?.getTracks().forEach(track=>track.stop());});
  window.addEventListener("hashchange",()=>{const name=location.hash.slice(1);if(["today","practice","book","phonetics","knowledge","profile","industry","roleplay"].includes(name))route(name);});
  window.TradeTalkAdapter={v1:{exportState:()=>structuredClone(state),importState:next=>{state=migrateCourseState({...state,...next},true);state.customChapters.forEach(chapter=>{C.topics[chapter.id]={name:chapter.name||chapter.zh,zh:chapter.zh,icon:chapter.icon||"＋",color:chapter.color||"mint"};});refreshTopicOptions();save();renderAll();}}};

  refreshTopicOptions();
  Object.entries(C.dialogs).forEach(([id,dialog])=>{const option=document.createElement("option");option.value=id;option.textContent=dialog.title;$("dialogScenario").appendChild(option);});
  document.documentElement.classList.toggle("sidebar-collapsed", state.settings.sidebarCollapsed);
  $("collapseSidebar").setAttribute("aria-expanded", String(!state.settings.sidebarCollapsed));
  applyTheme(state.settings.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), false);
  $("dateLabel").textContent=new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
  setSyncUi();if(localStorage.getItem(SYNC_KEY)&&navigator.onLine)syncNow({quiet:true});
  setPractice("shower"); resetDialog(); renderAll();
  const initial=location.hash.slice(1); route(["today","practice","book","phonetics","knowledge","profile","industry","roleplay"].includes(initial)?initial:"today");
  if("serviceWorker" in navigator){navigator.serviceWorker.register("service-worker.js").then(()=>{$("offlineStatus").textContent="离线缓存已启用。完整打开一次后，可在无网络时继续学习。";}).catch(()=>{$("offlineStatus").textContent="离线缓存未启用：请通过 HTTPS 或 localhost 打开。";});}else{$("offlineStatus").textContent="当前浏览器不支持 PWA 离线缓存。";}
})();
