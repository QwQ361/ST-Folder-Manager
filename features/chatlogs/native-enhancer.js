// 聊天记录原生界面增强层：承接对 SillyTavern 原生聊天管理弹窗与 welcome-screen 最近聊天区域的 DOM 增强，对应老代码中的原生聊天弹窗备注/置顶按钮注入、最近聊天备注显示，以及相关 MutationObserver hook 逻辑。

export function createChatlogNativeEnhancerApiCore(deps) {
  const {
    Node,
    MutationObserver,
    document,
    getCurrentCharAvatar,
    initChatNotes,
    isChatPinned,
    requestAnimationFrame,
    saveChatNotes,
    showChatNotePopup,
    state,
    togglePinChat,
  } = deps;

  // ==================== 增强原生聊天管理弹窗 & 最近聊天显示备注 ====================

  /**
   * 增强酒馆原生「管理聊天记录」弹窗（#shadow_select_chat_popup）
   * 在每条聊天记录上显示用户通过本插件添加的备注，并支持在原生弹窗中编辑备注。
   * 使用 MutationObserver 监听 #select_chat_div 的子元素变化。
   */
  function setupNativeChatPopupEnhancer() {
    const bindSelectChatDiv = (selectChatDiv) => {
      if (!selectChatDiv || selectChatDiv.dataset.cfmNativeChatEnhancerBound === "1") {
        return false;
      }
      selectChatDiv.dataset.cfmNativeChatEnhancerBound = "1";

      const observer = new MutationObserver(() => {
        // 延迟一帧确保 DOM 已完成渲染
        requestAnimationFrame(() => enhanceNativeChatPopup());
      });

      observer.observe(selectChatDiv, { childList: true, subtree: true });
      requestAnimationFrame(() => enhanceNativeChatPopup());
      return true;
    };

    if (bindSelectChatDiv(document.getElementById("select_chat_div"))) return;

    const rootObserver = new MutationObserver(() => {
      if (bindSelectChatDiv(document.getElementById("select_chat_div"))) {
        rootObserver.disconnect();
      }
    });

    const startObserve = () => {
      if (!document.body) return;
      rootObserver.observe(document.body, { childList: true, subtree: true });
      if (bindSelectChatDiv(document.getElementById("select_chat_div"))) {
        rootObserver.disconnect();
      }
    };

    if (document.body) {
      startObserve();
    } else {
      document.addEventListener("DOMContentLoaded", startObserve, { once: true });
    }
  }

  /**
   * 对原生聊天管理弹窗中的聊天记录列表注入备注信息
   */
  function enhanceNativeChatPopup() {
    // 确保备注数据已加载
    if (!state.cfmChatNotes || Object.keys(state.cfmChatNotes).length === 0) {
      initChatNotes();
    }

    const avatar = getCurrentCharAvatar();

    const wrappers = document.querySelectorAll(
      "#select_chat_div .select_chat_block_wrapper",
    );
    if (!wrappers.length) return;

    wrappers.forEach((wrapper) => {
      // 避免重复处理
      if (wrapper.classList.contains("cfm-native-chat-enhanced")) return;
      wrapper.classList.add("cfm-native-chat-enhanced");

      const block = wrapper.querySelector(".select_chat_block");
      if (!block) return;

      const fileNameFull = block.getAttribute("file_name") || "";
      const chatName = fileNameFull.replace(".jsonl", "");
      const note = state.cfmChatNotes[chatName];
      const pinned = avatar ? isChatPinned(avatar, chatName) : false;

      // 如果已置顶，添加置顶标记样式
      if (pinned) {
        wrapper.classList.add("cfm-native-chat-pinned");
      }

      if (note) {
        // 在预览消息上方添加备注内容
        const mesEl = wrapper.querySelector(".select_chat_block_mes");
        if (
          mesEl &&
          !mesEl.previousElementSibling?.classList?.contains(
            "cfm-native-chat-note-line",
          )
        ) {
          const noteLine = document.createElement("div");
          noteLine.className = "cfm-native-chat-note-line";
          noteLine.textContent = "📝 " + note;
          noteLine.title = "备注: " + note;
          mesEl.parentNode.insertBefore(noteLine, mesEl);
        }
      }

      // 添加置顶按钮和备注编辑按钮（在操作按钮区域）
      const actionsContainer = wrapper.querySelector(
        ".flex-container.gap10px:last-child",
      );
      if (
        actionsContainer &&
        !actionsContainer.querySelector(".cfm-native-chat-pin-btn")
      ) {
        // 添加置顶按钮
        if (avatar) {
          const pinBtn = document.createElement("div");
          pinBtn.className =
            "cfm-native-chat-pin-btn opacity50p hoverglow fa-solid fa-thumbtack" +
            (pinned ? " cfm-native-chat-pinned" : "");
          pinBtn.title = pinned ? "取消置顶" : "置顶到最近聊天";
          pinBtn.style.cursor = "pointer";
          actionsContainer.insertBefore(pinBtn, actionsContainer.firstChild);

          pinBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const nowPinned = togglePinChat(avatar, chatName);
            // 刷新弹窗内容：移除所有增强标记，然后重新处理
            document
              .querySelectorAll("#select_chat_div .cfm-native-chat-enhanced")
              .forEach((w) => {
                w.classList.remove("cfm-native-chat-enhanced");
                w.classList.remove("cfm-native-chat-pinned");
                w.querySelectorAll(
                  ".cfm-native-chat-note-line, .cfm-native-chat-note-edit-btn, .cfm-native-chat-pin-btn",
                ).forEach((el) => el.remove());
              });
            enhanceNativeChatPopup();
          });
        }

        // 添加备注编辑按钮
        const noteEditBtn = document.createElement("div");
        noteEditBtn.className =
          "cfm-native-chat-note-edit-btn opacity50p hoverglow fa-solid fa-pen-to-square";
        noteEditBtn.title = note ? "编辑备注" : "添加备注";
        noteEditBtn.style.cursor = "pointer";
        // 插入到置顶按钮之后（或第一个按钮之前）
        const pinBtnExisting = actionsContainer.querySelector(
          ".cfm-native-chat-pin-btn",
        );
        if (pinBtnExisting) {
          pinBtnExisting.insertAdjacentElement("afterend", noteEditBtn);
        } else {
          actionsContainer.insertBefore(
            noteEditBtn,
            actionsContainer.firstChild,
          );
        }

        noteEditBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const currentNote = state.cfmChatNotes[chatName] || "";
          const newNote = await showChatNotePopup(chatName, currentNote);
          if (newNote == null) return; // 取消
          if (newNote === "") {
            delete state.cfmChatNotes[chatName];
          } else {
            state.cfmChatNotes[chatName] = newNote;
          }
          saveChatNotes();
          // 刷新弹窗内容：移除所有增强标记和已注入的元素，然后重新处理
          document
            .querySelectorAll("#select_chat_div .cfm-native-chat-enhanced")
            .forEach((w) => {
              w.classList.remove("cfm-native-chat-enhanced");
              w.classList.remove("cfm-native-chat-pinned");
              w.querySelectorAll(
                ".cfm-native-chat-note-line, .cfm-native-chat-note-edit-btn, .cfm-native-chat-pin-btn",
              ).forEach((el) => el.remove());
            });
          enhanceNativeChatPopup();
        });
      }
    });
  }

  /**
   * 增强 welcome-screen 最近聊天列表：显示备注
   * 在 applyPinnedChatsToWelcomeScreen 之后调用，或通过 MutationObserver 自动触发
   */
  function enhanceRecentChatsWithNotes() {
    // 确保备注数据已加载
    if (!state.cfmChatNotes || Object.keys(state.cfmChatNotes).length === 0) {
      initChatNotes();
    }

    const chatEl = document.getElementById("chat");
    if (!chatEl) return;
    const welcomePanel = chatEl.querySelector(".welcomePanel");
    if (!welcomePanel) return;
    const recentList = welcomePanel.querySelector(".recentChatList");
    if (!recentList) return;

    const chatItems = recentList.querySelectorAll(".recentChat");
    chatItems.forEach((item) => {
      // 避免重复处理
      if (item.classList.contains("cfm-recent-chat-enhanced")) return;
      item.classList.add("cfm-recent-chat-enhanced");

      const chatFileName = item.getAttribute("data-file") || "";
      if (!chatFileName) return;

      const note = state.cfmChatNotes[chatFileName];
      if (!note) return;

      // 在 chatNameContainer 下方、chatMessageContainer 上方插入备注行
      const chatInfoEl = item.querySelector(".recentChatInfo");
      if (!chatInfoEl) return;

      const msgContainer = chatInfoEl.querySelector(".chatMessageContainer");
      if (!msgContainer) return;

      // 检查是否已有备注行
      if (chatInfoEl.querySelector(".cfm-recent-chat-note")) return;

      const noteDiv = document.createElement("div");
      noteDiv.className = "cfm-recent-chat-note";
      noteDiv.textContent = "📝 " + note;
      noteDiv.title = "备注: " + note;
      chatInfoEl.insertBefore(noteDiv, msgContainer);
    });
  }

  /**
   * 初始化 welcome-screen 备注显示 hook
   * 扩展 initPinnedChatHook 的 MutationObserver，当 welcomePanel 出现时也应用备注
   */
  function initRecentChatNotesHook() {
    const chatEl = document.getElementById("chat");
    if (!chatEl) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node.classList?.contains("welcomePanel") ||
              node.querySelector?.(".welcomePanel"))
          ) {
            // welcomePanel 被插入，延迟一帧应用备注
            requestAnimationFrame(() => enhanceRecentChatsWithNotes());
            return;
          }
        }
      }
    });

    observer.observe(chatEl, { childList: true, subtree: true });
    // 如果当前已有 welcomePanel，立即应用
    if (chatEl.querySelector(".welcomePanel")) {
      requestAnimationFrame(() => enhanceRecentChatsWithNotes());
    }
  }

  /**
   * 导入聊天记录文件
   * @param {string} avatar - 角色的 avatar 文件名
   * @param {FileList} files - 要导入的文件列表
   */

  return {
    enhanceNativeChatPopup,
    enhanceRecentChatsWithNotes,
    initRecentChatNotesHook,
    setupNativeChatPopupEnhancer,
  };
}
