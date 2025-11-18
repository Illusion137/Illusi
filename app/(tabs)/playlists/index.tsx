import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PlaylistComponent from "@components/PlaylistComponent";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { useIsFocused } from "@react-navigation/native";
import DefaultPlaylistComponent from "@components/DefaultPlaylistComponent";
import { Prefs } from "@illusive/prefs";
import type { Playlist, ResolvedDefaultPlaylist } from "@illusive/types";
import { playlist_query_filter } from "@illusive/illusive_utils";
import BigList from "react-native-big-list";
import { sort_playlists } from "@illusive/illusi/src/playlist";
import { empty_resolved_default_playlists, resolved_default_playlists } from "@illusive/default_playlists";
import SearchBarV1 from "@components/SearchBarV1";
import { PLAYLIST_QUERY_FLAGS } from "@illusive/query_flags";
import usePTheme from "@hooks/usePTheme";
import { router } from "expo-router";

let last_playlists_count = 0;
export default function Playlists() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const is_focused = useIsFocused();

	const [query, set_query] = useState<string>("");
	const [playlists_state, set_playlists] = useState<Playlist[]>([]);
	const [default_playlists_state, set_default_playlists] = useState<ResolvedDefaultPlaylist[]>(empty_resolved_default_playlists());

	const sorted_queried_playlists = sort_playlists(
		playlist_query_filter(
			playlists_state.filter((playlist) => !playlist.archived),
			query
		)
	);

	useEffect(() => {
		refresh_data(undefined, is_focused);
	}, [is_focused]);

	async function refresh_data(update_with?: Playlist, force_update?: boolean) {
		try {
			resolved_default_playlists().then((rdefault_playlists) => set_default_playlists(rdefault_playlists));
			if (update_with) {
				const new_playlist_state = [...playlists_state];
				const update_index = playlists_state.findIndex((playlist) => update_with.uuid === playlist.uuid);
				new_playlist_state[update_index] = update_with;
				set_playlists(new_playlist_state);
			}
			const new_last_playlists_count = await SQLPlaylists.playlists_count();
			if (last_playlists_count !== new_last_playlists_count || force_update) {
				last_playlists_count = new_last_playlists_count;
				SQLPlaylists.all_playlists_data().then((playlists) => set_playlists(playlists));
			}
		} catch (error) {}
	}

	const render_item = (item: { item: Playlist }) => <PlaylistComponent playlist_data={item.item} refresh_data={refresh_data} compact={Prefs.get_pref("compact_playlists")} />;

	function show_archived(){
		router.push({
			pathname: '/playlists/archived', 
			params: {"query": query}
		});
	}
	function show_create(){
		router.push({
			pathname: '/playlists/create'
		});
	}

	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<View style={{ flexDirection: "row", bottom: 20, alignItems: "center" }}>
					<TouchableOpacity
						onPress={show_archived}>
							<Ionicons name="archive" size={25} color={colors.primary} style={{ right: 110 }} />
					</TouchableOpacity>
					<Text style={styles.top_text}>Playlists</Text>
					<TouchableOpacity onPress={show_create}>
						<Ionicons name="add" size={25} color={colors.primary} style={{ left: 110 }} />
					</TouchableOpacity>
				</View>
				<View style={styles.searchcontainer}>
					<SearchBarV1 placeholder="Search Playlists" query_flags={PLAYLIST_QUERY_FLAGS} onChangeText={(val) => set_query(val ?? "")} />
				</View>
			</View>
			<View style={styles.default_container}>
				<ScrollView horizontal={true}>
					{default_playlists_state.map((default_playlist, i) => (
						<View key={i}>
							<DefaultPlaylistComponent title={default_playlist.name} force_order={default_playlist.force_order} four_track={default_playlist.four_tracks} />
						</View>
					))}
				</ScrollView>
			</View>
			<View style={{ width: "100%", height: 1, backgroundColor: colors.searchPlaceholder, marginLeft: 30, marginRight: 30 }} />
			<BigList
				style={{ height: "71%" }}
				data={sorted_queried_playlists}
				keyExtractor={(item, _) => String(item.uuid)}
				itemHeight={Prefs.get_pref("compact_playlists") ? 56 : 81}
				headerHeight={0}
				footerHeight={100}
				renderItem={render_item}
				renderHeader={() => <></>}
				renderFooter={() => <View style={{ height: 100 }}></View>}
			/>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		top_container: {
			backgroundColor: colors.background,
			flex: 1
		},
		header: {
			backgroundColor: colors.shelf,
			width: "100%",
			height: "18%",
			top: 0,
			justifyContent: "flex-end",
			alignItems: "center",
			zIndex: 10
		},
		top_text: {
			color: colors.text,
			fontSize: 18,
			fontWeight: "500"
		},
		search_input: {
			backgroundColor: colors.searchInput,
			color: "white",
			width: "90%",
			bottom: 10,
			padding: 10,
			borderTopRightRadius: 10, // Top Right Corner
			borderBottomRightRadius: 10 // Bottom Right Corner
		},
		searchcontainer: {
			justifyContent: "center",
			height: "24%",
			left: -5,
			width: "95%",
			flexDirection: "row",
			zIndex: 10
		},
		icon: {
			overflow: "hidden",
			backgroundColor: colors.searchInput,
			paddingTop: 5,
			paddingLeft: 5,
			paddingRight: 5,
			bottom: 10,
			left: 10,
			borderRadius: 10,
			zIndex: 1
		},
		default_playlist_text: {
			color: colors.text,
			fontSize: 18,
			fontWeight: "bold",
			textAlign: "center",
			position: "absolute",
			zIndex: 1
		},
		default_playlist_button: {
			backgroundColor: colors.card,
			height: 110,
			width: 110,
			borderRadius: 5,
			margin: 5,
			justifyContent: "center"
		},
		default_container: {
			margin: 5,
			flexDirection: "row"
		},
		images: {
			width: 55,
			height: 55,
			aspectRatio: 1,
			resizeMode: "cover"
		},
		not_found: {
			width: 110,
			height: 110,
			borderRadius: 5
		}
	});
