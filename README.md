# Image Background Remover

在线图片背景抠图工具，一键去除背景，返回透明 PNG。

## 技术方案

- **前端**：Next.js（部署在 Cloudflare Pages）
- **后端**：Cloudflare Worker（API 代理，保护 Remove.bg API Key）
- **抠图引擎**：Remove.bg API

## 本地开发

### 1. 克隆代码

```bash
git clone https://github.com/heyangyi888-hyy/image-background-remover.git
cd image-background-remover
```

### 2. 前端开发

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### 3. 本地 API 测试（需要 Remove.bg API Key）

```bash
cd worker

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 启动本地 Worker
wrangler dev --port 8787

# 在 .dev.vars 中设置 API Key
echo 'REMOVE_BG_API_KEY="your_api_key_here"' > .dev.vars
wrangler dev --port 8787
```

### 4. 前端连接本地 Worker

开发模式下，前端页面右下角有 API 端点输入框，填入 `http://localhost:8787` 即可。

---

## 部署

### 1. 部署 Worker

```bash
cd worker

# 设置 API Key（在 Cloudflare Dashboard 或用命令）
wrangler secret put REMOVE_BG_API_KEY
# 输入你的 Remove.bg API Key

# 部署
wrangler deploy
```

部署成功后记下 Worker URL，例如：`https://image-bg-remover-worker.your-account.workers.dev`

### 2. 部署前端到 Cloudflare Pages

1. 在 GitHub 上创建新仓库，推送代码
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 **Pages** → **Create a project** → **Connect to Git**
4. 选择你的仓库
5. 设置：
   - **Build command**：`npm run build`
   - **Build output directory**：`out`
   - **Environment variables**：
     - `NODE_VERSION`: `18`
6. 点击 **Deploy site**

### 3. 绑定自定义域名（可选）

在 Cloudflare Pages 的设置中可以绑定自己的域名。

---

## Remove.bg API

- 注册：https://www.remove.bg/api
- 免费额度：50 张/月
- 按量付费：约 ¥0.3/张

---

## 项目结构

```
image-background-remover/
├── frontend/              # Next.js 前端
│   ├── app/
│   │   ├── page.tsx       # 主页面
│   │   ├── layout.tsx     # 布局
│   │   └── globals.css    # 全局样式
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
├── worker/                # Cloudflare Worker
│   ├── src/
│   │   └── index.ts       # Worker 入口
│   ├── wrangler.toml
│   └── package.json
└── docs/
    └── MVP_SPEC.md        # 需求文档
```

---

## License

MIT
