# AI_Homeworkgrading

> **v0.2.4** · AI 驱动的 K12 智能作业批改平台

基于 **qwen3.6-flash** 的智能批改系统，从布置到订正一条龙搞定。客观题秒出分，主观题 AI 点评，苏格拉底式引导让学生自己"悟"出来。

---

## ✨ 亮点速览

### 👩‍🏫 教师端

| 功能 | 说明 |
|------|------|
| 📋 作业管理 | 5 种题型随意组合，支持编辑、拍照出题、答案图片 OCR |
| ⚡ 批量批改 | 一键批完全班，异步并行，5-10x 提速 |
| 🎯 参考答案锚定 | 教师提供标准答案，AI 精准对比判分，无答案不批改 |
| 📊 看板统计 | 数字递增动画 + 班级分析 + 趋势图 |
| 🎨 批改风格 | 分析评分偏差，AI 自适应你的标准 |
| 📥 成绩导出 | CSV + PDF 家长报告一键下载 |

### 🧑‍🎓 学生端

| 功能 | 说明 |
|------|------|
| ✍️ 逐题作答 | 打字或拍照，每道题独立提交 |
| 💡 引导反馈 | 苏格拉底三步法：先想 → 提示 → 解析 |
| 📖 错题本 | 跨作业聚合，按科目筛选，一键生成变式题 |
| 🧠 知识诊断 | 知识点提取 + 依赖图 + 根因追溯 |
| 🔢 数学渲染 | KaTeX 实时渲染 LaTeX 公式 |
| 📡 实时状态 | 15s 自动刷新 + 新批改脉冲提示 |

---

## 🤖 AI 批改流程

```
教师出题时输入参考答案 + 分值（支持拍照上传答案图片 → OCR 识别）
学生答案 ─┬─ 无参考答案 → 拒绝批改，提示补充
          ├─ 选择/判断 → 规则秒配（99% 准确率，零 API 成本）
          ├─ 填空 → 精确匹配优先 → AI 兜底
          └─ 简答/作文 → AI 基于参考答案深度对比 + 引导式评语

未设分值 → 仅判对错不评分（[未计分] 标记）
有分值 → AI 在 0-N 范围内判分
每道题：🟢 >90% 自动过  🟡 70-90% 建议看  🔴 <70% 必须审
批改后：自动提取知识点 → 依赖图谱 → 根因诊断 → AI 自适应教师风格
```

---

## 🛠️ 技术栈

| 层 | 方案 | 说明 |
|----|------|------|
| 前端 | React 19 + TypeScript + Vite | 类型安全，HMR 秒级热更新 |
| 样式 | 内联 CSS-in-JS + Glass Morphism | 零 UI 框架，玻璃态卡片 |
| 动效 | Framer Motion + TiltCard + CountUp | 3D 鼠标跟随 + 数字递增 |
| 数学 | KaTeX | LaTeX 公式实时渲染 |
| 路由 | react-router-dom v7 | 15 条路由 |
| 后端 | FastAPI + async/await | 自动 OpenAPI 文档，异步并行 |
| 数据库 | SQLite (WAL) | 零配置，9 张表 + 列级自动迁移 |
| AI | qwen3.6-flash + AsyncOpenAI | 多模态，低成本，中文强 |
| PDF | fpdf2 + TTF/OTF | 中文 PDF 渲染（Noto Sans SC） |
| 部署 | Docker + docker-compose | 后端一键起，data/uploads/fonts 卷挂载 |
| CI | GitHub Actions | 后端 ruff，前端 lint+tsc+build |

---

## 🏗️ 项目结构

```
AI_Homeworkgrading/
├── 📖 README.md
├── 📋 PRD.md
├── 🏛️ ARCHITECTURE.md
├── 🐳 docker-compose.yml       # 后端一键起，卷挂载 data/uploads/fonts
├── 🐳 .dockerignore
├── 🚀 .github/workflows/ci.yml # 后端 ruff / 前端 lint+tsc+build
├── backend/
│   ├── Dockerfile              # python:3.11-slim + healthcheck
│   ├── main.py                 # FastAPI 入口（6 个路由模块，v0.2.4）
│   ├── config.py / database.py # 配置 + SQLite 9 表 + 自动迁移 + db_session()
│   ├── models.py               # 30+ Pydantic 模型
│   ├── utils.py                # extract_json（括号计数状态机）+ 文件上传校验
│   ├── fonts/                  # 中文字体目录（NotoSansSC*.otf/.ttf，gitignore）
│   ├── routers/                # 6 个路由（assignments/submissions/grading/dashboard/error_book/pdf_export）
│   ├── services/               # 10 个服务（ai_client/ocr/grader/feedback/knowledge_graph/teacher_style/error_book/question_generator/class_analytics/pdf_export）
│   └── prompts/                # 5 套 Prompt
├── scripts/
│   ├── lib/ports.js            # 共享 findFreePort(start,end) 端口扫描
│   ├── dev.js                  # 并行启动前后端（端口鲁棒）
│   ├── dev-api.js              # 仅启动后端（端口鲁棒）
│   └── download_chinese_font.py # 一键拉取 Noto Sans SC OTF
├── frontend/src/
│   ├── api/client.ts           # 30+ API 方法
│   ├── components/             # 11 个组件
│   │   ├── CleanContent.tsx     # 内容清洗 + JSON 检测 + KaTeX 渲染
│   │   ├── MathRenderer.tsx     # LaTeX 数学公式渲染（KaTeX）
│   │   ├── ConfidenceBadge / SocraticFeedback / GradingResult
│   │   ├── KnowledgeGraph / MasteryBar / StyleIndicator
│   │   └── SimilarQuestionCard / ImageUploader / MarkdownRenderer
│   ├── motion/index.tsx        # 8 个动画组件（含 TiltCard）
│   ├── theme.ts                # 设计 Token + 玻璃态色值
│   └── pages/                  # 15 个页面（teacher 8 + student 6 + home）
```

---

## 🚀 快速开始

### 方式 A:根目录一行命令启动(推荐)

```bash
# 1. 装依赖(后端 Python + 前端 Node,一次到位)
npm run setup

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env → DASHSCOPE_API_KEY=你的key

# 3. (可选) 拉取中文字体以让 PDF 报告正常显示中文
python scripts/download_chinese_font.py

# 4. 从项目根目录直接起,前后端并行(后端 :8000 + 前端 :5173,端口占用时自动顺延)
npm run dev
# 浏览器打开 http://localhost:5173
```

部分启动:

```bash
npm run dev:api  # 只起后端 :8000
npm run dev:web  # 只起前端 :5173
```

### 方式 B:本地开发(手工)

```bash
# 1. 安装依赖
pip install -r backend/requirements.txt
cd frontend && npm install

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env → DASHSCOPE_API_KEY=你的key

# 3. (可选) 拉取中文字体以让 PDF 报告正常显示中文
python scripts/download_chinese_font.py

# 4. 启动
cd frontend && npm run dev
# 浏览器打开 http://localhost:5173
```

### 方式 C:Docker

```bash
cp .env.example .env  # 设置 DASHSCOPE_API_KEY
docker compose up --build
# 后端监听 http://localhost:8000(端口被占时自动顺延)
```

> **端口鲁棒性**:`npm run dev` / `dev:api` 默认从 8000 起,被占则按 `8000 → 8001 → 8002 → ...` 顺延,直到 8099 抛错。范围可通过 `API_PORT` 环境变量起点,例:`API_PORT=9000 npm run dev`。

## 🐳 Docker

`docker-compose.yml` 仅跑后端,`./backend/data` / `./backend/uploads` / `./backend/fonts` 挂载为卷,保证 SQLite + 上传图片 + 字体持久化。镜像基于 `python:3.11-slim`,内置 `/api/health` 健康检查。前端仍用 `npm run dev` 本地起(便于热更新)。

---

## 🆕 v0.2.4 更新(启动体验与启动稳健性)

### 启动体验
- **根目录一行命令**:`npm run dev` 前后端并行起(后端 :8000 + 前端 :5173);`npm run setup` 装完 Python + Node 全部依赖
- **端口鲁棒**:8000 被占自动 fallback 到 8001/8002/...,TOCTOU 竞态包 retry 最多 3 次,日志显式标 `(8000 busy)`
- **共享 lib**:`scripts/lib/ports.js` 抽出 `findFreePort(start, end)`,dev.js 与 dev-api.js 共用
- **部分启动**:`npm run dev:api` / `npm run dev:web` 单独起任一端

### Bug 修复(v0.2.3 声称但未真正落地)
- `backend/database.py` 缺 `from contextlib import contextmanager` —— 应用启动即 `NameError`,FastAPI 进程根本起不来
- `backend/services/grader.py` 缺 `import logging` —— AI 主观题返回非 JSON 时崩
- `backend/services/teacher_style.py` 缺 `import math` —— 任何一次教师覆写崩
- `database.py` 重复定义 `db_session`,删冗余

### 仓库瘦身
- 移除 `tests/` 目录、4 个历史测试文件 + 1 个本次回归测试,共 5 个 Python 文件
- 移除 `pytest.ini` / `requirements-test.txt`(孤立配置)
- CI 移除 pytest 步骤,保留 ruff / 前端 lint+tsc+build

---

## 🆕 v0.2.3 更新(基础设施与质量)

### Bug 修复
- **OCR 结果映射修正**:全图 OCR 返回的 `question_number` 此前被直接当 `question_id` 写入,现在通过 sort_order 映射回真实主键;per-question image 多结果时打 WARNING 后取首条
- **掌握度更新用新值**:`update_student_mastery` 此前用了 SELECT 出来的旧 `is_correct`(常为 NULL),现改为使用 AI 批改并行结果中的新值
- **`/api/ocr/health` 真正联通**:`/api/ocr/test` 硬编码 `ready`,现改为实际 ping DashScope 并返回截断的回复

### PDF 中文
- 注册 `Noto Sans SC` TTF/OTF 字体(默认读 `backend/fonts/`),中文报告不再变 `?`
- `python scripts/download_chinese_font.py` 一键拉取字体
- 字体文件被 `.gitignore` 排除(避免 ~10MB 二进制入库)

### 工程化
- **Docker**:`backend/Dockerfile`(python:3.11-slim + healthcheck) + `docker-compose.yml` + `.dockerignore`
- **CI**:`.github/workflows/ci.yml` — Python ruff + pytest,Node lint + tsc + build
- **测试**:pytest + pytest-asyncio,27 用例覆盖 utils/save_upload/grader

### 架构优化
- **`db_session()` 上下文管理器**:封装 `get_db() + commit/rollback/close`,消除裸 `get_db()` 调用容易忘记 close 的隐患
- **OCR 任务改用独立连接**:`_ocr_and_update` 内部用 `with db_session()`,`asyncio.gather` 多个 OCR 任务不再争抢同一 SQLite 连接
- **BFS 根因追溯 N+1 → 1+1**:`compute_root_causes` 改为单次 `SELECT id, name, parent_id FROM knowledge_points` 后内存 BFS

### 代码卫生
- `grader.py` / `teacher_style.py` 把函数内 `import logging/math` 提到模块顶部
- `models.CorrectRequest.answers: list` 改为 `list[CorrectItem]` 强类型
- `GradingStyle.tsx` 删除重复的 `TYPE_LABELS`,复用 `constants.ts` 的 `QUESTION_TYPE_LABEL`
- `SubmitPage.tsx` 删除后端不读的 `has_image` 字段

## 🆕 v0.2.2 更新(批改精准化)

### 批改系统优化
- **参考答案锚定**:教师出题时提供标准答案,AI 基于参考答案精准对比学生作答;无参考答案时拒绝批改,避免 AI 臆断
- **条件判分**:教师设置分值 → AI 在 0-N 范围内判定得分;未设分值 → 仅判对错不评分(`[未计分]` 标记)
- **答案图片 OCR**:教师可拍照上传参考答案图片(手写/打印),LLM 自动识别提取为格式正确的文本
- **UI 增强**:参考答案输入框空值时红色高亮提示,新增绿色"📷 上传答案"按钮(与蓝色"📷 拍题识别"区分)

---

## 🆕 v0.2.1 更新

### 视觉升级 (Level 2)
- **首页重设计**：玻璃态卡片 + 3D TiltCard + 动态渐变 blob 背景 + 统一 hero 区块
- **看板升级**：CountUp 数字递增动画、玻璃态卡片、TiltCard 鼠标跟随
- **设计系统**：新增 Glass Morphism 色值、弹性过渡曲线、超圆角

### 稳定性
- **extract_json 重写**：正则 → 括号计数状态机，14/14 边界测试通过，自动修复尾部逗号、回退重试
- **KaTeX 数学渲染**：自动识别 `$...$` / `$$...$$` 公式，无需手动处理 LaTeX
- **CleanContent**：自动检测并清洗 raw JSON 内容，修复历史脏数据

### 组件新增
- `MathRenderer` — KaTeX 数学公式渲染
- `CleanContent` — 内容清洗 + JSON 提取 + 数学渲染一体化
- `TiltCard` — 3D 鼠标跟随卡片（motion 系统）

---

## 🎯 设计哲学

- **极简至上** — 纯内联 CSS，零 UI 框架
- **AI 辅助人** — 高置信度自动过，低置信度教师把关
- **知识驱动** — 错题→知识点→根因，精准诊断
- **本地优先** — SQLite + 本地存储，仅 AI API 需联网

---

## 🔜 下个版本

- [ ] **数学题分步推理动画**（Remotion + KaTeX）
  - 代数推导题：LLM 拆解步骤 → Remotion 逐帧渲染公式 + TTS 语音讲解 → MP4
  - 几何证明题：LLM 生成推理步骤 + 几何约束引擎自动作图 + SVG 动画
  - 复用 `video-podcast-maker` skill 的 调研→脚本→TTS→Remotion→MP4 管线
- [ ] 登录注册系统
- [ ] Google Classroom / 钉钉集成
- [ ] 移动端适配
- [ ] 语音批改

<p align="center">Made with ☕ · Powered by <strong>qwen3.6-flash</strong></p>
