/**
 * Android context menu implementation
 * Uses CustomPopover for long-press menu
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import CustomPopover from "./CustomPopover";
import type { ContextMenuViewProps, MenuElementConfig } from "./types";

export const ContextMenuView: React.FC<ContextMenuViewProps> = (props) => {
	const [menuItems, setMenuItems] = useState<MenuElementConfig[]>([]);

	useEffect(() => {
		// Convert menu config to flat list of items
		const items = flattenMenuItems(props.menuConfig.menuItems);
		setMenuItems(items);
	}, [props.menuConfig]);

	const handleItemPress = async (actionKey: string) => {
		props.onMenuWillShow?.();
		await props.onPressMenuItem({ nativeEvent: { actionKey } });
	};

	// Filter out hidden items
	const visibleItems = menuItems.map((item) => ({ ...item, isVisible: !item.menuAttributes?.includes("hidden") }));

	return (
		<CustomPopover menuItems={visibleItems} onItemPress={handleItemPress}>
			<View style={{ flex: 1 }}>{props.children}</View>
		</CustomPopover>
	);
};

// Helper to flatten nested menu items
function flattenMenuItems(items: any[]): MenuElementConfig[] {
	const result: MenuElementConfig[] = [];

	const process = (items: any[]) => {
		items.forEach((item) => {
			if (item.actionKey) {
				result.push(item);
			}
			// If item has submenu items, flatten them
			if (item.menuItems && Array.isArray(item.menuItems)) {
				process(item.menuItems);
			}
		});
	};

	process(items);
	return result;
}

export { ContextMenuButton } from "./ContextMenuButton";
export * from "./types";
