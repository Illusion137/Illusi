import React,  { useState } from 'react';
import { View, StyleSheet, TouchableHighlight, Image, Text, ScrollView } from 'react-native';
import CookieManager from '@react-native-community/cookies';
import { useNavigation, useTheme } from '@react-navigation/native';
import WebView from 'react-native-webview';

function ExternalServicesScreen(props) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);

// fetch("https://www.youtube.com/", {
//   "headers": {
//     "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
//     "accept-language": "en-US,en;q=0.9",
//     "cache-control": "max-age=0",
//     "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Google Chrome\";v=\"116\"",
//     "sec-ch-ua-arch": "\"x86\"",
//     "sec-ch-ua-bitness": "\"64\"",
//     "sec-ch-ua-full-version": "\"116.0.5845.188\"",
//     "sec-ch-ua-full-version-list": "\"Chromium\";v=\"116.0.5845.188\", \"Not)A;Brand\";v=\"24.0.0.0\", \"Google Chrome\";v=\"116.0.5845.188\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-model": "\"\"",
//     "sec-ch-ua-platform": "\"Windows\"",
//     "sec-ch-ua-platform-version": "\"15.0.0\"",
//     "sec-ch-ua-wow64": "?0",
//     "sec-fetch-dest": "document",
//     "sec-fetch-mode": "navigate",
//     "sec-fetch-site": "none",
//     "sec-fetch-user": "?1",
//     "service-worker-navigation-preload": "true",
//     "upgrade-insecure-requests": "1",
//     "x-client-data": "CKS1yQEIh7bJAQiitskBCKmdygEI6NTKAQiQ+soBCJShywEI85jNAQiFoM0BCIOyzQEI3L3NAQjfxM0BCLnKzQEIt83NAQiTz80BCNTQzQEI7NDNAQjF0c0BCJHSzQEItdLNARjrjaUX",
//     "cookie": "VISITOR_INFO1_LIVE=UndynOG0Vuk; YSC=mdAvnSy6zwA; VISITOR_PRIVACY_METADATA=CgJVUxICGgA%3D; _gcl_au=1.1.1654163908.1692824047; wide=0; SID=awgdkGEXoJhAHoq_ZnzEMRDF0yu3JQ6OmMUSyKhMA7gen8itEBfCP-idlB6Ye4ROL2u_cw.; __Secure-1PSID=awgdkGEXoJhAHoq_ZnzEMRDF0yu3JQ6OmMUSyKhMA7gen8itzY5mTs8yQnlbOhiGXyRuHA.; __Secure-3PSID=awgdkGEXoJhAHoq_ZnzEMRDF0yu3JQ6OmMUSyKhMA7gen8itv1p2-KxLSA7sEP9l5YYyng.; HSID=AbW2fKTxcYveMstZK; SSID=Asx_xRc36skfypQCa; APISID=-6vLA8waRYYjU6xv/AMD_iY61ApzJD7Iuo; SAPISID=BARrQL9X-hIFvhQv/Aun_ha11PFGaRDNkY; __Secure-1PAPISID=BARrQL9X-hIFvhQv/Aun_ha11PFGaRDNkY; __Secure-3PAPISID=BARrQL9X-hIFvhQv/Aun_ha11PFGaRDNkY; LOGIN_INFO=AFmmF2swRQIgT9qInNEEo3VbNe9EkCD5q5QJJy2FvvbBQLNXeoOsA0wCIQDJODafLSnXsp_vm43NOmS4_nib3FYadOlGERkP391iiw:QUQ3MjNmemdoWnp2OEE2cmxWbHJ1b2pBeUx0Y0xJUEpFNnRRdHJWb2owLUY4ZWhUWUVlUGdxWUFvU19Cal9NekI0QmpGblhtWXcwdXNpcmpxU1gycE5lNmxQR2c4eVA4TDdqWXRESm9vcThpZmNUbmZaR1I2ZFJhZWNBMFBydVFvU0RVbHhLcTczZmxraUhQTDk4QmZjckk2dnh0V2RHTGxR; PREF=f6=40000080&volume=8&f7=140&tz=America.Phoenix&autoplay=true&f5=20000; __Secure-1PSIDTS=sidts-CjEB3e41hb3VEmMehejG3BW72h3ZL2z41jJsXZdKU-M8oPbq-muhosjV_dVa8QGmA2N3EAA; __Secure-3PSIDTS=sidts-CjEB3e41hb3VEmMehejG3BW72h3ZL2z41jJsXZdKU-M8oPbq-muhosjV_dVa8QGmA2N3EAA; SIDCC=APoG2W8242_FjION2YvcMdvNe6_f9q7WW-aWkZm1OY9f4qr6-Q13mU6LBCKAxnRbnivcl2wp8KUY; __Secure-1PSIDCC=APoG2W8XTFSVM2Svl6mu5xkmctRqqgiI_SrYXxHExvWeJGBujmi6TLfK9KWBnG0WwYHYiN1pvCI; __Secure-3PSIDCC=APoG2W9sr6U-j2jaqUJwwvNDyvslCiWGAkOHiZETstcN18MydoylHur32U3IOpKOt7-I__jjWwo"
//   },
//   "referrerPolicy": "strict-origin-when-cross-origin",
//   "body": null,
//   "method": "GET"
// });


	const [url, setUrl] = useState(null);
	navChange = e => {
		// console.log("e", e);
		// this.setState({ loading: e.loading });
		if (e.url == "https://m.youtube.com/") {
		  CookieManager.getAll(true).then(res => {
			console.log("CookieManager.getAll =>", res);
			if (!!res) {
			  console.log({res})
			  CookieManager.clearAll(true).then(res => {
				console.log("LoginScreen CookieManager.clearAll =>", res);
			  });
			}
		  });
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
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => {setUrl("https://youtube.com")} }>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/c7/18/fcc718a6-bd55-b1aa-93e4-4073a2ad3b13/logo_youtube_color-1x_U007emarketing-0-6-0-85-220.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add YouTube Account</Text>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Spotify Playlist'})}>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/63/64/fa/6364fa97-398a-46da-32ac-765e8f328548/AppIcon-0-1x_U007emarketing-0-6-0-0-0-85-220-0.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add Spotify Account</Text>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Amazon Playlist'})}>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/b8/aa/fcb8aae7-180e-7b29-7c83-255f1c86eba8/AppIcon-1x_U007emarketing-0-10-0-85-220.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Add Amazon Music Account</Text>
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