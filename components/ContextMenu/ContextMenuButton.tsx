/**
 * Stub ContextMenuButton for non-iOS platforms
 * On iOS, the real ContextMenuButton from react-native-ios-context-menu is used
 */

import React from "react";
import { TouchableOpacity } from "react-native";
import type { ContextMenuViewProps } from "./types";

export const ContextMenuButton: React.FC<ContextMenuViewProps> = (props) => {
	return <TouchableOpacity {...props}>{props.children}</TouchableOpacity>;
};
