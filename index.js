const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const functions = require('@google-cloud/functions-framework');
const CsvReadableStream = require('csv-reader');
const AutoDetectDecoderStream = require('autodetect-decoder-stream');
const { Firestore } = require('@google-cloud/firestore');
const projectId = process.env.PROJECT_ID || "jafernandez-tfm"
const credentialsPath = process.env.CREDENTIALS_PATH || "./jafernandez-tfm-c3599be6f666.json"

const db = new Firestore({
    projectId: projectId,
    keyFilename: credentialsPath,
    databaseId: 'catalog'
});

// Register an HTTP function with the Functions Framework that will be executed
// when you make an HTTP request to the deployed function's endpoint.
functions.http('catalogUpdater', async (req, res) => {
    const updateCsvCall = await fetch('https://tintatonersevilla.es/bot/bot.php');
    console.log('Generate new CSV');
    if (updateCsvCall.ok) {
        console.log('Get new CSV');
        const csvCatalog = await fetch('https://tintatonersevilla.es/bot/bot.csv');
        try {
            const _datarwt = [];
            var end = new Promise(function (resolve, reject) {
                csvCatalog.body
                    .pipe(new AutoDetectDecoderStream({ defaultEncoding: 'UTF8' }))
                    .pipe(new CsvReadableStream({ asObject: true, parseBooleans: true, trim: true, delimiter: ';' }))
                    .on('data', function (row) {
                        row.modelAlias = row.Modelo.toLowerCase();
                        _datarwt.push(db.collection('models').doc('' + row.Id).set(row));
                    })
                    .on('end', function () {
                        console.log('No more rows!');
                        resolve();
                    })
                    .on('error', reject);
            });
            await end;
            await Promise.all(_datarwt);
            res.send('Updated');
        } catch (err) {
            console.error(err.stack);
            res.send('Error');
        }
    } else {
        res.send('Error');
    }

});