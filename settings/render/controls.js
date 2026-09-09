// 设置页控件渲染层：承接三模块页共用的 checkbox、select、button、input 等基础控件 DOM 片段生成；不直接读取或写入业务状态。
// 本文件包含批量创建弹窗的纯函数：parseBatchText（缩进文本 -> 树）与 renderBatchPreview（树 -> 缩进预览 DOM）。
// 通过 createBatchControlsCore({ escapeHtml }) 工厂注入依赖，不依赖 index.js 闭包内的可变状态。

/**
 * 批量创建工厂：注入 escapeHtml 依赖，返回纯函数。
 * @param {Object} deps
 * @param {(str: string) => string} deps.escapeHtml HTML 转义函数
 * @returns {{ parseBatchText: Function, renderBatchPreview: Function }}
 */
export function createBatchControlsCore({ escapeHtml }) {
  /**
   * 将按行缩进书写的文本解析为文件夹树。
   * 支持 tab/空格缩进；行首 "- " 前缀会被剥离作为层级标记。
   * 示例：
   *   根目录
   *     - 子目录A
   *       - 孙目录A1
   *     - 子目录B
   * @param {string} text 多行文本
   * @returns {Array<{name: string, children: Array}>} 树节点数组
   */
  function parseBatchText(text) {
    const lines = text.split("\n");
    const root = [];
    const stack = [{ indent: -1, children: root }];
    for (const rawLine of lines) {
      if (rawLine.trim() === "") continue;
      const match = rawLine.match(/^(\s*)/);
      const indent = match ? match[1].replace(/\t/g, "  ").length : 0;
      let name = rawLine
        .trim()
        .replace(/^-+\s*/, "")
        .trim();
      if (!name) continue;
      const node = { name, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent)
        stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push({ indent, children: node.children });
    }
    return root;
  }

  /**
   * 将文件夹树递归渲染为缩进预览 DOM。
   * @param {jQuery} container 目标容器
   * @param {Array<{name: string, children: Array}>} nodes 树节点数组
   * @param {number} depth 当前深度（用于缩进计算）
   */
  function renderBatchPreview(container, nodes, depth) {
    for (const node of nodes) {
      container.append(
        `<div style="padding-left:${depth * 20}px;font-size:13px;line-height:1.8;">📁 ${escapeHtml(node.name)}</div>`,
      );
      if (node.children.length > 0)
        renderBatchPreview(container, node.children, depth + 1);
    }
  }

  return { parseBatchText, renderBatchPreview };
}
