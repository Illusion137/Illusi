import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Alert } from "react-native";
import { useTheme } from "@react-navigation/native";
import { darkThemeDefault } from "../../../Preferences";
import { Table, TableWrapper, Row } from 'react-native-table-component';
import { useEffect, useState } from "react";
import { global_var } from "../../../globals";
import * as SQLActions from '../../../SQLActions';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

let sql_statement = "";
export default function ExtraDeveloperScreen(){
	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);
	
	const [sqlState, setSQLState] = useState({columns: [], rows: []});
	const width_array = [100];

	async function alertSQLTables() {
		Alert.alert("SQL Tables", JSON.stringify(await SQLActions.getAllTables()));
	}

	async function exportSQLData(){
		await Sharing.shareAsync(FileSystem.documentDirectory + "SQLite");
	}

	async function runSQL(sql_statement: string){
		if(!sql_statement.trim()) return;
		const result = await global_var.db.execAsync([{'sql': sql_statement, 'args': []}], false);
		Alert.alert("SQL Result", JSON.stringify(result));
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1 }}>
			<View style={{flexDirection: 'row', height: '10%'}}>
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
			<TextInput style={{height: '5%', width: '100%', backgroundColor: '#302060', color: 'white', padding: 5}} placeholder="Enter SQL Statement..." onChangeText={input => { sql_statement = input }}/>
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
		</View>
	);
}

const themeStyles = (colors: typeof darkThemeDefault.colors) => StyleSheet.create({
	button: {
		backgroundColor: '#201050',
		width: '33%',
		height: '100%',
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	button_text: {
		color: 'white',
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