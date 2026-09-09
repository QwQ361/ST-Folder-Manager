// 聊天记录 API 与上下文适配层：承接基于角色 avatar 获取聊天记录、打开聊天、删除聊天、重命名聊天、导入导出聊天，以及对 SillyTavern 原生接口与回退 fetch 调用的封装。

export function splitChatlogFileName(fileName) {
  const safeName = String(fileName || "");
  const lastDot = safeName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === safeName.length - 1) {
    return {
      fullName: safeName,
      baseName: safeName,
      ext: "",
      displayName: safeName,
    };
  }
  return {
    fullName: safeName,
    baseName: safeName.slice(0, lastDot),
    ext: safeName.slice(lastDot),
    displayName: safeName.slice(0, lastDot),
  };
}
