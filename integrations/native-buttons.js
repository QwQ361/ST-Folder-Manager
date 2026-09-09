// 原生按钮集成层：承接插件入口按钮模式读取、保存与初始化逻辑。

export function getButtonModeCore(deps) {
  return deps.extensionSettings[deps.extensionName].buttonMode || "topbar";
}

export function setButtonModeCore(mode, deps) {
  deps.extensionSettings[deps.extensionName].buttonMode = mode;
  deps.saveSettingsDebounced();
}

export function initButtonCore(deps) {
  const mode = deps.getButtonMode();
  if (mode === "topbar") deps.createTopbarButton();
  else if (mode === "wand") deps.createWandButton();
  else deps.createFloatingButton();

  // 监听主题切换，自动切换绑定的背景（所有按钮模式都需要）
  deps.setTimeout(() => deps.setupThemeBgBindingListener(), 500);
}
