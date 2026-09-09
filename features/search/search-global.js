// 搜索执行层 - 全局（角色卡）搜索
// 原 index.js executeGlobalSearch 迁移。通过 deps 注入闭包依赖与状态访问器。

export function createGlobalSearchCore(deps) {
  const {
    $,
    appendCharRow,
    countCharsInFolderRecursive,
    escapeHtml,
    filterHiddenChars,
    fuzzyMatch,
    getCharacters,
    getCharactersInFolder,
    getCharFolderPathNames,
    getChildFolders,
    getFavoriteCharacters,
    getFolderPath,
    getFolderSelfPathNames,
    getFolderTagIds,
    getTagName,
    getUncategorizedCharacters,
    getVisibleResourceIds,
    prependEditToolbar,
    prependExportToolbar,
    prependResDeleteToolbar,
    renderLeftTree,
    renderRightPane,
    selectAllVisible,
    state,
  } = deps;

  function executeGlobalSearch() {
    const q = $("#cfm-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-search-scope").val(); // 'current' | 'all'
    const type = $("#cfm-search-type").val(); // 'char' | 'folder'

    if (!q) {
      // 清空搜索时恢复正常视图
      renderRightPane();
      return;
    }

    const list = $("#cfm-right-list");
    const pathEl = $("#cfm-rh-path");
    const countEl = $("#cfm-rh-count");

    if (type === "folder") {
      // 搜索文件夹
      list.empty();
      const allFolderIds = getFolderTagIds();
      let matchedIds;
      const selectedTreeNode = state.getSelectedTreeNode();
      if (
        scope === "current" &&
        selectedTreeNode &&
        selectedTreeNode !== "__uncategorized__" &&
        selectedTreeNode !== "__favorites__"
      ) {
        // 当前文件夹下递归搜索
        const collectDescendants = (parentId) => {
          let result = [parentId];
          for (const childId of getChildFolders(parentId)) {
            result = result.concat(collectDescendants(childId));
          }
          return result;
        };
        const descendants = collectDescendants(selectedTreeNode);
        matchedIds = descendants.filter((id) =>
          fuzzyMatch(
            q,
            getFolderSelfPathNames("chars", id).map((s) => s.toLowerCase()),
          ),
        );
      } else {
        matchedIds = allFolderIds.filter((id) =>
          fuzzyMatch(
            q,
            getFolderSelfPathNames("chars", id).map((s) => s.toLowerCase()),
          ),
        );
      }

      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matchedIds.length} 个结果`);

      if (matchedIds.length === 0) {
        list.html('<div class="cfm-right-empty">未找到匹配的文件夹</div>');
        return;
      }

      for (const fid of matchedIds) {
        const folderPath = getFolderPath(fid)
          .map((id) => getTagName(id))
          .join(" › ");
        const childCount = countCharsInFolderRecursive(fid);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result" data-folder-id="${fid}">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getTagName(fid))}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个角色</div>
          </div>
        `);
        row.on("click", (e) => {
          e.preventDefault();
          // 导航到该文件夹
          const fullPath = getFolderPath(fid);
          const expandedNodes = state.getExpandedNodes();
          for (const pid of fullPath) expandedNodes.add(pid);
          state.setSelectedTreeNode(fid);
          $("#cfm-global-search").val("");
          renderLeftTree();
          renderRightPane();
        });
        list.append(row);
      }
    } else {
      // 搜索角色
      list.empty();
      let chars;
      const selectedTreeNode = state.getSelectedTreeNode();
      if (scope === "current" && selectedTreeNode) {
        if (selectedTreeNode === "__uncategorized__") {
          chars = getUncategorizedCharacters();
        } else if (selectedTreeNode === "__favorites__") {
          chars = getFavoriteCharacters();
        } else {
          // 当前文件夹下递归收集所有角色
          const collectCharsRecursive = (folderId) => {
            let result = [...getCharactersInFolder(folderId)];
            for (const childId of getChildFolders(folderId)) {
              result = result.concat(collectCharsRecursive(childId));
            }
            return result;
          };
          chars = collectCharsRecursive(selectedTreeNode);
        }
      } else {
        chars = getCharacters();
      }

      let matched = chars.filter((c) => {
        const pool = [
          (c.name || "").toLowerCase(),
          (c.data?.creator || "").toLowerCase(),
          (c.data?.character_version || "").toLowerCase(),
          ...getCharFolderPathNames(c).map((s) => s.toLowerCase()),
        ];
        return fuzzyMatch(q, pool);
      });
      // 过滤隐藏角色卡（当总开关关闭时）
      matched = filterHiddenChars(matched);

      pathEl.text(`搜索角色: "${q}"`);
      countEl.text(`${matched.length} 个结果`);

      if (matched.length === 0) {
        list.html('<div class="cfm-right-empty">未找到匹配的角色</div>');
        return;
      }

      // 去重（递归收集可能有重复）
      const seen = new Set();
      for (const char of matched) {
        if (seen.has(char.avatar)) continue;
        seen.add(char.avatar);
        appendCharRow(list, char, true);
      }

      // 删除工具栏（搜索角色卡）
      prependResDeleteToolbar(list, renderRightPane);
      // 导出工具栏（搜索角色卡）
      prependExportToolbar(list, renderRightPane);
      // 编辑工具栏（搜索角色卡）
      prependEditToolbar(list, renderRightPane);
      // 多选工具栏（搜索模式下也可用）
      if (state.getCfmMultiSelectMode()) {
        const visible = getVisibleResourceIds();
        const cfmMultiSelected = state.getCfmMultiSelected();
        const cfmMultiSelectRangeMode = state.getCfmMultiSelectRangeMode();
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
          executeGlobalSearch();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.setCfmMultiSelectRangeMode(!state.getCfmMultiSelectRangeMode());
          if (state.getCfmMultiSelectRangeMode())
            state.setCfmMultiSelectLastClicked(null);
          executeGlobalSearch();
        });
        list.prepend(toolbar);
      }
    }
  }

  return { executeGlobalSearch };
}
