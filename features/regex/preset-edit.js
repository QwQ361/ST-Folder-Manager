// 正则激活分组：面板 showRegexPresetPanel（保存/应用/绑定/删除）+ 编辑弹窗 showRegexPresetEditPopup。
export function createRegexPresetEditApi(deps) {
  const {
    $,
    extensionName,
    extension_settings,
    cfmToastr,
    cfmConfirm,
    escapeHtml,
    getContext,
    getRegexActivePresets,
    saveRegexActivePreset,
    renameRegexActivePreset,
    deleteRegexActivePreset,
    getEnabledRegexScriptIds,
    getCurrentCharAvatar,
    getCurrentCharName,
    getCurrentPresetName,
    getCurrentChatFileName,
    getCurrentChatBindKey,
    getCharacters,
    parseChatBindKey,
    createChoiceDialog,
    toggleRegexScriptActivation,
    syncNativeRegexState,
    renderRegexView,
    getRegexAutoApplyPresetIndices,
    setRegexPresetScope,
    bindRegexPresetToPreset,
    bindRegexPresetToChar,
    bindRegexPresetToChat,
    unbindRegexPresetFromPreset,
    unbindRegexPresetFromChar,
    unbindRegexPresetFromChat,
    unapplyRegexPresetIndex,
    autoApplyRegexPresets,
    showPresetEditFolderFilterPanel,
  } = deps;

  function showRegexPresetEditPopup(preset) {
    if ($("#cfm-regex-preset-edit-overlay").length > 0) return;
    const globalScripts = extension_settings.regex ?? [];
    const scriptSet = new Set(preset.scripts);
    const globalGroups =
      extension_settings[extensionName].regexGlobalGroups || {};
    const folderTree = extension_settings[extensionName].regexFolderTree || {};

    const scriptsHtml = globalScripts
      .filter((s) => s.id)
      .map((s) => {
        const checked = scriptSet.has(s.id) ? "checked" : "";
        const folder = globalGroups[s.id] || "";
        return `<label class="cfm-wi-preset-edit-item" data-folder="${escapeHtml(folder)}">
          <input type="checkbox" value="${escapeHtml(s.id)}" ${checked}>
          <i class="fa-solid fa-code" style="color:#a6e3a1;"></i>
          <span>${escapeHtml(s.scriptName || "(未命名)")}</span>
        </label>`;
      })
      .join("");

    // 构建文件夹过滤选项
    function buildRegexFilterOptions() {
      const opts = [
        '<option value="__all__">全部</option>',
        '<option value="__ungrouped__">未归类</option>',
      ];
      function addOpts(parentId, depth) {
        const children = Object.keys(folderTree)
          .filter((id) => folderTree[id].parentId === (parentId || null))
          .sort((a, b) =>
            (folderTree[a]?.displayName || a).localeCompare(
              folderTree[b]?.displayName || b,
              "zh-CN",
            ),
          );
        for (const id of children) {
          const indent = "&nbsp;".repeat(depth * 3);
          opts.push(
            `<option value="${escapeHtml(id)}">${indent}📁 ${escapeHtml(folderTree[id]?.displayName || id)}</option>`,
          );
          addOpts(id, depth + 1);
        }
      }
      addOpts(null, 0);
      return opts.join("");
    }

    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-regex-preset-edit-overlay">
        <div class="cfm-edit-popup cfm-wi-preset-edit-popup">
          <div class="cfm-edit-popup-title">编辑正则激活分组</div>
          <div class="cfm-edit-field">
            <label>分组名称</label>
            <input type="text" class="cfm-edit-input" id="cfm-regex-preset-edit-name" value="${escapeHtml(preset.name || "未命名分组")}">
          </div>
          <div class="cfm-edit-field">
            <label>包含的正则脚本</label>
            <div class="cfm-wi-preset-edit-search">
              <div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" id="cfm-regex-preset-edit-folder-btn" title="文件夹过滤"></div>
              <span class="cfm-wi-preset-edit-folder-label" id="cfm-regex-preset-edit-folder-label">显示全部</span>
              <input type="hidden" id="cfm-regex-preset-edit-folder-filter" value="__all__">
              <input type="text" class="cfm-edit-input" id="cfm-regex-preset-edit-filter" placeholder="搜索...">
            </div>
            <div class="cfm-wi-preset-edit-list">${scriptsHtml}</div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-edit-popup-cancel">取消</button>
            <button class="cfm-edit-popup-confirm">保存</button>
          </div>
        </div>
      </div>
    `);
    $("body").append(overlay);

    // 组合过滤函数
    function getRegexFolderFilterLabel(folderVal) {
      if (!folderVal || folderVal === "__all__") return "显示全部";
      if (folderVal === "__current_selected__") return "当前分组";
      if (folderVal === "__ungrouped__") return "未归类正则脚本";
      return folderTree[folderVal]?.displayName || folderVal;
    }

    function applyEditFilters() {
      const folderVal =
        overlay.find("#cfm-regex-preset-edit-folder-filter").val() || "__all__";
      overlay
        .find("#cfm-regex-preset-edit-folder-label")
        .text(getRegexFolderFilterLabel(folderVal));
      const q = overlay
        .find("#cfm-regex-preset-edit-filter")
        .val()
        .toLowerCase()
        .trim();
      let allowedFolders = null;
      if (
        folderVal &&
        folderVal !== "__all__" &&
        folderVal !== "__ungrouped__" &&
        folderVal !== "__current_selected__"
      ) {
        allowedFolders = new Set();
        function collectChildren(pid) {
          allowedFolders.add(pid);
          const children = Object.keys(folderTree).filter(
            (id) => folderTree[id].parentId === pid,
          );
          for (const c of children) collectChildren(c);
        }
        collectChildren(folderVal);
      }
      overlay.find(".cfm-wi-preset-edit-item").each(function () {
        const name = $(this).find("span").text().toLowerCase();
        const folder = $(this).attr("data-folder") || "";
        const isChecked = $(this).find("input").prop("checked");
        let folderMatch = true;
        if (folderVal === "__current_selected__") {
          folderMatch = isChecked;
        } else if (folderVal === "__ungrouped__") {
          folderMatch = !folder || !folderTree[folder];
        } else if (allowedFolders) {
          folderMatch = allowedFolders.has(folder);
        }
        const textMatch = !q || name.includes(q);
        $(this).toggle(folderMatch && textMatch);
      });
    }
    overlay.find("#cfm-regex-preset-edit-folder-btn").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const currentCheckedInput = overlay
        .find(".cfm-wi-preset-edit-item input:checked")
        .first();
      const currentCheckedItem = currentCheckedInput.closest(
        ".cfm-wi-preset-edit-item",
      );
      const currentCheckedFolderRaw =
        currentCheckedItem.attr("data-folder") || "";
      const currentCheckedFolder =
        currentCheckedFolderRaw && folderTree[currentCheckedFolderRaw]
          ? currentCheckedFolderRaw
          : "__ungrouped__";
      showPresetEditFolderFilterPanel($(this), {
        panelKey: "regex_preset_edit",
        folderTree,
        getDisplayName: (id) => folderTree[id]?.displayName || id,
        getItemCount: (folderId) => {
          if (folderId === "__ungrouped__") {
            return globalScripts.filter((script) => {
              const grp = globalGroups[script.id];
              return !grp || !folderTree[grp];
            }).length;
          }
          const allowedFolders = new Set();
          function collectChildren(pid) {
            allowedFolders.add(pid);
            const children = Object.keys(folderTree).filter(
              (id) => folderTree[id].parentId === pid,
            );
            for (const c of children) collectChildren(c);
          }
          collectChildren(folderId);
          return globalScripts.filter((script) =>
            allowedFolders.has(globalGroups[script.id]),
          ).length;
        },
        ungroupedLabel: "未归类正则脚本",
        currentFilter:
          overlay.find("#cfm-regex-preset-edit-folder-filter").val() ||
          "__all__",
        currentSelectedFilter: "__current_selected__",
        currentSelectedLabel: "当前分组",
        currentSelectedCount: overlay.find(
          ".cfm-wi-preset-edit-item input:checked",
        ).length,
        onSelect: (folderId) => {
          overlay.find("#cfm-regex-preset-edit-folder-filter").val(folderId);
          applyEditFilters();
        },
      });
    });
    overlay.find("#cfm-regex-preset-edit-filter").on("input", applyEditFilters);
    applyEditFilters();
    overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) overlay.remove();
    });
    overlay.find(".cfm-edit-popup-confirm").on("click", () => {
      const newName = overlay.find("#cfm-regex-preset-edit-name").val().trim();
      if (!newName) {
        cfmToastr.warning("请输入分组名称");
        return;
      }
      const existingOther = getRegexActivePresets().find(
        (p) => p.name === newName && p.name !== preset.name,
      );
      if (existingOther) {
        cfmToastr.warning(`分组名称「${newName}」已被使用`);
        return;
      }
      const newScripts = [];
      overlay.find(".cfm-wi-preset-edit-item input:checked").each(function () {
        newScripts.push($(this).val());
      });
      if (newScripts.length === 0) {
        cfmToastr.warning("请至少选择一个正则脚本");
        return;
      }
      if (newName !== preset.name) {
        renameRegexActivePreset(preset.name, newName);
      }
      saveRegexActivePreset(newName, newScripts);
      cfmToastr.success(
        `已更新激活分组「${newName}」（${newScripts.length} 个正则脚本）`,
      );
      overlay.remove();
    });
  }

  /**
   * 显示正则激活分组面板（保存 + 已有分组列表）
   */
  async function showRegexPresetPanel() {
    if ($("#cfm-regex-preset-panel-overlay").length > 0) return;
    const enabledIds = getEnabledRegexScriptIds();
    const enabledSet = new Set(enabledIds);
    const presets = getRegexActivePresets();
    const currentChar = getCurrentCharAvatar();
    const currentCharName = getCurrentCharName();
    const currentPresetName = getCurrentPresetName();
    const scopeLabels = { global: "全局", bound: "已绑定" };
    const scopeColors = { global: "#a6e3a1", bound: "#cba6f7" };

    let matchedPresetName = null;
    for (const p of presets) {
      if (
        p.scripts.length === enabledIds.length &&
        p.scripts.every((id) => enabledSet.has(id))
      ) {
        matchedPresetName = p.name;
        break;
      }
    }

    const appliedPresetIndices = new Set(
      extension_settings[extensionName]._regexAppliedPresetIndices || [],
    );
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
              const isApplied =
                appliedPresetIndices.has(idx) ||
                (p.scripts.length > 0 &&
                  p.scripts.every((id) => enabledSet.has(id)));
              return `
        <div class="cfm-wi-preset-item" data-preset-idx="${idx}">
          <div class="cfm-wi-preset-item-left">
            <span class="cfm-wi-preset-item-name"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(p.name || "未命名分组")}</span>
            <span class="cfm-wi-preset-scope-tag" style="color:${scopeColors[scope]};border-color:${scopeColors[scope]}40;background:${scopeColors[scope]}15;">${scopeLabels[scope]}</span>
            <span class="cfm-wi-preset-item-count">${p.scripts.length} 个</span>
            ${hasBindings ? '<span class="cfm-wi-preset-bind-toggle" title="查看绑定"><i class="fa-solid fa-caret-down"></i></span>' : ""}
          </div>
          <span class="cfm-wi-preset-item-actions">
            <i class="fa-solid fa-play cfm-wi-preset-apply ${isApplied ? "cfm-wi-preset-apply-active" : ""}" title="${isApplied ? "当前已激活" : "应用到全局"}" style="${isApplied ? "color:#a6e3a1;text-shadow:0 0 8px rgba(166,227,161,.55);" : ""}"></i>
            <i class="fa-solid fa-stop cfm-wi-preset-unapply" title="取消应用"></i>
            <i class="fa-solid fa-link cfm-regex-preset-bind" title="绑定管理"></i>
            <i class="fa-solid fa-pen cfm-wi-preset-edit" title="编辑"></i>
            <i class="fa-solid fa-trash cfm-wi-preset-del" title="删除"></i>
          </span>
          ${hasBindings ? '<div class="cfm-wi-preset-bind-dropdown" style="display:none;"></div>' : ""}
        </div>
      `;
            })
            .join("");

    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-regex-preset-panel-overlay">
        <div class="cfm-edit-popup cfm-wi-preset-panel">
          <div class="cfm-edit-popup-title"><i class="fa-solid fa-layer-group" style="margin-right:6px;"></i>正则激活分组</div>
          <div class="cfm-wi-preset-save-section">
            <div class="cfm-wi-preset-save-row">
              <input type="text" class="cfm-edit-input" id="cfm-regex-preset-name-input" placeholder="输入分组名称，保存当前启用的 ${enabledIds.length} 个正则脚本">
              <button class="cfm-edit-popup-confirm" id="cfm-regex-preset-save-confirm" ${enabledIds.length === 0 ? "disabled" : ""}><i class="fa-solid fa-floppy-disk"></i> 保存</button>
            </div>
            ${enabledIds.length === 0 ? '<div class="cfm-wi-preset-save-hint">当前没有启用的全局正则脚本可保存</div>' : ""}
            ${matchedPresetName ? `<div class="cfm-wi-preset-save-hint" style="color:#f9e2af;">当前启用组合与已有分组「${escapeHtml(matchedPresetName)}」相同</div>` : ""}
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
    overlay.find("#cfm-regex-preset-name-input").focus();

    overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) overlay.remove();
    });

    overlay.find("#cfm-regex-preset-name-input").on("keydown", (e) => {
      if (e.key === "Enter")
        overlay.find("#cfm-regex-preset-save-confirm").trigger("click");
      if (e.key === "Escape") overlay.remove();
    });
    overlay.find("#cfm-regex-preset-save-confirm").on("click", () => {
      if (enabledIds.length === 0) return;
      const name = overlay.find("#cfm-regex-preset-name-input").val().trim();
      if (!name) {
        cfmToastr.warning("请输入分组名称");
        return;
      }
      const existing = getRegexActivePresets().find((p) => p.name === name);
      if (existing) {
        if (!cfmConfirm(`分组「${name}」已存在，是否覆盖？`)) return;
      }
      saveRegexActivePreset(name, enabledIds);
      cfmToastr.success(
        `已保存激活分组「${name}」（${enabledIds.length} 个正则脚本）`,
      );
      overlay.remove();
    });

    overlay.find(".cfm-wi-preset-apply").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getRegexActivePresets();
      const preset = currentPresets[idx];
      if (!preset) {
        cfmToastr.error("分组不存在");
        return;
      }
      try {
        const applied =
          extension_settings[extensionName]._regexAppliedPresetIndices || [];
        const otherApplied = applied.filter(
          (i) => i !== idx && currentPresets[i],
        );
        const autoAppliedState = getRegexAutoApplyPresetIndices();
        const autoDetail = autoAppliedState.details[idx] || {};
        const currentEnabledSet = new Set(getEnabledRegexScriptIds());
        const isActuallyApplied = preset.scripts.every((sid) =>
          currentEnabledSet.has(sid),
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

        let mode = "stack";
        if (otherApplied.length > 0) {
          const otherNames = otherApplied
            .map((i) => currentPresets[i].name)
            .join("、");
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

        if (mode === "replace") {
          const keepScripts = new Set(preset.scripts);
          for (const oi of otherApplied) {
            if (currentPresets[oi]) {
              for (const sid of currentPresets[oi].scripts) {
                if (!keepScripts.has(sid)) {
                  toggleRegexScriptActivation(sid, false);
                }
              }
            }
          }
        }

        for (const sid of preset.scripts) {
          toggleRegexScriptActivation(sid, true);
        }

        getContext().saveSettingsDebounced();
        await syncNativeRegexState();

        const newApplied =
          mode === "replace"
            ? [idx]
            : [...otherApplied.filter((i) => i !== idx), idx];
        extension_settings[extensionName]._regexAppliedPresetIndices =
          newApplied;
        getContext().saveSettingsDebounced();

        cfmToastr.success(
          `已${mode === "replace" ? "替换" : "叠加"}应用分组「${preset.name}」`,
        );
        overlay.remove();
        renderRegexView();
      } catch (err) {
        console.error("[CFM] 应用正则分组失败", err);
        cfmToastr.error("应用分组失败");
      }
    });

    overlay.find(".cfm-wi-preset-unapply").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getRegexActivePresets();
      const preset = currentPresets[idx];
      if (!preset) {
        cfmToastr.error("分组不存在");
        return;
      }
      try {
        const applied =
          extension_settings[extensionName]._regexAppliedPresetIndices || [];
        if (!applied.includes(idx)) {
          cfmToastr.warning(`分组「${preset.name}」当前未处于应用状态`);
          return;
        }
        const { indices: autoIndices, details: autoDetails } =
          getRegexAutoApplyPresetIndices();
        if (autoIndices.includes(idx)) {
          const detail = autoDetails[idx] || {};
          const reasons = [];
          if (detail.chatMatch)
            reasons.push(
              `聊天「${escapeHtml(getCurrentChatFileName() || getCurrentChatBindKey())}」`,
            );
          if (detail.charMatch)
            reasons.push(
              `角色「${escapeHtml(getCurrentCharName() || getCurrentCharAvatar())}」`,
            );
          if (detail.presetMatch)
            reasons.push(`预设「${escapeHtml(getCurrentPresetName())}」`);
          const confirmMsg = `分组「${preset.name}」当前因${reasons.join(" 和 ")}自动应用，确认取消应用吗？`;
          if (!cfmConfirm(confirmMsg)) return;
        }
        const otherApplied = applied.filter(
          (i) => i !== idx && currentPresets[i],
        );
        const otherScripts = new Set();
        for (const oi of otherApplied) {
          for (const sid of currentPresets[oi].scripts) otherScripts.add(sid);
        }
        let removedCount = 0;
        for (const sid of preset.scripts) {
          if (!otherScripts.has(sid)) {
            toggleRegexScriptActivation(sid, false);
            removedCount++;
          }
        }
        getContext().saveSettingsDebounced();
        await syncNativeRegexState();
        extension_settings[extensionName]._regexAppliedPresetIndices =
          otherApplied;
        getContext().saveSettingsDebounced();

        cfmToastr.success(
          `已取消应用分组「${preset.name}」（禁用 ${removedCount} 个独占脚本）`,
        );
        overlay.remove();
        renderRegexView();
      } catch (err) {
        console.error("[CFM] 取消应用正则分组失败", err);
        cfmToastr.error("取消应用分组失败");
      }
    });

    overlay.find(".cfm-regex-preset-bind").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      const btn = $(this);
      const item = btn.closest(".cfm-wi-preset-item");
      const idx = parseInt(item.attr("data-preset-idx"), 10);
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
      overlay.append(menu);
      const btnRect = btn[0].getBoundingClientRect();
      let menuTop = btnRect.bottom + 4;
      let menuLeft = btnRect.right - 240;
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
          const allPresets = getRegexActivePresets();
          const preset = allPresets[idx];
          if (!preset) return;

          if (action === "global") {
            setRegexPresetScope(idx, "global");
            menu.remove();
            overlay
              .find(
                `.cfm-wi-preset-item[data-preset-idx="${idx}"] .cfm-wi-preset-apply`,
              )
              .trigger("click");
            return;
          }

          if (action === "preset") {
            if (!currentPresetName) return;
            const alreadyBound =
              Array.isArray(preset.bindPresets) &&
              preset.bindPresets.includes(currentPresetName);
            const autoApplied = getRegexAutoApplyPresetIndices();
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
              if (preset.scope === "global") setRegexPresetScope(idx, "bound");
              bindRegexPresetToPreset(idx, currentPresetName);
              await autoApplyRegexPresets(true);
              cfmToastr.success(
                `已将分组「${preset.name}」绑定到预设「${currentPresetName}」`,
              );
            }
          } else if (action === "char") {
            if (!currentChar) return;
            const alreadyBound =
              Array.isArray(preset.bindChars) &&
              preset.bindChars.includes(currentChar);
            const autoApplied = getRegexAutoApplyPresetIndices();
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
              if (preset.scope === "global") setRegexPresetScope(idx, "bound");
              bindRegexPresetToChar(idx, currentChar);
              await autoApplyRegexPresets(true);
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
            const autoApplied = getRegexAutoApplyPresetIndices();
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
              if (preset.scope === "global") setRegexPresetScope(idx, "bound");
              bindRegexPresetToChat(idx, currentChar, currentChatName);
              await autoApplyRegexPresets(true);
              cfmToastr.success(
                `已将分组「${preset.name}」绑定到聊天「${currentChatName}」`,
              );
            }
          }
          menu.remove();
          overlay.remove();
          showRegexPresetPanel();
        });

      setTimeout(() => {
        $(document).one("click", () => menu.remove());
      }, 10);
    });

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
      const allPresets = getRegexActivePresets();
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
          html += `<div class="cfm-wi-bind-entry ${isCurrentChar ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="char" data-bind-id="${escapeHtml(av)}"><span class="cfm-wi-bind-entry-name">${escapeHtml(name)}</span><i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i></div>`;
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
          html += `<div class="cfm-wi-bind-entry ${isCurrentChat ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="chat" data-bind-id="${escapeHtml(bindKey)}"><span class="cfm-wi-bind-entry-name">${escapeHtml(name)}</span><i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i></div>`;
        }
      }
      if (preset.bindPresets && preset.bindPresets.length > 0) {
        html +=
          '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-sliders" style="color:#89b4fa;"></i> 绑定的预设</div>';
        for (const pn of preset.bindPresets) {
          const isCurrentPreset =
            !!currentPresetName && currentPresetName === pn;
          html += `<div class="cfm-wi-bind-entry ${isCurrentPreset ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="preset" data-bind-id="${escapeHtml(pn)}"><span class="cfm-wi-bind-entry-name">${escapeHtml(pn)}</span><i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i></div>`;
        }
      }
      if (!html) html = '<div class="cfm-wi-bind-empty">无绑定</div>';
      dropdown.html(html);
      dropdown.slideDown(150);
      icon.removeClass("fa-caret-down").addClass("fa-caret-up");

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
        if (bindType === "char") unbindRegexPresetFromChar(idx, bindId);
        else if (bindType === "chat") unbindRegexPresetFromChat(idx, bindId);
        else unbindRegexPresetFromPreset(idx, bindId);

        const applied =
          extension_settings[extensionName]._regexAppliedPresetIndices || [];
        if (applied.includes(idx)) {
          const { indices: stillAutoIndices } =
            getRegexAutoApplyPresetIndices();
          if (!stillAutoIndices.includes(idx)) {
            const removedCount = await unapplyRegexPresetIndex(idx);
            cfmToastr.info(
              `已取消绑定，分组「${preset.name}」不再匹配当前条件，已自动取消应用（禁用 ${removedCount} 个正则脚本）`,
            );
          } else {
            cfmToastr.success(
              "已取消绑定（分组仍因其他绑定条件匹配而保持应用）",
            );
          }
        } else {
          cfmToastr.success("已取消绑定");
        }
        const updated = getRegexActivePresets()[idx];
        const stillHasBindings =
          updated &&
          ((updated.bindChars && updated.bindChars.length > 0) ||
            (updated.bindPresets && updated.bindPresets.length > 0) ||
            (updated.bindChats && updated.bindChats.length > 0));
        if (!stillHasBindings) {
          if (updated) setRegexPresetScope(idx, "global");
          overlay.remove();
          showRegexPresetPanel();
        } else {
          entry.remove();
          item
            .find(".cfm-wi-preset-scope-tag")
            .text("已绑定")
            .attr(
              "style",
              "color:#cba6f7;border-color:#cba6f740;background:#cba6f715;",
            );
          if (dropdown.find(".cfm-wi-bind-entry").length === 0) {
            dropdown.slideUp(150);
            icon.removeClass("fa-caret-up").addClass("fa-caret-down");
          }
        }
      });
    });

    overlay.find(".cfm-wi-preset-edit").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getRegexActivePresets();
      const preset = currentPresets[idx];
      if (!preset) return;
      overlay.remove();
      showRegexPresetEditPopup(preset);
    });

    overlay.find(".cfm-wi-preset-del").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getRegexActivePresets();
      const preset = currentPresets[idx];
      if (!preset) return;
      if (!cfmConfirm(`确定删除激活分组「${preset.name}」？`)) return;
      const applied =
        extension_settings[extensionName]._regexAppliedPresetIndices || [];
      if (applied.includes(idx)) {
        extension_settings[extensionName]._regexAppliedPresetIndices =
          applied.filter((i) => i !== idx);
      }
      deleteRegexActivePreset(preset.name);
      cfmToastr.success(`已删除激活分组「${preset.name}」`);
      overlay.remove();
      showRegexPresetPanel();
    });
  }

  return { showRegexPresetPanel, showRegexPresetEditPopup };
}
