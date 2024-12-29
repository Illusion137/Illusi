import React,  { useState } from 'react';
import { View, StyleSheet, TouchableHighlight, Image, Text, ScrollView } from 'react-native';
import CookieManager, { Cookies } from '@react-native-community/cookies';
import { useTheme } from '@react-navigation/native';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { Ionicons } from '@expo/vector-icons';
import { CookieJar } from '../../../lib-origin/origin/src/utils/cookie_util';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { MusicServiceType, SetState } from '../../../lib-origin/Illusive/src/types';
import { if_confirm } from '../../../lib-origin/Illusive/src/illusi/src/illusi_utils';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';

let current_service: MusicServiceType|null = null;

function ServiceSwitcher(props: {
    service: MusicServiceType
    cookies_enabled: boolean
    url: string
    set_url: SetState
}){
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    const music_service = Illusive.music_service.get(props.service)!;
    return (
        <>
            <TouchableHighlight 
                activeOpacity={0.6} 
                underlayColor="#FFFFFF" 
                onPress={() => {
                    current_service = props.service;
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

export function clear_webview_data(){
    CookieManager.clearAll(true);
}

export default function ExternalServicesScreen() {
	const { colors } = useTheme() as Prefs.Theme;
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
	function web_view_navigation_change(event: WebViewNavigation) {
        if(current_service === null) return;
        const illusive_service = Illusive.music_service.get(current_service!)!;
        CookieManager.get(event.url).then(
            async(res: Cookies) => {
                if(is_empty(res)) return;
                await Prefs.save_pref(illusive_service.pref_cookie_jar!, CookieJar.fromCookies(res as any)); 
                const updated_cookies_enabled = {...external_services_cookies_enabled};
                if(illusive_service.has_credentials())
                    updated_cookies_enabled[current_service!] = true;
                set_external_services_cookies_enabled( updated_cookies_enabled );
            }
        );
	};

    // REFERENCE: https://stackoverflow.com/questions/68067668/react-native-webview-rendering-blank-page
    const generate_random_key = () => Math.random() * 100000;
    const [key, set_key] = useState(generate_random_key()); set_key;

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			{ url != null && <View style={{height: 500}}>
				<WebView
                        key={key}
                        source={{ uri: url }} 
						style={{ flex: 1 }}
                        onShouldStartLoadWithRequest={event => {  
                            if (event.url.startsWith("about:"))
                                return false;
                            return true;
                        }}
                        originWhitelist={['*']}
						// contentMode="mobile"
                        domStorageEnabled={true}
                        javaScriptEnabled={true}
						sharedCookiesEnabled={true}
						thirdPartyCookiesEnabled={true}
						onNavigationStateChange={web_view_navigation_change}
						userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
						// applicationNameForUserAgent='Illusi'
						contentMode="mobile"
						/>
			</View> }
			<ScrollView>
                <ExtrasSectionButton show_arrow={false} text='Clear WebView Data' icon='trash-bin-outline' onPress={async () => if_confirm("Clear WebView Data?", "", clear_webview_data)}/>            
				<Text style={styles.descriptiontxt}>Click the external service you wish to add and sign into your account on the WebView</Text>
                {illusive_external_service.map((service, i) => (
                    <ServiceSwitcher key={i} service={service} url={url!} set_url={set_url} cookies_enabled={external_services_cookies_enabled[service]}/>
                ))}
                <View style={{height: 100}}/>
			</ScrollView>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
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
		backgroundColor: colors.line,
		marginHorizontal: 10,
	},
	descriptiontxt:{
		color: colors.subtext,
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
	},
});