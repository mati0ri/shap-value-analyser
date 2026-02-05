import { json } from '@sveltejs/kit';
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

export function GET({ url }) {
    const studyParam = url.searchParams.get('study');

    const validStudies = [
        "Bio-allFeatures-withoutHumanFootprints",
        "Bio10",
        "Bio100-10",
        "Titanic",
        "Test",
        "California",
        "Turnover"
    ];

    if (!studyParam || !validStudies.includes(studyParam)) {
        return json({ error: 'Invalid study' }, { status: 400 });
    }

    try {
        const base = path.join(process.cwd(), 'src/data', studyParam);

        const x = csvToArray(fs.readFileSync(path.join(base, 'x.csv'), 'utf-8'));
        const y = csvToArray(fs.readFileSync(path.join(base, 'y.csv'), 'utf-8'));
        const sv = csvToArray(fs.readFileSync(path.join(base, 'sv.csv'), 'utf-8'));

        return json({ x, y, sv });
    } catch (e) {
        console.error(e);
        return json({ error: 'Failed to load study data' }, { status: 500 });
    }
}
