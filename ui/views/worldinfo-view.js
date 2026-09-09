// Generated from index.js renderWorldInfoView + renderWiTreeNode (worldinfo view)
// 薄包装 Core：deps 注入所有外部依赖，state 承载可变状态
export async function renderWorldInfoViewCore(deps) {
  const renderWorldInfoView = () => deps.renderWorldInfoView();
  const state = deps.state;
  const {
    getResFolderTree,
    getResourceGroups,
    sortResFolders,
    getResChildFolders,
    countResItemsRecursive,
    getResFolderPath,
    getResTopLevelFolders,
    getVisibleResourceIds,
    getResFavorites,
    getResFolderIds,
    getResFolderDisplayName,
    sortResItems,
    getWorldInfoNames,
    getWorldInfoNote,
    getWorldInfoDisplayName,
    getActiveWorldInfoSet,
    getCharBoundWorldBooks,
    isWorldInfoEntryBookExpanded,
    openWorldInfoEditor,
    refreshWorldInfoPanelView,
    renderWorldInfoEntrySubList,
    collectWorldInfoNamesFromDom,
    bindWorldInfoEntryCollapseTargets,
    shouldIgnoreWorldInfoEntryTap,
    applyWorldInfoMultiActivation,
    cfmDebugDragLog,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    toggleWorldInfoActivation,
    toggleWorldInfoEntryBookExpanded,
    toggleWorldInfoNoteItem,
    toggleWorldInfoRenameItem,
    syncWiPresetTrackingForManualToggle,
    handleFolderTargetMove,
    setItemGroup,
    cfmToastr,
    promptRenameFolder,
    wouldCreateResCycle,
    reorderResFolder,
    clearMultiSelect,
    pcDragStart,
    pcDragEnd,
    pcGetDropData,
    executeWorldInfoSearch,
    executeWorldInfoNoteEdit,
    executeWorldInfoRename,
    selectAllVisible,
    isResFavorite,
    bindTouchSafeTap,
    prependResDeleteToolbar,
    prependExportToolbar,
    prependWorldInfoNoteToolbar,
    prependWorldInfoRenameToolbar,
    escapeHtml,
    getContext,
    setTimeout,
    $,
    getMultiDragData,
    touchDragMgr,
    getCurrentResourceType
  } = deps;
    const renderVersion = ++state._worldInfoRenderVersion;
    const leftTree = $("#cfm-worldinfo-left-tree");
    const rightList = $("#cfm-worldinfo-right-list");
    const pathEl = $("#cfm-worldinfo-rh-path");
    const countEl = $("#cfm-worldinfo-rh-count");

    let names;
    const hasExistingWorldInfoUi =
      leftTree.children().length > 0 || rightList.children().length > 0;
    // 优先从DOM同步读取（最快路径，无 await）
    const domNames = collectWorldInfoNamesFromDom();
    if (domNames.length > 0) {
      names = domNames;
      state._worldInfoNamesCache = domNames;
    } else if (
      Array.isArray(state._worldInfoNamesCache) &&
      state._worldInfoNamesCache.length > 0
    ) {
      // 缓存命中也走同步路径
      names = state._worldInfoNamesCache;
    } else {
      if (!hasExistingWorldInfoUi) {
        leftTree.empty();
        rightList.html(
          '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>',
        );
      }
      names = await (state._worldInfoPreloadPromise || getWorldInfoNames());
    }

    // 同步获取世界书激活状态和角色关联世界书（已改为同步函数，无需 await）
    const wiActiveSet = getActiveWorldInfoSet();
    const wiCharBound = getCharBoundWorldBooks();

    if (renderVersion !== state._worldInfoRenderVersion) return;

    const tree = getResFolderTree("worldinfo");
    const allFolderIds = getResFolderIds("worldinfo");
    const groups = getResourceGroups("worldinfo");

    // 注意：不再自动清理 groups 中的映射（同预设清理说明）。

    // 分类
    const folderItems = {};
    const ungrouped = [];
    for (const n of names) {
      const grp = groups[n];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(n);
      } else {
        ungrouped.push(n);
      }
    }

    const newLeftTree = $("<div></div>");

    // 递归渲染左侧树节点
    function renderWiTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "worldinfo",
        getResChildFolders("worldinfo", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = state.worldInfoExpandedNodes.has(folderId);
      const isSelected = state.selectedWorldInfoFolder === folderId;
      const count = countResItemsRecursive("worldinfo", folderId);
      const indent = 10 + depth * 16;

      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("worldinfo", folderId))}</span>
          <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
          <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);

      node.find(".cfm-tnode-target").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) =>
            items.forEach((n) => setItemGroup("worldinfo", n, folderId)),
          () => renderWorldInfoView(),
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个世界书移入「${getResFolderDisplayName("worldinfo", folderId)}」`
                : `已将「${first}」移入「${getResFolderDisplayName("worldinfo", folderId)}」`,
            ),
        );
      });

      node.find(".cfm-tnode-rename").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("worldinfo", folderId, () => renderWorldInfoView());
      });

      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (state.worldInfoExpandedNodes.has(folderId))
          state.worldInfoExpandedNodes.delete(folderId);
        else state.worldInfoExpandedNodes.add(folderId);
        renderWorldInfoView();
      });

      node.on("click", (e) => {
        e.preventDefault();
        state.selectedWorldInfoFolder = folderId;
        renderWorldInfoView();
      });

      // PC拖拽
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "worldinfo",
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
        const isWorldInfoItemDrag =
          data.type === "worldinfo" ||
          (data.type === "res-folder" && data.resType === "worldinfo");
        cfmDebugDragLog("presetTreeNode:dragover", {
          folderId,
          zone,
          dragData: data,
          isWorldInfoItemDrag,
          clientY: e.originalEvent?.clientY ?? null,
          rectTop: rect.top,
          rectHeight: rect.height,
          dropEffect: e.originalEvent?.dataTransfer?.dropEffect ?? null,
          effectAllowed: e.originalEvent?.dataTransfer?.effectAllowed ?? null,
          types: e.originalEvent?.dataTransfer?.types
            ? Array.from(e.originalEvent.dataTransfer.types)
            : [],
        });

        const isWorldInfoFolderDrag =
          data.type === "res-folder" && data.resType === "worldinfo";
        if (isWorldInfoItemDrag && (zone === "into" || isWorldInfoFolderDrag)) {
          state._pcLastResourceFolderHoverTarget = {
            groupType: "worldinfo",
            targetKind: "folder",
            folderId,
            zone,
          };
        } else if (
          !isWorldInfoItemDrag &&
          state._pcLastResourceFolderHoverTarget?.groupType === "worldinfo"
        ) {
          state._pcLastResourceFolderHoverTarget = null;
        }
        if (data.type === "res-folder" && data.resType === "worldinfo") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("worldinfo", data.id, folderId)
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
          data.resType === "worldinfo" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("worldinfo", data.id, folderId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("worldinfo", data.id, folderId, null);
            cfmToastr.success(
              `「${getResFolderDisplayName("worldinfo", data.id)}」已移入「${getResFolderDisplayName("worldinfo", folderId)}」`,
            );
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("worldinfo", data.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("worldinfo", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "worldinfo",
                getResChildFolders("worldinfo", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "worldinfo",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${data.id}」已排序`);
          }
          renderWorldInfoView();
        } else if (data.type === "worldinfo") {
          const wiNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const wCount = wiNames.length;
          wiNames.forEach((n) => setItemGroup("worldinfo", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderWorldInfoView();
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${getResFolderDisplayName("worldinfo", folderId)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("worldinfo", folderId)}」`,
          );
        }
      });

      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "worldinfo",
        id: folderId,
        name: folderId,
      }));

      container.append(node);

      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderWiTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }

    // 收藏入口
    const wiFavs = getResFavorites("worldinfo");
    const wiFavCount = names.filter((n) => wiFavs.includes(n)).length;
    const wiFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${state.selectedWorldInfoFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${wiFavCount}</span>
      </div>
    `);
    wiFavNode.on("click", (e) => {
      e.preventDefault();
      state.selectedWorldInfoFolder = "__favorites__";
      renderWorldInfoView();
    });
    newLeftTree.append(wiFavNode);

    const topFolders = sortResFolders(
      "worldinfo",
      getResTopLevelFolders("worldinfo"),
    );
    for (const fid of topFolders) renderWiTreeNode(newLeftTree, fid, 0);

    // 未归类入口
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedWorldInfoFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类世界书</span>
        <span class="cfm-tnode-target" title="移出所有文件夹"><i class="fa-solid fa-crosshairs"></i></span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((n) => setItemGroup("worldinfo", n, null)),
        () => renderWorldInfoView(),
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个世界书移出文件夹`
              : `已将「${first}」移出文件夹`,
          ),
      );
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      state.selectedWorldInfoFolder = "__ungrouped__";
      renderWorldInfoView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
      const data = state._pcDragData || {};
      if (data.type === "worldinfo") {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "worldinfo",
          targetKind: "ungrouped",
          zone: "into",
        };
      } else if (state._pcLastResourceFolderHoverTarget?.groupType === "worldinfo") {
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
      if (d?.type === "res-folder" && d.id && d.resType === "worldinfo") {
        reorderResFolder("worldinfo", d.id, null, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("worldinfo", d.id)}」已移出到根目录`,
        );
        renderWorldInfoView();
      } else if (d && d.type === "worldinfo") {
        const wiNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const wCount = wiNames.length;
        wiNames.forEach((n) => setItemGroup("worldinfo", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderWorldInfoView();
        cfmToastr.success(
          wCount > 1
            ? `已将 ${wCount} 个世界书移出文件夹`
            : `已将「${d.name}」移出文件夹`,
        );
      }
    });
    newLeftTree.append(uncatNode);

    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }

    // 右侧渲染
    // 如果搜索栏有内容，保持搜索模式（必须在 rightList.empty() 之前检查）
    const wiSearchQuery = $("#cfm-worldinfo-global-search").val();
    if (wiSearchQuery && wiSearchQuery.trim()) {
      leftTree.empty().append(newLeftTree.children());
      executeWorldInfoSearch();
      return;
    }

    const newRightList = $("<div></div>");

    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];

    if (state.selectedWorldInfoFolder === "__favorites__") {
      const favs = getResFavorites("worldinfo");
      displayItems = names.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (state.selectedWorldInfoFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类世界书";
    } else if (state.selectedWorldInfoFolder && tree[state.selectedWorldInfoFolder]) {
      displayItems = folderItems[state.selectedWorldInfoFolder] || [];
      childFolders = sortResFolders(
        "worldinfo",
        getResChildFolders("worldinfo", state.selectedWorldInfoFolder),
      );
      const path = getResFolderPath("worldinfo", state.selectedWorldInfoFolder)
        .map((id) => getResFolderDisplayName("worldinfo", id))
        .join(" › ");
      displayTitle = path;
    }

    // 应用右栏排序
    if (state.worldInfoRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(
        displayItems,
        state.worldInfoRightSortMode,
        (n) => n,
      );
    }

    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      state.selectedWorldInfoFolder === "__favorites__" ||
      state.selectedWorldInfoFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个世界书`);
    } else {
      countEl.text(state.selectedWorldInfoFolder ? `${totalItems} 项` : "");
    }

    if (!state.selectedWorldInfoFolder) {
      newRightList.append(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (
      state.selectedWorldInfoFolder === "__favorites__" &&
      totalItems === 0
    ) {
      newRightList.append(
        '<div class="cfm-right-empty">还没有收藏任何世界书<br><span style="font-size:12px;opacity:0.5;">点击世界书行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (
      state.selectedWorldInfoFolder === "__ungrouped__" &&
      totalItems === 0
    ) {
      newRightList.append(
        '<div class="cfm-right-empty">没有未归类的世界书</div>',
      );
    } else if (totalItems === 0) {
      newRightList.append('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("worldinfo", childId);
        const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("worldinfo", childId))}</div>
            <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
            <div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div>
            <div class="cfm-row-meta">${childCount} 个世界书</div>
          </div>
        `);
        row.find(".cfm-row-target-btn").on("click", (e) => {
          e.stopPropagation();
          handleFolderTargetMove(
            (items) =>
              items.forEach((n) => setItemGroup("worldinfo", n, childId)),
            () => renderWorldInfoView(),
            (count, first) =>
              cfmToastr.success(
                count > 1
                  ? `已将 ${count} 个世界书移入「${getResFolderDisplayName("worldinfo", childId)}」`
                  : `已将「${first}」移入「${getResFolderDisplayName("worldinfo", childId)}」`,
              ),
          );
        });
        row.find(".cfm-row-rename-btn").on("click", (e) => {
          e.stopPropagation();
          promptRenameFolder("worldinfo", childId, () => renderWorldInfoView());
        });
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("worldinfo", childId);
          for (const pid of path) state.worldInfoExpandedNodes.add(pid);
          state.selectedWorldInfoFolder = childId;
          renderWorldInfoView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "worldinfo",
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
          if (data.type === "res-folder" && data.resType === "worldinfo") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("worldinfo", data.id, childId)
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
            data.resType === "worldinfo" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("worldinfo", data.id, childId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("worldinfo", data.id, childId, null);
              cfmToastr.success(
                `「${getResFolderDisplayName("worldinfo", data.id)}」已移入「${getResFolderDisplayName("worldinfo", childId)}」`,
              );
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("worldinfo", data.id, pId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("worldinfo", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "worldinfo",
                  getResChildFolders("worldinfo", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "worldinfo",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              cfmToastr.success(`「${data.id}」已排序`);
            }
            renderWorldInfoView();
          } else if (data.type === "worldinfo") {
            const wiNames =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            const wCount = wiNames.length;
            wiNames.forEach((n) => setItemGroup("worldinfo", n, childId));
            if (data.multiSelect) clearMultiSelect();
            cfmToastr.success(
              wCount > 1
                ? `已将 ${wCount} 个世界书移入「${getResFolderDisplayName("worldinfo", childId)}」`
                : `已将「${data.name}」移入「${getResFolderDisplayName("worldinfo", childId)}」`,
            );
            renderWorldInfoView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "worldinfo",
          id: childId,
          name: getResFolderDisplayName("worldinfo", childId),
        }));
        newRightList.append(row);
      }
      // 世界书行（带星标 + 多选支持 + 备注 + 激活开关）
      for (const n of displayItems) {
        const wiDisplayName = getWorldInfoDisplayName(n);
        const fav = isResFavorite("worldinfo", n);
        const isMSel = state.cfmMultiSelectMode && state.cfmMultiSelected.has(n);
        const isExpSel = state.cfmExportMode && state.cfmExportSelected.has(n);
        const isDelSel = state.cfmResDeleteMode && state.cfmResDeleteSelected.has(n);
        const isNoteSel =
          state.cfmWorldInfoNoteMode && state.cfmWorldInfoNoteSelected.has(n);
        const isRenameSel =
          state.cfmWorldInfoRenameMode && state.cfmWorldInfoRenameSelected.has(n);
        const msCheckHtml = state.cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : state.cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : state.cfmWorldInfoNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : state.cfmWorldInfoRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : state.cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        // 备注信息
        const wiNote = getWorldInfoNote(n);
        const noteHtml = wiNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(wiNote)}">${escapeHtml(wiNote)}</span>`
          : "";
        // 非模式状态下显示单个备注编辑按钮和重命名按钮
        const noModeActive =
          !state.cfmExportMode &&
          !state.cfmResDeleteMode &&
          !state.cfmWorldInfoNoteMode &&
          !state.cfmWorldInfoRenameMode &&
          !state.cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        const isEntryExpanded = isWorldInfoEntryBookExpanded(n);
        const expandHtml = `<div class="cfm-char-detail-toggle cfm-preset-detail-toggle cfm-worldinfo-entry-expand" title="${isEntryExpanded ? "收起条目" : "展开条目"}"><i class="fa-solid fa-caret-${isEntryExpanded ? "down" : "right"}"></i></div>`;
        // 世界书激活开关
        const wiIsActive = wiActiveSet.has(n);
        const wiIsBound = wiCharBound.has(n);
        const toggleTitle = wiIsBound
          ? "角色关联世界书（不可手动切换）"
          : wiIsActive
            ? "点击取消激活"
            : "点击激活";
        const toggleHtml = `<div class="cfm-wi-toggle ${wiIsActive ? "cfm-wi-toggle-on" : ""} ${wiIsBound ? "cfm-wi-toggle-locked" : ""}" title="${toggleTitle}" data-wi-name="${escapeHtml(n)}"><i class="fa-solid fa-toggle-${wiIsActive ? "on" : "off"}"></i></div>`;
        const row = $(`
          <div class="cfm-row cfm-row-char ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}" draggable="true">
            ${msCheckHtml}
            ${toggleHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-book" style="font-size:20px;color:#a6e3a1;"></i></div>
            <div class="cfm-row-name"><span class="cfm-char-name-inline">${expandHtml}<span class="cfm-worldinfo-name-text" title="${escapeHtml(n)}">${escapeHtml(wiDisplayName)}</span></span>${noteHtml}</div>
            ${singleRenameBtn}
            ${singleNoteBtn}
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        row.find(".cfm-worldinfo-entry-expand").on("click touchend", (e) => {
          if (shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          state.cfmWorldInfoEntryLastFocusedName = n;
          toggleWorldInfoEntryBookExpanded(n);
          refreshWorldInfoPanelView();
        });
        // 世界书激活开关事件
        row.find(".cfm-wi-toggle").on("click touchend", function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (wiIsBound) {
            cfmToastr.warning("角色关联的世界书不可手动切换");
            return;
          }
          const newState = !wiActiveSet.has(n);
          toggleWorldInfoActivation(n, newState).then(() => {
            if (newState) wiActiveSet.add(n);
            else wiActiveSet.delete(n);
            syncWiPresetTrackingForManualToggle(n, newState);
            const el = $(this);
            el.toggleClass("cfm-wi-toggle-on", newState);
            el.find("i").attr(
              "class",
              `fa-solid fa-toggle-${newState ? "on" : "off"}`,
            );
            el.attr("title", newState ? "点击取消激活" : "点击激活");
          });
        });
        bindTouchSafeTap(row.find(".cfm-row-star"), () => {
          const nowFav = toggleResFavorite("worldinfo", n);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-worldinfo-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = names.filter((nn) =>
              getResFavorites("worldinfo").includes(nn),
            ).length;
            favCountEl.text(newCount);
          }
          if (state.selectedWorldInfoFolder === "__favorites__")
            refreshWorldInfoPanelView();
        });
        // 单个备注编辑按钮
        bindTouchSafeTap(row.find(".cfm-row-note-btn"), () => {
          executeWorldInfoNoteEdit([n]);
        });
        // 单个重命名按钮
        bindTouchSafeTap(row.find(".cfm-row-rename-btn"), () => {
          executeWorldInfoRename([n]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-wi-toggle, .cfm-worldinfo-entry-expand",
            ).length
          )
            return;
          if (state.cfmResDeleteMode) {
            toggleResDeleteItem(n, e.shiftKey);
            refreshWorldInfoPanelView();
            return;
          }
          if (state.cfmExportMode) {
            toggleExportItem(n, e.shiftKey);
            refreshWorldInfoPanelView();
            return;
          }
          if (state.cfmWorldInfoNoteMode) {
            toggleWorldInfoNoteItem(n, e.shiftKey);
            refreshWorldInfoPanelView();
            return;
          }
          if (state.cfmWorldInfoRenameMode) {
            toggleWorldInfoRenameItem(n, e.shiftKey);
            refreshWorldInfoPanelView();
            return;
          }
          if (state.cfmMultiSelectMode) {
            toggleMultiSelectItem(n, e.shiftKey);
            refreshWorldInfoPanelView();
            return;
          }
          openWorldInfoEditor(n);
        });
        row.on("dragstart", (e) => {
          const singleData = { type: "worldinfo", name: n };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "worldinfo", name: n };
          return getMultiDragData(singleData);
        });
        newRightList.append(row);
        if (isEntryExpanded)
          renderWorldInfoEntrySubList(row, n, refreshWorldInfoPanelView);
      }

      // 删除工具栏（世界书文件夹视图）
      prependResDeleteToolbar(newRightList, renderWorldInfoView);
      // 导出工具栏（世界书文件夹视图）
      prependExportToolbar(newRightList, renderWorldInfoView);
      // 备注编辑工具栏（世界书）
      prependWorldInfoNoteToolbar(newRightList, renderWorldInfoView);
      // 重命名工具栏（世界书）
      prependWorldInfoRenameToolbar(newRightList, renderWorldInfoView);
      // 多选工具栏（世界书）
      if (state.cfmMultiSelectMode && state.selectedWorldInfoFolder) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => state.cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${state.cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-activate" title="批量激活世界书"><i class="fa-solid fa-toggle-on"></i> 激活</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-deactivate" title="批量取消激活世界书"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
            <span class="cfm-multisel-count">${state.cfmMultiSelected.size > 0 ? `已选 ${state.cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderWorldInfoView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
          if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
          renderWorldInfoView();
        });
        toolbar
          .find(".cfm-multisel-activate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyWorldInfoMultiActivation(
              Array.from(state.cfmMultiSelected),
              true,
            );
            if (changed) renderWorldInfoView();
          });
        toolbar
          .find(".cfm-multisel-deactivate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyWorldInfoMultiActivation(
              Array.from(state.cfmMultiSelected),
              false,
            );
            if (changed) renderWorldInfoView();
          });
        newRightList.prepend(toolbar);
      }
      bindWorldInfoEntryCollapseTargets(refreshWorldInfoPanelView);
    }

    // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
    if (
      state.selectedWorldInfoFolder &&
      state.selectedWorldInfoFolder !== "__ungrouped__" &&
      state.selectedWorldInfoFolder !== "__favorites__" &&
      tree[state.selectedWorldInfoFolder]
    ) {
      const currentFolder = state.selectedWorldInfoFolder;
      rightList.off("dragover dragleave drop");
      rightList.on("dragover", (e) => {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = "move";
        if ($(e.target).closest(".cfm-row").length > 0) return;
        rightList.addClass("cfm-right-list-drop-target");
      });
      rightList.on("dragleave", (e) => {
        if (
          $(e.relatedTarget).closest("#cfm-worldinfo-right-list").length === 0
        ) {
          rightList.removeClass("cfm-right-list-drop-target");
        }
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
          data.resType === "worldinfo" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("worldinfo", data.id, currentFolder)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("worldinfo", data.id, currentFolder, null);
          cfmToastr.success(
            `「${getResFolderDisplayName("worldinfo", data.id)}」已移入「${getResFolderDisplayName("worldinfo", currentFolder)}」`,
          );
          renderWorldInfoView();
        } else if (data.type === "worldinfo") {
          const wiNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const wCount = wiNames.length;
          wiNames.forEach((n) => setItemGroup("worldinfo", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${getResFolderDisplayName("worldinfo", currentFolder)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("worldinfo", currentFolder)}」`,
          );
          renderWorldInfoView();
        }
      });
    }

    leftTree.empty().append(newLeftTree.children());
    rightList.empty().append(newRightList.children());
  }
