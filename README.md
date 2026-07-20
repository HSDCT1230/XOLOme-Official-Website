# XOLOme Website

XOLOme 响应式品牌官网，支持桌面端与移动端，可直接部署到 Cloudflare Pages。

## Cloudflare Pages

- Project name: `xolome-website-test`
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

部署完成后默认地址：

```text
https://xolome-website-test.pages.dev/
```

### GitHub Actions 自动部署

仓库已包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 会构建并部署到 `xolome-website-test`。

需要在 GitHub 仓库 Secrets 中配置：

1. 到 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 创建 Token（权限至少包含 **Account → Cloudflare Pages → Edit**）
2. 在仓库 Settings → Secrets and variables → Actions 添加：
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 上一步的 Token
3. 或用 CLI：

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" secret set CLOUDFLARE_API_TOKEN -R HSDCT1230/XOLOme-Website
```

配置后可在 Actions 里手动 **Run workflow** 验证。

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
- Website: https://xolome-website-test.pages.dev/
