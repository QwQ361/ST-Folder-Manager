// 预设资源视图协调层：承接 presets 资源页的树/列表视图协调、资源项操作入口与当前页刷新；具体 DOM 组件下沉到 ui/views、ui/tree 或 ui/list。

export function getCurrentPresetsCore(deps) {
  const pm = deps.getPresetManager();
  if (!pm || !pm.select) return [];
  const presetMap = new Map();
  pm.select.find("option").each(function () {
    const v = deps.$(this).val();
    const t = deps.$(this).text();
    if (v !== "" && v !== undefined && !presetMap.has(t)) {
      presetMap.set(t, { value: v, name: t });
    }
  });
  if (deps.detachedOptions && deps.detachedOptions.length > 0) {
    for (const opt of deps.detachedOptions) {
      const v = deps.$(opt).val();
      const t = deps.$(opt).text();
      if (v !== "" && v !== undefined && !presetMap.has(t)) {
        presetMap.set(t, { value: v, name: t });
      }
    }
  }
  const orderedNames = deps.syncPresetCustomOrder([...presetMap.values()]);
  return orderedNames.map((name) => presetMap.get(name)).filter(Boolean);
}

export function getCurrentPresetNameCore(deps) {
  const pm = deps.getPresetManager();
  if (!pm || !pm.select) return "";
  const currentValue = pm.select.val();
  const currentPreset = deps.getCurrentPresets().find(
    (p) => String(p.value) === String(currentValue),
  );
  return currentPreset?.name || "";
}
