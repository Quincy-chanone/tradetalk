const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
});

async function hashCode(code) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2,"0")).join("");
}

function readCode(request) {
  const value = request.headers.get("authorization") || "";
  const code = value.replace(/^Bearer\s+/i,"").toUpperCase().replace(/[^A-Z2-9]/g,"");
  return /^[A-Z2-9]{24}$/.test(code) ? code : "";
}

function isBlockedHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g,"");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal" || host === "::1") return true;
  if (/^(0|10|127|169\.254|192\.168)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true;
  return /^f[cd][0-9a-f]{2}:/i.test(host) || /^fe[89ab][0-9a-f]:/i.test(host);
}

function publicHttps(value) {
  try { const url = new URL(value);return url.protocol === "https:" && !url.username && !url.password && !isBlockedHost(url.hostname) ? url : null; }
  catch (_) { return null; }
}

async function fetchPublic(url, options = {}, redirects = 4) {
  let current = url;
  for (let index=0;index<=redirects;index+=1) {
    const response = await fetch(current.href,{...options,redirect:"manual"});
    if (![301,302,303,307,308].includes(response.status)) return response;
    const location = response.headers.get("location");const next = location && publicHttps(new URL(location,current).href);
    if (!next) throw new Error("网站跳转到了不允许的地址");
    current = next;
  }
  throw new Error("网站跳转次数过多");
}

function robotsAllows(text, path) {
  let agents=[];let groupHasRules=false;const rules=[];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line=raw.replace(/#.*$/,"").trim();if(!line)continue;const match=line.match(/^([^:]+):\s*(.*)$/);if(!match)continue;const key=match[1].trim().toLowerCase();const value=match[2].trim();
    if(key==="user-agent"){if(groupHasRules){agents=[];groupHasRules=false;}agents.push(value.toLowerCase());continue;}
    if(key!=="allow"&&key!=="disallow")continue;groupHasRules=true;if(!value||!agents.some(agent=>agent==="*"||agent==="englishtrainercollector"))continue;
    const end=value.endsWith("$");const pattern=value.replace(/\$$/,"").split("*").map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*");try{if(new RegExp(`^${pattern}${end?"$":""}`).test(path))rules.push({allow:key==="allow",length:value.replace(/[*$]/g,"").length});}catch(_){}
  }
  rules.sort((a,b)=>b.length-a.length||Number(b.allow)-Number(a.allow));return rules[0]?.allow!==false;
}

async function readLimitedText(response, limit = 1500000, truncate = false) {
  const declared=Number(response.headers.get("content-length")||0);if(declared>limit&&!truncate)throw new Error(`网页内容超过 ${Math.round(limit/100000)/10} MB`);
  if(!response.body)return "";const reader=response.body.getReader();const decoder=new TextDecoder();let size=0;let text="";
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();if(truncate)break;throw new Error(`网页内容超过 ${Math.round(limit/100000)/10} MB`);}text+=decoder.decode(value,{stream:true});}
  return text+decoder.decode();
}

function decodeHtml(value) {
  const named={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};
  return String(value||"").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&([a-z]+);/gi,(all,name)=>named[name.toLowerCase()]??all).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
}

function extractWebsiteText(html, fallbackTitle) {
  const blocked=/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*(?:noindex|noarchive|nosnippet)/i.test(html)||/<meta[^>]+content=["'][^"']*(?:noindex|noarchive|nosnippet)[^"']*["'][^>]+name=["']robots["']/i.test(html);if(blocked)throw new Error("页面声明禁止索引或摘录");
  const source=String(html||"");const structured=[];for(const match of source.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const walk=(value,depth=0)=>{if(depth>5||value==null)return;if(Array.isArray(value)){value.slice(0,20).forEach(entry=>walk(entry,depth+1));return;}if(typeof value!=="object")return;for(const [key,entry] of Object.entries(value)){if(["name","description","sku","material","brand","category"].includes(key)&&typeof entry==="string"&&entry.length>=3)structured.push(entry);else walk(entry,depth+1);}};walk(JSON.parse(match[1]));}catch(_){}}
  const clean=source.replace(/<(script|style|noscript|svg|nav|footer|form)\b[^>]*>[\s\S]*?<\/\1>/gi," ");const title=decodeHtml(clean.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||clean.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1])||fallbackTitle;
  const description=decodeHtml(clean.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]||clean.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]||clean.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1]);const fragments=[];const seen=new Set();
  const add=value=>{const text=decodeHtml(value);const key=text.toLowerCase();if(text.length>=20&&text.length<=1200&&!seen.has(key)){seen.add(key);fragments.push(text);}};structured.forEach(add);
  for(const match of clean.matchAll(/<(h1|h2|h3|p|li|th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)){add(match[2]);if(fragments.length>=120)break;}if(!fragments.length){if(!/<[a-z][\s\S]*>/i.test(clean))clean.split(/\r?\n/).forEach(add);else for(const match of clean.matchAll(/<(main|article|section)\b[^>]*>([\s\S]*?)<\/\1>/gi)){add(match[2]);if(fragments.length>=20)break;}}
  const content=[description,...fragments].filter(Boolean).join("\n");if(content.length<40)throw new Error("未找到足够的公开文字，页面可能依赖 JavaScript 动态加载");return{title,content,fragmentCount:fragments.length};
}

async function collectWebsiteRequest(request) {
  const requestUrl=new URL(request.url);if(!["GET","POST"].includes(request.method))return json({error:"不支持的请求方法"},405);if(!sameOrigin(request))return json({error:"仅允许本站发起采集"},403);
  let value;if(request.method==="GET")value=requestUrl.searchParams.get("url");else{let body;try{body=await request.json();}catch(_){return json({error:"请求格式无效"},400);}value=body?.url;}const target=publicHttps(value);if(!target)return json({error:"仅支持公开 HTTPS 网站"},400);
  const headers={Accept:"text/html,text/plain;q=0.9","User-Agent":"EnglishTrainerCollector/1.0"};
  try {
    const robotsUrl=new URL("/robots.txt",target);const robots=await fetchPublic(robotsUrl,{headers});if(robots.ok){const text=await readLimitedText(robots,300000);if(!robotsAllows(text,`${target.pathname}${target.search}`))return json({error:"该网站的 robots.txt 不允许采集此页面"},403);}
    const response=await fetchPublic(target,{headers});if(!response.ok)return json({error:`目标网站返回 HTTP ${response.status}`},422);const finalUrl=publicHttps(response.url||target.href);if(!finalUrl)return json({error:"目标网站跳转地址不安全"},422);const type=response.headers.get("content-type")||"";if(!/text\/(html|plain)/i.test(type))return json({error:"该链接不是 HTML 或纯文本页面"},415);const html=await readLimitedText(response,5000000,true);const extracted=extractWebsiteText(html,finalUrl.hostname);return json({...extracted,finalUrl:finalUrl.href,host:finalUrl.hostname});
  } catch(error) { return json({error:error?.message||"网站采集失败"},422); }
}

function sameOrigin(request) {
  const url=new URL(request.url);const origin=request.headers.get("origin");if(origin)return origin===url.origin;if(request.headers.get("sec-fetch-site")==="same-origin")return true;try{return new URL(request.headers.get("referer")||"").origin===url.origin;}catch(_){return false;}
}

async function freeTranslate(text) {
  const value=String(text||"").trim().slice(0,450);if(!value)return "";const url=new URL("https://api.mymemory.translated.net/get");url.searchParams.set("q",value);url.searchParams.set("langpair","en|zh-CN");const response=await fetch(url,{headers:{Accept:"application/json","User-Agent":"EnglishTrainer/1.0"}});if(!response.ok)throw new Error(`免费翻译服务返回 HTTP ${response.status}`);const data=await response.json();const translated=decodeHtml(data?.responseData?.translatedText||"");if(!translated||/MYMEMORY WARNING/i.test(translated))throw new Error("免费翻译额度暂时不可用");return translated;
}

async function translateRequest(request) {
  if(request.method!=="POST")return json({error:"仅支持 POST 请求"},405);if(!sameOrigin(request))return json({error:"仅允许本站发起翻译"},403);let body;try{body=await request.json();}catch(_){return json({error:"请求格式无效"},400);}const texts=Array.isArray(body?.texts)?body.texts.map(text=>String(text||"").trim()).filter(Boolean):[];if(!texts.length||texts.length>12||texts.some(text=>text.length>500))return json({error:"每次支持 1 至 12 条、每条不超过 500 字符"},400);try{const translations=[];for(let index=0;index<texts.length;index+=3)translations.push(...await Promise.all(texts.slice(index,index+3).map(freeTranslate)));return json({translations,provider:"MyMemory"});}catch(error){return json({error:error?.message||"翻译服务暂时不可用"},502);}
}

function arpabetToIpa(value) {
  const map={AA:"ɑ",AE:"æ",AH:"ə",AO:"ɔ",AW:"aʊ",AY:"aɪ",B:"b",CH:"tʃ",D:"d",DH:"ð",EH:"ɛ",ER:"ɜr",EY:"eɪ",F:"f",G:"ɡ",HH:"h",IH:"ɪ",IY:"i",JH:"dʒ",K:"k",L:"l",M:"m",N:"n",NG:"ŋ",OW:"oʊ",OY:"ɔɪ",P:"p",R:"r",S:"s",SH:"ʃ",T:"t",TH:"θ",UH:"ʊ",UW:"u",V:"v",W:"w",Y:"j",Z:"z",ZH:"ʒ"};const result=String(value||"").trim().split(/\s+/).map(token=>{const sound=token.replace(/[012]/g,"");const stress=token.endsWith("1")?"ˈ":token.endsWith("2")?"ˌ":"";return `${stress}${map[sound]||""}`;}).join("");return result?`/${result}/`:"";
}

async function wordInfoRequest(request) {
  if(request.method!=="POST")return json({error:"仅支持 POST 请求"},405);if(!sameOrigin(request))return json({error:"仅允许本站查询"},403);let body;try{body=await request.json();}catch(_){return json({error:"请求格式无效"},400);}const word=String(body?.word||"").toLowerCase().trim();if(!/^[a-z]+(?:['-][a-z]+)*$/.test(word)||word.length>50)return json({error:"单词格式无效"},400);
  try{const dictionaryUrl=new URL("https://api.datamuse.com/words");dictionaryUrl.searchParams.set("sp",word);dictionaryUrl.searchParams.set("md","prd");dictionaryUrl.searchParams.set("max","1");const [dictionaryResult,meaningResult]=await Promise.allSettled([fetch(dictionaryUrl,{headers:{Accept:"application/json"}}).then(response=>response.ok?response.json():[]),freeTranslate(word)]);const dictionary=dictionaryResult.status==="fulfilled"?dictionaryResult.value:[];const entry=Array.isArray(dictionary)?dictionary.find(item=>String(item.word).toLowerCase()===word)||dictionary[0]:null;const pronunciation=entry?.tags?.find(tag=>tag.startsWith("pron:"))?.slice(5)||"";const definition=String(entry?.defs?.[0]||"").replace(/^[a-z]+\s*\t/i,"").trim();const meaning=meaningResult.status==="fulfilled"?meaningResult.value:"";if(!meaning&&!definition&&!pronunciation)throw new Error("未查询到该单词");return json({word,ipa:arpabetToIpa(pronunciation),meaning,definition});}catch(error){return json({error:error?.message||"词典服务暂时不可用"},502);}
}

async function syncRequest(request, env) {
  if (!env.SYNC_DB) return json({error:"同步数据库尚未绑定"},503);
  const code = readCode(request);
  if (!code) return json({error:"同步码无效"},401);
  const key = await hashCode(code);
  if (request.method === "GET") {
    const row = await env.SYNC_DB.prepare("SELECT payload, updated_at FROM sync_data WHERE key_hash = ?").bind(key).first();
    if (!row) return json({error:"暂无云端数据"},404);
    try { return json({state:JSON.parse(row.payload),updatedAt:Number(row.updated_at)}); }
    catch (_) { return json({error:"云端数据损坏"},500); }
  }
  if (request.method === "PUT") {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 950000) return json({error:"同步数据超过 950 KB，请先清理资料库"},413);
    let body;try { body = await request.json(); } catch (_) { return json({error:"请求格式无效"},400); }
    if (!body?.state || typeof body.state !== "object" || Array.isArray(body.state)) return json({error:"学习数据格式无效"},400);
    const payload = JSON.stringify(body.state);
    if (new TextEncoder().encode(payload).byteLength > 900000) return json({error:"同步数据超过 900 KB，请先清理资料库"},413);
    const updatedAt = Date.now();
    await env.SYNC_DB.prepare("INSERT INTO sync_data (key_hash, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").bind(key,payload,updatedAt).run();
    return json({ok:true,updatedAt});
  }
  return json({error:"不支持的请求方法"},405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/sync") {
      try { return await syncRequest(request,env); }
      catch (_) { return json({error:"同步服务暂时不可用"},500); }
    }
    if (url.pathname === "/api/collect-website") return collectWebsiteRequest(request);
    if (url.pathname === "/api/translate") return translateRequest(request);
    if (url.pathname === "/api/word-info") return wordInfoRequest(request);
    return env.ASSETS.fetch(request);
  }
};
