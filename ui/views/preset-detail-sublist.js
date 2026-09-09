// 预设详情子列表组件层：承接预设详情子列表 DOM 组装、批量操作工具栏与分组编辑弹窗；
// 预设详情业务 API（字段增删改/激活/排序）仍由 index.js 的 createPresetDetailApi 薄包装提供。

export function createPresetDetailSublistApi(deps) {
  const state = deps.state;
  const {
    $,
    applyPresetDetailBatchActivation,
    batchDeletePresetDetailFields,
    cfmIsTouchDevice,
    cfmToastr,
    deletePresetDetailActivePreset,
    deletePresetDetailField,
    duplicatePresetDetailField,
    editPresetDetailField,
    ensureCurrentAppliedPreset,
    escapeHtml,
    flashDraggedElement,
    getContext,
    getEntryTransferInsertItems,
    getPresetDataForDetail,
    getPresetDetailActivePresets,
    getPresetDetailFields,
    isCurrentAppliedPreset,
    movePresetDetailFieldByStep,
    movePresetDetailFieldsToIndex,
    normalizePresetDetailFieldKeys,
    openEntryTransferInsertDialog,
    recordTouchTapStart,
    refreshPresetPanelView,
    renamePresetDetailActivePreset,
    savePresetDetailActivePreset,
    savePresetDetailPromptOrder,
    setPresetDetailAppliedPresetIndices,
    shouldIgnoreTouchTapAfterMove,
    showEntryTransferPopup,
    showPresetDetailGroupPanel,
    togglePresetDetailBatchItem,
    togglePresetDetailFieldActivation,
  } = deps;

  function renderPresetDetailSubList(presetRow, preset) {
    presetRow.next(".cfm-preset-detail-sublist").remove();

    const pm = getContext().getPresetManager();
    if (!pm) return;
    const presetData = getPresetDataForDetail(pm, preset.name);
    if (!presetData) return;

    // 不再过滤带 sourceLabel 的内置条目（charDescription/personaDescription 等），
    // 这些条目来自角色卡/世界书，需要在详情列表中展示（带"来源地址"标签，仅可编辑）。
    // 此前此处 filter 会把 getPresetDetailFields 已生成的内置字段整批丢弃，导致详情不显示它们。
    const fields = getPresetDetailFields(presetData);
    const isCurrentApplied = isCurrentAppliedPreset(preset.name);
    const isBatchOwner =
      state.cfmPresetDetailBatchMode &&
      state.cfmPresetDetailBatchOwnerName === preset.name;
    const subList = $(
      '<div class="cfm-chat-sublist cfm-preset-detail-sublist"></div>',
    );
    const detailCard = $(
      '<div class="cfm-chat-toolbar cfm-persona-detail-card cfm-preset-detail-card"></div>',
    );

    const detailToolbar = $(`
      <div class="cfm-regex-toolbar cfm-preset-detail-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-preset-detail-group-btn" title="${isCurrentApplied ? "预设条目激活分组" : "仅当前应用的预设可使用分组"}" ${fields.length === 0 || !isCurrentApplied ? "disabled" : ""}><i class="fa-solid fa-layer-group"></i> 分组</button>
        <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-toggle ${isBatchOwner ? "cfm-regex-batch-active" : ""}" title="批量操作模式" ${fields.length === 0 ? "disabled" : ""}><i class="fa-solid fa-list-check"></i> ${isBatchOwner ? "退出批量" : "批量操作"}</button>
        <span class="cfm-regex-count">${fields.length} 个条目</span>
      </div>
    `);
    detailToolbar
      .find(".cfm-preset-detail-group-btn, .cfm-preset-detail-batch-toggle")
      .on("touchstart", (e) => recordTouchTapStart(e, "cfmPresetDetailTap"));
    detailToolbar
      .find(".cfm-preset-detail-group-btn")
      .on("click touchend", async (e) => {
        if (
          shouldIgnoreTouchTapAfterMove(e, {
            prefix: "cfmPresetDetailTap",
          })
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (!fields.length) return;
        if (!ensureCurrentAppliedPreset(preset.name, "预设分组")) return;
        await showPresetDetailGroupPanel(preset.name);
      });
    detailToolbar
      .find(".cfm-preset-detail-batch-toggle")
      .on("click touchend", (e) => {
        if (
          shouldIgnoreTouchTapAfterMove(e, {
            prefix: "cfmPresetDetailTap",
          })
        ) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (!fields.length) return;
        if (isBatchOwner) {
          state.cfmPresetDetailBatchMode = false;
          state.cfmPresetDetailBatchOwnerName = null;
          state.cfmPresetDetailBatchSelected.clear();
          state.cfmPresetDetailBatchRangeMode = false;
          state.cfmPresetDetailBatchLastClicked = null;
        } else {
          state.cfmPresetDetailBatchMode = true;
          state.cfmPresetDetailBatchOwnerName = preset.name;
          state.cfmPresetDetailBatchSelected.clear();
          state.cfmPresetDetailBatchRangeMode = false;
          state.cfmPresetDetailBatchLastClicked = null;
        }
        refreshPresetPanelView();
      });
    detailCard.append(detailToolbar);

    if (isBatchOwner && fields.length > 0) {
      const allSel =
        fields.length > 0 &&
        fields.every((field) =>
          state.cfmPresetDetailBatchSelected.has(field.key),
        );
      const selCount = fields.filter((field) =>
        state.cfmPresetDetailBatchSelected.has(field.key),
      ).length;
      const batchToolbar = $(`
        <div class="cfm-regex-batch-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-selall" title="全选/全不选">
            <i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}
          </button>
          <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-range ${state.cfmPresetDetailBatchRangeMode ? "cfm-range-active" : ""}" title="框选模式">
            <i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmPresetDetailBatchRangeMode ? "(开)" : ""}
          </button>
          <span class="cfm-regex-batch-count">${selCount > 0 ? `已选 ${selCount} 项` : ""}</span>
          <button class="cfm-btn cfm-btn-sm cfm-entry-transfer-btn" title="条目互通"><i class="fa-solid fa-right-left"></i> 互通</button>
          <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-move" title="移动所选条目到指定位置"><i class="fa-solid fa-arrows-up-down-left-right"></i> 换位置</button>
          <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-delete" title="删除所选条目"><i class="fa-solid fa-trash-can"></i> 删除</button>
          <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-activate" title="${isCurrentApplied ? "批量激活" : "仅当前应用的预设可使用激活"}" ${!isCurrentApplied ? "disabled" : ""}><i class="fa-solid fa-play"></i> 激活</button>
          <button class="cfm-btn cfm-btn-sm cfm-preset-detail-batch-deactivate" title="${isCurrentApplied ? "批量取消激活" : "仅当前应用的预设可使用取消激活"}" ${!isCurrentApplied ? "disabled" : ""}><i class="fa-solid fa-stop"></i> 取消激活</button>
        </div>
      `);
      batchToolbar
        .find(
          ".cfm-preset-detail-batch-selall, .cfm-preset-detail-batch-range, .cfm-entry-transfer-btn, .cfm-preset-detail-batch-move, .cfm-preset-detail-batch-delete, .cfm-preset-detail-batch-activate, .cfm-preset-detail-batch-deactivate",
        )
        .on("touchstart", (e) => recordTouchTapStart(e, "cfmPresetDetailTap"));
      batchToolbar
        .find(".cfm-preset-detail-batch-selall")
        .on("click touchend", (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          if (allSel) {
            fields.forEach((field) =>
              state.cfmPresetDetailBatchSelected.delete(field.key),
            );
          } else {
            fields.forEach((field) => {
              if (field?.key) state.cfmPresetDetailBatchSelected.add(field.key);
            });
          }
          refreshPresetPanelView();
        });
      batchToolbar
        .find(".cfm-preset-detail-batch-range")
        .on("click touchend", (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          state.cfmPresetDetailBatchRangeMode =
            !state.cfmPresetDetailBatchRangeMode;
          if (state.cfmPresetDetailBatchRangeMode)
            state.cfmPresetDetailBatchLastClicked = null;
          refreshPresetPanelView();
        });
      batchToolbar
        .find(".cfm-preset-detail-batch-activate")
        .on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          await applyPresetDetailBatchActivation(
            preset.name,
            Array.from(state.cfmPresetDetailBatchSelected),
            true,
          );
        });
      batchToolbar
        .find(".cfm-preset-detail-batch-deactivate")
        .on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          await applyPresetDetailBatchActivation(
            preset.name,
            Array.from(state.cfmPresetDetailBatchSelected),
            false,
          );
        });
      batchToolbar
        .find(".cfm-entry-transfer-btn")
        .on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          // 按列表可见顺序重排选中项（框选/跨选可能按点击顺序插入 Set）
          const visibleKeys = fields
            .map((field) => String(field?.key || ""))
            .filter(Boolean);
          const selected = visibleKeys.filter((key) =>
            state.cfmPresetDetailBatchSelected.has(key),
          );
          if (selected.length === 0) {
            cfmToastr.warning("请先选择要互通的条目");
            return;
          }
          const done = await showEntryTransferPopup(
            "preset",
            preset.name,
            selected,
          );
          // 互通完成或已存入备忘录后，清空选中，便于继续选择其它条目
          if (done) {
            state.cfmPresetDetailBatchSelected.clear();
            state.cfmPresetDetailBatchLastClicked = null;
            refreshPresetPanelView();
          }
        });
      batchToolbar
        .find(".cfm-preset-detail-batch-move")
        .on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          // 按列表可见顺序重排选中项
          const visibleKeys = fields
            .map((field) => String(field?.key || ""))
            .filter(Boolean);
          const selected = visibleKeys.filter((key) =>
            state.cfmPresetDetailBatchSelected.has(key),
          );
          if (selected.length === 0) {
            cfmToastr.warning("请先选择要移动的条目");
            return;
          }
          try {
            const existingItems = await getEntryTransferInsertItems(
              "preset",
              preset.name,
            );
            // 弹窗列表中排除当前选中的条目（它们将被"剪切"到目标位置）
            const selectedSet = new Set(selected);
            const moveableItems = existingItems.filter(
              (item) => !selectedSet.has(`prompts.${item.id}`),
            );
            const result = await openEntryTransferInsertDialog({
              sourceEntries: selected,
              targetType: "preset",
              targetName: preset.name,
              existingItems: moveableItems,
              title: "选择移动位置",
              description: `即将把 ${selected.length} 个条目移动到预设「${escapeHtml(preset.name)}」的新位置，请点击分隔线中间的 <i class='fa-solid fa-plus'></i> 选择移动目标位置；点击“移动到末尾”则直接放到最后。`,
              moveMode: true,
            });
            if (result && typeof result.targetIndex === "number") {
              await movePresetDetailFieldsToIndex(
                preset.name,
                selected,
                result.targetIndex,
              );
              state.cfmPresetDetailBatchSelected.clear();
              state.cfmPresetDetailBatchLastClicked = null;
              refreshPresetPanelView();
            }
          } catch (error) {
            console.error("[CFM] 移动预设条目失败:", error);
            cfmToastr.error(`移动失败: ${error.message || error}`);
          }
        });
      batchToolbar
        .find(".cfm-preset-detail-batch-delete")
        .on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const visibleKeys = fields
            .map((field) => String(field?.key || ""))
            .filter(Boolean);
          const selected = visibleKeys.filter((key) =>
            state.cfmPresetDetailBatchSelected.has(key),
          );
          if (selected.length === 0) {
            cfmToastr.warning("请先选择要删除的条目");
            return;
          }
          try {
            const deletedCount = await batchDeletePresetDetailFields(
              preset.name,
              selected,
            );
            if (deletedCount > 0) {
              state.cfmPresetDetailBatchSelected.clear();
              state.cfmPresetDetailBatchLastClicked = null;
              refreshPresetPanelView();
            }
          } catch (error) {
            console.error("[CFM] 批量删除预设条目失败:", error);
            cfmToastr.error(`删除失败: ${error.message || error}`);
          }
        });
      detailCard.append(batchToolbar);
    }

    if (fields.length === 0) {
      detailCard.append(`
        <div class="cfm-persona-detail-section cfm-preset-detail-section">
          <div class="cfm-persona-detail-label">预设详情</div>
          <div class="cfm-persona-detail-value"><span class="cfm-persona-detail-empty">无可展示条目</span></div>
        </div>
      `);
    } else {
      const canSortFields = fields.length > 1 && !isBatchOwner;
      for (const [index, field] of fields.entries()) {
        const fieldKey = String(field.key || "");
        const sourceLabel = String(field.sourceLabel || "").trim();
        const isExternalSourceField = !!sourceLabel;
        // 所有 prompts 条目（含内置 marker，如 charDescription/personaDescription 等）都参与排序，
        // 与原生 PromptManager 一致：顺序即注入顺序，用户有移动内置条目的需求。
        const isSortableField =
          canSortFields && fieldKey.startsWith("prompts.");
        const canMoveUp = isSortableField && index > 0;
        const canMoveDown = isSortableField && index < fields.length - 1;
        const sortButtonsHtml = isSortableField
          ? `<button class="cfm-sort-arrow-btn cfm-preset-detail-move-up ${canMoveUp ? "" : "cfm-sort-arrow-disabled"}" data-field="${escapeHtml(fieldKey)}" title="上移${escapeHtml(field.label)}"><i class="fa-solid fa-chevron-up"></i></button>
                <button class="cfm-sort-arrow-btn cfm-preset-detail-move-down ${canMoveDown ? "" : "cfm-sort-arrow-disabled"}" data-field="${escapeHtml(fieldKey)}" title="下移${escapeHtml(field.label)}"><i class="fa-solid fa-chevron-down"></i></button>`
          : "";
        const actionButtonsHtml = isExternalSourceField
          ? `<div class="cfm-chat-action-btn cfm-preset-detail-edit" data-field="${escapeHtml(fieldKey)}" title="编辑${escapeHtml(field.label)}"><i class="fa-solid fa-pen-to-square"></i></div>`
          : `<div class="cfm-chat-action-btn cfm-preset-detail-copy" data-field="${escapeHtml(fieldKey)}" title="复制${escapeHtml(field.label)}"><i class="fa-solid fa-copy"></i></div>
                <div class="cfm-chat-action-btn cfm-preset-detail-delete" data-field="${escapeHtml(fieldKey)}" title="删除${escapeHtml(field.label)}"><i class="fa-solid fa-trash-can"></i></div>
                <div class="cfm-chat-action-btn cfm-preset-detail-edit" data-field="${escapeHtml(fieldKey)}" title="编辑${escapeHtml(field.label)}"><i class="fa-solid fa-pen-to-square"></i></div>`;
        const isBatchSel =
          isBatchOwner && state.cfmPresetDetailBatchSelected.has(fieldKey);
        const row = $(`
          <div class="cfm-persona-detail-section cfm-preset-detail-section cfm-preset-detail-row ${isBatchSel ? "cfm-edit-row-selected" : ""}" data-field="${escapeHtml(fieldKey)}">
            <div class="cfm-persona-detail-label cfm-preset-detail-label">
              ${sortButtonsHtml}
              ${isBatchOwner ? `<div class="cfm-edit-checkbox ${isBatchSel ? "cfm-edit-checked" : ""}"><i class="fa-${isBatchSel ? "solid" : "regular"} fa-square${isBatchSel ? "-check" : ""}"></i></div>` : ""}
              <div class="cfm-wi-toggle cfm-preset-field-active-toggle ${field.enabled ? "cfm-wi-toggle-on" : ""}" data-field="${escapeHtml(fieldKey)}" title="${field.enabled ? "点击禁用" : "点击启用"}"><i class="fa-solid fa-toggle-${field.enabled ? "on" : "off"}"></i></div>
              <span class="cfm-preset-detail-label-text">${escapeHtml(field.label)}</span>
              <div class="cfm-chat-actions">
                ${actionButtonsHtml}
              </div>
            </div>
          </div>
        `);
        row
          .find(
            ".cfm-edit-checkbox, .cfm-preset-field-active-toggle, .cfm-preset-detail-move-up, .cfm-preset-detail-move-down, .cfm-preset-detail-copy, .cfm-preset-detail-delete, .cfm-preset-detail-edit",
          )
          .on("touchstart", (e) =>
            recordTouchTapStart(e, "cfmPresetDetailTap"),
          );

        if (isBatchOwner) {
          row.on("click", (e) => {
            if (
              $(e.target).closest(
                ".cfm-chat-actions, .cfm-edit-checkbox, .cfm-preset-field-active-toggle, .cfm-sort-arrow-btn",
              ).length
            )
              return;
            togglePresetDetailBatchItem(fieldKey, e.shiftKey, fields);
            refreshPresetPanelView();
          });
          row.find(".cfm-edit-checkbox").on("click touchend", (e) => {
            if (
              shouldIgnoreTouchTapAfterMove(e, {
                prefix: "cfmPresetDetailTap",
              })
            ) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            togglePresetDetailBatchItem(fieldKey, e.shiftKey, fields);
            refreshPresetPanelView();
          });
        }

        row
          .find(".cfm-preset-field-active-toggle")
          .on("click touchend", async (e) => {
            if (
              shouldIgnoreTouchTapAfterMove(e, {
                prefix: "cfmPresetDetailTap",
              })
            ) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const el = $(e.currentTarget);
            if (el.data("pending")) return;
            const currentFieldKey = String(el.data("field") || "");
            const newState = !el.hasClass("cfm-wi-toggle-on");
            el.data("pending", true);
            try {
              await togglePresetDetailFieldActivation(
                preset.name,
                currentFieldKey,
                newState,
              );
            } finally {
              el.data("pending", false);
            }
          });

        row
          .find(".cfm-preset-detail-move-up")
          .on("click touchend", async (e) => {
            if (
              shouldIgnoreTouchTapAfterMove(e, {
                prefix: "cfmPresetDetailTap",
              })
            ) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const currentFieldKey = $(e.currentTarget).data("field");
            await movePresetDetailFieldByStep(preset.name, currentFieldKey, -1);
            if (currentFieldKey) {
              flashDraggedElement(
                `.cfm-preset-detail-row[data-field="${$.escapeSelector(String(currentFieldKey))}"]`,
              );
            }
          });

        row
          .find(".cfm-preset-detail-move-down")
          .on("click touchend", async (e) => {
            if (
              shouldIgnoreTouchTapAfterMove(e, {
                prefix: "cfmPresetDetailTap",
              })
            ) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const currentFieldKey = $(e.currentTarget).data("field");
            await movePresetDetailFieldByStep(preset.name, currentFieldKey, 1);
            if (currentFieldKey) {
              flashDraggedElement(
                `.cfm-preset-detail-row[data-field="${$.escapeSelector(String(currentFieldKey))}"]`,
              );
            }
          });

        row.find(".cfm-preset-detail-copy").on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const currentFieldKey = $(e.currentTarget).data("field");
          await duplicatePresetDetailField(preset.name, currentFieldKey);
        });

        row
          .find(".cfm-preset-detail-delete")
          .on("click touchend", async (e) => {
            if (
              shouldIgnoreTouchTapAfterMove(e, {
                prefix: "cfmPresetDetailTap",
              })
            ) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const currentFieldKey = $(e.currentTarget).data("field");
            await deletePresetDetailField(preset.name, currentFieldKey);
          });

        row.find(".cfm-preset-detail-edit").on("click touchend", async (e) => {
          if (
            shouldIgnoreTouchTapAfterMove(e, {
              prefix: "cfmPresetDetailTap",
            })
          ) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const currentFieldKey = $(e.currentTarget).data("field");
          await editPresetDetailField(preset.name, currentFieldKey);
        });

        detailCard.append(row);
      }

      if (
        canSortFields &&
        typeof detailCard.sortable === "function" &&
        !cfmIsTouchDevice()
      ) {
        detailCard.sortable({
          // 所有 prompts 条目（含内置 marker）都参与拖拽排序
          items: '.cfm-preset-detail-row[data-field^="prompts."]',
          axis: "y",
          tolerance: "pointer",
          placeholder: "cfm-sort-placeholder",
          forcePlaceholderSize: true,
          distance: 4,
          cancel:
            ".cfm-chat-actions, .cfm-chat-action-btn, .cfm-edit-checkbox, .cfm-preset-field-active-toggle, .cfm-sort-arrow-btn, button, input, textarea, select, a",
          start: (_event, ui) => {
            ui.item.addClass("cfm-regex-dragging");
          },
          stop: async (_event, ui) => {
            const movedFieldKey = String(ui.item.data("field") || "").trim();
            ui.item.removeClass("cfm-regex-dragging");
            const orderedFieldKeys = detailCard
              .find('.cfm-preset-detail-row[data-field^="prompts."]')
              .map(function () {
                return String($(this).data("field") || "").trim();
              })
              .get()
              .filter(Boolean);
            await savePresetDetailPromptOrder(preset.name, orderedFieldKeys);
            if (movedFieldKey) {
              flashDraggedElement(
                `.cfm-preset-detail-row[data-field="${$.escapeSelector(movedFieldKey)}"]`,
              );
            }
          },
        });
        detailCard.disableSelection();
      }
    }

    subList.append(detailCard);
    presetRow.after(subList);
  }

  function showPresetDetailGroupEditPopup(presetName, preset) {
    if ($("#cfm-preset-detail-group-edit-overlay").length > 0) return;
    if (!ensureCurrentAppliedPreset(presetName, "预设分组")) return;

    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("无法获取预设管理器");
      return;
    }
    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }

    const fields = getPresetDetailFields(presetData).filter((field) =>
      String(field?.key || "").startsWith("prompts."),
    );
    const fieldSet = new Set(normalizePresetDetailFieldKeys(preset?.fields));
    const fieldsHtml =
      fields.length === 0
        ? '<div class="cfm-wi-preset-empty">暂无可编辑的预设条目</div>'
        : fields
            .map((field) => {
              const checked = fieldSet.has(String(field.key || ""))
                ? "checked"
                : "";
              return `<label class="cfm-wi-preset-edit-item">
          <input type="checkbox" value="${escapeHtml(String(field.key || ""))}" ${checked}>
          <i class="fa-solid fa-list-check" style="color:#a6e3a1;"></i>
          <span>${escapeHtml(String(field.label || field.key || "(未命名)"))}</span>
        </label>`;
            })
            .join("");

    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-preset-detail-group-edit-overlay">
        <div class="cfm-edit-popup cfm-wi-preset-edit-popup">
          <div class="cfm-edit-popup-title">编辑预设条目激活分组</div>
          <div class="cfm-edit-popup-names"><div class="cfm-edit-name-item">${escapeHtml(presetName)}</div></div>
          <div class="cfm-edit-field">
            <label>分组名称</label>
            <input type="text" class="cfm-edit-input" id="cfm-preset-detail-group-edit-name" value="${escapeHtml(preset.name || "未命名分组")}">
          </div>
          <div class="cfm-edit-field">
            <label>包含的预设条目</label>
            <div class="cfm-wi-preset-edit-search">
              <input type="text" class="cfm-edit-input" id="cfm-preset-detail-group-edit-filter" placeholder="搜索...">
            </div>
            <div class="cfm-wi-preset-edit-list">${fieldsHtml}</div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-edit-popup-cancel">取消</button>
            <button class="cfm-edit-popup-confirm">保存</button>
          </div>
        </div>
      </div>
    `);
    $("body").append(overlay);

    function applyEditFilters() {
      const q = overlay
        .find("#cfm-preset-detail-group-edit-filter")
        .val()
        .toLowerCase()
        .trim();
      overlay.find(".cfm-wi-preset-edit-item").each(function () {
        const name = $(this).find("span").text().toLowerCase();
        $(this).toggle(!q || name.includes(q));
      });
    }

    overlay
      .find("#cfm-preset-detail-group-edit-filter")
      .on("input", applyEditFilters);
    applyEditFilters();
    overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) overlay.remove();
    });
    overlay.find(".cfm-edit-popup-confirm").on("click", () => {
      if (!ensureCurrentAppliedPreset(presetName, "预设分组")) return;
      const newName = overlay
        .find("#cfm-preset-detail-group-edit-name")
        .val()
        .trim();
      if (!newName) {
        cfmToastr.warning("请输入分组名称");
        return;
      }
      const existingOther = getPresetDetailActivePresets(presetName).find(
        (p) => p.name === newName && p.name !== preset.name,
      );
      if (existingOther) {
        cfmToastr.warning(`分组名称「${newName}」已被使用`);
        return;
      }
      const newFields = [];
      overlay.find(".cfm-wi-preset-edit-item input:checked").each(function () {
        newFields.push($(this).val());
      });
      if (newFields.length === 0) {
        cfmToastr.warning("请至少选择一个预设条目");
        return;
      }
      if (newName !== preset.name) {
        renamePresetDetailActivePreset(presetName, preset.name, newName);
      }
      savePresetDetailActivePreset(presetName, newName, newFields);
      cfmToastr.success(
        `已更新激活分组「${newName}」（${newFields.length} 个预设条目）`,
      );
      overlay.remove();
    });
  }

  return { renderPresetDetailSubList, showPresetDetailGroupEditPopup };
}
