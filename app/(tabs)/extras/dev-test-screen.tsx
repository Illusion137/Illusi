import { GLOBALS } from '@illusive/globals';
import React, { useEffect, useRef } from 'react';
import { Dimensions, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, {
    useSharedValue,
    withRepeat,
    withTiming,
    useAnimatedStyle,
    Easing,
    type SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Falling_item {
    id: number;
    x: number;
    y: SharedValue<number>;
    rotation: number;
    speed: number;
    source: any;
}


export default function ExtraDevTestScreen(){
    const images = useRef(GLOBALS.global_var.sql_tracks.slice(0, 5).map(t => t.playback?.artwork ?? 0));
    const falling_items: Falling_item[] = images.current.map((source, i) => {
        return {
            id: i,
            x: 0.5 * SCREEN_WIDTH,
            // x: Math.random() * SCREEN_WIDTH,
            y: useSharedValue(Math.random() * SCREEN_HEIGHT),
            rotation: (Math.random() - 0.5) * 30,
            speed: 10000 + Math.random() * 2000,
            source,
        };
    });

    // useEffect(() => {
    //     falling_items.forEach((item) => {
    //         item.y.value = withTiming(
    //             withTiming(SCREEN_HEIGHT, {
    //                 duration: item.speed,
    //                 easing: Easing.linear,
    //             }),
    //         );
    //     });
    // }, []);

    // console.log(falling_items.map(f => f.y.get()));

    return (
        <View style={{flex: 1}}>
            {falling_items.map((item) => {
                return (
                    <Image
                        key={item.id}
                        source={0}
                        width={50}
                        height={50}
                        style={[{ width: 50, height: 50, position: 'absolute', top: "50%", left: "50%" }]}
                        resizeMode="cover"
                    />
                );
            })}
            {/* {falling_items.map((item) => {
                const animated_style = useAnimatedStyle(() => ({
                    position: 'absolute',
                    top: "50%",
                    left: "50%",
                    transform: [{ rotate: `${item.rotation}deg` }],
                }));
                console.log(item)
                return (
                    // <Animated.Image
                    //     key={item.id}
                    //     source={item.source}
                    //     style={[animated_style, styles.album_image]}
                    //     resizeMode="cover"
                    // />
                    <Image
                        key={item.id}
                        source={0}
                        style={[{ width: 50, height: 50, position: 'absolute', top: "50%", left: item.x }]}
                        resizeMode="cover"
                    />
                );
            })} */}
        </View>
    );
}

// const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000030',
    },
    album_image: {
        width: 100,
        height: 100,
        borderRadius: 4,
        zIndex: 10
    },
});

// import { useEffect } from "react";
// import { Dimensions, StyleSheet, View } from "react-native";
// import Animated, {
//     useSharedValue,
//     withTiming,
//     withDelay,
//     Easing,
//     useAnimatedProps
// } from 'react-native-reanimated';
// import Svg, { Path, G, Circle, Mask, Defs, Rect, ClipPath } from 'react-native-svg';

// const { width: screen_width } = Dimensions.get('window');

// const SPIRAL_DRAW_DURATION_MS = 10 * 3000;
// const FLOWERS_DRAW_DURATION_MS = 10 * 3200;
// const FLOWERS_START_DELAY_MS = 700;
// const FLOWERS_POP_DURATION_MS = 1000;

// const SPIRAL_EASING = Easing.out(Easing.cubic);
// const DRAW_EASING = Easing.out(Easing.cubic);
// const POP_EASING = Easing.out(Easing.back(1.2));

// const SPIRAL_PATH = `M295.19 225.4c1.01 7.88-4.72 15.18-12.81 16.31-8.09 1.14-15.47-4.33-16.48-12.2-1.27-9.88-6.46-16.13-13.11-19.07-8.62-3.79-19.45-2.6-27.69 1.57-9.28 4.71-16.69 13.82-17.75 26.85-.88 10.83 1.84 21.41 7.4 30.69 6.17 10.3 15.26 18.4 25.68 24.23 16.3 9.11 33.06 11.66 48.47 9.3 17.05-2.61 32.66-11.18 44.4-23.52 8.94-9.41 15.63-20.99 18.97-33.77 3.12-11.89 3.36-24.9-.13-38.25l-.52-1.96c-8.71-31.27-28.89-56.11-54.67-71.05-57.13-33.14-129.12-12.08-161.65 44.79-39.53 69.14-1.35 154.36 63.54 192.02 35.35 20.5 78.39 27.53 121 16.39l2.69-.71c87.46-24.46 138.37-115.77 115.51-203.23l-.87-3.22c-15.18-54.65-50.46-98.05-95.53-124.19l-.05.02c-70.99-41.2-158.8-35.41-224.17 12.33-20.51 14.98-38.03 33.56-51.87 54.58-53.67 81.53-45.28 179.1 11.52 255.61 18.06 24.34 40.61 45.75 66.41 62.73 56.02 36.89 127.34 52.71 201.28 32.27 7.87-2.21 15.97 2.2 18.09 9.83 2.12 7.64-2.54 15.63-10.41 17.84-83.12 22.99-163.13 5.3-225.85-36-28.5-18.76-53.47-42.48-73.52-69.5-63.99-86.22-72.58-196.42-12.24-288.07 15.73-23.88 35.73-45.06 59.25-62.23C175.01-8.92 275.64-15.75 357.05 31.5c51.24 29.79 91.35 79.02 108.58 140.92l1.01 3.69c26.89 102.9-33.66 209.84-136.33 238.55l-3.24.9c-50.64 13.24-101.71 4.92-143.58-19.37-78.63-45.62-121.35-147.6-73.94-230.51 40.72-71.2 131.29-97.47 202.76-56.01 31.99 18.56 57 49.23 67.78 87.76l.66 2.43c4.77 18.27 4.41 36.16.11 52.6-4.63 17.67-13.83 33.63-26.12 46.55-16.22 17.05-37.9 28.91-61.68 32.55-21.79 3.34-45.21-.13-67.67-12.67-14.63-8.18-27.61-20.05-36.26-34.48-8.66-14.45-12.56-30.51-11.18-47.32 1.98-24.36 16.16-41.55 33.97-50.57 16.39-8.32 36.42-9.88 53.42-2.37 15.33 6.77 27.17 20.36 29.85 41.25z`;

// const SPIRAL_CENTERLINE_PATH = `
//     M236 256
//     m 0 -8
//     a 8 8 0 1 1 0 16
//     a 16 16 0 1 0 0 -32
//     a 24 24 0 1 1 0 48
//     a 32 32 0 1 0 0 -64
//     a 40 40 0 1 1 0 80
//     a 48 48 0 1 0 0 -96
// `;

// const BIG_FLOWER_PETALS = `
//     M150 150
//     C150 90 210 90 210 150
//     C210 210 150 210 150 150

//     M150 150
//     C150 90 90 90 90 150
//     C90 210 150 210 150 150

//     M150 150
//     C90 150 90 90 150 90
//     C210 90 210 150 150 150

//     M150 150
//     C90 150 90 210 150 210
//     C210 210 210 150 150 150
// `;
// const SMALL_FLOWER_LEFT_PETALS = `
//     M85 145
//     C85 120 110 120 110 145
//     C110 170 85 170 85 145

//     M85 145
//     C85 120 60 120 60 145
//     C60 170 85 170 85 145
// `;

// const SMALL_FLOWER_BOTTOM_PETALS = `
//     M165 205
//     C165 180 190 180 190 205
//     C190 230 165 230 165 205

//     M165 205
//     C165 180 140 180 140 205
//     C140 230 165 230 165 205
// `;


// const AnimatedPath = Animated.createAnimatedComponent(Path);
// const AnimatedRect = Animated.createAnimatedComponent(Rect);

// export function FilledSpiral() {
//     const reveal_progress = useSharedValue(0);

//     useEffect(() => {
//         reveal_progress.value = withTiming(1, {
//             duration: SPIRAL_DRAW_DURATION_MS,
//             easing: SPIRAL_EASING
//         });
//     }, []);

//     const reveal_rect_props = useAnimatedProps(() => ({
//         height: reveal_progress.value * 520
//     }));

//     return (
//         <View style={styles.container}>
//             <Svg
//                 width={screen_width * 0.25}
//                 height={screen_width * 0.25}
//                 viewBox="0 0 473.02 511.76"
//             >
//                 <Defs>
//                     <ClipPath id="spiral_clip">
//                         <AnimatedRect
//                             animatedProps={reveal_rect_props}
//                             x={0}
//                             y={0}
//                             width={473.02}
//                         />
//                     </ClipPath>
//                 </Defs>

//                 <Path
//                     d={SPIRAL_PATH}
//                     fill="white"
//                     clipPath="url(#spiral_clip)"
//                     fillRule="evenodd"
//                 />
//             </Svg>
//         </View>
//     );
// }

// export default function ExtraDevTestScreen(){
//     const spiral_progress = useSharedValue(1);
//     const flowers_progress = useSharedValue(1);
//     const flowers_scale = useSharedValue(0.9);

//     useEffect(() => {
//         spiral_progress.value = withTiming(0, {
//             duration: SPIRAL_DRAW_DURATION_MS,
//             easing: DRAW_EASING
//         });

//         flowers_progress.value = withDelay(
//             FLOWERS_START_DELAY_MS,
//             withTiming(0, {
//                 duration: FLOWERS_DRAW_DURATION_MS,
//                 easing: DRAW_EASING
//             })
//         );

//         flowers_scale.value = withDelay(
//             FLOWERS_START_DELAY_MS,
//             withTiming(1, {
//                 duration: FLOWERS_POP_DURATION_MS,
//                 easing: POP_EASING
//             })
//         );
//     }, []);

//     const spiral_animated_props = useAnimatedProps(() => ({
//         strokeDashoffset: spiral_progress.value * 1200
//     }));

//     const flowers_animated_props = useAnimatedProps(() => ({
//         strokeDashoffset: flowers_progress.value * 3000
//     }));
// //<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox=""><path fill-rule="nonzero" d=""/></svg>
//     return (
//         <View style={styles.container}>
//             {/* Spiral */}
//             {/* <View style={styles.spiral_container}> */}
//                 <FilledSpiral/>
//             {/* </View> */}

//             {/* Flowers */}
//             {/* <Animated.View
//                 style={[
//                     styles.flowers_container,
//                     { transform: [{ scale: flowers_scale }] }
//                 ]}
//             >
//                 <Svg
//                     width={screen_width * 0.34}
//                     height={screen_width * 0.34}
//                     viewBox="0 0 300 300"
//                 >
//                     <G
//                         fill="none"
//                         stroke="white"
//                         strokeWidth={3}
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                     >
//                         <AnimatedPath
//                             animatedProps={flowers_animated_props}
//                             d={BIG_FLOWER_PETALS}
//                             strokeDasharray="3000"
//                         />
//                         <Circle cx={150} cy={150} r={10} fill="white" />

//                         <AnimatedPath
//                             animatedProps={flowers_animated_props}
//                             d={SMALL_FLOWER_LEFT_PETALS}
//                             strokeDasharray="3000"
//                         />
//                         <Circle cx={85} cy={145} r={6} fill="white" />

//                         <AnimatedPath
//                             animatedProps={flowers_animated_props}
//                             d={SMALL_FLOWER_BOTTOM_PETALS}
//                             strokeDasharray="3000"
//                         />
//                         <Circle cx={165} cy={205} r={6} fill="white" />
//                     </G>
//                 </Svg>
//             </Animated.View> */}

//             {/* Content */}
//             <View style={styles.content_container}>
//                 {/* {props.children} */}
//             </View>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: 'black'
//     },
//     content_container: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         zIndex: 2
//     },
//     spiral_container: {
//         position: 'absolute',
//         bottom: 100,
//         left: 0,
//         zIndex: 1
//     },
//     flowers_container: {
//         position: 'absolute',
//         top: 0,
//         right: 0,
//         zIndex: 1
//     }
// });