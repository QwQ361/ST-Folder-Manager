// 正则资源树层：承接 Regex 文件夹树的数据读取、父子层级解析、路径构建、脚本计数与树节点移动目标解析；具体 DOM 渲染应下沉到 ui/views/regex-view.js 或 ui/tree，而不与正则业务状态混写。

export function createRegexTreeApiCore(deps) {
  const {
    ensureResourceSettings,
    extensionName,
    extension_settings,
    saveResTree,
  } = deps;

  function getRegexFolderTree() {
    ensureResourceSettings();
    return extension_settings[extensionName].regexFolderTree;
  }

  function sortRegexFolderIds(folderIds) {
    const tree = getRegexFolderTree();
    return [...folderIds].sort((a, b) => {
      const oa = tree[a]?.sortOrder ?? 0;
      const ob = tree[b]?.sortOrder ?? 0;
      if (oa !== ob) return oa - ob;
      return (tree[a]?.displayName || a).localeCompare(
        tree[b]?.displayName || b,
        "zh-CN",
      );
    });
  }

  function wouldCreateRegexCycle(folderId, parentId) {
    const tree = getRegexFolderTree();
    let current = parentId;
    const visited = new Set();
    while (current) {
      if (current === folderId) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = tree[current]?.parentId || null;
    }
    return false;
  }

  function reorderRegexFolder(folderId, newParentId, insertBeforeId) {
    const tree = getRegexFolderTree();
    if (!tree[folderId]) return false;
    const targetParentId = newParentId || null;
    tree[folderId].parentId = targetParentId;
    const siblings = sortRegexFolderIds(
      Object.keys(tree).filter(
        (id) =>
          id !== folderId && (tree[id].parentId || null) === targetParentId,
      ),
    );
    let insertIdx = siblings.length;
    if (insertBeforeId) {
      const idx = siblings.indexOf(insertBeforeId);
      if (idx >= 0) insertIdx = idx;
    }
    if (!targetParentId && !insertBeforeId) {
      tree[folderId].sortOrder = 0;
    }
    siblings.splice(insertIdx, 0, folderId);
    siblings.forEach((id, i) => {
      tree[id].sortOrder = i + 1;
    });
    saveResTree("regex");
    return true;
  }

  function moveRegexFolder(data, target) {
    const folderId = data?.id;
    if (!folderId) return [];
    const tree = getRegexFolderTree();
    if (!tree[folderId]) return [];
    if (target?.targetKind === "ungrouped") {
      reorderRegexFolder(folderId, null, null);
      return [folderId];
    }
    if (folderId === target?.folderId) return [];
    if (target?.zone === "into") {
      if (wouldCreateRegexCycle(folderId, target.folderId)) return [];
      reorderRegexFolder(folderId, target.folderId, null);
      return [folderId];
    }
    const targetParentId = tree[target?.folderId]?.parentId || null;
    if (wouldCreateRegexCycle(folderId, targetParentId)) return [];
    if (target?.zone === "before") {
      reorderRegexFolder(folderId, targetParentId, target.folderId);
    } else {
      const siblings = sortRegexFolderIds(
        Object.keys(tree).filter(
          (id) => (tree[id].parentId || null) === targetParentId,
        ),
      ).filter((id) => id !== folderId);
      const curIdx = siblings.indexOf(target.folderId);
      const nextSiblingId =
        curIdx >= 0 && curIdx < siblings.length - 1
          ? siblings[curIdx + 1]
          : null;
      reorderRegexFolder(folderId, targetParentId, nextSiblingId);
    }
    return [folderId];
  }

  return {
    getRegexFolderTree,
    sortRegexFolderIds,
    wouldCreateRegexCycle,
    reorderRegexFolder,
    moveRegexFolder,
  };
}
