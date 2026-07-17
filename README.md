# XOLOme Website

XOLOme 响应式品牌官网，支持桌面端与移动端，可直接部署到 Cloudflare Pages。

## Cloudflare Pages

- Project name: `xolome-website`
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

部署完成后默认地址：

```text
https://xolome-website.pages.dev/
```

## 本地命令

```powershell
npm run build
npm run preview
npm run deploy
```

## 目录结构

```text
.
|-- assets/
|   |-- images/
|   `-- video/
|-- css/
|   |-- site.min.css
|   `-- xolome-local-overrides.css
|-- js/
|   `-- app.js
|-- scripts/
|   `-- build-pages.mjs
|-- index.html
|-- robots.txt
|-- sitemap.xml
|-- _headers
|-- _redirects
|-- package.json
`-- wrangler.jsonc
```

本地样式覆盖写在 `css/xolome-local-overrides.css`，并在 `index.html` 中最后加载。

## 媒体规范

- 视频统一使用 H.264、`yuv420p` 与 `faststart`
- 展示图优先 WebP；二维码与 Logo 保留原始格式
- 单文件控制在 Cloudflare Pages 上传限制内

## 联系方式

- Email: INFO@xolome.com
- Website: https://xolome-website.pages.dev/
