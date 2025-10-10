import { reinterpret_cast } from "@common/cast";
import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AudioPlayerLyrics(){
    const { lyrics_uri } = useLocalSearchParams<{lyrics_uri: string}>();

    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    const [lyrics, set_lyrics] = useState<string>("");

    function close(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    useEffect(() => {
        (async() => {
            const read_lyrics = await SQLTracks.read_track_lyrics(reinterpret_cast<Track>({lyrics_uri}));
            if(read_lyrics === undefined || typeof read_lyrics === "object"){
                close();
                return;
            }
            set_lyrics(read_lyrics);
        })();
    }, [lyrics_uri]);

    return (
        <>
            <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                <View style={{ marginLeft: 10 }}>
                    <Button color={colors.primary} title='close' onPress={close } />
                </View>
                <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Lyrics</Text>
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
                { is_empty(lyrics) ? 
                    <Text style={styles.lyrics_text}>Unable to find lyrics for this song</Text>
                    : lyrics
                    .split('\n')
                    .map(line => /\[.+?\]/.test(line) ? '' : line)
                    .map((line, i) => (
                        <Text key={line + i} style={styles.lyrics_text}>
                            {line}
                        </Text>
                ))}
            </ScrollView>
        </>
    );
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    lyrics_text: {
        color: colors.text,
        fontWeight: 'bold',
        width: "85%",
        fontSize: 24,
        margin: 15,
        marginVertical: 10
    }
});