export function cfmIsTouchDeviceCore(deps = {}) {
  const win = deps.window || globalThis.window;
  const nav = deps.navigator || globalThis.navigator;
  return "ontouchstart" in win || Number(nav?.maxTouchPoints || 0) > 0;
}

export function recordTouchTapStartCore(e, prefix = "cfmTouchTap", deps = {}) {
  const jq = deps.$ || globalThis.$;
  const touch = e.originalEvent?.touches?.[0];
  if (!touch) return;
  const target = jq(e.currentTarget);
  target.data(`${prefix}StartX`, touch.clientX);
  target.data(`${prefix}StartY`, touch.clientY);
}

export function shouldIgnoreTouchTapAfterMoveCore(
  e,
  { prefix = "cfmTouchTap", moveThreshold = 10, clickSuppressMs = 500 } = {},
  deps = {},
) {
  const jq = deps.$ || globalThis.$;
  const nowFn = deps.now || Date.now;
  const eventType = e?.type || "";
  const target = jq(e.currentTarget);
  const now = nowFn();
  const lastTouchAt = Number(target.data(`${prefix}LastTouchAt`) || 0);

  if (eventType === "touchend") {
    target.data(`${prefix}LastTouchAt`, now);
    const touch = e.originalEvent?.changedTouches?.[0];
    if (touch) {
      const startX = Number(target.data(`${prefix}StartX`));
      const startY = Number(target.data(`${prefix}StartY`));
      if (Number.isFinite(startX) && Number.isFinite(startY)) {
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
          return true;
        }
      }
    }
    return false;
  }

  return (
    eventType === "click" &&
    lastTouchAt &&
    now - lastTouchAt < clickSuppressMs
  );
}

export function bindTouchSafeTapCore(target, handler, options = {}, deps = {}) {
  const jq = deps.$ || globalThis.$;
  const jqClass = deps.jQuery || globalThis.jQuery;
  const recordTouchTapStart =
    deps.recordTouchTapStart ||
    ((event, prefix) => recordTouchTapStartCore(event, prefix, deps));
  const shouldIgnoreTouchTapAfterMove =
    deps.shouldIgnoreTouchTapAfterMove ||
    ((event, tapOptions) =>
      shouldIgnoreTouchTapAfterMoveCore(event, tapOptions, deps));

  const $target = target instanceof jqClass ? target : jq(target);
  if (!$target.length || typeof handler !== "function") return $target;

  const tapOptions = {
    prefix: options.prefix || "cfmTouchTap",
    moveThreshold: options.moveThreshold ?? 10,
    clickSuppressMs: options.clickSuppressMs ?? 500,
  };

  $target.on("touchstart", function (e) {
    recordTouchTapStart(e, tapOptions.prefix);
  });

  $target.on("click touchend", function (e) {
    if (shouldIgnoreTouchTapAfterMove(e, tapOptions)) return;
    if (options.preventDefault !== false) e.preventDefault();
    if (options.stopPropagation !== false) e.stopPropagation();
    return handler.call(this, e);
  });

  return $target;
}

export function createMobileTouchTapGuardController(deps = {}) {
  const win = deps.window || globalThis.window;
  const doc = deps.document || globalThis.document;
  const nav = deps.navigator || globalThis.navigator;
  const elementClass = deps.Element || globalThis.Element;
  const nowFn = deps.now || Date.now;
  const state = deps.state || new WeakMap();

  let initialized = false;

  function setup() {
    const isTouchDevice =
      typeof win !== "undefined" &&
      ("ontouchstart" in win ||
        Number(nav?.maxTouchPoints || 0) > 0 ||
        Number(nav?.msMaxTouchPoints || 0) > 0);
    if (!isTouchDevice || initialized) return;
    initialized = true;

    const protectedSelector = [
      ".cfm-row-star",
      ".cfm-row-edit-btn",
      ".cfm-row-note-btn",
      ".cfm-row-rename-btn",
      ".cfm-row-copy-btn",
      ".cfm-regex-edit-btn",
      ".cfm-row-bglink-btn",
      ".cfm-row-target-btn",
      ".cfm-wi-toggle",
      ".cfm-tnode-rename",
      ".cfm-tnode-arrow",
      ".cfm-qr-expand-arrow",
      ".cfm-chat-toggle",
      ".cfm-regex-toggle",
      ".cfm-char-detail-toggle",
      ".cfm-preset-detail-toggle",
      ".cfm-persona-toggle",
      ".cfm-persona-bind-btn",
      ".cfm-chat-action-btn",
      ".cfm-wi-preset-bind",
      ".cfm-wi-preset-bind-toggle",
      ".cfm-wi-bind-remove",
      ".cfm-user-preset-action-btn",
    ].join(", ");
    const moveThreshold = 6;
    const clickSuppressMs = 500;
    let activeTouch = null;

    const getGuardTarget = (target) => {
      if (!(target instanceof elementClass)) return null;
      return target.closest(protectedSelector);
    };

    const getTouchPoint = (ev) =>
      ev.changedTouches?.[0] || ev.touches?.[0] || null;

    const getScrollableAncestor = (el) => {
      let node = el instanceof elementClass ? el.parentElement : null;
      while (
        node &&
        node !== doc.body &&
        node !== doc.documentElement
      ) {
        const style = win.getComputedStyle(node);
        const overflowY = style?.overflowY || "";
        const overflowX = style?.overflowX || "";
        const canScrollY =
          /(auto|scroll|overlay)/.test(overflowY) &&
          node.scrollHeight > node.clientHeight + 1;
        const canScrollX =
          /(auto|scroll|overlay)/.test(overflowX) &&
          node.scrollWidth > node.clientWidth + 1;
        if (canScrollY || canScrollX) return node;
        node = node.parentElement;
      }
      return doc.scrollingElement || doc.documentElement || doc.body;
    };

    const stopEvent = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === "function") {
        ev.stopImmediatePropagation();
      }
    };

    const markSuppressed = (el) => {
      if (!el) return;
      state.set(el, { lastTouchAt: nowFn() });
    };

    doc.addEventListener(
      "touchstart",
      (ev) => {
        const el = getGuardTarget(ev.target);
        if (!el) {
          activeTouch = null;
          return;
        }
        const touch = getTouchPoint(ev);
        if (!touch) return;
        const scrollEl = getScrollableAncestor(el);
        activeTouch = {
          el,
          startX: touch.clientX,
          startY: touch.clientY,
          moved: false,
          identifier: touch.identifier,
          scrollEl,
          startScrollTop: scrollEl?.scrollTop || 0,
          startScrollLeft: scrollEl?.scrollLeft || 0,
        };
      },
      { capture: true, passive: true },
    );

    doc.addEventListener(
      "touchmove",
      (ev) => {
        if (!activeTouch) return;
        const touchList = Array.from(ev.touches || []);
        const touch =
          touchList.find((item) => item.identifier === activeTouch.identifier) ||
          getTouchPoint(ev);
        if (!touch) return;
        const deltaX = Math.abs(touch.clientX - activeTouch.startX);
        const deltaY = Math.abs(touch.clientY - activeTouch.startY);
        const scrollDeltaY = Math.abs(
          (activeTouch.scrollEl?.scrollTop || 0) - activeTouch.startScrollTop,
        );
        const scrollDeltaX = Math.abs(
          (activeTouch.scrollEl?.scrollLeft || 0) - activeTouch.startScrollLeft,
        );
        if (
          deltaX > moveThreshold ||
          deltaY > moveThreshold ||
          scrollDeltaX > 0 ||
          scrollDeltaY > 0
        ) {
          activeTouch.moved = true;
        }
      },
      { capture: true, passive: true },
    );

    doc.addEventListener(
      "touchend",
      (ev) => {
        const touch = activeTouch ? getTouchPoint(ev) : null;
        if (activeTouch) {
          const deltaX = touch ? Math.abs(touch.clientX - activeTouch.startX) : 0;
          const deltaY = touch ? Math.abs(touch.clientY - activeTouch.startY) : 0;
          const scrollDeltaY = Math.abs(
            (activeTouch.scrollEl?.scrollTop || 0) - activeTouch.startScrollTop,
          );
          const scrollDeltaX = Math.abs(
            (activeTouch.scrollEl?.scrollLeft || 0) -
              activeTouch.startScrollLeft,
          );
          if (
            deltaX > moveThreshold ||
            deltaY > moveThreshold ||
            scrollDeltaX > 0 ||
            scrollDeltaY > 0
          ) {
            activeTouch.moved = true;
          }
        }

        if (activeTouch?.moved) {
          markSuppressed(activeTouch.el);
          stopEvent(ev);
        }
        activeTouch = null;
      },
      { capture: true, passive: false },
    );

    doc.addEventListener(
      "touchcancel",
      () => {
        activeTouch = null;
      },
      { capture: true, passive: true },
    );

    doc.addEventListener(
      "click",
      (ev) => {
        const el = getGuardTarget(ev.target);
        if (!el) return;
        const item = state.get(el);
        if (!item?.lastTouchAt) return;
        if (nowFn() - item.lastTouchAt >= clickSuppressMs) return;
        stopEvent(ev);
      },
      true,
    );
  }

  return {
    setup,
    isInitialized: () => initialized,
    state,
  };
}

// ==================== 移动端触摸拖拽管理器 ====================
// 长按 500ms 启动拖拽，拖动幽灵元素，松手在目标上执行 drop 逻辑。
export function createTouchDragMgrCore(deps = {}) {
  const jq = deps.$ || globalThis.$;
  const jqClass = deps.jQuery || globalThis.jQuery;
  const doc = deps.document || globalThis.document;
  const nav = deps.navigator || globalThis.navigator;
  const getConfig = deps.getConfig;
  const wouldCreateCycle = deps.wouldCreateCycle;
  const reorderFolder = deps.reorderFolder;
  const cfmToastr = deps.cfmToastr;
  const getTagName = deps.getTagName;
  const sortFolders = deps.sortFolders;
  const getChildFolders = deps.getChildFolders;
  const renderLeftTree = deps.renderLeftTree;
  const renderRightPane = deps.renderRightPane;
  const getSelectedTreeNode = deps.getSelectedTreeNode;
  const removeCharFromAllFolders = deps.removeCharFromAllFolders;
  const handleCharDropToFolder = deps.handleCharDropToFolder;
  const getCfmCopyMode = deps.getCfmCopyMode;
  const clearMultiSelect = deps.clearMultiSelect;
  const getResFolderTree = deps.getResFolderTree;
  const wouldCreateResCycle = deps.wouldCreateResCycle;
  const reorderResFolder = deps.reorderResFolder;
  const sortResFolders = deps.sortResFolders;
  const getResChildFolders = deps.getResChildFolders;
  const renderPresetsView = deps.renderPresetsView;
  const renderWorldInfoView = deps.renderWorldInfoView;
  const renderThemesView = deps.renderThemesView;
  const renderBackgroundsView = deps.renderBackgroundsView;
  const renderPersonasView = deps.renderPersonasView;
  const renderQRView = deps.renderQRView;
  const getSelectedPresetFolder = deps.getSelectedPresetFolder;
  const getSelectedWorldInfoFolder = deps.getSelectedWorldInfoFolder;
  const getSelectedThemeFolder = deps.getSelectedThemeFolder;
  const getSelectedBgFolder = deps.getSelectedBgFolder;
  const getSelectedPersonaFolder = deps.getSelectedPersonaFolder;
  const getSelectedQrFolder = deps.getSelectedQrFolder;
  const setItemGroup = deps.setItemGroup;
  const getResFolderDisplayName = deps.getResFolderDisplayName;
  const getBackgroundDisplayName = deps.getBackgroundDisplayName;
  const getSelectedRegexNode = deps.getSelectedRegexNode;
  const getExtensionSettings = deps.getExtensionSettings;
  const getExtensionName = deps.getExtensionName;
  const getContext = deps.getContext;
  const renderRegexView = deps.renderRegexView;

  const touchDragMgr = {
    active: false,
    data: null,
    ghost: null,
    sourceEl: null,
    _timer: null,
    _startX: 0,
    _startY: 0,
    _lastTarget: null,
    _touchEnded: false,

    /** 为元素注册触摸拖拽（长按500ms启动） */
    bind(el, getDataFn) {
      const mgr = this;
      const dom = el instanceof jqClass ? el[0] : el;
      let sx, sy;

      dom.addEventListener(
        "touchstart",
        (e) => {
          if (mgr.active) return;
          if (
            e.target.closest(
              ".cfm-row-star, .cfm-tnode-arrow, .cfm-row-bglink-btn, .cfm-row-note-btn, .cfm-row-rename-btn, .cfm-row-edit-btn, .cfm-wi-toggle, .cfm-qr-expand-arrow, .cfm-chat-toggle, .cfm-regex-toggle, .cfm-char-detail-toggle, .cfm-preset-detail-toggle, .cfm-persona-toggle",
            )
          )
            return;
          const t = e.touches[0];
          sx = t.clientX;
          sy = t.clientY;
          mgr._startX = sx;
          mgr._startY = sy;
          mgr._touchEnded = false;

          mgr._timer = setTimeout(() => {
            mgr._timer = null;
            // 竞态保护：如果 touchend 已经触发，不再启动拖拽
            if (mgr._touchEnded) return;
            const data = getDataFn();
            if (!data) return;
            // 清掉上次拖拽可能残留的 ST body.dragover 状态（避免"关闭弹窗后界面变淡"）。
            doc.body?.classList.remove("dragover");
            mgr.active = true;
            mgr.data = data;
            mgr.sourceEl = dom;
            dom.classList.add("cfm-touch-dragging");
            // 创建幽灵
            const g = doc.createElement("div");
            g.className = "cfm-touch-ghost";
            // 多选模式：显示"共X项"
            if (data.multiSelect && data.count > 1) {
              g.textContent = `📦 共 ${data.count} 项`;
            } else {
              g.textContent =
                (data.type === "folder" ||
                data.type === "res-folder" ||
                data.type === "regex-folder"
                  ? "📁 "
                  : data.type === "preset"
                    ? "📄 "
                    : data.type === "worldinfo"
                      ? "📖 "
                      : data.type === "theme"
                        ? "🎨 "
                        : data.type === "background"
                          ? "🖼️ "
                          : data.type === "quickreply"
                            ? "💬 "
                            : data.type === "regex-script"
                              ? "</> "
                              : "👤 ") + (data.name || data.scriptName || "");
            }
            g.style.left = sx + "px";
            g.style.top = sy - 50 + "px";
            doc.body.appendChild(g);
            mgr.ghost = g;
            if (nav.vibrate) nav.vibrate(50);
          }, 500);
        },
        { passive: true },
      );

      dom.addEventListener(
        "touchmove",
        (e) => {
          const t = e.touches[0];
          const dx = Math.abs(t.clientX - sx);
          const dy = Math.abs(t.clientY - sy);
          // 未激活时，移动超过10px取消长按
          if (!mgr.active) {
            if (dx > 10 || dy > 10) {
              mgr._cancelTimer();
            }
            return;
          }
          e.preventDefault(); // 阻止滚动
          if (mgr.ghost) {
            mgr.ghost.style.left = t.clientX + "px";
            mgr.ghost.style.top = t.clientY - 50 + "px";
          }
          mgr._highlightTarget(t.clientX, t.clientY);
        },
        { passive: false },
      );

      dom.addEventListener(
        "touchend",
        (e) => {
          mgr._touchEnded = true;
          mgr._cancelTimer();
          if (!mgr.active) return;
          e.preventDefault();
          const t = e.changedTouches[0];
          mgr._executeDrop(t.clientX, t.clientY);
          mgr._cleanup();
        },
        { passive: false },
      );

      dom.addEventListener("touchcancel", () => {
        mgr._touchEnded = true;
        mgr._cancelTimer();
        if (mgr.active) mgr._cleanup();
      });
    },

    _cancelTimer() {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    },

    _clearHighlight() {
      if (this._lastTarget) {
        this._lastTarget.classList.remove(
          "cfm-drop-target",
          "cfm-drop-before",
          "cfm-drop-after",
          "cfm-drop-forbidden",
          "cfm-right-list-drop-target",
        );
        this._lastTarget = null;
      }
    },

    _highlightTarget(x, y) {
      this._clearHighlight();
      if (this.ghost) this.ghost.style.display = "none";
      const el = doc.elementFromPoint(x, y);
      if (this.ghost) this.ghost.style.display = "";
      if (!el) return;

      const tnode = el.closest(".cfm-tnode[data-id]");
      const row = el.closest(
        ".cfm-row[data-folder-id], .cfm-row[data-target-folder]",
      );
      const uncatNode = el.closest(".cfm-tnode-uncategorized");
      const rightList = el.closest(".cfm-right-list");

      let target = tnode || row || uncatNode;
      if (!target && rightList) {
        target = rightList;
      }
      if (!target) return;

      const targetId =
        target.dataset?.id ||
        target.dataset?.folderId ||
        target.dataset?.targetFolder;

      // 三区域判定
      let zone = "into";
      if ((tnode || row) && !uncatNode) {
        const rect = target.getBoundingClientRect();
        const relY = (y - rect.top) / rect.height;
        if (relY < 0.25) zone = "before";
        else if (relY > 0.75) zone = "after";
      }

      // 禁止检测
      if (
        (this.data.type === "folder" || this.data.type === "res-folder") &&
        this.data.id === targetId
      ) {
        target.classList.add("cfm-drop-forbidden");
        this._lastTarget = target;
        return;
      }
      if (
        this.data.type === "folder" &&
        zone === "into" &&
        targetId &&
        wouldCreateCycle(this.data.id, targetId)
      ) {
        target.classList.add("cfm-drop-forbidden");
        this._lastTarget = target;
        return;
      }
      if (
        this.data.type === "res-folder" &&
        zone === "into" &&
        targetId &&
        wouldCreateResCycle(this.data.resType, this.data.id, targetId)
      ) {
        target.classList.add("cfm-drop-forbidden");
        this._lastTarget = target;
        return;
      }

      if (target === rightList)
        target.classList.add("cfm-right-list-drop-target");
      else if (zone === "before") target.classList.add("cfm-drop-before");
      else if (zone === "after") target.classList.add("cfm-drop-after");
      else target.classList.add("cfm-drop-target");
      this._lastTarget = target;
    },

    _executeDrop(x, y) {
      if (this.ghost) this.ghost.style.display = "none";
      const el = doc.elementFromPoint(x, y);
      if (this.ghost) this.ghost.style.display = "";
      if (!el || !this.data) return;

      const tnode = el.closest(".cfm-tnode[data-id]");
      const row = el.closest(
        ".cfm-row[data-folder-id], .cfm-row[data-target-folder]",
      );
      const uncatNode = el.closest(".cfm-tnode-uncategorized");
      const rightList = el.closest(".cfm-right-list");

      let target = tnode || row || uncatNode;
      let targetId =
        target?.dataset?.id ||
        target?.dataset?.folderId ||
        target?.dataset?.targetFolder;

      let zone = "into";
      if ((tnode || row) && !uncatNode && target) {
        const rect = target.getBoundingClientRect();
        const relY = (y - rect.top) / rect.height;
        if (relY < 0.25) zone = "before";
        else if (relY > 0.75) zone = "after";
      }

      const d = this.data;
      if (d.type === "folder") {
        if (uncatNode) return;
        if (targetId && targetId !== d.id) {
          if (zone === "into") {
            if (wouldCreateCycle(d.id, targetId)) {
              cfmToastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            reorderFolder(d.id, targetId, null);
            cfmToastr.success(
              `「${getTagName(d.id)}」已移入「${getTagName(targetId)}」`,
            );
          } else {
            const pId = getConfig().folders[targetId]?.parentId || null;
            if (wouldCreateCycle(d.id, pId)) {
              cfmToastr.error("此操作会产生循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderFolder(d.id, pId, targetId);
              cfmToastr.success(`「${getTagName(d.id)}」已排序`);
            } else {
              const sibs = sortFolders(getChildFolders(pId));
              const ci = sibs.indexOf(targetId);
              const nxt =
                ci >= 0 && ci < sibs.length - 1 ? sibs[ci + 1] : null;
              reorderFolder(d.id, pId, nxt);
              cfmToastr.success(`「${getTagName(d.id)}」已排序`);
            }
          }
          renderLeftTree();
          renderRightPane();
        } else if (
          !target &&
          rightList &&
          getSelectedTreeNode() &&
          getSelectedTreeNode() !== "__uncategorized__" &&
          getSelectedTreeNode() !== "__favorites__"
        ) {
          const selectedTreeNode = getSelectedTreeNode();
          if (
            d.id !== selectedTreeNode &&
            !wouldCreateCycle(d.id, selectedTreeNode)
          ) {
            reorderFolder(d.id, selectedTreeNode, null);
            cfmToastr.success(
              `「${getTagName(d.id)}」已移入「${getTagName(selectedTreeNode)}」`,
            );
            renderLeftTree();
            renderRightPane();
          }
        }
      } else if (d.type === "char") {
        // 多选批量移动
        const avatars =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.avatar];
        const count = avatars.length;
        if (uncatNode) {
          avatars.forEach((av) => removeCharFromAllFolders(av));
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个角色移出所有文件夹`
              : `已将「${d.name || d.avatar}」移出所有文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        } else if (targetId) {
          avatars.forEach((av) => {
            handleCharDropToFolder(av, targetId);
          });
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个角色${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(targetId)}」`
              : `已将「${d.name || d.avatar}」${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(targetId)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        } else if (
          !target &&
          rightList &&
          getSelectedTreeNode() &&
          getSelectedTreeNode() !== "__uncategorized__" &&
          getSelectedTreeNode() !== "__favorites__"
        ) {
          const selectedTreeNode = getSelectedTreeNode();
          avatars.forEach((av) => {
            handleCharDropToFolder(av, selectedTreeNode);
          });
          cfmToastr.success(
            count > 1
              ? `已将 ${count} 个角色${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(selectedTreeNode)}」`
              : `已将「${d.name || d.avatar}」${getCfmCopyMode() ? "复制" : "移动"}到「${getTagName(selectedTreeNode)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderLeftTree();
          renderRightPane();
        }
      } else if (d.type === "res-folder") {
        const resType = d.resType;
        const resTree = getResFolderTree(resType);
        if (uncatNode) return;
        if (targetId && targetId !== d.id) {
          if (zone === "into") {
            if (wouldCreateResCycle(resType, d.id, targetId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            reorderResFolder(resType, d.id, targetId, null);
            cfmToastr.success(
              `「${d.name}」已移入「${getResFolderDisplayName(resType, targetId)}」`,
            );
          } else {
            const pId = resTree[targetId]?.parentId || null;
            if (wouldCreateResCycle(resType, d.id, pId)) {
              cfmToastr.error("循环嵌套，已阻止");
              return;
            }
            if (zone === "before") {
              reorderResFolder(resType, d.id, pId, targetId);
            } else {
              const sibs = sortResFolders(
                resType,
                getResChildFolders(resType, pId),
              );
              const ci = sibs.indexOf(targetId);
              reorderResFolder(
                resType,
                d.id,
                pId,
                ci < sibs.length - 1 ? sibs[ci + 1] : null,
              );
            }
            cfmToastr.success(`「${d.name}」已排序`);
          }
          if (resType === "presets") renderPresetsView();
          else if (resType === "worldinfo") renderWorldInfoView();
          else if (resType === "themes") renderThemesView();
          else if (resType === "backgrounds") renderBackgroundsView();
          else if (resType === "personas") renderPersonasView();
          else if (resType === "quickreply") renderQRView();
        } else if (!target && rightList) {
          const selFolder =
            resType === "presets"
              ? getSelectedPresetFolder()
              : resType === "worldinfo"
                ? getSelectedWorldInfoFolder()
                : resType === "themes"
                  ? getSelectedThemeFolder()
                  : resType === "backgrounds"
                    ? getSelectedBgFolder()
                    : resType === "personas"
                      ? getSelectedPersonaFolder()
                      : resType === "quickreply"
                        ? getSelectedQrFolder()
                        : null;
          if (
            selFolder &&
            selFolder !== "__ungrouped__" &&
            selFolder !== "__favorites__" &&
            d.id !== selFolder
          ) {
            if (!wouldCreateResCycle(resType, d.id, selFolder)) {
              reorderResFolder(resType, d.id, selFolder, null);
              cfmToastr.success(
                `「${d.name}」已移入「${getResFolderDisplayName(resType, selFolder)}」`,
              );
              if (resType === "presets") renderPresetsView();
              else if (resType === "worldinfo") renderWorldInfoView();
              else if (resType === "themes") renderThemesView();
              else if (resType === "backgrounds") renderBackgroundsView();
              else if (resType === "personas") renderPersonasView();
              else if (resType === "quickreply") renderQRView();
            }
          }
        }
      } else if (d.type === "preset") {
        const presetNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const pCount = presetNames.length;
        if (uncatNode) {
          presetNames.forEach((n) => setItemGroup("presets", n, null));
          cfmToastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
        } else if (targetId) {
          presetNames.forEach((n) => setItemGroup("presets", n, targetId));
          cfmToastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${getResFolderDisplayName("presets", targetId)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("presets", targetId)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
        } else if (
          !target &&
          rightList &&
          getSelectedPresetFolder() &&
          getSelectedPresetFolder() !== "__ungrouped__" &&
          getSelectedPresetFolder() !== "__favorites__"
        ) {
          const selectedPresetFolder = getSelectedPresetFolder();
          presetNames.forEach((n) =>
            setItemGroup("presets", n, selectedPresetFolder),
          );
          cfmToastr.success(
            pCount > 1
              ? `已将 ${pCount} 个预设移入「${getResFolderDisplayName("presets", selectedPresetFolder)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("presets", selectedPresetFolder)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderPresetsView();
        }
      } else if (d.type === "worldinfo") {
        const wiNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const wCount = wiNames.length;
        if (uncatNode) {
          wiNames.forEach((n) => setItemGroup("worldinfo", n, null));
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderWorldInfoView();
        } else if (targetId) {
          wiNames.forEach((n) => setItemGroup("worldinfo", n, targetId));
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${getResFolderDisplayName("worldinfo", targetId)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("worldinfo", targetId)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderWorldInfoView();
        } else if (
          !target &&
          rightList &&
          getSelectedWorldInfoFolder() &&
          getSelectedWorldInfoFolder() !== "__ungrouped__" &&
          getSelectedWorldInfoFolder() !== "__favorites__"
        ) {
          const selectedWorldInfoFolder = getSelectedWorldInfoFolder();
          wiNames.forEach((n) =>
            setItemGroup("worldinfo", n, selectedWorldInfoFolder),
          );
          cfmToastr.success(
            wCount > 1
              ? `已将 ${wCount} 个世界书移入「${getResFolderDisplayName("worldinfo", selectedWorldInfoFolder)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("worldinfo", selectedWorldInfoFolder)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderWorldInfoView();
        }
      } else if (d.type === "theme") {
        const names = d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        if (uncatNode) {
          names.forEach((n) => setItemGroup("themes", n, null));
          if (d.multiSelect) clearMultiSelect();
          renderThemesView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
        } else if (targetId) {
          names.forEach((n) => setItemGroup("themes", n, targetId));
          if (d.multiSelect) clearMultiSelect();
          renderThemesView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移入「${getResFolderDisplayName("themes", targetId)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("themes", targetId)}」`,
          );
        } else if (
          !target &&
          rightList &&
          getSelectedThemeFolder() &&
          getSelectedThemeFolder() !== "__ungrouped__" &&
          getSelectedThemeFolder() !== "__favorites__"
        ) {
          const selectedThemeFolder = getSelectedThemeFolder();
          names.forEach((n) => setItemGroup("themes", n, selectedThemeFolder));
          if (d.multiSelect) clearMultiSelect();
          renderThemesView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个主题移入「${getResFolderDisplayName("themes", selectedThemeFolder)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("themes", selectedThemeFolder)}」`,
          );
        }
      } else if (d.type === "background") {
        const names = d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        if (uncatNode) {
          names.forEach((n) => setItemGroup("backgrounds", n, null));
          if (d.multiSelect) clearMultiSelect();
          renderBackgroundsView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移出文件夹`
              : `已将「${getBackgroundDisplayName(d.name)}」移出文件夹`,
          );
        } else if (targetId) {
          names.forEach((n) => setItemGroup("backgrounds", n, targetId));
          if (d.multiSelect) clearMultiSelect();
          renderBackgroundsView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移入「${getResFolderDisplayName("backgrounds", targetId)}」`
              : `已将「${getBackgroundDisplayName(d.name)}」移入「${getResFolderDisplayName("backgrounds", targetId)}」`,
          );
        } else if (
          !target &&
          rightList &&
          getSelectedBgFolder() &&
          getSelectedBgFolder() !== "__ungrouped__" &&
          getSelectedBgFolder() !== "__favorites__"
        ) {
          const selectedBgFolder = getSelectedBgFolder();
          names.forEach((n) =>
            setItemGroup("backgrounds", n, selectedBgFolder),
          );
          if (d.multiSelect) clearMultiSelect();
          renderBackgroundsView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个背景移入「${getResFolderDisplayName("backgrounds", selectedBgFolder)}」`
              : `已将「${getBackgroundDisplayName(d.name)}」移入「${getResFolderDisplayName("backgrounds", selectedBgFolder)}」`,
          );
        }
      } else if (d.type === "persona") {
        const names =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.avatarId];
        if (uncatNode) {
          names.forEach((n) => setItemGroup("personas", n, null));
          if (d.multiSelect) clearMultiSelect();
          renderPersonasView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个User移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
        } else if (targetId) {
          names.forEach((n) => setItemGroup("personas", n, targetId));
          if (d.multiSelect) clearMultiSelect();
          renderPersonasView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个User移入「${getResFolderDisplayName("personas", targetId)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("personas", targetId)}」`,
          );
        } else if (
          !target &&
          rightList &&
          getSelectedPersonaFolder() &&
          getSelectedPersonaFolder() !== "__ungrouped__" &&
          getSelectedPersonaFolder() !== "__favorites__"
        ) {
          const selectedPersonaFolder = getSelectedPersonaFolder();
          names.forEach((n) =>
            setItemGroup("personas", n, selectedPersonaFolder),
          );
          if (d.multiSelect) clearMultiSelect();
          renderPersonasView();
          cfmToastr.success(
            names.length > 1
              ? `已将 ${names.length} 个User移入「${getResFolderDisplayName("personas", selectedPersonaFolder)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("personas", selectedPersonaFolder)}」`,
          );
        }
      } else if (d.type === "quickreply") {
        const qrNames =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.name];
        const qrCount = qrNames.length;
        if (uncatNode) {
          qrNames.forEach((n) => setItemGroup("quickreply", n, null));
          cfmToastr.success(
            qrCount > 1
              ? `已将 ${qrCount} 个快速回复集移出文件夹`
              : `已将「${d.name}」移出文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderQRView();
        } else if (targetId) {
          qrNames.forEach((n) => setItemGroup("quickreply", n, targetId));
          cfmToastr.success(
            qrCount > 1
              ? `已将 ${qrCount} 个快速回复集移入「${getResFolderDisplayName("quickreply", targetId)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("quickreply", targetId)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderQRView();
        } else if (
          !target &&
          rightList &&
          getSelectedQrFolder() &&
          getSelectedQrFolder() !== "__ungrouped__" &&
          getSelectedQrFolder() !== "__favorites__"
        ) {
          const selectedQrFolder = getSelectedQrFolder();
          qrNames.forEach((n) =>
            setItemGroup("quickreply", n, selectedQrFolder),
          );
          cfmToastr.success(
            qrCount > 1
              ? `已将 ${qrCount} 个快速回复集移入「${getResFolderDisplayName("quickreply", selectedQrFolder)}」`
              : `已将「${d.name}」移入「${getResFolderDisplayName("quickreply", selectedQrFolder)}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderQRView();
        }
      } else if (d.type === "regex-script") {
        const regexGroups =
          getExtensionSettings()[getExtensionName()].regexGlobalGroups || {};
        const regexFolderTree =
          getExtensionSettings()[getExtensionName()].regexFolderTree || {};
        const scriptIds =
          d.multiSelect && d.selectedIds ? d.selectedIds : [d.scriptId];
        const scriptCount = scriptIds.length;
        const targetRegexFolderId =
          targetId && regexFolderTree[targetId] ? targetId : null;
        const currentSelectedRegexFolder =
          getSelectedRegexNode() &&
          getSelectedRegexNode() !== "__ungrouped__" &&
          getSelectedRegexNode() !== "__favorites__" &&
          regexFolderTree[getSelectedRegexNode()]
            ? getSelectedRegexNode()
            : null;
        if (uncatNode) {
          scriptIds.forEach((sid) => {
            delete regexGroups[sid];
          });
          getContext().saveSettingsDebounced();
          cfmToastr.success(
            scriptCount > 1
              ? `已将 ${scriptCount} 个脚本移出文件夹`
              : `已将「${d.scriptName}」移出文件夹`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderRegexView();
        } else if (targetRegexFolderId) {
          scriptIds.forEach((sid) => {
            regexGroups[sid] = targetRegexFolderId;
          });
          getContext().saveSettingsDebounced();
          cfmToastr.success(
            scriptCount > 1
              ? `已将 ${scriptCount} 个脚本移入「${regexFolderTree[targetRegexFolderId]?.displayName || targetRegexFolderId}」`
              : `已将「${d.scriptName}」移入「${regexFolderTree[targetRegexFolderId]?.displayName || targetRegexFolderId}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderRegexView();
        } else if (!target && rightList && currentSelectedRegexFolder) {
          scriptIds.forEach((sid) => {
            regexGroups[sid] = currentSelectedRegexFolder;
          });
          getContext().saveSettingsDebounced();
          cfmToastr.success(
            scriptCount > 1
              ? `已将 ${scriptCount} 个脚本移入「${regexFolderTree[currentSelectedRegexFolder]?.displayName || currentSelectedRegexFolder}」`
              : `已将「${d.scriptName}」移入「${regexFolderTree[currentSelectedRegexFolder]?.displayName || currentSelectedRegexFolder}」`,
          );
          if (d.multiSelect) clearMultiSelect();
          renderRegexView();
        }
      }
    },

    _cleanup() {
      if (this.ghost) {
        this.ghost.remove();
        this.ghost = null;
      }
      if (this.sourceEl) {
        this.sourceEl.classList.remove("cfm-touch-dragging");
        this.sourceEl = null;
      }
      this._clearHighlight();
      this.active = false;
      this.data = null;
      // 清理 ST body.dragover 残留（方案A），保留 drop_target 以免影响 ST 自身拖文件导入。
      doc.body?.classList.remove("dragover");
    },
  };

  return touchDragMgr;
}
