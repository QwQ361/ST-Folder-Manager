// UI 样式策略层：承接插件自定义样式注入、主题感知样式同步和外观相关 DOM class 管理；不承接 themes/backgrounds 资源域本体业务。

/** hex 颜色 + 不透明度 → rgba 字符串 */
export function hexToRgba(hex, opacity) {
  if (!hex) return null;
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity ?? 1})`;
}

/** 将 CSS 颜色值（rgb/rgba/hex/named）转为 #RRGGBB hex 字符串 */
export function colorToHex(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const r = parseInt(m[1]).toString(16).padStart(2, "0");
    const g = parseInt(m[2]).toString(16).padStart(2, "0");
    const b = parseInt(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return null;
}

/** 从 CSS 颜色值中提取 alpha 值 */
export function colorToAlpha(raw) {
  if (!raw) return 1;
  const m = raw
    .trim()
    .match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i);
  return m ? parseFloat(m[1]) : 1;
}

/** 快捷预设方案 */
export const CFM_STYLE_PRESETS = {
  dark: {
    name: "深色",
    icon: "fa-moon",
    bgColor: "#1e1e2e",
    bgOpacity: 0.95,
    textColor: "#cdd6f4",
    borderColor: "#45475a",
    accentColor: "#89b4fa",
    blur: 0,
    detailBgColor: "#ffffff",
    detailBgOpacity: 0.03,
    detailTextColor: "#e0e0e0",
    detailLabelColor: "#89b4fa",
  },
  light: {
    name: "浅色",
    icon: "fa-sun",
    bgColor: "#eff1f5",
    bgOpacity: 0.95,
    textColor: "#4c4f69",
    borderColor: "#ccd0da",
    accentColor: "#4377deff",
    blur: 0,
    detailBgColor: "#d0d3de",
    detailBgOpacity: 0.45,
    detailTextColor: "#5c5f75",
    detailLabelColor: "#74a2ec",
  },
  transparent: {
    name: "半透明",
    icon: "fa-droplet",
    bgColor: "#000000",
    bgOpacity: 0.6,
    textColor: "#ffffff",
    borderColor: "#555555",
    accentColor: "#89b4fa",
    blur: 10,
    detailBgColor: "#ffffff",
    detailBgOpacity: 0.05,
    detailTextColor: "#e0e0e0",
    detailLabelColor: "#89b4fa",
  },
  highContrast: {
    name: "高对比度",
    icon: "fa-circle-half-stroke",
    bgColor: "#000000",
    bgOpacity: 1.0,
    textColor: "#ffffff",
    borderColor: "#ffffff",
    accentColor: "#00ff00",
    blur: 0,
    detailBgColor: "#333333",
    detailBgOpacity: 1.0,
    detailTextColor: "#ffffff",
    detailLabelColor: "#00ff00",
  },
};

/** 获取当前酒馆主题名 */
export function getCurrentThemeNameCore(deps) {
  const themesSelect = deps.document.getElementById("themes");
  return themesSelect?.value || "__default__";
}

/** 从当前主题中读取实际生效的 CSS 变量值，作为自定义美化弹窗的默认值 */
export function getComputedThemeDefaultsCore(deps) {
  const overrideEl = deps.document.getElementById("cfm-custom-style-override");
  if (overrideEl) overrideEl.remove();

  const ref =
    deps.document.getElementById("cfm-popup") || deps.document.documentElement;
  const cs = deps.getComputedStyle(ref);
  const bgRaw = cs.getPropertyValue("--SmartThemeBlurTintColor").trim();
  const textRaw = cs.getPropertyValue("--SmartThemeBodyColor").trim();
  const borderRaw = cs.getPropertyValue("--SmartThemeBorderColor").trim();
  const accentRaw = cs.getPropertyValue("--SmartThemeQuoteColor").trim();

  const defaults = {
    bgColor: deps.colorToHex(bgRaw) || "#1e1e2e",
    bgOpacity: bgRaw ? deps.colorToAlpha(bgRaw) : 0.95,
    textColor: deps.colorToHex(textRaw) || "#cdd6f4",
    borderColor: deps.colorToHex(borderRaw) || "#45475a",
    accentColor: deps.colorToHex(accentRaw) || "#89b4fa",
  };

  if (overrideEl) deps.document.head.appendChild(overrideEl);
  return defaults;
}

/** 将用户的自定义外观应用到所有 CFM 相关元素 */
export function applyCustomStyleCore(deps) {
  const STYLE_ID = "cfm-custom-style-override";
  let styleEl = deps.document.getElementById(STYLE_ID);

  const themeName = deps.getCurrentThemeName();
  const styles = deps.extensionSettings[deps.extensionName].customStyles || {};
  const style = styles[themeName];

  if (!style?.enabled) {
    if (styleEl) styleEl.remove();
    return;
  }

  const selector = [
    "#cfm-popup",
    ".cfm-edit-popup-overlay",
    ".cfm-edit-popup",
    "#cfm-folder-button",
    "#cfm-theme-popup-overlay",
    ".cfm-theme-popup-overlay",
    ".cfm-theme-popup",
    "#cfm-config-overlay",
    ".cfm-config-overlay",
    "#cfm-config-popup",
    ".cfm-batch-overlay",
    ".cfm-batch-popup",
  ].join(",\n");

  let cssVars = "";
  if (style.bgColor) {
    cssVars += `  --SmartThemeBlurTintColor: ${deps.hexToRgba(style.bgColor, style.bgOpacity ?? 1)} !important;\n`;
  }
  if (style.textColor) {
    cssVars += `  --SmartThemeBodyColor: ${style.textColor} !important;\n`;
  }
  if (style.borderColor) {
    cssVars += `  --SmartThemeBorderColor: ${style.borderColor} !important;\n`;
  }
  if (style.accentColor) {
    cssVars += `  --SmartThemeQuoteColor: ${style.accentColor} !important;\n`;
  }
  if (style.detailBgColor) {
    cssVars += `  --cfm-detail-bg: ${deps.hexToRgba(style.detailBgColor, style.detailBgOpacity ?? 0.03)} !important;\n`;
  }
  if (style.detailTextColor) {
    cssVars += `  --cfm-detail-text: ${style.detailTextColor} !important;\n`;
  }
  if (style.detailLabelColor) {
    cssVars += `  --cfm-detail-label: ${style.detailLabelColor} !important;\n`;
  }

  let blurCSS = "";
  if (style.blur > 0) {
    const blurVal = `blur(${style.blur}px)`;
    const blurSelector = [
      "#cfm-popup",
      ".cfm-edit-popup",
      "#cfm-folder-button",
      ".cfm-theme-popup",
      "#cfm-config-popup",
      ".cfm-batch-popup",
      ".cfm-cb-popup",
      ".cfm-qr-editor-popup",
      ".cfm-entry-transfer-dialog",
      ".cfm-regex-transfer-dialog-popup",
      ".cfm-sort-dialog",
      ".cfm-dup-dialog",
      ".cfm-fullscreen-confirm-dialog",
      ".cfm-batch-progress-box",
    ]
      .map((s) => `body ${s}`)
      .join(", ");
    blurCSS = `\n${blurSelector} {\n  backdrop-filter: ${blurVal} !important;\n  -webkit-backdrop-filter: ${blurVal} !important;\n}`;
  }

  const cssText = `${selector} {\n${cssVars}}${blurCSS}`;
  if (!styleEl) {
    styleEl = deps.document.createElement("style");
    styleEl.id = STYLE_ID;
    deps.document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssText;
}

/** 更新预览区的外观 */
export function updateThemePreviewCore(previewEl, config, deps) {
  if (!previewEl) return;
  const bgRgba = deps.hexToRgba(
    config.bgColor || "#1e1e2e",
    config.bgOpacity ?? 1,
  );
  const textColor = config.textColor || "var(--SmartThemeBodyColor, #cdd6f4)";
  const borderColor =
    config.borderColor || "var(--SmartThemeBorderColor, #45475a)";
  const accentColor =
    config.accentColor || "var(--SmartThemeQuoteColor, #89b4fa)";
  const blur = config.blur || 0;
  const detailBgRgba = deps.hexToRgba(
    config.detailBgColor || "#ffffff",
    config.detailBgOpacity ?? 0.03,
  );
  const detailTextColor = config.detailTextColor || "#ffffff";
  const detailLabelColor = config.detailLabelColor || "#89b4fa";

  previewEl.style.setProperty("--preview-bg", bgRgba);
  previewEl.style.setProperty("--preview-text", textColor);
  previewEl.style.setProperty("--preview-border", borderColor);
  previewEl.style.setProperty("--preview-accent", accentColor);
  previewEl.style.setProperty("--preview-detail-bg", detailBgRgba);
  previewEl.style.setProperty("--preview-detail-text", detailTextColor);
  previewEl.style.setProperty("--preview-detail-label", detailLabelColor);
  if (blur > 0) {
    previewEl.style.setProperty("backdrop-filter", `blur(${blur}px)`);
  } else {
    previewEl.style.removeProperty("backdrop-filter");
  }
}

function normalizeHexColor(value) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return null;
}

function escapeAttr(value, deps) {
  return deps.escapeHtml(String(value ?? "")).replace(/"/g, "&quot;");
}

/** 显示自定义外观弹窗 */
export function showThemeCustomizePopupCore(deps) {
  const $ = deps.$;
  if ($("#cfm-theme-popup-overlay").length > 0) return;

  const themeName = deps.getCurrentThemeName();
  const styles = deps.extensionSettings[deps.extensionName].customStyles || {};
  const saved = styles[themeName] || {};
  const themeDefaults = deps.getComputedThemeDefaults();

  const draft = {
    enabled: saved.enabled ?? false,
    bgColor: saved.bgColor || themeDefaults.bgColor,
    bgOpacity: saved.bgOpacity ?? themeDefaults.bgOpacity,
    textColor: saved.textColor || themeDefaults.textColor,
    borderColor: saved.borderColor || themeDefaults.borderColor,
    accentColor: saved.accentColor || themeDefaults.accentColor,
    blur: saved.blur ?? 0,
    detailBgColor: saved.detailBgColor || "#ffffff",
    detailBgOpacity: saved.detailBgOpacity ?? 0.03,
    detailTextColor: saved.detailTextColor || "#ffffff",
    detailLabelColor: saved.detailLabelColor || "#89b4fa",
  };

  const overlay = $(`
    <div id="cfm-theme-popup-overlay" class="cfm-theme-popup-overlay">
      <div class="cfm-theme-popup">
        <div class="cfm-theme-popup-header">
          <span><i class="fa-solid fa-palette"></i> 自定义外观</span>
          <button class="cfm-btn-close" id="cfm-theme-close">&times;</button>
        </div>
        <div class="cfm-theme-popup-subheader">
          当前主题：<strong>${deps.escapeHtml(themeName === "__default__" ? "默认" : themeName)}</strong>
        </div>
        <div class="cfm-theme-popup-body">
          <div class="cfm-theme-preview" id="cfm-theme-preview">
            <div class="cfm-theme-preview-header">
              <span>📁 资源管理器</span>
              <span style="opacity:0.5;">✕</span>
            </div>
            <div class="cfm-theme-preview-body">
              <div class="cfm-theme-preview-folder">
                <i class="fa-solid fa-folder" style="margin-right:6px;"></i>示例文件夹
              </div>
              <div class="cfm-theme-preview-item">
                <span class="cfm-theme-preview-name">角色卡名称</span>
                <span class="cfm-theme-preview-accent-text">强调色文本</span>
              </div>
              <div class="cfm-theme-preview-item">
                <span class="cfm-theme-preview-name">这是普通文字示例</span>
              </div>
              <div class="cfm-theme-preview-border-demo">边框效果展示</div>
              <div class="cfm-theme-preview-detail">
                <span class="cfm-theme-preview-detail-label">条目名称</span>
                <span class="cfm-theme-preview-detail-text">详情区域文字</span>
              </div>
            </div>
          </div>

          <div class="cfm-theme-row cfm-theme-row-toggle">
            <label class="cfm-theme-toggle-label">
              <input type="checkbox" id="cfm-theme-enabled" ${draft.enabled ? "checked" : ""}>
              <span>启用自定义样式</span>
            </label>
          </div>

          <div class="cfm-theme-controls" id="cfm-theme-controls">
            <div class="cfm-theme-row"><label>背景颜色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-bg-color" value="${draft.bgColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-bg-hex" value="${draft.bgColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="bgColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
            <div class="cfm-theme-row"><label>背景不透明度</label><div class="cfm-theme-row-right"><input type="range" id="cfm-theme-bg-opacity" min="0" max="100" value="${Math.round(draft.bgOpacity * 100)}" class="cfm-theme-slider"><span class="cfm-theme-slider-val" id="cfm-theme-opacity-val">${Math.round(draft.bgOpacity * 100)}%</span></div></div>
            <div class="cfm-theme-row"><label>文字颜色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-text-color" value="${draft.textColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-text-hex" value="${draft.textColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="textColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
            <div class="cfm-theme-row"><label>边框颜色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-border-color" value="${draft.borderColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-border-hex" value="${draft.borderColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="borderColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
            <div class="cfm-theme-row"><label>强调色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-accent-color" value="${draft.accentColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-accent-hex" value="${draft.accentColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="accentColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
            <div class="cfm-theme-row"><label>背景模糊</label><div class="cfm-theme-row-right"><input type="range" id="cfm-theme-blur" min="0" max="30" value="${draft.blur}" class="cfm-theme-slider"><span class="cfm-theme-slider-val" id="cfm-theme-blur-val">${draft.blur}px</span></div></div>
            <div class="cfm-theme-separator"><span>展开详情区域</span></div>
            <div class="cfm-theme-row"><label>详情背景颜色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-detail-bg-color" value="${draft.detailBgColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-detail-bg-hex" value="${draft.detailBgColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="detailBgColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
            <div class="cfm-theme-row"><label>详情背景不透明度</label><div class="cfm-theme-row-right"><input type="range" id="cfm-theme-detail-bg-opacity" min="0" max="100" value="${Math.round(draft.detailBgOpacity * 100)}" class="cfm-theme-slider"><span class="cfm-theme-slider-val" id="cfm-theme-detail-opacity-val">${Math.round(draft.detailBgOpacity * 100)}%</span></div></div>
            <div class="cfm-theme-row"><label>详情文字颜色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-detail-text-color" value="${draft.detailTextColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-detail-text-hex" value="${draft.detailTextColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="detailTextColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
            <div class="cfm-theme-row"><label>详情条目名称颜色</label><div class="cfm-theme-row-right"><input type="color" id="cfm-theme-detail-label-color" value="${draft.detailLabelColor}"><input type="text" class="cfm-theme-color-hex" id="cfm-theme-detail-label-hex" value="${draft.detailLabelColor}" spellcheck="false" autocomplete="off"><button class="cfm-theme-reset-btn" data-target="detailLabelColor" title="重置"><i class="fa-solid fa-rotate-left"></i></button></div></div>
          </div>

          <div class="cfm-theme-presets">
            <div class="cfm-theme-presets-label">快捷预设</div>
            <div class="cfm-theme-presets-btns">
              ${Object.entries(deps.CFM_STYLE_PRESETS)
                .map(
                  ([key, preset]) =>
                    `<button class="cfm-theme-preset-btn" data-preset="${key}"><i class="fa-solid ${preset.icon}"></i> ${preset.name}</button>`,
                )
                .join("")}
            </div>
          </div>

          <div class="cfm-theme-presets cfm-user-presets-section">
            <div class="cfm-theme-presets-label">自定义预设</div>
            <div class="cfm-theme-presets-btns">
              <button class="cfm-theme-preset-btn cfm-user-preset-save-btn" id="cfm-user-preset-save"><i class="fa-solid fa-floppy-disk"></i> 保存当前</button>
              <button class="cfm-theme-preset-btn cfm-user-preset-list-btn" id="cfm-user-preset-list-toggle"><i class="fa-solid fa-list"></i> 我的预设</button>
            </div>
            <div class="cfm-user-presets-dropdown" id="cfm-user-presets-dropdown" style="display:none;">
              <div class="cfm-user-presets-search-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="cfm-user-presets-search" placeholder="搜索预设..." spellcheck="false" autocomplete="off">
              </div>
              <div class="cfm-user-presets-list" id="cfm-user-presets-list"></div>
              <div class="cfm-user-presets-empty" id="cfm-user-presets-empty">暂无自定义预设</div>
            </div>
          </div>
        </div>

        <div class="cfm-theme-popup-footer">
          <button class="cfm-btn" id="cfm-theme-reset-all"><i class="fa-solid fa-rotate-left"></i> 恢复默认</button>
          <button class="cfm-btn cfm-theme-apply-btn" id="cfm-theme-apply"><i class="fa-solid fa-check"></i> 应用</button>
        </div>
      </div>
    </div>
  `);

  $("body").append(overlay);

  const previewEl = overlay.find("#cfm-theme-preview")[0];
  const controlsEl = overlay.find("#cfm-theme-controls");
  const popupEl = overlay.find(".cfm-theme-popup")[0];

  function refreshPopupTheme() {
    if (!overlay[0] || !popupEl) return;

    if (!draft.enabled) {
      overlay[0].style.removeProperty("--SmartThemeBlurTintColor");
      overlay[0].style.removeProperty("--SmartThemeBodyColor");
      overlay[0].style.removeProperty("--SmartThemeBorderColor");
      overlay[0].style.removeProperty("--SmartThemeQuoteColor");
      overlay[0].style.removeProperty("--cfm-detail-bg");
      overlay[0].style.removeProperty("--cfm-detail-text");
      overlay[0].style.removeProperty("--cfm-detail-label");
      popupEl.style.removeProperty("backdrop-filter");
      popupEl.style.removeProperty("-webkit-backdrop-filter");
      return;
    }

    overlay[0].style.setProperty(
      "--SmartThemeBlurTintColor",
      deps.hexToRgba(draft.bgColor, draft.bgOpacity ?? 1),
    );
    overlay[0].style.setProperty("--SmartThemeBodyColor", draft.textColor);
    overlay[0].style.setProperty("--SmartThemeBorderColor", draft.borderColor);
    overlay[0].style.setProperty("--SmartThemeQuoteColor", draft.accentColor);
    overlay[0].style.setProperty(
      "--cfm-detail-bg",
      deps.hexToRgba(draft.detailBgColor, draft.detailBgOpacity ?? 0.03),
    );
    overlay[0].style.setProperty("--cfm-detail-text", draft.detailTextColor);
    overlay[0].style.setProperty("--cfm-detail-label", draft.detailLabelColor);

    if (draft.blur > 0) {
      const blurVal = `blur(${draft.blur}px)`;
      popupEl.style.setProperty("backdrop-filter", blurVal);
      popupEl.style.setProperty("-webkit-backdrop-filter", blurVal);
    } else {
      popupEl.style.removeProperty("backdrop-filter");
      popupEl.style.removeProperty("-webkit-backdrop-filter");
    }
  }

  function refreshPreview() {
    refreshPopupTheme();
    deps.updateThemePreview(previewEl, draft);
  }

  function updateControlsState() {
    controlsEl.toggleClass("cfm-theme-controls-disabled", !draft.enabled);
  }

  function syncFormFromDraft() {
    overlay.find("#cfm-theme-enabled").prop("checked", draft.enabled);
    overlay.find("#cfm-theme-bg-color").val(draft.bgColor);
    overlay.find("#cfm-theme-bg-hex").val(draft.bgColor);
    overlay.find("#cfm-theme-bg-opacity").val(Math.round(draft.bgOpacity * 100));
    overlay
      .find("#cfm-theme-opacity-val")
      .text(Math.round(draft.bgOpacity * 100) + "%");
    overlay.find("#cfm-theme-text-color").val(draft.textColor);
    overlay.find("#cfm-theme-text-hex").val(draft.textColor);
    overlay.find("#cfm-theme-border-color").val(draft.borderColor);
    overlay.find("#cfm-theme-border-hex").val(draft.borderColor);
    overlay.find("#cfm-theme-accent-color").val(draft.accentColor);
    overlay.find("#cfm-theme-accent-hex").val(draft.accentColor);
    overlay.find("#cfm-theme-blur").val(draft.blur);
    overlay.find("#cfm-theme-blur-val").text(draft.blur + "px");
    overlay.find("#cfm-theme-detail-bg-color").val(draft.detailBgColor);
    overlay.find("#cfm-theme-detail-bg-hex").val(draft.detailBgColor);
    overlay
      .find("#cfm-theme-detail-bg-opacity")
      .val(Math.round(draft.detailBgOpacity * 100));
    overlay
      .find("#cfm-theme-detail-opacity-val")
      .text(Math.round(draft.detailBgOpacity * 100) + "%");
    overlay.find("#cfm-theme-detail-text-color").val(draft.detailTextColor);
    overlay.find("#cfm-theme-detail-text-hex").val(draft.detailTextColor);
    overlay.find("#cfm-theme-detail-label-color").val(draft.detailLabelColor);
    overlay.find("#cfm-theme-detail-label-hex").val(draft.detailLabelColor);
    updateControlsState();
    refreshPreview();
  }

  function bindHexInput(textSelector, colorSelector, draftKey) {
    const input = overlay.find(textSelector);
    input.on("input", function () {
      const normalized = normalizeHexColor(this.value);
      if (!normalized) return;
      draft[draftKey] = normalized;
      overlay.find(colorSelector).val(normalized);
      refreshPreview();
    });
    input.on("change blur", function () {
      const normalized = normalizeHexColor(this.value);
      if (normalized) {
        draft[draftKey] = normalized;
        overlay.find(colorSelector).val(normalized);
        $(this).val(normalized);
        refreshPreview();
        return;
      }
      $(this).val(draft[draftKey]);
    });
  }

  function applyPresetToForm(preset) {
    draft.bgColor = preset.bgColor;
    draft.bgOpacity = preset.bgOpacity;
    draft.textColor = preset.textColor;
    draft.borderColor = preset.borderColor;
    draft.accentColor = preset.accentColor;
    draft.blur = preset.blur ?? 0;
    draft.detailBgColor = preset.detailBgColor || "#ffffff";
    draft.detailBgOpacity = preset.detailBgOpacity ?? 0.03;
    draft.detailTextColor = preset.detailTextColor || "#ffffff";
    draft.detailLabelColor = preset.detailLabelColor || "#89b4fa";
    draft.enabled = true;
    syncFormFromDraft();
  }

  function getUserPresets() {
    if (!deps.extensionSettings[deps.extensionName].userPresets) {
      deps.extensionSettings[deps.extensionName].userPresets = [];
    }
    return deps.extensionSettings[deps.extensionName].userPresets;
  }

  function saveUserPresets() {
    deps.getContext().saveSettingsDebounced();
  }

  function renderUserPresetsList(filter) {
    const listEl = overlay.find("#cfm-user-presets-list");
    const emptyEl = overlay.find("#cfm-user-presets-empty");
    const presets = getUserPresets();
    const keyword = (filter || "").trim().toLowerCase();
    const filtered = keyword
      ? presets.filter((p) => p.name.toLowerCase().includes(keyword))
      : presets;

    listEl.empty();
    if (filtered.length === 0) {
      emptyEl.show();
      emptyEl.text(keyword ? "未找到匹配的预设" : "暂无自定义预设");
      return;
    }
    emptyEl.hide();

    filtered.forEach((p) => {
      const realIdx = presets.indexOf(p);
      const item = $(`
        <div class="cfm-user-preset-item" data-idx="${realIdx}">
          <span class="cfm-user-preset-name" title="${escapeAttr(p.name, deps)}">${deps.escapeHtml(p.name)}</span>
          <div class="cfm-user-preset-actions">
            <button class="cfm-user-preset-action-btn cfm-user-preset-rename" title="重命名"><i class="fa-solid fa-pen"></i></button>
            <button class="cfm-user-preset-action-btn cfm-user-preset-delete" title="删除"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `);

      item.find(".cfm-user-preset-name").on("click", function () {
        applyPresetToForm(p.style);
        deps.cfmToastr.success(`已应用预设「${p.name}」`, "自定义预设", {
          timeOut: 1500,
        });
      });

      item.find(".cfm-user-preset-rename").on("click", function (e) {
        e.stopPropagation();
        const nameEl = item.find(".cfm-user-preset-name");
        const oldName = p.name;
        const input = $(
          `<input type="text" class="cfm-user-preset-rename-input" value="${escapeAttr(oldName, deps)}" spellcheck="false" autocomplete="off">`,
        );
        nameEl.replaceWith(input);
        input.focus().select();

        function finishRename() {
          const newName = input.val().trim();
          if (newName && newName !== oldName) {
            p.name = newName;
            saveUserPresets();
          }
          renderUserPresetsList(
            overlay.find("#cfm-user-presets-search").val(),
          );
        }

        input.on("blur", finishRename);
        input.on("keydown", function (ev) {
          if (ev.key === "Enter") {
            ev.preventDefault();
            input.blur();
          }
          if (ev.key === "Escape") {
            input.val(oldName);
            input.blur();
          }
        });
      });

      item.find(".cfm-user-preset-delete").on("click", function (e) {
        e.stopPropagation();
        if (!deps.cfmConfirm(`确定删除预设「${p.name}」吗？`)) return;
        presets.splice(realIdx, 1);
        saveUserPresets();
        renderUserPresetsList(overlay.find("#cfm-user-presets-search").val());
        deps.cfmToastr.success(`已删除预设「${p.name}」`, "自定义预设", {
          timeOut: 1500,
        });
      });

      listEl.append(item);
    });
  }

  refreshPreview();
  updateControlsState();

  overlay.find("#cfm-theme-enabled").on("change", function () {
    draft.enabled = this.checked;
    updateControlsState();
    refreshPreview();
  });

  overlay.find("#cfm-theme-bg-color").on("input", function () {
    draft.bgColor = this.value;
    overlay.find("#cfm-theme-bg-hex").val(this.value);
    refreshPreview();
  });
  overlay.find("#cfm-theme-text-color").on("input", function () {
    draft.textColor = this.value;
    overlay.find("#cfm-theme-text-hex").val(this.value);
    refreshPreview();
  });
  overlay.find("#cfm-theme-border-color").on("input", function () {
    draft.borderColor = this.value;
    overlay.find("#cfm-theme-border-hex").val(this.value);
    refreshPreview();
  });
  overlay.find("#cfm-theme-accent-color").on("input", function () {
    draft.accentColor = this.value;
    overlay.find("#cfm-theme-accent-hex").val(this.value);
    refreshPreview();
  });
  overlay.find("#cfm-theme-detail-bg-color").on("input", function () {
    draft.detailBgColor = this.value;
    overlay.find("#cfm-theme-detail-bg-hex").val(this.value);
    refreshPreview();
  });
  overlay.find("#cfm-theme-detail-text-color").on("input", function () {
    draft.detailTextColor = this.value;
    overlay.find("#cfm-theme-detail-text-hex").val(this.value);
    refreshPreview();
  });
  overlay.find("#cfm-theme-detail-label-color").on("input", function () {
    draft.detailLabelColor = this.value;
    overlay.find("#cfm-theme-detail-label-hex").val(this.value);
    refreshPreview();
  });

  bindHexInput("#cfm-theme-bg-hex", "#cfm-theme-bg-color", "bgColor");
  bindHexInput("#cfm-theme-text-hex", "#cfm-theme-text-color", "textColor");
  bindHexInput("#cfm-theme-border-hex", "#cfm-theme-border-color", "borderColor");
  bindHexInput("#cfm-theme-accent-hex", "#cfm-theme-accent-color", "accentColor");
  bindHexInput("#cfm-theme-detail-bg-hex", "#cfm-theme-detail-bg-color", "detailBgColor");
  bindHexInput("#cfm-theme-detail-text-hex", "#cfm-theme-detail-text-color", "detailTextColor");
  bindHexInput("#cfm-theme-detail-label-hex", "#cfm-theme-detail-label-color", "detailLabelColor");

  overlay.find("#cfm-theme-bg-opacity").on("input", function () {
    draft.bgOpacity = parseInt(this.value) / 100;
    overlay.find("#cfm-theme-opacity-val").text(this.value + "%");
    refreshPreview();
  });
  overlay.find("#cfm-theme-blur").on("input", function () {
    draft.blur = parseInt(this.value);
    overlay.find("#cfm-theme-blur-val").text(this.value + "px");
    refreshPreview();
  });
  overlay.find("#cfm-theme-detail-bg-opacity").on("input", function () {
    draft.detailBgOpacity = parseInt(this.value) / 100;
    overlay.find("#cfm-theme-detail-opacity-val").text(this.value + "%");
    refreshPreview();
  });

  overlay.find(".cfm-theme-reset-btn").on("click", function () {
    const target = $(this).data("target");
    const defaults = {
      bgColor: themeDefaults.bgColor,
      textColor: themeDefaults.textColor,
      borderColor: themeDefaults.borderColor,
      accentColor: themeDefaults.accentColor,
      detailBgColor: "#ffffff",
      detailTextColor: "#ffffff",
      detailLabelColor: "#89b4fa",
    };
    if (defaults[target]) {
      draft[target] = defaults[target];
      syncFormFromDraft();
    }
  });

  overlay
    .find(
      ".cfm-theme-preset-btn:not(.cfm-user-preset-save-btn):not(.cfm-user-preset-list-btn)",
    )
    .on("click", function () {
      const key = $(this).data("preset");
      const preset = deps.CFM_STYLE_PRESETS[key];
      if (!preset) return;
      applyPresetToForm(preset);
    });

  overlay.find("#cfm-user-preset-save").on("click", function () {
    const name = deps.prompt("请输入预设名称：");
    if (!name || !name.trim()) return;
    const presets = getUserPresets();
    const style = {
      bgColor: draft.bgColor,
      bgOpacity: draft.bgOpacity,
      textColor: draft.textColor,
      borderColor: draft.borderColor,
      accentColor: draft.accentColor,
      blur: draft.blur,
      detailBgColor: draft.detailBgColor,
      detailBgOpacity: draft.detailBgOpacity,
      detailTextColor: draft.detailTextColor,
      detailLabelColor: draft.detailLabelColor,
    };
    presets.push({ name: name.trim(), style });
    saveUserPresets();
    if (overlay.find("#cfm-user-presets-dropdown").is(":visible")) {
      renderUserPresetsList(overlay.find("#cfm-user-presets-search").val());
    }
    deps.cfmToastr.success(`预设「${name.trim()}」已保存`, "自定义预设", {
      timeOut: 1500,
    });
  });

  overlay.find("#cfm-user-preset-list-toggle").on("click", function () {
    const dropdown = overlay.find("#cfm-user-presets-dropdown");
    if (dropdown.is(":visible")) {
      dropdown.slideUp(150);
    } else {
      renderUserPresetsList("");
      overlay.find("#cfm-user-presets-search").val("");
      dropdown.slideDown(150);
    }
  });

  overlay.find("#cfm-user-presets-search").on("input", function () {
    renderUserPresetsList($(this).val());
  });

  overlay.find("#cfm-theme-reset-all").on("click", function () {
    if (
      !deps.cfmConfirm(
        `确定要恢复当前主题「${themeName === "__default__" ? "默认" : themeName}」的插件外观为默认吗？\n这将删除该主题的所有自定义样式设置。`,
      )
    )
      return;
    const allStyles = deps.extensionSettings[deps.extensionName].customStyles || {};
    delete allStyles[themeName];
    deps.extensionSettings[deps.extensionName].customStyles = allStyles;
    deps.getContext().saveSettingsDebounced();
    deps.applyCustomStyle();
    overlay.remove();
    deps.cfmToastr.success("已恢复默认外观", "自定义外观", { timeOut: 2000 });
  });

  overlay.find("#cfm-theme-apply").on("click", function () {
    if (!deps.extensionSettings[deps.extensionName].customStyles) {
      deps.extensionSettings[deps.extensionName].customStyles = {};
    }
    deps.extensionSettings[deps.extensionName].customStyles[themeName] = {
      ...draft,
    };
    deps.getContext().saveSettingsDebounced();
    deps.applyCustomStyle();
    overlay.remove();
    deps.cfmToastr.success("外观已应用", "自定义外观", { timeOut: 2000 });
  });

  overlay.find("#cfm-theme-close").on("click", function () {
    overlay.remove();
  });
}
