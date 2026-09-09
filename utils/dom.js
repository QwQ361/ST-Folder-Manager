// DOM 工具层：承接安全选择、事件绑定、节点创建、class 操作、事件坐标提取与滚动定位等无资源业务语义的 DOM 辅助函数。

/**
 * 从 jQuery/原生事件对象中提取 clientX（兼容鼠标与触摸事件）。
 *
 * @param {Event|jQuery.Event} e 事件对象
 * @returns {number|null} 水平坐标；无法提取时返回 null
 */
export function getEventClientX(e) {
  const original = e?.originalEvent;
  const touch =
    original?.changedTouches?.[0] ||
    original?.touches?.[0] ||
    e?.changedTouches?.[0] ||
    e?.touches?.[0];
  if (touch && typeof touch.clientX === "number") return touch.clientX;
  return typeof e?.clientX === "number" ? e.clientX : null;
}

/**
 * 将目标元素滚动到受管滚动容器（或视口）的垂直居中位置。
 * 支持传 DOM 节点、jQuery 对象或返回节点的函数。
 *
 * @param {Element|jQuery|Function} target 目标元素或取元素函数
 */
export function scrollElementIntoViewCentered(target) {
  const resolveTarget = () => {
    if (typeof target === "function") return target();
    if (target?.jquery) return target.get(0);
    return target || null;
  };
  const getManagedScrollContainer = (node) => {
    if (!node?.closest) return null;
    return node.closest(
      "#cfm-right-list, #cfm-preset-right-list, #cfm-worldinfo-right-list, #cfm-persona-right-list, #cfm-qr-right-list",
    );
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const node = resolveTarget();
      if (!node) return;
      const container = getManagedScrollContainer(node);
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const deltaTop =
          nodeRect.top -
          containerRect.top -
          (container.clientHeight - nodeRect.height) / 2;
        const maxScrollTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight,
        );
        const nextScrollTop = Math.max(
          0,
          Math.min(maxScrollTop, container.scrollTop + deltaTop),
        );
        container.scrollTop = nextScrollTop;
        return;
      }
      if (typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
}
