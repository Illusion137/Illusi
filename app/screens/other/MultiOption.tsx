import { FlatList, StyleSheet, Text, TouchableHighlight, View } from "react-native";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Route, SetState } from "../../../lib-origin/Illusive/src/types";
import { useState } from "react";

function OptionItem(props: {
    title: string,
    selected_option: string,
    set_selected_option: SetState,
    on_press: (mode: string) => void
}){
    const { colors } = useTheme() as Prefs.Theme;
    const styles = theme_styles(colors);

    return (
    <>
        <TouchableHighlight 
            activeOpacity={0.6} 
            underlayColor="#FFFFFF"
            onPress={() => {
                props.on_press(props.title);
                props.set_selected_option(props.title);
            }}>
            <View style={styles.importfrom}>
                <Text style={styles.importfromtext}>{props.title}</Text>
                <View style={{flex:1, alignItems: 'flex-end'}}>
                    {props.title === props.selected_option && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
                </View>
            </View>
        </TouchableHighlight>
        <View style={styles.line}/>
    </>
    )
}

export default function MultiOption(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{options: string[], current_value: string, press: () => void}>;
    
    const { colors } = useTheme() as Prefs.Theme;
    
    const [selected, set_selected] = useState(ts_route.params.current_value);
    const render_item = (item: {item: string}) => <OptionItem on_press={ts_route.params.press} title={item.item} selected_option={selected} set_selected_option={set_selected}/>;

    return (
        <View style={{backgroundColor: colors.background, flex: 1}}>
            <FlatList data={ts_route.params.options} renderItem={render_item} ListFooterComponent={() => (<View style={{height: 100}}></View>)}/>
        </View>
    )
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    importfrom:{
        height: 45,
        width: '100%',
        backgroundColor: colors.track,
        flexDirection: 'row',
        alignItems: 'center',
    },
    importfromtext:{
        color: '#FFFFFF',
        fontSize: 16
    },
    line:{
        width: '100%',
        height: 0.8,
        backgroundColor: colors.line,
        marginHorizontal: 10,
    },
    descriptiontxt:{
        color: colors.subtext,
        marginTop: 10,
        marginBottom: 20,
        marginHorizontal: 12,
        textAlign: 'left'
    },
});