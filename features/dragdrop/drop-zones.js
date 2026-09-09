// 拖放目标层：承接可接受拖放的位置、目标类型识别与 drop-zone 状态管理。
// 本文件为拖拽视觉定位层：注入并管理拖拽目标高亮样式、选择器构建与高亮闪烁。

// 确保拖拽高亮样式只注入一次
export function ensureDragLocateHighlightStyleCore(deps = {}) {
  const doc = deps.document || globalThis.document;
  if (doc.getElementById("cfm-drag-highlight-style")) return;
  const style = doc.createElement("style");
  style.id = "cfm-drag-highlight-style";
  style.textContent = `
    .cfm-drag-highlighted {
      animation: cfmDragHighlightPulse 1s ease;
      box-shadow: 0 0 0 1px rgba(249, 226, 175, 0.55), 0 0 0 4px rgba(249, 226, 175, 0.16) !important;
      background: rgba(249, 226, 175, 0.14) !important;
    }
    @keyframes cfmDragHighlightPulse {
      0% {
        box-shadow: 0 0 0 1px rgba(249, 226, 175, 0.72), 0 0 0 8px rgba(249, 226, 175, 0.22) !important;
        background: rgba(249, 226, 175, 0.22) !important;
      }
      100% {
        box-shadow: 0 0 0 1px rgba(249, 226, 175, 0.08), 0 0 0 0 rgba(249, 226, 175, 0) !important;
        background: rgba(249, 226, 175, 0.02) !important;
      }
    }
  `;
  doc.head.appendChild(style);
}

// 根据拖拽数据类型构建用于定位高亮的目标选择器
export function buildDraggedHighlightSelectorCore(dragData, deps = {}) {
  const jq = deps.$ || globalThis.$;
  if (!dragData || typeof dragData !== "object") return "";

  const collectValues = (...values) =>
    values
      .flat()
      .map((value) => String(value || "").trim())
      .filter(Boolean);

  const buildSelector = (values, fragments) =>
    collectValues(values)
      .flatMap((value) => {
        const escapedValue = jq.escapeSelector(value);
        return fragments.map((fragment) => fragment(escapedValue));
      })
      .join(", ");

  switch (String(dragData.type || "").trim()) {
    case "folder":
    case "res-folder":
      return buildSelector(dragData.id, [
        (value) => `.cfm-tnode[data-id="${value}"]`,
        (value) => `.cfm-row[data-folder-id="${value}"]`,
      ]);
    case "char":
      return buildSelector(
        dragData.multiSelect && Array.isArray(dragData.selectedIds)
          ? dragData.selectedIds
          : dragData.avatar,
        [
          (value) => `.cfm-row[data-avatar="${value}"]`,
          (value) => `.cfm-row[data-res-id="${value}"]`,
        ],
      );
    case "preset":
      return buildSelector(
        dragData.multiSelect && Array.isArray(dragData.selectedIds)
          ? dragData.selectedIds
          : [dragData.value, dragData.name],
        [
          (value) => `.cfm-row[data-value="${value}"]`,
          (value) => `.cfm-row[data-res-id="${value}"]`,
        ],
      );
    case "theme":
    case "background":
    case "worldinfo":
    case "quickreply":
      return buildSelector(
        dragData.multiSelect && Array.isArray(dragData.selectedIds)
          ? dragData.selectedIds
          : dragData.name,
        [(value) => `.cfm-row[data-res-id="${value}"]`],
      );
    case "persona":
      return buildSelector(
        dragData.multiSelect && Array.isArray(dragData.selectedIds)
          ? dragData.selectedIds
          : dragData.avatarId,
        [
          (value) => `.cfm-row[data-avatar-id="${value}"]`,
          (value) => `.cfm-row[data-res-id="${value}"]`,
        ],
      );
    case "regex-script":
      return buildSelector(dragData.id, [
        (value) => `.cfm-regex-script-row[data-script-id="${value}"]`,
        (value) => `.cfm-sort-row[data-script-id="${value}"]`,
      ]);
    default:
      return "";
  }
}

// 拖拽定位高亮：闪烁目标元素以提示释放位置
export function flashDraggedElementCore(target, duration = 1000, options = {}, deps = {}) {
  const doc = deps.document || globalThis.document;
  const elementClass = deps.Element || globalThis.Element;
  const ensureStyle = deps.ensureDragLocateHighlightStyle || ensureDragLocateHighlightStyleCore;
  ensureStyle({ document: doc });
  const maxAttempts = Number.isInteger(options.maxAttempts)
    ? options.maxAttempts
    : 24;
  const interval = Number.isInteger(options.interval) ? options.interval : 80;

  const normalizeElements = (value) => {
    if (!value) return [];
    if (value instanceof elementClass) return [value];
    if (value?.jquery) return value.get().filter(Boolean);
    if (Array.isArray(value)) {
      return value.flatMap((item) => normalizeElements(item));
    }
    if (typeof value === "string") {
      return Array.from(doc.querySelectorAll(value));
    }
    return [];
  };

  let attempt = 0;
  const tryHighlight = () => {
    const resolvedTarget = typeof target === "function" ? target() : target;
    const elements = normalizeElements(resolvedTarget).filter(
      (element) => element?.isConnected,
    );
    if (!elements.length) {
      if (attempt < maxAttempts) {
        attempt += 1;
        setTimeout(tryHighlight, interval);
      }
      return;
    }

    for (const element of elements) {
      if (element.__cfmDragHighlightTimer) {
        clearTimeout(element.__cfmDragHighlightTimer);
      }
      element.classList.remove("cfm-drag-highlighted");
      void element.offsetWidth;
      element.classList.add("cfm-drag-highlighted");
      element.__cfmDragHighlightTimer = setTimeout(() => {
        element.classList.remove("cfm-drag-highlighted");
        element.__cfmDragHighlightTimer = null;
      }, duration);
    }
  };

  tryHighlight();
}
