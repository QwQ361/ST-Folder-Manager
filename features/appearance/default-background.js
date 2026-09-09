// 默认背景策略层：承接 defaultBackground 的读取、保存、导入恢复与背景重命名后的引用迁移；背景资源本体逻辑应放在 features/backgrounds。

export function handleDefaultBgSettingCore(deps) {
  deps.$("#cfm-defbg-overlay").remove();

  const currentDefault = deps.extensionSettings[deps.extensionName].defaultBackground || "";
  const currentBg = deps.getCurrentBackgroundFile();
  const currentDefaultDisplay = currentDefault
    ? deps.getBackgroundDisplayName(currentDefault)
    : "未设置";
  const currentBgDisplay = currentBg ? deps.getBackgroundDisplayName(currentBg) : "无";
  const setDisabled = !currentBg || currentBg === currentDefault;
  const clearDisabled = !currentDefault;

  const overlay = deps.$('<div id="cfm-defbg-overlay" class="cfm-batch-overlay"></div>');
  const dialog = deps.$(`
    <div class="cfm-batch-popup" style="max-width:420px;">
      <div class="cfm-config-header"><h3>🖼️ 默认背景设置</h3><button class="cfm-btn-close" id="cfm-defbg-close">&times;</button></div>
      <div style="padding:16px;text-align:center;">
        <p style="margin-bottom:8px;font-size:13px;">当前默认背景：<b style="color:#f5c542;">${deps.escapeHtml(currentDefaultDisplay)}</b></p>
        <p style="margin-bottom:12px;font-size:13px;">当前使用背景：<b style="color:#5dade2;">${deps.escapeHtml(currentBgDisplay)}</b></p>
        <p style="font-size:12px;opacity:0.7;margin-bottom:16px;">切换到没有绑定背景的美化主题时，将自动应用默认背景</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <button class="cfm-btn" id="cfm-defbg-set" ${setDisabled ? 'disabled style="opacity:0.4;pointer-events:none;"' : 'style="background:rgba(166,227,161,0.15);border-color:rgba(166,227,161,0.4);"'}>设为当前背景</button>
          <button class="cfm-btn" id="cfm-defbg-clear" ${clearDisabled ? 'disabled style="opacity:0.4;pointer-events:none;"' : 'style="background:rgba(237,66,69,0.15);border-color:rgba(237,66,69,0.4);color:#e74c3c;"'}>清除默认背景</button>
          <button class="cfm-btn" id="cfm-defbg-cancel" style="opacity:0.7;">取消</button>
        </div>
      </div>
    </div>
  `);

  overlay.append(dialog);
  deps.$("body").append(overlay);

  const closeOverlay = () => overlay.remove();

  dialog.find("#cfm-defbg-close, #cfm-defbg-cancel").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOverlay();
  });

  dialog.find("#cfm-defbg-set").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deps.extensionSettings[deps.extensionName].defaultBackground = currentBg;
    deps.saveSettingsDebounced();
    deps.cfmToastr.success(
      `已将默认背景设为「${deps.getBackgroundDisplayName(currentBg)}」`,
    );
    closeOverlay();
    deps.updateDefaultBgBtnState();
  });

  dialog.find("#cfm-defbg-clear").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deps.cfmConfirm("确认清除默认背景吗？")) return;
    deps.extensionSettings[deps.extensionName].defaultBackground = "";
    deps.saveSettingsDebounced();
    deps.cfmToastr.info("已清除默认背景");
    closeOverlay();
    deps.updateDefaultBgBtnState();
  });

  overlay.on("click", (e) => {
    if (deps.$(e.target).is(overlay)) closeOverlay();
  });
}

export function updateDefaultBgBtnStateCore(deps) {
  const btn = deps.$("#cfm-bg-default-btn");
  if (!btn.length) return;

  const defaultBackground = deps.extensionSettings[deps.extensionName].defaultBackground;
  const hasDefault = !!defaultBackground;

  if (hasDefault) {
    btn.addClass("cfm-edit-active");
    btn.attr(
      "title",
      `默认背景: ${deps.getBackgroundDisplayName(defaultBackground)} (点击管理)`,
    );
  } else {
    btn.removeClass("cfm-edit-active");
    btn.attr("title", "设置默认背景");
  }
}
