// 搜索辅助：文件夹路径显示名数组（供各资源搜索的结果过滤与显示）。
// 原 index.js 中 getCharFolderPathNames / getResFolderPathNames / getFolderSelfPathNames 迁移。
// 依赖注入：getTagMap、getFolderTagIds、getFolderPath、getTagName、
// getResourceGroups、getResFolderPath、getResFolderDisplayName。

export function createSearchHelpers(deps) {
  const {
    getTagMap,
    getFolderTagIds,
    getFolderPath,
    getTagName,
    getResourceGroups,
    getResFolderPath,
    getResFolderDisplayName,
  } = deps;

  /**
   * 获取角色卡所在文件夹的路径显示名数组（从根到叶）
   * @param {object} char - 角色卡对象（含 avatar 字段）
   * @returns {string[]}
   */
  function getCharFolderPathNames(char) {
    const tagMap = getTagMap();
    const charTags = tagMap[char.avatar] || [];
    const folderTagIds = getFolderTagIds();
    const names = [];
    for (const fid of charTags) {
      if (folderTagIds.includes(fid)) {
        const path = getFolderPath(fid);
        for (const pid of path) {
          const n = getTagName(pid);
          if (n && !names.includes(n)) names.push(n);
        }
      }
    }
    return names;
  }

  /**
   * 获取资源所在文件夹的路径显示名数组（从根到叶）
   * @param {string} type - 'presets' | 'themes' | 'backgrounds' | 'worldinfo'
   * @param {string} itemName - 资源名称
   * @returns {string[]}
   */
  function getResFolderPathNames(type, itemName) {
    const groups = getResourceGroups(type);
    const folderId = groups[itemName];
    if (!folderId) return [];
    const path = getResFolderPath(type, folderId);
    return path
      .map((pid) => getResFolderDisplayName(type, pid))
      .filter(Boolean);
  }

  /**
   * 获取文件夹自身路径的显示名数组（用于文件夹搜索）
   * @param {string} mode - 'chars' | 'presets' | 'themes' | 'backgrounds' | 'worldinfo'
   * @param {string} folderId
   * @returns {string[]}
   */
  function getFolderSelfPathNames(mode, folderId) {
    if (mode === "chars") {
      const path = getFolderPath(folderId);
      return path.map((pid) => getTagName(pid)).filter(Boolean);
    } else {
      const path = getResFolderPath(mode, folderId);
      return path
        .map((pid) => getResFolderDisplayName(mode, pid))
        .filter(Boolean);
    }
  }

  return {
    getCharFolderPathNames,
    getResFolderPathNames,
    getFolderSelfPathNames,
  };
}
