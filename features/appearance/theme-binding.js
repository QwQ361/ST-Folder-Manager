// 主题背景绑定层：承接 themeBackgroundBindings 的读取、保存、导入恢复，以及主题或背景重命名后的绑定键/值同步修复。

export function setupThemeBgBindingListenerCore(deps) {
  const themesSelect = deps.document.getElementById("themes");
  if (!themesSelect) return;

  deps.setLastThemeForBgBinding(themesSelect.value || null);

  deps.$(themesSelect).on("change.cfmBgBinding", function () {
    const newTheme = this.value;
    if (!newTheme || newTheme === deps.getLastThemeForBgBinding()) return;

    deps.setLastThemeForBgBinding(newTheme);

    const boundBg = deps.getThemeBgBinding(newTheme);
    const defaultBg = deps.extensionSettings[deps.extensionName].defaultBackground || "";

    if (boundBg) {
      deps.setTimeout(() => {
        const currentBg = deps.getCurrentBackgroundFile();
        if (currentBg !== boundBg) {
          deps.applyBackground(boundBg);
          deps.cfmToastr.info(
            `已自动切换背景为「${deps.getBackgroundDisplayName(boundBg)}」`,
            "主题绑定背景",
            { timeOut: 2000 },
          );
        }
      }, 500);
    } else if (defaultBg) {
      deps.setTimeout(() => {
        const currentBg = deps.getCurrentBackgroundFile();
        if (currentBg !== defaultBg) {
          deps.applyBackground(defaultBg);
          deps.cfmToastr.info(
            `已自动切换为默认背景「${deps.getBackgroundDisplayName(defaultBg)}」`,
            "默认背景",
            { timeOut: 2000 },
          );
        }
      }, 500);
    }

    deps.setTimeout(() => deps.applyCustomStyle(), 600);
  });
}

export function getThemeBgBindingCore(themeName, deps) {
  return deps.extensionSettings[deps.extensionName].themeBackgroundBindings?.[themeName] || "";
}

export function setThemeBgBindingCore(themeName, bgfile, deps) {
  if (!deps.extensionSettings[deps.extensionName].themeBackgroundBindings) {
    deps.extensionSettings[deps.extensionName].themeBackgroundBindings = {};
  }

  if (bgfile) {
    deps.extensionSettings[deps.extensionName].themeBackgroundBindings[themeName] = bgfile;
  } else {
    delete deps.extensionSettings[deps.extensionName].themeBackgroundBindings[themeName];
  }

  deps.saveSettingsDebounced();
}

export function removeThemeBgBindingCore(themeName, deps) {
  deps.setThemeBgBinding(themeName, "");
}

export function getCurrentBackgroundFileCore(deps) {
  const bg1 = deps.document.getElementById("bg1");
  if (!bg1) return "";

  const style = bg1.getAttribute("style") || "";
  const match = style.match(/url\(["']?\/?backgrounds\/([^"')]+)["']?\)/);

  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return "";
}

export function handleThemeBgLinkCore(themeName, deps) {
  const themesSelect = deps.document.getElementById("themes");
  const selectValue = themesSelect ? themesSelect.value : null;
  const powerUserTheme = (deps.getContext().powerUserSettings || {}).theme || null;
  const isCurrentTheme = themeName === selectValue || themeName === powerUserTheme;

  if (!isCurrentTheme) {
    deps.cfmToastr.warning("请先应用该美化主题，再点击锁链绑定背景", "提示", {
      timeOut: 3000,
    });
    return;
  }

  const existingBinding = deps.getThemeBgBinding(themeName);
  const currentBg = deps.getCurrentBackgroundFile();

  if (existingBinding) {
    deps.$("#cfm-bglink-overlay").remove();

    const bgDisplayName = deps.getBackgroundDisplayName(existingBinding);
    const currentBgDisplay = currentBg ? deps.getBackgroundDisplayName(currentBg) : "无";
    const updateDisabled = !currentBg || currentBg === existingBinding;
    const overlay = deps.$('<div id="cfm-bglink-overlay" class="cfm-batch-overlay"></div>');
    const dialog = deps.$(`
      <div class="cfm-batch-popup" style="max-width:420px;">
        <div class="cfm-config-header"><h3>🔗 主题背景绑定</h3><button class="cfm-btn-close" id="cfm-bglink-close">&times;</button></div>
        <div style="padding:16px;text-align:center;">
          <p style="margin-bottom:8px;font-size:13px;">当前绑定背景：<b style="color:#f5c542;">${deps.escapeHtml(bgDisplayName)}</b></p>
          <p style="margin-bottom:12px;font-size:13px;">当前使用背景：<b style="color:#5dade2;">${deps.escapeHtml(currentBgDisplay)}</b></p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <button class="cfm-btn" id="cfm-bglink-update" ${updateDisabled ? 'disabled style="opacity:0.4;pointer-events:none;"' : 'style="background:rgba(166,227,161,0.15);border-color:rgba(166,227,161,0.4);"'}>更新为当前背景</button>
            <button class="cfm-btn" id="cfm-bglink-unbind" style="background:rgba(237,66,69,0.15);border-color:rgba(237,66,69,0.4);color:#e74c3c;">解除绑定</button>
            <button class="cfm-btn" id="cfm-bglink-cancel" style="opacity:0.7;">取消</button>
          </div>
        </div>
      </div>
    `);

    overlay.append(dialog);
    deps.$("body").append(overlay);

    const closeOverlay = () => overlay.remove();

    dialog.find("#cfm-bglink-close, #cfm-bglink-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeOverlay();
    });

    dialog.find("#cfm-bglink-update").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deps.setThemeBgBinding(themeName, currentBg);
      deps.cfmToastr.success(
        `已更新「${themeName}」绑定背景为「${deps.getBackgroundDisplayName(currentBg)}」`,
      );
      closeOverlay();
      if (deps.getCurrentResourceType() === "themes") deps.renderThemesView();
    });

    dialog.find("#cfm-bglink-unbind").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deps.removeThemeBgBinding(themeName);
      deps.cfmToastr.info(`已解除「${themeName}」的背景绑定`);
      closeOverlay();
      if (deps.getCurrentResourceType() === "themes") deps.renderThemesView();
    });

    overlay.on("click", (e) => {
      if (deps.$(e.target).is(overlay)) closeOverlay();
    });
    return;
  }

  if (!currentBg) {
    deps.cfmToastr.warning("当前没有使用任何背景，无法绑定", "提示");
    return;
  }

  deps.setThemeBgBinding(themeName, currentBg);
  deps.cfmToastr.success(
    `已将「${themeName}」绑定背景「${deps.getBackgroundDisplayName(currentBg)}」`,
  );
  if (deps.getCurrentResourceType() === "themes") deps.renderThemesView();
}
