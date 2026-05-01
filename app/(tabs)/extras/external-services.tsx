import React, { useState } from "react";
import { View, StyleSheet, TouchableHighlight, Image, Text, ScrollView } from "react-native";
import CookieManager from "react-native-nitro-cookies";
import type { WebViewNavigation } from "react-native-webview";
import WebView from "react-native-webview";
import { Prefs } from "@illusive/prefs";
import { Ionicons } from "@expo/vector-icons";
import { Illusive } from "@illusive/illusive";
import type { MusicServiceType, SetState } from "@illusive/types";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import { CookieJar } from "@common/utils/cookie_util";

let current_service: MusicServiceType | null = null;

function ServiceSwitcher(props: { service: MusicServiceType; cookies_enabled: boolean; url: string; set_url: SetState }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const music_service = Illusive.music_service.get(props.service)!;
	return (
		<>
			<TouchableHighlight
				activeOpacity={0.6}
				underlayColor="#FFFFFF"
				onLongPress={() => {
					if_confirm(`Clear ${props.service} Cookies?`, "", () => {
						Prefs.save_pref<any>(music_service.pref_cookie_jar, new CookieJar([]));
						if (music_service.web_view_url) {
							CookieManager.clearByName(music_service.web_view_url, props.service, false);
							CookieManager.clearByName(music_service.web_view_url, props.service, true);
						}
					});
				}}
				onPress={() => {
					if (props.url === null) {
						current_service = props.service;
						props.set_url(music_service.web_view_url);
					} else props.set_url(null);
				}}>
				<View style={styles.importfrom}>
					<Image style={{ marginHorizontal: 12, height: 25, width: 25, borderRadius: 5 }} source={{ uri: music_service.app_icon as string }} />
					<Text style={styles.importfromtext}>Add {props.service} Account</Text>
					<View style={{ flex: 1, alignItems: "flex-end" }}>{props.cookies_enabled && <Ionicons name={"checkmark-sharp"} size={25} color={colors.green} style={{ right: 10 }} />}</View>
				</View>
			</TouchableHighlight>
			<View style={styles.line} />
		</>
	);
}

export function clear_webview_data() {
	CookieManager.clearAll(false);
	CookieManager.clearAll(true);
}

function default_cookies_enabled_state() {
	const cookies_enabled_state: Record<MusicServiceType, boolean> = {} as Record<MusicServiceType, boolean>;
	for (const music_service_entry of Illusive.music_service.entries()) {
		cookies_enabled_state[music_service_entry[0]] = music_service_entry[1].has_credentials() ?? false;
	}
	return cookies_enabled_state;
}

export default function ExtraExternalServicesScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const illusive_external_service: MusicServiceType[] = [...Illusive.music_service.keys()].filter((key) => Illusive.music_service.get(key)!.required_cookie_credentials.length > 0);
	const [external_services_cookies_enabled, set_external_services_cookies_enabled] = useState<Record<MusicServiceType, boolean>>(default_cookies_enabled_state());

	const [url, set_url] = useState(null as string | null);

	async function web_view_navigation_change(event: WebViewNavigation) {
		if (is_empty(current_service)) return;
		const illusive_service = Illusive.music_service.get(current_service!);
		if (illusive_service === undefined) {
			return;
		}
		const result = await CookieManager.get(event.url);
		if (is_empty(result)) return;

		const cookie_jar = Prefs.get_pref(illusive_service.pref_cookie_jar!) as CookieJar;

		cookie_jar.merge(CookieJar.fromCookies(result));
		await Prefs.save_pref(illusive_service.pref_cookie_jar!, cookie_jar);
		const updated_cookies_enabled = { ...external_services_cookies_enabled };
		if (illusive_service.has_credentials()) updated_cookies_enabled[current_service!] = true;
		set_external_services_cookies_enabled(updated_cookies_enabled);
	}

	// REFERENCE: https://stackoverflow.com/questions/68067668/react-native-webview-rendering-blank-page
	const generate_random_key = () => Math.random() * 100000;
	const [key, set_key] = useState(generate_random_key());
	set_key;

	return (
		<View style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			{url != null && (
				<View style={{ height: 700 }}>
					<WebView
						key={key}
						source={{ uri: url }}
						style={{ flex: 1 }}
						javaScriptCanOpenWindowsAutomatically={true}
						onShouldStartLoadWithRequest={(event) => {
							if (event.url.startsWith("about:")) return false;
							return true;
						}}
						originWhitelist={["*"]}
						// contentMode="mobile"
						domStorageEnabled={true}
						javaScriptEnabled={true}
						sharedCookiesEnabled={true}
						thirdPartyCookiesEnabled={true}
						onNavigationStateChange={web_view_navigation_change}
						userAgent={
							url.includes("soundcloud")
								? "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
								: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
						}
						// applicationNameForUserAgent='Illusi'
						contentMode="mobile"
					/>
				</View>
			)}
			<ScrollView>
				<ExtrasSectionButton show_arrow={false} text="Clear WebView Data" icon="trash-bin" onPress={async () => if_confirm("Clear WebView Data?", "", clear_webview_data)} />
				{/* { Prefs.get_pref('dev_mode') ? <ExtrasSectionButton show_arrow={false} text='Log Soundcloud Cookies' icon='accessibility' onPress={
                    async () => 
                        alert_info(
                            Prefs
                                .get_pref('soundcloud_cookie_jar')
                                .getCookies()
                                .map(cookie => JSON.stringify(cookie.getData())).join('\n\n')
                        )
                }/> : null} */}
				<Text style={styles.descriptiontxt}>Click the external service you wish to add and sign into your account on the WebView</Text>
				{illusive_external_service.map((service, i) => (
					<ServiceSwitcher key={i} service={service} url={url!} set_url={set_url} cookies_enabled={external_services_cookies_enabled[service]} />
				))}
				<View style={{ height: 100 }} />
			</ScrollView>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		importfrom: {
			height: 45,
			width: "100%",
			backgroundColor: colors.track,
			flexDirection: "row",
			alignItems: "center"
		},
		importfromtext: {
			color: "#FFFFFF",
			fontSize: 16
		},
		line: {
			width: "100%",
			height: 0.8,
			backgroundColor: colors.line,
			marginHorizontal: 10
		},
		descriptiontxt: {
			color: colors.subtext,
			marginTop: 10,
			marginBottom: 20,
			marginHorizontal: 12,
			textAlign: "left"
		}
	});
