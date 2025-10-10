import { router } from "expo-router";

export default function LyricsShare(){
    function back(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }
    
    return (
        <>
        </>
    );
}