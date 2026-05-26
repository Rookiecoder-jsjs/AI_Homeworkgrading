# AI_Homeworkgrading — 架构文档

> **当前版本：v0.2.2**
> 前端纯内联 CSS-in-JS + Glass Morphism + Framer Motion + KaTeX。后端 FastAPI + SQLite + AsyncOpenAI 异步并行。

## 1. 项目结构

```
AI_Homeworkgrading/
├── README.md · PRD.md · ARCHITECTURE.md
├── .env.example
├── frontend/src/
│   ├── main.tsx / App.tsx          # 入口 + 15 条路由
│   ├── theme.ts                    # 设计 Token（含玻璃态色值）
│   ├── constants.ts                # 题型标签映射
│   ├── index.css                   # 全局 CSS + @keyframes
│   ├── types/index.ts              # 12+ TS 接口
│   ├── api/client.ts               # 30+ API 方法
│   ├── motion/index.tsx            # 8 个动画组件（含 TiltCard）
│   ├── components/                 # 13 个组件
│   │   ├── CleanContent.tsx         # 🆕 内容清洗 + JSON 检测 + KaTeX
│   │   ├── MathRenderer.tsx         # 🆕 LaTeX 公式 KaTeX 渲染
│   │   ├── ConfidenceBadge.tsx      # 置信度三色徽章
│   │   ├── SocraticFeedback.tsx     # 苏格拉底三级展开
│   │   ├── GradingResult.tsx        # 单题批改卡片
│   │   ├── ImageUploader.tsx        # 图片上传
│   │   ├── MarkdownRenderer.tsx     # Markdown 渲染
│   │   ├── KnowledgeGraph.tsx       # 知识树可视化
│   │   ├── MasteryBar.tsx           # 掌握度进度条
│   │   ├── StyleIndicator.tsx       # 教师偏差徽章
│   │   ├── SimilarQuestionCard.tsx  # 变式题卡片
│   │   ├── TiltCard (in motion)     # 3D 鼠标跟随
│   │   └── CountUp (in pages)      # 数字递增动画
│   └── pages/
│       ├── Home.tsx                 # 玻璃态首页
│       ├── teacher/ (8 pages)      # 看板/作业/复核/队列/风格/分析
│       └── student/ (6 pages)      # 看板/作业/提交/结果/订正/错题本
└── backend/
    ├── main.py                      # FastAPI 入口（7 个路由）
    ├── config.py / database.py      # 配置 + 8 表 + PRAGMA 自动迁移
    ├── models.py                    # 30+ Pydantic 模型
    ├── utils.py                     # extract_json（括号计数状态机）+ 文件上传校验
    ├── routers/                     # 7 个路由模块（30+ 端点）
    │   ├── assignments.py           # 作业 CRUD + CSV 导出 + 编辑
    │   ├── submissions.py           # 提交管理（multipart + 逐题图片）
    │   ├── grading.py               # 异步并行批改引擎
    │   ├── dashboard.py             # 看板 + 知识图谱 + 班级分析 + 教师风格
    │   ├── error_book.py            # 错题本（6 端点）
    │   └── pdf_export.py            # 家长报告 PDF
    ├── services/                    # 10 个服务
    │   ├── ai_client.py             # AsyncOpenAI（文本+多模态）
    │   ├── ocr.py / grader.py / feedback.py
    │   ├── knowledge_graph.py       # 知识点提取 + 依赖图 + BFS 根因
    │   ├── teacher_style.py         # Welford 偏差追踪 + 修正
    │   ├── error_book.py / question_generator.py
    │   ├── class_analytics.py       # 热力图 + 趋势 + 对比
    │   └── pdf_export.py            # fpdf2 A4 报告
    └── prompts/                     # 6 套 Prompt 模板
```

---

## 2. 端到端数据流

```
教师创建/编辑作业 ──► POST/PUT /api/assignments
学生逐题作答+拍照 ──► POST /api/submissions (multipart + JSON)
教师触发批改 ──► POST /api/submissions/:id/grade
  ├─ 参考答案空值守卫 → 无答案直接拒绝，提示补充
  ├─ OCR（异步并行）→ UPDATE answers
  ├─ 规则引擎（客观题）→ 本地比对
  ├─ AI 批改（主观题，异步并行）→ DashScope（基于参考答案锚定）
  ├─ 条件判分 → 无分值仅判对错，有分值 0-N 范围评分
  ├─ 知识点提取 → knowledge_points 表
  └─ 掌握度更新 → student_mastery 表 (EMA)
教师复核 ──► PUT /api/answers/:id/override → 风格追踪
学生查看 ◄── GET /api/submissions/:id → CleanContent + KaTeX 渲染
错题自动收录 → error_book 表
学生错题本 ◄── GET /api/error-book → LLM 举一反三
```

---

## 3. 数据库（8 张表）

| 表 | 关键字段 | 用途 |
|----|---------|------|
| assignments | title, subject, class_name, teacher_name, status | 作业 |
| questions | type, content, reference_answer, points, knowledge_points_json | 题目（含知识点缓存） |
| submissions | student_name, status, image_url | 提交 |
| answers | student_answer, is_correct, ai_score, score, teacher_override | 答案（AI 分+教师终分分离） |
| knowledge_points | name, subject, parent_id (self FK) | 知识点树 |
| question_knowledge_points | question_id, knowledge_point_id | 题目-知识点 N:M |
| student_mastery | student_name, knowledge_point_id, mastery_score (EMA) | 掌握度 |
| teacher_style_profile | teacher_name, question_type, avg_bias (Welford) | 教师风格 |
| error_book | student_name, answer_id, knowledge_points_json | 错题本 |

---

## 4. API 端点（30+）

### 作业
| 方法 | 路径 | 说明 |
|------|------|------|
| POST/GET/PUT/DELETE | `/api/assignments[/{id}]` | CRUD + 编辑 |
| GET | `/api/assignments/{id}/export` | CSV 导出 |

### 提交 & 批改
| POST | `/api/submissions` | multipart 提交 |
| GET | `/api/submissions[/{id}]` | 列表/详情 |
| POST | `/api/submissions/{id}/grade` | 触发批改（异步，含参考答案守卫） |
| POST | `/api/assignments/{id}/grade-all` | 批量批改（异步并行） |
| PUT | `/api/answers/{id}/override` | 教师覆写（风格追踪） |
| POST | `/api/submissions/{id}/correct` | 学生订正 |
| POST | `/api/ocr/question` | 题目图片 OCR |
| POST | `/api/ocr/reference-answer` | 🆕 参考答案图片 OCR |

### 看板 & 分析
| GET | `/api/dashboard/teacher\|student` | 看板统计 |
| GET | `/api/dashboard/knowledge-graph/{subject}` | 知识树 |
| GET | `/api/dashboard/student/{name}/diagnosis` | 根因诊断 |
| GET | `/api/dashboard/teacher-style/{name}` | 风格报告 |
| GET | `/api/dashboard/class-overview\|knowledge-heatmap\|trends` | 班级分析 |

### 错题本 & 报告
| GET/POST | `/api/error-book[/{id}/review\|similar-question\|sync\|stats]` | 错题本 |
| GET | `/api/reports/student/{name}` | PDF 报告 |

---

## 5. 核心设计决策

### extract_json — 括号计数状态机
正则无法处理嵌套 JSON。改用字符级遍历 + 深度计数 + 字符串追踪 + 转义处理：
- 自动剥离 markdown 代码围栏
- 跟踪 `in_string` 跳过字符串内花括号
- 跟踪 `escape` 跳过 `\"` / `\\`
- 失败时从下一个 `{` 重试（容忍前面有集合符号）
- 自动修复 AI 常见的尾部逗号 `{"a": 1,}`

### KaTeX 数学渲染
`MathRenderer` 组件用正则匹配 `$...$`（行内）和 `$$...$$`（块级），将公式交给 KaTeX 渲染为 HTML。接入 `CleanContent` → 题目内容、学生答案、AI 反馈、错题本统一获得数学渲染。

### CleanContent — 内容清洗层
所有用户可见文本在渲染前经过 CleanContent：
1. 检测 raw JSON wrapper（OCR 失败残留）→ 提取真实内容
2. 交给 MathRenderer 渲染 LaTeX 公式
3. 普通文本原样输出

### Glass Morphism 设计
- 玻璃态卡片：`rgba(255,255,255,0.78)` + `backdrop-filter: blur(20px)` + 半透明边框
- TiltCard：`useMotionValue` 追踪鼠标位置 → `useTransform` 计算 3D 旋转角
- CountUp：`requestAnimationFrame` + easeOutCubic 缓动，数字从 0 递增

### 参考答案锚定 + 条件判分
`grader.py:16-23` 在批改入口检查 `reference_answer`，为空则直接短路返回，不调用 AI。确保所有批改都有参考答案作为比较基准，消除 AI 臆断。
- `build_grading_prompt()` 根据 `max_points` 动态生成指令：>0 时给分值范围，<=0 时告诉 AI 不评分
- AI 返回后 score 二次校验：`max_points > 0 else 0`
- 无分值 feedback 前加 `[未计分]` 前缀

### 异步并行
- OCR 并行：`asyncio.gather(*ocr_tasks)`
- 逐题批改并行：`asyncio.gather(*grade_tasks)`
- 批量提交并行：`asyncio.gather(*sub_tasks)`
- N×30s 串行 → ~30s 总耗时

---

## 6. 启动

```bash
pip install -r backend/requirements.txt
cd frontend && npm install
cd frontend && npm run dev   # :5173 + :8000
```

> **文档版本：** v0.2.2 | **更新日期：** 2026-05-26
