// 搜索执行层 - 正则搜索
// 原 index.js executeRegexSearch 迁移。通过 deps 注入闭包依赖与状态访问器。

export function createRegexSearchCore(deps) {
  const {
    $,
    applyGlobalRegexMultiActivation,
    buildRegexScriptRowHtml,
    ensureResourceSettings,
    escapeHtml,
    extensionName,
    extension_settings,
    fuzzyMatch,
    getRegexGlobalScripts,
    getResFavorites,
    getVisibleResourceIds,
    renderRegexView,
    selectAllVisible,
    toggleExportItem,
    toggleMultiSelectItem,
    toggleResDeleteItem,
    toggleResFavorite,
    state,
  } = deps;

  function executeRegexSearch() {
    const q = $("#cfm-regex-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-regex-search-scope").val();
    const type = $("#cfm-regex-search-type").val();

    if (!q) {
      renderRegexView();
      return;
    }

    const rightList = $("#cfm-regex-right-list");
    const pathEl = $("#cfm-regex-rh-path");
    const countEl = $("#cfm-regex-rh-count");

    ensureResourceSettings();
    const globalScripts = getRegexGlobalScripts();
    const folderTree = extension_settings[extensionName].regexFolderTree;
    const globalGroups = extension_settings[extensionName].regexGlobalGroups;

    // 辅助：获取正则文件夹路径（从根到叶）
    function _getRegexFolderPath(fid) {
      const path = [];
      let cur = fid;
      while (cur && folderTree[cur]) {
        path.unshift(cur);
        cur = folderTree[cur].parentId;
      }
      return path;
    }
    // 辅助：获取正则文件夹路径显示名数组
    function _getRegexFolderPathNames(fid) {
      return _getRegexFolderPath(fid)
        .map((id) => folderTree[id]?.displayName || id)
        .filter(Boolean);
    }
    // 辅助：获取子文件夹
    function _getRegexChildFolders(parentId) {
      return Object.keys(folderTree).filter(
        (id) => folderTree[id].parentId === parentId,
      );
    }
    // 辅助：递归计数
    function _countScriptsInFolder(fid) {
      let c = globalScripts.filter((s) => globalGroups[s.id] === fid).length;
      for (const childId of _getRegexChildFolders(fid))
        c += _countScriptsInFolder(childId);
      return c;
    }
    // 辅助：递归收集文件夹及所有后代
    function _collectDescendants(pid) {
      let r = [pid];
      for (const c of _getRegexChildFolders(pid))
        r = r.concat(_collectDescendants(c));
      return r;
    }

    if (type === "folder") {
      // 搜索文件夹名（支持当前文件夹范围）
      const allFolderIds = Object.keys(folderTree);
      let matchedIds;
      const selectedRegexNode = state.getSelectedRegexNode();
      if (
        scope === "current" &&
        selectedRegexNode &&
        selectedRegexNode !== "__ungrouped__" &&
        selectedRegexNode !== "__favorites__" &&
        folderTree[selectedRegexNode]
      ) {
        const descendants = _collectDescendants(selectedRegexNode);
        matchedIds = descendants.filter((f) =>
          fuzzyMatch(
            q,
            _getRegexFolderPathNames(f).map((s) => s.toLowerCase()),
          ),
        );
      } else {
        matchedIds = allFolderIds.filter((f) =>
          fuzzyMatch(
            q,
            _getRegexFolderPathNames(f).map((s) => s.toLowerCase()),
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
      for (const fid of matchedIds) {
        const folderPath = _getRegexFolderPath(fid)
          .map((id) => folderTree[id]?.displayName || id)
          .join(" › ");
        const childCount = _countScriptsInFolder(fid);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(folderTree[fid]?.displayName || fid)}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个脚本</div>
          </div>
        `);
        row.on("click", () => {
          const path = _getRegexFolderPath(fid);
          const regexExpandedNodes = state.getRegexExpandedNodes();
          for (const pid of path) regexExpandedNodes.add(pid);
          state.setSelectedRegexNode(fid);
          $("#cfm-regex-global-search").val("");
          $("#cfm-regex-global-search")
            .closest(".cfm-search-input-wrapper")
            .removeClass("cfm-has-text");
          renderRegexView();
        });
        rightList.append(row);
      }
    } else {
      // 搜索正则脚本
      let searchPool = globalScripts;
      const selectedRegexNode = state.getSelectedRegexNode();
      if (scope === "current" && selectedRegexNode) {
        if (selectedRegexNode === "__ungrouped__") {
          searchPool = globalScripts.filter(
            (s) => !globalGroups[s.id] || !folderTree[globalGroups[s.id]],
          );
        } else if (selectedRegexNode === "__favorites__") {
          const favs = getResFavorites("regex");
          searchPool = globalScripts.filter((s) => s.id && favs.includes(s.id));
        } else if (folderTree[selectedRegexNode]) {
          // 递归收集当前文件夹及子文件夹中的脚本
          const allFids = _collectDescendants(selectedRegexNode);
          searchPool = globalScripts.filter((s) =>
            allFids.includes(globalGroups[s.id]),
          );
        }
      }
      const matched = searchPool.filter((s) => {
        const pool = [
          (s.scriptName || "").toLowerCase(),
          ..._getRegexFolderPathNames(globalGroups[s.id] || "").map((n) =>
            n.toLowerCase(),
          ),
        ];
        return fuzzyMatch(q, pool);
      });
      rightList.empty();
      pathEl.text(`搜索正则: "${q}"`);
      countEl.text(`${matched.length} 个结果`);
      if (matched.length === 0) {
        rightList.html(
          '<div class="cfm-right-empty">未找到匹配的正则脚本</div>',
        );
        return;
      }
      const regexFavs = getResFavorites("regex");
      const cfmMultiSelectMode = state.getCfmMultiSelectMode();
      const cfmMultiSelected = state.getCfmMultiSelected();
      const cfmMultiSelectRangeMode = state.getCfmMultiSelectRangeMode();
      const cfmResDeleteMode = state.getCfmResDeleteMode();
      const cfmResDeleteSelected = state.getCfmResDeleteSelected();
      const cfmExportMode = state.getCfmExportMode();
      const cfmExportSelected = state.getCfmExportSelected();
      for (const s of matched) {
        const fav = s.id ? regexFavs.includes(s.id) : false;
        const isMSel = cfmMultiSelectMode && s.id && cfmMultiSelected.has(s.id);
        const isDelSel =
          cfmResDeleteMode && s.id && cfmResDeleteSelected.has(s.id);
        const isExportSel =
          cfmExportMode && s.id && cfmExportSelected.has(s.id);
        // 构建脚本行
        const scriptRow = $(buildRegexScriptRowHtml(s, 0, ""));
        scriptRow.addClass("cfm-search-result");
        if (isDelSel) scriptRow.addClass("cfm-res-delete-row-selected");
        if (isExportSel) scriptRow.addClass("cfm-export-row-selected");
        if (isMSel) scriptRow.addClass("cfm-multisel-row-selected");
        // 添加文件夹路径信息
        const sFolderId = globalGroups[s.id];
        if (sFolderId && folderTree[sFolderId]) {
          const sFolderPath = _getRegexFolderPath(sFolderId)
            .map((id) => folderTree[id]?.displayName || id)
            .join(" › ");
          scriptRow
            .find(".cfm-row-name")
            .append(
              `<div class="cfm-row-folder-path">${escapeHtml(sFolderPath)}</div>`,
            );
        }
        // 收藏星标点击事件
        scriptRow.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!s.id) return;
          const nowFav = toggleResFavorite("regex", s.id);
          const starEl = scriptRow.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
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
          if (cfmResDeleteMode) {
            toggleResDeleteItem(s.id, e.shiftKey);
            executeRegexSearch();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(s.id, e.shiftKey);
            executeRegexSearch();
            return;
          }
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(s.id, e.shiftKey);
            executeRegexSearch();
            return;
          }
        });
        rightList.append(scriptRow);
      }

      if (cfmMultiSelectMode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 &&
          visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-activate" title="批量激活正则脚本"><i class="fa-solid fa-toggle-on"></i> 激活</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-deactivate" title="批量取消激活正则脚本"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          executeRegexSearch();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.setCfmMultiSelectRangeMode(!cfmMultiSelectRangeMode);
          if (state.getCfmMultiSelectRangeMode())
            state.setCfmMultiSelectLastClicked(null);
          executeRegexSearch();
        });
        toolbar
          .find(".cfm-multisel-activate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyGlobalRegexMultiActivation(
              Array.from(cfmMultiSelected),
              true,
            );
            if (changed) executeRegexSearch();
          });
        toolbar
          .find(".cfm-multisel-deactivate")
          .on("click touchend", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const changed = await applyGlobalRegexMultiActivation(
              Array.from(cfmMultiSelected),
              false,
            );
            if (changed) executeRegexSearch();
          });
        rightList.prepend(toolbar);
      }
    }
  }

  return { executeRegexSearch };
}
