import { View, StyleSheet, TouchableOpacity, Text, TextInput, Alert, ScrollView } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Prefs } from "@illusive/prefs";
import { SQLTracks } from '@illusive/sql/sql_tracks';
import * as SQLUpdate from '@illusive/illusi/src/sql/sql_update';
import * as SQLDatabase from '@illusive/illusi/src/sql/database';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { upload_sqlite_db } from "@illusive/document_picker";
import { alert_error } from "@illusive/illusi/src/alert";
import { document_directory } from "@illusive/illusi/src/sql/sql_fs";
import path from "path";
// import { test_import_1307_sqldb } from "@illusive/illusi/src/sql/sql_test";
import { load_sql_file, playlists_from_playlists_tracks } from "@illusive/illusi/src/sql/sql_dev";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";

let sql_statement = "";
export default function ExtraDeveloperScreen(){
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	
	async function alertSQLTables() {
		Alert.alert("SQL Tables", JSON.stringify(await SQLUpdate.get_all_tables(SQLDatabase.db)));
	}

	async function exportSQLData(){
		await Sharing.shareAsync(FileSystem.documentDirectory + "SQLite");
	}

	async function runSQL(sql_statement: string){
		if(!sql_statement.trim()) return;
		const result = await SQLDatabase.db.execute(sql_statement);
		Alert.alert("SQL Result", JSON.stringify(result));
	}

	return(
		<ScrollView style={{backgroundColor: colors.background, width: '100%', flex: 1 }}>
            <ExtrasSectionButton show_arrow={true} text='Load SQLite DB' icon='hammer-outline' onPress={async () => {
                const db_path = await upload_sqlite_db();
                if("error" in db_path) { alert_error(db_path); return; }
                load_sql_file(db_path.fileCopyUri!);
            }}/>
            <ExtrasSectionButton show_arrow={true} text='Load Playlists from Playlist-Tracks' icon='hammer-outline' onPress={async () => {
                if_confirm("Are you sure?","", async() => {
                    await playlists_from_playlists_tracks();
                });
            }}/>
            <ExtrasSectionButton show_arrow={true} text='Upload 1307 SQLite-DB' icon='hammer-outline' onPress={async () => {
                if_confirm("Are you sure?","", async() => {
                    const db_path = await upload_sqlite_db();
                    if("error" in db_path) { alert_error(db_path); return; }
                    await FileSystem.copyAsync({"from": db_path.fileCopyUri!, to: document_directory("SQLite") + "/" + path.basename(db_path.fileCopyUri!).replace(".sqlite3", "101.sqlite3")});
                    await test_import_1307_sqldb(db_path.fileCopyUri!);
                })
            }}/>
            <ExtrasSectionButton show_arrow={true} text='Undownload all tracks' icon='hammer-outline' onPress={async () => {
                if_confirm("Are you sure?","", async() => {
                    await SQLTracks.mark_all_tracks_undownloaded();
                })
            }}/>
			<View style={{flexDirection: 'row', height: '30%'}}>
				<TouchableOpacity style={styles.button} onPress={alertSQLTables}>
					<Text style={styles.button_text}>Get Tables</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.button} onPress={async() => runSQL(sql_statement)}>
					<Text style={styles.button_text}>Run SQL</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.button} onPress={exportSQLData}>
					<Text style={styles.button_text}>Export SQL Data</Text>
				</TouchableOpacity>
			</View>
			<TextInput style={{height: '15%', width: '100%', backgroundColor: '#302060', color: 'white', padding: 5}} placeholder="Enter SQL Statement..." onChangeText={input => { sql_statement = input }}/>
            <View style={{height: 80}}/>
			{/* <View style={{height: 50}}/>
			<ScrollView horizontal={true}>
				<View>
					<Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
						<Row data={sqlState.columns} widthArr={width_array} style={styles.header} textStyle={styles.text}/>
					</Table>
					<ScrollView style={styles.dataWrapper}>
						<Table borderStyle={{borderWidth: 1, borderColor: '#C1C0B9'}}>
							{
							sqlState.rows.map((row_data, index) => (
								<Row
								key={index}
								data={row_data}
								widthArr={width_array}
								style={[styles.row, index%2 && {backgroundColor: '#F7F6E7'}]}
								textStyle={styles.text}
								/>
							))
							}
						</Table>
					</ScrollView>
          		</View>
        	</ScrollView> */}
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	button: {
		backgroundColor: '#201050',
		width: '33%',
		height: '100%',
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	button_text: {
		color: colors.text,
		fontWeight: 'bold',
		width: 100,
		textAlign: 'center'
	},
	container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
	header: { height: 50, backgroundColor: '#537791' },
	text: { textAlign: 'center', fontWeight: '100' },
	dataWrapper: { marginTop: -1 },
	row: { height: 40, backgroundColor: '#E7E6E1' }
});