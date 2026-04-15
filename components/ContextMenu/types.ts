/**
 * Type definitions for cross-platform context menu
 * Mirrors the react-native-ios-context-menu API for compatibility
 */

import type { IconConfig, ImageItemConfig, MenuElementSize, UIMenuOptions } from "react-native-ios-context-menu";

export type MenuAttribute = "destructive" | "hidden" | "disabled";

export interface MenuActionConfig {
	actionKey: string;
	actionTitle: string;
	actionSubtitle?: string;
	icon?: IconConfig | ImageItemConfig;
	menuAttributes?: MenuAttribute[];
}

export interface MenuConfig {
	type?: "menu";

	menuTitle: string;
	menuSubtitle?: string;

	menuOptions?: UIMenuOptions[];
	menuItems?: MenuElementConfig[];
	menuPreferredElementSize?: MenuElementSize;

	icon?: IconConfig | ImageItemConfig;
}

/** A menu element is either an action or a nested sub-menu */
export type MenuElementConfig = MenuActionConfig | MenuConfig;

export interface ContextMenuNativeEvent {
	nativeEvent: { actionKey: string; actionTitle: string };
}

export interface ContextMenuViewProps {
	menuConfig?: MenuConfig;
	onPressMenuItem: (event: ContextMenuNativeEvent) => void | Promise<void>;
	onMenuWillShow?: () => void;
	isContextMenuEnabled?: boolean;
	previewConfig?: any;
	shouldEnableAggressiveCleanup?: boolean;
	shouldCleanupOnComponentWillUnmountForMenuPreview?: boolean;
	shouldCleanupOnComponentWillUnmountForAuxPreview?: boolean;
	children: React.ReactNode;
}

export type OnPressMenuItemEvent = (event: ContextMenuNativeEvent) => void | Promise<void>;
