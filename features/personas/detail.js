// Persona 详情层：承接 User/Persona 详情字段编辑、头像替换、绑定操作入口与详情子面板渲染。

export function createPersonaDetailApiCore(deps) {
  async function showPersonaDetailFieldPopup(persona, field, options = {}) {
    const map = {
      name: {
        title: "编辑User名称",
        label: "名称",
        placeholder: "输入User名称",
        rows: 1,
      },
      title: {
        title: "编辑User标题",
        label: "标题",
        placeholder: "输入标题，留空则清空",
        rows: 1,
      },
      description: {
        title: "编辑User具体设定",
        label: "具体设定",
        placeholder: "输入具体设定，留空则清空",
        rows: 8,
      },
    };
    const meta = map[field];
    if (!meta || !persona) return null;

    const entry = deps.ensurePersonaDescriptionEntry(persona.avatarId);
    const currentValue = String(
      field === "name" ? persona?.name || "" : entry?.[field] || "",
    );
    const inputHtml =
      meta.rows > 1
        ? `<textarea class="cfm-edit-input" id="cfm-persona-detail-input" rows="${meta.rows}" placeholder="${deps.escapeHtml(meta.placeholder)}">${deps.escapeHtml(currentValue)}</textarea>`
        : `<input type="text" class="cfm-edit-input" id="cfm-persona-detail-input" value="${deps.escapeHtml(currentValue)}" placeholder="${deps.escapeHtml(meta.placeholder)}">`;

    const canMaximize = meta.rows > 1;
    const overlay = deps.$(`
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup ${canMaximize ? "cfm-edit-popup-expandable" : ""}">
          <div class="cfm-edit-popup-title">${meta.title}</div>
          <div class="cfm-edit-popup-names"><div class="cfm-edit-name-item">${deps.escapeHtml(persona.name || persona.avatarId)}</div></div>
          <div class="cfm-edit-popup-field">
            ${
              canMaximize
                ? `<div class="cfm-edit-popup-field-header">
            <label for="cfm-persona-detail-input">${meta.label}</label>
            <button type="button" class="cfm-edit-popup-maximize" title="最大化编辑窗口" aria-pressed="false">
              <i class="fa-solid fa-expand"></i>
            </button>
          </div>`
                : `<label for="cfm-persona-detail-input">${meta.label}</label>`
            }
            ${inputHtml}
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            ${currentValue ? '<button class="cfm-btn cfm-edit-popup-clear">清空</button>' : ""}
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `);
    deps.$("body").append(overlay);
    const popup = overlay.find(".cfm-edit-popup");
    const input = overlay.find("#cfm-persona-detail-input");
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
      deps.window.matchMedia?.("(max-width: 768px)")?.matches ||
      deps.window.innerWidth <= 768;
    const settleMobileViewport = (callback) => {
      const visualViewport = deps.window.visualViewport;
      let settled = false;
      let settleTimer = null;
      let fallbackTimer = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (settleTimer) deps.clearTimeout(settleTimer);
        if (fallbackTimer) deps.clearTimeout(fallbackTimer);
        visualViewport?.removeEventListener("resize", handleViewportChange);
        visualViewport?.removeEventListener("scroll", handleViewportChange);
        callback();
      };
      const scheduleFinish = () => {
        if (settleTimer) deps.clearTimeout(settleTimer);
        settleTimer = deps.setTimeout(finish, 120);
      };
      const handleViewportChange = () => {
        scheduleFinish();
      };
      scheduleFinish();
      fallbackTimer = deps.setTimeout(finish, 420);
      visualViewport?.addEventListener("resize", handleViewportChange);
      visualViewport?.addEventListener("scroll", handleViewportChange);
    };
    const syncMobileMaximizedLock = () => {
      clearMobileMaximizedLock();
      if (!canMaximize || !isMobileViewport()) return;
      const popupNode = popup[0];
      if (!popupNode) return;
      const visualViewport = deps.window.visualViewport;
      const applyLockedRect = () => {
        if (!popupNode.isConnected || !isMobileViewport()) {
          return;
        }
        const nextRect = popupNode.getBoundingClientRect();
        const isMaximized = popup.hasClass("cfm-edit-popup-maximized");
        const viewportWidth = Math.max(
          deps.document.documentElement?.clientWidth || 0,
          deps.window.innerWidth || 0,
          visualViewport?.width || 0,
          nextRect.width,
        );
        const physicalViewportHeight = Math.round(
          (deps.window.screen?.availHeight || deps.window.screen?.height || 0) /
            Math.max(deps.window.devicePixelRatio || 1, 1),
        );
        const viewportHeight = Math.max(
          deps.document.documentElement?.clientHeight || 0,
          deps.window.innerHeight || 0,
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
      deps.requestAnimationFrame(applyLockedRect);
      const handleViewportChange = () => {
        deps.requestAnimationFrame(applyLockedRect);
      };
      const handleOrientationChange = () => {
        mobileMaximizedLock.rect = null;
        clearMobileMaximizedLock();
        deps.requestAnimationFrame(() => {
          if (!popupNode.isConnected) return;
          syncMobileMaximizedLock();
        });
      };
      visualViewport?.addEventListener("resize", handleViewportChange);
      visualViewport?.addEventListener("scroll", handleViewportChange);
      deps.window.addEventListener("orientationchange", handleOrientationChange);
      mobileMaximizedLock.cleanup = () => {
        visualViewport?.removeEventListener("resize", handleViewportChange);
        visualViewport?.removeEventListener("scroll", handleViewportChange);
        deps.window.removeEventListener(
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
        deps.setTimeout(() => {
          if (!node.isConnected) return;
          deps.revealTextareaCaret(node, nextCaret);
          deps.flashTextareaCaretSelection(node, nextCaret);
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
          deps.document.activeElement === node &&
          !!deps.window.visualViewport &&
          deps.window.visualViewport.height < deps.window.innerHeight - 80;
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
              deps.setTimeout(() => {
                if (!node.isConnected) return;
                deps.revealTextareaCaret(node, nextCaret);
              }, 0);
            }
          };
          if (!deferForMobileLock) {
            runRestore();
            return;
          }
          deps.requestAnimationFrame(() => {
            deps.requestAnimationFrame(() => {
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
            deps.requestAnimationFrame(() => syncMobileMaximizedLock());
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
        const isOverlayTarget = deps.$(e.target).hasClass("cfm-edit-popup-overlay");
        const elapsed = Date.now() - openedAt;
        const isPrimaryPress =
          e.type === "touchstart" ||
          typeof e.button !== "number" ||
          e.button === 0;
        overlayPressStarted =
          isOverlayTarget && elapsed >= overlayCloseGuardMs && isPrimaryPress;
      });
      overlay.on("click", (e) => {
        const clickedOverlay = deps.$(e.target).hasClass("cfm-edit-popup-overlay");
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
        if (!deps.cfmConfirm(`确认清空${meta.label}吗？`)) return;
        close("");
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        close(String(input.val() || "").trim());
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

  async function editPersonaDetailField(persona, field, options = {}) {
    const value = await showPersonaDetailFieldPopup(persona, field, options);
    if (value === null) return;

    const ctx = deps.getContext();
    const pu = ctx.powerUserSettings;
    if (!pu) {
      deps.cfmToastr.error("无法获取User设定数据");
      return;
    }

    if (field === "name") {
      if (!pu.personas) pu.personas = {};
      pu.personas[persona.avatarId] = value || "[未命名User]";
      deps.saveSettingsDebounced();
      deps.cfmToastr.success("已更新User名称");
      deps.refreshPersonaPanelView();
      deps.syncNativePersonaUI(persona.avatarId);
      return;
    }

    const entry = deps.ensurePersonaDescriptionEntry(persona.avatarId);
    if (!entry) {
      deps.cfmToastr.error("无法获取User设定数据");
      return;
    }
    entry[field] = value;
    deps.saveSettingsDebounced();
    deps.cfmToastr.success(
      field === "title" ? "已更新User标题" : "已更新User具体设定",
    );
    deps.refreshPersonaPanelView();
    deps.syncNativePersonaUI(persona.avatarId);
  }

  async function replacePersonaDetailAvatar(persona) {
    if (!persona?.avatarId) {
      deps.cfmToastr.error("无法获取User头像信息");
      return;
    }

    const file = await deps.pickDetailAvatarFile();
    if (!file) return;

    const prepared = await deps.prepareDetailAvatarUpload(file);
    if (!prepared?.file) return;

    const ctx = deps.getContext();
    const formData = new deps.FormData();
    formData.append("avatar", prepared.file);
    formData.append("overwrite_name", persona.avatarId);

    let url = "/api/avatars/upload";
    if (prepared.cropData !== undefined) {
      url += `?crop=${encodeURIComponent(JSON.stringify(prepared.cropData))}`;
    }

    try {
      const response = await deps.fetch(url, {
        method: "POST",
        headers: ctx.getRequestHeaders({ omitContentType: true }),
        body: formData,
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }

      await deps.bustDetailThumbnailCache("persona", persona.avatarId);
      deps.cfmToastr.success("已更新User头像");
      deps.refreshPersonaPanelView();
      deps.syncNativePersonaUI(persona.avatarId);
    } catch (e) {
      deps.console.error("[CFM] 更新User头像失败:", e);
      deps.cfmToastr.error("User头像更新失败");
    }
  }

  function renderPersonaDetailSubList(personaRow, persona) {
    personaRow.next(".cfm-chat-sublist").remove();

    const desc = persona?.description || "";
    const personaName = persona?.name || "User";
    const note = deps.getPersonaNote(persona.avatarId) || "";
    const bindStates = deps.getPersonaBindStates(persona);
    const characterBindHtml = deps.buildPersonaConnHtml(persona?.connections || []);
    const chatBindHtml = deps.buildPersonaChatBindHtml(persona.avatarId);
    const bindDetailHtml = [
      characterBindHtml ? `<div>${characterBindHtml}</div>` : "",
      chatBindHtml
        ? `<div style="margin-top:6px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;">${chatBindHtml}</div>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const subList = deps.$(
      '<div class="cfm-chat-sublist cfm-persona-sublist"></div>',
    );
    const detailCard = deps.$(
      '<div class="cfm-chat-toolbar cfm-persona-detail-card"></div>',
    );

    detailCard.append(`
      <div class="cfm-detail-avatar-action" style="display:flex;justify-content:flex-start;padding:0 0 8px 0;">
        <button type="button" class="cfm-btn cfm-persona-detail-avatar-btn">
          <i class="fa-solid fa-image"></i> 修改图像
        </button>
      </div>
    `);

    detailCard.append(`
      <div class="cfm-persona-detail-section">
        <div class="cfm-persona-detail-label">名称
          <div class="cfm-chat-actions">
            <div class="cfm-chat-action-btn cfm-persona-detail-edit" data-field="name" title="编辑名称"><i class="fa-solid fa-pen-to-square"></i></div>
          </div>
        </div>
        <div class="cfm-persona-detail-value">${deps.escapeHtml(personaName)}</div>
      </div>
    `);

    if (note) {
      detailCard.append(`
        <div class="cfm-persona-detail-section">
          <div class="cfm-persona-detail-label">备注</div>
          <div class="cfm-persona-detail-value">${deps.escapeHtml(note)}</div>
        </div>
      `);
    }

    detailCard.append(`
      <div class="cfm-persona-detail-section">
        <div class="cfm-persona-detail-label">绑定</div>
        <div class="cfm-persona-detail-tags cfm-persona-bind-links">
          <div class="menu_button menu_button_icon cfm-persona-bind-btn ${bindStates.default ? "locked" : ""}" data-bind-type="default" title="点击设为新聊天的默认 User；再次点击可取消默认绑定">
            <i class="icon fa-solid fa-crown fa-fw"></i>
            <span class="cfm-persona-bind-text">默认</span>
          </div>
          <div class="menu_button menu_button_icon cfm-persona-bind-btn ${bindStates.character ? "locked" : ""}" data-bind-type="character" title="点击将当前 User 绑定到当前角色；再次点击可取消角色绑定">
            <i class="icon fa-solid fa-${bindStates.character ? "lock" : "unlock"} fa-fw"></i>
            <span class="cfm-persona-bind-text">角色</span>
          </div>
          <div class="menu_button menu_button_icon cfm-persona-bind-btn ${bindStates.chat ? "locked" : ""}" data-bind-type="chat" title="点击将当前 User 绑定到当前聊天；再次点击可取消聊天绑定">
            <i class="icon fa-solid fa-${bindStates.chat ? "lock" : "unlock"} fa-fw"></i>
            <span class="cfm-persona-bind-text">聊天</span>
          </div>
        </div>
        <div class="cfm-persona-detail-value">${bindDetailHtml || '<span class="cfm-persona-detail-empty">无</span>'}</div>
      </div>
    `);

    const personaToolActionHtml = deps.hasNativePersonaToolEntry()
      ? '<div class="cfm-chat-action-btn cfm-persona-detail-tool" title="打开设定生成器"><i class="fa-solid fa-wand-magic-sparkles"></i></div>'
      : "";
    detailCard.append(`
      <div class="cfm-persona-detail-section">
        <div class="cfm-persona-detail-label">具体设定
          <div class="cfm-chat-actions">
            <div class="cfm-chat-action-btn cfm-persona-detail-edit" data-field="description" title="编辑具体设定"><i class="fa-solid fa-pen-to-square"></i></div>
            ${personaToolActionHtml}
          </div>
        </div>
        <div class="cfm-persona-detail-value cfm-persona-detail-description">${desc ? deps.escapeHtml(desc).replace(/\n/g, "<br>") : '<span class="cfm-persona-detail-empty">无</span>'}</div>
      </div>
    `);

    subList.append(detailCard);
    personaRow.after(subList);

    subList.on("touchstart", ".cfm-persona-detail-avatar-btn", function (e) {
      const touch = e.originalEvent?.touches?.[0];
      if (touch) {
        deps.$(this).data("cfmTouchStartX", touch.clientX);
        deps.$(this).data("cfmTouchStartY", touch.clientY);
      }
    });
    subList.on(
      "click touchend",
      ".cfm-persona-detail-avatar-btn",
      async function (e) {
        e.preventDefault();
        e.stopPropagation();
        const target = deps.$(this);
        const now = Date.now();
        const lastTouchAt = Number(target.data("cfmPersonaAvatarTouchAt") || 0);
        if (e.type === "touchend") {
          target.data("cfmPersonaAvatarTouchAt", now);
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
          await replacePersonaDetailAvatar(persona);
        } finally {
          target.prop("disabled", false);
        }
      },
    );

    subList.find(".cfm-persona-detail-edit").on("click touchend", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const field = deps.$(e.currentTarget).data("field");
      await editPersonaDetailField(persona, field);
    });

    subList.find(".cfm-persona-detail-tool").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      deps.triggerNativePersonaTool(persona);
    });

    subList
      .find(".cfm-persona-detail-description")
      .on("touchstart", function (e) {
        const touch = e.originalEvent?.touches?.[0];
        if (touch) {
          deps.$(this).data("cfmTouchStartX", touch.clientX);
          deps.$(this).data("cfmTouchStartY", touch.clientY);
        }
      })
      .on("click touchend", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = deps.$(e.currentTarget);
        const now = Date.now();
        const lastTouchAt = Number(target.data("cfmPersonaDescTouchAt") || 0);
        if (e.type === "touchend") {
          target.data("cfmPersonaDescTouchAt", now);
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

        if (!deps.cfmConfirm("确认编辑Uesr设定吗？")) {
          return;
        }

        const descText = String(persona?.description || "");
        const clickedOffset = deps.getTextOffsetFromPoint(e.currentTarget, e);
        await editPersonaDetailField(persona, "description", {
          caretIndex: Number.isFinite(clickedOffset)
            ? clickedOffset
            : descText.length,
        });
      });

    subList.find(".cfm-persona-bind-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const bindType = deps.$(e.currentTarget).data("bindType");
      deps.triggerNativePersonaBind(persona, bindType);
    });
  }

  return {
    showPersonaDetailFieldPopup,
    editPersonaDetailField,
    replacePersonaDetailAvatar,
    renderPersonaDetailSubList,
  };
}
