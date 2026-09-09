// 文本工具层：承接 escapeHtml、名称规范化、公共前后缀检测等无资源业务语义的文本辅助函数。

export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getUniqueImportName(baseName, existingNames) {
  let newName = baseName + "-1";
  let counter = 1;
  while (existingNames.has(newName)) {
    counter++;
    newName = baseName + "-" + counter;
  }
  return newName;
}

/** 从 CSS url(...) 字符串中提取原始 URL */
export function extractUrlFromCss(cssUrl) {
  return cssUrl.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
}

/** 将原始 URL 转为 CSS url(...) 字符串 */
export function toCssUrl(url) {
  return `url("${url}")`;
}
