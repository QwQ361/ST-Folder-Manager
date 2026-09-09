// 文件夹删除功能文件：用于处理单个或批量删除文件夹、级联选择子节点、删除后的子文件夹提升策略，以及仅移除分类或同步删除标签等相关逻辑。

export function removeResFolderCore(type, folderId, deps) {
  const tree = deps.getResFolderTree(type);
  const parentId = tree[folderId]?.parentId || null;

  for (const childId of deps.getResChildFolders(type, folderId)) {
    tree[childId].parentId = parentId;
  }

  const groups = deps.getResourceGroups(type);
  for (const key of Object.keys(groups)) {
    if (groups[key] === folderId) delete groups[key];
  }

  delete tree[folderId];
  deps.saveResTree(type);
}

export function getResourceDeleteTypeLabelCore(resourceType) {
  return resourceType === "chars"
    ? "角色卡"
    : resourceType === "chatlogs"
      ? "聊天记录"
      : resourceType === "presets"
        ? "预设"
        : resourceType === "themes"
          ? "主题"
          : resourceType === "backgrounds"
            ? "背景"
            : resourceType === "personas"
              ? "User"
              : resourceType === "regex"
                ? "正则脚本"
                : resourceType === "quickreply"
                  ? "快速回复集"
                  : "世界书";
}

export async function executeResourceDeleteCore(deps) {
  if (deps.getResDeleteSelectedSize() === 0) {
    deps.toastr.warning("请先选择要删除的资源");
    return;
  }

  const selected = deps.getResDeleteSelectedItems();
  const count = selected.length;
  const typeLabel = getResourceDeleteTypeLabelCore(deps.currentResourceType);

  const confirmed = deps.confirm(
    `确定要删除 ${count} 个${typeLabel}吗？\n此操作不可撤销！`,
  );
  if (!confirmed) return;

  const headers = deps.getRequestHeaders();
  let success = 0;
  let fail = 0;

  const batchProgress = deps.showBatchProgressOverlay(
    `正在删除${typeLabel}`,
    count,
  );
  let processed = 0;

  try {
    if (deps.currentResourceType === "chars") {
      const ctx = deps.getContext();
      const evtSource = ctx.eventSource;
      const evtTypes = ctx.eventTypes;
      const allChars = ctx.characters;
      for (const avatar of selected) {
        try {
          const character = allChars.find((c) => c.avatar === avatar);
          const chid = character ? allChars.indexOf(character) : -1;
          const resp = await deps.fetch("/api/characters/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ avatar_url: avatar, delete_chats: false }),
            cache: "no-cache",
          });
          if (resp.ok) {
            const tagMap = deps.getTagMap();
            if (tagMap[avatar]) delete tagMap[avatar];
            const favSet = deps.extensionSettings[deps.extensionName].favorites;
            if (favSet && favSet instanceof Set) favSet.delete(avatar);
            else if (Array.isArray(favSet)) {
              const idx = favSet.indexOf(avatar);
              if (idx !== -1) favSet.splice(idx, 1);
            }
            if (evtSource && evtTypes && character) {
              try {
                await evtSource.emit(evtTypes.CHARACTER_DELETED, {
                  id: chid,
                  character: character,
                });
              } catch (evtErr) {
                deps.warn(`[CFM] 触发 CHARACTER_DELETED 事件失败`, evtErr);
              }
            }
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除角色卡 ${avatar} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
      await deps.getContext().getCharacters();
    } else if (deps.currentResourceType === "presets") {
      const pm = deps.getContext().getPresetManager();
      if (!pm) throw new Error("预设管理器不可用");
      for (const name of selected) {
        try {
          const ok = await pm.deletePreset(name);
          if (ok !== false) {
            const groups =
              deps.extensionSettings[deps.extensionName].presetGroups;
            if (groups && groups[name]) delete groups[name];
            if (
              deps.extensionSettings[deps.extensionName].presetNotes?.[name] !==
              undefined
            )
              delete deps.extensionSettings[deps.extensionName].presetNotes[
                name
              ];
            deps.removePresetFromCustomOrder(name);
            deps.cfmPresetDetailExpandedNames.delete(name);
            deps.cfmPresetRegexExpandedNames.delete(name);
            if (
              deps.getPresetDetachedOptions() &&
              deps.getPresetDetachedOptions().length > 0
            ) {
              deps.setPresetDetachedOptions(
                deps
                  .getPresetDetachedOptions()
                  .filter((opt) => deps.$(opt).text() !== name),
              );
            }
            success++;
          } else fail++;
        } catch (e) {
          deps.warn(`[CFM] 删除预设 ${name} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
    } else if (deps.currentResourceType === "themes") {
      for (const name of selected) {
        try {
          const resp = await deps.fetch("/api/themes/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: name }),
          });
          if (resp.ok) {
            const groups =
              deps.extensionSettings[deps.extensionName].themeGroups;
            if (groups && groups[name]) delete groups[name];
            if (deps.extensionSettings[deps.extensionName].themeNotes?.[name])
              delete deps.extensionSettings[deps.extensionName].themeNotes[
                name
              ];
            if (
              deps.extensionSettings[deps.extensionName]
                .themeBackgroundBindings?.[name]
            )
              delete deps.extensionSettings[deps.extensionName]
                .themeBackgroundBindings[name];
            deps
              .$("#themes option")
              .filter(function () {
                return deps.$(this).val() === name;
              })
              .remove();
            if (
              deps.getThemeDetachedOptions() &&
              deps.getThemeDetachedOptions().length > 0
            ) {
              deps.setThemeDetachedOptions(
                deps
                  .getThemeDetachedOptions()
                  .filter((opt) => deps.$(opt).val() !== name),
              );
            }
            if (deps.themes && Array.isArray(deps.themes)) {
              const idx = deps.themes.findIndex(
                (t) => (typeof t === "object" ? t.name : t) === name,
              );
              if (idx !== -1) deps.themes.splice(idx, 1);
            }
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除主题 ${name} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
    } else if (deps.currentResourceType === "backgrounds") {
      for (const name of selected) {
        try {
          const resp = await deps.fetch("/api/backgrounds/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ bg: name }),
          });
          if (resp.ok) {
            const groups = deps.extensionSettings[deps.extensionName].bgGroups;
            if (groups && groups[name]) delete groups[name];
            const notes = deps.extensionSettings[deps.extensionName].bgNotes;
            if (notes && notes[name]) delete notes[name];
            const orients =
              deps.extensionSettings[deps.extensionName].bgOrientations;
            if (orients && orients[name]) delete orients[name];
            const bindings =
              deps.extensionSettings[deps.extensionName]
                .themeBackgroundBindings;
            if (bindings) {
              for (const [theme, bg] of Object.entries(bindings)) {
                if (bg === name) delete bindings[theme];
              }
            }
            if (
              deps.extensionSettings[deps.extensionName].defaultBackground ===
              name
            ) {
              deps.extensionSettings[deps.extensionName].defaultBackground = "";
            }
            deps
              .$("#bg_menu_content .bg_example")
              .filter(function () {
                return deps.$(this).attr("bgfile") === name;
              })
              .remove();
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除背景 ${name} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
    } else if (deps.currentResourceType === "personas") {
      for (const avatarId of selected) {
        try {
          const resp = await deps.fetch("/api/avatars/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ avatar: avatarId }),
          });
          if (resp.ok) {
            const pu = deps.getContext().powerUserSettings;
            if (pu) {
              if (pu.personas && pu.personas[avatarId])
                delete pu.personas[avatarId];
              if (pu.persona_descriptions && pu.persona_descriptions[avatarId])
                delete pu.persona_descriptions[avatarId];
            }
            const groups =
              deps.extensionSettings[deps.extensionName].personaGroups;
            if (groups && groups[avatarId]) delete groups[avatarId];
            const chatBindings =
              deps.extensionSettings[deps.extensionName].personaChatBindings;
            if (chatBindings && chatBindings[avatarId])
              delete chatBindings[avatarId];
            deps.removePersonaFromCustomOrder(avatarId);
            const notes =
              deps.extensionSettings[deps.extensionName].personaNotes;
            if (notes && notes[avatarId]) delete notes[avatarId];
            const favs =
              deps.extensionSettings[deps.extensionName].personaFavorites;
            if (favs && Array.isArray(favs)) {
              const idx = favs.indexOf(avatarId);
              if (idx !== -1) favs.splice(idx, 1);
            }
            deps
              .$(".avatar-container")
              .filter(function () {
                return deps.$(this).attr("data-avatar-id") === avatarId;
              })
              .remove();
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除User ${avatarId} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
    } else if (deps.currentResourceType === "regex") {
      const regexArr = deps.extensionSettings.regex;
      if (Array.isArray(regexArr)) {
        for (const scriptId of selected) {
          const idx = regexArr.findIndex((s) => s.id === scriptId);
          if (idx !== -1) {
            regexArr.splice(idx, 1);
            const globalGroups =
              deps.extensionSettings[deps.extensionName].regexGlobalGroups;
            if (globalGroups && globalGroups[scriptId])
              delete globalGroups[scriptId];
            const favs =
              deps.extensionSettings[deps.extensionName].regexFavorites;
            if (Array.isArray(favs)) {
              const fi = favs.indexOf(scriptId);
              if (fi !== -1) favs.splice(fi, 1);
            }
            success++;
          } else {
            fail++;
          }
          processed++;
          batchProgress.update(processed);
        }
        deps.saveSettingsDebounced();
      }
    } else if (deps.currentResourceType === "quickreply") {
      for (const name of selected) {
        try {
          const api =
            typeof globalThis !== "undefined" && globalThis.quickReplyApi;
          const QRS =
            typeof globalThis !== "undefined" && globalThis.QuickReplySet;
          let deleted = false;
          if (api && typeof api.deleteSet === "function") {
            await api.deleteSet(name);
            deleted = true;
          }
          if (!deleted && QRS && QRS.list) {
            const set = QRS.list.find((s) => s.name === name);
            if (set && typeof set.delete === "function") {
              await set.delete();
              deleted = true;
            }
          }
          if (!deleted) {
            const resp = await deps.fetch("/api/quick-replies/delete", {
              method: "POST",
              headers: headers,
              body: JSON.stringify({ name: name }),
            });
            if (resp.ok) deleted = true;
          }
          if (deleted) {
            const groups = deps.extensionSettings[deps.extensionName].qrGroups;
            if (groups && groups[name]) delete groups[name];
            const notes = deps.extensionSettings[deps.extensionName].qrNotes;
            if (notes && notes[name]) delete notes[name];
            const favs = deps.extensionSettings[deps.extensionName].qrFavorites;
            if (Array.isArray(favs)) {
              const fi = favs.indexOf(name);
              if (fi !== -1) favs.splice(fi, 1);
            }
            const qrPresets = deps.getQrActivePresets
              ? deps.getQrActivePresets()
              : [];
            for (const qp of qrPresets) {
              if (Array.isArray(qp.sets)) {
                qp.sets = qp.sets.filter((setName) => setName !== name);
              }
            }
            const qrApplied =
              deps.extensionSettings[deps.extensionName]
                ._qrAppliedPresetIndices;
            if (Array.isArray(qrApplied)) {
              deps.extensionSettings[
                deps.extensionName
              ]._qrAppliedPresetIndices = qrApplied.filter(
                (idx) =>
                  qrPresets[idx] &&
                  Array.isArray(qrPresets[idx].sets) &&
                  qrPresets[idx].sets.length > 0,
              );
            }
            if (deps.qrItemExpandedSets) deps.qrItemExpandedSets.delete(name);
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除快速回复集 ${name} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
    } else if (deps.currentResourceType === "chatlogs") {
      const avatar = deps.getChatlogTargetAvatar();
      if (!avatar) {
        throw new Error("未找到目标角色，无法删除聊天记录");
      }
      const chatGroups = deps.getChatlogGroups(avatar);
      const ctxBeforeBatchDel = deps.getContext();
      const curChatIdBeforeBatchDel = ctxBeforeBatchDel.getCurrentChatId
        ? ctxBeforeBatchDel.getCurrentChatId()
        : null;
      const currentCharAvatarBeforeBatchDel = deps.getCurrentCharAvatar();
      let deletedCurrentChat = false;
      for (const fn of selected) {
        try {
          const fnBase = fn.replace(/\.jsonl$/i, "");
          const isCurrentChatFile =
            avatar === currentCharAvatarBeforeBatchDel &&
            fnBase === curChatIdBeforeBatchDel;
          const ok = await deps.deleteChatFile(avatar, fn);
          if (ok) {
            if (chatGroups && chatGroups[fn]) {
              delete chatGroups[fn];
            }
            if (isCurrentChatFile) deletedCurrentChat = true;
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除聊天记录 ${fn} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
      deps.saveSettingsDebounced();
      if (deletedCurrentChat && deps.doNewChatFunc) {
        try {
          await deps.doNewChatFunc();
          deps.toastr.info("已自动创建新聊天");
        } catch (err) {
          deps.warn("[CFM] 批量删除后自动创建新聊天失败:", err);
        }
      }
    } else {
      for (const name of selected) {
        try {
          const resp = await deps.fetch("/api/worldinfo/delete", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ name: name }),
          });
          if (resp.ok) {
            const groups =
              deps.extensionSettings[deps.extensionName].worldInfoGroups;
            if (groups && groups[name]) delete groups[name];
            const wiPresets = deps.getWiActivePresets
              ? deps.getWiActivePresets()
              : [];
            for (const wp of wiPresets) {
              if (Array.isArray(wp.books)) {
                wp.books = wp.books.filter((bookName) => bookName !== name);
              }
            }
            const wiApplied =
              deps.extensionSettings[deps.extensionName]
                ._wiAppliedPresetIndices;
            if (Array.isArray(wiApplied)) {
              deps.extensionSettings[
                deps.extensionName
              ]._wiAppliedPresetIndices = wiApplied.filter(
                (idx) =>
                  wiPresets[idx] &&
                  Array.isArray(wiPresets[idx].books) &&
                  wiPresets[idx].books.length > 0,
              );
            }
            deps
              .$("#world_editor_select option")
              .filter(function () {
                return deps.$(this).text() === name;
              })
              .remove();
            if (
              deps.getWorldInfoDetachedOptions() &&
              deps.getWorldInfoDetachedOptions().length > 0
            ) {
              deps.setWorldInfoDetachedOptions(
                deps
                  .getWorldInfoDetachedOptions()
                  .filter((opt) => deps.$(opt).text() !== name),
              );
            }
            success++;
          } else {
            fail++;
          }
        } catch (e) {
          deps.warn(`[CFM] 删除世界书 ${name} 失败`, e);
          fail++;
        }
        processed++;
        batchProgress.update(processed);
      }
      deps.clearWorldInfoNamesCache();
      await deps.getWorldInfoNames(true);
    }

    const delResultMsg = `已删除 ${success} 个${typeLabel}${fail > 0 ? `，${fail} 个失败` : ""}`;
    if (success > 0) {
      batchProgress.done(delResultMsg);
      deps.toastr.success(delResultMsg, "", {
        timeOut: 2500,
        extendedTimeOut: 800,
      });
      deps.saveSettingsDebounced();
    } else {
      batchProgress.remove();
      deps.toastr.error(`删除失败`);
    }
  } catch (err) {
    batchProgress.remove();
    deps.logDeleteError(err);
    deps.toastr.error("删除失败: " + err.message);
  }

  deps.exitResDeleteMode();
  deps.rerenderCurrentView();
}
