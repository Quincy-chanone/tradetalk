# TradeTalk 完整课程草稿

将下面 JSON 代码块整体导入。字段结构与系统解析器一致；普通新课程可以省略 `id`，系统会生成稳定 ID。

```json
{
  "schema": "tradetalk.course-draft.v1",
  "evidenceVersion": 1,
  "productId": "door",
  "productName": "玻璃门五金",
  "title": "课程主题",
  "primaryChapterId": "specification",
  "relatedChapterIds": ["usage"],
  "level": "A2",
  "knowledgePoints": [{"id": "kp-1", "title": "用途", "summary": "铰链将玻璃门连接到墙面。", "sourceIds": ["source-1"], "evidence": [{"sourceId": "source-1", "quote": "铰链将玻璃门连接到墙面。"}], "conditions": "仅用于资料描述的墙装配置", "unresolved": false}],
  "article": {"en": ["Sentence one.", "Sentence two.", "Sentence three.", "Sentence four."], "zh": ["第一句。", "第二句。", "第三句。", "第四句。"]},
  "articleKnowledgePointIds": [["kp-1"], ["kp-1"], ["kp-1"], ["kp-1"]],
  "knowledgeNotePointIds": [],
  "coreTerms": [{"en": "glass thickness", "zh": "玻璃厚度"}],
  "expressions": [{"en": "Please confirm the glass thickness.", "zh": "请确认玻璃厚度。"}],
  "knowledgeNote": "补充产品知识说明和适用范围。",
  "freeTalkPrompts": ["产品名称", "用途", "适用条件"],
  "qa": [
    {"id": "qa-1", "question": {"en": "Question one?", "zh": "问题一？"}, "variants": [{"en": "Alternative one?", "zh": "自然问法一？"}], "answer": {"en": ["Answer one."], "zh": ["回答一。"]}, "answerPoints": ["确认条件"], "knowledgePointIds": ["kp-1"], "conditions": "情景条件", "missingBasis": false},
    {"id": "qa-2", "question": {"en": "Question two?", "zh": "问题二？"}, "variants": [{"en": "Alternative two?", "zh": "自然问法二？"}], "answer": {"en": ["Answer two."], "zh": ["回答二。"]}, "answerPoints": ["解释产品"], "knowledgePointIds": ["kp-1"], "conditions": "情景条件", "missingBasis": false},
    {"id": "qa-3", "question": {"en": "Question three?", "zh": "问题三？"}, "variants": [{"en": "Alternative three?", "zh": "自然问法三？"}], "answer": {"en": ["Answer three."], "zh": ["回答三。"]}, "answerPoints": ["澄清范围"], "knowledgePointIds": ["kp-1"], "conditions": "情景条件", "missingBasis": false},
    {"id": "qa-4", "question": {"en": "Question four?", "zh": "问题四？"}, "variants": [{"en": "Alternative four?", "zh": "自然问法四？"}], "answer": {"en": ["Answer four."], "zh": ["回答四。"]}, "answerPoints": ["推进下一步"], "knowledgePointIds": ["kp-1"], "conditions": "情景条件", "missingBasis": false}
  ],
  "sourceIds": ["source-1"],
  "sourceSnapshot": [{"id": "source-1", "title": "来源标题", "content": "铰链将玻璃门连接到墙面。", "sourceUrl": ""}],
  "gaps": [],
  "unresolvedTechnicalIssues": []
}
```
