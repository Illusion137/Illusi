import { Entypo, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import usePTheme from "@hooks/usePTheme";
import { run_explore_tab_press_callback } from "@utils/tabpress";

interface ScreenColor {
	color: string;
}

export default function TabLayout() {
	const theme = usePTheme();
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: { height: 80, backgroundColor: theme.colors.background },
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: theme.colors.tabInactive,
				tabBarActiveBackgroundColor: theme.colors.background,
				tabBarInactiveBackgroundColor: theme.colors.background
			}}>
			<Tabs.Screen name="index" options={{ href: null }} />
			<Tabs.Screen name="library" options={{ title: "My Library", tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="library-sharp" size={30} color={color} />, freezeOnBlur: true }} />
			<Tabs.Screen name="playlists" options={{ title: "Playlists", tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="musical-notes" size={25} color={color} />, freezeOnBlur: true }} />
			<Tabs.Screen name="audiobooks" options={{ title: "Audiobooks", tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="book" size={25} color={color} />, freezeOnBlur: true }} />
			<Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: ({ color }: ScreenColor) => <Ionicons name="search" size={25} color={color} />, freezeOnBlur: true }} listeners={{ tabPress: run_explore_tab_press_callback }} />
			<Tabs.Screen name="extras" options={{ title: "Extras", tabBarIcon: ({ color }: ScreenColor) => <Entypo name="dots-three-horizontal" size={25} color={color} />, freezeOnBlur: true }} />
		</Tabs>
	);
}
