// =====================================================================
// 设置弹窗 - 自定义布局页（共享）
// =====================================================================
// 承接 renderCustomLayoutSection：标签页排序/可见性、子功能排序/可见性、
// 标签页收纳、按钮收纳、拖拽排序、恢复默认布局。
// 由 index.js 注入依赖（createCustomLayoutCore 工厂模式）。
// =====================================================================

export function createCustomLayoutCore(deps) {
  const {
    $,
    extension_settings,
    extensionName,
    getContext,
    cfmToastr,
    cfmConfirm,
    getOrderedTabs,
    ensureTabMenuConfig,
    getTabMenuConfig,
    getOrderedActions,
    ensureToolbarMenuConfig,
    getToolbarMenuConfig,
    applyAllToolbarVisibility,
    flashDraggedElement,
    cfmIsTouchDevice,
    renderConfigBody,
    CFM_TAB_META,
    CFM_ACTION_META,
    getCurrentResourceType,
  } = deps;

  /** 渲染自定义布局配置区域 */
  function renderCustomLayoutSection(body) {
    const layout = extension_settings[extensionName].customLayout;
    const orderedTabs = getOrderedTabs();

    // --- 标签页排序/可见性 ---
    ensureTabMenuConfig();
    const tabMenuCfg = getTabMenuConfig();
    let tabItemsHtml = orderedTabs
      .map((t) => {
        const meta = CFM_TAB_META.find((m) => m.id === t.id);
        if (!meta) return "";
        const checked = t.visible !== false ? "checked" : "";
        const menuChecked =
          t.menu === true ? "cfm-layout-menu-check-checked" : "";
        return `<div class="cfm-layout-item" data-id="${t.id}">
          <span class="cfm-layout-drag"><i class="fa-solid fa-grip-vertical"></i></span>
          <button type="button" class="cfm-layout-menu-check ${tabMenuCfg.enabled ? "" : "cfm-layout-menu-check-hidden"} ${menuChecked}" title="收纳到标签页菜单" aria-pressed="${t.menu === true ? "true" : "false"}"><i class="fa-solid fa-check"></i></button>
          <span class="cfm-layout-icon"><i class="fa-solid ${meta.icon}"></i></span>
          <span class="cfm-layout-label">${meta.label}</span>
          <label class="cfm-layout-toggle"><input type="checkbox" data-tab-id="${t.id}" ${checked}><span class="cfm-layout-slider"></span></label>
          <span class="cfm-layout-arrow cfm-layout-arrow-up" data-dir="up" title="上移"><i class="fa-solid fa-chevron-up"></i></span>
          <span class="cfm-layout-arrow cfm-layout-arrow-down" data-dir="down" title="下移"><i class="fa-solid fa-chevron-down"></i></span>
        </div>`;
      })
      .join("");

    // --- 子功能排序/可见性（按当前选中的标签页展示） ---
    const section = $(`
      <div class="cfm-config-section cfm-custom-layout-section">
        <div class="cfm-layout-header-row"><label>自定义布局</label><button class="cfm-layout-reset-btn" title="恢复默认布局"><i class="fa-solid fa-rotate-left"></i> 恢复默认</button></div>
        <div class="cfm-layout-hint">拖拽或使用箭头调整标签页顺序，开关控制显示/隐藏</div>
        <div class="cfm-layout-tabs-title">标签页</div>
        <div class="cfm-layout-menu-switch">
          <label class="cfm-layout-menu-switch-label">
            <input type="checkbox" id="cfm-layout-tab-menu-enabled" ${tabMenuCfg.enabled ? "checked" : ""}>
            <span>标签页收纳</span>
          </label>
          <span class="cfm-layout-menu-switch-hint">开启后，勾选前方方块的标签页会进入顶部标签菜单。</span>
        </div>
        <div class="cfm-layout-tabs-list">
          ${tabItemsHtml}
        </div>
        <div class="cfm-layout-actions-title">子功能 <span class="cfm-layout-actions-tab-hint">（点击上方标签页名称切换）</span></div>
        <div class="cfm-layout-menu-switch">
          <label class="cfm-layout-menu-switch-label">
            <input type="checkbox" id="cfm-layout-menu-enabled">
            <span>按钮收纳</span>
          </label>
          <span class="cfm-layout-menu-switch-hint">开启后，勾选“收纳”的按钮会进入菜单，菜单按钮默认固定在最左边。</span>
        </div>
        <div class="cfm-layout-actions-list"></div>
      </div>
    `);

    // 更新箭头边界样式
    function updateArrowStyles() {
      const items = section.find(".cfm-layout-tabs-list .cfm-layout-item");
      items.find(".cfm-layout-arrow").removeClass("cfm-layout-arrow-disabled");
      items
        .first()
        .find(".cfm-layout-arrow-up")
        .addClass("cfm-layout-arrow-disabled");
      items
        .last()
        .find(".cfm-layout-arrow-down")
        .addClass("cfm-layout-arrow-disabled");
    }

    let cfmLayoutMenuTouchStamp = 0;

    // 保存标签页顺序
    function saveTabOrder() {
      const newOrder = [];
      section.find(".cfm-layout-tabs-list .cfm-layout-item").each(function () {
        const id = $(this).data("id");
        const visible = $(this).find("input[type=checkbox]").prop("checked");
        const menu = $(this)
          .find(".cfm-layout-menu-check")
          .hasClass("cfm-layout-menu-check-checked");
        newOrder.push({ id, visible, menu });
      });
      layout.tabs = newOrder;
      layout.tabMenu = layout.tabMenu || { enabled: false };
      layout.tabMenu.enabled = !!section
        .find("#cfm-layout-tab-menu-enabled")
        .prop("checked");
      getContext().saveSettingsDebounced();
      updateArrowStyles();
    }

    // 标签页可见性切换
    section
      .find(".cfm-layout-tabs-list")
      .on("change", "input[type=checkbox]", function () {
        const allChecks = section.find(
          ".cfm-layout-tabs-list input[type=checkbox]",
        );
        const checkedCount = allChecks.filter(":checked").length;
        if (checkedCount === 0) {
          $(this).prop("checked", true);
          cfmToastr.warning("至少需要保留一个标签页");
          return;
        }
        saveTabOrder();
      })
      .on("click touchend", ".cfm-layout-menu-check", function (e) {
        if (e.type === "touchend") {
          cfmLayoutMenuTouchStamp = Date.now();
          e.preventDefault();
        } else if (Date.now() - cfmLayoutMenuTouchStamp < 450) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        if ($(this).hasClass("cfm-layout-menu-check-hidden")) return;
        $(this).toggleClass("cfm-layout-menu-check-checked");
        $(this).attr(
          "aria-pressed",
          $(this).hasClass("cfm-layout-menu-check-checked") ? "true" : "false",
        );
        saveTabOrder();
      });
    section.find("#cfm-layout-tab-menu-enabled").on("change", function (e) {
      e.stopPropagation();
      layout.tabMenu = layout.tabMenu || { enabled: false };
      layout.tabMenu.enabled = !!$(this).prop("checked");
      getContext().saveSettingsDebounced();
      renderConfigBody("layout");
      cfmToastr.success(
        $(this).prop("checked") ? "已开启标签页收纳" : "已关闭标签页收纳",
      );
    });

    // 标签页箭头移动
    section
      .find(".cfm-layout-tabs-list")
      .on("click touchend", ".cfm-layout-arrow", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($(this).hasClass("cfm-layout-arrow-disabled")) return;
        const item = $(this).closest(".cfm-layout-item");
        const dir = $(this).data("dir");
        if (dir === "up" && item.prev().length) {
          item.insertBefore(item.prev());
        } else if (dir === "down" && item.next().length) {
          item.insertAfter(item.next());
        }
        saveTabOrder();
        flashDraggedElement(item);
      });

    // 标签页拖拽排序
    const tabsList = section.find(".cfm-layout-tabs-list");
    if (typeof tabsList.sortable === "function" && !cfmIsTouchDevice()) {
      tabsList.sortable({
        items: ".cfm-layout-item",
        handle: ".cfm-layout-drag",
        axis: "y",
        tolerance: "pointer",
        placeholder: "cfm-sort-placeholder",
        forcePlaceholderSize: true,
        distance: 4,
        cancel:
          ".cfm-layout-toggle, .cfm-layout-arrow, button, input, textarea, select, a, label",
        start: (_event, ui) => {
          ui.item.addClass("cfm-layout-dragging");
        },
        stop: (_event, ui) => {
          ui.item.removeClass("cfm-layout-dragging");
          saveTabOrder();
          flashDraggedElement(ui.item);
        },
      });
      tabsList.disableSelection();
    }

    // --- 子功能面板 ---
    let selectedLayoutTab =
      getCurrentResourceType() || orderedTabs[0]?.id || "chars";

    function renderActionsPanel(tabId) {
      selectedLayoutTab = tabId;
      ensureToolbarMenuConfig();
      const menuCfg = getToolbarMenuConfig(tabId);
      const actionsList = section.find(".cfm-layout-actions-list");
      actionsList.empty();
      section
        .find("#cfm-layout-menu-enabled")
        .prop("checked", !!menuCfg.enabled);
      section
        .find(".cfm-layout-menu-switch")
        .toggleClass("cfm-layout-menu-switch-enabled", !!menuCfg.enabled);
      const actions = getOrderedActions(tabId);
      if (!actions.length) {
        actionsList.html(
          '<div class="cfm-layout-empty">该标签页无子功能</div>',
        );
        return;
      }
      actions.forEach((a) => {
        const meta = CFM_ACTION_META[a.id];
        if (!meta) return;
        const visibleChecked = a.visible !== false ? "checked" : "";
        const menuChecked =
          a.menu === true ? "cfm-layout-menu-check-checked" : "";
        actionsList.append(`<div class="cfm-layout-item cfm-layout-action-item" data-id="${a.id}">
          <span class="cfm-layout-drag"><i class="fa-solid fa-grip-vertical"></i></span>
          <button type="button" class="cfm-layout-menu-check ${menuCfg.enabled ? "" : "cfm-layout-menu-check-hidden"} ${menuChecked}" title="收纳到按钮菜单" aria-pressed="${a.menu === true ? "true" : "false"}"><i class="fa-solid fa-check"></i></button>
          <span class="cfm-layout-icon"><i class="fa-solid ${meta.icon}"></i></span>
          <span class="cfm-layout-label">${meta.label}</span>
          <label class="cfm-layout-toggle" title="显示到按钮栏"><input type="checkbox" data-action-visible="${a.id}" ${visibleChecked}><span class="cfm-layout-slider"></span></label>
          <span class="cfm-layout-arrow cfm-layout-arrow-up" data-dir="up" title="上移"><i class="fa-solid fa-chevron-up"></i></span>
          <span class="cfm-layout-arrow cfm-layout-arrow-down" data-dir="down" title="下移"><i class="fa-solid fa-chevron-down"></i></span>
        </div>`);
      });
      updateActionArrowStyles();
      section
        .find(".cfm-layout-tabs-list .cfm-layout-item")
        .removeClass("cfm-layout-item-highlight");
      section
        .find(`.cfm-layout-tabs-list .cfm-layout-item[data-id="${tabId}"]`)
        .addClass("cfm-layout-item-highlight");
    }

    function updateActionArrowStyles() {
      const items = section.find(".cfm-layout-actions-list .cfm-layout-item");
      items.find(".cfm-layout-arrow").removeClass("cfm-layout-arrow-disabled");
      items
        .first()
        .find(".cfm-layout-arrow-up")
        .addClass("cfm-layout-arrow-disabled");
      items
        .last()
        .find(".cfm-layout-arrow-down")
        .addClass("cfm-layout-arrow-disabled");
    }

    function saveActionOrder() {
      const newOrder = [];
      section
        .find(".cfm-layout-actions-list .cfm-layout-item")
        .each(function () {
          const id = $(this).data("id");
          const visible = $(this)
            .find("input[data-action-visible]")
            .prop("checked");
          const menu = $(this)
            .find(".cfm-layout-menu-check")
            .hasClass("cfm-layout-menu-check-checked");
          newOrder.push({ id, visible, menu });
        });
      layout.tabActions[selectedLayoutTab] = newOrder;
      layout.tabMenus = layout.tabMenus || {};
      layout.tabMenus[selectedLayoutTab] = layout.tabMenus[
        selectedLayoutTab
      ] || { enabled: false };
      layout.tabMenus[selectedLayoutTab].enabled = !!section
        .find("#cfm-layout-menu-enabled")
        .prop("checked");
      getContext().saveSettingsDebounced();
      updateActionArrowStyles();
    }

    section
      .find(".cfm-layout-actions-list")
      .on("change", "input[data-action-visible]", function () {
        saveActionOrder();
        applyAllToolbarVisibility();
      });
    section
      .find(".cfm-layout-actions-list")
      .on("click touchend", ".cfm-layout-menu-check", function (e) {
        if (e.type === "touchend") {
          cfmLayoutMenuTouchStamp = Date.now();
          e.preventDefault();
        } else if (Date.now() - cfmLayoutMenuTouchStamp < 450) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        if ($(this).hasClass("cfm-layout-menu-check-hidden")) return;
        $(this).toggleClass("cfm-layout-menu-check-checked");
        $(this).attr(
          "aria-pressed",
          $(this).hasClass("cfm-layout-menu-check-checked") ? "true" : "false",
        );
        saveActionOrder();
        applyAllToolbarVisibility();
      });
    section.find("#cfm-layout-menu-enabled").on("change", function () {
      layout.tabMenus = layout.tabMenus || {};
      layout.tabMenus[selectedLayoutTab] = layout.tabMenus[
        selectedLayoutTab
      ] || { enabled: false };
      layout.tabMenus[selectedLayoutTab].enabled = !!$(this).prop("checked");
      getContext().saveSettingsDebounced();
      renderActionsPanel(selectedLayoutTab);
      applyAllToolbarVisibility();
      cfmToastr.success(
        $(this).prop("checked") ? "已开启按钮收纳" : "已关闭按钮收纳",
      );
    });

    // 子功能箭头移动
    section
      .find(".cfm-layout-actions-list")
      .on("click touchend", ".cfm-layout-arrow", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($(this).hasClass("cfm-layout-arrow-disabled")) return;
        const item = $(this).closest(".cfm-layout-item");
        const dir = $(this).data("dir");
        if (dir === "up" && item.prev().length) {
          item.insertBefore(item.prev());
        } else if (dir === "down" && item.next().length) {
          item.insertAfter(item.next());
        }
        saveActionOrder();
        flashDraggedElement(item);
      });

    // 子功能拖拽排序
    const actionsSortableList = section.find(".cfm-layout-actions-list");
    if (
      typeof actionsSortableList.sortable === "function" &&
      !cfmIsTouchDevice()
    ) {
      actionsSortableList.sortable({
        items: ".cfm-layout-item",
        handle: ".cfm-layout-drag",
        axis: "y",
        tolerance: "pointer",
        placeholder: "cfm-sort-placeholder",
        forcePlaceholderSize: true,
        distance: 4,
        cancel:
          ".cfm-layout-toggle, .cfm-layout-arrow, button, input, textarea, select, a, label",
        start: (_event, ui) => {
          ui.item.addClass("cfm-layout-dragging");
        },
        stop: (_event, ui) => {
          ui.item.removeClass("cfm-layout-dragging");
          saveActionOrder();
          flashDraggedElement(ui.item);
        },
      });
      actionsSortableList.disableSelection();
    }

    // 点击标签页名称切换子功能面板
    section
      .find(".cfm-layout-tabs-list")
      .on("click", ".cfm-layout-label", function (e) {
        e.stopPropagation();
        const tabId = $(this).closest(".cfm-layout-item").data("id");
        renderActionsPanel(tabId);
      });

    // 恢复默认按钮
    section.find(".cfm-layout-reset-btn").on("click touchend", function (e) {
      e.preventDefault();
      if (
        !cfmConfirm(
          "确定要恢复默认布局吗？当前的标签页顺序和子功能开关设置将被重置。",
        )
      )
        return;
      const defaultLayout = {
        tabs: [
          { id: "chars", visible: true },
          { id: "chatlogs", visible: true },
          { id: "worldinfo", visible: true },
          { id: "presets", visible: true },
          { id: "themes", visible: true },
          { id: "backgrounds", visible: true },
          { id: "personas", visible: true },
        ],
        tabActions: {
          chars: [
            { id: "import", visible: true, menu: false },
            { id: "chatmode", visible: true, menu: false },
            { id: "regexmode", visible: true, menu: false },
            { id: "quickedit", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          chatlogs: [
            { id: "import", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "rename", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          worldinfo: [
            { id: "import", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "rename", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          presets: [
            { id: "import", visible: true, menu: false },
            { id: "regexmode", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "rename", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          themes: [
            { id: "import", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "rename", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          backgrounds: [
            { id: "import", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "rename", visible: true, menu: false },
            { id: "default", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          personas: [
            { id: "import", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
          regex: [
            { id: "import", visible: true, menu: false },
            { id: "create", visible: true, menu: false },
            { id: "transfer", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
            { id: "sort", visible: true, menu: false },
          ],
          quickreply: [
            { id: "import", visible: true, menu: false },
            { id: "note", visible: true, menu: false },
            { id: "rename", visible: true, menu: false },
            { id: "export", visible: true, menu: false },
            { id: "delete", visible: true, menu: false },
          ],
        },
        tabMenus: {
          chars: { enabled: false },
          chatlogs: { enabled: false },
          worldinfo: { enabled: false },
          presets: { enabled: false },
          themes: { enabled: false },
          backgrounds: { enabled: false },
          personas: { enabled: false },
          regex: { enabled: false },
          quickreply: { enabled: false },
        },
      };
      extension_settings[extensionName].customLayout = defaultLayout;
      getContext().saveSettingsDebounced();
      renderConfigBody();
      cfmToastr.success("已恢复默认布局");
    });

    // 初始渲染第一个标签页的子功能
    renderActionsPanel(selectedLayoutTab);
    updateArrowStyles();

    body.append(section);
  }

  return {
    renderCustomLayoutSection,
  };
}
