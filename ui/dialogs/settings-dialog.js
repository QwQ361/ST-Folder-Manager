// 插件设置页弹窗壳层：承接设置页外层弹窗（#cfm-config-overlay）的创建/销毁、关闭按钮绑定、
// 以及关闭后的标签栏/视图/工具栏刷新逻辑；三模块页内容由 settings/pages/* 提供。
// 可变状态（Set/基础类型）通过引用或 getter/setter 注入，保证模块内写操作反映回 index.js 闭包。

export function createSettingsDialogApiCore(deps) {
  const {
    $,
    // 状态：Set（引用注入，可变）
    cfmDeleteSelected,
    resConfigDeleteSelected,
    // 基础类型 getter/setter 注入（跨模块共享）
    getCfmDeleteMode,
    setCfmDeleteMode,
    getCfmDeleteCascade,
    setCfmDeleteCascade,
    getCfmDeleteLastClickedId,
    setCfmDeleteLastClickedId,
    getCfmDeleteRangeMode,
    setCfmDeleteRangeMode,
    getResConfigDeleteMode,
    setResConfigDeleteMode,
    getResConfigDeleteCascade,
    setResConfigDeleteCascade,
    getResConfigDeleteLastClickedId,
    setResConfigDeleteLastClickedId,
    getResConfigDeleteRangeMode,
    setResConfigDeleteRangeMode,
    getCurrentResourceType,
    setCurrentResourceType,
    getCfmMultiSelectMode,
    setCfmMultiSelectMode,
    getCfmMultiSelectRangeMode,
    setCfmMultiSelectRangeMode,
    getCfmExportMode,
    setCfmExportMode,
    getCfmResDeleteMode,
    setCfmResDeleteMode,
    getCfmThemeNoteMode,
    setCfmThemeNoteMode,
    getCfmBgNoteMode,
    setCfmBgNoteMode,
    getCfmPresetNoteMode,
    setCfmPresetNoteMode,
    getCfmWorldInfoNoteMode,
    setCfmWorldInfoNoteMode,
    getCfmQrNoteMode,
    setCfmQrNoteMode,
    getCfmPersonaNoteMode,
    setCfmPersonaNoteMode,
    getCfmPresetRenameMode,
    setCfmPresetRenameMode,
    getCfmWorldInfoRenameMode,
    setCfmWorldInfoRenameMode,
    getCfmQrRenameMode,
    setCfmQrRenameMode,
    getCfmCopyMode,
    // 常量
    CFM_TAB_META,
    // 函数依赖
    renderConfigBody,
    clearMultiSelect,
    exitExportMode,
    exitResDeleteMode,
    exitThemeNoteMode,
    exitBgNoteMode,
    exitPresetNoteMode,
    exitWorldInfoNoteMode,
    exitQrNoteMode,
    exitPersonaNoteMode,
    exitPresetRenameMode,
    exitWorldInfoRenameMode,
    exitQrRenameMode,
    getVisibleTabs,
    getMenuTabs,
    handleCurrentTabRelocate,
    renderLeftTree,
    renderRightPane,
    renderPresetsView,
    renderWorldInfoView,
    renderThemesView,
    renderBackgroundsView,
    renderPersonasView,
    renderRegexView,
    renderQRView,
    applyAllToolbarVisibility,
  } = deps;

  function showConfigPopup() {
    if ($("#cfm-config-overlay").length > 0) return;
    const overlay = $('<div id="cfm-config-overlay"></div>');
    const popup = $(`
            <div id="cfm-config-popup">
                <div class="cfm-config-header">
                    <h3>⚙ 文件夹配置</h3>
                    <button class="cfm-btn-close" id="cfm-btn-close-config">&times;</button>
                </div>
                <div class="cfm-config-body" id="cfm-config-body"></div>
            </div>
        `);
    overlay.append(popup);
    $("body").append(overlay);
    popup.find("#cfm-btn-close-config").on("click touchend", (e) => {
      e.preventDefault();
      closeConfigPopup();
    });
    renderConfigBody();
  }

  function closeConfigPopup() {
    // 重置删除模式状态
    setCfmDeleteMode(false);
    cfmDeleteSelected.clear();
    setCfmDeleteCascade(false);
    setCfmDeleteLastClickedId(null);
    setCfmDeleteRangeMode(false);
    setResConfigDeleteMode(false);
    resConfigDeleteSelected.clear();
    setResConfigDeleteCascade(false);
    setResConfigDeleteLastClickedId(null);
    setResConfigDeleteRangeMode(false);
    $(document).off("click.cfmIconDropdown");
    $("#cfm-config-overlay").remove();
    if ($("#cfm-overlay").length > 0) {
      // --- 刷新标签栏（自定义布局生效） ---
      const visibleTabs = getVisibleTabs();
      const menuTabs = getMenuTabs();
      const allReachableTabs = [...visibleTabs, ...menuTabs];
      let currentResourceType = getCurrentResourceType();
      if (
        allReachableTabs.length > 0 &&
        !allReachableTabs.includes(currentResourceType)
      ) {
        currentResourceType = allReachableTabs[0];
        setCurrentResourceType(currentResourceType);
      }
      const tabsContainer = $("#cfm-overlay .cfm-resource-tabs");
      if (tabsContainer.length > 0) {
        const newTabsHtml = `${
          menuTabs.length
            ? `<div class="cfm-tab-menu-wrap"><button type="button" class="cfm-tab cfm-tab-menu-btn ${menuTabs.includes(currentResourceType) ? "cfm-tab-active" : ""}" aria-expanded="false" title="更多标签页"><i class="fa-solid fa-ellipsis"></i></button><div class="cfm-tab-menu-dropdown">${menuTabs
                .map((tabId) => {
                  const meta = CFM_TAB_META.find((m) => m.id === tabId);
                  if (!meta) return "";
                  const isActive =
                    tabId === currentResourceType
                      ? "cfm-tab-menu-item-active"
                      : "";
                  return `<button type="button" class="cfm-tab-menu-item ${isActive}" data-tab="${tabId}"><i class="fa-solid ${meta.icon}"></i><span>${meta.label}</span></button>`;
                })
                .join("")}</div></div>`
            : ""
        }${visibleTabs
          .map((tabId) => {
            const meta = CFM_TAB_META.find((m) => m.id === tabId);
            if (!meta) return "";
            const isActive =
              tabId === currentResourceType ? "cfm-tab-active" : "";
            return `<div class="cfm-tab ${isActive}" data-tab="${tabId}"><i class="fa-solid ${meta.icon}"></i> ${meta.label}</div>`;
          })
          .join("")}`;
        tabsContainer.html(newTabsHtml);
        const syncTabSwitch = (tab, triggerEl = null) => {
          if (tab === currentResourceType) {
            handleCurrentTabRelocate(tab);
            return;
          }
          currentResourceType = tab;
          setCurrentResourceType(currentResourceType);
          $("#cfm-overlay .cfm-tab").removeClass("cfm-tab-active");
          $("#cfm-overlay .cfm-tab-menu-item").removeClass(
            "cfm-tab-menu-item-active",
          );
          $("#cfm-overlay .cfm-tab-menu-btn").removeClass("cfm-tab-active");
          if (triggerEl?.hasClass("cfm-tab-menu-item")) {
            $("#cfm-overlay .cfm-tab-menu-btn").addClass("cfm-tab-active");
            triggerEl.addClass("cfm-tab-menu-item-active");
          } else if (triggerEl) {
            triggerEl.addClass("cfm-tab-active");
          } else {
            $("#cfm-overlay .cfm-tab[data-tab='" + tab + "']").addClass(
              "cfm-tab-active",
            );
            if (
              $("#cfm-overlay .cfm-tab-menu-item[data-tab='" + tab + "']")
                .length
            ) {
              $("#cfm-overlay .cfm-tab-menu-btn").addClass("cfm-tab-active");
              $(
                "#cfm-overlay .cfm-tab-menu-item[data-tab='" + tab + "']",
              ).addClass("cfm-tab-menu-item-active");
            }
          }
          setCfmMultiSelectMode(false);
          clearMultiSelect();
          setCfmMultiSelectRangeMode(false);
          $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
          $("#cfm-popup").removeClass("cfm-multisel-on");
          if (getCfmExportMode()) exitExportMode();
          if (getCfmResDeleteMode()) exitResDeleteMode();
          if (getCfmThemeNoteMode()) exitThemeNoteMode();
          if (getCfmBgNoteMode()) exitBgNoteMode();
          if (getCfmPresetNoteMode()) exitPresetNoteMode();
          if (getCfmWorldInfoNoteMode()) exitWorldInfoNoteMode();
          if (getCfmQrNoteMode()) exitQrNoteMode();
          if (getCfmPersonaNoteMode()) exitPersonaNoteMode();
          if (getCfmPresetRenameMode()) exitPresetRenameMode();
          if (getCfmWorldInfoRenameMode()) exitWorldInfoRenameMode();
          if (getCfmQrRenameMode()) exitQrRenameMode();
          $("#cfm-overlay")
            .find("#cfm-chars-view")
            .toggle(tab === "chars");
          $("#cfm-overlay")
            .find("#cfm-presets-view")
            .toggle(tab === "presets");
          $("#cfm-overlay")
            .find("#cfm-worldinfo-view")
            .toggle(tab === "worldinfo");
          $("#cfm-overlay")
            .find("#cfm-themes-view")
            .toggle(tab === "themes");
          $("#cfm-overlay")
            .find("#cfm-backgrounds-view")
            .toggle(tab === "backgrounds");
          $("#cfm-overlay")
            .find("#cfm-personas-view")
            .toggle(tab === "personas");
          $("#cfm-overlay")
            .find("#cfm-regex-view")
            .toggle(tab === "regex");
          $("#cfm-overlay")
            .find("#cfm-qr-view")
            .toggle(tab === "quickreply");
          if (tab === "chars") {
            $("#cfm-overlay").find("#cfm-btn-copymode").show();
            const btn = $("#cfm-btn-copymode");
            btn.toggleClass("cfm-copymode-active", getCfmCopyMode());
            btn.html(
              `<i class="fa-solid fa-${getCfmCopyMode() ? "copy" : "arrows-turn-to-dots"}"></i> ${getCfmCopyMode() ? "复制" : "移动"}`,
            );
          } else {
            $("#cfm-overlay").find("#cfm-btn-copymode").hide();
          }
          $("#cfm-overlay")
            .find("#cfm-global-search-bar")
            .toggle(tab === "chars");
          $("#cfm-overlay")
            .find("#cfm-chatlogs-search-bar")
            .toggle(tab === "chatlogs");
          $("#cfm-overlay")
            .find("#cfm-preset-search-bar")
            .toggle(tab === "presets");
          $("#cfm-overlay")
            .find("#cfm-worldinfo-search-bar")
            .toggle(tab === "worldinfo");
          $("#cfm-overlay")
            .find("#cfm-theme-search-bar")
            .toggle(tab === "themes");
          $("#cfm-overlay")
            .find("#cfm-bg-search-bar")
            .toggle(tab === "backgrounds");
          $("#cfm-overlay")
            .find("#cfm-persona-search-bar")
            .toggle(tab === "personas");
          $("#cfm-overlay")
            .find("#cfm-regex-search-bar")
            .toggle(tab === "regex");
          $("#cfm-overlay")
            .find("#cfm-qr-search-bar")
            .toggle(tab === "quickreply");
          $("#cfm-overlay .cfm-tab-menu-wrap").removeClass("cfm-tab-menu-open");
          $("#cfm-overlay .cfm-tab-menu-btn").attr("aria-expanded", "false");
          if (tab === "chars") renderRightPane();
          else if (tab === "presets") renderPresetsView();
          else if (tab === "worldinfo") renderWorldInfoView();
          else if (tab === "themes") renderThemesView();
          else if (tab === "backgrounds") renderBackgroundsView();
          else if (tab === "personas") renderPersonasView();
          else if (tab === "regex") renderRegexView();
          else if (tab === "quickreply") renderQRView();
        };
        tabsContainer
          .find(".cfm-tab[data-tab]")
          .on("click touchend", function (e) {
            e.preventDefault();
            syncTabSwitch($(this).data("tab"), $(this));
          });
        tabsContainer
          .find(".cfm-tab-menu-btn")
          .on("click touchend", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const wrap = $(this).closest(".cfm-tab-menu-wrap");
            const willOpen = !wrap.hasClass("cfm-tab-menu-open");
            $("#cfm-overlay .cfm-tab-menu-wrap").removeClass(
              "cfm-tab-menu-open",
            );
            $("#cfm-overlay .cfm-tab-menu-btn").attr("aria-expanded", "false");
            if (willOpen) {
              wrap.addClass("cfm-tab-menu-open");
              $(this).attr("aria-expanded", "true");
            }
          });
        tabsContainer
          .find(".cfm-tab-menu-item")
          .on("click touchend", function (e) {
            e.preventDefault();
            e.stopPropagation();
            syncTabSwitch($(this).data("tab"), $(this));
          });
      }
      // --- 刷新视图和工具栏 ---
      // 确保正确的视图显示
      $("#cfm-overlay")
        .find("#cfm-chars-view")
        .toggle(currentResourceType === "chars");
      $("#cfm-overlay")
        .find("#cfm-presets-view")
        .toggle(currentResourceType === "presets");
      $("#cfm-overlay")
        .find("#cfm-worldinfo-view")
        .toggle(currentResourceType === "worldinfo");
      $("#cfm-overlay")
        .find("#cfm-themes-view")
        .toggle(currentResourceType === "themes");
      $("#cfm-overlay")
        .find("#cfm-backgrounds-view")
        .toggle(currentResourceType === "backgrounds");
      $("#cfm-overlay")
        .find("#cfm-personas-view")
        .toggle(currentResourceType === "personas");
      $("#cfm-overlay")
        .find("#cfm-regex-view")
        .toggle(currentResourceType === "regex");
      $("#cfm-overlay")
        .find("#cfm-qr-view")
        .toggle(currentResourceType === "quickreply");
      // 确保正确的搜索栏显示
      $("#cfm-overlay")
        .find("#cfm-global-search-bar")
        .toggle(currentResourceType === "chars");
      $("#cfm-overlay")
        .find("#cfm-chatlogs-search-bar")
        .toggle(currentResourceType === "chatlogs");
      $("#cfm-overlay")
        .find("#cfm-preset-search-bar")
        .toggle(currentResourceType === "presets");
      $("#cfm-overlay")
        .find("#cfm-worldinfo-search-bar")
        .toggle(currentResourceType === "worldinfo");
      $("#cfm-overlay")
        .find("#cfm-theme-search-bar")
        .toggle(currentResourceType === "themes");
      $("#cfm-overlay")
        .find("#cfm-bg-search-bar")
        .toggle(currentResourceType === "backgrounds");
      $("#cfm-overlay")
        .find("#cfm-persona-search-bar")
        .toggle(currentResourceType === "personas");
      $("#cfm-overlay")
        .find("#cfm-regex-search-bar")
        .toggle(currentResourceType === "regex");
      $("#cfm-overlay")
        .find("#cfm-qr-search-bar")
        .toggle(currentResourceType === "quickreply");
      renderLeftTree();
      renderRightPane();
      if (currentResourceType === "presets") renderPresetsView();
      else if (currentResourceType === "worldinfo") renderWorldInfoView();
      else if (currentResourceType === "themes") renderThemesView();
      else if (currentResourceType === "backgrounds") renderBackgroundsView();
      else if (currentResourceType === "personas") renderPersonasView();
      else if (currentResourceType === "regex") renderRegexView();
      else if (currentResourceType === "quickreply") renderQRView();
      applyAllToolbarVisibility();
    }
  }

  return { showConfigPopup, closeConfigPopup };
}
