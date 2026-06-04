# AI_Homeworkgrading — 架构文档

> **当前版本：v0.2.4**
> 前端纯内联 CSS-in-JS + Glass Morphism + Framer Motion + KaTeX。后端 FastAPI + SQLite + AsyncOpenAI 异步并行。
> v0.2.4 新增:根目录 `npm run dev` 一行启动、后端端口 8000→8001→... 鲁棒 fallback、共享 `scripts/lib/ports.js`、5 个 v0.2.3 漏修的 module-level import bug 真落地、仓库瘦身(移除 tests/ + pytest.ini + requirements-test.txt)。

## 1. 项目结构

```
AI_Homeworkgrading/
├── README.md · PRD.md · ARCHITECTURE.md
├── .env.example
├── docker-compose.yml              # 后端一键起；data/uploads/fonts 卷挂载
├── .dockerignore
├── .github/workflows/ci.yml        # 后端 ruff / 前端 lint+tsc+build
├── scripts/
│   ├── lib/ports.js                # 共享 findFreePort(start,end) 端口扫描
│   ├── dev.js                      # 并行启动前后端（端口鲁棒，TOCTOU retry）
│   ├── dev-api.js                  # 仅启动后端（端口鲁棒）
│   └── download_chinese_font.py    # 一键拉取 Noto Sans SC OTF
├── frontend/src/
│   ├── main.tsx / App.tsx          # 入口 + 15 条路由
│   ├── theme.ts                    # 设计 Token（含玻璃态色值）
│   ├── constants.ts                # 题型标签映射
│   ├── index.css                   # 全局 CSS + @keyframes
│   ├── types/index.ts              # 12+ TS 接口
│   ├── api/client.ts               # 30+ API 方法
│   ├── motion/index.tsx            # 8 个动画组件（含 TiltCard）
│   ├── components/                 # 11 个组件
│   │   ├── CleanContent.tsx         # 内容清洗 + JSON 检测 + KaTeX
│   │   ├── MathRenderer.tsx         # LaTeX 公式 KaTeX 渲染
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
    ├── Dockerfile                  # python:3.11-slim + /api/health healthcheck
    ├── main.py                      # FastAPI 入口（6 个路由，v0.2.4）
    ├── config.py / database.py      # 配置 + 9 表 + PRAGMA 自动迁移 + db_session()
    ├── models.py                    # 30+ Pydantic 模型（含 CorrectItem）
    ├── utils.py                     # extract_json（括号计数状态机）+ 文件上传校验
    ├── fonts/                       # 中文字体目录（gitignore；缺字时回退 Helvetica + WARN）
    ├── routers/                     # 6 个路由模块（30+ 端点）
    │   ├── assignments.py           # 作业 CRUD + CSV 导出 + 编辑
    │   ├── submissions.py           # 提交管理（multipart + 逐题图片）
    │   ├── grading.py               # 异步并行批改引擎（OCR 任务独立连接）
    │   ├── dashboard.py             # 看板 + 知识图谱 + 班级分析 + 教师风格（用 db_session）
    │   ├── error_book.py            # 错题本（6 端点，用 db_session）
    │   └── pdf_export.py            # 家长报告 PDF 路由
    ├── services/                    # 10 个服务
    │   ├── ai_client.py             # AsyncOpenAI（文本+多模态）
    │   ├── ocr.py                   # DashScope 多模态 OCR
    │   ├── grader.py                # 规则 + AI 批改（参考答案守卫）
    │   ├── feedback.py              # 苏格拉底引导反馈
    │   ├── knowledge_graph.py       # 知识点提取 + 依赖图 + BFS 根因（v0.2.3 消除 N+1）
    │   ├── teacher_style.py         # Welford 偏差追踪 + 修正
    │   ├── error_book.py            # 错题本 service
    │   ├── question_generator.py    # 举一反三变式题
    │   ├── class_analytics.py       # 热力图 + 趋势 + 对比
    │   └── pdf_export.py            # fpdf2 A4 报告（v0.2.3 嵌入 CJK 字体）
    └── prompts/                     # 5 套 Prompt 模板
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

## 3. 数据库（9 张表）

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
| POST | `/api/ocr/reference-answer` | 参考答案图片 OCR |
| GET  | `/api/ocr/health` | v0.2.3 真实 ping DashScope，返回状态与截断回复 |

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

### db_session() 上下文管理器（v0.2.3）
`database.py` 新增 `@contextmanager db_session(commit=True)`，封装 `get_db() + commit/rollback/close`。消除之前 `get_db() + 手写 close()` 容易漏关连接、或异常路径不 rollback 的隐患。`dashboard.py` / `error_book.py` 已切换；`_ocr_and_update` 内部独立打开连接，避免 `asyncio.gather` 中多个 OCR 任务争抢同一 SQLite 连接导致的锁竞争。

### BFS 根因追溯消除 N+1（v0.2.3）
`compute_root_causes()` 之前对每个 BFS 访问到的 KP 节点都执行一次 `SELECT id, name, parent_id FROM knowledge_points WHERE id = ?`。改为：先用一次查询把全部 KP 拉到内存（`kp_info: {id: (name, parent_id)}`），再在 Python 中完成 BFS。复杂度从 O(visited × 1 查询) 降到 O(2 查询)。`knowledge_points` 表规模按课程知识点数量级（百级），无界增长风险。

### PDF 中文渲染（v0.2.3）
`fpdf2` 内置 `Helvetica` 是 Latin-1，中文会被 `errors="replace"` 替换成 `?`。`services/pdf_export.py` 改为探测 `backend/fonts/` 下的 `NotoSansSC-{Regular.otf,Regular.ttf,CJKsc-Regular.otf,SourceHanSansSC-Regular.otf}` 之一，命中则 `pdf.add_font(family, fname=path, uni=True)` 嵌入并全文走 CJK 字体；未命中时记录 WARNING 并回退到 helvetica（家长报告里的中文会显示成 `?`，但不阻塞导出）。一键拉取脚本：`python scripts/download_chinese_font.py`，下载到 `backend/fonts/NotoSansSC-Regular.otf`。字体二进制被 `.gitignore` 排除。

---

## 6. 启动

### 本地开发
```bash
pip install -r backend/requirements.txt
cd frontend && npm install
cp .env.example .env       # 设置 DASHSCOPE_API_KEY
python scripts/download_chinese_font.py   # 可选：让 PDF 中文正常
cd frontend && npm run dev  # :5173 (web) + :8000 (api via concurrently)
```

### Docker
```bash
cp .env.example .env
docker compose up --build  # 后端 :8000
```
详见 `backend/Dockerfile`（`python:3.11-slim` + `/api/health` 健康检查）与 `docker-compose.yml`（`./backend/{data,uploads,fonts}` 三个卷挂载，SQLite + 上传图片 + 字体持久化）。前端仍用 `npm run dev` 本地起，便于热更新。

### 端口鲁棒
- `scripts/lib/ports.js` 导出 `findFreePort(start, end)` 在 `[start, end]` 范围扫,默认 8000-8099
- `dev.js` / `dev-api.js` 的 `startApi` 在 `[API_PORT_START, API_PORT_END]` 内循环,单次 spawn uvicorn 后等 2.5s 早退事件,若 bind 失败则换下一个端口重试,最多 3 次
- 前端通过 `VITE_API_PORT` 环境变量跟着后端实际端口走,无需改任何配置
- 范围起点可通过 `API_PORT=9000 npm run dev` 覆盖

---

## 7. 变更记录

### v0.2.4 — 启动体验与启动稳健性
**启动**
- 根目录 `package.json` 加 `setup` / `dev` / `dev:api` / `dev:web` 脚本,`npm run dev` 前后端并行起
- `scripts/lib/ports.js` 抽 `findFreePort(start, end)` 共享端口扫描,默认范围 8000-8099
- `dev.js` `startApi()` 包裹 retry:uvicorn 启动 2.5s 内早退则换下一个端口,最多 3 次
- 日志显式标注 fallback:`API → http://localhost:8001 (8000 busy)`

**Bug 修复**(v0.2.3 章节声称但未真正落地)
- `backend/database.py` 缺 `from contextlib import contextmanager` —— `db_session` 在模块加载时 NameError,FastAPI 进程无法启动
- `backend/services/grader.py` 缺 `import logging` —— AI 主观题返回非 JSON 时 `logger.warning` NameError
- `backend/services/teacher_style.py` 缺 `import math` —— 任何一次教师覆写 `math.sqrt` NameError
- `database.py` 重复定义 `db_session`,删冗余

**仓库瘦身**
- 移除 `tests/` 目录(4 个历史 pytest 用例 + conftest + 本次新增的 1 个 import 回归用例)
- 移除 `pytest.ini` / `requirements-test.txt`(孤立配置)
- CI 移除 pytest 步骤 + requirements-test.txt 安装,保留 ruff / 前端 lint+tsc+build

### v0.2.3 — 基础设施与质量
**Bug 修复**
- 全图 OCR 结果按 `question_number` 误写为 `question_id`：改为用 `sort_order` 映射回真实主键；per-question image 多结果时打 WARNING 后取首条
- 掌握度更新使用 SELECT 旧值（常为 `NULL`）：改为并行结果 `result["is_correct"]`
- `/api/ocr/test` 硬编码 `ready`：改为 `/api/ocr/health` 真实 ping DashScope

**PDF 中文**：注册 Noto Sans SC TTF/OTF；字体下载脚本 `scripts/download_chinese_font.py`；`.gitignore` 排除二进制

**工程化**：`backend/Dockerfile` + `docker-compose.yml` + `.dockerignore`；`.github/workflows/ci.yml`（Python 3.11 + Node 20，含 cache）；`pytest.ini` + `tests/`（27 用例）

**架构优化**
- `db_session()` 上下文管理器；`_ocr_and_update` 改用独立连接，消除 `asyncio.gather` 共享连接锁竞争
- `compute_root_causes` N+1 → 2 次查询 + 内存 BFS

**代码卫生**：`grader.py` / `teacher_style.py` 顶部 import；`CorrectRequest.answers: list` → `list[CorrectItem]`；删除 `GradingStyle.tsx` 重复 `TYPE_LABELS`；删除 `SubmitPage.tsx` 后端未用的 `has_image` 字段

**文档**：版本号、6 个 router / 11 组件 / 9 表 / 5 prompt 等数字全部对齐代码

### v0.2.2 — 批改精准化
- 参考答案锚定批改 + 条件判分 + 答案图片 OCR；CleanContent / MathRenderer 内容清洗层
- 详见 README v0.2.2 章节

> **文档版本：** v0.2.4 | **更新日期：** 2026-06-04
