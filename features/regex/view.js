// 正则资源视图协调层：承接 Regex 资源页的树/列表视图协调、脚本操作入口、拖拽目标调度与当前 regex 页刷新；具体 DOM 组件应下沉到 ui/views/regex-view.js、ui/tree 或 ui/list，业务状态与分组/收藏/重命名逻辑分别由 regex 子模块维护。
export function createRegexViewApiCore(deps) {
  const {
    escapeHtml,
    isResFavorite,
    state: {
      getCfmResDeleteMode,
      getCfmResDeleteSelected,
      getCfmExportMode,
      getCfmExportSelected,
      getCfmMultiSelectMode,
      getCfmMultiSelected,
    },
  } = deps;

  // 构建正则脚本行HTML（cfm-row模式，与其他标签页一致，不直接展示正则内容）
  function buildRegexScriptRowHtml(script, scriptType, ownerLabel) {
    const isDisabled = !!script.disabled;
    const typeBadge = { 1: "角色", 2: "预设" }[scriptType] ?? "";
    const badgeHtml = typeBadge
      ? `<span class="cfm-regex-card-badge cfm-regex-badge-${scriptType}">${typeBadge}</span>`
      : "";
    // 使用与世界书相同的 cfm-wi-toggle 样式
    const toggleHtml = `<div class="cfm-wi-toggle ${isDisabled ? "" : "cfm-wi-toggle-on"}" title="${isDisabled ? "已禁用 - 点击启用" : "已启用 - 点击禁用"}"><i class="fa-solid fa-toggle-${isDisabled ? "off" : "on"}"></i></div>`;
    const isDelSel =
      scriptType === 0 &&
      getCfmResDeleteMode() &&
      script.id &&
      getCfmResDeleteSelected().has(script.id);
    const isExportSel =
      scriptType === 0 &&
      getCfmExportMode() &&
      script.id &&
      getCfmExportSelected().has(script.id);
    const isMSel =
      scriptType === 0 &&
      getCfmMultiSelectMode() &&
      script.id &&
      getCfmMultiSelected().has(script.id);
    const checkHtml =
      scriptType === 0
        ? getCfmResDeleteMode()
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : getCfmExportMode()
            ? `<div class="cfm-export-checkbox ${isExportSel ? "cfm-export-checked" : ""}"><i class="fa-${isExportSel ? "solid" : "regular"} fa-square${isExportSel ? "-check" : ""}"></i></div>`
            : getCfmMultiSelectMode()
              ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
              : ""
        : "";
    // 收藏星标（仅全局正则显示）
    const fav = scriptType === 0 && script.id ? isResFavorite("regex", script.id) : false;
    const starHtml =
      scriptType === 0 && script.id
        ? `<div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>`
        : "";
    return `
      <div class="cfm-row cfm-row-char cfm-regex-script-row ${isDisabled ? "cfm-regex-disabled" : ""}"
           data-script-id="${escapeHtml(script.id || "")}"
           data-script-type="${scriptType}"
           data-owner="${escapeHtml(ownerLabel || "")}"
           ${scriptType === 0 ? 'draggable="true"' : ""}>
        ${checkHtml}
        ${toggleHtml}
        <div class="cfm-row-name">
          <span>${escapeHtml(script.scriptName || "(未命名)")}</span>
          ${badgeHtml}
        </div>
        <div class="cfm-row-edit-btn cfm-regex-edit-btn" title="编辑"><i class="fa-solid fa-pen-to-square"></i></div>
        ${starHtml}
      </div>
    `;
  }

  return {
    buildRegexScriptRowHtml,
  };
}
