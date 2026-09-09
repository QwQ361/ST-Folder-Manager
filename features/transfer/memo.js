// 缝合备忘录数据层：承接缝合备忘录（entryTransferMemo）的读取、增删改查、收藏、备注、
// 摘要生成与持久化；不负责渲染（渲染在 memo-view.js）与互通执行（执行在 entries.js）。
// 依赖注入：$、extensionName、extensionSettings、saveSettingsDebounced、ensureSettings、escapeHtml。

export function createEntryTransferMemoApiCore(deps) {
  const {
    extensionName,
    extensionSettings,
    saveSettingsDebounced,
    ensureSettings,
  } = deps;

  function ensureMemoState() {
    ensureSettings();
    const settings = extensionSettings[extensionName];
    if (
      !settings.entryTransferMemo ||
      !Array.isArray(settings.entryTransferMemo.groups)
    ) {
      settings.entryTransferMemo = { groups: [] };
    }
    return settings.entryTransferMemo;
  }

  function getEntryTransferMemoGroups() {
    return ensureMemoState().groups;
  }

  function saveMemo() {
    saveSettingsDebounced();
  }

  /**
   * 新增临时组（favorite: false），返回组 id
   */
  function addEntryTransferMemoGroup({
    sourceType,
    sourceName,
    entries,
    note = "",
  }) {
    const groups = getEntryTransferMemoGroups();
    const id = `memo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    groups.push({
      id,
      favorite: false,
      note: String(note || ""),
      sourceType: sourceType === "worldinfo" ? "worldinfo" : "preset",
      sourceName: String(sourceName || ""),
      createdAt: Date.now(),
      entries: Array.isArray(entries) ? entries : [],
    });
    saveMemo();
    return id;
  }

  /**
   * 更新组（patch: { note?, favorite?, entries? }）
   */
  function updateEntryTransferMemoGroup(id, patch = {}) {
    const groups = getEntryTransferMemoGroups();
    const group = groups.find((g) => g.id === id);
    if (!group) return false;
    if (patch.note !== undefined) group.note = String(patch.note || "");
    if (patch.favorite !== undefined) group.favorite = !!patch.favorite;
    if (patch.entries !== undefined)
      group.entries = Array.isArray(patch.entries)
        ? patch.entries
        : group.entries;
    saveMemo();
    return true;
  }

  function deleteEntryTransferMemoGroup(id) {
    const groups = getEntryTransferMemoGroups();
    const idx = groups.findIndex((g) => g.id === id);
    if (idx < 0) return false;
    groups.splice(idx, 1);
    saveMemo();
    return true;
  }

  /**
   * 内部：将 source 组克隆一份副本（新 id、新 createdAt），按 favorite 指定收藏状态。
   * 副本拥有独立的 note 字符串与 entries 数组（浅拷贝元素），不与原组共享引用。
   * @returns {string} 新组 id
   */
  function cloneGroupInto(source, favorite) {
    const groups = getEntryTransferMemoGroups();
    const newId = `memo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    groups.push({
      id: newId,
      favorite: !!favorite,
      note: String(source.note || ""),
      sourceType: source.sourceType === "worldinfo" ? "worldinfo" : "preset",
      sourceName: String(source.sourceName || ""),
      createdAt: Date.now(),
      entries: Array.isArray(source.entries)
        ? source.entries.map((e) => ({ ...e }))
        : [],
    });
    saveMemo();
    return newId;
  }

  /**
   * 将组复制一份副本到临时区（原组保持不变）。
   * @returns {string|null} 新临时组 id；原组不存在返回 null。
   */
  function copyEntryTransferMemoGroupToPending(id) {
    const source = getEntryTransferMemoGroups().find((g) => g.id === id);
    if (!source) return null;
    return cloneGroupInto(source, false);
  }

  /**
   * 将组复制一份副本到收藏区（原组保持不变）。
   * @returns {string|null} 新收藏组 id；原组不存在返回 null。
   */
  function copyEntryTransferMemoGroupToFavorite(id) {
    const source = getEntryTransferMemoGroups().find((g) => g.id === id);
    if (!source) return null;
    return cloneGroupInto(source, true);
  }

  /**
   * 生成摘要文本：如 "条目1~条目4 by 预设A"。
   * - 1 条：显示条目名
   * - 2 条：显示 "条目1 ~ 条目2"
   * - 超过 2 条：显示 "条目1 ~ 条目N"
   * 后接 "by 来源"。
   */
  function getEntryTransferMemoSummary(group) {
    const entries = Array.isArray(group?.entries) ? group.entries : [];
    const names = entries
      .map((e) => String(e?.name || "").trim())
      .filter(Boolean);
    const sourceLabel = group?.sourceType === "worldinfo" ? "世界书" : "预设";
    const sourceName = String(group?.sourceName || "");
    let head = "";
    if (names.length === 0) {
      head = `(空条目组)`;
    } else if (names.length === 1) {
      head = names[0];
    } else {
      head = `${names[0]} ~ ${names[names.length - 1]}`;
    }
    const byPart = sourceName ? ` by ${sourceName}` : "";
    return `${head}${byPart}`;
  }

  /**
   * 临时区未缝合组数量（供红点角标）
   */
  function getPendingTransferMemoCount() {
    return getEntryTransferMemoGroups().filter((g) => !g.favorite).length;
  }

  /**
   * 供弹窗渲染的只读快照（含摘要），避免视图层直接依赖内部结构。
   */
  function getEntryTransferMemoGroupsSnapshot() {
    return getEntryTransferMemoGroups().map((group) => ({
      ...group,
      summary: getEntryTransferMemoSummary(group),
    }));
  }

  /**
   * 缝合完成后移除临时组（收藏组保留），返回被移除的组 id 列表。
   */
  function removePendingTransferMemoGroups(groupIds) {
    const groups = getEntryTransferMemoGroups();
    const idSet = new Set(Array.isArray(groupIds) ? groupIds : []);
    const removed = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (idSet.has(g.id) && !g.favorite) {
        removed.push(g.id);
        groups.splice(i, 1);
      }
    }
    if (removed.length > 0) saveMemo();
    return removed;
  }

  return {
    addEntryTransferMemoGroup,
    copyEntryTransferMemoGroupToFavorite,
    copyEntryTransferMemoGroupToPending,
    deleteEntryTransferMemoGroup,
    getEntryTransferMemoGroups,
    getEntryTransferMemoGroupsSnapshot,
    getEntryTransferMemoSummary,
    getPendingTransferMemoCount,
    removePendingTransferMemoGroups,
    updateEntryTransferMemoGroup,
  };
}
