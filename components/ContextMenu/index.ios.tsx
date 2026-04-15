/**
 * iOS context menu implementation
 * Uses the native react-native-ios-context-menu
 */

import React from "react";
import { ContextMenuView as NativeContextMenuView } from "react-native-ios-context-menu";
import type { ContextMenuViewProps } from "./types";

export const ContextMenuView: React.FC<ContextMenuViewProps> = (props) => {
	return (
		<NativeContextMenuView
			shouldEnableAggressiveCleanup={props.shouldEnableAggressiveCleanup}
			shouldCleanupOnComponentWillUnmountForMenuPreview={props.shouldCleanupOnComponentWillUnmountForMenuPreview}
			shouldCleanupOnComponentWillUnmountForAuxPreview={props.shouldCleanupOnComponentWillUnmountForAuxPreview}
			isContextMenuEnabled={props.isContextMenuEnabled}
			previewConfig={props.previewConfig}
			menuConfig={props.menuConfig as any}
			onMenuWillShow={props.onMenuWillShow}
			onPressMenuItem={props.onPressMenuItem as any}>
			{props.children}
		</NativeContextMenuView>
	);
};

export { ContextMenuButton } from "react-native-ios-context-menu";
export type * from "./types";
