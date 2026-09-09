// 插件核心常量层：承接 extensionName、扩展路径、全局固定配置键、运行时事件名与跨模块共享常量；不承接可变运行时状态。

/** 插件扩展名（SillyTavern 扩展目录名 / extension_settings 命名空间） */
export const extensionName = "ST-Char-Folder-Manager";

/** 插件在 SillyTavern 中的相对 URL 路径 */
export const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

/** 悬浮按钮位置持久化存储键 */
export const STORAGE_KEY_BTN_POS = "cfm-button-pos";

/** 角色文件夹配置持久化存储键（legacy 旧版） */
export const STORAGE_KEY = "cfm-folder-config";

/** 备份桥接协议版本 */
export const BACKUP_BRIDGE_PROTOCOL_VERSION = 1;

/** 备份桥接版本 */
export const BACKUP_BRIDGE_VERSION = "0.3.0";

/** 备份同步进度遮罩 HTTP 轮询地址（本地备份桥服务） */
export const CFM_SYNC_STATE_URL = "http://127.0.0.1:36925";

/** 备份同步进度轮询间隔（毫秒） */
export const CFM_SYNC_POLL_INTERVAL_MS = 800;
