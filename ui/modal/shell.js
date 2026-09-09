// 主弹窗壳层：承接 showMainPopup 拆分后的外壳 HTML、overlay 创建与初始挂载。
// 说明：popup/overlay 创建后被 showMainPopup 后续逻辑大量使用（popup.find(...)），
// 因此本模块返回 { overlay, popup, visibleTabs, menuTabs }，由调用方继续绑定事件。
// 其中 menuTabs/visibleTabs 被 showMainPopup 后续逻辑（如初始页签高亮、刷新标签栏）引用。
// 依赖注入：$、window、cfmCopyMode、initialTab、CFM_TAB_META、getVisibleTabs、
//           getMenuTabs、extension_settings、extensionName。

export function buildMainPopupShell(deps) {
  const {
    $,
    window,
    cfmCopyMode,
    initialTab,
    CFM_TAB_META,
    getVisibleTabs,
    getMenuTabs,
    extension_settings,
    extensionName,
    getPcDragData,
  } = deps;

  const overlay = $('<div id="cfm-overlay"></div>');
  if (
    window.innerWidth <= 768 &&
    extension_settings[extensionName].mobileTopbarAvoid !== false
  ) {
    overlay.addClass("cfm-topbar-avoid");
  }
  const visibleTabs = getVisibleTabs();
  const menuTabs = getMenuTabs();
  const activeVisibleTab = visibleTabs.includes(initialTab)
    ? initialTab
    : visibleTabs[0] || menuTabs[0] || "chars";
  const activeMenuTab = menuTabs.includes(initialTab);
  const popup = $(`
            <div id="cfm-popup">
                <div class="cfm-header">
                    <h3>📁 资源管理器</h3>
                    <div class="cfm-header-actions">
                        <button id="cfm-btn-copymode" class="cfm-copymode-btn ${cfmCopyMode ? "cfm-copymode-active" : ""}" title="${cfmCopyMode ? "当前：复制模式（拖拽角色会保留原位置）" : "当前：移动模式（拖拽角色会从原位置移除）"}"><i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}</button>
                        <button id="cfm-btn-entry-memo" title="缝合备忘录"><i class="fa-solid fa-clipboard-list"></i><span class="cfm-entry-memo-badge" style="display:none;"></span></button>
                        <button id="cfm-btn-theme" title="自定义外观"><i class="fa-solid fa-palette"></i></button>
                        <button id="cfm-btn-config" title="标签管理"><i class="fa-solid fa-gear"></i></button>
                        <button id="cfm-btn-backup" title="导入/导出"><i class="fa-solid fa-arrow-right-arrow-left"></i></button>
                        <button class="cfm-btn-close" id="cfm-btn-close-main">&times;</button>
                    </div>
                </div>
                <div class="cfm-resource-tabs">
                    ${
                      menuTabs.length
                        ? `<div class="cfm-tab-menu-wrap"><button type="button" class="cfm-tab cfm-tab-menu-btn ${activeMenuTab ? "cfm-tab-active" : ""}" aria-expanded="false" title="更多标签页"><i class="fa-solid fa-ellipsis"></i></button><div class="cfm-tab-menu-dropdown">${menuTabs
                            .map((tabId) => {
                              const meta = CFM_TAB_META.find(
                                (m) => m.id === tabId,
                              );
                              if (!meta) return "";
                              const isActive =
                                tabId === initialTab
                                  ? "cfm-tab-menu-item-active"
                                  : "";
                              return `<button type="button" class="cfm-tab-menu-item ${isActive}" data-tab="${tabId}"><i class="fa-solid ${meta.icon}"></i><span>${meta.label}</span></button>`;
                            })
                            .join("")}</div></div>`
                        : ""
                    }
                    ${visibleTabs
                      .map((tabId) => {
                        const meta = CFM_TAB_META.find((m) => m.id === tabId);
                        if (!meta) return "";
                        const isActive =
                          tabId === activeVisibleTab ? "cfm-tab-active" : "";
                        return `<div class="cfm-tab ${isActive}" data-tab="${tabId}"><i class="fa-solid ${meta.icon}"></i> ${meta.label}</div>`;
                      })
                      .join("")}
                </div>
                <div class="cfm-global-search-bar" id="cfm-global-search-bar">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-global-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="char">角色卡</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-preset-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-preset-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-preset-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-preset-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-preset-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="preset">预设</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-worldinfo-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-worldinfo-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-worldinfo-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-worldinfo-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-worldinfo-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="worldinfo">世界书</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-theme-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-theme-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-theme-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-theme-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-theme-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="theme">主题</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-bg-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-bg-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-bg-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-bg-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-bg-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="bg">背景</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-persona-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-persona-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-persona-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-persona-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-persona-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="persona">User</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-regex-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-regex-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-regex-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-regex-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-regex-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="script">正则脚本</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-qr-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-qr-global-search" placeholder="搜索..." />
                        <button class="cfm-search-clear-btn" id="cfm-qr-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-qr-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-qr-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="set">快速回复集</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-global-search-bar" id="cfm-chatlogs-search-bar" style="display:none;">
                    <div class="cfm-search-input-wrapper">
                        <input type="text" class="cfm-global-search-input" id="cfm-chatlogs-global-search" placeholder="搜索聊天记录..." />
                        <button class="cfm-search-clear-btn" id="cfm-chatlogs-search-clear" title="清空搜索"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <select id="cfm-chatlogs-search-scope" class="cfm-search-select" title="搜索范围">
                        <option value="current">当前文件夹</option>
                        <option value="all">全部文件夹</option>
                    </select>
                    <select id="cfm-chatlogs-search-type" class="cfm-search-select" title="搜索类型">
                        <option value="chatlog">聊天记录</option>
                        <option value="folder">文件夹</option>
                    </select>
                </div>
                <div class="cfm-dual-pane" id="cfm-chars-view">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="chars" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-rh-count"></span>
                            <button class="cfm-show-hidden-btn" id="cfm-show-hidden-char-btn" title="显示隐藏的角色卡"><i class="fa-regular fa-eye-slash"></i></button>
                            <button class="cfm-import-btn" id="cfm-import-char-btn" title="导入角色卡"><i class="fa-solid fa-file-import"></i></button>
                            <input type="file" id="cfm-import-char-file" multiple accept=".json,.png,.yaml,.yml,.charx,.byaf" style="display:none;">
                            <button class="cfm-chat-mode-btn" id="cfm-chat-mode-btn" title="显示聊天记录"><i class="fa-solid fa-comments"></i></button>
                            <button class="cfm-chat-mode-btn" id="cfm-char-regex-mode-btn" title="查看角色正则"><i class="fa-solid fa-code"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-edit-char-btn" title="快速编辑角色卡"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-export-btn" id="cfm-export-char-btn" title="导出角色卡"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-char-btn" title="删除角色卡"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-right-sort-btn" title="角色排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle" id="cfm-multisel-toggle" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-chatlogs-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="chatlogs" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <button id="cfm-chatlogs-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-chatlogs-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-chatlogs-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-chatlogs-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-chatlogs-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-chatlog-btn" title="导入聊天记录"><i class="fa-solid fa-file-import"></i></button>
                            <input type="file" id="cfm-import-chatlog-file" multiple accept=".json,.jsonl" style="display:none;">
                            <button class="cfm-edit-char-btn" id="cfm-chatlog-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-chatlog-rename-btn" title="重命名聊天记录"><i class="fa-solid fa-i-cursor"></i></button>
                            <button class="cfm-export-btn" id="cfm-export-chatlog-btn" title="导出聊天记录"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-chatlog-btn" title="删除聊天记录"><i class="fa-solid fa-trash-can"></i></button>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-chatlogs" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-chatlogs-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-presets-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="presets" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-preset-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-preset-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-preset-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-preset-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-preset-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-preset-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-preset-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-preset-btn" title="导入预设"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-chat-mode-btn" id="cfm-preset-regex-mode-btn" title="查看预设正则"><i class="fa-solid fa-code"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-preset-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-preset-rename-btn" title="重命名预设"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-preset-file" multiple accept=".json" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-preset-btn" title="导出预设"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-preset-btn" title="删除预设"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-preset-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-preset-right-sort-btn" title="预设排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-preset" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-preset-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-worldinfo-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="worldinfo" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-worldinfo-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-worldinfo-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-worldinfo-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-worldinfo-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                                <button id="cfm-charbook-classify-btn" title="角色世界书归类"><i class="fa-solid fa-user-tag"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-worldinfo-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <button class="cfm-edit-char-btn" id="cfm-wi-preset-btn" title="世界书激活分组"><i class="fa-solid fa-layer-group"></i></button>
                            <span class="cfm-rh-path" id="cfm-worldinfo-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-worldinfo-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-worldinfo-btn" title="导入世界书"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-worldinfo-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-worldinfo-rename-btn" title="重命名世界书"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-worldinfo-file" multiple accept=".json,.png" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-worldinfo-btn" title="导出世界书"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-worldinfo-btn" title="删除世界书"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-worldinfo-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-worldinfo-right-sort-btn" title="世界书排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-worldinfo" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-worldinfo-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-themes-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="themes" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-theme-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-theme-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-theme-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-theme-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-theme-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-theme-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-theme-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-theme-btn" title="导入主题"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-theme-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-theme-rename-btn" title="重命名主题"><i class="fa-solid fa-i-cursor"></i></button>
                            <input type="file" id="cfm-import-theme-file" multiple accept=".json" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-theme-btn" title="导出主题"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-theme-btn" title="删除主题"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-theme-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-theme-right-sort-btn" title="主题排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-theme" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-theme-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-backgrounds-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="backgrounds" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-bg-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-bg-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-bg-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-bg-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-bg-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-bg-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-bg-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-bg-btn" title="导入背景"><i class="fa-solid fa-file-import"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-bg-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-bg-rename-btn" title="重命名背景"><i class="fa-solid fa-i-cursor"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-bg-default-btn" title="设置默认背景"><i class="fa-solid fa-image"></i></button>
                            <input type="file" id="cfm-import-bg-file" multiple accept="image/*" style="display:none;">
                            <button class="cfm-export-btn" id="cfm-export-bg-btn" title="导出背景"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-bg-btn" title="删除背景"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-bg-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-bg-right-sort-btn" title="背景排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-bg" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-bg-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                         </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-personas-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>文件夹</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="personas" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-persona-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-persona-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-persona-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-persona-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-persona-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <span class="cfm-rh-path" id="cfm-persona-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-persona-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-persona-btn" title="导入User"><i class="fa-solid fa-file-import"></i></button>
                            <input type="file" id="cfm-import-persona-file" multiple accept=".json" style="display:none;">
                            <button class="cfm-edit-char-btn" id="cfm-persona-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-export-btn" id="cfm-export-persona-btn" title="导出User"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-persona-btn" title="删除User"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-persona-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-persona-right-sort-btn" title="User排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-persona" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-persona-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看内容</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-regex-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>正则分类</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="regex" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <button id="cfm-regex-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-regex-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-regex-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <button class="cfm-edit-char-btn" id="cfm-regex-preset-btn" title="正则激活分组"><i class="fa-solid fa-layer-group"></i></button>
                            <span class="cfm-rh-path" id="cfm-regex-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-regex-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-regex-btn" title="导入正则"><i class="fa-solid fa-file-import"></i></button>
                            <input type="file" id="cfm-import-regex-file" accept=".json" multiple style="display:none;">
                            <button class="cfm-regex-create-btn" id="cfm-regex-create-btn" title="新建全局正则"><i class="fa-solid fa-plus"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-regex-transfer-btn" title="互通正则"><i class="fa-solid fa-right-left"></i></button>
                            <button class="cfm-export-btn" id="cfm-export-regex-btn" title="导出正则"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-regex-btn" title="删除正则"><i class="fa-solid fa-trash-can"></i></button>
                            <button class="cfm-regex-sort-btn" id="cfm-regex-sort-btn" title="排序正则脚本"><i class="fa-solid fa-arrow-up-short-wide"></i></button>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-regex" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-regex-right-list">
                            <div class="cfm-right-empty">← 点击左侧分类查看正则脚本</div>
                        </div>
                    </div>
                </div>
                <div class="cfm-dual-pane" id="cfm-qr-view" style="display:none;">
                    <div class="cfm-left-pane">
                        <div class="cfm-left-header">
                            <span>快速回复分类</span>
                            <span class="cfm-left-header-actions">
                                <button class="cfm-quick-add-folder-btn" data-tab="quickreply" title="新建文件夹"><i class="fa-solid fa-folder-plus"></i></button>
                                <div class="cfm-sort-wrapper" id="cfm-qr-left-sort-wrapper">
                                    <button class="cfm-sort-trigger" id="cfm-qr-left-sort-btn" title="排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                                </div>
                                <button id="cfm-qr-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                                <button id="cfm-qr-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
                            </span>
                        </div>
                        <div class="cfm-left-tree" id="cfm-qr-left-tree"></div>
                    </div>
                    <div class="cfm-right-pane">
                        <div class="cfm-right-header">
                            <button class="cfm-edit-char-btn" id="cfm-qr-preset-btn" title="快速回复激活分组"><i class="fa-solid fa-layer-group"></i></button>
                            <span class="cfm-rh-path" id="cfm-qr-rh-path">选择左侧文件夹查看内容</span>
                            <span class="cfm-rh-count" id="cfm-qr-rh-count"></span>
                            <button class="cfm-import-btn" id="cfm-import-qr-btn" title="导入快速回复集"><i class="fa-solid fa-file-import"></i></button>
                            <input type="file" id="cfm-import-qr-file" multiple accept=".json" style="display:none;">
                            <button class="cfm-edit-char-btn" id="cfm-qr-note-btn" title="编辑备注"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="cfm-edit-char-btn" id="cfm-qr-rename-btn" title="重命名快速回复集"><i class="fa-solid fa-i-cursor"></i></button>
                            <button class="cfm-export-btn" id="cfm-export-qr-btn" title="导出快速回复集"><i class="fa-solid fa-file-export"></i></button>
                            <button class="cfm-res-delete-btn" id="cfm-res-delete-qr-btn" title="删除快速回复集"><i class="fa-solid fa-trash-can"></i></button>
                            <div class="cfm-sort-wrapper" id="cfm-qr-right-sort-wrapper">
                                <button class="cfm-sort-trigger" id="cfm-qr-right-sort-btn" title="快速回复集排序"><i class="fa-solid fa-arrow-down-short-wide"></i></button>
                            </div>
                            <button class="cfm-multisel-toggle cfm-multisel-toggle-qr" title="多选模式"><i class="fa-solid fa-list-check"></i></button>
                        </div>
                        <div class="cfm-right-list" id="cfm-qr-right-list">
                            <div class="cfm-right-empty">← 点击左侧文件夹查看快速回复集</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
  overlay.append(popup);
  $("body").append(overlay);

  // 拦截插件内部拖拽冒泡到 body 上的 ST 原生 DragAndDropHandler：
  // ST 在 body 上全局绑定 dragover/dragleave/drop（见 scripts/dragdrop.js），
  // 插件拖角色/资源时若 drop 落在未显式处理的行上（如角色卡行本身只有 dragstart/dragend，
  // 没有行级 drop 处理），事件会冒泡到 body，触发 ST 把空 dataTransfer.files 当文件导入
  // （报"无法导入角色"toast），且 ST 的 handleDragOver 会给 body 加 dragover class 导致
  // 面板变淡（ST 主题 CSS 对 body.dragover 应用变淡效果）。这里在 popup 根统一拦截，
  // 只处理插件内部拖拽（_pcDragData 非空），不干扰 ST 自身拖文件导入。
  const isPcInternalDrag = () => {
    try {
      return !!(getPcDragData && getPcDragData());
    } catch {
      return false;
    }
  };
  // 只拦截 dragover 与 drop：
  // - dragover 拦截：ST 的 handleDragOver 会给 body 加 dragover class（面板变淡），
  //   必须阻止它收到内部拖拽的 dragover。
  // - drop 拦截：ST 的 handleDrop 会把空 dataTransfer.files 当文件导入（报"无法导入角色"），
  //   必须阻止它收到内部拖拽的 drop。
  // - dragleave 不拦截：ST 的 handleDragLeave 只负责移除 dragover class（清理），
  //   放行让 ST 能正常清理，避免 body.dragover 残留。
  popup.on("dragover", (e) => {
    if (!isPcInternalDrag()) return;
    e.preventDefault();
    e.stopPropagation();
  });
  popup.on("drop", (e) => {
    if (!isPcInternalDrag()) return;
    e.preventDefault();
    e.stopPropagation();
  });

  return { overlay, popup, visibleTabs, menuTabs };
}

// =====================================================================
// 移动端行为：左/右栏拖动高度调节 + 触摸滚动后的误触点击抑制
// 承接 showMainPopup 内 bindMobilePanePathDrag / bindMobileTapGuard 的拆分
// 依赖注入：$、window、popup（jQuery 对象）、extension_settings、extensionName
// =====================================================================
export function bindMainPopupMobileBehaviors(deps) {
  const { $, window, popup, extension_settings, extensionName } = deps;

  // ---------- 移动端：拖动右栏头部路径区调节左右栏高度 ----------
  const bindMobilePanePathDrag = () => {
    if (window.innerWidth > 768) return;
    const MIN_LEFT_PANE_HEIGHT = 160;
    const MIN_RIGHT_PANE_HEIGHT = 220;
    popup.find(".cfm-dual-pane").each(function () {
      const dualPane = this;
      const $dualPane = $(dualPane);
      const leftPane = dualPane.querySelector(".cfm-left-pane");
      const rightPane = dualPane.querySelector(".cfm-right-pane");
      const pathEl = dualPane.querySelector(".cfm-right-header .cfm-rh-path");
      const countEl = dualPane.querySelector(".cfm-right-header .cfm-rh-count");
      if (
        !leftPane ||
        !rightPane ||
        !pathEl ||
        pathEl.dataset.cfmPaneDragBound === "1"
      ) {
        return;
      }
      pathEl.dataset.cfmPaneDragBound = "1";
      pathEl.style.touchAction = "none";
      if (countEl) {
        countEl.style.touchAction = "none";
      }

      let dragging = false;
      let startY = 0;
      let startLeftHeight = 0;

      // ── 全屏模式辅助 ──
      let _fullscreenConfirmPending = false;

      const enterBottomFullscreen = () => {
        const mode =
          extension_settings[extensionName].mobileFullscreenMode || "to-search";
        $dualPane.addClass("cfm-bottom-fullscreen");
        // 清除旧模式class，应用当前模式
        $dualPane.removeClass(
          "cfm-fs-to-search cfm-fs-to-tabs cfm-fs-true-full",
        );
        $dualPane.addClass("cfm-fs-" + mode);
        // 在 popup 层面也添加模式class，用于控制 header/tabs/search 的显隐
        const $popup = $("#cfm-popup");
        $popup.removeClass(
          "cfm-fs-to-search cfm-fs-to-tabs cfm-fs-true-full cfm-bottom-fullscreen-active",
        );
        $popup.addClass("cfm-bottom-fullscreen-active cfm-fs-" + mode);
        // 确保退出按钮存在
        const $rightHeader = $(rightPane).find(".cfm-right-header");
        if (!$rightHeader.find(".cfm-exit-fullscreen-btn").length) {
          const exitBtn = $(
            '<button class="cfm-exit-fullscreen-btn" title="退出全屏"><i class="fa-solid fa-compress"></i></button>',
          );
          exitBtn.on("click touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            exitBottomFullscreen();
          });
          $rightHeader.prepend(exitBtn);
        }
      };

      const exitBottomFullscreen = () => {
        $dualPane.removeClass(
          "cfm-bottom-fullscreen cfm-fs-to-search cfm-fs-to-tabs cfm-fs-true-full",
        );
        // 清除 popup 层面的全屏class
        $("#cfm-popup").removeClass(
          "cfm-bottom-fullscreen-active cfm-fs-to-search cfm-fs-to-tabs cfm-fs-true-full",
        );
        // 恢复左侧面板默认高度
        leftPane.style.height = "";
        leftPane.style.maxHeight = "";
        leftPane.style.minHeight = "";
      };

      const showFullscreenConfirm = () => {
        if (_fullscreenConfirmPending) return;
        _fullscreenConfirmPending = true;
        // 创建确认弹窗
        const overlay = $('<div class="cfm-fullscreen-confirm-overlay"></div>');
        const dialog = $(`
          <div class="cfm-fullscreen-confirm-dialog">
            <div class="cfm-fullscreen-confirm-icon"><i class="fa-solid fa-expand"></i></div>
            <div class="cfm-fullscreen-confirm-title">下方内容区全屏</div>
            <div class="cfm-fullscreen-confirm-desc">将隐藏上方文件夹面板，内容区域全屏显示。可随时点击退出按钮恢复。</div>
            <div class="cfm-fullscreen-confirm-actions">
              <button class="cfm-btn cfm-fullscreen-cancel">取消</button>
              <button class="cfm-btn cfm-fullscreen-ok"><i class="fa-solid fa-check"></i> 确定</button>
            </div>
          </div>
        `);
        dialog.find(".cfm-fullscreen-ok").on("click touchend", (e) => {
          e.preventDefault();
          overlay.remove();
          dialog.remove();
          _fullscreenConfirmPending = false;
          enterBottomFullscreen();
        });
        dialog.find(".cfm-fullscreen-cancel").on("click touchend", (e) => {
          e.preventDefault();
          overlay.remove();
          dialog.remove();
          _fullscreenConfirmPending = false;
          // 保持在最顶部（最小高度），不恢复
        });
        overlay.on("click touchend", (e) => {
          e.preventDefault();
          overlay.remove();
          dialog.remove();
          _fullscreenConfirmPending = false;
          // 保持在最顶部（最小高度），不恢复
        });
        $("#cfm-popup").append(overlay).append(dialog);
      };

      const stopDrag = () => {
        if (!dragging) return;
        dragging = false;
        pathEl.classList.remove("cfm-rh-path-dragging");
        if (countEl) countEl.classList.remove("cfm-rh-path-dragging");
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", stopDrag);
        document.removeEventListener("pointercancel", stopDrag);
        // 检查是否拖到了最小值 → 触发全屏确认
        const currentHeight = leftPane.getBoundingClientRect().height;
        if (currentHeight <= MIN_LEFT_PANE_HEIGHT + 5) {
          showFullscreenConfirm();
        }
      };

      const onPointerMove = (ev) => {
        if (!dragging) return;
        ev.preventDefault();
        const rect = $dualPane[0].getBoundingClientRect();
        const totalHeight = rect.height;
        const deltaY = ev.clientY - startY;
        const nextLeftHeight = Math.min(
          Math.max(startLeftHeight + deltaY, MIN_LEFT_PANE_HEIGHT),
          Math.max(MIN_LEFT_PANE_HEIGHT, totalHeight - MIN_RIGHT_PANE_HEIGHT),
        );
        leftPane.style.height = `${nextLeftHeight}px`;
        leftPane.style.maxHeight = `${nextLeftHeight}px`;
        leftPane.style.minHeight = `${nextLeftHeight}px`;
      };

      const onPointerDown = (ev) => {
        if (window.innerWidth > 768) return;
        // 如果已经是全屏模式，不启动拖动
        if ($dualPane.hasClass("cfm-bottom-fullscreen")) return;
        dragging = true;
        startY = ev.clientY;
        startLeftHeight = leftPane.getBoundingClientRect().height;
        pathEl.classList.add("cfm-rh-path-dragging");
        if (countEl) countEl.classList.add("cfm-rh-path-dragging");
        document.addEventListener("pointermove", onPointerMove, {
          passive: false,
        });
        document.addEventListener("pointerup", stopDrag);
        document.addEventListener("pointercancel", stopDrag);
      };
      pathEl.addEventListener("pointerdown", onPointerDown);
      if (countEl) {
        countEl.addEventListener("pointerdown", onPointerDown);
      }
    });
  };

  // ---------- 移动端：触摸滚动后抑制误触点击 ----------
  const bindMobileTapGuard = () => {
    if (window.innerWidth > 768) return;
    const MOVE_THRESHOLD = 12;
    const interactiveSelector = [
      "button",
      ".cfm-tab",
      ".cfm-tnode",
      ".cfm-tree-item",
      ".cfm-row",
      ".cfm-row-action-btn",
      ".cfm-sort-trigger",
      ".cfm-multisel-toggle",
      ".cfm-import-btn",
      ".cfm-export-btn",
      ".cfm-res-delete-btn",
      ".cfm-edit-char-btn",
      ".cfm-chat-mode-btn",
      ".cfm-regex-create-btn",
      ".cfm-regex-sort-btn",
      ".cfm-config-arrow",
      ".cfm-worldinfo-entry-expand",
      ".cfm-worldinfo-entry-edit",
      ".cfm-worldinfo-entry-duplicate",
      ".cfm-worldinfo-entry-delete",
      ".cfm-preset-detail-edit",
      ".cfm-preset-detail-copy",
      ".cfm-preset-detail-delete",
    ].join(", ");

    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    let suppressTapUntil = 0;

    popup[0].addEventListener(
      "touchstart",
      (ev) => {
        const touch = ev.touches?.[0];
        if (!touch) return;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchMoved = false;
      },
      { passive: true },
    );

    popup[0].addEventListener(
      "touchmove",
      (ev) => {
        const touch = ev.touches?.[0];
        if (!touch || touchMoved) return;
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
          touchMoved = true;
          suppressTapUntil = Date.now() + 250;
        }
      },
      { passive: true },
    );

    popup[0].addEventListener(
      "touchend",
      () => {
        if (touchMoved) {
          suppressTapUntil = Date.now() + 250;
        }
      },
      { passive: true },
    );

    popup[0].addEventListener(
      "click",
      (ev) => {
        if (Date.now() > suppressTapUntil) return;
        if (!ev.target.closest(interactiveSelector)) return;
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      },
      true,
    );
  };

  bindMobilePanePathDrag();
  bindMobileTapGuard();
}

// =====================================================================
// 主弹窗关闭协调：closeMainPopup 拆分
// 承接 showMainPopup 的关闭逻辑：重置所有面板/批量/模式状态 + 排序确认 + 静默恢复分组
// 依赖注入：大量模块级可变状态（通过 setter）与函数引用
// =====================================================================
export function createMainPopupCloserCore(deps) {
  const {
    $,
    _saveLastOpenState,
    clearMultiSelect,
    setPresetRegexToastPersistentSuppress,
    closeWorldInfoEntryPanels,
    resetNativePresetPromptPopupStyles,
    restorePresetSelectionAfterEdit,
    showSortConfirmDialog,
    revertSort,
    clearNewlyImportedHighlight,
    autoApplyWiPresets,
    autoApplyQrPresets,
    getSortDirty,
    setSortDirty,
    getSortSnapshot,
    setSortSnapshot,
    cfmCharDetailExpandedAvatars,
    personaItemExpandedIds,
    cfmPresetDetailExpandedNames,
    qrItemExpandedSets,
    cfmChatExpandedAvatars,
    cfmChatCache,
    cfmChatBatchSelected,
    cfmCharRegexExpandedAvatars,
    cfmPresetRegexExpandedNames,
    cfmPresetDetailBatchSelected,
    cfmWorldInfoEntryBatchSelected,
    cfmRegexBatchSelected,
    setCfmQrLastFocusedSetName,
    setCfmWorldInfoEntryLastFocusedName,
    setCfmChatMode,
    setCfmChatBatchMode,
    setCfmChatBatchRangeMode,
    setCfmChatBatchLastClicked,
    setCfmCharRegexMode,
    setCfmCharRegexTargetAvatar,
    setCfmCharRegexHighlightPath,
    setCfmCharRegexPrevSelectedTreeNode,
    setCfmPresetRegexMode,
    setCfmPresetRegexTargetName,
    setCfmPresetRegexHighlightPath,
    setCfmPresetDetailBatchMode,
    setCfmPresetDetailBatchOwnerName,
    setCfmPresetDetailBatchRangeMode,
    setCfmPresetDetailBatchLastClicked,
    setCfmWorldInfoEntryBatchMode,
    setCfmWorldInfoEntryBatchOwnerName,
    setCfmWorldInfoEntryBatchRangeMode,
    setCfmWorldInfoEntryBatchLastClicked,
    setCfmRegexBatchMode,
    setCfmRegexBatchRangeMode,
    setCfmRegexBatchLastClicked,
    setCfmMultiSelectMode,
    setCfmMultiSelectRangeMode,
  } = deps;

  const resetPanelExpandedStates = () => {
    cfmCharDetailExpandedAvatars.clear();
    personaItemExpandedIds.clear();
    cfmPresetDetailExpandedNames.clear();
    qrItemExpandedSets.clear();
    setCfmQrLastFocusedSetName(null);
    closeWorldInfoEntryPanels();
    setCfmWorldInfoEntryLastFocusedName(null);
    resetNativePresetPromptPopupStyles();
    restorePresetSelectionAfterEdit();

    setCfmChatMode(false);
    cfmChatExpandedAvatars.clear();
    cfmChatCache.clear();
    setCfmChatBatchMode(false);
    cfmChatBatchSelected.clear();
    setCfmChatBatchRangeMode(false);
    setCfmChatBatchLastClicked(null);

    setCfmCharRegexMode(false);
    cfmCharRegexExpandedAvatars.clear();
    setCfmCharRegexTargetAvatar(null);
    setCfmCharRegexHighlightPath([]);
    setCfmCharRegexPrevSelectedTreeNode(undefined);

    setCfmPresetRegexMode(false);
    cfmPresetRegexExpandedNames.clear();
    setCfmPresetRegexTargetName(null);
    setCfmPresetRegexHighlightPath([]);

    setCfmPresetDetailBatchMode(false);
    setCfmPresetDetailBatchOwnerName(null);
    cfmPresetDetailBatchSelected.clear();
    setCfmPresetDetailBatchRangeMode(false);
    setCfmPresetDetailBatchLastClicked(null);

    setCfmWorldInfoEntryBatchMode(false);
    setCfmWorldInfoEntryBatchOwnerName(null);
    cfmWorldInfoEntryBatchSelected.clear();
    setCfmWorldInfoEntryBatchRangeMode(false);
    setCfmWorldInfoEntryBatchLastClicked(null);

    setCfmRegexBatchMode(false);
    cfmRegexBatchSelected.clear();
    setCfmRegexBatchRangeMode(false);
    setCfmRegexBatchLastClicked(null);

    setCfmMultiSelectMode(false);
    clearMultiSelect();
    setCfmMultiSelectRangeMode(false);
    $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    $("#cfm-popup").removeClass("cfm-multisel-on");
  };

  const closeMainPopup = () => {
    // 保存当前页面状态（用于"记住上次页面"功能）
    _saveLastOpenState();
    if (getSortDirty()) {
      // 排序已更改，弹出确认框
      showSortConfirmDialog(
        () => {
          // 用户选择"是，保留排序" → 清理状态并关闭
          setSortSnapshot(null);
          setSortDirty(false);
          resetPanelExpandedStates();
          $("#cfm-overlay").remove();
          clearNewlyImportedHighlight();
          // 清理拖拽可能残留的 ST body.dragover（避免"关闭弹窗后界面变淡"）
          $(document.body).removeClass("dragover");
          $("#cfm-topbar-button .drawer-icon")
            .removeClass("openIcon")
            .addClass("closedIcon");
          // 面板关闭后解除常驻 toast 屏蔽（若无可恢复窗口立即恢复原生 toastr）
          setPresetRegexToastPersistentSuppress(false);
        },
        () => {
          // 用户选择"否，撤回排序" → 恢复快照并关闭
          revertSort();
          resetPanelExpandedStates();
          $("#cfm-overlay").remove();
          clearNewlyImportedHighlight();
          // 清理拖拽可能残留的 ST body.dragover（避免"关闭弹窗后界面变淡"）
          $(document.body).removeClass("dragover");
          $("#cfm-topbar-button .drawer-icon")
            .removeClass("openIcon")
            .addClass("closedIcon");
          // 面板关闭后解除常驻 toast 屏蔽（若无可恢复窗口立即恢复原生 toastr）
          setPresetRegexToastPersistentSuppress(false);
        },
      );
      return;
    }
    resetPanelExpandedStates();
    autoApplyWiPresets(true).catch((e) =>
      console.error("[CFM] 关闭插件时静默恢复世界书分组失败", e),
    );
    autoApplyQrPresets(true).catch((e) =>
      console.error("[CFM] 关闭插件时静默恢复QR分组失败", e),
    );
    $("#cfm-overlay").remove();
    $(document).off("click.cfmMobileAutoClose touchend.cfmMobileAutoClose");
    clearNewlyImportedHighlight();
    // 清理拖拽可能残留的 ST body.dragover（避免"关闭弹窗后界面变淡"）
    $(document.body).removeClass("dragover");
    $("#cfm-topbar-button .drawer-icon")
      .removeClass("openIcon")
      .addClass("closedIcon");
    // 面板关闭后解除常驻 toast 屏蔽（若无可恢复窗口立即恢复原生 toastr）
    setPresetRegexToastPersistentSuppress(false);
  };

  return { closeMainPopup };
}

// =====================================================================
// 资源标签切换协调：switchResourceTab 拆分
// 承接 showMainPopup 的标签切换逻辑：页签高亮、清空多选/导出/备注模式、切换视图与搜索栏
// 依赖注入：popup（showMainPopup 闭包）、currentResourceType getter/setter、
//           所有模式标志 getter、exit 函数、render 函数、clearMultiSelect、$、handleCurrentTabRelocate
// =====================================================================
export function createResourceTabSwitcher(deps) {
  const {
    $,
    popup,
    handleCurrentTabRelocate,
    getCurrentResourceType,
    setCurrentResourceType,
    clearMultiSelect,
    getCfmMultiSelectMode,
    setCfmMultiSelectMode,
    setCfmMultiSelectRangeMode,
    getCfmExportMode,
    getCfmResDeleteMode,
    getCfmThemeNoteMode,
    getCfmBgNoteMode,
    getCfmPresetNoteMode,
    getCfmWorldInfoNoteMode,
    getCfmQrNoteMode,
    getCfmPersonaNoteMode,
    getCfmPresetRenameMode,
    getCfmWorldInfoRenameMode,
    getCfmQrRenameMode,
    getCfmCopyMode,
    exitExportMode,
    exitResDeleteMode,
    exitThemeNoteMode,
    exitBgNoteMode,
    exitPresetNoteMode,
    exitWorldInfoNoteMode,
    exitQrNoteMode,
    exitPersonaNoteMode,
    exitPresetRenameMode,
    exitWorldInfoRenameMode,
    exitQrRenameMode,
    renderRightPane,
    renderChatlogsView,
    renderPresetsView,
    renderWorldInfoView,
    renderThemesView,
    renderBackgroundsView,
    renderPersonasView,
    renderRegexView,
    renderQRView,
  } = deps;

  const switchResourceTab = (tab, triggerEl = null) => {
    if (tab === getCurrentResourceType()) {
      handleCurrentTabRelocate(tab);
      return;
    }
    setCurrentResourceType(tab);
    popup.find(".cfm-tab").removeClass("cfm-tab-active");
    popup.find(".cfm-tab-menu-item").removeClass("cfm-tab-menu-item-active");
    popup.find(".cfm-tab-menu-btn").removeClass("cfm-tab-active");
    if (triggerEl?.hasClass("cfm-tab-menu-item")) {
      popup.find(".cfm-tab-menu-btn").addClass("cfm-tab-active");
      triggerEl.addClass("cfm-tab-menu-item-active");
    } else if (triggerEl) {
      triggerEl.addClass("cfm-tab-active");
    } else {
      popup.find(`.cfm-tab[data-tab="${tab}"]`).addClass("cfm-tab-active");
      if (popup.find(`.cfm-tab-menu-item[data-tab="${tab}"]`).length) {
        popup.find(".cfm-tab-menu-btn").addClass("cfm-tab-active");
        popup
          .find(`.cfm-tab-menu-item[data-tab="${tab}"]`)
          .addClass("cfm-tab-menu-item-active");
      }
    }
    // 切换标签时清空多选状态并关闭多选模式
    setCfmMultiSelectMode(false);
    clearMultiSelect();
    setCfmMultiSelectRangeMode(false);
    $(".cfm-multisel-toggle").removeClass("cfm-multisel-active");
    $("#cfm-popup").removeClass("cfm-multisel-on");
    // 切换标签时清空导出模式
    if (getCfmExportMode()) exitExportMode();
    if (getCfmResDeleteMode()) exitResDeleteMode();
    if (getCfmThemeNoteMode()) exitThemeNoteMode();
    if (getCfmBgNoteMode()) exitBgNoteMode();
    if (getCfmPresetNoteMode()) exitPresetNoteMode();
    if (getCfmWorldInfoNoteMode()) exitWorldInfoNoteMode();
    if (getCfmQrNoteMode()) exitQrNoteMode();
    if (getCfmPersonaNoteMode()) exitPersonaNoteMode();
    if (getCfmPresetRenameMode()) exitPresetRenameMode();
    if (getCfmWorldInfoRenameMode()) exitWorldInfoRenameMode();
    if (getCfmQrRenameMode()) exitQrRenameMode();
    // 切换视图
    popup.find("#cfm-chars-view").toggle(tab === "chars");
    popup.find("#cfm-chatlogs-view").toggle(tab === "chatlogs");
    popup.find("#cfm-presets-view").toggle(tab === "presets");
    popup.find("#cfm-worldinfo-view").toggle(tab === "worldinfo");
    popup.find("#cfm-themes-view").toggle(tab === "themes");
    popup.find("#cfm-backgrounds-view").toggle(tab === "backgrounds");
    popup.find("#cfm-personas-view").toggle(tab === "personas");
    popup.find("#cfm-regex-view").toggle(tab === "regex");
    popup.find("#cfm-qr-view").toggle(tab === "quickreply");
    // 切换header按钮可见性
    if (tab === "chars") {
      popup.find("#cfm-btn-copymode").show();
      const btn = $("#cfm-btn-copymode");
      btn.toggleClass("cfm-copymode-active", getCfmCopyMode());
      btn.html(
        `<i class="fa-solid fa-${getCfmCopyMode() ? "copy" : "arrows-turn-to-dots"}"></i> ${getCfmCopyMode() ? "复制" : "移动"}`,
      );
    } else {
      popup.find("#cfm-btn-copymode").hide();
    }
    // 切换搜索栏
    popup.find("#cfm-global-search-bar").toggle(tab === "chars");
    popup.find("#cfm-chatlogs-search-bar").toggle(tab === "chatlogs");
    popup.find("#cfm-preset-search-bar").toggle(tab === "presets");
    popup.find("#cfm-worldinfo-search-bar").toggle(tab === "worldinfo");
    popup.find("#cfm-theme-search-bar").toggle(tab === "themes");
    popup.find("#cfm-bg-search-bar").toggle(tab === "backgrounds");
    popup.find("#cfm-persona-search-bar").toggle(tab === "personas");
    popup.find("#cfm-regex-search-bar").toggle(tab === "regex");
    popup.find("#cfm-qr-search-bar").toggle(tab === "quickreply");
    popup.find(".cfm-tab-menu-wrap").removeClass("cfm-tab-menu-open");
    popup.find(".cfm-tab-menu-btn").attr("aria-expanded", "false");
    if (tab === "chars") renderRightPane();
    else if (tab === "chatlogs") renderChatlogsView();
    else if (tab === "presets") renderPresetsView();
    else if (tab === "worldinfo") renderWorldInfoView();
    else if (tab === "themes") renderThemesView();
    else if (tab === "backgrounds") renderBackgroundsView();
    else if (tab === "personas") renderPersonasView();
    else if (tab === "regex") renderRegexView();
    else if (tab === "quickreply") renderQRView();
  };

  return { switchResourceTab };
}

// =====================================================================
// 主弹窗头部/标签页/overlay 事件绑定：承接 showMainPopup 拆分后的
// tab 切换、tab 菜单开合、关闭按钮、移动端自动关闭、theme/config/backup
// 按钮、快速新建文件夹、展开/收起全部 的事件绑定。
// 依赖注入：popup、$、window、switchResourceTab、closeMainPopup、
//           showThemeCustomizePopup、showConfigPopup、showImportExportPopup、
//           showQuickAddFolderPopup、getFolderTagIds、getExpandedNodes、
//           renderLeftTree、renderRightPane、getCfmSuppressAutoClose
// =====================================================================
export function bindMainPopupHeaderEvents(popup, deps) {
  const {
    $,
    window,
    switchResourceTab,
    closeMainPopup,
    showThemeCustomizePopup,
    showConfigPopup,
    showImportExportPopup,
    showQuickAddFolderPopup,
    showEntryTransferMemoPopup,
    renderHeaderMemoBadge,
    getFolderTagIds,
    getExpandedNodes,
    renderLeftTree,
    renderRightPane,
    getCfmSuppressAutoClose,
  } = deps;

  // 资源类型标签切换
  popup.find(".cfm-tab[data-tab]").on("click touchend", function (e) {
    e.preventDefault();
    switchResourceTab($(this).data("tab"), $(this));
  });

  popup.find(".cfm-tab-menu-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const wrap = $(this).closest(".cfm-tab-menu-wrap");
    const willOpen = !wrap.hasClass("cfm-tab-menu-open");
    popup.find(".cfm-tab-menu-wrap").removeClass("cfm-tab-menu-open");
    popup.find(".cfm-tab-menu-btn").attr("aria-expanded", "false");
    if (willOpen) {
      wrap.addClass("cfm-tab-menu-open");
      $(this).attr("aria-expanded", "true");
    }
  });

  popup.find(".cfm-tab-menu-item").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    switchResourceTab($(this).data("tab"), $(this));
  });

  popup.on("click touchend", function (e) {
    if ($(e.target).closest(".cfm-tab-menu-wrap").length) return;
    popup.find(".cfm-tab-menu-wrap").removeClass("cfm-tab-menu-open");
    popup.find(".cfm-tab-menu-btn").attr("aria-expanded", "false");
  });

  popup.find("#cfm-btn-close-main").on("click touchend", (e) => {
    e.preventDefault();
    closeMainPopup();
  });

  if (window.innerWidth <= 768) {
    $(document)
      .off("click.cfmMobileAutoClose touchend.cfmMobileAutoClose")
      .on("click.cfmMobileAutoClose touchend.cfmMobileAutoClose", (e) => {
        if (!$("#cfm-overlay").length) return;
        // 忽略程序化触发的点击（如 openNativePresetPromptEditor 中的 nativeButton.click()）
        if (e.originalEvent && !e.originalEvent.isTrusted) return;
        // 临时抑制自动关闭（如 syncNativePersonaUI 中的 selectPersona 调用）
        if (getCfmSuppressAutoClose()) return;
        const target = $(e.target);
        if (
          target.closest("#cfm-overlay").length ||
          target.closest("#cfm-topbar-button").length
        ) {
          return;
        }
        // 排除 SillyTavern 原生弹窗（如预设编辑器、世界书编辑器等）
        if (
          target.closest(
            [
              "#completion_prompt_manager_popup",
              "#world_info_data_container",
              ".popup",
              ".dialogue_popup",
              ".shadow_popup",
            ].join(", "),
          ).length
        ) {
          return;
        }

        const topbarTrigger = target.closest(
          [
            "#rightNavHolder .drawer",
            "#rightNavHolder .drawer-toggle",
            "#top-settings-holder .drawer",
            "#top-settings-holder .drawer-toggle",
            "#left-nav-panel .drawer",
            "#left-nav-panel .drawer-toggle",
            ".drawer-content .drawer",
            ".drawer-content .drawer-toggle",
          ].join(", "),
        );

        if (!topbarTrigger.length) {
          return;
        }

        closeMainPopup();
      });
  }
  popup.find("#cfm-btn-entry-memo").on("click touchend", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showEntryTransferMemoPopup();
  });
  popup.find("#cfm-btn-theme").on("click touchend", (e) => {
    e.preventDefault();
    showThemeCustomizePopup();
  });
  // 缝合备忘录角标（弹窗打开时刷新）
  if (typeof renderHeaderMemoBadge === "function") {
    renderHeaderMemoBadge();
  }
  popup.find("#cfm-btn-config").on("click touchend", (e) => {
    e.preventDefault();
    showConfigPopup();
  });
  popup.find("#cfm-btn-backup").on("click touchend", (e) => {
    e.preventDefault();
    showImportExportPopup();
  });
  // ── 快速新建文件夹按钮 ──
  popup.find(".cfm-quick-add-folder-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const tab = $(this).data("tab");
    showQuickAddFolderPopup(tab);
  });

  // 展开全部 / 收起全部
  popup.find("#cfm-expand-all").on("click touchend", (e) => {
    e.preventDefault();
    const allIds = getFolderTagIds();
    const expandedNodes = getExpandedNodes();
    for (const id of allIds) expandedNodes.add(id);
    renderLeftTree();
    renderRightPane();
  });
  popup.find("#cfm-collapse-all").on("click touchend", (e) => {
    e.preventDefault();
    const expandedNodes = getExpandedNodes();
    expandedNodes.clear();
    renderLeftTree();
    renderRightPane();
  });
}

// =====================================================================
// 多选/导出/删除/模式工具栏事件绑定（showMainPopup 拆分批次5）
// 依赖注入：popup、$、cfmToastr、
//           getCurrentResourceType、collectCurrentSelection、clearAllExclusiveModes、
//           clearMultiSelect、enterExportMode、executeResourceExport、
//           enterResDeleteMode、executeResourceDelete、enterEditMode、exitEditMode、
//           executeCharEdit、toggleChatMode、toggleCharRegexMode、togglePresetRegexMode、
//           renderLeftTree、renderRightPane 及各资源视图渲染函数、
//           状态 getter/setter（cfmMultiSelectMode/cfmShowHiddenChars 等）
// =====================================================================
export function bindModeToolbarEvents(popup, deps) {
  const {
    $,
    cfmToastr,
    // 状态 getter
    getCfmMultiSelectMode,
    getCfmMultiSelected,
    getCfmMultiSelectRangeMode,
    getCfmShowHiddenChars,
    getCfmExportMode,
    getCfmResDeleteMode,
    getCfmEditMode,
    getCfmEditSelected,
    // 互斥模式 getter（只读）
    getCfmPresetRenameMode,
    getCfmWorldInfoRenameMode,
    getCfmThemeRenameMode,
    getCfmBgRenameMode,
    getCfmPresetNoteMode,
    getCfmWorldInfoNoteMode,
    getCfmQrNoteMode,
    getCfmThemeNoteMode,
    getCfmBgNoteMode,
    getCfmPersonaNoteMode,
    // 状态 setter
    setCfmMultiSelectMode,
    setCfmMultiSelected,
    setCfmMultiSelectRangeMode,
    setCfmShowHiddenChars,
    // 当前资源类型
    getCurrentResourceType,
    // 函数
    collectCurrentSelection,
    clearAllExclusiveModes,
    clearMultiSelect,
    enterExportMode,
    executeResourceExport,
    enterResDeleteMode,
    executeResourceDelete,
    enterEditMode,
    exitEditMode,
    executeCharEdit,
    toggleChatMode,
    toggleCharRegexMode,
    togglePresetRegexMode,
    // 渲染函数
    renderLeftTree,
    renderRightPane,
    renderChatlogsView,
    renderPresetsView,
    renderThemesView,
    renderBackgroundsView,
    renderPersonasView,
    renderRegexView,
    renderQRView,
    renderWorldInfoView,
  } = deps;

  // 多选模式切换
  popup.find(".cfm-multisel-toggle").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    // 检查是否有其他互斥模式激活
    const hasExclusiveMode =
      getCfmExportMode() ||
      getCfmResDeleteMode() ||
      getCfmEditMode() ||
      getCfmPresetRenameMode() ||
      getCfmWorldInfoRenameMode() ||
      getCfmThemeRenameMode() ||
      getCfmBgRenameMode() ||
      getCfmPresetNoteMode() ||
      getCfmWorldInfoNoteMode() ||
      getCfmQrNoteMode() ||
      getCfmThemeNoteMode() ||
      getCfmBgNoteMode() ||
      getCfmPersonaNoteMode();
    if (hasExclusiveMode) {
      // 收集选中并退出互斥模式，进入多选
      const prev = collectCurrentSelection();
      clearAllExclusiveModes();
      setCfmMultiSelectMode(true);
      setCfmMultiSelected(prev || new Set());
      setCfmMultiSelectRangeMode(false);
    } else {
      setCfmMultiSelectMode(!getCfmMultiSelectMode());
      clearMultiSelect();
      setCfmMultiSelectRangeMode(false);
    }
    // 更新所有多选按钮的视觉状态
    $(".cfm-multisel-toggle").toggleClass(
      "cfm-multisel-active",
      getCfmMultiSelectMode(),
    );
    // 在 popup 容器上标记多选模式，用于 CSS 控制靶子图标显隐
    $("#cfm-popup").toggleClass("cfm-multisel-on", getCfmMultiSelectMode());
    // 重新渲染当前视图
    const resourceType = getCurrentResourceType();
    if (resourceType === "chars") renderRightPane();
    else if (resourceType === "chatlogs") renderChatlogsView();
    else if (resourceType === "presets") renderPresetsView();
    else if (resourceType === "themes") renderThemesView();
    else if (resourceType === "backgrounds") renderBackgroundsView();
    else if (resourceType === "personas") renderPersonasView();
    else if (resourceType === "regex") renderRegexView();
    else if (resourceType === "quickreply") renderQRView();
    else renderWorldInfoView();
  });

  // ==================== 导出资源功能 ====================
  popup.find(".cfm-export-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (getCfmExportMode()) {
      // 已在导出模式，执行导出
      executeResourceExport();
    } else {
      // 进入导出模式
      enterExportMode();
    }
  });

  // ==================== 删除资源功能 ====================
  popup.find(".cfm-res-delete-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (getCfmResDeleteMode()) {
      executeResourceDelete();
    } else {
      enterResDeleteMode();
    }
  });

  // ==================== 聊天记录模式按钮 ====================
  popup.find("#cfm-chat-mode-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleChatMode();
  });

  // ==================== 角色卡正则查看模式按钮 ====================
  popup.find("#cfm-char-regex-mode-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleCharRegexMode();
  });

  // ==================== 显示/隐藏 隐藏角色卡 总开关 ====================
  popup.find("#cfm-show-hidden-char-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    setCfmShowHiddenChars(!getCfmShowHiddenChars());
    const $btn = $(this);
    $btn.toggleClass("cfm-show-hidden-active", getCfmShowHiddenChars());
    $btn
      .find("i")
      .attr(
        "class",
        getCfmShowHiddenChars() ? "fa-solid fa-eye" : "fa-regular fa-eye-slash",
      );
    $btn.attr(
      "title",
      getCfmShowHiddenChars()
        ? "已显示隐藏角色卡（点击恢复隐藏）"
        : "显示隐藏的角色卡",
    );
    renderLeftTree();
    renderRightPane();
  });

  // ==================== 预设正则查看模式按钮 ====================
  popup.find("#cfm-preset-regex-mode-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    togglePresetRegexMode();
  });

  // ==================== 角色卡快速编辑功能 ====================
  popup.find("#cfm-edit-char-btn").on("click touchend", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (getCfmEditMode()) {
      // 已在编辑模式，执行编辑
      if (getCfmEditSelected().size === 0) {
        cfmToastr.warning("请先选择要编辑的角色卡");
        return;
      }
      const avatars = Array.from(getCfmEditSelected());
      executeCharEdit(avatars).then(() => exitEditMode());
    } else {
      // 进入编辑模式
      enterEditMode();
    }
  });
}
