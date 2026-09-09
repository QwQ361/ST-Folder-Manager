/**
 * 原生界面文件夹过滤
 * 集中管理所有 SillyTavern 原生界面的文件夹过滤功能：
 * - 文件夹树面板（buildNativeFolderTreeHtml / showNativeFolderPanel）
 * - 各类资源过滤（角色卡 / User / 预设 / 世界书 / 主题 / 背景 / 全局世界书）
 * - 原生过滤按钮注入
 * - 角色卡世界书连接面板的过滤增强
 *
 * 采用单例工厂模式：createNativeFiltersApiCore(deps) 返回包含全部方法的 API 对象。
 * index.js 通过 getNativeFiltersApi() 获取单例并转发薄包装。
 */

export function createNativeFiltersApiCore(deps) {
  const {
    $,
    window,
    cfmToastr,
    entitiesFilterRef, // () => entitiesFilter（index.js 中 let 变量）
    printCharactersDebounced,
    personasFilterRef, // () => personasFilter
    getUserAvatarsFuncRef, // () => getUserAvatarsFunc
    getCharacters,
    getCharactersInFolder,
    getChildFolders,
    getContext,
    getCurrentPresetName,
    getCurrentPresets,
    getFolderTagIds,
    getPersonaNote,
    getResChildFolders,
    getResFolderDisplayName,
    getResFolderIds,
    getResFolderTree,
    getResTopLevelFolders,
    getResourceGroups,
    getTagName,
    getThemeNames,
    getBackgroundNames,
    getTopLevelFolders,
    getUncategorizedCharacters,
    collectWorldInfoNamesFromDom,
    countCharsInFolderRecursive,
    escapeHtml,
    sortFolders,
    sortResFolders,
    showPresetDetailGroupPanel,
    showWiPresetPanel,
    setTimeoutFn,
    // 可变状态
    state,
  } = deps;

  // ==================== 内部状态访问器 ====================
  const getNativeFilterChar = () => state.nativeFilterChar;
  const setNativeFilterChar = (v) => {
    state.nativeFilterChar = v;
  };
  const getNativeFilterPreset = () => state.nativeFilterPreset;
  const setNativeFilterPreset = (v) => {
    state.nativeFilterPreset = v;
  };
  const getNativeFilterWorldInfo = () => state.nativeFilterWorldInfo;
  const setNativeFilterWorldInfo = (v) => {
    state.nativeFilterWorldInfo = v;
  };
  const getNativeFilterTheme = () => state.nativeFilterTheme;
  const setNativeFilterTheme = (v) => {
    state.nativeFilterTheme = v;
  };
  const getNativeFilterBg = () => state.nativeFilterBg;
  const setNativeFilterBg = (v) => {
    state.nativeFilterBg = v;
  };
  const getNativeFilterGlobalWI = () => state.nativeFilterGlobalWI;
  const setNativeFilterGlobalWI = (v) => {
    state.nativeFilterGlobalWI = v;
  };
  const getNativeFilterPersona = () => state.nativeFilterPersona;
  const setNativeFilterPersona = (v) => {
    state.nativeFilterPersona = v;
  };
  const getPresetDetachedOptions = () => state._presetDetachedOptions;
  const setPresetDetachedOptions = (v) => {
    state._presetDetachedOptions = v;
  };
  const getWorldInfoDetachedOptions = () => state._worldInfoDetachedOptions;
  const setWorldInfoDetachedOptions = (v) => {
    state._worldInfoDetachedOptions = v;
  };
  const getThemeDetachedOptions = () => state._themeDetachedOptions;
  const setThemeDetachedOptions = (v) => {
    state._themeDetachedOptions = v;
  };
  const getBgDetachedElements = () => state._bgDetachedElements;
  const setBgDetachedElements = (v) => {
    state._bgDetachedElements = v;
  };
  const getGlobalWIDetachedOptions = () => state._globalWIDetachedOptions;
  const setGlobalWIDetachedOptions = (v) => {
    state._globalWIDetachedOptions = v;
  };
  const getSelectOriginalOrder = () => state._selectOriginalOrder;
  const getCfmNativePresetGroupButtonObserver = () =>
    state.cfmNativePresetGroupButtonObserver;
  const setCfmNativePresetGroupButtonObserver = (v) => {
    state.cfmNativePresetGroupButtonObserver = v;
  };
  const getCfmNativePresetGroupButtonBootObserver = () =>
    state.cfmNativePresetGroupButtonBootObserver;
  const setCfmNativePresetGroupButtonBootObserver = (v) => {
    state.cfmNativePresetGroupButtonBootObserver = v;
  };

  // ==================== 资源类型归一化 ====================
  function resolveResType(type) {
    return type === "presets"
      ? "presets"
      : type === "themes"
        ? "themes"
        : type === "backgrounds"
          ? "backgrounds"
          : type === "personas"
            ? "personas"
            : "worldinfo";
  }

  // ==================== 文件夹树 HTML 构建 ====================
  /**
   * 构建原生文件夹树的 HTML（递归）
   * @param {string} type - 'chars' | 'presets' | 'themes' | 'backgrounds' | 'personas' | 'worldinfo'
   * @param {string|null} parentId - 父文件夹 id，null 表示顶层
   * @param {number} depth - 缩进深度
   * @param {Set} expandedSet - 展开状态集合
   * @param {string} activeId - 当前激活的文件夹 id
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
      const resType = resolveResType(type);
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
        const resType = resolveResType(type);
        const groups = getResourceGroups(resType);
        const tree = getResFolderTree(resType);
        let allItems;
        if (type === "presets") {
          allItems = getCurrentPresets().map((p) => p.name);
        } else if (type === "themes") {
          allItems = getThemeNames();
        } else if (type === "backgrounds") {
          allItems = getBackgroundNames();
        } else if (type === "personas") {
          allItems = [];
          $("#user_avatar_block .avatar-container").each(function () {
            const aid = $(this).attr("data-avatar-id");
            if (aid) allItems.push(aid);
          });
        } else {
          allItems = collectWorldInfoNamesFromDom();
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
      html += `<span class="cfm-nf-name">${type === "chars" ? "未归类角色" : type === "presets" ? "未归类预设" : type === "themes" ? "未归类主题" : type === "backgrounds" ? "未归类背景" : type === "personas" ? "未归类User" : "未归类世界书"}</span>`;
      html += `<span class="cfm-nf-count">${uncatCount}</span>`;
      html += `</div>`;
    }
    return html;
  }
  // ==================== 预设编辑文件夹过滤面板 ====================
  /**
   * 创建并显示预设编辑弹窗中的文件夹过滤浮动面板（用于快速回复/正则等编辑弹窗）
   * @param {jQuery} anchorEl - 锚点元素（文件夹图标按钮）
   * @param {Object} config - 面板配置
   */
  function showPresetEditFolderFilterPanel(anchorEl, config) {
    const {
      panelKey,
      folderTree,
      getDisplayName,
      getItemCount,
      ungroupedLabel,
      currentFilter,
      currentSelectedFilter = null,
      currentSelectedLabel = "当前选中",
      currentSelectedCount = null,
      onSelect,
    } = config;

    $(".cfm-nf-panel").remove();
    $(document).off(
      "mousedown.cfmPresetEditFolderPanel touchstart.cfmPresetEditFolderPanel",
    );

    if (!showPresetEditFolderFilterPanel._expanded)
      showPresetEditFolderFilterPanel._expanded = {};
    if (!showPresetEditFolderFilterPanel._expanded[panelKey])
      showPresetEditFolderFilterPanel._expanded[panelKey] = new Set();
    const expandedSet = showPresetEditFolderFilterPanel._expanded[panelKey];

    function buildHtml(parentId, depth, activeId) {
      const folderIds = Object.keys(folderTree)
        .filter((id) => folderTree[id].parentId === parentId)
        .sort((a, b) =>
          getDisplayName(a).localeCompare(getDisplayName(b), "zh-CN"),
        );
      let html = "";
      for (const fid of folderIds) {
        const children = Object.keys(folderTree).filter(
          (id) => folderTree[id].parentId === fid,
        );
        const hasChildren = children.length > 0;
        const isExpanded = expandedSet.has(fid);
        const isActive = fid === activeId;
        html += `<div class="cfm-nf-item${isActive ? " cfm-nf-active" : ""}" data-folder-id="${escapeHtml(fid)}" style="padding-left:${12 + depth * 16}px;">`;
        if (hasChildren) {
          html += `<span class="cfm-nf-arrow ${isExpanded ? "cfm-nf-expanded" : ""}" data-folder-id="${escapeHtml(fid)}"><i class="fa-solid fa-chevron-right"></i></span>`;
        } else {
          html += `<span class="cfm-nf-arrow-placeholder"></span>`;
        }
        html += `<i class="fa-solid fa-folder cfm-nf-icon"></i>`;
        html += `<span class="cfm-nf-name">${escapeHtml(getDisplayName(fid))}</span>`;
        html += `<span class="cfm-nf-count">${getItemCount(fid)}</span>`;
        html += `</div>`;
        if (hasChildren && isExpanded) {
          html += buildHtml(fid, depth + 1, activeId);
        }
      }
      if (parentId === null) {
        const isUncatActive = activeId === "__ungrouped__";
        html += `<div class="cfm-nf-item cfm-nf-uncat${isUncatActive ? " cfm-nf-active" : ""}" data-folder-id="__ungrouped__" style="padding-left:12px;">`;
        html += `<span class="cfm-nf-arrow-placeholder"></span>`;
        html += `<i class="fa-solid fa-box-open cfm-nf-icon"></i>`;
        html += `<span class="cfm-nf-name">${escapeHtml(ungroupedLabel)}</span>`;
        html += `<span class="cfm-nf-count">${getItemCount("__ungrouped__")}</span>`;
        html += `</div>`;
      }
      return html;
    }

    const panel = $(
      `<div class="cfm-nf-panel" data-preset-folder-panel="${escapeHtml(panelKey)}"></div>`,
    );
    panel.css("z-index", 100001);
    const toolbar = $(
      `<div class="cfm-nf-toolbar">
        <span class="cfm-nf-title"><i class="fa-solid fa-folder-tree"></i> 文件夹过滤</span>
        <span class="cfm-nf-toolbar-actions">
          <i class="fa-solid fa-angles-down cfm-nf-expand-all" title="展开全部"></i>
          <i class="fa-solid fa-angles-up cfm-nf-collapse-all" title="收起全部"></i>
        </span>
      </div>`,
    );
    const showAllBtn =
      $(`<div class="cfm-nf-item cfm-nf-show-all${!currentFilter || currentFilter === "__all__" ? " cfm-nf-active" : ""}">
      <i class="fa-solid fa-layer-group cfm-nf-icon"></i>
      <span class="cfm-nf-name">显示全部</span>
    </div>`);
    const effectiveCurrentSelectedFilter =
      currentSelectedFilter === "__ungrouped__"
        ? "__ungrouped__"
        : currentSelectedFilter && currentSelectedFilter !== "__all__"
          ? currentSelectedFilter
          : null;
    const effectiveCurrentSelectedLabel =
      effectiveCurrentSelectedFilter === "__ungrouped__"
        ? ungroupedLabel
        : currentSelectedLabel ||
          (effectiveCurrentSelectedFilter
            ? getDisplayName(effectiveCurrentSelectedFilter)
            : "当前选中");
    const effectiveCurrentSelectedCount = effectiveCurrentSelectedFilter
      ? (currentSelectedCount ?? getItemCount(effectiveCurrentSelectedFilter))
      : null;
    const currentSelectedBtn = effectiveCurrentSelectedFilter
      ? $(`<div class="cfm-nf-item cfm-nf-current-selected${currentFilter === effectiveCurrentSelectedFilter ? " cfm-nf-active" : ""}" data-folder-id="${escapeHtml(effectiveCurrentSelectedFilter)}">
      <i class="fa-solid fa-location-crosshairs cfm-nf-icon"></i>
      <span class="cfm-nf-name">${escapeHtml(effectiveCurrentSelectedLabel)}</span>
      <span class="cfm-nf-count">${effectiveCurrentSelectedCount}</span>
    </div>`)
      : null;
    const treeContainer = $('<div class="cfm-nf-tree"></div>');

    function renderTree(activeId) {
      treeContainer.html(buildHtml(null, 0, activeId));
    }

    renderTree(currentFilter);
    if (currentSelectedBtn) {
      panel.append(toolbar, showAllBtn, currentSelectedBtn, treeContainer);
    } else {
      panel.append(toolbar, showAllBtn, treeContainer);
    }
    panel.on("mousedown mouseup click touchstart touchend", (e) =>
      e.stopPropagation(),
    );
    $("body").append(panel);

    const anchorRect = anchorEl[0].getBoundingClientRect();
    let left = anchorRect.left;
    const panelWidth = panel.outerWidth();
    const panelHeight = panel.outerHeight();
    if (left + panelWidth > window.innerWidth)
      left = window.innerWidth - panelWidth - 8;
    if (left < 4) left = 4;
    const spaceBelow = window.innerHeight - anchorRect.bottom - 4;
    const spaceAbove = anchorRect.top - 4;
    let top;
    if (panelHeight <= spaceBelow || spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + 4;
    } else {
      top = anchorRect.top - panelHeight - 4;
    }
    if (top < 4) top = 4;
    panel.css({ top: `${top}px`, left: `${left}px` });

    panel.on("click", ".cfm-nf-arrow", function (e) {
      e.stopPropagation();
      const fid = $(this).attr("data-folder-id");
      if (expandedSet.has(fid)) expandedSet.delete(fid);
      else expandedSet.add(fid);
      renderTree(currentFilter);
    });

    toolbar.find(".cfm-nf-expand-all").on("click", function (e) {
      e.stopPropagation();
      Object.keys(folderTree).forEach((id) => expandedSet.add(id));
      renderTree(currentFilter);
    });

    toolbar.find(".cfm-nf-collapse-all").on("click", function (e) {
      e.stopPropagation();
      expandedSet.clear();
      renderTree(currentFilter);
    });

    showAllBtn.on("click", function (e) {
      e.stopPropagation();
      onSelect("__all__");
      panel.remove();
      $(document).off(
        "mousedown.cfmPresetEditFolderPanel touchstart.cfmPresetEditFolderPanel",
      );
    });

    panel.on("click", ".cfm-nf-item", function (e) {
      if ($(e.target).closest(".cfm-nf-arrow").length) return;
      e.stopPropagation();
      onSelect($(this).attr("data-folder-id") || "__all__");
      panel.remove();
      $(document).off(
        "mousedown.cfmPresetEditFolderPanel touchstart.cfmPresetEditFolderPanel",
      );
    });

    setTimeoutFn(() => {
      $(document).on(
        "mousedown.cfmPresetEditFolderPanel touchstart.cfmPresetEditFolderPanel",
        function (e) {
          if (!$(e.target).closest(".cfm-nf-panel, .cfm-nf-btn").length) {
            $(".cfm-nf-panel").remove();
            $(document).off(
              "mousedown.cfmPresetEditFolderPanel touchstart.cfmPresetEditFolderPanel",
            );
          }
        },
      );
    }, 0);
  }
  // ==================== 原生文件夹浮动面板 ====================
  /**
   * 创建并显示原生界面文件夹浮动面板
   * @param {jQuery} anchorEl - 锚点元素（文件夹图标按钮）
   * @param {string} type - 'chars' | 'presets' | 'worldinfo' | 'themes'
   */
  function showNativeFolderPanel(anchorEl, type) {
    // 移除已有面板
    $(".cfm-nf-panel").remove();

    // globalworldinfo 共享 worldinfo 的文件夹结构
    const treeType = type === "globalworldinfo" ? "worldinfo" : type;

    const currentFilter =
      type === "chars"
        ? getNativeFilterChar()
        : type === "presets"
          ? getNativeFilterPreset()
          : type === "themes"
            ? getNativeFilterTheme()
            : type === "backgrounds"
              ? getNativeFilterBg()
              : type === "personas"
                ? getNativeFilterPersona()
                : type === "globalworldinfo"
                  ? getNativeFilterGlobalWI()
                  : getNativeFilterWorldInfo();

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
      buildNativeFolderTreeHtml(treeType, null, 0, expandedSet, currentFilter),
    );
    panel.append(treeContainer);

    // 阻止面板内的所有鼠标事件冒泡，防止酒馆原生面板关闭逻辑被触发
    panel.on("mousedown mouseup click touchstart touchend", function (e) {
      e.stopPropagation();
    });

    // 定位面板
    $("body").append(panel);
    const anchorRect = anchorEl[0].getBoundingClientRect();
    let left = anchorRect.left;
    // 确保不超出视口
    const panelWidth = panel.outerWidth();
    const panelHeight = panel.outerHeight();
    if (left + panelWidth > window.innerWidth)
      left = window.innerWidth - panelWidth - 8;
    if (left < 4) left = 4;
    const spaceBelow = window.innerHeight - anchorRect.bottom - 4;
    const spaceAbove = anchorRect.top - 4;
    let top;
    if (panelHeight <= spaceBelow || spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + 4;
    } else {
      top = anchorRect.top - panelHeight - 4;
    }
    if (top < 4) top = 4;
    panel.css({ top: top + "px", left: left + "px" });

    // 事件：展开/收起箭头
    panel.on("click", ".cfm-nf-arrow", function (e) {
      e.stopPropagation();
      const fid = $(this).attr("data-folder-id");
      if (expandedSet.has(fid)) expandedSet.delete(fid);
      else expandedSet.add(fid);
      treeContainer.html(
        buildNativeFolderTreeHtml(
          treeType,
          null,
          0,
          expandedSet,
          currentFilter,
        ),
      );
    });

    // 事件：展开全部
    toolbar.find(".cfm-nf-expand-all").on("click", function (e) {
      e.stopPropagation();
      let allIds;
      if (type === "chars") {
        allIds = getFolderTagIds();
      } else {
        allIds = getResFolderIds(treeType);
      }
      allIds.forEach((id) => expandedSet.add(id));
      treeContainer.html(
        buildNativeFolderTreeHtml(
          treeType,
          null,
          0,
          expandedSet,
          currentFilter,
        ),
      );
    });

    // 事件：收起全部
    toolbar.find(".cfm-nf-collapse-all").on("click", function (e) {
      e.stopPropagation();
      expandedSet.clear();
      treeContainer.html(
        buildNativeFolderTreeHtml(
          treeType,
          null,
          0,
          expandedSet,
          currentFilter,
        ),
      );
    });

    // 事件：点击"显示全部"
    showAllBtn.on("click", function () {
      if (type === "chars") setNativeFilterChar(null);
      else if (type === "presets") setNativeFilterPreset(null);
      else if (type === "themes") setNativeFilterTheme(null);
      else if (type === "backgrounds") setNativeFilterBg(null);
      else if (type === "personas") setNativeFilterPersona(null);
      else if (type === "globalworldinfo") setNativeFilterGlobalWI(null);
      else setNativeFilterWorldInfo(null);
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
      if (type === "chars") setNativeFilterChar(fid);
      else if (type === "presets") setNativeFilterPreset(fid);
      else if (type === "themes") setNativeFilterTheme(fid);
      else if (type === "backgrounds") setNativeFilterBg(fid);
      else if (type === "personas") setNativeFilterPersona(fid);
      else if (type === "globalworldinfo") setNativeFilterGlobalWI(fid);
      else setNativeFilterWorldInfo(fid);
      applyNativeFilter(type);
      panel.remove();
      $(document).off("mousedown.cfmNfPanel touchstart.cfmNfPanel");
      updateNativeFilterBtnState(type);
    });

    // 点击外部关闭
    setTimeoutFn(() => {
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
  // ==================== 递归获取文件夹下所有资源 ====================
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
        const resType = resolveResType(type);
        const groups = getResourceGroups(resType);
        const tree = getResFolderTree(resType);
        let allNames;
        if (type === "presets") {
          allNames = getCurrentPresets().map((p) => p.name);
        } else if (type === "themes") {
          allNames = getThemeNames();
        } else if (type === "backgrounds") {
          allNames = getBackgroundNames();
        } else if (type === "personas") {
          allNames = [];
          $("#user_avatar_block .avatar-container").each(function () {
            const aid = $(this).attr("data-avatar-id");
            if (aid) allNames.push(aid);
          });
        } else {
          $("#world_editor_select option").each(function () {
            const v = $(this).val();
            const t = $(this).text();
            if (v !== "" && t !== "--- 选择以编辑 ---") items.add(t);
          });
          // 如果原生过滤激活，被 detach 的 option 也要加入
          if (
            getWorldInfoDetachedOptions() &&
            getWorldInfoDetachedOptions().length > 0
          ) {
            for (const opt of getWorldInfoDetachedOptions()) {
              const v = $(opt).val();
              const t = $(opt).text();
              if (v !== "" && t !== "--- 选择以编辑 ---") items.add(t);
            }
          }
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
      const resType = resolveResType(type);
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

  // ==================== 过滤分发 ====================
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
    } else if (type === "personas") {
      applyPersonaFilter();
    } else if (type === "globalworldinfo") {
      applyGlobalWorldInfoFilter();
    } else {
      applyWorldInfoFilter();
    }
  }

  /**
   * 角色卡过滤：通过 entitiesFilter 在数据层进行过滤（分页前），
   * 回退方案为 DOM 级 show/hide（仅在 entitiesFilter 不可用时使用）
   */
  function applyCharFilter() {
    // 优先使用 entitiesFilter（数据层过滤，兼容分页）
    const entitiesFilter = entitiesFilterRef();
    if (entitiesFilter && printCharactersDebounced) {
      if (!getNativeFilterChar()) {
        // 清除自定义过滤函数，恢复显示全部
        delete entitiesFilter.filterFunctions["cfm_char_folder"];
      } else {
        // 注册/更新自定义过滤函数
        const allowedAvatars = getAllItemsInFolderRecursive(
          "chars",
          getNativeFilterChar(),
        );
        entitiesFilter.filterFunctions["cfm_char_folder"] = (entities) => {
          return entities.filter((entity) => {
            // 保留非角色类型的实体（如 tag 类型的文件夹分隔符等）
            if (entity.type !== "character") return true;
            // 角色实体：检查 avatar 是否在允许列表中
            const avatar = entity.item?.avatar;
            return avatar && allowedAvatars.has(avatar);
          });
        };
      }
      // 触发重新渲染（过滤在 getEntitiesList -> applyFilters 中执行，分页前生效）
      printCharactersDebounced();
      return;
    }

    // 回退方案：DOM 级过滤（entitiesFilter 不可用时）
    const block = $("#rm_print_characters_block");
    if (!getNativeFilterChar()) {
      block.find(".character_select").show();
      return;
    }
    const allowedAvatars = getAllItemsInFolderRecursive(
      "chars",
      getNativeFilterChar(),
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

  /**
   * User过滤：通过 personasFilter 在数据级过滤 persona
   * 确保过滤在分页之前执行，解决文件夹过滤与分页不兼容的问题
   */
  function applyPersonaFilter() {
    const personasFilter = personasFilterRef();
    const getUserAvatarsFunc = getUserAvatarsFuncRef();
    if (personasFilter && getUserAvatarsFunc) {
      // 数据级过滤模式：注册/注销 personasFilter 的自定义过滤函数
      if (!getNativeFilterPersona()) {
        // 取消过滤：移除自定义过滤函数
        delete personasFilter.filterFunctions["cfm_persona_folder"];
      } else {
        // 应用过滤：注册自定义过滤函数
        const allowedAvatarIds = getAllItemsInFolderRecursive(
          "personas",
          getNativeFilterPersona(),
        );
        personasFilter.filterFunctions["cfm_persona_folder"] = (entities) => {
          return entities.filter((avatarId) => allowedAvatarIds.has(avatarId));
        };
      }
      // 触发重新渲染（getUserAvatars 内部会调用 personasFilter.applyFilters）
      getUserAvatarsFunc(true);
      return;
    }

    // 回退方案：DOM 级过滤（当无法导入 personas.js 时使用）
    const block = $("#user_avatar_block");
    if (!getNativeFilterPersona()) {
      // 显示全部
      block.find(".avatar-container").show();
      return;
    }
    const allowedAvatarIds = getAllItemsInFolderRecursive(
      "personas",
      getNativeFilterPersona(),
    );
    block.find(".avatar-container").each(function () {
      const aid = $(this).attr("data-avatar-id");
      if (aid) {
        if (allowedAvatarIds.has(aid)) {
          $(this).show();
        } else {
          $(this).hide();
        }
      }
    });
  }
  // ==================== 各类资源过滤 ====================
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

    // 保存原始 option 顺序（仅首次）
    _saveSelectOriginalOrder(targetSelect);

    // 先恢复之前 detach 的 option
    if (getPresetDetachedOptions().length > 0) {
      for (const opt of getPresetDetachedOptions()) {
        targetSelect.append(opt);
      }
      setPresetDetachedOptions([]);
      // 按原始顺序排序（通过 value）
      _sortSelectOptions(targetSelect);
    }

    if (!getNativeFilterPreset()) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "presets",
      getNativeFilterPreset(),
    );
    // detach 不匹配的 option
    targetSelect.find("option").each(function () {
      const val = $(this).val();
      const text = $(this).text().trim();
      if (val === "" || val === "gui" || val === "default") return; // 保留默认选项
      if (!allowedNames.has(text)) {
        const detached = [];
        detached.push($(this).detach());
        setPresetDetachedOptions(getPresetDetachedOptions().concat(detached));
      }
    });
  }

  /**
   * 世界书过滤：通过 detach/append option 实现过滤
   */
  function applyWorldInfoFilter() {
    const select = $("#world_editor_select");
    if (!select.length) return;

    // 保存原始 option 顺序（仅首次）
    _saveSelectOriginalOrder(select);

    // 先恢复之前 detach 的 option
    if (getWorldInfoDetachedOptions().length > 0) {
      // 如果有 select2，先销毁
      const hasSelect2 = select.hasClass("select2-hidden-accessible");
      for (const opt of getWorldInfoDetachedOptions()) {
        select.append(opt);
      }
      setWorldInfoDetachedOptions([]);
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

    if (!getNativeFilterWorldInfo()) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "worldinfo",
      getNativeFilterWorldInfo(),
    );
    const hasSelect2 = select.hasClass("select2-hidden-accessible");
    // detach 不匹配的 option
    select.find("option").each(function () {
      const val = $(this).val();
      const text = $(this).text().trim();
      if (val === "") return; // 保留默认占位选项
      if (!allowedNames.has(text)) {
        const detached = [];
        detached.push($(this).detach());
        setWorldInfoDetachedOptions(
          getWorldInfoDetachedOptions().concat(detached),
        );
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

  function clearWorldInfoNativeFilter() {
    if (!getNativeFilterWorldInfo() && getWorldInfoDetachedOptions().length === 0)
      return;
    setNativeFilterWorldInfo(null);
    applyWorldInfoFilter();
    updateNativeFilterBtnState("worldinfo");
  }

  function setupWorldInfoButtonAutoShowAll() {
    const handler = (ev) => {
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      const btn = target.closest("#world_button, #world-info-button");
      if (!btn) return;
      clearWorldInfoNativeFilter();
    };
    document.addEventListener("click", handler, true);
    document.addEventListener("touchend", handler, true);
  }

  /**
   * 主题过滤：通过 detach/append option 实现过滤
   */
  function applyThemeFilter() {
    const select = $("#themes");
    if (!select.length) return;

    // 保存原始 option 顺序（仅首次）
    _saveSelectOriginalOrder(select);

    // 先恢复之前 detach 的 option
    if (getThemeDetachedOptions().length > 0) {
      for (const opt of getThemeDetachedOptions()) {
        select.append(opt);
      }
      setThemeDetachedOptions([]);
      _sortSelectOptions(select);
    }

    if (!getNativeFilterTheme()) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "themes",
      getNativeFilterTheme(),
    );
    // detach 不匹配的 option
    select.find("option").each(function () {
      const val = $(this).val();
      if (val === "") return; // 保留默认占位选项
      if (!allowedNames.has(val)) {
        const detached = [];
        detached.push($(this).detach());
        setThemeDetachedOptions(getThemeDetachedOptions().concat(detached));
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
    if (getBgDetachedElements().length > 0) {
      for (const el of getBgDetachedElements()) {
        $(el).show();
      }
      setBgDetachedElements([]);
    }

    if (!getNativeFilterBg()) return;

    const allowedNames = getAllItemsInFolderRecursive(
      "backgrounds",
      getNativeFilterBg(),
    );
    container.find(".bg_example").each(function () {
      const bgFile = $(this).attr("bgfile");
      if (!bgFile) return;
      if (!allowedNames.has(bgFile)) {
        $(this).hide();
        const els = [];
        els.push(this);
        setBgDetachedElements(getBgDetachedElements().concat(els));
      }
    });
  }

  // ==================== select 辅助函数 ====================
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
    // 优先按保存的原始顺序还原，保持与 SillyTavern 原生排序一致
    const selId = selectEl.attr("id") || "";
    const origOrder = getSelectOriginalOrder().get(selId);
    if (origOrder && origOrder.length > 0) {
      const orderMap = new Map();
      origOrder.forEach((v, i) => orderMap.set(v, i));
      rest.sort(function (a, b) {
        const va = $(a).val();
        const vb = $(b).val();
        const ia = orderMap.has(va) ? orderMap.get(va) : 999999;
        const ib = orderMap.has(vb) ? orderMap.get(vb) : 999999;
        if (ia !== ib) return ia - ib;
        // 新增的 option（不在原始顺序中）按 localeCompare 排在末尾
        return $(a).text().trim().localeCompare($(b).text().trim(), "zh-CN");
      });
    } else {
      rest.sort(function (a, b) {
        return $(a).text().trim().localeCompare($(b).text().trim(), "zh-CN");
      });
    }
    selectEl.append(placeholder);
    selectEl.append(rest);
  }

  /**
   * 保存 select 的原始 option 顺序（仅首次保存）
   */
  function _saveSelectOriginalOrder(selectEl) {
    const selId = selectEl.attr("id") || "";
    if (!selId || getSelectOriginalOrder().has(selId)) return;
    const order = [];
    selectEl.find("option").each(function () {
      const v = $(this).val();
      if (v !== "" && v !== "gui" && v !== "default") order.push(v);
    });
    if (order.length > 0) getSelectOriginalOrder().set(selId, order);
  }

  // ==================== 文件夹按钮激活状态 ====================
  /**
   * 更新文件夹按钮的激活状态
   */
  function updateNativeFilterBtnState(type) {
    const filter =
      type === "chars"
        ? getNativeFilterChar()
        : type === "presets"
          ? getNativeFilterPreset()
          : type === "themes"
            ? getNativeFilterTheme()
            : type === "backgrounds"
              ? getNativeFilterBg()
              : type === "personas"
                ? getNativeFilterPersona()
                : type === "globalworldinfo"
                  ? getNativeFilterGlobalWI()
                  : getNativeFilterWorldInfo();
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
                  : type === "personas"
                    ? "未归类User"
                    : "未归类世界书";
      } else if (type === "chars") {
        name = getTagName(filter);
      } else {
        const resType = resolveResType(type);
        name = getResFolderDisplayName(resType, filter);
      }
      btn.attr("title", `文件夹过滤: ${name}`);
    } else {
      btn.removeClass("cfm-nf-btn-active");
      btn.attr("title", "文件夹过滤");
    }
  }
  // ==================== 预设分组按钮注入 ====================
  function injectNativePresetGroupButton() {
    const header = $(
      "#completion_prompt_manager .completion_prompt_manager_header",
    ).first();
    if (!header.length) return false;

    const promptBlock = header
      .find(".completion_prompt_manager_header_advanced")
      .first();
    if (!promptBlock.length) return false;
    if (promptBlock.find(".cfm-native-preset-group-btn").length) return true;

    const btn = $(
      `<span class="cfm-native-preset-group-btn menu_button menu_button_icon fa-solid fa-layer-group" title="预设条目激活分组" style="margin-left:0.35em;display:flex;align-items:center;"></span>`,
    );
    promptBlock.append(btn);
    btn.on("click touchend", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      const presetName = getCurrentPresetName();
      if (!presetName) {
        cfmToastr.warning("请先选择一个预设");
        return;
      }
      await showPresetDetailGroupPanel(presetName);
    });
    return true;
  }

  function setupNativePresetGroupButtonObserver() {
    const attachObserver = () => {
      const root = document.querySelector("#completion_prompt_manager");
      if (!root) return false;
      if (getCfmNativePresetGroupButtonObserver()) {
        injectNativePresetGroupButton();
        return true;
      }
      const observer = new MutationObserver(() => {
        injectNativePresetGroupButton();
      });
      setCfmNativePresetGroupButtonObserver(observer);
      observer.observe(root, {
        childList: true,
        subtree: true,
      });
      injectNativePresetGroupButton();
      return true;
    };

    if (attachObserver()) return;
    if (getCfmNativePresetGroupButtonBootObserver()) return;

    const bootObserver = new MutationObserver(() => {
      if (attachObserver()) {
        bootObserver.disconnect();
        setCfmNativePresetGroupButtonBootObserver(null);
      }
    });
    setCfmNativePresetGroupButtonBootObserver(bootObserver);
    bootObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ==================== 过滤按钮注入 ====================
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
        `<div class="cfm-nf-btn menu_button menu_button_icon fa-solid fa-folder-tree" data-nf-type="themes" title="文件夹过滤"></div>`,
      );
      // 插入到原生导入按钮的左边
      if ($("#ui_preset_import_button").length) {
        $("#ui_preset_import_button").before(themeBtn);
      } else {
        $("#themes").after(themeBtn);
      }
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

    // 6. 全局世界书选择器 - 注入到 #world_info 的 .range-block-range 容器
    if (
      $("#world_info").length &&
      !$("#world_info").closest(".range-block-range").find(".cfm-nf-btn").length
    ) {
      const globalWIBtn = $(
        `<div class="cfm-nf-btn menu_button menu_button_icon fa-solid fa-folder-tree" data-nf-type="globalworldinfo" title="文件夹过滤" style="flex-shrink:0;"></div>`,
      );
      const globalWIGroupBtn = $(
        `<div class="cfm-native-global-wi-group-btn menu_button menu_button_icon fa-solid fa-layer-group" title="世界书激活分组" style="flex-shrink:0;"></div>`,
      );
      const rangeBlock = $("#world_info").closest(".range-block-range");
      rangeBlock.css({ display: "flex", alignItems: "center", gap: "4px" });
      // 把 select2 容器设为 flex:1
      rangeBlock.find(".select2-container").css({ flex: "1", minWidth: "0" });
      const toolColumn = $(
        `<div class="cfm-native-global-wi-tool-column" style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;"></div>`,
      );
      toolColumn.append(globalWIBtn, globalWIGroupBtn);
      rangeBlock.append(toolColumn);
      globalWIGroupBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showWiPresetPanel();
      });
      globalWIBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="globalworldinfo"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "globalworldinfo");
      });
    }

    // 7. User/Persona 面板 - 注入到搜索栏与排序下拉框之间
    if (
      $("#persona_sort_order").length &&
      !$("#persona_sort_order")
        .parent()
        .find(".cfm-nf-btn[data-nf-type='personas']").length
    ) {
      const personaBtn = $(
        `<div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" data-nf-type="personas" title="文件夹过滤" style="display:inline-block;margin:2px 4px;"></div>`,
      );
      $("#persona_sort_order").before(personaBtn);
      personaBtn.on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.cfm-nf-panel[data-nf-type="personas"]').length) {
          $(".cfm-nf-panel").remove();
          return;
        }
        showNativeFolderPanel($(this), "personas");
      });
    }
  }

  /**
   * 全局世界书过滤：通过 detach/append option 实现过滤
   * 类似 applyWorldInfoFilter 但目标是 #world_info（select2 多选）
   */
  function applyGlobalWorldInfoFilter() {
    const select = $("#world_info");
    if (!select.length) return;

    // 保存原始 option 顺序（仅首次）
    _saveSelectOriginalOrder(select);

    // 先 destroy select2
    const hasSelect2 = select.hasClass("select2-hidden-accessible");
    if (hasSelect2) {
      try {
        select.select2("destroy");
      } catch (e) {
        /* ignore */
      }
    }

    // 恢复之前 detach 的 option
    if (getGlobalWIDetachedOptions().length > 0) {
      for (const opt of getGlobalWIDetachedOptions()) {
        select.append(opt);
      }
      setGlobalWIDetachedOptions([]);
      _sortSelectOptions(select);
    }

    if (getNativeFilterGlobalWI()) {
      const allowedNames = getAllItemsInFolderRecursive(
        "worldinfo",
        getNativeFilterGlobalWI(),
      );
      // detach 不匹配的 option（已选中的不移除，保留用户已激活的世界书）
      select.find("option").each(function () {
        const val = $(this).val();
        const text = $(this).text().trim();
        if (val === "") return; // 保留空值占位选项
        if ($(this).prop("selected")) return; // 保留已选中的
        if (!allowedNames.has(text)) {
          const detached = [];
          detached.push($(this).detach());
          setGlobalWIDetachedOptions(
            getGlobalWIDetachedOptions().concat(detached),
          );
        }
      });
    }

    // 重新初始化 select2
    if (hasSelect2 || select.attr("multiple")) {
      try {
        select.select2({
          width: "100%",
          placeholder: "No Worlds active. Click here to select.",
          allowClear: true,
          closeOnSelect: false,
        });
      } catch (e) {
        /* ignore select2 init error */
      }
      // 更新 flex 样式（select2 重建后容器会变）
      const rangeBlock = select.closest(".range-block-range");
      if (rangeBlock.length) {
        rangeBlock.find(".select2-container").css({ flex: "1", minWidth: "0" });
      }
    }
  }
  // ==================== 角色卡世界书连接面板 - 文件夹过滤 ====================
  /**
   * 增强原生 Persona 选择弹窗：竖向列表布局 + 显示备注
   * 当角色绑定多个 persona 时，酒馆会弹出 askForPersonaSelection 弹窗，
   * 其中 .persona-list 容器默认是横向 flex wrap 排列。
   * 本函数通过 MutationObserver 监听该容器出现，将其改为竖向列表并追加备注。
   */
  function setupPersonaSelectionPopupEnhancer() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          // 检测弹窗中的 .persona-list 容器
          const personaList = node.classList?.contains("persona-list")
            ? node
            : node.querySelector?.(".persona-list");
          if (!personaList) continue;
          // 避免重复处理
          if (personaList.classList.contains("cfm-persona-popup-enhanced"))
            continue;
          personaList.classList.add("cfm-persona-popup-enhanced");
          enhancePersonaPopupList(personaList);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * 对 persona 选择弹窗列表进行增强处理
   * @param {HTMLElement} listEl - .persona-list 容器元素
   */
  function enhancePersonaPopupList(listEl) {
    const pu = getContext().powerUserSettings;
    if (!pu) return;
    const avatarBlocks = listEl.querySelectorAll(
      '.avatar[data-type="persona"]',
    );
    avatarBlocks.forEach((block) => {
      const pid = block.dataset.pid;
      if (!pid) return;
      // 创建信息容器
      const infoDiv = document.createElement("div");
      infoDiv.className = "cfm-persona-popup-info";
      // 名称
      const personaName = (pu.personas && pu.personas[pid]) || pid;
      const nameSpan = document.createElement("span");
      nameSpan.className = "cfm-persona-popup-name";
      nameSpan.textContent = personaName;
      infoDiv.appendChild(nameSpan);
      // 备注
      const note = getPersonaNote(pid);
      if (note) {
        const noteSpan = document.createElement("span");
        noteSpan.className = "cfm-persona-popup-note";
        noteSpan.textContent = note;
        noteSpan.title = "备注: " + note;
        infoDiv.appendChild(noteSpan);
      }
      // 将 avatar 块包裹成行布局
      const wrapper = document.createElement("div");
      wrapper.className = "cfm-persona-popup-row";
      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);
      wrapper.appendChild(infoDiv);
      // 点击 wrapper 的非 avatar 区域时，转发点击到 avatar 块
      wrapper.addEventListener("click", (e) => {
        if (e.target === block || block.contains(e.target)) return;
        block.click();
      });
    });
  }

  /**
   * 在角色卡「更多」→「连接到世界书」弹窗中注入文件夹过滤按钮
   * 该弹窗每次都是动态创建的（从 #character_world_template 克隆），
   * 因此需要用 MutationObserver 监听 .character_world 容器出现
   */
  function setupCharWorldPopupFilterObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          // 检测弹窗中的 .character_world 容器
          const charWorldEl = node.classList?.contains("character_world")
            ? node
            : node.querySelector?.(".character_world");
          if (!charWorldEl) continue;
          // 在主世界书选择器旁注入过滤按钮
          injectCharWorldFilterBtn(
            $(charWorldEl).find(".character_world_info_selector"),
            "primary",
          );
          // 在辅助世界书选择器旁注入过滤按钮
          injectCharWorldFilterBtn(
            $(charWorldEl).find(".character_extra_world_info_selector"),
            "extras",
          );
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * 在角色卡世界书选择器旁注入文件夹过滤按钮
   * @param {jQuery} selectEl - 选择器元素
   * @param {string} kind - 'primary' | 'extras'
   */
  function injectCharWorldFilterBtn(selectEl, kind) {
    if (!selectEl.length) return;
    const parent = selectEl.closest(".range-block-range");
    if (!parent.length) return;
    // 防止重复注入
    if (parent.find(".cfm-nf-btn").length) return;

    // 使 parent 变成 flex 布局以容纳按钮
    parent.css({ display: "flex", alignItems: "center", gap: "4px" });
    selectEl.css({ flex: "1", minWidth: "0" });

    const btn = $(
      `<div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" data-nf-kind="${kind}" title="文件夹过滤" style="flex-shrink:0;padding:4px 6px;"></div>`,
    );
    parent.append(btn);

    // 过滤状态（临时，弹窗关闭后自然销毁）
    let currentFilter = null;

    btn.on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 如果面板已存在，关闭
      if ($(`.cfm-nf-panel[data-nf-kind="${kind}"]`).length) {
        $(".cfm-nf-panel").remove();
        return;
      }
      $(".cfm-nf-panel").remove();

      // 展开状态
      if (!showNativeFolderPanel._expanded)
        showNativeFolderPanel._expanded = {};
      if (!showNativeFolderPanel._expanded["charworld_" + kind])
        showNativeFolderPanel._expanded["charworld_" + kind] = new Set();
      const expandedSet = showNativeFolderPanel._expanded["charworld_" + kind];

      const panel = $(
        `<div class="cfm-nf-panel" data-nf-type="worldinfo" data-nf-kind="${kind}"></div>`,
      );

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
      const showAllBtn = $(
        `<div class="cfm-nf-item cfm-nf-show-all${!currentFilter ? " cfm-nf-active" : ""}">
        <i class="fa-solid fa-layer-group cfm-nf-icon"></i>
        <span class="cfm-nf-name">显示全部</span>
      </div>`,
      );
      panel.append(showAllBtn);

      // 文件夹树
      const treeContainer = $(`<div class="cfm-nf-tree"></div>`);
      treeContainer.html(
        buildNativeFolderTreeHtml(
          "worldinfo",
          null,
          0,
          expandedSet,
          currentFilter,
        ),
      );
      panel.append(treeContainer);

      // 阻止冒泡
      panel.on("mousedown mouseup click touchstart touchend", function (ev) {
        ev.stopPropagation();
      });

      // 定位面板 — 必须挂到 dialog 内部，否则被 top layer 遮挡
      const dialogEl = btn.closest("dialog");
      if (dialogEl.length) {
        dialogEl.append(panel);
      } else {
        $("body").append(panel);
      }
      const anchorRect = btn[0].getBoundingClientRect();
      let left = anchorRect.left;
      const panelWidth = panel.outerWidth();
      const panelHeight = panel.outerHeight();
      if (left + panelWidth > window.innerWidth)
        left = window.innerWidth - panelWidth - 8;
      if (left < 4) left = 4;
      const spaceBelow = window.innerHeight - anchorRect.bottom - 4;
      const spaceAbove = anchorRect.top - 4;
      let top;
      if (panelHeight <= spaceBelow || spaceBelow >= spaceAbove) {
        top = anchorRect.bottom + 4;
      } else {
        top = anchorRect.top - panelHeight - 4;
      }
      if (top < 4) top = 4;
      panel.css({ top: top + "px", left: left + "px" });

      // 展开/收起箭头
      panel.on("click", ".cfm-nf-arrow", function (ev) {
        ev.stopPropagation();
        const fid = $(this).attr("data-folder-id");
        if (expandedSet.has(fid)) expandedSet.delete(fid);
        else expandedSet.add(fid);
        treeContainer.html(
          buildNativeFolderTreeHtml(
            "worldinfo",
            null,
            0,
            expandedSet,
            currentFilter,
          ),
        );
      });

      // 展开全部
      toolbar.find(".cfm-nf-expand-all").on("click", function (ev) {
        ev.stopPropagation();
        getResFolderIds("worldinfo").forEach((id) => expandedSet.add(id));
        treeContainer.html(
          buildNativeFolderTreeHtml(
            "worldinfo",
            null,
            0,
            expandedSet,
            currentFilter,
          ),
        );
      });

      // 收起全部
      toolbar.find(".cfm-nf-collapse-all").on("click", function (ev) {
        ev.stopPropagation();
        expandedSet.clear();
        treeContainer.html(
          buildNativeFolderTreeHtml(
            "worldinfo",
            null,
            0,
            expandedSet,
            currentFilter,
          ),
        );
      });

      // 点击"显示全部"
      showAllBtn.on("click", function () {
        currentFilter = null;
        applyCharWorldSelectFilter(selectEl, null, kind);
        btn.removeClass("cfm-nf-active");
        panel.remove();
        $(document).off("mousedown.cfmCwPanel touchstart.cfmCwPanel");
      });

      // 点击文件夹项
      panel.on("click", ".cfm-nf-item[data-folder-id]", function (ev) {
        if ($(ev.target).closest(".cfm-nf-arrow").length) return;
        const fid = $(this).attr("data-folder-id");
        currentFilter = fid;
        applyCharWorldSelectFilter(selectEl, fid, kind);
        btn.addClass("cfm-nf-active");
        panel.remove();
        $(document).off("mousedown.cfmCwPanel touchstart.cfmCwPanel");
      });

      // 点击外部关闭
      setTimeoutFn(() => {
        $(document).on(
          "mousedown.cfmCwPanel touchstart.cfmCwPanel",
          function (ev) {
            if (!$(ev.target).closest(".cfm-nf-panel, .cfm-nf-btn").length) {
              $(".cfm-nf-panel").remove();
              $(document).off("mousedown.cfmCwPanel touchstart.cfmCwPanel");
            }
          },
        );
      }, 0);
    });
  }

  /**
   * 对角色卡世界书选择器应用文件夹过滤
   * @param {jQuery} selectEl - <select> 元素
   * @param {string|null} folderId - 文件夹ID，null 表示显示全部
   * @param {string} kind - 'primary' | 'extras'
   */
  function applyCharWorldSelectFilter(selectEl, folderId, kind) {
    if (!selectEl.length) return;

    // 恢复之前被 detach 的 option
    const storeKey = "_cfmDetachedOpts";
    const detached = selectEl.data(storeKey);
    if (detached && detached.length) {
      selectEl.append(detached);
      selectEl.data(storeKey, null);
    }

    // 对主世界书（普通 select）：show/hide 即可
    if (kind === "primary") {
      selectEl.find("option").show();
      if (folderId) {
        const allowedNames = getAllItemsInFolderRecursive(
          "worldinfo",
          folderId,
        );
        selectEl.find("option").each(function () {
          const val = $(this).val();
          const text = $(this).text().trim();
          if (val === "") return; // 保留空值/默认选项
          if (!allowedNames.has(text)) {
            $(this).hide();
          }
        });
      }
      return;
    }

    // 对辅助世界书（select2 多选）：需要 detach 不匹配的 option，再 reinit select2
    if (kind === "extras") {
      // 先 destroy select2
      if (selectEl.hasClass("select2-hidden-accessible")) {
        try {
          selectEl.select2("destroy");
        } catch (e) {
          /* ignore */
        }
      }

      if (folderId) {
        const allowedNames = getAllItemsInFolderRecursive(
          "worldinfo",
          folderId,
        );
        const toDetach = [];
        selectEl.find("option").each(function () {
          const val = $(this).val();
          const text = $(this).text().trim();
          if (val === "") return; // 保留空值选项
          // 已被选中的 option 不移除（保留用户已选的世界书）
          if ($(this).prop("selected")) return;
          if (!allowedNames.has(text)) {
            toDetach.push(this);
          }
        });
        if (toDetach.length) {
          const $detached = $(toDetach).detach();
          selectEl.data(storeKey, $detached);
        }
      }

      // 重新初始化 select2
      try {
        const popupDialog = selectEl.closest(
          "dialog, .popup-content, .dialogue_popup",
        );
        selectEl.select2({
          width: "100%",
          placeholder: "No auxiliary Lorebooks set. Click here to select.",
          allowClear: true,
          closeOnSelect: false,
          dropdownParent: popupDialog.length ? popupDialog : undefined,
        });
      } catch (e) {
        /* ignore select2 init error */
      }
    }
  }

  // ==================== API 返回 ====================
  return {
    applyBgFilter,
    applyCharFilter,
    applyCharWorldSelectFilter,
    applyGlobalWorldInfoFilter,
    applyNativeFilter,
    applyPersonaFilter,
    applyPresetFilter,
    applyThemeFilter,
    applyWorldInfoFilter,
    buildNativeFolderTreeHtml,
    clearWorldInfoNativeFilter,
    enhancePersonaPopupList,
    getAllItemsInFolderRecursive,
    injectCharWorldFilterBtn,
    injectNativeFilterButtons,
    injectNativePresetGroupButton,
    setupCharWorldPopupFilterObserver,
    setupNativePresetGroupButtonObserver,
    setupPersonaSelectionPopupEnhancer,
    setupWorldInfoButtonAutoShowAll,
    showNativeFolderPanel,
    showPresetEditFolderFilterPanel,
    updateNativeFilterBtnState,
  };
}
