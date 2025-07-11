import React, { useEffect, useState } from "react";
import { StyleSheet, View, TextInput } from 'react-native';
import { useIsFocused, useTheme } from '@react-navigation/native';
import SearchScreen from "./SearchScreen";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { LinearGradient } from 'expo-linear-gradient';
// import MusiExplore from "./search/MusiExplore";
import IllusiExplore from "./search/IllusiExplore";

export default function SearchHomeScreen(){
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
    const is_focused = useIsFocused();

    let toggle = true;
    const [search_screen_state, set_search_screen_state] = useState(true);

    useEffect(() => {
        set_search_screen_state(true);
    }, [is_focused]);

    return(
        <>
            {!search_screen_state ? <SearchScreen/>
            : ( 
            <LinearGradient
                colors={[colors.primary, colors.background]}
                locations={[0.05, 0.2]}
                end={{x: 1.5, y: 2.3}}
                style={styles.topContainer}>
                <View style={styles.wrapper}>
                    <TextInput onPressIn={() => {toggle = !toggle; set_search_screen_state(toggle)}} autoCorrect={false} placeholder='Search' placeholderTextColor={'#808080'} style={styles.searchinput}/>
                </View>
                {/* <MusiExplore/> */}
                <IllusiExplore/>
            </LinearGradient>)}
        </>
    );
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	topContainer:{
        flex: 1,
        backgroundColor: colors.background
    },
    line_long:{
		width: "100%",
		height: 0.8,
		opacity: 0.1,
		backgroundColor: colors.text,
	},
    wrapper:{
        alignItems: 'center',
        zIndex: 100
    },
    searchinput:{
		color: '#F0F0F0',
		backgroundColor: colors.searchInput,
		padding: 15,
		top: 70,
		borderRadius: 30,
		width: '90%',
	},
    headerText:{
        color: colors.text,
        fontSize: 24,
        fontWeight: 'bold'
    },
    genres:{
        backgroundColor: colors.subtext,
        width: '100%',
        height: 50,
        justifyContent: 'center',
    }
});