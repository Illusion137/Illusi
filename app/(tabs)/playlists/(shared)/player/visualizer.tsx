import { router } from "expo-router";

export default function AudioPlayerVisualizer(){
    function close(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    return (<></>);
}