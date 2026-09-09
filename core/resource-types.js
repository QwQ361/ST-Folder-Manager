// 核心资源类型定义层：承接 chars、presets、worldinfo、themes、backgrounds、personas、regex、quickreply、chatlogs 等资源类型枚举与显示元信息。

/** 顶部标签页元信息：资源类型 id -> 显示标签/图标 */
export const CFM_TAB_META = [
  { id: "chars", label: "角色卡", icon: "fa-users" },
  { id: "chatlogs", label: "聊天记录", icon: "fa-comments" },
  { id: "worldinfo", label: "世界书", icon: "fa-book-atlas" },
  { id: "presets", label: "预设", icon: "fa-sliders" },
  { id: "themes", label: "美化", icon: "fa-palette" },
  { id: "backgrounds", label: "背景", icon: "fa-panorama" },
  { id: "personas", label: "User", icon: "fa-user-pen" },
  { id: "regex", label: "正则", icon: "fa-code" },
  { id: "quickreply", label: "QR", icon: "fa-reply-all" },
];

/** 顶部动作按钮元信息：动作 id -> 显示标签/图标 */
export const CFM_ACTION_META = {
  import: { label: "导入", icon: "fa-file-import" },
  create: { label: "新增", icon: "fa-plus" },
  transfer: { label: "互通", icon: "fa-right-left" },
  chatmode: { label: "显示聊天记录", icon: "fa-comments" },
  regexmode: { label: "查看正则", icon: "fa-code" },
  quickedit: { label: "快速编辑", icon: "fa-pen-to-square" },
  note: { label: "编辑备注", icon: "fa-pen-to-square" },
  rename: { label: "重命名", icon: "fa-i-cursor" },
  export: { label: "导出", icon: "fa-file-export" },
  delete: { label: "删除", icon: "fa-trash-can" },
  default: { label: "设置默认背景", icon: "fa-image" },
};
