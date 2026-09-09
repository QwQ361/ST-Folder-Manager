// 角色卡隐藏状态辅助层：负责隐藏列表读写、隐藏状态判断、切换与列表过滤。

export function getHiddenCharsCore(settings, extensionName) {
  return settings[extensionName].hiddenChars || [];
}

export function isCharHiddenCore(avatar, deps) {
  return deps.getHiddenChars().includes(avatar);
}

export function toggleCharHiddenCore(avatar, deps) {
  const hiddenChars = deps.getHiddenChars();
  const idx = hiddenChars.indexOf(avatar);
  if (idx >= 0) {
    hiddenChars.splice(idx, 1);
  } else {
    hiddenChars.push(avatar);
  }
  deps.settings[deps.extensionName].hiddenChars = hiddenChars;
  deps.saveSettingsDebounced();
  return idx < 0;
}

export function filterHiddenCharsCore(chars, deps) {
  if (deps.showHiddenChars()) return chars;
  const hiddenChars = deps.getHiddenChars();
  if (hiddenChars.length === 0) return chars;
  return chars.filter((character) => !hiddenChars.includes(character.avatar));
}
