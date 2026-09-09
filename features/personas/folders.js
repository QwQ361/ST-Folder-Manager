// 角色卡文件夹归属辅助层：负责角色卡在标签文件夹中的移动、复制、移出、标签增删与冗余路径标签清理。

export function moveCharToFolderCore(avatar, newFolderId, deps) {
  const tagMap = deps.getTagMap();
  const charTags = tagMap[avatar] || [];
  const allFolderIds = deps.getFolderTagIds();
  for (let i = charTags.length - 1; i >= 0; i--) {
    if (allFolderIds.includes(charTags[i])) charTags.splice(i, 1);
  }
  if (!charTags.includes(newFolderId)) charTags.push(newFolderId);
  tagMap[avatar] = charTags;
  deps.saveSettingsDebounced();
}

export function copyCharToFolderCore(avatar, newFolderId, deps) {
  addTagToCharCore(avatar, newFolderId, deps);
}

export function removeCharFromAllFoldersCore(avatar, deps) {
  const tagMap = deps.getTagMap();
  const charTags = tagMap[avatar] || [];
  const allFolderIds = deps.getFolderTagIds();
  for (let i = charTags.length - 1; i >= 0; i--) {
    if (allFolderIds.includes(charTags[i])) charTags.splice(i, 1);
  }
  tagMap[avatar] = charTags;
  deps.saveSettingsDebounced();
}

export function handleCharDropToFolderCore(avatar, folderId, deps) {
  if (deps.isCopyMode()) {
    copyCharToFolderCore(avatar, folderId, deps);
  } else {
    moveCharToFolderCore(avatar, folderId, deps);
  }
}

export function autoCleanRedundantTagsCore(deps) {
  const characters = deps.getCharacters();
  const tagMap = deps.getTagMap();
  const allFolderIdSet = new Set(deps.getFolderTagIds());
  let cleanedCount = 0;
  for (const char of characters) {
    const charTags = tagMap[char.avatar] || [];
    const folderTags = charTags.filter((tagId) => allFolderIdSet.has(tagId));
    if (folderTags.length <= 1) continue;
    const toRemove = new Set();
    for (const folderId of folderTags) {
      for (const otherId of folderTags) {
        if (otherId === folderId) continue;
        const path = deps.getFolderPath(otherId);
        if (path.includes(folderId) && path[path.length - 1] !== folderId) {
          toRemove.add(folderId);
          break;
        }
      }
    }
    for (const folderId of toRemove) {
      const idx = charTags.indexOf(folderId);
      if (idx >= 0) {
        charTags.splice(idx, 1);
        cleanedCount++;
      }
    }
  }
  if (cleanedCount > 0) {
    deps.saveSettingsDebounced();
    deps.log(
      `[${deps.extensionName}] 自动清理了 ${cleanedCount} 个多余的路径标签`,
    );
    deps.toastr.info(
      `已自动清理 ${cleanedCount} 个多余的路径标签`,
      "酒馆资源管理器",
      { timeOut: 3000 },
    );
  }
  return cleanedCount;
}

export function addTagToCharCore(avatar, tagId, deps) {
  const tagMap = deps.getTagMap();
  if (!tagMap[avatar]) tagMap[avatar] = [];
  if (!tagMap[avatar].includes(tagId)) {
    tagMap[avatar].push(tagId);
    deps.saveSettingsDebounced();
  }
}

export function removeTagFromCharCore(avatar, tagId, deps) {
  const tagMap = deps.getTagMap();
  if (!tagMap[avatar]) return;
  const idx = tagMap[avatar].indexOf(tagId);
  if (idx >= 0) {
    tagMap[avatar].splice(idx, 1);
    deps.saveSettingsDebounced();
  }
}
