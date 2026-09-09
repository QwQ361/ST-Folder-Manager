// 主题资源视图协调层：承接 themes 资源页的树/列表视图协调、主题操作入口、背景绑定入口与当前页刷新；外观策略逻辑保留在 features/appearance。

export function getThemeNamesCore(deps) {
  const names = [];
  deps.$("#themes option").each(function () {
    const v = deps.$(this).val();
    if (v !== "" && v !== undefined) names.push(String(v));
  });
  // 如果原生过滤激活，被 detach 的 option 也要加入（防止清理逻辑误删分组映射）
  if (deps.detachedOptions && deps.detachedOptions.length > 0) {
    for (const opt of deps.detachedOptions) {
      const v = deps.$(opt).val();
      if (v !== "" && v !== undefined) names.push(String(v));
    }
  }
  return names;
}

export function normalizeImportedThemeDataCore(themeData, fallbackName = "", deps = {}) {
  const clone = deps.structuredClone || globalThis.structuredClone;
  const normalizedData = themeData && typeof themeData === "object" ? clone(themeData) : {};

  const normalizedName = String(normalizedData.name ?? fallbackName ?? "").trim();
  if (normalizedName) {
    normalizedData.name = normalizedName;
  }

  const customCssCandidates = [
    normalizedData.custom_css,
    normalizedData.customCSS,
    normalizedData.customCss,
    normalizedData.css,
    normalizedData.theme_css,
    normalizedData.themeCss,
    normalizedData.user_css,
    normalizedData.userCss,
  ];
  const resolvedCustomCss = customCssCandidates.find((value) => typeof value === "string" && value.trim().length > 0);

  if (typeof resolvedCustomCss === "string") {
    normalizedData.custom_css = resolvedCustomCss;
  } else if (typeof normalizedData.custom_css !== "string") {
    normalizedData.custom_css = "";
  }

  return normalizedData;
}

export function rememberImportedThemeRuntimeCore(themeName, themeData, deps) {
  const normalizedName = String(themeName || "").trim();
  if (!normalizedName) return;
  const clone = deps.structuredClone || globalThis.structuredClone;
  const runtimeThemeData = themeData && typeof themeData === "object" ? clone(themeData) : { name: normalizedName };
  runtimeThemeData.name = normalizedName;
  deps.importedThemeRuntimeCache.set(normalizedName, runtimeThemeData);
}

export async function reloadNativeThemeRuntimeCore(deps) {
  const currentPromise = deps.getNativeThemeRuntimeReloadPromise?.();
  if (currentPromise) {
    return currentPromise;
  }

  const reloadPromise = (async () => {
    try {
      const [{ loadPowerUserSettings, applyPowerUserSettings }, resp] = await Promise.all([
        deps.importPowerUser(),
        deps.fetchSettings(),
      ]);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const settings = data && data.settings ? JSON.parse(data.settings) : undefined;
      if (!settings || typeof settings !== "object") {
        throw new Error("settings payload missing");
      }

      const themesSelect = deps.document.getElementById("themes");
      const movingUIPresetsSelect = deps.document.getElementById("movingUIPresets");
      if (themesSelect) {
        themesSelect.replaceChildren();
      }
      if (movingUIPresetsSelect) {
        movingUIPresetsSelect.replaceChildren();
      }
      deps.setThemeDetachedOptions([]);
      deps.selectOriginalOrder.delete("themes");

      await loadPowerUserSettings(settings, data);
      applyPowerUserSettings();
      return true;
    } catch (error) {
      deps.console.warn("[CFM] 重载酒馆主题运行时失败，回退到 CSS 同步", error);
      return false;
    } finally {
      deps.setNativeThemeRuntimeReloadPromise(null);
    }
  })();

  deps.setNativeThemeRuntimeReloadPromise(reloadPromise);
  return reloadPromise;
}

export function applyImportedThemeCustomCssCore(themeName, deps) {
  const normalizedName = String(themeName || "").trim();
  if (!normalizedName) return false;
  const themeData = deps.importedThemeRuntimeCache.get(normalizedName);
  if (!themeData || typeof themeData !== "object") return false;

  const customCss = typeof themeData.custom_css === "string" ? themeData.custom_css : "";
  const customCssTextarea = deps.document.getElementById("customCSS");
  if (customCssTextarea && "value" in customCssTextarea) {
    customCssTextarea.value = customCss;
  }

  let customStyle = deps.document.getElementById("custom-style");
  if (!customStyle) {
    customStyle = deps.document.createElement("style");
    customStyle.setAttribute("type", "text/css");
    customStyle.setAttribute("id", "custom-style");
    deps.document.head.appendChild(customStyle);
  }
  customStyle.textContent = customCss;
  return true;
}

export function applyThemeCore(themeName, deps) {
  const themesSelect = deps.document.getElementById("themes");
  if (!themesSelect) {
    deps.cfmToastr.error("找不到主题下拉框");
    return;
  }
  const option = themesSelect.querySelector(`option[value="${deps.CSS.escape(themeName)}"]`);
  if (!option) {
    deps.cfmToastr.error(`主题「${themeName}」不存在`);
    return;
  }
  themesSelect.value = themeName;
  themesSelect.dispatchEvent(new deps.Event("change", { bubbles: true }));
}

export function syncThemeSelectOptionsWithRuntimeThemesCore(deps) {
  const themeSelect = deps.$("#themes");
  if (!themeSelect.length) return;

  const currentValue = String(themeSelect.val() ?? "");
  const placeholderOptions = themeSelect
    .find("option")
    .filter(function () {
      return String(deps.$(this).val() ?? "") === "";
    })
    .map(function () {
      return deps.$(this).clone();
    })
    .get();

  const runtimeThemeNames = [
    ...themeSelect
      .find("option")
      .map(function () {
        const val = deps.$(this).val();
        return val !== "" && val !== undefined ? String(val) : null;
      })
      .get(),
    ...(deps.getThemeDetachedOptions() || []).map((opt) => {
      const val = deps.$(opt).val();
      return val !== "" && val !== undefined ? String(val) : null;
    }),
  ].filter(Boolean);

  const nextThemeNames = [];
  const seen = new Set();
  for (const name of runtimeThemeNames) {
    const normalizedName = String(name || "").trim();
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    nextThemeNames.push(normalizedName);
  }

  themeSelect.empty();
  if (placeholderOptions.length > 0) {
    themeSelect.append(placeholderOptions);
  }
  for (const name of nextThemeNames) {
    themeSelect.append(deps.$("<option></option>").val(name).text(name));
  }

  deps.setThemeDetachedOptions([]);
  if (nextThemeNames.length > 0) {
    deps.selectOriginalOrder.set("themes", [...nextThemeNames]);
  }
  if (currentValue && seen.has(currentValue)) {
    themeSelect.val(currentValue);
  }
}

export async function refreshThemeRuntimeAfterImportCore(reapplyCurrentTheme = false, deps) {
  const themesSelectBeforeRefresh = deps.document.getElementById("themes");
  const currentThemeBeforeRefresh = String(themesSelectBeforeRefresh?.value || "");

  await deps.reloadNativeThemeRuntime();

  deps.syncThemeSelectOptionsWithRuntimeThemes();
  if (currentThemeBeforeRefresh) {
    deps.$("#themes").val(currentThemeBeforeRefresh);
  }
  deps.applyThemeFilter();

  if (!reapplyCurrentTheme) return;

  deps.requestAnimationFrame(() => {
    const themesSelect = deps.document.getElementById("themes");
    if (!themesSelect) return;
    const currentTheme = String(themesSelect.value || currentThemeBeforeRefresh || "");
    if (!currentTheme) return;
    themesSelect.value = currentTheme;
    themesSelect.dispatchEvent(new deps.Event("change", { bubbles: true }));
    deps.requestAnimationFrame(() => {
      deps.applyImportedThemeCustomCss(currentTheme);
    });
  });
}
