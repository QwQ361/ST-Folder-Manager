// 插件内备份导入层：承接 executeImport，将备份 JSON 按当前实际资源名称匹配恢复文件夹、分组、收藏、备注、绑定与外观数据。

export function createBackupImportApi(deps) {
  const {
    state,
    extensionName,
    extension_settings,
    getContext,
    getFolderTagIds,
    getFolderPath,
    getTagName,
    findOrCreateTag,
    saveConfig,
    getCharacters,
    moveCharToFolder,
    isFavorite,
    toggleFavorite,
    ensureResourceSettings,
    getResFolderTree,
    saveResTree,
    getCurrentPresets,
    getResFolderIds,
    setItemGroup,
    isResFavorite,
    toggleResFavorite,
    setPresetNote,
    getWorldInfoNames,
    setWorldInfoNote,
    getThemeNames,
    setThemeNote,
    setThemeBgBinding,
    getBackgroundNames,
    setBgNote,
    setBgOrientation,
    getCurrentPersonas,
    setPersonaNote,
    getRegexGlobalScripts,
    getResFavorites,
    getExistingQrSetNameSet,
    setQrNote,
  } = deps;

  async function executeImport(jsonData) {
    const report = {
      chars: { matched: 0, skipped: 0 },
      presets: { matched: 0, skipped: 0 },
      worldinfo: { matched: 0, skipped: 0 },
      themes: { matched: 0, skipped: 0 },
      backgrounds: { matched: 0, skipped: 0 },
      personas: { matched: 0, skipped: 0 },
      regex: { matched: 0, skipped: 0 },
      quickreply: { matched: 0, skipped: 0 },
      foldersCreated: 0,
      favoritesRestored: 0,
    };

    if (jsonData.chars) {
      const { folderTree, favorites, assignments } = jsonData.chars;
      const pathToTagId = {};

      if (folderTree) {
        const sortedFolders = [...folderTree].sort(
          (a, b) => a.path.length - b.path.length,
        );

        for (const folderDef of sortedFolders) {
          const path = folderDef.path;
          const pathKey = path.join("/");
          const displayName = path[path.length - 1];

          let parentTagId = null;
          if (path.length > 1) {
            const parentPathKey = path.slice(0, -1).join("/");
            parentTagId = pathToTagId[parentPathKey] || null;
          }

          let existingTagId = null;
          for (const tagId of getFolderTagIds()) {
            const existingPath = getFolderPath(tagId).map((id) =>
              getTagName(id),
            );
            if (existingPath.join("/") === pathKey) {
              existingTagId = tagId;
              break;
            }
          }

          if (existingTagId) {
            pathToTagId[pathKey] = existingTagId;
            if (folderDef.sortOrder !== undefined) {
              state.config.folders[existingTagId].sortOrder = folderDef.sortOrder;
            }
          } else {
            const { tag, displayName: dn } = findOrCreateTag(
              displayName,
              parentTagId,
            );
            state.config.folders[tag.id] = {
              parentId: parentTagId,
              sortOrder: folderDef.sortOrder ?? 0,
            };
            if (dn) state.config.folders[tag.id].displayName = dn;
            // 从排除列表中移除
            const _ex = extension_settings[extensionName].excludedTagIds;
            const _exi = _ex.indexOf(tag.id);
            if (_exi >= 0) _ex.splice(_exi, 1);
            pathToTagId[pathKey] = tag.id;
            report.foldersCreated++;
          }
        }
        saveConfig(state.config);
      }

      if (assignments) {
        const characters = getCharacters();
        const avatarSet = new Set(characters.map((c) => c.avatar));

        for (const [avatar, folderPath] of Object.entries(assignments)) {
          if (avatarSet.has(avatar)) {
            const pathKey = folderPath.join("/");
            const targetTagId = pathToTagId[pathKey];
            if (targetTagId) {
              moveCharToFolder(avatar, targetTagId);
              report.chars.matched++;
            } else {
              report.chars.skipped++;
            }
          } else {
            report.chars.skipped++;
          }
        }
      }

      if (favorites) {
        const characters = getCharacters();
        const avatarSet = new Set(characters.map((c) => c.avatar));
        for (const avatar of favorites) {
          if (avatarSet.has(avatar) && !isFavorite(avatar)) {
            toggleFavorite(avatar);
            report.favoritesRestored++;
          }
        }
      }
    }

    if (jsonData.presets) {
      const { folderTree, groups, favorites } = jsonData.presets;
      ensureResourceSettings();

      if (folderTree) {
        const existingTree = getResFolderTree("presets");
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
          }
        }
        saveResTree("presets");
      }

      if (groups) {
        const currentPresetsList = getCurrentPresets();
        const presetNames = new Set(currentPresetsList.map((p) => p.name));
        const existingFolderIds = new Set(getResFolderIds("presets"));

        for (const [presetName, folderName] of Object.entries(groups)) {
          if (
            presetNames.has(presetName) &&
            existingFolderIds.has(folderName)
          ) {
            setItemGroup("presets", presetName, folderName);
            report.presets.matched++;
          } else {
            report.presets.skipped++;
          }
        }
      }

      if (favorites) {
        const currentPresetsList = getCurrentPresets();
        const presetNames = new Set(currentPresetsList.map((p) => p.name));
        for (const name of favorites) {
          if (presetNames.has(name) && !isResFavorite("presets", name)) {
            toggleResFavorite("presets", name);
            report.favoritesRestored++;
          }
        }
      }

      // 恢复预设备注
      const presetNotes = jsonData.presets.notes;
      if (presetNotes && typeof presetNotes === "object") {
        const currentPresetsList = getCurrentPresets();
        const presetNameSet = new Set(currentPresetsList.map((p) => p.name));
        for (const [name, note] of Object.entries(presetNotes)) {
          if (presetNameSet.has(name) && note) {
            setPresetNote(name, note);
          }
        }
      }
    }

    if (jsonData.worldinfo) {
      const { folderTree, groups, favorites } = jsonData.worldinfo;
      ensureResourceSettings();

      if (folderTree) {
        const existingTree = getResFolderTree("worldinfo");
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
          }
        }
        saveResTree("worldinfo");
      }

      if (groups) {
        const wiNames = await getWorldInfoNames(true);
        const wiNameSet = new Set(wiNames);
        const existingFolderIds = new Set(getResFolderIds("worldinfo"));

        for (const [wiName, folderName] of Object.entries(groups)) {
          if (wiNameSet.has(wiName) && existingFolderIds.has(folderName)) {
            setItemGroup("worldinfo", wiName, folderName);
            report.worldinfo.matched++;
          } else {
            report.worldinfo.skipped++;
          }
        }
      }

      if (favorites) {
        const wiNames = await getWorldInfoNames();
        const wiNameSet = new Set(wiNames);
        for (const name of favorites) {
          if (wiNameSet.has(name) && !isResFavorite("worldinfo", name)) {
            toggleResFavorite("worldinfo", name);
            report.favoritesRestored++;
          }
        }
      }

      // 恢复世界书备注
      const wiNotes = jsonData.worldinfo.notes;
      if (wiNotes && typeof wiNotes === "object") {
        const wiNames = await getWorldInfoNames();
        const wiNameSet = new Set(wiNames);
        for (const [name, note] of Object.entries(wiNotes)) {
          if (wiNameSet.has(name) && note) {
            setWorldInfoNote(name, note);
          }
        }
      }
    }

    if (jsonData.themes) {
      const { folderTree, groups, favorites } = jsonData.themes;
      ensureResourceSettings();

      if (folderTree) {
        const existingTree = getResFolderTree("themes");
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
          }
        }
        saveResTree("themes");
      }

      if (groups) {
        const themeNameList = getThemeNames();
        const themeNameSet = new Set(themeNameList);
        const existingFolderIds = new Set(getResFolderIds("themes"));

        for (const [themeName, folderName] of Object.entries(groups)) {
          if (
            themeNameSet.has(themeName) &&
            existingFolderIds.has(folderName)
          ) {
            setItemGroup("themes", themeName, folderName);
            report.themes.matched++;
          } else {
            report.themes.skipped++;
          }
        }
      }

      if (favorites) {
        const themeNameList = getThemeNames();
        const themeNameSet = new Set(themeNameList);
        for (const name of favorites) {
          if (themeNameSet.has(name) && !isResFavorite("themes", name)) {
            toggleResFavorite("themes", name);
            report.favoritesRestored++;
          }
        }
      }

      // 恢复备注
      const notes = jsonData.themes.notes;
      if (notes && typeof notes === "object") {
        const themeNameList = getThemeNames();
        const themeNameSet = new Set(themeNameList);
        for (const [name, note] of Object.entries(notes)) {
          if (themeNameSet.has(name) && note) {
            setThemeNote(name, note);
          }
        }
      }

      // 恢复背景绑定
      const bgBindings = jsonData.themes.bgBindings;
      if (bgBindings && typeof bgBindings === "object") {
        const themeNameList = getThemeNames();
        const themeNameSet = new Set(themeNameList);
        for (const [name, bgfile] of Object.entries(bgBindings)) {
          if (themeNameSet.has(name) && bgfile) {
            setThemeBgBinding(name, bgfile);
          }
        }
      }

      // 恢复默认背景
      if (jsonData.themes.defaultBackground) {
        extension_settings[extensionName].defaultBackground =
          jsonData.themes.defaultBackground;
        getContext().saveSettingsDebounced();
      }
    }

    if (jsonData.backgrounds) {
      const { folderTree, groups, favorites } = jsonData.backgrounds;
      ensureResourceSettings();

      if (folderTree) {
        const existingTree = getResFolderTree("backgrounds");
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
          }
        }
        saveResTree("backgrounds");
      }

      if (groups) {
        const bgNameList = getBackgroundNames();
        const bgNameSet = new Set(bgNameList);
        const existingFolderIds = new Set(getResFolderIds("backgrounds"));

        for (const [bgName, folderName] of Object.entries(groups)) {
          if (bgNameSet.has(bgName) && existingFolderIds.has(folderName)) {
            setItemGroup("backgrounds", bgName, folderName);
            report.backgrounds.matched++;
          } else {
            report.backgrounds.skipped++;
          }
        }
      }

      if (favorites) {
        const bgNameList = getBackgroundNames();
        const bgNameSet = new Set(bgNameList);
        for (const name of favorites) {
          if (bgNameSet.has(name) && !isResFavorite("backgrounds", name)) {
            toggleResFavorite("backgrounds", name);
            report.favoritesRestored++;
          }
        }
      }

      const bgNotes = jsonData.backgrounds.notes;
      if (bgNotes && typeof bgNotes === "object") {
        const bgNameList = getBackgroundNames();
        const bgNameSet = new Set(bgNameList);
        for (const [name, note] of Object.entries(bgNotes)) {
          if (bgNameSet.has(name) && note) {
            setBgNote(name, note);
          }
        }
      }
      // 恢复方向数据
      const bgOrients = jsonData.backgrounds.orientations;
      if (bgOrients && typeof bgOrients === "object") {
        const bgNameList = getBackgroundNames();
        const bgNameSet = new Set(bgNameList);
        for (const [name, orient] of Object.entries(bgOrients)) {
          if (bgNameSet.has(name) && orient) {
            setBgOrientation(name, orient);
          }
        }
      }
    }

    if (jsonData.personas) {
      const { folderTree, groups, favorites } = jsonData.personas;
      ensureResourceSettings();

      if (folderTree) {
        const existingTree = getResFolderTree("personas");
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
          }
        }
        saveResTree("personas");
      }

      if (groups) {
        const personasList = await getCurrentPersonas();
        const avatarIdSet = new Set(personasList.map((p) => p.avatarId));
        const existingFolderIds = new Set(getResFolderIds("personas"));

        for (const [avatarId, folderName] of Object.entries(groups)) {
          if (avatarIdSet.has(avatarId) && existingFolderIds.has(folderName)) {
            setItemGroup("personas", avatarId, folderName);
            report.personas.matched++;
          } else {
            report.personas.skipped++;
          }
        }
      }

      if (favorites) {
        const personasList = await getCurrentPersonas();
        const avatarIdSet = new Set(personasList.map((p) => p.avatarId));
        for (const avatarId of favorites) {
          if (
            avatarIdSet.has(avatarId) &&
            !isResFavorite("personas", avatarId)
          ) {
            toggleResFavorite("personas", avatarId);
            report.favoritesRestored++;
          }
        }
      }

      // 恢复User备注
      const personaNotes = jsonData.personas.notes;
      if (personaNotes && typeof personaNotes === "object") {
        const personasList = await getCurrentPersonas();
        const avatarIdSet = new Set(personasList.map((p) => p.avatarId));
        for (const [avatarId, note] of Object.entries(personaNotes)) {
          if (avatarIdSet.has(avatarId) && note) {
            setPersonaNote(avatarId, note);
          }
        }
      }
    }

    if (jsonData.regex) {
      const { folderTree, assignments, favorites } = jsonData.regex;
      ensureResourceSettings();
      let regexChanged = false;

      if (folderTree) {
        const existingTree =
          extension_settings[extensionName].regexFolderTree || {};
        extension_settings[extensionName].regexFolderTree = existingTree;
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
            regexChanged = true;
          }
        }
      }

      const globalScripts = getRegexGlobalScripts();
      const scriptNameToIds = new Map();
      for (const script of globalScripts) {
        const scriptName = String(script?.scriptName || "").trim();
        const scriptId = String(script?.id || "").trim();
        if (!scriptName || !scriptId) continue;
        if (!scriptNameToIds.has(scriptName))
          scriptNameToIds.set(scriptName, []);
        scriptNameToIds.get(scriptName).push(scriptId);
      }

      if (assignments) {
        const existingFolderIds = new Set(
          Object.keys(extension_settings[extensionName].regexFolderTree || {}),
        );
        const currentGroups = {
          ...(extension_settings[extensionName].regexGlobalGroups || {}),
        };

        for (const [scriptName, folderId] of Object.entries(assignments)) {
          const matchedIds =
            scriptNameToIds.get(String(scriptName || "").trim()) || [];
          if (matchedIds.length > 0 && existingFolderIds.has(folderId)) {
            for (const scriptId of matchedIds)
              currentGroups[scriptId] = folderId;
            report.regex.matched += matchedIds.length;
            regexChanged = true;
          } else {
            report.regex.skipped++;
          }
        }

        extension_settings[extensionName].regexGlobalGroups = currentGroups;
      }

      if (favorites) {
        const currentFavs = new Set(getResFavorites("regex"));
        for (const scriptName of favorites) {
          const matchedIds =
            scriptNameToIds.get(String(scriptName || "").trim()) || [];
          for (const scriptId of matchedIds) {
            if (!currentFavs.has(scriptId)) {
              currentFavs.add(scriptId);
              report.favoritesRestored++;
              regexChanged = true;
            }
          }
        }
        extension_settings[extensionName].regexFavorites = [...currentFavs];
      }

      if (regexChanged) {
        getContext().saveSettingsDebounced();
      }
    }

    if (jsonData.quickreply) {
      const { folderTree, groups, favorites } = jsonData.quickreply;
      ensureResourceSettings();

      if (folderTree) {
        const existingTree = getResFolderTree("quickreply");
        for (const [folderId, folderData] of Object.entries(folderTree)) {
          if (!existingTree[folderId]) {
            existingTree[folderId] = { ...folderData };
            report.foldersCreated++;
          }
        }
        saveResTree("quickreply");
      }

      if (groups) {
        const qrNameSet = getExistingQrSetNameSet();
        const existingFolderIds = new Set(getResFolderIds("quickreply"));

        for (const [setName, folderName] of Object.entries(groups)) {
          if (qrNameSet.has(setName) && existingFolderIds.has(folderName)) {
            setItemGroup("quickreply", setName, folderName);
            report.quickreply.matched++;
          } else {
            report.quickreply.skipped++;
          }
        }
      }

      if (favorites) {
        const qrNameSet = getExistingQrSetNameSet();
        for (const name of favorites) {
          if (qrNameSet.has(name) && !isResFavorite("quickreply", name)) {
            toggleResFavorite("quickreply", name);
            report.favoritesRestored++;
          }
        }
      }

      const qrNotes = jsonData.quickreply.notes;
      if (qrNotes && typeof qrNotes === "object") {
        const qrNameSet = getExistingQrSetNameSet();
        for (const [name, note] of Object.entries(qrNotes)) {
          if (qrNameSet.has(name) && note) {
            setQrNote(name, note);
          }
        }
      }
    }

    return report;
  }
  return { executeImport };
}
