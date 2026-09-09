// Backup Bridge 能力描述层：承接支持导出/写入的资源类型集合与导出能力声明，用于对外暴露插件备份桥接能力。

import { getBridgeObjectKeyCount, safeCloneBridgeValue } from "./clone.js";
import {
  buildBackupBridgeCharFolderDefinitions,
  buildBackupBridgeResourceFolderDefinitionsMap,
  buildBackupBridgeTreeFolderDefinitions,
} from "./path.js";
import {
  getBackupBridgeSupportedResourceTypes,
  getBackupBridgeSupportedWriteResourceTypes,
} from "./resource-types.js";

export function getBackupBridgeExportCapabilities() {
  const supportedExportResourceTypes = getBackupBridgeSupportedResourceTypes();
  const supportedWriteResourceTypes =
    getBackupBridgeSupportedWriteResourceTypes();
  return {
    resourceListAvailable: true,
    resourceReadAvailable: true,
    resourceWriteAvailable: supportedWriteResourceTypes.length > 0,
    supportedExportResourceTypes,
    supportedWriteResourceTypes,
    stableIdModes: ["path-based"],
    fingerprintModes: ["contenthash"],
    contentModes: ["json", "base64"],
    writeModes: ["json", "base64"],
  };
}

/**
 * 获取 Backup Bridge 完整详情，包含插件元数据、文件夹树、文件夹定义、映射关系、导出能力等。
 * @param {Object} deps - 依赖注入对象
 * @param {Object} deps.extension_settings - SillyTavern 扩展设置对象
 * @param {string} deps.extensionName - 扩展名称
 * @param {Object} deps.config - SillyTavern config 对象（包含角色文件夹）
 * @param {string} deps.BACKUP_BRIDGE_PROTOCOL_VERSION - 备份桥协议版本
 * @param {string} deps.BACKUP_BRIDGE_VERSION - 备份桥实现版本
 * @param {Function} deps.getTagName - 获取标签名称的函数
 * @returns {Object} 完整的 Backup Bridge 详情对象
 */
export function getBackupBridgeDetailsCore(deps) {
  const extSettings = deps.extension_settings?.[deps.extensionName] || {};
  let charFolders = {};
  try {
    if (deps.config?.folders && typeof deps.config.folders === "object") {
      charFolders = deps.config.folders;
    }
  } catch (e) {
    charFolders = {};
  }

  const exportCapabilities = getBackupBridgeExportCapabilities();
  const resourceFolderTree = extSettings.resourceFolderTree || {};
  const regexFolderTree = extSettings.regexFolderTree || {};
  const qrFolderTree =
    resourceFolderTree.quickreply || extSettings.qrFolderTree || {};
  const resourceFolderDefinitions =
    buildBackupBridgeResourceFolderDefinitionsMap(resourceFolderTree);
  const regexFolderDefinitions =
    buildBackupBridgeTreeFolderDefinitions(regexFolderTree);
  const qrFolderDefinitions =
    buildBackupBridgeTreeFolderDefinitions(qrFolderTree);
  const charFolderDefinitions = buildBackupBridgeCharFolderDefinitions(
    charFolders,
    deps.getTagName,
  );

  return {
    source: "cfm-backup-bridge",
    extensionName: deps.extensionName,
    displayName: "酒馆资源管理器",
    protocolVersion: deps.BACKUP_BRIDGE_PROTOCOL_VERSION,
    bridgeVersion: deps.BACKUP_BRIDGE_VERSION,
    status: window.__CFM_BACKUP_BRIDGE__?.status || "unknown",
    timestamp: Date.now(),
    detailsAvailable: true,
    supportedResourceTypes: [
      "chars",
      "worldinfo",
      "presets",
      "themes",
      "backgrounds",
      "personas",
      "regex",
      "qr",
    ],
    counts: {
      charFolders: getBridgeObjectKeyCount(charFolders),
      presetGroups: getBridgeObjectKeyCount(extSettings.presetGroups),
      worldInfoGroups: getBridgeObjectKeyCount(extSettings.worldInfoGroups),
      themeGroups: getBridgeObjectKeyCount(extSettings.themeGroups),
      bgGroups: getBridgeObjectKeyCount(extSettings.bgGroups),
      personaGroups: getBridgeObjectKeyCount(extSettings.personaGroups),
      resourceFolderTreePresets: getBridgeObjectKeyCount(
        resourceFolderTree.presets,
      ),
      resourceFolderTreeWorldinfo: getBridgeObjectKeyCount(
        resourceFolderTree.worldinfo,
      ),
      resourceFolderTreeThemes: getBridgeObjectKeyCount(
        resourceFolderTree.themes,
      ),
      resourceFolderTreeBackgrounds: getBridgeObjectKeyCount(
        resourceFolderTree.backgrounds,
      ),
      resourceFolderTreePersonas: getBridgeObjectKeyCount(
        resourceFolderTree.personas,
      ),
      regexFolders: getBridgeObjectKeyCount(regexFolderTree),
      qrFolders: getBridgeObjectKeyCount(qrFolderTree),
    },
    trees: {
      chars: safeCloneBridgeValue(charFolders, 0, 8),
      resources: safeCloneBridgeValue(resourceFolderTree, 0, 8),
      regex: safeCloneBridgeValue(regexFolderTree, 0, 8),
      qr: safeCloneBridgeValue(qrFolderTree, 0, 8),
    },
    folderDefinitions: {
      chars: safeCloneBridgeValue(charFolderDefinitions, 0, 8),
      resources: safeCloneBridgeValue(resourceFolderDefinitions, 0, 8),
      regex: safeCloneBridgeValue(regexFolderDefinitions, 0, 8),
      qr: safeCloneBridgeValue(qrFolderDefinitions, 0, 8),
    },
    mappings: {
      presetGroups: safeCloneBridgeValue(extSettings.presetGroups || {}),
      worldInfoGroups: safeCloneBridgeValue(extSettings.worldInfoGroups || {}),
      themeGroups: safeCloneBridgeValue(extSettings.themeGroups || {}),
      bgGroups: safeCloneBridgeValue(extSettings.bgGroups || {}),
      personaGroups: safeCloneBridgeValue(extSettings.personaGroups || {}),
    },
    metadata: {
      topLevelSettingKeys: Object.keys(extSettings),
      hasDefaultBackground:
        typeof extSettings.defaultBackground === "string" &&
        extSettings.defaultBackground.length > 0,
    },
    exportCapabilities,
    resourceListAvailable: exportCapabilities.resourceListAvailable,
    resourceReadAvailable: exportCapabilities.resourceReadAvailable,
    resourceWriteAvailable: exportCapabilities.resourceWriteAvailable,
    stableIdModes: [...exportCapabilities.stableIdModes],
    fingerprintModes: [...exportCapabilities.fingerprintModes],
    contentModes: [...exportCapabilities.contentModes],
    writeModes: [...(exportCapabilities.writeModes || [])],
    supportedExportResourceTypes: [
      ...exportCapabilities.supportedExportResourceTypes,
    ],
    supportedWriteResourceTypes: [
      ...(exportCapabilities.supportedWriteResourceTypes || []),
    ],
  };
}
