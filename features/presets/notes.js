// 预设备注层：承接 presets 资源域的备注读取、保存、批量编辑、导入导出恢复与重命名后的备注键迁移；通用备注交互由 features/notes/notes.js 提供。

export function createPresetNotesApiCore(deps) {
  const getState = () => deps.state;

  function getPresetNote(name) {
    return deps.extensionSettings[deps.extensionName].presetNotes?.[name] || "";
  }

  function setPresetNote(name, note) {
    const settings = deps.extensionSettings[deps.extensionName];
    if (!settings.presetNotes) settings.presetNotes = {};
    if (note) {
      settings.presetNotes[name] = note;
    } else {
      delete settings.presetNotes[name];
    }
    deps.saveSettingsDebounced();
  }

  function enterPresetNoteMode() {
    const prev = deps.collectCurrentSelection();
    deps.clearAllExclusiveModes();
    const state = getState();
    state.cfmPresetNoteMode = true;
    state.cfmPresetNoteSelected = prev || new Set();
    state.cfmPresetNoteRangeMode = false;
    state.cfmPresetNoteLastClicked = null;
    deps.$("#cfm-preset-note-btn").addClass("cfm-edit-active");
    deps.$("#cfm-preset-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    deps.$("#cfm-preset-note-btn").attr("title", "确认编辑备注");
    deps.$(".cfm-popup").addClass("cfm-preset-note-mode");
    deps.renderPresetsView();
  }

  function exitPresetNoteMode() {
    const state = getState();
    state.cfmPresetNoteMode = false;
    state.cfmPresetNoteSelected.clear();
    state.cfmPresetNoteRangeMode = false;
    state.cfmPresetNoteLastClicked = null;
    deps.$("#cfm-preset-note-btn").removeClass("cfm-edit-active");
    deps.$("#cfm-preset-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    deps.$("#cfm-preset-note-btn").attr("title", "编辑备注");
    deps.$(".cfm-popup").removeClass("cfm-preset-note-mode");
    deps.renderPresetsView();
  }

  function togglePresetNoteItem(id, shiftKey) {
    const state = getState();
    if (
      (shiftKey || state.cfmPresetNoteRangeMode) &&
      state.cfmPresetNoteLastClicked
    ) {
      const visible = deps.getVisibleResourceIds();
      const lastIdx = visible.indexOf(state.cfmPresetNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) {
          state.cfmPresetNoteSelected.add(visible[i]);
        }
      }
    } else {
      if (state.cfmPresetNoteSelected.has(id)) {
        state.cfmPresetNoteSelected.delete(id);
      } else {
        state.cfmPresetNoteSelected.add(id);
      }
    }
    state.cfmPresetNoteLastClicked = id;
  }

  function prependPresetNoteToolbar(listContainer, renderFn) {
    const state = getState();
    if (!state.cfmPresetNoteMode) return;
    const visible = deps.getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => state.cfmPresetNoteSelected.has(id));
    const toolbar = deps.$(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmPresetNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmPresetNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${state.cfmPresetNoteSelected.size > 0 ? `已选 ${state.cfmPresetNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => state.cfmPresetNoteSelected.delete(id));
      } else {
        visible.forEach((id) => state.cfmPresetNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.cfmPresetNoteRangeMode = !state.cfmPresetNoteRangeMode;
      if (state.cfmPresetNoteRangeMode) state.cfmPresetNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitPresetNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showPresetNotePopup(presetNames) {
    if (!presetNames || presetNames.length === 0) return;
    const isBatch = presetNames.length > 1;
    let defaultNote = "";
    if (!isBatch) {
      defaultNote = getPresetNote(presetNames[0]);
    }
    const nameListHtml =
      presetNames.length <= 5
        ? presetNames
            .map((n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`)
            .join("")
        : presetNames
            .slice(0, 5)
            .map((n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`)
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${presetNames.length} 个预设</div>`;

    const individualListHtml = isBatch
      ? presetNames
          .map((n) => {
            const currentNote = getPresetNote(n);
            return `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${deps.escapeHtml(n)}">${deps.escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${deps.escapeHtml(n)}" value="${deps.escapeHtml(currentNote)}"></div>`;
          })
          .join("")
      : "";

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑预设备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          ${
            isBatch
              ? `<div class="cfm-edit-popup-field">
            <label>操作类型</label>
            <select class="cfm-edit-input" id="cfm-preset-note-action">
              <option value="uniform">统一备注</option>
              <option value="individual">逐个备注</option>
            </select>
          </div>`
              : ""
          }
          <div class="cfm-edit-popup-field" id="cfm-preset-note-uniform-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-preset-note-input" value="${deps.escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          ${
            isBatch
              ? `<div class="cfm-rename-individual-field" id="cfm-preset-note-individual-field">
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
    const overlay = deps.$(popupHtml);
    deps.$("body").append(overlay);

    if (isBatch) {
      function updatePresetNoteUI() {
        const action = overlay.find("#cfm-preset-note-action").val();
        const uniformField = overlay.find("#cfm-preset-note-uniform-field");
        const individualField = overlay.find("#cfm-preset-note-individual-field");
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
          overlay.find("#cfm-preset-note-input").focus();
        }
      }
      updatePresetNoteUI();
      overlay.find("#cfm-preset-note-action").on("change", updatePresetNoteUI);
    } else {
      overlay.find("#cfm-preset-note-input").focus();
    }

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
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        if (!deps.cfmConfirm("确认清除备注吗？")) return;
        overlay.remove();
        resolve({ note: "", clear: true });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        if (
          isBatch &&
          overlay.find("#cfm-preset-note-action").val() === "individual"
        ) {
          const noteMap = {};
          overlay.find(".cfm-rename-individual-row").each(function () {
            const name = deps.$(this).find(".cfm-rename-new-input").data("old-name");
            const note = deps.$(this).find(".cfm-rename-new-input").val().trim();
            noteMap[name] = note;
          });
          overlay.remove();
          resolve({ mode: "individual", noteMap });
        } else {
          const note = overlay.find("#cfm-preset-note-input").val().trim();
          overlay.remove();
          resolve({ note, clear: false });
        }
      });
      overlay.find("#cfm-preset-note-input").on("keydown", (e) => {
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

  async function executePresetNoteEdit(names) {
    const result = await showPresetNotePopup(names);
    if (!result) return;

    if (result.mode === "individual") {
      const { noteMap } = result;
      let updated = 0;
      let skipped = 0;
      for (const name of names) {
        const note = noteMap[name];
        if (note !== undefined && note !== "") {
          setPresetNote(name, note);
          updated++;
        } else {
          skipped++;
        }
      }
      let msg = `已更新 ${updated} 个预设的备注`;
      if (skipped > 0) msg += `，${skipped} 个留空未修改`;
      if (updated > 0) deps.cfmToastr.success(msg);
      else deps.cfmToastr.info(msg);
      deps.renderPresetsView();
      return;
    }

    const { note, clear } = result;
    const isBatch = names.length > 1;
    if (isBatch && !note && !clear) {
      deps.cfmToastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const name of names) {
      if (clear) {
        setPresetNote(name, "");
        count++;
      } else if (note) {
        setPresetNote(name, note);
        count++;
      } else if (!isBatch) {
        setPresetNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      deps.cfmToastr.success(`已更新 ${count} 个预设的备注`);
      deps.renderPresetsView();
    }
  }

  return {
    getPresetNote,
    setPresetNote,
    enterPresetNoteMode,
    exitPresetNoteMode,
    togglePresetNoteItem,
    prependPresetNoteToolbar,
    showPresetNotePopup,
    executePresetNoteEdit,
  };
}
