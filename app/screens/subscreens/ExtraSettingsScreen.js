import React,  { useState } from 'react';
import { View, StyleSheet, TouchableOpacity,Text, Switch } from 'react-native';
import { Entypo } from '@expo/vector-icons';


function ExtraSettingsScreen(props) {
	const [isEnabled, setIsEnabled] = useState(false);

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			
			{/* <TouchableOpacity style={styles.}>

			</TouchableOpacity> */}

			{/* <View>

			</View> */}

			<Switch
				trackColor={{ false: "#767577", true: "#424ed4" }}
				thumbColor={isEnabled ? "#f5dd4b" : "#f4f3f4"}
				onValueChange={() => setIsEnabled(previousState => !previousState)}
				value={isEnabled}
			/>
		</View>
	);
}
const styles = StyleSheet.create({
    multiSliderItem:{
		
	}
});
export default ExtraSettingsScreen;