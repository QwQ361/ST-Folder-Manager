// 酒馆资源管理器 - Edge收藏夹风格双栏布局
jQuery(async () => {
  const extensionName = "ST-Char-Folder-Manager";
  const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
  const STORAGE_KEY_BTN_POS = "cfm-button-pos";
  const STORAGE_KEY = "cfm-folder-config"; // legacy

  // ==================== 资源类型管理 ====================
  let currentResourceType = "chars"; // 'chars' | 'presets' | 'worldinfo'

  // 预设/世界书的简单分组存储
  // 结构: { [itemName]: folderName | null }
  function ensureResourceSettings() {
    if (!extension_settings[extensionName].presetGroups)
      extension_settings[extensionName].presetGroups = {};
    if (!extension_settings[extensionName].worldInfoGroups)
      extension_settings[extensionName].worldInfoGroups = {};
    // 迁移旧的 flat resourceFolders 到 tree 结构
    if (!extension_settings[extensionName].resourceFolderTree) {
      extension_settings[extensionName].resourceFolderTree = {
        presets: {},
        worldinfo: {},
      };
      // 迁移旧数据
      const oldFolders = extension_settings[extensionName].resourceFolders;
      if (oldFolders) {
        for (const type of ["presets", "worldinfo"]) {
          const arr = oldFolders[type] || [];
          arr.forEach((name, i) => {
            extension_settings[extensionName].resourceFolderTree[type][name] = {
              parentId: null,
              sortOrder: i + 1,
            };
          });
        }
        delete extension_settings[extensionName].resourceFolders;
        getContext().saveSettingsDebounced();
      }
    }
    if (!extension_settings[extensionName].resourceFolderTree.presets)
      extension_settings[extensionName].resourceFolderTree.presets = {};
    if (!extension_settings[extensionName].resourceFolderTree.worldinfo)
      extension_settings[extensionName].resourceFolderTree.worldinfo = {};
  }

  // ==================== 资源文件夹树模型 ====================
  function getResFolderTree(type) {
    ensureResourceSettings();
    return extension_settings[extensionName].resourceFolderTree[type];
  }
  function saveResTree(type) {
    getContext().saveSettingsDebounced();
  }
  function getResFolderIds(type) {
    return Object.keys(getResFolderTree(type));
  }
  function getResFolderName(type, folderId) {
    return folderId; // folder name IS the id
  }
  function getResFolderDisplayName(type, folderId) {
    const tree = getResFolderTree(type);
    return tree[folderId]?.displayName || folderId;
  }
  function getResTopLevelFolders(type) {
    const tree = getResFolderTree(type);
    return Object.keys(tree).filter((id) => !tree[id].parentId);
  }
  function getResChildFolders(type, parentId) {
    const tree = getResFolderTree(type);
    return Object.keys(tree).filter((id) => tree[id].parentId === parentId);
  }
  function sortResFolders(type, folderIds) {
    const tree = getResFolderTree(type);
    return [...folderIds].sort((a, b) => {
      const oa = tree[a]?.sortOrder ?? 0;
      const ob = tree[b]?.sortOrder ?? 0;
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b, "zh-CN");
    });
  }
  function wouldCreateResCycle(type, folderId, parentId) {
    const tree = getResFolderTree(type);
    let current = parentId;
    const visited = new Set();
    while (current) {
      if (current === folderId) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = tree[current]?.parentId || null;
    }
    return false;
  }
  function getResFolderPath(type, folderId) {
    const tree = getResFolderTree(type);
    const path = [];
    let current = folderId;
    const visited = new Set();
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      path.unshift(current);
      current = tree[current]?.parentId || null;
    }
    return path;
  }
  function getResItemsInFolder(type, folderId) {
    const groups = getResourceGroups(type);
    const childFolderIds = getResChildFolders(type, folderId);
    const items = [];
    for (const [itemName, grp] of Object.entries(groups)) {
      if (grp === folderId && !childFolderIds.includes(grp)) {
        items.push(itemName);
      }
    }
    // 对于预设，返回匹配的预设对象；对于世界书，返回名称
    return items;
  }
  function countResItemsRecursive(type, folderId) {
    const groups = getResourceGroups(type);
    let count = 0;
    for (const val of Object.values(groups)) {
      if (val === folderId) count++;
    }
    for (const childId of getResChildFolders(type, folderId)) {
      count += countResItemsRecursive(type, childId);
    }
    return count;
  }
  function reorderResFolder(type, folderId, newParentId, insertBeforeId) {
    const tree = getResFolderTree(type);
    tree[folderId].parentId = newParentId;
    const siblings = getResChildFolders(type, newParentId);
    const others = sortResFolders(
      type,
      siblings.filter((id) => id !== folderId),
    );
    let insertIdx = others.length;
    if (insertBeforeId) {
      const idx = others.indexOf(insertBeforeId);
      if (idx >= 0) insertIdx = idx;
    }
    others.splice(insertIdx, 0, folderId);
    others.forEach((id, i) => {
      tree[id].sortOrder = i + 1;
    });
    saveResTree(type);
  }
  function addResFolder(type, name, parentId, displayName) {
    const tree = getResFolderTree(type);
    if (tree[name]) return false; // already exists
    const siblings = getResChildFolders(type, parentId || null);
    const maxOrder = siblings.reduce(
      (m, id) => Math.max(m, tree[id]?.sortOrder ?? 0),
      0,
    );
    const entry = { parentId: parentId || null, sortOrder: maxOrder + 1 };
    if (displayName && displayName !== name) entry.displayName = displayName;
    tree[name] = entry;
    saveResTree(type);
    return true;
  }
  function removeResFolder(type, folderId) {
    const tree = getResFolderTree(type);
    const parentId = tree[folderId]?.parentId || null;
    // 子文件夹提升到父级
    for (const childId of getResChildFolders(type, folderId)) {
      tree[childId].parentId = parentId;
    }
    // 清除分组引用
    const groups = getResourceGroups(type);
    for (const key of Object.keys(groups)) {
      if (groups[key] === folderId) delete groups[key];
    }
    delete tree[folderId];
    saveResTree(type);
  }

  // 兼容旧接口
  function getResourceFolders(type) {
    ensureResourceSettings();
    return getResFolderIds(type);
  }
  function setResourceFolders(type, folders) {
    // 不再使用，保留空壳兼容
  }
  function getResourceGroups(type) {
    ensureResourceSettings();
    return type === "presets"
      ? extension_settings[extensionName].presetGroups
      : extension_settings[extensionName].worldInfoGroups;
  }
  function setItemGroup(type, itemName, folderName) {
    const groups = getResourceGroups(type);
    if (folderName) groups[itemName] = folderName;
    else delete groups[itemName];
    getContext().saveSettingsDebounced();
  }

  // 获取当前API的预设列表
  function getCurrentPresets() {
    const pm = getContext().getPresetManager();
    if (!pm || !pm.select) return [];
    const presets = [];
    pm.select.find("option").each(function () {
      const v = $(this).val();
      const t = $(this).text();
      if (v !== "" && v !== undefined) presets.push({ value: v, name: t });
    });
    return presets;
  }
  function getCurrentPresetApiId() {
    const pm = getContext().getPresetManager();
    return pm ? pm.apiId : "unknown";
  }
  function applyPreset(value) {
    const pm = getContext().getPresetManager();
    if (pm && pm.select) {
      pm.select.val(value).trigger("change");
    }
  }

  // 获取世界书列表（带缓存）
  let _worldInfoNamesCache = null;
  async function getWorldInfoNames(forceRefresh) {
    if (_worldInfoNamesCache && !forceRefresh) return _worldInfoNamesCache;
    try {
      const resp = await fetch("/api/settings/get", {
        method: "POST",
        headers: getContext().getRequestHeaders(),
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const data = await resp.json();
        _worldInfoNamesCache = data.world_names || [];
        return _worldInfoNamesCache;
      }
    } catch (e) {}
    // fallback: 从DOM读取
    const names = [];
    $("#world_editor_select option").each(function () {
      const v = $(this).val();
      const t = $(this).text();
      if (v !== "" && t !== "--- 选择以编辑 ---") names.push(t);
    });
    _worldInfoNamesCache = names;
    return names;
  }
  function openWorldInfoEditor(name) {
    // 找到对应的option index
    let targetVal = null;
    $("#world_editor_select option").each(function () {
      if ($(this).text() === name) {
        targetVal = $(this).val();
        return false;
      }
    });
    if (targetVal !== null) {
      $("#world_editor_select").val(targetVal).trigger("change");
      // 尝试打开世界书编辑面板
      const wiPanel = $("#WorldInfo");
      if (wiPanel.length && !wiPanel.is(":visible")) {
        $("#WIDrawerIcon").trigger("click");
      }
    }
  }

  // 会话级变量：仅在当前会话中记录新导入的标签ID，关闭弹窗后自动清除
  let sessionNewlyImportedIds = [];
  // 复制模式（默认关闭=移动模式）
  let cfmCopyMode = false;

  const getContext = SillyTavern.getContext;
  function getTagList() {
    return getContext().tags || [];
  }
  function getTagMap() {
    return getContext().tagMap || {};
  }
  function getCharacters() {
    return getContext().characters || [];
  }
  function getThumbnailUrl(type, file) {
    return getContext().getThumbnailUrl(type, file);
  }

  // ==================== 配置管理 ====================
  const extension_settings = getContext().extensionSettings;

  function ensureSettings() {
    if (!extension_settings[extensionName])
      extension_settings[extensionName] = {};
    if (!extension_settings[extensionName].folders)
      extension_settings[extensionName].folders = {};
    if (!extension_settings[extensionName].favorites)
      extension_settings[extensionName].favorites = [];
    // 迁移旧 localStorage 数据
    try {
      const oldRaw = localStorage.getItem(STORAGE_KEY);
      if (oldRaw) {
        const oldConfig = JSON.parse(oldRaw);
        if (
          oldConfig.folders &&
          Object.keys(oldConfig.folders).length > 0 &&
          Object.keys(extension_settings[extensionName].folders).length === 0
        ) {
          extension_settings[extensionName].folders = oldConfig.folders;
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
    if (!extension_settings[extensionName].buttonMode)
      extension_settings[extensionName].buttonMode = "topbar";
    if (extension_settings[extensionName].firstInitDone === undefined)
      extension_settings[extensionName].firstInitDone = false;
    // 被用户主动删除（但保留标签）的文件夹ID列表，防止自动重新导入
    if (!Array.isArray(extension_settings[extensionName].excludedTagIds))
      extension_settings[extensionName].excludedTagIds = [];
  }
  ensureSettings();

  // ==================== 收藏管理 ====================
  function getFavorites() {
    return extension_settings[extensionName].favorites || [];
  }
  function isFavorite(avatar) {
    return getFavorites().includes(avatar);
  }
  function toggleFavorite(avatar) {
    const favs = getFavorites();
    const idx = favs.indexOf(avatar);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(avatar);
    }
    extension_settings[extensionName].favorites = favs;
    getContext().saveSettingsDebounced();
    return idx < 0;
  }
  function getFavoriteCharacters() {
    const favs = getFavorites();
    return getCharacters().filter((c) => favs.includes(c.avatar));
  }

  // ==================== 标签自动同步 ====================
  // 首次加载：自动导入所有现有标签为顶级文件夹
  function autoImportAllTags() {
    if (extension_settings[extensionName].firstInitDone) return;
    const tags = getTagList();
    const existingIds = Object.keys(extension_settings[extensionName].folders);
    const excludedSet = new Set(
      extension_settings[extensionName].excludedTagIds || [],
    );
    let imported = 0;
    for (const tag of tags) {
      if (!existingIds.includes(tag.id) && !excludedSet.has(tag.id)) {
        extension_settings[extensionName].folders[tag.id] = {
          parentId: null,
        };
        imported++;
      }
    }
    extension_settings[extensionName].firstInitDone = true;
    getContext().saveSettingsDebounced();
    if (imported > 0) {
      console.log(
        `[${extensionName}] 首次加载：自动导入 ${imported} 个标签为文件夹`,
      );
      toastr.info(`已自动导入 ${imported} 个标签为文件夹`, "酒馆资源管理器", {
        timeOut: 4000,
      });
    }
  }

  // 每次打开弹窗时：检测新标签并自动导入 + 高亮（仅本次打开弹窗高亮）
  function detectAndImportNewTags() {
    const tags = getTagList();
    const existingIds = Object.keys(config.folders);
    const excludedSet = new Set(
      extension_settings[extensionName].excludedTagIds || [],
    );
    const newIds = [];
    for (const tag of tags) {
      if (!existingIds.includes(tag.id) && !excludedSet.has(tag.id)) {
        config.folders[tag.id] = { parentId: null };
        newIds.push(tag.id);
      }
    }
    if (newIds.length > 0) {
      saveConfig(config);
      // 记录新导入的标签用于高亮（仅存储在会话变量中，关闭弹窗后自动清除）
      sessionNewlyImportedIds = newIds;
      toastr.info(
        `检测到 ${newIds.length} 个新标签，已自动导入为顶级文件夹`,
        "酒馆资源管理器",
        { timeOut: 3000 },
      );
    } else {
      // 没有新标签时，清空会话高亮
      sessionNewlyImportedIds = [];
    }
  }

  // 清除新导入标签的高亮标记
  function clearNewlyImportedHighlight() {
    sessionNewlyImportedIds = [];
  }

  function isNewlyImported(tagId) {
    return sessionNewlyImportedIds.includes(tagId);
  }

  // 一键导入所有未注册标签
  function oneClickImportAllTags() {
    const tags = getTagList();
    const existingIds = getFolderTagIds();
    const excluded = extension_settings[extensionName].excludedTagIds || [];
    let imported = 0,
      skipped = 0;
    for (const tag of tags) {
      if (existingIds.includes(tag.id)) {
        skipped++;
        continue;
      }
      config.folders[tag.id] = { parentId: null };
      // 从排除列表中移除（用户主动一键导入意味着重新纳入管理）
      const exIdx = excluded.indexOf(tag.id);
      if (exIdx >= 0) excluded.splice(exIdx, 1);
      imported++;
    }
    if (imported > 0) {
      saveConfig(config);
      getContext().saveSettingsDebounced();
    }
    toastr.success(`已导入 ${imported} 个标签`);
    return imported;
  }

  // 从酒馆系统中删除标签
  function deleteTagFromSystem(tagId) {
    const tags = getContext().tags;
    const tagMap = getTagMap();
    // 从 tags 数组中移除
    const idx = tags.findIndex((t) => t.id === tagId);
    if (idx >= 0) tags.splice(idx, 1);
    // 从所有角色的 tagMap 中移除
    for (const avatar of Object.keys(tagMap)) {
      const charTags = tagMap[avatar];
      if (charTags) {
        const tidx = charTags.indexOf(tagId);
        if (tidx >= 0) charTags.splice(tidx, 1);
      }
    }
  }

  function loadConfig() {
    return { folders: extension_settings[extensionName].folders || {} };
  }
  function saveConfig(cfg) {
    extension_settings[extensionName].folders = cfg.folders;
    getContext().saveSettingsDebounced();
  }
  let config = loadConfig();

  // ==================== 辅助函数 ====================
  // 获取显示名称（优先使用 displayName，用于UI展示）
  function getTagName(tagId) {
    const folder = config.folders[tagId];
    if (folder && folder.displayName) return folder.displayName;
    const tag = getTagList().find((t) => t.id === tagId);
    return tag ? tag.name : tagId;
  }
  // 获取真实标签名称（用于内部逻辑）
  function getFullTagName(tagId) {
    const tag = getTagList().find((t) => t.id === tagId);
    return tag ? tag.name : tagId;
  }
  // 构建带路径前缀的标签名（用于解决重名冲突）
  function buildPrefixedTagName(name, parentTagId) {
    const pathNames = [];
    let current = parentTagId;
    const visited = new Set();
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      pathNames.unshift(getTagName(current));
      current = config.folders[current]?.parentId || null;
    }
    pathNames.push(name);
    return pathNames.join("-");
  }
  // 创建新标签对象并加入系统
  function createNewTagInSystem(name) {
    const context = getContext();
    const tags = context.tags;
    const tag = {
      id: context.uuidv4(),
      name,
      folder_type: "NONE",
      filter_state: "UNDEFINED",
      sort_order: Math.max(0, ...tags.map((t) => t.sort_order || 0)) + 1,
      is_hidden_on_character_card: false,
      color: "",
      color2: "",
      create_date: Date.now(),
    };
    tags.push(tag);
    return tag;
  }
  // 重命名系统中的标签
  function renameTagInSystem(tagId, newName) {
    const tag = getTagList().find((t) => t.id === tagId);
    if (tag) {
      tag.name = newName;
      getContext().saveSettingsDebounced();
    }
  }
  // 根据当前父级重新构建标签名
  function rebuildTagName(tagId) {
    const folder = config.folders[tagId];
    if (!folder) return;
    const shortName = folder.displayName || getFullTagName(tagId);
    const parentId = folder.parentId;
    let newTagName;
    if (parentId) {
      newTagName = buildPrefixedTagName(shortName, parentId);
    } else {
      newTagName = shortName;
    }
    const tags = getContext().tags;
    const conflict = tags.find(
      (t) =>
        t.id !== tagId && t.name.toLowerCase() === newTagName.toLowerCase(),
    );
    if (conflict) {
      let counter = 2;
      let finalName;
      do {
        finalName = `${newTagName}_${counter++}`;
      } while (
        tags.find(
          (t) =>
            t.id !== tagId && t.name.toLowerCase() === finalName.toLowerCase(),
        )
      );
      newTagName = finalName;
    }
    renameTagInSystem(tagId, newTagName);
  }
  // 递归重建标签名：先重命名自身，再处理所有子文件夹
  function recursiveRebuildTagNames(tagId) {
    rebuildTagName(tagId);
    const children = getChildFolders(tagId);
    for (const childId of children) {
      recursiveRebuildTagNames(childId);
    }
  }
  // 查找或创建标签，自动处理重名冲突（子文件夹始终带路径前缀）
  function findOrCreateTag(intendedName, parentTagId) {
    const tags = getContext().tags;
    if (parentTagId) {
      const prefixedName = buildPrefixedTagName(intendedName, parentTagId);
      const prefixedTag = tags.find(
        (t) => t.name.toLowerCase() === prefixedName.toLowerCase(),
      );
      if (prefixedTag) {
        if (config.folders[prefixedTag.id]?.parentId === parentTagId) {
          return { tag: prefixedTag, displayName: intendedName };
        }
        let counter = 2;
        let finalName;
        do {
          finalName = `${prefixedName}_${counter++}`;
        } while (
          tags.find((t) => t.name.toLowerCase() === finalName.toLowerCase())
        );
        return {
          tag: createNewTagInSystem(finalName),
          displayName: intendedName,
        };
      }
      return {
        tag: createNewTagInSystem(prefixedName),
        displayName: intendedName,
      };
    }
    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === intendedName.toLowerCase(),
    );
    if (existingTag) {
      if (config.folders[existingTag.id]) {
        if (!config.folders[existingTag.id].parentId) {
          return { tag: existingTag, displayName: null };
        }
        let counter = 2;
        let finalName;
        do {
          finalName = `${intendedName}_${counter++}`;
        } while (
          tags.find((t) => t.name.toLowerCase() === finalName.toLowerCase())
        );
        return {
          tag: createNewTagInSystem(finalName),
          displayName: intendedName,
        };
      }
      return { tag: existingTag, displayName: null };
    }
    return { tag: createNewTagInSystem(intendedName), displayName: null };
  }
  function getFolderTagIds() {
    return Object.keys(config.folders);
  }
  function getTopLevelFolders() {
    return getFolderTagIds().filter((id) => !config.folders[id].parentId);
  }
  function getChildFolders(parentTagId) {
    return getFolderTagIds().filter(
      (id) => config.folders[id].parentId === parentTagId,
    );
  }
  function getFolderPath(tagId) {
    const path = [];
    let current = tagId;
    const visited = new Set();
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      path.unshift(current);
      current = config.folders[current]?.parentId || null;
    }
    return path;
  }
  // 叶子标签模式：角色只需拥有该文件夹标签，且不拥有任何子文件夹标签
  function getCharactersInFolder(folderTagId) {
    const childFolderIds = getChildFolders(folderTagId);
    const characters = getCharacters();
    const tagMap = getTagMap();
    return characters.filter((char) => {
      const charTags = tagMap[char.avatar] || [];
      if (!charTags.includes(folderTagId)) return false;
      for (const childId of childFolderIds) {
        if (charTags.includes(childId)) return false;
      }
      return true;
    });
  }
  function getUncategorizedCharacters() {
    const folderTagIds = getFolderTagIds();
    if (folderTagIds.length === 0) return getCharacters();
    const characters = getCharacters();
    const tagMap = getTagMap();
    return characters.filter((char) => {
      const charTags = tagMap[char.avatar] || [];
      return !folderTagIds.some((fid) => charTags.includes(fid));
    });
  }
  function countCharsInFolderRecursive(folderTagId) {
    let count = getCharactersInFolder(folderTagId).length;
    for (const childId of getChildFolders(folderTagId))
      count += countCharsInFolderRecursive(childId);
    return count;
  }
  function wouldCreateCycle(folderId, parentId) {
    let current = parentId;
    const visited = new Set();
    while (current) {
      if (current === folderId) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = config.folders[current]?.parentId || null;
    }
    return false;
  }
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // 排序：优先 sortOrder，其次按名称（使用中文拼音排序）
  function sortFolders(folderIds) {
    return [...folderIds].sort((a, b) => {
      const orderA = config.folders[a]?.sortOrder ?? 0;
      const orderB = config.folders[b]?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return getTagName(a).localeCompare(getTagName(b), "zh-CN");
    });
  }

  // 角色排序辅助函数
  function sortCharacters(chars, mode) {
    return [...chars].sort((a, b) => {
      const cmp = (a.name || "").localeCompare(b.name || "", "zh-CN");
      return mode === "az" ? cmp : -cmp;
    });
  }

  // ==================== 移动端触摸拖拽管理器 ====================
  const touchDragMgr = {
    active: false,
    data: null,
    ghost: null,
    sourceEl: null,
    _timer: null,
    _startX: 0,
    _startY: 0,
    _lastTarget: null,

    /** 为元素注册触摸拖拽（长按500ms启动） */
    bind(el, getDataFn) {
      const mgr = this;
      const dom = el instanceof jQuery ? el[0] : el;
      let sx, sy;

      dom.addEventListener(
        "touchstart",
        (e) => {
          if (mgr.active) return;
          if (e.target.closest(".cfm-row-star, .cfm-tnode-arrow")) return;
          const t = e.touches[0];
          sx = t.clientX;
          sy = t.clientY;
          mgr._startX = sx;
          mgr._startY = sy;

          mgr._timer = setTimeout(() => {
            const data = getDataFn();
            if (!data) return;
            mgr.active = true;
            mgr.data = data;
            mgr.sourceEl = dom;
            dom.classList.add("cfm-touch-dragging");
            // 创建幽灵
            const g = document.createElement("div");
            g.className = "cfm-touch-ghost";
            // 多选模式：显示"共X项"
            if (data.multiSelect && data.count > 1) {
              g.textContent = `📦 共 ${data.count} 项`;
            } else {
              g.textContent =
                (data.type === "folder" || data.type === "res-folder"
                  ? "📁 "
                  : data.type === "preset"
                    ? "📄 "
                    : data.type === "worldinfo"
                      ? "📖 "
                      : "👤 ") + (data.name || "");
            }
            g.style.left = sx + "px";
            g.style.top = sy - 50 + "px";
            document.body.appendChild(g);
            mgr.ghost = g;
            if (navigator.vibrate) navigator.vibrate(50);
          }, 500);
        },
        { passive: true },
      );

      dom.addEventListener(
        "touchmove",
        (e) => {
          const t = e.touches[0];
          const dx = Math.abs(t.clientX - sx);
          const dy = Math.abs(t.clientY - sy);
          // 未激活时，移动超过10px取消长按
          if (!mgr.active) {
            if (dx > 10 || dy > 10) {
              mgr._cancelTimer();
            }
            return;
          }
          e.preventDefault(); // 阻止滚动
          if (mgr.ghost) {
            mgr.ghost.style.left = t.clientX + "px";
            mgr.ghost.style.top = t.clientY - 50 + "px";
          }
          mgr._highlightTarget(t.clientX, t.clientY);
        },
        { passive: false },
      );

      dom.addEventListener(
        "touchend",
        (e) => {
          mgr._cancelTimer();
          if (!mgr.active) return;
          e.preventDefault();
          const t = e.changedTouches[0];
          mgr._executeDrop(t.clientX, t.clientY);
          mgr._cleanup();
        },
        { passive: false },
      );

      dom.addEventListener("touchcancel", () => {
        mgr._cancelTimer();
        if (mgr.active) mgr._cleanup();
      });
    },

    _cancelTimer() {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    },

    _clearHighlight() {
      if (this._lastTarget) {
        this._lastTarget.classList.remove(
          "cfm-drop-target",
          "cfm-drop-before",
          "cfm-drop-after",
          "cfm-drop-forbidden",
          "cfm-right-list-drop-target",
        );
        this._lastTarget = null;
      }
    },

    _highlightTarget(x, y) {
      this._clearHighlight();
      if (this.ghost) this.ghost.style.display = "none";
      const el = document.elementFromPoint(x, y);
      if (this.ghost) this.ghost.style.display = "";
      if (!el) return;

      const tnode = el.closest(".cfm-tnode[data-id]");
      const row = el.closest(".cfm-row[data-folder-id]");
      const uncatNode = el.closest(".cfm-tnode-uncategorized");
      const rightList = el.closest(".cfm-right-list");

      let target = tnode || row || uncatNode;
      if (!target && rightList) {
        target = rightList;
      }
      if (!target) return;

      const targetId = target.dataset?.id || target.dataset?.folderId;

      // 三区域判定
      let zone = "into";
      if ((tnode || row) && !uncatNode) {
        const rect = target.getBoundingClientRect();
        const relY = (y - rect.top) / rect.height;
        if (relY < 0.25) zone = "before";
        else if (relY > 0.75) zone = "after";
      }

      // 禁止检测
      if (
        (this.data.type === "folder" || this.data.type === "res-folder") &&
        this.data.id === targetId
      ) {
        target.classList.add("cfm-drop-forbidden");
        this._lastTarget = target;
        return;
      }
      if (
        this.data.type === "folder" &&
        zone === "into" &&
        targetId &&
        wouldCreateCycle(this.data.id, targetId)
      ) {
        target.classList.add("cfm-drop-forbidden");
        this._lastTarget = target;
        return;
      }
      if (
        this.data.type === "res-folder" &&
        zone === "into" &&
        targetId &&
        wouldCreateResCycle(this.data.resType, this.data.id, targetId)
      ) {
        target.classList.add("cfm-drop-forbidden");
        this._lastTarget = target;
        return;
      }

      if (target === rightList)
        target.classList.add("cfm-right-list-drop-target");
      else if (zone === "before") target.classList.add("cfm-drop-before");
      else if (zone === "after") target.classList.add("cfm-drop-after");
      else target.classList.add("cfm-drop-target");
      this._lastTarget = target;
    },

    _executeDrop(x, y) {
      if (this.ghost) this.ghost.style.display = "none";
      const el = document.elementFromPoint(x, y);
      if (this.ghost) this.ghost.style.display = "";
      if (!el || !this.data) return;

      const tnode = el.closest(".cfm-tnode[data-id]");
      const row = el.closest(".cfm-row[data-folder-id]");
      const uncatNode = el.closest(".cfm-tnode-uncategorized");
      const rightList = el.closest(".cfm-right-list");

      let target = tnode || row || uncatNode;
      let targetId = target?.dataset?.id || target?.dataset?.folderId;

      let zone = "into";
      if ((tnode || row) && !uncatNode && target) {
        const rect = target.getBoundingClientRect();
        const relY = (y - rect.top) / rect.height;
        if (relY < 0.25) zone = "before";
        else if (relY > 0.75) zone = "after";
      }

      const d = this.data;
      if (d.type === "folder") {
        if (uncatNode) return;
        if (targetId && targetId !== d.id) {
          if (zone === "into") {
            if (wouldCreateCycle(d.id, targetId)) {
              toastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            reorderFolder(d.id, targetId, null);
            toastr.success(
              `「${getTagName(d.id)}」已移入「${getTagName(targetId)}」`,
            );
          } else {
            const pId = config.folders[targetId]?.parentId || null;
            if (wouldCreateCycle(d.id, pId)) {
              toastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderFolder(d.id, pId, targetId);
              toastr.success(`「${getTagName(d.id)}」已排序`);
            } else {
              const sibs = sortFolders(getChildFolders(pId));
              const ci = sibs.indexOf(targetId);
              const nxt = ci >= 0 && ci < sibs.length - 1 ? sibs[ci + 1] : null;
              reorderFolder(d.id, pId, nxt);
              toastr.success(`「${getTagName(d.id)}」已排序`);
            }
          }
          renderLeftTree();
          renderRightPane();
        } else if (
          !target &&
          rightList &&
          selectedTreeNode &&
          selectedTreeNode !== "__uncategorized__" &&
          selectedTreeNode !== "__favorites__"
        ) {
          if (
            d.id !== selectedTreeNode &&
            !wouldCreateCycle(d.id, selectedTreeNode)
          ) {
            reorderFolder(d.id, selectedTreeNode, null);
            toastr.success(
              `「${getTagName(d.id)}」已移入「${getTagName(selectedTreeNode)}」`,
            );
            renderLeftTree();
            renderRightPane();
          }
        }
      } else if (d.type === "char") {
        // 多选批量移动
        const avatars =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.avatar];
        const count = avatars.length;
        if (uncatNode) {
          avatars.forEach((av) => removeCharFromAllFolders(av));
          toastr.success(
            count > 1
              ? `已将 ${count} 个角色移出所有文件夹`
              : `已将「${d.name || d.avatar}」移出所有文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        } else if (targetId) {
          avatars.forEach((av) => {
            const ch = getCharacters().find((c) => c.avatar === av);
            handleCharDropToFolder(av, targetId, ch?.name || av, count > 1);
          });
          toastr.success(
            count > 1
              ? `已将 ${count} 个角色${cfmCopyMode ? "复制" : "移动"}到「${getTagName(targetId)}」`
              : `已将「${d.name || d.avatar}」${cfmCopyMode ? "复制" : "移动"}到「${getTagName(targetId)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        } else if (
          !target &&
          rightList &&
          selectedTreeNode &&
          selectedTreeNode !== "__uncategorized__" &&
          selectedTreeNode !== "__favorites__"
        ) {
          avatars.forEach((av) => {
            const ch = getCharacters().find((c) => c.avatar === av);
            handleCharDropToFolder(
              av,
              selectedTreeNode,
              ch?.name || av,
              count > 1,
            );
          });
          toastr.success(
            count > 1
              ? `已将 ${count} 个角色${cfmCopyMode ? "复制" : "移动"}到「${getTagName(selectedTreeNode)}」`
              : `已将「${d.name || d.avatar}」${cfmCopyMode ? "复制" : "移动"}到「${getTagName(selectedTreeNode)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        }
      } else if (d.type === "res-folder") {
        const resType = d.resType;
        const resTree = getResFolderTree(resType);
        if (uncatNode) return;
        if (targetId && targetId !== d.id) {
          if (zone === "into") {
            if (wouldCreateResCycle(resType, d.id, targetId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder(resType, d.id, targetId, null);
            toastr.success(`「${d.name}」已移入「${targetId}」`);
          } else {
            const pId = resTree[targetId]?.parentId || null;
            if (wouldCreateResCycle(resType, d.id, pId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder(resType, d.id, pId, targetId);
            } else {
              const sibs = sortResFolders(
                resType,
                getResChildFolders(resType, pId),
              );
              const ci = sibs.indexOf(targetId);
              reorderResFolder(
                resType,
                d.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            toastr.success(`「${d.name}」已排序`);
          }
          if (resType === "presets") renderPresetsView();
          else renderWorldInfoView();
        } else if (!target && rightList) {
          const selFolder =
            resType === "presets"
              ? selectedPresetFolder
              : selectedWorldInfoFolder;
          if (
            selFolder &&
            selFolder !== "__ungrouped__" &&
            selFolder !== "__favorites__" &&
            d.id !== selFolder
          ) {
            if (!wouldCreateResCycle(resType, d.id, selFolder)) {
              reorderResFolder(resType, d.id, selFolder, null);
              toastr.success(`「${d.name}」已移入「${selFolder}」`);
              if (resType === "presets") renderPresetsView();
              else renderWorldInfoView();
            }
          }
        }
      } else if (d.type === "preset") {
        const presetNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const pCount = presetNames.length;
        if (uncatNode) {
          presetNames.forEach((n) => setItemGroup("presets", n, null));
          toastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
        } else if (targetId) {
          presetNames.forEach((n) => setItemGroup("presets", n, targetId));
          toastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${targetId}」`
              : `已将「${d.name}」移入「${targetId}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
        } else if (
          !target &&
          rightList &&
          selectedPresetFolder &&
          selectedPresetFolder !== "__ungrouped__" &&
          selectedPresetFolder !== "__favorites__"
        ) {
          presetNames.forEach((n) =>
            setItemGroup("presets", n, selectedPresetFolder),
          );
          toastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${selectedPresetFolder}」`
              : `已将「${d.name}」移入「${selectedPresetFolder}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
        }
      } else if (d.type === "worldinfo") {
        const wiNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const wCount = wiNames.length;
        if (uncatNode) {
          wiNames.forEach((n) => setItemGroup("worldinfo", n, null));
          toastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderWorldInfoView();
        } else if (targetId) {
          wiNames.forEach((n) => setItemGroup("worldinfo", n, targetId));
          toastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${targetId}」`
              : `已将「${d.name}」移入「${targetId}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderWorldInfoView();
        } else if (
          !target &&
          rightList &&
          selectedWorldInfoFolder &&
          selectedWorldInfoFolder !== "__ungrouped__" &&
          selectedWorldInfoFolder !== "__favorites__"
        ) {
          wiNames.forEach((n) =>
            setItemGroup("worldinfo", n, selectedWorldInfoFolder),
          );
          toastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${selectedWorldInfoFolder}」`
              : `已将「${d.name}」移入「${selectedWorldInfoFolder}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderWorldInfoView();
        }
      }
    },

    _cleanup() {
      if (this.ghost) {
        this.ghost.remove();
        this.ghost = null;
      }
      if (this.sourceEl) {
        this.sourceEl.classList.remove("cfm-touch-dragging");
        this.sourceEl = null;
      }
      this._clearHighlight();
      this.active = false;
      this.data = null;
    },
  };

  // ==================== 排序功能 ====================
  // 拍摄排序快照（仅首次拍摄）
  function takeSortSnapshot() {
    if (sortSnapshot) return;
    sortSnapshot = {};
    for (const id of getFolderTagIds()) {
      sortSnapshot[id] = config.folders[id]?.sortOrder ?? 0;
    }
  }

  // 对指定文件夹列表按名称排序并重新赋值 sortOrder
  function applySortToFolders(folderIds, mode) {
    takeSortSnapshot();
    const sorted = [...folderIds].sort((a, b) => {
      const nameA = getTagName(a);
      const nameB = getTagName(b);
      const cmp = nameA.localeCompare(nameB, "zh-CN");
      return mode === "az" ? cmp : -cmp;
    });
    sorted.forEach((id, i) => {
      config.folders[id].sortOrder = i + 1;
    });
    saveConfig(config);
    sortDirty = true;
  }

  // 从快照恢复排序
  function revertSort() {
    if (!sortSnapshot) return;
    for (const id of Object.keys(sortSnapshot)) {
      if (config.folders[id]) {
        config.folders[id].sortOrder = sortSnapshot[id];
      }
    }
    saveConfig(config);
    sortSnapshot = null;
    sortDirty = false;
    rightCharSortMode = null;
  }

  // 创建排序下拉菜单
  function createSortDropdown(targetFolderIds, onSort, currentMode) {
    const dropdown = $(`
            <div class="cfm-sort-dropdown cfm-sort-open">
                <div class="cfm-sort-dropdown-item ${currentMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="az">
                    <i class="fa-solid fa-arrow-down-a-z"></i> A → Z
                </div>
                <div class="cfm-sort-dropdown-item ${currentMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="za">
                    <i class="fa-solid fa-arrow-up-z-a"></i> Z → A
                </div>
                <div class="cfm-sort-dropdown-sep"></div>
                <div class="cfm-sort-dropdown-item ${!sortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert">
                    <i class="fa-solid fa-rotate-left"></i> 自定义
                </div>
            </div>
        `);

    dropdown.find('[data-sort="az"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("az");
      dropdown.remove();
    });
    dropdown.find('[data-sort="za"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("za");
      dropdown.remove();
    });
    dropdown.find('[data-sort="revert"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!sortSnapshot) return; // disabled
      onSort("revert");
      dropdown.remove();
    });

    return dropdown;
  }

  // 显示/隐藏排序下拉菜单
  function toggleSortDropdown(wrapper, targetFolderIds, onSort, currentMode) {
    // 关闭所有已打开的下拉菜单
    $(".cfm-sort-dropdown").remove();

    const existing = wrapper.find(".cfm-sort-dropdown");
    if (existing.length) {
      existing.remove();
      return;
    }

    const dropdown = createSortDropdown(targetFolderIds, onSort, currentMode);
    wrapper.append(dropdown);

    // 点击外部关闭
    setTimeout(() => {
      $(document).one("click.cfmSortDropdown", (e) => {
        if (!$(e.target).closest(".cfm-sort-dropdown").length) {
          dropdown.remove();
        }
      });
    }, 0);
  }

  // 显示排序确认弹窗
  function showSortConfirmDialog(onConfirm, onRevert) {
    const overlay = $('<div id="cfm-sort-confirm-overlay"></div>');
    const dialog = $(`
            <div id="cfm-sort-confirm-dialog">
                <h4>📋 排序已改变</h4>
                <p>文件夹的排序已被修改，是否保存新的排序？</p>
                <div class="cfm-sort-confirm-actions">
                    <button class="cfm-sort-confirm-no">否，撤回排序</button>
                    <button class="cfm-sort-confirm-yes">是，保留排序</button>
                </div>
            </div>
        `);
    overlay.append(dialog);
    $("body").append(overlay);

    dialog.find(".cfm-sort-confirm-yes").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onConfirm();
    });
    dialog.find(".cfm-sort-confirm-no").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onRevert();
    });
  }
  // 移动文件夹到新父级并插入到指定位置（自动重建标签名）
  function reorderFolder(folderId, newParentId, insertBeforeId) {
    const oldParentId = config.folders[folderId]?.parentId || null;
    config.folders[folderId].parentId = newParentId;
    // 确保子文件夹有 displayName（如果没有，从当前标签名中提取短名称）
    if (!config.folders[folderId].displayName) {
      const fullName = getFullTagName(folderId);
      const lastDash = fullName.lastIndexOf("-");
      if (lastDash >= 0 && oldParentId) {
        config.folders[folderId].displayName = fullName.substring(lastDash + 1);
      } else {
        config.folders[folderId].displayName = fullName;
      }
    }
    const siblings = getChildFolders(newParentId);
    const others = sortFolders(siblings.filter((id) => id !== folderId));
    let insertIdx = others.length;
    if (insertBeforeId) {
      const idx = others.indexOf(insertBeforeId);
      if (idx >= 0) insertIdx = idx;
    }
    others.splice(insertIdx, 0, folderId);
    others.forEach((id, i) => {
      config.folders[id].sortOrder = i + 1;
    });
    saveConfig(config);
    // 父级变化时，递归重建标签名
    if (oldParentId !== newParentId) {
      recursiveRebuildTagNames(folderId);
    }
  }

  // 移动角色到新文件夹（移除所有旧文件夹标签，只添加目标标签）
  function moveCharToFolder(avatar, newFolderId) {
    const tagMap = getTagMap();
    const charTags = tagMap[avatar] || [];
    const allFolderIds = getFolderTagIds();
    for (let i = charTags.length - 1; i >= 0; i--) {
      if (allFolderIds.includes(charTags[i])) charTags.splice(i, 1);
    }
    if (!charTags.includes(newFolderId)) charTags.push(newFolderId);
    tagMap[avatar] = charTags;
    getContext().saveSettingsDebounced();
  }
  // 复制角色到新文件夹（保留旧标签，额外添加目标标签）
  function copyCharToFolder(avatar, newFolderId) {
    addTagToChar(avatar, newFolderId);
  }
  // 将角色移出所有文件夹（变为未归类）
  function removeCharFromAllFolders(avatar) {
    const tagMap = getTagMap();
    const charTags = tagMap[avatar] || [];
    const allFolderIds = getFolderTagIds();
    for (let i = charTags.length - 1; i >= 0; i--) {
      if (allFolderIds.includes(charTags[i])) charTags.splice(i, 1);
    }
    tagMap[avatar] = charTags;
    getContext().saveSettingsDebounced();
  }
  // 处理角色拖放到文件夹（根据复制模式决定行为）
  // silent: 批量操作时为true，抑制单条toastr消息
  function handleCharDropToFolder(avatar, folderId, charName, silent) {
    if (cfmCopyMode) {
      copyCharToFolder(avatar, folderId);
      if (!silent)
        toastr.success(`已将「${charName}」复制到「${getTagName(folderId)}」`);
    } else {
      moveCharToFolder(avatar, folderId);
      if (!silent)
        toastr.success(`已将「${charName}」移动到「${getTagName(folderId)}」`);
    }
  }
  // 自动清理多余的路径标签（只保留最深层的叶子标签）
  function autoCleanRedundantTags() {
    const characters = getCharacters();
    const tagMap = getTagMap();
    const allFolderIdSet = new Set(getFolderTagIds());
    let cleanedCount = 0;
    for (const char of characters) {
      const charTags = tagMap[char.avatar] || [];
      const folderTags = charTags.filter((t) => allFolderIdSet.has(t));
      if (folderTags.length <= 1) continue;
      const toRemove = new Set();
      for (const fid of folderTags) {
        for (const otherId of folderTags) {
          if (otherId === fid) continue;
          const path = getFolderPath(otherId);
          if (path.includes(fid) && path[path.length - 1] !== fid) {
            toRemove.add(fid);
            break;
          }
        }
      }
      for (const fid of toRemove) {
        const idx = charTags.indexOf(fid);
        if (idx >= 0) {
          charTags.splice(idx, 1);
          cleanedCount++;
        }
      }
    }
    if (cleanedCount > 0) {
      getContext().saveSettingsDebounced();
      console.log(
        `[${extensionName}] 自动清理了 ${cleanedCount} 个多余的路径标签`,
      );
      toastr.info(
        `已自动清理 ${cleanedCount} 个多余的路径标签`,
        "酒馆资源管理器",
        { timeOut: 3000 },
      );
    }
  }
  // 查找角色当前所在的文件夹路径（用于收藏视图显示）
  function findCharFolderPath(avatar) {
    const tagMap = getTagMap();
    const charTags = tagMap[avatar] || [];
    const folderIds = getFolderTagIds();
    const charFolderTags = charTags.filter((t) => folderIds.includes(t));
    if (charFolderTags.length === 0) return null;
    let deepest = charFolderTags[0];
    let maxDepth = getFolderPath(deepest).length;
    for (let i = 1; i < charFolderTags.length; i++) {
      const d = getFolderPath(charFolderTags[i]).length;
      if (d > maxDepth) {
        deepest = charFolderTags[i];
        maxDepth = d;
      }
    }
    return getFolderPath(deepest)
      .map((id) => getTagName(id))
      .join(" › ");
  }

  // 给角色添加标签
  function addTagToChar(avatar, tagId) {
    const tagMap = getTagMap();
    if (!tagMap[avatar]) tagMap[avatar] = [];
    if (!tagMap[avatar].includes(tagId)) {
      tagMap[avatar].push(tagId);
      getContext().saveSettingsDebounced();
    }
  }
  // 从角色移除标签
  function removeTagFromChar(avatar, tagId) {
    const tagMap = getTagMap();
    if (!tagMap[avatar]) return;
    const idx = tagMap[avatar].indexOf(tagId);
    if (idx >= 0) {
      tagMap[avatar].splice(idx, 1);
      getContext().saveSettingsDebounced();
    }
  }

  // ==================== 按钮管理 ====================
  function getButtonMode() {
    return extension_settings[extensionName].buttonMode || "topbar";
  }
  function setButtonMode(mode) {
    extension_settings[extensionName].buttonMode = mode;
    getContext().saveSettingsDebounced();
  }

  function destroyAllButtons() {
    $("#cfm-folder-button").remove();
    $(window).off("resize.cfm");
    $(document).off(
      "mousemove.cfmDrag touchmove.cfmDrag mouseup.cfmDrag touchend.cfmDrag",
    );
    $("#cfm-topbar-button").remove();
  }
  function switchButtonMode(newMode) {
    destroyAllButtons();
    setButtonMode(newMode);
    if (newMode === "topbar") createTopbarButton();
    else createFloatingButton();
  }
  function initButton() {
    if (getButtonMode() === "topbar") createTopbarButton();
    else createFloatingButton();
  }

  function createTopbarButton() {
    if ($("#cfm-topbar-button").length > 0) return;
    const btn = $(
      `<div id="cfm-topbar-button" class="drawer"><div class="drawer-toggle drawer-header"><div class="drawer-icon fa-solid fa-folder fa-fw interactable" title="酒馆资源管理器" tabindex="0" role="button"></div></div></div>`,
    );
    const rightNav = $("#rightNavHolder");
    if (rightNav.length > 0) rightNav.before(btn);
    else $("#top-settings-holder").append(btn);
    btn.find(".drawer-icon").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMainPopup();
    });
  }

  function createFloatingButton() {
    if ($("#cfm-folder-button").length > 0) return;
    const btn = $(
      `<div id="cfm-folder-button" title="角色卡文件夹"><i class="fa-solid fa-folder"></i></div>`,
    );
    $("body").append(btn);
    const savedPos = JSON.parse(
      localStorage.getItem(STORAGE_KEY_BTN_POS) || "null",
    );
    if (savedPos)
      btn.css({
        top: savedPos.top,
        left: savedPos.left,
        right: "auto",
        bottom: "auto",
      });
    else
      btn.css({
        top: "150px",
        right: "15px",
        left: "auto",
        bottom: "auto",
      });

    let isDragging = false,
      hasMoved = false,
      offset = { x: 0, y: 0 },
      startPos = { x: 0, y: 0 };

    let longPressTimer = null;
    let longPressTriggered = false;

    // PC端：鼠标拖拽
    btn.on("mousedown", (e) => {
      hasMoved = false;
      const pos = btn.offset();
      offset.x = e.pageX - pos.left;
      offset.y = e.pageY - pos.top;
      startPos.x = e.pageX;
      startPos.y = e.pageY;
      isDragging = true;
      btn.css("cursor", "grabbing");
      e.preventDefault();
    });
    $(document).on("mousemove.cfmDrag", (e) => {
      if (!isDragging) return;
      if (
        Math.abs(e.pageX - startPos.x) > 5 ||
        Math.abs(e.pageY - startPos.y) > 5
      )
        hasMoved = true;
      if (hasMoved)
        btn.css({
          top: e.pageY - offset.y + "px",
          left: e.pageX - offset.x + "px",
          right: "auto",
          bottom: "auto",
        });
    });
    $(document).on("mouseup.cfmDrag", () => {
      if (!isDragging) return;
      isDragging = false;
      btn.css("cursor", "grab");
      if (hasMoved)
        localStorage.setItem(
          STORAGE_KEY_BTN_POS,
          JSON.stringify({ top: btn.css("top"), left: btn.css("left") }),
        );
      setTimeout(() => {
        hasMoved = false;
      }, 50);
    });
    btn.on("click", (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      showMainPopup();
    });

    // 移动端：触摸长按拖拽（使用原生事件 + passive:false）
    const btnEl = btn[0];
    let tSx, tSy;
    btnEl.addEventListener(
      "touchstart",
      (e) => {
        hasMoved = false;
        longPressTriggered = false;
        const t = e.touches[0];
        tSx = t.clientX;
        tSy = t.clientY;
        const pos = btn.offset();
        offset.x = t.pageX - pos.left;
        offset.y = t.pageY - pos.top;
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          isDragging = true;
          btn.addClass("cfm-long-press-ready");
          if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
      },
      { passive: true },
    );

    btnEl.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (!isDragging) {
          if (
            Math.abs(t.clientX - tSx) > 10 ||
            Math.abs(t.clientY - tSy) > 10
          ) {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          }
          return;
        }
        e.preventDefault();
        hasMoved = true;
        btn.css({
          top: t.pageY - offset.y + "px",
          left: t.pageX - offset.x + "px",
          right: "auto",
          bottom: "auto",
        });
      },
      { passive: false },
    );

    btnEl.addEventListener(
      "touchend",
      (e) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (!isDragging && !longPressTriggered) {
          e.preventDefault();
          showMainPopup();
          return;
        }
        if (isDragging) {
          isDragging = false;
          btn.removeClass("cfm-long-press-ready");
          if (hasMoved)
            localStorage.setItem(
              STORAGE_KEY_BTN_POS,
              JSON.stringify({ top: btn.css("top"), left: btn.css("left") }),
            );
        }
        hasMoved = false;
        longPressTriggered = false;
      },
      { passive: false },
    );

    btnEl.addEventListener("touchcancel", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (isDragging) {
        isDragging = false;
        btn.removeClass("cfm-long-press-ready");
      }
      hasMoved = false;
      longPressTriggered = false;
    });

    let resizeTimer;
    $(window).on("resize.cfm", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const b = $("#cfm-folder-button");
        if (!b.length) return;
        let l = b.offset().left,
          t = b.offset().top;
        const maxL = $(window).width() - b.outerWidth(),
          maxT = $(window).height() - b.outerHeight();
        if (l > maxL) l = maxL;
        if (l < 0) l = 0;
        if (t > maxT) t = maxT;
        if (t < 0) t = 0;
        b.css({ top: t + "px", left: l + "px" });
        localStorage.setItem(
          STORAGE_KEY_BTN_POS,
          JSON.stringify({ top: b.css("top"), left: b.css("left") }),
        );
      }, 150);
    });
  }

  // ==================== 主弹窗：双栏布局 ====================
  let selectedTreeNode = null; // 当前左侧选中的文件夹ID或'__uncategorized__'
  let expandedNodes = new Set(); // 左侧树展开状态
  let configExpandedNodes = new Set(); // 配置弹窗树展开状态

  // 预设/世界书双栏状态
  let selectedPresetFolder = null;
  let selectedWorldInfoFolder = null;
  let presetExpandedNodes = new Set();
  let worldInfoExpandedNodes = new Set();
  let presetConfigExpandedNodes = new Set();
  let worldInfoConfigExpandedNodes = new Set();

  // 预设/世界书的收藏管理
  function ensureResFavorites() {
    if (!extension_settings[extensionName].presetFavorites)
      extension_settings[extensionName].presetFavorites = [];
    if (!extension_settings[extensionName].worldInfoFavorites)
      extension_settings[extensionName].worldInfoFavorites = [];
  }
  function getResFavorites(type) {
    ensureResFavorites();
    return type === "presets"
      ? extension_settings[extensionName].presetFavorites
      : extension_settings[extensionName].worldInfoFavorites;
  }
  function isResFavorite(type, name) {
    return getResFavorites(type).includes(name);
  }
  function toggleResFavorite(type, name) {
    const favs = getResFavorites(type);
    const idx = favs.indexOf(name);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(name);
    getContext().saveSettingsDebounced();
    return idx < 0;
  }

  // 预设/世界书的移动/复制模式
  let resCopyMode = false;

  // 预设/世界书排序状态
  let presetLeftSortMode = null;
  let presetRightSortMode = null; // 右栏项目排序: null | 'az' | 'za'
  let worldInfoLeftSortMode = null;
  let worldInfoRightSortMode = null;
  let presetSortSnapshot = null;
  let worldInfoSortSnapshot = null;
  let presetSortDirty = false;
  let worldInfoSortDirty = false;

  // 资源排序辅助
  function takeResSortSnapshot(type) {
    if (type === "presets" && presetSortSnapshot) return;
    if (type === "worldinfo" && worldInfoSortSnapshot) return;
    const tree = getResFolderTree(type);
    const snap = {};
    for (const id of Object.keys(tree)) {
      snap[id] = tree[id]?.sortOrder ?? 0;
    }
    if (type === "presets") presetSortSnapshot = snap;
    else worldInfoSortSnapshot = snap;
  }
  function applyResSortToFolders(type, folderIds, mode) {
    takeResSortSnapshot(type);
    const tree = getResFolderTree(type);
    const sorted = [...folderIds].sort((a, b) => {
      const cmp = a.localeCompare(b, "zh-CN");
      return mode === "az" ? cmp : -cmp;
    });
    sorted.forEach((id, i) => {
      tree[id].sortOrder = i + 1;
    });
    saveResTree(type);
    if (type === "presets") presetSortDirty = true;
    else worldInfoSortDirty = true;
  }
  function revertResSort(type) {
    const snap =
      type === "presets" ? presetSortSnapshot : worldInfoSortSnapshot;
    if (!snap) return;
    const tree = getResFolderTree(type);
    for (const id of Object.keys(snap)) {
      if (tree[id]) tree[id].sortOrder = snap[id];
    }
    saveResTree(type);
    if (type === "presets") {
      presetSortSnapshot = null;
      presetSortDirty = false;
      presetRightSortMode = null;
    } else {
      worldInfoSortSnapshot = null;
      worldInfoSortDirty = false;
      worldInfoRightSortMode = null;
    }
  }
  function sortResItems(items, mode, getName) {
    return [...items].sort((a, b) => {
      const na = getName
        ? getName(a)
        : typeof a === "string"
          ? a
          : a.name || "";
      const nb = getName
        ? getName(b)
        : typeof b === "string"
          ? b
          : b.name || "";
      const cmp = na.localeCompare(nb, "zh-CN");
      return mode === "az" ? cmp : -cmp;
    });
  }

  // 创建预设/世界书排序下拉菜单
  function createResSortDropdown(type, currentMode, snapshot, onSort) {
    const dropdown = $(`
      <div class="cfm-sort-dropdown cfm-sort-open">
        <div class="cfm-sort-dropdown-item ${currentMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="az">
          <i class="fa-solid fa-arrow-down-a-z"></i> A → Z
        </div>
        <div class="cfm-sort-dropdown-item ${currentMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="za">
          <i class="fa-solid fa-arrow-up-z-a"></i> Z → A
        </div>
        <div class="cfm-sort-dropdown-sep"></div>
        <div class="cfm-sort-dropdown-item ${!snapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert">
          <i class="fa-solid fa-rotate-left"></i> 自定义
        </div>
      </div>
    `);
    dropdown.find('[data-sort="az"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("az");
    });
    dropdown.find('[data-sort="za"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("za");
    });
    dropdown.find('[data-sort="revert"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (snapshot) onSort("revert");
    });
    return dropdown;
  }

  // ==================== 排序状态管理 ====================
  let sortDirty = false; // 是否有未确认的排序操作
  let sortSnapshot = null; // 排序前的快照 { folderId: sortOrder, ... }
  let rightCharSortMode = null; // 右栏角色排序模式: null | 'az' | 'za'

  // ==================== 多选模式状态 ====================
  let cfmMultiSelectMode = false;
  let cfmMultiSelected = new Set(); // 当前选中的资源标识符集合（avatar/name）
  let cfmMultiSelectLastClicked = null; // 框选：上次点击的标识符
  let cfmMultiSelectRangeMode = false; // 框选模式开关

  // PC端拖拽数据备份（解决HTML5 dataTransfer可靠性问题）
  let _pcDragData = null;

  // 获取当前右栏可见的资源列表（仅资源，不含文件夹），用于框选
  function getVisibleResourceIds() {
    const list = [];
    const container =
      currentResourceType === "chars"
        ? "#cfm-right-list"
        : currentResourceType === "presets"
          ? "#cfm-preset-right-list"
          : "#cfm-worldinfo-right-list";
    $(container)
      .find(".cfm-row-char[data-res-id]")
      .each(function () {
        list.push($(this).attr("data-res-id"));
      });
    return list;
  }

  function clearMultiSelect() {
    cfmMultiSelected.clear();
    cfmMultiSelectLastClicked = null;
  }

  function toggleMultiSelectItem(id, shiftKey) {
    if ((shiftKey || cfmMultiSelectRangeMode) && cfmMultiSelectLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmMultiSelectLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx >= 0 && curIdx >= 0) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        for (let i = start; i <= end; i++) {
          cfmMultiSelected.add(visible[i]);
        }
      }
    } else {
      if (cfmMultiSelected.has(id)) cfmMultiSelected.delete(id);
      else cfmMultiSelected.add(id);
    }
    cfmMultiSelectLastClicked = id;
  }

  function selectAllVisible() {
    const visible = getVisibleResourceIds();
    const allSelected =
      visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
    if (allSelected) {
      visible.forEach((id) => cfmMultiSelected.delete(id));
    } else {
      visible.forEach((id) => cfmMultiSelected.add(id));
    }
  }

  // 多选拖拽数据：返回包含所有选中项的拖拽数据
  function getMultiDragData(singleData) {
    if (!cfmMultiSelectMode || cfmMultiSelected.size <= 1) return singleData;
    // 如果当前拖拽的项在选中集合中，拖拽整个集合
    const idKey = singleData.avatar || singleData.name;
    if (!cfmMultiSelected.has(idKey)) return singleData;
    return {
      ...singleData,
      multiSelect: true,
      selectedIds: Array.from(cfmMultiSelected),
      count: cfmMultiSelected.size,
    };
  }

  // PC端dragstart辅助：存储拖拽数据到全局变量并设置自定义拖拽图像
  function pcDragStart(e, dragData) {
    _pcDragData = dragData;
    e.originalEvent.dataTransfer.setData(
      "text/plain",
      JSON.stringify(dragData),
    );
    e.originalEvent.dataTransfer.effectAllowed = "move";
    // 多选时设置自定义拖拽图像
    if (dragData.multiSelect && dragData.count > 1) {
      const ghost = document.createElement("div");
      ghost.className = "cfm-pc-drag-ghost";
      ghost.textContent = `📦 共 ${dragData.count} 项`;
      ghost.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;padding:6px 16px;border-radius:8px;background:rgba(40,40,40,0.92);color:#fff;font-size:14px;white-space:nowrap;z-index:99999;pointer-events:none;";
      document.body.appendChild(ghost);
      e.originalEvent.dataTransfer.setDragImage(ghost, 0, 0);
      // 异步移除幽灵元素
      setTimeout(() => ghost.remove(), 0);
    }
  }

  // PC端drop辅助：优先从全局变量获取拖拽数据，回退到dataTransfer
  function pcGetDropData(e) {
    if (_pcDragData) return _pcDragData;
    try {
      return JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
    } catch {
      return null;
    }
  }

  // PC端dragend辅助：清除全局拖拽数据
  function pcDragEnd() {
    _pcDragData = null;
  }

  function showMainPopup() {
    if ($("#cfm-overlay").length > 0) return;
    // 每次打开主弹窗时检测新标签
    detectAndImportNewTags();
    config = loadConfig(); // 刷新配置
    selectedTreeNode = null;
    expandedNodes.clear();
    selectedPresetFolder = null;
    selectedWorldInfoFolder = null;
    presetExpandedNodes.clear();
    worldInfoExpandedNodes.clear();

    const overlay = $('<div id="cfm-overlay"></div>');
    const popup = $(`
            <div id="cfm-popup">
                <div class="cfm-header">
                    <h3>📁 资源管理器</h3>
                    <div class="cfm-header-actions">
                        <button id="cfm-btn-copymode" class="cfm-copymode-btn ${cfmCopyMode ? "cfm-copymode-active" : ""}" title="${cfmCopyMode ? "当前：复制模式（拖拽角色会保留原位置）" : "当前：移动模式（拖拽角色会从原位置移除）"}"><i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}</button>
                        <button id="cfm-btn-config" title="标签管理"><i class="fa-solid fa-gear"></i></button>
                        <button id="cfm-btn-backup" title="导入/导出"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
                        <button class="cfm-btn-close" id="cfm-btn-close-main">&times;</button>
                    </div>
                </div>
                <div class="cfm-resource-tabs">
                    <div class="cfm-tab cfm-tab-active" data-tab="chars"><i class="fa-solid fa-users"></i> 角色卡</div>
                    <div class="cfm-tab" data-tab="worldinfo"><i class="fa-solid fa-book-atlas"></i> 世界书</div>
                    <div class="cfm-tab" data-tab="presets"><i class="fa-solid fa-sliders"></i> 预设</div>
                </div>
                <div class="cfm-global-search-bar" id="cfm-global-search-bar">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-global-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="char">角色卡</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-preset-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-preset-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-preset-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-preset-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-preset-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="preset">预设</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-worldinfo-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-worldinfo-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-worldinfo-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-worldinfo-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-worldinfo-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="worldinfo">世界书</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-dual-pane" id="cfm-chars-view">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <div class="cfm-sort-wrapper" id="cfm-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-rh-count"></span>
                            <div class="cfm-sort-wrapper" id="cfm-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-right-sort-btn" title="角色排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle" id="cfm-multisel-toggle" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-presets-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <div class="cfm-sort-wrapper" id="cfm-preset-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-preset-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-preset-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-preset-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-preset-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-preset-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-preset-rh-count"></span>
                            <div class="cfm-sort-wrapper" id="cfm-preset-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-preset-right-sort-btn" title="预设排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-preset" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-preset-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-worldinfo-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <div class="cfm-sort-wrapper" id="cfm-worldinfo-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-worldinfo-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-worldinfo-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-worldinfo-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-worldinfo-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-worldinfo-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-worldinfo-rh-count"></span>
                            <div class="cfm-sort-wrapper" id="cfm-worldinfo-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-worldinfo-right-sort-btn" title="世界书排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-worldinfo" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-worldinfo-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    overlay.append(popup);
    $("body").append(overlay);

    // 资源类型标签切换
    popup.find(".cfm-tab").on("click touchend", function (e) {
      e.preventDefault();
      const tab = $(this).data("tab");
      if (tab === currentResourceType) return;
      currentResourceType = tab;
      popup.find(".cfm-tab").removeClass("cfm-tab-active");
      $(this).addClass("cfm-tab-active");
      // 切换标签时清空多选状态并关闭多选模式
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
      // 切换视图
      popup.find("#cfm-chars-view").toggle(tab === "chars");
      popup.find("#cfm-presets-view").toggle(tab === "presets");
      popup.find("#cfm-worldinfo-view").toggle(tab === "worldinfo");
      // 切换header按钮可见性 - 移动模式对所有标签可见
      if (tab === "chars") {
        popup.find("#cfm-btn-copymode").show();
        const btn = $("#cfm-btn-copymode");
        btn.toggleClass("cfm-copymode-active", cfmCopyMode);
        btn.html(
          `<i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}`,
        );
      } else {
        popup.find("#cfm-btn-copymode").show();
        const btn = $("#cfm-btn-copymode");
        btn.toggleClass("cfm-copymode-active", resCopyMode);
        btn.html(
          `<i class="fa-solid fa-${resCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${resCopyMode ? "复制" : "移动"}`,
        );
      }
      // 切换搜索栏
      popup.find("#cfm-global-search-bar").toggle(tab === "chars");
      popup.find("#cfm-preset-search-bar").toggle(tab === "presets");
      popup.find("#cfm-worldinfo-search-bar").toggle(tab === "worldinfo");
      if (tab === "presets") renderPresetsView();
      else if (tab === "worldinfo") renderWorldInfoView();
    });

    popup.find("#cfm-btn-close-main").on("click touchend", (e) => {
      e.preventDefault();
      closeMainPopup();
    });
    popup.find("#cfm-btn-config").on("click touchend", (e) => {
      e.preventDefault();
      showConfigPopup();
    });
    popup.find("#cfm-btn-backup").on("click touchend", (e) => {
      e.preventDefault();
      showImportExportPopup();
    });
    // 展开全部 / 收起全部
    popup.find("#cfm-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      const allIds = getFolderTagIds();
      for (const id of allIds) expandedNodes.add(id);
      renderLeftTree();
      renderRightPane();
    });
    popup.find("#cfm-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      expandedNodes.clear();
      renderLeftTree();
      renderRightPane();
    });

    // 右栏排序按钮
    popup.find("#cfm-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-right-sort-wrapper");
      // 右栏排序：对当前选中文件夹的子文件夹排序 + 角色名排序
      const currentFolder = selectedTreeNode;
      const childFolders =
        currentFolder &&
        currentFolder !== "__uncategorized__" &&
        currentFolder !== "__favorites__"
          ? getChildFolders(currentFolder)
          : [];

      // 创建自定义下拉菜单（角色排序 + 子文件夹排序）
      $(".cfm-sort-dropdown").remove();
      const dropdown = $(`
                <div class="cfm-sort-dropdown cfm-sort-open">
                    <div class="cfm-sort-dropdown-item ${rightCharSortMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="char-az">
                        <i class="fa-solid fa-arrow-down-a-z"></i> 角色 A → Z
                    </div>
                    <div class="cfm-sort-dropdown-item ${rightCharSortMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="char-za">
                        <i class="fa-solid fa-arrow-up-z-a"></i> 角色 Z → A
                    </div>
                    ${
                      childFolders.length > 0
                        ? `
                    <div class="cfm-sort-dropdown-sep"></div>
                    <div class="cfm-sort-dropdown-item" data-sort="folder-az">
                        <i class="fa-solid fa-folder"></i> 子文件夹 A → Z
                    </div>
                    <div class="cfm-sort-dropdown-item" data-sort="folder-za">
                        <i class="fa-solid fa-folder"></i> 子文件夹 Z → A
                    </div>`
                        : ""
                    }
                    <div class="cfm-sort-dropdown-sep"></div>
                    <div class="cfm-sort-dropdown-item ${rightCharSortMode === null && !sortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert">
                        <i class="fa-solid fa-rotate-left"></i> 恢复默认
                    </div>
                </div>
            `);

      dropdown.find('[data-sort="char-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        rightCharSortMode = "az";
        updateSortButtonState();
        renderRightPane();
        dropdown.remove();
      });
      dropdown.find('[data-sort="char-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        rightCharSortMode = "za";
        updateSortButtonState();
        renderRightPane();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applySortToFolders(childFolders, "az");
          toastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          updateSortButtonState();
          renderLeftTree();
          renderRightPane();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applySortToFolders(childFolders, "za");
          toastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          updateSortButtonState();
          renderLeftTree();
          renderRightPane();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (rightCharSortMode === null && !sortSnapshot) return;
        rightCharSortMode = null;
        if (sortSnapshot) {
          revertSort();
          toastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        updateSortButtonState();
        renderLeftTree();
        renderRightPane();
        dropdown.remove();
      });

      wrapper.append(dropdown);
      setTimeout(() => {
        $(document).one("click.cfmSortDropdown", (ev) => {
          if (!$(ev.target).closest(".cfm-sort-dropdown").length) {
            dropdown.remove();
          }
        });
      }, 0);
    });

    // 左栏排序按钮
    popup.find("#cfm-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-left-sort-wrapper");
      const topFolders = getTopLevelFolders();
      toggleSortDropdown(
        wrapper,
        topFolders,
        (mode) => {
          if (mode === "revert") {
            revertSort();
            toastr.info("已恢复自定义排序", "", { timeOut: 1500 });
          } else {
            applySortToFolders(topFolders, mode);
            toastr.info(
              mode === "az"
                ? "顶级文件夹已按 A→Z 排序"
                : "顶级文件夹已按 Z→A 排序",
              "",
              { timeOut: 1500 },
            );
          }
          // 更新排序按钮状态
          updateSortButtonState();
          renderLeftTree();
          renderRightPane();
        },
        null,
      );
    });

    popup.find("#cfm-btn-copymode").on("click touchend", (e) => {
      e.preventDefault();
      if (currentResourceType === "chars") {
        cfmCopyMode = !cfmCopyMode;
        const btn = $("#cfm-btn-copymode");
        btn.toggleClass("cfm-copymode-active", cfmCopyMode);
        btn.attr(
          "title",
          cfmCopyMode
            ? "当前：复制模式（拖拽角色会保留原位置）"
            : "当前：移动模式（拖拽角色会从原位置移除）",
        );
        btn.html(
          `<i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}`,
        );
        toastr.info(cfmCopyMode ? "已切换为复制模式" : "已切换为移动模式", "", {
          timeOut: 1500,
        });
      } else {
        resCopyMode = !resCopyMode;
        const btn = $("#cfm-btn-copymode");
        btn.toggleClass("cfm-copymode-active", resCopyMode);
        btn.attr("title", resCopyMode ? "当前：复制模式" : "当前：移动模式");
        btn.html(
          `<i class="fa-solid fa-${resCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${resCopyMode ? "复制" : "移动"}`,
        );
        toastr.info(resCopyMode ? "已切换为复制模式" : "已切换为移动模式", "", {
          timeOut: 1500,
        });
      }
    });

    // 预设展开全部/收起全部
    popup.find("#cfm-preset-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("presets")) presetExpandedNodes.add(id);
      renderPresetsView();
    });
    popup.find("#cfm-preset-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      presetExpandedNodes.clear();
      renderPresetsView();
    });
    // 世界书展开全部/收起全部
    popup.find("#cfm-worldinfo-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("worldinfo"))
        worldInfoExpandedNodes.add(id);
      renderWorldInfoView();
    });
    popup.find("#cfm-worldinfo-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      worldInfoExpandedNodes.clear();
      renderWorldInfoView();
    });

    // 预设左栏排序
    popup.find("#cfm-preset-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-preset-left-sort-wrapper");
      const topFolders = getResTopLevelFolders("presets");
      $(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        "presets",
        presetLeftSortMode,
        presetSortSnapshot,
        (mode) => {
          if (mode === "revert") {
            revertResSort("presets");
            presetLeftSortMode = null;
          } else {
            applyResSortToFolders("presets", topFolders, mode);
            presetLeftSortMode = mode;
          }
          renderPresetsView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        $(document).one("click.cfmSortDropdown", (ev) => {
          if (!$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 预设右栏排序
    popup.find("#cfm-preset-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-preset-right-sort-wrapper");
      const currentFolder = selectedPresetFolder;
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? getResChildFolders("presets", currentFolder)
          : [];
      $(".cfm-sort-dropdown").remove();
      const dropdown = $(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${presetRightSortMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 预设 A → Z</div>
          <div class="cfm-sort-dropdown-item ${presetRightSortMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 预设 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${presetRightSortMode === null && !presetSortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        presetRightSortMode = "az";
        renderPresetsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        presetRightSortMode = "za";
        renderPresetsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("presets", childFolders, "az");
          toastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          renderPresetsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("presets", childFolders, "za");
          toastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          renderPresetsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (presetRightSortMode === null && !presetSortSnapshot) return;
        presetRightSortMode = null;
        if (presetSortSnapshot) {
          revertResSort("presets");
          toastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        renderPresetsView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        $(document).one("click.cfmSortDropdown", (ev) => {
          if (!$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 世界书左栏排序
    popup.find("#cfm-worldinfo-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-worldinfo-left-sort-wrapper");
      const topFolders = getResTopLevelFolders("worldinfo");
      $(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        "worldinfo",
        worldInfoLeftSortMode,
        worldInfoSortSnapshot,
        (mode) => {
          if (mode === "revert") {
            revertResSort("worldinfo");
            worldInfoLeftSortMode = null;
          } else {
            applyResSortToFolders("worldinfo", topFolders, mode);
            worldInfoLeftSortMode = mode;
          }
          renderWorldInfoView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        $(document).one("click.cfmSortDropdown", (ev) => {
          if (!$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 世界书右栏排序
    popup.find("#cfm-worldinfo-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-worldinfo-right-sort-wrapper");
      const currentFolder = selectedWorldInfoFolder;
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? getResChildFolders("worldinfo", currentFolder)
          : [];
      $(".cfm-sort-dropdown").remove();
      const dropdown = $(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${worldInfoRightSortMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 世界书 A → Z</div>
          <div class="cfm-sort-dropdown-item ${worldInfoRightSortMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 世界书 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${worldInfoRightSortMode === null && !worldInfoSortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        worldInfoRightSortMode = "az";
        renderWorldInfoView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        worldInfoRightSortMode = "za";
        renderWorldInfoView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("worldinfo", childFolders, "az");
          toastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          renderWorldInfoView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("worldinfo", childFolders, "za");
          toastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          renderWorldInfoView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (worldInfoRightSortMode === null && !worldInfoSortSnapshot) return;
        worldInfoRightSortMode = null;
        if (worldInfoSortSnapshot) {
          revertResSort("worldinfo");
          toastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        renderWorldInfoView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        $(document).one("click.cfmSortDropdown", (ev) => {
          if (!$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });

    // 多选模式切换
    popup.find(".cfm-multisel-toggle").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      cfmMultiSelectMode = !cfmMultiSelectMode;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      // 更新所有多选按钮的视觉状态
      $(".cfm-multisel-toggle").toggleClass(
        "cfm-multisel-active",
        cfmMultiSelectMode,
      );
      // 重新渲染当前视图
      if (currentResourceType === "chars") renderRightPane();
      else if (currentResourceType === "presets") renderPresetsView();
      else renderWorldInfoView();
    });

    // 重置排序状态
    sortDirty = false;
    sortSnapshot = null;
    rightCharSortMode = null;
    // 重置多选状态
    cfmMultiSelectMode = false;
    clearMultiSelect();
    cfmMultiSelectRangeMode = false;

    renderLeftTree();

    // 预加载世界书名称缓存（后台静默加载，切换标签时无需等待）
    getWorldInfoNames();

    // 全局搜索框事件绑定
    popup.find("#cfm-global-search").on("input", function () {
      const hasText = $(this).val().trim().length > 0;
      $(this)
        .closest(".cfm-search-input-wrapper")
        .toggleClass("cfm-has-text", hasText);
      executeGlobalSearch();
    });
    popup.find("#cfm-global-search-clear").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-global-search").val("").focus();
      $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
      renderRightPane();
    });
    popup.find("#cfm-search-scope").on("change", function () {
      executeGlobalSearch();
    });
    popup.find("#cfm-search-type").on("change", function () {
      const type = $(this).val();
      $("#cfm-global-search").attr(
        "placeholder",
        type === "folder" ? "搜索文件夹..." : "搜索角色...",
      );
      executeGlobalSearch();
    });

    // 预设搜索框事件绑定
    popup.find("#cfm-preset-global-search").on("input", function () {
      const hasText = $(this).val().trim().length > 0;
      $(this)
        .closest(".cfm-search-input-wrapper")
        .toggleClass("cfm-has-text", hasText);
      executePresetSearch();
    });
    popup.find("#cfm-preset-search-clear").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-preset-global-search").val("").focus();
      $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
      renderPresetsView();
    });
    popup.find("#cfm-preset-search-scope").on("change", function () {
      executePresetSearch();
    });
    popup.find("#cfm-preset-search-type").on("change", function () {
      const type = $(this).val();
      $("#cfm-preset-global-search").attr(
        "placeholder",
        type === "folder" ? "搜索文件夹..." : "搜索预设...",
      );
      executePresetSearch();
    });

    // 世界书搜索框事件绑定
    popup.find("#cfm-worldinfo-global-search").on("input", function () {
      const hasText = $(this).val().trim().length > 0;
      $(this)
        .closest(".cfm-search-input-wrapper")
        .toggleClass("cfm-has-text", hasText);
      executeWorldInfoSearch();
    });
    popup
      .find("#cfm-worldinfo-search-clear")
      .on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $("#cfm-worldinfo-global-search").val("").focus();
        $(this)
          .closest(".cfm-search-input-wrapper")
          .removeClass("cfm-has-text");
        renderWorldInfoView();
      });
    popup.find("#cfm-worldinfo-search-scope").on("change", function () {
      executeWorldInfoSearch();
    });
    popup.find("#cfm-worldinfo-search-type").on("change", function () {
      const type = $(this).val();
      $("#cfm-worldinfo-global-search").attr(
        "placeholder",
        type === "folder" ? "搜索文件夹..." : "搜索世界书...",
      );
      executeWorldInfoSearch();
    });
  }

  // ==================== 全局搜索功能 ====================
  function executeGlobalSearch() {
    const q = $("#cfm-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-search-scope").val(); // 'current' | 'all'
    const type = $("#cfm-search-type").val(); // 'char' | 'folder'

    if (!q) {
      // 清空搜索时恢复正常视图
      renderRightPane();
      return;
    }

    const list = $("#cfm-right-list");
    const pathEl = $("#cfm-rh-path");
    const countEl = $("#cfm-rh-count");

    if (type === "folder") {
      // 搜索文件夹
      list.empty();
      const allFolderIds = getFolderTagIds();
      let matchedIds;
      if (
        scope === "current" &&
        selectedTreeNode &&
        selectedTreeNode !== "__uncategorized__" &&
        selectedTreeNode !== "__favorites__"
      ) {
        // 当前文件夹下递归搜索
        const collectDescendants = (parentId) => {
          let result = [parentId];
          for (const childId of getChildFolders(parentId)) {
            result = result.concat(collectDescendants(childId));
          }
          return result;
        };
        const descendants = collectDescendants(selectedTreeNode);
        matchedIds = descendants.filter((id) =>
          getTagName(id).toLowerCase().includes(q),
        );
      } else {
        matchedIds = allFolderIds.filter((id) =>
          getTagName(id).toLowerCase().includes(q),
        );
      }

      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matchedIds.length} 个结果`);

      if (matchedIds.length === 0) {
        list.html('<div class="cfm-right-empty">未找到匹配的文件夹</div>');
        return;
      }

      for (const fid of matchedIds) {
        const folderPath = getFolderPath(fid)
          .map((id) => getTagName(id))
          .join(" › ");
        const childCount = countCharsInFolderRecursive(fid);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result" data-folder-id="${fid}">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getTagName(fid))}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个角色</div>
          </div>
        `);
        row.on("click", (e) => {
          e.preventDefault();
          // 导航到该文件夹
          const fullPath = getFolderPath(fid);
          for (const pid of fullPath) expandedNodes.add(pid);
          selectedTreeNode = fid;
          $("#cfm-global-search").val("");
          renderLeftTree();
          renderRightPane();
        });
        list.append(row);
      }
    } else {
      // 搜索角色
      list.empty();
      let chars;
      if (scope === "current" && selectedTreeNode) {
        if (selectedTreeNode === "__uncategorized__") {
          chars = getUncategorizedCharacters();
        } else if (selectedTreeNode === "__favorites__") {
          chars = getFavoriteCharacters();
        } else {
          // 当前文件夹下递归收集所有角色
          const collectCharsRecursive = (folderId) => {
            let result = [...getCharactersInFolder(folderId)];
            for (const childId of getChildFolders(folderId)) {
              result = result.concat(collectCharsRecursive(childId));
            }
            return result;
          };
          chars = collectCharsRecursive(selectedTreeNode);
        }
      } else {
        chars = getCharacters();
      }

      const matched = chars.filter((c) =>
        (c.name || "").toLowerCase().includes(q),
      );

      pathEl.text(`搜索角色: "${q}"`);
      countEl.text(`${matched.length} 个结果`);

      if (matched.length === 0) {
        list.html('<div class="cfm-right-empty">未找到匹配的角色</div>');
        return;
      }

      // 去重（递归收集可能有重复）
      const seen = new Set();
      for (const char of matched) {
        if (seen.has(char.avatar)) continue;
        seen.add(char.avatar);
        appendCharRow(list, char, true);
      }

      // 多选工具栏（搜索模式下也可用）
      if (cfmMultiSelectMode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          executeGlobalSearch();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          executeGlobalSearch();
        });
        list.prepend(toolbar);
      }
    }
  }

  // ==================== 预设全局搜索 ====================
  function executePresetSearch() {
    const q = $("#cfm-preset-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-preset-search-scope").val();
    const type = $("#cfm-preset-search-type").val();

    if (!q) {
      renderPresetsView();
      return;
    }

    const rightList = $("#cfm-preset-right-list");
    const pathEl = $("#cfm-preset-rh-path");
    const countEl = $("#cfm-preset-rh-count");

    const presets = getCurrentPresets();
    const groups = getResourceGroups("presets");
    const folders = getResourceFolders("presets");

    if (type === "folder") {
      // 搜索文件夹名（支持当前文件夹范围）
      let matchedIds;
      if (
        scope === "current" &&
        selectedPresetFolder &&
        selectedPresetFolder !== "__ungrouped__" &&
        selectedPresetFolder !== "__favorites__" &&
        getResFolderTree("presets")[selectedPresetFolder]
      ) {
        const collectDesc = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("presets", pid))
            r = r.concat(collectDesc(c));
          return r;
        };
        const descendants = collectDesc(selectedPresetFolder);
        matchedIds = descendants.filter((f) =>
          getResFolderDisplayName("presets", f).toLowerCase().includes(q),
        );
      } else {
        matchedIds = folders.filter((f) =>
          getResFolderDisplayName("presets", f).toLowerCase().includes(q),
        );
      }
      rightList.empty();
      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matchedIds.length} 个结果`);
      if (matchedIds.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的文件夹</div>');
        return;
      }
      for (const fname of matchedIds) {
        const folderPath = getResFolderPath("presets", fname)
          .map((id) => getResFolderDisplayName("presets", id))
          .join(" › ");
        const childCount = countResItemsRecursive("presets", fname);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("presets", fname))}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个预设</div>
          </div>
        `);
        row.on("click", () => {
          const path = getResFolderPath("presets", fname);
          for (const pid of path) presetExpandedNodes.add(pid);
          selectedPresetFolder = fname;
          $("#cfm-preset-global-search").val("");
          renderPresetsView();
        });
        rightList.append(row);
      }
    } else {
      // 搜索预设
      let searchPool = presets;
      if (scope === "current" && selectedPresetFolder) {
        if (selectedPresetFolder === "__ungrouped__") {
          searchPool = presets.filter(
            (p) => !groups[p.name] || !folders.includes(groups[p.name]),
          );
        } else if (selectedPresetFolder === "__favorites__") {
          const favs = getResFavorites("presets");
          searchPool = presets.filter((p) => favs.includes(p.name));
        } else if (folders.includes(selectedPresetFolder)) {
          // 递归收集当前文件夹及子文件夹中的预设
          const collectFolderIds = (pid) => {
            let r = [pid];
            for (const c of getResChildFolders("presets", pid))
              r = r.concat(collectFolderIds(c));
            return r;
          };
          const allFids = collectFolderIds(selectedPresetFolder);
          searchPool = presets.filter((p) => allFids.includes(groups[p.name]));
        }
      }
      const matched = searchPool.filter((p) =>
        p.name.toLowerCase().includes(q),
      );
      rightList.empty();
      pathEl.text(`搜索预设: "${q}"`);
      countEl.text(`${matched.length} 个结果`);
      if (matched.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的预设</div>');
        return;
      }
      const pm = getContext().getPresetManager();
      const currentVal = pm && pm.select ? pm.select.val() : null;
      for (const p of matched) {
        const isActive = p.value === currentVal;
        const fav = isResFavorite("presets", p.name);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(p.name);
        const msCheckHtml = cfmMultiSelectMode
          ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
          : "";
        const pFolderPath = (() => {
          const grp = groups[p.name];
          if (grp && getResFolderTree("presets")[grp])
            return getResFolderPath("presets", grp)
              .map((id) => getResFolderDisplayName("presets", id))
              .join(" › ");
          return null;
        })();
        const row = $(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(p.name)}">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-file-lines" style="font-size:20px;color:#8b9dfc;"></i></div>
            <div class="cfm-row-name">${escapeHtml(p.name)}${pFolderPath ? `<div class="cfm-row-folder-path">${escapeHtml(pFolderPath)}</div>` : ""}</div>
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        row.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nowFav = toggleResFavorite("presets", p.name);
          const s = row.find(".cfm-row-star");
          s.toggleClass("cfm-star-active", nowFav);
          s.attr("title", nowFav ? "取消收藏" : "添加收藏");
          s.find("i").attr(
            "class",
            `fa-${nowFav ? "solid" : "regular"} fa-star`,
          );
        });
        row.on("click", (e) => {
          if ($(e.target).closest(".cfm-row-star").length) return;
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          applyPreset(p.value);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          toastr.success(`已应用预设「${p.name}」`);
        });
        // 拖拽支持（搜索模式下也可拖拽）
        row.attr("draggable", "true");
        row.on("dragstart", (e) => {
          const singleData = { type: "preset", name: p.name, value: p.value };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "preset", name: p.name, value: p.value };
          return getMultiDragData(singleData);
        });
        rightList.append(row);
      }

      // 多选工具栏（搜索模式下也可用）
      if (cfmMultiSelectMode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          executePresetSearch();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          executePresetSearch();
        });
        rightList.prepend(toolbar);
      }
    }
  }

  // ==================== 世界书全局搜索 ====================
  function executeWorldInfoSearch() {
    const q = $("#cfm-worldinfo-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-worldinfo-search-scope").val();
    const type = $("#cfm-worldinfo-search-type").val();

    if (!q) {
      renderWorldInfoView();
      return;
    }

    const rightList = $("#cfm-worldinfo-right-list");
    const pathEl = $("#cfm-worldinfo-rh-path");
    const countEl = $("#cfm-worldinfo-rh-count");

    const groups = getResourceGroups("worldinfo");
    const folders = getResourceFolders("worldinfo");

    if (type === "folder") {
      let matchedIds;
      if (
        scope === "current" &&
        selectedWorldInfoFolder &&
        selectedWorldInfoFolder !== "__ungrouped__" &&
        selectedWorldInfoFolder !== "__favorites__" &&
        getResFolderTree("worldinfo")[selectedWorldInfoFolder]
      ) {
        const collectDesc = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("worldinfo", pid))
            r = r.concat(collectDesc(c));
          return r;
        };
        const descendants = collectDesc(selectedWorldInfoFolder);
        matchedIds = descendants.filter((f) =>
          getResFolderDisplayName("worldinfo", f).toLowerCase().includes(q),
        );
      } else {
        matchedIds = folders.filter((f) =>
          getResFolderDisplayName("worldinfo", f).toLowerCase().includes(q),
        );
      }
      rightList.empty();
      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matchedIds.length} 个结果`);
      if (matchedIds.length === 0) {
        rightList.html('<div class="cfm-right-empty">未找到匹配的文件夹</div>');
        return;
      }
      for (const fname of matchedIds) {
        const folderPath = getResFolderPath("worldinfo", fname)
          .map((id) => getResFolderDisplayName("worldinfo", id))
          .join(" › ");
        const childCount = countResItemsRecursive("worldinfo", fname);
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("worldinfo", fname))}<div class="cfm-row-folder-path">${escapeHtml(folderPath)}</div></div>
            <div class="cfm-row-meta">${childCount} 个世界书</div>
          </div>
        `);
        row.on("click", () => {
          const path = getResFolderPath("worldinfo", fname);
          for (const pid of path) worldInfoExpandedNodes.add(pid);
          selectedWorldInfoFolder = fname;
          $("#cfm-worldinfo-global-search").val("");
          renderWorldInfoView();
        });
        rightList.append(row);
      }
    } else {
      // 需要异步获取世界书名称列表
      getWorldInfoNames().then((names) => {
        let searchPool = names;
        if (scope === "current" && selectedWorldInfoFolder) {
          if (selectedWorldInfoFolder === "__ungrouped__") {
            searchPool = names.filter(
              (n) => !groups[n] || !folders.includes(groups[n]),
            );
          } else if (selectedWorldInfoFolder === "__favorites__") {
            const favs = getResFavorites("worldinfo");
            searchPool = names.filter((n) => favs.includes(n));
          } else if (folders.includes(selectedWorldInfoFolder)) {
            const collectFolderIds = (pid) => {
              let r = [pid];
              for (const c of getResChildFolders("worldinfo", pid))
                r = r.concat(collectFolderIds(c));
              return r;
            };
            const allFids = collectFolderIds(selectedWorldInfoFolder);
            searchPool = names.filter((n) => allFids.includes(groups[n]));
          }
        }
        const matched = searchPool.filter((n) => n.toLowerCase().includes(q));
        rightList.empty();
        pathEl.text(`搜索世界书: "${q}"`);
        countEl.text(`${matched.length} 个结果`);
        if (matched.length === 0) {
          rightList.html(
            '<div class="cfm-right-empty">未找到匹配的世界书</div>',
          );
          return;
        }
        for (const n of matched) {
          const fav = isResFavorite("worldinfo", n);
          const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(n);
          const msCheckHtml = cfmMultiSelectMode
            ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
            : "";
          const wFolderPath = (() => {
            const grp = groups[n];
            if (grp && getResFolderTree("worldinfo")[grp])
              return getResFolderPath("worldinfo", grp)
                .map((id) => getResFolderDisplayName("worldinfo", id))
                .join(" › ");
            return null;
          })();
          const row = $(`
            <div class="cfm-row cfm-row-char ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}">
              ${msCheckHtml}
              <div class="cfm-row-icon"><i class="fa-solid fa-book" style="font-size:20px;color:#a6e3a1;"></i></div>
              <div class="cfm-row-name">${escapeHtml(n)}${wFolderPath ? `<div class="cfm-row-folder-path">${escapeHtml(wFolderPath)}</div>` : ""}</div>
              <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
            </div>
          `);
          row.find(".cfm-row-star").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nowFav = toggleResFavorite("worldinfo", n);
            const s = row.find(".cfm-row-star");
            s.toggleClass("cfm-star-active", nowFav);
            s.attr("title", nowFav ? "取消收藏" : "添加收藏");
            s.find("i").attr(
              "class",
              `fa-${nowFav ? "solid" : "regular"} fa-star`,
            );
          });
          row.on("click", (e) => {
            if ($(e.target).closest(".cfm-row-star").length) return;
            if (cfmMultiSelectMode) {
              toggleMultiSelectItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            openWorldInfoEditor(n);
          });
          // 拖拽支持（搜索模式下也可拖拽）
          row.attr("draggable", "true");
          row.on("dragstart", (e) => {
            const singleData = { type: "worldinfo", name: n };
            const dragData = getMultiDragData(singleData);
            pcDragStart(e, dragData);
          });
          row.on("dragend", () => pcDragEnd());
          touchDragMgr.bind(row, () => {
            const singleData = { type: "worldinfo", name: n };
            return getMultiDragData(singleData);
          });
          rightList.append(row);
        }

        // 多选工具栏（搜索模式下也可用）
        if (cfmMultiSelectMode) {
          const visible = getVisibleResourceIds();
          const allSel =
            visible.length > 0 &&
            visible.every((id) => cfmMultiSelected.has(id));
          const toolbar = $(`
            <div class="cfm-multisel-toolbar">
              <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
              <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
              <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
            </div>
          `);
          toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectAllVisible();
            executeWorldInfoSearch();
          });
          toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
            if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
            executeWorldInfoSearch();
          });
          rightList.prepend(toolbar);
        }
      });
    }
  }

  // 更新排序按钮的激活状态
  function updateSortButtonState() {
    const leftBtn = $("#cfm-left-sort-btn");
    leftBtn.toggleClass("cfm-sort-active", sortDirty);
    const rightBtn = $("#cfm-right-sort-btn");
    rightBtn.toggleClass(
      "cfm-sort-active",
      sortDirty || rightCharSortMode !== null,
    );
  }

  function closeMainPopup() {
    if (sortDirty) {
      // 排序已更改，弹出确认框
      showSortConfirmDialog(
        () => {
          // 用户选择"是，保留排序" → 清理状态并关闭
          sortSnapshot = null;
          sortDirty = false;
          rightCharSortMode = null;
          $("#cfm-overlay").remove();
          clearNewlyImportedHighlight();
        },
        () => {
          // 用户选择"否，撤回排序" → 恢复快照并关闭
          revertSort();
          $("#cfm-overlay").remove();
          clearNewlyImportedHighlight();
        },
      );
      return;
    }
    $("#cfm-overlay").remove();
    clearNewlyImportedHighlight();
  }

  // ==================== 左侧树渲染 ====================
  function renderLeftTree() {
    const tree = $("#cfm-left-tree");
    tree.empty();

    // 收藏入口（置顶）
    const favCount = getFavoriteCharacters().length;
    const favNode = $(`
            <div class="cfm-tnode cfm-tnode-favorites ${selectedTreeNode === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
                <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
                <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
                <span class="cfm-tnode-label">收藏</span>
                <span class="cfm-tnode-count">${favCount}</span>
            </div>
        `);
    favNode.on("click", (e) => {
      e.preventDefault();
      selectedTreeNode = "__favorites__";
      refreshSelection();
      renderRightPane();
    });
    tree.append(favNode);

    const topFolders = sortFolders(getTopLevelFolders());

    for (const folderId of topFolders) {
      renderTreeNode(tree, folderId, 0);
    }

    // 未归类角色入口（固定在底部）
    const uncatCount = getUncategorizedCharacters().length;
    const uncatNode = $(`
            <div class="cfm-tnode cfm-tnode-uncategorized ${selectedTreeNode === "__uncategorized__" ? "cfm-tnode-selected" : ""}" data-id="__uncategorized__" style="padding-left:10px;">
                <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
                <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
                <span class="cfm-tnode-label">未归类角色</span>
                <span class="cfm-tnode-count">${uncatCount}</span>
            </div>
        `);
    uncatNode.on("click", (e) => {
      e.preventDefault();
      selectedTreeNode = "__uncategorized__";
      refreshSelection();
      renderRightPane();
    });
    // 未归类入口拖放：将角色移出所有文件夹
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
    });
    uncatNode.on("dragleave", () => {
      uncatNode.removeClass("cfm-drop-target");
    });
    uncatNode.on("drop", (e) => {
      e.preventDefault();
      uncatNode.removeClass("cfm-drop-target");
      const data = pcGetDropData(e);
      if (!data) return;
      if (data.type === "char" && data.avatar) {
        const avatars =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatar];
        const count = avatars.length;
        avatars.forEach((av) => removeCharFromAllFolders(av));
        toastr.success(
          count > 1
            ? `已将 ${count} 个角色移出所有文件夹`
            : `已将「${data.name || data.avatar}」移出所有文件夹`,
        );
        if (data.multiSelect) clearMultiSelect();
        renderLeftTree();
        renderRightPane();
      }
    });
    tree.append(uncatNode);

    if (topFolders.length === 0) {
      // Insert the hint after favorites but before uncategorized
      favNode.after(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }
  }

  function renderTreeNode(container, folderId, depth) {
    const hasChildren = getChildFolders(folderId).length > 0;
    const isExpanded = expandedNodes.has(folderId);
    const isSelected = selectedTreeNode === folderId;
    const count = countCharsInFolderRecursive(folderId);
    const indent = 10 + depth * 16;

    const isNew = isNewlyImported(folderId);
    const node = $(`
            <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""} ${isNew ? "cfm-tnode-new" : ""}" data-id="${folderId}" style="padding-left:${indent}px;" draggable="true">
                <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
                <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
                <span class="cfm-tnode-label">${escapeHtml(getTagName(folderId))}${isNew ? ' <span class="cfm-new-badge">新</span>' : ""}</span>
                <span class="cfm-tnode-count">${count}</span>
            </div>
        `);

    // 点击箭头：展开/收起
    node.find(".cfm-tnode-arrow").on("click", (e) => {
      e.stopPropagation();
      if (!hasChildren) return;
      if (expandedNodes.has(folderId)) expandedNodes.delete(folderId);
      else expandedNodes.add(folderId);
      renderLeftTree();
      renderRightPane();
    });

    // 点击节点本身：选中并在右侧显示内容
    node.on("click", (e) => {
      e.preventDefault();
      selectedTreeNode = folderId;
      refreshSelection();
      // 如果搜索栏有内容，保持搜索模式
      const searchQuery = $("#cfm-global-search").val();
      if (searchQuery && searchQuery.trim()) {
        executeGlobalSearch();
      } else {
        renderRightPane();
      }
    });

    // 移动端触摸拖拽
    touchDragMgr.bind(node, () => ({
      type: "folder",
      id: folderId,
      name: getTagName(folderId),
    }));

    // PC端拖拽
    node.on("dragstart", (e) => {
      pcDragStart(e, { type: "folder", id: folderId });
      node.addClass("cfm-dragging");
    });
    node.on("dragend", () => {
      node.removeClass("cfm-dragging");
      pcDragEnd();
      $(".cfm-tnode").removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
    });

    // 左侧树拖放目标：三区域（上25%=排序到前面, 中50%=嵌套, 下25%=排序到后面）
    node.on("dragover", (e) => {
      e.preventDefault();
      // 清除之前的样式
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );

      // 计算鼠标在节点内的相对位置
      const rect = node[0].getBoundingClientRect();
      const mouseY = e.originalEvent.clientY;
      const relativeY = (mouseY - rect.top) / rect.height;

      // 判断拖放区域
      let dropZone; // 'before' | 'into' | 'after'
      if (relativeY < 0.25) dropZone = "before";
      else if (relativeY > 0.75) dropZone = "after";
      else dropZone = "into";

      node.data("dropZone", dropZone);

      // 对于文件夹拖放，检查循环（仅 into 模式需要检查）
      const data = _pcDragData || {};

      if (data.type === "folder" && data.id) {
        if (data.id === folderId) {
          node.addClass("cfm-drop-forbidden");
          e.originalEvent.dataTransfer.dropEffect = "none";
          return;
        }
        if (dropZone === "into" && wouldCreateCycle(data.id, folderId)) {
          node.addClass("cfm-drop-forbidden");
          e.originalEvent.dataTransfer.dropEffect = "none";
          return;
        }
      }

      // 应用视觉样式
      if (dropZone === "before") node.addClass("cfm-drop-before");
      else if (dropZone === "after") node.addClass("cfm-drop-after");
      else node.addClass("cfm-drop-target");

      e.originalEvent.dataTransfer.dropEffect = "move";
    });
    node.on("dragleave", () => {
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
    });
    node.on("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dropZone = node.data("dropZone") || "into";
      node.removeClass(
        "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
      );
      const data = pcGetDropData(e);
      if (!data) return;

      if (data.type === "folder" && data.id) {
        if (data.id === folderId) return;

        if (dropZone === "into") {
          // 嵌套：拖入文件夹内部
          if (wouldCreateCycle(data.id, folderId)) {
            toastr.error("此操作会产生循环嵌套，已阻止");
            return;
          }
          reorderFolder(data.id, folderId, null);
          toastr.success(
            `「${getTagName(data.id)}」已移入「${getTagName(folderId)}」`,
          );
        } else {
          // 排序：插入到当前节点的前面或后面（同级）
          const targetParentId = config.folders[folderId]?.parentId || null;
          // 检查是否会产生循环（移到目标的父级下）
          if (wouldCreateCycle(data.id, targetParentId)) {
            toastr.error("此操作会产生循环嵌套，已阻止");
            return;
          }
          if (dropZone === "before") {
            reorderFolder(data.id, targetParentId, folderId);
            toastr.success(`「${getTagName(data.id)}」已排序`);
          } else {
            // 'after': 找到当前节点的下一个兄弟节点作为 insertBefore
            const siblings = sortFolders(getChildFolders(targetParentId));
            const curIdx = siblings.indexOf(folderId);
            const nextSiblingId =
              curIdx >= 0 && curIdx < siblings.length - 1
                ? siblings[curIdx + 1]
                : null;
            reorderFolder(data.id, targetParentId, nextSiblingId);
            toastr.success(`「${getTagName(data.id)}」已排序`);
          }
        }
        renderLeftTree();
        renderRightPane();
      } else if (data.type === "char" && data.avatar) {
        // 多选批量移动
        const avatars =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatar];
        const count = avatars.length;
        avatars.forEach((av) => {
          const ch = getCharacters().find((c) => c.avatar === av);
          handleCharDropToFolder(av, folderId, ch?.name || av, count > 1);
        });
        toastr.success(
          count > 1
            ? `已将 ${count} 个角色${cfmCopyMode ? "复制" : "移动"}到「${getTagName(folderId)}」`
            : `已将「${data.name || data.avatar}」${cfmCopyMode ? "复制" : "移动"}到「${getTagName(folderId)}」`,
        );
        if (data.multiSelect) clearMultiSelect();
        renderLeftTree();
        renderRightPane();
      }
    });

    container.append(node);

    // 子节点容器
    if (hasChildren) {
      const childContainer = $(
        `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
      );
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children)
        renderTreeNode(childContainer, childId, depth + 1);
      container.append(childContainer);
    }
  }

  function refreshSelection() {
    $(".cfm-tnode").removeClass("cfm-tnode-selected");
    if (selectedTreeNode) {
      $(`.cfm-tnode[data-id="${selectedTreeNode}"]`).addClass(
        "cfm-tnode-selected",
      );
    }
    // 更新图标
    $(".cfm-tnode .cfm-tnode-icon i.fa-folder-open")
      .removeClass("fa-folder-open")
      .addClass("fa-folder");
    if (
      selectedTreeNode &&
      selectedTreeNode !== "__uncategorized__" &&
      selectedTreeNode !== "__favorites__"
    ) {
      $(`.cfm-tnode[data-id="${selectedTreeNode}"] .cfm-tnode-icon i.fa-folder`)
        .removeClass("fa-folder")
        .addClass("fa-folder-open");
    }
  }

  // ==================== 右侧面板渲染 ====================
  function renderRightPane() {
    const list = $("#cfm-right-list");
    const pathEl = $("#cfm-rh-path");
    const countEl = $("#cfm-rh-count");

    // 如果搜索栏有内容，保持搜索模式（必须在 list.empty() 之前检查）
    const searchQuery = $("#cfm-global-search").val();
    if (searchQuery && searchQuery.trim()) {
      executeGlobalSearch();
      return;
    }

    list.empty();

    if (!selectedTreeNode) {
      pathEl.text("选择左侧文件夹查看内容");
      countEl.text("");
      list.html('<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>');
      return;
    }

    if (selectedTreeNode === "__uncategorized__") {
      pathEl.text("未归类角色");
      let chars = getUncategorizedCharacters();
      if (rightCharSortMode) {
        chars = sortCharacters(chars, rightCharSortMode);
      }
      countEl.text(`${chars.length} 个角色`);
      if (chars.length === 0) {
        list.html('<div class="cfm-right-empty">没有未归类的角色</div>');
        return;
      }
      for (const char of chars) appendCharRow(list, char);
      // 多选工具栏（未归类视图）
      if (cfmMultiSelectMode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderRightPane();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          renderRightPane();
        });
        list.prepend(toolbar);
      }
      return;
    }

    if (selectedTreeNode === "__favorites__") {
      pathEl.text("⭐ 收藏");
      let chars = getFavoriteCharacters();
      if (rightCharSortMode) {
        chars = sortCharacters(chars, rightCharSortMode);
      }
      countEl.text(`${chars.length} 个角色`);
      if (chars.length === 0) {
        list.html(
          '<div class="cfm-right-empty">还没有收藏任何角色<br><span style="font-size:12px;opacity:0.5;">点击角色行右侧的 ☆ 按钮添加收藏</span></div>',
        );
        return;
      }
      for (const char of chars) appendCharRow(list, char, true);
      // 多选工具栏（收藏视图）
      if (cfmMultiSelectMode) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderRightPane();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          renderRightPane();
        });
        list.prepend(toolbar);
      }
      return;
    }

    // 正常文件夹
    const folderId = selectedTreeNode;
    const path = getFolderPath(folderId)
      .map((id) => getTagName(id))
      .join(" › ");
    pathEl.text(path);

    const childFolders = sortFolders(getChildFolders(folderId));
    let chars = getCharactersInFolder(folderId);
    if (rightCharSortMode) {
      chars = sortCharacters(chars, rightCharSortMode);
    }
    const totalItems = childFolders.length + chars.length;
    countEl.text(`${totalItems} 项`);

    if (totalItems === 0) {
      list.html('<div class="cfm-right-empty">此文件夹为空</div>');
      return;
    }

    // 子文件夹行
    for (const childId of childFolders) {
      const childCount = countCharsInFolderRecursive(childId);
      const row = $(`
                <div class="cfm-row cfm-row-folder" data-folder-id="${childId}" draggable="true">
                    <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
                    <div class="cfm-row-name">${escapeHtml(getTagName(childId))}</div>
                    <div class="cfm-row-meta">${childCount} 个角色</div>
                </div>
            `);
      // 点击子文件夹：左侧树展开并选中
      row.on("click", (e) => {
        e.preventDefault();
        // 展开路径上所有节点
        const fullPath = getFolderPath(childId);
        for (const pid of fullPath) expandedNodes.add(pid);
        selectedTreeNode = childId;
        renderLeftTree();
        renderRightPane();
      });
      // 右侧文件夹可拖拽
      row.on("dragstart", (e) => {
        pcDragStart(e, { type: "folder", id: childId });
        row.addClass("cfm-dragging");
      });
      row.on("dragend", () => {
        row.removeClass("cfm-dragging");
        pcDragEnd();
        $(".cfm-row").removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
      });

      // 右侧文件夹行也是拖放目标（三区域：before/into/after）
      row.on("dragover", (e) => {
        e.preventDefault();
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
        const rect = row[0].getBoundingClientRect();
        const mouseY = e.originalEvent.clientY;
        const relativeY = (mouseY - rect.top) / rect.height;
        let dropZone;
        if (relativeY < 0.25) dropZone = "before";
        else if (relativeY > 0.75) dropZone = "after";
        else dropZone = "into";
        row.data("dropZone", dropZone);

        const data = _pcDragData || {};

        if (data.type === "folder" && data.id) {
          if (data.id === childId) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
          if (dropZone === "into" && wouldCreateCycle(data.id, childId)) {
            row.addClass("cfm-drop-forbidden");
            return;
          }
        }

        if (dropZone === "before") row.addClass("cfm-drop-before");
        else if (dropZone === "after") row.addClass("cfm-drop-after");
        else row.addClass("cfm-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      row.on("dragleave", () => {
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
      });
      row.on("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = row.data("dropZone") || "into";
        row.removeClass(
          "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
        );
        const data = pcGetDropData(e);
        if (!data) return;

        if (data.type === "folder" && data.id) {
          if (data.id === childId) return;
          if (dropZone === "into") {
            if (wouldCreateCycle(data.id, childId)) {
              toastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            reorderFolder(data.id, childId, null);
            toastr.success(
              `「${getTagName(data.id)}」已移入「${getTagName(childId)}」`,
            );
          } else {
            const targetParentId = config.folders[childId]?.parentId || null;
            if (wouldCreateCycle(data.id, targetParentId)) {
              toastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            if (dropZone === "before") {
              reorderFolder(data.id, targetParentId, childId);
              toastr.success(`「${getTagName(data.id)}」已排序`);
            } else {
              const siblings = sortFolders(getChildFolders(targetParentId));
              const curIdx = siblings.indexOf(childId);
              const nextSiblingId =
                curIdx >= 0 && curIdx < siblings.length - 1
                  ? siblings[curIdx + 1]
                  : null;
              reorderFolder(data.id, targetParentId, nextSiblingId);
              toastr.success(`「${getTagName(data.id)}」已排序`);
            }
          }
          renderLeftTree();
          renderRightPane();
        } else if (data.type === "char" && data.avatar) {
          const avatars =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.avatar];
          const count = avatars.length;
          avatars.forEach((av) => {
            const ch = getCharacters().find((c) => c.avatar === av);
            handleCharDropToFolder(av, childId, ch?.name || av, count > 1);
          });
          toastr.success(
            count > 1
              ? `已将 ${count} 个角色${cfmCopyMode ? "复制" : "移动"}到「${getTagName(childId)}」`
              : `已将「${data.name || data.avatar}」${cfmCopyMode ? "复制" : "移动"}到「${getTagName(childId)}」`,
          );
          if (data.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        }
      });

      list.append(row);
    }

    // 角色卡行
    for (const char of chars) appendCharRow(list, char);

    // 多选工具栏（在行渲染后添加，确保getVisibleResourceIds可用）
    if (cfmMultiSelectMode) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
      const toolbar = $(`
        <div class="cfm-multisel-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall" title="全选/全不选"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}" title="框选模式"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
          <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
        </div>
      `);
      toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectAllVisible();
        renderRightPane();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
        if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
        renderRightPane();
      });
      list.prepend(toolbar);
    }

    // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
    list.on("dragover", (e) => {
      // 仅在拖到空白区域时触发（不在子行上）
      if ($(e.target).closest(".cfm-row").length > 0) return;
      e.preventDefault();
      list.addClass("cfm-right-list-drop-target");
      e.originalEvent.dataTransfer.dropEffect = "move";
    });
    list.on("dragleave", (e) => {
      if ($(e.relatedTarget).closest("#cfm-right-list").length === 0) {
        list.removeClass("cfm-right-list-drop-target");
      }
    });
    list.on("drop", (e) => {
      if ($(e.target).closest(".cfm-row").length > 0) return;
      e.preventDefault();
      e.stopPropagation();
      list.removeClass("cfm-right-list-drop-target");
      const data = pcGetDropData(e);
      if (!data) return;

      if (data.type === "folder" && data.id) {
        if (data.id === folderId) return;
        if (wouldCreateCycle(data.id, folderId)) {
          toastr.error("此操作会产生循环嵌套，已阻止");
          return;
        }
        reorderFolder(data.id, folderId, null);
        toastr.success(
          `「${getTagName(data.id)}」已移入「${getTagName(folderId)}」`,
        );
        renderLeftTree();
        renderRightPane();
      } else if (data.type === "char" && data.avatar) {
        const avatars =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatar];
        const count = avatars.length;
        avatars.forEach((av) => {
          const ch = getCharacters().find((c) => c.avatar === av);
          handleCharDropToFolder(av, folderId, ch?.name || av, count > 1);
        });
        toastr.success(
          count > 1
            ? `已将 ${count} 个角色${cfmCopyMode ? "复制" : "移动"}到「${getTagName(folderId)}」`
            : `已将「${data.name || data.avatar}」${cfmCopyMode ? "复制" : "移动"}到「${getTagName(folderId)}」`,
        );
        if (data.multiSelect) clearMultiSelect();
        renderLeftTree();
        renderRightPane();
      }
    });
  }

  function appendCharRow(container, char, showFolderPath) {
    const thumbUrl = getThumbnailUrl("avatar", char.avatar);
    const fav = isFavorite(char.avatar);
    const isSelected = cfmMultiSelectMode && cfmMultiSelected.has(char.avatar);
    const folderPathHtml = showFolderPath
      ? (() => {
          const p = findCharFolderPath(char.avatar);
          return p
            ? `<div class="cfm-row-folder-path">${escapeHtml(p)}</div>`
            : "";
        })()
      : "";
    const checkboxHtml = cfmMultiSelectMode
      ? `<div class="cfm-multisel-checkbox ${isSelected ? "cfm-multisel-checked" : ""}"><i class="fa-${isSelected ? "solid" : "regular"} fa-square${isSelected ? "-check" : ""}"></i></div>`
      : "";
    const row = $(`
            <div class="cfm-row cfm-row-char ${isSelected ? "cfm-multisel-row-selected" : ""}" data-avatar="${escapeHtml(char.avatar)}" data-res-id="${escapeHtml(char.avatar)}" draggable="true">
                ${checkboxHtml}
                <div class="cfm-row-icon"><img src="${thumbUrl}" alt="" loading="lazy" onerror="this.src='/img/ai4.png'"></div>
                <div class="cfm-row-name">${escapeHtml(char.name)}${folderPathHtml}</div>
                <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
            </div>
        `);
    // 点击星标切换收藏
    row.find(".cfm-row-star").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nowFav = toggleFavorite(char.avatar);
      const starEl = row.find(".cfm-row-star");
      starEl.toggleClass("cfm-star-active", nowFav);
      starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
      starEl
        .find("i")
        .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
      // 更新左侧树的收藏计数
      const favCountEl = $(".cfm-tnode-favorites .cfm-tnode-count");
      if (favCountEl.length) favCountEl.text(getFavoriteCharacters().length);
      // 如果当前在收藏视图，需要重新渲染
      if (selectedTreeNode === "__favorites__") {
        renderRightPane();
      }
    });
    // 点击行为：多选模式下切换选中，否则打开角色聊天
    row.on("click", (e) => {
      e.preventDefault();
      if ($(e.target).closest(".cfm-row-star").length) return;
      if (cfmMultiSelectMode) {
        toggleMultiSelectItem(char.avatar, e.shiftKey);
        // 更新视觉状态
        renderRightPane();
        return;
      }
      closeMainPopup();
      const characters = getCharacters();
      const idx = characters.findIndex((c) => c.avatar === char.avatar);
      if (idx >= 0) {
        const selectCharacterById = getContext().selectCharacterById;
        if (selectCharacterById) selectCharacterById(idx);
      }
    });
    // 移动端触摸拖拽
    touchDragMgr.bind(row, () => {
      const singleData = {
        type: "char",
        avatar: char.avatar,
        name: char.name,
      };
      return getMultiDragData(singleData);
    });

    // PC端拖拽
    row.on("dragstart", (e) => {
      const singleData = {
        type: "char",
        avatar: char.avatar,
        name: char.name,
      };
      const dragData = getMultiDragData(singleData);
      pcDragStart(e, dragData);
      row.addClass("cfm-dragging");
    });
    row.on("dragend", () => {
      row.removeClass("cfm-dragging");
      pcDragEnd();
    });
    container.append(row);
  }

  // ==================== 标签管理配置弹窗 ====================
  let configSelectedFolderId = null;
  let cfmDeleteMode = false;
  let cfmDeleteSelected = new Set();
  let cfmDeleteCascade = false; // 级联删除模式
  let cfmDeleteLastClickedId = null; // 用于框选的上次点击ID
  let cfmDeleteRangeMode = false; // 框选模式（移动端友好）
  let cfmInvertScope = "all"; // 反选范围：'all' 全部 | 'parent' 当前父级下

  // 预设/世界书配置面板状态
  let resConfigDeleteMode = false;
  let resConfigDeleteSelected = new Set();
  let resConfigDeleteCascade = false;
  let resConfigDeleteLastClickedId = null;
  let resConfigDeleteRangeMode = false;
  let resConfigInvertScope = "all";
  let resConfigSelectedFolderId = null;

  function showConfigPopup() {
    if ($("#cfm-config-overlay").length > 0) return;
    const overlay = $('<div id="cfm-config-overlay"></div>');
    const popup = $(`
            <div id="cfm-config-popup">
                <div class="cfm-config-header">
                    <h3>⚙ 文件夹配置</h3>
                    <button class="cfm-btn-close" id="cfm-btn-close-config">&times;</button>
                </div>
                <div class="cfm-config-body" id="cfm-config-body"></div>
            </div>
        `);
    overlay.append(popup);
    $("body").append(overlay);
    popup.find("#cfm-btn-close-config").on("click touchend", (e) => {
      e.preventDefault();
      closeConfigPopup();
    });
    renderConfigBody();
  }

  function closeConfigPopup() {
    // 重置删除模式状态
    cfmDeleteMode = false;
    cfmDeleteSelected.clear();
    cfmDeleteCascade = false;
    cfmDeleteLastClickedId = null;
    cfmDeleteRangeMode = false;
    resConfigDeleteMode = false;
    resConfigDeleteSelected.clear();
    resConfigDeleteCascade = false;
    resConfigDeleteLastClickedId = null;
    resConfigDeleteRangeMode = false;
    $("#cfm-config-overlay").remove();
    if ($("#cfm-overlay").length > 0) {
      renderLeftTree();
      renderRightPane();
      if (currentResourceType === "presets") renderPresetsView();
      else if (currentResourceType === "worldinfo") renderWorldInfoView();
    }
  }

  function renderConfigBody() {
    const body = $("#cfm-config-body");
    body.empty();

    // 根据当前资源类型分支渲染
    if (
      currentResourceType === "presets" ||
      currentResourceType === "worldinfo"
    ) {
      renderResourceConfigBody(body, currentResourceType);
      return;
    }

    // ===== 以下为角色卡（chars）配置 =====

    // 0. 按钮位置设置
    const currentMode = getButtonMode();
    const modeSection = $(`
            <div class="cfm-config-section cfm-mode-section">
                <label>按钮位置</label>
                <div class="cfm-mode-toggle">
                    <button class="cfm-mode-btn ${currentMode === "topbar" ? "cfm-mode-active" : ""}" data-mode="topbar"><i class="fa-solid fa-bars"></i> 固定在顶栏</button>
                    <button class="cfm-mode-btn ${currentMode === "float" ? "cfm-mode-active" : ""}" data-mode="float"><i class="fa-solid fa-up-down-left-right"></i> 浮动按钮</button>
                </div>
            </div>
        `);
    modeSection.find(".cfm-mode-btn").on("click touchend", function (e) {
      e.preventDefault();
      const newMode = $(this).data("mode");
      if (newMode === getButtonMode()) return;
      switchButtonMode(newMode);
      toastr.success(
        newMode === "topbar" ? "已切换为顶栏按钮" : "已切换为浮动按钮",
      );
      modeSection.find(".cfm-mode-btn").removeClass("cfm-mode-active");
      $(this).addClass("cfm-mode-active");
    });
    body.append(modeSection);

    // 1. 标签导入区域（一键导入 + 单个添加）
    const existingFolderIds = getFolderTagIds();
    const availableTags = getTagList()
      .filter((t) => !existingFolderIds.includes(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    const addSection = $(`
            <div class="cfm-config-section">
                <label>标签同步</label>
                <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center;">
                    <button id="cfm-import-all-btn" class="cfm-btn" style="background:rgba(87,242,135,0.15);color:#57f287;border-color:rgba(87,242,135,0.4);"><i class="fa-solid fa-download"></i> 一键导入所有标签 <span style="opacity:0.6;font-size:11px;">(${availableTags.length} 个可导入)</span></button>
                </div>
                <div class="cfm-create-tag-hint">将酒馆中所有尚未注册为文件夹的标签一次性导入。新标签会在每次打开插件时自动检测并导入。</div>
                <details style="margin-top:8px;">
                    <summary style="cursor:pointer;font-size:12px;opacity:0.6;">▸ 手动添加单个标签</summary>
                    <div class="cfm-add-folder-row" style="margin-top:8px;">
                        <select id="cfm-add-tag-select"><option value="">-- 选择一个标签 --</option></select>
                        <button id="cfm-add-folder-btn">添加为文件夹</button>
                    </div>
                </details>
            </div>
        `);
    const select = addSection.find("#cfm-add-tag-select");
    for (const tag of availableTags)
      select.append(
        `<option value="${tag.id}">${escapeHtml(tag.name)}</option>`,
      );
    addSection.find("#cfm-import-all-btn").on("click touchend", (e) => {
      e.preventDefault();
      const imported = oneClickImportAllTags();
      if (imported > 0) renderConfigBody();
    });
    addSection.find("#cfm-add-folder-btn").on("click touchend", (e) => {
      e.preventDefault();
      const tagId = select.val();
      if (!tagId) {
        toastr.warning("请先选择一个标签");
        return;
      }
      config.folders[tagId] = {
        parentId: configSelectedFolderId || null,
      };
      // 从排除列表中移除（用户主动添加意味着重新纳入管理）
      const _ex = extension_settings[extensionName].excludedTagIds;
      const _exi = _ex.indexOf(tagId);
      if (_exi >= 0) _ex.splice(_exi, 1);
      saveConfig(config);
      const parentHint = configSelectedFolderId
        ? `「${getTagName(configSelectedFolderId)}」的子级`
        : "顶级文件夹";
      toastr.success(`已将「${getTagName(tagId)}」添加为${parentHint}`);
      renderConfigBody();
    });
    body.append(addSection);

    const selectedHintText = configSelectedFolderId
      ? "当前将添加到「" +
        escapeHtml(getTagName(configSelectedFolderId)) +
        "」下。"
      : "当前将添加为顶级文件夹。";
    const createSection = $(`
            <div class="cfm-config-section">
                <label>创建新标签并添加为文件夹</label>
                <div class="cfm-create-tag-row">
                    <input type="text" id="cfm-create-tag-input" placeholder="标签a 标签b 标签c（空格分隔，添加到选中文件夹下）" />
                    <button id="cfm-create-tag-btn"><i class="fa-solid fa-plus"></i> 创建</button>
                </div>
                <div class="cfm-create-tag-hint">${selectedHintText} 空格分隔可批量创建同级标签。点击下方树形视图中的文件夹可选中/取消选中目标父级。</div>
            </div>
        `);
    createSection.find("#cfm-create-tag-btn").on("click touchend", (e) => {
      e.preventDefault();
      const input = createSection
        .find("#cfm-create-tag-input")
        .val()
        .toString()
        .trim();
      if (!input) {
        toastr.warning("请输入标签名称");
        return;
      }
      createTagsSiblings(input, configSelectedFolderId);
      createSection.find("#cfm-create-tag-input").val("");
      renderConfigBody();
    });
    createSection.find("#cfm-create-tag-input").on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createSection.find("#cfm-create-tag-btn").trigger("click");
      }
    });
    body.append(createSection);

    // 1.8 批量创建 & 批量删除
    const batchSection = $(`
            <div class="cfm-config-section">
                <label>批量创建文件夹结构</label>
                <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                    <button id="cfm-batch-create-btn" class="cfm-btn"><i class="fa-solid fa-layer-group"></i> 打开批量创建</button>
                    <button id="cfm-batch-delete-btn" class="cfm-btn ${cfmDeleteMode ? "cfm-btn-danger" : ""}" style="${cfmDeleteMode ? "border-color:rgba(237,66,69,0.5);color:#ed4245;" : ""}"><i class="fa-solid fa-trash-can"></i> ${cfmDeleteMode ? "退出删除模式" : "删除文件夹"}</button>
                </div>
                <div class="cfm-create-tag-hint">支持多行缩进格式，一次性创建完整的文件夹树。</div>
            </div>
        `);
    batchSection.find("#cfm-batch-create-btn").on("click touchend", (e) => {
      e.preventDefault();
      showBatchCreatePopup();
    });
    batchSection.find("#cfm-batch-delete-btn").on("click touchend", (e) => {
      e.preventDefault();
      cfmDeleteMode = !cfmDeleteMode;
      cfmDeleteSelected.clear();
      cfmDeleteCascade = false;
      cfmDeleteLastClickedId = null;
      renderConfigBody();
    });
    body.append(batchSection);

    // 删除模式下显示操作栏（紧跟在批量操作区域下方）
    if (cfmDeleteMode) {
      const allFolderIds = getFolderTagIds();
      const allSelected =
        allFolderIds.length > 0 &&
        allFolderIds.every((id) => cfmDeleteSelected.has(id));

      // 计算反选范围描述
      let invertScopeLabel = "全部文件夹";
      if (cfmInvertScope === "parent") {
        invertScopeLabel = configSelectedFolderId
          ? `「${getTagName(configSelectedFolderId)}」的子级`
          : "顶级文件夹";
      }

      const deleteBar = $(`
                <div class="cfm-delete-bar cfm-delete-bar-controls">
                    <div class="cfm-delete-bar-top">
                        <div class="cfm-delete-bar-left">
                            <button class="cfm-btn cfm-btn-sm" id="cfm-select-all" title="全选/全不选"><i class="fa-solid fa-${allSelected ? "square-minus" : "square-check"}"></i> ${allSelected ? "全不选" : "全选"}</button>
                            <button class="cfm-btn cfm-btn-sm cfm-cascade-btn ${cfmDeleteCascade ? "cfm-cascade-active" : ""}" id="cfm-cascade-toggle" title="开启后，选中父文件夹会自动选中所有子文件夹"><i class="fa-solid fa-sitemap"></i> 级联${cfmDeleteCascade ? "(开)" : "(关)"}</button>
                            <button class="cfm-btn cfm-btn-sm cfm-range-btn ${cfmDeleteRangeMode ? "cfm-range-active" : ""}" id="cfm-range-toggle" title="开启框选模式后：先点击一个文件夹作为起点，再点击另一个文件夹，两者之间的所有文件夹都会被选中"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmDeleteRangeMode ? "(开)" : ""}</button>
                        </div>
                    </div>
                    <div class="cfm-delete-bar-row2">
                        <div class="cfm-delete-bar-left">
                            <button class="cfm-btn cfm-btn-sm" id="cfm-invert-select" title="反选：将已选和未选状态互换"><i class="fa-solid fa-right-left"></i> 反选</button>
                            <select id="cfm-invert-scope" class="cfm-invert-scope-select" title="选择反选的范围">
                                <option value="all" ${cfmInvertScope === "all" ? "selected" : ""}>全部文件夹</option>
                                <option value="parent" ${cfmInvertScope === "parent" ? "selected" : ""}>${configSelectedFolderId ? "「" + escapeHtml(getTagName(configSelectedFolderId)) + "」的子级" : "顶级文件夹"}</option>
                            </select>
                        </div>
                        <span class="cfm-delete-bar-hint">${cfmDeleteRangeMode ? "🎯 框选模式已开启：点击起点文件夹，再点击终点文件夹" : "Shift+点击 或开启「框选」按钮可范围选择"}</span>
                    </div>
                    ${cfmDeleteSelected.size > 0 ? `<div class="cfm-delete-bar-bottom"><span>已选中 ${cfmDeleteSelected.size} 个文件夹</span><button class="cfm-btn cfm-btn-danger" id="cfm-confirm-delete" style="padding:4px 14px;"><i class="fa-solid fa-trash-can"></i> 确认删除</button></div>` : ""}
                </div>
            `);
      deleteBar.find("#cfm-select-all").on("click touchend", (e) => {
        e.preventDefault();
        if (allSelected) {
          cfmDeleteSelected.clear();
        } else {
          allFolderIds.forEach((id) => cfmDeleteSelected.add(id));
        }
        renderConfigBody();
      });
      deleteBar.find("#cfm-cascade-toggle").on("click touchend", (e) => {
        e.preventDefault();
        cfmDeleteCascade = !cfmDeleteCascade;
        renderConfigBody();
      });
      deleteBar.find("#cfm-range-toggle").on("click touchend", (e) => {
        e.preventDefault();
        cfmDeleteRangeMode = !cfmDeleteRangeMode;
        if (cfmDeleteRangeMode) cfmDeleteLastClickedId = null;
        renderConfigBody();
      });
      deleteBar.find("#cfm-invert-scope").on("change", function (e) {
        cfmInvertScope = $(this).val();
      });
      deleteBar.find("#cfm-invert-select").on("click touchend", (e) => {
        e.preventDefault();
        executeInvertSelection();
        renderConfigBody();
      });
      deleteBar.find("#cfm-confirm-delete").on("click touchend", (e) => {
        e.preventDefault();
        executeMultiDelete();
      });
      body.append(deleteBar);
    }

    // 2. 当前文件夹树形展示（支持拖拽 + 点击选中）
    const treeSection = $(`
            <div class="cfm-config-section">
                <label>当前文件夹结构 <span class="cfm-drag-hint">点击选中为目标父级</span></label>
                <div class="cfm-config-tree-actions">
                    <button id="cfm-config-expand-all" class="cfm-btn cfm-btn-sm" title="展开全部"><i class="fa-solid fa-angles-down"></i> 展开</button>
                    <button id="cfm-config-collapse-all" class="cfm-btn cfm-btn-sm" title="收起全部"><i class="fa-solid fa-angles-up"></i> 收起</button>
                </div>
                <div class="cfm-tree" id="cfm-folder-tree"></div>
            </div>
        `);
    body.append(treeSection);

    treeSection.find("#cfm-config-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getFolderTagIds()) configExpandedNodes.add(id);
      renderConfigBody();
    });
    treeSection.find("#cfm-config-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      configExpandedNodes.clear();
      renderConfigBody();
    });

    const treeContainer = treeSection.find("#cfm-folder-tree");

    if (configSelectedFolderId) {
      const selectedHint = $(
        `<div class="cfm-selected-hint"><i class="fa-solid fa-crosshairs"></i> 已选中：<strong>${escapeHtml(getTagName(configSelectedFolderId))}</strong><button class="cfm-btn-deselect" title="取消选中"><i class="fa-solid fa-xmark"></i></button></div>`,
      );
      selectedHint.find(".cfm-btn-deselect").on("click touchend", (e) => {
        e.preventDefault();
        configSelectedFolderId = null;
        renderConfigBody();
      });
      treeContainer.append(selectedHint);
    }

    const topFoldersConfig = sortFolders(getTopLevelFolders());
    if (topFoldersConfig.length === 0) {
      treeContainer.append(
        '<div class="cfm-empty" style="padding:16px;">还没有配置任何文件夹</div>',
      );
    } else {
      for (const folderId of topFoldersConfig)
        renderConfigTreeItem(treeContainer, folderId, 0);
    }
  }

  // ==================== 预设/世界书配置面板渲染 ====================
  function renderResourceConfigBody(body, type) {
    const typeLabel = type === "presets" ? "预设" : "世界书";
    const tree = getResFolderTree(type);
    const allFolderIds = getResFolderIds(type);
    const expandedSet =
      type === "presets"
        ? presetConfigExpandedNodes
        : worldInfoConfigExpandedNodes;

    // 0. 按钮位置设置（共享）
    const currentMode = getButtonMode();
    const modeSection = $(`
      <div class="cfm-config-section cfm-mode-section">
        <label>按钮位置</label>
        <div class="cfm-mode-toggle">
          <button class="cfm-mode-btn ${currentMode === "topbar" ? "cfm-mode-active" : ""}" data-mode="topbar"><i class="fa-solid fa-bars"></i> 固定在顶栏</button>
          <button class="cfm-mode-btn ${currentMode === "float" ? "cfm-mode-active" : ""}" data-mode="float"><i class="fa-solid fa-up-down-left-right"></i> 浮动按钮</button>
        </div>
      </div>
    `);
    modeSection.find(".cfm-mode-btn").on("click touchend", function (e) {
      e.preventDefault();
      const newMode = $(this).data("mode");
      if (newMode === getButtonMode()) return;
      switchButtonMode(newMode);
      toastr.success(
        newMode === "topbar" ? "已切换为顶栏按钮" : "已切换为浮动按钮",
      );
      modeSection.find(".cfm-mode-btn").removeClass("cfm-mode-active");
      $(this).addClass("cfm-mode-active");
    });
    body.append(modeSection);

    // 1. 创建新文件夹（支持空格分隔批量创建）
    const resSelectedHintText = resConfigSelectedFolderId
      ? "当前将添加到「" +
        escapeHtml(getResFolderDisplayName(type, resConfigSelectedFolderId)) +
        "」下。"
      : "当前将添加为顶级文件夹。";
    const createSection = $(`
      <div class="cfm-config-section">
        <label>创建新文件夹</label>
        <div class="cfm-create-tag-row">
          <input type="text" id="cfm-res-create-input" placeholder="a b c（空格分隔，添加到选中文件夹下）" />
          <button id="cfm-res-create-btn"><i class="fa-solid fa-plus"></i> 创建</button>
        </div>
        <div class="cfm-create-tag-hint">${resSelectedHintText} 空格分隔可批量创建同级文件夹。点击下方树形视图中的文件夹可选中/取消选中目标父级。</div>
      </div>
    `);
    createSection.find("#cfm-res-create-btn").on("click touchend", (e) => {
      e.preventDefault();
      const input = createSection.find("#cfm-res-create-input").val().trim();
      if (!input) {
        toastr.warning("请输入文件夹名称");
        return;
      }
      const parentId = resConfigSelectedFolderId || null;
      const names = input.split(/\s+/).filter((s) => s.length > 0);
      const created = [];
      const skipped = [];
      for (const name of names) {
        let folderName = name;
        if (parentId) folderName = parentId + "-" + name;
        if (addResFolder(type, folderName, parentId, parentId ? name : null))
          created.push(name);
        else skipped.push(name);
      }
      const parentHint = parentId
        ? `「${getResFolderDisplayName(type, parentId)}」下`
        : "顶级";
      if (created.length > 0)
        toastr.success(`已创建 ${created.length} 个文件夹`);
      if (skipped.length > 0)
        toastr.warning(`${skipped.length} 个文件夹已存在（跳过）`);
      createSection.find("#cfm-res-create-input").val("");
      renderResourceConfigBody(body.empty(), type);
    });
    createSection.find("#cfm-res-create-input").on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createSection.find("#cfm-res-create-btn").trigger("click");
      }
    });
    body.append(createSection);

    // 2. 批量创建 & 批量删除
    const batchSection = $(`
      <div class="cfm-config-section">
        <label>批量创建文件夹结构</label>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          <button id="cfm-res-batch-create-btn" class="cfm-btn"><i class="fa-solid fa-layer-group"></i> 打开批量创建</button>
          <button id="cfm-res-batch-delete-btn" class="cfm-btn ${resConfigDeleteMode ? "cfm-btn-danger" : ""}" style="${resConfigDeleteMode ? "border-color:rgba(237,66,69,0.5);color:#ed4245;" : ""}"><i class="fa-solid fa-trash-can"></i> ${resConfigDeleteMode ? "退出删除模式" : "删除文件夹"}</button>
        </div>
        <div class="cfm-create-tag-hint">支持多行缩进格式，一次性创建完整的文件夹树。</div>
      </div>
    `);
    batchSection.find("#cfm-res-batch-create-btn").on("click touchend", (e) => {
      e.preventDefault();
      showResourceBatchCreatePopup(type);
    });
    batchSection.find("#cfm-res-batch-delete-btn").on("click touchend", (e) => {
      e.preventDefault();
      resConfigDeleteMode = !resConfigDeleteMode;
      resConfigDeleteSelected.clear();
      resConfigDeleteCascade = false;
      resConfigDeleteLastClickedId = null;
      resConfigDeleteRangeMode = false;
      renderResourceConfigBody(body.empty(), type);
    });
    body.append(batchSection);

    // 删除模式下显示操作栏
    if (resConfigDeleteMode) {
      const allSelected =
        allFolderIds.length > 0 &&
        allFolderIds.every((f) => resConfigDeleteSelected.has(f));
      const deleteBar = $(`
        <div class="cfm-delete-bar cfm-delete-bar-controls">
          <div class="cfm-delete-bar-top">
            <div class="cfm-delete-bar-left">
              <button class="cfm-btn cfm-btn-sm" id="cfm-res-select-all"><i class="fa-solid fa-${allSelected ? "square-minus" : "square-check"}"></i> ${allSelected ? "全不选" : "全选"}</button>
              <button class="cfm-btn cfm-btn-sm cfm-cascade-btn ${resConfigDeleteCascade ? "cfm-cascade-active" : ""}" id="cfm-res-cascade-toggle" title="开启后，选中父文件夹会自动选中所有子文件夹"><i class="fa-solid fa-sitemap"></i> 级联${resConfigDeleteCascade ? "(开)" : "(关)"}</button>
              <button class="cfm-btn cfm-btn-sm cfm-range-btn ${resConfigDeleteRangeMode ? "cfm-range-active" : ""}" id="cfm-res-range-toggle" title="框选模式"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${resConfigDeleteRangeMode ? "(开)" : ""}</button>
            </div>
          </div>
          <div class="cfm-delete-bar-row2">
            <div class="cfm-delete-bar-left">
              <button class="cfm-btn cfm-btn-sm" id="cfm-res-invert-select"><i class="fa-solid fa-right-left"></i> 反选</button>
              <select id="cfm-res-invert-scope" class="cfm-invert-scope-select" title="反选范围">
                <option value="all" ${resConfigInvertScope === "all" ? "selected" : ""}>全部文件夹</option>
                <option value="parent" ${resConfigInvertScope === "parent" ? "selected" : ""}>${resConfigSelectedFolderId ? "「" + escapeHtml(getResFolderDisplayName(type, resConfigSelectedFolderId)) + "」的子级" : "顶级文件夹"}</option>
              </select>
            </div>
            <span class="cfm-delete-bar-hint">${resConfigDeleteRangeMode ? "🎯 框选模式已开启：点击起点文件夹，再点击终点文件夹" : "Shift+点击 或开启「框选」按钮可范围选择"}</span>
          </div>
          ${resConfigDeleteSelected.size > 0 ? `<div class="cfm-delete-bar-bottom"><span>已选中 ${resConfigDeleteSelected.size} 个文件夹</span><button class="cfm-btn cfm-btn-danger" id="cfm-res-confirm-delete" style="padding:4px 14px;"><i class="fa-solid fa-trash-can"></i> 确认删除</button></div>` : ""}
        </div>
      `);
      deleteBar.find("#cfm-res-select-all").on("click touchend", (e) => {
        e.preventDefault();
        if (allSelected) resConfigDeleteSelected.clear();
        else allFolderIds.forEach((f) => resConfigDeleteSelected.add(f));
        renderResourceConfigBody(body.empty(), type);
      });
      deleteBar.find("#cfm-res-cascade-toggle").on("click touchend", (e) => {
        e.preventDefault();
        resConfigDeleteCascade = !resConfigDeleteCascade;
        renderResourceConfigBody(body.empty(), type);
      });
      deleteBar.find("#cfm-res-range-toggle").on("click touchend", (e) => {
        e.preventDefault();
        resConfigDeleteRangeMode = !resConfigDeleteRangeMode;
        if (resConfigDeleteRangeMode) resConfigDeleteLastClickedId = null;
        renderResourceConfigBody(body.empty(), type);
      });
      deleteBar.find("#cfm-res-invert-scope").on("change", function () {
        resConfigInvertScope = $(this).val();
      });
      deleteBar.find("#cfm-res-invert-select").on("click touchend", (e) => {
        e.preventDefault();
        // 反选逻辑
        let targetIds =
          resConfigInvertScope === "parent"
            ? getResTopLevelFolders(type)
            : allFolderIds;
        for (const id of targetIds) {
          if (resConfigDeleteSelected.has(id))
            resConfigDeleteSelected.delete(id);
          else {
            resConfigDeleteSelected.add(id);
            if (resConfigDeleteCascade) {
              const addDesc = (pid) => {
                for (const cid of getResChildFolders(type, pid)) {
                  resConfigDeleteSelected.add(cid);
                  addDesc(cid);
                }
              };
              addDesc(id);
            }
          }
        }
        renderResourceConfigBody(body.empty(), type);
      });
      deleteBar.find("#cfm-res-confirm-delete").on("click touchend", (e) => {
        e.preventDefault();
        executeResourceMultiDelete(type);
        resConfigDeleteCascade = false;
        resConfigDeleteLastClickedId = null;
        resConfigDeleteRangeMode = false;
        renderResourceConfigBody(body.empty(), type);
      });
      body.append(deleteBar);
    }

    // 3. 当前文件夹树形结构
    const treeSection = $(`
      <div class="cfm-config-section">
        <label>当前文件夹结构 <span style="font-size:11px;opacity:0.5;">(${allFolderIds.length} 个)</span></label>
        <div class="cfm-config-tree-actions">
          <button id="cfm-res-config-expand-all" class="cfm-btn cfm-btn-sm"><i class="fa-solid fa-angles-down"></i> 展开</button>
          <button id="cfm-res-config-collapse-all" class="cfm-btn cfm-btn-sm"><i class="fa-solid fa-angles-up"></i> 收起</button>
        </div>
        <div class="cfm-tree" id="cfm-res-folder-tree"></div>
      </div>
    `);
    body.append(treeSection);

    treeSection.find("#cfm-res-config-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of allFolderIds) expandedSet.add(id);
      renderResourceConfigBody(body.empty(), type);
    });
    treeSection
      .find("#cfm-res-config-collapse-all")
      .on("click touchend", (e) => {
        e.preventDefault();
        expandedSet.clear();
        renderResourceConfigBody(body.empty(), type);
      });

    const treeContainer = treeSection.find("#cfm-res-folder-tree");

    if (resConfigSelectedFolderId) {
      const selectedHint = $(
        `<div class="cfm-selected-hint"><i class="fa-solid fa-crosshairs"></i> 已选中：<strong>${escapeHtml(getResFolderDisplayName(type, resConfigSelectedFolderId))}</strong><button class="cfm-btn-deselect" title="取消选中"><i class="fa-solid fa-xmark"></i></button></div>`,
      );
      selectedHint.find(".cfm-btn-deselect").on("click touchend", (e) => {
        e.preventDefault();
        resConfigSelectedFolderId = null;
        renderResourceConfigBody(body.empty(), type);
      });
      treeContainer.append(selectedHint);
    }

    const topFolders = sortResFolders(type, getResTopLevelFolders(type));
    if (topFolders.length === 0) {
      treeContainer.append(
        '<div class="cfm-empty" style="padding:16px;">还没有创建任何文件夹</div>',
      );
    } else {
      function renderResConfigTreeItem(container, folderId, depth) {
        const children = sortResFolders(
          type,
          getResChildFolders(type, folderId),
        );
        const hasChildren = children.length > 0;
        const isExpanded = expandedSet.has(folderId);
        const count = countResItemsRecursive(type, folderId);
        const isDelChecked = resConfigDeleteSelected.has(folderId);
        const indent = 10 + depth * 24;

        let checkboxHtml = "";
        if (resConfigDeleteMode) {
          checkboxHtml = `<span class="cfm-del-checkbox ${isDelChecked ? "cfm-del-checked" : ""}"><i class="fa-${isDelChecked ? "solid" : "regular"} fa-square${isDelChecked ? "-check" : ""}"></i></span>`;
        }
        const arrowHtml = `<span class="cfm-tnode-arrow cfm-config-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>`;

        const isResSelected = resConfigSelectedFolderId === folderId;
        const item = $(`
          <div class="cfm-tree-item ${isResSelected ? "cfm-tree-selected" : ""}" data-folder-name="${escapeHtml(folderId)}" style="padding-left:${indent}px;">
            ${checkboxHtml}
            ${arrowHtml}
            <span class="cfm-tree-icon"><i class="fa-solid fa-folder${isResSelected ? "-open" : ""}"></i></span>
            <span class="cfm-tree-name">${escapeHtml(getResFolderDisplayName(type, folderId))}</span>
            <span class="cfm-tnode-count" style="margin-left:auto;margin-right:8px;">${count}</span>
            ${resConfigDeleteMode ? "" : `<span class="cfm-tree-actions"><button class="cfm-btn-danger cfm-res-remove-folder" data-fname="${escapeHtml(folderId)}" title="删除此文件夹"><i class="fa-solid fa-trash-can"></i></button></span>`}
          </div>
        `);

        item.find(".cfm-config-arrow").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!hasChildren) return;
          if (expandedSet.has(folderId)) expandedSet.delete(folderId);
          else expandedSet.add(folderId);
          renderResourceConfigBody(body.empty(), type);
        });

        if (resConfigDeleteMode) {
          const toggleResFolder = (id, forceState) => {
            const shouldSelect =
              forceState !== undefined
                ? forceState
                : !resConfigDeleteSelected.has(id);
            if (shouldSelect) resConfigDeleteSelected.add(id);
            else resConfigDeleteSelected.delete(id);
            if (resConfigDeleteCascade) {
              const toggleDesc = (pid) => {
                for (const cid of getResChildFolders(type, pid)) {
                  if (shouldSelect) resConfigDeleteSelected.add(cid);
                  else resConfigDeleteSelected.delete(cid);
                  toggleDesc(cid);
                }
              };
              toggleDesc(id);
            }
          };
          const handleResDeleteClick = (e) => {
            if ($(e.target).closest(".cfm-config-arrow").length) return;
            e.preventDefault();
            if (
              (e.shiftKey || resConfigDeleteRangeMode) &&
              resConfigDeleteLastClickedId
            ) {
              const flatList = getResFlatFolderList(type);
              const lastIdx = flatList.indexOf(resConfigDeleteLastClickedId);
              const curIdx = flatList.indexOf(folderId);
              if (lastIdx >= 0 && curIdx >= 0) {
                const start = Math.min(lastIdx, curIdx);
                const end = Math.max(lastIdx, curIdx);
                for (let i = start; i <= end; i++) {
                  resConfigDeleteSelected.add(flatList[i]);
                  if (resConfigDeleteCascade) {
                    const addDesc = (pid) => {
                      for (const cid of getResChildFolders(type, pid)) {
                        resConfigDeleteSelected.add(cid);
                        addDesc(cid);
                      }
                    };
                    addDesc(flatList[i]);
                  }
                }
              }
            } else {
              toggleResFolder(folderId);
            }
            resConfigDeleteLastClickedId = folderId;
            renderResourceConfigBody(body.empty(), type);
          };
          item.on("click touchend", handleResDeleteClick);
        } else {
          // 点击选中/取消选中（非删除模式）
          item.on("click", (e) => {
            if (
              $(e.target).closest(".cfm-res-remove-folder, .cfm-config-arrow")
                .length
            )
              return;
            e.preventDefault();
            resConfigSelectedFolderId =
              resConfigSelectedFolderId === folderId ? null : folderId;
            renderResourceConfigBody(body.empty(), type);
          });
          item.find(".cfm-res-remove-folder").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showResDeleteConfirmDialog(type, [folderId], () => {
              removeResFolder(type, folderId);
              if (resConfigSelectedFolderId === folderId)
                resConfigSelectedFolderId = null;
              toastr.success(`已删除${typeLabel}文件夹「${folderId}」`);
              renderResourceConfigBody(body.empty(), type);
            });
          });
        }
        container.append(item);

        if (hasChildren) {
          const childContainer = $(
            `<div class="cfm-config-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
          );
          for (const childId of children)
            renderResConfigTreeItem(childContainer, childId, depth + 1);
          container.append(childContainer);
        }
      }
      for (const fid of topFolders)
        renderResConfigTreeItem(treeContainer, fid, 0);
    }
  }

  // ==================== 资源删除确认弹窗（与角色卡风格一致） ====================
  function showResDeleteConfirmDialog(type, folderIds, onConfirm) {
    const typeLabel = type === "presets" ? "预设" : "世界书";
    const names = folderIds.map((id) => getResFolderDisplayName(type, id));
    const namesPreview =
      names.length > 5
        ? names.slice(0, 5).join("、") + `…等 ${names.length} 个`
        : names.join("、");

    const overlay = $(
      '<div id="cfm-delete-confirm-overlay" class="cfm-batch-overlay"></div>',
    );
    const dialog = $(`
      <div class="cfm-batch-popup" style="max-width:480px;max-height:320px;">
        <div class="cfm-config-header"><h3>⚠️ 确认删除</h3><button class="cfm-btn-close" id="cfm-rdc-close">&times;</button></div>
        <div style="padding:16px;">
          <div style="margin-bottom:12px;font-size:13px;line-height:1.6;">
            即将删除 <strong>${folderIds.length}</strong> 个文件夹：<br>
            <span style="color:#f9e2af;">${escapeHtml(namesPreview)}</span>
          </div>
          <div style="margin-bottom:16px;font-size:13px;color:#a6adc8;">
            子文件夹将提升到上级，文件夹内的${typeLabel}将变为未归类。
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
            <button id="cfm-rdc-cancel" class="cfm-btn" style="opacity:0.7;">取消</button>
            <button id="cfm-rdc-confirm" class="cfm-btn cfm-btn-danger" style="background:rgba(237,66,69,0.2);border-color:rgba(237,66,69,0.5);">确认删除</button>
          </div>
        </div>
      </div>
    `);
    overlay.append(dialog);
    $("body").append(overlay);
    dialog.find("#cfm-rdc-close, #cfm-rdc-cancel").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });
    dialog.find("#cfm-rdc-confirm").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onConfirm();
    });
  }

  // 预设/世界书批量删除执行
  function executeResourceMultiDelete(type) {
    if (resConfigDeleteSelected.size === 0) return;
    const toDelete = Array.from(resConfigDeleteSelected);
    const typeLabel = type === "presets" ? "预设" : "世界书";

    showResDeleteConfirmDialog(type, toDelete, () => {
      const tree = getResFolderTree(type);
      const sorted = [...toDelete].sort((a, b) => {
        return (
          getResFolderPath(type, b).length - getResFolderPath(type, a).length
        );
      });
      for (const fid of sorted) {
        if (!tree[fid]) continue;
        removeResFolder(type, fid);
      }
      resConfigDeleteSelected.clear();
      resConfigDeleteMode = false;
      toastr.success(`已删除 ${toDelete.length} 个${typeLabel}文件夹`);
      const body = $("#cfm-config-body");
      renderResourceConfigBody(body.empty(), type);
    });
  }

  // 预设/世界书批量创建弹窗（支持缩进嵌套，与角色卡批量创建一致）
  function showResourceBatchCreatePopup(type) {
    if ($("#cfm-res-batch-overlay").length > 0) return;
    const typeLabel = type === "presets" ? "预设" : "世界书";
    let smartIndentChildMode = false;
    const overlay = $(
      '<div id="cfm-res-batch-overlay" class="cfm-batch-overlay"></div>',
    );
    const popup = $(`
      <div class="cfm-batch-popup">
        <div class="cfm-config-header"><h3>📋 批量创建文件夹结构</h3><button class="cfm-btn-close" id="cfm-res-batch-close">&times;</button></div>
        <div style="padding:16px;overflow-y:auto;flex:1;min-height:0;">
          <div class="cfm-create-tag-hint" style="margin-bottom:10px;">每行一个标签名，用缩进表示层级（每2个空格深入一层）。<br>行首的 <code>-</code> 是可选装饰，会被忽略。示例：</div>
          <pre style="background:#1a1a2e;color:#aaa;padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;">1\n  -1.1\n    -1.1.1\n    -1.1.2\n  -1.2\n2\n  -2.1</pre>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <button id="cfm-res-smart-indent-child" class="cfm-btn" style="font-size:12px;padding:3px 10px;" title="开启后，回车将比当前行多缩进2格（创建子级）。关闭时，回车保持同级缩进。退格键始终回退2个空格。"><i class="fa-solid fa-indent"></i> 添加子级</button>
            <span style="font-size:11px;opacity:0.5;">Enter 智能缩进 · Backspace 回退层级</span>
          </div>
          <textarea id="cfm-res-batch-textarea" rows="12" style="width:100%;font-family:monospace;font-size:13px;background:#23272a;color:#f2f3f5;border:1px solid #4e5058;border-radius:6px;padding:10px;resize:vertical;tab-size:2;" placeholder="在此输入文件夹结构..."></textarea>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
            <button id="cfm-res-batch-preview" class="cfm-btn" style="background:#5865f2;">预览</button>
            <button id="cfm-res-batch-confirm" class="cfm-btn" style="background:#57f287;color:#000;">确认创建</button>
          </div>
          <div id="cfm-res-batch-preview-area" style="margin-top:12px;"></div>
        </div>
      </div>
    `);
    overlay.append(popup);
    $("body").append(overlay);

    popup.find("#cfm-res-batch-close").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });

    // 「添加子级」切换按钮
    const childBtn = popup.find("#cfm-res-smart-indent-child");
    childBtn.on("click touchend", (e) => {
      e.preventDefault();
      smartIndentChildMode = !smartIndentChildMode;
      childBtn.toggleClass("cfm-smart-indent-active", smartIndentChildMode);
    });

    // 智能缩进键盘处理
    popup.find("#cfm-res-batch-textarea").on("keydown", function (e) {
      const ta = this;
      if (e.key === "Enter") {
        e.preventDefault();
        const pos = ta.selectionStart;
        const val = ta.value;
        const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
        const lineText = val.substring(lineStart, pos);
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : "";
        const newIndent = smartIndentChildMode
          ? currentIndent + "  "
          : currentIndent;
        const insert = "\n" + newIndent;
        ta.value = val.substring(0, pos) + insert + val.substring(pos);
        const newPos = pos + insert.length;
        ta.selectionStart = ta.selectionEnd = newPos;
      } else if (e.key === "Backspace") {
        const pos = ta.selectionStart;
        const val = ta.value;
        if (pos === ta.selectionEnd && pos > 0) {
          const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
          const beforeCursor = val.substring(lineStart, pos);
          if (/^\s+$/.test(beforeCursor) && beforeCursor.length >= 2) {
            e.preventDefault();
            ta.value = val.substring(0, pos - 2) + val.substring(pos);
            ta.selectionStart = ta.selectionEnd = pos - 2;
          }
        }
      }
    });

    popup.find("#cfm-res-batch-preview").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-res-batch-textarea").val();
      const treeData = parseBatchText(text);
      const area = popup.find("#cfm-res-batch-preview-area");
      area.empty();
      if (treeData.length === 0) {
        area.html('<div style="color:#ed4245;">无法解析，请检查格式。</div>');
        return;
      }
      const existingIds = new Set(getResFolderIds(type));
      area.html(
        '<div style="color:#57f287;margin-bottom:6px;">预览结构：</div>',
      );
      function renderResPreview(container, nodes, depth) {
        for (const node of nodes) {
          const exists = existingIds.has(node.name);
          container.append(
            `<div style="padding-left:${depth * 20}px;font-size:13px;line-height:1.8;${exists ? "color:#ed4245;text-decoration:line-through;" : ""}">📁 ${escapeHtml(node.name)}${exists ? " (已存在，跳过)" : ""}</div>`,
          );
          if (node.children.length > 0)
            renderResPreview(container, node.children, depth + 1);
        }
      }
      renderResPreview(area, treeData, 0);
    });

    popup.find("#cfm-res-batch-confirm").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-res-batch-textarea").val();
      const treeData = parseBatchText(text);
      if (treeData.length === 0) {
        toastr.warning("无法解析，请检查格式");
        return;
      }
      let created = 0,
        skipped = 0;
      function processResNode(node, parentId) {
        let folderName = node.name;
        const tree = getResFolderTree(type);
        // 子文件夹始终使用父级前缀
        if (parentId) {
          folderName = parentId + "-" + node.name;
        }
        // 如果已存在且父级匹配，视为"已存在"，直接用它作为子级的父级
        if (
          tree[folderName] &&
          tree[folderName].parentId === (parentId || null)
        ) {
          skipped++;
          for (const child of node.children) processResNode(child, folderName);
          return;
        }
        // 如果名称冲突但父级不同，追加数字后缀
        if (tree[folderName]) {
          let base = folderName;
          let counter = 2;
          while (tree[folderName]) {
            folderName = base + "_" + counter++;
          }
        }
        const displayName = parentId ? node.name : null;
        if (addResFolder(type, folderName, parentId, displayName)) created++;
        else skipped++;
        for (const child of node.children) processResNode(child, folderName);
      }
      const batchParentId = resConfigSelectedFolderId || null;
      for (const node of treeData) processResNode(node, batchParentId);
      overlay.remove();
      toastr.success(
        `已创建 ${created} 个文件夹${skipped > 0 ? `，${skipped} 个跳过` : ""}`,
      );
      renderConfigBody();
    });
  }

  function renderConfigTreeItem(container, folderId, depth) {
    const indent = depth * 24;
    const name = getTagName(folderId);
    const isSelected = configSelectedFolderId === folderId;
    const isDelChecked = cfmDeleteSelected.has(folderId);
    const hasChildren = getChildFolders(folderId).length > 0;
    const isExpanded = configExpandedNodes.has(folderId);

    let checkboxHtml = "";
    if (cfmDeleteMode) {
      checkboxHtml = `<span class="cfm-del-checkbox ${isDelChecked ? "cfm-del-checked" : ""}" data-del-id="${folderId}"><i class="fa-${isDelChecked ? "solid" : "regular"} fa-square${isDelChecked ? "-check" : ""}"></i></span>`;
    }

    const arrowHtml = `<span class="cfm-tnode-arrow cfm-config-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>`;

    const isNewTag = isNewlyImported(folderId);
    const item = $(`
            <div class="cfm-tree-item ${isSelected ? "cfm-tree-selected" : ""} ${isNewTag ? "cfm-tree-new" : ""}" data-folder-id="${folderId}" style="padding-left:${10 + indent}px;">
                ${checkboxHtml}
                ${arrowHtml}
                <span class="cfm-tree-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
                <span class="cfm-tree-name">${escapeHtml(name)}${isNewTag ? ' <span class="cfm-new-badge">新</span>' : ""}</span>
                ${cfmDeleteMode ? "" : '<span class="cfm-tree-actions"><button class="cfm-btn-danger cfm-remove-folder" data-id="' + folderId + '" title="移除此文件夹"><i class="fa-solid fa-trash-can"></i></button></span>'}
            </div>
        `);

    // 点击箭头：展开/收起
    item.find(".cfm-config-arrow").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hasChildren) return;
      if (configExpandedNodes.has(folderId))
        configExpandedNodes.delete(folderId);
      else configExpandedNodes.add(folderId);
      renderConfigBody();
    });

    // 删除模式：点击复选框/行切换选中状态（支持Shift框选 + 级联）
    if (cfmDeleteMode) {
      const toggleFolder = (id, forceState) => {
        const shouldSelect =
          forceState !== undefined ? forceState : !cfmDeleteSelected.has(id);
        if (shouldSelect) cfmDeleteSelected.add(id);
        else cfmDeleteSelected.delete(id);
        if (cfmDeleteCascade) {
          // 级联：对所有后代也执行同样操作
          const toggleDescendants = (parentId) => {
            for (const childId of getChildFolders(parentId)) {
              if (shouldSelect) cfmDeleteSelected.add(childId);
              else cfmDeleteSelected.delete(childId);
              toggleDescendants(childId);
            }
          };
          toggleDescendants(id);
        }
      };
      const handleDeleteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if ((e.shiftKey || cfmDeleteRangeMode) && cfmDeleteLastClickedId) {
          // 框选：选中上次点击到当前点击之间的所有项（Shift键或框选模式按钮）
          const flatList = getFlatFolderList();
          const lastIdx = flatList.indexOf(cfmDeleteLastClickedId);
          const curIdx = flatList.indexOf(folderId);
          if (lastIdx >= 0 && curIdx >= 0) {
            const start = Math.min(lastIdx, curIdx);
            const end = Math.max(lastIdx, curIdx);
            for (let i = start; i <= end; i++) {
              cfmDeleteSelected.add(flatList[i]);
              if (cfmDeleteCascade) {
                const toggleDesc = (pid) => {
                  for (const cid of getChildFolders(pid)) {
                    cfmDeleteSelected.add(cid);
                    toggleDesc(cid);
                  }
                };
                toggleDesc(flatList[i]);
              }
            }
          }
        } else {
          toggleFolder(folderId);
        }
        cfmDeleteLastClickedId = folderId;
        renderConfigBody();
      };
      item.find(".cfm-del-checkbox").on("click touchend", handleDeleteClick);
      item.on("click", (e) => {
        if ($(e.target).closest(".cfm-del-checkbox, .cfm-config-arrow").length)
          return;
        handleDeleteClick(e);
      });
      container.append(item);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-config-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        const children = sortFolders(getChildFolders(folderId));
        for (const childId of children)
          renderConfigTreeItem(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
      return;
    }
    // 点击选中/取消选中
    item.on("click", (e) => {
      if ($(e.target).closest(".cfm-remove-folder, .cfm-config-arrow").length)
        return;
      e.preventDefault();
      configSelectedFolderId =
        configSelectedFolderId === folderId ? null : folderId;
      renderConfigBody();
    });
    // 删除（带确认弹窗）
    item.find(".cfm-remove-folder").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDeleteConfirmDialog([folderId], (alsoDeleteTags) => {
        const parentId = config.folders[folderId]?.parentId || null;
        const reparentedChildren = [];
        for (const childId of getChildFolders(folderId)) {
          config.folders[childId].parentId = parentId;
          reparentedChildren.push(childId);
        }
        if (alsoDeleteTags) {
          deleteTagFromSystem(folderId);
        } else {
          // 仅删除文件夹但保留标签：加入排除列表防止自动重新导入
          const excluded = extension_settings[extensionName].excludedTagIds;
          if (!excluded.includes(folderId)) excluded.push(folderId);
        }
        delete config.folders[folderId];
        saveConfig(config);
        // 重建被提升的子文件夹的标签名
        for (const childId of reparentedChildren) {
          recursiveRebuildTagNames(childId);
        }
        getContext().saveSettingsDebounced();
        if (configSelectedFolderId === folderId) configSelectedFolderId = null;
        const suffix = alsoDeleteTags ? "（标签已同步删除）" : "";
        toastr.info(`已移除文件夹「${name}」${suffix}`);
        renderConfigBody();
      });
    });
    container.append(item);
    if (hasChildren) {
      const childContainer = $(
        `<div class="cfm-config-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
      );
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children)
        renderConfigTreeItem(childContainer, childId, depth + 1);
      container.append(childContainer);
    }
  }

  // ==================== 反选功能 ====================
  function executeInvertSelection() {
    let targetIds = [];
    if (cfmInvertScope === "parent") {
      // 在指定父级下的直接子文件夹范围内反选
      if (configSelectedFolderId) {
        targetIds = getChildFolders(configSelectedFolderId);
      } else {
        // 没有选中父级时，范围为所有顶级文件夹
        targetIds = getTopLevelFolders();
      }
    } else {
      // 全部文件夹范围内反选
      targetIds = getFolderTagIds();
    }
    for (const id of targetIds) {
      if (cfmDeleteSelected.has(id)) {
        cfmDeleteSelected.delete(id);
      } else {
        cfmDeleteSelected.add(id);
        if (cfmDeleteCascade) {
          // 级联：新选中的项也选中其后代
          const addDescendants = (parentId) => {
            for (const childId of getChildFolders(parentId)) {
              cfmDeleteSelected.add(childId);
              addDescendants(childId);
            }
          };
          addDescendants(id);
        }
      }
    }
  }

  // ==================== 辅助：获取扁平化的文件夹ID列表（按树形DFS顺序） ====================
  function getFlatFolderList() {
    const result = [];
    const topFolders = sortFolders(getTopLevelFolders());
    function dfs(folderId) {
      result.push(folderId);
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children) dfs(childId);
    }
    for (const fid of topFolders) dfs(fid);
    return result;
  }

  function getResFlatFolderList(type) {
    const result = [];
    const topFolders = sortResFolders(type, getResTopLevelFolders(type));
    function dfs(folderId) {
      result.push(folderId);
      const children = sortResFolders(type, getResChildFolders(type, folderId));
      for (const childId of children) dfs(childId);
    }
    for (const fid of topFolders) dfs(fid);
    return result;
  }

  // ==================== 删除确认弹窗 ====================
  function showDeleteConfirmDialog(folderIds, onComplete) {
    const names = folderIds.map((id) => getTagName(id));
    const namesPreview =
      names.length > 5
        ? names.slice(0, 5).join("、") + `…等 ${names.length} 个`
        : names.join("、");

    const overlay = $(
      '<div id="cfm-delete-confirm-overlay" class="cfm-batch-overlay"></div>',
    );
    const dialog = $(`
            <div class="cfm-batch-popup" style="max-width:480px;max-height:320px;">
                <div class="cfm-config-header"><h3>⚠️ 确认删除</h3><button class="cfm-btn-close" id="cfm-dc-close">&times;</button></div>
                <div style="padding:16px;">
                    <div style="margin-bottom:12px;font-size:13px;line-height:1.6;">
                        即将删除 <strong>${folderIds.length}</strong> 个文件夹：<br>
                        <span style="color:#f9e2af;">${escapeHtml(namesPreview)}</span>
                    </div>
                    <div style="margin-bottom:16px;font-size:13px;color:#a6adc8;">
                        是否同时从酒馆系统中删除对应的标签？<br>
                        <span style="color:#ed4245;font-size:12px;">⚠ 删除标签不可撤销，会移除角色与标签的关联。</span>
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                        <button id="cfm-dc-cancel" class="cfm-btn" style="opacity:0.7;">取消</button>
                        <button id="cfm-dc-folder-only" class="cfm-btn" style="background:rgba(88,101,242,0.2);color:#8b9dfc;border-color:rgba(88,101,242,0.4);">仅移除文件夹</button>
                        <button id="cfm-dc-with-tags" class="cfm-btn cfm-btn-danger" style="background:rgba(237,66,69,0.2);border-color:rgba(237,66,69,0.5);">同时删除标签</button>
                    </div>
                </div>
            </div>
        `);
    overlay.append(dialog);
    $("body").append(overlay);
    dialog.find("#cfm-dc-close, #cfm-dc-cancel").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });
    dialog.find("#cfm-dc-folder-only").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onComplete(false);
    });
    dialog.find("#cfm-dc-with-tags").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onComplete(true);
    });
  }

  // ==================== 批量删除执行 ====================
  function executeMultiDelete() {
    if (cfmDeleteSelected.size === 0) return;
    const toDeleteIds = Array.from(cfmDeleteSelected);

    showDeleteConfirmDialog(toDeleteIds, (alsoDeleteTags) => {
      const toDelete = new Set(toDeleteIds);
      const deletedNames = [];

      // 按从叶子到根的顺序处理（深度优先反序），确保子文件夹先被处理
      const flatList = getFlatFolderList();
      const sortedToDelete = flatList
        .filter((id) => toDelete.has(id))
        .reverse();

      const allReparented = [];

      for (const folderId of sortedToDelete) {
        if (!config.folders[folderId]) continue;
        const parentId = config.folders[folderId].parentId || null;
        for (const childId of getChildFolders(folderId)) {
          if (!toDelete.has(childId)) {
            config.folders[childId].parentId = parentId;
            allReparented.push(childId);
          }
        }
        deletedNames.push(getTagName(folderId));
        if (alsoDeleteTags) {
          deleteTagFromSystem(folderId);
        } else {
          // 仅删除文件夹但保留标签：加入排除列表防止自动重新导入
          const excluded = extension_settings[extensionName].excludedTagIds;
          if (!excluded.includes(folderId)) excluded.push(folderId);
        }
        delete config.folders[folderId];
        if (configSelectedFolderId === folderId) configSelectedFolderId = null;
      }
      saveConfig(config);
      for (const childId of allReparented) {
        recursiveRebuildTagNames(childId);
      }
      getContext().saveSettingsDebounced();
      cfmDeleteSelected.clear();
      cfmDeleteCascade = false;
      cfmDeleteLastClickedId = null;
      cfmDeleteRangeMode = false;
      cfmDeleteMode = false;
      const suffix = alsoDeleteTags ? "（标签已同步删除）" : "";
      toastr.success(`已删除 ${deletedNames.length} 个文件夹${suffix}`);
      renderConfigBody();
    });
  }

  // ==================== 空格分隔批量创建同级标签 ====================
  function createTagsSiblings(input, parentFolderId) {
    const names = input.split(/\s+/).filter((s) => s.length > 0);
    if (names.length === 0) {
      toastr.warning("标签名称不能为空");
      return;
    }
    const created = [];
    let prefixCount = 0;
    for (const name of names) {
      const { tag, displayName } = findOrCreateTag(
        name,
        parentFolderId || null,
      );
      if (!config.folders[tag.id]) {
        config.folders[tag.id] = { parentId: parentFolderId || null };
        if (displayName) {
          config.folders[tag.id].displayName = displayName;
          prefixCount++;
        }
        // 从排除列表中移除
        const _ex = extension_settings[extensionName].excludedTagIds;
        const _exi = _ex.indexOf(tag.id);
        if (_exi >= 0) _ex.splice(_exi, 1);
      }
      created.push(displayName || name);
    }
    saveConfig(config);
    getContext().saveSettingsDebounced();
    const parentHint = parentFolderId
      ? `「${getTagName(parentFolderId)}」下`
      : "顶级";
    toastr.success(`已创建 ${created.length} 个文件夹`);
  }

  // ==================== 批量创建弹窗（多行缩进格式） ====================
  function showBatchCreatePopup() {
    if ($("#cfm-batch-overlay").length > 0) return;
    let smartIndentChildMode = false; // 「添加子级」按钮状态
    const overlay = $(
      '<div id="cfm-batch-overlay" class="cfm-batch-overlay"></div>',
    );
    const popup = $(`
            <div class="cfm-batch-popup">
                <div class="cfm-config-header"><h3>📋 批量创建文件夹结构</h3><button class="cfm-btn-close" id="cfm-batch-close">&times;</button></div>
                <div style="padding:16px;overflow-y:auto;flex:1;min-height:0;">
                    <div class="cfm-create-tag-hint" style="margin-bottom:10px;">每行一个标签名，用缩进表示层级（每2个空格深入一层）。<br>行首的 <code>-</code> 是可选装饰，会被忽略。示例：</div>
                    <pre style="background:#1a1a2e;color:#aaa;padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;">1\n  -1.1\n    -1.1.1\n    -1.1.2\n  -1.2\n2\n  -2.1</pre>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <button id="cfm-smart-indent-child" class="cfm-btn" style="font-size:12px;padding:3px 10px;" title="开启后，回车将比当前行多缩进2格（创建子级）。关闭时，回车保持同级缩进。退格键始终回退2个空格。"><i class="fa-solid fa-indent"></i> 添加子级</button>
                        <span style="font-size:11px;opacity:0.5;">Enter 智能缩进 · Backspace 回退层级</span>
                    </div>
                    <textarea id="cfm-batch-textarea" rows="12" style="width:100%;font-family:monospace;font-size:13px;background:#23272a;color:#f2f3f5;border:1px solid #4e5058;border-radius:6px;padding:10px;resize:vertical;tab-size:2;" placeholder="在此输入文件夹结构..."></textarea>
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
                        <button id="cfm-batch-preview" class="cfm-btn" style="background:#5865f2;">预览</button>
                        <button id="cfm-batch-confirm" class="cfm-btn" style="background:#57f287;color:#000;">确认创建</button>
                    </div>
                    <div id="cfm-batch-preview-area" style="margin-top:12px;"></div>
                </div>
            </div>
        `);
    overlay.append(popup);
    $("body").append(overlay);
    popup.find("#cfm-batch-close").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });
    popup.find("#cfm-batch-preview").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-batch-textarea").val();
      const tree = parseBatchText(text);
      const area = popup.find("#cfm-batch-preview-area");
      area.empty();
      if (tree.length === 0) {
        area.html('<div style="color:#ed4245;">无法解析，请检查格式。</div>');
        return;
      }
      area.html(
        '<div style="color:#57f287;margin-bottom:6px;">预览结构：</div>',
      );
      renderBatchPreview(area, tree, 0);
    });
    popup.find("#cfm-batch-confirm").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-batch-textarea").val();
      const tree = parseBatchText(text);
      if (tree.length === 0) {
        toastr.warning("无法解析，请检查格式");
        return;
      }
      executeBatchCreate(tree, configSelectedFolderId || null);
      overlay.remove();
      renderConfigBody();
    });

    // 「添加子级」切换按钮
    const childBtn = popup.find("#cfm-smart-indent-child");
    childBtn.on("click touchend", (e) => {
      e.preventDefault();
      smartIndentChildMode = !smartIndentChildMode;
      childBtn.toggleClass("cfm-smart-indent-active", smartIndentChildMode);
    });

    // 智能缩进键盘处理
    popup.find("#cfm-batch-textarea").on("keydown", function (e) {
      const ta = this;
      if (e.key === "Enter") {
        e.preventDefault();
        const pos = ta.selectionStart;
        const val = ta.value;
        // 找到当前行
        const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
        const lineText = val.substring(lineStart, pos);
        // 获取当前行的缩进
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : "";
        // 计算新行缩进
        const newIndent = smartIndentChildMode
          ? currentIndent + "  "
          : currentIndent;
        const insert = "\n" + newIndent;
        // 插入
        ta.value = val.substring(0, pos) + insert + val.substring(pos);
        const newPos = pos + insert.length;
        ta.selectionStart = ta.selectionEnd = newPos;
      } else if (e.key === "Backspace") {
        const pos = ta.selectionStart;
        const val = ta.value;
        if (pos === ta.selectionEnd && pos > 0) {
          // 检查光标前是否是行首的空格（可以回退2格）
          const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
          const beforeCursor = val.substring(lineStart, pos);
          // 如果光标前全是空格，且至少有2个空格，则回退2格
          if (/^\s+$/.test(beforeCursor) && beforeCursor.length >= 2) {
            e.preventDefault();
            ta.value = val.substring(0, pos - 2) + val.substring(pos);
            ta.selectionStart = ta.selectionEnd = pos - 2;
          }
        }
      }
    });
  }

  function parseBatchText(text) {
    const lines = text.split("\n");
    const root = [];
    const stack = [{ indent: -1, children: root }];
    for (const rawLine of lines) {
      if (rawLine.trim() === "") continue;
      const match = rawLine.match(/^(\s*)/);
      const indent = match ? match[1].replace(/\t/g, "  ").length : 0;
      let name = rawLine
        .trim()
        .replace(/^-+\s*/, "")
        .trim();
      if (!name) continue;
      const node = { name, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent)
        stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push({ indent, children: node.children });
    }
    return root;
  }

  function renderBatchPreview(container, nodes, depth) {
    for (const node of nodes) {
      container.append(
        `<div style="padding-left:${depth * 20}px;font-size:13px;line-height:1.8;">📁 ${escapeHtml(node.name)}</div>`,
      );
      if (node.children.length > 0)
        renderBatchPreview(container, node.children, depth + 1);
    }
  }

  function executeBatchCreate(nodes, parentId) {
    let count = 0;
    let prefixCount = 0;
    function processNode(node, parentTagId) {
      const { tag, displayName } = findOrCreateTag(node.name, parentTagId);
      if (!config.folders[tag.id]) {
        config.folders[tag.id] = { parentId: parentTagId };
        if (displayName) {
          config.folders[tag.id].displayName = displayName;
          prefixCount++;
        }
        // 从排除列表中移除
        const _ex = extension_settings[extensionName].excludedTagIds;
        const _exi = _ex.indexOf(tag.id);
        if (_exi >= 0) _ex.splice(_exi, 1);
        count++;
      }
      for (const child of node.children) processNode(child, tag.id);
    }
    for (const node of nodes) processNode(node, parentId);
    saveConfig(config);
    getContext().saveSettingsDebounced();
    toastr.success(`已创建 ${count} 个文件夹`);
  }

  // ==================== 预设视图渲染（双栏 + 树形嵌套） ====================
  function renderPresetsView() {
    const leftTree = $("#cfm-preset-left-tree");
    const rightList = $("#cfm-preset-right-list");
    const pathEl = $("#cfm-preset-rh-path");
    const countEl = $("#cfm-preset-rh-count");
    leftTree.empty();
    const tree = getResFolderTree("presets");
    const allFolderIds = getResFolderIds("presets");
    const presets = getCurrentPresets();
    const groups = getResourceGroups("presets");

    // 分类：直接属于某文件夹的预设
    const folderItems = {};
    const ungrouped = [];
    for (const p of presets) {
      const grp = groups[p.name];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(p);
      } else {
        ungrouped.push(p);
      }
    }

    // 收藏入口
    const presetFavs = getResFavorites("presets");
    const presetFavCount = presets.filter((p) =>
      presetFavs.includes(p.name),
    ).length;
    const presetFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${selectedPresetFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${presetFavCount}</span>
      </div>
    `);
    presetFavNode.on("click", (e) => {
      e.preventDefault();
      selectedPresetFolder = "__favorites__";
      renderPresetsView();
    });
    leftTree.append(presetFavNode);

    // 递归渲染左侧树节点
    function renderResTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "presets",
        getResChildFolders("presets", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = presetExpandedNodes.has(folderId);
      const isSelected = selectedPresetFolder === folderId;
      const count = countResItemsRecursive("presets", folderId);
      const indent = 10 + depth * 16;

      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("presets", folderId))}</span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);

      // 点击箭头展开/收起
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (presetExpandedNodes.has(folderId))
          presetExpandedNodes.delete(folderId);
        else presetExpandedNodes.add(folderId);
        renderPresetsView();
      });

      // 点击选中
      node.on("click", (e) => {
        e.preventDefault();
        selectedPresetFolder = folderId;
        renderPresetsView();
      });

      // PC拖拽（文件夹排序/嵌套）
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "presets",
          id: folderId,
        });
        node.addClass("cfm-dragging");
      });
      node.on("dragend", () => {
        node.removeClass("cfm-dragging");
        pcDragEnd();
        $(".cfm-tnode").removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
      });

      // 拖放目标（三区域）
      node.on("dragover", (e) => {
        e.preventDefault();
        node.removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
        const rect = node[0].getBoundingClientRect();
        const relY = (e.originalEvent.clientY - rect.top) / rect.height;
        let zone = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "into";
        node.data("dropZone", zone);

        const data = _pcDragData || {};

        if (data.type === "res-folder" && data.resType === "presets") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("presets", data.id, folderId)
          ) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
        }

        if (zone === "before") node.addClass("cfm-drop-before");
        else if (zone === "after") node.addClass("cfm-drop-after");
        else node.addClass("cfm-drop-target");
      });
      node.on("dragleave", () =>
        node.removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        ),
      );
      node.on("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const zone = node.data("dropZone") || "into";
        node.removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
        const data = pcGetDropData(e);
        if (!data) return;

        if (
          data.type === "res-folder" &&
          data.resType === "presets" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("presets", data.id, folderId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("presets", data.id, folderId, null);
            toastr.success(`「${data.id}」已移入「${folderId}」`);
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("presets", data.id, pId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("presets", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "presets",
                getResChildFolders("presets", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "presets",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            toastr.success(`「${data.id}」已排序`);
          }
          renderPresetsView();
        } else if (data.type === "preset") {
          const presetNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const pCount = presetNames.length;
          presetNames.forEach((n) => setItemGroup("presets", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderPresetsView();
          toastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${folderId}」`
              : `已将「${data.name}」移入「${folderId}」`,
          );
        }
      });

      // 触摸拖拽
      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "presets",
        id: folderId,
        name: folderId,
      }));

      container.append(node);

      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderResTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }

    // 渲染顶级文件夹
    const topFolders = sortResFolders(
      "presets",
      getResTopLevelFolders("presets"),
    );
    for (const fid of topFolders) renderResTreeNode(leftTree, fid, 0);

    // 未归类入口
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${selectedPresetFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类预设</span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
    uncatNode.on("click", (e) => {
      e.preventDefault();
      selectedPresetFolder = "__ungrouped__";
      renderPresetsView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
    });
    uncatNode.on("dragleave", () => uncatNode.removeClass("cfm-drop-target"));
    uncatNode.on("drop", (e) => {
      e.preventDefault();
      uncatNode.removeClass("cfm-drop-target");
      const d = pcGetDropData(e);
      if (d) {
        if (d.type === "preset") {
          const presetNames =
            d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
          const pCount = presetNames.length;
          presetNames.forEach((n) => setItemGroup("presets", n, null));
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
          toastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
        }
      }
    });
    leftTree.append(uncatNode);

    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }

    // 右侧渲染
    // 如果搜索栏有内容，保持搜索模式（必须在 rightList.empty() 之前检查）
    const presetSearchQuery = $("#cfm-preset-global-search").val();
    if (presetSearchQuery && presetSearchQuery.trim()) {
      executePresetSearch();
      return;
    }

    rightList.empty();

    const pm = getContext().getPresetManager();
    const currentVal = pm && pm.select ? pm.select.val() : null;

    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];

    if (selectedPresetFolder === "__favorites__") {
      const favs = getResFavorites("presets");
      displayItems = presets.filter((p) => favs.includes(p.name));
      displayTitle = "⭐ 收藏";
    } else if (selectedPresetFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类预设";
    } else if (selectedPresetFolder && tree[selectedPresetFolder]) {
      displayItems = folderItems[selectedPresetFolder] || [];
      childFolders = sortResFolders(
        "presets",
        getResChildFolders("presets", selectedPresetFolder),
      );
      const path = getResFolderPath("presets", selectedPresetFolder)
        .map((id) => getResFolderDisplayName("presets", id))
        .join(" › ");
      displayTitle = path;
    }

    // 应用右栏排序
    if (presetRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(displayItems, presetRightSortMode, (p) =>
        typeof p === "string" ? p : p.name,
      );
    }

    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      selectedPresetFolder === "__favorites__" ||
      selectedPresetFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个预设`);
    } else {
      countEl.text(selectedPresetFolder ? `${totalItems} 项` : "");
    }

    if (!selectedPresetFolder) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (selectedPresetFolder === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何预设<br><span style="font-size:12px;opacity:0.5;">点击预设行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (selectedPresetFolder === "__ungrouped__" && totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">没有未归类的预设</div>');
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("presets", childId);
        const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("presets", childId))}</div>
            <div class="cfm-row-meta">${childCount} 个预设</div>
          </div>
        `);
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("presets", childId);
          for (const pid of path) presetExpandedNodes.add(pid);
          selectedPresetFolder = childId;
          renderPresetsView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "presets",
            id: childId,
          });
          row.addClass("cfm-dragging");
        });
        row.on("dragend", () => {
          row.removeClass("cfm-dragging");
          pcDragEnd();
          $(".cfm-row").removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
        });
        // 右侧子文件夹行也是拖放目标（三区域：before/into/after）
        row.on("dragover", (e) => {
          e.preventDefault();
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
          const rect = row[0].getBoundingClientRect();
          const relY = (e.originalEvent.clientY - rect.top) / rect.height;
          let zone = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "into";
          row.data("dropZone", zone);
          const data = _pcDragData || {};
          if (data.type === "res-folder" && data.resType === "presets") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("presets", data.id, childId)
            ) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
          }
          if (zone === "before") row.addClass("cfm-drop-before");
          else if (zone === "after") row.addClass("cfm-drop-after");
          else row.addClass("cfm-drop-target");
          e.originalEvent.dataTransfer.dropEffect = "move";
        });
        row.on("dragleave", () => {
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
        });
        row.on("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const zone = row.data("dropZone") || "into";
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
          const data = pcGetDropData(e);
          if (!data) return;
          if (
            data.type === "res-folder" &&
            data.resType === "presets" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("presets", data.id, childId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("presets", data.id, childId, null);
              toastr.success(`「${data.id}」已移入「${childId}」`);
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("presets", data.id, pId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("presets", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "presets",
                  getResChildFolders("presets", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "presets",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              toastr.success(`「${data.id}」已排序`);
            }
            renderPresetsView();
          } else if (data.type === "preset") {
            const presetNames =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            const pCount = presetNames.length;
            presetNames.forEach((n) => setItemGroup("presets", n, childId));
            if (data.multiSelect) clearMultiSelect();
            toastr.success(
              pCount > 1
                ? `已将 ${pCount} 个预设移入「${childId}」`
                : `已将「${data.name}」移入「${childId}」`,
            );
            renderPresetsView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "presets",
          id: childId,
          name: getResFolderDisplayName("presets", childId),
        }));
        rightList.append(row);
      }
      // 预设行（带星标 + 多选支持）
      for (const p of displayItems) {
        const isActive = p.value === currentVal;
        const fav = isResFavorite("presets", p.name);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(p.name);
        const msCheckHtml = cfmMultiSelectMode
          ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
          : "";
        const row = $(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-value="${escapeHtml(p.value)}" data-res-id="${escapeHtml(p.name)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-file-lines" style="font-size:20px;color:#8b9dfc;"></i></div>
            <div class="cfm-row-name">${escapeHtml(p.name)}</div>
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        row.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nowFav = toggleResFavorite("presets", p.name);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          // 更新左侧收藏计数
          const favCountEl = $(
            "#cfm-preset-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = presets.filter((pp) =>
              getResFavorites("presets").includes(pp.name),
            ).length;
            favCountEl.text(newCount);
          }
          if (selectedPresetFolder === "__favorites__") renderPresetsView();
        });
        row.on("click", (e) => {
          if ($(e.target).closest(".cfm-row-star").length) return;
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(p.name, e.shiftKey);
            renderPresetsView();
            return;
          }
          applyPreset(p.value);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          toastr.success(`已应用预设「${p.name}」`);
        });
        row.on("dragstart", (e) => {
          const singleData = { type: "preset", name: p.name, value: p.value };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "preset", name: p.name, value: p.value };
          return getMultiDragData(singleData);
        });
        rightList.append(row);
      }

      // 多选工具栏（预设）
      if (cfmMultiSelectMode && selectedPresetFolder) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderPresetsView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          renderPresetsView();
        });
        rightList.prepend(toolbar);
      }
    }

    // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
    if (
      selectedPresetFolder &&
      selectedPresetFolder !== "__ungrouped__" &&
      selectedPresetFolder !== "__favorites__" &&
      tree[selectedPresetFolder]
    ) {
      const currentFolder = selectedPresetFolder;
      rightList.on("dragover", (e) => {
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        rightList.addClass("cfm-right-list-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      rightList.on("dragleave", (e) => {
        if ($(e.relatedTarget).closest("#cfm-preset-right-list").length === 0) {
          rightList.removeClass("cfm-right-list-drop-target");
        }
      });
      rightList.on("drop", (e) => {
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        e.stopPropagation();
        rightList.removeClass("cfm-right-list-drop-target");
        const data = pcGetDropData(e);
        if (!data) return;
        if (
          data.type === "res-folder" &&
          data.resType === "presets" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("presets", data.id, currentFolder)) {
            toastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("presets", data.id, currentFolder, null);
          toastr.success(`「${data.id}」已移入「${currentFolder}」`);
          renderPresetsView();
        } else if (data.type === "preset") {
          const presetNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const pCount = presetNames.length;
          presetNames.forEach((n) => setItemGroup("presets", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          toastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${currentFolder}」`
              : `已将「${data.name}」移入「${currentFolder}」`,
          );
          renderPresetsView();
        }
      });
    }
  }

  // ==================== 世界书视图渲染（双栏 + 树形嵌套） ====================
  async function renderWorldInfoView() {
    const leftTree = $("#cfm-worldinfo-left-tree");
    const rightList = $("#cfm-worldinfo-right-list");
    const pathEl = $("#cfm-worldinfo-rh-path");
    const countEl = $("#cfm-worldinfo-rh-count");

    // 缓存可用时同步获取，避免 await 微任务边界导致的闪烁
    let names;
    if (_worldInfoNamesCache) {
      names = _worldInfoNamesCache;
    } else {
      leftTree.empty();
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>',
      );
      names = await getWorldInfoNames();
    }

    leftTree.empty();
    const tree = getResFolderTree("worldinfo");
    const allFolderIds = getResFolderIds("worldinfo");
    const groups = getResourceGroups("worldinfo");

    // 分类
    const folderItems = {};
    const ungrouped = [];
    for (const n of names) {
      const grp = groups[n];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(n);
      } else {
        ungrouped.push(n);
      }
    }

    leftTree.empty();

    // 递归渲染左侧树节点
    function renderWiTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "worldinfo",
        getResChildFolders("worldinfo", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = worldInfoExpandedNodes.has(folderId);
      const isSelected = selectedWorldInfoFolder === folderId;
      const count = countResItemsRecursive("worldinfo", folderId);
      const indent = 10 + depth * 16;

      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("worldinfo", folderId))}</span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);

      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (worldInfoExpandedNodes.has(folderId))
          worldInfoExpandedNodes.delete(folderId);
        else worldInfoExpandedNodes.add(folderId);
        renderWorldInfoView();
      });

      node.on("click", (e) => {
        e.preventDefault();
        selectedWorldInfoFolder = folderId;
        renderWorldInfoView();
      });

      // PC拖拽
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "worldinfo",
          id: folderId,
        });
        node.addClass("cfm-dragging");
      });
      node.on("dragend", () => {
        node.removeClass("cfm-dragging");
        pcDragEnd();
        $(".cfm-tnode").removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
      });

      // 拖放目标（三区域）
      node.on("dragover", (e) => {
        e.preventDefault();
        node.removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
        const rect = node[0].getBoundingClientRect();
        const relY = (e.originalEvent.clientY - rect.top) / rect.height;
        let zone = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "into";
        node.data("dropZone", zone);

        const data = _pcDragData || {};

        if (data.type === "res-folder" && data.resType === "worldinfo") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("worldinfo", data.id, folderId)
          ) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
        }

        if (zone === "before") node.addClass("cfm-drop-before");
        else if (zone === "after") node.addClass("cfm-drop-after");
        else node.addClass("cfm-drop-target");
      });
      node.on("dragleave", () =>
        node.removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        ),
      );
      node.on("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const zone = node.data("dropZone") || "into";
        node.removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
        const data = pcGetDropData(e);
        if (!data) return;

        if (
          data.type === "res-folder" &&
          data.resType === "worldinfo" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("worldinfo", data.id, folderId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("worldinfo", data.id, folderId, null);
            toastr.success(`「${data.id}」已移入「${folderId}」`);
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("worldinfo", data.id, pId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("worldinfo", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "worldinfo",
                getResChildFolders("worldinfo", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "worldinfo",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            toastr.success(`「${data.id}」已排序`);
          }
          renderWorldInfoView();
        } else if (data.type === "worldinfo") {
          const wiNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const wCount = wiNames.length;
          wiNames.forEach((n) => setItemGroup("worldinfo", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderWorldInfoView();
          toastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${folderId}」`
              : `已将「${data.name}」移入「${folderId}」`,
          );
        }
      });

      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "worldinfo",
        id: folderId,
        name: folderId,
      }));

      container.append(node);

      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderWiTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }

    // 收藏入口
    const wiFavs = getResFavorites("worldinfo");
    const wiFavCount = names.filter((n) => wiFavs.includes(n)).length;
    const wiFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${selectedWorldInfoFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${wiFavCount}</span>
      </div>
    `);
    wiFavNode.on("click", (e) => {
      e.preventDefault();
      selectedWorldInfoFolder = "__favorites__";
      renderWorldInfoView();
    });
    leftTree.append(wiFavNode);

    const topFolders = sortResFolders(
      "worldinfo",
      getResTopLevelFolders("worldinfo"),
    );
    for (const fid of topFolders) renderWiTreeNode(leftTree, fid, 0);

    // 未归类入口
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${selectedWorldInfoFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类世界书</span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
    uncatNode.on("click", (e) => {
      e.preventDefault();
      selectedWorldInfoFolder = "__ungrouped__";
      renderWorldInfoView();
    });
    uncatNode.on("dragover", (e) => {
      e.preventDefault();
      uncatNode.addClass("cfm-drop-target");
    });
    uncatNode.on("dragleave", () => uncatNode.removeClass("cfm-drop-target"));
    uncatNode.on("drop", (e) => {
      e.preventDefault();
      uncatNode.removeClass("cfm-drop-target");
      const d = pcGetDropData(e);
      if (d && d.type === "worldinfo") {
        const wiNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const wCount = wiNames.length;
        wiNames.forEach((n) => setItemGroup("worldinfo", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderWorldInfoView();
        toastr.success(
          wCount > 1
            ? `已将 ${wCount} 个世界书移出文件夹`
            : `已将「${d.name}」移出文件夹`,
        );
      }
    });
    leftTree.append(uncatNode);

    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }

    // 右侧渲染
    // 如果搜索栏有内容，保持搜索模式（必须在 rightList.empty() 之前检查）
    const wiSearchQuery = $("#cfm-worldinfo-global-search").val();
    if (wiSearchQuery && wiSearchQuery.trim()) {
      executeWorldInfoSearch();
      return;
    }

    rightList.empty();

    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];

    if (selectedWorldInfoFolder === "__favorites__") {
      const favs = getResFavorites("worldinfo");
      displayItems = names.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (selectedWorldInfoFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类世界书";
    } else if (selectedWorldInfoFolder && tree[selectedWorldInfoFolder]) {
      displayItems = folderItems[selectedWorldInfoFolder] || [];
      childFolders = sortResFolders(
        "worldinfo",
        getResChildFolders("worldinfo", selectedWorldInfoFolder),
      );
      const path = getResFolderPath("worldinfo", selectedWorldInfoFolder)
        .map((id) => getResFolderDisplayName("worldinfo", id))
        .join(" › ");
      displayTitle = path;
    }

    // 应用右栏排序
    if (worldInfoRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(
        displayItems,
        worldInfoRightSortMode,
        (n) => n,
      );
    }

    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      selectedWorldInfoFolder === "__favorites__" ||
      selectedWorldInfoFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个世界书`);
    } else {
      countEl.text(selectedWorldInfoFolder ? `${totalItems} 项` : "");
    }

    if (!selectedWorldInfoFolder) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (
      selectedWorldInfoFolder === "__favorites__" &&
      totalItems === 0
    ) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何世界书<br><span style="font-size:12px;opacity:0.5;">点击世界书行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (
      selectedWorldInfoFolder === "__ungrouped__" &&
      totalItems === 0
    ) {
      rightList.html('<div class="cfm-right-empty">没有未归类的世界书</div>');
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("worldinfo", childId);
        const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("worldinfo", childId))}</div>
            <div class="cfm-row-meta">${childCount} 个世界书</div>
          </div>
        `);
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("worldinfo", childId);
          for (const pid of path) worldInfoExpandedNodes.add(pid);
          selectedWorldInfoFolder = childId;
          renderWorldInfoView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "worldinfo",
            id: childId,
          });
          row.addClass("cfm-dragging");
        });
        row.on("dragend", () => {
          row.removeClass("cfm-dragging");
          pcDragEnd();
          $(".cfm-row").removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
        });
        // 右侧子文件夹行也是拖放目标（三区域：before/into/after）
        row.on("dragover", (e) => {
          e.preventDefault();
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
          const rect = row[0].getBoundingClientRect();
          const relY = (e.originalEvent.clientY - rect.top) / rect.height;
          let zone = relY < 0.25 ? "before" : relY > 0.75 ? "after" : "into";
          row.data("dropZone", zone);
          const data = _pcDragData || {};
          if (data.type === "res-folder" && data.resType === "worldinfo") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("worldinfo", data.id, childId)
            ) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
          }
          if (zone === "before") row.addClass("cfm-drop-before");
          else if (zone === "after") row.addClass("cfm-drop-after");
          else row.addClass("cfm-drop-target");
          e.originalEvent.dataTransfer.dropEffect = "move";
        });
        row.on("dragleave", () => {
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
        });
        row.on("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const zone = row.data("dropZone") || "into";
          row.removeClass(
            "cfm-drop-target cfm-drop-before cfm-drop-after cfm-drop-forbidden",
          );
          const data = pcGetDropData(e);
          if (!data) return;
          if (
            data.type === "res-folder" &&
            data.resType === "worldinfo" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("worldinfo", data.id, childId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("worldinfo", data.id, childId, null);
              toastr.success(`「${data.id}」已移入「${childId}」`);
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("worldinfo", data.id, pId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("worldinfo", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "worldinfo",
                  getResChildFolders("worldinfo", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "worldinfo",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              toastr.success(`「${data.id}」已排序`);
            }
            renderWorldInfoView();
          } else if (data.type === "worldinfo") {
            const wiNames =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            const wCount = wiNames.length;
            wiNames.forEach((n) => setItemGroup("worldinfo", n, childId));
            if (data.multiSelect) clearMultiSelect();
            toastr.success(
              wCount > 1
                ? `已将 ${wCount} 个世界书移入「${childId}」`
                : `已将「${data.name}」移入「${childId}」`,
            );
            renderWorldInfoView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "worldinfo",
          id: childId,
          name: getResFolderDisplayName("worldinfo", childId),
        }));
        rightList.append(row);
      }
      // 世界书行（带星标 + 多选支持）
      for (const n of displayItems) {
        const fav = isResFavorite("worldinfo", n);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(n);
        const msCheckHtml = cfmMultiSelectMode
          ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
          : "";
        const row = $(`
          <div class="cfm-row cfm-row-char ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-book" style="font-size:20px;color:#a6e3a1;"></i></div>
            <div class="cfm-row-name">${escapeHtml(n)}</div>
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        row.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nowFav = toggleResFavorite("worldinfo", n);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-worldinfo-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = names.filter((nn) =>
              getResFavorites("worldinfo").includes(nn),
            ).length;
            favCountEl.text(newCount);
          }
          if (selectedWorldInfoFolder === "__favorites__")
            renderWorldInfoView();
        });
        row.on("click", (e) => {
          if ($(e.target).closest(".cfm-row-star").length) return;
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(n, e.shiftKey);
            renderWorldInfoView();
            return;
          }
          openWorldInfoEditor(n);
        });
        row.on("dragstart", (e) => {
          const singleData = { type: "worldinfo", name: n };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "worldinfo", name: n };
          return getMultiDragData(singleData);
        });
        rightList.append(row);
      }

      // 多选工具栏（世界书）
      if (cfmMultiSelectMode && selectedWorldInfoFolder) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(`
          <div class="cfm-multisel-toolbar">
            <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
            <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
            <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
          </div>
        `);
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderWorldInfoView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          renderWorldInfoView();
        });
        rightList.prepend(toolbar);
      }
    }

    // 右侧列表本身也是拖放目标（拖到空白区域 = 放入当前文件夹）
    if (
      selectedWorldInfoFolder &&
      selectedWorldInfoFolder !== "__ungrouped__" &&
      selectedWorldInfoFolder !== "__favorites__" &&
      tree[selectedWorldInfoFolder]
    ) {
      const currentFolder = selectedWorldInfoFolder;
      rightList.on("dragover", (e) => {
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        rightList.addClass("cfm-right-list-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      rightList.on("dragleave", (e) => {
        if (
          $(e.relatedTarget).closest("#cfm-worldinfo-right-list").length === 0
        ) {
          rightList.removeClass("cfm-right-list-drop-target");
        }
      });
      rightList.on("drop", (e) => {
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        e.stopPropagation();
        rightList.removeClass("cfm-right-list-drop-target");
        const data = pcGetDropData(e);
        if (!data) return;
        if (
          data.type === "res-folder" &&
          data.resType === "worldinfo" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("worldinfo", data.id, currentFolder)) {
            toastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("worldinfo", data.id, currentFolder, null);
          toastr.success(`「${data.id}」已移入「${currentFolder}」`);
          renderWorldInfoView();
        } else if (data.type === "worldinfo") {
          const wiNames =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          const wCount = wiNames.length;
          wiNames.forEach((n) => setItemGroup("worldinfo", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          toastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${currentFolder}」`
              : `已将「${data.name}」移入「${currentFolder}」`,
          );
          renderWorldInfoView();
        }
      });
    }
  }

  // ==================== 导入导出功能 ====================
  function buildExportData(scope) {
    const data = {
      version: 1,
      pluginName: extensionName,
      exportDate: new Date().toISOString(),
      scope: scope,
    };

    if (scope === "all" || scope === "chars") {
      const charFolders = [];
      const folderPathMap = {};

      function buildFolderPathForExport(tagId) {
        if (folderPathMap[tagId]) return folderPathMap[tagId];
        const folder = config.folders[tagId];
        if (!folder) return null;
        const displayName = getTagName(tagId);
        if (folder.parentId && config.folders[folder.parentId]) {
          const parentPath = buildFolderPathForExport(folder.parentId);
          folderPathMap[tagId] = parentPath
            ? [...parentPath, displayName]
            : [displayName];
        } else {
          folderPathMap[tagId] = [displayName];
        }
        return folderPathMap[tagId];
      }

      for (const tagId of getFolderTagIds()) {
        buildFolderPathForExport(tagId);
        charFolders.push({
          path: folderPathMap[tagId],
          sortOrder: config.folders[tagId]?.sortOrder ?? 0,
        });
      }

      const assignments = {};
      const characters = getCharacters();
      const tagMap = getTagMap();
      const allFolderIdSet = new Set(getFolderTagIds());

      for (const char of characters) {
        const charTags = tagMap[char.avatar] || [];
        const folderTags = charTags.filter((t) => allFolderIdSet.has(t));
        if (folderTags.length > 0) {
          let deepest = folderTags[0];
          let maxDepth = (folderPathMap[deepest] || []).length;
          for (let i = 1; i < folderTags.length; i++) {
            const d = (folderPathMap[folderTags[i]] || []).length;
            if (d > maxDepth) {
              deepest = folderTags[i];
              maxDepth = d;
            }
          }
          if (folderPathMap[deepest]) {
            assignments[char.avatar] = folderPathMap[deepest];
          }
        }
      }

      data.chars = {
        folderTree: charFolders,
        favorites: [...getFavorites()],
        assignments: assignments,
      };
    }

    if (scope === "all" || scope === "presets") {
      ensureResourceSettings();
      data.presets = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("presets"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("presets"))),
        favorites: [...getResFavorites("presets")],
      };
    }

    if (scope === "all" || scope === "worldinfo") {
      ensureResourceSettings();
      data.worldinfo = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("worldinfo"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("worldinfo"))),
        favorites: [...getResFavorites("worldinfo")],
      };
    }

    return data;
  }

  function executeExport(scope) {
    const data = buildExportData(scope);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const scopeLabel =
      scope === "all"
        ? "全部"
        : scope === "chars"
          ? "角色卡"
          : scope === "presets"
            ? "预设"
            : "世界书";
    a.download = `cfm-backup-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastr.success(`已导出${scopeLabel}数据`);
  }

  async function executeImport(jsonData) {
    const report = {
      chars: { matched: 0, skipped: 0 },
      presets: { matched: 0, skipped: 0 },
      worldinfo: { matched: 0, skipped: 0 },
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
              config.folders[existingTagId].sortOrder = folderDef.sortOrder;
            }
          } else {
            const { tag, displayName: dn } = findOrCreateTag(
              displayName,
              parentTagId,
            );
            config.folders[tag.id] = {
              parentId: parentTagId,
              sortOrder: folderDef.sortOrder ?? 0,
            };
            if (dn) config.folders[tag.id].displayName = dn;
            // 从排除列表中移除
            const _ex = extension_settings[extensionName].excludedTagIds;
            const _exi = _ex.indexOf(tag.id);
            if (_exi >= 0) _ex.splice(_exi, 1);
            pathToTagId[pathKey] = tag.id;
            report.foldersCreated++;
          }
        }
        saveConfig(config);
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
    }

    return report;
  }

  function showImportExportPopup() {
    if ($("#cfm-backup-overlay").length > 0) return;
    const overlay = $(
      '<div id="cfm-backup-overlay" class="cfm-batch-overlay"></div>',
    );
    const currentTab =
      currentResourceType === "chars"
        ? "角色卡"
        : currentResourceType === "presets"
          ? "预设"
          : "世界书";
    const popup = $(`
      <div class="cfm-batch-popup" style="max-width:480px;">
        <div class="cfm-config-header">
          <h3>📦 导入 / 导出</h3>
          <button class="cfm-btn-close" id="cfm-backup-close">&times;</button>
        </div>
        <div style="padding:16px;">
          <div class="cfm-config-section">
            <label>导出数据</label>
            <div class="cfm-create-tag-hint" style="margin-bottom:10px;">导出文件夹结构和文件分配关系（不含实际文件内容），用于跨设备迁移。</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="cfm-btn cfm-backup-export-btn" data-scope="all" style="background:rgba(88,101,242,0.2);color:#8b9dfc;border-color:rgba(88,101,242,0.4);"><i class="fa-solid fa-download"></i> 导出全部</button>
              <button class="cfm-btn cfm-backup-export-btn" data-scope="${currentResourceType}" style="background:rgba(87,242,135,0.15);color:#57f287;border-color:rgba(87,242,135,0.4);"><i class="fa-solid fa-download"></i> 仅导出${currentTab}</button>
            </div>
          </div>
          <div class="cfm-config-section" style="margin-top:16px;">
            <label>导入数据</label>
            <div class="cfm-create-tag-hint" style="margin-bottom:10px;">从备份文件恢复。插件会按名称匹配当前设备上已有的文件，匹配到的放入对应文件夹，匹配不到的跳过。</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <button class="cfm-btn" id="cfm-backup-import-btn" style="background:rgba(249,226,175,0.15);color:#f9e2af;border-color:rgba(249,226,175,0.4);"><i class="fa-solid fa-upload"></i> 选择文件导入</button>
              <input type="file" id="cfm-backup-file-input" accept=".json" style="display:none;" />
            </div>
            <div id="cfm-backup-import-result" style="margin-top:10px;"></div>
          </div>
        </div>
      </div>
    `);
    overlay.append(popup);
    $("body").append(overlay);

    popup.find("#cfm-backup-close").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });

    popup.find(".cfm-backup-export-btn").on("click touchend", function (e) {
      e.preventDefault();
      const scope = $(this).data("scope");
      executeExport(scope);
    });

    popup.find("#cfm-backup-import-btn").on("click touchend", (e) => {
      e.preventDefault();
      popup.find("#cfm-backup-file-input").trigger("click");
    });

    popup.find("#cfm-backup-file-input").on("change", function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const jsonData = JSON.parse(ev.target.result);
          if (!jsonData.version || !jsonData.pluginName) {
            toastr.error("无效的备份文件");
            return;
          }
          const resultArea = popup.find("#cfm-backup-import-result");
          resultArea.html(
            '<div style="color:#8b9dfc;"><i class="fa-solid fa-spinner fa-spin"></i> 正在导入...</div>',
          );

          const report = await executeImport(jsonData);
          config = loadConfig();

          let html =
            '<div style="color:#57f287;margin-bottom:6px;">✅ 导入完成</div>';
          html += `<div style="font-size:12px;line-height:1.8;color:#a6adc8;">`;
          html += `创建了 ${report.foldersCreated} 个新文件夹<br>`;
          if (jsonData.chars)
            html += `角色卡：匹配 ${report.chars.matched} 个，跳过 ${report.chars.skipped} 个<br>`;
          if (jsonData.presets)
            html += `预设：匹配 ${report.presets.matched} 个，跳过 ${report.presets.skipped} 个<br>`;
          if (jsonData.worldinfo)
            html += `世界书：匹配 ${report.worldinfo.matched} 个，跳过 ${report.worldinfo.skipped} 个<br>`;
          if (report.favoritesRestored > 0)
            html += `恢复了 ${report.favoritesRestored} 个收藏<br>`;
          html += `</div>`;
          resultArea.html(html);

          renderLeftTree();
          renderRightPane();
          if (currentResourceType === "presets") renderPresetsView();
          else if (currentResourceType === "worldinfo") renderWorldInfoView();
        } catch (err) {
          toastr.error("导入失败：" + err.message);
          console.error("[CFM] Import error:", err);
        }
      };
      reader.readAsText(file);
    });
  }

  // ==================== 初始化 ====================
  autoImportAllTags(); // 首次加载自动导入所有标签
  config = loadConfig(); // 刷新配置（autoImport可能改了settings）
  autoCleanRedundantTags(); // 自动清理多余的路径标签
  initButton();
  console.log(`[${extensionName}] 酒馆资源管理器已加载`);
});
