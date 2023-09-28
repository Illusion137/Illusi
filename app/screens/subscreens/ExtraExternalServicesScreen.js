import React,  { useState } from 'react';
import { View, StyleSheet, TouchableHighlight, Image, Text, ScrollView } from 'react-native';
import CookieManager from '@react-native-community/cookies';
import { useNavigation, useTheme } from '@react-navigation/native';
import WebView from 'react-native-webview';
import * as Prefs from '../../../Preferences';
import { Ionicons } from '@expo/vector-icons';

function ExternalServicesScreen(props) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [YTCookiesEnabled, setYTCookiesEnabled] = useState(Prefs.prefs.external_services.youtube_cookies !== '')
	const [YTMusicCookiesEnabled, setYTMusicCookiesEnabled] = useState(Prefs.prefs.external_services.youtube_music_cookies !== '')
	const [spotifyCookiesEnabled, setSpotifyCookiesEnabled] = useState(Prefs.prefs.external_services.spotify_cookies !== '')
	const [amazonCookiesEnabled, setAmazonCookiesEnabled] = useState(Prefs.prefs.external_services.amazon_music_cookies !== '')

	const [url, setUrl] = useState(null);
	navChange = e => {
		// this.setState({ loading: e.loading });
		switch(e.url){
			case('https://m.youtube.com/'):
				CookieManager.getAll(true).then(async(res) => { await Prefs.setCookies(res, 'youtube_cookies'); setYTCookiesEnabled(true) });
				break;
			case('https://music.youtube.com/'):
				CookieManager.getAll(true).then(async(res) => { await Prefs.setCookies(res, 'youtube_music_cookies'); setYTMusicCookiesEnabled(true) });
				break;
		}
	  };
	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>
			{ url != null && <View style={{height: 500}}>
				<WebView source={{ uri: url }} 
						style={{ flex: 1 }}
						javaScriptEnabled={true}
						sharedCookiesEnabled={true}
						thirdPartyCookiesEnabled={true}
						onNavigationStateChange={this.navChange}
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
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Spotify Playlist'})}>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/63/64/fa/6364fa97-398a-46da-32ac-765e8f328548/AppIcon-0-1x_U007emarketing-0-6-0-0-0-85-220-0.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add Spotify Account</Text>
						<View style={{flex:1, alignItems: 'flex-end'}}>
							{spotifyCookiesEnabled && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
						</View>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Amazon Playlist'})}>
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
const themeStyles = (colors) => StyleSheet.create({
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