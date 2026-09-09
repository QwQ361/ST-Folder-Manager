// 排序下拉绑定：主弹窗内 8 组排序按钮的事件绑定（chars + 6 类资源）。
// 由 showMainPopup 在构建弹窗外壳后调用，将排序交互绑定到对应按钮。

  function createResSortDropdown(deps, type, currentMode, snapshot, onSort) {
    const dropdown = deps.$(`
      <div class="cfm-sort-dropdown cfm-sort-open">
        <div class="cfm-sort-dropdown-item ${currentMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="az">
          <i class="fa-solid fa-arrow-down-a-z"></i> A → Z
        </div>
        <div class="cfm-sort-dropdown-item ${currentMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="za">
          <i class="fa-solid fa-arrow-up-z-a"></i> Z → A
        </div>
        <div class="cfm-sort-dropdown-sep"></div>
        <div class="cfm-sort-dropdown-item ${!snapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert">
          <i class="fa-solid fa-rotate-left"></i> 自定义
        </div>
      </div>
    `);
    dropdown.find('[data-sort="az"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("az");
    });
    dropdown.find('[data-sort="za"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("za");
    });
    dropdown.find('[data-sort="revert"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (snapshot) onSort("revert");
    });
    return dropdown;
  }

  function updateSortButtonState(deps) {
    const leftBtn = deps.$("#cfm-left-sort-btn");
    leftBtn.toggleClass("cfm-sort-active", deps.getSortDirty());
    const rightBtn = deps.$("#cfm-right-sort-btn");
    rightBtn.toggleClass(
      "cfm-sort-active",
      deps.getSortDirty() || deps.getRightCharSortMode() !== null,
    );
  }

// 绑定 chars 左右栏排序
function bindCharSortBindings(popup, deps) {
  // ===== 右栏排序按钮（chars） =====
      popup.find("#cfm-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-right-sort-wrapper");
      // 右栏排序：对当前选中文件夹的子文件夹排序 + 角色名排序
      const currentFolder = deps.getSelectedTreeNode();
      const childFolders =
        currentFolder &&
        currentFolder !== "__uncategorized__" &&
        currentFolder !== "__favorites__"
          ? deps.getChildFolders(currentFolder)
          : [];

      // 创建自定义下拉菜单（角色排序 + 子文件夹排序）
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`
                <div class="cfm-sort-dropdown cfm-sort-open">
                    <div class="cfm-sort-dropdown-item ${deps.getRightCharSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="char-az">
                        <i class="fa-solid fa-arrow-down-a-z"></i> 角色 A → Z
                    </div>
                    <div class="cfm-sort-dropdown-item ${deps.getRightCharSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="char-za">
                        <i class="fa-solid fa-arrow-up-z-a"></i> 角色 Z → A
                    </div>
                    <div class="cfm-sort-dropdown-item ${deps.getRightCharSortMode() === "time" ? "cfm-sort-item-active" : ""}" data-sort="char-time">
                        <i class="fa-solid fa-clock"></i> 角色按时间排序
                    </div>
                    ${
                      childFolders.length > 0
                        ? `
                    <div class="cfm-sort-dropdown-sep"></div>
                    <div class="cfm-sort-dropdown-item" data-sort="folder-az">
                        <i class="fa-solid fa-folder"></i> 子文件夹 A → Z
                    </div>
                    <div class="cfm-sort-dropdown-item" data-sort="folder-za">
                        <i class="fa-solid fa-folder"></i> 子文件夹 Z → A
                    </div>`
                        : ""
                    }
                    <div class="cfm-sort-dropdown-sep"></div>
                    <div class="cfm-sort-dropdown-item ${deps.getRightCharSortMode() === null && !deps.getSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert">
                        <i class="fa-solid fa-rotate-left"></i> 恢复默认
                    </div>
                </div>
            `);

      dropdown.find('[data-sort="char-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setRightCharSortMode("az");
        deps.extension_settings[deps.extensionName].charRightSortMode = deps.getRightCharSortMode();
        deps.getContext().saveSettingsDebounced();
        updateSortButtonState(deps);
        deps.renderRightPane();
        dropdown.remove();
      });
      dropdown.find('[data-sort="char-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setRightCharSortMode("za");
        deps.extension_settings[deps.extensionName].charRightSortMode = deps.getRightCharSortMode();
        deps.getContext().saveSettingsDebounced();
        updateSortButtonState(deps);
        deps.renderRightPane();
        dropdown.remove();
      });
      dropdown.find('[data-sort="char-time"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setRightCharSortMode("time");
        deps.extension_settings[deps.extensionName].charRightSortMode = deps.getRightCharSortMode();
        deps.getContext().saveSettingsDebounced();
        updateSortButtonState(deps);
        deps.renderRightPane();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applySortToFolders(childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          updateSortButtonState(deps);
          deps.renderLeftTree();
          deps.renderRightPane();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applySortToFolders(childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          updateSortButtonState(deps);
          deps.renderLeftTree();
          deps.renderRightPane();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getRightCharSortMode() === null && !deps.getSortSnapshot()) return;
        deps.setRightCharSortMode(null);
        deps.extension_settings[deps.extensionName].charRightSortMode = null;
        deps.getContext().saveSettingsDebounced();
        if (deps.getSortSnapshot()) {
          deps.revertSort();
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        updateSortButtonState(deps);
        deps.renderLeftTree();
        deps.renderRightPane();
        dropdown.remove();
      });

      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length) {
            dropdown.remove();
          }
        });
      }, 0);
    });

  // ===== 左栏排序按钮（chars） =====
      popup.find("#cfm-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-left-sort-wrapper");
      const topFolders = deps.getTopLevelFolders();
      deps.toggleSortDropdown(
        wrapper,
        topFolders,
        (mode) => {
          if (mode === "revert") {
            deps.revertSort();
            deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
          } else {
            deps.applySortToFolders(topFolders, mode);
            deps.cfmToastr.info(
              mode === "az"
                ? "顶级文件夹已按 A→Z 排序"
                : "顶级文件夹已按 Z→A 排序",
              "",
              { timeOut: 1500 },
            );
          }
          // 更新排序按钮状态
          updateSortButtonState(deps);
          deps.renderLeftTree();
          deps.renderRightPane();
        },
        null,
      );
    });
}

// 绑定 6 类资源左右栏排序
function bindResSortBindings(popup, deps) {
  // ===== 预设 左右栏排序 =====
      popup.find("#cfm-preset-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-preset-left-sort-wrapper");
      const topFolders = deps.getResTopLevelFolders("presets");
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        deps,
        "presets",
        deps.getPresetLeftSortMode(),
        deps.getPresetSortSnapshot(),
        (mode) => {
          if (mode === "revert") {
            deps.revertResSort("presets");
            deps.setPresetLeftSortMode(null);
          } else {
            deps.applyResSortToFolders("presets", topFolders, mode);
            deps.setPresetLeftSortMode(mode);
          }
          deps.renderPresetsView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 预设右栏排序
    popup.find("#cfm-preset-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-preset-right-sort-wrapper");
      const currentFolder = deps.getSelectedPresetFolder();
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? deps.getResChildFolders("presets", currentFolder)
          : [];
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${deps.getPresetRightSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 预设 A → Z</div>
          <div class="cfm-sort-dropdown-item ${deps.getPresetRightSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 预设 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${deps.getPresetRightSortMode() === null && !deps.getPresetSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setPresetRightSortMode("az");
        deps.renderPresetsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setPresetRightSortMode("za");
        deps.renderPresetsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("presets", childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          deps.renderPresetsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("presets", childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          deps.renderPresetsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getPresetRightSortMode() === null && !deps.getPresetSortSnapshot()) return;
        deps.setPresetRightSortMode(null);
        if (deps.getPresetSortSnapshot()) {
          deps.revertResSort("presets");
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        deps.renderPresetsView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
  // ===== 世界书 左右栏排序 =====
      popup.find("#cfm-worldinfo-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-worldinfo-left-sort-wrapper");
      const topFolders = deps.getResTopLevelFolders("worldinfo");
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        deps,
        "worldinfo",
        deps.getWorldInfoLeftSortMode(),
        deps.getWorldInfoSortSnapshot(),
        (mode) => {
          if (mode === "revert") {
            deps.revertResSort("worldinfo");
            deps.setWorldInfoLeftSortMode(null);
          } else {
            deps.applyResSortToFolders("worldinfo", topFolders, mode);
            deps.setWorldInfoLeftSortMode(mode);
          }
          deps.renderWorldInfoView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 世界书右栏排序
    popup.find("#cfm-worldinfo-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-worldinfo-right-sort-wrapper");
      const currentFolder = deps.getSelectedWorldInfoFolder();
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? deps.getResChildFolders("worldinfo", currentFolder)
          : [];
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${deps.getWorldInfoRightSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 世界书 A → Z</div>
          <div class="cfm-sort-dropdown-item ${deps.getWorldInfoRightSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 世界书 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${deps.getWorldInfoRightSortMode() === null && !deps.getWorldInfoSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setWorldInfoRightSortMode("az");
        deps.renderWorldInfoView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setWorldInfoRightSortMode("za");
        deps.renderWorldInfoView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("worldinfo", childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          deps.renderWorldInfoView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("worldinfo", childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          deps.renderWorldInfoView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getWorldInfoRightSortMode() === null && !deps.getWorldInfoSortSnapshot()) return;
        deps.setWorldInfoRightSortMode(null);
        if (deps.getWorldInfoSortSnapshot()) {
          deps.revertResSort("worldinfo");
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        deps.renderWorldInfoView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
  // ===== 快速回复 左右栏排序 =====
      popup.find("#cfm-qr-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-qr-left-sort-wrapper");
      const topFolders = deps.getResTopLevelFolders("quickreply");
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        deps,
        "quickreply",
        deps.getQrLeftSortMode(),
        deps.getQrSortSnapshot(),
        (mode) => {
          if (mode === "revert") {
            deps.revertResSort("quickreply");
            deps.setQrLeftSortMode(null);
          } else {
            deps.applyResSortToFolders("quickreply", topFolders, mode);
            deps.setQrLeftSortMode(mode);
          }
          deps.renderQRView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 快速回复右栏排序
    popup.find("#cfm-qr-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-qr-right-sort-wrapper");
      const currentFolder = deps.getSelectedQrFolder();
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? deps.getResChildFolders("quickreply", currentFolder)
          : [];
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${deps.getQrRightSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 快速回复集 A → Z</div>
          <div class="cfm-sort-dropdown-item ${deps.getQrRightSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 快速回复集 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${deps.getQrRightSortMode() === null && !deps.getQrSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setQrRightSortMode("az");
        deps.renderQRView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setQrRightSortMode("za");
        deps.renderQRView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("quickreply", childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          deps.renderQRView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("quickreply", childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          deps.renderQRView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getQrRightSortMode() === null && !deps.getQrSortSnapshot()) return;
        deps.setQrRightSortMode(null);
        if (deps.getQrSortSnapshot()) {
          deps.revertResSort("quickreply");
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        deps.renderQRView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
  // ===== 主题 左右栏排序 =====
      popup.find("#cfm-theme-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-theme-left-sort-wrapper");
      const topFolders = deps.getResTopLevelFolders("themes");
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        deps,
        "themes",
        deps.getThemeLeftSortMode(),
        deps.getThemeSortSnapshot(),
        (mode) => {
          if (mode === "revert") {
            deps.revertResSort("themes");
            deps.setThemeLeftSortMode(null);
          } else {
            deps.applyResSortToFolders("themes", topFolders, mode);
            deps.setThemeLeftSortMode(mode);
          }
          deps.renderThemesView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 主题右栏排序
    popup.find("#cfm-theme-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-theme-right-sort-wrapper");
      const currentFolder = deps.getSelectedThemeFolder();
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? deps.getResChildFolders("themes", currentFolder)
          : [];
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`
        <div class="cfm-sort-dropdown cfm-sort-open">
          <div class="cfm-sort-dropdown-item ${deps.getThemeRightSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 主题 A → Z</div>
          <div class="cfm-sort-dropdown-item ${deps.getThemeRightSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 主题 Z → A</div>
          ${
            childFolders.length > 0
              ? `<div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div>
          <div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>`
              : ""
          }
          <div class="cfm-sort-dropdown-sep"></div>
          <div class="cfm-sort-dropdown-item ${deps.getThemeRightSortMode() === null && !deps.getThemeSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
        </div>
      `);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setThemeRightSortMode("az");
        deps.renderThemesView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setThemeRightSortMode("za");
        deps.renderThemesView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("themes", childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          deps.renderThemesView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("themes", childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          deps.renderThemesView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getThemeRightSortMode() === null && !deps.getThemeSortSnapshot()) return;
        deps.setThemeRightSortMode(null);
        if (deps.getThemeSortSnapshot()) {
          deps.revertResSort("themes");
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        deps.renderThemesView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
  // ===== 背景 左右栏排序 =====
      popup.find("#cfm-bg-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-bg-left-sort-wrapper");
      const topFolders = deps.getResTopLevelFolders("backgrounds");
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        deps,
        "backgrounds",
        deps.getBgLeftSortMode(),
        deps.getBgSortSnapshot(),
        (mode) => {
          if (mode === "revert") {
            deps.revertResSort("backgrounds");
            deps.setBgLeftSortMode(null);
          } else {
            deps.applyResSortToFolders("backgrounds", topFolders, mode);
            deps.setBgLeftSortMode(mode);
          }
          deps.renderBackgroundsView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // 背景右栏排序
    popup.find("#cfm-bg-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-bg-right-sort-wrapper");
      const currentFolder = deps.getSelectedBgFolder();
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? deps.getResChildFolders("backgrounds", currentFolder)
          : [];
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`<div class="cfm-sort-dropdown cfm-sort-open">
        <div class="cfm-sort-dropdown-item ${deps.getBgRightSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> 背景 A → Z</div>
        <div class="cfm-sort-dropdown-item ${deps.getBgRightSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> 背景 Z → A</div>
        ${childFolders.length > 0 ? `<div class="cfm-sort-dropdown-sep"></div><div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div><div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>` : ""}
        <div class="cfm-sort-dropdown-sep"></div>
        <div class="cfm-sort-dropdown-item ${deps.getBgRightSortMode() === null && !deps.getBgSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
      </div>`);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setBgRightSortMode("az");
        deps.renderBackgroundsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setBgRightSortMode("za");
        deps.renderBackgroundsView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("backgrounds", childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          deps.renderBackgroundsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("backgrounds", childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          deps.renderBackgroundsView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getBgRightSortMode() === null && !deps.getBgSortSnapshot()) return;
        deps.setBgRightSortMode(null);
        if (deps.getBgSortSnapshot()) {
          deps.revertResSort("backgrounds");
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        deps.renderBackgroundsView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
  // ===== User 左右栏排序 =====
      popup.find("#cfm-persona-left-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-persona-left-sort-wrapper");
      const topFolders = deps.getResTopLevelFolders("personas");
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = createResSortDropdown(
        deps,
        "personas",
        deps.getPersonaLeftSortMode(),
        deps.getPersonaSortSnapshot(),
        (mode) => {
          if (mode === "revert") {
            deps.revertResSort("personas");
            deps.setPersonaLeftSortMode(null);
          } else {
            deps.applyResSortToFolders("personas", topFolders, mode);
            deps.setPersonaLeftSortMode(mode);
          }
          deps.renderPersonasView();
          dropdown.remove();
        },
      );
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
    // User右栏排序
    popup.find("#cfm-persona-right-sort-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deps.$("#cfm-persona-right-sort-wrapper");
      const currentFolder = deps.getSelectedPersonaFolder();
      const childFolders =
        currentFolder &&
        currentFolder !== "__ungrouped__" &&
        currentFolder !== "__favorites__"
          ? deps.getResChildFolders("personas", currentFolder)
          : [];
      deps.$(".cfm-sort-dropdown").remove();
      const dropdown = deps.$(`<div class="cfm-sort-dropdown cfm-sort-open">
        <div class="cfm-sort-dropdown-item ${deps.getPersonaRightSortMode() === "az" ? "cfm-sort-item-active" : ""}" data-sort="item-az"><i class="fa-solid fa-arrow-down-a-z"></i> User A→Z</div>
        <div class="cfm-sort-dropdown-item ${deps.getPersonaRightSortMode() === "za" ? "cfm-sort-item-active" : ""}" data-sort="item-za"><i class="fa-solid fa-arrow-up-z-a"></i> User Z→A</div>
        ${childFolders.length > 0 ? `<div class="cfm-sort-dropdown-sep"></div><div class="cfm-sort-dropdown-item" data-sort="folder-az"><i class="fa-solid fa-folder"></i> 子文件夹 A → Z</div><div class="cfm-sort-dropdown-item" data-sort="folder-za"><i class="fa-solid fa-folder"></i> 子文件夹 Z → A</div>` : ""}
        <div class="cfm-sort-dropdown-sep"></div>
        <div class="cfm-sort-dropdown-item ${deps.getPersonaRightSortMode() === null && !deps.getPersonaSortSnapshot() ? "cfm-sort-item-disabled" : ""}" data-sort="revert"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
      </div>`);
      dropdown.find('[data-sort="item-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setPersonaRightSortMode("az");
        deps.renderPersonasView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="item-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        deps.setPersonaRightSortMode("za");
        deps.renderPersonasView();
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-az"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("personas", childFolders, "az");
          deps.cfmToastr.info("子文件夹已按 A→Z 排序", "", { timeOut: 1500 });
          deps.renderPersonasView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="folder-za"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (childFolders.length > 0) {
          deps.applyResSortToFolders("personas", childFolders, "za");
          deps.cfmToastr.info("子文件夹已按 Z→A 排序", "", { timeOut: 1500 });
          deps.renderPersonasView();
        }
        dropdown.remove();
      });
      dropdown.find('[data-sort="revert"]').on("click touchend", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (deps.getPersonaRightSortMode() === null && !deps.getPersonaSortSnapshot()) return;
        deps.setPersonaRightSortMode(null);
        if (deps.getPersonaSortSnapshot()) {
          deps.revertResSort("personas");
          deps.cfmToastr.info("已恢复自定义排序", "", { timeOut: 1500 });
        }
        deps.renderPersonasView();
        dropdown.remove();
      });
      wrapper.append(dropdown);
      setTimeout(() => {
        deps.$(document).one("click.cfmSortDropdown", (ev) => {
          if (!deps.$(ev.target).closest(".cfm-sort-dropdown").length)
            dropdown.remove();
        });
      }, 0);
    });
}

export { bindCharSortBindings, bindResSortBindings };
