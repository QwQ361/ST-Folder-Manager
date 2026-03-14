// 酒馆资源管理器 - Edge收藏夹风格双栏布局
jQuery(async () => {
  const extensionName = "ST-Char-Folder-Manager";
  const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
  const STORAGE_KEY_BTN_POS = "cfm-button-pos";
  const STORAGE_KEY = "cfm-folder-config"; // legacy

  // ==================== 资源类型管理 ====================
  let currentResourceType = "chars"; // 'chars' | 'presets' | 'worldinfo' | 'themes' | 'backgrounds'

  // 预设/世界书的简单分组存储
  // 结构: { [itemName]: folderName | null }
  function ensureResourceSettings() {
    if (!extension_settings[extensionName].presetGroups)
      extension_settings[extensionName].presetGroups = {};
    if (!extension_settings[extensionName].worldInfoGroups)
      extension_settings[extensionName].worldInfoGroups = {};
    if (!extension_settings[extensionName].themeGroups)
      extension_settings[extensionName].themeGroups = {};
    if (!extension_settings[extensionName].bgGroups)
      extension_settings[extensionName].bgGroups = {};
    if (!extension_settings[extensionName].themeNotes)
      extension_settings[extensionName].themeNotes = {};
    if (!extension_settings[extensionName].presetNotes)
      extension_settings[extensionName].presetNotes = {};
    if (!extension_settings[extensionName].worldInfoNotes)
      extension_settings[extensionName].worldInfoNotes = {};
    if (!extension_settings[extensionName].bgNotes)
      extension_settings[extensionName].bgNotes = {};
    // 迁移旧的 flat resourceFolders 到 tree 结构
    if (!extension_settings[extensionName].resourceFolderTree) {
      extension_settings[extensionName].resourceFolderTree = {
        presets: {},
        worldinfo: {},
        themes: {},
        backgrounds: {},
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
    if (!extension_settings[extensionName].resourceFolderTree.themes)
      extension_settings[extensionName].resourceFolderTree.themes = {};
    if (!extension_settings[extensionName].resourceFolderTree.backgrounds)
      extension_settings[extensionName].resourceFolderTree.backgrounds = {};
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
      : type === "themes"
        ? extension_settings[extensionName].themeGroups
        : type === "backgrounds"
          ? extension_settings[extensionName].bgGroups
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

  // 获取世界书列表（带缓存，优先从DOM读取避免网络延迟）
  let _worldInfoNamesCache = null;
  let _worldInfoPreloadPromise = null;
  async function getWorldInfoNames(forceRefresh) {
    if (_worldInfoNamesCache && !forceRefresh) return _worldInfoNamesCache;
    // forceRefresh 时直接走API获取最新数据（导入后DOM可能未更新）
    if (forceRefresh) {
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
      } catch (e) {
        console.error("[CFM] 强制刷新世界书列表失败", e);
      }
    }
    // 非强制刷新时优先从DOM读取（同步，无延迟）
    const names = [];
    $("#world_editor_select option").each(function () {
      const v = $(this).val();
      const t = $(this).text();
      if (v !== "" && t !== "--- 选择以编辑 ---") names.push(t);
    });
    if (names.length > 0) {
      _worldInfoNamesCache = names;
      return names;
    }
    // DOM为空时回退到API请求
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
    _worldInfoNamesCache = [];
    return [];
  }

  // 获取主题列表（从SillyTavern全局themes数组或DOM #themes下拉框）
  function getThemeNames() {
    // 优先从全局 themes 数组获取
    if (typeof themes !== "undefined" && Array.isArray(themes)) {
      return themes
        .map((t) => (typeof t === "object" ? t.name : t))
        .filter(Boolean);
    }
    // 降级：从DOM #themes 下拉框获取
    const names = [];
    $("#themes option").each(function () {
      const v = $(this).val();
      if (v !== "" && v !== undefined) names.push(String(v));
    });
    return names;
  }

  // 应用主题（通过设置 #themes 下拉框值并触发 change 事件）
  function applyTheme(themeName) {
    const themesSelect = document.getElementById("themes");
    if (!themesSelect) {
      toastr.error("找不到主题下拉框");
      return;
    }
    const option = themesSelect.querySelector(
      `option[value="${CSS.escape(themeName)}"]`,
    );
    if (!option) {
      toastr.error(`主题「${themeName}」不存在`);
      return;
    }
    themesSelect.value = themeName;
    themesSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 获取背景列表（从DOM #bg_menu_content 中的 .bg_example 元素）
  function getBackgroundNames() {
    const names = [];
    $("#bg_menu_content .bg_example").each(function () {
      const bgfile = $(this).attr("bgfile");
      if (bgfile) names.push(bgfile);
    });
    return names;
  }

  // 获取背景的友好显示名（去掉扩展名）
  function getBackgroundDisplayName(bgfile) {
    if (!bgfile) return "";
    const name = bgfile.split("/").pop();
    const dotIdx = name.lastIndexOf(".");
    return dotIdx > 0 ? name.slice(0, dotIdx) : name;
  }

  // 应用背景（点击对应的 .bg_example 元素）
  function applyBackground(bgfile) {
    const bgEl = document.querySelector(
      `#bg_menu_content .bg_example[bgfile="${CSS.escape(bgfile)}"]`,
    );
    if (bgEl) {
      bgEl.click();
    } else {
      toastr.error(`背景「${getBackgroundDisplayName(bgfile)}」不存在`);
    }
  }

  // 获取背景缩略图URL
  function getBackgroundThumbnailUrl(bgfile) {
    if (!bgfile) return "";
    return `/backgrounds/${encodeURIComponent(bgfile)}`;
  }

  /**
   * 导入重名冲突处理弹窗
   * @param {string[]} duplicateNames - 重名的文件名列表
   * @param {number} totalCount - 总文件数
   * @param {string} resourceType - 资源类型显示名（"预设"/"世界书"）
   * @returns {Promise<string>} 用户选择: 'overwrite' | 'rename' | 'skip' | 'cancel'
   */
  function showDuplicateImportDialog(duplicateNames, totalCount, resourceType) {
    return new Promise((resolve) => {
      const isBatch = totalCount > 1;
      const dupCount = duplicateNames.length;
      const dupListHtml =
        duplicateNames.length <= 8
          ? duplicateNames
              .map(
                (n) =>
                  `<li style="margin:2px 0;color:var(--SmartThemeQuoteColor,#f5c542);">${n}</li>`,
              )
              .join("")
          : duplicateNames
              .slice(0, 7)
              .map(
                (n) =>
                  `<li style="margin:2px 0;color:var(--SmartThemeQuoteColor,#f5c542);">${n}</li>`,
              )
              .join("") +
            `<li style="margin:2px 0;color:var(--SmartThemeBodyColor);">...等共 ${dupCount} 个</li>`;

      const dialogHtml = `
        <div class="cfm-dup-dialog" style="padding:16px 20px;max-width:420px;width:100%;box-sizing:border-box;">
          <div style="margin-bottom:10px;font-size:14px;font-weight:bold;">
            以下${resourceType}名称已存在：
          </div>
          <ul style="list-style:none;padding:0;margin:0 0 12px 8px;font-size:13px;">
            ${dupListHtml}
          </ul>
          ${isBatch ? `<div style="margin-bottom:10px;font-size:13px;color:var(--SmartThemeEmColor,#aaa);">共 ${totalCount} 个文件，其中 ${dupCount} 个名称重复</div>` : ""}
          <div style="margin-bottom:8px;font-size:13px;">请选择处理方式：</div>
          <div style="display:flex !important;flex-direction:column !important;gap:8px;width:100%;">
            ${isBatch ? `<button class="cfm-dup-btn" data-action="skip" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">跳过重复，仅导入不重复的（${totalCount - dupCount} 个）</button>` : ""}
            <button class="cfm-dup-btn" data-action="overwrite" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">覆盖已有的${resourceType}</button>
            <button class="cfm-dup-btn" data-action="rename" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">自动重命名（末尾加 -1）</button>
            <button class="cfm-dup-btn" data-action="cancel" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">取消导入</button>
          </div>
        </div>
      `;

      const overlay = $("<div>").css({
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        overflow: "auto",
      });

      const dialog = $("<div>")
        .css({
          background: "var(--SmartThemeBlurTintColor, #1a1a2e)",
          border: "1px solid var(--SmartThemeBorderColor, #444)",
          borderRadius: "8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          color: "var(--SmartThemeBodyColor, #ccc)",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "auto",
          writingMode: "horizontal-tb",
          boxSizing: "border-box",
        })
        .html(dialogHtml);

      overlay.append(dialog);
      $("body").append(overlay);

      overlay.find(".cfm-dup-btn").on("click", function () {
        const action = $(this).data("action");
        overlay.remove();
        resolve(action);
      });

      // ESC 取消
      const escHandler = (evt) => {
        if (evt.key === "Escape") {
          overlay.remove();
          document.removeEventListener("keydown", escHandler);
          resolve("cancel");
        }
      };
      document.addEventListener("keydown", escHandler);
    });
  }

  /**
   * 生成不重复的名称（末尾加 -1, -2, ...）
   * @param {string} baseName - 原始名称
   * @param {Set<string>} existingNames - 已存在的名称集合
   * @returns {string} 不重复的新名称
   */
  function getUniqueImportName(baseName, existingNames) {
    let newName = baseName + "-1";
    let counter = 1;
    while (existingNames.has(newName)) {
      counter++;
      newName = baseName + "-" + counter;
    }
    return newName;
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
    // 批量创建文件夹结构模板（按类型分开存储）
    if (
      !extension_settings[extensionName].batchTemplates ||
      Array.isArray(extension_settings[extensionName].batchTemplates)
    ) {
      // 迁移旧的数组格式到新的对象格式
      const oldArr = Array.isArray(
        extension_settings[extensionName].batchTemplates,
      )
        ? extension_settings[extensionName].batchTemplates
        : [];
      extension_settings[extensionName].batchTemplates = {
        characters: oldArr,
        presets: [],
        worldinfo: [],
      };
    }
    if (!extension_settings[extensionName].batchTemplates.characters)
      extension_settings[extensionName].batchTemplates.characters = [];
    if (!extension_settings[extensionName].batchTemplates.presets)
      extension_settings[extensionName].batchTemplates.presets = [];
    if (!extension_settings[extensionName].batchTemplates.worldinfo)
      extension_settings[extensionName].batchTemplates.worldinfo = [];
    // 导入角色卡时自动提取内嵌世界书的目标文件夹（null=不自动提取）
    if (extension_settings[extensionName].autoCharBookFolder === undefined)
      extension_settings[extensionName].autoCharBookFolder = null;
    // 自定义顶栏图标URL（空字符串=使用默认FA图标，"auto"=自动检测，其他=指定URL）
    if (extension_settings[extensionName].customTopbarIcon === undefined)
      extension_settings[extensionName].customTopbarIcon = "";
  }
  ensureSettings();

  // ==================== 批量创建模板管理 ====================
  function getBatchTemplates(type) {
    const all = extension_settings[extensionName].batchTemplates || {};
    return all[type] || [];
  }
  function saveBatchTemplate(type, name, content) {
    const templates = getBatchTemplates(type);
    templates.push({ name, content });
    extension_settings[extensionName].batchTemplates[type] = templates;
    getContext().saveSettingsDebounced();
  }
  function deleteBatchTemplate(type, index) {
    const templates = getBatchTemplates(type);
    if (index >= 0 && index < templates.length) {
      templates.splice(index, 1);
      extension_settings[extensionName].batchTemplates[type] = templates;
      getContext().saveSettingsDebounced();
    }
  }
  // 生成模板区域HTML
  function buildBatchTemplateHtml(type) {
    const templates = getBatchTemplates(type);
    let listHtml = "";
    if (templates.length > 0) {
      listHtml = templates
        .map(
          (t, i) =>
            `<div class="cfm-tpl-item" data-tpl-idx="${i}"><span class="cfm-tpl-name" title="点击加载此模板">${escapeHtml(t.name)}</span><button class="cfm-tpl-del" data-tpl-idx="${i}" title="删除模板"><i class="fa-solid fa-xmark"></i></button></div>`,
        )
        .join("");
    } else {
      listHtml = '<div class="cfm-tpl-empty">暂无保存的模板</div>';
    }
    return `
      <div class="cfm-tpl-section">
        <div class="cfm-tpl-header">
          <span class="cfm-tpl-label"><i class="fa-solid fa-bookmark"></i> 模板</span>
          <button class="cfm-btn cfm-tpl-save-btn"><i class="fa-solid fa-floppy-disk"></i> 保存当前为模板</button>
        </div>
        <div class="cfm-tpl-list">${listHtml}</div>
      </div>
    `;
  }
  // 绑定模板区域事件（type: 模板类型, popup: jQuery弹窗, textareaSelector: textarea选择器, refreshFn: 刷新模板列表的回调）
  function bindBatchTemplateEvents(type, popup, textareaSelector, refreshFn) {
    // 保存模板
    popup.find(".cfm-tpl-save-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const content = popup.find(textareaSelector).val().trim();
      if (!content) {
        toastr.warning("请先输入文件夹结构");
        return;
      }
      const name = prompt("请输入模板名称：");
      if (!name || !name.trim()) return;
      saveBatchTemplate(type, name.trim(), content);
      toastr.success(`模板「${name.trim()}」已保存`);
      refreshFn();
    });
    // 加载模板
    popup
      .find(".cfm-tpl-item .cfm-tpl-name")
      .on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt($(this).parent().attr("data-tpl-idx"));
        const templates = getBatchTemplates(type);
        if (templates[idx]) {
          popup.find(textareaSelector).val(templates[idx].content);
          toastr.info(`已加载模板「${templates[idx].name}」`);
        }
      });
    // 删除模板
    popup.find(".cfm-tpl-del").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt($(this).attr("data-tpl-idx"));
      const templates = getBatchTemplates(type);
      if (
        templates[idx] &&
        confirm(`确定删除模板「${templates[idx].name}」？`)
      ) {
        deleteBatchTemplate(type, idx);
        toastr.success("模板已删除");
        refreshFn();
      }
    });
  }

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
    $("#cfm-wand-button").remove();
  }
  function switchButtonMode(newMode) {
    destroyAllButtons();
    setButtonMode(newMode);
    if (newMode === "topbar") createTopbarButton();
    else if (newMode === "wand") createWandButton();
    else createFloatingButton();
  }
  function initButton() {
    const mode = getButtonMode();
    if (mode === "topbar") createTopbarButton();
    else if (mode === "wand") createWandButton();
    else createFloatingButton();
  }

  function createTopbarButton() {
    if ($("#cfm-topbar-button").length > 0) return;
    const btn = $(
      `<div id="cfm-topbar-button" class="drawer"><div class="drawer-toggle drawer-header"><div class="drawer-icon closedIcon fa-solid fa-folder fa-fw interactable" title="酒馆资源管理器" tabindex="0" role="button"></div></div></div>`,
    );
    const rightNav = $("#rightNavHolder");
    if (rightNav.length > 0) rightNav.before(btn);
    else $("#top-settings-holder").append(btn);
    btn.find(".drawer-icon").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMainPopup();
    });
    // 创建按钮后自动检测并应用自定义图标（延迟等待美化主题样式加载）
    setTimeout(() => {
      applyTopbarIconFromConfig();
      // 启动主题切换自动监听
      setupThemeChangeObserver();
    }, 500);
  }

  // ==================== 顶栏图标美化适配 ====================

  /**
   * 检测邻居按钮（用户设定管理）的实际图标样式
   * 通过 getComputedStyle 直接读取，不依赖 CSS 规则解析
   * @returns {string|null} CSS url() 格式的图标URL，或 null
   */
  function detectNeighborIcon() {
    const neighborIcon = document.querySelector(
      "#persona-management-button .drawer-icon",
    );
    if (!neighborIcon) return null;
    const computed = window.getComputedStyle(neighborIcon);
    const bgImage = computed.backgroundImage;
    if (bgImage && bgImage !== "none" && bgImage !== "") {
      return bgImage;
    }
    return null;
  }

  /**
   * 检测酒馆所有样式表中的顶栏图标替换规则（用于下拉选择器）
   * 搜索所有 <style> 元素中包含 .drawer-icon 且带 background-image 的规则
   * @returns {{ icons: Object<string, string>, uniqueUrls: string[] }}
   *   icons: parentId → backgroundImage 映射
   *   uniqueUrls: 去重后的图标URL列表
   */
  function detectThemeIcons() {
    const iconMap = {};
    for (const sheet of document.styleSheets) {
      try {
        // 只处理内联 <style> 元素（跳过外部 <link> 样式表以避免跨域问题）
        if (
          !sheet.ownerNode ||
          sheet.ownerNode.tagName?.toUpperCase() !== "STYLE"
        )
          continue;
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText || !rule.style) continue;
          // 放宽匹配：任何包含 #xxx 和 .drawer-icon 的选择器
          const match = rule.selectorText.match(
            /#([\w-]+)(?:\s+|.*?)(?:\.drawer-icon)/,
          );
          if (
            match &&
            rule.style.backgroundImage &&
            rule.style.backgroundImage !== "none" &&
            rule.style.backgroundImage !== ""
          ) {
            iconMap[match[1]] = rule.style.backgroundImage;
          }
        }
      } catch (e) {
        // 跨域样式表，跳过
      }
    }
    // 也通过 computed style 检测所有已知的顶栏按钮
    const knownButtons = [
      "user-settings-button",
      "persona-management-button",
      "ai-config-button",
      "character-management-button",
      "world-info-button",
    ];
    for (const btnId of knownButtons) {
      if (iconMap[btnId]) continue; // CSS 规则已检测到
      const iconEl = document.querySelector(`#${btnId} .drawer-icon`);
      if (!iconEl) continue;
      const computed = window.getComputedStyle(iconEl);
      const bgImage = computed.backgroundImage;
      if (bgImage && bgImage !== "none" && bgImage !== "") {
        iconMap[btnId] = bgImage;
      }
    }
    const uniqueUrls = [...new Set(Object.values(iconMap))];
    return { icons: iconMap, uniqueUrls };
  }

  /**
   * 从 CSS url() 值中提取纯URL
   * @param {string} cssUrl - 如 'url("https://example.com/icon.png")'
   * @returns {string} 纯URL
   */
  function extractUrlFromCss(cssUrl) {
    return cssUrl.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
  }

  /**
   * 将纯URL转为CSS url()格式
   * @param {string} url
   * @returns {string}
   */
  function toCssUrl(url) {
    return `url("${url}")`;
  }

  /**
   * 应用自定义图标到顶栏按钮
   * @param {string} cssUrl - CSS url() 格式的图标链接
   */
  function applyCustomIcon(cssUrl) {
    const icon = $("#cfm-topbar-button .drawer-icon");
    if (icon.length === 0) return;
    icon.addClass("cfm-custom-icon");
    icon.css("background-image", cssUrl);
  }

  /**
   * 清除自定义图标，恢复默认FA图标
   */
  function clearCustomIcon() {
    const icon = $("#cfm-topbar-button .drawer-icon");
    if (icon.length === 0) return;
    icon.removeClass("cfm-custom-icon");
    icon.css("background-image", "");
  }

  /**
   * 根据配置自动应用顶栏图标
   * 优先使用邻居按钮的 computed style，更可靠
   * 如果用户手动指定了URL则使用手动指定的
   */
  function applyTopbarIconFromConfig() {
    const saved = extension_settings[extensionName].customTopbarIcon || "";
    if (saved) {
      // 用户手动指定了URL
      applyCustomIcon(toCssUrl(saved));
      return;
    }
    // 自动检测：直接读取邻居按钮的实际样式
    const neighborBg = detectNeighborIcon();
    if (neighborBg) {
      applyCustomIcon(neighborBg);
      return;
    }
    // 没有美化主题或没有图标替换，保持默认FA图标
    clearCustomIcon();
  }

  // ==================== 主题切换自动监听 ====================

  /** 记录上一次邻居按钮的 background-image，用于检测变化 */
  let _lastNeighborBg = null;
  /** 主题变化轮询定时器 */
  let _themeCheckTimer = null;

  /**
   * 启动主题切换监听
   * 同时使用 MutationObserver 和轮询两种策略确保可靠检测
   */
  function setupThemeChangeObserver() {
    // --- 策略1: MutationObserver 监听 <head> 中 style 元素的增删和内容变化 ---
    const headObserver = new MutationObserver((mutations) => {
      let styleChanged = false;
      for (const mutation of mutations) {
        // 检查是否有 style 节点被添加/删除
        if (mutation.type === "childList") {
          for (const node of [
            ...mutation.addedNodes,
            ...mutation.removedNodes,
          ]) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node.tagName === "STYLE" || node.tagName === "LINK")
            ) {
              styleChanged = true;
              break;
            }
          }
        }
        // 检查 style 元素内容变化
        if (
          mutation.type === "characterData" &&
          mutation.target.parentNode?.tagName === "STYLE"
        ) {
          styleChanged = true;
        }
      }
      if (styleChanged) {
        // 延迟执行，等浏览器完成样式计算
        setTimeout(() => onThemeStyleChange(), 300);
      }
    });
    headObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // --- 策略2: 监听 custom-style 元素的内容变化 ---
    const customStyle = document.getElementById("custom-style");
    if (customStyle) {
      const customObserver = new MutationObserver(() => {
        setTimeout(() => onThemeStyleChange(), 300);
      });
      customObserver.observe(customStyle, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    // --- 策略3: 轮询检测邻居按钮样式变化（兜底） ---
    _lastNeighborBg = detectNeighborIcon();
    _themeCheckTimer = setInterval(() => {
      const currentBg = detectNeighborIcon();
      if (currentBg !== _lastNeighborBg) {
        _lastNeighborBg = currentBg;
        onThemeStyleChange();
      }
    }, 2000);
  }

  /**
   * 主题样式发生变化时的回调
   * 如果用户没有手动指定图标（customTopbarIcon 为空），则自动重新检测并应用
   */
  function onThemeStyleChange() {
    const saved = extension_settings[extensionName].customTopbarIcon || "";
    if (saved) {
      // 用户手动指定了URL，不自动覆盖
      return;
    }
    // 自动模式：重新检测邻居图标
    const neighborBg = detectNeighborIcon();
    _lastNeighborBg = neighborBg;
    if (neighborBg) {
      applyCustomIcon(neighborBg);
    } else {
      clearCustomIcon();
    }
  }

  function createFloatingButton() {
    if ($("#cfm-folder-button").length > 0) return;
    const btn = $(
      `<div id="cfm-folder-button" title="酒馆资源管理器"><i class="fa-solid fa-folder"></i></div>`,
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

  function createWandButton() {
    if ($("#cfm-wand-button").length > 0) return;
    const extensionsMenu = $("#extensionsMenu");
    if (extensionsMenu.length === 0) {
      // 如果魔术棒菜单还没加载，延迟重试
      setTimeout(() => createWandButton(), 500);
      return;
    }
    const buttonHtml = $(`
      <div id="cfm-wand-button" class="list-group-item flex-container flexGap5 interactable" title="酒馆资源管理器">
        <div class="fa-solid fa-folder extensionsMenuExtensionButton"></div>
        <span>资源管理器</span>
      </div>
    `);
    extensionsMenu.append(buttonHtml);
    buttonHtml.on("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 关闭魔术棒下拉菜单
      $("#extensionsMenu").hide();
      showMainPopup();
    });
  }

  // ==================== 主弹窗：双栏布局 ====================
  let selectedTreeNode = null; // 当前左侧选中的文件夹ID或'__uncategorized__'
  let expandedNodes = new Set(); // 左侧树展开状态
  let configExpandedNodes = new Set(); // 配置弹窗树展开状态

  // 预设/世界书/主题/背景双栏状态
  let selectedPresetFolder = null;
  let selectedWorldInfoFolder = null;
  let selectedThemeFolder = null;
  let selectedBgFolder = null;
  let presetExpandedNodes = new Set();
  let worldInfoExpandedNodes = new Set();
  let themeExpandedNodes = new Set();
  let bgExpandedNodes = new Set();
  let presetConfigExpandedNodes = new Set();
  let worldInfoConfigExpandedNodes = new Set();
  let themeConfigExpandedNodes = new Set();
  let bgConfigExpandedNodes = new Set();

  // 预设/世界书/主题/背景的收藏管理
  function ensureResFavorites() {
    if (!extension_settings[extensionName].presetFavorites)
      extension_settings[extensionName].presetFavorites = [];
    if (!extension_settings[extensionName].worldInfoFavorites)
      extension_settings[extensionName].worldInfoFavorites = [];
    if (!extension_settings[extensionName].themeFavorites)
      extension_settings[extensionName].themeFavorites = [];
    if (!extension_settings[extensionName].bgFavorites)
      extension_settings[extensionName].bgFavorites = [];
  }
  function getResFavorites(type) {
    ensureResFavorites();
    return type === "presets"
      ? extension_settings[extensionName].presetFavorites
      : type === "themes"
        ? extension_settings[extensionName].themeFavorites
        : type === "backgrounds"
          ? extension_settings[extensionName].bgFavorites
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

  // 预设/世界书/主题/背景排序状态
  let presetLeftSortMode = null;
  let presetRightSortMode = null; // 右栏项目排序: null | 'az' | 'za'
  let worldInfoLeftSortMode = null;
  let worldInfoRightSortMode = null;
  let themeLeftSortMode = null;
  let themeRightSortMode = null;
  let bgLeftSortMode = null;
  let bgRightSortMode = null;
  let presetSortSnapshot = null;
  let worldInfoSortSnapshot = null;
  let themeSortSnapshot = null;
  let bgSortSnapshot = null;
  let presetSortDirty = false;
  let worldInfoSortDirty = false;
  let themeSortDirty = false;
  let bgSortDirty = false;

  // 资源排序辅助
  function takeResSortSnapshot(type) {
    if (type === "presets" && presetSortSnapshot) return;
    if (type === "worldinfo" && worldInfoSortSnapshot) return;
    if (type === "themes" && themeSortSnapshot) return;
    if (type === "backgrounds" && bgSortSnapshot) return;
    const tree = getResFolderTree(type);
    const snap = {};
    for (const id of Object.keys(tree)) {
      snap[id] = tree[id]?.sortOrder ?? 0;
    }
    if (type === "presets") presetSortSnapshot = snap;
    else if (type === "themes") themeSortSnapshot = snap;
    else if (type === "backgrounds") bgSortSnapshot = snap;
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
    else if (type === "themes") themeSortDirty = true;
    else worldInfoSortDirty = true;
  }
  function revertResSort(type) {
    const snap =
      type === "presets"
        ? presetSortSnapshot
        : type === "themes"
          ? themeSortSnapshot
          : worldInfoSortSnapshot;
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
    } else if (type === "themes") {
      themeSortSnapshot = null;
      themeSortDirty = false;
      themeRightSortMode = null;
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
          : currentResourceType === "themes"
            ? "#cfm-theme-right-list"
            : currentResourceType === "backgrounds"
              ? "#cfm-bg-right-list"
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

  // ==================== 导出模式状态 ====================
  let cfmExportRangeMode = false;
  let cfmExportLastClicked = null;
  let cfmExportMode = false;
  let cfmExportSelected = new Set(); // 导出模式下选中的资源标识符

  // 统一清理所有互斥模式的状态和 DOM（不触发渲染）
  function clearAllExclusiveModes() {
    // 多选模式
    if (cfmMultiSelectMode) {
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    }
    // 导出模式
    if (cfmExportMode) {
      cfmExportMode = false;
      cfmExportSelected.clear();
      cfmExportRangeMode = false;
      cfmExportLastClicked = null;
      $(".cfm-export-btn").removeClass("cfm-export-active");
      $(".cfm-export-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-file-export");
      $(".cfm-export-btn").attr("title", function () {
        if ($(this).attr("id") === "cfm-export-char-btn") return "导出角色卡";
        if ($(this).attr("id") === "cfm-export-preset-btn") return "导出预设";
        if ($(this).attr("id") === "cfm-export-theme-btn") return "导出主题";
        if ($(this).attr("id") === "cfm-export-bg-btn") return "导出背景";
        return "导出世界书";
      });
      $(".cfm-popup").removeClass("cfm-export-mode");
    }
    // 删除模式
    if (cfmResDeleteMode) {
      cfmResDeleteMode = false;
      cfmResDeleteSelected.clear();
      cfmResDeleteRangeMode = false;
      cfmResDeleteLastClicked = null;
      $(".cfm-res-delete-btn").removeClass("cfm-res-delete-active");
      $(".cfm-res-delete-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-trash-can");
      $(".cfm-res-delete-btn").attr("title", function () {
        if ($(this).attr("id") === "cfm-res-delete-char-btn")
          return "删除角色卡";
        if ($(this).attr("id") === "cfm-res-delete-preset-btn")
          return "删除预设";
        if ($(this).attr("id") === "cfm-res-delete-theme-btn")
          return "删除主题";
        if ($(this).attr("id") === "cfm-res-delete-bg-btn") return "删除背景";
        return "删除世界书";
      });
      $(".cfm-popup").removeClass("cfm-res-delete-mode");
    }
    // 编辑模式
    if (cfmEditMode) exitEditMode();
    // 重命名模式
    if (cfmPresetRenameMode) exitPresetRenameMode();
    if (cfmWorldInfoRenameMode) exitWorldInfoRenameMode();
    // 主题备注模式
    if (cfmThemeNoteMode) {
      cfmThemeNoteMode = false;
      cfmThemeNoteSelected.clear();
      cfmThemeNoteRangeMode = false;
      cfmThemeNoteLastClicked = null;
      $("#cfm-theme-note-btn").removeClass("cfm-edit-active");
      $("#cfm-theme-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-theme-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-theme-note-mode");
    }
    // 背景备注模式
    if (cfmBgNoteMode) {
      cfmBgNoteMode = false;
      cfmBgNoteSelected.clear();
      cfmBgNoteRangeMode = false;
      cfmBgNoteLastClicked = null;
      $("#cfm-bg-note-btn").removeClass("cfm-edit-active");
      $("#cfm-bg-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-bg-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-bg-note-mode");
    }
    // 主题重命名模式
    if (cfmThemeRenameMode) {
      cfmThemeRenameMode = false;
      cfmThemeRenameSelected.clear();
      cfmThemeRenameRangeMode = false;
      cfmThemeRenameLastClicked = null;
      $("#cfm-theme-rename-btn").removeClass("cfm-edit-active");
      $("#cfm-theme-rename-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-i-cursor");
      $("#cfm-theme-rename-btn").attr("title", "重命名主题");
      $(".cfm-popup").removeClass("cfm-theme-rename-mode");
    }
    // 背景重命名模式
    if (cfmBgRenameMode) {
      cfmBgRenameMode = false;
      cfmBgRenameSelected.clear();
      cfmBgRenameRangeMode = false;
      cfmBgRenameLastClicked = null;
      $("#cfm-bg-rename-btn").removeClass("cfm-edit-active");
      $("#cfm-bg-rename-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-i-cursor");
      $("#cfm-bg-rename-btn").attr("title", "重命名背景");
      $(".cfm-popup").removeClass("cfm-bg-rename-mode");
    }
  }

  function enterExportMode() {
    clearAllExclusiveModes();
    // 设置导出模式状态
    cfmExportMode = true;
    cfmExportSelected.clear();
    // 更新导出按钮外观
    $(".cfm-export-btn").addClass("cfm-export-active");
    $(".cfm-export-btn")
      .find("i")
      .removeClass("fa-file-export")
      .addClass("fa-check");
    $(".cfm-export-btn").attr("title", "确认导出");
    // 添加导出模式遮罩样式
    $(".cfm-popup").addClass("cfm-export-mode");
    // 重新渲染当前视图以显示勾选框
    rerenderCurrentView();
  }

  function exitExportMode() {
    cfmExportMode = false;
    cfmExportSelected.clear();
    cfmExportRangeMode = false;
    cfmExportLastClicked = null;
    $(".cfm-export-btn").removeClass("cfm-export-active");
    $(".cfm-export-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-file-export");
    $(".cfm-export-btn").attr("title", function () {
      if ($(this).attr("id") === "cfm-export-char-btn") return "导出角色卡";
      if ($(this).attr("id") === "cfm-export-preset-btn") return "导出预设";
      if ($(this).attr("id") === "cfm-export-theme-btn") return "导出主题";
      if ($(this).attr("id") === "cfm-export-bg-btn") return "导出背景";
      return "导出世界书";
    });
    $(".cfm-popup").removeClass("cfm-export-mode");
    rerenderCurrentView();
  }

  function toggleExportItem(id, shiftKey) {
    if ((shiftKey || cfmExportRangeMode) && cfmExportLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmExportLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmExportSelected.add(visible[i]);
      }
    } else {
      if (cfmExportSelected.has(id)) cfmExportSelected.delete(id);
      else cfmExportSelected.add(id);
    }
    cfmExportLastClicked = id;
  }

  function rerenderCurrentView() {
    if (currentResourceType === "chars") renderRightPane();
    else if (currentResourceType === "presets") renderPresetsView();
    else if (currentResourceType === "themes") renderThemesView();
    else if (currentResourceType === "backgrounds") renderBackgroundsView();
    else renderWorldInfoView();
  }

  // 生成导出工具栏并插入到列表容器
  function prependExportToolbar(listContainer, renderFn) {
    if (!cfmExportMode) return;
    // 互斥：移除可能残留的删除工具栏
    listContainer.find(".cfm-res-delete-toolbar").remove();
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmExportSelected.has(id));
    const toolbar = $(`
      <div class="cfm-export-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-export-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-export-range ${cfmExportRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmExportRangeMode ? "(开)" : ""}</button>
        <span class="cfm-export-count">${cfmExportSelected.size > 0 ? `已选 ${cfmExportSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-export-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-export-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmExportSelected.delete(id));
      } else {
        visible.forEach((id) => cfmExportSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-export-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmExportRangeMode = !cfmExportRangeMode;
      if (cfmExportRangeMode) cfmExportLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-export-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitExportMode();
    });
    listContainer.prepend(toolbar);
  }

  // 导出核心：根据资源类型导出选中的资源
  async function executeResourceExport() {
    if (cfmExportSelected.size === 0) {
      toastr.warning("请先选择要导出的资源");
      return;
    }
    const selected = Array.from(cfmExportSelected);
    const count = selected.length;
    const headers = getContext().getRequestHeaders();

    try {
      if (currentResourceType === "chars") {
        await exportCharacters(selected, headers);
      } else if (currentResourceType === "presets") {
        await exportPresets(selected, headers);
      } else if (currentResourceType === "themes") {
        await exportThemes(selected, headers);
      } else if (currentResourceType === "backgrounds") {
        await exportBackgrounds(selected, headers);
      } else {
        await exportWorldInfos(selected, headers);
      }
    } catch (err) {
      console.error("[CFM] 导出失败", err);
      toastr.error("导出失败: " + err.message);
    }
    exitExportMode();
  }

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
      toastr.success("角色卡已导出");
    } else {
      // 多个角色卡打包zip
      if (!window.JSZip) {
        await import("../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      toastr.info(`正在导出 ${avatars.length} 个角色卡...`);
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
      }
      if (success === 0) throw new Error("没有成功导出任何角色卡");
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "角色卡.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toastr.success(`已导出 ${success} 个角色卡`);
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
        const { presets, preset_names } = pm.getPresetList();
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
      toastr.success("预设已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      toastr.info(`正在导出 ${presetNames.length} 个预设...`);
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
      }
      if (success === 0) throw new Error("没有成功导出任何预设");
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "预设.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toastr.success(`已导出 ${success} 个预设`);
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
      toastr.success("世界书已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      toastr.info(`正在导出 ${wiNames.length} 个世界书...`);
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
      }
      if (success === 0) throw new Error("没有成功导出任何世界书");
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "世界书.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toastr.success(`已导出 ${success} 个世界书`);
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
      toastr.success("主题已导出");
    } else {
      if (!window.JSZip) {
        await import("../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      toastr.info(`正在导出 ${themeNameList.length} 个主题...`);
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
      }
      if (success === 0) throw new Error("没有成功导出任何主题");
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "主题.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toastr.success(`已导出 ${success} 个主题`);
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
        toastr.success("背景已导出");
      } catch (e) {
        throw new Error(`导出背景失败: ${e.message}`);
      }
    } else {
      if (!window.JSZip) {
        await import("../../../../lib/jszip.min.js");
      }
      const zip = new JSZip();
      let success = 0;
      toastr.info(`正在导出 ${bgNames.length} 个背景...`);
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
      }
      if (success === 0) throw new Error("没有成功导出任何背景");
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "背景.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toastr.success(`已导出 ${success} 个背景`);
    }
  }

  // ==================== 资源删除模式状态 ====================
  let cfmResDeleteMode = false;
  let cfmResDeleteSelected = new Set();
  let cfmResDeleteRangeMode = false;
  let cfmResDeleteLastClicked = null;

  function enterResDeleteMode() {
    clearAllExclusiveModes();
    // 设置删除模式状态
    cfmResDeleteMode = true;
    cfmResDeleteSelected.clear();
    cfmResDeleteRangeMode = false;
    cfmResDeleteLastClicked = null;
    // 更新删除按钮外观
    $(".cfm-res-delete-btn").addClass("cfm-res-delete-active");
    $(".cfm-res-delete-btn")
      .find("i")
      .removeClass("fa-trash-can")
      .addClass("fa-check");
    $(".cfm-res-delete-btn").attr("title", "确认删除");
    $(".cfm-popup").addClass("cfm-res-delete-mode");
    rerenderCurrentView();
  }

  function exitResDeleteMode() {
    cfmResDeleteMode = false;
    cfmResDeleteSelected.clear();
    cfmResDeleteRangeMode = false;
    cfmResDeleteLastClicked = null;
    $(".cfm-res-delete-btn").removeClass("cfm-res-delete-active");
    $(".cfm-res-delete-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-trash-can");
    $(".cfm-res-delete-btn").attr("title", function () {
      if ($(this).attr("id") === "cfm-res-delete-char-btn") return "删除角色卡";
      if ($(this).attr("id") === "cfm-res-delete-preset-btn") return "删除预设";
      if ($(this).attr("id") === "cfm-res-delete-theme-btn") return "删除主题";
      if ($(this).attr("id") === "cfm-res-delete-bg-btn") return "删除背景";
      return "删除世界书";
    });
    $(".cfm-popup").removeClass("cfm-res-delete-mode");
    rerenderCurrentView();
  }

  function toggleResDeleteItem(id, shiftKey) {
    if ((shiftKey || cfmResDeleteRangeMode) && cfmResDeleteLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmResDeleteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmResDeleteSelected.add(visible[i]);
      }
    } else {
      if (cfmResDeleteSelected.has(id)) cfmResDeleteSelected.delete(id);
      else cfmResDeleteSelected.add(id);
    }
    cfmResDeleteLastClicked = id;
  }

  function prependResDeleteToolbar(listContainer, renderFn) {
    if (!cfmResDeleteMode) return;
    // 互斥：移除可能残留的导出工具栏
    listContainer.find(".cfm-export-toolbar").remove();
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmResDeleteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-res-delete-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-res-delete-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-res-delete-range ${cfmResDeleteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmResDeleteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-res-delete-count">${cfmResDeleteSelected.size > 0 ? `已选 ${cfmResDeleteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-res-delete-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-res-delete-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmResDeleteSelected.delete(id));
      } else {
        visible.forEach((id) => cfmResDeleteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-res-delete-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmResDeleteRangeMode = !cfmResDeleteRangeMode;
      if (cfmResDeleteRangeMode) cfmResDeleteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-res-delete-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitResDeleteMode();
    });
    listContainer.prepend(toolbar);
  }

  // 删除核心：根据资源类型删除选中的资源
  async function executeResourceDelete() {
    if (cfmResDeleteSelected.size === 0) {
      toastr.warning("请先选择要删除的资源");
      return;
    }
    const selected = Array.from(cfmResDeleteSelected);
    const count = selected.length;
    const typeLabel =
      currentResourceType === "chars"
        ? "角色卡"
        : currentResourceType === "presets"
          ? "预设"
          : currentResourceType === "themes"
            ? "主题"
            : currentResourceType === "backgrounds"
              ? "背景"
              : "世界书";

    // 确认弹窗
    const confirmed = confirm(
      `确定要删除 ${count} 个${typeLabel}吗？\n此操作不可撤销！`,
    );
    if (!confirmed) return;

    const headers = getContext().getRequestHeaders();
    let success = 0;
    let fail = 0;

    try {
      toastr.info(`正在删除 ${count} 个${typeLabel}...`);

      if (currentResourceType === "chars") {
        for (const avatar of selected) {
          try {
            const resp = await fetch("/api/characters/delete", {
              method: "POST",
              headers: headers,
              body: JSON.stringify({ avatar_url: avatar, delete_chats: false }),
              cache: "no-cache",
            });
            if (resp.ok) {
              // 清理 tag_map（文件夹分配）
              const tagMap = getTagMap();
              if (tagMap[avatar]) delete tagMap[avatar];
              // 清理收藏
              const favSet = extension_settings[extensionName].favorites;
              if (favSet && favSet instanceof Set) favSet.delete(avatar);
              else if (Array.isArray(favSet)) {
                const idx = favSet.indexOf(avatar);
                if (idx !== -1) favSet.splice(idx, 1);
              }
              success++;
            } else {
              fail++;
            }
          } catch (e) {
            console.warn(`[CFM] 删除角色卡 ${avatar} 失败`, e);
            fail++;
          }
        }
        // 刷新角色列表
        await getContext().getCharacters();
      } else if (currentResourceType === "presets") {
        const pm = getContext().getPresetManager();
        if (!pm) throw new Error("预设管理器不可用");
        for (const name of selected) {
          try {
            const ok = await pm.deletePreset(name);
            if (ok !== false) {
              // 清理文件夹分配
              const groups = extension_settings[extensionName].presetGroups;
              if (groups && groups[name]) delete groups[name];
              success++;
            } else fail++;
          } catch (e) {
            console.warn(`[CFM] 删除预设 ${name} 失败`, e);
            fail++;
          }
        }
      } else if (currentResourceType === "themes") {
        for (const name of selected) {
          try {
            const resp = await fetch("/api/themes/delete", {
              method: "POST",
              headers: headers,
              body: JSON.stringify({ name: name }),
            });
            if (resp.ok) {
              // 清理文件夹分配
              const groups = extension_settings[extensionName].themeGroups;
              if (groups && groups[name]) delete groups[name];
              // 从酒馆原生DOM中移除对应option
              $("#themes option")
                .filter(function () {
                  return $(this).val() === name;
                })
                .remove();
              // 更新全局 themes 缓存
              if (typeof themes !== "undefined" && Array.isArray(themes)) {
                const idx = themes.findIndex(
                  (t) => (typeof t === "object" ? t.name : t) === name,
                );
                if (idx !== -1) themes.splice(idx, 1);
              }
              success++;
            } else {
              fail++;
            }
          } catch (e) {
            console.warn(`[CFM] 删除主题 ${name} 失败`, e);
            fail++;
          }
        }
      } else if (currentResourceType === "backgrounds") {
        for (const name of selected) {
          try {
            const resp = await fetch("/api/backgrounds/delete", {
              method: "POST",
              headers: headers,
              body: JSON.stringify({ bg: name }),
            });
            if (resp.ok) {
              // 清理文件夹分配
              const groups = extension_settings[extensionName].bgGroups;
              if (groups && groups[name]) delete groups[name];
              // 清理备注
              const notes = extension_settings[extensionName].bgNotes;
              if (notes && notes[name]) delete notes[name];
              // 从酒馆原生DOM中移除对应背景元素
              $("#bg_menu_content .bg_example")
                .filter(function () {
                  return $(this).attr("bgfile") === name;
                })
                .remove();
              success++;
            } else {
              fail++;
            }
          } catch (e) {
            console.warn(`[CFM] 删除背景 ${name} 失败`, e);
            fail++;
          }
        }
      } else {
        for (const name of selected) {
          try {
            const resp = await fetch("/api/worldinfo/delete", {
              method: "POST",
              headers: headers,
              body: JSON.stringify({ name: name }),
            });
            if (resp.ok) {
              // 清理文件夹分配
              const groups = extension_settings[extensionName].worldInfoGroups;
              if (groups && groups[name]) delete groups[name];
              // 从酒馆原生DOM中移除对应option（防止renderWorldInfoView从DOM读到已删除的世界书）
              $("#world_editor_select option")
                .filter(function () {
                  return $(this).text() === name;
                })
                .remove();
              success++;
            } else {
              fail++;
            }
          } catch (e) {
            console.warn(`[CFM] 删除世界书 ${name} 失败`, e);
            fail++;
          }
        }
        // 强制通过API刷新世界书缓存
        _worldInfoNamesCache = null;
        await getWorldInfoNames(true);
      }

      if (success > 0) {
        toastr.success(
          `已删除 ${success} 个${typeLabel}${fail > 0 ? `，${fail} 个失败` : ""}`,
        );
        // 保存文件夹分配变更
        getContext().saveSettingsDebounced();
      } else {
        toastr.error(`删除失败`);
      }
    } catch (err) {
      console.error("[CFM] 删除失败", err);
      toastr.error("删除失败: " + err.message);
    }
    exitResDeleteMode();
    // 重新渲染
    rerenderCurrentView();
  }

  // ==================== 主题备注编辑模式 ====================
  let cfmThemeNoteMode = false;
  let cfmThemeNoteSelected = new Set();
  let cfmThemeNoteRangeMode = false;
  let cfmThemeNoteLastClicked = null;

  function getThemeNote(name) {
    return extension_settings[extensionName].themeNotes?.[name] || "";
  }
  function setThemeNote(name, note) {
    if (!extension_settings[extensionName].themeNotes)
      extension_settings[extensionName].themeNotes = {};
    if (note) {
      extension_settings[extensionName].themeNotes[name] = note;
    } else {
      delete extension_settings[extensionName].themeNotes[name];
    }
    getContext().saveSettingsDebounced();
  }

  function enterThemeNoteMode() {
    clearAllExclusiveModes();
    cfmThemeNoteMode = true;
    cfmThemeNoteSelected.clear();
    cfmThemeNoteRangeMode = false;
    cfmThemeNoteLastClicked = null;
    $("#cfm-theme-note-btn").addClass("cfm-edit-active");
    $("#cfm-theme-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-theme-note-btn").attr("title", "确认编辑备注");
    $(".cfm-popup").addClass("cfm-theme-note-mode");
    renderThemesView();
  }

  function exitThemeNoteMode() {
    cfmThemeNoteMode = false;
    cfmThemeNoteSelected.clear();
    cfmThemeNoteRangeMode = false;
    cfmThemeNoteLastClicked = null;
    $("#cfm-theme-note-btn").removeClass("cfm-edit-active");
    $("#cfm-theme-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-theme-note-btn").attr("title", "编辑备注");
    $(".cfm-popup").removeClass("cfm-theme-note-mode");
    renderThemesView();
  }

  function toggleThemeNoteItem(id, shiftKey) {
    if ((shiftKey || cfmThemeNoteRangeMode) && cfmThemeNoteLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmThemeNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmThemeNoteSelected.add(visible[i]);
      }
    } else {
      if (cfmThemeNoteSelected.has(id)) cfmThemeNoteSelected.delete(id);
      else cfmThemeNoteSelected.add(id);
    }
    cfmThemeNoteLastClicked = id;
  }

  function prependThemeNoteToolbar(listContainer, renderFn) {
    if (!cfmThemeNoteMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmThemeNoteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmThemeNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmThemeNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmThemeNoteSelected.size > 0 ? `已选 ${cfmThemeNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmThemeNoteSelected.delete(id));
      } else {
        visible.forEach((id) => cfmThemeNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmThemeNoteRangeMode = !cfmThemeNoteRangeMode;
      if (cfmThemeNoteRangeMode) cfmThemeNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitThemeNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showThemeNotePopup(themeNames) {
    if (!themeNames || themeNames.length === 0) return;
    let defaultNote = "";
    if (themeNames.length === 1) {
      defaultNote = getThemeNote(themeNames[0]);
    }
    const nameListHtml =
      themeNames.length <= 5
        ? themeNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : themeNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${themeNames.length} 个主题</div>`;

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑主题备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-theme-note-input" value="${escapeHtml(defaultNote)}" placeholder="${themeNames.length > 1 ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${themeNames.length === 1 ? (defaultNote ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : "") : '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>'}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-theme-note-input").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        overlay.remove();
        resolve({ note: "", clear: true });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const note = overlay.find("#cfm-theme-note-input").val().trim();
        overlay.remove();
        resolve({ note, clear: false });
      });
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  async function executeThemeNoteEdit(names) {
    const result = await showThemeNotePopup(names);
    if (!result) return;
    const { note, clear } = result;
    const isBatch = names.length > 1;
    if (isBatch && !note && !clear) {
      toastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const name of names) {
      if (clear) {
        setThemeNote(name, "");
        count++;
      } else if (note) {
        setThemeNote(name, note);
        count++;
      } else if (!isBatch) {
        // 单个模式下空字符串 = 清除
        setThemeNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      toastr.success(`已更新 ${count} 个主题的备注`);
      renderThemesView();
    }
  }

  // ==================== 背景备注编辑模式 ====================
  let cfmBgNoteMode = false;
  let cfmBgNoteSelected = new Set();
  let cfmBgNoteRangeMode = false;
  let cfmBgNoteLastClicked = null;

  function getBgNote(name) {
    return extension_settings[extensionName].bgNotes?.[name] || "";
  }
  function setBgNote(name, note) {
    if (!extension_settings[extensionName].bgNotes)
      extension_settings[extensionName].bgNotes = {};
    if (note) {
      extension_settings[extensionName].bgNotes[name] = note;
    } else {
      delete extension_settings[extensionName].bgNotes[name];
    }
    getContext().saveSettingsDebounced();
  }

  function enterBgNoteMode() {
    clearAllExclusiveModes();
    cfmBgNoteMode = true;
    cfmBgNoteSelected.clear();
    cfmBgNoteRangeMode = false;
    cfmBgNoteLastClicked = null;
    $("#cfm-bg-note-btn").addClass("cfm-edit-active");
    $("#cfm-bg-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-bg-note-btn").attr("title", "确认编辑备注");
    $(".cfm-popup").addClass("cfm-bg-note-mode");
    renderBackgroundsView();
  }

  function exitBgNoteMode() {
    cfmBgNoteMode = false;
    cfmBgNoteSelected.clear();
    cfmBgNoteRangeMode = false;
    cfmBgNoteLastClicked = null;
    $("#cfm-bg-note-btn").removeClass("cfm-edit-active");
    $("#cfm-bg-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-bg-note-btn").attr("title", "编辑备注");
    $(".cfm-popup").removeClass("cfm-bg-note-mode");
    renderBackgroundsView();
  }

  function toggleBgNoteItem(id, shiftKey) {
    if ((shiftKey || cfmBgNoteRangeMode) && cfmBgNoteLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmBgNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmBgNoteSelected.add(visible[i]);
      }
    } else {
      if (cfmBgNoteSelected.has(id)) cfmBgNoteSelected.delete(id);
      else cfmBgNoteSelected.add(id);
    }
    cfmBgNoteLastClicked = id;
  }

  function prependBgNoteToolbar(listContainer, renderFn) {
    if (!cfmBgNoteMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmBgNoteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmBgNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmBgNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmBgNoteSelected.size > 0 ? `已选 ${cfmBgNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmBgNoteSelected.delete(id));
      } else {
        visible.forEach((id) => cfmBgNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmBgNoteRangeMode = !cfmBgNoteRangeMode;
      if (cfmBgNoteRangeMode) cfmBgNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitBgNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showBgNotePopup(bgNames) {
    if (!bgNames || bgNames.length === 0) return;
    let defaultNote = "";
    if (bgNames.length === 1) {
      defaultNote = getBgNote(bgNames[0]);
    }
    const nameListHtml =
      bgNames.length <= 5
        ? bgNames
            .map(
              (n) =>
                `<div class="cfm-edit-name-item">${escapeHtml(getBackgroundDisplayName(n))}</div>`,
            )
            .join("")
        : bgNames
            .slice(0, 5)
            .map(
              (n) =>
                `<div class="cfm-edit-name-item">${escapeHtml(getBackgroundDisplayName(n))}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${bgNames.length} 个背景</div>`;

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑背景备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-bg-note-input" value="${escapeHtml(defaultNote)}" placeholder="${bgNames.length > 1 ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${bgNames.length === 1 ? (defaultNote ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : "") : '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>'}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-bg-note-input").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        overlay.remove();
        resolve({ note: "", clear: true });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const note = overlay.find("#cfm-bg-note-input").val().trim();
        overlay.remove();
        resolve({ note, clear: false });
      });
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  async function executeBgNoteEdit(names) {
    const result = await showBgNotePopup(names);
    if (!result) return;
    const { note, clear } = result;
    const isBatch = names.length > 1;
    if (isBatch && !note && !clear) {
      toastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const name of names) {
      if (clear) {
        setBgNote(name, "");
        count++;
      } else if (note) {
        setBgNote(name, note);
        count++;
      } else if (!isBatch) {
        setBgNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      toastr.success(`已更新 ${count} 个背景的备注`);
      renderBackgroundsView();
    }
  }

  // ==================== 主题重命名模式 ====================
  let cfmThemeRenameMode = false;
  let cfmThemeRenameSelected = new Set();
  let cfmThemeRenameRangeMode = false;
  let cfmThemeRenameLastClicked = null;

  function enterThemeRenameMode() {
    clearAllExclusiveModes();
    cfmThemeRenameMode = true;
    cfmThemeRenameSelected.clear();
    cfmThemeRenameRangeMode = false;
    cfmThemeRenameLastClicked = null;
    $("#cfm-theme-rename-btn").addClass("cfm-edit-active");
    $("#cfm-theme-rename-btn")
      .find("i")
      .removeClass("fa-i-cursor")
      .addClass("fa-check");
    $("#cfm-theme-rename-btn").attr("title", "确认重命名");
    $(".cfm-popup").addClass("cfm-theme-rename-mode");
    renderThemesView();
  }

  function exitThemeRenameMode() {
    cfmThemeRenameMode = false;
    cfmThemeRenameSelected.clear();
    cfmThemeRenameRangeMode = false;
    cfmThemeRenameLastClicked = null;
    $("#cfm-theme-rename-btn").removeClass("cfm-edit-active");
    $("#cfm-theme-rename-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-i-cursor");
    $("#cfm-theme-rename-btn").attr("title", "重命名主题");
    $(".cfm-popup").removeClass("cfm-theme-rename-mode");
    renderThemesView();
  }

  function toggleThemeRenameItem(id, shiftKey) {
    if ((shiftKey || cfmThemeRenameRangeMode) && cfmThemeRenameLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmThemeRenameLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          cfmThemeRenameSelected.add(visible[i]);
      }
    } else {
      if (cfmThemeRenameSelected.has(id)) cfmThemeRenameSelected.delete(id);
      else cfmThemeRenameSelected.add(id);
    }
    cfmThemeRenameLastClicked = id;
  }

  function prependThemeRenameToolbar(listContainer, renderFn) {
    if (!cfmThemeRenameMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => cfmThemeRenameSelected.has(id));
    const toolbar = $(
      `<div class="cfm-edit-toolbar"><button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmThemeRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmThemeRenameRangeMode ? "(开)" : ""}</button><span class="cfm-edit-count">${cfmThemeRenameSelected.size > 0 ? `已选 ${cfmThemeRenameSelected.size} 项` : ""}</span><button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button></div>`,
    );
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) visible.forEach((id) => cfmThemeRenameSelected.delete(id));
      else visible.forEach((id) => cfmThemeRenameSelected.add(id));
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmThemeRenameRangeMode = !cfmThemeRenameRangeMode;
      if (cfmThemeRenameRangeMode) cfmThemeRenameLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitThemeRenameMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showThemeRenamePopup(names) {
    if (!names || names.length === 0) return;
    const isSingle = names.length === 1;
    const nameListHtml =
      names.length <= 5
        ? names
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : names
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个主题</div>`;
    if (isSingle) {
      const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">重命名主题</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>新名称</label><input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${escapeHtml(names[0])}" placeholder="输入新名称"></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      overlay.find("#cfm-rename-input").focus().select();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const newName = overlay.find("#cfm-rename-input").val().trim();
          overlay.remove();
          resolve({ mode: "single", newName });
        });
        overlay.find(".cfm-edit-input").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape")
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
        });
      });
    } else {
      const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">批量重命名主题</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>操作类型</label><select class="cfm-edit-input" id="cfm-rename-action"><option value="add-prefix">增加前缀</option><option value="add-suffix">增加后缀</option><option value="del-prefix">删除前缀</option><option value="del-suffix">删除后缀</option></select></div><div class="cfm-edit-popup-field"><label id="cfm-rename-text-label">前缀内容</label><input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容"></div><div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;"><label>自动检测到的公共前/后缀</label><div id="cfm-rename-detected" class="cfm-rename-detected"></div></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      function updateRenameUI() {
        const action = overlay.find("#cfm-rename-action").val();
        const textLabel = overlay.find("#cfm-rename-text-label");
        const textInput = overlay.find("#cfm-rename-text");
        const autoDetect = overlay.find(".cfm-rename-auto-detect");
        const detected = overlay.find("#cfm-rename-detected");
        if (action === "add-prefix") {
          textLabel.text("前缀内容");
          textInput.attr("placeholder", "输入要添加的前缀");
          autoDetect.hide();
        } else if (action === "add-suffix") {
          textLabel.text("后缀内容");
          textInput.attr("placeholder", "输入要添加的后缀");
          autoDetect.hide();
        } else if (action === "del-prefix") {
          textLabel.text("要删除的前缀");
          textInput.attr(
            "placeholder",
            "输入要删除的前缀，或点击下方自动检测结果",
          );
          const cp = findCommonPrefix(names);
          detected.html(
            cp
              ? `<span class="cfm-rename-detect-item" data-value="${escapeHtml(cp)}">${escapeHtml(cp)}</span>`
              : '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
          );
          autoDetect.show();
        } else if (action === "del-suffix") {
          textLabel.text("要删除的后缀");
          textInput.attr(
            "placeholder",
            "输入要删除的后缀，或点击下方自动检测结果",
          );
          const cs = findCommonSuffix(names);
          detected.html(
            cs
              ? `<span class="cfm-rename-detect-item" data-value="${escapeHtml(cs)}">${escapeHtml(cs)}</span>`
              : '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
          );
          autoDetect.show();
        }
      }
      updateRenameUI();
      overlay.find("#cfm-rename-action").on("change", updateRenameUI);
      overlay.on("click", ".cfm-rename-detect-item", function () {
        overlay.find("#cfm-rename-text").val($(this).data("value"));
      });
      overlay.find("#cfm-rename-text").focus();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const action = overlay.find("#cfm-rename-action").val();
          const text = overlay.find("#cfm-rename-text").val().trim();
          overlay.remove();
          resolve({ mode: "batch", action, text });
        });
        overlay.find("#cfm-rename-text").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape")
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
        });
      });
    }
  }

  async function executeThemeRename(names) {
    const result = await showThemeRenamePopup(names);
    if (!result) return;
    const headers = getContext().getRequestHeaders();
    let allThemes = [];
    try {
      const resp = await fetch("/api/themes/all", {
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
      return t && typeof t === "object" ? structuredClone(t) : null;
    }
    if (result.mode === "single") {
      const oldName = names[0],
        newName = result.newName;
      if (!newName) {
        toastr.warning("请输入新名称");
        return;
      }
      if (newName === oldName) {
        toastr.info("名称未变更");
        return;
      }
      if (new Set(getThemeNames()).has(newName)) {
        toastr.error(`已存在名为「${newName}」的主题`);
        return;
      }
      try {
        const themeData = getThemeData(oldName);
        if (!themeData) {
          toastr.error(`找不到主题「${oldName}」的数据`);
          return;
        }
        themeData.name = newName;
        await fetch("/api/themes/save", {
          method: "POST",
          headers,
          body: JSON.stringify(themeData),
        });
        await fetch("/api/themes/delete", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: oldName }),
        });
        $("#themes option")
          .filter(function () {
            return $(this).val() === oldName;
          })
          .val(newName)
          .text(newName);
        if (typeof themes !== "undefined" && Array.isArray(themes)) {
          const idx = themes.findIndex(
            (t) => (typeof t === "object" ? t.name : t) === oldName,
          );
          if (idx !== -1 && typeof themes[idx] === "object")
            themes[idx].name = newName;
        }
        updateSettingsAfterRename("themes", oldName, newName);
        toastr.success(`已将「${oldName}」重命名为「${newName}」`);
      } catch (e) {
        console.error("[CFM] 主题重命名失败", e);
        toastr.error(`重命名失败: ${e.message}`);
        return;
      }
    } else if (result.mode === "batch") {
      const { action, text } = result;
      if (!text) {
        toastr.warning("请输入内容");
        return;
      }
      const existingThemes = new Set(getThemeNames());
      let success = 0,
        skipped = 0,
        failed = 0;
      toastr.info(`正在批量重命名 ${names.length} 个主题...`);
      for (const oldName of names) {
        let newName;
        if (action === "add-prefix") newName = text + oldName;
        else if (action === "add-suffix") newName = oldName + text;
        else if (action === "del-prefix") {
          if (!oldName.startsWith(text)) {
            skipped++;
            continue;
          }
          newName = oldName.substring(text.length);
        } else if (action === "del-suffix") {
          if (!oldName.endsWith(text)) {
            skipped++;
            continue;
          }
          newName = oldName.substring(0, oldName.length - text.length);
        }
        if (!newName || newName === oldName) {
          skipped++;
          continue;
        }
        if (existingThemes.has(newName)) {
          skipped++;
          continue;
        }
        try {
          const themeData = getThemeData(oldName);
          if (!themeData) {
            failed++;
            continue;
          }
          themeData.name = newName;
          await fetch("/api/themes/save", {
            method: "POST",
            headers,
            body: JSON.stringify(themeData),
          });
          await fetch("/api/themes/delete", {
            method: "POST",
            headers,
            body: JSON.stringify({ name: oldName }),
          });
          $("#themes option")
            .filter(function () {
              return $(this).val() === oldName;
            })
            .val(newName)
            .text(newName);
          if (typeof themes !== "undefined" && Array.isArray(themes)) {
            const idx = themes.findIndex(
              (t) => (typeof t === "object" ? t.name : t) === oldName,
            );
            if (idx !== -1 && typeof themes[idx] === "object")
              themes[idx].name = newName;
          }
          updateSettingsAfterRename("themes", oldName, newName);
          existingThemes.delete(oldName);
          existingThemes.add(newName);
          success++;
        } catch (e) {
          console.warn(`[CFM] 重命名主题 ${oldName} 失败`, e);
          failed++;
        }
      }
      let msg = `已重命名 ${success} 个主题`;
      if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
      if (failed > 0) msg += `，${failed} 个失败`;
      if (success > 0) toastr.success(msg);
      else toastr.warning(msg);
    }
    renderThemesView();
  }

  // ==================== 背景重命名模式 ====================
  let cfmBgRenameMode = false;
  let cfmBgRenameSelected = new Set();
  let cfmBgRenameRangeMode = false;
  let cfmBgRenameLastClicked = null;

  function enterBgRenameMode() {
    clearAllExclusiveModes();
    cfmBgRenameMode = true;
    cfmBgRenameSelected.clear();
    cfmBgRenameRangeMode = false;
    cfmBgRenameLastClicked = null;
    $("#cfm-bg-rename-btn").addClass("cfm-edit-active");
    $("#cfm-bg-rename-btn")
      .find("i")
      .removeClass("fa-i-cursor")
      .addClass("fa-check");
    $("#cfm-bg-rename-btn").attr("title", "确认重命名");
    $(".cfm-popup").addClass("cfm-bg-rename-mode");
    renderBackgroundsView();
  }

  function exitBgRenameMode() {
    cfmBgRenameMode = false;
    cfmBgRenameSelected.clear();
    cfmBgRenameRangeMode = false;
    cfmBgRenameLastClicked = null;
    $("#cfm-bg-rename-btn").removeClass("cfm-edit-active");
    $("#cfm-bg-rename-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-i-cursor");
    $("#cfm-bg-rename-btn").attr("title", "重命名背景");
    $(".cfm-popup").removeClass("cfm-bg-rename-mode");
    renderBackgroundsView();
  }

  function toggleBgRenameItem(id, shiftKey) {
    if ((shiftKey || cfmBgRenameRangeMode) && cfmBgRenameLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmBgRenameLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmBgRenameSelected.add(visible[i]);
      }
    } else {
      if (cfmBgRenameSelected.has(id)) cfmBgRenameSelected.delete(id);
      else cfmBgRenameSelected.add(id);
    }
    cfmBgRenameLastClicked = id;
  }

  function prependBgRenameToolbar(listContainer, renderFn) {
    if (!cfmBgRenameMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmBgRenameSelected.has(id));
    const toolbar = $(
      `<div class="cfm-edit-toolbar"><button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmBgRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmBgRenameRangeMode ? "(开)" : ""}</button><span class="cfm-edit-count">${cfmBgRenameSelected.size > 0 ? `已选 ${cfmBgRenameSelected.size} 项` : ""}</span><button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button></div>`,
    );
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) visible.forEach((id) => cfmBgRenameSelected.delete(id));
      else visible.forEach((id) => cfmBgRenameSelected.add(id));
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmBgRenameRangeMode = !cfmBgRenameRangeMode;
      if (cfmBgRenameRangeMode) cfmBgRenameLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitBgRenameMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showBgRenamePopup(names) {
    if (!names || names.length === 0) return;
    const isSingle = names.length === 1;
    const nameListHtml =
      names.length <= 5
        ? names
            .map(
              (n) =>
                `<div class="cfm-edit-name-item">${escapeHtml(getBackgroundDisplayName(n))}</div>`,
            )
            .join("")
        : names
            .slice(0, 5)
            .map(
              (n) =>
                `<div class="cfm-edit-name-item">${escapeHtml(getBackgroundDisplayName(n))}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个背景</div>`;
    if (isSingle) {
      const fullName = names[0];
      const dotIdx = fullName.lastIndexOf(".");
      const baseName = dotIdx > 0 ? fullName.substring(0, dotIdx) : fullName;
      const ext = dotIdx > 0 ? fullName.substring(dotIdx) : "";
      const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">重命名背景</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>新名称${ext ? ` (扩展名 ${ext} 将自动保留)` : ""}</label><input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${escapeHtml(baseName)}" placeholder="输入新名称"></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      overlay.find("#cfm-rename-input").focus().select();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const newBase = overlay.find("#cfm-rename-input").val().trim();
          overlay.remove();
          resolve({ mode: "single", newName: newBase + ext });
        });
        overlay.find(".cfm-edit-input").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape")
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
        });
      });
    } else {
      const baseNames = names.map((n) => {
        const d = n.lastIndexOf(".");
        return d > 0 ? n.substring(0, d) : n;
      });
      const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">批量重命名背景</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>操作类型</label><select class="cfm-edit-input" id="cfm-rename-action"><option value="add-prefix">增加前缀</option><option value="add-suffix">增加后缀(扩展名前)</option><option value="del-prefix">删除前缀</option><option value="del-suffix">删除后缀(扩展名前)</option></select></div><div class="cfm-edit-popup-field"><label id="cfm-rename-text-label">前缀内容</label><input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容"></div><div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;"><label>自动检测到的公共前/后缀</label><div id="cfm-rename-detected" class="cfm-rename-detected"></div></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      function updateRenameUI() {
        const action = overlay.find("#cfm-rename-action").val();
        const textLabel = overlay.find("#cfm-rename-text-label");
        const textInput = overlay.find("#cfm-rename-text");
        const autoDetect = overlay.find(".cfm-rename-auto-detect");
        const detected = overlay.find("#cfm-rename-detected");
        if (action === "add-prefix") {
          textLabel.text("前缀内容");
          textInput.attr("placeholder", "输入要添加的前缀");
          autoDetect.hide();
        } else if (action === "add-suffix") {
          textLabel.text("后缀内容(扩展名前)");
          textInput.attr("placeholder", "输入要添加的后缀");
          autoDetect.hide();
        } else if (action === "del-prefix") {
          textLabel.text("要删除的前缀");
          textInput.attr(
            "placeholder",
            "输入要删除的前缀，或点击下方自动检测结果",
          );
          const cp = findCommonPrefix(baseNames);
          detected.html(
            cp
              ? `<span class="cfm-rename-detect-item" data-value="${escapeHtml(cp)}">${escapeHtml(cp)}</span>`
              : '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
          );
          autoDetect.show();
        } else if (action === "del-suffix") {
          textLabel.text("要删除的后缀(扩展名前)");
          textInput.attr(
            "placeholder",
            "输入要删除的后缀，或点击下方自动检测结果",
          );
          const cs = findCommonSuffix(baseNames);
          detected.html(
            cs
              ? `<span class="cfm-rename-detect-item" data-value="${escapeHtml(cs)}">${escapeHtml(cs)}</span>`
              : '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
          );
          autoDetect.show();
        }
      }
      updateRenameUI();
      overlay.find("#cfm-rename-action").on("change", updateRenameUI);
      overlay.on("click", ".cfm-rename-detect-item", function () {
        overlay.find("#cfm-rename-text").val($(this).data("value"));
      });
      overlay.find("#cfm-rename-text").focus();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const action = overlay.find("#cfm-rename-action").val();
          const text = overlay.find("#cfm-rename-text").val().trim();
          overlay.remove();
          resolve({ mode: "batch", action, text });
        });
        overlay.find("#cfm-rename-text").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape")
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
        });
      });
    }
  }

  async function executeBgRename(names) {
    const result = await showBgRenamePopup(names);
    if (!result) return;
    const headers = getContext().getRequestHeaders();
    if (result.mode === "single") {
      const oldName = names[0],
        newName = result.newName;
      if (!newName) {
        toastr.warning("请输入新名称");
        return;
      }
      if (newName === oldName) {
        toastr.info("名称未变更");
        return;
      }
      try {
        const resp = await fetch("/api/backgrounds/rename", {
          method: "POST",
          headers,
          body: JSON.stringify({ old_bg: oldName, new_bg: newName }),
        });
        if (!resp.ok) {
          toastr.error("重命名背景失败");
          return;
        }
        // 更新原生 DOM
        $("#bg_menu_content .bg_example")
          .filter(function () {
            return $(this).attr("bgfile") === oldName;
          })
          .attr("bgfile", newName)
          .attr("title", newName);
        updateSettingsAfterRename("backgrounds", oldName, newName);
        toastr.success(
          `已将「${getBackgroundDisplayName(oldName)}」重命名为「${getBackgroundDisplayName(newName)}」`,
        );
      } catch (e) {
        console.error("[CFM] 背景重命名失败", e);
        toastr.error(`重命名失败: ${e.message}`);
        return;
      }
    } else if (result.mode === "batch") {
      const { action, text } = result;
      if (!text) {
        toastr.warning("请输入内容");
        return;
      }
      let success = 0,
        skipped = 0,
        failed = 0;
      toastr.info(`正在批量重命名 ${names.length} 个背景...`);
      for (const oldName of names) {
        const dotIdx = oldName.lastIndexOf(".");
        const baseName = dotIdx > 0 ? oldName.substring(0, dotIdx) : oldName;
        const ext = dotIdx > 0 ? oldName.substring(dotIdx) : "";
        let newBase;
        if (action === "add-prefix") newBase = text + baseName;
        else if (action === "add-suffix") newBase = baseName + text;
        else if (action === "del-prefix") {
          if (!baseName.startsWith(text)) {
            skipped++;
            continue;
          }
          newBase = baseName.substring(text.length);
        } else if (action === "del-suffix") {
          if (!baseName.endsWith(text)) {
            skipped++;
            continue;
          }
          newBase = baseName.substring(0, baseName.length - text.length);
        }
        const newName = newBase + ext;
        if (!newBase || newName === oldName) {
          skipped++;
          continue;
        }
        try {
          const resp = await fetch("/api/backgrounds/rename", {
            method: "POST",
            headers,
            body: JSON.stringify({ old_bg: oldName, new_bg: newName }),
          });
          if (!resp.ok) {
            failed++;
            continue;
          }
          $("#bg_menu_content .bg_example")
            .filter(function () {
              return $(this).attr("bgfile") === oldName;
            })
            .attr("bgfile", newName)
            .attr("title", newName);
          updateSettingsAfterRename("backgrounds", oldName, newName);
          success++;
        } catch (e) {
          console.warn(`[CFM] 重命名背景 ${oldName} 失败`, e);
          failed++;
        }
      }
      let msg = `已重命名 ${success} 个背景`;
      if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
      if (failed > 0) msg += `，${failed} 个失败`;
      if (success > 0) toastr.success(msg);
      else toastr.warning(msg);
    }
    // 刷新原生背景列表
    try {
      const bgModule = await import("../../../backgrounds.js");
      if (typeof bgModule.getBackgrounds === "function")
        await bgModule.getBackgrounds();
    } catch (e) {
      console.warn("[CFM] 刷新背景列表失败", e);
    }
    renderBackgroundsView();
  }

  // ==================== 预设备注编辑模式 ====================
  let cfmPresetNoteMode = false;
  let cfmPresetNoteSelected = new Set();
  let cfmPresetNoteRangeMode = false;
  let cfmPresetNoteLastClicked = null;

  function getPresetNote(name) {
    return extension_settings[extensionName].presetNotes?.[name] || "";
  }
  function setPresetNote(name, note) {
    if (!extension_settings[extensionName].presetNotes)
      extension_settings[extensionName].presetNotes = {};
    if (note) {
      extension_settings[extensionName].presetNotes[name] = note;
    } else {
      delete extension_settings[extensionName].presetNotes[name];
    }
    getContext().saveSettingsDebounced();
  }

  function enterPresetNoteMode() {
    cfmPresetNoteMode = true;
    cfmPresetNoteSelected.clear();
    cfmPresetNoteRangeMode = false;
    cfmPresetNoteLastClicked = null;
    if (cfmMultiSelectMode) {
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    }
    if (cfmExportMode) exitExportMode();
    if (cfmResDeleteMode) exitResDeleteMode();
    if (cfmPresetRenameMode) exitPresetRenameMode();
    $("#cfm-preset-note-btn").addClass("cfm-edit-active");
    $("#cfm-preset-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-preset-note-btn").attr("title", "确认编辑备注");
    $(".cfm-popup").addClass("cfm-preset-note-mode");
    renderPresetsView();
  }

  function exitPresetNoteMode() {
    cfmPresetNoteMode = false;
    cfmPresetNoteSelected.clear();
    cfmPresetNoteRangeMode = false;
    cfmPresetNoteLastClicked = null;
    $("#cfm-preset-note-btn").removeClass("cfm-edit-active");
    $("#cfm-preset-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-preset-note-btn").attr("title", "编辑备注");
    $(".cfm-popup").removeClass("cfm-preset-note-mode");
    renderPresetsView();
  }

  function togglePresetNoteItem(id, shiftKey) {
    if ((shiftKey || cfmPresetNoteRangeMode) && cfmPresetNoteLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmPresetNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          cfmPresetNoteSelected.add(visible[i]);
      }
    } else {
      if (cfmPresetNoteSelected.has(id)) cfmPresetNoteSelected.delete(id);
      else cfmPresetNoteSelected.add(id);
    }
    cfmPresetNoteLastClicked = id;
  }

  function prependPresetNoteToolbar(listContainer, renderFn) {
    if (!cfmPresetNoteMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => cfmPresetNoteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmPresetNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmPresetNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmPresetNoteSelected.size > 0 ? `已选 ${cfmPresetNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmPresetNoteSelected.delete(id));
      } else {
        visible.forEach((id) => cfmPresetNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmPresetNoteRangeMode = !cfmPresetNoteRangeMode;
      if (cfmPresetNoteRangeMode) cfmPresetNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitPresetNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showPresetNotePopup(presetNames) {
    if (!presetNames || presetNames.length === 0) return;
    let defaultNote = "";
    if (presetNames.length === 1) {
      defaultNote = getPresetNote(presetNames[0]);
    }
    const nameListHtml =
      presetNames.length <= 5
        ? presetNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : presetNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${presetNames.length} 个预设</div>`;

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑预设备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-preset-note-input" value="${escapeHtml(defaultNote)}" placeholder="${presetNames.length > 1 ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${presetNames.length === 1 ? (defaultNote ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : "") : '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>'}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-preset-note-input").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        overlay.remove();
        resolve({ note: "", clear: true });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const note = overlay.find("#cfm-preset-note-input").val().trim();
        overlay.remove();
        resolve({ note, clear: false });
      });
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  async function executePresetNoteEdit(names) {
    const result = await showPresetNotePopup(names);
    if (!result) return;
    const { note, clear } = result;
    const isBatch = names.length > 1;
    if (isBatch && !note && !clear) {
      toastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const name of names) {
      if (clear) {
        setPresetNote(name, "");
        count++;
      } else if (note) {
        setPresetNote(name, note);
        count++;
      } else if (!isBatch) {
        setPresetNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      toastr.success(`已更新 ${count} 个预设的备注`);
      renderPresetsView();
    }
  }

  // ==================== 世界书备注编辑模式 ====================
  let cfmWorldInfoNoteMode = false;
  let cfmWorldInfoNoteSelected = new Set();
  let cfmWorldInfoNoteRangeMode = false;
  let cfmWorldInfoNoteLastClicked = null;

  function getWorldInfoNote(name) {
    return extension_settings[extensionName].worldInfoNotes?.[name] || "";
  }
  function setWorldInfoNote(name, note) {
    if (!extension_settings[extensionName].worldInfoNotes)
      extension_settings[extensionName].worldInfoNotes = {};
    if (note) {
      extension_settings[extensionName].worldInfoNotes[name] = note;
    } else {
      delete extension_settings[extensionName].worldInfoNotes[name];
    }
    getContext().saveSettingsDebounced();
  }

  function enterWorldInfoNoteMode() {
    cfmWorldInfoNoteMode = true;
    cfmWorldInfoNoteSelected.clear();
    cfmWorldInfoNoteRangeMode = false;
    cfmWorldInfoNoteLastClicked = null;
    if (cfmMultiSelectMode) {
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    }
    if (cfmExportMode) exitExportMode();
    if (cfmResDeleteMode) exitResDeleteMode();
    if (cfmWorldInfoRenameMode) exitWorldInfoRenameMode();
    $("#cfm-worldinfo-note-btn").addClass("cfm-edit-active");
    $("#cfm-worldinfo-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-worldinfo-note-btn").attr("title", "确认编辑备注");
    $(".cfm-popup").addClass("cfm-worldinfo-note-mode");
    renderWorldInfoView();
  }

  function exitWorldInfoNoteMode() {
    cfmWorldInfoNoteMode = false;
    cfmWorldInfoNoteSelected.clear();
    cfmWorldInfoNoteRangeMode = false;
    cfmWorldInfoNoteLastClicked = null;
    $("#cfm-worldinfo-note-btn").removeClass("cfm-edit-active");
    $("#cfm-worldinfo-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-worldinfo-note-btn").attr("title", "编辑备注");
    $(".cfm-popup").removeClass("cfm-worldinfo-note-mode");
    renderWorldInfoView();
  }

  function toggleWorldInfoNoteItem(id, shiftKey) {
    if (
      (shiftKey || cfmWorldInfoNoteRangeMode) &&
      cfmWorldInfoNoteLastClicked
    ) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmWorldInfoNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          cfmWorldInfoNoteSelected.add(visible[i]);
      }
    } else {
      if (cfmWorldInfoNoteSelected.has(id)) cfmWorldInfoNoteSelected.delete(id);
      else cfmWorldInfoNoteSelected.add(id);
    }
    cfmWorldInfoNoteLastClicked = id;
  }

  function prependWorldInfoNoteToolbar(listContainer, renderFn) {
    if (!cfmWorldInfoNoteMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => cfmWorldInfoNoteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmWorldInfoNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmWorldInfoNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmWorldInfoNoteSelected.size > 0 ? `已选 ${cfmWorldInfoNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmWorldInfoNoteSelected.delete(id));
      } else {
        visible.forEach((id) => cfmWorldInfoNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmWorldInfoNoteRangeMode = !cfmWorldInfoNoteRangeMode;
      if (cfmWorldInfoNoteRangeMode) cfmWorldInfoNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitWorldInfoNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  async function showWorldInfoNotePopup(wiNames) {
    if (!wiNames || wiNames.length === 0) return;
    let defaultNote = "";
    if (wiNames.length === 1) {
      defaultNote = getWorldInfoNote(wiNames[0]);
    }
    const nameListHtml =
      wiNames.length <= 5
        ? wiNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : wiNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${wiNames.length} 个世界书</div>`;

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">编辑世界书备注</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>备注</label>
            <input type="text" class="cfm-edit-input" id="cfm-worldinfo-note-input" value="${escapeHtml(defaultNote)}" placeholder="${wiNames.length > 1 ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${wiNames.length === 1 ? (defaultNote ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : "") : '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>'}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-worldinfo-note-input").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        overlay.remove();
        resolve({ note: "", clear: true });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const note = overlay.find("#cfm-worldinfo-note-input").val().trim();
        overlay.remove();
        resolve({ note, clear: false });
      });
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  async function executeWorldInfoNoteEdit(names) {
    const result = await showWorldInfoNotePopup(names);
    if (!result) return;
    const { note, clear } = result;
    const isBatch = names.length > 1;
    if (isBatch && !note && !clear) {
      toastr.warning("请输入备注内容");
      return;
    }
    let count = 0;
    for (const name of names) {
      if (clear) {
        setWorldInfoNote(name, "");
        count++;
      } else if (note) {
        setWorldInfoNote(name, note);
        count++;
      } else if (!isBatch) {
        setWorldInfoNote(name, "");
        count++;
      }
    }
    if (count > 0) {
      toastr.success(`已更新 ${count} 个世界书的备注`);
      renderWorldInfoView();
    }
  }

  // ==================== 预设重命名模式 ====================
  let cfmPresetRenameMode = false;
  let cfmPresetRenameSelected = new Set();
  let cfmPresetRenameRangeMode = false;
  let cfmPresetRenameLastClicked = null;

  function enterPresetRenameMode() {
    cfmPresetRenameMode = true;
    cfmPresetRenameSelected.clear();
    cfmPresetRenameRangeMode = false;
    cfmPresetRenameLastClicked = null;
    if (cfmMultiSelectMode) {
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    }
    if (cfmExportMode) exitExportMode();
    if (cfmResDeleteMode) exitResDeleteMode();
    if (cfmPresetNoteMode) exitPresetNoteMode();
    $("#cfm-preset-rename-btn").addClass("cfm-edit-active");
    $("#cfm-preset-rename-btn")
      .find("i")
      .removeClass("fa-i-cursor")
      .addClass("fa-check");
    $("#cfm-preset-rename-btn").attr("title", "确认重命名");
    $(".cfm-popup").addClass("cfm-preset-rename-mode");
    renderPresetsView();
  }

  function exitPresetRenameMode() {
    cfmPresetRenameMode = false;
    cfmPresetRenameSelected.clear();
    cfmPresetRenameRangeMode = false;
    cfmPresetRenameLastClicked = null;
    $("#cfm-preset-rename-btn").removeClass("cfm-edit-active");
    $("#cfm-preset-rename-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-i-cursor");
    $("#cfm-preset-rename-btn").attr("title", "重命名预设");
    $(".cfm-popup").removeClass("cfm-preset-rename-mode");
    renderPresetsView();
  }

  function togglePresetRenameItem(id, shiftKey) {
    if ((shiftKey || cfmPresetRenameRangeMode) && cfmPresetRenameLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmPresetRenameLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          cfmPresetRenameSelected.add(visible[i]);
      }
    } else {
      if (cfmPresetRenameSelected.has(id)) cfmPresetRenameSelected.delete(id);
      else cfmPresetRenameSelected.add(id);
    }
    cfmPresetRenameLastClicked = id;
  }

  function prependPresetRenameToolbar(listContainer, renderFn) {
    if (!cfmPresetRenameMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => cfmPresetRenameSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmPresetRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmPresetRenameRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmPresetRenameSelected.size > 0 ? `已选 ${cfmPresetRenameSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmPresetRenameSelected.delete(id));
      } else {
        visible.forEach((id) => cfmPresetRenameSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmPresetRenameRangeMode = !cfmPresetRenameRangeMode;
      if (cfmPresetRenameRangeMode) cfmPresetRenameLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitPresetRenameMode();
    });
    listContainer.prepend(toolbar);
  }

  // 显示预设重命名弹窗
  async function showPresetRenamePopup(names) {
    if (!names || names.length === 0) return;
    const isSingle = names.length === 1;
    const nameListHtml =
      names.length <= 5
        ? names
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : names
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个预设</div>`;

    if (isSingle) {
      // 单选模式：直接编辑名称
      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">重命名预设</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            <div class="cfm-edit-popup-field">
              <label>新名称</label>
              <input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${escapeHtml(names[0])}" placeholder="输入新名称">
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>
      `;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      overlay.find("#cfm-rename-input").focus().select();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const newName = overlay.find("#cfm-rename-input").val().trim();
          overlay.remove();
          resolve({ mode: "single", newName });
        });
        overlay.find(".cfm-edit-input").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape") {
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
          }
        });
      });
    } else {
      // 多选模式：增加/删除前缀或后缀
      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">批量重命名预设</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            <div class="cfm-edit-popup-field">
              <label>操作类型</label>
              <select class="cfm-edit-input" id="cfm-rename-action">
                <option value="add-prefix">增加前缀</option>
                <option value="add-suffix">增加后缀</option>
                <option value="del-prefix">删除前缀</option>
                <option value="del-suffix">删除后缀</option>
              </select>
            </div>
            <div class="cfm-edit-popup-field">
              <label id="cfm-rename-text-label">前缀内容</label>
              <input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容">
            </div>
            <div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;">
              <label>自动检测到的公共前/后缀</label>
              <div id="cfm-rename-detected" class="cfm-rename-detected"></div>
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>
      `;
      const overlay = $(popupHtml);
      $("body").append(overlay);

      // 根据操作类型切换标签和自动检测
      function updateRenameUI() {
        const action = overlay.find("#cfm-rename-action").val();
        const textLabel = overlay.find("#cfm-rename-text-label");
        const textInput = overlay.find("#cfm-rename-text");
        const autoDetect = overlay.find(".cfm-rename-auto-detect");
        const detected = overlay.find("#cfm-rename-detected");
        if (action === "add-prefix") {
          textLabel.text("前缀内容");
          textInput.attr("placeholder", "输入要添加的前缀");
          autoDetect.hide();
        } else if (action === "add-suffix") {
          textLabel.text("后缀内容");
          textInput.attr("placeholder", "输入要添加的后缀");
          autoDetect.hide();
        } else if (action === "del-prefix") {
          textLabel.text("要删除的前缀");
          textInput.attr(
            "placeholder",
            "输入要删除的前缀，或点击下方自动检测结果",
          );
          // 自动检测公共前缀
          const commonPrefix = findCommonPrefix(names);
          if (commonPrefix) {
            detected.html(
              `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonPrefix)}">${escapeHtml(commonPrefix)}</span>`,
            );
            autoDetect.show();
          } else {
            detected.html(
              '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
            );
            autoDetect.show();
          }
        } else if (action === "del-suffix") {
          textLabel.text("要删除的后缀");
          textInput.attr(
            "placeholder",
            "输入要删除的后缀，或点击下方自动检测结果",
          );
          // 自动检测公共后缀
          const commonSuffix = findCommonSuffix(names);
          if (commonSuffix) {
            detected.html(
              `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonSuffix)}">${escapeHtml(commonSuffix)}</span>`,
            );
            autoDetect.show();
          } else {
            detected.html(
              '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
            );
            autoDetect.show();
          }
        }
      }
      updateRenameUI();
      overlay.find("#cfm-rename-action").on("change", updateRenameUI);
      // 点击自动检测结果填入输入框
      overlay.on("click", ".cfm-rename-detect-item", function () {
        overlay.find("#cfm-rename-text").val($(this).data("value"));
      });
      overlay.find("#cfm-rename-text").focus();

      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const action = overlay.find("#cfm-rename-action").val();
          const text = overlay.find("#cfm-rename-text").val().trim();
          overlay.remove();
          resolve({ mode: "batch", action, text });
        });
        overlay.find("#cfm-rename-text").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape") {
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
          }
        });
      });
    }
  }

  // 查找公共前缀
  function findCommonPrefix(names) {
    if (names.length === 0) return "";
    // 按第一个名称与第二个进行比较来找最大公共前缀，然后和后续比较
    let prefix = names[0];
    for (let i = 1; i < names.length; i++) {
      while (names[i].indexOf(prefix) !== 0) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (!prefix) return "";
      }
    }
    return prefix;
  }

  // 查找公共后缀
  function findCommonSuffix(names) {
    if (names.length === 0) return "";
    const reversed = names.map((n) => n.split("").reverse().join(""));
    let suffix = reversed[0];
    for (let i = 1; i < reversed.length; i++) {
      while (reversed[i].indexOf(suffix) !== 0) {
        suffix = suffix.substring(0, suffix.length - 1);
        if (!suffix) return "";
      }
    }
    return suffix.split("").reverse().join("");
  }

  // 执行预设重命名
  async function executePresetRename(names) {
    const result = await showPresetRenamePopup(names);
    if (!result) return;

    const pm = getContext().getPresetManager();
    if (!pm) {
      toastr.error("预设管理器不可用");
      return;
    }
    const headers = getContext().getRequestHeaders();

    if (result.mode === "single") {
      // 单个重命名
      const oldName = names[0];
      const newName = result.newName;
      if (!newName) {
        toastr.warning("请输入新名称");
        return;
      }
      if (newName === oldName) {
        toastr.info("名称未变更");
        return;
      }
      // 检查是否存在同名预设
      const existingPresets = getCurrentPresets();
      if (existingPresets.some((p) => p.name === newName)) {
        toastr.error(`已存在名为「${newName}」的预设`);
        return;
      }
      try {
        // 获取预设数据
        const presetData = getPresetDataForRename(pm, oldName);
        if (!presetData) {
          toastr.error(`找不到预设「${oldName}」的数据`);
          return;
        }
        // 用新名字保存
        await fetch("/api/presets/save", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            preset: presetData,
            name: newName,
            apiId: pm.apiId,
          }),
        });
        // 删除旧名字
        await fetch("/api/presets/delete", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ name: oldName, apiId: pm.apiId }),
        });
        // 同步更新DOM中的option（防止渲染时清理逻辑误删新名称的分组）
        syncPresetOptionInDOM(pm, oldName, newName);
        // 更新插件设置中的引用
        updateSettingsAfterRename("presets", oldName, newName);
        toastr.success(`已将「${oldName}」重命名为「${newName}」`);
      } catch (e) {
        console.error("[CFM] 预设重命名失败", e);
        toastr.error(`重命名失败: ${e.message}`);
        return;
      }
    } else if (result.mode === "batch") {
      // 批量重命名
      const { action, text } = result;
      if (!text) {
        toastr.warning("请输入内容");
        return;
      }
      const existingPresets = new Set(getCurrentPresets().map((p) => p.name));
      let success = 0;
      let skipped = 0;
      let failed = 0;

      toastr.info(`正在批量重命名 ${names.length} 个预设...`);

      for (const oldName of names) {
        let newName;
        if (action === "add-prefix") {
          newName = text + oldName;
        } else if (action === "add-suffix") {
          newName = oldName + text;
        } else if (action === "del-prefix") {
          if (!oldName.startsWith(text)) {
            skipped++;
            continue;
          }
          newName = oldName.substring(text.length);
        } else if (action === "del-suffix") {
          if (!oldName.endsWith(text)) {
            skipped++;
            continue;
          }
          newName = oldName.substring(0, oldName.length - text.length);
        }
        if (!newName || newName === oldName) {
          skipped++;
          continue;
        }
        // 检查新名称是否冲突
        if (existingPresets.has(newName)) {
          skipped++;
          continue;
        }
        try {
          const presetData = getPresetDataForRename(pm, oldName);
          if (!presetData) {
            failed++;
            continue;
          }
          await fetch("/api/presets/save", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
              preset: presetData,
              name: newName,
              apiId: pm.apiId,
            }),
          });
          await fetch("/api/presets/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: oldName, apiId: pm.apiId }),
          });
          // 同步更新DOM中的option
          syncPresetOptionInDOM(pm, oldName, newName);
          updateSettingsAfterRename("presets", oldName, newName);
          // 更新已存在集合
          existingPresets.delete(oldName);
          existingPresets.add(newName);
          success++;
        } catch (e) {
          console.warn(`[CFM] 重命名预设 ${oldName} 失败`, e);
          failed++;
        }
      }
      let msg = `已重命名 ${success} 个预设`;
      if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
      if (failed > 0) msg += `，${failed} 个失败`;
      if (success > 0) toastr.success(msg);
      else toastr.warning(msg);
    }

    // 刷新预设管理器的下拉列表
    await refreshPresetManagerList(pm);
    renderPresetsView();
  }

  // 获取预设数据用于重命名
  function getPresetDataForRename(pm, name) {
    if (typeof pm.getCompletionPresetByName === "function") {
      const preset = pm.getCompletionPresetByName(name);
      if (preset) return structuredClone(preset);
    }
    if (typeof pm.getPresetList === "function") {
      const { presets, preset_names } = pm.getPresetList();
      let found;
      if (Array.isArray(preset_names)) {
        const idx = preset_names.indexOf(name);
        if (idx >= 0) found = presets[idx];
      } else if (preset_names && typeof preset_names === "object") {
        if (preset_names[name] !== undefined)
          found = presets[preset_names[name]];
      }
      if (found) return structuredClone(found);
    }
    return null;
  }

  // 同步更新预设管理器DOM中的option（重命名后立即同步，防止渲染清理逻辑误删分组）
  function syncPresetOptionInDOM(pm, oldName, newName) {
    if (!pm || !pm.select) return;
    const $select = $(pm.select);
    const $option = $select.find(`option`).filter(function () {
      return $(this).text() === oldName;
    });
    if ($option.length > 0) {
      // 更新option的文本和值
      const oldVal = $option.val();
      $option.text(newName);
      // 如果value就是名称本身，也更新value
      if (oldVal === oldName) {
        $option.val(newName);
      }
      // 如果当前选中的就是被重命名的预设，保持选中状态
      if ($select.val() === oldVal) {
        $select.val($option.val());
      }
    } else {
      // 找不到旧option，添加新的
      $select.append($(`<option></option>`).val(newName).text(newName));
    }
  }

  // 同步更新世界书DOM中的option（重命名后立即同步）
  function syncWorldInfoOptionInDOM(oldName, newName) {
    const $select = $("#world_editor_select");
    const $option = $select.find(`option`).filter(function () {
      return $(this).text() === oldName;
    });
    if ($option.length > 0) {
      const oldVal = $option.val();
      $option.text(newName);
      if (oldVal === oldName) {
        $option.val(newName);
      }
    } else {
      $select.append($(`<option></option>`).val(newName).text(newName));
    }
    // 同时清除世界书名称缓存，确保下次渲染获取最新数据
    _worldInfoNamesCache = null;
  }

  // 刷新预设管理器的下拉列表
  async function refreshPresetManagerList(pm) {
    try {
      // 触发设置重新加载以同步预设列表
      if (pm && pm.select) {
        // 记住当前选中的值
        const currentVal = $(pm.select).val();
        // 触发 SillyTavern 重新加载设置
        const resp = await fetch("/api/settings/get", {
          method: "POST",
          headers: getContext().getRequestHeaders(),
          body: JSON.stringify({}),
        });
        if (resp.ok) {
          // 简单方式：通过触发change事件让ST更新
          $(pm.select).trigger("change");
        }
      }
    } catch (e) {
      console.warn("[CFM] 刷新预设列表失败", e);
    }
  }

  // 重命名后更新插件设置中的引用（文件夹分配、备注、收藏等）
  function updateSettingsAfterRename(resType, oldName, newName) {
    // 更新文件夹分配（presetGroups / worldInfoGroups 是 { itemName: folderId } 映射）
    const groups = getResourceGroups(resType);
    if (groups && groups[oldName]) {
      groups[newName] = groups[oldName];
      delete groups[oldName];
    }
    // 更新收藏（presetFavorites / worldInfoFavorites 是数组）
    const favs = getResFavorites(resType);
    if (favs) {
      const idx = favs.indexOf(oldName);
      if (idx !== -1) favs[idx] = newName;
    }
    // 更新备注
    if (resType === "presets") {
      const notes = extension_settings[extensionName].presetNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
    } else if (resType === "worldinfo") {
      const notes = extension_settings[extensionName].worldInfoNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
    } else if (resType === "themes") {
      const notes = extension_settings[extensionName].themeNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
    } else if (resType === "backgrounds") {
      const notes = extension_settings[extensionName].bgNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
    }
    getContext().saveSettingsDebounced();
  }

  // ==================== 世界书重命名模式 ====================
  let cfmWorldInfoRenameMode = false;
  let cfmWorldInfoRenameSelected = new Set();
  let cfmWorldInfoRenameRangeMode = false;
  let cfmWorldInfoRenameLastClicked = null;

  function enterWorldInfoRenameMode() {
    cfmWorldInfoRenameMode = true;
    cfmWorldInfoRenameSelected.clear();
    cfmWorldInfoRenameRangeMode = false;
    cfmWorldInfoRenameLastClicked = null;
    if (cfmMultiSelectMode) {
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    }
    if (cfmExportMode) exitExportMode();
    if (cfmResDeleteMode) exitResDeleteMode();
    if (cfmWorldInfoNoteMode) exitWorldInfoNoteMode();
    $("#cfm-worldinfo-rename-btn").addClass("cfm-edit-active");
    $("#cfm-worldinfo-rename-btn")
      .find("i")
      .removeClass("fa-i-cursor")
      .addClass("fa-check");
    $("#cfm-worldinfo-rename-btn").attr("title", "确认重命名");
    $(".cfm-popup").addClass("cfm-worldinfo-rename-mode");
    renderWorldInfoView();
  }

  function exitWorldInfoRenameMode() {
    cfmWorldInfoRenameMode = false;
    cfmWorldInfoRenameSelected.clear();
    cfmWorldInfoRenameRangeMode = false;
    cfmWorldInfoRenameLastClicked = null;
    $("#cfm-worldinfo-rename-btn").removeClass("cfm-edit-active");
    $("#cfm-worldinfo-rename-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-i-cursor");
    $("#cfm-worldinfo-rename-btn").attr("title", "重命名世界书");
    $(".cfm-popup").removeClass("cfm-worldinfo-rename-mode");
    renderWorldInfoView();
  }

  function toggleWorldInfoRenameItem(id, shiftKey) {
    if (
      (shiftKey || cfmWorldInfoRenameRangeMode) &&
      cfmWorldInfoRenameLastClicked
    ) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmWorldInfoRenameLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          cfmWorldInfoRenameSelected.add(visible[i]);
      }
    } else {
      if (cfmWorldInfoRenameSelected.has(id))
        cfmWorldInfoRenameSelected.delete(id);
      else cfmWorldInfoRenameSelected.add(id);
    }
    cfmWorldInfoRenameLastClicked = id;
  }

  function prependWorldInfoRenameToolbar(listContainer, renderFn) {
    if (!cfmWorldInfoRenameMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 &&
      visible.every((id) => cfmWorldInfoRenameSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmWorldInfoRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmWorldInfoRenameRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmWorldInfoRenameSelected.size > 0 ? `已选 ${cfmWorldInfoRenameSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmWorldInfoRenameSelected.delete(id));
      } else {
        visible.forEach((id) => cfmWorldInfoRenameSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmWorldInfoRenameRangeMode = !cfmWorldInfoRenameRangeMode;
      if (cfmWorldInfoRenameRangeMode) cfmWorldInfoRenameLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitWorldInfoRenameMode();
    });
    listContainer.prepend(toolbar);
  }

  // 显示世界书重命名弹窗
  async function showWorldInfoRenamePopup(names) {
    if (!names || names.length === 0) return;
    const isSingle = names.length === 1;
    const nameListHtml =
      names.length <= 5
        ? names
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : names
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个世界书</div>`;

    if (isSingle) {
      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">重命名世界书</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            <div class="cfm-edit-popup-field">
              <label>新名称</label>
              <input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${escapeHtml(names[0])}" placeholder="输入新名称">
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>
      `;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      overlay.find("#cfm-rename-input").focus().select();
      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const newName = overlay.find("#cfm-rename-input").val().trim();
          overlay.remove();
          resolve({ mode: "single", newName });
        });
        overlay.find(".cfm-edit-input").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape") {
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
          }
        });
      });
    } else {
      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">批量重命名世界书</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            <div class="cfm-edit-popup-field">
              <label>操作类型</label>
              <select class="cfm-edit-input" id="cfm-rename-action">
                <option value="add-prefix">增加前缀</option>
                <option value="add-suffix">增加后缀</option>
                <option value="del-prefix">删除前缀</option>
                <option value="del-suffix">删除后缀</option>
              </select>
            </div>
            <div class="cfm-edit-popup-field">
              <label id="cfm-rename-text-label">前缀内容</label>
              <input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容">
            </div>
            <div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;">
              <label>自动检测到的公共前/后缀</label>
              <div id="cfm-rename-detected" class="cfm-rename-detected"></div>
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>
      `;
      const overlay = $(popupHtml);
      $("body").append(overlay);

      function updateRenameUI() {
        const action = overlay.find("#cfm-rename-action").val();
        const textLabel = overlay.find("#cfm-rename-text-label");
        const textInput = overlay.find("#cfm-rename-text");
        const autoDetect = overlay.find(".cfm-rename-auto-detect");
        const detected = overlay.find("#cfm-rename-detected");
        if (action === "add-prefix") {
          textLabel.text("前缀内容");
          textInput.attr("placeholder", "输入要添加的前缀");
          autoDetect.hide();
        } else if (action === "add-suffix") {
          textLabel.text("后缀内容");
          textInput.attr("placeholder", "输入要添加的后缀");
          autoDetect.hide();
        } else if (action === "del-prefix") {
          textLabel.text("要删除的前缀");
          textInput.attr(
            "placeholder",
            "输入要删除的前缀，或点击下方自动检测结果",
          );
          const commonPrefix = findCommonPrefix(names);
          if (commonPrefix) {
            detected.html(
              `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonPrefix)}">${escapeHtml(commonPrefix)}</span>`,
            );
            autoDetect.show();
          } else {
            detected.html(
              '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
            );
            autoDetect.show();
          }
        } else if (action === "del-suffix") {
          textLabel.text("要删除的后缀");
          textInput.attr(
            "placeholder",
            "输入要删除的后缀，或点击下方自动检测结果",
          );
          const commonSuffix = findCommonSuffix(names);
          if (commonSuffix) {
            detected.html(
              `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonSuffix)}">${escapeHtml(commonSuffix)}</span>`,
            );
            autoDetect.show();
          } else {
            detected.html(
              '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
            );
            autoDetect.show();
          }
        }
      }
      updateRenameUI();
      overlay.find("#cfm-rename-action").on("change", updateRenameUI);
      overlay.on("click", ".cfm-rename-detect-item", function () {
        overlay.find("#cfm-rename-text").val($(this).data("value"));
      });
      overlay.find("#cfm-rename-text").focus();

      return new Promise((resolve) => {
        overlay.find(".cfm-edit-popup-cancel").on("click", () => {
          overlay.remove();
          resolve(null);
        });
        overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
          if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
            overlay.remove();
            resolve(null);
          }
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const action = overlay.find("#cfm-rename-action").val();
          const text = overlay.find("#cfm-rename-text").val().trim();
          overlay.remove();
          resolve({ mode: "batch", action, text });
        });
        overlay.find("#cfm-rename-text").on("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            overlay.find(".cfm-edit-popup-confirm").trigger("click");
          }
          if (e.key === "Escape") {
            overlay.find(".cfm-edit-popup-cancel").trigger("click");
          }
        });
      });
    }
  }

  // 执行世界书重命名
  async function executeWorldInfoRename(names) {
    const result = await showWorldInfoRenamePopup(names);
    if (!result) return;

    const headers = getContext().getRequestHeaders();

    if (result.mode === "single") {
      const oldName = names[0];
      const newName = result.newName;
      if (!newName) {
        toastr.warning("请输入新名称");
        return;
      }
      if (newName === oldName) {
        toastr.info("名称未变更");
        return;
      }
      try {
        // 获取世界书数据
        const resp = await fetch("/api/worldinfo/get", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ name: oldName }),
        });
        if (!resp.ok) throw new Error("获取世界书数据失败");
        const wiData = await resp.json();
        // 用新名字编辑保存（这会创建新文件）
        const saveResp = await fetch("/api/worldinfo/edit", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ name: newName, data: wiData }),
        });
        if (!saveResp.ok) throw new Error("保存世界书失败");
        // 删除旧文件
        await fetch("/api/worldinfo/delete", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ name: oldName }),
        });
        // 同步更新DOM中的option（防止渲染时清理逻辑误删新名称的分组）
        syncWorldInfoOptionInDOM(oldName, newName);
        updateSettingsAfterRename("worldinfo", oldName, newName);
        toastr.success(`已将「${oldName}」重命名为「${newName}」`);
      } catch (e) {
        console.error("[CFM] 世界书重命名失败", e);
        toastr.error(`重命名失败: ${e.message}`);
        return;
      }
    } else if (result.mode === "batch") {
      const { action, text } = result;
      if (!text) {
        toastr.warning("请输入内容");
        return;
      }
      let success = 0;
      let skipped = 0;
      let failed = 0;

      toastr.info(`正在批量重命名 ${names.length} 个世界书...`);

      for (const oldName of names) {
        let newName;
        if (action === "add-prefix") {
          newName = text + oldName;
        } else if (action === "add-suffix") {
          newName = oldName + text;
        } else if (action === "del-prefix") {
          if (!oldName.startsWith(text)) {
            skipped++;
            continue;
          }
          newName = oldName.substring(text.length);
        } else if (action === "del-suffix") {
          if (!oldName.endsWith(text)) {
            skipped++;
            continue;
          }
          newName = oldName.substring(0, oldName.length - text.length);
        }
        if (!newName || newName === oldName) {
          skipped++;
          continue;
        }
        try {
          const resp = await fetch("/api/worldinfo/get", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: oldName }),
          });
          if (!resp.ok) {
            failed++;
            continue;
          }
          const wiData = await resp.json();
          const saveResp = await fetch("/api/worldinfo/edit", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: newName, data: wiData }),
          });
          if (!saveResp.ok) {
            failed++;
            continue;
          }
          await fetch("/api/worldinfo/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: oldName }),
          });
          // 同步更新DOM中的option
          syncWorldInfoOptionInDOM(oldName, newName);
          updateSettingsAfterRename("worldinfo", oldName, newName);
          success++;
        } catch (e) {
          console.warn(`[CFM] 重命名世界书 ${oldName} 失败`, e);
          failed++;
        }
      }
      let msg = `已重命名 ${success} 个世界书`;
      if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
      if (failed > 0) msg += `，${failed} 个失败`;
      if (success > 0) toastr.success(msg);
      else toastr.warning(msg);
    }

    renderWorldInfoView();
  }

  // ==================== 角色卡快速编辑模式 ====================
  let cfmEditMode = false;
  let cfmEditSelected = new Set();
  let cfmEditRangeMode = false;
  let cfmEditLastClicked = null;

  function enterEditMode() {
    cfmEditMode = true;
    cfmEditSelected.clear();
    cfmEditRangeMode = false;
    cfmEditLastClicked = null;
    // 关闭其他模式
    if (cfmMultiSelectMode) {
      cfmMultiSelectMode = false;
      clearMultiSelect();
      cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    }
    if (cfmExportMode) exitExportMode();
    if (cfmResDeleteMode) exitResDeleteMode();
    // 更新按钮外观
    $("#cfm-edit-char-btn").addClass("cfm-edit-active");
    $("#cfm-edit-char-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-edit-char-btn").attr("title", "确认编辑");
    $(".cfm-popup").addClass("cfm-edit-mode");
    rerenderCurrentView();
  }

  function exitEditMode() {
    cfmEditMode = false;
    cfmEditSelected.clear();
    cfmEditRangeMode = false;
    cfmEditLastClicked = null;
    $("#cfm-edit-char-btn").removeClass("cfm-edit-active");
    $("#cfm-edit-char-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-edit-char-btn").attr("title", "快速编辑角色卡");
    $(".cfm-popup").removeClass("cfm-edit-mode");
    rerenderCurrentView();
  }

  function toggleEditItem(id, shiftKey) {
    if ((shiftKey || cfmEditRangeMode) && cfmEditLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmEditLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmEditSelected.add(visible[i]);
      }
    } else {
      if (cfmEditSelected.has(id)) cfmEditSelected.delete(id);
      else cfmEditSelected.add(id);
    }
    cfmEditLastClicked = id;
  }

  function prependEditToolbar(listContainer, renderFn) {
    if (!cfmEditMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmEditSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmEditRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmEditRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmEditSelected.size > 0 ? `已选 ${cfmEditSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmEditSelected.delete(id));
      } else {
        visible.forEach((id) => cfmEditSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmEditRangeMode = !cfmEditRangeMode;
      if (cfmEditRangeMode) cfmEditLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitEditMode();
    });
    listContainer.prepend(toolbar);
  }

  // 显示编辑弹窗（支持单个或批量）
  async function showEditPopup(avatars) {
    if (!avatars || avatars.length === 0) return;
    const characters = getContext().characters;
    // 单个角色时预填当前值
    let defaultCreator = "";
    let defaultVersion = "";
    if (avatars.length === 1) {
      const char = characters.find((c) => c.avatar === avatars[0]);
      if (char) {
        defaultCreator = char.data?.creator || "";
        defaultVersion = char.data?.character_version || "";
      }
    }
    const charNames = avatars.map((av) => {
      const c = characters.find((ch) => ch.avatar === av);
      return c ? c.name : av;
    });
    const nameListHtml =
      avatars.length <= 5
        ? charNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : charNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${avatars.length} 个角色卡</div>`;

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">快速编辑角色卡</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>作者名 (Creator)</label>
            <input type="text" class="cfm-edit-input" id="cfm-edit-creator" value="${escapeHtml(defaultCreator)}" placeholder="${avatars.length > 1 ? "留空则不修改" : "输入作者名"}">
          </div>
          <div class="cfm-edit-popup-field">
            <label>版本名 (Version)</label>
            <input type="text" class="cfm-edit-input" id="cfm-edit-version" value="${escapeHtml(defaultVersion)}" placeholder="${avatars.length > 1 ? "留空则不修改" : "输入版本名"}">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-edit-creator").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const creator = overlay.find("#cfm-edit-creator").val().trim();
        const version = overlay.find("#cfm-edit-version").val().trim();
        overlay.remove();
        resolve({ creator, version });
      });
      // Enter键确认
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  // 执行角色卡编辑
  async function executeCharEdit(avatars) {
    const result = await showEditPopup(avatars);
    if (!result) return;
    const { creator, version } = result;
    const isBatch = avatars.length > 1;
    // 批量模式下，留空表示不修改
    if (isBatch && !creator && !version) {
      toastr.warning("请至少填写一个字段");
      return;
    }
    const characters = getContext().characters;
    const headers = getContext().getRequestHeaders();
    let success = 0;
    let fail = 0;
    toastr.info(`正在更新 ${avatars.length} 个角色卡...`);

    for (const avatar of avatars) {
      const char = characters.find((c) => c.avatar === avatar);
      if (!char) {
        fail++;
        continue;
      }
      const data = {
        avatar: char.avatar,
        data: {},
      };
      // 单个模式：直接用输入值（可以清空）；批量模式：留空不修改
      if (isBatch) {
        if (creator) data.data.creator = creator;
        if (version) data.data.character_version = version;
      } else {
        data.data.creator = creator;
        data.data.character_version = version;
      }
      try {
        const resp = await fetch("/api/characters/merge-attributes", {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        });
        if (resp.ok) {
          // 更新本地缓存
          if (!char.data) char.data = {};
          if (isBatch) {
            if (creator) char.data.creator = creator;
            if (version) char.data.character_version = version;
          } else {
            char.data.creator = creator;
            char.data.character_version = version;
          }
          success++;
        } else {
          fail++;
        }
      } catch (e) {
        console.warn(`[CFM] 编辑角色卡 ${avatar} 失败`, e);
        fail++;
      }
    }
    if (success > 0) {
      toastr.success(
        `已更新 ${success} 个角色卡${fail > 0 ? `，${fail} 个失败` : ""}`,
      );
    } else {
      toastr.error("更新失败");
    }
    rerenderCurrentView();
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
    $("#cfm-topbar-button .drawer-icon")
      .removeClass("closedIcon")
      .addClass("openIcon");
    // 每次打开主弹窗时检测新标签
    detectAndImportNewTags();
    config = loadConfig(); // 刷新配置
    // 重置资源类型为角色卡，确保与HTML模板中默认active标签一致
    currentResourceType = "chars";
    selectedTreeNode = null;
    expandedNodes.clear();
    selectedPresetFolder = null;
    selectedWorldInfoFolder = null;
    selectedThemeFolder = null;
    presetExpandedNodes.clear();
    worldInfoExpandedNodes.clear();
    themeExpandedNodes.clear();

    // 清除世界书缓存，确保每次打开弹窗都获取最新数据（与酒馆原生界面同步）
    _worldInfoNamesCache = null;
    // 预加载世界书数据，保存 Promise 以便切换标签时直接复用
    _worldInfoPreloadPromise = getWorldInfoNames();

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
                    <div class="cfm-tab" data-tab="themes"><i class="fa-solid fa-palette"></i> 美化</div>
                    <div class="cfm-tab" data-tab="backgrounds"><i class="fa-solid fa-panorama"></i> 背景</div>
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
                <div class="cfm-global-search-bar" id="cfm-theme-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-theme-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-theme-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-theme-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-theme-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="theme">主题</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-bg-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-bg-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-bg-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-bg-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-bg-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="bg">背景</option>
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
                            <button class="cfm-import-btn" id="cfm-import-char-btn" title="导入角色卡"><i class="fa-solid fa-file-import"></i></button>
                            <input type="file" id="cfm-import-char-file" multiple accept=".json,.png,.yaml,.yml,.charx,.byaf" style="display:none;">
                            <button class="cfm-edit-char-btn" id="cfm-edit-char-btn" title="快速编辑角色卡"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-export-btn" id="cfm-export-char-btn" title="导出角色卡"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-char-btn" title="删除角色卡"><i class="fa-solid fa-trash-can"></i></button>
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
                            <button class="cfm-import-btn" id="cfm-import-preset-btn" title="导入预设"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-preset-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-preset-rename-btn" title="重命名预设"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-preset-file" multiple accept=".json" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-preset-btn" title="导出预设"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-preset-btn" title="删除预设"><i class="fa-solid fa-trash-can"></i></button>
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
                                <button id="cfm-charbook-classify-btn" title="角色世界书归类"><i class="fa-solid fa-user-tag"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-worldinfo-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-worldinfo-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-worldinfo-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-worldinfo-btn" title="导入世界书"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-worldinfo-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-worldinfo-rename-btn" title="重命名世界书"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-worldinfo-file" multiple accept=".json,.png" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-worldinfo-btn" title="导出世界书"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-worldinfo-btn" title="删除世界书"><i class="fa-solid fa-trash-can"></i></button>
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
                <div class="cfm-dual-pane" id="cfm-themes-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <div class="cfm-sort-wrapper" id="cfm-theme-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-theme-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-theme-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-theme-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-theme-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-theme-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-theme-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-theme-btn" title="导入主题"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-theme-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-theme-rename-btn" title="重命名主题"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-theme-file" multiple accept=".json" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-theme-btn" title="导出主题"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-theme-btn" title="删除主题"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-theme-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-theme-right-sort-btn" title="主题排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-theme" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-theme-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-backgrounds-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <div class="cfm-sort-wrapper" id="cfm-bg-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-bg-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-bg-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-bg-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-bg-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-bg-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-bg-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-bg-btn" title="导入背景"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-bg-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-bg-rename-btn" title="重命名背景"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-bg-file" multiple accept="image/*" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-bg-btn" title="导出背景"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-bg-btn" title="删除背景"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-bg-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-bg-right-sort-btn" title="背景排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-bg" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-bg-right-list">
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
      // 切换标签时清空导出模式
      if (cfmExportMode) exitExportMode();
      if (cfmResDeleteMode) exitResDeleteMode();
      if (cfmThemeNoteMode) exitThemeNoteMode();
      if (cfmBgNoteMode) exitBgNoteMode();
      if (cfmPresetNoteMode) exitPresetNoteMode();
      if (cfmWorldInfoNoteMode) exitWorldInfoNoteMode();
      if (cfmPresetRenameMode) exitPresetRenameMode();
      if (cfmWorldInfoRenameMode) exitWorldInfoRenameMode();
      // 切换视图
      popup.find("#cfm-chars-view").toggle(tab === "chars");
      popup.find("#cfm-presets-view").toggle(tab === "presets");
      popup.find("#cfm-worldinfo-view").toggle(tab === "worldinfo");
      popup.find("#cfm-themes-view").toggle(tab === "themes");
      popup.find("#cfm-backgrounds-view").toggle(tab === "backgrounds");
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
      popup.find("#cfm-theme-search-bar").toggle(tab === "themes");
      popup.find("#cfm-bg-search-bar").toggle(tab === "backgrounds");
      if (tab === "presets") renderPresetsView();
      else if (tab === "worldinfo") renderWorldInfoView();
      else if (tab === "themes") renderThemesView();
      else if (tab === "backgrounds") renderBackgroundsView();
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

    // 角色世界书归类按钮
    popup.find("#cfm-charbook-classify-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCharBookClassifyPopup();
    });

    // 主题展开全部/收起全部
    popup.find("#cfm-theme-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("themes")) themeExpandedNodes.add(id);
      renderThemesView();
    });
    popup.find("#cfm-theme-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      themeExpandedNodes.clear();
      renderThemesView();
    });

    // 背景展开全部/收起全部
    popup.find("#cfm-bg-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("backgrounds")) bgExpandedNodes.add(id);
      renderBackgroundsView();
    });
    popup.find("#cfm-bg-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      bgExpandedNodes.clear();
      renderBackgroundsView();
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
    // 主题左栏排序
    popup.find("#cfm-theme-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-theme-left-sort-wrapper");
      const topFolders = getResTopLevelFolders("themes");
      $(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        "themes",
        themeLeftSortMode,
        themeSortSnapshot,
        (mode) => {
          if (mode === "revert") {
            revertResSort("themes");
            themeLeftSortMode = null;
          } else {
            applyResSortToFolders("themes", topFolders, mode);
            themeLeftSortMode = mode;
          }
          renderThemesView();
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
    // 主题右栏排序
    popup.find("#cfm-theme-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-theme-right-sort-wrapper");
      const currentFolder = selectedThemeFolder;
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? getResChildFolders("themes", currentFolder)
          : [];
      $(".cfm-sort-dropdown").remove();
      const dropdown = $(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${themeRightSortMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 主题 A → Z</div>
          <div class="cfm-sort-dropdown-item ${themeRightSortMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 主题 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${themeRightSortMode === null && !themeSortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        themeRightSortMode = "az";
        renderThemesView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        themeRightSortMode = "za";
        renderThemesView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("themes", childFolders, "az");
          toastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          renderThemesView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("themes", childFolders, "za");
          toastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          renderThemesView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (themeRightSortMode === null && !themeSortSnapshot) return;
        themeRightSortMode = null;
        if (themeSortSnapshot) {
          revertResSort("themes");
          toastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        renderThemesView();
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

    // 背景左栏排序
    popup.find("#cfm-bg-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-bg-left-sort-wrapper");
      const topFolders = getResTopLevelFolders("backgrounds");
      $(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        "backgrounds",
        bgLeftSortMode,
        bgSortSnapshot,
        (mode) => {
          if (mode === "revert") {
            revertResSort("backgrounds");
            bgLeftSortMode = null;
          } else {
            applyResSortToFolders("backgrounds", topFolders, mode);
            bgLeftSortMode = mode;
          }
          renderBackgroundsView();
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
    // 背景右栏排序
    popup.find("#cfm-bg-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = $("#cfm-bg-right-sort-wrapper");
      const currentFolder = selectedBgFolder;
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? getResChildFolders("backgrounds", currentFolder)
          : [];
      $(".cfm-sort-dropdown").remove();
      const dropdown = $(`<div class="cfm-sort-dropdown cfm-sort-open">
        <div class="cfm-sort-dropdown-item ${bgRightSortMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 背景 A → Z</div>
        <div class="cfm-sort-dropdown-item ${bgRightSortMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 背景 Z → A</div>
        ${childFolders.length > 0 ? `<div class="cfm-sort-dropdown-sep"></div><div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div><div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>` : ""}
        <div class="cfm-sort-dropdown-sep"></div>
        <div class="cfm-sort-dropdown-item ${bgRightSortMode === null && !bgSortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
      </div>`);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        bgRightSortMode = "az";
        renderBackgroundsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        bgRightSortMode = "za";
        renderBackgroundsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("backgrounds", childFolders, "az");
          toastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          renderBackgroundsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          applyResSortToFolders("backgrounds", childFolders, "za");
          toastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          renderBackgroundsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (bgRightSortMode === null && !bgSortSnapshot) return;
        bgRightSortMode = null;
        if (bgSortSnapshot) {
          revertResSort("backgrounds");
          toastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        renderBackgroundsView();
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
      // 导出/删除/重命名模式下不允许切换多选
      if (
        cfmExportMode ||
        cfmResDeleteMode ||
        cfmPresetRenameMode ||
        cfmWorldInfoRenameMode
      )
        return;
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
      else if (currentResourceType === "themes") renderThemesView();
      else renderWorldInfoView();
    });

    // ==================== 导出资源功能 ====================
    popup.find(".cfm-export-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmExportMode) {
        // 已在导出模式，执行导出
        executeResourceExport();
      } else {
        // 进入导出模式
        enterExportMode();
      }
    });

    // ==================== 删除资源功能 ====================
    popup.find(".cfm-res-delete-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmResDeleteMode) {
        executeResourceDelete();
      } else {
        enterResDeleteMode();
      }
    });

    // ==================== 角色卡快速编辑功能 ====================
    popup.find("#cfm-edit-char-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmEditMode) {
        // 已在编辑模式，执行编辑
        if (cfmEditSelected.size === 0) {
          toastr.warning("请先选择要编辑的角色卡");
          return;
        }
        const avatars = Array.from(cfmEditSelected);
        executeCharEdit(avatars).then(() => exitEditMode());
      } else {
        // 进入编辑模式
        enterEditMode();
      }
    });

    // ==================== 导入资源功能 ====================
    // 角色卡导入按钮
    popup.find("#cfm-import-char-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-import-char-file").val("").trigger("click");
    });

    popup.find("#cfm-import-char-file").on("change", async function (e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      // 如果选中了普通文件夹则放入该文件夹，否则放入未归类
      const targetFolder =
        selectedTreeNode &&
        selectedTreeNode !== "__uncategorized__" &&
        selectedTreeNode !== "__favorites__"
          ? selectedTreeNode
          : null;

      const totalFiles = files.length;
      let successCount = 0;
      let failCount = 0;
      const importedAvatars = [];

      toastr.info(`正在导入 ${totalFiles} 个角色卡...`);

      for (const file of files) {
        const ext = file.name.match(/\.(\w+)$/);
        if (
          !ext ||
          !["json", "png", "yaml", "yml", "charx", "byaf"].includes(
            ext[1].toLowerCase(),
          )
        ) {
          toastr.warning(`跳过不支持的文件: ${file.name}`);
          failCount++;
          continue;
        }

        const format = ext[1].toLowerCase();
        const formData = new FormData();
        formData.append("avatar", file);
        formData.append("file_type", format);
        formData.append("user_name", getContext().name1 || "User");

        try {
          const result = await fetch("/api/characters/import", {
            method: "POST",
            body: formData,
            headers: getContext().getRequestHeaders({ omitContentType: true }),
            cache: "no-cache",
          });

          if (!result.ok) {
            throw new Error(`导入失败: ${result.statusText}`);
          }

          const data = await result.json();
          if (data.error) {
            throw new Error(data.error);
          }

          if (data.file_name !== undefined) {
            const avatarFileName = `${data.file_name}.png`;
            importedAvatars.push(avatarFileName);
            successCount++;
          }
        } catch (error) {
          console.error(`导入角色失败: ${file.name}`, error);
          failCount++;
        }
      }

      // 刷新角色列表
      await getContext().getCharacters();

      // 将导入的角色分配到当前文件夹（如果有选中文件夹）
      if (targetFolder) {
        for (const avatar of importedAvatars) {
          moveCharToFolder(avatar, targetFolder);
        }
      }

      // 自动处理导入角色卡的内嵌世界书
      const charBookSetting =
        extension_settings[extensionName].autoCharBookFolder;
      if (charBookSetting) {
        let embImported = 0;
        const characters = getCharacters();
        for (const avatar of importedAvatars) {
          const ch = characters.find((c) => c.avatar === avatar);
          if (!ch?.data?.character_book) continue;
          try {
            const bookName =
              ch.data.character_book.name || `${ch.name}'s Lorebook`;
            const characterBook = ch.data.character_book;
            const formData = new FormData();
            const blob = new Blob([JSON.stringify(characterBook)], {
              type: "application/json",
            });
            formData.append(
              "avatar",
              new File([blob], bookName + ".json", {
                type: "application/json",
              }),
            );
            formData.append("convertedData", JSON.stringify(characterBook));
            const result = await fetch("/api/worldinfo/import", {
              method: "POST",
              headers: getContext().getRequestHeaders({
                omitContentType: true,
              }),
              body: formData,
              cache: "no-cache",
            });
            if (result.ok) {
              const data = await result.json();
              if (data.name) {
                setItemGroup("worldinfo", data.name, charBookSetting);
                embImported++;
              }
            }
          } catch (err) {
            console.error("[CFM] 自动提取内嵌世界书失败:", avatar, err);
          }
        }
        if (embImported > 0) {
          _worldInfoNamesCache = null;
          toastr.info(`自动提取了 ${embImported} 个内嵌世界书`, "角色世界书");
        }
      }

      // 刷新视图
      renderLeftTree();
      renderRightPane();

      const folderHint = targetFolder
        ? `到「${getTagName(targetFolder)}」`
        : "（未归类）";
      if (successCount > 0) {
        toastr.success(
          `成功导入 ${successCount} 个角色卡${folderHint}${failCount > 0 ? `，${failCount} 个失败` : ""}`,
        );
      } else if (failCount > 0) {
        toastr.error(`导入失败，${failCount} 个文件无法导入`);
      }

      e.target.value = null;
    });

    // 预设导入按钮
    popup.find("#cfm-import-preset-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-import-preset-file").val("").trigger("click");
    });

    popup.find("#cfm-import-preset-file").on("change", async function (e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const targetFolder =
        selectedPresetFolder &&
        selectedPresetFolder !== "__ungrouped__" &&
        selectedPresetFolder !== "__favorites__"
          ? selectedPresetFolder
          : null;

      const pm = getContext().getPresetManager();
      if (!pm) {
        toastr.error("无法获取预设管理器，请确认已选择API");
        return;
      }

      // 获取现有预设名称集合
      const existingPresets = new Set(getCurrentPresets().map((p) => p.name));

      // 预解析所有文件，提取名称用于重名检测
      const parsedFiles = [];
      for (const file of files) {
        if (!file.name.endsWith(".json")) continue;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const fileName = file.name
            .replace(".json", "")
            .replace(".settings", "");
          const name = data?.name ?? fileName;
          data["name"] = name;
          parsedFiles.push({ file, data, name });
        } catch (err) {
          console.error(`解析预设文件失败: ${file.name}`, err);
        }
      }

      if (parsedFiles.length === 0) {
        toastr.warning("没有可导入的有效预设文件");
        e.target.value = null;
        return;
      }

      // 检测重名
      const duplicateNames = parsedFiles
        .filter((f) => existingPresets.has(f.name))
        .map((f) => f.name);
      let dupAction = null;
      if (duplicateNames.length > 0) {
        dupAction = await showDuplicateImportDialog(
          duplicateNames,
          parsedFiles.length,
          "预设",
        );
        if (dupAction === "cancel") {
          toastr.info("已取消导入");
          e.target.value = null;
          return;
        }
      }

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (const { file, data, name } of parsedFiles) {
        try {
          const isDuplicate = existingPresets.has(name);
          let finalName = name;

          if (isDuplicate) {
            if (dupAction === "skip") {
              skipCount++;
              continue;
            } else if (dupAction === "rename") {
              finalName = getUniqueImportName(name, existingPresets);
              data["name"] = finalName;
            }
            // 'overwrite' 时直接用原名覆盖
          }

          await pm.savePreset(finalName, data);
          existingPresets.add(finalName);

          if (targetFolder) {
            setItemGroup("presets", finalName, targetFolder);
          }
          successCount++;
        } catch (error) {
          console.error(`导入预设失败: ${file.name}`, error);
          failCount++;
        }
      }

      // 刷新视图
      renderPresetsView();

      const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
      const parts = [];
      if (successCount > 0)
        parts.push(`成功导入 ${successCount} 个预设${folderHint}`);
      if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
      if (failCount > 0) parts.push(`${failCount} 个失败`);
      if (successCount > 0) {
        toastr.success(parts.join("，"));
      } else if (skipCount > 0 && failCount === 0) {
        toastr.info(parts.join("，"));
      } else if (failCount > 0) {
        toastr.error(parts.join("，"));
      }

      e.target.value = null;
    });

    // 主题备注编辑按钮
    popup.find("#cfm-theme-note-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmThemeNoteMode) {
        if (cfmThemeNoteSelected.size === 0) {
          toastr.warning("请先选择要编辑备注的主题");
          return;
        }
        const names = Array.from(cfmThemeNoteSelected);
        executeThemeNoteEdit(names).then(() => exitThemeNoteMode());
      } else {
        enterThemeNoteMode();
      }
    });

    // 背景备注编辑按钮
    popup.find("#cfm-bg-note-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmBgNoteMode) {
        if (cfmBgNoteSelected.size === 0) {
          toastr.warning("请先选择要编辑备注的背景");
          return;
        }
        const names = Array.from(cfmBgNoteSelected);
        executeBgNoteEdit(names).then(() => exitBgNoteMode());
      } else {
        enterBgNoteMode();
      }
    });

    // 预设备注编辑按钮
    popup.find("#cfm-preset-note-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmPresetNoteMode) {
        if (cfmPresetNoteSelected.size === 0) {
          toastr.warning("请先选择要编辑备注的预设");
          return;
        }
        const names = Array.from(cfmPresetNoteSelected);
        executePresetNoteEdit(names).then(() => exitPresetNoteMode());
      } else {
        enterPresetNoteMode();
      }
    });

    // 世界书备注编辑按钮
    popup.find("#cfm-worldinfo-note-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmWorldInfoNoteMode) {
        if (cfmWorldInfoNoteSelected.size === 0) {
          toastr.warning("请先选择要编辑备注的世界书");
          return;
        }
        const names = Array.from(cfmWorldInfoNoteSelected);
        executeWorldInfoNoteEdit(names).then(() => exitWorldInfoNoteMode());
      } else {
        enterWorldInfoNoteMode();
      }
    });

    // 预设重命名按钮
    popup.find("#cfm-preset-rename-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmPresetRenameMode) {
        if (cfmPresetRenameSelected.size === 0) {
          toastr.warning("请先选择要重命名的预设");
          return;
        }
        const names = Array.from(cfmPresetRenameSelected);
        executePresetRename(names).then(() => exitPresetRenameMode());
      } else {
        enterPresetRenameMode();
      }
    });

    // 世界书重命名按钮
    popup.find("#cfm-worldinfo-rename-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmWorldInfoRenameMode) {
        if (cfmWorldInfoRenameSelected.size === 0) {
          toastr.warning("请先选择要重命名的世界书");
          return;
        }
        const names = Array.from(cfmWorldInfoRenameSelected);
        executeWorldInfoRename(names).then(() => exitWorldInfoRenameMode());
      } else {
        enterWorldInfoRenameMode();
      }
    });

    // 主题重命名按钮
    popup.find("#cfm-theme-rename-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmThemeRenameMode) {
        if (cfmThemeRenameSelected.size === 0) {
          toastr.warning("请先选择要重命名的主题");
          return;
        }
        const names = Array.from(cfmThemeRenameSelected);
        executeThemeRename(names).then(() => exitThemeRenameMode());
      } else {
        enterThemeRenameMode();
      }
    });

    // 背景重命名按钮
    popup.find("#cfm-bg-rename-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (cfmBgRenameMode) {
        if (cfmBgRenameSelected.size === 0) {
          toastr.warning("请先选择要重命名的背景");
          return;
        }
        const names = Array.from(cfmBgRenameSelected);
        executeBgRename(names).then(() => exitBgRenameMode());
      } else {
        enterBgRenameMode();
      }
    });

    // 主题导入按钮
    popup.find("#cfm-import-theme-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-import-theme-file").val("").trigger("click");
    });

    popup.find("#cfm-import-theme-file").on("change", async function (e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const targetFolder =
        selectedThemeFolder &&
        selectedThemeFolder !== "__ungrouped__" &&
        selectedThemeFolder !== "__favorites__"
          ? selectedThemeFolder
          : null;

      const headers = getContext().getRequestHeaders();

      // 获取现有主题名称集合
      const existingThemes = new Set(getThemeNames());

      // 预解析所有文件
      const parsedFiles = [];
      for (const file of files) {
        if (!file.name.endsWith(".json")) continue;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const fileName = file.name.replace(".json", "");
          const name = data?.name ?? fileName;
          data["name"] = name;
          parsedFiles.push({ file, data, name });
        } catch (err) {
          console.error(`解析主题文件失败: ${file.name}`, err);
        }
      }

      if (parsedFiles.length === 0) {
        toastr.warning("没有可导入的有效主题文件");
        e.target.value = null;
        return;
      }

      // 检测重名
      const duplicateNames = parsedFiles
        .filter((f) => existingThemes.has(f.name))
        .map((f) => f.name);
      let dupAction = null;
      if (duplicateNames.length > 0) {
        dupAction = await showDuplicateImportDialog(
          duplicateNames,
          parsedFiles.length,
          "主题",
        );
        if (dupAction === "cancel") {
          toastr.info("已取消导入");
          e.target.value = null;
          return;
        }
      }

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (const { file, data, name } of parsedFiles) {
        try {
          const isDuplicate = existingThemes.has(name);
          let finalName = name;

          if (isDuplicate) {
            if (dupAction === "skip") {
              skipCount++;
              continue;
            } else if (dupAction === "rename") {
              finalName = getUniqueImportName(name, existingThemes);
              data["name"] = finalName;
            }
            // 'overwrite' 时直接用原名覆盖
          }

          // 通过 /api/themes/save 保存主题
          const resp = await fetch("/api/themes/save", {
            method: "POST",
            headers,
            body: JSON.stringify(data),
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

          existingThemes.add(finalName);

          // 更新 #themes 下拉列表
          const themeSelect = $("#themes");
          if (
            themeSelect.length &&
            !themeSelect.find(`option[value="${finalName}"]`).length
          ) {
            themeSelect.append(
              `<option value="${finalName}">${finalName}</option>`,
            );
          }

          if (targetFolder) {
            setItemGroup("themes", finalName, targetFolder);
          }
          successCount++;
        } catch (error) {
          console.error(`导入主题失败: ${file.name}`, error);
          failCount++;
        }
      }

      // 刷新视图
      renderThemesView();

      const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
      const parts = [];
      if (successCount > 0)
        parts.push(`成功导入 ${successCount} 个主题${folderHint}`);
      if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
      if (failCount > 0) parts.push(`${failCount} 个失败`);
      if (successCount > 0) {
        toastr.success(parts.join("，"));
      } else if (skipCount > 0 && failCount === 0) {
        toastr.info(parts.join("，"));
      } else if (failCount > 0) {
        toastr.error(parts.join("，"));
      }

      e.target.value = null;
    });

    // 背景导入按钮
    popup.find("#cfm-import-bg-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-import-bg-file").val("").trigger("click");
    });

    popup.find("#cfm-import-bg-file").on("change", async function (e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const targetFolder =
        selectedBgFolder &&
        selectedBgFolder !== "__ungrouped__" &&
        selectedBgFolder !== "__favorites__"
          ? selectedBgFolder
          : null;

      const headers = getContext().getRequestHeaders();
      delete headers["Content-Type"];

      // 获取现有背景名称集合
      const existingBgs = new Set(getBackgroundNames());

      // 过滤有效图片文件
      const imageFiles = [];
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) {
        toastr.warning("没有可导入的有效图片文件");
        e.target.value = null;
        return;
      }

      // 检测重名
      const duplicateNames = imageFiles
        .filter((f) => existingBgs.has(f.name))
        .map((f) => f.name);
      let dupAction = null;
      if (duplicateNames.length > 0) {
        dupAction = await showDuplicateImportDialog(
          duplicateNames,
          imageFiles.length,
          "背景",
        );
        if (dupAction === "cancel") {
          toastr.info("已取消导入");
          e.target.value = null;
          return;
        }
      }

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (const file of imageFiles) {
        try {
          const isDuplicate = existingBgs.has(file.name);
          let finalName = file.name;

          if (isDuplicate) {
            if (dupAction === "skip") {
              skipCount++;
              continue;
            } else if (dupAction === "rename") {
              const ext =
                file.name.lastIndexOf(".") !== -1
                  ? file.name.slice(file.name.lastIndexOf("."))
                  : "";
              const base = ext ? file.name.slice(0, -ext.length) : file.name;
              finalName = getUniqueImportName(base, existingBgs) + ext;
            }
            // 'overwrite' 时直接用原名覆盖
          }

          const formData = new FormData();
          if (finalName !== file.name) {
            const renamedFile = new File([file], finalName, {
              type: file.type,
            });
            formData.append("avatar", renamedFile);
          } else {
            formData.append("avatar", file);
          }

          const resp = await fetch("/api/backgrounds/upload", {
            method: "POST",
            headers,
            body: formData,
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

          existingBgs.add(finalName);

          if (targetFolder) {
            setItemGroup("backgrounds", finalName, targetFolder);
          }
          successCount++;
        } catch (error) {
          console.error(`导入背景失败: ${file.name}`, error);
          failCount++;
        }
      }

      // 刷新酒馆原生背景列表（等待 DOM 完全更新后再渲染分类视图）
      try {
        const bgModule = await import("../../../backgrounds.js");
        if (typeof bgModule.getBackgrounds === "function") {
          await bgModule.getBackgrounds();
        }
      } catch (err) {
        console.warn("[CFM] 刷新背景列表失败，尝试备用方案", err);
        // 备用方案：手动获取并重建 DOM
        try {
          const bgResp = await fetch("/api/backgrounds/all", {
            method: "POST",
            headers: getContext().getRequestHeaders(),
            body: JSON.stringify({}),
          });
          if (bgResp.ok) {
            const { images } = await bgResp.json();
            const container = $("#bg_menu_content");
            container.empty();
            const template = $("#background_template .bg_example");
            if (template.length && images) {
              images.forEach((bg) => {
                const thumb = template.clone();
                thumb.attr("bgfile", bg);
                thumb.attr("title", bg);
                container.append(thumb);
              });
            }
          }
        } catch (err2) {
          console.warn("[CFM] 备用刷新也失败", err2);
        }
      }

      // 原生 DOM 已更新，安全刷新分类视图
      renderBackgroundsView();

      const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
      const parts = [];
      if (successCount > 0)
        parts.push(`成功导入 ${successCount} 个背景${folderHint}`);
      if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
      if (failCount > 0) parts.push(`${failCount} 个失败`);
      if (successCount > 0) {
        toastr.success(parts.join("，"));
      } else if (skipCount > 0 && failCount === 0) {
        toastr.info(parts.join("，"));
      } else if (failCount > 0) {
        toastr.error(parts.join("，"));
      }

      e.target.value = null;
    });

    // 世界书导入按钮
    popup.find("#cfm-import-worldinfo-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-import-worldinfo-file").val("").trigger("click");
    });

    popup.find("#cfm-import-worldinfo-file").on("change", async function (e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const targetFolder =
        selectedWorldInfoFolder &&
        selectedWorldInfoFolder !== "__ungrouped__" &&
        selectedWorldInfoFolder !== "__favorites__"
          ? selectedWorldInfoFolder
          : null;

      // 获取现有世界书名称集合
      const existingWI = new Set(await getWorldInfoNames(true));

      // 预处理文件，提取世界书名称用于重名检测
      const validFiles = [];
      for (const file of files) {
        const ext = file.name.match(/\.(\w+)$/);
        if (!ext || !["json", "png"].includes(ext[1].toLowerCase())) continue;
        const worldName = file.name.substr(0, file.name.lastIndexOf("."));
        validFiles.push({ file, worldName });
      }

      if (validFiles.length === 0) {
        toastr.warning("没有可导入的有效世界书文件");
        e.target.value = null;
        return;
      }

      // 检测重名
      const duplicateNames = validFiles
        .filter((f) => existingWI.has(f.worldName))
        .map((f) => f.worldName);
      let dupAction = null;
      if (duplicateNames.length > 0) {
        dupAction = await showDuplicateImportDialog(
          duplicateNames,
          validFiles.length,
          "世界书",
        );
        if (dupAction === "cancel") {
          toastr.info("已取消导入");
          e.target.value = null;
          return;
        }
      }

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (const { file, worldName } of validFiles) {
        const isDuplicate = existingWI.has(worldName);

        if (isDuplicate && dupAction === "skip") {
          skipCount++;
          continue;
        }

        try {
          // 覆盖模式：先删除旧的世界书
          if (isDuplicate && dupAction === "overwrite") {
            await fetch("/api/worldinfo/delete", {
              method: "POST",
              headers: getContext().getRequestHeaders(),
              body: JSON.stringify({ name: worldName }),
            });
          }

          // 重命名模式：创建新文件名
          let importFile = file;
          let finalName = worldName;
          if (isDuplicate && dupAction === "rename") {
            finalName = getUniqueImportName(worldName, existingWI);
            const fileExt = file.name.substr(file.name.lastIndexOf("."));
            importFile = new File([file], finalName + fileExt, {
              type: file.type,
            });
          }

          const formData = new FormData();
          formData.append("avatar", importFile);

          // 处理不同格式的世界书数据
          if (file.name.endsWith(".json")) {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            if (jsonData.lorebookVersion !== undefined) {
              formData.append("convertedData", JSON.stringify(jsonData));
            }
            if (jsonData.kind === "memory") {
              formData.append("convertedData", JSON.stringify(jsonData));
            }
            if (jsonData.type === "risu") {
              formData.append("convertedData", JSON.stringify(jsonData));
            }
          }

          const result = await fetch("/api/worldinfo/import", {
            method: "POST",
            headers: getContext().getRequestHeaders({ omitContentType: true }),
            body: formData,
            cache: "no-cache",
          });

          if (!result.ok) {
            throw new Error(`导入失败: ${result.statusText}`);
          }

          const data = await result.json();

          if (data.name) {
            existingWI.add(data.name);
            if (targetFolder) {
              setItemGroup("worldinfo", data.name, targetFolder);
            }
            successCount++;
          } else {
            throw new Error("服务器未返回世界书名称");
          }
        } catch (error) {
          console.error(`导入世界书失败: ${file.name}`, error);
          failCount++;
        }
      }

      // 调用SillyTavern原生的updateWorldInfoList来同步world_names变量和DOM
      try {
        const ctx = getContext();
        if (typeof ctx.updateWorldInfoList === "function") {
          await ctx.updateWorldInfoList();
        }
      } catch (updateErr) {
        console.warn("[CFM] 调用updateWorldInfoList失败", updateErr);
      }

      // 刷新插件内部的世界书名称缓存
      _worldInfoNamesCache = null;
      await getWorldInfoNames(true);

      // 刷新视图
      await renderWorldInfoView();

      const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
      const parts = [];
      if (successCount > 0)
        parts.push(`成功导入 ${successCount} 个世界书${folderHint}`);
      if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
      if (failCount > 0) parts.push(`${failCount} 个失败`);
      if (successCount > 0) {
        toastr.success(parts.join("，"));
      } else if (skipCount > 0 && failCount === 0) {
        toastr.info(parts.join("，"));
      } else if (failCount > 0) {
        toastr.error(parts.join("，"));
      }

      e.target.value = null;
    });

    // 重置排序状态
    sortDirty = false;
    sortSnapshot = null;
    rightCharSortMode = null;
    // 重置多选状态
    cfmMultiSelectMode = false;
    clearMultiSelect();
    cfmMultiSelectRangeMode = false;
    // 重置导出模式
    cfmExportMode = false;
    cfmExportSelected.clear();
    cfmExportRangeMode = false;
    cfmExportLastClicked = null;
    // 重置删除模式
    cfmResDeleteMode = false;
    cfmResDeleteSelected.clear();
    cfmResDeleteRangeMode = false;
    cfmResDeleteLastClicked = null;

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

    // 主题搜索框事件绑定
    popup.find("#cfm-theme-global-search").on("input", function () {
      const hasText = $(this).val().trim().length > 0;
      $(this)
        .closest(".cfm-search-input-wrapper")
        .toggleClass("cfm-has-text", hasText);
      executeThemeSearch();
    });
    popup.find("#cfm-theme-search-clear").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-theme-global-search").val("").focus();
      $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
      renderThemesView();
    });
    // 背景搜索框事件绑定
    popup.find("#cfm-bg-global-search").on("input", function () {
      const hasText = $(this).val().trim().length > 0;
      $(this)
        .closest(".cfm-search-input-wrapper")
        .toggleClass("cfm-has-text", hasText);
      executeBgSearch();
    });
    popup.find("#cfm-bg-search-clear").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-bg-global-search").val("").focus();
      $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
      renderBackgroundsView();
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

      // 删除工具栏（搜索角色卡）
      prependResDeleteToolbar(list, renderRightPane);
      // 导出工具栏（搜索角色卡）
      prependExportToolbar(list, renderRightPane);
      // 编辑工具栏（搜索角色卡）
      prependEditToolbar(list, renderRightPane);
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
      const matched = searchPool.filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true;
        const note = getPresetNote(p.name);
        if (note && note.toLowerCase().includes(q)) return true;
        return false;
      });
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
        const isExpSel = cfmExportMode && cfmExportSelected.has(p.name);
        const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(p.name);
        const isNoteSel =
          cfmPresetNoteMode && cfmPresetNoteSelected.has(p.name);
        const isRenameSel =
          cfmPresetRenameMode && cfmPresetRenameSelected.has(p.name);
        const msCheckHtml = cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : cfmPresetNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : cfmPresetRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : cfmMultiSelectMode
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
        const presetNote = getPresetNote(p.name);
        const noteHtml = presetNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(presetNote)}">${escapeHtml(presetNote)}</span>`
          : "";
        const noModeActive =
          !cfmExportMode &&
          !cfmResDeleteMode &&
          !cfmPresetNoteMode &&
          !cfmPresetRenameMode &&
          !cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        // 如果在备注或重命名模式，替换 msCheckHtml
        const finalCheckHtml = cfmPresetNoteMode
          ? msCheckHtml ||
            `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
          : cfmPresetRenameMode
            ? msCheckHtml ||
              `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
            : msCheckHtml;
        const row = $(`
          <div class="cfm-row cfm-row-char cfm-search-result ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(p.name)}">
            ${finalCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-file-lines" style="font-size:20px;color:#8b9dfc;"></i></div>
            <div class="cfm-row-name"><span class="cfm-preset-name-text">${escapeHtml(p.name)}</span>${noteHtml}${pFolderPath ? `<div class="cfm-row-folder-path">${escapeHtml(pFolderPath)}</div>` : ""}</div>
            ${singleRenameBtn}
            ${singleNoteBtn}
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
        // 单个备注编辑按钮
        row.find(".cfm-row-note-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executePresetNoteEdit([p.name]);
        });
        // 单个重命名按钮
        row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executePresetRename([p.name]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
            ).length
          )
            return;
          if (cfmResDeleteMode) {
            toggleResDeleteItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmPresetNoteMode) {
            togglePresetNoteItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
          if (cfmPresetRenameMode) {
            togglePresetRenameItem(p.name, e.shiftKey);
            executePresetSearch();
            return;
          }
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

      // 删除工具栏（搜索预设）
      prependResDeleteToolbar(rightList, executePresetSearch);
      // 导出工具栏（搜索预设）
      prependExportToolbar(rightList, executePresetSearch);
      // 备注编辑工具栏（搜索预设）
      prependPresetNoteToolbar(rightList, executePresetSearch);
      // 重命名工具栏（搜索预设）
      prependPresetRenameToolbar(rightList, executePresetSearch);
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
        const matched = searchPool.filter((n) => {
          if (n.toLowerCase().includes(q)) return true;
          const note = getWorldInfoNote(n);
          if (note && note.toLowerCase().includes(q)) return true;
          return false;
        });
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
          const isExpSel = cfmExportMode && cfmExportSelected.has(n);
          const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(n);
          const isNoteSel =
            cfmWorldInfoNoteMode && cfmWorldInfoNoteSelected.has(n);
          const isRenameSel =
            cfmWorldInfoRenameMode && cfmWorldInfoRenameSelected.has(n);
          const msCheckHtml = cfmResDeleteMode
            ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
            : cfmExportMode
              ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
              : cfmWorldInfoNoteMode
                ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
                : cfmWorldInfoRenameMode
                  ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                  : cfmMultiSelectMode
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
          const wiNote = getWorldInfoNote(n);
          const noteHtml = wiNote
            ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(wiNote)}">${escapeHtml(wiNote)}</span>`
            : "";
          const noModeActive =
            !cfmExportMode &&
            !cfmResDeleteMode &&
            !cfmWorldInfoNoteMode &&
            !cfmWorldInfoRenameMode &&
            !cfmMultiSelectMode;
          const singleNoteBtn = noModeActive
            ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
            : "";
          const singleRenameBtn = noModeActive
            ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
            : "";
          const row = $(`
            <div class="cfm-row cfm-row-char cfm-search-result ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}">
              ${msCheckHtml}
              <div class="cfm-row-icon"><i class="fa-solid fa-book" style="font-size:20px;color:#a6e3a1;"></i></div>
              <div class="cfm-row-name"><span class="cfm-worldinfo-name-text">${escapeHtml(n)}</span>${noteHtml}${wFolderPath ? `<div class="cfm-row-folder-path">${escapeHtml(wFolderPath)}</div>` : ""}</div>
              ${singleRenameBtn}
              ${singleNoteBtn}
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
          // 单个备注编辑按钮
          row.find(".cfm-row-note-btn").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            executeWorldInfoNoteEdit([n]);
          });
          // 单个重命名按钮
          row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            executeWorldInfoRename([n]);
          });
          row.on("click", (e) => {
            if (
              $(e.target).closest(
                ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
              ).length
            )
              return;
            if (cfmResDeleteMode) {
              toggleResDeleteItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmExportMode) {
              toggleExportItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmWorldInfoNoteMode) {
              toggleWorldInfoNoteItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
            if (cfmWorldInfoRenameMode) {
              toggleWorldInfoRenameItem(n, e.shiftKey);
              executeWorldInfoSearch();
              return;
            }
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

        // 删除工具栏（搜索世界书）
        prependResDeleteToolbar(rightList, executeWorldInfoSearch);
        // 导出工具栏（搜索世界书）
        prependExportToolbar(rightList, executeWorldInfoSearch);
        // 备注编辑工具栏（搜索世界书）
        prependWorldInfoNoteToolbar(rightList, executeWorldInfoSearch);
        // 重命名工具栏（搜索世界书）
        prependWorldInfoRenameToolbar(rightList, executeWorldInfoSearch);
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

  // ==================== 主题全局搜索 ====================
  function executeThemeSearch() {
    const q = $("#cfm-theme-global-search").val().toLowerCase().trim();
    if (!q) {
      renderThemesView();
      return;
    }

    const rightList = $("#cfm-theme-right-list");
    const pathEl = $("#cfm-theme-rh-path");
    const countEl = $("#cfm-theme-rh-count");

    const themeNames = getThemeNames();
    const groups = getResourceGroups("themes");
    const folders = getResourceFolders("themes");

    // 主题搜索（简化版，只搜索主题名称）
    let searchPool = themeNames;
    if (selectedThemeFolder) {
      if (selectedThemeFolder === "__ungrouped__") {
        searchPool = themeNames.filter(
          (n) => !groups[n] || !folders.includes(groups[n]),
        );
      } else if (selectedThemeFolder === "__favorites__") {
        const favs = getResFavorites("themes");
        searchPool = themeNames.filter((n) => favs.includes(n));
      } else if (folders.includes(selectedThemeFolder)) {
        const collectFolderIds = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("themes", pid))
            r = r.concat(collectFolderIds(c));
          return r;
        };
        const allFids = collectFolderIds(selectedThemeFolder);
        searchPool = themeNames.filter((n) => allFids.includes(groups[n]));
      }
    }
    const matched = searchPool.filter((n) => {
      if (n.toLowerCase().includes(q)) return true;
      const note = getThemeNote(n);
      if (note && note.toLowerCase().includes(q)) return true;
      return false;
    });
    rightList.empty();
    pathEl.text(`搜索主题: "${q}"`);
    countEl.text(`${matched.length} 个结果`);
    if (matched.length === 0) {
      rightList.html('<div class="cfm-right-empty">未找到匹配的主题</div>');
      return;
    }
    const currentThemeName =
      typeof power_user !== "undefined" ? power_user.theme : null;
    for (const name of matched) {
      const isActive = name === currentThemeName;
      const fav = isResFavorite("themes", name);
      const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(name);
      const isExpSel = cfmExportMode && cfmExportSelected.has(name);
      const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(name);
      const msCheckHtml = cfmResDeleteMode
        ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
        : cfmExportMode
          ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
          : cfmMultiSelectMode
            ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
            : "";
      const tFolderPath = (() => {
        const grp = groups[name];
        if (grp && getResFolderTree("themes")[grp])
          return getResFolderPath("themes", grp)
            .map((id) => getResFolderDisplayName("themes", id))
            .join(" › ");
        return "未归类";
      })();
      const themeNote = getThemeNote(name);
      const noteHtml = themeNote
        ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(themeNote)}">${escapeHtml(themeNote)}</span>`
        : "";
      const noModeActive =
        !cfmExportMode &&
        !cfmResDeleteMode &&
        !cfmThemeNoteMode &&
        !cfmThemeRenameMode &&
        !cfmMultiSelectMode;
      const singleNoteBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
      const singleRenameBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
        : "";
      const isNoteSel = cfmThemeNoteMode && cfmThemeNoteSelected.has(name);
      const isRenameSel =
        cfmThemeRenameMode && cfmThemeRenameSelected.has(name);
      const noteCheckHtml = cfmThemeNoteMode
        ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
        : "";
      const renameCheckHtml = cfmThemeRenameMode
        ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
        : "";
      // 如果在备注/重命名模式，替换 msCheckHtml
      const finalCheckHtml = cfmThemeNoteMode
        ? noteCheckHtml
        : cfmThemeRenameMode
          ? renameCheckHtml
          : msCheckHtml;
      const row = $(`
        <div class="cfm-row cfm-row-char cfm-search-result ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">
          ${finalCheckHtml}
          <div class="cfm-row-icon"><i class="fa-solid fa-palette" style="font-size:20px;color:#cba6f7;"></i></div>
          <div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(name)}</span>${noteHtml}<div class="cfm-row-folder-path">${escapeHtml(tFolderPath)}</div></div>
          ${singleRenameBtn}
          ${singleNoteBtn}
          <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
        </div>
      `);
      row.find(".cfm-row-star").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowFav = toggleResFavorite("themes", name);
        const starEl = row.find(".cfm-row-star");
        starEl.toggleClass("cfm-star-active", nowFav);
        starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
        starEl
          .find("i")
          .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
        if (selectedThemeFolder === "__favorites__") executeThemeSearch();
      });
      row.find(".cfm-row-note-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeThemeNoteEdit([name]);
      });
      // 单个重命名按钮
      row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeThemeRename([name]);
      });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
          ).length
        )
          return;
        if (cfmResDeleteMode) {
          toggleResDeleteItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmExportMode) {
          toggleExportItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmThemeNoteMode) {
          toggleThemeNoteItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmThemeRenameMode) {
          toggleThemeRenameItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        if (cfmMultiSelectMode) {
          toggleMultiSelectItem(name, e.shiftKey);
          executeThemeSearch();
          return;
        }
        applyTheme(name);
        rightList.find(".cfm-rv-item-active").removeClass("cfm-rv-item-active");
        row.addClass("cfm-rv-item-active");
        toastr.success(`已应用主题「${name}」`);
      });
      row.on("dragstart", (e) => {
        pcDragStart(e, getMultiDragData({ type: "theme", name }));
      });
      row.on("dragend", () => pcDragEnd());
      touchDragMgr.bind(row, () => getMultiDragData({ type: "theme", name }));
      rightList.append(row);
    }
    // 删除工具栏
    prependResDeleteToolbar(rightList, executeThemeSearch);
    // 导出工具栏
    prependExportToolbar(rightList, executeThemeSearch);
    // 备注编辑工具栏
    prependThemeNoteToolbar(rightList, executeThemeSearch);
    // 重命名工具栏
    prependThemeRenameToolbar(rightList, executeThemeSearch);
    // 多选工具栏
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
        executeThemeSearch();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
        if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
        executeThemeSearch();
      });
      rightList.prepend(toolbar);
    }
  }

  // ==================== 背景全局搜索 ====================
  function executeBgSearch() {
    const q = $("#cfm-bg-global-search").val().toLowerCase().trim();
    if (!q) {
      renderBackgroundsView();
      return;
    }
    const rightList = $("#cfm-bg-right-list");
    const pathEl = $("#cfm-bg-rh-path");
    const countEl = $("#cfm-bg-rh-count");
    const bgNames = getBackgroundNames();
    const groups = getResourceGroups("backgrounds");
    const folders = getResourceFolders("backgrounds");
    let searchPool = bgNames;
    if (selectedBgFolder) {
      if (selectedBgFolder === "__ungrouped__") {
        searchPool = bgNames.filter(
          (n) => !groups[n] || !folders.includes(groups[n]),
        );
      } else if (selectedBgFolder === "__favorites__") {
        const favs = getResFavorites("backgrounds");
        searchPool = bgNames.filter((n) => favs.includes(n));
      } else if (folders.includes(selectedBgFolder)) {
        const collectFolderIds = (pid) => {
          let r = [pid];
          for (const c of getResChildFolders("backgrounds", pid))
            r = r.concat(collectFolderIds(c));
          return r;
        };
        const allFids = collectFolderIds(selectedBgFolder);
        searchPool = bgNames.filter((n) => allFids.includes(groups[n]));
      }
    }
    const matched = searchPool.filter((n) => {
      if (getBackgroundDisplayName(n).toLowerCase().includes(q)) return true;
      const note = getBgNote(n);
      if (note && note.toLowerCase().includes(q)) return true;
      return false;
    });
    rightList.empty();
    pathEl.text(`搜索背景: "${q}"`);
    countEl.text(`${matched.length} 个结果`);
    if (matched.length === 0) {
      rightList.html('<div class="cfm-right-empty">未找到匹配的背景</div>');
      return;
    }
    const currentBg = document.getElementById("bg1");
    const currentBgFile = currentBg
      ? currentBg.getAttribute("style") || ""
      : "";
    for (const name of matched) {
      const isActive =
        currentBgFile.includes(encodeURIComponent(name)) ||
        currentBgFile.includes(name);
      const fav = isResFavorite("backgrounds", name);
      const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(name);
      const isNoteSel = cfmBgNoteMode && cfmBgNoteSelected.has(name);
      const isRenameSel = cfmBgRenameMode && cfmBgRenameSelected.has(name);
      const msCheckHtml = cfmBgNoteMode
        ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
        : cfmBgRenameMode
          ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
          : cfmMultiSelectMode
            ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
            : "";
      const bFolderPath = (() => {
        const grp = groups[name];
        if (grp && getResFolderTree("backgrounds")[grp])
          return getResFolderPath("backgrounds", grp)
            .map((id) => getResFolderDisplayName("backgrounds", id))
            .join(" › ");
        return "未归类";
      })();
      const bgNote = getBgNote(name);
      const noteHtml = bgNote
        ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(bgNote)}">${escapeHtml(bgNote)}</span>`
        : "";
      const noModeActive =
        !cfmBgNoteMode && !cfmBgRenameMode && !cfmMultiSelectMode;
      const singleNoteBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
      const singleRenameBtn = noModeActive
        ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
        : "";
      const thumbUrl = getBackgroundThumbnailUrl(name);
      const row = $(
        `<div class="cfm-row cfm-row-char cfm-row-bg cfm-search-result ${isActive ? "cfm-rv-item-active" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">${msCheckHtml}<div class="cfm-row-icon cfm-bg-thumb" style="background-image:url('${thumbUrl}');background-size:cover;background-position:center;"></div><div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(getBackgroundDisplayName(name))}</span>${noteHtml}<div class="cfm-row-folder-path">${escapeHtml(bFolderPath)}</div></div>${singleRenameBtn}${singleNoteBtn}<div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div></div>`,
      );
      row.find(".cfm-row-star").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowFav = toggleResFavorite("backgrounds", name);
        const starEl = row.find(".cfm-row-star");
        starEl.toggleClass("cfm-star-active", nowFav);
        starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
        starEl
          .find("i")
          .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
        if (selectedBgFolder === "__favorites__") executeBgSearch();
      });
      row.find(".cfm-row-note-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeBgNoteEdit([name]);
      });
      // 单个重命名按钮
      row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeBgRename([name]);
      });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
          ).length
        )
          return;
        if (cfmBgNoteMode) {
          toggleBgNoteItem(name, e.shiftKey);
          executeBgSearch();
          return;
        }
        if (cfmBgRenameMode) {
          toggleBgRenameItem(name, e.shiftKey);
          executeBgSearch();
          return;
        }
        if (cfmMultiSelectMode) {
          toggleMultiSelectItem(name, e.shiftKey);
          executeBgSearch();
          return;
        }
        applyBackground(name);
        rightList.find(".cfm-rv-item-active").removeClass("cfm-rv-item-active");
        row.addClass("cfm-rv-item-active");
        toastr.success(`已应用背景「${getBackgroundDisplayName(name)}」`);
      });
      row.on("dragstart", (e) => {
        pcDragStart(e, getMultiDragData({ type: "background", name }));
      });
      row.on("dragend", () => pcDragEnd());
      touchDragMgr.bind(row, () =>
        getMultiDragData({ type: "background", name }),
      );
      rightList.append(row);
    }
    prependBgNoteToolbar(rightList, executeBgSearch);
    prependBgRenameToolbar(rightList, executeBgSearch);
    if (cfmMultiSelectMode) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
      const toolbar = $(
        `<div class="cfm-multisel-toolbar"><button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button><span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span></div>`,
      );
      toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectAllVisible();
        executeBgSearch();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
        if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
        executeBgSearch();
      });
      rightList.prepend(toolbar);
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
          $("#cfm-topbar-button .drawer-icon")
            .removeClass("openIcon")
            .addClass("closedIcon");
        },
        () => {
          // 用户选择"否，撤回排序" → 恢复快照并关闭
          revertSort();
          $("#cfm-overlay").remove();
          clearNewlyImportedHighlight();
          $("#cfm-topbar-button .drawer-icon")
            .removeClass("openIcon")
            .addClass("closedIcon");
        },
      );
      return;
    }
    $("#cfm-overlay").remove();
    clearNewlyImportedHighlight();
    $("#cfm-topbar-button .drawer-icon")
      .removeClass("openIcon")
      .addClass("closedIcon");
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
      // 删除工具栏（未归类视图）
      prependResDeleteToolbar(list, renderRightPane);
      // 导出工具栏（未归类视图）
      prependExportToolbar(list, renderRightPane);
      // 编辑工具栏（未归类视图）
      prependEditToolbar(list, renderRightPane);
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
      // 删除工具栏（收藏视图）
      prependResDeleteToolbar(list, renderRightPane);
      // 导出工具栏（收藏视图）
      prependExportToolbar(list, renderRightPane);
      // 编辑工具栏（收藏视图）
      prependEditToolbar(list, renderRightPane);
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

    // 删除工具栏（主角色卡视图）
    prependResDeleteToolbar(list, renderRightPane);
    // 导出工具栏（主角色卡视图）
    prependExportToolbar(list, renderRightPane);
    // 编辑工具栏（主角色卡视图）
    prependEditToolbar(list, renderRightPane);
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
    const isExportSel = cfmExportMode && cfmExportSelected.has(char.avatar);
    const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(char.avatar);
    const folderPathHtml = showFolderPath
      ? (() => {
          const p = findCharFolderPath(char.avatar);
          return p
            ? `<div class="cfm-row-folder-path">${escapeHtml(p)}</div>`
            : "";
        })()
      : "";
    // 创作者和版本信息
    const charCreator = char.data?.creator || "";
    const charVersion = char.data?.character_version || "";
    let charMetaHtml = "";
    if (charCreator || charVersion) {
      const parts = [];
      if (charVersion)
        parts.push(
          `<span class="cfm-char-version" title="版本: ${escapeHtml(charVersion)}">${escapeHtml(charVersion)}</span>`,
        );
      if (charCreator)
        parts.push(
          `<span class="cfm-char-creator" title="创作者: ${escapeHtml(charCreator)}">${escapeHtml(charCreator)}</span>`,
        );
      charMetaHtml = `<span class="cfm-char-meta-info">${parts.join('<span class="cfm-char-meta-sep"> · </span>')}</span>`;
    }
    const isEditSel = cfmEditMode && cfmEditSelected.has(char.avatar);
    const checkboxHtml = cfmResDeleteMode
      ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
      : cfmExportMode
        ? `<div class="cfm-export-checkbox ${isExportSel ? "cfm-export-checked" : ""}"><i class="fa-${isExportSel ? "solid" : "regular"} fa-square${isExportSel ? "-check" : ""}"></i></div>`
        : cfmEditMode
          ? `<div class="cfm-edit-checkbox ${isEditSel ? "cfm-edit-checked" : ""}"><i class="fa-${isEditSel ? "solid" : "regular"} fa-square${isEditSel ? "-check" : ""}"></i></div>`
          : cfmMultiSelectMode
            ? `<div class="cfm-multisel-checkbox ${isSelected ? "cfm-multisel-checked" : ""}"><i class="fa-${isSelected ? "solid" : "regular"} fa-square${isSelected ? "-check" : ""}"></i></div>`
            : "";
    // 非模式状态下显示单个编辑铅笔按钮
    const singleEditBtn =
      !cfmExportMode && !cfmResDeleteMode && !cfmEditMode && !cfmMultiSelectMode
        ? `<div class="cfm-row-edit-btn" title="编辑作者名/版本名"><i class="fa-solid fa-pen-to-square"></i></div>`
        : "";
    const row = $(`
            <div class="cfm-row cfm-row-char ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExportSel ? "cfm-export-row-selected" : ""} ${isEditSel ? "cfm-edit-row-selected" : ""} ${isSelected ? "cfm-multisel-row-selected" : ""}" data-avatar="${escapeHtml(char.avatar)}" data-res-id="${escapeHtml(char.avatar)}" draggable="true">
                ${checkboxHtml}
                <div class="cfm-row-icon"><img src="${thumbUrl}" alt="" loading="lazy" onerror="this.src='/img/ai4.png'"></div>
                <div class="cfm-row-name"><span class="cfm-char-name-text">${escapeHtml(char.name)}</span>${charMetaHtml}${folderPathHtml}</div>
                ${singleEditBtn}
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
    // 单个铅笔按钮点击事件
    row.find(".cfm-row-edit-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeCharEdit([char.avatar]);
    });
    // 点击行为：多选模式下切换选中，否则打开角色聊天
    row.on("click", (e) => {
      e.preventDefault();
      if ($(e.target).closest(".cfm-row-star").length) return;
      if ($(e.target).closest(".cfm-row-edit-btn").length) return;
      if (cfmResDeleteMode) {
        toggleResDeleteItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      if (cfmExportMode) {
        toggleExportItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      if (cfmEditMode) {
        toggleEditItem(char.avatar, e.shiftKey);
        renderRightPane();
        return;
      }
      if (cfmMultiSelectMode) {
        toggleMultiSelectItem(char.avatar, e.shiftKey);
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
    $(document).off("click.cfmIconDropdown");
    $("#cfm-config-overlay").remove();
    if ($("#cfm-overlay").length > 0) {
      renderLeftTree();
      renderRightPane();
      if (currentResourceType === "presets") renderPresetsView();
      else if (currentResourceType === "worldinfo") renderWorldInfoView();
      else if (currentResourceType === "themes") renderThemesView();
      else if (currentResourceType === "backgrounds") renderBackgroundsView();
    }
  }

  function renderConfigBody() {
    const body = $("#cfm-config-body");
    body.empty();

    // 根据当前资源类型分支渲染
    if (
      currentResourceType === "presets" ||
      currentResourceType === "worldinfo" ||
      currentResourceType === "themes" ||
      currentResourceType === "backgrounds"
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
                    <button class="cfm-mode-btn ${currentMode === "wand" ? "cfm-mode-active" : ""}" data-mode="wand"><i class="fa-solid fa-magic-wand-sparkles"></i> 魔术棒菜单</button>
                </div>
            </div>
        `);
    modeSection.find(".cfm-mode-btn").on("click touchend", function (e) {
      e.preventDefault();
      const newMode = $(this).data("mode");
      if (newMode === getButtonMode()) return;
      switchButtonMode(newMode);
      const modeLabels = {
        topbar: "已切换为顶栏按钮",
        float: "已切换为浮动按钮",
        wand: "已切换为魔术棒菜单",
      };
      toastr.success(modeLabels[newMode] || "已切换");
      modeSection.find(".cfm-mode-btn").removeClass("cfm-mode-active");
      $(this).addClass("cfm-mode-active");
    });
    body.append(modeSection);

    // 0.5 自定义顶栏图标（仅顶栏模式时显示）
    if (currentMode === "topbar") {
      const { icons: themeIcons, uniqueUrls } = detectThemeIcons();
      const hasTheme = uniqueUrls.length > 0;
      const savedIconUrl =
        extension_settings[extensionName].customTopbarIcon || "";
      const isAutoMode = !savedIconUrl && hasTheme;
      const autoUrl = hasTheme
        ? extractUrlFromCss(
            themeIcons["persona-management-button"] ||
              Object.values(themeIcons)[0],
          )
        : "";
      const displayUrl = savedIconUrl || (isAutoMode ? autoUrl : "");

      // 构建下拉项：每个唯一URL + 使用该URL的按钮名称映射
      const parentIdNameMap = {
        "ai-config-button": "AI配置",
        "sys-settings-button": "API连接",
        "advanced-formatting-button": "格式化",
        "WI-SP-button": "世界书",
        "user-settings-button": "用户设置",
        logo_block: "Logo",
        "extensions-settings-button": "扩展",
        table_database_settings_drawer: "事件表",
        "persona-management-button": "用户设定",
        rightNavHolder: "角色管理",
        "backgrounds-button": "背景",
      };
      let dropdownItemsHtml = "";
      for (const url of uniqueUrls) {
        const pureUrl = extractUrlFromCss(url);
        const users = Object.entries(themeIcons)
          .filter(([, v]) => v === url)
          .map(([k]) => parentIdNameMap[k] || k)
          .join("、");
        const isSelected = pureUrl === displayUrl;
        dropdownItemsHtml += `<div class="cfm-icon-dropdown-item ${isSelected ? "cfm-icon-selected" : ""}" data-url="${escapeHtml(pureUrl)}">
          <div class="cfm-icon-preview" style="background-image:url('${escapeHtml(pureUrl)}')"></div>
          <span class="cfm-icon-dropdown-label" title="${escapeHtml(pureUrl)}">${escapeHtml(pureUrl.split("/").pop())}</span>
          <span class="cfm-icon-dropdown-users">${escapeHtml(users)}</span>
        </div>`;
      }

      const iconSection = $(`
        <div class="cfm-config-section cfm-icon-config-section">
          <label>自定义顶栏图标</label>
          <div class="cfm-icon-input-row">
            <input type="text" id="cfm-icon-url-input" placeholder="${hasTheme ? "已自动检测美化主题图标" : "输入图标URL（留空使用默认图标）"}" value="${escapeHtml(savedIconUrl)}" />
            ${
              hasTheme
                ? `<div class="cfm-icon-dropdown-wrapper">
              <button class="cfm-icon-dropdown-btn" id="cfm-icon-dropdown-toggle" title="从美化主题中选择图标"><i class="fa-solid fa-caret-down"></i></button>
              <div class="cfm-icon-dropdown-menu" id="cfm-icon-dropdown-menu">
                ${dropdownItemsHtml}
              </div>
            </div>`
                : ""
            }
            <button class="cfm-icon-clear-btn" id="cfm-icon-clear" title="清除自定义图标"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="cfm-icon-status" id="cfm-icon-status">
            <span class="cfm-icon-status-dot ${displayUrl ? "cfm-status-active" : "cfm-status-inactive"}"></span>
            ${displayUrl ? (isAutoMode ? "自动使用美化主题图标（用户设定管理）" : "使用自定义图标") : hasTheme ? "已检测到美化主题但未应用" : "使用默认图标"}
          </div>
          <div class="cfm-icon-config-hint">${hasTheme ? `检测到 ${uniqueUrls.length} 个美化主题图标，可从下拉菜单选择或手动输入URL` : "未检测到美化主题图标替换。启用美化主题后会自动检测并适配"}</div>
        </div>
      `);

      // 下拉菜单切换
      iconSection
        .find("#cfm-icon-dropdown-toggle")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          $("#cfm-icon-dropdown-menu").toggleClass("cfm-dropdown-open");
        });
      // 点击其他地方关闭下拉
      $(document).on("click.cfmIconDropdown", () => {
        $("#cfm-icon-dropdown-menu").removeClass("cfm-dropdown-open");
      });

      // 选择下拉项
      iconSection
        .find(".cfm-icon-dropdown-item")
        .on("click touchend", function (e) {
          e.preventDefault();
          e.stopPropagation();
          const url = $(this).data("url");
          $("#cfm-icon-url-input").val(url);
          $("#cfm-icon-dropdown-menu").removeClass("cfm-dropdown-open");
          // 立即应用并保存
          extension_settings[extensionName].customTopbarIcon = url;
          getContext().saveSettingsDebounced();
          applyCustomIcon(toCssUrl(url));
          // 更新选中状态
          iconSection
            .find(".cfm-icon-dropdown-item")
            .removeClass("cfm-icon-selected");
          $(this).addClass("cfm-icon-selected");
          // 更新状态提示
          $("#cfm-icon-status").html(
            `<span class="cfm-icon-status-dot cfm-status-active"></span> 使用自定义图标`,
          );
        });

      // 手动输入URL后回车应用
      iconSection.find("#cfm-icon-url-input").on("change", function () {
        const url = $(this).val().trim();
        extension_settings[extensionName].customTopbarIcon = url;
        getContext().saveSettingsDebounced();
        if (url) {
          applyCustomIcon(toCssUrl(url));
          $("#cfm-icon-status").html(
            `<span class="cfm-icon-status-dot cfm-status-active"></span> 使用自定义图标`,
          );
        } else {
          // 清空输入 → 回到自动检测模式
          applyTopbarIconFromConfig();
          const autoActive = hasTheme;
          $("#cfm-icon-status").html(
            `<span class="cfm-icon-status-dot ${autoActive ? "cfm-status-active" : "cfm-status-inactive"}"></span> ${autoActive ? "自动使用美化主题图标（用户设定管理）" : "使用默认图标"}`,
          );
        }
        // 更新下拉菜单选中状态
        iconSection.find(".cfm-icon-dropdown-item").each(function () {
          $(this).toggleClass("cfm-icon-selected", $(this).data("url") === url);
        });
      });

      // 清除按钮
      iconSection.find("#cfm-icon-clear").on("click touchend", (e) => {
        e.preventDefault();
        $("#cfm-icon-url-input").val("");
        extension_settings[extensionName].customTopbarIcon = "";
        getContext().saveSettingsDebounced();
        applyTopbarIconFromConfig();
        iconSection
          .find(".cfm-icon-dropdown-item")
          .removeClass("cfm-icon-selected");
        const autoActive = hasTheme;
        $("#cfm-icon-status").html(
          `<span class="cfm-icon-status-dot ${autoActive ? "cfm-status-active" : "cfm-status-inactive"}"></span> ${autoActive ? "自动使用美化主题图标（用户设定管理）" : "使用默认图标"}`,
        );
      });

      body.append(iconSection);
    }

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

  // ==================== 预设/世界书/主题配置面板渲染 ====================
  function renderResourceConfigBody(body, type) {
    const typeLabel =
      type === "presets" ? "预设" : type === "themes" ? "主题" : "世界书";
    const tree = getResFolderTree(type);
    const allFolderIds = getResFolderIds(type);
    const expandedSet =
      type === "presets"
        ? presetConfigExpandedNodes
        : type === "themes"
          ? themeConfigExpandedNodes
          : worldInfoConfigExpandedNodes;

    // 0. 按钮位置设置（共享）
    const currentMode = getButtonMode();
    const modeSection = $(`
      <div class="cfm-config-section cfm-mode-section">
        <label>按钮位置</label>
        <div class="cfm-mode-toggle">
          <button class="cfm-mode-btn ${currentMode === "topbar" ? "cfm-mode-active" : ""}" data-mode="topbar"><i class="fa-solid fa-bars"></i> 固定在顶栏</button>
          <button class="cfm-mode-btn ${currentMode === "float" ? "cfm-mode-active" : ""}" data-mode="float"><i class="fa-solid fa-up-down-left-right"></i> 浮动按钮</button>
          <button class="cfm-mode-btn ${currentMode === "wand" ? "cfm-mode-active" : ""}" data-mode="wand"><i class="fa-solid fa-magic-wand-sparkles"></i> 魔术棒菜单</button>
        </div>
      </div>
    `);
    modeSection.find(".cfm-mode-btn").on("click touchend", function (e) {
      e.preventDefault();
      const newMode = $(this).data("mode");
      if (newMode === getButtonMode()) return;
      switchButtonMode(newMode);
      const modeLabels = {
        topbar: "已切换为顶栏按钮",
        float: "已切换为浮动按钮",
        wand: "已切换为魔术棒菜单",
      };
      toastr.success(modeLabels[newMode] || "已切换");
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
          <div id="cfm-res-batch-tpl-area"></div>
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
    // 渲染模板区域
    const tplType = type === "presets" ? "presets" : "worldinfo";
    function refreshResBatchTemplates() {
      const tplArea = popup.find("#cfm-res-batch-tpl-area");
      tplArea.html(buildBatchTemplateHtml(tplType));
      bindBatchTemplateEvents(
        tplType,
        popup,
        "#cfm-res-batch-textarea",
        refreshResBatchTemplates,
      );
    }
    refreshResBatchTemplates();

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
                    <div id="cfm-batch-tpl-area"></div>
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
    // 渲染模板区域
    function refreshBatchTemplates() {
      const tplArea = popup.find("#cfm-batch-tpl-area");
      tplArea.html(buildBatchTemplateHtml("characters"));
      bindBatchTemplateEvents(
        "characters",
        popup,
        "#cfm-batch-textarea",
        refreshBatchTemplates,
      );
    }
    refreshBatchTemplates();
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

    // 预设管理器尚未就绪时显示提示并自动重试
    if (presets.length === 0) {
      const pm = getContext().getPresetManager();
      if (!pm || !pm.select) {
        rightList.html(
          '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 预设管理器加载中，请稍后再试...</div>',
        );
        if (!renderPresetsView._retryCount) renderPresetsView._retryCount = 0;
        if (renderPresetsView._retryCount < 20) {
          renderPresetsView._retryCount++;
          setTimeout(() => {
            if (currentResourceType === "presets") renderPresetsView();
          }, 500);
        }
        return;
      }
    }
    renderPresetsView._retryCount = 0;

    const groups = getResourceGroups("presets");

    // 清理 groups 中已不存在的预设映射（同步外部删除）
    const existingPresetNames = new Set(presets.map((p) => p.name));
    let presetGroupsCleaned = false;
    for (const key of Object.keys(groups)) {
      if (!existingPresetNames.has(key)) {
        delete groups[key];
        presetGroupsCleaned = true;
      }
    }
    if (presetGroupsCleaned) {
      console.log("[CFM] 已清理不存在的预设分组映射");
      getContext().saveSettingsDebounced();
    }

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
      // 预设行（带星标 + 多选支持 + 备注）
      for (const p of displayItems) {
        const isActive = p.value === currentVal;
        const fav = isResFavorite("presets", p.name);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(p.name);
        const isExpSel = cfmExportMode && cfmExportSelected.has(p.name);
        const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(p.name);
        const isNoteSel =
          cfmPresetNoteMode && cfmPresetNoteSelected.has(p.name);
        const isRenameSel =
          cfmPresetRenameMode && cfmPresetRenameSelected.has(p.name);
        const msCheckHtml = cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : cfmPresetNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : cfmPresetRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        // 备注信息
        const presetNote = getPresetNote(p.name);
        const noteHtml = presetNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(presetNote)}">${escapeHtml(presetNote)}</span>`
          : "";
        // 非模式状态下显示单个备注编辑按钮和重命名按钮
        const noModeActive =
          !cfmExportMode &&
          !cfmResDeleteMode &&
          !cfmPresetNoteMode &&
          !cfmPresetRenameMode &&
          !cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        const row = $(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-value="${escapeHtml(p.value)}" data-res-id="${escapeHtml(p.name)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-file-lines" style="font-size:20px;color:#8b9dfc;"></i></div>
            <div class="cfm-row-name"><span class="cfm-preset-name-text">${escapeHtml(p.name)}</span>${noteHtml}</div>
            ${singleRenameBtn}
            ${singleNoteBtn}
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
        // 单个备注编辑按钮
        row.find(".cfm-row-note-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executePresetNoteEdit([p.name]);
        });
        // 单个重命名按钮
        row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executePresetRename([p.name]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
            ).length
          )
            return;
          if (cfmResDeleteMode) {
            toggleResDeleteItem(p.name, e.shiftKey);
            renderPresetsView();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(p.name, e.shiftKey);
            renderPresetsView();
            return;
          }
          if (cfmPresetNoteMode) {
            togglePresetNoteItem(p.name, e.shiftKey);
            renderPresetsView();
            return;
          }
          if (cfmPresetRenameMode) {
            togglePresetRenameItem(p.name, e.shiftKey);
            renderPresetsView();
            return;
          }
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

      // 删除工具栏（预设文件夹视图）
      prependResDeleteToolbar(rightList, renderPresetsView);
      // 导出工具栏（预设文件夹视图）
      prependExportToolbar(rightList, renderPresetsView);
      // 备注编辑工具栏（预设）
      prependPresetNoteToolbar(rightList, renderPresetsView);
      // 重命名工具栏（预设）
      prependPresetRenameToolbar(rightList, renderPresetsView);
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

  // ==================== 主题视图渲染（双栏 + 树形嵌套） ====================
  function renderThemesView() {
    const leftTree = $("#cfm-theme-left-tree");
    const rightList = $("#cfm-theme-right-list");
    const pathEl = $("#cfm-theme-rh-path");
    const countEl = $("#cfm-theme-rh-count");
    leftTree.empty();
    const tree = getResFolderTree("themes");
    const themeNames = getThemeNames();

    if (themeNames.length === 0) {
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 主题列表加载中...</div>',
      );
      if (!renderThemesView._retryCount) renderThemesView._retryCount = 0;
      if (renderThemesView._retryCount < 10) {
        renderThemesView._retryCount++;
        setTimeout(() => {
          if (currentResourceType === "themes") renderThemesView();
        }, 500);
      }
      return;
    }
    renderThemesView._retryCount = 0;

    const groups = getResourceGroups("themes");
    const existingThemeNames = new Set(themeNames);
    let themeGroupsCleaned = false;
    for (const key of Object.keys(groups)) {
      if (!existingThemeNames.has(key)) {
        delete groups[key];
        themeGroupsCleaned = true;
      }
    }
    if (themeGroupsCleaned) {
      console.log("[CFM] 已清理不存在的主题分组映射");
      getContext().saveSettingsDebounced();
    }

    const folderItems = {};
    const ungrouped = [];
    for (const name of themeNames) {
      const grp = groups[name];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(name);
      } else ungrouped.push(name);
    }

    // 收藏入口
    const themeFavs = getResFavorites("themes");
    const themeFavCount = themeNames.filter((n) =>
      themeFavs.includes(n),
    ).length;
    const themeFavNode = $(`
      <div class="cfm-tnode cfm-tnode-favorites ${selectedThemeFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span>
        <span class="cfm-tnode-label">收藏</span>
        <span class="cfm-tnode-count">${themeFavCount}</span>
      </div>
    `);
    themeFavNode.on("click", (e) => {
      e.preventDefault();
      selectedThemeFolder = "__favorites__";
      renderThemesView();
    });
    leftTree.append(themeFavNode);

    // 递归渲染左侧树节点
    function renderThemeTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "themes",
        getResChildFolders("themes", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = themeExpandedNodes.has(folderId);
      const isSelected = selectedThemeFolder === folderId;
      const count = countResItemsRecursive("themes", folderId);
      const indent = 10 + depth * 16;
      const node = $(`
        <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true">
          <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
          <span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
          <span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("themes", folderId))}</span>
          <span class="cfm-tnode-count">${count}</span>
        </div>
      `);
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (themeExpandedNodes.has(folderId))
          themeExpandedNodes.delete(folderId);
        else themeExpandedNodes.add(folderId);
        renderThemesView();
      });
      node.on("click", (e) => {
        e.preventDefault();
        selectedThemeFolder = folderId;
        renderThemesView();
      });
      node.on("dragstart", (e) => {
        pcDragStart(e, { type: "res-folder", resType: "themes", id: folderId });
        node.addClass("cfm-dragging");
      });
      node.on("dragend", () => {
        node.removeClass("cfm-dragging");
        pcDragEnd();
        $(".cfm-tnode").removeClass(
          "cfm-drop-target cfm-drop-forbidden cfm-drop-before cfm-drop-after",
        );
      });
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
        if (data.type === "res-folder" && data.resType === "themes") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("themes", data.id, folderId)
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
          data.resType === "themes" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("themes", data.id, folderId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("themes", data.id, folderId, null);
            toastr.success(`「${data.id}」已移入「${folderId}」`);
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("themes", data.id, pId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("themes", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "themes",
                getResChildFolders("themes", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "themes",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            toastr.success(`「${data.id}」已排序`);
          }
          renderThemesView();
        } else if (data.type === "theme") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("themes", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderThemesView();
          toastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移入「${folderId}」`
              : `已将「${data.name}」移入「${folderId}」`,
          );
        }
      });
      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "themes",
        id: folderId,
        name: folderId,
      }));
      container.append(node);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderThemeTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }

    const topFolders = sortResFolders(
      "themes",
      getResTopLevelFolders("themes"),
    );
    for (const fid of topFolders) renderThemeTreeNode(leftTree, fid, 0);

    // 未归类入口
    const uncatNode = $(`
      <div class="cfm-tnode cfm-tnode-uncategorized ${selectedThemeFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;">
        <span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="cfm-tnode-label">未归类主题</span>
        <span class="cfm-tnode-count">${ungrouped.length}</span>
      </div>
    `);
    uncatNode.on("click", (e) => {
      e.preventDefault();
      selectedThemeFolder = "__ungrouped__";
      renderThemesView();
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
      if (d && d.type === "theme") {
        const names = d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        names.forEach((n) => setItemGroup("themes", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderThemesView();
        toastr.success(
          names.length > 1
            ? `已将 ${names.length} 个主题移出文件夹`
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

    // 右侧渲染 - 搜索模式检查
    const themeSearchQuery = $("#cfm-theme-global-search").val();
    if (themeSearchQuery && themeSearchQuery.trim()) {
      executeThemeSearch();
      return;
    }
    rightList.empty();

    // 获取当前主题
    const currentThemeName =
      typeof power_user !== "undefined" ? power_user.theme : null;

    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];

    if (selectedThemeFolder === "__favorites__") {
      const favs = getResFavorites("themes");
      displayItems = themeNames.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (selectedThemeFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类主题";
    } else if (selectedThemeFolder && tree[selectedThemeFolder]) {
      displayItems = folderItems[selectedThemeFolder] || [];
      childFolders = sortResFolders(
        "themes",
        getResChildFolders("themes", selectedThemeFolder),
      );
      const path = getResFolderPath("themes", selectedThemeFolder)
        .map((id) => getResFolderDisplayName("themes", id))
        .join(" › ");
      displayTitle = path;
    }

    if (themeRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(displayItems, themeRightSortMode, (n) => n);
    }

    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      selectedThemeFolder === "__favorites__" ||
      selectedThemeFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个主题`);
    } else {
      countEl.text(selectedThemeFolder ? `${totalItems} 项` : "");
    }

    if (!selectedThemeFolder) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (selectedThemeFolder === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何主题<br><span style="font-size:12px;opacity:0.5;">点击主题行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (selectedThemeFolder === "__ungrouped__" && totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">没有未归类的主题</div>');
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      // 子文件夹行
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("themes", childId);
        const row = $(`
          <div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("themes", childId))}</div>
            <div class="cfm-row-meta">${childCount} 个主题</div>
          </div>
        `);
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("themes", childId);
          for (const pid of path) themeExpandedNodes.add(pid);
          selectedThemeFolder = childId;
          renderThemesView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "themes",
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
          if (data.type === "res-folder" && data.resType === "themes") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("themes", data.id, childId)
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
            data.resType === "themes" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("themes", data.id, childId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("themes", data.id, childId, null);
              toastr.success(`「${data.id}」已移入「${childId}」`);
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("themes", data.id, pId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("themes", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "themes",
                  getResChildFolders("themes", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "themes",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              toastr.success(`「${data.id}」已排序`);
            }
            renderThemesView();
          } else if (data.type === "theme") {
            const names =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            names.forEach((n) => setItemGroup("themes", n, childId));
            if (data.multiSelect) clearMultiSelect();
            toastr.success(
              names.length > 1
                ? `已将 ${names.length} 个主题移入「${childId}」`
                : `已将「${data.name}」移入「${childId}」`,
            );
            renderThemesView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "themes",
          id: childId,
          name: getResFolderDisplayName("themes", childId),
        }));
        rightList.append(row);
      }
      // 主题行（带星标 + 多选支持）
      for (const name of displayItems) {
        const isActive = name === currentThemeName;
        const fav = isResFavorite("themes", name);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(name);
        const isExpSel = cfmExportMode && cfmExportSelected.has(name);
        const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(name);
        const isNoteSel = cfmThemeNoteMode && cfmThemeNoteSelected.has(name);
        const isRenameSel =
          cfmThemeRenameMode && cfmThemeRenameSelected.has(name);
        const msCheckHtml = cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : cfmThemeNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : cfmThemeRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        // 备注信息
        const themeNote = getThemeNote(name);
        const noteHtml = themeNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(themeNote)}">${escapeHtml(themeNote)}</span>`
          : "";
        // 非模式状态下显示单个编辑按钮
        const noModeActive =
          !cfmExportMode &&
          !cfmResDeleteMode &&
          !cfmThemeNoteMode &&
          !cfmThemeRenameMode &&
          !cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        const row = $(`
          <div class="cfm-row cfm-row-char ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-palette" style="font-size:20px;color:#cba6f7;"></i></div>
            <div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(name)}</span>${noteHtml}</div>
            ${singleRenameBtn}
            ${singleNoteBtn}
            <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
          </div>
        `);
        row.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nowFav = toggleResFavorite("themes", name);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-theme-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            const newCount = themeNames.filter((nn) =>
              getResFavorites("themes").includes(nn),
            ).length;
            favCountEl.text(newCount);
          }
          if (selectedThemeFolder === "__favorites__") renderThemesView();
        });
        // 单个备注编辑按钮
        row.find(".cfm-row-note-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executeThemeNoteEdit([name]);
        });
        // 单个重命名按钮
        row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executeThemeRename([name]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
            ).length
          )
            return;
          if (cfmResDeleteMode) {
            toggleResDeleteItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (cfmThemeNoteMode) {
            toggleThemeNoteItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (cfmThemeRenameMode) {
            toggleThemeRenameItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(name, e.shiftKey);
            renderThemesView();
            return;
          }
          applyTheme(name);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          toastr.success(`已应用主题「${name}」`);
        });
        row.on("dragstart", (e) => {
          const singleData = { type: "theme", name: name };
          const dragData = getMultiDragData(singleData);
          pcDragStart(e, dragData);
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () => {
          const singleData = { type: "theme", name: name };
          return getMultiDragData(singleData);
        });
        rightList.append(row);
      }

      // 删除工具栏
      prependResDeleteToolbar(rightList, renderThemesView);
      // 导出工具栏
      prependExportToolbar(rightList, renderThemesView);
      // 备注编辑工具栏
      prependThemeNoteToolbar(rightList, renderThemesView);
      // 重命名工具栏
      prependThemeRenameToolbar(rightList, renderThemesView);
      // 多选工具栏
      if (cfmMultiSelectMode && selectedThemeFolder) {
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
          renderThemesView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          renderThemesView();
        });
        rightList.prepend(toolbar);
      }
    }

    // 右侧列表拖放目标
    if (
      selectedThemeFolder &&
      selectedThemeFolder !== "__ungrouped__" &&
      selectedThemeFolder !== "__favorites__" &&
      tree[selectedThemeFolder]
    ) {
      const currentFolder = selectedThemeFolder;
      rightList.on("dragover", (e) => {
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        rightList.addClass("cfm-right-list-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      rightList.on("dragleave", (e) => {
        if ($(e.relatedTarget).closest("#cfm-theme-right-list").length === 0)
          rightList.removeClass("cfm-right-list-drop-target");
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
          data.resType === "themes" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("themes", data.id, currentFolder)) {
            toastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("themes", data.id, currentFolder, null);
          toastr.success(`「${data.id}」已移入「${currentFolder}」`);
          renderThemesView();
        } else if (data.type === "theme") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("themes", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          toastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移入「${currentFolder}」`
              : `已将「${data.name}」移入「${currentFolder}」`,
          );
          renderThemesView();
        }
      });
    }
  }

  // ==================== 背景视图渲染（双栏 + 树形嵌套） ====================
  function renderBackgroundsView() {
    const leftTree = $("#cfm-bg-left-tree");
    const rightList = $("#cfm-bg-right-list");
    const pathEl = $("#cfm-bg-rh-path");
    const countEl = $("#cfm-bg-rh-count");
    leftTree.empty();
    const tree = getResFolderTree("backgrounds");
    const bgNames = getBackgroundNames();
    if (bgNames.length === 0) {
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 背景列表加载中...</div>',
      );
      if (!renderBackgroundsView._retryCount)
        renderBackgroundsView._retryCount = 0;
      if (renderBackgroundsView._retryCount < 10) {
        renderBackgroundsView._retryCount++;
        setTimeout(() => {
          if (currentResourceType === "backgrounds") renderBackgroundsView();
        }, 500);
      }
      return;
    }
    renderBackgroundsView._retryCount = 0;
    const groups = getResourceGroups("backgrounds");
    const existingBgNames = new Set(bgNames);
    let bgGroupsCleaned = false;
    for (const key of Object.keys(groups)) {
      if (!existingBgNames.has(key)) {
        delete groups[key];
        bgGroupsCleaned = true;
      }
    }
    if (bgGroupsCleaned) {
      console.log("[CFM] 已清理不存在的背景分组映射");
      getContext().saveSettingsDebounced();
    }
    const folderItems = {};
    const ungrouped = [];
    for (const name of bgNames) {
      const grp = groups[name];
      if (grp && tree[grp]) {
        if (!folderItems[grp]) folderItems[grp] = [];
        folderItems[grp].push(name);
      } else ungrouped.push(name);
    }
    const bgFavs = getResFavorites("backgrounds");
    const bgFavCount = bgNames.filter((n) => bgFavs.includes(n)).length;
    const bgFavNode = $(
      `<div class="cfm-tnode cfm-tnode-favorites ${selectedBgFolder === "__favorites__" ? "cfm-tnode-selected" : ""}" data-id="__favorites__" style="padding-left:10px;"><span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-star" style="color:#f9e2af;"></i></span><span class="cfm-tnode-label">收藏</span><span class="cfm-tnode-count">${bgFavCount}</span></div>`,
    );
    bgFavNode.on("click", (e) => {
      e.preventDefault();
      selectedBgFolder = "__favorites__";
      renderBackgroundsView();
    });
    leftTree.append(bgFavNode);
    function renderBgTreeNode(container, folderId, depth) {
      const children = sortResFolders(
        "backgrounds",
        getResChildFolders("backgrounds", folderId),
      );
      const hasChildren = children.length > 0;
      const isExpanded = bgExpandedNodes.has(folderId);
      const isSelected = selectedBgFolder === folderId;
      const count = countResItemsRecursive("backgrounds", folderId);
      const indent = 10 + depth * 16;
      const node = $(
        `<div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""}" data-id="${escapeHtml(folderId)}" style="padding-left:${indent}px;" draggable="true"><span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span><span class="cfm-tnode-label">${escapeHtml(getResFolderDisplayName("backgrounds", folderId))}</span><span class="cfm-tnode-count">${count}</span></div>`,
      );
      node.find(".cfm-tnode-arrow").on("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        if (bgExpandedNodes.has(folderId)) bgExpandedNodes.delete(folderId);
        else bgExpandedNodes.add(folderId);
        renderBackgroundsView();
      });
      node.on("click", (e) => {
        e.preventDefault();
        selectedBgFolder = folderId;
        renderBackgroundsView();
      });
      node.on("dragstart", (e) => {
        pcDragStart(e, {
          type: "res-folder",
          resType: "backgrounds",
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
        if (data.type === "res-folder" && data.resType === "backgrounds") {
          if (data.id === folderId) {
            node.addClass("cfm-drop-forbidden");
            return;
          }
          if (
            zone === "into" &&
            wouldCreateResCycle("backgrounds", data.id, folderId)
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
          data.resType === "backgrounds" &&
          data.id !== folderId
        ) {
          if (zone === "into") {
            if (wouldCreateResCycle("backgrounds", data.id, folderId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder("backgrounds", data.id, folderId, null);
            toastr.success(`「${data.id}」已移入「${folderId}」`);
          } else {
            const pId = tree[folderId]?.parentId || null;
            if (wouldCreateResCycle("backgrounds", data.id, pId)) {
              toastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder("backgrounds", data.id, pId, folderId);
            } else {
              const sibs = sortResFolders(
                "backgrounds",
                getResChildFolders("backgrounds", pId),
              );
              const ci = sibs.indexOf(folderId);
              reorderResFolder(
                "backgrounds",
                data.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            toastr.success(`「${data.id}」已排序`);
          }
          renderBackgroundsView();
        } else if (data.type === "background") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("backgrounds", n, folderId));
          if (data.multiSelect) clearMultiSelect();
          renderBackgroundsView();
          toastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移入「${folderId}」`
              : `已将「${getBackgroundDisplayName(data.name)}」移入「${folderId}」`,
          );
        }
      });
      touchDragMgr.bind(node, () => ({
        type: "res-folder",
        resType: "backgrounds",
        id: folderId,
        name: folderId,
      }));
      container.append(node);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-tnode-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        for (const childId of children)
          renderBgTreeNode(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
    }
    const topFolders = sortResFolders(
      "backgrounds",
      getResTopLevelFolders("backgrounds"),
    );
    for (const fid of topFolders) renderBgTreeNode(leftTree, fid, 0);
    const uncatNode = $(
      `<div class="cfm-tnode cfm-tnode-uncategorized ${selectedBgFolder === "__ungrouped__" ? "cfm-tnode-selected" : ""}" data-id="__ungrouped__" style="padding-left:10px;"><span class="cfm-tnode-arrow cfm-arrow-hidden"><i class="fa-solid fa-caret-right"></i></span><span class="cfm-tnode-icon"><i class="fa-solid fa-box-open"></i></span><span class="cfm-tnode-label">未归类背景</span><span class="cfm-tnode-count">${ungrouped.length}</span></div>`,
    );
    uncatNode.on("click", (e) => {
      e.preventDefault();
      selectedBgFolder = "__ungrouped__";
      renderBackgroundsView();
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
      if (d && d.type === "background") {
        const names = d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        names.forEach((n) => setItemGroup("backgrounds", n, null));
        if (d.multiSelect) clearMultiSelect();
        renderBackgroundsView();
        toastr.success(
          names.length > 1
            ? `已将 ${names.length} 个背景移出文件夹`
            : `已将「${getBackgroundDisplayName(d.name)}」移出文件夹`,
        );
      }
    });
    leftTree.append(uncatNode);
    if (topFolders.length === 0) {
      uncatNode.before(
        '<div class="cfm-right-empty" style="padding:20px;font-size:12px;">还没有配置文件夹<br>点击右上角 ⚙ 进行配置</div>',
      );
    }
    const bgSearchQuery = $("#cfm-bg-global-search").val();
    if (bgSearchQuery && bgSearchQuery.trim()) {
      executeBgSearch();
      return;
    }
    rightList.empty();
    const currentBg = document.getElementById("bg1");
    const currentBgFile = currentBg
      ? currentBg.getAttribute("style") || ""
      : "";
    let displayItems = [];
    let displayTitle = "选择左侧文件夹查看内容";
    let childFolders = [];
    if (selectedBgFolder === "__favorites__") {
      const favs = getResFavorites("backgrounds");
      displayItems = bgNames.filter((n) => favs.includes(n));
      displayTitle = "⭐ 收藏";
    } else if (selectedBgFolder === "__ungrouped__") {
      displayItems = ungrouped;
      displayTitle = "未归类背景";
    } else if (selectedBgFolder && tree[selectedBgFolder]) {
      displayItems = folderItems[selectedBgFolder] || [];
      childFolders = sortResFolders(
        "backgrounds",
        getResChildFolders("backgrounds", selectedBgFolder),
      );
      displayTitle = getResFolderPath("backgrounds", selectedBgFolder)
        .map((id) => getResFolderDisplayName("backgrounds", id))
        .join(" › ");
    }
    if (bgRightSortMode && displayItems.length > 0) {
      displayItems = sortResItems(displayItems, bgRightSortMode, (n) => n);
    }
    pathEl.text(displayTitle);
    const totalItems = childFolders.length + displayItems.length;
    if (
      selectedBgFolder === "__favorites__" ||
      selectedBgFolder === "__ungrouped__"
    ) {
      countEl.text(`${displayItems.length} 个背景`);
    } else {
      countEl.text(selectedBgFolder ? `${totalItems} 项` : "");
    }
    if (!selectedBgFolder) {
      rightList.html(
        '<div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>',
      );
    } else if (selectedBgFolder === "__favorites__" && totalItems === 0) {
      rightList.html(
        '<div class="cfm-right-empty">还没有收藏任何背景<br><span style="font-size:12px;opacity:0.5;">点击背景行右侧的 ☆ 按钮添加收藏</span></div>',
      );
    } else if (selectedBgFolder === "__ungrouped__" && totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">没有未归类的背景</div>');
    } else if (totalItems === 0) {
      rightList.html('<div class="cfm-right-empty">此文件夹为空</div>');
    } else {
      for (const childId of childFolders) {
        const childCount = countResItemsRecursive("backgrounds", childId);
        const row = $(
          `<div class="cfm-row cfm-row-folder" data-folder-id="${escapeHtml(childId)}" draggable="true"><div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div><div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("backgrounds", childId))}</div><div class="cfm-row-meta">${childCount} 个背景</div></div>`,
        );
        row.on("click", (e) => {
          e.preventDefault();
          const path = getResFolderPath("backgrounds", childId);
          for (const pid of path) bgExpandedNodes.add(pid);
          selectedBgFolder = childId;
          renderBackgroundsView();
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, {
            type: "res-folder",
            resType: "backgrounds",
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
          if (data.type === "res-folder" && data.resType === "backgrounds") {
            if (data.id === childId) {
              row.addClass("cfm-drop-forbidden");
              return;
            }
            if (
              zone === "into" &&
              wouldCreateResCycle("backgrounds", data.id, childId)
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
            data.resType === "backgrounds" &&
            data.id !== childId
          ) {
            if (zone === "into") {
              if (wouldCreateResCycle("backgrounds", data.id, childId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              reorderResFolder("backgrounds", data.id, childId, null);
              toastr.success(`「${data.id}」已移入「${childId}」`);
            } else {
              const pId = tree[childId]?.parentId || null;
              if (wouldCreateResCycle("backgrounds", data.id, pId)) {
                toastr.error("循环嵌套，已阻止");
                return;
              }
              if (zone === "before") {
                reorderResFolder("backgrounds", data.id, pId, childId);
              } else {
                const sibs = sortResFolders(
                  "backgrounds",
                  getResChildFolders("backgrounds", pId),
                );
                const ci = sibs.indexOf(childId);
                reorderResFolder(
                  "backgrounds",
                  data.id,
                  pId,
                  ci < sibs.length - 1 ? sibs[ci + 1] : null,
                );
              }
              toastr.success(`「${data.id}」已排序`);
            }
            renderBackgroundsView();
          } else if (data.type === "background") {
            const names =
              data.multiSelect && data.selectedIds
                ? data.selectedIds
                : [data.name];
            names.forEach((n) => setItemGroup("backgrounds", n, childId));
            if (data.multiSelect) clearMultiSelect();
            toastr.success(
              names.length > 1
                ? `已将 ${names.length} 个背景移入「${childId}」`
                : `已将「${getBackgroundDisplayName(data.name)}」移入「${childId}」`,
            );
            renderBackgroundsView();
          }
        });
        touchDragMgr.bind(row, () => ({
          type: "res-folder",
          resType: "backgrounds",
          id: childId,
          name: getResFolderDisplayName("backgrounds", childId),
        }));
        rightList.append(row);
      }
      for (const name of displayItems) {
        const isActive =
          currentBgFile.includes(encodeURIComponent(name)) ||
          currentBgFile.includes(name);
        const fav = isResFavorite("backgrounds", name);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(name);
        const isExpSel = cfmExportMode && cfmExportSelected.has(name);
        const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(name);
        const isNoteSel = cfmBgNoteMode && cfmBgNoteSelected.has(name);
        const isRenameSel = cfmBgRenameMode && cfmBgRenameSelected.has(name);
        const msCheckHtml = cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : cfmBgNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : cfmBgRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        const bgNote = getBgNote(name);
        const noteHtml = bgNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(bgNote)}">${escapeHtml(bgNote)}</span>`
          : "";
        const noModeActive =
          !cfmExportMode &&
          !cfmResDeleteMode &&
          !cfmBgNoteMode &&
          !cfmBgRenameMode &&
          !cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        const thumbUrl = getBackgroundThumbnailUrl(name);
        const row = $(
          `<div class="cfm-row cfm-row-char cfm-row-bg ${isActive ? "cfm-rv-item-active" : ""} ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(name)}" draggable="true">${msCheckHtml}<div class="cfm-row-icon cfm-bg-thumb" style="background-image:url('${thumbUrl}');background-size:cover;background-position:center;"></div><div class="cfm-row-name"><span class="cfm-theme-name-text">${escapeHtml(getBackgroundDisplayName(name))}</span>${noteHtml}</div>${singleRenameBtn}${singleNoteBtn}<div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div></div>`,
        );
        row.find(".cfm-row-star").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nowFav = toggleResFavorite("backgrounds", name);
          const starEl = row.find(".cfm-row-star");
          starEl.toggleClass("cfm-star-active", nowFav);
          starEl.attr("title", nowFav ? "取消收藏" : "添加收藏");
          starEl
            .find("i")
            .attr("class", `fa-${nowFav ? "solid" : "regular"} fa-star`);
          const favCountEl = $(
            "#cfm-bg-left-tree .cfm-tnode-favorites .cfm-tnode-count",
          );
          if (favCountEl.length) {
            favCountEl.text(
              bgNames.filter((nn) =>
                getResFavorites("backgrounds").includes(nn),
              ).length,
            );
          }
          if (selectedBgFolder === "__favorites__") renderBackgroundsView();
        });
        row.find(".cfm-row-note-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executeBgNoteEdit([name]);
        });
        // 单个重命名按钮
        row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executeBgRename([name]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
            ).length
          )
            return;
          if (cfmResDeleteMode) {
            toggleResDeleteItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (cfmBgNoteMode) {
            toggleBgNoteItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (cfmBgRenameMode) {
            toggleBgRenameItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          if (cfmMultiSelectMode) {
            toggleMultiSelectItem(name, e.shiftKey);
            renderBackgroundsView();
            return;
          }
          applyBackground(name);
          rightList
            .find(".cfm-rv-item-active")
            .removeClass("cfm-rv-item-active");
          row.addClass("cfm-rv-item-active");
          toastr.success(`已应用背景「${getBackgroundDisplayName(name)}」`);
        });
        row.on("dragstart", (e) => {
          pcDragStart(e, getMultiDragData({ type: "background", name }));
        });
        row.on("dragend", () => pcDragEnd());
        touchDragMgr.bind(row, () =>
          getMultiDragData({ type: "background", name }),
        );
        rightList.append(row);
      }
      // 删除工具栏
      prependResDeleteToolbar(rightList, renderBackgroundsView);
      // 导出工具栏
      prependExportToolbar(rightList, renderBackgroundsView);
      // 备注编辑工具栏
      prependBgNoteToolbar(rightList, renderBackgroundsView);
      // 重命名工具栏
      prependBgRenameToolbar(rightList, renderBackgroundsView);
      if (cfmMultiSelectMode && selectedBgFolder) {
        const visible = getVisibleResourceIds();
        const allSel =
          visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
        const toolbar = $(
          `<div class="cfm-multisel-toolbar"><button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button><span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span></div>`,
        );
        toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectAllVisible();
          renderBackgroundsView();
        });
        toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          cfmMultiSelectRangeMode = !cfmMultiSelectRangeMode;
          if (cfmMultiSelectRangeMode) cfmMultiSelectLastClicked = null;
          renderBackgroundsView();
        });
        rightList.prepend(toolbar);
      }
    }
    if (
      selectedBgFolder &&
      selectedBgFolder !== "__ungrouped__" &&
      selectedBgFolder !== "__favorites__" &&
      tree[selectedBgFolder]
    ) {
      const currentFolder = selectedBgFolder;
      rightList.on("dragover", (e) => {
        if ($(e.target).closest(".cfm-row").length > 0) return;
        e.preventDefault();
        rightList.addClass("cfm-right-list-drop-target");
        e.originalEvent.dataTransfer.dropEffect = "move";
      });
      rightList.on("dragleave", (e) => {
        if ($(e.relatedTarget).closest("#cfm-bg-right-list").length === 0)
          rightList.removeClass("cfm-right-list-drop-target");
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
          data.resType === "backgrounds" &&
          data.id !== currentFolder
        ) {
          if (wouldCreateResCycle("backgrounds", data.id, currentFolder)) {
            toastr.error("循环嵌套，已阻止");
            return;
          }
          reorderResFolder("backgrounds", data.id, currentFolder, null);
          toastr.success(`「${data.id}」已移入「${currentFolder}」`);
          renderBackgroundsView();
        } else if (data.type === "background") {
          const names =
            data.multiSelect && data.selectedIds
              ? data.selectedIds
              : [data.name];
          names.forEach((n) => setItemGroup("backgrounds", n, currentFolder));
          if (data.multiSelect) clearMultiSelect();
          toastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移入「${currentFolder}」`
              : `已将「${getBackgroundDisplayName(data.name)}」移入「${currentFolder}」`,
          );
          renderBackgroundsView();
        }
      });
    }
  }

  // ==================== 角色世界书归类 ====================
  /**
   * 扫描所有角色卡，收集关联的世界书名称
   */
  async function scanCharacterWorldBooks() {
    const characters = getCharacters();
    const wiNames = new Set(await getWorldInfoNames(true));
    const linked = new Map(); // 世界书名 -> 关联角色名列表
    const embedded = new Map(); // avatar -> {name, bookName, alreadyImported}
    for (const ch of characters) {
      const worldName = ch.data?.extensions?.world;
      if (worldName && wiNames.has(worldName)) {
        if (!linked.has(worldName)) linked.set(worldName, []);
        linked.get(worldName).push(ch.name || ch.avatar);
      }
      if (ch.data?.character_book) {
        const bookName = ch.data.character_book.name || `${ch.name}'s Lorebook`;
        embedded.set(ch.avatar, {
          name: ch.name || ch.avatar,
          bookName,
          alreadyImported: wiNames.has(bookName),
        });
      }
    }
    return { linked, embedded };
  }

  /**
   * 显示角色世界书归类弹窗
   */
  async function showCharBookClassifyPopup() {
    if ($("#cfm-charbook-classify-overlay").length > 0) return;

    const { linked, embedded } = await scanCharacterWorldBooks();
    const wiGroups = getResourceGroups("worldinfo");

    // 构建文件夹选项
    function buildFolderOptions() {
      const tree = getResFolderTree("worldinfo");
      const options = ['<option value="">— 不归类 —</option>'];
      function addOpts(parentId, depth) {
        const children = sortResFolders(
          "worldinfo",
          Object.keys(tree).filter(
            (id) => tree[id].parentId === (parentId || null),
          ),
        );
        for (const id of children) {
          const indent = "&nbsp;".repeat(depth * 4);
          options.push(
            `<option value="${escapeHtml(id)}">${indent}${escapeHtml(getResFolderDisplayName("worldinfo", id))}</option>`,
          );
          addOpts(id, depth + 1);
        }
      }
      addOpts(null, 0);
      return options.join("");
    }

    // 优先使用已保存的自动归类文件夹，其次使用当前选中的世界书文件夹
    const savedAutoFolder =
      extension_settings[extensionName].autoCharBookFolder || "";
    const currentFolder =
      selectedWorldInfoFolder &&
      selectedWorldInfoFolder !== "__ungrouped__" &&
      selectedWorldInfoFolder !== "__favorites__"
        ? selectedWorldInfoFolder
        : "";
    const defaultFolder = savedAutoFolder || currentFolder;

    // 构建关联世界书列表HTML
    let linkedHtml = "";
    if (linked.size === 0) {
      linkedHtml = '<div class="cfm-cb-empty">未发现角色卡关联的世界书</div>';
    } else {
      for (const [wiName, charNames] of linked) {
        const currentFolder = wiGroups[wiName] || null;
        const currentDisplay = currentFolder
          ? getResFolderDisplayName("worldinfo", currentFolder)
          : "未归类";
        const charList =
          charNames.length <= 3
            ? charNames.join("、")
            : charNames.slice(0, 3).join("、") + `...等${charNames.length}个`;
        linkedHtml += `
          <div class="cfm-cb-row" data-wi-name="${escapeHtml(wiName)}">
            <label class="cfm-cb-check-label"><input type="checkbox" class="cfm-cb-check" checked>
              <span class="cfm-cb-wi-name">${escapeHtml(wiName)}</span></label>
            <div class="cfm-cb-row-meta">
              <span class="cfm-cb-chars" title="${escapeHtml(charNames.join("、"))}">关联: ${escapeHtml(charList)}</span>
              <span class="cfm-cb-cur">当前: ${escapeHtml(currentDisplay)}</span>
            </div>
          </div>`;
      }
    }

    // 构建内嵌世界书列表HTML
    let embeddedHtml = "";
    const embEntries = [...embedded.entries()];
    if (embEntries.length === 0) {
      embeddedHtml = '<div class="cfm-cb-empty">未发现角色卡内嵌的世界书</div>';
    } else {
      for (const [avatar, info] of embEntries) {
        const statusText = info.alreadyImported ? "已导入" : "未导入";
        const statusClass = info.alreadyImported
          ? "cfm-cb-imported"
          : "cfm-cb-not-imported";
        embeddedHtml += `
          <div class="cfm-cb-row cfm-cb-embed-row" data-avatar="${escapeHtml(avatar)}">
            <label class="cfm-cb-check-label"><input type="checkbox" class="cfm-cb-embed-check" ${info.alreadyImported ? "" : "checked"}>
              <span class="cfm-cb-wi-name">${escapeHtml(info.name)}</span></label>
            <div class="cfm-cb-row-meta">
              <span class="cfm-cb-bookname">世界书: ${escapeHtml(info.bookName)}</span>
              <span class="cfm-cb-status ${statusClass}">${statusText}</span>
            </div>
          </div>`;
      }
    }

    const folderOpts = buildFolderOptions();
    const dialogHtml = `
      <div class="cfm-cb-popup">
        <div class="cfm-cb-header">
          <span class="cfm-cb-title"><i class="fa-solid fa-user-tag"></i> 角色世界书归类</span>
          <button class="cfm-cb-close" title="关闭"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="cfm-cb-body">
          <div class="cfm-cb-section">
            <div class="cfm-cb-section-title">
              <i class="fa-solid fa-link"></i> 关联世界书 (extensions.world)
              <span class="cfm-cb-section-count">${linked.size} 个</span>
            </div>
            <div class="cfm-cb-section-desc">角色卡通过 extensions.world 字段关联的已存在世界书</div>
            <div class="cfm-cb-list cfm-cb-linked-list">${linkedHtml}</div>
            <div class="cfm-cb-select-actions">
              <button class="cfm-cb-sel-all" data-target="linked">全选</button>
              <button class="cfm-cb-sel-none" data-target="linked">全不选</button>
            </div>
          </div>
          <div class="cfm-cb-section">
            <div class="cfm-cb-section-title">
              <i class="fa-solid fa-book-bookmark"></i> 内嵌世界书 (character_book)
              <span class="cfm-cb-section-count">${embEntries.length} 个</span>
            </div>
            <div class="cfm-cb-section-desc">角色卡内嵌的世界书数据，勾选未导入的可自动提取并归类</div>
            <div class="cfm-cb-list cfm-cb-embed-list">${embeddedHtml}</div>
            <div class="cfm-cb-select-actions">
              <button class="cfm-cb-sel-all" data-target="embed">全选</button>
              <button class="cfm-cb-sel-none" data-target="embed">全不选</button>
            </div>
          </div>
          <div class="cfm-cb-target">
            <label class="cfm-cb-target-label"><i class="fa-solid fa-folder"></i> 目标文件夹:</label>
            <select class="cfm-cb-target-select" id="cfm-cb-target-folder">${folderOpts}</select>
          </div>
          <div class="cfm-cb-auto-setting">
            <label class="cfm-cb-check-label">
              <input type="checkbox" id="cfm-cb-auto-extract" ${extension_settings[extensionName].autoCharBookFolder ? "checked" : ""}>
              <span>导入角色卡时自动提取内嵌世界书到上方选定的文件夹</span>
            </label>
            <div class="cfm-cb-auto-hint">启用后，每次通过资源管理器导入角色卡时，会自动提取内嵌世界书并归类到设定的文件夹</div>
          </div>
        </div>
        <div class="cfm-cb-footer">
          <button class="cfm-cb-cancel">取消</button>
          <button class="cfm-cb-confirm">确认归类</button>
        </div>
      </div>
    `;

    const overlay = $("<div id='cfm-charbook-classify-overlay'>")
      .css({
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      })
      .html(dialogHtml);

    $("body").append(overlay);

    // 设置默认文件夹
    if (defaultFolder) overlay.find("#cfm-cb-target-folder").val(defaultFolder);

    // 全选/全不选
    overlay.find(".cfm-cb-sel-all").on("click", function () {
      const target = $(this).data("target");
      const selector =
        target === "linked"
          ? ".cfm-cb-linked-list .cfm-cb-check"
          : ".cfm-cb-embed-list .cfm-cb-embed-check";
      overlay.find(selector).prop("checked", true);
    });
    overlay.find(".cfm-cb-sel-none").on("click", function () {
      const target = $(this).data("target");
      const selector =
        target === "linked"
          ? ".cfm-cb-linked-list .cfm-cb-check"
          : ".cfm-cb-embed-list .cfm-cb-embed-check";
      overlay.find(selector).prop("checked", false);
    });

    // 关闭
    const closePopup = () => overlay.remove();
    overlay.find(".cfm-cb-close, .cfm-cb-cancel").on("click", closePopup);
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) closePopup();
    });

    // 确认归类
    overlay.find(".cfm-cb-confirm").on("click", async function () {
      const targetFolder = overlay.find("#cfm-cb-target-folder").val() || null;

      // 保存自动提取设置
      const autoExtract = overlay.find("#cfm-cb-auto-extract").prop("checked");
      extension_settings[extensionName].autoCharBookFolder = autoExtract
        ? targetFolder || null
        : null;
      getContext().saveSettingsDebounced();

      let movedCount = 0;
      let importedCount = 0;
      let failCount = 0;

      // 1. 处理关联世界书归类
      overlay.find(".cfm-cb-linked-list .cfm-cb-row").each(function () {
        const checked = $(this).find(".cfm-cb-check").prop("checked");
        if (!checked) return;
        const wiName = $(this).data("wi-name");
        if (wiName) {
          setItemGroup("worldinfo", wiName, targetFolder);
          movedCount++;
        }
      });

      // 2. 处理内嵌世界书提取+归类
      const embedRows = overlay.find(".cfm-cb-embed-list .cfm-cb-embed-row");
      for (let i = 0; i < embedRows.length; i++) {
        const row = $(embedRows[i]);
        if (!row.find(".cfm-cb-embed-check").prop("checked")) continue;
        const avatar = row.data("avatar");
        const info = embedded.get(avatar);
        if (!info) continue;

        if (info.alreadyImported) {
          // 已导入的直接归类
          if (targetFolder) {
            setItemGroup("worldinfo", info.bookName, targetFolder);
            movedCount++;
          }
        } else {
          // 未导入的需要先提取导入
          try {
            const ch = getCharacters().find((c) => c.avatar === avatar);
            if (!ch?.data?.character_book) continue;
            const bookName = info.bookName;
            // 使用酒馆的 convertCharacterBook 和 saveWorldInfo
            // 由于这些函数可能不在全局作用域，我们通过API方式导入
            const characterBook = ch.data.character_book;
            const formData = new FormData();
            const blob = new Blob([JSON.stringify(characterBook)], {
              type: "application/json",
            });
            formData.append(
              "avatar",
              new File([blob], bookName + ".json", {
                type: "application/json",
              }),
            );
            formData.append("convertedData", JSON.stringify(characterBook));
            const result = await fetch("/api/worldinfo/import", {
              method: "POST",
              headers: getContext().getRequestHeaders({
                omitContentType: true,
              }),
              body: formData,
              cache: "no-cache",
            });
            if (result.ok) {
              const data = await result.json();
              if (data.name && targetFolder) {
                setItemGroup("worldinfo", data.name, targetFolder);
              }
              importedCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            console.error("[CFM] 提取内嵌世界书失败:", avatar, err);
            failCount++;
          }
        }
      }

      closePopup();

      // 刷新缓存和视图
      _worldInfoNamesCache = null;
      renderWorldInfoView();

      // 汇报结果
      let msg = "";
      if (movedCount > 0) msg += `归类了 ${movedCount} 个世界书`;
      if (importedCount > 0)
        msg += `${msg ? "，" : ""}提取并导入了 ${importedCount} 个内嵌世界书`;
      if (failCount > 0) msg += `${msg ? "，" : ""}${failCount} 个失败`;
      if (!msg) msg = "未选择任何世界书";
      if (failCount > 0) toastr.warning(msg, "角色世界书归类");
      else if (movedCount > 0 || importedCount > 0)
        toastr.success(msg, "角色世界书归类");
      else toastr.info(msg, "角色世界书归类");
    });

    // ESC关闭
    const escHandler = (evt) => {
      if (evt.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  // ==================== 世界书视图渲染（双栏 + 树形嵌套） ====================
  async function renderWorldInfoView() {
    const leftTree = $("#cfm-worldinfo-left-tree");
    const rightList = $("#cfm-worldinfo-right-list");
    const pathEl = $("#cfm-worldinfo-rh-path");
    const countEl = $("#cfm-worldinfo-rh-count");

    // 每次渲染时清除缓存以确保与酒馆原生界面保持同步
    _worldInfoNamesCache = null;
    let names;
    // 优先从DOM同步读取（getWorldInfoNames内部会先尝试DOM）
    const domNames = [];
    $("#world_editor_select option").each(function () {
      const v = $(this).val();
      const t = $(this).text();
      if (v !== "" && t !== "--- 选择以编辑 ---") domNames.push(t);
    });
    if (domNames.length > 0) {
      names = domNames;
      _worldInfoNamesCache = domNames;
    } else if (_worldInfoPreloadPromise) {
      leftTree.empty();
      rightList.html(
        '<div class="cfm-right-empty"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>',
      );
      names = await _worldInfoPreloadPromise;
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

    // 清理 groups 中已不存在的世界书映射（同步外部删除）
    const existingWiNames = new Set(names);
    let wiGroupsCleaned = false;
    for (const key of Object.keys(groups)) {
      if (!existingWiNames.has(key)) {
        delete groups[key];
        wiGroupsCleaned = true;
      }
    }
    if (wiGroupsCleaned) {
      console.log("[CFM] 已清理不存在的世界书分组映射");
      getContext().saveSettingsDebounced();
    }

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
      // 世界书行（带星标 + 多选支持 + 备注）
      for (const n of displayItems) {
        const fav = isResFavorite("worldinfo", n);
        const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(n);
        const isExpSel = cfmExportMode && cfmExportSelected.has(n);
        const isDelSel = cfmResDeleteMode && cfmResDeleteSelected.has(n);
        const isNoteSel =
          cfmWorldInfoNoteMode && cfmWorldInfoNoteSelected.has(n);
        const isRenameSel =
          cfmWorldInfoRenameMode && cfmWorldInfoRenameSelected.has(n);
        const msCheckHtml = cfmResDeleteMode
          ? `<div class="cfm-res-delete-checkbox ${isDelSel ? "cfm-res-delete-checked" : ""}"><i class="fa-${isDelSel ? "solid" : "regular"} fa-square${isDelSel ? "-check" : ""}"></i></div>`
          : cfmExportMode
            ? `<div class="cfm-export-checkbox ${isExpSel ? "cfm-export-checked" : ""}"><i class="fa-${isExpSel ? "solid" : "regular"} fa-square${isExpSel ? "-check" : ""}"></i></div>`
            : cfmWorldInfoNoteMode
              ? `<div class="cfm-edit-checkbox ${isNoteSel ? "cfm-edit-checked" : ""}"><i class="fa-${isNoteSel ? "solid" : "regular"} fa-square${isNoteSel ? "-check" : ""}"></i></div>`
              : cfmWorldInfoRenameMode
                ? `<div class="cfm-edit-checkbox ${isRenameSel ? "cfm-edit-checked" : ""}"><i class="fa-${isRenameSel ? "solid" : "regular"} fa-square${isRenameSel ? "-check" : ""}"></i></div>`
                : cfmMultiSelectMode
                  ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
                  : "";
        // 备注信息
        const wiNote = getWorldInfoNote(n);
        const noteHtml = wiNote
          ? `<span class="cfm-theme-note" title="备注: ${escapeHtml(wiNote)}">${escapeHtml(wiNote)}</span>`
          : "";
        // 非模式状态下显示单个备注编辑按钮和重命名按钮
        const noModeActive =
          !cfmExportMode &&
          !cfmResDeleteMode &&
          !cfmWorldInfoNoteMode &&
          !cfmWorldInfoRenameMode &&
          !cfmMultiSelectMode;
        const singleNoteBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></div>`
          : "";
        const singleRenameBtn = noModeActive
          ? `<div class="cfm-row-edit-btn cfm-row-rename-btn" title="重命名"><i class="fa-solid fa-i-cursor"></i></div>`
          : "";
        const row = $(`
          <div class="cfm-row cfm-row-char ${isDelSel ? "cfm-res-delete-row-selected" : ""} ${isExpSel ? "cfm-export-row-selected" : ""} ${isNoteSel ? "cfm-edit-row-selected" : ""} ${isRenameSel ? "cfm-edit-row-selected" : ""} ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}" draggable="true">
            ${msCheckHtml}
            <div class="cfm-row-icon"><i class="fa-solid fa-book" style="font-size:20px;color:#a6e3a1;"></i></div>
            <div class="cfm-row-name"><span class="cfm-worldinfo-name-text">${escapeHtml(n)}</span>${noteHtml}</div>
            ${singleRenameBtn}
            ${singleNoteBtn}
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
        // 单个备注编辑按钮
        row.find(".cfm-row-note-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executeWorldInfoNoteEdit([n]);
        });
        // 单个重命名按钮
        row.find(".cfm-row-rename-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          executeWorldInfoRename([n]);
        });
        row.on("click", (e) => {
          if (
            $(e.target).closest(
              ".cfm-row-star, .cfm-row-note-btn, .cfm-row-rename-btn",
            ).length
          )
            return;
          if (cfmResDeleteMode) {
            toggleResDeleteItem(n, e.shiftKey);
            renderWorldInfoView();
            return;
          }
          if (cfmExportMode) {
            toggleExportItem(n, e.shiftKey);
            renderWorldInfoView();
            return;
          }
          if (cfmWorldInfoNoteMode) {
            toggleWorldInfoNoteItem(n, e.shiftKey);
            renderWorldInfoView();
            return;
          }
          if (cfmWorldInfoRenameMode) {
            toggleWorldInfoRenameItem(n, e.shiftKey);
            renderWorldInfoView();
            return;
          }
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

      // 删除工具栏（世界书文件夹视图）
      prependResDeleteToolbar(rightList, renderWorldInfoView);
      // 导出工具栏（世界书文件夹视图）
      prependExportToolbar(rightList, renderWorldInfoView);
      // 备注编辑工具栏（世界书）
      prependWorldInfoNoteToolbar(rightList, renderWorldInfoView);
      // 重命名工具栏（世界书）
      prependWorldInfoRenameToolbar(rightList, renderWorldInfoView);
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
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].presetNotes || {}),
        ),
      };
    }

    if (scope === "all" || scope === "worldinfo") {
      ensureResourceSettings();
      data.worldinfo = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("worldinfo"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("worldinfo"))),
        favorites: [...getResFavorites("worldinfo")],
        notes: JSON.parse(
          JSON.stringify(
            extension_settings[extensionName].worldInfoNotes || {},
          ),
        ),
      };
    }

    if (scope === "all" || scope === "themes") {
      ensureResourceSettings();
      data.themes = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("themes"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("themes"))),
        favorites: [...getResFavorites("themes")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].themeNotes || {}),
        ),
      };
    }

    if (scope === "all" || scope === "backgrounds") {
      ensureResourceSettings();
      data.backgrounds = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("backgrounds"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("backgrounds"))),
        favorites: [...getResFavorites("backgrounds")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].bgNotes || {}),
        ),
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
            : scope === "themes"
              ? "美化"
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
      themes: { matched: 0, skipped: 0 },
      backgrounds: { matched: 0, skipped: 0 },
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
          : currentResourceType === "themes"
            ? "美化"
            : currentResourceType === "backgrounds"
              ? "背景"
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
          if (jsonData.themes)
            html += `美化：匹配 ${report.themes.matched} 个，跳过 ${report.themes.skipped} 个<br>`;
          if (jsonData.backgrounds)
            html += `背景：匹配 ${report.backgrounds.matched} 个，跳过 ${report.backgrounds.skipped} 个<br>`;
          if (report.favoritesRestored > 0)
            html += `恢复了 ${report.favoritesRestored} 个收藏<br>`;
          html += `</div>`;
          resultArea.html(html);

          renderLeftTree();
          renderRightPane();
          if (currentResourceType === "presets") renderPresetsView();
          else if (currentResourceType === "worldinfo") renderWorldInfoView();
          else if (currentResourceType === "themes") renderThemesView();
          else if (currentResourceType === "backgrounds")
            renderBackgroundsView();
        } catch (err) {
          toastr.error("导入失败：" + err.message);
          console.error("[CFM] Import error:", err);
        }
      };
      reader.readAsText(file);
    });
  }

  // ==================== 原生界面文件夹过滤 ====================
  // 当前过滤状态
  let nativeFilterChar = null; // 角色卡当前过滤的文件夹tagId，null=不过滤
  let nativeFilterPreset = null; // 预设当前过滤的文件夹id
  let nativeFilterWorldInfo = null; // 世界书当前过滤的文件夹id
  let nativeFilterTheme = null; // 主题当前过滤的文件夹id
  let nativeFilterBg = null; // 背景当前过滤的文件夹id

  /**
   * 构建文件夹树HTML（递归），用于原生界面浮动面板
   * @param {string} type - 'chars' | 'presets' | 'worldinfo' | 'themes' | 'backgrounds'
   * @param {string|null} parentId - 父文件夹ID
   * @param {number} depth - 缩进深度
   * @param {Set} expandedSet - 已展开的文件夹ID集合
   * @param {string|null} activeId - 当前选中的文件夹ID
   * @returns {string} HTML字符串
   */
  function buildNativeFolderTreeHtml(
    type,
    parentId,
    depth,
    expandedSet,
    activeId,
  ) {
    let folderIds, getDisplayName, getChildren, countFn;
    if (type === "chars") {
      folderIds = parentId
        ? sortFolders(getChildFolders(parentId))
        : sortFolders(getTopLevelFolders());
      getDisplayName = (id) => getTagName(id);
      getChildren = (id) => getChildFolders(id);
      countFn = (id) => countCharsInFolderRecursive(id);
    } else {
      const resType =
        type === "presets"
          ? "presets"
          : type === "themes"
            ? "themes"
            : type === "backgrounds"
              ? "backgrounds"
              : "worldinfo";
      folderIds = parentId
        ? sortResFolders(resType, getResChildFolders(resType, parentId))
        : sortResFolders(resType, getResTopLevelFolders(resType));
      getDisplayName = (id) => getResFolderDisplayName(resType, id);
      getChildren = (id) => getResChildFolders(resType, id);
      countFn = (id) => {
        const groups = getResourceGroups(resType);
        let count = 0;
        for (const [, fid] of Object.entries(groups)) {
          if (fid === id) count++;
        }
        // 递归子文件夹
        for (const cid of getChildren(id)) count += countFn(cid);
        return count;
      };
    }
    let html = "";
    for (const fid of folderIds) {
      const name = getDisplayName(fid);
      const children = getChildren(fid);
      const hasChildren = children.length > 0;
      const isExpanded = expandedSet.has(fid);
      const isActive = fid === activeId;
      const count = countFn(fid);
      html += `<div class="cfm-nf-item${isActive ? " cfm-nf-active" : ""}" data-folder-id="${fid}" data-type="${type}" style="padding-left:${12 + depth * 16}px;">`;
      if (hasChildren) {
        html += `<span class="cfm-nf-arrow ${isExpanded ? "cfm-nf-expanded" : ""}" data-folder-id="${fid}"><i class="fa-solid fa-chevron-right"></i></span>`;
      } else {
        html += `<span class="cfm-nf-arrow-placeholder"></span>`;
      }
      html += `<i class="fa-solid fa-folder cfm-nf-icon"></i>`;
      html += `<span class="cfm-nf-name">${escapeHtml(name)}</span>`;
      html += `<span class="cfm-nf-count">${count}</span>`;
      html += `</div>`;
      if (hasChildren && isExpanded) {
        html += buildNativeFolderTreeHtml(
          type,
          fid,
          depth + 1,
          expandedSet,
          activeId,
        );
      }
    }
    // 顶层时追加"未归类"节点
    if (parentId === null) {
      let uncatCount = 0;
      if (type === "chars") {
        uncatCount = getUncategorizedCharacters().length;
      } else {
        const resType =
          type === "presets"
            ? "presets"
            : type === "themes"
              ? "themes"
              : "worldinfo";
        const groups = getResourceGroups(resType);
        const tree = getResFolderTree(resType);
        let allItems;
        if (type === "presets") {
          allItems = getCurrentPresets().map((p) => p.name);
        } else if (type === "themes") {
          allItems = getThemeNames();
        } else if (type === "backgrounds") {
          allItems = getBackgroundNames();
        } else {
          allItems = [];
          $("#world_editor_select option").each(function () {
            const v = $(this).val();
            const t = $(this).text();
            if (v !== "" && t !== "--- 选择以编辑 ---") allItems.push(t);
          });
        }
        uncatCount = allItems.filter((name) => {
          const grp = groups[name];
          return !grp || !tree[grp];
        }).length;
      }
      const isUncatActive = activeId === "__ungrouped__";
      html += `<div class="cfm-nf-item cfm-nf-uncat${isUncatActive ? " cfm-nf-active" : ""}" data-folder-id="__ungrouped__" data-type="${type}" style="padding-left:12px;">`;
      html += `<span class="cfm-nf-arrow-placeholder"></span>`;
      html += `<i class="fa-solid fa-box-open cfm-nf-icon"></i>`;
      html += `<span class="cfm-nf-name">${type === "chars" ? "未归类角色" : type === "presets" ? "未归类预设" : type === "themes" ? "未归类主题" : type === "backgrounds" ? "未归类背景" : "未归类世界书"}</span>`;
      html += `<span class="cfm-nf-count">${uncatCount}</span>`;
      html += `</div>`;
    }
    return html;
  }

  /**
   * 创建并显示原生界面文件夹浮动面板
   * @param {jQuery} anchorEl - 锚点元素（文件夹图标按钮）
   * @param {string} type - 'chars' | 'presets' | 'worldinfo' | 'themes'
   */
  function showNativeFolderPanel(anchorEl, type) {
    // 移除已有面板
    $(".cfm-nf-panel").remove();

    const currentFilter =
      type === "chars"
        ? nativeFilterChar
        : type === "presets"
          ? nativeFilterPreset
          : type === "themes"
            ? nativeFilterTheme
            : type === "backgrounds"
              ? nativeFilterBg
              : nativeFilterWorldInfo;

    // 展开状态集合（持久化到会话中）
    if (!showNativeFolderPanel._expanded) showNativeFolderPanel._expanded = {};
    if (!showNativeFolderPanel._expanded[type])
      showNativeFolderPanel._expanded[type] = new Set();
    const expandedSet = showNativeFolderPanel._expanded[type];

    const panel = $(`<div class="cfm-nf-panel" data-nf-type="${type}"></div>`);

    // 顶部工具栏
    const toolbar = $(`<div class="cfm-nf-toolbar">
      <span class="cfm-nf-title"><i class="fa-solid fa-folder-tree"></i> 文件夹过滤</span>
      <span class="cfm-nf-toolbar-actions">
        <i class="fa-solid fa-angles-down cfm-nf-expand-all" title="展开全部"></i>
        <i class="fa-solid fa-angles-up cfm-nf-collapse-all" title="收起全部"></i>
      </span>
    </div>`);
    panel.append(toolbar);

    // "显示全部" 按钮
    const showAllBtn =
      $(`<div class="cfm-nf-item cfm-nf-show-all${!currentFilter ? " cfm-nf-active" : ""}">
      <i class="fa-solid fa-layer-group cfm-nf-icon"></i>
      <span class="cfm-nf-name">显示全部</span>
    </div>`);
    panel.append(showAllBtn);

    // 文件夹树
    const treeContainer = $(`<div class="cfm-nf-tree"></div>`);
    treeContainer.html(
      buildNativeFolderTreeHtml(type, null, 0, expandedSet, currentFilter),
    );
    panel.append(treeContainer);

    // 阻止面板内的所有鼠标事件冒泡，防止酒馆原生面板关闭逻辑被触发
    panel.on("mousedown mouseup click touchstart touchend", function (e) {
      e.stopPropagation();
    });

    // 定位面板
    $("body").append(panel);
    const anchorRect = anchorEl[0].getBoundingClientRect();
    let top = anchorRect.bottom + 4;
    let left = anchorRect.left;
    // 确保不超出视口
    const panelWidth = panel.outerWidth();
    const panelHeight = panel.outerHeight();
    if (left + panelWidth > window.innerWidth)
      left = window.innerWidth - panelWidth - 8;
    if (left < 4) left = 4;
    if (top + panelHeight > window.innerHeight)
      top = anchorRect.top - panelHeight - 4;
    panel.css({ top: top + "px", left: left + "px" });

    // 事件：展开/收起箭头
    panel.on("click", ".cfm-nf-arrow", function (e) {
      e.stopPropagation();
      const fid = $(this).attr("data-folder-id");
      if (expandedSet.has(fid)) expandedSet.delete(fid);
      else expandedSet.add(fid);
      treeContainer.html(
        buildNativeFolderTreeHtml(type, null, 0, expandedSet, currentFilter),
      );
    });

    // 事件：展开全部
    toolbar.find(".cfm-nf-expand-all").on("click", function (e) {
      e.stopPropagation();
      let allIds;
      if (type === "chars") {
        allIds = getFolderTagIds();
      } else {
        const resType =
          type === "presets"
            ? "presets"
            : type === "themes"
              ? "themes"
              : type === "backgrounds"
                ? "backgrounds"
                : "worldinfo";
        allIds = getResFolderIds(resType);
      }
      allIds.forEach((id) => expandedSet.add(id));
      const cf =
        type === "chars"
          ? nativeFilterChar
          : type === "presets"
            ? nativeFilterPreset
            : type === "themes"
              ? nativeFilterTheme
              : type === "backgrounds"
                ? nativeFilterBg
                : nativeFilterWorldInfo;
      treeContainer.html(
        buildNativeFolderTreeHtml(type, null, 0, expandedSet, cf),
      );
    });

    // 事件：收起全部
    toolbar.find(".cfm-nf-collapse-all").on("click", function (e) {
      e.stopPropagation();
      expandedSet.clear();
      const cf =
        type === "chars"
          ? nativeFilterChar
          : type === "presets"
            ? nativeFilterPreset
            : type === "themes"
              ? nativeFilterTheme
              : type === "backgrounds"
                ? nativeFilterBg
                : nativeFilterWorldInfo;
      treeContainer.html(
        buildNativeFolderTreeHtml(type, null, 0, expandedSet, cf),
      );
    });

    // 事件：点击"显示全部"
    showAllBtn.on("click", function () {
      if (type === "chars") nativeFilterChar = null;
      else if (type === "presets") nativeFilterPreset = null;
      else if (type === "themes") nativeFilterTheme = null;
      else if (type === "backgrounds") nativeFilterBg = null;
      else nativeFilterWorldInfo = null;
      applyNativeFilter(type);
      panel.remove();
      $(document).off("mousedown.cfmNfPanel touchstart.cfmNfPanel");
      updateNativeFilterBtnState(type);
    });

    // 事件：点击文件夹项
    panel.on("click", ".cfm-nf-item[data-folder-id]", function (e) {
      if ($(e.target).closest(".cfm-nf-arrow").length) return;
      const fid = $(this).attr("data-folder-id"); // 用 attr 确保返回字符串
      console.log("[CFM-NF] 选中文件夹:", type, fid);
      if (type === "chars") nativeFilterChar = fid;
      else if (type === "presets") nativeFilterPreset = fid;
      else if (type === "themes") nativeFilterTheme = fid;
      else if (type === "backgrounds") nativeFilterBg = fid;
      else nativeFilterWorldInfo = fid;
      applyNativeFilter(type);
      panel.remove();
      $(document).off("mousedown.cfmNfPanel touchstart.cfmNfPanel");
      updateNativeFilterBtnState(type);
    });

    // 点击外部关闭
    setTimeout(() => {
      $(document).on(
        "mousedown.cfmNfPanel touchstart.cfmNfPanel",
        function (e) {
          if (!$(e.target).closest(".cfm-nf-panel, .cfm-nf-btn").length) {
            $(".cfm-nf-panel").remove();
            $(document).off("mousedown.cfmNfPanel touchstart.cfmNfPanel");
          }
        },
      );
    }, 0);
  }

  /**
   * 获取文件夹下所有资源名称（递归包含子文件夹），支持 __ungrouped__
   */
  function getAllItemsInFolderRecursive(type, folderId) {
    const items = new Set();
    // 特殊处理：未归类
    if (folderId === "__ungrouped__") {
      if (type === "chars") {
        for (const ch of getUncategorizedCharacters()) {
          items.add(ch.avatar);
        }
      } else {
        const resType =
          type === "presets"
            ? "presets"
            : type === "themes"
              ? "themes"
              : type === "backgrounds"
                ? "backgrounds"
                : "worldinfo";
        const groups = getResourceGroups(resType);
        const tree = getResFolderTree(resType);
        let allNames;
        if (type === "presets") {
          allNames = getCurrentPresets().map((p) => p.name);
        } else if (type === "themes") {
          allNames = getThemeNames();
        } else if (type === "backgrounds") {
          allNames = getBackgroundNames();
        } else {
          $("#world_editor_select option").each(function () {
            const v = $(this).val();
            const t = $(this).text();
            if (v !== "" && t !== "--- 选择以编辑 ---") items.add(t);
          });
          // 过滤掉已分组的
          for (const [name, fid] of Object.entries(groups)) {
            if (fid && tree[fid]) items.delete(name);
          }
          return items;
        }
        for (const name of allNames) {
          const grp = groups[name];
          if (!grp || !tree[grp]) items.add(name);
        }
      }
      return items;
    }
    if (type === "chars") {
      // 获取当前文件夹的角色
      for (const ch of getCharactersInFolder(folderId)) {
        items.add(ch.avatar);
      }
      // 递归子文件夹
      for (const childId of getChildFolders(folderId)) {
        for (const av of getAllItemsInFolderRecursive("chars", childId)) {
          items.add(av);
        }
      }
    } else {
      const resType =
        type === "presets"
          ? "presets"
          : type === "themes"
            ? "themes"
            : type === "backgrounds"
              ? "backgrounds"
              : "worldinfo";
      const groups = getResourceGroups(resType);
      for (const [name, fid] of Object.entries(groups)) {
        if (fid === folderId) items.add(name);
      }
      for (const childId of getResChildFolders(resType, folderId)) {
        for (const name of getAllItemsInFolderRecursive(type, childId)) {
          items.add(name);
        }
      }
    }
    return items;
  }

  /**
   * 应用原生界面过滤
   */
  function applyNativeFilter(type) {
    if (type === "chars") {
      applyCharFilter();
    } else if (type === "presets") {
      applyPresetFilter();
    } else if (type === "themes") {
      applyThemeFilter();
    } else if (type === "backgrounds") {
      applyBgFilter();
    } else {
      applyWorldInfoFilter();
    }
  }

  /**
   * 角色卡过滤：隐藏/显示 #rm_print_characters_block 中的角色卡
   */
  function applyCharFilter() {
    const block = $("#rm_print_characters_block");
    if (!nativeFilterChar) {
      // 显示全部
      block.find(".character_select").show();
      return;
    }
    const allowedAvatars = getAllItemsInFolderRecursive(
      "chars",
      nativeFilterChar,
    );
    const chars = getCharacters();
    block.find(".character_select").each(function () {
      const chid = $(this).attr("data-chid");
      if (chid !== undefined && chid !== null && chid !== "") {
        const char = chars[parseInt(chid)];
        if (char && allowedAvatars.has(char.avatar)) {
          $(this).show();
        } else {
          $(this).hide();
        }
      }
    });
  }

  // 缓存被 detach 的 option，用于恢复
  let _presetDetachedOptions = [];
  let _worldInfoDetachedOptions = [];
  let _themeDetachedOptions = [];
  let _bgDetachedElements = [];

  /**
   * 预设过滤：通过 detach/append option 实现过滤
   * 兼容原生 select、select2、以及第三方美化脚本
   */
  function applyPresetFilter() {
    const select = $("#settings_preset_openai");
    if (!select.length) return;
    // 同时处理 PresetManager 的 select（可能是同一个元素）
    const pm = getContext().getPresetManager();
    const targetSelect =
      pm && pm.select && pm.select.length ? pm.select : select;

    // 先恢复之前 detach 的 option
    if (_presetDetachedOptions.length > 0) {
      for (const opt of _presetDetachedOptions) {
        targetSelect.append(opt);
      }
      _presetDetachedOptions = [];
      // 按原始顺序排序（通过 value）
      _sortSelectOptions(targetSelect);
    }

    if (!nativeFilterPreset) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "presets",
      nativeFilterPreset,
    );
    // detach 不匹配的 option
    targetSelect.find("option").each(function () {
      const val = $(this).val();
      const text = $(this).text().trim();
      if (val === "" || val === "gui" || val === "default") return; // 保留默认选项
      if (!allowedNames.has(text)) {
        _presetDetachedOptions.push($(this).detach());
      }
    });
  }

  /**
   * 世界书过滤：通过 detach/append option 实现过滤
   */
  function applyWorldInfoFilter() {
    const select = $("#world_editor_select");
    if (!select.length) return;

    // 先恢复之前 detach 的 option
    if (_worldInfoDetachedOptions.length > 0) {
      // 如果有 select2，先销毁
      const hasSelect2 = select.hasClass("select2-hidden-accessible");
      for (const opt of _worldInfoDetachedOptions) {
        select.append(opt);
      }
      _worldInfoDetachedOptions = [];
      _sortSelectOptions(select);
      // 重建 select2
      if (hasSelect2) {
        try {
          select.select2("destroy");
        } catch (e) {
          /* ignore */
        }
        select.select2({
          placeholder: "--- Pick to Edit ---",
          allowClear: true,
        });
      }
    }

    if (!nativeFilterWorldInfo) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "worldinfo",
      nativeFilterWorldInfo,
    );
    const hasSelect2 = select.hasClass("select2-hidden-accessible");
    // detach 不匹配的 option
    select.find("option").each(function () {
      const val = $(this).val();
      const text = $(this).text().trim();
      if (val === "") return; // 保留默认占位选项
      if (!allowedNames.has(text)) {
        _worldInfoDetachedOptions.push($(this).detach());
      }
    });
    // 刷新 select2
    if (hasSelect2) {
      try {
        select.select2("destroy");
      } catch (e) {
        /* ignore */
      }
      select.select2({ placeholder: "--- Pick to Edit ---", allowClear: true });
    }
  }

  /**
   * 主题过滤：通过 detach/append option 实现过滤
   */
  function applyThemeFilter() {
    const select = $("#themes");
    if (!select.length) return;

    // 先恢复之前 detach 的 option
    if (_themeDetachedOptions.length > 0) {
      for (const opt of _themeDetachedOptions) {
        select.append(opt);
      }
      _themeDetachedOptions = [];
      _sortSelectOptions(select);
    }

    if (!nativeFilterTheme) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "themes",
      nativeFilterTheme,
    );
    // detach 不匹配的 option
    select.find("option").each(function () {
      const val = $(this).val();
      if (val === "") return; // 保留默认占位选项
      if (!allowedNames.has(val)) {
        _themeDetachedOptions.push($(this).detach());
      }
    });
  }

  /**
   * 背景过滤：通过 hide/show .bg_example 元素实现过滤
   */
  function applyBgFilter() {
    const container = $("#bg_menu_content");
    if (!container.length) return;

    // 先恢复之前隐藏的
    if (_bgDetachedElements.length > 0) {
      for (const el of _bgDetachedElements) {
        $(el).show();
      }
      _bgDetachedElements = [];
    }

    if (!nativeFilterBg) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "backgrounds",
      nativeFilterBg,
    );
    container.find(".bg_example").each(function () {
      const bgFile = $(this).attr("bgfile");
      if (!bgFile) return;
      if (!allowedNames.has(bgFile)) {
        $(this).hide();
        _bgDetachedElements.push(this);
      }
    });
  }

  /**
   * 辅助：按 option text 字母顺序排序 select 的 options
   */
  function _sortSelectOptions(selectEl) {
    const options = selectEl.find("option").detach();
    const placeholder = options.filter(function () {
      return (
        $(this).val() === "" ||
        $(this).val() === "gui" ||
        $(this).val() === "default"
      );
    });
    const rest = options.filter(function () {
      const v = $(this).val();
      return v !== "" && v !== "gui" && v !== "default";
    });
    rest.sort(function (a, b) {
      return $(a).text().trim().localeCompare($(b).text().trim());
    });
    selectEl.append(placeholder);
    selectEl.append(rest);
  }

  /**
   * 更新文件夹按钮的激活状态
   */
  function updateNativeFilterBtnState(type) {
    const filter =
      type === "chars"
        ? nativeFilterChar
        : type === "presets"
          ? nativeFilterPreset
          : type === "themes"
            ? nativeFilterTheme
            : type === "backgrounds"
              ? nativeFilterBg
              : nativeFilterWorldInfo;
    const btn = $(`.cfm-nf-btn[data-nf-type="${type}"]`);
    if (filter) {
      btn.addClass("cfm-nf-btn-active");
      let name;
      if (filter === "__ungrouped__") {
        name =
          type === "chars"
            ? "未归类角色"
            : type === "presets"
              ? "未归类预设"
              : type === "themes"
                ? "未归类主题"
                : type === "backgrounds"
                  ? "未归类背景"
                  : "未归类世界书";
      } else if (type === "chars") {
        name = getTagName(filter);
      } else {
        const resType =
          type === "presets"
            ? "presets"
            : type === "themes"
              ? "themes"
              : type === "backgrounds"
                ? "backgrounds"
                : "worldinfo";
        name = getResFolderDisplayName(resType, filter);
      }
      btn.attr("title", `文件夹过滤: ${name}`);
    } else {
      btn.removeClass("cfm-nf-btn-active");
      btn.attr("title", "文件夹过滤");
    }
  }

  /**
   * 注入原生界面文件夹过滤按钮
   */
  function injectNativeFilterButtons() {
    // 1. 角色卡列表 - 注入到 #rm_button_bar
    if ($("#rm_button_bar").length && !$("#rm_button_bar .cfm-nf-btn").length) {
      const charBtn = $(
        `<div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" data-nf-type="chars" title="文件夹过滤"></div>`,
      );
      $("#rm_button_bar #rm_buttons_container").after(charBtn);
      charBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="chars"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "chars");
      });
    }

    // 2. OpenAI 预设选择器 - 注入到 #settings_preset_openai 的父容器
    if (
      $("#settings_preset_openai").length &&
      !$("#settings_preset_openai").parent().find(".cfm-nf-btn").length
    ) {
      const presetBtn = $(
        `<div class="cfm-nf-btn menu_button menu_button_icon fa-solid fa-folder-tree" data-nf-type="presets" title="文件夹过滤"></div>`,
      );
      $("#settings_preset_openai").after(presetBtn);
      presetBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="presets"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "presets");
      });
    }

    // 3. 世界书选择器 - 注入到 #world_editor_select 旁
    if (
      $("#world_editor_select").length &&
      !$("#world_editor_select").parent().find(".cfm-nf-btn").length
    ) {
      const wiBtn = $(
        `<div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" data-nf-type="worldinfo" title="文件夹过滤"></div>`,
      );
      $("#world_editor_select").after(wiBtn);
      wiBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="worldinfo"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "worldinfo");
      });
    }

    // 4. 主题选择器 - 注入到 #themes 旁
    if (
      $("#themes").length &&
      !$("#themes").parent().find(".cfm-nf-btn").length
    ) {
      const themeBtn = $(
        `<div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" data-nf-type="themes" title="文件夹过滤"></div>`,
      );
      $("#themes").after(themeBtn);
      themeBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="themes"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "themes");
      });
    }

    // 5. 背景面板 - 注入到 #bg_tabs .heading-controls 的加减号旁边
    if (
      $("#bg_thumb_zoom_out").length &&
      !$("#bg_tabs .heading-controls .cfm-nf-btn").length
    ) {
      const bgBtn = $(
        `<div class="cfm-nf-btn menu_button menu_button_icon fa-solid fa-folder-tree" data-nf-type="backgrounds" title="文件夹过滤"></div>`,
      );
      bgBtn.insertBefore($("#bg_thumb_zoom_out"));
      bgBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="backgrounds"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "backgrounds");
      });
    }
  }

  // ==================== 初始化 ====================
  autoImportAllTags(); // 首次加载自动导入所有标签
  config = loadConfig(); // 刷新配置（autoImport可能改了settings）
  autoCleanRedundantTags(); // 自动清理多余的路径标签
  initButton();
  injectNativeFilterButtons();

  // 监听角色卡列表重新渲染事件，自动重新应用过滤
  const eventSource = getContext().eventSource;
  const event_types = getContext().eventTypes;
  if (eventSource && event_types) {
    // 角色卡列表翻页/重新渲染后重新应用过滤
    eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
      if (nativeFilterChar) {
        // 延迟一帧确保DOM已更新
        requestAnimationFrame(() => applyCharFilter());
      }
    });
  }

  console.log(`[${extensionName}] 酒馆资源管理器已加载`);
});
