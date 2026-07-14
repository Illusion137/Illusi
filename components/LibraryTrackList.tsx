import type { RefObject } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import BigList from "react-native-big-list";
import type { Prefs } from "@illusive/prefs";
import type { AlphabetScroll, EditMode, Track } from "@illusive/types";
import TrackComponent from "./TrackComponent";
import { play_shuffle } from "@illusive/illusi/src/play";
import { track_query_filter, track_section_map } from "@illusive/illusive_utils";
import { on_alphabet_scroll_update } from "@illusive/illusi/src/illusi_utils";
import ShufflePlayButton from "./ShufflePlayButton";
import React from "react";
import { is_empty } from "@common/utils/util";
import { extract_query_flags, TRACK_QUERY_FLAGS } from "@illusive/query_flags";
import { GLOBALS } from "@illusive/globals";
import { Constants } from "@illusive/constants";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import usePTheme from "@hooks/usePTheme";
import { BASE_WIDTH_FN } from "./TrackComponentBase";
import { useFocusEffect } from "expo-router";
import useGlobalTracksRefresh from "@hooks/useGlobalTracksRefresh";
import { timeline_span_sync } from "@common/perf_timeline";

let search_query = "";
function LibraryTrackList(
	props: {
		edit_mode: EditMode;
		write_playlist_uuid?: string;
		header_height?: number;
		header_item?: () => React.JSX.Element;
		adjusted_alphabet_scroll?: number;
		is_focused: boolean;
		refresh_query_on_focus?: boolean;
	},
	ref: any
) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [all_data, set_all_data] = useState({ char_data: [] as string[], track_mask: [] as Track[][], num_tracks: 0 });
	// One membership query for the whole list instead of one per visible row;
	// null until the first fetch so rows fall back to their own lookup.
	const writing_to_playlist = props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist;
	const [saved_track_uids, set_saved_track_uids] = useState<Set<string> | null>(null);

	const alphabet_scroll: AlphabetScroll = {
		all_alphabet_fast_scroll_locations: [] as number[],
		current_position: 0,
		top_scroll: 0
	};

	const scroll_bar_animated = useRef(new Animated.Value(93)).current;
	const biglist_ref = useRef<BigList>(null);

	useImperativeHandle(ref, () => ({
		refresh_data
	}));

	useGlobalTracksRefresh(async () => refresh_data(search_query));
	useFocusEffect(
		useCallback(() => {
			if (props.refresh_query_on_focus ?? false) {
				search_query = "";
			}
			refresh_data(search_query);
		}, [])
	);

	useEffect(() => {
		on_edit_mode_change(props.edit_mode);
	}, [props.edit_mode]);

	async function refresh_data(query?: string) {
		search_query = query ?? search_query ?? "";

		const { tracks, section_map } = timeline_span_sync("library.refresh_data", () => {
			const filtered = track_query_filter(GLOBALS.global_var.sql_tracks, search_query);
			return { tracks: filtered, section_map: track_section_map(filtered, !is_empty(extract_query_flags(query!, TRACK_QUERY_FLAGS).new_query)) };
		});

		if (writing_to_playlist) set_saved_track_uids(await SQLPlaylists.playlist_track_uid_set(props.write_playlist_uuid!));
		set_all_data({ char_data: section_map.char_data, track_mask: section_map.section_map, num_tracks: tracks.length });
	}
	function on_edit_mode_change(edit_mode: EditMode) {
		if (edit_mode === "NONE") {
			Animated.timing(scroll_bar_animated, {
				useNativeDriver: false,
				toValue: 93,
				duration: 300
			}).start();
		} else {
			Animated.timing(scroll_bar_animated, {
				useNativeDriver: false,
				toValue: 100,
				duration: 300
			}).start();
		}
	}

	// Stable callbacks so the memoized TrackComponent rows skip re-rendering when
	// the list refreshes — inline closures gave every row new props each render.
	const track_callback = useCallback(() => [...GLOBALS.global_var.sql_tracks], []);
	const width_fn = useCallback(() => BASE_WIDTH_FN(props.write_playlist_uuid), [props.write_playlist_uuid]);
	const render_track = useCallback(
		(item: { item: Track }) => (
			<TrackComponent
				track_data={item.item}
				track_callback={track_callback}
				from={"My Library"}
				edit_mode={props.edit_mode}
				width_fn={width_fn}
				write_playlist_uuid={props.write_playlist_uuid}
				playlist_saved={writing_to_playlist && saved_track_uids !== null ? saved_track_uids.has(item.item.uid) : undefined}
			/>
		),
		[track_callback, width_fn, props.edit_mode, props.write_playlist_uuid, writing_to_playlist, saved_track_uids]
	);
	const header_component = () => <ShufflePlayButton text={is_empty(search_query) ? undefined : "Shuffle Searched"} on_press={async () => play_shuffle(track_query_filter(GLOBALS.global_var.sql_tracks, search_query), "My Library")} top={20} />;

	const section_header = (index: number) => (
		<View style={styles.section_header}>
			<Text style={styles.section_text}>{all_data.char_data[index]}</Text>
		</View>
	);
	const section_footer = () => (
		<View style={{ alignItems: "center", marginVertical: 24 }}>
			<Text style={{ color: colors.subtext, fontSize: 25 }}>{all_data.num_tracks} Tracks</Text>
		</View>
	);

	return (
		<>
			<BigList
				style={{ height: "71%" }}
				sections={all_data.track_mask}
				renderItem={render_track}
				keyExtractor={(item, _) => item.uid}
				renderHeader={props.header_item ?? header_component}
				renderSectionHeader={section_header}
				renderFooter={section_footer}
				sectionHeaderHeight={30}
				headerHeight={props.header_height ?? 90}
				footerHeight={100}
				ref={biglist_ref as RefObject<BigList>}
				itemHeight={61}
				stickySectionHeadersEnabled={false}
			/>
			<Animated.View
				style={{
					backgroundColor: colors.background,
					position: "absolute",
					left: scroll_bar_animated.interpolate({
						inputRange: [0, 100],
						outputRange: ["0%", "100%"]
					}),
					top: 380 - 7 * all_data.char_data.length,
					justifyContent: "center",
					alignItems: "center",
					borderRadius: 10,
					width: 25
				}}
				hitSlop={{ left: props.edit_mode === "NONE" ? 20 : 0, right: 20 }}
				onStartShouldSetResponder={(_) => true}
				onTouchStart={(_) => {
					alphabet_scroll.top_scroll = 380 - 7 * all_data.char_data.length;
				}}
				onResponderMove={(e) => on_alphabet_scroll_update(alphabet_scroll, all_data.char_data, biglist_ref as any, e, props.adjusted_alphabet_scroll)}>
				{all_data.char_data.map((element, i) => (
					<View key={i} style={{ justifyContent: "center", alignItems: "center", paddingHorizontal: 6, height: 17, width: 25 }}>
						<Text style={{ color: colors.primary, fontSize: 14 }}>{element}</Text>
					</View>
				))}
			</Animated.View>
		</>
	);
}
export default forwardRef(LibraryTrackList);

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		top_container: {
			backgroundColor: colors.background,
			flex: 1,
			justifyContent: "flex-start"
		},
		header: {
			backgroundColor: colors.shelf,
			width: "100%",
			height: "18%",
			top: 0,
			justifyContent: "flex-end",
			alignItems: "center"
		},
		top_text: {
			bottom: 20,
			color: colors.text,
			fontSize: 18,
			fontWeight: "500"
		},
		search_input: {
			backgroundColor: colors.searchInput,
			color: colors.text,
			width: "75%",
			bottom: 10,
			paddingLeft: 10,
			fontSize: 15,
			borderTopRightRadius: 10, // Top Right Corner
			borderBottomRightRadius: 10 // Bottom Right Corner
		},
		search_container: {
			justifyContent: "center",
			height: "24%",
			left: -5,
			width: "100%",
			flexDirection: "row"
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
		section_header: {
			width: "100%",
			height: 30,
			backgroundColor: colors.background,
			justifyContent: "center"
		},
		section_text: {
			color: colors.text,
			fontSize: 18,
			fontWeight: "bold",
			marginHorizontal: 10
		}
	});
