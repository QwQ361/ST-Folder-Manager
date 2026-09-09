// 世界书条目子列表视图：renderWorldInfoEntrySubList，渲染世界书条目编辑卡子列表（工具栏/批量操作/条目行/详情编辑面板）。
// 由 worldinfo 视图调用；状态经 state getter/setter 代理回 index.js 闭包，外部函数经 deps 注入。

export function createWorldInfoEntrySublistApi(deps) {
  const state = deps.state;

  async function renderWorldInfoEntrySubList(
    bookRow,
    bookName,
    refreshFn = deps.refreshWorldInfoPanelView,
    renderOptions = null,
  ) {
    const normalizedName = String(bookName || "");
    if (!normalizedName || !bookRow?.length) return;

    const existingSubList = bookRow.next(".cfm-worldinfo-entry-sublist");
    if (!deps.isWorldInfoEntryBookExpanded(bookName)) {
      existingSubList.remove();
      return;
    }

    const subList = existingSubList.length
      ? existingSubList
      : $(
          '<div class="cfm-chat-sublist cfm-preset-detail-sublist cfm-worldinfo-entry-sublist"></div>',
        );
    const existingDetailCard = subList
      .children(".cfm-worldinfo-entry-detail-card")
      .first();
    const detailCard = existingDetailCard.length
      ? existingDetailCard
      : $(
          '<div class="cfm-chat-toolbar cfm-persona-detail-card cfm-preset-detail-card cfm-worldinfo-entry-detail-card"></div>',
        );

    const renderMultiline = (value) =>
      deps.escapeHtml(String(value || "")).replace(/\n/g, "<br>");
    const renderListValue = (values) => {
      const normalized = Array.isArray(values)
        ? values.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      return normalized.length
        ? renderMultiline(normalized.join("、"))
        : '<span class="cfm-persona-detail-empty">无</span>';
    };

    const cachedEntries = Array.isArray(renderOptions?.cachedEntries)
      ? renderOptions.cachedEntries
      : null;
    const sortMode = deps.getWorldInfoEntryDetailSortMode();
    let worldInfoData = null;
    let entries = cachedEntries ? Array.from(cachedEntries) : [];
    const syncLocalEntrySnapshot = (
      entryUid,
      nextEntry,
      activeEntry = null,
    ) => {
      const safeUid = String(entryUid || "");
      if (!safeUid || !nextEntry) return;
      const clonedEntry = JSON.parse(JSON.stringify(nextEntry));
      const primaryKeys = Array.isArray(clonedEntry.key)
        ? clonedEntry.key.map((item) => String(item || "")).filter(Boolean)
        : [];
      const secondaryKeys = Array.isArray(clonedEntry.keysecondary)
        ? clonedEntry.keysecondary
            .map((item) => String(item || ""))
            .filter(Boolean)
        : [];
      const syncedEntry = {
        bookName: normalizedName,
        uid: safeUid,
        label: String(
          clonedEntry.comment ||
            primaryKeys[0] ||
            `条目 ${safeUid || "未命名"}`,
        ),
        comment: String(clonedEntry.comment || ""),
        content: String(clonedEntry.content || ""),
        primaryKeys,
        secondaryKeys,
        order: Number(clonedEntry.order ?? 0),
        displayIndex: Number(
          clonedEntry.displayIndex ?? Number.MAX_SAFE_INTEGER,
        ),
        depth: Number(clonedEntry.depth ?? 0),
        constant: !!clonedEntry.constant,
        enabled: !clonedEntry.disable,
        raw: clonedEntry,
      };
      const applySnapshot = (targetEntry) => {
        if (!targetEntry || String(targetEntry.uid || "") !== safeUid) return;
        Object.keys(targetEntry).forEach((key) => {
          if (!(key in syncedEntry)) delete targetEntry[key];
        });
        Object.assign(targetEntry, syncedEntry);
      };
      applySnapshot(activeEntry);
      const listEntry = entries.find(
        (item) => String(item?.uid || "") === safeUid,
      );
      if (listEntry && listEntry !== activeEntry) {
        applySnapshot(listEntry);
      }
    };
    const rerenderCurrentSubList = () => {
      state.cfmWorldInfoEntryLastFocusedName = normalizedName;
      renderWorldInfoEntrySubList(bookRow, normalizedName, refreshFn, {
        cachedEntries: entries,
      });
    };
    const scrollToEntryRow = (entryUid) => {
      const safeUid = String(entryUid || "");
      if (!safeUid) return;
      setTimeout(() => {
        const targetSubList = bookRow.next(".cfm-worldinfo-entry-sublist");
        const targetRow = targetSubList
          .find(".cfm-preset-detail-row")
          .filter(function () {
            return $(this).attr("data-entry-uid") === safeUid;
          })
          .first();
        if (targetRow.length) {
          deps.scrollElementIntoViewCentered(targetRow[0]);
        }
      }, 0);
    };
    try {
      if (!cachedEntries) {
        worldInfoData = await deps.fetchWorldInfoDetailData(normalizedName);
        entries = deps.getWorldInfoEntriesForDetail(
          normalizedName,
          worldInfoData,
          sortMode,
        );
      }
      entries = deps.sortWorldInfoEntriesForDetail(entries, sortMode);
    } catch (error) {
      console.error("[CFM] 加载世界书条目失败:", error);
      if (!bookRow.parent().length) return;
      detailCard.append(`
        <div class="cfm-persona-detail-section cfm-preset-detail-section">
          <div class="cfm-persona-detail-label">世界书条目</div>
          <div class="cfm-persona-detail-value"><span class="cfm-persona-detail-empty">加载失败：${deps.escapeHtml(error.message || String(error))}</span></div>
        </div>
      `);
      detailCard.empty();
      if (!existingDetailCard.length) {
        subList.append(detailCard);
      }
      if (!existingSubList.length) {
        bookRow.after(subList);
      }
      return;
    }

    if (!bookRow.parent().length) return;
    detailCard.empty();
    if (!existingDetailCard.length) {
      subList.append(detailCard);
    }
    if (!existingSubList.length) {
      bookRow.after(subList);
    }

    const isBatchOwner =
      state.cfmWorldInfoEntryBatchMode &&
      state.cfmWorldInfoEntryBatchOwnerName === normalizedName;
    const sortLabel = sortMode === "priority" ? "优先级" : "自定义";
    const detailToolbar = $(`
      <div class="cfm-regex-toolbar cfm-preset-detail-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-sort-toggle" ${entries.length === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-down-wide-short"></i> 排序：${sortLabel}</button>
        <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-toggle ${isBatchOwner ? "cfm-regex-batch-active" : ""}" ${entries.length === 0 ? "disabled" : ""}><i class="fa-solid fa-list-check"></i> ${isBatchOwner ? "退出批量" : "批量操作"}</button>
        <span class="cfm-regex-count">${entries.length} 个条目</span>
      </div>
    `);
    detailToolbar
      .find(
        ".cfm-worldinfo-entry-sort-toggle, .cfm-worldinfo-entry-batch-toggle",
      )
      .on("touchstart", (e) => deps.recordTouchTapStart(e, "cfmWorldInfoEntryTap"));
    detailToolbar
      .find(".cfm-worldinfo-entry-sort-toggle")
      .on("click touchend", (e) => {
        if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (!entries.length) return;
        deps.setWorldInfoEntryDetailSortMode(
          sortMode === "priority" ? "custom" : "priority",
        );
        rerenderCurrentSubList();
      });
    detailToolbar
      .find(".cfm-worldinfo-entry-batch-toggle")
      .on("click touchend", (e) => {
        if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (!entries.length) return;
        if (isBatchOwner) {
          state.cfmWorldInfoEntryBatchMode = false;
          state.cfmWorldInfoEntryBatchOwnerName = null;
          state.cfmWorldInfoEntryBatchSelected.clear();
          state.cfmWorldInfoEntryBatchRangeMode = false;
          state.cfmWorldInfoEntryBatchLastClicked = null;
        } else {
          state.cfmWorldInfoEntryBatchMode = true;
          state.cfmWorldInfoEntryBatchOwnerName = normalizedName;
          state.cfmWorldInfoEntryBatchSelected.clear();
          state.cfmWorldInfoEntryBatchRangeMode = false;
          state.cfmWorldInfoEntryBatchLastClicked = null;
          deps.setWorldInfoEntryBookExpanded(normalizedName, true);
        }
        rerenderCurrentSubList();
      });
    detailCard.append(detailToolbar);

    if (isBatchOwner && entries.length > 0) {
      const entryKeys = entries.map((entry) =>
        deps.getWorldInfoEntrySelectionKey(normalizedName, entry.uid),
      );
      const allSel =
        entryKeys.length > 0 &&
        entryKeys.every((key) => state.cfmWorldInfoEntryBatchSelected.has(key));
      const selCount = entryKeys.filter((key) =>
        state.cfmWorldInfoEntryBatchSelected.has(key),
      ).length;
      const batchToolbar = $(`
        <div class="cfm-regex-batch-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-selall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-range ${state.cfmWorldInfoEntryBatchRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmWorldInfoEntryBatchRangeMode ? "(开)" : ""}</button>
          <span class="cfm-regex-batch-count">${selCount > 0 ? `已选 ${selCount} 项` : ""}</span>
          <button class="cfm-btn cfm-btn-sm cfm-entry-transfer-btn"><i class="fa-solid fa-right-left"></i> 互通</button>
          <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-move"><i class="fa-solid fa-arrows-up-down-left-right"></i> 换位置</button>
          <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-delete"><i class="fa-solid fa-trash-can"></i> 删除</button>
          <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-activate"><i class="fa-solid fa-play"></i> 激活</button>
          <button class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-batch-deactivate"><i class="fa-solid fa-stop"></i> 取消激活</button>
        </div>
      `);
      batchToolbar
        .find(
          ".cfm-worldinfo-entry-batch-selall, .cfm-worldinfo-entry-batch-range, .cfm-entry-transfer-btn, .cfm-worldinfo-entry-batch-move, .cfm-worldinfo-entry-batch-delete, .cfm-worldinfo-entry-batch-activate, .cfm-worldinfo-entry-batch-deactivate",
        )
        .on("touchstart", (e) =>
          deps.recordTouchTapStart(e, "cfmWorldInfoEntryTap"),
        );
      batchToolbar
        .find(".cfm-worldinfo-entry-batch-selall")
        .on("click touchend", (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          if (allSel) {
            entryKeys.forEach((key) =>
              state.cfmWorldInfoEntryBatchSelected.delete(key),
            );
          } else {
            entryKeys.forEach((key) => state.cfmWorldInfoEntryBatchSelected.add(key));
          }
          rerenderCurrentSubList();
        });
      batchToolbar
        .find(".cfm-worldinfo-entry-batch-range")
        .on("click touchend", (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          state.cfmWorldInfoEntryBatchRangeMode = !state.cfmWorldInfoEntryBatchRangeMode;
          if (state.cfmWorldInfoEntryBatchRangeMode)
            state.cfmWorldInfoEntryBatchLastClicked = null;
          rerenderCurrentSubList();
        });
      batchToolbar
        .find(".cfm-worldinfo-entry-batch-activate")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          try {
            await deps.applyWorldInfoEntryBatchActivation(
              normalizedName,
              Array.from(state.cfmWorldInfoEntryBatchSelected),
              true,
            );
          } catch (error) {
            console.error("[CFM] 批量激活世界书条目失败:", error);
            deps.cfmToastr.error(`保存失败: ${error.message || error}`);
          }
        });
      batchToolbar
        .find(".cfm-worldinfo-entry-batch-deactivate")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          try {
            await deps.applyWorldInfoEntryBatchActivation(
              normalizedName,
              Array.from(state.cfmWorldInfoEntryBatchSelected),
              false,
            );
          } catch (error) {
            console.error("[CFM] 批量取消激活世界书条目失败:", error);
            deps.cfmToastr.error(`保存失败: ${error.message || error}`);
          }
        });
      batchToolbar
        .find(".cfm-entry-transfer-btn")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          // 按列表可见顺序重排选中项（框选/跨选可能按点击顺序插入 Set）
          const visibleKeys = entries.map((entry) =>
            deps.getWorldInfoEntrySelectionKey(normalizedName, entry.uid),
          );
          const selected = visibleKeys.filter((key) =>
            state.cfmWorldInfoEntryBatchSelected.has(key),
          );
          if (selected.length === 0) {
            deps.cfmToastr.warning("请先选择要互通的条目");
            return;
          }
          const done = await deps.showEntryTransferPopup(
            "worldinfo",
            normalizedName,
            selected,
          );
          // 互通完成或已存入备忘录后，清空选中，便于继续选择其它条目
          if (done) {
            state.cfmWorldInfoEntryBatchSelected.clear();
            state.cfmWorldInfoEntryBatchLastClicked = null;
            rerenderCurrentSubList();
          }
        });
      batchToolbar
        .find(".cfm-worldinfo-entry-batch-move")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          // 按列表可见顺序重排选中项
          const visibleKeys = entries.map((entry) =>
            deps.getWorldInfoEntrySelectionKey(normalizedName, entry.uid),
          );
          const selected = visibleKeys.filter((key) =>
            state.cfmWorldInfoEntryBatchSelected.has(key),
          );
          if (selected.length === 0) {
            deps.cfmToastr.warning("请先选择要移动的条目");
            return;
          }
          try {
            const existingItems = await deps.getEntryTransferInsertItems(
              "worldinfo",
              normalizedName,
            );
            // 弹窗列表中排除当前选中的条目（它们将被"剪切"到目标位置）
            const selectedUids = new Set(
              selected.map((key) => {
                const prefix = `${normalizedName}::`;
                return key.startsWith(prefix)
                  ? key.slice(prefix.length)
                  : key;
              }),
            );
            const moveableItems = existingItems.filter(
              (item) => !selectedUids.has(String(item?.id ?? "")),
            );
            const result = await deps.openEntryTransferInsertDialog({
              sourceEntries: selected,
              targetType: "worldinfo",
              targetName: normalizedName,
              existingItems: moveableItems,
              title: "选择移动位置",
              description: `即将把 ${selected.length} 个条目移动到世界书「${deps.escapeHtml(normalizedName)}」的新位置，请点击分隔线中间的 <i class='fa-solid fa-plus'></i> 选择移动目标位置；点击“移动到末尾”则直接放到最后。`,
              moveMode: true,
            });
            if (result && typeof result.targetIndex === "number") {
              const moved = await deps.moveWorldInfoEntriesToIndex(
                normalizedName,
                selected,
                result.targetIndex,
              );
              if (moved) {
                state.cfmWorldInfoEntryBatchSelected.clear();
                state.cfmWorldInfoEntryBatchLastClicked = null;
                rerenderCurrentSubList();
              }
            }
          } catch (error) {
            console.error("[CFM] 移动世界书条目失败:", error);
            deps.cfmToastr.error(`移动失败: ${error.message || error}`);
          }
        });
      batchToolbar
        .find(".cfm-worldinfo-entry-batch-delete")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const visibleKeys = entries.map((entry) =>
            deps.getWorldInfoEntrySelectionKey(normalizedName, entry.uid),
          );
          const selected = visibleKeys.filter((key) =>
            state.cfmWorldInfoEntryBatchSelected.has(key),
          );
          if (selected.length === 0) {
            deps.cfmToastr.warning("请先选择要删除的条目");
            return;
          }
          try {
            const deletedCount = await deps.batchDeleteWorldInfoEntries(
              normalizedName,
              selected,
            );
            if (deletedCount > 0) {
              state.cfmWorldInfoEntryBatchSelected.clear();
              state.cfmWorldInfoEntryBatchLastClicked = null;
              rerenderCurrentSubList();
            }
          } catch (error) {
            console.error("[CFM] 批量删除世界书条目失败:", error);
            deps.cfmToastr.error(`删除失败: ${error.message || error}`);
          }
        });
      detailCard.append(batchToolbar);
    }

    if (entries.length === 0) {
      detailCard.append(`
        <div class="cfm-persona-detail-section cfm-preset-detail-section">
          <div class="cfm-persona-detail-label">世界书条目</div>
          <div class="cfm-persona-detail-value"><span class="cfm-persona-detail-empty">暂无条目</span></div>
        </div>
      `);
      return;
    }

    for (const entry of entries) {
      const entryKey = deps.getWorldInfoEntrySelectionKey(normalizedName, entry.uid);
      const isBatchSel =
        isBatchOwner && state.cfmWorldInfoEntryBatchSelected.has(entryKey);
      const isDetailOpen = deps.isWorldInfoEntryDetailOpen(
        normalizedName,
        entry.uid,
      );
      const flags = [
        entry.raw?.constant ? "常量" : null,
        entry.raw?.vectorized ? "向量" : null,
        entry.raw?.selective ? "选择性" : null,
      ].filter(Boolean);
      // 构建条目可编辑控件
      const rawPos = Number(entry.raw?.position ?? 0);
      const rawDepth = Number(entry.raw?.depth ?? 4);
      const rawRole = Number(entry.raw?.role ?? 0);
      const rawOrder = Number(entry.raw?.order ?? 0);
      const rawProb = Number(entry.raw?.probability ?? 100);
      const isAtDepth = rawPos === 4;
      // 计算条目状态：constant > vectorized > normal
      const entryState = entry.raw?.constant
        ? "constant"
        : entry.raw?.vectorized
          ? "vectorized"
          : "normal";
      // 构建条目状态下拉菜单选项（🔵常量 / 🟢普通 / 🔗向量化）
      const stateOptions = [
        { value: "constant", label: "🔵" },
        { value: "normal", label: "🟢" },
        { value: "vectorized", label: "🔗" },
      ];
      const stateSelectHtml = stateOptions
        .map((opt) => {
          const selected = entryState === opt.value ? " selected" : "";
          return `<option value="${opt.value}"${selected}>${opt.label}</option>`;
        })
        .join("");
      // 构建 Position 下拉菜单选项（中文标签与酒馆原生一致）
      const posOptions = [
        { value: "0", role: "", label: "角色定义之前" },
        { value: "1", role: "", label: "角色定义之后" },
        { value: "5", role: "", label: "示例消息前（↑EM）" },
        { value: "6", role: "", label: "示例消息后（↓EM）" },
        { value: "2", role: "", label: "作者注释之前" },
        { value: "3", role: "", label: "作者注释之后" },
        { value: "4", role: "0", label: "@D ⚙️ [系统]在深度" },
        { value: "4", role: "1", label: "@D 👤 [用户]在深度" },
        { value: "4", role: "2", label: "@D 🤖 [AI]在深度" },
        { value: "7", role: "", label: "➡️ Outlet" },
      ];
      const posSelectHtml = posOptions
        .map((opt) => {
          const selected =
            String(rawPos) === opt.value &&
            (opt.value !== "4" || String(rawRole) === opt.role)
              ? " selected"
              : "";
          return `<option value="${opt.value}" data-role="${opt.role}"${selected}>${deps.escapeHtml(opt.label)}</option>`;
        })
        .join("");
      const row = $(`
        <div class="cfm-persona-detail-section cfm-preset-detail-section cfm-preset-detail-row ${isBatchSel ? "cfm-edit-row-selected" : ""}" data-entry-uid="${deps.escapeHtml(entry.uid)}">
          <div class="cfm-persona-detail-label cfm-preset-detail-label">
            ${isBatchOwner ? `<div class="cfm-edit-checkbox ${isBatchSel ? "cfm-edit-checked" : ""}"><i class="fa-${isBatchSel ? "solid" : "regular"} fa-square${isBatchSel ? "-check" : ""}"></i></div>` : ""}
            <div class="cfm-wi-toggle cfm-worldinfo-entry-active-toggle ${entry.enabled ? "cfm-wi-toggle-on" : ""}" data-entry-uid="${deps.escapeHtml(entry.uid)}" title="${entry.enabled ? "点击取消激活" : "点击激活"}"><i class="fa-solid fa-toggle-${entry.enabled ? "on" : "off"}"></i></div>
            <span class="cfm-preset-detail-label-text">${deps.escapeHtml(entry.label)}</span>
            <div class="cfm-wi-entry-controls">
              <select class="cfm-wi-ctrl cfm-wi-ctrl-state" title="条目状态：🔵常量 🟢普通 🔗向量化">${stateSelectHtml}</select>
              <select class="cfm-wi-ctrl cfm-wi-ctrl-position" title="插入位置">${posSelectHtml}</select>
              <input class="cfm-wi-ctrl cfm-wi-ctrl-depth" type="number" value="${rawDepth}" min="0" max="9999" title="深度" ${isAtDepth ? "" : "disabled"} />
              <input class="cfm-wi-ctrl cfm-wi-ctrl-order" type="number" value="${rawOrder}" min="0" max="9999" title="顺序" />
              <div class="cfm-wi-ctrl-prob-wrap"><input class="cfm-wi-ctrl cfm-wi-ctrl-prob" type="number" value="${rawProb}" min="0" max="100" title="触发概率%" /><span class="cfm-wi-ctrl-prob-suffix">%</span></div>
            </div>
            <div class="cfm-chat-actions">
              <div class="cfm-chat-action-btn cfm-worldinfo-entry-duplicate" data-entry-uid="${deps.escapeHtml(entry.uid)}" title="复制条目"><i class="fa-solid fa-paste"></i></div>
              <div class="cfm-chat-action-btn cfm-worldinfo-entry-delete" data-entry-uid="${deps.escapeHtml(entry.uid)}" title="删除条目"><i class="fa-solid fa-trash-can"></i></div>
              <div class="cfm-chat-action-btn cfm-worldinfo-entry-edit" data-entry-uid="${deps.escapeHtml(entry.uid)}" title="${isDetailOpen ? "收起条目详情" : "查看条目详情"}"><i class="fa-solid fa-chevron-${isDetailOpen ? "up" : "down"}"></i></div>
            </div>
          </div>
          ${isDetailOpen ? deps.buildWorldInfoEntryDetailHtml(entry) : ""}
        </div>
      `);
      row
        .find(
          ".cfm-edit-checkbox, .cfm-worldinfo-entry-active-toggle, .cfm-worldinfo-entry-edit, .cfm-worldinfo-entry-duplicate, .cfm-worldinfo-entry-delete",
        )
        .on("touchstart", (e) =>
          deps.recordTouchTapStart(e, "cfmWorldInfoEntryTap"),
        );

      if (isBatchOwner) {
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-chat-actions, .cfm-edit-checkbox, .cfm-worldinfo-entry-active-toggle, .cfm-wi-entry-controls",
            ).length
          ) {
            return;
          }
          deps.toggleWorldInfoEntryBatchItem(
            normalizedName,
            entry.uid,
            e.shiftKey,
            entries,
          );
          rerenderCurrentSubList();
        });
        row.find(".cfm-edit-checkbox").on("click touchend", (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          deps.toggleWorldInfoEntryBatchItem(
            normalizedName,
            entry.uid,
            e.shiftKey,
            entries,
          );
          rerenderCurrentSubList();
        });
      }

      row
        .find(".cfm-worldinfo-entry-active-toggle")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const el = $(e.currentTarget);
          if (el.data("pending")) return;
          const currentUid = String(el.data("entry-uid") || "");
          const newState = !el.hasClass("cfm-wi-toggle-on");
          el.data("pending", true);
          try {
            await deps.toggleWorldInfoEntryActivation(
              normalizedName,
              currentUid,
              newState,
            );
            refreshFn();
          } catch (error) {
            console.error("[CFM] 切换世界书条目激活失败:", error);
            deps.cfmToastr.error(`保存失败: ${error.message || error}`);
          } finally {
            el.data("pending", false);
          }
        });

      row.find(".cfm-worldinfo-entry-edit").on("click touchend", (e) => {
        if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        deps.toggleWorldInfoEntryDetail(normalizedName, entry.uid);
        deps.setWorldInfoEntryBookExpanded(normalizedName, true);
        rerenderCurrentSubList();
      });

      // 复制条目按钮事件
      row
        .find(".cfm-worldinfo-entry-duplicate")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const el = $(e.currentTarget);
          if (el.data("pending")) return;
          el.data("pending", true);
          try {
            const newEntry = await deps.duplicateWorldInfoEntryInBook(
              normalizedName,
              entry.uid,
            );
            if (newEntry) {
              deps.cfmToastr.success(`已复制条目「${deps.escapeHtml(entry.label)}」`);
              // 清除缓存，强制重新获取数据
              refreshFn();
              // 高亮闪烁新复制的条目
              deps.flashDraggedElement(
                `.cfm-preset-detail-row[data-entry-uid="${newEntry.uid}"]`,
                300,
              );
            }
          } catch (error) {
            console.error("[CFM] 复制世界书条目失败:", error);
            deps.cfmToastr.error(`复制失败: ${error.message || error}`);
          } finally {
            el.data("pending", false);
          }
        });

      // 删除条目按钮事件
      row
        .find(".cfm-worldinfo-entry-delete")
        .on("click touchend", async (e) => {
          if (deps.shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const el = $(e.currentTarget);
          if (el.data("pending")) return;
          el.data("pending", true);
          try {
            const deleted = await deps.deleteWorldInfoEntryInBook(
              normalizedName,
              entry.uid,
            );
            if (deleted) {
              deps.cfmToastr.success(`已删除条目「${deps.escapeHtml(entry.label)}」`);
              // 从批量选中集合中移除
              const entryKey = deps.getWorldInfoEntrySelectionKey(
                normalizedName,
                entry.uid,
              );
              state.cfmWorldInfoEntryBatchSelected.delete(entryKey);
              // 关闭该条目的详情（如果已打开）
              const openSet = deps.getWorldInfoEntryOpenSet(normalizedName);
              if (openSet) openSet.delete(String(entry.uid));
              // 清除缓存，强制重新获取数据
              refreshFn();
            }
          } catch (error) {
            console.error("[CFM] 删除世界书条目失败:", error);
            deps.cfmToastr.error(`删除失败: ${error.message || error}`);
          } finally {
            el.data("pending", false);
          }
        });

      // 世界书条目行内编辑控件事件
      row.find(".cfm-wi-ctrl-position").on("change", async function (e) {
        e.stopPropagation();
        const sel = $(this);
        const selectedOption = sel.find("option:selected");
        const newPos = Number(selectedOption.val());
        const newRole =
          selectedOption.data("role") !== ""
            ? Number(selectedOption.data("role"))
            : undefined;
        const depthInput = row.find(".cfm-wi-ctrl-depth");
        depthInput.prop("disabled", newPos !== 4);
        try {
          const wiData = await deps.fetchWorldInfoDetailData(normalizedName);
          const target = wiData?.entries?.[entry.uid];
          if (!target) return;
          target.position = newPos;
          if (newRole !== undefined) target.role = newRole;
          await deps.saveWorldInfoDetailData(normalizedName, wiData);
        } catch (err) {
          console.error("[CFM] 保存插入位置失败:", err);
          deps.cfmToastr.error(`保存失败: ${err.message || err}`);
        }
      });
      row.find(".cfm-wi-ctrl-depth").on("change", async function (e) {
        e.stopPropagation();
        const val = Number($(this).val()) || 0;
        try {
          const wiData = await deps.fetchWorldInfoDetailData(normalizedName);
          const target = wiData?.entries?.[entry.uid];
          if (!target) return;
          target.depth = val;
          await deps.saveWorldInfoDetailData(normalizedName, wiData);
        } catch (err) {
          console.error("[CFM] 保存深度失败:", err);
          deps.cfmToastr.error(`保存失败: ${err.message || err}`);
        }
      });
      row.find(".cfm-wi-ctrl-order").on("change", async function (e) {
        e.stopPropagation();
        const val = Number($(this).val()) || 0;
        try {
          const wiData = await deps.fetchWorldInfoDetailData(normalizedName);
          const target = wiData?.entries?.[entry.uid];
          if (!target) return;
          target.order = val;
          await deps.saveWorldInfoDetailData(normalizedName, wiData);
        } catch (err) {
          console.error("[CFM] 保存顺序失败:", err);
          deps.cfmToastr.error(`保存失败: ${err.message || err}`);
        }
      });
      row.find(".cfm-wi-ctrl-prob").on("change", async function (e) {
        e.stopPropagation();
        let val = Number($(this).val());
        if (isNaN(val)) val = 100;
        val = Math.max(0, Math.min(100, val));
        $(this).val(val);
        try {
          const wiData = await deps.fetchWorldInfoDetailData(normalizedName);
          const target = wiData?.entries?.[entry.uid];
          if (!target) return;
          target.probability = val;
          await deps.saveWorldInfoDetailData(normalizedName, wiData);
        } catch (err) {
          console.error("[CFM] 保存触发概率失败:", err);
          deps.cfmToastr.error(`保存失败: ${err.message || err}`);
        }
      });
      row.find(".cfm-wi-ctrl-state").on("change", async function (e) {
        e.stopPropagation();
        const val = $(this).val();
        try {
          const wiData = await deps.fetchWorldInfoDetailData(normalizedName);
          const target = wiData?.entries?.[entry.uid];
          if (!target) return;
          // 根据选择的状态设置 constant 和 vectorized
          target.constant = val === "constant";
          target.vectorized = val === "vectorized";
          await deps.saveWorldInfoDetailData(normalizedName, wiData);
        } catch (err) {
          console.error("[CFM] 保存条目状态失败:", err);
          deps.cfmToastr.error(`保存失败: ${err.message || err}`);
        }
      });
      // 阻止控件区域的 click 冒泡（避免影响批量选择等）
      row
        .find(".cfm-wi-entry-controls")
        .on("click", (e) => e.stopPropagation());

      // ===== 世界书条目详情编辑面板事件绑定 =====
      if (isDetailOpen) {
        const detailPanel = row.find(".cfm-wi-de");
        // 阻止详情面板点击冒泡
        detailPanel.on("click", (e) => e.stopPropagation());

        // --- debounce 工具 ---
        let _wiDetailSaveTimer = null;
        const debouncedSave = (fn, delay = 500) => {
          clearTimeout(_wiDetailSaveTimer);
          _wiDetailSaveTimer = setTimeout(fn, delay);
        };

        // --- 通用保存辅助 ---
        const saveField = async (fieldSetter, errorLabel = "保存") => {
          try {
            const wiData = await deps.fetchWorldInfoDetailData(normalizedName);
            const target = wiData?.entries?.[entry.uid];
            if (!target) return;
            fieldSetter(target, wiData);
            syncLocalEntrySnapshot(entry.uid, target, entry);
            await deps.saveWorldInfoDetailData(normalizedName, wiData);
          } catch (err) {
            console.error(`[CFM] ${errorLabel}失败:`, err);
            deps.cfmToastr.error(`${errorLabel}失败: ${err.message || err}`);
          }
        };

        // --- 1. 主触发词 ---
        detailPanel.find('[name="cfm_wi_key"]').on("input", function () {
          const val = $(this).val();
          debouncedSave(async () => {
            await saveField((t) => {
              t.key = val
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            }, "保存主触发词");
          });
        });

        // --- 2. 逻辑类型 ---
        detailPanel
          .find('[name="cfm_wi_logic"]')
          .on("change", async function () {
            const val = Number($(this).val());
            await saveField((t) => {
              t.selectiveLogic = val;
            }, "保存逻辑类型");
          });

        // --- 3. 次触发词 ---
        detailPanel
          .find('[name="cfm_wi_keysecondary"]')
          .on("input", function () {
            const val = $(this).val();
            debouncedSave(async () => {
              await saveField((t) => {
                t.keysecondary = val
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
              }, "保存次触发词");
            });
          });

        deps.bindTouchSafeTap(
          detailPanel.find(".cfm-worldinfo-entry-collapse-btn"),
          () => {
            state.cfmWorldInfoEntryLastFocusedName = normalizedName;
            deps.toggleWorldInfoEntryDetail(normalizedName, entry.uid);
            deps.setWorldInfoEntryBookExpanded(normalizedName, true);
            rerenderCurrentSubList();
            scrollToEntryRow(entry.uid);
          },
        );

        // --- 4. 条目名称 ---
        detailPanel.find('[name="cfm_wi_comment"]').on("input", function () {
          const val = $(this).val();
          debouncedSave(async () => {
            await saveField((t) => {
              t.comment = val;
            }, "保存条目名称");
          });
        });

        // --- 5. 内容 ---
        detailPanel.find('[name="cfm_wi_content"]').on("input", function () {
          const val = $(this).val();
          debouncedSave(async () => {
            await saveField((t) => {
              t.content = val;
            }, "保存内容");
            // 更新 token 计数
            try {
              const tokenCount = await deps.getContext().getTokenCountAsync(val);
              detailPanel.find(".cfm-wi-de-token-count").text(tokenCount);
            } catch (_) {
              /* ignore */
            }
          });
        });
        // 初始化 token 计数
        (async () => {
          try {
            const tokenCount = await deps.getContext().getTokenCountAsync(
              entry.content || "",
            );
            detailPanel.find(".cfm-wi-de-token-count").text(tokenCount);
          } catch (_) {
            detailPanel.find(".cfm-wi-de-token-count").text("?");
          }
        })();

        // --- 6. Outlet名称 ---
        detailPanel.find('[name="cfm_wi_outletName"]').on("input", function () {
          const val = $(this).val();
          debouncedSave(async () => {
            await saveField((t) => {
              t.outletName = val;
            }, "保存Outlet名称");
          });
        });

        // --- 7. 扫描深度 ---
        detailPanel
          .find('[name="cfm_wi_scanDepth"]')
          .on("change", async function () {
            const raw = $(this).val();
            const val = raw === "" ? null : Number(raw);
            await saveField((t) => {
              t.scanDepth = val;
            }, "保存扫描深度");
          });

        // --- 8. 三态布尔下拉 ---
        const triStateSaves = [
          {
            name: "cfm_wi_caseSensitive",
            field: "caseSensitive",
            label: "区分大小写",
          },
          {
            name: "cfm_wi_matchWholeWords",
            field: "matchWholeWords",
            label: "全词匹配",
          },
          {
            name: "cfm_wi_useGroupScoring",
            field: "useGroupScoring",
            label: "分组评分",
          },
        ];
        for (const ts of triStateSaves) {
          detailPanel
            .find(`[name="${ts.name}"]`)
            .on("change", async function () {
              const raw = $(this).val();
              const val = raw === "null" ? null : raw === "true";
              await saveField((t) => {
                t[ts.field] = val;
              }, `保存${ts.label}`);
            });
        }

        // --- 9. 自动化ID ---
        detailPanel
          .find('[name="cfm_wi_automationId"]')
          .on("input", function () {
            const val = $(this).val();
            debouncedSave(async () => {
              await saveField((t) => {
                t.automationId = val;
              }, "保存自动化ID");
            });
          });

        // --- 10. 递归层级 ---
        detailPanel
          .find('[name="cfm_wi_recursionLevel"]')
          .on("input", function () {
            const val = $(this).val();
            debouncedSave(async () => {
              await saveField((t) => {
                if (val === "" || val === "1") {
                  t.delayUntilRecursion = t.delayUntilRecursion ? true : false;
                } else {
                  const num = Number(val);
                  t.delayUntilRecursion = !isNaN(num) ? num : false;
                }
              }, "保存递归层级");
            });
          });

        // --- 11. 包含组 ---
        detailPanel.find('[name="cfm_wi_group"]').on("input", function () {
          const val = $(this).val();
          debouncedSave(async () => {
            await saveField((t) => {
              t.group = val.trim();
            }, "保存包含组");
          });
        });

        // --- 12. 组权重 ---
        detailPanel
          .find('[name="cfm_wi_groupWeight"]')
          .on("change", async function () {
            const val = Number($(this).val()) || 100;
            await saveField((t) => {
              t.groupWeight = Math.max(1, Math.min(999999, val));
            }, "保存组权重");
          });

        // --- 13. 粘性 / 冷却 / 延迟 ---
        const numericFields = [
          { name: "cfm_wi_sticky", field: "sticky", label: "粘性" },
          { name: "cfm_wi_cooldown", field: "cooldown", label: "冷却" },
          { name: "cfm_wi_delay", field: "delay", label: "延迟" },
        ];
        for (const nf of numericFields) {
          detailPanel
            .find(`[name="${nf.name}"]`)
            .on("change", async function () {
              const raw = $(this).val();
              const val = raw === "" ? null : Math.max(0, Number(raw) || 0);
              await saveField((t) => {
                t[nf.field] = val;
              }, `保存${nf.label}`);
            });
        }

        // --- 14. 优先此条目 ---
        detailPanel
          .find('[name="cfm_wi_groupOverride"]')
          .on("change", async function () {
            const val = $(this).prop("checked");
            await saveField((t) => {
              t.groupOverride = val;
            }, "保存优先设置");
          });

        // --- 15. 选项复选框 ---
        const checkboxFields = [
          {
            name: "cfm_wi_excludeRecursion",
            field: "excludeRecursion",
            label: "不可被递归激活",
          },
          {
            name: "cfm_wi_preventRecursion",
            field: "preventRecursion",
            label: "阻止进一步递归",
          },
          {
            name: "cfm_wi_ignoreBudget",
            field: "ignoreBudget",
            label: "忽略预算",
          },
          { name: "cfm_wi_selective", field: "selective", label: "选择性" },
          {
            name: "cfm_wi_useProbability",
            field: "useProbability",
            label: "使用概率",
          },
        ];
        for (const cb of checkboxFields) {
          detailPanel
            .find(`[name="${cb.name}"]`)
            .on("change", async function () {
              const val = $(this).prop("checked");
              await saveField((t) => {
                t[cb.field] = val;
              }, `保存${cb.label}`);
            });
        }

        // --- 16. 延迟到递归 checkbox ---
        detailPanel
          .find('[name="cfm_wi_delayUntilRecursion"]')
          .on("change", async function () {
            const checked = $(this).prop("checked");
            await saveField((t) => {
              if (checked) {
                const levelInput = detailPanel
                  .find('[name="cfm_wi_recursionLevel"]')
                  .val();
                const lvl =
                  levelInput && levelInput !== "" && levelInput !== "1"
                    ? Number(levelInput)
                    : true;
                t.delayUntilRecursion =
                  !isNaN(lvl) && typeof lvl === "number" ? lvl : true;
              } else {
                t.delayUntilRecursion = false;
              }
            }, "保存延迟到递归");
          });

        // --- 17. 角色/标签过滤 ---
        detailPanel.find('[name="cfm_wi_charFilter"]').on("input", function () {
          const val = $(this).val();
          debouncedSave(async () => {
            await saveField((t) => {
              const names = val
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (names.length === 0) {
                delete t.characterFilter;
              } else {
                if (!t.characterFilter)
                  t.characterFilter = { isExclude: false, names: [], tags: [] };
                t.characterFilter.names = names;
              }
            }, "保存角色过滤");
          });
        });

        // --- 18. 角色过滤排除模式 ---
        detailPanel
          .find('[name="cfm_wi_charFilterExclude"]')
          .on("change", async function () {
            const val = $(this).prop("checked");
            await saveField((t) => {
              if (!t.characterFilter)
                t.characterFilter = { isExclude: false, names: [], tags: [] };
              t.characterFilter.isExclude = val;
            }, "保存角色过滤排除");
          });

        // --- 19. 生成类型触发 ---
        detailPanel
          .find('[name="cfm_wi_trigger"]')
          .on("change", async function () {
            const triggers = [];
            detailPanel
              .find('[name="cfm_wi_trigger"]:checked')
              .each(function () {
                triggers.push($(this).val());
              });
            await saveField((t) => {
              t.triggers = triggers;
            }, "保存生成类型触发");
          });

        // --- 20. 额外匹配源复选框 ---
        const matchFields = [
          {
            name: "cfm_wi_matchCharacterDescription",
            field: "matchCharacterDescription",
          },
          {
            name: "cfm_wi_matchCharacterPersonality",
            field: "matchCharacterPersonality",
          },
          { name: "cfm_wi_matchScenario", field: "matchScenario" },
          {
            name: "cfm_wi_matchPersonaDescription",
            field: "matchPersonaDescription",
          },
          {
            name: "cfm_wi_matchCharacterDepthPrompt",
            field: "matchCharacterDepthPrompt",
          },
          { name: "cfm_wi_matchCreatorNotes", field: "matchCreatorNotes" },
        ];
        for (const mf of matchFields) {
          detailPanel
            .find(`[name="${mf.name}"]`)
            .on("change", async function () {
              const val = $(this).prop("checked");
              await saveField((t) => {
                t[mf.field] = val;
              }, "保存匹配源");
            });
        }

        // --- 21. 额外匹配源折叠/展开 ---
        detailPanel.find(".cfm-wi-de-collapse-header").on("click", function () {
          const body = $(this).next(".cfm-wi-de-collapse-body");
          const icon = $(this).find(".cfm-wi-de-collapse-icon");
          body.slideToggle(200);
          icon.toggleClass("cfm-wi-de-collapse-open");
        });
      }

      detailCard.append(row);
    }
  }

  return { renderWorldInfoEntrySubList };
}
