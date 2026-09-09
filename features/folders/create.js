// 文件夹创建功能文件：用于处理单个创建、批量创建、结构模板应用、层级生成以及新文件夹节点插入文件夹树时的相关逻辑。

export function addResFolderCore(type, name, parentId, displayName, deps) {
  const tree = deps.getResFolderTree(type);
  if (tree[name]) return false;

  const normalizedParentId = parentId || null;
  const siblings = deps.getResChildFolders(type, normalizedParentId);
  const maxOrder = siblings.reduce(
    (m, id) => Math.max(m, tree[id]?.sortOrder ?? 0),
    0,
  );
  const entry = {
    parentId: normalizedParentId,
    sortOrder: maxOrder + 1,
  };
  if (displayName && displayName !== name) {
    entry.displayName = displayName;
  }
  tree[name] = entry;
  deps.saveResTree(type);
  return true;
}

export function createNewTagInSystemCore(name, deps) {
  const context = deps.getContext();
  const tags = context.tags;
  const tag = {
    id: context.uuidv4(),
    name,
    folder_type: "NONE",
    filter_state: "UNDEFINED",
    sort_order: Math.max(0, ...tags.map((t) => t.sort_order || 0)) + 1,
    is_hidden_on_character_card: false,
    color: "",
    color2: "",
    create_date: Date.now(),
  };
  tags.push(tag);
  return tag;
}
