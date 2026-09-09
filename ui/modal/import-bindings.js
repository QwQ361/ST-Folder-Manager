// 导入文件事件绑定：承接 showMainPopup 拆分后的 9 种资源类型导入按钮 + 文件选择 change 事件。
// 覆盖资源：角色卡、预设、聊天记录、快速回复、User(persona)、正则、主题、背景、世界书。
//
// 统一行为模式：
//   1. 点击导入按钮 → 打开对应隐藏的 file input
//   2. change 事件：过滤有效文件 → 重名检测（弹重复对话框：跳过/重命名/覆盖/取消）
//      → 批量导入（进度条 overlay）→ 刷新对应视图 → 失败文件列表对话框
//
// 依赖注入：选中文件夹状态 getter、导入/刷新业务函数、对话框/进度条封装、写状态 setter、cfmToastr。

export function bindImportButtonEvents(popup, deps) {
  const {
    $,
    cfmToastr,
    // 通用
    showBatchProgressOverlay,
    showImportFailureDialog,
    showDuplicateImportDialog,
    getUniqueImportName,
    setItemGroup,
    getContext,
    getCharacters,
    moveCharToFolder,
    renderLeftTree,
    renderRightPane,
    getTagName,
    getThemeNames,
    normalizeImportedThemeData,
    rememberImportedThemeRuntime,
    refreshThemeRuntimeAfterImport,
    renderThemesView,
    getBackgroundNames,
    renderBackgroundsView,
    getCurrentPresets,
    renderPresetsView,
    getChatlogTargetAvatar,
    importChatFiles,
    invalidateChatCache,
    renderChatlogsView,
    renderQRView,
    importPersonas,
    importRegexScripts,
    getWorldInfoNames,
    flushFolderAssignmentSettings,
    renderWorldInfoView,
    applyWorldInfoFilter,
    applyGlobalWorldInfoFilter,
    // 选中文件夹状态 getter
    getSelectedTreeNode,
    getSelectedPresetFolder,
    getSelectedQrFolder,
    getSelectedPersonaFolder,
    getSelectedRegexNode,
    getSelectedThemeFolder,
    getSelectedBgFolder,
    getSelectedWorldInfoFolder,
    // 写状态 setter
    clearWorldInfoNamesCache,
    setWorldInfoDetachedOptions,
    setGlobalWIDetachedOptions,
    // 配置
    extensionSettings,
    extensionName,
  } = deps;

  // 选中文件夹辅助：选中普通文件夹则返回它，否则 null（未归类）
  const resolveTargetFolder = (selected, ungrouped) =>
    selected && selected !== ungrouped && selected !== "__favorites__"
      ? selected
      : null;

  /* ===== char 导入（源 L11912-L12066） ===== */
      popup.find("#cfm-import-char-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-char-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-char-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        // 如果选中了普通文件夹则放入该文件夹，否则放入未归类
        const targetFolder =
          getSelectedTreeNode() &&
          getSelectedTreeNode() !== "__uncategorized__" &&
          getSelectedTreeNode() !== "__favorites__"
            ? getSelectedTreeNode()
            : null;

        const totalFiles = files.length;
        let successCount = 0;
        let failCount = 0;
        const failedFiles = [];
        const importedAvatars = [];

        const batchProgress = showBatchProgressOverlay(
          "正在导入角色卡",
          totalFiles,
        );
        let processed = 0;

        for (const file of files) {
          const ext = file.name.match(/\.(\w+)$/);
          if (
            !ext ||
            !["json", "png", "yaml", "yml", "charx", "byaf"].includes(
              ext[1].toLowerCase(),
            )
          ) {
            cfmToastr.warning(`跳过不支持的文件: ${file.name}`);
            failCount++;
            processed++;
            batchProgress.update(processed);
            continue;
          }

          const format = ext[1].toLowerCase();
          const formData = new FormData();
          formData.append("avatar", file);
          formData.append("file_type", format);
          formData.append("user_name", getContext().name1 || "User");

          try {
            const result = await fetch("/api/characters/import", {
              method: "POST",
              body: formData,
              headers: getContext().getRequestHeaders({ omitContentType: true }),
              cache: "no-cache",
            });

            if (!result.ok) {
              throw new Error(`导入失败: ${result.statusText}`);
            }

            const data = await result.json();
            if (data.error) {
              throw new Error(data.error);
            }

            if (data.file_name !== undefined) {
              const avatarFileName = `${data.file_name}.png`;
              importedAvatars.push(avatarFileName);
              successCount++;
            }
          } catch (error) {
            console.error(`导入角色失败: ${file.name}`, error);
            failCount++;
            failedFiles.push(file.name);
          }
          processed++;
          batchProgress.update(processed);
        }

        // 刷新角色列表
        await getContext().getCharacters();

        // 将导入的角色分配到当前文件夹（如果有选中文件夹）
        if (targetFolder) {
          for (const avatar of importedAvatars) {
            moveCharToFolder(avatar, targetFolder);
          }
        }

        // 自动处理导入角色卡的内嵌世界书
        const charBookSetting =
          extensionSettings[extensionName].autoCharBookFolder;
        if (charBookSetting) {
          let embImported = 0;
          const characters = getCharacters();
          for (const avatar of importedAvatars) {
            const ch = characters.find((c) => c.avatar === avatar);
            if (!ch?.data?.character_book) continue;
            try {
              const bookName =
                ch.data.character_book.name || `${ch.name}'s Lorebook`;
              // 使用酒馆原生的 convertCharacterBook 将 V2 格式转换为 ST 内部格式
              const ctx = getContext();
              const convertedBook = ctx.convertCharacterBook(
                ch.data.character_book,
              );
              await ctx.saveWorldInfo(bookName, convertedBook, true);
              setItemGroup("worldinfo", bookName, charBookSetting);
              embImported++;
            } catch (err) {
              console.error("[CFM] 自动提取内嵌世界书失败:", avatar, err);
            }
          }
          if (embImported > 0) {
            clearWorldInfoNamesCache();
            // 使用酒馆原生的 updateWorldInfoList 刷新世界书列表和 DOM
            try {
              await getContext().updateWorldInfoList();
            } catch (syncErr) {
              console.warn("[CFM] 刷新世界书列表失败", syncErr);
            }
            cfmToastr.info(
              `自动提取了 ${embImported} 个内嵌世界书`,
              "角色世界书",
            );
          }
        }

        // 刷新视图
        renderLeftTree();
        renderRightPane();

        const folderHint = targetFolder
          ? `到「${getTagName(targetFolder)}」`
          : "（未归类）";
        const importMsg = `成功导入 ${successCount} 个角色卡${folderHint}${failCount > 0 ? `，${failCount} 个失败` : ""}`;
        if (successCount > 0) {
          batchProgress.done(importMsg);
          cfmToastr.success(importMsg);
        } else if (failCount > 0) {
          batchProgress.remove();
          cfmToastr.error(`导入失败，${failCount} 个文件无法导入`);
        } else {
          batchProgress.remove();
        }
        if (failedFiles.length > 0) {
          showImportFailureDialog(failedFiles, "角色卡");
        }

        e.target.value = null;
      });


  /* ===== preset 导入（源 L12069-L12210） ===== */
      popup.find("#cfm-import-preset-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-preset-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-preset-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedPresetFolder() &&
          getSelectedPresetFolder() !== "__ungrouped__" &&
          getSelectedPresetFolder() !== "__favorites__"
            ? getSelectedPresetFolder()
            : null;

        const pm = getContext().getPresetManager();
        if (!pm) {
          cfmToastr.error("无法获取预设管理器，请确认已选择API");
          return;
        }

        // 获取现有预设名称集合
        const existingPresets = new Set(getCurrentPresets().map((p) => p.name));

        // 预解析所有文件，提取名称用于重名检测
        const parsedFiles = [];
        for (const file of files) {
          if (!file.name.endsWith(".json")) continue;
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            const fileName = file.name
              .replace(".json", "")
              .replace(".settings", "");
            const name = data?.name ?? fileName;
            data["name"] = name;
            parsedFiles.push({ file, data, name });
          } catch (err) {
            console.error(`解析预设文件失败: ${file.name}`, err);
          }
        }

        if (parsedFiles.length === 0) {
          cfmToastr.warning("没有可导入的有效预设文件");
          e.target.value = null;
          return;
        }

        // 检测重名
        const duplicateNames = parsedFiles
          .filter((f) => existingPresets.has(f.name))
          .map((f) => f.name);
        let dupAction = null;
        if (duplicateNames.length > 0) {
          dupAction = await showDuplicateImportDialog(
            duplicateNames,
            parsedFiles.length,
            "预设",
          );
          if (dupAction === "cancel") {
            cfmToastr.info("已取消导入");
            e.target.value = null;
            return;
          }
        }

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        const failedFiles = [];

        const batchProgress = showBatchProgressOverlay(
          "正在导入预设",
          parsedFiles.length,
        );
        let processed = 0;

        for (const { file, data, name } of parsedFiles) {
          try {
            const isDuplicate = existingPresets.has(name);
            let finalName = name;

            if (isDuplicate) {
              if (dupAction === "skip") {
                skipCount++;
                processed++;
                batchProgress.update(processed);
                continue;
              } else if (dupAction === "rename") {
                finalName = getUniqueImportName(name, existingPresets);
                data["name"] = finalName;
              }
              // 'overwrite' 时直接用原名覆盖
            }

            await pm.savePreset(finalName, data);
            existingPresets.add(finalName);

            if (targetFolder) {
              setItemGroup("presets", finalName, targetFolder);
            }
            successCount++;
          } catch (error) {
            console.error(`导入预设失败: ${file.name}`, error);
            failCount++;
            failedFiles.push(file.name);
          }
          processed++;
          batchProgress.update(processed);
        }

        // 刷新视图
        renderPresetsView();

        const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
        const parts = [];
        if (successCount > 0)
          parts.push(`成功导入 ${successCount} 个预设${folderHint}`);
        if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
        if (failCount > 0) parts.push(`${failCount} 个失败`);
        const importPresetMsg = parts.join("，");
        if (successCount > 0) {
          batchProgress.done(importPresetMsg);
          cfmToastr.success(importPresetMsg);
        } else if (skipCount > 0 && failCount === 0) {
          batchProgress.done(importPresetMsg);
          cfmToastr.info(importPresetMsg);
        } else if (failCount > 0) {
          batchProgress.done(importPresetMsg);
          cfmToastr.error(importPresetMsg);
        } else {
          batchProgress.remove();
        }
        if (failedFiles.length > 0) {
          showImportFailureDialog(failedFiles, "预设");
        }

        e.target.value = null;
      });


  /* ===== chatlog 导入（源 L12297-L12317） ===== */
      popup.find("#cfm-import-chatlog-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-chatlog-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-chatlog-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const avatar = getChatlogTargetAvatar();
        if (!avatar) {
          cfmToastr.warning("请先选择一个角色");
          return;
        }
        await importChatFiles(avatar, files);
        $(this).val("");
        await invalidateChatCache(avatar);
        renderChatlogsView();
      });


  /* ===== qr 导入（源 L12322-L12566） ===== */
      popup.find("#cfm-import-qr-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-qr-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-qr-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedQrFolder() &&
          getSelectedQrFolder() !== "__ungrouped__" &&
          getSelectedQrFolder() !== "__favorites__"
            ? getSelectedQrFolder()
            : null;

        const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        const QRS = typeof globalThis !== "undefined" && globalThis.QuickReplySet;

        // 获取现有快速回复集名称
        let existingNames = new Set();
        if (api && api.listSets) {
          try {
            const sets = api.listSets();
            if (Array.isArray(sets)) {
              sets.forEach((s) =>
                existingNames.add(typeof s === "string" ? s : s.name),
              );
            }
          } catch (err) {
            console.warn("[CFM] 获取QR集列表失败", err);
          }
        }
        if (existingNames.size === 0 && QRS && QRS.list) {
          QRS.list.forEach((s) => existingNames.add(s.name));
        }

        // 预处理文件
        const validFiles = [];
        for (const file of files) {
          if (!file.name.endsWith(".json")) continue;
          try {
            const text = await file.text();
            const json = JSON.parse(text);
            // QR集 JSON 应含 name 和 qrList
            const setName = json.name || file.name.replace(/\.json$/i, "");
            validFiles.push({ file, json, setName });
          } catch (parseErr) {
            console.warn(`[CFM] 解析QR文件 ${file.name} 失败`, parseErr);
          }
        }

        if (validFiles.length === 0) {
          cfmToastr.warning("没有可导入的有效快速回复集文件");
          e.target.value = null;
          return;
        }

        // 检测重名
        const duplicateNames = validFiles
          .filter((f) => existingNames.has(f.setName))
          .map((f) => f.setName);
        let dupAction = null;
        if (duplicateNames.length > 0) {
          dupAction = await showDuplicateImportDialog(
            duplicateNames,
            validFiles.length,
            "快速回复集",
          );
          if (dupAction === "cancel") {
            cfmToastr.info("已取消导入");
            e.target.value = null;
            return;
          }
        }

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        const failedFiles = [];

        const batchProgress = showBatchProgressOverlay(
          "正在导入快速回复集",
          validFiles.length,
        );
        let processed = 0;

        for (const { file, json, setName } of validFiles) {
          const isDuplicate = existingNames.has(setName);

          if (isDuplicate && dupAction === "skip") {
            skipCount++;
            processed++;
            batchProgress.update(processed);
            continue;
          }

          try {
            let finalName = setName;

            // 覆盖模式：先删除旧的（使用 api.deleteSet 同时清理内存列表和服务器）
            if (isDuplicate && dupAction === "overwrite") {
              if (api && api.deleteSet) {
                try {
                  await api.deleteSet(setName);
                } catch (delErr) {
                  console.warn(
                    `[CFM] api.deleteSet 失败，回退到直接删除`,
                    delErr,
                  );
                  await fetch("/api/quick-replies/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: setName }),
                  });
                }
              } else {
                await fetch("/api/quick-replies/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: setName }),
                });
              }
            }

            // 重命名模式
            if (isDuplicate && dupAction === "rename") {
              finalName = getUniqueImportName(setName, existingNames);
            }

            // 保存到服务器并注册到内存列表
            const saveData = { ...json, name: finalName };

            // 通过 api.createSet 在内存中注册（会创建空集并保存到服务器）
            if (api && api.createSet) {
              try {
                await api.createSet(finalName, {
                  disableSend: json.disableSend || false,
                  placeBeforeInput: json.placeBeforeInput || false,
                  injectInput: json.injectInput || false,
                });
                // createSet 的 debounced save 已完成，现在用完整数据覆盖服务器上的空集
                const saveResp = await fetch("/api/quick-replies/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(saveData),
                });
                if (!saveResp.ok) {
                  throw new Error(`保存完整数据失败: ${saveResp.statusText}`);
                }

                // 同步当前页面内存中的 QR Set，避免仍然保留 createSet 生成的空集
                const liveSet =
                  (api.getSetByName && api.getSetByName(finalName)) ||
                  (QRS && QRS.list
                    ? QRS.list.find((s) => s.name === finalName)
                    : null);
                if (liveSet) {
                  liveSet.name = finalName;
                  liveSet.qrList = Array.isArray(saveData.qrList)
                    ? JSON.parse(JSON.stringify(saveData.qrList))
                    : [];
                  if ("disableSend" in saveData) {
                    liveSet.disableSend = !!saveData.disableSend;
                  }
                  if ("placeBeforeInput" in saveData) {
                    liveSet.placeBeforeInput = !!saveData.placeBeforeInput;
                  }
                  if ("injectInput" in saveData) {
                    liveSet.injectInput = !!saveData.injectInput;
                  }
                }
              } catch (createErr) {
                console.warn(
                  `[CFM] api.createSet 失败，回退到直接保存`,
                  createErr,
                );
                // 回退：直接保存到服务器（不注册到内存）
                const saveResp = await fetch("/api/quick-replies/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(saveData),
                });
                if (!saveResp.ok) {
                  throw new Error(`保存失败: ${saveResp.statusText}`);
                }
              }
            } else {
              // 无 api.createSet 时直接保存
              const saveResp = await fetch("/api/quick-replies/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(saveData),
              });
              if (!saveResp.ok) {
                throw new Error(`保存失败: ${saveResp.statusText}`);
              }
            }

            existingNames.add(finalName);

            // 分配到文件夹
            if (targetFolder) {
              setItemGroup("quickreply", finalName, targetFolder);
            }
            successCount++;
          } catch (error) {
            console.error(`导入快速回复集失败: ${file.name}`, error);
            failCount++;
            failedFiles.push(file.name);
          }
          processed++;
          batchProgress.update(processed);
        }

        // 刷新视图
        renderQRView();

        const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
        const parts = [];
        if (successCount > 0)
          parts.push(`成功导入 ${successCount} 个快速回复集${folderHint}`);
        if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
        if (failCount > 0) parts.push(`${failCount} 个失败`);
        const importQrMsg = parts.join("，");
        if (successCount > 0) {
          batchProgress.done(importQrMsg);
          cfmToastr.success(importQrMsg);
        } else if (skipCount > 0 && failCount === 0) {
          batchProgress.done(importQrMsg);
          cfmToastr.info(importQrMsg);
        } else if (failCount > 0) {
          batchProgress.done(importQrMsg);
          cfmToastr.error(importQrMsg);
        } else {
          batchProgress.remove();
        }
        if (failedFiles.length > 0) {
          showImportFailureDialog(failedFiles, "快速回复集");
        }

        e.target.value = null;
      });


  /* ===== persona 导入（源 L12569-L12590） ===== */
      popup.find("#cfm-import-persona-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-persona-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-persona-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedPersonaFolder() &&
          getSelectedPersonaFolder() !== "__ungrouped__" &&
          getSelectedPersonaFolder() !== "__favorites__"
            ? getSelectedPersonaFolder()
            : null;
        for (const file of files) {
          await importPersonas(file, targetFolder);
        }
        $(this).val("");
      });


  /* ===== regex 导入（源 L12593-L12613） ===== */
      popup.find("#cfm-import-regex-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-regex-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-regex-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedRegexNode() &&
          getSelectedRegexNode() !== "__ungrouped__" &&
          getSelectedRegexNode() !== "__favorites__" &&
          extensionSettings[extensionName].regexFolderTree[getSelectedRegexNode()]
            ? getSelectedRegexNode()
            : null;
        await importRegexScripts(Array.from(files), targetFolder);
        $(this).val("");
      });


  /* ===== theme 导入（源 L12656-L12814） ===== */
      popup.find("#cfm-import-theme-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-theme-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-theme-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedThemeFolder() &&
          getSelectedThemeFolder() !== "__ungrouped__" &&
          getSelectedThemeFolder() !== "__favorites__"
            ? getSelectedThemeFolder()
            : null;

        const headers = getContext().getRequestHeaders();

        // 获取现有主题名称集合
        const existingThemes = new Set(getThemeNames());

        // 预解析所有文件
        const parsedFiles = [];
        for (const file of files) {
          if (!file.name.endsWith(".json")) continue;
          try {
            const text = await file.text();
            const rawData = JSON.parse(text);
            const fileName = file.name.replace(".json", "");
            const name = rawData?.name ?? fileName;
            const data = normalizeImportedThemeData(rawData, name);
            parsedFiles.push({ file, data, name: data.name });
          } catch (err) {
            console.error(`解析主题文件失败: ${file.name}`, err);
          }
        }

        if (parsedFiles.length === 0) {
          cfmToastr.warning("没有可导入的有效主题文件");
          e.target.value = null;
          return;
        }

        // 检测重名
        const duplicateNames = parsedFiles
          .filter((f) => existingThemes.has(f.name))
          .map((f) => f.name);
        let dupAction = null;
        if (duplicateNames.length > 0) {
          dupAction = await showDuplicateImportDialog(
            duplicateNames,
            parsedFiles.length,
            "主题",
          );
          if (dupAction === "cancel") {
            cfmToastr.info("已取消导入");
            e.target.value = null;
            return;
          }
        }

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        const failedFiles = [];

        const batchProgress = showBatchProgressOverlay(
          "正在导入主题",
          parsedFiles.length,
        );
        let processed = 0;

        for (const { file, data, name } of parsedFiles) {
          try {
            const isDuplicate = existingThemes.has(name);
            let finalName = name;

            if (isDuplicate) {
              if (dupAction === "skip") {
                skipCount++;
                processed++;
                batchProgress.update(processed);
                continue;
              } else if (dupAction === "rename") {
                finalName = getUniqueImportName(name, existingThemes);
                data["name"] = finalName;
              }
              // 'overwrite' 时直接用原名覆盖
            }

            // 通过 /api/themes/save 保存主题
            const resp = await fetch("/api/themes/save", {
              method: "POST",
              headers,
              body: JSON.stringify(data),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            existingThemes.add(finalName);
            rememberImportedThemeRuntime(finalName, data);

            // 更新 #themes 下拉列表
            const themeSelect = $("#themes");
            if (
              themeSelect.length &&
              !themeSelect.find(`option[value="${finalName}"]`).length
            ) {
              themeSelect.append(
                `<option value="${finalName}">${finalName}</option>`,
              );
            }

            if (targetFolder) {
              setItemGroup("themes", finalName, targetFolder);
            }
            successCount++;
          } catch (error) {
            console.error(`导入主题失败: ${file.name}`, error);
            failCount++;
            failedFiles.push(file.name);
          }
          processed++;
          batchProgress.update(processed);
        }

        if (successCount > 0) {
          try {
            await refreshThemeRuntimeAfterImport(true);
          } catch (refreshError) {
            console.error("导入主题后刷新主题运行时失败", refreshError);
          }
        }

        // 刷新视图
        renderThemesView();

        const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
        const parts = [];
        if (successCount > 0)
          parts.push(`成功导入 ${successCount} 个主题${folderHint}`);
        if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
        if (failCount > 0) parts.push(`${failCount} 个失败`);
        const importThemeMsg = parts.join("，");
        if (successCount > 0) {
          batchProgress.done(importThemeMsg);
          cfmToastr.success(importThemeMsg);
        } else if (skipCount > 0 && failCount === 0) {
          batchProgress.done(importThemeMsg);
          cfmToastr.info(importThemeMsg);
        } else if (failCount > 0) {
          batchProgress.done(importThemeMsg);
          cfmToastr.error(importThemeMsg);
        } else {
          batchProgress.remove();
        }
        if (failedFiles.length > 0) {
          showImportFailureDialog(failedFiles, "主题");
        }

        e.target.value = null;
      });


  /* ===== bg 导入（源 L12817-L12999） ===== */
      popup.find("#cfm-import-bg-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-bg-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-bg-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedBgFolder() &&
          getSelectedBgFolder() !== "__ungrouped__" &&
          getSelectedBgFolder() !== "__favorites__"
            ? getSelectedBgFolder()
            : null;

        const headers = getContext().getRequestHeaders();
        delete headers["Content-Type"];

        // 获取现有背景名称集合
        const existingBgs = new Set(getBackgroundNames());

        // 过滤有效图片文件
        const imageFiles = [];
        for (const file of files) {
          if (file.type.startsWith("image/")) {
            imageFiles.push(file);
          }
        }

        if (imageFiles.length === 0) {
          cfmToastr.warning("没有可导入的有效图片文件");
          e.target.value = null;
          return;
        }

        // 检测重名
        const duplicateNames = imageFiles
          .filter((f) => existingBgs.has(f.name))
          .map((f) => f.name);
        let dupAction = null;
        if (duplicateNames.length > 0) {
          dupAction = await showDuplicateImportDialog(
            duplicateNames,
            imageFiles.length,
            "背景",
          );
          if (dupAction === "cancel") {
            cfmToastr.info("已取消导入");
            e.target.value = null;
            return;
          }
        }

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        const failedFiles = [];

        const batchProgress = showBatchProgressOverlay(
          "正在导入背景",
          imageFiles.length,
        );
        let processed = 0;

        for (const file of imageFiles) {
          try {
            const isDuplicate = existingBgs.has(file.name);
            let finalName = file.name;

            if (isDuplicate) {
              if (dupAction === "skip") {
                skipCount++;
                processed++;
                batchProgress.update(processed);
                continue;
              } else if (dupAction === "rename") {
                const ext =
                  file.name.lastIndexOf(".") !== -1
                    ? file.name.slice(file.name.lastIndexOf("."))
                    : "";
                const base = ext ? file.name.slice(0, -ext.length) : file.name;
                finalName = getUniqueImportName(base, existingBgs) + ext;
              }
              // 'overwrite' 时直接用原名覆盖
            }

            const formData = new FormData();
            if (finalName !== file.name) {
              const renamedFile = new File([file], finalName, {
                type: file.type,
              });
              formData.append("avatar", renamedFile);
            } else {
              formData.append("avatar", file);
            }

            const resp = await fetch("/api/backgrounds/upload", {
              method: "POST",
              headers,
              body: formData,
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            existingBgs.add(finalName);

            if (targetFolder) {
              setItemGroup("backgrounds", finalName, targetFolder);
            }
            successCount++;
          } catch (error) {
            console.error(`导入背景失败: ${file.name}`, error);
            failCount++;
            failedFiles.push(file.name);
          }
          processed++;
          batchProgress.update(processed);
        }

        // 刷新酒馆原生背景列表（等待 DOM 完全更新后再渲染分类视图）
        try {
          const bgModule = await import("../../../../../backgrounds.js");
          if (typeof bgModule.getBackgrounds === "function") {
            await bgModule.getBackgrounds();
          }
        } catch (err) {
          console.warn("[CFM] 刷新背景列表失败，尝试备用方案", err);
          // 备用方案：手动获取并重建 DOM
          try {
            const bgResp = await fetch("/api/backgrounds/all", {
              method: "POST",
              headers: getContext().getRequestHeaders(),
              body: JSON.stringify({}),
            });
            if (bgResp.ok) {
              const { images } = await bgResp.json();
              const container = $("#bg_menu_content");
              container.empty();
              const template = $("#background_template .bg_example");
              if (template.length && images) {
                images.forEach((bg) => {
                  const thumb = template.clone();
                  thumb.attr("bgfile", bg);
                  thumb.attr("title", bg);
                  container.append(thumb);
                });
              }
            }
          } catch (err2) {
            console.warn("[CFM] 备用刷新也失败", err2);
          }
        }

        // 原生 DOM 已更新，安全刷新分类视图
        renderBackgroundsView();

        const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
        const parts = [];
        if (successCount > 0)
          parts.push(`成功导入 ${successCount} 个背景${folderHint}`);
        if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
        if (failCount > 0) parts.push(`${failCount} 个失败`);
        const importBgMsg = parts.join("，");
        if (successCount > 0) {
          batchProgress.done(importBgMsg);
          cfmToastr.success(importBgMsg);
        } else if (skipCount > 0 && failCount === 0) {
          batchProgress.done(importBgMsg);
          cfmToastr.info(importBgMsg);
        } else if (failCount > 0) {
          batchProgress.done(importBgMsg);
          cfmToastr.error(importBgMsg);
        } else {
          batchProgress.remove();
        }
        if (failedFiles.length > 0) {
          showImportFailureDialog(failedFiles, "背景");
        }

        e.target.value = null;
      });


  /* ===== worldinfo 导入（源 L13016-L13213） ===== */
      popup.find("#cfm-import-worldinfo-btn").on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = popup.find("#cfm-import-worldinfo-file");
        input.val("");
        input[0]?.click();
      });

      popup.find("#cfm-import-worldinfo-file").on("change", async function (e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const targetFolder =
          getSelectedWorldInfoFolder() &&
          getSelectedWorldInfoFolder() !== "__ungrouped__" &&
          getSelectedWorldInfoFolder() !== "__favorites__"
            ? getSelectedWorldInfoFolder()
            : null;

        // 获取现有世界书名称集合
        const existingWI = new Set(await getWorldInfoNames(true));

        // 预处理文件，提取世界书名称用于重名检测
        const validFiles = [];
        for (const file of files) {
          const ext = file.name.match(/\.(\w+)$/);
          if (!ext || !["json", "png"].includes(ext[1].toLowerCase())) continue;
          const worldName = file.name.substr(0, file.name.lastIndexOf("."));
          validFiles.push({ file, worldName });
        }

        if (validFiles.length === 0) {
          cfmToastr.warning("没有可导入的有效世界书文件");
          e.target.value = null;
          return;
        }

        // 检测重名
        const duplicateNames = validFiles
          .filter((f) => existingWI.has(f.worldName))
          .map((f) => f.worldName);
        let dupAction = null;
        if (duplicateNames.length > 0) {
          dupAction = await showDuplicateImportDialog(
            duplicateNames,
            validFiles.length,
            "世界书",
          );
          if (dupAction === "cancel") {
            cfmToastr.info("已取消导入");
            e.target.value = null;
            return;
          }
        }

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        const failedFiles = [];

        const batchProgress = showBatchProgressOverlay(
          "正在导入世界书",
          validFiles.length,
        );
        let processed = 0;

        for (const { file, worldName } of validFiles) {
          const isDuplicate = existingWI.has(worldName);

          if (isDuplicate && dupAction === "skip") {
            skipCount++;
            processed++;
            batchProgress.update(processed);
            continue;
          }

          try {
            // 覆盖模式：先删除旧的世界书
            if (isDuplicate && dupAction === "overwrite") {
              await fetch("/api/worldinfo/delete", {
                method: "POST",
                headers: getContext().getRequestHeaders(),
                body: JSON.stringify({ name: worldName }),
              });
            }

            // 重命名模式：创建新文件名
            let importFile = file;
            let finalName = worldName;
            if (isDuplicate && dupAction === "rename") {
              finalName = getUniqueImportName(worldName, existingWI);
              const fileExt = file.name.substr(file.name.lastIndexOf("."));
              importFile = new File([file], finalName + fileExt, {
                type: file.type,
              });
            }

            const formData = new FormData();
            formData.append("avatar", importFile);

            // 处理不同格式的世界书数据
            if (file.name.endsWith(".json")) {
              const text = await file.text();
              const jsonData = JSON.parse(text);
              if (jsonData.lorebookVersion !== undefined) {
                formData.append("convertedData", JSON.stringify(jsonData));
              }
              if (jsonData.kind === "memory") {
                formData.append("convertedData", JSON.stringify(jsonData));
              }
              if (jsonData.type === "risu") {
                formData.append("convertedData", JSON.stringify(jsonData));
              }
            }

            const result = await fetch("/api/worldinfo/import", {
              method: "POST",
              headers: getContext().getRequestHeaders({ omitContentType: true }),
              body: formData,
              cache: "no-cache",
            });

            if (!result.ok) {
              throw new Error(`导入失败: ${result.statusText}`);
            }

            const data = await result.json();

            if (data.name) {
              existingWI.add(data.name);
              if (targetFolder) {
                setItemGroup("worldinfo", data.name, targetFolder);
              }
              successCount++;
            } else {
              throw new Error("服务器未返回世界书名称");
            }
          } catch (error) {
            console.error(`导入世界书失败: ${file.name}`, error);
            failCount++;
            failedFiles.push(file.name);
          }
          processed++;
          batchProgress.update(processed);
        }

        if (targetFolder && successCount > 0) {
          await flushFolderAssignmentSettings();
        }

        // 调用SillyTavern原生的 updateWorldInfoList 来同步 world_names 变量和 DOM
        try {
          const ctx = getContext();
          if (typeof ctx.updateWorldInfoList === "function") {
            await ctx.updateWorldInfoList();
          }
        } catch (updateErr) {
          console.warn("[CFM] 调用updateWorldInfoList失败", updateErr);
        }

        // updateWorldInfoList 之后原生 select 已重建，旧的 detach 缓存必须丢弃并按当前过滤重新应用，
        // 否则旧 option 会被再次 append 回去，导致世界书在插件/原生过滤里出现重复项。
        setWorldInfoDetachedOptions([]);
        setGlobalWIDetachedOptions([]);
        applyWorldInfoFilter();
        applyGlobalWorldInfoFilter();

        // 刷新插件内部的世界书名称缓存
        clearWorldInfoNamesCache();
        await getWorldInfoNames(true);

        // 刷新视图
        await renderWorldInfoView();

        const folderHint = targetFolder ? `到「${targetFolder}」` : "（未归类）";
        const parts = [];
        if (successCount > 0)
          parts.push(`成功导入 ${successCount} 个世界书${folderHint}`);
        if (skipCount > 0) parts.push(`${skipCount} 个因名称重复已跳过`);
        if (failCount > 0) parts.push(`${failCount} 个失败`);
        const importWiMsg = parts.join("，");
        if (successCount > 0) {
          batchProgress.done(importWiMsg);
          cfmToastr.success(importWiMsg);
        } else if (skipCount > 0 && failCount === 0) {
          batchProgress.done(importWiMsg);
          cfmToastr.info(importWiMsg);
        } else if (failCount > 0) {
          batchProgress.done(importWiMsg);
          cfmToastr.error(importWiMsg);
        } else {
          batchProgress.remove();
        }
        if (failedFiles.length > 0) {
          showImportFailureDialog(failedFiles, "世界书");
        }

        e.target.value = null;
      });

}
