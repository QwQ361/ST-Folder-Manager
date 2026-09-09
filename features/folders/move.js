// 文件夹移动功能文件：用于处理文件夹节点与资源项在树结构中的移动、复制、重新挂载、循环嵌套校验以及排序位置调整等逻辑。

export function reorderFolderCore(folderId, newParentId, insertBeforeId, deps) {
  const oldParentId = deps.config.folders[folderId]?.parentId || null;
  deps.config.folders[folderId].parentId = newParentId;

  // 确保子文件夹有 displayName（如果没有，从当前标签名中提取短名称）
  if (!deps.config.folders[folderId].displayName) {
    const fullName = deps.getFullTagName(folderId);
    const lastDash = fullName.lastIndexOf("-");
    if (lastDash >= 0 && oldParentId) {
      deps.config.folders[folderId].displayName = fullName.substring(
        lastDash + 1,
      );
    } else {
      deps.config.folders[folderId].displayName = fullName;
    }
  }

  const siblings = deps.getChildFolders(newParentId);
  const others = deps.sortFolders(siblings.filter((id) => id !== folderId));
  let insertIdx = others.length;
  if (insertBeforeId) {
    const idx = others.indexOf(insertBeforeId);
    if (idx >= 0) insertIdx = idx;
  }
  if (!newParentId && !insertBeforeId) {
    deps.config.folders[folderId].sortOrder = 0;
  }
  others.splice(insertIdx, 0, folderId);
  others.forEach((id, i) => {
    deps.config.folders[id].sortOrder = i + 1;
  });
  deps.saveConfig(deps.config);

  // 父级变化时，递归重建标签名
  if (oldParentId !== newParentId) {
    deps.recursiveRebuildTagNames(folderId);
  }
}

export function reorderResFolderCore(
  type,
  folderId,
  newParentId,
  insertBeforeId,
  deps,
) {
  const tree = deps.getResFolderTree(type);
  tree[folderId].parentId = newParentId;
  const siblings = deps.getResChildFolders(type, newParentId);
  const others = deps.sortResFolders(
    type,
    siblings.filter((id) => id !== folderId),
  );
  let insertIdx = others.length;
  if (insertBeforeId) {
    const idx = others.indexOf(insertBeforeId);
    if (idx >= 0) insertIdx = idx;
  }
  if (!newParentId && !insertBeforeId) {
    tree[folderId].sortOrder = 0;
  }
  others.splice(insertIdx, 0, folderId);
  others.forEach((id, i) => {
    tree[id].sortOrder = i + 1;
  });
  deps.saveResTree(type);
}
