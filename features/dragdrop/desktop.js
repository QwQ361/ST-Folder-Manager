// 桌面端拖拽层：承接鼠标拖拽资源项到文件夹树、列表或 drop-zone 的事件处理与业务调度，不直接持久化资源树。
// 本文件为 PC 端拖拽辅助核心：pcDragStart / pcGetDropData / pcDragEnd 及调试日志。

// PC 拖拽调试日志
export function cfmDebugDragLogCore(stage, payload = {}) {
  try {
    console.log("[CFM Drag]", stage, payload);
  } catch {
    /* noop */
  }
}

// PC端dragstart辅助：存储拖拽数据到全局变量并设置自定义拖拽图像
export function pcDragStartCore(e, dragData, deps = {}) {
  const setPcDragData = deps.setPcDragData;
  const setPcDropHandled = deps.setPcDropHandled;
  const setPcLastResourceFolderHoverTarget =
    deps.setPcLastResourceFolderHoverTarget;
  const debugLog = deps.cfmDebugDragLog || cfmDebugDragLogCore;
  const doc = deps.document || globalThis.document;

  // 清掉上次拖拽可能残留的 ST body.dragover 状态（避免"关闭弹窗后界面变淡"）。
  // 只移除 dragover，保留 drop_target（可能是 ST 常驻 class，误删会影响 ST 自身拖文件导入）。
  doc.body?.classList.remove("dragover");
  setPcDragData(dragData);
  setPcDropHandled(false);
  setPcLastResourceFolderHoverTarget(null);
  const dataTransfer = e.originalEvent?.dataTransfer;
  debugLog("pcDragStart:begin", {
    dragData,
    hasDataTransfer: !!dataTransfer,
    effectAllowedBefore: dataTransfer?.effectAllowed ?? null,
    typesBefore: dataTransfer?.types ? Array.from(dataTransfer.types) : [],
  });
  dataTransfer?.setData("text/plain", JSON.stringify(dragData));
  if (dataTransfer) {
    dataTransfer.effectAllowed = "move";
  }
  debugLog("pcDragStart:afterSetData", {
    dragData,
    hasDataTransfer: !!dataTransfer,
    effectAllowedAfter: dataTransfer?.effectAllowed ?? null,
    typesAfter: dataTransfer?.types ? Array.from(dataTransfer.types) : [],
  });
  // 多选时设置自定义拖拽图像
  if (dragData.multiSelect && dragData.count > 1) {
    const ghost = doc.createElement("div");
    ghost.className = "cfm-pc-drag-ghost";
    ghost.textContent = `📦 共 ${dragData.count} 项`;
    ghost.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;padding:6px 16px;border-radius:8px;background:rgba(40,40,40,0.92);color:#fff;font-size:14px;white-space:nowrap;z-index:99999;pointer-events:none;";
    doc.body.appendChild(ghost);
    try {
      dataTransfer?.setDragImage(ghost, 0, 0);
      debugLog("pcDragStart:setDragImage:success", {
        dragData,
        ghostText: ghost.textContent,
      });
    } catch (error) {
      debugLog("pcDragStart:setDragImage:error", {
        dragData,
        error: String(error?.message || error),
      });
    }
    // 异步移除幽灵元素
    setTimeout(() => ghost.remove(), 0);
  }
}

// PC端drop辅助：优先从全局变量获取拖拽数据，回退到dataTransfer
export function pcGetDropDataCore(e, deps = {}) {
  const getPcDragData = deps.getPcDragData;
  const debugLog = deps.cfmDebugDragLog || cfmDebugDragLogCore;
  const dataTransfer = e.originalEvent?.dataTransfer;
  if (getPcDragData()) {
    debugLog("pcGetDropData:fromGlobal", {
      dragData: getPcDragData(),
      hasDataTransfer: !!dataTransfer,
      dropEffect: dataTransfer?.dropEffect ?? null,
      effectAllowed: dataTransfer?.effectAllowed ?? null,
      types: dataTransfer?.types ? Array.from(dataTransfer.types) : [],
    });
    return getPcDragData();
  }
  try {
    const raw = dataTransfer?.getData("text/plain") || "";
    const parsed = raw ? JSON.parse(raw) : null;
    debugLog("pcGetDropData:fromDataTransfer", {
      raw,
      parsed,
      hasDataTransfer: !!dataTransfer,
      dropEffect: dataTransfer?.dropEffect ?? null,
      effectAllowed: dataTransfer?.effectAllowed ?? null,
      types: dataTransfer?.types ? Array.from(dataTransfer.types) : [],
    });
    return parsed;
  } catch (error) {
    debugLog("pcGetDropData:error", {
      hasDataTransfer: !!dataTransfer,
      dropEffect: dataTransfer?.dropEffect ?? null,
      effectAllowed: dataTransfer?.effectAllowed ?? null,
      types: dataTransfer?.types ? Array.from(dataTransfer.types) : [],
      error: String(error?.message || error),
    });
    return null;
  }
}

// PC端dragend辅助：清除视觉反馈，并延迟释放全局拖拽数据
export function pcDragEndCore(deps = {}) {
  const getPcDragData = deps.getPcDragData;
  const getPcDropHandled = deps.getPcDropHandled;
  const getPcLastResourceFolderHoverTarget =
    deps.getPcLastResourceFolderHoverTarget;
  const setPcDropHandled = deps.setPcDropHandled;
  const setPcLastResourceFolderHoverTarget =
    deps.setPcLastResourceFolderHoverTarget;
  const setPcDragData = deps.setPcDragData;
  const debugLog = deps.cfmDebugDragLog || cfmDebugDragLogCore;
  const flashDraggedElement = deps.flashDraggedElement;
  const buildDraggedHighlightSelector = deps.buildDraggedHighlightSelector;
  const clearMultiSelect = deps.clearMultiSelect;
  const setItemGroup = deps.setItemGroup;
  const getTagName = deps.getTagName;
  const getResFolderDisplayName = deps.getResFolderDisplayName;
  const handleCharDropToFolder = deps.handleCharDropToFolder;
  const reorderFolder = deps.reorderFolder;
  const reorderResFolder = deps.reorderResFolder;
  const wouldCreateCycle = deps.wouldCreateCycle;
  const wouldCreateResCycle = deps.wouldCreateResCycle;
  const sortFolders = deps.sortFolders;
  const getChildFolders = deps.getChildFolders;
  const sortResFolders = deps.sortResFolders;
  const getResChildFolders = deps.getResChildFolders;
  const getResFolderTree = deps.getResFolderTree;
  const moveRegexFolder = deps.moveRegexFolder;
  const getGlobalScripts = deps.getGlobalScripts;
  const getExtensionSettings = deps.getExtensionSettings;
  const getExtensionName = deps.getExtensionName;
  const getConfig = deps.getConfig;
  const getContext = deps.getContext;
  const getCurrentResourceType = deps.getCurrentResourceType;
  const renderLeftTree = deps.renderLeftTree;
  const renderRightPane = deps.renderRightPane;
  const renderPresetsView = deps.renderPresetsView;
  const renderWorldInfoView = deps.renderWorldInfoView;
  const renderThemesView = deps.renderThemesView;
  const renderBackgroundsView = deps.renderBackgroundsView;
  const renderPersonasView = deps.renderPersonasView;
  const renderQRView = deps.renderQRView;
  const renderRegexView = deps.renderRegexView;
  const cfmToastr = deps.cfmToastr;
  const jq = deps.$ || globalThis.$;

  const dragData = getPcDragData();
  const fallbackTarget = getPcLastResourceFolderHoverTarget();
  debugLog("pcDragEnd:begin", {
    dragData,
    fallbackTarget,
    dropHandled: getPcDropHandled(),
  });
  const fallbackTypeMap = {
    preset: {
      groupType: "presets",
      label: "预设",
      render: () => renderPresetsView(),
      getNames: (data) =>
        data.multiSelect && data.selectedIds ? data.selectedIds : [data.name],
      firstName: (data) => data.name,
    },
    theme: {
      groupType: "themes",
      label: "主题",
      render: () => renderThemesView(),
      getNames: (data) =>
        data.multiSelect && data.selectedIds ? data.selectedIds : [data.name],
      firstName: (data) => data.name,
    },
    background: {
      groupType: "backgrounds",
      label: "背景",
      render: () => renderBackgroundsView(),
      getNames: (data) =>
        data.multiSelect && data.selectedIds ? data.selectedIds : [data.name],
      firstName: (data) => data.name,
    },
    worldinfo: {
      groupType: "worldinfo",
      label: "世界书",
      render: () => renderWorldInfoView(),
      getNames: (data) =>
        data.multiSelect && data.selectedIds ? data.selectedIds : [data.name],
      firstName: (data) => data.name,
    },
    quickreply: {
      groupType: "quickreply",
      label: "快速回复集",
      render: () => renderQRView(),
      getNames: (data) =>
        data.multiSelect && data.selectedIds ? data.selectedIds : [data.name],
      firstName: (data) => data.name,
    },
    persona: {
      groupType: "personas",
      label: "User",
      render: () => renderPersonasView(),
      getNames: (data) =>
        data.multiSelect && data.selectedIds
          ? data.selectedIds
          : [data.avatarId || data.name],
      firstName: (data) => data.name,
    },
    char: {
      groupType: "chars",
      label: "角色",
      render: () => {
        renderLeftTree();
        renderRightPane();
      },
      moveItems: (data, target) => {
        const avatars =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.avatar];
        avatars.forEach((avatar) =>
          handleCharDropToFolder(avatar, target.folderId),
        );
        return avatars;
      },
      firstName: (data) => data.name,
    },
    "regex-script": {
      groupType: "regex",
      label: "脚本",
      render: () => renderRegexView(),
      moveItems: (data, target) => {
        const scriptIds =
          data.multiSelect && data.selectedIds
            ? data.selectedIds
            : [data.scriptId || data.id].filter(Boolean);
        if (!scriptIds.length) return [];
        const extensionSettings = getExtensionSettings();
        const extensionName = getExtensionName();
        const regexGlobalGroups =
          extensionSettings[extensionName].regexGlobalGroups || {};
        if (target.targetKind === "ungrouped") {
          scriptIds.forEach((sid) => {
            delete regexGlobalGroups[sid];
          });
        } else {
          scriptIds.forEach((sid) => {
            regexGlobalGroups[sid] = target.folderId;
          });
        }
        extensionSettings[extensionName].regexGlobalGroups = regexGlobalGroups;
        if (data.multiSelect) clearMultiSelect();
        getContext().saveSettingsDebounced();
        return scriptIds;
      },
      firstName: (data) =>
        data.scriptName ||
        (getGlobalScripts() || []).find(
          (sc) => sc.id === (data.scriptId || data.id),
        )?.scriptName ||
        data.scriptId ||
        data.id,
    },
    folder: {
      groupType: "chars",
      label: "文件夹",
      render: () => {
        renderLeftTree();
        renderRightPane();
      },
      moveItems: (data, target) => {
        if (!data.id) return [];
        if (target.targetKind === "ungrouped") {
          reorderFolder(data.id, null, null);
        } else if (target.zone === "into") {
          if (
            data.id === target.folderId ||
            wouldCreateCycle(data.id, target.folderId)
          ) {
            return [];
          }
          reorderFolder(data.id, target.folderId, null);
        } else {
          const targetParentId =
            getConfig().folders[target.folderId]?.parentId || null;
          if (wouldCreateCycle(data.id, targetParentId)) return [];
          if (target.zone === "before") {
            reorderFolder(data.id, targetParentId, target.folderId);
          } else {
            const siblings = sortFolders(getChildFolders(targetParentId));
            const curIdx = siblings.indexOf(target.folderId);
            const nextSiblingId =
              curIdx >= 0 && curIdx < siblings.length - 1
                ? siblings[curIdx + 1]
                : null;
            reorderFolder(data.id, targetParentId, nextSiblingId);
          }
        }
        return [data.id];
      },
      firstName: (data) => getTagName(data.id),
    },
    "regex-folder": {
      groupType: "regex",
      label: "文件夹",
      render: () => renderRegexView(),
      moveItems: (data, target) => moveRegexFolder(data, target),
      firstName: (data) => data.name,
    },
    "res-folder": {
      groupType: "res-folder",
      label: "文件夹",
      render: () => {
        const resType = getPcDragData()?.resType;
        if (resType === "presets") renderPresetsView();
        else if (resType === "themes") renderThemesView();
        else if (resType === "backgrounds") renderBackgroundsView();
        else if (resType === "worldinfo") renderWorldInfoView();
        else if (resType === "quickreply") renderQRView();
        else if (resType === "personas") renderPersonasView();
      },
      moveItems: (data, target) => {
        if (!data.id || !data.resType) return [];
        const resType = data.resType;
        if (target.groupType !== resType) return [];
        if (target.targetKind === "ungrouped") {
          reorderResFolder(resType, data.id, null, null);
        } else if (target.zone === "into") {
          if (
            data.id === target.folderId ||
            wouldCreateResCycle(resType, data.id, target.folderId)
          ) {
            return [];
          }
          reorderResFolder(resType, data.id, target.folderId, null);
        } else {
          const tree = getResFolderTree(resType);
          const targetParentId = tree[target.folderId]?.parentId || null;
          if (wouldCreateResCycle(resType, data.id, targetParentId))
            return [];
          if (target.zone === "before") {
            reorderResFolder(
              resType,
              data.id,
              targetParentId,
              target.folderId,
            );
          } else {
            const siblings = sortResFolders(
              resType,
              getResChildFolders(resType, targetParentId),
            );
            const curIdx = siblings.indexOf(target.folderId);
            const nextSiblingId =
              curIdx >= 0 && curIdx < siblings.length - 1
                ? siblings[curIdx + 1]
                : null;
            reorderResFolder(resType, data.id, targetParentId, nextSiblingId);
          }
        }
        return [data.id];
      },
      firstName: (data) => getResFolderDisplayName(data.resType, data.id),
    },
  };
  const fallbackMeta = fallbackTypeMap[dragData?.type];
  debugLog("pcDragEnd:fallbackMeta", {
    dragType: dragData?.type ?? null,
    dragResType: dragData?.resType ?? null,
    fallbackMetaGroupType: fallbackMeta?.groupType ?? null,
    fallbackTarget,
  });
  if (!getPcDropHandled() && fallbackMeta) {
    const isFallbackTargetMatch =
      dragData?.type === "res-folder"
        ? fallbackTarget?.groupType === dragData?.resType
        : fallbackTarget?.groupType === fallbackMeta.groupType;
    let itemIds = null;
    let successMessage = "";
    if (isFallbackTargetMatch && fallbackTarget?.targetKind === "ungrouped") {
      itemIds = fallbackMeta.moveItems
        ? fallbackMeta.moveItems(dragData, fallbackTarget)
        : (() => {
            const ids = fallbackMeta.getNames(dragData);
            ids.forEach((itemId) =>
              setItemGroup(fallbackMeta.groupType, itemId, null),
            );
            return ids;
          })();
      if (dragData.multiSelect) clearMultiSelect();
      debugLog("pcDragEnd:fallbackMoveToUngrouped", {
        dragData,
        fallbackTarget,
        itemIds,
      });
      fallbackMeta.render();
      successMessage =
        itemIds.length > 1
          ? `已将 ${itemIds.length} 个${fallbackMeta.label}移出文件夹`
          : `已将「${fallbackMeta.firstName(dragData)}」移出文件夹`;
    } else if (
      isFallbackTargetMatch &&
      fallbackTarget?.folderId &&
      (fallbackTarget?.zone === "into" ||
        fallbackMeta.label === "文件夹" ||
        fallbackTarget?.targetKind === "folder")
    ) {
      itemIds = fallbackMeta.moveItems
        ? fallbackMeta.moveItems(dragData, fallbackTarget)
        : (() => {
            const ids = fallbackMeta.getNames(dragData);
            ids.forEach((itemId) =>
              setItemGroup(
                fallbackMeta.groupType,
                itemId,
                fallbackTarget.folderId,
              ),
            );
            return ids;
          })();
      if (itemIds.length) {
        if (dragData.multiSelect) clearMultiSelect();
        debugLog("pcDragEnd:fallbackMoveToResourceFolder", {
          dragData,
          fallbackTarget,
          itemIds,
        });
        fallbackMeta.render();
        debugLog("pcDragEnd:fallbackRenderDone", {
          dragData,
          fallbackTarget,
          currentResourceType: getCurrentResourceType(),
          targetResType: dragData?.resType ?? fallbackMeta.groupType ?? null,
        });
        const regexFolderTree =
          getExtensionSettings()[getExtensionName()].regexFolderTree || {};
        const targetName =
          fallbackMeta.groupType === "chars"
            ? getTagName(fallbackTarget.folderId)
            : fallbackMeta.groupType === "regex"
              ? regexFolderTree[fallbackTarget.folderId]?.displayName ||
                fallbackTarget.folderId
              : dragData?.type === "res-folder"
                ? getResFolderDisplayName(
                    dragData.resType,
                    fallbackTarget.folderId,
                  )
                : getResFolderDisplayName(
                    fallbackMeta.groupType,
                    fallbackTarget.folderId,
                  );
        const isFolderReorder =
          (dragData?.type === "folder" ||
            dragData?.type === "res-folder" ||
            dragData?.type === "regex-folder") &&
          fallbackTarget?.zone !== "into";
        successMessage = isFolderReorder
          ? itemIds.length > 1
            ? `已将 ${itemIds.length} 个${fallbackMeta.label}重新排序`
            : `已将「${fallbackMeta.firstName(dragData)}」重新排序`
          : itemIds.length > 1
            ? `已将 ${itemIds.length} 个${fallbackMeta.label}移入「${targetName}」`
            : `已将「${fallbackMeta.firstName(dragData)}」移入「${targetName}」`;
      }
    }
    if (successMessage) {
      cfmToastr.success(successMessage);
    }
  }
  setPcDropHandled(false);
  setPcLastResourceFolderHoverTarget(null);
  // 拖拽结束：清理 ST body.dragover 残留（方案A），保留 drop_target 以免影响 ST 自身拖文件导入。
  const bodyEl = jq(document.body);
  if (bodyEl?.length) bodyEl.removeClass("dragover");
  // 某些 Chromium 分支（如 QQ 浏览器）可能在目标 drop 处理前先触发 dragend，
  // 这里延迟清空，给 drop 处理留出一个短暂回退窗口。
  setTimeout(() => {
    if (getPcDragData() === dragData) {
      setPcDragData(null);
    }
  }, 120);
  // 清除所有右栏拖放高亮
  jq(".cfm-right-list-drop-target").removeClass("cfm-right-list-drop-target");
  const highlightSelector = buildDraggedHighlightSelector(dragData);
  if (highlightSelector) {
    flashDraggedElement(highlightSelector);
  }
}
