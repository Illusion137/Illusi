import { Text, View } from "react-native"
import Slider from '@react-native-community/slider';
import usePTheme from "@hooks/usePTheme";

export default function Equalizer(props: {
    bands_ranges: number[]
}){
    const { colors } = usePTheme();
    
    function numstring(band: number): string{
        return band < 1000 ? String(band) : String(Math.floor(band / 1000)) + 'k';
    }

    return (
        <View style={{backgroundColor: colors.shelf, height: 320, width: '90%', borderRadius: 10, alignSelf: 'center'}}>
            {
                props.bands_ranges.map((range, i) => (
                    <View key={i} style={{position: 'absolute'}}>
                        <View style={{transform:[{rotate: "90deg"}]}}>
                            <Slider 
                                style={{width: 270, height: 10, top: 110 - (i * 38), left: 140}}
                                minimumValue={0}
                                value={0.5}
                                maximumValue={1}
                                minimumTrackTintColor={colors.background}
                                maximumTrackTintColor={colors.primary}      
                                thumbTintColor={colors.secondary}
                            />
                        </View>
                        <Text style={{color: colors.primary, fontWeight: '600', fontSize: 14, top: 255, left: 15 + (i * 38)}}>{numstring(range)}</Text>
                    </View>
                ))
            }
        </View>
    )
}