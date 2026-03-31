"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button, message } from "antd";
import {
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useSession, signIn, signOut } from "next-auth/react";

type Step = "idle" | "uploading" | "processing" | "done" | "error";

export default function HomePage() {
  const [step, setStep] = useState<Step>("idle");
  const [originalImage, setOriginalImage] = useState<string>("");
  const [resultImage, setResultImage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [freeUsage, setFreeUsage] = useState<number>(5);
  const [bgMode, setBgMode] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session, status } = useSession();

  const bgLabels = ["棋盘格", "黑色", "白色", "透明"];

  // 检查登录状态
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setFreeUsage(5); // 每次登录给5次
    }
  }, [status, session]);

  const handleFile = async (file: File) => {
    if (status !== "authenticated" || !session?.user) {
      message.info("请先登录后再使用");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      message.error("图片尺寸过大，请压缩到 10MB 以下");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      message.error("不支持的图片格式，请上传 JPG、PNG 或 WebP");
      return;
    }

    const originalUrl = URL.createObjectURL(file);
    setOriginalImage(originalUrl);
    setResultImage("");
    setStep("uploading");

    const formData = new FormData();
    formData.append("image", file);

    setStep("processing");
    try {
      const API_URL = "https://image-bg-remover-worker.heyangyi888.workers.dev/";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败 (${response.status})`);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("返回结果为空");

      const resultUrl = URL.createObjectURL(blob);
      setResultImage(resultUrl);
      setStep("done");
      setFreeUsage(prev => Math.max(0, prev - 1));
      message.success("抠图完成！");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "抠图失败，请重试";
      setErrorMessage(msg);
      setStep("error");
      message.error(msg);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleReset = () => {
    if (originalImage) URL.revokeObjectURL(originalImage);
    if (resultImage) URL.revokeObjectURL(resultImage);
    setStep("idle");
    setOriginalImage("");
    setResultImage("");
    setErrorMessage("");
    setBgMode(0);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `removed-bg-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 粘贴监听
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file);
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const isLoggedIn = status === "authenticated" && !!session?.user;
  const userName = session?.user?.name || session?.user?.email || "";

  return (
    <div className="page">
      {/* 顶部 */}
      <div className="top-bar">
        <div className="logo">✂️ RemoveBG</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isLoggedIn && (
            <span className="usage-badge">剩余免费次数: {freeUsage}</span>
          )}
          {!isLoggedIn ? (
            <Button type="primary" size="small" onClick={() => signIn("google")}>
              登录 / 注册
            </Button>
          ) : (
            <>
              <div className="user-info">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="user-avatar" />
                ) : (
                  <UserOutlined />
                )}
                <span className="user-name">{userName}</span>
              </div>
              <Button size="small" icon={<LogoutOutlined />} onClick={() => signOut()}>
                退出
              </Button>
            </>
          )}
          {step === "done" && (
            <Button size="small" onClick={handleReset} icon={<ReloadOutlined />}>
              重新上传
            </Button>
          )}
        </div>
      </div>

      {/* 主体 */}
      <div className="content">
        {/* 空闲状态 */}
        {step === "idle" && (
          <div
            className={`drop-zone ${isDragging ? "dragging" : ""}`}
            onClick={() => {
              if (!isLoggedIn) {
                message.info("请先登录后再使用");
                return;
              }
              if (freeUsage <= 0) {
                message.info("免费次数已用完，请订阅高级版");
                return;
              }
              fileInputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="drop-icon">📤</div>
            <div className="drop-title">拖拽图片到这里</div>
            <div className="drop-sub">或点击选择文件</div>
            <div className="drop-hint">支持 JPG、PNG、WebP，最大 10MB</div>
            <div className="drop-paste">💡 也可用 Ctrl+V 粘贴图片</div>
            {!isLoggedIn && (
              <div className="login-hint">🔐 请先登录后使用</div>
            )}
            {isLoggedIn && freeUsage <= 0 && (
              <div className="login-hint">⚠️ 免费次数已用完，请订阅</div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* 上传/处理中 */}
        {(step === "uploading" || step === "processing") && (
          <div className="loading-box">
            <div className="spinner"></div>
            <div className="loading-text">
              {step === "uploading" ? "上传中..." : "AI 抠图中..."}
            </div>
          </div>
        )}

        {/* 完成状态 */}
        {step === "done" && (
          <div className="result-box">
            <div className="compare-area">
              <div className="compare-item">
                <div className="compare-label">原图</div>
                <img src={originalImage} alt="原图" className="compare-img" />
              </div>
              <div className="compare-item">
                <div className="compare-label">结果</div>
                <div className="result-wrapper" data-bg={bgMode}>
                  <img src={resultImage} alt="结果" className="result-img" />
                </div>
              </div>
            </div>

            <div className="toolbar">
              <div className="bg-switcher">
                <span className="toolbar-label">背景：</span>
                {bgLabels.map((label, idx) => (
                  <button
                    key={idx}
                    className={`bg-btn ${bgMode === idx ? "active" : ""}`}
                    onClick={() => setBgMode(idx)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
                下载 PNG
              </Button>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {step === "error" && (
          <div className="error-box">
            <div className="error-icon">❌</div>
            <div className="error-text">{errorMessage}</div>
            <Button type="primary" onClick={handleReset}>重新上传</Button>
          </div>
        )}
      </div>

      <div className="footer">
        免费使用 · Powered by Remove.bg
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #eee;
        }
        .logo { font-size: 18px; font-weight: 700; color: #333; }
        .usage-badge {
          font-size: 13px;
          color: #666;
          background: #f5f5f5;
          padding: 4px 10px;
          border-radius: 12px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #666;
        }
        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .user-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }
        .drop-zone {
          width: 100%;
          max-width: 480px;
          padding: 60px 40px;
          background: white;
          border: 2px dashed #ddd;
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: #1890ff;
          background: #f0f7ff;
        }
        .drop-icon { font-size: 48px; margin-bottom: 16px; }
        .drop-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 8px; }
        .drop-sub { font-size: 14px; color: #999; margin-bottom: 16px; }
        .drop-hint { font-size: 13px; color: #bbb; margin-bottom: 8px; }
        .drop-paste { font-size: 13px; color: #bbb; }
        .login-hint { margin-top: 16px; font-size: 14px; color: #ff4d4f; font-weight: 500; }
        .loading-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #e0e0e0;
          border-top-color: #1890ff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { color: #666; font-size: 16px; }
        .result-box {
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .compare-area { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .compare-item {
          background: white;
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .compare-label { font-size: 13px; color: #888; margin-bottom: 8px; }
        .compare-img { width: 100%; border-radius: 8px; display: block; }
        .result-wrapper {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          min-height: 200px;
        }
        .result-wrapper[data-bg="0"] {
          background: repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 16px 16px;
        }
        .result-wrapper[data-bg="1"] { background: #111; }
        .result-wrapper[data-bg="2"] { background: #fff; }
        .result-wrapper[data-bg="3"] {
          background: repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 16px 16px;
        }
        .result-img { width: 100%; display: block; }
        .toolbar {
          background: white;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .bg-switcher { display: flex; align-items: center; gap: 8px; }
        .toolbar-label { font-size: 14px; color: #666; }
        .bg-btn {
          padding: 4px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          color: #666;
          transition: all 0.15s;
        }
        .bg-btn:hover { border-color: #1890ff; color: #1890ff; }
        .bg-btn.active { background: #1890ff; border-color: #1890ff; color: white; }
        .error-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 48px;
          background: white;
          border-radius: 16px;
        }
        .error-icon { font-size: 48px; }
        .error-text { color: #ff4d4f; font-size: 15px; }
        .footer {
          text-align: center;
          padding: 20px;
          color: #bbb;
          font-size: 13px;
        }
        @media (max-width: 600px) {
          .compare-area { grid-template-columns: 1fr; }
          .toolbar { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
