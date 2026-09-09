// 排序快照层：承接拖拽排序或资源重排前后的快照记录、差异计算与必要的回滚辅助。

export function takeSortSnapshotCore(deps) {
  if (deps.getSortSnapshot()) return;

  const snapshot = {};
  for (const id of deps.getFolderTagIds()) {
    snapshot[id] = deps.config.folders[id]?.sortOrder ?? 0;
  }
  deps.setSortSnapshot(snapshot);
}

export function revertSortCore(deps) {
  const snapshot = deps.getSortSnapshot();
  if (!snapshot) return;

  for (const id of Object.keys(snapshot)) {
    if (deps.config.folders[id]) {
      deps.config.folders[id].sortOrder = snapshot[id];
    }
  }
  deps.saveConfig(deps.config);
  deps.setSortSnapshot(null);
  deps.setSortDirty(false);
  deps.setRightCharSortMode(null);
}

export function takeResSortSnapshotCore(type, deps) {
  if (deps.getSnapshot(type)) return;

  const tree = deps.getResFolderTree(type);
  const snapshot = {};
  for (const id of Object.keys(tree)) {
    snapshot[id] = tree[id]?.sortOrder ?? 0;
  }
  deps.setSnapshot(type, snapshot);
}

export function revertResSortCore(type, deps) {
  const snapshot = deps.getSnapshot(type);
  if (!snapshot) return;

  const tree = deps.getResFolderTree(type);
  for (const id of Object.keys(snapshot)) {
    if (tree[id]) tree[id].sortOrder = snapshot[id];
  }

  deps.saveResTree(type);
  deps.setSnapshot(type, null);
  deps.setSortDirty(type, false);
  deps.setRightSortMode(type, null);
}
