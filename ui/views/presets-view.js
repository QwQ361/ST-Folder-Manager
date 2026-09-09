// 预设视图组件层：承接 presets 资源页的 DOM 组装、树/列表区域组合和事件出口；预设备注与重命名业务保留在 features/presets。

export function renderPresetsViewCore(deps) {
const renderPresetsView = deps.renderPresetsView;
const state = deps.state;
const {
  $,
  applyPreset,
  bindTouchSafeTap,
  cfmDebugDragLog,
  cfmToastr,
  clearMultiSelect,
  countResItemsRecursive,
  escapeHtml,
  executePresetNoteEdit,
  executePresetRename,
  executePresetSearch,
  getContext,
  getCurrentPresets,
  getCurrentResourceType,
  getMultiDragData,
  getPresetNote,
  getResChildFolders,
  getResFavorites,
  getResFolderDisplayName,
  getResFolderIds,
  getResFolderPath,
  getResFolderTree,
  getResTopLevelFolders,
  getResourceGroups,
  getVisibleResourceIds,
  handleFolderTargetMove,
  isResFavorite,
  pcDragEnd,
  pcDragStart,
  pcGetDropData,
  prependExportToolbar,
  prependPresetNoteToolbar,
  prependPresetRenameToolbar,
  prependResDeleteToolbar,
  promptRenameFolder,
  recordTouchTapStart,
  renderPresetDetailSubList,
  renderPresetRegexSubList,
  reorderResFolder,
  selectAllVisible,
  setItemGroup,
  setTimeout,
  shouldIgnoreTouchTapAfterMove,
  sortResFolders,
  sortResItems,
  toggleExportItem,
  toggleMultiSelectItem,
  togglePresetNoteItem,
  togglePresetRenameItem,
  toggleResDeleteItem,
  toggleResFavorite,
  touchDragMgr,
  window,
  wouldCreateResCycle,
} = deps;
  const leftTree = $("#cfm-preset-left-tree");
  const rightList = $("#cfm-preset-right-list");
  const pathEl = $("#cfm-preset-rh-path");
  const countEl = $("#cfm-preset-rh-count");
  leftTree.empty();
  const tree = getResFolderTree("presets");
  const allFolderIds = getResFolderIds("presets");
  const presets = getCurrentPresets();

  // 预设管理器尚未就绪时显示提示并自动重试
  if (presets.length === 0) {
    const pm = getContext().getPresetManager();
    if (!pm || !pm.select) {
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 预设管理器加载中，请稍后再试...</div>',
      );
      if (!renderPresetsView._retryCount) renderPresetsView._retryCount = 0;
      if (renderPresetsView._retryCount < 20) {
        renderPresetsView._retryCount++;
        setTimeout(() => {
          if (getCurrentResourceType() === "presets") renderPresetsView();
        }, 500);
      }
      return;
    }
  }
  renderPresetsView._retryCount = 0;

  const groups = getResourceGroups("presets");

  // 注意：不再自动清理 groups 中的映射。
  // 原来的清理逻辑会在资源列表还没加载完、或页面刷新后将有效映射误删。
  // groups 中残留的无效映射不影响功能（因为对应资源不存在时不会显示），
  // 保留它们可以避免备份同步写入的文件夹分配被意外清除。

  // 分类：直接属于某文件夹的预设
  const folderItems = {};
  const ungrouped = [];
  for (const p of presets) {
    const grp = groups[p.name];
    if (grp && tree[grp]) {
      if (!folderItems[grp]) folderItems[grp] = [];
      folderItems[grp].push(p);
    } else {
      ungrouped.push(p);
    }
  }

  // 收藏入口
  const presetFavs = getResFavorites("presets");
  const presetFavCount = presets.filter((p) =>
    presetFavs.includes(p.name),
  ).length;
  const presetFavNode = $(`
    <div class="cfm-tnode cfm-tnode-favorites ${state.selectedPresetFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
      <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
      <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
      <span class="cfm-tnode-label">收藏</span>
      <span class="cfm-tnode-count">${presetFavCount}</span>
    </div>
  `);
  presetFavNode.on("click", (e) => {
    e.preventDefault();
    state.selectedPresetFolder = "__favorites__";
    renderPresetsView();
  });
  leftTree.append(presetFavNode);

  // 递归渲染左侧树节点
  function renderResTreeNode(container, folderId, depth) {
    const children = sortResFolders(
      "presets",
      getResChildFolders("presets", folderId),
    );
    const hasChildren = children.length > 0;
    const isExpanded = state.presetExpandedNodes.has(folderId);
    const isSelected = state.selectedPresetFolder === folderId;
    const count = countResItemsRecursive("presets", folderId);
    const indent = 10 + depth * 16;

    const node = $(`
      <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
        <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
        <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("presets", folderId))}</span>
        <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
        <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
        <span class="cfm-tnode-count">${count}</span>
      </div>
    `);

    node.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((n) => setItemGroup("presets", n, folderId)),
        () => renderPresetsView(),
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个预设移入「${getResFolderDisplayName("presets", folderId)}」`
              : `已将「${first}」移入「${getResFolderDisplayName("presets", folderId)}」`,
          ),
      );
    });
    node.find(".cfm-tnode-rename").on("click", (e) => {
      e.stopPropagation();
      promptRenameFolder("presets", folderId, () => renderPresetsView());
    });

    // 点击箭头展开/收起
    node.find(".cfm-tnode-arrow").on("click", (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      if (state.presetExpandedNodes.has(folderId))
        state.presetExpandedNodes.delete(folderId);
      else state.presetExpandedNodes.add(folderId);
      renderPresetsView();
    });

    // 点击选中
    node.on("click", (e) => {
      e.preventDefault();
      state.selectedPresetFolder = folderId;
      renderPresetsView();
    });

    // PC拖拽（文件夹排序/嵌套）
    node.on("dragstart", (e) => {
      pcDragStart(e, {
        type: "res-folder",
        resType: "presets",
        id: folderId,
      });
      node.addClass("cfm-dragging");
    });
    node.on("dragend", () => {
      node.removeClass("cfm-dragging");
      pcDragEnd();
      $(".cfm-tnode").removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
    });

    // 拖放目标（三区域）
    node[0].addEventListener(
      "drop",
      (event) => {
        cfmDebugDragLog("presetTreeNode:nativeDrop:capture", {
          folderId,
          targetClassName: event.target?.className || null,
          currentTargetClassName: event.currentTarget?.className || null,
          dropEffect: event.dataTransfer?.dropEffect ?? null,
          effectAllowed: event.dataTransfer?.effectAllowed ?? null,
          types: event.dataTransfer?.types
            ? Array.from(event.dataTransfer.types)
            : [],
        });
      },
      true,
    );
    node.on("dragover", (e) => {
      e.preventDefault();
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
      const rect = node[0].getBoundingClientRect();
      const relY = (e.originalEvent.clientY - rect.top) / rect.height;
      let zone = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "into";
      node.data("dropZone", zone);
      if (e.originalEvent?.dataTransfer) {
        e.originalEvent.dataTransfer.dropEffect = "move";
      }

      const data = state._pcDragData || {};
      const isPresetItemDrag =
        data.type === "preset" ||
        (data.type === "res-folder" && data.resType === "presets");
      const isPresetFolderDrag =
        data.type === "res-folder" && data.resType === "presets";
      if (isPresetItemDrag && (zone === "into" || isPresetFolderDrag)) {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "presets",
          targetKind: "folder",
          folderId,
          zone,
        };
        window._cfmLastResourceFolderHoverTarget =
          state._pcLastResourceFolderHoverTarget;
      } else if (
        !isPresetItemDrag &&
        state._pcLastResourceFolderHoverTarget?.groupType === "presets"
      ) {
        state._pcLastResourceFolderHoverTarget = null;
        window._cfmLastResourceFolderHoverTarget = null;
      }
      cfmDebugDragLog("presetTreeNode:dragover", {
        folderId,
        zone,
        dragData: data,
        isPresetItemDrag,
        hoverTargetSnapshot:
          isPresetItemDrag && zone === "into"
            ? {
                groupType: "presets",
                targetKind: "folder",
                folderId,
                zone,
              }
            : state._pcLastResourceFolderHoverTarget,
        lastResourceFolderHoverTarget: state._pcLastResourceFolderHoverTarget,
        clientY: e.originalEvent?.clientY ?? null,
        rectTop: rect.top,
        rectHeight: rect.height,
        dropEffect: e.originalEvent?.dataTransfer?.dropEffect ?? null,
        effectAllowed: e.originalEvent?.dataTransfer?.effectAllowed ?? null,
        types: e.originalEvent?.dataTransfer?.types
          ? Array.from(e.originalEvent.dataTransfer.types)
          : [],
      });

      if (data.type === "res-folder" && data.resType === "presets") {
        if (data.id === folderId) {
          node.addClass("cfm-drop-forbidden");
          return;
        }
        if (
          zone === "into" &&
          wouldCreateResCycle("presets", data.id, folderId)
        ) {
          node.addClass("cfm-drop-forbidden");
          return;
        }
      }

      if (zone === "before") node.addClass("cfm-drop-before");
      else if (zone === "after") node.addClass("cfm-drop-after");
      else node.addClass("cfm-drop-target");
    });
    node.on("dragleave", () =>
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      ),
    );
    node.on("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state._pcDropHandled = true;
      state._pcLastResourceFolderHoverTarget = null;
      $(".cfm-right-list-drop-target").removeClass(
        "cfm-right-list-drop-target",
      );
      const zone = node.data("dropZone") || "into";
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
      const data = pcGetDropData(e);
      if (!data) return;

      if (
        data.type === "res-folder" &&
        data.resType === "presets" &&
        data.id !== folderId
      ) {
        if (zone === "into") {
          if (wouldCreateResCycle("presets", data.id, folderId)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("presets", data.id, folderId, null);
          cfmToastr.success(
            `「${getResFolderDisplayName("presets", data.id)}」已移入「${getResFolderDisplayName("presets", folderId)}」`,
          );
        } else {
          const pId = tree[folderId]?.parentId || null;
          if (wouldCreateResCycle("presets", data.id, pId)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          if (zone === "before") {
            reorderResFolder("presets", data.id, pId, folderId);
          } else {
            const sibs = sortResFolders(
              "presets",
              getResChildFolders("presets", pId),
            );
            const ci = sibs.indexOf(folderId);
            reorderResFolder(
              "presets",
              data.id,
              pId,
              ci < sibs.length - 1 ? sibs[ci + 1] : null,
            );
          }
          cfmToastr.success(`「${data.id}」已排序`);
        }
        renderPresetsView();
      } else if (data.type === "preset") {
        const presetNames =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.name];
        const pCount = presetNames.length;
        presetNames.forEach((n) => setItemGroup("presets", n, folderId));
        if (data.multiSelect) clearMultiSelect();
        renderPresetsView();
        cfmToastr.success(
          pCount > 1
            ? `已将 ${pCount} 个预设移入「${getResFolderDisplayName("presets", folderId)}」`
            : `已将「${data.name}」移入「${getResFolderDisplayName("presets", folderId)}」`,
        );
      }
    });

    // 触摸拖拽
    touchDragMgr.bind(node, () => ({
      type: "res-folder",
      resType: "presets",
      id: folderId,
      name: folderId,
    }));

    container.append(node);

    if (hasChildren) {
      const childContainer = $(
        `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
      );
      for (const childId of children)
        renderResTreeNode(childContainer, childId, depth + 1);
      container.append(childContainer);
    }
  }

  // 渲染顶级文件夹
  const topFolders = sortResFolders(
    "presets",
    getResTopLevelFolders("presets"),
  );
  for (const fid of topFolders) renderResTreeNode(leftTree, fid, 0);

  // 未归类入口
  const uncatNode = $(`
    <div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedPresetFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
      <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
      <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
      <span class="cfm-tnode-label">未归类预设</span>
      <span class="cfm-tnode-target" title="移入此处"><i class="fa-solid fa-crosshairs"></i></span>
      <span class="cfm-tnode-count">${ungrouped.length}</span>
    </div>
  `);
  uncatNode.find(".cfm-tnode-target").on("click", (e) => {
    e.stopPropagation();
    handleFolderTargetMove(
      (items) => items.forEach((n) => setItemGroup("presets", n, null)),
      () => renderPresetsView(),
      (count, first) =>
        cfmToastr.success(
          count > 1
            ? `已将 ${count} 个预设移出文件夹`
            : `已将「${first}」移出文件夹`,
        ),
    );
  });
  uncatNode.on("click", (e) => {
    e.preventDefault();
    state.selectedPresetFolder = "__ungrouped__";
    renderPresetsView();
  });
  uncatNode.on("dragover", (e) => {
    e.preventDefault();
    uncatNode.addClass("cfm-drop-target");
    e.originalEvent.dataTransfer.dropEffect = "move";
    const data = state._pcDragData || {};
    if (data.type === "preset") {
      state._pcLastResourceFolderHoverTarget = {
        groupType: "presets",
        targetKind: "ungrouped",
        zone: "into",
      };
    } else if (state._pcLastResourceFolderHoverTarget?.groupType === "presets") {
      state._pcLastResourceFolderHoverTarget = null;
    }
  });
  uncatNode.on("dragleave", () => uncatNode.removeClass("cfm-drop-target"));
  uncatNode.on("drop", (e) => {
    e.preventDefault();
    state._pcDropHandled = true;
    state._pcLastResourceFolderHoverTarget = null;
    $(".cfm-right-list-drop-target").removeClass(
      "cfm-right-list-drop-target",
    );
    uncatNode.removeClass("cfm-drop-target");
    const d = pcGetDropData(e);
    if (d) {
      if (d.type === "res-folder" && d.id && d.resType === "presets") {
        reorderResFolder("presets", d.id, null, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("presets", d.id)}」已移出到根目录`,
        );
        renderPresetsView();
      } else if (d.type === "preset") {
        const presetNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const pCount = presetNames.length;
        presetNames.forEach((n) => setItemGroup("presets", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderPresetsView();
        cfmToastr.success(
          pCount > 1
            ? `已将 ${pCount} 个预设移出文件夹`
            : `已将「${d.name}」移出文件夹`,
        );
      }
    }
  });
  leftTree.append(uncatNode);

  if (topFolders.length === 0) {
    uncatNode.before(
      '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
    );
  }

  // 右侧渲染
  // 如果搜索栏有内容，保持搜索模式（必须在 rightList.empty() 之前检查）
  const presetSearchQuery = $("#cfm-preset-global-search").val();
  if (presetSearchQuery && presetSearchQuery.trim()) {
    executePresetSearch();
    return;
  }

  rightList.empty();

  const pm = getContext().getPresetManager();
  const currentVal = pm && pm.select ? pm.select.val() : null;

  let displayItems = [];
  let displayTitle = "选择左侧文件夹查看内容";
  let childFolders = [];

  if (state.selectedPresetFolder === "__favorites__") {
    const favs = getResFavorites("presets");
    displayItems = presets.filter((p) => favs.includes(p.name));
    displayTitle = "⭐ 收藏";
  } else if (state.selectedPresetFolder === "__ungrouped__") {
    displayItems = ungrouped;
    displayTitle = "未归类预设";
  } else if (state.selectedPresetFolder && tree[state.selectedPresetFolder]) {
    displayItems = folderItems[state.selectedPresetFolder] || [];
    childFolders = sortResFolders(
      "presets",
      getResChildFolders("presets", state.selectedPresetFolder),
    );
    const path = getResFolderPath("presets", state.selectedPresetFolder)
      .map((id) => getResFolderDisplayName("presets", id))
      .join(" › ");
    displayTitle = path;
  }

  // 应用右栏排序
  if (state.presetRightSortMode && displayItems.length > 0) {
    displayItems = sortResItems(displayItems, state.presetRightSortMode, (p) =>
      typeof p === "string" ? p : p.name,
    );
  }

  pathEl.text(displayTitle);
  const totalItems = childFolders.length + displayItems.length;
  if (
    state.selectedPresetFolder === "__favorites__" ||
    state.selectedPresetFolder === "__ungrouped__"
  ) {
    countEl.text(`${displayItems.length} 个预设`);
  } else {
    countEl.text(state.selectedPresetFolder ? `${totalItems} 项` : "");
  }

  if (!state.selectedPresetFolder) {
    rightList.html(
      '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
    );
  } else if (state.selectedPresetFolder === "__favorites__" && totalItems === 0) {
    rightList.html(
      '<div class="cfm-right-empty">还没有收藏任何预设<br><span style="font-size:12px;opacity:0.5;">点击预设行右侧的 ☆ 按钮添加收藏</span></div>',
    );
  } else if (state.selectedPresetFolder === "__ungrouped__" && totalItems === 0) {
    rightList.html('<div class="cfm-right-empty">没有未归类的预设</div>');
  } else if (totalItems === 0) {
    rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
  } else {
    // 子文件夹行
    for (const childId of childFolders) {
      const childCount = countResItemsRecursive("presets", childId);
      // 正则模式下：如果目标预设在此子文件夹的路径上，高亮文件夹
      const presetFolderRegexHighlight =
        state.cfmPresetRegexMode && state.cfmPresetRegexHighlightPath.includes(childId)
          ? "cfm-regex-target-folder"
          : "";
      const row = $(`
        <div class="cfm-row cfm-row-folder ${presetFolderRegexHighlight}" data-folder-id="${escapeHtml(childId)}" draggable="true">
          <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
          <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("presets", childId))}</div>
          <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
          <div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div>
          <div class="cfm-row-meta">${childCount} 个预设</div>
        </div>
      `);
      row.find(".cfm-row-target-btn").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) =>
            items.forEach((n) => setItemGroup("presets", n, childId)),
          () => renderPresetsView(),
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个预设移入「${getResFolderDisplayName("presets", childId)}」`
                : `已将「${first}」移入「${getResFolderDisplayName("presets", childId)}」`,
            ),
        );
      });
      row.find(".cfm-row-rename-btn").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("presets", childId, () => renderPresetsView());
      });
      row.on("click", (e) => {
        e.preventDefault();
        const path = getResFolderPath("presets", childId);
        for (const pid of path) state.presetExpandedNodes.add(pid);
        state.selectedPresetFolder = childId;
        renderPresetsView();
      });
      row.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "presets",
          id: childId,
        });
        row.addClass("cfm-dragging");
      });
      row.on("dragend", () => {
        row.removeClass("cfm-dragging");
        pcDragEnd();
        $(".cfm-row").removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
      });
      // 右侧子文件夹行也是拖放目标（三区域：before/into/after）
      row.on("dragover", (e) => {
        e.preventDefault();
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
        const rect = row[0].getBoundingClientRect();
        const relY = (e.originalEvent.clientY - rect.top) / rect.height;
        let zone = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "into";
        row.data("dropZone", zone);
        const data = state._pcDragData || {};
        if (data.type === "res-folder" && data.resType === "presets") {
          if (data.id === childId) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("presets", data.id, childId)
          ) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
        }
        if (zone === "before") row.addClass("cfm-drop-before");
        else if (zone === "after") row.addClass("cfm-drop-after");
        else row.addClass("cfm-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      row.on("dragleave", () => {
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
      });
      row.on("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        $(".cfm-right-list-drop-target").removeClass(
          "cfm-right-list-drop-target",
        );
        const zone = row.data("dropZone") || "into";
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
        const data = pcGetDropData(e);
        if (!data) return;
        if (
          data.type === "res-folder" &&
          data.resType === "presets" &&
          data.id !== childId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("presets", data.id, childId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("presets", data.id, childId, null);
            cfmToastr.success(
              `「${getResFolderDisplayName("presets", data.id)}」已移入「${getResFolderDisplayName("presets", childId)}」`,
            );
          } else {
            const pId = tree[childId]?.parentId || null;
            if (wouldCreateResCycle("presets", data.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("presets", data.id, pId, childId);
            } else {
              const sibs = sortResFolders(
                "presets",
                getResChildFolders("presets", pId),
              );
              const ci = sibs.indexOf(childId);
              reorderResFolder(
                "presets",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${data.id}」已排序`);
          }
          renderPresetsView();
        } else if (data.type === "preset") {
          const presetNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const pCount = presetNames.length;
          presetNames.forEach((n) => setItemGroup("presets", n, childId));
          if (data.multiSelect) clearMultiSelect();
          cfmToastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${getResFolderDisplayName("presets", childId)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("presets", childId)}」`,
          );
          renderPresetsView();
        }
      });
      touchDragMgr.bind(row, () => ({
        type: "res-folder",
        resType: "presets",
        id: childId,
        name: getResFolderDisplayName("presets", childId),
      }));
      rightList.append(row);
    }
    // 预设行（带星标 + 多选支持 + 备注）
    for (const p of displayItems) {
      const isActive = p.value === currentVal;
      const fav = isResFavorite("presets", p.name);
      const isMSel = state.cfmMultiSelectMode && state.cfmMultiSelected.has(p.name);
      const isExpSel = state.cfmExportMode && state.cfmExportSelected.has(p.name);
      const isDelSel = state.cfmResDeleteMode && state.cfmResDeleteSelected.has(p.name);
      const isNoteSel =
        state.cfmPresetNoteMode && state.cfmPresetNoteSelected.has(p.name);
      const isRenameSel =
        state.cfmPresetRenameMode && state.cfmPresetRenameSelected.has(p.name);
      const msCheckHtml = state.cfmResDeleteMode
        ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
        : state.cfmExportMode
          ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
          : state.cfmPresetNoteMode
            ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
            : state.cfmPresetRenameMode
              ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
              : state.cfmMultiSelectMode
                ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                : "";
      // 备注信息
      const presetNote = getPresetNote(p.name);
      const noteHtml = presetNote
        ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(presetNote)}">${escapeHtml(presetNote)}</span>`
        : "";
      // 非模式状态下显示单个备注编辑按钮和重命名按钮
      const noModeActive =
        !state.cfmExportMode &&
        !state.cfmResDeleteMode &&
        !state.cfmPresetNoteMode &&
        !state.cfmPresetRenameMode &&
        !state.cfmMultiSelectMode;
      const singleNoteBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
      const singleRenameBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
        : "";
      // 正则模式下的小三角按钮（有正则脚本的预设，或当前目标空预设，也显示）
      const isPresetRegexTarget =
        state.cfmPresetRegexMode && state.cfmPresetRegexTargetName === p.name;
      let showPresetRegexToggle = false;
      let presetRegexScripts = null;
      if (state.cfmPresetRegexMode) {
        try {
          const pm = getContext().getPresetManager();
          if (pm) {
            presetRegexScripts = pm.readPresetExtensionField({
              name: p.name,
              path: "regex_scripts",
            });
          }
        } catch (e) {
          /* skip */
        }
        showPresetRegexToggle =
          (Array.isArray(presetRegexScripts) &&
            presetRegexScripts.length > 0) ||
          isPresetRegexTarget;
      }
      const isPresetRegexExpanded =
        showPresetRegexToggle && state.cfmPresetRegexExpandedNames.has(p.name);
      const presetRegexToggleHtml = showPresetRegexToggle
        ? `<div class="cfm-regex-toggle" title="展开/折叠正则脚本"><i class="fa-solid fa-caret-${isPresetRegexExpanded ? "down" : "right"}"></i></div>`
        : "";
      const presetRegexHighlightClass = isPresetRegexTarget
        ? "cfm-regex-target-row"
        : "";
      const isPresetDetailExpanded = state.cfmPresetDetailExpandedNames.has(p.name);
      const presetDetailToggleHtml = `<div class="cfm-char-detail-toggle cfm-preset-detail-toggle" title="展开/折叠预设详情"><i class="fa-solid fa-caret-${isPresetDetailExpanded ? "down" : "right"}"></i></div>`;
      const row = $(`
        <div class="cfm-row cfm-row-char ${presetRegexHighlightClass} ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-value="${escapeHtml(p.value)}" data-res-id="${escapeHtml(p.name)}" draggable="true">
          ${msCheckHtml}
          ${presetRegexToggleHtml}
          <div class="cfm-row-icon"><i class="fa-solid fa-file-lines" style="font-size:20px;color:#8b9dfc;"></i></div>
          <div class="cfm-row-name"><span class="cfm-char-name-inline">${presetDetailToggleHtml}<span class="cfm-preset-name-text">${escapeHtml(p.name)}</span></span>${noteHtml}</div>
          ${singleRenameBtn}
          ${singleNoteBtn}
          <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
        </div>
      `);
      bindTouchSafeTap(row.find(".cfm-row-star"), () => {
        const nowFav = toggleResFavorite("presets", p.name);
        const starEl = row.find(".cfm-row-star");
        starEl.toggleClass("cfm-star-active", nowFav);
        starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
        starEl
          .find("i")
          .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
        // 更新左侧收藏计数
        const favCountEl = $(
          "#cfm-preset-left-tree .cfm-tnode-favorites .cfm-tnode-count",
        );
        if (favCountEl.length) {
          const newCount = presets.filter((pp) =>
            getResFavorites("presets").includes(pp.name),
          ).length;
          favCountEl.text(newCount);
        }
        if (state.selectedPresetFolder === "__favorites__") renderPresetsView();
      });
      // 单个备注编辑按钮
      bindTouchSafeTap(row.find(".cfm-row-note-btn"), () => {
        executePresetNoteEdit([p.name]);
      });
      // 单个重命名按钮
      bindTouchSafeTap(row.find(".cfm-row-rename-btn"), () => {
        executePresetRename([p.name]);
      });
      // 正则模式下小三角点击：展开/折叠正则脚本
      bindTouchSafeTap(row.find(".cfm-regex-toggle"), () => {
        const name = p.name;
        if (state.cfmPresetRegexExpandedNames.has(name)) {
          // 折叠
          state.cfmPresetRegexExpandedNames.delete(name);
          row.next(".cfm-regex-sublist").slideUp(150, function () {
            $(this).remove();
          });
          row
            .find(".cfm-regex-toggle i")
            .removeClass("fa-caret-down")
            .addClass("fa-caret-right");
        } else {
          // 展开
          state.cfmPresetRegexExpandedNames.add(name);
          row
            .find(".cfm-regex-toggle i")
            .removeClass("fa-caret-right")
            .addClass("fa-caret-down");
          const scripts = presetRegexScripts || [];
          renderPresetRegexSubList(row, name, scripts, isPresetRegexTarget);
          row.next(".cfm-regex-sublist").hide().slideDown(150);
        }
      });
      row
        .find(".cfm-preset-detail-toggle")
        .on("touchstart", (e) =>
          recordTouchTapStart(e, "cfmPresetDetailToggleTap"),
        )
        .on("click touchend", (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailToggleTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const name = p.name;
          const detailSubList = row
            .nextAll(".cfm-preset-detail-sublist")
            .first();
          if (state.cfmPresetDetailExpandedNames.has(name)) {
            state.cfmPresetDetailExpandedNames.delete(name);
            detailSubList.slideUp(150, function () {
              $(this).remove();
            });
            row
              .find(".cfm-preset-detail-toggle i")
              .removeClass("fa-caret-down")
              .addClass("fa-caret-right");
          } else {
            state.cfmPresetDetailExpandedNames.add(name);
            row
              .find(".cfm-preset-detail-toggle i")
              .removeClass("fa-caret-right")
              .addClass("fa-caret-down");
            renderPresetDetailSubList(row, p);
            row
              .nextAll(".cfm-preset-detail-sublist")
              .first()
              .hide()
              .slideDown(150);
          }
        });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-regex-toggle, .cfm-preset-detail-toggle",
          ).length
        )
          return;
        if (state.cfmResDeleteMode) {
          toggleResDeleteItem(p.name, e.shiftKey);
          renderPresetsView();
          return;
        }
        if (state.cfmExportMode) {
          toggleExportItem(p.name, e.shiftKey);
          renderPresetsView();
          return;
        }
        if (state.cfmPresetNoteMode) {
          togglePresetNoteItem(p.name, e.shiftKey);
          renderPresetsView();
          return;
        }
        if (state.cfmPresetRenameMode) {
          togglePresetRenameItem(p.name, e.shiftKey);
          renderPresetsView();
          return;
        }
        if (state.cfmMultiSelectMode) {
          toggleMultiSelectItem(p.name, e.shiftKey);
          renderPresetsView();
          return;
        }
        applyPreset(p.value);
        rightList
          .find(".cfm-rv-item-active")
          .removeClass("cfm-rv-item-active");
        row.addClass("cfm-rv-item-active");
        cfmToastr.success(`已应用预设「${p.name}」`);
      });
      row.on("dragstart", (e) => {
        const singleData = { type: "preset", name: p.name, value: p.value };
        const dragData = getMultiDragData(singleData);
        pcDragStart(e, dragData);
      });
      row.on("dragend", () => pcDragEnd());
      touchDragMgr.bind(row, () => {
        const singleData = { type: "preset", name: p.name, value: p.value };
        return getMultiDragData(singleData);
      });
      rightList.append(row);
      // 正则模式下，如果该预设已展开，则立即渲染正则子列表（目标预设允许为空）
      if (showPresetRegexToggle && state.cfmPresetRegexExpandedNames.has(p.name)) {
        const scripts = presetRegexScripts || [];
        renderPresetRegexSubList(row, p.name, scripts, isPresetRegexTarget);
      }
      if (state.cfmPresetDetailExpandedNames.has(p.name)) {
        renderPresetDetailSubList(row, p);
      }
    }

    // 删除工具栏（预设文件夹视图）
    prependResDeleteToolbar(rightList, renderPresetsView);
    // 导出工具栏（预设文件夹视图）
    prependExportToolbar(rightList, renderPresetsView);
    // 备注编辑工具栏（预设）
    prependPresetNoteToolbar(rightList, renderPresetsView);
    // 重命名工具栏（预设）
    prependPresetRenameToolbar(rightList, renderPresetsView);
    // 多选工具栏（预设）
    if (state.cfmMultiSelectMode && state.selectedPresetFolder) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => state.cfmMultiSelected.has(id));
      const toolbar = $(`
        <div class="cfm-multisel-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${state.cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmMultiSelectRangeMode ? "(开)" : ""}</button>
          <span class="cfm-multisel-count">${state.cfmMultiSelected.size > 0 ? `已选 ${state.cfmMultiSelected.size} 项` : ""}</span>
        </div>
      `);
      toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectAllVisible();
        renderPresetsView();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
        if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
        renderPresetsView();
      });
      rightList.prepend(toolbar);
    }
  }

  // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
  if (
    state.selectedPresetFolder &&
    state.selectedPresetFolder !== "__ungrouped__" &&
    state.selectedPresetFolder !== "__favorites__" &&
    tree[state.selectedPresetFolder]
  ) {
    const currentFolder = state.selectedPresetFolder;
    rightList.off("dragover dragleave drop");
    rightList.on("dragover", (e) => {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = "move";
      if ($(e.target).closest(".cfm-preset-detail-sublist").length > 0) {
        rightList.removeClass("cfm-right-list-drop-target");
        return;
      }
      if ($(e.target).closest(".cfm-row").length > 0) return;
      rightList.addClass("cfm-right-list-drop-target");
    });
    rightList.on("dragleave", (e) => {
      if ($(e.target).closest(".cfm-preset-detail-sublist").length > 0) {
        rightList.removeClass("cfm-right-list-drop-target");
        return;
      }
      if ($(e.relatedTarget).closest("#cfm-preset-right-list").length === 0) {
        rightList.removeClass("cfm-right-list-drop-target");
      }
    });
    rightList.on("drop", (e) => {
      rightList.removeClass("cfm-right-list-drop-target");
      if ($(e.target).closest(".cfm-preset-detail-sublist").length > 0)
        return;
      if ($(e.target).closest(".cfm-row").length > 0) return;
      e.preventDefault();
      e.stopPropagation();
      const data = pcGetDropData(e);
      if (!data) return;
      if (
        data.type === "res-folder" &&
        data.resType === "presets" &&
        data.id !== currentFolder
      ) {
        if (wouldCreateResCycle("presets", data.id, currentFolder)) {
          cfmToastr.error("循环嵌套，已阻止");
          return;
        }
        reorderResFolder("presets", data.id, currentFolder, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("presets", data.id)}」已移入「${getResFolderDisplayName("presets", currentFolder)}」`,
        );
        renderPresetsView();
      } else if (data.type === "preset") {
        const presetNames =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.name];
        const pCount = presetNames.length;
        presetNames.forEach((n) => setItemGroup("presets", n, currentFolder));
        if (data.multiSelect) clearMultiSelect();
        cfmToastr.success(
          pCount > 1
            ? `已将 ${pCount} 个预设移入「${getResFolderDisplayName("presets", currentFolder)}」`
            : `已将「${data.name}」移入「${getResFolderDisplayName("presets", currentFolder)}」`,
        );
        renderPresetsView();
      }
    });
  }
}
