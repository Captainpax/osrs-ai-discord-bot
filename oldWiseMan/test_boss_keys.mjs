import { Hiscores } from 'oldschooljs';

async function test() {
    try {
        const stats = await Hiscores.fetch('Lynx Titan');
        console.log(Object.keys(stats.bossRecords));
    } catch (e) {
        console.error(e);
    }
}

test();
