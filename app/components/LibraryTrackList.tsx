import { useTheme } from "@react-navigation/native";
import { forwardRef, MutableRefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text } from "react-native";
import BigList from "react-native-big-list";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import * as GLOBALS from "../../lib-origin/Illusive/src/illusi/src/globals";
import * as SQLTracks from "../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks";
import * as SQLPlaylists from "../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists";
import TrackPlaceholderComponent from "./TrackPlaceholderComponent";
import { AlphabetScroll, EditMode, Track } from "../../lib-origin/Illusive/src/types";
import TrackComponent from "./TrackComponent";
import { play_shuffle } from "../../lib-origin/Illusive/src/illusi/src/play";
import { track_query_filter, track_section_map } from "../../lib-origin/Illusive/src/illusive_utilts";
// import { ExampleObj } from "../../lib-origin/Illusive/src/illusi/src/example_objs";
// import EditTrackModal from "./EditTrackModal";
import { on_alphabet_scroll_update } from "../../lib-origin/Illusive/src/illusi/src/illusi_utils";
import ShufflePlayButton from "./ShufflePlayButton";
import React from "react";
import { is_empty } from "../../lib-origin/origin/src/utils/util";

let search_query = "";
function LibraryTrackList(props: {
    edit_mode: EditMode
    write_playlist_uuid?: string
    header_height?: number
    header_item?: () => React.JSX.Element
    adjusted_alphabet_scroll?: number
    is_focused: boolean
}, ref: any){

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	const [all_data, set_all_data] = useState({char_data: [] as string[], track_mask: [] as Track[][], num_tracks: 0});
	// const [edit_track_modal_data, _] = useState({visible: false, track: ExampleObj.track_example0});

    const alphabet_scroll: AlphabetScroll = {
		all_alphabet_fast_scroll_locations: [] as number[],
		current_position: 0,
		top_scroll: 0
	};

	const scroll_bar_animated = useRef(new Animated.Value(93)).current;
	const biglist_ref = useRef<BigList>();

    useImperativeHandle(ref, () => ({
        refresh_data,
    }));    
    useEffect( () => {
        search_query = "";
		refresh_data(search_query);
	}, [props.is_focused]);
    useEffect( () => {
		on_edit_mode_change(props.edit_mode);
	}, [props.edit_mode]);

	async function refresh_data(query: (string|undefined) = undefined){
		search_query = query ?? "";
		await SQLTracks.fetch_track_data();
		
        let tracks = track_query_filter([...GLOBALS.global_var.sql_tracks], search_query);
        if(props.write_playlist_uuid !== undefined) await SQLPlaylists.add_saved_data_to_write_playlist_tracks(props.write_playlist_uuid, tracks);
        const section_map = track_section_map(tracks);

		set_all_data({char_data: section_map.char_data, track_mask: section_map.section_map, num_tracks: tracks.length});
	}
    function on_edit_mode_change(edit_mode: EditMode){
		if(edit_mode === "NONE") {
			Animated.timing(scroll_bar_animated, {
				'useNativeDriver': false,
				'toValue': 93,
				'duration': 300
			}).start();
		}
		else {
			Animated.timing(scroll_bar_animated, {
				'useNativeDriver': false,
				'toValue': 100,
				'duration': 300
			}).start();
		}
    }

	const render_track = (item: {item: Track}) => (<TrackComponent track_data={ item.item } track_callback={() => [...GLOBALS.global_var.sql_tracks]} from={"My Library"} edit_mode={props.edit_mode} write_playlist_uuid={props.write_playlist_uuid} refresh_data={async () => await refresh_data(search_query)}/>);
	const header_component = () => <ShufflePlayButton text={is_empty(search_query) ? undefined : "Shuffle Searched"} on_press={() => play_shuffle(track_query_filter(GLOBALS.global_var.sql_tracks, search_query), "My Library")} top={20}/>;

	const section_header = (index: number) => <View style={styles.section_header}><Text style={styles.section_text}>{all_data.char_data[index]}</Text></View>
	const section_footer = () => <View style={{alignItems: 'center',marginVertical: 24}}><Text style={{color: colors.subtext, fontSize: 25}}>{all_data.num_tracks} Tracks</Text></View>

    return (
        <>
            <BigList style={{height: '71%'}} 
				sections={all_data.track_mask}
				renderItem={render_track}
				keyExtractor={(item, _) => item.uid}
				renderHeader={props.header_item ?? header_component}
                placeholder={true}
                placeholderComponent={<TrackPlaceholderComponent/>}
				renderSectionHeader={section_header}
				renderFooter={section_footer}
				sectionHeaderHeight={30}
				headerHeight={props.header_height ?? 90}
				footerHeight={100}
				ref={biglist_ref as MutableRefObject<BigList>}
				itemHeight={61}
				stickySectionHeadersEnabled={false}
			/>
			<Animated.View style={{backgroundColor: colors.background,
					position: 'absolute',
					left: scroll_bar_animated.interpolate({
						'inputRange': [0, 100],
						'outputRange': ["0%", "100%"],
					}),
					top: 380-(7*all_data.char_data.length),
					justifyContent: 'center',
					alignItems: 'center',
					borderRadius: 10,
					width: 25
				}}
				hitSlop={{left: props.edit_mode === "NONE" ? 20 : 0, right: 20}}
				onStartShouldSetResponder={(_) => true}
				onTouchStart={(_) => { alphabet_scroll.top_scroll = 380-(7*all_data.char_data.length); }}
				onResponderMove={(e) => on_alphabet_scroll_update(alphabet_scroll, all_data.char_data, biglist_ref as any, e, props.adjusted_alphabet_scroll)}
				>
				{all_data.char_data.map((element, i) => (
					<View key={i} style={{justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, height:17, width: 25}} >
						<Text style={{color: colors.primary, fontSize: 14}}>{element}</Text>
					</View>
				))}
			</Animated.View>
            {/* <EditTrackModal visible={edit_track_modal_data.visible} track={edit_track_modal_data.track}/> */}
        </>
    )
}
export default forwardRef(LibraryTrackList);

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	top_container:{
		backgroundColor: colors.background,
		flex: 1,
		justifyContent: 'flex-start'
	},
	header:{
		backgroundColor: colors.shelf,
		width: '100%',
		height: '18%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	top_text:{
		bottom: 20,
		color: colors.text,
		fontSize: 18,
		fontWeight: '500'
	},
	search_input:{
		backgroundColor: colors.searchInput,
		color: colors.text,
		width: '75%',
		bottom: 10,
		paddingLeft: 10,
		fontSize: 15,
		borderTopRightRadius: 10,// Top Right Corner
		borderBottomRightRadius: 10, // Bottom Right Corner
	},
	search_container:{
		justifyContent: 'center',
		height: '24%',
		left:-5,
		width: '100%',
		flexDirection: 'row'
	},
	icon:{
		overflow: 'hidden',
		backgroundColor: colors.searchInput,
		paddingTop: 5,
		paddingLeft: 5,
		paddingRight: 5,
		bottom: 10,
		left: 10,
		borderRadius:10,
		zIndex: 1
	},
	section_header:{
		width: '100%',
		height: 30,
		backgroundColor: colors.background,
		justifyContent: 'center'
	},
	section_text:{
		color: colors.text,
		fontSize: 18,
		fontWeight: 'bold',
		marginHorizontal: 10
	},
});