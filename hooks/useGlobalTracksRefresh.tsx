import { gen_uuid } from '@common/utils/util';
import { SQLGlobal } from '@illusive/sql/sql_global';
import { useFocusEffect } from 'expo-router';
import { useRef } from 'react';

export default function useGlobalTracksRefresh(callback: () => any){
    const key_ref = useRef<string>(gen_uuid());
    return useFocusEffect(() => {
            SQLGlobal.push_global_sql_tracks_update_callback(key_ref.current, callback);
            return () => SQLGlobal.pop_global_sql_tracks_update_callback(key_ref.current);
        }
    );
}