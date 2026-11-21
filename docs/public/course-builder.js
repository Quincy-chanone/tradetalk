(function(root){
  "use strict";
  const SCHEMA="tradetalk.course-draft.v1";
  const CONTENT_TYPES={term:"术语",phrase:"短语",intro:"介绍句",customer_question:"客户问题",complete_qa:"完整问答",product_knowledge:"产品知识",complete_course:"完整课程"};
  const chapterRules=[
    ["specifications","规格与选型",/(thickness|dimension|size|model|capacity|weight|load|fit|suitable|适配|厚度|尺寸|型号|承重|选型)/i],
    ["installation","安装与调试",/(install|mount|fix|adjust|drill|screw|安装|固定|调节|打孔|螺丝)/i],
    ["materials","材质与表面处理",/(stainless|aluminium|aluminum|brass|zinc|material|finish|polish|satin|材质|不锈钢|铝|黄铜|锌|表面|亮光|砂光)/i],
    ["installation","结构与配件关系",/(component|accessory|part|connect|bracket|gasket|cover|结构|配件|部件|连接|垫片|盖板)/i],
    ["application","名称、用途与应用",/(used for|application|purpose|designed for|用于|用途|应用|适用于)/i]
  ];
  const productRules=[
    ["spigot","栏杆立柱与落地夹",/(spigot|balustrade|railing|栏杆立柱|泳池围栏)/i],
    ["shower","淋浴房五金",/(shower|淋浴|浴室夹|淋浴门)/i],
    ["floor","地弹簧与闭门器",/(floor spring|door closer|地弹簧|闭门器)/i],
    ["door","玻璃门五金",/(glass door|patch fitting|hinge|handle|玻璃门|门夹|合页|拉手)/i],
    ["standoff","广告钉与玻璃固定件",/(standoff|sign fixing|广告钉|玻璃固定件)/i],
    ["sliding","滑动门系统",/(sliding|roller|track|滑动门|滑轮|轨道)/i]
  ];
  const clean=value=>String(value??"").trim();
  const stable=(prefix="id")=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const compact=value=>clean(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"");
  function parameterFacts(source){
    const text=`${clean(source.title)}\n${clean(source.content)}`,facts=[];
    const add=(key,label,value)=>{const normalized=clean(value).toLowerCase().replace(/\s+/g,"");if(normalized&&!facts.some(item=>item.key===key&&item.value===normalized))facts.push({key,label,value:normalized,sourceId:source.id});};
    for(const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to|至|到)\s*(\d+(?:\.\d+)?)\s*(?:mm|毫米)/gi))add("thickness_range","厚度范围",`${match[1]}-${match[2]}mm`);
    for(const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)/gi))add("load_value","承重参数",`${match[1]}kg`);
    for(const match of text.matchAll(/\b(?:aisi\s*)?(304|316l?|2205)\b/gi))add("material_grade","材质牌号",match[1]);
    for(const match of text.matchAll(/(?:model|型号)\s*[:#：-]?\s*([a-z0-9_-]*\d[a-z0-9_-]*)/gi))add("model","型号",match[1]);
    return facts;
  }
  function analyzeSources(sources,classifications=[]){
    const byId=new Map(classifications.map(item=>[item.sourceId,item])),duplicateMap=new Map();
    sources.forEach(source=>{const key=compact(source.content||source.title);if(key.length<12)return;const group=duplicateMap.get(key)||[];group.push(source.id);duplicateMap.set(key,group);});
    const duplicateGroups=[...duplicateMap.values()].filter(ids=>ids.length>1).map(ids=>({sourceIds:ids,reason:"正文规范化后完全相同"}));
    const factGroups=new Map();sources.forEach(source=>parameterFacts(source).forEach(fact=>{const values=factGroups.get(fact.key)||[];values.push(fact);factGroups.set(fact.key,values);}));
    const potentialConflicts=[];factGroups.forEach((facts,key)=>{const values=[...new Set(facts.map(item=>item.value))];const sourceIds=[...new Set(facts.map(item=>item.sourceId))];if(values.length>1&&sourceIds.length>1)potentialConflicts.push({key,label:facts[0].label,values,sourceIds,reason:"不同资料出现不同参数；可能属于不同型号、材质或适用条件，需人工核实，不能合并为通用结论"});});
    const products=[...new Set(sources.map(source=>(byId.get(source.id)||classifySource(source)).productId).filter(Boolean))];if(products.length>1)potentialConflicts.push({key:"product_series",label:"产品系列",values:products,sourceIds:sources.map(item=>item.id),reason:"所选资料被推荐到多个产品系列，请确认是否应拆分课程"});
    return{duplicateGroups,potentialConflicts};
  }
  function contentType(text){
    const value=clean(text),lines=value.split(/\r?\n/).map(clean).filter(Boolean);
    if(/"schema"\s*:\s*"tradetalk\.course-draft\.v1"|产品短文|knowledgePoints|知识点ID/i.test(value))return"complete_course";
    const hasQuestion=/\?|？|^(?:客户问题|question)\s*[:：]/im.test(value),hasAnswer=/^(?:参考回答|回答|answer)\s*[:：]/im.test(value);
    if(hasQuestion&&hasAnswer)return"complete_qa";
    if(hasQuestion)return"customer_question";
    if(lines.length===1&&value.length<=45&&!/[.!。！]/.test(value))return/\s/.test(value)?"phrase":"term";
    if(/[A-Za-z]/.test(value)&&/[.!]/.test(value))return"intro";
    if(/[一-龥]/.test(value))return"product_knowledge";
    return"phrase";
  }
  function classifySource(source){
    const text=`${clean(source.title)}\n${clean(source.content)}`;
    const chapter=chapterRules.find(rule=>rule[2].test(text));
    const product=productRules.find(rule=>rule[2].test(text));
    const type=contentType(text),reasons=[];
    if(chapter)reasons.push(`命中“${chapter[1]}”相关词`);else reasons.push("未发现足够的章节关键词，需要人工选择");
    if(product)reasons.push(`上下文指向“${product[1]}”`);else reasons.push("产品系列无法从当前资料可靠判断");
    if(type==="customer_question")reasons.push("存在明确问号或问题字段；问题形式不参与知识章节判断");
    return{sourceId:source.id,contentType:type,contentTypeLabel:CONTENT_TYPES[type],productId:product?.[0]||"",productName:product?.[1]||"待选择",chapterId:chapter?.[0]||"",chapterName:chapter?.[1]||"待选择",confidence:product&&chapter?"medium":"low",reason:reasons.join("；")};
  }
  function emptyCourse(options={}){
    const id=clean(options.id)||stable("course"),productId=clean(options.productId),chapterId=clean(options.chapterId);
    return{schema:SCHEMA,id,status:"draft",productId,productName:clean(options.productName)||"待选择产品",title:clean(options.title)||"待整理课程主题",courseId:chapterId?`industry/${productId||"unclassified"}/${chapterId}`:"",primaryChapterId:chapterId,relatedChapterIds:[],level:options.level||"A2",knowledgePoints:[],article:{en:[],zh:[]},coreTerms:[],expressions:[],knowledgeNote:"",freeTalkPrompts:[],qa:[],sourceIds:[...(options.sourceIds||[])],sourceSnapshot:[...(options.sourceSnapshot||[])],sourceAnalysis:{duplicateGroups:[],potentialConflicts:[]},gaps:["尚未生成完整课程内容"],unresolvedTechnicalIssues:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  }
  function buildPackage(sources,classifications=[],options={}){
    const byId=new Map(classifications.map(item=>[item.sourceId,item]));
    const primary=classifications.find(item=>item.productId&&item.chapterId)||classifications.find(item=>item.productId)||classifications[0]||{};
    const course=emptyCourse({productId:options.productId||primary.productId,productName:options.productName||primary.productName,chapterId:options.chapterId||primary.chapterId,title:options.title,level:options.level,sourceIds:sources.map(item=>item.id),sourceSnapshot:sources.map(item=>({id:item.id,title:item.title,content:item.content,sourceUrl:item.sourceUrl||"",classification:byId.get(item.id)||classifySource(item)}))});
    course.sourceAnalysis=analyzeSources(sources,classifications);
    const questions=sources.filter(item=>(byId.get(item.id)||classifySource(item)).contentType==="customer_question");
    const basis=sources.filter(item=>!["customer_question","term","phrase"].includes((byId.get(item.id)||classifySource(item)).contentType));
    if(questions.length&&!basis.length){course.gaps.push("客户问题缺少已确认的产品知识依据；补充资料后才能生成确定的技术答案");course.unresolvedTechnicalIssues.push(...questions.map(item=>({sourceId:item.id,question:clean(item.content),issue:"缺少产品知识依据"})));}
    if(course.sourceAnalysis.potentialConflicts.length){course.gaps.push("所选资料存在可能的参数或归属差异；核实型号、材质和适用条件后再生成正式内容");course.unresolvedTechnicalIssues.push(...course.sourceAnalysis.potentialConflicts.map(item=>({type:"source-conflict",key:item.key,sourceIds:item.sourceIds,values:item.values,issue:item.reason})));}
    return course;
  }
  function promptFor(course){
    return `你是外贸产品英语课程编辑。请严格依据下面资料生成课程草稿，不得编造参数、认证、性能或适配范围。\n\n规则：\n1. 先整理知识点及来源、适用条件和待核实项。\n2. 输出 4—6 句连贯英文产品短文，每句配中文。\n3. 输出 4 轮不重复的关联客户问答；每轮含问题/中文、回答/中文、同意图不同问法/中文、回答要点、知识点 ID、必要情景条件。\n4. 问答使用的技术知识必须出现在知识点、短文或知识说明中。\n5. 不同问法若改变意图或范围，写入 variants[].answer 对应回答，不能共用不适用答案。\n6. 只有问题、没有答案依据时保留问题，设置 missingBasis=true，并加入 unresolvedTechnicalIssues，不生成确定答案。\n7. 资料不足时保留 gaps，输出不完整草稿，不凑句数或问答数。\n8. 保留 sourceAnalysis；其中 potentialConflicts 未经来源或人工确认，不得自行选择一个参数当作通用结论。\n9. 仅返回一个 JSON 对象，schema 必须是 ${SCHEMA}；保留已有 id、sourceIds、sourceSnapshot。\n\n字段结构示例：\n${JSON.stringify({...course,knowledgePoints:[{id:"kp-1",title:"知识点",summary:"仅写已确认事实",sourceIds:course.sourceIds.slice(0,1),conditions:"适用条件",unresolved:false}],article:{en:["Sentence one."],zh:["第一句。"]},coreTerms:[{en:"term",zh:"术语"}],expressions:[{en:"useful expression",zh:"常用表达"}],freeTalkPrompts:["中文脱稿提示"],qa:[{id:`${course.id}-qa-1`,question:{en:"Customer question?",zh:"客户问题？"},variants:[{en:"Natural alternative?",zh:"自然问法？"}],answer:{en:["Reference answer."],zh:["参考回答。"]},answerPoints:["回答要点"],knowledgePointIds:["kp-1"],conditions:"情景条件",missingBasis:false}],gaps:[],unresolvedTechnicalIssues:[]},null,2)}\n\n资料质量分析：\n${JSON.stringify(course.sourceAnalysis,null,2)}\n\n原始资料包：\n${JSON.stringify(course.sourceSnapshot,null,2)}`;
  }
  function parse(text){
    const value=clean(text);if(!value)throw new Error("请粘贴或导入课程草稿");let raw=value;
    const fence=value.match(/```(?:json)?\s*([\s\S]*?)```/i);if(fence)raw=fence[1];
    const start=raw.indexOf("{"),end=raw.lastIndexOf("}");if(start<0||end<=start)throw new Error("未找到 JSON 课程对象");
    const data=JSON.parse(raw.slice(start,end+1));return data.course&&typeof data.course==="object"?data.course:data;
  }
  function normalizeCourse(input){
    const course={...emptyCourse(),...input};course.schema=SCHEMA;course.id=clean(course.id)||stable("course");course.status=course.status==="approved"?"approved":"draft";course.relatedChapterIds=[...new Set((course.relatedChapterIds||[]).map(clean).filter(Boolean))];course.sourceIds=[...new Set((course.sourceIds||[]).map(clean).filter(Boolean))];course.sourceAnalysis={duplicateGroups:Array.isArray(course.sourceAnalysis?.duplicateGroups)?course.sourceAnalysis.duplicateGroups:[],potentialConflicts:Array.isArray(course.sourceAnalysis?.potentialConflicts)?course.sourceAnalysis.potentialConflicts:[]};course.knowledgePoints=(course.knowledgePoints||[]).map((item,index)=>({...item,id:clean(item.id)||`${course.id}-kp-${index+1}`,title:clean(item.title),summary:clean(item.summary),sourceIds:[...new Set((item.sourceIds||[]).map(clean).filter(Boolean))],conditions:clean(item.conditions),unresolved:Boolean(item.unresolved)}));course.article={en:(course.article?.en||[]).map(clean).filter(Boolean),zh:(course.article?.zh||[]).map(clean).filter(Boolean)};course.coreTerms=(course.coreTerms||[]).map(item=>({en:clean(item.en),zh:clean(item.zh)})).filter(item=>item.en||item.zh);course.expressions=(course.expressions||[]).map(item=>({en:clean(item.en),zh:clean(item.zh)})).filter(item=>item.en||item.zh);course.freeTalkPrompts=(course.freeTalkPrompts||[]).map(clean).filter(Boolean);course.qa=(course.qa||[]).map((item,index)=>({...item,id:clean(item.id)||`${course.id}-qa-${index+1}`,question:{en:clean(item.question?.en||item.customerQuestion?.en),zh:clean(item.question?.zh||item.customerQuestion?.zh)},variants:(item.variants||[]).map(variant=>({en:clean(variant.en),zh:clean(variant.zh),...(variant.answer?{answer:{en:(variant.answer.en||[]).map(clean).filter(Boolean),zh:(variant.answer.zh||[]).map(clean).filter(Boolean)}}:{})})).filter(variant=>variant.en||variant.zh),answer:{en:(item.answer?.en||[]).map(clean).filter(Boolean),zh:(item.answer?.zh||[]).map(clean).filter(Boolean)},answerPoints:(item.answerPoints||[]).map(clean).filter(Boolean),knowledgePointIds:[...new Set((item.knowledgePointIds||[]).map(clean).filter(Boolean))],conditions:clean(item.conditions),missingBasis:Boolean(item.missingBasis)}));course.gaps=(course.gaps||[]).map(clean).filter(Boolean);course.unresolvedTechnicalIssues=(course.unresolvedTechnicalIssues||[]).filter(Boolean);course.updatedAt=new Date().toISOString();return course;
  }
  function validate(input,{complete=false}={}){
    const course=normalizeCourse(input),errors=[],warnings=[];
    if(!course.id)errors.push("缺少课程 ID");if(!course.productId)errors.push("请选择产品系列");if(!course.title)errors.push("缺少课程主题");if(!course.primaryChapterId)errors.push("请选择主要知识章节");
    const kpIds=course.knowledgePoints.map(item=>item.id),kpSet=new Set(kpIds),sourceSet=new Set(course.sourceIds);if(kpIds.length!==kpSet.size)errors.push("知识点 ID 重复");course.knowledgePoints.forEach((item,index)=>{if(!item.title||!item.summary)errors.push(`知识点 ${index+1} 缺少标题或内容`);if(!item.sourceIds.length)warnings.push(`知识点 ${item.id} 未关联来源`);item.sourceIds.filter(id=>!sourceSet.has(id)).forEach(id=>errors.push(`知识点 ${item.id} 引用了不存在的来源 ${id}`));});
    if(course.article.en.length!==course.article.zh.length)errors.push("产品短文中英文句数不一致");if(complete&&(course.article.en.length<4||course.article.en.length>6))errors.push("完整课程的产品短文必须为 4—6 句");
    const qaIds=course.qa.map(item=>item.id);if(qaIds.length!==new Set(qaIds).size)errors.push("问答 ID 重复");if(complete&&course.qa.length!==4)errors.push("完整课程必须包含 4 轮问答");
    course.qa.forEach((item,index)=>{if(!item.question.en||!item.question.zh)errors.push(`第 ${index+1} 轮缺少中英客户问题`);if(!item.missingBasis&&(!item.answer.en.length||item.answer.en.length!==item.answer.zh.length))errors.push(`第 ${index+1} 轮参考回答中英文不完整`);if(item.missingBasis)errors.push(`第 ${index+1} 轮缺少产品知识依据，不能正式入课`);if(!item.variants.length)errors.push(`第 ${index+1} 轮缺少同一意图的自然问法`);item.variants.forEach((variant,vIndex)=>{if(!variant.en||!variant.zh)errors.push(`第 ${index+1} 轮第 ${vIndex+1} 个不同问法缺少中英内容`);if(variant.answer&&(!variant.answer.en.length||variant.answer.en.length!==variant.answer.zh.length))errors.push(`第 ${index+1} 轮第 ${vIndex+1} 个对应回答中英文不完整`);});if(!item.answerPoints.length)errors.push(`第 ${index+1} 轮缺少回答要点`);if(!item.conditions)warnings.push(`第 ${index+1} 轮未填写情景条件`);if(!item.knowledgePointIds.length)errors.push(`第 ${index+1} 轮未关联知识点`);item.knowledgePointIds.filter(id=>!kpSet.has(id)).forEach(id=>errors.push(`第 ${index+1} 轮引用了不存在的知识点 ${id}`));});
    if(complete&&(course.gaps.length||course.unresolvedTechnicalIssues.length||course.knowledgePoints.some(item=>item.unresolved)))errors.push("仍有待确认技术内容或课程缺口，解决或移除后才能正式入课");
    if(!course.sourceIds.length)warnings.push("课程未关联原始资料");return{course,errors:[...new Set(errors)],warnings:[...new Set(warnings)],valid:errors.length===0};
  }
  function diffCourse(existing,incoming){
    if(!existing)return{isNew:true,changed:true,significant:true,changedFields:[]};
    const before=normalizeCourse(existing),after=normalizeCourse(incoming);
    const fields=[
      ["productId","产品系列",true],["title","课程主题",false],["primaryChapterId","主要章节",true],["relatedChapterIds","关联章节",true],["level","难度",false],
      ["knowledgePoints","知识点",true],["article","产品短文",true],["coreTerms","核心术语",false],["expressions","常用表达",false],["knowledgeNote","产品知识说明",true],
      ["freeTalkPrompts","脱稿提示",false],["qa","客户问答",true],["sourceIds","来源关联",false],["sourceSnapshot","来源快照",false],["sourceAnalysis","资料质量分析",true],["gaps","课程缺口",true],["unresolvedTechnicalIssues","待核实技术内容",true]
    ];
    const changedFields=fields.filter(([field])=>JSON.stringify(before[field])!==JSON.stringify(after[field])).map(([field,label,significant])=>({field,label,significant}));
    return{isNew:false,changed:changedFields.length>0,significant:changedFields.some(item=>item.significant),changedFields};
  }
  const api={SCHEMA,CONTENT_TYPES,classifySource,analyzeSources,buildPackage,promptFor,parse,normalizeCourse,validate,diffCourse,emptyCourse,stable};
  root.TradeTalkCourseBuilder=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
