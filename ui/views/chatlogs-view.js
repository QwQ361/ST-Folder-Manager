// 聊天记录视图组件层：承接插件弹窗内聊天记录列表、操作按钮和导入导出入口的 DOM 组装；聊天 API、缓存、置顶、备注和原生增强保留在 features/chatlogs。

export async function renderChatlogsViewCore(deps) {
  const renderChatlogsView = () => deps.renderChatlogsView();
  const state = deps.state;
  const {
    $,
    cfmToastr,
    clearAllExclusiveModes,
    clearMultiSelect,
    collectCurrentSelection,
    escapeHtml,
    executeChatlogNoteEdit,
    executeChatlogRename,
    formatFileSize,
    getCharChats,
    getCharNameByAvatar,
    getChatlogFolderTree,
    getChatlogGroups,
    getChatlogTargetAvatar,
    getContext,
    getCurrentCharAvatar,
    getVisibleResourceIds,
    openChatFile,
    pcDragEnd,
    pcDragStart,
    pcGetDropData,
    prependChatlogNoteToolbar,
    prependChatlogRenameToolbar,
    prependExportToolbar,
    prependResDeleteToolbar,
    prompt,
    saveSettingsDebounced,
    selectAllVisible,
    splitChatlogFileName,
    syncChatlogPopupModeClasses,
    toggleChatlogNoteItem,
    toggleChatlogRenameItem,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
  } = deps;
    const treeEl = $("#cfm-chatlogs-left-tree");
    const rightList = $("#cfm-chatlogs-right-list");
    const rhPath = $("#cfm-chatlogs-rh-path");
    const rhCount = $("#cfm-chatlogs-rh-count");
    if (!treeEl.length) return;
    syncChatlogPopupModeClasses();
    const avatar = getChatlogTargetAvatar();
    if (!avatar) {
      treeEl.empty();
      rightList.empty();
      rhPath.text("聊天记录");
      rhCount.text("");
      rightList.html(
        '<div class="cfm-right-empty">请先选择一个角色<br><span style="font-size:12px;opacity:0.5;">在角色卡页面选择角色后，这里会显示该角色的聊天记录</span></div>',
      );
      return;
    }
    const folderTree = getChatlogFolderTree(avatar);
    const chatGroups = getChatlogGroups(avatar);
    const allChats = await getCharChats(avatar);
    const charName = getCharNameByAvatar(avatar) || avatar;

    function sortCLFolders(ids) {
      return [...ids].sort((a, b) => {
        const oa = folderTree[a]?.sortOrder ?? 0,
          ob = folderTree[b]?.sortOrder ?? 0;
        if (oa !== ob) return oa - ob;
        return (folderTree[a]?.displayName || a).localeCompare(
          folderTree[b]?.displayName || b,
          "zh-CN",
        );
      });
    }
    function getCLChildFolders(pid) {
      return Object.keys(folderTree).filter(
        (id) => folderTree[id].parentId === pid,
      );
    }
    function countCLChats(fid) {
      let c = allChats.filter((ch) => chatGroups[ch.file_name] === fid).length;
      for (const cid of getCLChildFolders(fid)) c += countCLChats(cid);
      return c;
    }
    function getCLTopFolders() {
      return Object.keys(folderTree).filter((id) => !folderTree[id].parentId);
    }
    function getCLFolderPath(fid) {
      const p = [];
      let cur = fid;
      while (cur && folderTree[cur]) {
        p.unshift(cur);
        cur = folderTree[cur].parentId;
      }
      return p;
    }

    treeEl.empty();
    treeEl.append(
      $(
        `<div class="cfm-chatlog-char-header"><span class="cfm-chatlog-char-name" title="${escapeHtml(charName)}"><i class="fa-solid fa-user"></i> ${escapeHtml(charName)}</span><span class="cfm-chatlog-chat-total">${allChats.length} 个聊天</span></div>`,
      ),
    );

    function moveCLToFolder(targetFolderId) {
      const activeSelected = collectCurrentSelection();
      if (!activeSelected || activeSelected.size === 0) {
        cfmToastr.warning("请先选择聊天记录");
        return;
      }
      const selectedItems = Array.from(activeSelected);
      selectedItems.forEach((fn) => {
        if (targetFolderId) chatGroups[fn] = targetFolderId;
        else delete chatGroups[fn];
      });
      saveSettingsDebounced();
      const fname = targetFolderId
        ? folderTree[targetFolderId]?.displayName || targetFolderId
        : "未归类";
      cfmToastr.success(
        selectedItems.length > 1
          ? `已将 ${selectedItems.length} 个聊天移入「${fname}」`
          : `已将聊天移入「${fname}」`,
      );
      clearAllExclusiveModes();
      clearMultiSelect();
      renderChatlogsView();
    }

    function renderCLTreeNode(container, folderId, depth) {
      const children = sortCLFolders(getCLChildFolders(folderId));
      const hasChildren = children.length > 0;
      const isExpanded = state.chatlogExpandedNodes.has(folderId);
      const isSelected = state.selectedChatlogFolder === folderId;
      const count = countCLChats(folderId);
      const indent = 10 + depth * 16;
      const dn = folderTree[folderId]?.displayName || folderId;
      const node = $(
        `<div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;"><span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span><span class="cfm-tnode-label">${escapeHtml(dn)}</span><span class="cfm-tnode-target" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></span><span class="cfm-tnode-rename" title="重命名文件夹"><i class="fa-solid fa-pen"></i></span><span class="cfm-tnode-count">${count}</span></div>`,
      );
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (state.chatlogExpandedNodes.has(folderId))
          state.chatlogExpandedNodes.delete(folderId);
        else state.chatlogExpandedNodes.add(folderId);
        renderChatlogsView();
      });
      node.find(".cfm-tnode-target").on("click", (e) => {
        e.stopPropagation();
        moveCLToFolder(folderId);
      });
      node.find(".cfm-tnode-rename").on("click", (e) => {
        e.stopPropagation();
        const cn = folderTree[folderId]?.displayName || folderId;
        const nn = prompt("重命名文件夹", cn);
        if (!nn || !nn.trim() || nn.trim() === cn) return;
        folderTree[folderId].displayName = nn.trim();
        saveSettingsDebounced();
        cfmToastr.success(`文件夹已重命名为「${nn.trim()}」`);
        renderChatlogsView();
      });
      node.on("click", (e) => {
        e.preventDefault();
        state.selectedChatlogFolder = folderId;
        renderChatlogsView();
      });
      node.on("dragover", (e) => {
        e.preventDefault();
        node.addClass("cfm-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      node.on("dragleave", () => node.removeClass("cfm-drop-target"));
      node.on("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        node.removeClass("cfm-drop-target");
        const data = pcGetDropData(e);
        if (!data || data.type !== "chatlog-item") return;
        const fns =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.chatFileName];
        fns.forEach((fn) => {
          chatGroups[fn] = folderId;
        });
        if (data.multiSelect) clearMultiSelect();
        saveSettingsDebounced();
        cfmToastr.success(
          fns.length > 1
            ? `已将 ${fns.length} 个聊天移入「${dn}」`
            : `已将聊天移入「${dn}」`,
        );
        renderChatlogsView();
      });
      container.append(node);
      if (hasChildren) {
        const cc = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const cid of children) renderCLTreeNode(cc, cid, depth + 1);
        container.append(cc);
      }
    }
    const topFolders = sortCLFolders(getCLTopFolders());
    for (const fid of topFolders) renderCLTreeNode(treeEl, fid, 0);

    // 未归类入口
    const ungroupedChats = allChats.filter(
      (ch) =>
        !chatGroups[ch.file_name] || !folderTree[chatGroups[ch.file_name]],
    );
    const uncatNode = $(
      `<div class="cfm-tnode cfm-tnode-uncategorized ${state.selectedChatlogFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;"><span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span><span class="cfm-tnode-label">未归类</span><span class="cfm-tnode-target" title="移出文件夹（取消归类）"><i class="fa-solid fa-crosshairs"></i></span><span class="cfm-tnode-count">${ungroupedChats.length}</span></div>`,
    );
    uncatNode.find(".cfm-tnode-target").on("click", (e) => {
      e.stopPropagation();
      moveCLToFolder(null);
    });
    uncatNode.on("click", (e) => {
      e.preventDefault();
      state.selectedChatlogFolder = "__ungrouped__";
      renderChatlogsView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
    });
    uncatNode.on("dragleave", () => uncatNode.removeClass("cfm-drop-target"));
    uncatNode.on("drop", (e) => {
      e.preventDefault();
      uncatNode.removeClass("cfm-drop-target");
      const data = pcGetDropData(e);
      if (!data || data.type !== "chatlog-item") return;
      const fns =
        data.multiSelect && data.selectedIds
          ? data.selectedIds
          : [data.chatFileName];
      fns.forEach((fn) => {
        delete chatGroups[fn];
      });
      if (data.multiSelect) clearMultiSelect();
      saveSettingsDebounced();
      cfmToastr.success(
        fns.length > 1
          ? `已将 ${fns.length} 个聊天移出文件夹`
          : `已将聊天移出文件夹`,
      );
      renderChatlogsView();
    });
    treeEl.append(uncatNode);
    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:12px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 创建文件夹</div>',
      );
    }

    // --- 右侧渲染 ---
    rightList.empty();
    let displayChats = [],
      displayTitle = "",
      childFolders = [];
    if (!state.selectedChatlogFolder) {
      state.selectedChatlogFolder = "__ungrouped__";
      displayChats = ungroupedChats;
      displayTitle = "未归类";
      treeEl.find(".cfm-tnode").removeClass("cfm-tnode-selected");
      uncatNode.addClass("cfm-tnode-selected");
    } else if (state.selectedChatlogFolder === "__ungrouped__") {
      displayChats = ungroupedChats;
      displayTitle = "未归类";
    } else if (folderTree[state.selectedChatlogFolder]) {
      const fid = state.selectedChatlogFolder;
      childFolders = sortCLFolders(getCLChildFolders(fid));
      displayChats = allChats.filter((ch) => chatGroups[ch.file_name] === fid);
      displayTitle = getCLFolderPath(fid)
        .map((id) => folderTree[id]?.displayName || id)
        .join(" › ");
    } else {
      state.selectedChatlogFolder = "__ungrouped__";
      displayChats = ungroupedChats;
      displayTitle = "未归类";
    }

    const searchInput = $("#cfm-chatlogs-global-search");
    const searchTerm = searchInput.length
      ? searchInput.val().trim().toLowerCase()
      : "";
    const searchScope = $("#cfm-chatlogs-search-scope").val() || "current";
    const searchType = $("#cfm-chatlogs-search-type").val() || "chatlog";

    if (searchTerm) {
      if (searchType === "folder") {
        // 搜索文件夹
        const allFolderKeys = Object.keys(folderTree);
        const matchedFolderIds = allFolderKeys.filter((fid) => {
          const dn = (folderTree[fid].displayName || fid).toLowerCase();
          return dn.includes(searchTerm);
        });
        childFolders =
          searchScope === "all"
            ? matchedFolderIds
            : childFolders.filter((fid) => matchedFolderIds.includes(fid));
        displayChats = [];
      } else {
        // 搜索聊天记录
        const searchSource = searchScope === "all" ? allChats : displayChats;
        displayChats = searchSource.filter((ch) => {
          const fn = (ch.file_name || "").toLowerCase();
          const noteKey = (ch.file_name || "").replace(/\.jsonl$/i, "");
          const note = (state.cfmChatNotes[noteKey] || "").toLowerCase();
          return fn.includes(searchTerm) || note.includes(searchTerm);
        });
        childFolders = [];
      }
      displayTitle =
        searchScope === "all"
          ? `全部 (搜索: ${searchTerm})`
          : `${displayTitle} (搜索: ${searchTerm})`;
    }

    const totalItems = childFolders.length + displayChats.length;
    rhPath.text(displayTitle);
    rhCount.text(
      childFolders.length === 0
        ? displayChats.length > 0
          ? `${displayChats.length} 个聊天`
          : ""
        : totalItems > 0
          ? `${totalItems} 项`
          : "",
    );

    if (totalItems === 0) {
      rightList.html(
        `<div class="cfm-right-empty">${searchTerm ? "未找到匹配的聊天记录" : "暂无聊天记录"}</div>`,
      );
    } else {
      for (const childId of childFolders) {
        const cCount = countCLChats(childId);
        const cdn = folderTree[childId]?.displayName || childId;
        const fRow = $(
          `<div class="cfm-row cfm-row-folder" data-target-folder="${escapeHtml(childId)}"><div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div><div class="cfm-row-name">${escapeHtml(cdn)}</div><div class="cfm-row-target-btn" title="移入此文件夹"><i class="fa-solid fa-crosshairs"></i></div><div class="cfm-row-meta">${cCount} 个聊天</div></div>`,
        );
        fRow.find(".cfm-row-target-btn").on("click", (e) => {
          e.stopPropagation();
          moveCLToFolder(childId);
        });
        fRow.on("click", (e) => {
          e.preventDefault();
          const p = getCLFolderPath(childId);
          for (const pid of p) state.chatlogExpandedNodes.add(pid);
          state.selectedChatlogFolder = childId;
          renderChatlogsView();
        });
        rightList.append(fRow);
      }

      const ctx = getContext();
      const curChatId = ctx.getCurrentChatId ? ctx.getCurrentChatId() : null;
      const currentCharAvatar = getCurrentCharAvatar();
      // 只有当查看的是当前角色的聊天记录时，才进行当前聊天高亮
      const isCurrentChar = avatar === currentCharAvatar;
      displayChats.forEach((chat) => {
        const fn = chat.file_name,
          msgCount = chat.chat_items,
          lastMes = chat.mes;
        const chatFileMeta = splitChatlogFileName(fn);
        const lastDate = chat.last_mes ? new Date(chat.last_mes) : null;
        const dateStr = lastDate
          ? lastDate.toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        const note = state.cfmChatNotes[fn.replace(/\.jsonl$/i, "")] || "";
        // 匹配当前聊天：统一去掉 .jsonl 后缀再比较，且只在当前角色卡下高亮
        const fnNoExt = fn.replace(/\.jsonl$/i, "");
        const isCur =
          isCurrentChar &&
          curChatId &&
          (fn === curChatId || fnNoExt === curChatId);
        const isDelSel = state.cfmResDeleteMode && state.cfmResDeleteSelected.has(fn);
        const isExpSel = state.cfmExportMode && state.cfmExportSelected.has(fn);
        const isMSel = state.cfmMultiSelectMode && state.cfmMultiSelected.has(fn);
        const isNoteSel = state.cfmChatlogNoteMode && state.cfmChatlogNoteSelected.has(fn);
        const isRenameSel =
          state.cfmChatlogRenameMode && state.cfmChatlogRenameSelected.has(fn);
        const row = $(
          `<div class="cfm-row cfm-chatlog-row ${isCur ? "cfm-chatlog-current" : ""}" data-chat-file="${escapeHtml(fn)}" data-avatar="${escapeHtml(avatar)}" draggable="true">${state.cfmChatlogNoteMode || state.cfmChatlogRenameMode ? `<div class="cfm-edit-checkbox ${(state.cfmChatlogNoteMode && isNoteSel) || (state.cfmChatlogRenameMode && isRenameSel) ? "cfm-edit-checked" : ""}"><i class="fa-${(state.cfmChatlogNoteMode && isNoteSel) || (state.cfmChatlogRenameMode && isRenameSel) ? "solid" : "regular"} fa-square${(state.cfmChatlogNoteMode && isNoteSel) || (state.cfmChatlogRenameMode && isRenameSel) ? "-check" : ""}"></i></div>` : state.cfmMultiSelectMode ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>` : ""}<div class="cfm-row-icon"><i class="fa-solid fa-comment${isCur ? "" : "-dots"}"></i></div><div class="cfm-row-main"><div class="cfm-row-name" title="${escapeHtml(fn)}">${escapeHtml(chatFileMeta.displayName)}${isCur ? ' <span class="cfm-chatlog-current-badge">当前</span>' : ""}</div>${note ? `<div class="cfm-chatlog-note" title="${escapeHtml(note)}"><i class="fa-solid fa-sticky-note"></i> ${escapeHtml(note)}</div>` : ""}<div class="cfm-row-meta">${msgCount != null ? `<span>${msgCount} 条消息</span>` : ""}${dateStr ? `<span>${dateStr}</span>` : ""}${chat.file_size ? `<span>${formatFileSize(chat.file_size)}</span>` : ""}</div></div><div class="cfm-chatlog-actions"><span class="cfm-chatlog-action-btn cfm-chatlog-btn-note" title="备注"><i class="fa-solid fa-pen-to-square"></i></span><span class="cfm-chatlog-action-btn cfm-chatlog-btn-rename" title="重命名"><i class="fa-solid fa-i-cursor"></i></span></div></div>`,
        );
        if (isDelSel) row.addClass("cfm-res-delete-row-selected");
        if (isExpSel) row.addClass("cfm-export-row-selected");
        if (isMSel) row.addClass("cfm-multisel-row-selected");
        if (isNoteSel || isRenameSel) row.addClass("cfm-edit-row-selected");
        row.on("click", (e) => {
          if ($(e.target).closest(".cfm-chatlog-actions").length) return;
          if (state.cfmChatlogNoteMode) {
            toggleChatlogNoteItem(fn, e.shiftKey);
            renderChatlogsView();
            return;
          }
          if (state.cfmChatlogRenameMode) {
            toggleChatlogRenameItem(fn, e.shiftKey);
            renderChatlogsView();
            return;
          }
          if (state.cfmResDeleteMode) {
            toggleResDeleteItem(fn, e.shiftKey);
            renderChatlogsView();
            return;
          }
          if (state.cfmExportMode) {
            toggleExportItem(fn, e.shiftKey);
            renderChatlogsView();
            return;
          }
          if (state.cfmMultiSelectMode) {
            toggleMultiSelectItem(fn, e.shiftKey);
            renderChatlogsView();
            return;
          }
          openChatFile(avatar, fn);
        });
        row.find(".cfm-chatlog-btn-note").on("click", async (e) => {
          e.stopPropagation();
          await executeChatlogNoteEdit([fn]);
          renderChatlogsView();
        });
        row.find(".cfm-chatlog-btn-rename").on("click", async (e) => {
          e.stopPropagation();
          await executeChatlogRename([fn]);
          renderChatlogsView();
        });
        row.on("dragstart", (e) => {
          const sd = { type: "chatlog-item", chatFileName: fn };
          const activeSelected = collectCurrentSelection();
          const canDragMulti =
            activeSelected && activeSelected.has(fn) && activeSelected.size > 1;
          pcDragStart(
            e,
            canDragMulti
              ? {
                  ...sd,
                  multiSelect: true,
                  selectedIds: Array.from(activeSelected),
                  count: activeSelected.size,
                }
              : sd,
          );
          row.addClass("cfm-dragging");
        });
        row.on("dragend", () => {
          row.removeClass("cfm-dragging");
          pcDragEnd();
        });
        rightList.append(row);
      });

      if (state.cfmChatlogNoteMode) {
        prependChatlogNoteToolbar(rightList, renderChatlogsView);
      } else if (state.cfmChatlogRenameMode) {
        prependChatlogRenameToolbar(rightList, renderChatlogsView);
      } else if (state.cfmResDeleteMode) {
        prependResDeleteToolbar(rightList, renderChatlogsView);
      } else if (state.cfmExportMode) {
        prependExportToolbar(rightList, renderChatlogsView);
      } else if (state.cfmMultiSelectMode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => state.cfmMultiSelected.has(id));
        const toolbar = $(
          `<div class="cfm-multisel-toolbar"><button class="cfm-btn cfm-btn-sm cfm-multisel-selectall" title="全选/全不选"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-multisel-range ${state.cfmMultiSelectRangeMode ? "cfm-range-active" : ""}" title="框选模式"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmMultiSelectRangeMode ? "(开)" : ""}</button><span class="cfm-multisel-count">${state.cfmMultiSelected.size > 0 ? `已选 ${state.cfmMultiSelected.size} 项` : ""}</span></div>`,
        );
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderChatlogsView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.cfmMultiSelectRangeMode = !state.cfmMultiSelectRangeMode;
          if (state.cfmMultiSelectRangeMode) state.cfmMultiSelectLastClicked = null;
          renderChatlogsView();
        });
        rightList.prepend(toolbar);
      }
    }

    // 绑定搜索事件
    $("#cfm-chatlogs-global-search")
      .off("input.chatlogSearch")
      .on("input.chatlogSearch", function () {
        const hasText = $(this).val().trim().length > 0;
        $(this)
          .closest(".cfm-search-input-wrapper")
          .toggleClass("cfm-has-text", hasText);
        renderChatlogsView();
      });
    $("#cfm-chatlogs-search-clear")
      .off("click.chatlogSearch touchend.chatlogSearch")
      .on("click.chatlogSearch touchend.chatlogSearch", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $("#cfm-chatlogs-global-search").val("").focus();
        $(this)
          .closest(".cfm-search-input-wrapper")
          .removeClass("cfm-has-text");
        renderChatlogsView();
      });
    $("#cfm-chatlogs-search-scope")
      .off("change.chatlogSearch")
      .on("change.chatlogSearch", function () {
        renderChatlogsView();
      });
    $("#cfm-chatlogs-search-type")
      .off("change.chatlogSearch")
      .on("change.chatlogSearch", function () {
        const type = $(this).val();
        $("#cfm-chatlogs-global-search").attr(
          "placeholder",
          type === "folder" ? "搜索文件夹..." : "搜索聊天记录...",
        );
        renderChatlogsView();
      });
  }

