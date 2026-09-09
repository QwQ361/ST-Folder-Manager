// 预设 Prompt 结构工具层：承接 presets.prompts 与 presets.prompt_order 的兼容规范化、查询、排序、复制键名生成等纯数据操作。

export const PRESET_PROMPT_ORDER_DUMMY_ID = 100001;

// 原生 PromptManager 的注入位置模型（数字枚举，与酒馆 PromptManager.js 一致）
export const PRESET_INJECTION_POSITION = {
  RELATIVE: 0, // 相对：按提示词管理器中的相对顺序注入
  ABSOLUTE: 1, // 聊天中：在聊天的指定深度注入
};
export const PRESET_INJECTION_DEPTH_DEFAULT = 4;

// 酒馆原生内置 prompt 标识符（marker / 预置条目）。
// 这些条目通常不在 presetData.prompts 数组中（内容来自角色卡/世界书等），
// 但会出现在 prompt_order 中。sanitize 时必须保留，否则详情列表会丢失它们。
export const PRESET_BUILTIN_PROMPT_KEYS = new Set([
  "main",
  "nsfw",
  "dialogueExamples",
  "jailbreak",
  "chatHistory",
  "worldInfoAfter",
  "worldInfoBefore",
  "enhanceDefinitions",
  "charDescription",
  "charPersonality",
  "scenario",
  "personaDescription",
]);

export function getPresetPromptIdentifier(prompt) {
  if (!prompt || typeof prompt !== "object") return "";
  return String(
    prompt.identifier ?? prompt.id ?? prompt.key ?? prompt.prompt ?? prompt.name ?? "",
  ).trim();
}

export function getPresetPromptIdentifierCandidates(prompt) {
  if (!prompt || typeof prompt !== "object") return [];
  return Array.from(
    new Set(
      [prompt.identifier, prompt.id, prompt.key, prompt.prompt, prompt.name]
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function getPresetPromptOrderIdentifier(item) {
  if (typeof item === "string") return String(item).trim();
  if (!item || typeof item !== "object") return "";
  return String(
    item.identifier ?? item.id ?? item.key ?? item.prompt ?? item.name ?? "",
  ).trim();
}

export function getPresetPromptText(promptValue) {
  if (typeof promptValue === "string") return promptValue;
  if (promptValue && typeof promptValue === "object") {
    return String(
      promptValue.value ?? promptValue.content ?? promptValue.text ?? "",
    );
  }
  return "";
}

export function getPresetPromptLabel(promptValue, fallback = "") {
  if (promptValue && typeof promptValue === "object") {
    const label = String(
      promptValue.name ??
        promptValue.title ??
        promptValue.label ??
        fallback ??
        "",
    ).trim();
    if (label) return label;
  }
  return String(fallback ?? "").trim();
}

export function ensurePresetPromptList(presetData) {
  if (!presetData || typeof presetData !== "object") return [];

  const existingPrompts = presetData.prompts;

  if (Array.isArray(existingPrompts)) {
    const normalizedPrompts = existingPrompts
      .filter((prompt) => prompt !== null && prompt !== undefined)
      .map((prompt, index) => {
        if (prompt && typeof prompt === "object") {
          const identifier =
            getPresetPromptIdentifier(prompt) || `prompt_${index + 1}`;
          prompt.identifier = identifier;
          return prompt;
        }
        return {
          identifier: `prompt_${index + 1}`,
          content: String(prompt ?? ""),
        };
      });

    existingPrompts.length = 0;
    existingPrompts.push(...normalizedPrompts);
    presetData.prompts = existingPrompts;
    return existingPrompts;
  }

  let normalizedPrompts = [];
  if (existingPrompts && typeof existingPrompts === "object") {
    normalizedPrompts = Object.entries(existingPrompts)
      .map(([identifier, prompt]) => {
        const normalizedId = String(identifier || "").trim();
        if (!normalizedId) return null;
        if (prompt && typeof prompt === "object") {
          prompt.identifier = getPresetPromptIdentifier(prompt) || normalizedId;
          return prompt;
        }
        return {
          identifier: normalizedId,
          content: String(prompt ?? ""),
        };
      })
      .filter(Boolean);
  }

  presetData.prompts = normalizedPrompts;
  return presetData.prompts;
}

export function normalizePresetPromptOrderItem(item) {
  if (typeof item === "string") {
    const identifier = String(item || "").trim();
    return identifier ? { identifier } : null;
  }
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const identifier = getPresetPromptOrderIdentifier(item);
  if (!identifier) return null;
  item.identifier = identifier;
  return item;
}

export function normalizePresetPromptOrderItemKeyFields(item, promptKey) {
  const normalizedKey = String(promptKey || "").trim();
  if (!normalizedKey) return item;
  const normalizedItem =
    item && typeof item === "object" ? item : { identifier: normalizedKey };

  normalizedItem.identifier = normalizedKey;
  if (Object.prototype.hasOwnProperty.call(normalizedItem, "id")) {
    normalizedItem.id = normalizedKey;
  }
  if (Object.prototype.hasOwnProperty.call(normalizedItem, "key")) {
    normalizedItem.key = normalizedKey;
  }
  if (Object.prototype.hasOwnProperty.call(normalizedItem, "prompt")) {
    normalizedItem.prompt = normalizedKey;
  }

  return normalizedItem;
}

export function sanitizePresetPromptOrderEntries(
  orderEntries,
  validIdentifierSet = null,
) {
  const normalizedEntries = [];
  const seen = new Set();

  for (const item of Array.isArray(orderEntries) ? orderEntries : []) {
    const normalizedItem = normalizePresetPromptOrderItem(item);
    if (!normalizedItem) continue;
    const identifier = getPresetPromptOrderIdentifier(normalizedItem);
    if (!identifier) continue;
    if (
      validIdentifierSet instanceof Set &&
      validIdentifierSet.size > 0 &&
      !validIdentifierSet.has(identifier) &&
      !PRESET_BUILTIN_PROMPT_KEYS.has(identifier)
    ) {
      continue;
    }
    if (seen.has(identifier)) continue;
    seen.add(identifier);
    normalizedEntries.push(normalizedItem);
  }

  return normalizedEntries;
}

export function ensurePresetPromptOrderContainers(presetData) {
  if (!presetData || typeof presetData !== "object") return [];

  const validIdentifierSet = new Set(
    ensurePresetPromptList(presetData)
      .map((prompt) => getPresetPromptIdentifier(prompt))
      .filter(Boolean),
  );

  const existingPromptOrder = presetData.prompt_order;
  if (!Array.isArray(existingPromptOrder)) {
    presetData.prompt_order = [];
    return presetData.prompt_order;
  }

  const hasContainerShape = existingPromptOrder.some(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      Array.isArray(item.order),
  );

  if (!hasContainerShape) {
    const flatOrder = sanitizePresetPromptOrderEntries(
      existingPromptOrder,
      validIdentifierSet,
    );
    presetData.prompt_order = flatOrder.length
      ? [
          {
            character_id: PRESET_PROMPT_ORDER_DUMMY_ID,
            order: flatOrder,
          },
        ]
      : [];
    return presetData.prompt_order;
  }

  presetData.prompt_order = existingPromptOrder
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        Array.isArray(item.order),
    )
    .map((item) => {
      item.order = sanitizePresetPromptOrderEntries(
        item.order,
        validIdentifierSet,
      );
      return item;
    });

  return presetData.prompt_order;
}

export function sanitizePresetPromptStructure(presetData) {
  if (!presetData || typeof presetData !== "object") return presetData;
  ensurePresetPromptList(presetData);
  ensurePresetPromptOrderContainers(presetData);
  return presetData;
}

export function getAllPresetPromptOrderContainers(presetData, create = false) {
  const containers = ensurePresetPromptOrderContainers(presetData);
  if (!containers.length && create) {
    containers.push({
      character_id: PRESET_PROMPT_ORDER_DUMMY_ID,
      order: [],
    });
  }
  return containers;
}

export function getPresetPromptOrderContainer(presetData, create = false) {
  const containers = getAllPresetPromptOrderContainers(presetData, create);
  let container = containers.find(
    (item) =>
      String(item?.character_id ?? "") ===
      String(PRESET_PROMPT_ORDER_DUMMY_ID),
  );

  if (!container && containers.length > 0) {
    container = containers[0];
  }

  if (container && !Array.isArray(container.order)) {
    container.order = [];
  }

  return container || null;
}

export function getPresetPromptOrderEntries(presetData, create = false) {
  return getPresetPromptOrderContainer(presetData, create)?.order ?? [];
}

export function getAllPresetPromptOrderEntries(presetData) {
  return getAllPresetPromptOrderContainers(presetData).flatMap((container) =>
    Array.isArray(container?.order) ? container.order : [],
  );
}

export function findPresetPromptOrderEntryLocation(
  presetData,
  promptKey,
  create = false,
) {
  const normalizedKey = String(promptKey || "").trim();
  if (!normalizedKey) return null;

  for (const container of getAllPresetPromptOrderContainers(
    presetData,
    create,
  )) {
    const order = Array.isArray(container?.order) ? container.order : [];
    const index = order.findIndex(
      (item) => getPresetPromptOrderIdentifier(item) === normalizedKey,
    );
    if (index !== -1) {
      return {
        container,
        order,
        index,
        item: order[index],
      };
    }
  }

  if (!create) return null;
  const fallbackContainer = getPresetPromptOrderContainer(presetData, true);
  if (!fallbackContainer) return null;
  return {
    container: fallbackContainer,
    order: fallbackContainer.order,
    index: -1,
    item: null,
  };
}

export function getPresetPromptMap(presetData) {
  const promptMap = new Map();
  for (const prompt of ensurePresetPromptList(presetData)) {
    for (const identifier of getPresetPromptIdentifierCandidates(prompt)) {
      if (!promptMap.has(identifier)) promptMap.set(identifier, prompt);
    }
  }
  return promptMap;
}

export function getPresetPromptByKey(presetData, promptKey) {
  return getPresetPromptMap(presetData).get(String(promptKey || "").trim()) ?? null;
}

export function getPresetPromptIndexByKey(presetData, promptKey) {
  const normalizedKey = String(promptKey || "").trim();
  if (!normalizedKey) return -1;
  return ensurePresetPromptList(presetData).findIndex((prompt) =>
    getPresetPromptIdentifierCandidates(prompt).includes(normalizedKey),
  );
}

export function buildDuplicatedPresetPromptKey(existingPromptIds, sourcePromptKey) {
  const normalizedSource = String(sourcePromptKey || "").trim() || "prompt";
  const existingIds =
    existingPromptIds instanceof Set
      ? existingPromptIds
      : new Set(
          (Array.isArray(existingPromptIds)
            ? existingPromptIds
            : Object.keys(existingPromptIds || {})
          )
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        );
  const baseKey = `${normalizedSource}_copy`;
  let candidate = baseKey;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseKey}_${index}`;
    index += 1;
  }
  return candidate;
}

export function buildDuplicatedPresetPromptLabel(existingLabels, sourceLabel) {
  const baseLabel = String(sourceLabel || "").trim() || "新条目";
  let candidate = `${baseLabel} 副本`;
  let index = 2;
  while (existingLabels.has(candidate)) {
    candidate = `${baseLabel} 副本${index}`;
    index += 1;
  }
  return candidate;
}

export function createPresetPromptsApiCore() {
  return {
    PRESET_PROMPT_ORDER_DUMMY_ID,
    PRESET_INJECTION_POSITION,
    PRESET_INJECTION_DEPTH_DEFAULT,
    PRESET_BUILTIN_PROMPT_KEYS,
    getPresetPromptIdentifier,
    getPresetPromptIdentifierCandidates,
    getPresetPromptOrderIdentifier,
    getPresetPromptText,
    getPresetPromptLabel,
    ensurePresetPromptList,
    normalizePresetPromptOrderItem,
    normalizePresetPromptOrderItemKeyFields,
    sanitizePresetPromptOrderEntries,
    ensurePresetPromptOrderContainers,
    sanitizePresetPromptStructure,
    getAllPresetPromptOrderContainers,
    getPresetPromptOrderContainer,
    getPresetPromptOrderEntries,
    getAllPresetPromptOrderEntries,
    findPresetPromptOrderEntryLocation,
    getPresetPromptMap,
    getPresetPromptByKey,
    getPresetPromptIndexByKey,
    buildDuplicatedPresetPromptKey,
    buildDuplicatedPresetPromptLabel,
  };
}

// ============================================================
// openNativePresetPromptEditor —— 原生预设 Prompt 编辑器打开协调器
// （从 index.js 拆分，薄包装保持兼容）
// ============================================================

export function createNativePresetPromptEditorApi(deps) {
  const {
    $,
    document,
    window,
    HTMLElement,
    HTMLInputElement,
    HTMLTextAreaElement,
    FocusEvent,
    Event,
    Date,
    Number,
    String,
    Promise,
    setTimeout,
    getContext,
    beginSuppressPresetRegexToast,
    endSuppressPresetRegexToast,
    bindNativePopupCleanup,
    findNativePresetPromptRow,
    findPresetSelectValueByName,
    syncCurrentPresetSelection,
    setPresetValueToRestore,
  } = deps;

async function openNativePresetPromptEditorCore(
    presetName,
    promptKey,
    promptLabel = "",
  ) {
    const normalizedPresetName = String(presetName || "").trim();
    const normalizedPromptKey = String(promptKey || "").trim();
    const normalizedPromptLabel = String(promptLabel || "").trim();
    if (
      !normalizedPresetName ||
      (!normalizedPromptKey && !normalizedPromptLabel)
    )
      return false;

    const pm = getContext().getPresetManager();
    if (!pm?.select) return false;

    beginSuppressPresetRegexToast();
    try {
      const hasVisibleNativePresetPromptPopup = () => {
        const popupEl = document.getElementById(
          "completion_prompt_manager_popup",
        );
        if (!(popupEl instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(popupEl);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          popupEl.getBoundingClientRect().height > 0 &&
          popupEl.getBoundingClientRect().width > 0
        );
      };

      const bringNativePresetPromptPopupToFront = () => {
        const popupEl = document.getElementById(
          "completion_prompt_manager_popup",
        );
        if (!popupEl) return false;

        const overlayEl = document.getElementById("cfm-overlay");
        const overlayZ = Number.parseInt(
          overlayEl ? window.getComputedStyle(overlayEl).zIndex : "",
          10,
        );
        const nextZ = Number.isFinite(overlayZ) ? overlayZ + 2 : 10002;

        // 只提升 z-index，不改变 position/layout 属性
        // 原生弹窗使用 position:absolute 并依赖父元素来确定尺寸，
        // 强制改为 position:fixed 会导致移动端弹窗高度塌陷变得不可见
        const wrapperEl = popupEl.parentElement;
        if (wrapperEl instanceof HTMLElement) {
          wrapperEl.style.setProperty("z-index", String(nextZ), "important");
        }
        popupEl.style.setProperty("z-index", String(nextZ + 1), "important");

        // 绑定关闭/保存按钮的清理事件（仅绑定一次）
        bindNativePopupCleanup();

        return true;
      };

      const focusNativePresetPromptPopupField = () => {
        const popupEl = document.getElementById(
          "completion_prompt_manager_popup",
        );
        if (!popupEl) return false;
        const field = popupEl.querySelector(
          "textarea, .ace_text-input, input[type='text'], [contenteditable='true']",
        );
        if (!(field instanceof HTMLElement)) return false;
        try {
          field.focus({ preventScroll: true });
        } catch {
          field.focus();
        }
        if (
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLInputElement
        ) {
          const value = field.value;
          if (typeof value === "string") {
            const pos = value.length;
            try {
              field.setSelectionRange(pos, pos);
            } catch {
              // ignore
            }
          }
        }
        field.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      };

      const scheduleBringNativePresetPromptPopupToFront = () => {
        bringNativePresetPromptPopupToFront();
        let attempts = 0;
        const maxAttempts = 32;
        const timer = window.setInterval(() => {
          attempts += 1;
          bringNativePresetPromptPopupToFront();
          if (attempts === 3 || attempts === 8 || attempts === 14) {
            focusNativePresetPromptPopupField();
          }
          if (attempts >= maxAttempts || hasVisibleNativePresetPromptPopup()) {
            window.clearInterval(timer);
          }
        }, 50);
      };

      const isPresetSelectionStable = (targetValue) => {
        if (!pm?.select || !targetValue) return false;
        return String(pm.select.val() || "") === String(targetValue);
      };

      const getNativePromptRowState = () => {
        const row = findNativePresetPromptRow(
          normalizedPromptKey,
          normalizedPromptLabel,
        );
        if (!row.length) {
          return { row, editButton: $(), nativeButton: null, visible: false };
        }
        const editButton = row.find(".prompt-manager-edit-action").first();
        const nativeButton = editButton.get(0);
        const rowEl = row.get(0);
        const visible =
          row.is(":visible") ||
          (!!rowEl &&
            rowEl instanceof HTMLElement &&
            rowEl.offsetParent !== null);
        return { row, editButton, nativeButton, visible };
      };

      const clickNativeEditButton = () => {
        const { row, nativeButton } = getNativePromptRowState();
        if (!row.length || !nativeButton) return false;
        if (row.length && row.get(0)?.scrollIntoView) {
          try {
            row.get(0).scrollIntoView({ block: "center", inline: "nearest" });
          } catch {
            row.get(0).scrollIntoView();
          }
        }
        nativeButton.click();
        scheduleBringNativePresetPromptPopupToFront();
        window.setTimeout(() => focusNativePresetPromptPopupField(), 120);
        window.setTimeout(() => focusNativePresetPromptPopupField(), 260);
        window.setTimeout(() => focusNativePresetPromptPopupField(), 420);
        return true;
      };

      const syncTargetPresetSelection = async () => {
        const targetValue = findPresetSelectValueByName(
          pm,
          normalizedPresetName,
        );
        const currentValue = String(pm.select.val() || "");

        if (targetValue && currentValue !== targetValue) {
          // 保存原始预设值，弹窗关闭后恢复
          setPresetValueToRestore(currentValue);

          // 等待原生 OAI_PRESET_CHANGED_AFTER 事件，确保 PromptManager 内部
          // serviceSettings.prompts 已完全切换到目标预设的数据
          const presetChangedPromise = new Promise((resolve) => {
            const ctx = getContext();
            const evtSource = ctx?.eventSource;
            const evtTypes = ctx?.eventTypes;
            const eventType = evtTypes?.OAI_PRESET_CHANGED_AFTER;
            if (!eventType || !evtSource) {
              // 无法监听事件，退回到固定延时
              window.setTimeout(resolve, 800);
              return;
            }
            let resolved = false;
            const handler = () => {
              if (resolved) return;
              resolved = true;
              try {
                evtSource.removeListener(eventType, handler);
              } catch {}
              // 额外等待一帧，确保 PromptManager 的 renderDebounced 也已执行
              window.setTimeout(resolve, 120);
            };
            evtSource.once(eventType, handler);
            // 超时兜底
            window.setTimeout(() => {
              if (!resolved) {
                resolved = true;
                try {
                  evtSource.removeListener(eventType, handler);
                } catch {}
                resolve();
              }
            }, 3000);
          });

          pm.select.val(targetValue);
          pm.select.trigger("change");

          await presetChangedPromise;
        } else if (targetValue && currentValue === targetValue) {
          // 当前预设已选中，但移动端首开时原生 prompt 列表/按钮经常晚一拍才出现。
          // 先主动触发一次渲染并等待列表出现，再给一次“直接点击”的二次机会，
          // 尽量在进入严格稳定性轮询前就打开原生编辑弹窗。
          const rows = $(
            "#completion_prompt_manager .completion_prompt_manager_prompt",
          );
          if (!rows.length) {
            if (typeof pm.render === "function") {
              pm.render(false);
            } else if (typeof pm.renderDebounced === "function") {
              pm.renderDebounced();
            }
            const renderWaitStart = Date.now();
            const renderWaitTimeout = 2200;
            while (Date.now() - renderWaitStart < renderWaitTimeout) {
              await new Promise((resolve) => window.setTimeout(resolve, 80));
              if (
                $(
                  "#completion_prompt_manager .completion_prompt_manager_prompt",
                ).length
              ) {
                break;
              }
            }
          }

          await new Promise((resolve) => window.setTimeout(resolve, 180));
          if (clickNativeEditButton()) {
            await new Promise((resolve) => window.setTimeout(resolve, 260));
            if (hasVisibleNativePresetPromptPopup()) {
              scheduleBringNativePresetPromptPopupToFront();
              return true;
            }
          }
        } else if (!targetValue) {
          syncCurrentPresetSelection(pm, normalizedPresetName);
        }

        return targetValue;
      };

      const currentPresetValue = String(pm.select.val() || "");
      const currentPresetName = String(
        pm.select.find("option:selected").text() || "",
      ).trim();
      const isOtherPresetRequest =
        normalizedPresetName &&
        !!(
          (currentPresetName && currentPresetName !== normalizedPresetName) ||
          (findPresetSelectValueByName(pm, normalizedPresetName) &&
            String(findPresetSelectValueByName(pm, normalizedPresetName)) !==
              currentPresetValue)
        );

      if (!isOtherPresetRequest && clickNativeEditButton()) {
        return true;
      }

      const targetValue = await syncTargetPresetSelection();

      const tryOpenAfterSelectionSettles = async (
        timeoutMs = 4200,
        options = {},
      ) => {
        const {
          minSelectionStableMs = 100,
          minListStableMs = 180,
          minRowStableMs = 140,
          clickConfirmMs = 220,
          pollIntervalMs = 45,
        } = options;
        const startTime = Date.now();
        let stableSelectionSeenAt = 0;
        let stableListSeenAt = 0;
        let stableRowSeenAt = 0;
        let clickIssuedAt = 0;
        let lastListSignature = "";
        let lastRowSignature = "";
        while (Date.now() - startTime < timeoutMs) {
          if (hasVisibleNativePresetPromptPopup()) {
            scheduleBringNativePresetPromptPopupToFront();
            return true;
          }

          if (!targetValue || isPresetSelectionStable(targetValue)) {
            if (!stableSelectionSeenAt) {
              stableSelectionSeenAt = Date.now();
            }
          } else {
            stableSelectionSeenAt = 0;
            stableListSeenAt = 0;
            stableRowSeenAt = 0;
            clickIssuedAt = 0;
            lastListSignature = "";
            lastRowSignature = "";
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            continue;
          }

          const promptRows = $(
            "#completion_prompt_manager .completion_prompt_manager_prompt",
          );
          const listSignature = promptRows
            .map((_, el) => {
              const row = $(el);
              const identifier = String(
                row.attr("data-pm-identifier") || "",
              ).trim();
              const name = String(
                row
                  .find(".completion_prompt_manager_prompt_name")
                  .first()
                  .attr("data-pm-name") ||
                  row
                    .find(".completion_prompt_manager_prompt_name")
                    .first()
                    .text() ||
                  "",
              )
                .replace(/\s+/g, " ")
                .trim();
              return `${identifier}::${name}`;
            })
            .get()
            .join("||");
          const listContainsRequestedPrompt = !!promptRows.filter((_, el) => {
            const row = $(el);
            const identifier = String(
              row.attr("data-pm-identifier") || "",
            ).trim();
            const name = String(
              row
                .find(".completion_prompt_manager_prompt_name")
                .first()
                .attr("data-pm-name") ||
                row
                  .find(".completion_prompt_manager_prompt_name")
                  .first()
                  .text() ||
                "",
            )
              .replace(/\s+/g, " ")
              .trim();
            return (
              (!!normalizedPromptKey && identifier === normalizedPromptKey) ||
              (!!normalizedPromptLabel && name === normalizedPromptLabel)
            );
          }).length;

          if (listSignature !== lastListSignature) {
            lastListSignature = listSignature;
            stableListSeenAt = Date.now();
            stableRowSeenAt = 0;
            clickIssuedAt = 0;
          } else if (!stableListSeenAt) {
            stableListSeenAt = Date.now();
          }

          const rowState = getNativePromptRowState();
          const rowIdentifier = String(
            rowState.row.attr("data-pm-identifier") || "",
          ).trim();
          const rowName = String(
            rowState.row
              .find(".completion_prompt_manager_prompt_name")
              .first()
              .attr("data-pm-name") ||
              rowState.row
                .find(".completion_prompt_manager_prompt_name")
                .first()
                .text() ||
              "",
          )
            .replace(/\s+/g, " ")
            .trim();
          const rowSignature = `${rowIdentifier}::${rowName}`;
          const matchesRequestedPrompt =
            (!!normalizedPromptKey && rowIdentifier === normalizedPromptKey) ||
            (!!normalizedPromptLabel && rowName === normalizedPromptLabel);

          if (
            stableSelectionSeenAt &&
            Date.now() - stableSelectionSeenAt >= minSelectionStableMs &&
            stableListSeenAt &&
            Date.now() - stableListSeenAt >= minListStableMs &&
            listContainsRequestedPrompt &&
            rowState.row.length &&
            rowState.nativeButton &&
            matchesRequestedPrompt
          ) {
            if (rowSignature !== lastRowSignature) {
              lastRowSignature = rowSignature;
              stableRowSeenAt = Date.now();
            } else if (!stableRowSeenAt) {
              stableRowSeenAt = Date.now();
            }

            if (
              !clickIssuedAt &&
              Date.now() - stableRowSeenAt >= minRowStableMs
            ) {
              if (clickNativeEditButton()) {
                clickIssuedAt = Date.now();
              }
            }
          } else {
            stableRowSeenAt = 0;
            lastRowSignature = rowSignature;
          }

          if (clickIssuedAt && Date.now() - clickIssuedAt >= clickConfirmMs) {
            if (hasVisibleNativePresetPromptPopup()) {
              scheduleBringNativePresetPromptPopupToFront();
              return true;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
        return hasVisibleNativePresetPromptPopup();
      };

      if (isOtherPresetRequest) {
        if (
          await tryOpenAfterSelectionSettles(4200, {
            minSelectionStableMs: 320,
            minListStableMs: 700,
            minRowStableMs: 700,
            clickConfirmMs: 360,
            pollIntervalMs: 70,
          })
        ) {
          return true;
        }
      } else {
        if (
          await tryOpenAfterSelectionSettles(2400, {
            minSelectionStableMs: 80,
            minListStableMs: 120,
            minRowStableMs: 140,
            clickConfirmMs: 260,
            pollIntervalMs: 40,
          })
        ) {
          return true;
        }

        if (
          await tryOpenAfterSelectionSettles(4200, {
            minSelectionStableMs: 220,
            minListStableMs: 320,
            minRowStableMs: 520,
            clickConfirmMs: 360,
            pollIntervalMs: 70,
          })
        ) {
          return true;
        }
      }

      // 兜底：仅当目标预设实际上未切换到位时，才补触发一次同步和短暂重试，
      // 避免移动端对带正则的预设重复触发原生 toast。
      if (
        targetValue &&
        String(pm.select.val() || "") !== String(targetValue)
      ) {
        await syncTargetPresetSelection();
        if (
          await tryOpenAfterSelectionSettles(2600, {
            minSelectionStableMs: 180,
            minRowStableMs: 420,
            clickConfirmMs: 300,
            pollIntervalMs: 60,
          })
        ) {
          return true;
        }
      }

      // 最终兜底：移动端偶发会在点击后稍晚才真正显示弹窗，
      // 或目标 row 晚一拍才可点击。这里在彻底失败前再做一次短时救援，
      // 避免第一次点已经接近成功却过早返回 false。
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      if (hasVisibleNativePresetPromptPopup()) {
        scheduleBringNativePresetPromptPopupToFront();
        return true;
      }

      const finalRescueStart = Date.now();
      const finalRescueTimeout = 1200;
      while (Date.now() - finalRescueStart < finalRescueTimeout) {
        if (clickNativeEditButton()) {
          await new Promise((resolve) => window.setTimeout(resolve, 260));
          if (hasVisibleNativePresetPromptPopup()) {
            scheduleBringNativePresetPromptPopupToFront();
            return true;
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 120));
        if (hasVisibleNativePresetPromptPopup()) {
          scheduleBringNativePresetPromptPopupToFront();
          return true;
        }
      }

      // 失败时不立即恢复当前预设，避免再触发一次原生 regex toast。
      return false;
    } finally {
      endSuppressPresetRegexToast();
    }
  }
  return {
    openNativePresetPromptEditor: openNativePresetPromptEditorCore,
  };
}
