/**
 * macOS context menu implementation
 * Uses CustomPopover for long-press menu
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import CustomPopover from "./CustomPopover";
import type { ContextMenuViewProps, MenuActionConfig, MenuElementConfig } from "./types";

export const ContextMenuView: React.FC<ContextMenuViewProps> = (props) => {
	const [menuItems, setMenuItems] = useState<MenuActionConfig[]>([]);

	useEffect(() => {
		// Convert menu config to flat list of items
		const items = flattenMenuItems(props.menuConfig?.menuItems ?? []);
		setMenuItems(items);
	}, [props.menuConfig]);

	const handleItemPress = async (actionKey: string, actionTitle: string) => {
		props.onMenuWillShow?.();
		await props.onPressMenuItem({ nativeEvent: { actionKey, actionTitle } });
	};

	// Filter out hidden items
	const visibleItems = menuItems.map((item) => ({ ...item, isVisible: !item.menuAttributes?.includes("hidden") }));

	return (
		<CustomPopover menuItems={visibleItems} onItemPress={handleItemPress}>
			<View style={{ flex: 1 }}>{props.children}</View>
		</CustomPopover>
	);
};

// Helper to flatten nested menu items into action-only items
function flattenMenuItems(items: MenuElementConfig[]): MenuActionConfig[] {
	const result: MenuActionConfig[] = [];

	const process = (menu_items: MenuElementConfig[]) => {
		menu_items.forEach((item) => {
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

export { ContextMenuButton } from "./ContextMenuButton";
export type * from "./types";
