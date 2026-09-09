// Backup Bridge 同步状态层：承接外部备份桥同步进度遮罩、HTTP 轮询、文件夹分配回写与全局桥接信号发布。

export function createBackupBridgeSyncController(deps = {}) {
  const syncStateUrl = deps.syncStateUrl || "http://127.0.0.1:36925";
  const pollIntervalMs = Number.isFinite(deps.pollIntervalMs)
    ? deps.pollIntervalMs
    : 800;

  let syncOverlayEl = null;
  let syncPollTimer = null;
  let syncLastState = "idle";
  let syncInProgress = false;
  const syncAssignedKeys = new Set();

  function createAbortSignal(timeoutMs = 2000) {
    const AbortSignalRef =
      deps.AbortSignal || deps.window?.AbortSignal || globalThis.AbortSignal;
    if (typeof AbortSignalRef?.timeout === "function") {
      return AbortSignalRef.timeout(timeoutMs);
    }
    return undefined;
  }

  function showSyncOverlay(message, current, total) {
    const documentRef = deps.document || globalThis.document;
    if (!documentRef?.body) return;

    if (!syncOverlayEl) {
      syncOverlayEl = documentRef.createElement("div");
      syncOverlayEl.className = "cfm-sync-progress-overlay";
      syncOverlayEl.innerHTML = `
        <div class="cfm-sync-progress-box">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span class="cfm-sync-progress-text"></span>
          <span class="cfm-sync-progress-counter"></span>
        </div>
      `;
      documentRef.body.appendChild(syncOverlayEl);
    }

    const textEl = syncOverlayEl.querySelector(".cfm-sync-progress-text");
    const counterEl = syncOverlayEl.querySelector(".cfm-sync-progress-counter");
    if (textEl) textEl.textContent = message || "正在同步...";
    if (counterEl) {
      counterEl.textContent =
        typeof current === "number" && typeof total === "number"
          ? `${current} / ${total}`
          : "";
    }
    syncOverlayEl.style.display = "flex";
  }

  function removeSyncOverlay() {
    if (syncOverlayEl) {
      syncOverlayEl.style.display = "none";
    }
  }

  async function applyFolderAssignments(assignments) {
    if (!Array.isArray(assignments) || assignments.length === 0) return;

    const typeMapping = {
      presets: "presets",
      worldinfo: "worldinfo",
      themes: "themes",
      backgrounds: "backgrounds",
      personas: "personas",
      qr: "quickreply",
    };

    let applied = 0;
    let skipped = 0;
    console.log(
      `[CFM] applyFolderAssignments: 收到 ${assignments.length} 条分配请求`,
    );

    const hasCharsAssignment = assignments.some(
      (assignment) => String(assignment.resourceType || "").trim() === "chars",
    );
    if (hasCharsAssignment) {
      try {
        if (typeof deps.getContext?.().getCharacters === "function") {
          await deps.getContext().getCharacters();
          console.log("[CFM] 已刷新角色列表缓存（为角色卡文件夹分配准备）");
        }
      } catch (error) {
        console.warn("[CFM] 刷新角色列表失败:", error);
      }
    }

    for (const assignment of assignments) {
      try {
        const resourceType = String(assignment.resourceType || "").trim();
        const displayName = String(assignment.displayName || "").trim();
        const folderName = String(assignment.folderName || "").trim();
        if (!resourceType || !displayName || !folderName) {
          console.warn(
            `[CFM] 跳过无效分配: resourceType=${resourceType}, displayName=${displayName}, folderName=${folderName}`,
          );
          skipped++;
          continue;
        }

        if (folderName === "未归类") {
          console.log(
            `[CFM] 跳过 "未归类" 分配: ${resourceType}/${displayName}`,
          );
          skipped++;
          continue;
        }

        if (resourceType === "chars") {
          const requestedAvatar = displayName;
          const characters = deps.getCharacters();

          if (characters.length === 0) {
            console.warn(
              "[CFM] getCharacters() 返回空列表！角色卡可能尚未完成导入或缓存未刷新",
            );
          } else {
            console.log(
              `[CFM] 当前角色列表(${characters.length}个): 前5个avatar=[${characters
                .slice(0, 5)
                .map((character) => character.avatar)
                .join(", ")}]`,
            );
          }

          let matchedAvatar = null;
          if (
            characters.some((character) => character.avatar === requestedAvatar)
          ) {
            matchedAvatar = requestedAvatar;
          }

          if (!matchedAvatar) {
            const stripTrailingDigits = (avatarStr) => {
              const dotIdx = avatarStr.lastIndexOf(".");
              if (dotIdx <= 0) return { base: avatarStr, ext: "" };
              const namePart = avatarStr.slice(0, dotIdx);
              const extPart = avatarStr.slice(dotIdx);
              const base = namePart.replace(/\d+$/, "");
              return { base: base || namePart, ext: extPart };
            };

            const requested = stripTrailingDigits(requestedAvatar);
            const fuzzyMatch = characters.find((character) => {
              if (!character.avatar) return false;
              const candidate = stripTrailingDigits(character.avatar);
              return (
                candidate.base === requested.base &&
                candidate.ext.toLowerCase() === requested.ext.toLowerCase()
              );
            });
            if (fuzzyMatch) {
              matchedAvatar = fuzzyMatch.avatar;
              console.log(
                `[CFM] 角色卡 avatar 模糊匹配: 请求="${requestedAvatar}" → 实际="${matchedAvatar}"`,
              );
            }
          }

          if (!matchedAvatar) {
            console.warn(
              `[CFM] 角色卡不存在（avatar=${requestedAvatar}，模糊匹配也失败），跳过文件夹分配`,
            );
            skipped++;
            continue;
          }

          const { tag } = deps.findOrCreateTag(folderName, null);
          if (!tag || !tag.id) {
            console.warn(`[CFM] 无法创建角色卡文件夹 tag: ${folderName}`);
            skipped++;
            continue;
          }

          if (!deps.config.folders[tag.id]) {
            deps.config.folders[tag.id] = {
              parentId: null,
              sortOrder: Object.keys(deps.config.folders).length + 1,
            };
            const excludedTagIds =
              deps.extensionSettings?.[deps.extensionName]?.excludedTagIds;
            if (Array.isArray(excludedTagIds)) {
              const excludedIndex = excludedTagIds.indexOf(tag.id);
              if (excludedIndex >= 0) excludedTagIds.splice(excludedIndex, 1);
            }
            deps.saveConfig(deps.config);
            console.log(
              `[CFM] 创建角色卡文件夹: tagId=${tag.id}, name=${folderName}`,
            );
          }
          deps.moveCharToFolder(matchedAvatar, tag.id);
          syncAssignedKeys.add(`chars/${matchedAvatar}`);
          console.log(
            `[CFM] 角色卡分配成功: avatar=${matchedAvatar} → ${folderName} (tagId=${tag.id})`,
          );
          applied++;
          continue;
        }

        const groupType = typeMapping[resourceType];
        if (!groupType) {
          console.warn(
            `[CFM] 未知资源类型 "${resourceType}"，无法映射到 groupType`,
          );
          skipped++;
          continue;
        }

        const folderTree = deps.getResFolderTree(groupType);
        if (!folderTree) {
          console.warn(`[CFM] getResFolderTree("${groupType}") 返回空`);
          skipped++;
          continue;
        }

        if (!folderTree[folderName]) {
          folderTree[folderName] = {
            parentId: null,
            sortOrder: Object.keys(folderTree).length + 1,
          };
          deps.saveResTree(groupType);
          console.log(
            `[CFM] 创建新文件夹: groupType=${groupType}, folderName=${folderName}`,
          );
        }

        deps.setItemGroup(groupType, displayName, folderName);
        syncAssignedKeys.add(`${groupType}/${displayName}`);
        console.log(
          `[CFM] 分配成功: ${resourceType}/${displayName} → ${folderName} (groupType=${groupType})`,
        );
        applied++;
      } catch (error) {
        console.warn("[CFM] 文件夹分配失败:", error);
      }
    }

    if (applied > 0) {
      try {
        await deps.flushFolderAssignmentSettings();
        console.log("[CFM] 文件夹分配已持久化");
      } catch (error) {
        console.warn("[CFM] 文件夹分配持久化失败:", error);
      }

      try {
        const requestOptions = {
          method: "POST",
          cache: "no-store",
        };
        const signal = createAbortSignal(2000);
        if (signal) requestOptions.signal = signal;
        deps
          .fetch(`${syncStateUrl}/folder-assignments`, requestOptions)
          .catch(() => {});
      } catch {
        // 确认消费失败不影响
      }
      console.log(`[CFM] 已应用 ${applied} 条文件夹分配，跳过 ${skipped} 条`);
    } else {
      console.log(`[CFM] 没有成功分配任何文件夹，跳过 ${skipped} 条`);
    }
  }

  async function pollSyncState() {
    try {
      const requestOptions = {
        method: "GET",
        cache: "no-store",
      };
      const signal = createAbortSignal(2000);
      if (signal) requestOptions.signal = signal;
      const response = await deps.fetch(syncStateUrl, requestOptions);
      if (!response.ok) return;
      const data = await response.json();
      if (!data || typeof data !== "object") return;

      if (data.state === "syncing") {
        if (syncLastState !== "syncing") {
          syncAssignedKeys.clear();
        }
        syncLastState = "syncing";
        syncInProgress = true;
        showSyncOverlay(data.message, data.current, data.total);
      } else if (syncLastState === "syncing" && data.state === "idle") {
        syncLastState = "idle";
        syncInProgress = false;
        removeSyncOverlay();

        deps.setTimeout(async () => {
          console.log(
            `[CFM] 同步结束，延迟刷新所有资源缓存及视图（保护的 key: ${syncAssignedKeys.size} 个，将保留到下次同步）`,
          );
          try {
            try {
              const bgModule = await import("../../../../backgrounds.js");
              if (typeof bgModule.getBackgrounds === "function") {
                await bgModule.getBackgrounds();
                console.log("[CFM] 同步后刷新背景缓存完成");
              }
            } catch (error) {
              console.warn("[CFM] 同步后刷新背景缓存失败:", error);
            }

            try {
              if (typeof deps.refreshThemeRuntimeAfterImport === "function") {
                await deps.refreshThemeRuntimeAfterImport(true);
                console.log("[CFM] 同步后刷新主题缓存完成");
              }
            } catch (error) {
              console.warn("[CFM] 同步后刷新主题缓存失败:", error);
            }

            try {
              const pm = deps.getContext().getPresetManager();
              if (pm) {
                await deps.refreshPresetManagerList(pm);
                console.log("[CFM] 同步后刷新预设缓存完成");
              }
            } catch (error) {
              console.warn("[CFM] 同步后刷新预设缓存失败:", error);
            }

            try {
              await deps.getContext().getCharacters();
              console.log("[CFM] 同步后刷新角色卡缓存完成");
            } catch (error) {
              console.warn("[CFM] 同步后刷新角色卡缓存失败:", error);
            }

            try {
              if (typeof deps.getContext().updateWorldInfoList === "function") {
                await deps.getContext().updateWorldInfoList();
                console.log("[CFM] 同步后刷新世界书缓存完成");
              }
            } catch (error) {
              console.warn("[CFM] 同步后刷新世界书缓存失败:", error);
            }

            try {
              if (typeof deps.getUserAvatarsFunc === "function") {
                await deps.getUserAvatarsFunc(true);
                console.log("[CFM] 同步后刷新 Personas 缓存完成");
              }
            } catch (error) {
              console.warn("[CFM] 同步后刷新 Personas 缓存失败:", error);
            }

            if (typeof deps.renderPresetsView === "function")
              deps.renderPresetsView();
            if (typeof deps.renderWorldInfoView === "function")
              deps.renderWorldInfoView();
            if (typeof deps.renderThemesView === "function")
              deps.renderThemesView();
            if (typeof deps.renderBackgroundsView === "function")
              deps.renderBackgroundsView();
            if (typeof deps.renderPersonasView === "function")
              deps.renderPersonasView();

            console.log("[CFM] 同步后资源缓存及视图刷新全部完成");
          } catch (error) {
            console.warn("[CFM] 同步后刷新视图失败:", error);
          }
        }, 3000);
      }

      if (
        Array.isArray(data.folderAssignments) &&
        data.folderAssignments.length > 0
      ) {
        await applyFolderAssignments(data.folderAssignments);
      }
    } catch {
      // 轮询失败静默忽略（Electron 未启动时不影响）
    }
  }

  function startSyncStatePoll() {
    if (syncPollTimer) return;
    syncPollTimer = deps.setInterval(pollSyncState, pollIntervalMs);
  }

  function stopSyncStatePoll() {
    if (syncPollTimer) {
      deps.clearInterval(syncPollTimer);
      syncPollTimer = null;
    }
  }

  function setSyncState(payload) {
    const data =
      payload && typeof payload === "object" ? payload : { state: "idle" };
    if (data.state === "syncing") {
      syncLastState = "syncing";
      syncInProgress = true;
      showSyncOverlay(data.message, data.current, data.total);
    } else {
      syncLastState = "idle";
      syncInProgress = false;
      removeSyncOverlay();
    }
    return { ok: true, state: data.state };
  }

  function publishBackupBridgeSignal(status = "ready", extra = {}) {
    try {
      const windowRef = deps.window || globalThis.window;
      const documentRef = deps.document || globalThis.document;
      const signal = {
        source: "cfm-backup-bridge",
        extensionName: deps.extensionName,
        status,
        protocolVersion: deps.backupBridgeProtocolVersion,
        bridgeVersion: deps.backupBridgeVersion,
        detailsAvailable: true,
        timestamp: Date.now(),
        ...extra,
      };
      windowRef.__CFM_BACKUP_BRIDGE__ = signal;
      windowRef.__CFM_PUBLISH_BACKUP_BRIDGE__ = publishBackupBridgeSignal;
      windowRef.__CFM_BACKUP_BRIDGE_GET_DETAILS__ = deps.getBackupBridgeDetails;
      windowRef.__CFM_BACKUP_BRIDGE_LIST_RESOURCES__ =
        deps.listBackupBridgeResources;
      windowRef.__CFM_BACKUP_BRIDGE_READ_RESOURCE__ =
        deps.readBackupBridgeResource;
      windowRef.__CFM_BACKUP_BRIDGE_WRITE_RESOURCE__ =
        deps.writeBackupBridgeResource;
      windowRef.__CFM_BACKUP_BRIDGE_SET_SYNC_STATE__ = setSyncState;
      documentRef.documentElement?.setAttribute?.(
        "data-cfm-backup-bridge",
        status,
      );
      documentRef.documentElement?.setAttribute?.(
        "data-cfm-backup-bridge-extension",
        deps.extensionName,
      );
      documentRef.documentElement?.setAttribute?.(
        "data-cfm-backup-bridge-protocol",
        String(deps.backupBridgeProtocolVersion),
      );
      documentRef.documentElement?.setAttribute?.(
        "data-cfm-backup-bridge-details",
        "available",
      );
      const CustomEventCtor =
        deps.CustomEvent || windowRef.CustomEvent || globalThis.CustomEvent;
      windowRef.dispatchEvent(
        new CustomEventCtor("cfm-backup-bridge", {
          detail: signal,
        }),
      );
      return signal;
    } catch (error) {
      console.warn("[CFM] 发布备份桥接信号失败:", error);
      return null;
    }
  }

  return {
    applyFolderAssignments,
    getSyncAssignedKeys: () => syncAssignedKeys,
    isSyncInProgress: () => syncInProgress,
    pollSyncState,
    publishBackupBridgeSignal,
    removeSyncOverlay,
    setSyncState,
    showSyncOverlay,
    startSyncStatePoll,
    stopSyncStatePoll,
  };
}
