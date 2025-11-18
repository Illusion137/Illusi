import { reinterpret_cast } from "@common/cast";
import usePTheme from "@hooks/usePTheme";
import { resolved_artwork } from "@illusive/artwork";
import type { Artwork } from "@illusive/types";
import { fs } from "@native/fs/fs";
import { BlurView, type BlurViewProps } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react"
import { Image, View, type DimensionValue, type ImageProps } from "react-native";
import type { ViewProps } from "react-native-svg/lib/typescript/fabric/utils";
import hexToRgba from 'hex-to-rgba';

export interface IImageProps {
    source: Artwork|undefined|null;
    tint?: {
        color: string;
        opacity: number;
    };
    blur?: BlurViewProps;
    fade?: {
        percent: DimensionValue;
        color?: string;
        middle_opacity?: number;
        end_opacity?: number;
    };
    useview?: boolean;
};

export default function IImage(props: Omit<ImageProps, 'source'> & IImageProps ){
    const image_height = props.height ??
    ((typeof props.style === "object" && props.style !== null && !Array.isArray(props.style) && "height" in props.style) 
        ? reinterpret_cast<{height: number}>(props.style)?.height : 0) ?? 0;
    
    const { colors } = usePTheme();
    const [source, set_source] = useState<Artwork|undefined|null>(props.source);

    const fade_end_color = hexToRgba(props.fade?.color ?? colors.background, props.fade?.end_opacity ?? 1);
    const fade_middle_color = hexToRgba(props.fade?.color ?? colors.background, props.fade?.middle_opacity ?? 0.2);

    function update_source(){
        if(typeof props.source === "number" || props.source === undefined || props.source === null) {
            set_source(props.source);
        }
        else if(typeof props.source === "string" && (props.source.includes("https:") || props.source.includes("http:"))) {
            set_source(props.source);
        }
        else if(typeof props.source === "string"){
            (async() => {
                if(typeof props.source !== "string") return;
                const source_file_info = await fs().get_info(props.source);
                if(!source_file_info.exists || source_file_info.is_directory){
                    set_source(undefined);
                }
                else {
                    set_source(props.source);
                }
            })();
        }
    }

    useEffect(() => {
        update_source();
    }, [JSON.stringify(props.source)]);

    return (
        <>
            {
                !props.useview ? 
                <>
                    {
                        !props.tint ?
                            <Image {...props} source={resolved_artwork(source)}/> 
                        : <>
                            <Image {...props} source={resolved_artwork(source)}/>
                            <View {...props} style={{...reinterpret_cast<ViewProps>(props.style), opacity: props.tint.opacity, position: 'absolute', backgroundColor: props.tint.color}}/>
                        </>
                    }
                    {
                        props.blur ? 
                            <BlurView {...props.blur} style={{
                                position: 'absolute',
                                bottom: 0,
                                height: image_height,
                                width: '100%'
                            }}/> :
                            null
                    }
                    {
                        props.fade ? 
                        <LinearGradient
                            colors={['transparent', fade_middle_color, fade_end_color]}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                height: props.fade.percent, 
                                width: '100%',
                            }}/>
                        : null
                    }
                </> :
                <View style={props.style}>
                    {
                        !props.tint ?
                            <Image {...props} source={resolved_artwork(source)}/> 
                        : <>
                            <Image {...props} source={resolved_artwork(source)}/>
                            <View {...props} style={{...reinterpret_cast<ViewProps>(props.style), opacity: props.tint.opacity, position: 'absolute', backgroundColor: props.tint.color}}/>
                        </>
                    }
                    {
                        props.blur ? 
                            <BlurView {...props.blur} style={{
                                position: 'absolute',
                                bottom: 0,
                                height: image_height,
                                width: '100%'
                            }}/> :
                            null
                    }
                    {
                        props.fade ? 
                        <LinearGradient
                            colors={['transparent', fade_middle_color, fade_end_color]}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                height: props.fade.percent, 
                                width: '100%',
                            }}/>
                        : null
                    }
                </View>
            }
        </>
    );

    // return (
    //     <>
    //         {
    //             props.fade ?
    //             (
    //                 <View style={{
    //                     position: 'relative',
    //                     width: '100%',
    //                     height: image_height,
    //                     backgroundColor: colors.background, // helps blend the fade
    //                   }}>
    //                     <RenderImageBlur/>
    //                     <LinearGradient
    //                             colors={['transparent', 'rgba(0,0,0,0.2)', colors.background]}
    //                             style={{
    //                                 position: 'absolute',
    //                                 bottom: 0,
    //                                 height: props.fade.percent, 
    //                                 width: '100%',
    //                             }}/>
    //                 </View>
    //             )
    //             : <RenderImageBlur/>
    //         }
    //     </>
    // );
}