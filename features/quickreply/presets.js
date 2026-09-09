// 快速回复集激活预设层：承接 QR Set 激活分组的读取、保存、删除、重命名与引用同步；重命名 quickreply 资源时，本层负责维护激活预设中的 sets 列表一致性。

import { cloneBackupBridgeJsonValue } from "../../bridge/clone.js";

export async function saveBackupBridgeQuickReplySet(setData) {
  const normalizedData =
    setData && typeof setData === "object"
      ? cloneBackupBridgeJsonValue(setData)
      : {};
  const setName = String(normalizedData.name || "").trim();
  if (!setName) {
    throw new Error("快速回复集缺少名称");
  }

  const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
  const QRS = typeof globalThis !== "undefined" && globalThis.QuickReplySet;
  const existingSet =
    (api && typeof api.getSetByName === "function"
      ? api.getSetByName(setName)
      : null) ||
    (QRS && Array.isArray(QRS.list)
      ? QRS.list.find((entry) => entry?.name === setName)
      : null);

  const syncLiveSet = (target) => {
    if (!target) return;
    target.name = setName;
    target.qrList = Array.isArray(normalizedData.qrList)
      ? cloneBackupBridgeJsonValue(normalizedData.qrList)
      : [];
    if ("disableSend" in normalizedData) {
      target.disableSend = !!normalizedData.disableSend;
    }
    if ("placeBeforeInput" in normalizedData) {
      target.placeBeforeInput = !!normalizedData.placeBeforeInput;
    }
    if ("injectInput" in normalizedData) {
      target.injectInput = !!normalizedData.injectInput;
    }
  };

  if (existingSet) {
    syncLiveSet(existingSet);
    if (typeof existingSet.save === "function") {
      await existingSet.save();
      return;
    }
    if (typeof existingSet.performSave === "function") {
      await existingSet.performSave();
      return;
    }
  } else if (api && typeof api.createSet === "function") {
    try {
      await api.createSet(setName, {
        disableSend: !!normalizedData.disableSend,
        placeBeforeInput: !!normalizedData.placeBeforeInput,
        injectInput: !!normalizedData.injectInput,
      });
      const liveSet =
        (typeof api.getSetByName === "function"
          ? api.getSetByName(setName)
          : null) ||
        (QRS && Array.isArray(QRS.list)
          ? QRS.list.find((entry) => entry?.name === setName)
          : null);
      syncLiveSet(liveSet);
      if (liveSet && typeof liveSet.save === "function") {
        await liveSet.save();
        return;
      }
      if (liveSet && typeof liveSet.performSave === "function") {
        await liveSet.performSave();
        return;
      }
    } catch (error) {
      console.warn("[CFM] 创建快速回复集失败，回退到直接保存", error);
    }
  }

  const response = await fetch("/api/quick-replies/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizedData),
  });
  if (!response.ok) {
    throw new Error(`保存快速回复集失败: HTTP ${response.status}`);
  }

  const finalLiveSet =
    (api && typeof api.getSetByName === "function"
      ? api.getSetByName(setName)
      : null) ||
    (QRS && Array.isArray(QRS.list)
      ? QRS.list.find((entry) => entry?.name === setName)
      : null);
  syncLiveSet(finalLiveSet);
}

export function createQuickReplyPresetsApiCore(deps) {
  const {
    $,
    CSS,
    cfmConfirm,
    cfmToastr,
    console,
    document,
    escapeHtml,
    extensionName,
    extensionSettings: extension_settings,
    getCharacters,
    getContext,
    getCurrentCharAvatar,
    getCurrentCharName,
    getCurrentChatBindKey,
    getCurrentChatFileName,
    getCurrentPresetName,
    getResFolderDisplayName,
    getResFolderTree,
    getResourceGroups,
    makeChatBindKey,
    parseChatBindKey,
    renderQRView,
    showPresetEditFolderFilterPanel,
    sortResFolders,
    setTimeout,
    window,
  } = deps;

  function getQrSetNames() {
      try {
        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        const QuickReplySet =
          typeof globalThis !== "undefined"
            ? globalThis.QuickReplySet || null
            : null;
        // 尝试通过 api.listSets() 获取
        if (api && typeof api.listSets === "function") {
          return api.listSets().map((s) => (typeof s === "string" ? s : s.name));
        }
        // 尝试通过 QuickReplySet.list
        if (QuickReplySet && Array.isArray(QuickReplySet.list)) {
          return QuickReplySet.list.map((s) => s.name);
        }
        // 从 DOM 读取
        const domNames = [];
        $('#qr--settings [id^="qr--set-"]').each(function () {
          const n = $(this).find(".qr--set-name").text().trim();
          if (n) domNames.push(n);
        });
        if (domNames.length > 0) return domNames;
        // 从酒馆原生设置面板的 select 中读取
        const selectNames = [];
        $("#qr--set-selector option").each(function () {
          const v = $(this).val();
          if (v) selectNames.push($(this).text().trim() || v);
        });
        return selectNames;
      } catch (e) {
        console.warn("[CFM] 获取快速回复集列表失败", e);
        return [];
      }
    }



  function getExistingQrSetNameSet() {
      return new Set(
        Array.from(
          new Set(
            getQrSetNames()
              .map((name) => String(name || "").trim())
              .filter(Boolean),
          ),
        ),
      );
    }



  function filterExistingQrSetNames(setNames, existingNameSet) {
      const validNameSet = existingNameSet || getExistingQrSetNameSet();
      return Array.from(
        new Set(
          (Array.isArray(setNames) ? setNames : [])
            .map((name) => String(name || "").trim())
            .filter((name) => name && validNameSet.has(name)),
        ),
      );
    }



  function sanitizeQrActivePresetState(save = false) {
      const presets = extension_settings[extensionName].qrActivePresets || [];
      const existingNameSet = getExistingQrSetNameSet();
      let presetChanged = false;
      let presetIdx = 0;
      for (const preset of presets) {
        if (!preset || typeof preset !== "object") continue;
        // name 兜底：缺失或空白的分组名补默认名，避免界面显示 undefined
        if (typeof preset.name !== "string" || !preset.name.trim()) {
          preset.name = `未命名分组 ${presetIdx + 1}`;
          presetChanged = true;
        }
        const prevSets = Array.isArray(preset.sets) ? preset.sets : [];
        const nextSets = filterExistingQrSetNames(prevSets, existingNameSet);
        const sameSets =
          prevSets.length === nextSets.length &&
          prevSets.every((name, idx) => name === nextSets[idx]);
        if (!sameSets || !Array.isArray(preset.sets)) {
          preset.sets = nextSets;
          presetChanged = true;
        }
        presetIdx++;
      }
      const applied = Array.isArray(
        extension_settings[extensionName]._qrAppliedPresetIndices,
      )
        ? extension_settings[extensionName]._qrAppliedPresetIndices
        : [];
      const nextApplied = applied.filter(
        (idx) =>
          presets[idx] &&
          Array.isArray(presets[idx].sets) &&
          presets[idx].sets.length > 0,
      );
      const appliedChanged =
        applied.length !== nextApplied.length ||
        applied.some((idx, i) => idx !== nextApplied[i]);
      if (appliedChanged) {
        extension_settings[extensionName]._qrAppliedPresetIndices = nextApplied;
      }
      if (save && (presetChanged || appliedChanged)) {
        getContext().saveSettingsDebounced();
      }
      return {
        presets,
        existingNameSet,
        changed: presetChanged || appliedChanged,
      };
    }



  function getActiveQrSets() {
      const active = new Set();
      try {
        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        if (!api) return active;
        // 从 api.settings 读取
        if (api.settings) {
          const cfg = api.settings.config;
          const chatCfg = api.settings.chatConfig;
          if (cfg && cfg.setList) {
            for (const entry of cfg.setList) {
              if (entry.set && entry.set.name) active.add(entry.set.name);
            }
          }
          if (chatCfg && chatCfg.setList) {
            for (const entry of chatCfg.setList) {
              if (entry.set && entry.set.name) active.add(entry.set.name);
            }
          }
        }
      } catch (e) {
        console.warn("[CFM] 获取激活快速回复集失败", e);
      }
      return active;
    }



  async function toggleQrSetActivation(name, activate) {
      const normalizedName = String(name || "").trim();
      if (!normalizedName) return false;
      const existingNameSet = getExistingQrSetNameSet();
      if (!existingNameSet.has(normalizedName)) {
        console.info(`[CFM] 已跳过不存在的快速回复集激活切换：${normalizedName}`);
        return false;
      }
      try {
        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        if (!api) {
          cfmToastr.error("快速回复 API 不可用");
          return false;
        }
        if (activate) {
          if (api.addGlobalSet) await api.addGlobalSet(normalizedName);
          else if (api.globalSetList && api.globalSetList.addSet)
            await api.globalSetList.addSet(normalizedName);
        } else {
          if (api.removeGlobalSet) await api.removeGlobalSet(normalizedName);
          else if (api.globalSetList && api.globalSetList.removeSet)
            await api.globalSetList.removeSet(normalizedName);
        }
        return true;
      } catch (e) {
        console.error("[CFM] 切换快速回复集激活状态失败", e);
        cfmToastr.error("切换快速回复集激活失败");
        return false;
      }
    }



  async function applyQrPreset(setNames) {
      try {
        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        if (!api) return;
        const { existingNameSet } = sanitizeQrActivePresetState(true);
        const filteredSetNames = filterExistingQrSetNames(
          setNames,
          existingNameSet,
        );
        const currentActive = getActiveQrSets();
        const targetSet = new Set(filteredSetNames);
        // 取消不在目标列表中的
        for (const name of currentActive) {
          if (!targetSet.has(name)) {
            await toggleQrSetActivation(name, false);
          }
        }
        // 激活目标列表中未激活的
        for (const name of filteredSetNames) {
          if (!currentActive.has(name)) {
            await toggleQrSetActivation(name, true);
          }
        }
      } catch (e) {
        console.error("[CFM] 应用快速回复分组预设失败", e);
      }
    }



  async function applyQrMultiActivation(setNames, activate) {
      const normalizedNames = Array.from(
        new Set(
          (Array.isArray(setNames) ? setNames : [])
            .map((name) => String(name || "").trim())
            .filter(Boolean),
        ),
      );
      if (!normalizedNames.length) {
        cfmToastr.warning("请先选择要操作的快速回复集");
        return false;
      }

      const existingNameSet = getExistingQrSetNameSet();
      const validNames = normalizedNames.filter((name) =>
        existingNameSet.has(name),
      );
      if (!validNames.length) {
        cfmToastr.warning("所选快速回复集已不存在");
        return false;
      }

      const activeSet = getActiveQrSets();
      let changedCount = 0;
      for (const name of validNames) {
        if (activeSet.has(name) === activate) continue;
        const changed = await toggleQrSetActivation(name, activate);
        if (!changed) continue;
        if (activate) activeSet.add(name);
        else activeSet.delete(name);
        syncQrPresetTrackingForManualToggle(name, activate);
        changedCount++;
      }

      if (!changedCount) {
        cfmToastr.warning("所选快速回复集状态未发生变化");
        return false;
      }

      cfmToastr.success(
        `已${activate ? "激活" : "取消激活"} ${changedCount} 个快速回复集`,
      );
      return true;
    }



  function openQrSetEditor(setName) {
      try {
        // 尝试通过快速回复 API 打开编辑器
        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        if (api && api.getSetByName) {
          const set = api.getSetByName(setName);
          if (set && typeof set.select === "function") {
            set.select();
            // 打开快速回复设置面板
            const qrSettingsBtn = $("#qr--settings-toggle, #qr--settings");
            if (qrSettingsBtn.length && !$("#qr--settings").is(":visible")) {
              qrSettingsBtn.trigger("click");
            }
            return;
          }
        }
        // fallback: 尝试点击对应的 DOM 元素
        const setEl = $(`#qr--set-${CSS.escape(setName)}`);
        if (setEl.length) {
          setEl.trigger("click");
          return;
        }
        cfmToastr.info(`快速回复集「${setName}」`);
      } catch (e) {
        console.warn("[CFM] 打开快速回复集编辑器失败", e);
        cfmToastr.info(`快速回复集「${setName}」`);
      }
    }



  function getQrActivePresets() {
      sanitizeQrActivePresetState(true);
      return extension_settings[extensionName].qrActivePresets || [];
    }


  function saveQrActivePreset(name, sets, scope, bindChars, bindPresets) {
      const presets = getQrActivePresets();
      const existing = presets.find((p) => p.name === name);
      if (existing) {
        existing.sets = sets;
        if (scope !== undefined) existing.scope = scope;
        if (bindChars !== undefined) existing.bindChars = bindChars;
        if (bindPresets !== undefined) existing.bindPresets = bindPresets;
      } else {
        presets.push({
          name,
          sets,
          scope: scope || "global",
          bindChars: bindChars || [],
          bindPresets: bindPresets || [],
        });
      }
      extension_settings[extensionName].qrActivePresets = presets;
      getContext().saveSettingsDebounced();
    }


  function deleteQrActivePreset(name) {
      const presets = getQrActivePresets();
      extension_settings[extensionName].qrActivePresets = presets.filter(
        (p) => p.name !== name,
      );
      getContext().saveSettingsDebounced();
    }


  function renameQrActivePreset(oldName, newName) {
      const presets = getQrActivePresets();
      const p = presets.find((p) => p.name === oldName);
      if (p) {
        p.name = newName;
        getContext().saveSettingsDebounced();
      }
    }



  function setQrPresetScope(presetIdx, scope) {
      const presets = getQrActivePresets();
      if (presets[presetIdx]) {
        presets[presetIdx].scope = scope;
        if (scope === "global") {
          presets[presetIdx].bindChars = [];
          presets[presetIdx].bindPresets = [];
          presets[presetIdx].bindChats = [];
        }
        getContext().saveSettingsDebounced();
      }
    }



  async function unapplyQrPresetIndex(presetIdx) {
      const allPresets = getQrActivePresets();
      const preset = allPresets[presetIdx];
      if (!preset) return 0;
      const applied =
        extension_settings[extensionName]._qrAppliedPresetIndices || [];
      const otherApplied = applied.filter(
        (i) => i !== presetIdx && allPresets[i],
      );
      const otherSets = new Set();
      for (const oi of otherApplied) {
        for (const s of allPresets[oi].sets) otherSets.add(s);
      }
      let removedCount = 0;
      for (const s of preset.sets) {
        if (!otherSets.has(s)) {
          await toggleQrSetActivation(s, false);
          removedCount++;
        }
      }
      extension_settings[extensionName]._qrAppliedPresetIndices = otherApplied;
      getContext().saveSettingsDebounced();
      return removedCount;
    }



  function syncQrPresetTrackingForManualToggle(setName, isActive) {
      const presets = getQrActivePresets();
      const applied =
        extension_settings[extensionName]._qrAppliedPresetIndices || [];
      const activeSet = getActiveQrSets();

      let nextApplied = isActive
        ? [...applied]
        : applied.filter(
            (idx) => !(presets[idx] && presets[idx].sets.includes(setName)),
          );

      if (isActive) {
        presets.forEach((preset, idx) => {
          if (
            preset &&
            preset.sets.includes(setName) &&
            preset.sets.every((s) => activeSet.has(s)) &&
            !nextApplied.includes(idx)
          ) {
            nextApplied.push(idx);
          }
        });
      }

      const changed =
        nextApplied.length !== applied.length ||
        nextApplied.some((idx, i) => idx !== applied[i]);

      if (changed) {
        extension_settings[extensionName]._qrAppliedPresetIndices = nextApplied;
        getContext().saveSettingsDebounced();
      }

      const overlay = $("#cfm-qr-preset-panel-overlay");
      if (overlay.length) {
        overlay.find(".cfm-wi-preset-item").each(function () {
          const idx = parseInt($(this).attr("data-preset-idx"), 10);
          const preset = presets[idx];
          if (!preset) return;
          const fullyApplied = preset.sets.every((s) => activeSet.has(s));
          const btn = $(this).find(".cfm-qr-preset-apply");
          btn.toggleClass("cfm-wi-preset-apply-active", fullyApplied);
          btn.attr("title", fullyApplied ? "当前已激活" : "应用到全局");
          btn.attr(
            "style",
            fullyApplied
              ? "color:#a6e3a1;text-shadow:0 0 8px rgba(166,227,161,.55);"
              : "",
          );
        });
      }
    }


  function bindQrPresetToChar(presetIdx, charAvatar) {
      const presets = getQrActivePresets();
      const p = presets[presetIdx];
      if (!p) return;
      if (!Array.isArray(p.bindChars)) p.bindChars = [];
      if (!p.bindChars.includes(charAvatar)) {
        p.bindChars.push(charAvatar);
        getContext().saveSettingsDebounced();
      }
    }



  function bindQrPresetToChat(presetIdx, charAvatar, chatFileName) {
    const presets = getQrActivePresets();
    const p = presets[presetIdx];
    const bindKey = makeChatBindKey(charAvatar, chatFileName);
    if (!p || !bindKey) return;
    if (!Array.isArray(p.bindChats)) p.bindChats = [];
    if (!p.bindChats.includes(bindKey)) {
      p.bindChats.push(bindKey);
      getContext().saveSettingsDebounced();
    }
  }

  function unbindQrPresetFromChat(presetIdx, bindKey) {
    const presets = getQrActivePresets();
    const p = presets[presetIdx];
    if (!p || !Array.isArray(p.bindChats)) return;
    const idx = p.bindChats.indexOf(bindKey);
    if (idx !== -1) {
      p.bindChats.splice(idx, 1);
      getContext().saveSettingsDebounced();
    }
  }

  function bindQrPresetToPreset(presetIdx, presetName) {
      const presets = getQrActivePresets();
      const p = presets[presetIdx];
      if (!p) return;
      if (!Array.isArray(p.bindPresets)) p.bindPresets = [];
      if (!p.bindPresets.includes(presetName)) {
        p.bindPresets.push(presetName);
        getContext().saveSettingsDebounced();
      }
    }


  function unbindQrPresetFromChar(presetIdx, charAvatar) {
      const presets = getQrActivePresets();
      const p = presets[presetIdx];
      if (!p || !Array.isArray(p.bindChars)) return;
      const idx = p.bindChars.indexOf(charAvatar);
      if (idx !== -1) {
        p.bindChars.splice(idx, 1);
        getContext().saveSettingsDebounced();
      }
    }


  function unbindQrPresetFromPreset(presetIdx, presetName) {
      const presets = getQrActivePresets();
      const p = presets[presetIdx];
      if (!p || !Array.isArray(p.bindPresets)) return;
      const idx = p.bindPresets.indexOf(presetName);
      if (idx !== -1) {
        p.bindPresets.splice(idx, 1);
        getContext().saveSettingsDebounced();
      }
    }



  function getQrAutoApplyPresetIndices() {
      const presets = getQrActivePresets();
      const currentChar = getCurrentCharAvatar();
      const currentPreset = getCurrentPresetName();
      const currentChatKey = getCurrentChatBindKey();
      const indices = [];
      const details = {};
      for (let i = 0; i < presets.length; i++) {
        const p = presets[i];
        if (!p || !Array.isArray(p.sets) || p.sets.length === 0) continue;
        if (p.scope === "global") continue;
        const hasBindings =
          (p.bindChars && p.bindChars.length > 0) ||
          (p.bindPresets && p.bindPresets.length > 0) ||
          (p.bindChats && p.bindChats.length > 0);
        if (!hasBindings) continue;
        const chatMatch = !!(
          currentChatKey &&
          p.bindChats &&
          p.bindChats.includes(currentChatKey)
        );
        const charMatch = !!(
          !chatMatch &&
          currentChar &&
          p.bindChars &&
          p.bindChars.includes(currentChar)
        );
        const presetMatch = !!(
          currentPreset &&
          p.bindPresets &&
          p.bindPresets.includes(currentPreset)
        );
        if (chatMatch || charMatch || presetMatch) {
          indices.push(i);
          details[i] = { chatMatch, charMatch, presetMatch };
        }
      }
      return { indices, details };
    }



  async function autoApplyQrPresets(silent = false) {
      try {
        const presets = getQrActivePresets();
        const { indices: shouldApply, details } = getQrAutoApplyPresetIndices();
        const prevApplied =
          extension_settings[extensionName]._qrAppliedPresetIndices || [];
        const currentCharName = getCurrentCharName();
        const currentPresetName = getCurrentPresetName();
        const toDeactivate = prevApplied.filter((i) => !shouldApply.includes(i));
        const toActivate = shouldApply.filter((i) => !prevApplied.includes(i));
        const stillApplied = shouldApply.filter((i) => prevApplied.includes(i));
        if (
          toDeactivate.length === 0 &&
          toActivate.length === 0 &&
          stillApplied.length === 0
        )
          return;

        // 收集需要关闭的QR集
        const setsToDeactivate = new Set();
        for (const idx of toDeactivate) {
          if (presets[idx]) {
            for (const s of presets[idx].sets) setsToDeactivate.add(s);
          }
        }
        const setsToActivate = new Set();
        for (const idx of shouldApply) {
          if (presets[idx]) {
            for (const s of presets[idx].sets) setsToActivate.add(s);
          }
        }
        for (const s of setsToActivate) setsToDeactivate.delete(s);

        for (const s of setsToDeactivate) await toggleQrSetActivation(s, false);
        for (const s of setsToActivate) await toggleQrSetActivation(s, true);

        extension_settings[extensionName]._qrAppliedPresetIndices = [
          ...shouldApply,
        ];

        const msgParts = [];
        function describeMatchReason(idx) {
          const d = details[idx];
          if (!d) return "";
          const reasons = [];
          if (d.charMatch && currentCharName)
            reasons.push(`角色「${currentCharName}」`);
          if (d.presetMatch && currentPresetName)
            reasons.push(`预设「${currentPresetName}」`);
          return reasons.length > 0 ? `（匹配${reasons.join("和")}）` : "";
        }
        for (const idx of toActivate) {
          const name = presets[idx]?.name;
          if (name)
            msgParts.push(`✅ 已开启「${name}」${describeMatchReason(idx)}`);
        }
        for (const idx of toDeactivate) {
          const name = presets[idx]?.name;
          if (name) {
            const p = presets[idx];
            const reasons = [];
            if (p.bindChars && p.bindChars.length > 0) reasons.push("角色不匹配");
            if (p.bindPresets && p.bindPresets.length > 0)
              reasons.push("预设不匹配");
            msgParts.push(`❌ 已关闭「${name}」（${reasons.join("且")}）`);
          }
        }
        if (
          (toActivate.length > 0 || toDeactivate.length > 0) &&
          stillApplied.length > 0
        ) {
          for (const idx of stillApplied) {
            const name = presets[idx]?.name;
            if (name)
              msgParts.push(`🔄 「${name}」保持开启${describeMatchReason(idx)}`);
          }
        }
        if (!silent && msgParts.length > 0) {
          cfmToastr.info(msgParts.join("<br>"), "快速回复分组", {
            timeOut: 4000,
            escapeHtml: false,
          });
        }
      } catch (e) {
        console.error("[CFM] 自动应用快速回复分组失败", e);
      }
    }



  function getQrPresetBindSummary(preset) {
      if (preset.scope === "global") return "全局";
      const parts = [];
      if (preset.bindChars && preset.bindChars.length > 0) {
        const chars = getCharacters();
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



  function showQrPresetPanel() {
      if ($("#cfm-qr-preset-panel-overlay").length > 0) return;
      const qrActiveSet = getActiveQrSets();
      const savableSets = [...qrActiveSet];
      const presets = getQrActivePresets();
      const currentChar = getCurrentCharAvatar();
      const currentCharName = getCurrentCharName();
      const currentPresetName = getCurrentPresetName();

      // 检测当前激活组合是否与某个已有分组完全相同
      const savableSet = new Set(savableSets);
      let matchedPresetName = null;
      for (const p of presets) {
        if (
          p.sets.length === savableSets.length &&
          p.sets.every((s) => savableSet.has(s))
        ) {
          matchedPresetName = p.name;
          break;
        }
      }

      const scopeLabels = { global: "全局", bound: "已绑定" };
      const scopeColors = { global: "#a6e3a1", bound: "#cba6f7" };

      const appliedPresetIndices = new Set(
        extension_settings[extensionName]._qrAppliedPresetIndices || [],
      );
      const presetsHtml =
        presets.length === 0
          ? '<div class="cfm-wi-preset-empty">暂无已保存的分组</div>'
          : presets
              .map((p, idx) => {
                const scope = p.scope || "global";
                const hasBindings =
                  (p.bindChars && p.bindChars.length > 0) ||
                  (p.bindPresets && p.bindPresets.length > 0) ||
                  (p.bindChats && p.bindChats.length > 0);
                const isApplied = appliedPresetIndices.has(idx);
                return `
          <div class="cfm-wi-preset-item" data-preset-idx="${idx}">
            <div class="cfm-wi-preset-item-left">
              <span class="cfm-wi-preset-item-name"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(p.name || "未命名分组")}</span>
              <span class="cfm-wi-preset-scope-tag" style="color:${scopeColors[scope]};border-color:${scopeColors[scope]}40;background:${scopeColors[scope]}15;">${scopeLabels[scope]}</span>
              <span class="cfm-wi-preset-item-count">${p.sets.length} 个</span>
              ${hasBindings ? '<span class="cfm-wi-preset-bind-toggle" title="查看绑定"><i class="fa-solid fa-caret-down"></i></span>' : ""}
            </div>
            <span class="cfm-wi-preset-item-actions">
              <i class="fa-solid fa-play cfm-qr-preset-apply ${isApplied ? "cfm-wi-preset-apply-active" : ""}" title="${isApplied ? "当前已激活" : "应用到全局"}" style="${isApplied ? "color:#a6e3a1;text-shadow:0 0 8px rgba(166,227,161,.55);" : ""}"></i>
              <i class="fa-solid fa-stop cfm-qr-preset-unapply" title="取消应用"></i>
              <i class="fa-solid fa-link cfm-qr-preset-bind" title="绑定管理"></i>
              <i class="fa-solid fa-pen cfm-qr-preset-edit" title="编辑"></i>
              <i class="fa-solid fa-trash cfm-qr-preset-del" title="删除"></i>
            </span>
            ${hasBindings ? '<div class="cfm-wi-preset-bind-dropdown" style="display:none;"></div>' : ""}
          </div>
        `;
              })
              .join("");

      const overlay = $(`
        <div class="cfm-edit-popup-overlay" id="cfm-qr-preset-panel-overlay">
          <div class="cfm-edit-popup cfm-wi-preset-panel">
            <div class="cfm-edit-popup-title"><i class="fa-solid fa-layer-group" style="margin-right:6px;"></i>快速回复激活分组</div>
            <div class="cfm-wi-preset-save-section">
              <div class="cfm-wi-preset-save-row">
                <input type="text" class="cfm-edit-input" id="cfm-qr-preset-name-input" placeholder="输入分组名称，保存当前激活的 ${savableSets.length} 个快速回复集">
                <button class="cfm-edit-popup-confirm" id="cfm-qr-preset-save-confirm" ${savableSets.length === 0 ? "disabled" : ""}><i class="fa-solid fa-floppy-disk"></i> 保存</button>
              </div>
              ${savableSets.length === 0 ? '<div class="cfm-wi-preset-save-hint">当前没有激活的快速回复集可保存</div>' : ""}
              ${matchedPresetName ? `<div class="cfm-wi-preset-save-hint" style="color:#f9e2af;">当前激活组合与已有分组「${escapeHtml(matchedPresetName)}」相同</div>` : ""}
            </div>
            <div class="cfm-wi-preset-divider"></div>
            <div class="cfm-wi-preset-list-section">
              <div class="cfm-wi-preset-list-title">已保存的分组</div>
              <div class="cfm-wi-preset-list">${presetsHtml}</div>
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-edit-popup-cancel">关闭</button>
            </div>
          </div>
        </div>
      `);
      $("body").append(overlay);
      overlay.find("#cfm-qr-preset-name-input").focus();

      // 关闭
      overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
      overlay.on("click", (e) => {
        if ($(e.target).is(overlay)) overlay.remove();
      });

      // 保存当前分组
      overlay.find("#cfm-qr-preset-name-input").on("keydown", (e) => {
        if (e.key === "Enter")
          overlay.find("#cfm-qr-preset-save-confirm").trigger("click");
        if (e.key === "Escape") overlay.remove();
      });
      overlay.find("#cfm-qr-preset-save-confirm").on("click", () => {
        if (savableSets.length === 0) return;
        const name = overlay.find("#cfm-qr-preset-name-input").val().trim();
        if (!name) {
          cfmToastr.warning("请输入分组名称");
          return;
        }
        const existing = getQrActivePresets().find((p) => p.name === name);
        if (existing) {
          if (!cfmConfirm(`分组「${name}」已存在，是否覆盖？`)) return;
        }
        saveQrActivePreset(name, savableSets);
        cfmToastr.success(
          `已保存激活分组「${name}」（${savableSets.length} 个快速回复集）`,
        );
        overlay.remove();
      });

      // 应用分组
      overlay.find(".cfm-qr-preset-apply").on("click", async function (e) {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(
          $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
          10,
        );
        const currentPresets = getQrActivePresets();
        const preset = currentPresets[idx];
        if (!preset) {
          cfmToastr.error("分组不存在");
          return;
        }
        try {
          const applied =
            extension_settings[extensionName]._qrAppliedPresetIndices || [];
          const otherApplied = applied.filter(
            (i) => i !== idx && currentPresets[i],
          );
          let mode = "stack";
          if (otherApplied.length > 0) {
            const otherNames = otherApplied
              .map((i) => currentPresets[i].name)
              .join("、");
            const choice = await new Promise((resolve) => {
              const confirmOverlay = $(`
                <div class="cfm-edit-popup-overlay" style="z-index:100001;">
                  <div class="cfm-edit-popup" style="max-width:380px;">
                    <div class="cfm-edit-popup-title">应用方式</div>
                    <div class="cfm-edit-field" style="font-size:13px;line-height:1.6;">
                      当前已有分组「${escapeHtml(otherNames)}」处于应用状态。<br>请选择应用方式：
                    </div>
                    <div class="cfm-edit-popup-actions" style="gap:8px;">
                      <button class="cfm-edit-popup-cancel" data-choice="cancel">取消</button>
                      <button class="cfm-edit-popup-confirm" data-choice="replace" style="background:#f38ba8;">替换</button>
                      <button class="cfm-edit-popup-confirm" data-choice="stack">叠加</button>
                    </div>
                  </div>
                </div>
              `);
              $("body").append(confirmOverlay);
              confirmOverlay.find("[data-choice]").on("click", function () {
                resolve($(this).attr("data-choice"));
                confirmOverlay.remove();
              });
              confirmOverlay.on("click", function (ev) {
                if ($(ev.target).is(confirmOverlay)) {
                  resolve("cancel");
                  confirmOverlay.remove();
                }
              });
            });
            if (choice === "cancel") return;
            mode = choice;
          }
          const autoAppliedState = getQrAutoApplyPresetIndices();
          const autoDetail = autoAppliedState.details[idx] || {};
          const currentActiveSet = getActiveQrSets();
          const isActuallyApplied = preset.sets.every((s) =>
            currentActiveSet.has(s),
          );
          if (
            autoAppliedState.indices.includes(idx) &&
            isActuallyApplied &&
            (autoDetail.charMatch ||
              autoDetail.presetMatch ||
              autoDetail.chatMatch)
          ) {
            const reasons = [];
            if (autoDetail.chatMatch) reasons.push("当前聊天");
            if (autoDetail.charMatch) reasons.push("当前角色");
            if (autoDetail.presetMatch) reasons.push("当前预设");
            cfmToastr.info(
              `分组「${preset.name}」已因${reasons.join("和")}绑定自动生效`,
            );
            return;
          }
          if (mode === "replace") {
            const keepSets = new Set(preset.sets);
            for (const oi of otherApplied) {
              if (currentPresets[oi]) {
                for (const s of currentPresets[oi].sets) {
                  if (!keepSets.has(s)) await toggleQrSetActivation(s, false);
                }
              }
            }
          }
          for (const s of preset.sets) await toggleQrSetActivation(s, true);
          const newApplied =
            mode === "replace"
              ? [idx]
              : [...otherApplied.filter((i) => i !== idx), idx];
          extension_settings[extensionName]._qrAppliedPresetIndices = newApplied;
          getContext().saveSettingsDebounced();
          cfmToastr.success(
            `已${mode === "replace" ? "替换" : "叠加"}应用分组「${preset.name}」`,
          );
          overlay.remove();
          renderQRView();
        } catch (err) {
          console.error("[CFM] 应用QR分组失败", err);
          cfmToastr.error("应用分组失败");
        }
      });

      // 取消应用分组
      overlay.find(".cfm-qr-preset-unapply").on("click", async function (e) {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(
          $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
          10,
        );
        const currentPresets = getQrActivePresets();
        const preset = currentPresets[idx];
        if (!preset) {
          cfmToastr.error("分组不存在");
          return;
        }
        try {
          const applied =
            extension_settings[extensionName]._qrAppliedPresetIndices || [];
          if (!applied.includes(idx)) {
            cfmToastr.warning(`分组「${preset.name}」当前未处于应用状态`);
            return;
          }
          const { indices: autoIndices, details: autoDetails } =
            getQrAutoApplyPresetIndices();
          if (autoIndices.includes(idx)) {
            const detail = autoDetails[idx] || {};
            const reasons = [];
            if (detail.charMatch)
              reasons.push(
                `角色「${escapeHtml(getCurrentCharName() || getCurrentCharAvatar())}」`,
              );
            if (detail.presetMatch)
              reasons.push(`预设「${escapeHtml(getCurrentPresetName())}」`);
            const confirmMsg = `分组「${preset.name}」当前因${reasons.join(" 和 ")}自动应用，确认取消应用吗？`;
            if (!cfmConfirm(confirmMsg)) return;
          }
          const otherApplied = applied.filter(
            (i) => i !== idx && currentPresets[i],
          );
          const otherSets = new Set();
          for (const oi of otherApplied) {
            for (const s of currentPresets[oi].sets) otherSets.add(s);
          }
          let removedCount = 0;
          for (const s of preset.sets) {
            if (!otherSets.has(s)) {
              await toggleQrSetActivation(s, false);
              removedCount++;
            }
          }
          extension_settings[extensionName]._qrAppliedPresetIndices =
            otherApplied;
          getContext().saveSettingsDebounced();
          cfmToastr.success(
            `已取消应用分组「${preset.name}」（移除 ${removedCount} 个独占快速回复集）`,
          );
          overlay.remove();
          renderQRView();
        } catch (err) {
          console.error("[CFM] 取消应用QR分组失败", err);
          cfmToastr.error("取消应用分组失败");
        }
      });

      // 绑定管理
      overlay.find(".cfm-qr-preset-bind").on("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        const btn = $(this);
        const item = btn.closest(".cfm-wi-preset-item");
        const idx = parseInt(item.attr("data-preset-idx"), 10);
        $(".cfm-wi-preset-bind-menu").remove();
        const menu = $(`
          <div class="cfm-wi-preset-bind-menu">
            <div class="cfm-wi-preset-bind-menu-title">应用方式</div>
            <div class="cfm-wi-preset-bind-menu-item" data-action="global"><i class="fa-solid fa-globe" style="color:#a6e3a1;"></i> 应用到全局</div>
            <div class="cfm-wi-preset-bind-menu-item ${!currentPresetName ? "cfm-disabled" : ""}" data-action="preset"><i class="fa-solid fa-sliders" style="color:#89b4fa;"></i> 绑定到当前预设${currentPresetName ? "「" + escapeHtml(currentPresetName) + "」" : "（无预设）"}</div>
            <div class="cfm-wi-preset-bind-menu-item ${!currentChar ? "cfm-disabled" : ""}" data-action="char">
              <span style="display:flex;align-items:center;min-width:0;flex:1;"><i class="fa-solid fa-user" style="color:#f9e2af;"></i><span style="margin-left:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">绑定到当前角色${currentCharName ? "「" + escapeHtml(currentCharName) + "」" : "（无角色）"}</span></span>
              <i class="fa-solid fa-caret-down cfm-wi-bind-chat-toggle" style="margin-left:auto;opacity:.7;"></i>
            </div>
            <div class="cfm-wi-preset-bind-menu-item cfm-wi-preset-bind-subitem ${!getCurrentChatBindKey() ? "cfm-disabled" : ""}" data-action="chat" style="display:none;"><i class="fa-solid fa-comments" style="color:#cba6f7;"></i> 绑定到当前聊天${getCurrentChatFileName() ? "「" + escapeHtml(getCurrentChatFileName()) + "」" : "（无聊天）"}</div>
          </div>
        `);
        overlay.append(menu);
        const btnRect = btn[0].getBoundingClientRect();
        let menuTop = btnRect.bottom + 4;
        let menuLeft = btnRect.right - 240;
        if (menuLeft < 8) menuLeft = 8;
        if (menuTop + 160 > window.innerHeight) menuTop = btnRect.top - 160;
        menu.css({ top: menuTop + "px", left: menuLeft + "px" });

        menu.find(".cfm-wi-bind-chat-toggle").on("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          const chatItem = menu.find('[data-action="chat"]');
          if (!chatItem.length) return;
          const willShow = !chatItem.is(":visible");
          chatItem.stop(true, true).slideToggle(150);
          $(this)
            .toggleClass("fa-caret-down", !willShow)
            .toggleClass("fa-caret-up", willShow);
        });

        menu
          .find(".cfm-wi-preset-bind-menu-item")
          .on("click", async function (ev) {
            ev.stopPropagation();
            if ($(ev.target).closest(".cfm-wi-bind-chat-toggle").length) return;
            if ($(this).hasClass("cfm-disabled")) return;
            const action = $(this).data("action");
            const allPresets = getQrActivePresets();
            const preset = allPresets[idx];
            if (!preset) return;
            if (action === "global") {
              setQrPresetScope(idx, "global");
              await applyQrPreset(preset.sets);
              cfmToastr.success(`已将分组「${preset.name}」设为全局应用`);
            } else if (action === "preset") {
              if (!currentPresetName) return;
              const alreadyBound =
                Array.isArray(preset.bindPresets) &&
                preset.bindPresets.includes(currentPresetName);
              const autoApplied = getQrAutoApplyPresetIndices();
              if (alreadyBound) {
                if (
                  autoApplied.indices.includes(idx) &&
                  autoApplied.details[idx]?.presetMatch
                ) {
                  cfmToastr.info(
                    `分组「${preset.name}」已绑定当前预设，且已处于应用状态`,
                  );
                } else {
                  cfmToastr.info(`当前预设已绑定分组「${preset.name}」`);
                }
              } else {
                if (preset.scope === "global") setQrPresetScope(idx, "bound");
                bindQrPresetToPreset(idx, currentPresetName);
                await applyQrPreset(preset.sets);
                cfmToastr.success(
                  `已将分组「${preset.name}」绑定到预设「${currentPresetName}」`,
                );
              }
            } else if (action === "char") {
              if (!currentChar) return;
              const alreadyBound =
                Array.isArray(preset.bindChars) &&
                preset.bindChars.includes(currentChar);
              const autoApplied = getQrAutoApplyPresetIndices();
              if (alreadyBound) {
                if (
                  autoApplied.indices.includes(idx) &&
                  autoApplied.details[idx]?.charMatch
                ) {
                  cfmToastr.info(
                    `分组「${preset.name}」已绑定当前角色，且已处于应用状态`,
                  );
                } else {
                  cfmToastr.info(`当前角色已绑定分组「${preset.name}」`);
                }
              } else {
                if (preset.scope === "global") setQrPresetScope(idx, "bound");
                bindQrPresetToChar(idx, currentChar);
                await applyQrPreset(preset.sets);
                cfmToastr.success(
                  `已将分组「${preset.name}」绑定到角色「${currentCharName}」`,
                );
              }
            } else if (action === "chat") {
              const currentChatKey = getCurrentChatBindKey();
              const currentChatName = getCurrentChatFileName();
              if (!currentChar || !currentChatKey || !currentChatName) return;
              const alreadyBound =
                Array.isArray(preset.bindChats) &&
                preset.bindChats.includes(currentChatKey);
              const autoApplied = getQrAutoApplyPresetIndices();
              if (alreadyBound) {
                if (
                  autoApplied.indices.includes(idx) &&
                  autoApplied.details[idx]?.chatMatch
                ) {
                  cfmToastr.info(
                    `分组「${preset.name}」已绑定当前聊天，且已处于应用状态`,
                  );
                } else {
                  cfmToastr.info(`当前聊天已绑定分组「${preset.name}」`);
                }
              } else {
                if (preset.scope === "global") setQrPresetScope(idx, "bound");
                bindQrPresetToChat(idx, currentChar, currentChatName);
                await applyQrPreset(preset.sets);
                cfmToastr.success(
                  `已将分组「${preset.name}」绑定到聊天「${currentChatName}」`,
                );
              }
            }
            menu.remove();
            overlay.remove();
            showQrPresetPanel();
          });
        setTimeout(() => {
          $(document).one("click", () => menu.remove());
        }, 10);
      });

      // 绑定三角下拉
      overlay.find(".cfm-wi-preset-bind-toggle").on("click", function (e) {
        e.stopPropagation();
        const item = $(this).closest(".cfm-wi-preset-item");
        const idx = parseInt(item.attr("data-preset-idx"), 10);
        const dropdown = item.find(".cfm-wi-preset-bind-dropdown");
        const icon = $(this).find("i");
        if (dropdown.is(":visible")) {
          dropdown.slideUp(150);
          icon.removeClass("fa-caret-up").addClass("fa-caret-down");
          return;
        }
        const allPresets = getQrActivePresets();
        const preset = allPresets[idx];
        if (!preset) return;
        let html = "";
        if (preset.bindChars && preset.bindChars.length > 0) {
          const chars = getCharacters();
          html +=
            '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-user" style="color:#f9e2af;"></i> 绑定的角色卡</div>';
          for (const av of preset.bindChars) {
            const ch = chars.find((c) => c.avatar === av);
            const name = ch ? ch.name : av;
            const isCurrentChar = !!currentChar && currentChar === av;
            html += `<div class="cfm-wi-bind-entry ${isCurrentChar ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="char" data-bind-id="${escapeHtml(av)}"><span class="cfm-wi-bind-entry-name">${escapeHtml(name)}</span><i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i></div>`;
          }
        }
        if (preset.bindChats && preset.bindChats.length > 0) {
          const chars = getCharacters();
          html +=
            '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-comments" style="color:#cba6f7;"></i> 绑定的聊天</div>';
          for (const bindKey of preset.bindChats) {
            const parsed = parseChatBindKey(bindKey);
            const ch = chars.find((c) => c.avatar === parsed.avatar);
            const charName = ch ? ch.name : parsed.avatar;
            const name = `${charName}（${parsed.chatFileName || bindKey}）`;
            const isCurrentChat = getCurrentChatBindKey() === bindKey;
            html += `<div class="cfm-wi-bind-entry ${isCurrentChat ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="chat" data-bind-id="${escapeHtml(bindKey)}"><span class="cfm-wi-bind-entry-name">${escapeHtml(name)}</span><i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i></div>`;
          }
        }
        if (preset.bindPresets && preset.bindPresets.length > 0) {
          html +=
            '<div class="cfm-wi-bind-section-title"><i class="fa-solid fa-sliders" style="color:#89b4fa;"></i> 绑定的预设</div>';
          for (const pn of preset.bindPresets) {
            const isCurrentPreset =
              !!currentPresetName && currentPresetName === pn;
            html += `<div class="cfm-wi-bind-entry ${isCurrentPreset ? "cfm-wi-bind-entry-current" : ""}" data-bind-type="preset" data-bind-id="${escapeHtml(pn)}"><span class="cfm-wi-bind-entry-name">${escapeHtml(pn)}</span><i class="fa-solid fa-xmark cfm-wi-bind-remove" title="取消绑定"></i></div>`;
          }
        }
        if (!html) html = '<div class="cfm-wi-bind-empty">无绑定</div>';
        dropdown.html(html);
        dropdown.slideDown(150);
        icon.removeClass("fa-caret-down").addClass("fa-caret-up");

        dropdown.find(".cfm-wi-bind-remove").on("click", async function (ev) {
          ev.stopPropagation();
          const entry = $(this).closest(".cfm-wi-bind-entry");
          const bindType = entry.data("bind-type");
          const bindId = entry.data("bind-id");
          const displayName = entry.find(".cfm-wi-bind-entry-name").text();
          if (
            !cfmConfirm(
              `确定取消分组「${preset.name}」与${bindType === "char" ? "角色" : bindType === "chat" ? "聊天" : "预设"}「${displayName}」的绑定？`,
            )
          )
            return;
          if (bindType === "char") unbindQrPresetFromChar(idx, bindId);
          else if (bindType === "chat") unbindQrPresetFromChat(idx, bindId);
          else unbindQrPresetFromPreset(idx, bindId);

          const applied =
            extension_settings[extensionName]._qrAppliedPresetIndices || [];
          if (applied.includes(idx)) {
            const { indices: stillAutoIndices } = getQrAutoApplyPresetIndices();
            if (!stillAutoIndices.includes(idx)) {
              const removedCount = await unapplyQrPresetIndex(idx);
              cfmToastr.info(
                `已取消绑定，分组「${preset.name}」不再匹配当前条件，已自动取消应用（移除 ${removedCount} 个快速回复集）`,
              );
            } else {
              cfmToastr.success(
                "已取消绑定（分组仍因其他绑定条件匹配而保持应用）",
              );
            }
          } else {
            cfmToastr.success("已取消绑定");
          }
          const updated = getQrActivePresets()[idx];
          const stillHasBindings =
            updated &&
            ((updated.bindChars && updated.bindChars.length > 0) ||
              (updated.bindPresets && updated.bindPresets.length > 0) ||
              (updated.bindChats && updated.bindChats.length > 0));
          if (!stillHasBindings) {
            if (updated) setQrPresetScope(idx, "global");
            overlay.remove();
            showQrPresetPanel();
          } else {
            entry.remove();
            if (dropdown.find(".cfm-wi-bind-entry").length === 0) {
              dropdown.slideUp(150);
              icon.removeClass("fa-caret-up").addClass("fa-caret-down");
            }
          }
        });
      });

      // 编辑分组
      overlay.find(".cfm-qr-preset-edit").on("click", async function (e) {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(
          $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
          10,
        );
        const currentPresets = getQrActivePresets();
        const preset = currentPresets[idx];
        if (!preset) return;
        overlay.remove();
        showQrPresetEditPopup(preset);
      });

      // 删除分组
      overlay.find(".cfm-qr-preset-del").on("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(
          $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
          10,
        );
        const currentPresets = getQrActivePresets();
        const preset = currentPresets[idx];
        if (!preset) return;
        if (!cfmConfirm(`确定删除激活分组「${preset.name}」？`)) return;
        deleteQrActivePreset(preset.name);
        cfmToastr.success(`已删除激活分组「${preset.name}」`);
        overlay.remove();
        showQrPresetPanel();
      });
    }



  function showQrPresetEditPopup(preset) {
      if ($("#cfm-qr-preset-edit-overlay").length > 0) return;
      const allNames = getQrSetNames();
      const setSet = new Set(preset.sets);
      const qrGroups = getResourceGroups("quickreply");
      const qrTree = getResFolderTree("quickreply");
      const setsHtml = allNames
        .map((n) => {
          const checked = setSet.has(n) ? "checked" : "";
          const folder = qrGroups[n] || "";
          return `<label class="cfm-wi-preset-edit-item" data-folder="${escapeHtml(folder)}">
          <input type="checkbox" value="${escapeHtml(n)}" ${checked}>
          <i class="fa-solid fa-reply-all" style="color:#89b4fa;"></i>
          <span>${escapeHtml(n)}</span>
        </label>`;
        })
        .join("");

      function buildQrFilterOptions() {
        const opts = [
          '<option value="__all__">全部</option>',
          '<option value="__ungrouped__">未归类</option>',
        ];
        function addOpts(parentId, depth) {
          const children = sortResFolders(
            "quickreply",
            Object.keys(qrTree).filter(
              (id) => qrTree[id].parentId === (parentId || null),
            ),
          );
          for (const id of children) {
            const indent = "&nbsp;".repeat(depth * 3);
            opts.push(
              `<option value="${escapeHtml(id)}">${indent}📁 ${escapeHtml(getResFolderDisplayName("quickreply", id))}</option>`,
            );
            addOpts(id, depth + 1);
          }
        }
        addOpts(null, 0);
        return opts.join("");
      }

      const overlay = $(`
        <div class="cfm-edit-popup-overlay" id="cfm-qr-preset-edit-overlay">
          <div class="cfm-edit-popup cfm-wi-preset-edit-popup">
            <div class="cfm-edit-popup-title">编辑激活分组</div>
            <div class="cfm-edit-field">
              <label>分组名称</label>
              <input type="text" class="cfm-edit-input" id="cfm-qr-preset-edit-name" value="${escapeHtml(preset.name || "未命名分组")}">
            </div>
            <div class="cfm-edit-field">
              <label>包含的快速回复集</label>
              <div class="cfm-wi-preset-edit-search">
                <div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" id="cfm-qr-preset-edit-folder-btn" title="文件夹过滤"></div>
                <span class="cfm-wi-preset-edit-folder-label" id="cfm-qr-preset-edit-folder-label">显示全部</span>
                <input type="hidden" id="cfm-qr-preset-edit-folder-filter" value="__all__">
                <input type="text" class="cfm-edit-input" id="cfm-qr-preset-edit-filter" placeholder="搜索...">
              </div>
              <div class="cfm-wi-preset-edit-list">${setsHtml}</div>
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-edit-popup-cancel">取消</button>
              <button class="cfm-edit-popup-confirm">保存</button>
            </div>
          </div>
        </div>
      `);
      $("body").append(overlay);

      function getQrFolderFilterLabel(folderVal) {
        if (!folderVal || folderVal === "__all__") return "显示全部";
        if (folderVal === "__current_selected__") return "当前分组";
        if (folderVal === "__ungrouped__") return "未归类快速回复集";
        return getResFolderDisplayName("quickreply", folderVal) || folderVal;
      }

      function applyEditFilters() {
        const folderVal =
          overlay.find("#cfm-qr-preset-edit-folder-filter").val() || "__all__";
        overlay
          .find("#cfm-qr-preset-edit-folder-label")
          .text(getQrFolderFilterLabel(folderVal));
        const q = overlay
          .find("#cfm-qr-preset-edit-filter")
          .val()
          .toLowerCase()
          .trim();
        let allowedFolders = null;
        if (
          folderVal &&
          folderVal !== "__all__" &&
          folderVal !== "__ungrouped__" &&
          folderVal !== "__current_selected__"
        ) {
          allowedFolders = new Set();
          function collectChildren(pid) {
            allowedFolders.add(pid);
            const children = Object.keys(qrTree).filter(
              (id) => qrTree[id].parentId === pid,
            );
            for (const c of children) collectChildren(c);
          }
          collectChildren(folderVal);
        }
        overlay.find(".cfm-wi-preset-edit-item").each(function () {
          const name = $(this).find("span").text().toLowerCase();
          const folder = $(this).attr("data-folder") || "";
          const isChecked = $(this).find("input").prop("checked");
          let folderMatch = true;
          if (folderVal === "__current_selected__") {
            folderMatch = isChecked;
          } else if (folderVal === "__ungrouped__") {
            folderMatch = !folder || !qrTree[folder];
          } else if (allowedFolders) {
            folderMatch = allowedFolders.has(folder);
          }
          const textMatch = !q || name.includes(q);
          $(this).toggle(folderMatch && textMatch);
        });
      }
      overlay.find("#cfm-qr-preset-edit-folder-btn").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const currentCheckedInput = overlay
          .find(".cfm-wi-preset-edit-item input:checked")
          .first();
        const currentCheckedItem = currentCheckedInput.closest(
          ".cfm-wi-preset-edit-item",
        );
        const currentCheckedFolderRaw =
          currentCheckedItem.attr("data-folder") || "";
        const currentCheckedFolder =
          currentCheckedFolderRaw && qrTree[currentCheckedFolderRaw]
            ? currentCheckedFolderRaw
            : "__ungrouped__";
        showPresetEditFolderFilterPanel($(this), {
          panelKey: "qr_preset_edit",
          folderTree: qrTree,
          getDisplayName: (id) => getResFolderDisplayName("quickreply", id),
          getItemCount: (folderId) => {
            if (folderId === "__ungrouped__") {
              return allNames.filter((name) => {
                const grp = qrGroups[name];
                return !grp || !qrTree[grp];
              }).length;
            }
            const allowedFolders = new Set();
            function collectChildren(pid) {
              allowedFolders.add(pid);
              const children = Object.keys(qrTree).filter(
                (id) => qrTree[id].parentId === pid,
              );
              for (const c of children) collectChildren(c);
            }
            collectChildren(folderId);
            return allNames.filter((name) => allowedFolders.has(qrGroups[name]))
              .length;
          },
          ungroupedLabel: "未归类快速回复集",
          currentFilter:
            overlay.find("#cfm-qr-preset-edit-folder-filter").val() || "__all__",
          currentSelectedFilter: "__current_selected__",
          currentSelectedLabel: "当前分组",
          currentSelectedCount: overlay.find(
            ".cfm-wi-preset-edit-item input:checked",
          ).length,
          onSelect: (folderId) => {
            overlay.find("#cfm-qr-preset-edit-folder-filter").val(folderId);
            applyEditFilters();
          },
        });
      });
      overlay.find("#cfm-qr-preset-edit-filter").on("input", applyEditFilters);
      applyEditFilters();
      overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
      overlay.on("click", (e) => {
        if ($(e.target).is(overlay)) overlay.remove();
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const newName = overlay.find("#cfm-qr-preset-edit-name").val().trim();
        if (!newName) {
          cfmToastr.warning("请输入分组名称");
          return;
        }
        const existingOther = getQrActivePresets().find(
          (p) => p.name === newName && p.name !== preset.name,
        );
        if (existingOther) {
          cfmToastr.warning(`分组名称「${newName}」已被使用`);
          return;
        }
        const newSets = [];
        overlay.find(".cfm-wi-preset-edit-item input:checked").each(function () {
          newSets.push($(this).val());
        });
        if (newSets.length === 0) {
          cfmToastr.warning("请至少选择一个快速回复集");
          return;
        }
        if (newName !== preset.name) renameQrActivePreset(preset.name, newName);
        saveQrActivePreset(newName, newSets);
        cfmToastr.success(
          `已更新激活分组「${newName}」（${newSets.length} 个快速回复集）`,
        );
        overlay.remove();
      });
    }



  return {
    getQrSetNames,
    getExistingQrSetNameSet,
    filterExistingQrSetNames,
    sanitizeQrActivePresetState,
    getActiveQrSets,
    toggleQrSetActivation,
    applyQrPreset,
    applyQrMultiActivation,
    openQrSetEditor,
    getQrActivePresets,
    saveQrActivePreset,
    deleteQrActivePreset,
    renameQrActivePreset,
    setQrPresetScope,
    unapplyQrPresetIndex,
    syncQrPresetTrackingForManualToggle,
    bindQrPresetToChar,
    bindQrPresetToChat,
    bindQrPresetToPreset,
    unbindQrPresetFromChar,
    unbindQrPresetFromChat,
    unbindQrPresetFromPreset,
    getQrAutoApplyPresetIndices,
    autoApplyQrPresets,
    getQrPresetBindSummary,
    showQrPresetPanel,
    showQrPresetEditPopup,
  };
}
