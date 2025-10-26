
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput } from 'react-native';
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import { Prefs } from '@illusive/prefs';
import ImportServiceComponent from '@components/ImportServiceComponent';
import { Illusive } from '@illusive/illusive';
import usePTheme from '@hooks/usePTheme';
import { router } from 'expo-router';
import { is_empty } from '@common/utils/util';

const max_input_length = 30;
export default function CreatePlaylist() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
		
	const input_ref = useRef<TextInput>(null);

	const playlist_name = useRef("");
	const [can_create_playlist, set_can_create_playlist] = useState(false);

	useEffect(() => {
		input_ref.current?.focus();
	}, [input_ref.current]);

	function on_cancel(){
		if(!router.canDismiss()) return;
		input_ref.current?.blur();
		router.dismiss();
	}
	async function on_create_playlist(){
		await SQLPlaylists.create_playlist(playlist_name.current);
		input_ref.current?.clear();
		input_ref.current?.blur();
		on_cancel();
	}
	async function update_playlist_name(name: string){
		playlist_name.current = name;
		set_can_create_playlist(!is_empty(name));
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1, borderRadius: 15}}>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 55, width: '100%', backgroundColor: colors.shelf, borderTopLeftRadius: 15, borderTopRightRadius: 15, borderColor: colors.deeptext, borderWidth: 1}}>
				<View style={{marginLeft:-50}}></View>
				<Button title='Cancel' color={colors.primary} onPress={on_cancel}></Button>
				<Text style={{color: colors.text, fontWeight:'500', fontSize: 18}}>New Playlist</Text>
				{!can_create_playlist && <Button title='Create' color={colors.searchPlaceholder} ></Button>}
				{can_create_playlist && <Button title='Create' color={colors.primary} onPress={on_create_playlist}></Button>}
				<View style={{marginRight:-50}}></View>
			</View>
            <View style={{height: 0.6, backgroundColor: colors.line}}/>
			<TextInput maxLength={max_input_length} ref={input_ref} placeholder='Playlist Name' placeholderTextColor={colors.searchPlaceholder} style={styles.name_input} onChangeText={update_playlist_name}/>
			<View style={{height:40}}></View>
            {[...Illusive.music_service.keys()].map((key, i) => (
				<ImportServiceComponent 
					key={i} 
					service_name={key} />
            ))}
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	name_input:{
		backgroundColor: colors.track,
		height: 60,
		color: colors.text,
		width: '100%',
		padding: 10,
	},
	import_from:{
		height: 45,
		width: '100%',
		backgroundColor: colors.track,
		flexDirection: 'row',
		alignItems: 'center',
	},
	import_from_text:{
		color: colors.text,
		fontSize: 16
	},
	line:{
		width: '100%',
		height: 0.8,
		backgroundColor: colors.line,
		marginHorizontal: 10,
	}
});