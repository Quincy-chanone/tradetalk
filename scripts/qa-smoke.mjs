import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const qa = JSON.parse(await readFile(new URL("../docs/public/content/qa-units.json", import.meta.url), "utf8"));
const daily = JSON.parse(await readFile(new URL("../docs/public/content/daily-lessons.json", import.meta.url), "utf8"));
const template = JSON.parse(await readFile(new URL("../docs/public/templates/qa-unit-template.json", import.meta.url), "utf8"));
const app = await readFile(new URL("../docs/public/app.js", import.meta.url), "utf8");
const shell = await readFile(new URL("../docs/public/tradetalk-shell.html", import.meta.url), "utf8");

assert.equal(qa.schema, "tradetalk.qa.v1");
assert.equal(new Set(qa.units.map(unit => unit.id)).size, qa.units.length, "旧问答 ID 必须唯一");
assert.equal(template.schema, "tradetalk.qa.v1");

assert.equal(daily.schema, "tradetalk.daily.v2");
assert.ok(daily.lessons.length >= 4, "产品轮换至少需要四个新课主题");
assert.equal(new Set(daily.lessons.map(lesson => lesson.productId)).size, daily.lessons.length, "样板新课应覆盖不同产品");
const ids = new Set();
for (const lesson of daily.lessons) {
  assert.ok(lesson.id && lesson.productId && lesson.courseId && lesson.productName);
  assert.ok(lesson.article.en.length >= 4 && lesson.article.en.length <= 6, `${lesson.id} 短文必须为 4—6 句`);
  assert.equal(lesson.article.en.length, lesson.article.zh.length, `${lesson.id} 中英句数必须一致`);
  assert.ok(lesson.knowledgePoints.length >= 2 && lesson.knowledgePoints.length <= 3, `${lesson.id} 必须包含 2—3 个知识点`);
  assert.equal(lesson.qa.length, 4, `${lesson.id} 必须包含 4 轮关联问答`);
  for (const unit of lesson.qa) {
    assert.ok(!ids.has(unit.id), `重复问答 ID：${unit.id}`); ids.add(unit.id);
    assert.ok(unit.courseId.startsWith(`industry/${lesson.productId}/`), `${unit.id} 必须关联当天产品课程`);
    assert.ok(unit.knowledgePoint && unit.question?.en && unit.question?.zh);
    assert.ok(unit.answer?.en?.length && unit.answer.en.length === unit.answer.zh.length);
  }
}

for (const required of [
  "dailyLearningPlans:{}", "masteryRatings:{}", "courseSchemaVersion:4",
  "function dailyLearningPlan", "function reviewCandidates", "function selectDailyLesson",
  "hasLegacyProgress(today)", "slice(0,4)", "slice(0,2)",
  "播放或录音本身不会自动标记掌握", "今天继续原计划",
  "dailyLearningPlans=mergePlanMap", "masteryRatings:mergeRecordMap",
]) assert.ok(app.includes(required), `今日学习 V2 缺少 ${required}`);

for (const required of [
  "function tokenizedText", "function bindWordTokens", "bindWordTokens(card,{id:lesson.id",
  "bindWordTokens(card,{id:unit.id", "bindWordTokens(article,{id:item.id,en:item.title})",
  "bindWordTokens(root,{id:`dialog-", "tokenizedText(turn.customer)", "tokenizedText(turn.answer)",
]) assert.ok(app.includes(required), `全局点词功能缺少 ${required}`);

const tokenStart=app.indexOf("  function tokenizedText");
const tokenEnd=app.indexOf("  function tokenizedPhrase",tokenStart);
const tokenizedText=Function("esc",`${app.slice(tokenStart,tokenEnd)};return tokenizedText;`)(text=>String(text).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"));
const tokenized=tokenizedText("It's a 304 stainless-steel valve.");
assert.equal((tokenized.match(/data-word=/g)||[]).length,4,"普通单词及带连字符、撇号的词都应可点选");
assert.ok(tokenized.includes('data-word="it&#39;s"')||tokenized.includes('data-word="it’s"')||tokenized.includes('data-word="it\'s"'),"带撇号单词应保留为一个可选词");
assert.ok(tokenized.includes("304"),"数字和标点应原样保留");

for (const required of ["今日产品短文", "4 轮连贯客户问答", "跨产品复习", "todayArticle", "todayReviewList"]) {
  assert.ok(shell.includes(required), `今日页面缺少 ${required}`);
}

const mergeSource = app.slice(app.indexOf("  function mergeById"), app.indexOf("  function setSyncUi"));
const defaultState = {settings:{},generatedCourse:{ids:[],topic:null,level:null,createdAt:null},dailyPlans:{},qaDailyPlans:{},dailyLearningPlans:{},masteryRatings:{},dailyTasks:{},knowledgeItems:[],customPhrases:[],customChapters:[],customQaUnits:[],learned:[],mastered:[],days:[]};
const mergeSyncedState = Function("defaultState", `${mergeSource}; return mergeSyncedState;`)(defaultState);
const date="2026-10-26",id="daily-spigot-system-001-q1",base={courseSchemaVersion:4,settings:{},dailyTasks:{},learned:[],mastered:[],days:[],knowledgeItems:[],customPhrases:[],customChapters:[],customQaUnits:[]};
const remote={...base,reviews:{[id]:{rating:"easy",reps:4,errors:1,stage:3,due:"2026-11-01",updatedAt:"2026-10-26T08:00:00.000Z"}},masteryRatings:{[id]:{listening:"understood",updatedAt:"2026-10-26T08:00:00.000Z"}},dailyLearningPlans:{[date]:{lessonId:"daily-spigot-system-001",qaIds:[id],reviews:[],completed:{[id]:true}}}};
const local={...base,reviews:{[id]:{rating:"hard",reps:3,errors:2,stage:0,due:"2026-10-27",updatedAt:"2026-10-26T08:00:00.000Z"}},masteryRatings:{[id]:{independent:"cannot",updatedAt:"2026-10-26T09:00:00.000Z"}},dailyLearningPlans:{[date]:{lessonId:"daily-spigot-system-001",qaIds:[id],reviews:[],completed:{}}}};
const merged=mergeSyncedState(local,remote);
assert.equal(merged.dailyLearningPlans[date].completed[id],true,"日计划完成状态必须合并保留");
assert.equal(merged.reviews[id].rating,"hard","同一时间的评分冲突应保守保留较弱结果");
assert.equal(merged.masteryRatings[id].independent,"cannot","分维度自评必须参与同步");

console.log("Daily learning V2 smoke tests passed: 1 article, 4 linked Q&A turns, rotation, review limits, legacy preservation, dimensional mastery, and sync merge.");

