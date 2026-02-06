import { Monsters, Items } from 'oldschooljs';
import logger from '../utility/logger.mjs';

/**
 * @description Finds pet information for a given boss name.
 * @param {string} bossName 
 * @returns {object|null} Pet info { name, id, chance } or null if not found.
 */
export function getPetInfo(bossName) {
    try {
        const monster = Monsters.find(m => 
            m.name.toLowerCase() === bossName.toLowerCase() || 
            m.aliases.some(a => a.toLowerCase() === bossName.toLowerCase())
        );

        if (!monster || !monster.table || !monster.table.tertiaryItems) {
            return null;
        }

        // Look for items that look like pets in tertiary drops
        const petDrop = monster.table.tertiaryItems.find(drop => {
            const item = Items.get(drop.item);
            if (!item) return false;
            const name = item.name.toLowerCase();
            return name.includes('pet ') || 
                   name.includes(' pet') ||
                   name === 'prince black dragon' || 
                   name === 'ikkle hydra' || 
                   name === 'lil' + "'" + 'zik' ||
                   name === 'noon' ||
                   name === 'vorki' ||
                   name === 'olmet' ||
                   name === 'skotos' ||
                   name === 'jal-nib-rek' ||
                   name === 'tztok-jad' ||
                   name === 'kalphite princess' ||
                   name === 'herbi' ||
                   name === 'muphin' ||
                   name === 'baron' ||
                   name === 'butch' ||
                   name === 'lil' + "'" + 'viathan' ||
                   name === 'wisp';
        });

        if (petDrop) {
            const item = Items.get(petDrop.item);
            return {
                name: item.name,
                id: item.id,
                chance: petDrop.chance
            };
        }

        return null;
    } catch (error) {
        logger.error(`Error in getPetInfo for "${bossName}": ${error.message}`);
        return null;
    }
}

export default { getPetInfo };
