// 预设/世界书条目互通：承接条目收集、目标选择、插入位置、进度提示、完成跳转与实际写入流程。

export function createEntryTransferApiCore(deps) {
  const {
    $,
    beginSuppressPresetRegexToast,
    buildDuplicatedPresetPromptKey,
    cfmToastr,
    document,
    endSuppressPresetRegexToast,
    ensurePresetPromptList,
    ensureSettings,
    escapeHtml,
    extensionName,
    extensionSettings,
    fetchWorldInfoDetailData,
    findPresetSelectValueByName,
    getContext,
    getCurrentPresets,
    getCurrentResourceType,
    getEntryTransferPostActionMode: injectedGetEntryTransferPostActionMode,
    getPresetDataForDetail,
    getPresetDetailExpandedNames,
    getPresetDetailFields,
    getPresetPromptByKey,
    getPresetPromptIdentifier,
    getResFolderDisplayName,
    getResFolderPath,
    getResFolderTree,
    getResourceGroups,
    getWorldInfoEntriesForDetail,
    getWorldInfoEntryDetailSortMode,
    getWorldInfoEntryExpandedNames,
    getWorldInfoEntrySelectionKey,
    getWorldInfoExpandedNodes,
    getWorldInfoNames,
    memoApi,
    refreshPresetPanelView,
    renderHeaderMemoBadge,
    renderPresetsView,
    renderWorldInfoView,
    saveNormalizedPresetData,
    savePresetDetailPromptOrder,
    saveWorldInfoDetailData,
    scrollElementIntoViewCentered,
    scrollWorldInfoRowIntoView,
    setCurrentResourceType,
    setPresetPromptEnabled,
    setSelectedPresetFolder,
    setSelectedWorldInfoFolder,
    setWorldInfoEntryLastFocusedName,
    structuredClone = globalThis.structuredClone,
  } = deps;

  async function showEntryTransferPopup(sourceType, sourceName, selectedKeys) {
    if (!selectedKeys || selectedKeys.length === 0) {
      cfmToastr.warning("请先选择要互通的条目");
      return;
    }

    // ── 收集源条目数据 ──
    const collected = await collectSourceEntries(
      sourceType,
      sourceName,
      selectedKeys,
    );
    if (collected.error) {
      cfmToastr.error(collected.error);
      return;
    }
    const sourceEntries = collected.sourceEntries;
    if (sourceEntries.length === 0) {
      cfmToastr.warning("未找到可互通的条目数据");
      return;
    }

    // ── 第一步：询问现在就缝合，还是存入缝合备忘录（在选目标之前）──
    const decision = await askEntryTransferNowOrLater(sourceEntries.length);
    if (!decision) return;

    if (decision === "later") {
      // 选"存入"：询问备注后存入备忘录（不选目标）
      const noteResult = await askEntryTransferMemoNote(sourceEntries.length);
      if (!noteResult) return false;
      deps.memoApi.addEntryTransferMemoGroup({
        sourceType,
        sourceName,
        entries: sourceEntries,
        note: noteResult.note || "",
      });
      deps.renderHeaderMemoBadge?.();
      cfmToastr.success(
        `已存入缝合备忘录${noteResult.note ? "（含备注）" : ""}`,
      );
      return true;
    }

    // 选"现在缝合"：进入选择目标
    const targetResult = await openEntryTransferTargetDialog(
      sourceType,
      sourceName,
      sourceEntries,
      {
        title: `条目互通 (${sourceEntries.length} 个条目)`,
        confirmLabel: "确认互通",
      },
    );
    if (!targetResult) return false;

    try {
      const transferResult = await executeEntryTransfer(
        sourceType,
        sourceName,
        sourceEntries,
        targetResult.targetType,
        targetResult.targetName,
      );
      return transferResult ? true : false;
    } catch (err) {
      console.error("[CFM] 条目互通失败:", err);
      cfmToastr.error(`互通失败: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * 收集源条目数据（预设按 selectedKeys[fieldKey] / 世界书按 selectedKeys["bookName::uid"]）。
   * 供互通主流程与"缝合备忘录收藏组更新检测"复用。
   * @returns {Promise<{sourceEntries:Array, error?:string}>}
   */
  async function collectSourceEntries(sourceType, sourceName, selectedKeys) {
    const sourceEntries = [];
    if (sourceType === "preset") {
      const pm = getContext().getPresetManager();
      if (!pm) {
        return { sourceEntries, error: "无法获取预设管理器" };
      }
      const presetData = getPresetDataForDetail(pm, sourceName);
      if (!presetData) {
        return { sourceEntries, error: `找不到预设「${sourceName}」` };
      }
      const fields = getPresetDetailFields(presetData);
      for (const key of selectedKeys) {
        const field = fields.find((f) => f.key === key);
        if (field) {
          const promptKey = key.startsWith("prompts.")
            ? key.slice("prompts.".length)
            : key;
          const promptObj = getPresetPromptByKey(presetData, promptKey);
          sourceEntries.push({
            name: field.label || promptKey,
            content:
              typeof promptObj === "object"
                ? (promptObj.content ?? promptObj.prompt ?? "")
                : String(promptObj ?? ""),
            role:
              typeof promptObj === "object"
                ? promptObj.role || "system"
                : "system",
            enabled: field.enabled !== false,
            rawPrompt: promptObj,
            fieldKey: key,
          });
        }
      }
    } else if (sourceType === "worldinfo") {
      // selectedKeys 格式: "bookName::uid"
      const wiData = await fetchWorldInfoDetailData(sourceName);
      if (!wiData?.entries) {
        return {
          sourceEntries,
          error: `无法获取世界书「${sourceName}」的数据`,
        };
      }
      const entriesMap = new Map();
      for (const [uid, entry] of Object.entries(wiData.entries)) {
        entriesMap.set(getWorldInfoEntrySelectionKey(sourceName, uid), {
          ...entry,
          uid,
        });
      }
      for (const key of selectedKeys) {
        const entry = entriesMap.get(key);
        if (entry) {
          sourceEntries.push({
            name:
              entry.comment ||
              (Array.isArray(entry.key)
                ? entry.key[0]
                : String(entry.key || "")) ||
              `条目${entry.uid}`,
            content: entry.content || "",
            enabled: entry.disable !== true,
            rawEntry: entry,
          });
        }
      }
    }
    return { sourceEntries };
  }

  /**
   * 获取可选预设名称列表（供"快速更新"选择新旧预设）。
   */
  function getPresetQuickUpdateOptions() {
    return getCurrentPresets()
      .map((p) => String(p?.name || ""))
      .filter(Boolean);
  }

  /**
   * 对比旧预设（已缝合）与新预设（作者更新），识别旧预设中"缝合的条目"。
   * 匹配规则：旧预设中名称在新预设中不存在的条目视为缝合条目；
   * 按旧预设显示顺序分组，每组记录锚点（前一个与新预设同名的作者条目）。
   * @returns {Promise<{blocks:Array, oldTotal:number, newTotal:number, authorCount:number, stitchedCount:number, error?:string}>}
   *   blocks: [{ anchorName, anchorKey, fieldKeys, entries }]
   */
  async function analyzePresetQuickUpdate(oldPresetName, newPresetName) {
    const pm = getContext().getPresetManager();
    if (!pm) return { error: "无法获取预设管理器" };
    const oldData = getPresetDataForDetail(pm, oldPresetName);
    if (!oldData) return { error: `找不到旧预设「${oldPresetName}」` };
    const newData = getPresetDataForDetail(pm, newPresetName);
    if (!newData) return { error: `找不到新预设「${newPresetName}」` };

    const oldFields = getPresetDetailFields(oldData).filter((f) =>
      String(f?.key || "").startsWith("prompts."),
    );
    const newFields = getPresetDetailFields(newData).filter((f) =>
      String(f?.key || "").startsWith("prompts."),
    );
    if (oldFields.length === 0) return { error: "旧预设没有可对比的条目" };
    if (newFields.length === 0) return { error: "新预设没有可对比的条目" };

    // 新预设的名称集合：用于识别旧预设中的"作者条目"（锚点）
    const newNameSet = new Set(
      newFields.map((f) => String(f?.label || "").trim()).filter(Boolean),
    );

    const blocks = [];
    let currentAnchorName = null;
    let currentAnchorKey = null;
    let currentBlock = null;
    let authorCount = 0;
    let stitchedCount = 0;

    for (const field of oldFields) {
      const label = String(field?.label || "").trim();
      if (newNameSet.has(label)) {
        // 作者条目：作为新锚点，结束当前缝合块
        authorCount++;
        currentAnchorName = label;
        currentAnchorKey = field.key;
        currentBlock = null;
      } else {
        // 缝合条目：归入当前块（锚点为前一个作者条目）
        stitchedCount++;
        if (!currentBlock) {
          currentBlock = {
            anchorName: currentAnchorName,
            anchorKey: currentAnchorKey,
            fieldKeys: [],
          };
          blocks.push(currentBlock);
        }
        currentBlock.fieldKeys.push(field.key);
      }
    }

    const result = {
      blocks,
      oldTotal: oldFields.length,
      newTotal: newFields.length,
      authorCount,
      stitchedCount,
    };

    if (stitchedCount === 0) return result;

    // 按块顺序收集缝合条目完整数据（复用互通收集逻辑）
    const allKeys = blocks.flatMap((b) => b.fieldKeys);
    const { sourceEntries, error } = await collectSourceEntries(
      "preset",
      oldPresetName,
      allKeys,
    );
    if (error) return { ...result, error };
    if (sourceEntries.length !== allKeys.length) {
      return { ...result, error: "收集缝合条目数据不完整，请重试" };
    }

    let cursor = 0;
    for (const block of blocks) {
      block.entries = sourceEntries.slice(
        cursor,
        cursor + block.fieldKeys.length,
      );
      cursor += block.fieldKeys.length;
    }

    return result;
  }

  /**
   * 执行"快速更新"：将分析得到的缝合条目块按锚点插入到新预设。
   * 只切换一次预设，逐块复用 transferToPreset（自动生成唯一 key/label），
   * 每次基于最新数据计算锚点索引，天然支持多块顺序插入。
   * @returns {Promise<{insertedTotal:number, blockResults:Array, totalBlocks:number, error?:string}>}
   */
  async function executePresetQuickUpdate(
    oldPresetName,
    newPresetName,
    blocks,
  ) {
    const pm = getContext().getPresetManager();
    if (!pm) return { error: "无法获取预设管理器" };
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return { error: "没有可缝合的条目块" };
    }
    const targetValue = findPresetSelectValueByName(pm, newPresetName);
    if (!targetValue) return { error: `找不到新预设「${newPresetName}」` };

    // 临时切换到新预设（与 transferToPreset 内逻辑一致，只切换一次）
    const currentPresetValue = String(pm.select.val() || "");
    const needSwitch = currentPresetValue !== targetValue;
    if (needSwitch) {
      beginSuppressPresetRegexToast();
      pm.select.val(targetValue);
      pm.select.trigger("change");
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const blockResults = [];
      let insertedTotal = 0;

      for (const block of blocks) {
        const entries = Array.isArray(block?.entries) ? block.entries : [];
        if (entries.length === 0) continue;

        // 基于最新数据计算锚点索引
        const latestData = getPresetDataForDetail(pm, newPresetName);
        const latestFields = latestData
          ? getPresetDetailFields(latestData).filter((f) =>
              String(f?.key || "").startsWith("prompts."),
            )
          : [];
        let insertIndex;
        if (block.anchorName) {
          const anchorIdx = latestFields.findIndex(
            (f) => String(f?.label || "").trim() === block.anchorName,
          );
          if (anchorIdx === -1) {
            blockResults.push({
              anchorName: block.anchorName,
              count: entries.length,
              status: "skip",
              reason: `新预设中找不到锚点条目「${block.anchorName}」`,
            });
            continue;
          }
          insertIndex = anchorIdx + 1;
        } else {
          insertIndex = 0;
        }

        const result = await transferToPreset(
          "preset",
          entries,
          newPresetName,
          insertIndex,
        );
        if (!result) {
          blockResults.push({
            anchorName: block.anchorName || "(开头)",
            count: entries.length,
            status: "failed",
            reason: "缝合失败",
          });
          continue;
        }
        insertedTotal += Number(result.insertedCount || 0);
        blockResults.push({
          anchorName: block.anchorName || "(开头)",
          count: Number(result.insertedCount || 0),
          status: "done",
        });
      }

      return { insertedTotal, blockResults, totalBlocks: blocks.length };
    } finally {
      // 恢复原预设
      if (needSwitch) {
        try {
          pm.select.val(currentPresetValue);
          pm.select.trigger("change");
        } catch {}
        setTimeout(() => endSuppressPresetRegexToast(), 300);
      }
    }
  }

  /**
   * 获取缝合备忘录收藏组对应"原条目"的最新数据，并与收藏快照对比。
   * @param {object} group 收藏组（含 sourceType / sourceName / entries）
   * @returns {Promise<{changed:boolean, freshEntries:Array|null, error?:string}>}
   *   changed=true 表示原条目有变化；freshEntries 为最新收集到的条目（changed=false 时也可能返回 null）。
   */
  async function getEntryTransferMemoGroupFreshEntries(group) {
    if (!group || !group.sourceType) {
      return { changed: false, freshEntries: null };
    }
    // 由快照条目反推 selection keys
    const keys = Array.isArray(group.entries)
      ? group.entries.map((e) => {
          if (group.sourceType === "preset") {
            return String(e?.fieldKey || "");
          }
          const uid = e?.rawEntry?.uid;
          if (uid !== undefined && uid !== null) {
            return getWorldInfoEntrySelectionKey(group.sourceName, uid);
          }
          return "";
        })
      : [];
    const realKeys = keys.filter(Boolean);
    if (realKeys.length === 0) {
      return { changed: false, freshEntries: null };
    }
    const { sourceEntries, error } = await collectSourceEntries(
      group.sourceType,
      group.sourceName,
      realKeys,
    );
    if (error) {
      return { changed: false, freshEntries: null, error };
    }
    const changed = !sameMemoEntries(group.entries, sourceEntries);
    return { changed, freshEntries: sourceEntries };
  }

  /**
   * 对比两组缝合条目是否一致（仅比较互通时会写入目标的关键字段）。
   */
  function sameMemoEntries(oldEntries, newEntries) {
    const norm = (list) =>
      Array.isArray(list)
        ? list.map((e) => ({
            name: String(e?.name || ""),
            content: String(e?.content || ""),
            enabled: e?.enabled !== false,
          }))
        : [];
    const a = JSON.stringify(norm(oldEntries));
    const b = JSON.stringify(norm(newEntries));
    return a === b;
  }

  /**
   * 将缝合备忘录收藏组的条目快照更新为原条目的最新内容（仅收藏组，临时组不更新）。
   * @param {string} memoGroupId 缝合备忘录组 id
   * @returns {Promise<{updated:boolean, changedCount:number, error?:string}>}
   *   updated=true 表示快照已被更新；changedCount 为发生变化的条目数量。
   */
  async function updateEntryTransferMemoGroupFromSource(memoGroupId) {
    const group = memoApi
      .getEntryTransferMemoGroups()
      .find((g) => g.id === memoGroupId);
    if (!group) {
      return { updated: false, changedCount: 0, error: "缝合备忘录分组不存在" };
    }
    if (!group.favorite) {
      return { updated: false, changedCount: 0, error: "仅收藏组支持更新快照" };
    }
    const { changed, freshEntries, error } =
      await getEntryTransferMemoGroupFreshEntries(group);
    if (error) {
      return { updated: false, changedCount: 0, error };
    }
    if (!changed || !Array.isArray(freshEntries)) {
      return { updated: false, changedCount: 0 };
    }
    memoApi.updateEntryTransferMemoGroup(memoGroupId, {
      entries: freshEntries,
    });
    return { updated: true, changedCount: freshEntries.length };
  }

  /**
   * "选择目标预设或世界书"弹窗（从 showEntryTransferPopup 抽出，供互通主流程、备忘录单组缝合、全部缝合规划复用）。
   * @returns {Promise<{targetType:string, targetName:string, confirmText?:string}|null>}
   */
  async function openEntryTransferTargetDialog(
    sourceType,
    sourceName,
    sourceEntries,
    options = {},
  ) {
    const {
      title = `条目互通 (${sourceEntries.length} 个条目)`,
      confirmLabel = "确认互通",
      headerHint = "",
      confirmText = "",
    } = options || {};

    const presets = getCurrentPresets();
    const wiNames = await getWorldInfoNames();
    const presetGroups = getResourceGroups("presets");
    const wiGroups = getResourceGroups("worldinfo");
    const presetTree = getResFolderTree("presets");
    const wiTree = getResFolderTree("worldinfo");

    let selectedTargetType =
      sourceType === "worldinfo" ? "worldinfo" : "preset";
    let selectedTargetName = null;
    let transferExpandedFolders = new Set();

    // 使用专用全屏高 z-index 遮罩（高于缝合备忘录弹窗 100000），避免被备忘录遮罩盖住
    const overlay = $(
      '<div class="cfm-edit-popup-overlay cfm-entry-transfer-overlay cfm-entry-transfer-overlay-fixed"></div>',
    );
    const dialog = $(`
      <div class="cfm-edit-popup cfm-entry-transfer-dialog">
        ${headerHint ? `<div class="cfm-entry-transfer-header-hint">${headerHint}</div>` : ""}
        <div class="cfm-edit-popup-header">
          <span><i class="fa-solid fa-right-left"></i> ${escapeHtml(title)}</span>
        </div>
        <div class="cfm-entry-transfer-body">
          <div class="cfm-entry-transfer-type-row">
            <label><input type="radio" name="cfm-transfer-target-type" value="preset" ${selectedTargetType === "preset" ? "checked" : ""}> 预设</label>
            <label><input type="radio" name="cfm-transfer-target-type" value="worldinfo" ${selectedTargetType === "worldinfo" ? "checked" : ""}> 世界书</label>
          </div>
          <div class="cfm-entry-transfer-search">
            <input type="text" class="cfm-entry-transfer-search-input" placeholder="搜索..." />
            <button class="cfm-entry-transfer-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
            <button class="cfm-entry-transfer-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
          </div>
          <div class="cfm-entry-transfer-tree-container"></div>
          <div class="cfm-entry-transfer-selected-hint"></div>
        </div>
        <div class="cfm-edit-popup-footer">
          <button class="menu_button cfm-entry-transfer-confirm" disabled><i class="fa-solid fa-check"></i> ${escapeHtml(confirmLabel)}</button>
          <button class="menu_button cfm-entry-transfer-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
        </div>
      </div>
    `);

    const treeContainer = dialog.find(".cfm-entry-transfer-tree-container");
    const searchInput = dialog.find(".cfm-entry-transfer-search-input");
    const hintEl = dialog.find(".cfm-entry-transfer-selected-hint");
    const confirmBtn = dialog.find(".cfm-entry-transfer-confirm");
    const TRANSFER_TAP_MOVE_THRESHOLD = 10;

    function bindTransferTreeTap(target, handler) {
      target
        .on("touchstart", function (e) {
          const touch = e.originalEvent?.touches?.[0];
          if (!touch) return;
          $(this).data("cfmTransferTouchStartX", touch.clientX);
          $(this).data("cfmTransferTouchStartY", touch.clientY);
        })
        .on("click touchend", function (e) {
          const node = $(this);
          const now = Date.now();
          const lastTouchAt = Number(node.data("cfmTransferLastTouchAt") || 0);

          if (e.type === "touchend") {
            node.data("cfmTransferLastTouchAt", now);
            const touch = e.originalEvent?.changedTouches?.[0];
            if (touch) {
              const startX = Number(node.data("cfmTransferTouchStartX"));
              const startY = Number(node.data("cfmTransferTouchStartY"));
              if (Number.isFinite(startX) && Number.isFinite(startY)) {
                const deltaX = Math.abs(touch.clientX - startX);
                const deltaY = Math.abs(touch.clientY - startY);
                if (
                  deltaX > TRANSFER_TAP_MOVE_THRESHOLD ||
                  deltaY > TRANSFER_TAP_MOVE_THRESHOLD
                ) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
              }
            }
          } else if (lastTouchAt && now - lastTouchAt < 500) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          handler.call(this, e);
        });
    }

    // ── 渲染文件夹树 ──
    function renderTransferTree() {
      const query = String(searchInput.val() || "")
        .trim()
        .toLowerCase();
      treeContainer.empty();

      const tree = selectedTargetType === "preset" ? presetTree : wiTree;
      const groups = selectedTargetType === "preset" ? presetGroups : wiGroups;
      const items =
        selectedTargetType === "preset"
          ? presets.map((p) => p.name)
          : [...wiNames];

      // 构建文件夹→项目映射
      const folderItems = {};
      const ungrouped = [];
      for (const name of items) {
        if (query && !name.toLowerCase().includes(query)) continue;
        const fid = groups[name] || null;
        if (fid && tree[fid]) {
          if (!folderItems[fid]) folderItems[fid] = [];
          folderItems[fid].push(name);
        } else {
          ungrouped.push(name);
        }
      }

      // 递归渲染文件夹
      function renderFolder(folderId, depth) {
        const displayName =
          selectedTargetType === "preset"
            ? getResFolderDisplayName("presets", folderId)
            : getResFolderDisplayName("worldinfo", folderId);
        const isExpanded = transferExpandedFolders.has(folderId);
        const childFolders = Object.keys(tree).filter(
          (id) => (tree[id]?.parentId || null) === folderId,
        );
        const itemsInFolder = folderItems[folderId] || [];
        const hasContent = itemsInFolder.length > 0 || childFolders.length > 0;

        if (query && !hasContent && !displayName.toLowerCase().includes(query))
          return;

        const folderNode = $(`
          <div class="cfm-transfer-folder" data-folder-id="${escapeHtml(folderId)}" style="padding-left:${depth * 16 + 8}px;">
            <span class="cfm-transfer-folder-arrow"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></span>
            <span class="cfm-transfer-folder-icon"><i class="fa-solid fa-folder${isExpanded ? "-open" : ""}"></i></span>
            <span class="cfm-transfer-folder-name">${escapeHtml(displayName)}</span>
            <span class="cfm-transfer-folder-count">${itemsInFolder.length}</span>
          </div>
        `);
        bindTransferTreeTap(folderNode, () => {
          if (transferExpandedFolders.has(folderId)) {
            transferExpandedFolders.delete(folderId);
          } else {
            transferExpandedFolders.add(folderId);
          }
          renderTransferTree();
        });
        treeContainer.append(folderNode);

        if (isExpanded || query) {
          for (const childId of childFolders) renderFolder(childId, depth + 1);
          for (const name of itemsInFolder) {
            // 排除当前源（不能互通到自身）
            if (selectedTargetType === sourceType && name === sourceName)
              continue;
            const isSelected = selectedTargetName === name;
            const itemNode = $(`
              <div class="cfm-transfer-item ${isSelected ? "cfm-transfer-item-selected" : ""}" data-name="${escapeHtml(name)}" style="padding-left:${(depth + 1) * 16 + 8}px;">
                <span class="cfm-transfer-item-icon"><i class="fa-solid fa-${selectedTargetType === "preset" ? "sliders" : "book"}"></i></span>
                <span class="cfm-transfer-item-name">${escapeHtml(name)}</span>
              </div>
            `);
            bindTransferTreeTap(itemNode, () => {
              selectedTargetName = name;
              renderTransferTree();
              updateHint();
            });
            treeContainer.append(itemNode);
          }
        }
      }

      // 渲染根级文件夹
      const rootFolders = Object.keys(tree).filter((id) => !tree[id]?.parentId);
      for (const fid of rootFolders) renderFolder(fid, 0);

      // 渲染未归类项目（包裹在可展开节点中）
      const filteredUngrouped = ungrouped.filter(
        (name) => !(selectedTargetType === sourceType && name === sourceName),
      );
      if (filteredUngrouped.length > 0) {
        const uncatId = "__ungrouped__";
        const isUncatExpanded = transferExpandedFolders.has(uncatId);
        const uncatNode = $(`
          <div class="cfm-transfer-folder cfm-transfer-folder-ungrouped" style="padding-left:8px;">
            <span class="cfm-transfer-folder-arrow"><i class="fa-solid fa-caret-${isUncatExpanded ? "down" : "right"}"></i></span>
            <span class="cfm-transfer-folder-icon"><i class="fa-solid fa-box-open"></i></span>
            <span class="cfm-transfer-folder-name">未归类</span>
            <span class="cfm-transfer-folder-count">${filteredUngrouped.length}</span>
          </div>
        `);
        bindTransferTreeTap(uncatNode, () => {
          if (transferExpandedFolders.has(uncatId)) {
            transferExpandedFolders.delete(uncatId);
          } else {
            transferExpandedFolders.add(uncatId);
          }
          renderTransferTree();
        });
        treeContainer.append(uncatNode);

        if (isUncatExpanded || query) {
          for (const name of filteredUngrouped) {
            const isSelected = selectedTargetName === name;
            const itemNode = $(`
              <div class="cfm-transfer-item ${isSelected ? "cfm-transfer-item-selected" : ""}" data-name="${escapeHtml(name)}" style="padding-left:24px;">
                <span class="cfm-transfer-item-icon"><i class="fa-solid fa-${selectedTargetType === "preset" ? "sliders" : "book"}"></i></span>
                <span class="cfm-transfer-item-name">${escapeHtml(name)}</span>
              </div>
            `);
            bindTransferTreeTap(itemNode, () => {
              selectedTargetName = name;
              renderTransferTree();
              updateHint();
            });
            treeContainer.append(itemNode);
          }
        }
      }

      if (treeContainer.children().length === 0) {
        treeContainer.html(
          '<div style="padding:16px;opacity:0.5;text-align:center;">无可选目标</div>',
        );
      }
    }

    function updateHint() {
      if (selectedTargetName) {
        hintEl.html(
          `已选目标：<strong>${escapeHtml(selectedTargetName)}</strong>`,
        );
        confirmBtn.prop("disabled", false);
      } else {
        hintEl.text("请选择目标预设或世界书");
        confirmBtn.prop("disabled", true);
      }
    }

    // ── 事件绑定 ──
    dialog.find(".cfm-entry-transfer-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tree = selectedTargetType === "preset" ? presetTree : wiTree;
      for (const id of Object.keys(tree)) transferExpandedFolders.add(id);
      transferExpandedFolders.add("__ungrouped__");
      renderTransferTree();
    });
    dialog
      .find(".cfm-entry-transfer-collapse-all")
      .on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        transferExpandedFolders.clear();
        renderTransferTree();
      });

    dialog
      .find('input[name="cfm-transfer-target-type"]')
      .on("change", function () {
        selectedTargetType = $(this).val();
        selectedTargetName = null;
        updateHint();
        renderTransferTree();
      });

    searchInput.on("input", () => renderTransferTree());

    return new Promise((resolve) => {
      let settled = false;
      function settle(result) {
        if (settled) return;
        settled = true;
        overlay.remove();
        dialog.remove();
        resolve(result);
      }

      dialog.find(".cfm-entry-transfer-cancel").on("click touchend", (e) => {
        e.preventDefault();
        settle(null);
      });
      overlay.on("click", (e) => {
        if ($(e.target).hasClass("cfm-entry-transfer-overlay")) {
          settle(null);
        }
      });

      // ── 确认 ──
      confirmBtn.on("click touchend", (e) => {
        e.preventDefault();
        if (!selectedTargetName) return;
        settle({
          targetType: selectedTargetType,
          targetName: selectedTargetName,
          confirmText: confirmText || "",
        });
      });

      renderTransferTree();
      updateHint();
      overlay.append(dialog);
      const host = $("#cfm-popup");
      if (host.length) host.append(overlay);
      else $("body").append(overlay);
    });
  }

  /**
   * 第一步询问：现在就缝合，还是存入缝合备忘录？（在选目标之前弹出）
   * @param {number} entryCount 条目数量
   * @returns {Promise<"now"|"later"|null>} "now"=现在缝合；"later"=存入缝合备忘录；null=取消
   */
  function askEntryTransferNowOrLater(entryCount) {
    return new Promise((resolve) => {
      const overlay = $(`
        <div class="cfm-edit-popup-overlay cfm-entry-transfer-ask-overlay">
          <div class="cfm-edit-popup cfm-entry-transfer-ask-dialog" style="max-width:min(calc(100vw - 24px), 460px);">
            <div class="cfm-edit-popup-header">
              <span><i class="fa-solid fa-question-circle"></i> 缝合方式</span>
            </div>
            <div class="cfm-entry-transfer-ask-body" style="display:flex;flex-direction:column;gap:12px;padding:16px 18px 10px;">
              <div style="font-size:14px;line-height:1.6;color:var(--SmartThemeBodyColor, #eef4ff);">
                将 <strong>${entryCount}</strong> 个条目互通到目标，要现在缝合吗？
              </div>
              <div style="font-size:12px;line-height:1.6;opacity:0.86;">
                选择「现在缝合」将弹出目标选择，选择目标后可直接决定插入位置。<br>
                选择「存入备忘录」可稍后统一批量缝合，并可添加备注。
              </div>
            </div>
            <div class="cfm-edit-popup-footer">
              <button class="menu_button cfm-entry-transfer-ask-later"><i class="fa-solid fa-bookmark"></i> 存入备忘录</button>
              <button class="menu_button cfm-entry-transfer-ask-now"><i class="fa-solid fa-bolt"></i> 现在缝合</button>
              <button class="menu_button cfm-entry-transfer-ask-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
            </div>
          </div>
        </div>
      `);

      let settled = false;
      const settle = (result) => {
        if (settled) return;
        settled = true;
        overlay.remove();
        resolve(result);
      };

      overlay
        .find(".cfm-entry-transfer-ask-later")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle("later");
        });
      overlay.find(".cfm-entry-transfer-ask-now").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        settle("now");
      });
      overlay
        .find(".cfm-entry-transfer-ask-cancel")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle(null);
        });
      overlay.on("click", (e) => {
        if ($(e.target).hasClass("cfm-entry-transfer-ask-overlay")) {
          settle(null);
        }
      });

      const host = $("#cfm-popup");
      if (host.length) host.append(overlay);
      else $("body").append(overlay);
    });
  }

  /**
   * 存入缝合备忘录时询问备注（在选目标之前弹出，故不含目标信息）
   * @param {number} entryCount 条目数量
   * @returns {Promise<{action:"later", note:string}|null>} null=取消存入
   */
  function askEntryTransferMemoNote(entryCount) {
    return new Promise((resolve) => {
      const overlay = $(`
        <div class="cfm-edit-popup-overlay cfm-entry-transfer-note-overlay">
          <div class="cfm-edit-popup cfm-entry-transfer-note-dialog" style="max-width:min(calc(100vw - 24px), 440px);">
            <div class="cfm-edit-popup-header">
              <span><i class="fa-solid fa-note-sticky"></i> 存入缝合备忘录</span>
            </div>
            <div class="cfm-entry-transfer-note-body" style="display:flex;flex-direction:column;gap:10px;padding:14px 18px 10px;">
              <div style="font-size:13px;line-height:1.6;opacity:0.92;">将 <strong>${entryCount}</strong> 个条目存入缝合备忘录。</div>
              <div style="font-size:12px;line-height:1.6;opacity:0.78;">备注可帮您记住这批条目打算缝合到哪里。</div>
              <input type="text" class="cfm-edit-input cfm-entry-transfer-note-input" placeholder="备注（可选，例如：缝合到主预设A）" />
            </div>
            <div class="cfm-edit-popup-footer">
              <button class="menu_button cfm-entry-transfer-note-save"><i class="fa-solid fa-check"></i> 存入</button>
              <button class="menu_button cfm-entry-transfer-note-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
            </div>
          </div>
        </div>
      `);

      let settled = false;
      const settle = (result) => {
        if (settled) return;
        settled = true;
        overlay.remove();
        resolve(result);
      };

      overlay
        .find(".cfm-entry-transfer-note-save")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const note = String(
            overlay.find(".cfm-entry-transfer-note-input").val() || "",
          ).trim();
          settle({ action: "later", note });
        });
      overlay
        .find(".cfm-entry-transfer-note-cancel")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle(null);
        });
      overlay.on("click", (e) => {
        if ($(e.target).hasClass("cfm-entry-transfer-note-overlay")) {
          settle(null);
        }
      });

      const host = $("#cfm-popup");
      if (host.length) host.append(overlay);
      else $("body").append(overlay);
      setTimeout(
        () => overlay.find(".cfm-entry-transfer-note-input").trigger("focus"),
        50,
      );
    });
  }

  async function getEntryTransferInsertItems(targetType, targetName) {
    if (targetType === "preset") {
      const pm = getContext().getPresetManager();
      if (!pm) throw new Error("无法获取预设管理器");
      const presetData = getPresetDataForDetail(pm, targetName);
      if (!presetData) throw new Error(`找不到预设「${targetName}」的数据`);
      return getPresetDetailFields(presetData)
        .filter((field) => String(field?.key || "").startsWith("prompts."))
        .map((field, index) => {
          const promptId = String(field?.key || "").replace(/^prompts\./, "");
          const sourceLabel = String(field?.sourceLabel || "").trim();
          return {
            id: promptId || `prompt_${index + 1}`,
            label: String(field?.label || promptId || `条目 ${index + 1}`),
            subLabel: sourceLabel || promptId || "预设条目",
          };
        });
    }

    if (targetType === "worldinfo") {
      const wiData = await fetchWorldInfoDetailData(targetName);
      if (!wiData) throw new Error(`无法获取世界书「${targetName}」的数据`);
      const sortMode = getWorldInfoEntryDetailSortMode();
      return getWorldInfoEntriesForDetail(targetName, wiData, sortMode).map(
        (entry, index) => ({
          id: String(entry?.uid || index + 1),
          label: String(entry?.label || `条目 ${index + 1}`),
          subLabel:
            Array.isArray(entry?.primaryKeys) && entry.primaryKeys.length > 0
              ? entry.primaryKeys.join(", ")
              : `UID: ${String(entry?.uid || index + 1)}`,
        }),
      );
    }

    return [];
  }

  function openEntryTransferInsertDialog(options = {}) {
    const {
      sourceEntries = [],
      targetType = "preset",
      targetName = "",
      existingItems = [],
      batchMode = false, // 全部缝合规划阶段：按钮文案带"并开始下一组"，返回 action
      isLast = false, // batchMode 下最后一组：取消改为触发末组选择弹窗
      headerHint = "", // batchMode 顶部提示：正在缝合 N/M：[摘要] by [来源] [备注]
      title = "", // 自定义标题（如批量操作"移动位置"）
      description = "", // 自定义描述
      moveMode = false, // 移动模式（批量换位置）：描述/按钮语义改为"移动到/移动"，而非"互通/插入"
    } = options || {};
    const normalizedItems = Array.isArray(existingItems) ? existingItems : [];
    const entryCount = Array.isArray(sourceEntries) ? sourceEntries.length : 0;
    const targetTypeLabel = targetType === "worldinfo" ? "世界书" : "预设";

    // 移动模式：确认/追加/取消文案带"移动"语义
    const confirmLabel = moveMode
      ? batchMode
        ? isLast
          ? "确认移动"
          : "确认移动并开始下一组"
        : "确认移动"
      : batchMode
        ? isLast
          ? "确认插入"
          : "确认插入并开始下一组"
        : "确认插入";
    const skipLabel = moveMode
      ? batchMode
        ? isLast
          ? "移动到末尾"
          : "移动到末尾并开始下一组"
        : "移动到末尾"
      : batchMode
        ? isLast
          ? "追加到末尾"
          : "追加到末尾并开始下一组"
        : "追加到末尾";
    const cancelLabel = batchMode
      ? isLast
        ? "取消"
        : "取消并开始下一组"
      : "取消";

    return new Promise((resolve) => {
      // 使用专用全屏高 z-index 遮罩（高于缝合备忘录弹窗 100000），避免被备忘录遮罩盖住
      const overlay = $(
        '<div class="cfm-edit-popup-overlay cfm-entry-transfer-sort-overlay"></div>',
      );
      const dialogTitle = title || (moveMode ? "选择移动位置" : "选择插入位置");
      const dialogDesc = description
        ? description
        : moveMode
          ? `即将把 ${entryCount} 个条目移动到${targetTypeLabel}「${escapeHtml(targetName)}」的新位置，请点击分隔线中间的 <i class='fa-solid fa-plus'></i> 选择移动目标位置；点击“移动到末尾”则直接放到最后。`
          : `即将把 ${entryCount} 个条目互通到${targetTypeLabel}「${escapeHtml(targetName)}」，请点击分隔线中间的 <i class='fa-solid fa-plus'></i> 选择插入位置；点击“追加到末尾”则直接放到最后。`;
      const dialog = $(`
        <div class='cfm-sort-dialog cfm-sort-dialog-insert ${batchMode ? "cfm-sort-dialog-insert-batch" : ""}'>
          ${batchMode && headerHint ? `<div class='cfm-sort-dialog-batch-hint'>${headerHint}</div>` : ""}
          <div class='cfm-sort-dialog-header'>
            <span class='cfm-sort-dialog-title'><i class='fa-solid fa-sort'></i> ${dialogTitle}</span>
            <span class='cfm-sort-dialog-desc'>${dialogDesc}</span>
          </div>
          <div class='cfm-sort-dialog-body'>
            <div class='cfm-sort-dialog-list cfm-sort-dialog-list-insert'></div>
          </div>
          <div class='cfm-sort-dialog-footer'>
            <button class='cfm-btn cfm-sort-dialog-confirm cfm-sort-dialog-insert-confirm' disabled><i class='fa-solid fa-check'></i> ${confirmLabel}</button>
            <button class='cfm-btn cfm-sort-dialog-skip'><i class='fa-solid fa-forward'></i> ${skipLabel}</button>
            <button class='cfm-btn cfm-sort-dialog-cancel'><i class='fa-solid fa-xmark'></i> ${cancelLabel}</button>
          </div>
        </div>
      `);

      const sortList = dialog.find(".cfm-sort-dialog-list");
      const confirmBtn = dialog.find(".cfm-sort-dialog-insert-confirm");
      let selectedTargetIndex = null;
      let settled = false;

      function closeDialog() {
        overlay.remove();
        dialog.remove();
      }

      function settle(result) {
        if (settled) return;
        settled = true;
        closeDialog();
        resolve(result);
      }

      function updateSelectedInsertSlot() {
        sortList.find(".cfm-sort-insert-slot").each(function () {
          const slot = $(this);
          const isSelected =
            Number(slot.attr("data-target-index")) === selectedTargetIndex;
          const lineEl = slot.find(".cfm-sort-insert-line");
          const btnEl = slot.find(".cfm-sort-insert-btn");
          btnEl.attr(
            "title",
            isSelected ? "已选中，点击确认插入" : "选择插入到此处",
          );
          btnEl.attr("aria-pressed", isSelected ? "true" : "false");
          btnEl.css({
            color: isSelected ? "#a6e3a1" : "#89b4fa",
            borderColor: isSelected
              ? "rgba(166, 227, 161, 0.5)"
              : "rgba(137, 180, 250, 0.35)",
            backgroundColor: isSelected
              ? "rgba(166, 227, 161, 0.14)"
              : "var(--SmartThemeBlurTintColor, #1e1e2e)",
            boxShadow: isSelected
              ? "0 0 0 3px rgba(166, 227, 161, 0.08)"
              : "none",
          });
          lineEl.css({
            background: isSelected
              ? "linear-gradient(90deg, rgba(166, 227, 161, 0.12) 0%, rgba(166, 227, 161, 0.55) 50%, rgba(166, 227, 161, 0.12) 100%)"
              : "linear-gradient(90deg, rgba(137, 180, 250, 0.08) 0%, rgba(137, 180, 250, 0.35) 50%, rgba(137, 180, 250, 0.08) 100%)",
          });
        });
        confirmBtn.prop("disabled", selectedTargetIndex === null);
      }

      const renderInsertSlot = (targetIndex) => {
        const slot = $(`
          <div class='cfm-sort-insert-slot' data-target-index='${targetIndex}'>
            <div class='cfm-sort-insert-line'></div>
            <button class='cfm-sort-insert-btn' title='选择插入到此处'><i class='fa-solid fa-plus'></i></button>
          </div>
        `);
        slot.find(".cfm-sort-insert-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectedTargetIndex = targetIndex;
          updateSelectedInsertSlot();
        });
        return slot;
      };

      sortList.append(renderInsertSlot(0));
      if (normalizedItems.length === 0) {
        sortList.append(`
          <div class='cfm-sort-row cfm-sort-row-static'>
            <span class='cfm-sort-row-static-index'>-</span>
            <span class='cfm-sort-row-name'>目标当前还没有条目</span>
            <span class='cfm-sort-row-folder'>请选择上方插入位</span>
          </div>
        `);
      } else {
        normalizedItems.forEach((item, index) => {
          const row = $(`
            <div class='cfm-sort-row cfm-sort-row-static' data-transfer-id='${escapeHtml(String(item?.id || ""))}'>
              <span class='cfm-sort-row-static-index'>${index + 1}</span>
              <span class='cfm-sort-row-name'>${escapeHtml(String(item?.label || `条目 ${index + 1}`))}</span>
              <span class='cfm-sort-row-folder'>${escapeHtml(String(item?.subLabel || `${targetTypeLabel}条目`))}</span>
            </div>
          `);
          sortList.append(row);
          sortList.append(renderInsertSlot(index + 1));
        });
      }

      updateSelectedInsertSlot();

      confirmBtn.on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedTargetIndex === null) {
          cfmToastr.warning("请先选择一个插入位置");
          return;
        }
        settle(
          batchMode
            ? { action: "insert", targetIndex: selectedTargetIndex, isLast }
            : { targetIndex: selectedTargetIndex },
        );
      });

      dialog.find(".cfm-sort-dialog-skip").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        settle(
          batchMode
            ? { action: "append", targetIndex: normalizedItems.length, isLast }
            : { targetIndex: normalizedItems.length },
        );
      });

      dialog.find(".cfm-sort-dialog-cancel").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        settle(batchMode ? { action: "cancel", isLast } : null);
      });

      overlay.on("click", (e) => {
        if ($(e.target).hasClass("cfm-entry-transfer-sort-overlay")) {
          settle(batchMode ? { action: "cancel", isLast } : null);
        }
      });

      overlay.append(dialog);
      const host = $("#cfm-popup");
      if (host.length) host.append(overlay);
      else $("body").append(overlay);
    });
  }

  function getEntryTransferPostActionMode() {
    ensureSettings();
    const saved = String(
      extensionSettings[extensionName].entryTransferPostAction || "ask",
    );
    return ["ask", "target", "origin"].includes(saved) ? saved : "ask";
  }

  function setEntryTransferPostActionMode(mode, save = true) {
    ensureSettings();
    const normalized = ["ask", "target", "origin"].includes(String(mode))
      ? String(mode)
      : "ask";
    extensionSettings[extensionName].entryTransferPostAction = normalized;
    if (save) getContext().saveSettingsDebounced();
    return normalized;
  }

  // ==================== 批量操作进度覆盖层 ====================
  /**
   * 显示批量操作进度覆盖层（带旋转加载图标和实时进度计数）
   * @param {string} actionLabel - 操作描述文本，如 "正在批量重命名主题"
   * @param {number} total - 总数
   * @returns {{ update: (current: number, customText?: string) => void, done: (resultText?: string) => void, remove: () => void }}
   */
  function showBatchProgressOverlay(actionLabel, total) {
    // 移除可能残留的上一个
    $(".cfm-batch-progress-overlay").remove();
    const overlay = $(
      `<div class="cfm-batch-progress-overlay" aria-live="polite" aria-busy="true">
        <div class="cfm-batch-progress-box">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span class="cfm-batch-progress-text">${escapeHtml(actionLabel)}</span>
          <span class="cfm-batch-progress-counter">0/${total}</span>
        </div>
      </div>`,
    );
    $("body").append(overlay);
    const textEl = overlay.find(".cfm-batch-progress-text");
    const counterEl = overlay.find(".cfm-batch-progress-counter");
    return {
      /** 更新进度计数 */
      update(current, customText) {
        counterEl.text(`${current}/${total}`);
        if (customText) textEl.text(customText);
      },
      /** 操作完成，短暂显示结果后自动移除 */
      done(resultText) {
        overlay
          .find("i.fa-spinner")
          .removeClass("fa-spin")
          .removeClass("fa-spinner")
          .addClass("fa-check");
        counterEl.text(`${total}/${total}`);
        if (resultText) textEl.text(resultText);
        setTimeout(() => overlay.remove(), 600);
      },
      /** 立即移除覆盖层 */
      remove() {
        overlay.remove();
      },
    };
  }

  function showEntryTransferProgressLoading(
    sourceEntries,
    targetType,
    targetName,
  ) {
    const host = $("#cfm-overlay");
    if (!host.length) return null;

    host.find(".cfm-entry-transfer-progress-loading").remove();

    const entryCount = Array.isArray(sourceEntries) ? sourceEntries.length : 0;
    const targetTypeLabel = targetType === "worldinfo" ? "世界书" : "预设";
    const loading = $(
      `<div class="cfm-preset-detail-opening-loading cfm-entry-transfer-progress-loading" aria-live="polite" aria-busy="true">
        <div class="cfm-preset-detail-opening-loading-box">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>正在将 ${entryCount} 个条目缝合到${targetTypeLabel}「${escapeHtml(targetName)}」...</span>
        </div>
      </div>`,
    );

    host.append(loading);
    return () => {
      loading.remove();
    };
  }

  function showEntryTransferCompletionDialog(options = {}) {
    const {
      targetType = "preset",
      targetName = "",
      insertedCount = 0,
    } = options || {};
    const targetTypeLabel = targetType === "worldinfo" ? "世界书" : "预设";

    return new Promise((resolve) => {
      const overlay = $(`
        <div class="cfm-edit-popup-overlay cfm-entry-transfer-complete-overlay">
          <div class="cfm-edit-popup cfm-entry-transfer-complete-dialog" style="max-width:min(calc(100vw - 24px), 440px);">
            <div class="cfm-edit-popup-header">
              <span><i class="fa-solid fa-circle-check"></i> 缝合完成</span>
            </div>
            <div class="cfm-entry-transfer-complete-body" style="display:flex;flex-direction:column;gap:10px;padding:16px 18px 10px;">
              <div class="cfm-entry-transfer-complete-title" style="font-size:14px;font-weight:700;line-height:1.5;color:var(--SmartThemeBodyColor, #eef4ff);">
                已将 ${insertedCount} 个条目缝合到${targetTypeLabel}「${escapeHtml(targetName)}」
              </div>
              <div class="cfm-entry-transfer-complete-desc" style="font-size:12px;line-height:1.6;opacity:0.86;">
                是否立即跳转到刚刚接收条目的目标${targetTypeLabel}？选择“留在当前页面”则继续停留在当前查看位置。
              </div>
              <button type="button" class="cfm-entry-transfer-complete-remember-toggle" data-checked="false" aria-pressed="false" style="display:flex;align-items:flex-start;justify-content:flex-start;gap:8px;width:100%;margin-top:2px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:inherit;cursor:pointer;">
                <i class="fa-regular fa-square cfm-entry-transfer-complete-remember-icon" aria-hidden="true" style="margin-top:2px;color:rgba(255,255,255,0.72);"></i>
                <span style="font-size:12px;line-height:1.5;text-align:left;">以后不再提示，并记住这次选择</span>
              </button>
            </div>
            <div class="cfm-edit-popup-footer">
              <button class="menu_button cfm-entry-transfer-complete-target"><i class="fa-solid fa-arrow-up-right-from-square"></i> 跳到目标${targetTypeLabel}</button>
              <button class="menu_button cfm-entry-transfer-complete-origin"><i class="fa-solid fa-location-dot"></i> 留在当前页面</button>
            </div>
          </div>
        </div>
      `);

      let settled = false;
      const settle = (action = "origin") => {
        if (settled) return;
        settled = true;
        const remember =
          overlay
            .find(".cfm-entry-transfer-complete-remember-toggle")
            .attr("data-checked") === "true";
        overlay.remove();
        resolve({ action, remember });
      };

      const rememberToggle = overlay.find(
        ".cfm-entry-transfer-complete-remember-toggle",
      );
      const rememberIcon = overlay.find(
        ".cfm-entry-transfer-complete-remember-icon",
      );
      const syncRememberToggle = (checked) => {
        const normalized = !!checked;
        rememberToggle.attr("data-checked", normalized ? "true" : "false");
        rememberToggle.attr("aria-pressed", normalized ? "true" : "false");
        rememberToggle.css({
          background: normalized
            ? "rgba(249, 226, 175, 0.14)"
            : "rgba(255,255,255,0.04)",
          borderColor: normalized
            ? "rgba(249, 226, 175, 0.42)"
            : "rgba(255,255,255,0.08)",
        });
        rememberIcon.attr(
          "class",
          normalized
            ? "fa-solid fa-square-check cfm-entry-transfer-complete-remember-icon"
            : "fa-regular fa-square cfm-entry-transfer-complete-remember-icon",
        );
        rememberIcon.css(
          "color",
          normalized ? "#f9e2af" : "rgba(255,255,255,0.72)",
        );
      };
      const toggleRememberChecked = () => {
        syncRememberToggle(rememberToggle.attr("data-checked") !== "true");
      };

      syncRememberToggle(false);
      rememberToggle.on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleRememberChecked();
      });
      rememberToggle.on("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        toggleRememberChecked();
      });

      overlay
        .find(".cfm-entry-transfer-complete-target")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle("target");
        });
      overlay
        .find(".cfm-entry-transfer-complete-origin")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle("origin");
        });
      overlay.on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          settle("origin");
        }
      });

      const host = $("#cfm-popup");
      if (host.length) host.append(overlay);
      else $("body").append(overlay);
    });
  }

  function setEntryTransferTargetTab(tabId) {
    const normalizedTab = tabId === "worldinfo" ? "worldinfo" : "presets";
    setCurrentResourceType(normalizedTab);

    const overlay = $("#cfm-overlay");
    if (!overlay.length) return false;

    overlay.find(".cfm-tab").removeClass("cfm-tab-active");
    overlay
      .find(`.cfm-tab[data-tab="${normalizedTab}"]`)
      .addClass("cfm-tab-active");

    overlay.find("#cfm-chars-view").hide();
    overlay.find("#cfm-presets-view").toggle(normalizedTab === "presets");
    overlay.find("#cfm-worldinfo-view").toggle(normalizedTab === "worldinfo");
    overlay.find("#cfm-themes-view").hide();
    overlay.find("#cfm-backgrounds-view").hide();
    overlay.find("#cfm-personas-view").hide();
    overlay.find("#cfm-regex-view").hide();
    overlay.find("#cfm-qr-view").hide();

    overlay.find("#cfm-global-search-bar").hide();
    overlay
      .find("#cfm-chatlogs-search-bar")
      .toggle(normalizedTab === "chatlogs");
    overlay.find("#cfm-preset-search-bar").toggle(normalizedTab === "presets");
    overlay
      .find("#cfm-worldinfo-search-bar")
      .toggle(normalizedTab === "worldinfo");
    overlay.find("#cfm-theme-search-bar").hide();
    overlay.find("#cfm-bg-search-bar").hide();
    overlay.find("#cfm-persona-search-bar").hide();
    overlay.find("#cfm-regex-search-bar").hide();
    overlay.find("#cfm-qr-search-bar").hide();
    overlay.find("#cfm-btn-copymode").hide();

    return true;
  }

  function revealTransferredPresetTarget(presetName) {
    const normalizedName = String(presetName || "").trim();
    if (!normalizedName) return false;

    const groups = getResourceGroups("presets");
    const tree = getResFolderTree("presets");
    const folderId = groups[normalizedName];
    if (folderId && tree[folderId]) {
      const path = getResFolderPath("presets", folderId);
      for (const pid of path) getPresetExpandedNodes().add(pid);
      setSelectedPresetFolder(folderId);
    } else {
      setSelectedPresetFolder("__ungrouped__");
    }

    getPresetDetailExpandedNames().add(normalizedName);
    setEntryTransferTargetTab("presets");
    renderPresetsView();
    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll(
          "#cfm-preset-right-list .cfm-row[data-res-id]",
        ),
      ).find((el) => el.getAttribute("data-res-id") === normalizedName),
    );
    return true;
  }

  async function revealTransferredWorldInfoTarget(bookName) {
    const normalizedName = String(bookName || "").trim();
    if (!normalizedName) return false;

    const groups = getResourceGroups("worldinfo");
    const tree = getResFolderTree("worldinfo");
    const folderId = groups[normalizedName];
    if (folderId && tree[folderId]) {
      const path = getResFolderPath("worldinfo", folderId);
      for (const pid of path) getWorldInfoExpandedNodes().add(pid);
      setSelectedWorldInfoFolder(folderId);
    } else {
      setSelectedWorldInfoFolder("__ungrouped__");
    }

    getWorldInfoEntryExpandedNames().add(normalizedName);
    setWorldInfoEntryLastFocusedName(normalizedName);
    setEntryTransferTargetTab("worldinfo");
    await renderWorldInfoView();
    scrollWorldInfoRowIntoView(normalizedName);
    return true;
  }

  async function revealEntryTransferTargetResource(targetType, targetName) {
    if (targetType === "worldinfo") {
      return await revealTransferredWorldInfoTarget(targetName);
    }
    return revealTransferredPresetTarget(targetName);
  }

  /**
   * 执行条目互通复制（含插入位置弹窗和原子回滚）
   */
  async function executeEntryTransfer(
    sourceType,
    sourceName,
    sourceEntries,
    targetType,
    targetName,
  ) {
    const existingItems = await getEntryTransferInsertItems(
      targetType,
      targetName,
    );
    const insertResult = await openEntryTransferInsertDialog({
      sourceEntries,
      targetType,
      targetName,
      existingItems,
    });
    if (!insertResult) return null;

    const targetIndex = Number.isInteger(insertResult?.targetIndex)
      ? insertResult.targetIndex
      : existingItems.length;

    const hideLoading = showEntryTransferProgressLoading(
      sourceEntries,
      targetType,
      targetName,
    );

    let transferResult = null;
    try {
      if (targetType === "preset") {
        transferResult = await transferToPreset(
          sourceType,
          sourceEntries,
          targetName,
          targetIndex,
        );
      } else if (targetType === "worldinfo") {
        transferResult = await transferToWorldInfo(
          sourceType,
          sourceEntries,
          targetName,
          targetIndex,
        );
      }
    } finally {
      hideLoading?.();
    }

    if (!transferResult) return null;

    const targetTypeLabel = targetType === "worldinfo" ? "世界书" : "预设";
    const postActionMode = getEntryTransferPostActionMode();
    let nextAction = postActionMode;

    if (postActionMode === "ask") {
      const dialogResult = await showEntryTransferCompletionDialog({
        targetType,
        targetName,
        insertedCount: transferResult.insertedCount,
      });
      nextAction = dialogResult?.action || "origin";
      if (dialogResult?.remember) {
        nextAction = setEntryTransferPostActionMode(nextAction, true);
        cfmToastr.success(
          nextAction === "target"
            ? `已记住：缝合完成后自动跳转到目标${targetTypeLabel}`
            : "已记住：缝合完成后停留在当前页面",
        );
      }
    }

    if (nextAction === "target") {
      await revealEntryTransferTargetResource(targetType, targetName);
    }

    return transferResult;
  }

  /**
   * 互通到预设
   */
  async function transferToPreset(
    sourceType,
    sourceEntries,
    targetPresetName,
    insertIndex = null,
  ) {
    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("无法获取预设管理器");
      return null;
    }

    // 临时切换到目标预设
    const currentPresetValue = String(pm.select.val() || "");
    const targetValue = findPresetSelectValueByName(pm, targetPresetName);
    if (!targetValue) {
      cfmToastr.error(`找不到预设「${targetPresetName}」`);
      return null;
    }

    const needSwitch = currentPresetValue !== targetValue;
    if (needSwitch) {
      beginSuppressPresetRegexToast();
      pm.select.val(targetValue);
      pm.select.trigger("change");
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const presetData = getPresetDataForDetail(pm, targetPresetName);
      if (!presetData)
        throw new Error(`找不到预设「${targetPresetName}」的数据`);

      const promptList = ensurePresetPromptList(presetData);
      const detailFields = getPresetDetailFields(presetData);
      const existingIds = new Set(
        promptList.map((p) => getPresetPromptIdentifier(p)).filter(Boolean),
      );
      const existingLabels = new Set(
        detailFields.map((f) => String(f?.label || "").trim()).filter(Boolean),
      );
      const currentOrderedFieldKeys = detailFields
        .map((field) => String(field?.key || "").trim())
        .filter((fieldKey) => fieldKey.startsWith("prompts."));

      const insertedPrompts = [];
      const insertedFieldKeys = [];
      const normalizedInsertIndex = Math.max(
        0,
        Math.min(
          Number.isInteger(insertIndex)
            ? insertIndex
            : currentOrderedFieldKeys.length,
          currentOrderedFieldKeys.length,
        ),
      );

      for (let i = 0; i < sourceEntries.length; i++) {
        const entry = sourceEntries[i];
        try {
          // 生成唯一 key
          let newKey = buildDuplicatedPresetPromptKey(
            existingIds,
            entry.name || "prompt",
          );
          existingIds.add(newKey);
          // 生成唯一 label（重名加 -1 后缀）
          let newLabel = entry.name || "新条目";
          let labelCounter = 0;
          while (existingLabels.has(newLabel)) {
            labelCounter++;
            newLabel = `${entry.name || "新条目"}-${labelCounter}`;
          }
          existingLabels.add(newLabel);

          let newPrompt;
          if (
            sourceType === "preset" &&
            entry.rawPrompt &&
            typeof entry.rawPrompt === "object"
          ) {
            newPrompt = structuredClone(entry.rawPrompt);
          } else {
            newPrompt = {
              content: entry.content || "",
              role: entry.role || "system",
              injection_position: 0,
              injection_depth: 4,
            };
          }
          const promptEnabled = entry.enabled !== false;
          newPrompt.identifier = newKey;
          if ("id" in newPrompt) newPrompt.id = newKey;
          if ("key" in newPrompt) newPrompt.key = newKey;
          if ("prompt" in newPrompt) newPrompt.prompt = newKey;
          newPrompt.name = newLabel;
          newPrompt.enabled = promptEnabled;

          promptList.push(newPrompt);
          setPresetPromptEnabled(presetData, newKey, promptEnabled);
          insertedPrompts.push(newPrompt);
          insertedFieldKeys.push(`prompts.${newKey}`);
        } catch (innerErr) {
          // 回滚已插入的
          for (const inserted of insertedPrompts) {
            const idx = promptList.indexOf(inserted);
            if (idx >= 0) promptList.splice(idx, 1);
          }
          cfmToastr.error(
            `因为第 ${i + 1} 个条目「${entry.name}」失败，本次缝合已回滚`,
          );
          return null;
        }
      }

      const nextOrderedFieldKeys = [...currentOrderedFieldKeys];
      nextOrderedFieldKeys.splice(
        normalizedInsertIndex,
        0,
        ...insertedFieldKeys,
      );
      const shouldReorder =
        normalizedInsertIndex < currentOrderedFieldKeys.length;

      await saveNormalizedPresetData(pm, targetPresetName, presetData);
      if (shouldReorder && nextOrderedFieldKeys.length > 1) {
        const reordered = await savePresetDetailPromptOrder(
          targetPresetName,
          nextOrderedFieldKeys,
        );
        if (!reordered) {
          throw new Error(`预设「${targetPresetName}」插入位置保存失败`);
        }
      }

      cfmToastr.success(
        `已将 ${insertedPrompts.length} 个条目互通到预设「${targetPresetName}」`,
      );
      if (getCurrentResourceType() === "presets") refreshPresetPanelView();

      return {
        insertedCount: insertedPrompts.length,
        targetType: "preset",
        targetName: targetPresetName,
      };
    } catch (err) {
      console.error("[CFM] 条目互通到预设失败", err);
      cfmToastr.error(err?.message || `互通到预设「${targetPresetName}」失败`);
      return null;
    } finally {
      // 恢复原预设
      if (needSwitch) {
        try {
          pm.select.val(currentPresetValue);
          pm.select.trigger("change");
        } catch {}
        setTimeout(() => endSuppressPresetRegexToast(), 300);
      }
    }
  }

  /**
   * 互通到世界书
   */
  async function transferToWorldInfo(
    sourceType,
    sourceEntries,
    targetBookName,
    insertIndex = null,
  ) {
    try {
      const wiData = await fetchWorldInfoDetailData(targetBookName);
      if (!wiData) {
        cfmToastr.error(`无法获取世界书「${targetBookName}」的数据`);
        return null;
      }
      if (!wiData.entries) wiData.entries = {};

      const existingSortMode = getWorldInfoEntryDetailSortMode();
      const existingEntries = getWorldInfoEntriesForDetail(
        targetBookName,
        wiData,
        existingSortMode,
      );

      // 获取已有条目名（comment）集合用于去重
      const existingNames = new Set(
        Object.values(wiData.entries)
          .map((e) => String(e.comment || ""))
          .filter(Boolean),
      );

      // 计算下一个可用 uid
      let nextUid =
        Object.keys(wiData.entries).reduce(
          (max, k) => Math.max(max, parseInt(k, 10) || 0),
          0,
        ) + 1;

      const insertedUids = [];
      const insertedEntries = [];

      for (let i = 0; i < sourceEntries.length; i++) {
        const entry = sourceEntries[i];
        try {
          // 重名加 -1 后缀
          let newName = entry.name || "新条目";
          let nameCounter = 0;
          while (existingNames.has(newName)) {
            nameCounter++;
            newName = `${entry.name || "新条目"}-${nameCounter}`;
          }
          existingNames.add(newName);

          const uid = nextUid++;
          let newEntry;

          if (sourceType === "worldinfo" && entry.rawEntry) {
            // 世界书→世界书：完整复制
            newEntry = structuredClone(entry.rawEntry);
            newEntry.uid = uid;
            newEntry.comment = newName;
            newEntry.disable = entry.enabled === false;
          } else {
            // 预设→世界书：映射字段
            newEntry = {
              uid: uid,
              key: [newName],
              keysecondary: [],
              comment: newName,
              content: entry.content || "",
              constant: false,
              vectorized: false,
              selective: true,
              selectiveLogic: 0,
              addMemo: true,
              order: 100,
              position: 0,
              disable: entry.enabled === false,
              excludeRecursion: false,
              preventRecursion: false,
              delayUntilRecursion: false,
              probability: 100,
              useProbability: true,
              depth: 4,
              group: "",
              groupOverride: false,
              groupWeight: 100,
              scanDepth: null,
              caseSensitive: null,
              matchWholeWords: null,
              useGroupScoring: null,
              automationId: "",
              role: null,
              sticky: null,
              cooldown: null,
              delay: null,
            };
          }

          wiData.entries[String(uid)] = newEntry;
          insertedUids.push(String(uid));
          insertedEntries.push(newEntry);
        } catch (innerErr) {
          // 回滚
          for (const insertedUid of insertedUids) {
            delete wiData.entries[insertedUid];
          }
          cfmToastr.error(
            `因为第 ${i + 1} 个条目「${entry.name}」失败，本次缝合已回滚`,
          );
          return null;
        }
      }

      const normalizedInsertIndex = Math.max(
        0,
        Math.min(
          Number.isInteger(insertIndex) ? insertIndex : existingEntries.length,
          existingEntries.length,
        ),
      );
      const orderedEntries = existingEntries
        .map((entry) => entry?.raw)
        .filter((entry) => entry && typeof entry === "object");
      orderedEntries.splice(normalizedInsertIndex, 0, ...insertedEntries);
      orderedEntries.forEach((entry, index) => {
        entry.displayIndex = index;
      });

      await saveWorldInfoDetailData(targetBookName, wiData);
      cfmToastr.success(
        `已将 ${insertedUids.length} 个条目互通到世界书「${targetBookName}」`,
      );
      if (getCurrentResourceType() === "worldinfo") await renderWorldInfoView();

      return {
        insertedCount: insertedUids.length,
        targetType: "worldinfo",
        targetName: targetBookName,
      };
    } catch (err) {
      console.error("[CFM] 条目互通到世界书失败", err);
      cfmToastr.error(err?.message || `互通到世界书「${targetBookName}」失败`);
      return null;
    }
  }

  return {
    analyzePresetQuickUpdate,
    askEntryTransferNowOrLater,
    collectSourceEntries,
    executeEntryTransfer,
    executePresetQuickUpdate,
    getEntryTransferInsertItems,
    getEntryTransferMemoGroupFreshEntries,
    getPresetQuickUpdateOptions,
    getEntryTransferPostActionMode,
    openEntryTransferInsertDialog,
    openEntryTransferTargetDialog,
    revealEntryTransferTargetResource,
    revealTransferredPresetTarget,
    revealTransferredWorldInfoTarget,
    setEntryTransferPostActionMode,
    setEntryTransferTargetTab,
    showBatchProgressOverlay,
    showEntryTransferCompletionDialog,
    showEntryTransferPopup,
    showEntryTransferProgressLoading,
    transferToPreset,
    transferToWorldInfo,
    updateEntryTransferMemoGroupFromSource,
  };
}
