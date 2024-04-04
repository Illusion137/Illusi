import React,  { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Text, Alert } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import Link from '../../components/Link';
import { darkThemeDefault } from '../../../Preferences';

function ExtraLinkerScreen(props) {
	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);
	const [modalVisible, setModalVisible] = useState(false);

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<Modal
				animationType="slide"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => {
				Alert.alert('Modal has been closed.');
				setModalVisible(!modalVisible);
				}}>
				<View style={styles.centeredView}>
				<View style={styles.modalView}>
					<Text style={styles.modalText}>Hello World!</Text>
					<Pressable
					style={[styles.button, styles.buttonClose]}
					onPress={() => setModalVisible(!modalVisible)}>
					<Text style={styles.textStyle}>Hide Modal</Text>
					</Pressable>
				</View>
				</View>
			</Modal>
			<Pressable
				style={[styles.button, styles.buttonOpen]}
				onPress={() => setModalVisible(true)}>
				<Text style={styles.textStyle}>Show Modal</Text>
			</Pressable>
			<Link fromIcon={"Musi"} fromText={"Music"} toIcon={"Amazon"} toText={"Recently Played"} biDirectional={true}/>
			<Link fromIcon={"Illusi"} fromText={"Songs"} toIcon={"Spotify"} toText={"Car"} biDirectional={false}/>
			<Link fromIcon={"YouTube"} fromText={"Liked Music"} toIcon={"None"} toText={"NULL"} biDirectional={false}/>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
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