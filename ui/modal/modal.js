// 通用模态层：承接插件弹窗或子弹窗的基础 overlay、挂载、关闭与焦点管理。
// 说明：原 index.js 中大量弹窗骨架重复（创建 overlay → 创建 dialog →
//       绑定 overlay 点击关闭 / ESC 关闭 → closeDialog 辅助），此处统一抽取为
//       createOverlayDialog / createChoiceDialog 两个通用构建器。
//
// createOverlayDialog(options)：
//   options = {
//     $,                    // jQuery
//     overlayClass,         // overlay 的 class（默认 'cfm-dialog-overlay'）
//     dialogHtml,           // dialog 的 HTML 字符串（必填）
//     mountTo,              // 挂载点：'body' | 'popup'（默认 'body'）
//     onOverlayClick,       // 点击遮罩回调 (close) => void（默认自动关闭）
//     onEsc,                // ESC 回调 (close) => void（默认自动关闭）
//   }
//   返回 { overlay, dialog, close }
//   结构：overlay（遮罩 div）包裹 dialog（父子结构），适用 flex 居中的遮罩样式。
//
// createChoiceDialog(options)：
//   options = {
//     $,                    // jQuery
//     title,                // 标题文本（可选）
//     message,              // 消息 HTML（可选）
//     choices,              // [{ value, label, className, style }]
//     overlayClass,         // 可选，默认 'cfm-edit-popup-overlay'
//     maxWidth,             // 可选，默认 380
//   }
//   返回 Promise<value>；遮罩点击 / ESC 关闭时解析为 'cancel'

export function createModalApiCore(deps) {
  const { $ } = deps;

  function createOverlayDialog(options = {}) {
    const {
      overlayClass = "cfm-dialog-overlay",
      dialogHtml = "",
      mountTo = "body",
      onOverlayClick = null,
      onEsc = null,
    } = options;

    const overlay = $(`<div class="${overlayClass}"></div>`);
    const dialog = $(dialogHtml);
    overlay.append(dialog);

    if (mountTo === "popup") {
      $("#cfm-popup").append(overlay);
    } else {
      $("body").append(overlay);
    }

    const escHandler = (e) => {
      if (e.key !== "Escape") return;
      if (typeof onEsc === "function") {
        onEsc(close);
      } else {
        close();
      }
    };

    const close = () => {
      $(document).off("keydown", escHandler);
      overlay.remove();
    };

    overlay.on("click", (e) => {
      if (!$(e.target).is(overlay)) return;
      if (typeof onOverlayClick === "function") {
        onOverlayClick(close);
      } else {
        close();
      }
    });

    $(document).on("keydown", escHandler);

    return { overlay, dialog, close };
  }

  function createChoiceDialog(options = {}) {
    const {
      title = "",
      message = "",
      choices = [],
      overlayClass = "cfm-edit-popup-overlay",
      maxWidth = 380,
    } = options;

    return new Promise((resolve) => {
      const buttonsHtml = choices
        .map(
          (c) =>
            `<button class="${c.className || "cfm-edit-popup-confirm"}" data-choice="${c.value}" style="${c.style || ""}">${c.label}</button>`,
        )
        .join("");

      const { overlay, dialog, close } = createOverlayDialog({
        $,
        overlayClass,
        mountTo: "body",
        dialogHtml: `
          <div class="cfm-edit-popup" style="max-width:${maxWidth}px;">
            ${title ? `<div class="cfm-edit-popup-title">${title}</div>` : ""}
            ${message ? `<div class="cfm-edit-field" style="font-size:13px;line-height:1.6;">${message}</div>` : ""}
            <div class="cfm-edit-popup-actions" style="gap:8px;">${buttonsHtml}</div>
          </div>
        `,
        onOverlayClick: (cl) => {
          resolve("cancel");
          cl();
        },
        onEsc: (cl) => {
          resolve("cancel");
          cl();
        },
      });

      dialog.find("[data-choice]").on("click", function () {
        const value = $(this).attr("data-choice");
        resolve(value);
        close();
      });
    });
  }

  return { createOverlayDialog, createChoiceDialog };
}
