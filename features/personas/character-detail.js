// 角色卡详情层：承接角色卡详情字段编辑、头像替换、关联世界书展示与详情子面板渲染。

export function createCharacterDetailApiCore(deps) {
  const {
    $,
    window,
    document,
    FormData,
    cfmConfirm,
    cfmToastr,
    console,
    escapeHtml,
    fetch,
    getContext,
    getWiModuleSync,
    pickDetailAvatarFile,
    prepareDetailAvatarUpload,
    bustDetailThumbnailCache,
    getTextOffsetFromPoint,
    flashTextareaCaretSelection,
    revealTextareaCaret,
    rerenderCurrentView,
    setTimeout,
    clearTimeout,
    requestAnimationFrame,
  } = deps;

async function replaceCharacterDetailAvatar(charRow, char) {
    if (!char?.avatar) {
      cfmToastr.error("无法获取角色头像信息");
      return;
    }

    const file = await pickDetailAvatarFile();
    if (!file) return;

    const prepared = await prepareDetailAvatarUpload(file);
    if (!prepared?.file) return;

    const ctx = getContext();
    const formData = new FormData();
    formData.append("avatar", prepared.file);
    formData.append("avatar_url", char.avatar);

    let url = "/api/characters/edit-avatar";
    if (prepared.cropData !== undefined) {
      url += `?crop=${encodeURIComponent(JSON.stringify(prepared.cropData))}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: ctx.getRequestHeaders({ omitContentType: true }),
        body: formData,
        cache: "no-cache",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }

      await bustDetailThumbnailCache("avatar", char.avatar);
      if (typeof ctx.getCharacters === "function") {
        try {
          await ctx.getCharacters();
        } catch (e) {
          console.warn("[CFM] 刷新角色列表数据失败", e);
        }
      }
      cfmToastr.success("已更新角色头像");
      rerenderCurrentView();
    } catch (e) {
      console.error("[CFM] 更新角色头像失败:", e);
      cfmToastr.error("角色头像更新失败");
      if (charRow?.length) {
        renderCharacterDetailSubList(charRow, char);
        charRow.next(".cfm-char-detail-sublist").show();
      }
    }
  }



function getCharacterDetailFieldValue(char, field) {
    const dataValue = char?.data?.[field];
    if (dataValue !== undefined && dataValue !== null) return dataValue;

    const topLevelValue = char?.[field];
    if (topLevelValue !== undefined && topLevelValue !== null) {
      return topLevelValue;
    }

    if (!char?.json_data) return undefined;

    try {
      const jsonData =
        typeof char.json_data === "string"
          ? JSON.parse(char.json_data)
          : char.json_data;
      const jsonDataValue = jsonData?.data?.[field];
      if (jsonDataValue !== undefined && jsonDataValue !== null) {
        return jsonDataValue;
      }

      const jsonTopLevelValue = jsonData?.[field];
      if (jsonTopLevelValue !== undefined && jsonTopLevelValue !== null) {
        return jsonTopLevelValue;
      }
    } catch (parseErr) {
      console.debug("[CFM] 读取角色详情 json_data 失败:", parseErr);
    }

    return undefined;
  }



async function showCharacterDetailFieldPopup(char, field, options = {}) {
    const map = {
      description: {
        title: "编辑角色描述",
        label: "描述",
        placeholder: "输入角色描述，留空则清空",
        rows: 8,
      },
      personality: {
        title: "编辑角色性格",
        label: "性格",
        placeholder: "输入角色性格，留空则清空",
        rows: 8,
      },
      scenario: {
        title: "编辑角色场景",
        label: "场景",
        placeholder: "输入角色场景，留空则清空",
        rows: 8,
      },
      first_mes: {
        title: "编辑第一条消息",
        label: "第一条消息",
        placeholder: "输入第一条消息，留空则清空",
        rows: 8,
      },
      alt_greetings: {
        title: "编辑其它开场",
        label: "其它开场",
        placeholder: "输入开场白内容，留空则清空",
        rows: 8,
      },
      mes_example: {
        title: "编辑示例对话",
        label: "示例对话",
        placeholder: "输入示例对话，留空则清空",
        rows: 10,
      },
      creator_notes: {
        title: "编辑作者备注",
        label: "作者备注",
        placeholder: "输入作者备注，留空则清空",
        rows: 8,
      },
      system_prompt: {
        title: "编辑系统提示词",
        label: "系统提示词",
        placeholder: "输入系统提示词，留空则清空",
        rows: 8,
      },
      post_history_instructions: {
        title: "编辑历史后指令",
        label: "历史后指令",
        placeholder: "输入历史后指令，留空则清空",
        rows: 8,
      },
    };
    const meta = map[field];
    if (!meta || !char) return null;

    const normalizeGreetingItems = (input) => {
      const results = [];
      const pushValue = (value) => {
        if (typeof value === "string") {
          const text = value.trim();
          if (text) results.push(text);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(pushValue);
          return;
        }
        if (value && typeof value === "object") {
          [
            value.mes,
            value.message,
            value.text,
            value.content,
            value.value,
          ].forEach(pushValue);
        }
      };
      pushValue(input);
      return results;
    };

    const currentAlternateGreetings = normalizeGreetingItems(
      getCharacterDetailFieldValue(char, "alternate_greetings"),
    );
    let currentValue;
    if (field === "first_mes") {
      currentValue = String(
        getCharacterDetailFieldValue(char, "first_mes") || "",
      );
    } else if (field === "alt_greetings") {
      const altIndex = Math.max(char?.__cfmEditingGreetingIndex || 0, 0);
      currentValue = String(currentAlternateGreetings[altIndex] || "");
    } else {
      currentValue = String(getCharacterDetailFieldValue(char, field) || "");
    }
    const canAppendGreeting = field === "alt_greetings";
    const deleteButtonText = field === "alt_greetings" ? "删除" : "清空";
    const inputHtml =
      meta.rows > 1
        ? `<textarea class="cfm-edit-input" id="cfm-char-detail-input" rows="${meta.rows}" placeholder="${escapeHtml(meta.placeholder)}">${escapeHtml(currentValue)}</textarea>`
        : `<input type="text" class="cfm-edit-input" id="cfm-char-detail-input" value="${escapeHtml(currentValue)}" placeholder="${escapeHtml(meta.placeholder)}">`;

    const canMaximize = meta.rows > 1;
    const overlay = $(`
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup ${canMaximize ? "cfm-edit-popup-expandable" : ""}">
          <div class="cfm-edit-popup-title">${meta.title}</div>
          <div class="cfm-edit-popup-names"><div class="cfm-edit-name-item">${escapeHtml(char.name || char.avatar || "未知角色")}</div></div>
          <div class="cfm-edit-popup-field">
            ${
              canMaximize
                ? `<div class="cfm-edit-popup-field-header">
            <label for="cfm-char-detail-input">${meta.label}</label>
            <button type="button" class="cfm-edit-popup-maximize" title="最大化编辑窗口" aria-pressed="false">
              <i class="fa-solid fa-expand"></i>
            </button>
          </div>`
                : `<label for="cfm-char-detail-input">${meta.label}</label>`
            }
            ${inputHtml}
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${currentValue ? `<button class="cfm-btn cfm-edit-popup-clear">${deleteButtonText}</button>` : ""}
            ${canAppendGreeting ? '<button class="cfm-btn cfm-char-detail-append">新增</button>' : ""}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `);
    $("body").append(overlay);
    const popup = overlay.find(".cfm-edit-popup");
    const input = overlay.find("#cfm-char-detail-input");
    const maximizeBtn = overlay.find(".cfm-edit-popup-maximize");
    const mobileMaximizedLock = {
      cleanup: null,
      rect: null,
    };
    const clearMobileMaximizedLock = () => {
      if (typeof mobileMaximizedLock.cleanup === "function") {
        mobileMaximizedLock.cleanup();
      }
      mobileMaximizedLock.cleanup = null;
      mobileMaximizedLock.rect = null;
      popup.css({
        position: "",
        top: "",
        left: "",
        right: "",
        bottom: "",
        width: "",
        height: "",
        minHeight: "",
        maxHeight: "",
        transform: "",
        margin: "",
        zIndex: "",
      });
    };
    const updateMaximizeButton = () => {
      if (!maximizeBtn.length) return;
      const isMaximized = popup.hasClass("cfm-edit-popup-maximized");
      maximizeBtn.attr(
        "title",
        isMaximized ? "还原编辑窗口" : "最大化编辑窗口",
      );
      maximizeBtn.attr("aria-pressed", isMaximized ? "true" : "false");
      maximizeBtn
        .find("i")
        .toggleClass("fa-expand", !isMaximized)
        .toggleClass("fa-compress", isMaximized);
    };
    const isMobileViewport = () =>
      window.matchMedia?.("(max-width: 768px)")?.matches ||
      window.innerWidth <= 768;
    const settleMobileViewport = (callback) => {
      const visualViewport = window.visualViewport;
      let settled = false;
      let settleTimer = null;
      let fallbackTimer = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (settleTimer) clearTimeout(settleTimer);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        visualViewport?.removeEventListener("resize", handleViewportChange);
        visualViewport?.removeEventListener("scroll", handleViewportChange);
        callback();
      };
      const scheduleFinish = () => {
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(finish, 120);
      };
      const handleViewportChange = () => {
        scheduleFinish();
      };
      scheduleFinish();
      fallbackTimer = setTimeout(finish, 420);
      visualViewport?.addEventListener("resize", handleViewportChange);
      visualViewport?.addEventListener("scroll", handleViewportChange);
    };
    const syncMobileMaximizedLock = () => {
      clearMobileMaximizedLock();
      if (!canMaximize || !isMobileViewport()) return;
      const popupNode = popup[0];
      if (!popupNode) return;
      const visualViewport = window.visualViewport;
      const applyLockedRect = () => {
        if (!popupNode.isConnected || !isMobileViewport()) {
          return;
        }
        const nextRect = popupNode.getBoundingClientRect();
        const isMaximized = popup.hasClass("cfm-edit-popup-maximized");
        const viewportWidth = Math.max(
          document.documentElement?.clientWidth || 0,
          window.innerWidth || 0,
          visualViewport?.width || 0,
          nextRect.width,
        );
        const physicalViewportHeight = Math.round(
          (window.screen?.availHeight || window.screen?.height || 0) /
            Math.max(window.devicePixelRatio || 1, 1),
        );
        const viewportHeight = Math.max(
          document.documentElement?.clientHeight || 0,
          window.innerHeight || 0,
          physicalViewportHeight || 0,
          visualViewport?.height || 0,
          nextRect.height,
        );
        const safeWidth = Math.min(
          Math.max(nextRect.width, 280),
          Math.max(0, viewportWidth - 24),
        );
        const safeHeight = isMaximized
          ? Math.max(
              mobileMaximizedLock.rect?.height || 0,
              nextRect.height,
              Math.max(0, viewportHeight - 80),
            )
          : Math.max(mobileMaximizedLock.rect?.height || 0, nextRect.height);
        mobileMaximizedLock.rect = {
          top: Math.max(12, mobileMaximizedLock.rect?.top ?? nextRect.top),
          width: safeWidth,
          height: safeHeight,
        };
        popup.css({
          position: "fixed",
          top: `${mobileMaximizedLock.rect.top}px`,
          left: "50%",
          right: "auto",
          bottom: "auto",
          width: `${mobileMaximizedLock.rect.width}px`,
          height: `${mobileMaximizedLock.rect.height}px`,
          minHeight: `${mobileMaximizedLock.rect.height}px`,
          maxHeight: `${mobileMaximizedLock.rect.height}px`,
          transform: "translateX(-50%)",
          margin: "0",
          zIndex: "100001",
        });
      };
      applyLockedRect();
      requestAnimationFrame(applyLockedRect);
      const handleViewportChange = () => {
        requestAnimationFrame(applyLockedRect);
      };
      const handleOrientationChange = () => {
        mobileMaximizedLock.rect = null;
        clearMobileMaximizedLock();
        requestAnimationFrame(() => {
          if (!popupNode.isConnected) return;
          syncMobileMaximizedLock();
        });
      };
      visualViewport?.addEventListener("resize", handleViewportChange);
      visualViewport?.addEventListener("scroll", handleViewportChange);
      window.addEventListener("orientationchange", handleOrientationChange);
      mobileMaximizedLock.cleanup = () => {
        visualViewport?.removeEventListener("resize", handleViewportChange);
        visualViewport?.removeEventListener("scroll", handleViewportChange);
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange,
        );
      };
    };
    const caretIndex = Number.isFinite(options?.caretIndex)
      ? Math.max(0, Math.trunc(options.caretIndex))
      : null;
    const node = input[0];
    updateMaximizeButton();
    if (canMaximize) {
      syncMobileMaximizedLock();
    }
    input.trigger("focus");
    if (node && typeof node.selectionStart === "number") {
      const nextCaret = Math.min(
        caretIndex === null ? node.value.length : caretIndex,
        node.value.length,
      );
      node.selectionStart = node.selectionEnd = nextCaret;
      if (input.is("textarea") && caretIndex !== null) {
        setTimeout(() => {
          if (!node.isConnected) return;
          revealTextareaCaret(node, nextCaret);
          flashTextareaCaretSelection(node, nextCaret);
        }, 0);
      }
    }

    return new Promise((resolve) => {
      let overlayPressStarted = false;
      const openedAt = Date.now();
      const overlayCloseGuardMs = 650;
      const close = (result) => {
        clearMobileMaximizedLock();
        overlay.remove();
        resolve(result);
      };
      maximizeBtn.on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willMaximize = !popup.hasClass("cfm-edit-popup-maximized");
        const shouldResetKeyboardViewport =
          willMaximize &&
          isMobileViewport() &&
          document.activeElement === node &&
          !!window.visualViewport &&
          window.visualViewport.height < window.innerHeight - 80;
        const restoreCaret = (deferForMobileLock = false) => {
          const runRestore = () => {
            if (!overlay[0]?.isConnected) return;
            input.trigger("focus");
            if (
              node &&
              input.is("textarea") &&
              typeof node.selectionStart === "number"
            ) {
              const nextCaret = node.selectionStart;
              setTimeout(() => {
                if (!node.isConnected) return;
                revealTextareaCaret(node, nextCaret);
              }, 0);
            }
          };
          if (!deferForMobileLock) {
            runRestore();
            return;
          }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              runRestore();
            });
          });
        };
        const applyToggle = () => {
          popup.toggleClass("cfm-edit-popup-maximized");
          updateMaximizeButton();
          const shouldDeferFocusRestore =
            popup.hasClass("cfm-edit-popup-maximized") &&
            canMaximize &&
            isMobileViewport();
          if (canMaximize && isMobileViewport()) {
            requestAnimationFrame(() => syncMobileMaximizedLock());
          } else {
            clearMobileMaximizedLock();
          }
          restoreCaret(shouldDeferFocusRestore);
        };
        if (!shouldResetKeyboardViewport) {
          applyToggle();
          return;
        }
        if (node && typeof node.selectionStart === "number") {
          try {
            node.setSelectionRange(node.selectionStart, node.selectionEnd);
          } catch {}
        }
        input.trigger("blur");
        settleMobileViewport(() => {
          if (!overlay[0]?.isConnected) return;
          applyToggle();
        });
      });
      overlay.find(".cfm-edit-popup-cancel").on("click", () => close(null));
      overlay.on("mousedown touchstart", (e) => {
        const isOverlayTarget = $(e.target).hasClass("cfm-edit-popup-overlay");
        const elapsed = Date.now() - openedAt;
        const isPrimaryPress =
          e.type === "touchstart" ||
          typeof e.button !== "number" ||
          e.button === 0;
        overlayPressStarted =
          isOverlayTarget && elapsed >= overlayCloseGuardMs && isPrimaryPress;
      });
      overlay.on("click", (e) => {
        const clickedOverlay = $(e.target).hasClass("cfm-edit-popup-overlay");
        const elapsed = Date.now() - openedAt;
        if (
          clickedOverlay &&
          overlayPressStarted &&
          elapsed >= overlayCloseGuardMs
        )
          close(null);
        overlayPressStarted = false;
      });
      overlay.find(".cfm-edit-popup-clear").on("click", () => {
        const confirmMessage =
          field === "alt_greetings"
            ? "确认删除这条开场白吗？"
            : `确认清空${meta.label}吗？`;
        if (!cfmConfirm(confirmMessage)) return;
        close({
          action: field === "alt_greetings" ? "delete" : "clear",
          value: "",
        });
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        close({ action: "replace", value: String(input.val() || "").trim() });
      });
      overlay.find(".cfm-char-detail-append").on("click", () => {
        close({ action: "append", value: String(input.val() || "").trim() });
      });
      input.on("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close(null);
        }
        if (e.key === "Enter" && !input.is("textarea")) {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
      });
    });
  }



async function editCharacterDetailField(charRow, char, field, options = {}) {
    const result = await showCharacterDetailFieldPopup(char, field, options);
    if (result === null || !char?.avatar) return;
    if (!char.data) char.data = {};

    const normalizeGreetingItems = (input) => {
      const results = [];
      const pushValue = (value) => {
        if (typeof value === "string") {
          const text = value.trim();
          if (text) results.push(text);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(pushValue);
          return;
        }
        if (value && typeof value === "object") {
          [
            value.mes,
            value.message,
            value.text,
            value.content,
            value.value,
          ].forEach(pushValue);
        }
      };
      pushValue(input);
      return results;
    };

    const action =
      typeof result === "object" && result !== null ? result.action : "replace";
    const value =
      typeof result === "object" && result !== null ? result.value : result;
    const updateData = {};

    if (field === "first_mes") {
      // 第一条消息：只能清空或替换
      if (action === "clear") {
        char.data.first_mes = "";
        updateData.first_mes = "";
      } else {
        char.data.first_mes = value;
        updateData.first_mes = value;
      }
    } else if (field === "alt_greetings") {
      // 其它开场：新增、删除、替换
      const existingGreetings = normalizeGreetingItems(
        getCharacterDetailFieldValue(char, "alternate_greetings"),
      );
      const currentAltIndex = Math.max(
        charRow.data("cfmAltGreetingIndex") || 0,
        0,
      );

      if (action === "append") {
        const appendValue = String(value || "").trim();
        if (!appendValue) {
          cfmToastr.warning("新增开场白不能为空");
          return;
        }
        const nextGreetings = [...existingGreetings, appendValue];
        char.data.alternate_greetings = nextGreetings;
        updateData.alternate_greetings = nextGreetings;
      } else if (action === "delete") {
        const nextGreetings = existingGreetings.filter(
          (_, index) => index !== currentAltIndex,
        );
        char.data.alternate_greetings = nextGreetings;
        updateData.alternate_greetings = nextGreetings;
        charRow.data(
          "cfmAltGreetingIndex",
          Math.min(currentAltIndex, Math.max(nextGreetings.length - 1, 0)),
        );
      } else {
        // replace
        const nextGreetings = [...existingGreetings];
        nextGreetings[currentAltIndex] = value;
        char.data.alternate_greetings = nextGreetings;
        updateData.alternate_greetings = nextGreetings;
      }
    } else {
      char.data[field] = value;
      updateData[field] = value;
    }

    try {
      const headers = getContext().getRequestHeaders();
      // V2角色卡的字段同时存在于顶层和data层，需要两层都更新
      const topLevelSync = {};
      if ("first_mes" in updateData)
        topLevelSync.first_mes = updateData.first_mes;
      if ("alternate_greetings" in updateData)
        topLevelSync.alternate_greetings = updateData.alternate_greetings;
      if ("description" in updateData)
        topLevelSync.description = updateData.description;
      if ("personality" in updateData)
        topLevelSync.personality = updateData.personality;
      if ("scenario" in updateData) topLevelSync.scenario = updateData.scenario;
      if ("mes_example" in updateData)
        topLevelSync.mes_example = updateData.mes_example;
      if ("creator_notes" in updateData)
        topLevelSync.creator_notes = updateData.creator_notes;
      if ("system_prompt" in updateData)
        topLevelSync.system_prompt = updateData.system_prompt;
      if ("post_history_instructions" in updateData)
        topLevelSync.post_history_instructions =
          updateData.post_history_instructions;
      await fetch("/api/characters/merge-attributes", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          avatar: char.avatar,
          ...topLevelSync,
          data: updateData,
        }),
      });
      // 同步更新酒馆内存中角色对象的顶层字段
      for (const [k, v] of Object.entries(topLevelSync)) {
        char[k] = v;
      }
      // 刷新酒馆原生前端的角色数据缓存
      try {
        await getContext().getCharacters();
      } catch (_) {
        /* 非关键 */
      }

      // ── 同步聊天记录中的第一条消息（模拟酒馆原生行为） ──
      if (field === "first_mes" || field === "alt_greetings") {
        try {
          const ctx = getContext();
          const chatArr = ctx.chat;
          // 条件与酒馆原生 createOrEditCharacter 一致：
          // 非群组、聊天未被 tainted、聊天仅有0或1条角色消息
          const shouldSync =
            !ctx.groupId &&
            ctx.characterId !== undefined &&
            ctx.characterId !== null &&
            !ctx.chatMetadata?.tainted &&
            chatArr &&
            (chatArr.length === 0 ||
              (chatArr.length === 1 &&
                !chatArr[0].is_user &&
                !chatArr[0].is_system));
          if (shouldSync) {
            // 重建第一条消息
            const newFirstMes = char.data?.first_mes || char.first_mes || "";
            const altGreetings = char.data?.alternate_greetings || [];
            const charName = char.name || "";
            const newMessage = {
              name: charName,
              is_user: false,
              is_system: false,
              send_date:
                chatArr.length > 0 && chatArr[0].send_date
                  ? chatArr[0].send_date
                  : new Date().toISOString(),
              mes: newFirstMes,
              extra:
                chatArr.length > 0 && chatArr[0].extra ? chatArr[0].extra : {},
            };
            // 如果有多开场白，构建 swipes
            if (Array.isArray(altGreetings) && altGreetings.length > 0) {
              const swipes = [newFirstMes, ...altGreetings].filter(
                (s) => typeof s === "string",
              );
              if (!newFirstMes && swipes.length > 0) {
                swipes.shift();
                newMessage.mes = swipes[0] || "";
              }
              newMessage.swipe_id = 0;
              newMessage.swipes = swipes;
              newMessage.swipe_info = swipes.map(() => ({
                send_date: newMessage.send_date,
                gen_started: undefined,
                gen_finished: undefined,
                extra: {},
              }));
            }
            // 替换聊天数组
            chatArr.splice(0, chatArr.length, newMessage);
            // 刷新聊天 DOM
            try {
              await ctx.clearChat();
              await ctx.printMessages();
            } catch (_) {
              /* 非关键 */
            }
            // 保存聊天文件
            try {
              await ctx.saveChat();
            } catch (_) {
              /* 非关键 */
            }
          }
        } catch (syncErr) {
          console.warn("[CFM] 同步聊天记录首条消息时出错:", syncErr);
        }
      }

      if (field === "alt_greetings" && action === "append") {
        charRow.data(
          "cfmAltGreetingIndex",
          Math.max((char.data.alternate_greetings || []).length - 1, 0),
        );
        cfmToastr.success("已新增开场白");
      } else if (field === "alt_greetings" && action === "delete") {
        cfmToastr.success("已删除开场白");
      } else if (field === "first_mes" && action === "clear") {
        cfmToastr.success("已清空第一条消息");
      } else {
        cfmToastr.success("已更新角色设定");
      }
      renderCharacterDetailSubList(charRow, char);
      charRow.next(".cfm-char-detail-sublist").show();
    } catch (error) {
      console.error("[CFM] 保存角色设定失败:", error);
      cfmToastr.error("保存角色设定失败");
    }
  }



function renderCharacterDetailSubList(charRow, char) {
    charRow.next(".cfm-char-detail-sublist").remove();

    const normalizeGreetingItems = (input) => {
      const results = [];
      const pushValue = (value) => {
        if (typeof value === "string") {
          const text = value.trim();
          if (text) results.push(text);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(pushValue);
          return;
        }
        if (value && typeof value === "object") {
          [
            value.mes,
            value.message,
            value.text,
            value.content,
            value.value,
          ].forEach(pushValue);
        }
      };
      pushValue(input);
      return results;
    };

    const descriptionRaw = getCharacterDetailFieldValue(char, "description");
    const firstMesRaw = getCharacterDetailFieldValue(char, "first_mes");
    const alternateGreetingsRaw = getCharacterDetailFieldValue(
      char,
      "alternate_greetings",
    );
    const description =
      typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";
    const firstMes = typeof firstMesRaw === "string" ? firstMesRaw.trim() : "";
    const alternateGreetings = normalizeGreetingItems(alternateGreetingsRaw);

    const sectionHtml = (label, value, extraClass = "", field = "") => `
      <div class="cfm-persona-detail-section cfm-char-detail-section ${extraClass}">
        <div class="cfm-persona-detail-label">${label}${
          field
            ? `
          <div class="cfm-chat-actions">
            <div class="cfm-chat-action-btn cfm-char-detail-edit" data-field="${field}" title="编辑${label}"><i class="fa-solid fa-pen-to-square"></i></div>
          </div>`
            : ""
        }</div>
        <div class="cfm-persona-detail-value cfm-char-detail-value ${extraClass}"${field ? ` data-field="${field}"` : ""}>${value ? escapeHtml(value).replace(/\n/g, "<br>") : '<span class="cfm-persona-detail-empty">无</span>'}</div>
      </div>
    `;

    const subList = $(
      '<div class="cfm-chat-sublist cfm-char-detail-sublist"></div>',
    );
    const detailCard = $(
      '<div class="cfm-chat-toolbar cfm-persona-detail-card cfm-char-detail-card"></div>',
    );

    detailCard.append(`
      <div class="cfm-detail-avatar-action" style="display:flex;justify-content:flex-start;padding:0 0 8px 0;">
        <button type="button" class="cfm-btn cfm-char-detail-avatar-btn">
          <i class="fa-solid fa-image"></i> 修改图像
        </button>
      </div>
    `);

    // 关联世界书折叠区域
    {
      const linkedWorldBooks = [];
      // 主绑定世界书
      const primaryWorld = char?.data?.extensions?.world;
      if (primaryWorld) {
        linkedWorldBooks.push({ name: primaryWorld, type: "主绑定" });
      }
      // 内嵌世界书 (character_book)
      if (char?.data?.character_book) {
        const embBookName =
          char.data.character_book.name || `${char.name || "角色"}'s Lorebook`;
        const embEntries = char.data.character_book.entries;
        const embEntryCount = Array.isArray(embEntries)
          ? embEntries.length
          : embEntries
            ? Object.keys(embEntries).length
            : 0;
        linkedWorldBooks.push({
          name: embBookName,
          type: "内嵌",
          entryCount: embEntryCount,
        });
      }
      // 辅助世界书 (charLore)
      try {
        const wiMod = getWiModuleSync();
        const worldInfoObj = wiMod ? wiMod.world_info : null;
        if (worldInfoObj?.charLore && Array.isArray(worldInfoObj.charLore)) {
          const fileName = char?.avatar?.replace(/\.[^/.]+$/, "") ?? null;
          if (fileName) {
            const extraCharLore = worldInfoObj.charLore.find(
              (e) => e.name === fileName,
            );
            if (
              extraCharLore?.extraBooks &&
              Array.isArray(extraCharLore.extraBooks)
            ) {
              extraCharLore.extraBooks.forEach((b) => {
                linkedWorldBooks.push({ name: b, type: "辅助" });
              });
            }
          }
        }
      } catch (e) {
        console.warn("[CFM] 获取角色关联辅助世界书失败", e);
      }

      detailCard.append(`
        <div class="cfm-char-detail-worldbooks">
          <div class="cfm-char-detail-worldbooks-header">
            <i class="fa-solid fa-caret-right cfm-char-detail-worldbooks-arrow"></i>
            <i class="fa-solid fa-book" style="color:#a6e3a1;margin-right:4px;font-size:12px;"></i>
            <span>关联世界书</span>
            <span class="cfm-char-detail-worldbooks-count">${linkedWorldBooks.length}</span>
          </div>
          <div class="cfm-char-detail-worldbooks-body" style="display:none;">
            ${
              linkedWorldBooks.length > 0
                ? linkedWorldBooks
                    .map(
                      (wb) => `
                <div class="cfm-char-detail-worldbook-item">
                  <span class="cfm-char-detail-worldbook-type">${escapeHtml(wb.type)}</span>
                  <span class="cfm-char-detail-worldbook-name">${escapeHtml(wb.name)}</span>
                  ${wb.entryCount !== undefined ? `<span class="cfm-char-detail-worldbook-entries">${wb.entryCount} 条</span>` : ""}
                </div>
              `,
                    )
                    .join("")
                : '<div class="cfm-persona-detail-empty" style="padding:4px 8px;">无关联世界书</div>'
            }
          </div>
        </div>
      `);

      detailCard
        .find(".cfm-char-detail-worldbooks-header")
        .on("click", function () {
          const body = $(this).next(".cfm-char-detail-worldbooks-body");
          const arrow = $(this).find(".cfm-char-detail-worldbooks-arrow");
          body.slideToggle(150);
          arrow.toggleClass("fa-caret-right fa-caret-down");
        });
    }

    detailCard.append(sectionHtml("描述", description, "", "description"));

    // 第一条消息（主开场白）：只有编辑按钮，不能切换
    detailCard.append(
      sectionHtml("第一条消息", firstMes, "cfm-char-detail-block", "first_mes"),
    );

    // 其它开场（额外问候语）：可切换、编辑、新增、删除
    if (alternateGreetings.length > 0) {
      const safeAltIndex = Math.min(
        Math.max(charRow.data("cfmAltGreetingIndex") || 0, 0),
        alternateGreetings.length - 1,
      );
      const currentAltGreeting = alternateGreetings[safeAltIndex] || "";
      detailCard.append(`
        <div class="cfm-persona-detail-section cfm-char-detail-section cfm-char-detail-block">
          <div class="cfm-persona-detail-label">其它开场
            <div class="cfm-chat-actions">
              <div class="cfm-chat-action-btn cfm-char-detail-edit" data-field="alt_greetings" title="编辑其它开场"><i class="fa-solid fa-pen-to-square"></i></div>
              <div class="cfm-chat-action-btn cfm-char-greeting-nav" data-dir="prev" title="上一条开场白"><i class="fa-solid fa-caret-left"></i></div>
              <span class="cfm-char-detail-meta-item">${safeAltIndex + 1} / ${alternateGreetings.length}</span>
              <div class="cfm-chat-action-btn cfm-char-greeting-nav" data-dir="next" title="下一条开场白"><i class="fa-solid fa-caret-right"></i></div>
            </div>
          </div>
          <div class="cfm-persona-detail-value cfm-char-detail-value cfm-char-detail-block" data-field="alt_greetings">${currentAltGreeting ? escapeHtml(currentAltGreeting).replace(/\n/g, "<br>") : '<span class="cfm-persona-detail-empty">无</span>'}</div>
        </div>
      `);
    } else {
      // 没有其它开场时，显示空状态，仍可通过编辑按钮新增
      detailCard.append(
        sectionHtml("其它开场", "", "cfm-char-detail-block", "alt_greetings"),
      );
    }

    subList.append(detailCard);
    charRow.after(subList);

    // 其它开场的切换事件
    subList.find(".cfm-char-greeting-nav").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = $(e.currentTarget).data("dir");
      if (alternateGreetings.length === 0) return;
      const currentIndex = Math.min(
        Math.max(charRow.data("cfmAltGreetingIndex") || 0, 0),
        alternateGreetings.length - 1,
      );
      const nextIndex =
        dir === "prev"
          ? (currentIndex - 1 + alternateGreetings.length) %
            alternateGreetings.length
          : (currentIndex + 1) % alternateGreetings.length;
      charRow.data("cfmAltGreetingIndex", nextIndex);
      renderCharacterDetailSubList(charRow, char);
      charRow.next(".cfm-char-detail-sublist").show();
    });

    // 阻止详情子面板点击冒泡到外层统一点击逻辑
    subList.on("click touchend", (e) => {
      e.stopPropagation();
    });

    subList.on("touchstart", ".cfm-char-detail-avatar-btn", function (e) {
      const touch = e.originalEvent?.touches?.[0];
      if (touch) {
        $(this).data("cfmTouchStartX", touch.clientX);
        $(this).data("cfmTouchStartY", touch.clientY);
      }
    });
    subList.on(
      "click touchend",
      ".cfm-char-detail-avatar-btn",
      async function (e) {
        e.preventDefault();
        e.stopPropagation();
        const target = $(this);
        const now = Date.now();
        const lastTouchAt = Number(target.data("cfmCharAvatarTouchAt") || 0);
        if (e.type === "touchend") {
          target.data("cfmCharAvatarTouchAt", now);
          const touch = e.originalEvent?.changedTouches?.[0];
          if (touch) {
            const startX = Number(target.data("cfmTouchStartX") || 0);
            const startY = Number(target.data("cfmTouchStartY") || 0);
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);
            if (deltaX > 10 || deltaY > 10) {
              return;
            }
          }
        } else if (lastTouchAt && now - lastTouchAt < 500) {
          return;
        }
        if (target.prop("disabled")) return;
        target.prop("disabled", true);
        try {
          await replaceCharacterDetailAvatar(charRow, char);
        } finally {
          target.prop("disabled", false);
        }
      },
    );

    // 编辑按钮事件（委托 + 移动端防误触）
    subList.on("touchstart", ".cfm-char-detail-edit", function (e) {
      const touch = e.originalEvent?.touches?.[0];
      if (touch) {
        $(this).data("cfmTouchStartX", touch.clientX);
        $(this).data("cfmTouchStartY", touch.clientY);
      }
    });
    subList.on("click touchend", ".cfm-char-detail-edit", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      const target = $(this);
      const now = Date.now();
      const lastTouchAt = Number(target.data("cfmCharDetailEditTouchAt") || 0);
      if (e.type === "touchend") {
        target.data("cfmCharDetailEditTouchAt", now);
        const touch = e.originalEvent?.changedTouches?.[0];
        if (touch) {
          const startX = Number(target.data("cfmTouchStartX") || 0);
          const startY = Number(target.data("cfmTouchStartY") || 0);
          const deltaX = Math.abs(touch.clientX - startX);
          const deltaY = Math.abs(touch.clientY - startY);
          if (deltaX > 10 || deltaY > 10) {
            return;
          }
        }
      } else if (lastTouchAt && now - lastTouchAt < 500) {
        return;
      }

      const field = String(target.data("field") || "");
      if (!field) return;
      if (field === "alt_greetings") {
        char.__cfmEditingGreetingIndex = Math.max(
          charRow.data("cfmAltGreetingIndex") || 0,
          0,
        );
      } else {
        delete char.__cfmEditingGreetingIndex;
      }
      await editCharacterDetailField(charRow, char, field);
      delete char.__cfmEditingGreetingIndex;
    });

    const charDetailConfirmMap = {
      description: "确认编辑角色描述吗？",
      first_mes: "确认编辑第一条消息吗？",
      alt_greetings: "确认编辑其它开场吗？",
    };

    subList.on(
      "touchstart",
      ".cfm-char-detail-value[data-field]",
      function (e) {
        const touch = e.originalEvent?.touches?.[0];
        if (touch) {
          $(this).data("cfmTouchStartX", touch.clientX);
          $(this).data("cfmTouchStartY", touch.clientY);
        }
      },
    );
    subList.on(
      "click touchend",
      ".cfm-char-detail-value[data-field]",
      async function (e) {
        e.preventDefault();
        e.stopPropagation();
        const target = $(this);
        const now = Date.now();
        const lastTouchAt = Number(target.data("cfmCharDetailTouchAt") || 0);
        if (e.type === "touchend") {
          target.data("cfmCharDetailTouchAt", now);
          const touch = e.originalEvent?.changedTouches?.[0];
          if (touch) {
            const startX = Number(target.data("cfmTouchStartX") || 0);
            const startY = Number(target.data("cfmTouchStartY") || 0);
            const deltaX = Math.abs(touch.clientX - startX);
            const deltaY = Math.abs(touch.clientY - startY);
            if (deltaX > 10 || deltaY > 10) {
              return;
            }
          }
        } else if (lastTouchAt && now - lastTouchAt < 500) {
          return;
        }

        const field = String(target.data("field") || "");
        if (!field) return;
        if (
          !cfmConfirm(charDetailConfirmMap[field] || "确认编辑角色设定吗？")
        ) {
          return;
        }

        let fieldText = "";
        if (field === "description") {
          fieldText = String(
            getCharacterDetailFieldValue(char, "description") || "",
          );
        } else if (field === "first_mes") {
          fieldText = String(
            getCharacterDetailFieldValue(char, "first_mes") || "",
          );
        } else if (field === "alt_greetings") {
          const currentAltIndex = Math.max(
            charRow.data("cfmAltGreetingIndex") || 0,
            0,
          );
          fieldText = String(alternateGreetings[currentAltIndex] || "");
          char.__cfmEditingGreetingIndex = currentAltIndex;
        } else {
          return;
        }

        const clickedOffset = getTextOffsetFromPoint(this, e);
        await editCharacterDetailField(charRow, char, field, {
          caretIndex: Number.isFinite(clickedOffset)
            ? Math.max(0, Math.min(clickedOffset, fieldText.length))
            : fieldText.length,
        });
        delete char.__cfmEditingGreetingIndex;
      },
    );
  }



  return {
    replaceCharacterDetailAvatar,
    getCharacterDetailFieldValue,
    showCharacterDetailFieldPopup,
    editCharacterDetailField,
    renderCharacterDetailSubList,
  };
}
