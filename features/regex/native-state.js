// 正则原生状态同步层：承接原生正则引擎 UI 面板的缓存清理、就地更新与完整重建逻辑。
// 任务25：从 index.js 拆分 syncNativeRegexState（原 L7923-8110）。
// 任务25g：修复重建行的编辑/删除按钮自引用失效 Bug —— 改为直接调用 engine 数据 API 与复刻原生编辑器，
//          不再模拟点击自身/原生按钮，保证删除、导入、互通后原生面板可立即编辑与删除。
// 依赖注入：$（jQuery）、getContext（SillyTavern 全局上下文）。
// 注意：动态 import 路径相对本文件（features/regex/），需 4 级 ../ 才能到达 extensions 目录。

export function createRegexNativeStateApi(deps) {
  const {
    $,
    getContext,
  } = deps;

  /**
   * 复刻原生正则编辑器弹窗（原生 onRegexEditorOpenClick 为模块私有函数，无法直接调用）。
   * @param {string} existingId 脚本 ID
   * @param {string} scriptType SCRIPT_TYPES.GLOBAL / SCOPED / PRESET
   * @param {object} engine 已动态 import 的 regex/engine.js 模块
   * @returns {Promise<void>}
   */
  async function openNativeRegexEditor(existingId, scriptType, engine) {
    try {
      const { renderExtensionTemplateAsync } =
        await import("../../../../../extensions.js");
      const { callGenericPopup, POPUP_TYPE: PT } =
        await import("../../../../../popup.js");

      const editorHtml = $(
        await renderExtensionTemplateAsync("regex", "editor"),
      );
      if (!editorHtml || !editorHtml.length) {
        console.warn("[CFM] 原生正则编辑器模板加载失败");
        return;
      }

      const array = engine.getScriptsByType(scriptType);
      let existingScriptIndex = -1;
      const currentScript = existingId
        ? array.find((s) => String(s.id) === String(existingId))
        : null;
      if (currentScript) {
        existingScriptIndex = array.indexOf(currentScript);
        editorHtml
          .find(".regex_script_name")
          .val(currentScript.scriptName || "");
        editorHtml.find(".find_regex").val(currentScript.findRegex || "");
        editorHtml
          .find(".regex_replace_string")
          .val(currentScript.replaceString || "");
        editorHtml
          .find(".regex_trim_strings")
          .val(currentScript.trimStrings?.join("\n") || "");
        editorHtml
          .find('input[name="disabled"]')
          .prop("checked", currentScript.disabled ?? false);
        editorHtml
          .find('input[name="only_format_display"]')
          .prop("checked", currentScript.markdownOnly ?? false);
        editorHtml
          .find('input[name="only_format_prompt"]')
          .prop("checked", currentScript.promptOnly ?? false);
        editorHtml
          .find('input[name="run_on_edit"]')
          .prop("checked", currentScript.runOnEdit ?? false);
        editorHtml
          .find('select[name="substitute_regex"]')
          .val(currentScript.substituteRegex ?? 0);
        editorHtml
          .find('input[name="min_depth"]')
          .val(currentScript.minDepth ?? "");
        editorHtml
          .find('input[name="max_depth"]')
          .val(currentScript.maxDepth ?? "");
        if (Array.isArray(currentScript.placement)) {
          currentScript.placement.forEach((element) => {
            editorHtml
              .find(`input[name="replace_position"][value="${element}"]`)
              .prop("checked", true);
          });
        }
      } else {
        // 新建脚本的默认值（与原生一致）
        editorHtml
          .find('input[name="only_format_display"]')
          .prop("checked", true);
        editorHtml.find('input[name="run_on_edit"]').prop("checked", true);
        editorHtml
          .find('input[name="replace_position"][value="1"]')
          .prop("checked", true);
      }

      // 测试模式
      editorHtml.find("#regex_test_mode_toggle").on("click", function () {
        editorHtml.find("#regex_test_mode").toggleClass("displayNone");
        updateTestResult();
      });

      function updateTestResult() {
        if (!editorHtml.find("#regex_test_mode").is(":visible")) return;
        try {
          const testScript = {
            id: getContext().uuidv4(),
            scriptName: String(editorHtml.find(".regex_script_name").val()),
            findRegex: String(editorHtml.find(".find_regex").val()),
            replaceString: String(
              editorHtml.find(".regex_replace_string").val(),
            ),
            trimStrings:
              String(editorHtml.find(".regex_trim_strings").val())
                .split("\n")
                .filter((e) => e.length !== 0) || [],
            substituteRegex: Number(
              editorHtml.find('select[name="substitute_regex"]').val(),
            ),
            disabled: false,
            promptOnly: false,
            markdownOnly: false,
            runOnEdit: false,
            minDepth: null,
            maxDepth: null,
            placement: null,
          };
          const rawTestString = String(
            editorHtml.find("#regex_test_input").val(),
          );
          const result = engine.runRegexScript(testScript, rawTestString);
          editorHtml.find("#regex_test_output").text(result);
        } catch (testErr) {
          editorHtml.find("#regex_test_output").text("(测试执行出错)");
        }
      }

      editorHtml.find("input, textarea, select").on("input", updateTestResult);

      const popupResult = await callGenericPopup(
        editorHtml,
        PT.CONFIRM,
        "",
        {
          okButton: "Save",
          cancelButton: "Cancel",
          allowVerticalScrolling: true,
        },
      );
      if (popupResult) {
        const newRegexScript = {
          id: existingId ? String(existingId) : getContext().uuidv4(),
          scriptName: String(editorHtml.find(".regex_script_name").val()),
          findRegex: String(editorHtml.find(".find_regex").val()),
          replaceString: String(
            editorHtml.find(".regex_replace_string").val(),
          ),
          trimStrings:
            String(editorHtml.find(".regex_trim_strings").val())
              .split("\n")
              .filter((e) => e.length !== 0) || [],
          placement:
            editorHtml
              .find('input[name="replace_position"]')
              .filter(":checked")
              .map(function () {
                return parseInt($(this).val().toString());
              })
              .get()
              .filter((e) => !isNaN(e)) || [],
          disabled: editorHtml
            .find('input[name="disabled"]')
            .prop("checked"),
          markdownOnly: editorHtml
            .find('input[name="only_format_display"]')
            .prop("checked"),
          promptOnly: editorHtml
            .find('input[name="only_format_prompt"]')
            .prop("checked"),
          runOnEdit: editorHtml
            .find('input[name="run_on_edit"]')
            .prop("checked"),
          substituteRegex: Number(
            editorHtml.find('select[name="substitute_regex"]').val(),
          ),
          minDepth: parseInt(
            String(editorHtml.find('input[name="min_depth"]').val()),
          ),
          maxDepth: parseInt(
            String(editorHtml.find('input[name="max_depth"]').val()),
          ),
        };

        if (existingScriptIndex !== -1) {
          array[existingScriptIndex] = newRegexScript;
        } else {
          array.push(newRegexScript);
        }
        await engine.saveScriptsByType(array, scriptType);
        // 保存后刷新面板，保证编辑内容即时反映到原生 UI
        await syncNativeRegexState();
      }
    } catch (err) {
      console.error("[CFM] 打开正则编辑器失败:", err);
    }
  }

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
              await import("../../../../../extensions.js");
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
                // 直接复刻原生编辑器（不再模拟点击自身，修复自引用失效 Bug）
                openNativeRegexEditor(script.id, type, engine);
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
                // 直接调用引擎数据 API 删除并保存（不再模拟点击自身/原生删除按钮）
                const scriptsArr = engine.getScriptsByType(type);
                const deleteIdx = scriptsArr.findIndex(
                  (s) => String(s.id) === String(script.id),
                );
                if (deleteIdx === -1) return;
                scriptsArr.splice(deleteIdx, 1);
                await engine.saveScriptsByType(scriptsArr, type);
                // 删除后立即刷新面板，保证原生 UI 同步
                await syncNativeRegexState();
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
