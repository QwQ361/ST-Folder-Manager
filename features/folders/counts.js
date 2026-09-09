// 文件夹计数功能文件：用于统计各文件夹及其递归子文件夹内的资源数量，为左侧树节点、右侧列表和收藏/搜索结果中的计数显示提供统一数据。

export function getResItemsInFolderCore(type, folderId, deps) {
  const groups = deps.getResourceGroups(type);
  const childFolderIds = deps.getResChildFolders(type, folderId);
  const items = [];
  for (const [itemName, grp] of Object.entries(groups)) {
    if (grp === folderId && !childFolderIds.includes(grp)) {
      items.push(itemName);
    }
  }
  return items;
}

export function countResItemsRecursiveCore(type, folderId, deps) {
  const groups = deps.getResourceGroups(type);
  let count = 0;
  for (const val of Object.values(groups)) {
    if (val === folderId) count++;
  }
  for (const childId of deps.getResChildFolders(type, folderId)) {
    count += countResItemsRecursiveCore(type, childId, deps);
  }
  return count;
}

export function getCharactersInFolderCore(folderTagId, deps) {
  const childFolderIds = deps.getChildFolders(folderTagId);
  const characters = deps.getCharacters();
  const tagMap = deps.getTagMap();
  return characters.filter((char) => {
    const charTags = tagMap[char.avatar] || [];
    if (!charTags.includes(folderTagId)) return false;
    for (const childId of childFolderIds) {
      if (charTags.includes(childId)) return false;
    }
    return true;
  });
}

export function getUncategorizedCharactersCore(deps) {
  const folderTagIds = deps.getFolderTagIds();
  if (folderTagIds.length === 0) return deps.getCharacters();
  const characters = deps.getCharacters();
  const tagMap = deps.getTagMap();
  return characters.filter((char) => {
    const charTags = tagMap[char.avatar] || [];
    return !folderTagIds.some((fid) => charTags.includes(fid));
  });
}

export function countCharsInFolderRecursiveCore(folderTagId, deps) {
  let count = deps.getCharactersInFolder(folderTagId).length;
  for (const childId of deps.getChildFolders(folderTagId)) {
    count += countCharsInFolderRecursiveCore(childId, deps);
  }
  return count;
}
