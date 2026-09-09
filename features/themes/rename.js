// 主题重命名层：承接主题资源重命名执行，以及重命名后对分组、收藏、备注和 themeBackgroundBindings 中主题键的同步修复。

export function createThemeRenameModeApi(deps) {
  const {
    $,
    cfmToastr,
    clearAllExclusiveModes,
    collectCurrentSelection,
    console,
    escapeHtml,
    fetch,
    getNativeThemesArray,
    getRequestHeaders,
    getThemeNames,
    getVisibleResourceIds,
    renderThemesView,
    showBatchProgressOverlay,
    structuredClone,
    updateSettingsAfterRename,
  } = deps;
  const state = deps.state;
  const themes = getNativeThemesArray();


  function enterThemeRenameMode() {
    const prev = collectCurrentSelection();
    clearAllExclusiveModes();
    state.cfmThemeRenameMode = true;
    state.cfmThemeRenameSelected = prev || new Set();
    state.cfmThemeRenameRangeMode = false;
    state.cfmThemeRenameLastClicked = null;
    $("#cfm-theme-rename-btn").addClass("cfm-edit-active");
    $("#cfm-theme-rename-btn")
      .find("i")
      .removeClass("fa-i-cursor")
      .addClass("fa-check");
    $("#cfm-theme-rename-btn").attr("title", "确认重命名");
    $(".cfm-popup").addClass("cfm-theme-rename-mode");
    renderThemesView();
  }

  function exitThemeRenameMode() {
    state.cfmThemeRenameMode = false;
    state.cfmThemeRenameSelected.clear();
    state.cfmThemeRenameRangeMode = false;
    state.cfmThemeRenameLastClicked = null;
    $("#cfm-theme-rename-btn").removeClass("cfm-edit-active");
    $("#cfm-theme-rename-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-i-cursor");
    $("#cfm-theme-rename-btn").attr("title", "重命名主题");
    $(".cfm-popup").removeClass("cfm-theme-rename-mode");
    renderThemesView();
  }

  function toggleThemeRenameItem(id, shiftKey) {
    if ((shiftKey || state.cfmThemeRenameRangeMode) && state.cfmThemeRenameLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(state.cfmThemeRenameLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          state.cfmThemeRenameSelected.add(visible[i]);
      }
    } else {
      if (state.cfmThemeRenameSelected.has(id)) state.cfmThemeRenameSelected.delete(id);
      else state.cfmThemeRenameSelected.add(id);
    }
    state.cfmThemeRenameLastClicked = id;
  }

  function prependThemeRenameToolbar(listContainer, renderFn) {
    if (!state.cfmThemeRenameMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => state.cfmThemeRenameSelected.has(id));
    const toolbar = $(
      `<div class="cfm-edit-toolbar"><button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmThemeRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmThemeRenameRangeMode ? "(开)" : ""}</button><span class="cfm-edit-count">${state.cfmThemeRenameSelected.size > 0 ? `已选 ${state.cfmThemeRenameSelected.size} 项` : ""}</span><button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button></div>`,
    );
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) visible.forEach((id) => state.cfmThemeRenameSelected.delete(id));
      else visible.forEach((id) => state.cfmThemeRenameSelected.add(id));
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.cfmThemeRenameRangeMode = !state.cfmThemeRenameRangeMode;
      if (state.cfmThemeRenameRangeMode) state.cfmThemeRenameLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitThemeRenameMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showThemeRenamePopup(names) {
    if (!names || names.length === 0) return;
    const isSingle = names.length === 1;
    const nameListHtml =
      names.length <= 5
        ? names
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : names
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个主题</div>`;
    if (isSingle) {
      const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">重命名主题</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>新名称</label><input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${escapeHtml(names[0])}" placeholder="输入新名称"></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      overlay.find("#cfm-rename-input").focus().select();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
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
          if (e.key === "Escape")
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
        });
      });
    } else {
      const individualListHtml = names
        .map(
          (n) =>
            `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${escapeHtml(n)}">${escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(n)}"></div>`,
        )
        .join("");
      const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">批量重命名主题</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>操作类型</label><select class="cfm-edit-input" id="cfm-rename-action"><option value="add-prefix">增加前缀</option><option value="add-suffix">增加后缀</option><option value="del-prefix">删除前缀</option><option value="del-suffix">删除后缀</option><option value="individual">逐个重命名</option></select></div><div class="cfm-edit-popup-field" id="cfm-rename-text-field"><label id="cfm-rename-text-label">前缀内容</label><input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容"></div><div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;"><label>自动检测到的公共前/后缀</label><div id="cfm-rename-detected" class="cfm-rename-detected"></div></div><div class="cfm-rename-individual-field" id="cfm-rename-individual-field"><label>逐个指定新名称（留空则不修改）</label><div class="cfm-rename-individual-list">${individualListHtml}</div></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      function updateRenameUI() {
        const action = overlay.find("#cfm-rename-action").val();
        const textLabel = overlay.find("#cfm-rename-text-label");
        const textInput = overlay.find("#cfm-rename-text");
        const autoDetect = overlay.find(".cfm-rename-auto-detect");
        const detected = overlay.find("#cfm-rename-detected");
        const textField = overlay.find("#cfm-rename-text-field");
        const individualField = overlay.find("#cfm-rename-individual-field");
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
            textInput.attr(
              "placeholder",
              "输入要删除的前缀，或点击下方自动检测结果",
            );
            const cp = findCommonPrefix(names);
            detected.html(
              cp
                ? `<span class="cfm-rename-detect-item" data-value="${escapeHtml(cp)}">${escapeHtml(cp)}</span>`
                : '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
            );
            autoDetect.show();
          } else if (action === "del-suffix") {
            textLabel.text("要删除的后缀");
            textInput.attr(
              "placeholder",
              "输入要删除的后缀，或点击下方自动检测结果",
            );
            const cs = findCommonSuffix(names);
            detected.html(
              cs
                ? `<span class="cfm-rename-detect-item" data-value="${escapeHtml(cs)}">${escapeHtml(cs)}</span>`
                : '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
            );
            autoDetect.show();
          }
        }
      }
      updateRenameUI();
      overlay.find("#cfm-rename-action").on("change", updateRenameUI);
      overlay.on("click", ".cfm-rename-detect-item", function () {
        overlay.find("#cfm-rename-text").val($(this).data("value"));
      });
      overlay.find("#cfm-rename-text").focus();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const action = overlay.find("#cfm-rename-action").val();
          if (action === "individual") {
            const renameMap = {};
            overlay.find(".cfm-rename-individual-row").each(function () {
              const oldName = $(this)
                .find(".cfm-rename-new-input")
                .data("old-name");
              const newName = $(this)
                .find(".cfm-rename-new-input")
                .val()
                .trim();
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
          if (e.key === "Escape")
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
        });
      });
    }
  }

  async function executeThemeRename(names) {
    const result = await showThemeRenamePopup(names);
    if (!result) return;
    const headers = getRequestHeaders();
    let allThemes = [];
    try {
      const resp = await fetch("/api/settings/get", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const data = await resp.json();
        allThemes = data.themes || [];
      }
    } catch (e) {
      console.warn("[CFM] 获取主题数据失败", e);
    }
    function getThemeData(name) {
      const t = allThemes.find(
        (th) => (typeof th === "object" ? th.name : th) === name,
      );
      return t && typeof t === "object" ? structuredClone(t) : null;
    }
    if (result.mode === "single") {
      const oldName = names[0],
        newName = result.newName;
      if (!newName) {
        cfmToastr.warning("请输入新名称");
        return;
      }
      if (newName === oldName) {
        cfmToastr.info("名称未变更");
        return;
      }
      if (new Set(getThemeNames()).has(newName)) {
        cfmToastr.error(`已存在名为「${newName}」的主题`);
        return;
      }
      try {
        const themeData = getThemeData(oldName);
        if (!themeData) {
          cfmToastr.error(`找不到主题「${oldName}」的数据`);
          return;
        }
        themeData.name = newName;
        await fetch("/api/themes/save", {
          method: "POST",
          headers,
          body: JSON.stringify(themeData),
        });
        await fetch("/api/themes/delete", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: oldName }),
        });
        $("#themes option")
          .filter(function () {
            return $(this).val() === oldName;
          })
          .val(newName)
          .text(newName);
        if (typeof themes !== "undefined" && Array.isArray(themes)) {
          const idx = themes.findIndex(
            (t) => (typeof t === "object" ? t.name : t) === oldName,
          );
          if (idx !== -1 && typeof themes[idx] === "object")
            themes[idx].name = newName;
        }
        updateSettingsAfterRename("themes", oldName, newName);
        cfmToastr.success(`已将「${oldName}」重命名为「${newName}」`);
      } catch (e) {
        console.error("[CFM] 主题重命名失败", e);
        cfmToastr.error(`重命名失败: ${e.message}`);
        return;
      }
    } else if (result.mode === "batch") {
      const { action, text } = result;
      if (!text) {
        cfmToastr.warning("请输入内容");
        return;
      }
      const existingThemes = new Set(getThemeNames());
      let success = 0,
        skipped = 0,
        failed = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在批量重命名主题",
        names.length,
      );
      let processed = 0;
      for (const oldName of names) {
        let newName;
        if (action === "add-prefix") newName = text + oldName;
        else if (action === "add-suffix") newName = oldName + text;
        else if (action === "del-prefix") {
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
        if (existingThemes.has(newName)) {
          skipped++;
          processed++;
          batchProgress.update(processed);
          continue;
        }
        try {
          const themeData = getThemeData(oldName);
          if (!themeData) {
            failed++;
            processed++;
            batchProgress.update(processed);
            continue;
          }
          themeData.name = newName;
          await fetch("/api/themes/save", {
            method: "POST",
            headers,
            body: JSON.stringify(themeData),
          });
          await fetch("/api/themes/delete", {
            method: "POST",
            headers,
            body: JSON.stringify({ name: oldName }),
          });
          $("#themes option")
            .filter(function () {
              return $(this).val() === oldName;
            })
            .val(newName)
            .text(newName);
          if (typeof themes !== "undefined" && Array.isArray(themes)) {
            const idx = themes.findIndex(
              (t) => (typeof t === "object" ? t.name : t) === oldName,
            );
            if (idx !== -1 && typeof themes[idx] === "object")
              themes[idx].name = newName;
          }
          updateSettingsAfterRename("themes", oldName, newName);
          existingThemes.delete(oldName);
          existingThemes.add(newName);
          success++;
        } catch (e) {
          console.warn(`[CFM] 重命名主题 ${oldName} 失败`, e);
          failed++;
        }
        processed++;
        batchProgress.update(processed);
      }
      let msg = `已重命名 ${success} 个主题`;
      if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
      if (failed > 0) msg += `，${failed} 个失败`;
      batchProgress.done(msg);
      if (success > 0) cfmToastr.success(msg);
      else cfmToastr.warning(msg);
    } else if (result.mode === "individual") {
      const { renameMap } = result;
      const entries = Object.entries(renameMap);
      if (entries.length === 0) {
        cfmToastr.info("所有名称均留空，未执行任何重命名");
        renderThemesView();
        return;
      }
      const existingThemes = new Set(getThemeNames());
      let success = 0,
        skipped = 0,
        failed = 0;
      const skippedNames = [];
      const batchProgress = showBatchProgressOverlay(
        "正在逐个重命名主题",
        entries.length,
      );
      let processed = 0;
      for (const [oldName, newName] of entries) {
        if (newName === oldName) {
          skipped++;
          skippedNames.push(oldName);
          processed++;
          batchProgress.update(processed);
          continue;
        }
        if (existingThemes.has(newName)) {
          skipped++;
          skippedNames.push(`${oldName}(名称冲突)`);
          processed++;
          batchProgress.update(processed);
          continue;
        }
        try {
          const themeData = getThemeData(oldName);
          if (!themeData) {
            failed++;
            processed++;
            batchProgress.update(processed);
            continue;
          }
          themeData.name = newName;
          await fetch("/api/themes/save", {
            method: "POST",
            headers,
            body: JSON.stringify(themeData),
          });
          await fetch("/api/themes/delete", {
            method: "POST",
            headers,
            body: JSON.stringify({ name: oldName }),
          });
          $("#themes option")
            .filter(function () {
              return $(this).val() === oldName;
            })
            .val(newName)
            .text(newName);
          if (typeof themes !== "undefined" && Array.isArray(themes)) {
            const idx = themes.findIndex(
              (t) => (typeof t === "object" ? t.name : t) === oldName,
            );
            if (idx !== -1 && typeof themes[idx] === "object")
              themes[idx].name = newName;
          }
          updateSettingsAfterRename("themes", oldName, newName);
          existingThemes.delete(oldName);
          existingThemes.add(newName);
          success++;
        } catch (e) {
          console.warn(`[CFM] 重命名主题 ${oldName} 失败`, e);
          failed++;
        }
        processed++;
        batchProgress.update(processed);
      }
      let msg = `已重命名 ${success} 个主题`;
      const totalSkipped = names.length - entries.length + skipped;
      if (totalSkipped > 0) msg += `，${totalSkipped} 个未修改（留空或跳过）`;
      if (failed > 0) msg += `，${failed} 个失败`;
      batchProgress.done(msg);
      if (success > 0) cfmToastr.success(msg);
      else cfmToastr.info(msg);
    }
    renderThemesView();
  }



  return {
    enterThemeRenameMode,
    exitThemeRenameMode,
    toggleThemeRenameItem,
    prependThemeRenameToolbar,
    showThemeRenamePopup,
    executeThemeRename,
  };
}
