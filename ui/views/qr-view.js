// 快速回复集视图组件层：承接 quickreply 资源页的 DOM 组装、树/列表区域组合和事件出口；QR 备注、重命名与激活预设逻辑保留在 features/quickreply。

export async function renderQRViewCore(deps) {
  const renderQRView = deps.renderQRView;
  const state = deps.state;
  const {
    $,
    applyQrMultiActivation,
    bindTouchSafeTap,
    cfmToastr,
    clearMultiSelect,
    countResItemsRecursive,
    escapeHtml,
    executeQrRename,
    executeQrSearch,
    getActiveQrSets,
    getMultiDragData,
    getQrNote,
    getQrSetItems,
    getQrSetNames,
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
    openQrItemEditor,
    openQrSetEditor,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    prependExportToolbar,
    prependQrNoteToolbar,
    prependQrRenameToolbar,
    prependResDeleteToolbar,
    prompt,
    promptRenameFolder,
    reorderResFolder,
    selectAllVisible,
    setItemGroup,
    setQrNote,
    sortResFolders,
    sortResItems,
    syncQrPresetTrackingForManualToggle,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleQrNoteItem,
    toggleQrRenameItem,
    toggleQrSetActivation,
    toggleResDeleteItem,
    toggleResFavorite,
    touchDragMgr,
    wouldCreateResCycle,
  } = deps;
    const leftTree = $("#cfm-qr-left-tree");
    const rightList = $("#cfm-qr-right-list");
    const pathEl = $("#cfm-qr-rh-path");
    const countEl = $("#cfm-qr-rh-count");

    const names = getQrSetNames();
    const hasAnyQrSets = names.length > 0;

    // 获取快速回复激活状态
    const qrActiveSet = getActiveQrSets();

    leftTree.empty();
    const tree = getResFolderTree("quickreply");
    const allFolderIds = getResFolderIds("quickreply");
    const groups = getResourceGroups("quickreply");

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

    leftTree.empty();

    // 递归渲染左侧树节点
    function renderQrTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "quickreply",
        getResChildFolders("quickreply", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = state.qrExpandedNodes.has(folderId);
      const isSelected = state.selectedQrFolder === folderId;
      const count = countResItemsRecursive("quickreply", folderId);
      const indent = 10 + depth * 16;

      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("quickreply", folderId))}</span>
          <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
          <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);

      node.find(".cfm-tnode-target").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) =>
            items.forEach((n) => setItemGroup("quickreply", n, folderId)),
          () => renderQRView(),
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个快速回复集移入「${getResFolderDisplayName("quickreply", folderId)}」`
                : `已将「${first}」移入「${getResFolderDisplayName("quickreply", folderId)}」`,
            ),
        );
      });

      node.find(".cfm-tnode-rename").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("quickreply", folderId, () => renderQRView());
      });

      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (state.qrExpandedNodes.has(folderId)) state.qrExpandedNodes.delete(folderId);
        else state.qrExpandedNodes.add(folderId);
        renderQRView();
      });

      node.on("click", (e) => {
        e.preventDefault();
        state.selectedQrFolder = folderId;
        renderQRView();
      });

      // PC拖拽
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "quickreply",
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
        const isQuickReplyItemDrag =
          data.type === "quickreply" ||
          (data.type === "res-folder" && data.resType === "quickreply");
        const isQuickReplyFolderDrag =
          data.type === "res-folder" && data.resType === "quickreply";
        if (
          isQuickReplyItemDrag &&
          (zone === "into" || isQuickReplyFolderDrag)
        ) {
          state._pcLastResourceFolderHoverTarget = {
            groupType: "quickreply",
            targetKind: "folder",
            folderId,
            zone,
          };
        } else if (
          !isQuickReplyItemDrag &&
          state._pcLastResourceFolderHoverTarget?.groupType === "quickreply"
        ) {
          state._pcLastResourceFolderHoverTarget = null;
        }
        if (data.type === "res-folder" && data.resType === "quickreply") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("quickreply", data.id, folderId)
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
          data.resType === "quickreply" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("quickreply", data.id, folderId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("quickreply", data.id, folderId, null);
            cfmToastr.success(
              `「${getResFolderDisplayName("quickreply", data.id)}」已移入「${getResFolderDisplayName("quickreply", folderId)}」`,
            );
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("quickreply", data.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("quickreply", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "quickreply",
                getResChildFolders("quickreply", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "quickreply",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${data.id}」已排序`);
          }
          renderQRView();
        } else if (data.type === "quickreply") {
          const qrNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const wCount = qrNames.length;
          qrNames.forEach((n) => setItemGroup("quickreply", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderQRView();
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个快速回复集移入「${getResFolderDisplayName("quickreply", folderId)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("quickreply", folderId)}」`,
          );
        }
      });

      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "quickreply",
        id: folderId,
        name: folderId,
      }));

      container.append(node);

      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderQrTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }

    // 收藏入口
    const qrFavs = getResFavorites("quickreply");
    const qrFavCount = names.filter((n) => qrFavs.includes(n)).length;
    const qrFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${state.selectedQrFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${qrFavCount}</span>
      </div>
    `);
    qrFavNode.on("click", (e) => {
      e.preventDefault();
      state.selectedQrFolder = "__favorites__";
      renderQRView();
    });
    leftTree.append(qrFavNode);

    const topFolders = sortResFolders(
      "quickreply",
      getResTopLevelFolders("quickreply"),
    );
    for (const fid of topFolders) renderQrTreeNode(leftTree, fid, 0);

    // 未归类入口
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedQrFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类快速回复集</span>
        <span class="cfm-tnode-target" title="移出所有文件夹"><i class="fa-solid fa-crosshairs"></i></span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((n) => setItemGroup("quickreply", n, null)),
        () => renderQRView(),
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个快速回复集移出文件夹`
              : `已将「${first}」移出文件夹`,
          ),
      );
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      state.selectedQrFolder = "__ungrouped__";
      renderQRView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
      const data = state._pcDragData || {};
      if (data.type === "quickreply") {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "quickreply",
          targetKind: "ungrouped",
          zone: "into",
        };
      } else if (state._pcLastResourceFolderHoverTarget?.groupType === "quickreply") {
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
      if (d?.type === "res-folder" && d.id && d.resType === "quickreply") {
        reorderResFolder("quickreply", d.id, null, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("quickreply", d.id)}」已移出到根目录`,
        );
        renderQRView();
      } else if (d && d.type === "quickreply") {
        const qrNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const wCount = qrNames.length;
        qrNames.forEach((n) => setItemGroup("quickreply", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderQRView();
        cfmToastr.success(
          wCount > 1
            ? `已将 ${wCount} 个快速回复集移出文件夹`
            : `已将「${d.name}」移出文件夹`,
        );
      }
    });
    leftTree.append(uncatNode);

    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }

    // 右侧渲染
    // 如果搜索栏有内容，保持搜索模式
    const qrSearchQuery = $("#cfm-qr-global-search").val();
    if (qrSearchQuery && qrSearchQuery.trim()) {
      executeQrSearch();
      return;
    }

    rightList.empty();

    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];

    if (state.selectedQrFolder === "__favorites__") {
      const favs = getResFavorites("quickreply");
      displayItems = names.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (state.selectedQrFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类快速回复集";
    } else if (state.selectedQrFolder && tree[state.selectedQrFolder]) {
      displayItems = folderItems[state.selectedQrFolder] || [];
      childFolders = sortResFolders(
        "quickreply",
        getResChildFolders("quickreply", state.selectedQrFolder),
      );
      const path = getResFolderPath("quickreply", state.selectedQrFolder)
        .map((id) => getResFolderDisplayName("quickreply", id))
        .join(" › ");
      displayTitle = path;
    }

    // 应用右栏排序
    if (state.qrRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(displayItems, state.qrRightSortMode, (n) => n);
    }

    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      state.selectedQrFolder === "__favorites__" ||
      state.selectedQrFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个快速回复集`);
    } else {
      countEl.text(state.selectedQrFolder ? `${totalItems} 项` : "");
    }

    if (!state.selectedQrFolder) {
      rightList.html(
        hasAnyQrSets
          ? '<div class="cfm-right-empty">← 点击左侧文件夹查看快速回复集</div>'
          : '<div class="cfm-right-empty"><i class="fa-solid fa-circle-info"></i> 没有找到快速回复集<br><span style="font-size:12px;opacity:0.5;">请确保已安装并启用快速回复扩展</span></div>',
      );
    } else if (state.selectedQrFolder === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何快速回复集<br><span style="font-size:12px;opacity:0.5;">点击快速回复集行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (state.selectedQrFolder === "__ungrouped__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">没有未归类的快速回复集</div>',
      );
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("quickreply", childId);
        const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("quickreply", childId))}</div>
            <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
            <div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div>
            <div class="cfm-row-meta">${childCount} 个快速回复集</div>
          </div>
        `);
        row.find(".cfm-row-target-btn").on("click", (e) => {
          e.stopPropagation();
          handleFolderTargetMove(
            (items) =>
              items.forEach((n) => setItemGroup("quickreply", n, childId)),
            () => renderQRView(),
            (count, first) =>
              cfmToastr.success(
                count > 1
                  ? `已将 ${count} 个快速回复集移入「${getResFolderDisplayName("quickreply", childId)}」`
                  : `已将「${first}」移入「${getResFolderDisplayName("quickreply", childId)}」`,
              ),
          );
        });
        row.find(".cfm-row-rename-btn").on("click", (e) => {
          e.stopPropagation();
          promptRenameFolder("quickreply", childId, () => renderQRView());
        });
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("quickreply", childId);
          for (const pid of path) state.qrExpandedNodes.add(pid);
          state.selectedQrFolder = childId;
          renderQRView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "quickreply",
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
        // 右侧子文件夹行拖放目标
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
          if (data.type === "res-folder" && data.resType === "quickreply") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("quickreply", data.id, childId)
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
        row.on("dragleave", () =>
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          ),
        );
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
            data.resType === "quickreply" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("quickreply", data.id, childId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("quickreply", data.id, childId, null);
              cfmToastr.success(
                `「${getResFolderDisplayName("quickreply", data.id)}」已移入「${getResFolderDisplayName("quickreply", childId)}」`,
              );
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("quickreply", data.id, pId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("quickreply", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "quickreply",
                  getResChildFolders("quickreply", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "quickreply",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              cfmToastr.success(`「${data.id}」已排序`);
            }
            renderQRView();
          } else if (data.type === "quickreply") {
            const qrNames =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            const wCount = qrNames.length;
            qrNames.forEach((n) => setItemGroup("quickreply", n, childId));
            if (data.multiSelect) clearMultiSelect();
            cfmToastr.success(
              wCount > 1
                ? `已将 ${wCount} 个快速回复集移入「${getResFolderDisplayName("quickreply", childId)}」`
                : `已将「${data.name}」移入「${getResFolderDisplayName("quickreply", childId)}」`,
            );
            renderQRView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "quickreply",
          id: childId,
          name: getResFolderDisplayName("quickreply", childId),
        }));
        rightList.append(row);
      }

      // 快速回复集行（带星标 + 激活开关 + 展开三角 + 备注）
      for (const n of displayItems) {
        const fav = isResFavorite("quickreply", n);
        const isMSel = state.cfmMultiSelectMode && state.cfmMultiSelected.has(n);
        const isExpSel = state.cfmExportMode && state.cfmExportSelected.has(n);
        const isDelSel = state.cfmResDeleteMode && state.cfmResDeleteSelected.has(n);
        const isNoteSel = state.cfmQrNoteMode && state.cfmQrNoteSelected.has(n);
        const isRenameSel = state.cfmQrRenameMode && state.cfmQrRenameSelected.has(n);
        const msCheckHtml = state.cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : state.cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : state.cfmMultiSelectMode
              ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
              : state.cfmQrNoteMode
                ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
                : state.cfmQrRenameMode
                  ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                  : "";

        // 备注信息
        const qrNote = getQrNote(n);
        const noteHtml = qrNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(qrNote)}">${escapeHtml(qrNote)}</span>`
          : "";

        // 激活开关
        const qrIsActive = qrActiveSet.has(n);
        const toggleTitle = qrIsActive ? "点击取消激活" : "点击激活";
        const toggleHtml = `<div class="cfm-wi-toggle ${qrIsActive ? "cfm-wi-toggle-on" : ""}" title="${toggleTitle}" data-qr-name="${escapeHtml(n)}"><i class="fa-solid fa-toggle-${qrIsActive ? "on" : "off"}"></i></div>`;

        // 展开三角
        const isSetExpanded = state.qrItemExpandedSets.has(n);
        const expandArrowHtml = `<div class="cfm-qr-expand-arrow ${isSetExpanded ? "cfm-qr-arrow-expanded" : ""}" title="${isSetExpanded ? "收起快速回复" : "展开快速回复"}" data-qr-set="${escapeHtml(n)}"><i class="fa-solid fa-caret-right"></i></div>`;

        // 非模式状态下显示备注编辑按钮和重命名按钮
        const noModeActive =
          !state.cfmExportMode &&
          !state.cfmResDeleteMode &&
          !state.cfmMultiSelectMode &&
          !state.cfmQrNoteMode &&
          !state.cfmQrRenameMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";

        const row = $(`
          <div class="cfm-row cfm-row-char cfm-qr-set-row ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""}" data-res-id="${escapeHtml(n)}" draggable="true">
            ${msCheckHtml}
            ${toggleHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-reply-all" style="font-size:20px;color:#89b4fa;"></i></div>
            <div class="cfm-row-name"><span class="cfm-char-name-inline cfm-qr-name-inline">${expandArrowHtml}<span class="cfm-qr-name-text">${escapeHtml(n)}</span></span>${noteHtml}</div>
            ${singleNoteBtn}
            ${singleRenameBtn}
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);

        // 展开三角事件
        bindTouchSafeTap(row.find(".cfm-qr-expand-arrow"), () => {
          state.cfmQrLastFocusedSetName = n;
          if (state.qrItemExpandedSets.has(n)) {
            state.qrItemExpandedSets.delete(n);
          } else {
            state.qrItemExpandedSets.add(n);
          }
          renderQRView();
        });

        // 激活开关事件
        bindTouchSafeTap(row.find(".cfm-wi-toggle"), function () {
          const newState = !qrActiveSet.has(n);
          toggleQrSetActivation(n, newState).then(() => {
            if (newState) qrActiveSet.add(n);
            else qrActiveSet.delete(n);
            syncQrPresetTrackingForManualToggle(n, newState);
            const el = $(this);
            el.toggleClass("cfm-wi-toggle-on", newState);
            el.find("i").attr(
              "class",
              `fa-solid fa-toggle-${newState ? "on" : "off"}`,
            );
            el.attr("title", newState ? "点击取消激活" : "点击激活");
          });
        });

        // 星标事件
        bindTouchSafeTap(row.find(".cfm-row-star"), () => {
          const nowFav = toggleResFavorite("quickreply", n);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-qr-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = names.filter((nn) =>
              getResFavorites("quickreply").includes(nn),
            ).length;
            favCountEl.text(newCount);
          }
          if (state.selectedQrFolder === "__favorites__") renderQRView();
        });

        // 备注编辑按钮
        bindTouchSafeTap(row.find(".cfm-row-note-btn"), () => {
          const currentNote = getQrNote(n);
          const newNote = prompt("请输入备注:", currentNote);
          if (newNote !== null) {
            setQrNote(n, newNote);
            renderQRView();
          }
        });

        // 行点击事件
        // 重命名按钮事件
        bindTouchSafeTap(row.find(".cfm-row-rename-btn"), () => {
          executeQrRename([n]);
        });

        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-wi-toggle, .cfm-qr-expand-arrow",
            ).length
          )
            return;
          if (state.cfmResDeleteMode) {
            toggleResDeleteItem(n, e.shiftKey);
            renderQRView();
            return;
          }
          if (state.cfmExportMode) {
            toggleExportItem(n, e.shiftKey);
            renderQRView();
            return;
          }
          if (state.cfmMultiSelectMode) {
            toggleMultiSelectItem(n, e.shiftKey);
            renderQRView();
            return;
          }
          if (state.cfmQrNoteMode) {
            toggleQrNoteItem(n, e.shiftKey);
            renderQRView();
            return;
          }
          if (state.cfmQrRenameMode) {
            toggleQrRenameItem(n, e.shiftKey);
            renderQRView();
            return;
          }
          // 默认点击：打开酒馆快速回复编辑器
          openQrSetEditor(n);
        });

        // 拖拽
        row.on("dragstart", (e) => {
          const singleData = { type: "quickreply", name: n };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "quickreply", name: n };
          return getMultiDragData(singleData);
        });

        rightList.append(row);

        // 如果该 QR 集展开了，渲染其包含的快速回复项（聊天记录行风格）
        if (isSetExpanded) {
          const qrItems = getQrSetItems(n);
          if (qrItems.length > 0) {
            const subContainer = $('<div class="cfm-qr-sub-items"></div>');
            for (let qrIdx = 0; qrIdx < qrItems.length; qrIdx++) {
              const qr = qrItems[qrIdx];
              const label = qr.label || qr.title || "(未命名)";
              const isHidden = qr.isHidden || qr.hidden || false;
              const subRow = $(`
                <div class="cfm-qr-sub-item ${isHidden ? "cfm-qr-sub-hidden" : ""}" data-qr-set="${escapeHtml(n)}" data-qr-index="${qrIdx}">
                  <div class="cfm-qr-sub-icon"><i class="fa-solid fa-comment${isHidden ? "-slash" : ""}" style="color:${isHidden ? "#6c7086" : "#a6e3a1"};"></i></div>
                  <div class="cfm-qr-sub-info">
                    <div class="cfm-qr-sub-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
                  </div>
                  <div class="cfm-qr-sub-actions">
                    <div class="cfm-qr-sub-edit-btn" title="查看/编辑内容"><i class="fa-solid fa-pen-to-square"></i></div>
                  </div>
                </div>
              `);
              // 编辑按钮：打开内容编辑弹窗
              subRow
                .find(".cfm-qr-sub-edit-btn")
                .on("click touchend", function (e) {
                  e.preventDefault();
                  e.stopPropagation();
                  openQrItemEditor(n, qrIdx, qr);
                });
              subContainer.append(subRow);
            }
            rightList.append(subContainer);
          } else {
            rightList.append(
              '<div class="cfm-qr-sub-items"><div class="cfm-qr-sub-empty">此集合中没有快速回复</div></div>',
            );
          }
        }
      }

      // 删除工具栏
      prependResDeleteToolbar(rightList, renderQRView);
      // 导出工具栏
      prependExportToolbar(rightList, renderQRView);
      // 备注工具栏
      prependQrNoteToolbar(rightList, renderQRView);
      // 重命名工具栏
      prependQrRenameToolbar(rightList, renderQRView);
      // 多选工具栏
      if (state.cfmMultiSelectMode && state.selectedQrFolder) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => state.cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${state.cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-activate" title="批量激活快速回复集"><i class="fa-solid fa-toggle-on"></i> 激活</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-deactivate" title="批量取消激活快速回复集"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
            <span class="cfm-multisel-count">${state.cfmMultiSelected.size > 0 ? `已选 ${state.cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderQRView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
          if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
          renderQRView();
        });
        toolbar
          .find(".cfm-multisel-activate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyQrMultiActivation(
              Array.from(state.cfmMultiSelected),
              true,
            );
            if (changed) renderQRView();
          });
        toolbar
          .find(".cfm-multisel-deactivate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyQrMultiActivation(
              Array.from(state.cfmMultiSelected),
              false,
            );
            if (changed) renderQRView();
          });
        rightList.prepend(toolbar);
      }
    }

    // 右侧列表本身也是拖放目标
    if (
      state.selectedQrFolder &&
      state.selectedQrFolder !== "__ungrouped__" &&
      state.selectedQrFolder !== "__favorites__" &&
      tree[state.selectedQrFolder]
    ) {
      const currentFolder = state.selectedQrFolder;
      rightList.off("dragover dragleave drop");
      rightList.on("dragover", (e) => {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = "move";
        if ($(e.target).closest(".cfm-row").length > 0) return;
        rightList.addClass("cfm-right-list-drop-target");
      });
      rightList.on("dragleave", (e) => {
        if ($(e.relatedTarget).closest("#cfm-qr-right-list").length === 0) {
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
          data.resType === "quickreply" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("quickreply", data.id, currentFolder)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("quickreply", data.id, currentFolder, null);
          cfmToastr.success(
            `「${getResFolderDisplayName("quickreply", data.id)}」已移入「${getResFolderDisplayName("quickreply", currentFolder)}」`,
          );
          renderQRView();
        } else if (data.type === "quickreply") {
          const qrNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const wCount = qrNames.length;
          qrNames.forEach((n) => setItemGroup("quickreply", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个快速回复集移入「${getResFolderDisplayName("quickreply", currentFolder)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("quickreply", currentFolder)}」`,
          );
          renderQRView();
        }
      });
    }
}
