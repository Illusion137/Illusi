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
import type { ContextMenuViewProps, MenuElementConfig } from "./types";

export type { ContextMenuViewProps, MenuElementConfig, MenuConfig, OnPressMenuItemEvent } from "./types";
export { ContextMenuButton } from "./ContextMenuButton";

export const ContextMenuView: React.FC<ContextMenuViewProps> = (props) => {
	const [menuItems, setMenuItems] = useState<MenuElementConfig[]>([]);

	useEffect(() => {
		const items = flattenMenuItems(props.menuConfig.menuItems);
		setMenuItems(items);
	}, [props.menuConfig]);

	const handleItemPress = async (actionKey: string) => {
		props.onMenuWillShow?.();
		await props.onPressMenuItem({ nativeEvent: { actionKey } });
	};

	const visibleItems = menuItems.map((item) => ({ ...item, isVisible: !item.menuAttributes?.includes("hidden") }));

	return (
		<CustomPopover menuItems={visibleItems} onItemPress={handleItemPress}>
			<View style={{ flex: 1 }}>{props.children}</View>
		</CustomPopover>
	);
};

function flattenMenuItems(items: any[]): MenuElementConfig[] {
	const result: MenuElementConfig[] = [];
	const process = (p_items: any[]) => {
		p_items.forEach((item) => {
			if (item.actionKey) {
				result.push(item);
			}
			if (item.menuItems && Array.isArray(item.menuItems)) {
				process(item.menuItems);
			}
		});
	};
	process(items);
	return result;
}
