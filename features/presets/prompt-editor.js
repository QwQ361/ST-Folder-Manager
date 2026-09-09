// 插件内预设 Prompt 编辑器：替代"打开原生预设 Prompt 编辑弹窗"的自动化协调流程。
// 直接从预设数据中读取目标 prompt 条目，以弹窗形式编辑核心字段后写回并刷新。
// 优点：无预设切换等待、无原生 DOM 依赖（对其他插件修改 DOM/时序免疫）、打开即时。

export function createPresetPromptEditorApi(deps) {
  const {
    $,
    document,
    window,
    cfmToastr,
    escapeHtml,
    getContext,
    getPresetDataForDetail,
    getPresetPromptByKey,
    getPresetPromptText,
    findPresetPromptOrderEntryLocation,
    saveNormalizedPresetData,
    refreshPresetPanelView,
  } = deps;

  // 当前打开的弹窗引用（防止重复打开）
  let _openOverlay = null;

  const promptEditorSourceLabels = {
    charDescription: "Character Description",
    charPersonality: "Character Personality",
    scenario: "Character Scenario",
    personaDescription: "Persona Description",
    worldInfoBefore: "World Info (↑Char)",
    worldInfoAfter: "World Info (↓Char)",
  };

  function getPromptFieldValue(promptObj, fieldName) {
    if (!promptObj || typeof promptObj !== "object") return "";
    const value = promptObj[fieldName];
    return value === undefined || value === null ? "" : String(value);
  }

  function getPromptFieldNumber(promptObj, fieldName, fallback) {
    const value = promptObj?.[fieldName];
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function closePromptEditor() {
    if (!_openOverlay) return;
    const overlay = _openOverlay;
    _openOverlay = null;
    overlay.remove();
    if (document?.body) {
      document.body.classList.remove("cfm-body-lock-scroll");
    }
  }

  function openPresetPromptEditor(presetName, promptKey, promptLabel = "") {
    if (_openOverlay) return false;

    const normalizedPresetName = String(presetName || "").trim();
    const normalizedPromptKey = String(promptKey || "").trim();
    const normalizedPromptLabel = String(promptLabel || "").trim();
    if (!normalizedPresetName || !normalizedPromptKey) return false;

    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("无法获取预设管理器");
      return false;
    }

    const presetData = getPresetDataForDetail(pm, normalizedPresetName);
    if (!presetData) {
      cfmToastr.error(`找不到预设「${normalizedPresetName}」的数据`);
      return false;
    }

    const promptObj = getPresetPromptByKey(presetData, normalizedPromptKey);
    if (!promptObj || typeof promptObj !== "object") {
      cfmToastr.error(`找不到预设条目「${normalizedPromptLabel || normalizedPromptKey}」`);
      return false;
    }

    // 同步 sourceLabel（若 prompt 是预置条目如 charDescription 等）
    const sourceLabel = promptEditorSourceLabels[normalizedPromptKey] || "";
    const editorTitle = normalizedPromptLabel || sourceLabel || normalizedPromptKey;

    const enabledValue = promptObj.enabled !== false;
    // 名称（可编辑，写回 promptObj.name）
    const nameValue =
      getPromptFieldValue(promptObj, "name") ||
      getPromptFieldValue(promptObj, "title") ||
      getPromptFieldValue(promptObj, "label") ||
      normalizedPromptLabel ||
      "";
    // 注入位置：数字模型（0=相对 RELATIVE / 1=聊天中 ABSOLUTE），与原生 PromptManager 一致。
    // 兼容旧字符串值：in_chat/in_character/in_prompt/none 视为绝对注入（聊天中）。
    const rawInjectionPosition = promptObj?.injection_position;
    const legacyInjection =
      typeof rawInjectionPosition === "string" &&
      ["in_chat", "in_character", "in_prompt", "none"].includes(
        rawInjectionPosition,
      );
    const injectionPositionValue =
      legacyInjection || Number(rawInjectionPosition) === 1 ? 1 : 0;
    const roleValue = getPromptFieldValue(promptObj, "role") || "system";
    const depthValue = getPromptFieldNumber(promptObj, "injection_depth", 4);
    const depthVisible = injectionPositionValue === 1;
    const contentValue =
      getPresetPromptText(promptObj) ||
      getPromptFieldValue(promptObj, "content") ||
      getPromptFieldValue(promptObj, "prompt") ||
      getPromptFieldValue(promptObj, "text") ||
      "";

    // 内置条目（charDescription/personaDescription 等）内容来自角色卡/世界书，
    // 不可直接编辑内容；移除内容编辑框，改为在内容区域居中显示来源地址。
    const contentFieldHtml = sourceLabel
      ? `<div class="cfm-preset-prompt-editor-source-center">${escapeHtml(sourceLabel)}</div>`
      : `<div class="cfm-edit-popup-field cfm-preset-prompt-editor-content-field">
              <label>内容</label>
              <textarea class="cfm-edit-input cfm-preset-prompt-editor-content" rows="8" placeholder="发送给 AI 的提示文本">${escapeHtml(contentValue)}</textarea>
            </div>`;

    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-preset-prompt-editor-overlay">
        <div class="cfm-edit-popup cfm-edit-popup-expandable">
          <div class="cfm-edit-popup-title">
            <span>编辑预设条目：${escapeHtml(editorTitle)}</span>
            <button type="button" class="cfm-edit-popup-maximize" title="最大化">
              <i class="fa-solid fa-expand"></i>
            </button>
          </div>
          <div class="cfm-edit-popup-body">
            <div class="cfm-edit-popup-field cfm-preset-prompt-editor-name-field">
              <label>名称</label>
              <input type="text" class="cfm-edit-input cfm-preset-prompt-editor-name" value="${escapeHtml(nameValue)}" placeholder="条目名称">
            </div>
            ${contentFieldHtml}
            <div class="cfm-edit-popup-field-row">
              <div class="cfm-edit-popup-field">
                <label>启用</label>
                <div class="cfm-preset-prompt-editor-toggle">
                  <input type="checkbox" class="cfm-preset-prompt-editor-enabled" ${enabledValue ? "checked" : ""}>
                  <span>启用该条目</span>
                </div>
              </div>
              <div class="cfm-edit-popup-field">
                <label>注入位置</label>
                <select class="cfm-edit-input cfm-preset-prompt-editor-injection">
                  <option value="0" ${injectionPositionValue === 0 ? "selected" : ""}>相对（按提示词管理器中其他提示词的相对顺序）</option>
                  <option value="1" ${injectionPositionValue === 1 ? "selected" : ""}>聊天中（在聊天的指定深度注入）</option>
                </select>
              </div>
            </div>
            <div class="cfm-edit-popup-field-row">
              <div class="cfm-edit-popup-field">
                <label>角色 (role)</label>
                <select class="cfm-edit-input cfm-preset-prompt-editor-role">
                  <option value="system" ${roleValue === "system" ? "selected" : ""}>system</option>
                  <option value="user" ${roleValue === "user" ? "selected" : ""}>user</option>
                  <option value="assistant" ${roleValue === "assistant" ? "selected" : ""}>assistant</option>
                  <option value="none" ${roleValue === "none" ? "selected" : ""}>none</option>
                </select>
              </div>
              <div class="cfm-edit-popup-field cfm-preset-prompt-editor-depth-field" style="${depthVisible ? "" : "display:none"}">
                <label>深度 (depth)</label>
                <input type="number" class="cfm-edit-input cfm-preset-prompt-editor-depth" value="${depthValue}" min="-100" max="100">
              </div>
            </div>
            <div class="cfm-edit-popup-field">
              <label>标识符 (identifier)</label>
              <input type="text" class="cfm-edit-input cfm-preset-prompt-editor-identifier" value="${escapeHtml(getPromptFieldValue(promptObj, "identifier") || normalizedPromptKey)}" disabled title="标识符由系统管理，不可修改">
            </div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button type="button" class="cfm-btn cfm-edit-popup-cancel">取消</button>
            <button type="button" class="cfm-btn cfm-edit-popup-confirm">保存</button>
          </div>
        </div>
      </div>
    `);

    $("body").append(overlay);
    _openOverlay = overlay;
    document?.body?.classList.add("cfm-body-lock-scroll");

    // 最大化切换
    const popupEl = overlay.find(".cfm-edit-popup").first();
    overlay.find(".cfm-edit-popup-maximize").on("click", () => {
      const isMaximized = popupEl.hasClass("cfm-edit-popup-maximized");
      popupEl.toggleClass("cfm-edit-popup-maximized", !isMaximized);
      overlay.find(".cfm-edit-popup-maximize i").toggleClass(
        "fa-expand",
        isMaximized,
      );
      overlay.find(".cfm-edit-popup-maximize i").toggleClass(
        "fa-compress",
        !isMaximized,
      );
    });

    // 关闭
    const cancel = () => {
      closePromptEditor();
    };
    overlay.find(".cfm-edit-popup-cancel").on("click", cancel);
    overlay.on("mousedown", (e) => {
      if (e.target === overlay.get(0)) cancel();
    });

    // 注入位置切换时联动深度字段显隐
    const injectionSelect = overlay.find(".cfm-preset-prompt-editor-injection");
    const depthFieldWrap = overlay.find(".cfm-preset-prompt-editor-depth-field");
    const syncDepthFieldVisibility = () => {
      const pos = Number(injectionSelect.val() || 0);
      depthFieldWrap.toggle(pos === 1);
    };
    injectionSelect.on("change", syncDepthFieldVisibility);

    // 保存
    const submit = async () => {
      const name = String(
        overlay.find(".cfm-preset-prompt-editor-name").val() || "",
      ).trim();
      const content = String(
        overlay.find(".cfm-preset-prompt-editor-content").val() || "",
      );
      const enabled = overlay.find(".cfm-preset-prompt-editor-enabled").is(":checked");
      const injectionPosition = Number(injectionSelect.val() || 0);
      const role = String(overlay.find(".cfm-preset-prompt-editor-role").val() || "");
      const depthVal = Number(overlay.find(".cfm-preset-prompt-editor-depth").val());
      const depth = Number.isFinite(depthVal) ? depthVal : 4;

      try {
        // 写回 prompt 对象（数字模型：injection_position 0=相对 / 1=聊天中）
        if (!sourceLabel) {
          // 普通条目：内容可编辑
          promptObj.content = content;
        }
        // 名称（普通条目与内置条目均可编辑名称）
        if (name) {
          promptObj.name = name;
        } else if (Object.prototype.hasOwnProperty.call(promptObj, "name")) {
          delete promptObj.name;
        }
        promptObj.enabled = enabled;
        promptObj.injection_position = injectionPosition === 1 ? 1 : 0;
        if (injectionPosition === 1) {
          promptObj.injection_depth = depth;
        } else {
          delete promptObj.injection_depth;
        }
        if (role && role !== "none") {
          promptObj.role = role;
        } else {
          delete promptObj.role;
        }

        // 同步 prompt_order 条目（name/enabled/role/injection_position/injection_depth）
        const location = findPresetPromptOrderEntryLocation(
          presetData,
          normalizedPromptKey,
          false,
        );
        if (location?.item && typeof location.item === "object") {
          if (name) {
            location.item.name = name;
          } else if (Object.prototype.hasOwnProperty.call(location.item, "name")) {
            delete location.item.name;
          }
          location.item.enabled = enabled;
          if (role && role !== "none") {
            location.item.role = role;
          } else {
            delete location.item.role;
          }
          location.item.injection_position = injectionPosition === 1 ? 1 : 0;
          if (injectionPosition === 1) {
            location.item.injection_depth = depth;
          } else {
            delete location.item.injection_depth;
          }
        }

        closePromptEditor();
        await saveNormalizedPresetData(pm, normalizedPresetName, presetData);
        refreshPresetPanelView();
        cfmToastr.success(`已保存预设条目「${editorTitle}」`);
      } catch (error) {
        cfmToastr.error(`保存失败: ${error?.message || error}`);
        console.error("[CFM] 保存预设条目失败:", error);
      }
    };
    overlay.find(".cfm-edit-popup-confirm").on("click", submit);

    // 快捷键
    overlay.on("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submit();
      }
    });

    // 聚焦（普通条目聚焦内容区，内置条目聚焦名称框）
    window.setTimeout(() => {
      const focusTarget = sourceLabel
        ? overlay.find(".cfm-preset-prompt-editor-name").get(0)
        : overlay.find(".cfm-preset-prompt-editor-content").get(0);
      if (focusTarget && typeof focusTarget.focus === "function") {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch {
          focusTarget.focus();
        }
      }
    }, 60);

    return true;
  }

  return {
    openPresetPromptEditor,
  };
}
