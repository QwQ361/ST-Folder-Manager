// 资源导出模式层：承接资源页导出模式的进入、退出、选择集合、工具栏按钮状态与当前视图刷新协调。

export function enterExportModeCore(deps) {
  const prev = deps.collectCurrentSelection();
  deps.clearAllExclusiveModes();
  deps.setExportMode(true);
  deps.setExportSelected(prev || new Set());
  deps.$(".cfm-export-btn").addClass("cfm-export-active");
  deps
    .$(".cfm-export-btn")
    .find("i")
    .removeClass("fa-file-export")
    .addClass("fa-check");
  deps.$(".cfm-export-btn").attr("title", "确认导出");
  deps.$(".cfm-popup").addClass("cfm-export-mode");
  deps.rerenderCurrentView();
}

export function exitExportModeCore(deps) {
  deps.setExportMode(false);
  deps.clearExportSelected();
  deps.setExportRangeMode(false);
  deps.setExportLastClicked(null);
  deps.$(".cfm-export-btn").removeClass("cfm-export-active");
  deps
    .$(".cfm-export-btn")
    .find("i")
    .removeClass("fa-check")
    .addClass("fa-file-export");
  deps.$(".cfm-export-btn").attr("title", function () {
    if (deps.$(this).attr("id") === "cfm-export-char-btn") return "导出角色卡";
    if (deps.$(this).attr("id") === "cfm-export-chatlog-btn")
      return "导出聊天记录";
    if (deps.$(this).attr("id") === "cfm-export-preset-btn") return "导出预设";
    if (deps.$(this).attr("id") === "cfm-export-theme-btn") return "导出主题";
    if (deps.$(this).attr("id") === "cfm-export-bg-btn") return "导出背景";
    if (deps.$(this).attr("id") === "cfm-export-persona-btn") return "导出User";
    if (deps.$(this).attr("id") === "cfm-export-regex-btn") return "导出正则";
    if (deps.$(this).attr("id") === "cfm-export-qr-btn")
      return "导出快速回复集";
    return "导出世界书";
  });
  deps.$(".cfm-popup").removeClass("cfm-export-mode");
  deps.rerenderCurrentView();
}

export function toggleExportItemCore(id, shiftKey, deps) {
  const selected = deps.getExportSelected();

  if ((shiftKey || deps.getExportRangeMode()) && deps.getExportLastClicked()) {
    const visible = deps.getVisibleResourceIds();
    const lastIdx = visible.indexOf(deps.getExportLastClicked());
    const curIdx = visible.indexOf(id);
    if (lastIdx !== -1 && curIdx !== -1) {
      const [start, end] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
      for (let i = start; i <= end; i++) selected.add(visible[i]);
    }
  } else {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  deps.setExportLastClicked(id);
}

export function prependExportToolbarCore(listContainer, renderFn, deps) {
  if (!deps.getExportMode()) return;

  listContainer.find(".cfm-res-delete-toolbar").remove();

  const visible = deps.getVisibleResourceIds();
  const selected = deps.getExportSelected();
  const allSel = visible.length > 0 && visible.every((id) => selected.has(id));
  const toolbar = deps.$(`
    <div class="cfm-export-toolbar">
      <button class="cfm-btn cfm-btn-sm cfm-export-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
      <button class="cfm-btn cfm-btn-sm cfm-export-range ${deps.getExportRangeMode() ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${deps.getExportRangeMode() ? "(开)" : ""}</button>
      <span class="cfm-export-count">${selected.size > 0 ? `已选 ${selected.size} 项` : ""}</span>
      <button class="cfm-btn cfm-btn-sm cfm-export-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
    </div>
  `);

  toolbar.find(".cfm-export-selectall").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allSel) {
      visible.forEach((id) => selected.delete(id));
    } else {
      visible.forEach((id) => selected.add(id));
    }
    renderFn();
  });

  toolbar.find(".cfm-export-range").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deps.setExportRangeMode(!deps.getExportRangeMode());
    if (deps.getExportRangeMode()) deps.setExportLastClicked(null);
    renderFn();
  });

  toolbar.find(".cfm-export-cancel").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deps.exitExportMode();
  });

  listContainer.prepend(toolbar);
}
