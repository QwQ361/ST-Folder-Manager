// Backup Bridge 导出聚合层：承接面向外部备份桥的资源详情聚合与导出描述生成；普通插件内导入导出保留在 features/backup。

import { createBackupBridgeFingerprint } from "./fingerprint.js";
import {
  buildBackupBridgeCharFolderPath,
  buildBackupBridgeTreeFolderPath,
  getBackupBridgeFileExtension,
  getBackupBridgeMimeType,
} from "./path.js";
import {
  getBackupBridgeRequestedResourceTypes,
  getBackupBridgeRootLabel,
  normalizeBackupBridgeResourceType,
} from "./resource-types.js";
import { resolveBackupBridgeUpdatedAt } from "./timestamp.js";

export function buildBackupBridgeResourceId(
  resourceType,
  identityPath,
  sourcePath,
  displayName,
) {
  const base = String(
    identityPath || sourcePath || displayName || "unnamed",
  ).trim();
  return `${resourceType}:path:${base || "unnamed"}`;
}

export function createBackupBridgeResourceItem({
  resourceType,
  displayName,
  folderSegments,
  logicalLeaf,
  identityPath,
  sourcePath,
  updatedAt,
  fingerprint,
  contentLocator,
  readModes,
  extensionHint,
  mimeType,
  sourceOrigin,
}) {
  const normalizedDisplayName =
    displayName == null ? null : String(displayName).trim() || null;
  const normalizedFolderSegments = Array.isArray(folderSegments)
    ? folderSegments
        .map((segment) => String(segment || "").trim())
        .filter(Boolean)
    : [];
  const rootLabel = getBackupBridgeRootLabel(resourceType);
  const folderPath = [rootLabel, ...normalizedFolderSegments];
  const normalizedLogicalLeaf =
    logicalLeaf == null
      ? normalizedDisplayName
      : String(logicalLeaf).trim() || null;
  const logicalPath = normalizedLogicalLeaf
    ? [...folderPath, normalizedLogicalLeaf].join("/")
    : folderPath.join("/");
  const normalizedSourcePath = sourcePath
    ? String(sourcePath).trim() || null
    : null;
  const normalizedExtensionHint =
    extensionHint || getBackupBridgeFileExtension(normalizedSourcePath);
  const normalizedReadModes = Array.isArray(readModes)
    ? readModes.map((mode) => String(mode || "").trim()).filter(Boolean)
    : [];

  return {
    resourceId: buildBackupBridgeResourceId(
      resourceType,
      identityPath || logicalPath,
      normalizedSourcePath,
      normalizedDisplayName,
    ),
    resourceType,
    displayName: normalizedDisplayName,
    logicalPath,
    folderPath,
    sourcePath: normalizedSourcePath,
    identityMode: "path-based",
    updatedAt: resolveBackupBridgeUpdatedAt(updatedAt),
    fingerprint: fingerprint ? String(fingerprint).trim() || null : null,
    contentLocator: contentLocator || null,
    readModes: normalizedReadModes,
    extensionHint: normalizedExtensionHint || null,
    mimeType:
      mimeType || getBackupBridgeMimeType(normalizedExtensionHint) || null,
    sourceOrigin: sourceOrigin || "sillytavern",
  };
}

export function getBackupBridgeReadResourceType(request = {}) {
  const directType = normalizeBackupBridgeResourceType(request?.resourceType);
  if (directType) return directType;
  const resourceId = String(request?.resourceId || "").trim();
  const typeFromId = resourceId.split(":")[0];
  return normalizeBackupBridgeResourceType(typeFromId);
}

export function getBackupBridgeJsonByteSize(data) {
  try {
    return new TextEncoder().encode(JSON.stringify(data)).length;
  } catch (error) {
    return null;
  }
}

export async function convertBackupBridgeBlobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function buildBackupBridgeReadResourceMeta(item, extra = {}) {
  return {
    resourceId: item.resourceId,
    resourceType: item.resourceType,
    displayName: item.displayName,
    logicalPath: item.logicalPath,
    folderPath: Array.isArray(item.folderPath) ? [...item.folderPath] : [],
    sourcePath: item.sourcePath || null,
    identityMode: item.identityMode,
    updatedAt: item.updatedAt,
    fingerprint: item.fingerprint,
    extensionHint: item.extensionHint || null,
    mimeType: item.mimeType || null,
    ...extra,
  };
}

export function buildBackupBridgeReadSuccess(
  item,
  content,
  extraResource = {},
  bridgeVersion = null,
) {
  return {
    success: true,
    resource: buildBackupBridgeReadResourceMeta(item, extraResource),
    content,
    exportMeta: {
      exportedAt: Date.now(),
      bridgeVersion,
    },
  };
}

export function buildBackupBridgeReadError(
  request,
  error,
  bridgeVersion = null,
) {
  return {
    success: false,
    resourceId: String(request?.resourceId || "").trim() || null,
    resourceType: getBackupBridgeReadResourceType(request),
    error: String(error?.message || error || "未知错误"),
    exportMeta: {
      exportedAt: Date.now(),
      bridgeVersion,
    },
  };
}

export async function resolveBackupBridgeReadItem(request = {}, deps = {}) {
  const resourceId = String(request?.resourceId || "").trim();
  const resourceType = getBackupBridgeReadResourceType(request);

  if (!resourceId) {
    throw new Error("缺少 resourceId");
  }
  if (!resourceType) {
    throw new Error("无法识别 resourceType");
  }

  const listResources =
    typeof deps.listBackupBridgeResources === "function"
      ? deps.listBackupBridgeResources
      : listBackupBridgeResources;
  const listResult = await listResources(
    {
      resourceTypes: [resourceType],
    },
    deps,
  );

  if (!listResult?.success) {
    throw new Error(listResult?.error || "读取资源清单失败");
  }

  const item = Array.isArray(listResult.items)
    ? listResult.items.find((entry) => entry?.resourceId === resourceId)
    : null;

  if (!item) {
    throw new Error(`未找到资源: ${resourceId}`);
  }

  return item;
}

export function getBackupBridgePreferredReadMode(item, request = {}) {
  const modes = Array.isArray(item?.readModes) ? item.readModes : [];
  const preferredMode = String(request?.preferredMode || "")
    .trim()
    .toLowerCase();

  if (preferredMode && modes.includes(preferredMode)) {
    return preferredMode;
  }

  return modes[0] || null;
}

export async function listBackupBridgeResources(options = {}, deps = {}) {
  try {
    const requestedTypes = getBackupBridgeRequestedResourceTypes(options);
    const items = [];

    for (const resourceType of requestedTypes) {
      if (resourceType === "chars") {
        const characters = deps.getCharacters();
        const tagMap = deps.getTagMap();
        const folderIdSet = new Set(deps.getFolderTagIds());
        const folderPathCache = new Map();

        for (const char of characters) {
          const avatar = String(char?.avatar || "").trim();
          const displayName =
            String(char?.name || char?.data?.name || avatar || "").trim() ||
            "未命名角色";
          const charTags = Array.isArray(tagMap?.[avatar])
            ? tagMap[avatar]
            : [];
          const folderTags = charTags.filter((tagId) =>
            folderIdSet.has(String(tagId || "").trim()),
          );

          let folderSegments = [];
          for (const folderId of folderTags) {
            const normalizedId = String(folderId || "").trim();
            if (!folderPathCache.has(normalizedId)) {
              folderPathCache.set(
                normalizedId,
                buildBackupBridgeCharFolderPath(
                  deps.config?.folders,
                  deps.getTagName,
                  normalizedId,
                ),
              );
            }
            const currentPath = folderPathCache.get(normalizedId) || [];
            if (currentPath.length > folderSegments.length) {
              folderSegments = currentPath;
            }
          }

          items.push(
            createBackupBridgeResourceItem({
              resourceType: "chars",
              displayName,
              folderSegments,
              identityPath: avatar
                ? `avatar/${avatar}`
                : [...folderSegments, displayName].join("/"),
              sourcePath: avatar ? `characters/${avatar}` : null,
              updatedAt: resolveBackupBridgeUpdatedAt(char),
              readModes: ["base64"],
              extensionHint: getBackupBridgeFileExtension(avatar),
            }),
          );
        }
        continue;
      }

      if (resourceType === "worldinfo") {
        deps.ensureResourceSettings();
        const names = await deps.getWorldInfoNames();
        const groups = deps.getResourceGroups("worldinfo") || {};
        const tree = deps.getResFolderTree("worldinfo") || {};

        for (const name of names) {
          const displayName = String(name || "").trim();
          if (!displayName) continue;
          const folderId = groups[displayName];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "worldinfo",
              displayName,
              folderSegments,
              identityPath: [...folderSegments, displayName].join("/"),
              sourcePath: `worldinfo/${displayName}`,
              readModes: ["json"],
              extensionHint: ".json",
              mimeType: "application/json",
            }),
          );
        }
        continue;
      }

      if (resourceType === "presets") {
        deps.ensureResourceSettings();
        const presets = deps.getCurrentPresets();
        const groups = deps.getResourceGroups("presets") || {};
        const tree = deps.getResFolderTree("presets") || {};

        for (const preset of presets) {
          const displayName = String(preset?.name || "").trim();
          if (!displayName) continue;
          const folderId = groups[displayName];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          const presetValue = String(preset?.value || "").trim();
          const presetUpdatedAt = resolveBackupBridgeUpdatedAt(preset);
          const presetFingerprint = createBackupBridgeFingerprint(
            preset && typeof preset === "object"
              ? { ...preset, name: displayName }
              : { name: displayName, value: presetValue || null },
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "presets",
              displayName,
              folderSegments,
              identityPath: presetValue
                ? `id/${presetValue}`
                : [...folderSegments, displayName].join("/"),
              sourcePath: presetValue
                ? `presets/${presetValue}`
                : `presets/${displayName}`,
              updatedAt: presetUpdatedAt,
              fingerprint: presetFingerprint,
              readModes: ["json"],
              extensionHint: ".json",
              mimeType: "application/json",
            }),
          );
        }
        continue;
      }

      if (resourceType === "themes") {
        deps.ensureResourceSettings();
        const names = deps.getThemeNames();
        const groups = deps.getResourceGroups("themes") || {};
        const tree = deps.getResFolderTree("themes") || {};

        for (const name of names) {
          const displayName = String(name || "").trim();
          if (!displayName) continue;
          const folderId = groups[displayName];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "themes",
              displayName,
              folderSegments,
              identityPath: [...folderSegments, displayName].join("/"),
              sourcePath: `themes/${displayName}`,
              readModes: ["json"],
              extensionHint: ".json",
              mimeType: "application/json",
            }),
          );
        }
        continue;
      }

      if (resourceType === "backgrounds") {
        deps.ensureResourceSettings();
        const names = await deps.getBackgroundNamesForBridge();
        const groups = deps.getResourceGroups("backgrounds") || {};
        const tree = deps.getResFolderTree("backgrounds") || {};

        for (const bgfile of names) {
          const sourcePath = String(bgfile || "").trim();
          if (!sourcePath) continue;
          const displayName =
            String(
              deps.getBackgroundDisplayName(sourcePath) || sourcePath,
            ).trim() || sourcePath;
          const folderId = groups[sourcePath];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "backgrounds",
              displayName,
              folderSegments,
              identityPath: sourcePath,
              sourcePath,
              readModes: ["base64"],
              extensionHint: getBackupBridgeFileExtension(sourcePath),
            }),
          );
        }
        continue;
      }

      if (resourceType === "personas") {
        deps.ensureResourceSettings();
        const groups = deps.getResourceGroups("personas") || {};
        const tree = deps.getResFolderTree("personas") || {};
        const personaIds = [];
        deps.$("#user_avatar_block .avatar-container").each(function () {
          const avatarId = deps.$(this).attr("data-avatar-id");
          if (avatarId) personaIds.push(avatarId);
        });

        for (const avatarId of personaIds) {
          const displayName = String(avatarId || "").trim();
          if (!displayName) continue;
          const folderId = groups[displayName];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "personas",
              displayName,
              folderSegments,
              identityPath: displayName,
              sourcePath: `personas/${displayName}`,
              readModes: ["json"],
              extensionHint: ".json",
              mimeType: "application/json",
            }),
          );
        }
        continue;
      }

      if (resourceType === "regex") {
        deps.ensureResourceSettings();
        const scripts = deps.getRegexGlobalScripts();
        const groups =
          deps.extensionSettings?.[deps.extensionName]?.regexGlobalGroups || {};
        const tree =
          deps.extensionSettings?.[deps.extensionName]?.regexFolderTree || {};

        for (const script of scripts) {
          const scriptId = String(script?.id || "").trim();
          const displayName =
            String(script?.scriptName || scriptId || "").trim() || "未命名正则";
          const folderId = groups[scriptId];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          const regexUpdatedAt = resolveBackupBridgeUpdatedAt(script);
          const regexFingerprint = createBackupBridgeFingerprint(
            script && typeof script === "object"
              ? script
              : { id: scriptId || null, scriptName: displayName },
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "regex",
              displayName,
              folderSegments,
              identityPath: scriptId
                ? `id/${scriptId}`
                : [...folderSegments, displayName].join("/"),
              sourcePath: scriptId
                ? `regex/${scriptId}`
                : `regex/${displayName}`,
              updatedAt: regexUpdatedAt,
              fingerprint: regexFingerprint,
              readModes: ["json"],
              extensionHint: ".json",
              mimeType: "application/json",
            }),
          );
        }
        continue;
      }

      if (resourceType === "qr") {
        deps.ensureResourceSettings();
        const names = await (async () => {
          const collectNames = () =>
            Array.from(
              new Set(
                deps
                  .getQrSetNames()
                  .map((name) => String(name || "").trim())
                  .filter(Boolean),
              ),
            );

          const immediateNames = collectNames();
          if (immediateNames.length > 0) {
            return immediateNames;
          }

          const timeoutAt = Date.now() + 2500;
          while (Date.now() < timeoutAt) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            const retriedNames = collectNames();
            if (retriedNames.length > 0) {
              return retriedNames;
            }
          }

          return collectNames();
        })();
        const groups = deps.getResourceGroups("quickreply") || {};
        const tree = deps.getResFolderTree("quickreply") || {};

        for (const name of names) {
          const displayName = String(name || "").trim();
          if (!displayName) continue;
          const folderId = groups[displayName];
          const folderSegments = buildBackupBridgeTreeFolderPath(
            tree,
            folderId,
          );
          items.push(
            createBackupBridgeResourceItem({
              resourceType: "qr",
              displayName,
              folderSegments,
              identityPath: [...folderSegments, displayName].join("/"),
              sourcePath: `quickreply/${displayName}`,
              readModes: ["json"],
              extensionHint: ".json",
              mimeType: "application/json",
            }),
          );
        }
      }
    }

    return {
      success: true,
      generatedAt: Date.now(),
      cursor: null,
      nextCursor: null,
      items,
      summary: {
        total: items.length,
        resourceTypes: Array.from(
          new Set(items.map((item) => item.resourceType)),
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      generatedAt: Date.now(),
      cursor: null,
      nextCursor: null,
      items: [],
      summary: {
        total: 0,
        resourceTypes: [],
      },
      error: String(error?.message || error || "未知错误"),
    };
  }
}

export async function readBackupBridgeResource(request = {}, deps = {}) {
  try {
    const item = await resolveBackupBridgeReadItem(request, deps);
    const readMode = getBackupBridgePreferredReadMode(item, request);
    const bridgeVersion = deps.backupBridgeVersion || null;

    if (!readMode) {
      throw new Error(`资源 ${item.resourceId} 不支持内容读取`);
    }

    if (item.resourceType === "chars") {
      if (readMode !== "base64") {
        throw new Error("角色卡仅支持 base64 读取");
      }
      const avatar = String(item.sourcePath || "")
        .replace(/^characters\//, "")
        .trim();
      if (!avatar) {
        throw new Error("角色卡缺少 avatar 标识");
      }
      const resp = await fetch("/api/characters/export", {
        method: "POST",
        headers: deps.getContext().getRequestHeaders(),
        body: JSON.stringify({ format: "png", avatar_url: avatar }),
      });
      if (!resp.ok) {
        throw new Error(`导出角色卡失败: HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const data = await convertBackupBridgeBlobToBase64(blob);
      return buildBackupBridgeReadSuccess(
        item,
        {
          mode: "base64",
          encoding: "base64",
          data,
          size: Number.isFinite(blob.size) ? blob.size : null,
        },
        {
          updatedAt: item.updatedAt || null,
          fingerprint:
            item.fingerprint || createBackupBridgeFingerprint(data, "base64"),
          extensionHint:
            item.extensionHint ||
            getBackupBridgeFileExtension(avatar) ||
            ".png",
          mimeType: item.mimeType || blob.type || "image/png",
        },
        bridgeVersion,
      );
    }

    if (item.resourceType === "backgrounds") {
      if (readMode !== "base64") {
        throw new Error("背景仅支持 base64 读取");
      }
      const sourcePath = String(item.sourcePath || "").trim();
      if (!sourcePath) {
        throw new Error("背景缺少 sourcePath");
      }
      const resp = await fetch(
        `/backgrounds/${encodeURIComponent(sourcePath)}`,
      );
      if (!resp.ok) {
        throw new Error(`导出背景失败: HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const data = await convertBackupBridgeBlobToBase64(blob);
      return buildBackupBridgeReadSuccess(
        item,
        {
          mode: "base64",
          encoding: "base64",
          data,
          size: Number.isFinite(blob.size) ? blob.size : null,
        },
        {
          updatedAt: item.updatedAt || null,
          fingerprint:
            item.fingerprint || createBackupBridgeFingerprint(data, "base64"),
          extensionHint:
            item.extensionHint ||
            getBackupBridgeFileExtension(sourcePath) ||
            ".png",
          mimeType:
            item.mimeType ||
            blob.type ||
            getBackupBridgeMimeType(getBackupBridgeFileExtension(sourcePath)) ||
            "application/octet-stream",
        },
        bridgeVersion,
      );
    }

    let data = null;

    if (item.resourceType === "worldinfo") {
      data = await deps.fetchWorldInfoDetailData(item.displayName);
    } else if (item.resourceType === "presets") {
      const pm = deps.getContext().getPresetManager();
      if (!pm) {
        throw new Error("预设管理器不可用");
      }
      if (typeof pm.getCompletionPresetByName === "function") {
        const preset = pm.getCompletionPresetByName(item.displayName);
        if (preset) {
          data = structuredClone(preset);
          data.name = item.displayName;
        }
      }
      if (!data && typeof pm.getPresetList === "function") {
        const { presets, preset_names } = pm.getPresetList.call(pm);
        let found = null;
        if (Array.isArray(preset_names)) {
          const idx = preset_names.indexOf(item.displayName);
          if (idx >= 0) found = presets[idx];
        } else if (preset_names && typeof preset_names === "object") {
          if (preset_names[item.displayName] !== undefined) {
            found = presets[preset_names[item.displayName]];
          }
        }
        if (found) {
          data = structuredClone(found);
          data.name = item.displayName;
        }
      }
      if (!data) {
        throw new Error(`找不到预设: ${item.displayName}`);
      }
    } else if (item.resourceType === "themes") {
      const resp = await fetch("/api/settings/get", {
        method: "POST",
        headers: deps.getContext().getRequestHeaders(),
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        throw new Error(`获取主题数据失败: HTTP ${resp.status}`);
      }
      const settingsData = await resp.json();
      const allThemes = Array.isArray(settingsData?.themes)
        ? settingsData.themes
        : [];
      const themeData = allThemes.find(
        (theme) =>
          (typeof theme === "object" ? theme.name : theme) === item.displayName,
      );
      if (!themeData || typeof themeData !== "object") {
        throw new Error(`找不到主题: ${item.displayName}`);
      }
      data = structuredClone(themeData);
    } else if (item.resourceType === "personas") {
      const avatarId = item.displayName;
      const pu = deps.getContext().powerUserSettings;
      if (!pu) {
        throw new Error("无法获取 powerUserSettings");
      }
      data = {
        personas: {},
        persona_descriptions: {},
        default_persona:
          pu.default_persona && pu.default_persona === avatarId
            ? pu.default_persona
            : null,
      };
      data.personas[avatarId] =
        pu.personas && pu.personas[avatarId] !== undefined
          ? pu.personas[avatarId]
          : avatarId;
      if (pu.persona_descriptions && pu.persona_descriptions[avatarId]) {
        data.persona_descriptions[avatarId] = structuredClone(
          pu.persona_descriptions[avatarId],
        );
      }
    } else if (item.resourceType === "regex") {
      const scriptId = String(item.sourcePath || "")
        .replace(/^regex\//, "")
        .trim();
      const scripts = deps.getRegexGlobalScripts();
      const script = scripts.find(
        (entry) => String(entry?.id || "").trim() === scriptId,
      );
      if (!script) {
        throw new Error(`找不到正则脚本: ${item.displayName}`);
      }
      data = JSON.parse(JSON.stringify(script));
    } else if (item.resourceType === "qr") {
      const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
      const QRS = typeof globalThis !== "undefined" && globalThis.QuickReplySet;
      if (api && typeof api.getSetByName === "function") {
        const setData = api.getSetByName(item.displayName);
        if (setData) {
          data = JSON.parse(JSON.stringify(setData));
        }
      }
      if (!data && QRS && Array.isArray(QRS.list)) {
        const setData = QRS.list.find(
          (entry) => entry?.name === item.displayName,
        );
        if (setData) {
          data = JSON.parse(JSON.stringify(setData));
        }
      }
      if (!data) {
        throw new Error(`无法获取快速回复集: ${item.displayName}`);
      }
    }

    if (data == null) {
      throw new Error(`暂不支持读取资源类型: ${item.resourceType}`);
    }

    return buildBackupBridgeReadSuccess(
      item,
      {
        mode: "json",
        encoding: "json",
        data,
        size: getBackupBridgeJsonByteSize(data),
      },
      {
        updatedAt: item.updatedAt || resolveBackupBridgeUpdatedAt(data),
        fingerprint:
          item.fingerprint || createBackupBridgeFingerprint(data, "json"),
        extensionHint: item.extensionHint || ".json",
        mimeType: item.mimeType || "application/json",
      },
      bridgeVersion,
    );
  } catch (error) {
    return buildBackupBridgeReadError(
      request,
      error,
      deps.backupBridgeVersion || null,
    );
  }
}
