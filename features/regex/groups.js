// 正则资源分组与数据层：承接全局 Regex 脚本列表读写、regexGlobalGroups 分组分配、导入导出时按脚本名恢复分组、重命名或删除脚本后的分组引用清理，以及互通转移所需的纯数据辅助函数（脚本获取、克隆、删除、插入、保存到各作用域）。

export function createRegexGroupsApiCore(deps) {
  const {
    cfmToastr,
    console,
    ensureResourceSettings,
    extensionName,
    extension_settings,
    getCharacters,
    getContext,
    getPresetRegexScriptsByName,
    getResFavorites,
    renderRegexView,
    saveCharRegexScripts,
    savePresetRegexScripts,
    showBatchProgressOverlay,
    syncNativeRegexState,
  } = deps;

  function getRegexGlobalScripts() {
    return extension_settings.regex ?? [];
  }

  function getRegexTransferGlobalFolderOptions() {
    ensureResourceSettings();
    const folderTree = extension_settings[extensionName].regexFolderTree || {};
    const options = Object.keys(folderTree)
      .map((id) => {
        const pathNames = [];
        let currentId = id;
        while (currentId && folderTree[currentId]) {
          pathNames.unshift(folderTree[currentId].displayName || currentId);
          currentId = folderTree[currentId].parentId;
        }
        return {
          value: id,
          label: pathNames.join(" › ") || id,
          sortOrder: folderTree[id]?.sortOrder ?? 0,
        };
      })
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.label.localeCompare(b.label, "zh-CN");
      });
    return [{ value: "__ungrouped__", label: "未归类" }, ...options];
  }

  function getRegexTransferGlobalFolderLabel(folderId) {
    if (!folderId || folderId === "__ungrouped__") return "未归类";
    ensureResourceSettings();
    const folderTree = extension_settings[extensionName].regexFolderTree || {};
    if (!folderTree[folderId]) return "未归类";
    const pathNames = [];
    let currentId = folderId;
    while (currentId && folderTree[currentId]) {
      pathNames.unshift(folderTree[currentId].displayName || currentId);
      currentId = folderTree[currentId].parentId;
    }
    return pathNames.join(" › ") || "未归类";
  }

  function getRegexTransferScopeLabel(scope) {
    if (!scope) return "目标位置";
    if (scope.type === "global") {
      return `全局正则（${getRegexTransferGlobalFolderLabel(scope.folderId)}）`;
    }
    if (scope.type === "char") {
      return `角色正则（${scope.name || "当前角色"}）`;
    }
    if (scope.type === "preset") {
      return `预设正则（${scope.name || "当前预设"}）`;
    }
    return "目标位置";
  }

  function getRegexScriptsForScope(scope) {
    if (!scope) return [];
    if (Array.isArray(scope.scripts)) return scope.scripts;
    if (scope.type === "global") return getRegexGlobalScripts();
    if (scope.type === "char") {
      const chars = getCharacters();
      const ch = chars.find((item) => item.avatar === scope.avatar);
      return Array.isArray(ch?.data?.extensions?.regex_scripts)
        ? ch.data.extensions.regex_scripts
        : [];
    }
    if (scope.type === "preset") {
      return getPresetRegexScriptsByName(scope.name);
    }
    return [];
  }

  function isSameRegexScopeList(sourceScope, targetScope) {
    if (!sourceScope || !targetScope) return false;
    if (sourceScope.type !== targetScope.type) return false;
    if (sourceScope.type === "global") return true;
    if (sourceScope.type === "char") {
      return sourceScope.avatar && sourceScope.avatar === targetScope.avatar;
    }
    if (sourceScope.type === "preset") {
      return sourceScope.name && sourceScope.name === targetScope.name;
    }
    return false;
  }

  function cloneRegexScriptsForTransfer(scripts, isCopyMode) {
    const sourceScripts = Array.isArray(scripts) ? scripts : [];
    return sourceScripts.map((script) => ({
      ...script,
      id: String(isCopyMode || !script?.id ? getContext().uuidv4() : script.id),
    }));
  }

  function removeRegexScriptsByIds(scripts, idSet) {
    const sourceScripts = Array.isArray(scripts) ? scripts : [];
    return sourceScripts.filter((script) => !idSet.has(script?.id));
  }

  function insertRegexScriptsAtIndex(baseScripts, insertedScripts, targetIndex) {
    const currentScripts = Array.isArray(baseScripts) ? [...baseScripts] : [];
    const scriptsToInsert = Array.isArray(insertedScripts)
      ? insertedScripts
      : [];
    const normalizedIndex = Math.max(
      0,
      Math.min(Number(targetIndex) || 0, currentScripts.length),
    );
    return [
      ...currentScripts.slice(0, normalizedIndex),
      ...scriptsToInsert,
      ...currentScripts.slice(normalizedIndex),
    ];
  }

  async function saveRegexScopeScripts(scope, scripts, extra = {}) {
    if (!scope) return;
    if (scope.type === "global") {
      ensureResourceSettings();
      extension_settings.regex = Array.isArray(scripts) ? scripts : [];
      if (extra.globalGroups) {
        extension_settings[extensionName].regexGlobalGroups =
          extra.globalGroups;
      }
      if (extra.globalFavorites) {
        extension_settings[extensionName].regexFavorites =
          extra.globalFavorites;
      }
      getContext().saveSettingsDebounced();
      await syncNativeRegexState();
      return;
    }
    if (scope.type === "char") {
      await saveCharRegexScripts(scope.avatar, scripts);
      return;
    }
    if (scope.type === "preset") {
      await savePresetRegexScripts(scripts, scope.name);
    }
  }

  async function importRegexScripts(files, targetFolder) {
    if (!files || files.length === 0) return;
    const globalScripts = extension_settings.regex;
    if (!Array.isArray(globalScripts)) {
      cfmToastr.error("无法访问全局正则脚本列表");
      return;
    }
    let importedCount = 0;
    const warnings = [];

    const batchProgress = showBatchProgressOverlay(
      "正在导入正则脚本",
      files.length,
    );
    let processed = 0;

    for (const file of files) {
      let parsed;
      try {
        const text = await file.text();
        parsed = JSON.parse(text);
      } catch (e) {
        cfmToastr.warning(
          `无法解析文件 "${file.name}"，请选择有效的 JSON 文件`,
        );
        processed++;
        batchProgress.update(processed);
        continue;
      }
      const toImport = Array.isArray(parsed) ? parsed : [parsed];
      for (const regexScript of toImport) {
        if (!regexScript.scriptName) {
          warnings.push(`跳过无名称的正则脚本（来自 ${file.name}）`);
          continue;
        }
        // 生成新 ID 防止冲突
        regexScript.id = getContext().uuidv4();
        globalScripts.push(regexScript);
        // 分配到目标文件夹
        if (targetFolder) {
          const globalGroups =
            extension_settings[extensionName].regexGlobalGroups;
          globalGroups[regexScript.id] = targetFolder;
        }
        importedCount++;
      }
      processed++;
      batchProgress.update(processed);
    }
    if (importedCount > 0) {
      getContext().saveSettingsDebounced();
      // 同步原生正则引擎面板，确保导入的脚本立即出现在原生 UI 中
      await syncNativeRegexState();
      let importRegexMsg;
      if (warnings.length > 0) {
        importRegexMsg = `已导入 ${importedCount} 个正则脚本（有 ${warnings.length} 条警告）`;
        console.warn(`[CFM] 正则导入报告\n${warnings.join("\n")}`);
      } else {
        importRegexMsg = `已导入 ${importedCount} 个正则脚本`;
      }
      batchProgress.done(importRegexMsg);
      cfmToastr.success(importRegexMsg);
    } else {
      batchProgress.done("没有成功导入任何正则脚本");
      cfmToastr.warning("没有成功导入任何正则脚本");
    }
    renderRegexView();
  }

  async function exportRegexScripts(scriptIds) {
    const globalScripts = extension_settings.regex ?? [];
    const toExport = globalScripts.filter(
      (s) => s.id && scriptIds.includes(s.id),
    );
    if (toExport.length === 0) {
      cfmToastr.warning("未找到选中的正则脚本");
      return;
    }
    try {
      const download = (await import("../../../../../utils.js")).download;
      if (toExport.length === 1) {
        const fileName = `regex-${(toExport[0].scriptName || "unnamed").replace(/[^\w\-_.]/g, "_")}.json`;
        download(
          JSON.stringify(toExport[0], null, 4),
          fileName,
          "application/json",
        );
      } else {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const fileName = `regex_${dateStr}.json`;
        download(
          JSON.stringify(toExport, null, 4),
          fileName,
          "application/json",
        );
      }
      cfmToastr.success(`已导出 ${toExport.length} 个正则脚本`);
    } catch (err) {
      console.error("[CFM] 正则导出失败:", err);
      cfmToastr.error("导出失败: " + err.message);
    }
  }

  return {
    getRegexGlobalScripts,
    getRegexTransferGlobalFolderOptions,
    getRegexTransferGlobalFolderLabel,
    getRegexTransferScopeLabel,
    getRegexScriptsForScope,
    isSameRegexScopeList,
    cloneRegexScriptsForTransfer,
    removeRegexScriptsByIds,
    insertRegexScriptsAtIndex,
    saveRegexScopeScripts,
    importRegexScripts,
    exportRegexScripts,
  };
}
