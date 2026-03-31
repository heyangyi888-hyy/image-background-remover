import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
	// 禁用增量缓存，避免 R2 bucket 权限问题
	incrementalCache: undefined,
});
