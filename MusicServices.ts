import { MusicService, MusicServiceType } from "./types";
import * as Illusive from './app/Illusive/IllusivePlaylistResolver';
import * as IllusivePF from './app/Illusive/IllusiveAccountPlaylistFinder';
import * as Prefs from "./Preferences";

export namespace MusicServices {
    const illusi = new MusicService(
        {
            'valid_playlist_url_regex': /(https?:\/\/)illusi\.dev\/playlist\/.+/i,
            'link_text': 'https://illusi.dev/playlist/...',
            'has_credentials': undefined,
            'get_playlists_list': undefined,
            'get_playlist_import': undefined
        });

    const musi = new MusicService(
        {
            'valid_playlist_url_regex': /(https?:\/\/)(www\.)?music\.youtube\.com\/playlist\?list=.+/i,
            'link_text': 'https://feelthemusi.com/playlist/...',
            'has_credentials': undefined,
            'get_playlists_list': undefined,
            'get_playlist_import': Illusive.getMusiPlaylist
        });
    
    const youtube = new MusicService(
        {
            'valid_playlist_url_regex': /(https?:\/\/)(www\.)?youtube\.com\/playlist\?list=.+/i,
            'link_text': 'https://www.youtube.com/playlist?list=...',
            'has_credentials': Prefs.hasYouTubeCookies,
            'get_playlists_list': IllusivePF.getAllYoutubePlaylistsFromAccount,
            'get_playlist_import': Illusive.getYoutubePlaylist
        });
    
    const youtube_music = new MusicService(
        {
            'valid_playlist_url_regex': /(https?:\/\/)(www\.)?music\.youtube\.com\/playlist\?list=.+/i,
            'link_text': undefined,
            'has_credentials': Prefs.hasYouTubeMusicCookies,
            'get_playlists_list': IllusivePF.getAllYTMusicPlaylistsFromAccount,
            'get_playlist_import': Illusive.getYoutubeMusicPlaylist
        });
    
    const spotify = new MusicService(
        {
            'valid_playlist_url_regex': /(https?:\/\/)open\.spotify\.com\/(playlist|album)\/.+/i,
            'link_text': 'https://open.spotify.com/playlist/... or  \n - https://open.spotify.com/album/...',
            'has_credentials': Prefs.hasSpotifyCookies,
            'get_playlists_list': IllusivePF.getAllSpotifyPlaylistsFromAccount,
            'get_playlist_import': Illusive.getSpotifyPlaylist
        });
    
    const amazon_music = new MusicService(
        {
            'valid_playlist_url_regex': /(https?:\/\/)music\.amazon\.com\/(playlists|user-playlists)\/.+/i,
            'link_text': 'https://music.amazon.com/user-playlists/... or  \n - https://music.amazon.com/playlists/...',
            'has_credentials': Prefs.hasAmazonMusicCookies,
            'get_playlists_list': IllusivePF.getAllAmazonMusicPlaylistsFromAccount,
            'get_playlist_import': Illusive.getAmazonMusicPlaylist
        });
    
    const apple_music = new MusicService(
        {
            'valid_playlist_url_regex': undefined,
            'link_text': undefined,
            'has_credentials': undefined,
            'get_playlists_list': undefined,
            'get_playlist_import': undefined
        }); 
    
    const sound_cloud = new MusicService(
        {
            'valid_playlist_url_regex': undefined,
            'link_text': undefined,
            'has_credentials': undefined,
            'get_playlists_list': undefined,
            'get_playlist_import': undefined
        });
    
    const api = new MusicService(
        {
            'valid_playlist_url_regex': undefined,
            'link_text': undefined,
            'has_credentials': undefined,
            'get_playlists_list': undefined,
            'get_playlist_import': undefined
        });

    export const music_service: Map<MusicServiceType, MusicService> = new Map<MusicServiceType, MusicService>([
        ["Illusi", illusi],
        ["Musi", musi],
        ["YouTube", youtube],
        ["YouTube Music", youtube_music],
        ["Spotify", spotify],
        ["Amazon Music", amazon_music],
        ["Apple Music", apple_music],
        ["SoundCloud", sound_cloud],
        ["API", api],
    ]);
}