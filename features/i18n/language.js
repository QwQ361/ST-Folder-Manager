// 界面语言功能文件：用于管理插件内部简体中文与繁體中文等语言配置、文本切换、语言状态读取与保存，以及在界面重渲染时同步应用当前语言。

export function cfmTCore(text, deps = {}) {
  if (!text) return text;

  const extensionSettings =
    typeof deps.getExtensionSettings === "function"
      ? deps.getExtensionSettings()
      : deps.extensionSettings;
  const ext = extensionSettings?.[deps.extensionName];

  if (ext?.language !== "zh-TW") return text;
  return deps.s2t?.toTraditional?.(text) ?? text;
}
