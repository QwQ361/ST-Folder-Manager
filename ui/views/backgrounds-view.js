// 背景视图组件层：承接 backgrounds 资源页的 DOM 组装、树/列表区域组合、方向设置入口和事件出口；背景业务保留在 features/backgrounds 与 features/appearance。

export function renderBackgroundsViewCore(deps) {
  const renderBackgroundsView = () => deps.renderBackgroundsView();
  const state = deps.state;
  const {
    $,
    BG_ORIENT_ICONS,
    BG_ORIENT_LABELS,
    applyBackground,
    autoDetectBgOrientations,
    bindTouchSafeTap,
    cfmToastr,
    clearMultiSelect,
    countResItemsRecursive,
    document,
    escapeHtml,
    executeBgNoteEdit,
    executeBgRename,
    executeBgSearch,
    getBackgroundDisplayName,
    getBackgroundNames,
    getBackgroundThumbnailUrl,
    getBgNote,
    getBgOrientation,
    getMultiDragData,
    getResChildFolders,
    getResFavorites,
    getResFolderDisplayName,
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
    prependBgNoteToolbar,
    prependBgRenameToolbar,
    prependExportToolbar,
    prependResDeleteToolbar,
    promptRenameFolder,
    reorderResFolder,
    selectAllVisible,
    setItemGroup,
    setTimeout,
    sortResFolders,
    sortResItems,
    toggleBgNoteItem,
    toggleBgRenameItem,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    touchDragMgr,
    updateDefaultBgBtnState,
    wouldCreateResCycle,
  } = deps;
  const getCurrentResourceType = deps.getCurrentResourceType;

    const leftTree = $("#cfm-bg-left-tree");
    const rightList = $("#cfm-bg-right-list");
    const pathEl = $("#cfm-bg-rh-path");
    const countEl = $("#cfm-bg-rh-count");
    leftTree.empty();
    const tree = getResFolderTree("backgrounds");
    const bgNames = getBackgroundNames();
    if (bgNames.length === 0) {
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 背景列表加载中...</div>',
      );
      if (!renderBackgroundsView._retryCount)
        renderBackgroundsView._retryCount = 0;
      if (renderBackgroundsView._retryCount < 10) {
        renderBackgroundsView._retryCount++;
        setTimeout(() => {
          if (getCurrentResourceType() === "backgrounds") renderBackgroundsView();
        }, 500);
      }
      return;
    }
    renderBackgroundsView._retryCount = 0;
    // 自动检测背景方向（异步，不阻塞渲染，仅对未检测过的执行）
    const undetected = bgNames.filter((n) => !getBgOrientation(n));
    if (undetected.length > 0) {
      autoDetectBgOrientations(undetected).then(() => {
        if (getCurrentResourceType() === "backgrounds") renderBackgroundsView();
      });
    }
    const groups = getResourceGroups("backgrounds");
    // 注意：不再自动清理 groups 中的映射（同预设清理说明）。
    const folderItems = {};
    const ungrouped = [];
    for (const name of bgNames) {
      const grp = groups[name];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(name);
      } else ungrouped.push(name);
    }
    const bgFavs = getResFavorites("backgrounds");
    const bgFavCount = bgNames.filter((n) => bgFavs.includes(n)).length;
    const bgFavNode = $(
      `<div class="cfm-tnode cfm-tnode-favorites ${state.selectedBgFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;"><span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span><span class="cfm-tnode-label">收藏</span><span class="cfm-tnode-count">${bgFavCount}</span></div>`,
    );
    bgFavNode.on("click", (e) => {
      e.preventDefault();
      state.selectedBgFolder = "__favorites__";
      renderBackgroundsView();
    });
    leftTree.append(bgFavNode);
    function renderBgTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "backgrounds",
        getResChildFolders("backgrounds", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = state.bgExpandedNodes.has(folderId);
      const isSelected = state.selectedBgFolder === folderId;
      const count = countResItemsRecursive("backgrounds", folderId);
      const indent = 10 + depth * 16;
      const node = $(
        `<div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true"><span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span><span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("backgrounds", folderId))}</span><span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span><span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span><span class="cfm-tnode-count">${count}</span></div>`,
      );
      node.find(".cfm-tnode-target").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) =>
            items.forEach((n) => setItemGroup("backgrounds", n, folderId)),
          () => renderBackgroundsView(),
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个背景移入「${getResFolderDisplayName("backgrounds", folderId)}」`
                : `已将「${getBackgroundDisplayName(first)}」移入「${getResFolderDisplayName("backgrounds", folderId)}」`,
            ),
        );
      });
      node.find(".cfm-tnode-rename").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("backgrounds", folderId, () =>
          renderBackgroundsView(),
        );
      });
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (state.bgExpandedNodes.has(folderId)) state.bgExpandedNodes.delete(folderId);
        else state.bgExpandedNodes.add(folderId);
        renderBackgroundsView();
      });
      node.on("click", (e) => {
        e.preventDefault();
        state.selectedBgFolder = folderId;
        renderBackgroundsView();
      });
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "backgrounds",
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
        const isBackgroundItemDrag =
          data.type === "background" ||
          (data.type === "res-folder" && data.resType === "backgrounds");
        const isBackgroundFolderDrag =
          data.type === "res-folder" && data.resType === "backgrounds";
        if (
          isBackgroundItemDrag &&
          (zone === "into" || isBackgroundFolderDrag)
        ) {
          state._pcLastResourceFolderHoverTarget = {
            groupType: "backgrounds",
            targetKind: "folder",
            folderId,
            zone,
          };
        } else if (
          !isBackgroundItemDrag &&
          state._pcLastResourceFolderHoverTarget?.groupType === "backgrounds"
        ) {
          state._pcLastResourceFolderHoverTarget = null;
        }
        if (data.type === "res-folder" && data.resType === "backgrounds") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("backgrounds", data.id, folderId)
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
          data.resType === "backgrounds" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("backgrounds", data.id, folderId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("backgrounds", data.id, folderId, null);
            cfmToastr.success(
              `「${getResFolderDisplayName("backgrounds", data.id)}」已移入「${getResFolderDisplayName("backgrounds", folderId)}」`,
            );
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("backgrounds", data.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("backgrounds", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "backgrounds",
                getResChildFolders("backgrounds", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "backgrounds",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${data.id}」已排序`);
          }
          renderBackgroundsView();
        } else if (data.type === "background") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("backgrounds", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderBackgroundsView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移入「${getResFolderDisplayName("backgrounds", folderId)}」`
              : `已将「${getBackgroundDisplayName(data.name)}」移入「${getResFolderDisplayName("backgrounds", folderId)}」`,
          );
        }
      });
      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "backgrounds",
        id: folderId,
        name: folderId,
      }));
      container.append(node);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderBgTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }
    const topFolders = sortResFolders(
      "backgrounds",
      getResTopLevelFolders("backgrounds"),
    );
    for (const fid of topFolders) renderBgTreeNode(leftTree, fid, 0);
    const uncatNode = $(
      `<div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedBgFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;"><span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span><span class="cfm-tnode-label">未归类背景</span><span class="cfm-tnode-target" title="移入此处"><i class="fa-solid fa-crosshairs"></i></span><span class="cfm-tnode-count">${ungrouped.length}</span></div>`,
    );
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((n) => setItemGroup("backgrounds", n, null)),
        () => renderBackgroundsView(),
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个背景移出文件夹`
              : `已将「${getBackgroundDisplayName(first)}」移出文件夹`,
          ),
      );
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      state.selectedBgFolder = "__ungrouped__";
      renderBackgroundsView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
      const data = state._pcDragData || {};
      if (data.type === "background") {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "backgrounds",
          targetKind: "ungrouped",
          zone: "into",
        };
      } else if (
        state._pcLastResourceFolderHoverTarget?.groupType === "backgrounds"
      ) {
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
      if (d?.type === "res-folder" && d.id && d.resType === "backgrounds") {
        reorderResFolder("backgrounds", d.id, null, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("backgrounds", d.id)}」已移出到根目录`,
        );
        renderBackgroundsView();
      } else if (d && d.type === "background") {
        const names = d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        names.forEach((n) => setItemGroup("backgrounds", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderBackgroundsView();
        cfmToastr.success(
          names.length > 1
            ? `已将 ${names.length} 个背景移出文件夹`
            : `已将「${getBackgroundDisplayName(d.name)}」移出文件夹`,
        );
      }
    });
    leftTree.append(uncatNode);
    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }
    const bgSearchQuery = $("#cfm-bg-global-search").val();
    if (bgSearchQuery && bgSearchQuery.trim()) {
      executeBgSearch();
      return;
    }
    rightList.empty();
    const currentBg = document.getElementById("bg1");
    const currentBgFile = currentBg
      ? currentBg.getAttribute("style") || ""
      : "";
    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];
    if (state.selectedBgFolder === "__favorites__") {
      const favs = getResFavorites("backgrounds");
      displayItems = bgNames.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (state.selectedBgFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类背景";
    } else if (state.selectedBgFolder && tree[state.selectedBgFolder]) {
      displayItems = folderItems[state.selectedBgFolder] || [];
      childFolders = sortResFolders(
        "backgrounds",
        getResChildFolders("backgrounds", state.selectedBgFolder),
      );
      displayTitle = getResFolderPath("backgrounds", state.selectedBgFolder)
        .map((id) => getResFolderDisplayName("backgrounds", id))
        .join(" › ");
    }
    if (state.bgRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(displayItems, state.bgRightSortMode, (n) => n);
    }
    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      state.selectedBgFolder === "__favorites__" ||
      state.selectedBgFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个背景`);
    } else {
      countEl.text(state.selectedBgFolder ? `${totalItems} 项` : "");
    }
    if (!state.selectedBgFolder) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (state.selectedBgFolder === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何背景<br><span style="font-size:12px;opacity:0.5;">点击背景行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (state.selectedBgFolder === "__ungrouped__" && totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">没有未归类的背景</div>');
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("backgrounds", childId);
        const row = $(
          `<div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true"><div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div><div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("backgrounds", childId))}</div><div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div><div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div><div class="cfm-row-meta">${childCount} 个背景</div></div>`,
        );
        row.find(".cfm-row-target-btn").on("click", (e) => {
          e.stopPropagation();
          handleFolderTargetMove(
            (items) =>
              items.forEach((n) => setItemGroup("backgrounds", n, childId)),
            () => renderBackgroundsView(),
            (count, first) =>
              cfmToastr.success(
                count > 1
                  ? `已将 ${count} 个背景移入「${getResFolderDisplayName("backgrounds", childId)}」`
                  : `已将「${getBackgroundDisplayName(first)}」移入「${getResFolderDisplayName("backgrounds", childId)}」`,
              ),
          );
        });
        row.find(".cfm-row-rename-btn").on("click", (e) => {
          e.stopPropagation();
          promptRenameFolder("backgrounds", childId, () =>
            renderBackgroundsView(),
          );
        });
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("backgrounds", childId);
          for (const pid of path) state.bgExpandedNodes.add(pid);
          state.selectedBgFolder = childId;
          renderBackgroundsView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "backgrounds",
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
          if (data.type === "res-folder" && data.resType === "backgrounds") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("backgrounds", data.id, childId)
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
            data.resType === "backgrounds" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("backgrounds", data.id, childId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("backgrounds", data.id, childId, null);
              cfmToastr.success(
                `「${getResFolderDisplayName("backgrounds", data.id)}」已移入「${getResFolderDisplayName("backgrounds", childId)}」`,
              );
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("backgrounds", data.id, pId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("backgrounds", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "backgrounds",
                  getResChildFolders("backgrounds", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "backgrounds",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              cfmToastr.success(`「${data.id}」已排序`);
            }
            renderBackgroundsView();
          } else if (data.type === "background") {
            const names =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            names.forEach((n) => setItemGroup("backgrounds", n, childId));
            if (data.multiSelect) clearMultiSelect();
            cfmToastr.success(
              names.length > 1
                ? `已将 ${names.length} 个背景移入「${getResFolderDisplayName("backgrounds", childId)}」`
                : `已将「${getBackgroundDisplayName(data.name)}」移入「${getResFolderDisplayName("backgrounds", childId)}」`,
            );
            renderBackgroundsView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "backgrounds",
          id: childId,
          name: getResFolderDisplayName("backgrounds", childId),
        }));
        rightList.append(row);
      }
      for (const name of displayItems) {
        const isActive =
          currentBgFile.includes(encodeURIComponent(name)) ||
          currentBgFile.includes(name);
        const fav = isResFavorite("backgrounds", name);
        const isMSel = state.cfmMultiSelectMode && state.cfmMultiSelected.has(name);
        const isExpSel = state.cfmExportMode && state.cfmExportSelected.has(name);
        const isDelSel = state.cfmResDeleteMode && state.cfmResDeleteSelected.has(name);
        const isNoteSel = state.cfmBgNoteMode && state.cfmBgNoteSelected.has(name);
        const isRenameSel = state.cfmBgRenameMode && state.cfmBgRenameSelected.has(name);
        const msCheckHtml = state.cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : state.cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : state.cfmBgNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : state.cfmBgRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : state.cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        const bgNote = getBgNote(name);
        const bgOrient = getBgOrientation(name);
        const orientHtml = bgOrient
          ? `<span class="cfm-bg-orient cfm-bg-orient-${bgOrient}" title="${BG_ORIENT_LABELS[bgOrient] || bgOrient}"><i class="fa-solid ${BG_ORIENT_ICONS[bgOrient] || "fa-expand"}"></i>${BG_ORIENT_LABELS[bgOrient] || bgOrient}</span>`
          : "";
        const noteHtml = bgNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(bgNote)}">${escapeHtml(bgNote)}</span>`
          : "";
        const noModeActive =
          !state.cfmExportMode &&
          !state.cfmResDeleteMode &&
          !state.cfmBgNoteMode &&
          !state.cfmBgRenameMode &&
          !state.cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        const thumbUrl = getBackgroundThumbnailUrl(name);
        const row = $(
          `<div class="cfm-row cfm-row-char cfm-row-bg ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">${msCheckHtml}<div class="cfm-row-icon cfm-bg-thumb" style="background-image:url('${thumbUrl}');background-size:cover;background-position:center;"></div><div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(getBackgroundDisplayName(name))}</span>${orientHtml}${noteHtml}</div>${singleRenameBtn}${singleNoteBtn}<div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div></div>`,
        );
        bindTouchSafeTap(row.find(".cfm-row-star"), () => {
          const nowFav = toggleResFavorite("backgrounds", name);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-bg-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            favCountEl.text(
              bgNames.filter((nn) =>
                getResFavorites("backgrounds").includes(nn),
              ).length,
            );
          }
          if (state.selectedBgFolder === "__favorites__") renderBackgroundsView();
        });
        bindTouchSafeTap(row.find(".cfm-row-note-btn"), () => {
          executeBgNoteEdit([name]);
        });
        // 单个重命名按钮
        bindTouchSafeTap(row.find(".cfm-row-rename-btn"), () => {
          executeBgRename([name]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
            ).length
          )
            return;
          if (state.cfmResDeleteMode) {
            toggleResDeleteItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (state.cfmExportMode) {
            toggleExportItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (state.cfmBgNoteMode) {
            toggleBgNoteItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (state.cfmBgRenameMode) {
            toggleBgRenameItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (state.cfmMultiSelectMode) {
            toggleMultiSelectItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          applyBackground(name);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          cfmToastr.success(`已应用背景「${getBackgroundDisplayName(name)}」`);
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, getMultiDragData({ type: "background", name }));
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () =>
          getMultiDragData({ type: "background", name }),
        );
        rightList.append(row);
      }
      // 删除工具栏
      prependResDeleteToolbar(rightList, renderBackgroundsView);
      // 导出工具栏
      prependExportToolbar(rightList, renderBackgroundsView);
      // 备注编辑工具栏
      prependBgNoteToolbar(rightList, renderBackgroundsView);
      // 重命名工具栏
      prependBgRenameToolbar(rightList, renderBackgroundsView);
      if (state.cfmMultiSelectMode && state.selectedBgFolder) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => state.cfmMultiSelected.has(id));
        const toolbar = $(
          `<div class="cfm-multisel-toolbar"><button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-multisel-range ${state.cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmMultiSelectRangeMode ? "(开)" : ""}</button><span class="cfm-multisel-count">${state.cfmMultiSelected.size > 0 ? `已选 ${state.cfmMultiSelected.size} 项` : ""}</span></div>`,
        );
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderBackgroundsView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
          if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
          renderBackgroundsView();
        });
        rightList.prepend(toolbar);
      }
    }
    if (
      state.selectedBgFolder &&
      state.selectedBgFolder !== "__ungrouped__" &&
      state.selectedBgFolder !== "__favorites__" &&
      tree[state.selectedBgFolder]
    ) {
      const currentFolder = state.selectedBgFolder;
      rightList.off("dragover dragleave drop");
      rightList.on("dragover", (e) => {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = "move";
        if ($(e.target).closest(".cfm-row").length > 0) return;
        rightList.addClass("cfm-right-list-drop-target");
      });
      rightList.on("dragleave", (e) => {
        if ($(e.relatedTarget).closest("#cfm-bg-right-list").length === 0)
          rightList.removeClass("cfm-right-list-drop-target");
      });
      rightList.on("drop", (e) => {
        rightList.removeClass("cfm-right-list-drop-target");
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        e.stopPropagation();
        const data = pcGetDropData(e);
        if (!data) return;
        if (
          data.type === "res-folder" &&
          data.resType === "backgrounds" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("backgrounds", data.id, currentFolder)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("backgrounds", data.id, currentFolder, null);
          cfmToastr.success(
            `「${getResFolderDisplayName("backgrounds", data.id)}」已移入「${getResFolderDisplayName("backgrounds", currentFolder)}」`,
          );
          renderBackgroundsView();
        } else if (data.type === "background") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("backgrounds", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移入「${getResFolderDisplayName("backgrounds", currentFolder)}」`
              : `已将「${getBackgroundDisplayName(data.name)}」移入「${getResFolderDisplayName("backgrounds", currentFolder)}」`,
          );
          renderBackgroundsView();
        }
      });
    }
    // 更新默认背景按钮状态
    updateDefaultBgBtnState();
  
}
