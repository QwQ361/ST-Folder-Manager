// Persona 备注层：承接 User persona 资源域的备注读取、保存、批量编辑、导入导出恢复与 avatarId 相关备注同步。

export function createPersonaNotesApiCore(deps) {
  const getState = () => deps.state;

  function getPersonaNote(name) {
    return deps.extensionSettings[deps.extensionName].personaNotes?.[name] || "";
  }

  function setPersonaNote(name, note) {
    const settings = deps.extensionSettings[deps.extensionName];
    if (!settings.personaNotes) settings.personaNotes = {};
    if (note) {
      settings.personaNotes[name] = note;
    } else {
      delete settings.personaNotes[name];
    }
    deps.saveSettingsDebounced();
  }

  function enterPersonaNoteMode() {
    const prev = deps.collectCurrentSelection();
    deps.clearAllExclusiveModes();
    const state = getState();
    state.cfmPersonaNoteMode = true;
    state.cfmPersonaNoteSelected = prev || new Set();
    state.cfmPersonaNoteRangeMode = false;
    state.cfmPersonaNoteLastClicked = null;
    deps.$("#cfm-persona-note-btn").addClass("cfm-edit-active");
    deps.$("#cfm-persona-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    deps.$("#cfm-persona-note-btn").attr("title", "确认编辑备注");
    deps.$(".cfm-popup").addClass("cfm-persona-note-mode");
    deps.renderPersonasView();
  }

  function exitPersonaNoteMode() {
    const state = getState();
    state.cfmPersonaNoteMode = false;
    state.cfmPersonaNoteSelected.clear();
    state.cfmPersonaNoteRangeMode = false;
    state.cfmPersonaNoteLastClicked = null;
    deps.$("#cfm-persona-note-btn").removeClass("cfm-edit-active");
    deps.$("#cfm-persona-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    deps.$("#cfm-persona-note-btn").attr("title", "编辑备注");
    deps.$(".cfm-popup").removeClass("cfm-persona-note-mode");
    deps.renderPersonasView();
  }

  function togglePersonaNoteItem(id, shiftKey) {
    const state = getState();
    if (
      (shiftKey || state.cfmPersonaNoteRangeMode) &&
      state.cfmPersonaNoteLastClicked
    ) {
      const visible = deps.getVisibleResourceIds();
      const lastIdx = visible.indexOf(state.cfmPersonaNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) {
          state.cfmPersonaNoteSelected.add(visible[i]);
        }
      }
    } else if (state.cfmPersonaNoteSelected.has(id)) {
      state.cfmPersonaNoteSelected.delete(id);
    } else {
      state.cfmPersonaNoteSelected.add(id);
    }
    state.cfmPersonaNoteLastClicked = id;
  }

  function prependPersonaNoteToolbar(listContainer, renderFn) {
    const state = getState();
    if (!state.cfmPersonaNoteMode) return;
    const visible = deps.getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => state.cfmPersonaNoteSelected.has(id));
    const toolbar = deps.$(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmPersonaNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmPersonaNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${state.cfmPersonaNoteSelected.size > 0 ? `已选 ${state.cfmPersonaNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => state.cfmPersonaNoteSelected.delete(id));
      } else {
        visible.forEach((id) => state.cfmPersonaNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.cfmPersonaNoteRangeMode = !state.cfmPersonaNoteRangeMode;
      if (state.cfmPersonaNoteRangeMode) state.cfmPersonaNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitPersonaNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showPersonaNotePopup(personaIds) {
    if (!personaIds || personaIds.length === 0) return;
    const isBatch = personaIds.length > 1;
    let defaultNote = "";
    if (!isBatch) {
      defaultNote = getPersonaNote(personaIds[0]);
    }
    const pu = deps.getContext().powerUserSettings;
    const getDisplayName = (id) => (pu && pu.personas && pu.personas[id]) || id;
    const displayNames = personaIds.map(getDisplayName);
    const nameListHtml =
      displayNames.length <= 5
        ? displayNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`,
            )
            .join("")
        : displayNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${deps.escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${displayNames.length} 个User</div>`;

    const individualListHtml = isBatch
      ? personaIds
          .map((id, i) => {
            const displayName = displayNames[i];
            const currentNote = getPersonaNote(id);
            return `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${deps.escapeHtml(displayName)}">${deps.escapeHtml(displayName)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${deps.escapeHtml(id)}" value="${deps.escapeHtml(currentNote)}"></div>`;
          })
          .join("")
      : "";

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑User备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          ${
            isBatch
              ? `<div class="cfm-edit-popup-field">
            <label>操作类型</label>
            <select class="cfm-edit-input" id="cfm-persona-note-action">
              <option value="uniform">统一备注</option>
              <option value="individual">逐个备注</option>
            </select>
          </div>`
              : ""
          }
          <div class="cfm-edit-popup-field" id="cfm-persona-note-uniform-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-persona-note-input" value="${deps.escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          ${
            isBatch
              ? `<div class="cfm-rename-individual-field" id="cfm-persona-note-individual-field">
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
      function updatePersonaNoteUI() {
        const action = overlay.find("#cfm-persona-note-action").val();
        const uniformField = overlay.find("#cfm-persona-note-uniform-field");
        const individualField = overlay.find(
          "#cfm-persona-note-individual-field",
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
          overlay.find("#cfm-persona-note-input").focus();
        }
      }
      updatePersonaNoteUI();
      overlay
        .find("#cfm-persona-note-action")
        .on("change", updatePersonaNoteUI);
    } else {
      overlay.find("#cfm-persona-note-input").focus();
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
          overlay.find("#cfm-persona-note-action").val() === "individual"
        ) {
          const noteMap = {};
          overlay.find(".cfm-rename-individual-row").each(function () {
            const id = deps.$(this).find(".cfm-rename-new-input").data("old-name");
            const note = deps.$(this).find(".cfm-rename-new-input").val().trim();
            noteMap[id] = note;
          });
          overlay.remove();
          resolve({ mode: "individual", noteMap });
        } else {
          const note = overlay.find("#cfm-persona-note-input").val().trim();
          overlay.remove();
          resolve({ note, clear: false });
        }
      });
      overlay.find("#cfm-persona-note-input").on("keydown", (e) => {
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

  async function executePersonaNoteEdit(ids) {
    const result = await showPersonaNotePopup(ids);
    if (!result) return;

    if (result.mode === "individual") {
      const { noteMap } = result;
      let updated = 0;
      let skipped = 0;
      for (const id of ids) {
        const note = noteMap[id];
        if (note !== undefined && note !== "") {
          setPersonaNote(id, note);
          updated++;
        } else {
          skipped++;
        }
      }
      let msg = `已更新 ${updated} 个User的备注`;
      if (skipped > 0) msg += `，${skipped} 个留空未修改`;
      if (updated > 0) deps.cfmToastr.success(msg);
      else deps.cfmToastr.info(msg);
      deps.renderPersonasView();
      return;
    }

    const { note, clear } = result;
    const isBatch = ids.length > 1;
    if (isBatch && !note && !clear) {
      deps.cfmToastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const id of ids) {
      if (clear) {
        setPersonaNote(id, "");
        count++;
      } else if (note) {
        setPersonaNote(id, note);
        count++;
      } else if (!isBatch) {
        setPersonaNote(id, "");
        count++;
      }
    }
    if (count > 0) {
      deps.cfmToastr.success(`已更新 ${count} 个User的备注`);
      deps.renderPersonasView();
    }
  }

  return {
    getPersonaNote,
    setPersonaNote,
    enterPersonaNoteMode,
    exitPersonaNoteMode,
    togglePersonaNoteItem,
    prependPersonaNoteToolbar,
    showPersonaNotePopup,
    executePersonaNoteEdit,
  };
}
