import React,  { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationProp, useIsFocused, useNavigation } from '@react-navigation/native';
import Link from '@components/Link';
import type { Prefs } from '@illusive/prefs';
import { create_uri } from '@illusive/illusive_utils';
import ExtrasSectionButton from '@components/ExtrasSectionButton';
import usePTheme from '@hooks/usePTheme';
import { router } from 'expo-router';

export default function ExtraLinkerScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	styles;

	const focused = useIsFocused();

	useEffect(() => {

	}, [focused]);

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<ExtrasSectionButton text='Create New Link' icon='NONE' show_arrow={false} onPress={() => {router.navigate("Link")}}/>
			
			<Link linker_link={{link_uuid: "", full_sample: false, uuid_uri: create_uri('illusi', ''), to_service: "Spotify", to: {'title': '', 'uuid_uri': create_uri('spotify', '')} }}/>
		</View>
	);
}
const theme_styles = (_: Prefs.Theme['colors']) => StyleSheet.create({
    centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 22,
	},
	modalView: {
		margin: 20,
		backgroundColor: 'white',
		borderRadius: 20,
		padding: 35,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
		  width: 0,
		  height: 2,
	},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	  },
	  button: {
		borderRadius: 20,
		padding: 10,
		elevation: 2,
	  },
	  buttonOpen: {
		backgroundColor: '#F194FF',
	  },
	  buttonClose: {
		backgroundColor: '#2196F3',
	  },
	  textStyle: {
		color: 'white',
		fontWeight: 'bold',
		textAlign: 'center',
	  },
	  modalText: {
		marginBottom: 15,
		textAlign: 'center',
	  },
	
});