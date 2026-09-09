import { getBackupBridgeDetailsCore } from "./bridge/capabilities.js";
import {
  listBackupBridgeResources as listBackupBridgeResourcesCore,
  readBackupBridgeResource as readBackupBridgeResourceCore,
} from "./bridge/export.js";
import { writeBackupBridgeResource as writeBackupBridgeResourceCore } from "./bridge/import.js";
import { createBackupBridgeSyncController } from "./bridge/sync.js";
import {
  BACKUP_BRIDGE_PROTOCOL_VERSION,
  BACKUP_BRIDGE_VERSION,
  CFM_SYNC_POLL_INTERVAL_MS,
  CFM_SYNC_STATE_URL,
  STORAGE_KEY,
  STORAGE_KEY_BTN_POS,
  extensionFolderPath,
  extensionName,
} from "./core/constants.js";
import { CFM_ACTION_META, CFM_TAB_META } from "./core/resource-types.js";
import { loadFolderConfig, saveFolderConfig } from "./core/storage.js";
import {
  handleDefaultBgSettingCore,
  updateDefaultBgBtnStateCore,
} from "./features/appearance/default-background.js";
import {
  getCurrentBackgroundFileCore,
  getThemeBgBindingCore,
  handleThemeBgLinkCore,
  removeThemeBgBindingCore,
  setThemeBgBindingCore,
} from "./features/appearance/theme-binding.js";
import {
  CFM_STYLE_PRESETS as CFM_STYLE_PRESETS_CORE,
  applyCustomStyleCore,
  colorToAlpha as colorToAlphaCore,
  colorToHex as colorToHexCore,
  getComputedThemeDefaultsCore,
  getCurrentThemeNameCore,
  hexToRgba as hexToRgbaCore,
  showThemeCustomizePopupCore,
  updateThemePreviewCore,
} from "./features/appearance/ui-style.js";
import {
  createBgNotePopupApi,
  getBgNoteCore,
  setBgNoteCore,
} from "./features/backgrounds/notes.js";
import {
  autoDetectBgOrientationsCore,
  detectBgOrientationCore,
  getBgOrientationCore,
  setBgOrientationCore,
} from "./features/backgrounds/orientation.js";
import {
  enterBgRenameModeCore,
  executeBgRenameCore,
  exitBgRenameModeCore,
  prependBgRenameToolbarCore,
  showBgRenamePopupCore,
  toggleBgRenameItemCore,
} from "./features/backgrounds/rename.js";
import {
  applyBackgroundCore,
  getBackgroundDisplayNameCore,
  getBackgroundNamesCore,
  getBackgroundThumbnailUrlCore,
} from "./features/backgrounds/view.js";
import {
  enterExportModeCore,
  exitExportModeCore,
  prependExportToolbarCore,
  toggleExportItemCore,
} from "./features/backup/export-mode.js";
import {
  createResourceExportApi,
  executeResourceExportCore,
} from "./features/backup/export.js";
import { createBackupImportExportApi } from "./features/backup/import-export.js";
import { createBackupImportApi } from "./features/backup/import.js";
import { splitChatlogFileName as splitChatlogFileNameCore } from "./features/chatlogs/api.js";
import { createChatlogCacheApiCore } from "./features/chatlogs/cache.js";
import { createChatlogImportExportApiCore } from "./features/chatlogs/import-export.js";
import { createChatlogNativeEnhancerApiCore } from "./features/chatlogs/native-enhancer.js";
import { createChatlogNotesApiCore } from "./features/chatlogs/notes.js";
import { createChatlogPinningApiCore } from "./features/chatlogs/pinning.js";
import { createChatlogRenameApiCore } from "./features/chatlogs/rename.js";
import {
  cfmDebugDragLogCore,
  pcDragEndCore,
  pcDragStartCore,
  pcGetDropDataCore,
} from "./features/dragdrop/desktop.js";
import {
  buildDraggedHighlightSelectorCore,
  ensureDragLocateHighlightStyleCore,
  flashDraggedElementCore,
} from "./features/dragdrop/drop-zones.js";
import {
  bindTouchSafeTapCore,
  cfmIsTouchDeviceCore,
  createMobileTouchTapGuardController,
  createTouchDragMgrCore,
  recordTouchTapStartCore,
  shouldIgnoreTouchTapAfterMoveCore,
} from "./features/dragdrop/mobile.js";
import {
  ensureResFavoritesCore,
  getFavoriteCharactersCore,
  getFavoritesCore,
  getResFavoritesCore,
  isFavoriteCore,
  isResFavoriteCore,
  toggleFavoriteCore,
  toggleResFavoriteCore,
} from "./features/favorites/favorites.js";
import { createBatchTemplateApi } from "./features/folders/batch-templates.js";
import {
  countCharsInFolderRecursiveCore,
  countResItemsRecursiveCore,
  getCharactersInFolderCore,
  getResItemsInFolderCore,
  getUncategorizedCharactersCore,
} from "./features/folders/counts.js";
import {
  addResFolderCore,
  createNewTagInSystemCore,
} from "./features/folders/create.js";
import {
  enterResDeleteModeCore,
  exitResDeleteModeCore,
  prependResDeleteToolbarCore,
  toggleResDeleteItemCore,
} from "./features/folders/delete-mode.js";
import {
  executeResourceDeleteCore,
  removeResFolderCore,
} from "./features/folders/delete.js";
import { createTagImportController } from "./features/folders/import-tags.js";
import {
  reorderFolderCore,
  reorderResFolderCore,
} from "./features/folders/move.js";
import { createQuickAddApi } from "./features/folders/quick-add.js";
import {
  buildPrefixedTagNameCore,
  findOrCreateTagCore,
  getCharactersCore,
  getChildFoldersCore,
  getFolderPathCore,
  getFolderTagIdsCore,
  getFullTagNameCore,
  getResChildFoldersCore,
  getResFolderDisplayNameCore,
  getResFolderIdsCore,
  getResFolderNameCore,
  getResFolderPathCore,
  getResFolderTreeCore,
  getResTopLevelFoldersCore,
  getTagListCore,
  getTagMapCore,
  getTagNameCore,
  getTopLevelFoldersCore,
  rebuildTagNameCore,
  recursiveRebuildTagNamesCore,
  saveResTreeCore,
  sortResFoldersCore,
  wouldCreateCycleCore,
  wouldCreateResCycleCore,
} from "./features/folders/tree.js";
import { cfmTCore } from "./features/i18n/language.js";
import {
  cfmConvertDomTextCore,
  initCfmS2tObserverCore,
} from "./features/i18n/s2t-bridge.js";
import { getTabMenuConfigCore } from "./features/layout/tabs.js";
import { createToolbarActionsApi } from "./features/layout/toolbar-actions.js";
import { getToolbarMenuConfigCore } from "./features/layout/toolbar-config.js";
import { createPersonaBindingsApiCore } from "./features/personas/bindings.js";
import { createCharacterDetailApiCore } from "./features/personas/character-detail.js";
import { createPersonaDetailApiCore } from "./features/personas/detail.js";
import {
  addTagToCharCore,
  autoCleanRedundantTagsCore,
  copyCharToFolderCore,
  handleCharDropToFolderCore,
  moveCharToFolderCore,
  removeCharFromAllFoldersCore,
  removeTagFromCharCore,
} from "./features/personas/folders.js";
import {
  filterHiddenCharsCore,
  getHiddenCharsCore,
  isCharHiddenCore,
  toggleCharHiddenCore,
} from "./features/personas/hidden.js";
import { createPersonaNotesApiCore } from "./features/personas/notes.js";
import { createPersonaViewApiCore } from "./features/personas/view.js";
import { createPresetDetailApiCore } from "./features/presets/detail.js";
import { createPresetNotesApiCore } from "./features/presets/notes.js";
import { createPresetPromptEditorApi as createPresetPromptEditorApiCore } from "./features/presets/prompt-editor.js";
import * as presetPromptsCore from "./features/presets/prompts.js";
import { createNativePresetPromptEditorApi as createNativePresetPromptEditorApiCore } from "./features/presets/prompts.js";
import { createPresetRenameApiCore } from "./features/presets/rename.js";
import {
  getCurrentPresetNameCore,
  getCurrentPresetsCore,
} from "./features/presets/view.js";
import { createQuickReplyNotesApiCore } from "./features/quickreply/notes.js";
import {
  createQuickReplyPresetsApiCore,
  saveBackupBridgeQuickReplySet,
} from "./features/quickreply/presets.js";
import { createQuickReplyRenameApiCore } from "./features/quickreply/rename.js";
import { createRegexGroupsApiCore } from "./features/regex/groups.js";
import { createRegexNativeStateApi } from "./features/regex/native-state.js";
import { createRegexPresetEditApi } from "./features/regex/preset-edit.js";
import { createRegexTreeApiCore } from "./features/regex/tree.js";
import { createRegexViewApiCore } from "./features/regex/view.js";
import { renameTagInSystemCore } from "./features/rename/rename.js";
import { fuzzyMatch as matcherFuzzyMatch } from "./features/search/matcher.js";
import { createResourceSearchApiCore } from "./features/search/resource-search.js";
import { bindSearchInputs } from "./features/search/search-bindings.js";
import { createGlobalSearchCore } from "./features/search/search-global.js";
import { createSearchHelpers } from "./features/search/search-helpers.js";
import { createPresetSearchCore } from "./features/search/search-preset.js";
import { createQrSearchCore } from "./features/search/search-qr.js";
import { createRegexSearchCore } from "./features/search/search-regex.js";
import { createWorldInfoSearchCore } from "./features/search/search-worldinfo.js";
import { createClearModesApi } from "./features/selection/clear-modes.js";
import {
  clearMultiSelectCore,
  getMultiDragDataCore,
  getVisibleResourceIdsCore,
  handleFolderTargetMoveCore,
  selectAllVisibleCore,
  toggleMultiSelectItemCore,
} from "./features/selection/mode.js";
import {
  revertResSortCore,
  revertSortCore,
  takeResSortSnapshotCore,
  takeSortSnapshotCore,
} from "./features/sort/snapshot.js";
import {
  bindCharSortBindings,
  bindResSortBindings,
} from "./features/sort/sort-bindings.js";
import {
  applyResSortToFoldersCore,
  applySortToFoldersCore,
  sortResItemsCore,
} from "./features/sort/sort.js";
import {
  createThemeNoteModeApi,
  getThemeNoteCore,
  setThemeNoteCore,
} from "./features/themes/notes.js";
import { createThemeRenameModeApi } from "./features/themes/rename.js";
import {
  applyImportedThemeCustomCssCore,
  applyThemeCore,
  getThemeNamesCore,
  normalizeImportedThemeDataCore,
  refreshThemeRuntimeAfterImportCore,
  reloadNativeThemeRuntimeCore,
  rememberImportedThemeRuntimeCore,
  syncThemeSelectOptionsWithRuntimeThemesCore,
} from "./features/themes/view.js";
import { createEntryTransferApiCore } from "./features/transfer/entries.js";
import { createEntryTransferMemoApiCore } from "./features/transfer/memo.js";
import { createEntryTransferMemoViewApiCore } from "./features/transfer/memo-view.js";
import {
  applyWorldInfoPresetCore,
  filterExistingWorldInfoNamesCore,
  getActiveWorldInfoSetCore,
  getCharBoundWorldBooksCore,
  getExistingWorldInfoNameSetCore,
  isWorldInfoActiveCore,
  toggleWorldInfoActivationCore,
} from "./features/worldinfo/activation.js";
import {
  autoApplyWiPresetsCore,
  getAutoApplyPresetIndicesCore,
  refreshAllWiPresetTrackingStateCore,
  syncWiPresetTrackingForManualToggleCore,
  unapplyWiPresetIndexCore,
} from "./features/worldinfo/auto-apply.js";
import {
  bindWiPresetToCharCore,
  bindWiPresetToChatCore,
  bindWiPresetToPresetCore,
  getCurrentCharAvatarCore,
  getCurrentCharNameCore,
  getCurrentChatBindKeyCore,
  getCurrentChatFileNameCore,
  getWiPresetBindSummaryCore,
  makeChatBindKeyCore,
  parseChatBindKeyCore,
  setWiPresetScopeCore,
  unbindWiPresetFromCharCore,
  unbindWiPresetFromChatCore,
  unbindWiPresetFromPresetCore,
} from "./features/worldinfo/bindings.js";
import { createWorldInfoEntriesApiCore } from "./features/worldinfo/entries.js";
import { createWorldInfoNotesApiCore } from "./features/worldinfo/notes.js";
import {
  collectWorldInfoNamesFromDomCore,
  createWiPresetPanelApi as createWiPresetPanelApiCore,
  deleteWiActivePresetCore,
  getWiActivePresetsCore,
  getWorldInfoNamesCore,
  normalizeWorldInfoNameListCore,
  renameWiActivePresetCore,
  sanitizeWiActivePresetStateCore,
  saveWiActivePresetCore,
} from "./features/worldinfo/presets.js";
import { createWorldInfoRenameApiCore } from "./features/worldinfo/rename.js";
import {
  getButtonModeCore,
  initButtonCore,
  setButtonModeCore,
} from "./integrations/native-buttons.js";
import { createNativeFiltersApiCore } from "./integrations/native-filters.js";
import { getStContext, loadStCoreModules } from "./integrations/sillytavern.js";
import { createThemeObserverApi } from "./integrations/theme-observer.js";
import { createBatchCreateCore } from "./settings/batch-create.js";
import { ensureSettingsDefaults } from "./settings/defaults.js";
import { createCustomLayoutCore } from "./settings/pages/layout.js";
import { createSettingsPageCore } from "./settings/pages/settings.js";
import {
  ensureTabMenuConfigRegistry,
  ensureToolbarMenuConfigRegistry,
} from "./settings/registry.js";
import { createBatchControlsCore } from "./settings/render/controls.js";
import { createConfigTabShellCore } from "./settings/render/page.js";
import { createSharedSectionsCore } from "./settings/render/section.js";
import { ensureResourceSettingsSchema } from "./settings/schema.js";
import { cfmConfirmCore } from "./ui/dialogs/confirm.js";
import { createSettingsDialogApiCore } from "./ui/dialogs/settings-dialog.js";
import { createRightListApiCore } from "./ui/list/list-view.js";
import { bindImportButtonEvents } from "./ui/modal/import-bindings.js";
import { createModalApiCore } from "./ui/modal/modal.js";
import { bindNoteRenameButtonEvents } from "./ui/modal/note-rename-bindings.js";
import {
  bindMainPopupHeaderEvents,
  bindMainPopupMobileBehaviors,
  bindModeToolbarEvents,
  buildMainPopupShell,
  createMainPopupCloserCore,
  createResourceTabSwitcher,
} from "./ui/modal/shell.js";
import { createCharDetailApi } from "./ui/panels/character-detail.js";
import {
  applyCustomIconCore,
  applyTopbarIconFromConfigCore,
  clearCustomIconCore,
  createFloatingButtonCore,
  createTopbarButtonCore,
  createWandButtonCore,
  destroyAllButtonsCore,
  detectNeighborIconCore,
  detectThemeIconsCore,
  isImageIconBackgroundCore,
  switchButtonModeCore,
} from "./ui/toolbar/buttons.js";
import { createLeftTreeApiCore } from "./ui/tree/tree-view.js";
import { renderBackgroundsViewCore } from "./ui/views/backgrounds-view.js";
import { createChatSublistApi } from "./ui/views/chat-sublist.js";
import { renderChatlogsViewCore } from "./ui/views/chatlogs-view.js";
import { renderPersonasViewCore } from "./ui/views/personas-view.js";
import { createPresetDetailSublistApi } from "./ui/views/preset-detail-sublist.js";
import { renderPresetsViewCore } from "./ui/views/presets-view.js";
import { renderQRViewCore } from "./ui/views/qr-view.js";
import {
  createRegexSublistApi as createRegexSublistApiCore,
  renderRegexViewCore,
} from "./ui/views/regex-view.js";
import { renderThemesViewCore } from "./ui/views/themes-view.js";
import { createWorldInfoEntryDetailApi } from "./ui/views/worldinfo-entry-detail.js";
import { createWorldInfoEntrySublistApi } from "./ui/views/worldinfo-entry-sublist.js";
import { renderWorldInfoViewCore } from "./ui/views/worldinfo-view.js";
import {
  getEventClientX as getEventClientXCore,
  scrollElementIntoViewCentered as scrollElementIntoViewCenteredCore,
} from "./utils/dom.js";
import {
  escapeHtml as escapeHtmlCore,
  extractUrlFromCss as extractUrlFromCssCore,
  getUniqueImportName as getUniqueImportNameCore,
  toCssUrl as toCssUrlCore,
} from "./utils/text.js";
import {
  formatFileSize as formatFileSizeCore,
  parseCharTime as parseCharTimeCore,
} from "./utils/time.js";

// 酒馆资源管理器 - Edge收藏夹风格双栏布局
// 在 jQuery 回调之前捕获当前脚本路径，用于后续动态加载同目录下的资源
const _cfmCurrentScriptSrc = document.currentScript?.src || "";
jQuery(async () => {
  function getBackupBridgeExportDeps() {
    return {
      $,
      backupBridgeVersion: BACKUP_BRIDGE_VERSION,
      config,
      extensionName,
      extensionSettings: extension_settings,
      ensureResourceSettings,
      fetchWorldInfoDetailData,
      getBackgroundDisplayName,
      getBackgroundNamesForBridge,
      getCharacters,
      getContext,
      getCurrentPresets,
      getFolderTagIds,
      getQrSetNames,
      getRegexGlobalScripts,
      getResFolderTree,
      getResourceGroups,
      getTagMap,
      getTagName,
      getThemeNames,
      getWorldInfoNames,
    };
  }

  async function listBackupBridgeResources(options = {}) {
    return listBackupBridgeResourcesCore(options, getBackupBridgeExportDeps());
  }

  async function readBackupBridgeResource(request = {}) {
    return readBackupBridgeResourceCore(request, getBackupBridgeExportDeps());
  }

  function getBackupBridgeImportDeps() {
    return {
      backupBridgeVersion: BACKUP_BRIDGE_VERSION,
      clearWorldInfoNamesCache: () => {
        _worldInfoNamesCache = null;
      },
      getContext,
      getResFolderTree,
      refreshThemeRuntimeAfterImport,
      rememberImportedThemeRuntime,
      renderBackgroundsView,
      renderPresetsView,
      renderQRView,
      renderThemesView,
      saveBackupBridgeQuickReplySet,
      saveResTree,
      saveWorldInfoDetailData,
      setItemGroup,
    };
  }

  async function writeBackupBridgeResource(request = {}) {
    return writeBackupBridgeResourceCore(request, getBackupBridgeImportDeps());
  }

  function getBackupBridgeDetailsDeps() {
    return {
      extension_settings,
      extensionName,
      config,
      BACKUP_BRIDGE_PROTOCOL_VERSION,
      BACKUP_BRIDGE_VERSION,
      getTagName,
    };
  }

  function getBackupBridgeDetails() {
    return getBackupBridgeDetailsCore(getBackupBridgeDetailsDeps());
  }
  // ==================== 备份同步进度遮罩（HTTP 轮询） ====================
  // CFM_SYNC_STATE_URL / CFM_SYNC_POLL_INTERVAL_MS 已迁移至 core/constants.js（顶部 import 同名提供）

  let backupBridgeSyncController;

  function showCfmSyncOverlay(message, current, total) {
    return backupBridgeSyncController.showSyncOverlay(message, current, total);
  }

  function removeCfmSyncOverlay() {
    return backupBridgeSyncController.removeSyncOverlay();
  }

  async function applyFolderAssignments(assignments) {
    return backupBridgeSyncController.applyFolderAssignments(assignments);
  }

  async function pollSyncState() {
    return backupBridgeSyncController.pollSyncState();
  }

  function startSyncStatePoll() {
    return backupBridgeSyncController.startSyncStatePoll();
  }

  function stopSyncStatePoll() {
    return backupBridgeSyncController.stopSyncStatePoll();
  }

  function setSyncState(payload) {
    return backupBridgeSyncController.setSyncState(payload);
  }

  function publishBackupBridgeSignal(status = "ready", extra = {}) {
    return backupBridgeSyncController.publishBackupBridgeSignal(status, extra);
  }

  // ==================== 简繁转换模块加载 ====================
  // 动态加载 s2t.js（简繁逐字转换字典）
  // 注意：SillyTavern 以 type="module" 加载扩展 JS，document.currentScript 在模块中始终为 null
  // 因此通过多种降级策略推断实际文件夹路径
  try {
    let s2tUrl = "";
    if (_cfmCurrentScriptSrc) {
      // 策略1：从 document.currentScript.src 推断（非 module 模式下有效）
      s2tUrl = _cfmCurrentScriptSrc.replace(/\/[^\/]*$/, "/s2t.js");
    } else {
      // 策略2：从 DOM 中已加载的本扩展 <script> 标签推断
      // SillyTavern 在 addExtensionScript() 中会创建 <script src="/scripts/extensions/third-party/XXX/index.js">
      const selfScript = document.querySelector(
        'script[src*="Folder-Manager"][src$="index.js"]',
      );
      if (selfScript) {
        s2tUrl = selfScript.src.replace(/\/[^\/]*$/, "/s2t.js");
      } else {
        // 策略3：从已加载的 CSS <link> 标签推断
        const cssLink = document.querySelector(
          'link[href*="Folder-Manager"][href$="style.css"]',
        );
        if (cssLink) {
          s2tUrl = cssLink.href.replace(/style\.css$/, "s2t.js");
        } else {
          // 策略4：最终降级使用硬编码路径
          s2tUrl = `/${extensionFolderPath}/s2t.js`;
        }
      }
    }
    const s2tScript = document.createElement("script");
    s2tScript.src = s2tUrl;
    document.head.appendChild(s2tScript);
    await new Promise((resolve, reject) => {
      s2tScript.onload = resolve;
      s2tScript.onerror = () => {
        console.warn(
          "[CFM] s2t.js 加载失败，简繁转换不可用，尝试路径:",
          s2tUrl,
        );
        resolve(); // 不阻塞主流程
      };
    });
  } catch (e) {
    console.warn("[CFM] 加载简繁转换字典异常:", e);
  }

  /**
   * 将简体中文文本转换为繁体中文（如果当前设置为繁体）
   * @param {string} text - 简体中文文本
   * @returns {string} 转换后的文本
   */
  function cfmT(text) {
    return cfmTCore(text, {
      extensionName,
      getExtensionSettings: () =>
        typeof getContext === "function" ? getContext().extensionSettings : {},
      s2t: window._cfm_s2t,
    });
  }

  /**
   * 遍历 DOM 子树中的所有文本节点，执行简繁转换
   * @param {Element} root - 根元素
   */
  function cfmConvertDomText(root) {
    return cfmConvertDomTextCore(root, {
      extensionName,
      getExtensionSettings: () =>
        typeof getContext === "function" ? getContext().extensionSettings : {},
      s2t: window._cfm_s2t,
      document,
      NodeFilter,
    });
  }

  // CFM 专用 toastr 包装（自动简繁转换，不影响酒馆其他组件）
  const cfmToastr = {
    success: (msg, title, ...rest) =>
      toastr.success(cfmT(msg), title ? cfmT(title) : title, ...rest),
    info: (msg, title, ...rest) =>
      toastr.info(cfmT(msg), title ? cfmT(title) : title, ...rest),
    warning: (msg, title, ...rest) =>
      toastr.warning(cfmT(msg), title ? cfmT(title) : title, ...rest),
    error: (msg, title, ...rest) =>
      toastr.error(cfmT(msg), title ? cfmT(title) : title, ...rest),
  };

  // CFM 专用 confirm 包装（自动简繁转换）
  function cfmConfirm(msg) {
    return cfmConfirmCore(msg, {
      confirm: window.confirm.bind(window),
      translate: cfmT,
    });
  }

  // ==================== 全局 MutationObserver：自动简繁转换 ====================
  // 监听 body 下 CFM 相关 overlay/popup 的插入与内容变化，自动转换文本
  function initCfmS2tObserver() {
    return initCfmS2tObserverCore({
      extensionName,
      getExtensionSettings: () =>
        typeof getContext === "function" ? getContext().extensionSettings : {},
      s2t: window._cfm_s2t,
      convertDomText: cfmConvertDomText,
      document,
      MutationObserver,
    });
  }

  initCfmS2tObserver();

  // ==================== 资源类型管理 ====================
  let currentResourceType = "chars"; // 'chars' | 'presets' | 'worldinfo' | 'themes' | 'backgrounds'

  // 预设/世界书的简单分组存储
  // 结构: { [itemName]: folderName | null }
  function ensureResourceSettings() {
    return ensureResourceSettingsSchema({
      extensionSettings: extension_settings,
      extensionName,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  // ==================== 资源文件夹树模型 ====================
  function getResFolderTreeDeps() {
    return {
      ensureResourceSettings,
      extensionName,
      extensionSettings: extension_settings,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    };
  }

  function getResFolderTree(type) {
    return getResFolderTreeCore(type, getResFolderTreeDeps());
  }
  function saveResTree(type) {
    saveResTreeCore(getResFolderTreeDeps());
  }
  function getResFolderIds(type) {
    return getResFolderIdsCore(type, getResFolderTreeDeps());
  }
  function getResFolderName(type, folderId) {
    return getResFolderNameCore(type, folderId);
  }
  function getResFolderDisplayName(type, folderId) {
    return getResFolderDisplayNameCore(type, folderId, getResFolderTreeDeps());
  }
  function getResTopLevelFolders(type) {
    return getResTopLevelFoldersCore(type, getResFolderTreeDeps());
  }
  function getResChildFolders(type, parentId) {
    return getResChildFoldersCore(type, parentId, getResFolderTreeDeps());
  }
  let _regexTreeApi = null;
  function getRegexTreeApi() {
    if (!_regexTreeApi) {
      _regexTreeApi = createRegexTreeApiCore({
        ensureResourceSettings,
        extensionName,
        extension_settings,
        saveResTree,
      });
    }
    return _regexTreeApi;
  }
  function getRegexFolderTree() {
    return getRegexTreeApi().getRegexFolderTree();
  }
  function sortRegexFolderIds(folderIds) {
    return getRegexTreeApi().sortRegexFolderIds(folderIds);
  }
  function wouldCreateRegexCycle(folderId, parentId) {
    return getRegexTreeApi().wouldCreateRegexCycle(folderId, parentId);
  }
  function reorderRegexFolder(folderId, newParentId, insertBeforeId) {
    return getRegexTreeApi().reorderRegexFolder(
      folderId,
      newParentId,
      insertBeforeId,
    );
  }
  function moveRegexFolder(data, target) {
    return getRegexTreeApi().moveRegexFolder(data, target);
  }
  function sortResFolders(type, folderIds) {
    return sortResFoldersCore(type, folderIds, getResFolderTreeDeps());
  }
  function wouldCreateResCycle(type, folderId, parentId) {
    return wouldCreateResCycleCore(
      type,
      folderId,
      parentId,
      getResFolderTreeDeps(),
    );
  }
  function getResFolderPath(type, folderId) {
    return getResFolderPathCore(type, folderId, getResFolderTreeDeps());
  }
  function getResItemsInFolder(type, folderId) {
    return getResItemsInFolderCore(type, folderId, {
      getResourceGroups,
      getResChildFolders,
    });
  }

  function countResItemsRecursive(type, folderId) {
    return countResItemsRecursiveCore(type, folderId, {
      getResourceGroups,
      getResChildFolders,
    });
  }
  function reorderResFolder(type, folderId, newParentId, insertBeforeId) {
    return reorderResFolderCore(type, folderId, newParentId, insertBeforeId, {
      getResFolderTree,
      getResChildFolders,
      sortResFolders,
      saveResTree,
    });
  }

  function addResFolder(type, name, parentId, displayName) {
    return addResFolderCore(type, name, parentId, displayName, {
      getResFolderTree,
      getResChildFolders,
      saveResTree,
    });
  }

  function removeResFolder(type, folderId) {
    return removeResFolderCore(type, folderId, {
      getResFolderTree,
      getResChildFolders,
      getResourceGroups,
      saveResTree,
    });
  }

  // 重命名文件夹（通用弹窗）
  function promptRenameFolder(resType, folderId, renderFn) {
    // 获取当前显示名
    let currentName;
    if (resType === "chars") {
      currentName = getTagName(folderId);
    } else {
      currentName = getResFolderDisplayName(resType, folderId);
    }
    const newName = prompt("重命名文件夹", currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    const trimmed = newName.trim();
    if (resType === "chars") {
      // 角色卡文件夹使用 tag 系统
      config.folders[folderId].displayName = trimmed;
      rebuildTagName(folderId);
      recursiveRebuildTagNames(folderId);
      saveSettings();
    } else {
      // 资源类型文件夹
      const tree = getResFolderTree(resType);
      if (tree[folderId]) {
        tree[folderId].displayName = trimmed;
        saveResTree(resType);
      }
    }
    if (typeof renderFn === "function") renderFn();
    cfmToastr.success(`文件夹已重命名为「${trimmed}」`);
  }

  // 兼容旧接口
  function getResourceFolders(type) {
    ensureResourceSettings();
    return getResFolderIds(type);
  }
  function setResourceFolders(type, folders) {
    // 不再使用，保留空壳兼容
  }
  function getResourceGroups(type) {
    ensureResourceSettings();
    return type === "presets"
      ? extension_settings[extensionName].presetGroups
      : type === "themes"
        ? extension_settings[extensionName].themeGroups
        : type === "backgrounds"
          ? extension_settings[extensionName].bgGroups
          : type === "personas"
            ? extension_settings[extensionName].personaGroups
            : type === "quickreply"
              ? extension_settings[extensionName].qrGroups
              : extension_settings[extensionName].worldInfoGroups;
  }
  function setItemGroup(type, itemName, folderName) {
    const groups = getResourceGroups(type);
    if (folderName) groups[itemName] = folderName;
    else delete groups[itemName];
    getContext().saveSettingsDebounced();
  }

  async function flushFolderAssignmentSettings() {
    const context = getContext();
    try {
      if (context && typeof context.saveSettings === "function") {
        await context.saveSettings();
        return;
      }
    } catch (err) {
      console.warn(
        "[CFM] context.saveSettings 持久化失败，回退到其他保存方式",
        err,
      );
    }

    try {
      if (typeof saveSettings === "function") {
        await saveSettings();
        return;
      }
    } catch (err) {
      console.warn("[CFM] saveSettings 持久化失败，回退到 debounce 保存", err);
    }

    if (context && typeof context.saveSettingsDebounced === "function") {
      context.saveSettingsDebounced();
    }
  }

  // 获取当前API的预设列表
  function getCurrentPresets() {
    return getCurrentPresetsCore({
      $,
      detachedOptions: _presetDetachedOptions,
      getPresetManager: () => getContext().getPresetManager(),
      syncPresetCustomOrder,
    });
  }
  function getCurrentPresetApiId() {
    const pm = getContext().getPresetManager();
    return pm ? pm.apiId : "unknown";
  }

  function getPresetCustomOrderStore() {
    ensureSettings();
    const settings = extension_settings[extensionName];
    if (!Array.isArray(settings.presetCustomOrder)) {
      settings.presetCustomOrder = [];
    }
    return settings.presetCustomOrder;
  }

  function syncPresetCustomOrder(presets = []) {
    const normalizedItems = (Array.isArray(presets) ? presets : []).filter(
      (item) => item && typeof item === "object",
    );
    const normalizedNames = [
      ...new Set(
        normalizedItems
          .map((item) => String(item.name || "").trim())
          .filter(Boolean),
      ),
    ];
    const currentOrder = getPresetCustomOrderStore();
    const normalizedOrder = [
      ...new Set(
        currentOrder.map((name) => String(name || "").trim()).filter(Boolean),
      ),
    ];
    const nextOrder = normalizedOrder.filter((name) =>
      normalizedNames.includes(name),
    );
    for (const name of normalizedNames) {
      if (!nextOrder.includes(name)) nextOrder.push(name);
    }
    const changed =
      nextOrder.length !== currentOrder.length ||
      nextOrder.some(
        (name, idx) => name !== String(currentOrder[idx] || "").trim(),
      );
    if (changed) {
      extension_settings[extensionName].presetCustomOrder = nextOrder;
      getContext().saveSettingsDebounced();
    }
    return nextOrder;
  }

  function insertPresetAfterInCustomOrder(sourcePresetName, newPresetName) {
    const sourceName = String(sourcePresetName || "").trim();
    const targetName = String(newPresetName || "").trim();
    if (!targetName) return;
    const order = [...getPresetCustomOrderStore()]
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    const filtered = order.filter((name) => name !== targetName);
    const sourceIndex = filtered.indexOf(sourceName);
    if (sourceIndex === -1) filtered.push(targetName);
    else filtered.splice(sourceIndex + 1, 0, targetName);
    extension_settings[extensionName].presetCustomOrder = filtered;
    getContext().saveSettingsDebounced();
  }

  function removePresetFromCustomOrder(presetName) {
    const targetName = String(presetName || "").trim();
    if (!targetName) return;
    const order = getPresetCustomOrderStore();
    const nextOrder = order.filter(
      (name) => String(name || "").trim() !== targetName,
    );
    if (nextOrder.length === order.length) return;
    extension_settings[extensionName].presetCustomOrder = nextOrder;
    getContext().saveSettingsDebounced();
  }

  function buildDuplicatedPresetName(baseName) {
    const normalizedBase = String(baseName || "").trim() || "未命名预设";
    const existingNames = new Set(
      getCurrentPresets()
        .map((preset) => String(preset?.name || "").trim())
        .filter(Boolean),
    );
    let nextName = `${normalizedBase} - 副本`;
    let counter = 2;
    while (existingNames.has(nextName)) {
      nextName = `${normalizedBase} - 副本 ${counter}`;
      counter++;
    }
    return nextName;
  }

  function applyPreset(value) {
    const pm = getContext().getPresetManager();
    if (pm && pm.select) {
      pm.select.val(value).trigger("change");
      setTimeout(() => {
        refreshActiveViewerStateAfterSelectionChange({ preset: true });
      }, 0);
    }
  }
  function getCurrentPresetName() {
    return getCurrentPresetNameCore({
      getCurrentPresets,
      getPresetManager: () => getContext().getPresetManager(),
    });
  }
  function isCurrentAppliedPreset(presetName) {
    return String(presetName || "") === String(getCurrentPresetName() || "");
  }
  function ensureCurrentAppliedPreset(presetName, actionLabel = "操作") {
    if (isCurrentAppliedPreset(presetName)) return true;
    const currentPresetName = getCurrentPresetName();
    if (currentPresetName) {
      cfmToastr.warning(
        `${actionLabel}仅支持当前应用的预设：${currentPresetName}`,
      );
    } else {
      cfmToastr.warning(`请先应用一个预设后再执行${actionLabel}`);
    }
    return false;
  }

  // 获取世界书列表（带缓存，优先从DOM读取避免网络延迟）
  let _worldInfoNamesCache = null;
  let _worldInfoPreloadPromise = null;
  let _personaListCache = null;
  let _personaListCacheTime = 0;
  const PERSONA_LIST_CACHE_TTL = 5000;
  // world-info.js 模块缓存：首次 import 后缓存引用，后续同步读取避免 await 延迟
  let _wiModuleCache = null;
  // 预加载 persona 数据的 Promise
  let _personasPreloadPromise = null;
  /** 获取已缓存的 world-info.js 模块引用（同步），返回 null 如果尚未缓存 */
  function getWiModuleSync() {
    return _wiModuleCache;
  }
  /** 确保 world-info.js 模块已缓存（异步），返回模块引用 */
  async function ensureWiModule() {
    if (_wiModuleCache) return _wiModuleCache;
    _wiModuleCache = await import("../../../world-info.js");
    return _wiModuleCache;
  }
  function normalizeWorldInfoNameList(names) {
    return normalizeWorldInfoNameListCore(names);
  }

  function collectWorldInfoNamesFromDom() {
    return collectWorldInfoNamesFromDomCore({
      $,
      detachedOptions: _worldInfoDetachedOptions,
    });
  }

  async function getWorldInfoNames(forceRefresh) {
    return getWorldInfoNamesCore(forceRefresh, {
      $,
      detachedOptions: _worldInfoDetachedOptions,
      fetchSettings: () =>
        fetch("/api/settings/get", {
          method: "POST",
          headers: getContext().getRequestHeaders(),
          body: JSON.stringify({}),
        }),
      getCachedNames: () => _worldInfoNamesCache,
      logForceRefreshError: (e) =>
        console.error("[CFM] 强制刷新世界书列表失败", e),
      setCachedNames: (names) => {
        _worldInfoNamesCache = names;
      },
    });
  }

  const _importedThemeRuntimeCache = new Map();

  // 获取主题列表（从 DOM #themes 下拉框及被过滤暂存的 option 获取）
  function getThemeNames() {
    return getThemeNamesCore({
      $,
      detachedOptions: _themeDetachedOptions,
    });
  }

  function normalizeImportedThemeData(themeData, fallbackName = "") {
    return normalizeImportedThemeDataCore(themeData, fallbackName, {
      structuredClone,
    });
  }

  function rememberImportedThemeRuntime(themeName, themeData) {
    return rememberImportedThemeRuntimeCore(themeName, themeData, {
      importedThemeRuntimeCache: _importedThemeRuntimeCache,
      structuredClone,
    });
  }

  let _nativeThemeRuntimeReloadPromise = null;

  async function reloadNativeThemeRuntime() {
    return reloadNativeThemeRuntimeCore({
      console,
      document,
      fetchSettings: () =>
        fetch("/api/settings/get", {
          method: "POST",
          headers: getContext().getRequestHeaders(),
          body: JSON.stringify({}),
          cache: "no-cache",
        }),
      getNativeThemeRuntimeReloadPromise: () =>
        _nativeThemeRuntimeReloadPromise,
      importPowerUser: () => import("/scripts/power-user.js"),
      selectOriginalOrder: _selectOriginalOrder,
      setNativeThemeRuntimeReloadPromise: (promise) => {
        _nativeThemeRuntimeReloadPromise = promise;
      },
      setThemeDetachedOptions: (options) => {
        _themeDetachedOptions = options;
      },
    });
  }

  function applyImportedThemeCustomCss(themeName) {
    return applyImportedThemeCustomCssCore(themeName, {
      document,
      importedThemeRuntimeCache: _importedThemeRuntimeCache,
    });
  }

  // 应用主题（通过设置 #themes 下拉框值并触发 change 事件）
  function applyTheme(themeName) {
    return applyThemeCore(themeName, {
      CSS,
      Event,
      cfmToastr,
      document,
    });
  }

  // 重新整理主题下拉框的 option 顺序，保持可见项与被过滤暂存项一致。
  function syncThemeSelectOptionsWithRuntimeThemes() {
    return syncThemeSelectOptionsWithRuntimeThemesCore({
      $,
      getThemeDetachedOptions: () => _themeDetachedOptions,
      selectOriginalOrder: _selectOriginalOrder,
      setThemeDetachedOptions: (options) => {
        _themeDetachedOptions = options;
      },
    });
  }

  async function refreshThemeRuntimeAfterImport(reapplyCurrentTheme = false) {
    return refreshThemeRuntimeAfterImportCore(reapplyCurrentTheme, {
      $,
      Event,
      applyImportedThemeCustomCss,
      applyThemeFilter,
      document,
      reloadNativeThemeRuntime,
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      syncThemeSelectOptionsWithRuntimeThemes,
    });
  }

  $(document)
    .off("change.cfmImportedThemeRuntime", "#themes")
    .on("change.cfmImportedThemeRuntime", "#themes", function () {
      const currentTheme = String(this.value || "");
      if (!currentTheme) return;
      requestAnimationFrame(() => {
        applyImportedThemeCustomCss(currentTheme);
      });
    });

  // 获取背景列表（从DOM #bg_menu_content 中的 .bg_example 元素）
  function getBackgroundNames() {
    return getBackgroundNamesCore({
      $,
    });
  }

  async function getBackgroundNamesForBridge() {
    const collectNames = () =>
      Array.from(
        new Set(
          getBackgroundNames()
            .map((name) => String(name || "").trim())
            .filter(Boolean),
        ),
      );

    const immediateNames = collectNames();
    if (immediateNames.length > 0) {
      return immediateNames;
    }

    try {
      const bgModule = await import("../../../backgrounds.js");
      if (typeof bgModule.getBackgrounds === "function") {
        await bgModule.getBackgrounds();
      }
    } catch (error) {
      console.warn("[CFM] 刷新背景列表失败，尝试 API 回退", error);
    }

    const refreshedNames = collectNames();
    if (refreshedNames.length > 0) {
      return refreshedNames;
    }

    try {
      const bgResp = await fetch("/api/backgrounds/all", {
        method: "POST",
        headers: getContext().getRequestHeaders(),
        body: JSON.stringify({}),
      });

      if (!bgResp.ok) {
        throw new Error(`HTTP ${bgResp.status}`);
      }

      const payload = await bgResp.json();
      const apiNames = Array.isArray(payload?.images)
        ? payload.images
            .map((name) => String(name || "").trim())
            .filter(Boolean)
        : [];

      return Array.from(new Set(apiNames));
    } catch (error) {
      console.warn("[CFM] 读取背景列表 API 失败", error);
    }

    return refreshedNames;
  }

  // 获取背景的友好显示名（去掉扩展名）
  function getBackgroundDisplayName(bgfile) {
    return getBackgroundDisplayNameCore(bgfile);
  }

  // 应用背景（点击对应的 .bg_example 元素）
  function applyBackground(bgfile) {
    return applyBackgroundCore(bgfile, {
      CSS,
      cfmToastr,
      document,
      getBackgroundDisplayName,
    });
  }

  // 获取背景缩略图URL
  function getBackgroundThumbnailUrl(bgfile) {
    return getBackgroundThumbnailUrlCore(bgfile);
  }

  /**
   * 导入重名冲突处理弹窗
   * @param {string[]} duplicateNames - 重名的文件名列表
   * @param {number} totalCount - 总文件数
   * @param {string} resourceType - 资源类型显示名（"预设"/"世界书"）
   * @returns {Promise<string>} 用户选择: 'overwrite' | 'rename' | 'skip' | 'cancel'
   */
  function showDuplicateImportDialog(duplicateNames, totalCount, resourceType) {
    return new Promise((resolve) => {
      const isBatch = totalCount > 1;
      const dupCount = duplicateNames.length;
      const dupListHtml =
        duplicateNames.length <= 8
          ? duplicateNames
              .map(
                (n) =>
                  `<li style="margin:2px 0;color:var(--SmartThemeQuoteColor,#f5c542);">${n}</li>`,
              )
              .join("")
          : duplicateNames
              .slice(0, 7)
              .map(
                (n) =>
                  `<li style="margin:2px 0;color:var(--SmartThemeQuoteColor,#f5c542);">${n}</li>`,
              )
              .join("") +
            `<li style="margin:2px 0;color:var(--SmartThemeBodyColor);">...等共 ${dupCount} 个</li>`;

      const dialogHtml = `
        <div class="cfm-dup-dialog" style="padding:16px 20px;max-width:420px;width:100%;box-sizing:border-box;">
          <div style="margin-bottom:10px;font-size:14px;font-weight:bold;">
            以下${resourceType}名称已存在：
          </div>
          <ul style="list-style:none;padding:0;margin:0 0 12px 8px;font-size:13px;">
            ${dupListHtml}
          </ul>
          ${isBatch ? `<div style="margin-bottom:10px;font-size:13px;color:var(--SmartThemeEmColor,#aaa);">共 ${totalCount} 个文件，其中 ${dupCount} 个名称重复</div>` : ""}
          <div style="margin-bottom:8px;font-size:13px;">请选择处理方式：</div>
          <div style="display:flex !important;flex-direction:column !important;gap:8px;width:100%;">
            ${isBatch ? `<button class="cfm-dup-btn" data-action="skip" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">跳过重复，仅导入不重复的（${totalCount - dupCount} 个）</button>` : ""}
            <button class="cfm-dup-btn" data-action="overwrite" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">覆盖已有的${resourceType}</button>
            <button class="cfm-dup-btn" data-action="rename" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">自动重命名（末尾加 -1）</button>
            <button class="cfm-dup-btn" data-action="cancel" style="display:block !important;width:100% !important;padding:10px 12px !important;font-size:13px !important;text-align:center !important;white-space:normal !important;word-break:break-word !important;box-sizing:border-box !important;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e) !important;color:var(--SmartThemeBodyColor,#ccc) !important;border:1px solid var(--SmartThemeBorderColor,#555) !important;border-radius:5px !important;margin:0 !important;">取消导入</button>
          </div>
        </div>
      `;

      const overlay = $("<div>").css({
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        overflow: "auto",
      });

      const dialog = $("<div>")
        .css({
          background: "var(--SmartThemeBlurTintColor, #1a1a2e)",
          border: "1px solid var(--SmartThemeBorderColor, #444)",
          borderRadius: "8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          color: "var(--SmartThemeBodyColor, #ccc)",
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "auto",
          writingMode: "horizontal-tb",
          boxSizing: "border-box",
        })
        .html(dialogHtml);

      overlay.append(dialog);
      $("body").append(overlay);

      overlay.find(".cfm-dup-btn").on("click", function () {
        const action = $(this).data("action");
        overlay.remove();
        resolve(action);
      });

      // ESC 取消
      const escHandler = (evt) => {
        if (evt.key === "Escape") {
          overlay.remove();
          document.removeEventListener("keydown", escHandler);
          resolve("cancel");
        }
      };
      document.addEventListener("keydown", escHandler);
    });
  }

  /**
   * 导入失败详情弹窗 —— 列出失败的文件名，供用户确认
   * @param {string[]} failedFiles - 失败的文件名列表
   * @param {string} resourceType - 资源类型显示名（"角色卡" / "预设" / "世界书" 等）
   */
  function showImportFailureDialog(failedFiles, resourceType) {
    if (!failedFiles || failedFiles.length === 0) return;
    const count = failedFiles.length;
    const listHtml =
      count <= 12
        ? failedFiles
            .map(
              (n) =>
                `<li style="margin:2px 0;color:var(--SmartThemeQuoteColor,#f5c542);word-break:break-all;">${n}</li>`,
            )
            .join("")
        : failedFiles
            .slice(0, 11)
            .map(
              (n) =>
                `<li style="margin:2px 0;color:var(--SmartThemeQuoteColor,#f5c542);word-break:break-all;">${n}</li>`,
            )
            .join("") +
          `<li style="margin:2px 0;color:var(--SmartThemeBodyColor);">...等共 ${count} 个</li>`;

    const dialogHtml = `
      <div style="padding:16px 20px;max-width:460px;width:100%;box-sizing:border-box;">
        <div style="margin-bottom:10px;font-size:14px;font-weight:bold;color:var(--SmartThemeBodyColor,#ccc);">
          以下 ${count} 个${resourceType}导入失败：
        </div>
        <ul style="list-style:none;padding:0;margin:0 0 14px 8px;font-size:13px;max-height:45vh;overflow-y:auto;">
          ${listHtml}
        </ul>
        <div style="display:flex;justify-content:flex-end;">
          <button class="cfm-fail-dialog-ok" style="padding:8px 28px;font-size:13px;cursor:pointer;background:var(--SmartThemeBlurTintColor,#2a2a3e);color:var(--SmartThemeBodyColor,#ccc);border:1px solid var(--SmartThemeBorderColor,#555);border-radius:5px;">确定</button>
        </div>
      </div>
    `;

    const overlay = $("<div>").css({
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.6)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      boxSizing: "border-box",
      overflow: "auto",
    });

    const dialog = $("<div>")
      .css({
        background: "var(--SmartThemeBlurTintColor, #1a1a2e)",
        border: "1px solid var(--SmartThemeBorderColor, #444)",
        borderRadius: "8px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        color: "var(--SmartThemeBodyColor, #ccc)",
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 32px)",
        overflow: "auto",
        writingMode: "horizontal-tb",
        boxSizing: "border-box",
      })
      .html(dialogHtml);

    overlay.append(dialog);
    $("body").append(overlay);

    overlay.find(".cfm-fail-dialog-ok").on("click", function () {
      overlay.remove();
    });

    // ESC 关闭
    const escHandler = (evt) => {
      if (evt.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  /**
   * 生成不重复的名称（末尾加 -1, -2, ...）
   * @param {string} baseName - 原始名称
   * @param {Set<string>} existingNames - 已存在的名称集合
   * @returns {string} 不重复的新名称
   */
  function getUniqueImportName(baseName, existingNames) {
    return getUniqueImportNameCore(baseName, existingNames);
  }

  function openWorldInfoEditor(name) {
    // 找到对应的option index
    let targetVal = null;
    $("#world_editor_select option").each(function () {
      if ($(this).text() === name) {
        targetVal = $(this).val();
        return false;
      }
    });
    if (targetVal !== null) {
      $("#world_editor_select").val(targetVal).trigger("change");
      // 尝试打开世界书编辑面板
      const wiPanel = $("#WorldInfo");
      if (wiPanel.length && !wiPanel.is(":visible")) {
        $("#WIDrawerIcon").trigger("click");
      }
    }
  }

  // 复制模式（默认关闭=移动模式）
  let cfmCopyMode = false;

  const getContext = getStContext();

  // 动态导入酒馆核心模块（script.js / personas.js / popup.js / utils.js），
  // 获取 entitiesFilter、printCharactersDebounced、聊天记录管理 API、personas 过滤、
  // Popup 裁剪弹窗与图像预处理工具（见 integrations/sillytavern.js，含降级兜底）
  const {
    entitiesFilter,
    printCharactersDebounced,
    getPastCharacterChatsFunc,
    deleteCharacterChatByNameFunc,
    renameGroupOrCharacterChatFunc,
    openCharacterChatFunc,
    importCharacterChatFunc,
    doNewChatFunc,
    personasFilter,
    getUserAvatarsFunc,
    Popup,
    POPUP_TYPE,
    ensureImageFormatSupported,
    getBase64Async,
  } = await loadStCoreModules();

  function getTagList() {
    return getTagListCore({ getContext });
  }

  function getTagMap() {
    return getTagMapCore({ getContext });
  }

  function getCharacters() {
    return getCharactersCore({ getContext });
  }
  function getThumbnailUrl(type, file) {
    return getContext().getThumbnailUrl(type, file);
  }

  // ==================== 配置管理 ====================
  const extension_settings = getContext().extensionSettings;

  function ensureSettings() {
    return ensureSettingsDefaults({
      extensionSettings: extension_settings,
      extensionName,
      storageKey: STORAGE_KEY,
    });
  }
  ensureSettings();
  // ==================== 自定义布局：元数据定义 ====================
  // CFM_TAB_META / CFM_ACTION_META 已迁移至 core/resource-types.js（顶部 import 同名提供）

  function ensureTabMenuConfig() {
    return ensureTabMenuConfigRegistry(
      extension_settings[extensionName].customLayout,
    );
  }

  function getTabMenuConfig() {
    ensureTabMenuConfig();
    return getTabMenuConfigCore(extension_settings[extensionName].customLayout);
  }

  /** 获取当前生效的标签页列表（已排序、已过滤不可见） */
  function getVisibleTabs() {
    const layout = extension_settings[extensionName].customLayout;
    if (!layout || !layout.tabs) return CFM_TAB_META.map((t) => t.id);
    ensureTabMenuConfig();
    // 确保新增标签页也被包含（防止新增标签页在已有布局中缺失）
    const existing = new Set(layout.tabs.map((t) => t.id));
    const allTabs = [...layout.tabs];
    for (const meta of CFM_TAB_META) {
      if (!existing.has(meta.id))
        allTabs.push({ id: meta.id, visible: true, menu: false });
    }
    const menuEnabled = getTabMenuConfig().enabled;
    return allTabs
      .filter((t) => t.visible !== false && !(menuEnabled && t.menu === true))
      .map((t) => t.id);
  }

  function getMenuTabs() {
    const layout = extension_settings[extensionName].customLayout;
    if (!layout || !layout.tabs) return [];
    ensureTabMenuConfig();
    if (!getTabMenuConfig().enabled) return [];
    return getOrderedTabs()
      .filter((t) => t.visible !== false && t.menu === true)
      .map((t) => t.id);
  }

  /** 获取当前生效的标签页列表（已排序，含不可见） */
  function getOrderedTabs() {
    const layout = extension_settings[extensionName].customLayout;
    if (!layout || !layout.tabs)
      return CFM_TAB_META.map((t) => ({
        id: t.id,
        visible: true,
        menu: false,
      }));
    ensureTabMenuConfig();
    // 确保所有标签页都在列表中（防止新增标签页丢失）
    const existing = new Set(layout.tabs.map((t) => t.id));
    const result = [...layout.tabs];
    for (const meta of CFM_TAB_META) {
      if (!existing.has(meta.id))
        result.push({ id: meta.id, visible: true, menu: false });
    }
    for (const tab of result) {
      if (tab.menu === undefined) tab.menu = false;
    }
    return result;
  }

  let _toolbarActionsApi = null;
  function getToolbarActionsApi() {
    if (!_toolbarActionsApi) {
      _toolbarActionsApi = createToolbarActionsApi({
        $,
        CFM_ACTION_BTN_MAP,
        CFM_ACTION_META,
        CFM_HEADER_COUNT_MAP,
        ensureToolbarMenuConfig,
        extensionName,
        extension_settings,
        getToolbarMenuActions,
        getToolbarMenuConfig,
        getVisibleActions,
      });
    }
    return _toolbarActionsApi;
  }

  /** 获取某标签页的子功能列表（已排序，含不可见） */
  function getOrderedActions(tabId) {
    return getToolbarActionsApi().getOrderedActions(tabId);
  }
  function ensureToolbarMenuConfig() {
    return ensureToolbarMenuConfigRegistry(
      extension_settings[extensionName].customLayout,
      CFM_TAB_META,
    );
  }

  function getToolbarMenuConfig(tabId) {
    ensureToolbarMenuConfig();
    return getToolbarMenuConfigCore(
      extension_settings[extensionName].customLayout,
      tabId,
    );
  }

  function getToolbarMenuActions(tabId) {
    const menuCfg = getToolbarMenuConfig(tabId);
    if (!menuCfg.enabled) return [];
    return getOrderedActions(tabId)
      .filter((a) => a.menu === true)
      .map((a) => a.id);
  }

  /** 获取某标签页可见的子功能 ID 列表 */
  function getVisibleActions(tabId) {
    const menuSet = new Set(getToolbarMenuActions(tabId));
    return getOrderedActions(tabId)
      .filter((a) => a.visible !== false && !menuSet.has(a.id))
      .map((a) => a.id);
  }

  /** 工具栏按钮 ID 映射：tabId -> { actionId -> jQuery selector } */
  const CFM_HEADER_COUNT_MAP = {
    chars: "#cfm-rh-count",
    chatlogs: "#cfm-chatlogs-rh-count",
    worldinfo: "#cfm-worldinfo-rh-count",
    presets: "#cfm-preset-rh-count",
    themes: "#cfm-theme-rh-count",
    backgrounds: "#cfm-bg-rh-count",
    personas: "#cfm-persona-rh-count",
    regex: "#cfm-regex-rh-count",
    quickreply: "#cfm-qr-rh-count",
  };
  const CFM_ACTION_BTN_MAP = {
    chars: {
      import: "#cfm-import-char-btn",
      chatmode: "#cfm-chat-mode-btn",
      regexmode: "#cfm-char-regex-mode-btn",
      quickedit: "#cfm-edit-char-btn",
      export: "#cfm-export-char-btn",
      delete: "#cfm-res-delete-char-btn",
    },
    chatlogs: {
      import: "#cfm-import-chatlog-btn",
      note: "#cfm-chatlog-note-btn",
      rename: "#cfm-chatlog-rename-btn",
      export: "#cfm-export-chatlog-btn",
      delete: "#cfm-res-delete-chatlog-btn",
    },
    worldinfo: {
      import: "#cfm-import-worldinfo-btn",
      note: "#cfm-worldinfo-note-btn",
      rename: "#cfm-worldinfo-rename-btn",
      export: "#cfm-export-worldinfo-btn",
      delete: "#cfm-res-delete-worldinfo-btn",
    },
    presets: {
      import: "#cfm-import-preset-btn",
      regexmode: "#cfm-preset-regex-mode-btn",
      note: "#cfm-preset-note-btn",
      rename: "#cfm-preset-rename-btn",
      export: "#cfm-export-preset-btn",
      delete: "#cfm-res-delete-preset-btn",
    },
    themes: {
      import: "#cfm-import-theme-btn",
      note: "#cfm-theme-note-btn",
      rename: "#cfm-theme-rename-btn",
      export: "#cfm-export-theme-btn",
      delete: "#cfm-res-delete-theme-btn",
    },
    backgrounds: {
      import: "#cfm-import-bg-btn",
      note: "#cfm-bg-note-btn",
      rename: "#cfm-bg-rename-btn",
      default: "#cfm-bg-default-btn",
      export: "#cfm-export-bg-btn",
      delete: "#cfm-res-delete-bg-btn",
    },
    personas: {
      import: "#cfm-import-persona-btn",
      note: "#cfm-persona-note-btn",
      export: "#cfm-export-persona-btn",
      delete: "#cfm-res-delete-persona-btn",
    },
    regex: {
      import: "#cfm-import-regex-btn",
      create: "#cfm-regex-create-btn",
      transfer: "#cfm-regex-transfer-btn",
      export: "#cfm-export-regex-btn",
      delete: "#cfm-res-delete-regex-btn",
      sort: "#cfm-regex-sort-btn",
    },
    quickreply: {
      import: "#cfm-import-qr-btn",
      note: "#cfm-qr-note-btn",
      rename: "#cfm-qr-rename-btn",
      export: "#cfm-export-qr-btn",
      delete: "#cfm-res-delete-qr-btn",
    },
  };

  /** 应用工具栏按钮可见性和排序（根据自定义布局配置） */
  function applyToolbarVisibility(tabId) {
    return getToolbarActionsApi().applyToolbarVisibility(tabId);
  }
  /** 对所有标签页应用工具栏按钮可见性 */
  function applyAllToolbarVisibility() {
    for (const tabId of Object.keys(CFM_ACTION_BTN_MAP)) {
      applyToolbarVisibility(tabId);
    }
  }

  // ==================== 批量创建模板管理 ====================
  function getBatchTemplates(type) {
    const all = extension_settings[extensionName].batchTemplates || {};
    return all[type] || [];
  }
  function saveBatchTemplate(type, name, content) {
    const templates = getBatchTemplates(type);
    templates.push({ name, content });
    extension_settings[extensionName].batchTemplates[type] = templates;
    getContext().saveSettingsDebounced();
  }
  function updateBatchTemplate(type, index, name, content) {
    const templates = getBatchTemplates(type);
    if (index >= 0 && index < templates.length) {
      templates[index] = { name, content };
      extension_settings[extensionName].batchTemplates[type] = templates;
      getContext().saveSettingsDebounced();
    }
  }
  function deleteBatchTemplate(type, index) {
    const templates = getBatchTemplates(type);
    if (index >= 0 && index < templates.length) {
      templates.splice(index, 1);
      extension_settings[extensionName].batchTemplates[type] = templates;
      getContext().saveSettingsDebounced();
    }
  }
  // 生成模板区域HTML
  function buildBatchTemplateHtml(type, editingIndex = -1, editingName = "") {
    const templates = getBatchTemplates(type);
    const isEditing = editingIndex >= 0 && editingIndex < templates.length;
    let listHtml = "";
    if (templates.length > 0) {
      listHtml = templates
        .map((t, i) => {
          const isEditingItem = i === editingIndex;
          return `<div class="cfm-tpl-item ${isEditingItem ? "cfm-tpl-item-editing" : ""}" data-tpl-idx="${i}"><span class="cfm-tpl-name" title="点击加载此模板">${escapeHtml(t.name)}</span><span style="display:flex;align-items:center;gap:6px;"><button class="cfm-tpl-edit" data-tpl-idx="${i}" title="编辑模板"><i class="fa-solid fa-pen-to-square"></i></button><button class="cfm-tpl-del" data-tpl-idx="${i}" title="删除模板"><i class="fa-solid fa-xmark"></i></button></span></div>`;
        })
        .join("");
    } else {
      listHtml = '<div class="cfm-tpl-empty">暂无保存的模板</div>';
    }
    return `
      <div class="cfm-tpl-section">
        <div class="cfm-tpl-header">
          <span class="cfm-tpl-label"><i class="fa-solid fa-bookmark"></i> 模板</span>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            ${isEditing ? '<button class="cfm-btn cfm-tpl-cancel-edit-btn"><i class="fa-solid fa-xmark"></i> 取消编辑</button>' : ""}
            <button class="cfm-btn cfm-tpl-save-btn"><i class="fa-solid fa-floppy-disk"></i> ${isEditing ? "保存对当前模板的修改" : "保存当前为模板"}</button>
          </div>
        </div>
        ${isEditing ? `<div class="cfm-create-tag-hint" style="margin-bottom:8px;">正在编辑模板「${escapeHtml(editingName || templates[editingIndex]?.name || "")}」，可修改结构后保存；如需改名，可再次点击该模板右侧的编辑按钮。</div>` : ""}
        <div class="cfm-tpl-list">${listHtml}</div>
      </div>
    `;
  }
  let _batchTemplateApi = null;
  function getBatchTemplateApi() {
    if (!_batchTemplateApi) {
      _batchTemplateApi = createBatchTemplateApi({
        $,
        cfmConfirm,
        cfmToastr,
        deleteBatchTemplate,
        getBatchTemplates,
        saveBatchTemplate,
        updateBatchTemplate,
      });
    }
    return _batchTemplateApi;
  }

  // 绑定模板区域事件（type: 模板类型, popup: jQuery弹窗, textareaSelector: textarea选择器, refreshFn: 刷新模板列表的回调）
  function bindBatchTemplateEvents(type, popup, textareaSelector, refreshFn) {
    return getBatchTemplateApi().bindBatchTemplateEvents(
      type,
      popup,
      textareaSelector,
      refreshFn,
    );
  }
  // ==================== 收藏管理 ====================
  function getFavorites() {
    return getFavoritesCore(extension_settings, extensionName);
  }
  function isFavorite(avatar) {
    return isFavoriteCore(avatar, {
      getFavorites,
    });
  }
  function toggleFavorite(avatar) {
    return toggleFavoriteCore(avatar, {
      extensionName,
      getFavorites,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      settings: extension_settings,
    });
  }
  function getFavoriteCharacters() {
    return getFavoriteCharactersCore({
      getCharacters,
      getFavorites,
    });
  }

  // ==================== 隐藏角色卡管理 ====================
  function getHiddenChars() {
    return getHiddenCharsCore(extension_settings, extensionName);
  }
  function isCharHidden(avatar) {
    return isCharHiddenCore(avatar, { getHiddenChars });
  }
  function toggleCharHidden(avatar) {
    return toggleCharHiddenCore(avatar, {
      extensionName,
      getHiddenChars,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      settings: extension_settings,
    });
  }
  // 总开关：是否显示隐藏的角色卡（默认 false）
  let cfmShowHiddenChars = false;
  // 过滤掉隐藏角色卡（当总开关关闭时）
  function filterHiddenChars(chars) {
    return filterHiddenCharsCore(chars, {
      getHiddenChars,
      showHiddenChars: () => cfmShowHiddenChars,
    });
  }

  // ==================== 标签自动同步 ====================
  const tagImportController = createTagImportController({
    extensionName,
    getConfig: () => config,
    getContext,
    getFolderTagIds,
    getSettings: () => extension_settings[extensionName],
    getTagList,
    getTagMap,
    log: (...args) => console.log(...args),
    saveConfig,
    saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    toastr: cfmToastr,
  });

  // 首次加载：自动导入所有现有标签为顶级文件夹
  function autoImportAllTags() {
    return tagImportController.autoImportAllTags();
  }

  // 每次打开弹窗时：检测新标签并自动导入 + 高亮（仅本次打开弹窗高亮）
  function detectAndImportNewTags() {
    return tagImportController.detectAndImportNewTags();
  }

  // 清除新导入标签的高亮标记
  function clearNewlyImportedHighlight() {
    return tagImportController.clearNewlyImportedHighlight();
  }

  function isNewlyImported(tagId) {
    return tagImportController.isNewlyImported(tagId);
  }

  // 一键导入所有未注册标签
  function oneClickImportAllTags() {
    return tagImportController.oneClickImportAllTags();
  }

  // 从酒馆系统中删除标签
  function deleteTagFromSystem(tagId) {
    return tagImportController.deleteTagFromSystem(tagId);
  }

  function loadConfig() {
    return loadFolderConfig({
      extensionSettings: extension_settings,
      extensionName,
    });
  }
  function saveConfig(cfg) {
    return saveFolderConfig({
      extensionSettings: extension_settings,
      extensionName,
      config: cfg,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }
  let config = loadConfig();

  backupBridgeSyncController = createBackupBridgeSyncController({
    AbortSignal: window.AbortSignal,
    CustomEvent: window.CustomEvent,
    clearInterval: window.clearInterval.bind(window),
    config,
    document,
    extensionName,
    extensionSettings: extension_settings,
    fetch: window.fetch.bind(window),
    findOrCreateTag,
    flushFolderAssignmentSettings,
    getBackupBridgeDetails,
    getCharacters,
    getContext,
    getResFolderTree,
    getUserAvatarsFunc,
    listBackupBridgeResources,
    moveCharToFolder,
    pollIntervalMs: CFM_SYNC_POLL_INTERVAL_MS,
    readBackupBridgeResource,
    refreshPresetManagerList,
    refreshThemeRuntimeAfterImport,
    renderBackgroundsView,
    renderPersonasView,
    renderPresetsView,
    renderThemesView,
    renderWorldInfoView,
    saveConfig,
    saveResTree,
    setInterval: window.setInterval.bind(window),
    setItemGroup,
    setTimeout: window.setTimeout.bind(window),
    syncStateUrl: CFM_SYNC_STATE_URL,
    backupBridgeProtocolVersion: BACKUP_BRIDGE_PROTOCOL_VERSION,
    backupBridgeVersion: BACKUP_BRIDGE_VERSION,
    window,
    writeBackupBridgeResource,
  });

  // 本地备份桥接连接开关：默认关闭，避免无后台服务时反复报 ERR_CONNECTION_REFUSED
  function isBridgeEnabled() {
    return extension_settings[extensionName]?.bridgeEnabled === true;
  }
  function setBridgeEnabled(next) {
    extension_settings[extensionName].bridgeEnabled = !!next;
    getContext().saveSettingsDebounced();
    if (next) {
      startSyncStatePoll();
      publishBackupBridgeSignal("ready");
    } else {
      stopSyncStatePoll();
      removeCfmSyncOverlay();
      publishBackupBridgeSignal("disabled");
    }
  }
  // 设置页开关回调：与 setBridgeEnabled 联动（保存与启停已包含其中）
  function onBridgeEnabledChange(next) {
    setBridgeEnabled(next);
  }

  // 启动 HTTP 轮询（仅当用户开启桥接连接时）
  if (isBridgeEnabled()) {
    startSyncStatePoll();
    publishBackupBridgeSignal("loading");
  } else {
    publishBackupBridgeSignal("disabled");
  }

  // ==================== 辅助函数 ====================
  // 获取显示名称（优先使用 displayName，用于UI展示）
  function getTagName(tagId) {
    return getTagNameCore(tagId, { config, getTagList });
  }

  // 获取真实标签名称（用于内部逻辑）
  function getFullTagName(tagId) {
    return getFullTagNameCore(tagId, { getTagList });
  }

  // 构建带路径前缀的标签名（用于解决重名冲突）
  function buildPrefixedTagName(name, parentTagId) {
    return buildPrefixedTagNameCore(name, parentTagId, { config, getTagName });
  }
  // 创建新标签对象并加入系统
  function createNewTagInSystem(name) {
    return createNewTagInSystemCore(name, { getContext });
  }

  // 重命名系统中的标签
  function renameTagInSystem(tagId, newName) {
    return renameTagInSystemCore(tagId, newName, {
      getTagList,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  // 根据当前父级重新构建标签名
  function rebuildTagName(tagId) {
    return rebuildTagNameCore(tagId, {
      buildPrefixedTagName,
      config,
      getContext,
      getFullTagName,
      renameTagInSystem,
    });
  }

  // 递归重建标签名：先重命名自身，再处理所有子文件夹
  function recursiveRebuildTagNames(tagId) {
    return recursiveRebuildTagNamesCore(tagId, {
      getChildFolders,
      rebuildTagName,
    });
  }

  // 查找或创建标签，自动处理重名冲突（子文件夹始终带路径前缀）
  function findOrCreateTag(intendedName, parentTagId) {
    return findOrCreateTagCore(intendedName, parentTagId, {
      buildPrefixedTagName,
      config,
      createNewTagInSystem,
      getContext,
    });
  }

  function getFolderTagIds() {
    return getFolderTagIdsCore({ config });
  }
  function getTopLevelFolders() {
    return getTopLevelFoldersCore({ config, getFolderTagIds });
  }
  function getChildFolders(parentTagId) {
    return getChildFoldersCore(parentTagId, { config, getFolderTagIds });
  }
  function getFolderPath(tagId) {
    return getFolderPathCore(tagId, { config });
  }
  // 叶子标签模式：角色只需拥有该文件夹标签，且不拥有任何子文件夹标签
  function getCharactersInFolder(folderTagId) {
    return getCharactersInFolderCore(folderTagId, {
      getCharacters,
      getChildFolders,
      getTagMap,
    });
  }
  function getUncategorizedCharacters() {
    return getUncategorizedCharactersCore({
      getCharacters,
      getFolderTagIds,
      getTagMap,
    });
  }
  function countCharsInFolderRecursive(folderTagId) {
    return countCharsInFolderRecursiveCore(folderTagId, {
      getCharactersInFolder,
      getChildFolders,
    });
  }
  function wouldCreateCycle(folderId, parentId) {
    return wouldCreateCycleCore(folderId, parentId, { config });
  }
  function escapeHtml(str) {
    return escapeHtmlCore(str);
  }
  // 排序：优先 sortOrder，其次按名称（使用中文拼音排序）
  function sortFolders(folderIds) {
    return [...folderIds].sort((a, b) => {
      const orderA = config.folders[a]?.sortOrder ?? 0;
      const orderB = config.folders[b]?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return getTagName(a).localeCompare(getTagName(b), "zh-CN");
    });
  }

  // 角色排序辅助函数
  function sortCharacters(chars, mode) {
    if (mode === "time") {
      const sourceOrder = new Map(
        getCharacters().map((char, index) => [char.avatar, index]),
      );
      return [...chars].sort((a, b) => {
        const ta = parseCharTimeCore(a);
        const tb = parseCharTimeCore(b);
        if (ta !== null || tb !== null) {
          if (ta === null) return 1;
          if (tb === null) return -1;
          if (tb !== ta) return tb - ta;
        }
        const ia = sourceOrder.get(a.avatar) ?? -1;
        const ib = sourceOrder.get(b.avatar) ?? -1;
        return ib - ia;
      });
    }
    return [...chars].sort((a, b) => {
      const cmp = (a.name || "").localeCompare(
        b.name || "",
        "zh-Hans-CN-u-co-pinyin",
        {
          numeric: true,
          sensitivity: "base",
        },
      );
      return mode === "az" ? cmp : -cmp;
    });
  }

  // ==================== 触摸设备检测 ====================
  const cfmIsTouchDevice = () => cfmIsTouchDeviceCore({ window, navigator });

  function recordTouchTapStart(e, prefix = "cfmTouchTap") {
    return recordTouchTapStartCore(e, prefix, { $ });
  }

  function shouldIgnoreTouchTapAfterMove(
    e,
    { prefix = "cfmTouchTap", moveThreshold = 10, clickSuppressMs = 500 } = {},
  ) {
    return shouldIgnoreTouchTapAfterMoveCore(
      e,
      { prefix, moveThreshold, clickSuppressMs },
      { $, now: Date.now },
    );
  }

  function bindTouchSafeTap(target, handler, options = {}) {
    return bindTouchSafeTapCore(target, handler, options, {
      $,
      jQuery,
      recordTouchTapStart,
      shouldIgnoreTouchTapAfterMove,
    });
  }

  const mobileTouchTapGuardState = new WeakMap();
  const mobileTouchTapGuardController = createMobileTouchTapGuardController({
    window,
    document,
    navigator: globalThis.navigator,
    Element,
    now: Date.now,
    state: mobileTouchTapGuardState,
  });

  function setupMobileTouchTapGuard() {
    return mobileTouchTapGuardController.setup();
  }

  // ==================== 移动端触摸拖拽管理器（已模块化到 features/dragdrop/mobile.js） ====================
  const touchDragMgr = createTouchDragMgrCore({
    $,
    jQuery,
    document,
    navigator,
    getConfig: () => config,
    wouldCreateCycle,
    reorderFolder,
    cfmToastr,
    getTagName,
    sortFolders,
    getChildFolders,
    renderLeftTree,
    renderRightPane,
    getSelectedTreeNode: () => selectedTreeNode,
    removeCharFromAllFolders,
    handleCharDropToFolder,
    getCfmCopyMode: () => cfmCopyMode,
    clearMultiSelect,
    getResFolderTree,
    wouldCreateResCycle,
    reorderResFolder,
    sortResFolders,
    getResChildFolders,
    renderPresetsView,
    renderWorldInfoView,
    renderThemesView,
    renderBackgroundsView,
    renderPersonasView,
    renderQRView,
    getSelectedPresetFolder: () => selectedPresetFolder,
    getSelectedWorldInfoFolder: () => selectedWorldInfoFolder,
    getSelectedThemeFolder: () => selectedThemeFolder,
    getSelectedBgFolder: () => selectedBgFolder,
    getSelectedPersonaFolder: () => selectedPersonaFolder,
    getSelectedQrFolder: () => selectedQrFolder,
    setItemGroup,
    getResFolderDisplayName,
    getBackgroundDisplayName,
    getSelectedRegexNode: () => selectedRegexNode,
    getExtensionSettings: () =>
      typeof getContext === "function" ? getContext().extensionSettings : {},
    getExtensionName: () => extensionName,
    getContext,
    renderRegexView,
  });

  // ==================== 排序功能 ====================
  // 拍摄排序快照（仅首次拍摄）
  function takeSortSnapshot() {
    return takeSortSnapshotCore({
      config,
      getFolderTagIds,
      getSortSnapshot: () => sortSnapshot,
      setSortSnapshot: (value) => {
        sortSnapshot = value;
      },
    });
  }

  // 对指定文件夹列表按名称排序并重新赋值 sortOrder
  function applySortToFolders(folderIds, mode) {
    return applySortToFoldersCore(folderIds, mode, {
      config,
      getTagName,
      saveConfig,
      setSortDirty: (value) => {
        sortDirty = value;
      },
      takeSortSnapshot,
    });
  }

  // 从快照恢复排序
  function revertSort() {
    return revertSortCore({
      config,
      getSortSnapshot: () => sortSnapshot,
      saveConfig,
      setRightCharSortMode: (value) => {
        rightCharSortMode = value;
      },
      setSortDirty: (value) => {
        sortDirty = value;
      },
      setSortSnapshot: (value) => {
        sortSnapshot = value;
      },
    });
  }

  // 创建排序下拉菜单
  function createSortDropdown(targetFolderIds, onSort, currentMode) {
    const dropdown = $(`
            <div class="cfm-sort-dropdown cfm-sort-open">
                <div class="cfm-sort-dropdown-item ${currentMode === "az" ? "cfm-sort-item-active" : ""}" data-sort="az">
                    <i class="fa-solid fa-arrow-down-a-z"></i> A → Z
                </div>
                <div class="cfm-sort-dropdown-item ${currentMode === "za" ? "cfm-sort-item-active" : ""}" data-sort="za">
                    <i class="fa-solid fa-arrow-up-z-a"></i> Z → A
                </div>
                <div class="cfm-sort-dropdown-sep"></div>
                <div class="cfm-sort-dropdown-item ${!sortSnapshot ? "cfm-sort-item-disabled" : ""}" data-sort="revert">
                    <i class="fa-solid fa-rotate-left"></i> 自定义
                </div>
            </div>
        `);

    dropdown.find('[data-sort="az"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("az");
      dropdown.remove();
    });
    dropdown.find('[data-sort="za"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSort("za");
      dropdown.remove();
    });
    dropdown.find('[data-sort="revert"]').on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!sortSnapshot) return; // disabled
      onSort("revert");
      dropdown.remove();
    });

    return dropdown;
  }

  // 显示/隐藏排序下拉菜单
  function toggleSortDropdown(wrapper, targetFolderIds, onSort, currentMode) {
    // 关闭所有已打开的下拉菜单
    $(".cfm-sort-dropdown").remove();

    const existing = wrapper.find(".cfm-sort-dropdown");
    if (existing.length) {
      existing.remove();
      return;
    }

    const dropdown = createSortDropdown(targetFolderIds, onSort, currentMode);
    wrapper.append(dropdown);

    // 点击外部关闭
    setTimeout(() => {
      $(document).one("click.cfmSortDropdown", (e) => {
        if (!$(e.target).closest(".cfm-sort-dropdown").length) {
          dropdown.remove();
        }
      });
    }, 0);
  }

  // 显示排序确认弹窗
  function showSortConfirmDialog(onConfirm, onRevert) {
    const overlay = $('<div id="cfm-sort-confirm-overlay"></div>');
    const dialog = $(`
            <div id="cfm-sort-confirm-dialog">
                <h4>📋 排序已改变</h4>
                <p>文件夹的排序已被修改，是否保存新的排序？</p>
                <div class="cfm-sort-confirm-actions">
                    <button class="cfm-sort-confirm-no">否，撤回排序</button>
                    <button class="cfm-sort-confirm-yes">是，保留排序</button>
                </div>
            </div>
        `);
    overlay.append(dialog);
    $("body").append(overlay);

    dialog.find(".cfm-sort-confirm-yes").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onConfirm();
    });
    dialog.find(".cfm-sort-confirm-no").on("click touchend", (e) => {
      e.preventDefault();
      overlay.remove();
      onRevert();
    });
  }
  function getPersonaFolderDeps() {
    return {
      extensionName,
      getCharacters,
      getFolderPath,
      getFolderTagIds,
      getTagMap,
      isCopyMode: () => cfmCopyMode,
      log: (...args) => console.log(...args),
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      toastr: cfmToastr,
    };
  }

  // 移动文件夹到新父级并插入到指定位置（自动重建标签名）
  function reorderFolder(folderId, newParentId, insertBeforeId) {
    return reorderFolderCore(folderId, newParentId, insertBeforeId, {
      config,
      getChildFolders,
      getFullTagName,
      recursiveRebuildTagNames,
      saveConfig,
      sortFolders,
    });
  }

  // 移动角色到新文件夹（移除所有旧文件夹标签，只添加目标标签）
  function moveCharToFolder(avatar, newFolderId) {
    return moveCharToFolderCore(avatar, newFolderId, getPersonaFolderDeps());
  }
  // 复制角色到新文件夹（保留旧标签，额外添加目标标签）
  function copyCharToFolder(avatar, newFolderId) {
    return copyCharToFolderCore(avatar, newFolderId, getPersonaFolderDeps());
  }
  // 将角色移出所有文件夹（变为未归类）
  function removeCharFromAllFolders(avatar) {
    return removeCharFromAllFoldersCore(avatar, getPersonaFolderDeps());
  }
  // 处理角色拖放到文件夹（根据复制模式决定行为）
  // toastr消息由外层调用者统一处理
  function handleCharDropToFolder(avatar, folderId) {
    return handleCharDropToFolderCore(avatar, folderId, getPersonaFolderDeps());
  }
  // 自动清理多余的路径标签（只保留最深层的叶子标签）
  function autoCleanRedundantTags() {
    return autoCleanRedundantTagsCore(getPersonaFolderDeps());
  }
  // 查找角色当前所在的文件夹路径（用于收藏视图显示）
  function findCharFolderPath(avatar) {
    const tagMap = getTagMap();
    const charTags = tagMap[avatar] || [];
    const folderIds = getFolderTagIds();
    const charFolderTags = charTags.filter((t) => folderIds.includes(t));
    if (charFolderTags.length === 0) return null;
    let deepest = charFolderTags[0];
    let maxDepth = getFolderPath(deepest).length;
    for (let i = 1; i < charFolderTags.length; i++) {
      const d = getFolderPath(charFolderTags[i]).length;
      if (d > maxDepth) {
        deepest = charFolderTags[i];
        maxDepth = d;
      }
    }
    return getFolderPath(deepest)
      .map((id) => getTagName(id))
      .join(" › ");
  }

  // 给角色添加标签
  function addTagToChar(avatar, tagId) {
    return addTagToCharCore(avatar, tagId, getPersonaFolderDeps());
  }
  // 从角色移除标签
  function removeTagFromChar(avatar, tagId) {
    return removeTagFromCharCore(avatar, tagId, getPersonaFolderDeps());
  }

  // ==================== 按钮管理 ====================
  function getButtonMode() {
    return getButtonModeCore({
      extensionName,
      extensionSettings: extension_settings,
    });
  }
  function setButtonMode(mode) {
    return setButtonModeCore(mode, {
      extensionName,
      extensionSettings: extension_settings,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  function destroyAllButtons() {
    return destroyAllButtonsCore({ $, document, window });
  }
  function switchButtonMode(newMode) {
    return switchButtonModeCore(newMode, {
      createFloatingButton,
      createTopbarButton,
      createWandButton,
      destroyAllButtons,
      setButtonMode,
      setTimeout: window.setTimeout.bind(window),
      setupThemeBgBindingListener,
    });
  }
  function initButton() {
    return initButtonCore({
      createFloatingButton,
      createTopbarButton,
      createWandButton,
      getButtonMode,
      setTimeout: window.setTimeout.bind(window),
      setupThemeBgBindingListener,
    });
  }

  function createTopbarButton() {
    return createTopbarButtonCore({
      $,
      applyTopbarIconFromConfig,
      closeMainPopup,
      setTimeout: window.setTimeout.bind(window),
      setupThemeChangeObserver,
      showMainPopup,
    });
  }

  // ==================== 顶栏图标美化适配 ====================

  /**
   * 判断一个 computed background-image 是否是真正的图片图标
   * 只接受 url(...) / image-set(...)，排除 linear-gradient(...) 等渐变文本背景
   * @param {string} bgImage
   * @returns {boolean}
   */
  function isImageIconBackground(bgImage) {
    return isImageIconBackgroundCore(bgImage);
  }

  /**
   * 检测邻居按钮（用户设定管理）的实际图标样式
   * 通过 getComputedStyle 直接读取，不依赖 CSS 规则解析
   * @returns {{ cssUrl: string, target: string, styles: Object }|null}
   *   cssUrl: CSS url() 格式的图标URL
   *   target: 匹配到的元素选择器 (".drawer-icon" 或 ".drawer-toggle")
   *   styles: 需要复制的额外样式（width, height 等）
   */
  function detectNeighborIcon() {
    return detectNeighborIconCore({
      document,
      isImageIconBackground,
      window,
    });
  }

  /**
   * 检测酒馆所有样式表中的顶栏图标替换规则（用于下拉选择器）
   * 搜索所有 <style> 元素中包含 .drawer-icon 且带 background-image 的规则
   * @returns {{ icons: Object<string, string>, uniqueUrls: string[] }}
   *   icons: parentId → backgroundImage 映射
   *   uniqueUrls: 去重后的图标URL列表
   */
  function detectThemeIcons() {
    return detectThemeIconsCore({
      document,
      isImageIconBackground,
      window,
    });
  }

  /**
   * 从 CSS url() 值中提取纯URL
   * @param {string} cssUrl - 如 'url("https://example.com/icon.png")'
   * @returns {string} 纯URL
   */
  function extractUrlFromCss(cssUrl) {
    return extractUrlFromCssCore(cssUrl);
  }

  /**
   * 将纯URL转为CSS url()格式
   * @param {string} url
   * @returns {string}
   */
  function toCssUrl(url) {
    return toCssUrlCore(url);
  }

  /**
   * 应用自定义图标到顶栏按钮
   * @param {string} cssUrl - CSS url() 格式的图标链接
   * @param {string} [targetCls] - 图标来源元素类名（".drawer-icon"、".drawer-toggle" 或含 "::before" 的伪元素标识）
   * @param {Object} [extraStyles] - 需要额外复制的样式属性
   */
  function applyCustomIcon(cssUrl, targetCls, extraStyles) {
    return applyCustomIconCore(cssUrl, targetCls, extraStyles, { $ });
  }

  /**
   * 清除自定义图标，恢复默认FA图标
   */
  function clearCustomIcon() {
    return clearCustomIconCore({ $ });
  }

  /**
   * 根据配置自动应用顶栏图标
   * 优先使用邻居按钮的 computed style，更可靠
   * 如果用户手动指定了URL则使用手动指定的
   */
  function applyTopbarIconFromConfig() {
    return applyTopbarIconFromConfigCore({
      applyCustomIcon,
      clearCustomIcon,
      detectNeighborIcon,
      extensionName,
      extensionSettings: extension_settings,
      toCssUrl,
    });
  }

  // ==================== 主题观察集成（编排见 integrations/theme-observer.js） ====================

  const themeObserverApi = createThemeObserverApi({
    $,
    MutationObserver,
    Node,
    applyBackground,
    applyCustomIcon,
    applyCustomStyle,
    cfmToastr,
    clearCustomIcon,
    clearInterval: window.clearInterval.bind(window),
    detectNeighborIcon,
    document,
    extensionName,
    extensionSettings: extension_settings,
    getBackgroundDisplayName,
    getCurrentBackgroundFile,
    getThemeBgBinding,
    setInterval: window.setInterval.bind(window),
    setTimeout: window.setTimeout.bind(window),
  });

  /**
   * 启动主题切换监听
   * 同时使用 MutationObserver 和轮询两种策略确保可靠检测
   */
  function setupThemeChangeObserver() {
    return themeObserverApi.setupThemeChangeObserver();
  }

  /**
   * 主题样式发生变化时的回调
   * 如果用户没有手动指定图标（customTopbarIcon 为空），则自动重新检测并应用
   */
  function onThemeStyleChange() {
    return themeObserverApi.onThemeStyleChange();
  }

  /**
   * 启动美化主题绑定背景的自动切换监听
   * 监听 #themes 变化，按 themeBackgroundBindings 自动切换背景
   */
  function setupThemeBgBindingListener() {
    return themeObserverApi.setupThemeBgBindingListener();
  }

  // ==================== 自定义外观 ====================

  /** 获取当前酒馆主题名 */
  function getCurrentThemeName() {
    return getCurrentThemeNameCore({ document });
  }

  /** hex 颜色 + 不透明度 → rgba 字符串 */
  function hexToRgba(hex, opacity) {
    return hexToRgbaCore(hex, opacity);
  }

  /** 快捷预设方案 */
  const CFM_STYLE_PRESETS = CFM_STYLE_PRESETS_CORE;

  /** 从当前主题中读取实际生效的 CSS 变量值，作为自定义美化弹窗的默认值 */
  function getComputedThemeDefaults() {
    return getComputedThemeDefaultsCore({
      colorToAlpha: colorToAlphaCore,
      colorToHex: colorToHexCore,
      document,
      getComputedStyle: window.getComputedStyle.bind(window),
    });
  }

  /** 将用户的自定义外观应用到所有 CFM 相关元素 */
  function applyCustomStyle() {
    return applyCustomStyleCore({
      document,
      extensionName,
      extensionSettings: extension_settings,
      getCurrentThemeName,
      hexToRgba,
    });
  }

  /** 更新预览区的外观 */
  function updateThemePreview(previewEl, config) {
    return updateThemePreviewCore(previewEl, config, { hexToRgba });
  }

  /** 显示自定义外观弹窗 */
  function showThemeCustomizePopup() {
    return showThemeCustomizePopupCore({
      $,
      CFM_STYLE_PRESETS,
      applyCustomStyle,
      cfmConfirm,
      cfmToastr,
      document,
      escapeHtml,
      extensionName,
      extensionSettings: extension_settings,
      getComputedThemeDefaults,
      getContext,
      getCurrentThemeName,
      hexToRgba,
      prompt: window.prompt.bind(window),
      updateThemePreview,
    });
  }

  function createFloatingButton() {
    return createFloatingButtonCore({
      $,
      clearTimeout: window.clearTimeout.bind(window),
      document,
      localStorage,
      navigator,
      setTimeout: window.setTimeout.bind(window),
      showMainPopup,
      storageKeyBtnPos: STORAGE_KEY_BTN_POS,
      window,
    });
  }

  function createWandButton() {
    return createWandButtonCore({
      $,
      createWandButton,
      setTimeout: window.setTimeout.bind(window),
      showMainPopup,
    });
  }

  // ==================== 主弹窗：双栏布局 ====================
  let selectedTreeNode = null; // 当前左侧选中的文件夹ID或'__uncategorized__'
  let expandedNodes = new Set(); // 左侧树展开状态
  let configExpandedNodes = new Set(); // 配置弹窗树展开状态

  // 预设/世界书/主题/背景双栏状态
  let selectedPresetFolder = null;
  let selectedWorldInfoFolder = null;
  let selectedThemeFolder = null;
  let selectedBgFolder = null;
  let selectedPersonaFolder = null;
  let presetExpandedNodes = new Set();
  let worldInfoExpandedNodes = new Set();
  let themeExpandedNodes = new Set();
  let bgExpandedNodes = new Set();
  let personaExpandedNodes = new Set();
  let personaItemExpandedIds = new Set(); // 右侧展开的User详情
  let selectedQrFolder = null;
  let qrExpandedNodes = new Set();
  let qrItemExpandedSets = new Set(); // 右侧展开的QR集名称
  let cfmQrLastFocusedSetName = null; // 最近一次操作/展开的QR集名称（用于收起后回定位）
  let selectedChatlogFolder = null; // 聊天记录页当前选中的文件夹
  let chatlogExpandedNodes = new Set(); // 聊天记录页左侧文件夹树展开节点
  let cfmChatlogTargetAvatar = null; // 聊天记录页当前目标角色avatar（null时跟随当前角色）
  let _switchResourceTabFn = null; // 模块级引用，供 renderChatSubList 等外部函数调用 switchResourceTab
  let chatlogConfigExpandedNodes = new Set();
  let presetConfigExpandedNodes = new Set();
  let worldInfoConfigExpandedNodes = new Set();
  let themeConfigExpandedNodes = new Set();
  let bgConfigExpandedNodes = new Set();
  let personaConfigExpandedNodes = new Set();
  let regexConfigExpandedNodes = new Set();
  let qrConfigExpandedNodes = new Set();

  // 预设/世界书/主题/背景的收藏管理
  function ensureResFavorites() {
    return ensureResFavoritesCore({
      extensionName,
      extensionSettings: extension_settings,
    });
  }
  function getResFavorites(type) {
    return getResFavoritesCore(type, {
      ensureResFavorites,
      extensionName,
      extensionSettings: extension_settings,
    });
  }
  function isResFavorite(type, name) {
    return isResFavoriteCore(type, name, {
      getResFavorites,
    });
  }
  function toggleResFavorite(type, name) {
    return toggleResFavoriteCore(type, name, {
      getResFavorites,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  // 预设/世界书/主题/背景排序状态
  let presetLeftSortMode = null;
  let presetRightSortMode = null; // 右栏项目排序: null | 'az' | 'za'
  let worldInfoLeftSortMode = null;
  let worldInfoRightSortMode = null;
  let themeLeftSortMode = null;
  let themeRightSortMode = null;
  let bgLeftSortMode = null;
  let bgRightSortMode = null;
  let personaLeftSortMode = null;
  let personaRightSortMode = null;
  let presetSortSnapshot = null;
  let worldInfoSortSnapshot = null;
  let themeSortSnapshot = null;
  let bgSortSnapshot = null;
  let personaSortSnapshot = null;
  let qrLeftSortMode = null;
  let qrRightSortMode = null;
  let qrSortSnapshot = null;
  let presetSortDirty = false;
  let worldInfoSortDirty = false;
  let themeSortDirty = false;
  let bgSortDirty = false;
  let personaSortDirty = false;

  // 资源排序辅助
  function getResSortSnapshotByType(type) {
    if (type === "presets") return presetSortSnapshot;
    if (type === "themes") return themeSortSnapshot;
    if (type === "backgrounds") return bgSortSnapshot;
    if (type === "personas") return personaSortSnapshot;
    return worldInfoSortSnapshot;
  }

  function setResSortSnapshotByType(type, value) {
    if (type === "presets") presetSortSnapshot = value;
    else if (type === "themes") themeSortSnapshot = value;
    else if (type === "backgrounds") bgSortSnapshot = value;
    else if (type === "personas") personaSortSnapshot = value;
    else worldInfoSortSnapshot = value;
  }

  function setResSortDirtyByType(type, value) {
    if (type === "presets") presetSortDirty = value;
    else if (type === "themes") themeSortDirty = value;
    else if (type === "backgrounds") bgSortDirty = value;
    else if (type === "personas") personaSortDirty = value;
    else worldInfoSortDirty = value;
  }

  function setResRightSortModeByType(type, value) {
    if (type === "presets") presetRightSortMode = value;
    else if (type === "themes") themeRightSortMode = value;
    else if (type === "backgrounds") bgRightSortMode = value;
    else if (type === "personas") personaRightSortMode = value;
    else worldInfoRightSortMode = value;
  }

  function takeResSortSnapshot(type) {
    return takeResSortSnapshotCore(type, {
      getResFolderTree,
      getSnapshot: getResSortSnapshotByType,
      setSnapshot: setResSortSnapshotByType,
    });
  }

  function applyResSortToFolders(type, folderIds, mode) {
    return applyResSortToFoldersCore(type, folderIds, mode, {
      getResFolderTree,
      saveResTree,
      setSortDirty: setResSortDirtyByType,
      takeResSortSnapshot,
    });
  }

  function revertResSort(type) {
    return revertResSortCore(type, {
      getResFolderTree,
      getSnapshot: getResSortSnapshotByType,
      saveResTree,
      setRightSortMode: setResRightSortModeByType,
      setSnapshot: setResSortSnapshotByType,
      setSortDirty: setResSortDirtyByType,
    });
  }

  function sortResItems(items, mode, getName) {
    return sortResItemsCore(items, mode, getName);
  }

  // 创建预设/世界书排序下拉菜单

  // ==================== 排序状态管理 ====================
  let sortDirty = false; // 是否有未确认的排序操作
  let sortSnapshot = null; // 排序前的快照 { folderId: sortOrder, ... }
  let rightCharSortMode =
    extension_settings[extensionName].charRightSortMode ?? null; // 右栏角色排序模式: null | 'az' | 'za' | 'time'

  // ==================== 多选模式状态 ====================
  let cfmMultiSelectMode = false;
  let cfmMultiSelected = new Set(); // 当前选中的资源标识符集合（avatar/name）
  let cfmMultiSelectLastClicked = null; // 框选：上次点击的标识符
  let cfmMultiSelectRangeMode = false; // 框选模式开关
  let cfmChatlogNoteMode = false;
  let cfmChatlogNoteSelected = new Set();
  let cfmChatlogNoteLastClicked = null;
  let cfmChatlogNoteRangeMode = false;
  let cfmChatlogRenameMode = false;
  let cfmChatlogRenameSelected = new Set();
  let cfmChatlogRenameLastClicked = null;
  let cfmChatlogRenameRangeMode = false;

  /**
   * 靶子按钮点击：在多选模式下将选中的资源移入目标文件夹。
   * @param {Function} moveAction - 执行移入的回调 (selectedItems: string[]) => void
   * @param {Function} renderAction - 移入后的渲染回调
   * @param {Function} toastAction - 移入后的 toast 回调 (count: number, firstName: string) => void
   */
  function handleFolderTargetMove(moveAction, renderAction, toastAction) {
    return handleFolderTargetMoveCore(moveAction, renderAction, toastAction, {
      clearMultiSelect,
      getMultiSelected: () => cfmMultiSelected,
      getMultiSelectMode: () => cfmMultiSelectMode,
    });
  }

  // PC端拖拽数据备份（解决HTML5 dataTransfer可靠性问题）
  let _pcDragData = null;
  let _pcLastResourceFolderHoverTarget = null;
  let _pcDropHandled = false;

  // 获取当前右栏可见的资源列表（仅资源，不含文件夹），用于框选
  function getVisibleResourceIds() {
    return getVisibleResourceIdsCore({
      $,
      getCurrentResourceType: () => currentResourceType,
    });
  }

  function clearMultiSelect() {
    return clearMultiSelectCore({
      getMultiSelected: () => cfmMultiSelected,
      setMultiSelectLastClicked: (value) => {
        cfmMultiSelectLastClicked = value;
      },
    });
  }

  function toggleMultiSelectItem(id, shiftKey) {
    return toggleMultiSelectItemCore(id, shiftKey, {
      getMultiSelected: () => cfmMultiSelected,
      getMultiSelectLastClicked: () => cfmMultiSelectLastClicked,
      getMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
      getVisibleResourceIds,
      setMultiSelectLastClicked: (value) => {
        cfmMultiSelectLastClicked = value;
      },
    });
  }

  function selectAllVisible() {
    return selectAllVisibleCore({
      getMultiSelected: () => cfmMultiSelected,
      getVisibleResourceIds,
    });
  }

  // 多选拖拽数据：返回包含所有选中项的拖拽数据
  function getMultiDragData(singleData) {
    return getMultiDragDataCore(singleData, {
      getMultiSelected: () => cfmMultiSelected,
      getMultiSelectMode: () => cfmMultiSelectMode,
    });
  }

  // ==================== 导出模式状态 ====================
  let cfmExportRangeMode = false;
  let cfmExportLastClicked = null;
  let cfmExportMode = false;
  let cfmExportSelected = new Set(); // 导出模式下选中的资源标识符

  // 收集当前活跃模式的选中集合（用于模式切换时保留选中状态）
  function collectCurrentSelection() {
    if (cfmExportMode && cfmExportSelected.size > 0)
      return new Set(cfmExportSelected);
    if (cfmResDeleteMode && cfmResDeleteSelected.size > 0)
      return new Set(cfmResDeleteSelected);
    if (cfmEditMode && cfmEditSelected.size > 0)
      return new Set(cfmEditSelected);
    if (cfmThemeNoteMode && cfmThemeNoteSelected.size > 0)
      return new Set(cfmThemeNoteSelected);
    if (cfmThemeRenameMode && cfmThemeRenameSelected.size > 0)
      return new Set(cfmThemeRenameSelected);
    if (cfmBgNoteMode && cfmBgNoteSelected.size > 0)
      return new Set(cfmBgNoteSelected);
    if (cfmBgRenameMode && cfmBgRenameSelected.size > 0)
      return new Set(cfmBgRenameSelected);
    if (cfmPresetNoteMode && cfmPresetNoteSelected.size > 0)
      return new Set(cfmPresetNoteSelected);
    if (cfmPresetRenameMode && cfmPresetRenameSelected.size > 0)
      return new Set(cfmPresetRenameSelected);
    if (cfmWorldInfoNoteMode && cfmWorldInfoNoteSelected.size > 0)
      return new Set(cfmWorldInfoNoteSelected);
    if (cfmWorldInfoRenameMode && cfmWorldInfoRenameSelected.size > 0)
      return new Set(cfmWorldInfoRenameSelected);
    if (cfmQrNoteMode && cfmQrNoteSelected.size > 0)
      return new Set(cfmQrNoteSelected);
    if (cfmQrRenameMode && cfmQrRenameSelected.size > 0)
      return new Set(cfmQrRenameSelected);
    if (cfmPersonaNoteMode && cfmPersonaNoteSelected.size > 0)
      return new Set(cfmPersonaNoteSelected);
    if (cfmChatlogNoteMode && cfmChatlogNoteSelected.size > 0)
      return new Set(cfmChatlogNoteSelected);
    if (cfmChatlogRenameMode && cfmChatlogRenameSelected.size > 0)
      return new Set(cfmChatlogRenameSelected);
    if (cfmMultiSelectMode && cfmMultiSelected.size > 0)
      return new Set(cfmMultiSelected);
    return null;
  }

  let _clearModesApi = null;
  function getClearModesApi() {
    if (!_clearModesApi) {
      _clearModesApi = createClearModesApi({
        $,
        clearMultiSelect,
        exitEditMode,
        exitPresetRenameMode,
        exitWorldInfoRenameMode,
        exitQrRenameMode,
        state,
        cfmExportSelected,
        cfmResDeleteSelected,
        cfmThemeNoteSelected,
        cfmBgNoteSelected,
        cfmThemeRenameSelected,
        cfmBgRenameSelected,
        cfmWorldInfoNoteSelected,
        cfmQrNoteSelected,
        cfmPresetNoteSelected,
        cfmPersonaNoteSelected,
        cfmChatlogNoteSelected,
        cfmChatlogRenameSelected,
      });
    }
    return _clearModesApi;
  }
  // 统一清理所有互斥模式的状态和 DOM（不触发渲染）
  function clearAllExclusiveModes() {
    return getClearModesApi().clearAllExclusiveModes();
  }
  function syncChatlogPopupModeClasses() {
    const popup = $(".cfm-popup");
    popup.removeClass(
      "cfm-chatlog-note-mode cfm-chatlog-rename-mode cfm-res-delete-mode cfm-export-mode cfm-multisel-on",
    );
    if (cfmChatlogNoteMode) popup.addClass("cfm-chatlog-note-mode");
    else if (cfmChatlogRenameMode) popup.addClass("cfm-chatlog-rename-mode");
    else if (cfmResDeleteMode) popup.addClass("cfm-res-delete-mode");
    else if (cfmExportMode) popup.addClass("cfm-export-mode");
    else if (cfmMultiSelectMode) popup.addClass("cfm-multisel-on");
  }

  function enterChatlogNoteMode() {
    return createChatlogNotesApi().enterChatlogNoteMode();
  }

  function exitChatlogNoteMode() {
    return createChatlogNotesApi().exitChatlogNoteMode();
  }

  function toggleChatlogNoteItem(id, shiftKey) {
    return createChatlogNotesApi().toggleChatlogNoteItem(id, shiftKey);
  }

  async function showChatlogNotePopup(chatNames) {
    return await createChatlogNotesApi().showChatlogNotePopup(chatNames);
  }

  async function executeChatlogNoteEdit(names) {
    return await createChatlogNotesApi().executeChatlogNoteEdit(names);
  }

  function prependChatlogNoteToolbar(listContainer, renderFn) {
    return createChatlogNotesApi().prependChatlogNoteToolbar(
      listContainer,
      renderFn,
    );
  }

  function createChatlogRenameApi() {
    return createChatlogRenameApiCore({
      $,
      cfmToastr,
      clearAllExclusiveModes,
      collectCurrentSelection,
      escapeHtml,
      findCommonPrefix,
      findCommonSuffix,
      getChatlogGroups,
      getChatlogTargetAvatar,
      getCharacters,
      getContext,
      getVisibleResourceIds,
      invalidateChatCache,
      openCharacterChatFunc,
      renameGroupOrCharacterChatFunc,
      renderChatlogsView,
      saveChatNotes,
      splitChatlogFileName,
      syncChatlogPopupModeClasses,
      state: {
        get cfmChatNotes() {
          return cfmChatNotes;
        },
        set cfmChatNotes(value) {
          cfmChatNotes = value;
        },
        get cfmChatlogRenameMode() {
          return cfmChatlogRenameMode;
        },
        set cfmChatlogRenameMode(value) {
          cfmChatlogRenameMode = value;
        },
        get cfmChatlogRenameSelected() {
          return cfmChatlogRenameSelected;
        },
        set cfmChatlogRenameSelected(value) {
          cfmChatlogRenameSelected = value;
        },
        get cfmChatlogRenameRangeMode() {
          return cfmChatlogRenameRangeMode;
        },
        set cfmChatlogRenameRangeMode(value) {
          cfmChatlogRenameRangeMode = value;
        },
        get cfmChatlogRenameLastClicked() {
          return cfmChatlogRenameLastClicked;
        },
        set cfmChatlogRenameLastClicked(value) {
          cfmChatlogRenameLastClicked = value;
        },
      },
    });
  }

  function enterChatlogRenameMode() {
    return createChatlogRenameApi().enterChatlogRenameMode();
  }

  function exitChatlogRenameMode() {
    return createChatlogRenameApi().exitChatlogRenameMode();
  }

  function toggleChatlogRenameItem(id, shiftKey) {
    return createChatlogRenameApi().toggleChatlogRenameItem(id, shiftKey);
  }

  async function showChatlogRenamePopup(names) {
    return await createChatlogRenameApi().showChatlogRenamePopup(names);
  }

  async function executeChatlogRename(names) {
    return await createChatlogRenameApi().executeChatlogRename(names);
  }

  function prependChatlogRenameToolbar(listContainer, renderFn) {
    return createChatlogRenameApi().prependChatlogRenameToolbar(
      listContainer,
      renderFn,
    );
  }

  function splitChatlogFileName(fileName) {
    return splitChatlogFileNameCore(fileName);
  }

  function getWorldInfoDisplayName(name) {
    const safeName = String(name || "");
    return safeName.replace(/\.(json|jsonl)$/i, "");
  }
  function enterExportMode() {
    return enterExportModeCore({
      $,
      clearAllExclusiveModes,
      collectCurrentSelection,
      rerenderCurrentView,
      setExportMode: (value) => {
        cfmExportMode = value;
      },
      setExportSelected: (value) => {
        cfmExportSelected = value;
      },
    });
  }

  function exitExportMode() {
    return exitExportModeCore({
      $,
      clearExportSelected: () => cfmExportSelected.clear(),
      rerenderCurrentView,
      setExportLastClicked: (value) => {
        cfmExportLastClicked = value;
      },
      setExportMode: (value) => {
        cfmExportMode = value;
      },
      setExportRangeMode: (value) => {
        cfmExportRangeMode = value;
      },
    });
  }

  function toggleExportItem(id, shiftKey) {
    return toggleExportItemCore(id, shiftKey, {
      getExportLastClicked: () => cfmExportLastClicked,
      getExportRangeMode: () => cfmExportRangeMode,
      getExportSelected: () => cfmExportSelected,
      getVisibleResourceIds,
      setExportLastClicked: (value) => {
        cfmExportLastClicked = value;
      },
    });
  }

  let _quickAddApi = null;
  function getQuickAddApi() {
    if (!_quickAddApi) {
      _quickAddApi = createQuickAddApi({
        $,
        extensionName,
        extension_settings,
        cfmToastr,
        getContext,
        saveConfig,
        findOrCreateTag,
        getTagName,
        addResFolder,
        getResFolderDisplayName,
        state,
        renderLeftTree,
        renderRightPane,
        renderPresetsView,
        renderWorldInfoView,
        renderThemesView,
        renderBackgroundsView,
        renderPersonasView,
        renderRegexView,
        renderQRView,
        renderChatlogsView,
      });
    }
    return _quickAddApi;
  }
  // ── 快速新建文件夹弹窗 ──
  function showQuickAddFolderPopup(tab) {
    return getQuickAddApi().showQuickAddFolderPopup(tab);
  }
  // ══════════════════════════════════════════════════════════════
  // 预设/世界书 条目互通缝合
  // ══════════════════════════════════════════════════════════════

  // ── 缝合备忘录数据层 ──
  function createEntryTransferMemoApi() {
    return createEntryTransferMemoApiCore({
      extensionName,
      extensionSettings: extension_settings,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      ensureSettings,
    });
  }

  function addEntryTransferMemoGroup(options) {
    return createEntryTransferMemoApi().addEntryTransferMemoGroup(options);
  }

  // ── 缝合备忘录视图层（弹窗 + 角标） ──
  function createEntryTransferMemoViewApi() {
    return createEntryTransferMemoViewApiCore({
      $,
      escapeHtml,
      cfmToastr,
      memoApi: createEntryTransferMemoApi(),
      entriesApi: {
        analyzePresetQuickUpdate: (...args) =>
          createEntryTransferApi().analyzePresetQuickUpdate(...args),
        executePresetQuickUpdate: (...args) =>
          createEntryTransferApi().executePresetQuickUpdate(...args),
        getPresetQuickUpdateOptions: (...args) =>
          createEntryTransferApi().getPresetQuickUpdateOptions(...args),
        openEntryTransferTargetDialog: (...args) =>
          createEntryTransferApi().openEntryTransferTargetDialog(...args),
        openEntryTransferInsertDialog: (options) =>
          createEntryTransferApi().openEntryTransferInsertDialog(options),
        getEntryTransferInsertItems: (...args) =>
          createEntryTransferApi().getEntryTransferInsertItems(...args),
        getEntryTransferMemoGroupFreshEntries: (...args) =>
          createEntryTransferApi().getEntryTransferMemoGroupFreshEntries(...args),
        executeEntryTransfer: (...args) =>
          createEntryTransferApi().executeEntryTransfer(...args),
        transferToPreset: (...args) =>
          createEntryTransferApi().transferToPreset(...args),
        transferToWorldInfo: (...args) =>
          createEntryTransferApi().transferToWorldInfo(...args),
        updateEntryTransferMemoGroupFromSource: (...args) =>
          createEntryTransferApi().updateEntryTransferMemoGroupFromSource(...args),
      },
    });
  }

  function showEntryTransferMemoPopup() {
    return createEntryTransferMemoViewApi().showEntryTransferMemoPopup();
  }

  function renderHeaderMemoBadge() {
    return createEntryTransferMemoViewApi().renderHeaderMemoBadge();
  }

  function createEntryTransferApi() {
    return createEntryTransferApiCore({
      $,
      beginSuppressPresetRegexToast,
      buildDuplicatedPresetPromptKey,
      cfmToastr,
      document,
      endSuppressPresetRegexToast,
      ensurePresetPromptList,
      ensureSettings,
      escapeHtml,
      extensionName,
      extensionSettings: extension_settings,
      fetchWorldInfoDetailData,
      findPresetSelectValueByName,
      getContext,
      getCurrentPresets,
      getCurrentResourceType: () => currentResourceType,
      getPresetDataForDetail,
      getPresetDetailExpandedNames: () => cfmPresetDetailExpandedNames,
      getPresetDetailFields,
      getPresetPromptByKey,
      getPresetPromptIdentifier,
      getResFolderDisplayName,
      getResFolderPath,
      getResFolderTree,
      getResourceGroups,
      getWorldInfoEntriesForDetail,
      getWorldInfoEntryDetailSortMode,
      getWorldInfoEntryExpandedNames: () => cfmWorldInfoEntryExpandedNames,
      getWorldInfoEntrySelectionKey,
      getWorldInfoExpandedNodes: () => worldInfoExpandedNodes,
      getWorldInfoNames,
      memoApi: createEntryTransferMemoApi(),
      refreshPresetPanelView,
      renderHeaderMemoBadge,
      renderPresetsView,
      renderWorldInfoView,
      saveNormalizedPresetData,
      savePresetDetailPromptOrder,
      saveWorldInfoDetailData,
      scrollElementIntoViewCentered,
      scrollWorldInfoRowIntoView,
      setCurrentResourceType: (value) => {
        currentResourceType = value;
      },
      setPresetPromptEnabled,
      setSelectedPresetFolder: (value) => {
        selectedPresetFolder = value;
      },
      setSelectedWorldInfoFolder: (value) => {
        selectedWorldInfoFolder = value;
      },
      setWorldInfoEntryLastFocusedName: (value) => {
        cfmWorldInfoEntryLastFocusedName = value;
      },
      structuredClone,
    });
  }

  async function showEntryTransferPopup(sourceType, sourceName, selectedKeys) {
    return await createEntryTransferApi().showEntryTransferPopup(
      sourceType,
      sourceName,
      selectedKeys,
    );
  }

  async function getEntryTransferInsertItems(targetType, targetName) {
    return await createEntryTransferApi().getEntryTransferInsertItems(
      targetType,
      targetName,
    );
  }

  function openEntryTransferInsertDialog(options = {}) {
    return createEntryTransferApi().openEntryTransferInsertDialog(options);
  }

  function getEntryTransferPostActionMode() {
    return createEntryTransferApi().getEntryTransferPostActionMode();
  }

  function setEntryTransferPostActionMode(mode, save = true) {
    return createEntryTransferApi().setEntryTransferPostActionMode(mode, save);
  }

  function showBatchProgressOverlay(actionLabel, total) {
    return createEntryTransferApi().showBatchProgressOverlay(
      actionLabel,
      total,
    );
  }

  function showEntryTransferProgressLoading(
    sourceEntries,
    targetType,
    targetName,
  ) {
    return createEntryTransferApi().showEntryTransferProgressLoading(
      sourceEntries,
      targetType,
      targetName,
    );
  }

  function showEntryTransferCompletionDialog(options = {}) {
    return createEntryTransferApi().showEntryTransferCompletionDialog(options);
  }

  function setEntryTransferTargetTab(tabId) {
    return createEntryTransferApi().setEntryTransferTargetTab(tabId);
  }

  function revealTransferredPresetTarget(presetName) {
    return createEntryTransferApi().revealTransferredPresetTarget(presetName);
  }

  async function revealTransferredWorldInfoTarget(bookName) {
    return await createEntryTransferApi().revealTransferredWorldInfoTarget(
      bookName,
    );
  }

  async function revealEntryTransferTargetResource(targetType, targetName) {
    return await createEntryTransferApi().revealEntryTransferTargetResource(
      targetType,
      targetName,
    );
  }

  async function executeEntryTransfer(
    sourceType,
    sourceName,
    sourceEntries,
    targetType,
    targetName,
  ) {
    return await createEntryTransferApi().executeEntryTransfer(
      sourceType,
      sourceName,
      sourceEntries,
      targetType,
      targetName,
    );
  }

  async function transferToPreset(
    sourceType,
    sourceEntries,
    targetPresetName,
    insertIndex = null,
  ) {
    return await createEntryTransferApi().transferToPreset(
      sourceType,
      sourceEntries,
      targetPresetName,
      insertIndex,
    );
  }

  async function transferToWorldInfo(
    sourceType,
    sourceEntries,
    targetBookName,
    insertIndex = null,
  ) {
    return await createEntryTransferApi().transferToWorldInfo(
      sourceType,
      sourceEntries,
      targetBookName,
      insertIndex,
    );
  }

  /**
   * 持久化预设数据到文件
   */
  async function persistPresetData(pm, presetName) {
    try {
      const presetList =
        typeof pm.getPresetList === "function"
          ? pm.getPresetList.call(pm)
          : null;
      if (!presetList) throw new Error("无法获取预设列表");
      const { presets: presetsArr, preset_names } = presetList;
      if (!Array.isArray(presetsArr) || !preset_names)
        throw new Error("预设列表格式异常");

      const idx = preset_names.indexOf(presetName);
      if (idx < 0) {
        // 尝试模糊匹配
        const trimmed = String(presetName || "").trim();
        for (let i = 0; i < preset_names.length; i++) {
          if (String(preset_names[i] || "").trim() === trimmed) {
            const data = JSON.stringify(presetsArr[i], null, 4);
            await fetch("/api/presets/save-openai", {
              method: "POST",
              headers: getContext().getRequestHeaders(),
              body: JSON.stringify({ name: preset_names[i], preset: data }),
            });
            return;
          }
        }
        throw new Error(`预设列表中找不到「${presetName}」`);
      }

      const data = JSON.stringify(presetsArr[idx], null, 4);
      await fetch("/api/presets/save-openai", {
        method: "POST",
        headers: getContext().getRequestHeaders(),
        body: JSON.stringify({ name: preset_names[idx], preset: data }),
      });
    } catch (e) {
      console.error("[CFM] 持久化预设失败:", e);
      throw e;
    }
  }

  function rerenderCurrentView() {
    if (currentResourceType === "chars") renderRightPane();
    else if (currentResourceType === "chatlogs") renderChatlogsView();
    else if (currentResourceType === "presets") renderPresetsView();
    else if (currentResourceType === "themes") renderThemesView();
    else if (currentResourceType === "backgrounds") renderBackgroundsView();
    else if (currentResourceType === "personas") renderPersonasView();
    else if (currentResourceType === "regex") renderRegexView();
    else if (currentResourceType === "quickreply") renderQRView();
    else renderWorldInfoView();
  }

  // 生成导出工具栏并插入到列表容器
  function prependExportToolbar(listContainer, renderFn) {
    return prependExportToolbarCore(listContainer, renderFn, {
      $,
      exitExportMode,
      getExportMode: () => cfmExportMode,
      getExportRangeMode: () => cfmExportRangeMode,
      getExportSelected: () => cfmExportSelected,
      getVisibleResourceIds,
      setExportLastClicked: (value) => {
        cfmExportLastClicked = value;
      },
      setExportRangeMode: (value) => {
        cfmExportRangeMode = value;
      },
    });
  }

  // 导出核心：根据资源类型导出选中的资源
  async function executeResourceExport() {
    return executeResourceExportCore({
      currentResourceType,
      exitExportMode,
      exportBackgrounds,
      exportCharacters,
      exportChatlogFiles,
      exportPersonas,
      exportPresets,
      exportQuickReplySets,
      exportRegexScripts,
      exportThemes,
      exportWorldInfos,
      getExportSelectedItems: () => Array.from(cfmExportSelected),
      getExportSelectedSize: () => cfmExportSelected.size,
      getRequestHeaders: () => getContext().getRequestHeaders(),
      logExportError: (err) => console.error("[CFM] 导出失败", err),
      toastr: cfmToastr,
    });
  }

  // ==================== 资源导出/导入业务（模块化转发） ====================
  let _resourceExportApi = null;
  function getResourceExportApi() {
    if (!_resourceExportApi) {
      _resourceExportApi = createResourceExportApi({
        cfmToastr,
        getContext,
        getResourceGroups,
        renderPersonasView,
        showBatchProgressOverlay,
      });
    }
    return _resourceExportApi;
  }
  async function exportCharacters(avatars, headers) {
    return getResourceExportApi().exportCharacters(avatars, headers);
  }
  async function exportPresets(presetNames, headers) {
    return getResourceExportApi().exportPresets(presetNames, headers);
  }
  async function exportQuickReplySets(setNames) {
    return getResourceExportApi().exportQuickReplySets(setNames);
  }
  async function exportWorldInfos(wiNames, headers) {
    return getResourceExportApi().exportWorldInfos(wiNames, headers);
  }
  async function exportThemes(themeNameList, headers) {
    return getResourceExportApi().exportThemes(themeNameList, headers);
  }
  async function exportBackgrounds(bgNames, headers) {
    return getResourceExportApi().exportBackgrounds(bgNames, headers);
  }
  async function exportPersonas(avatarIds, headers) {
    return getResourceExportApi().exportPersonas(avatarIds, headers);
  }
  async function importPersonas(file, targetFolder) {
    return getResourceExportApi().importPersonas(file, targetFolder);
  }

  // ==================== 资源删除模式状态 ====================
  let cfmResDeleteMode = false;
  let cfmResDeleteSelected = new Set();
  let cfmResDeleteRangeMode = false;
  let cfmResDeleteLastClicked = null;

  function enterResDeleteMode() {
    return enterResDeleteModeCore({
      $,
      clearAllExclusiveModes,
      collectCurrentSelection,
      rerenderCurrentView,
      setResDeleteLastClicked: (value) => {
        cfmResDeleteLastClicked = value;
      },
      setResDeleteMode: (value) => {
        cfmResDeleteMode = value;
      },
      setResDeleteRangeMode: (value) => {
        cfmResDeleteRangeMode = value;
      },
      setResDeleteSelected: (value) => {
        cfmResDeleteSelected = value;
      },
    });
  }

  function exitResDeleteMode() {
    return exitResDeleteModeCore({
      $,
      clearResDeleteSelected: () => cfmResDeleteSelected.clear(),
      rerenderCurrentView,
      setResDeleteLastClicked: (value) => {
        cfmResDeleteLastClicked = value;
      },
      setResDeleteMode: (value) => {
        cfmResDeleteMode = value;
      },
      setResDeleteRangeMode: (value) => {
        cfmResDeleteRangeMode = value;
      },
    });
  }

  function toggleResDeleteItem(id, shiftKey) {
    return toggleResDeleteItemCore(id, shiftKey, {
      getResDeleteLastClicked: () => cfmResDeleteLastClicked,
      getResDeleteRangeMode: () => cfmResDeleteRangeMode,
      getResDeleteSelected: () => cfmResDeleteSelected,
      getVisibleResourceIds,
      setResDeleteLastClicked: (value) => {
        cfmResDeleteLastClicked = value;
      },
    });
  }

  function prependResDeleteToolbar(listContainer, renderFn) {
    return prependResDeleteToolbarCore(listContainer, renderFn, {
      $,
      exitResDeleteMode,
      getResDeleteMode: () => cfmResDeleteMode,
      getResDeleteRangeMode: () => cfmResDeleteRangeMode,
      getResDeleteSelected: () => cfmResDeleteSelected,
      getVisibleResourceIds,
      setResDeleteLastClicked: (value) => {
        cfmResDeleteLastClicked = value;
      },
      setResDeleteRangeMode: (value) => {
        cfmResDeleteRangeMode = value;
      },
    });
  }

  // 删除核心：根据资源类型删除选中的资源
  async function executeResourceDelete() {
    return executeResourceDeleteCore({
      $,
      cfmPresetDetailExpandedNames,
      cfmPresetRegexExpandedNames,
      clearWorldInfoNamesCache: () => {
        _worldInfoNamesCache = null;
      },
      confirm: cfmConfirm,
      currentResourceType,
      deleteChatFile,
      doNewChatFunc,
      exitResDeleteMode,
      extensionName,
      extensionSettings: extension_settings,
      fetch: window.fetch.bind(window),
      getChatlogGroups,
      getChatlogTargetAvatar,
      getContext,
      getCurrentCharAvatar,
      getPresetDetachedOptions: () => _presetDetachedOptions,
      getQrActivePresets,
      getRequestHeaders: () => getContext().getRequestHeaders(),
      getResDeleteSelectedItems: () => Array.from(cfmResDeleteSelected),
      getResDeleteSelectedSize: () => cfmResDeleteSelected.size,
      getTagMap,
      getThemeDetachedOptions: () => _themeDetachedOptions,
      getWiActivePresets,
      getWorldInfoDetachedOptions: () => _worldInfoDetachedOptions,
      getWorldInfoNames,
      logDeleteError: (err) => console.error("[CFM] 删除失败", err),
      qrItemExpandedSets,
      removePersonaFromCustomOrder,
      removePresetFromCustomOrder,
      rerenderCurrentView,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      syncNativeRegexState,
      setPresetDetachedOptions: (value) => {
        _presetDetachedOptions = value;
      },
      setThemeDetachedOptions: (value) => {
        _themeDetachedOptions = value;
      },
      setWorldInfoDetachedOptions: (value) => {
        _worldInfoDetachedOptions = value;
      },
      showBatchProgressOverlay,
      themes: typeof themes !== "undefined" ? themes : null,
      toastr: cfmToastr,
      warn: (...args) => console.warn(...args),
    });
  }

  // ==================== 主题备注编辑模式 ====================
  let cfmThemeNoteMode = false;
  let cfmThemeNoteSelected = new Set();
  let cfmThemeNoteRangeMode = false;
  let cfmThemeNoteLastClicked = null;

  function getThemeNote(name) {
    return getThemeNoteCore(name, {
      extensionName,
      settings: extension_settings,
    });
  }

  function setThemeNote(name, note) {
    return setThemeNoteCore(name, note, {
      extensionName,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      settings: extension_settings,
    });
  }

  function getThemeNoteDeps() {
    return {
      $,
      cfmConfirm,
      cfmToastr,
      clearAllExclusiveModes,
      collectCurrentSelection,
      escapeHtml,
      getThemeNote,
      getVisibleResourceIds,
      renderThemesView,
      setThemeNote,
      state: {
        get cfmThemeNoteMode() {
          return cfmThemeNoteMode;
        },
        set cfmThemeNoteMode(value) {
          cfmThemeNoteMode = value;
        },
        get cfmThemeNoteSelected() {
          return cfmThemeNoteSelected;
        },
        set cfmThemeNoteSelected(value) {
          cfmThemeNoteSelected = value;
        },
        get cfmThemeNoteRangeMode() {
          return cfmThemeNoteRangeMode;
        },
        set cfmThemeNoteRangeMode(value) {
          cfmThemeNoteRangeMode = value;
        },
        get cfmThemeNoteLastClicked() {
          return cfmThemeNoteLastClicked;
        },
        set cfmThemeNoteLastClicked(value) {
          cfmThemeNoteLastClicked = value;
        },
      },
    };
  }

  function getThemeNoteApi() {
    return createThemeNoteModeApi(getThemeNoteDeps());
  }

  function enterThemeNoteMode() {
    return getThemeNoteApi().enterThemeNoteMode();
  }

  function exitThemeNoteMode() {
    return getThemeNoteApi().exitThemeNoteMode();
  }

  function toggleThemeNoteItem(id, shiftKey) {
    return getThemeNoteApi().toggleThemeNoteItem(id, shiftKey);
  }

  function prependThemeNoteToolbar(listContainer, renderFn) {
    return getThemeNoteApi().prependThemeNoteToolbar(listContainer, renderFn);
  }

  async function showThemeNotePopup(themeNames) {
    return getThemeNoteApi().showThemeNotePopup(themeNames);
  }

  async function executeThemeNoteEdit(names) {
    return getThemeNoteApi().executeThemeNoteEdit(names);
  }

  // ==================== 美化主题绑定背景 ====================
  function getThemeBgBinding(themeName) {
    return getThemeBgBindingCore(themeName, {
      extensionName,
      extensionSettings: extension_settings,
    });
  }

  function setThemeBgBinding(themeName, bgfile) {
    return setThemeBgBindingCore(themeName, bgfile, {
      extensionName,
      extensionSettings: extension_settings,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  function removeThemeBgBinding(themeName) {
    return removeThemeBgBindingCore(themeName, { setThemeBgBinding });
  }

  /** 获取当前正在使用的背景文件名 */
  function getCurrentBackgroundFile() {
    return getCurrentBackgroundFileCore({ document });
  }

  /** 点击锁链按钮的处理逻辑 */
  function handleThemeBgLink(themeName) {
    return handleThemeBgLinkCore(themeName, {
      $,
      cfmToastr,
      document,
      escapeHtml,
      getBackgroundDisplayName,
      getContext,
      getCurrentBackgroundFile,
      getCurrentResourceType: () => currentResourceType,
      getThemeBgBinding,
      removeThemeBgBinding,
      renderThemesView,
      setThemeBgBinding,
    });
  }

  /** 设置/清除默认背景图 */
  function handleDefaultBgSetting() {
    return handleDefaultBgSettingCore({
      $,
      cfmConfirm,
      cfmToastr,
      escapeHtml,
      extensionName,
      extensionSettings: extension_settings,
      getBackgroundDisplayName,
      getCurrentBackgroundFile,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      updateDefaultBgBtnState,
    });
  }

  /** 更新默认背景按钮的视觉状态 */
  function updateDefaultBgBtnState() {
    return updateDefaultBgBtnStateCore({
      $,
      extensionName,
      extensionSettings: extension_settings,
      getBackgroundDisplayName,
    });
  }

  // ==================== 背景方向识别 ====================
  const BG_ORIENT_LANDSCAPE = "landscape";
  const BG_ORIENT_PORTRAIT = "portrait";
  const BG_ORIENT_OTHER = "other";
  const BG_ORIENT_LABELS = {
    [BG_ORIENT_LANDSCAPE]: "横屏",
    [BG_ORIENT_PORTRAIT]: "竖屏",
    [BG_ORIENT_OTHER]: "其它",
  };
  const BG_ORIENT_ICONS = {
    [BG_ORIENT_LANDSCAPE]: "fa-display",
    [BG_ORIENT_PORTRAIT]: "fa-mobile-screen",
    [BG_ORIENT_OTHER]: "fa-expand",
  };

  function getBgOrientation(name) {
    return getBgOrientationCore(name, {
      extensionName,
      settings: extension_settings,
    });
  }
  function setBgOrientation(name, orient) {
    return setBgOrientationCore(name, orient, {
      extensionName,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      settings: extension_settings,
    });
  }

  /**
   * 自动检测背景图片方向（通过加载图片获取宽高比）
   * @param {string} name - 背景文件名
   * @returns {Promise<string>} 'landscape' | 'portrait' | 'other'
   */
  function detectBgOrientation(name) {
    return detectBgOrientationCore(name, {
      BG_ORIENT_LANDSCAPE,
      BG_ORIENT_OTHER,
      BG_ORIENT_PORTRAIT,
      Image,
      getBackgroundThumbnailUrl,
    });
  }

  /**
   * 批量自动检测并保存背景方向（仅对未检测过的背景执行）
   * @param {string[]} bgNames - 背景文件名列表
   * @param {boolean} force - 是否强制重新检测
   */
  async function autoDetectBgOrientations(bgNames, force = false) {
    return autoDetectBgOrientationsCore(bgNames, force, {
      detectBgOrientation,
      getBgOrientation,
      setBgOrientation,
    });
  }

  // ==================== 背景备注编辑模式 ====================
  let cfmBgNoteMode = false;
  let cfmBgNoteSelected = new Set();
  let cfmBgNoteRangeMode = false;
  let cfmBgNoteLastClicked = null;

  function getBgNote(name) {
    return getBgNoteCore(name, {
      extensionName,
      settings: extension_settings,
    });
  }
  function setBgNote(name, note) {
    return setBgNoteCore(name, note, {
      extensionName,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      settings: extension_settings,
    });
  }

  function enterBgNoteMode() {
    const prev = collectCurrentSelection();
    clearAllExclusiveModes();
    cfmBgNoteMode = true;
    cfmBgNoteSelected = prev || new Set();
    cfmBgNoteRangeMode = false;
    cfmBgNoteLastClicked = null;
    $("#cfm-bg-note-btn").addClass("cfm-edit-active");
    $("#cfm-bg-note-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-bg-note-btn").attr("title", "确认编辑备注");
    $(".cfm-popup").addClass("cfm-bg-note-mode");
    renderBackgroundsView();
  }

  function exitBgNoteMode() {
    cfmBgNoteMode = false;
    cfmBgNoteSelected.clear();
    cfmBgNoteRangeMode = false;
    cfmBgNoteLastClicked = null;
    $("#cfm-bg-note-btn").removeClass("cfm-edit-active");
    $("#cfm-bg-note-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-bg-note-btn").attr("title", "编辑备注");
    $(".cfm-popup").removeClass("cfm-bg-note-mode");
    renderBackgroundsView();
  }

  function toggleBgNoteItem(id, shiftKey) {
    if ((shiftKey || cfmBgNoteRangeMode) && cfmBgNoteLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmBgNoteLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmBgNoteSelected.add(visible[i]);
      }
    } else {
      if (cfmBgNoteSelected.has(id)) cfmBgNoteSelected.delete(id);
      else cfmBgNoteSelected.add(id);
    }
    cfmBgNoteLastClicked = id;
  }

  function prependBgNoteToolbar(listContainer, renderFn) {
    if (!cfmBgNoteMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmBgNoteSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmBgNoteRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmBgNoteRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmBgNoteSelected.size > 0 ? `已选 ${cfmBgNoteSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmBgNoteSelected.delete(id));
      } else {
        visible.forEach((id) => cfmBgNoteSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmBgNoteRangeMode = !cfmBgNoteRangeMode;
      if (cfmBgNoteRangeMode) cfmBgNoteLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitBgNoteMode();
    });
    listContainer.prepend(toolbar);
  }

  // ==================== 背景备注弹窗（已模块化到 features/backgrounds/notes.js） ====================
  let _bgNotePopupApi = null;
  function getBgNotePopupApi() {
    if (!_bgNotePopupApi) {
      _bgNotePopupApi = createBgNotePopupApi({
        $,
        escapeHtml,
        cfmConfirm,
        cfmToastr,
        getBgNote,
        getBgOrientation,
        getBackgroundDisplayName,
        getBackgroundThumbnailUrl,
        setBgNote,
        setBgOrientation,
        renderBackgroundsView,
        BG_ORIENT_LANDSCAPE,
        BG_ORIENT_PORTRAIT,
        BG_ORIENT_OTHER,
        BG_ORIENT_ICONS,
        BG_ORIENT_LABELS,
      });
    }
    return _bgNotePopupApi;
  }

  // 显示背景备注+方向编辑弹窗（支持单个或批量）
  async function showBgNotePopup(bgNames) {
    return getBgNotePopupApi().showBgNotePopup(bgNames);
  }

  // 执行背景备注编辑
  async function executeBgNoteEdit(names) {
    return getBgNotePopupApi().executeBgNoteEdit(names);
  }

  // ==================== 主题重命名模式 ====================
  let cfmThemeRenameMode = false;
  let cfmThemeRenameSelected = new Set();
  let cfmThemeRenameRangeMode = false;
  let cfmThemeRenameLastClicked = null;

  function getThemeRenameDeps() {
    return {
      $,
      cfmToastr,
      clearAllExclusiveModes,
      collectCurrentSelection,
      console,
      escapeHtml,
      fetch: window.fetch.bind(window),
      getNativeThemesArray: () =>
        typeof themes !== "undefined" ? themes : null,
      getRequestHeaders: () => getContext().getRequestHeaders(),
      getThemeNames,
      getVisibleResourceIds,
      renderThemesView,
      showBatchProgressOverlay,
      structuredClone,
      updateSettingsAfterRename,
      state: {
        get cfmThemeRenameMode() {
          return cfmThemeRenameMode;
        },
        set cfmThemeRenameMode(value) {
          cfmThemeRenameMode = value;
        },
        get cfmThemeRenameSelected() {
          return cfmThemeRenameSelected;
        },
        set cfmThemeRenameSelected(value) {
          cfmThemeRenameSelected = value;
        },
        get cfmThemeRenameRangeMode() {
          return cfmThemeRenameRangeMode;
        },
        set cfmThemeRenameRangeMode(value) {
          cfmThemeRenameRangeMode = value;
        },
        get cfmThemeRenameLastClicked() {
          return cfmThemeRenameLastClicked;
        },
        set cfmThemeRenameLastClicked(value) {
          cfmThemeRenameLastClicked = value;
        },
      },
    };
  }

  function getThemeRenameApi() {
    return createThemeRenameModeApi(getThemeRenameDeps());
  }

  function enterThemeRenameMode() {
    return getThemeRenameApi().enterThemeRenameMode();
  }

  function exitThemeRenameMode() {
    return getThemeRenameApi().exitThemeRenameMode();
  }

  function toggleThemeRenameItem(id, shiftKey) {
    return getThemeRenameApi().toggleThemeRenameItem(id, shiftKey);
  }

  function prependThemeRenameToolbar(listContainer, renderFn) {
    return getThemeRenameApi().prependThemeRenameToolbar(
      listContainer,
      renderFn,
    );
  }

  async function showThemeRenamePopup(names) {
    return getThemeRenameApi().showThemeRenamePopup(names);
  }

  async function executeThemeRename(names) {
    return getThemeRenameApi().executeThemeRename(names);
  }

  // ==================== 背景重命名模式 ====================
  let cfmBgRenameMode = false;
  let cfmBgRenameSelected = new Set();
  let cfmBgRenameRangeMode = false;
  let cfmBgRenameLastClicked = null;

  function getBgRenameDeps() {
    return {
      $,
      cfmToastr,
      clearAllExclusiveModes,
      collectCurrentSelection,
      console,
      escapeHtml,
      executeBgRename,
      exitBgRenameMode,
      fetch: window.fetch.bind(window),
      getBackgroundDisplayName,
      getBackgroundThumbnailUrl,
      getRequestHeaders: () => getContext().getRequestHeaders(),
      getVisibleResourceIds,
      importBackgroundsModule: () => import("../../../backgrounds.js"),
      renderBackgroundsView,
      showBatchProgressOverlay,
      showBgRenamePopup,
      updateSettingsAfterRename,
      state: {
        get cfmBgRenameMode() {
          return cfmBgRenameMode;
        },
        set cfmBgRenameMode(value) {
          cfmBgRenameMode = value;
        },
        get cfmBgRenameSelected() {
          return cfmBgRenameSelected;
        },
        set cfmBgRenameSelected(value) {
          cfmBgRenameSelected = value;
        },
        get cfmBgRenameRangeMode() {
          return cfmBgRenameRangeMode;
        },
        set cfmBgRenameRangeMode(value) {
          cfmBgRenameRangeMode = value;
        },
        get cfmBgRenameLastClicked() {
          return cfmBgRenameLastClicked;
        },
        set cfmBgRenameLastClicked(value) {
          cfmBgRenameLastClicked = value;
        },
      },
    };
  }

  function enterBgRenameMode() {
    return enterBgRenameModeCore(getBgRenameDeps());
  }

  function exitBgRenameMode() {
    return exitBgRenameModeCore(getBgRenameDeps());
  }

  function toggleBgRenameItem(id, shiftKey) {
    return toggleBgRenameItemCore(id, shiftKey, getBgRenameDeps());
  }

  function prependBgRenameToolbar(listContainer, renderFn) {
    return prependBgRenameToolbarCore(
      listContainer,
      renderFn,
      getBgRenameDeps(),
    );
  }

  async function showBgRenamePopup(names) {
    return showBgRenamePopupCore(names, getBgRenameDeps());
  }

  async function executeBgRename(names) {
    return executeBgRenameCore(names, getBgRenameDeps());
  }

  // ==================== 预设备注编辑模式 ====================
  let cfmPresetNoteMode = false;
  let cfmPresetNoteSelected = new Set();
  let cfmPresetNoteRangeMode = false;
  let cfmPresetNoteLastClicked = null;
  let _presetNotesApi = null;

  function getPresetNotesApi() {
    if (!_presetNotesApi) {
      _presetNotesApi = createPresetNotesApiCore({
        $,
        extensionSettings: extension_settings,
        extensionName,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        getContext,
        escapeHtml,
        cfmConfirm,
        cfmToastr,
        collectCurrentSelection,
        clearAllExclusiveModes,
        getVisibleResourceIds,
        renderPresetsView,
        state: {
          get cfmPresetNoteMode() {
            return cfmPresetNoteMode;
          },
          set cfmPresetNoteMode(value) {
            cfmPresetNoteMode = value;
          },
          get cfmPresetNoteSelected() {
            return cfmPresetNoteSelected;
          },
          set cfmPresetNoteSelected(value) {
            cfmPresetNoteSelected = value;
          },
          get cfmPresetNoteRangeMode() {
            return cfmPresetNoteRangeMode;
          },
          set cfmPresetNoteRangeMode(value) {
            cfmPresetNoteRangeMode = value;
          },
          get cfmPresetNoteLastClicked() {
            return cfmPresetNoteLastClicked;
          },
          set cfmPresetNoteLastClicked(value) {
            cfmPresetNoteLastClicked = value;
          },
        },
      });
    }
    return _presetNotesApi;
  }

  function getPresetNote(name) {
    return getPresetNotesApi().getPresetNote(name);
  }
  function setPresetNote(name, note) {
    return getPresetNotesApi().setPresetNote(name, note);
  }

  // ==================== User备注编辑模式 ====================
  let cfmPersonaNoteMode = false;
  let cfmPersonaNoteSelected = new Set();
  let cfmPersonaNoteRangeMode = false;
  let cfmPersonaNoteLastClicked = null;
  let _personaNotesApi = null;

  function getPersonaNotesApi() {
    if (!_personaNotesApi) {
      _personaNotesApi = createPersonaNotesApiCore({
        $,
        extensionSettings: extension_settings,
        extensionName,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        getContext,
        escapeHtml,
        cfmConfirm,
        cfmToastr,
        collectCurrentSelection,
        clearAllExclusiveModes,
        getVisibleResourceIds,
        renderPersonasView,
        state: {
          get cfmPersonaNoteMode() {
            return cfmPersonaNoteMode;
          },
          set cfmPersonaNoteMode(value) {
            cfmPersonaNoteMode = value;
          },
          get cfmPersonaNoteSelected() {
            return cfmPersonaNoteSelected;
          },
          set cfmPersonaNoteSelected(value) {
            cfmPersonaNoteSelected = value;
          },
          get cfmPersonaNoteRangeMode() {
            return cfmPersonaNoteRangeMode;
          },
          set cfmPersonaNoteRangeMode(value) {
            cfmPersonaNoteRangeMode = value;
          },
          get cfmPersonaNoteLastClicked() {
            return cfmPersonaNoteLastClicked;
          },
          set cfmPersonaNoteLastClicked(value) {
            cfmPersonaNoteLastClicked = value;
          },
        },
      });
    }
    return _personaNotesApi;
  }

  function getPersonaNote(name) {
    return getPersonaNotesApi().getPersonaNote(name);
  }

  function setPersonaNote(name, note) {
    return getPersonaNotesApi().setPersonaNote(name, note);
  }

  function enterPersonaNoteMode() {
    return getPersonaNotesApi().enterPersonaNoteMode();
  }

  function exitPersonaNoteMode() {
    return getPersonaNotesApi().exitPersonaNoteMode();
  }

  function togglePersonaNoteItem(id, shiftKey) {
    return getPersonaNotesApi().togglePersonaNoteItem(id, shiftKey);
  }

  function prependPersonaNoteToolbar(listContainer, renderFn) {
    return getPersonaNotesApi().prependPersonaNoteToolbar(
      listContainer,
      renderFn,
    );
  }

  async function showPersonaNotePopup(personaIds) {
    return getPersonaNotesApi().showPersonaNotePopup(personaIds);
  }

  async function executePersonaNoteEdit(ids) {
    return getPersonaNotesApi().executePersonaNoteEdit(ids);
  }

  function enterPresetNoteMode() {
    return getPresetNotesApi().enterPresetNoteMode();
  }

  function exitPresetNoteMode() {
    return getPresetNotesApi().exitPresetNoteMode();
  }

  function togglePresetNoteItem(id, shiftKey) {
    return getPresetNotesApi().togglePresetNoteItem(id, shiftKey);
  }

  function prependPresetNoteToolbar(listContainer, renderFn) {
    return getPresetNotesApi().prependPresetNoteToolbar(
      listContainer,
      renderFn,
    );
  }

  async function showPresetNotePopup(presetNames) {
    return getPresetNotesApi().showPresetNotePopup(presetNames);
  }

  async function executePresetNoteEdit(names) {
    return getPresetNotesApi().executePresetNoteEdit(names);
  }

  // ==================== 世界书激活状态管理 ====================
  /**
   * 获取当前角色关联的世界书名称集合（同步优先，主绑定 + charLore辅助世界书）
   * 这些世界书的 toggle 应锁定不可操作
   */
  function getCharBoundWorldBooks() {
    return getCharBoundWorldBooksCore({
      console,
      getCharacters,
      getContext,
      getWiModuleSync,
    });
  }

  /**
   * 判断世界书是否已在全局激活列表中（同步优先）
   */
  function isWorldInfoActive(name) {
    return isWorldInfoActiveCore(name, {
      $,
      getWiModuleSync,
    });
  }

  /**
   * 批量获取所有世界书的激活状态（同步优先）
   * @returns {Set<string>} 当前激活的世界书名称集合
   */
  function getActiveWorldInfoSet() {
    return getActiveWorldInfoSetCore({
      $,
      getWiModuleSync,
    });
  }

  function getExistingWorldInfoNameSet() {
    return getExistingWorldInfoNameSetCore({
      $,
      console,
      getCachedWorldInfoNames: () => _worldInfoNamesCache,
      getWorldInfoDetachedOptions: () => _worldInfoDetachedOptions,
    });
  }

  function filterExistingWorldInfoNames(bookNames, existingNameSet) {
    return filterExistingWorldInfoNamesCore(bookNames, existingNameSet, {
      getExistingWorldInfoNameSet,
    });
  }

  function sanitizeWiActivePresetState(save = false) {
    return sanitizeWiActivePresetStateCore(save, {
      extensionName,
      extensionSettings: extension_settings,
      filterExistingWorldInfoNames,
      getExistingWorldInfoNameSet,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 切换世界书的全局激活状态
   * @param {string} name - 世界书名称
   * @param {boolean} activate - true=激活, false=取消激活
   */
  async function toggleWorldInfoActivation(name, activate) {
    return toggleWorldInfoActivationCore(name, activate, {
      $,
      console,
      ensureWiModule,
      getExistingWorldInfoNameSet,
    });
  }

  /**
   * 批量设置世界书激活状态（用于加载分组预设）
   * @param {string[]} bookNames - 要激活的世界书名称列表
   * @param {Set<string>} charBound - 角色关联的世界书（不操作）
   */
  async function applyWorldInfoPreset(bookNames, charBound) {
    return applyWorldInfoPresetCore(bookNames, charBound, {
      $,
      console,
      ensureWiModule,
      filterExistingWorldInfoNames,
      getExistingWorldInfoNameSet,
    });
  }

  // ==================== 世界书分组预设管理 ====================
  function getWiActivePresets() {
    return getWiActivePresetsCore({
      extensionName,
      extensionSettings: extension_settings,
      sanitizeWiActivePresetState,
    });
  }
  function saveWiActivePreset(name, books, scope, bindChars, bindPresets) {
    return saveWiActivePresetCore(name, books, scope, bindChars, bindPresets, {
      extensionName,
      extensionSettings: extension_settings,
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }
  function deleteWiActivePreset(name) {
    return deleteWiActivePresetCore(name, {
      extensionName,
      extensionSettings: extension_settings,
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }
  function renameWiActivePreset(oldName, newName) {
    return renameWiActivePresetCore(oldName, newName, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  // ==================== 世界书分组绑定与自动应用 ====================
  /**
   * 获取当前角色的 avatar 标识
   */
  function getCurrentCharAvatar() {
    return getCurrentCharAvatarCore({
      getContext,
      getCharacters,
    });
  }

  /**
   * 获取当前角色的显示名称
   */
  function getCurrentCharName() {
    return getCurrentCharNameCore({
      getContext,
      getCharacters,
    });
  }

  /**
   * 获取当前激活的 User avatar 标识
   */
  function getCurrentPersonaAvatar() {
    try {
      return (
        $("#user_avatar_block .avatar-container.selected").attr(
          "data-avatar-id",
        ) || null
      );
    } catch (e) {
      return null;
    }
  }

  /**
   * 获取当前聊天文件名（不含扩展名）
   */
  function getCurrentChatFileName() {
    return getCurrentChatFileNameCore({
      getContext,
      getCharacters,
    });
  }

  /**
   * 获取当前聊天绑定键：avatar::chatFileName
   */
  function getCurrentChatBindKey() {
    return getCurrentChatBindKeyCore({
      getCurrentCharAvatar,
      getCurrentChatFileName,
    });
  }

  function makeChatBindKey(charAvatar, chatFileName) {
    return makeChatBindKeyCore(charAvatar, chatFileName);
  }

  function parseChatBindKey(bindKey) {
    return parseChatBindKeyCore(bindKey);
  }

  let _personaBindingsApi = null;

  function getPersonaBindingsApi() {
    if (!_personaBindingsApi) {
      _personaBindingsApi = createPersonaBindingsApiCore({
        $,
        window,
        cfmToastr,
        clearInterval: window.clearInterval.bind(window),
        ensureSettings,
        escapeHtml,
        extensionName,
        extensionSettings: extension_settings,
        getContext,
        getCurrentCharAvatar,
        getCurrentChatBindKey,
        parseChatBindKey,
        refreshPersonaPanelView,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        selectPersona,
        setInterval: window.setInterval.bind(window),
        setTimeout: window.setTimeout.bind(window),
      });
    }
    return _personaBindingsApi;
  }

  function getPersonaChatBindingsStore() {
    return getPersonaBindingsApi().getPersonaChatBindingsStore();
  }

  function getPersonaChatBindKeys(avatarId, includeBindKey = "") {
    return getPersonaBindingsApi().getPersonaChatBindKeys(
      avatarId,
      includeBindKey,
    );
  }

  function syncPersonaChatBindingState(avatarId, bindKey, shouldBind) {
    return getPersonaBindingsApi().syncPersonaChatBindingState(
      avatarId,
      bindKey,
      shouldBind,
    );
  }

  function buildPersonaChatBindHtml(avatarId, includeBindKey = "") {
    return getPersonaBindingsApi().buildPersonaChatBindHtml(
      avatarId,
      includeBindKey,
    );
  }

  function ensurePersonaDescriptionEntry(avatarId) {
    return getPersonaBindingsApi().ensurePersonaDescriptionEntry(avatarId);
  }

  function getPersonaBindStates(persona) {
    return getPersonaBindingsApi().getPersonaBindStates(persona);
  }

  function triggerNativePersonaBind(persona, bindType) {
    return getPersonaBindingsApi().triggerNativePersonaBind(persona, bindType);
  }

  function hasNativePersonaToolEntry() {
    return getPersonaBindingsApi().hasNativePersonaToolEntry();
  }

  function triggerNativePersonaTool(persona) {
    return getPersonaBindingsApi().triggerNativePersonaTool(persona);
  }

  /**
   * 更新分组的 scope
   * scope: "global"（不自动管理）| "bound"（有绑定，自动管理）
   */
  function setWiPresetScope(presetIdx, scope) {
    return setWiPresetScopeCore(presetIdx, scope, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 绑定分组到角色卡
   */
  function bindWiPresetToChar(presetIdx, charAvatar) {
    return bindWiPresetToCharCore(presetIdx, charAvatar, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 绑定分组到聊天记录
   */
  function bindWiPresetToChat(presetIdx, charAvatar, chatFileName) {
    return bindWiPresetToChatCore(presetIdx, charAvatar, chatFileName, {
      getWiActivePresets,
      makeChatBindKey,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 绑定分组到预设
   */
  function bindWiPresetToPreset(presetIdx, presetName) {
    return bindWiPresetToPresetCore(presetIdx, presetName, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 取消绑定分组与角色卡
   */
  function unbindWiPresetFromChar(presetIdx, charAvatar) {
    return unbindWiPresetFromCharCore(presetIdx, charAvatar, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  function unbindWiPresetFromChat(presetIdx, bindKey) {
    return unbindWiPresetFromChatCore(presetIdx, bindKey, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 取消绑定分组与预设
   */
  function unbindWiPresetFromPreset(presetIdx, presetName) {
    return unbindWiPresetFromPresetCore(presetIdx, presetName, {
      getWiActivePresets,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 获取当前角色/聊天/预设应该自动应用的分组列表（含匹配原因）
   * @returns {{indices: number[], details: Object<number, {charMatch: boolean, presetMatch: boolean, chatMatch: boolean}>}}
   */
  function getAutoApplyPresetIndices() {
    return getAutoApplyPresetIndicesCore({
      getWiActivePresets,
      getCurrentCharAvatar,
      getCurrentPresetName,
      getCurrentChatBindKey,
    });
  }

  /**
   * 自动应用/关闭世界书分组（角色或预设切换时调用）
   */
  async function autoApplyWiPresets(silent = false) {
    return autoApplyWiPresetsCore(silent, {
      extensionSettings: extension_settings,
      extensionName,
      cfmToastr,
      console,
      getWiActivePresets,
      getCharBoundWorldBooks,
      getAutoApplyPresetIndices,
      getCurrentCharName,
      getCurrentPresetName,
      getCurrentChatFileName,
      toggleWorldInfoActivation,
    });
  }

  /**
   * 获取分组的绑定摘要文本
   */
  function getWiPresetBindSummary(preset) {
    return getWiPresetBindSummaryCore(preset, {
      getCharacters,
    });
  }

  /**
   * 显示世界书激活分组统一面板（保存 + 已有分组列表）
   */
  // ===== showWiPresetPanel 薄包装（世界书激活分组面板） =====
  let _wiPresetPanelApi = null;
  function getWiPresetPanelApi() {
    if (!_wiPresetPanelApi) {
      _wiPresetPanelApi = createWiPresetPanelApiCore({
        $,
        applyWorldInfoPreset,
        bindWiPresetToChar,
        bindWiPresetToChat,
        bindWiPresetToPreset,
        cfmConfirm,
        cfmToastr,
        createChoiceDialog,
        deleteWiActivePreset,
        escapeHtml,
        extensionName,
        extension_settings,
        getActiveWorldInfoSet,
        getAutoApplyPresetIndices,
        getCharBoundWorldBooks,
        getCharacters,
        getContext,
        getCurrentCharAvatar,
        getCurrentCharName,
        getCurrentChatBindKey,
        getCurrentChatFileName,
        getCurrentPresetName,
        getWiActivePresets,
        getWiPresetBindSummary,
        parseChatBindKey,
        renderWorldInfoView,
        saveWiActivePreset,
        setWiPresetScope,
        showWiPresetEditPopup,
        toggleWorldInfoActivation,
        unapplyWiPresetIndex,
        unbindWiPresetFromChar,
        unbindWiPresetFromChat,
        unbindWiPresetFromPreset,
        document,
        window,
        setTimeout,
        console,
        parseInt,
      });
    }
    return _wiPresetPanelApi;
  }

  async function showWiPresetPanel() {
    return getWiPresetPanelApi().showWiPresetPanel();
  }

  /**
   * 显示编辑世界书激活分组的弹窗（可修改名称和包含的世界书）
   * @param {Object} preset - {name: string, books: string[]}
   */
  async function showWiPresetEditPopup(preset) {
    if ($("#cfm-wi-preset-edit-overlay").length > 0) return;
    const allNames = await getWorldInfoNames();
    const charBound = await getCharBoundWorldBooks();
    const bookSet = new Set(preset.books);
    const wiGroups = getResourceGroups("worldinfo");
    const wiTree = getResFolderTree("worldinfo");
    const booksHtml = allNames
      .filter((n) => !charBound.has(n))
      .map((n) => {
        const checked = bookSet.has(n) ? "checked" : "";
        const folder = wiGroups[n] || "";
        return `<label class="cfm-wi-preset-edit-item" data-folder="${escapeHtml(folder)}">
          <input type="checkbox" value="${escapeHtml(n)}" ${checked}>
          <i class="fa-solid fa-book" style="color:#a6e3a1;"></i>
          <span>${escapeHtml(n)}</span>
        </label>`;
      })
      .join("");
    // 构建文件夹过滤选项（递归缩进）
    function buildWiFilterOptions() {
      const opts = [
        '<option value="__all__">全部</option>',
        '<option value="__ungrouped__">未归类</option>',
      ];
      function addOpts(parentId, depth) {
        const children = sortResFolders(
          "worldinfo",
          Object.keys(wiTree).filter(
            (id) => wiTree[id].parentId === (parentId || null),
          ),
        );
        for (const id of children) {
          const indent = "&nbsp;".repeat(depth * 3);
          opts.push(
            `<option value="${escapeHtml(id)}">${indent}📁 ${escapeHtml(getResFolderDisplayName("worldinfo", id))}</option>`,
          );
          addOpts(id, depth + 1);
        }
      }
      addOpts(null, 0);
      return opts.join("");
    }
    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-wi-preset-edit-overlay">
        <div class="cfm-edit-popup cfm-wi-preset-edit-popup">
          <div class="cfm-edit-popup-title">编辑激活分组</div>
          <div class="cfm-edit-field">
            <label>分组名称</label>
            <input type="text" class="cfm-edit-input" id="cfm-wi-preset-edit-name" value="${escapeHtml(preset.name || "未命名分组")}">
          </div>
          <div class="cfm-edit-field">
            <label>包含的世界书 <span class="cfm-wi-preset-edit-hint">（角色关联的世界书已排除）</span></label>
            <div class="cfm-wi-preset-edit-search">
              <div class="cfm-nf-btn menu_button fa-solid fa-folder-tree" id="cfm-wi-preset-edit-folder-btn" title="文件夹过滤"></div>
              <span class="cfm-wi-preset-edit-folder-label" id="cfm-wi-preset-edit-folder-label">显示全部</span>
              <input type="hidden" id="cfm-wi-preset-edit-folder-filter" value="__all__">
              <input type="text" class="cfm-edit-input" id="cfm-wi-preset-edit-filter" placeholder="搜索世界书...">
            </div>
            <div class="cfm-wi-preset-edit-list">${booksHtml}</div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-edit-popup-cancel">取消</button>
            <button class="cfm-edit-popup-confirm">保存</button>
          </div>
        </div>
      </div>
    `);
    $("body").append(overlay);
    // 组合过滤函数（文件夹 + 文本搜索）
    function getWiFolderFilterLabel(folderVal) {
      if (!folderVal || folderVal === "__all__") return "显示全部";
      if (folderVal === "__current_selected__") return "当前分组";
      if (folderVal === "__ungrouped__") return "未归类世界书";
      return getResFolderDisplayName("worldinfo", folderVal) || folderVal;
    }

    function applyEditFilters() {
      const folderVal =
        overlay.find("#cfm-wi-preset-edit-folder-filter").val() || "__all__";
      overlay
        .find("#cfm-wi-preset-edit-folder-label")
        .text(getWiFolderFilterLabel(folderVal));
      const q = overlay
        .find("#cfm-wi-preset-edit-filter")
        .val()
        .toLowerCase()
        .trim();
      // 预计算选中文件夹下所有递归子文件夹 ID
      let allowedFolders = null;
      if (
        folderVal &&
        folderVal !== "__all__" &&
        folderVal !== "__ungrouped__" &&
        folderVal !== "__current_selected__"
      ) {
        allowedFolders = new Set();
        function collectChildren(pid) {
          allowedFolders.add(pid);
          const children = Object.keys(wiTree).filter(
            (id) => wiTree[id].parentId === pid,
          );
          for (const c of children) collectChildren(c);
        }
        collectChildren(folderVal);
      }
      overlay.find(".cfm-wi-preset-edit-item").each(function () {
        const name = $(this).find("span").text().toLowerCase();
        const folder = $(this).attr("data-folder") || "";
        const isChecked = $(this).find("input").prop("checked");
        let folderMatch = true;
        if (folderVal === "__current_selected__") {
          folderMatch = isChecked;
        } else if (folderVal === "__ungrouped__") {
          folderMatch = !folder || !wiTree[folder];
        } else if (allowedFolders) {
          folderMatch = allowedFolders.has(folder);
        }
        const textMatch = !q || name.includes(q);
        $(this).toggle(folderMatch && textMatch);
      });
    }
    overlay.find("#cfm-wi-preset-edit-folder-btn").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const currentCheckedInput = overlay
        .find(".cfm-wi-preset-edit-item input:checked")
        .first();
      const currentCheckedItem = currentCheckedInput.closest(
        ".cfm-wi-preset-edit-item",
      );
      const currentCheckedFolderRaw =
        currentCheckedItem.attr("data-folder") || "";
      const currentCheckedFolder =
        currentCheckedFolderRaw && wiTree[currentCheckedFolderRaw]
          ? currentCheckedFolderRaw
          : "__ungrouped__";
      showPresetEditFolderFilterPanel($(this), {
        panelKey: "wi_preset_edit",
        folderTree: wiTree,
        getDisplayName: (id) => getResFolderDisplayName("worldinfo", id),
        getItemCount: (folderId) => {
          if (folderId === "__ungrouped__") {
            return allNames.filter((name) => {
              const grp = wiGroups[name];
              return !grp || !wiTree[grp];
            }).length;
          }
          const allowedFolders = new Set();
          function collectChildren(pid) {
            allowedFolders.add(pid);
            const children = Object.keys(wiTree).filter(
              (id) => wiTree[id].parentId === pid,
            );
            for (const c of children) collectChildren(c);
          }
          collectChildren(folderId);
          return allNames.filter((name) => allowedFolders.has(wiGroups[name]))
            .length;
        },
        ungroupedLabel: "未归类世界书",
        currentFilter:
          overlay.find("#cfm-wi-preset-edit-folder-filter").val() || "__all__",
        currentSelectedFilter: "__current_selected__",
        currentSelectedLabel: "当前分组",
        currentSelectedCount: overlay.find(
          ".cfm-wi-preset-edit-item input:checked",
        ).length,
        onSelect: (folderId) => {
          overlay.find("#cfm-wi-preset-edit-folder-filter").val(folderId);
          applyEditFilters();
        },
      });
    });
    overlay.find("#cfm-wi-preset-edit-filter").on("input", applyEditFilters);
    applyEditFilters();
    overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) overlay.remove();
    });
    overlay.find(".cfm-edit-popup-confirm").on("click", () => {
      const newName = overlay.find("#cfm-wi-preset-edit-name").val().trim();
      if (!newName) {
        cfmToastr.warning("请输入分组名称");
        return;
      }
      // 检查重名（排除自身）
      const existingOther = getWiActivePresets().find(
        (p) => p.name === newName && p.name !== preset.name,
      );
      if (existingOther) {
        cfmToastr.warning(`分组名称「${newName}」已被使用`);
        return;
      }
      const newBooks = [];
      overlay.find(".cfm-wi-preset-edit-item input:checked").each(function () {
        newBooks.push($(this).val());
      });
      if (newBooks.length === 0) {
        cfmToastr.warning("请至少选择一个世界书");
        return;
      }
      // 如果名称变了，先重命名
      if (newName !== preset.name) {
        renameWiActivePreset(preset.name, newName);
      }
      // 更新世界书列表
      saveWiActivePreset(newName, newBooks);
      cfmToastr.success(
        `已更新激活分组「${newName}」（${newBooks.length} 个世界书）`,
      );
      overlay.remove();
    });
  }

  // ==================== 世界书备注编辑模式 ====================
  let cfmWorldInfoNoteMode = false;
  let cfmWorldInfoNoteSelected = new Set();
  let cfmWorldInfoNoteRangeMode = false;
  let cfmWorldInfoNoteLastClicked = null;

  let _worldInfoNotesApi = null;
  function getWorldInfoNotesApi() {
    if (!_worldInfoNotesApi) {
      _worldInfoNotesApi = createWorldInfoNotesApiCore({
        $,
        extensionSettings: extension_settings,
        extensionName,
        state: {
          get cfmWorldInfoNoteMode() {
            return cfmWorldInfoNoteMode;
          },
          set cfmWorldInfoNoteMode(value) {
            cfmWorldInfoNoteMode = value;
          },
          get cfmWorldInfoNoteSelected() {
            return cfmWorldInfoNoteSelected;
          },
          set cfmWorldInfoNoteSelected(value) {
            cfmWorldInfoNoteSelected = value;
          },
          get cfmWorldInfoNoteRangeMode() {
            return cfmWorldInfoNoteRangeMode;
          },
          set cfmWorldInfoNoteRangeMode(value) {
            cfmWorldInfoNoteRangeMode = value;
          },
          get cfmWorldInfoNoteLastClicked() {
            return cfmWorldInfoNoteLastClicked;
          },
          set cfmWorldInfoNoteLastClicked(value) {
            cfmWorldInfoNoteLastClicked = value;
          },
        },
        collectCurrentSelection,
        clearAllExclusiveModes,
        getVisibleResourceIds,
        renderWorldInfoView,
        escapeHtml,
        cfmConfirm,
        cfmToastr,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      });
    }
    return _worldInfoNotesApi;
  }

  function getWorldInfoNote(name) {
    return getWorldInfoNotesApi().getWorldInfoNote(name);
  }

  function setWorldInfoNote(name, note) {
    return getWorldInfoNotesApi().setWorldInfoNote(name, note);
  }

  function enterWorldInfoNoteMode() {
    return getWorldInfoNotesApi().enterWorldInfoNoteMode();
  }

  function exitWorldInfoNoteMode() {
    return getWorldInfoNotesApi().exitWorldInfoNoteMode();
  }

  function toggleWorldInfoNoteItem(id, shiftKey) {
    return getWorldInfoNotesApi().toggleWorldInfoNoteItem(id, shiftKey);
  }

  function prependWorldInfoNoteToolbar(listContainer, renderFn) {
    return getWorldInfoNotesApi().prependWorldInfoNoteToolbar(
      listContainer,
      renderFn,
    );
  }

  async function showWorldInfoNotePopup(wiNames) {
    return await getWorldInfoNotesApi().showWorldInfoNotePopup(wiNames);
  }

  async function executeWorldInfoNoteEdit(names) {
    return await getWorldInfoNotesApi().executeWorldInfoNoteEdit(names);
  }

  // ==================== 快速回复备注编辑模式 ====================
  let cfmQrNoteMode = false;
  let cfmQrNoteSelected = new Set();
  let cfmQrNoteRangeMode = false;
  let cfmQrNoteLastClicked = null;

  let _quickReplyNotesApi = null;
  function getQuickReplyNotesApi() {
    if (!_quickReplyNotesApi) {
      _quickReplyNotesApi = createQuickReplyNotesApiCore({
        $,
        cfmConfirm,
        cfmToastr,
        clearAllExclusiveModes,
        collectCurrentSelection,
        escapeHtml,
        extensionName,
        extensionSettings: extension_settings,
        getContext,
        getVisibleResourceIds,
        renderQRView,
        state: {
          get cfmQrNoteMode() {
            return cfmQrNoteMode;
          },
          set cfmQrNoteMode(value) {
            cfmQrNoteMode = value;
          },
          get cfmQrNoteSelected() {
            return cfmQrNoteSelected;
          },
          set cfmQrNoteSelected(value) {
            cfmQrNoteSelected = value;
          },
          get cfmQrNoteRangeMode() {
            return cfmQrNoteRangeMode;
          },
          set cfmQrNoteRangeMode(value) {
            cfmQrNoteRangeMode = value;
          },
          get cfmQrNoteLastClicked() {
            return cfmQrNoteLastClicked;
          },
          set cfmQrNoteLastClicked(value) {
            cfmQrNoteLastClicked = value;
          },
        },
      });
    }
    return _quickReplyNotesApi;
  }

  function enterQrNoteMode() {
    return getQuickReplyNotesApi().enterQrNoteMode();
  }

  function exitQrNoteMode() {
    return getQuickReplyNotesApi().exitQrNoteMode();
  }

  function toggleQrNoteItem(id, shiftKey) {
    return getQuickReplyNotesApi().toggleQrNoteItem(id, shiftKey);
  }

  function prependQrNoteToolbar(listContainer, renderFn) {
    return getQuickReplyNotesApi().prependQrNoteToolbar(
      listContainer,
      renderFn,
    );
  }

  async function showQrNotePopup(qrNames) {
    return getQuickReplyNotesApi().showQrNotePopup(qrNames);
  }

  async function executeQrNoteEdit(names) {
    return getQuickReplyNotesApi().executeQrNoteEdit(names);
  }

  // ==================== 快速回复重命名模式 ====================
  let cfmQrRenameMode = false;
  let cfmQrRenameSelected = new Set();
  let cfmQrRenameRangeMode = false;
  let cfmQrRenameLastClicked = null;

  let _quickReplyRenameApi = null;
  function getQuickReplyRenameApi() {
    if (!_quickReplyRenameApi) {
      _quickReplyRenameApi = createQuickReplyRenameApiCore({
        $,
        cfmToastr,
        clearAllExclusiveModes,
        collectCurrentSelection,
        escapeHtml,
        fetch: (...args) => window.fetch(...args),
        findCommonPrefix,
        findCommonSuffix,
        getVisibleResourceIds,
        renderQRView,
        showBatchProgressOverlay,
        state: {
          get cfmQrRenameMode() {
            return cfmQrRenameMode;
          },
          set cfmQrRenameMode(value) {
            cfmQrRenameMode = value;
          },
          get cfmQrRenameSelected() {
            return cfmQrRenameSelected;
          },
          set cfmQrRenameSelected(value) {
            cfmQrRenameSelected = value;
          },
          get cfmQrRenameRangeMode() {
            return cfmQrRenameRangeMode;
          },
          set cfmQrRenameRangeMode(value) {
            cfmQrRenameRangeMode = value;
          },
          get cfmQrRenameLastClicked() {
            return cfmQrRenameLastClicked;
          },
          set cfmQrRenameLastClicked(value) {
            cfmQrRenameLastClicked = value;
          },
        },
        updateSettingsAfterRename,
      });
    }
    return _quickReplyRenameApi;
  }

  let _quickReplyPresetsApi = null;
  function getQuickReplyPresetsApi() {
    if (!_quickReplyPresetsApi) {
      _quickReplyPresetsApi = createQuickReplyPresetsApiCore({
        $,
        CSS,
        cfmConfirm,
        cfmToastr,
        console,
        document,
        escapeHtml,
        extensionName,
        extensionSettings: extension_settings,
        getCharacters,
        getContext,
        getCurrentCharAvatar,
        getCurrentCharName,
        getCurrentChatBindKey,
        getCurrentChatFileName,
        getCurrentPresetName,
        getResFolderDisplayName,
        getResFolderTree,
        getResourceGroups,
        makeChatBindKey,
        parseChatBindKey,
        renderQRView,
        showPresetEditFolderFilterPanel,
        sortResFolders,
        setTimeout: window.setTimeout.bind(window),
        window,
      });
    }
    return _quickReplyPresetsApi;
  }

  function enterQrRenameMode() {
    return getQuickReplyRenameApi().enterQrRenameMode();
  }

  function exitQrRenameMode() {
    return getQuickReplyRenameApi().exitQrRenameMode();
  }

  function toggleQrRenameItem(id, shiftKey) {
    return getQuickReplyRenameApi().toggleQrRenameItem(id, shiftKey);
  }

  function prependQrRenameToolbar(listContainer, renderFn) {
    return getQuickReplyRenameApi().prependQrRenameToolbar(
      listContainer,
      renderFn,
    );
  }

  // 显示快速回复集重命名弹窗（复用世界书重命名弹窗的结构）
  async function showQrRenamePopup(names) {
    return getQuickReplyRenameApi().showQrRenamePopup(names);
  }

  // 执行快速回复集重命名
  async function executeQrRename(names) {
    return getQuickReplyRenameApi().executeQrRename(names);
  }

  // 更新全局/聊天 QR 集引用
  async function updateQrGlobalChatRefs(oldName, newName) {
    return getQuickReplyRenameApi().updateQrGlobalChatRefs(oldName, newName);
  }

  // ==================== 预设重命名模式 ====================
  let cfmPresetRenameMode = false;
  let cfmPresetRenameSelected = new Set();
  let cfmPresetRenameRangeMode = false;
  let cfmPresetRenameLastClicked = null;
  let _presetRenameApi = null;

  function getPresetRenameApi() {
    if (!_presetRenameApi) {
      _presetRenameApi = createPresetRenameApiCore({
        $,
        cfmConfirm,
        cfmToastr,
        console,
        escapeHtml,
        fetch: (...args) => window.fetch(...args),
        findCommonPrefix,
        findCommonSuffix,
        getContext,
        getCurrentPresets,
        getPresetDataForRename,
        getVisibleResourceIds,
        collectCurrentSelection,
        clearAllExclusiveModes,
        refreshPresetManagerList,
        renderPresetsView,
        showBatchProgressOverlay,
        syncPresetOptionInDOM,
        updateSettingsAfterRename,
        state: {
          get cfmPresetRenameMode() {
            return cfmPresetRenameMode;
          },
          set cfmPresetRenameMode(value) {
            cfmPresetRenameMode = value;
          },
          get cfmPresetRenameSelected() {
            return cfmPresetRenameSelected;
          },
          set cfmPresetRenameSelected(value) {
            cfmPresetRenameSelected = value;
          },
          get cfmPresetRenameRangeMode() {
            return cfmPresetRenameRangeMode;
          },
          set cfmPresetRenameRangeMode(value) {
            cfmPresetRenameRangeMode = value;
          },
          get cfmPresetRenameLastClicked() {
            return cfmPresetRenameLastClicked;
          },
          set cfmPresetRenameLastClicked(value) {
            cfmPresetRenameLastClicked = value;
          },
        },
      });
    }
    return _presetRenameApi;
  }

  function enterPresetRenameMode() {
    return getPresetRenameApi().enterPresetRenameMode();
  }

  function exitPresetRenameMode() {
    return getPresetRenameApi().exitPresetRenameMode();
  }

  function togglePresetRenameItem(id, shiftKey) {
    return getPresetRenameApi().togglePresetRenameItem(id, shiftKey);
  }

  function prependPresetRenameToolbar(listContainer, renderFn) {
    return getPresetRenameApi().prependPresetRenameToolbar(
      listContainer,
      renderFn,
    );
  }

  // 显示预设重命名弹窗
  async function showPresetRenamePopup(names) {
    return getPresetRenameApi().showPresetRenamePopup(names);
  }

  // 查找公共前缀
  function findCommonPrefix(names) {
    if (names.length === 0) return "";
    // 按第一个名称与第二个进行比较来找最大公共前缀，然后和后续比较
    let prefix = names[0];
    for (let i = 1; i < names.length; i++) {
      while (names[i].indexOf(prefix) !== 0) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (!prefix) return "";
      }
    }
    return prefix;
  }

  // 查找公共后缀
  function findCommonSuffix(names) {
    if (names.length === 0) return "";
    const reversed = names.map((n) => n.split("").reverse().join(""));
    let suffix = reversed[0];
    for (let i = 1; i < reversed.length; i++) {
      while (reversed[i].indexOf(suffix) !== 0) {
        suffix = suffix.substring(0, suffix.length - 1);
        if (!suffix) return "";
      }
    }
    return suffix.split("").reverse().join("");
  }

  function buildAutoIncrementSuffix(pattern, index) {
    if (index <= 0) return "";
    const suffix = String(pattern || "");
    if (index === 1) return suffix;
    const hasNumber = /(\d+)(?!.*\d)/.test(suffix);
    if (hasNumber) {
      return suffix.replace(/(\d+)(?!.*\d)/, String(index));
    }
    return `${suffix}${index}`;
  }

  // 执行预设重命名
  async function executePresetRename(names) {
    return getPresetRenameApi().executePresetRename(names);
  }

  // 获取预设数据用于重命名
  function getPresetDataForRename(pm, name) {
    if (typeof pm.getCompletionPresetByName === "function") {
      const preset = pm.getCompletionPresetByName(name);
      if (preset) return structuredClone(preset);
    }
    if (typeof pm.getPresetList === "function") {
      const { presets, preset_names } = pm.getPresetList.call(pm);
      let found;
      if (Array.isArray(preset_names)) {
        const idx = preset_names.indexOf(name);
        if (idx >= 0) found = presets[idx];
      } else if (preset_names && typeof preset_names === "object") {
        if (preset_names[name] !== undefined)
          found = presets[preset_names[name]];
      }
      if (found) return structuredClone(found);
    }
    return null;
  }

  function createPresetDetailApi() {
    return createPresetDetailApiCore({
      $,
      cfmConfirm,
      cfmToastr,
      console,
      ensureCurrentAppliedPreset,
      ensurePresetPromptList,
      ensurePresetPromptOrderContainers,
      ensureSettings,
      escapeHtml,
      extensionName,
      extensionSettings: extension_settings,
      findPresetPromptOrderEntryLocation,
      flashDraggedElement,
      getAllPresetPromptOrderContainers,
      getAllPresetPromptOrderEntries,
      getContext,
      getPresetDataForRename,
      getPresetPromptByKey,
      getPresetPromptIdentifier,
      getPresetPromptIndexByKey,
      getPresetPromptLabel,
      getPresetPromptMap,
      getPresetPromptOrderContainer,
      getPresetPromptOrderEntries,
      getPresetPromptOrderIdentifier,
      getPresetPromptText,
      buildDuplicatedPresetPromptKey,
      buildDuplicatedPresetPromptLabel,
      isCurrentAppliedPreset,
      normalizePresetPromptOrderItemKeyFields,
      refreshPresetPanelView,
      sanitizePresetPromptStructure,
      saveNormalizedPresetData,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      structuredClone: (value) => structuredClone(value),
      state: {
        get cfmPresetDetailBatchMode() {
          return cfmPresetDetailBatchMode;
        },
        set cfmPresetDetailBatchMode(value) {
          cfmPresetDetailBatchMode = value;
        },
        get cfmPresetDetailBatchOwnerName() {
          return cfmPresetDetailBatchOwnerName;
        },
        set cfmPresetDetailBatchOwnerName(value) {
          cfmPresetDetailBatchOwnerName = value;
        },
        get cfmPresetDetailBatchSelected() {
          return cfmPresetDetailBatchSelected;
        },
        set cfmPresetDetailBatchSelected(value) {
          cfmPresetDetailBatchSelected = value;
        },
        get cfmPresetDetailBatchRangeMode() {
          return cfmPresetDetailBatchRangeMode;
        },
        set cfmPresetDetailBatchRangeMode(value) {
          cfmPresetDetailBatchRangeMode = value;
        },
        get cfmPresetDetailBatchLastClicked() {
          return cfmPresetDetailBatchLastClicked;
        },
        set cfmPresetDetailBatchLastClicked(value) {
          cfmPresetDetailBatchLastClicked = value;
        },
      },
    });
  }

  function getPresetDataForDetail(pm, name) {
    return createPresetDetailApi().getPresetDataForDetail(pm, name);
  }

  const PRESET_PROMPT_ORDER_DUMMY_ID =
    presetPromptsCore.PRESET_PROMPT_ORDER_DUMMY_ID;

  function getPresetPromptIdentifier(prompt) {
    return presetPromptsCore.getPresetPromptIdentifier(prompt);
  }

  function getPresetPromptText(promptValue) {
    return presetPromptsCore.getPresetPromptText(promptValue);
  }

  function getPresetPromptLabel(promptValue, fallback = "") {
    return presetPromptsCore.getPresetPromptLabel(promptValue, fallback);
  }

  function ensurePresetPromptList(presetData) {
    return presetPromptsCore.ensurePresetPromptList(presetData);
  }

  function normalizePresetPromptOrderItem(item) {
    return presetPromptsCore.normalizePresetPromptOrderItem(item);
  }

  function sanitizePresetPromptOrderEntries(
    orderEntries,
    validIdentifierSet = null,
  ) {
    return presetPromptsCore.sanitizePresetPromptOrderEntries(
      orderEntries,
      validIdentifierSet,
    );
  }

  function ensurePresetPromptOrderContainers(presetData) {
    return presetPromptsCore.ensurePresetPromptOrderContainers(presetData);
  }

  function sanitizePresetPromptStructure(presetData) {
    return presetPromptsCore.sanitizePresetPromptStructure(presetData);
  }

  function getAllPresetPromptOrderContainers(presetData, create = false) {
    return presetPromptsCore.getAllPresetPromptOrderContainers(
      presetData,
      create,
    );
  }

  function getPresetPromptOrderContainer(presetData, create = false) {
    return presetPromptsCore.getPresetPromptOrderContainer(presetData, create);
  }

  function getPresetPromptOrderEntries(presetData, create = false) {
    return presetPromptsCore.getPresetPromptOrderEntries(presetData, create);
  }

  function getAllPresetPromptOrderEntries(presetData) {
    return presetPromptsCore.getAllPresetPromptOrderEntries(presetData);
  }

  function findPresetPromptOrderEntryLocation(
    presetData,
    promptKey,
    create = false,
  ) {
    return presetPromptsCore.findPresetPromptOrderEntryLocation(
      presetData,
      promptKey,
      create,
    );
  }

  function getPresetPromptMap(presetData) {
    return presetPromptsCore.getPresetPromptMap(presetData);
  }

  function getPresetPromptByKey(presetData, promptKey) {
    return presetPromptsCore.getPresetPromptByKey(presetData, promptKey);
  }

  function getPresetPromptIndexByKey(presetData, promptKey) {
    return presetPromptsCore.getPresetPromptIndexByKey(presetData, promptKey);
  }

  function getPresetDetailFields(preset) {
    return createPresetDetailApi().getPresetDetailFields(preset);
  }

  function getPresetFieldCurrentValue(preset, fieldKey) {
    if (!preset || !fieldKey) return "";
    if (fieldKey.startsWith("prompts.")) {
      const promptKey = fieldKey.slice("prompts.".length);
      return getPresetPromptText(getPresetPromptByKey(preset, promptKey));
    }
    return String(preset[fieldKey] ?? "");
  }

  function setPresetPromptEnabled(presetData, promptKey, enabled) {
    return createPresetDetailApi().setPresetPromptEnabled(
      presetData,
      promptKey,
      enabled,
    );
  }

  function syncCurrentPresetSelection(pm, presetName, preservedValue = null) {
    try {
      if (!pm?.select) return;
      const effectiveValue =
        preservedValue !== undefined && preservedValue !== null
          ? preservedValue
          : pm.select.val();
      const currentPreset = getCurrentPresets().find(
        (p) => String(p.value) === String(effectiveValue),
      );
      if (currentPreset?.name === presetName) {
        pm.select.val(effectiveValue).trigger("change");
      }
    } catch (e) {
      console.warn("[CFM] 同步当前预设状态失败", e);
    }
  }

  function sanitizeCurrentOpenAIPresetRuntimeState(save = false) {
    try {
      const context = getContext();
      const pm = context?.getPresetManager?.();
      if (!pm || String(pm.apiId || "") !== "openai") return false;

      const presetList =
        typeof pm.getPresetList === "function"
          ? pm.getPresetList.call(pm)
          : null;
      const runtimeSettings = presetList?.settings;
      if (!runtimeSettings || typeof runtimeSettings !== "object") return false;

      const beforeState = JSON.stringify({
        prompts: runtimeSettings.prompts ?? null,
        prompt_order: runtimeSettings.prompt_order ?? null,
      });

      sanitizePresetPromptStructure(runtimeSettings);

      const afterState = JSON.stringify({
        prompts: runtimeSettings.prompts ?? null,
        prompt_order: runtimeSettings.prompt_order ?? null,
      });
      const changed = beforeState !== afterState;

      if (
        changed &&
        save &&
        typeof context.saveSettingsDebounced === "function"
      ) {
        context.saveSettingsDebounced();
      }

      return changed;
    } catch (error) {
      console.warn("[CFM] 清理当前 OpenAI 运行时预设状态失败", error);
      return false;
    }
  }

  async function saveNormalizedPresetData(pm, presetName, presetData) {
    sanitizePresetPromptStructure(presetData);

    const preservedSelectValue = pm?.select?.val();
    const preservedPreset = getCurrentPresets().find(
      (p) => String(p.value) === String(preservedSelectValue),
    );
    const preservedPresetName = String(preservedPreset?.name || "").trim();
    const isCurrentPreset = preservedPresetName === presetName;

    if (isCurrentPreset) {
      // 当前预设：正常保存并触发 updateList（含 change 事件）
      await pm.savePreset(presetName, presetData);

      // 当前应用预设的详情视图会优先读取运行时 settings。
      // 排序、复制、删除等结构性修改保存到文件后，如果不立即同步运行时对象，
      // 刷新插件面板时会重新读到旧的 prompts / prompt_order，表现为按钮有反馈但无变化。
      try {
        const presetList =
          typeof pm.getPresetList === "function"
            ? pm.getPresetList.call(pm)
            : null;
        const runtimeSettings = presetList?.settings;
        if (runtimeSettings && typeof runtimeSettings === "object") {
          if (Array.isArray(presetData.prompts)) {
            runtimeSettings.prompts = structuredClone(presetData.prompts);
          }
          if (Array.isArray(presetData.prompt_order)) {
            runtimeSettings.prompt_order = structuredClone(
              presetData.prompt_order,
            );
          }
        }
      } catch (e) {
        console.warn("[CFM] 同步当前预设运行时详情数据失败", e);
      }

      if (
        pm?.select &&
        preservedSelectValue !== undefined &&
        preservedSelectValue !== null &&
        String(preservedSelectValue) !== "" &&
        String(pm.select.val()) !== String(preservedSelectValue)
      ) {
        pm.select.val(preservedSelectValue);
      }

      syncCurrentPresetSelection(pm, preservedPresetName, preservedSelectValue);
    } else {
      // 非当前预设：使用 skipUpdate 避免触发 PRESET_CHANGED 事件，
      // 然后手动更新内存中的预设数据
      await pm.savePreset(presetName, presetData, { skipUpdate: true });

      // 手动更新内存中的预设列表数据
      try {
        const presetList =
          typeof pm.getPresetList === "function"
            ? pm.getPresetList.call(pm)
            : null;
        if (presetList) {
          const { presets, preset_names } = presetList;
          if (Array.isArray(presets) && preset_names) {
            const isKeyed = Array.isArray(preset_names);
            if (isKeyed) {
              const idx = preset_names.indexOf(presetName);
              if (idx >= 0) presets[idx] = presetData;
            } else {
              const val = preset_names[presetName];
              if (val !== undefined) presets[val] = presetData;
            }
          }
        }
      } catch (e) {
        console.warn("[CFM] 手动更新非当前预设内存数据失败", e);
      }
    }
    sanitizeCurrentOpenAIPresetRuntimeState(true);
  }

  async function duplicatePreset(sourcePreset) {
    const sourceName = String(sourcePreset?.name || "").trim();
    if (!sourceName) return;
    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("无法获取预设管理器");
      return;
    }

    const presetData = getPresetDataForDetail(pm, sourceName);
    if (!presetData) {
      cfmToastr.error(`找不到预设「${sourceName}」的数据`);
      return;
    }

    const newPresetName = buildDuplicatedPresetName(sourceName);
    const sourceValue =
      sourcePreset?.value ??
      getCurrentPresets().find((preset) => preset.name === sourceName)?.value ??
      pm.select?.val();

    try {
      const duplicatedPresetData = sanitizePresetPromptStructure(
        structuredClone(presetData),
      );
      await pm.savePreset(newPresetName, duplicatedPresetData);
      const groups = extension_settings[extensionName].presetGroups;
      if (groups && groups[sourceName]) {
        groups[newPresetName] = groups[sourceName];
      }
      const notes = extension_settings[extensionName].presetNotes;
      if (notes && notes[sourceName] !== undefined) {
        notes[newPresetName] = notes[sourceName];
      }
      insertPresetAfterInCustomOrder(sourceName, newPresetName);
      if (pm?.select) {
        const restoreValue =
          sourceValue ??
          getCurrentPresets().find((preset) => preset.name === sourceName)
            ?.value;
        if (
          restoreValue !== undefined &&
          restoreValue !== null &&
          String(restoreValue) !== ""
        ) {
          pm.select.val(restoreValue).trigger("change");
        } else {
          syncCurrentPresetSelection(pm, sourceName);
        }
      }
      refreshPresetPanelView();
      cfmToastr.success(`已复制预设「${sourceName}」`);
    } catch (error) {
      console.error("[CFM] 复制预设失败:", error);
      cfmToastr.error(`复制失败: ${error.message || error}`);
    }
  }

  async function deleteSinglePreset(presetName) {
    const name = String(presetName || "").trim();
    if (!name) return;
    if (!cfmConfirm(`确定删除预设「${name}」？`)) return;

    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("预设管理器不可用");
      return;
    }

    try {
      const ok = await pm.deletePreset(name);
      if (ok === false) {
        cfmToastr.error(`删除预设「${name}」失败`);
        return;
      }
      const groups = extension_settings[extensionName].presetGroups;
      if (groups && groups[name]) delete groups[name];
      const notes = extension_settings[extensionName].presetNotes;
      if (notes && notes[name] !== undefined) delete notes[name];
      removePresetFromCustomOrder(name);
      cfmPresetDetailExpandedNames.delete(name);
      cfmPresetRegexExpandedNames.delete(name);
      if (_presetDetachedOptions && _presetDetachedOptions.length > 0) {
        _presetDetachedOptions = _presetDetachedOptions.filter(
          (opt) => $(opt).text() !== name,
        );
      }
      getContext().saveSettingsDebounced();
      refreshPresetPanelView();
      cfmToastr.success(`已删除预设「${name}」`);
    } catch (error) {
      console.error("[CFM] 删除预设失败:", error);
      cfmToastr.error(`删除失败: ${error.message || error}`);
    }
  }

  async function togglePresetDetailFieldActivation(
    presetName,
    fieldKey,
    activate,
  ) {
    return await createPresetDetailApi().togglePresetDetailFieldActivation(
      presetName,
      fieldKey,
      activate,
    );
  }

  function togglePresetDetailBatchItem(fieldKey, shiftKey, fields) {
    return createPresetDetailApi().togglePresetDetailBatchItem(
      fieldKey,
      shiftKey,
      fields,
    );
  }

  async function applyPresetDetailBatchActivation(
    presetName,
    fieldKeys,
    activate,
  ) {
    return await createPresetDetailApi().applyPresetDetailBatchActivation(
      presetName,
      fieldKeys,
      activate,
    );
  }

  let _worldInfoEntriesApi = null;
  function getWorldInfoEntriesApi() {
    if (!_worldInfoEntriesApi) {
      _worldInfoEntriesApi = createWorldInfoEntriesApiCore({
        $,
        fetch: window.fetch.bind(window),
        getContext,
        extensionSettings: extension_settings,
        extensionName,
        ensureResourceSettings,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        executeWorldInfoSearch,
        renderWorldInfoView,
        cfmConfirm,
        cfmToastr,
        showBatchProgressOverlay,
        console,
        state: {
          get cfmWorldInfoEntryOpenDetails() {
            return cfmWorldInfoEntryOpenDetails;
          },
          set cfmWorldInfoEntryOpenDetails(value) {
            cfmWorldInfoEntryOpenDetails = value;
          },
          get cfmWorldInfoEntryBatchRangeMode() {
            return cfmWorldInfoEntryBatchRangeMode;
          },
          set cfmWorldInfoEntryBatchRangeMode(value) {
            cfmWorldInfoEntryBatchRangeMode = value;
          },
          get cfmWorldInfoEntryBatchLastClicked() {
            return cfmWorldInfoEntryBatchLastClicked;
          },
          set cfmWorldInfoEntryBatchLastClicked(value) {
            cfmWorldInfoEntryBatchLastClicked = value;
          },
          get cfmWorldInfoEntryBatchSelected() {
            return cfmWorldInfoEntryBatchSelected;
          },
          set cfmWorldInfoEntryBatchSelected(value) {
            cfmWorldInfoEntryBatchSelected = value;
          },
        },
      });
    }
    return _worldInfoEntriesApi;
  }

  function refreshWorldInfoPanelView() {
    return getWorldInfoEntriesApi().refreshWorldInfoPanelView();
  }

  function getWorldInfoEntrySelectionKey(bookName, uid) {
    return getWorldInfoEntriesApi().getWorldInfoEntrySelectionKey(
      bookName,
      uid,
    );
  }

  function getWorldInfoEntryOpenSet(bookName, create = false) {
    return getWorldInfoEntriesApi().getWorldInfoEntryOpenSet(bookName, create);
  }

  function isWorldInfoEntryDetailOpen(bookName, uid) {
    return getWorldInfoEntriesApi().isWorldInfoEntryDetailOpen(bookName, uid);
  }

  function toggleWorldInfoEntryDetail(bookName, uid) {
    return getWorldInfoEntriesApi().toggleWorldInfoEntryDetail(bookName, uid);
  }

  function collapseWorldInfoEntryDetails(bookName = null) {
    return getWorldInfoEntriesApi().collapseWorldInfoEntryDetails(bookName);
  }

  async function fetchWorldInfoDetailData(bookName) {
    return await getWorldInfoEntriesApi().fetchWorldInfoDetailData(bookName);
  }

  async function saveWorldInfoDetailData(bookName, worldInfoData) {
    return await getWorldInfoEntriesApi().saveWorldInfoDetailData(
      bookName,
      worldInfoData,
    );
  }

  function getWorldInfoEntryDetailSortMode() {
    return getWorldInfoEntriesApi().getWorldInfoEntryDetailSortMode();
  }

  function setWorldInfoEntryDetailSortMode(mode) {
    return getWorldInfoEntriesApi().setWorldInfoEntryDetailSortMode(mode);
  }

  function sortWorldInfoEntriesForDetail(entries, sortMode = "custom") {
    return getWorldInfoEntriesApi().sortWorldInfoEntriesForDetail(
      entries,
      sortMode,
    );
  }

  function getWorldInfoEntriesForDetail(
    bookName,
    worldInfoData,
    sortMode = "custom",
  ) {
    return getWorldInfoEntriesApi().getWorldInfoEntriesForDetail(
      bookName,
      worldInfoData,
      sortMode,
    );
  }

  function toggleWorldInfoEntryBatchItem(bookName, uid, shiftKey, entries) {
    return getWorldInfoEntriesApi().toggleWorldInfoEntryBatchItem(
      bookName,
      uid,
      shiftKey,
      entries,
    );
  }

  async function toggleWorldInfoEntryActivation(bookName, uid, activate) {
    return await getWorldInfoEntriesApi().toggleWorldInfoEntryActivation(
      bookName,
      uid,
      activate,
    );
  }

  async function duplicateWorldInfoEntryInBook(bookName, uid) {
    return await getWorldInfoEntriesApi().duplicateWorldInfoEntryInBook(
      bookName,
      uid,
    );
  }

  async function deleteWorldInfoEntryInBook(bookName, uid, options) {
    return await getWorldInfoEntriesApi().deleteWorldInfoEntryInBook(
      bookName,
      uid,
      options,
    );
  }

  async function batchDuplicateWorldInfoEntries(bookName, selectionKeys) {
    return await getWorldInfoEntriesApi().batchDuplicateWorldInfoEntries(
      bookName,
      selectionKeys,
    );
  }

  async function batchDeleteWorldInfoEntries(bookName, selectionKeys) {
    return await getWorldInfoEntriesApi().batchDeleteWorldInfoEntries(
      bookName,
      selectionKeys,
    );
  }

  async function moveWorldInfoEntriesToIndex(bookName, selectionKeys, targetIndex) {
    return await getWorldInfoEntriesApi().moveWorldInfoEntriesToIndex(
      bookName,
      selectionKeys,
      targetIndex,
    );
  }

  async function applyWorldInfoEntryBatchActivation(
    bookName,
    selectionKeys,
    activate,
  ) {
    return await getWorldInfoEntriesApi().applyWorldInfoEntryBatchActivation(
      bookName,
      selectionKeys,
      activate,
    );
  }

  let _presetDetailApi = null;
  function getPresetDetailApi() {
    if (!_presetDetailApi) {
      // 与 createPresetDetailApi()（完整 deps）保持一致，避免两份 deps 漂移
      _presetDetailApi = createPresetDetailApi();
    }
    return _presetDetailApi;
  }

  function getPresetDetailActivePresets(presetName) {
    return getPresetDetailApi().getPresetDetailActivePresets(presetName);
  }

  function getPresetDetailAppliedPresetIndices(presetName) {
    return getPresetDetailApi().getPresetDetailAppliedPresetIndices(presetName);
  }

  function setPresetDetailAppliedPresetIndices(presetName, indices) {
    return getPresetDetailApi().setPresetDetailAppliedPresetIndices(
      presetName,
      indices,
    );
  }

  function normalizePresetDetailFieldKeys(fieldKeys) {
    return getPresetDetailApi().normalizePresetDetailFieldKeys(fieldKeys);
  }

  function getAvailablePresetDetailFieldKeySet(presetData) {
    return getPresetDetailApi().getAvailablePresetDetailFieldKeySet(presetData);
  }

  function sanitizePresetDetailGroupState(
    presetName,
    presetData,
    save = false,
  ) {
    return getPresetDetailApi().sanitizePresetDetailGroupState(
      presetName,
      presetData,
      save,
    );
  }

  function savePresetDetailActivePreset(presetName, name, fieldKeys) {
    return getPresetDetailApi().savePresetDetailActivePreset(
      presetName,
      name,
      fieldKeys,
    );
  }

  function deletePresetDetailActivePreset(presetName, name) {
    return getPresetDetailApi().deletePresetDetailActivePreset(
      presetName,
      name,
    );
  }

  function renamePresetDetailActivePreset(presetName, oldName, newName) {
    return getPresetDetailApi().renamePresetDetailActivePreset(
      presetName,
      oldName,
      newName,
    );
  }

  function getEnabledPresetDetailFieldKeys(presetData) {
    return getPresetDetailApi().getEnabledPresetDetailFieldKeys(presetData);
  }

  function setPresetDetailFieldsEnabled(presetData, fieldKeys, enabled) {
    return getPresetDetailApi().setPresetDetailFieldsEnabled(
      presetData,
      fieldKeys,
      enabled,
    );
  }

  async function showPresetDetailGroupPanel(presetName) {
    if ($("#cfm-preset-detail-group-panel-overlay").length > 0) return;
    if (!ensureCurrentAppliedPreset(presetName, "预设分组")) return;

    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("无法获取预设管理器");
      return;
    }
    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }
    const ensureCurrent = () =>
      ensureCurrentAppliedPreset(presetName, "预设分组");

    const fields = getPresetDetailFields(presetData).filter((field) =>
      String(field?.key || "").startsWith("prompts."),
    );
    const enabledIds = getEnabledPresetDetailFieldKeys(presetData);
    const { presets } = sanitizePresetDetailGroupState(
      presetName,
      presetData,
      true,
    );
    const enabledSet = new Set(enabledIds);
    let matchedPresetName = null;
    for (const p of presets) {
      const presetFields = normalizePresetDetailFieldKeys(p.fields);
      if (
        presetFields.length === enabledIds.length &&
        presetFields.every((fieldKey) => enabledSet.has(fieldKey))
      ) {
        matchedPresetName = p.name;
        break;
      }
    }

    const presetsHtml =
      presets.length === 0
        ? `<div class="cfm-wi-preset-empty">暂无已保存的分组</div>`
        : presets
            .map((p, idx) => {
              const presetFields = normalizePresetDetailFieldKeys(p.fields);
              return `
        <div class="cfm-wi-preset-item" data-preset-idx="${idx}">
          <div class="cfm-wi-preset-item-left">
            <span class="cfm-wi-preset-item-name"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(p.name || "未命名分组")}</span>
            <span class="cfm-wi-preset-item-count">${presetFields.length} 个</span>
          </div>
          <span class="cfm-wi-preset-item-actions">
            <i class="fa-solid fa-play cfm-wi-preset-apply" title="应用分组"></i>
            <i class="fa-solid fa-stop cfm-wi-preset-unapply" title="取消应用"></i>
            <i class="fa-solid fa-pen cfm-wi-preset-edit" title="编辑"></i>
            <i class="fa-solid fa-trash cfm-wi-preset-del" title="删除"></i>
          </span>
        </div>
      `;
            })
            .join("");

    const overlay = $(`
      <div class="cfm-edit-popup-overlay" id="cfm-preset-detail-group-panel-overlay">
        <div class="cfm-edit-popup cfm-wi-preset-panel">
          <div class="cfm-edit-popup-title"><i class="fa-solid fa-layer-group" style="margin-right:6px;"></i>预设条目激活分组</div>
          <div class="cfm-edit-popup-names"><div class="cfm-edit-name-item">${escapeHtml(presetName)}</div></div>
          <div class="cfm-wi-preset-save-section">
            <div class="cfm-wi-preset-save-row">
              <input type="text" class="cfm-edit-input" id="cfm-preset-detail-group-name-input" placeholder="输入分组名称，保存当前激活的 ${enabledIds.length} 个预设条目">
              <button class="cfm-edit-popup-confirm" id="cfm-preset-detail-group-save-confirm" ${enabledIds.length === 0 ? "disabled" : ""}><i class="fa-solid fa-floppy-disk"></i> 保存</button>
            </div>
            ${enabledIds.length === 0 ? '<div class="cfm-wi-preset-save-hint">当前没有激活的预设条目可保存</div>' : ""}
            ${matchedPresetName ? `<div class="cfm-wi-preset-save-hint" style="color:#f9e2af;">当前激活组合与已有分组「${escapeHtml(matchedPresetName)}」相同</div>` : ""}
          </div>
          <div class="cfm-wi-preset-divider"></div>
          <div class="cfm-wi-preset-list-section">
            <div class="cfm-wi-preset-list-title">已保存的分组</div>
            <div class="cfm-wi-preset-list">${presetsHtml}</div>
          </div>
          <div class="cfm-edit-popup-actions">
            <button class="cfm-edit-popup-cancel">关闭</button>
          </div>
        </div>
      </div>
    `);
    $("body").append(overlay);
    overlay.find("#cfm-preset-detail-group-name-input").focus();

    overlay.find(".cfm-edit-popup-cancel").on("click", () => overlay.remove());
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) overlay.remove();
    });

    overlay.find("#cfm-preset-detail-group-name-input").on("keydown", (e) => {
      if (e.key === "Enter")
        overlay.find("#cfm-preset-detail-group-save-confirm").trigger("click");
      if (e.key === "Escape") overlay.remove();
    });
    overlay.find("#cfm-preset-detail-group-save-confirm").on("click", () => {
      if (!ensureCurrent()) return;
      if (enabledIds.length === 0) return;
      const name = overlay
        .find("#cfm-preset-detail-group-name-input")
        .val()
        .trim();
      if (!name) {
        cfmToastr.warning("请输入分组名称");
        return;
      }
      const existing = getPresetDetailActivePresets(presetName).find(
        (p) => p.name === name,
      );
      if (existing) {
        if (!cfmConfirm(`分组「${name}」已存在，是否覆盖？`)) return;
      }
      savePresetDetailActivePreset(presetName, name, enabledIds);
      cfmToastr.success(
        `已保存激活分组「${name}」（${enabledIds.length} 个预设条目）`,
      );
      overlay.remove();
    });

    overlay.find(".cfm-wi-preset-apply").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!ensureCurrent()) return;
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getPresetDetailActivePresets(presetName);
      const preset = currentPresets[idx];
      if (!preset) {
        cfmToastr.error("分组不存在");
        return;
      }
      try {
        const applied = getPresetDetailAppliedPresetIndices(presetName);
        const otherApplied = applied.filter(
          (i) => i !== idx && currentPresets[i],
        );

        let mode = "stack";
        if (otherApplied.length > 0) {
          const otherNames = otherApplied
            .map((i) => currentPresets[i].name)
            .join("、");
          const choice = await createChoiceDialog({
            title: "应用方式",
            message: `当前已有分组「${escapeHtml(otherNames)}」处于应用状态。<br>请选择应用方式：`,
            choices: [
              {
                value: "cancel",
                label: "取消",
                className: "cfm-edit-popup-cancel",
              },
              {
                value: "replace",
                label: "替换",
                className: "cfm-edit-popup-confirm",
                style: "background:#f38ba8;",
              },
              {
                value: "stack",
                label: "叠加",
                className: "cfm-edit-popup-confirm",
              },
            ],
          });
          if (choice === "cancel") return;
          mode = choice;
        }

        const latestPresetData = getPresetDataForDetail(pm, presetName);
        if (!latestPresetData) {
          cfmToastr.error(`找不到预设「${presetName}」的数据`);
          return;
        }

        const presetFields = normalizePresetDetailFieldKeys(preset.fields);
        if (mode === "replace") {
          const keepFields = new Set(presetFields);
          for (const oi of otherApplied) {
            const otherFields = normalizePresetDetailFieldKeys(
              currentPresets[oi]?.fields,
            );
            for (const fieldKey of otherFields) {
              if (!keepFields.has(fieldKey)) {
                setPresetDetailFieldsEnabled(
                  latestPresetData,
                  [fieldKey],
                  false,
                );
              }
            }
          }
        }

        setPresetDetailFieldsEnabled(latestPresetData, presetFields, true);
        await saveNormalizedPresetData(pm, presetName, latestPresetData);

        const newApplied =
          mode === "replace"
            ? [idx]
            : [...otherApplied.filter((i) => i !== idx), idx];
        setPresetDetailAppliedPresetIndices(presetName, newApplied);

        cfmToastr.success(
          `已${mode === "replace" ? "替换" : "叠加"}应用分组「${preset.name}」`,
        );
        overlay.remove();
        refreshPresetPanelView();
      } catch (err) {
        console.error("[CFM] 应用预设详情分组失败", err);
        cfmToastr.error("应用分组失败");
      }
    });

    overlay.find(".cfm-wi-preset-unapply").on("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!ensureCurrent()) return;
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getPresetDetailActivePresets(presetName);
      const preset = currentPresets[idx];
      if (!preset) {
        cfmToastr.error("分组不存在");
        return;
      }
      try {
        const applied = getPresetDetailAppliedPresetIndices(presetName);
        if (!applied.includes(idx)) {
          cfmToastr.warning(`分组「${preset.name}」当前未处于应用状态`);
          return;
        }
        const otherApplied = applied.filter(
          (i) => i !== idx && currentPresets[i],
        );
        const otherFields = new Set();
        for (const oi of otherApplied) {
          for (const fieldKey of normalizePresetDetailFieldKeys(
            currentPresets[oi]?.fields,
          )) {
            otherFields.add(fieldKey);
          }
        }

        const latestPresetData = getPresetDataForDetail(pm, presetName);
        if (!latestPresetData) {
          cfmToastr.error(`找不到预设「${presetName}」的数据`);
          return;
        }

        let removedCount = 0;
        for (const fieldKey of normalizePresetDetailFieldKeys(preset.fields)) {
          if (!otherFields.has(fieldKey)) {
            removedCount += setPresetDetailFieldsEnabled(
              latestPresetData,
              [fieldKey],
              false,
            );
          }
        }

        await saveNormalizedPresetData(pm, presetName, latestPresetData);
        setPresetDetailAppliedPresetIndices(presetName, otherApplied);

        cfmToastr.success(
          `已取消应用分组「${preset.name}」（取消激活 ${removedCount} 个独占预设条目）`,
        );
        overlay.remove();
        refreshPresetPanelView();
      } catch (err) {
        console.error("[CFM] 取消应用预设详情分组失败", err);
        cfmToastr.error("取消应用分组失败");
      }
    });

    overlay.find(".cfm-wi-preset-edit").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!ensureCurrent()) return;
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getPresetDetailActivePresets(presetName);
      const preset = currentPresets[idx];
      if (!preset) return;
      overlay.remove();
      showPresetDetailGroupEditPopup(presetName, preset);
    });

    overlay.find(".cfm-wi-preset-del").on("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!ensureCurrent()) return;
      const idx = parseInt(
        $(this).closest(".cfm-wi-preset-item").attr("data-preset-idx"),
        10,
      );
      const currentPresets = getPresetDetailActivePresets(presetName);
      const preset = currentPresets[idx];
      if (!preset) return;
      if (!cfmConfirm(`确定删除激活分组「${preset.name}」？`)) return;
      const applied = getPresetDetailAppliedPresetIndices(presetName);
      if (applied.includes(idx)) {
        setPresetDetailAppliedPresetIndices(
          presetName,
          applied.filter((i) => i !== idx),
        );
      }
      deletePresetDetailActivePreset(presetName, preset.name);
      cfmToastr.success(`已删除激活分组「${preset.name}」`);
      overlay.remove();
      showPresetDetailGroupPanel(presetName);
    });
  }

  let _presetDetailSublistApi = null;
  function getPresetDetailSublistApi() {
    if (!_presetDetailSublistApi) {
      _presetDetailSublistApi = createPresetDetailSublistApi({
        $,
        applyPresetDetailBatchActivation,
        batchDeletePresetDetailFields,
        cfmIsTouchDevice,
        cfmToastr,
        deletePresetDetailActivePreset,
        deletePresetDetailField,
        duplicatePresetDetailField,
        editPresetDetailField,
        ensureCurrentAppliedPreset,
        escapeHtml,
        flashDraggedElement,
        getContext,
        getEntryTransferInsertItems,
        getPresetDataForDetail,
        getPresetDetailActivePresets,
        getPresetDetailFields,
        isCurrentAppliedPreset,
        movePresetDetailFieldByStep,
        movePresetDetailFieldsToIndex,
        normalizePresetDetailFieldKeys,
        openEntryTransferInsertDialog,
        recordTouchTapStart,
        refreshPresetPanelView,
        renamePresetDetailActivePreset,
        savePresetDetailActivePreset,
        savePresetDetailPromptOrder,
        setPresetDetailAppliedPresetIndices,
        shouldIgnoreTouchTapAfterMove,
        showEntryTransferPopup,
        showPresetDetailGroupPanel,
        togglePresetDetailBatchItem,
        togglePresetDetailFieldActivation,
        state: {
          get cfmPresetDetailBatchMode() {
            return cfmPresetDetailBatchMode;
          },
          set cfmPresetDetailBatchMode(value) {
            cfmPresetDetailBatchMode = value;
          },
          get cfmPresetDetailBatchOwnerName() {
            return cfmPresetDetailBatchOwnerName;
          },
          set cfmPresetDetailBatchOwnerName(value) {
            cfmPresetDetailBatchOwnerName = value;
          },
          get cfmPresetDetailBatchSelected() {
            return cfmPresetDetailBatchSelected;
          },
          set cfmPresetDetailBatchSelected(value) {
            cfmPresetDetailBatchSelected = value;
          },
          get cfmPresetDetailBatchRangeMode() {
            return cfmPresetDetailBatchRangeMode;
          },
          set cfmPresetDetailBatchRangeMode(value) {
            cfmPresetDetailBatchRangeMode = value;
          },
          get cfmPresetDetailBatchLastClicked() {
            return cfmPresetDetailBatchLastClicked;
          },
          set cfmPresetDetailBatchLastClicked(value) {
            cfmPresetDetailBatchLastClicked = value;
          },
        },
      });
    }
    return _presetDetailSublistApi;
  }

  function showPresetDetailGroupEditPopup(presetName, preset) {
    return getPresetDetailSublistApi().showPresetDetailGroupEditPopup(
      presetName,
      preset,
    );
  }

  async function showPresetDetailFieldPopup(presetName, field) {
    return await getPresetDetailApi().showPresetDetailFieldPopup(
      presetName,
      field,
    );
  }

  function getPresetPromptOrderIdentifier(item) {
    return presetPromptsCore.getPresetPromptOrderIdentifier(item);
  }

  function buildDuplicatedPresetPromptKey(existingPromptIds, sourcePromptKey) {
    return presetPromptsCore.buildDuplicatedPresetPromptKey(
      existingPromptIds,
      sourcePromptKey,
    );
  }

  function buildDuplicatedPresetPromptLabel(existingLabels, sourceLabel) {
    return presetPromptsCore.buildDuplicatedPresetPromptLabel(
      existingLabels,
      sourceLabel,
    );
  }

  function normalizePresetPromptOrderItemKeyFields(item, promptKey) {
    return presetPromptsCore.normalizePresetPromptOrderItemKeyFields(
      item,
      promptKey,
    );
  }

  async function savePresetDetailPromptOrder(presetName, orderedFieldKeys) {
    return await createPresetDetailApi().savePresetDetailPromptOrder(
      presetName,
      orderedFieldKeys,
    );
  }

  async function reorderPresetDetailField(
    presetName,
    sourceFieldKey,
    targetFieldKey,
  ) {
    return await createPresetDetailApi().reorderPresetDetailField(
      presetName,
      sourceFieldKey,
      targetFieldKey,
    );
  }

  async function movePresetDetailFieldByStep(presetName, fieldKey, step) {
    return await createPresetDetailApi().movePresetDetailFieldByStep(
      presetName,
      fieldKey,
      step,
    );
  }

  async function duplicatePresetDetailField(presetName, fieldKey) {
    return await createPresetDetailApi().duplicatePresetDetailField(
      presetName,
      fieldKey,
    );
  }

  async function deletePresetDetailField(presetName, fieldKey) {
    return await createPresetDetailApi().deletePresetDetailField(
      presetName,
      fieldKey,
    );
  }

  async function batchDeletePresetDetailFields(presetName, fieldKeys, silent) {
    return await createPresetDetailApi().batchDeletePresetDetailFields(
      presetName,
      fieldKeys,
      silent,
    );
  }

  async function movePresetDetailFieldsToIndex(presetName, fieldKeys, targetIndex) {
    return await createPresetDetailApi().movePresetDetailFieldsToIndex(
      presetName,
      fieldKeys,
      targetIndex,
    );
  }

  function findNativePresetPromptRow(promptKey, promptLabel = "") {
    const normalizedPromptKey = String(promptKey || "").trim();
    const normalizedPromptLabel = String(promptLabel || "").trim();
    const rows = $(
      "#completion_prompt_manager .completion_prompt_manager_prompt",
    );
    if (!rows.length) return $();

    const getRowMeta = (rowEl) => {
      const row = $(rowEl);
      const nameEl = row.find(".completion_prompt_manager_prompt_name").first();
      return {
        row,
        identifier: String(row.attr("data-pm-identifier") || "").trim(),
        dataName: String(nameEl.attr("data-pm-name") || "").trim(),
        visibleName: String(nameEl.text() || "")
          .replace(/\s+/g, " ")
          .trim(),
        rowText: String(row.text() || "")
          .replace(/\s+/g, " ")
          .trim(),
      };
    };

    const metas = rows.toArray().map(getRowMeta);

    if (normalizedPromptKey) {
      const exactKeyMatch = metas.find(
        (meta) => meta.identifier === normalizedPromptKey,
      );
      if (exactKeyMatch) return exactKeyMatch.row;
    }

    if (normalizedPromptLabel) {
      const exactDataNameMatch = metas.find(
        (meta) => meta.dataName === normalizedPromptLabel,
      );
      if (exactDataNameMatch) return exactDataNameMatch.row;

      const exactVisibleNameMatch = metas.find(
        (meta) => meta.visibleName === normalizedPromptLabel,
      );
      if (exactVisibleNameMatch) return exactVisibleNameMatch.row;
    }

    return $();
  }

  function findPresetSelectValueByName(pm, presetName) {
    const normalizedPresetName = String(presetName || "").trim();
    if (!pm?.select || !normalizedPresetName) return null;

    const optionPools = [pm.select.find("option").toArray()];
    if (
      Array.isArray(_presetDetachedOptions) &&
      _presetDetachedOptions.length
    ) {
      optionPools.push(_presetDetachedOptions);
    }

    for (const pool of optionPools) {
      for (const option of pool) {
        const $option = $(option);
        const optionText = String($option.text() || "").trim();
        if (optionText === normalizedPresetName) {
          const optionValue = $option.val();
          if (
            optionValue !== undefined &&
            optionValue !== null &&
            optionValue !== ""
          ) {
            return String(optionValue);
          }
        }
      }
    }

    return null;
  }

  /** 清理 bringNativePresetPromptPopupToFront 设置的 inline style（仅 z-index） */
  let _nativePopupCleanupBound = false;
  /** 编辑非当前预设条目时，保存原始预设选择值以便弹窗关闭后恢复 */
  let _presetValueToRestore = null;
  /** 临时静默“切换带正则预设时要求重载聊天”的原生 toast */
  let _suppressPresetRegexToastDepth = 0;
  let _suppressPresetRegexToastUntil = 0;
  let _originalToastrFnsForPresetRegexToast = null;
  let _pendingSuppressPresetRegexToastRestoreTimer = null;
  let _lastPresetRegexToastFingerprint = "";
  let _lastPresetRegexToastAt = 0;
  /** 常驻抑制标志：插件主面板打开期间为 true，命中“正则+重载聊天”toast 一律屏蔽 */
  let _cfmPresetRegexToastPersistentSuppress = false;

  function normalizePresetRegexToastTextPart(value) {
    if (value == null) return "";
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
    if (value instanceof HTMLElement) {
      return String(value.innerText || value.textContent || "");
    }
    if (value?.jquery && typeof value.text === "function") {
      return String(value.text() || "");
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizePresetRegexToastTextPart(item))
        .join(" ");
    }
    if (typeof value === "object") {
      return [
        value.message,
        value.msg,
        value.title,
        value.text,
        value.innerText,
        value.textContent,
      ]
        .map((item) => normalizePresetRegexToastTextPart(item))
        .filter(Boolean)
        .join(" ");
    }
    return "";
  }

  function collectPresetRegexToastText(toastArgs = []) {
    return toastArgs
      .slice(0, 2)
      .map((item) => normalizePresetRegexToastTextPart(item))
      .join(" ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shouldSuppressPresetRegexToast(toastArgs = []) {
    const text = collectPresetRegexToastText(toastArgs);
    if (!text) {
      return false;
    }

    const normalized = text.toLowerCase();
    const hasRegexHint =
      text.includes("正则") ||
      normalized.includes("regex") ||
      text.includes("脚本");
    const hasReloadHint =
      text.includes("重新加载聊天") ||
      text.includes("重载聊天") ||
      text.includes("重新加载") ||
      text.includes("重载") ||
      normalized.includes("reload");

    if (!(hasRegexHint && hasReloadHint)) {
      return false;
    }

    const fingerprint = normalized.replace(/\s+/g, " ").trim();
    const now = Date.now();

    // 相同指纹防抖：2.5 秒内重复的同款 toast 直接屏蔽
    if (
      fingerprint &&
      _lastPresetRegexToastFingerprint === fingerprint &&
      now - _lastPresetRegexToastAt <= 2500
    ) {
      return true;
    }

    // 常驻抑制（插件面板打开期间）：命中即屏蔽，不受临时窗口限制
    if (_cfmPresetRegexToastPersistentSuppress) {
      _lastPresetRegexToastFingerprint = fingerprint;
      _lastPresetRegexToastAt = now;
      return true;
    }

    // 临时抑制窗口（begin/end 包裹的切换/编辑路径）
    if (
      _suppressPresetRegexToastDepth <= 0 ||
      now > _suppressPresetRegexToastUntil
    ) {
      return false;
    }

    _lastPresetRegexToastFingerprint = fingerprint;
    _lastPresetRegexToastAt = now;
    return true;
  }

  function clearSuppressPresetRegexToastRestoreTimer() {
    if (_pendingSuppressPresetRegexToastRestoreTimer) {
      window.clearTimeout(_pendingSuppressPresetRegexToastRestoreTimer);
      _pendingSuppressPresetRegexToastRestoreTimer = null;
    }
  }

  function restorePresetRegexToastFnsIfNeeded() {
    clearSuppressPresetRegexToastRestoreTimer();
    // 常驻抑制仍开启时（插件面板仍打开）不得恢复原始 toastr
    if (_cfmPresetRegexToastPersistentSuppress) return;
    if (_originalToastrFnsForPresetRegexToast && window.toastr) {
      for (const [level, originalFn] of Object.entries(
        _originalToastrFnsForPresetRegexToast,
      )) {
        window.toastr[level] = originalFn;
      }
    }
    _originalToastrFnsForPresetRegexToast = null;
    _suppressPresetRegexToastUntil = 0;
  }

  function scheduleSuppressPresetRegexToastRestore() {
    if (_suppressPresetRegexToastDepth !== 0) return;

    clearSuppressPresetRegexToastRestoreTimer();
    const remainingMs = Math.max(
      0,
      _suppressPresetRegexToastUntil - Date.now(),
    );
    if (remainingMs > 0) {
      _pendingSuppressPresetRegexToastRestoreTimer = window.setTimeout(() => {
        _pendingSuppressPresetRegexToastRestoreTimer = null;
        if (_suppressPresetRegexToastDepth !== 0) return;
        if (Date.now() < _suppressPresetRegexToastUntil) {
          scheduleSuppressPresetRegexToastRestore();
          return;
        }
        restorePresetRegexToastFnsIfNeeded();
      }, remainingMs);
      return;
    }

    restorePresetRegexToastFnsIfNeeded();
  }

  function ensurePresetRegexToastFilterInstalled() {
    if (!window.toastr) return false;
    // 已安装（_originalToastrFnsForPresetRegexToast 非空表示包装中）
    if (_originalToastrFnsForPresetRegexToast) return true;

    const toastLevels = ["info", "warning", "success", "error"];
    _originalToastrFnsForPresetRegexToast = {};

    for (const level of toastLevels) {
      if (typeof window.toastr[level] !== "function") continue;
      const originalFn = window.toastr[level].bind(window.toastr);
      _originalToastrFnsForPresetRegexToast[level] = originalFn;
      window.toastr[level] = function (...args) {
        if (shouldSuppressPresetRegexToast(args)) {
          return null;
        }
        return originalFn(...args);
      };
    }
    return true;
  }

  function beginSuppressPresetRegexToast(durationMs = 9000) {
    _suppressPresetRegexToastDepth += 1;
    clearSuppressPresetRegexToastRestoreTimer();
    _suppressPresetRegexToastUntil = Math.max(
      _suppressPresetRegexToastUntil,
      Date.now() + Math.max(0, Number(durationMs) || 0),
    );
    if (_suppressPresetRegexToastDepth !== 1) return;
    ensurePresetRegexToastFilterInstalled();
  }

  function endSuppressPresetRegexToast(delayMs = 0) {
    const finalize = () => {
      if (_suppressPresetRegexToastDepth > 0) {
        _suppressPresetRegexToastDepth -= 1;
      }
      if (_suppressPresetRegexToastDepth !== 0) return;
      scheduleSuppressPresetRegexToastRestore();
    };

    const delay = Math.max(0, Number(delayMs) || 0);
    if (delay > 0) {
      window.setTimeout(finalize, delay);
      return;
    }
    finalize();
  }

  /**
   * 设置“正则重载聊天 toast”常驻抑制开关（与插件主面板开/关绑定）。
   * 开启：确保 toastr 过滤器已安装，命中“正则+重载聊天”的 toast 一律屏蔽；
   * 关闭：若无临时抑制窗口（begin/end 包裹的操作），立即恢复原始 toastr。
   */
  function setPresetRegexToastPersistentSuppress(enabled) {
    const nextValue = Boolean(enabled);
    if (nextValue === _cfmPresetRegexToastPersistentSuppress) return;
    _cfmPresetRegexToastPersistentSuppress = nextValue;
    if (nextValue) {
      ensurePresetRegexToastFilterInstalled();
    } else if (_suppressPresetRegexToastDepth <= 0) {
      restorePresetRegexToastFnsIfNeeded();
    }
  }
  function resetNativePresetPromptPopupStyles() {
    const popupEl = document.getElementById("completion_prompt_manager_popup");
    if (popupEl) {
      // 清理所有可能被设置过的 inline style（兼容旧版本残留）
      const propsToRemove = [
        "position",
        "top",
        "left",
        "right",
        "bottom",
        "inset",
        "transform",
        "margin",
        "max-height",
        "max-width",
        "z-index",
      ];
      for (const prop of propsToRemove) {
        popupEl.style.removeProperty(prop);
      }
    }
    const wrapperEl = popupEl?.parentElement;
    if (wrapperEl instanceof HTMLElement) {
      wrapperEl.style.removeProperty("position");
      wrapperEl.style.removeProperty("z-index");
    }
  }

  /**
   * 在原生弹窗的关闭/保存按钮上绑定清理事件（仅绑定一次）。
   * 当用户点击关闭或保存后，延迟清理 bringNativePresetPromptPopupToFront 遗留的 inline style。
   */
  async function persistCurrentPresetAfterNativePromptSave() {
    try {
      const context = getContext();
      const pm = context?.getPresetManager?.();
      if (!pm || String(pm.apiId || "") !== "openai") return false;

      const presetName = String(
        pm.select?.find("option:selected").text() || "",
      ).trim();
      if (!presetName) return false;

      const runtimePresetList =
        typeof pm.getPresetList === "function"
          ? pm.getPresetList.call(pm)
          : null;
      const runtimeSettings = runtimePresetList?.settings;
      if (!runtimeSettings || typeof runtimeSettings !== "object") {
        return false;
      }

      const runtimePresetData = structuredClone(runtimeSettings);
      sanitizePresetPromptStructure(runtimePresetData);
      await pm.savePreset(presetName, runtimePresetData, { skipUpdate: true });

      try {
        const presetList =
          typeof pm.getPresetList === "function"
            ? pm.getPresetList.call(pm)
            : null;
        if (presetList) {
          const { presets, preset_names } = presetList;
          if (Array.isArray(presets) && preset_names) {
            const nextPresetData = structuredClone(runtimePresetData);
            if (Array.isArray(preset_names)) {
              const idx = preset_names.indexOf(presetName);
              if (idx !== -1) {
                presets[idx] = nextPresetData;
              }
            } else {
              const idx = preset_names[presetName];
              if (Number.isInteger(idx) && idx >= 0 && idx < presets.length) {
                presets[idx] = nextPresetData;
              }
            }
          }
        }
      } catch (error) {
        console.warn("[CFM] 同步已保存预设到内存列表失败", error);
      }

      return true;
    } catch (error) {
      console.warn("[CFM] 持久化原生预设条目编辑结果失败", error);
      return false;
    }
  }

  function bindNativePopupCleanup() {
    if (_nativePopupCleanupBound) return;
    const popupEl = document.getElementById("completion_prompt_manager_popup");
    if (!popupEl) return;
    _nativePopupCleanupBound = true;

    const saveButtonId = "completion_prompt_manager_popup_entry_form_save";
    const closeButtonIds = [
      "completion_prompt_manager_popup_close_button",
      "completion_prompt_manager_popup_entry_form_close",
      saveButtonId,
    ];
    for (const btnId of closeButtonIds) {
      const btn = document.getElementById(btnId);
      if (btn) {
        const isSaveButton = btnId === saveButtonId;
        // 移动端修复：按下保存/关闭按钮的瞬间，原生弹窗即将隐藏。
        // 此时 touchend 的 target 可能已经落到弹窗底下的 drawer-toggle 元素，
        // 触发 cfmMobileAutoClose 的全局处理器将主面板关闭。
        // 通过 pointerdown/touchstart 提前设置 _cfmSuppressAutoClose，
        // 保证后续触摸 / 点击事件不会被错误地识别为“关闭主面板”。
        const suppressAutoCloseHandler = () => {
          try {
            _cfmSuppressAutoClose = true;
          } catch (_) {
            /* _cfmSuppressAutoClose 未声明时静默跳过 */
          }
          // 在保存完成 + 恢复预设选择之后再释放抑制标志，保留足够长的缓冲窗口。
          const releaseDelay = isSaveButton ? 1500 : 800;
          window.setTimeout(() => {
            try {
              _cfmSuppressAutoClose = false;
            } catch (_) {
              /* 同上 */
            }
          }, releaseDelay);
        };
        btn.addEventListener("pointerdown", suppressAutoCloseHandler, {
          passive: true,
        });
        btn.addEventListener("touchstart", suppressAutoCloseHandler, {
          passive: true,
        });

        btn.addEventListener("click", () => {
          // click 时也再次确保抑制标志已设置（某些浏览器可能未触发 pointerdown）
          try {
            _cfmSuppressAutoClose = true;
          } catch (_) {
            /* 同上 */
          }
          // 对于保存按钮，需要等原生 handleSavePrompt 完成，
          // 再把当前运行时设置静默写回到当前选中的预设文件，
          // 最后才恢复原来的预设选择。
          // 对于关闭按钮，等弹窗隐藏后即可恢复。
          const delay = isSaveButton ? 600 : 200;
          setTimeout(async () => {
            resetNativePresetPromptPopupStyles();
            if (isSaveButton) {
              const persisted =
                await persistCurrentPresetAfterNativePromptSave();
              if (!persisted) {
                cfmToastr.error(
                  "预设条目已在运行时更新，但写回预设文件失败，请手动点击“更新当前预设”",
                );
              }
            }
            restorePresetSelectionAfterEdit();
            // 额外再清一次，确保没有泄漏抑制标志
            // 延时释放以配合 restorePresetSelectionAfterEdit 内部的 change 事件处理
            window.setTimeout(() => {
              try {
                _cfmSuppressAutoClose = false;
              } catch (_) {
                /* 同上 */
              }
            }, 900);
          }, delay);
        });
      }
    }
  }

  /**
   * 弹窗关闭后恢复原始预设选择（如果之前因编辑非当前预设而切换过）
   */
  function restorePresetSelectionAfterEdit() {
    if (_presetValueToRestore === null) return;
    const valueToRestore = _presetValueToRestore;
    _presetValueToRestore = null;
    try {
      const pm = getContext().getPresetManager();
      if (!pm?.select) return;
      const currentValue = String(pm.select.val() || "");
      if (currentValue !== valueToRestore) {
        beginSuppressPresetRegexToast();
        try {
          // 移动端修复：触发 change 事件以完整重新加载预设数据（prompts 列表等），
          // 通过 _cfmSuppressAutoClose 抑制移动端自动关闭面板的副作用。
          _cfmSuppressAutoClose = true;
          pm.select.val(valueToRestore);
          pm.select.trigger("change");
        } finally {
          window.setTimeout(() => {
            endSuppressPresetRegexToast();
            _cfmSuppressAutoClose = false;
          }, 800);
        }
      }
    } catch (e) {
      console.warn("[CFM] 恢复预设选择失败", e);
      endSuppressPresetRegexToast();
      _cfmSuppressAutoClose = false;
    }
  }

  let _nativePresetPromptEditorApi = null;
  function getNativePresetPromptEditorApi() {
    if (!_nativePresetPromptEditorApi) {
      _nativePresetPromptEditorApi = createNativePresetPromptEditorApiCore({
        $,
        document,
        window,
        HTMLElement,
        HTMLInputElement,
        HTMLTextAreaElement,
        FocusEvent,
        Event,
        Date,
        Number,
        String,
        Promise,
        setTimeout,
        getContext,
        beginSuppressPresetRegexToast,
        endSuppressPresetRegexToast,
        bindNativePopupCleanup,
        findNativePresetPromptRow,
        findPresetSelectValueByName,
        syncCurrentPresetSelection,
        setPresetValueToRestore: (value) => {
          _presetValueToRestore = value;
        },
      });
    }
    return _nativePresetPromptEditorApi;
  }

  async function openNativePresetPromptEditor(
    presetName,
    promptKey,
    promptLabel = "",
  ) {
    return getNativePresetPromptEditorApi().openNativePresetPromptEditor(
      presetName,
      promptKey,
      promptLabel,
    );
  }

  let _presetPromptEditorApi = null;
  function getPresetPromptEditorApi() {
    if (!_presetPromptEditorApi) {
      _presetPromptEditorApi = createPresetPromptEditorApiCore({
        $,
        document,
        window,
        cfmToastr,
        escapeHtml,
        getContext,
        getPresetDataForDetail,
        getPresetPromptByKey,
        getPresetPromptText,
        findPresetPromptOrderEntryLocation,
        saveNormalizedPresetData,
        refreshPresetPanelView,
      });
    }
    return _presetPromptEditorApi;
  }

  function openPresetPromptEditor(presetName, promptKey, promptLabel = "") {
    return getPresetPromptEditorApi().openPresetPromptEditor(
      presetName,
      promptKey,
      promptLabel,
    );
  }

  function showPresetEditorOpeningLoading(fieldKey, label = "") {
    const normalizedFieldKey = String(fieldKey || "").trim();
    if (!normalizedFieldKey) return null;

    const host = $("#cfm-overlay");
    if (!host.length) return null;

    host.find(".cfm-preset-detail-opening-loading").remove();

    const loading = $(`
      <div class="cfm-preset-detail-opening-loading" aria-live="polite" aria-busy="true">
        <div class="cfm-preset-detail-opening-loading-box">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>正在打开编辑器${label ? `：${escapeHtml(label)}` : "..."}</span>
        </div>
      </div>
    `);

    host.append(loading);
    return () => {
      loading.remove();
    };
  }

  async function editPresetDetailField(presetName, fieldKey) {
    const pm = getContext().getPresetManager();
    if (!pm) {
      cfmToastr.error("无法获取预设管理器");
      return;
    }
    const presetData = getPresetDataForDetail(pm, presetName);
    if (!presetData) {
      cfmToastr.error(`找不到预设「${presetName}」的数据`);
      return;
    }

    const field = getPresetDetailFields(presetData).find(
      (item) => item.key === fieldKey,
    );
    if (!field) {
      cfmToastr.error("未找到可编辑的预设条目");
      return;
    }

    if (!String(fieldKey || "").startsWith("prompts.")) {
      cfmToastr.error("仅支持通过原生界面编辑预设条目");
      return;
    }

    const promptKey = fieldKey.slice("prompts.".length);
    const opened = openPresetPromptEditor(presetName, promptKey, field.label);
    if (!opened) {
      cfmToastr.error(`无法打开预设条目「${field.label}」的编辑弹窗`);
    }
  }

  function isWorldInfoEntryBookExpanded(bookName) {
    return cfmWorldInfoEntryExpandedNames.has(String(bookName || ""));
  }

  function setWorldInfoEntryBookExpanded(bookName, expanded) {
    const normalizedName = String(bookName || "");
    if (!normalizedName) return false;
    if (expanded) {
      cfmWorldInfoEntryExpandedNames.add(normalizedName);
    } else {
      cfmWorldInfoEntryExpandedNames.delete(normalizedName);
      collapseWorldInfoEntryDetails(normalizedName);
      if (cfmWorldInfoEntryBatchOwnerName === normalizedName) {
        cfmWorldInfoEntryBatchMode = false;
        cfmWorldInfoEntryBatchOwnerName = null;
        cfmWorldInfoEntryBatchSelected.clear();
        cfmWorldInfoEntryBatchRangeMode = false;
        cfmWorldInfoEntryBatchLastClicked = null;
      }
    }
    return expanded;
  }

  function toggleWorldInfoEntryBookExpanded(bookName) {
    const willExpand = !isWorldInfoEntryBookExpanded(bookName);
    setWorldInfoEntryBookExpanded(bookName, willExpand);
    return willExpand;
  }

  function closeWorldInfoEntryPanels() {
    cfmWorldInfoEntryExpandedNames.clear();
    collapseWorldInfoEntryDetails();
    cfmWorldInfoEntryBatchMode = false;
    cfmWorldInfoEntryBatchOwnerName = null;
    cfmWorldInfoEntryBatchSelected.clear();
    cfmWorldInfoEntryBatchRangeMode = false;
    cfmWorldInfoEntryBatchLastClicked = null;
  }

  function shouldIgnoreWorldInfoEntryTap(e) {
    return shouldIgnoreTouchTapAfterMove(e, {
      prefix: "cfmWorldInfoEntryTap",
    });
  }

  function bindWorldInfoEntryCollapseTargets(
    refreshFn = refreshWorldInfoPanelView,
  ) {
    $("#cfm-worldinfo-left-tree, #cfm-worldinfo-right-list")
      .off("click.cfmWorldInfoEntryCollapse touchend.cfmWorldInfoEntryCollapse")
      .on(
        "click.cfmWorldInfoEntryCollapse touchend.cfmWorldInfoEntryCollapse",
        (e) => {
          if (shouldIgnoreWorldInfoEntryTap(e)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (
            $(e.target).closest(
              ".cfm-row, .cfm-preset-detail-row, .cfm-tnode, .cfm-multisel-toolbar, .cfm-regex-toolbar, .cfm-regex-batch-toolbar, .cfm-chat-action-btn, .cfm-wi-toggle, .cfm-edit-checkbox, button, a, input, textarea, select, label",
            ).length
          ) {
            return;
          }
          const hasExpandedPanels =
            cfmWorldInfoEntryExpandedNames.size > 0 ||
            cfmWorldInfoEntryOpenDetails.size > 0;
          if (!hasExpandedPanels) return;
          const targetName = getLatestWorldInfoCollapseTargetName();
          e.preventDefault();
          e.stopImmediatePropagation();
          closeWorldInfoEntryPanels();
          refreshFn();
          scrollWorldInfoRowIntoView(targetName);
        },
      );
  }

  let _worldInfoEntryDetailApi = null;
  function getWorldInfoEntryDetailApi() {
    if (!_worldInfoEntryDetailApi) {
      _worldInfoEntryDetailApi = createWorldInfoEntryDetailApi({
        escapeHtml,
      });
    }
    return _worldInfoEntryDetailApi;
  }

  /** 渲染世界书条目编辑卡 HTML */
  function buildWorldInfoEntryDetailHtml(entry) {
    return getWorldInfoEntryDetailApi().buildWorldInfoEntryDetailHtml(entry);
  }
  let _worldInfoEntrySublistApi = null;
  function getWorldInfoEntrySublistApi() {
    if (!_worldInfoEntrySublistApi) {
      _worldInfoEntrySublistApi = createWorldInfoEntrySublistApi({
        $,
        escapeHtml,
        cfmToastr,
        getContext,
        refreshWorldInfoPanelView,
        getWorldInfoEntryDetailSortMode,
        setWorldInfoEntryDetailSortMode,
        getWorldInfoEntriesForDetail,
        sortWorldInfoEntriesForDetail,
        fetchWorldInfoDetailData,
        saveWorldInfoDetailData,
        isWorldInfoEntryBookExpanded,
        setWorldInfoEntryBookExpanded,
        getWorldInfoEntrySelectionKey,
        isWorldInfoEntryDetailOpen,
        getWorldInfoEntryOpenSet,
        toggleWorldInfoEntryDetail,
        toggleWorldInfoEntryBatchItem,
        toggleWorldInfoEntryActivation,
        applyWorldInfoEntryBatchActivation,
        duplicateWorldInfoEntryInBook,
        deleteWorldInfoEntryInBook,
        batchDeleteWorldInfoEntries,
        moveWorldInfoEntriesToIndex,
        getEntryTransferInsertItems,
        openEntryTransferInsertDialog,
        showEntryTransferPopup,
        shouldIgnoreWorldInfoEntryTap,
        recordTouchTapStart,
        bindTouchSafeTap,
        flashDraggedElement,
        scrollElementIntoViewCentered,
        buildWorldInfoEntryDetailHtml,
        state: {
          get cfmWorldInfoEntryLastFocusedName() {
            return cfmWorldInfoEntryLastFocusedName;
          },
          set cfmWorldInfoEntryLastFocusedName(value) {
            cfmWorldInfoEntryLastFocusedName = value;
          },
          get cfmWorldInfoEntryBatchMode() {
            return cfmWorldInfoEntryBatchMode;
          },
          set cfmWorldInfoEntryBatchMode(value) {
            cfmWorldInfoEntryBatchMode = value;
          },
          get cfmWorldInfoEntryBatchOwnerName() {
            return cfmWorldInfoEntryBatchOwnerName;
          },
          set cfmWorldInfoEntryBatchOwnerName(value) {
            cfmWorldInfoEntryBatchOwnerName = value;
          },
          get cfmWorldInfoEntryBatchSelected() {
            return cfmWorldInfoEntryBatchSelected;
          },
          set cfmWorldInfoEntryBatchSelected(value) {
            cfmWorldInfoEntryBatchSelected = value;
          },
          get cfmWorldInfoEntryBatchRangeMode() {
            return cfmWorldInfoEntryBatchRangeMode;
          },
          set cfmWorldInfoEntryBatchRangeMode(value) {
            cfmWorldInfoEntryBatchRangeMode = value;
          },
          get cfmWorldInfoEntryBatchLastClicked() {
            return cfmWorldInfoEntryBatchLastClicked;
          },
          set cfmWorldInfoEntryBatchLastClicked(value) {
            cfmWorldInfoEntryBatchLastClicked = value;
          },
        },
      });
    }
    return _worldInfoEntrySublistApi;
  }

  function renderWorldInfoEntrySubList(
    bookRow,
    bookName,
    refreshFn,
    renderOptions,
  ) {
    return getWorldInfoEntrySublistApi().renderWorldInfoEntrySubList(
      bookRow,
      bookName,
      refreshFn,
      renderOptions,
    );
  }

  function renderPresetDetailSubList(presetRow, preset) {
    return getPresetDetailSublistApi().renderPresetDetailSubList(
      presetRow,
      preset,
    );
  }

  function refreshPresetPanelView() {
    const q = String($("#cfm-preset-global-search").val() || "").trim();
    if (q) executePresetSearch();
    else renderPresetsView();
  }

  // 同步更新预设管理器DOM中的option（重命名后立即同步，防止渲染清理逻辑误删分组）
  function syncPresetOptionInDOM(pm, oldName, newName) {
    if (!pm || !pm.select) return;
    const $select = $(pm.select);
    const $option = $select.find(`option`).filter(function () {
      return $(this).text() === oldName;
    });
    if ($option.length > 0) {
      // 更新option的文本和值
      const oldVal = $option.val();
      $option.text(newName);
      // 如果value就是名称本身，也更新value
      if (oldVal === oldName) {
        $option.val(newName);
      }
      // 如果当前选中的就是被重命名的预设，保持选中状态
      if ($select.val() === oldVal) {
        $select.val($option.val());
      }
    } else {
      // 找不到旧option，添加新的
      $select.append($(`<option></option>`).val(newName).text(newName));
    }
  }

  // 同步更新世界书DOM中的option（重命名后立即同步）
  async function syncWorldInfoOptionInDOM(oldName, newName) {
    // 更新编辑器下拉列表
    const $select = $("#world_editor_select");
    const $option = $select.find(`option`).filter(function () {
      return $(this).text() === oldName;
    });
    if ($option.length > 0) {
      const oldVal = $option.val();
      $option.text(newName);
      if (oldVal === oldName) {
        $option.val(newName);
      }
    } else {
      $select.append($(`<option></option>`).val(newName).text(newName));
    }
    // 更新全局世界书选择器
    const $globalSelect = $("#world_info");
    const $globalOption = $globalSelect.find(`option`).filter(function () {
      return $(this).text() === oldName;
    });
    if ($globalOption.length > 0) {
      $globalOption.text(newName);
    }
    // 同步更新 world_names 数组（内存中的世界书名称列表）
    try {
      const wiModule = await ensureWiModule();
      const wNames = wiModule.world_names;
      if (Array.isArray(wNames)) {
        const oldIdx = wNames.indexOf(oldName);
        if (oldIdx !== -1) {
          wNames[oldIdx] = newName;
        } else if (!wNames.includes(newName)) {
          wNames.push(newName);
        }
      }
    } catch (e) {
      console.warn("[CFM] 同步 world_names 失败", e);
    }
    // 同时清除世界书名称缓存，确保下次渲染获取最新数据
    _worldInfoNamesCache = null;
  }

  // 刷新预设管理器的下拉列表
  // 增强版：从服务端获取 settings 后，用 loadPowerUserSettings 重载预设相关数据，
  // 并额外从 pm.getPresetList() 补充 select 中缺失的 option。
  async function refreshPresetManagerList(pm, preservedValue = null) {
    try {
      if (!pm || !pm.select) return;
      const currentVal = $(pm.select).val();
      const restoreVal =
        preservedValue !== undefined && preservedValue !== null
          ? preservedValue
          : currentVal;

      // 方案 1：尝试用 loadOpenAISettings 重载预设（最可靠）
      let reloaded = false;
      try {
        const resp = await fetch("/api/settings/get", {
          method: "POST",
          headers: getContext().getRequestHeaders(),
          body: JSON.stringify({}),
          cache: "no-cache",
        });
        if (resp.ok) {
          const data = await resp.json();
          const settings =
            data && data.settings ? JSON.parse(data.settings) : null;
          if (settings) {
            // 尝试动态导入 openai.js 来重载预设列表
            try {
              const oaiModule = await import("/scripts/openai.js");
              if (typeof oaiModule.loadOpenAISettings === "function") {
                await oaiModule.loadOpenAISettings(data, settings);
                reloaded = true;
                console.log("[CFM] 通过 loadOpenAISettings 重载预设列表成功");
              }
            } catch (oaiErr) {
              // openai.js 可能不导出 loadOpenAISettings，回退到方案 2
              console.debug(
                "[CFM] loadOpenAISettings 不可用，回退到 option 补充方案",
                oaiErr,
              );
            }
          }
        }
      } catch (fetchErr) {
        console.debug("[CFM] fetch settings 失败", fetchErr);
      }

      // 方案 2：从 pm.getPresetList() 获取内存中的 preset_names，补充缺失的 option
      if (!reloaded && typeof pm.getPresetList === "function") {
        try {
          const { preset_names } = pm.getPresetList.call(pm);
          if (preset_names) {
            // 获取当前 select 中已有的 option text 集合
            const existingTexts = new Set();
            $(pm.select)
              .find("option")
              .each(function () {
                existingTexts.add($(this).text());
              });

            // preset_names 可以是数组或对象
            const names = Array.isArray(preset_names)
              ? preset_names
              : Object.keys(preset_names);

            let addedCount = 0;
            for (const name of names) {
              if (name && !existingTexts.has(name)) {
                const opt = $("<option></option>").val(name).text(name);
                $(pm.select).append(opt);
                addedCount++;
              }
            }
            if (addedCount > 0) {
              console.log(`[CFM] 补充了 ${addedCount} 个缺失的预设 option`);
            }
          }
        } catch (plErr) {
          console.debug("[CFM] 从 getPresetList 补充 option 失败", plErr);
        }
      }

      // 恢复原来的选中值
      if (restoreVal !== undefined && restoreVal !== null) {
        $(pm.select).val(restoreVal);
      }
    } catch (e) {
      console.warn("[CFM] 刷新预设列表失败", e);
    }
  }

  // 重命名后更新插件设置中的引用（文件夹分配、备注、收藏等）
  function updateSettingsAfterRename(resType, oldName, newName) {
    // 更新文件夹分配（presetGroups / worldInfoGroups 是 { itemName: folderId } 映射）
    const groups = getResourceGroups(resType);
    if (groups && groups[oldName]) {
      groups[newName] = groups[oldName];
      delete groups[oldName];
    }
    // 更新收藏（presetFavorites / worldInfoFavorites 是数组）
    const favs = getResFavorites(resType);
    if (favs) {
      const idx = favs.indexOf(oldName);
      if (idx !== -1) favs[idx] = newName;
    }
    // 更新备注
    if (resType === "presets") {
      const notes = extension_settings[extensionName].presetNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
      // 同步世界书激活分组中绑定的预设名称
      const wiPresets = getWiActivePresets();
      for (const wp of wiPresets) {
        if (Array.isArray(wp.bindPresets)) {
          const idx = wp.bindPresets.indexOf(oldName);
          if (idx !== -1) wp.bindPresets[idx] = newName;
        }
      }
    } else if (resType === "worldinfo") {
      const notes = extension_settings[extensionName].worldInfoNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
    } else if (resType === "themes") {
      const notes = extension_settings[extensionName].themeNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
      // 同步背景绑定数据
      const bindings =
        extension_settings[extensionName].themeBackgroundBindings;
      if (bindings && bindings[oldName]) {
        bindings[newName] = bindings[oldName];
        delete bindings[oldName];
      }
    } else if (resType === "quickreply") {
      const notes = extension_settings[extensionName].qrNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
      // 同步 QR 激活分组中的快速回复集名称
      const qrPresets = getQrActivePresets ? getQrActivePresets() : [];
      for (const qp of qrPresets) {
        if (Array.isArray(qp.sets)) {
          const idx = qp.sets.indexOf(oldName);
          if (idx !== -1) qp.sets[idx] = newName;
        }
      }
    } else if (resType === "backgrounds") {
      const notes = extension_settings[extensionName].bgNotes;
      if (notes && notes[oldName]) {
        notes[newName] = notes[oldName];
        delete notes[oldName];
      }
      // 同步方向数据
      const orients = extension_settings[extensionName].bgOrientations;
      if (orients && orients[oldName]) {
        orients[newName] = orients[oldName];
        delete orients[oldName];
      }
      // 同步主题绑定背景数据（背景重命名时更新所有引用该背景的绑定）
      const bindings =
        extension_settings[extensionName].themeBackgroundBindings;
      if (bindings) {
        for (const [theme, bg] of Object.entries(bindings)) {
          if (bg === oldName) {
            bindings[theme] = newName;
          }
        }
      }
      // 同步默认背景设置
      if (extension_settings[extensionName].defaultBackground === oldName) {
        extension_settings[extensionName].defaultBackground = newName;
      }
    }
    getContext().saveSettingsDebounced();
  }

  // ==================== 世界书重命名模式 ====================
  let cfmWorldInfoRenameMode = false;
  let cfmWorldInfoRenameSelected = new Set();
  let cfmWorldInfoRenameRangeMode = false;
  let cfmWorldInfoRenameLastClicked = null;

  let _worldInfoRenameApi = null;
  function getWorldInfoRenameApi() {
    if (!_worldInfoRenameApi) {
      _worldInfoRenameApi = createWorldInfoRenameApiCore({
        $,
        fetch: window.fetch.bind(window),
        getContext,
        ensureWiModule,
        extensionName,
        state: {
          get cfmWorldInfoRenameMode() {
            return cfmWorldInfoRenameMode;
          },
          set cfmWorldInfoRenameMode(value) {
            cfmWorldInfoRenameMode = value;
          },
          get cfmWorldInfoRenameSelected() {
            return cfmWorldInfoRenameSelected;
          },
          set cfmWorldInfoRenameSelected(value) {
            cfmWorldInfoRenameSelected = value;
          },
          get cfmWorldInfoRenameRangeMode() {
            return cfmWorldInfoRenameRangeMode;
          },
          set cfmWorldInfoRenameRangeMode(value) {
            cfmWorldInfoRenameRangeMode = value;
          },
          get cfmWorldInfoRenameLastClicked() {
            return cfmWorldInfoRenameLastClicked;
          },
          set cfmWorldInfoRenameLastClicked(value) {
            cfmWorldInfoRenameLastClicked = value;
          },
        },
        collectCurrentSelection,
        clearAllExclusiveModes,
        getVisibleResourceIds,
        renderWorldInfoView,
        escapeHtml,
        findCommonPrefix,
        findCommonSuffix,
        syncWorldInfoOptionInDOM,
        updateSettingsAfterRename,
        cfmToastr,
        showBatchProgressOverlay,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        console,
      });
    }
    return _worldInfoRenameApi;
  }

  function enterWorldInfoRenameMode() {
    return getWorldInfoRenameApi().enterWorldInfoRenameMode();
  }

  function exitWorldInfoRenameMode() {
    return getWorldInfoRenameApi().exitWorldInfoRenameMode();
  }

  function toggleWorldInfoRenameItem(id, shiftKey) {
    return getWorldInfoRenameApi().toggleWorldInfoRenameItem(id, shiftKey);
  }

  function prependWorldInfoRenameToolbar(listContainer, renderFn) {
    return getWorldInfoRenameApi().prependWorldInfoRenameToolbar(
      listContainer,
      renderFn,
    );
  }

  async function showWorldInfoRenamePopup(names) {
    return await getWorldInfoRenameApi().showWorldInfoRenamePopup(names);
  }

  async function updateCharWorldBindings(oldName, newName) {
    return await getWorldInfoRenameApi().updateCharWorldBindings(
      oldName,
      newName,
    );
  }

  async function executeWorldInfoRename(names) {
    return await getWorldInfoRenameApi().executeWorldInfoRename(names);
  }

  // ==================== 角色卡快速编辑模式 ====================
  let cfmEditMode = false;
  let cfmEditSelected = new Set();
  let cfmEditRangeMode = false;
  let cfmEditLastClicked = null;

  function enterEditMode() {
    const prev = collectCurrentSelection();
    clearAllExclusiveModes();
    cfmEditMode = true;
    cfmEditSelected = prev || new Set();
    cfmEditRangeMode = false;
    cfmEditLastClicked = null;
    // 更新按钮外观
    $("#cfm-edit-char-btn").addClass("cfm-edit-active");
    $("#cfm-edit-char-btn")
      .find("i")
      .removeClass("fa-pen-to-square")
      .addClass("fa-check");
    $("#cfm-edit-char-btn").attr("title", "确认编辑");
    $(".cfm-popup").addClass("cfm-edit-mode");
    rerenderCurrentView();
  }

  function exitEditMode() {
    cfmEditMode = false;
    cfmEditSelected.clear();
    cfmEditRangeMode = false;
    cfmEditLastClicked = null;
    $("#cfm-edit-char-btn").removeClass("cfm-edit-active");
    $("#cfm-edit-char-btn")
      .find("i")
      .removeClass("fa-check")
      .addClass("fa-pen-to-square");
    $("#cfm-edit-char-btn").attr("title", "快速编辑角色卡");
    $(".cfm-popup").removeClass("cfm-edit-mode");
    rerenderCurrentView();
  }

  function toggleEditItem(id, shiftKey) {
    if ((shiftKey || cfmEditRangeMode) && cfmEditLastClicked) {
      const visible = getVisibleResourceIds();
      const lastIdx = visible.indexOf(cfmEditLastClicked);
      const curIdx = visible.indexOf(id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++) cfmEditSelected.add(visible[i]);
      }
    } else {
      if (cfmEditSelected.has(id)) cfmEditSelected.delete(id);
      else cfmEditSelected.add(id);
    }
    cfmEditLastClicked = id;
  }

  function prependEditToolbar(listContainer, renderFn) {
    if (!cfmEditMode) return;
    const visible = getVisibleResourceIds();
    const allSel =
      visible.length > 0 && visible.every((id) => cfmEditSelected.has(id));
    const toolbar = $(`
      <div class="cfm-edit-toolbar">
        <button class="cfm-btn cfm-btn-sm cfm-edit-selectall"><i class="fa-solid fa-${allSel ? "square-minus" : "square-check"}"></i> ${allSel ? "全不选" : "全选"}</button>
        <button class="cfm-btn cfm-btn-sm cfm-edit-range ${cfmEditRangeMode ? "cfm-range-active" : ""}"><i class="fa-solid fa-arrow-down-short-wide"></i> 框选${cfmEditRangeMode ? "(开)" : ""}</button>
        <span class="cfm-edit-count">${cfmEditSelected.size > 0 ? `已选 ${cfmEditSelected.size} 项` : ""}</span>
        <button class="cfm-btn cfm-btn-sm cfm-edit-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
      </div>
    `);
    toolbar.find(".cfm-edit-selectall").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (allSel) {
        visible.forEach((id) => cfmEditSelected.delete(id));
      } else {
        visible.forEach((id) => cfmEditSelected.add(id));
      }
      renderFn();
    });
    toolbar.find(".cfm-edit-range").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cfmEditRangeMode = !cfmEditRangeMode;
      if (cfmEditRangeMode) cfmEditLastClicked = null;
      renderFn();
    });
    toolbar.find(".cfm-edit-cancel").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitEditMode();
    });
    listContainer.prepend(toolbar);
  }

  // ==================== 角色卡聊天记录管理模式 ====================
  let cfmChatMode = false; // 聊天记录展示模式
  let cfmChatExpandedAvatars = new Set(); // 当前展开聊天记录的角色avatar集合
  let cfmChatCache = new Map(); // avatar -> chats[] 缓存
  let cfmChatNotes = {}; // chatFileName -> note 备注映射
  let cfmChatBatchMode = false; // 聊天记录批量操作模式
  let cfmChatBatchSelected = new Set(); // 批量选中的 "avatar::chatFileName" 集合
  let cfmChatBatchRangeMode = false; // 聊天记录框选模式
  let cfmChatBatchLastClicked = null; // 聊天记录框选锚点

  /**
   * 聊天记录批量选择切换（支持框选/Shift多选）
   * @param {string} batchKey - "avatar::chatName" 格式的键
   * @param {boolean} shiftKey - 是否按住了 Shift 键
   * @param {Array} chats - 当前聊天列表
   * @param {string} avatar - 当前角色 avatar
   */
  function toggleChatBatchItem(batchKey, shiftKey, chats, avatar) {
    if ((shiftKey || cfmChatBatchRangeMode) && cfmChatBatchLastClicked) {
      // 构建当前可见聊天的 batchKey 列表
      const visibleKeys = chats.map(
        (c) => `${avatar}::${c.file_name.replace(".jsonl", "")}`,
      );
      const lastIdx = visibleKeys.indexOf(cfmChatBatchLastClicked);
      const curIdx = visibleKeys.indexOf(batchKey);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] =
          lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        for (let i = start; i <= end; i++)
          cfmChatBatchSelected.add(visibleKeys[i]);
      }
    } else {
      if (cfmChatBatchSelected.has(batchKey))
        cfmChatBatchSelected.delete(batchKey);
      else cfmChatBatchSelected.add(batchKey);
    }
    cfmChatBatchLastClicked = batchKey;
  }

  function createChatlogNotesApi() {
    return createChatlogNotesApiCore({
      $,
      cfmConfirm,
      cfmToastr,
      clearAllExclusiveModes,
      collectCurrentSelection,
      escapeHtml,
      extensionName,
      extensionSettings: extension_settings,
      getContext,
      getVisibleResourceIds,
      renderChatlogsView,
      state: {
        get cfmChatNotes() {
          return cfmChatNotes;
        },
        set cfmChatNotes(value) {
          cfmChatNotes = value;
        },
        get cfmChatlogNoteMode() {
          return cfmChatlogNoteMode;
        },
        set cfmChatlogNoteMode(value) {
          cfmChatlogNoteMode = value;
        },
        get cfmChatlogNoteSelected() {
          return cfmChatlogNoteSelected;
        },
        set cfmChatlogNoteSelected(value) {
          cfmChatlogNoteSelected = value;
        },
        get cfmChatlogNoteRangeMode() {
          return cfmChatlogNoteRangeMode;
        },
        set cfmChatlogNoteRangeMode(value) {
          cfmChatlogNoteRangeMode = value;
        },
        get cfmChatlogNoteLastClicked() {
          return cfmChatlogNoteLastClicked;
        },
        set cfmChatlogNoteLastClicked(value) {
          cfmChatlogNoteLastClicked = value;
        },
      },
    });
  }

  function initChatNotes() {
    return createChatlogNotesApi().initChatNotes();
  }

  function saveChatNotes() {
    return createChatlogNotesApi().saveChatNotes();
  }

  function enterChatMode() {
    // 互斥：如果正则模式开启，先退出
    if (cfmCharRegexMode) exitCharRegexMode();
    cfmChatMode = true;
    cfmChatExpandedAvatars.clear();
    cfmChatCache.clear();
    cfmChatBatchMode = false;
    cfmChatBatchSelected.clear();
    $("#cfm-chat-mode-btn").addClass("cfm-chat-mode-active");
    $("#cfm-chat-mode-btn")
      .find("i")
      .removeClass("fa-comments")
      .addClass("fa-comments");
    $("#cfm-chat-mode-btn").attr("title", "关闭聊天记录");
    // 立即渲染并同步当前角色目标：如果已有当前角色，则自动跳转到该角色并展开聊天记录
    refreshChatModeTargetFromCurrent();
    // 非阻塞后台预加载：加载完成后精确刷新三角（移除无聊天记录的角色的三角）
    const characters = getCharacters();
    Promise.all(characters.map((c) => getCharChats(c.avatar)))
      .then(() => {
        // 仅当没有展开的子列表时才刷新，避免打断用户交互
        if (cfmChatMode && cfmChatExpandedAvatars.size === 0) {
          rerenderCurrentView();
        }
      })
      .catch((e) => console.warn("[CFM] 批量预加载聊天数据时出错:", e));
  }

  function exitChatMode() {
    cfmChatMode = false;
    cfmChatExpandedAvatars.clear();
    cfmChatCache.clear();
    cfmChatBatchMode = false;
    cfmChatBatchSelected.clear();
    $("#cfm-chat-mode-btn").removeClass("cfm-chat-mode-active");
    $("#cfm-chat-mode-btn").attr("title", "显示聊天记录");
    rerenderCurrentView();
  }

  function toggleChatMode() {
    if (cfmChatMode) exitChatMode();
    else enterChatMode();
  }

  // ==================== 角色卡/预设 正则查看模式 ====================
  let cfmCharRegexMode = false; // 角色卡正则展示模式
  let cfmCharRegexExpandedAvatars = new Set(); // 当前展开正则的角色avatar集合
  let cfmCharDetailExpandedAvatars = new Set(); // 当前展开具体设定的角色avatar集合
  let cfmCharRegexTargetAvatar = null; // 当前正则查看目标角色avatar
  let cfmCharRegexHighlightPath = []; // 当前目标角色到达路径（文件夹ID列表）
  let cfmCharRegexPrevSelectedTreeNode = undefined; // 进入正则模式前的selectedTreeNode（用于退出时恢复）
  let cfmPresetRegexMode = false; // 预设正则展示模式
  let cfmPresetRegexExpandedNames = new Set(); // 当前展开正则的预设name集合
  let cfmPresetRegexTargetName = null; // 当前正则查看目标预设名
  let cfmPresetRegexHighlightPath = []; // 当前目标预设到达路径（文件夹ID列表）
  let cfmPresetDetailExpandedNames = new Set(); // 当前展开详情的预设name集合
  let cfmPresetDetailBatchMode = false; // 预设详情批量操作模式
  let cfmPresetDetailBatchOwnerName = null; // 当前批量操作所属预设名
  let cfmPresetDetailBatchSelected = new Set(); // 当前批量选中的预设条目 key 集合
  let cfmPresetDetailBatchRangeMode = false; // 预设详情框选模式
  let cfmPresetDetailBatchLastClicked = null; // 预设详情框选锚点
  let cfmWorldInfoEntryExpandedNames = new Set(); // 当前展开条目列表的世界书 name 集合
  let cfmWorldInfoEntryBatchMode = false; // 世界书条目批量操作模式
  let cfmWorldInfoEntryBatchOwnerName = null; // 当前条目批量操作所属世界书名
  let cfmWorldInfoEntryBatchSelected = new Set(); // 当前批量选中的世界书条目 key 集合
  let cfmWorldInfoEntryBatchRangeMode = false; // 世界书条目框选模式
  let cfmWorldInfoEntryBatchLastClicked = null; // 世界书条目框选锚点
  let cfmWorldInfoEntryOpenDetails = new Map(); // 当前展开详情的世界书条目（按世界书名记录）
  let cfmWorldInfoEntryLastFocusedName = null; // 最近一次操作/展开的世界书名（用于收起后回定位）

  // 正则批量操作状态
  let cfmRegexBatchMode = false; // 正则批量操作模式
  let cfmRegexBatchSelected = new Set(); // 批量选中的正则脚本ID集合
  let cfmRegexBatchRangeMode = false; // 正则框选模式
  let cfmRegexBatchLastClicked = null; // 正则框选锚点

  function enterCharRegexMode() {
    // 互斥：如果聊天模式开启，先退出
    if (cfmChatMode) exitChatMode();
    cfmCharRegexMode = true;
    cfmCharRegexExpandedAvatars.clear();
    cfmCharRegexTargetAvatar = getCurrentCharAvatar();
    cfmCharRegexHighlightPath = [];
    // 保存当前 selectedTreeNode，退出正则模式时恢复
    cfmCharRegexPrevSelectedTreeNode = selectedTreeNode;
    $("#cfm-char-regex-mode-btn").addClass("cfm-chat-mode-active");
    $("#cfm-char-regex-mode-btn").attr("title", "关闭正则查看");

    if (cfmCharRegexTargetAvatar) {
      // 找到当前角色所在的文件夹路径
      const tagMap = getTagMap();
      const charTags = tagMap[cfmCharRegexTargetAvatar] || [];
      const folderIds = getFolderTagIds();
      const charFolderTags = charTags.filter((t) => folderIds.includes(t));
      if (charFolderTags.length > 0) {
        // 找到最深的文件夹
        let deepest = charFolderTags[0];
        let maxDepth = getFolderPath(deepest).length;
        for (let i = 1; i < charFolderTags.length; i++) {
          const d = getFolderPath(charFolderTags[i]).length;
          if (d > maxDepth) {
            deepest = charFolderTags[i];
            maxDepth = d;
          }
        }
        // 设置高亮路径：从根到目标文件夹
        cfmCharRegexHighlightPath = getFolderPath(deepest);
        // 导航到目标文件夹：展开路径上的所有节点并选中最深文件夹
        for (const pid of cfmCharRegexHighlightPath) expandedNodes.add(pid);
        selectedTreeNode = deepest;
      } else {
        // 角色在未归类中
        cfmCharRegexHighlightPath = [];
        selectedTreeNode = "__uncategorized__";
      }
      // 自动展开目标角色的正则子列表
      cfmCharRegexExpandedAvatars.add(cfmCharRegexTargetAvatar);
    }
    renderLeftTree();
    renderRightPane();
    // 自动滚动到目标角色卡行
    scrollElementIntoViewCentered(() =>
      document.querySelector("#cfm-right-list .cfm-regex-target-row"),
    );
  }

  function exitCharRegexMode() {
    cfmCharRegexMode = false;
    cfmCharRegexExpandedAvatars.clear();
    cfmCharRegexTargetAvatar = null;
    cfmCharRegexHighlightPath = [];
    // 恢复进入正则模式前的 selectedTreeNode
    if (cfmCharRegexPrevSelectedTreeNode !== undefined) {
      selectedTreeNode = cfmCharRegexPrevSelectedTreeNode;
      cfmCharRegexPrevSelectedTreeNode = undefined;
    }
    $("#cfm-char-regex-mode-btn").removeClass("cfm-chat-mode-active");
    $("#cfm-char-regex-mode-btn").attr("title", "查看角色正则");
    renderLeftTree();
    rerenderCurrentView();
  }

  function toggleCharRegexMode() {
    if (cfmCharRegexMode) exitCharRegexMode();
    else enterCharRegexMode();
  }

  function enterPresetRegexMode() {
    cfmPresetRegexMode = true;
    cfmPresetRegexExpandedNames.clear();
    cfmPresetRegexTargetName = getCurrentPresetName();
    cfmPresetRegexHighlightPath = [];
    $("#cfm-preset-regex-mode-btn").addClass("cfm-chat-mode-active");
    $("#cfm-preset-regex-mode-btn").attr("title", "关闭正则查看");

    if (cfmPresetRegexTargetName) {
      // 找到当前预设所在的文件夹
      const groups = getResourceGroups("presets");
      const tree = getResFolderTree("presets");
      const folderId = groups[cfmPresetRegexTargetName];
      if (folderId && tree[folderId]) {
        // 设置高亮路径：从根到目标文件夹
        cfmPresetRegexHighlightPath = getResFolderPath("presets", folderId);
        // 导航到目标文件夹：展开路径上的所有节点并选中文件夹
        for (const pid of cfmPresetRegexHighlightPath)
          presetExpandedNodes.add(pid);
        selectedPresetFolder = folderId;
      } else {
        // 预设在未归类中
        cfmPresetRegexHighlightPath = [];
        selectedPresetFolder = "__ungrouped__";
      }
      // 自动展开目标预设的正则子列表
      cfmPresetRegexExpandedNames.add(cfmPresetRegexTargetName);
    }
    renderPresetsView();
    // 自动滚动到目标预设行
    scrollElementIntoViewCentered(() =>
      document.querySelector("#cfm-preset-right-list .cfm-regex-target-row"),
    );
  }

  function exitPresetRegexMode() {
    cfmPresetRegexMode = false;
    cfmPresetRegexExpandedNames.clear();
    cfmPresetRegexTargetName = null;
    cfmPresetRegexHighlightPath = [];
    $("#cfm-preset-regex-mode-btn").removeClass("cfm-chat-mode-active");
    $("#cfm-preset-regex-mode-btn").attr("title", "查看预设正则");
    renderPresetsView();
  }

  function togglePresetRegexMode() {
    if (cfmPresetRegexMode) exitPresetRegexMode();
    else enterPresetRegexMode();
  }

  function refreshChatModeTargetFromCurrent() {
    if (!cfmChatMode) return;
    const targetAvatar = getCurrentCharAvatar();
    cfmChatExpandedAvatars.clear();
    cfmChatCache.clear();

    if (targetAvatar) {
      const tagMap = getTagMap();
      const charTags = tagMap[targetAvatar] || [];
      const folderIds = getFolderTagIds();
      const charFolderTags = charTags.filter((t) => folderIds.includes(t));
      if (charFolderTags.length > 0) {
        let deepest = charFolderTags[0];
        let maxDepth = getFolderPath(deepest).length;
        for (let i = 1; i < charFolderTags.length; i++) {
          const depth = getFolderPath(charFolderTags[i]).length;
          if (depth > maxDepth) {
            deepest = charFolderTags[i];
            maxDepth = depth;
          }
        }
        for (const pid of getFolderPath(deepest)) expandedNodes.add(pid);
        selectedTreeNode = deepest;
      } else {
        selectedTreeNode = "__uncategorized__";
      }
      cfmChatExpandedAvatars.add(targetAvatar);
    }

    renderLeftTree();
    renderRightPane();

    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll("#cfm-right-list .cfm-row[data-avatar]"),
      ).find((el) => el.getAttribute("data-avatar") === targetAvatar),
    );

    if (targetAvatar) {
      getCharChats(targetAvatar)
        .then(() => {
          if (cfmChatMode && getCurrentCharAvatar() === targetAvatar) {
            renderRightPane();
            scrollElementIntoViewCentered(() =>
              Array.from(
                document.querySelectorAll(
                  "#cfm-right-list .cfm-row[data-avatar]",
                ),
              ).find((el) => el.getAttribute("data-avatar") === targetAvatar),
            );
          }
        })
        .catch((e) => console.warn("[CFM] 刷新聊天模式目标失败:", e));
    }
  }

  function refreshCharRegexModeTargetFromCurrent() {
    if (!cfmCharRegexMode) return;
    cfmCharRegexExpandedAvatars.clear();
    cfmCharRegexTargetAvatar = getCurrentCharAvatar();
    cfmCharRegexHighlightPath = [];

    if (cfmCharRegexTargetAvatar) {
      const tagMap = getTagMap();
      const charTags = tagMap[cfmCharRegexTargetAvatar] || [];
      const folderIds = getFolderTagIds();
      const charFolderTags = charTags.filter((t) => folderIds.includes(t));
      if (charFolderTags.length > 0) {
        let deepest = charFolderTags[0];
        let maxDepth = getFolderPath(deepest).length;
        for (let i = 1; i < charFolderTags.length; i++) {
          const depth = getFolderPath(charFolderTags[i]).length;
          if (depth > maxDepth) {
            deepest = charFolderTags[i];
            maxDepth = depth;
          }
        }
        cfmCharRegexHighlightPath = getFolderPath(deepest);
        for (const pid of cfmCharRegexHighlightPath) expandedNodes.add(pid);
        selectedTreeNode = deepest;
      } else {
        cfmCharRegexHighlightPath = [];
        selectedTreeNode = "__uncategorized__";
      }
      cfmCharRegexExpandedAvatars.add(cfmCharRegexTargetAvatar);
    }

    renderLeftTree();
    renderRightPane();
    scrollElementIntoViewCentered(() =>
      document.querySelector("#cfm-right-list .cfm-regex-target-row"),
    );
  }

  function refreshPresetRegexModeTargetFromCurrent() {
    if (!cfmPresetRegexMode) return;
    cfmPresetRegexExpandedNames.clear();
    cfmPresetRegexTargetName = getCurrentPresetName();
    cfmPresetRegexHighlightPath = [];

    if (cfmPresetRegexTargetName) {
      const groups = getResourceGroups("presets");
      const tree = getResFolderTree("presets");
      const folderId = groups[cfmPresetRegexTargetName];
      if (folderId && tree[folderId]) {
        cfmPresetRegexHighlightPath = getResFolderPath("presets", folderId);
        for (const pid of cfmPresetRegexHighlightPath) {
          presetExpandedNodes.add(pid);
        }
        selectedPresetFolder = folderId;
      } else {
        cfmPresetRegexHighlightPath = [];
        selectedPresetFolder = "__ungrouped__";
      }
      cfmPresetRegexExpandedNames.add(cfmPresetRegexTargetName);
    }

    renderPresetsView();
    scrollElementIntoViewCentered(() =>
      document.querySelector("#cfm-preset-right-list .cfm-regex-target-row"),
    );
  }

  function refreshActiveViewerStateAfterSelectionChange({
    character = false,
    preset = false,
  } = {}) {
    if (!$("#cfm-overlay").length && !$("#cfm-popup").length) return;
    if (character) {
      if (cfmChatMode) refreshChatModeTargetFromCurrent();
      if (cfmCharRegexMode) refreshCharRegexModeTargetFromCurrent();
    }
    if (preset && cfmPresetRegexMode) {
      refreshPresetRegexModeTargetFromCurrent();
    }
  }

  // ==================== 正则原生状态同步（模块化转发） ====================
  let _regexNativeStateApi = null;
  function getRegexNativeStateApi() {
    if (!_regexNativeStateApi) {
      _regexNativeStateApi = createRegexNativeStateApi({
        $,
        getContext,
      });
    }
    return _regexNativeStateApi;
  }

  /**
   * 同步原生正则引擎状态：清除缓存并刷新原生正则UI面板
   */
  async function syncNativeRegexState() {
    return getRegexNativeStateApi().syncNativeRegexState();
  }

  /**
   * 保存角色正则脚本到服务器
   * @param {string} avatar - 角色的 avatar
   * @param {Array} scripts - 正则脚本列表
   */
  async function saveCharRegexScripts(avatar, scripts) {
    // 1. 同步更新内存中的角色数据（直接修改 characters 数组引用，与原生 writeExtensionField 保持一致）
    const chars = getCharacters();
    const ch = chars.find((c) => c.avatar === avatar);
    if (ch) {
      if (!ch.data) ch.data = {};
      if (!ch.data.extensions) ch.data.extensions = {};
      ch.data.extensions.regex_scripts = scripts;
      // 同步更新 json_data（与原生 writeExtensionField 行为一致，防止后续保存时数据不同步）
      if (ch.json_data) {
        try {
          const jsonData = JSON.parse(ch.json_data);
          if (!jsonData.data) jsonData.data = {};
          if (!jsonData.data.extensions) jsonData.data.extensions = {};
          jsonData.data.extensions.regex_scripts = scripts;
          ch.json_data = JSON.stringify(jsonData);
        } catch (parseErr) {
          console.debug("[CFM] json_data 同步失败:", parseErr);
        }
      }
    }
    // 2. 持久化到服务器
    const ctx = getContext();
    const headers = ctx.getRequestHeaders();
    await fetch("/api/characters/merge-attributes", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        avatar: avatar,
        data: { extensions: { regex_scripts: scripts } },
      }),
    });
    // 3. 清除原生正则引擎缓存 & 刷新原生正则UI
    // 注意：不再调用 ctx.getCharacters()，因为：
    //  - 我们已经直接更新了 characters 数组中的角色对象
    //  - getCharacters() 会触发 selectCharacterById → 异步重建原生正则面板，
    //    导致与 syncNativeRegexState 的同步结果产生时序冲突
    await syncNativeRegexState();
  }

  /**
   * 渲染角色的正则脚本子列表
   * @param {jQuery} charRow - 角色卡行的 jQuery 对象
   * @param {string} avatar - 角色的 avatar
   * @param {Array} scripts - 正则脚本列表
   * @param {string} charName - 角色名称
   * @param {boolean} [isTarget=true] - 是否为当前目标角色（只有目标角色可激活/取消激活正则）
   */

  let _regexSublistApi = null;
  function getRegexSublistApi() {
    if (!_regexSublistApi) {
      _regexSublistApi = createRegexSublistApiCore({
        $,
        applyOwnedRegexBatchActivation,
        cfmConfirm,
        cfmIsTouchDevice,
        cfmToastr,
        createCharScopedRegexFromManager,
        createPresetRegexFromManager,
        escapeHtml,
        flashDraggedElement,
        getContext,
        openNativeCharRegexScriptEditor,
        openNativePresetRegexScriptEditor,
        rerenderCurrentView,
        saveCharRegexScripts,
        savePresetRegexScripts,
        showBatchProgressOverlay,
        startOwnedRegexTransferFlow,
        toggleRegexBatchItem,
        state: {
          get cfmRegexBatchMode() {
            return cfmRegexBatchMode;
          },
          set cfmRegexBatchMode(value) {
            cfmRegexBatchMode = value;
          },
          get cfmRegexBatchSelected() {
            return cfmRegexBatchSelected;
          },
          set cfmRegexBatchSelected(value) {
            cfmRegexBatchSelected = value;
          },
          get cfmRegexBatchRangeMode() {
            return cfmRegexBatchRangeMode;
          },
          set cfmRegexBatchRangeMode(value) {
            cfmRegexBatchRangeMode = value;
          },
          get cfmRegexBatchLastClicked() {
            return cfmRegexBatchLastClicked;
          },
          set cfmRegexBatchLastClicked(value) {
            cfmRegexBatchLastClicked = value;
          },
        },
      });
    }
    return _regexSublistApi;
  }

  function renderCharRegexSubList(
    charRow,
    avatar,
    scripts,
    charName,
    isTarget = true,
  ) {
    return getRegexSublistApi().renderCharRegexSubList(
      charRow,
      avatar,
      scripts,
      charName,
      isTarget,
    );
  }

  /**
   * 正则批量选择切换（支持框选/Shift多选）
   * @param {string} scriptId - 脚本ID
   * @param {boolean} shiftKey - 是否按住了 Shift 键
   * @param {Array} scripts - 当前脚本列表
   */
  function toggleRegexBatchItem(scriptId, shiftKey, scripts) {
    if ((shiftKey || cfmRegexBatchRangeMode) && cfmRegexBatchLastClicked) {
      // 框选：从上次点击到当前点击的范围
      const ids = scripts.map((s) => s.id);
      const lastIdx = ids.indexOf(cfmRegexBatchLastClicked);
      const curIdx = ids.indexOf(scriptId);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        for (let i = start; i <= end; i++) {
          if (ids[i]) cfmRegexBatchSelected.add(ids[i]);
        }
      }
    } else {
      if (cfmRegexBatchSelected.has(scriptId)) {
        cfmRegexBatchSelected.delete(scriptId);
      } else {
        cfmRegexBatchSelected.add(scriptId);
      }
    }
    cfmRegexBatchLastClicked = scriptId;
  }

  async function applyOwnedRegexBatchActivation({
    scripts,
    selectedIds,
    activate,
    save,
    successLabel = "正则脚本",
  }) {
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(selectedIds) ? selectedIds : [])
          .map((id) => String(id || ""))
          .filter(Boolean),
      ),
    );
    if (!normalizedIds.length) {
      cfmToastr.warning("请先选择要操作的正则脚本");
      return false;
    }
    if (!Array.isArray(scripts) || typeof save !== "function") {
      cfmToastr.error("批量激活正则脚本失败：缺少保存上下文");
      return false;
    }

    const touched = [];
    let changedCount = 0;
    for (const scriptId of normalizedIds) {
      const script = scripts.find((item) => item?.id === scriptId);
      if (!script) continue;
      const oldDisabled = !!script.disabled;
      const nextDisabled = !activate;
      if (oldDisabled === nextDisabled) continue;
      touched.push([script, oldDisabled]);
      script.disabled = nextDisabled;
      changedCount++;
    }

    if (!changedCount) {
      cfmToastr.warning("所选正则脚本状态未发生变化");
      return false;
    }

    try {
      await save();
      cfmToastr.success(
        `已${activate ? "激活" : "取消激活"} ${changedCount} 个${successLabel}`,
      );
      return true;
    } catch (error) {
      for (const [script, oldDisabled] of touched) {
        script.disabled = oldDisabled;
      }
      console.error("[CFM] 批量切换正则脚本激活状态失败:", error);
      cfmToastr.error(`保存失败: ${error.message || error}`);
      return false;
    }
  }

  async function applyWorldInfoMultiActivation(bookNames, activate) {
    const normalizedNames = Array.from(
      new Set(
        (Array.isArray(bookNames) ? bookNames : [])
          .map((name) => String(name || ""))
          .filter(Boolean),
      ),
    );
    if (!normalizedNames.length) {
      cfmToastr.warning("请先选择要操作的世界书");
      return false;
    }

    const charBound = await getCharBoundWorldBooks();
    const activeSet = await getActiveWorldInfoSet();
    let changedCount = 0;
    let skippedCount = 0;

    for (const name of normalizedNames) {
      if (charBound.has(name)) {
        skippedCount++;
        continue;
      }
      if (activeSet.has(name) === activate) continue;
      await toggleWorldInfoActivation(name, activate);
      if (activate) activeSet.add(name);
      else activeSet.delete(name);
      syncWiPresetTrackingForManualToggle(name, activate);
      changedCount++;
    }

    if (changedCount > 0) {
      cfmToastr.success(
        `已${activate ? "激活" : "取消激活"} ${changedCount} 个世界书`,
      );
    } else {
      cfmToastr.warning(
        `所选世界书状态未发生变化${skippedCount ? "（角色关联项已自动跳过）" : ""}`,
      );
    }
    if (skippedCount > 0) {
      cfmToastr.info(`已跳过 ${skippedCount} 个角色关联世界书`);
    }
    return changedCount > 0;
  }

  async function applyQrMultiActivation(setNames, activate) {
    return getQuickReplyPresetsApi().applyQrMultiActivation(setNames, activate);
  }

  async function applyGlobalRegexMultiActivation(scriptIds, activate) {
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(scriptIds) ? scriptIds : [])
          .map((id) => String(id || ""))
          .filter(Boolean),
      ),
    );
    if (!normalizedIds.length) {
      cfmToastr.warning("请先选择要操作的正则脚本");
      return false;
    }

    const globalScripts = extension_settings.regex ?? [];
    const touched = [];
    let changedCount = 0;
    for (const scriptId of normalizedIds) {
      const script = globalScripts.find((item) => item?.id === scriptId);
      if (!script) continue;
      const oldDisabled = !!script.disabled;
      const nextDisabled = !activate;
      if (oldDisabled === nextDisabled) continue;
      touched.push([script, oldDisabled]);
      toggleRegexScriptActivation(scriptId, activate);
      changedCount++;
    }

    if (!changedCount) {
      cfmToastr.warning("所选正则脚本状态未发生变化");
      return false;
    }

    try {
      getContext().saveSettingsDebounced();
      await syncNativeRegexState();
      cfmToastr.success(
        `已${activate ? "激活" : "取消激活"} ${changedCount} 个正则脚本`,
      );
      return true;
    } catch (error) {
      for (const [script, oldDisabled] of touched) {
        script.disabled = oldDisabled;
      }
      console.error("[CFM] 批量切换全局正则激活状态失败:", error);
      cfmToastr.error(`保存失败: ${error.message || error}`);
      return false;
    }
  }

  /**
   * 保存预设正则脚本
   * @param {Array} scripts - 正则脚本列表
   * @param {string} [presetName=""] - 目标预设名称；为空时写入当前选中预设
   */
  async function savePresetRegexScripts(scripts, presetName = "") {
    const pm = getContext().getPresetManager();
    const normalizedPresetName = String(presetName || "").trim();
    const nextScripts = Array.isArray(scripts) ? scripts : [];
    if (pm) {
      const currentPresetName = String(getCurrentPresetName() || "").trim();
      if (normalizedPresetName && normalizedPresetName !== currentPresetName) {
        const presetData = getPresetDataForDetail(pm, normalizedPresetName);
        if (!presetData) {
          throw new Error(`找不到预设「${normalizedPresetName}」的数据`);
        }
        const nextPresetData = structuredClone(presetData);
        if (
          !nextPresetData.extensions ||
          typeof nextPresetData.extensions !== "object"
        ) {
          nextPresetData.extensions = {};
        }
        nextPresetData.extensions.regex_scripts = nextScripts;
        await saveNormalizedPresetData(
          pm,
          normalizedPresetName,
          nextPresetData,
        );
      } else {
        await pm.writePresetExtensionField({
          path: "regex_scripts",
          value: nextScripts,
        });
      }
    }
    // 清除原生正则引擎缓存 & 刷新原生正则UI
    await syncNativeRegexState();
  }

  async function openNativePresetRegexScriptEditor(presetName, scriptId) {
    const normalizedPresetName = String(presetName || "").trim();
    const normalizedScriptId = String(scriptId || "").trim();
    if (!normalizedPresetName || !normalizedScriptId) return false;

    const pm = getContext().getPresetManager();
    if (!pm?.select) return false;

    const originalValue = String(pm.select.val() || "");
    let switchedPreset = false;

    const clickNativeEditButton = () => {
      const nativeEl = $(
        `#saved_preset_scripts > #${$.escapeSelector(normalizedScriptId)}`,
      );
      if (!nativeEl.length) return false;
      const editBtn = nativeEl.find(".edit_existing_regex").first();
      const nativeBtn = editBtn.get(0);
      if (!(nativeBtn instanceof HTMLElement)) return false;
      nativeBtn.click();
      return true;
    };

    const syncTargetPresetSelection = async () => {
      const targetValue = findPresetSelectValueByName(pm, normalizedPresetName);
      const currentValue = String(pm.select.val() || "");
      if (!targetValue) return "";
      if (currentValue === String(targetValue)) return String(targetValue);

      switchedPreset = true;
      const presetChangedPromise = new Promise((resolve) => {
        const ctx = getContext();
        const evtSource = ctx?.eventSource;
        const evtTypes = ctx?.eventTypes;
        const eventType = evtTypes?.OAI_PRESET_CHANGED_AFTER;
        if (!eventType || !evtSource) {
          window.setTimeout(resolve, 800);
          return;
        }
        let resolved = false;
        const handler = () => {
          if (resolved) return;
          resolved = true;
          try {
            evtSource.removeListener(eventType, handler);
          } catch {}
          window.setTimeout(resolve, 120);
        };
        evtSource.once(eventType, handler);
        window.setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try {
              evtSource.removeListener(eventType, handler);
            } catch {}
            resolve();
          }
        }, 3000);
      });

      pm.select.val(targetValue);
      pm.select.trigger("change");
      await presetChangedPromise;
      return String(targetValue);
    };

    beginSuppressPresetRegexToast();
    try {
      const targetValue = await syncTargetPresetSelection();
      const start = Date.now();
      while (Date.now() - start < 3200) {
        if (
          (!targetValue ||
            String(pm.select.val() || "") === String(targetValue)) &&
          clickNativeEditButton()
        ) {
          if (
            switchedPreset &&
            originalValue &&
            String(targetValue || "") !== originalValue
          ) {
            _presetValueToRestore = originalValue;
            bindNativePopupCleanup();
          }
          return true;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }

      if (
        switchedPreset &&
        originalValue &&
        String(pm.select.val() || "") !== originalValue
      ) {
        pm.select.val(originalValue);
        pm.select.trigger("change");
      }
      return false;
    } finally {
      endSuppressPresetRegexToast();
    }
  }

  /**
   * 打开非当前角色的正则脚本编辑器
   * 对当前角色直接触发原生编辑按钮；对非当前角色，加载原生编辑器模板自行弹出编辑窗口。
   * @param {string} avatar - 角色的 avatar
   * @param {string} scriptId - 正则脚本 ID
   * @param {Array} scripts - 该角色的正则脚本列表（引用）
   * @param {string} [charName] - 角色名称
   * @returns {Promise<boolean>} 是否成功打开编辑器
   */
  async function openNativeCharRegexScriptEditor(
    avatar,
    scriptId,
    scripts,
    charName,
  ) {
    const normalizedScriptId = String(scriptId || "").trim();
    if (!avatar || !normalizedScriptId) return false;

    // 当前角色 → 直接使用原生 DOM 上的编辑按钮
    const nativeEl = $(
      `#saved_scoped_scripts > #${$.escapeSelector(normalizedScriptId)}`,
    );
    if (nativeEl.length) {
      const editBtn = nativeEl.find(".edit_existing_regex").first();
      const nativeBtn = editBtn.get(0);
      if (nativeBtn instanceof HTMLElement) {
        nativeBtn.click();
        return true;
      }
    }

    // 非当前角色 → 加载原生编辑器模板，自行弹出
    try {
      const engine = await import("../../regex/engine.js");
      const { renderExtensionTemplateAsync } =
        await import("../../../extensions.js");
      const { callGenericPopup, POPUP_TYPE: PT } =
        await import("../../../popup.js");

      const scriptIdx = scripts.findIndex(
        (s) => String(s?.id || "") === normalizedScriptId,
      );
      if (scriptIdx === -1) {
        cfmToastr.warning("未找到该正则脚本");
        return false;
      }
      const script = scripts[scriptIdx];

      const editorHtml = $(
        await renderExtensionTemplateAsync("regex", "editor"),
      );

      // 填入现有值
      if (script.scriptName) {
        editorHtml.find(".regex_script_name").val(script.scriptName);
      }
      editorHtml.find(".find_regex").val(script.findRegex || "");
      editorHtml.find(".regex_replace_string").val(script.replaceString || "");
      editorHtml
        .find(".regex_trim_strings")
        .val(script.trimStrings?.join("\n") || "");
      editorHtml
        .find('input[name="disabled"]')
        .prop("checked", script.disabled ?? false);
      editorHtml
        .find('input[name="only_format_display"]')
        .prop("checked", script.markdownOnly ?? false);
      editorHtml
        .find('input[name="only_format_prompt"]')
        .prop("checked", script.promptOnly ?? false);
      editorHtml
        .find('input[name="run_on_edit"]')
        .prop("checked", script.runOnEdit ?? false);
      editorHtml
        .find('select[name="substitute_regex"]')
        .val(script.substituteRegex ?? 0);
      editorHtml.find('input[name="min_depth"]').val(script.minDepth ?? "");
      editorHtml.find('input[name="max_depth"]').val(script.maxDepth ?? "");

      if (Array.isArray(script.placement)) {
        script.placement.forEach((element) => {
          editorHtml
            .find(`input[name="replace_position"][value="${element}"]`)
            .prop("checked", true);
        });
      }

      // 测试模式切换
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

      const popupResult = await callGenericPopup(editorHtml, PT.CONFIRM, "", {
        okButton: "Save",
        cancelButton: "Cancel",
        allowVerticalScrolling: true,
      });

      if (popupResult) {
        script.scriptName = String(editorHtml.find(".regex_script_name").val());
        script.findRegex = String(editorHtml.find(".find_regex").val());
        script.replaceString = String(
          editorHtml.find(".regex_replace_string").val(),
        );
        script.trimStrings =
          String(editorHtml.find(".regex_trim_strings").val())
            .split("\n")
            .filter((e) => e.length !== 0) || [];
        script.placement =
          editorHtml
            .find('input[name="replace_position"]')
            .filter(":checked")
            .map(function () {
              return parseInt($(this).val().toString());
            })
            .get()
            .filter((e) => !isNaN(e)) || [];
        script.disabled = editorHtml
          .find('input[name="disabled"]')
          .prop("checked");
        script.markdownOnly = editorHtml
          .find('input[name="only_format_display"]')
          .prop("checked");
        script.promptOnly = editorHtml
          .find('input[name="only_format_prompt"]')
          .prop("checked");
        script.runOnEdit = editorHtml
          .find('input[name="run_on_edit"]')
          .prop("checked");
        script.substituteRegex = Number(
          editorHtml.find('select[name="substitute_regex"]').val(),
        );
        script.minDepth = parseInt(
          String(editorHtml.find('input[name="min_depth"]').val()),
        );
        script.maxDepth = parseInt(
          String(editorHtml.find('input[name="max_depth"]').val()),
        );

        await saveCharRegexScripts(avatar, scripts);
        rerenderCurrentView();
        cfmToastr.success(`角色「${charName || avatar}」的正则脚本已更新`);
      }
      return true;
    } catch (err) {
      console.error("[CFM] 打开角色正则编辑器失败:", err);
      cfmToastr.error("打开编辑器失败: " + (err?.message || err));
      return false;
    }
  }

  /**
   * 渲染预设的正则脚本子列表
   * @param {jQuery} presetRow - 预设行的 jQuery 对象
   * @param {string} presetName - 预设名称
   * @param {Array} scripts - 正则脚本列表
   * @param {boolean} [isTarget=true] - 是否为当前目标预设（只有目标预设可激活/取消激活正则）
   */
  function renderPresetRegexSubList(
    presetRow,
    presetName,
    scripts,
    isTarget = true,
  ) {
    return getRegexSublistApi().renderPresetRegexSubList(
      presetRow,
      presetName,
      scripts,
      isTarget,
    );
  }

  /**
   * 获取角色的聊天记录列表（带缓存）
   * @param {string} avatar - 角色的 avatar 文件名
   * @returns {Promise<Array>} 聊天记录列表
   */
  function createChatlogCacheApi() {
    return createChatlogCacheApiCore({
      fetch: window.fetch.bind(window),
      getCharacters,
      getContext,
      getPastCharacterChatsFunc,
      state: {
        get cfmChatCache() {
          return cfmChatCache;
        },
      },
    });
  }

  async function getCharChats(avatar) {
    return await createChatlogCacheApi().getCharChats(avatar);
  }

  async function invalidateChatCache(avatar) {
    return await createChatlogCacheApi().invalidateChatCache(avatar);
  }

  /**
   * 正则脚本重命名弹窗（cfm-edit-popup 风格）
   * @param {string} currentName - 当前脚本名称
   * @returns {Promise<string|null>} 新名称或 null（取消时）
   */
  function showRegexRenamePopup(currentName) {
    return new Promise((resolve) => {
      const popupHtml = `
        <div class="cfm-edit-popup-overlay">
          <div class="cfm-edit-popup">
            <div class="cfm-edit-popup-title">重命名正则脚本</div>
            <div class="cfm-edit-popup-names"><span class="cfm-edit-popup-name-tag">${escapeHtml(currentName)}</span></div>
            <div class="cfm-edit-popup-field">
              <label>新名称</label>
              <input type="text" class="cfm-edit-input" id="cfm-regex-rename-input" value="${escapeHtml(currentName)}" placeholder="输入新名称">
            </div>
            <div class="cfm-edit-popup-actions">
              <button class="cfm-btn cfm-edit-popup-cancel">取消</button>
              <button class="cfm-btn cfm-edit-popup-confirm">确认</button>
            </div>
          </div>
        </div>`;
      const overlay = $(popupHtml);
      $("body").append(overlay);
      overlay.find("#cfm-regex-rename-input").trigger("focus").select();
      overlay.find(".cfm-edit-popup-cancel").on("click", () => {
        overlay.remove();
        resolve(null);
      });
      overlay.find(".cfm-edit-popup-overlay").on("click", (e) => {
        if ($(e.target).hasClass("cfm-edit-popup-overlay")) {
          overlay.remove();
          resolve(null);
        }
      });
      overlay.find(".cfm-edit-popup-confirm").on("click", () => {
        const newName = overlay.find("#cfm-regex-rename-input").val().trim();
        overlay.remove();
        resolve(newName || null);
      });
      overlay.find("#cfm-regex-rename-input").on("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          overlay.find(".cfm-edit-popup-confirm").trigger("click");
        }
        if (e.key === "Escape") {
          overlay.find(".cfm-edit-popup-cancel").trigger("click");
        }
      });
    });
  }

  /**
   * 聊天记录重命名弹窗（cfm-edit-popup 风格）
   */
  function showChatRenamePopup(chatName) {
    return createChatlogRenameApi().showChatRenamePopup(chatName);
  }

  /**
   * 聊天记录备注弹窗（cfm-edit-popup 风格）
   */
  function showChatNotePopup(chatName, currentNote) {
    return createChatlogNotesApi().showChatNotePopup(chatName, currentNote);
  }

  /**
   * 重命名聊天记录
   */
  async function renameChatFile(avatar, oldFileName, newName) {
    return await createChatlogRenameApi().renameChatFile(
      avatar,
      oldFileName,
      newName,
    );
  }

  /**
   * 删除聊天记录
   */
  function createChatlogImportExportApi() {
    return createChatlogImportExportApiCore({
      cfmConfirm,
      cfmToastr,
      closeMainPopup,
      document,
      fetch: window.fetch.bind(window),
      getCharNameByAvatar,
      getCharacters,
      getChatlogTargetAvatar,
      getContext,
      importCharacterChatFunc,
      deleteCharacterChatByNameFunc,
      invalidateChatCache,
      openCharacterChatFunc,
      refreshActiveViewerStateAfterSelectionChange,
      rerenderCurrentView,
      saveChatNotes,
      showBatchProgressOverlay,
      showImportFailureDialog,
      state: {
        get cfmChatNotes() {
          return cfmChatNotes;
        },
        set cfmChatNotes(value) {
          cfmChatNotes = value;
        },
        get cfmChatBatchSelected() {
          return cfmChatBatchSelected;
        },
      },
      URL,
      window,
    });
  }

  async function deleteChatFile(avatar, chatFileName) {
    return await createChatlogImportExportApi().deleteChatFile(
      avatar,
      chatFileName,
    );
  }

  async function exportChatFile(avatar, chatFileName, format = "jsonl") {
    return await createChatlogImportExportApi().exportChatFile(
      avatar,
      chatFileName,
      format,
    );
  }

  async function exportChatlogFiles(chatFileNames) {
    return await createChatlogImportExportApi().exportChatlogFiles(
      chatFileNames,
    );
  }

  async function openChatFile(avatar, chatFileName) {
    return await createChatlogImportExportApi().openChatFile(
      avatar,
      chatFileName,
    );
  }

  async function importChatFiles(avatar, files) {
    return await createChatlogImportExportApi().importChatFiles(avatar, files);
  }

  // ==================== 聊天置顶管理 ====================

  let chatlogPinningApiInstance = null;

  function createChatlogPinningApi() {
    if (!chatlogPinningApiInstance) {
      chatlogPinningApiInstance = createChatlogPinningApiCore({
        CSS,
        Node,
        MutationObserver,
        cfmToastr,
        document,
        escapeHtml,
        fetch: window.fetch.bind(window),
        getCharacters,
        getContext,
        getThumbnailUrl,
        openChatFile,
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        settings: extension_settings[extensionName],
      });
    }
    chatlogPinningApiInstance.setEnhanceRecentChatsWithNotesCallback(
      enhanceRecentChatsWithNotes,
    );
    return chatlogPinningApiInstance;
  }

  function getPinnedChats() {
    return createChatlogPinningApi().getPinnedChats();
  }

  function isChatPinned(avatar, chatFileName) {
    return createChatlogPinningApi().isChatPinned(avatar, chatFileName);
  }

  function togglePinChat(avatar, chatFileName) {
    return createChatlogPinningApi().togglePinChat(avatar, chatFileName);
  }

  function toggleChatPin(avatar, chatFileName) {
    return createChatlogPinningApi().toggleChatPin(avatar, chatFileName);
  }

  function scheduleWelcomeRecentChatRefresh() {
    return createChatlogPinningApi().scheduleWelcomeRecentChatRefresh();
  }

  function applyPinnedChatsToWelcomeScreen() {
    return createChatlogPinningApi().applyPinnedChatsToWelcomeScreen();
  }

  async function fetchAndInsertMissingPinnedChats(
    recentList,
    missingPinned,
    insertBefore,
  ) {
    return await createChatlogPinningApi().fetchAndInsertMissingPinnedChats(
      recentList,
      missingPinned,
      insertBefore,
    );
  }

  function initPinnedChatHook() {
    return createChatlogPinningApi().initPinnedChatHook();
  }

  // ==================== 增强原生聊天管理弹窗 & 最近聊天显示备注 ====================

  let chatlogNativeEnhancerApiInstance = null;

  function createChatlogNativeEnhancerApi() {
    if (!chatlogNativeEnhancerApiInstance) {
      chatlogNativeEnhancerApiInstance = createChatlogNativeEnhancerApiCore({
        Node,
        MutationObserver,
        document,
        getCurrentCharAvatar,
        initChatNotes,
        isChatPinned,
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        saveChatNotes,
        showChatNotePopup,
        state: {
          get cfmChatNotes() {
            return cfmChatNotes;
          },
          set cfmChatNotes(value) {
            cfmChatNotes = value;
          },
        },
        togglePinChat,
      });
    }
    return chatlogNativeEnhancerApiInstance;
  }

  function setupNativeChatPopupEnhancer() {
    return createChatlogNativeEnhancerApi().setupNativeChatPopupEnhancer();
  }

  function enhanceNativeChatPopup() {
    return createChatlogNativeEnhancerApi().enhanceNativeChatPopup();
  }

  function enhanceRecentChatsWithNotes() {
    return createChatlogNativeEnhancerApi().enhanceRecentChatsWithNotes();
  }

  function initRecentChatNotesHook() {
    return createChatlogNativeEnhancerApi().initRecentChatNotesHook();
  }

  /**
   * 导入聊天记录文件
   * @param {string} avatar - 角色的 avatar 文件名
   * @param {FileList} files - 要导入的文件列表
   */
  function getEventClientX(e) {
    return getEventClientXCore(e);
  }

  function scrollElementIntoViewCentered(target) {
    return scrollElementIntoViewCenteredCore(target);
  }

  function getLatestWorldInfoCollapseTargetName() {
    if (cfmWorldInfoEntryLastFocusedName)
      return String(cfmWorldInfoEntryLastFocusedName);
    const openDetailNames = Array.from(cfmWorldInfoEntryOpenDetails.keys());
    if (openDetailNames.length > 0) {
      return String(openDetailNames[openDetailNames.length - 1] || "");
    }
    const expandedNames = Array.from(cfmWorldInfoEntryExpandedNames);
    return String(expandedNames[expandedNames.length - 1] || "");
  }

  function scrollWorldInfoRowIntoView(bookName) {
    const normalizedName = String(bookName || "");
    if (!normalizedName) return;
    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll(
          "#cfm-worldinfo-right-list .cfm-row[data-res-id]",
        ),
      ).find((el) => el.getAttribute("data-res-id") === normalizedName),
    );
  }

  function getLatestQrCollapseTargetName() {
    if (cfmQrLastFocusedSetName) return String(cfmQrLastFocusedSetName);
    const expandedNames = Array.from(qrItemExpandedSets);
    return String(expandedNames[expandedNames.length - 1] || "");
  }

  function scrollQrRowIntoView(setName) {
    const normalizedName = String(setName || "");
    if (!normalizedName) return;
    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll("#cfm-qr-right-list .cfm-row[data-res-id]"),
      ).find((el) => el.getAttribute("data-res-id") === normalizedName),
    );
  }

  function revealCurrentCharFromTabClick() {
    const avatar = getCurrentCharAvatar();
    if (!avatar) return false;

    const tagMap = getTagMap();
    const charTags = tagMap[avatar] || [];
    const folderIds = getFolderTagIds();
    const charFolderTags = charTags.filter((t) => folderIds.includes(t));
    if (charFolderTags.length > 0) {
      let deepest = charFolderTags[0];
      let maxDepth = getFolderPath(deepest).length;
      for (let i = 1; i < charFolderTags.length; i++) {
        const depth = getFolderPath(charFolderTags[i]).length;
        if (depth > maxDepth) {
          deepest = charFolderTags[i];
          maxDepth = depth;
        }
      }
      for (const pid of getFolderPath(deepest)) expandedNodes.add(pid);
      selectedTreeNode = deepest;
    } else {
      selectedTreeNode = "__uncategorized__";
    }

    cfmCharDetailExpandedAvatars.add(avatar);
    renderLeftTree();
    renderRightPane();
    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll("#cfm-right-list .cfm-row[data-avatar]"),
      ).find((el) => el.getAttribute("data-avatar") === avatar),
    );
    return true;
  }

  function revealCurrentPresetFromTabClick() {
    const presetName = getCurrentPresetName();
    if (!presetName) return false;

    const groups = getResourceGroups("presets");
    const tree = getResFolderTree("presets");
    const folderId = groups[presetName];
    if (folderId && tree[folderId]) {
      const path = getResFolderPath("presets", folderId);
      for (const pid of path) presetExpandedNodes.add(pid);
      selectedPresetFolder = folderId;
    } else {
      selectedPresetFolder = "__ungrouped__";
    }

    cfmPresetDetailExpandedNames.add(presetName);
    renderPresetsView();
    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll(
          "#cfm-preset-right-list .cfm-row[data-res-id]",
        ),
      ).find((el) => el.getAttribute("data-res-id") === presetName),
    );
    return true;
  }

  function revealCurrentPersonaFromTabClick() {
    const avatarId = getCurrentPersonaAvatar();
    if (!avatarId) return false;

    const groups = getResourceGroups("personas");
    const tree = getResFolderTree("personas");
    const folderId = groups[avatarId];
    if (folderId && tree[folderId]) {
      const path = getResFolderPath("personas", folderId);
      for (const pid of path) personaExpandedNodes.add(pid);
      selectedPersonaFolder = folderId;
    } else {
      selectedPersonaFolder = "__ungrouped__";
    }

    personaItemExpandedIds.add(avatarId);
    renderPersonasView();
    scrollElementIntoViewCentered(() =>
      Array.from(
        document.querySelectorAll(
          "#cfm-persona-right-list .cfm-row[data-res-id]",
        ),
      ).find((el) => el.getAttribute("data-res-id") === avatarId),
    );
    return true;
  }

  function handleCurrentTabRelocate(tab) {
    if (tab === "chars") return revealCurrentCharFromTabClick();
    if (tab === "presets") return revealCurrentPresetFromTabClick();
    if (tab === "personas") return revealCurrentPersonaFromTabClick();
    return false;
  }

  let _chatSublistApi = null;
  function getChatSublistApi() {
    if (!_chatSublistApi) {
      _chatSublistApi = createChatSublistApi({
        $,
        cfmConfirm,
        cfmToastr,
        deleteChatFile,
        escapeHtml,
        exportChatFile,
        getCharacters,
        getContext,
        getEventClientX,
        getLatestQrCollapseTargetName,
        importChatFiles,
        isChatPinned,
        openChatFile,
        renameChatFile,
        rerenderCurrentView,
        saveChatNotes,
        scrollElementIntoViewCentered,
        scrollQrRowIntoView,
        showBatchProgressOverlay,
        showChatNotePopup,
        showChatRenamePopup,
        toggleChatBatchItem,
        togglePinChat,
        state: {
          get cfmChatBatchMode() {
            return cfmChatBatchMode;
          },
          set cfmChatBatchMode(value) {
            cfmChatBatchMode = value;
          },
          get cfmChatBatchSelected() {
            return cfmChatBatchSelected;
          },
          set cfmChatBatchSelected(value) {
            cfmChatBatchSelected = value;
          },
          get cfmChatBatchRangeMode() {
            return cfmChatBatchRangeMode;
          },
          set cfmChatBatchRangeMode(value) {
            cfmChatBatchRangeMode = value;
          },
          get cfmChatBatchLastClicked() {
            return cfmChatBatchLastClicked;
          },
          set cfmChatBatchLastClicked(value) {
            cfmChatBatchLastClicked = value;
          },
          get cfmChatlogTargetAvatar() {
            return cfmChatlogTargetAvatar;
          },
          set cfmChatlogTargetAvatar(value) {
            cfmChatlogTargetAvatar = value;
          },
          get selectedChatlogFolder() {
            return selectedChatlogFolder;
          },
          set selectedChatlogFolder(value) {
            selectedChatlogFolder = value;
          },
          get _switchResourceTabFn() {
            return _switchResourceTabFn;
          },
          set _switchResourceTabFn(value) {
            _switchResourceTabFn = value;
          },
          get cfmChatNotes() {
            return cfmChatNotes;
          },
          set cfmChatNotes(value) {
            cfmChatNotes = value;
          },
          get cfmQrLastFocusedSetName() {
            return cfmQrLastFocusedSetName;
          },
          set cfmQrLastFocusedSetName(value) {
            cfmQrLastFocusedSetName = value;
          },
        },
      });
    }
    return _chatSublistApi;
  }

  function tryCollapseSublistFromOuterGap(e) {
    return getChatSublistApi().tryCollapseSublistFromOuterGap(e);
  }

  $(document)
    .off("click.cfmSublistOuterGapCollapse")
    .on("click.cfmSublistOuterGapCollapse", (e) => {
      tryCollapseSublistFromOuterGap(e);
    });

  /**
   * 渲染角色的聊天记录子列表
   * @param {jQuery} charRow - 角色卡行的 jQuery 对象
   * @param {string} avatar - 角色的 avatar
   * @param {Array} chats - 聊天记录列表
   */
  function renderChatSubList(charRow, avatar, chats) {
    return getChatSublistApi().renderChatSubList(charRow, avatar, chats);
  }

  // ==================== 快速编辑角色卡（已模块化到 ui/panels/character-detail.js） ====================
  let _charDetailApi = null;
  function getCharDetailApi() {
    if (!_charDetailApi) {
      _charDetailApi = createCharDetailApi({
        $,
        escapeHtml,
        cfmToastr,
        getContext,
        showBatchProgressOverlay,
      });
    }
    return _charDetailApi;
  }

  // 显示编辑弹窗（支持单个或批量）
  async function showEditPopup(avatars) {
    return getCharDetailApi().showEditPopup(avatars);
  }

  // 执行角色卡编辑
  async function executeCharEdit(avatars) {
    return getCharDetailApi().executeCharEdit(avatars);
  }
  // ==================== PC 端拖拽辅助（已模块化到 features/dragdrop/desktop.js） ====================
  // 共享依赖：拖拽三件套所需的 getter/setter 与业务函数
  function getPcDragDeps() {
    return {
      $,
      document,
      getPcDragData: () => _pcDragData,
      setPcDragData: (v) => {
        _pcDragData = v;
      },
      getPcDropHandled: () => _pcDropHandled,
      setPcDropHandled: (v) => {
        _pcDropHandled = v;
      },
      getPcLastResourceFolderHoverTarget: () =>
        _pcLastResourceFolderHoverTarget,
      setPcLastResourceFolderHoverTarget: (v) => {
        _pcLastResourceFolderHoverTarget = v;
      },
      flashDraggedElement,
      buildDraggedHighlightSelector,
      clearMultiSelect,
      setItemGroup,
      getTagName,
      getResFolderDisplayName,
      handleCharDropToFolder,
      reorderFolder,
      reorderResFolder,
      wouldCreateCycle,
      wouldCreateResCycle,
      sortFolders,
      getChildFolders,
      sortResFolders,
      getResChildFolders,
      getResFolderTree,
      moveRegexFolder,
      getGlobalScripts: () => getRegexGlobalScripts(),
      getExtensionSettings: () =>
        typeof getContext === "function" ? getContext().extensionSettings : {},
      getExtensionName: () => extensionName,
      getConfig: () => config,
      getContext,
      getCurrentResourceType: () => currentResourceType,
      renderLeftTree,
      renderRightPane,
      renderPresetsView,
      renderWorldInfoView,
      renderThemesView,
      renderBackgroundsView,
      renderPersonasView,
      renderQRView,
      renderRegexView,
      cfmToastr,
    };
  }

  function cfmDebugDragLog(stage, payload = {}) {
    return cfmDebugDragLogCore(stage, payload);
  }
  function pcDragStart(e, dragData) {
    return pcDragStartCore(e, dragData, getPcDragDeps());
  }
  function pcGetDropData(e) {
    return pcGetDropDataCore(e, getPcDragDeps());
  }
  function ensureDragLocateHighlightStyle() {
    return ensureDragLocateHighlightStyleCore({ document });
  }
  function buildDraggedHighlightSelector(dragData) {
    return buildDraggedHighlightSelectorCore(dragData, { $ });
  }
  function flashDraggedElement(target, duration = 1000, options = {}) {
    return flashDraggedElementCore(target, duration, options, { $, document });
  }
  function pcDragEnd() {
    return pcDragEndCore(getPcDragDeps());
  }

  function showMainPopup() {
    if ($("#cfm-overlay").length > 0) return;
    // 面板打开期间常驻屏蔽“正则重载聊天”原生 toast（上移/下移/拖拽排序等操作不再弹出遮挡）
    setPresetRegexToastPersistentSuppress(true);
    $("#cfm-topbar-button .drawer-icon")
      .removeClass("closedIcon")
      .addClass("openIcon");
    // 每次打开主弹窗时检测新标签
    detectAndImportNewTags();
    config = loadConfig(); // 刷新配置
    // 根据默认打开页面配置决定初始资源类型
    const defaultPage =
      extension_settings[extensionName].defaultOpenPage || "chars";
    const lastState = extension_settings[extensionName].lastOpenState || {};
    let initialTab = "chars";
    if (defaultPage === "last" && lastState.resourceType) {
      initialTab = lastState.resourceType;
    } else if (defaultPage !== "last") {
      initialTab = defaultPage;
    }
    // 如果选中的标签页被隐藏了，回退到第一个可见标签页
    const visibleTabIds = getVisibleTabs();
    if (!visibleTabIds.includes(initialTab)) {
      initialTab = visibleTabIds[0] || "chars";
    }
    currentResourceType = initialTab;
    selectedTreeNode = null;
    expandedNodes.clear();
    // 每次打开弹窗时重置聊天记录页目标角色为当前角色，确保始终跟随当前角色
    cfmChatlogTargetAvatar = null;
    selectedChatlogFolder = null;
    selectedPresetFolder = null;
    selectedWorldInfoFolder = null;
    selectedThemeFolder = null;
    selectedBgFolder = null;
    selectedPersonaFolder = null;
    selectedRegexNode = null;
    selectedQrFolder = null;
    chatlogExpandedNodes.clear();
    presetExpandedNodes.clear();
    worldInfoExpandedNodes.clear();
    themeExpandedNodes.clear();
    bgExpandedNodes.clear();
    personaExpandedNodes.clear();
    regexExpandedNodes.clear();
    qrExpandedNodes.clear();
    // 如果是"记住上次页面"模式，恢复文件夹选中状态（但不恢复展开状态，默认全部收起）
    if (defaultPage === "last" && lastState.resourceType) {
      const folder = lastState.selectedFolder;
      if (initialTab === "chars") {
        selectedTreeNode = folder || null;
        // 仅展开到选中文件夹的路径，使选中状态可见
        if (selectedTreeNode) {
          const fullPath = getFolderPath(selectedTreeNode);
          // 排除最后一个（即选中节点本身），只展开其祖先
          for (let i = 0; i < fullPath.length - 1; i++)
            expandedNodes.add(fullPath[i]);
        }
      } else if (initialTab === "presets") {
        selectedPresetFolder = folder || null;
        if (selectedPresetFolder) {
          const fullPath = getResFolderPath("presets", selectedPresetFolder);
          for (let i = 0; i < fullPath.length - 1; i++)
            presetExpandedNodes.add(fullPath[i]);
        }
      } else if (initialTab === "worldinfo") {
        selectedWorldInfoFolder = folder || null;
        if (selectedWorldInfoFolder) {
          const fullPath = getResFolderPath(
            "worldinfo",
            selectedWorldInfoFolder,
          );
          for (let i = 0; i < fullPath.length - 1; i++)
            worldInfoExpandedNodes.add(fullPath[i]);
        }
      } else if (initialTab === "themes") {
        selectedThemeFolder = folder || null;
        if (selectedThemeFolder) {
          const fullPath = getResFolderPath("themes", selectedThemeFolder);
          for (let i = 0; i < fullPath.length - 1; i++)
            themeExpandedNodes.add(fullPath[i]);
        }
      } else if (initialTab === "backgrounds") {
        selectedBgFolder = folder || null;
        if (selectedBgFolder) {
          const fullPath = getResFolderPath("backgrounds", selectedBgFolder);
          for (let i = 0; i < fullPath.length - 1; i++)
            bgExpandedNodes.add(fullPath[i]);
        }
      } else if (initialTab === "personas") {
        selectedPersonaFolder = folder || null;
        if (selectedPersonaFolder) {
          const fullPath = getResFolderPath("personas", selectedPersonaFolder);
          for (let i = 0; i < fullPath.length - 1; i++)
            personaExpandedNodes.add(fullPath[i]);
        }
      } else if (initialTab === "regex") {
        selectedRegexNode = folder || null;
        if (
          selectedRegexNode &&
          selectedRegexNode !== "__favorites__" &&
          selectedRegexNode !== "__ungrouped__"
        ) {
          const folderTree =
            extension_settings[extensionName].regexFolderTree || {};
          const path = [];
          let cur = selectedRegexNode;
          while (cur && folderTree[cur]) {
            path.unshift(cur);
            cur = folderTree[cur].parentId;
          }
          for (let i = 0; i < path.length - 1; i++)
            regexExpandedNodes.add(path[i]);
        }
      } else if (initialTab === "quickreply") {
        selectedQrFolder = folder || null;
        if (selectedQrFolder) {
          const fullPath = getResFolderPath("quickreply", selectedQrFolder);
          for (let i = 0; i < fullPath.length - 1; i++)
            qrExpandedNodes.add(fullPath[i]);
        }
      }
    }

    // 预加载世界书数据，保存 Promise 以便切换标签时直接复用
    // 不再每次打开都清空缓存，避免世界书页反复白屏等待
    _worldInfoPreloadPromise = getWorldInfoNames();
    // 预加载 world-info.js 模块（后台，不阻塞），使后续 getActiveWorldInfoSet/getCharBoundWorldBooks 能同步读取
    ensureWiModule();
    // 预加载 persona 列表（后台，不阻塞），使切到 User 标签时缓存已可用
    _personasPreloadPromise = getCurrentPersonas();

    // ==================== 主弹窗外壳（已模块化到 ui/modal/shell.js） ====================
    const { overlay, popup, menuTabs } = buildMainPopupShell({
      $,
      window,
      cfmCopyMode,
      initialTab,
      CFM_TAB_META,
      getVisibleTabs,
      getMenuTabs,
      extension_settings,
      extensionName,
      getPcDragData: () => _pcDragData,
    });

    // 应用自定义外观
    applyCustomStyle();

    // 移动端行为：栏高拖动 + 触摸误触抑制（已模块化到 ui/modal/shell.js）
    bindMainPopupMobileBehaviors({
      $,
      window,
      popup,
      extension_settings,
      extensionName,
    });

    // 如果初始tab不是chars，动态切换tab/视图/搜索栏的显示状态
    if (initialTab !== "chars") {
      popup.find(".cfm-tab").removeClass("cfm-tab-active");
      popup
        .find(`.cfm-tab[data-tab="${initialTab}"]`)
        .addClass("cfm-tab-active");
      if (menuTabs.includes(initialTab)) {
        popup.find(".cfm-tab-menu-btn").addClass("cfm-tab-active");
        popup
          .find(`.cfm-tab-menu-item[data-tab="${initialTab}"]`)
          .addClass("cfm-tab-menu-item-active");
      }
      // 切换视图
      popup.find("#cfm-chars-view").hide();
      popup.find("#cfm-chatlogs-view").toggle(initialTab === "chatlogs");
      popup.find("#cfm-presets-view").toggle(initialTab === "presets");
      popup.find("#cfm-worldinfo-view").toggle(initialTab === "worldinfo");
      popup.find("#cfm-themes-view").toggle(initialTab === "themes");
      popup.find("#cfm-backgrounds-view").toggle(initialTab === "backgrounds");
      popup.find("#cfm-personas-view").toggle(initialTab === "personas");
      popup.find("#cfm-regex-view").toggle(initialTab === "regex");
      popup.find("#cfm-qr-view").toggle(initialTab === "quickreply");
      // 切换搜索栏
      popup.find("#cfm-global-search-bar").hide();
      popup.find("#cfm-chatlogs-search-bar").toggle(initialTab === "chatlogs");
      popup.find("#cfm-preset-search-bar").toggle(initialTab === "presets");
      popup
        .find("#cfm-worldinfo-search-bar")
        .toggle(initialTab === "worldinfo");
      popup.find("#cfm-theme-search-bar").toggle(initialTab === "themes");
      popup.find("#cfm-bg-search-bar").toggle(initialTab === "backgrounds");
      popup.find("#cfm-persona-search-bar").toggle(initialTab === "personas");
      popup.find("#cfm-regex-search-bar").toggle(initialTab === "regex");
      popup.find("#cfm-qr-search-bar").toggle(initialTab === "quickreply");
      // 切换header按钮
      if (initialTab === "chars") {
        const btn = popup.find("#cfm-btn-copymode");
        btn.show();
        btn.toggleClass("cfm-copymode-active", cfmCopyMode);
        btn.html(
          `<i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}`,
        );
      } else {
        popup.find("#cfm-btn-copymode").hide();
      }
    }

    // 应用工具栏按钮可见性（根据自定义布局配置）
    applyAllToolbarVisibility();

    const switchResourceTab = createResourceTabSwitcher({
      $,
      popup,
      handleCurrentTabRelocate,
      getCurrentResourceType: () => currentResourceType,
      setCurrentResourceType: (v) => {
        currentResourceType = v;
      },
      clearMultiSelect,
      getCfmMultiSelectMode: () => cfmMultiSelectMode,
      setCfmMultiSelectMode: (v) => {
        cfmMultiSelectMode = v;
      },
      setCfmMultiSelectRangeMode: (v) => {
        cfmMultiSelectRangeMode = v;
      },
      getCfmExportMode: () => cfmExportMode,
      getCfmResDeleteMode: () => cfmResDeleteMode,
      getCfmThemeNoteMode: () => cfmThemeNoteMode,
      getCfmBgNoteMode: () => cfmBgNoteMode,
      getCfmPresetNoteMode: () => cfmPresetNoteMode,
      getCfmWorldInfoNoteMode: () => cfmWorldInfoNoteMode,
      getCfmQrNoteMode: () => cfmQrNoteMode,
      getCfmPersonaNoteMode: () => cfmPersonaNoteMode,
      getCfmPresetRenameMode: () => cfmPresetRenameMode,
      getCfmWorldInfoRenameMode: () => cfmWorldInfoRenameMode,
      getCfmQrRenameMode: () => cfmQrRenameMode,
      getCfmCopyMode: () => cfmCopyMode,
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
    }).switchResourceTab;
    _switchResourceTabFn = switchResourceTab;

    // 主tab/header按钮/overlay 事件绑定（已模块化到 ui/modal/shell.js）
    bindMainPopupHeaderEvents(popup, {
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
      getExpandedNodes: () => expandedNodes,
      renderLeftTree,
      renderRightPane,
      getCfmSuppressAutoClose: () => _cfmSuppressAutoClose,
    });

    // 右栏排序按钮
    const sortDeps = {
      getRightCharSortMode: () => rightCharSortMode,
      setRightCharSortMode: (v) => {
        rightCharSortMode = v;
      },
      getSortSnapshot: () => sortSnapshot,
      setSortSnapshot: (v) => {
        sortSnapshot = v;
      },
      getSortDirty: () => sortDirty,
      setSortDirty: (v) => {
        sortDirty = v;
      },
      getPresetLeftSortMode: () => presetLeftSortMode,
      setPresetLeftSortMode: (v) => {
        presetLeftSortMode = v;
      },
      getPresetRightSortMode: () => presetRightSortMode,
      setPresetRightSortMode: (v) => {
        presetRightSortMode = v;
      },
      getPresetSortSnapshot: () => presetSortSnapshot,
      setPresetSortSnapshot: (v) => {
        presetSortSnapshot = v;
      },
      getWorldInfoLeftSortMode: () => worldInfoLeftSortMode,
      setWorldInfoLeftSortMode: (v) => {
        worldInfoLeftSortMode = v;
      },
      getWorldInfoRightSortMode: () => worldInfoRightSortMode,
      setWorldInfoRightSortMode: (v) => {
        worldInfoRightSortMode = v;
      },
      getWorldInfoSortSnapshot: () => worldInfoSortSnapshot,
      setWorldInfoSortSnapshot: (v) => {
        worldInfoSortSnapshot = v;
      },
      getQrLeftSortMode: () => qrLeftSortMode,
      setQrLeftSortMode: (v) => {
        qrLeftSortMode = v;
      },
      getQrRightSortMode: () => qrRightSortMode,
      setQrRightSortMode: (v) => {
        qrRightSortMode = v;
      },
      getQrSortSnapshot: () => qrSortSnapshot,
      setQrSortSnapshot: (v) => {
        qrSortSnapshot = v;
      },
      getThemeLeftSortMode: () => themeLeftSortMode,
      setThemeLeftSortMode: (v) => {
        themeLeftSortMode = v;
      },
      getThemeRightSortMode: () => themeRightSortMode,
      setThemeRightSortMode: (v) => {
        themeRightSortMode = v;
      },
      getThemeSortSnapshot: () => themeSortSnapshot,
      setThemeSortSnapshot: (v) => {
        themeSortSnapshot = v;
      },
      getBgLeftSortMode: () => bgLeftSortMode,
      setBgLeftSortMode: (v) => {
        bgLeftSortMode = v;
      },
      getBgRightSortMode: () => bgRightSortMode,
      setBgRightSortMode: (v) => {
        bgRightSortMode = v;
      },
      getBgSortSnapshot: () => bgSortSnapshot,
      setBgSortSnapshot: (v) => {
        bgSortSnapshot = v;
      },
      getPersonaLeftSortMode: () => personaLeftSortMode,
      setPersonaLeftSortMode: (v) => {
        personaLeftSortMode = v;
      },
      getPersonaRightSortMode: () => personaRightSortMode,
      setPersonaRightSortMode: (v) => {
        personaRightSortMode = v;
      },
      getPersonaSortSnapshot: () => personaSortSnapshot,
      setPersonaSortSnapshot: (v) => {
        personaSortSnapshot = v;
      },
      getSelectedTreeNode: () => selectedTreeNode,
      getSelectedPresetFolder: () => selectedPresetFolder,
      getSelectedWorldInfoFolder: () => selectedWorldInfoFolder,
      getSelectedQrFolder: () => selectedQrFolder,
      getSelectedThemeFolder: () => selectedThemeFolder,
      getSelectedBgFolder: () => selectedBgFolder,
      getSelectedPersonaFolder: () => selectedPersonaFolder,
      renderRightPane,
      renderLeftTree,
      renderPresetsView,
      renderWorldInfoView,
      renderQRView,
      renderThemesView,
      renderBackgroundsView,
      renderPersonasView,
      applySortToFolders,
      revertSort,
      applyResSortToFolders,
      revertResSort,
      getResTopLevelFolders,
      getResChildFolders,
      getChildFolders,
      getTopLevelFolders,
      toggleSortDropdown,
      getContext,
      $,
      cfmToastr,
      extension_settings,
      extensionName,
    };

    bindCharSortBindings(popup, sortDeps);

    popup.find("#cfm-btn-copymode").on("click touchend", (e) => {
      e.preventDefault();
      if (currentResourceType === "chars") {
        cfmCopyMode = !cfmCopyMode;
        const btn = $("#cfm-btn-copymode");
        btn.toggleClass("cfm-copymode-active", cfmCopyMode);
        btn.attr(
          "title",
          cfmCopyMode
            ? "当前：复制模式（拖拽角色会保留原位置）"
            : "当前：移动模式（拖拽角色会从原位置移除）",
        );
        btn.html(
          `<i class="fa-solid fa-${cfmCopyMode ? "copy" : "arrows-turn-to-dots"}"></i> ${cfmCopyMode ? "复制" : "移动"}`,
        );
        cfmToastr.info(
          cfmCopyMode ? "已切换为复制模式" : "已切换为移动模式",
          "",
          {
            timeOut: 1500,
          },
        );
      }
    });

    // 预设展开全部/收起全部
    popup.find("#cfm-preset-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("presets")) presetExpandedNodes.add(id);
      renderPresetsView();
    });
    popup.find("#cfm-preset-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      presetExpandedNodes.clear();
      renderPresetsView();
    });
    // 世界书展开全部/收起全部
    popup.find("#cfm-worldinfo-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("worldinfo"))
        worldInfoExpandedNodes.add(id);
      renderWorldInfoView();
    });
    popup.find("#cfm-worldinfo-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      worldInfoExpandedNodes.clear();
      renderWorldInfoView();
    });

    // 角色世界书归类按钮
    popup.find("#cfm-charbook-classify-btn").on("click touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCharBookClassifyPopup();
    });

    // 主题展开全部/收起全部
    popup.find("#cfm-theme-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("themes")) themeExpandedNodes.add(id);
      renderThemesView();
    });
    popup.find("#cfm-theme-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      themeExpandedNodes.clear();
      renderThemesView();
    });

    // 背景展开全部/收起全部
    popup.find("#cfm-bg-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("backgrounds")) bgExpandedNodes.add(id);
      renderBackgroundsView();
    });
    popup.find("#cfm-bg-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      bgExpandedNodes.clear();
      renderBackgroundsView();
    });

    // User展开全部/收起全部
    popup.find("#cfm-persona-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("personas"))
        personaExpandedNodes.add(id);
      renderPersonasView();
    });
    popup.find("#cfm-persona-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      personaExpandedNodes.clear();
      renderPersonasView();
    });

    // 正则展开全部/收起全部
    popup.find("#cfm-regex-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of regexAllNodeIds) regexExpandedNodes.add(id);
      renderRegexView();
    });
    popup.find("#cfm-regex-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      regexExpandedNodes.clear();
      renderRegexView();
    });

    // 快速回复展开全部
    popup.find("#cfm-qr-expand-all").on("click touchend", (e) => {
      e.preventDefault();
      for (const id of getResFolderIds("quickreply")) qrExpandedNodes.add(id);
      renderQRView();
    });
    // 快速回复收起全部
    popup.find("#cfm-qr-collapse-all").on("click touchend", (e) => {
      e.preventDefault();
      qrExpandedNodes.clear();
      renderQRView();
    });

    // 预设左栏排序
    bindResSortBindings(popup, sortDeps);

    // 多选/导出/删除/模式工具栏按钮事件绑定（已模块化到 ui/modal/shell.js）
    bindModeToolbarEvents(popup, {
      $,
      cfmToastr,
      // 状态 getter
      getCfmMultiSelectMode: () => cfmMultiSelectMode,
      getCfmMultiSelected: () => cfmMultiSelected,
      getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
      getCfmShowHiddenChars: () => cfmShowHiddenChars,
      getCfmExportMode: () => cfmExportMode,
      getCfmResDeleteMode: () => cfmResDeleteMode,
      getCfmEditMode: () => cfmEditMode,
      getCfmEditSelected: () => cfmEditSelected,
      // 互斥模式 getter（只读）
      getCfmPresetRenameMode: () => cfmPresetRenameMode,
      getCfmWorldInfoRenameMode: () => cfmWorldInfoRenameMode,
      getCfmThemeRenameMode: () => cfmThemeRenameMode,
      getCfmBgRenameMode: () => cfmBgRenameMode,
      getCfmPresetNoteMode: () => cfmPresetNoteMode,
      getCfmWorldInfoNoteMode: () => cfmWorldInfoNoteMode,
      getCfmQrNoteMode: () => cfmQrNoteMode,
      getCfmThemeNoteMode: () => cfmThemeNoteMode,
      getCfmBgNoteMode: () => cfmBgNoteMode,
      getCfmPersonaNoteMode: () => cfmPersonaNoteMode,
      // 状态 setter
      setCfmMultiSelectMode: (v) => {
        cfmMultiSelectMode = v;
      },
      setCfmMultiSelected: (v) => {
        cfmMultiSelected = v;
      },
      setCfmMultiSelectRangeMode: (v) => {
        cfmMultiSelectRangeMode = v;
      },
      setCfmShowHiddenChars: (v) => {
        cfmShowHiddenChars = v;
      },
      // 当前资源类型
      getCurrentResourceType: () => currentResourceType,
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
    });

    // note/rename 模式按钮事件绑定（已模块化到 ui/modal/note-rename-bindings.js）
    bindNoteRenameButtonEvents(popup, {
      cfmToastr,
      // 主题 note
      getCfmThemeNoteMode: () => cfmThemeNoteMode,
      getCfmThemeNoteSelected: () => cfmThemeNoteSelected,
      executeThemeNoteEdit,
      exitThemeNoteMode,
      enterThemeNoteMode,
      // 背景 note
      getCfmBgNoteMode: () => cfmBgNoteMode,
      getCfmBgNoteSelected: () => cfmBgNoteSelected,
      executeBgNoteEdit,
      exitBgNoteMode,
      enterBgNoteMode,
      // 预设 note
      getCfmPresetNoteMode: () => cfmPresetNoteMode,
      getCfmPresetNoteSelected: () => cfmPresetNoteSelected,
      executePresetNoteEdit,
      exitPresetNoteMode,
      enterPresetNoteMode,
      // 世界书 note
      getCfmWorldInfoNoteMode: () => cfmWorldInfoNoteMode,
      getCfmWorldInfoNoteSelected: () => cfmWorldInfoNoteSelected,
      executeWorldInfoNoteEdit,
      exitWorldInfoNoteMode,
      enterWorldInfoNoteMode,
      // 快速回复 note
      getCfmQrNoteMode: () => cfmQrNoteMode,
      getCfmQrNoteSelected: () => cfmQrNoteSelected,
      executeQrNoteEdit,
      exitQrNoteMode,
      enterQrNoteMode,
      // 聊天记录 note
      getCfmChatlogNoteMode: () => cfmChatlogNoteMode,
      getCfmChatlogNoteSelected: () => cfmChatlogNoteSelected,
      executeChatlogNoteEdit,
      exitChatlogNoteMode,
      enterChatlogNoteMode,
      // 聊天记录 rename
      getCfmChatlogRenameMode: () => cfmChatlogRenameMode,
      getCfmChatlogRenameSelected: () => cfmChatlogRenameSelected,
      executeChatlogRename,
      exitChatlogRenameMode,
      enterChatlogRenameMode,
      // 快速回复 rename
      getCfmQrRenameMode: () => cfmQrRenameMode,
      getCfmQrRenameSelected: () => cfmQrRenameSelected,
      executeQrRename,
      exitQrRenameMode,
      enterQrRenameMode,
      // User(persona) note
      getCfmPersonaNoteMode: () => cfmPersonaNoteMode,
      getCfmPersonaNoteSelected: () => cfmPersonaNoteSelected,
      executePersonaNoteEdit,
      exitPersonaNoteMode,
      enterPersonaNoteMode,
      // 预设 rename
      getCfmPresetRenameMode: () => cfmPresetRenameMode,
      getCfmPresetRenameSelected: () => cfmPresetRenameSelected,
      executePresetRename,
      exitPresetRenameMode,
      enterPresetRenameMode,
      // 世界书 rename
      getCfmWorldInfoRenameMode: () => cfmWorldInfoRenameMode,
      getCfmWorldInfoRenameSelected: () => cfmWorldInfoRenameSelected,
      executeWorldInfoRename,
      exitWorldInfoRenameMode,
      enterWorldInfoRenameMode,
      // 主题 rename
      getCfmThemeRenameMode: () => cfmThemeRenameMode,
      getCfmThemeRenameSelected: () => cfmThemeRenameSelected,
      executeThemeRename,
      exitThemeRenameMode,
      enterThemeRenameMode,
      // 背景 rename
      getCfmBgRenameMode: () => cfmBgRenameMode,
      getCfmBgRenameSelected: () => cfmBgRenameSelected,
      executeBgRename,
      exitBgRenameMode,
      enterBgRenameMode,
    });

    // 导入按钮 + 文件选择事件绑定（已模块化到 ui/modal/import-bindings.js）
    bindImportButtonEvents(popup, {
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
      getSelectedTreeNode: () => selectedTreeNode,
      getSelectedPresetFolder: () => selectedPresetFolder,
      getSelectedQrFolder: () => selectedQrFolder,
      getSelectedPersonaFolder: () => selectedPersonaFolder,
      getSelectedRegexNode: () => selectedRegexNode,
      getSelectedThemeFolder: () => selectedThemeFolder,
      getSelectedBgFolder: () => selectedBgFolder,
      getSelectedWorldInfoFolder: () => selectedWorldInfoFolder,
      // 写状态 setter
      clearWorldInfoNamesCache: () => {
        _worldInfoNamesCache = null;
      },
      setWorldInfoDetachedOptions: (v) => {
        _worldInfoDetachedOptions = v;
      },
      setGlobalWIDetachedOptions: (v) => {
        _globalWIDetachedOptions = v;
      },
      extensionSettings: extension_settings,
      extensionName,
    });

    popup.find("#cfm-regex-create-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (currentResourceType !== "regex") return;
      createGlobalRegexFromManager();
    });

    popup
      .find("#cfm-regex-transfer-btn")
      .on("click touchend", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (currentResourceType !== "regex") return;
        await startGlobalRegexTransferFlow();
      });

    // 正则排序按钮 —— 弹窗形式
    popup.find("#cfm-regex-sort-btn").on("click touchend", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (currentResourceType !== "regex") return;
      await openRegexSortDialog();
    });

    // 正则激活分组按钮
    popup
      .find("#cfm-regex-preset-btn")
      .on("click touchend", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        await showRegexPresetPanel();
      });

    // 默认背景设置按钮
    popup.find("#cfm-bg-default-btn").on("click touchend", function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleDefaultBgSetting();
    });

    // 世界书激活分组按钮
    popup.find("#cfm-wi-preset-btn").on("click touchend", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      showWiPresetPanel();
    });

    // 快速回复激活分组按钮
    popup.find("#cfm-qr-preset-btn").on("click touchend", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      showQrPresetPanel();
    });

    // 重置排序状态
    sortDirty = false;
    sortSnapshot = null;
    rightCharSortMode =
      extension_settings[extensionName].charRightSortMode ?? null;
    // 重置多选状态
    cfmMultiSelectMode = false;
    clearMultiSelect();
    cfmMultiSelectRangeMode = false;
    // 重置导出模式
    cfmExportMode = false;
    cfmExportSelected.clear();
    cfmExportRangeMode = false;
    cfmExportLastClicked = null;
    // 重置删除模式
    cfmResDeleteMode = false;
    cfmResDeleteSelected.clear();
    cfmResDeleteRangeMode = false;
    cfmResDeleteLastClicked = null;

    renderLeftTree();
    // 触发初始tab对应视图的渲染
    if (initialTab === "chars") renderRightPane();
    else if (initialTab === "chatlogs") renderChatlogsView();
    else if (initialTab === "presets") renderPresetsView();
    else if (initialTab === "worldinfo") renderWorldInfoView();
    else if (initialTab === "themes") renderThemesView();
    else if (initialTab === "backgrounds") renderBackgroundsView();
    else if (initialTab === "personas") renderPersonasView();
    else if (initialTab === "regex") renderRegexView();
    else if (initialTab === "quickreply") renderQRView();

    // 预加载世界书名称缓存（后台静默加载，切换标签时无需等待）
    getWorldInfoNames();

    // 全局/各资源页搜索框事件绑定（已拆分到 features/search/search-bindings.js）
    bindSearchInputs(popup, {
      $,
      getDefaultSearchScope,
      executeGlobalSearch,
      executePresetSearch,
      executeWorldInfoSearch,
      executeQrSearch,
      executeThemeSearch,
      executeBgSearch,
      executePersonaSearch,
      executeRegexSearch,
      renderRightPane,
      renderPresetsView,
      renderWorldInfoView,
      renderQRView,
      renderThemesView,
      renderBackgroundsView,
      renderPersonasView,
      renderRegexView,
    });
  }

  // ==================== 模糊搜索辅助 ====================
  /**
   * 模糊匹配：将查询按空格拆分为多个关键词，每个关键词必须在 textPool 中至少一项里出现
   * @param {string} query - 用户输入的搜索词（已 toLowerCase）
   * @param {string[]} textPool - 待匹配的文本池（每项已 toLowerCase）
   * @returns {boolean}
   */
  function fuzzyMatch(query, textPool) {
    return matcherFuzzyMatch(query, textPool);
  }

  let _searchHelpersApi = null;
  function getSearchHelpersApi() {
    if (!_searchHelpersApi) {
      _searchHelpersApi = createSearchHelpers({
        getTagMap,
        getFolderTagIds,
        getFolderPath,
        getTagName,
        getResourceGroups,
        getResFolderPath,
        getResFolderDisplayName,
      });
    }
    return _searchHelpersApi;
  }

  /**
   * 获取角色卡所在文件夹的路径显示名数组（从根到叶）
   */
  function getCharFolderPathNames(char) {
    return getSearchHelpersApi().getCharFolderPathNames(char);
  }

  /**
   * 获取资源所在文件夹的路径显示名数组（从根到叶）
   * @param {string} type - 'presets' | 'themes' | 'backgrounds' | 'worldinfo'
   * @param {string} itemName - 资源名称
   */
  function getResFolderPathNames(type, itemName) {
    return getSearchHelpersApi().getResFolderPathNames(type, itemName);
  }

  /**
   * 获取文件夹自身路径的显示名数组（用于文件夹搜索）
   * @param {string} mode - 'chars' | 'presets' | 'themes' | 'backgrounds' | 'worldinfo'
   * @param {string} folderId
   */
  function getFolderSelfPathNames(mode, folderId) {
    return getSearchHelpersApi().getFolderSelfPathNames(mode, folderId);
  }

  // ==================== 全局搜索功能 ====================
  let _globalSearchApi = null;
  function getGlobalSearchApi() {
    if (!_globalSearchApi) {
      _globalSearchApi = createGlobalSearchCore({
        $,
        appendCharRow,
        countCharsInFolderRecursive,
        escapeHtml,
        filterHiddenChars,
        fuzzyMatch,
        getCharacters,
        getCharactersInFolder,
        getCharFolderPathNames,
        getChildFolders,
        getFavoriteCharacters,
        getFolderPath,
        getFolderSelfPathNames,
        getFolderTagIds,
        getTagName,
        getUncategorizedCharacters,
        getVisibleResourceIds,
        prependEditToolbar,
        prependExportToolbar,
        prependResDeleteToolbar,
        renderLeftTree,
        renderRightPane,
        selectAllVisible,
        state: {
          getSelectedTreeNode: () => selectedTreeNode,
          setSelectedTreeNode: (value) => {
            selectedTreeNode = value;
          },
          getExpandedNodes: () => expandedNodes,
          getCfmMultiSelectMode: () => cfmMultiSelectMode,
          getCfmMultiSelected: () => cfmMultiSelected,
          getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
          setCfmMultiSelectRangeMode: (value) => {
            cfmMultiSelectRangeMode = value;
          },
          setCfmMultiSelectLastClicked: (value) => {
            cfmMultiSelectLastClicked = value;
          },
        },
      });
    }
    return _globalSearchApi;
  }
  function executeGlobalSearch() {
    return getGlobalSearchApi().executeGlobalSearch();
  }

  // ==================== 预设全局搜索 ====================
  let _presetSearchApi = null;
  function getPresetSearchApi() {
    if (!_presetSearchApi) {
      _presetSearchApi = createPresetSearchCore({
        $,
        applyPreset,
        cfmToastr,
        countResItemsRecursive,
        escapeHtml,
        executePresetNoteEdit,
        executePresetRename,
        fuzzyMatch,
        getContext,
        getCurrentPresets,
        getFolderSelfPathNames,
        getMultiDragData,
        getPresetNote,
        getResChildFolders,
        getResFavorites,
        getResFolderDisplayName,
        getResFolderPath,
        getResFolderPathNames,
        getResFolderTree,
        getResourceFolders,
        getResourceGroups,
        getVisibleResourceIds,
        isResFavorite,
        pcDragEnd,
        pcDragStart,
        prependExportToolbar,
        prependPresetNoteToolbar,
        prependPresetRenameToolbar,
        prependResDeleteToolbar,
        recordTouchTapStart,
        renderPresetDetailSubList,
        renderPresetsView,
        selectAllVisible,
        shouldIgnoreTouchTapAfterMove,
        toggleExportItem,
        toggleMultiSelectItem,
        togglePresetNoteItem,
        togglePresetRenameItem,
        toggleResDeleteItem,
        toggleResFavorite,
        touchDragMgr,
        state: {
          getSelectedPresetFolder: () => selectedPresetFolder,
          setSelectedPresetFolder: (value) => {
            selectedPresetFolder = value;
          },
          getPresetExpandedNodes: () => presetExpandedNodes,
          getCfmMultiSelectMode: () => cfmMultiSelectMode,
          getCfmMultiSelected: () => cfmMultiSelected,
          getCfmExportMode: () => cfmExportMode,
          getCfmExportSelected: () => cfmExportSelected,
          getCfmResDeleteMode: () => cfmResDeleteMode,
          getCfmResDeleteSelected: () => cfmResDeleteSelected,
          getCfmPresetNoteMode: () => cfmPresetNoteMode,
          getCfmPresetNoteSelected: () => cfmPresetNoteSelected,
          getCfmPresetRenameMode: () => cfmPresetRenameMode,
          getCfmPresetRenameSelected: () => cfmPresetRenameSelected,
          getCfmPresetDetailExpandedNames: () => cfmPresetDetailExpandedNames,
          getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
          setCfmMultiSelectRangeMode: (value) => {
            cfmMultiSelectRangeMode = value;
          },
          setCfmMultiSelectLastClicked: (value) => {
            cfmMultiSelectLastClicked = value;
          },
        },
      });
    }
    return _presetSearchApi;
  }
  function executePresetSearch() {
    return getPresetSearchApi().executePresetSearch();
  }

  // ==================== 世界书全局搜索 ====================
  let _worldInfoSearchApi = null;
  function getWorldInfoSearchApi() {
    if (!_worldInfoSearchApi) {
      _worldInfoSearchApi = createWorldInfoSearchCore({
        $,
        applyWorldInfoMultiActivation,
        bindWorldInfoEntryCollapseTargets,
        cfmToastr,
        countResItemsRecursive,
        escapeHtml,
        executeWorldInfoNoteEdit,
        executeWorldInfoRename,
        fuzzyMatch,
        getActiveWorldInfoSet,
        getCharBoundWorldBooks,
        getFolderSelfPathNames,
        getMultiDragData,
        getResChildFolders,
        getResFavorites,
        getResFolderDisplayName,
        getResFolderPath,
        getResFolderPathNames,
        getResFolderTree,
        getResourceFolders,
        getResourceGroups,
        getVisibleResourceIds,
        getWorldInfoNames,
        getWorldInfoNote,
        isResFavorite,
        isWorldInfoEntryBookExpanded,
        openWorldInfoEditor,
        pcDragEnd,
        pcDragStart,
        prependExportToolbar,
        prependResDeleteToolbar,
        prependWorldInfoNoteToolbar,
        prependWorldInfoRenameToolbar,
        refreshWorldInfoPanelView,
        renderWorldInfoEntrySubList,
        renderWorldInfoView,
        selectAllVisible,
        shouldIgnoreWorldInfoEntryTap,
        syncWiPresetTrackingForManualToggle,
        toggleExportItem,
        toggleMultiSelectItem,
        toggleResDeleteItem,
        toggleResFavorite,
        toggleWorldInfoActivation,
        toggleWorldInfoEntryBookExpanded,
        toggleWorldInfoNoteItem,
        toggleWorldInfoRenameItem,
        touchDragMgr,
        state: {
          getSelectedWorldInfoFolder: () => selectedWorldInfoFolder,
          setSelectedWorldInfoFolder: (value) => {
            selectedWorldInfoFolder = value;
          },
          getWorldInfoExpandedNodes: () => worldInfoExpandedNodes,
          getCfmMultiSelectMode: () => cfmMultiSelectMode,
          getCfmMultiSelected: () => cfmMultiSelected,
          getCfmExportMode: () => cfmExportMode,
          getCfmExportSelected: () => cfmExportSelected,
          getCfmResDeleteMode: () => cfmResDeleteMode,
          getCfmResDeleteSelected: () => cfmResDeleteSelected,
          getCfmWorldInfoNoteMode: () => cfmWorldInfoNoteMode,
          getCfmWorldInfoNoteSelected: () => cfmWorldInfoNoteSelected,
          getCfmWorldInfoRenameMode: () => cfmWorldInfoRenameMode,
          getCfmWorldInfoRenameSelected: () => cfmWorldInfoRenameSelected,
          getCfmWorldInfoEntryLastFocusedName: () =>
            cfmWorldInfoEntryLastFocusedName,
          setCfmWorldInfoEntryLastFocusedName: (value) => {
            cfmWorldInfoEntryLastFocusedName = value;
          },
          getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
          setCfmMultiSelectRangeMode: (value) => {
            cfmMultiSelectRangeMode = value;
          },
          setCfmMultiSelectLastClicked: (value) => {
            cfmMultiSelectLastClicked = value;
          },
        },
      });
    }
    return _worldInfoSearchApi;
  }
  function executeWorldInfoSearch() {
    return getWorldInfoSearchApi().executeWorldInfoSearch();
  }

  // ==================== 主题/背景全局搜索（已模块化到 features/search/resource-search.js） ====================
  let _resourceSearchApi = null;
  function getResourceSearchApi() {
    if (!_resourceSearchApi) {
      _resourceSearchApi = createResourceSearchApiCore({
        $,
        BG_ORIENT_ICONS,
        BG_ORIENT_LABELS,
        applyBackground,
        applyTheme,
        cfmBgNoteMode,
        cfmBgNoteSelected,
        cfmBgRenameMode,
        cfmBgRenameSelected,
        cfmExportMode,
        cfmExportSelected,
        cfmMultiSelectLastClicked,
        cfmMultiSelectMode,
        cfmMultiSelectRangeMode,
        cfmMultiSelected,
        cfmResDeleteMode,
        cfmResDeleteSelected,
        cfmThemeNoteMode,
        cfmThemeNoteSelected,
        cfmThemeRenameMode,
        cfmThemeRenameSelected,
        cfmToastr,
        escapeHtml,
        executeBgNoteEdit,
        executeBgRename,
        executeThemeNoteEdit,
        executeThemeRename,
        fuzzyMatch,
        getBackgroundDisplayName,
        getBackgroundNames,
        getBackgroundThumbnailUrl,
        getBgNote,
        getBgOrientation,
        getContext,
        getMultiDragData,
        getResChildFolders,
        getResFavorites,
        getResFolderDisplayName,
        getResFolderPath,
        getResFolderPathNames,
        getResFolderTree,
        getResourceFolders,
        getResourceGroups,
        getThemeBgBinding,
        getThemeNames,
        getThemeNote,
        getVisibleResourceIds,
        handleThemeBgLink,
        isResFavorite,
        pcDragEnd,
        pcDragStart,
        prependBgNoteToolbar,
        prependBgRenameToolbar,
        prependExportToolbar,
        prependResDeleteToolbar,
        prependThemeNoteToolbar,
        prependThemeRenameToolbar,
        renderBackgroundsView,
        renderThemesView,
        selectAllVisible,
        selectedBgFolder,
        selectedThemeFolder,
        toggleBgNoteItem,
        toggleBgRenameItem,
        toggleExportItem,
        toggleMultiSelectItem,
        toggleResDeleteItem,
        toggleResFavorite,
        toggleThemeNoteItem,
        toggleThemeRenameItem,
        touchDragMgr,
        document,
      });
    }
    return _resourceSearchApi;
  }
  function executeThemeSearch() {
    return getResourceSearchApi().executeThemeSearch();
  }
  function executeBgSearch() {
    return getResourceSearchApi().executeBgSearch();
  }

  // 更新排序按钮的激活状态

  // 保存当前页面状态到 settings（用于"记住上次页面"功能）
  function _saveLastOpenState() {
    let folder = null;
    let expanded = [];
    if (currentResourceType === "chars") {
      folder = selectedTreeNode;
      expanded = Array.from(expandedNodes);
    } else if (currentResourceType === "presets") {
      folder = selectedPresetFolder;
      expanded = Array.from(presetExpandedNodes);
    } else if (currentResourceType === "worldinfo") {
      folder = selectedWorldInfoFolder;
      expanded = Array.from(worldInfoExpandedNodes);
    } else if (currentResourceType === "themes") {
      folder = selectedThemeFolder;
      expanded = Array.from(themeExpandedNodes);
    } else if (currentResourceType === "backgrounds") {
      folder = selectedBgFolder;
      expanded = Array.from(bgExpandedNodes);
    } else if (currentResourceType === "personas") {
      folder = selectedPersonaFolder;
      expanded = Array.from(personaExpandedNodes);
    } else if (currentResourceType === "regex") {
      folder = selectedRegexNode;
      expanded = Array.from(regexExpandedNodes);
    } else if (currentResourceType === "quickreply") {
      folder = selectedQrFolder;
      expanded = Array.from(qrExpandedNodes);
    }
    extension_settings[extensionName].lastOpenState = {
      resourceType: currentResourceType,
      selectedFolder: folder,
      expandedNodes: expanded,
    };
    getContext().saveSettingsDebounced();
  }

  let _mainPopupCloserApi = null;
  function getMainPopupCloserApi() {
    if (!_mainPopupCloserApi) {
      _mainPopupCloserApi = createMainPopupCloserCore({
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
        getSortDirty: () => sortDirty,
        setSortDirty: (v) => {
          sortDirty = v;
        },
        getSortSnapshot: () => sortSnapshot,
        setSortSnapshot: (v) => {
          sortSnapshot = v;
        },
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
        setCfmQrLastFocusedSetName: (v) => {
          cfmQrLastFocusedSetName = v;
        },
        setCfmWorldInfoEntryLastFocusedName: (v) => {
          cfmWorldInfoEntryLastFocusedName = v;
        },
        setCfmChatMode: (v) => {
          cfmChatMode = v;
        },
        setCfmChatBatchMode: (v) => {
          cfmChatBatchMode = v;
        },
        setCfmChatBatchRangeMode: (v) => {
          cfmChatBatchRangeMode = v;
        },
        setCfmChatBatchLastClicked: (v) => {
          cfmChatBatchLastClicked = v;
        },
        setCfmCharRegexMode: (v) => {
          cfmCharRegexMode = v;
        },
        setCfmCharRegexTargetAvatar: (v) => {
          cfmCharRegexTargetAvatar = v;
        },
        setCfmCharRegexHighlightPath: (v) => {
          cfmCharRegexHighlightPath = v;
        },
        setCfmCharRegexPrevSelectedTreeNode: (v) => {
          cfmCharRegexPrevSelectedTreeNode = v;
        },
        setCfmPresetRegexMode: (v) => {
          cfmPresetRegexMode = v;
        },
        setCfmPresetRegexTargetName: (v) => {
          cfmPresetRegexTargetName = v;
        },
        setCfmPresetRegexHighlightPath: (v) => {
          cfmPresetRegexHighlightPath = v;
        },
        setCfmPresetDetailBatchMode: (v) => {
          cfmPresetDetailBatchMode = v;
        },
        setCfmPresetDetailBatchOwnerName: (v) => {
          cfmPresetDetailBatchOwnerName = v;
        },
        setCfmPresetDetailBatchRangeMode: (v) => {
          cfmPresetDetailBatchRangeMode = v;
        },
        setCfmPresetDetailBatchLastClicked: (v) => {
          cfmPresetDetailBatchLastClicked = v;
        },
        setCfmWorldInfoEntryBatchMode: (v) => {
          cfmWorldInfoEntryBatchMode = v;
        },
        setCfmWorldInfoEntryBatchOwnerName: (v) => {
          cfmWorldInfoEntryBatchOwnerName = v;
        },
        setCfmWorldInfoEntryBatchRangeMode: (v) => {
          cfmWorldInfoEntryBatchRangeMode = v;
        },
        setCfmWorldInfoEntryBatchLastClicked: (v) => {
          cfmWorldInfoEntryBatchLastClicked = v;
        },
        setCfmRegexBatchMode: (v) => {
          cfmRegexBatchMode = v;
        },
        setCfmRegexBatchRangeMode: (v) => {
          cfmRegexBatchRangeMode = v;
        },
        setCfmRegexBatchLastClicked: (v) => {
          cfmRegexBatchLastClicked = v;
        },
        setCfmMultiSelectMode: (v) => {
          cfmMultiSelectMode = v;
        },
        setCfmMultiSelectRangeMode: (v) => {
          cfmMultiSelectRangeMode = v;
        },
      });
    }
    return _mainPopupCloserApi;
  }
  function closeMainPopup() {
    return getMainPopupCloserApi().closeMainPopup();
  }

  // ==================== 左侧树渲染（已模块化到 ui/tree/tree-view.js） ====================
  let _leftTreeApi = null;
  function getLeftTreeApi() {
    if (!_leftTreeApi) {
      _leftTreeApi = createLeftTreeApiCore({
        $,
        cfmToastr,
        clearMultiSelect,
        countCharsInFolderRecursive,
        escapeHtml,
        executeGlobalSearch,
        getChildFolders,
        getFavoriteCharacters,
        getTagName,
        getTopLevelFolders,
        getUncategorizedCharacters,
        handleCharDropToFolder,
        handleFolderTargetMove,
        isNewlyImported,
        pcDragEnd,
        pcDragStart,
        pcGetDropData,
        promptRenameFolder,
        removeCharFromAllFolders,
        renderRightPane,
        reorderFolder,
        sortFolders,
        touchDragMgr,
        wouldCreateCycle,
        getSelectedTreeNode: () => selectedTreeNode,
        setSelectedTreeNode: (v) => {
          selectedTreeNode = v;
        },
        getExpandedNodes: () => expandedNodes,
        getPcDragData: () => _pcDragData,
        getPcLastResourceFolderHoverTarget: () =>
          _pcLastResourceFolderHoverTarget,
        setPcLastResourceFolderHoverTarget: (v) => {
          _pcLastResourceFolderHoverTarget = v;
        },
        setPcDropHandled: (v) => {
          _pcDropHandled = v;
        },
        getConfig: () => config,
        getCfmCopyMode: () => cfmCopyMode,
      });
    }
    return _leftTreeApi;
  }
  function renderLeftTree() {
    return getLeftTreeApi().renderLeftTree();
  }
  function renderTreeNode(container, folderId, depth) {
    return getLeftTreeApi().renderTreeNode(container, folderId, depth);
  }
  function refreshSelection() {
    return getLeftTreeApi().refreshSelection();
  }

  // ==================== 右侧面板渲染（已模块化到 ui/list/list-view.js） ====================
  let _rightListApi = null;
  function getRightListApi() {
    if (!_rightListApi) {
      _rightListApi = createRightListApiCore({
        $,
        cfmToastr,
        bindTouchSafeTap,
        clearMultiSelect,
        closeMainPopup,
        countCharsInFolderRecursive,
        escapeHtml,
        executeCharEdit,
        executeGlobalSearch,
        filterHiddenChars,
        findCharFolderPath,
        getCharChats,
        getCharacters,
        getCharactersInFolder,
        getChildFolders,
        getContext,
        getFavoriteCharacters,
        getFolderPath,
        getMultiDragData,
        getTagName,
        getThumbnailUrl,
        getUncategorizedCharacters,
        getVisibleActions,
        getVisibleResourceIds,
        handleCharDropToFolder,
        handleFolderTargetMove,
        isCharHidden,
        isFavorite,
        pcDragEnd,
        pcDragStart,
        pcGetDropData,
        prependEditToolbar,
        prependExportToolbar,
        prependResDeleteToolbar,
        promptRenameFolder,
        refreshActiveViewerStateAfterSelectionChange,
        renderCharRegexSubList,
        renderCharacterDetailSubList,
        renderChatSubList,
        renderLeftTree,
        reorderFolder,
        selectAllVisible,
        sortCharacters,
        sortFolders,
        toggleCharHidden,
        toggleEditItem,
        toggleExportItem,
        toggleFavorite,
        toggleMultiSelectItem,
        toggleResDeleteItem,
        touchDragMgr,
        wouldCreateCycle,
        getSelectedTreeNode: () => selectedTreeNode,
        setSelectedTreeNode: (v) => {
          selectedTreeNode = v;
        },
        getExpandedNodes: () => expandedNodes,
        getCfmMultiSelectMode: () => cfmMultiSelectMode,
        getCfmMultiSelected: () => cfmMultiSelected,
        getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
        setCfmMultiSelectRangeMode: (v) => {
          cfmMultiSelectRangeMode = v;
        },
        getCfmMultiSelectLastClicked: () => cfmMultiSelectLastClicked,
        setCfmMultiSelectLastClicked: (v) => {
          cfmMultiSelectLastClicked = v;
        },
        getCfmExportMode: () => cfmExportMode,
        getCfmExportSelected: () => cfmExportSelected,
        getCfmResDeleteMode: () => cfmResDeleteMode,
        getCfmResDeleteSelected: () => cfmResDeleteSelected,
        getCfmEditMode: () => cfmEditMode,
        getCfmEditSelected: () => cfmEditSelected,
        getCfmChatMode: () => cfmChatMode,
        getCfmChatExpandedAvatars: () => cfmChatExpandedAvatars,
        getCfmChatCache: () => cfmChatCache,
        getCfmCharRegexMode: () => cfmCharRegexMode,
        getCfmCharRegexTargetAvatar: () => cfmCharRegexTargetAvatar,
        getCfmCharRegexExpandedAvatars: () => cfmCharRegexExpandedAvatars,
        getCfmCharRegexHighlightPath: () => cfmCharRegexHighlightPath,
        getCfmCharDetailExpandedAvatars: () => cfmCharDetailExpandedAvatars,
        getRightCharSortMode: () => rightCharSortMode,
        getCfmCopyMode: () => cfmCopyMode,
        getPcDragData: () => _pcDragData,
        getConfig: () => config,
      });
    }
    return _rightListApi;
  }
  function renderRightPane() {
    return getRightListApi().renderRightPane();
  }
  function appendCharRow(container, char, showFolderPath) {
    return getRightListApi().appendCharRow(container, char, showFolderPath);
  }

  // ==================== 通用模态层（已模块化到 ui/modal/modal.js） ====================
  let _modalApi = null;
  function getModalApi() {
    if (!_modalApi) {
      _modalApi = createModalApiCore({
        $,
      });
    }
    return _modalApi;
  }
  function createOverlayDialog(options) {
    return getModalApi().createOverlayDialog(options);
  }
  function createChoiceDialog(options) {
    return getModalApi().createChoiceDialog(options);
  }

  // ==================== 标签管理配置弹窗 ====================
  let configSelectedFolderIds = new Set();
  let cfmDeleteMode = false;
  let cfmDeleteSelected = new Set();
  let cfmDeleteCascade = false; // 级联删除模式
  let cfmDeleteLastClickedId = null; // 用于框选的上次点击ID
  let cfmDeleteRangeMode = false; // 框选模式（移动端友好）
  let cfmInvertScope = "all"; // 反选范围：'all' 全部 | 'parent' 当前父级下

  // 预设/世界书配置面板状态
  let resConfigDeleteMode = false;
  let resConfigDeleteSelected = new Set();
  let resConfigDeleteCascade = false;
  let resConfigDeleteLastClickedId = null;
  let resConfigDeleteRangeMode = false;
  let resConfigInvertScope = "all";
  let resConfigSelectedFolderIds = new Set();

  let _settingsDialogApi = null;
  function getSettingsDialogApi() {
    if (!_settingsDialogApi) {
      _settingsDialogApi = createSettingsDialogApiCore({
        $,
        // 状态：Set（引用注入，可变）
        cfmDeleteSelected,
        resConfigDeleteSelected,
        // 基础类型 getter/setter 注入
        getCfmDeleteMode: () => cfmDeleteMode,
        setCfmDeleteMode: (v) => {
          cfmDeleteMode = v;
        },
        getCfmDeleteCascade: () => cfmDeleteCascade,
        setCfmDeleteCascade: (v) => {
          cfmDeleteCascade = v;
        },
        getCfmDeleteLastClickedId: () => cfmDeleteLastClickedId,
        setCfmDeleteLastClickedId: (v) => {
          cfmDeleteLastClickedId = v;
        },
        getCfmDeleteRangeMode: () => cfmDeleteRangeMode,
        setCfmDeleteRangeMode: (v) => {
          cfmDeleteRangeMode = v;
        },
        getResConfigDeleteMode: () => resConfigDeleteMode,
        setResConfigDeleteMode: (v) => {
          resConfigDeleteMode = v;
        },
        getResConfigDeleteCascade: () => resConfigDeleteCascade,
        setResConfigDeleteCascade: (v) => {
          resConfigDeleteCascade = v;
        },
        getResConfigDeleteLastClickedId: () => resConfigDeleteLastClickedId,
        setResConfigDeleteLastClickedId: (v) => {
          resConfigDeleteLastClickedId = v;
        },
        getResConfigDeleteRangeMode: () => resConfigDeleteRangeMode,
        setResConfigDeleteRangeMode: (v) => {
          resConfigDeleteRangeMode = v;
        },
        // 基础类型 getter/setter 注入（跨模块共享）
        getCurrentResourceType: () => currentResourceType,
        setCurrentResourceType: (v) => {
          currentResourceType = v;
        },
        getCfmMultiSelectMode: () => cfmMultiSelectMode,
        setCfmMultiSelectMode: (v) => {
          cfmMultiSelectMode = v;
        },
        getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
        setCfmMultiSelectRangeMode: (v) => {
          cfmMultiSelectRangeMode = v;
        },
        getCfmExportMode: () => cfmExportMode,
        setCfmExportMode: (v) => {
          cfmExportMode = v;
        },
        getCfmResDeleteMode: () => cfmResDeleteMode,
        setCfmResDeleteMode: (v) => {
          cfmResDeleteMode = v;
        },
        getCfmThemeNoteMode: () => cfmThemeNoteMode,
        setCfmThemeNoteMode: (v) => {
          cfmThemeNoteMode = v;
        },
        getCfmBgNoteMode: () => cfmBgNoteMode,
        setCfmBgNoteMode: (v) => {
          cfmBgNoteMode = v;
        },
        getCfmPresetNoteMode: () => cfmPresetNoteMode,
        setCfmPresetNoteMode: (v) => {
          cfmPresetNoteMode = v;
        },
        getCfmWorldInfoNoteMode: () => cfmWorldInfoNoteMode,
        setCfmWorldInfoNoteMode: (v) => {
          cfmWorldInfoNoteMode = v;
        },
        getCfmQrNoteMode: () => cfmQrNoteMode,
        setCfmQrNoteMode: (v) => {
          cfmQrNoteMode = v;
        },
        getCfmPersonaNoteMode: () => cfmPersonaNoteMode,
        setCfmPersonaNoteMode: (v) => {
          cfmPersonaNoteMode = v;
        },
        getCfmPresetRenameMode: () => cfmPresetRenameMode,
        setCfmPresetRenameMode: (v) => {
          cfmPresetRenameMode = v;
        },
        getCfmWorldInfoRenameMode: () => cfmWorldInfoRenameMode,
        setCfmWorldInfoRenameMode: (v) => {
          cfmWorldInfoRenameMode = v;
        },
        getCfmQrRenameMode: () => cfmQrRenameMode,
        setCfmQrRenameMode: (v) => {
          cfmQrRenameMode = v;
        },
        getCfmCopyMode: () => cfmCopyMode,
        // 常量
        CFM_TAB_META,
        // 函数依赖
        renderConfigBody,
        clearMultiSelect,
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
        getVisibleTabs,
        getMenuTabs,
        handleCurrentTabRelocate,
        renderLeftTree,
        renderRightPane,
        renderPresetsView,
        renderWorldInfoView,
        renderThemesView,
        renderBackgroundsView,
        renderPersonasView,
        renderRegexView,
        renderQRView,
        applyAllToolbarVisibility,
      });
    }
    return _settingsDialogApi;
  }
  function showConfigPopup() {
    return getSettingsDialogApi().showConfigPopup();
  }
  function closeConfigPopup() {
    return getSettingsDialogApi().closeConfigPopup();
  }

  // ==================== 共享 section 渲染（已迁移 settings/render/section.js） ====================
  let _sharedSectionsApi = null;
  function getSharedSectionsApi() {
    if (!_sharedSectionsApi) {
      _sharedSectionsApi = createSharedSectionsCore({
        $,
        getContext,
        extension_settings,
        extensionName,
        window,
        getButtonMode,
        switchButtonMode,
        detectThemeIcons,
        extractUrlFromCss,
        applyCustomIcon,
        applyTopbarIconFromConfig,
        toCssUrl,
        cfmConfirm,
        cfmToastr,
        escapeHtml,
        ensureResourceSettings,
        getEntryTransferPostActionMode,
        setEntryTransferPostActionMode,
        renderPersonasView,
        setBridgeEnabled,
        onBridgeEnabledChange,
      });
    }
    return _sharedSectionsApi;
  }
  function renderButtonModeSection(body) {
    return getSharedSectionsApi().renderButtonModeSection(body);
  }
  function renderTopbarIconConfigSection(body) {
    return getSharedSectionsApi().renderTopbarIconConfigSection(body);
  }
  function renderDefaultPageConfigSection(body) {
    return getSharedSectionsApi().renderDefaultPageConfigSection(body);
  }
  function renderDefaultSearchScopeSection(body) {
    return getSharedSectionsApi().renderDefaultSearchScopeSection(body);
  }
  function renderDefaultRegexTransferModeSection(body) {
    return getSharedSectionsApi().renderDefaultRegexTransferModeSection(body);
  }
  function renderEntryTransferPostActionSection(body) {
    return getSharedSectionsApi().renderEntryTransferPostActionSection(body);
  }
  function renderMobileTopbarAvoidSection(body) {
    return getSharedSectionsApi().renderMobileTopbarAvoidSection(body);
  }
  function renderMergeSameNameUserSection(body) {
    return getSharedSectionsApi().renderMergeSameNameUserSection(body);
  }
  function renderMobileFullscreenSection(body) {
    return getSharedSectionsApi().renderMobileFullscreenSection(body);
  }
  function renderLanguageSwitchSection(body) {
    return getSharedSectionsApi().renderLanguageSwitchSection(body);
  }
  function renderBridgeConnectionSection(body) {
    return getSharedSectionsApi().renderBridgeConnectionSection(body);
  }
  function getDefaultSearchScope() {
    return getSharedSectionsApi().getDefaultSearchScope();
  }
  function getDefaultRegexTransferMode() {
    return getSharedSectionsApi().getDefaultRegexTransferMode();
  }

  // ==================== 共享：自定义布局配置区域（已迁移 settings/pages/layout.js） ====================
  let _customLayoutApi = null;
  function getCustomLayoutApi() {
    if (!_customLayoutApi) {
      _customLayoutApi = createCustomLayoutCore({
        $,
        extension_settings,
        extensionName,
        getContext,
        cfmToastr,
        cfmConfirm,
        getOrderedTabs,
        ensureTabMenuConfig,
        getTabMenuConfig,
        getOrderedActions,
        ensureToolbarMenuConfig,
        getToolbarMenuConfig,
        applyAllToolbarVisibility,
        flashDraggedElement,
        cfmIsTouchDevice,
        renderConfigBody,
        CFM_TAB_META,
        CFM_ACTION_META,
        getCurrentResourceType: () => currentResourceType,
      });
    }
    return _customLayoutApi;
  }
  function renderCustomLayoutSection(body) {
    return getCustomLayoutApi().renderCustomLayoutSection(body);
  }

  let cfmConfigTopActiveTab = "settings";

  let _configTabShellApi = null;
  function getConfigTabShellApi() {
    if (!_configTabShellApi) {
      _configTabShellApi = createConfigTabShellCore({
        $,
        getCfmConfigTopActiveTab: () => cfmConfigTopActiveTab,
        setCfmConfigTopActiveTab: (v) => {
          cfmConfigTopActiveTab = v;
        },
      });
    }
    return _configTabShellApi;
  }

  function createConfigTabShell(defaultTab = "settings") {
    return getConfigTabShellApi().createConfigTabShell(defaultTab);
  }

  // ==================== 设置弹窗内容渲染（已迁移 settings/pages/settings.js） ====================
  let _settingsPageApi = null;
  function getSettingsPageApi() {
    if (!_settingsPageApi) {
      _settingsPageApi = createSettingsPageCore({
        $,
        extensionName,
        extension_settings,
        getContext,
        cfmToastr,
        cfmConfirm,
        // Set 状态（引用注入）
        configSelectedFolderIds,
        cfmDeleteSelected,
        resConfigDeleteSelected,
        resConfigSelectedFolderIds,
        configExpandedNodes,
        presetConfigExpandedNodes,
        themeConfigExpandedNodes,
        bgConfigExpandedNodes,
        personaConfigExpandedNodes,
        qrConfigExpandedNodes,
        worldInfoConfigExpandedNodes,
        regexConfigExpandedNodes,
        // 基础类型状态（getter/setter 注入）
        getCfmDeleteMode: () => cfmDeleteMode,
        setCfmDeleteMode: (v) => {
          cfmDeleteMode = v;
        },
        getCfmDeleteCascade: () => cfmDeleteCascade,
        setCfmDeleteCascade: (v) => {
          cfmDeleteCascade = v;
        },
        getCfmDeleteLastClickedId: () => cfmDeleteLastClickedId,
        setCfmDeleteLastClickedId: (v) => {
          cfmDeleteLastClickedId = v;
        },
        getCfmDeleteRangeMode: () => cfmDeleteRangeMode,
        setCfmDeleteRangeMode: (v) => {
          cfmDeleteRangeMode = v;
        },
        getCfmInvertScope: () => cfmInvertScope,
        setCfmInvertScope: (v) => {
          cfmInvertScope = v;
        },
        getResConfigDeleteMode: () => resConfigDeleteMode,
        setResConfigDeleteMode: (v) => {
          resConfigDeleteMode = v;
        },
        getResConfigDeleteCascade: () => resConfigDeleteCascade,
        setResConfigDeleteCascade: (v) => {
          resConfigDeleteCascade = v;
        },
        getResConfigDeleteLastClickedId: () => resConfigDeleteLastClickedId,
        setResConfigDeleteLastClickedId: (v) => {
          resConfigDeleteLastClickedId = v;
        },
        getResConfigDeleteRangeMode: () => resConfigDeleteRangeMode,
        setResConfigDeleteRangeMode: (v) => {
          resConfigDeleteRangeMode = v;
        },
        getResConfigInvertScope: () => resConfigInvertScope,
        setResConfigInvertScope: (v) => {
          resConfigInvertScope = v;
        },
        getCurrentResourceType: () => currentResourceType,
        getCfmConfigTopActiveTab: () => cfmConfigTopActiveTab,
        // 渲染依赖
        renderConfigTreeItem,
        renderButtonModeSection,
        renderTopbarIconConfigSection,
        renderDefaultPageConfigSection,
        renderDefaultSearchScopeSection,
        renderDefaultRegexTransferModeSection,
        renderEntryTransferPostActionSection,
        renderMobileTopbarAvoidSection,
        renderMobileFullscreenSection,
        renderLanguageSwitchSection,
        renderBridgeConnectionSection,
        renderMergeSameNameUserSection,
        renderCustomLayoutSection,
        createConfigTabShell,
        // 数据/操作
        getFolderTagIds,
        getTagList,
        getTagName,
        getTopLevelFolders,
        sortFolders,
        saveConfig,
        oneClickImportAllTags,
        createTagsSiblings,
        executeInvertSelection,
        executeMultiDelete,
        executeResourceMultiDelete,
        showDeleteConfirmDialog,
        showResDeleteConfirmDialog,
        showBatchCreatePopup,
        showResourceBatchCreatePopup,
        showRegexBatchCreatePopup,
        addRegexFolderConf,
        parseBatchText,
        // 资源树
        getResFolderTree,
        getResFolderIds,
        getResFolderDisplayName,
        getResTopLevelFolders,
        getResChildFolders,
        getResFlatFolderList,
        sortResFolders,
        addResFolder,
        removeResFolder,
        countResItemsRecursive,
        ensureResourceSettings,
        // 数据对象（引用注入）
        config,
        // 工具
        escapeHtml,
      });
    }
    return _settingsPageApi;
  }
  function renderConfigBody(defaultTab = null) {
    return getSettingsPageApi().renderConfigBody(defaultTab);
  }
  function renderResourceConfigBody(body, type, defaultTab = "settings") {
    return getSettingsPageApi().renderResourceConfigBody(
      body,
      type,
      defaultTab,
    );
  }
  function renderRegexConfigBody(body, defaultTab = "settings") {
    return getSettingsPageApi().renderRegexConfigBody(body, defaultTab);
  }

  // ==================== 批量创建/删除/树形渲染（已迁移 settings/batch-create.js） ====================
  let _batchCreateApi = null;
  function getBatchCreateApi() {
    if (!_batchCreateApi) {
      _batchCreateApi = createBatchCreateCore({
        $,
        extensionName,
        extension_settings,
        getContext,
        cfmToastr,
        // 渲染依赖
        renderConfigBody,
        renderResourceConfigBody,
        renderRegexConfigBody,
        escapeHtml,
        // 数据/操作
        config,
        getFolderTagIds,
        getTagName,
        getTopLevelFolders,
        getChildFolders,
        sortFolders,
        sortResFolders,
        getResFolderTree,
        getResFolderIds,
        getResFolderDisplayName,
        getResTopLevelFolders,
        getResChildFolders,
        getResFolderPath,
        addResFolder,
        removeResFolder,
        isNewlyImported,
        deleteTagFromSystem,
        saveConfig,
        recursiveRebuildTagNames,
        findOrCreateTag,
        buildBatchTemplateHtml,
        bindBatchTemplateEvents,
        parseBatchText,
        renderBatchPreview,
        // Set 状态（引用注入）
        configSelectedFolderIds,
        cfmDeleteSelected,
        resConfigDeleteSelected,
        resConfigSelectedFolderIds,
        configExpandedNodes,
        // 基础类型状态（getter/setter 注入）
        getCfmDeleteMode: () => cfmDeleteMode,
        setCfmDeleteMode: (v) => {
          cfmDeleteMode = v;
        },
        getCfmDeleteCascade: () => cfmDeleteCascade,
        setCfmDeleteCascade: (v) => {
          cfmDeleteCascade = v;
        },
        getCfmDeleteLastClickedId: () => cfmDeleteLastClickedId,
        setCfmDeleteLastClickedId: (v) => {
          cfmDeleteLastClickedId = v;
        },
        getCfmDeleteRangeMode: () => cfmDeleteRangeMode,
        setCfmDeleteRangeMode: (v) => {
          cfmDeleteRangeMode = v;
        },
        getCfmInvertScope: () => cfmInvertScope,
        setCfmInvertScope: (v) => {
          cfmInvertScope = v;
        },
        getResConfigDeleteMode: () => resConfigDeleteMode,
        setResConfigDeleteMode: (v) => {
          resConfigDeleteMode = v;
        },
        getResConfigDeleteCascade: () => resConfigDeleteCascade,
        setResConfigDeleteCascade: (v) => {
          resConfigDeleteCascade = v;
        },
        getResConfigDeleteLastClickedId: () => resConfigDeleteLastClickedId,
        setResConfigDeleteLastClickedId: (v) => {
          resConfigDeleteLastClickedId = v;
        },
        getResConfigDeleteRangeMode: () => resConfigDeleteRangeMode,
        setResConfigDeleteRangeMode: (v) => {
          resConfigDeleteRangeMode = v;
        },
        getResConfigInvertScope: () => resConfigInvertScope,
        setResConfigInvertScope: (v) => {
          resConfigInvertScope = v;
        },
      });
    }
    return _batchCreateApi;
  }
  function getResTypeLabel(type) {
    return getBatchCreateApi().getResTypeLabel(type);
  }
  function showResDeleteConfirmDialog(type, folderIds, onConfirm) {
    return getBatchCreateApi().showResDeleteConfirmDialog(
      type,
      folderIds,
      onConfirm,
    );
  }
  function executeResourceMultiDelete(type) {
    return getBatchCreateApi().executeResourceMultiDelete(type);
  }
  function showResourceBatchCreatePopup(type) {
    return getBatchCreateApi().showResourceBatchCreatePopup(type);
  }
  function renderConfigTreeItem(container, folderId, depth) {
    return getBatchCreateApi().renderConfigTreeItem(container, folderId, depth);
  }
  function executeInvertSelection() {
    return getBatchCreateApi().executeInvertSelection();
  }
  function getFlatFolderList() {
    return getBatchCreateApi().getFlatFolderList();
  }
  function getResFlatFolderList(type) {
    return getBatchCreateApi().getResFlatFolderList(type);
  }
  function showDeleteConfirmDialog(folderIds, onComplete) {
    return getBatchCreateApi().showDeleteConfirmDialog(folderIds, onComplete);
  }
  function executeMultiDelete() {
    return getBatchCreateApi().executeMultiDelete();
  }
  function createTagsSiblings(input, parentFolderId, silent) {
    return getBatchCreateApi().createTagsSiblings(
      input,
      parentFolderId,
      silent,
    );
  }
  function showBatchCreatePopup() {
    return getBatchCreateApi().showBatchCreatePopup();
  }
  function executeBatchCreate(nodes, parentId, silent) {
    return getBatchCreateApi().executeBatchCreate(nodes, parentId, silent);
  }
  function addRegexFolderConf(name, parentId, displayName) {
    return getBatchCreateApi().addRegexFolderConf(name, parentId, displayName);
  }
  function showRegexBatchCreatePopup(body) {
    return getBatchCreateApi().showRegexBatchCreatePopup(body);
  }

  // ==================== 批量创建纯函数（已迁移 settings/render/controls.js） ====================
  let _batchControlsApi = null;
  function getBatchControlsApi() {
    if (!_batchControlsApi) {
      _batchControlsApi = createBatchControlsCore({
        escapeHtml,
      });
    }
    return _batchControlsApi;
  }
  function parseBatchText(text) {
    return getBatchControlsApi().parseBatchText(text);
  }
  function renderBatchPreview(container, nodes, depth) {
    return getBatchControlsApi().renderBatchPreview(container, nodes, depth);
  }

  // ==================== 预设视图渲染（双栏 + 树形嵌套） ====================
  function renderPresetsView() {
    return renderPresetsViewCore({
      $,
      applyPreset,
      bindTouchSafeTap,
      cfmDebugDragLog,
      cfmToastr,
      clearMultiSelect,
      countResItemsRecursive,
      escapeHtml,
      executePresetNoteEdit,
      executePresetRename,
      executePresetSearch,
      getContext,
      getCurrentPresets,
      getCurrentResourceType: () => currentResourceType,
      getMultiDragData,
      getPresetNote,
      getResChildFolders,
      getResFavorites,
      getResFolderDisplayName,
      getResFolderIds,
      getResFolderPath,
      getResFolderTree,
      getResTopLevelFolders,
      getResourceGroups,
      getVisibleResourceIds,
      handleFolderTargetMove,
      isResFavorite,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependExportToolbar,
      prependPresetNoteToolbar,
      prependPresetRenameToolbar,
      prependResDeleteToolbar,
      promptRenameFolder,
      recordTouchTapStart,
      renderPresetDetailSubList,
      renderPresetRegexSubList,
      renderPresetsView,
      reorderResFolder,
      selectAllVisible,
      setItemGroup,
      setTimeout: window.setTimeout.bind(window),
      shouldIgnoreTouchTapAfterMove,
      sortResFolders,
      sortResItems,
      state: {
        get selectedPresetFolder() {
          return selectedPresetFolder;
        },
        set selectedPresetFolder(value) {
          selectedPresetFolder = value;
        },
        get presetExpandedNodes() {
          return presetExpandedNodes;
        },
        get presetRightSortMode() {
          return presetRightSortMode;
        },
        get cfmPresetRegexMode() {
          return cfmPresetRegexMode;
        },
        get cfmPresetRegexHighlightPath() {
          return cfmPresetRegexHighlightPath;
        },
        get cfmPresetNoteMode() {
          return cfmPresetNoteMode;
        },
        get cfmPresetNoteSelected() {
          return cfmPresetNoteSelected;
        },
        get cfmPresetRenameMode() {
          return cfmPresetRenameMode;
        },
        get cfmPresetRenameSelected() {
          return cfmPresetRenameSelected;
        },
        get cfmPresetRegexTargetName() {
          return cfmPresetRegexTargetName;
        },
        get cfmPresetRegexExpandedNames() {
          return cfmPresetRegexExpandedNames;
        },
        get cfmPresetDetailExpandedNames() {
          return cfmPresetDetailExpandedNames;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
      },
      toggleExportItem,
      toggleMultiSelectItem,
      togglePresetNoteItem,
      togglePresetRenameItem,
      toggleResDeleteItem,
      toggleResFavorite,
      touchDragMgr,
      window,
      wouldCreateResCycle,
    });
  }

  // ==================== 主题视图渲染（双栏 + 树形嵌套） ====================
  function renderThemesView() {
    return renderThemesViewCore({
      $,
      applyTheme,
      bindTouchSafeTap,
      cfmToastr,
      clearMultiSelect,
      countResItemsRecursive,
      escapeHtml,
      executeThemeNoteEdit,
      executeThemeRename,
      executeThemeSearch,
      getBackgroundDisplayName,
      getContext,
      getMultiDragData,
      getResChildFolders,
      getResFavorites,
      getResFolderDisplayName,
      getResFolderPath,
      getResFolderTree,
      getResTopLevelFolders,
      getResourceGroups,
      getThemeBgBinding,
      getThemeNames,
      getThemeNote,
      getVisibleResourceIds,
      handleFolderTargetMove,
      handleThemeBgLink,
      isResFavorite,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependExportToolbar,
      prependResDeleteToolbar,
      prependThemeNoteToolbar,
      prependThemeRenameToolbar,
      promptRenameFolder,
      reorderResFolder,
      selectAllVisible,
      setItemGroup,
      setTimeout: window.setTimeout.bind(window),
      sortResFolders,
      sortResItems,
      toggleExportItem,
      toggleMultiSelectItem,
      toggleResDeleteItem,
      toggleResFavorite,
      toggleThemeNoteItem,
      toggleThemeRenameItem,
      touchDragMgr,
      wouldCreateResCycle,
      renderThemesView,
      state: {
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcDropHandled() {
          return _pcDropHandled;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmMultiSelectLastClicked() {
          return cfmMultiSelectLastClicked;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmThemeNoteMode() {
          return cfmThemeNoteMode;
        },
        get cfmThemeNoteSelected() {
          return cfmThemeNoteSelected;
        },
        get cfmThemeRenameMode() {
          return cfmThemeRenameMode;
        },
        get cfmThemeRenameSelected() {
          return cfmThemeRenameSelected;
        },
        get selectedThemeFolder() {
          return selectedThemeFolder;
        },
        set selectedThemeFolder(value) {
          selectedThemeFolder = value;
        },
        get themeExpandedNodes() {
          return themeExpandedNodes;
        },
        get themeRightSortMode() {
          return themeRightSortMode;
        },
      },
    });
  }

  // ==================== 背景视图渲染（双栏 + 树形嵌套） ====================
  function renderBackgroundsView() {
    return renderBackgroundsViewCore({
      $,
      BG_ORIENT_ICONS,
      BG_ORIENT_LABELS,
      applyBackground,
      autoDetectBgOrientations,
      bindTouchSafeTap,
      cfmToastr,
      clearMultiSelect,
      countResItemsRecursive,
      document,
      escapeHtml,
      executeBgNoteEdit,
      executeBgRename,
      executeBgSearch,
      getBackgroundDisplayName,
      getBackgroundNames,
      getBackgroundThumbnailUrl,
      getBgNote,
      getBgOrientation,
      getCurrentResourceType: () => currentResourceType,
      getMultiDragData,
      getResChildFolders,
      getResFavorites,
      getResFolderDisplayName,
      getResFolderPath,
      getResFolderTree,
      getResTopLevelFolders,
      getResourceGroups,
      getVisibleResourceIds,
      handleFolderTargetMove,
      isResFavorite,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependBgNoteToolbar,
      prependBgRenameToolbar,
      prependExportToolbar,
      prependResDeleteToolbar,
      promptRenameFolder,
      renderBackgroundsView,
      reorderResFolder,
      selectAllVisible,
      setItemGroup,
      setTimeout: window.setTimeout.bind(window),
      sortResFolders,
      sortResItems,
      state: {
        get selectedBgFolder() {
          return selectedBgFolder;
        },
        set selectedBgFolder(value) {
          selectedBgFolder = value;
        },
        get bgExpandedNodes() {
          return bgExpandedNodes;
        },
        get bgRightSortMode() {
          return bgRightSortMode;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmBgNoteMode() {
          return cfmBgNoteMode;
        },
        get cfmBgNoteSelected() {
          return cfmBgNoteSelected;
        },
        get cfmBgRenameMode() {
          return cfmBgRenameMode;
        },
        get cfmBgRenameSelected() {
          return cfmBgRenameSelected;
        },
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
      },
      toggleBgNoteItem,
      toggleBgRenameItem,
      toggleExportItem,
      toggleMultiSelectItem,
      toggleResDeleteItem,
      toggleResFavorite,
      touchDragMgr,
      updateDefaultBgBtnState,
      wouldCreateResCycle,
    });
  }

  // ==================== 角色世界书归类 ====================
  /**
   * 扫描所有角色卡，收集关联的世界书名称
   */
  async function scanCharacterWorldBooks() {
    const characters = getCharacters();
    const wiNames = new Set(await getWorldInfoNames(true));
    const linked = new Map(); // 世界书名 -> 关联角色名列表
    const embedded = new Map(); // avatar -> {name, bookName, alreadyImported}
    for (const ch of characters) {
      const worldName = ch.data?.extensions?.world;
      if (worldName && wiNames.has(worldName)) {
        if (!linked.has(worldName)) linked.set(worldName, []);
        linked.get(worldName).push(ch.name || ch.avatar);
      }
      if (ch.data?.character_book) {
        const bookName = ch.data.character_book.name || `${ch.name}'s Lorebook`;
        // 判断是否已导入：内嵌世界书名称在列表中，或者角色已绑定了一个存在的世界书
        const worldName = ch.data?.extensions?.world;
        const imported =
          wiNames.has(bookName) || (worldName && wiNames.has(worldName));
        embedded.set(ch.avatar, {
          name: ch.name || ch.avatar,
          bookName,
          alreadyImported: imported,
        });
      }
    }
    return { linked, embedded };
  }

  /**
   * 显示角色世界书归类弹窗
   */
  async function showCharBookClassifyPopup() {
    if ($("#cfm-charbook-classify-overlay").length > 0) return;

    const { linked, embedded } = await scanCharacterWorldBooks();
    const wiGroups = getResourceGroups("worldinfo");

    // 构建文件夹选项
    function buildFolderOptions() {
      const tree = getResFolderTree("worldinfo");
      const options = ['<option value="">— 不归类 —</option>'];
      function addOpts(parentId, depth) {
        const children = sortResFolders(
          "worldinfo",
          Object.keys(tree).filter(
            (id) => tree[id].parentId === (parentId || null),
          ),
        );
        for (const id of children) {
          const indent = "&nbsp;".repeat(depth * 4);
          options.push(
            `<option value="${escapeHtml(id)}">${indent}${escapeHtml(getResFolderDisplayName("worldinfo", id))}</option>`,
          );
          addOpts(id, depth + 1);
        }
      }
      addOpts(null, 0);
      return options.join("");
    }

    // 优先使用已保存的自动归类文件夹，其次使用当前选中的世界书文件夹
    const savedAutoFolder =
      extension_settings[extensionName].autoCharBookFolder || "";
    const currentFolder =
      selectedWorldInfoFolder &&
      selectedWorldInfoFolder !== "__ungrouped__" &&
      selectedWorldInfoFolder !== "__favorites__"
        ? selectedWorldInfoFolder
        : "";
    const defaultFolder = savedAutoFolder || currentFolder;

    // 构建关联世界书列表HTML
    let linkedHtml = "";
    if (linked.size === 0) {
      linkedHtml = '<div class="cfm-cb-empty">未发现角色卡关联的世界书</div>';
    } else {
      for (const [wiName, charNames] of linked) {
        const currentFolder = wiGroups[wiName] || null;
        const currentDisplay = currentFolder
          ? getResFolderDisplayName("worldinfo", currentFolder)
          : "未归类";
        const charList =
          charNames.length <= 3
            ? charNames.join("、")
            : charNames.slice(0, 3).join("、") + `...等${charNames.length}个`;
        linkedHtml += `
          <div class="cfm-cb-row" data-wi-name="${escapeHtml(wiName)}">
            <label class="cfm-cb-check-label"><input type="checkbox" class="cfm-cb-check" checked>
              <span class="cfm-cb-wi-name">${escapeHtml(wiName)}</span></label>
            <div class="cfm-cb-row-meta">
              <span class="cfm-cb-chars" title="${escapeHtml(charNames.join("、"))}">关联: ${escapeHtml(charList)}</span>
              <span class="cfm-cb-cur">当前: ${escapeHtml(currentDisplay)}</span>
            </div>
          </div>`;
      }
    }

    // 构建内嵌世界书列表HTML
    let embeddedHtml = "";
    const embEntries = [...embedded.entries()];
    if (embEntries.length === 0) {
      embeddedHtml = '<div class="cfm-cb-empty">未发现角色卡内嵌的世界书</div>';
    } else {
      for (const [avatar, info] of embEntries) {
        const statusText = info.alreadyImported ? "已导入" : "未导入";
        const statusClass = info.alreadyImported
          ? "cfm-cb-imported"
          : "cfm-cb-not-imported";
        embeddedHtml += `
          <div class="cfm-cb-row cfm-cb-embed-row" data-avatar="${escapeHtml(avatar)}">
            <label class="cfm-cb-check-label"><input type="checkbox" class="cfm-cb-embed-check" ${info.alreadyImported ? "" : "checked"}>
              <span class="cfm-cb-wi-name">${escapeHtml(info.name)}</span></label>
            <div class="cfm-cb-row-meta">
              <span class="cfm-cb-bookname">世界书: ${escapeHtml(info.bookName)}</span>
              <span class="cfm-cb-status ${statusClass}">${statusText}</span>
            </div>
          </div>`;
      }
    }

    const folderOpts = buildFolderOptions();
    const dialogHtml = `
      <div class="cfm-cb-popup">
        <div class="cfm-cb-header">
          <span class="cfm-cb-title"><i class="fa-solid fa-user-tag"></i> 角色世界书归类</span>
          <button class="cfm-cb-close" title="关闭"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="cfm-cb-body">
          <div class="cfm-cb-section">
            <div class="cfm-cb-section-title">
              <i class="fa-solid fa-link"></i> 关联世界书 (extensions.world)
              <span class="cfm-cb-section-count">${linked.size} 个</span>
            </div>
            <div class="cfm-cb-section-desc">角色卡通过 extensions.world 字段关联的已存在世界书</div>
            <div class="cfm-cb-list cfm-cb-linked-list">${linkedHtml}</div>
            <div class="cfm-cb-select-actions">
              <button class="cfm-cb-sel-all" data-target="linked">全选</button>
              <button class="cfm-cb-sel-none" data-target="linked">全不选</button>
            </div>
          </div>
          <div class="cfm-cb-section">
            <div class="cfm-cb-section-title">
              <i class="fa-solid fa-book-bookmark"></i> 内嵌世界书 (character_book)
              <span class="cfm-cb-section-count">${embEntries.length} 个</span>
            </div>
            <div class="cfm-cb-section-desc">角色卡内嵌的世界书数据，勾选未导入的可自动提取并归类</div>
            <div class="cfm-cb-list cfm-cb-embed-list">${embeddedHtml}</div>
            <div class="cfm-cb-select-actions">
              <button class="cfm-cb-sel-all" data-target="embed">全选</button>
              <button class="cfm-cb-sel-none" data-target="embed">全不选</button>
            </div>
          </div>
          <div class="cfm-cb-target">
            <label class="cfm-cb-target-label"><i class="fa-solid fa-folder"></i> 目标文件夹:</label>
            <select class="cfm-cb-target-select" id="cfm-cb-target-folder">${folderOpts}</select>
          </div>
          <div class="cfm-cb-auto-setting">
            <label class="cfm-cb-check-label">
              <input type="checkbox" id="cfm-cb-auto-extract" ${extension_settings[extensionName].autoCharBookFolder ? "checked" : ""}>
              <span>导入角色卡时自动提取内嵌世界书到上方选定的文件夹</span>
            </label>
            <div class="cfm-cb-auto-hint">启用后，每次通过资源管理器导入角色卡时，会自动提取内嵌世界书并归类到设定的文件夹</div>
          </div>
        </div>
        <div class="cfm-cb-footer">
          <button class="cfm-cb-cancel">取消</button>
          <button class="cfm-cb-confirm">确认归类</button>
        </div>
      </div>
    `;

    const overlay = $("<div id='cfm-charbook-classify-overlay'>")
      .css({
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      })
      .html(dialogHtml);

    $("body").append(overlay);

    // 设置默认文件夹
    if (defaultFolder) overlay.find("#cfm-cb-target-folder").val(defaultFolder);

    // 全选/全不选
    overlay.find(".cfm-cb-sel-all").on("click", function () {
      const target = $(this).data("target");
      const selector =
        target === "linked"
          ? ".cfm-cb-linked-list .cfm-cb-check"
          : ".cfm-cb-embed-list .cfm-cb-embed-check";
      overlay.find(selector).prop("checked", true);
    });
    overlay.find(".cfm-cb-sel-none").on("click", function () {
      const target = $(this).data("target");
      const selector =
        target === "linked"
          ? ".cfm-cb-linked-list .cfm-cb-check"
          : ".cfm-cb-embed-list .cfm-cb-embed-check";
      overlay.find(selector).prop("checked", false);
    });

    // 关闭
    const closePopup = () => overlay.remove();
    overlay.find(".cfm-cb-close, .cfm-cb-cancel").on("click", closePopup);
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) closePopup();
    });

    // 确认归类
    overlay.find(".cfm-cb-confirm").on("click", async function () {
      const targetFolder = overlay.find("#cfm-cb-target-folder").val() || null;

      // 保存自动提取设置
      const autoExtract = overlay.find("#cfm-cb-auto-extract").prop("checked");
      extension_settings[extensionName].autoCharBookFolder = autoExtract
        ? targetFolder || null
        : null;
      getContext().saveSettingsDebounced();

      let movedCount = 0;
      let importedCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      const alreadyProcessed = new Set(); // 去重：防止关联和内嵌重复归类同一个世界书
      const wiGroups_ = getResourceGroups("worldinfo");

      // 1. 处理关联世界书归类
      overlay.find(".cfm-cb-linked-list .cfm-cb-row").each(function () {
        const checked = $(this).find(".cfm-cb-check").prop("checked");
        if (!checked) return;
        const wiName = $(this).data("wi-name");
        if (wiName) {
          alreadyProcessed.add(wiName);
          // 如果已经在目标文件夹中，跳过
          if (wiGroups_[wiName] === targetFolder) {
            skippedCount++;
            return;
          }
          setItemGroup("worldinfo", wiName, targetFolder);
          movedCount++;
        }
      });

      // 2. 处理内嵌世界书提取+归类
      const embedRows = overlay.find(".cfm-cb-embed-list .cfm-cb-embed-row");
      for (let i = 0; i < embedRows.length; i++) {
        const row = $(embedRows[i]);
        if (!row.find(".cfm-cb-embed-check").prop("checked")) continue;
        const avatar = row.data("avatar");
        const info = embedded.get(avatar);
        if (!info) continue;

        if (info.alreadyImported) {
          // 已导入的直接归类（但需要去重，避免和关联世界书重复计数）
          const bookWiName = info.bookName;
          // 尝试用关联的 world 名称匹配
          const ch = getCharacters().find((c) => c.avatar === avatar);
          const linkedName = ch?.data?.extensions?.world;
          if (linkedName && alreadyProcessed.has(linkedName)) {
            skippedCount++;
            continue; // 已在关联世界书中处理过
          }
          if (alreadyProcessed.has(bookWiName)) {
            skippedCount++;
            continue;
          }
          alreadyProcessed.add(bookWiName);
          if (targetFolder) {
            if (wiGroups_[bookWiName] === targetFolder) {
              skippedCount++;
              continue;
            }
            setItemGroup("worldinfo", bookWiName, targetFolder);
            movedCount++;
          }
        } else {
          // 未导入的需要先提取导入
          try {
            const ch = getCharacters().find((c) => c.avatar === avatar);
            if (!ch?.data?.character_book) continue;
            const bookName = info.bookName;
            if (alreadyProcessed.has(bookName)) {
              skippedCount++;
              continue;
            }
            alreadyProcessed.add(bookName);
            // 使用酒馆原生的 convertCharacterBook 将 V2 格式转换为 ST 内部格式
            const ctx = getContext();
            const convertedBook = ctx.convertCharacterBook(
              ch.data.character_book,
            );
            await ctx.saveWorldInfo(bookName, convertedBook, true);
            if (targetFolder) {
              setItemGroup("worldinfo", bookName, targetFolder);
            }
            importedCount++;
          } catch (err) {
            console.error("[CFM] 提取内嵌世界书失败:", avatar, err);
            failCount++;
          }
        }
      }

      closePopup();

      // 刷新缓存和视图
      _worldInfoNamesCache = null;
      if (importedCount > 0) {
        // 使用酒馆原生的 updateWorldInfoList 刷新世界书列表和 DOM
        try {
          await getContext().updateWorldInfoList();
        } catch (e) {
          console.warn("[CFM] 刷新世界书列表失败", e);
        }
      }
      renderWorldInfoView();

      // 汇报结果
      let msg = "";
      if (movedCount > 0) msg += `归类了 ${movedCount} 个世界书`;
      if (importedCount > 0)
        msg += `${msg ? "，" : ""}提取并导入了 ${importedCount} 个内嵌世界书`;
      if (skippedCount > 0)
        msg += `${msg ? "，" : ""}${skippedCount} 个已在目标文件夹或重复`;
      if (failCount > 0) msg += `${msg ? "，" : ""}${failCount} 个失败`;
      if (!msg) msg = "未选择任何世界书";
      if (failCount > 0) cfmToastr.warning(msg, "角色世界书归类");
      else if (movedCount > 0 || importedCount > 0)
        cfmToastr.success(msg, "角色世界书归类");
      else cfmToastr.info(msg, "角色世界书归类");
    });

    // ESC关闭
    const escHandler = (evt) => {
      if (evt.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  // ==================== 世界书视图渲染（双栏 + 树形嵌套） ====================
  let _worldInfoRenderVersion = 0;
  function renderWorldInfoView() {
    return renderWorldInfoViewCore({
      getResFolderTree,
      getResourceGroups,
      sortResFolders,
      getResChildFolders,
      countResItemsRecursive,
      getResFolderPath,
      getResTopLevelFolders,
      getVisibleResourceIds,
      getResFavorites,
      getResFolderIds,
      getResFolderDisplayName,
      sortResItems,
      getWorldInfoNames,
      getWorldInfoNote,
      getWorldInfoDisplayName,
      getActiveWorldInfoSet,
      getCharBoundWorldBooks,
      isWorldInfoEntryBookExpanded,
      openWorldInfoEditor,
      refreshWorldInfoPanelView,
      renderWorldInfoEntrySubList,
      collectWorldInfoNamesFromDom,
      bindWorldInfoEntryCollapseTargets,
      shouldIgnoreWorldInfoEntryTap,
      applyWorldInfoMultiActivation,
      cfmDebugDragLog,
      toggleExportItem,
      toggleMultiSelectItem,
      toggleResDeleteItem,
      toggleResFavorite,
      toggleWorldInfoActivation,
      toggleWorldInfoEntryBookExpanded,
      toggleWorldInfoNoteItem,
      toggleWorldInfoRenameItem,
      syncWiPresetTrackingForManualToggle,
      handleFolderTargetMove,
      setItemGroup,
      cfmToastr,
      promptRenameFolder,
      wouldCreateResCycle,
      reorderResFolder,
      clearMultiSelect,
      pcDragStart,
      pcDragEnd,
      pcGetDropData,
      executeWorldInfoSearch,
      executeWorldInfoNoteEdit,
      executeWorldInfoRename,
      selectAllVisible,
      isResFavorite,
      bindTouchSafeTap,
      prependResDeleteToolbar,
      prependExportToolbar,
      prependWorldInfoNoteToolbar,
      prependWorldInfoRenameToolbar,
      escapeHtml,
      getContext,
      setTimeout: window.setTimeout.bind(window),
      $,
      getMultiDragData,
      touchDragMgr,
      getCurrentResourceType: () => currentResourceType,
      renderWorldInfoView,
      state: {
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcDropHandled() {
          return _pcDropHandled;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        get _worldInfoNamesCache() {
          return _worldInfoNamesCache;
        },
        set _worldInfoNamesCache(value) {
          _worldInfoNamesCache = value;
        },
        get _worldInfoPreloadPromise() {
          return _worldInfoPreloadPromise;
        },
        get _worldInfoRenderVersion() {
          return _worldInfoRenderVersion;
        },
        set _worldInfoRenderVersion(value) {
          _worldInfoRenderVersion = value;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmMultiSelectLastClicked() {
          return cfmMultiSelectLastClicked;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmWorldInfoEntryLastFocusedName() {
          return cfmWorldInfoEntryLastFocusedName;
        },
        set cfmWorldInfoEntryLastFocusedName(value) {
          cfmWorldInfoEntryLastFocusedName = value;
        },
        get cfmWorldInfoNoteMode() {
          return cfmWorldInfoNoteMode;
        },
        get cfmWorldInfoNoteSelected() {
          return cfmWorldInfoNoteSelected;
        },
        get cfmWorldInfoRenameMode() {
          return cfmWorldInfoRenameMode;
        },
        get cfmWorldInfoRenameSelected() {
          return cfmWorldInfoRenameSelected;
        },
        get selectedWorldInfoFolder() {
          return selectedWorldInfoFolder;
        },
        set selectedWorldInfoFolder(value) {
          selectedWorldInfoFolder = value;
        },
        get worldInfoExpandedNodes() {
          return worldInfoExpandedNodes;
        },
        get worldInfoRightSortMode() {
          return worldInfoRightSortMode;
        },
      },
    });
  }

  // ==================== 快速回复激活状态管理 ====================
  /**
   * 获取所有快速回复集名称
   */
  function getQrSetNames() {
    return getQuickReplyPresetsApi().getQrSetNames();
  }

  function getExistingQrSetNameSet() {
    return getQuickReplyPresetsApi().getExistingQrSetNameSet();
  }

  function filterExistingQrSetNames(setNames, existingNameSet) {
    return getQuickReplyPresetsApi().filterExistingQrSetNames(
      setNames,
      existingNameSet,
    );
  }

  function sanitizeQrActivePresetState(save = false) {
    return getQuickReplyPresetsApi().sanitizeQrActivePresetState(save);
  }

  /**
   * 获取当前激活的快速回复集名称集合（全局 + 聊天级）
   */
  function getActiveQrSets() {
    return getQuickReplyPresetsApi().getActiveQrSets();
  }

  /**
   * 切换快速回复集的全局激活状态
   */
  async function toggleQrSetActivation(name, activate) {
    return getQuickReplyPresetsApi().toggleQrSetActivation(name, activate);
  }

  /**
   * 批量设置快速回复集激活状态（用于加载分组预设）
   */
  async function applyQrPreset(setNames) {
    return getQuickReplyPresetsApi().applyQrPreset(setNames);
  }

  // ==================== 快速回复备注管理 ====================
  function getQrNote(name) {
    return getQuickReplyNotesApi().getQrNote(name);
  }

  function setQrNote(name, note) {
    return getQuickReplyNotesApi().setQrNote(name, note);
  }

  /**
   * 获取快速回复集中的各个快速回复项
   */
  function getQrSetItems(setName) {
    try {
      const api = typeof globalThis !== "undefined" && globalThis.quickReplyApi;
      if (!api) return [];
      // 尝试 api.getSetByName
      if (api.getSetByName) {
        const set = api.getSetByName(setName);
        if (set && set.qrList) return set.qrList;
      }
      // 尝试 QuickReplySet.list
      const QRS = globalThis.QuickReplySet;
      if (QRS && QRS.list) {
        const set = QRS.list.find((s) => s.name === setName);
        if (set && set.qrList) return set.qrList;
      }
      // 尝试 api.listQuickReplies
      if (api.listQuickReplies) {
        return api.listQuickReplies(setName) || [];
      }
    } catch (e) {
      console.warn("[CFM] 获取快速回复集内容失败", e);
    }
    return [];
  }

  /**
   * 打开快速回复内容编辑弹窗（聊天记录行风格）
   * @param {string} setName - QR 集名称
   * @param {number} qrIndex - QR 在集合中的索引
   * @param {object} qrItem - 快速回复对象
   */
  function openQrItemEditor(setName, qrIndex, qrItem) {
    const label = qrItem.label || qrItem.title || "(未命名)";
    const msg = qrItem.message || "";

    const overlay = $('<div class="cfm-qr-editor-overlay"></div>');
    const editorPopup = $(`
      <div class="cfm-qr-editor-popup">
        <div class="cfm-qr-editor-header">
          <h4><i class="fa-solid fa-comment"></i> ${escapeHtml(label)}</h4>
          <span class="cfm-qr-editor-set-info">${escapeHtml(setName)}</span>
          <button class="cfm-qr-editor-close">&times;</button>
        </div>
        <div class="cfm-qr-editor-body">
          <textarea class="cfm-qr-editor-textarea" spellcheck="false">${escapeHtml(msg)}</textarea>
        </div>
        <div class="cfm-qr-editor-footer">
          <button class="cfm-btn cfm-qr-editor-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
          <button class="cfm-btn cfm-qr-editor-save"><i class="fa-solid fa-check"></i> 保存</button>
        </div>
      </div>
    `);

    overlay.append(editorPopup);
    $("body").append(overlay);

    // 关闭
    function closeEditor() {
      overlay.remove();
    }
    overlay.on("click", (e) => {
      if ($(e.target).is(overlay)) closeEditor();
    });
    editorPopup.find(".cfm-qr-editor-close").on("click", closeEditor);
    editorPopup.find(".cfm-qr-editor-cancel").on("click", closeEditor);

    // 保存
    editorPopup.find(".cfm-qr-editor-save").on("click", async () => {
      const newMsg = editorPopup.find(".cfm-qr-editor-textarea").val();
      try {
        // 获取 QR Set 对象并修改
        const api =
          typeof globalThis !== "undefined" && globalThis.quickReplyApi;
        const QRS =
          typeof globalThis !== "undefined" && globalThis.QuickReplySet;
        let set = null;
        if (api && api.getSetByName) {
          set = api.getSetByName(setName);
        }
        if (!set && QRS && QRS.list) {
          set = QRS.list.find((s) => s.name === setName);
        }
        if (set && set.qrList && set.qrList[qrIndex]) {
          set.qrList[qrIndex].message = newMsg;
          // 保存到服务器
          if (typeof set.save === "function") {
            await set.save();
          } else if (typeof set.performSave === "function") {
            await set.performSave();
          } else {
            // 直接调用 API
            const response = await fetch("/api/quick-replies/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                set.toJSON
                  ? set.toJSON()
                  : { name: setName, qrList: set.qrList },
              ),
            });
            if (!response.ok) throw new Error("保存失败");
          }
          cfmToastr.success(`快速回复 "${label}" 已保存`);
        } else {
          cfmToastr.error("无法找到目标快速回复对象");
        }
      } catch (err) {
        console.error("[CFM] 保存快速回复失败", err);
        cfmToastr.error("保存失败: " + err.message);
      }
      closeEditor();
    });

    // ESC 关闭
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeEditor();
        $(document).off("keydown", escHandler);
      }
    };
    $(document).on("keydown", escHandler);

    // 聚焦到末尾
    setTimeout(() => {
      const ta = editorPopup.find(".cfm-qr-editor-textarea")[0];
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 100);
  }

  // ==================== 快速回复搜索 ====================
  let _qrSearchApi = null;
  function getQrSearchApi() {
    if (!_qrSearchApi) {
      _qrSearchApi = createQrSearchCore({
        $,
        applyQrMultiActivation,
        bindTouchSafeTap,
        countResItemsRecursive,
        escapeHtml,
        getActiveQrSets,
        getQrSetItems,
        getQrSetNames,
        getResFolderDisplayName,
        getResFolderIds,
        getResFolderPath,
        getResFolderTree,
        getResourceGroups,
        getVisibleResourceIds,
        isResFavorite,
        openQrItemEditor,
        renderQRView,
        selectAllVisible,
        syncQrPresetTrackingForManualToggle,
        toggleMultiSelectItem,
        toggleQrSetActivation,
        toggleResFavorite,
        state: {
          getSelectedQrFolder: () => selectedQrFolder,
          setSelectedQrFolder: (value) => {
            selectedQrFolder = value;
          },
          getQrExpandedNodes: () => qrExpandedNodes,
          getQrItemExpandedSets: () => qrItemExpandedSets,
          setCfmQrLastFocusedSetName: (value) => {
            cfmQrLastFocusedSetName = value;
          },
          getCfmMultiSelectMode: () => cfmMultiSelectMode,
          getCfmMultiSelected: () => cfmMultiSelected,
          getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
          setCfmMultiSelectRangeMode: (value) => {
            cfmMultiSelectRangeMode = value;
          },
          setCfmMultiSelectLastClicked: (value) => {
            cfmMultiSelectLastClicked = value;
          },
        },
      });
    }
    return _qrSearchApi;
  }
  function executeQrSearch() {
    return getQrSearchApi().executeQrSearch();
  }

  // ==================== 聊天记录视图渲染（双栏 + 树形嵌套） ====================

  function getChatlogTargetAvatar() {
    if (cfmChatlogTargetAvatar) return cfmChatlogTargetAvatar;
    const currentAvatar = getCurrentCharAvatar();
    if (currentAvatar) {
      cfmChatlogTargetAvatar = currentAvatar;
      return currentAvatar;
    }
    return null;
  }
  function getChatlogFolderTree(avatar) {
    if (!avatar) return {};
    if (!extension_settings[extensionName].chatlogFolderTree) {
      extension_settings[extensionName].chatlogFolderTree = {};
    }
    if (!extension_settings[extensionName].chatlogFolderTree[avatar]) {
      extension_settings[extensionName].chatlogFolderTree[avatar] = {};
    }
    return extension_settings[extensionName].chatlogFolderTree[avatar];
  }
  function getChatlogGroups(avatar) {
    if (!avatar) return {};
    if (!extension_settings[extensionName].chatlogGroups) {
      extension_settings[extensionName].chatlogGroups = {};
    }
    if (!extension_settings[extensionName].chatlogGroups[avatar]) {
      extension_settings[extensionName].chatlogGroups[avatar] = {};
    }
    return extension_settings[extensionName].chatlogGroups[avatar];
  }
  function getCharNameByAvatar(avatar) {
    if (!avatar) return null;
    const ch = getCharacters().find((c) => c.avatar === avatar);
    return ch ? ch.name : null;
  }
  function formatFileSize(bytes) {
    return formatFileSizeCore(bytes);
  }

  async function renderChatlogsView() {
    return renderChatlogsViewCore({
      $,
      cfmToastr,
      clearAllExclusiveModes,
      clearMultiSelect,
      collectCurrentSelection,
      escapeHtml,
      executeChatlogNoteEdit,
      executeChatlogRename,
      formatFileSize,
      getCharChats,
      getCharNameByAvatar,
      getChatlogFolderTree,
      getChatlogGroups,
      getChatlogTargetAvatar,
      getContext,
      getCurrentCharAvatar,
      getVisibleResourceIds,
      openChatFile,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependChatlogNoteToolbar,
      prependChatlogRenameToolbar,
      prependExportToolbar,
      prependResDeleteToolbar,
      prompt: window.prompt.bind(window),
      renderChatlogsView,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
      selectAllVisible,
      splitChatlogFileName,
      state: {
        get selectedChatlogFolder() {
          return selectedChatlogFolder;
        },
        set selectedChatlogFolder(value) {
          selectedChatlogFolder = value;
        },
        get chatlogExpandedNodes() {
          return chatlogExpandedNodes;
        },
        get cfmChatNotes() {
          return cfmChatNotes;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get cfmChatlogNoteMode() {
          return cfmChatlogNoteMode;
        },
        get cfmChatlogNoteSelected() {
          return cfmChatlogNoteSelected;
        },
        get cfmChatlogRenameMode() {
          return cfmChatlogRenameMode;
        },
        get cfmChatlogRenameSelected() {
          return cfmChatlogRenameSelected;
        },
      },
      syncChatlogPopupModeClasses,
      toggleChatlogNoteItem,
      toggleChatlogRenameItem,
      toggleExportItem,
      toggleMultiSelectItem,
      toggleResDeleteItem,
    });
  }
  // ==================== 快速回复视图渲染（双栏 + 树形嵌套） ====================
  async function renderQRView() {
    return renderQRViewCore({
      $,
      applyQrMultiActivation,
      bindTouchSafeTap,
      cfmToastr,
      clearMultiSelect,
      countResItemsRecursive,
      escapeHtml,
      executeQrRename,
      executeQrSearch,
      getActiveQrSets,
      getMultiDragData,
      getQrNote,
      getQrSetItems,
      getQrSetNames,
      getResChildFolders,
      getResFavorites,
      getResFolderDisplayName,
      getResFolderIds,
      getResFolderPath,
      getResFolderTree,
      getResTopLevelFolders,
      getResourceGroups,
      getVisibleResourceIds,
      handleFolderTargetMove,
      isResFavorite,
      openQrItemEditor,
      openQrSetEditor,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependExportToolbar,
      prependQrNoteToolbar,
      prependQrRenameToolbar,
      prependResDeleteToolbar,
      prompt: window.prompt.bind(window),
      promptRenameFolder,
      renderQRView,
      reorderResFolder,
      selectAllVisible,
      setItemGroup,
      setQrNote,
      sortResFolders,
      sortResItems,
      state: {
        get selectedQrFolder() {
          return selectedQrFolder;
        },
        set selectedQrFolder(value) {
          selectedQrFolder = value;
        },
        get qrExpandedNodes() {
          return qrExpandedNodes;
        },
        get qrRightSortMode() {
          return qrRightSortMode;
        },
        get qrItemExpandedSets() {
          return qrItemExpandedSets;
        },
        get cfmQrLastFocusedSetName() {
          return cfmQrLastFocusedSetName;
        },
        set cfmQrLastFocusedSetName(value) {
          cfmQrLastFocusedSetName = value;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmQrNoteMode() {
          return cfmQrNoteMode;
        },
        get cfmQrNoteSelected() {
          return cfmQrNoteSelected;
        },
        get cfmQrRenameMode() {
          return cfmQrRenameMode;
        },
        get cfmQrRenameSelected() {
          return cfmQrRenameSelected;
        },
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
      },
      syncQrPresetTrackingForManualToggle,
      toggleExportItem,
      toggleMultiSelectItem,
      toggleQrNoteItem,
      toggleQrRenameItem,
      toggleQrSetActivation,
      toggleResDeleteItem,
      toggleResFavorite,
      touchDragMgr,
      wouldCreateResCycle,
    });
  }

  /**
   * 打开酒馆快速回复集编辑器
   */
  function openQrSetEditor(setName) {
    return getQuickReplyPresetsApi().openQrSetEditor(setName);
  }

  // ==================== 快速回复分组预设管理 ====================
  function getQrActivePresets() {
    return getQuickReplyPresetsApi().getQrActivePresets();
  }

  function saveQrActivePreset(name, sets, scope, bindChars, bindPresets) {
    return getQuickReplyPresetsApi().saveQrActivePreset(
      name,
      sets,
      scope,
      bindChars,
      bindPresets,
    );
  }

  function deleteQrActivePreset(name) {
    return getQuickReplyPresetsApi().deleteQrActivePreset(name);
  }

  function renameQrActivePreset(oldName, newName) {
    return getQuickReplyPresetsApi().renameQrActivePreset(oldName, newName);
  }

  // ==================== 快速回复分组绑定与自动应用 ====================
  function setQrPresetScope(presetIdx, scope) {
    return getQuickReplyPresetsApi().setQrPresetScope(presetIdx, scope);
  }

  async function unapplyWiPresetIndex(presetIdx) {
    return unapplyWiPresetIndexCore(presetIdx, {
      extensionSettings: extension_settings,
      extensionName,
      getWiActivePresets,
      getCharBoundWorldBooks,
      toggleWorldInfoActivation,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  async function unapplyQrPresetIndex(presetIdx) {
    return getQuickReplyPresetsApi().unapplyQrPresetIndex(presetIdx);
  }

  function syncWiPresetTrackingForManualToggle(bookName, isActive) {
    return syncWiPresetTrackingForManualToggleCore(bookName, isActive, {
      $,
      extensionSettings: extension_settings,
      extensionName,
      getWiActivePresets,
      getActiveWorldNamesFromLegacyWorldNames: () =>
        typeof world_names !== "undefined" && world_names
          ? Object.entries(world_names)
              .filter(([, v]) => v)
              .map(([k]) => k)
          : [],
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  /**
   * 整体刷新世界书分组追踪状态和UI按钮（不依赖具体 bookName）。
   * 当酒馆原生界面修改世界书激活状态时，用此函数同步分组面板。
   */
  function refreshAllWiPresetTrackingState() {
    return refreshAllWiPresetTrackingStateCore({
      $,
      extensionSettings: extension_settings,
      extensionName,
      getWiActivePresets,
      getActiveWorldInfoSet,
      saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
    });
  }

  function syncQrPresetTrackingForManualToggle(setName, isActive) {
    return getQuickReplyPresetsApi().syncQrPresetTrackingForManualToggle(
      setName,
      isActive,
    );
  }

  function bindQrPresetToChar(presetIdx, charAvatar) {
    return getQuickReplyPresetsApi().bindQrPresetToChar(presetIdx, charAvatar);
  }

  function bindQrPresetToChat(presetIdx, charAvatar, chatFileName) {
    return getQuickReplyPresetsApi().bindQrPresetToChat(
      presetIdx,
      charAvatar,
      chatFileName,
    );
  }
  function bindQrPresetToPreset(presetIdx, presetName) {
    return getQuickReplyPresetsApi().bindQrPresetToPreset(
      presetIdx,
      presetName,
    );
  }

  function unbindQrPresetFromChar(presetIdx, charAvatar) {
    return getQuickReplyPresetsApi().unbindQrPresetFromChar(
      presetIdx,
      charAvatar,
    );
  }

  function unbindQrPresetFromChat(presetIdx, bindKey) {
    return getQuickReplyPresetsApi().unbindQrPresetFromChat(presetIdx, bindKey);
  }
  function unbindQrPresetFromPreset(presetIdx, presetName) {
    return getQuickReplyPresetsApi().unbindQrPresetFromPreset(
      presetIdx,
      presetName,
    );
  }

  function getQrAutoApplyPresetIndices() {
    return getQuickReplyPresetsApi().getQrAutoApplyPresetIndices();
  }

  async function autoApplyQrPresets(silent = false) {
    return getQuickReplyPresetsApi().autoApplyQrPresets(silent);
  }

  function getQrPresetBindSummary(preset) {
    return getQuickReplyPresetsApi().getQrPresetBindSummary(preset);
  }

  // ==================== 快速回复激活分组面板 ====================
  async function showQrPresetPanel() {
    return getQuickReplyPresetsApi().showQrPresetPanel();
  }

  /**
   * 显示编辑快速回复激活分组的弹窗
   */
  async function showQrPresetEditPopup(preset) {
    return getQuickReplyPresetsApi().showQrPresetEditPopup(preset);
  }

  // ==================== User视图渲染（双栏 + 树形嵌套） ====================
  let _personaViewApi = null;

  function getPersonaViewApi() {
    if (!_personaViewApi) {
      _personaViewApi = createPersonaViewApiCore({
        $,
        File: window.File,
        FormData: window.FormData,
        PERSONA_LIST_CACHE_TTL,
        bindTouchSafeTap,
        cfmToastr,
        console,
        countResItemsRecursive,
        ensureSettings,
        escapeHtml,
        extensionName,
        extensionSettings: extension_settings,
        fetch: (...args) => window.fetch(...args),
        flashDraggedElement,
        fuzzyMatch,
        getContext,
        getFolderSelfPathNames,
        getPersonaBindStates,
        getPersonaNote,
        getResChildFolders,
        getResFavorites,
        getResFolderDisplayName,
        getResFolderIds,
        getResFolderPath,
        getResFolderPathNames,
        getResFolderTree,
        getResourceGroups,
        getThumbnailUrl,
        isResFavorite,
        pcDragEnd,
        pcDragStart,
        renderPersonaDetailSubList,
        renderPersonasView,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        toggleResFavorite,
        state: {
          get _personaListCache() {
            return _personaListCache;
          },
          set _personaListCache(value) {
            _personaListCache = value;
          },
          get _personaListCacheTime() {
            return _personaListCacheTime;
          },
          set _personaListCacheTime(value) {
            _personaListCacheTime = value;
          },
          get selectedPersonaFolder() {
            return selectedPersonaFolder;
          },
          set selectedPersonaFolder(value) {
            selectedPersonaFolder = value;
          },
          get personaExpandedNodes() {
            return personaExpandedNodes;
          },
          get personaItemExpandedIds() {
            return personaItemExpandedIds;
          },
        },
      });
    }
    return _personaViewApi;
  }

  function getPersonaCustomOrderStore() {
    return getPersonaViewApi().getPersonaCustomOrderStore();
  }

  function syncPersonaCustomOrder(avatarIds = []) {
    return getPersonaViewApi().syncPersonaCustomOrder(avatarIds);
  }

  function insertPersonaAfterInCustomOrder(sourceAvatarId, newAvatarId) {
    return getPersonaViewApi().insertPersonaAfterInCustomOrder(
      sourceAvatarId,
      newAvatarId,
    );
  }

  function removePersonaFromCustomOrder(avatarId) {
    return getPersonaViewApi().removePersonaFromCustomOrder(avatarId);
  }

  function buildDuplicatedPersonaName(baseName) {
    return getPersonaViewApi().buildDuplicatedPersonaName(baseName);
  }

  async function getPersonaDuplicateAvatarPayload(avatarId) {
    return getPersonaViewApi().getPersonaDuplicateAvatarPayload(avatarId);
  }

  async function duplicatePersona(sourcePersona) {
    return getPersonaViewApi().duplicatePersona(sourcePersona);
  }

  async function getCurrentPersonas(forceRefresh = false) {
    return getPersonaViewApi().getCurrentPersonas(forceRefresh);
  }

  function resolvePersonaConnections(connections) {
    return getPersonaViewApi().resolvePersonaConnections(connections);
  }

  function buildPersonaConnHtml(connections) {
    return getPersonaViewApi().buildPersonaConnHtml(connections);
  }

  function selectPersona(avatarId) {
    return getPersonaViewApi().selectPersona(avatarId);
  }

  function refreshPersonaPanelView() {
    return getPersonaViewApi().refreshPersonaPanelView();
  }

  function getPointerClientPoint(evt) {
    const originalEvent = evt?.originalEvent || evt;
    const touch =
      originalEvent?.changedTouches?.[0] || originalEvent?.touches?.[0] || null;
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
    if (
      typeof originalEvent?.clientX === "number" &&
      typeof originalEvent?.clientY === "number"
    ) {
      return { x: originalEvent.clientX, y: originalEvent.clientY };
    }
    return null;
  }

  function getTextOffsetFromPoint(container, evt) {
    if (!container || !container.ownerDocument) return null;
    const point = getPointerClientPoint(evt);
    if (!point) return null;

    const doc = container.ownerDocument;
    let caretRange = null;

    if (typeof doc.caretPositionFromPoint === "function") {
      const pos = doc.caretPositionFromPoint(point.x, point.y);
      if (pos?.offsetNode) {
        caretRange = doc.createRange();
        caretRange.setStart(pos.offsetNode, pos.offset);
        caretRange.setEnd(pos.offsetNode, pos.offset);
      }
    } else if (typeof doc.caretRangeFromPoint === "function") {
      caretRange = doc.caretRangeFromPoint(point.x, point.y);
    }

    if (!caretRange) return null;

    const prefixRange = doc.createRange();
    prefixRange.selectNodeContents(container);
    try {
      prefixRange.setEnd(caretRange.startContainer, caretRange.startOffset);
    } catch (_) {
      return null;
    }
    return prefixRange.toString().length;
  }

  function getTextareaCaretMetrics(textarea, caretIndex) {
    if (!textarea || typeof caretIndex !== "number") return null;
    const doc = textarea.ownerDocument;
    if (!doc?.body) return null;

    const value = String(textarea.value || "");
    const safeCaret = Math.max(
      0,
      Math.min(Math.trunc(caretIndex), value.length),
    );
    const style = (doc.defaultView || window).getComputedStyle(textarea);
    const mirror = doc.createElement("div");
    const marker = doc.createElement("span");
    const props = [
      "box-sizing",
      "width",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "letter-spacing",
      "text-transform",
      "word-spacing",
      "text-indent",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "line-height",
      "text-align",
      "tab-size",
    ];

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.overflowWrap = "break-word";
    mirror.style.overflow = "hidden";
    props.forEach((prop) => {
      mirror.style.setProperty(prop, style.getPropertyValue(prop));
    });

    mirror.textContent = value.slice(0, safeCaret);
    marker.textContent = value.slice(safeCaret, safeCaret + 1) || "\u200b";
    mirror.appendChild(marker);
    doc.body.appendChild(mirror);

    const metrics = {
      top: marker.offsetTop,
      left: marker.offsetLeft,
      lineHeight:
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4 || 20,
    };
    mirror.remove();
    return metrics;
  }

  function revealTextareaCaret(textarea, caretIndex) {
    const metrics = getTextareaCaretMetrics(textarea, caretIndex);
    if (!metrics) return null;

    textarea.scrollTop = Math.max(
      0,
      metrics.top - textarea.clientHeight / 2 + metrics.lineHeight / 2,
    );
    textarea.scrollLeft = Math.max(0, metrics.left - textarea.clientWidth / 3);
    return metrics;
  }

  function flashTextareaCaretSelection(textarea, caretIndex) {
    if (!textarea || typeof textarea.setSelectionRange !== "function") return;
    const value = String(textarea.value || "");
    const safeCaret = Math.max(
      0,
      Math.min(Math.trunc(caretIndex), value.length),
    );

    if (!value.length) {
      textarea.setSelectionRange(0, 0);
      return;
    }

    const lineStart = Math.max(
      value.lastIndexOf("\n", Math.max(0, safeCaret - 1)) + 1,
      0,
    );
    const nextLineBreak = value.indexOf("\n", safeCaret);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const highlightStart = Math.min(lineStart, value.length);
    const highlightEnd = Math.max(
      highlightStart,
      Math.min(
        value.length,
        lineEnd > highlightStart ? lineEnd : highlightStart + 1,
      ),
    );

    textarea.focus();
    textarea.setSelectionRange(highlightStart, highlightEnd);

    setTimeout(() => {
      if (!textarea.isConnected) return;
      textarea.focus();
      textarea.setSelectionRange(safeCaret, safeCaret);
    }, 1000);
  }

  let _personaDetailApi = null;

  function getPersonaDetailApi() {
    if (!_personaDetailApi) {
      _personaDetailApi = createPersonaDetailApiCore({
        $,
        FormData: window.FormData,
        window,
        document,
        cfmConfirm,
        cfmToastr,
        console,
        escapeHtml,
        fetch: (...args) => window.fetch(...args),
        getContext,
        saveSettingsDebounced: () => getContext().saveSettingsDebounced(),
        refreshPersonaPanelView,
        syncNativePersonaUI,
        ensurePersonaDescriptionEntry,
        getPersonaNote,
        getPersonaBindStates,
        buildPersonaConnHtml,
        buildPersonaChatBindHtml,
        hasNativePersonaToolEntry,
        triggerNativePersonaTool,
        triggerNativePersonaBind,
        pickDetailAvatarFile,
        prepareDetailAvatarUpload,
        bustDetailThumbnailCache,
        getTextOffsetFromPoint,
        flashTextareaCaretSelection,
        revealTextareaCaret,
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
      });
    }
    return _personaDetailApi;
  }

  async function showPersonaDetailFieldPopup(persona, field, options = {}) {
    return getPersonaDetailApi().showPersonaDetailFieldPopup(
      persona,
      field,
      options,
    );
  }

  async function editPersonaDetailField(persona, field, options = {}) {
    return getPersonaDetailApi().editPersonaDetailField(
      persona,
      field,
      options,
    );
  }

  /**
   * 在 CFM 编辑 persona 后同步酒馆原生 UI，
   * 使名称/描述等更改立即可见，无需刷新页面。
   */
  let _cfmSuppressAutoClose = false;
  function syncNativePersonaUI(avatarId) {
    if (!avatarId) return;
    // 延迟执行，确保 saveSettingsDebounced 已完成写入
    setTimeout(() => {
      // 刷新原生头像列表（如果可用）
      if (typeof getUserAvatarsFunc === "function") {
        try {
          getUserAvatarsFunc(true);
        } catch (e) {
          console.warn("[CFM] 刷新原生头像列表失败", e);
        }
      }
      // 临时抑制移动端自动关闭，再重新选择 persona
      _cfmSuppressAutoClose = true;
      selectPersona(avatarId);
      setTimeout(() => {
        _cfmSuppressAutoClose = false;
      }, 500);
    }, 300);
  }

  function pickDetailAvatarFile() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      const cleanup = () => input.remove();
      input.addEventListener(
        "change",
        () => {
          const file = input.files?.[0] || null;
          cleanup();
          resolve(file);
        },
        { once: true },
      );
      input.addEventListener(
        "cancel",
        () => {
          cleanup();
          resolve(null);
        },
        { once: true },
      );
      document.body.appendChild(input);
      input.click();
    });
  }

  async function prepareDetailAvatarUpload(file) {
    if (!(file instanceof File)) return null;

    let uploadFile = file;
    if (typeof ensureImageFormatSupported === "function") {
      uploadFile = await ensureImageFormatSupported(file);
    }

    const ctx = getContext();
    const shouldCrop = !ctx?.powerUserSettings?.never_resize_avatars;
    let cropData;

    if (
      shouldCrop &&
      typeof Popup === "function" &&
      POPUP_TYPE?.CROP !== undefined &&
      typeof getBase64Async === "function"
    ) {
      const dataUrl = await getBase64Async(uploadFile);
      const dlg = new Popup(
        "Set the crop position of the avatar image",
        POPUP_TYPE.CROP,
        "",
        { cropImage: dataUrl },
      );
      const croppedImage = await dlg.show();
      if (!croppedImage) {
        return null;
      }
      cropData = dlg.cropData;
    }

    return { file: uploadFile, cropData };
  }

  async function bustDetailThumbnailCache(type, file) {
    if (!type || !file) return;
    try {
      await fetch(getThumbnailUrl(type, file), {
        method: "GET",
        cache: "no-cache",
        headers: {
          pragma: "no-cache",
          "cache-control": "no-cache",
        },
      });
    } catch (e) {
      console.warn(`[CFM] 刷新 ${type} 缩略图缓存失败:`, e);
    }
  }

  let _characterDetailApi = null;

  function getCharacterDetailApi() {
    if (!_characterDetailApi) {
      _characterDetailApi = createCharacterDetailApiCore({
        $,
        window,
        document,
        FormData: window.FormData,
        cfmConfirm,
        cfmToastr,
        console,
        escapeHtml,
        fetch: (...args) => window.fetch(...args),
        getContext,
        getWiModuleSync,
        pickDetailAvatarFile,
        prepareDetailAvatarUpload,
        bustDetailThumbnailCache,
        getTextOffsetFromPoint,
        flashTextareaCaretSelection,
        revealTextareaCaret,
        rerenderCurrentView,
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
      });
    }
    return _characterDetailApi;
  }

  async function replaceCharacterDetailAvatar(charRow, char) {
    return getCharacterDetailApi().replaceCharacterDetailAvatar(charRow, char);
  }

  function getCharacterDetailFieldValue(char, field) {
    return getCharacterDetailApi().getCharacterDetailFieldValue(char, field);
  }

  async function showCharacterDetailFieldPopup(char, field, options = {}) {
    return getCharacterDetailApi().showCharacterDetailFieldPopup(
      char,
      field,
      options,
    );
  }

  async function editCharacterDetailField(charRow, char, field, options = {}) {
    return getCharacterDetailApi().editCharacterDetailField(
      charRow,
      char,
      field,
      options,
    );
  }

  function renderCharacterDetailSubList(charRow, char) {
    return getCharacterDetailApi().renderCharacterDetailSubList(charRow, char);
  }

  async function replacePersonaDetailAvatar(persona) {
    return getPersonaDetailApi().replacePersonaDetailAvatar(persona);
  }

  function renderPersonaDetailSubList(personaRow, persona) {
    return getPersonaDetailApi().renderPersonaDetailSubList(
      personaRow,
      persona,
    );
  }

  async function renderPersonasView() {
    return renderPersonasViewCore({
      $,
      bindTouchSafeTap,
      buildPersonaConnHtml,
      cfmDebugDragLog,
      cfmToastr,
      clearMultiSelect,
      countResItemsRecursive,
      duplicatePersona,
      escapeHtml,
      executePersonaNoteEdit,
      executePersonaSearch,
      extensionName,
      extension_settings,
      getCurrentPersonas,
      getMultiDragData,
      getPersonaBindStates,
      getPersonaNote,
      getResChildFolders,
      getResFavorites,
      getResFolderDisplayName,
      getResFolderIds,
      getResFolderPath,
      getResFolderTree,
      getResTopLevelFolders,
      getResourceGroups,
      getThumbnailUrl,
      getVisibleResourceIds,
      handleFolderTargetMove,
      isResFavorite,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependExportToolbar,
      prependPersonaNoteToolbar,
      prependResDeleteToolbar,
      promptRenameFolder,
      renderPersonaDetailSubList,
      renderPersonasView,
      reorderResFolder,
      selectAllVisible,
      selectPersona,
      setItemGroup,
      sortResFolders,
      sortResItems,
      state: {
        get _personasPreloadPromise() {
          return _personasPreloadPromise;
        },
        set _personasPreloadPromise(value) {
          _personasPreloadPromise = value;
        },
        get selectedPersonaFolder() {
          return selectedPersonaFolder;
        },
        set selectedPersonaFolder(value) {
          selectedPersonaFolder = value;
        },
        get personaExpandedNodes() {
          return personaExpandedNodes;
        },
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
        get personaRightSortMode() {
          return personaRightSortMode;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmPersonaNoteMode() {
          return cfmPersonaNoteMode;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmPersonaNoteSelected() {
          return cfmPersonaNoteSelected;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get personaItemExpandedIds() {
          return personaItemExpandedIds;
        },
      },
      toggleExportItem,
      toggleMultiSelectItem,
      togglePersonaNoteItem,
      toggleResDeleteItem,
      toggleResFavorite,
      touchDragMgr,
      wouldCreateResCycle,
    });
  }

  // User搜索
  function executePersonaSearch() {
    return getPersonaViewApi().executePersonaSearch();
  }

  // ==================== 正则脚本导入/导出 ====================
  let _regexGroupsApi = null;
  function getRegexGroupsApi() {
    if (!_regexGroupsApi) {
      _regexGroupsApi = createRegexGroupsApiCore({
        cfmToastr,
        console,
        ensureResourceSettings,
        extensionName,
        extension_settings,
        getCharacters,
        getContext,
        getPresetRegexScriptsByName,
        getResFavorites,
        renderRegexView,
        saveCharRegexScripts,
        savePresetRegexScripts,
        showBatchProgressOverlay,
        syncNativeRegexState,
      });
    }
    return _regexGroupsApi;
  }
  async function importRegexScripts(files, targetFolder) {
    return getRegexGroupsApi().importRegexScripts(files, targetFolder);
  }
  async function exportRegexScripts(scriptIds) {
    return getRegexGroupsApi().exportRegexScripts(scriptIds);
  }

  // ==================== 正则视图渲染（统一左右分栏布局） ====================
  // 正则标签页状态
  let selectedRegexNode = null; // 当前选中的树节点（null=未选中，显示空提示）
  let regexExpandedNodes = new Set(); // 展开的树节点ID集合（默认全部收起）
  let regexAllNodeIds = []; // 所有可展开节点ID（用于展开/收起全部）

  // ==================== 共享可变状态（供拆分模块通过 deps.state 访问） ====================
  // 使用 getter/setter 惰性绑定到模块级 let 变量，避免 TDZ 问题
  const state = {
    // 当前资源类型
    get currentResourceType() {
      return currentResourceType;
    },
    set currentResourceType(v) {
      currentResourceType = v;
    },
    // 配置对象
    get config() {
      return config;
    },
    set config(v) {
      config = v;
    },
    // 左侧树选中节点
    get selectedTreeNode() {
      return selectedTreeNode;
    },
    set selectedTreeNode(v) {
      selectedTreeNode = v;
    },
    get selectedPresetFolder() {
      return selectedPresetFolder;
    },
    set selectedPresetFolder(v) {
      selectedPresetFolder = v;
    },
    get selectedWorldInfoFolder() {
      return selectedWorldInfoFolder;
    },
    set selectedWorldInfoFolder(v) {
      selectedWorldInfoFolder = v;
    },
    get selectedThemeFolder() {
      return selectedThemeFolder;
    },
    set selectedThemeFolder(v) {
      selectedThemeFolder = v;
    },
    get selectedBgFolder() {
      return selectedBgFolder;
    },
    set selectedBgFolder(v) {
      selectedBgFolder = v;
    },
    get selectedPersonaFolder() {
      return selectedPersonaFolder;
    },
    set selectedPersonaFolder(v) {
      selectedPersonaFolder = v;
    },
    get selectedRegexNode() {
      return selectedRegexNode;
    },
    set selectedRegexNode(v) {
      selectedRegexNode = v;
    },
    get selectedQrFolder() {
      return selectedQrFolder;
    },
    set selectedQrFolder(v) {
      selectedQrFolder = v;
    },
    get selectedChatlogFolder() {
      return selectedChatlogFolder;
    },
    set selectedChatlogFolder(v) {
      selectedChatlogFolder = v;
    },
    get cfmChatlogTargetAvatar() {
      return cfmChatlogTargetAvatar;
    },
    set cfmChatlogTargetAvatar(v) {
      cfmChatlogTargetAvatar = v;
    },
    // 多选模式
    get cfmMultiSelectMode() {
      return cfmMultiSelectMode;
    },
    set cfmMultiSelectMode(v) {
      cfmMultiSelectMode = v;
    },
    get cfmMultiSelectRangeMode() {
      return cfmMultiSelectRangeMode;
    },
    set cfmMultiSelectRangeMode(v) {
      cfmMultiSelectRangeMode = v;
    },
    // 导出模式
    get cfmExportMode() {
      return cfmExportMode;
    },
    set cfmExportMode(v) {
      cfmExportMode = v;
    },
    get cfmExportRangeMode() {
      return cfmExportRangeMode;
    },
    set cfmExportRangeMode(v) {
      cfmExportRangeMode = v;
    },
    get cfmExportLastClicked() {
      return cfmExportLastClicked;
    },
    set cfmExportLastClicked(v) {
      cfmExportLastClicked = v;
    },
    // 删除模式
    get cfmResDeleteMode() {
      return cfmResDeleteMode;
    },
    set cfmResDeleteMode(v) {
      cfmResDeleteMode = v;
    },
    get cfmResDeleteRangeMode() {
      return cfmResDeleteRangeMode;
    },
    set cfmResDeleteRangeMode(v) {
      cfmResDeleteRangeMode = v;
    },
    get cfmResDeleteLastClicked() {
      return cfmResDeleteLastClicked;
    },
    set cfmResDeleteLastClicked(v) {
      cfmResDeleteLastClicked = v;
    },
    // 编辑模式
    get cfmEditMode() {
      return cfmEditMode;
    },
    set cfmEditMode(v) {
      cfmEditMode = v;
    },
    // 重命名模式
    get cfmPresetRenameMode() {
      return cfmPresetRenameMode;
    },
    set cfmPresetRenameMode(v) {
      cfmPresetRenameMode = v;
    },
    get cfmWorldInfoRenameMode() {
      return cfmWorldInfoRenameMode;
    },
    set cfmWorldInfoRenameMode(v) {
      cfmWorldInfoRenameMode = v;
    },
    get cfmQrRenameMode() {
      return cfmQrRenameMode;
    },
    set cfmQrRenameMode(v) {
      cfmQrRenameMode = v;
    },
    // 主题备注模式
    get cfmThemeNoteMode() {
      return cfmThemeNoteMode;
    },
    set cfmThemeNoteMode(v) {
      cfmThemeNoteMode = v;
    },
    get cfmThemeNoteRangeMode() {
      return cfmThemeNoteRangeMode;
    },
    set cfmThemeNoteRangeMode(v) {
      cfmThemeNoteRangeMode = v;
    },
    get cfmThemeNoteLastClicked() {
      return cfmThemeNoteLastClicked;
    },
    set cfmThemeNoteLastClicked(v) {
      cfmThemeNoteLastClicked = v;
    },
    // 背景备注模式
    get cfmBgNoteMode() {
      return cfmBgNoteMode;
    },
    set cfmBgNoteMode(v) {
      cfmBgNoteMode = v;
    },
    get cfmBgNoteRangeMode() {
      return cfmBgNoteRangeMode;
    },
    set cfmBgNoteRangeMode(v) {
      cfmBgNoteRangeMode = v;
    },
    get cfmBgNoteLastClicked() {
      return cfmBgNoteLastClicked;
    },
    set cfmBgNoteLastClicked(v) {
      cfmBgNoteLastClicked = v;
    },
    // 主题重命名模式
    get cfmThemeRenameMode() {
      return cfmThemeRenameMode;
    },
    set cfmThemeRenameMode(v) {
      cfmThemeRenameMode = v;
    },
    get cfmThemeRenameRangeMode() {
      return cfmThemeRenameRangeMode;
    },
    set cfmThemeRenameRangeMode(v) {
      cfmThemeRenameRangeMode = v;
    },
    get cfmThemeRenameLastClicked() {
      return cfmThemeRenameLastClicked;
    },
    set cfmThemeRenameLastClicked(v) {
      cfmThemeRenameLastClicked = v;
    },
    // 背景重命名模式
    get cfmBgRenameMode() {
      return cfmBgRenameMode;
    },
    set cfmBgRenameMode(v) {
      cfmBgRenameMode = v;
    },
    get cfmBgRenameRangeMode() {
      return cfmBgRenameRangeMode;
    },
    set cfmBgRenameRangeMode(v) {
      cfmBgRenameRangeMode = v;
    },
    get cfmBgRenameLastClicked() {
      return cfmBgRenameLastClicked;
    },
    set cfmBgRenameLastClicked(v) {
      cfmBgRenameLastClicked = v;
    },
    // 世界书备注模式
    get cfmWorldInfoNoteMode() {
      return cfmWorldInfoNoteMode;
    },
    set cfmWorldInfoNoteMode(v) {
      cfmWorldInfoNoteMode = v;
    },
    get cfmWorldInfoNoteRangeMode() {
      return cfmWorldInfoNoteRangeMode;
    },
    set cfmWorldInfoNoteRangeMode(v) {
      cfmWorldInfoNoteRangeMode = v;
    },
    get cfmWorldInfoNoteLastClicked() {
      return cfmWorldInfoNoteLastClicked;
    },
    set cfmWorldInfoNoteLastClicked(v) {
      cfmWorldInfoNoteLastClicked = v;
    },
    // 快速回复备注模式
    get cfmQrNoteMode() {
      return cfmQrNoteMode;
    },
    set cfmQrNoteMode(v) {
      cfmQrNoteMode = v;
    },
    get cfmQrNoteRangeMode() {
      return cfmQrNoteRangeMode;
    },
    set cfmQrNoteRangeMode(v) {
      cfmQrNoteRangeMode = v;
    },
    get cfmQrNoteLastClicked() {
      return cfmQrNoteLastClicked;
    },
    set cfmQrNoteLastClicked(v) {
      cfmQrNoteLastClicked = v;
    },
    // 预设备注模式
    get cfmPresetNoteMode() {
      return cfmPresetNoteMode;
    },
    set cfmPresetNoteMode(v) {
      cfmPresetNoteMode = v;
    },
    get cfmPresetNoteRangeMode() {
      return cfmPresetNoteRangeMode;
    },
    set cfmPresetNoteRangeMode(v) {
      cfmPresetNoteRangeMode = v;
    },
    get cfmPresetNoteLastClicked() {
      return cfmPresetNoteLastClicked;
    },
    set cfmPresetNoteLastClicked(v) {
      cfmPresetNoteLastClicked = v;
    },
    // User备注模式
    get cfmPersonaNoteMode() {
      return cfmPersonaNoteMode;
    },
    set cfmPersonaNoteMode(v) {
      cfmPersonaNoteMode = v;
    },
    get cfmPersonaNoteRangeMode() {
      return cfmPersonaNoteRangeMode;
    },
    set cfmPersonaNoteRangeMode(v) {
      cfmPersonaNoteRangeMode = v;
    },
    get cfmPersonaNoteLastClicked() {
      return cfmPersonaNoteLastClicked;
    },
    set cfmPersonaNoteLastClicked(v) {
      cfmPersonaNoteLastClicked = v;
    },
    // 聊天记录备注模式
    get cfmChatlogNoteMode() {
      return cfmChatlogNoteMode;
    },
    set cfmChatlogNoteMode(v) {
      cfmChatlogNoteMode = v;
    },
    get cfmChatlogNoteRangeMode() {
      return cfmChatlogNoteRangeMode;
    },
    set cfmChatlogNoteRangeMode(v) {
      cfmChatlogNoteRangeMode = v;
    },
    get cfmChatlogNoteLastClicked() {
      return cfmChatlogNoteLastClicked;
    },
    set cfmChatlogNoteLastClicked(v) {
      cfmChatlogNoteLastClicked = v;
    },
    // 聊天记录重命名模式
    get cfmChatlogRenameMode() {
      return cfmChatlogRenameMode;
    },
    set cfmChatlogRenameMode(v) {
      cfmChatlogRenameMode = v;
    },
    get cfmChatlogRenameRangeMode() {
      return cfmChatlogRenameRangeMode;
    },
    set cfmChatlogRenameRangeMode(v) {
      cfmChatlogRenameRangeMode = v;
    },
    get cfmChatlogRenameLastClicked() {
      return cfmChatlogRenameLastClicked;
    },
    set cfmChatlogRenameLastClicked(v) {
      cfmChatlogRenameLastClicked = v;
    },
  };
  // --- 正则数据扫描 ---
  function getRegexGlobalScripts() {
    return getRegexGroupsApi().getRegexGlobalScripts();
  }
  function getRegexTransferGlobalFolderOptions() {
    return getRegexGroupsApi().getRegexTransferGlobalFolderOptions();
  }
  function getRegexTransferGlobalFolderLabel(folderId) {
    return getRegexGroupsApi().getRegexTransferGlobalFolderLabel(folderId);
  }
  function getRegexTransferScopeLabel(scope) {
    return getRegexGroupsApi().getRegexTransferScopeLabel(scope);
  }
  function getRegexScriptsForScope(scope) {
    return getRegexGroupsApi().getRegexScriptsForScope(scope);
  }
  function isSameRegexScopeList(sourceScope, targetScope) {
    return getRegexGroupsApi().isSameRegexScopeList(sourceScope, targetScope);
  }
  function cloneRegexScriptsForTransfer(scripts, isCopyMode) {
    return getRegexGroupsApi().cloneRegexScriptsForTransfer(
      scripts,
      isCopyMode,
    );
  }
  function removeRegexScriptsByIds(scripts, idSet) {
    return getRegexGroupsApi().removeRegexScriptsByIds(scripts, idSet);
  }
  function insertRegexScriptsAtIndex(
    baseScripts,
    insertedScripts,
    targetIndex,
  ) {
    return getRegexGroupsApi().insertRegexScriptsAtIndex(
      baseScripts,
      insertedScripts,
      targetIndex,
    );
  }
  async function saveRegexScopeScripts(scope, scripts, extra = {}) {
    return getRegexGroupsApi().saveRegexScopeScripts(scope, scripts, extra);
  }

  function showRegexTransferSetupDialog(options = {}) {
    const {
      sourceScope,
      selectedCount = 0,
      currentCharName = "",
      currentCharAvatar = "",
      currentPresetName = "",
      defaultGlobalFolderId = "__ungrouped__",
    } = options || {};

    return new Promise((resolve) => {
      const sourceType = sourceScope?.type || "";
      const hasCurrentChar = !!currentCharAvatar;
      const presetItems = getCurrentPresets()
        .map((preset) => String(preset?.name || "").trim())
        .filter(Boolean);
      const availablePresetTargets = presetItems.filter(
        (name) => !(sourceType === "preset" && name === sourceScope?.name),
      );
      const presetGroups = getResourceGroups("presets");
      const presetTree = getResFolderTree("presets");
      const canUseGlobal = sourceType !== "global";
      // 获取所有可选角色（排除来源角色）
      const allChars = getCharacters();
      const sourceCharAvatar =
        sourceType === "char" ? sourceScope?.avatar || "" : "";
      const availableCharTargets = allChars.filter(
        (c) => c.avatar && c.avatar !== sourceCharAvatar,
      );
      const canUseChar = availableCharTargets.length > 0;
      const canUsePreset = availablePresetTargets.length > 0;
      const enabledTargetTypes = [
        canUseGlobal ? "global" : "",
        canUseChar ? "char" : "",
        canUsePreset ? "preset" : "",
      ].filter(Boolean);

      let defaultTargetType = "";
      if (sourceType === "global") {
        if (canUseChar) defaultTargetType = "char";
        else if (canUsePreset) defaultTargetType = "preset";
      } else if (sourceType === "char") {
        if (canUseGlobal) defaultTargetType = "global";
        else if (canUsePreset) defaultTargetType = "preset";
      } else if (sourceType === "preset") {
        if (canUsePreset) defaultTargetType = "preset";
        else if (canUseGlobal) defaultTargetType = "global";
        else if (canUseChar) defaultTargetType = "char";
      }
      if (!enabledTargetTypes.includes(defaultTargetType)) {
        defaultTargetType = enabledTargetTypes[0] || "";
      }

      const folderOptions = getRegexTransferGlobalFolderOptions();
      const defaultTransferMode = getDefaultRegexTransferMode();
      const globalDisabledReason = canUseGlobal ? "" : "（来源位置，不可选）";
      const charDisabledReason = !canUseChar
        ? sourceType === "char"
          ? "（除来源外没有其它角色）"
          : availableCharTargets.length === 0
            ? "（暂无可用角色）"
            : ""
        : "";
      const presetDisabledReason = canUsePreset
        ? ""
        : presetItems.length === 0
          ? "（暂无可用预设）"
          : sourceType === "preset"
            ? "（除来源外没有其它预设）"
            : "（暂无可用预设）";
      let selectedPresetTargetName = "";
      let selectedCharTargetAvatar = "";
      let selectedCharTargetName = "";
      let presetTransferExpandedFolders = new Set();
      let charTransferExpandedFolders = new Set();
      const PRESET_TRANSFER_TAP_MOVE_THRESHOLD = 10;
      const overlay = $(
        '<div class="cfm-edit-popup-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.12);z-index:100000;display:flex;align-items:center;justify-content:center;"></div>',
      );
      const dialog = $(`
        <div class="cfm-edit-popup cfm-regex-transfer-dialog-popup" style="width:min(560px,calc(100vw - 32px));max-width:560px;max-height:calc(100vh - 32px);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);margin:0;z-index:100001;display:flex;flex-direction:column;overflow:hidden;">
          <div class="cfm-edit-popup-header">
            <span><i class="fa-solid fa-right-left"></i> 正则互通</span>
          </div>
          <div class="cfm-edit-popup-body" style="display:flex;flex-direction:column;gap:14px;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;">
            <div style="font-size:13px;line-height:1.6;opacity:0.92;">已选择 <b>${selectedCount}</b> 个正则脚本，来源：<b>${escapeHtml(getRegexTransferScopeLabel(sourceScope))}</b></div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="font-size:12px;opacity:0.85;">选择模式</div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="radio" name="cfm-regex-transfer-mode" value="move" ${defaultTransferMode === "move" ? "checked" : ""}> <span>移动</span></label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="radio" name="cfm-regex-transfer-mode" value="copy" ${defaultTransferMode === "copy" ? "checked" : ""}> <span>复制</span></label>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="font-size:12px;opacity:0.85;">选择目标</div>
              <label style="display:flex;align-items:center;gap:8px;cursor:${canUseGlobal ? "pointer" : "not-allowed"};opacity:${canUseGlobal ? "1" : "0.55"};"><input type="radio" name="cfm-regex-transfer-target" value="global" ${defaultTargetType === "global" ? "checked" : ""} ${canUseGlobal ? "" : "disabled"}> <span>全局正则${globalDisabledReason}</span></label>
              <label style="display:flex;align-items:center;gap:8px;cursor:${canUseChar ? "pointer" : "not-allowed"};opacity:${canUseChar ? "1" : "0.55"};"><input type="radio" name="cfm-regex-transfer-target" value="char" ${defaultTargetType === "char" ? "checked" : ""} ${canUseChar ? "" : "disabled"}> <span>角色正则${escapeHtml(charDisabledReason)}</span></label>
              <label style="display:flex;align-items:center;gap:8px;cursor:${canUsePreset ? "pointer" : "not-allowed"};opacity:${canUsePreset ? "1" : "0.55"};"><input type="radio" name="cfm-regex-transfer-target" value="preset" ${defaultTargetType === "preset" ? "checked" : ""} ${canUsePreset ? "" : "disabled"}> <span>其它预设正则${escapeHtml(presetDisabledReason)}</span></label>
            </div>
            ${enabledTargetTypes.length === 0 ? '<div style="font-size:12px;line-height:1.6;color:#f38ba8;opacity:0.92;">当前没有可用的互通目标，请先切换到角色或预设后再试。</div>' : ""}
            <div class="cfm-regex-transfer-global-folder" style="display:flex;flex-direction:column;gap:8px;">
              <div style="font-size:12px;opacity:0.85;">全局分组</div>
              <select class="text_pole cfm-regex-transfer-folder-select"></select>
            </div>
            <div class="cfm-regex-transfer-char-target" style="display:none;flex-direction:column;gap:8px;min-height:0;">
              <div style="font-size:12px;opacity:0.85;">选择目标角色</div>
              <div class="cfm-entry-transfer-search">
                <input type="text" class="cfm-entry-transfer-search-input cfm-regex-transfer-char-search-input" placeholder="搜索角色..." />
                <button class="cfm-entry-transfer-expand-all cfm-regex-transfer-char-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                <button class="cfm-entry-transfer-collapse-all cfm-regex-transfer-char-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
              </div>
              <div class="cfm-entry-transfer-tree-container cfm-regex-transfer-char-tree" style="max-height:min(42vh,360px);overflow-y:auto;overflow-x:hidden;"></div>
              <div class="cfm-entry-transfer-selected-hint cfm-regex-transfer-char-hint"></div>
            </div>
            <div class="cfm-regex-transfer-preset-target" style="display:none;flex-direction:column;gap:8px;min-height:0;">
              <div style="font-size:12px;opacity:0.85;">选择目标预设</div>
              <div class="cfm-entry-transfer-search">
                <input type="text" class="cfm-entry-transfer-search-input cfm-regex-transfer-preset-search-input" placeholder="搜索预设..." />
                <button class="cfm-entry-transfer-expand-all cfm-regex-transfer-preset-expand-all" title="展开全部"><i class="fa-solid fa-angles-down"></i></button>
                <button class="cfm-entry-transfer-collapse-all cfm-regex-transfer-preset-collapse-all" title="收起全部"><i class="fa-solid fa-angles-up"></i></button>
              </div>
              <div class="cfm-entry-transfer-tree-container cfm-regex-transfer-preset-tree" style="max-height:min(42vh,360px);overflow-y:auto;overflow-x:hidden;"></div>
              <div class="cfm-entry-transfer-selected-hint cfm-regex-transfer-preset-hint"></div>
            </div>
          </div>
          <div class="cfm-edit-popup-footer">
            <button class="menu_button cfm-regex-transfer-confirm"><i class="fa-solid fa-check"></i> 确认</button>
            <button class="menu_button cfm-regex-transfer-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
          </div>
        </div>
      `);

      const folderSelect = dialog.find(".cfm-regex-transfer-folder-select");
      const presetSearchInput = dialog.find(
        ".cfm-regex-transfer-preset-search-input",
      );
      const presetTreeContainer = dialog.find(
        ".cfm-regex-transfer-preset-tree",
      );
      const presetHintEl = dialog.find(".cfm-regex-transfer-preset-hint");
      folderOptions.forEach((item) => {
        folderSelect.append(
          $(
            `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`,
          ),
        );
      });
      folderSelect.val(defaultGlobalFolderId || "__ungrouped__");

      // === 角色选择树 ===
      const charSearchInput = dialog.find(
        ".cfm-regex-transfer-char-search-input",
      );
      const charTreeContainer = dialog.find(".cfm-regex-transfer-char-tree");
      const charHintEl = dialog.find(".cfm-regex-transfer-char-hint");

      function updateCharTargetHint() {
        if (selectedCharTargetAvatar) {
          charHintEl.html(
            `已选目标角色：<strong>${escapeHtml(selectedCharTargetName || selectedCharTargetAvatar)}</strong>`,
          );
          return;
        }
        charHintEl.text("请选择一个目标角色");
      }

      function renderCharTargetTree() {
        const query = String(charSearchInput.val() || "")
          .trim()
          .toLowerCase();
        charTreeContainer.empty();

        const filtered = availableCharTargets.filter((c) => {
          if (!query) return true;
          const name = String(c.name || "").toLowerCase();
          const avatar = String(c.avatar || "").toLowerCase();
          return name.includes(query) || avatar.includes(query);
        });

        if (filtered.length === 0) {
          charTreeContainer.html(
            '<div style="padding:16px;opacity:0.5;text-align:center;">无可选角色</div>',
          );
          return;
        }

        // 按文件夹组织角色
        const tagMap = getTagMap();
        const folderTagIdSet = new Set(getFolderTagIds());
        const folderChars = {};
        const ungroupedChars = [];

        for (const ch of filtered) {
          const charTags = tagMap[ch.avatar] || [];
          const charFolderTags = charTags.filter((t) => folderTagIdSet.has(t));
          if (charFolderTags.length > 0) {
            // 找最深的文件夹
            let deepest = charFolderTags[0];
            let maxD = getFolderPath(deepest).length;
            for (let i = 1; i < charFolderTags.length; i++) {
              const d = getFolderPath(charFolderTags[i]).length;
              if (d > maxD) {
                deepest = charFolderTags[i];
                maxD = d;
              }
            }
            if (!folderChars[deepest]) folderChars[deepest] = [];
            folderChars[deepest].push(ch);
          } else {
            ungroupedChars.push(ch);
          }
        }

        function renderCharItem(ch, depth) {
          const isSelected = selectedCharTargetAvatar === ch.avatar;
          const displayName = ch.name || ch.avatar || "(未命名)";
          const itemNode = $(
            `<div class="cfm-transfer-item ${isSelected ? "cfm-transfer-item-selected" : ""}" data-avatar="${escapeHtml(ch.avatar)}" style="padding-left:${depth * 16 + 12}px;display:flex;align-items:center;gap:8px;">
              <span class="cfm-transfer-item-icon"><i class="fa-solid fa-user"></i></span>
              <span class="cfm-transfer-item-name">${escapeHtml(displayName)}</span>
            </div>`,
          );
          bindPresetTransferTreeTap(itemNode, () => {
            selectedCharTargetAvatar = ch.avatar;
            selectedCharTargetName = displayName;
            renderCharTargetTree();
            updateCharTargetHint();
          });
          charTreeContainer.append(itemNode);
        }

        function renderCharFolder(folderId, depth) {
          const displayName = getTagName(folderId);
          const isExpanded = charTransferExpandedFolders.has(folderId);
          const childFolderIds = getChildFolders(folderId);
          const charsInFolder = folderChars[folderId] || [];
          const hasContent =
            charsInFolder.length > 0 ||
            childFolderIds.some((cid) => folderChars[cid]?.length > 0);

          if (
            query &&
            !hasContent &&
            !displayName.toLowerCase().includes(query)
          ) {
            return;
          }

          const folderNode = $(`
            <div class="cfm-transfer-folder" data-folder-id="${escapeHtml(folderId)}" style="padding-left:${depth * 16 + 8}px;">
              <span class="cfm-transfer-folder-arrow"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></span>
              <span class="cfm-transfer-folder-icon"><i class="fa-solid fa-folder${isExpanded ? "-open" : ""}"></i></span>
              <span class="cfm-transfer-folder-name">${escapeHtml(displayName)}</span>
              <span class="cfm-transfer-folder-count">${charsInFolder.length}</span>
            </div>
          `);
          bindPresetTransferTreeTap(folderNode, () => {
            if (charTransferExpandedFolders.has(folderId)) {
              charTransferExpandedFolders.delete(folderId);
            } else {
              charTransferExpandedFolders.add(folderId);
            }
            renderCharTargetTree();
          });
          charTreeContainer.append(folderNode);

          if (isExpanded || query) {
            for (const childId of childFolderIds)
              renderCharFolder(childId, depth + 1);
            for (const ch of charsInFolder) renderCharItem(ch, depth + 1);
          }
        }

        const rootFolders = getTopLevelFolders();
        for (const fid of rootFolders) renderCharFolder(fid, 0);

        if (ungroupedChars.length > 0) {
          const uncatId = "__char_ungrouped__";
          const isUncatExpanded = charTransferExpandedFolders.has(uncatId);
          const uncatNode = $(`
            <div class="cfm-transfer-folder cfm-transfer-folder-ungrouped" style="padding-left:8px;">
              <span class="cfm-transfer-folder-arrow"><i class="fa-solid fa-caret-${isUncatExpanded ? "down" : "right"}"></i></span>
              <span class="cfm-transfer-folder-icon"><i class="fa-solid fa-box-open"></i></span>
              <span class="cfm-transfer-folder-name">未归类</span>
              <span class="cfm-transfer-folder-count">${ungroupedChars.length}</span>
            </div>
          `);
          bindPresetTransferTreeTap(uncatNode, () => {
            if (charTransferExpandedFolders.has(uncatId)) {
              charTransferExpandedFolders.delete(uncatId);
            } else {
              charTransferExpandedFolders.add(uncatId);
            }
            renderCharTargetTree();
          });
          charTreeContainer.append(uncatNode);

          if (isUncatExpanded || query) {
            for (const ch of ungroupedChars) renderCharItem(ch, 1);
          }
        }

        if (charTreeContainer.children().length === 0) {
          charTreeContainer.html(
            '<div style="padding:16px;opacity:0.5;text-align:center;">无可选角色</div>',
          );
        }
      }

      charSearchInput.on("input", () => renderCharTargetTree());
      dialog
        .find(".cfm-regex-transfer-char-expand-all")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          for (const id of getFolderTagIds()) {
            charTransferExpandedFolders.add(id);
          }
          charTransferExpandedFolders.add("__char_ungrouped__");
          renderCharTargetTree();
        });
      dialog
        .find(".cfm-regex-transfer-char-collapse-all")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          charTransferExpandedFolders.clear();
          renderCharTargetTree();
        });

      function bindPresetTransferTreeTap(target, handler) {
        target
          .on("touchstart", function (e) {
            const touch = e.originalEvent?.touches?.[0];
            if (!touch) return;
            $(this).data("cfmPresetTransferTouchStartX", touch.clientX);
            $(this).data("cfmPresetTransferTouchStartY", touch.clientY);
          })
          .on("click touchend", function (e) {
            const node = $(this);
            const now = Date.now();
            const lastTouchAt = Number(
              node.data("cfmPresetTransferLastTouchAt") || 0,
            );

            if (e.type === "touchend") {
              node.data("cfmPresetTransferLastTouchAt", now);
              const touch = e.originalEvent?.changedTouches?.[0];
              if (touch) {
                const startX = Number(
                  node.data("cfmPresetTransferTouchStartX"),
                );
                const startY = Number(
                  node.data("cfmPresetTransferTouchStartY"),
                );
                if (Number.isFinite(startX) && Number.isFinite(startY)) {
                  const deltaX = Math.abs(touch.clientX - startX);
                  const deltaY = Math.abs(touch.clientY - startY);
                  if (
                    deltaX > PRESET_TRANSFER_TAP_MOVE_THRESHOLD ||
                    deltaY > PRESET_TRANSFER_TAP_MOVE_THRESHOLD
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                }
              }
            } else if (lastTouchAt && now - lastTouchAt < 500) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            e.preventDefault();
            e.stopPropagation();
            handler.call(this, e);
          });
      }

      function updatePresetTargetHint() {
        if (selectedPresetTargetName) {
          presetHintEl.html(
            `已选目标预设：<strong>${escapeHtml(selectedPresetTargetName)}</strong>`,
          );
          return;
        }
        presetHintEl.text("请选择一个目标预设");
      }

      function renderPresetTargetTree() {
        const query = String(presetSearchInput.val() || "")
          .trim()
          .toLowerCase();
        presetTreeContainer.empty();

        const folderItems = {};
        const ungrouped = [];
        for (const name of availablePresetTargets) {
          if (query && !name.toLowerCase().includes(query)) continue;
          const fid = presetGroups[name] || null;
          if (fid && presetTree[fid]) {
            if (!folderItems[fid]) folderItems[fid] = [];
            folderItems[fid].push(name);
          } else {
            ungrouped.push(name);
          }
        }

        function renderFolder(folderId, depth) {
          const displayName = getResFolderDisplayName("presets", folderId);
          const isExpanded = presetTransferExpandedFolders.has(folderId);
          const childFolders = Object.keys(presetTree).filter(
            (id) => (presetTree[id]?.parentId || null) === folderId,
          );
          const itemsInFolder = folderItems[folderId] || [];
          const hasContent =
            itemsInFolder.length > 0 || childFolders.length > 0;

          if (
            query &&
            !hasContent &&
            !displayName.toLowerCase().includes(query)
          ) {
            return;
          }

          const folderNode = $(`
            <div class="cfm-transfer-folder" data-folder-id="${escapeHtml(folderId)}" style="padding-left:${depth * 16 + 8}px;">
              <span class="cfm-transfer-folder-arrow"><i class="fa-solid fa-caret-${isExpanded ? "down" : "right"}"></i></span>
              <span class="cfm-transfer-folder-icon"><i class="fa-solid fa-folder${isExpanded ? "-open" : ""}"></i></span>
              <span class="cfm-transfer-folder-name">${escapeHtml(displayName)}</span>
              <span class="cfm-transfer-folder-count">${itemsInFolder.length}</span>
            </div>
          `);
          bindPresetTransferTreeTap(folderNode, () => {
            if (presetTransferExpandedFolders.has(folderId)) {
              presetTransferExpandedFolders.delete(folderId);
            } else {
              presetTransferExpandedFolders.add(folderId);
            }
            renderPresetTargetTree();
          });
          presetTreeContainer.append(folderNode);

          if (isExpanded || query) {
            for (const childId of childFolders)
              renderFolder(childId, depth + 1);
            for (const name of itemsInFolder) {
              const isSelected = selectedPresetTargetName === name;
              const itemNode = $(`
                <div class="cfm-transfer-item ${isSelected ? "cfm-transfer-item-selected" : ""}" data-name="${escapeHtml(name)}" style="padding-left:${(depth + 1) * 16 + 8}px;">
                  <span class="cfm-transfer-item-icon"><i class="fa-solid fa-sliders"></i></span>
                  <span class="cfm-transfer-item-name">${escapeHtml(name)}</span>
                </div>
              `);
              bindPresetTransferTreeTap(itemNode, () => {
                selectedPresetTargetName = name;
                renderPresetTargetTree();
                updatePresetTargetHint();
              });
              presetTreeContainer.append(itemNode);
            }
          }
        }

        const rootFolders = Object.keys(presetTree).filter(
          (id) => !presetTree[id]?.parentId,
        );
        for (const fid of rootFolders) renderFolder(fid, 0);

        if (ungrouped.length > 0) {
          const uncatId = "__ungrouped__";
          const isUncatExpanded = presetTransferExpandedFolders.has(uncatId);
          const uncatNode = $(`
            <div class="cfm-transfer-folder cfm-transfer-folder-ungrouped" style="padding-left:8px;">
              <span class="cfm-transfer-folder-arrow"><i class="fa-solid fa-caret-${isUncatExpanded ? "down" : "right"}"></i></span>
              <span class="cfm-transfer-folder-icon"><i class="fa-solid fa-box-open"></i></span>
              <span class="cfm-transfer-folder-name">未归类</span>
              <span class="cfm-transfer-folder-count">${ungrouped.length}</span>
            </div>
          `);
          bindPresetTransferTreeTap(uncatNode, () => {
            if (presetTransferExpandedFolders.has(uncatId)) {
              presetTransferExpandedFolders.delete(uncatId);
            } else {
              presetTransferExpandedFolders.add(uncatId);
            }
            renderPresetTargetTree();
          });
          presetTreeContainer.append(uncatNode);

          if (isUncatExpanded || query) {
            for (const name of ungrouped) {
              const isSelected = selectedPresetTargetName === name;
              const itemNode = $(`
                <div class="cfm-transfer-item ${isSelected ? "cfm-transfer-item-selected" : ""}" data-name="${escapeHtml(name)}" style="padding-left:24px;">
                  <span class="cfm-transfer-item-icon"><i class="fa-solid fa-sliders"></i></span>
                  <span class="cfm-transfer-item-name">${escapeHtml(name)}</span>
                </div>
              `);
              bindPresetTransferTreeTap(itemNode, () => {
                selectedPresetTargetName = name;
                renderPresetTargetTree();
                updatePresetTargetHint();
              });
              presetTreeContainer.append(itemNode);
            }
          }
        }

        if (presetTreeContainer.children().length === 0) {
          presetTreeContainer.html(
            '<div style="padding:16px;opacity:0.5;text-align:center;">无可选预设</div>',
          );
        }
      }

      const updateTargetVisibility = () => {
        const targetType =
          dialog
            .find('input[name="cfm-regex-transfer-target"]:checked')
            .val() || "";
        dialog
          .find(".cfm-regex-transfer-global-folder")
          .toggle(targetType === "global");
        dialog
          .find(".cfm-regex-transfer-char-target")
          .css("display", targetType === "char" ? "flex" : "none");
        if (targetType === "char") {
          renderCharTargetTree();
          updateCharTargetHint();
        }
        dialog
          .find(".cfm-regex-transfer-preset-target")
          .css("display", targetType === "preset" ? "flex" : "none");
        if (targetType === "preset") {
          renderPresetTargetTree();
          updatePresetTargetHint();
        }
      };

      function closeDialog(result = null) {
        overlay.remove();
        dialog.remove();
        resolve(result);
      }

      dialog
        .find('input[name="cfm-regex-transfer-target"]')
        .on("change", updateTargetVisibility);
      dialog
        .find(".cfm-regex-transfer-preset-expand-all")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          for (const id of Object.keys(presetTree)) {
            presetTransferExpandedFolders.add(id);
          }
          presetTransferExpandedFolders.add("__ungrouped__");
          renderPresetTargetTree();
        });
      dialog
        .find(".cfm-regex-transfer-preset-collapse-all")
        .on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          presetTransferExpandedFolders.clear();
          renderPresetTargetTree();
        });
      presetSearchInput.on("input", () => renderPresetTargetTree());
      updateTargetVisibility();

      dialog.find(".cfm-regex-transfer-confirm").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetType =
          dialog
            .find('input[name="cfm-regex-transfer-target"]:checked')
            .val() || "";
        if (!targetType) {
          cfmToastr.warning("当前没有可用的目标位置");
          return;
        }
        if (targetType === "char" && !selectedCharTargetAvatar) {
          cfmToastr.warning("请选择目标角色");
          return;
        }
        if (targetType === "preset" && !selectedPresetTargetName) {
          cfmToastr.warning("请选择目标预设");
          return;
        }
        closeDialog({
          mode:
            dialog
              .find('input[name="cfm-regex-transfer-mode"]:checked')
              .val() || "move",
          targetType,
          selectedPresetName: selectedPresetTargetName,
          selectedCharAvatar: selectedCharTargetAvatar,
          selectedCharName: selectedCharTargetName,
          globalFolderId:
            folderSelect.val() || defaultGlobalFolderId || "__ungrouped__",
        });
      });

      dialog.find(".cfm-regex-transfer-cancel").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog(null);
      });

      overlay.on("click", (e) => {
        if ($(e.target).is(overlay)) closeDialog(null);
      });

      $("#cfm-popup").append(overlay).append(dialog);
    });
  }

  function openRegexTransferInsertDialog(options = {}) {
    const {
      targetScope,
      baseScripts = [],
      insertedScripts = [],
      onApply,
      onSkip,
    } = options || {};

    return new Promise((resolve) => {
      const currentScripts = Array.isArray(baseScripts) ? baseScripts : [];
      const scriptsToInsert = Array.isArray(insertedScripts)
        ? insertedScripts
        : [];
      const previewNames = scriptsToInsert
        .map((script) => script?.scriptName || "(未命名)")
        .slice(0, 5)
        .join("、");
      const previewSuffix =
        scriptsToInsert.length > 5 ? ` 等 ${scriptsToInsert.length} 项` : "";
      const overlay = $('<div class="cfm-sort-dialog-overlay"></div>');
      const dialog = $(`
        <div class="cfm-sort-dialog cfm-sort-dialog-insert">
          <div class="cfm-sort-dialog-header">
            <span class="cfm-sort-dialog-title"><i class="fa-solid fa-sort"></i> 正则脚本排序</span>
            <span class="cfm-sort-dialog-desc">准备将 <b>${scriptsToInsert.length}</b> 个正则脚本插入到 <b>${escapeHtml(getRegexTransferScopeLabel(targetScope))}</b>。点击分隔线中间的 <i class="fa-solid fa-plus"></i> 选择插入位置；点击跳过则默认追加到最后。${previewNames ? `<br>待插入：${escapeHtml(previewNames)}${escapeHtml(previewSuffix)}` : ""}</span>
          </div>
          <div class="cfm-sort-dialog-body">
            <div class="cfm-sort-dialog-list cfm-sort-dialog-list-insert"></div>
          </div>
          <div class="cfm-sort-dialog-footer">
            <button class="cfm-btn cfm-sort-dialog-confirm cfm-sort-dialog-insert-confirm" disabled><i class="fa-solid fa-check"></i> 确认插入</button>
            <button class="cfm-btn cfm-sort-dialog-skip"><i class="fa-solid fa-forward"></i> 跳过</button>
            <button class="cfm-btn cfm-sort-dialog-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
          </div>
        </div>
      `);

      const sortList = dialog.find(".cfm-sort-dialog-list");
      const confirmBtn = dialog.find(".cfm-sort-dialog-insert-confirm");
      let selectedTargetIndex = null;

      function getPlacementText(script) {
        if (targetScope?.type === "global") {
          ensureResourceSettings();
          const groups =
            extension_settings[extensionName].regexGlobalGroups || {};
          return getRegexTransferGlobalFolderLabel(
            groups[script?.id] || "__ungrouped__",
          );
        }
        return getRegexTransferScopeLabel(targetScope);
      }

      function closeDialog() {
        overlay.remove();
        dialog.remove();
        resolve();
      }

      function updateSelectedInsertSlot() {
        sortList.find(".cfm-sort-insert-slot").each(function () {
          const slot = $(this);
          const isSelected =
            Number(slot.attr("data-target-index")) === selectedTargetIndex;
          const lineEl = slot.find(".cfm-sort-insert-line");
          const btnEl = slot.find(".cfm-sort-insert-btn");
          btnEl.attr(
            "title",
            isSelected ? "已选中，点击确认插入" : "选择插入到此处",
          );
          btnEl.attr("aria-pressed", isSelected ? "true" : "false");
          btnEl.css({
            color: isSelected ? "#a6e3a1" : "#89b4fa",
            borderColor: isSelected
              ? "rgba(166, 227, 161, 0.5)"
              : "rgba(137, 180, 250, 0.35)",
            backgroundColor: isSelected
              ? "rgba(166, 227, 161, 0.14)"
              : "var(--SmartThemeBlurTintColor, #1e1e2e)",
            boxShadow: isSelected
              ? "0 0 0 3px rgba(166, 227, 161, 0.08)"
              : "none",
          });
          lineEl.css({
            background: isSelected
              ? "linear-gradient(90deg, rgba(166, 227, 161, 0.12) 0%, rgba(166, 227, 161, 0.55) 50%, rgba(166, 227, 161, 0.12) 100%)"
              : "linear-gradient(90deg, rgba(137, 180, 250, 0.08) 0%, rgba(137, 180, 250, 0.35) 50%, rgba(137, 180, 250, 0.08) 100%)",
          });
        });
        confirmBtn.prop("disabled", selectedTargetIndex === null);
      }

      const renderInsertSlot = (targetIndex) => {
        const slot = $(`
          <div class="cfm-sort-insert-slot" data-target-index="${targetIndex}">
            <div class="cfm-sort-insert-line"></div>
            <button class="cfm-sort-insert-btn" title="选择插入到此处"><i class="fa-solid fa-plus"></i></button>
          </div>
        `);
        slot.find(".cfm-sort-insert-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectedTargetIndex = targetIndex;
          updateSelectedInsertSlot();
        });
        return slot;
      };

      sortList.append(renderInsertSlot(0));
      currentScripts.forEach((script, index) => {
        const row = $(`
          <div class="cfm-sort-row cfm-sort-row-static ${script?.disabled ? "cfm-sort-row-disabled" : ""}" data-script-id="${escapeHtml(script?.id || "")}">
            <span class="cfm-sort-row-static-index">${index + 1}</span>
            <span class="cfm-sort-row-name">${escapeHtml(script?.scriptName || "(未命名)")}</span>
            <span class="cfm-sort-row-folder">${escapeHtml(getPlacementText(script))}</span>
          </div>
        `);
        sortList.append(row);
        sortList.append(renderInsertSlot(index + 1));
      });

      updateSelectedInsertSlot();

      confirmBtn.on("click touchend", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedTargetIndex === null) {
          cfmToastr.warning("请先选择一个插入位置");
          return;
        }
        try {
          if (typeof onApply === "function") {
            await onApply(selectedTargetIndex);
          }
          closeDialog();
        } catch (err) {
          console.error("[CFM] 互通正则插入失败:", err);
          cfmToastr.error("保存插入位置失败: " + (err?.message || err));
        }
      });

      dialog.find(".cfm-sort-dialog-skip").on("click touchend", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (typeof onSkip === "function") {
            await onSkip();
          }
          closeDialog();
        } catch (err) {
          console.error("[CFM] 跳过互通正则插入失败:", err);
          cfmToastr.error("跳过失败: " + (err?.message || err));
        }
      });

      dialog.find(".cfm-sort-dialog-cancel").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      });

      overlay.on("click", (e) => {
        if ($(e.target).is(overlay)) closeDialog();
      });

      $("#cfm-popup").append(overlay).append(dialog);
    });
  }

  async function executeRegexTransferFlow(options = {}) {
    const { sourceScope, selectedIds = [] } = options || {};
    const uniqueIds = [...new Set((selectedIds || []).filter(Boolean))];
    if (!sourceScope || uniqueIds.length === 0) {
      cfmToastr.warning("请先选择要移动/复制的正则脚本");
      return;
    }

    const sourceScripts = getRegexScriptsForScope(sourceScope);
    const selectedIdSet = new Set(uniqueIds);
    const selectedScripts = sourceScripts.filter((script) =>
      selectedIdSet.has(script?.id),
    );
    if (selectedScripts.length === 0) {
      cfmToastr.warning("未找到选中的正则脚本");
      return;
    }

    const currentCharAvatar = getCurrentCharAvatar();
    const currentCharName = getCurrentCharName();
    const currentPresetName = getCurrentPresetName();
    const defaultGlobalFolderId =
      selectedRegexNode &&
      selectedRegexNode !== "__ungrouped__" &&
      selectedRegexNode !== "__favorites__"
        ? selectedRegexNode
        : "__ungrouped__";

    const transferConfig = await showRegexTransferSetupDialog({
      sourceScope,
      selectedCount: selectedScripts.length,
      currentCharName,
      currentCharAvatar,
      currentPresetName,
      defaultGlobalFolderId,
    });
    if (!transferConfig) return;

    let targetScope = null;
    if (transferConfig.targetType === "global") {
      targetScope = {
        type: "global",
        folderId: transferConfig.globalFolderId || "__ungrouped__",
      };
    } else if (transferConfig.targetType === "char") {
      const targetCharAvatar =
        transferConfig.selectedCharAvatar || currentCharAvatar;
      const targetCharName = transferConfig.selectedCharName || currentCharName;
      if (!targetCharAvatar) {
        cfmToastr.warning("当前没有可用的目标角色");
        return;
      }
      targetScope = {
        type: "char",
        avatar: targetCharAvatar,
        name: targetCharName,
      };
    } else if (transferConfig.targetType === "preset") {
      const targetPresetName = String(
        transferConfig.selectedPresetName || "",
      ).trim();
      if (!targetPresetName) {
        cfmToastr.warning("当前没有可用的目标预设");
        return;
      }
      targetScope = {
        type: "preset",
        name: targetPresetName,
      };
    }

    if (!targetScope) {
      cfmToastr.warning("未能确定目标位置");
      return;
    }

    if (isSameRegexScopeList(sourceScope, targetScope)) {
      cfmToastr.warning("来源与目标相同，请选择其他位置");
      return;
    }

    const sameList = isSameRegexScopeList(sourceScope, targetScope);
    const isCopyMode = transferConfig.mode === "copy";
    const insertedScripts = cloneRegexScriptsForTransfer(
      selectedScripts,
      isCopyMode,
    );
    const baseTargetScripts =
      sameList && !isCopyMode
        ? removeRegexScriptsByIds(sourceScripts, selectedIdSet)
        : getRegexScriptsForScope(targetScope);

    const applyTransfer = async (targetIndex) => {
      const finalTargetScripts = insertRegexScriptsAtIndex(
        baseTargetScripts,
        insertedScripts,
        targetIndex,
      );

      if (targetScope.type === "global") {
        ensureResourceSettings();
        const currentGroups = {
          ...(extension_settings[extensionName].regexGlobalGroups || {}),
        };
        insertedScripts.forEach((script) => {
          if (
            transferConfig.globalFolderId &&
            transferConfig.globalFolderId !== "__ungrouped__"
          ) {
            currentGroups[script.id] = transferConfig.globalFolderId;
          } else {
            delete currentGroups[script.id];
          }
        });
        await saveRegexScopeScripts(targetScope, finalTargetScripts, {
          globalGroups: currentGroups,
        });
      } else {
        await saveRegexScopeScripts(targetScope, finalTargetScripts);
      }

      if (!isCopyMode && !sameList) {
        const sourceAfterScripts = removeRegexScriptsByIds(
          sourceScripts,
          selectedIdSet,
        );
        if (sourceScope.type === "global") {
          ensureResourceSettings();
          const nextGroups = {
            ...(extension_settings[extensionName].regexGlobalGroups || {}),
          };
          uniqueIds.forEach((id) => delete nextGroups[id]);
          const nextFavorites = getResFavorites("regex").filter(
            (id) => !selectedIdSet.has(id),
          );
          await saveRegexScopeScripts(sourceScope, sourceAfterScripts, {
            globalGroups: nextGroups,
            globalFavorites: nextFavorites,
          });
        } else {
          await saveRegexScopeScripts(sourceScope, sourceAfterScripts);
        }
      }

      if (sourceScope.type === "global") {
        cfmMultiSelected.clear();
        cfmMultiSelectRangeMode = false;
        cfmMultiSelectLastClicked = null;
      } else {
        cfmRegexBatchSelected.clear();
        cfmRegexBatchRangeMode = false;
        cfmRegexBatchLastClicked = null;
      }

      // 互通完成后统一刷新原生正则UI，确保所有面板（全局/角色/预设）都反映最新状态
      await syncNativeRegexState();
      rerenderCurrentView();
      if (currentResourceType === "regex") renderRegexView();
      cfmToastr.success(
        `已${isCopyMode ? "复制" : "移动"} ${insertedScripts.length} 个正则脚本到${getRegexTransferScopeLabel(targetScope)}`,
      );
    };

    await openRegexTransferInsertDialog({
      targetScope,
      baseScripts: baseTargetScripts,
      insertedScripts,
      onApply: async (targetIndex) => {
        await applyTransfer(targetIndex);
      },
      onSkip: async () => {
        await applyTransfer(baseTargetScripts.length);
      },
    });
  }

  async function startGlobalRegexTransferFlow() {
    const selectedIds = Array.from(cfmMultiSelected || []).filter(Boolean);
    if (!cfmMultiSelectMode) {
      cfmToastr.warning("请先开启多选模式，再选择要互通的正则脚本");
      return;
    }
    if (selectedIds.length === 0) {
      cfmToastr.warning("请先选择要移动/复制的正则脚本");
      return;
    }
    await executeRegexTransferFlow({
      sourceScope: {
        type: "global",
        folderId:
          selectedRegexNode &&
          selectedRegexNode !== "__ungrouped__" &&
          selectedRegexNode !== "__favorites__"
            ? selectedRegexNode
            : "__ungrouped__",
      },
      selectedIds,
    });
  }

  async function startOwnedRegexTransferFlow(options = {}) {
    const {
      sourceType = "char",
      sourceName = "",
      avatar = "",
      selectedIds = [],
    } = options || {};
    if (!cfmRegexBatchMode) {
      cfmToastr.warning("请先开启批量操作，再选择要互通的正则脚本");
      return;
    }
    if (!selectedIds.length) {
      cfmToastr.warning("请先选择要移动/复制的正则脚本");
      return;
    }
    await executeRegexTransferFlow({
      sourceScope:
        sourceType === "preset"
          ? { type: "preset", name: sourceName }
          : { type: "char", avatar, name: sourceName },
      selectedIds,
    });
  }

  let cfmRegexCreateMonitorTimer = null;

  function stopRegexCreateMonitor() {
    if (cfmRegexCreateMonitorTimer) {
      window.clearInterval(cfmRegexCreateMonitorTimer);
      cfmRegexCreateMonitorTimer = null;
    }
  }

  async function applyRegexGlobalOrder(newOrder, successMessage) {
    extension_settings.regex = newOrder;
    getContext().saveSettingsDebounced();
    await syncNativeRegexState();
    renderRegexView();
    if (successMessage) {
      cfmToastr.success(successMessage);
    }
  }

  function moveRegexScriptInArray(scripts, scriptId, targetIndex) {
    const currentScripts = Array.isArray(scripts) ? [...scripts] : [];
    const currentIndex = currentScripts.findIndex(
      (script) => script?.id === scriptId,
    );
    if (currentIndex === -1) return null;
    const [script] = currentScripts.splice(currentIndex, 1);
    const normalizedIndex = Math.max(
      0,
      Math.min(targetIndex, currentScripts.length),
    );
    currentScripts.splice(normalizedIndex, 0, script);
    return currentScripts;
  }

  function moveRegexScriptToIndex(scriptId, targetIndex) {
    return moveRegexScriptInArray(
      getRegexGlobalScripts(),
      scriptId,
      targetIndex,
    );
  }

  function monitorNewOwnedRegexScript({
    beforeIds,
    getScripts,
    onCreated,
    onAbort,
  }) {
    stopRegexCreateMonitor();
    const monitorState = {
      startedAt: Date.now(),
      editorOpened: false,
    };

    cfmRegexCreateMonitorTimer = window.setInterval(async () => {
      try {
        const editorVisible = $(".regex_script_name:visible").length > 0;
        if (editorVisible) {
          monitorState.editorOpened = true;
        }

        const latestScripts = getScripts?.();
        const currentScripts = Array.isArray(latestScripts)
          ? latestScripts
          : [];
        const newScript = currentScripts.find(
          (script) => script?.id && !beforeIds.has(script.id),
        );
        if (newScript?.id) {
          stopRegexCreateMonitor();
          if (typeof onCreated === "function") {
            await onCreated(newScript, currentScripts);
          }
          return;
        }

        const elapsed = Date.now() - monitorState.startedAt;
        const neverOpened = !monitorState.editorOpened && elapsed > 4000;
        const timedOut = elapsed > 5 * 60 * 1000;
        const closedWithoutSave = monitorState.editorOpened && !editorVisible;
        if (neverOpened || timedOut || closedWithoutSave) {
          stopRegexCreateMonitor();
          if (typeof onAbort === "function") {
            onAbort();
          }
        }
      } catch (err) {
        console.error("[CFM] 监听新增正则失败:", err);
        stopRegexCreateMonitor();
        if (typeof onAbort === "function") {
          onAbort(err);
        }
      }
    }, 250);
  }

  function monitorNewGlobalRegexScript(beforeIds) {
    monitorNewOwnedRegexScript({
      beforeIds,
      getScripts: () => getRegexGlobalScripts(),
      onCreated: async (newScript) => {
        renderRegexView();
        await openRegexSortDialog({
          insertMode: true,
          newScriptId: String(newScript.id),
          onCancelInsert: async () => {
            ensureResourceSettings();
            const nextScripts = getRegexGlobalScripts().filter(
              (script) => String(script?.id || "") !== String(newScript.id),
            );
            const nextGroups = {
              ...(extension_settings[extensionName].regexGlobalGroups || {}),
            };
            delete nextGroups[newScript.id];
            const nextFavorites = getResFavorites("regex").filter(
              (id) => String(id) !== String(newScript.id),
            );
            await saveRegexScopeScripts({ type: "global" }, nextScripts, {
              globalGroups: nextGroups,
              globalFavorites: nextFavorites,
            });
            renderRegexView();
            cfmToastr.info("已取消新建正则");
          },
        });
      },
      onAbort: () => {
        renderRegexView();
      },
    });
  }

  function getPresetRegexScriptsByName(presetName) {
    try {
      if (!presetName) return [];
      const pm = getContext().getPresetManager();
      if (!pm) return [];
      const scripts = pm.readPresetExtensionField({
        name: presetName,
        path: "regex_scripts",
      });
      return Array.isArray(scripts) ? scripts : [];
    } catch (err) {
      console.debug("[CFM] getPresetRegexScriptsByName:", err);
      return [];
    }
  }

  async function openOwnedRegexInsertDialog(options = {}) {
    const {
      scripts = [],
      newScriptId = "",
      onApply,
      onSkip,
      onCancel,
    } = options || {};
    const ownedScripts = Array.isArray(scripts) ? scripts : [];
    const overlay = $('<div class="cfm-sort-dialog-overlay"></div>');
    const dialog = $(`
      <div class="cfm-sort-dialog cfm-sort-dialog-insert">
        <div class="cfm-sort-dialog-header">
          <span class="cfm-sort-dialog-title"><i class="fa-solid fa-sort"></i> 正则脚本排序</span>
          <span class="cfm-sort-dialog-desc">新正则已创建，请先点击分隔线中间的 <i class="fa-solid fa-plus"></i> 选择插入位置，再点击确认按钮提交；点击跳过则保持在最后。</span>
        </div>
        <div class="cfm-sort-dialog-body">
          <div class="cfm-sort-dialog-list cfm-sort-dialog-list-insert"></div>
        </div>
        <div class="cfm-sort-dialog-footer">
          <button class="cfm-btn cfm-sort-dialog-confirm cfm-sort-dialog-insert-confirm" disabled><i class="fa-solid fa-check"></i> 确认插入</button>
          <button class="cfm-btn cfm-sort-dialog-skip"><i class="fa-solid fa-forward"></i> 跳过</button>
          <button class="cfm-btn cfm-sort-dialog-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>
        </div>
      </div>
    `);

    const sortList = dialog.find(".cfm-sort-dialog-list");
    const confirmBtn = dialog.find(".cfm-sort-dialog-insert-confirm");
    let selectedTargetIndex = null;

    function closeDialog() {
      overlay.remove();
      dialog.remove();
    }

    async function handleCancel() {
      try {
        if (typeof onCancel === "function") {
          await onCancel();
        }
        closeDialog();
      } catch (err) {
        console.error("[CFM] 取消新建局部正则失败:", err);
        cfmToastr.error("取消新建失败: " + (err?.message || err));
      }
    }

    function updateSelectedInsertSlot() {
      sortList.find(".cfm-sort-insert-slot").each(function () {
        const slot = $(this);
        const isSelected =
          Number(slot.attr("data-target-index")) === selectedTargetIndex;
        const lineEl = slot.find(".cfm-sort-insert-line");
        const btnEl = slot.find(".cfm-sort-insert-btn");
        btnEl.attr(
          "title",
          isSelected ? "已选中，点击确认插入" : "选择插入到此处",
        );
        btnEl.attr("aria-pressed", isSelected ? "true" : "false");
        btnEl.css({
          color: isSelected ? "#a6e3a1" : "#89b4fa",
          borderColor: isSelected
            ? "rgba(166, 227, 161, 0.5)"
            : "rgba(137, 180, 250, 0.35)",
          backgroundColor: isSelected
            ? "rgba(166, 227, 161, 0.14)"
            : "var(--SmartThemeBlurTintColor, #1e1e2e)",
          boxShadow: isSelected
            ? "0 0 0 3px rgba(166, 227, 161, 0.08)"
            : "none",
        });
        lineEl.css({
          background: isSelected
            ? "linear-gradient(90deg, rgba(166, 227, 161, 0.12) 0%, rgba(166, 227, 161, 0.55) 50%, rgba(166, 227, 161, 0.12) 100%)"
            : "linear-gradient(90deg, rgba(137, 180, 250, 0.08) 0%, rgba(137, 180, 250, 0.35) 50%, rgba(137, 180, 250, 0.08) 100%)",
        });
      });
      confirmBtn.prop("disabled", selectedTargetIndex === null);
    }

    const renderInsertSlot = (targetIndex) => {
      const slot = $(`
        <div class="cfm-sort-insert-slot" data-target-index="${targetIndex}">
          <div class="cfm-sort-insert-line"></div>
          <button class="cfm-sort-insert-btn" title="选择插入到此处"><i class="fa-solid fa-plus"></i></button>
        </div>
      `);
      slot.find(".cfm-sort-insert-btn").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectedTargetIndex = targetIndex;
        updateSelectedInsertSlot();
      });
      return slot;
    };

    sortList.append(renderInsertSlot(0));
    ownedScripts.forEach((script, index) => {
      const placementLabel = getRegexPlacementLabel(script?.placement);
      const row = $(`
        <div class="cfm-sort-row cfm-sort-row-static ${script?.disabled ? "cfm-sort-row-disabled" : ""} ${script?.id === newScriptId ? "cfm-sort-row-new" : ""}" data-script-id="${escapeHtml(script?.id || "")}">
          <span class="cfm-sort-row-static-index">${index + 1}</span>
          <span class="cfm-sort-row-name">${escapeHtml(script?.scriptName || "(未命名)")}</span>
          <span class="cfm-sort-row-folder">${escapeHtml(placementLabel || "当前作用域")}</span>
          ${script?.id === newScriptId ? '<span class="cfm-sort-row-badge cfm-sort-badge-new">新建</span>' : ""}
        </div>
      `);
      sortList.append(row);
      sortList.append(renderInsertSlot(index + 1));
    });

    updateSelectedInsertSlot();

    confirmBtn.on("click touchend", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (selectedTargetIndex === null) {
        cfmToastr.warning("请先选择一个插入位置");
        return;
      }
      const newOrder = moveRegexScriptInArray(
        ownedScripts,
        newScriptId,
        selectedTargetIndex,
      );
      if (!newOrder) {
        cfmToastr.warning("未找到新建的正则脚本，无法调整位置");
        closeDialog();
        return;
      }
      try {
        if (typeof onApply === "function") {
          await onApply(newOrder);
        }
        closeDialog();
      } catch (err) {
        console.error("[CFM] 保存局部正则插入位置失败:", err);
        cfmToastr.error("保存插入位置失败: " + (err?.message || err));
      }
    });

    dialog.find(".cfm-sort-dialog-skip").on("click touchend", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (typeof onSkip === "function") {
          await onSkip();
        }
        closeDialog();
      } catch (err) {
        console.error("[CFM] 跳过局部正则插入排序失败:", err);
        cfmToastr.error("跳过失败: " + (err?.message || err));
      }
    });

    dialog.find(".cfm-sort-dialog-cancel").on("click touchend", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await handleCancel();
    });

    overlay.on("click", async (e) => {
      if ($(e.target).is(overlay)) await handleCancel();
    });

    $("#cfm-popup").append(overlay).append(dialog);
  }

  function createGlobalRegexFromManager() {
    ensureResourceSettings();
    if (cfmRegexCreateMonitorTimer) {
      cfmToastr.info("正在等待当前新建正则完成");
      return;
    }

    const nativeCreateBtn = $("#open_regex_editor");
    if (!nativeCreateBtn.length) {
      cfmToastr.warning(
        "未找到原生全局正则编辑器入口，请先确保原生正则功能已完成加载",
      );
      return;
    }

    const beforeIds = new Set(
      getRegexGlobalScripts()
        .map((script) => script?.id)
        .filter(Boolean),
    );
    monitorNewGlobalRegexScript(beforeIds);
    nativeCreateBtn.trigger("click");
  }

  function createCharScopedRegexFromManager(avatar, charName) {
    ensureResourceSettings();
    if (cfmRegexCreateMonitorTimer) {
      cfmToastr.info("正在等待当前新建正则完成");
      return;
    }

    const nativeCreateBtn = $("#open_scoped_editor");
    if (!nativeCreateBtn.length) {
      cfmToastr.warning(
        "未找到原生角色正则编辑器入口，请先确保原生正则功能已完成加载",
      );
      return;
    }

    const getScripts = () => {
      const chars = getCharacters();
      const ch = chars.find((item) => item.avatar === avatar);
      const scripts = ch?.data?.extensions?.regex_scripts;
      return Array.isArray(scripts) ? scripts : [];
    };

    const beforeIds = new Set(
      getScripts()
        .map((script) => script?.id)
        .filter(Boolean),
    );

    monitorNewOwnedRegexScript({
      beforeIds,
      getScripts,
      onCreated: async (newScript, currentScripts) => {
        rerenderCurrentView();
        await openOwnedRegexInsertDialog({
          scripts: currentScripts,
          newScriptId: String(newScript.id),
          onApply: async (newOrder) => {
            await saveCharRegexScripts(avatar, newOrder);
            rerenderCurrentView();
            cfmToastr.success(
              `角色「${charName || "当前角色"}」的新正则插入位置已保存`,
            );
          },
          onSkip: () => {
            rerenderCurrentView();
            cfmToastr.success("新正则已创建，顺序保持在最后");
          },
          onCancel: async () => {
            const latestScripts = getScripts();
            const nextScripts = latestScripts.filter(
              (script) => String(script?.id || "") !== String(newScript.id),
            );
            await saveCharRegexScripts(avatar, nextScripts);
            rerenderCurrentView();
            cfmToastr.info(`已取消角色「${charName || "当前角色"}」的新正则`);
          },
        });
      },
      onAbort: () => {
        rerenderCurrentView();
      },
    });
    nativeCreateBtn.trigger("click");
  }

  function createPresetRegexFromManager(presetName) {
    ensureResourceSettings();
    if (cfmRegexCreateMonitorTimer) {
      cfmToastr.info("正在等待当前新建正则完成");
      return;
    }

    const nativeCreateBtn = $("#open_preset_editor");
    if (!nativeCreateBtn.length) {
      cfmToastr.warning(
        "未找到原生预设正则编辑器入口，请先确保原生正则功能已完成加载",
      );
      return;
    }

    const getScripts = () => getPresetRegexScriptsByName(presetName);
    const beforeIds = new Set(
      getScripts()
        .map((script) => script?.id)
        .filter(Boolean),
    );

    monitorNewOwnedRegexScript({
      beforeIds,
      getScripts,
      onCreated: async (newScript, currentScripts) => {
        rerenderCurrentView();
        await openOwnedRegexInsertDialog({
          scripts: currentScripts,
          newScriptId: String(newScript.id),
          onApply: async (newOrder) => {
            await savePresetRegexScripts(newOrder);
            rerenderCurrentView();
            cfmToastr.success(
              `预设「${presetName || "当前预设"}」的新正则插入位置已保存`,
            );
          },
          onSkip: () => {
            rerenderCurrentView();
            cfmToastr.success("新正则已创建，顺序保持在最后");
          },
          onCancel: async () => {
            const latestScripts = getScripts();
            const nextScripts = latestScripts.filter(
              (script) => String(script?.id || "") !== String(newScript.id),
            );
            await savePresetRegexScripts(nextScripts);
            rerenderCurrentView();
            cfmToastr.info(`已取消预设「${presetName || "当前预设"}」的新正则`);
          },
        });
      },
      onAbort: () => {
        rerenderCurrentView();
      },
    });
    nativeCreateBtn.trigger("click");
  }

  // --- 正则辅助函数 ---
  function getRegexPlacementLabel(placement) {
    const labels = {
      1: "用户输入",
      2: "AI输出",
      3: "斜杠命令",
      5: "世界书",
      6: "推理",
    };
    if (!Array.isArray(placement)) return "";
    return placement
      .map((p) => labels[p] || `#${p}`)
      .filter(Boolean)
      .join(", ");
  }

  // ==================== 正则视图协调（模块化转发） ====================
  let _regexViewApi = null;
  function getRegexViewApi() {
    if (!_regexViewApi) {
      _regexViewApi = createRegexViewApiCore({
        escapeHtml,
        isResFavorite,
        state: {
          getCfmResDeleteMode: () => cfmResDeleteMode,
          getCfmResDeleteSelected: () => cfmResDeleteSelected,
          getCfmExportMode: () => cfmExportMode,
          getCfmExportSelected: () => cfmExportSelected,
          getCfmMultiSelectMode: () => cfmMultiSelectMode,
          getCfmMultiSelected: () => cfmMultiSelected,
        },
      });
    }
    return _regexViewApi;
  }

  // 构建正则脚本行HTML（cfm-row模式，与其他标签页一致，不直接展示正则内容）
  function buildRegexScriptRowHtml(script, scriptType, ownerLabel) {
    return getRegexViewApi().buildRegexScriptRowHtml(
      script,
      scriptType,
      ownerLabel,
    );
  }

  // 构建正则左栏树节点HTML（cfm-tnode模式，与其他标签页一致）
  function buildRegexTreeNodeHtml(
    nodeId,
    label,
    icon,
    count,
    level,
    hasChildren,
    isExpanded,
    isSelected,
    extraClass,
  ) {
    const indent = 10 + level * 16;
    // 文件夹类型的节点选中时切换为 fa-folder-open
    const isFolderIcon = icon === "fa-folder";
    const displayIcon = isFolderIcon && isSelected ? "fa-folder-open" : icon;
    return `
      <div class="cfm-tnode ${isSelected ? "cfm-tnode-selected" : ""} ${extraClass || ""}"
           data-node-id="${escapeHtml(nodeId)}"
           style="padding-left: ${indent}px;">
        <span class="cfm-tnode-arrow ${hasChildren ? (isExpanded ? "cfm-arrow-expanded" : "") : "cfm-arrow-hidden"}"><i class="fa-solid fa-caret-right"></i></span>
        <span class="cfm-tnode-icon"><i class="fa-solid ${displayIcon}"></i></span>
        <span class="cfm-tnode-label">${escapeHtml(label)}</span>
        ${count !== null && count !== undefined ? `<span class="cfm-tnode-count">${count}</span>` : ""}
      </div>
    `;
  }

  // updateRegexRightPane 已移至 renderRegexView 内部作为 setRightPane

  // 构建裁剪树：只保留包含目标项目的文件夹分支
  function buildPrunedFolderSet(sourceType, itemsWithContent) {
    const markedFolders = new Set();
    if (sourceType === "presets") {
      const groups = getResourceGroups("presets");
      const tree = getResFolderTree("presets");
      for (const itemName of itemsWithContent) {
        let folderId = groups[itemName] || null;
        while (folderId) {
          if (markedFolders.has(folderId)) break;
          markedFolders.add(folderId);
          folderId = tree[folderId]?.parentId || null;
        }
      }
    } else if (sourceType === "chars") {
      const tagMap = getTagMap();
      const folderTagIdSet = new Set(getFolderTagIds());
      for (const avatar of itemsWithContent) {
        const charTags = tagMap[avatar] || [];
        for (const tagId of charTags) {
          if (!folderTagIdSet.has(tagId)) continue;
          let current = tagId;
          while (current) {
            if (markedFolders.has(current)) break;
            markedFolders.add(current);
            current = config.folders[current]?.parentId || null;
          }
        }
      }
    }
    return markedFolders;
  }

  // ==================== 正则激活分组管理 ====================
  function getExistingRegexScriptIdSet() {
    return new Set(
      (extension_settings.regex ?? [])
        .map((script) => String(script?.id || "").trim())
        .filter(Boolean),
    );
  }

  function filterExistingRegexScriptIds(scriptIds, existingIdSet) {
    const validIdSet = existingIdSet || getExistingRegexScriptIdSet();
    return Array.from(
      new Set(
        (Array.isArray(scriptIds) ? scriptIds : [])
          .map((scriptId) => String(scriptId || "").trim())
          .filter((scriptId) => scriptId && validIdSet.has(scriptId)),
      ),
    );
  }

  function sanitizeRegexActivePresetState(save = false) {
    const presets = extension_settings[extensionName].regexActivePresets || [];
    const existingIdSet = getExistingRegexScriptIdSet();
    let presetChanged = false;
    let presetIdx = 0;
    for (const preset of presets) {
      if (!preset || typeof preset !== "object") continue;
      // name 兜底：缺失或空白的分组名补默认名，避免界面显示 undefined
      if (typeof preset.name !== "string" || !preset.name.trim()) {
        preset.name = `未命名分组 ${presetIdx + 1}`;
        presetChanged = true;
      }
      if (!preset.scope) {
        preset.scope = "global";
        presetChanged = true;
      }
      if (preset.scope === "char" || preset.scope === "preset") {
        preset.scope = "bound";
        presetChanged = true;
      }
      if (!Array.isArray(preset.bindChars)) {
        preset.bindChars = [];
        presetChanged = true;
      }
      if (!Array.isArray(preset.bindPresets)) {
        preset.bindPresets = [];
        presetChanged = true;
      }
      if (!Array.isArray(preset.bindChats)) {
        preset.bindChats = [];
        presetChanged = true;
      }
      const prevScripts = Array.isArray(preset.scripts) ? preset.scripts : [];
      const nextScripts = filterExistingRegexScriptIds(
        prevScripts,
        existingIdSet,
      );
      const sameScripts =
        prevScripts.length === nextScripts.length &&
        prevScripts.every((scriptId, idx) => scriptId === nextScripts[idx]);
      if (!sameScripts || !Array.isArray(preset.scripts)) {
        preset.scripts = nextScripts;
        presetChanged = true;
      }
      presetIdx++;
    }
    const applied = Array.isArray(
      extension_settings[extensionName]._regexAppliedPresetIndices,
    )
      ? extension_settings[extensionName]._regexAppliedPresetIndices
      : [];
    const nextApplied = applied.filter(
      (idx) =>
        presets[idx] &&
        Array.isArray(presets[idx].scripts) &&
        presets[idx].scripts.length > 0,
    );
    const appliedChanged =
      applied.length !== nextApplied.length ||
      applied.some((idx, i) => idx !== nextApplied[i]);
    if (appliedChanged) {
      extension_settings[extensionName]._regexAppliedPresetIndices =
        nextApplied;
    }
    if (save && (presetChanged || appliedChanged)) {
      getContext().saveSettingsDebounced();
    }
    return {
      presets,
      existingIdSet,
      changed: presetChanged || appliedChanged,
    };
  }

  function getRegexActivePresets() {
    sanitizeRegexActivePresetState(true);
    return extension_settings[extensionName].regexActivePresets || [];
  }
  function saveRegexActivePreset(name, scriptIds) {
    const presets = getRegexActivePresets();
    const existing = presets.find((p) => p.name === name);
    if (existing) {
      existing.scripts = [...scriptIds];
      if (!existing.scope) existing.scope = "global";
      if (!Array.isArray(existing.bindChars)) existing.bindChars = [];
      if (!Array.isArray(existing.bindPresets)) existing.bindPresets = [];
      if (!Array.isArray(existing.bindChats)) existing.bindChats = [];
    } else {
      presets.push({
        name,
        scripts: [...scriptIds],
        scope: "global",
        bindChars: [],
        bindPresets: [],
        bindChats: [],
      });
    }
    extension_settings[extensionName].regexActivePresets = presets;
    getContext().saveSettingsDebounced();
  }
  function deleteRegexActivePreset(name) {
    const presets = getRegexActivePresets();
    extension_settings[extensionName].regexActivePresets = presets.filter(
      (p) => p.name !== name,
    );
    getContext().saveSettingsDebounced();
  }
  function renameRegexActivePreset(oldName, newName) {
    const presets = getRegexActivePresets();
    const p = presets.find((p) => p.name === oldName);
    if (p) {
      p.name = newName;
      getContext().saveSettingsDebounced();
    }
  }

  /**
   * 获取当前已启用的全局正则脚本ID集合
   */
  function getEnabledRegexScriptIds() {
    const globalScripts = extension_settings.regex ?? [];
    return globalScripts.filter((s) => !s.disabled && s.id).map((s) => s.id);
  }

  /**
   * 切换全局正则脚本的启用/禁用状态
   * @param {string} scriptId - 脚本ID
   * @param {boolean} enable - true=启用, false=禁用
   */
  function toggleRegexScriptActivation(scriptId, enable) {
    const normalizedScriptId = String(scriptId || "").trim();
    if (!normalizedScriptId) return false;
    const existingIdSet = getExistingRegexScriptIdSet();
    if (!existingIdSet.has(normalizedScriptId)) {
      console.info(
        `[CFM] 已跳过不存在的正则脚本激活切换：${normalizedScriptId}`,
      );
      return false;
    }
    const globalScripts = extension_settings.regex ?? [];
    const script = globalScripts.find((s) => s.id === normalizedScriptId);
    if (script) {
      script.disabled = !enable;
      return true;
    }
    return false;
  }

  function setRegexPresetScope(presetIdx, scope) {
    const presets = getRegexActivePresets();
    if (presets[presetIdx]) {
      presets[presetIdx].scope = scope;
      if (scope === "global") {
        presets[presetIdx].bindChars = [];
        presets[presetIdx].bindPresets = [];
        presets[presetIdx].bindChats = [];
      }
      getContext().saveSettingsDebounced();
    }
  }

  function bindRegexPresetToChar(presetIdx, charAvatar) {
    const presets = getRegexActivePresets();
    const p = presets[presetIdx];
    if (!p) return;
    if (!Array.isArray(p.bindChars)) p.bindChars = [];
    if (!p.bindChars.includes(charAvatar)) {
      p.bindChars.push(charAvatar);
      getContext().saveSettingsDebounced();
    }
  }

  function bindRegexPresetToChat(presetIdx, charAvatar, chatFileName) {
    const presets = getRegexActivePresets();
    const p = presets[presetIdx];
    const bindKey = makeChatBindKey(charAvatar, chatFileName);
    if (!p || !bindKey) return;
    if (!Array.isArray(p.bindChats)) p.bindChats = [];
    if (!p.bindChats.includes(bindKey)) {
      p.bindChats.push(bindKey);
      getContext().saveSettingsDebounced();
    }
  }

  function bindRegexPresetToPreset(presetIdx, presetName) {
    const presets = getRegexActivePresets();
    const p = presets[presetIdx];
    if (!p) return;
    if (!Array.isArray(p.bindPresets)) p.bindPresets = [];
    if (!p.bindPresets.includes(presetName)) {
      p.bindPresets.push(presetName);
      getContext().saveSettingsDebounced();
    }
  }

  function unbindRegexPresetFromChar(presetIdx, charAvatar) {
    const presets = getRegexActivePresets();
    const p = presets[presetIdx];
    if (!p || !Array.isArray(p.bindChars)) return;
    const idx = p.bindChars.indexOf(charAvatar);
    if (idx !== -1) {
      p.bindChars.splice(idx, 1);
      getContext().saveSettingsDebounced();
    }
  }

  function unbindRegexPresetFromChat(presetIdx, bindKey) {
    const presets = getRegexActivePresets();
    const p = presets[presetIdx];
    if (!p || !Array.isArray(p.bindChats)) return;
    const idx = p.bindChats.indexOf(bindKey);
    if (idx !== -1) {
      p.bindChats.splice(idx, 1);
      getContext().saveSettingsDebounced();
    }
  }

  function unbindRegexPresetFromPreset(presetIdx, presetName) {
    const presets = getRegexActivePresets();
    const p = presets[presetIdx];
    if (!p || !Array.isArray(p.bindPresets)) return;
    const idx = p.bindPresets.indexOf(presetName);
    if (idx !== -1) {
      p.bindPresets.splice(idx, 1);
      getContext().saveSettingsDebounced();
    }
  }

  function getRegexAutoApplyPresetIndices() {
    const presets = getRegexActivePresets();
    const currentChar = getCurrentCharAvatar();
    const currentPreset = getCurrentPresetName();
    const currentChatKey = getCurrentChatBindKey();
    const indices = [];
    const details = {};
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      if (!p || !Array.isArray(p.scripts) || p.scripts.length === 0) continue;
      if (p.scope === "global") continue;
      const hasBindings =
        (p.bindChars && p.bindChars.length > 0) ||
        (p.bindPresets && p.bindPresets.length > 0) ||
        (p.bindChats && p.bindChats.length > 0);
      if (!hasBindings) continue;
      const chatMatch = !!(
        currentChatKey &&
        p.bindChats &&
        p.bindChats.includes(currentChatKey)
      );
      const charMatch = !!(
        !chatMatch &&
        currentChar &&
        p.bindChars &&
        p.bindChars.includes(currentChar)
      );
      const presetMatch = !!(
        currentPreset &&
        p.bindPresets &&
        p.bindPresets.includes(currentPreset)
      );
      if (chatMatch || charMatch || presetMatch) {
        indices.push(i);
        details[i] = { chatMatch, charMatch, presetMatch };
      }
    }
    return { indices, details };
  }

  async function unapplyRegexPresetIndex(presetIdx) {
    const allPresets = getRegexActivePresets();
    const preset = allPresets[presetIdx];
    if (!preset) return 0;
    const applied =
      extension_settings[extensionName]._regexAppliedPresetIndices || [];
    const otherApplied = applied.filter(
      (i) => i !== presetIdx && allPresets[i],
    );
    const otherScripts = new Set();
    for (const oi of otherApplied) {
      for (const sid of allPresets[oi].scripts) otherScripts.add(sid);
    }
    let removedCount = 0;
    let changed = false;
    for (const sid of preset.scripts) {
      if (!otherScripts.has(sid) && toggleRegexScriptActivation(sid, false)) {
        removedCount++;
        changed = true;
      }
    }
    extension_settings[extensionName]._regexAppliedPresetIndices = otherApplied;
    getContext().saveSettingsDebounced();
    if (changed) await syncNativeRegexState();
    return removedCount;
  }

  async function autoApplyRegexPresets(silent = false) {
    try {
      const presets = getRegexActivePresets();
      const { indices: shouldApply, details } =
        getRegexAutoApplyPresetIndices();
      const prevApplied =
        extension_settings[extensionName]._regexAppliedPresetIndices || [];
      const currentCharName = getCurrentCharName();
      const currentPresetName = getCurrentPresetName();
      const currentChatName = getCurrentChatFileName();
      const toDeactivate = prevApplied.filter((i) => !shouldApply.includes(i));
      const toActivate = shouldApply.filter((i) => !prevApplied.includes(i));
      const stillApplied = shouldApply.filter((i) => prevApplied.includes(i));
      if (
        toDeactivate.length === 0 &&
        toActivate.length === 0 &&
        stillApplied.length === 0
      )
        return;

      const scriptsToDeactivate = new Set();
      for (const idx of toDeactivate) {
        if (presets[idx]) {
          for (const sid of presets[idx].scripts) scriptsToDeactivate.add(sid);
        }
      }
      const scriptsToActivate = new Set();
      for (const idx of shouldApply) {
        if (presets[idx]) {
          for (const sid of presets[idx].scripts) scriptsToActivate.add(sid);
        }
      }
      for (const sid of scriptsToActivate) scriptsToDeactivate.delete(sid);

      let changed = false;
      for (const sid of scriptsToDeactivate) {
        changed = toggleRegexScriptActivation(sid, false) || changed;
      }
      for (const sid of scriptsToActivate) {
        changed = toggleRegexScriptActivation(sid, true) || changed;
      }

      extension_settings[extensionName]._regexAppliedPresetIndices = [
        ...shouldApply,
      ];
      getContext().saveSettingsDebounced();
      if (changed) {
        await syncNativeRegexState();
      }

      function describeMatchReason(idx) {
        const d = details[idx];
        if (!d) return "";
        const reasons = [];
        if (d.chatMatch && currentChatName)
          reasons.push(`聊天「${currentChatName}」`);
        if (d.charMatch && currentCharName)
          reasons.push(`角色「${currentCharName}」`);
        if (d.presetMatch && currentPresetName)
          reasons.push(`预设「${currentPresetName}」`);
        return reasons.length > 0 ? `（匹配${reasons.join("和")}）` : "";
      }

      const msgParts = [];
      for (const idx of toActivate) {
        const name = presets[idx]?.name;
        if (name)
          msgParts.push(`✅ 已开启「${name}」${describeMatchReason(idx)}`);
      }
      for (const idx of toDeactivate) {
        const name = presets[idx]?.name;
        if (name) {
          const p = presets[idx];
          const reasons = [];
          if (p.bindChats && p.bindChats.length > 0) reasons.push("聊天不匹配");
          if (p.bindChars && p.bindChars.length > 0) reasons.push("角色不匹配");
          if (p.bindPresets && p.bindPresets.length > 0)
            reasons.push("预设不匹配");
          msgParts.push(`❌ 已关闭「${name}」（${reasons.join("且")}）`);
        }
      }
      if (
        (toActivate.length > 0 || toDeactivate.length > 0) &&
        stillApplied.length > 0
      ) {
        for (const idx of stillApplied) {
          const name = presets[idx]?.name;
          if (name)
            msgParts.push(`🔄 「${name}」保持开启${describeMatchReason(idx)}`);
        }
      }
      if (!silent && msgParts.length > 0) {
        cfmToastr.info(msgParts.join("<br>"), "正则分组", {
          timeOut: 4000,
          escapeHtml: false,
        });
      }
    } catch (e) {
      console.error("[CFM] 自动应用正则分组失败", e);
    }
  }

  /** 显示正则激活分组面板（保存 + 已有分组列表） */
  async function showRegexPresetPanel() {
    return getRegexPresetEditApi().showRegexPresetPanel();
  }
  let _regexPresetEditApi = null;
  function getRegexPresetEditApi() {
    if (!_regexPresetEditApi) {
      _regexPresetEditApi = createRegexPresetEditApi({
        $,
        cfmToastr,
        cfmConfirm,
        escapeHtml,
        getContext,
        extensionName,
        extension_settings,
        getRegexActivePresets,
        renameRegexActivePreset,
        saveRegexActivePreset,
        deleteRegexActivePreset,
        getEnabledRegexScriptIds,
        getCurrentCharAvatar,
        getCurrentCharName,
        getCurrentPresetName,
        getCurrentChatFileName,
        getCurrentChatBindKey,
        getCharacters,
        parseChatBindKey,
        createChoiceDialog,
        toggleRegexScriptActivation,
        syncNativeRegexState,
        renderRegexView,
        getRegexAutoApplyPresetIndices,
        setRegexPresetScope,
        bindRegexPresetToPreset,
        bindRegexPresetToChar,
        bindRegexPresetToChat,
        unbindRegexPresetFromPreset,
        unbindRegexPresetFromChar,
        unbindRegexPresetFromChat,
        unapplyRegexPresetIndex,
        autoApplyRegexPresets,
        showPresetEditFolderFilterPanel,
      });
    }
    return _regexPresetEditApi;
  }

  /** 打开正则激活分组编辑弹窗 */
  function showRegexPresetEditPopup(preset) {
    return getRegexPresetEditApi().showRegexPresetEditPopup(preset);
  }
  // ==================== 正则脚本排序弹窗 ====================
  async function openRegexSortDialog(options = {}) {
    ensureResourceSettings();
    const {
      insertMode = false,
      newScriptId = "",
      onCancelInsert,
    } = options || {};
    const globalScripts = getRegexGlobalScripts();
    const folderTree = extension_settings[extensionName].regexFolderTree || {};
    const globalGroups =
      extension_settings[extensionName].regexGlobalGroups || {};

    // 加载 jQuery UI Sortable（若尚未加载）
    if (!insertMode && !$.fn.sortable) {
      await import("../../../../lib/jquery-ui.min.js").catch(() => {});
    }

    // 构建弹窗 DOM
    const overlay = $('<div class="cfm-sort-dialog-overlay"></div>');
    const dialog = $(`
      <div class="cfm-sort-dialog ${insertMode ? "cfm-sort-dialog-insert" : ""}">
        <div class="cfm-sort-dialog-header">
          <span class="cfm-sort-dialog-title"><i class="fa-solid fa-sort"></i> 正则脚本排序</span>
          <span class="cfm-sort-dialog-desc">${insertMode ? '新正则已创建，请先点击分隔线中间的 <i class="fa-solid fa-plus"></i> 选择插入位置，再点击确认按钮提交；点击跳过则保持在最后。' : '拖动 <i class="fa-solid fa-grip-vertical"></i> 手柄调整脚本在 extension_settings.regex 中的顺序（影响执行优先级）'}</span>
        </div>
        <div class="cfm-sort-dialog-body">
          <div class="cfm-sort-dialog-list ${insertMode ? "cfm-sort-dialog-list-insert" : ""}"></div>
        </div>
        <div class="cfm-sort-dialog-footer">
          ${insertMode ? '<button class="cfm-btn cfm-sort-dialog-confirm cfm-sort-dialog-insert-confirm" disabled><i class="fa-solid fa-check"></i> 确认插入</button><button class="cfm-btn cfm-sort-dialog-skip"><i class="fa-solid fa-forward"></i> 跳过</button><button class="cfm-btn cfm-sort-dialog-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>' : '<button class="cfm-btn cfm-sort-dialog-confirm"><i class="fa-solid fa-check"></i> 确认排序</button><button class="cfm-btn cfm-sort-dialog-cancel"><i class="fa-solid fa-xmark"></i> 取消</button>'}
        </div>
      </div>
    `);

    const sortList = dialog.find(".cfm-sort-dialog-list");
    let insertCancelHandler = null;

    // 关闭弹窗辅助
    function closeDialog() {
      overlay.remove();
      dialog.remove();
    }

    function getFolderName(script) {
      const groupId = globalGroups[script.id];
      return groupId && folderTree[groupId]
        ? folderTree[groupId].displayName || groupId
        : "未归类";
    }

    if (insertMode) {
      let selectedTargetIndex = null;
      const confirmBtn = dialog.find(".cfm-sort-dialog-insert-confirm");
      insertCancelHandler = async () => {
        try {
          if (typeof onCancelInsert === "function") {
            await onCancelInsert();
          }
          closeDialog();
        } catch (err) {
          console.error("[CFM] 取消新建全局正则失败:", err);
          cfmToastr.error("取消新建失败: " + (err?.message || err));
        }
      };

      function updateSelectedInsertSlot() {
        sortList.find(".cfm-sort-insert-slot").each(function () {
          const slot = $(this);
          const isSelected =
            Number(slot.attr("data-target-index")) === selectedTargetIndex;
          const lineEl = slot.find(".cfm-sort-insert-line");
          const btnEl = slot.find(".cfm-sort-insert-btn");
          btnEl.attr(
            "title",
            isSelected ? "已选中，点击确认插入" : "选择插入到此处",
          );
          btnEl.attr("aria-pressed", isSelected ? "true" : "false");
          btnEl.css({
            color: isSelected ? "#a6e3a1" : "#89b4fa",
            borderColor: isSelected
              ? "rgba(166, 227, 161, 0.5)"
              : "rgba(137, 180, 250, 0.35)",
            backgroundColor: isSelected
              ? "rgba(166, 227, 161, 0.14)"
              : "var(--SmartThemeBlurTintColor, #1e1e2e)",
            boxShadow: isSelected
              ? "0 0 0 3px rgba(166, 227, 161, 0.08)"
              : "none",
          });
          lineEl.css({
            background: isSelected
              ? "linear-gradient(90deg, rgba(166, 227, 161, 0.12) 0%, rgba(166, 227, 161, 0.55) 50%, rgba(166, 227, 161, 0.12) 100%)"
              : "linear-gradient(90deg, rgba(137, 180, 250, 0.08) 0%, rgba(137, 180, 250, 0.35) 50%, rgba(137, 180, 250, 0.08) 100%)",
          });
        });
        confirmBtn.prop("disabled", selectedTargetIndex === null);
      }

      const renderInsertSlot = (targetIndex) => {
        const slot = $(`
          <div class="cfm-sort-insert-slot" data-target-index="${targetIndex}">
            <div class="cfm-sort-insert-line"></div>
            <button class="cfm-sort-insert-btn" title="选择插入到此处"><i class="fa-solid fa-plus"></i></button>
          </div>
        `);
        slot.find(".cfm-sort-insert-btn").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectedTargetIndex = targetIndex;
          updateSelectedInsertSlot();
        });
        return slot;
      };

      sortList.append(renderInsertSlot(0));
      globalScripts.forEach((script, index) => {
        const row = $(`
          <div class="cfm-sort-row cfm-sort-row-static ${script.disabled ? "cfm-sort-row-disabled" : ""} ${script.id === newScriptId ? "cfm-sort-row-new" : ""}" data-script-id="${escapeHtml(script.id || "")}">
            <span class="cfm-sort-row-static-index">${index + 1}</span>
            <span class="cfm-sort-row-name">${escapeHtml(script.scriptName || "(未命名)")}</span>
            <span class="cfm-sort-row-folder">${escapeHtml(getFolderName(script))}</span>
            ${script.id === newScriptId ? '<span class="cfm-sort-row-badge cfm-sort-badge-new">新建</span>' : ""}
          </div>
        `);
        sortList.append(row).append(renderInsertSlot(index + 1));
      });

      updateSelectedInsertSlot();

      confirmBtn.on("click touchend", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedTargetIndex === null) {
          cfmToastr.warning("请先选择一个插入位置");
          return;
        }
        const newOrder = moveRegexScriptToIndex(
          newScriptId,
          selectedTargetIndex,
        );
        if (!newOrder) {
          cfmToastr.warning("未找到新建的正则脚本，无法调整位置");
          closeDialog();
          return;
        }
        await applyRegexGlobalOrder(newOrder, "新正则插入位置已保存");
        closeDialog();
      });

      dialog.find(".cfm-sort-dialog-skip").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderRegexView();
        cfmToastr.success("新正则已创建，顺序保持在最后");
        closeDialog();
      });

      dialog.find(".cfm-sort-dialog-cancel").on("click touchend", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await insertCancelHandler();
      });
    } else {
      // 填充脚本列表行
      for (const s of globalScripts) {
        const isDisabled = !!s.disabled;
        const row = $(`
          <div class="cfm-sort-row ${isDisabled ? "cfm-sort-row-disabled" : ""}" data-script-id="${escapeHtml(s.id || "")}">
            <span class="cfm-sort-handle" title="拖拽排序"><i class="fa-solid fa-grip-vertical"></i></span>
            <button class="cfm-sort-arrow-btn cfm-sort-arrow-up" title="上移"><i class="fa-solid fa-chevron-up"></i></button>
            <button class="cfm-sort-arrow-btn cfm-sort-arrow-down" title="下移"><i class="fa-solid fa-chevron-down"></i></button>
            <span class="cfm-sort-row-name">${escapeHtml(s.scriptName || "(未命名)")}</span>
            <span class="cfm-sort-row-folder">${escapeHtml(getFolderName(s))}</span>
          </div>
        `);
        // 上移按钮
        row.find(".cfm-sort-arrow-up").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const prev = row.prev(".cfm-sort-row");
          if (prev.length) {
            row.insertBefore(prev);
            updateArrowStates();
            flashDraggedElement(row);
          }
        });
        // 下移按钮
        row.find(".cfm-sort-arrow-down").on("click touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = row.next(".cfm-sort-row");
          if (next.length) {
            row.insertAfter(next);
            updateArrowStates();
            flashDraggedElement(row);
          }
        });
        sortList.append(row);
      }

      // 更新所有箭头按钮的禁用状态（首行上箭头 & 末行下箭头置灰不可点）
      function updateArrowStates() {
        const rows = sortList.find(".cfm-sort-row");
        rows.each(function (i) {
          const isFirst = i === 0;
          const isLast = i === rows.length - 1;
          $(this)
            .find(".cfm-sort-arrow-up")
            .prop("disabled", isFirst)
            .toggleClass("cfm-sort-arrow-disabled", isFirst);
          $(this)
            .find(".cfm-sort-arrow-down")
            .prop("disabled", isLast)
            .toggleClass("cfm-sort-arrow-disabled", isLast);
        });
      }

      // 初始化箭头状态
      updateArrowStates();

      // 启用拖拽
      if (cfmIsTouchDevice()) {
        sortList.find(".cfm-sort-handle").css("display", "none");
      }
      sortList.sortable({
        handle: ".cfm-sort-handle",
        disabled: cfmIsTouchDevice(),
        axis: "y",
        tolerance: "pointer",
        placeholder: "cfm-sort-placeholder",
        forcePlaceholderSize: true,
        stop: (_event, ui) => {
          updateArrowStates();
          flashDraggedElement(ui.item);
        },
      });
      if (!cfmIsTouchDevice()) sortList.disableSelection();

      // 确认排序
      dialog
        .find(".cfm-sort-dialog-confirm")
        .on("click touchend", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const newOrder = [];
          sortList.find(".cfm-sort-row[data-script-id]").each(function () {
            const id = $(this).attr("data-script-id");
            const script = globalScripts.find((s) => s.id === id);
            if (script) newOrder.push(script);
          });
          // 补充未在列表中出现的脚本（防御性）
          for (const s of globalScripts) {
            if (!newOrder.find((n) => n.id === s.id)) newOrder.push(s);
          }
          await applyRegexGlobalOrder(
            newOrder,
            `正则脚本顺序已保存（共 ${newOrder.length} 个）`,
          );
          closeDialog();
        });

      // 取消
      dialog.find(".cfm-sort-dialog-cancel").on("click touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      });
    }

    // 点击遮罩关闭
    overlay.on("click", async (e) => {
      if (!$(e.target).is(overlay)) return;
      if (insertMode && typeof insertCancelHandler === "function") {
        await insertCancelHandler();
        return;
      }
      closeDialog();
    });

    // 挂载到主弹窗容器内（确保 position:absolute 相对于 #cfm-popup 定位）
    $("#cfm-popup").append(overlay).append(dialog);
  }

  // ==================== 正则全局搜索 ====================
  let _regexSearchApi = null;
  function getRegexSearchApi() {
    if (!_regexSearchApi) {
      _regexSearchApi = createRegexSearchCore({
        $,
        applyGlobalRegexMultiActivation,
        buildRegexScriptRowHtml,
        ensureResourceSettings,
        escapeHtml,
        extensionName,
        extension_settings,
        fuzzyMatch,
        getRegexGlobalScripts,
        getResFavorites,
        getVisibleResourceIds,
        renderRegexView,
        selectAllVisible,
        toggleExportItem,
        toggleMultiSelectItem,
        toggleResDeleteItem,
        toggleResFavorite,
        state: {
          getSelectedRegexNode: () => selectedRegexNode,
          setSelectedRegexNode: (value) => {
            selectedRegexNode = value;
          },
          getRegexExpandedNodes: () => regexExpandedNodes,
          getCfmMultiSelectMode: () => cfmMultiSelectMode,
          getCfmMultiSelected: () => cfmMultiSelected,
          getCfmMultiSelectRangeMode: () => cfmMultiSelectRangeMode,
          setCfmMultiSelectRangeMode: (value) => {
            cfmMultiSelectRangeMode = value;
          },
          setCfmMultiSelectLastClicked: (value) => {
            cfmMultiSelectLastClicked = value;
          },
          getCfmResDeleteMode: () => cfmResDeleteMode,
          getCfmResDeleteSelected: () => cfmResDeleteSelected,
          getCfmExportMode: () => cfmExportMode,
          getCfmExportSelected: () => cfmExportSelected,
        },
      });
    }
    return _regexSearchApi;
  }
  function executeRegexSearch() {
    return getRegexSearchApi().executeRegexSearch();
  }

  async function renderRegexView() {
    return renderRegexViewCore({
      $,
      applyGlobalRegexMultiActivation,
      bindTouchSafeTap,
      buildRegexScriptRowHtml,
      cfmToastr,
      clearMultiSelect,
      ensureResourceSettings,
      escapeHtml,
      executeRegexSearch,
      extensionName,
      extension_settings,
      fetch: window.fetch.bind(window),
      getCharacters,
      getContext,
      getRegexGlobalScripts,
      getResFavorites,
      getVisibleResourceIds,
      handleFolderTargetMove,
      moveRegexFolder,
      pcDragEnd,
      pcDragStart,
      pcGetDropData,
      prependExportToolbar,
      prependResDeleteToolbar,
      prompt: window.prompt.bind(window),
      recordTouchTapStart,
      renderRegexView,
      selectAllVisible,
      shouldIgnoreTouchTapAfterMove,
      state: {
        get selectedRegexNode() {
          return selectedRegexNode;
        },
        set selectedRegexNode(value) {
          selectedRegexNode = value;
        },
        get regexExpandedNodes() {
          return regexExpandedNodes;
        },
        get regexAllNodeIds() {
          return regexAllNodeIds;
        },
        set regexAllNodeIds(value) {
          regexAllNodeIds = value;
        },
        get cfmResDeleteMode() {
          return cfmResDeleteMode;
        },
        get cfmResDeleteSelected() {
          return cfmResDeleteSelected;
        },
        get cfmExportMode() {
          return cfmExportMode;
        },
        get cfmExportSelected() {
          return cfmExportSelected;
        },
        get cfmMultiSelectMode() {
          return cfmMultiSelectMode;
        },
        get cfmMultiSelected() {
          return cfmMultiSelected;
        },
        get cfmMultiSelectRangeMode() {
          return cfmMultiSelectRangeMode;
        },
        set cfmMultiSelectRangeMode(value) {
          cfmMultiSelectRangeMode = value;
        },
        set cfmMultiSelectLastClicked(value) {
          cfmMultiSelectLastClicked = value;
        },
        get _pcDragData() {
          return _pcDragData;
        },
        get _pcLastResourceFolderHoverTarget() {
          return _pcLastResourceFolderHoverTarget;
        },
        set _pcLastResourceFolderHoverTarget(value) {
          _pcLastResourceFolderHoverTarget = value;
        },
        set _pcDropHandled(value) {
          _pcDropHandled = value;
        },
      },
      syncNativeRegexState,
      toggleExportItem,
      toggleMultiSelectItem,
      toggleResDeleteItem,
      toggleResFavorite,
      touchDragMgr,
    });
  }

  // ==================== 导入导出功能 ====================
  let _backupImportExportApi = null;
  function getBackupImportExportApi() {
    if (!_backupImportExportApi) {
      _backupImportExportApi = createBackupImportExportApi({
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
      });
    }
    return _backupImportExportApi;
  }
  function buildExportData(scope) {
    return getBackupImportExportApi().buildExportData(scope);
  }
  function executeExport(scope) {
    const data = buildExportData(scope);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const scopeLabel =
      scope === "all"
        ? "全部"
        : scope === "chars"
          ? "角色卡"
          : scope === "presets"
            ? "预设"
            : scope === "themes"
              ? "美化"
              : scope === "backgrounds"
                ? "背景"
                : scope === "personas"
                  ? "User"
                  : scope === "regex"
                    ? "正则"
                    : scope === "quickreply"
                      ? "QR"
                      : "世界书";
    a.download = `cfm-backup-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    cfmToastr.success(`已导出${scopeLabel}数据`);
  }

  // 单例 API（惰性初始化）
  let _backupImportApi = null;
  function getBackupImportApi() {
    if (!_backupImportApi) {
      _backupImportApi = createBackupImportApi({
        state,
        extensionName,
        extension_settings,
        getContext,
        getFolderTagIds,
        getFolderPath,
        getTagName,
        findOrCreateTag,
        saveConfig,
        getCharacters,
        moveCharToFolder,
        isFavorite,
        toggleFavorite,
        ensureResourceSettings,
        getResFolderTree,
        saveResTree,
        getCurrentPresets,
        getResFolderIds,
        setItemGroup,
        isResFavorite,
        toggleResFavorite,
        setPresetNote,
        getWorldInfoNames,
        setWorldInfoNote,
        getThemeNames,
        setThemeNote,
        setThemeBgBinding,
        getBackgroundNames,
        setBgNote,
        setBgOrientation,
        getCurrentPersonas,
        setPersonaNote,
        getRegexGlobalScripts,
        getResFavorites,
        getExistingQrSetNameSet,
        setQrNote,
      });
    }
    return _backupImportApi;
  }

  /** 执行备份导入：将备份 JSON 按名称匹配恢复文件夹、分组、收藏、备注、绑定与外观数据 */
  async function executeImport(jsonData) {
    return getBackupImportApi().executeImport(jsonData);
  }

  function showImportExportPopup() {
    return getBackupImportExportApi().showImportExportPopup();
  }
  // ==================== 原生界面文件夹过滤 ====================
  // 当前过滤状态
  let nativeFilterChar = null; // 角色卡当前过滤的文件夹tagId，null=不过滤
  let nativeFilterPreset = null; // 预设当前过滤的文件夹id
  let nativeFilterWorldInfo = null; // 世界书当前过滤的文件夹id
  let nativeFilterTheme = null; // 主题当前过滤的文件夹id
  let nativeFilterBg = null; // 背景当前过滤的文件夹id
  let nativeFilterGlobalWI = null; // 全局世界书当前过滤的文件夹id
  let nativeFilterPersona = null; // User当前过滤的文件夹id

  // 单例 API（惰性初始化）
  let _nativeFiltersApi = null;
  function getNativeFiltersApi() {
    if (!_nativeFiltersApi) {
      _nativeFiltersApi = createNativeFiltersApiCore({
        $,
        window,
        cfmToastr,
        entitiesFilterRef: () => entitiesFilter,
        printCharactersDebounced,
        personasFilterRef: () => personasFilter,
        getUserAvatarsFuncRef: () => getUserAvatarsFunc,
        getCharacters,
        getCharactersInFolder,
        getChildFolders,
        getContext,
        getCurrentPresetName,
        getCurrentPresets,
        getFolderTagIds,
        getPersonaNote,
        getResChildFolders,
        getResFolderDisplayName,
        getResFolderIds,
        getResFolderTree,
        getResTopLevelFolders,
        getResourceGroups,
        getTagName,
        getThemeNames,
        getBackgroundNames,
        getTopLevelFolders,
        getUncategorizedCharacters,
        collectWorldInfoNamesFromDom,
        countCharsInFolderRecursive,
        escapeHtml,
        sortFolders,
        sortResFolders,
        showPresetDetailGroupPanel,
        showWiPresetPanel,
        setTimeoutFn: window.setTimeout.bind(window),
        state: {
          get nativeFilterChar() {
            return nativeFilterChar;
          },
          set nativeFilterChar(v) {
            nativeFilterChar = v;
          },
          get nativeFilterPreset() {
            return nativeFilterPreset;
          },
          set nativeFilterPreset(v) {
            nativeFilterPreset = v;
          },
          get nativeFilterWorldInfo() {
            return nativeFilterWorldInfo;
          },
          set nativeFilterWorldInfo(v) {
            nativeFilterWorldInfo = v;
          },
          get nativeFilterTheme() {
            return nativeFilterTheme;
          },
          set nativeFilterTheme(v) {
            nativeFilterTheme = v;
          },
          get nativeFilterBg() {
            return nativeFilterBg;
          },
          set nativeFilterBg(v) {
            nativeFilterBg = v;
          },
          get nativeFilterGlobalWI() {
            return nativeFilterGlobalWI;
          },
          set nativeFilterGlobalWI(v) {
            nativeFilterGlobalWI = v;
          },
          get nativeFilterPersona() {
            return nativeFilterPersona;
          },
          set nativeFilterPersona(v) {
            nativeFilterPersona = v;
          },
          get _presetDetachedOptions() {
            return _presetDetachedOptions;
          },
          set _presetDetachedOptions(v) {
            _presetDetachedOptions = v;
          },
          get _worldInfoDetachedOptions() {
            return _worldInfoDetachedOptions;
          },
          set _worldInfoDetachedOptions(v) {
            _worldInfoDetachedOptions = v;
          },
          get _themeDetachedOptions() {
            return _themeDetachedOptions;
          },
          set _themeDetachedOptions(v) {
            _themeDetachedOptions = v;
          },
          get _bgDetachedElements() {
            return _bgDetachedElements;
          },
          set _bgDetachedElements(v) {
            _bgDetachedElements = v;
          },
          get _globalWIDetachedOptions() {
            return _globalWIDetachedOptions;
          },
          set _globalWIDetachedOptions(v) {
            _globalWIDetachedOptions = v;
          },
          get _selectOriginalOrder() {
            return _selectOriginalOrder;
          },
          get cfmNativePresetGroupButtonObserver() {
            return cfmNativePresetGroupButtonObserver;
          },
          set cfmNativePresetGroupButtonObserver(v) {
            cfmNativePresetGroupButtonObserver = v;
          },
          get cfmNativePresetGroupButtonBootObserver() {
            return cfmNativePresetGroupButtonBootObserver;
          },
          set cfmNativePresetGroupButtonBootObserver(v) {
            cfmNativePresetGroupButtonBootObserver = v;
          },
        },
      });
    }
    return _nativeFiltersApi;
  }

  function buildNativeFolderTreeHtml(
    type,
    parentId,
    depth,
    expandedSet,
    activeId,
  ) {
    return getNativeFiltersApi().buildNativeFolderTreeHtml(
      type,
      parentId,
      depth,
      expandedSet,
      activeId,
    );
  }

  function showPresetEditFolderFilterPanel(anchorEl, config) {
    return getNativeFiltersApi().showPresetEditFolderFilterPanel(
      anchorEl,
      config,
    );
  }

  function showNativeFolderPanel(anchorEl, type) {
    return getNativeFiltersApi().showNativeFolderPanel(anchorEl, type);
  }

  function getAllItemsInFolderRecursive(type, folderId) {
    return getNativeFiltersApi().getAllItemsInFolderRecursive(type, folderId);
  }

  function applyNativeFilter(type) {
    return getNativeFiltersApi().applyNativeFilter(type);
  }

  function applyCharFilter() {
    return getNativeFiltersApi().applyCharFilter();
  }

  function applyPersonaFilter() {
    return getNativeFiltersApi().applyPersonaFilter();
  }

  // 缓存被 detach 的 option，用于恢复
  let _presetDetachedOptions = [];
  let _worldInfoDetachedOptions = [];
  let _themeDetachedOptions = [];
  let _bgDetachedElements = [];
  let _globalWIDetachedOptions = [];

  // 缓存 select 原始 option 顺序（value 列表），用于恢复时保持原生排序
  const _selectOriginalOrder = new Map();

  function applyPresetFilter() {
    return getNativeFiltersApi().applyPresetFilter();
  }

  function applyWorldInfoFilter() {
    return getNativeFiltersApi().applyWorldInfoFilter();
  }

  function clearWorldInfoNativeFilter() {
    return getNativeFiltersApi().clearWorldInfoNativeFilter();
  }

  function setupWorldInfoButtonAutoShowAll() {
    return getNativeFiltersApi().setupWorldInfoButtonAutoShowAll();
  }

  function applyThemeFilter() {
    return getNativeFiltersApi().applyThemeFilter();
  }

  function applyBgFilter() {
    return getNativeFiltersApi().applyBgFilter();
  }

  function updateNativeFilterBtnState(type) {
    return getNativeFiltersApi().updateNativeFilterBtnState(type);
  }

  let cfmNativePresetGroupButtonObserver = null;
  let cfmNativePresetGroupButtonBootObserver = null;

  function injectNativePresetGroupButton() {
    return getNativeFiltersApi().injectNativePresetGroupButton();
  }

  function setupNativePresetGroupButtonObserver() {
    return getNativeFiltersApi().setupNativePresetGroupButtonObserver();
  }

  function injectNativeFilterButtons() {
    return getNativeFiltersApi().injectNativeFilterButtons();
  }

  function applyGlobalWorldInfoFilter() {
    return getNativeFiltersApi().applyGlobalWorldInfoFilter();
  }

  function setupPersonaSelectionPopupEnhancer() {
    return getNativeFiltersApi().setupPersonaSelectionPopupEnhancer();
  }

  function enhancePersonaPopupList(listEl) {
    return getNativeFiltersApi().enhancePersonaPopupList(listEl);
  }

  function setupCharWorldPopupFilterObserver() {
    return getNativeFiltersApi().setupCharWorldPopupFilterObserver();
  }

  function injectCharWorldFilterBtn(selectEl, kind) {
    return getNativeFiltersApi().injectCharWorldFilterBtn(selectEl, kind);
  }

  function applyCharWorldSelectFilter(selectEl, folderId, kind) {
    return getNativeFiltersApi().applyCharWorldSelectFilter(
      selectEl,
      folderId,
      kind,
    );
  }

  // ==================== 初始化 ====================
  autoImportAllTags(); // 首次加载自动导入所有标签
  config = loadConfig(); // 刷新配置（autoImport可能改了settings）
  autoCleanRedundantTags(); // 自动清理多余的路径标签
  initButton();
  injectNativeFilterButtons();
  setupNativePresetGroupButtonObserver();
  setupWorldInfoButtonAutoShowAll();
  setupMobileTouchTapGuard();
  setupCharWorldPopupFilterObserver();
  setupPersonaSelectionPopupEnhancer();
  initPinnedChatHook(); // 初始化聊天置顶 welcome-screen hook
  initChatNotes(); // 初始化聊天记录备注数据
  setupNativeChatPopupEnhancer(); // 增强原生聊天管理弹窗显示备注
  initRecentChatNotesHook(); // 增强 welcome-screen 最近聊天显示备注

  // 监听角色卡列表重新渲染事件，自动重新应用过滤
  const eventSource = getContext().eventSource;
  const event_types = getContext().eventTypes;
  setTimeout(() => {
    sanitizeCurrentOpenAIPresetRuntimeState(true);
  }, 0);

  if (eventSource && event_types) {
    // 角色卡列表翻页/重新渲染后重新应用过滤（仅回退方案需要）
    // 当 entitiesFilter 可用时，过滤在数据层（分页前）完成，无需 DOM 级重新过滤
    eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
      if (nativeFilterChar && !entitiesFilter) {
        // 仅在回退方案（DOM级过滤）下，延迟一帧确保DOM已更新后重新应用
        requestAnimationFrame(() => applyCharFilter());
      }
    });
    // 角色卡重命名后，自动更新所有 persona connections 中的旧 avatar ID
    // 酒馆原生代码未处理此同步，这里补上
    if (event_types.CHARACTER_RENAMED) {
      eventSource.on(event_types.CHARACTER_RENAMED, (oldAvatar, newAvatar) => {
        try {
          if (!oldAvatar || !newAvatar || oldAvatar === newAvatar) return;
          const pu = getContext().powerUserSettings;
          if (!pu || !pu.persona_descriptions) return;
          let changed = false;
          for (const [pid, desc] of Object.entries(pu.persona_descriptions)) {
            if (!desc || !desc.connections || !desc.connections.length)
              continue;
            for (const conn of desc.connections) {
              if (conn && conn.type === "character" && conn.id === oldAvatar) {
                conn.id = newAvatar;
                changed = true;
              }
            }
          }
          if (changed) {
            getContext().saveSettingsDebounced();
            console.log(
              `[CFM] 已更新 persona connections: ${oldAvatar} → ${newAvatar}`,
            );
          }
          // 同步世界书激活分组中绑定的角色卡 avatar
          const wiPresets = getWiActivePresets();
          let wiChanged = false;
          for (const wp of wiPresets) {
            if (Array.isArray(wp.bindChars)) {
              const idx = wp.bindChars.indexOf(oldAvatar);
              if (idx !== -1) {
                wp.bindChars[idx] = newAvatar;
                wiChanged = true;
              }
            }
          }
          if (wiChanged) {
            getContext().saveSettingsDebounced();
            console.log(
              `[CFM] 已更新世界书分组绑定角色: ${oldAvatar} → ${newAvatar}`,
            );
          }
        } catch (e) {
          console.warn("[CFM] CHARACTER_RENAMED handler error:", e);
        }
      });
    }

    let autoApplyWiTimer = null;
    let autoApplyQrTimer = null;
    let autoApplyRegexTimer = null;
    const scheduleAutoApplyBoundGroups = () => {
      if (autoApplyWiTimer) clearTimeout(autoApplyWiTimer);
      if (autoApplyQrTimer) clearTimeout(autoApplyQrTimer);
      if (autoApplyRegexTimer) clearTimeout(autoApplyRegexTimer);
      autoApplyWiTimer = setTimeout(() => {
        autoApplyWiTimer = null;
        autoApplyWiPresets();
      }, 300);
      autoApplyQrTimer = setTimeout(() => {
        autoApplyQrTimer = null;
        autoApplyQrPresets();
      }, 350);
      autoApplyRegexTimer = setTimeout(() => {
        autoApplyRegexTimer = null;
        autoApplyRegexPresets();
      }, 400);
    };

    // 角色/聊天切换时自动应用/关闭世界书分组和快速回复分组
    if (event_types.CHAT_CHANGED) {
      eventSource.on(event_types.CHAT_CHANGED, () => {
        // 延迟执行，确保角色信息已更新
        scheduleAutoApplyBoundGroups();
        scheduleWelcomeRecentChatRefresh();
        // 角色/聊天切换时，同步聊天记录页到当前角色
        setTimeout(() => {
          const newAvatar = getCurrentCharAvatar();
          if (newAvatar && newAvatar !== cfmChatlogTargetAvatar) {
            cfmChatlogTargetAvatar = newAvatar;
            selectedChatlogFolder = null;
            chatlogExpandedNodes.clear();
            // 如果弹窗已打开且当前在聊天记录页，则刷新视图
            if ($("#cfm-popup").length && currentResourceType === "chatlogs") {
              renderChatlogsView();
            }
          }
        }, 300);
      });
    }
    // 预设切换时自动应用/关闭世界书分组和快速回复分组
    if (event_types.OAI_PRESET_CHANGED_AFTER) {
      eventSource.on(event_types.OAI_PRESET_CHANGED_AFTER, () => {
        sanitizeCurrentOpenAIPresetRuntimeState(true);
        scheduleAutoApplyBoundGroups();
      });
    }
    if (event_types.PRESET_CHANGED) {
      eventSource.on(event_types.PRESET_CHANGED, () => {
        sanitizeCurrentOpenAIPresetRuntimeState(true);
        scheduleAutoApplyBoundGroups();
      });
    }
  }

  // 监听酒馆原生 #world_info select 的 change 事件，同步世界书分组按钮状态
  let _nativeWiChangeTimer = null;
  $(document).on("change", "#world_info", () => {
    if (_nativeWiChangeTimer) clearTimeout(_nativeWiChangeTimer);
    _nativeWiChangeTimer = setTimeout(() => {
      _nativeWiChangeTimer = null;
      refreshAllWiPresetTrackingState();
    }, 200);
  });

  publishBackupBridgeSignal("ready", {
    displayName: "酒馆资源管理器",
    bridgeVersion: "0.1.0",
    capabilities: [
      "handshake",
      "chars",
      "worldinfo",
      "presets",
      "themes",
      "backgrounds",
      "personas",
      "regex",
      "qr",
    ],
  });

  console.log(`[${extensionName}] 酒馆资源管理器已加载`);
});
