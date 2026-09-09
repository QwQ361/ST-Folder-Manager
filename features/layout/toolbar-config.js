// 工具栏配置层：承接 CFM_ACTION_META、工具栏动作可见性、排序与自定义布局配置。

/**
 * 获取指定标签页的工具栏按钮菜单配置。
 *
 * @param {object} customLayout 自定义布局配置对象
 * @param {string} tabId 标签页 ID
 * @returns {{enabled: boolean}} 工具栏菜单配置
 */
export function getToolbarMenuConfigCore(customLayout, tabId) {
  return customLayout?.tabMenus?.[tabId] || { enabled: false };
}
