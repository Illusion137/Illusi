import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { LinkerLink } from "@illusive/types";
import { Illusive } from "@illusive/illusive";
import { music_service_uri_to_music_service, split_uri } from "@illusive/illusive_utils";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";
import { Ionicons } from "@expo/vector-icons";
import { ContextMenuView, type MenuConfig, type OnPressMenuItemEvent } from "react-native-ios-context-menu";
import { resolve_icon } from "@utils/context_menu";
import { Prefs } from "@illusive/prefs";
import { router } from "expo-router";

const menu_config: MenuConfig = {
	menuTitle: "",
	menuItems: [
		{
			actionKey: "link-edit",
			actionTitle: "Edit",
			icon: resolve_icon("pencil")
		},
		{
			actionKey: "link-delete",
			actionTitle: "Delete",
			menuAttributes: ["destructive"],
			icon: resolve_icon("trash")
		}
	]
};

export default function Link(props: { linker_link: LinkerLink; on_delete?: () => any }) {
	const { colors } = usePTheme();

	const illusi_service = Illusive.music_service.get("Illusi")!;
	const other_service_type = music_service_uri_to_music_service(split_uri(props.linker_link.service_uri)[0]);
	const other_service = Illusive.music_service.get(other_service_type)!;
	const is_outgoing = props.linker_link.type === "OUTGOING";
	const playlist_id = split_uri(props.linker_link.service_uri)[1] ?? props.linker_link.service_uri;

	const on_press_menu_item: OnPressMenuItemEvent = async (item) => {
		const action_key = item.nativeEvent.actionKey;
		switch (action_key) {
			case "link-edit": {
				router.push({
					pathname: "/extras/link",
					params: { linker_uuid: props.linker_link.link_uuid }
				});
				break;
			}
			case "link-delete": {
				const link_index = Prefs.get_pref("linker_links").findIndex((link) => link.link_uuid === props.linker_link.link_uuid);
				if (link_index === -1) return;
				Prefs.prefs.linker_links.current_value.splice(link_index, 1);
				await Prefs.save_pref("linker_links", Prefs.prefs.linker_links.current_value);
				props.on_delete?.();
				break;
			}
		}
	};

	return (
		<>
			<ContextMenuView menuConfig={menu_config} onPressMenuItem={on_press_menu_item}>
				<View style={{ backgroundColor: colors.track, width: "100%", paddingHorizontal: 15, paddingVertical: 12 }}>
					<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
						<IImage source={illusi_service.app_icon} style={{ width: 36, height: 36, borderRadius: 8 }} />
						<View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginHorizontal: 10 }}>
							<View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
							<View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.shelf, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4 }}>
								<Ionicons name={is_outgoing ? "arrow-forward" : "arrow-back"} size={12} color={colors.primary} />
								<Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{props.linker_link.type}</Text>
							</View>
							<View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
						</View>
						<IImage source={other_service.app_icon} style={{ width: 36, height: 36, borderRadius: 8 }} />
					</View>

					<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
						<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 13, flex: 1, marginRight: 12 }}>
							{playlist_id}
						</Text>
						<TouchableOpacity style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6 }}>
							<Text style={{ color: colors.background, fontSize: 13, fontWeight: "600" }}>Run</Text>
						</TouchableOpacity>
					</View>

					<View style={{ flexDirection: "row", gap: 14 }}>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
							<Ionicons name="time-outline" size={13} color={props.linker_link.on_startup ? colors.green : colors.deeptext} />
							<Text style={{ color: props.linker_link.on_startup ? colors.green : colors.deeptext, fontSize: 12 }}>On Startup</Text>
						</View>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
							<Ionicons name="list-outline" size={13} color={props.linker_link.full_service_playlist ? colors.green : colors.deeptext} />
							<Text style={{ color: props.linker_link.full_service_playlist ? colors.green : colors.deeptext, fontSize: 12 }}>Full Playlist</Text>
						</View>
					</View>
				</View>
			</ContextMenuView>
			<View style={{ width: "90%", height: 1, backgroundColor: colors.line, alignSelf: "flex-end" }} />
		</>
	);
}
