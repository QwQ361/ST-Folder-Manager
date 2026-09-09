// 快速新建文件夹弹窗层：showQuickAddFolderPopup（含嵌套 doCreate），按资源类型在当前选中文件夹下创建新文件夹。
// 依赖状态（selected* / cfmChatlogTargetAvatar / config）通过 state getter/setter 注入；Set/对象状态通过引用注入。
export function createQuickAddApi(deps) {
  const {
    $,
    extensionName,
    extension_settings,
    cfmToastr,
    getContext,
    saveConfig,
    findOrCreateTag,
    getTagName,
    addResFolder,
    getResFolderDisplayName,
    state,
    renderLeftTree,
    renderRightPane,
    renderPresetsView,
    renderWorldInfoView,
    renderThemesView,
    renderBackgroundsView,
    renderPersonasView,
    renderRegexView,
    renderQRView,
    renderChatlogsView,
  } = deps;

  function showQuickAddFolderPopup(tab) {
    // 确定当前选中的父文件夹
    let parentId = null;
    if (tab === "chars") {
      if (
        state.selectedTreeNode &&
        state.selectedTreeNode !== "__uncategorized__" &&
        state.selectedTreeNode !== "__favorites__"
      ) {
        parentId = state.selectedTreeNode;
      }
    } else if (tab === "presets") {
      if (
        state.selectedPresetFolder &&
        state.selectedPresetFolder !== "__ungrouped__" &&
        state.selectedPresetFolder !== "__favorites__"
      ) {
        parentId = state.selectedPresetFolder;
      }
    } else if (tab === "worldinfo") {
      if (
        state.selectedWorldInfoFolder &&
        state.selectedWorldInfoFolder !== "__ungrouped__" &&
        state.selectedWorldInfoFolder !== "__favorites__"
      ) {
        parentId = state.selectedWorldInfoFolder;
      }
    } else if (tab === "themes") {
      if (
        state.selectedThemeFolder &&
        state.selectedThemeFolder !== "__ungrouped__" &&
        state.selectedThemeFolder !== "__favorites__"
      ) {
        parentId = state.selectedThemeFolder;
      }
    } else if (tab === "backgrounds") {
      if (
        state.selectedBgFolder &&
        state.selectedBgFolder !== "__ungrouped__" &&
        state.selectedBgFolder !== "__favorites__"
      ) {
        parentId = state.selectedBgFolder;
      }
    } else if (tab === "personas") {
      if (
        state.selectedPersonaFolder &&
        state.selectedPersonaFolder !== "__ungrouped__" &&
        state.selectedPersonaFolder !== "__favorites__"
      ) {
        parentId = state.selectedPersonaFolder;
      }
    } else if (tab === "regex") {
      if (
        state.selectedRegexNode &&
        state.selectedRegexNode !== "__ungrouped__" &&
        state.selectedRegexNode !== "__favorites__"
      ) {
        parentId = state.selectedRegexNode;
      }
    } else if (tab === "quickreply") {
      if (
        state.selectedQrFolder &&
        state.selectedQrFolder !== "__ungrouped__" &&
        state.selectedQrFolder !== "__favorites__"
      ) {
        parentId = state.selectedQrFolder;
      }
    } else if (tab === "chatlogs") {
      if (
        state.selectedChatlogFolder &&
        state.selectedChatlogFolder !== "__ungrouped__" &&
        state.selectedChatlogFolder !== "__all__"
      ) {
        parentId = state.selectedChatlogFolder;
      }
    }

    // 获取父文件夹显示名
    let parentHint = "顶级";
    if (parentId) {
      if (tab === "chars") {
        parentHint = `「${getTagName(parentId)}」下`;
      } else if (tab === "regex") {
        const ft = extension_settings[extensionName].regexFolderTree;
        parentHint = `「${ft?.[parentId]?.displayName || parentId}」下`;
      } else if (tab === "chatlogs") {
        const avatar = state.cfmChatlogTargetAvatar;
        const ft = avatar
          ? extension_settings[extensionName].chatlogFolderTree[avatar] || {}
          : {};
        parentHint = `「${ft?.[parentId]?.displayName || parentId}」下`;
      } else {
        parentHint = `「${getResFolderDisplayName(tab, parentId)}」下`;
      }
    }

    // 创建弹窗
    const overlay = $('<div class="cfm-fullscreen-confirm-overlay"></div>');
    const dialog = $(`
      <div class="cfm-fullscreen-confirm-dialog" style="text-align:left;">
        <div class="cfm-fullscreen-confirm-icon"><i class="fa-solid fa-folder-plus"></i></div>
        <div class="cfm-fullscreen-confirm-title">新建文件夹</div>
        <div class="cfm-fullscreen-confirm-desc" style="margin-bottom:12px;">在 <strong>${parentHint}</strong> 创建新文件夹</div>
        <input type="text" class="cfm-quick-add-input" placeholder="输入文件夹名称" style="width:100%;padding:10px 12px;font-size:14px;border:1px solid var(--SmartThemeBorderColor, #45475a);border-radius:8px;background:rgba(255,255,255,0.06);color:inherit;outline:none;box-sizing:border-box;margin-bottom:16px;" />
        <div class="cfm-fullscreen-confirm-actions">
          <button class="cfm-btn cfm-fullscreen-cancel">取消</button>
          <button class="cfm-btn cfm-fullscreen-ok"><i class="fa-solid fa-check"></i> 创建</button>
        </div>
      </div>
    `);

    const input = dialog.find(".cfm-quick-add-input");
    const okBtn = dialog.find(".cfm-fullscreen-ok");
    const cancelBtn = dialog.find(".cfm-fullscreen-cancel");

    const close = () => {
      overlay.remove();
      dialog.remove();
    };

    const doCreate = () => {
      const name = input.val().trim();
      if (!name) {
        cfmToastr.warning("文件夹名称不能为空");
        input.focus();
        return;
      }

      let success = false;
      let newFolderId = null;

      if (tab === "chars") {
        // 角色标签用 findOrCreateTag + config
        const { tag, displayName } = findOrCreateTag(name, parentId || null);
        if (!state.config.folders[tag.id]) {
          state.config.folders[tag.id] = { parentId: parentId || null };
          if (displayName) state.config.folders[tag.id].displayName = displayName;
          const _ex = extension_settings[extensionName].excludedTagIds;
          const _exi = _ex.indexOf(tag.id);
          if (_exi >= 0) _ex.splice(_exi, 1);
          saveConfig(state.config);
          getContext().saveSettingsDebounced();
          success = true;
          newFolderId = tag.id;
        } else {
          cfmToastr.warning(`文件夹「${name}」已存在`);
          return;
        }
      } else if (tab === "regex") {
        // 正则用 regexFolderTree
        const folderTree = extension_settings[extensionName].regexFolderTree;
        let folderName = name;
        if (parentId) folderName = parentId + "-" + name;
        if (folderTree[folderName]) {
          cfmToastr.warning(`文件夹「${name}」已存在`);
          return;
        }
        const siblings = Object.keys(folderTree).filter(
          (k) => (folderTree[k]?.parentId || null) === (parentId || null),
        );
        const maxOrder = siblings.reduce(
          (m, id) => Math.max(m, folderTree[id]?.sortOrder ?? 0),
          0,
        );
        const entry = { parentId: parentId || null, sortOrder: maxOrder + 1 };
        if (parentId) entry.displayName = name;
        folderTree[folderName] = entry;
        getContext().saveSettingsDebounced();
        success = true;
        newFolderId = folderName;
      } else if (tab === "chatlogs") {
        // 聊天记录用 chatlogFolderTree[avatar]
        const avatar = state.cfmChatlogTargetAvatar;
        if (!avatar) {
          cfmToastr.warning("未选中角色，无法创建文件夹");
          return;
        }
        if (!extension_settings[extensionName].chatlogFolderTree[avatar]) {
          extension_settings[extensionName].chatlogFolderTree[avatar] = {};
        }
        const folderTree =
          extension_settings[extensionName].chatlogFolderTree[avatar];
        let folderName = name;
        if (parentId) folderName = parentId + "-" + name;
        if (folderTree[folderName]) {
          cfmToastr.warning(`文件夹「${name}」已存在`);
          return;
        }
        const siblings = Object.keys(folderTree).filter(
          (k) => (folderTree[k]?.parentId || null) === (parentId || null),
        );
        const maxOrder = siblings.reduce(
          (m, id) => Math.max(m, folderTree[id]?.sortOrder ?? 0),
          0,
        );
        const entry = { parentId: parentId || null, sortOrder: maxOrder + 1 };
        if (parentId) entry.displayName = name;
        folderTree[folderName] = entry;
        getContext().saveSettingsDebounced();
        success = true;
        newFolderId = folderName;
      } else {
        // 其他资源类型用 addResFolder
        let folderName = name;
        let displayName = null;
        if (parentId) {
          folderName = parentId + "-" + name;
          displayName = name;
        }
        if (addResFolder(tab, folderName, parentId, displayName)) {
          success = true;
          newFolderId = folderName;
        } else {
          cfmToastr.warning(`文件夹「${name}」已存在`);
          return;
        }
      }

      if (success) {
        cfmToastr.success(`已创建文件夹「${name}」`);
        close();
        // 刷新当前视图
        if (tab === "chars") {
          renderLeftTree();
          renderRightPane();
        } else if (tab === "presets") {
          renderPresetsView();
        } else if (tab === "worldinfo") {
          renderWorldInfoView();
        } else if (tab === "themes") {
          renderThemesView();
        } else if (tab === "backgrounds") {
          renderBackgroundsView();
        } else if (tab === "personas") {
          renderPersonasView();
        } else if (tab === "regex") {
          renderRegexView();
        } else if (tab === "quickreply") {
          renderQRView();
        } else if (tab === "chatlogs") {
          renderChatlogsView();
        }
      }
    };

    okBtn.on("click touchend", (e) => {
      e.preventDefault();
      doCreate();
    });
    cancelBtn.on("click touchend", (e) => {
      e.preventDefault();
      close();
    });
    overlay.on("click touchend", (e) => {
      e.preventDefault();
      close();
    });
    // 回车创建
    input.on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doCreate();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    $("#cfm-popup").append(overlay).append(dialog);
    // 延迟聚焦，确保弹窗已渲染
    setTimeout(() => input.focus(), 100);
  }

  return { showQuickAddFolderPopup };
}
