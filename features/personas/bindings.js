// Persona 绑定层：承接 persona 与当前聊天记录之间的绑定状态读取、同步、摘要展示和保存，避免该逻辑散落在世界书自动应用或聊天记录模块中。

export function createPersonaBindingsApiCore(deps) {
  function getPersonaChatBindingsStore() {
    deps.ensureSettings();
    const settings = deps.extensionSettings[deps.extensionName];
    if (
      !settings.personaChatBindings ||
      typeof settings.personaChatBindings !== "object"
    ) {
      settings.personaChatBindings = {};
    }
    return settings.personaChatBindings;
  }

  function getPersonaChatBindKeys(avatarId, includeBindKey = "") {
    const store = getPersonaChatBindingsStore();
    const avatarKey = String(avatarId || "");
    const saved = Array.isArray(store[avatarKey]) ? [...store[avatarKey]] : [];
    const chatMeta =
      deps.getContext().chatMetadata ||
      deps.window.chat_metadata ||
      deps.window.chatMetadata ||
      {};
    const livePersonaAvatar = String(chatMeta?.persona || "");
    const liveBindKey =
      livePersonaAvatar && livePersonaAvatar === avatarKey
        ? String(deps.getCurrentChatBindKey() || "").trim()
        : "";
    const extras = [includeBindKey, liveBindKey]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    for (const extra of extras) {
      if (!saved.includes(extra)) saved.push(extra);
    }

    if (saved.length) {
      store[avatarKey] = [...new Set(saved)];
    }

    return [...new Set(saved)].filter(Boolean);
  }

  function syncPersonaChatBindingState(avatarId, bindKey, shouldBind) {
    if (!avatarId || !bindKey) return;
    const store = getPersonaChatBindingsStore();

    for (const key of Object.keys(store)) {
      const nextList = Array.isArray(store[key])
        ? store[key].filter((item) => item && item !== bindKey)
        : [];
      if (nextList.length) store[key] = nextList;
      else delete store[key];
    }

    if (shouldBind) {
      if (!Array.isArray(store[avatarId])) store[avatarId] = [];
      store[avatarId].push(bindKey);
      store[avatarId] = [...new Set(store[avatarId])];
    }

    deps.saveSettingsDebounced();
  }

  function buildPersonaChatBindHtml(avatarId, includeBindKey = "") {
    const bindKeys = getPersonaChatBindKeys(avatarId, includeBindKey);
    if (!bindKeys.length) return "";

    const chars = deps.getContext().characters || [];
    return bindKeys
      .map((bindKey) => {
        const parsed = deps.parseChatBindKey(bindKey);
        const ch = chars.find((c) => c.avatar === parsed.avatar);
        const charName = ch ? ch.name : parsed.avatar || "当前角色";
        const chatName = parsed.chatFileName || bindKey;
        const label = `${charName}-${chatName}`;
        return `<div><span class="cfm-persona-conn-tag" style="margin-left:6px;max-width:100%;white-space:normal;overflow:visible;text-overflow:clip;word-break:break-all;align-items:flex-start;"><i class="fa-solid fa-comments" style="margin-top:2px;flex:0 0 auto;"></i><span title="绑定聊天: ${deps.escapeHtml(label)}">${deps.escapeHtml(label)}</span></span></div>`;
      })
      .join("");
  }

  function ensurePersonaDescriptionEntry(avatarId) {
    const pu = deps.getContext().powerUserSettings;
    if (!pu) return null;
    if (!pu.persona_descriptions) pu.persona_descriptions = {};
    if (!pu.persona_descriptions[avatarId]) {
      pu.persona_descriptions[avatarId] = {
        description: "",
        title: "",
        connections: [],
      };
    }
    if (!Array.isArray(pu.persona_descriptions[avatarId].connections)) {
      pu.persona_descriptions[avatarId].connections = [];
    }
    if (typeof pu.persona_descriptions[avatarId].description !== "string") {
      pu.persona_descriptions[avatarId].description = "";
    }
    if (typeof pu.persona_descriptions[avatarId].title !== "string") {
      pu.persona_descriptions[avatarId].title = "";
    }
    return pu.persona_descriptions[avatarId];
  }

  function getPersonaBindStates(persona) {
    const ctx = deps.getContext();
    const pu = ctx.powerUserSettings || {};
    const desc = ensurePersonaDescriptionEntry(persona.avatarId) || {};
    const connections = Array.isArray(desc.connections) ? desc.connections : [];
    const chatMeta =
      ctx.chatMetadata || deps.window.chat_metadata || deps.window.chatMetadata || {};
    const currentChar = deps.getCurrentCharAvatar();
    const currentGroupId =
      ctx.groupId ?? ctx.selectedGroup ?? deps.window.selected_group ?? null;

    return {
      default: pu.default_persona === persona.avatarId,
      chat: String(chatMeta?.persona || "") === String(persona.avatarId || ""),
      character: connections.some(
        (c) =>
          c &&
          ((c.type === "character" && currentChar && c.id === currentChar) ||
            (c.type === "group" &&
              currentGroupId !== null &&
              String(c.id) === String(currentGroupId))),
      ),
    };
  }

  function triggerNativePersonaBind(persona, bindType) {
    if (!persona?.avatarId) return;
    const buttonMap = {
      default: "#lock_persona_default",
      character: "#lock_persona_to_char",
      chat: "#lock_user_name",
    };
    const selector = buttonMap[bindType];
    if (!selector) return;

    const currentChatBindKey =
      bindType === "chat" ? deps.getCurrentChatBindKey() : null;
    const wasChatBound =
      bindType === "chat" ? getPersonaBindStates(persona).chat : false;

    deps.selectPersona(persona.avatarId);
    deps.setTimeout(() => {
      const btn = deps.$(selector);
      if (!btn.length) {
        deps.cfmToastr.warning("未找到酒馆原生绑定按钮");
        return;
      }
      btn.trigger("click");
      deps.setTimeout(() => {
        if (bindType === "chat" && currentChatBindKey) {
          syncPersonaChatBindingState(
            persona.avatarId,
            currentChatBindKey,
            !wasChatBound,
          );
        }
        deps.refreshPersonaPanelView();
      }, 80);
    }, 30);
  }

  function hasNativePersonaToolEntry() {
    return !!deps.$("#pw_persona_tool_btn, .menu_button[title='打开设定生成器']")
      .length;
  }

  function triggerNativePersonaTool(persona) {
    if (!persona?.avatarId) return;

    const bringNativePersonaToolPopupToFront = () => {
      const shadow = deps.$("#shadow_popup");
      const popup = deps.$("#dialogue_popup");
      const holder = deps.$("#dialogue_popup_holder");
      const cfmOverlayZ = Number.parseInt(deps.$("#cfm-overlay").css("z-index"), 10);
      const baseZ = Number.isFinite(cfmOverlayZ) ? cfmOverlayZ + 2 : 10002;
      if (shadow.length) {
        shadow.css("z-index", baseZ);
      }
      if (popup.length) {
        popup.css("z-index", baseZ + 1);
      }
      if (holder.length) {
        holder.css("position", "relative");
        holder.css("z-index", baseZ + 2);
      }
      return shadow.length || popup.length || holder.length;
    };

    const scheduleBringToFront = () => {
      let attempts = 0;
      const maxAttempts = 12;
      const timer = deps.setInterval(() => {
        attempts += 1;
        const found = bringNativePersonaToolPopupToFront();
        if (found || attempts >= maxAttempts) {
          deps.clearInterval(timer);
        }
      }, 80);
    };

    const triggerToolBtn = () => {
      const btn = deps.$(
        "#pw_persona_tool_btn, .menu_button[title='打开设定生成器']",
      ).first();
      if (!btn.length) return false;
      btn.trigger("click");
      scheduleBringToFront();
      return true;
    };

    const openPersonaManager = () => {
      const btn = deps.$(
        "[title='用户设定管理'], [aria-label='用户设定管理'], [description='用户设定管理']",
      ).first();
      if (!btn.length) return false;
      btn.trigger("click");
      return true;
    };

    deps.selectPersona(persona.avatarId);
    deps.setTimeout(() => {
      if (triggerToolBtn()) return;
      if (!openPersonaManager()) {
        deps.cfmToastr.warning("未找到酒馆原生设定生成器按钮");
        return;
      }
      deps.setTimeout(() => {
        deps.selectPersona(persona.avatarId);
        deps.setTimeout(() => {
          if (!triggerToolBtn()) {
            deps.cfmToastr.warning("未找到酒馆原生设定生成器按钮");
          }
        }, 60);
      }, 120);
    }, 30);
  }

  return {
    getPersonaChatBindingsStore,
    getPersonaChatBindKeys,
    syncPersonaChatBindingState,
    buildPersonaChatBindHtml,
    ensurePersonaDescriptionEntry,
    getPersonaBindStates,
    triggerNativePersonaBind,
    hasNativePersonaToolEntry,
    triggerNativePersonaTool,
  };
}
