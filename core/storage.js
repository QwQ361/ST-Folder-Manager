// 核心持久化适配层：承接角色文件夹 config 与资源树设置的底层读写封装，统一隔离 loadConfig/saveConfig 与 saveSettingsDebounced 调用。

/**
 * 从插件设置命名空间读取角色文件夹配置。
 *
 * @param {object} options
 * @param {object} options.extensionSettings SillyTavern extension_settings 对象
 * @param {string} options.extensionName 插件扩展名
 * @returns {{ folders: object }} 角色文件夹配置对象
 */
export function loadFolderConfig({ extensionSettings, extensionName }) {
  return { folders: extensionSettings[extensionName].folders || {} };
}

/**
 * 保存角色文件夹配置到插件设置命名空间，并触发 SillyTavern 设置保存防抖。
 *
 * @param {object} options
 * @param {object} options.extensionSettings SillyTavern extension_settings 对象
 * @param {string} options.extensionName 插件扩展名
 * @param {{ folders: object }} options.config 角色文件夹配置对象
 * @param {Function} options.saveSettingsDebounced SillyTavern 设置保存防抖函数
 */
export function saveFolderConfig({
  extensionSettings,
  extensionName,
  config,
  saveSettingsDebounced,
}) {
  extensionSettings[extensionName].folders = config.folders;
  saveSettingsDebounced();
}
