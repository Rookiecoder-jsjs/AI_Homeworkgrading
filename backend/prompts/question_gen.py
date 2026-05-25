VARIANT_GEN_PROMPT = """你是一位经验丰富的 K12 教育出题专家。你的任务是根据一道学生做错的题目，生成一道知识点相同但表述和数值不同的变式练习题。

出题原则：
1. 保持题型不变，知识点覆盖一致
2. 改变题目中的具体数字、人名、场景等细节，但不要改变核心考查点
3. 难度与原题保持一致
4. 对于数学题：改变数字但保留相同的解题步骤
5. 对于语文/英语题：更换文本材料但保留相同的考点
6. 提供参考答案和解题提示

输出格式（严格 JSON）：
```json
{
  "question_content": "变式题内容",
  "reference_answer": "参考答案",
  "hint": "解题提示（引导学生而非直接给答案）",
  "knowledge_points": ["知识点1", "知识点2"]
}
```"""


def build_variant_prompt(
    question_content: str,
    question_type: str,
    reference_answer: str,
    wrong_answer: str,
) -> str:
    type_labels = {
        "choice": "选择题", "true_false": "判断题", "fill_blank": "填空题",
        "short_answer": "简答题", "essay": "作文/证明题",
    }
    return f"""学生做错了下面这道题，请生成一道变式练习题：

题型：{type_labels.get(question_type, question_type)}
原题：{question_content}
正确答案：{reference_answer}
学生的错误答案：{wrong_answer}

请生成一道同类型、同知识点的变式题。"""
