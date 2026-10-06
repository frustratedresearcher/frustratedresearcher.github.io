import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://infosecravi.com',
  base: '/blog',
  trailingSlash: 'always',
  // built straight into the repo root's /blog folder — GitHub Pages (legacy build)
  // serves it as static files, so the main site deploy is untouched.
  outDir: '../blog',
  build: { format: 'directory', assets: 'assets' },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark', wrap: true },
  },
});
