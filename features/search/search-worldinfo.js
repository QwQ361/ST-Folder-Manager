// 搜索执行层 - 世界书搜索
// 原 index.js executeWorldInfoSearch 迁移。通过 deps 注入闭包依赖与状态访问器。

export function createWorldInfoSearchCore(deps) {
  const {
    $,
    applyWorldInfoMultiActivation,
    bindWorldInfoEntryCollapseTargets,
    cfmToastr,
    countResItemsRecursive,
    escapeHtml,
    executeWorldInfoNoteEdit,
    executeWorldInfoRename,
    fuzzyMatch,
    getActiveWorldInfoSet,
    getCharBoundWorldBooks,
    getFolderSelfPathNames,
    getMultiDragData,
    getResChildFolders,
    getResFavorites,
    getResFolderDisplayName,
    getResFolderPath,
    getResFolderPathNames,
    getResFolderTree,
    getResourceFolders,
    getResourceGroups,
    getVisibleResourceIds,
    getWorldInfoNames,
    getWorldInfoNote,
    isResFavorite,
    isWorldInfoEntryBookExpanded,
    openWorldInfoEditor,
    pcDragEnd,
    pcDragStart,
    prependExportToolbar,
    prependResDeleteToolbar,
    prependWorldInfoNoteToolbar,
    prependWorldInfoRenameToolbar,
    refreshWorldInfoPanelView,
    renderWorldInfoEntrySubList,
    renderWorldInfoView,
    selectAllVisible,
    shouldIgnoreWorldInfoEntryTap,
    syncWiPresetTrackingForManualToggle,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    toggleWorldInfoActivation,
    toggleWorldInfoEntryBookExpanded,
    toggleWorldInfoNoteItem,
    toggleWorldInfoRenameItem,
    touchDragMgr,
    state,
  } = deps;

  function executeWorldInfoSearch() {
    const q = $("#cfm-worldinfo-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-worldinfo-search-scope").val();
    const type = $("#cfm-worldinfo-search-type").val();

    if (!q) {
      renderWorldInfoView();
      return;
    }

    const rightList = $("#cfm-worldinfo-right-list");
    const pathEl = $("#cfm-worldinfo-rh-path");
    const countEl = $("#cfm-worldinfo-rh-count");

    const groups = getResourceGroups("worldinfo");
    const folders = getResourceFolders("worldinfo");

    if (type === "folder") {
      let matchedIds;
      const selectedWorldInfoFolder = state.getSelectedWorldInfoFolder();
      if (
        scope === "current" &&
        selectedWorldInfoFolder &&
        selectedWorldInfoFolder !== "__ungrouped__" &&
        selectedWorldInfoFolder !== "__favorites__" &&
        getResFolderTree("worldinfo")[selectedWorldInfoFolder]
      ) {
        const collectDesc = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("worldinfo", pid))
            r = r.concat(collectDesc(c));
          return r;
        };
        const descendants = collectDesc(selectedWorldInfoFolder);
        matchedIds = descendants.filter((f) =>
          fuzzyMatch(
            q,
            getFolderSelfPathNames("worldinfo", f).map((s) => s.toLowerCase()),
          ),
        );
      } else {
        matchedIds = folders.filter((f) =>
          fuzzyMatch(
            q,
            getFolderSelfPathNames("worldinfo", f).map((s) => s.toLowerCase()),
          ),
        );
      }
      rightList.empty();
      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matchedIds.length} 个结果`);
      if (matchedIds.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的文件夹</div>');
        return;
      }
      for (const fname of matchedIds) {
        const folderPath = getResFolderPath("worldinfo", fname)
          .map((id) => getResFolderDisplayName("worldinfo", id))
          .join(" › ");
        const childCount = countResItemsRecursive("worldinfo", fname);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("worldinfo", fname))}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个世界书</div>
          </div>
        `);
        row.on("click", () => {
          const path = getResFolderPath("worldinfo", fname);
          const worldInfoExpandedNodes = state.getWorldInfoExpandedNodes();
          for (const pid of path) worldInfoExpandedNodes.add(pid);
          state.setSelectedWorldInfoFolder(fname);
          $("#cfm-worldinfo-global-search").val("");
          renderWorldInfoView();
        });
        rightList.append(row);
      }
    } else {
      // 需要异步获取世界书名称列表
      getWorldInfoNames().then(async (names) => {
        const wiActiveSet = await getActiveWorldInfoSet();
        const wiCharBound = await getCharBoundWorldBooks();
        let searchPool = names;
        const selectedWorldInfoFolder = state.getSelectedWorldInfoFolder();
        if (scope === "current" && selectedWorldInfoFolder) {
          if (selectedWorldInfoFolder === "__ungrouped__") {
            searchPool = names.filter(
              (n) => !groups[n] || !folders.includes(groups[n]),
            );
          } else if (selectedWorldInfoFolder === "__favorites__") {
            const favs = getResFavorites("worldinfo");
            searchPool = names.filter((n) => favs.includes(n));
          } else if (folders.includes(selectedWorldInfoFolder)) {
            const collectFolderIds = (pid) => {
              let r = [pid];
              for (const c of getResChildFolders("worldinfo", pid))
                r = r.concat(collectFolderIds(c));
              return r;
            };
            const allFids = collectFolderIds(selectedWorldInfoFolder);
            searchPool = names.filter((n) => allFids.includes(groups[n]));
          }
        }
        const matched = searchPool.filter((n) => {
          const pool = [
            n.toLowerCase(),
            (getWorldInfoNote(n) || "").toLowerCase(),
            ...getResFolderPathNames("worldinfo", n).map((s) =>
              s.toLowerCase(),
            ),
          ];
          return fuzzyMatch(q, pool);
        });
        rightList.empty();
        pathEl.text(`搜索世界书: "${q}"`);
        countEl.text(`${matched.length} 个结果`);
        if (matched.length === 0) {
          rightList.html(
            '<div class="cfm-right-empty">未找到匹配的世界书</div>',
          );
          return;
        }
        const cfmMultiSelectMode = state.getCfmMultiSelectMode();
        const cfmMultiSelected = state.getCfmMultiSelected();
        const cfmExportMode = state.getCfmExportMode();
        const cfmExportSelected = state.getCfmExportSelected();
        const cfmResDeleteMode = state.getCfmResDeleteMode();
        const cfmResDeleteSelected = state.getCfmResDeleteSelected();
        const cfmWorldInfoNoteMode = state.getCfmWorldInfoNoteMode();
        const cfmWorldInfoNoteSelected = state.getCfmWorldInfoNoteSelected();
        const cfmWorldInfoRenameMode = state.getCfmWorldInfoRenameMode();
        const cfmWorldInfoRenameSelected =
          state.getCfmWorldInfoRenameSelected();
        const cfmWorldInfoEntryLastFocusedName =
          state.getCfmWorldInfoEntryLastFocusedName();
        for (const n of matched) {
          const fav = isResFavorite("worldinfo", n);
          const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(n);
          const isExpSel = cfmExportMode && cfmExportSelected.has(n);
          const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(n);
          const isNoteSel =
            cfmWorldInfoNoteMode && cfmWorldInfoNoteSelected.has(n);
          const isRenameSel =
            cfmWorldInfoRenameMode && cfmWorldInfoRenameSelected.has(n);
          const msCheckHtml = cfmResDeleteMode
            ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
            : cfmExportMode
              ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
              : cfmWorldInfoNoteMode
                ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
                : cfmWorldInfoRenameMode
                  ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                  : cfmMultiSelectMode
                    ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                    : "";
          const wFolderPath = (() => {
            const grp = groups[n];
            if (grp && getResFolderTree("worldinfo")[grp])
              return getResFolderPath("worldinfo", grp)
                .map((id) => getResFolderDisplayName("worldinfo", id))
                .join(" › ");
            return null;
          })();
          const wiNote = getWorldInfoNote(n);
          const noteHtml = wiNote
            ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(wiNote)}">${escapeHtml(wiNote)}</span>`
            : "";
          const noModeActive =
            !cfmExportMode &&
            !cfmResDeleteMode &&
            !cfmWorldInfoNoteMode &&
            !cfmWorldInfoRenameMode &&
            !cfmMultiSelectMode;
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
            <div class="cfm-row cfm-row-char cfm-search-result ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}">
              ${msCheckHtml}
              ${toggleHtml}
              <div class="cfm-row-icon"><i class="fa-solid fa-book" style="font-size:20px;color:#a6e3a1;"></i></div>
              <div class="cfm-row-name"><span class="cfm-char-name-inline">${expandHtml}<span class="cfm-worldinfo-name-text">${escapeHtml(n)}</span></span>${noteHtml}${wFolderPath ? `<div class="cfm-row-folder-path">${escapeHtml(wFolderPath)}</div>` : ""}</div>
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
            state.setCfmWorldInfoEntryLastFocusedName(n);
            toggleWorldInfoEntryBookExpanded(n);
            refreshWorldInfoPanelView();
          });
          // 世界书激活开关事件（搜索视图）
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
          row.find(".cfm-row-star").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowFav = toggleResFavorite("worldinfo", n);
            const s = row.find(".cfm-row-star");
            s.toggleClass("cfm-star-active", nowFav);
            s.attr("title", nowFav ? "取消收藏" : "添加收藏");
            s.find("i").attr(
              "class",
              `fa-${nowFav ? "solid" : "regular"} fa-star`,
            );
          });
          // 单个备注编辑按钮
          row.find(".cfm-row-note-btn").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            executeWorldInfoNoteEdit([n]);
          });
          // 单个重命名按钮
          row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            executeWorldInfoRename([n]);
          });
          row.on("click", (e) => {
            if (
              $(e.target).closest(
                ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-wi-toggle, .cfm-worldinfo-entry-expand",
              ).length
            )
              return;
            if (cfmResDeleteMode) {
              toggleResDeleteItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmExportMode) {
              toggleExportItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmWorldInfoNoteMode) {
              toggleWorldInfoNoteItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmWorldInfoRenameMode) {
              toggleWorldInfoRenameItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmMultiSelectMode) {
              toggleMultiSelectItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            openWorldInfoEditor(n);
          });
          // 拖拽支持（搜索模式下也可拖拽）
          row.attr("draggable", "true");
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
          rightList.append(row);
          if (isEntryExpanded)
            renderWorldInfoEntrySubList(row, n, refreshWorldInfoPanelView);
        }

        // 删除工具栏（搜索世界书）
        prependResDeleteToolbar(rightList, executeWorldInfoSearch);
        // 导出工具栏（搜索世界书）
        prependExportToolbar(rightList, executeWorldInfoSearch);
        // 备注编辑工具栏（搜索世界书）
        prependWorldInfoNoteToolbar(rightList, executeWorldInfoSearch);
        // 重命名工具栏（搜索世界书）
        prependWorldInfoRenameToolbar(rightList, executeWorldInfoSearch);
        // 多选工具栏（搜索模式下也可用）
        if (cfmMultiSelectMode) {
          const visible = getVisibleResourceIds();
          const allSel =
            visible.length > 0 &&
            visible.every((id) => cfmMultiSelected.has(id));
          const toolbar = $(`
            <div class="cfm-multisel-toolbar">
              <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
              <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
              <button class="cfm-btn cfm-btn-sm cfm-multisel-activate" title="批量激活世界书"><i class="fa-solid fa-toggle-on"></i> 激活</button>
              <button class="cfm-btn cfm-btn-sm cfm-multisel-deactivate" title="批量取消激活世界书"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
              <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
            </div>
          `);
          toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectAllVisible();
            executeWorldInfoSearch();
          });
          toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            state.setCfmMultiSelectRangeMode(!cfmMultiSelectRangeMode);
            if (state.getCfmMultiSelectRangeMode())
              state.setCfmMultiSelectLastClicked(null);
            executeWorldInfoSearch();
          });
          toolbar
            .find(".cfm-multisel-activate")
            .on("click touchend", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const changed = await applyWorldInfoMultiActivation(
                Array.from(cfmMultiSelected),
                true,
              );
              if (changed) executeWorldInfoSearch();
            });
          toolbar
            .find(".cfm-multisel-deactivate")
            .on("click touchend", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const changed = await applyWorldInfoMultiActivation(
                Array.from(cfmMultiSelected),
                false,
              );
              if (changed) executeWorldInfoSearch();
            });
          rightList.prepend(toolbar);
        }
        bindWorldInfoEntryCollapseTargets(refreshWorldInfoPanelView);
      });
    }
  }

  return { executeWorldInfoSearch };
}
