// 角色卡文件夹分类插件 - Edge收藏夹风格双栏布局
jQuery(async () => {
  const extensionName = "ST-Char-Folder-Manager";
  const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
  const STORAGE_KEY_BTN_POS = "cfm-button-pos";
  const STORAGE_KEY = "cfm-folder-config"; // legacy

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
    let imported = 0;
    for (const tag of tags) {
      if (!existingIds.includes(tag.id)) {
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
      toastr.info(`已自动导入 ${imported} 个标签为文件夹`, "角色卡文件夹", {
        timeOut: 4000,
      });
    }
  }

  // 每次打开弹窗时：检测新标签并自动导入 + 高亮（仅本次打开弹窗高亮）
  function detectAndImportNewTags() {
    const tags = getTagList();
    const existingIds = Object.keys(config.folders);
    const newIds = [];
    for (const tag of tags) {
      if (!existingIds.includes(tag.id)) {
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
        "角色卡文件夹",
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
    let imported = 0,
      skipped = 0;
    for (const tag of tags) {
      if (existingIds.includes(tag.id)) {
        skipped++;
        continue;
      }
      config.folders[tag.id] = { parentId: null };
      imported++;
    }
    if (imported > 0) saveConfig(config);
    toastr.success(
      `共有 ${tags.length} 个标签，成功导入 ${imported} 个，已存在 ${skipped} 个（跳过）`,
    );
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
  function getTagName(tagId) {
    const tag = getTagList().find((t) => t.id === tagId);
    return tag ? tag.name : tagId;
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
    overlay.on("click", (e) => {
      if (e.target === overlay[0]) {
        // 点击遮罩等同于"否"
        overlay.remove();
        onRevert();
      }
    });
  }
  // 移动文件夹到新父级并插入到指定位置
  function reorderFolder(folderId, newParentId, insertBeforeId) {
    config.folders[folderId].parentId = newParentId;
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
  function handleCharDropToFolder(avatar, folderId, charName) {
    if (cfmCopyMode) {
      copyCharToFolder(avatar, folderId);
      toastr.success(`已将「${charName}」复制到「${getTagName(folderId)}」`);
    } else {
      moveCharToFolder(avatar, folderId);
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
        "角色卡文件夹",
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
      `<div id="cfm-topbar-button" class="drawer"><div class="drawer-toggle drawer-header"><div class="drawer-icon fa-solid fa-folder fa-fw interactable" title="角色卡文件夹" tabindex="0" role="button"></div></div></div>`,
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

    btn.on("mousedown touchstart", (e) => {
      isDragging = true;
      hasMoved = false;
      btn.css("cursor", "grabbing");
      const ev = e.type === "touchstart" ? e.originalEvent.touches[0] : e;
      const pos = btn.offset();
      offset.x = ev.pageX - pos.left;
      offset.y = ev.pageY - pos.top;
      startPos.x = ev.pageX;
      startPos.y = ev.pageY;
      e.preventDefault();
    });

    $(document).on("mousemove.cfmDrag touchmove.cfmDrag", (e) => {
      if (!isDragging) return;
      const ev = e.type === "touchmove" ? e.originalEvent.touches[0] : e;
      const deltaX = Math.abs(ev.pageX - startPos.x);
      const deltaY = Math.abs(ev.pageY - startPos.y);
      // 移动超过5px才算拖拽
      if (deltaX > 5 || deltaY > 5) {
        hasMoved = true;
      }
      if (hasMoved) {
        btn.css({
          top: ev.pageY - offset.y + "px",
          left: ev.pageX - offset.x + "px",
          right: "auto",
          bottom: "auto",
        });
      }
    });

    $(document).on("mouseup.cfmDrag touchend.cfmDrag", (e) => {
      if (!isDragging) return;
      isDragging = false;
      btn.css("cursor", "grab");
      if (hasMoved) {
        localStorage.setItem(
          STORAGE_KEY_BTN_POS,
          JSON.stringify({
            top: btn.css("top"),
            left: btn.css("left"),
          }),
        );
      } else {
        // 没有移动，触发点击
        e.preventDefault();
        showMainPopup();
      }
      // 重置状态
      setTimeout(() => {
        hasMoved = false;
      }, 100);
    });

    btn.on("click", (e) => {
      // 阻止默认的click事件，因为我们在touchend/mouseup中处理
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
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

  // ==================== 排序状态管理 ====================
  let sortDirty = false; // 是否有未确认的排序操作
  let sortSnapshot = null; // 排序前的快照 { folderId: sortOrder, ... }
  let rightCharSortMode = null; // 右栏角色排序模式: null | 'az' | 'za'

  function showMainPopup() {
    if ($("#cfm-overlay").length > 0) return;
    // 每次打开主弹窗时检测新标签
    detectAndImportNewTags();
    config = loadConfig(); // 刷新配置
    selectedTreeNode = null;
    expandedNodes.clear();

    const overlay = $('<div id="cfm-overlay"></div>');
    const popup = $(`
            <div id="cfm-popup">
                <div class="cfm-header">
                    <h3>📁 角色卡文件夹</h3>
                    <div class="cfm-header-actions">
                        <button id="cfm-btn-copymode" class="cfm-copymode-btn ${cfmCopyMode ? "cfm-copymode-active" : ""}" title="${cfmCopyMode ? "当前：复制模式（拖拽角色会保留原位置）" : "当前：移动模式（拖拽角色会从原位置移除）"}"><i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}</button>
                        <button id="cfm-btn-config" title="标签管理"><i class="fa-solid fa-gear"></i></button>
                        <button class="cfm-btn-close" id="cfm-btn-close-main">&times;</button>
                    </div>
                </div>
                <div class="cfm-dual-pane">
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
                        </div>
                        <div class="cfm-right-list" id="cfm-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    overlay.append(popup);
    $("body").append(overlay);

    overlay.on("click", (e) => {
      if (e.target === overlay[0]) closeMainPopup();
    });
    popup.find("#cfm-btn-close-main").on("click touchend", (e) => {
      e.preventDefault();
      closeMainPopup();
    });
    popup.find("#cfm-btn-config").on("click touchend", (e) => {
      e.preventDefault();
      showConfigPopup();
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
    });

    // 重置排序状态
    sortDirty = false;
    sortSnapshot = null;
    rightCharSortMode = null;

    renderLeftTree();
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

  // 获取文件夹的短名称（只显示最后一段，如 "1-1.1" → "1.1"）
  function getShortTagName(tagId) {
    const fullName = getTagName(tagId);
    const lastDash = fullName.lastIndexOf("-");
    if (lastDash >= 0 && config.folders[tagId]?.parentId) {
      return fullName.substring(lastDash + 1);
    }
    return fullName;
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
      let data;
      try {
        data = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }
      if (data.type === "char" && data.avatar) {
        removeCharFromAllFolders(data.avatar);
        toastr.success(`已将「${data.name || data.avatar}」移出所有文件夹`);
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
                <span class="cfm-tnode-label">${escapeHtml(getShortTagName(folderId))}${isNew ? ' <span class="cfm-new-badge">新</span>' : ""}</span>
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
      // 自动展开
      if (hasChildren && !expandedNodes.has(folderId))
        expandedNodes.add(folderId);
      refreshSelection();
      renderRightPane();
    });

    // 左侧树拖拽：拖动文件夹
    node.on("dragstart", (e) => {
      e.originalEvent.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ type: "folder", id: folderId }),
      );
      e.originalEvent.dataTransfer.effectAllowed = "move";
      node.addClass("cfm-dragging");
    });
    node.on("dragend", () => {
      node.removeClass("cfm-dragging");
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
      let data = {};
      try {
        data = JSON.parse(
          e.originalEvent.dataTransfer.getData("text/plain") || "{}",
        );
      } catch {
        /* ignore */
      }

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
      let data;
      try {
        data = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }

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
            toastr.success(
              `「${getTagName(data.id)}」已排序到「${getTagName(folderId)}」前面`,
            );
          } else {
            // 'after': 找到当前节点的下一个兄弟节点作为 insertBefore
            const siblings = sortFolders(getChildFolders(targetParentId));
            const curIdx = siblings.indexOf(folderId);
            const nextSiblingId =
              curIdx >= 0 && curIdx < siblings.length - 1
                ? siblings[curIdx + 1]
                : null;
            reorderFolder(data.id, targetParentId, nextSiblingId);
            toastr.success(
              `「${getTagName(data.id)}」已排序到「${getTagName(folderId)}」后面`,
            );
          }
        }
        renderLeftTree();
        renderRightPane();
      } else if (data.type === "char" && data.avatar) {
        // 将角色拖入文件夹（无论哪个区域都是加入该文件夹）
        handleCharDropToFolder(data.avatar, folderId, data.name || data.avatar);
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
      return;
    }

    // 正常文件夹
    const folderId = selectedTreeNode;
    const path = getFolderPath(folderId)
      .map((id) => getShortTagName(id))
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
                    <div class="cfm-row-name">${escapeHtml(getShortTagName(childId))}</div>
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
        e.originalEvent.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ type: "folder", id: childId }),
        );
        e.originalEvent.dataTransfer.effectAllowed = "move";
        row.addClass("cfm-dragging");
      });
      row.on("dragend", () => {
        row.removeClass("cfm-dragging");
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

        let data = {};
        try {
          data = JSON.parse(
            e.originalEvent.dataTransfer.getData("text/plain") || "{}",
          );
        } catch {
          /* ignore */
        }

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
        let data;
        try {
          data = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
        } catch {
          return;
        }

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
              toastr.success(
                `「${getTagName(data.id)}」已排序到「${getTagName(childId)}」前面`,
              );
            } else {
              const siblings = sortFolders(getChildFolders(targetParentId));
              const curIdx = siblings.indexOf(childId);
              const nextSiblingId =
                curIdx >= 0 && curIdx < siblings.length - 1
                  ? siblings[curIdx + 1]
                  : null;
              reorderFolder(data.id, targetParentId, nextSiblingId);
              toastr.success(
                `「${getTagName(data.id)}」已排序到「${getTagName(childId)}」后面`,
              );
            }
          }
          renderLeftTree();
          renderRightPane();
        } else if (data.type === "char" && data.avatar) {
          handleCharDropToFolder(
            data.avatar,
            childId,
            data.name || data.avatar,
          );
          renderLeftTree();
          renderRightPane();
        }
      });

      list.append(row);
    }

    // 角色卡行
    for (const char of chars) appendCharRow(list, char);

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
      let data;
      try {
        data = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }

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
        handleCharDropToFolder(data.avatar, folderId, data.name || data.avatar);
        renderLeftTree();
        renderRightPane();
      }
    });
  }

  function appendCharRow(container, char, showFolderPath) {
    const thumbUrl = getThumbnailUrl("avatar", char.avatar);
    const fav = isFavorite(char.avatar);
    const folderPathHtml = showFolderPath
      ? (() => {
          const p = findCharFolderPath(char.avatar);
          return p
            ? `<div class="cfm-row-folder-path">${escapeHtml(p)}</div>`
            : "";
        })()
      : "";
    const row = $(`
            <div class="cfm-row cfm-row-char" data-avatar="${escapeHtml(char.avatar)}" draggable="true">
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
    // 点击打开角色聊天
    row.on("click", (e) => {
      e.preventDefault();
      closeMainPopup();
      const characters = getCharacters();
      const idx = characters.findIndex((c) => c.avatar === char.avatar);
      if (idx >= 0) {
        const selectCharacterById = getContext().selectCharacterById;
        if (selectCharacterById) selectCharacterById(idx);
      }
    });
    // 角色卡可拖拽
    row.on("dragstart", (e) => {
      e.originalEvent.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          type: "char",
          avatar: char.avatar,
          name: char.name,
        }),
      );
      e.originalEvent.dataTransfer.effectAllowed = "move";
      row.addClass("cfm-dragging");
    });
    row.on("dragend", () => {
      row.removeClass("cfm-dragging");
    });
    container.append(row);
  }

  // ==================== 标签管理配置弹窗 ====================
  let draggedFolderId = null;
  let configSelectedFolderId = null;
  let cfmDeleteMode = false;
  let cfmDeleteSelected = new Set();
  let cfmDeleteCascade = false; // 级联删除模式
  let cfmDeleteLastClickedId = null; // 用于框选的上次点击ID
  let cfmDeleteRangeMode = false; // 框选模式（移动端友好）
  let cfmInvertScope = "all"; // 反选范围：'all' 全部 | 'parent' 当前父级下

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
    overlay.on("click", (e) => {
      if (e.target === overlay[0]) closeConfigPopup();
    });
    popup.find("#cfm-btn-close-config").on("click touchend", (e) => {
      e.preventDefault();
      closeConfigPopup();
    });
    renderConfigBody();
  }

  function closeConfigPopup() {
    $("#cfm-config-overlay").remove();
    if ($("#cfm-overlay").length > 0) {
      renderLeftTree();
      renderRightPane();
    }
  }

  function renderConfigBody() {
    const body = $("#cfm-config-body");
    body.empty();

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

    // 2. 当前文件夹树形展示（支持拖拽 + 点击选中）
    const treeSection = $(`
            <div class="cfm-config-section">
                <label>当前文件夹结构 <span class="cfm-drag-hint">拖拽调整层级 · 点击选中为目标父级</span></label>
                <div class="cfm-tree" id="cfm-folder-tree"></div>
            </div>
        `);
    body.append(treeSection);
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

    // 删除模式下显示操作栏
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
        if (cfmDeleteRangeMode) cfmDeleteLastClickedId = null; // 重置起点
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
      treeContainer.append(deleteBar);
    }

    // 根目录拖放区域
    const rootDropzone = $(
      '<div class="cfm-root-dropzone"><i class="fa-solid fa-arrow-up"></i> 拖拽到此处设为顶级文件夹</div>',
    );
    treeContainer.after(rootDropzone);
    rootDropzone.on("dragover", (e) => {
      e.preventDefault();
      if (draggedFolderId && config.folders[draggedFolderId]?.parentId)
        rootDropzone.addClass("cfm-drag-over");
    });
    rootDropzone.on("dragleave", () =>
      rootDropzone.removeClass("cfm-drag-over"),
    );
    rootDropzone.on("drop", (e) => {
      e.preventDefault();
      rootDropzone.removeClass("cfm-drag-over");
      if (!draggedFolderId || !config.folders[draggedFolderId]?.parentId)
        return;
      config.folders[draggedFolderId].parentId = null;
      saveConfig(config);
      toastr.success(`「${getTagName(draggedFolderId)}」已设为顶级文件夹`);
      draggedFolderId = null;
      renderConfigBody();
    });
  }

  function renderConfigTreeItem(container, folderId, depth) {
    const indent = depth * 24;
    const name = getShortTagName(folderId);
    const isSelected = configSelectedFolderId === folderId;
    const isDelChecked = cfmDeleteSelected.has(folderId);

    let checkboxHtml = "";
    if (cfmDeleteMode) {
      checkboxHtml = `<span class="cfm-del-checkbox ${isDelChecked ? "cfm-del-checked" : ""}" data-del-id="${folderId}"><i class="fa-${isDelChecked ? "solid" : "regular"} fa-square${isDelChecked ? "-check" : ""}"></i></span>`;
    }

    const isNewTag = isNewlyImported(folderId);
    const item = $(`
            <div class="cfm-tree-item ${isSelected ? "cfm-tree-selected" : ""} ${isNewTag ? "cfm-tree-new" : ""}" draggable="${cfmDeleteMode ? "false" : "true"}" data-folder-id="${folderId}" style="padding-left:${10 + indent}px;">
                ${checkboxHtml}
                <span class="cfm-tree-icon"><i class="fa-solid fa-grip-vertical" style="margin-right:4px;opacity:0.4;font-size:11px;"></i><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
                <span class="cfm-tree-name">${escapeHtml(name)}${isNewTag ? ' <span class="cfm-new-badge">新</span>' : ""}</span>
                ${cfmDeleteMode ? "" : '<span class="cfm-tree-actions"><button class="cfm-btn-danger cfm-remove-folder" data-id="' + folderId + '" title="移除此文件夹"><i class="fa-solid fa-trash-can"></i></button></span>'}
            </div>
        `);

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
        if ($(e.target).closest(".cfm-del-checkbox").length) return;
        handleDeleteClick(e);
      });
      container.append(item);
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children)
        renderConfigTreeItem(container, childId, depth + 1);
      return;
    }
    // 点击选中/取消选中
    item.on("click", (e) => {
      if ($(e.target).closest(".cfm-remove-folder").length) return;
      if (draggedFolderId) return;
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
        for (const childId of getChildFolders(folderId)) {
          config.folders[childId].parentId = parentId;
        }
        if (alsoDeleteTags) deleteTagFromSystem(folderId);
        delete config.folders[folderId];
        saveConfig(config);
        if (alsoDeleteTags) getContext().saveSettingsDebounced();
        if (configSelectedFolderId === folderId) configSelectedFolderId = null;
        const suffix = alsoDeleteTags ? "（标签已同步删除）" : "";
        toastr.info(`已移除文件夹「${name}」${suffix}`);
        renderConfigBody();
      });
    });
    // 拖拽
    item.on("dragstart", (e) => {
      draggedFolderId = folderId;
      item.addClass("cfm-dragging");
      e.originalEvent.dataTransfer.effectAllowed = "move";
      e.originalEvent.dataTransfer.setData("text/plain", folderId);
    });
    item.on("dragend", () => {
      draggedFolderId = null;
      item.removeClass("cfm-dragging");
      $(".cfm-tree-item").removeClass("cfm-drag-over cfm-drag-forbidden");
      $(".cfm-root-dropzone").removeClass("cfm-drag-over");
    });
    item.on("dragover", (e) => {
      e.preventDefault();
      if (!draggedFolderId || draggedFolderId === folderId) return;
      if (wouldCreateCycle(draggedFolderId, folderId)) {
        item.removeClass("cfm-drag-over").addClass("cfm-drag-forbidden");
        return;
      }
      item.removeClass("cfm-drag-forbidden").addClass("cfm-drag-over");
    });
    item.on("dragleave", () =>
      item.removeClass("cfm-drag-over cfm-drag-forbidden"),
    );
    item.on("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.removeClass("cfm-drag-over cfm-drag-forbidden");
      if (!draggedFolderId || draggedFolderId === folderId) return;
      if (wouldCreateCycle(draggedFolderId, folderId)) {
        toastr.error("此操作会产生循环嵌套，已阻止");
        return;
      }
      config.folders[draggedFolderId].parentId = folderId;
      saveConfig(config);
      toastr.success(`「${getTagName(draggedFolderId)}」已移入「${name}」`);
      draggedFolderId = null;
      renderConfigBody();
    });
    container.append(item);
    const children = sortFolders(getChildFolders(folderId));
    for (const childId of children)
      renderConfigTreeItem(container, childId, depth + 1);
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
    overlay.on("click", (e) => {
      if (e.target === overlay[0]) overlay.remove();
    });
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

      for (const folderId of sortedToDelete) {
        if (!config.folders[folderId]) continue;
        const parentId = config.folders[folderId].parentId || null;
        // 将子文件夹提升到被删除文件夹的父级
        for (const childId of getChildFolders(folderId)) {
          // 只提升未被同时选中删除的子文件夹
          if (!toDelete.has(childId)) {
            config.folders[childId].parentId = parentId;
          }
        }
        deletedNames.push(getTagName(folderId));
        // 如果同时删除标签
        if (alsoDeleteTags) {
          deleteTagFromSystem(folderId);
        }
        delete config.folders[folderId];
        if (configSelectedFolderId === folderId) configSelectedFolderId = null;
      }
      saveConfig(config);
      if (alsoDeleteTags) getContext().saveSettingsDebounced();
      cfmDeleteSelected.clear();
      cfmDeleteCascade = false;
      cfmDeleteLastClickedId = null;
      cfmDeleteRangeMode = false;
      cfmDeleteMode = false;
      const suffix = alsoDeleteTags ? "（标签已同步删除）" : "";
      toastr.success(
        `已删除 ${deletedNames.length} 个文件夹${suffix}: ${deletedNames.join(", ")}`,
      );
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
    const context = getContext();
    const tags = context.tags;
    const uuidv4 = context.uuidv4;
    const created = [];
    for (const name of names) {
      let tag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (!tag) {
        tag = {
          id: uuidv4(),
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
      }
      if (!config.folders[tag.id]) {
        config.folders[tag.id] = { parentId: parentFolderId || null };
      }
      created.push(tag.name);
    }
    saveConfig(config);
    context.saveSettingsDebounced();
    const parentHint = parentFolderId
      ? `「${getTagName(parentFolderId)}」下`
      : "顶级";
    toastr.success(
      `已创建 ${created.length} 个${parentHint}文件夹: ${created.join(", ")}`,
    );
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
                    <pre style="background:#1a1a2e;color:#aaa;padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;">作者A\n  -奇幻\n    -长篇\n    -短篇\n  -科幻\n作者B\n  -日常</pre>
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
    overlay.on("click", (e) => {
      if (e.target === overlay[0]) overlay.remove();
    });
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
    const context = getContext();
    const tags = context.tags;
    const uuidv4 = context.uuidv4;
    let count = 0;
    function processNode(node, parentTagId) {
      let tag = tags.find(
        (t) => t.name.toLowerCase() === node.name.toLowerCase(),
      );
      if (!tag) {
        tag = {
          id: uuidv4(),
          name: node.name,
          folder_type: "NONE",
          filter_state: "UNDEFINED",
          sort_order: Math.max(0, ...tags.map((t) => t.sort_order || 0)) + 1,
          is_hidden_on_character_card: false,
          color: "",
          color2: "",
          create_date: Date.now(),
        };
        tags.push(tag);
      }
      if (!config.folders[tag.id]) {
        config.folders[tag.id] = { parentId: parentTagId };
        count++;
      }
      for (const child of node.children) processNode(child, tag.id);
    }
    for (const node of nodes) processNode(node, parentId);
    saveConfig(config);
    context.saveSettingsDebounced();
    toastr.success(`批量创建完成，共新增 ${count} 个文件夹`);
  }

  // ==================== 初始化 ====================
  autoImportAllTags(); // 首次加载自动导入所有标签
  config = loadConfig(); // 刷新配置（autoImport可能改了settings）
  autoCleanRedundantTags(); // 自动清理多余的路径标签
  initButton();
  console.log(`[${extensionName}] 角色卡文件夹分类插件已加载`);
});
