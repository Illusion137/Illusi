import { illusi_icons_icon_map } from "@illusive/illusi_icons";

const illusi_icon = require("../assets/icon.png");
const illusi_dark_icon = require("../assets/dark.png");
const imported_thumbnail = require("../assets/imported.png");

export async function load_illusi_icons(){
    illusi_icons_icon_map.length = 0;
    illusi_icons_icon_map.push(
        ...[
            illusi_icon,
            illusi_dark_icon,
            imported_thumbnail
        ]
    );
}