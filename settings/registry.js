// 设置页注册表层：承接“设置、布局、新建文件”三模块页及其控件/动作元信息注册，供 settings/index.js 与 settings/pages/* 组合页面。

/**
 * 补全标签页折叠菜单配置。
 *
 * @param {object} customLayout 自定义布局配置对象
 * @returns {object|undefined} 标签页菜单配置对象
 */
export function ensureTabMenuConfigRegistry(customLayout) {
  if (!customLayout) return undefined;

  if (!customLayout.tabMenu || typeof customLayout.tabMenu !== "object") {
    customLayout.tabMenu = { enabled: false };
  }
  if (customLayout.tabMenu.enabled === undefined)
    customLayout.tabMenu.enabled = false;

  const orderedTabs = customLayout.tabs || [];
  for (const tab of orderedTabs) {
    if (tab.menu === undefined) tab.menu = false;
  }

  return customLayout.tabMenu;
}

/**
 * 补全各标签页工具栏按钮菜单配置。
 *
 * @param {object} customLayout 自定义布局配置对象
 * @param {Array<{id: string}>} tabMeta 标签页元数据列表
 * @returns {object|undefined} 工具栏菜单配置映射
 */
export function ensureToolbarMenuConfigRegistry(customLayout, tabMeta) {
  if (!customLayout) return undefined;

  if (!customLayout.tabMenus || Array.isArray(customLayout.tabMenus)) {
    customLayout.tabMenus = {};
  }

  for (const meta of tabMeta) {
    if (!customLayout.tabMenus[meta.id]) {
      customLayout.tabMenus[meta.id] = { enabled: false };
    }
    if (customLayout.tabMenus[meta.id].enabled === undefined) {
      customLayout.tabMenus[meta.id].enabled = false;
    }
  }

  return customLayout.tabMenus;
}
