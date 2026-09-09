// 快速回复集备注层：承接 QR Set 备注的读取、保存、批量编辑与重命名后的备注键迁移；通用备注弹窗能力应复用 features/notes/notes.js，本文件只保留 quickreply 资源域的实际备注业务。

export function createQuickReplyNotesApiCore(deps) {
  const {
    $,
    cfmConfirm,
    cfmToastr,
    clearAllExclusiveModes,
    collectCurrentSelection,
    escapeHtml,
    extensionName,
    extensionSettings: extension_settings,
    getContext,
    getVisibleResourceIds,
    renderQRView,
    state,
  } = deps;

  function getQrNote(name) {
      return (extension_settings[extensionName].qrNotes || {})[name] || "";
    }


  function setQrNote(name, note) {
      if (!extension_settings[extensionName].qrNotes)
        extension_settings[extensionName].qrNotes = {};
      if (note) extension_settings[extensionName].qrNotes[name] = note;
      else delete extension_settings[extensionName].qrNotes[name];
      getContext().saveSettingsDebounced();
    }



  function enterQrNoteMode() {
      const prev = collectCurrentSelection();
      clearAllExclusiveModes();
      state.cfmQrNoteMode = true;
      state.cfmQrNoteSelected = prev || new Set();
      state.cfmQrNoteRangeMode = false;
      state.cfmQrNoteLastClicked = null;
      $("#cfm-qr-note-btn").addClass("cfm-edit-active");
      $("#cfm-qr-note-btn")
        .find("i")
        .removeClass("fa-pen-to-square")
        .addClass("fa-check");
      $("#cfm-qr-note-btn").attr("title", "确认编辑备注");
      $(".cfm-popup").addClass("cfm-qr-note-mode");
      renderQRView();
    }



  function exitQrNoteMode() {
      state.cfmQrNoteMode = false;
      state.cfmQrNoteSelected.clear();
      state.cfmQrNoteRangeMode = false;
      state.cfmQrNoteLastClicked = null;
      $("#cfm-qr-note-btn").removeClass("cfm-edit-active");
      $("#cfm-qr-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-qr-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-qr-note-mode");
      renderQRView();
    }



  function toggleQrNoteItem(id, shiftKey) {
      if ((shiftKey || state.cfmQrNoteRangeMode) && state.cfmQrNoteLastClicked) {
        const visible = getVisibleResourceIds();
        const lastIdx = visible.indexOf(state.cfmQrNoteLastClicked);
        const curIdx = visible.indexOf(id);
        if (lastIdx !== -1 && curIdx !== -1) {
          const [start, end] =
            lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
          for (let i = start; i <= end; i++) state.cfmQrNoteSelected.add(visible[i]);
        }
      } else {
        if (state.cfmQrNoteSelected.has(id)) state.cfmQrNoteSelected.delete(id);
        else state.cfmQrNoteSelected.add(id);
      }
      state.cfmQrNoteLastClicked = id;
    }



  function prependQrNoteToolbar(listContainer, renderFn) {
      if (!state.cfmQrNoteMode) return;
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => state.cfmQrNoteSelected.has(id));
      const toolbar = $(`
        <div class="cfm-edit-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmQrNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmQrNoteRangeMode ? "(开)" : ""}</button>
          <span class="cfm-edit-count">${state.cfmQrNoteSelected.size > 0 ? `已选 ${state.cfmQrNoteSelected.size} 项` : ""}</span>
          <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
        </div>
      `);
      toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (allSel) {
          visible.forEach((id) => state.cfmQrNoteSelected.delete(id));
        } else {
          visible.forEach((id) => state.cfmQrNoteSelected.add(id));
        }
        renderFn();
      });
      toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.cfmQrNoteRangeMode = !state.cfmQrNoteRangeMode;
        if (state.cfmQrNoteRangeMode) state.cfmQrNoteLastClicked = null;
        renderFn();
      });
      toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitQrNoteMode();
      });
      listContainer.prepend(toolbar);
    }



  function showQrNotePopup(qrNames) {
      if (!qrNames || qrNames.length === 0) return;
      const isBatch = qrNames.length > 1;
      let defaultNote = "";
      if (!isBatch) {
        defaultNote = getQrNote(qrNames[0]);
      }
      const nameListHtml =
        qrNames.length <= 5
          ? qrNames
              .map(
                (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
              )
              .join("")
          : qrNames
              .slice(0, 5)
              .map(
                (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
              )
              .join("") +
            `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${qrNames.length} 个快速回复集</div>`;

      const individualListHtml = isBatch
        ? qrNames
            .map((n) => {
              const currentNote = getQrNote(n);
              return `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${escapeHtml(n)}">${escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(n)}" value="${escapeHtml(currentNote)}"></div>`;
            })
            .join("")
        : "";

      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">编辑快速回复集备注</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            ${
              isBatch
                ? `<div class="cfm-edit-popup-field">
              <label>操作类型</label>
              <select class="cfm-edit-input" id="cfm-qr-note-action">
                <option value="uniform">统一备注</option>
                <option value="individual">逐个备注</option>
              </select>
            </div>`
                : ""
            }
            <div class="cfm-edit-popup-field" id="cfm-qr-note-uniform-field">
              <label>备注</label>
              <input type="text" class="cfm-edit-input" id="cfm-qr-note-input" value="${escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
            </div>
            ${
              isBatch
                ? `<div class="cfm-rename-individual-field" id="cfm-qr-note-individual-field">
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
        function updateQrNoteUI() {
          const action = overlay.find("#cfm-qr-note-action").val();
          const uniformField = overlay.find("#cfm-qr-note-uniform-field");
          const individualField = overlay.find("#cfm-qr-note-individual-field");
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
            overlay.find("#cfm-qr-note-input").focus();
          }
        }
        updateQrNoteUI();
        overlay.find("#cfm-qr-note-action").on("change", updateQrNoteUI);
      } else {
        overlay.find("#cfm-qr-note-input").focus();
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
            overlay.find("#cfm-qr-note-action").val() === "individual"
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
            const note = overlay.find("#cfm-qr-note-input").val().trim();
            overlay.remove();
            resolve({ note, clear: false });
          }
        });
        overlay.find("#cfm-qr-note-input").on("keydown", (e) => {
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



  async function executeQrNoteEdit(names) {
      const result = await showQrNotePopup(names);
      if (!result) return;

      if (result.mode === "individual") {
        const { noteMap } = result;
        let updated = 0;
        let skipped = 0;
        for (const name of names) {
          const note = noteMap[name];
          if (note !== undefined && note !== "") {
            setQrNote(name, note);
            updated++;
          } else {
            skipped++;
          }
        }
        let msg = `已更新 ${updated} 个快速回复集的备注`;
        if (skipped > 0) msg += `，${skipped} 个留空未修改`;
        if (updated > 0) cfmToastr.success(msg);
        else cfmToastr.info(msg);
        renderQRView();
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
          setQrNote(name, "");
          count++;
        } else if (note) {
          setQrNote(name, note);
          count++;
        } else if (!isBatch) {
          setQrNote(name, "");
          count++;
        }
      }
      if (count > 0) {
        cfmToastr.success(`已更新 ${count} 个快速回复集的备注`);
        renderQRView();
      }
    }



  return {
    getQrNote,
    setQrNote,
    enterQrNoteMode,
    exitQrNoteMode,
    toggleQrNoteItem,
    prependQrNoteToolbar,
    showQrNotePopup,
    executeQrNoteEdit,
  };
}
