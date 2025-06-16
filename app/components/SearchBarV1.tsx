import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { NativeSyntheticEvent, ScrollView, Text, TextInput, TextInputProps, TextInputSelectionChangeEventData, View } from "react-native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { useEffect, useRef, useState } from "react";
import { is_empty } from "../../lib-origin/origin/src/utils/util";
import { QueryFlag } from "../../lib-origin/Illusive/src/types";
import { IoniconsTouchableOpacity } from "./TouchableIconOpacity";

export default function SearchBarV1(props: TextInputProps & {query_flags?: QueryFlag<any>[]} & {background_color?: string}) {
    const { colors } = useTheme() as Prefs.Theme;
    const [flag_query_section, set_flag_query_section] = useState<string>();
    const [input_focused, set_input_focused] = useState<boolean>(false);
    const [show_clear_button, set_show_clear_button] = useState<boolean>(false);
    const input_ref = useRef<TextInput>(null);
    const query_ref = useRef<string>("");
    const autocomplete_scrollview_ref = useRef<ScrollView>(null);

    function on_selection_change(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>){
        if(query_ref.current.includes('@')){
            let start_prefix_index = e.nativeEvent.selection.start - 1;
            for(let i = start_prefix_index; i >= 0; i--){
                if(is_empty(query_ref.current[i])){
                    start_prefix_index = -1;
                    break;
                }
                if(query_ref.current[i] === '@'){
                    start_prefix_index = i;
                    break;
                }
            }
            if(start_prefix_index !== -1){
                const section = query_ref.current.slice(start_prefix_index, e.nativeEvent.selection.start);
                set_flag_query_section(section);
                autocomplete_scrollview_ref.current?.flashScrollIndicators();
            }
            else set_flag_query_section(undefined);
        }
        else set_flag_query_section(undefined);
    }

    function on_change_text(query: string){
        query_ref.current = query;
        props?.onChangeText?.(query);
        if(query.length > 0) set_show_clear_button(true);
        else set_show_clear_button(false);
    }

    useEffect(() => {
        autocomplete_scrollview_ref.current?.flashScrollIndicators();
    },[autocomplete_scrollview_ref.current])

    const filtered_query_flags = (props.query_flags ?? []).filter(flag => flag.flag.startsWith(flag_query_section ?? "-"));

    return (
        <>
            <View style={{flexDirection: 'row', height: 35, left:-5, width: '100%'}}>
                <View style={{
                    overflow: 'hidden',
                    backgroundColor: props.background_color ?? colors.searchInput,
                    paddingTop: 5,
                    paddingLeft: 5,
                    paddingRight: 5,
                    bottom: 0,
                    left: 10,
                    borderRadius:10,
                    zIndex: 1
                }}>
                    <Ionicons name="search" size={22} color={colors.searchPlaceholder} style={{top: 1, left: 2}}/>
                </View>
                <TextInput {...props} onSelectionChange={on_selection_change} ref={input_ref} onChangeText={on_change_text} 
                    onBlur={() => set_input_focused(false)} 
                    onFocus={() => set_input_focused(true)} 
                    autoCorrect={false} 
                    placeholderTextColor={colors.searchPlaceholder} style={{
                    backgroundColor: props.background_color ?? colors.searchInput,
                    color: colors.text,
                    width: '95%',
                    bottom: 0,
                    paddingLeft: 10,
                    fontSize: 15,
                    borderTopRightRadius: 10,// Top Right Corner
                    borderBottomRightRadius: 10, // Bottom Right Corner
                }}/>
                {show_clear_button ? <IoniconsTouchableOpacity icon_name="close-circle-outline" icon_color={colors.subtext} icon_size={25} icon_style={{}} on_press={() => {input_ref.current?.clear(); on_change_text("")}} hitslop={5} style={{position: 'absolute', left: '92%', top: '15%'}}/> : null}
            </View>
            {props.query_flags && flag_query_section && input_focused && filtered_query_flags.length !== 0 ? <ScrollView ref={autocomplete_scrollview_ref} style={{position: 'absolute', width: "103%", maxHeight: 400, backgroundColor: '#000000B0', top: 40, zIndex: 5, paddingHorizontal: 10}}>
                {filtered_query_flags.map(flag => (
                    <View key={flag.flag} style={{flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1}}>
                        <Text style={{color: colors.text}}>{flag.flag}</Text>
                        <View style={{width: 20}}/>
                        <Text style={{color: colors.text}}>{flag.description}</Text>
                    </View>
                ))}
            </ScrollView> : null }
        </>
    )
}