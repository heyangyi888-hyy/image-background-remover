/**
 * Local Backend Server for Image Background Remover
 * 前端（静态） + API 同端口
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Blob } = require('buffer');

const app = express();
const PORT = 3000;

// CORS 支持
app.use(cors({ origin: '*' }));

// 解析 JSON
app.use(express.json());

// Remove.bg API Key
const REMOVE_BG_API_KEY = 'pvxSt89xHPbA1q85TPwRA2um';
const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';

// Multer 配置（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'));
    }
  },
});

// ============ API 路由 ============

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    apiKey: REMOVE_BG_API_KEY.slice(0, 8) + '...',
    removeBgUrl: REMOVE_BG_API_URL,
  });
});

app.post('/api/remove', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片文件' });
    }

    console.log(`[${new Date().toISOString()}] 收到请求: ${req.file.originalname} (${req.file.size} bytes)`);

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('image_file', blob, req.file.originalname);
    formData.append('size', 'auto');
    formData.append('output_format', 'png');

    const response = await fetch(REMOVE_BG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Remove.bg API 错误 (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.errors?.[0]?.title) {
          errorMessage = errorData.errors[0].title;
        }
      } catch {}
      console.error(`[${new Date().toISOString()}] API 错误: ${errorMessage}`);
      return res.status(response.status).json({ error: errorMessage });
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);
    console.log(`[${new Date().toISOString()}] 成功，返回 ${resultBuffer.length} bytes`);

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="removed-bg.png"',
      'Cache-Control': 'no-cache',
    });
    res.send(resultBuffer);

  } catch (err) {
    console.error(`[${new Date().toISOString()}] 服务器错误:`, err.message);
    res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
});

// ============ 前端静态文件（Next.js build output）============

const frontendOut = path.join(__dirname, '..', 'frontend', 'out');

// 尝试找 index.html（Next.js 静态导出）
const indexPath = path.join(frontendOut, 'index.html');
if (fs.existsSync(indexPath)) {
  // SPA fallback：所有未匹配的路由返回 index.html
  app.use(express.static(frontendOut, {
    setHeaders: (res, filePath) => {
      // 不缓存 HTML 文件
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.send('<h1>前端未构建，请运行 npm run build</h1>');
  });
}

// ============ 启动 ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🖼️ Image Background Remover                        ║
╠══════════════════════════════════════════════════════╣
║  访问地址:  http://localhost:${PORT}                   ║
║  API:       http://localhost:${PORT}/api/remove      ║
╚══════════════════════════════════════════════════════╝
  `);
});
