// 背景重命名层：承接背景资源重命名执行，以及重命名后对分组、收藏、备注、方向、默认背景和主题背景绑定引用的同步修复。

function getState(deps, key) {
  return deps.state[key];
}

function setState(deps, key, value) {
  deps.state[key] = value;
}

function getBaseAndExt(name) {
  const dotIdx = name.lastIndexOf(".");
  return {
    base: dotIdx > 0 ? name.substring(0, dotIdx) : name,
    ext: dotIdx > 0 ? name.substring(dotIdx) : "",
  };
}

function buildNameListHtml(names, deps) {
  const renderName = (name) => `<div class="cfm-edit-name-item">${deps.escapeHtml(deps.getBackgroundDisplayName(name))}</div>`;
  if (names.length <= 5) return names.map(renderName).join("");
  return `${names.slice(0, 5).map(renderName).join("")}<div class="cfm-edit-name-item cfm-edit-name-more">...等共 ${names.length} 个背景</div>`;
}

async function refreshNativeBackgrounds(deps) {
  try {
    const bgModule = await deps.importBackgroundsModule();
    if (typeof bgModule.getBackgrounds === "function") {
      await bgModule.getBackgrounds();
    }
  } catch (error) {
    deps.console.warn("[CFM] 刷新背景列表失败", error);
  }
  deps.renderBackgroundsView();
}

export function enterBgRenameModeCore(deps) {
  const prev = deps.collectCurrentSelection();
  deps.clearAllExclusiveModes();
  setState(deps, "cfmBgRenameMode", true);
  setState(deps, "cfmBgRenameSelected", prev || new Set());
  setState(deps, "cfmBgRenameRangeMode", false);
  setState(deps, "cfmBgRenameLastClicked", null);
  deps.$("#cfm-bg-rename-btn").addClass("cfm-edit-active");
  deps.$("#cfm-bg-rename-btn")
    .find("i")
    .removeClass("fa-i-cursor")
    .addClass("fa-check");
  deps.$("#cfm-bg-rename-btn").attr("title", "确认重命名");
  deps.$(".cfm-popup").addClass("cfm-bg-rename-mode");
  deps.renderBackgroundsView();
}

export function exitBgRenameModeCore(deps) {
  setState(deps, "cfmBgRenameMode", false);
  getState(deps, "cfmBgRenameSelected").clear();
  setState(deps, "cfmBgRenameRangeMode", false);
  setState(deps, "cfmBgRenameLastClicked", null);
  deps.$("#cfm-bg-rename-btn").removeClass("cfm-edit-active");
  deps.$("#cfm-bg-rename-btn")
    .find("i")
    .removeClass("fa-check")
    .addClass("fa-i-cursor");
  deps.$("#cfm-bg-rename-btn").attr("title", "重命名背景");
  deps.$(".cfm-popup").removeClass("cfm-bg-rename-mode");
  deps.renderBackgroundsView();
}

export function toggleBgRenameItemCore(id, shiftKey, deps) {
  const selected = getState(deps, "cfmBgRenameSelected");
  const lastClicked = getState(deps, "cfmBgRenameLastClicked");
  if ((shiftKey || getState(deps, "cfmBgRenameRangeMode")) && lastClicked) {
    const visible = deps.getVisibleResourceIds();
    const lastIdx = visible.indexOf(lastClicked);
    const curIdx = visible.indexOf(id);
    if (lastIdx !== -1 && curIdx !== -1) {
      const [start, end] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
      for (let i = start; i <= end; i++) selected.add(visible[i]);
    }
  } else if (selected.has(id)) {
    selected.delete(id);
  } else {
    selected.add(id);
  }
  setState(deps, "cfmBgRenameLastClicked", id);
}

export function prependBgRenameToolbarCore(listContainer, renderFn, deps) {
  if (!getState(deps, "cfmBgRenameMode")) return;
  const visible = deps.getVisibleResourceIds();
  const selected = getState(deps, "cfmBgRenameSelected");
  const rangeMode = getState(deps, "cfmBgRenameRangeMode");
  const allSel = visible.length > 0 && visible.every((id) => selected.has(id));
  const toolbar = deps.$(
    `<div class="cfm-edit-toolbar"><button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button><button class="cfm-btn cfm-btn-sm cfm-edit-range ${rangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${rangeMode ? "(开)" : ""}</button><span class="cfm-edit-count">${selected.size > 0 ? `已选 ${selected.size} 项` : ""}</span><button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button></div>`,
  );
  toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allSel) visible.forEach((id) => selected.delete(id));
    else visible.forEach((id) => selected.add(id));
    renderFn();
  });
  toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setState(deps, "cfmBgRenameRangeMode", !getState(deps, "cfmBgRenameRangeMode"));
    if (getState(deps, "cfmBgRenameRangeMode")) setState(deps, "cfmBgRenameLastClicked", null);
    renderFn();
  });
  toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deps.exitBgRenameMode();
  });
  listContainer.prepend(toolbar);
}

export async function showBgRenamePopupCore(names, deps) {
  if (!names || names.length === 0) return;
  const isSingle = names.length === 1;
  const nameListHtml = buildNameListHtml(names, deps);

  if (isSingle) {
    const { base, ext } = getBaseAndExt(names[0]);
    const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">重命名背景</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>新名称${ext ? ` (扩展名 ${ext} 将自动保留)` : ""}</label><input type="text" class="cfm-edit-input" id="cfm-rename-input" value="${deps.escapeHtml(base)}" placeholder="输入新名称"></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
    const overlay = deps.$(popupHtml);
    deps.$("body").append(overlay);
    overlay.find("#cfm-rename-input").focus().select();
    return new Promise((resolve) => {
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if (deps.$(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const newBase = overlay.find("#cfm-rename-input").val().trim();
        overlay.remove();
        resolve({ mode: "single", newName: newBase + ext });
      });
      overlay.find(".cfm-edit-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") overlay.find(".cfm-edit-popup-cancel").trigger("click");
      });
    });
  }

  const baseNames = names.map((name) => getBaseAndExt(name).base);
  const individualListHtml = names
    .map((name) => {
      const { base, ext } = getBaseAndExt(name);
      const thumbUrl = deps.getBackgroundThumbnailUrl
        ? deps.getBackgroundThumbnailUrl(name)
        : "";
      return `<div class="cfm-rename-individual-row"><span class="cfm-rename-individual-thumb" style="background-image:url('${thumbUrl}');"></span><span class="cfm-rename-old-name" title="${deps.escapeHtml(name)}">${deps.escapeHtml(base)}<span style="color:#585b70">${deps.escapeHtml(ext)}</span></span><span class="cfm-rename-arrow">→</span><input type="text" class="cfm-rename-new-input" placeholder="留空则不修改" data-old-name="${deps.escapeHtml(name)}" data-ext="${deps.escapeHtml(ext)}"></div>`;
    })
    .join("");
  const popupHtml = `<div class="cfm-edit-popup-overlay"><div class="cfm-edit-popup"><div class="cfm-edit-popup-title">批量重命名背景</div><div class="cfm-edit-popup-names">${nameListHtml}</div><div class="cfm-edit-popup-field"><label>操作类型</label><select class="cfm-edit-input" id="cfm-rename-action"><option value="add-prefix">增加前缀</option><option value="add-suffix">增加后缀(扩展名前)</option><option value="del-prefix">删除前缀</option><option value="del-suffix">删除后缀(扩展名前)</option><option value="same-name-suffix">重命名为同名并自动后缀</option><option value="individual">逐个重命名</option></select></div><div class="cfm-edit-popup-field" id="cfm-rename-base-field"><label id="cfm-rename-base-label">新名称</label><input type="text" class="cfm-edit-input" id="cfm-rename-base" placeholder="输入新名称"></div><div class="cfm-edit-popup-field" id="cfm-rename-text-field"><label id="cfm-rename-text-label">前缀内容</label><input type="text" class="cfm-edit-input" id="cfm-rename-text" placeholder="输入前缀内容"></div><div class="cfm-edit-popup-field cfm-rename-auto-detect" style="display:none;"><label>自动检测到的公共前/后缀</label><div id="cfm-rename-detected" class="cfm-rename-detected"></div></div><div class="cfm-rename-individual-field" id="cfm-rename-individual-field"><label>逐个指定新名称（留空则不修改，扩展名自动保留）</label><div class="cfm-rename-individual-list">${individualListHtml}</div></div><div class="cfm-edit-popup-actions"><button class="cfm-btn cfm-edit-popup-cancel">取消</button><button class="cfm-btn cfm-edit-popup-confirm">确认</button></div></div></div>`;
  const overlay = deps.$(popupHtml);
  deps.$("body").append(overlay);

  function updateRenameUI() {
    const action = overlay.find("#cfm-rename-action").val();
    const textLabel = overlay.find("#cfm-rename-text-label");
    const textInput = overlay.find("#cfm-rename-text");
    const autoDetect = overlay.find(".cfm-rename-auto-detect");
    const detected = overlay.find("#cfm-rename-detected");
    const baseField = overlay.find("#cfm-rename-base-field");
    const textField = overlay.find("#cfm-rename-text-field");
    const baseInput = overlay.find("#cfm-rename-base");
    const individualField = overlay.find("#cfm-rename-individual-field");
    const namesBlock = overlay.find(".cfm-edit-popup-names");
    if (action === "individual") {
      baseField.hide();
      textField.hide();
      autoDetect.hide();
      namesBlock.hide();
      individualField.show();
      individualField.find(".cfm-rename-new-input").first().focus();
    } else if (action === "same-name-suffix") {
      individualField.hide();
      namesBlock.show();
      baseField.show();
      textField.show();
      overlay.find("#cfm-rename-base-label").text("新名称");
      baseInput.attr("placeholder", "例如 xxx");
      textLabel.text("后缀格式");
      textInput.attr("placeholder", "例如 (1) 或 -1，第一项保持原名");
      autoDetect.hide();
    } else if (action === "add-prefix") {
      individualField.hide();
      namesBlock.show();
      baseField.hide();
      textField.show();
      textLabel.text("前缀内容");
      textInput.attr("placeholder", "输入要添加的前缀");
      autoDetect.hide();
    } else if (action === "add-suffix") {
      individualField.hide();
      namesBlock.show();
      baseField.hide();
      textField.show();
      textLabel.text("后缀内容(扩展名前)");
      textInput.attr("placeholder", "输入要添加的后缀");
      autoDetect.hide();
    } else if (action === "del-prefix") {
      individualField.hide();
      namesBlock.show();
      baseField.hide();
      textField.show();
      textLabel.text("要删除的前缀");
      textInput.attr("placeholder", "输入要删除的前缀，或点击下方自动检测结果");
      const prefix = findCommonPrefixCore(baseNames);
      detected.html(prefix ? `<span class="cfm-rename-detect-item" data-value="${deps.escapeHtml(prefix)}">${deps.escapeHtml(prefix)}</span>` : '<span class="cfm-rename-detect-none">未检测到公共前缀</span>');
      autoDetect.show();
    } else if (action === "del-suffix") {
      individualField.hide();
      namesBlock.show();
      baseField.hide();
      textField.show();
      textLabel.text("要删除的后缀(扩展名前)");
      textInput.attr("placeholder", "输入要删除的后缀，或点击下方自动检测结果");
      const suffix = findCommonSuffixCore(baseNames);
      detected.html(suffix ? `<span class="cfm-rename-detect-item" data-value="${deps.escapeHtml(suffix)}">${deps.escapeHtml(suffix)}</span>` : '<span class="cfm-rename-detect-none">未检测到公共后缀</span>');
      autoDetect.show();
    }
  }

  updateRenameUI();
  overlay.find("#cfm-rename-action").on("change", updateRenameUI);
  overlay.on("click", ".cfm-rename-detect-item", function () {
    overlay.find("#cfm-rename-text").val(deps.$(this).data("value"));
  });
  overlay.find("#cfm-rename-base").focus().select();

  return new Promise((resolve) => {
    overlay.find(".cfm-edit-popup-cancel").on("click", () => {
      overlay.remove();
      resolve(null);
    });
    overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
      if (deps.$(e.target).hasClass("cfm-edit-popup-overlay")) {
        overlay.remove();
        resolve(null);
      }
    });
    overlay.find(".cfm-edit-popup-confirm").on("click", () => {
      const action = overlay.find("#cfm-rename-action").val();
      if (action === "individual") {
        const renameMap = {};
        overlay.find(".cfm-rename-individual-row").each(function () {
          const input = deps.$(this).find(".cfm-rename-new-input");
          const oldName = input.data("old-name");
          const ext = input.data("ext") || "";
          const newBase = input.val().trim();
          if (newBase) renameMap[oldName] = newBase + ext;
        });
        overlay.remove();
        resolve({ mode: "individual", renameMap });
      } else {
        const base = overlay.find("#cfm-rename-base").val().trim();
        const text = overlay.find("#cfm-rename-text").val().trim();
        overlay.remove();
        resolve({ mode: "batch", action, base, text });
      }
    });
    overlay.find("#cfm-rename-base, #cfm-rename-text").on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        overlay.find(".cfm-edit-popup-confirm").trigger("click");
      }
      if (e.key === "Escape") overlay.find(".cfm-edit-popup-cancel").trigger("click");
    });
  });
}

export async function executeBgRenameCore(names, deps) {
  const result = await deps.showBgRenamePopup(names);
  if (!result) return;
  const headers = deps.getRequestHeaders();
  const renameOne = async (oldName, newName) => {
    const resp = await deps.fetch("/api/backgrounds/rename", {
      method: "POST",
      headers,
      body: JSON.stringify({ old_bg: oldName, new_bg: newName }),
    });
    if (!resp.ok) return false;
    deps.$("#bg_menu_content .bg_example")
      .filter(function () {
        return deps.$(this).attr("bgfile") === oldName;
      })
      .attr("bgfile", newName)
      .attr("title", newName);
    deps.updateSettingsAfterRename("backgrounds", oldName, newName);
    return true;
  };

  if (result.mode === "single") {
    const oldName = names[0];
    const newName = result.newName;
    if (!newName) {
      deps.cfmToastr.warning("请输入新名称");
      return;
    }
    if (newName === oldName) {
      deps.cfmToastr.info("名称未变更");
      return;
    }
    try {
      const ok = await renameOne(oldName, newName);
      if (!ok) {
        deps.cfmToastr.error("重命名背景失败");
        return;
      }
      deps.cfmToastr.success(`已将「${deps.getBackgroundDisplayName(oldName)}」重命名为「${deps.getBackgroundDisplayName(newName)}」`);
    } catch (error) {
      deps.console.error("[CFM] 背景重命名失败", error);
      deps.cfmToastr.error(`重命名失败: ${error.message}`);
      return;
    }
  } else if (result.mode === "batch") {
    const { action, base, text } = result;
    if (action === "same-name-suffix" && !base) {
      deps.cfmToastr.warning("请输入新名称");
      return;
    }
    if (action !== "same-name-suffix" && !text) {
      deps.cfmToastr.warning("请输入内容");
      return;
    }
    let success = 0;
    let skipped = 0;
    let failed = 0;
    const batchProgress = deps.showBatchProgressOverlay("正在批量重命名背景", names.length);
    let processed = 0;
    for (let i = 0; i < names.length; i++) {
      const oldName = names[i];
      const { base: baseName, ext } = getBaseAndExt(oldName);
      let newBase;
      if (action === "add-prefix") newBase = text + baseName;
      else if (action === "add-suffix") newBase = baseName + text;
      else if (action === "same-name-suffix") newBase = i === 0 ? base : `${base}${buildAutoIncrementSuffixCore(text, i)}`;
      else if (action === "del-prefix") {
        if (!baseName.startsWith(text)) {
          skipped++;
          processed++;
          batchProgress.update(processed);
          continue;
        }
        newBase = baseName.substring(text.length);
      } else if (action === "del-suffix") {
        if (!baseName.endsWith(text)) {
          skipped++;
          processed++;
          batchProgress.update(processed);
          continue;
        }
        newBase = baseName.substring(0, baseName.length - text.length);
      }
      const newName = newBase + ext;
      if (!newBase || newName === oldName) {
        skipped++;
        processed++;
        batchProgress.update(processed);
        continue;
      }
      try {
        const ok = await renameOne(oldName, newName);
        if (ok) success++;
        else failed++;
      } catch (error) {
        deps.console.warn(`[CFM] 重命名背景 ${oldName} 失败`, error);
        failed++;
      }
      processed++;
      batchProgress.update(processed);
    }
    let msg = `已重命名 ${success} 个背景`;
    if (skipped > 0) msg += `，${skipped} 个因前/后缀不匹配或名称冲突而跳过`;
    if (failed > 0) msg += `，${failed} 个失败`;
    batchProgress.done(msg);
    if (success > 0) deps.cfmToastr.success(msg);
    else deps.cfmToastr.warning(msg);
  } else if (result.mode === "individual") {
    const { renameMap } = result;
    const entries = Object.entries(renameMap);
    if (entries.length === 0) {
      deps.cfmToastr.info("所有名称均留空，未执行任何重命名");
      deps.renderBackgroundsView();
      return;
    }
    let success = 0;
    let skipped = 0;
    let failed = 0;
    const batchProgress = deps.showBatchProgressOverlay("正在逐个重命名背景", entries.length);
    let processed = 0;
    for (const [oldName, newName] of entries) {
      if (newName === oldName) {
        skipped++;
        processed++;
        batchProgress.update(processed);
        continue;
      }
      try {
        const ok = await renameOne(oldName, newName);
        if (ok) success++;
        else failed++;
      } catch (error) {
        deps.console.warn(`[CFM] 重命名背景 ${oldName} 失败`, error);
        failed++;
      }
      processed++;
      batchProgress.update(processed);
    }
    let msg = `已重命名 ${success} 个背景`;
    const totalSkipped = names.length - entries.length + skipped;
    if (totalSkipped > 0) msg += `，${totalSkipped} 个未修改（留空或跳过）`;
    if (failed > 0) msg += `，${failed} 个失败`;
    batchProgress.done(msg);
    if (success > 0) deps.cfmToastr.success(msg);
    else deps.cfmToastr.info(msg);
  }

  await refreshNativeBackgrounds(deps);
}

export function findCommonPrefixCore(names) {
  if (names.length === 0) return "";
  let prefix = names[0];
  for (let i = 1; i < names.length; i++) {
    while (names[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

export function findCommonSuffixCore(names) {
  if (names.length === 0) return "";
  const reversed = names.map((name) => name.split("").reverse().join(""));
  let suffix = reversed[0];
  for (let i = 1; i < reversed.length; i++) {
    while (reversed[i].indexOf(suffix) !== 0) {
      suffix = suffix.substring(0, suffix.length - 1);
      if (!suffix) return "";
    }
  }
  return suffix.split("").reverse().join("");
}

export function buildAutoIncrementSuffixCore(pattern, index) {
  if (index <= 0) return "";
  const suffix = String(pattern || "");
  if (index === 1) return suffix;
  const hasNumber = /(\d+)(?!.*\d)/.test(suffix);
  if (hasNumber) {
    return suffix.replace(/(\d+)(?!.*\d)/, String(index));
  }
  return `${suffix}${index}`;
}
