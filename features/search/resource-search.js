// 资源搜索执行层：承接各资源页全局搜索的数据聚合、过滤和结果行渲染。
// 当前迁移：主题搜索（executeThemeSearch）、背景搜索（executeBgSearch）。
// 其余资源搜索（角色卡、预设、世界书、快速回复、正则）与各自视图 DOM 深度耦合，
// 待与对应视图模块迁移时一并处理。
// 说明：这些函数与视图闭包状态（各模式开关、选中文件夹等）共享，通过 deps 注入保持引用一致。

export function createResourceSearchApiCore(deps) {
  const {
    $,
    BG_ORIENT_ICONS,
    BG_ORIENT_LABELS,
    applyBackground,
    applyTheme,
    cfmBgNoteMode,
    cfmBgNoteSelected,
    cfmBgRenameMode,
    cfmBgRenameSelected,
    cfmExportMode,
    cfmExportSelected,
    cfmMultiSelectLastClicked,
    cfmMultiSelectMode,
    cfmMultiSelectRangeMode,
    cfmMultiSelected,
    cfmResDeleteMode,
    cfmResDeleteSelected,
    cfmThemeNoteMode,
    cfmThemeNoteSelected,
    cfmThemeRenameMode,
    cfmThemeRenameSelected,
    cfmToastr,
    escapeHtml,
    executeBgNoteEdit,
    executeBgRename,
    executeThemeNoteEdit,
    executeThemeRename,
    fuzzyMatch,
    getBackgroundDisplayName,
    getBackgroundNames,
    getBackgroundThumbnailUrl,
    getBgNote,
    getBgOrientation,
    getContext,
    getMultiDragData,
    getResChildFolders,
    getResFavorites,
    getResFolderDisplayName,
    getResFolderPath,
    getResFolderPathNames,
    getResFolderTree,
    getResourceFolders,
    getResourceGroups,
    getThemeBgBinding,
    getThemeNames,
    getThemeNote,
    getVisibleResourceIds,
    handleThemeBgLink,
    isResFavorite,
    pcDragEnd,
    pcDragStart,
    prependBgNoteToolbar,
    prependBgRenameToolbar,
    prependExportToolbar,
    prependResDeleteToolbar,
    prependThemeNoteToolbar,
    prependThemeRenameToolbar,
    renderBackgroundsView,
    renderThemesView,
    selectAllVisible,
    selectedBgFolder,
    selectedThemeFolder,
    toggleBgNoteItem,
    toggleBgRenameItem,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    toggleThemeNoteItem,
    toggleThemeRenameItem,
    touchDragMgr,
    document,
  } = deps;

  // ==================== 主题全局搜索 ====================
  function executeThemeSearch() {
    const q = $("#cfm-theme-global-search").val().toLowerCase().trim();
    if (!q) {
      renderThemesView();
      return;
    }

    const rightList = $("#cfm-theme-right-list");
    const pathEl = $("#cfm-theme-rh-path");
    const countEl = $("#cfm-theme-rh-count");

    const themeNames = getThemeNames();
    const groups = getResourceGroups("themes");
    const folders = getResourceFolders("themes");

    // 主题搜索（简化版，只搜索主题名称）
    let searchPool = themeNames;
    if (selectedThemeFolder) {
      if (selectedThemeFolder === "__ungrouped__") {
        searchPool = themeNames.filter(
          (n) => !groups[n] || !folders.includes(groups[n]),
        );
      } else if (selectedThemeFolder === "__favorites__") {
        const favs = getResFavorites("themes");
        searchPool = themeNames.filter((n) => favs.includes(n));
      } else if (folders.includes(selectedThemeFolder)) {
        const collectFolderIds = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("themes", pid))
            r = r.concat(collectFolderIds(c));
          return r;
        };
        const allFids = collectFolderIds(selectedThemeFolder);
        searchPool = themeNames.filter((n) => allFids.includes(groups[n]));
      }
    }
    const matched = searchPool.filter((n) => {
      const pool = [
        n.toLowerCase(),
        (getThemeNote(n) || "").toLowerCase(),
        ...getResFolderPathNames("themes", n).map((s) => s.toLowerCase()),
      ];
      return fuzzyMatch(q, pool);
    });
    rightList.empty();
    pathEl.text(`搜索主题: "${q}"`);
    countEl.text(`${matched.length} 个结果`);
    if (matched.length === 0) {
      rightList.html('<div class="cfm-right-empty">未找到匹配的主题</div>');
      return;
    }
    const currentThemeName =
      (getContext().powerUserSettings || {}).theme || null;
    for (const name of matched) {
      const isActive = name === currentThemeName;
      const fav = isResFavorite("themes", name);
      const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(name);
      const isExpSel = cfmExportMode && cfmExportSelected.has(name);
      const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(name);
      const msCheckHtml = cfmResDeleteMode
        ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
        : cfmExportMode
          ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
          : cfmMultiSelectMode
            ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
            : "";
      const tFolderPath = (() => {
        const grp = groups[name];
        if (grp && getResFolderTree("themes")[grp])
          return getResFolderPath("themes", grp)
            .map((id) => getResFolderDisplayName("themes", id))
            .join(" › ");
        return "未归类";
      })();
      const themeNote = getThemeNote(name);
      const noteHtml = themeNote
        ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(themeNote)}">${escapeHtml(themeNote)}</span>`
        : "";
      const noModeActive =
        !cfmExportMode &&
        !cfmResDeleteMode &&
        !cfmThemeNoteMode &&
        !cfmThemeRenameMode &&
        !cfmMultiSelectMode;
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
      const bgBindHtml = bgBinding
        ? `<span class="cfm-theme-bgbind-tag" title="绑定背景: ${escapeHtml(getBackgroundDisplayName(bgBinding))}"><i class="fa-solid fa-image"></i>${escapeHtml(getBackgroundDisplayName(bgBinding))}</span>`
        : "";
      const isNoteSel = cfmThemeNoteMode && cfmThemeNoteSelected.has(name);
      const isRenameSel =
        cfmThemeRenameMode && cfmThemeRenameSelected.has(name);
      const noteCheckHtml = cfmThemeNoteMode
        ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
        : "";
      const renameCheckHtml = cfmThemeRenameMode
        ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
        : "";
      // 如果在备注/重命名模式，替换 msCheckHtml
      const finalCheckHtml = cfmThemeNoteMode
        ? noteCheckHtml
        : cfmThemeRenameMode
          ? renameCheckHtml
          : msCheckHtml;
      const row = $(`
        <div class="cfm-row cfm-row-char cfm-search-result ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">
          ${finalCheckHtml}
          <div class="cfm-row-icon"><i class="fa-solid fa-palette" style="font-size:20px;color:#cba6f7;"></i></div>
          <div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(name)}</span>${noteHtml}${bgBindHtml}<div class="cfm-row-folder-path">${escapeHtml(tFolderPath)}</div></div>
          ${singleRenameBtn}
          ${singleNoteBtn}
          ${bgLinkBtn}
          <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
        </div>
      `);
      row.find(".cfm-row-star").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowFav = toggleResFavorite("themes", name);
        const starEl = row.find(".cfm-row-star");
        starEl.toggleClass("cfm-star-active", nowFav);
        starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
        starEl
          .find("i")
          .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
        if (selectedThemeFolder === "__favorites__") executeThemeSearch();
      });
      row.find(".cfm-row-note-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeThemeNoteEdit([name]);
      });
      // 单个重命名按钮
      row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeThemeRename([name]);
      });
      // 绑定背景按钮
      row.find(".cfm-row-bglink-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleThemeBgLink(name);
      });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-row-bglink-btn",
          ).length
        )
          return;
        if (cfmResDeleteMode) {
          toggleResDeleteItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmExportMode) {
          toggleExportItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmThemeNoteMode) {
          toggleThemeNoteItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmThemeRenameMode) {
          toggleThemeRenameItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmMultiSelectMode) {
          toggleMultiSelectItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        applyTheme(name);
        rightList.find(".cfm-rv-item-active").removeClass("cfm-rv-item-active");
        row.addClass("cfm-rv-item-active");
        cfmToastr.success(`已应用主题「${name}」`);
      });
      row.on("dragstart", (e) => {
        pcDragStart(e, getMultiDragData({ type: "theme", name }));
      });
      row.on("dragend", () => pcDragEnd());
      touchDragMgr.bind(row, () => getMultiDragData({ type: "theme", name }));
      rightList.append(row);
    }
    // 删除工具栏
    prependResDeleteToolbar(rightList, executeThemeSearch);
    // 导出工具栏
    prependExportToolbar(rightList, executeThemeSearch);
    // 备注编辑工具栏
    prependThemeNoteToolbar(rightList, executeThemeSearch);
    // 重命名工具栏
    prependThemeRenameToolbar(rightList, executeThemeSearch);
    // 多选工具栏
    if (cfmMultiSelectMode) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
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
        executeThemeSearch();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
        if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
        executeThemeSearch();
      });
      rightList.prepend(toolbar);
    }
  }

  // ==================== 背景全局搜索 ====================
  function executeBgSearch() {
    const q = $("#cfm-bg-global-search").val().toLowerCase().trim();
    if (!q) {
      renderBackgroundsView();
      return;
    }
    const rightList = $("#cfm-bg-right-list");
    const pathEl = $("#cfm-bg-rh-path");
    const countEl = $("#cfm-bg-rh-count");
    const bgNames = getBackgroundNames();
    const groups = getResourceGroups("backgrounds");
    const folders = getResourceFolders("backgrounds");
    let searchPool = bgNames;
    if (selectedBgFolder) {
      if (selectedBgFolder === "__ungrouped__") {
        searchPool = bgNames.filter(
          (n) => !groups[n] || !folders.includes(groups[n]),
        );
      } else if (selectedBgFolder === "__favorites__") {
        const favs = getResFavorites("backgrounds");
        searchPool = bgNames.filter((n) => favs.includes(n));
      } else if (folders.includes(selectedBgFolder)) {
        const collectFolderIds = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("backgrounds", pid))
            r = r.concat(collectFolderIds(c));
          return r;
        };
        const allFids = collectFolderIds(selectedBgFolder);
        searchPool = bgNames.filter((n) => allFids.includes(groups[n]));
      }
    }
    const matched = searchPool.filter((n) => {
      const orientLabel = BG_ORIENT_LABELS[getBgOrientation(n)] || "";
      const pool = [
        getBackgroundDisplayName(n).toLowerCase(),
        n.toLowerCase(),
        (getBgNote(n) || "").toLowerCase(),
        orientLabel.toLowerCase(),
        ...getResFolderPathNames("backgrounds", n).map((s) => s.toLowerCase()),
      ];
      return fuzzyMatch(q, pool);
    });
    rightList.empty();
    pathEl.text(`搜索背景: "${q}"`);
    countEl.text(`${matched.length} 个结果`);
    if (matched.length === 0) {
      rightList.html('<div class="cfm-right-empty">未找到匹配的背景</div>');
      return;
    }
    const currentBg = document.getElementById("bg1");
    const currentBgFile = currentBg
      ? currentBg.getAttribute("style") || ""
      : "";
    for (const name of matched) {
      const isActive =
        currentBgFile.includes(encodeURIComponent(name)) ||
        currentBgFile.includes(name);
      const fav = isResFavorite("backgrounds", name);
      const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(name);
      const isNoteSel = cfmBgNoteMode && cfmBgNoteSelected.has(name);
      const isRenameSel = cfmBgRenameMode && cfmBgRenameSelected.has(name);
      const msCheckHtml = cfmBgNoteMode
        ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
        : cfmBgRenameMode
          ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
          : cfmMultiSelectMode
            ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
            : "";
      const bFolderPath = (() => {
        const grp = groups[name];
        if (grp && getResFolderTree("backgrounds")[grp])
          return getResFolderPath("backgrounds", grp)
            .map((id) => getResFolderDisplayName("backgrounds", id))
            .join(" › ");
        return "未归类";
      })();
      const bgNote = getBgNote(name);
      const bgOrient = getBgOrientation(name);
      const orientHtml = bgOrient
        ? `<span class="cfm-bg-orient cfm-bg-orient-${bgOrient}" title="${BG_ORIENT_LABELS[bgOrient] || bgOrient}"><i class="fa-solid ${BG_ORIENT_ICONS[bgOrient] || "fa-expand"}"></i>${BG_ORIENT_LABELS[bgOrient] || bgOrient}</span>`
        : "";
      const noteHtml = bgNote
        ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(bgNote)}">${escapeHtml(bgNote)}</span>`
        : "";
      const noModeActive =
        !cfmBgNoteMode && !cfmBgRenameMode && !cfmMultiSelectMode;
      const singleNoteBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
      const singleRenameBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
        : "";
      const thumbUrl = getBackgroundThumbnailUrl(name);
      const row = $(
        `<div class="cfm-row cfm-row-char cfm-row-bg cfm-search-result ${isActive ? "cfm-rv-item-active" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">${msCheckHtml}<div class="cfm-row-icon cfm-bg-thumb" style="background-image:url('${thumbUrl}');background-size:cover;background-position:center;"></div><div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(getBackgroundDisplayName(name))}</span>${orientHtml}${noteHtml}<div class="cfm-row-folder-path">${escapeHtml(bFolderPath)}</div></div>${singleRenameBtn}${singleNoteBtn}<div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div></div>`,
      );
      row.find(".cfm-row-star").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowFav = toggleResFavorite("backgrounds", name);
        const starEl = row.find(".cfm-row-star");
        starEl.toggleClass("cfm-star-active", nowFav);
        starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
        starEl
          .find("i")
          .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
        if (selectedBgFolder === "__favorites__") executeBgSearch();
      });
      row.find(".cfm-row-note-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeBgNoteEdit([name]);
      });
      // 单个重命名按钮
      row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeBgRename([name]);
      });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
          ).length
        )
          return;
        if (cfmBgNoteMode) {
          toggleBgNoteItem(name, e.shiftKey);
          executeBgSearch();
          return;
        }
        if (cfmBgRenameMode) {
          toggleBgRenameItem(name, e.shiftKey);
          executeBgSearch();
          return;
        }
        if (cfmMultiSelectMode) {
          toggleMultiSelectItem(name, e.shiftKey);
          executeBgSearch();
          return;
        }
        applyBackground(name);
        rightList.find(".cfm-rv-item-active").removeClass("cfm-rv-item-active");
        row.addClass("cfm-rv-item-active");
        cfmToastr.success(`已应用背景「${getBackgroundDisplayName(name)}」`);
      });
      row.on("dragstart", (e) => {
        pcDragStart(e, getMultiDragData({ type: "background", name }));
      });
      row.on("dragend", () => pcDragEnd());
      touchDragMgr.bind(row, () =>
        getMultiDragData({ type: "background", name }),
      );
      rightList.append(row);
    }
    prependBgNoteToolbar(rightList, executeBgSearch);
    prependBgRenameToolbar(rightList, executeBgSearch);
    if (cfmMultiSelectMode) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
      const toolbar = $(
        `<div class="cfm-multisel-toolbar"><button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button><span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span></div>`,
      );
      toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectAllVisible();
        executeBgSearch();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
        if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
        executeBgSearch();
      });
      rightList.prepend(toolbar);
    }
  }

  return { executeThemeSearch, executeBgSearch };
}
