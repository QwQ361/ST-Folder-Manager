// 聊天记录重命名层：承接聊天记录名称编辑弹窗、批量重命名与实际重命名执行。

export function createChatlogRenameApiCore(deps) {
  const {
    $,
    cfmToastr,
    clearAllExclusiveModes,
    collectCurrentSelection,
    escapeHtml,
    findCommonPrefix,
    findCommonSuffix,
    getChatlogGroups,
    getChatlogTargetAvatar,
    getCharacters,
    getContext,
    getVisibleResourceIds,
    invalidateChatCache,
    openCharacterChatFunc,
    renameGroupOrCharacterChatFunc,
    renderChatlogsView,
    saveChatNotes,
    splitChatlogFileName,
    state,
    syncChatlogPopupModeClasses,
  } = deps;

function showChatRenamePopup(chatName) {
  return new Promise((resolve) => {
    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">重命名聊天记录</div>
          <div class="cfm-edit-popup-names"><span class="cfm-edit-popup-name-tag">${escapeHtml(chatName)}</span></div>
          <div class="cfm-edit-popup-field">
            <label>新名称</label>
            <input type="text" class="cfm-edit-input" id="cfm-chat-rename-input" value="${escapeHtml(chatName)}" placeholder="输入新名称">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>`;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-chat-rename-input").trigger("focus").select();
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
      const newName = overlay.find("#cfm-chat-rename-input").val().trim();
      overlay.remove();
      resolve(newName || null);
    });
    overlay.find("#cfm-chat-rename-input").on("keydown", (e) => {
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


async function renameChatFile(avatar, oldFileName, newName) {
  const characters = getCharacters();
  const charIdx = characters.findIndex((c) => c.avatar === avatar);
  if (charIdx < 0) return false;
  try {
    const ctx = getContext();
    // renameGroupOrCharacterChat 期望不带 .jsonl 扩展名的文件名
    const oldNameNoExt = oldFileName.replace(/\.jsonl$/i, "");
    const newNameNoExt = newName.replace(/\.jsonl$/i, "");
    if (renameGroupOrCharacterChatFunc) {
      await renameGroupOrCharacterChatFunc({
        characterId: String(charIdx),
        groupId: null,
        oldFileName: oldNameNoExt,
        newFileName: newNameNoExt,
        loader: false,
      });
    } else if (ctx.renameChat) {
      const currentChatId = ctx.getCurrentChatId
        ? ctx.getCurrentChatId()
        : null;
      const needSwitchContext = currentChatId !== oldNameNoExt;
      if (needSwitchContext && openCharacterChatFunc) {
        await openCharacterChatFunc(String(charIdx), oldNameNoExt);
      }
      await ctx.renameChat(oldNameNoExt, newNameNoExt);
    } else {
      return false;
    }
    // 迁移备注（备注 key 统一使用不带 .jsonl 的文件名）
    if (state.cfmChatNotes[oldNameNoExt]) {
      state.cfmChatNotes[newNameNoExt] = state.cfmChatNotes[oldNameNoExt];
      delete state.cfmChatNotes[oldNameNoExt];
      saveChatNotes();
    }
    await invalidateChatCache(avatar);
    return true;
  } catch (e) {
    console.error("[CFM] 重命名聊天记录失败:", e);
    return false;
  }
}


function enterChatlogRenameMode() {
  const prev = collectCurrentSelection();
  clearAllExclusiveModes();
  state.cfmChatlogRenameMode = true;
  state.cfmChatlogRenameSelected = prev || new Set();
  state.cfmChatlogRenameRangeMode = false;
  state.cfmChatlogRenameLastClicked = null;
  $("#cfm-chatlog-rename-btn").addClass("cfm-edit-active");
  $("#cfm-chatlog-rename-btn")
    .find("i")
    .removeClass("fa-i-cursor")
    .addClass("fa-check");
  $("#cfm-chatlog-rename-btn").attr("title", "确认重命名");
  syncChatlogPopupModeClasses();
  renderChatlogsView();
}

function exitChatlogRenameMode() {
  state.cfmChatlogRenameMode = false;
  state.cfmChatlogRenameSelected.clear();
  state.cfmChatlogRenameRangeMode = false;
  state.cfmChatlogRenameLastClicked = null;
  $("#cfm-chatlog-rename-btn").removeClass("cfm-edit-active");
  $("#cfm-chatlog-rename-btn")
    .find("i")
    .removeClass("fa-check")
    .addClass("fa-i-cursor");
  $("#cfm-chatlog-rename-btn").attr("title", "重命名聊天记录");
  syncChatlogPopupModeClasses();
  renderChatlogsView();
}

function toggleChatlogRenameItem(id, shiftKey) {
  if (
    (shiftKey || state.cfmChatlogRenameRangeMode) &&
    state.cfmChatlogRenameLastClicked
  ) {
    const visible = getVisibleResourceIds();
    const lastIdx = visible.indexOf(state.cfmChatlogRenameLastClicked);
    const curIdx = visible.indexOf(id);
    if (lastIdx !== -1 && curIdx !== -1) {
      const start = Math.min(lastIdx, curIdx);
      const end = Math.max(lastIdx, curIdx);
      for (let i = start; i <= end; i++)
        state.cfmChatlogRenameSelected.add(visible[i]);
    }
  } else {
    if (state.cfmChatlogRenameSelected.has(id)) state.cfmChatlogRenameSelected.delete(id);
    else state.cfmChatlogRenameSelected.add(id);
  }
  state.cfmChatlogRenameLastClicked = id;
}


async function showChatlogRenamePopup(names) {
  if (!names || names.length === 0) return;
  const isSingle = names.length === 1;
  const nameMeta = names.map((n) => ({
    fullName: n,
    ...splitChatlogFileName(n),
  }));
  const nameListHtml =
    nameMeta.length <= 5
      ? nameMeta
          .map(
            (item) =>
              `<div class="cfm-edit-name-item" title="${escapeHtml(item.fullName)}">${escapeHtml(item.displayName)}</div>`,
          )
          .join("")
      : nameMeta
          .slice(0, 5)
          .map(
            (item) =>
              `<div class="cfm-edit-name-item" title="${escapeHtml(item.fullName)}">${escapeHtml(item.displayName)}</div>`,
          )
          .join("") +
        `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${nameMeta.length} 个聊天记录</div>`;

  if (isSingle) {
    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">重命名聊天记录</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>新名称</label>
            <input type="text" class="cfm-edit-input" id="cfm-chatlog-rename-input" value="" placeholder="输入新名称">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-chatlog-rename-input").focus().select();
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
        const newBaseName = overlay
          .find("#cfm-chatlog-rename-input")
          .val()
          .trim();
        overlay.remove();
        resolve({
          mode: "single",
          newName: newBaseName
            ? `${newBaseName}${nameMeta[0].ext}`
            : newBaseName,
        });
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

  const individualListHtml = nameMeta
    .map(
      (item) =>
        `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${escapeHtml(item.fullName)}">${escapeHtml(item.displayName)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(item.fullName)}" data-ext="${escapeHtml(item.ext)}" value=""></div>`,
    )
    .join("");
  const popupHtml = `
    <div class="cfm-edit-popup-overlay">
      <div class="cfm-edit-popup">
        <div class="cfm-edit-popup-title">批量重命名聊天记录</div>
        <div class="cfm-edit-popup-names">${nameListHtml}</div>
        <div class="cfm-edit-popup-field">
          <label>操作类型</label>
          <select class="cfm-edit-input" id="cfm-chatlog-rename-action">
            <option value="add-prefix">增加前缀</option>
            <option value="add-suffix">增加后缀</option>
            <option value="del-prefix">删除前缀</option>
            <option value="del-suffix">删除后缀</option>
            <option value="individual">逐个重命名</option>
          </select>
        </div>
        <div class="cfm-edit-popup-field" id="cfm-chatlog-rename-text-field">
          <label id="cfm-chatlog-rename-text-label">前缀内容</label>
          <input type="text" class="cfm-edit-input" id="cfm-chatlog-rename-text" placeholder="输入前缀内容">
        </div>
        <div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;">
          <label>自动检测到的公共前/后缀</label>
          <div id="cfm-chatlog-rename-detected" class="cfm-rename-detected"></div>
        </div>
        <div class="cfm-rename-individual-field" id="cfm-chatlog-rename-individual-field">
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
  const overlay = $(popupHtml);
  $("body").append(overlay);

  function updateRenameUI() {
    const action = overlay.find("#cfm-chatlog-rename-action").val();
    const textLabel = overlay.find("#cfm-chatlog-rename-text-label");
    const textInput = overlay.find("#cfm-chatlog-rename-text");
    const autoDetect = overlay.find(".cfm-rename-auto-detect");
    const detected = overlay.find("#cfm-chatlog-rename-detected");
    const textField = overlay.find("#cfm-chatlog-rename-text-field");
    const individualField = overlay.find(
      "#cfm-chatlog-rename-individual-field",
    );
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
        const baseNames = names.map((n) => splitChatlogFileName(n).baseName);
        const commonPrefix = findCommonPrefix(baseNames);
        if (commonPrefix) {
          detected.html(
            `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonPrefix)}">${escapeHtml(commonPrefix)}</span>`,
          );
          autoDetect.show();
        } else {
          detected.html(
            '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
          );
          autoDetect.show();
        }
      } else if (action === "del-suffix") {
        textLabel.text("要删除的后缀");
        textInput.attr(
          "placeholder",
          "输入要删除的后缀，或点击下方自动检测结果",
        );
        const baseNames2 = names.map((n) => splitChatlogFileName(n).baseName);
        const commonSuffix = findCommonSuffix(baseNames2);
        if (commonSuffix) {
          detected.html(
            `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonSuffix)}">${escapeHtml(commonSuffix)}</span>`,
          );
          autoDetect.show();
        } else {
          detected.html(
            '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
          );
          autoDetect.show();
        }
      }
    }
  }
  updateRenameUI();
  overlay.find("#cfm-chatlog-rename-action").on("change", updateRenameUI);
  overlay.on("click", ".cfm-rename-detect-item", function () {
    overlay.find("#cfm-chatlog-rename-text").val($(this).data("value"));
  });
  overlay.find("#cfm-chatlog-rename-text").focus();

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
      const action = overlay.find("#cfm-chatlog-rename-action").val();
      if (action === "individual") {
        const renameMap = {};
        overlay.find(".cfm-rename-individual-row").each(function () {
          const oldName = $(this)
            .find(".cfm-rename-new-input")
            .data("old-name");
          const input = $(this).find(".cfm-rename-new-input");
          const newBaseName = input.val().trim();
          const ext = String(input.data("ext") || "");
          if (newBaseName) renameMap[oldName] = `${newBaseName}${ext}`;
        });
        overlay.remove();
        resolve({ mode: "individual", renameMap });
      } else {
        const text = overlay.find("#cfm-chatlog-rename-text").val().trim();
        overlay.remove();
        resolve({ mode: "batch", action, text });
      }
    });
    overlay.find("#cfm-chatlog-rename-text").on("keydown", (e) => {
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

async function executeChatlogRename(names) {
  if (!Array.isArray(names) || names.length === 0) return;
  const avatar = getChatlogTargetAvatar();
  if (!avatar) return;
  const result = await showChatlogRenamePopup(names);
  if (!result) return;

  const chatGroups = getChatlogGroups(avatar);
  let notesChanged = false;

  async function renameOne(oldName, newName) {
    if (!newName) return { status: "skip-empty" };
    if (newName === oldName) return { status: "skip-same" };
    const ok = await renameChatFile(avatar, oldName, newName);
    if (!ok) return { status: "failed" };
    if (chatGroups[oldName]) {
      chatGroups[newName] = chatGroups[oldName];
      delete chatGroups[oldName];
    }
    const oldNoteKey = oldName.replace(/\.jsonl$/i, "");
    const newNoteKey = newName.replace(/\.jsonl$/i, "");
    if (state.cfmChatNotes[oldNoteKey]) {
      state.cfmChatNotes[newNoteKey] = state.cfmChatNotes[oldNoteKey];
      delete state.cfmChatNotes[oldNoteKey];
      notesChanged = true;
    }
    return { status: "success" };
  }

  if (result.mode === "single") {
    const oldName = names[0];
    const newName = result.newName;
    if (!newName) {
      cfmToastr.warning("请输入新名称");
      return;
    }
    const renamed = await renameOne(oldName, newName);
    if (renamed.status === "skip-same") {
      cfmToastr.info("名称未变更");
      return;
    }
    if (renamed.status === "success") {
      getContext().saveSettingsDebounced();
      if (notesChanged) saveChatNotes();
      cfmToastr.success(`已将「${oldName}」重命名为「${newName}」`);
      renderChatlogsView();
    } else {
      cfmToastr.error("重命名失败");
    }
    return;
  }

  if (result.mode === "batch") {
    const { action, text } = result;
    if (!text) {
      cfmToastr.warning("请输入内容");
      return;
    }
    let success = 0;
    let skipped = 0;
    let failed = 0;
    for (const oldName of names) {
      let newName;
      const { baseName, ext } = splitChatlogFileName(oldName);
      if (action === "add-prefix") {
        newName = text + baseName + ext;
      } else if (action === "add-suffix") {
        newName = baseName + text + ext;
      } else if (action === "del-prefix") {
        if (!baseName.startsWith(text)) {
          skipped++;
          continue;
        }
        newName = baseName.substring(text.length) + ext;
      } else if (action === "del-suffix") {
        if (!baseName.endsWith(text)) {
          skipped++;
          continue;
        }
        newName = baseName.substring(0, baseName.length - text.length) + ext;
      }
      const renamed = await renameOne(oldName, newName);
      if (renamed.status === "success") success++;
      else if (
        renamed.status === "skip-empty" ||
        renamed.status === "skip-same"
      )
        skipped++;
      else failed++;
    }
    getContext().saveSettingsDebounced();
    if (notesChanged) saveChatNotes();
    let msg = `批量重命名完成：成功 ${success} 个`;
    if (skipped > 0) msg += `，跳过 ${skipped} 个`;
    if (failed > 0) msg += `，失败 ${failed} 个`;
    if (success > 0) cfmToastr.success(msg);
    else if (failed > 0) cfmToastr.warning(msg);
    else cfmToastr.info(msg);
    renderChatlogsView();
    return;
  }

  if (result.mode === "individual") {
    const { renameMap } = result;
    let success = 0;
    let skipped = 0;
    let failed = 0;
    for (const oldName of names) {
      const newName = renameMap[oldName];
      if (!newName) {
        skipped++;
        continue;
      }
      const renamed = await renameOne(oldName, newName);
      if (renamed.status === "success") success++;
      else if (
        renamed.status === "skip-empty" ||
        renamed.status === "skip-same"
      )
        skipped++;
      else failed++;
    }
    getContext().saveSettingsDebounced();
    if (notesChanged) saveChatNotes();
    let msg = `批量重命名完成：成功 ${success} 个`;
    if (skipped > 0) msg += `，跳过 ${skipped} 个`;
    if (failed > 0) msg += `，失败 ${failed} 个`;
    if (success > 0) cfmToastr.success(msg);
    else if (failed > 0) cfmToastr.warning(msg);
    else cfmToastr.info(msg);
    renderChatlogsView();
  }
}

function prependChatlogRenameToolbar(listContainer, renderFn) {
  if (!state.cfmChatlogRenameMode) return;
  const visible = getVisibleResourceIds();
  const allSel =
    visible.length > 0 &&
    visible.every((id) => state.cfmChatlogRenameSelected.has(id));
  const toolbar = $(
    `<div class="cfm-edit-toolbar"><button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmChatlogRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmChatlogRenameRangeMode ? "(开)" : ""}</button><span class="cfm-edit-count">${state.cfmChatlogRenameSelected.size > 0 ? `已选 ${state.cfmChatlogRenameSelected.size} 项` : ""}</span><button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button></div>`,
  );
  toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allSel) visible.forEach((id) => state.cfmChatlogRenameSelected.delete(id));
    else visible.forEach((id) => state.cfmChatlogRenameSelected.add(id));
    renderFn();
  });
  toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    state.cfmChatlogRenameRangeMode = !state.cfmChatlogRenameRangeMode;
    if (state.cfmChatlogRenameRangeMode) state.cfmChatlogRenameLastClicked = null;
    renderFn();
  });
  toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    exitChatlogRenameMode();
  });
  listContainer.prepend(toolbar);
}


  return {
    showChatRenamePopup,
    renameChatFile,
    enterChatlogRenameMode,
    exitChatlogRenameMode,
    toggleChatlogRenameItem,
    showChatlogRenamePopup,
    executeChatlogRename,
    prependChatlogRenameToolbar,
  };
}
