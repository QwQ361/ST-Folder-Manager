// 聊天子列表视图：renderChatSubList + tryCollapseSublistFromOuterGap
export function createChatSublistApi(deps) {
  const {
    $,
    cfmConfirm,
    cfmToastr,
    deleteChatFile,
    escapeHtml,
    exportChatFile,
    getCharacters,
    getContext,
    getEventClientX,
    getLatestQrCollapseTargetName,
    importChatFiles,
    isChatPinned,
    openChatFile,
    renameChatFile,
    rerenderCurrentView,
    saveChatNotes,
    scrollElementIntoViewCentered,
    scrollQrRowIntoView,
    showBatchProgressOverlay,
    showChatNotePopup,
    showChatRenamePopup,
    toggleChatBatchItem,
    togglePinChat,
    state,
  } = deps;
  function tryCollapseSublistFromOuterGap(e) {
    const clientX = getEventClientX(e);
    if (typeof clientX !== "number") return false;

    // 每个条目：选择器 + 对应的 toggle 选择器
    const entries = [
      { sel: ".cfm-char-detail-sublist", toggle: ".cfm-char-detail-toggle" },
      {
        sel: ".cfm-preset-detail-sublist",
        toggle: ".cfm-preset-detail-toggle",
      },
      { sel: ".cfm-persona-sublist", toggle: ".cfm-persona-toggle" },
      { sel: ".cfm-qr-sub-items", toggle: ".cfm-qr-expand-arrow", isQr: true },
      { sel: ".cfm-regex-sublist", toggle: ".cfm-regex-toggle" },
      {
        sel: ".cfm-chat-sublist:not(.cfm-char-detail-sublist):not(.cfm-preset-detail-sublist):not(.cfm-persona-sublist)",
        toggle: ".cfm-chat-toggle",
      },
    ];

    // 收集所有匹配的候选，选择垂直范围最小（最精确）的
    let bestMatch = null;
    let bestHeight = Infinity;

    for (const entry of entries) {
      const nodes = $(entry.sel).toArray();
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        const gapLeft = rect.left - 30;
        const gapRight = rect.left;
        const withinVertical =
          e.clientY >= rect.top && e.clientY <= rect.bottom;
        const withinGap = clientX >= gapLeft && clientX <= gapRight;
        if (!withinVertical || !withinGap) continue;

        const subList = $(node);
        const row = subList.prevAll(".cfm-row").first();
        const toggle = row.find(entry.toggle).first();
        if (!toggle.length) continue;

        const height = rect.height;
        if (height < bestHeight) {
          bestHeight = height;
          bestMatch = { entry, node, subList, row, toggle };
        }
      }
    }

    if (!bestMatch) return false;

    e.preventDefault();
    e.stopPropagation();
    const { entry, row, toggle } = bestMatch;
    if (entry.isQr) {
      const targetName =
        row.attr("data-res-id") || getLatestQrCollapseTargetName();
      if (targetName) state.cfmQrLastFocusedSetName = targetName;
      toggle.trigger("click");
      if (targetName) scrollQrRowIntoView(targetName);
    } else {
      toggle.trigger("click");
      scrollElementIntoViewCentered(row);
    }
    return true;
  }

  function renderChatSubList(charRow, avatar, chats) {
    // 移除已有的子列表
    charRow.next(".cfm-chat-sublist").remove();

    const characters = getCharacters();
    const char = characters.find((c) => c.avatar === avatar);
    const currentChatName = char ? char.chat : null;

    const subList = $('<div class="cfm-chat-sublist"></div>');

    // 聊天记录操作工具栏（始终显示）
    const chatToolbar = $(`
      <div class="cfm-chat-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-chat-import-btn" title="导入聊天记录"><i class="fa-solid fa-file-import"></i> 导入</button>
        <input type="file" class="cfm-chat-import-file" multiple accept=".json,.jsonl" style="display:none;">
        <button class="cfm-btn cfm-btn-sm cfm-chat-batch-toggle ${state.cfmChatBatchMode ? "cfm-chat-batch-active" : ""}" title="批量操作模式"><i class="fa-solid fa-list-check"></i> ${state.cfmChatBatchMode ? "退出批量" : "批量操作"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-chat-manage-btn" title="在聊天记录页管理此角色的聊天"><i class="fa-solid fa-folder-tree"></i> 管理</button>
      </div>
    `);
    chatToolbar.find(".cfm-chat-import-btn").on("click", (e) => {
      e.stopPropagation();
      chatToolbar.find(".cfm-chat-import-file").val("").trigger("click");
    });
    chatToolbar.find(".cfm-chat-import-file").on("change", async (e) => {
      e.stopPropagation();
      const files = e.target.files;
      if (!files || files.length === 0) return;
      await importChatFiles(avatar, files);
    });
    chatToolbar.find(".cfm-chat-batch-toggle").on("click", (e) => {
      e.stopPropagation();
      state.cfmChatBatchMode = !state.cfmChatBatchMode;
      state.cfmChatBatchSelected.clear();
      state.cfmChatBatchRangeMode = false;
      state.cfmChatBatchLastClicked = null;
      rerenderCurrentView();
    });
    chatToolbar.find(".cfm-chat-manage-btn").on("click", (e) => {
      e.stopPropagation();
      state.cfmChatlogTargetAvatar = avatar;
      state.selectedChatlogFolder = null;
      if (state._switchResourceTabFn) state._switchResourceTabFn("chatlogs");
    });
    subList.append(chatToolbar);

    // 批量操作工具栏
    if (state.cfmChatBatchMode) {
      const relevantSelected = Array.from(state.cfmChatBatchSelected).filter((k) =>
        k.startsWith(avatar + "::"),
      );
      const allSel = chats.every((c) => {
        const fn = c.file_name.replace(".jsonl", "");
        return state.cfmChatBatchSelected.has(`${avatar}::${fn}`);
      });
      const batchToolbar = $(`
        <div class="cfm-chat-batch-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-chat-batch-selall" title="全选/全不选">
            <i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}
          </button>
          <button class="cfm-btn cfm-btn-sm cfm-chat-batch-range ${state.cfmChatBatchRangeMode ? "cfm-range-active" : ""}" title="框选模式">
            <i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmChatBatchRangeMode ? "(开)" : ""}
          </button>
          <span class="cfm-chat-batch-count">${relevantSelected.length > 0 ? `已选 ${relevantSelected.length} 项` : ""}</span>
          <button class="cfm-btn cfm-btn-sm cfm-chat-batch-export" title="批量导出"><i class="fa-solid fa-file-export"></i> 导出</button>
          <button class="cfm-btn cfm-btn-sm cfm-chat-batch-delete" title="批量删除"><i class="fa-solid fa-trash-can"></i> 删除</button>
        </div>
      `);
      batchToolbar.find(".cfm-chat-batch-selall").on("click", (e) => {
        e.stopPropagation();
        if (allSel) {
          chats.forEach((c) => {
            const fn = c.file_name.replace(".jsonl", "");
            state.cfmChatBatchSelected.delete(`${avatar}::${fn}`);
          });
        } else {
          chats.forEach((c) => {
            const fn = c.file_name.replace(".jsonl", "");
            state.cfmChatBatchSelected.add(`${avatar}::${fn}`);
          });
        }
        rerenderCurrentView();
      });
      batchToolbar.find(".cfm-chat-batch-range").on("click", (e) => {
        e.stopPropagation();
        state.cfmChatBatchRangeMode = !state.cfmChatBatchRangeMode;
        if (state.cfmChatBatchRangeMode) state.cfmChatBatchLastClicked = null;
        rerenderCurrentView();
      });
      batchToolbar.find(".cfm-chat-batch-export").on("click", async (e) => {
        e.stopPropagation();
        const toExport = Array.from(state.cfmChatBatchSelected).filter((k) =>
          k.startsWith(avatar + "::"),
        );
        if (toExport.length === 0) {
          cfmToastr.warning("请先选择要导出的聊天记录");
          return;
        }
        if (toExport.length === 1) {
          // 单个直接导出
          const fn = toExport[0].split("::")[1];
          await exportChatFile(avatar, fn, "jsonl");
        } else {
          // 多个打包为 zip
          try {
            if (!window.JSZip) {
              await import("../../../../../../lib/jszip.min.js");
            }
            const zip = new JSZip();
            let success = 0;
            let processed = 0;
            const ctx = getContext();
            const batchProgress = showBatchProgressOverlay(
              "正在批量导出聊天记录",
              toExport.length,
            );
            for (const key of toExport) {
              const fn = key.split("::")[1];
              try {
                const body = {
                  is_group: false,
                  avatar_url: avatar,
                  file: `${fn}.jsonl`,
                  exportfilename: `${fn}.jsonl`,
                  format: "jsonl",
                };
                const response = await fetch("/api/chats/export", {
                  method: "POST",
                  body: JSON.stringify(body),
                  headers: ctx.getRequestHeaders(),
                });
                if (response.ok) {
                  const data = await response.json();
                  zip.file(`${fn}.jsonl`, data.result);
                  success++;
                }
              } catch (err) {
                console.warn("[CFM] 导出聊天记录失败:", fn, err);
              }
              processed++;
              batchProgress.update(processed);
            }
            if (success === 0) {
              batchProgress.remove();
              cfmToastr.error("没有成功导出任何聊天记录");
              return;
            }
            batchProgress.update(processed, "正在打包ZIP...");
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = "聊天记录.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            const exportMsg = `已导出 ${success} 条聊天记录到 聊天记录.zip`;
            batchProgress.done(exportMsg);
            cfmToastr.success(exportMsg);
          } catch (err) {
            console.error("[CFM] 批量导出聊天记录失败:", err);
            cfmToastr.error(`批量导出失败: ${err.message}`);
          }
        }
      });
      batchToolbar.find(".cfm-chat-batch-delete").on("click", async (e) => {
        e.stopPropagation();
        const toDelete = Array.from(state.cfmChatBatchSelected).filter((k) =>
          k.startsWith(avatar + "::"),
        );
        if (toDelete.length === 0) {
          cfmToastr.warning("请先选择要删除的聊天记录");
          return;
        }
        if (
          !cfmConfirm(
            `确定要删除选中的 ${toDelete.length} 条聊天记录吗？\n此操作不可撤销！`,
          )
        )
          return;
        let successCount = 0;
        let processed = 0;
        const batchProgress = showBatchProgressOverlay(
          "正在批量删除聊天记录",
          toDelete.length,
        );
        for (const key of toDelete) {
          const fn = key.split("::")[1];
          if (await deleteChatFile(avatar, fn)) successCount++;
          processed++;
          batchProgress.update(processed);
        }
        const delMsg = `已删除 ${successCount} 条聊天记录`;
        batchProgress.done(delMsg);
        cfmToastr.success(delMsg);
        rerenderCurrentView();
      });
      subList.append(batchToolbar);
    }

    for (const chat of chats) {
      const chatName = chat.file_name.replace(".jsonl", "");
      const isCurrentChat = chatName === currentChatName;
      const note = state.cfmChatNotes[chatName] || "";
      const batchKey = `${avatar}::${chatName}`;
      const isBatchSel = state.cfmChatBatchMode && state.cfmChatBatchSelected.has(batchKey);
      const msgCount = chat.chat_items || 0;
      const lastMes = chat.last_mes || "";
      const fileSize = chat.file_size || "";

      // 格式化日期
      let dateStr = "";
      try {
        const { timestampToMoment } = getContext();
        if (timestampToMoment && lastMes) {
          dateStr = timestampToMoment(lastMes).format("YYYY-MM-DD HH:mm");
        }
      } catch (e) {
        dateStr = lastMes;
      }

      const chatRow = $(`
        <div class="cfm-chat-row ${isCurrentChat ? "cfm-chat-current" : ""} ${isBatchSel ? "cfm-chat-batch-selected" : ""}" data-chat-name="${escapeHtml(chatName)}" data-avatar="${escapeHtml(avatar)}">
          ${state.cfmChatBatchMode ? `<div class="cfm-chat-batch-check"><i class="fa-${isBatchSel ? "solid" : "regular"} fa-square${isBatchSel ? "-check" : ""}"></i></div>` : ""}
          <div class="cfm-chat-row-icon"><i class="fa-solid fa-message${isCurrentChat ? " cfm-chat-icon-current" : ""}"></i></div>
          <div class="cfm-chat-row-info">
            <div class="cfm-chat-row-name">${escapeHtml(chatName)}${isCurrentChat ? ' <span class="cfm-chat-current-badge">当前</span>' : ""}</div>
            ${note ? `<div class="cfm-chat-row-note">${escapeHtml(note)}</div>` : ""}
            <div class="cfm-chat-row-meta">
              <span title="消息数">${msgCount} 条消息</span>
              <span title="文件大小">${fileSize}</span>
              ${dateStr ? `<span title="最后消息时间">${dateStr}</span>` : ""}
            </div>
          </div>
          <div class="cfm-chat-row-actions">
            <div class="cfm-chat-action-btn cfm-chat-pin-btn${isChatPinned(avatar, chatName) ? " cfm-chat-pinned" : ""}" title="${isChatPinned(avatar, chatName) ? "取消置顶" : "置顶到最近聊天"}"><i class="fa-solid fa-thumbtack"></i></div>
            <div class="cfm-chat-action-btn cfm-chat-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>
            <div class="cfm-chat-action-btn cfm-chat-note-btn" title="${note ? "编辑备注" : "添加备注"}"><i class="fa-solid fa-pen-to-square"></i></div>
            <div class="cfm-chat-action-btn cfm-chat-export-btn" title="导出"><i class="fa-solid fa-file-export"></i></div>
            <div class="cfm-chat-action-btn cfm-chat-delete-btn" title="删除"><i class="fa-solid fa-trash-can"></i></div>
          </div>
        </div>
      `);

      // 点击行：打开聊天 / 批量模式下切换选中（支持框选）
      chatRow.on("click", (e) => {
        if (
          $(e.target).closest(".cfm-chat-row-actions, .cfm-chat-batch-check")
            .length
        )
          return;
        if (state.cfmChatBatchMode) {
          toggleChatBatchItem(batchKey, e.shiftKey, chats, avatar);
          rerenderCurrentView();
          return;
        }
        openChatFile(avatar, chatName);
      });

      // 批量模式复选框（支持框选）
      chatRow.find(".cfm-chat-batch-check").on("click", (e) => {
        e.stopPropagation();
        toggleChatBatchItem(batchKey, e.shiftKey, chats, avatar);
        rerenderCurrentView();
      });

      // 置顶/取消置顶到最近聊天
      chatRow.find(".cfm-chat-pin-btn").on("click", (e) => {
        e.stopPropagation();
        const nowPinned = togglePinChat(avatar, chatName);
        const btn = $(e.currentTarget);
        if (nowPinned) {
          btn.addClass("cfm-chat-pinned").attr("title", "取消置顶");
        } else {
          btn.removeClass("cfm-chat-pinned").attr("title", "置顶到最近聊天");
        }
      });

      // 重命名
      chatRow.find(".cfm-chat-rename-btn").on("click", async (e) => {
        e.stopPropagation();
        const newName = await showChatRenamePopup(chatName);
        if (!newName || newName === chatName) return;
        if (await renameChatFile(avatar, chatName, newName)) {
          cfmToastr.success(`已重命名: ${chatName} → ${newName}`);
          rerenderCurrentView();
        } else {
          cfmToastr.error("重命名失败");
        }
      });

      // 备注
      chatRow.find(".cfm-chat-note-btn").on("click", async (e) => {
        e.stopPropagation();
        const currentNote = state.cfmChatNotes[chatName] || "";
        const newNote = await showChatNotePopup(chatName, currentNote);
        if (newNote === undefined) return; // 取消
        if (newNote === "") {
          delete state.cfmChatNotes[chatName];
        } else {
          state.cfmChatNotes[chatName] = newNote;
        }
        saveChatNotes();
        rerenderCurrentView();
      });

      // 导出
      chatRow.find(".cfm-chat-export-btn").on("click", async (e) => {
        e.stopPropagation();
        await exportChatFile(avatar, chatName, "jsonl");
      });

      // 删除
      chatRow.find(".cfm-chat-delete-btn").on("click", async (e) => {
        e.stopPropagation();
        if (
          !cfmConfirm(`确定要删除聊天记录「${chatName}」吗？\n此操作不可撤销！`)
        )
          return;
        if (await deleteChatFile(avatar, chatName)) {
          cfmToastr.success(`已删除: ${chatName}`);
          rerenderCurrentView();
        } else {
          cfmToastr.error("删除失败");
        }
      });

      subList.append(chatRow);
    }

    // 插入到角色行之后
    charRow.after(subList);
  }

  return { renderChatSubList, tryCollapseSublistFromOuterGap };
}
