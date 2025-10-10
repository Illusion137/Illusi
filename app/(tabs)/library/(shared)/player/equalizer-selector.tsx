import { router } from "expo-router";

export default function EqualizerSelector(){
    function back(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    return (<></>);
}