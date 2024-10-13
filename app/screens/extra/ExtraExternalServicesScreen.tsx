import React,  { useRef, useState } from 'react';
import { View, StyleSheet, TouchableHighlight, Image, Text, ScrollView } from 'react-native';
import CookieManager, { Cookies } from '@react-native-community/cookies';
import { useTheme } from '@react-navigation/native';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { Ionicons } from '@expo/vector-icons';
import { CookieJar } from '../../../lib-origin/origin/src/utils/cookie_util';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { MusicServiceType, SetState } from '../../../lib-origin/Illusive/src/types';

function ServiceSwitcher(props: {
    service: MusicServiceType
    cookies_enabled: boolean
    url: string
    set_url: SetState
    set_service: SetState
}){
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
    const music_service = Illusive.music_service.get(props.service)!;
    return (
        <>
            <TouchableHighlight 
                activeOpacity={0.6} 
                underlayColor="#FFFFFF" 
                onPress={() => {
                    props.set_service(props.service);
                    if(props.url === null) props.set_url(music_service.web_view_url); 
                    else props.set_url(null)
                }}>
                <View style={styles.importfrom}>
                    <Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: music_service.app_icon as string}}/>
                    <Text style={styles.importfromtext}>Add {props.service} Account</Text>
                    <View style={{flex:1, alignItems: 'flex-end'}}>
                        {props.cookies_enabled && <Ionicons name={'checkmark-sharp'} size={25} color={colors.green} style={{right: 10}}/>}
                    </View>
                </View>
            </TouchableHighlight>
            <View style={styles.line}/>
        </>
    )
}
    
    

export default function ExternalServicesScreen() {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

    const illusive_external_service: MusicServiceType[] = ["YouTube", "YouTube Music", "Spotify", "Amazon Music", "Apple Music", "SoundCloud"] as const;
    const [external_services_cookies_enabled, set_external_services_cookies_enabled] = useState<Record<MusicServiceType, boolean>>({
        "YouTube": Illusive.music_service.get("YouTube")?.has_credentials() ?? false,
        "YouTube Music": Illusive.music_service.get("YouTube Music")?.has_credentials() ?? false,
        "Spotify": Illusive.music_service.get("Spotify")?.has_credentials() ?? false,
        "Amazon Music": Illusive.music_service.get("Amazon Music")?.has_credentials() ?? false,
        "Apple Music": Illusive.music_service.get("Apple Music")?.has_credentials() ?? false,
        "SoundCloud": Illusive.music_service.get("SoundCloud")?.has_credentials() ?? false,
        "Illusi": false,
        "Musi": false,
        "API": false
    })

	const [url, set_url] = useState(null as string|null);
    const [service, set_service] = useState<MusicServiceType>();
	function web_view_navigation_change(event: WebViewNavigation) {
        if(service === undefined) return;
        // console.log(event.url)
        // CookieManager.get(event.url).then(c => console.log(c));
        const illusive_service = Illusive.music_service.get(service!)!;
        CookieManager.get(event.url).then(
            async(res: Cookies) => { 
                await Prefs.save_pref(illusive_service.pref_cookie_jar!, CookieJar.fromCookies(res as any)); 
                const updated_cookies_enabled = {...external_services_cookies_enabled};
                if(illusive_service.has_credentials())
                    updated_cookies_enabled[service!] = true;
                set_external_services_cookies_enabled( updated_cookies_enabled );
            }
        );
	};

    // REFERENCE: https://stackoverflow.com/questions/68067668/react-native-webview-rendering-blank-page
    const generate_random_key = () => Math.random() * 100000;
    const webview_ref = useRef<WebView>();
    const [key, set_key] = useState(generate_random_key());

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			{ url != null && <View style={{height: 500}}>
				<WebView
                        key={key}
                        onLoadEnd={data => {
                            const {nativeEvent} = data;
                            const {title} = nativeEvent;
                            if (!title.trim()) {
                                webview_ref.current?.stopLoading();
                                webview_ref.current?.reload();
                                set_key(generate_random_key());
                            }
                        }} 
                        source={{ uri: url }} 
						style={{ flex: 1 }}
						javaScriptEnabled={true}
						sharedCookiesEnabled={true}
						thirdPartyCookiesEnabled={true}
						onNavigationStateChange={web_view_navigation_change}
						userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
						// applicationNameForUserAgent='Illusi'
                        originWhitelist={['http://', 'https://', 'about:']}
						contentMode="mobile"
						/>
			</View> }
			<ScrollView>
				<Text style={styles.descriptiontxt}>Click the external service you wish to add and sign into your account on the WebView</Text>
                {illusive_external_service.map((service, i) => (
                    <ServiceSwitcher key={i} service={service} url={url!} set_url={set_url} set_service={set_service} cookies_enabled={external_services_cookies_enabled[service]}/>
                ))}
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