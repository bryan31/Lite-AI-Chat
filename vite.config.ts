import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载当前目录下的环境变量
  // 第三个参数 '' 表示加载所有环境变量，不仅仅是 VITE_ 开头的
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // 将 .env 中的 GEMINI_API_KEY 映射到代码中使用的 process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // 防止其他库引用 process.env 报错
      'process.env': {},
    },
  };
});