// SillyTavern 集成适配层：承接 getContext、原生 API、角色/预设/世界书/聊天等外部接口的薄封装，避免 feature 直接散落访问全局对象。

/**
 * 获取 SillyTavern 全局上下文句柄
 * 作为 ST 集成层唯一入口，供 index.js 及各已拆模块经 deps 注入使用
 */
export function getStContext() {
  return SillyTavern.getContext;
}

/**
 * 动态导入酒馆核心模块，获取 entitiesFilter 和 printCharactersDebounced
 * 用于在分页前进行数据级过滤，而非 DOM 级 show/hide
 * 以及聊天记录管理相关 API
 * @returns {Promise<Object>} 包含各 ST 核心模块 API 的对象（失败项为 null，不影响其他项）
 */
export async function loadStCoreModules() {
  // 聊天记录管理相关 API
  let entitiesFilter = null;
  let printCharactersDebounced = null;
  let getPastCharacterChatsFunc = null;
  let deleteCharacterChatByNameFunc = null;
  let renameGroupOrCharacterChatFunc = null;
  let openCharacterChatFunc = null;
  let importCharacterChatFunc = null;
  let doNewChatFunc = null;
  try {
    const scriptModule = await import("../../../../../script.js");
    entitiesFilter = scriptModule.entitiesFilter;
    printCharactersDebounced = scriptModule.printCharactersDebounced;
    getPastCharacterChatsFunc = scriptModule.getPastCharacterChats;
    deleteCharacterChatByNameFunc = scriptModule.deleteCharacterChatByName;
    renameGroupOrCharacterChatFunc = scriptModule.renameGroupOrCharacterChat;
    openCharacterChatFunc = scriptModule.openCharacterChat;
    importCharacterChatFunc = scriptModule.importCharacterChat;
    doNewChatFunc = scriptModule.doNewChat;
    console.log(
      "[CFM] 成功获取 entitiesFilter, printCharactersDebounced 和聊天记录管理 API",
    );
  } catch (e) {
    console.warn(
      "[CFM] 无法导入 script.js 模块，角色卡文件夹过滤将回退到 DOM 级过滤:",
      e,
    );
  }

  // 动态导入酒馆 personas 模块，获取 personasFilter 和 getUserAvatars
  // 用于在分页前进行数据级过滤，修复 Persona 文件夹过滤与分页不兼容的问题
  let personasFilter = null;
  let getUserAvatarsFunc = null;
  try {
    const personasModule = await import("../../../../personas.js");
    personasFilter = personasModule.personasFilter;
    getUserAvatarsFunc = personasModule.getUserAvatars;
    console.log("[CFM] 成功获取 personasFilter 和 getUserAvatars");
  } catch (e) {
    console.warn(
      "[CFM] 无法导入 personas.js 模块，Persona 文件夹过滤将回退到 DOM 级过滤:",
      e,
    );
  }

  let Popup = null;
  let POPUP_TYPE = null;
  try {
    const popupModule = await import("../../../../popup.js");
    Popup = popupModule.Popup;
    POPUP_TYPE = popupModule.POPUP_TYPE;
    console.log("[CFM] 成功获取 Popup 和 POPUP_TYPE");
  } catch (e) {
    console.warn("[CFM] 无法导入 popup.js 模块，头像裁剪弹窗不可用:", e);
  }

  let ensureImageFormatSupported = null;
  let getBase64Async = null;
  try {
    const utilsModule = await import("../../../../utils.js");
    ensureImageFormatSupported = utilsModule.ensureImageFormatSupported;
    getBase64Async = utilsModule.getBase64Async;
    console.log("[CFM] 成功获取 ensureImageFormatSupported 和 getBase64Async");
  } catch (e) {
    console.warn("[CFM] 无法导入 utils.js 模块，头像裁剪预处理不可用:", e);
  }

  return {
    entitiesFilter,
    printCharactersDebounced,
    getPastCharacterChatsFunc,
    deleteCharacterChatByNameFunc,
    renameGroupOrCharacterChatFunc,
    openCharacterChatFunc,
    importCharacterChatFunc,
    doNewChatFunc,
    personasFilter,
    getUserAvatarsFunc,
    Popup,
    POPUP_TYPE,
    ensureImageFormatSupported,
    getBase64Async,
  };
}
