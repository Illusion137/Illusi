import usePTheme from "@hooks/usePTheme";
import { router } from "expo-router";
import { Button, Text, View } from "react-native";

export default function ModalHeader(props: {title: string}){
    const { colors } = usePTheme();
    
    function close(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    return (
        <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
            <View style={{ marginLeft: 10 }}>
                <Button color={colors.primary} title='Close' onPress={close} />
            </View>
            <Text style={{ left: 110 - (props.title.length * 2), color: "white", fontWeight: "bold", fontSize: 17 }}>{props.title}</Text>
        </View>
        // <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        //     <Button color={colors.primary} title={'Close'} onPress={close}/>
        //     <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '40%'}}>{props.title}</Text>
        // </View>
    )
}