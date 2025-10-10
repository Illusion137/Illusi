import type { Prefs } from "@illusive/prefs";
import { StyleSheet } from "react-native";

export const get_common_styles = (colors: Prefs.Theme["colors"]) =>
    StyleSheet.create({
        description_txt: {
            color: colors.subtext,
            marginTop: 10,
            marginBottom: 20,
            marginHorizontal: 12,
            textAlign: "left"
        },
        line_long: {
            width: "100%",
            height: 0.4,
            opacity: 0.1,
            backgroundColor: colors.text
        },
        line_short: {
            width: "100%",
            height: 0.4,
            opacity: 0.1,
            backgroundColor: colors.text,
            marginLeft: 42
        }
});