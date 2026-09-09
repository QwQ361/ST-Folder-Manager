// 确认弹窗组件层：承接 cfmConfirm 等通用确认交互组件，不直接执行删除、重命名或导入导出业务。

export function cfmConfirmCore(msg, deps) {
  return deps.confirm(deps.translate(msg));
}
