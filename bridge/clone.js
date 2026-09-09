// Backup Bridge 克隆工具层：承接桥接数据导出/导入过程中的安全深拷贝与纯 JSON 化，避免原始对象引用污染备份数据。

export function safeCloneBridgeValue(value, depth = 0, maxDepth = 4) {
  if (value == null) return value;
  if (depth >= maxDepth) return "[MaxDepth]";
  if (Array.isArray(value)) {
    return value
      .slice(0, 200)
      .map((item) => safeCloneBridgeValue(item, depth + 1, maxDepth));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value).slice(0, 500)) {
      if (typeof val === "function") continue;
      out[key] = safeCloneBridgeValue(val, depth + 1, maxDepth);
    }
    return out;
  }
  return value;
}

export function getBridgeObjectKeyCount(obj) {
  return obj && typeof obj === "object" ? Object.keys(obj).length : 0;
}

export function cloneBackupBridgeJsonValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
