declare module "react-native-trimmer" {
    interface TrimmerProps {
        onHandleChange: (obj: { leftPosition: number, rightPosition: number}) => void
        totalDuration: number;
        trimmerLeftHandlePosition: number;
        trimmerRightHandlePosition: number;
        maximumZoomLevel: number;
        initialZoomValue: number
        scaleInOnInit: boolean
        maxTrimDuration: number
        tintColor: string
        markerColor: string
        trackBackgroundColor: string
        trackBorderColor: string
        scrubberColor: string
        scaleInOnInitType: "max-duration"|"trim-duration"
        scrubberPosition: number
    };
     
    const Trimmer: React.FC<TrimmerProps>;
    export default Trimmer;
};