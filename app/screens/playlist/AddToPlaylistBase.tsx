import * as SQLActions from "../../../lib-origin/Illusive/src/illusi/src/sql_actions";
import { NavigationProp, useNavigation, useTheme } from "@react-navigation/native";
import { CompactPlaylistData } from "../../../lib-origin/Illusive/src/types";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { Button, StyleSheet, Text, View } from "react-native";
import BigList from "react-native-big-list";
import CompactWriterPlaylistComponent from "../../components/CompactWriterPlaylistComponent";
import { useEffect, useState } from "react";
import { compact_playlists, default_compact_playlists } from "../../../lib-origin/Illusive/src/illusi/src/default_playlists";
import { Route } from "../../../lib-origin/Illusive/src/types";

export default function AddToPlaylistBase(params: {route:  Route<unknown>}){
	const navigation: NavigationProp<any, any> & {push: (route: string, params: any) => void} = useNavigation();

    const ts_route = params.route as Route<{write_playlist_uuid: string}>;
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

    const [illusi_playlists, set_illusi_playlists] = useState<CompactPlaylistData[]>([]);
    const [playlists, set_playlists] = useState<CompactPlaylistData[]>([]);

    useEffect(() => {
        (async() => {
            await SQLActions.fetch_track_data();
            set_illusi_playlists(await default_compact_playlists());
            set_playlists(await compact_playlists());
        })()
    }, []);

    const compact_playlist_component = (item: {item: CompactPlaylistData}) => (
        <CompactWriterPlaylistComponent playlist_data={item.item} write_playlist_uuid={ts_route.params.write_playlist_uuid}/>
    );

    return (
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <View style={styles.header}>
                <View style={{left: 5}}>
                    <Button title="Back" color={colors.primary} onPress={navigation.goBack}/>
                </View>
            </View>
            <View style={styles.list_break}>
                <Text style={styles.header_title}>Illusi Playlists</Text>
            </View>
            <View style={{height: '27%'}}>
                <BigList
                    data={illusi_playlists}
                    renderItem={compact_playlist_component}
                    renderFooter={null}
                    renderHeader={null}
                    keyExtractor={(_, i) => String(i)}
                    itemHeight={61}
                />
            </View>
            <View style={styles.list_break}>
                <Text style={styles.header_title}>Your Playlists</Text>
            </View>
            <BigList 
                style={{height: '60%'}}
                data={playlists}
                renderItem={compact_playlist_component}
                renderFooter={null}
                renderHeader={null}
                keyExtractor={(_, i) => String(i)}
                itemHeight={61}
            />
        </View>
    )
}

const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
    header: {
        width: "100%",
        height: 90,
        alignItems: 'flex-start',
        justifyContent: "flex-end",
        color: colors.card
    },
    header_title: {
        paddingLeft: 10,
        padding: 5,
        color: colors.text,
        fontSize: 16,
        fontWeight: '800'
    },
    list_break: {
        width: "100%",
        height: "5%",
        alignItems: 'flex-start',
        justifyContent: "center",
        color: colors.card
    }
});