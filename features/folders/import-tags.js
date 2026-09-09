// 标签导入与同步辅助层：负责标签自动导入、会话高亮状态和从酒馆系统移除标签。

export function createTagImportController(deps) {
  let sessionNewlyImportedIds = [];

  function autoImportAllTags() {
    const settings = deps.getSettings();
    if (settings.firstInitDone) return;
    settings.firstInitDone = true;
    if (!settings.autoImportTags) {
      deps.saveSettingsDebounced();
      return;
    }
    const tags = deps.getTagList();
    const existingIds = Object.keys(settings.folders);
    const excludedSet = new Set(settings.excludedTagIds || []);
    let imported = 0;
    for (const tag of tags) {
      if (!existingIds.includes(tag.id) && !excludedSet.has(tag.id)) {
        settings.folders[tag.id] = {
          parentId: null,
        };
        imported++;
      }
    }
    deps.saveSettingsDebounced();
    if (imported > 0) {
      deps.log(
        `[${deps.extensionName}] 首次加载：自动导入 ${imported} 个标签为文件夹`,
      );
      deps.toastr.info(
        `已自动导入 ${imported} 个标签为文件夹`,
        "酒馆资源管理器",
        {
          timeOut: 4000,
        },
      );
    }
  }

  function detectAndImportNewTags() {
    const settings = deps.getSettings();
    if (!settings.autoImportTags) {
      sessionNewlyImportedIds = [];
      return;
    }
    const config = deps.getConfig();
    const tags = deps.getTagList();
    const existingIds = Object.keys(config.folders);
    const excludedSet = new Set(settings.excludedTagIds || []);
    const newIds = [];
    for (const tag of tags) {
      if (!existingIds.includes(tag.id) && !excludedSet.has(tag.id)) {
        config.folders[tag.id] = { parentId: null };
        newIds.push(tag.id);
      }
    }
    if (newIds.length > 0) {
      deps.saveConfig(config);
      sessionNewlyImportedIds = newIds;
      deps.toastr.info(
        `检测到 ${newIds.length} 个新标签，已自动导入为顶级文件夹`,
        "酒馆资源管理器",
        { timeOut: 3000 },
      );
    } else {
      sessionNewlyImportedIds = [];
    }
  }

  function clearNewlyImportedHighlight() {
    sessionNewlyImportedIds = [];
  }

  function isNewlyImported(tagId) {
    return sessionNewlyImportedIds.includes(tagId);
  }

  function oneClickImportAllTags() {
    const settings = deps.getSettings();
    const config = deps.getConfig();
    const tags = deps.getTagList();
    const existingIds = deps.getFolderTagIds();
    const excluded = settings.excludedTagIds || [];
    let imported = 0;
    for (const tag of tags) {
      if (existingIds.includes(tag.id)) {
        continue;
      }
      config.folders[tag.id] = { parentId: null };
      const exIdx = excluded.indexOf(tag.id);
      if (exIdx >= 0) excluded.splice(exIdx, 1);
      imported++;
    }
    if (imported > 0) {
      deps.saveConfig(config);
      deps.saveSettingsDebounced();
    }
    deps.toastr.success(`已导入 ${imported} 个标签`);
    return imported;
  }

  function deleteTagFromSystem(tagId) {
    const tags = deps.getContext().tags;
    const tagMap = deps.getTagMap();
    const idx = tags.findIndex((tag) => tag.id === tagId);
    if (idx >= 0) tags.splice(idx, 1);
    for (const avatar of Object.keys(tagMap)) {
      const charTags = tagMap[avatar];
      if (charTags) {
        const tidx = charTags.indexOf(tagId);
        if (tidx >= 0) charTags.splice(tidx, 1);
      }
    }
  }

  return {
    autoImportAllTags,
    detectAndImportNewTags,
    clearNewlyImportedHighlight,
    isNewlyImported,
    oneClickImportAllTags,
    deleteTagFromSystem,
  };
}
