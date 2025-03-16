import React,  { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationProp, useIsFocused, useNavigation, useTheme } from '@react-navigation/native';
import Link from '../../components/Link';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { create_uri } from '../../../lib-origin/Illusive/src/illusive_utilts';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';

function ExtraLinkerScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	styles;

	const navigation: NavigationProp<any, any> = useNavigation();

	const focused = useIsFocused();

	useEffect(() => {

	}, [focused]);

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<ExtrasSectionButton text='Create New Link' icon='NONE' show_arrow={false} onPress={() => {navigation.navigate("Link")}}/>
			
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
export default ExtraLinkerScreen;