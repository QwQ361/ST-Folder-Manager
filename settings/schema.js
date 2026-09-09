// 设置页结构描述层：承接设置页三模块中各控件、tab、动作和表单字段的 schema；不直接读写 DOM 或执行业务动作。

/**
 * 补全资源类设置结构，并迁移旧的 flat resourceFolders 到 resourceFolderTree。
 *
 * @param {object} options
 * @param {object} options.extensionSettings SillyTavern extension_settings 对象
 * @param {string} options.extensionName 插件扩展名
 * @param {Function} options.saveSettingsDebounced SillyTavern 设置保存防抖函数
 * @returns {object} 插件自己的设置命名空间对象
 */
export function ensureResourceSettingsSchema({
  extensionSettings,
  extensionName,
  saveSettingsDebounced,
}) {
  const settings = extensionSettings[extensionName];

  if (!settings.presetGroups) settings.presetGroups = {};
  if (!settings.worldInfoGroups) settings.worldInfoGroups = {};
  if (!settings.themeGroups) settings.themeGroups = {};
  if (!settings.bgGroups) settings.bgGroups = {};
  if (!settings.personaGroups) settings.personaGroups = {};
  if (!settings.themeNotes) settings.themeNotes = {};
  if (!settings.presetNotes) settings.presetNotes = {};
  if (!settings.worldInfoNotes) settings.worldInfoNotes = {};
  if (!settings.bgNotes) settings.bgNotes = {};
  if (!settings.personaNotes) settings.personaNotes = {};
  if (!settings.bgOrientations) settings.bgOrientations = {};
  if (!settings.themeBackgroundBindings) settings.themeBackgroundBindings = {};
  if (!settings.worldInfoEntryDetailSortMode)
    settings.worldInfoEntryDetailSortMode = "custom";
  if (settings.defaultSearchScope === undefined)
    settings.defaultSearchScope = "current";
  // 默认背景图（切换到没有绑定背景的主题时使用，空字符串=不设置）
  if (settings.defaultBackground === undefined) settings.defaultBackground = "";

  // 迁移旧的 flat resourceFolders 到 tree 结构
  if (!settings.resourceFolderTree) {
    settings.resourceFolderTree = {
      presets: {},
      worldinfo: {},
      themes: {},
      backgrounds: {},
      personas: {},
    };
    // 迁移旧数据
    const oldFolders = settings.resourceFolders;
    if (oldFolders) {
      for (const type of ["presets", "worldinfo"]) {
        const arr = oldFolders[type] || [];
        arr.forEach((name, i) => {
          settings.resourceFolderTree[type][name] = {
            parentId: null,
            sortOrder: i + 1,
          };
        });
      }
      delete settings.resourceFolders;
      saveSettingsDebounced();
    }
  }

  if (!settings.resourceFolderTree.presets)
    settings.resourceFolderTree.presets = {};
  if (!settings.resourceFolderTree.worldinfo)
    settings.resourceFolderTree.worldinfo = {};
  if (!settings.resourceFolderTree.themes)
    settings.resourceFolderTree.themes = {};
  if (!settings.resourceFolderTree.backgrounds)
    settings.resourceFolderTree.backgrounds = {};
  if (!settings.resourceFolderTree.personas)
    settings.resourceFolderTree.personas = {};

  // 正则标签页：全局正则的虚拟文件夹树和脚本分组
  if (!settings.regexFolderTree) settings.regexFolderTree = {};
  if (!settings.regexGlobalGroups) settings.regexGlobalGroups = {};
  if (settings.defaultRegexTransferMode !== "copy")
    settings.defaultRegexTransferMode = "move";

  // 快速回复标签页
  if (!settings.qrGroups) settings.qrGroups = {};
  if (!settings.qrNotes) settings.qrNotes = {};
  if (!settings.resourceFolderTree.quickreply)
    settings.resourceFolderTree.quickreply = {};

  // 聊天记录文件夹树（按角色 avatar 分组）
  if (!settings.chatlogFolderTree) settings.chatlogFolderTree = {};
  // 聊天记录归类映射（按角色 avatar 分组）
  if (!settings.chatlogAssignments) settings.chatlogAssignments = {};

  // QR激活分组预设：[{name, sets, scope, bindChars, bindPresets}]
  if (!settings.qrActivePresets) settings.qrActivePresets = [];
  // 迁移旧格式
  for (const p of settings.qrActivePresets) {
    if (!p.scope) p.scope = "global";
    if (!Array.isArray(p.bindChars)) p.bindChars = [];
    if (!Array.isArray(p.bindPresets)) p.bindPresets = [];
  }

  return settings;
}
