import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const qa = JSON.parse(await readFile(new URL("../docs/public/content/qa-units.json", import.meta.url), "utf8"));
const template = JSON.parse(await readFile(new URL("../docs/public/templates/qa-unit-template.json", import.meta.url), "utf8"));
const app = await readFile(new URL("../docs/public/app.js", import.meta.url), "utf8");

assert.equal(qa.schema, "tradetalk.qa.v1");
assert.equal(qa.units.length, 5, "样板课程必须正好包含 5 组问答");
assert.equal(new Set(qa.units.map(unit => unit.id)).size, qa.units.length, "问答 ID 必须唯一");
for (const unit of qa.units) {
  assert.equal(unit.type, "qa-unit");
  assert.ok(unit.productId && unit.chapterId && unit.knowledgePoint);
  assert.ok(unit.customerQuestion?.en && unit.customerQuestion?.zh);
  assert.ok(unit.variants?.length >= 2, `${unit.id} 至少需要两种不同问法`);
  assert.ok(unit.answer?.en?.length >= 2 && unit.answer?.en?.length <= 3);
  assert.equal(unit.answer.en.length, unit.answer.zh.length);
  assert.ok(unit.productKnowledge && unit.keywords?.length);
}
assert.ok(qa.dialogues.some(dialog => dialog.turns.length >= 3 && dialog.turns.length <= 5));
assert.ok(qa.dialogues.every(dialog => dialog.chapterId && dialog.qaUnitIds.every(id => qa.units.some(unit => unit.id === id))), "情景对话必须限定章节并只引用有效问答 ID");
assert.equal(template.schema, "tradetalk.qa.v1");
for (const required of ["qaDailyPlans=mergePlanMap", "dailyPlans=mergePlanMap", "itemProgress:mergeRecordMap", "reviews:mergeRecordMap"]) assert.ok(app.includes(required), `同步合并缺少 ${required}`);
for (const required of ["phraseById(id)||qaById(id)", "syncConflicts", "按较弱结果保留", "今日5组问答已完成"]) assert.ok(app.includes(required), `二轮修正缺少 ${required}`);

const mergeSource = app.slice(app.indexOf("  function mergeById"), app.indexOf("  function setSyncUi"));
assert.ok(mergeSource.includes("function mergeSyncedState"));
const defaultState = {settings:{},generatedCourse:{ids:[],topic:null,level:null,createdAt:null},dailyPlans:{},qaDailyPlans:{},dailyTasks:{},knowledgeItems:[],customPhrases:[],customChapters:[],customQaUnits:[],learned:[],mastered:[],days:[]};
const mergeSyncedState = Function("defaultState", `${mergeSource}; return mergeSyncedState;`)(defaultState);
const date="2026-10-23",id="qa-spigot-post-001",base={courseSchemaVersion:3,settings:{},dailyTasks:{},learned:[],mastered:[],days:[],knowledgeItems:[],customPhrases:[],customChapters:[],customQaUnits:[]};
const remote={...base,reviews:{[id]:{rating:"easy",reps:4,errors:1,stage:3,due:"2026-11-01",updatedAt:"2026-10-23T08:00:00.000Z"}},qaDailyPlans:{[date]:{items:[{id,bucket:"due"}],completed:{[id]:"easy"}}}};
const local={...base,reviews:{[id]:{rating:"hard",reps:3,errors:2,stage:0,due:"2026-10-24",updatedAt:"2026-10-23T08:00:00.000Z"}},qaDailyPlans:{[date]:{items:[{id,bucket:"due"}],completed:{[id]:"hard"}}}};
const merged=mergeSyncedState(local,remote);
assert.equal(merged.qaDailyPlans[date].completed[id],"hard","同一项目冲突时应保守保留较弱评分");
assert.equal(merged.reviews[id].rating,"hard");
assert.equal(merged.reviews[id].reps,4,"复习次数不得回退");
assert.equal(merged.reviews[id].errors,2,"错误次数不得回退");
assert.equal(merged.syncConflicts.length,1,"评分冲突必须留下可见记录");
console.log("QA smoke tests passed: 5 units, scoped dialogue, unified reviews, primary QA report, template, and visible conflict-aware sync.");
