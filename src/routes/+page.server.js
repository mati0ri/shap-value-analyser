import fs from 'fs';
import path from 'path';

function csvToArray(csv) {
    const [headerLine, ...lines] = csv.trim().split('\n');
    const headers = headerLine.split(',');

    return lines.map(line => {
        const values = line.split(',');
        return headers.reduce((obj, key, i) => {
            const val = values[i];
            obj[key] = isNaN(val) ? val : Number(val);
            return obj;
        }, {});
    });
}

export function load() {
    const base = path.join(process.cwd(), 'src/data/titanic');

    const x = csvToArray(fs.readFileSync(path.join(base, 'x.csv'), 'utf-8'));
    const y = csvToArray(fs.readFileSync(path.join(base, 'y.csv'), 'utf-8'));
    const sv = csvToArray(fs.readFileSync(path.join(base, 'sv.csv'), 'utf-8'));

    return { x, y, sv };
}
