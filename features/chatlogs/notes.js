// 聊天记录备注层：承接聊天备注数据的读取、保存、批量编辑弹窗与工具栏逻辑。

export function createChatlogNotesApiCore(deps) {
  const {
    $,
    cfmConfirm,
    cfmToastr,
    clearAllExclusiveModes,
    collectCurrentSelection,
    escapeHtml,
    extensionName,
    extensionSettings,
    getContext,
    getVisibleResourceIds,
    renderChatlogsView,
    state,
    syncChatlogPopupModeClasses,
  } = deps;

// 初始化聊天记录备注（从 extensionSettings 读取）
function initChatNotes() {
  if (!extensionSettings[extensionName].chatNotes)
    extensionSettings[extensionName].chatNotes = {};
  state.cfmChatNotes = extensionSettings[extensionName].chatNotes;
}

function saveChatNotes() {
  extensionSettings[extensionName].chatNotes = state.cfmChatNotes;
  getContext().saveSettingsDebounced();
}


function enterChatlogNoteMode() {
  const prev = collectCurrentSelection();
  clearAllExclusiveModes();
  state.cfmChatlogNoteMode = true;
  state.cfmChatlogNoteSelected = prev || new Set();
  state.cfmChatlogNoteRangeMode = false;
  state.cfmChatlogNoteLastClicked = null;
  $("#cfm-chatlog-note-btn").addClass("cfm-edit-active");
  $("#cfm-chatlog-note-btn")
    .find("i")
    .removeClass("fa-pen-to-square")
    .addClass("fa-check");
  $("#cfm-chatlog-note-btn").attr("title", "确认编辑备注");
  syncChatlogPopupModeClasses();
  renderChatlogsView();
}

function exitChatlogNoteMode() {
  state.cfmChatlogNoteMode = false;
  state.cfmChatlogNoteSelected.clear();
  state.cfmChatlogNoteRangeMode = false;
  state.cfmChatlogNoteLastClicked = null;
  $("#cfm-chatlog-note-btn").removeClass("cfm-edit-active");
  $("#cfm-chatlog-note-btn")
    .find("i")
    .removeClass("fa-check")
    .addClass("fa-pen-to-square");
  $("#cfm-chatlog-note-btn").attr("title", "编辑备注");
  syncChatlogPopupModeClasses();
  renderChatlogsView();
}

function toggleChatlogNoteItem(id, shiftKey) {
  if ((shiftKey || state.cfmChatlogNoteRangeMode) && state.cfmChatlogNoteLastClicked) {
    const visible = getVisibleResourceIds();
    const lastIdx = visible.indexOf(state.cfmChatlogNoteLastClicked);
    const curIdx = visible.indexOf(id);
    if (lastIdx !== -1 && curIdx !== -1) {
      const start = Math.min(lastIdx, curIdx);
      const end = Math.max(lastIdx, curIdx);
      for (let i = start; i <= end; i++)
        state.cfmChatlogNoteSelected.add(visible[i]);
    }
  } else {
    if (state.cfmChatlogNoteSelected.has(id)) state.cfmChatlogNoteSelected.delete(id);
    else state.cfmChatlogNoteSelected.add(id);
  }
  state.cfmChatlogNoteLastClicked = id;
}

async function showChatlogNotePopup(chatNames) {
  if (!chatNames || chatNames.length === 0) return;
  const isBatch = chatNames.length > 1;
  let defaultNote = "";
  if (!isBatch) {
    defaultNote = state.cfmChatNotes[chatNames[0].replace(/\.jsonl$/i, "")] || "";
  }
  const nameListHtml =
    chatNames.length <= 5
      ? chatNames
          .map(
            (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
          )
          .join("")
      : chatNames
          .slice(0, 5)
          .map(
            (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
          )
          .join("") +
        `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${chatNames.length} 个聊天记录</div>`;

  const individualListHtml = isBatch
    ? chatNames
        .map((n) => {
          const currentNote = state.cfmChatNotes[n.replace(/\.jsonl$/i, "")] || "";
          return `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${escapeHtml(n)}">${escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(n)}" value="${escapeHtml(currentNote)}"></div>`;
        })
        .join("")
    : "";

  const popupHtml = `
    <div class="cfm-edit-popup-overlay">
      <div class="cfm-edit-popup">
        <div class="cfm-edit-popup-title">编辑聊天记录备注</div>
        <div class="cfm-edit-popup-names">${nameListHtml}</div>
        ${
          isBatch
            ? `<div class="cfm-edit-popup-field">
          <label>操作类型</label>
          <select class="cfm-edit-input" id="cfm-chatlog-note-action">
            <option value="uniform">统一备注</option>
            <option value="individual">逐个备注</option>
          </select>
        </div>`
            : ""
        }
        <div class="cfm-edit-popup-field" id="cfm-chatlog-note-uniform-field">
          <label>备注</label>
          <input type="text" class="cfm-edit-input" id="cfm-chatlog-note-input" value="${escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
        </div>
        ${
          isBatch
            ? `<div class="cfm-rename-individual-field" id="cfm-chatlog-note-individual-field">
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
    function updateChatlogNoteUI() {
      const action = overlay.find("#cfm-chatlog-note-action").val();
      const uniformField = overlay.find("#cfm-chatlog-note-uniform-field");
      const individualField = overlay.find(
        "#cfm-chatlog-note-individual-field",
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
        overlay.find("#cfm-chatlog-note-input").focus();
      }
    }
    updateChatlogNoteUI();
    overlay
      .find("#cfm-chatlog-note-action")
      .on("change", updateChatlogNoteUI);
  } else {
    overlay.find("#cfm-chatlog-note-input").focus();
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
        overlay.find("#cfm-chatlog-note-action").val() === "individual"
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
        const note = overlay.find("#cfm-chatlog-note-input").val().trim();
        overlay.remove();
        resolve({ note, clear: false });
      }
    });
    overlay.find("#cfm-chatlog-note-input").on("keydown", (e) => {
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

function showChatNotePopup(chatName, currentNote = "") {
  const popupHtml = `
    <div class="cfm-edit-popup-overlay">
      <div class="cfm-edit-popup">
        <div class="cfm-edit-popup-title">编辑聊天记录备注</div>
        <div class="cfm-edit-popup-names"><div class="cfm-edit-name-item">${escapeHtml(chatName)}</div></div>
        <div class="cfm-edit-popup-field">
          <label>备注</label>
          <input type="text" class="cfm-edit-input" id="cfm-chat-note-input" value="${escapeHtml(currentNote || "")}" placeholder="输入备注内容，留空则清除">
        </div>
        <div class="cfm-edit-popup-actions">
          <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
          ${(currentNote || "") ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : ""}
          <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
        </div>
      </div>
    </div>
  `;
  const overlay = $(popupHtml);
  $("body").append(overlay);
  overlay.find("#cfm-chat-note-input").focus();

  return new Promise((resolve) => {
    overlay.find(".cfm-edit-popup-cancel").on("click", () => {
      overlay.remove();
      resolve(undefined);
    });
    overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
      if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
        overlay.remove();
        resolve(undefined);
      }
    });
    overlay.find(".cfm-edit-popup-clear").on("click", () => {
      if (!cfmConfirm("确认清除备注吗？")) return;
      overlay.remove();
      resolve("");
    });
    overlay.find(".cfm-edit-popup-confirm").on("click", () => {
      const note = overlay.find("#cfm-chat-note-input").val().trim();
      overlay.remove();
      resolve(note);
    });
    overlay.find("#cfm-chat-note-input").on("keydown", (e) => {
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

async function executeChatlogNoteEdit(names) {
  const result = await showChatlogNotePopup(names);
  if (!result) return;

  if (result.mode === "individual") {
    const { noteMap } = result;
    let updated = 0;
    let skipped = 0;
    for (const name of names) {
      const note = noteMap[name];
      const noteKey = name.replace(/\.jsonl$/i, "");
      if (note !== undefined && note !== "") {
        state.cfmChatNotes[noteKey] = note;
        updated++;
      } else {
        skipped++;
      }
    }
    saveChatNotes();
    let msg = `已更新 ${updated} 个聊天记录的备注`;
    if (skipped > 0) msg += `，${skipped} 个留空未修改`;
    if (updated > 0) cfmToastr.success(msg);
    else cfmToastr.info(msg);
    renderChatlogsView();
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
    const noteKey = name.replace(/\.jsonl$/i, "");
    if (clear) {
      delete state.cfmChatNotes[noteKey];
      count++;
    } else if (note) {
      state.cfmChatNotes[noteKey] = note;
      count++;
    } else if (!isBatch) {
      delete state.cfmChatNotes[noteKey];
      count++;
    }
  }
  if (count > 0) {
    saveChatNotes();
    cfmToastr.success(`已更新 ${count} 个聊天记录的备注`);
    renderChatlogsView();
  }
}

function prependChatlogNoteToolbar(listContainer, renderFn) {
  if (!state.cfmChatlogNoteMode) return;
  const visible = getVisibleResourceIds();
  const allSel =
    visible.length > 0 &&
    visible.every((id) => state.cfmChatlogNoteSelected.has(id));
  const toolbar = $(
    `<div class="cfm-edit-toolbar"><button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmChatlogNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmChatlogNoteRangeMode ? "(开)" : ""}</button><span class="cfm-edit-count">${state.cfmChatlogNoteSelected.size > 0 ? `已选 ${state.cfmChatlogNoteSelected.size} 项` : ""}</span><button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button></div>`,
  );
  toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allSel) visible.forEach((id) => state.cfmChatlogNoteSelected.delete(id));
    else visible.forEach((id) => state.cfmChatlogNoteSelected.add(id));
    renderFn();
  });
  toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.cfmChatlogNoteRangeMode = !state.cfmChatlogNoteRangeMode;
    if (state.cfmChatlogNoteRangeMode) state.cfmChatlogNoteLastClicked = null;
    renderFn();
  });
  toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    exitChatlogNoteMode();
  });
  listContainer.prepend(toolbar);
}



  return {
    initChatNotes,
    saveChatNotes,
    enterChatlogNoteMode,
    exitChatlogNoteMode,
    toggleChatlogNoteItem,
    showChatlogNotePopup,
    executeChatlogNoteEdit,
    prependChatlogNoteToolbar,
    showChatNotePopup,
  };
}
