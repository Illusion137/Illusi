import { reinterpret_cast } from "@common/cast";
import React, { useMemo } from "react";
import type { ViewProps } from "react-native";
import ExternalDisplayView, { useExternalDisplay } from "react-native-external-display";
import ExternalDisplayContent from "./ExternalDisplayContent";

interface ExternalDisplayProps extends ViewProps {
	screen?: string;
	mainScreenStyle?: ViewProps["style"];
	fallbackInMainScreen?: boolean;
	children?: React.ReactNode;
}

// The package ships Flow-typed JS with a loose default-export declaration, so we
// re-type it to the props we actually drive.
const ExternalDisplay = reinterpret_cast<React.ComponentType<ExternalDisplayProps>>(ExternalDisplayView);

export default function ExternalDisplayHost() {
	const screens = useExternalDisplay();

	const screen_id = useMemo(() => {
		const ids = Object.keys(screens);
		// Prefer a genuine extended display over an AirPlay mirror, but fall back to
		// whatever is connected so mirrored screens still get our custom content.
		return ids.find((id) => !screens[id].mirrored) ?? ids[0];
	}, [screens]);

	if (!screen_id) return null;
	const screen = screens[screen_id];

	return (
		<ExternalDisplay screen={screen_id}>
			<ExternalDisplayContent width={screen.width} height={screen.height} />
		</ExternalDisplay>
	);
}
