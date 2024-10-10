import { useTheme } from "@react-navigation/native";
import { Track } from "../../../../lib-origin/Illusive/src/types";
import { Prefs } from "../../../../lib-origin/Illusive/src/prefs";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BigList from "react-native-big-list";

export default function AddToPlaylistTrackList(props: {
    tracks: Track[]
    write_playlist_uid: string
    section_map: boolean
    added_tracks_reference: Track[]
}){
    interface TrackWriteAction {
        type: "ADD" | "REMOVE"
        track_uid: string
    }

	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

    async function add_all_tracks(){

    }

	const header_component = () => (
        <TouchableOpacity onPress={add_all_tracks} style={styles.add_all_tracks_button}>
	        <Text style={styles.add_all_tracks_text}>Add All Tracks</Text>
        </TouchableOpacity>
    );

    return (
        <BigList style={{height: '71%'}} 
            sections={all_data.track_mask}
            renderItem={render_track}
            keyExtractor={(item, index) => item.uid}
            renderHeader={header_component}
            placeholder={true}
            placeholderComponent={<TrackPlaceholderComponent/>}
            renderSectionHeader={section_header}
            renderFooter={section_footer}
            sectionHeaderHeight={30}
            headerHeight={90}
            footerHeight={100}
            ref={biglist_ref as MutableRefObject<BigList>}
            itemHeight={61}
            stickySectionHeadersEnabled={false}
        />
    )
}

const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
    add_all_tracks_button: {
        backgroundColor: colors.primary, 
        width: '100%', 
        height: 40, 
        justifyContent: 'center', 
        alignItems: 'center', 
        flexDirection: 'row', 
        bottom: 20, 
        marginTop: 40
    },
    add_all_tracks_text: {
        fontWeight: '500', 
        fontSize: 18
    }
});