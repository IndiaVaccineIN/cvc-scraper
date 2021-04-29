const zlib = require("zlib")
const { getAllStates } = require('./cvc');
const { DateTime } = require('luxon');
const pMap = require('p-map')
const fs = require('fs')

const CONCURRENT_STATES = 4;

async function getFullDump() {
    const tomorrow = DateTime.now().setZone('Asia/Kolkata').plus({ days: 1 }).toFormat('dd-MM-yyyy')
    const allStates = await getAllStates()

    let data = {
        startDate: tomorrow,
        states: {}
    };

    await pMap(allStates, async state => {
        data.states[state.name] = {
            id: state.id,
            name: state.name,
            districts: {}
        }
        await pMap(state.districts, async district => {
            console.log(`Fetching ${state.name} -> ${district.name}`)
            data.states[state.name].districts[district.name] = {
                id: district.id,
                name: district.name,
                centers: await district.getCenters(tomorrow)
            }
        }, { concurrency: 4 })
    }, { concurrency: CONCURRENT_STATES })

    return data;

}
async function main() {
    while (true) {
        const filename = DateTime.now().setZone('Asia/Kolkata').toISO() + '.json.gz'
        const dump = await getFullDump();
        console.log(`Writing ${filename}`)
        fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(dump)));
        console.log(`Written ${filename}`)
        // Pause 5 minutes between runs
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }
}

main()