// 快速回复集重命名层：承接 QR Set 单项与批量重命名执行、保存新集并删除旧集、更新本地 QuickReplySet 列表、同步全局/聊天 QR 引用，以及重命名后对分组、收藏、备注和 QR 激活预设引用的修复。

export function createQuickReplyRenameApiCore(deps) {
  const {
    $,
    cfmToastr,
    clearAllExclusiveModes,
    collectCurrentSelection,
    escapeHtml,
    fetch,
    findCommonPrefix,
    findCommonSuffix,
    getVisibleResourceIds,
    renderQRView,
    showBatchProgressOverlay,
    state,
    updateSettingsAfterRename,
  } = deps;

  function enterQrRenameMode() {
      const prev = collectCurrentSelection();
      clearAllExclusiveModes();
      state.cfmQrRenameMode = true;
      state.cfmQrRenameSelected = prev || new Set();
      state.cfmQrRenameRangeMode = false;
      state.cfmQrRenameLastClicked = null;
      $("#cfm-qr-rename-btn").addClass("cfm-edit-active");
      $("#cfm-qr-rename-btn")
        .find("i")
        .removeClass("fa-i-cursor")
        .addClass("fa-check");
      $("#cfm-qr-rename-btn").attr("title", "确认重命名");
      $(".cfm-popup").addClass("cfm-qr-rename-mode");
      renderQRView();
    }



  function exitQrRenameMode() {
      state.cfmQrRenameMode = false;
      state.cfmQrRenameSelected.clear();
      state.cfmQrRenameRangeMode = false;
      state.cfmQrRenameLastClicked = null;
      $("#cfm-qr-rename-btn").removeClass("cfm-edit-active");
      $("#cfm-qr-rename-btn")
        .find("i")
        .removeClass("fa-check")
        .addClass("fa-i-cursor");
      $("#cfm-qr-rename-btn").attr("title", "重命名快速回复集");
      $(".cfm-popup").removeClass("cfm-qr-rename-mode");
      renderQRView();
    }



  function toggleQrRenameItem(id, shiftKey) {
      if ((shiftKey || state.cfmQrRenameRangeMode) && state.cfmQrRenameLastClicked) {
        const visible = getVisibleResourceIds();
        const lastIdx = visible.indexOf(state.cfmQrRenameLastClicked);
        const curIdx = visible.indexOf(id);
        if (lastIdx !== -1 && curIdx !== -1) {
          const [start, end] =
            lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
          for (let i = start; i <= end; i++) state.cfmQrRenameSelected.add(visible[i]);
        }
      } else {
        if (state.cfmQrRenameSelected.has(id)) state.cfmQrRenameSelected.delete(id);
        else state.cfmQrRenameSelected.add(id);
      }
      state.cfmQrRenameLastClicked = id;
    }



  function prependQrRenameToolbar(listContainer, renderFn) {
      if (!state.cfmQrRenameMode) return;
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => state.cfmQrRenameSelected.has(id));
      const toolbar = $(`
        <div class="cfm-edit-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-edit-range ${state.cfmQrRenameRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${state.cfmQrRenameRangeMode ? "(开)" : ""}</button>
          <span class="cfm-edit-count">${state.cfmQrRenameSelected.size > 0 ? `已选 ${state.cfmQrRenameSelected.size} 项` : ""}</span>
          <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
        </div>
      `);
      toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (allSel) {
          visible.forEach((id) => state.cfmQrRenameSelected.delete(id));
        } else {
          visible.forEach((id) => state.cfmQrRenameSelected.add(id));
        }
        renderFn();
      });
      toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.cfmQrRenameRangeMode = !state.cfmQrRenameRangeMode;
        if (state.cfmQrRenameRangeMode) state.cfmQrRenameLastClicked = null;
        renderFn();
      });
      toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitQrRenameMode();
      });
      listContainer.prepend(toolbar);
    }



  function showQrRenamePopup(names) {
      if (!names || names.length === 0) return;
      const isSingle = names.length === 1;
      const nameListHtml =
        names.length <= 5
          ? names
              .map(
                (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
              )
              .join("")
          : names
              .slice(0, 5)
              .map(
                (n) => `<div class="cfm-edit-name-item">${escapeHtml(n)}</div>`,
              )
              .join("") +
            `<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个快速回复集</div>`;

      if (isSingle) {
        const popupHtml = `
          <div class="cfm-edit-popup-overlay">
            <div class="cfm-edit-popup">
              <div class="cfm-edit-popup-title">重命名快速回复集</div>
              <div class="cfm-edit-popup-names">${nameListHtml}</div>
              <div class="cfm-edit-popup-field">
                <label>新名称</label>
                <input type="text" class="cfm-edit-input" id="cfm-qr-rename-input" value="${escapeHtml(names[0])}" placeholder="输入新名称">
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
        overlay.find("#cfm-qr-rename-input").focus().select();
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
            const newName = overlay.find("#cfm-qr-rename-input").val().trim();
            overlay.remove();
            resolve({ mode: "single", newName });
          });
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
      } else {
        const individualListHtml = names
          .map(
            (n) =>
              `<div class="cfm-rename-individual-row"><span class="cfm-rename-old-name" title="${escapeHtml(n)}">${escapeHtml(n)}</span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${escapeHtml(n)}"></div>`,
          )
          .join("");
        const popupHtml = `
          <div class="cfm-edit-popup-overlay">
            <div class="cfm-edit-popup">
              <div class="cfm-edit-popup-title">批量重命名快速回复集</div>
              <div class="cfm-edit-popup-names">${nameListHtml}</div>
              <div class="cfm-edit-popup-field">
                <label>操作类型</label>
                <select class="cfm-edit-input" id="cfm-qr-rename-action">
                  <option value="add-prefix">增加前缀</option>
                  <option value="add-suffix">增加后缀</option>
                  <option value="del-prefix">删除前缀</option>
                  <option value="del-suffix">删除后缀</option>
                  <option value="individual">逐个重命名</option>
                </select>
              </div>
              <div class="cfm-edit-popup-field" id="cfm-qr-rename-text-field">
                <label id="cfm-qr-rename-text-label">前缀内容</label>
                <input type="text" class="cfm-edit-input" id="cfm-qr-rename-text" placeholder="输入前缀内容">
              </div>
              <div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;">
                <label>自动检测到的公共前/后缀</label>
                <div id="cfm-qr-rename-detected" class="cfm-rename-detected"></div>
              </div>
              <div class="cfm-rename-individual-field" id="cfm-qr-rename-individual-field">
                <label>逐个指定新名称（留空则不修改）</label>
                <div class="cfm-rename-individual-list">${individualListHtml}</div>
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

        function updateRenameUI() {
          const action = overlay.find("#cfm-qr-rename-action").val();
          const textLabel = overlay.find("#cfm-qr-rename-text-label");
          const textInput = overlay.find("#cfm-qr-rename-text");
          const autoDetect = overlay.find(".cfm-rename-auto-detect");
          const detected = overlay.find("#cfm-qr-rename-detected");
          const textField = overlay.find("#cfm-qr-rename-text-field");
          const individualField = overlay.find("#cfm-qr-rename-individual-field");
          const namesBlock = overlay.find(".cfm-edit-popup-names");
          if (action === "individual") {
            textField.hide();
            autoDetect.hide();
            namesBlock.hide();
            individualField.show();
            individualField.find(".cfm-rename-new-input").first().focus();
          } else {
            individualField.hide();
            textField.show();
            namesBlock.show();
            if (action === "add-prefix") {
              textLabel.text("前缀内容");
              textInput.attr("placeholder", "输入要添加的前缀");
              autoDetect.hide();
            } else if (action === "add-suffix") {
              textLabel.text("后缀内容");
              textInput.attr("placeholder", "输入要添加的后缀");
              autoDetect.hide();
            } else if (action === "del-prefix") {
              textLabel.text("要删除的前缀");
              textInput.attr(
                "placeholder",
                "输入要删除的前缀，或点击下方自动检测结果",
              );
              const commonPrefix = findCommonPrefix(names);
              if (commonPrefix) {
                detected.html(
                  `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonPrefix)}">${escapeHtml(commonPrefix)}</span>`,
                );
                autoDetect.show();
              } else {
                detected.html(
                  '<span class="cfm-rename-detect-none">未检测到公共前缀</span>',
                );
                autoDetect.show();
              }
            } else if (action === "del-suffix") {
              textLabel.text("要删除的后缀");
              textInput.attr(
                "placeholder",
                "输入要删除的后缀，或点击下方自动检测结果",
              );
              const commonSuffix = findCommonSuffix(names);
              if (commonSuffix) {
                detected.html(
                  `<span class="cfm-rename-detect-item" data-value="${escapeHtml(commonSuffix)}">${escapeHtml(commonSuffix)}</span>`,
                );
                autoDetect.show();
              } else {
                detected.html(
                  '<span class="cfm-rename-detect-none">未检测到公共后缀</span>',
                );
                autoDetect.show();
              }
            }
          }
        }
        updateRenameUI();
        overlay.find("#cfm-qr-rename-action").on("change", updateRenameUI);
        overlay.on("click", ".cfm-rename-detect-item", function () {
          overlay.find("#cfm-qr-rename-text").val($(this).data("value"));
        });
        overlay.find("#cfm-qr-rename-text").focus();

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
            const action = overlay.find("#cfm-qr-rename-action").val();
            if (action === "individual") {
              const renameMap = {};
              overlay.find(".cfm-rename-individual-row").each(function () {
                const oldName = $(this)
                  .find(".cfm-rename-new-input")
                  .data("old-name");
                const newName = $(this)
                  .find(".cfm-rename-new-input")
                  .val()
                  .trim();
                if (newName) renameMap[oldName] = newName;
              });
              overlay.remove();
              resolve({ mode: "individual", renameMap });
            } else {
              const text = overlay.find("#cfm-qr-rename-text").val().trim();
              overlay.remove();
              resolve({ mode: "batch", action, text });
            }
          });
          overlay.find("#cfm-qr-rename-text").on("keydown", (e) => {
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
    }



  function syncLiveQuickReplyRename(api, QRS, set, oldName, newName, setData) {
      const syncSetObject = (target) => {
        if (!target || typeof target !== "object") return;
        if (target.name === oldName) target.name = newName;
        if (setData && Array.isArray(setData.qrList)) target.qrList = setData.qrList;
        if (setData && "disableSend" in setData) target.disableSend = !!setData.disableSend;
        if (setData && "placeBeforeInput" in setData) target.placeBeforeInput = !!setData.placeBeforeInput;
        if (setData && "injectInput" in setData) target.injectInput = !!setData.injectInput;
      };

      syncSetObject(set);

      if (QRS && Array.isArray(QRS.list)) {
        const idx = QRS.list.findIndex((s) => s?.name === oldName || s === set);
        if (idx !== -1) syncSetObject(QRS.list[idx]);
      }

      const syncSetList = (list) => {
        if (!Array.isArray(list)) return;
        for (let i = 0; i < list.length; i++) {
          const entry = list[i];
          if (entry === oldName) {
            list[i] = newName;
            continue;
          }
          if (entry?.name === oldName) entry.name = newName;
          if (entry?.set?.name === oldName) entry.set.name = newName;
        }
      };

      syncSetList(api?.settings?.config?.setList);
      syncSetList(api?.settings?.chatConfig?.setList);
    }


  async function executeQrRename(names) {
      const result = await showQrRenamePopup(names);
      if (!result) return;

      const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
      const QRS = typeof globalThis !== "undefined" && globalThis.QuickReplySet;

      if (result.mode === "single") {
        const oldName = names[0];
        const newName = result.newName;
        if (!newName) {
          cfmToastr.warning("请输入新名称");
          return;
        }
        if (newName === oldName) {
          cfmToastr.info("名称未变更");
          return;
        }
        try {
          // 获取 QR Set 对象
          let set = null;
          if (api && api.getSetByName) {
            set = api.getSetByName(oldName);
          }
          if (!set && QRS && QRS.list) {
            set = QRS.list.find((s) => s.name === oldName);
          }
          if (!set) throw new Error("未找到快速回复集");

          // 获取 JSON 数据
          const setData = set.toJSON
            ? set.toJSON()
            : { name: oldName, qrList: set.qrList || [] };

          // 用新名字保存
          setData.name = newName;
          const saveResp = await fetch("/api/quick-replies/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(setData),
          });
          if (!saveResp.ok) throw new Error("保存新名称失败");

          // 删除旧的
          await fetch("/api/quick-replies/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: oldName }),
          });

          // 更新当前前端内存中的快速回复集名称，避免必须刷新酒馆后才看到新名称
          syncLiveQuickReplyRename(api, QRS, set, oldName, newName, setData);

          // 更新插件设置（分组、备注、收藏等）
          updateSettingsAfterRename("quickreply", oldName, newName);

          // 更新全局/聊天 QR 引用
          await updateQrGlobalChatRefs(oldName, newName);

          cfmToastr.success(`已将「${oldName}」重命名为「${newName}」`);
        } catch (e) {
          console.error("[CFM] 快速回复集重命名失败", e);
          cfmToastr.error(`重命名失败: ${e.message}`);
          return;
        }
      } else if (result.mode === "batch") {
        const { action, text } = result;
        if (!text) {
          cfmToastr.warning("请输入内容");
          return;
        }
        let success = 0;
        let skipped = 0;
        let failed = 0;

        const batchProgress = showBatchProgressOverlay(
          "正在批量重命名快速回复集",
          names.length,
        );
        let processed = 0;

        for (const oldName of names) {
          let newName;
          if (action === "add-prefix") {
            newName = text + oldName;
          } else if (action === "add-suffix") {
            newName = oldName + text;
          } else if (action === "del-prefix") {
            if (!oldName.startsWith(text)) {
              skipped++;
              processed++;
              batchProgress.update(processed);
              continue;
            }
            newName = oldName.substring(text.length);
          } else if (action === "del-suffix") {
            if (!oldName.endsWith(text)) {
              skipped++;
              processed++;
              batchProgress.update(processed);
              continue;
            }
            newName = oldName.substring(0, oldName.length - text.length);
          }
          if (!newName || newName === oldName) {
            skipped++;
            processed++;
            batchProgress.update(processed);
            continue;
          }
          try {
            let set = null;
            if (api && api.getSetByName) {
              set = api.getSetByName(oldName);
            }
            if (!set && QRS && QRS.list) {
              set = QRS.list.find((s) => s.name === oldName);
            }
            if (!set) {
              failed++;
              processed++;
              batchProgress.update(processed);
              continue;
            }
            const setData = set.toJSON
              ? set.toJSON()
              : { name: oldName, qrList: set.qrList || [] };
            setData.name = newName;
            const saveResp = await fetch("/api/quick-replies/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(setData),
            });
            if (!saveResp.ok) {
              failed++;
              processed++;
              batchProgress.update(processed);
              continue;
            }
            await fetch("/api/quick-replies/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: oldName }),
            });
            syncLiveQuickReplyRename(api, QRS, set, oldName, newName, setData);
            updateSettingsAfterRename("quickreply", oldName, newName);
            await updateQrGlobalChatRefs(oldName, newName);
            success++;
          } catch (e) {
            console.warn(`[CFM] 重命名快速回复集 ${oldName} 失败`, e);
            failed++;
          }
          processed++;
          batchProgress.update(processed);
        }
        let msg = `已重命名 ${success} 个快速回复集`;
        if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
        if (failed > 0) msg += `，${failed} 个失败`;
        batchProgress.done(msg);
        if (success > 0) cfmToastr.success(msg);
        else cfmToastr.warning(msg);
      } else if (result.mode === "individual") {
        const { renameMap } = result;
        const entries = Object.entries(renameMap);
        if (entries.length === 0) {
          cfmToastr.info("所有名称均留空，未执行任何重命名");
          renderQRView();
          return;
        }
        let success = 0,
          skipped = 0,
          failed = 0;
        const batchProgress = showBatchProgressOverlay(
          "正在逐个重命名快速回复集",
          entries.length,
        );
        let processed = 0;
        for (const [oldName, newName] of entries) {
          if (newName === oldName) {
            skipped++;
            processed++;
            batchProgress.update(processed);
            continue;
          }
          try {
            let set = null;
            if (api && api.getSetByName) set = api.getSetByName(oldName);
            if (!set && QRS && QRS.list)
              set = QRS.list.find((s) => s.name === oldName);
            if (!set) {
              failed++;
              processed++;
              batchProgress.update(processed);
              continue;
            }
            const setData = set.toJSON
              ? set.toJSON()
              : { name: oldName, qrList: set.qrList || [] };
            setData.name = newName;
            const saveResp = await fetch("/api/quick-replies/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(setData),
            });
            if (!saveResp.ok) {
              failed++;
              processed++;
              batchProgress.update(processed);
              continue;
            }
            await fetch("/api/quick-replies/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: oldName }),
            });
            syncLiveQuickReplyRename(api, QRS, set, oldName, newName, setData);
            updateSettingsAfterRename("quickreply", oldName, newName);
            await updateQrGlobalChatRefs(oldName, newName);
            success++;
          } catch (e) {
            console.warn(`[CFM] 重命名快速回复集 ${oldName} 失败`, e);
            failed++;
          }
          processed++;
          batchProgress.update(processed);
        }
        let msg = `已重命名 ${success} 个快速回复集`;
        const totalSkipped = names.length - entries.length + skipped;
        if (totalSkipped > 0) msg += `，${totalSkipped} 个未修改（留空或跳过）`;
        if (failed > 0) msg += `，${failed} 个失败`;
        batchProgress.done(msg);
        if (success > 0) cfmToastr.success(msg);
        else cfmToastr.info(msg);
      }

      renderQRView();
    }



  async function updateQrGlobalChatRefs(oldName, newName) {
      try {
        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        if (!api) return;
        // 更新全局 QR 集引用
        if (api.listGlobalSets) {
          const globalSets = api.listGlobalSets();
          if (globalSets && globalSets.includes(oldName)) {
            if (api.removeGlobalSet) await api.removeGlobalSet(oldName);
            if (api.addGlobalSet) await api.addGlobalSet(newName);
          }
        }
        // 更新聊天 QR 集引用
        if (api.listChatSets) {
          const chatSets = api.listChatSets();
          if (chatSets && chatSets.includes(oldName)) {
            if (api.removeChatSet) await api.removeChatSet(oldName);
            if (api.addChatSet) await api.addChatSet(newName);
          }
        }
      } catch (e) {
        console.warn("[CFM] 更新全局/聊天QR引用失败", e);
      }
    }



  return {
    enterQrRenameMode,
    exitQrRenameMode,
    toggleQrRenameItem,
    prependQrRenameToolbar,
    showQrRenamePopup,
    executeQrRename,
    updateQrGlobalChatRefs,
  };
}
