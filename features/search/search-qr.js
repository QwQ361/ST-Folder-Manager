// 搜索执行层 - 快速回复搜索
// 原 index.js executeQrSearch 迁移。通过 deps 注入闭包依赖与状态访问器。

export function createQrSearchCore(deps) {
  const {
    $,
    applyQrMultiActivation,
    bindTouchSafeTap,
    countResItemsRecursive,
    escapeHtml,
    getActiveQrSets,
    getQrSetItems,
    getQrSetNames,
    getResFolderDisplayName,
    getResFolderIds,
    getResFolderPath,
    getResourceGroups,
    getVisibleResourceIds,
    isResFavorite,
    openQrItemEditor,
    renderQRView,
    selectAllVisible,
    syncQrPresetTrackingForManualToggle,
    toggleMultiSelectItem,
    toggleQrSetActivation,
    toggleResFavorite,
    state,
  } = deps;

  function executeQrSearch() {
    const q = $("#cfm-qr-global-search").val().toLowerCase().trim();
    const scope = $("#cfm-qr-search-scope").val();
    const searchType = $("#cfm-qr-search-type").val();
    const rightList = $("#cfm-qr-right-list");
    const pathEl = $("#cfm-qr-rh-path");
    const countEl = $("#cfm-qr-rh-count");
    if (!q) {
      renderQRView();
      return;
    }
    rightList.empty();
    const names = getQrSetNames();
    const groups = getResourceGroups("quickreply");
    const tree = getResFolderTree("quickreply");

    if (searchType === "folder") {
      // 搜索文件夹
      const allFolderIds = getResFolderIds("quickreply");
      const matched = allFolderIds.filter((fid) => {
        const dn = getResFolderDisplayName("quickreply", fid).toLowerCase();
        return dn.includes(q);
      });
      pathEl.text(`搜索文件夹: "${q}"`);
      countEl.text(`${matched.length} 个结果`);
      if (matched.length === 0) {
        rightList.html('<div class="cfm-right-empty">没有匹配的文件夹</div>');
        return;
      }
      for (const fid of matched) {
        const row = $(`
          <div class="cfm-row cfm-row-folder cfm-search-result" data-folder-id="${escapeHtml(fid)}">
            <div class="cfm-row-icon"><i class="fa-solid fa-folder"></i></div>
            <div class="cfm-row-name">${escapeHtml(getResFolderDisplayName("quickreply", fid))}</div>
            <div class="cfm-row-meta">${countResItemsRecursive("quickreply", fid)} 个快速回复集</div>
          </div>
        `);
        row.on("click", () => {
          const fname = fid;
          const path = getResFolderPath("quickreply", fname);
          const qrExpandedNodes = state.getQrExpandedNodes();
          for (let i = 0; i < path.length - 1; i++)
            qrExpandedNodes.add(path[i]);
          state.setSelectedQrFolder(fname);
          $("#cfm-qr-global-search").val("");
          renderQRView();
        });
        rightList.append(row);
      }
      return;
    }

    // 搜索快速回复集
    let searchPool = names;
    const selectedQrFolder = state.getSelectedQrFolder();
    if (
      scope === "current" &&
      selectedQrFolder &&
      selectedQrFolder !== "__favorites__" &&
      selectedQrFolder !== "__ungrouped__"
    ) {
      searchPool = names.filter((n) => groups[n] === selectedQrFolder);
    }
    const matched = searchPool.filter((n) => n.toLowerCase().includes(q));
    pathEl.text(`搜索: "${q}"`);
    countEl.text(`${matched.length} 个结果`);
    if (matched.length === 0) {
      rightList.html('<div class="cfm-right-empty">没有匹配的快速回复集</div>');
      return;
    }
    const qrActiveSet = getActiveQrSets();
    const cfmMultiSelectMode = state.getCfmMultiSelectMode();
    const cfmMultiSelected = state.getCfmMultiSelected();
    const cfmMultiSelectRangeMode = state.getCfmMultiSelectRangeMode();
    const qrItemExpandedSets = state.getQrItemExpandedSets();
    for (const n of matched) {
      const fav = isResFavorite("quickreply", n);
      const qrIsActive = qrActiveSet.has(n);
      const isMSel = cfmMultiSelectMode && cfmMultiSelected.has(n);
      const msCheckHtml = cfmMultiSelectMode
        ? `<div class="cfm-multisel-checkbox ${isMSel ? "cfm-multisel-checked" : ""}"><i class="fa-${isMSel ? "solid" : "regular"} fa-square${isMSel ? "-check" : ""}"></i></div>`
        : "";
      const toggleHtml = `<div class="cfm-wi-toggle ${qrIsActive ? "cfm-wi-toggle-on" : ""}" title="${qrIsActive ? "点击取消激活" : "点击激活"}" data-qr-name="${escapeHtml(n)}"><i class="fa-solid fa-toggle-${qrIsActive ? "on" : "off"}"></i></div>`;
      const isSetExpanded = qrItemExpandedSets.has(n);
      const expandArrowHtml = `<div class="cfm-qr-expand-arrow ${isSetExpanded ? "cfm-qr-arrow-expanded" : ""}" title="${isSetExpanded ? "收起快速回复" : "展开快速回复"}" data-qr-set="${escapeHtml(n)}"><i class="fa-solid fa-caret-right"></i></div>`;
      const grpLabel = groups[n]
        ? `<span class="cfm-theme-note">${escapeHtml(getResFolderDisplayName("quickreply", groups[n]))}</span>`
        : "";
      const row = $(`
        <div class="cfm-row cfm-row-char cfm-search-result ${isMSel ? "cfm-multisel-row-selected" : ""}" data-res-id="${escapeHtml(n)}">
          ${msCheckHtml}
          ${toggleHtml}
          <div class="cfm-row-icon"><i class="fa-solid fa-reply-all" style="font-size:20px;color:#89b4fa;"></i></div>
          <div class="cfm-row-name"><span class="cfm-char-name-inline cfm-qr-name-inline">${expandArrowHtml}<span class="cfm-qr-name-text">${escapeHtml(n)}</span></span>${grpLabel}</div>
          <div class="cfm-row-star ${fav ? "cfm-star-active" : ""}" title="${fav ? "取消收藏" : "添加收藏"}"><i class="fa-${fav ? "solid" : "regular"} fa-star"></i></div>
        </div>
      `);
      bindTouchSafeTap(row.find(".cfm-qr-expand-arrow"), () => {
        state.setCfmQrLastFocusedSetName(n);
        if (qrItemExpandedSets.has(n)) {
          qrItemExpandedSets.delete(n);
        } else {
          qrItemExpandedSets.add(n);
        }
        executeQrSearch();
      });
      row.find(".cfm-wi-toggle").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const newState = !qrActiveSet.has(n);
        toggleQrSetActivation(n, newState).then(() => {
          if (newState) qrActiveSet.add(n);
          else qrActiveSet.delete(n);
          syncQrPresetTrackingForManualToggle(n, newState);
          const el = $(this);
          el.toggleClass("cfm-wi-toggle-on", newState);
          el.find("i").attr(
            "class",
            `fa-solid fa-toggle-${newState ? "on" : "off"}`,
          );
          el.attr("title", newState ? "点击取消激活" : "点击激活");
        });
      });
      bindTouchSafeTap(row.find(".cfm-row-star"), () => {
        toggleResFavorite("quickreply", n);
        executeQrSearch();
      });
      row.on("click", (e) => {
        if (
          $(e.target).closest(
            ".cfm-row-star, .cfm-wi-toggle, .cfm-multisel-checkbox, .cfm-qr-expand-arrow",
          ).length
        )
          return;
        if (cfmMultiSelectMode) {
          toggleMultiSelectItem(n, e.shiftKey);
          executeQrSearch();
          return;
        }
        // 定位到该快速回复集所在文件夹
        const folder = groups[n];
        const qrExpandedNodes = state.getQrExpandedNodes();
        if (folder) {
          const path = getResFolderPath("quickreply", folder);
          for (let i = 0; i < path.length - 1; i++)
            qrExpandedNodes.add(path[i]);
          state.setSelectedQrFolder(folder);
        } else {
          state.setSelectedQrFolder("__ungrouped__");
        }
        $("#cfm-qr-global-search").val("");
        renderQRView();
      });
      rightList.append(row);
      if (isSetExpanded) {
        const qrItems = getQrSetItems(n);
        if (qrItems.length > 0) {
          const subContainer = $('<div class="cfm-qr-sub-items"></div>');
          for (let qrIdx = 0; qrIdx < qrItems.length; qrIdx++) {
            const qr = qrItems[qrIdx];
            const label = qr.label || qr.title || "(未命名)";
            const isHidden = qr.isHidden || qr.hidden || false;
            const subRow = $(`
              <div class="cfm-qr-sub-item ${isHidden ? "cfm-qr-sub-hidden" : ""}" data-qr-set="${escapeHtml(n)}" data-qr-index="${qrIdx}">
                <div class="cfm-qr-sub-icon"><i class="fa-solid fa-comment${isHidden ? "-slash" : ""}" style="color:${isHidden ? "#6c7086" : "#a6e3a1"};"></i></div>
                <div class="cfm-qr-sub-info">
                  <div class="cfm-qr-sub-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
                </div>
                <div class="cfm-qr-sub-actions">
                  <div class="cfm-qr-sub-edit-btn" title="查看/编辑内容"><i class="fa-solid fa-pen-to-square"></i></div>
                </div>
              </div>
            `);
            subRow
              .find(".cfm-qr-sub-edit-btn")
              .on("click touchend", function (e) {
                e.preventDefault();
                e.stopPropagation();
                openQrItemEditor(n, qrIdx, qr);
              });
            subContainer.append(subRow);
          }
          rightList.append(subContainer);
        } else {
          rightList.append(
            '<div class="cfm-qr-sub-items"><div class="cfm-qr-sub-empty">此集合中没有快速回复</div></div>',
          );
        }
      }
    }

    if (cfmMultiSelectMode) {
      const visible = getVisibleResourceIds();
      const allSel =
        visible.length > 0 && visible.every((id) => cfmMultiSelected.has(id));
      const toolbar = $(`
        <div class="cfm-multisel-toolbar">
          <button class="cfm-btn cfm-btn-sm cfm-multisel-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
          <button class="cfm-btn cfm-btn-sm cfm-multisel-range ${cfmMultiSelectRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmMultiSelectRangeMode ? "(开)" : ""}</button>
          <button class="cfm-btn cfm-btn-sm cfm-multisel-activate" title="批量激活快速回复集"><i class="fa-solid fa-toggle-on"></i> 激活</button>
          <button class="cfm-btn cfm-btn-sm cfm-multisel-deactivate" title="批量取消激活快速回复集"><i class="fa-solid fa-toggle-off"></i> 取消激活</button>
          <span class="cfm-multisel-count">${cfmMultiSelected.size > 0 ? `已选 ${cfmMultiSelected.size} 项` : ""}</span>
        </div>
      `);
      toolbar.find(".cfm-multisel-selectall").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectAllVisible();
        executeQrSearch();
      });
      toolbar.find(".cfm-multisel-range").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.setCfmMultiSelectRangeMode(!cfmMultiSelectRangeMode);
        if (state.getCfmMultiSelectRangeMode())
          state.setCfmMultiSelectLastClicked(null);
        executeQrSearch();
      });
      toolbar.find(".cfm-multisel-activate").on("click touchend", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const changed = await applyQrMultiActivation(
          Array.from(cfmMultiSelected),
          true,
        );
        if (changed) executeQrSearch();
      });
      toolbar
        .find(".cfm-multisel-deactivate")
        .on("click touchend", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const changed = await applyQrMultiActivation(
            Array.from(cfmMultiSelected),
            false,
          );
          if (changed) executeQrSearch();
        });
      rightList.prepend(toolbar);
    }
  }

  return { executeQrSearch };
}
