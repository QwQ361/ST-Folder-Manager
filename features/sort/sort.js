// 排序业务层：承接角色卡与各资源列表的排序规则、排序字段应用和排序后持久化调度。

export function applySortToFoldersCore(folderIds, mode, deps) {
  deps.takeSortSnapshot();

  const sorted = [...folderIds].sort((a, b) => {
    const nameA = deps.getTagName(a);
    const nameB = deps.getTagName(b);
    const cmp = nameA.localeCompare(nameB, "zh-CN");
    return mode === "az" ? cmp : -cmp;
  });

  sorted.forEach((id, i) => {
    deps.config.folders[id].sortOrder = i + 1;
  });

  deps.saveConfig(deps.config);
  deps.setSortDirty(true);
}

export function applyResSortToFoldersCore(type, folderIds, mode, deps) {
  deps.takeResSortSnapshot(type);

  const tree = deps.getResFolderTree(type);
  const sorted = [...folderIds].sort((a, b) => {
    const cmp = a.localeCompare(b, "zh-CN");
    return mode === "az" ? cmp : -cmp;
  });

  sorted.forEach((id, i) => {
    tree[id].sortOrder = i + 1;
  });

  deps.saveResTree(type);
  deps.setSortDirty(type, true);
}

export function sortResItemsCore(items, mode, getName) {
  return [...items].sort((a, b) => {
    const nameA = getName
      ? getName(a)
      : typeof a === "string"
        ? a
        : a.name || "";
    const nameB = getName
      ? getName(b)
      : typeof b === "string"
        ? b
        : b.name || "";
    const cmp = nameA.localeCompare(nameB, "zh-CN");
    return mode === "az" ? cmp : -cmp;
  });
}
