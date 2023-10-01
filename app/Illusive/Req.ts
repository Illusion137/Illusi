import axios from "axios";
import * as Prefs from '../../Preferences'

export default async function req(config: import("axios").AxiosRequestConfig, service = 'youtube_cookies'){
    try {
        let response = await axios(config);
        let key_values: String[][] = [];
        try {            
            let json_cookies = Prefs.cookiesToJson(Prefs.prefs.external_services[service]);
            for(const set_cookie of response?.headers["set-cookie"]){
                let key_value_set_cookie = set_cookie.split(';')
                let main_key_value_set_cookie = key_value_set_cookie[0];
                let key_value = main_key_value_set_cookie.split('=');
                key_values.push(key_value);
            }
            for(const key_value of key_values){
                json_cookies[key_value[0]] = key_value[1];
            }
            await Prefs.setCookiesJson(json_cookies, service);
            response['new-cookies'] = Prefs.prefs.external_services[service];
        } catch (error) {
            console.log(error)
        }
        return response;
    } catch (error) {
        console.log("Req:",error)
    }
}