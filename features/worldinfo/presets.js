// 世界书分组功能文件：负责世界书激活分组的创建、重命名、删除、保存、读取与面板数据组织，是世界书分组管理功能的主要入口模块。

export function normalizeWorldInfoNameListCore(names) {
  const result = [];
  const seen = new Set();
  for (const rawName of Array.isArray(names) ? names : []) {
    const name = String(rawName || "").trim();
    if (!name || name === "--- 选择以编辑 ---" || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

export function collectWorldInfoNamesFromDomCore(deps) {
  const names = [];
  deps.$("#world_editor_select option").each(function () {
    const v = deps.$(this).val();
    const t = deps.$(this).text();
    if (v !== "" && t !== "--- 选择以编辑 ---") names.push(t);
  });
  if (deps.detachedOptions && deps.detachedOptions.length > 0) {
    for (const opt of deps.detachedOptions) {
      const v = deps.$(opt).val();
      const t = deps.$(opt).text();
      if (v !== "" && t !== "--- 选择以编辑 ---") names.push(t);
    }
  }
  return normalizeWorldInfoNameListCore(names);
}

export async function getWorldInfoNamesCore(forceRefresh, deps) {
  const cachedNames = deps.getCachedNames();
  if (Array.isArray(cachedNames) && !forceRefresh) {
    const normalizedCachedNames = normalizeWorldInfoNameListCore(cachedNames);
    deps.setCachedNames(normalizedCachedNames);
    return normalizedCachedNames;
  }

  if (forceRefresh) {
    try {
      const resp = await deps.fetchSettings();
      if (resp.ok) {
        const data = await resp.json();
        const names = normalizeWorldInfoNameListCore(data.world_names || []);
        deps.setCachedNames(names);
        return names;
      }
    } catch (e) {
      deps.logForceRefreshError(e);
    }
  }

  const names = collectWorldInfoNamesFromDomCore(deps);
  if (names.length > 0) {
    deps.setCachedNames(names);
    return names;
  }

  try {
    const resp = await deps.fetchSettings();
    if (resp.ok) {
      const data = await resp.json();
      const names = normalizeWorldInfoNameListCore(data.world_names || []);
      deps.setCachedNames(names);
      return names;
    }
  } catch (e) {}

  deps.setCachedNames([]);
  return [];
}

export function sanitizeWiActivePresetStateCore(save = false, deps) {
  const settings = deps.extensionSettings[deps.extensionName];
  const presets = settings.wiActivePresets || [];
  const existingNameSet = deps.getExistingWorldInfoNameSet();
  let presetChanged = false;
  let presetIdx = 0;
  for (const preset of presets) {
    if (!preset || typeof preset !== "object") continue;
    // name 兜底：缺失或空白的分组名补默认名，避免界面显示 undefined
    if (typeof preset.name !== "string" || !preset.name.trim()) {
      preset.name = `未命名分组 ${presetIdx + 1}`;
      presetChanged = true;
    }
    const prevBooks = Array.isArray(preset.books) ? preset.books : [];
    const nextBooks = deps.filterExistingWorldInfoNames(
      prevBooks,
      existingNameSet,
    );
    const sameBooks =
      prevBooks.length === nextBooks.length &&
      prevBooks.every((name, idx) => name === nextBooks[idx]);
    if (!sameBooks || !Array.isArray(preset.books)) {
      preset.books = nextBooks;
      presetChanged = true;
    }
    presetIdx++;
  }

  const applied = Array.isArray(settings._wiAppliedPresetIndices)
    ? settings._wiAppliedPresetIndices
    : [];
  const nextApplied = applied.filter(
    (idx) =>
      presets[idx] &&
      Array.isArray(presets[idx].books) &&
      presets[idx].books.length > 0,
  );
  const appliedChanged =
    applied.length !== nextApplied.length ||
    applied.some((idx, i) => idx !== nextApplied[i]);
  if (appliedChanged) {
    settings._wiAppliedPresetIndices = nextApplied;
  }
  if (save && (presetChanged || appliedChanged)) {
    deps.saveSettingsDebounced();
  }
  return {
    presets,
    existingNameSet,
    changed: presetChanged || appliedChanged,
  };
}

export function getWiActivePresetsCore(deps) {
  deps.sanitizeWiActivePresetState(true);
  return deps.extensionSettings[deps.extensionName].wiActivePresets || [];
}

export function saveWiActivePresetCore(name, books, scope, bindChars, bindPresets, deps) {
  const presets = deps.getWiActivePresets();
  const existing = presets.find((p) => p.name === name);
  if (existing) {
    existing.books = books;
    if (scope !== undefined) existing.scope = scope;
    if (bindChars !== undefined) existing.bindChars = bindChars;
    if (bindPresets !== undefined) existing.bindPresets = bindPresets;
  } else {
    presets.push({
      name,
      books,
      scope: scope || "global",
      bindChars: bindChars || [],
      bindPresets: bindPresets || [],
    });
  }
  deps.extensionSettings[deps.extensionName].wiActivePresets = presets;
  deps.saveSettingsDebounced();
}

export function deleteWiActivePresetCore(name, deps) {
  const presets = deps.getWiActivePresets();
  deps.extensionSettings[deps.extensionName].wiActivePresets = presets.filter(
    (p) => p.name !== name,
  );
  deps.saveSettingsDebounced();
}

export function renameWiActivePresetCore(oldName, newName, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets.find((preset) => preset.name === oldName);
  if (p) {
    p.name = newName;
    deps.saveSettingsDebounced();
  }
}


// ===== showWiPresetPanel 拆分（世界书激活分组面板） =====
export function createWiPresetPanelApi(deps) {
  const {
    $,
    applyWorldInfoPreset,
    bindWiPresetToChar,
    bindWiPresetToChat,
    bindWiPresetToPreset,
    cfmConfirm,
    cfmToastr,
    createChoiceDialog,
    deleteWiActivePreset,
    escapeHtml,
    extensionName,
    extension_settings,
    getActiveWorldInfoSet,
    getAutoApplyPresetIndices,
    getCharBoundWorldBooks,
    getCharacters,
    getContext,
    getCurrentCharAvatar,
    getCurrentCharName,
    getCurrentChatBindKey,
    getCurrentChatFileName,
    getCurrentPresetName,
    getWiActivePresets,
    getWiPresetBindSummary,
    parseChatBindKey,
    renderWorldInfoView,
    saveWiActivePreset,
    setWiPresetScope,
    showWiPresetEditPopup,
    toggleWorldInfoActivation,
    unapplyWiPresetIndex,
    unbindWiPresetFromChar,
    unbindWiPresetFromChat,
    unbindWiPresetFromPreset,
    document,
    window,
    setTimeout,
    console,
    parseInt,
  } = deps;

  async function showWiPresetPanelCore() {
    if ($("#cfm-wi-preset-panel-overlay").length > 0) return;
    const wiActiveSet = await getActiveWorldInfoSet();
    const wiCharBound = await getCharBoundWorldBooks();
    const savableBooks = [...wiActiveSet].filter((b) => !wiCharBound.has(b));
    const presets = getWiActivePresets();
    const currentChar = getCurrentCharAvatar();
    const currentCharName = getCurrentCharName();
    const currentPresetName = getCurrentPresetName();

    // 检测当前激活组合是否与某个已有分组完全相同
    const savableSet = new Set(savableBooks);
    let matchedPresetName = null;
    for (const p of presets) {
      if (
        p.books.length === savableBooks.length &&
        p.books.every((b) => savableSet.has(b))
      ) {
        matchedPresetName = p.name;
        break;
      }
    }

    // scope 标签映射（global=全局不自动管理，bound=有绑定自动管理）
    const scopeLabels = { global: "全局", bound: "已绑定" };
    const scopeColors = { global: "#a6e3a1", bound: "#cba6f7" };

    // 构建已有分组列表（用索引定位）
    const appliedPresetIndices = new Set(
      extension_settings[extensionName]._wiAppliedPresetIndices || [],
    );
    const currentWiActiveSet = new Set();
    $("#world_info")
      .find("option:selected")
      .each(function () {
        currentWiActiveSet.add($(this).text());
      });
    const presetsHtml =
      presets.length === 0
        ? `<div class="cfm-wi-preset-empty">暂无已保存的分组</div>`
        : presets
            .map((p, idx) => {
              const scope = p.scope || "global";
              const hasBindings =
                (p.bindChars && p.bindChars.length > 0) ||
                (p.bindPresets && p.bindPresets.length > 0) ||
                (p.bindChats && p.bindChats.length > 0);
              const bindSummary = getWiPresetBindSummary(p);
              const isApplied =
                appliedPresetIndices.has(idx) ||
                p.books.every((b) => currentWiActiveSet.has(b));
              return `
        <div class="cfm-wi-preset-item" data-preset-idx="${idx}">
          <div class="cfm-wi-preset-item-left">
            <span class="cfm-wi-preset-item-name"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(p.name || "未命名分组")}</span>
            <span class="cfm-wi-preset-scope-tag" style="color:${scopeColors[scope]};border-color:${scopeColors[scope]}40;background:${scopeColors[scope]}15;">${scopeLabels[scope]}</span>
            <span class="cfm-wi-preset-item-count">${p.books.length} 个</span>
            ${hasBindings ? `<span class="cfm-wi-preset-bind-toggle" title="查看绑定"><i class="fa-solid fa-caret-down"></i></span>` : ""}
          </div>
          <span class="cfm-wi-preset-item-actions">
            <i class="fa-solid fa-play cfm-wi-preset-apply ${isApplied ? "cfm-wi-preset-apply-active" : ""}" title="${isApplied ? "当前已激活" : "应用到全局"}" style="${isApplied ? "color:#a6e3a1;text-shadow:0 0 8px rgba(166,227,161,.55);" : ""}"></i>
            <i class="fa-solid fa-stop cfm-wi-preset-unapply" title="取消应用"></i>
            <i class="fa-solid fa-link cfm-wi-preset-bind" title="绑定管理"></i>
            <i class="fa-solid fa-pen cfm-wi-preset-edit" title="编辑"></i>
            <i class="fa-solid fa-trash cfm-wi-preset-del" title="删除"></i>
          </span>
          ${hasBindings ? `<div class="cfm-wi-preset-bind-dropdown" style="display:none;"></div>` : ""}
        </div>
      `;
            })
            .join("");

    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-wi-preset-panel-overlay">
        <div class="cfm-edit-popup cfm-wi-preset-panel">
          <div class="cfm-edit-popup-title"><i class="fa-solid fa-layer-group" style="margin-right:6px;"></i>世界书激活分组</div>
          <div class="cfm-wi-preset-save-section">
            <div class="cfm-wi-preset-save-row">
              <input type="text" class="cfm-edit-input" id="cfm-wi-preset-name-input" placeholder="输入分组名称，保存当前激活的 ${savableBooks.length} 个世界书">
              <button class="cfm-edit-popup-confirm" id="cfm-wi-preset-save-confirm" ${savableBooks.length === 0 ? "disabled" : ""}><i class="fa-solid fa-floppy-disk"></i> 保存</button>
            </div>
            ${savableBooks.length === 0 ? '<div class="cfm-wi-preset-save-hint">当前没有手动激活的世界书可保存</div>' : ""}
            ${matchedPresetName ? `<div class="cfm-wi-preset-save-hint" style="color:#f9e2af;">当前激活组合与已有分组「${escapeHtml(matchedPresetName)}」相同</div>` : ""}
          </div>
          <div class="cfm-wi-preset-divider"></div>
          <div class="cfm-wi-preset-list-section">
            <div class="cfm-wi-preset-list-title">已保存的分组</div>
            <div class="cfm-wi-preset-list">${presetsHtml}</div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-edit-popup-cancel">关闭</button>
          </div>
        </div>
      </div>
    `);
    $("body").append(overlay);
    overlay.find("#cfm-wi-preset-name-input").focus();

    // 关闭
    overlay
      .find(".cfm-edit-popup")
      .on("click mousedown mouseup touchstart touchend", (e) => {
        e.stopPropagation();
      });
    overlay.find(".cfm-edit-popup-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
    });
    overlay.on("click touchend", (e) => {
      if ($(e.target).is(overlay)) {
        e.preventDefault();
        e.stopPropagation();
        overlay.remove();
      }
    });

    // 保存当前分组
    overlay.find("#cfm-wi-preset-name-input").on("keydown", (e) => {
      if (e.key === "Enter")
        overlay.find("#cfm-wi-preset-save-confirm").trigger("click");
      if (e.key === "Escape") overlay.remove();
    });
    overlay.find("#cfm-wi-preset-save-confirm").on("click", () => {
      if (savableBooks.length === 0) return;
      const name = overlay.find("#cfm-wi-preset-name-input").val().trim();
      if (!name) {
        cfmToastr.warning("请输入分组名称");
        return;
      }
      const existing = getWiActivePresets().find((p) => p.name === name);
      if (existing) {
        if (!cfmConfirm(`分组「${name}」已存在，是否覆盖？`)) return;
      }
      saveWiActivePreset(name, savableBooks);
      cfmToastr.success(
        `已保存激活分组「${name}」（${savableBooks.length} 个世界书）`,
      );
      overlay.remove();
    });

    // 应用分组到全局（用索引定位）
    overlay.find(".cfm-wi-preset-apply").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getWiActivePresets();
      const preset = currentPresets[idx];
      if (!preset) {
        cfmToastr.error("分组不存在");
        return;
      }
      try {
        const applied =
          extension_settings[extensionName]._wiAppliedPresetIndices || [];
        // 过滤掉已不存在的索引和当前要应用的索引
        const otherApplied = applied.filter(
          (i) => i !== idx && currentPresets[i],
        );

        let mode = "stack"; // 默认叠加
        if (otherApplied.length > 0) {
          const otherNames = otherApplied
            .map((i) => currentPresets[i].name)
            .join("、");
          // 弹出三选一确认框
          const choice = await createChoiceDialog({
            title: "应用方式",
            message: `当前已有分组「${escapeHtml(otherNames)}」处于应用状态。<br>请选择应用方式：`,
            choices: [
              { value: "cancel", label: "取消", className: "cfm-edit-popup-cancel" },
              { value: "replace", label: "替换", className: "cfm-edit-popup-confirm", style: "background:#f38ba8;" },
              { value: "stack", label: "叠加", className: "cfm-edit-popup-confirm" },
            ],
          });
          if (choice === "cancel") return;
          mode = choice;
        }

        const autoAppliedState = getAutoApplyPresetIndices();
        const autoDetail = autoAppliedState.details[idx] || {};
        const currentActiveSet = await getActiveWorldInfoSet();
        const isActuallyApplied = preset.books.every((b) =>
          currentActiveSet.has(b),
        );
        if (
          autoAppliedState.indices.includes(idx) &&
          isActuallyApplied &&
          (autoDetail.charMatch ||
            autoDetail.presetMatch ||
            autoDetail.chatMatch)
        ) {
          const reasons = [];
          if (autoDetail.chatMatch) reasons.push("当前聊天");
          if (autoDetail.charMatch) reasons.push("当前角色");
          if (autoDetail.presetMatch) reasons.push("当前预设");
          cfmToastr.info(
            `分组「${preset.name}」已因${reasons.join("和")}绑定自动生效`,
          );
          return;
        }

        if (mode === "replace") {
          // 替换模式：先关闭其他已应用分组的独占世界书
          const keepBooks = new Set(preset.books);
          for (const oi of otherApplied) {
            if (currentPresets[oi]) {
              for (const b of currentPresets[oi].books) {
                if (!wiCharBound.has(b) && !keepBooks.has(b)) {
                  await toggleWorldInfoActivation(b, false);
                }
              }
            }
          }
        }

        // 激活当前分组的世界书
        for (const b of preset.books) {
          if (!wiCharBound.has(b)) {
            await toggleWorldInfoActivation(b, true);
          }
        }

        // 更新追踪
        const newApplied =
          mode === "replace"
            ? [idx]
            : [...otherApplied.filter((i) => i !== idx), idx];
        extension_settings[extensionName]._wiAppliedPresetIndices = newApplied;
        getContext().saveSettingsDebounced();

        cfmToastr.success(
          `已${mode === "replace" ? "替换" : "叠加"}应用分组「${preset.name}」`,
        );
        overlay.remove();
        renderWorldInfoView();
      } catch (err) {
        console.error("[CFM] 应用分组失败", err);
        cfmToastr.error("应用分组失败");
      }
    });

    // 取消应用分组（只移除该分组独占的世界书）
    overlay.find(".cfm-wi-preset-unapply").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getWiActivePresets();
      const preset = currentPresets[idx];
      if (!preset) {
        cfmToastr.error("分组不存在");
        return;
      }
      try {
        const applied =
          extension_settings[extensionName]._wiAppliedPresetIndices || [];
        if (!applied.includes(idx)) {
          cfmToastr.warning(`分组「${preset.name}」当前未处于应用状态`);
          return;
        }
        // 检查该分组是否因绑定条件匹配而自动应用
        const { indices: autoIndices, details: autoDetails } =
          getAutoApplyPresetIndices();
        if (autoIndices.includes(idx)) {
          const detail = autoDetails[idx] || {};
          const reasons = [];
          if (detail.charMatch)
            reasons.push(
              `角色「${escapeHtml(getCurrentCharName() || getCurrentCharAvatar())}」`,
            );
          if (detail.presetMatch)
            reasons.push(`预设「${escapeHtml(getCurrentPresetName())}」`);
          const confirmMsg = `分组「${preset.name}」当前因${reasons.join(" 和 ")}自动应用，确认取消应用吗？`;
          if (!cfmConfirm(confirmMsg)) return;
        }
        // 计算其他已应用分组覆盖的世界书
        const otherApplied = applied.filter(
          (i) => i !== idx && currentPresets[i],
        );
        const otherBooks = new Set();
        for (const oi of otherApplied) {
          for (const b of currentPresets[oi].books) otherBooks.add(b);
        }
        // 只移除该分组独占的世界书（不被其他已应用分组包含的）
        let removedCount = 0;
        for (const b of preset.books) {
          if (!wiCharBound.has(b) && !otherBooks.has(b)) {
            await toggleWorldInfoActivation(b, false);
            removedCount++;
          }
        }
        // 从追踪中移除
        extension_settings[extensionName]._wiAppliedPresetIndices =
          otherApplied;
        getContext().saveSettingsDebounced();

        cfmToastr.success(
          `已取消应用分组「${preset.name}」（移除 ${removedCount} 个独占世界书）`,
        );
        overlay.remove();
        renderWorldInfoView();
      } catch (err) {
        console.error("[CFM] 取消应用分组失败", err);
        cfmToastr.error("取消应用分组失败");
      }
    });

    // 绑定管理按钮
    overlay.find(".cfm-wi-preset-bind").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      const btn = $(this);
      const item = btn.closest(".cfm-wi-preset-item");
      const idx = parseInt(item.attr("data-preset-idx"), 10);
      // 关闭其他已打开的绑定菜单
      $(".cfm-wi-preset-bind-menu").remove();
      const menu = $(`
        <div class="cfm-wi-preset-bind-menu">
          <div class="cfm-wi-preset-bind-menu-title">应用方式</div>
          <div class="cfm-wi-preset-bind-menu-item" data-action="global"><i class="fa-solid fa-globe" style="color:#a6e3a1;"></i> 应用到全局</div>
          <div class="cfm-wi-preset-bind-menu-item ${!currentPresetName ? "cfm-disabled" : ""}" data-action="preset"><i class="fa-solid fa-sliders" style="color:#89b4fa;"></i> 绑定到当前预设${currentPresetName ? "「" + escapeHtml(currentPresetName) + "」" : "（无预设）"}</div>
          <div class="cfm-wi-preset-bind-menu-item ${!currentChar ? "cfm-disabled" : ""}" data-action="char">
            <span style="display:flex;align-items:center;min-width:0;flex:1;"><i class="fa-solid fa-user" style="color:#f9e2af;"></i><span style="margin-left:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">绑定到当前角色${currentCharName ? "「" + escapeHtml(currentCharName) + "」" : "（无角色）"}</span></span>
            <i class="fa-solid fa-caret-down cfm-wi-bind-chat-toggle" style="margin-left:auto;opacity:.7;"></i>
          </div>
          <div class="cfm-wi-preset-bind-menu-item cfm-wi-preset-bind-subitem ${!getCurrentChatBindKey() ? "cfm-disabled" : ""}" data-action="chat" style="display:none;"><i class="fa-solid fa-comments" style="color:#cba6f7;"></i> 绑定到当前聊天${getCurrentChatFileName() ? "「" + escapeHtml(getCurrentChatFileName()) + "」" : "（无聊天）"}</div>
        </div>
      `);
      // append 到 overlay 层避免被 overflow 裁剪，用 fixed 定位
      overlay.append(menu);
      const btnRect = btn[0].getBoundingClientRect();
      let menuTop = btnRect.bottom + 4;
      let menuLeft = btnRect.right - 240;
      // 边界检测
      if (menuLeft < 8) menuLeft = 8;
      if (menuTop + 160 > window.innerHeight) menuTop = btnRect.top - 160;
      menu.css({ top: menuTop + "px", left: menuLeft + "px" });

      menu.find(".cfm-wi-bind-chat-toggle").on("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const chatItem = menu.find('[data-action="chat"]');
        if (!chatItem.length) return;
        const willShow = !chatItem.is(":visible");
        chatItem.stop(true, true).slideToggle(150);
        $(this)
          .toggleClass("fa-caret-down", !willShow)
          .toggleClass("fa-caret-up", willShow);
      });

      menu
        .find(".cfm-wi-preset-bind-menu-item")
        .on("click", async function (ev) {
          ev.stopPropagation();
          if ($(ev.target).closest(".cfm-wi-bind-chat-toggle").length) return;
          if ($(this).hasClass("cfm-disabled")) return;
          const action = $(this).data("action");
          const allPresets = getWiActivePresets();
          const preset = allPresets[idx];
          if (!preset) return;

          if (action === "global") {
            setWiPresetScope(idx, "global");
            await applyWorldInfoPreset(preset.books, wiCharBound);
            cfmToastr.success(`已将分组「${preset.name}」设为全局应用`);
          } else if (action === "preset") {
            if (!currentPresetName) return;
            const alreadyBound =
              Array.isArray(preset.bindPresets) &&
              preset.bindPresets.includes(currentPresetName);
            const autoApplied = getAutoApplyPresetIndices();
            if (alreadyBound) {
              if (
                autoApplied.indices.includes(idx) &&
                autoApplied.details[idx]?.presetMatch
              ) {
                cfmToastr.info(
                  `分组「${preset.name}」已绑定当前预设，且已处于应用状态`,
                );
              } else {
                cfmToastr.info(`当前预设已绑定分组「${preset.name}」`);
              }
            } else {
              // 确保 scope 为 bound
              if (preset.scope === "global") setWiPresetScope(idx, "bound");
              bindWiPresetToPreset(idx, currentPresetName);
              await applyWorldInfoPreset(preset.books, wiCharBound);
              cfmToastr.success(
                `已将分组「${preset.name}」绑定到预设「${currentPresetName}」`,
              );
            }
          } else if (action === "char") {
            if (!currentChar) return;
            const alreadyBound =
              Array.isArray(preset.bindChars) &&
              preset.bindChars.includes(currentChar);
            const autoApplied = getAutoApplyPresetIndices();
            if (alreadyBound) {
              if (
                autoApplied.indices.includes(idx) &&
                autoApplied.details[idx]?.charMatch
              ) {
                cfmToastr.info(
                  `分组「${preset.name}」已绑定当前角色，且已处于应用状态`,
                );
              } else {
                cfmToastr.info(`当前角色已绑定分组「${preset.name}」`);
              }
            } else {
              if (preset.scope === "global") setWiPresetScope(idx, "bound");
              bindWiPresetToChar(idx, currentChar);
              await applyWorldInfoPreset(preset.books, wiCharBound);
              cfmToastr.success(
                `已将分组「${preset.name}」绑定到角色「${currentCharName}」`,
              );
            }
          } else if (action === "chat") {
            const currentChatKey = getCurrentChatBindKey();
            const currentChatName = getCurrentChatFileName();
            if (!currentChar || !currentChatKey || !currentChatName) return;
            const alreadyBound =
              Array.isArray(preset.bindChats) &&
              preset.bindChats.includes(currentChatKey);
            const autoApplied = getAutoApplyPresetIndices();
            if (alreadyBound) {
              if (
                autoApplied.indices.includes(idx) &&
                autoApplied.details[idx]?.chatMatch
              ) {
                cfmToastr.info(
                  `分组「${preset.name}」已绑定当前聊天，且已处于应用状态`,
                );
              } else {
                cfmToastr.info(`当前聊天已绑定分组「${preset.name}」`);
              }
            } else {
              if (preset.scope === "global") setWiPresetScope(idx, "bound");
              bindWiPresetToChat(idx, currentChar, currentChatName);
              await applyWorldInfoPreset(preset.books, wiCharBound);
              cfmToastr.success(
                `已将分组「${preset.name}」绑定到聊天「${currentChatName}」`,
              );
            }
          }
          menu.remove();
          overlay.remove();
          showWiPresetPanelCore();
        });

      // 点击其他地方关闭菜单
      setTimeout(() => {
        $(document).one("click", () => menu.remove());
      }, 10);
    });

    // 绑定三角下拉：展开/收起绑定详情
    overlay.find(".cfm-wi-preset-bind-toggle").on("click", function (e) {
      e.stopPropagation();
      const item = $(this).closest(".cfm-wi-preset-item");
      const idx = parseInt(item.attr("data-preset-idx"), 10);
      const dropdown = item.find(".cfm-wi-preset-bind-dropdown");
      const icon = $(this).find("i");

      if (dropdown.is(":visible")) {
        dropdown.slideUp(150);
        icon.removeClass("fa-caret-up").addClass("fa-caret-down");
        return;
      }

      // 构建绑定详情内容
      const allPresets = getWiActivePresets();
      const preset = allPresets[idx];
      if (!preset) return;

      let html = "";
      if (preset.bindChars && preset.bindChars.length > 0) {
        const chars = getCharacters();
        html +=
          '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-user" style="color:#f9e2af;"></i> 绑定的角色卡</div>';
        for (const av of preset.bindChars) {
          const ch = chars.find((c) => c.avatar === av);
          const name = ch ? ch.name : av;
          const isCurrentChar = !!currentChar && currentChar === av;
          html += `<div class="cfm-wi-bind-entry ${isCurrentChar ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="char" data-bind-id="${escapeHtml(av)}">
            <span class="cfm-wi-bind-entry-name">${escapeHtml(name)}</span>
            <i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i>
          </div>`;
        }
      }
      if (preset.bindChats && preset.bindChats.length > 0) {
        const chars = getCharacters();
        html +=
          '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-comments" style="color:#cba6f7;"></i> 绑定的聊天</div>';
        for (const bindKey of preset.bindChats) {
          const parsed = parseChatBindKey(bindKey);
          const ch = chars.find((c) => c.avatar === parsed.avatar);
          const charName = ch ? ch.name : parsed.avatar;
          const name = `${charName}（${parsed.chatFileName || bindKey}）`;
          const isCurrentChat = getCurrentChatBindKey() === bindKey;
          html += `<div class="cfm-wi-bind-entry ${isCurrentChat ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="chat" data-bind-id="${escapeHtml(bindKey)}">
            <span class="cfm-wi-bind-entry-name">${escapeHtml(name)}</span>
            <i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i>
          </div>`;
        }
      }
      if (preset.bindPresets && preset.bindPresets.length > 0) {
        html +=
          '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-sliders" style="color:#89b4fa;"></i> 绑定的预设</div>';
        for (const pn of preset.bindPresets) {
          const isCurrentPreset =
            !!currentPresetName && currentPresetName === pn;
          html += `<div class="cfm-wi-bind-entry ${isCurrentPreset ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="preset" data-bind-id="${escapeHtml(pn)}">
            <span class="cfm-wi-bind-entry-name">${escapeHtml(pn)}</span>
            <i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i>
          </div>`;
        }
      }
      if (!html) html = '<div class="cfm-wi-bind-empty">无绑定</div>';

      dropdown.html(html);
      dropdown.slideDown(150);
      icon.removeClass("fa-caret-down").addClass("fa-caret-up");

      // 取消绑定事件
      dropdown.find(".cfm-wi-bind-remove").on("click", async function (ev) {
        ev.stopPropagation();
        const entry = $(this).closest(".cfm-wi-bind-entry");
        const bindType = entry.data("bind-type");
        const bindId = entry.data("bind-id");
        const displayName = entry.find(".cfm-wi-bind-entry-name").text();
        if (
          !cfmConfirm(
            `确定取消分组「${preset.name}」与${bindType === "char" ? "角色" : bindType === "chat" ? "聊天" : "预设"}「${displayName}」的绑定？`,
          )
        )
          return;
        if (bindType === "char") {
          unbindWiPresetFromChar(idx, bindId);
        } else if (bindType === "chat") {
          unbindWiPresetFromChat(idx, bindId);
        } else {
          unbindWiPresetFromPreset(idx, bindId);
        }
        // 取消绑定后，检查该分组是否仍满足自动应用条件，不满足则自动取消应用
        const applied =
          extension_settings[extensionName]._wiAppliedPresetIndices || [];
        if (applied.includes(idx)) {
          const { indices: stillAutoIndices } = getAutoApplyPresetIndices();
          if (!stillAutoIndices.includes(idx)) {
            const removedCount = await unapplyWiPresetIndex(idx);
            cfmToastr.info(
              `已取消绑定，分组「${preset.name}」不再匹配当前条件，已自动取消应用（移除 ${removedCount} 个世界书）`,
            );
          } else {
            cfmToastr.success(
              `已取消绑定（分组仍因其他绑定条件匹配而保持应用）`,
            );
          }
        } else {
          cfmToastr.success(`已取消绑定`);
        }
        // 检查是否还有绑定，如果没有了就恢复为全局
        const updated = getWiActivePresets()[idx];
        const stillHasBindings =
          updated &&
          ((updated.bindChars && updated.bindChars.length > 0) ||
            (updated.bindPresets && updated.bindPresets.length > 0) ||
            (updated.bindChats && updated.bindChats.length > 0));
        if (!stillHasBindings) {
          if (updated) setWiPresetScope(idx, "global");
          // 最后一个绑定被取消，重建面板
          overlay.remove();
          showWiPresetPanelCore();
        } else {
          // 仍有其他绑定，只刷新当前下拉内容
          entry.remove();
          // 更新 scope 标签和绑定摘要
          const item = overlay.find(
            `.cfm-wi-preset-item[data-preset-idx="${idx}"]`,
          );
          const bindSummary = getWiPresetBindSummary(updated);
          item
            .find(".cfm-wi-preset-scope-tag")
            .text("绑定")
            .css("color", "#cba6f7");
          // 如果下拉中没有条目了（理论上不会走到这里），也收起
          if (dropdown.find(".cfm-wi-bind-entry").length === 0) {
            dropdown.slideUp(150);
            icon.removeClass("fa-caret-up").addClass("fa-caret-down");
          }
        }
      });
    });

    // 编辑分组（用索引定位）
    overlay.find(".cfm-wi-preset-edit").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getWiActivePresets();
      const preset = currentPresets[idx];
      if (!preset) return;
      overlay.remove();
      showWiPresetEditPopup(preset);
    });

    // 删除分组（用索引定位）
    overlay.find(".cfm-wi-preset-del").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getWiActivePresets();
      const preset = currentPresets[idx];
      if (!preset) return;
      if (!cfmConfirm(`确定删除激活分组「${preset.name}」？`)) return;
      deleteWiActivePreset(preset.name);
      cfmToastr.success(`已删除激活分组「${preset.name}」`);
      // 刷新面板
      overlay.remove();
      showWiPresetPanelCore();
    });
  }

  return { showWiPresetPanel: showWiPresetPanelCore };
}
