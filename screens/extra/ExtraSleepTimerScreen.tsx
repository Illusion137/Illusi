import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '@illusive/prefs';
// import DateTimePicker from '@react-native-community/datetimepicker'

export default function ExtraSleepTimerScreen() {
    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    return (
        <View style={styles.container}>
            <Text style={styles.header_text}>Sleep Timer - Coming Soon...</Text>
            {/* <DateTimePicker
                testID=''
                value={new Date()}
                mode='time'/> */}
        </View>
    );
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        width: '100%',
        flex: 1
    },
    header_text: {
        color: colors.text,
        fontWeight: "500",
        fontSize: 24,
        padding: 10
    },
    line_short: {
        width: "100%",
        height: 1,
        opacity: 1,
        backgroundColor: colors.line,
        marginLeft: 42
    }
});