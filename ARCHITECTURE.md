# AI 作业批改系统 — 架构文档

> **当前阶段：MVP v0.1.0**  
> 前端采用纯内联 CSS-in-JS 极简设计，无 Tailwind/MUI 等 UI 框架依赖。动效使用 Framer Motion 轻量声明式动画。后端 FastAPI + SQLite 单文件数据库。整体设计遵循"功能完整、依赖最简"的 MVP 原则。

## 1. 项目结构

```
AI_Homeworkgrading/
├── .env                              # 环境变量（DashScope API Key）
├── PRD.md                            # 产品需求文档
├── ARCHITECTURE.md                   # 本文件
├── frontend/
│   └── src/
│       ├── main.tsx                  # React 入口
│       ├── App.tsx                   # 路由定义（12 条路由）
│       ├── theme.ts                  # 设计 Token（颜色/圆角/阴影/动画关键帧）
│       ├── index.css                 # 全局 CSS + @keyframes + 滚动条
│       ├── types/index.ts            # TS 类型定义
│       ├── api/client.ts             # HTTP API 封装
│       ├── motion/index.tsx          # Framer Motion 动画组件（7 个）
│       ├── components/               # 5 个可复用组件
│       │   ├── ConfidenceBadge.tsx    # 置信度徽章（绿黄红三色+光晕）
│       │   ├── SocraticFeedback.tsx   # 苏格拉底反馈（Lv0→Lv1→Lv2 三级展开）
│       │   ├── GradingResult.tsx      # 单题批改结果卡片
│       │   ├── ImageUploader.tsx      # 图片上传/预览
│       │   └── MarkdownRenderer.tsx   # Markdown 渲染
│       └── pages/
│           ├── Home.tsx              # 首页（教师/学生角色卡片）
│           ├── teacher/
│           │   ├── Dashboard.tsx      # 看板（5 个可点击卡片，stagger 入场）
│           │   ├── AssignmentList.tsx  # 作业列表
│           │   ├── AssignmentCreate.tsx # 创建作业（动态题目编辑器）
│           │   ├── AssignmentDetail.tsx # 作业详情 + 批量批改按钮
│           │   ├── SubmissionReview.tsx # 逐题复核（stagger 卡片）
│           │   └── ReviewQueue.tsx     # 待复核队列
│           └── student/
│               ├── Dashboard.tsx      # 学生看板（姓名输入 + 统计）
│               ├── AssignmentList.tsx  # 我的作业（状态标签）
│               ├── SubmitPage.tsx      # 逐题作答 + 逐题拍照
│               ├── ResultPage.tsx      # 批改结果（分数环 + 等待状态）
│               └── CorrectPage.tsx     # 错题订正
└── backend/
    ├── requirements.txt              # Python 依赖
    ├── config.py                     # 从 .env 加载配置
    ├── database.py                   # SQLite schema + init + 自动迁移
    ├── models.py                     # 15 个 Pydantic 模型
    ├── main.py                       # FastAPI 入口
    ├── routers/
    │   ├── assignments.py            # 作业 CRUD（5 个端点）
    │   ├── submissions.py            # 提交管理（3 个端点，逐题图片支持）
    │   ├── grading.py                # 批改引擎（5 个端点，含批量批改）
    │   └── dashboard.py              # 仪表盘（3 个端点，含待复核队列）
    ├── services/
    │   ├── ai_client.py              # OpenAI SDK 封装（连接 DashScope）
    │   ├── ocr.py                    # OCR 服务（图片→文本）
    │   ├── grader.py                 # 批改引擎（规则+AI 分流）
    │   └── feedback.py              # 苏格拉底反馈生成
    ├── prompts/
    │   ├── ocr.py                    # OCR 提示词
    │   ├── grading.py                # 批改提示词 + prompt 构建器
    │   └── feedback.py              # 反馈提示词 + prompt 构建器
    ├── uploads/                      # 本地图片存储
    └── data/                         # SQLite 数据库
```

---

## 2. 端到端数据流

### 主流程

```
Frontend                              Backend
───────                               ───────
教师创建作业 ─────────────────► POST /api/assignments → INSERT assignments + questions
学生逐题作答+拍照 ─────────────► POST /api/submissions → 保存图片 + INSERT answers
教师触发批改 ─────────────────► POST /api/submissions/:id/grade
                                   ├─ OCR（逐题图片）→ UPDATE answers
                                   ├─ 规则引擎（客观题）→ 本地比对
                                   └─ AI 批改（主观题）→ DashScope API
                                   → UPDATE answers (is_correct/confidence/feedback/score)
学生查看结果 ◄──────────────── GET /api/submissions/:id → GradingResult + SocraticFeedback
学生订正错题 ─────────────────► POST /api/submissions/:id/correct → 重新批改
教师复核纠偏 ─────────────────► PUT /api/answers/:id/override → teacher_override=1
```

### 批量批改流程

```
教师点击"批量 AI 批改(N 份)" → POST /api/assignments/:id/grade-all
  → 遍历所有 status='submitted' 的提交
  → 逐个调用 _grade_one() → OCR + 规则/AI 批改
  → 返回 {total, graded}
```

---

## 3. 数据库 Schema

引擎：SQLite（WAL 模式，外键强制开启）

### ER 关系

```
assignments  1 ──< N  questions
     │
     └──< N  submissions  1 ──< N  answers  >── 1  questions
```

### 表结构

**assignments** — id, title, subject, description, teacher_name, class_name, due_date, status, created_at

**questions** — id, assignment_id(FK), type, content, reference_answer, rubric, points, sort_order

**submissions** — id, assignment_id(FK), student_name, status, image_url, submitted_at

**answers** — id, submission_id(FK), question_id(FK), student_answer, is_correct, ai_confidence, ai_feedback, score, teacher_override, teacher_comment, image_url

### 状态机

```
作业:  draft → published → closed
提交:  submitted → grading → graded → reviewed
                       ↑          │
                       └── corrected ←┘ (订正后重新批改)
```

---

## 4. API 端点总览

Base: `http://localhost:8000`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/assignments` | 创建作业（含题目列表） |
| GET | `/api/assignments` | 作业列表 |
| GET | `/api/assignments/{id}` | 作业详情+题目 |
| DELETE | `/api/assignments/{id}` | 删除作业 |
| POST | `/api/assignments/{id}/grade-all` | **批量 AI 批改** |
| POST | `/api/submissions` | 提交作业（multipart，逐题图片） |
| GET | `/api/submissions` | 提交列表 |
| GET | `/api/submissions/{id}` | 提交详情+答案+题目 |
| POST | `/api/submissions/{id}/grade` | 触发 AI 批改 |
| PUT | `/api/answers/{id}/override` | 教师覆写判分 |
| POST | `/api/submissions/{id}/correct` | 学生订正+重新批改 |
| GET | `/api/dashboard/teacher` | 教师看板统计 |
| GET | `/api/dashboard/student` | 学生看板统计 |
| GET | `/api/dashboard/review-queue` | **待复核队列** |
| POST | `/api/ocr/test` | OCR 服务状态 |

---

## 5. AI 服务层

### 调用链

```
trigger_grading()
  │
  ├─► ocr_image(path) → chat_with_image() → DashScope (qwen3.6-flash)
  │    返回 {题号: 答案文本}
  │
  └─► grade_submission(type, content, ref, rubric, answer, pts)
        ├─ choice / true_false → 规则引擎（本地字符串比对）
        ├─ fill_blank → 精确匹配优先 → 失败则 AI
        └─ short_answer / essay → chat() → DashScope
```

### Prompt 体系

| 模板 | 用途 | 文件 |
|------|------|------|
| OCR_SYSTEM_PROMPT | 识别手写/印刷文字+公式 | prompts/ocr.py |
| GRADING_SYSTEM_PROMPT | K12 批改助手，输出 JSON | prompts/grading.py |
| FEEDBACK_SYSTEM_PROMPT | 苏格拉底导师，引导不直接给答案 | prompts/feedback.py |

---

## 6. 前端路由与页面

| 路由 | 组件 | 说明 |
|------|------|------|
| `/` | Home | 角色选择（教师/学生卡片+stagger动画） |
| `/teacher/dashboard` | TeacherDashboard | 5个可点击交互卡片+stagger入场 |
| `/teacher/assignments` | AssignmentList | 作业列表（状态标签） |
| `/teacher/assignments/new` | AssignmentCreate | 动态题目编辑器 |
| `/teacher/assignments/:id` | AssignmentDetail | 作业详情+批量批改按钮 |
| `/teacher/submissions/:id` | SubmissionReview | 逐题复核（stagger卡片） |
| `/teacher/review-queue` | ReviewQueue | 待复核队列 |
| `/student/dashboard` | StudentDashboard | 姓名输入+统计 |
| `/student/assignments` | StudentAssignments | 我的作业+状态标签 |
| `/student/assignments/:id` | SubmitPage | 逐题作答+逐题拍照 |
| `/student/submissions/:id` | ResultPage | 分数环+逐题反馈 |
| `/student/submissions/:id/correct` | CorrectPage | 错题订正（仅错题） |

---

## 7. MVP 设计决策

### 7.1 极简设计原则

- **纯内联 CSS-in-JS**：所有样式写在组件内 `style={{}}`，无 Tailwind/SCSS/CSS Modules
- **零 UI 框架**：无 MUI/Ant Design/shadcn，全部手写组件
- **轻量动效**：仅引入 Framer Motion（~140KB gzip），用于页面入场 stagger、hover 反馈、按钮 tap
- **设计 Token**：`theme.ts` 集中管理颜色/圆角/阴影，全局一致
- **中文优先**：字体栈 `PingFang SC → Microsoft YaHei → Hiragino Sans GB`

### 7.2 置信度三级分流

| 区间 | 颜色 | 处理 |
|------|------|------|
| > 0.9 | 绿 | 自动通过 |
| 0.7-0.9 | 黄 | 建议复核 |
| < 0.7 | 红 | 强制复核，进入待复核队列 |

### 7.3 规则引擎 vs AI 分流

- 客观题（choice/true_false）：纯规则匹配，零 API 调用
- 填空题（fill_blank）：精确匹配优先 → AI 兜底
- 主观题（short_answer/essay）：AI 综合评价

### 7.4 苏格拉底反馈三级展开

```
Lv0: "先自己想想错在哪里？" → [💡 给我一点提示]
Lv1: 展示 AI 引导性反馈      → [📖 展开完整解析]
Lv2: 完整反馈 + 🌱 鼓励语
```

### 7.5 无认证 MVP 身份

- 教师：无需登录，首页选择入口直接进入
- 学生：输入姓名 → localStorage → 后续操作以此标识
- 后续迭代计划：完整用户认证系统

### 7.6 技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| 前端框架 | React 18 + TS + Vite | 类型安全、快速 HMR |
| 样式 | 内联 CSS-in-JS | 零额外依赖，MVP 快速迭代 |
| 动效 | Framer Motion | 轻量声明式动画 |
| 路由 | react-router-dom v7 | 标准方案 |
| 后端 | FastAPI + Pydantic v2 | 自动校验、OpenAPI 文档 |
| 数据库 | SQLite (WAL) | 零配置、单文件部署 |
| AI SDK | openai (官方) | 兼容 DashScope OpenAI API |
| AI 模型 | **qwen3.6-flash** | 成本低、速度快、支持多模态 |

---

## 8. 启动方式

```bash
cd frontend
npm run dev    # concurrently 启动前端(:5173) + 后端(:8000)
```

单命令启动，`Ctrl+C` 停止。

---

> **文档版本：** v0.1.0-MVP | **更新日期：** 2026-05-08
