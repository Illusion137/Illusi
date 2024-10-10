import { Modal } from "react-native";
import { Track } from "../../../lib-origin/Illusive/src/types";

export default function EditTrackModal(props: {
    track: Track
    visible: boolean
}){
    return (
        <Modal
        animationType="slide"
        visible={props.visible}
        presentationStyle={'pageSheet'}>
            <></>
        </Modal>
    );
}