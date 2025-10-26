import { is_empty } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { ExampleObj } from "@illusive/illusi/src/example_objs";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { UITextView } from "react-native-uitextview";

// TODO add little top progress bar to show how far in the lyrcics you are and stuff :3
// TODO make the little blurred background effect
export default function AudioPlayerLyrics(){
    const { lyrics_uri } = useLocalSearchParams<{lyrics_uri: string}>();

    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    const [lyrics, set_lyrics] = useState<string>("");
    const [content_height, set_content_height] = useState(0);
    const [scrollview_height, set_scrollview_height] = useState(0);
    const scrollview_ref = useRef<ScrollView>(null);

    async function get_trackplayer_progress(){
        const progress_info = await TrackPlayer.getProgress();
        return progress_info.position / progress_info.duration;
    }
  
    useEffect(() => {
        (async () => {
            if (content_height > 0 && scrollview_height > 0) {
                const max_scrollable = content_height - scrollview_height;
                const target_offest = max_scrollable * await get_trackplayer_progress();
                scrollview_ref.current?.scrollTo({
                    y: target_offest,
                    animated: true,
                });
            }
        })()
    }, [content_height, scrollview_height]);
  

    async function load_lyrics(track_lyrics_uri: string){
        const read_lyrics = await SQLTracks.read_track_lyrics({...ExampleObj.track_example0, lyrics_uri: track_lyrics_uri});
        if(read_lyrics === undefined || typeof read_lyrics === "object"){
            close();
            return;
        }
        set_lyrics(read_lyrics);
    }

    useEffect(() => {
        (async() => {
            await load_lyrics(lyrics_uri);
        })();
    }, [lyrics_uri]);

    function close(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async() => {
        const current_track_index = await TrackPlayer.getActiveTrackIndex() ?? 0;
        const new_track = GLOBALS.global_var.playing_tracks[current_track_index];
        if(is_empty(new_track.lyrics_uri)){
            close();
        }
        else {
            await load_lyrics(new_track.lyrics_uri!);
        }
    })

    return (
        <>
            <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                <ModalHeader title={"Lyrics"}/>
            </View>            
            <ScrollView 
                ref={scrollview_ref}
                onLayout={(e: LayoutChangeEvent) => set_scrollview_height(e.nativeEvent.layout.height)}
                onContentSizeChange={(_, h) => set_content_height(h)} 
                style={{ flex: 1, backgroundColor: colors.background }}
            >
                { is_empty(lyrics) ? 
                    <UITextView uiTextView={true} style={styles.lyrics_text}>Unable to find lyrics for this song</UITextView>
                    : 
                    <UITextView  uiTextView={true} selectable={true} selectionColor={colors.primary} style={styles.lyrics_text}>
                        {    
                        lyrics
                            .split('\n')
                            .map(line => /\[.+?\]/.test(line) ? '' : line)
                            .map((line, i) => (
                                <UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} key={line + i} style={styles.lyrics_text}>
                                    {line+ '\n'}
                                </UITextView>)
                            )
                        }
                    </UITextView>
                }
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