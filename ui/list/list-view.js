// 右侧资源列表渲染层：承接主弹窗角色卡页右侧列表（#cfm-right-list）的 DOM 组装、
// 空态提示、多选/删除/导出/编辑工具条挂载、文件夹行与角色行渲染、拖放处理。
// 迁移自 index.js 的 renderRightPane / appendCharRow。
// 说明：这两个函数与主弹窗闭包共享大量可变状态（selectedTreeNode、expandedNodes、
// cfmMultiSelectMode、cfmMultiSelected、cfmCopyMode、_pcDragData、config 等），
// 通过 getter/setter 注入保持引用一致，避免值拷贝导致模块内写操作无法反映到 index.js 闭包。

export function createRightListApiCore(deps) {
  const {
    $,
    cfmToastr,
    bindTouchSafeTap,
    clearMultiSelect,
    closeMainPopup,
    countCharsInFolderRecursive,
    escapeHtml,
    executeCharEdit,
    executeGlobalSearch,
    filterHiddenChars,
    findCharFolderPath,
    getCharChats,
    getCharacters,
    getCharactersInFolder,
    getChildFolders,
    getContext,
    getFavoriteCharacters,
    getFolderPath,
    getMultiDragData,
    getTagName,
    getThumbnailUrl,
    getUncategorizedCharacters,
    getVisibleActions,
    getVisibleResourceIds,
    handleCharDropToFolder,
    handleFolderTargetMove,
    isCharHidden,
    isFavorite,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    prependEditToolbar,
    prependExportToolbar,
    prependResDeleteToolbar,
    promptRenameFolder,
    refreshActiveViewerStateAfterSelectionChange,
    renderCharRegexSubList,
    renderCharacterDetailSubList,
    renderChatSubList,
    renderLeftTree,
    reorderFolder,
    selectAllVisible,
    sortCharacters,
    sortFolders,
    toggleCharHidden,
    toggleEditItem,
    toggleExportItem,
    toggleFavorite,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    touchDragMgr,
    wouldCreateCycle,
    // 可变状态（getter/setter）
    getSelectedTreeNode,
    setSelectedTreeNode,
    getExpandedNodes,
    getCfmMultiSelectMode,
    getCfmMultiSelected,
    getCfmMultiSelectRangeMode,
    setCfmMultiSelectRangeMode,
    getCfmMultiSelectLastClicked,
    setCfmMultiSelectLastClicked,
    getCfmExportMode,
    getCfmExportSelected,
    getCfmResDeleteMode,
    getCfmResDeleteSelected,
    getCfmEditMode,
    getCfmEditSelected,
    getCfmChatMode,
    getCfmChatExpandedAvatars,
    getCfmChatCache,
    getCfmCharRegexMode,
    getCfmCharRegexTargetAvatar,
    getCfmCharRegexExpandedAvatars,
    getCfmCharRegexHighlightPath,
    getCfmCharDetailExpandedAvatars,
    getRightCharSortMode,
    getCfmCopyMode,
    getPcDragData,
    getConfig,
  } = deps;

  // ==================== 右侧面板渲染 ====================
  function renderRightPane() {
    const list = $("#cfm-right-list");
    const pathEl = $("#cfm-rh-path");
    const countEl = $("#cfm-rh-count");

    // 如果搜索栏有内容，保持搜索模式（必须在 list.empty() 之前检查）
    const searchQuery = $("#cfm-global-search").val();
    if (searchQuery && searchQuery.trim()) {
      executeGlobalSearch();
      return;
    }

    list.empty();

    if (!getSelectedTreeNode()) {
      pathEl.text("选择左侧文件夹查看内容");
      countEl.text("");
      list.html('<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>');
      return;
    }

    if (getSelectedTreeNode() === "__uncategorized__") {
      pathEl.text("未归类角色");
      let chars = filterHiddenChars(getUncategorizedCharacters());
      if (getRightCharSortMode()) {
        chars = sortCharacters(chars, getRightCharSortMode());
      }
      countEl.text(`${chars.length} 个角色`);
      if (chars.length === 0) {
        list.html('<div class="cfm-right-empty">没有未归类的角色</div>');
        return;
      }
      for (const char of chars) appendCharRow(list, char);
      // 删除工具栏（未归类视图）
      prependResDeleteToolbar(list, renderRightPane);
      // 导出工具栏（未归类视图）
      prependExportToolbar(list, renderRightPane);
      // 编辑工具栏（未归类视图）
      prependEditToolbar(list, renderRightPane);
      // 多选工具栏（未归类视图）
      if (getCfmMultiSelectMode()) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => getCfmMultiSelected().has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${getCfmMultiSelectRangeMode() ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${getCfmMultiSelectRangeMode() ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${getCfmMultiSelected().size > 0 ? `已选 ${getCfmMultiSelected().size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderRightPane();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setCfmMultiSelectRangeMode(!getCfmMultiSelectRangeMode());
          if (getCfmMultiSelectRangeMode()) setCfmMultiSelectLastClicked(null);
          renderRightPane();
        });
        list.prepend(toolbar);
      }
      return;
    }

    if (getSelectedTreeNode() === "__favorites__") {
      pathEl.text("⭐ 收藏");
      let chars = filterHiddenChars(getFavoriteCharacters());
      if (getRightCharSortMode()) {
        chars = sortCharacters(chars, getRightCharSortMode());
      }
      countEl.text(`${chars.length} 个角色`);
      if (chars.length === 0) {
        list.html(
          '<div class="cfm-right-empty">还没有收藏任何角色<br><span style="font-size:12px;opacity:0.5;">点击角色行右侧的 ☆ 按钮添加收藏</span></div>',
        );
        return;
      }
      for (const char of chars) appendCharRow(list, char, true);
      // 删除工具栏（收藏视图）
      prependResDeleteToolbar(list, renderRightPane);
      // 导出工具栏（收藏视图）
      prependExportToolbar(list, renderRightPane);
      // 编辑工具栏（收藏视图）
      prependEditToolbar(list, renderRightPane);
      // 多选工具栏（收藏视图）
      if (getCfmMultiSelectMode()) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => getCfmMultiSelected().has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${getCfmMultiSelectRangeMode() ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${getCfmMultiSelectRangeMode() ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${getCfmMultiSelected().size > 0 ? `已选 ${getCfmMultiSelected().size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderRightPane();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setCfmMultiSelectRangeMode(!getCfmMultiSelectRangeMode());
          if (getCfmMultiSelectRangeMode()) setCfmMultiSelectLastClicked(null);
          renderRightPane();
        });
        list.prepend(toolbar);
      }
      return;
    }

    // 正常文件夹
    const folderId = getSelectedTreeNode();
    const path = getFolderPath(folderId)
      .map((id) => getTagName(id))
      .join(" › ");
    pathEl.text(path);

    const childFolders = sortFolders(getChildFolders(folderId));
    let chars = filterHiddenChars(getCharactersInFolder(folderId));
    if (getRightCharSortMode()) {
      chars = sortCharacters(chars, getRightCharSortMode());
    }
    const totalItems = childFolders.length + chars.length;
    countEl.text(`${totalItems} 项`);

    if (totalItems === 0) {
      list.html('<div class="cfm-right-empty">此文件夹为空</div>');
      return;
    }

    // 子文件夹行
    for (const childId of childFolders) {
      const childCount = countCharsInFolderRecursive(childId);
      // 正则模式下：如果目标角色在此子文件夹的路径上，高亮文件夹
      const folderRegexHighlight =
        getCfmCharRegexMode() && getCfmCharRegexHighlightPath().includes(childId)
          ? "cfm-regex-target-folder"
          : "";
      const row = $(`
                <div class="cfm-row cfm-row-folder ${folderRegexHighlight}" data-folder-id="${childId}" draggable="true">
                    <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
                    <div class="cfm-row-name">${escapeHtml(getTagName(childId))}</div>
                    <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
                    <div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div>
                    <div class="cfm-row-meta">${childCount} 个角色</div>
                </div>
            `);
      // 点击靶子按钮：移入此文件夹
      row.find(".cfm-row-target-btn").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) => items.forEach((av) => handleCharDropToFolder(av, childId)),
          () => {
            renderLeftTree();
            renderRightPane();
          },
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个角色${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(childId)}」`
                : `已将「${first}」${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(childId)}」`,
            ),
        );
      });
      // 点击重命名按钮
      row.find(".cfm-row-rename-btn").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("chars", childId, () => {
          renderLeftTree();
          renderRightPane();
        });
      });
      // 点击子文件夹：左侧树展开并选中
      row.on("click", (e) => {
        e.preventDefault();
        // 展开路径上所有节点
        const fullPath = getFolderPath(childId);
        for (const pid of fullPath) getExpandedNodes().add(pid);
        setSelectedTreeNode(childId);
        renderLeftTree();
        renderRightPane();
      });
      // 右侧文件夹可拖拽
      row.on("dragstart", (e) => {
        pcDragStart(e, { type: "folder", id: childId });
        row.addClass("cfm-dragging");
      });
      row.on("dragend", () => {
        row.removeClass("cfm-dragging");
        pcDragEnd();
        $(".cfm-row").removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
      });

      // 右侧文件夹行也是拖放目标（三区域：before/into/after）
      row.on("dragover", (e) => {
        e.preventDefault();
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
        const rect = row[0].getBoundingClientRect();
        const mouseY = e.originalEvent.clientY;
        const relativeY = (mouseY - rect.top) / rect.height;
        let dropZone;
        if (relativeY < 0.25) dropZone = "before";
        else if (relativeY > 0.75) dropZone = "after";
        else dropZone = "into";
        row.data("dropZone", dropZone);

        const data = getPcDragData() || {};

        if (data.type === "folder" && data.id) {
          if (data.id === childId) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
          if (dropZone === "into" && wouldCreateCycle(data.id, childId)) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
        }

        if (dropZone === "before") row.addClass("cfm-drop-before");
        else if (dropZone === "after") row.addClass("cfm-drop-after");
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
        const dropZone = row.data("dropZone") || "into";
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
        const data = pcGetDropData(e);
        if (!data) return;

        if (data.type === "folder" && data.id) {
          if (data.id === childId) return;
          if (dropZone === "into") {
            if (wouldCreateCycle(data.id, childId)) {
              cfmToastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            reorderFolder(data.id, childId, null);
            cfmToastr.success(
              `「${getTagName(data.id)}」已移入「${getTagName(childId)}」`,
            );
          } else {
            const targetParentId = getConfig().folders[childId]?.parentId || null;
            if (wouldCreateCycle(data.id, targetParentId)) {
              cfmToastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            if (dropZone === "before") {
              reorderFolder(data.id, targetParentId, childId);
              cfmToastr.success(`「${getTagName(data.id)}」已排序`);
            } else {
              const siblings = sortFolders(getChildFolders(targetParentId));
              const curIdx = siblings.indexOf(childId);
              const nextSiblingId =
                curIdx >= 0 && curIdx < siblings.length - 1
                  ? siblings[curIdx + 1]
                  : null;
              reorderFolder(data.id, targetParentId, nextSiblingId);
              cfmToastr.success(`「${getTagName(data.id)}」已排序`);
            }
          }
          renderLeftTree();
          renderRightPane();
        } else if (data.type === "char" && data.avatar) {
          const avatars =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.avatar];
          const count = avatars.length;
          avatars.forEach((av) => {
            handleCharDropToFolder(av, childId);
          });
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个角色${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(childId)}」`
              : `已将「${data.name || data.avatar}」${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(childId)}」`,
          );
          if (data.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        }
      });

      list.append(row);
    }

    // 角色卡行
    for (const char of chars) appendCharRow(list, char);

    // 删除工具栏（主角色卡视图）
    prependResDeleteToolbar(list, renderRightPane);
    // 导出工具栏（主角色卡视图）
    prependExportToolbar(list, renderRightPane);
    // 编辑工具栏（主角色卡视图）
    prependEditToolbar(list, renderRightPane);
    // 多选工具栏（在行渲染后添加，确保getVisibleResourceIds可用）
    if (getCfmMultiSelectMode()) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => getCfmMultiSelected().has(id));
      const toolbar = $(`
        <div class="cfm-multisel-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall" title="全选/全不选"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${getCfmMultiSelectRangeMode() ? "cfm-range-active" : ""}" title="框选模式"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${getCfmMultiSelectRangeMode() ? "(开)" : ""}</button>
          <span class="cfm-multisel-count">${getCfmMultiSelected().size > 0 ? `已选 ${getCfmMultiSelected().size} 项` : ""}</span>
        </div>
      `);
      toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectAllVisible();
        renderRightPane();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCfmMultiSelectRangeMode(!getCfmMultiSelectRangeMode());
        if (getCfmMultiSelectRangeMode()) setCfmMultiSelectLastClicked(null);
        renderRightPane();
      });
      list.prepend(toolbar);
    }

    // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
    list.off("dragover dragleave drop");
    list.on("dragover", (e) => {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = "move";
      // 仅在拖到空白区域时添加高亮（不在子行上）
      if ($(e.target).closest(".cfm-row").length > 0) return;
      list.addClass("cfm-right-list-drop-target");
    });
    list.on("dragleave", (e) => {
      if ($(e.relatedTarget).closest("#cfm-right-list").length === 0) {
        list.removeClass("cfm-right-list-drop-target");
      }
    });
    list.on("drop", (e) => {
      list.removeClass("cfm-right-list-drop-target");
      if ($(e.target).closest(".cfm-row").length > 0) return;
      e.preventDefault();
      e.stopPropagation();
      const data = pcGetDropData(e);
      if (!data) return;

      if (data.type === "folder" && data.id) {
        if (data.id === folderId) return;
        if (wouldCreateCycle(data.id, folderId)) {
          cfmToastr.error("此操作会产生循环嵌套，已阻止");
          return;
        }
        reorderFolder(data.id, folderId, null);
        cfmToastr.success(
          `「${getTagName(data.id)}」已移入「${getTagName(folderId)}」`,
        );
        renderLeftTree();
        renderRightPane();
      } else if (data.type === "char" && data.avatar) {
        const avatars =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatar];
        const count = avatars.length;
        avatars.forEach((av) => {
          handleCharDropToFolder(av, folderId);
        });
        cfmToastr.success(
          count > 1
            ? `已将 ${count} 个角色${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(folderId)}」`
            : `已将「${data.name || data.avatar}」${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(folderId)}」`,
        );
        if (data.multiSelect) clearMultiSelect();
        renderLeftTree();
        renderRightPane();
      }
    });
  }

  function appendCharRow(container, char, showFolderPath) {
    const thumbUrl = getThumbnailUrl("avatar", char.avatar);
    const fav = isFavorite(char.avatar);
    const isSelected = getCfmMultiSelectMode() && getCfmMultiSelected().has(char.avatar);
    const isExportSel = getCfmExportMode() && getCfmExportSelected().has(char.avatar);
    const isDelSel = getCfmResDeleteMode() && getCfmResDeleteSelected().has(char.avatar);
    const folderPathHtml = showFolderPath
      ? (() => {
          const p = findCharFolderPath(char.avatar);
          return p
            ? `<div class="cfm-row-folder-path">${escapeHtml(p)}</div>`
            : "";
        })()
      : "";
    // 创作者和版本信息
    const charCreator = char.data?.creator || "";
    const charVersion = char.data?.character_version || "";
    let charMetaHtml = "";
    if (charCreator || charVersion) {
      const parts = [];
      if (charCreator)
        parts.push(
          `<span class="cfm-char-creator" title="创作者: ${escapeHtml(charCreator)}">${escapeHtml(charCreator)}</span>`,
        );
      if (charVersion)
        parts.push(
          `<span class="cfm-char-version" title="版本: ${escapeHtml(charVersion)}">${escapeHtml(charVersion)}</span>`,
        );
      charMetaHtml = `<span class="cfm-char-meta-info">${parts.join('<span class="cfm-char-meta-sep"> · </span>')}</span>`;
    }
    const isEditSel = getCfmEditMode() && getCfmEditSelected().has(char.avatar);
    const checkboxHtml = getCfmResDeleteMode()
      ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
      : getCfmExportMode()
        ? `<div class="cfm-export-checkbox ${isExportSel ? "cfm-export-checked" : ""}"><i class="fa-${isExportSel ? "solid" : "regular"} fa-square${isExportSel ? "-check" : ""}"></i></div>`
        : getCfmEditMode()
          ? `<div class="cfm-edit-checkbox ${isEditSel ? "cfm-edit-checked" : ""}"><i class="fa-${isEditSel ? "solid" : "regular"} fa-square${isEditSel ? "-check" : ""}"></i></div>`
          : getCfmMultiSelectMode()
            ? `<div class="cfm-multisel-checkbox ${isSelected ? "cfm-multisel-checked" : ""}"><i class="fa-${isSelected ? "solid" : "regular"} fa-square${isSelected ? "-check" : ""}"></i></div>`
            : "";
    // 非模式状态下显示单个编辑铅笔按钮
    const singleEditBtn =
      !getCfmExportMode() && !getCfmResDeleteMode() && !getCfmEditMode() && !getCfmMultiSelectMode()
        ? `<div class="cfm-row-edit-btn" title="编辑作者名/版本名"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
    // 非模式状态下显示单个隐藏/取消隐藏按钮
    const charIsHidden = isCharHidden(char.avatar);
    const singleHideBtn =
      !getCfmExportMode() && !getCfmResDeleteMode() && !getCfmEditMode() && !getCfmMultiSelectMode()
        ? `<div class="cfm-row-hide-btn ${charIsHidden ? "cfm-row-hide-active" : ""}" title="${charIsHidden ? "取消隐藏角色卡" : "隐藏角色卡"}"><i class="fa-${charIsHidden ? "solid fa-eye-slash" : "regular fa-eye"}"></i></div>`
        : "";
    // 聊天模式下的小三角按钮（需同时检查自定义布局中 chatmode 是否可见）
    const chatmodeVisible =
      getCfmChatMode() && getVisibleActions("chars").includes("chatmode");
    // 乐观渲染：缓存尚未加载时默认显示三角，加载完成后根据实际数据精确判断
    let showChatToggle = false;
    if (chatmodeVisible) {
      const cachedChats = getCfmChatCache().get(char.avatar);
      if (cachedChats === undefined) {
        // 缓存尚未加载 → 乐观显示三角，让用户立即看到
        showChatToggle = true;
      } else if (cachedChats && cachedChats.length > 0) {
        // 缓存已加载 → 根据实际数据判断是否有实质性聊天
        showChatToggle =
          cachedChats.length > 1 ||
          (cachedChats[0] && (cachedChats[0].chat_items || 0) > 1);
      }
    }
    const isExpanded =
      showChatToggle && getCfmChatExpandedAvatars().has(char.avatar);
    const chatToggleHtml = showChatToggle
      ? `<div class="cfm-chat-toggle" title="展开/折叠聊天记录"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></div>`
      : "";
    // 正则模式下的小三角按钮（所有角色均可展开编辑正则）
    const isRegexTarget =
      getCfmCharRegexMode() && getCfmCharRegexTargetAvatar() === char.avatar;
    let showRegexToggle = false;
    if (getCfmCharRegexMode()) {
      showRegexToggle = true;
    }
    const isRegexExpanded =
      showRegexToggle && getCfmCharRegexExpandedAvatars().has(char.avatar);
    const regexToggleHtml = showRegexToggle
      ? `<div class="cfm-regex-toggle" title="展开/折叠正则脚本"><i class="fa-solid fa-caret-${isRegexExpanded ? "down" : "right"}"></i></div>`
      : "";
    const regexHighlightClass = isRegexTarget ? "cfm-regex-target-row" : "";
    const isDetailExpanded = getCfmCharDetailExpandedAvatars().has(char.avatar);
    const detailToggleHtml = `<div class="cfm-char-detail-toggle" title="展开/折叠角色卡具体设定"><i class="fa-solid fa-caret-${isDetailExpanded ? "down" : "right"}"></i></div>`;
    const row = $(`
            <div class="cfm-row cfm-row-char ${charIsHidden ? "cfm-row-char-hidden" : ""} ${regexHighlightClass} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExportSel ? "cfm-export-row-selected" : ""} ${isEditSel ? "cfm-edit-row-selected" : ""} ${isSelected ? "cfm-multisel-row-selected" : ""}" data-avatar="${escapeHtml(char.avatar)}" data-res-id="${escapeHtml(char.avatar)}" draggable="true">
                ${checkboxHtml}
                ${chatToggleHtml}
                ${regexToggleHtml}
                <div class="cfm-row-icon"><img src="${thumbUrl}" alt="" loading="lazy" onerror="this.src='/img/ai4.png'"></div>
                <div class="cfm-row-name"><span class="cfm-char-name-inline">${detailToggleHtml}<span class="cfm-char-name-text">${escapeHtml(char.name)}</span></span>${charMetaHtml}${folderPathHtml}</div>
                ${singleEditBtn}
                ${singleHideBtn}
                <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
            </div>
        `);
    // 点击星标切换收藏
    bindTouchSafeTap(row.find(".cfm-row-star"), () => {
      const nowFav = toggleFavorite(char.avatar);
      const starEl = row.find(".cfm-row-star");
      starEl.toggleClass("cfm-star-active", nowFav);
      starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
      starEl
        .find("i")
        .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
      // 更新左侧树的收藏计数
      const favCountEl = $(".cfm-tnode-favorites .cfm-tnode-count");
      if (favCountEl.length) favCountEl.text(getFavoriteCharacters().length);
      // 如果当前在收藏视图，需要重新渲染
      if (getSelectedTreeNode() === "__favorites__") {
        renderRightPane();
      }
    });
    let suppressRowClickUntil = 0;
    const suppressNextRowClick = () => {
      suppressRowClickUntil = Date.now() + 450;
    };
    // 单个铅笔按钮点击事件
    bindTouchSafeTap(row.find(".cfm-row-edit-btn"), () => {
      executeCharEdit([char.avatar]).then(() => renderRightPane());
    });
    // 单个眼睛按钮点击事件：切换隐藏状态
    bindTouchSafeTap(row.find(".cfm-row-hide-btn"), () => {
      const nowHidden = toggleCharHidden(char.avatar);
      cfmToastr.success(
        nowHidden ? `已隐藏「${char.name}」` : `已取消隐藏「${char.name}」`,
      );
      // 重新渲染（如果总开关关闭则该行会消失）
      renderRightPane();
    });
    // 聊天模式下小三角点击：展开/折叠聊天记录
    bindTouchSafeTap(row.find(".cfm-chat-toggle"), async () => {
      suppressNextRowClick();
      const avatar = char.avatar;
      if (getCfmChatExpandedAvatars().has(avatar)) {
        // 折叠
        getCfmChatExpandedAvatars().delete(avatar);
        row
          .nextAll(".cfm-chat-sublist")
          .first()
          .slideUp(150, function () {
            $(this).remove();
          });
        row
          .find(".cfm-chat-toggle i")
          .removeClass("fa-caret-down")
          .addClass("fa-caret-right");
      } else {
        // 展开：异步获取聊天记录
        getCfmChatExpandedAvatars().add(avatar);
        row
          .find(".cfm-chat-toggle i")
          .removeClass("fa-caret-right")
          .addClass("fa-caret-down");
        const chats = await getCharChats(avatar);
        renderChatSubList(row, avatar, chats || []);
        row.nextAll(".cfm-chat-sublist").first().hide().slideDown(150);
      }
    });
    // 正则模式下小三角点击：展开/折叠正则脚本
    bindTouchSafeTap(row.find(".cfm-regex-toggle"), () => {
      suppressNextRowClick();
      const avatar = char.avatar;
      if (getCfmCharRegexExpandedAvatars().has(avatar)) {
        // 折叠
        getCfmCharRegexExpandedAvatars().delete(avatar);
        row
          .nextAll(".cfm-regex-sublist")
          .first()
          .slideUp(150, function () {
            $(this).remove();
          });
        row
          .find(".cfm-regex-toggle i")
          .removeClass("fa-caret-down")
          .addClass("fa-caret-right");
      } else {
        // 展开
        getCfmCharRegexExpandedAvatars().add(avatar);
        row
          .find(".cfm-regex-toggle i")
          .removeClass("fa-caret-right")
          .addClass("fa-caret-down");
        const scripts = char?.data?.extensions?.regex_scripts || [];
        renderCharRegexSubList(row, avatar, scripts, char.name, isRegexTarget);
        row.nextAll(".cfm-regex-sublist").first().hide().slideDown(150);
      }
    });
    // 角色名旁小三角：展开/折叠角色卡具体设定
    row.find(".cfm-char-detail-toggle").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "touchend") {
        const touch = e.originalEvent?.changedTouches?.[0];
        if (touch) {
          const startX = Number(row.data("cfmCharDetailTouchStartX") || 0);
          const startY = Number(row.data("cfmCharDetailTouchStartY") || 0);
          const deltaX = Math.abs(touch.clientX - startX);
          const deltaY = Math.abs(touch.clientY - startY);
          if (deltaX > 10 || deltaY > 10) {
            return;
          }
        }
      }
      suppressNextRowClick();
      const avatar = char.avatar;
      if (getCfmCharDetailExpandedAvatars().has(avatar)) {
        getCfmCharDetailExpandedAvatars().delete(avatar);
        row
          .nextAll(".cfm-char-detail-sublist")
          .first()
          .slideUp(150, function () {
            $(this).remove();
          });
        row
          .find(".cfm-char-detail-toggle i")
          .removeClass("fa-caret-down")
          .addClass("fa-caret-right");
      } else {
        getCfmCharDetailExpandedAvatars().add(avatar);
        row
          .find(".cfm-char-detail-toggle i")
          .removeClass("fa-caret-right")
          .addClass("fa-caret-down");
        renderCharacterDetailSubList(row, char);
        row.nextAll(".cfm-char-detail-sublist").first().hide().slideDown(150);
      }
    });
    // 点击行为：多选模式下切换选中，否则打开角色聊天
    row.on("click", (e) => {
      e.preventDefault();
      if (Date.now() < suppressRowClickUntil) return;
      if ($(e.target).closest(".cfm-row-star").length) return;
      if ($(e.target).closest(".cfm-row-edit-btn").length) return;
      if ($(e.target).closest(".cfm-row-hide-btn").length) return;
      if ($(e.target).closest(".cfm-char-detail-toggle").length) return;
      if ($(e.target).closest(".cfm-chat-toggle").length) return;
      if ($(e.target).closest(".cfm-regex-toggle").length) return;
      if (getCfmResDeleteMode()) {
        toggleResDeleteItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      if (getCfmExportMode()) {
        toggleExportItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      if (getCfmEditMode()) {
        toggleEditItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      if (getCfmMultiSelectMode()) {
        toggleMultiSelectItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      closeMainPopup();
      const characters = getCharacters();
      const idx = characters.findIndex((c) => c.avatar === char.avatar);
      if (idx >= 0) {
        const selectCharacterById = getContext().selectCharacterById;
        if (selectCharacterById) {
          Promise.resolve(selectCharacterById(idx)).finally(() => {
            setTimeout(() => {
              refreshActiveViewerStateAfterSelectionChange({ character: true });
            }, 0);
          });
        }
      }
    });
    // 移动端触摸拖拽
    row.find(".cfm-char-detail-toggle").on("touchstart", function (e) {
      const touch = e.originalEvent?.touches?.[0];
      if (touch) {
        row.data("cfmCharDetailTouchStartX", touch.clientX);
        row.data("cfmCharDetailTouchStartY", touch.clientY);
      }
    });
    touchDragMgr.bind(row, () => {
      const singleData = {
        type: "char",
        avatar: char.avatar,
        name: char.name,
      };
      return getMultiDragData(singleData);
    });

    // PC端拖拽
    row.on("dragstart", (e) => {
      const singleData = {
        type: "char",
        avatar: char.avatar,
        name: char.name,
      };
      const dragData = getMultiDragData(singleData);
      pcDragStart(e, dragData);
      row.addClass("cfm-dragging");
    });
    row.on("dragend", () => {
      row.removeClass("cfm-dragging");
      pcDragEnd();
    });
    container.append(row);
    // 聊天模式下，如果该角色已展开且有实质性聊天，立即渲染聊天子列表
    if (showChatToggle && getCfmChatExpandedAvatars().has(char.avatar)) {
      const cachedChats = getCfmChatCache().get(char.avatar);
      if (cachedChats) {
        renderChatSubList(row, char.avatar, cachedChats);
      }
    }
    // 正则模式下，如果该角色已展开，则立即渲染正则子列表（目标角色允许为空）
    if (showRegexToggle && getCfmCharRegexExpandedAvatars().has(char.avatar)) {
      const scripts = char?.data?.extensions?.regex_scripts || [];
      renderCharRegexSubList(
        row,
        char.avatar,
        scripts,
        char.name,
        isRegexTarget,
      );
    }
    if (getCfmCharDetailExpandedAvatars().has(char.avatar)) {
      renderCharacterDetailSubList(row, char);
    }
  }

  return { renderRightPane, appendCharRow };
}
