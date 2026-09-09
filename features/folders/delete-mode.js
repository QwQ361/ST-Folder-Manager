// 资源删除模式层：承接资源页删除模式的进入、退出、选择集合、工具栏按钮状态与当前视图刷新协调。

export function enterResDeleteModeCore(deps) {
  const prev = deps.collectCurrentSelection();
  deps.clearAllExclusiveModes();
  deps.setResDeleteMode(true);
  deps.setResDeleteSelected(prev || new Set());
  deps.setResDeleteRangeMode(false);
  deps.setResDeleteLastClicked(null);
  deps.$(".cfm-res-delete-btn").addClass("cfm-res-delete-active");
  deps.$(".cfm-res-delete-btn")
    .find("i")
    .removeClass("fa-trash-can")
    .addClass("fa-check");
  deps.$(".cfm-res-delete-btn").attr("title", "确认删除");
  deps.$(".cfm-popup").addClass("cfm-res-delete-mode");
  deps.rerenderCurrentView();
}

export function exitResDeleteModeCore(deps) {
  deps.setResDeleteMode(false);
  deps.clearResDeleteSelected();
  deps.setResDeleteRangeMode(false);
  deps.setResDeleteLastClicked(null);
  deps.$(".cfm-res-delete-btn").removeClass("cfm-res-delete-active");
  deps.$(".cfm-res-delete-btn")
    .find("i")
    .removeClass("fa-check")
    .addClass("fa-trash-can");
  deps.$(".cfm-res-delete-btn").attr("title", function () {
    if (deps.$(this).attr("id") === "cfm-res-delete-char-btn") return "删除角色卡";
    if (deps.$(this).attr("id") === "cfm-res-delete-preset-btn") return "删除预设";
    if (deps.$(this).attr("id") === "cfm-res-delete-theme-btn") return "删除主题";
    if (deps.$(this).attr("id") === "cfm-res-delete-bg-btn") return "删除背景";
    if (deps.$(this).attr("id") === "cfm-res-delete-persona-btn") return "删除User";
    if (deps.$(this).attr("id") === "cfm-res-delete-regex-btn") return "删除正则";
    if (deps.$(this).attr("id") === "cfm-res-delete-qr-btn") return "删除快速回复集";
    return "删除世界书";
  });
  deps.$(".cfm-popup").removeClass("cfm-res-delete-mode");
  deps.rerenderCurrentView();
}

export function toggleResDeleteItemCore(id, shiftKey, deps) {
  const selected = deps.getResDeleteSelected();

  if ((shiftKey || deps.getResDeleteRangeMode()) && deps.getResDeleteLastClicked()) {
    const visible = deps.getVisibleResourceIds();
    const lastIdx = visible.indexOf(deps.getResDeleteLastClicked());
    const curIdx = visible.indexOf(id);
    if (lastIdx !== -1 && curIdx !== -1) {
      const [start, end] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
      for (let i = start; i <= end; i++) selected.add(visible[i]);
    }
  } else {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  deps.setResDeleteLastClicked(id);
}

export function prependResDeleteToolbarCore(listContainer, renderFn, deps) {
  if (!deps.getResDeleteMode()) return;

  listContainer.find(".cfm-export-toolbar").remove();

  const visible = deps.getVisibleResourceIds();
  const selected = deps.getResDeleteSelected();
  const allSel = visible.length > 0 && visible.every((id) => selected.has(id));
  const toolbar = deps.$(`
    <div class="cfm-res-delete-toolbar">
      <button class="cfm-btn cfm-btn-sm cfm-res-delete-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
      <button class="cfm-btn cfm-btn-sm cfm-res-delete-range ${deps.getResDeleteRangeMode() ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${deps.getResDeleteRangeMode() ? "(开)" : ""}</button>
      <span class="cfm-res-delete-count">${selected.size > 0 ? `已选 ${selected.size} 项` : ""}</span>
      <button class="cfm-btn cfm-btn-sm cfm-res-delete-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
    </div>
  `);

  toolbar.find(".cfm-res-delete-selectall").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allSel) {
      visible.forEach((id) => selected.delete(id));
    } else {
      visible.forEach((id) => selected.add(id));
    }
    renderFn();
  });

  toolbar.find(".cfm-res-delete-range").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deps.setResDeleteRangeMode(!deps.getResDeleteRangeMode());
    if (deps.getResDeleteRangeMode()) deps.setResDeleteLastClicked(null);
    renderFn();
  });

  toolbar.find(".cfm-res-delete-cancel").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deps.exitResDeleteMode();
  });

  listContainer.prepend(toolbar);
}
