import { Dimensions, ScrollView, Text, View } from "react-native";
import { BarChart, ContributionGraph } from "react-native-chart-kit";
import { GLOBALS } from '@illusive/globals';
import { milliseconds_of } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";

export default function ExtraStatisticsScreen(){
    const { colors } = usePTheme();
    
    function map_frequency(numbers: number[]) {
        const frequency: Record<string, number> = {};
        for (const num of numbers) {
            frequency[num] = (frequency[num] || 0) + 1;
        }
        return frequency;
   }
   function map_commit_frequency(dates: string[]) {
    const frequency: Record<string, number> = {};
    for (const date of dates) {
        frequency[date] = (frequency[date] || 0) + 1;
    }
    return Object.keys(frequency).map(key => ({date: key, count: frequency[key]}));
}

    const plays_histogram_dataset = map_frequency(GLOBALS.global_var.sql_tracks.map(track => track.meta?.plays ?? 0));

    const plays_histogram_data = {
        labels: Object.keys(plays_histogram_dataset).filter((_, i) => i % 4 === 0),
        datasets: [{data: Object.values(plays_histogram_dataset)}]
    };

    const commits_data = GLOBALS.global_var.sql_tracks.map(track => (track.meta?.added_date ? new Date(track.meta?.added_date) :  new Date())).filter(date => new Date().getTime() - date.getTime() <= milliseconds_of({days: 180})).map(date => date.toISOString().slice(0,10));
    const commits_frequency = map_commit_frequency(commits_data);

    const width = Dimensions.get('screen').width;

    return (
        <ScrollView style={{flex: 1, backgroundColor: colors.background}}>
            <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold', padding: 5}}>Plays (x) vs {'\n'}Tracks w/ those amount of plays (y)</Text>
           <View style={{padding: 10}}>
                <BarChart
                    data={plays_histogram_data}
                    width={width - 10}
                    height={width}
                    yAxisLabel=""
                    yAxisSuffix=""
                    style={{right: 20}}
                    chartConfig={{
                        barPercentage: 0.3,
                        strokeWidth: 0.1,
                        backgroundColor: colors.background,
                        decimalPlaces: 0, // optional, defaults to 2dp
                        color: () => colors.text,
                        labelColor: () => colors.text,
                        style: {
                            borderRadius: 16
                        },
                    }}
                    showValuesOnTopOfBars={true}
                />
           </View>
           <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold', padding: 5}}>Track Commits ({new Date().getFullYear()})</Text>
           <View style={{padding: 10}}>
                <ContributionGraph
                    tooltipDataAttrs={() => ({})}
                    values={commits_frequency}
                    endDate={new Date()}
                    numDays={180}
                    squareSize={12.5}
                    width={width}
                    height={220}
                    chartConfig={{
                        color: (opacity) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                />
           </View>
        </ScrollView>
    )
}