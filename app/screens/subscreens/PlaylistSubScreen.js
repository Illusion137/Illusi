import { AntDesign, Ionicons, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import React from "react";
import { useTheme } from '@react-navigation/native';
import { View, StyleSheet, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

function PlaylistSubScreen({route}){
    const navigation = useNavigation();
    const { colors } = useTheme();
	const styles = themeStyles(colors);

    const playlistInfo = route.params.playlistInfo;

    const actions = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel","Export Playlist To YouTube" , "Clear Tracks", "Edit Playlist"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark'
      },
      buttonIndex => {
        if (buttonIndex === 0) {
            // cancel action
        }else if (buttonIndex === 1) {
            console.log('Export Playlist To YouTube')
        }else if (buttonIndex === 2) {
            console.log('Clear Tracks')
        }else if (buttonIndex === 3) {
            console.log('Edit Playlist')
        }
      }
    );

    return(
        <View style={styles.topContainer}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <AntDesign name="left" size={30} color={colors.primary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={actions}>
                    <Ionicons name="ellipsis-horizontal-outline" size={40} color={colors.primary}/>
                </TouchableOpacity>
                {/* <Ionicons name="search" size={22} color='#808080' style={styles.icon}/> */}
            </View>
            <FlatList style={{backgroundColor: '#121212'}} ListHeaderComponent={(
                <View style={styles.playlistListHeader}>
                    <Image source={require('../../../assets/notfound.png')} style={{width: 150, height: 150}}/>
                    <View style={{top: 15, alignItems: 'center'}}>
                        <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{playlistInfo.title}</Text>
                        <Text style={{color: '#808080', fontSize: 12}}>{playlistInfo.trackLength} tracks • {playlistInfo.trackDuration} Mins</Text>
                    </View>
                    <View style={styles.playlistButtonsContainer}>
                        <TouchableOpacity style={styles.playlistButton}>
                            <Ionicons name="add" size={35} color={colors.primary}/>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.playlistButton}>
                            <MaterialCommunityIcons name="pencil" size={25} color={colors.primary}/>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.playlistButton}>
                            <FontAwesome name="share" size={25} color={colors.primary}/>
                        </TouchableOpacity>
                    </View>
                </View>
            )}>
            </FlatList>
        </View>
    );
}

const themeStyles = (colors) => StyleSheet.create({
    topContainer:{
        flex: 1,
        backgroundColor: '#121212'
    },
    header:{
        top: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        zIndex: 1
    },
    playlistListHeader:{
        top: 50,
        alignItems: 'center'
    },
    infoText:{
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold'
    },
    playlistButtonsContainer:{
        flexDirection: 'row',
        top: 30
    },
    playlistButton:{
        borderRadius: 20, 
        backgroundColor: '#1a184f',
        marginHorizontal: 10,
        width: 40, height: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    }
});

export default PlaylistSubScreen;