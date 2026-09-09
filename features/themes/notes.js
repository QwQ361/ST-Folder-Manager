// 主题备注层：承接 themes 资源域的备注读取、保存、批量编辑、导入导出恢复与主题重命名后的备注键迁移。

export function getThemeNoteCore(name, deps) {
  return deps.settings[deps.extensionName].themeNotes?.[name] || "";
}

export function setThemeNoteCore(name, note, deps) {
  if (!deps.settings[deps.extensionName].themeNotes) {
    deps.settings[deps.extensionName].themeNotes = {};
  }
  if (note) {
    deps.settings[deps.extensionName].themeNotes[name] = note;
  } else {
    delete deps.settings[deps.extensionName].themeNotes[name];
  }
  deps.saveSettingsDebounced();
}

export function createThemeNoteModeApi(deps) {
  const {
    $,
    cfmConfirm,
    cfmToastr,
    clearAllExclusiveModes,
    collectCurrentSelection,
    escapeHtml,
    getThemeNote,
    getVisibleResourceIds,
    renderThemesView,
    setThemeNote,
  } = deps;
  const state = deps.state;

  function enterThemeNoteMode() {
    const prev = collectCurrentSelection();
    clearAllExclusiveModes();
    state.cfmThemeNoteMode = true;
    state.cfmThemeNoteSelected = prev || new Set();
    state.cfmThemeNoteRangeMode = false;
    state.cfmThemeNoteLastClicked = null;
    $("#cfm-theme-note-btn").addClass("cfm-edit-active");
    $("#cfm-theme-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-theme-note-btn").attr("title", "确认编辑备注");
    $(".cfm-popup").addClass("cfm-theme-note-mode");
    renderThemesView();
  }

  function exitThemeNoteMode() {
    state.cfmThemeNoteMode = false;
    state.cfmThemeNoteSelected.clear();
    state.cfmThemeNoteRangeMode = false;
    state.cfmThemeNoteLastClicked = null;
    $("#cfm-theme-note-btn").removeClass("cfm-edit-active");
    $("#cfm-theme-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-theme-note-btn").attr("title", "编辑备注");
    $(".cfm-popup").removeClass("cfm-theme-note-mode");
    renderThemesView();
  }

  function toggleThemeNoteItem(id, shiftKey) {
    if ((shiftKey || state.cfmThemeNoteRangeMode) && state.cfmThemeNoteLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(state.cfmThemeNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) state.cfmThemeNoteSelected.add(visible[i]);
      }
    } else {
      if (state.cfmThemeNoteSelected.has(id)) state.cfmThemeNoteSelected.delete(id);
      else state.cfmThemeNoteSelected.add(id);
    }
    state.cfmThemeNoteLastClicked = id;
  }

  function prependThemeNoteToolbar(listContainer, renderFn) {
    if (!state.cfmThemeNoteMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => state.cfmThemeNoteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmThemeNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmThemeNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${state.cfmThemeNoteSelected.size > 0 ? `已选 ${state.cfmThemeNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => state.cfmThemeNoteSelected.delete(id));
      } else {
        visible.forEach((id) => state.cfmThemeNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.cfmThemeNoteRangeMode = !state.cfmThemeNoteRangeMode;
      if (state.cfmThemeNoteRangeMode) state.cfmThemeNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitThemeNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showThemeNotePopup(themeNames) {
    if (!themeNames || themeNames.length === 0) return;
    const isBatch = themeNames.length > 1;
    let defaultNote = "";
    if (!isBatch) {
      defaultNote = getThemeNote(themeNames[0]);
    }
    const nameListHtml =
      themeNames.length <= 5
        ? themeNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : themeNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${themeNames.length} 个主题</div>`;

    const individualListHtml = isBatch
      ? themeNames
          .map((n) => {
            const currentNote = getThemeNote(n);
            return `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${escapeHtml(n)}">${escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(n)}" value="${escapeHtml(currentNote)}"></div>`;
          })
          .join("")
      : "";

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑主题备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          ${
            isBatch
              ? `<div class="cfm-edit-popup-field">
            <label>操作类型</label>
            <select class="cfm-edit-input" id="cfm-theme-note-action">
              <option value="uniform">统一备注</option>
              <option value="individual">逐个备注</option>
            </select>
          </div>`
              : ""
          }
          <div class="cfm-edit-popup-field" id="cfm-theme-note-uniform-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-theme-note-input" value="${escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          ${
            isBatch
              ? `<div class="cfm-rename-individual-field" id="cfm-theme-note-individual-field">
            <label>逐个指定备注（留空则不修改）</label>
            <div class="cfm-rename-individual-list">${individualListHtml}</div>
          </div>`
              : ""
          }
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${!isBatch ? (defaultNote ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : "") : '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>'}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);

    if (isBatch) {
      function updateNoteUI() {
        const action = overlay.find("#cfm-theme-note-action").val();
        const uniformField = overlay.find("#cfm-theme-note-uniform-field");
        const individualField = overlay.find(
          "#cfm-theme-note-individual-field",
        );
        const namesBlock = overlay.find(".cfm-edit-popup-names");
        const clearBtn = overlay.find(".cfm-edit-popup-clear");
        if (action === "individual") {
          uniformField.hide();
          namesBlock.hide();
          individualField.show();
          clearBtn.hide();
          individualField.find(".cfm-rename-new-input").first().focus();
        } else {
          individualField.hide();
          uniformField.show();
          namesBlock.show();
          clearBtn.show();
          overlay.find("#cfm-theme-note-input").focus();
        }
      }
      updateNoteUI();
      overlay.find("#cfm-theme-note-action").on("change", updateNoteUI);
    } else {
      overlay.find("#cfm-theme-note-input").focus();
    }

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
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        if (!cfmConfirm("确认清除备注吗？")) return;
        overlay.remove();
        resolve({ note: "", clear: true });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        if (
          isBatch &&
          overlay.find("#cfm-theme-note-action").val() === "individual"
        ) {
          const noteMap = {};
          overlay.find(".cfm-rename-individual-row").each(function () {
            const name = $(this).find(".cfm-rename-new-input").data("old-name");
            const note = $(this).find(".cfm-rename-new-input").val().trim();
            noteMap[name] = note;
          });
          overlay.remove();
          resolve({ mode: "individual", noteMap });
        } else {
          const note = overlay.find("#cfm-theme-note-input").val().trim();
          overlay.remove();
          resolve({ note, clear: false });
        }
      });
      overlay.find("#cfm-theme-note-input").on("keydown", (e) => {
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

  async function executeThemeNoteEdit(names) {
    const result = await showThemeNotePopup(names);
    if (!result) return;

    if (result.mode === "individual") {
      const { noteMap } = result;
      let updated = 0;
      let skipped = 0;
      for (const name of names) {
        const note = noteMap[name];
        if (note !== undefined && note !== "") {
          setThemeNote(name, note);
          updated++;
        } else {
          skipped++;
        }
      }
      let msg = `已更新 ${updated} 个主题的备注`;
      if (skipped > 0) msg += `，${skipped} 个留空未修改`;
      if (updated > 0) cfmToastr.success(msg);
      else cfmToastr.info(msg);
      renderThemesView();
      return;
    }

    const { note, clear } = result;
    const isBatch = names.length > 1;
    if (isBatch && !note && !clear) {
      cfmToastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const name of names) {
      if (clear) {
        setThemeNote(name, "");
        count++;
      } else if (note) {
        setThemeNote(name, note);
        count++;
      } else if (!isBatch) {
        // 单个模式下空字符串 = 清除
        setThemeNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      cfmToastr.success(`已更新 ${count} 个主题的备注`);
      renderThemesView();
    }
  }


  return {
    enterThemeNoteMode,
    exitThemeNoteMode,
    toggleThemeNoteItem,
    prependThemeNoteToolbar,
    showThemeNotePopup,
    executeThemeNoteEdit,
  };
}
