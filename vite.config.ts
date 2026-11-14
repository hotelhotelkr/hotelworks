import path from 'path';
import { rm } from 'fs/promises';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Windows + Node 24: fs.rmSync(recursive) crashes the process when the path
// contains non-ASCII characters (this project lives under a Korean folder name).
// Vite's built-in emptyOutDir uses rmSync, so it is disabled below and the
// output folder is emptied here with the async rm, which works.
const cleanOutDir = (): Plugin => {
  let root = '';
  let outDir = '';
  return {
    name: 'clean-out-dir',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async buildStart() {
      // Same safety rule as Vite: only empty a folder inside the project root.
      const relative = path.relative(root, outDir);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return;
      await rm(outDir, { recursive: true, force: true });
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), cleanOutDir()],
      build: {
        emptyOutDir: false,
      },
      define: {
        'import.meta.env.VITE_WS_SERVER_URL': JSON.stringify(env.VITE_WS_SERVER_URL || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
