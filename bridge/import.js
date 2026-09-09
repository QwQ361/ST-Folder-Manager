// Backup Bridge 导入写入层：承接外部备份桥回写资源时的入口调度、资源类型校验与写入结果汇总；普通插件内导入保留在 features/backup/import.js。

import { cloneBackupBridgeJsonValue } from "./clone.js";
import {
  buildBackupBridgeReadResourceMeta,
  buildBackupBridgeResourceId,
  getBackupBridgeJsonByteSize,
} from "./export.js";
import { createBackupBridgeFingerprint } from "./fingerprint.js";
import {
  getBackupBridgeFileExtension,
  getBackupBridgeMimeType,
} from "./path.js";
import {
  getBackupBridgeRootLabel,
  getBackupBridgeSupportedWriteResourceTypes,
  normalizeBackupBridgeResourceType,
} from "./resource-types.js";
import { resolveBackupBridgeUpdatedAt } from "./timestamp.js";

export function getBackupBridgeWriteResourceType(request = {}) {
  const directType = normalizeBackupBridgeResourceType(
    request?.resourceType || request?.resource?.resourceType,
  );
  if (directType) return directType;
  const resourceId = String(
    request?.resourceId || request?.resource?.resourceId || "",
  ).trim();
  const typeFromId = resourceId.split(":")[0];
  return normalizeBackupBridgeResourceType(typeFromId);
}

export function normalizeBackupBridgeWriteBaseName(
  value,
  fallback = "backup-resource",
) {
  const normalized = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ");
  return normalized || fallback;
}

export function normalizeBackupBridgeWriteExtension(value, fallback = ".json") {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;
  return normalized.startsWith(".") ? normalized : `.${normalized}`;
}

export function normalizeBackupBridgeBase64Data(value) {
  return String(value || "")
    .replace(/^data:[^;]+;base64,/i, "")
    .trim();
}

export function decodeBackupBridgeBase64ToBytes(value) {
  const normalized = normalizeBackupBridgeBase64Data(value);
  if (!normalized) {
    throw new Error("base64 内容为空");
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function createBackupBridgeFileFromBase64(
  content,
  resource = {},
  fallbackExtension = ".bin",
) {
  const bytes = decodeBackupBridgeBase64ToBytes(content?.data);
  const logicalPath = String(resource?.logicalPath || "").trim();
  const logicalLeaf = logicalPath ? logicalPath.split("/").pop() : "";
  const extensionHint = normalizeBackupBridgeWriteExtension(
    resource?.extensionHint ||
      getBackupBridgeFileExtension(resource?.sourcePath || "") ||
      fallbackExtension,
    fallbackExtension,
  );
  const baseName = normalizeBackupBridgeWriteBaseName(
    resource?.displayName ||
      logicalLeaf ||
      resource?.resourceType ||
      "backup-resource",
  );
  const mimeType =
    content?.mimeType ||
    resource?.mimeType ||
    getBackupBridgeMimeType(extensionHint) ||
    "application/octet-stream";
  const finalFileName =
    extensionHint &&
    baseName.toLowerCase().endsWith(extensionHint.toLowerCase())
      ? baseName
      : `${baseName}${extensionHint}`;
  return new File([bytes], finalFileName, {
    type: mimeType,
  });
}

export function resolveBackupBridgeWriteDisplayName(request = {}) {
  const resource =
    request?.resource && typeof request.resource === "object"
      ? request.resource
      : {};
  const contentData = request?.content?.data;
  const contentName =
    contentData && typeof contentData === "object" ? contentData.name : null;
  const directName = String(
    resource.displayName || request?.displayName || contentName || "",
  ).trim();
  if (directName) return directName;
  const sourcePath = String(
    resource.sourcePath || request?.sourcePath || "",
  ).trim();
  if (!sourcePath) return null;
  const segments = sourcePath.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

export function normalizeBackupBridgeWriteResource(request = {}) {
  const source =
    request?.resource && typeof request.resource === "object"
      ? request.resource
      : {};
  const resourceType = getBackupBridgeWriteResourceType(request);
  const displayName = resolveBackupBridgeWriteDisplayName(request);
  const sourcePath =
    String(source.sourcePath || request?.sourcePath || "").trim() || null;
  const extensionHint =
    source.extensionHint ||
    request?.extensionHint ||
    getBackupBridgeFileExtension(sourcePath || "") ||
    null;
  const mimeType =
    source.mimeType ||
    request?.mimeType ||
    getBackupBridgeMimeType(extensionHint || "") ||
    null;
  const resourceId =
    String(source.resourceId || request?.resourceId || "").trim() ||
    (resourceType
      ? buildBackupBridgeResourceId(
          resourceType,
          source.identityPath ||
            source.logicalPath ||
            displayName ||
            sourcePath,
          sourcePath,
          displayName,
        )
      : null);

  return {
    ...source,
    resourceId,
    resourceType,
    displayName,
    sourcePath,
    extensionHint,
    mimeType,
    logicalPath:
      source.logicalPath ||
      (displayName && resourceType
        ? `${getBackupBridgeRootLabel(resourceType)}/${displayName}`
        : null),
    folderPath: Array.isArray(source.folderPath) ? [...source.folderPath] : [],
    identityMode: source.identityMode || "path-based",
  };
}

export function getBackupBridgeWriteContent(request = {}) {
  const content = request?.content;
  if (!content || typeof content !== "object") {
    throw new Error("缺少 content");
  }

  const requestedMode = String(content.mode || content.encoding || "")
    .trim()
    .toLowerCase();

  if (requestedMode === "json") {
    if (content.data == null) {
      throw new Error("json 内容为空");
    }
    let data = null;
    if (typeof content.data === "string") {
      try {
        data = JSON.parse(content.data);
      } catch (error) {
        throw new Error("json 内容不是有效 JSON");
      }
    } else {
      data = cloneBackupBridgeJsonValue(content.data);
    }
    return {
      mode: "json",
      data,
      size: getBackupBridgeJsonByteSize(data),
      mimeType: "application/json",
    };
  }

  if (requestedMode === "base64") {
    const data = normalizeBackupBridgeBase64Data(content.data);
    if (!data) {
      throw new Error("base64 内容为空");
    }
    return {
      mode: "base64",
      data,
      size: Number.isFinite(content?.size) ? content.size : null,
      mimeType: content?.mimeType || null,
    };
  }

  throw new Error(`不支持的写入内容模式: ${requestedMode || "unknown"}`);
}

export function buildBackupBridgeWriteSuccess(
  resource,
  extraResource = {},
  bridgeVersion = null,
) {
  return {
    success: true,
    resource: buildBackupBridgeReadResourceMeta(resource, extraResource),
    writeMeta: {
      importedAt: Date.now(),
      bridgeVersion,
    },
  };
}

export function buildBackupBridgeWriteError(
  request,
  error,
  bridgeVersion = null,
) {
  return {
    success: false,
    resourceId:
      String(
        request?.resourceId || request?.resource?.resourceId || "",
      ).trim() || null,
    resourceType: getBackupBridgeWriteResourceType(request),
    error: String(error?.message || error || "未知错误"),
    writeMeta: {
      importedAt: Date.now(),
      bridgeVersion,
    },
  };
}

export async function writeBackupBridgeResource(request = {}, deps = {}) {
  const result = await writeBackupBridgeResourceCore(request, deps);
  if (result?.success) {
    try {
      const resource = normalizeBackupBridgeWriteResource(request);
      assignFolderAfterWrite(resource, result, deps);
    } catch (e) {
      console.warn("[CFM] 写回后文件夹分配失败:", e);
    }
  }
  return result;
}

export async function writeBackupBridgeResourceCore(request = {}, deps = {}) {
  try {
    const resource = normalizeBackupBridgeWriteResource(request);
    const resourceType = resource.resourceType;
    const content = getBackupBridgeWriteContent(request);
    const supportedWriteResourceTypes =
      getBackupBridgeSupportedWriteResourceTypes();
    const bridgeVersion = deps.backupBridgeVersion || null;

    if (!resourceType) {
      throw new Error("无法识别 resourceType");
    }
    if (!supportedWriteResourceTypes.includes(resourceType)) {
      throw new Error(`暂不支持写入资源类型: ${resourceType}`);
    }

    if (resourceType === "chars") {
      if (content.mode !== "base64") {
        throw new Error("角色卡仅支持 base64 写入");
      }
      const file = createBackupBridgeFileFromBase64(content, resource, ".png");
      const fileExt = String(file.name.split(".").pop() || "png")
        .trim()
        .toLowerCase();
      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("file_type", fileExt || "png");
      formData.append("user_name", deps.getContext().name1 || "User");

      const response = await fetch("/api/characters/import", {
        method: "POST",
        body: formData,
        headers: deps.getContext().getRequestHeaders({ omitContentType: true }),
        cache: "no-cache",
      });
      if (!response.ok) {
        throw new Error(`导入角色卡失败: HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result?.error) {
        throw new Error(result.error);
      }
      try {
        if (typeof deps.getContext().getCharacters === "function") {
          await deps.getContext().getCharacters();
        }
      } catch (error) {
        console.warn("[CFM] 刷新角色列表失败", error);
      }
      const avatarFileName = result?.file_name
        ? `${result.file_name}.png`
        : file.name;
      return buildBackupBridgeWriteSuccess(
        resource,
        {
          sourcePath: avatarFileName ? `characters/${avatarFileName}` : null,
          extensionHint: ".png",
          mimeType: "image/png",
          updatedAt: Date.now(),
        },
        bridgeVersion,
      );
    }

    if (resourceType === "backgrounds") {
      if (content.mode !== "base64") {
        throw new Error("背景仅支持 base64 写入");
      }
      const file = createBackupBridgeFileFromBase64(content, resource, ".png");
      const headers = deps.getContext().getRequestHeaders({
        omitContentType: true,
      });
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/backgrounds/upload", {
        method: "POST",
        headers,
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`导入背景失败: HTTP ${response.status}`);
      }

      try {
        const bgModule = await import("../../../../backgrounds.js");
        if (typeof bgModule.getBackgrounds === "function") {
          await bgModule.getBackgrounds();
        }
      } catch (error) {
        console.warn("[CFM] 刷新背景列表失败", error);
      }

      try {
        if (typeof deps.renderBackgroundsView === "function") {
          deps.renderBackgroundsView();
        }
      } catch (error) {
        console.warn("[CFM] 刷新背景视图失败", error);
      }

      return buildBackupBridgeWriteSuccess(
        resource,
        {
          sourcePath: file.name,
          extensionHint:
            getBackupBridgeFileExtension(file.name) ||
            resource.extensionHint ||
            ".png",
          mimeType:
            file.type || resource.mimeType || "application/octet-stream",
          updatedAt: Date.now(),
        },
        bridgeVersion,
      );
    }

    if (resourceType === "worldinfo") {
      if (content.mode !== "json") {
        throw new Error("世界书仅支持 json 写入");
      }
      const data = cloneBackupBridgeJsonValue(content.data);
      const bookName = String(data?.name || resource.displayName || "").trim();
      if (!bookName) {
        throw new Error("世界书缺少名称");
      }
      await deps.saveWorldInfoDetailData(bookName, data);
      if (typeof deps.clearWorldInfoNamesCache === "function") {
        deps.clearWorldInfoNamesCache();
      }
      try {
        if (typeof deps.getContext().updateWorldInfoList === "function") {
          await deps.getContext().updateWorldInfoList();
        }
      } catch (error) {
        console.warn("[CFM] 刷新世界书列表失败", error);
      }
      return buildBackupBridgeWriteSuccess(
        resource,
        {
          displayName: bookName,
          sourcePath: `worldinfo/${bookName}`,
          extensionHint: ".json",
          mimeType: "application/json",
          updatedAt: resolveBackupBridgeUpdatedAt(data) || Date.now(),
          fingerprint: createBackupBridgeFingerprint(data, "json"),
        },
        bridgeVersion,
      );
    }

    if (resourceType === "presets") {
      if (content.mode !== "json") {
        throw new Error("预设仅支持 json 写入");
      }
      const pm = deps.getContext().getPresetManager();
      if (!pm) {
        throw new Error("预设管理器不可用");
      }
      const data = cloneBackupBridgeJsonValue(content.data);
      const presetName = String(
        data?.name || resource.displayName || "",
      ).trim();
      if (!presetName) {
        throw new Error("预设缺少名称");
      }
      data.name = presetName;

      if (typeof pm.savePreset === "function") {
        await pm.savePreset(presetName, data);
      } else {
        const response = await fetch("/api/presets/save", {
          method: "POST",
          headers: deps.getContext().getRequestHeaders(),
          body: JSON.stringify({
            preset: data,
            name: presetName,
            apiId: pm.apiId,
          }),
        });
        if (!response.ok) {
          throw new Error(`保存预设失败: HTTP ${response.status}`);
        }
      }

      try {
        if (typeof deps.renderPresetsView === "function") {
          deps.renderPresetsView();
        }
      } catch (error) {
        console.warn("[CFM] 刷新预设视图失败", error);
      }

      return buildBackupBridgeWriteSuccess(
        resource,
        {
          displayName: presetName,
          sourcePath: `presets/${presetName}`,
          extensionHint: ".json",
          mimeType: "application/json",
          updatedAt: resolveBackupBridgeUpdatedAt(data) || Date.now(),
          fingerprint: createBackupBridgeFingerprint(data, "json"),
        },
        bridgeVersion,
      );
    }

    if (resourceType === "themes") {
      if (content.mode !== "json") {
        throw new Error("主题仅支持 json 写入");
      }
      const data = cloneBackupBridgeJsonValue(content.data);
      const themeName = String(data?.name || resource.displayName || "").trim();
      if (!themeName) {
        throw new Error("主题缺少名称");
      }
      data.name = themeName;

      const response = await fetch("/api/themes/save", {
        method: "POST",
        headers: deps.getContext().getRequestHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`保存主题失败: HTTP ${response.status}`);
      }

      try {
        if (typeof deps.rememberImportedThemeRuntime === "function") {
          deps.rememberImportedThemeRuntime(themeName, data);
        }
        if (typeof deps.refreshThemeRuntimeAfterImport === "function") {
          await deps.refreshThemeRuntimeAfterImport(true);
        }
        if (typeof deps.renderThemesView === "function") {
          deps.renderThemesView();
        }
      } catch (error) {
        console.warn("[CFM] 刷新主题运行时失败", error);
      }

      return buildBackupBridgeWriteSuccess(
        resource,
        {
          displayName: themeName,
          sourcePath: `themes/${themeName}`,
          extensionHint: ".json",
          mimeType: "application/json",
          updatedAt: resolveBackupBridgeUpdatedAt(data) || Date.now(),
          fingerprint: createBackupBridgeFingerprint(data, "json"),
        },
        bridgeVersion,
      );
    }

    if (resourceType === "qr") {
      if (content.mode !== "json") {
        throw new Error("快速回复集仅支持 json 写入");
      }
      const data = cloneBackupBridgeJsonValue(content.data);
      const setName = String(data?.name || resource.displayName || "").trim();
      if (!setName) {
        throw new Error("快速回复集缺少名称");
      }
      data.name = setName;

      await deps.saveBackupBridgeQuickReplySet(data);

      try {
        if (typeof deps.renderQRView === "function") {
          deps.renderQRView();
        }
      } catch (error) {
        console.warn("[CFM] 刷新快速回复视图失败", error);
      }

      return buildBackupBridgeWriteSuccess(
        resource,
        {
          displayName: setName,
          sourcePath: `quickreply/${setName}`,
          extensionHint: ".json",
          mimeType: "application/json",
          updatedAt: resolveBackupBridgeUpdatedAt(data) || Date.now(),
          fingerprint: createBackupBridgeFingerprint(data, "json"),
        },
        bridgeVersion,
      );
    }

    throw new Error(`暂不支持写入资源类型: ${resourceType}`);
  } catch (error) {
    return buildBackupBridgeWriteError(
      request,
      error,
      deps.backupBridgeVersion || null,
    );
  }
}

export function assignFolderAfterWrite(resource, writeResult, deps = {}) {
  try {
    if (!writeResult?.success) return;
    const resourceType = resource?.resourceType;
    const folderPath = Array.isArray(resource?.folderPath)
      ? resource.folderPath
      : [];
    if (!resourceType || folderPath.length < 2) return;

    const folderName = folderPath[1];
    if (!folderName) return;

    const displayName =
      writeResult?.resource?.displayName || resource?.displayName || null;
    if (!displayName) return;

    const typeMapping = {
      presets: "presets",
      worldinfo: "worldinfo",
      themes: "themes",
      backgrounds: "backgrounds",
      personas: "personas",
      qr: "quickreply",
    };
    const groupType = typeMapping[resourceType];
    if (!groupType) return;

    const folderTree = deps.getResFolderTree(groupType);
    if (!folderTree) return;

    if (!folderTree[folderName]) {
      folderTree[folderName] = {
        parentId: null,
        sortOrder: Object.keys(folderTree).length + 1,
      };
      if (folderPath.length > 2) {
        folderTree[folderName].displayName = folderName;
      }
      deps.saveResTree(groupType);
    }

    deps.setItemGroup(groupType, displayName, folderName);
  } catch (e) {
    console.warn("[CFM] 写回后文件夹分配失败:", e);
  }
}
