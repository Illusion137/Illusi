import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused, useTheme } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { upload_music_files } from '../../lib-origin/Illusive/src/illusi/src/document_picker';
import { cycle, } from '../../lib-origin/Illusive/src/illusive_utilts';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { EditMode, HexColor } from '../../lib-origin/Illusive/src/types';
import LibraryTrackList from '../components/LibraryTrackList';
import { TRACK_QUERY_FLAGS } from '../../lib-origin/Illusive/src/query_flags';
import SearchBarV1 from '../components/SearchBarV1';

export default function LibraryScreen() {
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
	const [edit_mode, set_edit_mode] = useState<EditMode>("NONE");

    const edit_mode_colors: Record<EditMode, HexColor> = {
        "NONE": colors.inactive as HexColor,
        "DOWNLOAD": colors.primary as HexColor,
        "DELETE": colors.red as HexColor,
        "EDIT": colors.orange as HexColor
    }

	const library_ref = useRef<typeof LibraryTrackList>();

	function cycle_edit_mode(){
        const current_edit_mode = edit_mode;
        const next_edit_mode = cycle<EditMode>(current_edit_mode, ["NONE", "DOWNLOAD", "DELETE"]);
		set_edit_mode(next_edit_mode);
	}
    const is_focused = useIsFocused();

	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<Text style={styles.top_text}>My Library</Text>
				<View style={styles.search_container}>
					<TouchableOpacity style={{bottom: 6, left: 3}} onPress={cycle_edit_mode} onLongPress={() => set_edit_mode("NONE")}>
						<MaterialCommunityIcons name="pencil" size={25} color={edit_mode_colors[edit_mode]}/>
					</TouchableOpacity>
					<View style={{width: '75%', bottom: 5, right: 10}}>
						<SearchBarV1 placeholder='Search My Library' query_flags={TRACK_QUERY_FLAGS} onChangeText={async(query) => (library_ref.current as any)?.refresh_data(query)}/>
					</View>
					<TouchableOpacity style={{bottom: 4}} onPress={async() => upload_music_files((library_ref.current as any)?.refresh_data)}>
						<Ionicons name="cloud-upload" size={25} color={colors.inactive}/>
					</TouchableOpacity>
				</View>

			</View>
            <LibraryTrackList edit_mode={edit_mode} ref={library_ref} is_focused={is_focused}/>
		</View>
	);
}

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
		zIndex: 2
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
		justifyContent: 'space-evenly',
		alignItems: 'center',
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
	}
});