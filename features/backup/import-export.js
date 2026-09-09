// 插件内导入/导出层：承接 buildExportData（将文件夹树、分组、收藏、备注、绑定与资源域设置导出为 JSON）
// 与 showImportExportPopup（导入/导出弹窗 UI 与导入执行）。
export function createBackupImportExportApi(deps) {
  const {
    $,
    extensionName,
    extension_settings,
    cfmToastr,
    state,
    ensureResourceSettings,
    getResFolderTree,
    getResourceGroups,
    getTagMap,
    getCharacters,
    getFavorites,
    getTagName,
    getFolderTagIds,
    getResFavorites,
    getRegexGlobalScripts,
    loadConfig,
    executeExport,
    executeImport,
    renderLeftTree,
    renderRightPane,
    renderPresetsView,
    renderThemesView,
    renderBackgroundsView,
    renderWorldInfoView,
    renderQRView,
    renderPersonasView,
    renderRegexView,
  } = deps;

  function buildExportData(scope) {
    const config = state.config;
    const data = {
      version: 1,
      pluginName: extensionName,
      exportDate: new Date().toISOString(),
      scope: scope,
    };

    if (scope === "all" || scope === "chars") {
      const charFolders = [];
      const folderPathMap = {};

      function buildFolderPathForExport(tagId) {
        if (folderPathMap[tagId]) return folderPathMap[tagId];
        const folder = config.folders[tagId];
        if (!folder) return null;
        const displayName = getTagName(tagId);
        if (folder.parentId && config.folders[folder.parentId]) {
          const parentPath = buildFolderPathForExport(folder.parentId);
          folderPathMap[tagId] = parentPath
            ? [...parentPath, displayName]
            : [displayName];
        } else {
          folderPathMap[tagId] = [displayName];
        }
        return folderPathMap[tagId];
      }

      for (const tagId of getFolderTagIds()) {
        buildFolderPathForExport(tagId);
        charFolders.push({
          path: folderPathMap[tagId],
          sortOrder: config.folders[tagId]?.sortOrder ?? 0,
        });
      }

      const assignments = {};
      const characters = getCharacters();
      const tagMap = getTagMap();
      const allFolderIdSet = new Set(getFolderTagIds());

      for (const char of characters) {
        const charTags = tagMap[char.avatar] || [];
        const folderTags = charTags.filter((t) => allFolderIdSet.has(t));
        if (folderTags.length > 0) {
          let deepest = folderTags[0];
          let maxDepth = (folderPathMap[deepest] || []).length;
          for (let i = 1; i < folderTags.length; i++) {
            const d = (folderPathMap[folderTags[i]] || []).length;
            if (d > maxDepth) {
              deepest = folderTags[i];
              maxDepth = d;
            }
          }
          if (folderPathMap[deepest]) {
            assignments[char.avatar] = folderPathMap[deepest];
          }
        }
      }

      data.chars = {
        folderTree: charFolders,
        favorites: [...getFavorites()],
        assignments: assignments,
      };
    }

    if (scope === "all" || scope === "presets") {
      ensureResourceSettings();
      data.presets = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("presets"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("presets"))),
        favorites: [...getResFavorites("presets")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].presetNotes || {}),
        ),
      };
    }

    if (scope === "all" || scope === "worldinfo") {
      ensureResourceSettings();
      data.worldinfo = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("worldinfo"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("worldinfo"))),
        favorites: [...getResFavorites("worldinfo")],
        notes: JSON.parse(
          JSON.stringify(
            extension_settings[extensionName].worldInfoNotes || {},
          ),
        ),
      };
    }

    if (scope === "all" || scope === "themes") {
      ensureResourceSettings();
      data.themes = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("themes"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("themes"))),
        favorites: [...getResFavorites("themes")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].themeNotes || {}),
        ),
        bgBindings: JSON.parse(
          JSON.stringify(
            extension_settings[extensionName].themeBackgroundBindings || {},
          ),
        ),
        defaultBackground:
          extension_settings[extensionName].defaultBackground || "",
      };
    }

    if (scope === "all" || scope === "backgrounds") {
      ensureResourceSettings();
      data.backgrounds = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("backgrounds"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("backgrounds"))),
        favorites: [...getResFavorites("backgrounds")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].bgNotes || {}),
        ),
        orientations: JSON.parse(
          JSON.stringify(
            extension_settings[extensionName].bgOrientations || {},
          ),
        ),
      };
    }

    if (scope === "all" || scope === "personas") {
      ensureResourceSettings();
      data.personas = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("personas"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("personas"))),
        favorites: [...getResFavorites("personas")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].personaNotes || {}),
        ),
      };
    }

    if (scope === "all" || scope === "regex") {
      ensureResourceSettings();
      const globalScripts = getRegexGlobalScripts();
      const regexGroups =
        extension_settings[extensionName].regexGlobalGroups || {};
      const regexFavIds = new Set(getResFavorites("regex"));
      const assignments = {};
      const favorites = [];

      for (const script of globalScripts) {
        const scriptName = String(script?.scriptName || "").trim();
        const scriptId = String(script?.id || "").trim();
        if (!scriptName || !scriptId) continue;
        const folderId = regexGroups[scriptId];
        if (folderId) assignments[scriptName] = folderId;
        if (regexFavIds.has(scriptId)) favorites.push(scriptName);
      }

      data.regex = {
        folderTree: JSON.parse(
          JSON.stringify(
            extension_settings[extensionName].regexFolderTree || {},
          ),
        ),
        assignments,
        favorites: Array.from(new Set(favorites)),
      };
    }

    if (scope === "all" || scope === "quickreply") {
      ensureResourceSettings();
      data.quickreply = {
        folderTree: JSON.parse(JSON.stringify(getResFolderTree("quickreply"))),
        groups: JSON.parse(JSON.stringify(getResourceGroups("quickreply"))),
        favorites: [...getResFavorites("quickreply")],
        notes: JSON.parse(
          JSON.stringify(extension_settings[extensionName].qrNotes || {}),
        ),
      };
    }

    return data;
  }

  function showImportExportPopup() {
    if ($("#cfm-backup-overlay").length > 0) return;
    const currentResourceType = state.currentResourceType;
    const overlay = $(
      '<div id="cfm-backup-overlay" class="cfm-batch-overlay"></div>',
    );
    const currentTab =
      currentResourceType === "chars"
        ? "角色卡"
        : currentResourceType === "presets"
          ? "预设"
          : currentResourceType === "themes"
            ? "美化"
            : currentResourceType === "backgrounds"
              ? "背景"
              : currentResourceType === "personas"
                ? "User"
                : currentResourceType === "regex"
                  ? "正则"
                  : currentResourceType === "quickreply"
                    ? "QR"
                    : "世界书";
    const popup = $(`
      <div class="cfm-batch-popup" style="max-width:480px;">
        <div class="cfm-config-header">
          <h3>📦 导入 / 导出</h3>
          <button class="cfm-btn-close" id="cfm-backup-close">&times;</button>
        </div>
        <div style="padding:16px;">
          <div class="cfm-config-section">
            <label>导出数据</label>
            <div class="cfm-create-tag-hint" style="margin-bottom:10px;">导出文件夹结构和文件分配关系（不含实际文件内容），用于跨设备迁移。</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="cfm-btn cfm-backup-export-btn" data-scope="all" style="background:rgba(88,101,242,0.2);color:#8b9dfc;border-color:rgba(88,101,242,0.4);"><i class="fa-solid fa-download"></i> 导出全部</button>
              <button class="cfm-btn cfm-backup-export-btn" data-scope="${currentResourceType}" style="background:rgba(87,242,135,0.15);color:#57f287;border-color:rgba(87,242,135,0.4);"><i class="fa-solid fa-download"></i> 仅导出${currentTab}</button>
            </div>
          </div>
          <div class="cfm-config-section" style="margin-top:16px;">
            <label>导入数据</label>
            <div class="cfm-create-tag-hint" style="margin-bottom:10px;">从备份文件恢复。插件会按名称匹配当前设备上已有的文件，匹配到的放入对应文件夹，匹配不到的跳过。</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <button class="cfm-btn" id="cfm-backup-import-btn" style="background:rgba(249,226,175,0.15);color:#f9e2af;border-color:rgba(249,226,175,0.4);"><i class="fa-solid fa-upload"></i> 选择文件导入</button>
              <input type="file" id="cfm-backup-file-input" accept=".json" style="display:none;" />
            </div>
            <div id="cfm-backup-import-result" style="margin-top:10px;"></div>
          </div>
        </div>
      </div>
    `);
    overlay.append(popup);
    $("body").append(overlay);

    popup.find("#cfm-backup-close").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
    });

    popup.find(".cfm-backup-export-btn").on("click touchend", function (e) {
      e.preventDefault();
      const scope = $(this).data("scope");
      executeExport(scope);
    });

    popup.find("#cfm-backup-import-btn").on("click touchend", (e) => {
      e.preventDefault();
      popup.find("#cfm-backup-file-input").trigger("click");
    });

    popup.find("#cfm-backup-file-input").on("change", function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const jsonData = JSON.parse(ev.target.result);
          if (!jsonData.version || !jsonData.pluginName) {
            cfmToastr.error("无效的备份文件");
            return;
          }
          const resultArea = popup.find("#cfm-backup-import-result");
          resultArea.html(
            '<div style="color:#8b9dfc;"><i class="fa-solid fa-spinner fa-spin"></i> 正在导入...</div>',
          );

          const report = await executeImport(jsonData);
          state.config = loadConfig();

          let html =
            '<div style="color:#57f287;margin-bottom:6px;">✅ 导入完成</div>';
          html += `<div style="font-size:12px;line-height:1.8;color:#a6adc8;">`;
          html += `创建了 ${report.foldersCreated} 个新文件夹<br>`;
          if (jsonData.chars)
            html += `角色卡：匹配 ${report.chars.matched} 个，跳过 ${report.chars.skipped} 个<br>`;
          if (jsonData.presets)
            html += `预设：匹配 ${report.presets.matched} 个，跳过 ${report.presets.skipped} 个<br>`;
          if (jsonData.worldinfo)
            html += `世界书：匹配 ${report.worldinfo.matched} 个，跳过 ${report.worldinfo.skipped} 个<br>`;
          if (jsonData.themes)
            html += `美化：匹配 ${report.themes.matched} 个，跳过 ${report.themes.skipped} 个<br>`;
          if (jsonData.backgrounds)
            html += `背景：匹配 ${report.backgrounds.matched} 个，跳过 ${report.backgrounds.skipped} 个<br>`;
          if (jsonData.personas)
            html += `User：匹配 ${report.personas.matched} 个，跳过 ${report.personas.skipped} 个<br>`;
          if (jsonData.regex)
            html += `正则：匹配 ${report.regex.matched} 个，跳过 ${report.regex.skipped} 个<br>`;
          if (jsonData.quickreply)
            html += `QR：匹配 ${report.quickreply.matched} 个，跳过 ${report.quickreply.skipped} 个<br>`;
          if (report.favoritesRestored > 0)
            html += `恢复了 ${report.favoritesRestored} 个收藏<br>`;
          html += `</div>`;
          resultArea.html(html);

          renderLeftTree();
          renderRightPane();
          if (currentResourceType === "presets") renderPresetsView();
          else if (currentResourceType === "worldinfo") renderWorldInfoView();
          else if (currentResourceType === "themes") renderThemesView();
          else if (currentResourceType === "backgrounds")
            renderBackgroundsView();
          else if (currentResourceType === "personas") renderPersonasView();
          else if (currentResourceType === "regex") renderRegexView();
          else if (currentResourceType === "quickreply") renderQRView();
        } catch (err) {
          cfmToastr.error("导入失败：" + err.message);
          console.error("[CFM] Import error:", err);
        }
      };
      reader.readAsText(file);
    });
  }

  return { buildExportData, showImportExportPopup };
}
