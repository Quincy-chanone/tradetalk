# TradeTalk VitePress

建筑玻璃五金外贸英语训练系统。主站以 GitHub 开源项目 VitePress 为底座，保留 TradeTalk 原有训练功能。

## 课程结构

- 行业英语：产品系列 → 章节 → 章节学习界面
- 客户情景实战：情景章节 → 章节学习界面

产品和章节在单页应用内切换，不为每章生成独立 URL。课程内容位于：

- `docs/public/content/industry.json`
- `docs/public/content/scenarios.json`

Pages CMS 使用仓库根目录的 `.pages.yml` 管理以上文件。

## 本地运行

```powershell
pnpm install
pnpm dev
```

生产构建：

```powershell
pnpm build
```

输出目录为 `docs/.vitepress/dist`，构建脚本会把 Cloudflare Pages Worker 一并复制到输出目录。
