// 插件内备份导出层：承接 buildExportData 与 executeExport，将文件夹树、分组、收藏、备注、绑定与资源域设置导出为 JSON。
// 资源导出执行层：承接资源页导出模式确认后的资源类型分发与统一错误处理。

export async function executeResourceExportCore(deps) {
  if (deps.getExportSelectedSize() === 0) {
    deps.toastr.warning("请先选择要导出的资源");
    return;
  }

  const selected = deps.getExportSelectedItems();
  const headers = deps.getRequestHeaders();

  try {
    if (deps.currentResourceType === "chars") {
      await deps.exportCharacters(selected, headers);
    } else if (deps.currentResourceType === "presets") {
      await deps.exportPresets(selected, headers);
    } else if (deps.currentResourceType === "themes") {
      await deps.exportThemes(selected, headers);
    } else if (deps.currentResourceType === "backgrounds") {
      await deps.exportBackgrounds(selected, headers);
    } else if (deps.currentResourceType === "personas") {
      await deps.exportPersonas(selected, headers);
    } else if (deps.currentResourceType === "regex") {
      await deps.exportRegexScripts(selected);
    } else if (deps.currentResourceType === "quickreply") {
      await deps.exportQuickReplySets(selected);
    } else if (deps.currentResourceType === "chatlogs") {
      await deps.exportChatlogFiles(selected);
    } else {
      await deps.exportWorldInfos(selected, headers);
    }
  } catch (err) {
    deps.logExportError(err);
    deps.toastr.error("导出失败: " + err.message);
  }

  deps.exitExportMode();
}

/**
 * 资源导出/导入业务工厂：承接各资源类型（角色卡/预设/快速回复集/世界书/主题/背景/User）的导出执行函数，
 * 以及 User/Persona 导入执行函数。不直接访问 index.js 闭包，通过 deps 注入依赖。
 * @param {Object} deps
 * @returns {{
 *   exportCharacters: Function,
 *   exportPresets: Function,
 *   exportQuickReplySets: Function,
 *   exportWorldInfos: Function,
 *   exportThemes: Function,
 *   exportBackgrounds: Function,
 *   exportPersonas: Function,
 *   importPersonas: Function,
 * }}
 */
export function createResourceExportApi(deps) {
  const {
    getContext,
    cfmToastr,
    showBatchProgressOverlay,
    getResourceGroups,
    renderPersonasView,
  } = deps;

  // 角色卡导出
  async function exportCharacters(avatars, headers) {
    if (avatars.length === 1) {
      // 单个角色卡直接下载
      const resp = await fetch("/api/characters/export", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ format: "png", avatar_url: avatars[0] }),
      });
      if (!resp.ok) throw new Error("导出角色卡失败");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = avatars[0];
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      cfmToastr.success("角色卡已导出");
    } else {
      // 多个角色卡打包zip
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在导出角色卡",
        avatars.length,
      );
      let processed = 0;
      for (const avatar of avatars) {
        try {
          const resp = await fetch("/api/characters/export", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ format: "png", avatar_url: avatar }),
          });
          if (resp.ok) {
            const blob = await resp.blob();
            zip.file(avatar, blob);
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出角色卡 ${avatar} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何角色卡");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "角色卡.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportCharMsg = `已导出 ${success} 个角色卡`;
      batchProgress.done(exportCharMsg);
      cfmToastr.success(exportCharMsg);
    }
  }

  // 预设导出
  async function exportPresets(presetNames, headers) {
    const pm = getContext().getPresetManager();
    if (!pm) throw new Error("预设管理器不可用");

    // 获取预设数据：优先用 getCompletionPresetByName 按名称查找实际预设数据
    function getPresetData(name) {
      // 先尝试按名称从预设列表中查找
      if (typeof pm.getCompletionPresetByName === "function") {
        const preset = pm.getCompletionPresetByName(name);
        if (preset) {
          const result = structuredClone(preset);
          result.name = name;
          return result;
        }
      }
      // 回退：通过 getPresetList 手动查找
      if (typeof pm.getPresetList === "function") {
        const { presets, preset_names } = pm.getPresetList.call(pm);
        let found;
        if (Array.isArray(preset_names)) {
          const idx = preset_names.indexOf(name);
          if (idx >= 0) found = presets[idx];
        } else if (preset_names && typeof preset_names === "object") {
          if (preset_names[name] !== undefined)
            found = presets[preset_names[name]];
        }
        if (found) {
          const result = structuredClone(found);
          result.name = name;
          return result;
        }
      }
      return null;
    }

    if (presetNames.length === 1) {
      const preset = getPresetData(presetNames[0]);
      if (!preset) throw new Error(`找不到预设: ${presetNames[0]}`);
      const data = JSON.stringify(preset, null, 4);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${presetNames[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      cfmToastr.success("预设已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在导出预设",
        presetNames.length,
      );
      let processed = 0;
      for (const name of presetNames) {
        try {
          const preset = getPresetData(name);
          if (preset) {
            const data = JSON.stringify(preset, null, 4);
            zip.file(`${name}.json`, data);
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出预设 ${name} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何预设");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "预设.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportPresetMsg = `已导出 ${success} 个预设`;
      batchProgress.done(exportPresetMsg);
      cfmToastr.success(exportPresetMsg);
    }
  }

  // 快速回复集导出
  async function exportQuickReplySets(setNames) {
    const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
    const QRS = typeof globalThis !== "undefined" && globalThis.QuickReplySet;

    function getSetData(name) {
      // 优先使用 API
      if (api && api.getSetByName) {
        const set = api.getSetByName(name);
        if (set) return JSON.parse(JSON.stringify(set));
      }
      // 后备：QuickReplySet.list
      if (QRS && QRS.list) {
        const set = QRS.list.find((s) => s.name === name);
        if (set) return JSON.parse(JSON.stringify(set));
      }
      return null;
    }

    if (setNames.length === 1) {
      const data = getSetData(setNames[0]);
      if (!data) throw new Error(`无法获取快速回复集: ${setNames[0]}`);
      const jsonStr = JSON.stringify(data, null, 4);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${setNames[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      cfmToastr.success("快速回复集已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在导出快速回复集",
        setNames.length,
      );
      let processed = 0;
      for (const name of setNames) {
        try {
          const data = getSetData(name);
          if (data) {
            const jsonStr = JSON.stringify(data, null, 4);
            zip.file(`${name}.json`, jsonStr);
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出快速回复集 ${name} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何快速回复集");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "快速回复集.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportQrMsg = `已导出 ${success} 个快速回复集`;
      batchProgress.done(exportQrMsg);
      cfmToastr.success(exportQrMsg);
    }
  }

  // 世界书导出
  async function exportWorldInfos(wiNames, headers) {
    if (wiNames.length === 1) {
      const resp = await fetch("/api/worldinfo/get", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ name: wiNames[0] }),
        cache: "no-cache",
      });
      if (!resp.ok) throw new Error("获取世界书数据失败");
      const data = await resp.json();
      const jsonStr = JSON.stringify(data, null, 4);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${wiNames[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      cfmToastr.success("世界书已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在导出世界书",
        wiNames.length,
      );
      let processed = 0;
      for (const name of wiNames) {
        try {
          const resp = await fetch("/api/worldinfo/get", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: name }),
            cache: "no-cache",
          });
          if (resp.ok) {
            const data = await resp.json();
            const jsonStr = JSON.stringify(data, null, 4);
            zip.file(`${name}.json`, jsonStr);
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出世界书 ${name} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何世界书");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "世界书.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportWiMsg = `已导出 ${success} 个世界书`;
      batchProgress.done(exportWiMsg);
      cfmToastr.success(exportWiMsg);
    }
  }

  // 主题导出
  async function exportThemes(themeNameList, headers) {
    // 通过 POST /api/settings/get 获取完整主题数据（themes 变量是 power-user.js 模块私有的，无法直接访问）
    let allThemes = [];
    try {
      const resp = await fetch("/api/settings/get", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const data = await resp.json();
        allThemes = data.themes || [];
      }
    } catch (e) {
      console.warn("[CFM] 获取主题数据失败", e);
    }
    function getThemeData(name) {
      const t = allThemes.find(
        (th) => (typeof th === "object" ? th.name : th) === name,
      );
      if (t && typeof t === "object") return structuredClone(t);
      return null;
    }
    if (themeNameList.length === 1) {
      const themeData = getThemeData(themeNameList[0]);
      if (!themeData) throw new Error(`找不到主题: ${themeNameList[0]}`);
      const jsonStr = JSON.stringify(themeData, null, 4);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${themeNameList[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      cfmToastr.success("主题已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在导出主题",
        themeNameList.length,
      );
      let processed = 0;
      for (const name of themeNameList) {
        try {
          const td = getThemeData(name);
          if (td) {
            zip.file(`${name}.json`, JSON.stringify(td, null, 4));
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出主题 ${name} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何主题");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "主题.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportThemeMsg = `已导出 ${success} 个主题`;
      batchProgress.done(exportThemeMsg);
      cfmToastr.success(exportThemeMsg);
    }
  }

  // 背景导出
  async function exportBackgrounds(bgNames, headers) {
    if (bgNames.length === 1) {
      const url = `/backgrounds/${encodeURIComponent(bgNames[0])}`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = bgNames[0];
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        cfmToastr.success("背景已导出");
      } catch (e) {
        throw new Error(`导出背景失败: ${e.message}`);
      }
    } else {
      if (!window.JSZip) {
        await import("../../../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      const batchProgress = showBatchProgressOverlay(
        "正在导出背景",
        bgNames.length,
      );
      let processed = 0;
      for (const name of bgNames) {
        try {
          const resp = await fetch(`/backgrounds/${encodeURIComponent(name)}`);
          if (resp.ok) {
            const blob = await resp.blob();
            zip.file(name, blob);
            success++;
          }
        } catch (e) {
          console.warn(`[CFM] 导出背景 ${name} 失败`, e);
        }
        processed++;
        batchProgress.update(processed);
      }
      if (success === 0) {
        batchProgress.remove();
        throw new Error("没有成功导出任何背景");
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "背景.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      const exportBgMsg = `已导出 ${success} 个背景`;
      batchProgress.done(exportBgMsg);
      cfmToastr.success(exportBgMsg);
    }
  }

  // User/Persona导出（酒馆原生 Backup 格式 JSON）
  async function exportPersonas(avatarIds, headers) {
    const pu = getContext().powerUserSettings;
    if (!pu) throw new Error("无法获取 powerUserSettings");
    const exportData = {
      personas: {},
      persona_descriptions: {},
      default_persona: pu.default_persona || null,
    };
    for (const avatarId of avatarIds) {
      // personas: avatarId -> displayName
      if (pu.personas && pu.personas[avatarId] !== undefined) {
        exportData.personas[avatarId] = pu.personas[avatarId];
      } else {
        exportData.personas[avatarId] = avatarId;
      }
      // persona_descriptions: avatarId -> description object
      if (pu.persona_descriptions && pu.persona_descriptions[avatarId]) {
        exportData.persona_descriptions[avatarId] =
          pu.persona_descriptions[avatarId];
      }
    }
    // 如果 default_persona 不在导出列表中，设为 null
    if (
      exportData.default_persona &&
      !avatarIds.includes(exportData.default_persona)
    ) {
      exportData.default_persona = null;
    }
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const fileName = `personas_${dateStr}.json`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    cfmToastr.success(`已导出 ${avatarIds.length} 个 Persona 数据`);
  }

  // User/Persona导入（酒馆原生 Backup 格式 JSON）
  async function importPersonas(file, targetFolder) {
    if (!file) return;
    let data;
    try {
      const text = await file.text();
      data = JSON.parse(text);
    } catch (e) {
      cfmToastr.warning("无法解析文件，请选择有效的 JSON 文件");
      return;
    }
    if (
      !data.personas ||
      !data.persona_descriptions ||
      typeof data.personas !== "object" ||
      typeof data.persona_descriptions !== "object"
    ) {
      cfmToastr.warning("无效的 Persona 备份文件格式");
      return;
    }
    const pu = getContext().powerUserSettings;
    if (!pu) {
      cfmToastr.error("无法获取用户设置");
      return;
    }
    // 获取当前服务器上已存在的头像列表
    let avatarsList = [];
    try {
      const resp = await fetch("/api/avatars/get", {
        method: "POST",
        headers: getContext().getRequestHeaders({ omitContentType: true }),
      });
      if (resp.ok) avatarsList = await resp.json();
    } catch (e) {
      console.error("[CFM] 获取头像列表失败", e);
    }
    if (!Array.isArray(avatarsList)) avatarsList = [];

    const warnings = [];
    let importedCount = 0;
    const importedAvatarIds = [];

    // 确保 pu.personas 和 pu.persona_descriptions 存在
    if (!pu.personas) pu.personas = {};
    if (!pu.persona_descriptions) pu.persona_descriptions = {};

    const personaEntries = Object.entries(data.personas);
    const batchProgress = showBatchProgressOverlay(
      "正在导入User",
      personaEntries.length,
    );
    let processed = 0;

    // 合并 personas
    for (const [key, value] of personaEntries) {
      const existsInSettings = key in pu.personas;
      const existsOnServer = avatarsList.includes(key);

      if (existsInSettings && existsOnServer) {
        // 设置和头像文件都存在，真正的重复，跳过
        warnings.push(`Persona "${key}" (${value}) 已存在，跳过`);
        continue;
      }

      if (existsInSettings && !existsOnServer) {
        // 设置残留但头像已删除，视为需要重新导入
        warnings.push(
          `Persona "${key}" (${value}) 设置残留但头像已删除，重新导入`,
        );
      }

      pu.personas[key] = value;
      importedAvatarIds.push(key);
      importedCount++;

      // 如果头像文件不存在，上传默认头像
      if (!existsOnServer) {
        warnings.push(
          `Persona 头像 "${key}" (${value}) 不存在于服务器，上传默认头像`,
        );
        try {
          // 使用酒馆原生路径 img/user-default.png
          const defaultAvatarResp = await fetch("img/user-default.png");
          if (defaultAvatarResp.ok) {
            const blob = await defaultAvatarResp.blob();
            const file = new File([blob], "avatar.png", { type: "image/png" });
            const formData = new FormData();
            formData.append("avatar", file);
            formData.append("overwrite_name", key);
            const uploadResp = await fetch("/api/avatars/upload", {
              method: "POST",
              headers: getContext().getRequestHeaders({
                omitContentType: true,
              }),
              body: formData,
            });
            if (!uploadResp.ok) {
              console.error(
                `[CFM] 上传默认头像失败 (${key}): ${uploadResp.statusText}`,
              );
            }
          } else {
            console.error(
              `[CFM] 获取默认头像失败: ${defaultAvatarResp.statusText}`,
            );
          }
        } catch (uploadErr) {
          console.error(`[CFM] 上传默认头像失败 (${key}):`, uploadErr);
        }
      }
      processed++;
      batchProgress.update(processed);
    }

    // 合并 persona_descriptions
    for (const [key, value] of Object.entries(data.persona_descriptions)) {
      // 只有当设置和头像都存在时才视为真正已存在，跳过描述
      const descExists = key in pu.persona_descriptions;
      const avatarExists = avatarsList.includes(key);
      if (descExists && avatarExists) {
        warnings.push(
          `Persona 描述 "${key}" (${pu.personas[key] || key}) 已存在，跳过`,
        );
        continue;
      }
      if (!pu.personas[key]) {
        warnings.push(`Persona "${key}" 不存在，跳过其描述`);
        continue;
      }
      pu.persona_descriptions[key] = value;
    }

    // 处理 default_persona
    if (data.default_persona && data.default_persona in pu.personas) {
      // 不自动覆盖默认 persona，只在当前没有默认时设置
      if (!pu.default_persona) {
        pu.default_persona = data.default_persona;
      }
    }

    // 将导入的 persona 分配到目标文件夹
    if (targetFolder && importedAvatarIds.length > 0) {
      const groups = getResourceGroups("personas");
      for (const avatarId of importedAvatarIds) {
        groups[avatarId] = targetFolder;
      }
    }

    // 保存设置
    getContext().saveSettingsDebounced();

    if (warnings.length) {
      const importPersonaMsg = `已导入 ${importedCount} 个 Persona（有 ${warnings.length} 条警告）`;
      batchProgress.done(importPersonaMsg);
      cfmToastr.success(importPersonaMsg);
      console.warn(
        `[CFM] PERSONA 导入报告\n====================\n${warnings.join("\n")}`,
      );
    } else if (importedCount > 0) {
      const importPersonaMsg = `已成功导入 ${importedCount} 个 Persona`;
      batchProgress.done(importPersonaMsg);
      cfmToastr.success(importPersonaMsg);
    } else {
      batchProgress.done("没有新的 Persona 需要导入");
      cfmToastr.info("没有新的 Persona 需要导入（全部已存在）");
    }

    // 刷新酒馆原生 persona 面板
    try {
      const personaModule = await import("../../../../../personas.js");
      if (typeof personaModule.getUserAvatars === "function") {
        await personaModule.getUserAvatars(true);
      }
    } catch (e) {
      console.warn("[CFM] 无法刷新酒馆原生User面板，可能需要手动刷新", e);
    }

    // 刷新 persona 视图
    await renderPersonasView();
  }

  return {
    exportCharacters,
    exportPresets,
    exportQuickReplySets,
    exportWorldInfos,
    exportThemes,
    exportBackgrounds,
    exportPersonas,
    importPersonas,
  };
}
