// 主题观察集成层：承接 SillyTavern 主题变化、DOM class 变化与插件外观样式同步触发。
// 本模块负责"编排"：实例化顶栏图标主题观察 controller（核心检测逻辑在 ui/toolbar/buttons.js），
// 并组合主题背景绑定自动切换监听（核心逻辑在 features/appearance/theme-binding.js）。

import { createTopbarIconThemeObserverController } from "../ui/toolbar/buttons.js";
import { setupThemeBgBindingListenerCore } from "../features/appearance/theme-binding.js";

/**
 * 创建主题观察集成 API
 * 封装顶栏图标主题适配（MutationObserver + 轮询）与主题背景绑定自动切换两套监听
 * @param {Object} deps - 依赖注入
 * @returns {Object} 主题观察 API
 */
export function createThemeObserverApi(deps) {
  const topbarIconThemeObserverController =
    createTopbarIconThemeObserverController({
      MutationObserver: deps.MutationObserver,
      Node: deps.Node,
      applyCustomIcon: deps.applyCustomIcon,
      clearCustomIcon: deps.clearCustomIcon,
      clearInterval: deps.clearInterval,
      detectNeighborIcon: deps.detectNeighborIcon,
      document: deps.document,
      extensionName: deps.extensionName,
      extensionSettings: deps.extensionSettings,
      setInterval: deps.setInterval,
      setTimeout: deps.setTimeout,
    });

  // ==================== 主题切换自动监听 ====================

  /**
   * 启动主题切换监听
   * 同时使用 MutationObserver 和轮询两种策略确保可靠检测
   */
  function setupThemeChangeObserver() {
    return topbarIconThemeObserverController.setupThemeChangeObserver();
  }

  /**
   * 主题样式发生变化时的回调
   * 如果用户没有手动指定图标（customTopbarIcon 为空），则自动重新检测并应用
   */
  function onThemeStyleChange() {
    return topbarIconThemeObserverController.onThemeStyleChange();
  }

  // ==================== 美化主题绑定背景 - 自动切换监听 ====================
  let _lastThemeForBgBinding = null;
  function setupThemeBgBindingListener() {
    return setupThemeBgBindingListenerCore({
      $: deps.$,
      applyBackground: deps.applyBackground,
      applyCustomStyle: deps.applyCustomStyle,
      cfmToastr: deps.cfmToastr,
      document: deps.document,
      extensionName: deps.extensionName,
      extensionSettings: deps.extensionSettings,
      getBackgroundDisplayName: deps.getBackgroundDisplayName,
      getCurrentBackgroundFile: deps.getCurrentBackgroundFile,
      getLastThemeForBgBinding: () => _lastThemeForBgBinding,
      getThemeBgBinding: deps.getThemeBgBinding,
      setLastThemeForBgBinding: (value) => {
        _lastThemeForBgBinding = value;
      },
      setTimeout: deps.setTimeout,
    });
  }

  function getLastThemeForBgBinding() {
    return _lastThemeForBgBinding;
  }

  function setLastThemeForBgBinding(value) {
    _lastThemeForBgBinding = value;
  }

  return {
    getLastThemeForBgBinding,
    onThemeStyleChange,
    setLastThemeForBgBinding,
    setupThemeBgBindingListener,
    setupThemeChangeObserver,
  };
}
