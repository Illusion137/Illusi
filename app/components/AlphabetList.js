import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';


function AlphabetList(props) {
	const route = useRoute();
	const id = props.id;
	const saved = props.saved;
	const navigation = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	return (
		<FlatList></FlatList>
	);
}

const themeStyles = (colors) => StyleSheet.create({

});

export default AlphabetList;