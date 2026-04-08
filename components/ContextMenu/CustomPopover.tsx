/**
 * Custom popover implementation for desktop platforms (macOS, Windows, Android)
 * Shows a menu on long-press with keyboard-accessible items
 */

import React, { useRef, useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MenuElementConfig, MenuAttribute } from "./types";

interface MenuItem extends MenuElementConfig {
	isVisible: boolean;
}

interface CustomPopoverProps {
	menuItems: MenuItem[];
	onItemPress: (actionKey: string) => void | Promise<void>;
	children: React.ReactNode;
}

const CustomPopover: React.FC<CustomPopoverProps> = ({ menuItems, onItemPress, children }) => {
	const [visible, setVisible] = useState(false);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const viewRef = useRef<View>(null);

	const handleLongPress = () => {
		viewRef.current?.measure((fx, fy, width, height, px, py) => {
			setPosition({ top: py + height, left: px });
			setVisible(true);
		});
	};

	const handleMenuItemPress = async (actionKey: string) => {
		setVisible(false);
		try {
			await onItemPress(actionKey);
		} catch (e) {
			console.error("Error in context menu action:", e);
		}
	};

	const visibleItems = menuItems.filter((item) => item.isVisible);

	const isDestructive = (attributes?: MenuAttribute[]) => attributes?.includes("destructive");

	const renderMenuItem = ({ item }: { item: MenuItem }) => (
		<TouchableOpacity style={[styles.menuItem, isDestructive(item.menuAttributes) && styles.destructiveItem]} onPress={() => handleMenuItemPress(item.actionKey)}>
			{item.icon && <MaterialCommunityIcons name={typeof item.icon === "string" ? item.icon : "circle"} size={18} color={isDestructive(item.menuAttributes) ? "#FF3B30" : "#007AFF"} style={styles.menuIcon} />}
			<Text style={[styles.menuItemText, isDestructive(item.menuAttributes) && styles.destructiveText]}>{item.actionTitle}</Text>
		</TouchableOpacity>
	);

	return (
		<>
			<View ref={viewRef} onLongPress={handleLongPress} delayLongPress={500} style={{ flex: 1 }}>
				{children}
			</View>

			<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
				<TouchableOpacity style={styles.backdrop} onPress={() => setVisible(false)} activeOpacity={1}>
					<View style={[styles.popoverContainer, { top: position.top, left: position.left }]}>
						<FlatList data={visibleItems} renderItem={renderMenuItem} keyExtractor={(item) => item.actionKey} scrollEnabled={visibleItems.length > 5} nestedScrollEnabled style={styles.menuList} />
					</View>
				</TouchableOpacity>
			</Modal>
		</>
	);
};

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" },
	popoverContainer: {
		position: "absolute",
		backgroundColor: "#fff",
		borderRadius: 8,
		elevation: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		minWidth: 200,
		maxWidth: 300,
		maxHeight: 400,
		overflow: "hidden"
	},
	menuList: { flexGrow: 0 },
	menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
	menuIcon: { marginRight: 12 },
	menuItemText: { fontSize: 14, color: "#000", flex: 1 },
	destructiveItem: { backgroundColor: "#fff5f5" },
	destructiveText: { color: "#FF3B30", fontWeight: "600" }
});

export default CustomPopover;
