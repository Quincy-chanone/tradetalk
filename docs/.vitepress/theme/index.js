import { h, nextTick, onMounted, ref } from "vue";
import "./wrapper.css";

const assetVersion = "2.1.0";

const scripts = [
  "/content.js",
  "/v1-1-data.js",
  "/phonetics-data.js",
  "/vendor/easy-speech/EasySpeech.iife.js",
  "/app.js"
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-tradetalk-src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `${src}?v=${assetVersion}`;
    script.dataset.tradetalkSrc = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`无法载入 ${src}`));
    document.body.appendChild(script);
  });
}

const Layout = {
  setup() {
    const shell = ref('<main class="tradetalk-loading" aria-live="polite">正在载入 TradeTalk…</main>');

    onMounted(async () => {
      try {
        const response = await fetch(`/tradetalk-shell.html?v=${assetVersion}`, { cache: "no-store" });
        if (!response.ok) throw new Error("课程界面载入失败");
        const source = await response.text();
        const documentCopy = new DOMParser().parseFromString(source, "text/html");
        documentCopy.querySelectorAll("script").forEach(node => node.remove());
        shell.value = documentCopy.body.innerHTML;
        await nextTick();
        for (const src of scripts) await loadScript(src);
      } catch (error) {
        shell.value = `<main class="tradetalk-loading"><strong>TradeTalk 暂时无法载入</strong><p>${String(error.message || error)}</p></main>`;
      }
    });

    return () => h("div", { class: "tradetalk-root", innerHTML: shell.value });
  }
};

export default { Layout };
