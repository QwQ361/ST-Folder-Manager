// 设置页默认值层：承接插件设置页所需配置的默认值补全、旧配置迁移与缺省字段初始化，不负责渲染三模块页。

import { migrateLegacyFolderConfig } from "./storage.js";

/**
 * 补全插件设置默认值，并执行旧 localStorage 文件夹配置迁移。
 *
 * @param {object} options
 * @param {object} options.extensionSettings SillyTavern extension_settings 对象
 * @param {string} options.extensionName 插件扩展名
 * @param {string} options.storageKey 旧 localStorage key
 * @returns {object} 插件自己的设置命名空间对象
 */
export function ensureSettingsDefaults({
  extensionSettings,
  extensionName,
  storageKey,
}) {
  if (!extensionSettings[extensionName]) extensionSettings[extensionName] = {};

  const settings = extensionSettings[extensionName];

  if (!settings.folders) settings.folders = {};
  if (!settings.favorites) settings.favorites = [];
  if (!Array.isArray(settings.hiddenChars)) settings.hiddenChars = [];
  // 缝合备忘录（预设/世界书条目互通收藏与暂存）
  if (
    !settings.entryTransferMemo ||
    !Array.isArray(settings.entryTransferMemo.groups)
  ) {
    settings.entryTransferMemo = { groups: [] };
  }

  migrateLegacyFolderConfig({ settings, storageKey });

  if (!settings.buttonMode) settings.buttonMode = "topbar";
  if (settings.firstInitDone === undefined) settings.firstInitDone = false;
  // 被用户主动删除（但保留标签）的文件夹ID列表，防止自动重新导入
  if (!Array.isArray(settings.excludedTagIds)) settings.excludedTagIds = [];
  // 是否自动录入新标签为文件夹（默认开启，兼容旧行为）
  if (settings.autoImportTags === undefined) settings.autoImportTags = true;
  // 批量创建文件夹结构模板（按类型分开存储）
  if (!settings.batchTemplates || Array.isArray(settings.batchTemplates)) {
    // 迁移旧的数组格式到新的对象格式
    const oldArr = Array.isArray(settings.batchTemplates)
      ? settings.batchTemplates
      : [];
    settings.batchTemplates = {
      characters: oldArr,
      presets: [],
      worldinfo: [],
    };
  }
  if (!settings.batchTemplates.characters)
    settings.batchTemplates.characters = [];
  if (!settings.batchTemplates.presets) settings.batchTemplates.presets = [];
  if (!settings.batchTemplates.worldinfo)
    settings.batchTemplates.worldinfo = [];
  // 导入角色卡时自动提取内嵌世界书的目标文件夹（null=不自动提取）
  if (settings.autoCharBookFolder === undefined)
    settings.autoCharBookFolder = null;
  // 自定义顶栏图标URL（空字符串=使用默认FA图标，"auto"=自动检测，其他=指定URL）
  if (settings.customTopbarIcon === undefined) settings.customTopbarIcon = "";
  // 默认打开页面："chars"|"worldinfo"|"presets"|"themes"|"backgrounds"|"last"（记住上次）
  if (settings.defaultOpenPage === undefined)
    settings.defaultOpenPage = "chars";
  // 上次关闭时的状态（仅当 defaultOpenPage === "last" 时使用）
  if (settings.lastOpenState === undefined)
    settings.lastOpenState = {
      resourceType: "chars",
      selectedFolder: null,
      expandedNodes: [],
    };
  // 移动端顶部栏避让开关（默认开启）
  if (settings.mobileTopbarAvoid === undefined)
    settings.mobileTopbarAvoid = true;
  // 移动端下栏全屏模式："to-search"(至搜索栏，默认) | "to-tabs"(至标签页) | "true-full"(真全屏)
  if (!settings.mobileFullscreenMode)
    settings.mobileFullscreenMode = "to-search";
  // 界面语言："zh-CN"(简体中文，默认) | "zh-TW"(繁体中文)
  if (!settings.language) settings.language = "zh-CN";
  // 本地备份桥接（127.0.0.1:36925）连接开关：默认关闭，避免无后台服务时反复报 ERR_CONNECTION_REFUSED
  if (settings.bridgeEnabled === undefined) settings.bridgeEnabled = false;
  // 角色卡右栏排序模式持久化：null | "az" | "za" | "time"
  if (settings.charRightSortMode === undefined)
    settings.charRightSortMode = null;
  // 自定义布局：标签页可见性/排序 + 子功能可见性/排序
  if (!settings.customLayout) {
    settings.customLayout = {
      tabs: [
        { id: "chars", visible: true },
        { id: "chatlogs", visible: true },
        { id: "worldinfo", visible: true },
        { id: "presets", visible: true },
        { id: "themes", visible: true },
        { id: "backgrounds", visible: true },
        { id: "personas", visible: true },
      ],
      tabActions: {
        chars: [
          { id: "import", visible: true },
          { id: "chatmode", visible: true },
          { id: "quickedit", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
        chatlogs: [
          { id: "import", visible: true },
          { id: "note", visible: true },
          { id: "rename", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
        worldinfo: [
          { id: "import", visible: true },
          { id: "note", visible: true },
          { id: "rename", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
        presets: [
          { id: "import", visible: true },
          { id: "note", visible: true },
          { id: "rename", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
        themes: [
          { id: "import", visible: true },
          { id: "note", visible: true },
          { id: "rename", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
        backgrounds: [
          { id: "import", visible: true },
          { id: "note", visible: true },
          { id: "rename", visible: true },
          { id: "default", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
        personas: [
          { id: "import", visible: true },
          { id: "note", visible: true },
          { id: "export", visible: true },
          { id: "delete", visible: true },
        ],
      },
    };
  }
  // 自定义外观样式：按主题名索引，每个主题可独立配置
  if (!settings.customStyles) settings.customStyles = {};
  // 世界书激活分组预设：[{name, books, scope, bindChars, bindPresets}]
  if (!settings.wiActivePresets) settings.wiActivePresets = [];
  // 迁移旧格式：为缺少 scope/bindChars/bindPresets 的预设补充默认值
  for (const p of settings.wiActivePresets) {
    if (!p.scope) p.scope = "global";
    // 迁移旧的 "char"/"preset" scope 为统一的 "bound"
    if (p.scope === "char" || p.scope === "preset") p.scope = "bound";
    if (!Array.isArray(p.bindChars)) p.bindChars = [];
    if (!Array.isArray(p.bindPresets)) p.bindPresets = [];
  }
  // 当前已应用的世界书分组索引集合（用于自动应用/关闭追踪）
  if (!settings._wiAppliedPresetIndices) settings._wiAppliedPresetIndices = [];
  // 正则激活分组预设：[{name, scripts, scope, bindChars, bindPresets, bindChats}]
  if (!settings.regexActivePresets) settings.regexActivePresets = [];
  for (const p of settings.regexActivePresets) {
    if (!p.scope) p.scope = "global";
    if (p.scope === "char" || p.scope === "preset") p.scope = "bound";
    if (!Array.isArray(p.bindChars)) p.bindChars = [];
    if (!Array.isArray(p.bindPresets)) p.bindPresets = [];
    if (!Array.isArray(p.bindChats)) p.bindChats = [];
  }
  // 当前已应用的正则分组索引集合（用于应用/取消追踪）
  if (!settings._regexAppliedPresetIndices)
    settings._regexAppliedPresetIndices = [];
  // 预设详情激活分组：{ [presetName]: [{name, fields}] }
  if (!settings.presetDetailActivePresets)
    settings.presetDetailActivePresets = {};
  // 当前已应用的预设详情分组索引集合：{ [presetName]: number[] }
  if (!settings._presetDetailAppliedPresetIndices)
    settings._presetDetailAppliedPresetIndices = {};
  // 置顶聊天列表：[{ avatar, chatFileName }]
  if (!Array.isArray(settings.pinnedChats)) settings.pinnedChats = [];
  // User 聊天绑定记录：{ [personaAvatarId]: ["charAvatar::chatFileName"] }
  if (
    !settings.personaChatBindings ||
    typeof settings.personaChatBindings !== "object"
  )
    settings.personaChatBindings = {};
  // User 自定义顺序：用于默认排序下保持手动/复制插入后的相对顺序
  if (!Array.isArray(settings.personaCustomOrder))
    settings.personaCustomOrder = [];
  // 预设自定义顺序：用于默认排序下保持手动/复制插入后的相对顺序
  if (!Array.isArray(settings.presetCustomOrder))
    settings.presetCustomOrder = [];
  // 条目互通完成后的跳转策略："ask" | "target" | "origin"
  if (settings.entryTransferPostAction === undefined)
    settings.entryTransferPostAction = "ask";
  const transferPostAction = String(settings.entryTransferPostAction || "ask");
  if (!["ask", "target", "origin"].includes(transferPostAction))
    settings.entryTransferPostAction = "ask";

  return settings;
}
