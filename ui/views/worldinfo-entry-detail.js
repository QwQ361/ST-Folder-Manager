// 世界书条目详情视图：buildWorldInfoEntryDetailHtml，渲染世界书条目的编辑卡片 HTML。
export function createWorldInfoEntryDetailApi(deps) {
  const { escapeHtml } = deps;

  function buildWorldInfoEntryDetailHtml(entry) {
    const r = entry.raw || {};
    // --- 辅助：三态布尔 select 选项 ---
    const triStateOpts = (val) => {
      const isNull = val === null || val === undefined;
      return `<option value="null"${isNull ? " selected" : ""}>使用全局</option><option value="true"${val === true ? " selected" : ""}>是</option><option value="false"${val === false ? " selected" : ""}>否</option>`;
    };
    // --- 辅助：selectiveLogic 选项 ---
    const logicVal = Number(r.selectiveLogic ?? 0);
    const logicOpts = [
      { v: 0, l: "AND ANY" },
      { v: 3, l: "AND ALL" },
      { v: 1, l: "NOT ALL" },
      { v: 2, l: "NOT ANY" },
    ]
      .map(
        (o) =>
          `<option value="${o.v}"${logicVal === o.v ? " selected" : ""}>${o.l}</option>`,
      )
      .join("");
    // --- 辅助：triggers checkboxes ---
    const triggersArr = Array.isArray(r.triggers) ? r.triggers : [];
    const triggerOptions = [
      { v: "normal", l: "常规" },
      { v: "continue", l: "继续" },
      { v: "impersonate", l: "扮演" },
      { v: "swipe", l: "滑动" },
      { v: "regenerate", l: "重生成" },
      { v: "quiet", l: "静默" },
    ];
    const triggersHtml = triggerOptions
      .map(
        (o) =>
          `<label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_trigger" value="${o.v}"${triggersArr.includes(o.v) ? " checked" : ""} />${o.l}</label>`,
      )
      .join("");
    // --- 辅助：characterFilter ---
    const charFilter = r.characterFilter || {};
    const charFilterNames = Array.isArray(charFilter.names)
      ? charFilter.names.join(", ")
      : "";
    const charFilterTags = Array.isArray(charFilter.tags)
      ? charFilter.tags.join(", ")
      : "";
    const charFilterStr = [charFilterNames, charFilterTags]
      .filter(Boolean)
      .join(", ");
    const charFilterExclude = !!charFilter.isExclude;
    // --- 辅助：delayUntilRecursion ---
    const durVal = r.delayUntilRecursion;
    const durChecked = !!durVal;
    const durLevel =
      typeof durVal === "number"
        ? durVal
        : typeof durVal === "string"
          ? durVal
          : "";
    // --- 主触发词 / 次触发词 ---
    const primaryKeysStr = entry.primaryKeys.join(", ");
    const secondaryKeysStr = entry.secondaryKeys.join(", ");

    return `
      <div class="cfm-persona-detail-card cfm-preset-detail-card cfm-worldinfo-entry-detail-card cfm-wi-de" data-entry-uid="${escapeHtml(entry.uid)}">
        <!-- 区域1: 关键词与逻辑 -->
        <div class="cfm-wi-de-section">
          <div class="cfm-wi-de-row cfm-wi-de-keys-row">
            <div class="cfm-wi-de-field cfm-wi-de-field-flex">
              <label class="cfm-wi-de-label">主触发词</label>
              <textarea class="cfm-wi-de-input cfm-wi-de-keys" name="cfm_wi_key" rows="2" placeholder="逗号分隔的关键词">${escapeHtml(primaryKeysStr)}</textarea>
            </div>
            <div class="cfm-wi-de-field cfm-wi-de-field-narrow">
              <label class="cfm-wi-de-label">逻辑</label>
              <select class="cfm-wi-de-select" name="cfm_wi_logic">${logicOpts}</select>
            </div>
            <div class="cfm-wi-de-field cfm-wi-de-field-flex">
              <label class="cfm-wi-de-label">次触发词</label>
              <textarea class="cfm-wi-de-input cfm-wi-de-keys" name="cfm_wi_keysecondary" rows="2" placeholder="逗号分隔（为空则忽略）">${escapeHtml(secondaryKeysStr)}</textarea>
            </div>
          </div>
        </div>
        <!-- 区域2: 条目名称 -->
        <div class="cfm-wi-de-section">
          <label class="cfm-wi-de-label">条目名称 (Comment)</label>
          <textarea class="cfm-wi-de-input" name="cfm_wi_comment" rows="2" placeholder="条目的备注/标签">${escapeHtml(entry.comment)}</textarea>
        </div>
        <!-- 区域3: 内容 -->
        <div class="cfm-wi-de-section">
          <div class="cfm-wi-de-row cfm-wi-de-content-header">
            <label class="cfm-wi-de-label">内容 (Content)</label>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
              <button type="button" class="cfm-btn cfm-btn-sm cfm-worldinfo-entry-collapse-btn" data-entry-uid="${escapeHtml(entry.uid)}" title="收起当前条目并定位回该条目"><i class="fa-solid fa-chevron-up"></i> 收起并定位</button>
              <span class="cfm-wi-de-meta">UID: ${escapeHtml(entry.uid)} | Tokens: <span class="cfm-wi-de-token-count">计算中...</span></span>
            </div>
          </div>
          <textarea class="cfm-wi-de-input cfm-wi-de-content" name="cfm_wi_content" rows="6" placeholder="发送给 AI 的文本内容">${escapeHtml(entry.content)}</textarea>
        </div>
        <!-- 区域4: 条目覆盖设置 -->
        <div class="cfm-wi-de-section">
          <label class="cfm-wi-de-label cfm-wi-de-section-title">条目覆盖设置</label>
          <div class="cfm-wi-de-row cfm-wi-de-grid">
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">Outlet名称</label>
              <input class="cfm-wi-de-input" name="cfm_wi_outletName" type="text" value="${escapeHtml(r.outletName || "")}" placeholder="Outlet Name" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">扫描深度</label>
              <input class="cfm-wi-de-input" name="cfm_wi_scanDepth" type="number" value="${r.scanDepth ?? ""}" placeholder="使用全局" max="1000" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">区分大小写</label>
              <select class="cfm-wi-de-select" name="cfm_wi_caseSensitive">${triStateOpts(r.caseSensitive ?? null)}</select>
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">全词匹配</label>
              <select class="cfm-wi-de-select" name="cfm_wi_matchWholeWords">${triStateOpts(r.matchWholeWords ?? null)}</select>
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">分组评分</label>
              <select class="cfm-wi-de-select" name="cfm_wi_useGroupScoring">${triStateOpts(r.useGroupScoring ?? null)}</select>
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">自动化ID</label>
              <input class="cfm-wi-de-input" name="cfm_wi_automationId" type="text" value="${escapeHtml(r.automationId || "")}" placeholder="(无)" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">递归层级</label>
              <input class="cfm-wi-de-input" name="cfm_wi_recursionLevel" type="text" value="${escapeHtml(String(durLevel))}" placeholder="1" />
            </div>
          </div>
        </div>
        <!-- 区域5: 分组与时间控制 -->
        <div class="cfm-wi-de-section">
          <label class="cfm-wi-de-label cfm-wi-de-section-title">分组与时间控制</label>
          <div class="cfm-wi-de-row cfm-wi-de-grid">
            <div class="cfm-wi-de-field cfm-wi-de-field-wide">
              <label class="cfm-wi-de-label">包含组</label>
              <input class="cfm-wi-de-input" name="cfm_wi_group" type="text" value="${escapeHtml(r.group || "")}" placeholder="分组标签（逗号分隔）" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">组权重</label>
              <input class="cfm-wi-de-input" name="cfm_wi_groupWeight" type="number" value="${r.groupWeight ?? 100}" min="1" max="999999" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">粘性</label>
              <input class="cfm-wi-de-input" name="cfm_wi_sticky" type="number" value="${r.sticky ?? ""}" placeholder="无" min="0" max="999999" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">冷却</label>
              <input class="cfm-wi-de-input" name="cfm_wi_cooldown" type="number" value="${r.cooldown ?? ""}" placeholder="无" min="0" max="999999" />
            </div>
            <div class="cfm-wi-de-field">
              <label class="cfm-wi-de-label">延迟</label>
              <input class="cfm-wi-de-input" name="cfm_wi_delay" type="number" value="${r.delay ?? ""}" placeholder="无" min="0" max="999999" />
            </div>
          </div>
          <div class="cfm-wi-de-row">
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_groupOverride"${r.groupOverride ? " checked" : ""} />优先此条目 (Prioritize)</label>
          </div>
        </div>
        <!-- 区域6: 选项复选框 -->
        <div class="cfm-wi-de-section">
          <label class="cfm-wi-de-label cfm-wi-de-section-title">选项</label>
          <div class="cfm-wi-de-row cfm-wi-de-cb-grid">
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_excludeRecursion"${r.excludeRecursion ? " checked" : ""} />不可被递归激活</label>
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_preventRecursion"${r.preventRecursion ? " checked" : ""} />阻止进一步递归</label>
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_delayUntilRecursion"${durChecked ? " checked" : ""} />延迟到递归</label>
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_ignoreBudget"${r.ignoreBudget ? " checked" : ""} />忽略预算</label>
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_selective"${r.selective ? " checked" : ""} />选择性 (Selective)</label>
            <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_useProbability"${r.useProbability !== false ? " checked" : ""} />使用概率</label>
          </div>
        </div>
        <!-- 区域7: 过滤器 -->
        <div class="cfm-wi-de-section">
          <label class="cfm-wi-de-label cfm-wi-de-section-title">过滤器</label>
          <div class="cfm-wi-de-row">
            <div class="cfm-wi-de-field cfm-wi-de-field-flex">
              <label class="cfm-wi-de-label">角色/标签过滤</label>
              <input class="cfm-wi-de-input" name="cfm_wi_charFilter" type="text" value="${escapeHtml(charFilterStr)}" placeholder="角色名或标签（逗号分隔）" />
            </div>
            <label class="cfm-wi-de-cb-label cfm-wi-de-cb-inline"><input type="checkbox" name="cfm_wi_charFilterExclude"${charFilterExclude ? " checked" : ""} />排除</label>
          </div>
          <div class="cfm-wi-de-row">
            <div class="cfm-wi-de-field cfm-wi-de-field-flex">
              <label class="cfm-wi-de-label">生成类型触发</label>
              <div class="cfm-wi-de-cb-row">${triggersHtml}</div>
            </div>
          </div>
        </div>
        <!-- 区域8: 额外匹配源（可折叠） -->
        <div class="cfm-wi-de-section cfm-wi-de-collapsible">
          <div class="cfm-wi-de-collapse-header">
            <label class="cfm-wi-de-label cfm-wi-de-section-title">额外匹配源</label>
            <i class="fa-solid fa-chevron-down cfm-wi-de-collapse-icon"></i>
          </div>
          <div class="cfm-wi-de-collapse-body" style="display:none;">
            <div class="cfm-wi-de-row cfm-wi-de-cb-grid">
              <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_matchCharacterDescription"${r.matchCharacterDescription ? " checked" : ""} />角色描述</label>
              <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_matchCharacterPersonality"${r.matchCharacterPersonality ? " checked" : ""} />角色个性</label>
              <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_matchScenario"${r.matchScenario ? " checked" : ""} />场景</label>
              <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_matchPersonaDescription"${r.matchPersonaDescription ? " checked" : ""} />角色面具描述</label>
              <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_matchCharacterDepthPrompt"${r.matchCharacterDepthPrompt ? " checked" : ""} />角色深度提示</label>
              <label class="cfm-wi-de-cb-label"><input type="checkbox" name="cfm_wi_matchCreatorNotes"${r.matchCreatorNotes ? " checked" : ""} />创作者注释</label>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return { buildWorldInfoEntryDetailHtml };
}
