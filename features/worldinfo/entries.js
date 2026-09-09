// 世界书条目详情层：承接世界书条目展开状态、排序、读取保存、激活、复制、删除与批量操作；大型列表渲染暂保留在 index.js 以降低 UI 回归风险。

export function createWorldInfoEntriesApiCore(deps) {
  const getState = () => deps.state;

  function refreshWorldInfoPanelView() {
    const q = String(deps.$("#cfm-worldinfo-global-search").val() || "").trim();
    if (q) deps.executeWorldInfoSearch();
    else deps.renderWorldInfoView();
  }

  function getWorldInfoEntrySelectionKey(bookName, uid) {
    return `${String(bookName || "")}::${String(uid ?? "")}`;
  }

  function getWorldInfoEntryOpenSet(bookName, create = false) {
    const normalizedName = String(bookName || "");
    if (!normalizedName) return null;
    const state = getState();
    let openSet = state.cfmWorldInfoEntryOpenDetails.get(normalizedName);
    if (!openSet && create) {
      openSet = new Set();
      state.cfmWorldInfoEntryOpenDetails.set(normalizedName, openSet);
    }
    return openSet || null;
  }

  function isWorldInfoEntryDetailOpen(bookName, uid) {
    return !!getWorldInfoEntryOpenSet(bookName)?.has(String(uid ?? ""));
  }

  function toggleWorldInfoEntryDetail(bookName, uid) {
    const normalizedName = String(bookName || "");
    const normalizedUid = String(uid ?? "");
    if (!normalizedName || !normalizedUid) return false;
    const state = getState();
    const openSet = getWorldInfoEntryOpenSet(normalizedName, true);
    const willOpen = !openSet.has(normalizedUid);
    openSet.clear();
    if (willOpen) {
      openSet.add(normalizedUid);
    } else {
      state.cfmWorldInfoEntryOpenDetails.delete(normalizedName);
    }
    return willOpen;
  }

  function collapseWorldInfoEntryDetails(bookName = null) {
    const state = getState();
    if (bookName === null || bookName === undefined) {
      state.cfmWorldInfoEntryOpenDetails.clear();
      return;
    }
    state.cfmWorldInfoEntryOpenDetails.delete(String(bookName || ""));
  }

  async function fetchWorldInfoDetailData(bookName) {
    const normalizedName = String(bookName || "");
    if (!normalizedName) return null;
    const resp = await deps.fetch("/api/worldinfo/get", {
      method: "POST",
      headers: deps.getContext().getRequestHeaders(),
      body: JSON.stringify({ name: normalizedName }),
    });
    if (!resp.ok) {
      throw new Error(`获取世界书「${normalizedName}」失败`);
    }
    return await resp.json();
  }

  async function saveWorldInfoDetailData(bookName, worldInfoData) {
    const normalizedName = String(bookName || "");
    const ctx = deps.getContext();
    const resp = await deps.fetch("/api/worldinfo/edit", {
      method: "POST",
      headers: ctx.getRequestHeaders(),
      body: JSON.stringify({ name: normalizedName, data: worldInfoData }),
    });
    if (!resp.ok) {
      throw new Error(`保存世界书「${normalizedName}」失败`);
    }

    try {
      if (typeof ctx.saveWorldInfo === "function") {
        await ctx.saveWorldInfo(normalizedName, worldInfoData, true);
      }
    } catch (e) {
      deps.console.warn("[CFM] 同步世界书内存缓存失败", e);
    }

    try {
      if (typeof ctx.reloadWorldInfoEditor === "function") {
        ctx.reloadWorldInfoEditor(normalizedName, true);
      }
    } catch (e) {
      deps.console.warn("[CFM] 刷新原生世界书编辑器失败", e);
    }
  }

  function getWorldInfoEntryDetailSortMode() {
    deps.ensureResourceSettings();
    const mode = String(
      deps.extensionSettings[deps.extensionName].worldInfoEntryDetailSortMode ||
        "custom",
    );
    return mode === "priority" ? "priority" : "custom";
  }

  function setWorldInfoEntryDetailSortMode(mode) {
    deps.ensureResourceSettings();
    deps.extensionSettings[deps.extensionName].worldInfoEntryDetailSortMode =
      mode === "priority" ? "priority" : "custom";
    deps.saveSettingsDebounced();
  }

  function sortWorldInfoEntriesForDetail(entries, sortMode = "custom") {
    const normalizedEntries = Array.isArray(entries) ? Array.from(entries) : [];
    const normalizedMode =
      String(sortMode || "custom") === "priority" ? "priority" : "custom";

    const secondarySort = (a, b) =>
      Number(b?.order ?? 0) - Number(a?.order ?? 0);
    const tertiarySort = (a, b) => Number(a?.uid ?? 0) - Number(b?.uid ?? 0);

    return normalizedEntries.sort((a, b) => {
      let primaryResult;
      if (normalizedMode === "priority") {
        const aValue = a?.enabled === false ? 2 : a?.constant ? 0 : 1;
        const bValue = b?.enabled === false ? 2 : b?.constant ? 0 : 1;
        primaryResult = aValue - bValue;
      } else {
        primaryResult =
          Number(a?.displayIndex ?? Number.MAX_SAFE_INTEGER) -
          Number(b?.displayIndex ?? Number.MAX_SAFE_INTEGER);
      }
      return primaryResult || secondarySort(a, b) || tertiarySort(a, b);
    });
  }

  function getWorldInfoEntriesForDetail(
    bookName,
    worldInfoData,
    sortMode = "custom",
  ) {
    const entryMap =
      worldInfoData?.entries && typeof worldInfoData.entries === "object"
        ? worldInfoData.entries
        : {};
    return sortWorldInfoEntriesForDetail(
      Object.values(entryMap)
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => {
          const uid = String(entry.uid ?? entry.id ?? "");
          const primaryKeys = Array.isArray(entry.key)
            ? entry.key.map((item) => String(item || "")).filter(Boolean)
            : [];
          const secondaryKeys = Array.isArray(entry.keysecondary)
            ? entry.keysecondary
                .map((item) => String(item || ""))
                .filter(Boolean)
            : [];
          const label = String(
            entry.comment || primaryKeys[0] || `条目 ${uid || "未命名"}`,
          );
          return {
            bookName: String(bookName || ""),
            uid,
            label,
            comment: String(entry.comment || ""),
            content: String(entry.content || ""),
            primaryKeys,
            secondaryKeys,
            order: Number(entry.order ?? 0),
            displayIndex: Number(entry.displayIndex ?? Number.MAX_SAFE_INTEGER),
            depth: Number(entry.depth ?? 0),
            constant: !!entry.constant,
            enabled: !entry.disable,
            raw: entry,
          };
        }),
      sortMode,
    );
  }

  function toggleWorldInfoEntryBatchItem(bookName, uid, shiftKey, entries) {
    const normalizedUid = String(uid ?? "");
    if (!normalizedUid) return;
    const state = getState();
    const normalizedEntries = Array.isArray(entries) ? entries : [];
    const visibleKeys = normalizedEntries
      .map((entry) => getWorldInfoEntrySelectionKey(bookName, entry?.uid))
      .filter((key) => !key.endsWith("::"));
    const normalizedKey = getWorldInfoEntrySelectionKey(
      bookName,
      normalizedUid,
    );

    if (
      (shiftKey || state.cfmWorldInfoEntryBatchRangeMode) &&
      state.cfmWorldInfoEntryBatchLastClicked
    ) {
      const lastIdx = visibleKeys.indexOf(state.cfmWorldInfoEntryBatchLastClicked);
      const curIdx = visibleKeys.indexOf(normalizedKey);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        for (let i = start; i <= end; i++) {
          if (visibleKeys[i]) state.cfmWorldInfoEntryBatchSelected.add(visibleKeys[i]);
        }
      }
    } else if (state.cfmWorldInfoEntryBatchSelected.has(normalizedKey)) {
      state.cfmWorldInfoEntryBatchSelected.delete(normalizedKey);
    } else {
      state.cfmWorldInfoEntryBatchSelected.add(normalizedKey);
    }

    state.cfmWorldInfoEntryBatchLastClicked = normalizedKey;
  }

  async function toggleWorldInfoEntryActivation(bookName, uid, activate) {
    const normalizedName = String(bookName || "");
    const normalizedUid = String(uid ?? "");
    if (!normalizedName || !normalizedUid) return false;

    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    const targetEntry = worldInfoData?.entries?.[normalizedUid];
    if (!targetEntry) {
      throw new Error(`找不到世界书条目 UID=${normalizedUid}`);
    }

    targetEntry.disable = !activate;
    targetEntry.enabled = activate;
    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    return true;
  }

  async function duplicateWorldInfoEntryInBook(bookName, uid) {
    const normalizedName = String(bookName || "");
    const normalizedUid = String(uid ?? "");
    if (!normalizedName || !normalizedUid) return null;

    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    if (!worldInfoData?.entries?.[normalizedUid]) {
      throw new Error(`找不到世界书条目 UID=${normalizedUid}`);
    }

    const originalEntry = structuredClone(worldInfoData.entries[normalizedUid]);
    delete originalEntry.uid;

    const existingComments = new Set(
      Object.values(worldInfoData.entries)
        .filter((e) => e && typeof e === "object")
        .map((e) => String(e.comment || "")),
    );
    const baseComment = String(originalEntry.comment || "").trim();
    if (baseComment) {
      let newComment = `${baseComment} 副本`;
      let idx = 2;
      while (existingComments.has(newComment)) {
        newComment = `${baseComment} 副本${idx}`;
        idx++;
      }
      originalEntry.comment = newComment;
    }

    const existingUids = Object.keys(worldInfoData.entries)
      .map(Number)
      .filter((n) => !isNaN(n));
    const newUid = existingUids.length > 0 ? Math.max(...existingUids) + 1 : 0;

    const newEntry = { ...originalEntry, uid: newUid };
    worldInfoData.entries[newUid] = newEntry;

    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    return newEntry;
  }

  async function deleteWorldInfoEntryInBook(
    bookName,
    uid,
    { silent = false } = {},
  ) {
    const normalizedName = String(bookName || "");
    const normalizedUid = String(uid ?? "");
    if (!normalizedName || !normalizedUid) return false;

    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    if (!worldInfoData?.entries?.[normalizedUid]) {
      throw new Error(`找不到世界书条目 UID=${normalizedUid}`);
    }

    if (!silent) {
      const entry = worldInfoData.entries[normalizedUid];
      const entryLabel =
        entry?.comment || (entry?.key || [])[0] || `UID ${normalizedUid}`;
      const confirmed = deps.cfmConfirm(
        `确定要删除条目「${entryLabel}」吗？\n此操作不可撤销！`,
      );
      if (!confirmed) return false;
    }

    delete worldInfoData.entries[normalizedUid];

    if (
      worldInfoData.originalData &&
      Array.isArray(worldInfoData.originalData.entries)
    ) {
      const originalIndex = worldInfoData.originalData.entries.findIndex(
        (e) => e?.uid == normalizedUid,
      );
      if (originalIndex !== -1) {
        worldInfoData.originalData.entries.splice(originalIndex, 1);
      }
    }

    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    return true;
  }

  async function batchDuplicateWorldInfoEntries(bookName, selectionKeys) {
    const normalizedName = String(bookName || "");
    const prefix = `${normalizedName}::`;
    const targetUids = Array.from(
      new Set(
        (Array.isArray(selectionKeys) ? selectionKeys : [])
          .map((key) => String(key || ""))
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length))
          .filter(Boolean),
      ),
    );
    if (!targetUids.length) {
      deps.cfmToastr.warning("请先选择要复制的世界书条目");
      return 0;
    }

    const batchProgress = deps.showBatchProgressOverlay(
      "正在批量复制世界书条目",
      targetUids.length,
    );
    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    const existingUids = Object.keys(worldInfoData.entries)
      .map(Number)
      .filter((n) => !isNaN(n));
    let nextUid = existingUids.length > 0 ? Math.max(...existingUids) + 1 : 0;
    let duplicatedCount = 0;
    let processed = 0;

    for (const uid of targetUids) {
      const entry = worldInfoData?.entries?.[uid];
      if (!entry) {
        processed++;
        batchProgress.update(processed);
        continue;
      }
      const cloned = structuredClone(entry);
      delete cloned.uid;
      cloned.uid = nextUid;
      worldInfoData.entries[nextUid] = cloned;
      nextUid++;
      duplicatedCount++;
      processed++;
      batchProgress.update(processed);
    }

    if (!duplicatedCount) {
      batchProgress.remove();
      deps.cfmToastr.warning("所选条目不支持复制操作");
      return 0;
    }

    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    const copyMsg = `已复制 ${duplicatedCount} 个世界书条目`;
    batchProgress.done(copyMsg);
    deps.cfmToastr.success(copyMsg);
    refreshWorldInfoPanelView();
    return duplicatedCount;
  }

  async function moveWorldInfoEntriesToIndex(bookName, selectionKeys, targetIndex) {
    const normalizedName = String(bookName || "");
    const prefix = `${normalizedName}::`;
    const targetUids = Array.from(
      new Set(
        (Array.isArray(selectionKeys) ? selectionKeys : [])
          .map((key) => String(key || ""))
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length))
          .filter(Boolean),
      ),
    );
    if (!targetUids.length) {
      deps.cfmToastr.warning("请先选择要移动的世界书条目");
      return false;
    }
    const normalizedTargetIndex = Number.isInteger(targetIndex)
      ? targetIndex
      : null;
    if (normalizedTargetIndex === null || normalizedTargetIndex < 0) {
      deps.cfmToastr.warning("移动目标位置无效");
      return false;
    }

    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    if (!worldInfoData?.entries || typeof worldInfoData.entries !== "object") {
      deps.cfmToastr.error(`无法获取世界书「${normalizedName}」的数据`);
      return false;
    }

    const sortMode = getWorldInfoEntryDetailSortMode();
    // 仅自定义排序模式支持重排（displayIndex 控制顺序）；优先级模式按 order 排序，不支持换位置
    if (sortMode !== "custom") {
      deps.cfmToastr.warning(
        "当前为“优先级”排序模式，请先切换到“自定义”排序再移动条目位置",
      );
      return false;
    }

    // 按当前可见顺序取条目，切出选中项后按目标索引插入，最后重写 displayIndex
    const visibleEntries = getWorldInfoEntriesForDetail(
      normalizedName,
      worldInfoData,
      sortMode,
    );
    const selectedUidSet = new Set(targetUids);
    const selectedEntries = visibleEntries.filter((entry) =>
      selectedUidSet.has(entry.uid),
    );
    const remainingEntries = visibleEntries.filter(
      (entry) => !selectedUidSet.has(entry.uid),
    );
    if (!selectedEntries.length) {
      deps.cfmToastr.warning("未找到可移动的世界书条目");
      return false;
    }

    const clampedTargetIndex = Math.max(
      0,
      Math.min(normalizedTargetIndex, remainingEntries.length),
    );
    const reorderedEntries = Array.from(remainingEntries);
    reorderedEntries.splice(clampedTargetIndex, 0, ...selectedEntries);

    // 与原顺序比对，无变化则跳过保存
    const orderChanged =
      visibleEntries.length === reorderedEntries.length &&
      visibleEntries.some(
        (entry, index) => String(reorderedEntries[index]?.uid) !== String(entry?.uid),
      );
    if (!orderChanged) {
      deps.cfmToastr.info("所选条目已在目标位置");
      return false;
    }

    // 重写所有条目的 displayIndex 并写回原始 entries
    reorderedEntries.forEach((entry, index) => {
      const rawEntry = worldInfoData.entries[entry.uid];
      if (rawEntry && typeof rawEntry === "object") {
        rawEntry.displayIndex = index;
      }
    });

    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    deps.cfmToastr.success(
      `已移动 ${selectedEntries.length} 个世界书条目到新位置`,
    );
    refreshWorldInfoPanelView();
    return true;
  }

  async function batchDeleteWorldInfoEntries(bookName, selectionKeys) {
    const normalizedName = String(bookName || "");
    const prefix = `${normalizedName}::`;
    const targetUids = Array.from(
      new Set(
        (Array.isArray(selectionKeys) ? selectionKeys : [])
          .map((key) => String(key || ""))
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length))
          .filter(Boolean),
      ),
    );
    if (!targetUids.length) {
      deps.cfmToastr.warning("请先选择要删除的世界书条目");
      return 0;
    }

    const confirmed = deps.cfmConfirm(
      `确定要删除选中的 ${targetUids.length} 个条目吗？\n此操作不可撤销！`,
    );
    if (!confirmed) return 0;

    const batchProgress = deps.showBatchProgressOverlay(
      "正在批量删除世界书条目",
      targetUids.length,
    );
    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    let deletedCount = 0;
    let processed = 0;

    for (const uid of targetUids) {
      if (!worldInfoData?.entries?.[uid]) {
        processed++;
        batchProgress.update(processed);
        continue;
      }
      delete worldInfoData.entries[uid];
      if (
        worldInfoData.originalData &&
        Array.isArray(worldInfoData.originalData.entries)
      ) {
        const originalIndex = worldInfoData.originalData.entries.findIndex(
          (e) => e?.uid == uid,
        );
        if (originalIndex !== -1) {
          worldInfoData.originalData.entries.splice(originalIndex, 1);
        }
      }
      deletedCount++;
      processed++;
      batchProgress.update(processed);
    }

    if (!deletedCount) {
      batchProgress.remove();
      deps.cfmToastr.warning("所选条目不支持删除操作");
      return 0;
    }

    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    const delMsg = `已删除 ${deletedCount} 个世界书条目`;
    batchProgress.done(delMsg);
    deps.cfmToastr.success(delMsg);
    refreshWorldInfoPanelView();
    return deletedCount;
  }

  async function applyWorldInfoEntryBatchActivation(
    bookName,
    selectionKeys,
    activate,
  ) {
    const normalizedName = String(bookName || "");
    const prefix = `${normalizedName}::`;
    const targetUids = Array.from(
      new Set(
        (Array.isArray(selectionKeys) ? selectionKeys : [])
          .map((key) => String(key || ""))
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length))
          .filter(Boolean),
      ),
    );
    if (!targetUids.length) {
      deps.cfmToastr.warning("请先选择要操作的世界书条目");
      return;
    }

    const worldInfoData = await fetchWorldInfoDetailData(normalizedName);
    let changedCount = 0;
    for (const uid of targetUids) {
      const entry = worldInfoData?.entries?.[uid];
      if (!entry) continue;
      entry.disable = !activate;
      entry.enabled = activate;
      changedCount++;
    }

    if (!changedCount) {
      deps.cfmToastr.warning("所选条目不支持批量激活操作");
      return;
    }

    await saveWorldInfoDetailData(normalizedName, worldInfoData);
    deps.cfmToastr.success(
      `已${activate ? "激活" : "取消激活"} ${changedCount} 个世界书条目`,
    );
    refreshWorldInfoPanelView();
  }

  return {
    refreshWorldInfoPanelView,
    getWorldInfoEntrySelectionKey,
    getWorldInfoEntryOpenSet,
    isWorldInfoEntryDetailOpen,
    toggleWorldInfoEntryDetail,
    collapseWorldInfoEntryDetails,
    fetchWorldInfoDetailData,
    saveWorldInfoDetailData,
    getWorldInfoEntryDetailSortMode,
    setWorldInfoEntryDetailSortMode,
    sortWorldInfoEntriesForDetail,
    getWorldInfoEntriesForDetail,
    toggleWorldInfoEntryBatchItem,
    toggleWorldInfoEntryActivation,
    duplicateWorldInfoEntryInBook,
    deleteWorldInfoEntryInBook,
    batchDuplicateWorldInfoEntries,
    batchDeleteWorldInfoEntries,
    moveWorldInfoEntriesToIndex,
    applyWorldInfoEntryBatchActivation,
  };
}
