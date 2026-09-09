// 通用多选模式辅助层：承接跨资源列表的选择集合、范围选择、可见项收集与多选拖拽数据构造。

export function handleFolderTargetMoveCore(moveAction, renderAction, toastAction, deps) {
  if (!deps.getMultiSelectMode() || deps.getMultiSelected().size === 0) return;
  const items = Array.from(deps.getMultiSelected());
  const count = items.length;
  moveAction(items);
  deps.clearMultiSelect();
  renderAction();
  toastAction(count, items[0]);
}

export function getVisibleResourceIdsCore(deps) {
  const list = [];
  const currentResourceType = deps.getCurrentResourceType();
  const $ = deps.$;

  if (currentResourceType === "regex") {
    $("#cfm-regex-right-list")
      .find(".cfm-regex-script-row[data-script-id]")
      .each(function () {
        const id = $(this).attr("data-script-id");
        if (id) list.push(id);
      });
    return list;
  }

  if (currentResourceType === "chatlogs") {
    $("#cfm-chatlogs-right-list")
      .find(".cfm-chatlog-row[data-chat-file]")
      .each(function () {
        const id = $(this).attr("data-chat-file");
        if (id) list.push(id);
      });
    return list;
  }

  const container =
    currentResourceType === "chars"
      ? "#cfm-right-list"
      : currentResourceType === "presets"
        ? "#cfm-preset-right-list"
        : currentResourceType === "themes"
          ? "#cfm-theme-right-list"
          : currentResourceType === "backgrounds"
            ? "#cfm-bg-right-list"
            : currentResourceType === "personas"
              ? "#cfm-persona-right-list"
              : currentResourceType === "quickreply"
                ? "#cfm-qr-right-list"
                : "#cfm-worldinfo-right-list";

  $(container)
    .find(".cfm-row-char[data-res-id]")
    .each(function () {
      list.push($(this).attr("data-res-id"));
    });

  return list;
}

export function clearMultiSelectCore(deps) {
  deps.getMultiSelected().clear();
  deps.setMultiSelectLastClicked(null);
}

export function toggleMultiSelectItemCore(id, shiftKey, deps) {
  const selected = deps.getMultiSelected();

  if ((shiftKey || deps.getMultiSelectRangeMode()) && deps.getMultiSelectLastClicked()) {
    const visible = deps.getVisibleResourceIds();
    const lastIdx = visible.indexOf(deps.getMultiSelectLastClicked());
    const curIdx = visible.indexOf(id);
    if (lastIdx >= 0 && curIdx >= 0) {
      const start = Math.min(lastIdx, curIdx);
      const end = Math.max(lastIdx, curIdx);
      for (let i = start; i <= end; i++) {
        selected.add(visible[i]);
      }
    }
  } else {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  deps.setMultiSelectLastClicked(id);
}

export function selectAllVisibleCore(deps) {
  const visible = deps.getVisibleResourceIds();
  const selected = deps.getMultiSelected();
  const allSelected = visible.length > 0 && visible.every((id) => selected.has(id));

  if (allSelected) {
    visible.forEach((id) => selected.delete(id));
  } else {
    visible.forEach((id) => selected.add(id));
  }
}

export function getMultiDragDataCore(singleData, deps) {
  const selected = deps.getMultiSelected();
  if (!deps.getMultiSelectMode() || selected.size <= 1) return singleData;

  // 角色卡用 avatar，Persona 用 avatarId，其它资源用 name。
  const idKey = singleData.avatar || singleData.avatarId || singleData.name;
  if (!selected.has(idKey)) return singleData;

  return {
    ...singleData,
    multiSelect: true,
    selectedIds: Array.from(selected),
    count: selected.size,
  };
}
