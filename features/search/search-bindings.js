// 搜索绑定：主弹窗内 8 组搜索框的事件绑定（chars/presets/worldinfo/quickreply/themes/backgrounds/personas/regex）。
// 由 showMainPopup 在构建弹窗外壳后调用，将搜索框输入、清除、作用域/类型切换绑定到对应元素。
// 依赖注入：$、popup（jQuery 对象）、getDefaultSearchScope、executeGlobalSearch、
// executePresetSearch、executeWorldInfoSearch、executeQrSearch、executeThemeSearch、
// executeBgSearch、executePersonaSearch、executeRegexSearch、renderRightPane、
// renderPresetsView、renderWorldInfoView、renderQRView、renderThemesView、
// renderBackgroundsView、renderPersonasView、renderRegexView。

export function bindSearchInputs(popup, deps) {
  const {
    $,
    getDefaultSearchScope,
    executeGlobalSearch,
    executePresetSearch,
    executeWorldInfoSearch,
    executeQrSearch,
    executeThemeSearch,
    executeBgSearch,
    executePersonaSearch,
    executeRegexSearch,
    renderRightPane,
    renderPresetsView,
    renderWorldInfoView,
    renderQRView,
    renderThemesView,
    renderBackgroundsView,
    renderPersonasView,
    renderRegexView,
  } = deps;

  // 全局搜索框事件绑定
  popup.find("#cfm-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executeGlobalSearch();
  });
  popup.find("#cfm-global-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderRightPane();
  });
  const defaultSearchScope = getDefaultSearchScope();
  popup
    .find(
      "#cfm-search-scope, #cfm-preset-search-scope, #cfm-worldinfo-search-scope, #cfm-theme-search-scope, #cfm-bg-search-scope, #cfm-persona-search-scope, #cfm-regex-search-scope, #cfm-qr-search-scope",
    )
    .val(defaultSearchScope);

  popup.find("#cfm-search-scope").on("change", function () {
    executeGlobalSearch();
  });
  popup.find("#cfm-search-type").on("change", function () {
    const type = $(this).val();
    $("#cfm-global-search").attr(
      "placeholder",
      type === "folder" ? "搜索文件夹..." : "搜索角色...",
    );
    executeGlobalSearch();
  });

  // 预设搜索框事件绑定
  popup.find("#cfm-preset-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executePresetSearch();
  });
  popup.find("#cfm-preset-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-preset-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderPresetsView();
  });
  popup.find("#cfm-preset-search-scope").on("change", function () {
    executePresetSearch();
  });
  popup.find("#cfm-preset-search-type").on("change", function () {
    const type = $(this).val();
    $("#cfm-preset-global-search").attr(
      "placeholder",
      type === "folder" ? "搜索文件夹..." : "搜索预设...",
    );
    executePresetSearch();
  });

  // 世界书搜索框事件绑定
  popup.find("#cfm-worldinfo-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executeWorldInfoSearch();
  });
  popup
    .find("#cfm-worldinfo-search-clear")
    .on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $("#cfm-worldinfo-global-search").val("").focus();
      $(this)
        .closest(".cfm-search-input-wrapper")
        .removeClass("cfm-has-text");
      renderWorldInfoView();
    });
  popup.find("#cfm-worldinfo-search-scope").on("change", function () {
    executeWorldInfoSearch();
  });
  popup.find("#cfm-worldinfo-search-type").on("change", function () {
    const type = $(this).val();
    $("#cfm-worldinfo-global-search").attr(
      "placeholder",
      type === "folder" ? "搜索文件夹..." : "搜索世界书...",
    );
    executeWorldInfoSearch();
  });

  // 快速回复搜索框事件绑定
  popup.find("#cfm-qr-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executeQrSearch();
  });
  popup.find("#cfm-qr-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-qr-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderQRView();
  });
  popup.find("#cfm-qr-search-scope").on("change", function () {
    executeQrSearch();
  });
  popup.find("#cfm-qr-search-type").on("change", function () {
    const type = $(this).val();
    $("#cfm-qr-global-search").attr(
      "placeholder",
      type === "folder" ? "搜索文件夹..." : "搜索...",
    );
    executeQrSearch();
  });

  // 主题搜索框事件绑定
  popup.find("#cfm-theme-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executeThemeSearch();
  });
  popup.find("#cfm-theme-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-theme-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderThemesView();
  });
  // 背景搜索框事件绑定
  popup.find("#cfm-bg-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executeBgSearch();
  });
  popup.find("#cfm-bg-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-bg-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderBackgroundsView();
  });

  // User搜索框事件绑定
  popup.find("#cfm-persona-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executePersonaSearch();
  });
  popup.find("#cfm-persona-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-persona-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderPersonasView();
  });
  popup.find("#cfm-persona-search-scope").on("change", function () {
    executePersonaSearch();
  });
  popup.find("#cfm-persona-search-type").on("change", function () {
    const type = $(this).val();
    $("#cfm-persona-global-search").attr(
      "placeholder",
      type === "folder" ? "搜索文件夹..." : "搜索User...",
    );
    executePersonaSearch();
  });

  // 正则搜索框事件绑定
  popup.find("#cfm-regex-global-search").on("input", function () {
    const hasText = $(this).val().trim().length > 0;
    $(this)
      .closest(".cfm-search-input-wrapper")
      .toggleClass("cfm-has-text", hasText);
    executeRegexSearch();
  });
  popup.find("#cfm-regex-search-clear").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#cfm-regex-global-search").val("").focus();
    $(this).closest(".cfm-search-input-wrapper").removeClass("cfm-has-text");
    renderRegexView();
  });
  popup.find("#cfm-regex-search-scope").on("change", function () {
    executeRegexSearch();
  });
  popup.find("#cfm-regex-search-type").on("change", function () {
    const type = $(this).val();
    $("#cfm-regex-global-search").attr(
      "placeholder",
      type === "folder" ? "搜索文件夹..." : "搜索...",
    );
    executeRegexSearch();
  });
}
