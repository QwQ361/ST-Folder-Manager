// 设置页共享 section 渲染层：承接各资源页配置弹窗中复用的共享配置分区渲染函数，
// 如自定义顶栏图标、默认打开页面、默认搜索范围、正则互通模式、条目缝合跳转策略、
// 移动端避让/全屏、合并同名 User、界面语言切换等。
// ST 全局（extension_settings/extensionName/getContext/window）经 deps 注入，避免模块顶层裸引用全局。

export function createSharedSectionsCore(deps) {
  const {
    $,
    getContext,
    extension_settings,
    extensionName,
    window,
    // 函数依赖
    getButtonMode,
    switchButtonMode,
    detectThemeIcons,
    extractUrlFromCss,
    applyCustomIcon,
    applyTopbarIconFromConfig,
    toCssUrl,
    cfmConfirm,
    cfmToastr,
    escapeHtml,
    ensureResourceSettings,
    getEntryTransferPostActionMode,
    setEntryTransferPostActionMode,
    renderPersonasView,
    onBridgeEnabledChange,
  } = deps;

  function getDefaultSearchScope() {
    const scope = extension_settings[extensionName].defaultSearchScope;
    return scope === "all" ? "all" : "current";
  }

  function getDefaultRegexTransferMode() {
    ensureResourceSettings();
    return extension_settings[extensionName].defaultRegexTransferMode === "copy"
      ? "copy"
      : "move";
  }

  // ==================== 共享：按钮位置（三模块页共用） ====================
  function renderButtonModeSection(body) {
    const currentMode = getButtonMode();
    const section = $(`
      <div class="cfm-config-section cfm-mode-section">
        <label>按钮位置</label>
        <div class="cfm-mode-toggle">
          <button class="cfm-mode-btn ${currentMode === "topbar" ? "cfm-mode-active" : ""}" data-mode="topbar"><i class="fa-solid fa-bars"></i> 固定在顶栏</button>
          <button class="cfm-mode-btn ${currentMode === "float" ? "cfm-mode-active" : ""}" data-mode="float"><i class="fa-solid fa-up-down-left-right"></i> 浮动按钮</button>
          <button class="cfm-mode-btn ${currentMode === "wand" ? "cfm-mode-active" : ""}" data-mode="wand"><i class="fa-solid fa-magic-wand-sparkles"></i> 魔术棒菜单</button>
        </div>
      </div>
    `);
    section.find(".cfm-mode-btn").on("click touchend", function (e) {
      e.preventDefault();
      const newMode = $(this).data("mode");
      if (newMode === getButtonMode()) return;
      switchButtonMode(newMode);
      const modeLabels = {
        topbar: "已切换为顶栏按钮",
        float: "已切换为浮动按钮",
        wand: "已切换为魔术棒菜单",
      };
      cfmToastr.success(modeLabels[newMode] || "已切换");
      section.find(".cfm-mode-btn").removeClass("cfm-mode-active");
      $(this).addClass("cfm-mode-active");
    });
    body.append(section);
  }

  // ==================== 共享：自定义顶栏图标配置区域 ====================
  function renderTopbarIconConfigSection(body) {
    const currentMode = getButtonMode();
    if (currentMode !== "topbar") return;

    const { icons: themeIcons, uniqueUrls } = detectThemeIcons();
    const hasTheme = uniqueUrls.length > 0;
    const savedIconUrl =
      extension_settings[extensionName].customTopbarIcon || "";
    const isAutoMode = !savedIconUrl && hasTheme;
    const autoUrl = hasTheme
      ? extractUrlFromCss(
          themeIcons["persona-management-button"] ||
            Object.values(themeIcons)[0],
        )
      : "";
    const displayUrl = savedIconUrl || (isAutoMode ? autoUrl : "");

    // 构建下拉项：每个唯一URL + 使用该URL的按钮名称映射
    const parentIdNameMap = {
      "ai-config-button": "AI配置",
      "sys-settings-button": "API连接",
      "advanced-formatting-button": "格式化",
      "WI-SP-button": "世界书",
      "user-settings-button": "用户设置",
      logo_block: "Logo",
      "extensions-settings-button": "扩展",
      table_database_settings_drawer: "事件表",
      "persona-management-button": "用户设定",
      rightNavHolder: "角色管理",
      "backgrounds-button": "背景",
    };
    let dropdownItemsHtml = "";
    for (const url of uniqueUrls) {
      const pureUrl = extractUrlFromCss(url);
      const users = Object.entries(themeIcons)
        .filter(([, v]) => v === url)
        .map(([k]) => parentIdNameMap[k] || k)
        .join("、");
      const isSelected = pureUrl === displayUrl;
      dropdownItemsHtml += `<div class="cfm-icon-dropdown-item ${isSelected ? "cfm-icon-selected" : ""}" data-url="${escapeHtml(pureUrl)}">
        <div class="cfm-icon-preview" style="background-image:url('${escapeHtml(pureUrl)}')"></div>
        <span class="cfm-icon-dropdown-label" title="${escapeHtml(pureUrl)}">${escapeHtml(pureUrl.split("/").pop())}</span>
        <span class="cfm-icon-dropdown-users">${escapeHtml(users)}</span>
      </div>`;
    }

    const iconSection = $(`
      <div class="cfm-config-section cfm-icon-config-section">
        <label>自定义顶栏图标</label>
        <div class="cfm-icon-input-row">
          <input type="text" id="cfm-icon-url-input" placeholder="${hasTheme ? "已自动检测美化主题图标" : "输入图标URL（留空使用默认图标）"}" value="${escapeHtml(savedIconUrl)}" />
          ${
            hasTheme
              ? `<div class="cfm-icon-dropdown-wrapper">
            <button class="cfm-icon-dropdown-btn" id="cfm-icon-dropdown-toggle" title="从美化主题中选择图标"><i class="fa-solid fa-caret-down"></i></button>
            <div class="cfm-icon-dropdown-menu" id="cfm-icon-dropdown-menu">
              ${dropdownItemsHtml}
            </div>
          </div>`
              : ""
          }
          <button class="cfm-icon-clear-btn" id="cfm-icon-clear" title="清除自定义图标"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="cfm-icon-status" id="cfm-icon-status">
          <span class="cfm-icon-status-dot ${displayUrl ? "cfm-status-active" : "cfm-status-inactive"}"></span>
          ${displayUrl ? (isAutoMode ? "自动使用美化主题图标（用户设定管理）" : "使用自定义图标") : hasTheme ? "已检测到美化主题但未应用" : "使用默认图标"}
        </div>
        <div class="cfm-icon-config-hint">${hasTheme ? `检测到 ${uniqueUrls.length} 个美化主题图标，可从下拉菜单选择或手动输入URL` : "未检测到美化主题图标替换。启用美化主题后会自动检测并适配"}</div>
      </div>
    `);

    // 下拉菜单切换
    iconSection.find("#cfm-icon-dropdown-toggle").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-icon-dropdown-menu").toggleClass("cfm-dropdown-open");
    });
    // 点击其他地方关闭下拉
    $(document).on("click.cfmIconDropdown", () => {
      $("#cfm-icon-dropdown-menu").removeClass("cfm-dropdown-open");
    });

    // 选择下拉项
    iconSection
      .find(".cfm-icon-dropdown-item")
      .on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const url = $(this).data("url");
        $("#cfm-icon-url-input").val(url);
        $("#cfm-icon-dropdown-menu").removeClass("cfm-dropdown-open");
        // 立即应用并保存
        extension_settings[extensionName].customTopbarIcon = url;
        getContext().saveSettingsDebounced();
        applyCustomIcon(toCssUrl(url));
        // 更新选中状态
        iconSection
          .find(".cfm-icon-dropdown-item")
          .removeClass("cfm-icon-selected");
        $(this).addClass("cfm-icon-selected");
        // 更新状态提示
        $("#cfm-icon-status").html(
          `<span class="cfm-icon-status-dot cfm-status-active"></span> 使用自定义图标`,
        );
      });

    // 手动输入URL后回车应用
    iconSection.find("#cfm-icon-url-input").on("change", function () {
      const url = $(this).val().trim();
      extension_settings[extensionName].customTopbarIcon = url;
      getContext().saveSettingsDebounced();
      if (url) {
        applyCustomIcon(toCssUrl(url));
        $("#cfm-icon-status").html(
          `<span class="cfm-icon-status-dot cfm-status-active"></span> 使用自定义图标`,
        );
      } else {
        // 清空输入 → 回到自动检测模式
        applyTopbarIconFromConfig();
        const autoActive = hasTheme;
        $("#cfm-icon-status").html(
          `<span class="cfm-icon-status-dot ${autoActive ? "cfm-status-active" : "cfm-status-inactive"}"></span> ${autoActive ? "自动使用美化主题图标（用户设定管理）" : "使用默认图标"}`,
        );
      }
      // 更新下拉菜单选中状态
      iconSection.find(".cfm-icon-dropdown-item").each(function () {
        $(this).toggleClass("cfm-icon-selected", $(this).data("url") === url);
      });
    });

    // 清除按钮
    iconSection.find("#cfm-icon-clear").on("click touchend", (e) => {
      e.preventDefault();
      if (!cfmConfirm("确认清除自定义图标吗？")) return;
      $("#cfm-icon-url-input").val("");
      extension_settings[extensionName].customTopbarIcon = "";
      getContext().saveSettingsDebounced();
      applyTopbarIconFromConfig();
      iconSection
        .find(".cfm-icon-dropdown-item")
        .removeClass("cfm-icon-selected");
      const autoActive = hasTheme;
      $("#cfm-icon-status").html(
        `<span class="cfm-icon-status-dot ${autoActive ? "cfm-status-active" : "cfm-status-inactive"}"></span> ${autoActive ? "自动使用美化主题图标（用户设定管理）" : "使用默认图标"}`,
      );
    });

    body.append(iconSection);
  }

  // ==================== 共享：默认打开页面配置区域 ====================
  function renderDefaultPageConfigSection(body) {
    const saved = extension_settings[extensionName].defaultOpenPage || "chars";
    const options = [
      { value: "chars", label: "角色卡", icon: "fa-users" },
      { value: "worldinfo", label: "世界书", icon: "fa-book-atlas" },
      { value: "presets", label: "预设", icon: "fa-sliders" },
      { value: "themes", label: "美化", icon: "fa-palette" },
      { value: "backgrounds", label: "背景", icon: "fa-panorama" },
      { value: "personas", label: "User", icon: "fa-user-pen" },
      { value: "regex", label: "正则", icon: "fa-code" },
      { value: "quickreply", label: "QR", icon: "fa-reply" },
      { value: "last", label: "记住上次页面", icon: "fa-clock-rotate-left" },
    ];

    let optionsHtml = options
      .map(
        (o) =>
          `<div class="cfm-default-page-option ${saved === o.value ? "cfm-default-page-active" : ""}" data-value="${o.value}" title="${o.value === "last" ? "每次打开时恢复到上次关闭时的页面和文件夹" : "每次打开时显示" + o.label + "页面"}"><i class="fa-solid ${o.icon}"></i><span>${o.label}</span></div>`,
      )
      .join("");

    const section = $(`
      <div class="cfm-config-section cfm-default-page-section">
        <label>默认打开页面</label>
        <div class="cfm-default-page-options">
          ${optionsHtml}
        </div>
        <div class="cfm-icon-config-hint">${saved === "last" ? "每次打开插件时，将恢复到上次关闭时的页面和文件夹位置" : "每次打开插件时，默认显示" + options.find((o) => o.value === saved).label + "页面"}</div>
      </div>
    `);

    section.find(".cfm-default-page-option").on("click touchend", function (e) {
      e.preventDefault();
      const value = $(this).data("value");
      extension_settings[extensionName].defaultOpenPage = value;
      getContext().saveSettingsDebounced();
      section
        .find(".cfm-default-page-option")
        .removeClass("cfm-default-page-active");
      $(this).addClass("cfm-default-page-active");
      const label = options.find((o) => o.value === value).label;
      section
        .find(".cfm-icon-config-hint")
        .text(
          value === "last"
            ? "每次打开插件时，将恢复到上次关闭时的页面和文件夹位置"
            : "每次打开插件时，默认显示" + label + "页面",
        );
    });

    body.append(section);
  }

  // ==================== 共享：默认搜索范围 ====================
  function renderDefaultSearchScopeSection(body) {
    const current = getDefaultSearchScope();
    const section = $(`
      <div class="cfm-config-section cfm-default-page-section">
        <label>默认搜索范围</label>
        <div class="cfm-default-page-options">
          <div class="cfm-default-page-option cfm-search-scope-option ${current === "current" ? "cfm-default-page-active" : ""}" data-value="current" title="默认只搜索当前选中文件夹及其子文件夹">
            <i class="fa-solid fa-folder-tree"></i><span>当前文件夹</span>
          </div>
          <div class="cfm-default-page-option cfm-search-scope-option ${current === "all" ? "cfm-default-page-active" : ""}" data-value="all" title="默认搜索全部文件夹和资源">
            <i class="fa-solid fa-globe"></i><span>全部文件夹</span>
          </div>
        </div>
        <div class="cfm-icon-config-hint">${current === "all" ? "打开搜索时，默认在全部文件夹中搜索。" : "打开搜索时，默认只在当前文件夹范围内搜索。"}</div>
      </div>
    `);

    section.find(".cfm-search-scope-option").on("click touchend", function (e) {
      e.preventDefault();
      const value = $(this).data("value") === "all" ? "all" : "current";
      extension_settings[extensionName].defaultSearchScope = value;
      getContext().saveSettingsDebounced();
      section
        .find(".cfm-search-scope-option")
        .removeClass("cfm-default-page-active");
      $(this).addClass("cfm-default-page-active");
      section
        .find(".cfm-icon-config-hint")
        .text(
          value === "all"
            ? "打开搜索时，默认在全部文件夹中搜索。"
            : "打开搜索时，默认只在当前文件夹范围内搜索。",
        );
      cfmToastr.success(
        value === "all"
          ? "默认搜索范围已切换为全部文件夹"
          : "默认搜索范围已切换为当前文件夹",
      );
    });

    body.append(section);
  }

  // ==================== 共享：正则互通默认选择模式 ====================
  function renderDefaultRegexTransferModeSection(body) {
    const current = getDefaultRegexTransferMode();
    const section = $(`
      <div class="cfm-config-section cfm-default-page-section">
        <label>正则互通默认选择模式</label>
        <div class="cfm-default-page-options">
          <div class="cfm-default-page-option cfm-regex-transfer-mode-option ${current === "move" ? "cfm-default-page-active" : ""}" data-value="move" title="互通正则时默认选中移动">
            <i class="fa-solid fa-arrow-right-arrow-left"></i><span>移动</span>
          </div>
          <div class="cfm-default-page-option cfm-regex-transfer-mode-option ${current === "copy" ? "cfm-default-page-active" : ""}" data-value="copy" title="互通正则时默认选中复制">
            <i class="fa-solid fa-copy"></i><span>复制</span>
          </div>
        </div>
        <div class="cfm-icon-config-hint">${current === "copy" ? "打开互通正则弹窗时，默认选中复制。" : "打开互通正则弹窗时，默认选中移动。"}</div>
      </div>
    `);

    section
      .find(".cfm-regex-transfer-mode-option")
      .on("click touchend", function (e) {
        e.preventDefault();
        const value = $(this).data("value") === "copy" ? "copy" : "move";
        ensureResourceSettings();
        extension_settings[extensionName].defaultRegexTransferMode = value;
        getContext().saveSettingsDebounced();
        section
          .find(".cfm-regex-transfer-mode-option")
          .removeClass("cfm-default-page-active");
        $(this).addClass("cfm-default-page-active");
        section
          .find(".cfm-icon-config-hint")
          .text(
            value === "copy"
              ? "打开互通正则弹窗时，默认选中复制。"
              : "打开互通正则弹窗时，默认选中移动。",
          );
        cfmToastr.success(
          value === "copy"
            ? "正则互通默认模式已切换为复制"
            : "正则互通默认模式已切换为移动",
        );
      });

    body.append(section);
  }

  // ==================== 共享：条目缝合完成后的跳转策略 ====================
  function renderEntryTransferPostActionSection(body) {
    const saved = getEntryTransferPostActionMode();
    const options = [
      {
        value: "ask",
        label: "每次询问",
        icon: "fa-circle-question",
        hint: "每次条目缝合完成后弹出提示，由你决定是否跳转到目标预设/世界书。",
      },
      {
        value: "target",
        label: "自动跳到目标",
        icon: "fa-arrow-up-right-from-square",
        hint: "条目缝合完成后不再弹窗，直接跳到刚刚接收条目的目标预设/世界书。",
      },
      {
        value: "origin",
        label: "停留当前页",
        icon: "fa-location-dot",
        hint: "条目缝合完成后不再弹窗，继续停留在当前页面。",
      },
    ];

    const optionsHtml = options
      .map(
        (o) =>
          `<div class="cfm-default-page-option cfm-transfer-post-action-option ${saved === o.value ? "cfm-default-page-active" : ""}" data-value="${o.value}" title="${escapeHtml(o.hint)}"><i class="fa-solid ${o.icon}"></i><span>${o.label}</span></div>`,
      )
      .join("");

    const currentHint = options.find((o) => o.value === saved)?.hint || "";
    const section = $(`
      <div class="cfm-config-section cfm-default-page-section">
        <label>条目缝合完成后</label>
        <div class="cfm-default-page-options">
          ${optionsHtml}
        </div>
        <div class="cfm-icon-config-hint">${escapeHtml(currentHint)}</div>
      </div>
    `);

    section
      .find(".cfm-transfer-post-action-option")
      .on("click touchend", function (e) {
        e.preventDefault();
        const value = $(this).data("value");
        setEntryTransferPostActionMode(value, true);
        section
          .find(".cfm-transfer-post-action-option")
          .removeClass("cfm-default-page-active");
        $(this).addClass("cfm-default-page-active");
        const option = options.find((o) => o.value === value);
        section.find(".cfm-icon-config-hint").text(option?.hint || "");
      });

    body.append(section);
  }

  // ==================== 共享：移动端顶部栏避让开关 ====================
  function renderMobileTopbarAvoidSection(body) {
    const current =
      extension_settings[extensionName].mobileTopbarAvoid !== false;
    const section = $(`
      <div class="cfm-config-section">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="cfm-mobile-topbar-avoid" ${current ? "checked" : ""}>
          <span>移动端避让顶部栏</span>
        </label>
        <div class="cfm-icon-config-hint">开启后，插件弹窗从酒馆顶部栏下方展开，不遮挡顶部栏按钮；关闭则全屏覆盖。仅影响移动端。</div>
      </div>
    `);
    section.find("#cfm-mobile-topbar-avoid").on("change", function () {
      const checked = $(this).prop("checked");
      extension_settings[extensionName].mobileTopbarAvoid = checked;
      getContext().saveSettingsDebounced();
      // 实时更新当前已打开的 overlay
      if (window.innerWidth <= 768) {
        $("#cfm-overlay").toggleClass("cfm-topbar-avoid", checked);
      }
      cfmToastr.success(checked ? "已开启顶部栏避让" : "已关闭顶部栏避让");
    });
    body.append(section);
  }

  // ==================== 共享：合并同名 User 开关 ====================
  function renderMergeSameNameUserSection(body) {
    const current = !!extension_settings[extensionName].mergeSameNameUser;
    const section = $(`
      <div class="cfm-config-section">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="cfm-merge-same-name-user" ${current ? "checked" : ""}>
          <span>是否合并同名user</span>
        </label>
        <div class="cfm-icon-config-hint">开启后，User页中同名的User会被合并为一个“叠堆”条目（叠加显示头像），点击展开可查看并切换其中的具体User。</div>
      </div>
    `);
    section.find("#cfm-merge-same-name-user").on("change", function () {
      const checked = $(this).prop("checked");
      extension_settings[extensionName].mergeSameNameUser = checked;
      getContext().saveSettingsDebounced();
      cfmToastr.success(checked ? "已开启合并同名User" : "已关闭合并同名User");
      // 立即刷新 User 视图（如果当前已打开）
      if (
        typeof renderPersonasView === "function" &&
        $("#cfm-overlay").length > 0
      ) {
        try {
          renderPersonasView();
        } catch (e) {}
      }
    });
    body.append(section);
  }

  // ==================== 共享：移动端全屏模式设置 ====================
  function renderMobileFullscreenSection(body) {
    const currentMode =
      extension_settings[extensionName].mobileFullscreenMode || "to-search";
    const section = $(`
      <div class="cfm-config-section">
        <div style="font-weight:600;margin-bottom:6px;">移动端下栏全屏模式</div>
        <div class="cfm-icon-config-hint" style="margin-bottom:8px;">拖动下栏至顶部触发全屏时，下栏显示的范围。仅影响移动端。</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="radio" name="cfm-mobile-fs-mode" value="to-search" ${currentMode === "to-search" ? "checked" : ""}>
            <span>全屏至搜索栏</span>
          </label>
          <div class="cfm-icon-config-hint" style="margin-left:24px;margin-top:-2px;">隐藏文件夹面板，保留标题栏、标签页和搜索栏（默认）</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="radio" name="cfm-mobile-fs-mode" value="to-tabs" ${currentMode === "to-tabs" ? "checked" : ""}>
            <span>全屏至标签页</span>
          </label>
          <div class="cfm-icon-config-hint" style="margin-left:24px;margin-top:-2px;">隐藏文件夹面板和搜索栏，保留标题栏和标签页</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="radio" name="cfm-mobile-fs-mode" value="true-full" ${currentMode === "true-full" ? "checked" : ""}>
            <span>真全屏</span>
          </label>
          <div class="cfm-icon-config-hint" style="margin-left:24px;margin-top:-2px;">下栏完全覆盖整个弹窗，包括标签页和标题栏</div>
        </div>
      </div>
    `);
    section.find("input[name='cfm-mobile-fs-mode']").on("change", function () {
      const val = $(this).val();
      extension_settings[extensionName].mobileFullscreenMode = val;
      getContext().saveSettingsDebounced();
      const labels = {
        "to-search": "全屏至搜索栏",
        "to-tabs": "全屏至标签页",
        "true-full": "真全屏",
      };
      cfmToastr.success(
        "已切换为：" + (labels[val] || val) + "（下次进入全屏时生效）",
      );
    });

    body.append(section);
  }

  // ==================== 共享：界面语言切换（简体/繁体中文） ====================
  function renderLanguageSwitchSection(body) {
    const current = extension_settings[extensionName].language || "zh-CN";
    const isTW = current === "zh-TW";
    const section = $(`
      <div class="cfm-config-section" data-cfm-no-convert>
        <label>${isTW ? "介面語言" : "界面语言"}</label>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <button class="cfm-lang-btn menu_button ${!isTW ? "cfm-mode-active" : ""}" data-lang="zh-CN" style="flex:1;">简体中文</button>
          <button class="cfm-lang-btn menu_button ${isTW ? "cfm-mode-active" : ""}" data-lang="zh-TW" style="flex:1;">繁體中文</button>
        </div>
        <div class="cfm-icon-config-hint">${isTW ? "切換插件介面顯示的中文字體。切換後需重新打開插件生效。" : "切换插件界面显示的中文字体。切换后需重新打开插件生效。"}</div>
      </div>
    `);
    section.find(".cfm-lang-btn").on("click touchend", function (e) {
      if (e.type === "touchend") e.preventDefault();
      const lang = $(this).data("lang");
      if (lang === (extension_settings[extensionName].language || "zh-CN"))
        return;
      extension_settings[extensionName].language = lang;
      getContext().saveSettingsDebounced();
      section.find(".cfm-lang-btn").removeClass("cfm-mode-active");
      $(this).addClass("cfm-mode-active");
      cfmToastr.success(
        lang === "zh-TW"
          ? "已切換為繁體中文，重新打開插件後生效"
          : "已切换为简体中文，重新打开插件后生效",
      );
    });
    body.append(section);
  }

  // ==================== 共享：本地备份桥接连接开关 ====================
  // 默认关闭，避免无本地后台服务时每次启动都向 127.0.0.1:36925 发起轮询报错。
  function renderBridgeConnectionSection(body) {
    const enabled = extension_settings[extensionName].bridgeEnabled === true;
    const section = $(`
      <div class="cfm-config-section">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:normal;">
          <input type="checkbox" id="cfm-bridge-enabled" ${enabled ? "checked" : ""}>
          <span><i class="fa-solid fa-link"></i> 连接本地备份桥接服务</span>
        </label>
        <div class="cfm-create-tag-hint">开启后插件会连接本机 127.0.0.1:36925 的备份桥接服务并轮询同步状态。若本机未运行对应的后台程序，请保持关闭，避免持续出现连接失败报错。</div>
      </div>
    `);
    section.find("#cfm-bridge-enabled").on("change", function () {
      const next = !!$(this).prop("checked");
      if (typeof onBridgeEnabledChange === "function") onBridgeEnabledChange(next);
      cfmToastr.success(
        next
          ? "已开启本地备份桥接连接"
          : "已关闭本地备份桥接连接",
      );
    });
    body.append(section);
  }

  return {
    getDefaultSearchScope,
    getDefaultRegexTransferMode,
    renderButtonModeSection,
    renderTopbarIconConfigSection,
    renderDefaultPageConfigSection,
    renderDefaultSearchScopeSection,
    renderDefaultRegexTransferModeSection,
    renderEntryTransferPostActionSection,
    renderMobileTopbarAvoidSection,
    renderMergeSameNameUserSection,
    renderMobileFullscreenSection,
    renderLanguageSwitchSection,
    renderBridgeConnectionSection,
  };
}
