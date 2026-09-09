// Persona 资源视图协调层：承接 personas 资源页的树/列表视图协调、User 项操作入口、绑定信息展示入口与当前页刷新。

export function createPersonaViewApiCore(deps) {
  const getState = () => deps.state;

  function getPersonaCustomOrderStore() {
    deps.ensureSettings();
    const settings = deps.extensionSettings[deps.extensionName];
    if (!Array.isArray(settings.personaCustomOrder)) {
      settings.personaCustomOrder = [];
    }
    return settings.personaCustomOrder;
  }

  function syncPersonaCustomOrder(avatarIds = []) {
    const normalizedIds = [
      ...new Set(
        (Array.isArray(avatarIds) ? avatarIds : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    ];
    const currentOrder = getPersonaCustomOrderStore();
    const normalizedOrder = [
      ...new Set(
        currentOrder.map((id) => String(id || "").trim()).filter(Boolean),
      ),
    ];
    const nextOrder = normalizedOrder.filter((id) =>
      normalizedIds.includes(id),
    );
    for (const id of normalizedIds) {
      if (!nextOrder.includes(id)) nextOrder.push(id);
    }
    const changed =
      nextOrder.length !== currentOrder.length ||
      nextOrder.some(
        (id, idx) => id !== String(currentOrder[idx] || "").trim(),
      );
    if (changed) {
      deps.extensionSettings[deps.extensionName].personaCustomOrder = nextOrder;
      deps.saveSettingsDebounced();
    }
    return nextOrder;
  }

  function insertPersonaAfterInCustomOrder(sourceAvatarId, newAvatarId) {
    const sourceId = String(sourceAvatarId || "").trim();
    const targetId = String(newAvatarId || "").trim();
    if (!targetId) return;
    const order = [...getPersonaCustomOrderStore()]
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    const filtered = order.filter((id) => id !== targetId);
    const sourceIndex = filtered.indexOf(sourceId);
    if (sourceIndex === -1) filtered.push(targetId);
    else filtered.splice(sourceIndex + 1, 0, targetId);
    deps.extensionSettings[deps.extensionName].personaCustomOrder = filtered;
    deps.saveSettingsDebounced();
  }

  function removePersonaFromCustomOrder(avatarId) {
    const targetId = String(avatarId || "").trim();
    if (!targetId) return;
    const order = getPersonaCustomOrderStore();
    const nextOrder = order.filter(
      (id) => String(id || "").trim() !== targetId,
    );
    if (nextOrder.length === order.length) return;
    deps.extensionSettings[deps.extensionName].personaCustomOrder = nextOrder;
    deps.saveSettingsDebounced();
  }

  function buildDuplicatedPersonaName(baseName) {
    const pu = deps.getContext().powerUserSettings || {};
    const existingNames = new Set(
      Object.values(pu.personas || {})
        .map((name) => String(name || "").trim())
        .filter(Boolean),
    );
    const seed = String(baseName || "User").trim() || "User";
    let candidate = `${seed} 副本`;
    let idx = 2;
    while (existingNames.has(candidate)) {
      candidate = `${seed} 副本 ${idx}`;
      idx += 1;
    }
    return candidate;
  }

  async function getPersonaDuplicateAvatarPayload(avatarId) {
    const thumbUrl = deps.getThumbnailUrl("persona", avatarId);
    const candidateUrls = [thumbUrl, "img/user-default.png"].filter(Boolean);
    for (const url of candidateUrls) {
      try {
        const resp = await deps.fetch(url);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const type = blob.type || "image/png";
        let ext = "png";
        if (type.includes("jpeg") || type.includes("jpg")) ext = "jpg";
        else if (type.includes("webp")) ext = "webp";
        return { blob, type, ext };
      } catch (e) {
        deps.console.warn(`[CFM] 获取User头像资源失败: ${url}`, e);
      }
    }
    return null;
  }

  async function duplicatePersona(sourcePersona) {
    if (!sourcePersona || !sourcePersona.avatarId) return;
    const ctx = deps.getContext();
    const pu = ctx.powerUserSettings;
    if (!pu) {
      deps.cfmToastr.error("无法获取User设定数据");
      return;
    }
    if (!pu.personas) pu.personas = {};
    if (!pu.persona_descriptions) pu.persona_descriptions = {};

    const avatarPayload = await getPersonaDuplicateAvatarPayload(
      sourcePersona.avatarId,
    );
    if (!avatarPayload) {
      deps.cfmToastr.error("复制User失败：无法获取头像资源");
      return;
    }

    const makeIdBase = () =>
      typeof ctx.uuidv4 === "function"
        ? ctx.uuidv4()
        : `persona-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let newAvatarId = `${makeIdBase()}.${avatarPayload.ext}`;
    while (pu.personas[newAvatarId]) {
      newAvatarId = `${makeIdBase()}.${avatarPayload.ext}`;
    }

    const uploadFile = new deps.File(
      [avatarPayload.blob],
      `avatar.${avatarPayload.ext}`,
      {
        type: avatarPayload.type,
      },
    );
    const formData = new deps.FormData();
    formData.append("avatar", uploadFile);
    formData.append("overwrite_name", newAvatarId);

    const uploadResp = await deps.fetch("/api/avatars/upload", {
      method: "POST",
      headers: ctx.getRequestHeaders({ omitContentType: true }),
      body: formData,
    });
    if (!uploadResp.ok) {
      deps.cfmToastr.error("复制User失败：头像创建失败");
      return;
    }

    pu.personas[newAvatarId] = buildDuplicatedPersonaName(sourcePersona.name);
    pu.persona_descriptions[newAvatarId] = {
      description: String(sourcePersona.description || ""),
      title: "",
      connections: [],
    };

    const groups = deps.getResourceGroups("personas");
    if (groups && groups[sourcePersona.avatarId]) {
      groups[newAvatarId] = groups[sourcePersona.avatarId];
    }

    insertPersonaAfterInCustomOrder(sourcePersona.avatarId, newAvatarId);
    deps.saveSettingsDebounced();
    refreshPersonaPanelView();
    deps.flashDraggedElement(
      `.cfm-row[data-avatar-id="${deps.$.escapeSelector(newAvatarId)}"]`,
      300,
    );
    deps.cfmToastr.success(`已复制User「${sourcePersona.name || "[未命名User]"}」`);
  }

  async function getCurrentPersonas(forceRefresh = false) {
    const state = getState();
    const now = Date.now();
    if (
      !forceRefresh &&
      Array.isArray(state._personaListCache) &&
      now - state._personaListCacheTime < deps.PERSONA_LIST_CACHE_TTL
    ) {
      return state._personaListCache;
    }
    try {
      const resp = await deps.fetch("/api/avatars/get", {
        method: "POST",
        headers: deps.getContext().getRequestHeaders({ omitContentType: true }),
      });
      if (!resp.ok) return [];
      const avatarIds = await resp.json();
      if (!Array.isArray(avatarIds)) return [];
      const pu = deps.getContext().powerUserSettings;
      if (!pu) return [];
      const orderedAvatarIds = syncPersonaCustomOrder(avatarIds);
      const personas = orderedAvatarIds.map((id) => ({
        avatarId: id,
        name: (pu.personas && pu.personas[id]) || "[未命名User]",
        description:
          (pu.persona_descriptions &&
            pu.persona_descriptions[id] &&
            pu.persona_descriptions[id].description) ||
          "",
        title:
          (pu.persona_descriptions &&
            pu.persona_descriptions[id] &&
            pu.persona_descriptions[id].title) ||
          "",
        connections:
          (pu.persona_descriptions &&
            pu.persona_descriptions[id] &&
            pu.persona_descriptions[id].connections) ||
          [],
      }));
      state._personaListCache = personas;
      state._personaListCacheTime = now;
      return personas;
    } catch (e) {
      deps.console.error("[CFM] 获取User列表失败", e);
      return Array.isArray(state._personaListCache)
        ? state._personaListCache
        : [];
    }
  }

  function resolvePersonaConnections(connections) {
    if (!connections || !connections.length) return [];
    const ctx = deps.getContext();
    const chars = ctx.characters || [];
    const grps = ctx.groups || [];
    return connections
      .map((conn) => {
        if (conn.type === "character") {
          const ch = chars.find((c) => c.avatar === conn.id);
          return {
            type: "character",
            name: ch ? ch.name : conn.id,
            avatar: conn.id,
          };
        }
        if (conn.type === "group") {
          const g = grps.find((g) => g.id === conn.id);
          return { type: "group", name: g ? g.name : conn.id, avatar: null };
        }
        return null;
      })
      .filter(Boolean);
  }

  function buildPersonaConnHtml(connections) {
    const resolved = resolvePersonaConnections(connections);
    if (!resolved.length) return "";
    return resolved
      .map((c) => {
        const icon = c.type === "group" ? "fa-users" : "fa-user";
        return `<span class="cfm-persona-conn-tag" title="绑定${c.type === "group" ? "群组" : "角色"}: ${deps.escapeHtml(c.name)}"><i class="fa-solid ${icon}"></i>${deps.escapeHtml(c.name)}</span>`;
      })
      .join("");
  }

  function selectPersona(avatarId) {
    const avatarBlock = deps.$(
      `.avatar-container[data-avatar-id="${avatarId}"]`,
    );
    if (avatarBlock.length > 0) {
      avatarBlock.find(".avatar").trigger("click");
    } else {
      const block = deps.$("#user_avatar_block").find(
        `[data-avatar-id='${avatarId}']`,
      );
      if (block.length) {
        block.trigger("click");
      }
    }
  }

  function refreshPersonaPanelView() {
    const q = String(deps.$("#cfm-persona-global-search").val() || "").trim();
    if (q) executePersonaSearch();
    else deps.renderPersonasView();
  }

  function executePersonaSearch() {
    const state = getState();
    const query = deps.$("#cfm-persona-global-search").val();
    if (!query || !query.trim()) {
      deps.renderPersonasView();
      return;
    }
    const q = query.trim().toLowerCase();
    const scope = deps.$("#cfm-persona-search-scope").val() || "current";
    const searchType = deps.$("#cfm-persona-search-type").val() || "persona";
    const rightList = deps.$("#cfm-persona-right-list");
    const pathEl = deps.$("#cfm-persona-rh-path");
    const countEl = deps.$("#cfm-persona-rh-count");
    rightList.empty();

    if (searchType === "folder") {
      const folders = deps.getResFolderIds("personas");
      let matchedIds;
      if (
        scope === "current" &&
        state.selectedPersonaFolder &&
        state.selectedPersonaFolder !== "__ungrouped__" &&
        state.selectedPersonaFolder !== "__favorites__" &&
        deps.getResFolderTree("personas")[state.selectedPersonaFolder]
      ) {
        const collectDesc = (pid) => {
          let r = [pid];
          for (const c of deps.getResChildFolders("personas", pid))
            r = r.concat(collectDesc(c));
          return r;
        };
        const descendants = collectDesc(state.selectedPersonaFolder);
        matchedIds = descendants.filter((f) =>
          deps.fuzzyMatch(
            q,
            deps
              .getFolderSelfPathNames("personas", f)
              .map((s) => s.toLowerCase()),
          ),
        );
      } else {
        matchedIds = folders.filter((f) =>
          deps.fuzzyMatch(
            q,
            deps
              .getFolderSelfPathNames("personas", f)
              .map((s) => s.toLowerCase()),
          ),
        );
      }
      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matchedIds.length} 个结果`);
      if (matchedIds.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的文件夹</div>');
        return;
      }
      for (const fname of matchedIds) {
        const folderPath = deps
          .getResFolderPath("personas", fname)
          .map((id) => deps.getResFolderDisplayName("personas", id))
          .join(" › ");
        const childCount = deps.countResItemsRecursive("personas", fname);
        const row = deps.$(`
          <div class="cfm-row cfm-row-folder cfm-search-result">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${deps.escapeHtml(deps.getResFolderDisplayName("personas", fname))}<div class="cfm-row-folder-path">${deps.escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个User</div>
          </div>
        `);
        row.on("click", () => {
          const path = deps.getResFolderPath("personas", fname);
          for (const pid of path) state.personaExpandedNodes.add(pid);
          state.selectedPersonaFolder = fname;
          deps.$("#cfm-persona-global-search").val("");
          deps.renderPersonasView();
        });
        rightList.append(row);
      }
      return;
    }

    getCurrentPersonas().then((personas) => {
      const groups = deps.getResourceGroups("personas");
      const tree = deps.getResFolderTree("personas");
      let searchPool = [];
      if (scope === "current" && state.selectedPersonaFolder) {
        if (state.selectedPersonaFolder === "__favorites__") {
          const favs = deps.getResFavorites("personas");
          searchPool = personas.filter((p) => favs.includes(p.avatarId));
        } else if (state.selectedPersonaFolder === "__ungrouped__") {
          searchPool = personas.filter(
            (p) => !groups[p.avatarId] || !tree[groups[p.avatarId]],
          );
        } else if (tree[state.selectedPersonaFolder]) {
          const collectFolderIds = (pid) => {
            let r = [pid];
            for (const c of deps.getResChildFolders("personas", pid))
              r = r.concat(collectFolderIds(c));
            return r;
          };
          const allFids = collectFolderIds(state.selectedPersonaFolder);
          searchPool = personas.filter((p) =>
            allFids.includes(groups[p.avatarId]),
          );
        } else {
          searchPool = personas.filter(
            (p) => groups[p.avatarId] === state.selectedPersonaFolder,
          );
        }
      } else {
        searchPool = personas;
      }

      const matched = searchPool.filter((p) => {
        const connNames = resolvePersonaConnections(p.connections).map((c) =>
          (c.name || "").toLowerCase(),
        );
        const pool = [
          (p.name || "").toLowerCase(),
          (p.description || "").toLowerCase(),
          (deps.getPersonaNote(p.avatarId) || "").toLowerCase(),
          ...deps.getResFolderPathNames("personas", p.avatarId).map((s) =>
            s.toLowerCase(),
          ),
          ...connNames,
        ];
        return deps.fuzzyMatch(q, pool);
      });

      pathEl.text(`搜索User: "${query.trim()}"`);
      countEl.text(`${matched.length} 个结果`);

      if (matched.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的User</div>');
        return;
      }

      const currentUserAvatar =
        deps.$("#user_avatar_block .avatar-container.selected").attr(
          "data-avatar-id",
        ) || null;

      for (const p of matched) {
        const isActive = p.avatarId === currentUserAvatar;
        const bindStates = deps.getPersonaBindStates(p);
        const isDefaultPersona = !!bindStates.default;
        const fav = deps.isResFavorite("personas", p.avatarId);
        const thumbUrl = deps.getThumbnailUrl("persona", p.avatarId);
        const personaNote = deps.getPersonaNote(p.avatarId);
        const noteHtml = personaNote
          ? `<span class="cfm-theme-note" title="备注: ${deps.escapeHtml(personaNote)}">${deps.escapeHtml(personaNote)}</span>`
          : "";
        const connHtml = buildPersonaConnHtml(p.connections);
        const folderPathNames = deps.getResFolderPathNames(
          "personas",
          p.avatarId,
        );
        const pathHtml =
          folderPathNames.length > 0
            ? `<span class="cfm-row-folder-path">${deps.escapeHtml(folderPathNames.join(" › "))}</span>`
            : "";
        const isExpanded = state.personaItemExpandedIds.has(p.avatarId);
        const detailToggleHtml = `<div class="cfm-char-detail-toggle cfm-persona-toggle" title="展开/折叠User设定"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></div>`;
        const row = deps.$(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""}" data-avatar-id="${deps.escapeHtml(p.avatarId)}" data-res-id="${deps.escapeHtml(p.avatarId)}" draggable="true">
            <div class="cfm-row-icon cfm-persona-avatar ${isDefaultPersona ? "cfm-persona-avatar-default" : ""}" title="${isDefaultPersona ? "默认 User" : ""}"><img src="${thumbUrl}" alt="avatar" onerror="this.src='/img/ai4.png'"></div>
            <div class="cfm-row-name"><span class="cfm-char-name-inline cfm-persona-name-inline">${detailToggleHtml}<span class="cfm-persona-name-text">${deps.escapeHtml(p.name)}</span></span>${p.title ? `<span class="cfm-persona-title">${deps.escapeHtml(p.title)}</span>` : ""}${noteHtml}${connHtml}${pathHtml}</div>
            <div class="cfm-row-edit-btn cfm-row-copy-btn" title="复制人设"><i class="fa-solid fa-copy"></i></div>
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        deps.bindTouchSafeTap(row.find(".cfm-row-copy-btn"), async () => {
          await duplicatePersona(p);
        });
        deps.bindTouchSafeTap(row.find(".cfm-row-star"), () => {
          deps.toggleResFavorite("personas", p.avatarId);
          executePersonaSearch();
        });
        deps.bindTouchSafeTap(row.find(".cfm-persona-toggle"), () => {
          if (state.personaItemExpandedIds.has(p.avatarId)) {
            state.personaItemExpandedIds.delete(p.avatarId);
            row.next(".cfm-chat-sublist").slideUp(150, function () {
              deps.$(this).remove();
            });
            row
              .find(".cfm-persona-toggle i")
              .removeClass("fa-caret-down")
              .addClass("fa-caret-right");
          } else {
            state.personaItemExpandedIds.add(p.avatarId);
            row
              .find(".cfm-persona-toggle i")
              .removeClass("fa-caret-right")
              .addClass("fa-caret-down");
            deps.renderPersonaDetailSubList(row, p);
            row.next(".cfm-chat-sublist").hide().slideDown(150);
          }
        });
        row.on("click", (e) => {
          if (
            deps
              .$(e.target)
              .closest(
                ".cfm-row-star, .cfm-row-copy-btn, .cfm-persona-toggle",
              ).length
          )
            return;
          selectPersona(p.avatarId);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          deps.cfmToastr.success(`已切换到User「${p.name}」`);
        });
        row.on("dragstart", (e) => {
          deps.pcDragStart(e, {
            type: "persona",
            name: p.name,
            avatarId: p.avatarId,
          });
        });
        row.on("dragend", () => deps.pcDragEnd());
        rightList.append(row);
        if (state.personaItemExpandedIds.has(p.avatarId)) {
          deps.renderPersonaDetailSubList(row, p);
        }
      }
    });
  }

  return {
    getPersonaCustomOrderStore,
    syncPersonaCustomOrder,
    insertPersonaAfterInCustomOrder,
    removePersonaFromCustomOrder,
    buildDuplicatedPersonaName,
    getPersonaDuplicateAvatarPayload,
    duplicatePersona,
    getCurrentPersonas,
    resolvePersonaConnections,
    buildPersonaConnHtml,
    selectPersona,
    refreshPersonaPanelView,
    executePersonaSearch,
  };
}
