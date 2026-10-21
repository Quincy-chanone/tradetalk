# GitHub 与 Cloudflare Pages 部署

## 1. GitHub

新建一个空仓库，将本项目目录中的全部文件推送到默认分支。仓库根目录必须能看到 `package.json`、`.pages.yml`、`_worker.js` 和 `docs`。

## 2. Cloudflare Pages

在现有 `english-trainer-v1` Pages 项目中点击 **Settings → Builds → Git repository → Connect**，选择上述 GitHub 仓库。

构建设置：

- Framework preset：VitePress（若列表没有则选 None）
- Build command：`pnpm build`
- Build output directory：`docs/.vitepress/dist`
- Production branch：`main`（或实际默认分支）

保留现有绑定：

- Type：D1 database
- Name：`SYNC_DB`
- Value：`english-trainer-sync`

不要删除这个绑定；`_worker.js` 中的跨设备同步接口依赖它。

## 3. Pages CMS

打开 <https://app.pagescms.org>，使用 GitHub 登录并授权新仓库。Pages CMS 会读取 `.pages.yml`，可在“行业英语”和“客户情景实战”中新增、删除、编辑及排序章节。保存后产生 GitHub 提交，Cloudflare Pages 随即自动部署。
