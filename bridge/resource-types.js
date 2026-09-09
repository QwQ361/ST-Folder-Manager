// Backup Bridge 资源类型层：承接桥接请求中的资源类型标准化、过滤与支持范围判断。

export function getBackupBridgeSupportedResourceTypes() {
  return [
    "chars",
    "worldinfo",
    "presets",
    "themes",
    "backgrounds",
    "personas",
    "regex",
    "qr",
  ];
}

export function getBackupBridgeSupportedWriteResourceTypes() {
  return ["chars", "worldinfo", "presets", "themes", "backgrounds", "qr"];
}

export function normalizeBackupBridgeResourceType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "quickreply") return "qr";
  return getBackupBridgeSupportedResourceTypes().includes(normalized)
    ? normalized
    : null;
}

export function getBackupBridgeRequestedResourceTypes(options) {
  const requested = Array.isArray(options?.resourceTypes)
    ? options.resourceTypes
    : getBackupBridgeSupportedResourceTypes();
  const seen = new Set();
  const out = [];
  for (const value of requested) {
    const resourceType = normalizeBackupBridgeResourceType(value);
    if (!resourceType || seen.has(resourceType)) continue;
    seen.add(resourceType);
    out.push(resourceType);
  }
  return out;
}

export function getBackupBridgeRootLabel(resourceType) {
  return resourceType === "chars"
    ? "角色"
    : resourceType === "worldinfo"
      ? "世界书"
      : resourceType === "presets"
        ? "预设"
        : resourceType === "themes"
          ? "主题"
          : resourceType === "backgrounds"
            ? "背景"
            : resourceType === "personas"
              ? "User"
              : resourceType === "regex"
                ? "正则"
                : "QR";
}
