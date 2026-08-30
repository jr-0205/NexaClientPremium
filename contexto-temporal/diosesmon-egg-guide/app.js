const data=window.POKEMON_DATA||[];
const labels={Monster:'Monstruo',Water1:'Agua 1',Bug:'Bicho',Flying:'Volador',Field:'Campo',Fairy:'Hada',Grass:'Planta',HumanLike:'Humanoide',Water3:'Agua 3',Mineral:'Mineral',Amorphous:'Amorfo',Water2:'Agua 2',Ditto:'Ditto',Dragon:'Dragón',Undiscovered:'Desconocido'};
const colors={Monster:'#d46c4e',Water1:'#4c99da',Bug:'#87a838',Flying:'#8c88d8',Field:'#c28d45',Fairy:'#e98eb8',Grass:'#62a95a',HumanLike:'#d77970',Water3:'#3e90aa',Mineral:'#8f8b83',Amorphous:'#9872b6',Water2:'#4879bb',Ditto:'#b28bc4',Dragon:'#7560c8',Undiscovered:'#777'};
const $=s=>document.querySelector(s),search=$('#search'),a=$('#groupA'),b=$('#groupB'),grid=$('#grid'),empty=$('#empty');
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const groups=[...new Set(data.flatMap(p=>p.eggGroups))].sort((x,y)=>(labels[x]||x).localeCompare(labels[y]||y,'es'));
groups.forEach(g=>{a.add(new Option(labels[g]||g,g));b.add(new Option(labels[g]||g,g))});
const generations=[...new Set(data.map(p=>p.gen).filter(Boolean))].sort((x,y)=>x-y);
$('#generationChecks').innerHTML=generations.map(g=>`<label class="gen-check"><input type="checkbox" value="${g}" checked><span>GEN ${toRoman(g)}</span></label>`).join('');
$('#datasetStatus').textContent=`${data.length} registros locales`;
function toRoman(n){return ['','I','II','III','IV','V','VI','VII','VIII','IX'][n]||String(n)}
function sprite(p){return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${p.num}.png`}
function render(){
 const q=norm(search.value.trim()),ga=a.value,gb=b.value,selectedGens=[...document.querySelectorAll('#generationChecks input:checked')].map(x=>Number(x.value));
 const reference=q?data.find(p=>norm(p.name)===q||norm(p.id)===q||String(p.num)===q):null;
 const referenceGroups=reference?reference.eggGroups:[];
 const rows=data.filter(p=>{
  const matches=!q||(reference?p.eggGroups.some(g=>referenceGroups.includes(g)):[p.name,p.num].some(v=>norm(v).includes(q)));
  return matches&&(!ga||p.eggGroups.includes(ga))&&(!gb||p.eggGroups.includes(gb))&&selectedGens.includes(p.gen);
 });
 $('#matchExplanation').innerHTML=reference?`<b>${reference.name}</b> pertenece a ${referenceGroups.map(g=>`<b>${labels[g]||g}</b>`).join(' y ')}. Se muestran solamente Pokémon que comparten al menos uno de esos grupos.`:q?'Completa el nombre del Pokémon para consultar todos los integrantes de sus grupos huevo.':`<b>Cómo usar:</b> escribe el nombre exacto de un Pokémon para ver únicamente los integrantes de sus grupos huevo.`;
 $('#resultCount').textContent=rows.length.toLocaleString('es-MX');empty.hidden=rows.length>0;
 grid.innerHTML=rows.slice(0,300).map(p=>`<article class="pokemon-card"><span class="dexno">#${String(p.num).padStart(4,'0')}</span><div class="sprite-wrap"><img loading="lazy" src="${sprite(p)}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="sprite-fallback" aria-label="Imagen no disponible">${p.name.slice(0,2).toUpperCase()}</span></div><h2>${p.name}</h2><div class="tags">${p.eggGroups.map(g=>`<span class="tag egg" style="background:${colors[g]||'#7156d9'}">${labels[g]||g}</span>`).join('')}</div></article>`).join('');
}
$('#groupOverview').innerHTML=groups.map(g=>`<button class="group-chip" data-group="${g}">${labels[g]||g} · ${data.filter(p=>p.eggGroups.includes(g)).length}</button>`).join('');
document.querySelectorAll('.group-chip').forEach(x=>x.onclick=()=>{a.value=a.value===x.dataset.group?'':x.dataset.group;document.querySelectorAll('.group-chip').forEach(y=>y.classList.toggle('active',y.dataset.group===a.value));render()});
[search,a,b].forEach(x=>x.addEventListener(x===search?'input':'change',render));
document.querySelectorAll('#generationChecks input').forEach(x=>x.addEventListener('change',()=>{updateGenerationButton();render()}));
function updateGenerationButton(){const checked=document.querySelectorAll('#generationChecks input:checked').length;$('#toggleGenerations').textContent=checked===generations.length?'Desmarcar todas':'Marcar todas'}
$('#toggleGenerations').onclick=()=>{const boxes=[...document.querySelectorAll('#generationChecks input')],allOn=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!allOn);updateGenerationButton();render()};
$('#reset').onclick=()=>{search.value='';a.value='';b.value='';document.querySelectorAll('#generationChecks input').forEach(x=>x.checked=true);document.querySelectorAll('.group-chip').forEach(x=>x.classList.remove('active'));updateGenerationButton();render()};render();
