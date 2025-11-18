import { Text, TouchableOpacity, View } from "react-native";
import IImage from "./IImage";
import usePTheme from "@hooks/usePTheme";

export default function IllusiRewindComponent(){
    const height = 165;
    const { colors } = usePTheme();

    function on_press(){

    }

    return (
        <View style={{height: height, justifyContent: 'center', alignItems: 'center'}}>
            <View style={{justifyContent: 'center', alignItems: 'center', bottom: 5, backgroundColor: colors.background, width: '100%', paddingVertical: 10, zIndex: 10}}>
                <Text style={{color: colors.text, fontSize: 20, fontWeight: 'bold'}}>Your {new Date().getFullYear()} Rewind</Text>
                <Text style={{color: colors.text}}>Explore the music you listened to this year.</Text>
            </View>
            <TouchableOpacity onPress={on_press} style={{backgroundColor: colors.background, borderRadius: 20, borderColor: colors.line, borderWidth: 2, padding: 10, top: 5, zIndex: 10}}>
                <Text style={{color: colors.text}}>Rewind</Text>
            </TouchableOpacity>
            <IImage fade={{percent: 300, middle_opacity: 0.0, end_opacity: 0.9, color: colors.primary}} source={0} style={{height: height, bottom: 0, position: 'absolute', zIndex: -1, resizeMode: 'center'}}/>
        </View>
    );
}