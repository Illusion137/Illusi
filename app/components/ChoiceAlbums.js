import React from "react";
import { Text, TouchableOpacity, Image } from "react-native";

function ChoiceAlbums(props){
    return(
        <TouchableOpacity style={{backgroundColor: '#000000', height: 115, marginVertical: 10, marginHorizontal:2, alignItems: 'center'}}>
            <Image source={{uri:props.profilePicture}} style={{width: 115, height: 115, opacity: 0.8}}/>
            <Text style={{color: '#FFFFFF', fontSize: 12, bottom: 30, fontWeight: 'bold'}}>{props.artistName}</Text>
            <Text style={{color: '#FFFFFF', fontSize: 8, bottom: 30}}>{props.albumName}</Text>
        </TouchableOpacity>
    );
}
export default ChoiceAlbums;