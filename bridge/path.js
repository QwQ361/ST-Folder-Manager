// Backup Bridge 路径层：承接桥接导出时的根标签、文件扩展名、MIME 类型与文件夹路径构建。

export function getBackupBridgeFileExtension(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const sanitized = text.split(/[?#]/)[0];
  const baseName = sanitized.split("/").pop() || "";
  const dotIndex = baseName.lastIndexOf(".");
  if (dotIndex <= 0) return null;
  return baseName.slice(dotIndex).toLowerCase();
}

export function getBackupBridgeMimeType(extensionHint) {
  const normalized = String(extensionHint || "")
    .trim()
    .toLowerCase();
  return normalized === ".png"
    ? "image/png"
    : normalized === ".jpg" || normalized === ".jpeg"
      ? "image/jpeg"
      : normalized === ".webp"
        ? "image/webp"
        : normalized === ".gif"
          ? "image/gif"
          : normalized === ".bmp"
            ? "image/bmp"
            : normalized === ".svg"
              ? "image/svg+xml"
              : null;
}

export function buildBackupBridgeTreeFolderPath(
  tree,
  folderId,
  visited = new Set(),
) {
  const normalizedId = String(folderId || "").trim();
  if (!normalizedId || !tree || typeof tree !== "object") return [];
  if (visited.has(normalizedId)) return [];
  const node = tree[normalizedId];
  if (!node || typeof node !== "object") return [];
  const nextVisited = new Set(visited);
  nextVisited.add(normalizedId);
  const label = String(node.displayName || node.name || normalizedId).trim();
  const parentId = String(node.parentId || "").trim();
  const parentPath = parentId
    ? buildBackupBridgeTreeFolderPath(tree, parentId, nextVisited)
    : [];
  return label ? [...parentPath, label] : parentPath;
}

export function buildBackupBridgeCharFolderPath(
  charFolders,
  getTagName,
  tagId,
  visited = new Set(),
) {
  const normalizedId = String(tagId || "").trim();
  if (!normalizedId) return [];
  if (visited.has(normalizedId)) return [];
  const folder = charFolders?.[normalizedId];
  if (!folder) return [];
  const nextVisited = new Set(visited);
  nextVisited.add(normalizedId);
  const label = String(getTagName?.(normalizedId) || normalizedId).trim();
  const parentId = String(folder.parentId || "").trim();
  const parentPath = parentId
    ? buildBackupBridgeCharFolderPath(
        charFolders,
        getTagName,
        parentId,
        nextVisited,
      )
    : [];
  return label ? [...parentPath, label] : parentPath;
}

export function buildBackupBridgeFolderDefinition(folderId, folderPath, node) {
  const normalizedFolderId = String(folderId || "").trim();
  const normalizedFolderPath = Array.isArray(folderPath)
    ? folderPath.map((segment) => String(segment || "").trim()).filter(Boolean)
    : [];
  const normalizedParentId = String(node?.parentId || "").trim() || null;
  const normalizedSortOrder = Number(node?.sortOrder);

  if (!normalizedFolderId && normalizedFolderPath.length === 0) {
    return null;
  }

  return {
    folderId: normalizedFolderId || null,
    displayName:
      normalizedFolderPath.length > 0
        ? normalizedFolderPath[normalizedFolderPath.length - 1]
        : null,
    folderPath: normalizedFolderPath,
    parentId: normalizedParentId,
    sortOrder: Number.isFinite(normalizedSortOrder)
      ? normalizedSortOrder
      : null,
  };
}

export function buildBackupBridgeTreeFolderDefinitions(tree) {
  if (!tree || typeof tree !== "object") return [];

  return Object.keys(tree)
    .map((folderId) =>
      buildBackupBridgeFolderDefinition(
        folderId,
        buildBackupBridgeTreeFolderPath(tree, folderId),
        tree[folderId],
      ),
    )
    .filter((entry) => entry && entry.folderPath.length > 0);
}

export function buildBackupBridgeCharFolderDefinitions(
  charFolders,
  getTagName,
) {
  if (!charFolders || typeof charFolders !== "object") return [];

  return Object.keys(charFolders)
    .map((folderId) =>
      buildBackupBridgeFolderDefinition(
        folderId,
        buildBackupBridgeCharFolderPath(charFolders, getTagName, folderId),
        charFolders[folderId],
      ),
    )
    .filter((entry) => entry && entry.folderPath.length > 0);
}

export function buildBackupBridgeResourceFolderDefinitionsMap(
  resourceFolderTree,
) {
  if (!resourceFolderTree || typeof resourceFolderTree !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(resourceFolderTree).map(([resourceType, tree]) => {
      return [resourceType, buildBackupBridgeTreeFolderDefinitions(tree)];
    }),
  );
}
