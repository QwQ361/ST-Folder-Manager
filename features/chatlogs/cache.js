// 聊天记录缓存层：承接角色聊天列表缓存、缓存失效与重载逻辑。

export function createChatlogCacheApiCore(deps) {
  const {
    fetch,
    getCharacters,
    getContext,
    getPastCharacterChatsFunc,
    state,
  } = deps;

async function getCharChats(avatar) {
  if (state.cfmChatCache.has(avatar)) return state.cfmChatCache.get(avatar);
  const characters = getCharacters();
  const charIdx = characters.findIndex((c) => c.avatar === avatar);
  if (charIdx < 0) {
    state.cfmChatCache.set(avatar, []);
    return [];
  }
  if (!getPastCharacterChatsFunc) {
    // 回退：通过 getContext 获取
    const ctx = getContext();
    if (ctx.getRequestHeaders) {
      try {
        const response = await fetch("/api/characters/chats", {
          method: "POST",
          body: JSON.stringify({ avatar_url: avatar }),
          headers: ctx.getRequestHeaders(),
        });
        if (!response.ok) {
          state.cfmChatCache.set(avatar, []);
          return [];
        }
        const data = await response.json();
        if (typeof data === "object" && data.error === true) {
          state.cfmChatCache.set(avatar, []);
          return [];
        }
        const chats = Object.values(data)
          .sort((a, b) => a["file_name"].localeCompare(b["file_name"]))
          .reverse();
        state.cfmChatCache.set(avatar, chats);
        return chats;
      } catch (e) {
        console.error("[CFM] 获取聊天记录失败:", e);
        state.cfmChatCache.set(avatar, []);
        return [];
      }
    }
    state.cfmChatCache.set(avatar, []);
    return [];
  }
  try {
    const chats = await getPastCharacterChatsFunc(charIdx);
    state.cfmChatCache.set(avatar, chats);
    return chats;
  } catch (e) {
    console.error("[CFM] 获取聊天记录失败:", e);
    state.cfmChatCache.set(avatar, []);
    return [];
  }
}

/**
 * 使某个角色的聊天缓存失效
 */
async function invalidateChatCache(avatar) {
  state.cfmChatCache.delete(avatar);
  // 立即重新加载缓存，避免后续 rerenderCurrentView 时三角箭头消失
  await getCharChats(avatar);
}



  return {
    getCharChats,
    invalidateChatCache,
  };
}
