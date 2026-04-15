/**
 * Cross-platform context menu component - Default implementation (non-iOS)
 *
 * Metro bundler resolves platform-specific files:
 * - index.ios.tsx: uses react-native-ios-context-menu native component
 * - index.tsx (this file): fallback for other platforms using CustomPopover
 *
 * Platform-specific variants:
 * - index.macos.tsx: explicitly uses CustomPopover
 * - index.windows.tsx: explicitly uses CustomPopover
 * - index.android.tsx: explicitly uses CustomPopover
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import CustomPopover from "./CustomPopover";
import type { ContextMenuViewProps, MenuActionConfig, MenuElementConfig } from "./types";

export type { ContextMenuViewProps, MenuElementConfig, MenuConfig, OnPressMenuItemEvent } from "./types";
export { ContextMenuButton } from "./ContextMenuButton";

export const ContextMenuView: React.FC<ContextMenuViewProps> = (props) => {
	const [menuItems, setMenuItems] = useState<MenuActionConfig[]>([]);

	useEffect(() => {
		const items = flattenMenuItems(props.menuConfig?.menuItems ?? []);
		setMenuItems(items);
	}, [props.menuConfig]);

	const handleItemPress = async (actionKey: string, actionTitle: string) => {
		props.onMenuWillShow?.();
		await props.onPressMenuItem({ nativeEvent: { actionKey, actionTitle } });
	};

	const visibleItems = menuItems.map((item) => ({ ...item, isVisible: !item.menuAttributes?.includes("hidden") }));

	return (
		<CustomPopover menuItems={visibleItems} onItemPress={handleItemPress}>
			<View style={{ flex: 1 }}>{props.children}</View>
		</CustomPopover>
	);
};

function flattenMenuItems(items: MenuElementConfig[]): MenuActionConfig[] {
	const result: MenuActionConfig[] = [];
	const process = (p_items: MenuElementConfig[]) => {
		p_items.forEach((item) => {
			if ("actionKey" in item) {
				result.push(item);
			}
			if ("menuItems" in item && Array.isArray(item.menuItems)) {
				process(item.menuItems);
			}
		});
	};
	process(items);
	return result;
}
