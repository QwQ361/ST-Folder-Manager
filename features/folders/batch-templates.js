// 批量创建模板事件绑定层：承接模板弹窗中的保存、取消编辑、加载、编辑、删除模板事件。
export function createBatchTemplateApi(deps) {
  const { $, cfmConfirm, cfmToastr, getBatchTemplates, saveBatchTemplate, updateBatchTemplate, deleteBatchTemplate } = deps;

  function bindBatchTemplateEvents(type, popup, textareaSelector, refreshFn) {
    function getEditingIndex() {
      const idx = Number.parseInt(popup.data("cfmEditingTemplateIndex"), 10);
      return Number.isNaN(idx) ? -1 : idx;
    }
    function clearEditingState() {
      popup.removeData("cfmEditingTemplateIndex");
      popup.removeData("cfmEditingTemplateName");
    }

    // 保存模板 / 更新模板
    popup.find(".cfm-tpl-save-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const content = popup.find(textareaSelector).val().toString().trim();
      if (!content) {
        cfmToastr.warning("请先输入文件夹结构");
        return;
      }
      const editingIdx = getEditingIndex();
      if (editingIdx >= 0) {
        const templates = getBatchTemplates(type);
        if (!templates[editingIdx]) {
          clearEditingState();
          refreshFn();
          cfmToastr.warning("当前编辑的模板不存在，已退出编辑状态");
          return;
        }
        const editingName =
          popup.data("cfmEditingTemplateName")?.toString().trim() ||
          templates[editingIdx].name;
        updateBatchTemplate(type, editingIdx, editingName, content);
        clearEditingState();
        cfmToastr.success(`模板「${editingName}」已更新`);
        refreshFn();
        return;
      }
      const name = prompt("请输入模板名称：");
      if (!name || !name.trim()) return;
      saveBatchTemplate(type, name.trim(), content);
      cfmToastr.success(`模板「${name.trim()}」已保存`);
      refreshFn();
    });

    // 取消编辑
    popup.find(".cfm-tpl-cancel-edit-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearEditingState();
      cfmToastr.info("已取消模板编辑");
      refreshFn();
    });

    // 加载模板
    popup
      .find(".cfm-tpl-item .cfm-tpl-name")
      .on("click touchend", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt($(this).parent().attr("data-tpl-idx"));
        const templates = getBatchTemplates(type);
        if (templates[idx]) {
          popup.find(textareaSelector).val(templates[idx].content);
          cfmToastr.info(`已加载模板「${templates[idx].name}」`);
        }
      });

    // 编辑模板
    popup.find(".cfm-tpl-edit").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt($(this).attr("data-tpl-idx"));
      const templates = getBatchTemplates(type);
      const template = templates[idx];
      if (!template) return;

      let editMode = prompt(
        "请选择修改方式：\n名字 / 结构 / 都要\n（也支持输入 1 / 2 / 3）",
        "都要",
      );
      if (!editMode) return;
      editMode = editMode.toString().trim();
      if (editMode === "1") editMode = "名字";
      else if (editMode === "2") editMode = "结构";
      else if (editMode === "3") editMode = "都要";

      if (!["名字", "结构", "都要"].includes(editMode)) {
        cfmToastr.warning("请输入：名字、结构、都要，或 1、2、3");
        return;
      }

      if (editMode === "名字") {
        const nextName = prompt("请输入新的模板名称：", template.name);
        if (!nextName || !nextName.trim()) return;
        updateBatchTemplate(type, idx, nextName.trim(), template.content);
        if (getEditingIndex() === idx) clearEditingState();
        cfmToastr.success(`模板已重命名为「${nextName.trim()}」`);
        refreshFn();
        return;
      }

      let editingName = template.name;
      if (editMode === "都要") {
        const nextName = prompt("请输入新的模板名称：", template.name);
        if (!nextName || !nextName.trim()) return;
        editingName = nextName.trim();
      }

      popup.data("cfmEditingTemplateIndex", idx);
      popup.data("cfmEditingTemplateName", editingName);
      popup.find(textareaSelector).val(template.content);
      cfmToastr.info(
        editMode === "结构"
          ? `已载入模板「${template.name}」的结构，修改后点击“保存对当前模板的修改”`
          : `已载入模板「${template.name}」，修改后点击“保存对当前模板的修改”`,
      );
      refreshFn();
    });

    // 删除模板
    popup.find(".cfm-tpl-del").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt($(this).attr("data-tpl-idx"));
      const templates = getBatchTemplates(type);
      if (
        templates[idx] &&
        cfmConfirm(`确定删除模板「${templates[idx].name}」？`)
      ) {
        const editingIdx = getEditingIndex();
        deleteBatchTemplate(type, idx);
        if (editingIdx === idx) {
          clearEditingState();
        } else if (editingIdx > idx) {
          popup.data("cfmEditingTemplateIndex", editingIdx - 1);
        }
        cfmToastr.success("模板已删除");
        refreshFn();
      }
    });
  }

  return { bindBatchTemplateEvents };
}
