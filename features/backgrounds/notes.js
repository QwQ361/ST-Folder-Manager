// 背景备注层：承接 backgrounds 资源域的备注读取、保存、批量编辑、导入导出恢复与背景重命名后的备注键迁移。

export function getBgNoteCore(name, deps) {
  return deps.settings[deps.extensionName].bgNotes?.[name] || "";
}

export function setBgNoteCore(name, note, deps) {
  if (!deps.settings[deps.extensionName].bgNotes) {
    deps.settings[deps.extensionName].bgNotes = {};
  }
  if (note) {
    deps.settings[deps.extensionName].bgNotes[name] = note;
  } else {
    delete deps.settings[deps.extensionName].bgNotes[name];
  }
  deps.saveSettingsDebounced();
}

// ==================== 背景备注弹窗（任务22a 拆分） ====================
// 承接 showBgNotePopup（备注+方向编辑弹窗）与 executeBgNoteEdit（执行批量/统一备注与方向更新）。

export function createBgNotePopupApi(deps) {
  const {
    $,
    escapeHtml,
    cfmConfirm,
    cfmToastr,
    getBgNote,
    getBgOrientation,
    getBackgroundDisplayName,
    getBackgroundThumbnailUrl,
    setBgNote,
    setBgOrientation,
    renderBackgroundsView,
    BG_ORIENT_LANDSCAPE,
    BG_ORIENT_PORTRAIT,
    BG_ORIENT_OTHER,
    BG_ORIENT_ICONS,
    BG_ORIENT_LABELS,
  } = deps;

    async function showBgNotePopup(bgNames) {
      if (!bgNames || bgNames.length === 0) return;
      const isBatch = bgNames.length > 1;
      let defaultNote = "";
      let defaultOrient = "";
      if (!isBatch) {
        defaultNote = getBgNote(bgNames[0]);
        defaultOrient = getBgOrientation(bgNames[0]) || "";
      }
      const nameListHtml =
        bgNames.length <= 5
          ? bgNames
              .map(
                (n) =>
                  `<div class="cfm-edit-name-item">${escapeHtml(getBackgroundDisplayName(n))}</div>`,
              )
              .join("")
          : bgNames
              .slice(0, 5)
              .map(
                (n) =>
                  `<div class="cfm-edit-name-item">${escapeHtml(getBackgroundDisplayName(n))}</div>`,
              )
              .join("") +
            `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${bgNames.length} 个背景</div>`;

      const individualListHtml = isBatch
        ? bgNames
            .map((n) => {
              const displayName = getBackgroundDisplayName(n);
              const currentNote = getBgNote(n);
              const thumbUrl = getBackgroundThumbnailUrl
                ? getBackgroundThumbnailUrl(n)
                : "";
              return `<div class="cfm-rename-individual-row"><span class="cfm-rename-individual-thumb" style="background-image:url('${thumbUrl}');"></span><span class="cfm-rename-old-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(n)}" value="${escapeHtml(currentNote)}"></div>`;
            })
            .join("")
        : "";

      const orientOptions = [
        { value: "", label: "不修改", icon: "fa-minus" },
        {
          value: BG_ORIENT_LANDSCAPE,
          label: "横屏",
          icon: BG_ORIENT_ICONS[BG_ORIENT_LANDSCAPE],
        },
        {
          value: BG_ORIENT_PORTRAIT,
          label: "竖屏",
          icon: BG_ORIENT_ICONS[BG_ORIENT_PORTRAIT],
        },
        {
          value: BG_ORIENT_OTHER,
          label: "其它",
          icon: BG_ORIENT_ICONS[BG_ORIENT_OTHER],
        },
      ];
      const orientHtml = orientOptions
        .map(
          (o) =>
            `<label class="cfm-orient-option ${defaultOrient === o.value ? "cfm-orient-active" : ""}"><input type="radio" name="cfm-bg-orient" value="${o.value}" ${defaultOrient === o.value ? "checked" : ""}><i class="fa-solid ${o.icon}"></i> ${o.label}</label>`,
        )
        .join("");

      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">编辑背景备注</div>
            <div class="cfm-edit-popup-names">${nameListHtml}</div>
            <div class="cfm-edit-popup-field cfm-orient-field">
              <label>屏幕方向</label>
              <div class="cfm-orient-group">${orientHtml}</div>
            </div>
            ${
              isBatch
                ? `<div class="cfm-edit-popup-field">
              <label>备注操作类型</label>
              <select class="cfm-edit-input" id="cfm-bg-note-action">
                <option value="uniform">统一备注</option>
                <option value="individual">逐个备注</option>
              </select>
            </div>`
                : ""
            }
            <div class="cfm-edit-popup-field" id="cfm-bg-note-uniform-field">
              <label>备注</label>
              <input type="text" class="cfm-edit-input" id="cfm-bg-note-input" value="${escapeHtml(defaultNote)}" placeholder="${isBatch ? "留空则不修改，点击清除可批量清空" : "输入备注内容"}">
            </div>
            ${
              isBatch
                ? `<div class="cfm-rename-individual-field" id="cfm-bg-note-individual-field">
              <label>逐个指定备注（留空则不修改）</label>
              <div class="cfm-rename-individual-list">${individualListHtml}</div>
            </div>`
                : ""
            }
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              ${!isBatch ? (defaultNote ? '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>' : "") : '<button class="cfm-btn cfm-edit-popup-clear">清除备注</button>'}
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>
      `;
      const overlay = $(popupHtml);
      $("body").append(overlay);

      // 方向选项点击高亮
      overlay.find(".cfm-orient-option").on("click", function () {
        overlay.find(".cfm-orient-option").removeClass("cfm-orient-active");
        $(this).addClass("cfm-orient-active");
      });

      if (isBatch) {
        function updateBgNoteUI() {
          const action = overlay.find("#cfm-bg-note-action").val();
          const uniformField = overlay.find("#cfm-bg-note-uniform-field");
          const individualField = overlay.find("#cfm-bg-note-individual-field");
          const namesBlock = overlay.find(".cfm-edit-popup-names");
          const clearBtn = overlay.find(".cfm-edit-popup-clear");
          if (action === "individual") {
            uniformField.hide();
            namesBlock.hide();
            individualField.show();
            clearBtn.hide();
            individualField.find(".cfm-rename-new-input").first().focus();
          } else {
            individualField.hide();
            uniformField.show();
            namesBlock.show();
            clearBtn.show();
            overlay.find("#cfm-bg-note-input").focus();
          }
        }
        updateBgNoteUI();
        overlay.find("#cfm-bg-note-action").on("change", updateBgNoteUI);
      } else {
        overlay.find("#cfm-bg-note-input").focus();
      }

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
        overlay.find(".cfm-edit-popup-clear").on("click", () => {
          if (!cfmConfirm("确认清除备注吗？")) return;
          overlay.remove();
          resolve({ note: "", orient: "", clear: true });
        });
        overlay.find(".cfm-edit-popup-confirm").on("click", () => {
          const orient =
            overlay.find('input[name="cfm-bg-orient"]:checked').val() || "";
          if (
            isBatch &&
            overlay.find("#cfm-bg-note-action").val() === "individual"
          ) {
            const noteMap = {};
            overlay.find(".cfm-rename-individual-row").each(function () {
              const name = $(this).find(".cfm-rename-new-input").data("old-name");
              const note = $(this).find(".cfm-rename-new-input").val().trim();
              noteMap[name] = note;
            });
            overlay.remove();
            resolve({ mode: "individual", noteMap, orient });
          } else {
            const note = overlay.find("#cfm-bg-note-input").val().trim();
            overlay.remove();
            resolve({ note, orient, clear: false });
          }
        });
        overlay.find("#cfm-bg-note-input").on("keydown", (e) => {
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

    async function executeBgNoteEdit(names) {
      const result = await showBgNotePopup(names);
      if (!result) return;

      if (result.mode === "individual") {
        const { noteMap, orient } = result;
        let updated = 0;
        let skipped = 0;
        for (const name of names) {
          let changed = false;
          // 处理方向（统一设置）
          if (orient) {
            setBgOrientation(name, orient);
            changed = true;
          }
          // 处理备注（逐个设置）
          const note = noteMap[name];
          if (note !== undefined && note !== "") {
            setBgNote(name, note);
            changed = true;
            updated++;
          } else {
            skipped++;
          }
        }
        let msg = `已更新 ${updated} 个背景的备注`;
        if (skipped > 0) msg += `，${skipped} 个留空未修改`;
        if (orient)
          msg += `，方向已统一设置为「${BG_ORIENT_LABELS[orient] || orient}」`;
        if (updated > 0 || orient) cfmToastr.success(msg);
        else cfmToastr.info(msg);
        renderBackgroundsView();
        return;
      }

      const { note, orient, clear } = result;
      const isBatch = names.length > 1;
      if (isBatch && !note && !orient && !clear) {
        cfmToastr.warning("请输入备注内容或选择屏幕方向");
        return;
      }
      let count = 0;
      for (const name of names) {
        let changed = false;
        // 处理方向
        if (orient) {
          setBgOrientation(name, orient);
          changed = true;
        }
        // 处理备注
        if (clear) {
          setBgNote(name, "");
          changed = true;
        } else if (note) {
          setBgNote(name, note);
          changed = true;
        } else if (!isBatch) {
          setBgNote(name, "");
          changed = true;
        }
        if (changed) count++;
      }
      if (count > 0) {
        cfmToastr.success(`已更新 ${count} 个背景的备注`);
        renderBackgroundsView();
      }
    }

  return { showBgNotePopup, executeBgNoteEdit };
}
