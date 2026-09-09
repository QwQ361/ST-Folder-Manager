// 背景方向层：承接 bgOrientations 的读取、保存、导入导出恢复与背景重命名后的方向数据迁移。

export function getBgOrientationCore(name, deps) {
  return deps.settings[deps.extensionName].bgOrientations?.[name] || null;
}

export function setBgOrientationCore(name, orient, deps) {
  if (!deps.settings[deps.extensionName].bgOrientations) {
    deps.settings[deps.extensionName].bgOrientations = {};
  }
  if (orient) {
    deps.settings[deps.extensionName].bgOrientations[name] = orient;
  } else {
    delete deps.settings[deps.extensionName].bgOrientations[name];
  }
  deps.saveSettingsDebounced();
}

export function detectBgOrientationCore(name, deps) {
  return new Promise((resolve) => {
    const img = new deps.Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio > 1.15) resolve(deps.BG_ORIENT_LANDSCAPE);
      else if (ratio < 0.87) resolve(deps.BG_ORIENT_PORTRAIT);
      else resolve(deps.BG_ORIENT_OTHER);
    };
    img.onerror = () => resolve(deps.BG_ORIENT_OTHER);
    img.src = deps.getBackgroundThumbnailUrl(name);
  });
}

export async function autoDetectBgOrientationsCore(bgNames, force = false, deps) {
  const toDetect = force
    ? bgNames
    : bgNames.filter((name) => !deps.getBgOrientation(name));
  if (toDetect.length === 0) return;

  const batchSize = 8;
  for (let i = 0; i < toDetect.length; i += batchSize) {
    const batch = toDetect.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (name) => {
        const orient = await deps.detectBgOrientation(name);
        return { name, orient };
      }),
    );
    for (const { name, orient } of results) {
      deps.setBgOrientation(name, orient);
    }
  }
}
