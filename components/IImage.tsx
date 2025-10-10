import { reinterpret_cast } from "@common/cast";
import { resolved_artwork } from "@illusive/artwork";
import type { Artwork } from "@illusive/types";
import { fs } from "@native/fs/fs";
import { useEffect, useState } from "react"
import { Image, View, type ImageProps } from "react-native";
import type { ViewProps } from "react-native-svg/lib/typescript/fabric/utils";

export interface IImageProps {
    source: Artwork|undefined|null;
    tint?: {
        color: string;
        opacity: number;
    }
};

export default function IImage(props: Omit<ImageProps, 'source'> & IImageProps ){
    const [source, set_source] = useState<Artwork|undefined|null>(props.source);
    useEffect(() => {
        if(typeof source !== "string") return;
        if(source.includes("https:") || source.includes("http:")) return;
        (async() => {
            const source_file_info = await fs().get_info(source);
            if(!source_file_info.exists || source_file_info.is_directory){
                set_source(undefined);
            }
        })();
    }, [props.source]);

    return (!props.tint ? <Image {...props} source={resolved_artwork(source)}/> 
        :
        <>
            <Image {...props} source={resolved_artwork(source)}/>
            <View {...props} style={{...reinterpret_cast<ViewProps>(props.style), opacity: props.tint.opacity, position: 'absolute', backgroundColor: props.tint.color}}/>
        </>);
}