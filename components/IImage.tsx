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
    }, [props.source, props]);

    return (!props.tint ? <Image {...props} source={resolved_artwork(source)}/> 
        :
        <>
            <Image {...props} source={resolved_artwork(source)}/>
            <View {...props} style={{...reinterpret_cast<ViewProps>(props.style), opacity: props.tint.opacity, position: 'absolute', backgroundColor: props.tint.color}}/>
        </>);
}