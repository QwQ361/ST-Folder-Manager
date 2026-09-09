// 聊天记录置顶层：承接最近聊天置顶状态的读取、切换、顺序恢复与缺失项补抓，对应老代码中的 pinnedChats 持久化、welcome-screen 最近聊天列表重排、置顶项图钉交互，以及缺失置顶聊天的异步插入逻辑。

export function createChatlogPinningApiCore(deps) {
  const {
    CSS,
    Node,
    MutationObserver,
    cfmToastr,
    document,
    escapeHtml,
    fetch,
    getCharacters,
    getContext,
    getThumbnailUrl,
    openChatFile,
    requestAnimationFrame,
    cancelAnimationFrame,
    saveSettingsDebounced,
    settings,
  } = deps;

  let welcomeRecentChatRefreshToken = 0;
  let welcomeRecentChatRefreshFrameId = 0;
  const cfmPendingMissingPinnedFetches = new Set();
  let enhanceRecentChatsWithNotesCallback = null;

  function setEnhanceRecentChatsWithNotesCallback(callback) {
    enhanceRecentChatsWithNotesCallback = typeof callback === "function" ? callback : null;
  }

  function runEnhanceRecentChatsWithNotes() {
    if (enhanceRecentChatsWithNotesCallback) {
      enhanceRecentChatsWithNotesCallback();
    }
  }

  // ==================== 聊天置顶管理 ====================
  
  /**
   * 获取所有置顶聊天列表
   * @returns {{ avatar: string, chatFileName: string }[]}
   */
  function getPinnedChats() {
    return settings.pinnedChats || [];
  }
  
  /**
   * 检查某聊天是否已置顶
   */
  function isChatPinned(avatar, chatFileName) {
    return getPinnedChats().some(
      (p) => p.avatar === avatar && p.chatFileName === chatFileName,
    );
  }
  
  /**
   * 切换聊天的置顶状态
   * @param {string} avatar - 角色的 avatar 文件名
   * @param {string} chatFileName - 聊天文件名（不含扩展名）
   * @returns {boolean} true=已置顶, false=已取消置顶
   */
  function togglePinChat(avatar, chatFileName) {
    const pinned = getPinnedChats();
    const idx = pinned.findIndex(
      (p) => p.avatar === avatar && p.chatFileName === chatFileName,
    );
    if (idx >= 0) {
      // 取消置顶
      pinned.splice(idx, 1);
      settings.pinnedChats = pinned;
      saveSettingsDebounced();
      cfmToastr.info("已取消置顶");
      applyPinnedChatsToWelcomeScreen();
      return false;
    } else {
      // 添加置顶
      pinned.push({ avatar, chatFileName });
      settings.pinnedChats = pinned;
      saveSettingsDebounced();
      cfmToastr.success("已置顶到最近聊天");
      applyPinnedChatsToWelcomeScreen();
      return true;
    }
  }
  
  // 兼容旧调用名，避免历史残留逻辑调用 toggleChatPin 时失效
  function toggleChatPin(avatar, chatFileName) {
    return togglePinChat(avatar, chatFileName);
  }
  
  function scheduleWelcomeRecentChatRefresh() {
    const token = ++welcomeRecentChatRefreshToken;
    if (welcomeRecentChatRefreshFrameId) {
      cancelAnimationFrame(welcomeRecentChatRefreshFrameId);
    }
    welcomeRecentChatRefreshFrameId = requestAnimationFrame(() => {
      welcomeRecentChatRefreshFrameId = 0;
      if (token !== welcomeRecentChatRefreshToken) return;
      applyPinnedChatsToWelcomeScreen();
      requestAnimationFrame(() => runEnhanceRecentChatsWithNotes());
    });
  }
  
  /**
   * 将置顶聊天应用到酒馆的 welcome-screen "最近聊天" 列表
   * 通过操作 DOM 将置顶项移动/插入到列表最前面
   */
  function applyPinnedChatsToWelcomeScreen() {
    const chatEl = document.getElementById("chat");
    if (!chatEl) return;
    const welcomePanel = chatEl.querySelector(".welcomePanel");
    if (!welcomePanel) return;
    const recentList = welcomePanel.querySelector(".recentChatList");
    if (!recentList) return;
  
    const pinned = getPinnedChats();
  
    // 先移除重复聊天项，避免多次补抓/重试导致同一聊天重复显示
    const seenChatKeys = new Set();
    recentList.querySelectorAll(".recentChat").forEach((el) => {
      const key =
        (el.getAttribute("data-avatar") || "") +
        "::" +
        (el.getAttribute("data-file") || "");
      if (!key || key === "::") return;
      if (seenChatKeys.has(key)) {
        el.remove();
        return;
      }
      seenChatKeys.add(key);
    });
  
    // 先移除所有置顶标记
    recentList.querySelectorAll(".recentChat").forEach((el) => {
      el.classList.remove("cfm-pinned-chat");
      const pinIcon = el.querySelector(".cfm-pin-indicator");
      if (pinIcon) pinIcon.remove();
    });
  
    if (pinned.length === 0) return;
  
    // 找到 "showMoreChats" 按钮之前的参考点（置顶项应在所有普通项之前）
    const allChatItems = Array.from(recentList.querySelectorAll(".recentChat"));
  
    // 将已存在的置顶项移到最前面，按置顶顺序排列
    const pinnedElements = [];
    const unpinnedElements = [];
  
    for (const item of allChatItems) {
      const itemAvatar = item.getAttribute("data-avatar") || "";
      const itemFile = item.getAttribute("data-file") || "";
      const isPinned = pinned.some(
        (p) => p.avatar === itemAvatar && p.chatFileName === itemFile,
      );
      if (isPinned) {
        pinnedElements.push(item);
      } else {
        unpinnedElements.push(item);
      }
    }
  
    // 按置顶列表顺序排序已置顶的元素
    pinnedElements.sort((a, b) => {
      const aAvatar = a.getAttribute("data-avatar") || "";
      const aFile = a.getAttribute("data-file") || "";
      const bAvatar = b.getAttribute("data-avatar") || "";
      const bFile = b.getAttribute("data-file") || "";
      const aIdx = pinned.findIndex(
        (p) => p.avatar === aAvatar && p.chatFileName === aFile,
      );
      const bIdx = pinned.findIndex(
        (p) => p.avatar === bAvatar && p.chatFileName === bFile,
      );
      return aIdx - bIdx;
    });
  
    // 为置顶项添加标记样式和图钉图标（可点击取消置顶）
    pinnedElements.forEach((el) => {
      el.classList.add("cfm-pinned-chat");
      el.classList.remove("hidden"); // 置顶项始终可见
      // 在角色名后添加图钉图标
      if (!el.querySelector(".cfm-pin-indicator")) {
        const nameEl = el.querySelector(".characterName");
        if (nameEl) {
          const pinIcon = document.createElement("i");
          pinIcon.className = "fa-solid fa-thumbtack cfm-pin-indicator";
          pinIcon.title = "点击取消置顶";
          const elAvatar = el.getAttribute("data-avatar") || "";
          const elFile = el.getAttribute("data-file") || "";
          pinIcon.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            togglePinChat(elAvatar, elFile);
          });
          nameEl.parentNode.insertBefore(pinIcon, nameEl.nextSibling);
        }
      }
    });
  
    // 获取 showMoreChats 按钮（如果有的话）
    const showMoreBtn = recentList.querySelector("button.showMoreChats");
    // 获取 noRecentChat 提示（如果有的话）
    const noRecentChat = recentList.querySelector(".noRecentChat");
  
    // 重新排列 DOM：先置顶项，再非置顶项
    // 在 recentList 的最前面插入（在 noRecentChat 之后如果有的话）
    const insertBefore = noRecentChat
      ? noRecentChat.nextSibling
      : recentList.firstChild;
  
    // 先插入置顶项（按顺序）
    for (const el of pinnedElements) {
      recentList.insertBefore(el, insertBefore);
    }
    // 再插入非置顶项（保持原有顺序）
    for (const el of unpinnedElements) {
      recentList.insertBefore(el, showMoreBtn);
    }
  
    // 如果有不在当前列表中的置顶聊天（可能未被后端返回），
    // 需要通过 API 获取其信息并创建 DOM 元素插入
    const existingKeys = new Set(
      allChatItems.map(
        (el) =>
          (el.getAttribute("data-avatar") || "") +
          "::" +
          (el.getAttribute("data-file") || ""),
      ),
    );
    const missingPinned = pinned.filter((p) => {
      const key = p.avatar + "::" + p.chatFileName;
      return !existingKeys.has(key) && !cfmPendingMissingPinnedFetches.has(key);
    });
    if (missingPinned.length > 0) {
      fetchAndInsertMissingPinnedChats(recentList, missingPinned, insertBefore);
    }
  
    // 在置顶操作完成后应用备注显示
    requestAnimationFrame(() => runEnhanceRecentChatsWithNotes());
  }
  
  /**
   * 获取不在当前列表中的置顶聊天的信息并插入到 DOM
   */
  async function fetchAndInsertMissingPinnedChats(
    recentList,
    missingPinned,
    insertBefore,
  ) {
    const characters = getCharacters();
    const headers = getContext().getRequestHeaders();
  
    for (const pin of missingPinned) {
      const pinKey = pin.avatar + "::" + pin.chatFileName;
      cfmPendingMissingPinnedFetches.add(pinKey);
      try {
        const existingItem = recentList.querySelector(
          `.recentChat[data-avatar="${CSS.escape(pin.avatar)}"][data-file="${CSS.escape(pin.chatFileName)}"]`,
        );
        if (existingItem) continue;
  
        const char = characters.find((c) => c.avatar === pin.avatar);
        if (!char) continue; // 角色不存在，跳过
  
        // 获取聊天文件信息
        const resp = await fetch("/api/chats/get", {
          method: "POST",
          headers,
          body: JSON.stringify({
            avatar_url: pin.avatar,
            file_name: pin.chatFileName,
          }),
        });
        if (!resp.ok) continue;
        const chatData = await resp.json();
        if (!Array.isArray(chatData) || chatData.length === 0) continue;
  
        const lastMsg = chatData[chatData.length - 1];
        const mes = lastMsg?.mes || "";
        const sendDate = lastMsg?.send_date || "";
        const thumbUrl = getThumbnailUrl("avatar", char.avatar);
  
        // 格式化日期
        let dateShort = "";
        let dateLong = "";
        try {
          const { timestampToMoment } = getContext();
          if (timestampToMoment && sendDate) {
            const m = timestampToMoment(sendDate);
            dateShort = m.format("l");
            dateLong = m.format("LL LT");
          }
        } catch (_) {}
  
        // 创建 DOM 元素（模仿 welcomePanel.html 的结构）
        const chatItem = document.createElement("div");
        chatItem.className = "recentChat cfm-pinned-chat";
        chatItem.setAttribute("data-file", pin.chatFileName);
        chatItem.setAttribute("data-avatar", pin.avatar);
        chatItem.setAttribute("data-group", "");
        const eName = escapeHtml(char.name);
        const eChatFile = escapeHtml(pin.chatFileName);
        const eAvatar = escapeHtml(pin.avatar);
        const eMes = escapeHtml(mes.substring(0, 200));
        const eDateShort = escapeHtml(dateShort);
        const eDateLong = escapeHtml(dateLong);
        chatItem.innerHTML = `
          <div class="avatar" title="[Character] ${eName}&#10;File: ${eAvatar}">
            <img src="${thumbUrl}" alt="${eName}">
          </div>
          <div class="recentChatInfo">
            <div class="chatNameContainer">
              <div class="chatName" title="${eChatFile}.jsonl">
                <strong class="characterName">${eName}</strong>
                <i class="fa-solid fa-thumbtack cfm-pin-indicator" title="点击取消置顶"></i>
                <span>&ndash;</span>
                <span>${eChatFile}</span>
              </div>
              <small class="chatDate" title="${eDateLong}">${eDateShort}</small>
              <div class="chatActions">
                <button class="menu_button menu_button_icon renameChat" title="Rename chat">
                  <i class="fa-solid fa-pen-to-square fa-fw"></i>
                </button>
                <button class="menu_button menu_button_icon deleteChat" title="Delete chat">
                  <i class="fa-solid fa-trash fa-fw"></i>
                </button>
              </div>
            </div>
            <div class="chatMessageContainer">
              <div class="chatMessage" title="${eMes}">
                ${eMes}
              </div>
              <div class="chatStats">
                <div class="counterBlock">
                  <i class="fa-solid fa-comment fa-xs"></i>
                  <small>${chatData.length}</small>
                </div>
              </div>
            </div>
          </div>
        `;
  
        // 绑定图钉图标的取消置顶事件
        const pinIndicator = chatItem.querySelector(".cfm-pin-indicator");
        if (pinIndicator) {
          pinIndicator.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            togglePinChat(pin.avatar, pin.chatFileName);
          });
        }
  
        // 绑定点击事件
        chatItem.addEventListener("click", () => {
          openChatFile(pin.avatar, pin.chatFileName);
        });
  
        // 二次检查，避免异步请求返回期间该聊天已被其它重试或原生列表插入
        const duplicateItem = recentList.querySelector(
          `.recentChat[data-avatar="${CSS.escape(pin.avatar)}"][data-file="${CSS.escape(pin.chatFileName)}"]`,
        );
        if (duplicateItem) continue;
  
        // 在 insertBefore 之前插入（在其他置顶项之后）
        const existingPinned = recentList.querySelectorAll(".cfm-pinned-chat");
        const lastPinned = existingPinned[existingPinned.length - 1];
        if (lastPinned && lastPinned.nextSibling) {
          recentList.insertBefore(chatItem, lastPinned.nextSibling);
        } else {
          recentList.insertBefore(chatItem, insertBefore);
        }
      } catch (e) {
        console.warn("[CFM] 获取置顶聊天信息失败:", pin, e);
      } finally {
        cfmPendingMissingPinnedFetches.delete(pinKey);
      }
    }
    // 异步插入完成后应用备注显示
    requestAnimationFrame(() => runEnhanceRecentChatsWithNotes());
  }
  
  /**
   * 初始化 welcome-screen 置顶聊天 hook
   * 使用 MutationObserver 监听 #chat 容器，当 welcomePanel 被插入时自动应用置顶
   */
  function initPinnedChatHook() {
    const bindPinnedObserver = (chatEl) => {
      if (!chatEl || chatEl.dataset.cfmPinnedHookBound === "1") return;
      chatEl.dataset.cfmPinnedHookBound = "1";
  
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node.classList?.contains("welcomePanel") ||
                node.querySelector?.(".welcomePanel"))
            ) {
              // welcomePanel 被插入后，分阶段恢复置顶和备注
              scheduleWelcomeRecentChatRefresh();
              return;
            }
          }
        }
      });
  
      observer.observe(chatEl, { childList: true, subtree: false });
      // 如果当前已有 welcomePanel，立即开始分阶段恢复
      if (chatEl.querySelector(".welcomePanel")) {
        scheduleWelcomeRecentChatRefresh();
      }
    };
  
    const chatEl = document.getElementById("chat");
    if (chatEl) {
      bindPinnedObserver(chatEl);
      return;
    }
  
    const bindWhenChatReady = () => {
      const lateChatEl = document.getElementById("chat");
      if (!lateChatEl) return false;
      bindPinnedObserver(lateChatEl);
      return true;
    };
  
    if (bindWhenChatReady()) return;
  
    const rootObserver = new MutationObserver(() => {
      if (!bindWhenChatReady()) return;
      rootObserver.disconnect();
    });
  
    const startObserve = () => {
      if (!document.body) return;
      rootObserver.observe(document.body, { childList: true, subtree: true });
    };
  
    if (document.body) {
      startObserve();
    } else {
      document.addEventListener("DOMContentLoaded", startObserve, {
        once: true,
      });
    }
  }

  return {
    applyPinnedChatsToWelcomeScreen,
    fetchAndInsertMissingPinnedChats,
    getPinnedChats,
    initPinnedChatHook,
    isChatPinned,
    scheduleWelcomeRecentChatRefresh,
    setEnhanceRecentChatsWithNotesCallback,
    toggleChatPin,
    togglePinChat,
  };
}
