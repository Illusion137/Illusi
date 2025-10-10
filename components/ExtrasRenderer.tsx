import usePTheme from "@hooks/usePTheme";
import { get_common_styles } from "@utils/common_styles";
import { extras_layout, type CustomComponents } from "@utils/extras";
import ExtrasSectionButton from "./ExtrasSectionButton";
import { Text, View, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import SegmentedControl, { type NativeSegmentedControlIOSChangeEvent } from "@react-native-segmented-control/segmented-control";
import { Prefs } from "@illusive/prefs";
import { single_case } from "@common/utils/util";
import { GLOBALS } from "@illusive/globals";
import { reinterpret_cast } from "@common/cast";

function ExtrasThemeSelector(){
    const { colors } = usePTheme();

    async function change_theme(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>) {
        const theme_key = reinterpret_cast<Prefs.PossibleThemes>(event.nativeEvent.value.toLowerCase());
        await Prefs.save_pref("theme", theme_key);
        Prefs.pref_set_theme(GLOBALS.global_var.set_theme);
    }

    return (<SegmentedControl 
        values={Prefs.all_themes().map((val) => single_case(val))} 
        selectedIndex={Prefs.all_themes().findIndex((item) => item === Prefs.get_pref("theme"))}
        onChange={async (event) => await change_theme(event)}
        style={{ backgroundColor: colors.background }} 
        fontStyle={{ color: colors.text }} />
    );
}

function ExtrasCustomComponentRenderer(props: { component: CustomComponents }){
    switch(props.component){
        case "theme_selector": return ExtrasThemeSelector();
        default: return (<></>);
    }
}

export default function ExtrasRenderer(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    return extras_layout().map((item, i) => (
        <View key={item.description + String(i)}>
            {
                item.condition === undefined || item.condition() ? 
                <>
                    <View style={common_styles.line_long} />
                    {
                        item.buttons.map((btn, j) => (
                            <View key={btn.title + String(i)}>
                                {j !== 0 ? <View style={common_styles.line_short} /> : null}
                                <ExtrasSectionButton show_arrow={"href" in btn} text={btn.title} icon={btn.icon} indev={btn.indev} onPress={() => "href" in btn ? router.navigate(btn.href) : btn.on_press()} />
                            </View>
                        ))
                    }
                    {
                        item.custom_components?.map((component, j) => 
                            <ExtrasCustomComponentRenderer key={component + String(j)} component={component}/>
                        )
                    }
                    <View style={common_styles.line_long} />
                    <Text style={common_styles.description_txt}>{item.description}</Text>
                </> : null
            }
        </View>
    ))
}