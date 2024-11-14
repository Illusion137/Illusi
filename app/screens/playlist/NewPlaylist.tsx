
import React,  { useState, useRef,useImperativeHandle, forwardRef, Ref } from 'react';
import { View, Text, StyleSheet, Button, TextInput } from 'react-native';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import ImportServiceComponent from '../../components/ImportServiceComponent';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';

function NewPlaylist(props: {
		close_panel: () => void
		refresh_playlists_data: () => void
	}, ref: Ref<any>) {
	
	const navigation: NavigationProp<any, any> = useNavigation();
	
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
		
	const input_ref = useRef<TextInput>();

	const [playlistName, setPlaylistName] = useState("");
	const [isInvalidName, setIsInvalidName] = useState(true);

	useImperativeHandle(ref, () => ({
		focusInput: () => { input_ref.current?.focus() }
	}))

	function onCancel(){
		props.close_panel(); 
		input_ref.current?.blur();
	}
	async function onCreateValid(){
		setIsInvalidName(true);
		await SQLPlaylists.create_playlist(playlistName);
		await props.refresh_playlists_data();
		input_ref.current?.clear();
		input_ref.current?.blur();
		props.close_panel();
	}
	async function onNameUpdate(name: string){
		setPlaylistName(name);
		const lname = name.toLowerCase();
		if(!name || !name.trim() || lname == 'tracks' || lname == 'recently_played_tracks' || lname == 'backpack' || lname == 'playlists' || lname == 'audiobooks')
			 setIsInvalidName(true);
		else setIsInvalidName(false);
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1, borderRadius: 15}}>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 55, width: '100%', backgroundColor: colors.shelf, borderTopLeftRadius: 15, borderTopRightRadius: 15}}>
				<View style={{marginLeft:-50}}></View>
				<Button title='Cancel' color={colors.primary} onPress={onCancel}></Button>
				<Text style={{color: colors.text, fontWeight:'500', fontSize: 18}}>New Playlist</Text>
				{isInvalidName && <Button title='Create' color={colors.searchPlaceholder} ></Button>}
				{!isInvalidName && <Button title='Create' color={colors.primary} onPress={onCreateValid}></Button>}
				<View style={{marginRight:-50}}></View>
			</View>
            <View style={{height: 0.6, backgroundColor: colors.line}}/>
			<TextInput maxLength={45} ref={input_ref as any} placeholder='Playlist name' placeholderTextColor={colors.searchPlaceholder} style={styles.name_input} onChangeText={onNameUpdate}></TextInput>
			<View style={{height:40}}></View>
            {[...Illusive.music_service.keys()].map((key, i) => (
                <View key={i}>
			        <ImportServiceComponent service_name={key} navigation={navigation} img_props={(typeof Illusive.music_service.get(key)!.app_icon === "number" ? Illusive.music_service.get(key)!.app_icon : {uri: Illusive.music_service.get(key)!.app_icon, cache: 'force-cache'}) as any}/>
                </View>
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
export default forwardRef(NewPlaylist);