// 世界书重命名层：承接世界书单项与批量重命名执行、角色主绑定与辅助世界书引用修复、分组/收藏/备注同步，以及重命名后的世界书视图刷新。

export function createWorldInfoRenameApiCore(deps) {
  const getState = () => deps.state;

  function enterWorldInfoRenameMode() {
    const prev = deps.collectCurrentSelection();
    deps.clearAllExclusiveModes();
    const state = getState();
    state.cfmWorldInfoRenameMode = true;
    state.cfmWorldInfoRenameSelected = prev || new Set();
    state.cfmWorldInfoRenameRangeMode = false;
    state.cfmWorldInfoRenameLastClicked = null;
    deps.$("#cfm-worldinfo-rename-btn").addClass("cfm-edit-active");
    deps.$("#cfm-worldinfo-rename-btn")
      .find("i")
      .removeClass("fa-i-cursor")
      .addClass("fa-check");
    deps.$("#cfm-worldinfo-rename-btn").attr("title", "确认重命名");
    deps.$(".cfm-popup").addClass("cfm-worldinfo-rename-mode");
    deps.renderWorldInfoView();
  }

  function exitWorldInfoRenameMode() {
    const state = getState();
    state.cfmWorldInfoRenameMode = false;
    state.cfmWorldInfoRenameSelected.clear();
    state.cfmWorldInfoRenameRangeMode = false;
    state.cfmWorldInfoRenameLastClicked = null;
    deps.$("#cfm-worldinfo-rename-btn").removeClass("cfm-edit-active");
    deps.$("#cfm-worldinfo-rename-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-i-cursor");
    deps.$("#cfm-worldinfo-rename-btn").attr("title", "重命名世界书");
    deps.$(".cfm-popup").removeClass("cfm-worldinfo-rename-mode");
    deps.renderWorldInfoView();
  }

  function toggleWorldInfoRenameItem(id, shiftKey) {
    const state = getState();
    if (
      (shiftKey || state.cfmWorldInfoRenameRangeMode) &&
      state.cfmWorldInfoRenameLastClicked
    ) {
      const visible = deps.getVisibleResourceIds();
      const lastIdx = visible.indexOf(state.cfmWorldInfoRenameLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) {
          state.cfmWorldInfoRenameSelected.add(visible[i]);
        }
      }
    } else {
      if (state.cfmWorldInfoRenameSelected.has(id)) {
        state.cfmWorldInfoRenameSelected.delete(id);
      } else {
        state.cfmWorldInfoRenameSelected.add(id);
      }
    }
    state.cfmWorldInfoRenameLastClicked = id;
  }

  function prependWorldInfoRenameToolbar(listContainer, renderFn) {
    const state = getState();
    if (!state.cfmWorldInfoRenameMode) return;
    const visible = deps.getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => state.cfmWorldInfoRenameSelected.has(id));
    const toolbar = deps.$(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmWorldInfoRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmWorldInfoRenameRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${state.cfmWorldInfoRenameSelected.size > 0 ? `已选 ${state.cfmWorldInfoRenameSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => state.cfmWorldInfoRenameSelected.delete(id));
      } else {
        visible.forEach((id) => state.cfmWorldInfoRenameSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.cfmWorldInfoRenameRangeMode = !state.cfmWorldInfoRenameRangeMode;
      if (state.cfmWorldInfoRenameRangeMode) state.cfmWorldInfoRenameLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitWorldInfoRenameMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showWorldInfoRenamePopup(names) {
    if (!names || names.length === 0) return;
    const isSingle = names.length === 1;
    const nameListHtml =
      names.length <= 5
        ? names
            .map((n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`)
            .join("")
        : names
            .slice(0, 5)
            .map((n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`)
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个世界书</div>`;

    if (isSingle) {
      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">重命名世界书</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            <div class="cfm-edit-popup-field">
              <label>新名称</label>
              <input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${deps.escapeHtml(names[0])}" placeholder="输入新名称">
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>
      `;
      const overlay = deps.$(popupHtml);
      deps.$("body").append(overlay);
      overlay.find("#cfm-rename-input").focus().select();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if (deps.$(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const newName = overlay.find("#cfm-rename-input").val().trim();
          overlay.remove();
          resolve({ mode: "single", newName });
        });
        overlay.find(".cfm-edit-input").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape") {
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
          }
        });
      });
    }

    const individualListHtml = names
      .map(
        (n) =>
          `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${deps.escapeHtml(n)}">${deps.escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${deps.escapeHtml(n)}"></div>`,
      )
      .join("");
    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">批量重命名世界书</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>操作类型</label>
            <select class="cfm-edit-input" id="cfm-rename-action">
              <option value="add-prefix">增加前缀</option>
              <option value="add-suffix">增加后缀</option>
              <option value="del-prefix">删除前缀</option>
              <option value="del-suffix">删除后缀</option>
              <option value="individual">逐个重命名</option>
            </select>
          </div>
          <div class="cfm-edit-popup-field" id="cfm-wi-rename-text-field">
            <label id="cfm-rename-text-label">前缀内容</label>
            <input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容">
          </div>
          <div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;">
            <label>自动检测到的公共前/后缀</label>
            <div id="cfm-rename-detected" class="cfm-rename-detected"></div>
          </div>
          <div class="cfm-rename-individual-field" id="cfm-wi-rename-individual-field">
            <label>逐个指定新名称（留空则不修改）</label>
            <div class="cfm-rename-individual-list">${individualListHtml}</div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = deps.$(popupHtml);
    deps.$("body").append(overlay);

    function updateRenameUI() {
      const action = overlay.find("#cfm-rename-action").val();
      const textLabel = overlay.find("#cfm-rename-text-label");
      const textInput = overlay.find("#cfm-rename-text");
      const autoDetect = overlay.find(".cfm-rename-auto-detect");
      const detected = overlay.find("#cfm-rename-detected");
      const textField = overlay.find("#cfm-wi-rename-text-field");
      const individualField = overlay.find("#cfm-wi-rename-individual-field");
      const namesBlock = overlay.find(".cfm-edit-popup-names");
      if (action === "individual") {
        textField.hide();
        autoDetect.hide();
        namesBlock.hide();
        individualField.show();
        individualField.find(".cfm-rename-new-input").first().focus();
      } else {
        individualField.hide();
        textField.show();
        namesBlock.show();
        if (action === "add-prefix") {
          textLabel.text("前缀内容");
          textInput.attr("placeholder", "输入要添加的前缀");
          autoDetect.hide();
        } else if (action === "add-suffix") {
          textLabel.text("后缀内容");
          textInput.attr("placeholder", "输入要添加的后缀");
          autoDetect.hide();
        } else if (action === "del-prefix") {
          textLabel.text("要删除的前缀");
          textInput.attr("placeholder", "输入要删除的前缀，或点击下方自动检测结果");
          const commonPrefix = deps.findCommonPrefix(names);
          if (commonPrefix) {
            detected.html(`<span class="cfm-rename-detect-item" data-value="${deps.escapeHtml(commonPrefix)}">${deps.escapeHtml(commonPrefix)}</span>`);
          } else {
            detected.html('<span class="cfm-rename-detect-none">未检测到公共前缀</span>');
          }
          autoDetect.show();
        } else if (action === "del-suffix") {
          textLabel.text("要删除的后缀");
          textInput.attr("placeholder", "输入要删除的后缀，或点击下方自动检测结果");
          const commonSuffix = deps.findCommonSuffix(names);
          if (commonSuffix) {
            detected.html(`<span class="cfm-rename-detect-item" data-value="${deps.escapeHtml(commonSuffix)}">${deps.escapeHtml(commonSuffix)}</span>`);
          } else {
            detected.html('<span class="cfm-rename-detect-none">未检测到公共后缀</span>');
          }
          autoDetect.show();
        }
      }
    }
    updateRenameUI();
    overlay.find("#cfm-rename-action").on("change", updateRenameUI);
    overlay.on("click", ".cfm-rename-detect-item", function () {
      overlay.find("#cfm-rename-text").val(deps.$(this).data("value"));
    });
    overlay.find("#cfm-rename-text").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if (deps.$(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const action = overlay.find("#cfm-rename-action").val();
        if (action === "individual") {
          const renameMap = {};
          overlay.find(".cfm-rename-individual-row").each(function () {
            const oldName = deps.$(this).find(".cfm-rename-new-input").data("old-name");
            const newName = deps.$(this).find(".cfm-rename-new-input").val().trim();
            if (newName) renameMap[oldName] = newName;
          });
          overlay.remove();
          resolve({ mode: "individual", renameMap });
        } else {
          const text = overlay.find("#cfm-rename-text").val().trim();
          overlay.remove();
          resolve({ mode: "batch", action, text });
        }
      });
      overlay.find("#cfm-rename-text").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  async function updateCharWorldBindings(oldName, newName) {
    const ctx = deps.getContext();
    const characters = ctx.characters;
    const headers = ctx.getRequestHeaders();
    let updatedPrimary = 0;
    let updatedAux = 0;

    for (const char of characters) {
      if (char?.data?.extensions?.world === oldName) {
        try {
          const resp = await deps.fetch("/api/characters/merge-attributes", {
            method: "POST",
            headers,
            body: JSON.stringify({
              avatar: char.avatar,
              data: { extensions: { world: newName } },
            }),
          });
          if (resp.ok) {
            char.data.extensions.world = newName;
            updatedPrimary++;
          }
        } catch (e) {
          deps.console.warn(`[CFM] 更新角色 ${char.avatar} 的主绑定世界书失败`, e);
        }
      }
    }

    try {
      const wiModule = await deps.ensureWiModule();
      const worldInfoObj = wiModule.world_info;
      if (worldInfoObj?.charLore && Array.isArray(worldInfoObj.charLore)) {
        let changed = false;
        for (const entry of worldInfoObj.charLore) {
          if (entry.extraBooks && Array.isArray(entry.extraBooks)) {
            const idx = entry.extraBooks.indexOf(oldName);
            if (idx !== -1) {
              entry.extraBooks[idx] = newName;
              changed = true;
              updatedAux++;
            }
          }
        }
        if (changed) {
          deps.saveSettingsDebounced();
        }
      }
    } catch (e) {
      deps.console.warn("[CFM] 更新辅助世界书绑定失败", e);
    }

    if (updatedPrimary > 0 || updatedAux > 0) {
      deps.console.log(
        `[CFM] 世界书「${oldName}」→「${newName}」：更新了 ${updatedPrimary} 个主绑定、${updatedAux} 个辅助绑定`,
      );
    }
  }

  async function renameWorldInfoBook(oldName, newName, headers) {
    const resp = await deps.fetch("/api/worldinfo/get", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: oldName }),
    });
    if (!resp.ok) throw new Error("获取世界书数据失败");
    const wiData = await resp.json();
    const saveResp = await deps.fetch("/api/worldinfo/edit", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: newName, data: wiData }),
    });
    if (!saveResp.ok) throw new Error("保存世界书失败");
    await deps.fetch("/api/worldinfo/delete", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: oldName }),
    });
    await deps.syncWorldInfoOptionInDOM(oldName, newName);
    deps.updateSettingsAfterRename("worldinfo", oldName, newName);
    await updateCharWorldBindings(oldName, newName);
  }

  async function executeWorldInfoRename(names) {
    const result = await showWorldInfoRenamePopup(names);
    if (!result) return;

    const headers = deps.getContext().getRequestHeaders();

    if (result.mode === "single") {
      const oldName = names[0];
      const newName = result.newName;
      if (!newName) {
        deps.cfmToastr.warning("请输入新名称");
        return;
      }
      if (newName === oldName) {
        deps.cfmToastr.info("名称未变更");
        return;
      }
      try {
        await renameWorldInfoBook(oldName, newName, headers);
        deps.cfmToastr.success(`已将「${oldName}」重命名为「${newName}」`);
      } catch (e) {
        deps.console.error("[CFM] 世界书重命名失败", e);
        deps.cfmToastr.error(`重命名失败: ${e.message}`);
        return;
      }
    } else if (result.mode === "batch") {
      const { action, text } = result;
      if (!text) {
        deps.cfmToastr.warning("请输入内容");
        return;
      }
      let success = 0;
      let skipped = 0;
      let failed = 0;
      const batchProgress = deps.showBatchProgressOverlay("正在批量重命名世界书", names.length);
      let processed = 0;

      for (const oldName of names) {
        let newName;
        if (action === "add-prefix") {
          newName = text + oldName;
        } else if (action === "add-suffix") {
          newName = oldName + text;
        } else if (action === "del-prefix") {
          if (!oldName.startsWith(text)) {
            skipped++;
            processed++;
            batchProgress.update(processed);
            continue;
          }
          newName = oldName.substring(text.length);
        } else if (action === "del-suffix") {
          if (!oldName.endsWith(text)) {
            skipped++;
            processed++;
            batchProgress.update(processed);
            continue;
          }
          newName = oldName.substring(0, oldName.length - text.length);
        }
        if (!newName || newName === oldName) {
          skipped++;
          processed++;
          batchProgress.update(processed);
          continue;
        }
        try {
          await renameWorldInfoBook(oldName, newName, headers);
          success++;
        } catch (e) {
          deps.console.warn(`[CFM] 重命名世界书 ${oldName} 失败`, e);
          failed++;
        }
        processed++;
        batchProgress.update(processed);
      }
      let msg = `已重命名 ${success} 个世界书`;
      if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
      if (failed > 0) msg += `，${failed} 个失败`;
      batchProgress.done(msg);
      if (success > 0) deps.cfmToastr.success(msg);
      else deps.cfmToastr.warning(msg);
    } else if (result.mode === "individual") {
      const renameMap = result.renameMap;
      const entries = Object.entries(renameMap);
      if (entries.length === 0) {
        deps.cfmToastr.info("所有条目均留空，未执行任何重命名");
        return;
      }
      let success = 0;
      let skipped = names.length - entries.length;
      let failed = 0;
      const batchProgress = deps.showBatchProgressOverlay("正在逐个重命名世界书", entries.length);
      let processed = 0;

      for (const [oldName, newName] of entries) {
        if (!newName || newName === oldName) {
          skipped++;
          processed++;
          batchProgress.update(processed);
          continue;
        }
        try {
          await renameWorldInfoBook(oldName, newName, headers);
          success++;
        } catch (e) {
          deps.console.warn(`[CFM] 逐个重命名世界书 ${oldName} 失败`, e);
          failed++;
        }
        processed++;
        batchProgress.update(processed);
      }
      let msg = `已重命名 ${success} 个世界书`;
      if (skipped > 0) msg += `，${skipped} 个留空未修改`;
      if (failed > 0) msg += `，${failed} 个失败`;
      batchProgress.done(msg);
      if (success > 0) deps.cfmToastr.success(msg);
      else deps.cfmToastr.info(msg);
    }

    deps.renderWorldInfoView();
  }

  return {
    enterWorldInfoRenameMode,
    exitWorldInfoRenameMode,
    toggleWorldInfoRenameItem,
    prependWorldInfoRenameToolbar,
    showWorldInfoRenamePopup,
    updateCharWorldBindings,
    executeWorldInfoRename,
  };
}
