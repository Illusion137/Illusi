import { useTheme } from "@react-navigation/native";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { Dimensions, ScrollView } from "react-native";
import { BarChart } from "react-native-chart-kit";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';

export default function ExtraStatisticsScreen(){
    const { colors } = useTheme() as Prefs.Theme;
    
    function map_frequency(numbers: number[]) {
        const frequency: Record<string, number> = {};
        for (const num of numbers) {
            frequency[num] = (frequency[num] || 0) + 1;
        }
        return frequency;
   }

    const plays_histogram_dataset = map_frequency(GLOBALS.global_var.sql_tracks.map(track => track.meta?.plays ?? 0));

    const plays_histogram_data = {
        labels: Object.keys(plays_histogram_dataset).filter((_, i) => i % 4 === 0),
        datasets: [{data: Object.values(plays_histogram_dataset)}]
    };

    return (
        <ScrollView style={{flex: 1, backgroundColor: colors.background}} horizontal={true}>
            <BarChart
                data={plays_histogram_data}
                width={Dimensions.get('screen').width * 2}
                height={Dimensions.get('window').height - 100}
                yAxisLabel=""
                yAxisSuffix=""
                style={{right: 20}}
                chartConfig={{
                    barPercentage: 0.6,
                    strokeWidth: 0.1,
                    backgroundColor: "#e26a00",
                    backgroundGradientFrom: "#fb8c00",
                    backgroundGradientTo: "#ffa726",
                    decimalPlaces: 0, // optional, defaults to 2dp
                    color: () => `white`,
                    labelColor: () => `white`,
                    style: {
                      borderRadius: 16
                    },
                    
                    // propsForDots: {
                    //   r: "6",
                    //   strokeWidth: "2",
                    //   stroke: "#ffa726"
                    // }
                }}
                showValuesOnTopOfBars={true}
            />
        </ScrollView>
    )
}