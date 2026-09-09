// 通用重命名辅助层：仅承接跨资源复用的重命名交互与工具能力，例如批量重命名弹窗模板、公共前后缀检测、自动后缀生成与跨资源共用的同步辅助；各资源的实际重命名执行与引用修复应分别下沉到对应 feature 域中。

export function renameTagInSystemCore(tagId, newName, deps) {
  const tag = deps.getTagList().find((t) => t.id === tagId);
  if (tag) {
    tag.name = newName;
    deps.saveSettingsDebounced();
  }
}
