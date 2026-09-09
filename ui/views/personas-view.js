// Persona 视图组件层：承接 personas 资源页的 DOM 组装、树/列表区域组合、绑定摘要入口和事件出口；Persona 业务保留在 features/personas。

export async function renderPersonasViewCore(deps) {
  const renderPersonasView = deps.renderPersonasView;
  const state = deps.state;
  const {
    $,
    bindTouchSafeTap,
    buildPersonaConnHtml,
    cfmDebugDragLog,
    cfmToastr,
    clearMultiSelect,
    countResItemsRecursive,
    duplicatePersona,
    escapeHtml,
    executePersonaNoteEdit,
    executePersonaSearch,
    extensionName,
    extension_settings,
    getCurrentPersonas,
    getMultiDragData,
    getPersonaBindStates,
    getPersonaNote,
    getResChildFolders,
    getResFavorites,
    getResFolderDisplayName,
    getResFolderIds,
    getResFolderPath,
    getResFolderTree,
    getResTopLevelFolders,
    getResourceGroups,
    getThumbnailUrl,
    getVisibleResourceIds,
    handleFolderTargetMove,
    isResFavorite,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    prependExportToolbar,
    prependPersonaNoteToolbar,
    prependResDeleteToolbar,
    promptRenameFolder,
    renderPersonaDetailSubList,
    reorderResFolder,
    selectAllVisible,
    selectPersona,
    setItemGroup,
    sortResFolders,
    sortResItems,
    toggleExportItem,
    toggleMultiSelectItem,
    togglePersonaNoteItem,
    toggleResDeleteItem,
    toggleResFavorite,
    touchDragMgr,
    wouldCreateResCycle,
  } = deps;

  const leftTree = $("#cfm-persona-left-tree");
  const rightList = $("#cfm-persona-right-list");
  const pathEl = $("#cfm-persona-rh-path");
  const countEl = $("#cfm-persona-rh-count");

  // 使用渲染版本号防止异步竞争导致重复渲染
  if (!renderPersonasView._renderId) renderPersonasView._renderId = 0;
  const thisRenderId = ++renderPersonasView._renderId;

  const hasExistingPersonaUi =
    leftTree.children().length > 0 || rightList.children().length > 0;
  // 优先使用预加载的 promise（打开弹窗时已开始加载），避免重复请求
  const personaPromise = state._personasPreloadPromise || getCurrentPersonas();
  state._personasPreloadPromise = null; // 消费后清空，下次重新请求
  if (!hasExistingPersonaUi) {
    rightList.html(
      '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>',
    );
  }
  const personas = await personaPromise;

  // 如果在 await 期间有新的渲染被触发，放弃当前渲染
  if (thisRenderId !== renderPersonasView._renderId) return;

  const tree = getResFolderTree("personas");
  const allFolderIds = getResFolderIds("personas");

  // 注意：不在此处提前 return，即使 personas 为空也正常渲染左侧树和右侧面板，与其他资源类型行为保持一致

  const groups = getResourceGroups("personas");

  // 注意：不再自动清理 groups 中的映射（同预设清理说明）。

  // 分类：直接属于某文件夹的 persona
  const folderItems = {};
  const ungrouped = [];
  for (const p of personas) {
    const grp = groups[p.avatarId];
    if (grp && tree[grp]) {
      if (!folderItems[grp]) folderItems[grp] = [];
      folderItems[grp].push(p);
    } else {
      ungrouped.push(p);
    }
  }

  // 收藏入口
  const personaFavs = getResFavorites("personas");
  const personaFavCount = personas.filter((p) =>
    personaFavs.includes(p.avatarId),
  ).length;
  const personaFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${state.selectedPersonaFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${personaFavCount}</span>
      </div>
    `);
  personaFavNode.on("click", (e) => {
    e.preventDefault();
    state.selectedPersonaFolder = "__favorites__";
    renderPersonasView();
  });
  const newLeftTree = $("<div></div>");
  newLeftTree.append(personaFavNode);

  // 递归渲染左侧树节点
  function renderResTreeNode(container, folderId, depth) {
    const children = sortResFolders(
      "personas",
      getResChildFolders("personas", folderId),
    );
    const hasChildren = children.length > 0;
    const isExpanded = state.personaExpandedNodes.has(folderId);
    const isSelected = state.selectedPersonaFolder === folderId;
    const count = countResItemsRecursive("personas", folderId);
    const indent = 10 + depth * 16;

    const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("personas", folderId))}</span>
          <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
          <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);

    node.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      handleFolderTargetMove(
        (items) => items.forEach((n) => setItemGroup("personas", n, folderId)),
        () => renderPersonasView(),
        (count, first) =>
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个User移入「${getResFolderDisplayName("personas", folderId)}」`
              : `已将「${first}」移入「${getResFolderDisplayName("personas", folderId)}」`,
          ),
      );
    });
    node.find(".cfm-tnode-rename").on("click", (e) => {
      e.stopPropagation();
      promptRenameFolder("personas", folderId, () => renderPersonasView());
    });

    // 点击箭头展开/收起
    node.find(".cfm-tnode-arrow").on("click", (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      if (state.personaExpandedNodes.has(folderId))
        state.personaExpandedNodes.delete(folderId);
      else state.personaExpandedNodes.add(folderId);
      renderPersonasView();
    });

    // 点击选中
    node.on("click", (e) => {
      e.preventDefault();
      state.selectedPersonaFolder = folderId;
      renderPersonasView();
    });

    // PC拖拽（文件夹排序/嵌套）
    node.on("dragstart", (e) => {
      pcDragStart(e, {
        type: "res-folder",
        resType: "personas",
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
      const isPersonaItemDrag =
        data.type === "persona" ||
        (data.type === "res-folder" && data.resType === "personas");
      cfmDebugDragLog("presetTreeNode:dragover", {
        folderId,
        zone,
        dragData: data,
        isPersonaItemDrag,
        clientY: e.originalEvent?.clientY ?? null,
        rectTop: rect.top,
        rectHeight: rect.height,
        dropEffect: e.originalEvent?.dataTransfer?.dropEffect ?? null,
        effectAllowed: e.originalEvent?.dataTransfer?.effectAllowed ?? null,
        types: e.originalEvent?.dataTransfer?.types
          ? Array.from(e.originalEvent.dataTransfer.types)
          : [],
      });

      const isPersonaFolderDrag =
        data.type === "res-folder" && data.resType === "personas";
      if (isPersonaItemDrag && (zone === "into" || isPersonaFolderDrag)) {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "personas",
          targetKind: "folder",
          folderId,
          zone,
        };
      } else if (
        !isPersonaItemDrag &&
        state._pcLastResourceFolderHoverTarget?.groupType === "personas"
      ) {
        state._pcLastResourceFolderHoverTarget = null;
      }
      if (data.type === "res-folder" && data.resType === "personas") {
        if (data.id === folderId) {
          node.addClass("cfm-drop-forbidden");
          return;
        }
        if (
          zone === "into" &&
          wouldCreateResCycle("personas", data.id, folderId)
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
        data.resType === "personas" &&
        data.id !== folderId
      ) {
        if (zone === "into") {
          if (wouldCreateResCycle("personas", data.id, folderId)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("personas", data.id, folderId, null);
          cfmToastr.success(
            `「${getResFolderDisplayName("personas", data.id)}」已移入「${getResFolderDisplayName("personas", folderId)}」`,
          );
        } else {
          const pId = tree[folderId]?.parentId || null;
          if (wouldCreateResCycle("personas", data.id, pId)) {
            cfmToastr.error("循环嵌套，已阻止");
            return;
          }
          if (zone === "before") {
            reorderResFolder("personas", data.id, pId, folderId);
          } else {
            const sibs = sortResFolders(
              "personas",
              getResChildFolders("personas", pId),
            );
            const ci = sibs.indexOf(folderId);
            reorderResFolder(
              "personas",
              data.id,
              pId,
              ci < sibs.length - 1 ? sibs[ci + 1] : null,
            );
          }
          cfmToastr.success(`「${data.id}」已排序`);
        }
        renderPersonasView();
      } else if (data.type === "persona") {
        const personaIds =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatarId];
        const pCount = personaIds.length;
        personaIds.forEach((n) => setItemGroup("personas", n, folderId));
        if (data.multiSelect) clearMultiSelect();
        renderPersonasView();
        cfmToastr.success(
          pCount > 1
            ? `已将 ${pCount} 个User移入「${getResFolderDisplayName("personas", folderId)}」`
            : `已将「${data.name}」移入「${getResFolderDisplayName("personas", folderId)}」`,
        );
      }
    });

    // 触摸拖拽
    touchDragMgr.bind(node, () => ({
      type: "res-folder",
      resType: "personas",
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
    "personas",
    getResTopLevelFolders("personas"),
  );
  for (const fid of topFolders) renderResTreeNode(newLeftTree, fid, 0);

  // 未归类入口
  const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedPersonaFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类User</span>
        <span class="cfm-tnode-target" title="移入此处"><i class="fa-solid fa-crosshairs"></i></span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
  uncatNode.find(".cfm-tnode-target").on("click", (e) => {
    e.stopPropagation();
    handleFolderTargetMove(
      (items) => items.forEach((n) => setItemGroup("personas", n, null)),
      () => renderPersonasView(),
      (count, first) =>
        cfmToastr.success(
          count > 1
            ? `已将 ${count} 个User移出文件夹`
            : `已将「${first}」移出文件夹`,
        ),
    );
  });
  uncatNode.on("click", (e) => {
    e.preventDefault();
    state.selectedPersonaFolder = "__ungrouped__";
    renderPersonasView();
  });
  uncatNode.on("dragover", (e) => {
    e.preventDefault();
    uncatNode.addClass("cfm-drop-target");
    e.originalEvent.dataTransfer.dropEffect = "move";
    const data = state._pcDragData || {};
    if (data.type === "persona") {
      state._pcLastResourceFolderHoverTarget = {
        groupType: "personas",
        targetKind: "ungrouped",
        zone: "into",
      };
    } else if (
      state._pcLastResourceFolderHoverTarget?.groupType === "personas"
    ) {
      state._pcLastResourceFolderHoverTarget = null;
    }
  });
  uncatNode.on("dragleave", () => uncatNode.removeClass("cfm-drop-target"));
  uncatNode.on("drop", (e) => {
    e.preventDefault();
    state._pcDropHandled = true;
    state._pcLastResourceFolderHoverTarget = null;
    $(".cfm-right-list-drop-target").removeClass("cfm-right-list-drop-target");
    uncatNode.removeClass("cfm-drop-target");
    const d = pcGetDropData(e);
    if (d) {
      if (d.type === "res-folder" && d.id && d.resType === "personas") {
        reorderResFolder("personas", d.id, null, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("personas", d.id)}」已移出到根目录`,
        );
        renderPersonasView();
      } else if (d.type === "persona") {
        const personaIds =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.avatarId];
        const pCount = personaIds.length;
        personaIds.forEach((n) => setItemGroup("personas", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderPersonasView();
        cfmToastr.success(
          pCount > 1
            ? `已将 ${pCount} 个User移出文件夹`
            : `已将「${d.name}」移出文件夹`,
        );
      }
    }
  });
  newLeftTree.append(uncatNode);

  if (topFolders.length === 0) {
    uncatNode.before(
      '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
    );
  }

  // 右侧渲染
  // 如果搜索栏有内容，保持搜索模式
  const personaSearchQuery = $("#cfm-persona-global-search").val();
  if (personaSearchQuery && personaSearchQuery.trim()) {
    leftTree.empty().append(newLeftTree.children());
    executePersonaSearch();
    return;
  }

  const newRightList = $("<div></div>");

  const currentUserAvatar =
    $("#user_avatar_block .avatar-container.selected").attr("data-avatar-id") ||
    null;

  let displayItems = [];
  let displayTitle = "选择左侧文件夹查看内容";
  let childFolders = [];

  if (state.selectedPersonaFolder === "__favorites__") {
    const favs = getResFavorites("personas");
    displayItems = personas.filter((p) => favs.includes(p.avatarId));
    displayTitle = "⭐ 收藏";
  } else if (state.selectedPersonaFolder === "__ungrouped__") {
    displayItems = ungrouped;
    displayTitle = "未归类User";
  } else if (state.selectedPersonaFolder && tree[state.selectedPersonaFolder]) {
    displayItems = folderItems[state.selectedPersonaFolder] || [];
    childFolders = sortResFolders(
      "personas",
      getResChildFolders("personas", state.selectedPersonaFolder),
    );
    const path = getResFolderPath("personas", state.selectedPersonaFolder)
      .map((id) => getResFolderDisplayName("personas", id))
      .join(" › ");
    displayTitle = path;
  }

  // 应用右栏排序
  if (state.personaRightSortMode && displayItems.length > 0) {
    displayItems = sortResItems(
      displayItems,
      state.personaRightSortMode,
      (p) => (typeof p === "string" ? p : p.name),
    );
  }

  pathEl.text(displayTitle);
  const totalItems = childFolders.length + displayItems.length;
  if (
    state.selectedPersonaFolder === "__favorites__" ||
    state.selectedPersonaFolder === "__ungrouped__"
  ) {
    countEl.text(`${displayItems.length} 个User`);
  } else {
    countEl.text(state.selectedPersonaFolder ? `${totalItems} 项` : "");
  }

  if (!state.selectedPersonaFolder) {
    newRightList.append(
      '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
    );
  } else if (
    state.selectedPersonaFolder === "__favorites__" &&
    totalItems === 0
  ) {
    newRightList.append(
      '<div class="cfm-right-empty">还没有收藏任何User<br><span style="font-size:12px;opacity:0.5;">点击User行右侧的 ☆ 按钮添加收藏</span></div>',
    );
  } else if (
    state.selectedPersonaFolder === "__ungrouped__" &&
    totalItems === 0
  ) {
    newRightList.append('<div class="cfm-right-empty">没有未归类的User</div>');
  } else if (totalItems === 0) {
    newRightList.append('<div class="cfm-right-empty">此文件夹为空</div>');
  } else {
    // 子文件夹行
    for (const childId of childFolders) {
      const childCount = countResItemsRecursive("personas", childId);
      const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("personas", childId))}</div>
            <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
            <div class="cfm-row-rename-btn" title="重命名文件夹"><i class="fa-solid fa-pen"></i></div>
            <div class="cfm-row-meta">${childCount} 个User</div>
          </div>
        `);
      row.find(".cfm-row-target-btn").on("click", (e) => {
        e.stopPropagation();
        handleFolderTargetMove(
          (items) => items.forEach((n) => setItemGroup("personas", n, childId)),
          () => renderPersonasView(),
          (count, first) =>
            cfmToastr.success(
              count > 1
                ? `已将 ${count} 个User移入「${getResFolderDisplayName("personas", childId)}」`
                : `已将「${first}」移入「${getResFolderDisplayName("personas", childId)}」`,
            ),
        );
      });
      row.find(".cfm-row-rename-btn").on("click", (e) => {
        e.stopPropagation();
        promptRenameFolder("personas", childId, () => renderPersonasView());
      });
      row.on("click", (e) => {
        e.preventDefault();
        const path = getResFolderPath("personas", childId);
        for (const pid of path) state.personaExpandedNodes.add(pid);
        state.selectedPersonaFolder = childId;
        renderPersonasView();
      });
      row.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "personas",
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
      // 右侧子文件夹行也是拖放目标
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
        if (data.type === "res-folder" && data.resType === "personas") {
          if (data.id === childId) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("personas", data.id, childId)
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
          data.resType === "personas" &&
          data.id !== childId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("personas", data.id, childId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("personas", data.id, childId, null);
            cfmToastr.success(
              `「${getResFolderDisplayName("personas", data.id)}」已移入「${getResFolderDisplayName("personas", childId)}」`,
            );
          } else {
            const pId = tree[childId]?.parentId || null;
            if (wouldCreateResCycle("personas", data.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("personas", data.id, pId, childId);
            } else {
              const sibs = sortResFolders(
                "personas",
                getResChildFolders("personas", pId),
              );
              const ci = sibs.indexOf(childId);
              reorderResFolder(
                "personas",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${data.id}」已排序`);
          }
          renderPersonasView();
        } else if (data.type === "persona") {
          const personaIds =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.avatarId];
          const pCount = personaIds.length;
          personaIds.forEach((n) => setItemGroup("personas", n, childId));
          if (data.multiSelect) clearMultiSelect();
          cfmToastr.success(
            pCount > 1
              ? `已将 ${pCount} 个User移入「${getResFolderDisplayName("personas", childId)}」`
              : `已将「${data.name}」移入「${getResFolderDisplayName("personas", childId)}」`,
          );
          renderPersonasView();
        }
      });
      touchDragMgr.bind(row, () => ({
        type: "res-folder",
        resType: "personas",
        id: childId,
        name: getResFolderDisplayName("personas", childId),
      }));
      newRightList.append(row);
    }

    // ===== 合并同名 User：将同名的合并为“叠堆”分组 =====
    const mergeEnabled =
      !!extension_settings[extensionName].mergeSameNameUser &&
      !state.cfmMultiSelectMode &&
      !state.cfmExportMode &&
      !state.cfmResDeleteMode &&
      !state.cfmPersonaNoteMode;
    if (!extension_settings[extensionName].personaStackExpanded) {
      extension_settings[extensionName].personaStackExpanded = {};
    }
    const stackExpandedMap =
      extension_settings[extensionName].personaStackExpanded;
    const renderQueue = [];
    if (mergeEnabled) {
      const nameMap = new Map();
      for (const p of displayItems) {
        const key = String(p.name || "")
          .trim()
          .toLowerCase();
        if (!key) {
          renderQueue.push({ kind: "single", persona: p });
          continue;
        }
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key).push(p);
      }
      // 保留 displayItems 原顺序：用首次出现的位置作为 anchor
      const visited = new Set();
      for (const p of displayItems) {
        const key = String(p.name || "")
          .trim()
          .toLowerCase();
        if (!key) continue;
        if (visited.has(key)) continue;
        visited.add(key);
        const group = nameMap.get(key);
        if (group.length === 1) {
          renderQueue.push({ kind: "single", persona: group[0] });
        } else {
          renderQueue.push({ kind: "stack", name: p.name, group });
        }
      }
    } else {
      for (const p of displayItems) {
        renderQueue.push({ kind: "single", persona: p });
      }
    }

    // 渲染叠堆行的辅助函数
    function renderPersonaStackRow(stackName, group) {
      const stackKey = String(stackName || "")
        .trim()
        .toLowerCase();
      const isExpanded = !!stackExpandedMap[stackKey];
      const activeInGroup = group.some((g) => g.avatarId === currentUserAvatar);
      const favInGroup = group.some((g) =>
        isResFavorite("personas", g.avatarId),
      );
      const maxStack = Math.min(group.length, 3);
      let stackImgsHtml = "";
      for (let i = maxStack - 1; i >= 0; i--) {
        const url = getThumbnailUrl("persona", group[i].avatarId);
        stackImgsHtml += `<img class="cfm-persona-stack-img cfm-persona-stack-img-${i}" src="${url}" alt="avatar" onerror="this.src='/img/ai4.png'">`;
      }
      const stackRow = $(`
          <div class="cfm-row cfm-row-char cfm-persona-stack-row ${activeInGroup ? "cfm-rv-item-active" : ""} ${isExpanded ? "cfm-persona-stack-expanded" : ""}" data-stack-name="${escapeHtml(stackName)}">
            <div class="cfm-row-icon cfm-persona-stack">
              ${stackImgsHtml}
              <span class="cfm-persona-stack-count">${group.length}</span>
            </div>
            <div class="cfm-row-name"><span class="cfm-char-name-inline cfm-persona-name-inline"><div class="cfm-char-detail-toggle cfm-persona-stack-toggle" title="展开/折叠同名User"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></div><span class="cfm-persona-name-text">${escapeHtml(stackName)}</span><span class="cfm-persona-stack-badge" title="共 ${group.length} 个同名User">×${group.length}</span></span></div>
            <div class="cfm-row-star ${favInGroup ? "cfm-star-active" : ""}" title="组内含收藏"><i class="fa-${favInGroup ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
      stackRow.on("click", function (e) {
        if ($(e.target).closest(".cfm-row-star").length) return;
        stackExpandedMap[stackKey] = !stackExpandedMap[stackKey];
        renderPersonasView();
      });
      newRightList.append(stackRow);
      if (isExpanded) {
        const sublist = $('<div class="cfm-persona-stack-sublist"></div>');
        for (const sp of group) {
          renderSinglePersonaRow(sp, sublist);
        }
        newRightList.append(sublist);
      }
    }

    // 主循环：根据 renderQueue 渲染
    for (const item of renderQueue) {
      if (item.kind === "stack") {
        renderPersonaStackRow(item.name, item.group);
        continue;
      }
      renderSinglePersonaRow(item.persona, newRightList);
    }

    // 抽取的单条 User 行渲染函数（沿用原循环体逻辑）
    function renderSinglePersonaRow(p, containerToUse) {
      containerToUse = containerToUse || newRightList;
      const isActive = p.avatarId === currentUserAvatar;
      const bindStates = getPersonaBindStates(p);
      const isDefaultPersona = !!bindStates.default;
      const fav = isResFavorite("personas", p.avatarId);
      const isMSel =
        state.cfmMultiSelectMode && state.cfmMultiSelected.has(p.avatarId);
      const isExpSel =
        state.cfmExportMode && state.cfmExportSelected.has(p.avatarId);
      const isDelSel =
        state.cfmResDeleteMode && state.cfmResDeleteSelected.has(p.avatarId);
      const isNoteSel =
        state.cfmPersonaNoteMode &&
        state.cfmPersonaNoteSelected.has(p.avatarId);
      const msCheckHtml = state.cfmResDeleteMode
        ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
        : state.cfmExportMode
          ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
          : state.cfmPersonaNoteMode
            ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
            : state.cfmMultiSelectMode
              ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
              : "";
      // 备注信息
      const personaNote = getPersonaNote(p.avatarId);
      const noteHtml = personaNote
        ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(personaNote)}">${escapeHtml(personaNote)}</span>`
        : "";
      // 绑定角色/群组标签
      const connHtml = buildPersonaConnHtml(p.connections);
      // 非模式状态下显示单个备注编辑按钮
      const noModeActive =
        !state.cfmExportMode &&
        !state.cfmResDeleteMode &&
        !state.cfmMultiSelectMode &&
        !state.cfmPersonaNoteMode;
      const singleCopyBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-copy-btn" title="复制人设"><i class="fa-solid fa-copy"></i></div>`
        : "";
      const singleNoteBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
      // 头像缩略图
      const thumbUrl = getThumbnailUrl("persona", p.avatarId);
      const isExpanded = state.personaItemExpandedIds.has(p.avatarId);
      const detailToggleHtml = `<div class="cfm-char-detail-toggle cfm-persona-toggle" title="展开/折叠User设定"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></div>`;
      const row = $(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""}" data-avatar-id="${escapeHtml(p.avatarId)}" data-res-id="${escapeHtml(p.avatarId)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon cfm-persona-avatar ${isDefaultPersona ? "cfm-persona-avatar-default" : ""}" title="${isDefaultPersona ? "默认 User" : ""}"><img src="${thumbUrl}" alt="avatar" onerror="this.src='/img/ai4.png'"></div>
            <div class="cfm-row-name"><span class="cfm-char-name-inline cfm-persona-name-inline">${detailToggleHtml}<span class="cfm-persona-name-text">${escapeHtml(p.name)}</span></span>${p.title ? `<span class="cfm-persona-title">${escapeHtml(p.title)}</span>` : ""}${noteHtml}${connHtml}</div>
            ${singleCopyBtn}
            ${singleNoteBtn}
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
      bindTouchSafeTap(row.find(".cfm-row-star"), () => {
        const nowFav = toggleResFavorite("personas", p.avatarId);
        const starEl = row.find(".cfm-row-star");
        starEl.toggleClass("cfm-star-active", nowFav);
        starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
        starEl
          .find("i")
          .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
        // 更新左侧收藏计数
        const favCountEl = $(
          "#cfm-persona-left-tree .cfm-tnode-favorites .cfm-tnode-count",
        );
        if (favCountEl.length) {
          const newCount = personas.filter((pp) =>
            getResFavorites("personas").includes(pp.avatarId),
          ).length;
          favCountEl.text(newCount);
        }
        if (state.selectedPersonaFolder === "__favorites__")
          renderPersonasView();
      });
      // 单个复制按钮
      bindTouchSafeTap(row.find(".cfm-row-copy-btn"), async () => {
        await duplicatePersona(p);
      });
      // 单个备注编辑按钮
      bindTouchSafeTap(row.find(".cfm-row-note-btn"), () => {
        executePersonaNoteEdit([p.avatarId]);
      });
      bindTouchSafeTap(row.find(".cfm-persona-toggle"), () => {
        if (state.personaItemExpandedIds.has(p.avatarId)) {
          state.personaItemExpandedIds.delete(p.avatarId);
          row.next(".cfm-chat-sublist").slideUp(150, function () {
            $(this).remove();
          });
          row
            .find(".cfm-persona-toggle i")
            .removeClass("fa-caret-down")
            .addClass("fa-caret-right");
        } else {
          state.personaItemExpandedIds.add(p.avatarId);
          row
            .find(".cfm-persona-toggle i")
            .removeClass("fa-caret-right")
            .addClass("fa-caret-down");
          renderPersonaDetailSubList(row, p);
          row.next(".cfm-chat-sublist").hide().slideDown(150);
        }
      });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-row-copy-btn, .cfm-row-note-btn, .cfm-persona-toggle",
          ).length
        )
          return;
        if (state.cfmPersonaNoteMode) {
          togglePersonaNoteItem(p.avatarId, e.shiftKey);
          renderPersonasView();
          return;
        }
        if (state.cfmResDeleteMode) {
          toggleResDeleteItem(p.avatarId, e.shiftKey);
          renderPersonasView();
          return;
        }
        if (state.cfmExportMode) {
          toggleExportItem(p.avatarId, e.shiftKey);
          renderPersonasView();
          return;
        }
        if (state.cfmMultiSelectMode) {
          toggleMultiSelectItem(p.avatarId, e.shiftKey);
          renderPersonasView();
          return;
        }
        selectPersona(p.avatarId);
        rightList.find(".cfm-rv-item-active").removeClass("cfm-rv-item-active");
        row.addClass("cfm-rv-item-active");
        cfmToastr.success(`已切换到User「${p.name}」`);
      });
      row.on("dragstart", (e) => {
        const singleData = {
          type: "persona",
          name: p.name,
          avatarId: p.avatarId,
        };
        const dragData = getMultiDragData(singleData);
        pcDragStart(e, dragData);
      });
      row.on("dragend", () => pcDragEnd());
      touchDragMgr.bind(row, () => {
        const singleData = {
          type: "persona",
          name: p.name,
          avatarId: p.avatarId,
        };
        return getMultiDragData(singleData);
      });
      containerToUse.append(row);
      if (state.personaItemExpandedIds.has(p.avatarId)) {
        renderPersonaDetailSubList(row, p);
      }
    }

    // 删除工具栏
    prependResDeleteToolbar(newRightList, renderPersonasView);
    // 导出工具栏
    prependExportToolbar(newRightList, renderPersonasView);
    // User备注工具栏
    prependPersonaNoteToolbar(newRightList, renderPersonasView);
    // 多选工具栏
    if (state.cfmMultiSelectMode && state.selectedPersonaFolder) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 &&
        visible.every((id) => state.cfmMultiSelected.has(id));
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
        renderPersonasView();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
        if (state.cfmMultiSelectRangeMode)
          state.cfmMultiSelectLastClicked = null;
        renderPersonasView();
      });
      newRightList.prepend(toolbar);
    }
  }

  // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
  if (
    state.selectedPersonaFolder &&
    state.selectedPersonaFolder !== "__ungrouped__" &&
    state.selectedPersonaFolder !== "__favorites__" &&
    tree[state.selectedPersonaFolder]
  ) {
    const currentFolder = state.selectedPersonaFolder;
    rightList.off("dragover dragleave drop");
    rightList.on("dragover", (e) => {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = "move";
      if ($(e.target).closest(".cfm-row").length > 0) return;
      rightList.addClass("cfm-right-list-drop-target");
    });
    rightList.on("dragleave", (e) => {
      if ($(e.relatedTarget).closest("#cfm-persona-right-list").length === 0) {
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
        data.resType === "personas" &&
        data.id !== currentFolder
      ) {
        if (wouldCreateResCycle("personas", data.id, currentFolder)) {
          cfmToastr.error("循环嵌套，已阻止");
          return;
        }
        reorderResFolder("personas", data.id, currentFolder, null);
        cfmToastr.success(
          `「${getResFolderDisplayName("personas", data.id)}」已移入「${getResFolderDisplayName("personas", currentFolder)}」`,
        );
        renderPersonasView();
      } else if (data.type === "persona") {
        const personaIds =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatarId];
        const pCount = personaIds.length;
        personaIds.forEach((n) => setItemGroup("personas", n, currentFolder));
        if (data.multiSelect) clearMultiSelect();
        cfmToastr.success(
          pCount > 1
            ? `已将 ${pCount} 个User移入「${getResFolderDisplayName("personas", currentFolder)}」`
            : `已将「${data.name}」移入「${getResFolderDisplayName("personas", currentFolder)}」`,
        );
        renderPersonasView();
      }
    });
  }

  leftTree.empty().append(newLeftTree.children());
  rightList.empty().append(newRightList.children());
}
