import { h, nextTick, onMounted, ref } from "vue";
import "./wrapper.css";

const assetVersion = "2.4.8-material-import";

const scripts = [
  "/content.js",
  "/v1-1-data.js",
  "/phonetics-data.js",
  "/course-builder.js",
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
        let documentCopy = null;
        for (const url of [`/tradetalk-shell.html?v=${assetVersion}`, "/tradetalk-shell.html"]) {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) continue;
          const candidate = new DOMParser().parseFromString(await response.text(), "text/html");
          if (candidate.querySelector("#today") && candidate.querySelector("#courseBuilderDialog")) { documentCopy = candidate; break; }
        }
        if (!documentCopy) throw new Error("课程界面载入失败或版本不匹配");
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
