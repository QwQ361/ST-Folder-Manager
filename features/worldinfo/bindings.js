// 世界书绑定功能文件：负责世界书分组与角色、聊天、预设之间的绑定关系维护、绑定摘要生成、绑定切换与解绑逻辑，是自动应用判定所依赖的关系层模块。

export function getCurrentCharAvatarCore(deps) {
  try {
    const ctx = deps.getContext();
    const charId = ctx.characterId;
    if (charId === undefined || charId === null) return null;
    const characters = ctx.characters || deps.getCharacters();
    const ch = characters[charId];
    return ch ? ch.avatar : null;
  } catch (e) {
    return null;
  }
}

export function getCurrentCharNameCore(deps) {
  try {
    const ctx = deps.getContext();
    const charId = ctx.characterId;
    if (charId === undefined || charId === null) return null;
    const characters = ctx.characters || deps.getCharacters();
    const ch = characters[charId];
    return ch ? ch.name : null;
  } catch (e) {
    return null;
  }
}

export function getCurrentChatFileNameCore(deps) {
  try {
    const ctx = deps.getContext();
    const charId = ctx.characterId;
    if (charId === undefined || charId === null) return null;
    const characters = ctx.characters || deps.getCharacters();
    const ch = characters[charId];
    return ch && typeof ch.chat === "string" && ch.chat ? ch.chat : null;
  } catch (e) {
    return null;
  }
}

export function getCurrentChatBindKeyCore(deps) {
  const avatar = deps.getCurrentCharAvatar();
  const chatFileName = deps.getCurrentChatFileName();
  if (!avatar || !chatFileName) return null;
  return `${avatar}::${chatFileName}`;
}

export function makeChatBindKeyCore(charAvatar, chatFileName) {
  if (!charAvatar || !chatFileName) return null;
  return `${charAvatar}::${chatFileName}`;
}

export function parseChatBindKeyCore(bindKey) {
  const raw = String(bindKey || "");
  const sepIdx = raw.indexOf("::");
  if (sepIdx === -1) return { avatar: "", chatFileName: raw };
  return {
    avatar: raw.slice(0, sepIdx),
    chatFileName: raw.slice(sepIdx + 2),
  };
}

export function setWiPresetScopeCore(presetIdx, scope, deps) {
  const presets = deps.getWiActivePresets();
  if (presets[presetIdx]) {
    presets[presetIdx].scope = scope;
    if (scope === "global") {
      presets[presetIdx].bindChars = [];
      presets[presetIdx].bindPresets = [];
      presets[presetIdx].bindChats = [];
    }
    deps.saveSettingsDebounced();
  }
}

export function bindWiPresetToCharCore(presetIdx, charAvatar, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets[presetIdx];
  if (!p) return;
  if (!Array.isArray(p.bindChars)) p.bindChars = [];
  if (!p.bindChars.includes(charAvatar)) {
    p.bindChars.push(charAvatar);
    deps.saveSettingsDebounced();
  }
}

export function bindWiPresetToChatCore(presetIdx, charAvatar, chatFileName, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets[presetIdx];
  const bindKey = deps.makeChatBindKey(charAvatar, chatFileName);
  if (!p || !bindKey) return;
  if (!Array.isArray(p.bindChats)) p.bindChats = [];
  if (!p.bindChats.includes(bindKey)) {
    p.bindChats.push(bindKey);
    deps.saveSettingsDebounced();
  }
}

export function bindWiPresetToPresetCore(presetIdx, presetName, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets[presetIdx];
  if (!p) return;
  if (!Array.isArray(p.bindPresets)) p.bindPresets = [];
  if (!p.bindPresets.includes(presetName)) {
    p.bindPresets.push(presetName);
    deps.saveSettingsDebounced();
  }
}

export function unbindWiPresetFromCharCore(presetIdx, charAvatar, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets[presetIdx];
  if (!p || !Array.isArray(p.bindChars)) return;
  const idx = p.bindChars.indexOf(charAvatar);
  if (idx !== -1) {
    p.bindChars.splice(idx, 1);
    deps.saveSettingsDebounced();
  }
}

export function unbindWiPresetFromChatCore(presetIdx, bindKey, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets[presetIdx];
  if (!p || !Array.isArray(p.bindChats)) return;
  const idx = p.bindChats.indexOf(bindKey);
  if (idx !== -1) {
    p.bindChats.splice(idx, 1);
    deps.saveSettingsDebounced();
  }
}

export function unbindWiPresetFromPresetCore(presetIdx, presetName, deps) {
  const presets = deps.getWiActivePresets();
  const p = presets[presetIdx];
  if (!p || !Array.isArray(p.bindPresets)) return;
  const idx = p.bindPresets.indexOf(presetName);
  if (idx !== -1) {
    p.bindPresets.splice(idx, 1);
    deps.saveSettingsDebounced();
  }
}

export function getWiPresetBindSummaryCore(preset, deps) {
  if (preset.scope === "global") return "全局";
  const parts = [];
  if (preset.bindChars && preset.bindChars.length > 0) {
    const chars = deps.getCharacters();
    const names = preset.bindChars.map((av) => {
      const ch = chars.find((c) => c.avatar === av);
      return ch ? ch.name : av;
    });
    parts.push(`角色: ${names.join(", ")}`);
  }
  if (preset.bindPresets && preset.bindPresets.length > 0) {
    parts.push(`预设: ${preset.bindPresets.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "未绑定";
}
