// Backup Bridge 时间戳层：承接桥接资源 updatedAt 的归一化、回退解析与导出时间字段生成。

export function normalizeBackupBridgeTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return Math.round(numericValue);
    }

    const parsedValue = Date.parse(trimmed);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

export function resolveBackupBridgeUpdatedAt(...sources) {
  const candidateKeys = [
    "updatedAt",
    "updateAt",
    "lastModified",
    "modifiedAt",
    "mtime",
    "timestamp",
    "create_date",
    "date_last_chat",
    "dateAdded",
    "createdAt",
  ];

  for (const source of sources) {
    const directValue = normalizeBackupBridgeTimestamp(source);
    if (directValue != null) {
      return directValue;
    }

    if (!source || typeof source !== "object" || Array.isArray(source)) {
      continue;
    }

    for (const key of candidateKeys) {
      const timestampValue = normalizeBackupBridgeTimestamp(source[key]);
      if (timestampValue != null) {
        return timestampValue;
      }
    }
  }

  return null;
}
