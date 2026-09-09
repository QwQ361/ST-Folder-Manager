// 背景资源视图协调层：承接 backgrounds 资源页的树/列表视图协调、背景操作入口、方向设置入口与当前页刷新；默认背景策略保留在 features/appearance/default-background.js。

export function getBackgroundNamesCore(deps) {
  const names = [];
  deps.$("#bg_menu_content .bg_example").each(function () {
    const bgfile = deps.$(this).attr("bgfile");
    if (bgfile) names.push(bgfile);
  });
  return names;
}

export function getBackgroundDisplayNameCore(bgfile) {
  if (!bgfile) return "";
  const name = bgfile.split("/").pop();
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.slice(0, dotIdx) : name;
}

export function applyBackgroundCore(bgfile, deps) {
  const bgEl = deps.document.querySelector(
    `#bg_menu_content .bg_example[bgfile="${deps.CSS.escape(bgfile)}"]`,
  );
  if (bgEl) {
    bgEl.click();
  } else {
    deps.cfmToastr.error(`背景「${deps.getBackgroundDisplayName(bgfile)}」不存在`);
  }
}

export function getBackgroundThumbnailUrlCore(bgfile) {
  if (!bgfile) return "";
  return `/backgrounds/${encodeURIComponent(bgfile)}`;
}
