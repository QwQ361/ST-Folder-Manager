// 设置页整体渲染层：承接插件第二页面的外壳 DOM（#cfm-config-body 顶部分类 Tab 壳）、
// 顶部模块导航（设置/布局/新建文件夹三模块页挂载点）与当前激活 Tab 状态的读写。
// 可变状态 cfmConfigTopActiveTab 通过 getter/setter 注入，保证模块内写操作反映回 index.js 闭包。

export function createConfigTabShellCore(deps) {
  const {
    $,
    // 基础类型 getter/setter 注入（跨模块共享当前激活 Tab）
    getCfmConfigTopActiveTab,
    setCfmConfigTopActiveTab,
  } = deps;

  function createConfigTabShell(defaultTab = "settings") {
    const shell = $(`
      <div class="cfm-config-tab-shell">
        <div class="cfm-config-top-tabs">
          <button class="cfm-config-top-tab" data-tab="settings"><i class="fa-solid fa-sliders"></i> 设置</button>
          <button class="cfm-config-top-tab" data-tab="layout"><i class="fa-solid fa-table-cells-large"></i> 布局</button>
          <button class="cfm-config-top-tab" data-tab="create"><i class="fa-solid fa-folder-plus"></i> 新建文件夹</button>
        </div>
        <div class="cfm-config-tab-panel" data-panel="settings"></div>
        <div class="cfm-config-tab-panel" data-panel="layout"></div>
        <div class="cfm-config-tab-panel" data-panel="create"></div>
      </div>
    `);

    const switchTab = (tab) => {
      const currentTab = ["settings", "layout", "create"].includes(tab)
        ? tab
        : "settings";
      setCfmConfigTopActiveTab(currentTab);
      shell
        .find(".cfm-config-top-tab")
        .removeClass("cfm-mode-active cfm-config-top-tab-active");
      shell
        .find(`.cfm-config-top-tab[data-tab="${currentTab}"]`)
        .addClass("cfm-mode-active cfm-config-top-tab-active");
      shell.find(".cfm-config-tab-panel").hide();
      shell.find(`.cfm-config-tab-panel[data-panel="${currentTab}"]`).show();
    };

    let cfmConfigTopTabTouchStamp = 0;
    shell.find(".cfm-config-top-tab").on("click touchend", function (e) {
      if (e.type === "touchend") {
        cfmConfigTopTabTouchStamp = Date.now();
        e.preventDefault();
      } else if (Date.now() - cfmConfigTopTabTouchStamp < 450) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      switchTab($(this).data("tab"));
    });

    switchTab(defaultTab);

    return {
      shell,
      settingsPanel: shell.find('.cfm-config-tab-panel[data-panel="settings"]'),
      layoutPanel: shell.find('.cfm-config-tab-panel[data-panel="layout"]'),
      createPanel: shell.find('.cfm-config-tab-panel[data-panel="create"]'),
      switchTab,
    };
  }

  return { createConfigTabShell };
}
