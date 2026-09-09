// 通用文件夹树模型层：承接角色标签树与资源树的共性数据读取、父子层级、路径构建、展开态辅助和节点查找；具体资源视图渲染与业务操作不得混入本文件。

export function getResFolderTreeCore(type, deps) {
  deps.ensureResourceSettings();
  return deps.extensionSettings[deps.extensionName].resourceFolderTree[type];
}

export function saveResTreeCore(deps) {
  deps.saveSettingsDebounced();
}

export function getResFolderIdsCore(type, deps) {
  return Object.keys(getResFolderTreeCore(type, deps));
}

export function getResFolderNameCore(_type, folderId) {
  return folderId;
}

export function getResFolderDisplayNameCore(type, folderId, deps) {
  const tree = getResFolderTreeCore(type, deps);
  return tree[folderId]?.displayName || folderId;
}

export function getResTopLevelFoldersCore(type, deps) {
  const tree = getResFolderTreeCore(type, deps);
  return Object.keys(tree).filter((id) => !tree[id].parentId);
}

export function getResChildFoldersCore(type, parentId, deps) {
  const tree = getResFolderTreeCore(type, deps);
  return Object.keys(tree).filter((id) => tree[id].parentId === parentId);
}

export function sortResFoldersCore(type, folderIds, deps) {
  const tree = getResFolderTreeCore(type, deps);
  return [...folderIds].sort((a, b) => {
    const oa = tree[a]?.sortOrder ?? 0;
    const ob = tree[b]?.sortOrder ?? 0;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "zh-CN");
  });
}

export function wouldCreateResCycleCore(type, folderId, parentId, deps) {
  const tree = getResFolderTreeCore(type, deps);
  let current = parentId;
  const visited = new Set();
  while (current) {
    if (current === folderId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    current = tree[current]?.parentId || null;
  }
  return false;
}

export function getResFolderPathCore(type, folderId, deps) {
  const tree = getResFolderTreeCore(type, deps);
  const path = [];
  let current = folderId;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    path.unshift(current);
    current = tree[current]?.parentId || null;
  }
  return path;
}

export function getTagListCore(deps) {
  return deps.getContext().tags || [];
}

export function getTagMapCore(deps) {
  return deps.getContext().tagMap || {};
}

export function getCharactersCore(deps) {
  return deps.getContext().characters || [];
}

export function getTagNameCore(tagId, deps) {
  const folder = deps.config.folders[tagId];
  if (folder && folder.displayName) return folder.displayName;
  const tag = deps.getTagList().find((t) => t.id === tagId);
  return tag ? tag.name : tagId;
}

export function getFullTagNameCore(tagId, deps) {
  const tag = deps.getTagList().find((t) => t.id === tagId);
  return tag ? tag.name : tagId;
}

export function buildPrefixedTagNameCore(name, parentTagId, deps) {
  const pathNames = [];
  let current = parentTagId;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    pathNames.unshift(deps.getTagName(current));
    current = deps.config.folders[current]?.parentId || null;
  }
  pathNames.push(name);
  return pathNames.join("-");
}

export function rebuildTagNameCore(tagId, deps) {
  const folder = deps.config.folders[tagId];
  if (!folder) return;

  const shortName = folder.displayName || deps.getFullTagName(tagId);
  const parentId = folder.parentId;
  let newTagName;
  if (parentId) {
    newTagName = deps.buildPrefixedTagName(shortName, parentId);
  } else {
    newTagName = shortName;
  }

  const tags = deps.getContext().tags;
  const conflict = tags.find(
    (t) => t.id !== tagId && t.name.toLowerCase() === newTagName.toLowerCase(),
  );
  if (conflict) {
    let counter = 2;
    let finalName;
    do {
      finalName = `${newTagName}_${counter++}`;
    } while (
      tags.find(
        (t) =>
          t.id !== tagId && t.name.toLowerCase() === finalName.toLowerCase(),
      )
    );
    newTagName = finalName;
  }

  deps.renameTagInSystem(tagId, newTagName);
}

export function recursiveRebuildTagNamesCore(tagId, deps) {
  deps.rebuildTagName(tagId);
  const children = deps.getChildFolders(tagId);
  for (const childId of children) {
    recursiveRebuildTagNamesCore(childId, deps);
  }
}

export function findOrCreateTagCore(intendedName, parentTagId, deps) {
  const tags = deps.getContext().tags;
  if (parentTagId) {
    const prefixedName = deps.buildPrefixedTagName(intendedName, parentTagId);
    const prefixedTag = tags.find(
      (t) => t.name.toLowerCase() === prefixedName.toLowerCase(),
    );
    if (prefixedTag) {
      if (deps.config.folders[prefixedTag.id]?.parentId === parentTagId) {
        return { tag: prefixedTag, displayName: intendedName };
      }
      let counter = 2;
      let finalName;
      do {
        finalName = `${prefixedName}_${counter++}`;
      } while (
        tags.find((t) => t.name.toLowerCase() === finalName.toLowerCase())
      );
      return {
        tag: deps.createNewTagInSystem(finalName),
        displayName: intendedName,
      };
    }
    return {
      tag: deps.createNewTagInSystem(prefixedName),
      displayName: intendedName,
    };
  }

  const existingTag = tags.find(
    (t) => t.name.toLowerCase() === intendedName.toLowerCase(),
  );
  if (existingTag) {
    if (deps.config.folders[existingTag.id]) {
      if (!deps.config.folders[existingTag.id].parentId) {
        return { tag: existingTag, displayName: null };
      }
      let counter = 2;
      let finalName;
      do {
        finalName = `${intendedName}_${counter++}`;
      } while (
        tags.find((t) => t.name.toLowerCase() === finalName.toLowerCase())
      );
      return {
        tag: deps.createNewTagInSystem(finalName),
        displayName: intendedName,
      };
    }
    return { tag: existingTag, displayName: null };
  }

  return { tag: deps.createNewTagInSystem(intendedName), displayName: null };
}

export function getFolderTagIdsCore(deps) {
  return Object.keys(deps.config.folders);
}

export function getTopLevelFoldersCore(deps) {
  return deps
    .getFolderTagIds()
    .filter((id) => !deps.config.folders[id].parentId);
}

export function getChildFoldersCore(parentTagId, deps) {
  return deps
    .getFolderTagIds()
    .filter((id) => deps.config.folders[id].parentId === parentTagId);
}

export function getFolderPathCore(tagId, deps) {
  const path = [];
  let current = tagId;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    path.unshift(current);
    current = deps.config.folders[current]?.parentId || null;
  }
  return path;
}

export function wouldCreateCycleCore(folderId, parentId, deps) {
  let current = parentId;
  const visited = new Set();
  while (current) {
    if (current === folderId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    current = deps.config.folders[current]?.parentId || null;
  }
  return false;
}
