/**
 * Type definitions for cross-platform context menu
 * Mirrors the react-native-ios-context-menu API for compatibility
 */

export type MenuAttribute = "destructive" | "hidden" | "disabled";

export interface MenuElementConfig {
	actionKey: string;
	actionTitle: string;
	icon?: any;
	menuAttributes?: MenuAttribute[];
}

export interface MenuConfig {
	menuTitle?: string;
	menuItems: MenuElementConfig[];
	icon?: any;
	menuOptions?: any[];
}

export interface ContextMenuViewProps {
	menuConfig: MenuConfig;
	onPressMenuItem: (event: { nativeEvent: { actionKey: string } }) => void | Promise<void>;
	onMenuWillShow?: () => void;
	previewConfig?: any;
	shouldEnableAggressiveCleanup?: boolean;
	shouldCleanupOnComponentWillUnmountForMenuPreview?: boolean;
	shouldCleanupOnComponentWillUnmountForAuxPreview?: boolean;
	children: React.ReactNode;
}

export type OnPressMenuItemEvent = (event: { nativeEvent: { actionKey: string } }) => void | Promise<void>;
