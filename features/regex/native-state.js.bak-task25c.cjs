// 正则原生状态同步层：承接原生正则引擎 UI 面板的缓存清理、就地更新与完整重建逻辑。
// 任务25：从 index.js 拆分 syncNativeRegexState（原 L7923-8110）。
// 依赖注入：$（jQuery）、getContext（SillyTavern 全局上下文）。
// 注意：动态 import 路径相对本文件（features/regex/），需 4 级 ../ 才能到达 extensions 目录。

export function createRegexNativeStateApi(deps) {
  const {
    $,
    getContext,
  } = deps;

  /**
   * 同步原生正则引擎状态：清除缓存并刷新原生正则UI面板
   */
  async function syncNativeRegexState() {
    try {
      const engine = await import("../../../../regex/engine.js");
      // 清除正则引擎缓存，确保下次执行时使用最新数据
      engine.RegexProvider.instance.clear();
      // 就地更新原生正则UI面板（保留原生事件绑定）
      const containers = [
        {
          sel: "#saved_regex_scripts",
          type: engine.SCRIPT_TYPES.GLOBAL,
        },
        {
          sel: "#saved_scoped_scripts",
          type: engine.SCRIPT_TYPES.SCOPED,
        },
        {
          sel: "#saved_preset_scripts",
          type: engine.SCRIPT_TYPES.PRESET,
        },
      ];
      let hasMissingRows = false;
      for (const { sel, type } of containers) {
        const container = $(sel);
        if (!container.length) continue;
        const scripts = engine.getScriptsByType(type);
        const scriptIds = new Set(scripts.map((s) => s.id));
        // 移除已删除的脚本行
        container.children().each(function () {
          const id = $(this).attr("id");
          if (id && !scriptIds.has(id)) $(this).remove();
        });
        // 检查是否有新脚本缺少原生行
        for (const script of scripts) {
          if (!script.id) continue;
          const row = container.children("#" + $.escapeSelector(script.id));
          if (row.length) {
            // 更新名称
            row
              .find(".regex_script_name")
              .text(script.scriptName)
              .attr("title", script.scriptName);
            // 更新禁用状态
            row
              .find(".disable_regex")
              .prop("checked", script.disabled ?? false);
            // 移动到容器末尾以保持正确顺序
            container.append(row);
          } else {
            // 标记有缺失行，需要完整重建
            hasMissingRows = true;
          }
        }
      }
      // 如果有新脚本缺少原生行，完整重建面板
      if (hasMissingRows) {
        console.debug(
          "[CFM] syncNativeRegexState: detected missing rows, rebuilding panels",
        );
        try {
          // 尝试获取原生模板
          let scriptTemplate;
          try {
            const { renderExtensionTemplateAsync } =
              await import("../../../../extensions.js");
            scriptTemplate = $(
              await renderExtensionTemplateAsync("regex", "scriptTemplate"),
            );
          } catch (templateErr) {
            console.debug(
              "[CFM] syncNativeRegexState: template load failed, using fallback",
              templateErr,
            );
          }
          // 如果模板加载失败或为空，使用内联回退模板
          if (!scriptTemplate || !scriptTemplate.length) {
            scriptTemplate = $(`
              <div class="regex-script-label flex-container flexnowrap">
                <input type="checkbox" class="regex_bulk_checkbox" />
                <span class="drag-handle menu-handle">&#9776;</span>
                <div class="regex_script_name flex1 overflow-hidden"></div>
                <div class="flex-container flexnowrap">
                  <label class="checkbox flex-container margin-r5" for="regex_disable">
                    <input type="checkbox" name="regex_disable" class="disable_regex" />
                    <span class="regex-toggle-on fa-solid fa-toggle-on" title="Disable script"></span>
                    <span class="regex-toggle-off fa-solid fa-toggle-off" title="Enable script"></span>
                  </label>
                  <div class="edit_existing_regex menu_button" title="Edit script">
                    <i class="fa-solid fa-pencil"></i>
                  </div>
                  <div class="export_regex menu_button" title="Export script">
                    <i class="fa-solid fa-file-export"></i>
                  </div>
                  <div class="delete_regex menu_button" title="Delete script">
                    <i class="fa-solid fa-trash"></i>
                  </div>
                </div>
              </div>
            `);
          }
          for (const { sel, type } of containers) {
            const container = $(sel);
            if (!container.length) continue;
            const scripts = engine.getScriptsByType(type);
            // 清空容器后完整重建
            container.empty();
            scripts.forEach((script, index) => {
              if (!script.id) {
                script.id = getContext().uuidv4();
              }
              const scriptHtml = scriptTemplate.clone();
              const saveFunc = async () => {
                await engine.saveScriptsByType(
                  engine.getScriptsByType(type),
                  type,
                );
              };
              scriptHtml.attr("id", script.id);
              scriptHtml
                .find(".regex_script_name")
                .text(script.scriptName)
                .attr("title", script.scriptName);
              scriptHtml
                .find(".disable_regex")
                .prop("checked", script.disabled ?? false)
                .on("input", async function () {
                  script.disabled = !!$(this).prop("checked");
                  await saveFunc();
                });
              scriptHtml.find(".regex-toggle-on").on("click", function () {
                scriptHtml
                  .find(".disable_regex")
                  .prop("checked", true)
                  .trigger("input");
              });
              scriptHtml.find(".regex-toggle-off").on("click", function () {
                scriptHtml
                  .find(".disable_regex")
                  .prop("checked", false)
                  .trigger("input");
              });
              scriptHtml.find(".edit_existing_regex").on("click", function () {
                // 触发原生编辑对话框
                const id = scriptHtml.attr("id");
                const editBtn = $("#" + $.escapeSelector(String(id))).find(
                  ".edit_existing_regex",
                );
                if (editBtn.length && editBtn[0] !== this) {
                  editBtn.trigger("click");
                }
              });
              scriptHtml.find(".export_regex").on("click", function () {
                const fileName = `regex-${(script.scriptName || "").replace(/[\s.<>:"/\\|?*\x00-\x1F\x7F]/g, "_").toLowerCase()}.json`;
                const fileData = JSON.stringify(script, null, 4);
                const blob = new Blob([fileData], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
              });
              scriptHtml.find(".delete_regex").on("click", async function () {
                // 删除操作交由原生处理
                const nativeRow = $("#" + $.escapeSelector(String(script.id)));
                if (nativeRow.length) {
                  nativeRow.find(".delete_regex").trigger("click");
                }
              });
              container.append(scriptHtml);
            });
          }
          console.debug(
            "[CFM] syncNativeRegexState: rebuilt native regex panels",
          );
        } catch (rebuildErr) {
          console.error(
            "[CFM] syncNativeRegexState rebuild failed:",
            rebuildErr,
          );
        }
      }
    } catch (e) {
      // 静默失败：原生正则UI可能未加载
      console.debug("[CFM] syncNativeRegexState:", e);
    }
  }

  return {
    syncNativeRegexState,
  };
}
