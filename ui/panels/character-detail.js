// 角色详情面板候选层：仅承接老代码中确认为角色卡详情展示的 DOM 组件；角色文件夹、收藏和聊天记录业务不得混入本文件。
// 任务22b：承接 showEditPopup（快速编辑角色卡弹窗）与 executeCharEdit（批量更新 creator/version）。

export function createCharDetailApi(deps) {
  const {
    $,
    escapeHtml,
    cfmToastr,
    getContext,
    showBatchProgressOverlay,
  } = deps;

  // 显示编辑弹窗（支持单个或批量）
  async function showEditPopup(avatars) {
    if (!avatars || avatars.length === 0) return;
    const characters = getContext().characters;
    // 单个角色时预填当前值
    let defaultCreator = "";
    let defaultVersion = "";
    if (avatars.length === 1) {
      const char = characters.find((c) => c.avatar === avatars[0]);
      if (char) {
        defaultCreator = char.data?.creator || "";
        defaultVersion = char.data?.character_version || "";
      }
    }
    const charNames = avatars.map((av) => {
      const c = characters.find((ch) => ch.avatar === av);
      return c ? c.name : av;
    });
    const nameListHtml =
      avatars.length <= 5
        ? charNames
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("")
        : charNames
            .slice(0, 5)
            .map(
              (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
            )
            .join("") +
          `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${avatars.length} 个角色卡</div>`;

    const popupHtml = `
      <div class="cfm-edit-popup-overlay">
        <div class="cfm-edit-popup">
          <div class="cfm-edit-popup-title">快速编辑角色卡</div>
          <div class="cfm-edit-popup-names">${nameListHtml}</div>
          <div class="cfm-edit-popup-field">
            <label>作者名 (Creator)</label>
            <input type="text" class="cfm-edit-input" id="cfm-edit-creator" value="${escapeHtml(defaultCreator)}" placeholder="${avatars.length > 1 ? "留空则不修改" : "输入作者名"}">
          </div>
          <div class="cfm-edit-popup-field">
            <label>版本名 (Version)</label>
            <input type="text" class="cfm-edit-input" id="cfm-edit-version" value="${escapeHtml(defaultVersion)}" placeholder="${avatars.length > 1 ? "留空则不修改" : "输入版本名"}">
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
            <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
          </div>
        </div>
      </div>
    `;
    const overlay = $(popupHtml);
    $("body").append(overlay);
    overlay.find("#cfm-edit-creator").focus();

    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const creator = overlay.find("#cfm-edit-creator").val().trim();
        const version = overlay.find("#cfm-edit-version").val().trim();
        overlay.remove();
        resolve({ creator, version });
      });
      // Enter键确认
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

// ==================== executeCharEdit (L9974-10042) ====================
  // 执行角色卡编辑
  async function executeCharEdit(avatars) {
    const result = await showEditPopup(avatars);
    if (!result) return;
    const { creator, version } = result;
    const isBatch = avatars.length > 1;
    // 批量模式下，留空表示不修改
    if (isBatch && !creator && !version) {
      cfmToastr.warning("请至少填写一个字段");
      return;
    }
    const characters = getContext().characters;
    const headers = getContext().getRequestHeaders();
    let success = 0;
    let fail = 0;
    const batchProgress = showBatchProgressOverlay(
      "正在更新角色卡",
      avatars.length,
    );
    let processed = 0;

    for (const avatar of avatars) {
      const char = characters.find((c) => c.avatar === avatar);
      if (!char) {
        fail++;
        processed++;
        batchProgress.update(processed);
        continue;
      }
      const data = {
        avatar: char.avatar,
        data: {},
      };
      // 单个模式：直接用输入值（可以清空）；批量模式：留空不修改
      if (isBatch) {
        if (creator) data.data.creator = creator;
        if (version) data.data.character_version = version;
      } else {
        data.data.creator = creator;
        data.data.character_version = version;
      }
      try {
        const resp = await fetch("/api/characters/merge-attributes", {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        });
        if (resp.ok) {
          // 更新本地缓存
          if (!char.data) char.data = {};
          if (isBatch) {
            if (creator) char.data.creator = creator;
            if (version) char.data.character_version = version;
          } else {
            char.data.creator = creator;
            char.data.character_version = version;
          }
          success++;
        } else {
          fail++;
        }
      } catch (e) {
        console.warn(`[CFM] 编辑角色卡 ${avatar} 失败`, e);
        fail++;
      }
      processed++;
      batchProgress.update(processed);
    }
    // 收尾：计算结果并关闭进度条（其他批量模块统一模式：done + toast）
    let msg = `已更新 ${success} 个角色卡`;
    if (fail > 0) msg += `，${fail} 个失败`;
    batchProgress.done(msg);
    if (success > 0 && fail === 0) {
      cfmToastr.success(msg);
    } else if (success > 0 && fail > 0) {
      cfmToastr.warning(msg);
    } else if (fail > 0) {
      cfmToastr.error(msg);
    }
  }
  return { showEditPopup, executeCharEdit };
}
