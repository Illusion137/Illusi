import React,  { useState } from 'react';
import { View, StyleSheet,Text, FlatList } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';
import * as Prefs from '../../../Preferences';
import SettingsMultiButton from '../../components/SettingsMultiButton';
import ExtrasSectionButton from '../../components/ExtrasSectionButton'

function ExtraSettingsScreen(props) {
	const navigation = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);
	
	const [settingsData, setSettingsData] = useState(Object.entries(Prefs.prefs.settings)); 
	const renderItem = (item) => 
	<>
		<SettingsMultiButton settingsKey={item.item[0]} settingsValue={item.item[1]} preKey={'settings'}/>
		{item.index !== settingsData.length-1 && <View style={styles.lineshort}/>}
	</>;
	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>
			<FlatList data={settingsData} renderItem={renderItem} ListHeaderComponent={<View style={styles.linelong}/>} ListFooterComponent={
				<>
					<View style={styles.linelong}/>
					<View style={{height: 30}}/>
					<ExtrasSectionButton showArrow={true} text='Experimental Features' icon='build-outline' onPress={async () => navigation.navigate('Experimental Features') }/>
					<View style={{height: 100}}/>
				</>
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
export default ExtraSettingsScreen;