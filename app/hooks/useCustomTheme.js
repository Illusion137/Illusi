import { useState, useEffect } from 'react';

function useCustomTheme(nTheme = undefined) {
    const [theme, setTheme] = useState(null);

    useEffect(() => {
        if(nTheme != undefined)
            setTheme(nTheme);
    }, [theme]);

    return [tracks];
}