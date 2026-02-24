const fs=require('fs');
const CSV='KPI_MASTER_CON_CRITICIDAD_WEIGHTED_20260224_090039.csv';

function n(v){return parseFloat((v||'0').trim().replace(',','.'))||0;}
function s(v){return(v||'').trim().replace(/^"+|"+$/g,'');}

const lines=fs.readFileSync(CSV,'utf8').split('\n');
const rows=[];
for(let i=1;i<lines.length;i++){
  const c=lines[i].split(';');
  if(c.length<49)continue;
  const anio=parseInt(s(c[1]))||0;
  const mes=parseInt(s(c[2]))||0;
  if(!anio||!mes||mes>12)continue; // ignorar mes 13+ (datos anómalos)
  rows.push({
    anio,mes,
    ceco:s(c[3]),tienda:s(c[4]),
    hc:n(c[8]),fte:n(c[9]),
    horas_extra:n(c[10]),proc_disc:n(c[11]),
    dias_aus:n(c[12]),dias_med_aus:n(c[14]),
    retiros:n(c[15]),quejas:n(c[16]),accidentes:n(c[17]),
    ventas:n(c[18]),horas_tot:n(c[19]),productividad:n(c[20]),
    region:s(c[23]),zona:s(c[24]),
    nombre:s(c[25]),ciudad:s(c[26]),departamento:s(c[27]),
    am:s(c[28]),dm:s(c[29]),concepto:s(c[30]),
    tipo_area:s(c[31]),tipo_ciudad:s(c[32]),
    lat:n(c[33]),lon:n(c[34]),
    fte_ratio:n(c[35]),abs_ratio:n(c[36]),attrition:n(c[37]),
    productividad_hc:n(c[38]),ventas_capita:n(c[39]),
    proc_disc_pct:n(c[40]),quejas_pct:n(c[41]),acc_pct:n(c[42]),
    horas_extra_ratio:n(c[43]),aus_med_ratio:n(c[45]),
    weighted:n(c[46]),crit_pct:n(c[48]),
    s_fte:n(c[49]),s_rotacion:n(c[50]),s_aus:n(c[51]),s_aus_med:n(c[52]),
    s_acc:n(c[53]),s_disc:n(c[54]),s_quejas:n(c[55]),s_hextra:n(c[56]),
  });
}

// Campos SUMA (conteos absolutos del año)
const SUM_KEYS=['horas_extra','proc_disc','dias_aus','dias_med_aus',
  'retiros','quejas','accidentes','ventas','horas_tot'];
// Campos PROMEDIO (ratios, scores, headcount)
const AVG_KEYS=['hc','fte','productividad','fte_ratio','abs_ratio','attrition',
  'productividad_hc','ventas_capita','proc_disc_pct','quejas_pct','acc_pct',
  'horas_extra_ratio','aus_med_ratio','weighted','crit_pct',
  's_fte','s_rotacion','s_aus','s_aus_med','s_acc','s_disc','s_quejas','s_hextra'];

function nivel(crit){return crit>=71?'High':crit>=36?'Medium':'Low';}

function aggByYear(yr){
  const groups={};
  rows.filter(r=>r.anio===yr).forEach(r=>{
    if(!groups[r.ceco]){
      groups[r.ceco]={_last:r,_count:1,_max_crit:r.crit_pct,_mc:{}};
      groups[r.ceco]._mc[r.mes]=r.crit_pct;
      SUM_KEYS.forEach(k=>groups[r.ceco][k]=r[k]);
      AVG_KEYS.forEach(k=>groups[r.ceco][k]=r[k]);
    } else {
      if(r.mes>groups[r.ceco]._last.mes)groups[r.ceco]._last=r;
      groups[r.ceco]._count++;
      if(r.crit_pct>groups[r.ceco]._max_crit)groups[r.ceco]._max_crit=r.crit_pct;
      groups[r.ceco]._mc[r.mes]=r.crit_pct;
      SUM_KEYS.forEach(k=>groups[r.ceco][k]+=r[k]);
      AVG_KEYS.forEach(k=>groups[r.ceco][k]+=r[k]);
    }
  });

  // Meses máximos disponibles → umbral mínimo = 50% (cap en 12)
  const allCounts=Object.values(groups).map(g=>g._count);
  const maxMeses=Math.min(12,Math.max(...allCounts));
  const minMeses=Math.ceil(maxMeses*0.5);
  const nEx=Object.values(groups).filter(g=>g._count<minMeses).length;
  console.log(`  ${yr}: max=${maxMeses} meses, umbral>=${minMeses}, excluidas=${nEx} tiendas`);

  const toRec=(g)=>{
    const last=g._last; const cnt=g._count;
    const result={};
    SUM_KEYS.forEach(k=>result[k]=parseFloat(g[k].toFixed(1)));
    AVG_KEYS.forEach(k=>result[k]=parseFloat((g[k]/cnt).toFixed(2)));
    result.crit_pct=parseFloat(result.crit_pct.toFixed(1));
    return{
      anio:yr,mes:last.mes,meses_data:cnt,
      ceco:last.ceco,tienda:last.tienda,
      ...result,
      nivel:nivel(g._max_crit),             // color = peor mes del año
      crit_pct_max:parseFloat(g._max_crit.toFixed(1)),
      crit_pct_ultimo:parseFloat(last.crit_pct.toFixed(1)),
      mc:g._mc,
      region:last.region,zona:last.zona,
      nombre:last.nombre,ciudad:last.ciudad,departamento:last.departamento,
      am:last.am,dm:last.dm,concepto:last.concepto,
      tipo_area:last.tipo_area,tipo_ciudad:last.tipo_ciudad,
      lat:last.lat,lon:last.lon,
    };
  };

  return {
    inc: Object.values(groups).filter(g=>g._count>=minMeses).map(toRec),
    ex:  Object.values(groups).filter(g=>g._count<minMeses).map(toRec),
  };
}

function withDelta(arr,prevMap){
  return arr.map(r=>{
    const p=prevMap[r.ceco];
    return{...r,delta:p?parseFloat((r.crit_pct-p.crit_pct).toFixed(1)):null,prev_crit_pct:p?p.crit_pct:null};
  });
}

const r24=aggByYear(2024); const r25=aggByYear(2025); const r26=aggByYear(2026);
const y24=r24.inc,ex24=r24.ex;
const y25=r25.inc,ex25=r25.ex;
const y26=r26.inc,ex26=r26.ex;

const m24={};y24.forEach(r=>m24[r.ceco]=r);
const m25={};y25.forEach(r=>m25[r.ceco]=r);

const d24=withDelta(y24,{});
const d25=withDelta(y25,m24);
const d26=withDelta(y26,m25);

const LAST_MES={2024:Math.max(...y24.map(r=>r.mes)),2025:Math.max(...y25.map(r=>r.mes)),2026:Math.max(...y26.map(r=>r.mes))};
const FIRST_MES={2024:Math.min(...y24.map(r=>r.mes)),2025:Math.min(...y25.map(r=>r.mes)),2026:Math.min(...y26.map(r=>r.mes))};

console.log('Incluidas:  2024='+d24.length+' 2025='+d25.length+' 2026='+d26.length);
console.log('Excluidas:  2024='+ex24.length+' 2025='+ex25.length+' 2026='+ex26.length);

const out=
`const DATA = {
  2024: ${JSON.stringify(d24)},
  2025: ${JSON.stringify(d25)},
  2026: ${JSON.stringify(d26)}
};
const DATA_EX = {
  2024: ${JSON.stringify(ex24)},
  2025: ${JSON.stringify(ex25)},
  2026: ${JSON.stringify(ex26)}
};
const LAST_MES = ${JSON.stringify(LAST_MES)};
const FIRST_MES = ${JSON.stringify(FIRST_MES)};
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const COLOR = {High:'#CC0000',Medium:'#E8920A',Low:'#27A243',Cerrada:'#999'};
const SL = {s_fte:'FTE / HC',s_rotacion:'Rotación mes',s_aus:'Ausentismo',s_aus_med:'Aus. Médico',s_acc:'Accidentalidad',s_disc:'Proc. Disc.',s_quejas:'Quejas',s_hextra:'Horas Extra'};
`;

fs.writeFileSync('js/data.js',out,'utf8');
console.log('data.js: '+(fs.statSync('js/data.js').size/1024/1024).toFixed(2)+'MB');
