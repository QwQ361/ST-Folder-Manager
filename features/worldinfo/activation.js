// 世界书激活控制文件：负责世界书条目的启用、关闭、状态同步与应用结果整理，并为分组手动应用和自动应用提供统一的激活执行接口。

export function getCharBoundWorldBooksCore(deps) {
  const bound = new Set();
  try {
    const wiMod = deps.getWiModuleSync();
    const worldInfoObj = wiMod ? wiMod.world_info : null;
    const ctx = deps.getContext();
    const charId = ctx.characterId;
    if (charId !== undefined && charId !== null) {
      const characters = ctx.characters || deps.getCharacters();
      const ch = characters[charId];
      if (ch?.data?.extensions?.world) {
        bound.add(ch.data.extensions.world);
      }
    }

    if (worldInfoObj?.charLore && Array.isArray(worldInfoObj.charLore)) {
      const characters = ctx.characters || deps.getCharacters();
      const currentChar =
        charId !== undefined && charId !== null ? characters[charId] : null;
      const fileName = currentChar?.avatar?.replace(/\.[^/.]+$/, "") ?? null;
      if (fileName) {
        const extraCharLore = worldInfoObj.charLore.find(
          (e) => e.name === fileName,
        );
        if (
          extraCharLore?.extraBooks &&
          Array.isArray(extraCharLore.extraBooks)
        ) {
          extraCharLore.extraBooks.forEach((b) => bound.add(b));
        }
      }
    }
  } catch (e) {
    deps.console.warn("[CFM] 获取角色关联世界书失败", e);
  }
  return bound;
}

export function isWorldInfoActiveCore(name, deps) {
  const wiMod = deps.getWiModuleSync();
  if (wiMod && Array.isArray(wiMod.selected_world_info)) {
    return wiMod.selected_world_info.includes(name);
  }

  const select = deps.$("#world_info");
  const selectedNames = [];
  select.find("option:selected").each(function () {
    selectedNames.push(deps.$(this).text());
  });
  return selectedNames.includes(name);
}

export function getActiveWorldInfoSetCore(deps) {
  const wiMod = deps.getWiModuleSync();
  if (wiMod && Array.isArray(wiMod.selected_world_info)) {
    return new Set(wiMod.selected_world_info);
  }

  const select = deps.$("#world_info");
  const names = new Set();
  select.find("option:selected").each(function () {
    names.add(deps.$(this).text());
  });
  return names;
}

export function getExistingWorldInfoNameSetCore(deps) {
  const names = [];
  try {
    const cachedNames = deps.getCachedWorldInfoNames();
    if (Array.isArray(cachedNames)) {
      for (const name of cachedNames) {
        const normalizedName = String(name || "").trim();
        if (normalizedName) names.push(normalizedName);
      }
    }
    deps.$("#world_editor_select option").each(function () {
      const name = deps.$(this).text().trim();
      if (name) names.push(name);
    });
    deps.$("#world_info option").each(function () {
      const name = deps.$(this).text().trim();
      if (name) names.push(name);
    });
    const detachedOptions = deps.getWorldInfoDetachedOptions();
    if (detachedOptions && detachedOptions.length > 0) {
      for (const opt of detachedOptions) {
        const name = deps.$(opt).text().trim();
        if (name) names.push(name);
      }
    }
  } catch (e) {
    deps.console.warn("[CFM] 获取世界书列表失败", e);
  }
  return new Set(names.filter(Boolean));
}

export function filterExistingWorldInfoNamesCore(bookNames, existingNameSet, deps) {
  const validNameSet = existingNameSet || deps.getExistingWorldInfoNameSet();
  return Array.from(
    new Set(
      (Array.isArray(bookNames) ? bookNames : [])
        .map((name) => String(name || "").trim())
        .filter((name) => name && validNameSet.has(name)),
    ),
  );
}

export async function toggleWorldInfoActivationCore(name, activate, deps) {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return false;
  const existingNameSet = deps.getExistingWorldInfoNameSet();
  if (!existingNameSet.has(normalizedName)) {
    deps.console.info(`[CFM] 已跳过不存在的世界书激活切换：${normalizedName}`);
    return false;
  }
  try {
    const wiModule = await deps.ensureWiModule();
    const selectedWI = wiModule.selected_world_info;
    const worldNames = wiModule.world_names;
    const idx = selectedWI.indexOf(normalizedName);
    if (activate && idx === -1) {
      selectedWI.push(normalizedName);
    } else if (!activate && idx !== -1) {
      selectedWI.splice(idx, 1);
    }

    const wiIdx = worldNames.indexOf(normalizedName);
    if (wiIdx !== -1) {
      deps.$("#world_info")
        .find(`option[value='${wiIdx}']`)
        .prop("selected", activate);
    }
    deps.$("#world_info").trigger("change");
    return true;
  } catch (e) {
    deps.console.error("[CFM] 切换世界书激活状态失败", e);
    return false;
  }
}

export async function applyWorldInfoPresetCore(bookNames, charBound, deps) {
  try {
    const wiModule = await deps.ensureWiModule();
    const selectedWI = wiModule.selected_world_info;
    const worldNames = wiModule.world_names;
    const existingNameSet = deps.getExistingWorldInfoNameSet();
    for (const name of Array.isArray(worldNames) ? worldNames : []) {
      const normalizedName = String(name || "").trim();
      if (normalizedName) existingNameSet.add(normalizedName);
    }
    const filteredBookNames = deps.filterExistingWorldInfoNames(
      bookNames,
      existingNameSet,
    );
    const targetSet = new Set(filteredBookNames);

    for (let i = selectedWI.length - 1; i >= 0; i--) {
      const selectedName = String(selectedWI[i] || "").trim();
      if (
        !existingNameSet.has(selectedName) ||
        (!charBound.has(selectedName) && !targetSet.has(selectedName))
      ) {
        selectedWI.splice(i, 1);
      }
    }

    for (const name of filteredBookNames) {
      if (!charBound.has(name) && !selectedWI.includes(name)) {
        selectedWI.push(name);
      }
    }

    deps.$("#world_info")
      .find("option")
      .each(function () {
        const optName = deps.$(this).text().trim();
        if (charBound.has(optName)) return;
        deps.$(this).prop("selected", selectedWI.includes(optName));
      });
    deps.$("#world_info").trigger("change");
  } catch (e) {
    deps.console.error("[CFM] 应用世界书分组预设失败", e);
  }
}
