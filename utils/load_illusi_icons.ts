import { illusi_icons_icon_map } from "@illusive/illusi_icons";

const illusi_icon = require("../assets/icon.png");
const illusi_dark_icon = require("../assets/dark.png");
const imported_thumbnail = require("../assets/imported.png");
const sudo_profile_picture = require("../assets/sudo.jpg");
const sumi_profile_picture = require("../assets/sumi.jpg");
const illusi_icon_transparent = require("../assets/icon_transparent.png");

export async function load_illusi_icons(){
    illusi_icons_icon_map.length = 0;
    illusi_icons_icon_map.push(
        ...[
            illusi_icon,
            illusi_dark_icon,
            imported_thumbnail,
            sudo_profile_picture,
            sumi_profile_picture,
            illusi_icon_transparent
        ]
    );
}