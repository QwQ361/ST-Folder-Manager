// 互斥模式统一清理层：clearAllExclusiveModes，重置所有互斥模式（多选/导出/删除/编辑/重命名/各资源备注）的状态与 DOM。
// Set 类型状态通过 deps 直接注入引用（仅调用 clear() 等修改方法）；布尔/null 类型通过 state getter/setter 注入。
export function createClearModesApi(deps) {
  const {
    $,
    clearMultiSelect,
    exitEditMode,
    exitPresetRenameMode,
    exitWorldInfoRenameMode,
    exitQrRenameMode,
    state,
    cfmExportSelected,
    cfmResDeleteSelected,
    cfmThemeNoteSelected,
    cfmBgNoteSelected,
    cfmThemeRenameSelected,
    cfmBgRenameSelected,
    cfmWorldInfoNoteSelected,
    cfmQrNoteSelected,
    cfmPresetNoteSelected,
    cfmPersonaNoteSelected,
    cfmChatlogNoteSelected,
    cfmChatlogRenameSelected,
  } = deps;

  function clearAllExclusiveModes() {
    // 多选模式
    if (state.cfmMultiSelectMode) {
      state.cfmMultiSelectMode = false;
      clearMultiSelect();
      state.cfmMultiSelectRangeMode = false;
      $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
      $("#cfm-popup").removeClass("cfm-multisel-on");
    }
    // 导出模式
    if (state.cfmExportMode) {
      state.cfmExportMode = false;
      cfmExportSelected.clear();
      state.cfmExportRangeMode = false;
      state.cfmExportLastClicked = null;
      $(".cfm-export-btn").removeClass("cfm-export-active");
      $(".cfm-export-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-file-export");
      $(".cfm-export-btn").attr("title", function () {
        if ($(this).attr("id") === "cfm-export-char-btn") return "导出角色卡";
        if ($(this).attr("id") === "cfm-export-chatlog-btn")
          return "导出聊天记录";
        if ($(this).attr("id") === "cfm-export-preset-btn") return "导出预设";
        if ($(this).attr("id") === "cfm-export-theme-btn") return "导出主题";
        if ($(this).attr("id") === "cfm-export-bg-btn") return "导出背景";
        if ($(this).attr("id") === "cfm-export-persona-btn") return "导出User";
        if ($(this).attr("id") === "cfm-export-regex-btn") return "导出正则";
        if ($(this).attr("id") === "cfm-export-qr-btn") return "导出快速回复集";
        return "导出世界书";
      });
      $(".cfm-popup").removeClass("cfm-export-mode");
    }
    // 删除模式
    if (state.cfmResDeleteMode) {
      state.cfmResDeleteMode = false;
      cfmResDeleteSelected.clear();
      state.cfmResDeleteRangeMode = false;
      state.cfmResDeleteLastClicked = null;
      $(".cfm-res-delete-btn").removeClass("cfm-res-delete-active");
      $(".cfm-res-delete-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-trash-can");
      $(".cfm-res-delete-btn").attr("title", function () {
        if ($(this).attr("id") === "cfm-res-delete-char-btn")
          return "删除角色卡";
        if ($(this).attr("id") === "cfm-res-delete-preset-btn")
          return "删除预设";
        if ($(this).attr("id") === "cfm-res-delete-theme-btn")
          return "删除主题";
        if ($(this).attr("id") === "cfm-res-delete-bg-btn") return "删除背景";
        if ($(this).attr("id") === "cfm-res-delete-persona-btn")
          return "删除User";
        if ($(this).attr("id") === "cfm-res-delete-regex-btn")
          return "删除正则";
        if ($(this).attr("id") === "cfm-res-delete-qr-btn")
          return "删除快速回复集";
        return "删除世界书";
      });
      $(".cfm-popup").removeClass("cfm-res-delete-mode");
    }
    // 编辑模式
    if (state.cfmEditMode) exitEditMode();
    // 重命名模式
    if (state.cfmPresetRenameMode) exitPresetRenameMode();
    if (state.cfmWorldInfoRenameMode) exitWorldInfoRenameMode();
    if (state.cfmQrRenameMode) exitQrRenameMode();
    // 主题备注模式
    if (state.cfmThemeNoteMode) {
      state.cfmThemeNoteMode = false;
      cfmThemeNoteSelected.clear();
      state.cfmThemeNoteRangeMode = false;
      state.cfmThemeNoteLastClicked = null;
      $("#cfm-theme-note-btn").removeClass("cfm-edit-active");
      $("#cfm-theme-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-theme-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-theme-note-mode");
    }
    // 背景备注模式
    if (state.cfmBgNoteMode) {
      state.cfmBgNoteMode = false;
      cfmBgNoteSelected.clear();
      state.cfmBgNoteRangeMode = false;
      state.cfmBgNoteLastClicked = null;
      $("#cfm-bg-note-btn").removeClass("cfm-edit-active");
      $("#cfm-bg-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-bg-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-bg-note-mode");
    }
    // 主题重命名模式
    if (state.cfmThemeRenameMode) {
      state.cfmThemeRenameMode = false;
      cfmThemeRenameSelected.clear();
      state.cfmThemeRenameRangeMode = false;
      state.cfmThemeRenameLastClicked = null;
      $("#cfm-theme-rename-btn").removeClass("cfm-edit-active");
      $("#cfm-theme-rename-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-i-cursor");
      $("#cfm-theme-rename-btn").attr("title", "重命名主题");
      $(".cfm-popup").removeClass("cfm-theme-rename-mode");
    }
    // 背景重命名模式
    if (state.cfmBgRenameMode) {
      state.cfmBgRenameMode = false;
      cfmBgRenameSelected.clear();
      state.cfmBgRenameRangeMode = false;
      state.cfmBgRenameLastClicked = null;
      $("#cfm-bg-rename-btn").removeClass("cfm-edit-active");
      $("#cfm-bg-rename-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-i-cursor");
      $("#cfm-bg-rename-btn").attr("title", "重命名背景");
      $(".cfm-popup").removeClass("cfm-bg-rename-mode");
    }
    // 世界书备注模式
    if (state.cfmWorldInfoNoteMode) {
      state.cfmWorldInfoNoteMode = false;
      cfmWorldInfoNoteSelected.clear();
      state.cfmWorldInfoNoteRangeMode = false;
      state.cfmWorldInfoNoteLastClicked = null;
      $("#cfm-worldinfo-note-btn").removeClass("cfm-edit-active");
      $("#cfm-worldinfo-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-worldinfo-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-worldinfo-note-mode");
    }
    // 快速回复备注模式
    if (state.cfmQrNoteMode) {
      state.cfmQrNoteMode = false;
      cfmQrNoteSelected.clear();
      state.cfmQrNoteRangeMode = false;
      state.cfmQrNoteLastClicked = null;
      $("#cfm-qr-note-btn").removeClass("cfm-edit-active");
      $("#cfm-qr-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-qr-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-qr-note-mode");
    }
    // 预设备注模式
    if (state.cfmPresetNoteMode) {
      state.cfmPresetNoteMode = false;
      cfmPresetNoteSelected.clear();
      state.cfmPresetNoteRangeMode = false;
      state.cfmPresetNoteLastClicked = null;
      $("#cfm-preset-note-btn").removeClass("cfm-edit-active");
      $("#cfm-preset-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-preset-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-preset-note-mode");
    }
    // User备注模式
    if (state.cfmPersonaNoteMode) {
      state.cfmPersonaNoteMode = false;
      cfmPersonaNoteSelected.clear();
      state.cfmPersonaNoteRangeMode = false;
      state.cfmPersonaNoteLastClicked = null;
      $("#cfm-persona-note-btn").removeClass("cfm-edit-active");
      $("#cfm-persona-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-persona-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-persona-note-mode");
    }
    if (state.cfmChatlogNoteMode) {
      state.cfmChatlogNoteMode = false;
      cfmChatlogNoteSelected.clear();
      state.cfmChatlogNoteRangeMode = false;
      state.cfmChatlogNoteLastClicked = null;
      $("#cfm-chatlog-note-btn").removeClass("cfm-edit-active");
      $("#cfm-chatlog-note-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-pen-to-square");
      $("#cfm-chatlog-note-btn").attr("title", "编辑备注");
      $(".cfm-popup").removeClass("cfm-chatlog-note-mode");
    }
    if (state.cfmChatlogRenameMode) {
      state.cfmChatlogRenameMode = false;
      cfmChatlogRenameSelected.clear();
      state.cfmChatlogRenameRangeMode = false;
      state.cfmChatlogRenameLastClicked = null;
      $("#cfm-chatlog-rename-btn").removeClass("cfm-edit-active");
      $("#cfm-chatlog-rename-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-i-cursor");
      $("#cfm-chatlog-rename-btn").attr("title", "重命名聊天记录");
      $(".cfm-popup").removeClass("cfm-chatlog-rename-mode");
    }
  }

  return { clearAllExclusiveModes };
}
