const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const sandbox={module:{exports:{}},exports:{},globalThis:{},console};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../docs/public/course-builder.js"),"utf8"),sandbox,{filename:"course-builder.js"});
const builder=sandbox.module.exports;

const question={id:"source-q",title:"Glass thickness question",content:"Can one model fit more than one glass thickness?",sourceUrl:"https://example.com/q"};
const questionClass=builder.classifySource(question);
assert.equal(questionClass.contentType,"customer_question","问句应识别为内容形式“客户问题”");
assert.equal(questionClass.chapterId,"specifications","问句的知识归属应独立识别为规格与选型");
assert.match(questionClass.reason,/问题形式不参与知识章节判断/);

const questionOnly=builder.buildPackage([question],[questionClass]);
assert.equal(questionOnly.qa.length,0,"没有知识依据时不得虚构技术答案");
assert.equal(questionOnly.unresolvedTechnicalIssues.length,1);
assert.match(questionOnly.gaps.join(" "),/缺少已确认的产品知识依据/);

const knowledge={id:"source-k",title:"Shower hinge selection",content:"A shower hinge connects a glass door to a wall. The selected model must match the glass arrangement and opening direction.",sourceUrl:"https://example.com/k"};
const combined=builder.buildPackage([question,knowledge],[questionClass,builder.classifySource(knowledge)]);
assert.equal([...combined.sourceIds].join(","),"source-q,source-k","多条相关资料应合并进同一资料包");
assert.equal(combined.unresolvedTechnicalIssues.length,0,"存在产品知识资料时不应把问句自动判定为无依据");
assert.match(builder.promptFor(combined),/source-q/);
assert.match(builder.promptFor(combined),/4—6 句/);

const duplicateA={id:"source-dup-a",title:"TEST duplicate A",content:"The shower hinge fits 8 to 10 mm glass."};
const duplicateB={id:"source-dup-b",title:"TEST duplicate B",content:"The shower hinge fits 8 to 10 mm glass."};
const conflict={id:"source-conflict",title:"TEST model condition",content:"This shower hinge model fits 12 to 14 mm glass."};
const sourceAnalysis=builder.analyzeSources([duplicateA,duplicateB,conflict],[duplicateA,duplicateB,conflict].map(builder.classifySource));
assert.equal(sourceAnalysis.duplicateGroups.length,1,"完全相同资料应识别为重复组");
assert.ok(sourceAnalysis.potentialConflicts.some(item=>item.key==="thickness_range"),"不同厚度范围必须提示可能的适用条件冲突");
const conflictPackage=builder.buildPackage([duplicateA,conflict],[builder.classifySource(duplicateA),builder.classifySource(conflict)]);
assert.ok(conflictPackage.unresolvedTechnicalIssues.some(item=>item.type==="source-conflict"),"参数差异必须进入待核实技术内容");
assert.match(builder.promptFor(conflictPackage),/potentialConflicts/,"免费生成资料包必须携带冲突分析");

const valid=builder.normalizeCourse({
  id:"course-test-1",productId:"shower",productName:"Shower Hinges",title:"Selecting a Shower Hinge",primaryChapterId:"specifications",relatedChapterIds:["installation","specifications","installation"],level:"A2",
  knowledgePoints:[{id:"kp-1",title:"Selection basis",summary:"Selection depends on the confirmed door layout.",sourceIds:["source-k"],conditions:"After the layout is confirmed",unresolved:false}],
  article:{en:["Sentence one.","Sentence two.","Sentence three.","Sentence four."],zh:["第一句。","第二句。","第三句。","第四句。"]},coreTerms:[{en:"door layout",zh:"门体布局"}],expressions:[],knowledgeNote:"Use the confirmed layout.",freeTalkPrompts:["门体布局"],
  qa:[1,2,3,4].map(index=>({id:`qa-${index}`,question:{en:`Question ${index}?`,zh:`问题${index}？`},variants:[{en:`Alternative ${index}?`,zh:`不同问法${index}？`}],answer:{en:[`Answer ${index}.`],zh:[`回答${index}。`]},answerPoints:["Confirm"],knowledgePointIds:["kp-1"],conditions:"Confirmed layout",missingBasis:false})),
  sourceIds:["source-k"],sourceSnapshot:[knowledge],gaps:[],unresolvedTechnicalIssues:[]
});
assert.equal([...valid.relatedChapterIds].join(","),"installation,specifications","多章节关联应共享课程 ID 并去重，不复制课程");
assert.equal(builder.validate(valid,{complete:true}).valid,true,"完整课程应通过结构校验");
const unchangedDiff=builder.diffCourse(valid,structuredClone(valid));
assert.equal(unchangedDiff.changed,false,"同 ID 同内容不应误报更新");
const updatedCourse=structuredClone(valid);updatedCourse.article.en[0]="Updated sentence one.";
const updateDiff=builder.diffCourse(valid,updatedCourse);
assert.equal(updateDiff.significant,true,"短文变化应标记为实质更新");
assert.ok(updateDiff.changedFields.some(item=>item.field==="article"),"更新预览应列出短文字段");

const invalid=structuredClone(valid);invalid.qa[0].knowledgePointIds=["missing-kp"];invalid.article.zh.pop();invalid.qa[1].id=invalid.qa[0].id;
const invalidResult=builder.validate(invalid,{complete:true});
assert.equal(invalidResult.valid,false);
assert.match(invalidResult.errors.join("；"),/中英文句数不一致/);
assert.match(invalidResult.errors.join("；"),/问答 ID 重复/);
assert.match(invalidResult.errors.join("；"),/不存在的知识点/);

const markdown=`# draft\n\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``;
assert.equal(builder.parse(markdown).id,"course-test-1","Markdown JSON 代码块应与实际解析器一致");
const template=JSON.parse(fs.readFileSync(path.join(__dirname,"../docs/public/templates/course-draft-template.json"),"utf8"));
assert.equal(builder.validate(template,{complete:true}).valid,true,"交付的 JSON 模板必须可被实际解析器校验");

const app=fs.readFileSync(path.join(__dirname,"../docs/public/app.js"),"utf8");
const theme=fs.readFileSync(path.join(__dirname,"../docs/.vitepress/theme/index.js"),"utf8");
const styles=fs.readFileSync(path.join(__dirname,"../docs/public/styles.css"),"utf8");
assert.match(app,/customCourseUnits/);
assert.match(app,/dailyLearningPlans\[today\]/,"今日计划应按日期固定保存");
assert.match(app,/status:\"needs-review\"/,"同 ID 实质更新应保留记录并标记重新复习");
assert.match(app,/function approveCourse\(\)/);
assert.match(app,/function exportCourseDraft\(course\)/,"单门课程应可导出并保留稳定 ID");
assert.match(app,/TradeTalkCourseBuilder\.diffCourse/,'同 ID 导入必须显示更新差异');
assert.match(app,/function renderCourseSourceAnalysis\(\)/,'课程生成前必须展示资料质量分析');
assert.match(app,/function previewGeneratedCourse\(\)/,'首次打开课程生成器必须准备课程表达预览');
assert.match(app,/推荐课程短语/,'短语本无收藏时必须提供明确标记的课程短语');
assert.match(styles,/lesson-phrase-preview/,'课程课次必须直接显示短语预览');
assert.match(theme,/course-builder\.js/,'VitePress 入口必须先载入课程构建运行时');
assert.match(theme,/querySelector\("#courseBuilderDialog"\)/,'入口必须校验课程 shell，失败时回退未版本化 URL');
assert.match(app,/article-sentence-list/,'短文分句必须有独立容器供手机横向排列');
assert.match(app,/tokenizedText\(text,true\)/,'短文可点单词必须使用行内 span 语义');
assert.match(styles,/article-sentence>button\[data-sentence\]/,'分句样式必须只作用于播放按钮');
assert.match(styles,/article-sentence \.word-token\{display:inline/,'手机端可点单词必须像问答文字一样行内排列');
assert.doesNotMatch(styles,/article-sentence button\{/,'不得把所有可点单词误设为分句按钮');
console.log("Course builder smoke passed: classification, no-fabrication, package, parser, validation, update integration.");
