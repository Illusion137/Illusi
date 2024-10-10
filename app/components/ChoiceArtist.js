import React from "react";
import { Text, TouchableOpacity, Image } from "react-native";

function ChoiceArtist(props){
    return(
        <TouchableOpacity style={{width: '100%', height: 120, backgroundColor: '#000000', borderRadius: 10, marginVertical: 10}}>
            <Image source={{uri:props.backgroundImage}} style={{borderRadius: 10, width: '100%', height: 120, opacity: 0.9}}/>
            <Image source={{uri:props.profilePicture}} style={{borderRadius: 50, width: 90, height: 90, bottom: 105, left: 10}}/>
            <Text style={{color: '#EEEEEE', fontSize: 30, bottom: 195, left: 120, fontWeight: 'bold'}}>{props.artistName}</Text>
            <Text style={{color: '#EEEEEE', fontSize: 15, bottom: 200, left: 120}}>{props.genre}</Text>
        </TouchableOpacity>
    );
}
export default ChoiceArtist;