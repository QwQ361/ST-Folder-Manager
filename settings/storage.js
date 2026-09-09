// 设置页存储层：承接 extension_settings[extensionName] 中插件设置页相关数据的读取、写入、保存防抖与命名空间校验。

/**
 * 迁移旧 localStorage 中的文件夹配置到 extension_settings 命名空间。
 *
 * @param {object} options
 * @param {object} options.settings 插件自己的 extension_settings[extensionName] 对象
 * @param {string} options.storageKey 旧 localStorage key
 */
export function migrateLegacyFolderConfig({ settings, storageKey }) {
  try {
    const oldRaw = localStorage.getItem(storageKey);
    if (oldRaw) {
      const oldConfig = JSON.parse(oldRaw);
      if (
        oldConfig.folders &&
        Object.keys(oldConfig.folders).length > 0 &&
        Object.keys(settings.folders).length === 0
      ) {
        settings.folders = oldConfig.folders;
      }
      localStorage.removeItem(storageKey);
    }
  } catch (e) {}
}
