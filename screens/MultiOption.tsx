import { FlatList, StyleSheet, Text, TouchableHighlight, View } from "react-native";
import { Prefs } from "@illusive/prefs";
import { Ionicons } from "@expo/vector-icons";
import { SetState } from "@illusive/types";
import { useState } from "react";
import usePTheme from "@hooks/usePTheme";
import { single_case } from "@common/utils/util";

function OptionItem(props: {
    title: string,
    selected_option: string,
    set_selected_option: SetState,
    on_press: (mode: string) => void
}){
    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    const display_title = props.title.split('_').map(single_case).join(' ');

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
                <Text style={styles.importfromtext}>{display_title}</Text>
                <View style={{flex:1, alignItems: 'flex-end'}}>
                    {props.title === props.selected_option && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 25}}/>}
                </View>
            </View>
        </TouchableHighlight>
        <View style={styles.line}/>
    </>
    )
}

export default function MultiOption(props: {
    options: string[];
    current_value: string;
    on_press: (mode: string) => void;
}){
    const { colors } = usePTheme();
    
    const [selected, set_selected] = useState(props.current_value);
    const render_item = (item: {item: string}) => <OptionItem on_press={props.on_press} title={item.item} selected_option={selected} set_selected_option={set_selected}/>;

    return (
        <View style={{backgroundColor: colors.background, flex: 1}}>
            <FlatList data={props.options} renderItem={render_item} ListFooterComponent={() => (<View style={{height: 100}}></View>)}/>
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
        fontSize: 16,
        left: 10
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