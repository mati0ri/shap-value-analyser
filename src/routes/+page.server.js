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

export function load({ url }) {
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

    let currentStudy = "Bio-allFeatures-withoutHumanFootprints"; // Default

    if (studyParam && validStudies.includes(studyParam)) {
        currentStudy = studyParam;
    }

    const base = path.join(process.cwd(), 'src/data', currentStudy);

    const x = csvToArray(fs.readFileSync(path.join(base, 'x.csv'), 'utf-8'));
    const y = csvToArray(fs.readFileSync(path.join(base, 'y.csv'), 'utf-8'));
    const sv = csvToArray(fs.readFileSync(path.join(base, 'sv.csv'), 'utf-8'));

    return { x, y, sv, currentStudy, validStudies };
}
