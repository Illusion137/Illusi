/**
 * Custom hook for responsive window dimensions
 * Replaces module-level Dimensions.get() calls which don't respond to window resize on desktop
 */

import { useWindowDimensions } from "react-native";

interface Dimensions {
	width: number;
	height: number;
}

/**
 * Hook that provides reactive window dimensions
 * Updates when the window resizes (important for desktop platforms)
 * @returns Object with current window width and height
 */
export function useDimensions(): Dimensions {
	const dimensions = useWindowDimensions();
	return {
		width: dimensions.width,
		height: dimensions.height,
	};
}

export default useDimensions;
