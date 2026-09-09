// 搜索执行层 - 预设搜索
// 原 index.js executePresetSearch 迁移。通过 deps 注入闭包依赖与状态访问器。

export function createPresetSearchCore(deps) {
  const {
    $,
    applyPreset,
    cfmToastr,
    countResItemsRecursive,
    escapeHtml,
    executePresetNoteEdit,
    executePresetRename,
    fuzzyMatch,
    getContext,
    getCurrentPresets,
    getFolderSelfPathNames,
    getMultiDragData,
    getPresetNote,
    getResChildFolders,
    getResFavorites,
    getResFolderDisplayName,
    getResFolderPath,
    getResFolderPathNames,
    getResFolderTree,
    getResourceFolders,
    getResourceGroups,
    getVisibleResourceIds,
    isResFavorite,
    pcDragEnd,
    pcDragStart,
    prependExportToolbar,
    prependPresetNoteToolbar,
    prependPresetRenameToolbar,
    prependResDeleteToolbar,
    recordTouchTapStart,
    renderPresetDetailSubList,
    renderPresetsView,
    selectAllVisible,
    shouldIgnoreTouchTapAfterMove,
    toggleExportItem,
    toggleMultiSelectItem,
    togglePresetNoteItem,
    togglePresetRenameItem,
    toggleResDeleteItem,
    toggleResFavorite,
    touchDragMgr,
    state,
  } = deps;

  function executePresetSearch() {
    const q = $("#cfm-preset-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-preset-search-scope").val();
    const type = $("#cfm-preset-search-type").val();

    if (!q) {
      renderPresetsView();
      return;
    }

    const rightList = $("#cfm-preset-right-list");
    const pathEl = $("#cfm-preset-rh-path");
    const countEl = $("#cfm-preset-rh-count");

    const presets = getCurrentPresets();
    const groups = getResourceGroups("presets");
    const folders = getResourceFolders("presets");

    if (type === "folder") {
      // 搜索文件夹名（支持当前文件夹范围）
      let matchedIds;
      const selectedPresetFolder = state.getSelectedPresetFolder();
      if (
        scope === "current" &&
        selectedPresetFolder &&
        selectedPresetFolder !== "__ungrouped__" &&
        selectedPresetFolder !== "__favorites__" &&
        getResFolderTree("presets")[selectedPresetFolder]
      ) {
        const collectDesc = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("presets", pid))
            r = r.concat(collectDesc(c));
          return r;
        };
        const descendants = collectDesc(selectedPresetFolder);
        matchedIds = descendants.filter((f) =>
          fuzzyMatch(
            q,
            getFolderSelfPathNames("presets", f).map((s) => s.toLowerCase()),
          ),
        );
      } else {
        matchedIds = folders.filter((f) =>
          fuzzyMatch(
            q,
            getFolderSelfPathNames("presets", f).map((s) => s.toLowerCase()),
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
        const folderPath = getResFolderPath("presets", fname)
          .map((id) => getResFolderDisplayName("presets", id))
          .join(" › ");
        const childCount = countResItemsRecursive("presets", fname);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("presets", fname))}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个预设</div>
          </div>
        `);
        row.on("click", () => {
          const path = getResFolderPath("presets", fname);
          const presetExpandedNodes = state.getPresetExpandedNodes();
          for (const pid of path) presetExpandedNodes.add(pid);
          state.setSelectedPresetFolder(fname);
          $("#cfm-preset-global-search").val("");
          renderPresetsView();
        });
        rightList.append(row);
      }
    } else {
      // 搜索预设
      let searchPool = presets;
      const selectedPresetFolder = state.getSelectedPresetFolder();
      if (scope === "current" && selectedPresetFolder) {
        if (selectedPresetFolder === "__ungrouped__") {
          searchPool = presets.filter(
            (p) => !groups[p.name] || !folders.includes(groups[p.name]),
          );
        } else if (selectedPresetFolder === "__favorites__") {
          const favs = getResFavorites("presets");
          searchPool = presets.filter((p) => favs.includes(p.name));
        } else if (folders.includes(selectedPresetFolder)) {
          // 递归收集当前文件夹及子文件夹中的预设
          const collectFolderIds = (pid) => {
            let r = [pid];
            for (const c of getResChildFolders("presets", pid))
              r = r.concat(collectFolderIds(c));
            return r;
          };
          const allFids = collectFolderIds(selectedPresetFolder);
          searchPool = presets.filter((p) => allFids.includes(groups[p.name]));
        }
      }
      const matched = searchPool.filter((p) => {
        const pool = [
          p.name.toLowerCase(),
          (getPresetNote(p.name) || "").toLowerCase(),
          ...getResFolderPathNames("presets", p.name).map((s) =>
            s.toLowerCase(),
          ),
        ];
        return fuzzyMatch(q, pool);
      });
      rightList.empty();
      pathEl.text(`搜索预设: "${q}"`);
      countEl.text(`${matched.length} 个结果`);
      if (matched.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的预设</div>');
        return;
      }
      const pm = getContext().getPresetManager();
      const currentVal = pm && pm.select ? pm.select.val() : null;
      const cfmMultiSelectMode = state.getCfmMultiSelectMode();
      const cfmMultiSelected = state.getCfmMultiSelected();
      const cfmExportMode = state.getCfmExportMode();
      const cfmExportSelected = state.getCfmExportSelected();
      const cfmResDeleteMode = state.getCfmResDeleteMode();
      const cfmResDeleteSelected = state.getCfmResDeleteSelected();
      const cfmPresetNoteMode = state.getCfmPresetNoteMode();
      const cfmPresetNoteSelected = state.getCfmPresetNoteSelected();
      const cfmPresetRenameMode = state.getCfmPresetRenameMode();
      const cfmPresetRenameSelected = state.getCfmPresetRenameSelected();
      const cfmPresetDetailExpandedNames =
        state.getCfmPresetDetailExpandedNames();
      for (const p of matched) {
        const isActive = p.value === currentVal;
        const fav = isResFavorite("presets", p.name);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(p.name);
        const isExpSel = cfmExportMode && cfmExportSelected.has(p.name);
        const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(p.name);
        const isNoteSel =
          cfmPresetNoteMode && cfmPresetNoteSelected.has(p.name);
        const isRenameSel =
          cfmPresetRenameMode && cfmPresetRenameSelected.has(p.name);
        const msCheckHtml = cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : cfmPresetNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : cfmPresetRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        const pFolderPath = (() => {
          const grp = groups[p.name];
          if (grp && getResFolderTree("presets")[grp])
            return getResFolderPath("presets", grp)
              .map((id) => getResFolderDisplayName("presets", id))
              .join(" › ");
          return null;
        })();
        const presetNote = getPresetNote(p.name);
        const noteHtml = presetNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(presetNote)}">${escapeHtml(presetNote)}</span>`
          : "";
        const noModeActive =
          !cfmExportMode &&
          !cfmResDeleteMode &&
          !cfmPresetNoteMode &&
          !cfmPresetRenameMode &&
          !cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        // 如果在备注或重命名模式，替换 msCheckHtml
        const finalCheckHtml = cfmPresetNoteMode
          ? msCheckHtml ||
            `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
          : cfmPresetRenameMode
            ? msCheckHtml ||
              `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
            : msCheckHtml;
        const isPresetDetailExpanded = cfmPresetDetailExpandedNames.has(p.name);
        const presetDetailToggleHtml = `<div class="cfm-char-detail-toggle cfm-preset-detail-toggle" title="展开/折叠预设详情"><i class="fa-solid fa-caret-${isPresetDetailExpanded ? "down" : "right"}"></i></div>`;
        const row = $(`
          <div class="cfm-row cfm-row-char cfm-search-result ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(p.name)}">
          ${finalCheckHtml}
          <div class="cfm-row-icon"><i class="fa-solid fa-file-lines" style="font-size:20px;color:#8b9dfc;"></i></div>
          <div class="cfm-row-name"><span class="cfm-char-name-inline">${presetDetailToggleHtml}<span class="cfm-preset-name-text">${escapeHtml(p.name)}</span></span>${noteHtml}${pFolderPath ? `<div class="cfm-row-folder-path">${escapeHtml(pFolderPath)}</div>` : ""}</div>
          ${singleRenameBtn}
          ${singleNoteBtn}
          <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
        </div>
      `);
        row.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nowFav = toggleResFavorite("presets", p.name);
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
          executePresetNoteEdit([p.name]);
        });
        // 单个重命名按钮
        row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executePresetRename([p.name]);
        });
        row
          .find(".cfm-preset-detail-toggle")
          .on("touchstart", (e) =>
            recordTouchTapStart(e, "cfmPresetDetailToggleTap"),
          )
          .on("click touchend", (e) => {
            if (
              shouldIgnoreTouchTapAfterMove(e, {
                prefix: "cfmPresetDetailToggleTap",
              })
            ) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const name = p.name;
            const detailSubList = row
              .nextAll(".cfm-preset-detail-sublist")
              .first();
            if (cfmPresetDetailExpandedNames.has(name)) {
              cfmPresetDetailExpandedNames.delete(name);
              detailSubList.slideUp(150, function () {
                $(this).remove();
              });
              row
                .find(".cfm-preset-detail-toggle i")
                .removeClass("fa-caret-down")
                .addClass("fa-caret-right");
            } else {
              cfmPresetDetailExpandedNames.add(name);
              row
                .find(".cfm-preset-detail-toggle i")
                .removeClass("fa-caret-right")
                .addClass("fa-caret-down");
              renderPresetDetailSubList(row, p);
              row
                .nextAll(".cfm-preset-detail-sublist")
                .first()
                .hide()
                .slideDown(150);
            }
          });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-preset-detail-toggle",
            ).length
          )
            return;
          if (cfmResDeleteMode) {
            toggleResDeleteItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmPresetNoteMode) {
            togglePresetNoteItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmPresetRenameMode) {
            togglePresetRenameItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          applyPreset(p.value);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          cfmToastr.success(`已应用预设「${p.name}」`);
        });
        // 拖拽支持（搜索模式下也可拖拽）
        row.attr("draggable", "true");
        row.on("dragstart", (e) => {
          const singleData = { type: "preset", name: p.name, value: p.value };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "preset", name: p.name, value: p.value };
          return getMultiDragData(singleData);
        });
        rightList.append(row);
        if (cfmPresetDetailExpandedNames.has(p.name)) {
          renderPresetDetailSubList(row, p);
        }
      }

      // 删除工具栏（搜索预设）
      prependResDeleteToolbar(rightList, executePresetSearch);
      // 导出工具栏（搜索预设）
      prependExportToolbar(rightList, executePresetSearch);
      // 备注编辑工具栏（搜索预设）
      prependPresetNoteToolbar(rightList, executePresetSearch);
      // 重命名工具栏（搜索预设）
      prependPresetRenameToolbar(rightList, executePresetSearch);
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
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          executePresetSearch();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.setCfmMultiSelectRangeMode(!cfmMultiSelectRangeMode);
          if (state.getCfmMultiSelectRangeMode())
            state.setCfmMultiSelectLastClicked(null);
          executePresetSearch();
        });
        rightList.prepend(toolbar);
      }
    }
  }

  return { executePresetSearch };
}
