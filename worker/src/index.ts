/**
 * Cloudflare Worker: Remove.bg API Proxy
 *
 * 接收图片 → 转发给 Remove.bg → 返回透明PNG
 * API Key 不暴露在客户端
 */

const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";

export interface Env {
  REMOVE_BG_API_KEY: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 处理 CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 只允许 POST
    if (request.method !== "POST") {
      return Response.json(
        { error: "只支持 POST 请求" },
        { status: 405, headers: corsHeaders }
      );
    }

    // 检查 API Key
    const apiKey = env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "服务器配置错误：未设置 API Key" },
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      // 获取上传的图片
      const formData = await request.formData();
      const imageFile = formData.get("image");

      if (!imageFile || !(imageFile instanceof File)) {
        return Response.json(
          { error: "请上传图片文件" },
          { status: 400, headers: corsHeaders }
        );
      }

      // 构建发给 Remove.bg 的 formData
      const removeBgFormData = new FormData();
      removeBgFormData.append("image_file", imageFile);
      removeBgFormData.append("size", "auto");
      removeBgFormData.append("output_format", "png");
      removeBgFormData.append("no_shadow", "false");
      // 不设置 bg_color，API 会自动返回透明背景 PNG

      // 调用 Remove.bg API
      const response = await fetch(REMOVE_BG_API_URL, {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: removeBgFormData,
      });

      // Remove.bg 返回错误
      if (!response.ok) {
        let errorMessage = `Remove.bg API 错误 (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.errors?.[0]?.title) {
            errorMessage = errorData.errors[0].title;
          }
        } catch {
          // 忽略解析错误
        }
        return Response.json(
          { error: errorMessage },
          { status: response.status, headers: corsHeaders }
        );
      }

      // 返回图片
      const resultBlob = await response.blob();
      return new Response(resultBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="removed-bg.png"`,
          "Cache-Control": "no-cache",
        },
      });
    } catch (err) {
      console.error("Worker error:", err);
      return Response.json(
        { error: "服务器内部错误，请重试" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
