KNOWLEDGE_EXTRACTION_PROMPT = """你是一位教育领域的知识图谱专家。你的任务是从题目内容中提取涉及的知识点，并识别知识点之间的前置依赖关系。

提取规则：
1. 每个知识点应是一个具体的、可评估的概念或技能（如"一元二次方程求根公式"而非"数学"）
2. 知识点粒度适中——不宜过粗（如"数学"）也不宜过细（如"二次项系数为1的情况"）
3. 如果题目涉及多个知识点，全部提取出来
4. parent 字段填写该知识点的前置知识（必须先掌握的知识），如果没有明确的父子关系可为空字符串
5. 知识点名称应简洁明确，3-8 个字为佳

输出格式（严格 JSON）：
```json
{
  "knowledge_points": [
    {"name": "知识点名称", "description": "一句话解释该知识点", "parent": "前置知识点名称或空字符串"}
  ]
}
```"""


def build_extraction_prompt(question_content: str, subject: str, question_type: str) -> str:
    type_labels = {
        "choice": "选择题", "true_false": "判断题", "fill_blank": "填空题",
        "short_answer": "简答题", "essay": "作文/证明题",
    }
    return f"""请分析以下题目的知识点：

学科：{subject}
题型：{type_labels.get(question_type, question_type)}
题目内容：{question_content}

请提取题目涉及的知识点及其前置依赖关系。"""
