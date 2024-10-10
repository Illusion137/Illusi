import React,  { useState } from 'react';
import { View, StyleSheet, TouchableHighlight, Image, Text, ScrollView } from 'react-native';
import CookieManager, { Cookies } from '@react-native-community/cookies';
import { useNavigation, useTheme } from '@react-navigation/native';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { Ionicons } from '@expo/vector-icons';
import { CookieJar } from '../../../lib-origin/origin/src/utils/cookie_util';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';

function ExternalServicesScreen() {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

	const [YTCookiesEnabled, setYTCookiesEnabled] = useState(Illusive.music_service.get("YouTube")?.has_credentials() ?? false)
	const [YTMusicCookiesEnabled, setYTMusicCookiesEnabled] = useState(Illusive.music_service.get("YouTube")?.has_credentials() ?? false)
	const [spotifyCookiesEnabled, setSpotifyCookiesEnabled] = useState(Illusive.music_service.get("YouTube")?.has_credentials() ?? false)
	const [amazonCookiesEnabled, setAmazonCookiesEnabled] = useState(Illusive.music_service.get("YouTube")?.has_credentials() ?? false)

	const [url, setUrl] = useState(null as string|null);
	function navChange(event: WebViewNavigation) {
		switch(event.url){
			case('https://m.youtube.com/'):
				CookieManager.get('https://m.youtube.com/').then(async(res: Cookies) => { await Prefs.save_pref('youtube_cookie_jar', CookieJar.fromCookies(res as any)); setYTCookiesEnabled(true) });
				break;
			case('https://music.youtube.com/'):
				CookieManager.get('https://music.youtube.com/').then(async(res: Cookies) => { await Prefs.save_pref('youtube_music_cookie_jar', CookieJar.fromCookies(res as any)); setYTMusicCookiesEnabled(true) });
				break;
			case('https://open.spotify.com/'):
				CookieManager.get('https://open.spotify.com/').then(async(res: Cookies) => { await Prefs.save_pref('spotify_cookie_jar', CookieJar.fromCookies(res as any)); setSpotifyCookiesEnabled(true) });
				break;
			case('https://music.amazon.com/'):
				CookieManager.get('https://music.amazon.com/').then(async(res: Cookies) => { await Prefs.save_pref('amazon_music_cookie_jar', CookieJar.fromCookies(res as any)); setAmazonCookiesEnabled(true) });
				break;
		}
	};
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			{ url != null && <View style={{height: 500}}>
				<WebView source={{ uri: url }} 
						style={{ flex: 1 }}
						javaScriptEnabled={true}
						sharedCookiesEnabled={true}
						thirdPartyCookiesEnabled={true}
						onNavigationStateChange={navChange}
						userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
						// applicationNameForUserAgent='Illusi'
						contentMode="mobile"
						/>
			</View> }
			<ScrollView>
				<Text style={styles.descriptiontxt}>Click the external service you wish to add and sign into your account on the WebView</Text>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => {
						if(url == null) setUrl("https://youtube.com"); 
						else setUrl(null)} }>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/c7/18/fcc718a6-bd55-b1aa-93e4-4073a2ad3b13/logo_youtube_color-1x_U007emarketing-0-6-0-85-220.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add YouTube Account</Text>
						<View style={{flex:1, alignItems: 'flex-end'}}>
							{YTCookiesEnabled && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
						</View>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => {
						if(url == null) setUrl("https://music.youtube.com/"); 
						else setUrl(null)} }>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/44/c6/3d/44c63da2-7a82-bd82-821d-1cd01f2b510f/AppIcon-0-1x_U007emarketing-0-0-0-7-0-0-0-85-220-0.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add YouTube Music Account</Text>
						<View style={{flex:1, alignItems: 'flex-end'}}>
							{YTMusicCookiesEnabled && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
						</View>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => {
						if(url == null) setUrl("https://open.spotify.com/"); 
						else setUrl(null)} }>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/63/64/fa/6364fa97-398a-46da-32ac-765e8f328548/AppIcon-0-1x_U007emarketing-0-6-0-0-0-85-220-0.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add Spotify Account</Text>
						<View style={{flex:1, alignItems: 'flex-end'}}>
							{spotifyCookiesEnabled && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
						</View>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => {
						if(url == null) setUrl("https://music.amazon.com/"); 
						else setUrl(null)} }>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/b8/aa/fcb8aae7-180e-7b29-7c83-255f1c86eba8/AppIcon-1x_U007emarketing-0-10-0-85-220.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add Amazon Music Account</Text>
						<View style={{flex:1, alignItems: 'flex-end'}}>
							{amazonCookiesEnabled && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
						</View>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
			</ScrollView>
		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	importfrom:{
		height: 45,
		width: '100%',
		backgroundColor: colors.track,
		flexDirection: 'row',
		alignItems: 'center',
	},
	importfromtext:{
		color: '#FFFFFF',
		fontSize: 16
	},
	line:{
		width: '100%',
		height: 0.8,
		backgroundColor: '#202020',
		marginHorizontal: 10,
	},
	descriptiontxt:{
		color: '#A0A0A0',
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
	},
});
export default ExternalServicesScreen;