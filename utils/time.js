// 时间工具层：承接时间戳解析、格式化、更新时间回退与显示用日期转换等无资源业务语义的时间辅助函数。

/**
 * 从角色对象多个候选字段中解析时间戳。
 * 依次尝试各候选值：有限数值直接使用，可解析字符串返回 Date.parse 结果，
 * 纯数字字符串转为数值。全部无效返回 null。
 *
 * @param {object} char 角色对象（可能含嵌套 data 字段）
 * @returns {number|null} 时间戳；无法解析时返回 null
 */
export function parseCharTime(char) {
  const candidates = [
    char?.create_date,
    char?.created_at,
    char?.date_added,
    char?.last_modified,
    char?.modified,
    char?.update_date,
    char?.updated_at,
    char?.data?.create_date,
    char?.data?.created_at,
    char?.data?.date_added,
    char?.data?.last_modified,
    char?.data?.modified,
    char?.data?.update_date,
    char?.data?.updated_at,
  ];
  for (const value of candidates) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const ts = Date.parse(String(value));
    if (!Number.isNaN(ts)) return ts;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

/**
 * 将字节数格式化为人类可读的文件大小字符串。
 *
 * @param {number|string} bytes 字节数
 * @returns {string} 格式化结果；无效或非正数时返回空字符串
 */
export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const digits = value >= 100 || idx === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[idx]}`;
}
