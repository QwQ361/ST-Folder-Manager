// 搜索匹配核心：模糊匹配器（纯函数，无 DOM / 无状态依赖）。
// 供各资源视图的全局搜索复用（角色卡、预设、世界书、主题、背景、快速回复、正则、User 等）。

/**
 * 模糊匹配：将 query 按空白拆分为多个 token，要求每个 token 都出现在合并后的文本池中。
 * @param {string} query - 搜索关键词（可包含多个以空白分隔的 token）
 * @param {string[]} textPool - 待匹配文本数组（会被 join 后做包含判断）
 * @returns {boolean} 是否全部 token 命中
 */
export function fuzzyMatch(query, textPool) {
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const poolStr = textPool.join("\n");
  return tokens.every((token) => poolStr.includes(token));
}
