import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';
import * as SQLTracks from '../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import * as SQLUtils from '../../lib-origin/Illusive/src/illusi/src/sql/sql_utils';
import * as SQLfs from '../../lib-origin/Illusive/src/illusi/src/sql/sql_fs';
import { artist_string, duration_to_string } from '../../lib-origin/Illusive/src/illusive_utilts';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { EditMode, Track } from '../../lib-origin/Illusive/src/types';
import { is_empty } from '../../lib-origin/origin/src/utils/util';
import { push_track_to_playing_queue, play, play_track_next } from '../../lib-origin/Illusive/src/illusi/src/play';
import { delete_track, insert_into_write_playlist, download_track } from '../../lib-origin/Illusive/src/illusi/src/components/track';
import { Constants } from '../../lib-origin/Illusive/src/constants';
import { IoniconsTouchableOpacity } from './TouchableIconOpacity';
import { upload_track_thumbnail } from '../../lib-origin/Illusive/src/illusi/src/document_picker';
import { Illusive } from '../../lib-origin/Illusive/src/illusive';
import { Navigator } from '../../lib-origin/Illusive/src/illusi/src/types';
import { ContextMenuView, MenuElementConfig } from 'react-native-ios-context-menu';
import { undownload_track } from '../../lib-origin/Illusive/src/illusi/src/downloader';
import { try_download_track_lyrics, undownload_track_lyrics } from '../../lib-origin/Illusive/src/illusi/src/lyrics';
import { if_confirm } from '../../lib-origin/Illusive/src/illusi/src/illusi_utils';
import { play_track_discord_send } from '../../lib-origin/Illusive/src/discord';

const discord_app_icon = Image.resolveAssetSource(require("../../assets/discord.png"));

function TrackComponent(props: {
		track_data: Track;
		write_playlist_uuid?: typeof Constants.library_write_playlist | string;
		from?: string;
        playlist_uuid?: string;
		edit_mode?: EditMode;
		display_plays?: boolean;
        track_callback?: () => Track[];
		refresh_data?: () => Promise<void>;
		add_from?: (show: boolean, track: Track|null) => any;
		trim_track?: (show: boolean, track_data: Track|null) => any;
		view_info?: (show: boolean, track_data: Track|null) => any;
	}) {

	const navigation: Navigator = useNavigation();

	const [artwork, set_artwork] = useState( props.track_data.playback?.artwork );
	const [is_downloading, set_is_downloading] = useState( GLOBALS.downloading.findIndex((item) => item.uid == props.track_data.uid) !== -1);
	const [is_downloaded, set_is_downloaded] = useState(!is_empty(props.track_data.media_uri));
	const [is_thumbnail_downloaded, set_is_thumbnail_downloaded] = useState(!is_empty(props.track_data.thumbnail_uri));
	const [is_lyrics_downloaded, set_is_lyrics_downloaded] = useState(!is_empty(props.track_data.lyrics_uri));
	const [playlist_saved, set_playlist_saved] = useState(
		((props.track_data.downloading_data?.playlist_saved ?? false) 
		&& props.write_playlist_uuid !== Constants.library_write_playlist) 
		|| ((props.track_data.downloading_data?.saved ?? false) && props.write_playlist_uuid === Constants.library_write_playlist));
		const [downloading_progress, set_downloading_progress] = useState(0);
		const [is_playing_music, set_is_playing_music] = useState(GLOBALS.global_var.is_playing);

	const [target_view_node, set_target_view_node] = useState();
	
    const disabled_from_write_playlist = props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist;
    const notdisabled_from_write_playlist = disabled_from_write_playlist ? !is_empty(props.track_data.media_uri) : false;
	const disabled_from_edit_mode = props.edit_mode !== undefined && props.edit_mode  !== "NONE";

	const tint = GLOBALS.global_var.tint_table.get(props.track_data.uid);

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    let outer_interval: any;
    let interval: any;
	useEffect(() => {
		outer_interval = setInterval(() => {
			const index = GLOBALS.downloading.findIndex(item => item?.uid === props.track_data.uid);
			const is_currently_downloading = index !== -1;
			if(is_currently_downloading){
				clearInterval(outer_interval);
				set_is_downloading(true);
				set_downloading_progress(GLOBALS.downloading[index]?.progress);
				interval = setInterval(() => {
					const inner_depth = Constants.download_queue_max_length;
					const inner_index = GLOBALS.downloading.slice(0, inner_depth).findIndex(item => item?.uid === props.track_data.uid);
					if(inner_index === -1){
						set_is_downloading(false);
						clearInterval(interval);
						const idx = GLOBALS.global_var.sql_tracks.findIndex(item => item.uid === props.track_data.uid);
						if(idx !== -1 && !is_empty(GLOBALS.global_var.sql_tracks[idx].media_uri))
							set_is_downloaded(true);
						return;
					}
					set_downloading_progress(GLOBALS.downloading[index]?.progress);
				}, 2000);
			}
		}, 2000);
        return () => {
			clearInterval(outer_interval);
			clearInterval(interval);
		};
    }, []);
  
	useEffect(() => {
	  	return () => {
			set_target_view_node(undefined);
		}
	}, []);

	useEffect(() => {
		set_artwork(props.track_data.playback!.artwork);
		set_is_downloaded(!is_empty(props.track_data.media_uri));
		set_is_lyrics_downloaded(!is_empty(props.track_data.lyrics_uri));
		set_is_thumbnail_downloaded(!is_empty(props.track_data.thumbnail_uri));
	}, [props.track_data]);

	const menuconfig_more: MenuElementConfig[] = [
		{
			actionKey: "track-push-discord",
			actionTitle: "Push Discord",
			icon: {
				iconType: 'REQUIRE',
				iconValue: discord_app_icon,
			},
			menuAttributes: is_empty(Prefs.get_pref('discord_webhook_url')) || !is_empty(props.track_data.imported_id) ? ['hidden'] : undefined
		},
		{
			actionKey: "track-trim-media",
			actionTitle: "Trim Media",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'timeline.selection',
				},
			},
			menuAttributes: !is_downloaded ? ['hidden'] : undefined
		},
		{
			actionKey: "track-view-info",
			actionTitle: "View Track Info",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'scope',
				},
			},
		},
		props.track_data.artists.length <= 1 ? {
			actionKey: "track-view-artist",
			actionTitle: "View Artist",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'music.mic',
				},
			},
			menuAttributes: is_empty(props.track_data.artists[0].uri) ? ['hidden'] : undefined
		} : {
			menuTitle: "View Artists",
			menuItems: props.track_data.artists.map((artist, i): MenuElementConfig => ({
				actionKey: `track-view-artist-${i}`,
				actionTitle: `View Artist - ${artist.name}`,
				icon: {
					type: 'IMAGE_SYSTEM',
					imageValue: {
						systemName: 'music.mic',
					},
				},
				menuAttributes: is_empty(props.track_data.artists[i].uri) ? ['hidden'] : undefined
			}))
		},
		{
			actionKey: "track-view-album",
			actionTitle: "View Album",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'list.bullet',
				},
			},
			menuAttributes: is_empty(props.track_data.album?.uri) ? ['hidden'] : undefined
		},
		{
			menuTitle: "Share",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'square.and.arrow.up',
				},
			},
			menuItems: [
				{
					actionKey: "track-share-original",
					actionTitle: "Raw Link",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'link',
						},
					},
				},
				{
					actionKey: "track-share-downloaded",
					actionTitle: "Downloaded File",
					menuAttributes: !is_downloaded ? ['hidden'] : undefined,
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'folder.circle',
						},
					},
				},
			]
		},
		{
			menuTitle: "Offline",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'arrow.down.circle.dotted',
				},
			},
			menuItems: [
				{
					actionKey: "track-download-media",
					actionTitle: "Download Media",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'arrow.down.circle',
						},
					},
					menuAttributes: is_downloaded ? ['hidden'] : undefined
				},
				{
					actionKey: "track-delete-media",
					actionTitle: "Delete Media",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'trash',
						},
					},
					menuAttributes: !is_downloaded ? ['hidden'] : ['destructive']
				},
				{
					actionKey: "track-download-lyrics",
					actionTitle: "Download Lyrics",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'arrow.down.circle',
						},
					},
					menuAttributes: is_lyrics_downloaded ? ['hidden'] : undefined
				},
				{
					actionKey: "track-delete-lyrics",
					actionTitle: "Delete Lyrics",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'trash',
						},
					},
					menuAttributes: !is_lyrics_downloaded ? ['hidden'] : ['destructive']
				},
			]
		},
		{
			menuTitle: "Artwork",
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'photo',
				},
			},
			menuItems: [
				{
					actionKey: "track-download-thumbnail",
					actionTitle: "Download Thumbnail",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'arrow.down.circle',
						},
					},
					menuAttributes: is_thumbnail_downloaded ? ['hidden'] : undefined
				},
				{
					actionKey: "track-upload-artwork",
					actionTitle: "Upload Artwork",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'photo.artframe',
						},
					}
				},
				{
					actionKey: "track-remove-artwork",
					actionTitle: "Remove Artwork",
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'trash',
						},
					},
					menuAttributes: !is_thumbnail_downloaded ? ['hidden'] : ['destructive']
				},
			]
		},
		{
			menuTitle: "Destructive",
			menuOptions: ['destructive'],
			icon: {
				type: 'IMAGE_SYSTEM',
				imageValue: {
					systemName: 'trash',
				},
			},
			menuItems: [
				{
					actionKey: "track-delete",
					actionTitle: "Delete",
					menuAttributes: ['destructive'],
					icon: {
						type: 'IMAGE_SYSTEM',
						imageValue: {
							systemName: 'trash',
						},
					}
				},
			]
		}
	];
	const menuconfig_more_options: MenuElementConfig = 						{
		menuTitle: "More Options",
		menuItems: menuconfig_more,
		icon: {
			type: 'IMAGE_SYSTEM',
			imageValue: {
				systemName: 'option',
			},
		}
	};

	return (
		<ContextMenuView
			previewConfig={{
				targetViewNode: target_view_node,
			}}
			menuConfig={{
				menuTitle: ``,
				menuItems: [
					{
						actionKey: "track-enqueue",
						actionTitle: "Enqueue Track",
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
								systemName: 'text.append',
							},
						},
						menuAttributes: !is_playing_music ? ['hidden'] : undefined
					},
					{
						actionKey: "track-play-next",
						actionTitle: "Play Next",
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
								systemName: 'text.insert',
							},
						},
						menuAttributes: !is_playing_music ? ['hidden'] : undefined
					},
					...(is_playing_music ? [
						menuconfig_more_options
					] : menuconfig_more)
				],
			}}
			onMenuWillShow={() => {
				set_is_playing_music(GLOBALS.global_var.is_playing);
			}}
			onPressMenuItem={async({nativeEvent}) => {
				const UTI = 'public.item';
				switch(nativeEvent.actionKey){
					case "track-push-discord": 
						play_track_discord_send(Prefs.get_pref('discord_webhook_url'), props.track_data);
						break;
					case "track-enqueue":
						push_track_to_playing_queue(props.track_data);
						break;
					case "track-play-next":
						play_track_next(props.track_data);
						break;

					case "track-trim-media": 
						props.trim_track?.(true, props.track_data);
						break;
					case "track-view-info": 
						props.view_info?.(true, props.track_data);
						break;

					case "track-view-artist":
						navigation.push("Artist", {uri: props.track_data.artists[0].uri});
						break;
					case "track-view-album": 
						navigation.push("Playlist", {uri: props.track_data.album!.uri});
						break;

					case "track-share-original": 
						if (!is_empty(props.track_data.youtube_id))
							await Sharing.shareAsync(`https://www.youtube.com/watch?v=${props.track_data.youtube_id}`);
						else if (!is_empty(props.track_data.soundcloud_permalink))
							await Sharing.shareAsync(props.track_data.soundcloud_permalink!);
						break;
					case "track-share-downloaded": 
						await Sharing.shareAsync(SQLfs.media_directory(props.track_data.media_uri!) , { UTI });
						break;

					case "track-download-media": 
						await download_track(props.track_data, false, is_downloading, set_is_downloading, set_is_downloaded, set_downloading_progress);
						break;
					case "track-delete-media":
						await undownload_track(props.track_data);
						set_is_downloaded(false);
						break;
					case "track-download-lyrics": 
						const lyrics_result = await try_download_track_lyrics(props.track_data);
						set_is_lyrics_downloaded(lyrics_result === "ok");
						GLOBALS.global_var.bottom_alert?.(lyrics_result === "ok" ? "Downloaded Track Lyrics" : "Failed to Download Track Lyrics",lyrics_result === "ok" ? "GOOD" : "WARN");
						break;
					case "track-delete-lyrics": 
						await undownload_track_lyrics(props.track_data);
						GLOBALS.global_var.bottom_alert?.("Removed Track Lyrics", "INFO");
						set_is_lyrics_downloaded(false);
						break;
					
					case "track-download-thumbnail":
						const downloaded_thumbnail_uri = await SQLUtils.download_thumbnail(props.track_data);
						if(downloaded_thumbnail_uri === undefined) {
							GLOBALS.global_var.bottom_alert?.("Failed to Downloaded Track Artwork", "WARN");
							return
						}
						set_artwork(Illusive.get_track_artwork(SQLfs.document_directory(""), {...props.track_data, thumbnail_uri: downloaded_thumbnail_uri ?? ''}));
						set_is_thumbnail_downloaded(downloaded_thumbnail_uri !== undefined);
						GLOBALS.global_var.bottom_alert?.("Downloaded Track Artwork", "INFO");
						break;
					case "track-upload-artwork": 
						await upload_track_thumbnail(props.track_data, async(updated_track) => {
							set_artwork(Illusive.get_track_artwork(SQLfs.document_directory(""), updated_track));
							set_is_thumbnail_downloaded(true);
							GLOBALS.global_var.bottom_alert?.("Updated Track Artwork", "INFO");
						} ); 
						break;
					case "track-remove-artwork": 
						await SQLTracks.update_track(props.track_data.uid, {...props.track_data, thumbnail_uri: ''}); 
						set_artwork(Illusive.get_track_artwork(SQLfs.document_directory(""), {...props.track_data, thumbnail_uri: ''}));
						set_is_thumbnail_downloaded(false);
						GLOBALS.global_var.bottom_alert?.("Removed Track Artwork", "INFO");
						break;
					
					case "track-delete":
						if_confirm(`Delete:\n ${props.track_data.title}?`, "This action can't be undone.", () => delete_track(props.track_data, props.write_playlist_uuid, props.refresh_data));
						break;
					default: break;
				}
				if(nativeEvent.actionKey.includes('track-view-artist-')){
					const index = parseInt(nativeEvent.actionKey.replace('track-view-artist-', ''));
					navigation.push("Artist", {uri: props.track_data.artists[index].uri});
				}
				props.refresh_data?.();
			}}
		>
		<TouchableOpacity
            activeOpacity={disabled_from_write_playlist ? 0.9 : 0.2}
			disabled={disabled_from_edit_mode || (disabled_from_write_playlist && !notdisabled_from_write_playlist)}
			onLongPress={() => {}} delayLongPress={Constants.long_press_delay}
			style={{backgroundColor: colors.track, opacity: props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist && playlist_saved ? 0.5 : 1}} 
			onPress={async() => {
				if(notdisabled_from_write_playlist){
					const clone: Track = JSON.parse(JSON.stringify(props.track_data));
					const track: Track = {...clone, meta: {...clone.meta!, begdur: clone.duration * 0.20}};
					GLOBALS.global_var.play_tracks(track, [track], "Write Playlist");
				}
				else if(props.from !== undefined && props.track_callback !== undefined) 
					play(props.track_data, props.from, props.track_callback)}
			}>
			<View style={styles.track_box}>
				<View style={styles.centered}>
					<Image source={artwork} style={styles.image}/>
					{is_empty(tint) ? null : <View style={{...styles.image, opacity: 0.15, position: 'absolute', backgroundColor: tint}}/>}
					{!isNaN(props.track_data.duration) && !is_empty(props.track_data.duration) ? 
						<View style={{position: 'absolute', left: duration_to_string(props.track_data.duration).left - 14, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
							<Text style={{color:'white', fontSize:10}}>{duration_to_string(props.track_data.duration).duration}</Text>
						</View> : null
					}
				</View>
				<View style={{ width: props.write_playlist_uuid != undefined ? '60%' : '65%', top: 5, left: 20 }}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.title}</Text>
					<Text style={styles.artist} numberOfLines={1} >{artist_string(props.track_data)}</Text>
                    <View style={{flexDirection: 'row'}}>
    					<Text style={styles.album} numberOfLines={1} >{props.track_data.album?.name ?? ""}</Text>
                        {((props.track_data.explicit ?? "NONE") === "EXPLICIT") ? <MaterialIcons name="explicit" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {((props.track_data.explicit ?? "NONE") === "CLEAN") ? <MaterialIcons name="clean-hands" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {(props.track_data?.meta?.unavailable ?? false) ? <MaterialCommunityIcons name="file-hidden" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {is_thumbnail_downloaded                    ? <Ionicons name="image" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {is_lyrics_downloaded                       ? <MaterialIcons name="closed-caption" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {(is_downloaded)                            ? <Ionicons name="save-sharp" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {(is_downloading)                           ? <MaterialIcons name="downloading" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.youtube_id)     ? <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.imported_id)    ? <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.soundcloud_id)  ? <MaterialCommunityIcons name="soundcloud" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.spotify_id)     ? <MaterialCommunityIcons name="spotify" size={15} color={colors.secondary} style={styles.icon_thick}/> : null}
                        {!is_empty(props.track_data.applemusic_id)  ? <MaterialCommunityIcons name="apple" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.amazonmusic_id) ? <Ionicons name="logo-amazon" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.meta?.begdur) || !is_empty(props.track_data.meta?.enddur) ? <Ionicons name="cut" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
					</View>
				</View>
				{props.write_playlist_uuid !== undefined && props.playlist_uuid !== Constants.library_write_playlist &&
                    <IoniconsTouchableOpacity on_press={() => {
						insert_into_write_playlist(props.track_data, props.write_playlist_uuid, playlist_saved, set_playlist_saved, props.refresh_data);
					}} style={{...styles.centered, paddingRight: 30}} icon_name={!playlist_saved ? "add" : "checkmark"} icon_size={30} icon_color={colors.primary} icon_style={{left: 15}}/>
				}
				{props.edit_mode === "DOWNLOAD" && !is_downloaded && is_empty(props.track_data.imported_id) && !is_downloading && 
                    <IoniconsTouchableOpacity on_press={() => download_track(props.track_data, false, is_downloading, set_is_downloading, set_is_downloaded, set_downloading_progress)} style={styles.centered} icon_name='download' icon_size={30} icon_color={colors.primary} icon_style={{left: 10}}/>
				}
				{is_downloading && 
					<Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{downloading_progress}%</Text>
				}
				{props.edit_mode === "DELETE" && !is_downloading &&
                    <IoniconsTouchableOpacity on_press={() => delete_track(props.track_data, props.write_playlist_uuid, props.refresh_data)} style={styles.centered} icon_name='trash' icon_size={30} icon_color={colors.red} icon_style={styles.else_icon}/>
				}
				{props.edit_mode === "NONE" && (props.display_plays ?? false) ?
                    <Text style={{color: colors.text, left: 20, fontWeight: '200', fontSize: 30, alignSelf: 'center'}}>{props.track_data.meta?.plays ?? 0}</Text>
				: null}
			</View>
			<View style={styles.line}/>
		</TouchableOpacity>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	track_box:{
		width: '100%',
		height: 60,
		flexDirection: 'row',
	},
    image:{
		left: 10,
		height: 48,
		width: 52,
		borderRadius: 2,
        resizeMode: "cover",
	},
	text:{
		width: '65%',
		top: 5,
		left: 20
	},
	title:{
		color: colors.title,
		fontSize:15,
	},
	artist:{
		color: colors.subtext,
		fontSize:14
	},
    album:{
		color: colors.deeptext,
		fontSize: 12,
        top: 1,
        marginRight: 4
	},
	line:{
		height: 1,
		backgroundColor: colors.line,
		width: '90%',
		left: 85
	},
	icon_thin:{
		marginRight: 5
	},
    icon_thick:{
		marginRight: 3
	},
	else_icon:{
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	},
    centered:{
        justifyContent: "center"
    }
});

export default TrackComponent;