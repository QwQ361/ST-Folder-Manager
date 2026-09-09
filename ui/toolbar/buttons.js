// 入口按钮 UI 层：承接顶栏按钮、悬浮按钮、魔术棒入口按钮与顶栏图标美化适配的 DOM 组合和事件出口。

export function destroyAllButtonsCore(deps) {
  deps.$("#cfm-folder-button").remove();
  deps.$(deps.window).off("resize.cfm");
  deps.$(deps.document).off(
    "mousemove.cfmDrag touchmove.cfmDrag mouseup.cfmDrag touchend.cfmDrag",
  );
  deps.$("#cfm-topbar-button").remove();
  deps.$("#cfm-wand-button").remove();

  // 清理主题绑定背景的监听事件，避免重复绑定
  const themesSelect = deps.document.getElementById("themes");
  if (themesSelect) deps.$(themesSelect).off("change.cfmBgBinding");
}

export function switchButtonModeCore(newMode, deps) {
  deps.destroyAllButtons();
  deps.setButtonMode(newMode);
  if (newMode === "topbar") deps.createTopbarButton();
  else if (newMode === "wand") deps.createWandButton();
  else deps.createFloatingButton();

  // 重新设置主题绑定背景的监听（所有按钮模式都需要）
  deps.setTimeout(() => deps.setupThemeBgBindingListener(), 500);
}

export function createTopbarButtonCore(deps) {
  const $ = deps.$;
  if ($("#cfm-topbar-button").length > 0) return;

  const btn = $(
    `<div id="cfm-topbar-button" class="drawer"><div class="drawer-toggle drawer-header"><div class="drawer-icon closedIcon fa-solid fa-folder fa-fw interactable" title="酒馆资源管理器" tabindex="0" role="button"></div></div></div>`,
  );
  const rightNav = $("#rightNavHolder");
  if (rightNav.length > 0) rightNav.before(btn);
  else $("#top-settings-holder").append(btn);

  btn.find(".drawer-toggle").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if ($("#cfm-overlay").length > 0) {
      deps.closeMainPopup();
      return;
    }
    deps.showMainPopup();
  });

  // 创建按钮后自动检测并应用自定义图标（延迟等待美化主题样式加载）
  deps.setTimeout(() => {
    deps.applyTopbarIconFromConfig();
    // 启动主题切换自动监听（仅topbar模式需要，用于图标美化适配）
    deps.setupThemeChangeObserver();
  }, 500);
}

export function isImageIconBackgroundCore(bgImage) {
  if (!bgImage || bgImage === "none" || bgImage === "") return false;
  return /\b(?:url|image-set)\(/i.test(bgImage);
}

export function detectNeighborIconCore(deps) {
  // 同时检测 .drawer-icon 和 .drawer-toggle 两种元素
  for (const cls of [".drawer-icon", ".drawer-toggle"]) {
    const neighborIcon = deps.document.querySelector(
      `#persona-management-button ${cls}`,
    );
    if (!neighborIcon) continue;

    // 跳过处于打开状态的邻居按钮图标
    if (
      cls === ".drawer-icon" &&
      neighborIcon.classList.contains("openIcon")
    ) {
      continue;
    }

    // 先检测元素本身的 background-image
    const computed = deps.window.getComputedStyle(neighborIcon);
    const bgImage = computed.backgroundImage;
    if (deps.isImageIconBackground(bgImage)) {
      const extraStyles = {};
      if (cls === ".drawer-toggle") {
        const w = computed.width;
        const h = computed.height;
        const bgSize = computed.backgroundSize;
        const bgRepeat = computed.backgroundRepeat;
        const bgPos = computed.backgroundPosition;
        const display = computed.display;
        const color = computed.color;
        if (w) extraStyles.width = w;
        if (h) extraStyles.height = h;
        if (bgSize) extraStyles.backgroundSize = bgSize;
        if (bgRepeat) extraStyles.backgroundRepeat = bgRepeat;
        if (bgPos) extraStyles.backgroundPosition = bgPos;
        if (display) extraStyles.display = display;
        if (color) extraStyles.color = color;
      }
      return { cssUrl: bgImage, target: cls, styles: extraStyles };
    }

    // 再检测 ::before 伪元素的 background-image
    // 某些美化主题通过 .drawer-icon::before 设置图标
    const beforeComputed = deps.window.getComputedStyle(neighborIcon, "::before");
    const beforeBgImage = beforeComputed.backgroundImage;
    if (deps.isImageIconBackground(beforeBgImage)) {
      const extraStyles = {};
      const w = beforeComputed.width;
      const h = beforeComputed.height;
      const bgSize = beforeComputed.backgroundSize;
      const bgRepeat = beforeComputed.backgroundRepeat;
      const bgPos = beforeComputed.backgroundPosition;
      if (w) extraStyles.width = w;
      if (h) extraStyles.height = h;
      if (bgSize) extraStyles.backgroundSize = bgSize;
      if (bgRepeat) extraStyles.backgroundRepeat = bgRepeat;
      if (bgPos) extraStyles.backgroundPosition = bgPos;
      return {
        cssUrl: beforeBgImage,
        target: cls + "::before",
        styles: extraStyles,
      };
    }
  }
  return null;
}

export function detectThemeIconsCore(deps) {
  const iconMap = {};
  for (const sheet of deps.document.styleSheets) {
    try {
      // 只处理内联 <style> 元素（跳过外部 <link> 样式表以避免跨域问题）
      if (
        !sheet.ownerNode ||
        sheet.ownerNode.tagName?.toUpperCase() !== "STYLE"
      )
        continue;
      for (const rule of sheet.cssRules) {
        if (!rule.selectorText || !rule.style) continue;
        if (!deps.isImageIconBackground(rule.style.backgroundImage)) continue;

        // 放宽匹配：任何包含 #xxx 和 .drawer-icon 或 .drawer-toggle 的选择器
        // 同时支持 ::before 伪元素（某些美化主题通过 ::before 设置图标）
        // 支持逗号分隔的多选择器（matchAll 全局匹配）
        const matches = rule.selectorText.matchAll(
          /#([\w-]+)(?:\s+|.*?)(?:\.drawer-icon|\.drawer-toggle)(?:::before)?/g,
        );
        for (const match of matches) {
          iconMap[match[1]] = rule.style.backgroundImage;
        }
      }
    } catch (e) {
      // 跨域样式表，跳过
    }
  }

  // 也通过 computed style 检测所有已知的顶栏按钮
  const knownButtons = [
    "user-settings-button",
    "persona-management-button",
    "ai-config-button",
    "character-management-button",
    "world-info-button",
  ];
  for (const btnId of knownButtons) {
    if (iconMap[btnId]) continue; // CSS 规则已检测到

    // 同时检测 .drawer-icon 和 .drawer-toggle 两种元素
    for (const cls of [".drawer-icon", ".drawer-toggle"]) {
      const iconEl = deps.document.querySelector(`#${btnId} ${cls}`);
      if (!iconEl) continue;

      // 跳过处于打开状态的图标，避免读取到 openIcon 的不同样式
      if (cls === ".drawer-icon" && iconEl.classList.contains("openIcon")) {
        continue;
      }

      // 先检测元素本身
      const computed = deps.window.getComputedStyle(iconEl);
      const bgImage = computed.backgroundImage;
      if (deps.isImageIconBackground(bgImage)) {
        iconMap[btnId] = bgImage;
        break;
      }

      // 再检测 ::before 伪元素
      const beforeComputed = deps.window.getComputedStyle(iconEl, "::before");
      const beforeBgImage = beforeComputed.backgroundImage;
      if (deps.isImageIconBackground(beforeBgImage)) {
        iconMap[btnId] = beforeBgImage;
        break;
      }
    }
  }

  const uniqueUrls = [...new Set(Object.values(iconMap))];
  return { icons: iconMap, uniqueUrls };
}

export function applyCustomIconCore(cssUrl, targetCls, extraStyles, deps) {
  const $ = deps.$;
  const icon = $("#cfm-topbar-button .drawer-icon");
  if (icon.length === 0) return;

  // ★ 先统一清理所有旧模式的残留状态，再应用新模式
  // 清理 ::before 模式残留
  icon.removeClass("cfm-custom-icon-before");
  $("#cfm-dynamic-icon-style").remove();
  // 清理元素本身 background-image 残留
  icon.css("background-image", "");
  // 清理 .drawer-toggle 模式残留
  const toggle = $("#cfm-topbar-button .drawer-toggle");
  if (toggle.length > 0) {
    toggle.removeClass("cfm-custom-toggle-icon");
    toggle.css({
      "background-image": "",
      "background-repeat": "",
      "background-position": "",
      "background-size": "",
      width: "",
      height: "",
      color: "",
    });
  }

  // 标记为自定义图标模式
  icon.addClass("cfm-custom-icon");

  // 检测是否是 ::before 伪元素模式
  const isPseudoBefore = targetCls && targetCls.includes("::before");

  if (isPseudoBefore) {
    // ::before 伪元素模式：通过动态 <style> 注入伪元素样式
    // 美化主题的通用规则 .drawer-icon::before 已为所有 .drawer-icon 设置了尺寸等样式，
    // 我们只需要设置 background-image 即可，其他属性让美化主题的规则自然生效
    icon.addClass("cfm-custom-icon-before");
    const styleEl = $(
      `<style id="cfm-dynamic-icon-style">
          #cfm-topbar-button .drawer-icon.cfm-custom-icon-before::before {
            content: '' !important;
            display: block !important;
            background-image: ${cssUrl} !important;
          }
        </style>`,
    );
    $("head").append(styleEl);
  } else if (targetCls === ".drawer-toggle" && extraStyles) {
    // .drawer-toggle 模式：将图标应用到 .drawer-toggle 元素
    if (toggle.length > 0) {
      toggle.addClass("cfm-custom-toggle-icon");
      toggle.css({
        "background-image": cssUrl,
        "background-repeat": extraStyles.backgroundRepeat || "no-repeat",
        "background-position": extraStyles.backgroundPosition || "center",
        "background-size": extraStyles.backgroundSize || "contain",
        width: extraStyles.width || "27px",
        height: extraStyles.height || "27px",
        color: "transparent",
      });
    }
  } else {
    // .drawer-icon 元素本身模式：直接设置 background-image
    icon.css("background-image", cssUrl);
  }
}

export function clearCustomIconCore(deps) {
  const $ = deps.$;
  const icon = $("#cfm-topbar-button .drawer-icon");
  if (icon.length === 0) return;

  icon.removeClass("cfm-custom-icon cfm-custom-icon-before");
  icon.css("background-image", "");
  // 移除动态注入的 ::before 样式
  $("#cfm-dynamic-icon-style").remove();
  // 清除 .drawer-toggle 上的自定义样式
  const toggle = $("#cfm-topbar-button .drawer-toggle");
  if (toggle.length > 0) {
    toggle.removeClass("cfm-custom-toggle-icon");
    toggle.css({
      "background-image": "",
      "background-repeat": "",
      "background-position": "",
      "background-size": "",
      width: "",
      height: "",
      color: "",
    });
  }
}

export function applyTopbarIconFromConfigCore(deps) {
  const saved = deps.extensionSettings[deps.extensionName].customTopbarIcon || "";
  if (saved) {
    // 用户手动指定了URL
    deps.applyCustomIcon(deps.toCssUrl(saved));
    return;
  }

  // 自动检测：直接读取邻居按钮的实际样式
  const result = deps.detectNeighborIcon();
  if (result) {
    deps.applyCustomIcon(result.cssUrl, result.target, result.styles);
    return;
  }

  // 没有美化主题或没有图标替换，保持默认FA图标
  deps.clearCustomIcon();
}

export function createTopbarIconThemeObserverController(deps) {
  /** 记录上一次邻居按钮的 background-image，用于检测变化 */
  let lastNeighborBg = null;
  /** 主题变化轮询定时器 */
  let themeCheckTimer = null;

  function setupThemeChangeObserver() {
    // --- 策略1: MutationObserver 监听 <head> 中 style 元素的增删和内容变化 ---
    const headObserver = new deps.MutationObserver((mutations) => {
      let styleChanged = false;
      for (const mutation of mutations) {
        // 检查是否有 style 节点被添加/删除
        if (mutation.type === "childList") {
          for (const node of [
            ...mutation.addedNodes,
            ...mutation.removedNodes,
          ]) {
            if (
              node.nodeType === deps.Node.ELEMENT_NODE &&
              (node.tagName === "STYLE" || node.tagName === "LINK")
            ) {
              styleChanged = true;
              break;
            }
          }
        }
        // 检查 style 元素内容变化
        if (
          mutation.type === "characterData" &&
          mutation.target.parentNode?.tagName === "STYLE"
        ) {
          styleChanged = true;
        }
      }
      if (styleChanged) {
        // 延迟执行，等浏览器完成样式计算
        deps.setTimeout(() => onThemeStyleChange(), 300);
      }
    });
    headObserver.observe(deps.document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // --- 策略2: 监听 custom-style 元素的内容变化 ---
    const customStyle = deps.document.getElementById("custom-style");
    if (customStyle) {
      const customObserver = new deps.MutationObserver(() => {
        deps.setTimeout(() => onThemeStyleChange(), 300);
      });
      customObserver.observe(customStyle, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    // --- 策略3: 轮询检测邻居按钮样式变化（兜底） ---
    const initResult = deps.detectNeighborIcon();
    lastNeighborBg = initResult ? initResult.cssUrl : null;
    themeCheckTimer = deps.setInterval(() => {
      // 如果邻居按钮处于打开状态（openIcon），跳过本次检测
      // 避免因读取到打开状态的不同图标或读取不到图标而误触发更新
      const neighborDrawerIcon = deps.document.querySelector(
        "#persona-management-button .drawer-icon",
      );
      if (
        neighborDrawerIcon &&
        neighborDrawerIcon.classList.contains("openIcon")
      ) {
        return; // 邻居面板打开中，不做任何检测和更新
      }
      const result = deps.detectNeighborIcon();
      const currentBg = result ? result.cssUrl : null;
      if (currentBg !== lastNeighborBg) {
        lastNeighborBg = currentBg;
        onThemeStyleChange();
      }
    }, 2000);
  }

  function onThemeStyleChange() {
    const saved = deps.extensionSettings[deps.extensionName].customTopbarIcon || "";
    if (saved) {
      // 用户手动指定了URL，不自动覆盖
      return;
    }

    // 如果邻居按钮处于打开状态（openIcon），跳过本次更新
    // 避免因打开状态的不同图标样式而覆盖CFM图标
    const neighborDrawerIcon = deps.document.querySelector(
      "#persona-management-button .drawer-icon",
    );
    if (
      neighborDrawerIcon &&
      neighborDrawerIcon.classList.contains("openIcon")
    ) {
      return;
    }

    // 自动模式：重新检测邻居图标
    const result = deps.detectNeighborIcon();
    lastNeighborBg = result ? result.cssUrl : null;
    if (result) {
      deps.applyCustomIcon(result.cssUrl, result.target, result.styles);
    } else {
      deps.clearCustomIcon();
    }
  }

  function clearThemeCheckTimer() {
    if (!themeCheckTimer) return;
    deps.clearInterval(themeCheckTimer);
    themeCheckTimer = null;
  }

  return {
    clearThemeCheckTimer,
    onThemeStyleChange,
    setupThemeChangeObserver,
  };
}

export function createFloatingButtonCore(deps) {
  const $ = deps.$;
  if ($("#cfm-folder-button").length > 0) return;

  const btn = $(
    `<div id="cfm-folder-button" title="酒馆资源管理器"><i class="fa-solid fa-folder"></i></div>`,
  );
  $("body").append(btn);

  const savedPos = JSON.parse(
    deps.localStorage.getItem(deps.storageKeyBtnPos) || "null",
  );
  if (savedPos) {
    // 边界校正：防止在不同设备/分辨率下按钮超出屏幕
    let posTop = parseInt(savedPos.top, 10) || 150;
    let posLeft = parseInt(savedPos.left, 10);
    const btnSize = 44;
    const winW = $(deps.window).width();
    const winH = $(deps.window).height();
    if (isNaN(posLeft) || posLeft > winW - btnSize)
      posLeft = winW - btnSize - 10;
    if (posLeft < 0) posLeft = 10;
    if (posTop > winH - btnSize) posTop = winH - btnSize - 10;
    if (posTop < 0) posTop = 10;
    btn.css({
      top: posTop + "px",
      left: posLeft + "px",
      right: "auto",
      bottom: "auto",
    });
  } else {
    btn.css({
      top: "150px",
      right: "15px",
      left: "auto",
      bottom: "auto",
    });
  }

  let isDragging = false,
    hasMoved = false,
    offset = { x: 0, y: 0 },
    startPos = { x: 0, y: 0 };

  let longPressTimer = null;
  let longPressTriggered = false;

  // PC端：鼠标拖拽
  btn.on("mousedown", (e) => {
    hasMoved = false;
    const pos = btn.offset();
    offset.x = e.pageX - pos.left;
    offset.y = e.pageY - pos.top;
    startPos.x = e.pageX;
    startPos.y = e.pageY;
    isDragging = true;
    btn.css("cursor", "grabbing");
    e.preventDefault();
  });
  $(deps.document).on("mousemove.cfmDrag", (e) => {
    if (!isDragging) return;
    if (
      Math.abs(e.pageX - startPos.x) > 5 ||
      Math.abs(e.pageY - startPos.y) > 5
    )
      hasMoved = true;
    if (hasMoved)
      btn.css({
        top: e.pageY - offset.y + "px",
        left: e.pageX - offset.x + "px",
        right: "auto",
        bottom: "auto",
      });
  });
  $(deps.document).on("mouseup.cfmDrag", () => {
    if (!isDragging) return;
    isDragging = false;
    btn.css("cursor", "grab");
    if (hasMoved)
      deps.localStorage.setItem(
        deps.storageKeyBtnPos,
        JSON.stringify({ top: btn.css("top"), left: btn.css("left") }),
      );
    deps.setTimeout(() => {
      hasMoved = false;
    }, 50);
  });
  btn.on("click", (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    deps.showMainPopup();
  });

  // 移动端：触摸长按拖拽（使用原生事件 + passive:false）
  const btnEl = btn[0];
  let tSx, tSy;
  let btnTouchEnded = false;
  btnEl.addEventListener(
    "touchstart",
    (e) => {
      hasMoved = false;
      longPressTriggered = false;
      btnTouchEnded = false;
      const t = e.touches[0];
      tSx = t.clientX;
      tSy = t.clientY;
      const pos = btn.offset();
      offset.x = t.pageX - pos.left;
      offset.y = t.pageY - pos.top;
      longPressTimer = deps.setTimeout(() => {
        longPressTimer = null;
        // 竞态保护：如果 touchend 已经触发，不再启动长按拖拽
        if (btnTouchEnded) return;
        longPressTriggered = true;
        isDragging = true;
        btn.addClass("cfm-long-press-ready");
        if (deps.navigator.vibrate) deps.navigator.vibrate(50);
      }, 500);
    },
    { passive: true },
  );

  btnEl.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (!isDragging) {
        if (
          Math.abs(t.clientX - tSx) > 10 ||
          Math.abs(t.clientY - tSy) > 10
        ) {
          if (longPressTimer) {
            deps.clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
        return;
      }
      e.preventDefault();
      hasMoved = true;
      btn.css({
        top: t.pageY - offset.y + "px",
        left: t.pageX - offset.x + "px",
        right: "auto",
        bottom: "auto",
      });
    },
    { passive: false },
  );

  btnEl.addEventListener(
    "touchend",
    (e) => {
      btnTouchEnded = true;
      if (longPressTimer) {
        deps.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (!isDragging && !longPressTriggered) {
        e.preventDefault();
        deps.showMainPopup();
        return;
      }
      if (isDragging) {
        isDragging = false;
        btn.removeClass("cfm-long-press-ready");
        if (hasMoved)
          deps.localStorage.setItem(
            deps.storageKeyBtnPos,
            JSON.stringify({ top: btn.css("top"), left: btn.css("left") }),
          );
      }
      hasMoved = false;
      longPressTriggered = false;
    },
    { passive: false },
  );

  btnEl.addEventListener("touchcancel", () => {
    btnTouchEnded = true;
    if (longPressTimer) {
      deps.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (isDragging) {
      isDragging = false;
      btn.removeClass("cfm-long-press-ready");
    }
    hasMoved = false;
    longPressTriggered = false;
  });

  let resizeTimer;
  $(deps.window).on("resize.cfm", () => {
    deps.clearTimeout(resizeTimer);
    resizeTimer = deps.setTimeout(() => {
      const b = $("#cfm-folder-button");
      if (!b.length) return;
      let l = b.offset().left,
        t = b.offset().top;
      const maxL = $(deps.window).width() - b.outerWidth(),
        maxT = $(deps.window).height() - b.outerHeight();
      if (l > maxL) l = maxL;
      if (l < 0) l = 0;
      if (t > maxT) t = maxT;
      if (t < 0) t = 0;
      b.css({ top: t + "px", left: l + "px" });
      deps.localStorage.setItem(
        deps.storageKeyBtnPos,
        JSON.stringify({ top: b.css("top"), left: b.css("left") }),
      );
    }, 150);
  });
}

export function createWandButtonCore(deps) {
  const $ = deps.$;
  if ($("#cfm-wand-button").length > 0) return;

  const extensionsMenu = $("#extensionsMenu");
  if (extensionsMenu.length === 0) {
    // 如果魔术棒菜单还没加载，延迟重试
    deps.setTimeout(() => deps.createWandButton(), 500);
    return;
  }

  const buttonHtml = $(`
      <div id="cfm-wand-button" class="list-group-item flex-container flexGap5 interactable" title="酒馆资源管理器">
        <div class="fa-solid fa-folder extensionsMenuExtensionButton"></div>
        <span>资源管理器</span>
      </div>
    `);
  extensionsMenu.append(buttonHtml);
  buttonHtml.on("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 关闭魔术棒下拉菜单
    $("#extensionsMenu").hide();
    deps.showMainPopup();
  });
}
