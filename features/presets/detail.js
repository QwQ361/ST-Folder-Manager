// 预设详情层：承接预设详情字段、激活分组状态、字段编辑弹窗与后续 prompt 条目操作。

export function createPresetDetailApiCore(deps) {
  function getPresetDetailActivePresets(presetName) {
    deps.ensureSettings();
    const presetKey = String(presetName || "");
    if (!presetKey) return [];
    const store =
      deps.extensionSettings[deps.extensionName].presetDetailActivePresets || {};
    if (!Array.isArray(store[presetKey])) store[presetKey] = [];
    deps.extensionSettings[deps.extensionName].presetDetailActivePresets = store;
    return store[presetKey];
  }

  function getPresetDetailAppliedPresetIndices(presetName) {
    deps.ensureSettings();
    const presetKey = String(presetName || "");
    if (!presetKey) return [];
    const store =
      deps.extensionSettings[deps.extensionName]._presetDetailAppliedPresetIndices || {};
    if (!Array.isArray(store[presetKey])) store[presetKey] = [];
    deps.extensionSettings[deps.extensionName]._presetDetailAppliedPresetIndices = store;
    return store[presetKey];
  }

  function setPresetDetailAppliedPresetIndices(presetName, indices) {
    deps.ensureSettings();
    const presetKey = String(presetName || "");
    if (!presetKey) return;
    const store =
      deps.extensionSettings[deps.extensionName]._presetDetailAppliedPresetIndices || {};
    store[presetKey] = Array.from(
      new Set(
        (Array.isArray(indices) ? indices : []).filter(
          (idx) => Number.isInteger(idx) && idx >= 0,
        ),
      ),
    );
    deps.extensionSettings[deps.extensionName]._presetDetailAppliedPresetIndices = store;
    deps.saveSettingsDebounced();
  }

  function normalizePresetDetailFieldKeys(fieldKeys) {
    return Array.from(
      new Set(
        (Array.isArray(fieldKeys) ? fieldKeys : [])
          .map((fieldKey) => String(fieldKey || ""))
          .filter((fieldKey) => fieldKey.startsWith("prompts.")),
      ),
    );
  }

  function getAvailablePresetDetailFieldKeySet(presetData) {
    return new Set(
      getPresetDetailFields(presetData)
        .filter((field) => String(field?.key || "").startsWith("prompts."))
        .map((field) => String(field.key || ""))
        .filter(Boolean),
    );
  }

  function sanitizePresetDetailGroupState(
    presetName,
    presetData,
    save = false,
  ) {
    const presets = getPresetDetailActivePresets(presetName);
    const validFieldKeySet = getAvailablePresetDetailFieldKeySet(presetData);
    let presetChanged = false;
    let presetIdx = 0;
    for (const preset of presets) {
      if (!preset || typeof preset !== "object") continue;
      // name 兜底：缺失或空白的分组名补默认名，避免界面显示 undefined
      if (typeof preset.name !== "string" || !preset.name.trim()) {
        preset.name = `未命名分组 ${presetIdx + 1}`;
        presetChanged = true;
      }
      const prevFields = normalizePresetDetailFieldKeys(preset.fields);
      const nextFields = prevFields.filter((fieldKey) =>
        validFieldKeySet.has(fieldKey),
      );
      const sameFields =
        prevFields.length === nextFields.length &&
        prevFields.every((fieldKey, idx) => fieldKey === nextFields[idx]);
      if (!sameFields || !Array.isArray(preset.fields)) {
        preset.fields = nextFields;
        presetChanged = true;
      }
      presetIdx++;
    }
    const applied = getPresetDetailAppliedPresetIndices(presetName);
    const nextApplied = applied.filter(
      (idx) =>
        presets[idx] &&
        Array.isArray(presets[idx].fields) &&
        normalizePresetDetailFieldKeys(presets[idx].fields).length > 0,
    );
    const appliedChanged =
      applied.length !== nextApplied.length ||
      applied.some((idx, i) => idx !== nextApplied[i]);
    if (appliedChanged) {
      setPresetDetailAppliedPresetIndices(presetName, nextApplied);
    } else if (save && presetChanged) {
      deps.saveSettingsDebounced();
    }
    return {
      presets,
      validFieldKeySet,
      changed: presetChanged || appliedChanged,
    };
  }

  function savePresetDetailActivePreset(presetName, name, fieldKeys) {
    const presets = getPresetDetailActivePresets(presetName);
    const normalizedKeys = normalizePresetDetailFieldKeys(fieldKeys);
    const existing = presets.find((p) => p.name === name);
    if (existing) {
      existing.fields = normalizedKeys;
    } else {
      presets.push({ name, fields: normalizedKeys });
    }
    deps.saveSettingsDebounced();
  }

  function deletePresetDetailActivePreset(presetName, name) {
    const presets = getPresetDetailActivePresets(presetName);
    const remaining = presets.filter((p) => p.name !== name);
    deps.extensionSettings[deps.extensionName].presetDetailActivePresets[
      String(presetName || "")
    ] = remaining;
    deps.saveSettingsDebounced();
  }

  function renamePresetDetailActivePreset(presetName, oldName, newName) {
    const presets = getPresetDetailActivePresets(presetName);
    const target = presets.find((p) => p.name === oldName);
    if (target) {
      target.name = newName;
      deps.saveSettingsDebounced();
    }
  }

  function getEnabledPresetDetailFieldKeys(presetData) {
    return getPresetDetailFields(presetData)
      .filter(
        (field) =>
          !!field?.enabled && String(field?.key || "").startsWith("prompts."),
      )
      .map((field) => String(field.key || ""));
  }

  function setPresetDetailFieldsEnabled(presetData, fieldKeys, enabled) {
    const normalizedKeys = normalizePresetDetailFieldKeys(fieldKeys);
    let changedCount = 0;
    for (const fieldKey of normalizedKeys) {
      const promptKey = fieldKey.slice("prompts.".length);
      if (!promptKey) continue;
      setPresetPromptEnabled(presetData, promptKey, enabled);
      changedCount++;
    }
    return changedCount;
  }

  async function showPresetDetailFieldPopup(presetName, field) {
    if (!presetName || !field) return null;
    const currentValue = String(field.value || "");
    const multiline = currentValue.includes("\n") || currentValue.length > 120;
    const rows = multiline ? 10 : 6;
    const inputHtml = multiline
      ? `<textarea class="cfm-edit-input" id="cfm-preset-detail-input" rows="${rows}" placeholder="输入${deps.escapeHtml(field.label)}，留空则清空">${deps.escapeHtml(currentValue)}</textarea>`
      : `<input type="text" class="cfm-edit-input" id="cfm-preset-detail-input" value="${deps.escapeHtml(currentValue)}" placeholder="输入${deps.escapeHtml(field.label)}，留空则清空">`;

    const overlay = deps.$(`
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup cfm-preset-detail-popup">
          <div class="cfm-edit-popup-title">编辑预设条目</div>
          <div class="cfm-edit-popup-names"><div class="cfm-edit-name-item">${deps.escapeHtml(presetName)}</div></div>
          <div class="cfm-edit-popup-field">
            <label>${deps.escapeHtml(field.label)}</label>
            ${inputHtml}
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${currentValue ? '<button class="cfm-btn cfm-edit-popup-clear">清空</button>' : ""}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `);

    deps.$("body").append(overlay);
    const input = overlay.find("#cfm-preset-detail-input");
    input.trigger("focus");
    if (input.is("textarea")) {
      const node = input[0];
      if (node && typeof node.selectionStart === "number") {
        node.selectionStart = node.selectionEnd = node.value.length;
      }
    }

    return new Promise((resolve) => {
      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      overlay.find(".cfm-edit-popup-cancel").on("click", () => close(null));
      overlay.on("click", (e) => {
        if (deps.$(e.target).hasClass("cfm-edit-popup-overlay")) close(null);
      });
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        if (!deps.cfmConfirm(`确认清空${field.label}吗？`)) return;
        close("");
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        close(String(input.val() || "").trim());
      });
      input.on("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close(null);
        }
        if (e.key === "Enter" && !input.is("textarea")) {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
      });
    });
  }

function getPresetDataForDetail(pm, name) {
    const data = deps.getPresetDataForRename(pm, name);
    if (!data) return data;

    // 如果查看的是当前正在使用的预设，则从 serviceSettings（活跃设置）
    // 获取最新的 prompt_order，以反映在酒馆原生 UI 中的 remove/reorder 等操作。
    // 因为 detachPrompt 只修改 serviceSettings.prompt_order（即 oai_settings），
    // 而 getCompletionPresetByName 返回的是 presets 数组中的独立对象，
    // 其 prompt_order 未被同步更新。
    try {
      if (
        deps.isCurrentAppliedPreset(name) &&
        typeof pm.getPresetList === "function"
      ) {
        const { settings } = pm.getPresetList.call(pm);
        if (settings) {
          // 同步 prompt_order：detachPrompt/appendPrompt 等操作只修改 serviceSettings
          if (Array.isArray(settings.prompt_order)) {
            data.prompt_order = deps.structuredClone(settings.prompt_order);
          }
          // 同步 prompts：deletePrompt 等操作也只修改 serviceSettings.prompts
          if (Array.isArray(settings.prompts)) {
            data.prompts = deps.structuredClone(settings.prompts);
          }
        }
      }
    } catch (e) {
      deps.console.warn(
        "[Folder-Manager] getPresetDataForDetail: 获取活跃设置失败",
        e,
      );
    }

    return data;
  }



function getPresetDetailFields(preset) {
    if (!preset || typeof preset !== "object") return [];

    const promptMap = deps.getPresetPromptMap(preset);
    const promptOrder = deps.getPresetPromptOrderEntries(preset);
    const fields = [];
    const seen = new Set();

    const normalizeLabel = (label, fallback) => {
      const text = String(label ?? "").trim();
      return text || fallback;
    };

    const promptSourceLabels = {
      charDescription: "Character Description",
      charPersonality: "Character Personality",
      scenario: "Character Scenario",
      personaDescription: "Persona Description",
      worldInfoBefore: "World Info (↑Char)",
      worldInfoAfter: "World Info (↓Char)",
    };

    const addPromptField = (
      identifier,
      labelHint,
      promptValue,
      enabledHint,
    ) => {
      if (identifier === null || identifier === undefined) return;
      const keyId = String(identifier);
      if (!keyId || seen.has(keyId)) return;
      seen.add(keyId);
      fields.push({
        key: `prompts.${keyId}`,
        label: normalizeLabel(labelHint, keyId),
        value: deps.getPresetPromptText(promptValue),
        enabled: enabledHint !== false,
        sourceLabel: promptSourceLabels[keyId] || "",
      });
    };

    for (const item of promptOrder) {
      const identifier = deps.getPresetPromptOrderIdentifier(item);
      if (!identifier) continue;

      const promptValue = promptMap.get(identifier) ?? null;
      const promptLabel = deps.getPresetPromptLabel(
        promptValue,
        item?.name ?? item?.title ?? item?.label ?? identifier,
      );
      const promptEnabled =
        typeof item?.enabled === "boolean"
          ? item.enabled
          : typeof promptValue?.enabled === "boolean"
            ? promptValue.enabled
            : true;

      addPromptField(identifier, promptLabel, promptValue, promptEnabled);
    }

    return fields;
  }



function setPresetPromptEnabled(presetData, promptKey, enabled) {
    if (!presetData || !promptKey) return;

    deps.sanitizePresetPromptStructure(presetData);
    const normalizedKey = String(promptKey || "").trim();
    if (!normalizedKey) return;

    const currentPrompt = deps.getPresetPromptByKey(presetData, normalizedKey);
    if (currentPrompt && typeof currentPrompt === "object") {
      currentPrompt.enabled = !!enabled;
    }

    const entryLocation = deps.findPresetPromptOrderEntryLocation(
      presetData,
      normalizedKey,
      true,
    );
    const existingEntry = entryLocation?.item ?? null;

    if (existingEntry) {
      existingEntry.enabled = !!enabled;
      return;
    }

    entryLocation?.order?.push({
      identifier: normalizedKey,
      enabled: !!enabled,
    });
  }



async function togglePresetDetailFieldActivation(
    presetName,
    fieldKey,
    activate,
  ) {
    if (!fieldKey || !fieldKey.startsWith("prompts.")) return;

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }

    const promptKey = fieldKey.slice("prompts.".length);
    setPresetPromptEnabled(presetData, promptKey, activate);

    try {
      await deps.saveNormalizedPresetData(pm, presetName, presetData);
      deps.refreshPresetPanelView();
    } catch (error) {
      deps.console.error("[CFM] 切换预设条目激活状态失败:", error);
      deps.cfmToastr.error(`保存失败: ${error.message || error}`);
    }
  }



function togglePresetDetailBatchItem(fieldKey, shiftKey, fields) {
    const normalizedFields = Array.isArray(fields) ? fields : [];
    const visibleKeys = normalizedFields
      .map((field) => String(field?.key || ""))
      .filter(Boolean);
    const normalizedFieldKey = String(fieldKey || "");
    if (!normalizedFieldKey) return;

    if (
      (shiftKey || deps.state.cfmPresetDetailBatchRangeMode) &&
      deps.state.cfmPresetDetailBatchLastClicked
    ) {
      const lastIdx = visibleKeys.indexOf(
        deps.state.cfmPresetDetailBatchLastClicked,
      );
      const curIdx = visibleKeys.indexOf(normalizedFieldKey);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        for (let i = start; i <= end; i++) {
          if (visibleKeys[i]) deps.state.cfmPresetDetailBatchSelected.add(visibleKeys[i]);
        }
      }
    } else if (deps.state.cfmPresetDetailBatchSelected.has(normalizedFieldKey)) {
      deps.state.cfmPresetDetailBatchSelected.delete(normalizedFieldKey);
    } else {
      deps.state.cfmPresetDetailBatchSelected.add(normalizedFieldKey);
    }

    deps.state.cfmPresetDetailBatchLastClicked = normalizedFieldKey;
  }



async function applyPresetDetailBatchActivation(
    presetName,
    fieldKeys,
    activate,
  ) {
    if (!deps.ensureCurrentAppliedPreset(presetName, "批量操作")) return;
    const normalizedKeys = Array.from(
      new Set(
        (Array.isArray(fieldKeys) ? fieldKeys : [])
          .map((fieldKey) => String(fieldKey || ""))
          .filter(Boolean),
      ),
    );
    if (!normalizedKeys.length) {
      deps.cfmToastr.warning("请先选择要操作的预设条目");
      return;
    }

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }

    let changedCount = 0;
    for (const fieldKey of normalizedKeys) {
      if (!fieldKey.startsWith("prompts.")) continue;
      const promptKey = fieldKey.slice("prompts.".length);
      if (!promptKey) continue;
      setPresetPromptEnabled(presetData, promptKey, activate);
      changedCount++;
    }

    if (!changedCount) {
      deps.cfmToastr.warning("所选条目不支持批量激活操作");
      return;
    }

    try {
      await deps.saveNormalizedPresetData(pm, presetName, presetData);
      deps.cfmToastr.success(
        `已${activate ? "激活" : "取消激活"} ${changedCount} 个预设条目`,
      );
      deps.refreshPresetPanelView();
    } catch (error) {
      deps.console.error("[CFM] 批量切换预设条目激活状态失败:", error);
      deps.cfmToastr.error(`保存失败: ${error.message || error}`);
    }
  }



async function savePresetDetailPromptOrder(presetName, orderedFieldKeys) {
    const normalizedOrderedFieldKeys = Array.isArray(orderedFieldKeys)
      ? orderedFieldKeys
          .map((item) => String(item || "").trim())
          .filter((item) => item.startsWith("prompts."))
      : [];

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return false;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return false;
    }

    deps.sanitizePresetPromptStructure(presetData);

    // 所有 prompts 条目（含内置 marker，如 charDescription/personaDescription 等）都参与排序。
    const currentOrderedFieldKeys = getPresetDetailFields(presetData)
      .map((item) => String(item?.key || "").trim())
      .filter((item) => item.startsWith("prompts."));
    if (currentOrderedFieldKeys.length < 2) return false;

    const currentOrderedFieldKeySet = new Set(currentOrderedFieldKeys);
    const seenFieldKeys = new Set();
    const mergedOrderedFieldKeys = [];

    for (const fieldKey of normalizedOrderedFieldKeys) {
      if (
        !currentOrderedFieldKeySet.has(fieldKey) ||
        seenFieldKeys.has(fieldKey)
      ) {
        continue;
      }
      seenFieldKeys.add(fieldKey);
      mergedOrderedFieldKeys.push(fieldKey);
    }

    for (const fieldKey of currentOrderedFieldKeys) {
      if (seenFieldKeys.has(fieldKey)) continue;
      seenFieldKeys.add(fieldKey);
      mergedOrderedFieldKeys.push(fieldKey);
    }

    const orderChanged = currentOrderedFieldKeys.some(
      (fieldKey, index) => mergedOrderedFieldKeys[index] !== fieldKey,
    );
    if (!orderChanged) return false;

    const orderedPromptIds = mergedOrderedFieldKeys.map((item) =>
      item.slice("prompts.".length),
    );

    const promptList = deps.ensurePresetPromptList(presetData);
    const promptMap = deps.getPresetPromptMap(presetData);
    const reorderedPromptIdSet = new Set(orderedPromptIds);
    const reorderedPrompts = orderedPromptIds
      .map((promptId) => promptMap.get(promptId))
      .filter(Boolean);
    const reorderedPromptSet = new Set(reorderedPrompts);
    const leftoverPrompts = promptList.filter(
      (prompt) => prompt && !reorderedPromptSet.has(prompt),
    );
    promptList.length = 0;
    promptList.push(...reorderedPrompts, ...leftoverPrompts);

    const existingOrderItemMap = new Map();
    for (const item of deps.getAllPresetPromptOrderEntries(presetData)) {
      const identifier = deps.getPresetPromptOrderIdentifier(item);
      if (!identifier || existingOrderItemMap.has(identifier)) continue;
      existingOrderItemMap.set(identifier, item);
    }

    const primaryOrderContainer = deps.getPresetPromptOrderContainer(
      presetData,
      true,
    );
    if (!Array.isArray(primaryOrderContainer?.order)) {
      primaryOrderContainer.order = [];
    }

    // 全量按新顺序重建主容器 order：所有条目（含内置 marker）都参与排序。
    // 使用 existingOrderItemMap 中的条目对象（结构化克隆）以保留 enabled/role/injection 等字段。
    const rebuiltOrderItems = orderedPromptIds.map((promptId) => {
      let orderItem = existingOrderItemMap.get(promptId);
      orderItem =
        orderItem && typeof orderItem === "object"
          ? deps.structuredClone(orderItem)
          : { identifier: promptId };
      orderItem = deps.normalizePresetPromptOrderItemKeyFields(orderItem, promptId);

      const promptValue = promptMap.get(promptId);
      if (
        promptValue &&
        typeof orderItem?.enabled !== "boolean" &&
        typeof promptValue?.enabled === "boolean"
      ) {
        orderItem.enabled = promptValue.enabled;
      }
      return orderItem;
    });

    // 直接替换容器.order 引用而非原地修改：getPresetDetailFields 等调用会触发
    // ensurePresetPromptOrderContainers 重新 sanitize 并替换 order 数组引用，
    // 若在获取 primaryOrder 后再修改其内容，修改会落到被替换的旧数组上（表现为按钮失效）。
    primaryOrderContainer.order = rebuiltOrderItems;

    // 注意：不修改其它容器（character_id 非主容器的 prompt_order 容器）。
    // 这些容器（如 100000）由酒馆原生逻辑维护，删除其中条目会导致内置条目
    // 永久丢失（写入磁盘后刷新无法恢复）。主容器已包含完整、正确顺序的全部条目，
    // 其它容器保持原样即可。

    try {
      await deps.saveNormalizedPresetData(pm, presetName, presetData);
      deps.refreshPresetPanelView();
      return true;
    } catch (error) {
      deps.console.error("[CFM] 预设条目排序失败:", error);
      deps.cfmToastr.error(`排序失败: ${error.message || error}`);
      return false;
    }
  }



async function reorderPresetDetailField(
    presetName,
    sourceFieldKey,
    targetFieldKey,
  ) {
    const normalizedSourceFieldKey = String(sourceFieldKey || "").trim();
    const normalizedTargetFieldKey = String(targetFieldKey || "").trim();
    if (
      !normalizedSourceFieldKey.startsWith("prompts.") ||
      !normalizedTargetFieldKey.startsWith("prompts.")
    ) {
      return false;
    }

    const pm = deps.getContext().getPresetManager();
    const presetData = pm ? getPresetDataForDetail(pm, presetName) : null;
    if (!presetData) return false;

    const orderedFieldKeys = getPresetDetailFields(presetData)
      .map((item) => String(item?.key || "").trim())
      .filter((item) => item.startsWith("prompts."));
    const sourceIndex = orderedFieldKeys.indexOf(normalizedSourceFieldKey);
    const targetIndex = orderedFieldKeys.indexOf(normalizedTargetFieldKey);
    if (
      sourceIndex === -1 ||
      targetIndex === -1 ||
      sourceIndex === targetIndex
    ) {
      return false;
    }

    const [movedFieldKey] = orderedFieldKeys.splice(sourceIndex, 1);
    orderedFieldKeys.splice(targetIndex, 0, movedFieldKey);
    return savePresetDetailPromptOrder(presetName, orderedFieldKeys);
  }



async function movePresetDetailFieldByStep(presetName, fieldKey, step) {
    const normalizedFieldKey = String(fieldKey || "").trim();
    const normalizedStep = Number(step);
    if (
      !normalizedFieldKey.startsWith("prompts.") ||
      !Number.isInteger(normalizedStep) ||
      normalizedStep === 0
    ) {
      return false;
    }

    const pm = deps.getContext().getPresetManager();
    const presetData = pm ? getPresetDataForDetail(pm, presetName) : null;
    if (!presetData) return false;

    const orderedFieldKeys = getPresetDetailFields(presetData)
      .map((item) => String(item?.key || "").trim())
      .filter((item) => item.startsWith("prompts."));
    const sourceIndex = orderedFieldKeys.indexOf(normalizedFieldKey);
    const targetIndex = sourceIndex + normalizedStep;
    if (
      sourceIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= orderedFieldKeys.length
    ) {
      return false;
    }

    return reorderPresetDetailField(
      presetName,
      normalizedFieldKey,
      orderedFieldKeys[targetIndex],
    );
  }



async function duplicatePresetDetailField(presetName, fieldKey) {
    if (!String(fieldKey || "").startsWith("prompts.")) return;
    const promptKey = fieldKey.slice("prompts.".length);

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }

    // 内置条目（charDescription 等带 sourceLabel）来自角色卡/世界书，不可复制
    const sourceField = getPresetDetailFields(presetData).find(
      (item) => item.key === fieldKey,
    );
    if (!sourceField) {
      deps.cfmToastr.error("未找到可复制的预设条目");
      return;
    }
    if (String(sourceField.sourceLabel || "").trim()) {
      deps.cfmToastr.warning("内置条目（来自角色卡/世界书）不可复制");
      return;
    }

    const sourcePrompt = deps.getPresetPromptByKey(presetData, promptKey);
    if (!sourcePrompt) {
      deps.cfmToastr.error("预设条目不存在，无法复制");
      return;
    }

    const newPromptKey = deps.buildDuplicatedPresetPromptKey(
      new Set(deps.getPresetPromptMap(presetData).keys()),
      promptKey,
    );
    const existingLabels = new Set(
      getPresetDetailFields(presetData)
        .map((item) => String(item?.label || "").trim())
        .filter(Boolean),
    );
    const newPromptLabel = deps.buildDuplicatedPresetPromptLabel(
      existingLabels,
      sourceField.label,
    );

    let duplicatedPrompt =
      sourcePrompt && typeof sourcePrompt === "object"
        ? deps.structuredClone(sourcePrompt)
        : {
            identifier: newPromptKey,
            content: String(sourcePrompt ?? ""),
          };

    if (!duplicatedPrompt || typeof duplicatedPrompt !== "object") {
      duplicatedPrompt = {
        identifier: newPromptKey,
        content: "",
      };
    }

    duplicatedPrompt.identifier = newPromptKey;
    if (Object.prototype.hasOwnProperty.call(duplicatedPrompt, "id")) {
      duplicatedPrompt.id = newPromptKey;
    }
    if (Object.prototype.hasOwnProperty.call(duplicatedPrompt, "key")) {
      duplicatedPrompt.key = newPromptKey;
    }
    if (Object.prototype.hasOwnProperty.call(duplicatedPrompt, "prompt")) {
      duplicatedPrompt.prompt = newPromptKey;
    }

    if (Object.prototype.hasOwnProperty.call(duplicatedPrompt, "name")) {
      duplicatedPrompt.name = newPromptLabel;
    } else if (
      Object.prototype.hasOwnProperty.call(duplicatedPrompt, "title")
    ) {
      duplicatedPrompt.title = newPromptLabel;
    } else if (
      Object.prototype.hasOwnProperty.call(duplicatedPrompt, "label")
    ) {
      duplicatedPrompt.label = newPromptLabel;
    } else {
      duplicatedPrompt.name = newPromptLabel;
    }

    const sourcePromptIndex = deps.getPresetPromptIndexByKey(presetData, promptKey);
    const promptList = deps.ensurePresetPromptList(presetData);
    if (sourcePromptIndex === -1) {
      promptList.push(duplicatedPrompt);
    } else {
      promptList.splice(sourcePromptIndex + 1, 0, duplicatedPrompt);
    }

    const sourceOrderLocation = deps.findPresetPromptOrderEntryLocation(
      presetData,
      promptKey,
      true,
    );
    const promptOrderEntries = sourceOrderLocation?.order ?? [];
    const sourceOrderIndex = sourceOrderLocation?.index ?? -1;
    const sourceOrderItem = sourceOrderLocation?.item ?? null;
    const newOrderItem =
      sourceOrderItem && typeof sourceOrderItem === "object"
        ? deps.structuredClone(sourceOrderItem)
        : { identifier: newPromptKey };

    newOrderItem.identifier = newPromptKey;
    if (Object.prototype.hasOwnProperty.call(newOrderItem, "id")) {
      newOrderItem.id = newPromptKey;
    }
    if (Object.prototype.hasOwnProperty.call(newOrderItem, "key")) {
      newOrderItem.key = newPromptKey;
    }
    if (Object.prototype.hasOwnProperty.call(newOrderItem, "prompt")) {
      newOrderItem.prompt = newPromptKey;
    }
    newOrderItem.enabled = sourceField.enabled !== false;
    if (Object.prototype.hasOwnProperty.call(newOrderItem, "name")) {
      newOrderItem.name = newPromptLabel;
    }
    if (Object.prototype.hasOwnProperty.call(newOrderItem, "title")) {
      newOrderItem.title = newPromptLabel;
    }
    if (Object.prototype.hasOwnProperty.call(newOrderItem, "label")) {
      newOrderItem.label = newPromptLabel;
    }

    if (sourceOrderIndex === -1) {
      promptOrderEntries.push(newOrderItem);
    } else {
      promptOrderEntries.splice(sourceOrderIndex + 1, 0, newOrderItem);
    }

    try {
      await deps.saveNormalizedPresetData(pm, presetName, presetData);
      deps.cfmToastr.success(`已复制预设条目「${sourceField.label}」`);
      deps.refreshPresetPanelView();
      // 高亮闪烁新复制的预设条目
      deps.flashDraggedElement(
        `.cfm-preset-detail-row[data-field="prompts.${deps.$.escapeSelector(newPromptKey)}"]`,
        300,
      );
    } catch (error) {
      deps.console.error("[CFM] 复制预设条目失败:", error);
      deps.cfmToastr.error(`复制失败: ${error.message || error}`);
    }
  }



async function batchDeletePresetDetailFields(presetName, fieldKeys, silent = false) {
    const normalizedKeys = Array.from(
      new Set(
        (Array.isArray(fieldKeys) ? fieldKeys : [])
          .map((fieldKey) => String(fieldKey || ""))
          .filter((fieldKey) => fieldKey.startsWith("prompts.")),
      ),
    );
    if (!normalizedKeys.length) {
      deps.cfmToastr.warning("请先选择要删除的预设条目");
      return 0;
    }

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return 0;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return 0;
    }

    const fields = getPresetDetailFields(presetData);
    // 过滤内置条目（charDescription 等带 sourceLabel 的不可删除）
    const deletableKeys = normalizedKeys.filter((fieldKey) => {
      const field = fields.find((item) => item.key === fieldKey);
      return field && !String(field.sourceLabel || "").trim();
    });
    const blockedCount = normalizedKeys.length - deletableKeys.length;

    if (!deletableKeys.length) {
      deps.cfmToastr.warning("所选条目均为内置条目（来自角色卡/世界书），不可删除");
      return 0;
    }

    if (!silent) {
      const confirmed = deps.cfmConfirm(
        `确定要删除选中的 ${deletableKeys.length} 个预设条目吗？\n此操作不可撤销！${
          blockedCount > 0 ? `\n（另有 ${blockedCount} 个内置条目不可删除，已跳过）` : ""
        }`,
      );
      if (!confirmed) return 0;
    }

    const promptList = deps.ensurePresetPromptList(presetData);
    for (const fieldKey of deletableKeys) {
      const promptKey = fieldKey.slice("prompts.".length);
      const promptIndex = deps.getPresetPromptIndexByKey(presetData, promptKey);
      if (promptIndex !== -1) {
        promptList.splice(promptIndex, 1);
      }
    }

    const deletableKeySet = new Set(deletableKeys);
    for (const container of deps.ensurePresetPromptOrderContainers(presetData)) {
      if (!Array.isArray(container?.order)) continue;
      container.order = container.order.filter((item) => {
        const identifier = deps.getPresetPromptOrderIdentifier(item);
        return !deletableKeySet.has(`prompts.${identifier}`);
      });
    }

    for (const fieldKey of deletableKeys) {
      deps.state.cfmPresetDetailBatchSelected.delete(fieldKey);
      if (deps.state.cfmPresetDetailBatchLastClicked === fieldKey) {
        deps.state.cfmPresetDetailBatchLastClicked = null;
      }
    }

    try {
      await deps.saveNormalizedPresetData(pm, presetName, presetData);
      const msg = `已删除 ${deletableKeys.length} 个预设条目`;
      deps.cfmToastr.success(msg);
      deps.refreshPresetPanelView();
      return deletableKeys.length;
    } catch (error) {
      deps.console.error("[CFM] 批量删除预设条目失败:", error);
      deps.cfmToastr.error(`删除失败: ${error.message || error}`);
      return 0;
    }
  }

  async function movePresetDetailFieldsToIndex(presetName, fieldKeys, targetIndex) {
    const normalizedKeys = Array.from(
      new Set(
        (Array.isArray(fieldKeys) ? fieldKeys : [])
          .map((fieldKey) => String(fieldKey || "").trim())
          .filter((fieldKey) => fieldKey.startsWith("prompts.")),
      ),
    );
    if (!normalizedKeys.length) {
      deps.cfmToastr.warning("请先选择要移动的预设条目");
      return false;
    }
    const normalizedTargetIndex = Number.isInteger(targetIndex)
      ? targetIndex
      : null;
    if (normalizedTargetIndex === null || normalizedTargetIndex < 0) {
      deps.cfmToastr.warning("移动目标位置无效");
      return false;
    }

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return false;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return false;
    }

    const currentOrderedFieldKeys = getPresetDetailFields(presetData)
      .map((item) => String(item?.key || "").trim())
      .filter((item) => item.startsWith("prompts."));
    if (currentOrderedFieldKeys.length < 2) return false;

    const selectedSet = new Set(normalizedKeys);
    const selectedInVisibleOrder = currentOrderedFieldKeys.filter((key) =>
      selectedSet.has(key),
    );
    if (!selectedInVisibleOrder.length) {
      deps.cfmToastr.warning("未找到可移动的预设条目");
      return false;
    }

    // 剪切：从原数组移除选中项，再按目标索引插入。
    // 目标索引基于"移除后的剩余列表"，与弹窗渲染（不含选中项）一致。
    const remainingKeys = currentOrderedFieldKeys.filter(
      (key) => !selectedSet.has(key),
    );
    const clampedTargetIndex = Math.max(
      0,
      Math.min(normalizedTargetIndex, remainingKeys.length),
    );
    const nextOrderedFieldKeys = Array.from(remainingKeys);
    nextOrderedFieldKeys.splice(clampedTargetIndex, 0, ...selectedInVisibleOrder);

    const orderChanged =
      currentOrderedFieldKeys.length === nextOrderedFieldKeys.length &&
      currentOrderedFieldKeys.some(
        (key, index) => nextOrderedFieldKeys[index] !== key,
      );
    if (!orderChanged) {
      deps.cfmToastr.info("所选条目已在目标位置");
      return false;
    }

    return savePresetDetailPromptOrder(presetName, nextOrderedFieldKeys);
  }

  async function deletePresetDetailField(presetName, fieldKey) {
    if (!String(fieldKey || "").startsWith("prompts.")) return;

    const pm = deps.getContext().getPresetManager();
    if (!pm) {
      deps.cfmToastr.error("无法获取预设管理器");
      return;
    }

    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      deps.cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }

    const field = getPresetDetailFields(presetData).find(
      (item) => item.key === fieldKey,
    );
    if (!field) {
      deps.cfmToastr.error("未找到可删除的预设条目");
      return;
    }

    // 内置条目（charDescription 等带 sourceLabel）来自角色卡/世界书，不可删除
    if (String(field.sourceLabel || "").trim()) {
      deps.cfmToastr.warning("内置条目（来自角色卡/世界书）不可删除");
      return;
    }

    if (!deps.cfmConfirm(`确定删除预设条目「${field.label}」？`)) return;

    const promptKey = fieldKey.slice("prompts.".length);
    const promptList = deps.ensurePresetPromptList(presetData);
    const promptIndex = deps.getPresetPromptIndexByKey(presetData, promptKey);
    if (promptIndex !== -1) {
      promptList.splice(promptIndex, 1);
    }

    for (const container of deps.ensurePresetPromptOrderContainers(presetData)) {
      if (!Array.isArray(container?.order)) continue;
      container.order = container.order.filter(
        (item) => deps.getPresetPromptOrderIdentifier(item) !== promptKey,
      );
    }

    deps.state.cfmPresetDetailBatchSelected.delete(fieldKey);
    if (deps.state.cfmPresetDetailBatchLastClicked === fieldKey) {
      deps.state.cfmPresetDetailBatchLastClicked = null;
    }

    try {
      await deps.saveNormalizedPresetData(pm, presetName, presetData);
      deps.cfmToastr.success(`已删除预设条目「${field.label}」`);
      deps.refreshPresetPanelView();
    } catch (error) {
      deps.console.error("[CFM] 删除预设条目失败:", error);
      deps.cfmToastr.error(`删除失败: ${error.message || error}`);
    }
  }



  return {
    getPresetDetailActivePresets,
    getPresetDetailAppliedPresetIndices,
    setPresetDetailAppliedPresetIndices,
    normalizePresetDetailFieldKeys,
    getAvailablePresetDetailFieldKeySet,
    sanitizePresetDetailGroupState,
    savePresetDetailActivePreset,
    deletePresetDetailActivePreset,
    renamePresetDetailActivePreset,
    getEnabledPresetDetailFieldKeys,
    setPresetDetailFieldsEnabled,
    getPresetDataForDetail,
    getPresetDetailFields,
    setPresetPromptEnabled,
    togglePresetDetailFieldActivation,
    togglePresetDetailBatchItem,
    applyPresetDetailBatchActivation,
    savePresetDetailPromptOrder,
    reorderPresetDetailField,
    movePresetDetailFieldByStep,
    duplicatePresetDetailField,
    deletePresetDetailField,
    batchDeletePresetDetailFields,
    movePresetDetailFieldsToIndex,
    showPresetDetailFieldPopup,
  };
}
