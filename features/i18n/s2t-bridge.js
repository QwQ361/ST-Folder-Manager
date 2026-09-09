// 简繁转换桥接功能文件：用于封装插件界面文本与简繁转换逻辑之间的衔接，确保新增 DOM 文本、弹窗内容和界面标签能够按当前语言设置自动执行简繁转换。

function isTraditionalChineseEnabled(deps = {}) {
  const extensionSettings =
    typeof deps.getExtensionSettings === "function"
      ? deps.getExtensionSettings()
      : deps.extensionSettings;
  const ext = extensionSettings?.[deps.extensionName];
  return ext?.language === "zh-TW";
}

export function cfmConvertDomTextCore(root, deps = {}) {
  const s2t = deps.s2t;
  const documentRef = deps.document || globalThis.document;
  const NodeFilterRef = deps.NodeFilter || globalThis.NodeFilter;

  if (!root || !s2t || !isTraditionalChineseEnabled(deps)) return;
  if (!documentRef?.createTreeWalker || !NodeFilterRef) return;

  const walker = documentRef.createTreeWalker(root, NodeFilterRef.SHOW_TEXT, {
    acceptNode(node) {
      let el = node.parentElement;
      while (el) {
        if (el.hasAttribute && el.hasAttribute("data-cfm-no-convert")) {
          return NodeFilterRef.FILTER_REJECT;
        }
        el = el.parentElement;
      }
      return NodeFilterRef.FILTER_ACCEPT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    const orig = node.nodeValue;
    if (!orig || !/[\u4e00-\u9fff]/.test(orig)) continue;
    const converted = s2t.toTraditional(orig);
    if (converted !== orig) node.nodeValue = converted;
  }

  root
    .querySelectorAll?.("[placeholder],[title],[aria-label]")
    ?.forEach?.((el) => {
      if (el.closest("[data-cfm-no-convert]")) return;
      ["placeholder", "title", "aria-label"].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && /[\u4e00-\u9fff]/.test(value)) {
          const converted = s2t.toTraditional(value);
          if (converted !== value) el.setAttribute(attr, converted);
        }
      });
    });
}

export function initCfmS2tObserverCore(deps = {}) {
  const documentRef = deps.document || globalThis.document;
  const MutationObserverRef =
    deps.MutationObserver || globalThis.MutationObserver;

  if (!documentRef || !MutationObserverRef) return null;

  let converting = false;
  const observer = new MutationObserverRef((mutations) => {
    if (converting) return;
    if (!isTraditionalChineseEnabled(deps) || !deps.s2t) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          const isCfm =
            node.id?.startsWith?.("cfm-") ||
            node.className?.toString?.().includes?.("cfm-") ||
            node.querySelector?.("[id^='cfm-'],[class*='cfm-']");
          if (isCfm) {
            converting = true;
            try {
              deps.convertDomText(node);
            } finally {
              converting = false;
            }
          }
        }

        if (node.nodeType === 3) {
          const parent = node.parentElement;
          if (!parent) continue;
          if (parent.closest?.("[data-cfm-no-convert]")) continue;
          const isCfmEl = parent.closest?.("[id^='cfm-'],[class*='cfm-']");
          if (!isCfmEl) continue;

          const orig = node.nodeValue;
          if (!orig || !/[\u4e00-\u9fff]/.test(orig)) continue;
          const converted = deps.s2t.toTraditional(orig);
          if (converted !== orig) {
            converting = true;
            try {
              node.nodeValue = converted;
            } finally {
              converting = false;
            }
          }
        }
      }
    }
  });

  const observeOpts = { childList: true, subtree: true, characterData: true };
  if (documentRef.body) {
    observer.observe(documentRef.body, observeOpts);
  } else {
    documentRef.addEventListener("DOMContentLoaded", () => {
      observer.observe(documentRef.body, observeOpts);
    });
  }

  return observer;
}
