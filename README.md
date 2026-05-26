# AI_Homeworkgrading

> **v0.2.2** · AI 驱动的 K12 智能作业批改平台

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
| 前端 | React 18 + TypeScript + Vite | 类型安全，HMR 秒级热更新 |
| 样式 | 内联 CSS-in-JS + Glass Morphism | 零 UI 框架，玻璃态卡片 |
| 动效 | Framer Motion + TiltCard + CountUp | 3D 鼠标跟随 + 数字递增 |
| 数学 | KaTeX | LaTeX 公式实时渲染 |
| 路由 | react-router-dom v7 | 15 条路由 |
| 后端 | FastAPI + async/await | 自动 OpenAPI 文档，异步并行 |
| 数据库 | SQLite (WAL) | 零配置，8 张表 |
| AI | qwen3.6-flash + AsyncOpenAI | 多模态，低成本，中文强 |
| PDF | fpdf2 | 纯 Python ~200KB |

---

## 🏗️ 项目结构

```
AI_Homeworkgrading/
├── 📖 README.md
├── 📋 PRD.md
├── 🏛️ ARCHITECTURE.md
├── backend/
│   ├── main.py                 # FastAPI 入口（7 个路由模块）
│   ├── config.py / database.py # 配置 + SQLite 8 表 + 自动迁移
│   ├── models.py               # 30+ Pydantic 模型
│   ├── routers/                # 7 个路由（assignments/submissions/grading/dashboard/error_book/pdf_export）
│   ├── services/               # 10 个服务（ai_client/ocr/grader/feedback/knowledge_graph/teacher_style/error_book/question_generator/class_analytics/pdf_export）
│   └── prompts/                # 6 套 Prompt
└── frontend/src/
    ├── api/client.ts           # 30+ API 方法
    ├── components/             # 13 个组件
    │   ├── CleanContent.tsx     # 内容清洗 + JSON 检测 + KaTeX 渲染
    │   ├── MathRenderer.tsx     # LaTeX 数学公式渲染（KaTeX）
    │   ├── ConfidenceBadge / SocraticFeedback / GradingResult
    │   ├── KnowledgeGraph / MasteryBar / StyleIndicator
    │   └── SimilarQuestionCard / ImageUploader / MarkdownRenderer
    ├── motion/index.tsx        # 8 个动画组件（含 TiltCard）
    ├── theme.ts                # 设计 Token + 玻璃态色值
    └── pages/                  # 15 个页面（teacher 8 + student 6 + home）
```

---

## 🚀 快速开始

```bash
# 1. 安装依赖
pip install -r backend/requirements.txt
cd frontend && npm install

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env → DASHSCOPE_API_KEY=你的key

# 3. 启动
cd frontend && npm run dev
# 浏览器打开 http://localhost:5173
```

---

## 🆕 v0.2.2 更新

### 批改系统优化
- **参考答案锚定**：教师出题时提供标准答案，AI 基于参考答案精准对比学生作答；无参考答案时拒绝批改，避免 AI 臆断
- **条件判分**：教师设置分值 → AI 在 0-N 范围内判定得分；未设分值 → 仅判对错不评分（`[未计分]` 标记）
- **答案图片 OCR**：教师可拍照上传参考答案图片（手写/打印），LLM 自动识别提取为格式正确的文本
- **UI 增强**：参考答案输入框空值时红色高亮提示，新增绿色"📷 上传答案"按钮（与蓝色"📷 拍题识别"区分）

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
