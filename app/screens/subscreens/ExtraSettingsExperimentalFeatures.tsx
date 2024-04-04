import React,  { useState } from 'react';
import { View, StyleSheet,Text, FlatList } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';
import * as Prefs from '../../../Preferences';
import SettingsMultiButton from '../../components/SettingsMultiButton';
import ExtrasSectionButton from '../../components/ExtrasSectionButton'

function ExtraSettingsExperimentalFeatures(props) {

	const { colors } = useTheme() as typeof Prefs.darkThemeDefault;
	const styles = themeStyles(colors);
	
	const [settingsData, setSettingsData] = useState(Object.entries(Prefs.prefs.experimental_features)); 
	const renderItem = (item) => 
	<>
		<SettingsMultiButton settingsKey={item.item[0]} settingsValue={item.item[1]} preKey={'experimental_features'}/>
		{item.index !== settingsData.length-1 && <View style={styles.lineshort}/>}
	</>;
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<FlatList data={settingsData} renderItem={renderItem} ListHeaderComponent={<View style={styles.linelong}/>} ListFooterComponent={
				<View style={styles.linelong}/>
			}/>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
    linelong:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: 'white',
	},
	lineshort:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: 'white',
		marginLeft: 42
	}
});
export default ExtraSettingsExperimentalFeatures;