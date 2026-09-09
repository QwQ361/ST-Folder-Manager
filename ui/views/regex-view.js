// 正则视图组件层：承接 regex 资源页的 DOM 组装、树/列表区域组合、脚本操作按钮出口与详情入口；正则分组、收藏、重命名业务保留在 features/regex。

export async function renderRegexViewCore(deps) {
  const renderRegexView = deps.renderRegexView;
  const state = deps.state;
  const {
    $,
    applyGlobalRegexMultiActivation,
    bindTouchSafeTap,
    buildRegexScriptRowHtml,
    cfmToastr,
    clearMultiSelect,
    ensureResourceSettings,
    escapeHtml,
    executeRegexSearch,
    extensionName,
    extension_settings,
    fetch,
    getCharacters,
    getContext,
    getRegexGlobalScripts,
    getResFavorites,
    getVisibleResourceIds,
    handleFolderTargetMove,
    moveRegexFolder,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    prependExportToolbar,
    prependResDeleteToolbar,
    prompt,
    recordTouchTapStart,
    selectAllVisible,
    shouldIgnoreTouchTapAfterMove,
    syncNativeRegexState,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    touchDragMgr,
  } = deps;

    const treeEl = $("#cfm-regex-left-tree");
    const rightList = $("#cfm-regex-right-list");
    const rhPath = $("#cfm-regex-rh-path");
    const rhCount = $("#cfm-regex-rh-count");
    if (!treeEl.length) return;

    // --- 收集数据 ---
    ensureResourceSettings();
    const globalScripts = getRegexGlobalScripts();
    const folderTree = extension_settings[extensionName].regexFolderTree;
    const globalGroups = extension_settings[extensionName].regexGlobalGroups;

    // --- 辅助函数 ---
    function sortRegexFolders(folderIds) {
      return [...folderIds].sort((a, b) => {
        const oa = folderTree[a]?.sortOrder ?? 0;
        const ob = folderTree[b]?.sortOrder ?? 0;
        if (oa !== ob) return oa - ob;
        return (folderTree[a]?.displayName || a).localeCompare(
          folderTree[b]?.displayName || b,
          "zh-CN",
        );
      });
    }
    function getRegexChildFolders(parentId) {
      return Object.keys(folderTree).filter(
        (id) => folderTree[id].parentId === parentId,
      );
    }
    function countScriptsInFolder(folderId) {
      let c = globalScripts.filter(
        (s) => globalGroups[s.id] === folderId,
      ).length;
      for (const childId of getRegexChildFolders(folderId))
        c += countScriptsInFolder(childId);
      return c;
    }
    function getRegexTopLevelFolders() {
      return Object.keys(folderTree).filter((id) => !folderTree[id].parentId);
    }
    function getRegexFolderPath(folderId) {
      const path = [];
      let cur = folderId;
      while (cur && folderTree[cur]) {
        path.unshift(cur);
        cur = folderTree[cur].parentId;
      }
      return path;
    }

    // --- 构建左侧树（与预设页一致：收藏→文件夹→未归类） ---
    treeEl.empty();
    state.regexAllNodeIds = [];

    // 1. 收藏入口
    const regexFavs = getResFavorites("regex");
    const regexFavCount = globalScripts.filter(
      (s) => s.id && regexFavs.includes(s.id),
    ).length;
    const regexFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${state.selectedRegexNode === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${regexFavCount}</span>
      </div>
    `);
    regexFavNode.on("click", (e) => {
      e.preventDefault();
      state.selectedRegexNode = "__favorites__";
      renderRegexView();
    });
    treeEl.append(regexFavNode);

    // 辅助：将多选脚本移入指定文件夹（或置为未归类）
    function moveSelectedRegexToFolder(targetFolderId) {
      handleFolderTargetMove(
        (items) => {
          items.forEach((sid) => {
            if (targetFolderId) globalGroups[sid] = targetFolderId;
            else delete globalGroups[sid];
          });
          getContext().saveSettingsDebounced();
        },
        () => renderRegexView(),
        (count, firstId) => {
          const fname = targetFolderId
            ? folderTree[targetFolderId]?.displayName || targetFolderId
            : "未归类";
          const firstName =
            globalScripts.find((sc) => sc.id === firstId)?.scriptName ||
            firstId;
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个脚本移入「${fname}」`
              : `已将「${firstName}」移入「${fname}」`,
          );
        },
      );
    }

    // 2. 递归渲染文件夹树节点
    function renderRegexTreeNode(container, folderId, depth) {
      const children = sortRegexFolders(getRegexChildFolders(folderId));
      const hasChildren = children.length > 0;
      const isExpanded = state.regexExpandedNodes.has(folderId);
      const isSelected = state.selectedRegexNode === folderId;
      const count = countScriptsInFolder(folderId);
      const indent = 10 + depth * 16;
      const displayName = folderTree[folderId]?.displayName || folderId;
      state.regexAllNodeIds.push(folderId);
      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(displayName)}</span>
          <span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span>
          <span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (state.regexExpandedNodes.has(folderId))
          state.regexExpandedNodes.delete(folderId);
        else state.regexExpandedNodes.add(folderId);
        renderRegexView();
      });
      node.find(".cfm-tnode-target").on("click", (e) => {
        e.stopPropagation();
        moveSelectedRegexToFolder(folderId);
      });
      node.find(".cfm-tnode-rename").on("click", (e) => {
        e.stopPropagation();
        const currentName = folderTree[folderId]?.displayName || folderId;
        const newName = prompt("重命名文件夹", currentName);
        if (!newName || !newName.trim() || newName.trim() === currentName)
          return;
        folderTree[folderId].displayName = newName.trim();
        getContext().saveSettingsDebounced();
        cfmToastr.success(`文件夹已重命名为「${newName.trim()}」`);
        renderRegexView();
      });
      node.on("click", (e) => {
        e.preventDefault();
        state.selectedRegexNode = folderId;
        renderRegexView();
      });
      // 树节点作为拖放目标（接收脚本/文件夹）
      node.on("dragover", (e) => {
        e.preventDefault();
        node.addClass("cfm-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
        const data = state._pcDragData || {};
        if (data.type === "regex-script") {
          state._pcLastResourceFolderHoverTarget = {
            groupType: "regex",
            targetKind: "folder",
            folderId,
            zone: "into",
          };
        } else if (data.type === "regex-folder" && data.id !== folderId) {
          state._pcLastResourceFolderHoverTarget = {
            groupType: "regex",
            targetKind: "folder",
            folderId,
            zone: "into",
          };
        }
      });
      node.on("dragleave", () => node.removeClass("cfm-drop-target"));
      node.on("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state._pcDropHandled = true;
        state._pcLastResourceFolderHoverTarget = null;
        node.removeClass("cfm-drop-target");
        const data = pcGetDropData(e);
        if (!data) return;
        const fname = folderTree[folderId]?.displayName || folderId;
        if (data.type === "regex-script") {
          const scriptIds =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.scriptId];
          scriptIds.forEach((sid) => {
            globalGroups[sid] = folderId;
          });
          if (data.multiSelect) clearMultiSelect();
          getContext().saveSettingsDebounced();
          cfmToastr.success(
            scriptIds.length > 1
              ? `已将 ${scriptIds.length} 个脚本移入「${fname}」`
              : `已将「${data.scriptName}」移入「${fname}」`,
          );
          renderRegexView();
        } else if (data.type === "regex-folder") {
          const moved = moveRegexFolder(data, {
            groupType: "regex",
            targetKind: "folder",
            folderId,
            zone: "into",
          });
          if (!moved.length) return;
          cfmToastr.success(`已将「${data.name || data.id}」移入「${fname}」`);
          renderRegexView();
        }
      });
      // 树节点本身可拖拽（文件夹拖拽暂不处理排序，仅为视觉一致）
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "regex-folder",
          id: folderId,
          name: displayName,
        });
        node.addClass("cfm-dragging");
      });
      node.on("dragend", () => {
        node.removeClass("cfm-dragging");
        pcDragEnd();
      });
      touchDragMgr.bind(node, () => ({
        type: "regex-folder",
        id: folderId,
        name: displayName,
      }));
      container.append(node);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderRegexTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }
    const topFolders = sortRegexFolders(getRegexTopLevelFolders());
    for (const fid of topFolders) renderRegexTreeNode(treeEl, fid, 0);

    // 3. 未归类入口
    const ungroupedScripts = globalScripts.filter(
      (s) => !globalGroups[s.id] || !folderTree[globalGroups[s.id]],
    );
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedRegexNode === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类</span>
        <span class="cfm-tnode-target" title="移出文件夹（取消归类）"><i class="fa-solid fa-crosshairs"></i></span>
        <span class="cfm-tnode-count">${ungroupedScripts.length}</span>
      </div>
    `);
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      moveSelectedRegexToFolder(null);
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      state.selectedRegexNode = "__ungrouped__";
      renderRegexView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
      const data = state._pcDragData || {};
      if (data.type === "regex-script" || data.type === "regex-folder") {
        state._pcLastResourceFolderHoverTarget = {
          groupType: "regex",
          targetKind: "ungrouped",
          zone: "into",
        };
      } else if (state._pcLastResourceFolderHoverTarget?.groupType === "regex") {
        state._pcLastResourceFolderHoverTarget = null;
      }
    });
    uncatNode.on("dragleave", () => uncatNode.removeClass("cfm-drop-target"));
    uncatNode.on("drop", (e) => {
      e.preventDefault();
      state._pcDropHandled = true;
      state._pcLastResourceFolderHoverTarget = null;
      uncatNode.removeClass("cfm-drop-target");
      const data = pcGetDropData(e);
      if (!data) return;
      if (data.type === "regex-folder" && data.id) {
        const moved = moveRegexFolder(data, {
          groupType: "regex",
          targetKind: "ungrouped",
          zone: "into",
        });
        if (!moved.length) return;
        cfmToastr.success(`「${data.name || data.id}」已移出到根目录`);
        renderRegexView();
      } else if (data.type === "regex-script") {
        const scriptIds =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.scriptId];
        scriptIds.forEach((sid) => {
          delete globalGroups[sid];
        });
        if (data.multiSelect) clearMultiSelect();
        getContext().saveSettingsDebounced();
        cfmToastr.success(
          scriptIds.length > 1
            ? `已将 ${scriptIds.length} 个脚本移出文件夹`
            : `已将「${data.scriptName}」移出文件夹`,
        );
        renderRegexView();
      }
    });
    treeEl.append(uncatNode);
    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }

    // --- 右侧渲染 ---
    rightList.empty();

    let displayScripts = [];
    let displayTitle = "";
    let childFolders = [];

    if (!state.selectedRegexNode) {
      // 初始状态：未选中任何节点
      displayTitle = "选择左侧文件夹查看内容";
    } else if (state.selectedRegexNode === "__favorites__") {
      displayScripts = globalScripts.filter(
        (s) => s.id && regexFavs.includes(s.id),
      );
      displayTitle = "⭐ 收藏";
    } else if (state.selectedRegexNode === "__ungrouped__") {
      displayScripts = ungroupedScripts;
      displayTitle = "未归类";
    } else if (folderTree[state.selectedRegexNode]) {
      const fid = state.selectedRegexNode;
      childFolders = sortRegexFolders(getRegexChildFolders(fid));
      displayScripts = globalScripts.filter((s) => globalGroups[s.id] === fid);
      displayTitle = getRegexFolderPath(fid)
        .map((id) => folderTree[id]?.displayName || id)
        .join(" › ");
    } else {
      // 无效节点，重置为未选中
      state.selectedRegexNode = null;
      displayTitle = "选择左侧文件夹查看内容";
    }

    const totalItems = childFolders.length + displayScripts.length;
    rhPath.text(displayTitle);
    if (childFolders.length === 0) {
      rhCount.text(
        displayScripts.length > 0 ? `${displayScripts.length} 个正则` : "",
      );
    } else {
      rhCount.text(totalItems > 0 ? `${totalItems} 项` : "");
    }

    if (!state.selectedRegexNode) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (state.selectedRegexNode === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何正则脚本<br><span style="font-size:12px;opacity:0.5;">点击脚本行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">暂无正则脚本</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countScriptsInFolder(childId);
        const childDisplayName = folderTree[childId]?.displayName || childId;
        const folderRow = $(`
          <div class="cfm-row cfm-row-folder" data-target-folder="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(childDisplayName)}</div>
            <div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div>
            <div class="cfm-row-meta">${childCount} 个脚本</div>
          </div>
        `);
        folderRow.find(".cfm-row-target-btn").on("click", (e) => {
          e.stopPropagation();
          moveSelectedRegexToFolder(childId);
        });
        folderRow.on("click", (e) => {
          e.preventDefault();
          const path = getRegexFolderPath(childId);
          for (const pid of path) state.regexExpandedNodes.add(pid);
          state.selectedRegexNode = childId;
          renderRegexView();
        });
        folderRow.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "regex-folder",
            id: childId,
            name: childDisplayName,
          });
          folderRow.addClass("cfm-dragging");
        });
        folderRow.on("dragend", () => {
          folderRow.removeClass("cfm-dragging");
          pcDragEnd();
          $(".cfm-row").removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
        });
        folderRow.on("dragover", (e) => {
          e.preventDefault();
          folderRow.removeClass("cfm-drop-target cfm-drop-forbidden");
          const data = state._pcDragData || {};
          if (data.type === "regex-script") {
            state._pcLastResourceFolderHoverTarget = {
              groupType: "regex",
              targetKind: "folder",
              folderId: childId,
              zone: "into",
            };
            folderRow.addClass("cfm-drop-target");
          } else if (data.type === "regex-folder" && data.id !== childId) {
            state._pcLastResourceFolderHoverTarget = {
              groupType: "regex",
              targetKind: "folder",
              folderId: childId,
              zone: "into",
            };
            folderRow.addClass("cfm-drop-target");
          } else {
            if (state._pcLastResourceFolderHoverTarget?.groupType === "regex") {
              state._pcLastResourceFolderHoverTarget = null;
            }
            folderRow.addClass("cfm-drop-forbidden");
            return;
          }
          e.originalEvent.dataTransfer.dropEffect = "move";
        });
        folderRow.on("dragleave", () => {
          folderRow.removeClass("cfm-drop-target cfm-drop-forbidden");
        });
        folderRow.on("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state._pcDropHandled = true;
          state._pcLastResourceFolderHoverTarget = null;
          folderRow.removeClass("cfm-drop-target cfm-drop-forbidden");
          const data = pcGetDropData(e);
          if (!data) return;
          if (data.type === "regex-script") {
            const scriptIds =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.scriptId];
            scriptIds.forEach((sid) => {
              globalGroups[sid] = childId;
            });
            if (data.multiSelect) clearMultiSelect();
            getContext().saveSettingsDebounced();
            cfmToastr.success(
              scriptIds.length > 1
                ? `已将 ${scriptIds.length} 个脚本移入「${childDisplayName}」`
                : `已将「${data.scriptName}」移入「${childDisplayName}」`,
            );
            renderRegexView();
          } else if (data.type === "regex-folder") {
            const moved = moveRegexFolder(data, {
              groupType: "regex",
              targetKind: "folder",
              folderId: childId,
              zone: "into",
            });
            if (!moved.length) return;
            cfmToastr.success(
              `已将「${data.name || data.id}」移入「${childDisplayName}」`,
            );
            renderRegexView();
          }
        });
        touchDragMgr.bind(folderRow, () => ({
          type: "regex-folder",
          id: childId,
          name: childDisplayName,
        }));
        rightList.append(folderRow);
      }
      // 脚本行
      displayScripts.forEach((s) => {
        const isDelSel =
          state.cfmResDeleteMode && s.id && state.cfmResDeleteSelected.has(s.id);
        const isExportSel =
          state.cfmExportMode && s.id && state.cfmExportSelected.has(s.id);
        const isMSel = state.cfmMultiSelectMode && s.id && state.cfmMultiSelected.has(s.id);
        const scriptRow = $(buildRegexScriptRowHtml(s, 0, ""));
        if (isDelSel) scriptRow.addClass("cfm-res-delete-row-selected");
        if (isExportSel) scriptRow.addClass("cfm-export-row-selected");
        if (isMSel) scriptRow.addClass("cfm-multisel-row-selected");
        // 收藏星标点击事件
        bindTouchSafeTap(scriptRow.find(".cfm-row-star"), () => {
          if (!s.id) return;
          const nowFav = toggleResFavorite("regex", s.id);
          const starEl = scriptRow.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          // 更新左侧收藏计数
          const favCountEl = $(
            "#cfm-regex-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = globalScripts.filter(
              (sc) => sc.id && getResFavorites("regex").includes(sc.id),
            ).length;
            favCountEl.text(newCount);
          }
          if (state.selectedRegexNode === "__favorites__") renderRegexView();
        });
        // 行点击：支持多选/删除/导出模式
        scriptRow.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-wi-toggle, .cfm-regex-edit-btn",
            ).length
          )
            return;
          if (!s.id) return;
          if (state.cfmResDeleteMode) {
            toggleResDeleteItem(s.id, e.shiftKey);
            renderRegexView();
            return;
          }
          if (state.cfmExportMode) {
            toggleExportItem(s.id, e.shiftKey);
            renderRegexView();
            return;
          }
          if (state.cfmMultiSelectMode) {
            toggleMultiSelectItem(s.id, e.shiftKey);
            renderRegexView();
            return;
          }
        });
        // 拖拽支持（仅全局正则脚本 scriptType===0）
        scriptRow.attr("draggable", "true");
        scriptRow.on("dragstart", (e) => {
          const singleData = {
            type: "regex-script",
            scriptId: s.id,
            scriptName: s.scriptName || "(未命名)",
          };
          const dragData =
            state.cfmMultiSelectMode &&
            state.cfmMultiSelected.has(s.id) &&
            state.cfmMultiSelected.size > 1
              ? {
                  ...singleData,
                  multiSelect: true,
                  selectedIds: Array.from(state.cfmMultiSelected),
                  count: state.cfmMultiSelected.size,
                }
              : singleData;
          pcDragStart(e, dragData);
          scriptRow.addClass("cfm-dragging");
        });
        scriptRow.on("dragend", () => {
          scriptRow.removeClass("cfm-dragging");
          pcDragEnd();
        });
        touchDragMgr.bind(scriptRow, () => {
          const singleData = {
            type: "regex-script",
            scriptId: s.id,
            scriptName: s.scriptName || "(未命名)",
          };
          return state.cfmMultiSelectMode &&
            state.cfmMultiSelected.has(s.id) &&
            state.cfmMultiSelected.size > 1
            ? {
                ...singleData,
                multiSelect: true,
                selectedIds: Array.from(state.cfmMultiSelected),
                count: state.cfmMultiSelected.size,
              }
            : singleData;
        });
        rightList.append(scriptRow);
      });
      // 删除工具栏
      prependResDeleteToolbar(rightList, renderRegexView);
      // 导出工具栏
      prependExportToolbar(rightList, renderRegexView);
      // 多选工具栏
      if (state.cfmMultiSelectMode && state.selectedRegexNode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => state.cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${state.cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-activate" title="批量激活正则脚本"><i class="fa-solid fa-toggle-on"></i> 激活</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-deactivate" title="批量取消激活正则脚本"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
            <span class="cfm-multisel-count">${state.cfmMultiSelected.size > 0 ? `已选 ${state.cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderRegexView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
          if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
          renderRegexView();
        });
        toolbar
          .find(".cfm-multisel-activate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyGlobalRegexMultiActivation(
              Array.from(state.cfmMultiSelected),
              true,
            );
            if (changed) renderRegexView();
          });
        toolbar
          .find(".cfm-multisel-deactivate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyGlobalRegexMultiActivation(
              Array.from(state.cfmMultiSelected),
              false,
            );
            if (changed) renderRegexView();
          });
        rightList.prepend(toolbar);
      }
    }

    // --- 绑定正则脚本toggle点击事件（启用/禁用） ---
    rightList
      .off("click.rxtoggle")
      .on(
        "click.rxtoggle",
        ".cfm-regex-script-row .cfm-wi-toggle",
        async function (e) {
          e.preventDefault();
          e.stopPropagation();
          const row = $(this).closest(".cfm-regex-script-row");
          const scriptId = row.data("script-id");
          const scriptType = Number(row.data("script-type"));
          const owner = row.data("owner") || "";
          if (!scriptId) return;

          // 根据类型找到脚本引用并切换 disabled
          let script = null;
          let scripts = null;
          if (scriptType === 0) {
            // 全局正则
            scripts = extension_settings.regex || [];
            script = scripts.find((s) => s.id === scriptId);
          } else if (scriptType === 2) {
            // 预设正则
            const pm = getContext().getPresetManager();
            if (pm) {
              try {
                scripts = pm.readPresetExtensionField({
                  name: owner,
                  path: "regex_scripts",
                });
                if (Array.isArray(scripts))
                  script = scripts.find((s) => s.id === scriptId);
              } catch (e) {
                /* skip */
              }
            }
          } else if (scriptType === 1) {
            // 角色正则
            const chars = getCharacters();
            const ch = chars.find((c) => c.name === owner);
            if (ch?.data?.extensions?.regex_scripts) {
              scripts = ch.data.extensions.regex_scripts;
              script = scripts.find((s) => s.id === scriptId);
            }
          }
          if (!script) {
            cfmToastr.warning("未找到对应的正则脚本");
            return;
          }

          // 切换 disabled 状态
          script.disabled = !script.disabled;

          // 保存
          try {
            if (scriptType === 0) {
              getContext().saveSettingsDebounced();
            } else if (scriptType === 2) {
              const pm = getContext().getPresetManager();
              if (pm)
                await pm.writePresetExtensionField({
                  path: "regex_scripts",
                  value: scripts,
                });
            } else if (scriptType === 1) {
              const chars = getCharacters();
              const ch = chars.find((c) => c.name === owner);
              if (ch) {
                const headers = getContext().getRequestHeaders();
                await fetch("/api/characters/merge-attributes", {
                  method: "POST",
                  headers: headers,
                  body: JSON.stringify({
                    avatar: ch.avatar,
                    data: { extensions: { regex_scripts: scripts } },
                  }),
                });
              }
            }
          } catch (err) {
            console.error("[CFM] 正则toggle保存失败:", err);
            cfmToastr.error("保存失败: " + err.message);
            // 回滚
            script.disabled = !script.disabled;
            return;
          }

          // 同步原生正则引擎状态
          await syncNativeRegexState();

          // 更新 toggle 按钮外观
          const isNowDisabled = !!script.disabled;
          const el = $(this);
          el.toggleClass("cfm-wi-toggle-on", !isNowDisabled);
          el.find("i").attr(
            "class",
            `fa-solid fa-toggle-${isNowDisabled ? "off" : "on"}`,
          );
          el.attr(
            "title",
            isNowDisabled ? "已禁用 - 点击启用" : "已启用 - 点击禁用",
          );
          // 更新行的禁用样式
          row.toggleClass("cfm-regex-disabled", isNowDisabled);
        },
      );

    // --- 绑定正则脚本编辑按钮点击事件 ---
    rightList
      .off(".rxedit")
      .on(
        "touchstart.rxedit",
        ".cfm-regex-script-row .cfm-regex-edit-btn",
        function (e) {
          recordTouchTapStart(e, "cfmRegexEditTap");
        },
      )
      .on(
        "click.rxedit touchend.rxedit",
        ".cfm-regex-script-row .cfm-regex-edit-btn",
        function (e) {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmRegexEditTap",
            })
          ) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const row = $(this).closest(".cfm-regex-script-row");
          const scriptId = row.data("script-id");
          if (!scriptId) return;
          // 触发SillyTavern原生正则编辑器的编辑按钮
          const nativeEl = $("#" + $.escapeSelector(String(scriptId)));
          if (nativeEl.length) {
            nativeEl.find(".edit_existing_regex").trigger("click");
          } else {
            cfmToastr.warning("未找到对应的正则脚本编辑器，请确认脚本是否存在");
          }
        },
      );
  }

// ==================== 正则子列表（角色/预设） ====================
// renderCharRegexSubList + renderPresetRegexSubList 合并实现：
// 两者结构高度相似，通过 cfg 配置对象区分差异。
export function createRegexSublistApi(deps) {
  const state = deps.state;
  const {
    $,
    applyOwnedRegexBatchActivation,
    cfmConfirm,
    cfmIsTouchDevice,
    cfmToastr,
    createCharScopedRegexFromManager,
    createPresetRegexFromManager,
    escapeHtml,
    flashDraggedElement,
    getContext,
    openNativeCharRegexScriptEditor,
    openNativePresetRegexScriptEditor,
    rerenderCurrentView,
    saveCharRegexScripts,
    savePresetRegexScripts,
    showBatchProgressOverlay,
    startOwnedRegexTransferFlow,
    toggleRegexBatchItem,
  } = deps;

  function renderRegexSubListCore(rowEl, cfg) {
    const {
      ownerName,
      scripts,
      isTarget,
      scriptType,
      emptyText,
      createInfoText,
      saveScripts,
      createScript,
      openEditor,
      transferSourceType,
      avatar,
    } = cfg;
    rowEl.next(".cfm-regex-sublist").remove();
    const subList = $('<div class="cfm-regex-sublist"></div>');

    // === 工具栏（角色正则均可编辑；新建仅当前角色可用） ===
    {
      const regexToolbar = $(`
        <div class="cfm-regex-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-regex-import-btn" title="导入正则脚本"><i class="fa-solid fa-file-import"></i> 导入</button>
          <input type="file" class="cfm-regex-import-file" multiple accept=".json" style="display:none;">
          <button class="cfm-btn cfm-btn-sm cfm-regex-create-btn" title="新增正则脚本"><i class="fa-solid fa-plus"></i> 新增</button>
          <button class="cfm-btn cfm-btn-sm cfm-regex-batch-toggle ${state.cfmRegexBatchMode ? "cfm-regex-batch-active" : ""}" title="批量操作模式"><i class="fa-solid fa-list-check"></i> ${state.cfmRegexBatchMode ? "退出批量" : "批量操作"}</button>
          <span class="cfm-regex-count">${scripts ? scripts.length : 0} 个脚本</span>
        </div>
      `);
      // 导入按钮
      regexToolbar.find(".cfm-regex-import-btn").on("click", (e) => {
        e.stopPropagation();
        regexToolbar.find(".cfm-regex-import-file").val("").trigger("click");
      });
      regexToolbar.find(".cfm-regex-import-file").on("change", async (e) => {
        e.stopPropagation();
        const files = e.target.files;
        if (!files || files.length === 0) return;
        try {
          for (const file of files) {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const toImport = Array.isArray(parsed) ? parsed : [parsed];
            for (const regexScript of toImport) {
              if (!regexScript.scriptName) {
                cfmToastr.warning("跳过无名称的正则脚本");
                continue;
              }
              regexScript.id = getContext().uuidv4();
              scripts.push(regexScript);
            }
          }
          await saveScripts();
          cfmToastr.success("正则脚本导入成功");
          rerenderCurrentView();
        } catch (err) {
          console.error("[CFM] 正则导入失败:", err);
          cfmToastr.error("导入失败: " + err.message);
        }
      });
      // 新增按钮
      regexToolbar.find(".cfm-regex-create-btn").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isTarget) {
          cfmToastr.info(
            createInfoText,
          );
          return;
        }
        createScript();
      });
      // 批量操作切换
      regexToolbar.find(".cfm-regex-batch-toggle").on("click", (e) => {
        e.stopPropagation();
        state.cfmRegexBatchMode = !state.cfmRegexBatchMode;
        state.cfmRegexBatchSelected.clear();
        state.cfmRegexBatchRangeMode = false;
        state.cfmRegexBatchLastClicked = null;
        rerenderCurrentView();
      });
      subList.append(regexToolbar);

      // === 批量操作工具栏 ===
      if (state.cfmRegexBatchMode && scripts && scripts.length > 0) {
        const allSel = scripts.every((s) => state.cfmRegexBatchSelected.has(s.id));
        const selCount = scripts.filter((s) =>
          state.cfmRegexBatchSelected.has(s.id),
        ).length;
        const batchToolbar = $(`
          <div class="cfm-regex-batch-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-selall" title="全选/全不选">
              <i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}
            </button>
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-range ${state.cfmRegexBatchRangeMode ? "cfm-range-active" : ""}" title="框选模式">
              <i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmRegexBatchRangeMode ? "(开)" : ""}
            </button>
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-activate" title="批量激活"><i class="fa-solid fa-toggle-on"></i> 激活</button>
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-deactivate" title="批量取消激活"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
            <span class="cfm-regex-batch-count">${selCount > 0 ? `已选 ${selCount} 项` : ""}</span>
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-transfer" title="互通正则"><i class="fa-solid fa-right-left"></i> 互通</button>
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-export" title="批量导出"><i class="fa-solid fa-file-export"></i> 导出</button>
            <button class="cfm-btn cfm-btn-sm cfm-regex-batch-delete" title="批量删除"><i class="fa-solid fa-trash-can"></i> 删除</button>
          </div>
        `);
        // 全选/全不选
        batchToolbar.find(".cfm-regex-batch-selall").on("click", (e) => {
          e.stopPropagation();
          if (allSel) {
            scripts.forEach((s) => state.cfmRegexBatchSelected.delete(s.id));
          } else {
            scripts.forEach((s) => {
              if (s.id) state.cfmRegexBatchSelected.add(s.id);
            });
          }
          rerenderCurrentView();
        });
        // 框选模式
        batchToolbar.find(".cfm-regex-batch-range").on("click", (e) => {
          e.stopPropagation();
          state.cfmRegexBatchRangeMode = !state.cfmRegexBatchRangeMode;
          if (state.cfmRegexBatchRangeMode) state.cfmRegexBatchLastClicked = null;
          rerenderCurrentView();
        });
        batchToolbar
          .find(".cfm-regex-batch-activate")
          .on("click", async (e) => {
            e.stopPropagation();
            const changed = await applyOwnedRegexBatchActivation({
              scripts,
              selectedIds: Array.from(state.cfmRegexBatchSelected),
              activate: true,
              save: () => saveScripts(),
            });
            if (changed) rerenderCurrentView();
          });
        batchToolbar
          .find(".cfm-regex-batch-deactivate")
          .on("click", async (e) => {
            e.stopPropagation();
            const changed = await applyOwnedRegexBatchActivation({
              scripts,
              selectedIds: Array.from(state.cfmRegexBatchSelected),
              activate: false,
              save: () => saveScripts(),
            });
            if (changed) rerenderCurrentView();
          });
        // 互通按钮
        batchToolbar
          .find(".cfm-regex-batch-transfer")
          .on("click", async (e) => {
            e.stopPropagation();
            await startOwnedRegexTransferFlow({
              sourceType: transferSourceType,
              sourceName: ownerName,
              avatar,
              scripts,
              selectedIds: Array.from(state.cfmRegexBatchSelected),
            });
          });
        // 批量导出（JSON格式，与酒馆保持一致）
        batchToolbar.find(".cfm-regex-batch-export").on("click", async (e) => {
          e.stopPropagation();
          const toExport = scripts.filter((s) =>
            state.cfmRegexBatchSelected.has(s.id),
          );
          if (toExport.length === 0) {
            cfmToastr.warning("请先选择要导出的正则脚本");
            return;
          }
          try {
            const download = (await import("../../../../../utils.js")).download;
            if (toExport.length === 1) {
              const fileName = `regex-${(toExport[0].scriptName || "unnamed").replace(/[^\w\-_.]/g, "_")}.json`;
              download(
                JSON.stringify(toExport[0], null, 4),
                fileName,
                "application/json",
              );
            } else {
              const fileName = `regex-${new Date().toISOString()}.json`;
              download(
                JSON.stringify(toExport, null, 4),
                fileName,
                "application/json",
              );
            }
            cfmToastr.success(`已导出 ${toExport.length} 个正则脚本`);
          } catch (err) {
            console.error("[CFM] 批量导出正则失败:", err);
            cfmToastr.error("导出失败: " + err.message);
          }
        });
        // 批量删除
        batchToolbar.find(".cfm-regex-batch-delete").on("click", async (e) => {
          e.stopPropagation();
          const toDeleteIds = scripts
            .filter((s) => state.cfmRegexBatchSelected.has(s.id))
            .map((s) => s.id);
          if (toDeleteIds.length === 0) {
            cfmToastr.warning("请先选择要删除的正则脚本");
            return;
          }
          if (
            !cfmConfirm(
              `确定要删除选中的 ${toDeleteIds.length} 个正则脚本吗？\n此操作不可撤销！`,
            )
          )
            return;
          const batchProgress = showBatchProgressOverlay(
            "正在批量删除正则脚本",
            toDeleteIds.length,
          );
          try {
            let processed = 0;
            for (const id of toDeleteIds) {
              const idx = scripts.findIndex((s) => s.id === id);
              if (idx !== -1) scripts.splice(idx, 1);
              processed++;
              batchProgress.update(processed);
            }
            await saveScripts();
            state.cfmRegexBatchSelected.clear();
            const delMsg = `已删除 ${toDeleteIds.length} 个正则脚本`;
            batchProgress.done(delMsg);
            cfmToastr.success(delMsg);
            rerenderCurrentView();
          } catch (err) {
            batchProgress.remove();
            console.error("[CFM] 批量删除正则失败:", err);
            cfmToastr.error("删除失败: " + err.message);
          }
        });
        subList.append(batchToolbar);
      }
    }

    if (!scripts || scripts.length === 0) {
      subList.append(
        `<div class="cfm-right-empty" style="padding:8px 16px;font-size:12px;">${emptyText}</div>`,
      );
    } else {
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const isDisabled = !!script.disabled;
        const isBatchSel =
          state.cfmRegexBatchMode && state.cfmRegexBatchSelected.has(script.id);
        const toggleHtml = `<div class="cfm-wi-toggle ${isDisabled ? "" : "cfm-wi-toggle-on"}" title="${isDisabled ? "已禁用 - 点击启用" : "已启用 - 点击禁用"}"><i class="fa-solid fa-toggle-${isDisabled ? "off" : "on"}"></i></div>`;
        const row = $(`
          <div class="cfm-row cfm-row-char cfm-regex-script-row ${isDisabled ? "cfm-regex-disabled" : ""} ${isBatchSel ? "cfm-regex-batch-selected" : ""}"
               data-script-id="${escapeHtml(script.id || "")}"
               data-script-idx="${i}"
               data-script-type="${scriptType}"
               data-owner="${escapeHtml(ownerName || "")}">
            ${state.cfmRegexBatchMode ? `<div class="cfm-regex-batch-check"><i class="fa-${isBatchSel ? "solid" : "regular"} fa-square${isBatchSel ? "-check" : ""}"></i></div>` : ""}
            ${toggleHtml}
            <div class="cfm-row-name">
              <span>${escapeHtml(script.scriptName || "(未命名)")}</span>
            </div>
            <div class="cfm-regex-row-actions">
              <div class="cfm-regex-action-btn cfm-regex-edit-btn" title="编辑"><i class="fa-solid fa-pen-to-square"></i></div>
              <div class="cfm-regex-action-btn cfm-regex-move-up-btn${i === 0 ? " cfm-regex-move-disabled" : ""}" title="上移"><i class="fa-solid fa-arrow-up"></i></div>
              <div class="cfm-regex-action-btn cfm-regex-move-down-btn${i === scripts.length - 1 ? " cfm-regex-move-disabled" : ""}" title="下移"><i class="fa-solid fa-arrow-down"></i></div>
            </div>
          </div>
        `);

        // 批量模式：行点击切换选中
        if (state.cfmRegexBatchMode) {
          row.on("click", (e) => {
            if (
              $(e.target).closest(
                ".cfm-regex-row-actions, .cfm-regex-batch-check",
              ).length
            )
              return;
            toggleRegexBatchItem(script.id, e.shiftKey, scripts);
            rerenderCurrentView();
          });
          row.find(".cfm-regex-batch-check").on("click", (e) => {
            e.stopPropagation();
            toggleRegexBatchItem(script.id, e.shiftKey, scripts);
            rerenderCurrentView();
          });
        }

        // toggle 点击
        row.find(".cfm-wi-toggle").on("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          script.disabled = !script.disabled;
          try {
            await saveScripts();
          } catch (err) {
            console.error("[CFM] 正则toggle保存失败:", err);
            cfmToastr.error("保存失败: " + err.message);
            script.disabled = !script.disabled;
            return;
          }
          const isNowDisabled = !!script.disabled;
          const el = $(this);
          el.toggleClass("cfm-wi-toggle-on", !isNowDisabled);
          el.find("i").attr(
            "class",
            `fa-solid fa-toggle-${isNowDisabled ? "off" : "on"}`,
          );
          el.attr(
            "title",
            isNowDisabled ? "已禁用 - 点击启用" : "已启用 - 点击禁用",
          );
          row.toggleClass("cfm-regex-disabled", isNowDisabled);
        });
        // 编辑按钮点击
        row.find(".cfm-regex-edit-btn").on("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          const scriptId = row.data("script-id");
          if (!scriptId) return;
          const nativeEl = $("#" + $.escapeSelector(String(scriptId)));
          if (nativeEl.length) {
            nativeEl.find(".edit_existing_regex").trigger("click");
          } else {
            openEditor(scriptId).then(
              (opened) => {
                if (!opened) {
                  cfmToastr.warning("未能打开该正则的原生编辑器，请稍后重试");
                }
              },
              (err) => {
                console.error("[CFM] 打开非当前角色正则编辑器失败:", err);
                cfmToastr.error("打开编辑器失败: " + (err?.message || err));
              },
            );
          }
        });
        // 上移按钮
        row.find(".cfm-regex-move-up-btn").on("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (i <= 0) return;
          const movedScriptId = String(script?.id || "").trim();
          [scripts[i - 1], scripts[i]] = [scripts[i], scripts[i - 1]];
          try {
            await saveScripts();
            rerenderCurrentView();
            if (movedScriptId) {
              flashDraggedElement(
                `.cfm-regex-script-row[data-script-id="${$.escapeSelector(movedScriptId)}"]`,
              );
            }
          } catch (err) {
            console.error("[CFM] 正则上移失败:", err);
            [scripts[i - 1], scripts[i]] = [scripts[i], scripts[i - 1]];
            cfmToastr.error("上移失败: " + err.message);
          }
        });
        // 下移按钮
        row.find(".cfm-regex-move-down-btn").on("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (i >= scripts.length - 1) return;
          const movedScriptId = String(script?.id || "").trim();
          [scripts[i], scripts[i + 1]] = [scripts[i + 1], scripts[i]];
          try {
            await saveScripts();
            rerenderCurrentView();
            if (movedScriptId) {
              flashDraggedElement(
                `.cfm-regex-script-row[data-script-id="${$.escapeSelector(movedScriptId)}"]`,
              );
            }
          } catch (err) {
            console.error("[CFM] 正则下移失败:", err);
            [scripts[i], scripts[i + 1]] = [scripts[i + 1], scripts[i]];
            cfmToastr.error("下移失败: " + err.message);
          }
        });
        subList.append(row);
      }

      // 拖拽排序
      if (typeof subList.sortable === "function" && !cfmIsTouchDevice()) {
        subList.sortable({
          items: ".cfm-regex-script-row",
          axis: "y",
          tolerance: "pointer",
          placeholder: "cfm-sort-placeholder",
          forcePlaceholderSize: true,
          distance: 4,
          cancel:
            ".cfm-chat-actions, .cfm-regex-batch-check, .cfm-wi-toggle, .cfm-regex-edit-btn, .cfm-regex-move-up-btn, .cfm-regex-move-down-btn, button, input, textarea, select, a, label",
          start: (_event, ui) => {
            ui.item.addClass("cfm-regex-dragging");
          },
          stop: async (_event, ui) => {
            const movedScriptId = String(
              ui.item.data("script-id") || "",
            ).trim();
            ui.item.removeClass("cfm-regex-dragging");
            const orderedIds = subList
              .find(".cfm-regex-script-row")
              .map(function () {
                return String($(this).data("script-id") || "").trim();
              })
              .get()
              .filter(Boolean);
            const currentIds = scripts
              .map((script) => String(script?.id || "").trim())
              .filter(Boolean);
            if (
              orderedIds.length !== currentIds.length ||
              orderedIds.every((id, index) => id === currentIds[index])
            ) {
              return;
            }
            const scriptMap = new Map(
              scripts
                .map((script) => [String(script?.id || "").trim(), script])
                .filter(([id]) => !!id),
            );
            const reorderedScripts = orderedIds
              .map((id) => scriptMap.get(id))
              .filter(Boolean);
            try {
              await saveScripts(reorderedScripts);
              rerenderCurrentView();
              if (movedScriptId) {
                flashDraggedElement(
                  `.cfm-regex-script-row[data-script-id="${$.escapeSelector(movedScriptId)}"]`,
                );
              }
            } catch (err) {
              console.error("[CFM] 正则拖拽排序失败:", err);
              cfmToastr.error("排序失败: " + err.message);
              rerenderCurrentView();
            }
          },
        });
        subList.disableSelection();
      }
    }
    rowEl.after(subList);
  }

  function renderCharRegexSubList(charRow, avatar, scripts, charName, isTarget = true) {
    return renderRegexSubListCore(charRow, {
      ownerName: charName,
      avatar,
      scripts,
      isTarget,
      scriptType: "1",
      emptyText: "该角色没有绑定正则脚本",
      createInfoText: "当前仅支持在已选中的角色中通过原生编辑器新建正则，请先切换角色，或使用导入/互通方式处理其它角色",
      saveScripts: (newScripts) => saveCharRegexScripts(avatar, newScripts || scripts),
      createScript: () => createCharScopedRegexFromManager(avatar, charName),
      openEditor: (scriptId) => openNativeCharRegexScriptEditor(avatar, scriptId, scripts, charName),
      transferSourceType: "char",
    });
  }

  function renderPresetRegexSubList(presetRow, presetName, scripts, isTarget = true) {
    return renderRegexSubListCore(presetRow, {
      ownerName: presetName,
      scripts,
      isTarget,
      scriptType: "2",
      emptyText: "该预设没有绑定正则脚本",
      createInfoText: "当前仅支持在已选中的预设中通过原生编辑器新建正则，请先切换预设，或使用导入/互通方式处理其它预设",
      saveScripts: (newScripts) => savePresetRegexScripts(newScripts || scripts, presetName),
      createScript: () => createPresetRegexFromManager(presetName),
      openEditor: (scriptId) => openNativePresetRegexScriptEditor(presetName, scriptId),
      transferSourceType: "preset",
    });
  }

  return { renderCharRegexSubList, renderPresetRegexSubList };
}

