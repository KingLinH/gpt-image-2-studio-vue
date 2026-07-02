import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// GitHub Actions（CI=true）发布到 https://<user>.github.io/<repo>/ 子路径，
// 用 GITHUB_REPOSITORY 自动推导 base；本地开发为 "/"。
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const base = process.env.CI && repoName ? `/${repoName}/` : "/";

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    // Element Plus 按需引入：组件、API(ElMessage 等) 及其样式由解析器自动注入
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 拆分第三方包，改善首屏与缓存
        manualChunks: {
          vue: ["vue", "vue-router", "pinia"],
          "element-plus": ["element-plus", "@element-plus/icons-vue"],
        },
      },
    },
  },
});
