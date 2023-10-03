import React, { useState } from "react";
import { View, StyleSheet, TextInput, Text, TouchableOpacity, Image, FlatList, ScrollView } from "react-native";
import { useNavigation, useTheme } from '@react-navigation/native';
import ChoiceArtist from "../components/ChoiceArtist";
import ChoiceAlbums from "../components/ChoiceAlbums";
import SearchScreen from "./SearchScreen";
import axios from "axios";

function SearchHomeScreen(props){
    const { colors } = useTheme();
	const styles = themeStyles(colors);
    
    const navigation = useNavigation();

    let toggle = true;
    const [searchScreenState, setSearchScreenState] = useState(true)

    React.useEffect(() => {
        // await axios
    },[])

    React.useEffect(() => {
        const onTabPress = navigation.addListener('tabPress', (e) => {
            if(navigation.isFocused()){
                toggle = !toggle;
                setSearchScreenState(toggle)
            }
        });

        return onTabPress;
    }, [navigation]);
    
    //artistName={item.artistName} genre={item.genre} backgroundImage={item.backgroundImage} profilePicture={item.profilePicture}
    // const renderItem = useCallback(;
    return(
        <>
            {!searchScreenState && <SearchScreen setPlaying={props.route.params.setPlaying}></SearchScreen>}
            {searchScreenState && <View style={styles.topContainer}>
                <View style={styles.wrapper}>
                    <TextInput onPressIn={() => {toggle = !toggle; setSearchScreenState(toggle)}} autoCorrect={false} placeholder='Search' placeholderTextColor={'#808080'} style={styles.searchinput}/>
                </View>
                <View style={{top: 100, marginHorizontal: 10}}>
                     <ScrollView style={{height: '79%'}}>

                    </ScrollView> 
                </View>
                
            </View>}
        </>
    );
}
const themeStyles = (colors) => StyleSheet.create({
	topContainer:{
        flex: 1,
        backgroundColor: colors.background
    },
    wrapper:{
        alignItems: 'center'
    },
    searchinput:{
		color: '#F0F0F0',
		backgroundColor: '#202020',
		padding: 15,
		top: 70,
		borderRadius: 30,
		width: '90%',
	},
    headerText:{
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold'
    },
    genres:{
        backgroundColor: '#121212',
        width: '100%',
        height: 50,
        justifyContent: 'center',
    }
});
export default SearchHomeScreen;