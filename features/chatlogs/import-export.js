// 聊天记录导入导出层：承接聊天文件打开、删除、导出、批量打包导出与导入流程。

export function createChatlogImportExportApiCore(deps) {
  const {
    cfmConfirm,
    cfmToastr,
    closeMainPopup,
    document,
    fetch,
    getCharNameByAvatar,
    getCharacters,
    getChatlogTargetAvatar,
    getContext,
    importCharacterChatFunc,
    deleteCharacterChatByNameFunc,
    invalidateChatCache,
    openCharacterChatFunc,
    refreshActiveViewerStateAfterSelectionChange,
    rerenderCurrentView,
    saveChatNotes,
    showBatchProgressOverlay,
    showImportFailureDialog,
    state,
    URL,
    window,
  } = deps;

async function deleteChatFile(avatar, chatFileName) {
  const characters = getCharacters();
  const charIdx = characters.findIndex((c) => c.avatar === avatar);
  if (charIdx < 0) return false;
  try {
    // deleteCharacterChatByName 期望不带 .jsonl 扩展名的文件名
    const fileNameNoExt = chatFileName.replace(/\.jsonl$/i, "");
    let deleted = false;
    if (deleteCharacterChatByNameFunc) {
      try {
        await deleteCharacterChatByNameFunc(String(charIdx), fileNameNoExt);
        deleted = true;
      } catch (funcErr) {
        console.warn(
          "[CFM] deleteCharacterChatByName 抛出异常，回退到直接 API 调用:",
          funcErr,
        );
        // 回退到直接 API 调用
        const ctx = getContext();
        const response = await fetch("/api/chats/delete", {
          method: "POST",
          headers: ctx.getRequestHeaders(),
          body: JSON.stringify({
            chatfile: fileNameNoExt + ".jsonl",
            avatar_url: avatar,
          }),
        });
        if (!response.ok) return false;
        deleted = true;
      }
    } else {
      // 回退：直接调用 API（API 期望带 .jsonl 的完整文件名）
      const ctx = getContext();
      const response = await fetch("/api/chats/delete", {
        method: "POST",
        headers: ctx.getRequestHeaders(),
        body: JSON.stringify({
          chatfile: fileNameNoExt + ".jsonl",
          avatar_url: avatar,
        }),
      });
      if (!response.ok) return false;
      deleted = true;
    }
    if (deleted) {
      // 清理备注（备注 key 统一使用不带 .jsonl 的文件名）
      if (state.cfmChatNotes[fileNameNoExt]) {
        delete state.cfmChatNotes[fileNameNoExt];
        saveChatNotes();
      }
      // 从批量选中中移除
      state.cfmChatBatchSelected.delete(`${avatar}::${chatFileName}`);
      await invalidateChatCache(avatar);
    }
    return deleted;
  } catch (e) {
    console.error("[CFM] 删除聊天记录失败:", e);
    return false;
  }
}

/**
 * 导出聊天记录
 */
async function exportChatFile(avatar, chatFileName, format = "jsonl") {
  try {
    const ctx = getContext();
    const baseName = chatFileName.replace(/\.jsonl$/i, "");
    const body = {
      is_group: false,
      avatar_url: avatar,
      file: `${baseName}.jsonl`,
      exportfilename: `${baseName}.${format}`,
      format: format,
    };
    const response = await fetch("/api/chats/export", {
      method: "POST",
      body: JSON.stringify(body),
      headers: ctx.getRequestHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      cfmToastr.error(`导出失败: ${data.message}`);
      return false;
    }
    const mimeType =
      format === "txt" ? "text/plain" : "application/octet-stream";
    const download = (await import("../../../../../utils.js")).download;
    download(data.result, body.exportfilename, mimeType);
    cfmToastr.success(`已导出: ${baseName}.${format}`);
    return true;
  } catch (e) {
    console.error("[CFM] 导出聊天记录失败:", e);
    cfmToastr.error(`导出失败: ${e.message}`);
    return false;
  }
}

/**
 * 批量导出聊天记录（导出模式使用）
 * @param {string[]} chatFileNames - 聊天记录文件名列表
 */
async function exportChatlogFiles(chatFileNames) {
  const avatar = getChatlogTargetAvatar();
  if (!avatar) {
    cfmToastr.warning("请先选择一个角色");
    return;
  }
  if (chatFileNames.length === 1) {
    await exportChatFile(avatar, chatFileNames[0], "jsonl");
  } else {
    // 多个打包为 zip
    try {
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new window.JSZip();
      let success = 0;
      let processed = 0;
      const ctx = getContext();
      const batchProgress = showBatchProgressOverlay(
        "正在批量导出聊天记录",
        chatFileNames.length,
      );
      for (const fn of chatFileNames) {
        try {
          const baseName = fn.replace(/\.jsonl$/i, "");
          const body = {
            is_group: false,
            avatar_url: avatar,
            file: `${baseName}.jsonl`,
            exportfilename: `${baseName}.jsonl`,
            format: "jsonl",
          };
          const response = await fetch("/api/chats/export", {
            method: "POST",
            body: JSON.stringify(body),
            headers: ctx.getRequestHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            zip.file(`${baseName}.jsonl`, data.result);
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出聊天记录 ${fn} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何聊天记录");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      const charName = getCharNameByAvatar(avatar) || avatar;
      a.download = `${charName}_聊天记录.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportMsg = `已导出 ${success} 个聊天记录`;
      batchProgress.done(exportMsg);
      cfmToastr.success(exportMsg);
    } catch (e) {
      console.error("[CFM] 批量导出聊天记录失败:", e);
      cfmToastr.error(`导出失败: ${e.message}`);
    }
  }
}

/**
 * 打开聊天记录（选中角色并切换到对应聊天）
 */
async function openChatFile(avatar, chatFileName) {
  try {
    const characters = getCharacters();
    const charIdx = characters.findIndex((c) => c.avatar === avatar);
    if (charIdx < 0) return;
    const ctx = getContext();
    // openCharacterChat 期望不带 .jsonl 扩展名的文件名
    const fileNameNoExt = chatFileName.replace(/\.jsonl$/i, "");
    // 先选中角色
    if (ctx.selectCharacterById) {
      await ctx.selectCharacterById(charIdx);
      setTimeout(() => {
        refreshActiveViewerStateAfterSelectionChange({ character: true });
      }, 0);
    }
    // 然后打开指定聊天
    if (openCharacterChatFunc) {
      await openCharacterChatFunc(fileNameNoExt);
    } else if (ctx.openCharacterChat) {
      await ctx.openCharacterChat(fileNameNoExt);
    }
    closeMainPopup();
  } catch (e) {
    console.error("[CFM] 打开聊天记录失败:", e);
    cfmToastr.error("打开聊天记录失败");
  }
}


async function importChatFiles(avatar, files) {
  const characters = getCharacters();
  const char = characters.find((c) => c.avatar === avatar);
  if (!char) {
    cfmToastr.error("找不到对应角色");
    return;
  }
  const ctx = getContext();
  let successCount = 0;
  let failCount = 0;
  const failedFiles = [];
  let processed = 0;
  const batchProgress = showBatchProgressOverlay(
    "正在导入聊天记录",
    files.length,
  );
  for (const file of files) {
    try {
      const formData = new window.FormData();
      formData.append("avatar_url", avatar);
      formData.append("avatar", file);
      formData.append(
        "file_type",
        file.name.match(/\.jsonl$/i) ? "jsonl" : "json",
      );
      formData.append("character_name", char.name || "");
      formData.append("user_name", ctx.name1 || "User");
      if (importCharacterChatFunc) {
        const result = await importCharacterChatFunc(formData, {
          refresh: false,
        });
        if (result && result.length > 0) {
          successCount++;
        } else {
          failCount++;
          failedFiles.push(file.name);
        }
      } else {
        const response = await fetch("/api/chats/import", {
          method: "POST",
          body: formData,
          headers: ctx.getRequestHeaders({ omitContentType: true }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.res) {
            successCount++;
          } else {
            failCount++;
            failedFiles.push(file.name);
          }
        } else {
          failCount++;
          failedFiles.push(file.name);
        }
      }
    } catch (e) {
      console.error("[CFM] 导入聊天记录失败:", e);
      failCount++;
      failedFiles.push(file.name);
    }
    processed++;
    batchProgress.update(processed);
  }
  await invalidateChatCache(avatar);
  const importMsg = `成功导入 ${successCount} 个聊天记录${failCount > 0 ? `，${failCount} 个失败` : ""}`;
  if (successCount > 0) {
    batchProgress.done(importMsg);
    cfmToastr.success(importMsg);
  } else {
    batchProgress.remove();
    cfmToastr.error("导入失败");
  }
  if (failedFiles.length > 0) {
    showImportFailureDialog(failedFiles, "聊天记录");
  }
  rerenderCurrentView();
}


  return {
    deleteChatFile,
    exportChatFile,
    exportChatlogFiles,
    openChatFile,
    importChatFiles,
  };
}
