// 世界书备注层：承接 worldinfo 资源域的备注读取、保存、批量编辑与导入导出恢复；通用备注弹窗能力应复用 features/notes/notes.js，本文件只保留世界书自身备注业务。

export function createWorldInfoNotesApiCore(deps) {
  const getState = () => deps.state;

  function getWorldInfoNote(name) {
    return deps.extensionSettings[deps.extensionName].worldInfoNotes?.[name] || "";
  }

  function setWorldInfoNote(name, note) {
    const settings = deps.extensionSettings[deps.extensionName];
    if (!settings.worldInfoNotes) settings.worldInfoNotes = {};
    if (note) {
      settings.worldInfoNotes[name] = note;
    } else {
      delete settings.worldInfoNotes[name];
    }
    deps.saveSettingsDebounced();
  }

  function enterWorldInfoNoteMode() {
    const prev = deps.collectCurrentSelection();
    deps.clearAllExclusiveModes();
    const state = getState();
    state.cfmWorldInfoNoteMode = true;
    state.cfmWorldInfoNoteSelected = prev || new Set();
    state.cfmWorldInfoNoteRangeMode = false;
    state.cfmWorldInfoNoteLastClicked = null;
    deps.$("#cfm-worldinfo-note-btn").addClass("cfm-edit-active");
    deps.$("#cfm-worldinfo-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    deps.$("#cfm-worldinfo-note-btn").attr("title", "确认编辑备注");
    deps.$(".cfm-popup").addClass("cfm-worldinfo-note-mode");
    deps.renderWorldInfoView();
  }

  function exitWorldInfoNoteMode() {
    const state = getState();
    state.cfmWorldInfoNoteMode = false;
    state.cfmWorldInfoNoteSelected.clear();
    state.cfmWorldInfoNoteRangeMode = false;
    state.cfmWorldInfoNoteLastClicked = null;
    deps.$("#cfm-worldinfo-note-btn").removeClass("cfm-edit-active");
    deps.$("#cfm-worldinfo-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    deps.$("#cfm-worldinfo-note-btn").attr("title", "编辑备注");
    deps.$(".cfm-popup").removeClass("cfm-worldinfo-note-mode");
    deps.renderWorldInfoView();
  }

  function toggleWorldInfoNoteItem(id, shiftKey) {
    const state = getState();
    if (
      (shiftKey || state.cfmWorldInfoNoteRangeMode) &&
      state.cfmWorldInfoNoteLastClicked
    ) {
      const visible = deps.getVisibleResourceIds();
      const lastIdx = visible.indexOf(state.cfmWorldInfoNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) {
          state.cfmWorldInfoNoteSelected.add(visible[i]);
        }
      }
    } else {
      if (state.cfmWorldInfoNoteSelected.has(id)) {
        state.cfmWorldInfoNoteSelected.delete(id);
      } else {
        state.cfmWorldInfoNoteSelected.add(id);
      }
    }
    state.cfmWorldInfoNoteLastClicked = id;
  }

  function prependWorldInfoNoteToolbar(listContainer, renderFn) {
    const state = getState();
    if (!state.cfmWorldInfoNoteMode) return;
    const visible = deps.getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => state.cfmWorldInfoNoteSelected.has(id));
    const toolbar = deps.$(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmWorldInfoNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmWorldInfoNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${state.cfmWorldInfoNoteSelected.size > 0 ? `已选 ${state.cfmWorldInfoNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => state.cfmWorldInfoNoteSelected.delete(id));
      } else {
        visible.forEach((id) => state.cfmWorldInfoNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.cfmWorldInfoNoteRangeMode = !state.cfmWorldInfoNoteRangeMode;
      if (state.cfmWorldInfoNoteRangeMode) state.cfmWorldInfoNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitWorldInfoNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showWorldInfoNotePopup(wiNames) {
    if (!wiNames || wiNames.length === 0) return;
    const isBatch = wiNames.length > 1;
    let defaultNote = "";
    if (!isBatch) {
      defaultNote = getWorldInfoNote(wiNames[0]);
    }
    const nameListHtml =
      wiNames.length <= 5
        ? wiNames
            .map((n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`)
            .join("")
        : wiNames
            .slice(0, 5)
            .map((n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`)
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${wiNames.length} 个世界书</div>`;

    const individualListHtml = isBatch
      ? wiNames
          .map((n) => {
            const currentNote = getWorldInfoNote(n);
            return `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${deps.escapeHtml(n)}">${deps.escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${deps.escapeHtml(n)}" value="${deps.escapeHtml(currentNote)}"></div>`;
          })
          .join("")
      : "";

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑世界书备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          ${
            isBatch
              ? `<div class="cfm-edit-popup-field">
            <label>操作类型</label>
            <select class="cfm-edit-input" id="cfm-wi-note-action">
              <option value="uniform">统一备注</option>
              <option value="individual">逐个备注</option>
            </select>
          </div>`
              : ""
          }
          <div class="cfm-edit-popup-field" id="cfm-wi-note-uniform-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-worldinfo-note-input" value="${deps.escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          ${
            isBatch
              ? `<div class="cfm-rename-individual-field" id="cfm-wi-note-individual-field">
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
      function updateWiNoteUI() {
        const action = overlay.find("#cfm-wi-note-action").val();
        const uniformField = overlay.find("#cfm-wi-note-uniform-field");
        const individualField = overlay.find("#cfm-wi-note-individual-field");
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
          overlay.find("#cfm-worldinfo-note-input").focus();
        }
      }
      updateWiNoteUI();
      overlay.find("#cfm-wi-note-action").on("change", updateWiNoteUI);
    } else {
      overlay.find("#cfm-worldinfo-note-input").focus();
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
          overlay.find("#cfm-wi-note-action").val() === "individual"
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
          const note = overlay.find("#cfm-worldinfo-note-input").val().trim();
          overlay.remove();
          resolve({ note, clear: false });
        }
      });
      overlay.find("#cfm-worldinfo-note-input").on("keydown", (e) => {
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

  async function executeWorldInfoNoteEdit(names) {
    const result = await showWorldInfoNotePopup(names);
    if (!result) return;

    if (result.mode === "individual") {
      const { noteMap } = result;
      let updated = 0;
      let skipped = 0;
      for (const name of names) {
        const note = noteMap[name];
        if (note !== undefined && note !== "") {
          setWorldInfoNote(name, note);
          updated++;
        } else {
          skipped++;
        }
      }
      let msg = `已更新 ${updated} 个世界书的备注`;
      if (skipped > 0) msg += `，${skipped} 个留空未修改`;
      if (updated > 0) deps.cfmToastr.success(msg);
      else deps.cfmToastr.info(msg);
      deps.renderWorldInfoView();
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
        setWorldInfoNote(name, "");
        count++;
      } else if (note) {
        setWorldInfoNote(name, note);
        count++;
      } else if (!isBatch) {
        setWorldInfoNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      deps.cfmToastr.success(`已更新 ${count} 个世界书的备注`);
      deps.renderWorldInfoView();
    }
  }

  return {
    getWorldInfoNote,
    setWorldInfoNote,
    enterWorldInfoNoteMode,
    exitWorldInfoNoteMode,
    toggleWorldInfoNoteItem,
    prependWorldInfoNoteToolbar,
    showWorldInfoNotePopup,
    executeWorldInfoNoteEdit,
  };
}
