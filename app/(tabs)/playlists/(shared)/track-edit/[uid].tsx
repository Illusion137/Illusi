import { GLOBALS } from "@illusive/globals";
import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";

export default function EditTrackModal(){
    const { uid } = useLocalSearchParams<{uid: string}>();
    const track_ref = useRef(GLOBALS.global_var.sql_tracks.find(track => track.uid === uid));

    return (
        <></>
    );
}