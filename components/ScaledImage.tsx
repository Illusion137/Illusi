import { useEffect, useState } from "react"
import { ActivityIndicator, ImageStyle, StyleProp } from "react-native"
import { Artwork } from "@illusive/types";
import IImage, { type IImageProps } from "./IImage";

// https://stackoverflow.com/questions/42170127/auto-scale-image-height-with-react-native
export default function ScaledImage(props: {
    artwork: Artwork|undefined, 
    width?: number, 
    height?: number, 
    style: StyleProp<ImageStyle>,
    tint?: IImageProps['tint'];
    set_size?: (val: {width: number, height: number}) => any}) {
    const [width, set_width] = useState<number>();
    const [height, set_height] = useState<number>();
    const [image_loading, set_image_loading] = useState<boolean>(true);

    useEffect(() => {
        set_width(props.width);
        set_height(props.width);
        props.set_size?.({width: props.width!, height: props.width!});
        set_image_loading(false);
        // Image.getSize(typeof props.artwork === "object" ? props.artwork.uri : props.artwork as any, (width1, height1) => {
        //     width1; height1;
        //     set_width(props.width);
        //     set_height(props.width);
        //     props.set_size?.({width: props.width!, height: props.width!});
        //     // if (props.width && !props.height) {
        //     //     set_width(props.width);
        //     //     set_height(props.width);
        //     //     props.set_size?.({width: props.width, height: props.width});
        //     //     // set_height(height1 * (props.width / width1));
        //     // } else if (!props.width && props.height) {
        //     //     set_width(width1 * (props.height / height1));
        //     //     set_height(props.height);
        //     // } else {
        //     //     set_width(width1);
        //     //     set_height(height1);
        //     // }
        //     set_image_loading(false);
        // }, (error) => {
        //     set_width(props.width);
        //     set_height(props.width);
        //     props.set_size?.({width: props.width!, height: props.width!});
        //     set_image_loading(false);
        //     console.error(error);
        // })
    }, [props.artwork, props.width, props.height, props.style]);


    return (
        height ?
            <IImage
                tint={props.tint} 
                source={props.artwork}
                style={{ ...props.style as object, height: height, width: width }}
            />
            : image_loading ?
                <ActivityIndicator size="large" />
                : null
    );
}