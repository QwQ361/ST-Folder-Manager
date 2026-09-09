// 工具栏动作层：承接 getOrderedActions（工具栏动作顺序/可见性合并）与 applyToolbarVisibility（工具栏按钮显隐、排序与溢出菜单渲染）。
export function createToolbarActionsApi(deps) {
  const {
    $,
    extension_settings,
    extensionName,
    CFM_ACTION_BTN_MAP,
    CFM_HEADER_COUNT_MAP,
    CFM_ACTION_META,
    ensureToolbarMenuConfig,
    getToolbarMenuConfig,
    getToolbarMenuActions,
    getVisibleActions,
  } = deps;

  /**
   * 获取某标签页的子功能列表（已排序，含不可见）。
   * 当没有保存的配置时，根据 CFM_ACTION_BTN_MAP 生成默认可见列表；
   * 有保存的配置时，自动补充新增的 action（迁移兼容，按默认顺序插入正确位置）。
   */
  function getOrderedActions(tabId) {
    const layout = extension_settings[extensionName].customLayout;
    if (!layout || !layout.tabActions || !layout.tabActions[tabId]) {
      // 没有保存的配置时，根据 CFM_ACTION_BTN_MAP 生成默认可见列表
      const knownIds = CFM_ACTION_BTN_MAP[tabId];
      if (knownIds) {
        return Object.keys(knownIds).map((id) => ({
          id,
          visible: true,
          menu: false,
        }));
      }
      return [];
    }
    // 自动补充新增的 action（迁移兼容，按默认顺序插入正确位置）
    const saved = layout.tabActions[tabId];
    const knownIds = CFM_ACTION_BTN_MAP[tabId];
    if (knownIds) {
      for (const a of saved) {
        if (a.visible === undefined) a.visible = true;
        if (a.menu === undefined) a.menu = false;
      }
      const existingIds = new Set(saved.map((a) => a.id));
      // 默认顺序参考表
      const defaultOrder = {
        chars: [
          "import",
          "chatmode",
          "regexmode",
          "quickedit",
          "export",
          "delete",
        ],
        worldinfo: ["import", "note", "rename", "export", "delete"],
        presets: ["import", "regexmode", "note", "rename", "export", "delete"],
        themes: ["import", "note", "rename", "export", "delete"],
        backgrounds: [
          "import",
          "note",
          "rename",
          "default",
          "export",
          "delete",
        ],
        personas: ["import", "note", "export", "delete"],
        regex: ["import", "create", "transfer", "export", "delete", "sort"],
        quickreply: ["import", "note", "rename", "export", "delete"],
      };
      const refOrder = defaultOrder[tabId] || Object.keys(knownIds);
      for (const actionId of Object.keys(knownIds)) {
        if (!existingIds.has(actionId)) {
          const refIdx = refOrder.indexOf(actionId);
          let insertIdx = saved.length;
          if (refIdx > 0) {
            for (let i = refIdx - 1; i >= 0; i--) {
              const prevId = refOrder[i];
              const prevSavedIdx = saved.findIndex((a) => a.id === prevId);
              if (prevSavedIdx !== -1) {
                insertIdx = prevSavedIdx + 1;
                break;
              }
            }
          } else {
            insertIdx = 0;
          }
          saved.splice(insertIdx, 0, {
            id: actionId,
            visible: true,
            menu: false,
          });
        }
      }
    }
    return saved;
  }

  /**
   * 应用某标签页的工具栏可见性：隐藏/显示按钮、应用排序、渲染溢出菜单。
   */
  function applyToolbarVisibility(tabId) {
    const btnMap = CFM_ACTION_BTN_MAP[tabId];
    if (!btnMap) return;
    ensureToolbarMenuConfig();
    const visibleActions = getVisibleActions(tabId);
    const menuActions = new Set(getToolbarMenuActions(tabId));
    const orderedActions = getOrderedActions(tabId);
    for (const [actionId, selector] of Object.entries(btnMap)) {
      $(selector).toggle(visibleActions.includes(actionId));
    }
    orderedActions.forEach((a, idx) => {
      const selector = btnMap[a.id];
      if (selector) $(selector).css("order", idx + 10);
    });
    const wrapId = `cfm-toolbar-menu-wrap-${tabId}`;
    $(`#${wrapId}`).remove();
    $(document).off(`click.cfmToolbarMenu_${tabId}`);
    const countSelector = CFM_HEADER_COUNT_MAP[tabId];
    const countEl = countSelector ? $(countSelector) : $();
    const menuCfg = getToolbarMenuConfig(tabId);
    if (!countEl.length || !menuCfg.enabled || !menuActions.size) return;
    const menuItemsHtml = orderedActions
      .filter((a) => menuActions.has(a.id))
      .map((a) => {
        const meta = CFM_ACTION_META[a.id];
        if (!meta) return "";
        return `<button type="button" class="cfm-toolbar-menu-item" data-action-id="${a.id}">
          <i class="fa-solid ${meta.icon}"></i>
          <span>${meta.label}</span>
        </button>`;
      })
      .join("");
    const wrap = $(
      `<div id="${wrapId}" class="cfm-toolbar-menu-wrap">
         <button type="button" class="cfm-edit-char-btn cfm-toolbar-menu-btn" title="按钮菜单" aria-expanded="false"><i class="fa-solid fa-bars"></i></button>
         <div class="cfm-toolbar-menu-dropdown">
           ${menuItemsHtml}
         </div>
       </div>`,
    );
    countEl.after(wrap);
    const dropdown = wrap.find(".cfm-toolbar-menu-dropdown");
    const btn = wrap.find(".cfm-toolbar-menu-btn");
    btn.on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = dropdown.is(":visible");
      $(document).find(".cfm-toolbar-menu-dropdown").hide();
      $(document).find(".cfm-toolbar-menu-btn").attr("aria-expanded", "false");
      if (!open) {
        dropdown.show();
        btn.attr("aria-expanded", "true");
      }
    });
    dropdown.on("click touchend", ".cfm-toolbar-menu-item", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const actionId = $(this).data("action-id");
      const selector = btnMap[actionId];
      if (selector) $(selector).trigger("click");
      dropdown.hide();
      btn.attr("aria-expanded", "false");
    });
    $(document).on(`click.cfmToolbarMenu_${tabId}`, (e) => {
      if ($(e.target).closest(`#${wrapId}`).length) return;
      dropdown.hide();
      btn.attr("aria-expanded", "false");
    });
  }

  return { getOrderedActions, applyToolbarVisibility };
}
