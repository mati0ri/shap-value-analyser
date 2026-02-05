export function csvToArray(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length === 0) return [];

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());

    // Remove header line and filter out empty lines
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');

    return dataLines.map(line => {
        // Handle potential quotes or complex CSV cases if needed, 
        // but for now simple split is consistent with server logic provided
        const values = line.split(',');
        return headers.reduce((obj, key, i) => {
            const val = values[i] ? values[i].trim() : '';
            // Try to convert to number if possible
            const numVal = Number(val);
            obj[key] = (val === '' || isNaN(numVal)) ? val : numVal;
            return obj;
        }, {});
    });
}
