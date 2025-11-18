import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import type { Prefs } from '@illusive/prefs';
import Markdown from 'react-native-markdown-display';
import { CHANGELOG } from '../../../lib-origin/gen_changelog';
import usePTheme from '@hooks/usePTheme';

export default function ExtraChanglogScreen() {
    const { colors } = usePTheme();
    const styles = theme_styles(colors);
    styles;

    return(
        <ScrollView style={{backgroundColor: colors.background, left: "5%", width: '90%', flex: 1,}}>
            <View style={{height: 20}}/>
            <Markdown style={{
                  "body": {
                    color: colors.text,
                  },
                  "code_inline": {color: 'black', fontSize: 14}
                }}>
                { CHANGELOG }
            </Markdown>
            <View style={{height: 200}}/>
        </ScrollView>
    );
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    thick_line_long:{
        width: "90%",
        height: 0.4,
        opacity: 1,
        backgroundColor: colors.text,
    },
    line_long:{
        width: "100%",
        height: 0.4,
        opacity: 0.1,
        backgroundColor: colors.text,
    },
    line_short:{
        width: "100%",
        height: 0.4,
        opacity: 0.1,
        backgroundColor: colors.text,
        marginLeft: 42
    },
    description_text: {
        color: colors.subtext,
        marginLeft: 10,
        marginTop: 5,
        marginBottom: 10,
        fontSize: 16
    },
    header_text: {
        paddingTop: 16,
        paddingBottom: 5,
        marginLeft: 10,
        color: colors.text,
        fontSize: 24,
        fontWeight: 'bold',
        backgroundColor: colors.background + 'f0'
    }
});