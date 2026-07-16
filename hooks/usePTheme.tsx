import { reinterpret_cast } from "@common/cast";
import type { Prefs } from "@illusive/prefs";
import { useTheme } from "expo-router/react-navigation";

export default function usePTheme() {
	return reinterpret_cast<Prefs.Theme>(useTheme());
}
