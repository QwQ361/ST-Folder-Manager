// 备注/重命名按钮事件绑定：承接 showMainPopup 拆分后的各资源类型
// 备注（note）与重命名（rename）模式切换按钮事件。
// 覆盖资源：主题、背景、预设、世界书、快速回复、聊天记录、User(persona)。
//
// 统一行为模式：
//   1. 若对应模式未激活 → 调用 enterXxxMode() 进入模式（按钮变活跃色，等待用户点选条目）
//   2. 若模式已激活且未选中条目 → warning toast 提示先选择
//   3. 若模式已激活且有选中条目 → executeXxx(names).then(() => exitXxxMode())
//
// 依赖注入：26 个状态 getter（Mode/Selected）、39 个业务函数（execute/enter/exit）、cfmToastr。

export function bindNoteRenameButtonEvents(popup, deps) {
  const {
    cfmToastr,
    // 主题 note
    getCfmThemeNoteMode,
    getCfmThemeNoteSelected,
    executeThemeNoteEdit,
    exitThemeNoteMode,
    enterThemeNoteMode,
    // 背景 note
    getCfmBgNoteMode,
    getCfmBgNoteSelected,
    executeBgNoteEdit,
    exitBgNoteMode,
    enterBgNoteMode,
    // 预设 note
    getCfmPresetNoteMode,
    getCfmPresetNoteSelected,
    executePresetNoteEdit,
    exitPresetNoteMode,
    enterPresetNoteMode,
    // 世界书 note
    getCfmWorldInfoNoteMode,
    getCfmWorldInfoNoteSelected,
    executeWorldInfoNoteEdit,
    exitWorldInfoNoteMode,
    enterWorldInfoNoteMode,
    // 快速回复 note
    getCfmQrNoteMode,
    getCfmQrNoteSelected,
    executeQrNoteEdit,
    exitQrNoteMode,
    enterQrNoteMode,
    // 聊天记录 note
    getCfmChatlogNoteMode,
    getCfmChatlogNoteSelected,
    executeChatlogNoteEdit,
    exitChatlogNoteMode,
    enterChatlogNoteMode,
    // 聊天记录 rename
    getCfmChatlogRenameMode,
    getCfmChatlogRenameSelected,
    executeChatlogRename,
    exitChatlogRenameMode,
    enterChatlogRenameMode,
    // 快速回复 rename
    getCfmQrRenameMode,
    getCfmQrRenameSelected,
    executeQrRename,
    exitQrRenameMode,
    enterQrRenameMode,
    // User(persona) note
    getCfmPersonaNoteMode,
    getCfmPersonaNoteSelected,
    executePersonaNoteEdit,
    exitPersonaNoteMode,
    enterPersonaNoteMode,
    // 预设 rename
    getCfmPresetRenameMode,
    getCfmPresetRenameSelected,
    executePresetRename,
    exitPresetRenameMode,
    enterPresetRenameMode,
    // 世界书 rename
    getCfmWorldInfoRenameMode,
    getCfmWorldInfoRenameSelected,
    executeWorldInfoRename,
    exitWorldInfoRenameMode,
    enterWorldInfoRenameMode,
    // 主题 rename
    getCfmThemeRenameMode,
    getCfmThemeRenameSelected,
    executeThemeRename,
    exitThemeRenameMode,
    enterThemeRenameMode,
    // 背景 rename
    getCfmBgRenameMode,
    getCfmBgRenameSelected,
    executeBgRename,
    exitBgRenameMode,
    enterBgRenameMode,
  } = deps;

  // 统一的"备注/重命名"模式切换按钮绑定
  const bindModeToggle = (
    selector,
    getMode,
    getSelected,
    warningMsg,
    execute,
    exitMode,
    enterMode,
  ) => {
    popup.find(selector).on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (getMode()) {
        if (getSelected().size === 0) {
          cfmToastr.warning(warningMsg);
          return;
        }
        const names = Array.from(getSelected());
        execute(names).then(() => exitMode());
      } else {
        enterMode();
      }
    });
  };

  // 主题备注编辑按钮
  bindModeToggle(
    "#cfm-theme-note-btn",
    getCfmThemeNoteMode,
    getCfmThemeNoteSelected,
    "请先选择要编辑备注的主题",
    executeThemeNoteEdit,
    exitThemeNoteMode,
    enterThemeNoteMode,
  );

  // 背景备注编辑按钮
  bindModeToggle(
    "#cfm-bg-note-btn",
    getCfmBgNoteMode,
    getCfmBgNoteSelected,
    "请先选择要编辑备注的背景",
    executeBgNoteEdit,
    exitBgNoteMode,
    enterBgNoteMode,
  );

  // 预设备注编辑按钮
  bindModeToggle(
    "#cfm-preset-note-btn",
    getCfmPresetNoteMode,
    getCfmPresetNoteSelected,
    "请先选择要编辑备注的预设",
    executePresetNoteEdit,
    exitPresetNoteMode,
    enterPresetNoteMode,
  );

  // 世界书备注编辑按钮
  bindModeToggle(
    "#cfm-worldinfo-note-btn",
    getCfmWorldInfoNoteMode,
    getCfmWorldInfoNoteSelected,
    "请先选择要编辑备注的世界书",
    executeWorldInfoNoteEdit,
    exitWorldInfoNoteMode,
    enterWorldInfoNoteMode,
  );

  // 快速回复备注编辑按钮
  bindModeToggle(
    "#cfm-qr-note-btn",
    getCfmQrNoteMode,
    getCfmQrNoteSelected,
    "请先选择要编辑备注的快速回复集",
    executeQrNoteEdit,
    exitQrNoteMode,
    enterQrNoteMode,
  );

  // 聊天记录备注编辑按钮
  bindModeToggle(
    "#cfm-chatlog-note-btn",
    getCfmChatlogNoteMode,
    getCfmChatlogNoteSelected,
    "请先选择要编辑备注的聊天记录",
    executeChatlogNoteEdit,
    exitChatlogNoteMode,
    enterChatlogNoteMode,
  );

  // 聊天记录重命名按钮
  bindModeToggle(
    "#cfm-chatlog-rename-btn",
    getCfmChatlogRenameMode,
    getCfmChatlogRenameSelected,
    "请先选择要重命名的聊天记录",
    executeChatlogRename,
    exitChatlogRenameMode,
    enterChatlogRenameMode,
  );

  // 快速回复重命名按钮
  bindModeToggle(
    "#cfm-qr-rename-btn",
    getCfmQrRenameMode,
    getCfmQrRenameSelected,
    "请先选择要重命名的快速回复集",
    executeQrRename,
    exitQrRenameMode,
    enterQrRenameMode,
  );

  // User备注编辑按钮
  bindModeToggle(
    "#cfm-persona-note-btn",
    getCfmPersonaNoteMode,
    getCfmPersonaNoteSelected,
    "请先选择要编辑备注的User",
    executePersonaNoteEdit,
    exitPersonaNoteMode,
    enterPersonaNoteMode,
  );

  // 预设重命名按钮
  bindModeToggle(
    "#cfm-preset-rename-btn",
    getCfmPresetRenameMode,
    getCfmPresetRenameSelected,
    "请先选择要重命名的预设",
    executePresetRename,
    exitPresetRenameMode,
    enterPresetRenameMode,
  );

  // 世界书重命名按钮
  bindModeToggle(
    "#cfm-worldinfo-rename-btn",
    getCfmWorldInfoRenameMode,
    getCfmWorldInfoRenameSelected,
    "请先选择要重命名的世界书",
    executeWorldInfoRename,
    exitWorldInfoRenameMode,
    enterWorldInfoRenameMode,
  );

  // 主题重命名按钮
  bindModeToggle(
    "#cfm-theme-rename-btn",
    getCfmThemeRenameMode,
    getCfmThemeRenameSelected,
    "请先选择要重命名的主题",
    executeThemeRename,
    exitThemeRenameMode,
    enterThemeRenameMode,
  );

  // 背景重命名按钮
  bindModeToggle(
    "#cfm-bg-rename-btn",
    getCfmBgRenameMode,
    getCfmBgRenameSelected,
    "请先选择要重命名的背景",
    executeBgRename,
    exitBgRenameMode,
    enterBgRenameMode,
  );
}
