// 主题视图组件层：承接 themes 资源页的 DOM 组装、树/列表区域组合、主题背景绑定入口和事件出口；主题业务保留在 features/themes 与 features/appearance。

export function renderThemesViewCore(deps) {
  const renderThemesView = () => deps.renderThemesView();
  const state = deps.state;
  const {
    $,
    applyTheme,
    bindTouchSafeTap,
    cfmToastr,
    clearMultiSelect,
    countResItemsRecursive,
    escapeHtml,
    executeThemeNoteEdit,
    executeThemeRename,
    executeThemeSearch,
    getBackgroundDisplayName,
    getContext,
    getMultiDragData,
    getResChildFolders,
    getResFavorites,
    getResFolderDisplayName,
    getResFolderPath,
    getResFolderTree,
    getResTopLevelFolders,
    getResourceGroups,
    getThemeBgBinding,
    getThemeNames,
    getThemeNote,
    getVisibleResourceIds,
    handleFolderTargetMove,
    handleThemeBgLink,
    isResFavorite,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    prependExportToolbar,
    prependResDeleteToolbar,
    prependThemeNoteToolbar,
    prependThemeRenameToolbar,
    promptRenameFolder,
    reorderResFolder,
    selectAllVisible,
    setItemGroup,
    setTimeout,
    sortResFolders,
    sortResItems,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    toggleThemeNoteItem,
    toggleThemeRenameItem,
    touchDragMgr,
    wouldCreateResCycle,
  } = deps;
  const getCurrentResourceType = deps.getCurrentResourceType;

    const leftTree = $("#cfm-theme-left-tree");
    const rightList = $("#cfm-theme-right-list");
    const pathEl = $("#cfm-theme-rh-path");
    const countEl = $("#cfm-theme-rh-count");
    leftTree.empty();
    const tree = getResFolderTree("themes");
    const themeNames = getThemeNames();

    if (themeNames.length === 0) {
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 主题列表加载中...</div>',
      );
      if (!renderThemesView._retryCount) renderThemesView._retryCount = 0;
      if (renderThemesView._retryCount < 10) {
        renderThemesView._retryCount++;
        setTimeout(() => {
          if (deps.getCurrentResourceType() === "themes") renderThemesView();
        }, 500);
      }
      return;
    }
    renderThemesView._retryCount = 0;

    const groups = getResourceGroups("themes");
    // 注意：不再自动清理 groups 中的映射（同预设清理说明）。

    const folderItems = {};
    const ungrouped = [];
    for (const name of themeNames) {
      const grp = groups[name];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(name);
      } else ungrouped.push(name);
    }

    // 收藏入口
    const themeFavs = getResFavorites("themes");
    const themeFavCount = themeNames.filter((n) =>
      themeFavs.includes(n),
    ).length;
    const themeFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${state.selectedThemeFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${themeFavCount}</span>
      </div>
    `);
    themeFavNode.on("click", (e) => {
      e.preventDefault();
      state.selectedThemeFolder = "__favorites__";
      renderThemesView();
    });
    leftTree.append(themeFavNode);

    // 递归渲染左侧树节点
    function renderThemeTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "themes",
        getResChildFolders("themes", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = state.themeExpandedNodes.has(folderId);
      const isSelected = state.selectedThemeFolder === folderId;
      const count = countResItemsRecursive("themes", folderId);
      const indent = 10 + depth * 16;
      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("themes", folderId))}</span>
          <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
          <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);
      node.find(".cfm-tnode-target").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) => items.forEach((n) => setItemGroup("themes", n, folderId)),
          () => renderThemesView(),
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个主题移入「${getResFolderDisplayName("themes", folderId)}」`
                : `已将「${first}」移入「${getResFolderDisplayName("themes", folderId)}」`,
            ),
        );
      });
      node.find(".cfm-tnode-rename").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("themes", folderId, () => renderThemesView());
      });
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (state.themeExpandedNodes.has(folderId))
          state.themeExpandedNodes.delete(folderId);
        else state.themeExpandedNodes.add(folderId);
        renderThemesView();
      });
      node.on("click", (e) => {
        e.preventDefault();
        state.selectedThemeFolder = folderId;
        renderThemesView();
      });
      node.on("dragstart", (e) => {
        pcDragStart(e, { type: "res-folder", resType: "themes", id: folderId });
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
        const isThemeItemDrag =
          data.type === "theme" ||
          (data.type === "res-folder" && data.resType === "themes");
        const isThemeFolderDrag =
          data.type === "res-folder" && data.resType === "themes";
        if (isThemeItemDrag && (zone === "into" || isThemeFolderDrag)) {
          state._pcLastResourceFolderHoverTarget = {
            groupType: "themes",
            targetKind: "folder",
            folderId,
            zone,
          };
        } else if (
          !isThemeItemDrag &&
          state._pcLastResourceFolderHoverTarget?.groupType === "themes"
        ) {
          state._pcLastResourceFolderHoverTarget = null;
        }
        if (data.type === "res-folder" && data.resType === "themes") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("themes", data.id, folderId)
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
          data.resType === "themes" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("themes", data.id, folderId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("themes", data.id, folderId, null);
            cfmToastr.success(
              `「${getResFolderDisplayName("themes", data.id)}」已移入「${getResFolderDisplayName("themes", folderId)}」`,
            );
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("themes", data.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("themes", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "themes",
                getResChildFolders("themes", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "themes",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${data.id}」已排序`);
          }
          renderThemesView();
        } else if (data.type === "theme") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("themes", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderThemesView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移入「${getResFolderDisplayName("themes", folderId)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("themes", folderId)}」`,
          );
        }
      });
      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "themes",
        id: folderId,
        name: folderId,
      }));
      container.append(node);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderThemeTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }

    const topFolders = sortResFolders(
      "themes",
      getResTopLevelFolders("themes"),
    );
    for (const fid of topFolders) renderThemeTreeNode(leftTree, fid, 0);

    // 未归类入口
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedThemeFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类主题</span>
        <span class="cfm-tnode-target" title="移入此处"><i class="fa-solid fa-crosshairs"></i></span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((n) => setItemGroup("themes", n, null)),
        () => renderThemesView(),
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个主题移出文件夹`
              : `已将「${first}」移出文件夹`,
          ),
      );
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      state.selectedThemeFolder = "__ungrouped__";
      renderThemesView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
      const data = state._pcDragData || {};
      if (data.type === "theme") {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "themes",
          targetKind: "ungrouped",
          zone: "into",
        };
      } else if (state._pcLastResourceFolderHoverTarget?.groupType === "themes") {
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
      if (d?.type === "res-folder" && d.id && d.resType === "themes") {
        reorderResFolder("themes", d.id, null, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("themes", d.id)}」已移出到根目录`,
        );
        renderThemesView();
      } else if (d && d.type === "theme") {
        const names = d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        names.forEach((n) => setItemGroup("themes", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderThemesView();
        cfmToastr.success(
          names.length > 1
            ? `已将 ${names.length} 个主题移出文件夹`
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

    // 右侧渲染 - 搜索模式检查
    const themeSearchQuery = $("#cfm-theme-global-search").val();
    if (themeSearchQuery && themeSearchQuery.trim()) {
      executeThemeSearch();
      return;
    }
    rightList.empty();

    // 获取当前主题
    const currentThemeName =
      (getContext().powerUserSettings || {}).theme || null;

    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];

    if (state.selectedThemeFolder === "__favorites__") {
      const favs = getResFavorites("themes");
      displayItems = themeNames.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (state.selectedThemeFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类主题";
    } else if (state.selectedThemeFolder && tree[state.selectedThemeFolder]) {
      displayItems = folderItems[state.selectedThemeFolder] || [];
      childFolders = sortResFolders(
        "themes",
        getResChildFolders("themes", state.selectedThemeFolder),
      );
      const path = getResFolderPath("themes", state.selectedThemeFolder)
        .map((id) => getResFolderDisplayName("themes", id))
        .join(" › ");
      displayTitle = path;
    }

    if (state.themeRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(displayItems, state.themeRightSortMode, (n) => n);
    }

    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      state.selectedThemeFolder === "__favorites__" ||
      state.selectedThemeFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个主题`);
    } else {
      countEl.text(state.selectedThemeFolder ? `${totalItems} 项` : "");
    }

    if (!state.selectedThemeFolder) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (state.selectedThemeFolder === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何主题<br><span style="font-size:12px;opacity:0.5;">点击主题行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (state.selectedThemeFolder === "__ungrouped__" && totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">没有未归类的主题</div>');
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("themes", childId);
        const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("themes", childId))}</div>
            <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
            <div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div>
            <div class="cfm-row-meta">${childCount} 个主题</div>
          </div>
        `);
        row.find(".cfm-row-target-btn").on("click", (e) => {
          e.stopPropagation();
          handleFolderTargetMove(
            (items) => items.forEach((n) => setItemGroup("themes", n, childId)),
            () => renderThemesView(),
            (count, first) =>
              cfmToastr.success(
                count > 1
                  ? `已将 ${count} 个主题移入「${getResFolderDisplayName("themes", childId)}」`
                  : `已将「${first}」移入「${getResFolderDisplayName("themes", childId)}」`,
              ),
          );
        });
        row.find(".cfm-row-rename-btn").on("click", (e) => {
          e.stopPropagation();
          promptRenameFolder("themes", childId, () => renderThemesView());
        });
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("themes", childId);
          for (const pid of path) state.themeExpandedNodes.add(pid);
          state.selectedThemeFolder = childId;
          renderThemesView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "themes",
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
          if (data.type === "res-folder" && data.resType === "themes") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("themes", data.id, childId)
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
            data.resType === "themes" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("themes", data.id, childId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("themes", data.id, childId, null);
              cfmToastr.success(
                `「${getResFolderDisplayName("themes", data.id)}」已移入「${getResFolderDisplayName("themes", childId)}」`,
              );
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("themes", data.id, pId)) {
                cfmToastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("themes", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "themes",
                  getResChildFolders("themes", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "themes",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              cfmToastr.success(`「${data.id}」已排序`);
            }
            renderThemesView();
          } else if (data.type === "theme") {
            const names =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            names.forEach((n) => setItemGroup("themes", n, childId));
            if (data.multiSelect) clearMultiSelect();
            cfmToastr.success(
              names.length > 1
                ? `已将 ${names.length} 个主题移入「${getResFolderDisplayName("themes", childId)}」`
                : `已将「${data.name}」移入「${getResFolderDisplayName("themes", childId)}」`,
            );
            renderThemesView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "themes",
          id: childId,
          name: getResFolderDisplayName("themes", childId),
        }));
        rightList.append(row);
      }
      // 主题行（带星标 + 多选支持）
      for (const name of displayItems) {
        const isActive = name === currentThemeName;
        const fav = isResFavorite("themes", name);
        const isMSel = state.cfmMultiSelectMode && state.cfmMultiSelected.has(name);
        const isExpSel = state.cfmExportMode && state.cfmExportSelected.has(name);
        const isDelSel = state.cfmResDeleteMode && state.cfmResDeleteSelected.has(name);
        const isNoteSel = state.cfmThemeNoteMode && state.cfmThemeNoteSelected.has(name);
        const isRenameSel =
          state.cfmThemeRenameMode && state.cfmThemeRenameSelected.has(name);
        const msCheckHtml = state.cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : state.cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : state.cfmThemeNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : state.cfmThemeRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : state.cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        // 备注信息
        const themeNote = getThemeNote(name);
        const noteHtml = themeNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(themeNote)}">${escapeHtml(themeNote)}</span>`
          : "";
        // 非模式状态下显示单个编辑按钮
        const noModeActive =
          !state.cfmExportMode &&
          !state.cfmResDeleteMode &&
          !state.cfmThemeNoteMode &&
          !state.cfmThemeRenameMode &&
          !state.cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        // 绑定背景按钮
        const bgBinding = getThemeBgBinding(name);
        const bgLinkBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-bglink-btn ${bgBinding ? "cfm-bglink-active" : ""}" title="${bgBinding ? "已绑定背景: " + escapeHtml(getBackgroundDisplayName(bgBinding)) : "绑定背景"}">
              <i class="fa-solid fa-link"></i>
            </div>`
          : "";
        // 绑定背景标签
        const bgBindHtml = bgBinding
          ? `<span class="cfm-theme-bgbind-tag" title="绑定背景: ${escapeHtml(getBackgroundDisplayName(bgBinding))}"><i class="fa-solid fa-image"></i>${escapeHtml(getBackgroundDisplayName(bgBinding))}</span>`
          : "";
        const row = $(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-palette" style="font-size:20px;color:#cba6f7;"></i></div>
            <div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(name)}</span>${noteHtml}${bgBindHtml}</div>
            ${singleRenameBtn}
            ${singleNoteBtn}
            ${bgLinkBtn}
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        bindTouchSafeTap(row.find(".cfm-row-star"), () => {
          const nowFav = toggleResFavorite("themes", name);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-theme-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = themeNames.filter((nn) =>
              getResFavorites("themes").includes(nn),
            ).length;
            favCountEl.text(newCount);
          }
          if (state.selectedThemeFolder === "__favorites__") renderThemesView();
        });
        // 单个备注编辑按钮
        bindTouchSafeTap(row.find(".cfm-row-note-btn"), () => {
          executeThemeNoteEdit([name]);
        });
        // 单个重命名按钮
        bindTouchSafeTap(row.find(".cfm-row-rename-btn"), () => {
          executeThemeRename([name]);
        });
        // 绑定背景按钮
        bindTouchSafeTap(row.find(".cfm-row-bglink-btn"), () => {
          handleThemeBgLink(name);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-row-bglink-btn",
            ).length
          )
            return;
          if (state.cfmResDeleteMode) {
            toggleResDeleteItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (state.cfmExportMode) {
            toggleExportItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (state.cfmThemeNoteMode) {
            toggleThemeNoteItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (state.cfmThemeRenameMode) {
            toggleThemeRenameItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (state.cfmMultiSelectMode) {
            toggleMultiSelectItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          applyTheme(name);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          cfmToastr.success(`已应用主题「${name}」`);
        });
        row.on("dragstart", (e) => {
          const singleData = { type: "theme", name: name };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "theme", name: name };
          return getMultiDragData(singleData);
        });
        rightList.append(row);
      }

      // 删除工具栏
      prependResDeleteToolbar(rightList, renderThemesView);
      // 导出工具栏
      prependExportToolbar(rightList, renderThemesView);
      // 备注编辑工具栏
      prependThemeNoteToolbar(rightList, renderThemesView);
      // 重命名工具栏
      prependThemeRenameToolbar(rightList, renderThemesView);
      // 多选工具栏
      if (state.cfmMultiSelectMode && state.selectedThemeFolder) {
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
          renderThemesView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
          if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
          renderThemesView();
        });
        rightList.prepend(toolbar);
      }
    }

    // 右侧列表拖放目标
    if (
      state.selectedThemeFolder &&
      state.selectedThemeFolder !== "__ungrouped__" &&
      state.selectedThemeFolder !== "__favorites__" &&
      tree[state.selectedThemeFolder]
    ) {
      const currentFolder = state.selectedThemeFolder;
      rightList.off("dragover dragleave drop");
      rightList.on("dragover", (e) => {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = "move";
        if ($(e.target).closest(".cfm-row").length > 0) return;
        rightList.addClass("cfm-right-list-drop-target");
      });
      rightList.on("dragleave", (e) => {
        if ($(e.relatedTarget).closest("#cfm-theme-right-list").length === 0)
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
          data.resType === "themes" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("themes", data.id, currentFolder)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("themes", data.id, currentFolder, null);
          cfmToastr.success(
            `「${getResFolderDisplayName("themes", data.id)}」已移入「${getResFolderDisplayName("themes", currentFolder)}」`,
          );
          renderThemesView();
        } else if (data.type === "theme") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("themes", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移入「${getResFolderDisplayName("themes", currentFolder)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("themes", currentFolder)}」`,
          );
          renderThemesView();
        }
      });
    }
  }
