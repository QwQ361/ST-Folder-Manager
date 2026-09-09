// =====================================================================
// 设置弹窗内容渲染核心（settings/pages/settings.js）
// ---------------------------------------------------------------------
// 包含三个渲染函数：
//   renderConfigBody            - 角色卡（chars）标签文件夹配置页
//   renderResourceConfigBody    - 预设/世界书/主题/背景/User/快速回复配置页
//   renderRegexConfigBody       - 正则配置页
//
// 可变状态注入约定：
//   - Set 类型：直接传引用，调用 .add/.delete/.clear 直接生效
//   - 基础类型：getter/setter 注入，读用 getXxx()、写用 setXxx()
// =====================================================================

export function createSettingsPageCore(deps) {
  const {
    $,
    extensionName,
    extension_settings,
    getContext,
    cfmToastr,
    cfmConfirm,
    // Set 状态（引用注入）
    configSelectedFolderIds,
    cfmDeleteSelected,
    resConfigDeleteSelected,
    resConfigSelectedFolderIds,
    configExpandedNodes,
    presetConfigExpandedNodes,
    themeConfigExpandedNodes,
    bgConfigExpandedNodes,
    personaConfigExpandedNodes,
    qrConfigExpandedNodes,
    worldInfoConfigExpandedNodes,
    regexConfigExpandedNodes,
    // 基础类型状态（getter/setter 注入）
    getCfmDeleteMode,
    setCfmDeleteMode,
    getCfmDeleteCascade,
    setCfmDeleteCascade,
    getCfmDeleteLastClickedId,
    setCfmDeleteLastClickedId,
    getCfmDeleteRangeMode,
    setCfmDeleteRangeMode,
    getCfmInvertScope,
    setCfmInvertScope,
    getResConfigDeleteMode,
    setResConfigDeleteMode,
    getResConfigDeleteCascade,
    setResConfigDeleteCascade,
    getResConfigDeleteLastClickedId,
    setResConfigDeleteLastClickedId,
    getResConfigDeleteRangeMode,
    setResConfigDeleteRangeMode,
    getResConfigInvertScope,
    setResConfigInvertScope,
    getCurrentResourceType,
    getCfmConfigTopActiveTab,
    // 渲染依赖
    renderConfigTreeItem,
    renderButtonModeSection,
    renderTopbarIconConfigSection,
    renderDefaultPageConfigSection,
    renderDefaultSearchScopeSection,
    renderDefaultRegexTransferModeSection,
    renderEntryTransferPostActionSection,
    renderMobileTopbarAvoidSection,
    renderMobileFullscreenSection,
    renderLanguageSwitchSection,
    renderBridgeConnectionSection,
    renderMergeSameNameUserSection,
    renderCustomLayoutSection,
    createConfigTabShell,
    // 数据/操作
    getFolderTagIds,
    getTagList,
    getTagName,
    getTopLevelFolders,
    sortFolders,
    saveConfig,
    oneClickImportAllTags,
    createTagsSiblings,
    executeInvertSelection,
    executeMultiDelete,
    executeResourceMultiDelete,
    showDeleteConfirmDialog,
    showResDeleteConfirmDialog,
    showBatchCreatePopup,
    showResourceBatchCreatePopup,
    showRegexBatchCreatePopup: showRegexBatchCreatePopupExternal,
    addRegexFolderConf,
    parseBatchText,
    // 资源树
    getResFolderTree,
    getResFolderIds,
    getResFolderDisplayName,
    getResTopLevelFolders,
    getResChildFolders,
    getResFlatFolderList,
    sortResFolders,
    addResFolder,
    removeResFolder,
    countResItemsRecursive,
    ensureResourceSettings,
    // 数据对象（引用注入）
    config,
    // 工具
    escapeHtml,
  } = deps;

  function renderConfigBody(defaultTab = null) {
    const body = $("#cfm-config-body");
    body.empty();

    // 根据当前资源类型分支渲染
    if (
      getCurrentResourceType() === "presets" ||
      getCurrentResourceType() === "worldinfo" ||
      getCurrentResourceType() === "themes" ||
      getCurrentResourceType() === "backgrounds" ||
      getCurrentResourceType() === "personas" ||
      getCurrentResourceType() === "quickreply"
    ) {
      renderResourceConfigBody(body, getCurrentResourceType(), defaultTab);
      return;
    }
    if (getCurrentResourceType() === "regex") {
      renderRegexConfigBody(body, defaultTab);
      return;
    }

    // ===== 以下为角色卡（chars）配置 =====
    const currentTabFromUi =
      defaultTab ||
      $("#cfm-config-body .cfm-config-top-tab-active").data("tab") ||
      getCfmConfigTopActiveTab() ||
      "settings";
    const tabShell = createConfigTabShell(currentTabFromUi);
    const settingsBody = tabShell.settingsPanel;
    const layoutBody = tabShell.layoutPanel;
    const createBody = tabShell.createPanel;
    body.append(tabShell.shell);

    // 0. 按钮位置设置（共享）
    renderButtonModeSection(settingsBody);

    // 0.5 自定义顶栏图标（共享函数）
    renderTopbarIconConfigSection(settingsBody);
    // 0.6 默认打开页面（共享函数）
    renderDefaultPageConfigSection(settingsBody);
    // 0.62 默认搜索范围
    renderDefaultSearchScopeSection(settingsBody);
    // 0.625 正则互通默认选择模式
    renderDefaultRegexTransferModeSection(settingsBody);
    // 0.63 条目缝合完成后的跳转策略
    renderEntryTransferPostActionSection(settingsBody);
    // 0.65 移动端顶部栏避让开关
    renderMobileTopbarAvoidSection(settingsBody);
    // 0.66 移动端下栏全屏模式设置
    renderMobileFullscreenSection(settingsBody);
    // 0.67 界面语言切换
    renderLanguageSwitchSection(settingsBody);
    // 0.675 本地备份桥接连接开关
    renderBridgeConnectionSection(settingsBody);
    // 0.69 合并同名 User（布局页最上方）
    renderMergeSameNameUserSection(layoutBody);
    // 0.7 自定义布局（共享函数）
    renderCustomLayoutSection(layoutBody);

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
                <label style="display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;font-weight:normal;">
                    <input type="checkbox" id="cfm-auto-import-tags" ${extension_settings[extensionName].autoImportTags ? "checked" : ""}>
                    <span>自动录入新标签为文件夹</span>
                </label>
                <div class="cfm-create-tag-hint">将酒馆中所有尚未注册为文件夹的标签一次性导入。关闭上方开关后，新标签不会在打开插件时自动录入，但仍可手动一键导入或单独添加。</div>
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
    addSection.find("#cfm-auto-import-tags").on("change", function () {
      extension_settings[extensionName].autoImportTags =
        !!$(this).prop("checked");
      getContext().saveSettingsDebounced();
      cfmToastr.success(
        extension_settings[extensionName].autoImportTags
          ? "已开启自动录入新标签"
          : "已关闭自动录入新标签",
      );
    });
    addSection.find("#cfm-add-folder-btn").on("click touchend", (e) => {
      e.preventDefault();
      const tagId = select.val();
      if (!tagId) {
        cfmToastr.warning("请先选择一个标签");
        return;
      }
      const parentIds =
        configSelectedFolderIds.size > 0
          ? Array.from(configSelectedFolderIds)
          : [null];
      for (const parentId of parentIds) {
        config.folders[tagId] = {
          parentId: parentId,
        };
        // 从排除列表中移除（用户主动添加意味着重新纳入管理）
        const _ex = extension_settings[extensionName].excludedTagIds;
        const _exi = _ex.indexOf(tagId);
        if (_exi >= 0) _ex.splice(_exi, 1);
      }
      saveConfig(config);
      const parentHint =
        configSelectedFolderIds.size > 0
          ? `「${Array.from(configSelectedFolderIds)
              .map((id) => getTagName(id))
              .join("、")}」的子级`
          : "顶级文件夹";
      cfmToastr.success(`已将「${getTagName(tagId)}」添加为${parentHint}`);
      renderConfigBody();
    });
    createBody.append(addSection);

    const selectedHintText =
      configSelectedFolderIds.size > 0
        ? "当前将添加到「" +
          Array.from(configSelectedFolderIds)
            .map((id) => escapeHtml(getTagName(id)))
            .join("、") +
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
        cfmToastr.warning("请输入标签名称");
        return;
      }
      const cParentIds =
        configSelectedFolderIds.size > 0
          ? Array.from(configSelectedFolderIds)
          : [null];
      let totalCreated = 0;
      for (const cPid of cParentIds) {
        totalCreated += createTagsSiblings(input, cPid, cParentIds.length > 1);
      }
      if (cParentIds.length > 1 && totalCreated > 0) {
        cfmToastr.success(
          `已在 ${cParentIds.length} 个父级下创建共 ${totalCreated} 个文件夹`,
        );
      }
      createSection.find("#cfm-create-tag-input").val("");
      renderConfigBody();
    });
    createSection.find("#cfm-create-tag-input").on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createSection.find("#cfm-create-tag-btn").trigger("click");
      }
    });
    createBody.append(createSection);

    // 1.8 批量创建 & 批量删除
    const batchSection = $(`
            <div class="cfm-config-section">
                <label>批量创建文件夹结构</label>
                <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                    <button id="cfm-batch-create-btn" class="cfm-btn"><i class="fa-solid fa-layer-group"></i> 打开批量创建</button>
                    <button id="cfm-batch-delete-btn" class="cfm-btn ${getCfmDeleteMode() ? "cfm-btn-danger" : ""}" style="${getCfmDeleteMode() ? "border-color:rgba(237,66,69,0.5);color:#ed4245;" : ""}"><i class="fa-solid fa-trash-can"></i> ${getCfmDeleteMode() ? "退出删除模式" : "删除文件夹"}</button>
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
      setCfmDeleteMode( !getCfmDeleteMode());
      cfmDeleteSelected.clear();
      setCfmDeleteCascade( false);
      setCfmDeleteLastClickedId( null);
      renderConfigBody();
    });
    createBody.append(batchSection);

    // 删除模式下显示操作栏（紧跟在批量操作区域下方）
    if (getCfmDeleteMode()) {
      const allFolderIds = getFolderTagIds();
      const allSelected =
        allFolderIds.length > 0 &&
        allFolderIds.every((id) => cfmDeleteSelected.has(id));

      // 计算反选范围描述
      let invertScopeLabel = "全部文件夹";
      if (getCfmInvertScope() === "parent") {
        invertScopeLabel =
          configSelectedFolderIds.size > 0
            ? `「${Array.from(configSelectedFolderIds)
                .map((id) => getTagName(id))
                .join("、")}」的子级`
            : "顶级文件夹";
      }

      const deleteBar = $(`
                <div class="cfm-delete-bar cfm-delete-bar-controls">
                    <div class="cfm-delete-bar-top">
                        <div class="cfm-delete-bar-left">
                            <button class="cfm-btn cfm-btn-sm" id="cfm-select-all" title="全选/全不选"><i class="fa-solid fa-${allSelected ? "square-minus" : "square-check"}"></i> ${allSelected ? "全不选" : "全选"}</button>
                            <button class="cfm-btn cfm-btn-sm cfm-cascade-btn ${getCfmDeleteCascade() ? "cfm-cascade-active" : ""}" id="cfm-cascade-toggle" title="开启后，选中父文件夹会自动选中所有子文件夹"><i class="fa-solid fa-sitemap"></i> 级联${getCfmDeleteCascade() ? "(开)" : "(关)"}</button>
                            <button class="cfm-btn cfm-btn-sm cfm-range-btn ${getCfmDeleteRangeMode() ? "cfm-range-active" : ""}" id="cfm-range-toggle" title="开启框选模式后：先点击一个文件夹作为起点，再点击另一个文件夹，两者之间的所有文件夹都会被选中"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${getCfmDeleteRangeMode() ? "(开)" : ""}</button>
                        </div>
                    </div>
                    <div class="cfm-delete-bar-row2">
                        <div class="cfm-delete-bar-left">
                            <button class="cfm-btn cfm-btn-sm" id="cfm-invert-select" title="反选：将已选和未选状态互换"><i class="fa-solid fa-right-left"></i> 反选</button>
                            <select id="cfm-invert-scope" class="cfm-invert-scope-select" title="选择反选的范围">
                                <option value="all" ${getCfmInvertScope() === "all" ? "selected" : ""}>全部文件夹</option>
                                <option value="parent" ${getCfmInvertScope() === "parent" ? "selected" : ""}>${
                                  configSelectedFolderIds.size > 0
                                    ? "「" +
                                      Array.from(configSelectedFolderIds)
                                        .map((id) => escapeHtml(getTagName(id)))
                                        .join("、") +
                                      "」的子级"
                                    : "顶级文件夹"
                                }</option>
                            </select>
                        </div>
                        <span class="cfm-delete-bar-hint">${getCfmDeleteRangeMode() ? "🎯 框选模式已开启：点击起点文件夹，再点击终点文件夹" : "Shift+点击 或开启「框选」按钮可范围选择"}</span>
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
        setCfmDeleteCascade( !getCfmDeleteCascade());
        renderConfigBody();
      });
      deleteBar.find("#cfm-range-toggle").on("click touchend", (e) => {
        e.preventDefault();
        setCfmDeleteRangeMode( !getCfmDeleteRangeMode());
        if (getCfmDeleteRangeMode()) setCfmDeleteLastClickedId( null);
        renderConfigBody();
      });
      deleteBar.find("#cfm-invert-scope").on("change", function (e) {
        setCfmInvertScope( $(this).val());
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
      createBody.append(deleteBar);
    }

    // 2. 当前文件夹树形展示（支持拖拽 + 点击选中）
    const treeSection = $(`
            <div class="cfm-config-section">
                <label>当前文件夹结构 <span style="font-size:11px;opacity:0.5;color:#57f287;">点击选中为目标父级</span></label>
                <div class="cfm-config-tree-actions">
                    <button id="cfm-config-expand-all" class="cfm-btn cfm-btn-sm" title="展开全部"><i class="fa-solid fa-angles-down"></i> 展开</button>
                    <button id="cfm-config-collapse-all" class="cfm-btn cfm-btn-sm" title="收起全部"><i class="fa-solid fa-angles-up"></i> 收起</button>
                </div>
                <div class="cfm-tree" id="cfm-folder-tree"></div>
            </div>
        `);
    createBody.append(treeSection);

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

    if (configSelectedFolderIds.size > 0) {
      const selectedNames = Array.from(configSelectedFolderIds)
        .map((id) => escapeHtml(getTagName(id)))
        .join("、");
      const selectedHint = $(
        `<div class="cfm-selected-hint"><i class="fa-solid fa-crosshairs"></i> 已选中 ${configSelectedFolderIds.size} 个：<strong>${selectedNames}</strong><button class="cfm-btn-deselect" title="全部取消选中"><i class="fa-solid fa-xmark"></i></button></div>`,
      );
      selectedHint.find(".cfm-btn-deselect").on("click touchend", (e) => {
        e.preventDefault();
        configSelectedFolderIds.clear();
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

  function renderResourceConfigBody(body, type, defaultTab = "settings") {
    const typeLabel =
      type === "presets"
        ? "预设"
        : type === "themes"
          ? "主题"
          : type === "backgrounds"
            ? "背景"
            : type === "personas"
              ? "User"
              : type === "quickreply"
                ? "快速回复"
                : "世界书";
    const tree = getResFolderTree(type);
    const allFolderIds = getResFolderIds(type);
    const expandedSet =
      type === "presets"
        ? presetConfigExpandedNodes
        : type === "themes"
          ? themeConfigExpandedNodes
          : type === "backgrounds"
            ? bgConfigExpandedNodes
            : type === "personas"
              ? personaConfigExpandedNodes
              : type === "quickreply"
                ? qrConfigExpandedNodes
                : worldInfoConfigExpandedNodes;

    const tabShell = createConfigTabShell(
      defaultTab || getCfmConfigTopActiveTab() || "settings",
    );
    const settingsBody = tabShell.settingsPanel;
    const layoutBody = tabShell.layoutPanel;
    const createBody = tabShell.createPanel;
    body.append(tabShell.shell);

    // 0. 按钮位置设置（共享）
    renderButtonModeSection(settingsBody);

    // 0.5 自定义顶栏图标（共享函数）
    renderTopbarIconConfigSection(settingsBody);
    // 0.6 默认打开页面（共享函数）
    renderDefaultPageConfigSection(settingsBody);
    // 0.62 默认搜索范围
    renderDefaultSearchScopeSection(settingsBody);
    // 0.625 正则互通默认选择模式
    renderDefaultRegexTransferModeSection(settingsBody);
    // 0.63 条目缝合完成后的跳转策略
    renderEntryTransferPostActionSection(settingsBody);
    // 0.65 移动端顶部栏避让开关
    renderMobileTopbarAvoidSection(settingsBody);
    // 0.66 移动端下栏全屏模式设置
    renderMobileFullscreenSection(settingsBody);
    // 0.67 界面语言切换
    renderLanguageSwitchSection(settingsBody);
    // 0.675 本地备份桥接连接开关
    renderBridgeConnectionSection(settingsBody);
    // 0.69 合并同名 User（布局页最上方）
    renderMergeSameNameUserSection(layoutBody);
    // 0.7 自定义布局（共享函数）
    renderCustomLayoutSection(layoutBody);

    // 1. 创建新文件夹（支持空格分隔批量创建）
    const resSelectedHintText =
      resConfigSelectedFolderIds.size > 0
        ? "当前将添加到「" +
          Array.from(resConfigSelectedFolderIds)
            .map((id) => escapeHtml(getResFolderDisplayName(type, id)))
            .join("、") +
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
        cfmToastr.warning("请输入文件夹名称");
        return;
      }
      const parentIds =
        resConfigSelectedFolderIds.size > 0
          ? Array.from(resConfigSelectedFolderIds)
          : [null];
      const names = input.split(/\s+/).filter((s) => s.length > 0);
      let totalCreated = 0;
      let totalSkipped = 0;
      for (const parentId of parentIds) {
        for (const name of names) {
          let folderName = name;
          if (parentId) folderName = parentId + "-" + name;
          if (addResFolder(type, folderName, parentId, parentId ? name : null))
            totalCreated++;
          else totalSkipped++;
        }
      }
      if (totalCreated > 0)
        cfmToastr.success(`已创建 ${totalCreated} 个文件夹`);
      if (totalSkipped > 0)
        cfmToastr.warning(`${totalSkipped} 个文件夹已存在（跳过）`);
      createSection.find("#cfm-res-create-input").val("");
      renderResourceConfigBody(body.empty(), type, "create");
    });
    createSection.find("#cfm-res-create-input").on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createSection.find("#cfm-res-create-btn").trigger("click");
      }
    });
    createBody.append(createSection);

    // 2. 批量创建 & 批量删除
    const batchSection = $(`
      <div class="cfm-config-section">
        <label>批量创建文件夹结构</label>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          <button id="cfm-res-batch-create-btn" class="cfm-btn"><i class="fa-solid fa-layer-group"></i> 打开批量创建</button>
          <button id="cfm-res-batch-delete-btn" class="cfm-btn ${getResConfigDeleteMode() ? "cfm-btn-danger" : ""}" style="${getResConfigDeleteMode() ? "border-color:rgba(237,66,69,0.5);color:#ed4245;" : ""}"><i class="fa-solid fa-trash-can"></i> ${getResConfigDeleteMode() ? "退出删除模式" : "删除文件夹"}</button>
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
      setResConfigDeleteMode( !getResConfigDeleteMode());
      resConfigDeleteSelected.clear();
      setResConfigDeleteCascade( false);
      setResConfigDeleteLastClickedId( null);
      setResConfigDeleteRangeMode( false);
      renderResourceConfigBody(body.empty(), type, "create");
    });
    createBody.append(batchSection);

    // 删除模式下显示操作栏
    if (getResConfigDeleteMode()) {
      const allSelected =
        allFolderIds.length > 0 &&
        allFolderIds.every((f) => resConfigDeleteSelected.has(f));
      const deleteBar = $(`
        <div class="cfm-delete-bar cfm-delete-bar-controls">
          <div class="cfm-delete-bar-top">
            <div class="cfm-delete-bar-left">
              <button class="cfm-btn cfm-btn-sm" id="cfm-res-select-all"><i class="fa-solid fa-${allSelected ? "square-minus" : "square-check"}"></i> ${allSelected ? "全不选" : "全选"}</button>
              <button class="cfm-btn cfm-btn-sm cfm-cascade-btn ${getResConfigDeleteCascade() ? "cfm-cascade-active" : ""}" id="cfm-res-cascade-toggle" title="开启后，选中父文件夹会自动选中所有子文件夹"><i class="fa-solid fa-sitemap"></i> 级联${getResConfigDeleteCascade() ? "(开)" : "(关)"}</button>
              <button class="cfm-btn cfm-btn-sm cfm-range-btn ${getResConfigDeleteRangeMode() ? "cfm-range-active" : ""}" id="cfm-res-range-toggle" title="框选模式"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${getResConfigDeleteRangeMode() ? "(开)" : ""}</button>
            </div>
          </div>
          <div class="cfm-delete-bar-row2">
            <div class="cfm-delete-bar-left">
              <button class="cfm-btn cfm-btn-sm" id="cfm-res-invert-select"><i class="fa-solid fa-right-left"></i> 反选</button>
              <select id="cfm-res-invert-scope" class="cfm-invert-scope-select" title="反选范围">
                <option value="all" ${getResConfigInvertScope() === "all" ? "selected" : ""}>全部文件夹</option>
                <option value="parent" ${getResConfigInvertScope() === "parent" ? "selected" : ""}>${
                  resConfigSelectedFolderIds.size > 0
                    ? "「" +
                      Array.from(resConfigSelectedFolderIds)
                        .map((id) =>
                          escapeHtml(getResFolderDisplayName(type, id)),
                        )
                        .join("、") +
                      "」的子级"
                    : "顶级文件夹"
                }</option>
              </select>
            </div>
            <span class="cfm-delete-bar-hint">${getResConfigDeleteRangeMode() ? "🎯 框选模式已开启：点击起点文件夹，再点击终点文件夹" : "Shift+点击 或开启「框选」按钮可范围选择"}</span>
          </div>
          ${resConfigDeleteSelected.size > 0 ? `<div class="cfm-delete-bar-bottom"><span>已选中 ${resConfigDeleteSelected.size} 个文件夹</span><button class="cfm-btn cfm-btn-danger" id="cfm-res-confirm-delete" style="padding:4px 14px;"><i class="fa-solid fa-trash-can"></i> 确认删除</button></div>` : ""}
        </div>
      `);
      deleteBar.find("#cfm-res-select-all").on("click touchend", (e) => {
        e.preventDefault();
        if (allSelected) resConfigDeleteSelected.clear();
        else allFolderIds.forEach((f) => resConfigDeleteSelected.add(f));
        renderResourceConfigBody(body.empty(), type, "create");
      });
      deleteBar.find("#cfm-res-cascade-toggle").on("click touchend", (e) => {
        e.preventDefault();
        setResConfigDeleteCascade( !getResConfigDeleteCascade());
        renderResourceConfigBody(body.empty(), type, "create");
      });
      deleteBar.find("#cfm-res-range-toggle").on("click touchend", (e) => {
        e.preventDefault();
        setResConfigDeleteRangeMode( !getResConfigDeleteRangeMode());
        if (getResConfigDeleteRangeMode()) setResConfigDeleteLastClickedId( null);
        renderResourceConfigBody(body.empty(), type, "create");
      });
      deleteBar.find("#cfm-res-invert-scope").on("change", function () {
        setResConfigInvertScope( $(this).val());
      });
      deleteBar.find("#cfm-res-invert-select").on("click touchend", (e) => {
        e.preventDefault();
        // 反选逻辑
        let targetIds =
          getResConfigInvertScope() === "parent"
            ? getResTopLevelFolders(type)
            : allFolderIds;
        for (const id of targetIds) {
          if (resConfigDeleteSelected.has(id))
            resConfigDeleteSelected.delete(id);
          else {
            resConfigDeleteSelected.add(id);
            if (getResConfigDeleteCascade()) {
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
        renderResourceConfigBody(body.empty(), type, "create");
      });
      deleteBar.find("#cfm-res-confirm-delete").on("click touchend", (e) => {
        e.preventDefault();
        executeResourceMultiDelete(type);
        setResConfigDeleteCascade( false);
        setResConfigDeleteLastClickedId( null);
        setResConfigDeleteRangeMode( false);
        renderResourceConfigBody(body.empty(), type, "create");
      });
      createBody.append(deleteBar);
    }

    // 3. 当前文件夹树形结构
    const treeSection = $(`
      <div class="cfm-config-section">
        <label>当前文件夹结构 <span style="font-size:11px;opacity:0.5;">(${allFolderIds.length} 个)</span> <span style="font-size:11px;opacity:0.5;color:#57f287;">点击选中为目标父级</span></label>
        <div class="cfm-config-tree-actions">
          <button id="cfm-res-config-expand-all" class="cfm-btn cfm-btn-sm"><i class="fa-solid fa-angles-down"></i> 展开</button>
          <button id="cfm-res-config-collapse-all" class="cfm-btn cfm-btn-sm"><i class="fa-solid fa-angles-up"></i> 收起</button>
        </div>
        <div class="cfm-tree" id="cfm-res-folder-tree"></div>
      </div>
    `);
    createBody.append(treeSection);

    treeSection.find("#cfm-res-config-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of allFolderIds) expandedSet.add(id);
      renderResourceConfigBody(body.empty(), type, "create");
    });
    treeSection
      .find("#cfm-res-config-collapse-all")
      .on("click touchend", (e) => {
        e.preventDefault();
        expandedSet.clear();
        renderResourceConfigBody(body.empty(), type, "create");
      });

    const treeContainer = treeSection.find("#cfm-res-folder-tree");

    if (resConfigSelectedFolderIds.size > 0) {
      const selectedNames = Array.from(resConfigSelectedFolderIds)
        .map((id) => escapeHtml(getResFolderDisplayName(type, id)))
        .join("、");
      const selectedHint = $(
        `<div class="cfm-selected-hint"><i class="fa-solid fa-crosshairs"></i> 已选中 ${resConfigSelectedFolderIds.size} 个：<strong>${selectedNames}</strong><button class="cfm-btn-deselect" title="全部取消选中"><i class="fa-solid fa-xmark"></i></button></div>`,
      );
      selectedHint.find(".cfm-btn-deselect").on("click touchend", (e) => {
        e.preventDefault();
        resConfigSelectedFolderIds.clear();
        renderResourceConfigBody(body.empty(), type, "create");
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
        if (getResConfigDeleteMode()) {
          checkboxHtml = `<span class="cfm-del-checkbox ${isDelChecked ? "cfm-del-checked" : ""}"><i class="fa-${isDelChecked ? "solid" : "regular"} fa-square${isDelChecked ? "-check" : ""}"></i></span>`;
        }
        const arrowHtml = `<span class="cfm-tnode-arrow cfm-config-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>`;

        const isResSelected = resConfigSelectedFolderIds.has(folderId);
        const item = $(`
          <div class="cfm-tree-item ${isResSelected ? "cfm-tree-selected" : ""}" data-folder-name="${escapeHtml(folderId)}" style="padding-left:${indent}px;">
            ${checkboxHtml}
            ${arrowHtml}
            <span class="cfm-tree-icon"><i class="fa-solid fa-folder${isResSelected ? "-open" : ""}"></i></span>
            <span class="cfm-tree-name">${escapeHtml(getResFolderDisplayName(type, folderId))}</span>
            <span class="cfm-tnode-count" style="margin-left:auto;margin-right:8px;">${count}</span>
            ${getResConfigDeleteMode() ? "" : `<span class="cfm-tree-actions"><button class="cfm-btn-danger cfm-res-remove-folder" data-fname="${escapeHtml(folderId)}" title="删除此文件夹"><i class="fa-solid fa-trash-can"></i></button></span>`}
          </div>
        `);

        item.find(".cfm-config-arrow").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!hasChildren) return;
          if (expandedSet.has(folderId)) expandedSet.delete(folderId);
          else expandedSet.add(folderId);
          renderResourceConfigBody(body.empty(), type, "create");
        });

        if (getResConfigDeleteMode()) {
          const toggleResFolder = (id, forceState) => {
            const shouldSelect =
              forceState !== undefined
                ? forceState
                : !resConfigDeleteSelected.has(id);
            if (shouldSelect) resConfigDeleteSelected.add(id);
            else resConfigDeleteSelected.delete(id);
            if (getResConfigDeleteCascade()) {
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
              (e.shiftKey || getResConfigDeleteRangeMode()) &&
              getResConfigDeleteLastClickedId()
            ) {
              const flatList = getResFlatFolderList(type);
              const lastIdx = flatList.indexOf(getResConfigDeleteLastClickedId());
              const curIdx = flatList.indexOf(folderId);
              if (lastIdx >= 0 && curIdx >= 0) {
                const start = Math.min(lastIdx, curIdx);
                const end = Math.max(lastIdx, curIdx);
                for (let i = start; i <= end; i++) {
                  resConfigDeleteSelected.add(flatList[i]);
                  if (getResConfigDeleteCascade()) {
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
            setResConfigDeleteLastClickedId( folderId);
            renderResourceConfigBody(body.empty(), type, "create");
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
            if (resConfigSelectedFolderIds.has(folderId)) {
              resConfigSelectedFolderIds.delete(folderId);
            } else {
              resConfigSelectedFolderIds.add(folderId);
            }
            renderResourceConfigBody(body.empty(), type, "create");
          });
          item.find(".cfm-res-remove-folder").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showResDeleteConfirmDialog(type, [folderId], () => {
              removeResFolder(type, folderId);
              resConfigSelectedFolderIds.delete(folderId);
              cfmToastr.success(`已删除${typeLabel}文件夹「${folderId}」`);
              renderResourceConfigBody(body.empty(), type, "create");
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

  function renderRegexConfigBody(body, defaultTab = "settings") {
    ensureResourceSettings();
    const folderTree = extension_settings[extensionName].regexFolderTree;
    const globalGroups = extension_settings[extensionName].regexGlobalGroups;
    const allFolderIds = Object.keys(folderTree);
    const expandedSet = regexConfigExpandedNodes;
    function getRegexTopLvlConf() {
      return Object.keys(folderTree).filter((id) => !folderTree[id].parentId);
    }
    function getRegexChildConf(parentId) {
      return Object.keys(folderTree).filter(
        (id) => folderTree[id].parentId === parentId,
      );
    }
    function sortRegexConf(ids) {
      return [...ids].sort((a, b) => {
        const oa = folderTree[a]?.sortOrder ?? 0;
        const ob = folderTree[b]?.sortOrder ?? 0;
        if (oa !== ob) return oa - ob;
        return (folderTree[a]?.displayName || a).localeCompare(
          folderTree[b]?.displayName || b,
          "zh-CN",
        );
      });
    }
    function getRegexDispName(id) {
      return folderTree[id]?.displayName || id;
    }
    function countRegexInFolder(fid) {
      const sc = extension_settings.regex ?? [];
      let c = sc.filter((s) => globalGroups[s.id] === fid).length;
      for (const ch of getRegexChildConf(fid)) c += countRegexInFolder(ch);
      return c;
    }
    function removeRegexFolderConf(fid) {
      const pid = folderTree[fid]?.parentId || null;
      for (const ch of getRegexChildConf(fid)) folderTree[ch].parentId = pid;
      for (const k of Object.keys(globalGroups)) {
        if (globalGroups[k] === fid) delete globalGroups[k];
      }
      delete folderTree[fid];
      getContext().saveSettingsDebounced();
    }
    function getRegexPathConf(fid) {
      const p = [];
      let c = fid;
      const v = new Set();
      while (c && folderTree[c]) {
        if (v.has(c)) break;
        v.add(c);
        p.unshift(c);
        c = folderTree[c].parentId;
      }
      return p;
    }
    function getRegexFlatConf() {
      const r = [];
      function w(pid) {
        for (const id of sortRegexConf(getRegexChildConf(pid))) {
          r.push(id);
          w(id);
        }
      }
      w(null);
      return r;
    }

    const tabShell = createConfigTabShell(
      defaultTab || getCfmConfigTopActiveTab() || "settings",
    );
    const settingsBody = tabShell.settingsPanel;
    const layoutBody = tabShell.layoutPanel;
    const createBody = tabShell.createPanel;
    body.append(tabShell.shell);

    // 0. 按钮位置设置（共享）
    renderButtonModeSection(settingsBody);
    renderTopbarIconConfigSection(settingsBody);
    renderDefaultPageConfigSection(settingsBody);
    renderDefaultSearchScopeSection(settingsBody);
    renderDefaultRegexTransferModeSection(settingsBody);
    renderEntryTransferPostActionSection(settingsBody);
    renderMobileTopbarAvoidSection(settingsBody);
    renderLanguageSwitchSection(settingsBody);
    renderBridgeConnectionSection(settingsBody);
    renderMergeSameNameUserSection(layoutBody);
    renderCustomLayoutSection(layoutBody);

    // 1. 创建新文件夹
    const resSelectedHintText =
      resConfigSelectedFolderIds.size > 0
        ? "当前将添加到「" +
          Array.from(resConfigSelectedFolderIds)
            .map((id) => escapeHtml(getRegexDispName(id)))
            .join("、") +
          "」下。"
        : "当前将添加为顶级文件夹。";
    const createSection = $(
      `<div class="cfm-config-section"><label>创建新文件夹</label><div class="cfm-create-tag-row"><input type="text" id="cfm-res-create-input" placeholder="a b c（空格分隔，添加到选中文件夹下）" /><button id="cfm-res-create-btn"><i class="fa-solid fa-plus"></i> 创建</button></div><div class="cfm-create-tag-hint">${resSelectedHintText} 空格分隔可批量创建同级文件夹。点击下方树形视图中的文件夹可选中/取消选中目标父级。</div></div>`,
    );
    createSection.find("#cfm-res-create-btn").on("click touchend", (e) => {
      e.preventDefault();
      const input = createSection.find("#cfm-res-create-input").val().trim();
      if (!input) {
        cfmToastr.warning("请输入文件夹名称");
        return;
      }
      const parentIds =
        resConfigSelectedFolderIds.size > 0
          ? Array.from(resConfigSelectedFolderIds)
          : [null];
      const names = input.split(/\s+/).filter((s) => s.length > 0);
      let totalCreated = 0,
        totalSkipped = 0;
      for (const parentId of parentIds) {
        for (const name of names) {
          let folderName = name;
          if (parentId) folderName = parentId + "-" + name;
          if (addRegexFolderConf(folderName, parentId, parentId ? name : null))
            totalCreated++;
          else totalSkipped++;
        }
      }
      if (totalCreated > 0)
        cfmToastr.success(`已创建 ${totalCreated} 个文件夹`);
      if (totalSkipped > 0)
        cfmToastr.warning(`${totalSkipped} 个文件夹已存在（跳过）`);
      createSection.find("#cfm-res-create-input").val("");
      renderRegexConfigBody(body.empty(), "create");
    });
    createSection.find("#cfm-res-create-input").on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createSection.find("#cfm-res-create-btn").trigger("click");
      }
    });
    createBody.append(createSection);

    // 2. 批量创建 & 删除
    const batchSection = $(
      `<div class="cfm-config-section"><label>批量创建文件夹结构</label><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;"><button id="cfm-regex-batch-create-btn" class="cfm-btn"><i class="fa-solid fa-layer-group"></i> 打开批量创建</button><button id="cfm-regex-batch-delete-btn" class="cfm-btn ${getResConfigDeleteMode() ? "cfm-btn-danger" : ""}" style="${getResConfigDeleteMode() ? "border-color:rgba(237,66,69,0.5);color:#ed4245;" : ""}"><i class="fa-solid fa-trash-can"></i> ${getResConfigDeleteMode() ? "退出删除模式" : "删除文件夹"}</button></div><div class="cfm-create-tag-hint">支持多行缩进格式，一次性创建完整的文件夹树。</div></div>`,
    );
    batchSection
      .find("#cfm-regex-batch-create-btn")
      .on("click touchend", (e) => {
        e.preventDefault();
        showRegexBatchCreatePopup();
      });
    batchSection
      .find("#cfm-regex-batch-delete-btn")
      .on("click touchend", (e) => {
        e.preventDefault();
        setResConfigDeleteMode( !getResConfigDeleteMode());
        resConfigDeleteSelected.clear();
        setResConfigDeleteCascade( false);
        setResConfigDeleteLastClickedId( null);
        setResConfigDeleteRangeMode( false);
        renderRegexConfigBody(body.empty(), "create");
      });
    createBody.append(batchSection);

    // 删除模式操作栏
    if (getResConfigDeleteMode()) {
      const allSelected =
        allFolderIds.length > 0 &&
        allFolderIds.every((f) => resConfigDeleteSelected.has(f));
      const deleteBar = $(
        `<div class="cfm-delete-bar cfm-delete-bar-controls"><div class="cfm-delete-bar-top"><div class="cfm-delete-bar-left"><button class="cfm-btn cfm-btn-sm" id="cfm-regex-select-all"><i class="fa-solid fa-${allSelected ? "square-minus" : "square-check"}"></i> ${allSelected ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-cascade-btn ${getResConfigDeleteCascade() ? "cfm-cascade-active" : ""}" id="cfm-regex-cascade-toggle"><i class="fa-solid fa-sitemap"></i> 级联${getResConfigDeleteCascade() ? "(开)" : "(关)"}</button><button class="cfm-btn cfm-btn-sm cfm-range-btn ${getResConfigDeleteRangeMode() ? "cfm-range-active" : ""}" id="cfm-regex-range-toggle"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${getResConfigDeleteRangeMode() ? "(开)" : ""}</button></div></div><div class="cfm-delete-bar-row2"><div class="cfm-delete-bar-left"><button class="cfm-btn cfm-btn-sm" id="cfm-regex-invert-select"><i class="fa-solid fa-right-left"></i> 反选</button></div><span class="cfm-delete-bar-hint">${getResConfigDeleteRangeMode() ? "🎯 框选模式已开启" : "Shift+点击可范围选择"}</span></div>${resConfigDeleteSelected.size > 0 ? `<div class="cfm-delete-bar-bottom"><span>已选中 ${resConfigDeleteSelected.size} 个文件夹</span><button class="cfm-btn cfm-btn-danger" id="cfm-regex-confirm-delete" style="padding:4px 14px;"><i class="fa-solid fa-trash-can"></i> 确认删除</button></div>` : ""}</div>`,
      );
      deleteBar.find("#cfm-regex-select-all").on("click touchend", (e) => {
        e.preventDefault();
        if (allSelected) resConfigDeleteSelected.clear();
        else allFolderIds.forEach((f) => resConfigDeleteSelected.add(f));
        renderRegexConfigBody(body.empty(), "create");
      });
      deleteBar.find("#cfm-regex-cascade-toggle").on("click touchend", (e) => {
        e.preventDefault();
        setResConfigDeleteCascade( !getResConfigDeleteCascade());
        renderRegexConfigBody(body.empty(), "create");
      });
      deleteBar.find("#cfm-regex-range-toggle").on("click touchend", (e) => {
        e.preventDefault();
        setResConfigDeleteRangeMode( !getResConfigDeleteRangeMode());
        if (getResConfigDeleteRangeMode()) setResConfigDeleteLastClickedId( null);
        renderRegexConfigBody(body.empty(), "create");
      });
      deleteBar.find("#cfm-regex-invert-select").on("click touchend", (e) => {
        e.preventDefault();
        for (const id of allFolderIds) {
          if (resConfigDeleteSelected.has(id))
            resConfigDeleteSelected.delete(id);
          else {
            resConfigDeleteSelected.add(id);
            if (getResConfigDeleteCascade()) {
              const addDesc = (pid) => {
                for (const cid of getRegexChildConf(pid)) {
                  resConfigDeleteSelected.add(cid);
                  addDesc(cid);
                }
              };
              addDesc(id);
            }
          }
        }
        renderRegexConfigBody(body.empty(), "create");
      });
      deleteBar.find("#cfm-regex-confirm-delete").on("click touchend", (e) => {
        e.preventDefault();
        if (resConfigDeleteSelected.size === 0) return;
        const toDelete = Array.from(resConfigDeleteSelected);
        const sorted = [...toDelete].sort(
          (a, b) => getRegexPathConf(b).length - getRegexPathConf(a).length,
        );
        for (const fid of sorted) {
          if (folderTree[fid]) removeRegexFolderConf(fid);
        }
        resConfigDeleteSelected.clear();
        setResConfigDeleteMode( false);
        cfmToastr.success(`已删除 ${toDelete.length} 个正则文件夹`);
        renderRegexConfigBody(body.empty(), "create");
      });
      createBody.append(deleteBar);
    }

    // 3. 当前文件夹树形结构
    const treeSection = $(
      `<div class="cfm-config-section"><label>当前文件夹结构 <span style="font-size:11px;opacity:0.5;">(${allFolderIds.length} 个)</span> <span style="font-size:11px;opacity:0.5;color:#57f287;">点击选中为目标父级</span></label><div class="cfm-config-tree-actions"><button id="cfm-regex-config-expand-all" class="cfm-btn cfm-btn-sm"><i class="fa-solid fa-angles-down"></i> 展开</button><button id="cfm-regex-config-collapse-all" class="cfm-btn cfm-btn-sm"><i class="fa-solid fa-angles-up"></i> 收起</button></div><div class="cfm-tree" id="cfm-regex-folder-tree"></div></div>`,
    );
    createBody.append(treeSection);
    treeSection
      .find("#cfm-regex-config-expand-all")
      .on("click touchend", (e) => {
        e.preventDefault();
        for (const id of allFolderIds) expandedSet.add(id);
        renderRegexConfigBody(body.empty(), "create");
      });
    treeSection
      .find("#cfm-regex-config-collapse-all")
      .on("click touchend", (e) => {
        e.preventDefault();
        expandedSet.clear();
        renderRegexConfigBody(body.empty(), "create");
      });
    const treeContainer = treeSection.find("#cfm-regex-folder-tree");
    if (resConfigSelectedFolderIds.size > 0) {
      const selectedNames = Array.from(resConfigSelectedFolderIds)
        .map((id) => escapeHtml(getRegexDispName(id)))
        .join("、");
      const selectedHint = $(
        `<div class="cfm-selected-hint"><i class="fa-solid fa-crosshairs"></i> 已选中 ${resConfigSelectedFolderIds.size} 个：<strong>${selectedNames}</strong><button class="cfm-btn-deselect" title="全部取消选中"><i class="fa-solid fa-xmark"></i></button></div>`,
      );
      selectedHint.find(".cfm-btn-deselect").on("click touchend", (e) => {
        e.preventDefault();
        resConfigSelectedFolderIds.clear();
        renderRegexConfigBody(body.empty(), "create");
      });
      treeContainer.append(selectedHint);
    }
    const topFolders = sortRegexConf(getRegexTopLvlConf());
    if (topFolders.length === 0) {
      treeContainer.append(
        '<div class="cfm-empty" style="padding:16px;">还没有创建任何文件夹</div>',
      );
    } else {
      function renderRegexConfigTreeItem(container, folderId, depth) {
        const children = sortRegexConf(getRegexChildConf(folderId));
        const hasChildren = children.length > 0;
        const isExpanded = expandedSet.has(folderId);
        const count = countRegexInFolder(folderId);
        const isDelChecked = resConfigDeleteSelected.has(folderId);
        const indent = 10 + depth * 24;
        let checkboxHtml = "";
        if (getResConfigDeleteMode()) {
          checkboxHtml = `<span class="cfm-del-checkbox ${isDelChecked ? "cfm-del-checked" : ""}"><i class="fa-${isDelChecked ? "solid" : "regular"} fa-square${isDelChecked ? "-check" : ""}"></i></span>`;
        }
        const arrowHtml = `<span class="cfm-tnode-arrow cfm-config-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>`;
        const isResSelected = resConfigSelectedFolderIds.has(folderId);
        const item = $(
          `<div class="cfm-tree-item ${isResSelected ? "cfm-tree-selected" : ""}" data-folder-name="${escapeHtml(folderId)}" style="padding-left:${indent}px;">${checkboxHtml}${arrowHtml}<span class="cfm-tree-icon"><i class="fa-solid fa-folder${isResSelected ? "-open" : ""}"></i></span><span class="cfm-tree-name">${escapeHtml(getRegexDispName(folderId))}</span><span class="cfm-tnode-count" style="margin-left:auto;margin-right:8px;">${count}</span>${getResConfigDeleteMode() ? "" : `<span class="cfm-tree-actions"><button class="cfm-btn-danger cfm-regex-remove-folder" data-fname="${escapeHtml(folderId)}" title="删除此文件夹"><i class="fa-solid fa-trash-can"></i></button></span>`}</div>`,
        );
        item.find(".cfm-config-arrow").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!hasChildren) return;
          if (expandedSet.has(folderId)) expandedSet.delete(folderId);
          else expandedSet.add(folderId);
          renderRegexConfigBody(body.empty(), "create");
        });
        if (getResConfigDeleteMode()) {
          const toggleFn = (id, forceState) => {
            const shouldSelect =
              forceState !== undefined
                ? forceState
                : !resConfigDeleteSelected.has(id);
            if (shouldSelect) resConfigDeleteSelected.add(id);
            else resConfigDeleteSelected.delete(id);
            if (getResConfigDeleteCascade()) {
              const toggleDesc = (pid) => {
                for (const cid of getRegexChildConf(pid)) {
                  if (shouldSelect) resConfigDeleteSelected.add(cid);
                  else resConfigDeleteSelected.delete(cid);
                  toggleDesc(cid);
                }
              };
              toggleDesc(id);
            }
          };
          item.on("click touchend", (e) => {
            if ($(e.target).closest(".cfm-config-arrow").length) return;
            e.preventDefault();
            if (
              (e.shiftKey || getResConfigDeleteRangeMode()) &&
              getResConfigDeleteLastClickedId()
            ) {
              const flatList = getRegexFlatConf();
              const lastIdx = flatList.indexOf(getResConfigDeleteLastClickedId());
              const curIdx = flatList.indexOf(folderId);
              if (lastIdx >= 0 && curIdx >= 0) {
                const start = Math.min(lastIdx, curIdx);
                const end = Math.max(lastIdx, curIdx);
                for (let i = start; i <= end; i++)
                  resConfigDeleteSelected.add(flatList[i]);
              }
            } else {
              toggleFn(folderId);
            }
            setResConfigDeleteLastClickedId( folderId);
            renderRegexConfigBody(body.empty(), "create");
          });
        } else {
          item.on("click", (e) => {
            if (
              $(e.target).closest(".cfm-regex-remove-folder, .cfm-config-arrow")
                .length
            )
              return;
            e.preventDefault();
            if (resConfigSelectedFolderIds.has(folderId))
              resConfigSelectedFolderIds.delete(folderId);
            else resConfigSelectedFolderIds.add(folderId);
            renderRegexConfigBody(body.empty(), "create");
          });
          item.find(".cfm-regex-remove-folder").on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              !cfmConfirm(
                `确定删除文件夹「${getRegexDispName(folderId)}」吗？\n子文件夹将提升到上级，脚本将变为未归类。`,
              )
            )
              return;
            removeRegexFolderConf(folderId);
            resConfigSelectedFolderIds.delete(folderId);
            cfmToastr.success(
              `已删除正则文件夹「${getRegexDispName(folderId)}」`,
            );
            renderRegexConfigBody(body.empty(), "create");
          });
        }
        container.append(item);
        if (hasChildren) {
          const childContainer = $(
            `<div class="cfm-config-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
          );
          for (const childId of children)
            renderRegexConfigTreeItem(childContainer, childId, depth + 1);
          container.append(childContainer);
        }
      }
      for (const fid of topFolders)
        renderRegexConfigTreeItem(treeContainer, fid, 0);
    }

    // --- 批量创建弹窗（已迁移 settings/batch-create.js） ---
    function showRegexBatchCreatePopup() {
      showRegexBatchCreatePopupExternal(body);
    }
  }

  return {
    renderConfigBody,
    renderResourceConfigBody,
    renderRegexConfigBody,
  };
}
