// 角色卡左侧文件夹树渲染层：承接主弹窗角色卡页左侧树的 DOM 组装、节点交互（选中/展开/重命名/移入/拖拽）。
// 迁移自 index.js 的 renderLeftTree / renderTreeNode / refreshSelection。
// 说明：这三个函数与主弹窗闭包共享大量可变状态（selectedTreeNode、expandedNodes、
// PC 拖拽数据、cfmCopyMode、config 等），通过 getter/setter 注入保持引用一致，
// 避免值拷贝导致模块内写操作无法反映到 index.js 闭包。

export function createLeftTreeApiCore(deps) {
  const {
    $,
    cfmToastr,
    clearMultiSelect,
    countCharsInFolderRecursive,
    escapeHtml,
    executeGlobalSearch,
    getChildFolders,
    getFavoriteCharacters,
    getTagName,
    getTopLevelFolders,
    getUncategorizedCharacters,
    handleCharDropToFolder,
    handleFolderTargetMove,
    isNewlyImported,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    promptRenameFolder,
    removeCharFromAllFolders,
    renderRightPane,
    reorderFolder,
    sortFolders,
    touchDragMgr,
    wouldCreateCycle,
    // 可变状态（getter/setter）
    getSelectedTreeNode,
    setSelectedTreeNode,
    getExpandedNodes,
    getPcDragData,
    getPcLastResourceFolderHoverTarget,
    setPcLastResourceFolderHoverTarget,
    setPcDropHandled,
    getConfig,
    getCfmCopyMode,
  } = deps;

  // ==================== 左侧树渲染 ====================
  function renderLeftTree() {
    const tree = $("#cfm-left-tree");
    tree.empty();

    // 收藏入口（置顶）
    const favCount = getFavoriteCharacters().length;
    const favNode = $(`
            <div class="cfm-tnode cfm-tnode-favorites ${getSelectedTreeNode() === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
                <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
                <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
                <span class="cfm-tnode-label">收藏</span>
                <span class="cfm-tnode-count">${favCount}</span>
            </div>
        `);
    favNode.on("click", (e) => {
      e.preventDefault();
      setSelectedTreeNode("__favorites__");
      refreshSelection();
      renderRightPane();
    });
    tree.append(favNode);

    const topFolders = sortFolders(getTopLevelFolders());

    for (const folderId of topFolders) {
      renderTreeNode(tree, folderId, 0);
    }

    // 未归类角色入口（固定在底部）
    const uncatCount = getUncategorizedCharacters().length;
    const uncatNode = $(`
            <div class="cfm-tnode cfm-tnode-uncategorized ${getSelectedTreeNode() === "__uncategorized__" ? "cfm-tnode-selected" : ""}" data-id="__uncategorized__" style="padding-left:10px;">
                <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
                <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
                <span class="cfm-tnode-label">未归类角色</span>
                <span class="cfm-tnode-target" title="移入此处"><i class="fa-solid fa-crosshairs"></i></span>
                <span class="cfm-tnode-count">${uncatCount}</span>
            </div>
        `);
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((av) => removeCharFromAllFolders(av)),
        () => {
          renderLeftTree();
          renderRightPane();
        },
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个角色移出所有文件夹`
              : `已将「${first}」移出所有文件夹`,
          ),
      );
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      setSelectedTreeNode("__uncategorized__");
      refreshSelection();
      renderRightPane();
    });
    // 未归类入口拖放：将角色移出所有文件夹
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
      const data = getPcDragData() || {};
      if (data.type === "char" || data.type === "folder") {
        setPcLastResourceFolderHoverTarget({
          groupType: "chars",
          targetKind: "ungrouped",
          zone: "into",
        });
      } else if (getPcLastResourceFolderHoverTarget()?.groupType === "chars") {
        setPcLastResourceFolderHoverTarget(null);
      }
    });
    uncatNode.on("dragleave", () => {
      uncatNode.removeClass("cfm-drop-target");
    });
    uncatNode.on("drop", (e) => {
      e.preventDefault();
      setPcDropHandled(true);
      setPcLastResourceFolderHoverTarget(null);
      $(".cfm-right-list-drop-target").removeClass(
        "cfm-right-list-drop-target",
      );
      uncatNode.removeClass("cfm-drop-target");
      const data = pcGetDropData(e);
      if (!data) return;
      if (data.type === "folder" && data.id) {
        reorderFolder(data.id, null, null);
        cfmToastr.success(`「${getTagName(data.id)}」已移出到根目录`);
        renderLeftTree();
        renderRightPane();
      } else if (data.type === "char" && data.avatar) {
        const avatars =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatar];
        const count = avatars.length;
        avatars.forEach((av) => removeCharFromAllFolders(av));
        cfmToastr.success(
          count > 1
            ? `已将 ${count} 个角色移出所有文件夹`
            : `已将「${data.name || data.avatar}」移出所有文件夹`,
        );
        if (data.multiSelect) clearMultiSelect();
        renderLeftTree();
        renderRightPane();
      }
    });
    tree.append(uncatNode);

    if (topFolders.length === 0) {
      // Insert the hint after favorites but before uncategorized
      favNode.after(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }
  }

  function renderTreeNode(container, folderId, depth) {
    const hasChildren = getChildFolders(folderId).length > 0;
    const isExpanded = getExpandedNodes().has(folderId);
    const isSelected = getSelectedTreeNode() === folderId;
    const count = countCharsInFolderRecursive(folderId);
    const indent = 10 + depth * 16;

    const isNew = isNewlyImported(folderId);
    const node = $(`
            <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""} ${isNew ? "cfm-tnode-new" : ""}" data-id="${folderId}" style="padding-left:${indent}px;" draggable="true">
                <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
                <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
                <span class="cfm-tnode-label">${escapeHtml(getTagName(folderId))}${isNew ? ' <span class="cfm-new-badge">新</span>' : ""}</span>
                <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
                <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
                <span class="cfm-tnode-count">${count}</span>
            </div>
        `);

    // 点击重命名按钮
    node.find(".cfm-tnode-rename").on("click", (e) => {
      e.stopPropagation();
      promptRenameFolder("chars", folderId, () => {
        renderLeftTree();
        renderRightPane();
      });
    });

    // 点击靶子按钮：移入此文件夹
    node.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((av) => handleCharDropToFolder(av, folderId)),
        () => {
          renderLeftTree();
          renderRightPane();
        },
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个角色${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(folderId)}」`
              : `已将「${first}」${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(folderId)}」`,
          ),
      );
    });

    // 点击箭头：展开/收起
    node.find(".cfm-tnode-arrow").on("click", (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      const expandedNodes = getExpandedNodes();
      if (expandedNodes.has(folderId)) expandedNodes.delete(folderId);
      else expandedNodes.add(folderId);
      renderLeftTree();
      renderRightPane();
    });

    // 点击节点本身：选中并在右侧显示内容
    node.on("click", (e) => {
      e.preventDefault();
      setSelectedTreeNode(folderId);
      refreshSelection();
      // 如果搜索栏有内容，保持搜索模式
      const searchQuery = $("#cfm-global-search").val();
      if (searchQuery && searchQuery.trim()) {
        executeGlobalSearch();
      } else {
        renderRightPane();
      }
    });

    // 移动端触摸拖拽
    touchDragMgr.bind(node, () => ({
      type: "folder",
      id: folderId,
      name: getTagName(folderId),
    }));

    // PC端拖拽
    node.on("dragstart", (e) => {
      pcDragStart(e, { type: "folder", id: folderId });
      node.addClass("cfm-dragging");
    });
    node.on("dragend", () => {
      node.removeClass("cfm-dragging");
      pcDragEnd();
      $(".cfm-tnode").removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
    });

    // 左侧树拖放目标：三区域（上25%=排序到前面, 中50%=嵌套, 下25%=排序到后面）
    node.on("dragover", (e) => {
      e.preventDefault();
      // 清除之前的样式
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );

      // 计算鼠标在节点内的相对位置
      const rect = node[0].getBoundingClientRect();
      const mouseY = e.originalEvent.clientY;
      const relativeY = (mouseY - rect.top) / rect.height;

      // 判断拖放区域
      let dropZone; // 'before' | 'into' | 'after'
      if (relativeY < 0.25) dropZone = "before";
      else if (relativeY > 0.75) dropZone = "after";
      else dropZone = "into";

      node.data("dropZone", dropZone);

      // 对于文件夹拖放，检查循环（仅 into 模式需要检查）
      const data = getPcDragData() || {};
      if (
        (data.type === "char" && dropZone === "into") ||
        data.type === "folder"
      ) {
        setPcLastResourceFolderHoverTarget({
          groupType: "chars",
          targetKind: "folder",
          folderId,
          zone: dropZone,
        });
      } else if (getPcLastResourceFolderHoverTarget()?.groupType === "chars") {
        setPcLastResourceFolderHoverTarget(null);
      }

      if (data.type === "folder" && data.id) {
        if (data.id === folderId) {
          node.addClass("cfm-drop-forbidden");
          e.originalEvent.dataTransfer.dropEffect = "none";
          return;
        }
        if (dropZone === "into" && wouldCreateCycle(data.id, folderId)) {
          node.addClass("cfm-drop-forbidden");
          e.originalEvent.dataTransfer.dropEffect = "none";
          return;
        }
      }

      // 应用视觉样式
      if (dropZone === "before") node.addClass("cfm-drop-before");
      else if (dropZone === "after") node.addClass("cfm-drop-after");
      else node.addClass("cfm-drop-target");

      e.originalEvent.dataTransfer.dropEffect = "move";
    });
    node.on("dragleave", () => {
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
    });
    node.on("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setPcDropHandled(true);
      setPcLastResourceFolderHoverTarget(null);
      $(".cfm-right-list-drop-target").removeClass(
        "cfm-right-list-drop-target",
      );
      const dropZone = node.data("dropZone") || "into";
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
      const data = pcGetDropData(e);
      if (!data) return;

      if (data.type === "folder" && data.id) {
        if (data.id === folderId) return;

        if (dropZone === "into") {
          // 嵌套：拖入文件夹内部
          if (wouldCreateCycle(data.id, folderId)) {
            cfmToastr.error("此操作会产生循环嵌套，已阻止");
            return;
          }
          reorderFolder(data.id, folderId, null);
          cfmToastr.success(
            `「${getTagName(data.id)}」已移入「${getTagName(folderId)}」`,
          );
        } else {
          // 排序：插入到当前节点的前面或后面（同级）
          const targetParentId =
            getConfig().folders[folderId]?.parentId || null;
          // 检查是否会产生循环（移到目标的父级下）
          if (wouldCreateCycle(data.id, targetParentId)) {
            cfmToastr.error("此操作会产生循环嵌套，已阻止");
            return;
          }
          if (dropZone === "before") {
            reorderFolder(data.id, targetParentId, folderId);
            cfmToastr.success(`「${getTagName(data.id)}」已排序`);
          } else {
            // 'after': 找到当前节点的下一个兄弟节点作为 insertBefore
            const siblings = sortFolders(getChildFolders(targetParentId));
            const curIdx = siblings.indexOf(folderId);
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
        // 多选批量移动
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

    container.append(node);

    // 子节点容器
    if (hasChildren) {
      const childContainer = $(
        `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
      );
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children)
        renderTreeNode(childContainer, childId, depth + 1);
      container.append(childContainer);
    }
  }

  function refreshSelection() {
    $(".cfm-tnode").removeClass("cfm-tnode-selected");
    if (getSelectedTreeNode()) {
      $(`.cfm-tnode[data-id="${getSelectedTreeNode()}"]`).addClass(
        "cfm-tnode-selected",
      );
    }
    // 更新图标
    $(".cfm-tnode .cfm-tnode-icon i.fa-folder-open")
      .removeClass("fa-folder-open")
      .addClass("fa-folder");
    if (
      getSelectedTreeNode() &&
      getSelectedTreeNode() !== "__uncategorized__" &&
      getSelectedTreeNode() !== "__favorites__"
    ) {
      $(`.cfm-tnode[data-id="${getSelectedTreeNode()}"] .cfm-tnode-icon i.fa-folder`)
        .removeClass("fa-folder")
        .addClass("fa-folder-open");
    }
  }

  return {
    renderLeftTree,
    renderTreeNode,
    refreshSelection,
  };
}
