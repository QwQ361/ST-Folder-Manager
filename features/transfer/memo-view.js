// 缝合备忘录视图层：渲染缝合备忘录弹窗（收藏区/临时区）、头部红点角标、
// 单组互通、以及"全部缝合"两阶段流程（阶段一逐组规划 → 阶段二一次性执行）。
// 数据层在 memo.js，互通执行在 entries.js。
// 依赖注入：$、escapeHtml、cfmToastr、memoApi、entriesApi（executeEntryTransfer、
// openEntryTransferTargetDialog、openEntryTransferInsertDialog、transferToPreset、
// transferToWorldInfo）、renderHeaderMemoBadge、revealEntryTransferTargetResource。

export function createEntryTransferMemoViewApiCore(deps) {
  const { $, escapeHtml, cfmToastr, memoApi, entriesApi } = deps;

  // ==================== 头部红点角标 ====================

  function renderHeaderMemoBadge() {
    const badge = $("#cfm-btn-entry-memo .cfm-entry-memo-badge");
    if (!badge.length) return;
    const count = memoApi.getPendingTransferMemoCount();
    if (count > 0) {
      badge.text(count > 99 ? "99+" : String(count)).show();
    } else {
      badge.hide();
    }
  }

  // ==================== 备忘录弹窗 ====================

  function showEntryTransferMemoPopup() {
    const groups = memoApi.getEntryTransferMemoGroupsSnapshot();
    const overlay = $(
      '<div class="cfm-edit-popup-overlay cfm-entry-memo-overlay"></div>',
    );
    const dialog = $(
      `<div class="cfm-edit-popup cfm-entry-memo-dialog">
        <div class="cfm-edit-popup-header">
          <span><i class="fa-solid fa-clipboard-list"></i> 缝合备忘录</span>
        </div>
        <div class="cfm-entry-memo-tabs">
          <button type="button" class="cfm-entry-memo-tab cfm-entry-memo-tab-fav" data-tab="fav">
            <i class="fa-solid fa-bookmark"></i> 收藏区
          </button>
          <button type="button" class="cfm-entry-memo-tab cfm-entry-memo-tab-pending" data-tab="pending">
            <i class="fa-solid fa-box-archive"></i> 临时区
            <span class="cfm-entry-memo-tab-count"></span>
          </button>
          <button type="button" class="cfm-entry-memo-tab cfm-entry-memo-tab-quickupdate" data-tab="quickupdate">
            <i class="fa-solid fa-bolt"></i> 快速更新
          </button>
        </div>
        <div class="cfm-entry-memo-body">
          <div class="cfm-entry-memo-list cfm-entry-memo-list-fav"></div>
          <div class="cfm-entry-memo-list cfm-entry-memo-list-pending"></div>
          <div class="cfm-entry-memo-quickupdate-panel"></div>
        </div>
        <div class="cfm-edit-popup-footer">
          <button class="menu_button cfm-entry-memo-close"><i class="fa-solid fa-xmark"></i> 关闭</button>
        </div>
      </div>`,
    );

    let activeTab = "pending";
    let renderInFlight = false;
    let quickUpdateAnalysis = null;

    function getGroupsForTab(tab) {
      return groups.filter((g) => (tab === "fav" ? g.favorite : !g.favorite));
    }

    function switchTab(tab) {
      activeTab = tab;
      dialog
        .find(".cfm-entry-memo-tab")
        .removeClass("cfm-entry-memo-tab-active");
      dialog
        .find(`.cfm-entry-memo-tab[data-tab="${tab}"]`)
        .addClass("cfm-entry-memo-tab-active");
      dialog.find(".cfm-entry-memo-list").hide();
      dialog.find(".cfm-entry-memo-quickupdate-panel").hide();
      if (tab === "quickupdate") {
        dialog.find(".cfm-entry-memo-quickupdate-panel").show();
        renderQuickUpdatePanel();
      } else {
        dialog.find(`.cfm-entry-memo-list-${tab}`).show();
      }
    }

    function formatTime(ts) {
      if (!ts) return "";
      const d = new Date(ts);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // 异步检测收藏组快照与源条目是否一致；不一致时高亮"更新"按钮（呼吸式闪烁）
    function checkMemoGroupFreshness(group, card) {
      const updateBtn = card.find(".cfm-entry-memo-card-update");
      if (!updateBtn.length) return;
      const isAttached = () =>
        updateBtn[0] && document.contains(updateBtn[0]);
      entriesApi
        .getEntryTransferMemoGroupFreshEntries(group)
        .then((result) => {
          // 卡片可能已被重新渲染，若按钮已不在文档中则忽略
          if (!isAttached()) return;
          if (result?.changed) {
            updateBtn.show().addClass("cfm-entry-memo-card-update-dirty");
          } else {
            updateBtn.hide().removeClass("cfm-entry-memo-card-update-dirty");
          }
        })
        .catch(() => {
          // 检测失败（源不可用等）静默处理，不显示更新按钮
          if (isAttached()) {
            updateBtn.hide().removeClass("cfm-entry-memo-card-update-dirty");
          }
        });
    }

    // 点击"更新"：从源重新收集条目并写入收藏组快照
    async function updateMemoGroupFromSource(group, card) {
      const updateBtn = card.find(".cfm-entry-memo-card-update");
      const oldText = updateBtn.html();
      updateBtn
        .prop("disabled", true)
        .html('<i class="fa-solid fa-spinner fa-spin"></i><span>更新中</span>');
      try {
        const result = await entriesApi.updateEntryTransferMemoGroupFromSource(
          group.id,
        );
        if (result?.updated) {
          cfmToastr.success(`已更新 ${result.changedCount} 条条目快照`);
          rerender();
          return;
        }
        if (result?.error) {
          cfmToastr.error(result.error);
          updateBtn.prop("disabled", false).html(oldText);
          return;
        }
        cfmToastr.info("条目已是最新，无需更新");
        updateBtn.prop("disabled", false).html(oldText);
      } catch (err) {
        cfmToastr.error("更新快照失败：" + String(err?.message || err));
        updateBtn.prop("disabled", false).html(oldText);
      }
    }

    function renderGroupCard(group) {
      const count = Array.isArray(group.entries) ? group.entries.length : 0;
      const sourceTypeLabel =
        group.sourceType === "worldinfo" ? "世界书" : "预设";
      const noteHtml = group.note
        ? `<div class="cfm-entry-memo-card-note"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(group.note)}</div>`
        : "";
      const isFav = !!group.favorite;
      const actionHtml = isFav
        ? `
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-transfer" title="互通（缝合）该组">
              <i class="fa-solid fa-right-left"></i><span>互通</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-update" title="检测到原条目有变化，点击更新快照" style="display:none;">
              <i class="fa-solid fa-rotate"></i><span>更新</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-fav" title="在临时区创建副本（收藏组保留）">
              <i class="fa-solid fa-box-archive"></i><span>转到临时</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-note-btn" title="编辑备注">
              <i class="fa-solid fa-pen"></i><span>备注</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-unfav" title="取消收藏（从收藏区移除该组）">
              <i class="fa-solid fa-bookmark-slash"></i><span>取消收藏</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-delete" title="删除该组">
              <i class="fa-solid fa-trash"></i><span>删除</span>
            </button>`
        : `
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-transfer" title="互通（缝合）该组">
              <i class="fa-solid fa-right-left"></i><span>互通</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-fav" title="在收藏区创建副本（临时组保留）">
              <i class="fa-solid fa-bookmark"></i><span>收藏</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-note-btn" title="编辑备注">
              <i class="fa-solid fa-pen"></i><span>备注</span>
            </button>
            <button type="button" class="cfm-entry-memo-card-btn cfm-entry-memo-card-delete" title="删除该组">
              <i class="fa-solid fa-trash"></i><span>删除</span>
            </button>`;

      const card = $(`
        <div class="cfm-entry-memo-card" data-id="${escapeHtml(group.id)}">
          <div class="cfm-entry-memo-card-main">
            <span class="cfm-entry-memo-card-summary">${escapeHtml(group.summary)}</span>
            <span class="cfm-entry-memo-card-badge">${count} 条</span>
          </div>
          <div class="cfm-entry-memo-card-sub">
            <span>来自${sourceTypeLabel}</span>
            <span class="cfm-entry-memo-card-time">${formatTime(group.createdAt)}</span>
          </div>
          ${noteHtml}
          <div class="cfm-entry-memo-card-actions">${actionHtml}</div>
        </div>
      `);

      // 互通（单组缝合）
      card.find(".cfm-entry-memo-card-transfer").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        transferSingleGroup(group);
      });

      // 收藏区：更新快照（点击后从源重新收集条目）
      card.find(".cfm-entry-memo-card-update").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateMemoGroupFromSource(group, card);
      });

      // 收藏区：异步检测原条目是否变化，变化则高亮"更新"按钮（呼吸式闪烁）
      if (
        isFav &&
        typeof entriesApi?.getEntryTransferMemoGroupFreshEntries === "function"
      ) {
        checkMemoGroupFreshness(group, card);
      }

      // 收藏区：转到临时（复制副本到临时区，收藏组保留）
      // 临时区：收藏（复制副本到收藏区，临时组保留）
      card.find(".cfm-entry-memo-card-fav").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFav) {
          const newId = memoApi.copyEntryTransferMemoGroupToPending(group.id);
          if (newId) {
            cfmToastr.success("已在临时区创建副本");
            rerender();
          }
        } else {
          const newId = memoApi.copyEntryTransferMemoGroupToFavorite(group.id);
          if (newId) {
            cfmToastr.success("已在收藏区创建副本（永久保留）");
            rerender();
          }
        }
      });

      // 收藏区：取消收藏（从收藏区移除该组）
      card.find(".cfm-entry-memo-card-unfav").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (
          !window.confirm(
            `确定取消收藏该分组？\n${group.summary}\n（收藏区将移除该组，若临时区有副本则保留）`,
          )
        ) {
          return;
        }
        memoApi.deleteEntryTransferMemoGroup(group.id);
        cfmToastr.success("已取消收藏");
        rerender();
      });

      // 备注
      card.find(".cfm-entry-memo-card-note-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        editGroupNote(group);
      });

      // 删除
      card.find(".cfm-entry-memo-card-delete").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`确定删除该缝合备忘录分组？\n${group.summary}`)) {
          return;
        }
        memoApi.deleteEntryTransferMemoGroup(group.id);
        cfmToastr.success("已删除");
        rerender();
      });

      return card;
    }

    function rerender() {
      if (renderInFlight) return;
      renderInFlight = true;
      setTimeout(() => {
        renderInFlight = false;
        refreshList();
      }, 0);
    }

    function refreshList() {
      const favList = dialog.find(".cfm-entry-memo-list-fav");
      const pendingList = dialog.find(".cfm-entry-memo-list-pending");

      // 重新读取最新数据
      const latest = memoApi.getEntryTransferMemoGroupsSnapshot();
      groups.length = 0;
      groups.push(...latest);

      const favGroups = getGroupsForTab("fav");
      const pendingGroups = getGroupsForTab("pending");

      favList.empty();
      pendingList.empty();

      if (favGroups.length === 0) {
        favList.html(
          '<div class="cfm-entry-memo-empty">暂无收藏的缝合分组</div>',
        );
      } else {
        for (const g of favGroups) favList.append(renderGroupCard(g));
      }

      if (pendingGroups.length === 0) {
        pendingList.html(
          '<div class="cfm-entry-memo-empty">临时区暂无缝合分组</div>',
        );
      } else {
        const batchBar = $(`
          <div class="cfm-entry-memo-batch-bar">
            <button type="button" class="menu_button cfm-entry-memo-batch-all">
              <i class="fa-solid fa-layer-group"></i> 全部缝合（${pendingGroups.length} 组）
            </button>
          </div>
        `);
        batchBar.find(".cfm-entry-memo-batch-all").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          runBatchTransfer(pendingGroups.map((g) => g.id));
        });
        pendingList.append(batchBar);
        for (const g of pendingGroups) pendingList.append(renderGroupCard(g));
      }

      const pendingCount = pendingGroups.length;
      const tabCount = dialog.find(".cfm-entry-memo-tab-count");
      tabCount.text(pendingCount > 0 ? String(pendingCount) : "");

      if (activeTab === "quickupdate") renderQuickUpdatePanel();
      switchTab(activeTab);
      renderHeaderMemoBadge();
    }

    // ==================== 快速更新标签页 ====================

    // 渲染快速更新面板：选择旧/新预设 → 点击"对比并预览" → 展示待缝合条目块 → 确认执行
    function renderQuickUpdatePanel() {
      const panel = dialog.find(".cfm-entry-memo-quickupdate-panel");
      if (!panel.length) return;
      const presets = entriesApi.getPresetQuickUpdateOptions();

      panel.html(`
        <div class="cfm-entry-memo-quickup-wrap">
          <div class="cfm-entry-memo-quickup-desc">
            <i class="fa-solid fa-bolt"></i>
            快速更新：选择<b>旧预设</b>（已缝合多条目的）与<b>新预设</b>（作者更新版），
            插件会对比找出旧预设中<b>新预设没有的条目</b>（即你缝合的条目），
            按旧预设顺序在新预设对应位置补齐。
          </div>
          <div class="cfm-entry-memo-quickup-pickers">
            <label class="cfm-entry-memo-quickup-picker">
              <span class="cfm-entry-memo-quickup-picker-label">旧预设（已缝合）</span>
              <select class="cfm-entry-memo-quickup-old"></select>
            </label>
            <label class="cfm-entry-memo-quickup-picker">
              <span class="cfm-entry-memo-quickup-picker-label">新预设（作者更新）</span>
              <select class="cfm-entry-memo-quickup-new"></select>
            </label>
            <button type="button" class="menu_button cfm-entry-memo-quickup-analyze">
              <i class="fa-solid fa-magnifying-glass"></i> 对比并预览
            </button>
          </div>
          <div class="cfm-entry-memo-quickup-result"></div>
        </div>
      `);

      const oldSelect = panel.find(".cfm-entry-memo-quickup-old");
      const newSelect = panel.find(".cfm-entry-memo-quickup-new");
      const result = panel.find(".cfm-entry-memo-quickup-result");

      // 填充预设下拉框
      presets.forEach((name) => {
        oldSelect.append(
          `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`,
        );
        newSelect.append(
          `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`,
        );
      });
      if (presets.length < 2) {
        result.html(
          '<div class="cfm-entry-memo-quickup-empty">需要至少 2 个预设才能快速更新</div>',
        );
        return;
      }
      // 默认：新预设选第 2 个，旧预设选第 1 个
      if (presets.length >= 2) newSelect.val(presets[1]);
      oldSelect.val(presets[0]);

      // 若已有分析结果（弹窗未关）则保留
      if (quickUpdateAnalysis) {
        renderQuickUpdateResult(result);
      }

      panel
        .find(".cfm-entry-memo-quickup-analyze")
        .on("click touchend", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const oldName = String(oldSelect.val() || "").trim();
          const newName = String(newSelect.val() || "").trim();
          if (!oldName || !newName) {
            cfmToastr.warning("请选择旧预设与新预设");
            return;
          }
          if (oldName === newName) {
            cfmToastr.warning("旧预设与新预设不能相同");
            return;
          }
          const btn = panel.find(".cfm-entry-memo-quickup-analyze");
          const oldText = btn.html();
          btn
            .prop("disabled", true)
            .html('<i class="fa-solid fa-spinner fa-spin"></i> 对比中...');
          result.html(
            '<div class="cfm-entry-memo-quickup-loading"><i class="fa-solid fa-spinner fa-spin"></i> 正在对比新旧预设...</div>',
          );
          try {
            const analysis = await entriesApi.analyzePresetQuickUpdate(
              oldName,
              newName,
            );
            quickUpdateAnalysis = { ...analysis, oldName, newName };
            renderQuickUpdateResult(result);
          } catch (err) {
            console.error("[CFM] 快速更新对比失败", err);
            result.html(
              `<div class="cfm-entry-memo-quickup-empty">对比失败：${escapeHtml(String(err?.message || err))}</div>`,
            );
          } finally {
            btn.prop("disabled", false).html(oldText);
          }
        });
    }

    // 渲染对比结果（待缝合块列表 + 确认执行）
    function renderQuickUpdateResult(resultEl) {
      const analysis = quickUpdateAnalysis;
      if (!analysis) {
        resultEl.html("");
        return;
      }
      if (analysis.error) {
        resultEl.html(
          `<div class="cfm-entry-memo-quickup-empty">${escapeHtml(analysis.error)}</div>`,
        );
        return;
      }

      const blocks = Array.isArray(analysis.blocks) ? analysis.blocks : [];
      if (blocks.length === 0) {
        resultEl.html(`
          <div class="cfm-entry-memo-quickup-empty">
            未发现需要迁移的缝合条目（旧预设 ${analysis.oldTotal} 条，新预设 ${analysis.newTotal} 条，缝合条目 0 条）
          </div>
        `);
        return;
      }

      const totalStitched = blocks.reduce(
        (sum, b) => sum + (Array.isArray(b.entries) ? b.entries.length : 0),
        0,
      );

      const blockHtml = blocks
        .map((block, idx) => {
          const entries = Array.isArray(block.entries) ? block.entries : [];
          const names = entries.map((e) => escapeHtml(String(e?.name || "")));
          const anchorText = block.anchorName
            ? `插入到「<b>${escapeHtml(block.anchorName)}</b>」之后`
            : "插入到<b>开头</b>";
          return `
            <div class="cfm-entry-memo-quickup-block">
              <div class="cfm-entry-memo-quickup-block-head">
                <span class="cfm-entry-memo-quickup-block-idx">第 ${idx + 1} 块</span>
                <span class="cfm-entry-memo-quickup-block-anchor">${anchorText}</span>
                <span class="cfm-entry-memo-quickup-block-count">${entries.length} 条</span>
              </div>
              <div class="cfm-entry-memo-quickup-block-names">${names.join("、")}</div>
            </div>`;
        })
        .join("");

      resultEl.html(`
        <div class="cfm-entry-memo-quickup-summary">
          <span>旧预设 ${analysis.oldTotal} 条</span>
          <span>新预设 ${analysis.newTotal} 条</span>
          <span>识别到 <b>${totalStitched}</b> 条缝合条目</span>
          <span>共 <b>${blocks.length}</b> 个插入位置</span>
        </div>
        <div class="cfm-entry-memo-quickup-blocks">${blockHtml}</div>
        <div class="cfm-entry-memo-quickup-actions">
          <button type="button" class="menu_button cfm-entry-memo-quickup-execute">
            <i class="fa-solid fa-wand-magic-sparkles"></i> 执行快速更新（缝合 ${totalStitched} 条）
          </button>
        </div>
      `);

      resultEl
        .find(".cfm-entry-memo-quickup-execute")
        .on("click touchend", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (
            !window.confirm(
              `确定将 ${totalStitched} 条缝合条目快速更新到新预设「${analysis.newName}」？\n此操作会向新预设追加这些条目。`,
            )
          ) {
            return;
          }
          const btn = resultEl.find(".cfm-entry-memo-quickup-execute");
          const oldText = btn.html();
          btn
            .prop("disabled", true)
            .html('<i class="fa-solid fa-spinner fa-spin"></i> 更新中...');
          try {
            const result = await entriesApi.executePresetQuickUpdate(
              analysis.oldName,
              analysis.newName,
              blocks,
            );
            if (result?.error) {
              cfmToastr.error(result.error);
              btn.prop("disabled", false).html(oldText);
              return;
            }
            const doneCount = Array.isArray(result.blockResults)
              ? result.blockResults.filter((b) => b.status === "done").length
              : 0;
            if (result.insertedTotal > 0) {
              cfmToastr.success(
                `快速更新完成：成功 ${doneCount}/${result.totalBlocks} 块，共缝合 ${result.insertedTotal} 条`,
              );
            } else {
              cfmToastr.warning("快速更新完成，但没有条目被缝合（可能都跳过了）");
            }
            // 清空分析结果，提示用户可重新对比
            quickUpdateAnalysis = null;
            renderQuickUpdatePanel();
          } catch (err) {
            console.error("[CFM] 快速更新执行失败", err);
            cfmToastr.error(`快速更新失败：${String(err?.message || err)}`);
            btn.prop("disabled", false).html(oldText);
          }
        });
    }

    // ---- 备注编辑弹窗 ----
    function editGroupNote(group) {
      const noteOverlay = $(
        '<div class="cfm-edit-popup-overlay cfm-entry-memo-note-overlay"></div>',
      );
      const noteDialog = $(`
        <div class="cfm-edit-popup cfm-entry-memo-note-dialog" style="max-width:min(calc(100vw - 24px), 440px);">
          <div class="cfm-edit-popup-header">
            <span><i class="fa-solid fa-note-sticky"></i> 编辑备注</span>
          </div>
          <div class="cfm-entry-memo-note-body" style="padding:14px 18px 10px;">
            <div style="font-size:12px;opacity:0.86;margin-bottom:8px;">${escapeHtml(group.summary)}</div>
            <input type="text" class="cfm-edit-input cfm-entry-memo-note-input" value="${escapeHtml(group.note || "")}" placeholder="备注（可选，例如：缝合到主预设A）" />
          </div>
          <div class="cfm-edit-popup-footer">
            <button class="menu_button cfm-entry-memo-note-save"><i class="fa-solid fa-check"></i> 保存</button>
            <button class="menu_button cfm-entry-memo-note-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
          </div>
        </div>
      `);
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        noteOverlay.remove();
        noteDialog.remove();
      };
      noteDialog.find(".cfm-entry-memo-note-save").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const note = String(
          noteDialog.find(".cfm-entry-memo-note-input").val() || "",
        ).trim();
        memoApi.updateEntryTransferMemoGroup(group.id, { note });
        cfmToastr.success("备注已更新");
        settle();
        rerender();
      });
      noteDialog
        .find(".cfm-entry-memo-note-cancel")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle();
        });
      noteOverlay.on("click", (e) => {
        if ($(e.target).hasClass("cfm-entry-memo-note-overlay")) settle();
      });
      noteOverlay.append(noteDialog);
      const host = $("#cfm-popup");
      if (host.length) host.append(noteOverlay);
      else $("body").append(noteOverlay);
      setTimeout(
        () => noteDialog.find(".cfm-entry-memo-note-input").trigger("focus"),
        50,
      );
    }

    // ---- 单组互通 ----
    async function transferSingleGroup(group) {
      const target = await entriesApi.openEntryTransferTargetDialog(
        group.sourceType,
        group.sourceName,
        group.entries,
        {
          title: `条目互通 (${group.entries.length} 个条目)`,
          headerHint: `缝合备忘录：[${escapeHtml(group.summary)}]${group.note ? ` <span style="opacity:0.6;">· ${escapeHtml(group.note)}</span>` : ""}`,
        },
      );
      if (!target) return;

      const result = await entriesApi.executeEntryTransfer(
        group.sourceType,
        group.sourceName,
        group.entries,
        target.targetType,
        target.targetName,
      );
      if (!result) return;

      // 缝合成功：临时组移除、收藏组保留
      const removed = memoApi.removePendingTransferMemoGroups([group.id]);
      if (removed.length > 0) {
        cfmToastr.success("缝合完成，已从临时区移除");
      }
      renderHeaderMemoBadge();
      rerender();
    }

    // ==================== 全部缝合（两阶段） ====================

    async function runBatchTransfer(pendingGroupIds) {
      // 快照需要缝合的组（全部为临时组）
      const allGroups = memoApi.getEntryTransferMemoGroupsSnapshot();
      const toTransfer = allGroups.filter(
        (g) => pendingGroupIds.includes(g.id) && !g.favorite,
      );
      if (toTransfer.length === 0) {
        cfmToastr.info("没有可缝合的临时组");
        return;
      }

      // ── 阶段一：逐组规划 ──
      const plans = []; // { group, targetType, targetName, insertIndex }
      let lastCancelled = false;

      for (let i = 0; i < toTransfer.length; i++) {
        const group = toTransfer[i];
        const isLast = i === toTransfer.length - 1;
        const hint = buildBatchHint(group, i, toTransfer.length);

        const target = await entriesApi.openEntryTransferTargetDialog(
          group.sourceType,
          group.sourceName,
          group.entries,
          {
            title: `条目互通 (${group.entries.length} 个条目)`,
            headerHint: hint,
          },
        );
        if (!target) {
          // 非最后一组取消：跳过继续
          if (!isLast) {
            cfmToastr.info(`已跳过「${group.summary}」，继续下一组`);
            continue;
          }
          // 最后一组取消：弹选择弹窗
          const choice = await askBatchCancelChoice(
            group,
            toTransfer.length - 1,
          );
          if (choice === "all") {
            lastCancelled = true;
            break; // 终止全部缝合
          }
          // choice === "last"：跳过最后一组，进入阶段二
          cfmToastr.info(
            `已跳过最后一组「${group.summary}」，开始缝合已规划组`,
          );
          continue;
        }

        // 选择插入位置
        const existingItems = await entriesApi.getEntryTransferInsertItems(
          target.targetType,
          target.targetName,
        );
        const insertResult = await entriesApi.openEntryTransferInsertDialog({
          sourceEntries: group.entries,
          targetType: target.targetType,
          targetName: target.targetName,
          existingItems,
          batchMode: true,
          isLast,
          headerHint: hint,
        });

        if (!insertResult || insertResult.action === "cancel") {
          if (!isLast) {
            cfmToastr.info(`已跳过「${group.summary}」，继续下一组`);
            continue;
          }
          const choice = await askBatchCancelChoice(
            group,
            toTransfer.length - 1,
          );
          if (choice === "all") {
            lastCancelled = true;
            break;
          }
          cfmToastr.info(
            `已跳过最后一组「${group.summary}」，开始缝合已规划组`,
          );
          continue;
        }

        plans.push({
          group,
          targetType: target.targetType,
          targetName: target.targetName,
          insertIndex: insertResult.targetIndex,
          append: insertResult.action === "append",
        });
      }

      if (lastCancelled) {
        cfmToastr.info("已全部取消，未缝合任何分组");
        return;
      }

      if (plans.length === 0) {
        cfmToastr.info("没有已规划的分组，未执行缝合");
        return;
      }

      // ── 阶段二：一次性逐组执行（同目标多组索引偏移补偿） ──
      await executeBatchPlans(plans);
    }

    function buildBatchHint(group, index, total) {
      const notePart = group.note
        ? ` <span style="opacity:0.6;">· ${escapeHtml(group.note)}</span>`
        : "";
      return `正在缝合 ${index + 1}/${total}：<strong>[${escapeHtml(group.summary)}]</strong>${notePart}`;
    }

    /**
     * 末组取消选择弹窗：全部取消 / 仅不缝合最后一组
     * @returns {Promise<"all"|"last"|null>} "all"=全部取消；"last"=仅不缝合最后一组；null=关闭弹窗回到当前组
     */
    function askBatchCancelChoice(group, lastIndex) {
      return new Promise((resolve) => {
        const overlay = $(
          '<div class="cfm-edit-popup-overlay cfm-entry-memo-cancel-overlay"></div>',
        );
        const dialog = $(
          `<div class="cfm-edit-popup cfm-entry-memo-cancel-dialog" style="max-width:min(calc(100vw - 24px), 460px);">
            <div class="cfm-edit-popup-header">
              <span><i class="fa-solid fa-question-circle"></i> 已到最后一组</span>
            </div>
            <div class="cfm-entry-memo-cancel-body" style="display:flex;flex-direction:column;gap:10px;padding:14px 18px 10px;">
              <div style="font-size:13px;line-height:1.6;opacity:0.92;">
                当前是最后一组「<strong>${escapeHtml(group.summary)}</strong>」。取消后将按你的选择处理：
              </div>
              <div style="font-size:12px;line-height:1.6;opacity:0.78;">
                · <strong>全部取消</strong>：终止全部缝合，前面已规划的分组也不会缝合。<br>
                · <strong>仅不缝合最后一组</strong>：跳过该组，立即缝合前面已规划的分组。
              </div>
            </div>
            <div class="cfm-edit-popup-footer">
              <button class="menu_button cfm-entry-memo-cancel-all"><i class="fa-solid fa-ban"></i> 全部取消</button>
              <button class="menu_button cfm-entry-memo-cancel-last"><i class="fa-solid fa-forward"></i> 仅不缝合最后一组</button>
            </div>
          </div>`,
        );
        let settled = false;
        const settle = (result) => {
          if (settled) return;
          settled = true;
          overlay.remove();
          dialog.remove();
          resolve(result);
        };
        dialog.find(".cfm-entry-memo-cancel-all").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle("all");
        });
        dialog.find(".cfm-entry-memo-cancel-last").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          settle("last");
        });
        overlay.on("click", (e) => {
          if ($(e.target).hasClass("cfm-entry-memo-cancel-overlay")) {
            settle(null); // 关闭弹窗 → 回到当前组，可继续选择
          }
        });
        overlay.append(dialog);
        const host = $("#cfm-popup");
        if (host.length) host.append(overlay);
        else $("body").append(overlay);
      });
    }

    /**
     * 阶段二：按规划一次性逐组执行缝合。
     * 同目标多组时做索引偏移补偿：规划索引基于缝合前数组，
     * 每组缝合前重新读取目标当前条目，若此前已缝合过同目标，则插入位置加上已插入数量。
     */
    async function executeBatchPlans(plans) {
      const total = plans.length;
      let successCount = 0;
      let insertedTotal = 0;

      // 记录每个目标已缝合的次数，用于索引偏移补偿
      const targetInsertedCount = {};

      for (let i = 0; i < total; i++) {
        const plan = plans[i];
        const { group, targetType, targetName, insertIndex, append } = plan;

        // 每组缝合前重新读取目标当前条目数，得到最新基线
        let currentItems = [];
        try {
          currentItems = await entriesApi.getEntryTransferInsertItems(
            targetType,
            targetName,
          );
        } catch (err) {
          console.error("[CFM] 全部缝合-读取目标条目失败", err);
          cfmToastr.error(
            `「${group.summary}」读取目标失败：${err?.message || "未知错误"}`,
          );
          continue;
        }

        const key = `${targetType}::${targetName}`;
        const alreadyInserted = targetInsertedCount[key] || 0;
        targetInsertedCount[key] = alreadyInserted + 1;

        // 计算实际插入位置（仅数字位置需补偿，append 不受影响）
        let finalIndex;
        if (append) {
          finalIndex = currentItems.length;
        } else {
          const normalized = Number.isInteger(insertIndex)
            ? insertIndex
            : currentItems.length;
          finalIndex = normalized + alreadyInserted;
          // 不超过当前目标条目总数（含此前已插入）
          const maxIndex = currentItems.length + alreadyInserted;
          if (finalIndex > maxIndex) finalIndex = maxIndex;
        }

        let transferResult = null;
        try {
          if (targetType === "preset") {
            transferResult = await entriesApi.transferToPreset(
              group.sourceType,
              group.entries,
              targetName,
              finalIndex,
            );
          } else if (targetType === "worldinfo") {
            transferResult = await entriesApi.transferToWorldInfo(
              group.sourceType,
              group.entries,
              targetName,
              finalIndex,
            );
          }
        } catch (err) {
          console.error("[CFM] 全部缝合-执行失败", err);
          cfmToastr.error(
            `「${group.summary}」缝合失败：${err?.message || "未知错误"}`,
          );
          continue;
        }

        if (!transferResult) continue;

        successCount++;
        insertedTotal += Number(transferResult.insertedCount || 0);

        // 缝合成功：临时组移除、收藏组保留
        memoApi.removePendingTransferMemoGroups([group.id]);
      }

      renderHeaderMemoBadge();
      rerender();

      if (successCount > 0) {
        cfmToastr.success(
          `全部缝合完成：成功 ${successCount}/${total} 组，共缝合 ${insertedTotal} 个条目`,
        );
      } else {
        cfmToastr.error("全部缝合失败：没有任何分组缝合成功");
      }
    }

    // ---- 弹窗初始化与事件 ----
    dialog.find(".cfm-entry-memo-tab").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tab = $(e.currentTarget).attr("data-tab");
      if (tab) switchTab(tab);
    });
    dialog.find(".cfm-entry-memo-close").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      renderHeaderMemoBadge();
    });
    overlay.on("click", (e) => {
      if ($(e.target).hasClass("cfm-entry-memo-overlay")) {
        overlay.remove();
        renderHeaderMemoBadge();
      }
    });

    overlay.append(dialog);
    const host = $("#cfm-popup");
    if (host.length) host.append(overlay);
    else $("body").append(overlay);

    refreshList();
  }

  return {
    renderHeaderMemoBadge,
    showEntryTransferMemoPopup,
  };
}
