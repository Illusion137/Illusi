import { useTheme } from "@react-navigation/native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { Animated, Dimensions, View } from "react-native";
import { createRef, useEffect } from "react";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import { LinearGradient } from 'expo-linear-gradient';


const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
export default function AlbumPlaceholder(props: {
    size?: number
}){
	const shimmer_colors = ['#ffffff', '#969696', '#ffffff'];
    const size = props.size ?? Dimensions.get('screen').width * .40;
    const { colors } = useTheme() as Prefs.Theme;

    const thumbnail_ref = createRef<any>();
    const title_ref = createRef<any>();
    const subtitle_ref = createRef<any>();

    useEffect(() => {
        const animation = Animated.parallel(
            [
                thumbnail_ref.current.getAnimated(),
                title_ref.current.getAnimated(),
                subtitle_ref.current.getAnimated(),
            ]
        );
        Animated.loop(animation).start();
    }, []);

    return (
        <View style={{padding: 5}}>
            <ShimmerPlaceholder style={{width: size, height: size, borderRadius: 5, opacity: 0.5}} ref={thumbnail_ref} shimmerColors={shimmer_colors}/>
            <View style={{width: size}}>
                <ShimmerPlaceholder style={{color: colors.text, fontWeight: 'bold', fontSize: 16, paddingTop: 5, width: size, opacity: 0.5}} ref={title_ref} shimmerColors={shimmer_colors}/>
                <ShimmerPlaceholder style={{color: colors.subtext, fontSize: 15, top: 1, width: size, opacity: 0.5}} ref={subtitle_ref} shimmerColors={shimmer_colors}/>
            </View>
        </View>
    );
}