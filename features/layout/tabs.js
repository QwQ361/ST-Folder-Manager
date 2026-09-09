// 资源 tab 布局层：承接 CFM_TAB_META、可见 tab、菜单 tab 与当前资源页切换相关的布局配置逻辑。

/**
 * 获取标签页折叠菜单配置。
 *
 * @param {object} customLayout 自定义布局配置对象
 * @returns {{enabled: boolean}} 标签页菜单配置
 */
export function getTabMenuConfigCore(customLayout) {
  return customLayout?.tabMenu || { enabled: false };
}
