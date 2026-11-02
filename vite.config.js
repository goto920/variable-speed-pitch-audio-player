import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // 相対パスでどこでも動くように
  build: {
    // ★ iOS 12 (Safari 12) で動く古いJS構文(ES2015/ES2018)にダウングレード出力
    target: ['es2015', 'safari12'],
  },
  plugins: [react()],
});
