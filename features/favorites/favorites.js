// 通用收藏辅助层：承接跨资源可复用的收藏状态读写与切换辅助；各资源域的收藏恢复、ID/名称映射和视图刷新应由对应 feature 模块负责。

const RESOURCE_FAVORITE_KEYS = {
  presets: "presetFavorites",
  worldinfo: "worldInfoFavorites",
  themes: "themeFavorites",
  backgrounds: "bgFavorites",
  personas: "personaFavorites",
  regex: "regexFavorites",
  quickreply: "qrFavorites",
};

function getResourceFavoriteKey(type) {
  return RESOURCE_FAVORITE_KEYS[type] || RESOURCE_FAVORITE_KEYS.worldinfo;
}

export function getFavoritesCore(settings, extensionName) {
  return settings[extensionName].favorites || [];
}

export function isFavoriteCore(avatar, deps) {
  return deps.getFavorites().includes(avatar);
}

export function toggleFavoriteCore(avatar, deps) {
  const favs = deps.getFavorites();
  const idx = favs.indexOf(avatar);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(avatar);
  }
  deps.settings[deps.extensionName].favorites = favs;
  deps.saveSettingsDebounced();
  return idx < 0;
}

export function getFavoriteCharactersCore(deps) {
  const favs = deps.getFavorites();
  return deps.getCharacters().filter((c) => favs.includes(c.avatar));
}

export function ensureResFavoritesCore(deps) {
  const settings = deps.extensionSettings[deps.extensionName];
  Object.values(RESOURCE_FAVORITE_KEYS).forEach((key) => {
    if (!settings[key]) settings[key] = [];
  });
}

export function getResFavoritesCore(type, deps) {
  deps.ensureResFavorites();
  return deps.extensionSettings[deps.extensionName][getResourceFavoriteKey(type)];
}

export function isResFavoriteCore(type, name, deps) {
  return deps.getResFavorites(type).includes(name);
}

export function toggleResFavoriteCore(type, name, deps) {
  const favs = deps.getResFavorites(type);
  const idx = favs.indexOf(name);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(name);
  deps.saveSettingsDebounced();
  return idx < 0;
}
