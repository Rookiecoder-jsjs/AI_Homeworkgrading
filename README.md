# AI 作业批改系统

> **MVP v0.1.0** — 基于 qwen3.6-flash 的智能作业批改平台，打通"教师布置 → AI 批改 → 学生订正 → 教师复核"完整闭环。

## 功能概览

### 教师端
- **作业管理** — 创建含 5 种题型（选择/判断/填空/简答/作文）的作业
- **拍照出题** — 上传试卷图片，AI 自动识别题目内容和答案
- **批量批改** — 一键批改所有待处理的学生提交
- **智能复核** — 高置信度项自动通过、折叠，教师只需关注低置信度项
- **看板统计** — 可点击交互卡片，待复核队列集中处理

### 学生端
- **逐题作答** — 每道题独立文本输入 + 拍照上传
- **题目图片展示** — 数学证明题等保留原始图片
- **即时反馈** — Socratic 引导式反馈，三级逐层展开，不直接给答案
- **错题订正** — 仅展示错题，修改后自动重新批改
- **状态可见** — 实时查看等待批改 / AI 已批改 / 教师已复核

### AI 能力
- **OCR 识别** — 手写体 + 印刷体 + 数学公式（LaTeX）
- **规则+AI 分流** — 客观题本地规则匹配（99% 准确率），主观题 AI 语义评价
- **置信度分级** — 绿(>0.9) / 黄(0.7-0.9) / 红(<0.7) 三级分流
- **Socratic 引导** — 追问/提示/类比，引导学生自主发现正确答案

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite |
| 样式 | 内联 CSS-in-JS |
| 动效 | Framer Motion |
| 路由 | react-router-dom v7 |
| 后端 | FastAPI (Python) |
| 数据库 | SQLite (WAL 模式) |
| AI 模型 | qwen3.6-flash (DashScope) |
| AI SDK | OpenAI Python SDK (兼容模式) |

## 项目结构

```
AI_Homeworkgrading/
├── README.md
├── PRD.md                     # 产品需求文档
├── ARCHITECTURE.md             # 架构文档
├── .env.example                # 环境变量示例（需复制为 .env）
├── backend/
│   ├── main.py                 # FastAPI 入口
│   ├── config.py               # 配置加载
│   ├── database.py             # SQLite Schema + 迁移
│   ├── models.py               # Pydantic 数据模型
│   ├── routers/                # API 路由（4 个模块）
│   ├── services/               # AI 服务层（OCR/批改/反馈）
│   ├── prompts/                # Prompt 模板
│   ├── uploads/                # 图片存储目录
│   └── data/                   # 数据库文件目录
└── frontend/
    └── src/
        ├── api/                 # API 调用封装
        ├── components/          # 5 个可复用组件
        ├── motion/              # Framer Motion 动画组件
        ├── pages/               # 12 个页面
        │   ├── teacher/         # 教师端（6 页）
        │   └── student/         # 学生端（5 页）
        └── types/               # TypeScript 类型
```

## 快速开始

### 1. 环境准备

```bash
# Python 3.10+
pip install -r backend/requirements.txt

# Node.js 18+
cd frontend && npm install
```

### 2. 配置 API Key

```bash
# 在项目根目录创建 .env 文件
cp .env.example .env
# 编辑 .env，填入 DashScope API Key
```

`.env` 内容：
```
DASHSCOPE_API_KEY=sk-your-key-here
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen3.6-flash
```

### 3. 启动

```bash
cd frontend
npm run dev
```

一条命令同时启动前端 (:5173) 和后端 (:8000)，`Ctrl+C` 停止。

### 4. 使用

1. 打开 `http://localhost:5173`
2. 选择 **教师入口** → 创建作业 → 发布
3. 切到 **学生入口** → 输入姓名 → 提交作业
4. 回到教师端 → 批量 AI 批改 → 复核低置信度项
5. 学生端查看结果 → 错题订正

## 设计原则

- **MVP 极简** — 纯内联 CSS-in-JS，零 UI 框架依赖，启动即可用
- **无认证** — 教师直接进入，学生输入姓名标识（后续迭代补全）
- **本地优先** — SQLite 单文件、本地文件存储，零外部服务依赖（除 AI API）

## 后续迭代

- [ ] 完整用户认证与权限系统
- [ ] 学生错题本聚合
- [ ] 知识点薄弱项分析图谱
- [ ] 批量导入/导出作业
- [ ] 教师自定义评语模板
