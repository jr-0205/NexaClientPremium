const fs = require('fs');
const path = require('path');
const source = path.resolve(__dirname, '..', 'profiles', 'diosesmon-oficial', 'showdown', 'data', 'pokedex.js');
const dex = require(source).Pokedex;
const inferGen = num => num <= 151 ? 1 : num <= 251 ? 2 : num <= 386 ? 3 : num <= 493 ? 4 : num <= 649 ? 5 : num <= 721 ? 6 : num <= 809 ? 7 : num <= 905 ? 8 : 9;
const rows = Object.entries(dex)
  .filter(([, p]) => p.num > 0 && p.eggGroups && !p.battleOnly)
  .map(([id, p]) => ({ id, num: p.num, name: p.name, gen: p.gen || inferGen(p.num), types: p.types || [], eggGroups: p.eggGroups }))
  .sort((a, b) => a.num - b.num || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(__dirname, 'pokemon-data.js'), `window.POKEMON_DATA=${JSON.stringify(rows)};`, 'utf8');
console.log(`Generated ${rows.length} Pokémon from ${source}`);
