import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';

function ExtraRecoveryScreen() {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
    
	return(
		<View style={styles.container}>
            <Text style={styles.header_text}>Your Recovery Code</Text>
            <View style={styles.line_short}/>
            <View style={styles.uuid_container}>
                {
                    Prefs.get_pref('user_uuid').split("-").map((uuid_part, i) => (
                        <Text key={i} style={styles.uuid_text}>{uuid_part}</Text>
                    ))
                }
            </View>
		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.background, 
        width: '100%', 
        flex: 1
    },
    header_text: {
        color: colors.primary,
        fontWeight: "500",
        fontSize: 24,
        padding: 10
    },
    line_short:{
		width: "100%",
		height: 1,
		opacity: 1,
		backgroundColor: colors.line,
		marginLeft: 42
	},
    uuid_container: {
        width: "100%",
        height: "30%",
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
        backgroundColor: colors.shelf
    },
    uuid_text: {
        color: colors.text,
        fontWeight: "bold",
        fontSize: 24,
    }
});
export default ExtraRecoveryScreen;