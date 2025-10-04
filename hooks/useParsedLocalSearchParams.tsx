import { reinterpret_cast } from "@common/cast";
import { try_json_parse } from "@common/utils/parse_util";
import { useLocalSearchParams } from "expo-router";

type TransformRecordParsed<T extends Record<string, any>> = {
    [K in keyof T]: K extends `_${string}` ? T[K]|undefined : T[K]
};
type TransformRecordEncode<T extends Record<string, any>> = {
    [K in keyof T]: K extends `_${string}` ? string : T[K]
};

export function encodeLocalSearchParams<T extends Record<string, any>>(params: T): TransformRecordEncode<T> {
    for(const key in params){
        if(key.startsWith('_')){
            params[key] = reinterpret_cast<never>(JSON.stringify(params[key]));
        }
    }
    return reinterpret_cast<TransformRecordEncode<T>>(params);
}

export default function useParsedLocalSearchParams<T extends Record<string, any>>(): TransformRecordParsed<T>{
    const params = useLocalSearchParams();
    for(const key in params){
        if(key.startsWith('_') && typeof params[key] === "string"){
            const parsed = try_json_parse<Record<string, any>>(params[key]);
            if("error" in parsed) {
                params[key] = reinterpret_cast<never>(undefined);
            }
            else {
                params[key] = reinterpret_cast<never>(parsed);
            }
        }
    }
    return reinterpret_cast<TransformRecordParsed<T>>(params);
}