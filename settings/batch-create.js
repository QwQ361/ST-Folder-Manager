// 设置页批量操作层：批量创建/删除/树形渲染相关函数。
// 承接 index.js 原 L21823-22631 区域的 12 个函数（含 getResTypeLabel 辅助）。
// 通过 createBatchCreateCore(deps) 工厂注入依赖，不直接访问 index.js 闭包。
// 可变状态注入约定：
//   - Set 类型（configSelectedFolderIds/cfmDeleteSelected/resConfigDeleteSelected/resConfigSelectedFolderIds/configExpandedNodes）传引用，可直接 .add/.delete/.clear
//   - 基础类型（cfmDeleteMode/cfmDeleteCascade/cfmDeleteLastClickedId/cfmDeleteRangeMode/cfmInvertScope/resConfigDeleteMode/resConfigDeleteCascade/resConfigDeleteLastClickedId/resConfigDeleteRangeMode/resConfigInvertScope）用 getter/setter 注入

/**
 * 批量操作工厂：注入全部依赖，返回批量创建/删除/树形渲染函数集合。
 * @param {Object} deps
 * @returns {{
 *   getResTypeLabel: Function,
 *   showResDeleteConfirmDialog: Function,
 *   executeResourceMultiDelete: Function,
 *   showResourceBatchCreatePopup: Function,
 *   renderConfigTreeItem: Function,
 *   executeInvertSelection: Function,
 *   getFlatFolderList: Function,
 *   getResFlatFolderList: Function,
 *   showDeleteConfirmDialog: Function,
 *   executeMultiDelete: Function,
 *   createTagsSiblings: Function,
 *   showBatchCreatePopup: Function,
 *   executeBatchCreate: Function,
 * }}
 */
export function createBatchCreateCore(deps) {
  const {
    $,
    extensionName,
    extension_settings,
    getContext,
    cfmToastr,
    // 渲染依赖
    renderConfigBody,
    renderResourceConfigBody,
    renderRegexConfigBody,
    escapeHtml,
    // 数据/操作
    config,
    getFolderTagIds,
    getTagName,
    getTopLevelFolders,
    getChildFolders,
    sortFolders,
    sortResFolders,
    getResFolderTree,
    getResFolderIds,
    getResFolderDisplayName,
    getResTopLevelFolders,
    getResChildFolders,
    getResFolderPath,
    addResFolder,
    removeResFolder,
    isNewlyImported,
    deleteTagFromSystem,
    saveConfig,
    recursiveRebuildTagNames,
    findOrCreateTag,
    buildBatchTemplateHtml,
    bindBatchTemplateEvents,
    parseBatchText,
    renderBatchPreview,
    // Set 状态（引用注入，可直接修改）
    configSelectedFolderIds,
    cfmDeleteSelected,
    resConfigDeleteSelected,
    resConfigSelectedFolderIds,
    configExpandedNodes,
    // 基础类型状态（getter/setter 注入）
    getCfmDeleteMode,
    setCfmDeleteMode,
    getCfmDeleteCascade,
    setCfmDeleteCascade,
    getCfmDeleteLastClickedId,
    setCfmDeleteLastClickedId,
    getCfmDeleteRangeMode,
    setCfmDeleteRangeMode,
    getCfmInvertScope,
    setCfmInvertScope,
    getResConfigDeleteMode,
    setResConfigDeleteMode,
    getResConfigDeleteCascade,
    setResConfigDeleteCascade,
    getResConfigDeleteLastClickedId,
    setResConfigDeleteLastClickedId,
    getResConfigDeleteRangeMode,
    setResConfigDeleteRangeMode,
    getResConfigInvertScope,
    setResConfigInvertScope,
  } = deps;

  // ==================== 资源删除确认弹窗（与角色卡风格一致） ====================
  function getResTypeLabel(type) {
    const labels = {
      presets: "预设",
      worldinfo: "世界书",
      themes: "主题",
      backgrounds: "背景",
      personas: "User",
      quickreply: "快速回复集",
    };
    return labels[type] || type;
  }

  function showResDeleteConfirmDialog(type, folderIds, onConfirm) {
    const typeLabel = getResTypeLabel(type);
    const names = folderIds.map((id) => getResFolderDisplayName(type, id));
    const namesPreview =
      names.length > 5
        ? names.slice(0, 5).join("、") + `…等 ${names.length} 个`
        : names.join("、");

    const overlay = $(
      '<div id="cfm-delete-confirm-overlay" class="cfm-batch-overlay"></div>',
    );
    const dialog = $(`
      <div class="cfm-batch-popup" style="max-width:480px;max-height:320px;">
        <div class="cfm-config-header"><h3>⚠️ 确认删除</h3><button class="cfm-btn-close" id="cfm-rdc-close">&times;</button></div>
        <div style="padding:16px;">
          <div style="margin-bottom:12px;font-size:13px;line-height:1.6;">
            即将删除 <strong>${folderIds.length}</strong> 个文件夹：<br>
            <span style="color:#f9e2af;">${escapeHtml(namesPreview)}</span>
          </div>
          <div style="margin-bottom:16px;font-size:13px;color:#a6adc8;">
            子文件夹将提升到上级，文件夹内的${typeLabel}将变为未归类。
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
            <button id="cfm-rdc-cancel" class="cfm-btn" style="opacity:0.7;">取消</button>
            <button id="cfm-rdc-confirm" class="cfm-btn cfm-btn-danger" style="background:rgba(237,66,69,0.2);border-color:rgba(237,66,69,0.5);">确认删除</button>
          </div>
        </div>
      </div>
    `);
    overlay.append(dialog);
    $("body").append(overlay);
    dialog.find("#cfm-rdc-close, #cfm-rdc-cancel").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });
    dialog.find("#cfm-rdc-confirm").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onConfirm();
    });
  }

  // 预设/世界书批量删除执行
  function executeResourceMultiDelete(type) {
    if (resConfigDeleteSelected.size === 0) return;
    const toDelete = Array.from(resConfigDeleteSelected);
    const typeLabel = getResTypeLabel(type);

    showResDeleteConfirmDialog(type, toDelete, () => {
      const tree = getResFolderTree(type);
      const sorted = [...toDelete].sort((a, b) => {
        return (
          getResFolderPath(type, b).length - getResFolderPath(type, a).length
        );
      });
      for (const fid of sorted) {
        if (!tree[fid]) continue;
        removeResFolder(type, fid);
      }
      resConfigDeleteSelected.clear();
      setResConfigDeleteMode(false);
      cfmToastr.success(`已删除 ${toDelete.length} 个${typeLabel}文件夹`);
      const body = $("#cfm-config-body");
      renderResourceConfigBody(body.empty(), type, "create");
    });
  }

  // 预设/世界书批量创建弹窗（支持缩进嵌套，与角色卡批量创建一致）
  function showResourceBatchCreatePopup(type) {
    if ($("#cfm-res-batch-overlay").length > 0) return;
    const typeLabel = getResTypeLabel(type);
    let smartIndentChildMode = false;
    const overlay = $(
      '<div id="cfm-res-batch-overlay" class="cfm-batch-overlay"></div>',
    );
    const popup = $(`
      <div class="cfm-batch-popup">
        <div class="cfm-config-header"><h3>📋 批量创建文件夹结构</h3><button class="cfm-btn-close" id="cfm-res-batch-close">&times;</button></div>
        <div style="padding:16px;overflow-y:auto;flex:1;min-height:0;">
          <div class="cfm-create-tag-hint" style="margin-bottom:10px;">每行一个标签名，用缩进表示层级（每2个空格深入一层）。<br>行首的 <code>-</code> 是可选装饰，会被忽略。示例：</div>
          <pre style="background:#1a1a2e;color:#aaa;padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;">1\n  -1.1\n    -1.1.1\n    -1.1.2\n  -1.2\n2\n  -2.1</pre>
          <div id="cfm-res-batch-tpl-area"></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <button id="cfm-res-smart-indent-child" class="cfm-btn" style="font-size:12px;padding:3px 10px;" title="开启后，回车将比当前行多缩进2格（创建子级）。关闭时，回车保持同级缩进。退格键始终回退2个空格。"><i class="fa-solid fa-indent"></i> 添加子级</button>
            <span style="font-size:11px;opacity:0.5;">Enter 智能缩进 · Backspace 回退层级</span>
          </div>
          <textarea id="cfm-res-batch-textarea" rows="12" style="width:100%;font-family:monospace;font-size:13px;background:#23272a;color:#f2f3f5;border:1px solid #4e5058;border-radius:6px;padding:10px;resize:vertical;tab-size:2;" placeholder="在此输入文件夹结构..."></textarea>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
            <button id="cfm-res-batch-preview" class="cfm-btn" style="background:#5865f2;">预览</button>
            <button id="cfm-res-batch-confirm" class="cfm-btn" style="background:#57f287;color:#000;">确认创建</button>
          </div>
          <div id="cfm-res-batch-preview-area" style="margin-top:12px;"></div>
        </div>
      </div>
    `);
    overlay.append(popup);
    $("body").append(overlay);
    // 渲染模板区域
    const tplType = type === "presets" ? "presets" : "worldinfo";
    function refreshResBatchTemplates() {
      const tplArea = popup.find("#cfm-res-batch-tpl-area");
      const editingIdx = Number.parseInt(
        popup.data("cfmEditingTemplateIndex"),
        10,
      );
      const editingName = popup.data("cfmEditingTemplateName") || "";
      tplArea.html(
        buildBatchTemplateHtml(
          tplType,
          Number.isNaN(editingIdx) ? -1 : editingIdx,
          editingName.toString(),
        ),
      );
      bindBatchTemplateEvents(
        tplType,
        popup,
        "#cfm-res-batch-textarea",
        refreshResBatchTemplates,
      );
    }
    refreshResBatchTemplates();

    popup.find("#cfm-res-batch-close").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });

    // 「添加子级」切换按钮
    const childBtn = popup.find("#cfm-res-smart-indent-child");
    childBtn.on("click touchend", (e) => {
      e.preventDefault();
      smartIndentChildMode = !smartIndentChildMode;
      childBtn.toggleClass("cfm-smart-indent-active", smartIndentChildMode);
    });

    // 智能缩进键盘处理
    popup.find("#cfm-res-batch-textarea").on("keydown", function (e) {
      const ta = this;
      if (e.key === "Enter") {
        e.preventDefault();
        const pos = ta.selectionStart;
        const val = ta.value;
        const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
        const lineText = val.substring(lineStart, pos);
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : "";
        const newIndent = smartIndentChildMode
          ? currentIndent + "  "
          : currentIndent;
        const insert = "\n" + newIndent;
        ta.value = val.substring(0, pos) + insert + val.substring(pos);
        const newPos = pos + insert.length;
        ta.selectionStart = ta.selectionEnd = newPos;
      } else if (e.key === "Backspace") {
        const pos = ta.selectionStart;
        const val = ta.value;
        if (pos === ta.selectionEnd && pos > 0) {
          const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
          const beforeCursor = val.substring(lineStart, pos);
          if (/^\s+$/.test(beforeCursor) && beforeCursor.length >= 2) {
            e.preventDefault();
            ta.value = val.substring(0, pos - 2) + val.substring(pos);
            ta.selectionStart = ta.selectionEnd = pos - 2;
          }
        }
      }
    });

    popup.find("#cfm-res-batch-preview").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-res-batch-textarea").val();
      const treeData = parseBatchText(text);
      const area = popup.find("#cfm-res-batch-preview-area");
      area.empty();
      if (treeData.length === 0) {
        area.html('<div style="color:#ed4245;">无法解析，请检查格式。</div>');
        return;
      }
      const existingIds = new Set(getResFolderIds(type));
      area.html(
        '<div style="color:#57f287;margin-bottom:6px;">预览结构：</div>',
      );
      function renderResPreview(container, nodes, depth) {
        for (const node of nodes) {
          const exists = existingIds.has(node.name);
          container.append(
            `<div style="padding-left:${depth * 20}px;font-size:13px;line-height:1.8;${exists ? "color:#ed4245;text-decoration:line-through;" : ""}">📁 ${escapeHtml(node.name)}${exists ? " (已存在，跳过)" : ""}</div>`,
          );
          if (node.children.length > 0)
            renderResPreview(container, node.children, depth + 1);
        }
      }
      renderResPreview(area, treeData, 0);
    });

    popup.find("#cfm-res-batch-confirm").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-res-batch-textarea").val();
      const treeData = parseBatchText(text);
      if (treeData.length === 0) {
        cfmToastr.warning("无法解析，请检查格式");
        return;
      }
      let created = 0,
        skipped = 0;
      function processResNode(node, parentId) {
        let folderName = node.name;
        const tree = getResFolderTree(type);
        // 子文件夹始终使用父级前缀
        if (parentId) {
          folderName = parentId + "-" + node.name;
        }
        // 如果已存在且父级匹配，视为"已存在"，直接用它作为子级的父级
        if (
          tree[folderName] &&
          tree[folderName].parentId === (parentId || null)
        ) {
          skipped++;
          for (const child of node.children) processResNode(child, folderName);
          return;
        }
        // 如果名称冲突但父级不同，追加数字后缀
        if (tree[folderName]) {
          let base = folderName;
          let counter = 2;
          while (tree[folderName]) {
            folderName = base + "_" + counter++;
          }
        }
        const displayName = parentId ? node.name : null;
        if (addResFolder(type, folderName, parentId, displayName)) created++;
        else skipped++;
        for (const child of node.children) processResNode(child, folderName);
      }
      const batchParentIds =
        resConfigSelectedFolderIds.size > 0
          ? Array.from(resConfigSelectedFolderIds)
          : [null];
      for (const batchParentId of batchParentIds) {
        for (const node of treeData) processResNode(node, batchParentId);
      }
      overlay.remove();
      cfmToastr.success(
        `已创建 ${created} 个文件夹${skipped > 0 ? `，${skipped} 个跳过` : ""}`,
      );
      renderConfigBody("create");
    });
  }

  function renderConfigTreeItem(container, folderId, depth) {
    const indent = depth * 24;
    const name = getTagName(folderId);
    const isSelected = configSelectedFolderIds.has(folderId);
    const isDelChecked = cfmDeleteSelected.has(folderId);
    const hasChildren = getChildFolders(folderId).length > 0;
    const isExpanded = configExpandedNodes.has(folderId);

    let checkboxHtml = "";
    if (getCfmDeleteMode()) {
      checkboxHtml = `<span class="cfm-del-checkbox ${isDelChecked ? "cfm-del-checked" : ""}" data-del-id="${folderId}"><i class="fa-${isDelChecked ? "solid" : "regular"} fa-square${isDelChecked ? "-check" : ""}"></i></span>`;
    }

    const arrowHtml = `<span class="cfm-tnode-arrow cfm-config-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>`;

    const isNewTag = isNewlyImported(folderId);
    const item = $(`
            <div class="cfm-tree-item ${isSelected ? "cfm-tree-selected" : ""} ${isNewTag ? "cfm-tree-new" : ""}" data-folder-id="${folderId}" style="padding-left:${10 + indent}px;">
                ${checkboxHtml}
                ${arrowHtml}
                <span class="cfm-tree-icon"><i class="fa-solid fa-folder${isSelected ? "-open" : ""}"></i></span>
                <span class="cfm-tree-name">${escapeHtml(name)}${isNewTag ? ' <span class="cfm-new-badge">新</span>' : ""}</span>
                ${getCfmDeleteMode() ? "" : '<span class="cfm-tree-actions"><button class="cfm-btn-danger cfm-remove-folder" data-id="' + folderId + '" title="移除此文件夹"><i class="fa-solid fa-trash-can"></i></button></span>'}
            </div>
        `);

    // 点击箭头：展开/收起
    item.find(".cfm-config-arrow").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hasChildren) return;
      if (configExpandedNodes.has(folderId))
        configExpandedNodes.delete(folderId);
      else configExpandedNodes.add(folderId);
      renderConfigBody();
    });

    // 删除模式：点击复选框/行切换选中状态（支持Shift框选 + 级联）
    if (getCfmDeleteMode()) {
      const toggleFolder = (id, forceState) => {
        const shouldSelect =
          forceState !== undefined ? forceState : !cfmDeleteSelected.has(id);
        if (shouldSelect) cfmDeleteSelected.add(id);
        else cfmDeleteSelected.delete(id);
        if (getCfmDeleteCascade()) {
          // 级联：对所有后代也执行同样操作
          const toggleDescendants = (parentId) => {
            for (const childId of getChildFolders(parentId)) {
              if (shouldSelect) cfmDeleteSelected.add(childId);
              else cfmDeleteSelected.delete(childId);
              toggleDescendants(childId);
            }
          };
          toggleDescendants(id);
        }
      };
      const handleDeleteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if ((e.shiftKey || getCfmDeleteRangeMode()) && getCfmDeleteLastClickedId()) {
          // 框选：选中上次点击到当前点击之间的所有项（Shift键或框选模式按钮）
          const flatList = getFlatFolderList();
          const lastIdx = flatList.indexOf(getCfmDeleteLastClickedId());
          const curIdx = flatList.indexOf(folderId);
          if (lastIdx >= 0 && curIdx >= 0) {
            const start = Math.min(lastIdx, curIdx);
            const end = Math.max(lastIdx, curIdx);
            for (let i = start; i <= end; i++) {
              cfmDeleteSelected.add(flatList[i]);
              if (getCfmDeleteCascade()) {
                const toggleDesc = (pid) => {
                  for (const cid of getChildFolders(pid)) {
                    cfmDeleteSelected.add(cid);
                    toggleDesc(cid);
                  }
                };
                toggleDesc(flatList[i]);
              }
            }
          }
        } else {
          toggleFolder(folderId);
        }
        setCfmDeleteLastClickedId(folderId);
        renderConfigBody();
      };
      item.find(".cfm-del-checkbox").on("click touchend", handleDeleteClick);
      item.on("click", (e) => {
        if ($(e.target).closest(".cfm-del-checkbox, .cfm-config-arrow").length)
          return;
        handleDeleteClick(e);
      });
      container.append(item);
      if (hasChildren) {
        const childContainer = $(
          `<div class="cfm-config-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
        );
        const children = sortFolders(getChildFolders(folderId));
        for (const childId of children)
          renderConfigTreeItem(childContainer, childId, depth + 1);
        container.append(childContainer);
      }
      return;
    }
    // 点击选中/取消选中
    item.on("click", (e) => {
      if ($(e.target).closest(".cfm-remove-folder, .cfm-config-arrow").length)
        return;
      e.preventDefault();
      if (configSelectedFolderIds.has(folderId)) {
        configSelectedFolderIds.delete(folderId);
      } else {
        configSelectedFolderIds.add(folderId);
      }
      renderConfigBody();
    });
    // 删除（带确认弹窗）
    item.find(".cfm-remove-folder").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDeleteConfirmDialog([folderId], (alsoDeleteTags) => {
        const parentId = config.folders[folderId]?.parentId || null;
        const reparentedChildren = [];
        for (const childId of getChildFolders(folderId)) {
          config.folders[childId].parentId = parentId;
          reparentedChildren.push(childId);
        }
        if (alsoDeleteTags) {
          deleteTagFromSystem(folderId);
        } else {
          // 仅删除文件夹但保留标签：加入排除列表防止自动重新导入
          const excluded = extension_settings[extensionName].excludedTagIds;
          if (!excluded.includes(folderId)) excluded.push(folderId);
        }
        delete config.folders[folderId];
        saveConfig(config);
        // 重建被提升的子文件夹的标签名
        for (const childId of reparentedChildren) {
          recursiveRebuildTagNames(childId);
        }
        getContext().saveSettingsDebounced();
        configSelectedFolderIds.delete(folderId);
        const suffix = alsoDeleteTags ? "（标签已同步删除）" : "";
        cfmToastr.info(`已移除文件夹「${name}」${suffix}`);
        renderConfigBody();
      });
    });
    container.append(item);
    if (hasChildren) {
      const childContainer = $(
        `<div class="cfm-config-children ${isExpanded ? "cfm-children-expanded" : ""}"></div>`,
      );
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children)
        renderConfigTreeItem(childContainer, childId, depth + 1);
      container.append(childContainer);
    }
  }

  // ==================== 反选功能 ====================
  function executeInvertSelection() {
    let targetIds = [];
    if (getCfmInvertScope() === "parent") {
      // 在指定父级下的直接子文件夹范围内反选
      if (configSelectedFolderIds.size > 0) {
        targetIds = [];
        for (const sid of configSelectedFolderIds) {
          targetIds.push(...getChildFolders(sid));
        }
      } else {
        // 没有选中父级时，范围为所有顶级文件夹
        targetIds = getTopLevelFolders();
      }
    } else {
      // 全部文件夹范围内反选
      targetIds = getFolderTagIds();
    }
    for (const id of targetIds) {
      if (cfmDeleteSelected.has(id)) {
        cfmDeleteSelected.delete(id);
      } else {
        cfmDeleteSelected.add(id);
        if (getCfmDeleteCascade()) {
          // 级联：新选中的项也选中其后代
          const addDescendants = (parentId) => {
            for (const childId of getChildFolders(parentId)) {
              cfmDeleteSelected.add(childId);
              addDescendants(childId);
            }
          };
          addDescendants(id);
        }
      }
    }
  }

  // ==================== 辅助：获取扁平化的文件夹ID列表（按树形DFS顺序） ====================
  function getFlatFolderList() {
    const result = [];
    const topFolders = sortFolders(getTopLevelFolders());
    function dfs(folderId) {
      result.push(folderId);
      const children = sortFolders(getChildFolders(folderId));
      for (const childId of children) dfs(childId);
    }
    for (const fid of topFolders) dfs(fid);
    return result;
  }

  function getResFlatFolderList(type) {
    const result = [];
    const topFolders = sortResFolders(type, getResTopLevelFolders(type));
    function dfs(folderId) {
      result.push(folderId);
      const children = sortResFolders(type, getResChildFolders(type, folderId));
      for (const childId of children) dfs(childId);
    }
    for (const fid of topFolders) dfs(fid);
    return result;
  }

  // ==================== 删除确认弹窗 ====================
  function showDeleteConfirmDialog(folderIds, onComplete) {
    const names = folderIds.map((id) => getTagName(id));
    const namesPreview =
      names.length > 5
        ? names.slice(0, 5).join("、") + `…等 ${names.length} 个`
        : names.join("、");

    const overlay = $(
      '<div id="cfm-delete-confirm-overlay" class="cfm-batch-overlay"></div>',
    );
    const dialog = $(`
            <div class="cfm-batch-popup" style="max-width:480px;max-height:320px;">
                <div class="cfm-config-header"><h3>⚠️ 确认删除</h3><button class="cfm-btn-close" id="cfm-dc-close">&times;</button></div>
                <div style="padding:16px;">
                    <div style="margin-bottom:12px;font-size:13px;line-height:1.6;">
                        即将删除 <strong>${folderIds.length}</strong> 个文件夹：<br>
                        <span style="color:#f9e2af;">${escapeHtml(namesPreview)}</span>
                    </div>
                    <div style="margin-bottom:16px;font-size:13px;color:#a6adc8;">
                        是否同时从酒馆系统中删除对应的标签？<br>
                        <span style="color:#ed4245;font-size:12px;">⚠ 删除标签不可撤销，会移除角色与标签的关联。</span>
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                        <button id="cfm-dc-cancel" class="cfm-btn" style="opacity:0.7;">取消</button>
                        <button id="cfm-dc-folder-only" class="cfm-btn" style="background:rgba(88,101,242,0.2);color:#8b9dfc;border-color:rgba(88,101,242,0.4);">仅移除文件夹</button>
                        <button id="cfm-dc-with-tags" class="cfm-btn cfm-btn-danger" style="background:rgba(237,66,69,0.2);border-color:rgba(237,66,69,0.5);">同时删除标签</button>
                    </div>
                </div>
            </div>
        `);
    overlay.append(dialog);
    $("body").append(overlay);
    dialog.find("#cfm-dc-close, #cfm-dc-cancel").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });
    dialog.find("#cfm-dc-folder-only").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onComplete(false);
    });
    dialog.find("#cfm-dc-with-tags").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onComplete(true);
    });
  }

  // ==================== 批量删除执行 ====================
  function executeMultiDelete() {
    if (cfmDeleteSelected.size === 0) return;
    const toDeleteIds = Array.from(cfmDeleteSelected);

    showDeleteConfirmDialog(toDeleteIds, (alsoDeleteTags) => {
      const toDelete = new Set(toDeleteIds);
      const deletedNames = [];

      // 按从叶子到根的顺序处理（深度优先反序），确保子文件夹先被处理
      const flatList = getFlatFolderList();
      const sortedToDelete = flatList
        .filter((id) => toDelete.has(id))
        .reverse();

      const allReparented = [];

      for (const folderId of sortedToDelete) {
        if (!config.folders[folderId]) continue;
        const parentId = config.folders[folderId].parentId || null;
        for (const childId of getChildFolders(folderId)) {
          if (!toDelete.has(childId)) {
            config.folders[childId].parentId = parentId;
            allReparented.push(childId);
          }
        }
        deletedNames.push(getTagName(folderId));
        if (alsoDeleteTags) {
          deleteTagFromSystem(folderId);
        } else {
          // 仅删除文件夹但保留标签：加入排除列表防止自动重新导入
          const excluded = extension_settings[extensionName].excludedTagIds;
          if (!excluded.includes(folderId)) excluded.push(folderId);
        }
        delete config.folders[folderId];
        configSelectedFolderIds.delete(folderId);
      }
      saveConfig(config);
      for (const childId of allReparented) {
        recursiveRebuildTagNames(childId);
      }
      getContext().saveSettingsDebounced();
      cfmDeleteSelected.clear();
      setCfmDeleteCascade(false);
      setCfmDeleteLastClickedId(null);
      setCfmDeleteRangeMode(false);
      setCfmDeleteMode(false);
      const suffix = alsoDeleteTags ? "（标签已同步删除）" : "";
      cfmToastr.success(`已删除 ${deletedNames.length} 个文件夹${suffix}`);
      renderConfigBody();
    });
  }

  // ==================== 空格分隔批量创建同级标签 ====================
  function createTagsSiblings(input, parentFolderId, silent) {
    const names = input.split(/\s+/).filter((s) => s.length > 0);
    if (names.length === 0) {
      if (!silent) cfmToastr.warning("标签名称不能为空");
      return 0;
    }
    const created = [];
    let prefixCount = 0;
    for (const name of names) {
      const { tag, displayName } = findOrCreateTag(
        name,
        parentFolderId || null,
      );
      if (!config.folders[tag.id]) {
        config.folders[tag.id] = { parentId: parentFolderId || null };
        if (displayName) {
          config.folders[tag.id].displayName = displayName;
          prefixCount++;
        }
        // 从排除列表中移除
        const _ex = extension_settings[extensionName].excludedTagIds;
        const _exi = _ex.indexOf(tag.id);
        if (_exi >= 0) _ex.splice(_exi, 1);
      }
      created.push(displayName || name);
    }
    saveConfig(config);
    getContext().saveSettingsDebounced();
    if (!silent) {
      const parentHint = parentFolderId
        ? `「${getTagName(parentFolderId)}」下`
        : "顶级";
      cfmToastr.success(`已创建 ${created.length} 个文件夹`);
    }
    return created.length;
  }

  // ==================== 批量创建弹窗（多行缩进格式） ====================
  function showBatchCreatePopup() {
    if ($("#cfm-batch-overlay").length > 0) return;
    let smartIndentChildMode = false; // 「添加子级」按钮状态
    const overlay = $(
      '<div id="cfm-batch-overlay" class="cfm-batch-overlay"></div>',
    );
    const popup = $(`
            <div class="cfm-batch-popup">
                <div class="cfm-config-header"><h3>📋 批量创建文件夹结构</h3><button class="cfm-btn-close" id="cfm-batch-close">&times;</button></div>
                <div style="padding:16px;overflow-y:auto;flex:1;min-height:0;">
                    <div class="cfm-create-tag-hint" style="margin-bottom:10px;">每行一个标签名，用缩进表示层级（每2个空格深入一层）。<br>行首的 <code>-</code> 是可选装饰，会被忽略。示例：</div>
                    <pre style="background:#1a1a2e;color:#aaa;padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;">1\n  -1.1\n    -1.1.1\n    -1.1.2\n  -1.2\n2\n  -2.1</pre>
                    <div id="cfm-batch-tpl-area"></div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <button id="cfm-smart-indent-child" class="cfm-btn" style="font-size:12px;padding:3px 10px;" title="开启后，回车将比当前行多缩进2格（创建子级）。关闭时，回车保持同级缩进。退格键始终回退2个空格。"><i class="fa-solid fa-indent"></i> 添加子级</button>
                        <span style="font-size:11px;opacity:0.5;">Enter 智能缩进 · Backspace 回退层级</span>
                    </div>
                    <textarea id="cfm-batch-textarea" rows="12" style="width:100%;font-family:monospace;font-size:13px;background:#23272a;color:#f2f3f5;border:1px solid #4e5058;border-radius:6px;padding:10px;resize:vertical;tab-size:2;" placeholder="在此输入文件夹结构..."></textarea>
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
                        <button id="cfm-batch-preview" class="cfm-btn" style="background:#5865f2;">预览</button>
                        <button id="cfm-batch-confirm" class="cfm-btn" style="background:#57f287;color:#000;">确认创建</button>
                    </div>
                    <div id="cfm-batch-preview-area" style="margin-top:12px;"></div>
                </div>
            </div>
        `);
    overlay.append(popup);
    $("body").append(overlay);
    // 渲染模板区域
    function refreshBatchTemplates() {
      const tplArea = popup.find("#cfm-batch-tpl-area");
      const editingIdx = Number.parseInt(
        popup.data("cfmEditingTemplateIndex"),
        10,
      );
      const editingName = popup.data("cfmEditingTemplateName") || "";
      tplArea.html(
        buildBatchTemplateHtml(
          "characters",
          Number.isNaN(editingIdx) ? -1 : editingIdx,
          editingName.toString(),
        ),
      );
      bindBatchTemplateEvents(
        "characters",
        popup,
        "#cfm-batch-textarea",
        refreshBatchTemplates,
      );
    }
    refreshBatchTemplates();
    popup.find("#cfm-batch-close").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });
    popup.find("#cfm-batch-preview").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-batch-textarea").val();
      const tree = parseBatchText(text);
      const area = popup.find("#cfm-batch-preview-area");
      area.empty();
      if (tree.length === 0) {
        area.html('<div style="color:#ed4245;">无法解析，请检查格式。</div>');
        return;
      }
      area.html(
        '<div style="color:#57f287;margin-bottom:6px;">预览结构：</div>',
      );
      renderBatchPreview(area, tree, 0);
    });
    popup.find("#cfm-batch-confirm").on("click touchend", (e) => {
      e.preventDefault();
      const text = popup.find("#cfm-batch-textarea").val();
      const tree = parseBatchText(text);
      if (tree.length === 0) {
        cfmToastr.warning("无法解析，请检查格式");
        return;
      }
      const batchParentIds =
        configSelectedFolderIds.size > 0
          ? Array.from(configSelectedFolderIds)
          : [null];
      let batchTotal = 0;
      for (const bpId of batchParentIds) {
        batchTotal += executeBatchCreate(tree, bpId, batchParentIds.length > 1);
      }
      if (batchParentIds.length > 1 && batchTotal > 0) {
        cfmToastr.success(
          `已在 ${batchParentIds.length} 个父级下创建共 ${batchTotal} 个文件夹`,
        );
      }
      overlay.remove();
      renderConfigBody();
    });

    // 「添加子级」切换按钮
    const childBtn = popup.find("#cfm-smart-indent-child");
    childBtn.on("click touchend", (e) => {
      e.preventDefault();
      smartIndentChildMode = !smartIndentChildMode;
      childBtn.toggleClass("cfm-smart-indent-active", smartIndentChildMode);
    });

    // 智能缩进键盘处理
    popup.find("#cfm-batch-textarea").on("keydown", function (e) {
      const ta = this;
      if (e.key === "Enter") {
        e.preventDefault();
        const pos = ta.selectionStart;
        const val = ta.value;
        const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
        const lineText = val.substring(lineStart, pos);
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : "";
        const newIndent = smartIndentChildMode
          ? currentIndent + "  "
          : currentIndent;
        const insert = "\n" + newIndent;
        ta.value = val.substring(0, pos) + insert + val.substring(pos);
        const newPos = pos + insert.length;
        ta.selectionStart = ta.selectionEnd = newPos;
      } else if (e.key === "Backspace") {
        const pos = ta.selectionStart;
        const val = ta.value;
        if (pos === ta.selectionEnd && pos > 0) {
          // 检查光标前是否是行首的空格（可以回退2格）
          const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
          const beforeCursor = val.substring(lineStart, pos);
          // 如果光标前全是空格，且至少有2个空格，则回退2格
          if (/^\s+$/.test(beforeCursor) && beforeCursor.length >= 2) {
            e.preventDefault();
            ta.value = val.substring(0, pos - 2) + val.substring(pos);
            ta.selectionStart = ta.selectionEnd = pos - 2;
          }
        }
      }
    });
  }

  function executeBatchCreate(nodes, parentId, silent) {
    let count = 0;
    let prefixCount = 0;
    function processNode(node, parentTagId) {
      const { tag, displayName } = findOrCreateTag(node.name, parentTagId);
      if (!config.folders[tag.id]) {
        config.folders[tag.id] = { parentId: parentTagId };
        if (displayName) {
          config.folders[tag.id].displayName = displayName;
          prefixCount++;
        }
        // 从排除列表中移除
        const _ex = extension_settings[extensionName].excludedTagIds;
        const _exi = _ex.indexOf(tag.id);
        if (_exi >= 0) _ex.splice(_exi, 1);
        count++;
      }
      for (const child of node.children) processNode(child, tag.id);
    }
    for (const node of nodes) processNode(node, parentId);
    saveConfig(config);
    getContext().saveSettingsDebounced();
    if (!silent) cfmToastr.success(`已创建 ${count} 个文件夹`);
    return count;
  }

  // ==================== 正则文件夹：批量创建弹窗 ====================
  // 操作 extension_settings[extensionName].regexFolderTree 树结构
  function getRegexChildConf(parentId) {
    const folderTree = extension_settings[extensionName].regexFolderTree;
    return Object.keys(folderTree).filter(
      (id) => folderTree[id].parentId === parentId,
    );
  }
  function addRegexFolderConf(name, parentId, displayName) {
    const folderTree = extension_settings[extensionName].regexFolderTree;
    if (folderTree[name]) return false;
    const siblings = getRegexChildConf(parentId || null);
    const maxOrder = siblings.reduce(
      (m, id) => Math.max(m, folderTree[id]?.sortOrder ?? 0),
      0,
    );
    const entry = { parentId: parentId || null, sortOrder: maxOrder + 1 };
    if (displayName && displayName !== name) entry.displayName = displayName;
    folderTree[name] = entry;
    getContext().saveSettingsDebounced();
    return true;
  }
  function showRegexBatchCreatePopup(body) {
    if ($("#cfm-regex-batch-overlay").length > 0) return;
    let smartIndentChildMode = false;
    const batchOverlay = $(
      '<div id="cfm-regex-batch-overlay" class="cfm-batch-overlay"></div>',
    );
    const batchPopup = $(`
      <div class="cfm-batch-popup">
        <div class="cfm-config-header"><h3>📋 批量创建正则文件夹结构</h3><button class="cfm-btn-close" id="cfm-regex-batch-close">&times;</button></div>
        <div style="padding:16px;overflow-y:auto;flex:1;min-height:0;">
          <div class="cfm-create-tag-hint" style="margin-bottom:10px;">每行一个文件夹名，用缩进表示层级（每2个空格深入一层）。<br>行首的 <code>-</code> 是可选装饰，会被忽略。示例：</div>
          <pre style="background:#1a1a2e;color:#aaa;padding:10px;border-radius:6px;font-size:12px;margin-bottom:12px;">1\n  -1.1\n    -1.1.1\n    -1.1.2\n  -1.2\n2\n  -2.1</pre>
          <div id="cfm-regex-batch-tpl-area"></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <button id="cfm-regex-smart-indent-child" class="cfm-btn" style="font-size:12px;padding:3px 10px;" title="开启后，回车将比当前行多缩进2格（创建子级）。关闭时，回车保持同级缩进。退格键始终回退2个空格。"><i class="fa-solid fa-indent"></i> 添加子级</button>
            <span style="font-size:11px;opacity:0.5;">Enter 智能缩进 · Backspace 回退层级</span>
          </div>
          <textarea id="cfm-regex-batch-textarea" rows="12" style="width:100%;font-family:monospace;font-size:13px;background:#23272a;color:#f2f3f5;border:1px solid #4e5058;border-radius:6px;padding:10px;resize:vertical;tab-size:2;" placeholder="在此输入文件夹结构..."></textarea>
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
            <button id="cfm-regex-batch-preview" class="cfm-btn" style="background:#5865f2;">预览</button>
            <button id="cfm-regex-batch-confirm" class="cfm-btn" style="background:#57f287;color:#000;">确认创建</button>
          </div>
          <div id="cfm-regex-batch-preview-area" style="margin-top:12px;"></div>
        </div>
      </div>
    `);
    batchOverlay.append(batchPopup);
    $("body").append(batchOverlay);
    // 渲染模板区域（类型键 "regex"，与角色卡/预设/世界书共用模板存储机制）
    const tplType = "regex";
    function refreshRegexBatchTemplates() {
      const tplArea = batchPopup.find("#cfm-regex-batch-tpl-area");
      const editingIdx = Number.parseInt(
        batchPopup.data("cfmEditingTemplateIndex"),
        10,
      );
      const editingName = batchPopup.data("cfmEditingTemplateName") || "";
      tplArea.html(
        buildBatchTemplateHtml(
          tplType,
          Number.isNaN(editingIdx) ? -1 : editingIdx,
          editingName.toString(),
        ),
      );
      bindBatchTemplateEvents(
        tplType,
        batchPopup,
        "#cfm-regex-batch-textarea",
        refreshRegexBatchTemplates,
      );
    }
    refreshRegexBatchTemplates();
    batchPopup.find("#cfm-regex-batch-close").on("click touchend", (e) => {
      e.preventDefault();
      batchOverlay.remove();
    });
    const childBtn = batchPopup.find("#cfm-regex-smart-indent-child");
    childBtn.on("click touchend", (e) => {
      e.preventDefault();
      smartIndentChildMode = !smartIndentChildMode;
      childBtn.toggleClass("cfm-smart-indent-active", smartIndentChildMode);
    });
    batchPopup.find("#cfm-regex-batch-textarea").on("keydown", function (e) {
      const ta = this;
      if (e.key === "Enter") {
        e.preventDefault();
        const pos = ta.selectionStart;
        const val = ta.value;
        const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
        const lineText = val.substring(lineStart, pos);
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : "";
        const newIndent = smartIndentChildMode
          ? currentIndent + "  "
          : currentIndent;
        const insert = "\n" + newIndent;
        ta.value = val.substring(0, pos) + insert + val.substring(pos);
        ta.selectionStart = ta.selectionEnd = pos + insert.length;
      } else if (e.key === "Backspace") {
        const pos = ta.selectionStart;
        const val = ta.value;
        if (pos === ta.selectionEnd && pos > 0) {
          const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
          const beforeCursor = val.substring(lineStart, pos);
          if (/^\s+$/.test(beforeCursor) && beforeCursor.length >= 2) {
            e.preventDefault();
            ta.value = val.substring(0, pos - 2) + val.substring(pos);
            ta.selectionStart = ta.selectionEnd = pos - 2;
          }
        }
      }
    });
    batchPopup.find("#cfm-regex-batch-preview").on("click touchend", (e) => {
      e.preventDefault();
      const text = batchPopup.find("#cfm-regex-batch-textarea").val();
      const treeData = parseBatchText(text);
      const area = batchPopup.find("#cfm-regex-batch-preview-area");
      area.empty();
      if (treeData.length === 0) {
        area.html('<div style="color:#ed4245;">无法解析，请检查格式。</div>');
        return;
      }
      const folderTree = extension_settings[extensionName].regexFolderTree;
      const existingIds = new Set(Object.keys(folderTree));
      area.html(
        '<div style="color:#57f287;margin-bottom:6px;">预览结构：</div>',
      );
      function renderPreview(container, nodes, depth) {
        for (const node of nodes) {
          const exists = existingIds.has(node.name);
          container.append(
            `<div style="padding-left:${depth * 20}px;font-size:13px;line-height:1.8;${exists ? "color:#ed4245;text-decoration:line-through;" : ""}">📁 ${escapeHtml(node.name)}${exists ? " (已存在，跳过)" : ""}</div>`,
          );
          if (node.children.length > 0)
            renderPreview(container, node.children, depth + 1);
        }
      }
      renderPreview(area, treeData, 0);
    });
    batchPopup.find("#cfm-regex-batch-confirm").on("click touchend", (e) => {
      e.preventDefault();
      const text = batchPopup.find("#cfm-regex-batch-textarea").val();
      const treeData = parseBatchText(text);
      if (treeData.length === 0) {
        cfmToastr.warning("无法解析，请检查格式");
        return;
      }
      const folderTree = extension_settings[extensionName].regexFolderTree;
      let created = 0,
        skipped = 0;
      function processNode(node, parentId) {
        let folderName = node.name;
        if (parentId) folderName = parentId + "-" + node.name;
        if (
          folderTree[folderName] &&
          folderTree[folderName].parentId === (parentId || null)
        ) {
          skipped++;
          for (const child of node.children) processNode(child, folderName);
          return;
        }
        if (folderTree[folderName]) {
          let base = folderName;
          let counter = 2;
          while (folderTree[folderName]) {
            folderName = base + "_" + counter++;
          }
        }
        const displayName = parentId ? node.name : null;
        if (addRegexFolderConf(folderName, parentId, displayName)) created++;
        else skipped++;
        for (const child of node.children) processNode(child, folderName);
      }
      const batchParentIds =
        resConfigSelectedFolderIds.size > 0
          ? Array.from(resConfigSelectedFolderIds)
          : [null];
      for (const batchParentId of batchParentIds) {
        for (const node of treeData) processNode(node, batchParentId);
      }
      batchOverlay.remove();
      cfmToastr.success(
        `已创建 ${created} 个文件夹${skipped > 0 ? `，${skipped} 个跳过` : ""}`,
      );
      renderRegexConfigBody(body.empty(), "create");
    });
  }

  return {
    getResTypeLabel,
    showResDeleteConfirmDialog,
    executeResourceMultiDelete,
    showResourceBatchCreatePopup,
    renderConfigTreeItem,
    executeInvertSelection,
    getFlatFolderList,
    getResFlatFolderList,
    showDeleteConfirmDialog,
    executeMultiDelete,
    createTagsSiblings,
    showBatchCreatePopup,
    executeBatchCreate,
    addRegexFolderConf,
    showRegexBatchCreatePopup,
  };
}
