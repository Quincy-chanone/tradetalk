import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "TradeTalk",
  description: "建筑玻璃五金外贸英语口语训练",
  cleanUrls: true,
  head: [
    ["meta", { name: "theme-color", content: "#18392f" }],
    ["meta", { name: "viewport", content: "width=device-width,initial-scale=1,viewport-fit=cover" }],
    ["link", { rel: "manifest", href: "/manifest.json" }],
    ["link", { rel: "icon", href: "/icon.svg", type: "image/svg+xml" }]
  ]
});
