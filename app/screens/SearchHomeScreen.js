import React, { useState } from "react";
import { View, StyleSheet, TextInput, Text, TouchableOpacity, Image, FlatList, ScrollView } from "react-native";
import { useNavigation, useTheme } from '@react-navigation/native';
import ChoiceArtist from "../components/ChoiceArtist";
import ChoiceAlbums from "../components/ChoiceAlbums";
import SearchScreen from "./SearchScreen";

let choiceArtists = [ {
    artistName: 'Seycara',
    genre: 'Orchestral',
    backgroundImage: 'https://yt3.ggpht.com/KTQaQKs6J1Kf1j6ruz8ZBRaXB7ex3Af4X5sH1K9lboPzTMUKznjSWH7KWc7u7JPm8Pbt5N2nWg=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
    profilePicture: 'https://yt3.googleusercontent.com/ytc/AMLnZu8EX6Hd4HD-fA7k7OBn5OhxFiyEDVFfwjoxNSp9Dg=s176-c-k-c0x00ffffff-no-rj-mo'
},{
    artistName: 'Kansta',
    genre: 'Rap',
    backgroundImage: 'https://yt3.googleusercontent.com/9tKWe6_M-_Hq_2kJhPsG6yS8sBg8ECYPhO8GuoJLzvO5aY9fvSE35RDE611bmkK4zD2xs601=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
    profilePicture: 'https://yt3.ggpht.com/ZTvlR15z-6de-EiKUxCRQQXPVemfKUZA_TazZ2Mug_DJCPqkXgTMyBS9N9255HYs2PQzxb3VQMM=s176-c-k-c0x00ffffff-no-rj-mo'
}]
let choiceAlbums = [{
    artistName: 'Kanesta',
    albumName: 'The Rookie',
    profilePicture: 'https://yt3.ggpht.com/ZTvlR15z-6de-EiKUxCRQQXPVemfKUZA_TazZ2Mug_DJCPqkXgTMyBS9N9255HYs2PQzxb3VQMM=s176-c-k-c0x00ffffff-no-rj-mo'
},{
    artistName: 'Seycara',
    albumName: 'Illusions of the Heart',
    profilePicture: 'https://f4.bcbits.com/img/a1035349507_16.jpg'
},{
    artistName: 'Seycara',
    albumName: 'Everlasting Summer',
    profilePicture: 'https://f4.bcbits.com/img/a1906988218_16.jpg'
},{
    artistName: 'Seycara',
    albumName: 'Orchestral',
    profilePicture: 'https://yt3.googleusercontent.com/ytc/AMLnZu8EX6Hd4HD-fA7k7OBn5OhxFiyEDVFfwjoxNSp9Dg=s176-c-k-c0x00ffffff-no-rj-mo'
},{
    artistName: 'Seycara',
    albumName: 'Orchestral',
    profilePicture: 'https://yt3.googleusercontent.com/ytc/AMLnZu8EX6Hd4HD-fA7k7OBn5OhxFiyEDVFfwjoxNSp9Dg=s176-c-k-c0x00ffffff-no-rj-mo'
},{
    artistName: 'Seycara',
    albumName: 'Orchestral',
    profilePicture: 'https://yt3.googleusercontent.com/ytc/AMLnZu8EX6Hd4HD-fA7k7OBn5OhxFiyEDVFfwjoxNSp9Dg=s176-c-k-c0x00ffffff-no-rj-mo'
}]
function SearchHomeScreen(props){
    const { colors } = useTheme();
	const styles = themeStyles(colors);
    
    const navigation = useNavigation();

    let toggle = true;
    const [searchScreenState, setSearchScreenState] = useState(true)

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
            {!searchScreenState && <SearchScreen></SearchScreen>}
            {searchScreenState && <View style={styles.topContainer}>
                <View style={styles.wrapper}>
                    <TextInput onPressIn={() => {toggle = !toggle; setSearchScreenState(toggle)}} autoCorrect={false} placeholder='Search' placeholderTextColor={'#808080'} style={styles.searchinput}/>
                </View>
                <View style={{top: 100, marginHorizontal: 10}}>
                    <ScrollView style={{height: '79%'}}>
                        <Text style={styles.headerText}>Developer's Choice Artists</Text>
                        <View style={{backgroundColor: '#808080', width: '85%', height: 1, marginVertical: 5}}/> 

                        <ChoiceArtist {...choiceArtists[0]}/>
                        <ChoiceArtist {...choiceArtists[1]}/>

                        {/* <FlatList data={choiceArtists} style={{height: 290, width: '100%'}} horizontal={true}
                            renderItem={renderItem}/> */}

                        <Text style={styles.headerText}>Developer's Choice Albums</Text>
                        <View style={{backgroundColor: '#808080', width: '88%', height: 1, marginVertical: 5}}/>

                        <FlatList data={choiceAlbums} horizontal={true}
                            renderItem={({ item, index }) => ( <ChoiceAlbums {...choiceAlbums[index]}></ChoiceAlbums> )}/>

                        {/* <View style={{flexDirection: 'row'}}>
                            <ChoiceAlbums profilePicture={'https://yt3.ggpht.com/ZTvlR15z-6de-EiKUxCRQQXPVemfKUZA_TazZ2Mug_DJCPqkXgTMyBS9N9255HYs2PQzxb3VQMM=s176-c-k-c0x00ffffff-no-rj-mo'} artistName={'Kanesta'} albumName={'The Rookie'}/>
                            <ChoiceAlbums profilePicture={'https://f4.bcbits.com/img/a1035349507_16.jpg'} artistName={'Seycara'} albumName={'Illusions of the Heart'}/>
                            <ChoiceAlbums profilePicture={'https://f4.bcbits.com/img/a1906988218_16.jpg'} artistName={'Seycara'} albumName={'Everlasting Summer'}/>
                        </View> */}

                        <Text style={styles.headerText}>Top Songs</Text>
                        <View style={{backgroundColor: '#808080', width: '35%', height: 1, marginVertical: 5}}/>

                        <Text style={styles.headerText}>Genres</Text>
                        <View style={{backgroundColor: '#808080', width: '24%', height: 1, marginVertical: 5}}/>

                        <TouchableOpacity style={styles.genres}>
                                <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginHorizontal: 15}}>Rap</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
                
            </View>}
        </>
    );
}
const themeStyles = (colors) => StyleSheet.create({
	topContainer:{
        flex: 1,
        backgroundColor: '#000000'
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