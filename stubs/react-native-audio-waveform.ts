/**
 * Desktop stub for @simform_solutions/react-native-audio-waveform
 * Provides a no-op implementation for desktop builds
 */

import React from "react";
import { View } from "react-native";

export const AudioWaveform = (props: any) => {
	return React.createElement(View, {
		style: [{ backgroundColor: "#e0e0e0", borderRadius: 8 }, props.style]
	}, null);
};

export default AudioWaveform;
