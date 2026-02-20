let activeYear=2026, activeNivel='', currentData=DATA[2026];
let markerRefs={}, layerGroup;

const map=L.map('map',{zoomControl:true,preferCanvas:true});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap © CARTO',maxZoom:19,subdomains:'abcd'}).addTo(map);
map.setView([4.5,-74.0],6);

function makeMarker(r,i){
  const c=COLOR[r.nivel]||'#888';
  const rad=r.nivel==='High'?8:r.nivel==='Low'?4:5.5;
  const m=L.circleMarker([r.lat,r.lon],{radius:rad,fillColor:c,color:'#fff',weight:r.nivel==='High'?1.5:1,opacity:1,fillOpacity:r.nivel==='High'?0.95:0.85});
  const dSign=r.delta===null?'–':r.delta>0?'▲ +'+r.delta.toFixed(1)+'%':'▼ '+r.delta.toFixed(1)+'%';
  const dCol=r.delta===null?'#aaa':r.delta>0?'#CC0000':'#27A243';
  m.bindTooltip('<strong>'+(r.nombre||'?')+'</strong> · '+(r.ciudad||'')+'<br>Criticidad: <strong style="color:'+c+'">'+r.crit_pct.toFixed(0)+'%</strong> '+r.nivel+' &nbsp;<span style="color:'+dCol+';font-weight:700">'+dSign+'</span>',{direction:'top',opacity:.95});
  const critBg=c+'18';
  const scoreRows=Object.entries(SL).map(([k,lbl])=>{const v=r[k]||0;const w=Math.min(100,(v/15)*100);const sc=v>10?'#CC0000':v>5?'#E8920A':'#27A243';return '<div class="psr"><span class="psl">'+lbl+'</span><div class="psbw"><div class="psbf" style="width:'+w+'%;background:'+sc+'"></div></div><span class="psv">'+v.toFixed(0)+'</span></div>';}).join('');
  const dHTML=r.delta!==null?'<div class="pdr"><span class="pdv" style="color:'+(r.delta>0?'#CC0000':'#27A243')+'">'+(r.delta>0?'▲ +':'▼ ')+Math.abs(r.delta).toFixed(1)+'%</span><span class="pdl">vs '+(activeYear-1)+' ('+r.prev_crit_pct.toFixed(0)+'%)</span></div>':'<div style="font-size:9px;opacity:.5;margin-top:4px">Sin dato año anterior</div>';
  const popup='<div class="popup"><div class="pt" style="color:'+c+'">'+(r.concepto||'')+' · '+(r.region||'')+' / '+(r.zona||'')+'</div><div class="pn">'+(r.nombre||'Sin nombre')+'</div><div class="pl">📍 '+(r.ciudad||'')+', '+(r.departamento||'')+'</div><div class="pcb" style="background:'+critBg+';border-left:4px solid '+c+'"><div class="pc-num" style="color:'+c+'">'+r.crit_pct.toFixed(0)+'%</div><div class="pc-r"><div class="pniv" style="color:'+c+'">'+r.nivel+'</div><div class="pbw"><div class="pbf" style="width:'+r.crit_pct+'%;background:'+c+'"></div></div>'+dHTML+'</div></div><div class="psc">'+scoreRows+'</div><div class="pkp"><div class="pk"><div class="pkv">'+(r.attrition*100).toFixed(1)+'%</div><div class="pkl">Rotación</div></div><div class="pk"><div class="pkv">'+(r.abs_ratio*100).toFixed(1)+'%</div><div class="pkl">Ausentismo</div></div><div class="pk"><div class="pkv">'+r.acc_pct.toFixed(1)+'%</div><div class="pkl">Accidentes</div></div><div class="pk"><div class="pkv">'+r.horas_extra_ratio.toFixed(1)+'%</div><div class="pkl">H.Extra</div></div><div class="pk"><div class="pkv">'+r.proc_disc_pct.toFixed(1)+'%</div><div class="pkl">Proc.Disc.</div></div><div class="pk"><div class="pkv">'+r.quejas_pct.toFixed(1)+'%</div><div class="pkl">Quejas</div></div></div><div class="ppl"><strong>AM:</strong> '+(r.am||'N/A')+'<br><strong>DM:</strong> '+(r.dm||'N/A')+'</div></div>';
  m.bindPopup(popup,{maxWidth:340,minWidth:280});
  m.on('click',()=>highlightItem(i));
  return m;
}

function buildMap(data){
  if(layerGroup)layerGroup.clearLayers();
  layerGroup=L.layerGroup().addTo(map);
  markerRefs={};
  const order=[...data.keys()].sort((a,b)=>{const o={Low:0,Medium:1,High:2};return(o[data[a].nivel]||0)-(o[data[b].nivel]||0);});
  order.forEach(i=>{const m=makeMarker(data[i],i);markerRefs[i]=m;layerGroup.addLayer(m);});
}

function renderLista(data){
  const el=document.getElementById('tab-lista');
  if(!data.length){el.innerHTML='<div style="text-align:center;padding:40px 20px;color:#ccc;font-size:13px">Sin resultados</div>';return;}
  el.innerHTML=data.map((r,i)=>{
    const c=COLOR[r.nivel]||'#888';
    const pct=r.crit_pct.toFixed(0);
    const hD=r.delta!==null;
    const dUp=hD&&r.delta>0;
    const dStr=!hD?'':dUp?'▲ +'+r.delta.toFixed(1)+'%':r.delta<0?'▼ '+r.delta.toFixed(1)+'%':'=';
    const dCl=!hD?'dn':dUp?'du':'dd';
    return '<div class="li" data-i="'+i+'" onclick="focusItem('+i+')">'
      +'<div class="li-top"><span class="li-name">'+(r.nombre||'Sin nombre')+'</span><span class="li-badge" style="background:'+c+'">'+r.nivel+'</span></div>'
      +'<div class="li-addr">'+(r.ciudad||'')+' · '+(r.departamento||'')+' · '+(r.region||'')+'</div>'
      +'<div class="li-bar-row"><div class="li-bw"><div class="li-bf" style="width:'+pct+'%;background:'+c+'"></div></div><span class="li-pct" style="color:'+c+'">'+pct+'%</span>'+(hD?'<span class="li-delta '+dCl+'">'+dStr+'</span>':'')+'</div>'
      +'<div class="li-meta">'+(r.attrition>0?'<span>↩ '+(r.attrition*100).toFixed(1)+'%</span>':'')+(r.abs_ratio>0?'<span>🏥 '+(r.abs_ratio*100).toFixed(1)+'%</span>':'')+(r.acc_pct>0?'<span>⚠ '+r.acc_pct.toFixed(1)+'%</span>':'')+'</div></div>';
  }).join('');
}

function focusItem(i){const r=currentData[i];if(!r)return;map.setView([r.lat,r.lon],14,{animate:true});if(markerRefs[i])markerRefs[i].openPopup();document.querySelectorAll('.li').forEach(el=>el.classList.remove('active'));const el=document.querySelector('.li[data-i="'+i+'"]');if(el){el.classList.add('active');el.scrollIntoView({behavior:'smooth',block:'nearest'});}}
function highlightItem(i){document.querySelectorAll('.li').forEach(el=>el.classList.remove('active'));const el=document.querySelector('.li[data-i="'+i+'"]');if(el){el.classList.add('active');el.scrollIntoView({behavior:'smooth',block:'nearest'});}}

function avg(arr,k){const v=arr.map(r=>r[k]).filter(x=>x>0);return v.length?v.reduce((s,x)=>s+x,0)/v.length:0;}

function updateResumen(data){
  const H=data.filter(r=>r.nivel==='High'),M=data.filter(r=>r.nivel==='Medium'),L=data.filter(r=>r.nivel==='Low'),t=data.length||1;
  const aD=(arr)=>{const v=arr.map(r=>r.delta).filter(x=>x!==null&&x!==undefined);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null;};
  const fD=(d,yr)=>{if(d===null)return'';const s=d>0?'▲ +'+d.toFixed(1)+'%':'▼ '+Math.abs(d).toFixed(1)+'%';const c=d>0?'#CC0000':'#27A243';return'<span style="color:'+c+'">'+s+' vs '+(yr-1)+'</span>';};
  document.getElementById('cntH').textContent=H.length;
  document.getElementById('cntM').textContent=M.length;
  document.getElementById('cntL').textContent=L.length;
  document.getElementById('pctH').textContent=(H.length/t*100).toFixed(1)+'%';
  document.getElementById('pctM').textContent=(M.length/t*100).toFixed(1)+'%';
  document.getElementById('pctL').textContent=(L.length/t*100).toFixed(1)+'%';
  document.getElementById('dltH').innerHTML=fD(aD(H),activeYear);
  document.getElementById('dltM').innerHTML=fD(aD(M),activeYear);
  document.getElementById('dltL').innerHTML=fD(aD(L),activeYear);
  document.getElementById('lgH').textContent=H.length;
  document.getElementById('lgM').textContent=M.length;
  document.getElementById('lgL').textContent=L.length;
  document.getElementById('cntVis').textContent=t;
  document.getElementById('navInfo').textContent=t.toLocaleString('es-CO')+' tiendas';
}

function renderKPIs(data){
  document.getElementById('scoreRows').innerHTML=Object.entries(SL).map(([k,lbl])=>{const a=avg(data,k);const w=Math.min(100,(a/15)*100);const c=a>10?'#CC0000':a>5?'#E8920A':'#27A243';return'<div class="sr"><span class="sl">'+lbl+'</span><div class="sbw"><div class="sbf" style="width:'+w+'%;background:'+c+'"></div></div><span class="sv">'+a.toFixed(1)+'</span></div>';}).join('');
  const rot=avg(data,'attrition')*100,aus=avg(data,'abs_ratio')*100,acc=avg(data,'acc_pct'),hex=avg(data,'horas_extra_ratio'),disc=avg(data,'proc_disc_pct'),critA=avg(data,'crit_pct');
  const dVals=data.map(r=>r.delta).filter(x=>x!==null&&x!==undefined);
  const avgD=dVals.length?dVals.reduce((s,x)=>s+x,0)/dVals.length:null;
  const dCard=avgD!==null?'<div class="kd" style="color:'+(avgD>0?'#CC0000':'#27A243')+'">'+(avgD>0?'▲ +':'▼ ')+Math.abs(avgD).toFixed(1)+'% vs '+(activeYear-1)+'</div>':'';
  document.getElementById('kpiGrid').innerHTML=[[critA.toFixed(1)+'%','Crit. promedio',critA>60?'#CC0000':critA>40?'#E8920A':'#27A243',dCard],[rot.toFixed(1)+'%','Rotación',rot>5?'#CC0000':rot>2?'#E8920A':'#27A243',''],[aus.toFixed(1)+'%','Ausentismo',aus>5?'#CC0000':aus>2?'#E8920A':'#27A243',''],[acc.toFixed(2)+'%','Accidentes',acc>1?'#CC0000':acc>0.3?'#E8920A':'#27A243',''],[hex.toFixed(1)+'%','H.Extra ratio',hex>10?'#CC0000':hex>5?'#E8920A':'#27A243',''],[disc.toFixed(1)+'%','Proc.Disc.',disc>2?'#CC0000':disc>0.5?'#E8920A':'#27A243','']].map(([v,l,c,extra])=>'<div class="kc" style="border-left-color:'+c+'"><div class="kv" style="color:'+c+'">'+v+'</div><div class="kl">'+l+'</div>'+extra+'</div>').join('');
  const top10el=document.getElementById('top10');
  top10el.innerHTML=[...data].sort((a,b)=>b.crit_pct-a.crit_pct).slice(0,10).map((r,i)=>{const c=COLOR[r.nivel]||'#888';const hD=r.delta!==null;const dUp=hD&&r.delta>0;const dStr=!hD?'':dUp?'▲ +'+r.delta.toFixed(1)+'%':r.delta<0?'▼ '+r.delta.toFixed(1)+'%':'=';const dCl=!hD?'#ccc':dUp?'#CC0000':'#27A243';return'<div class="ti" onclick="focusItem(currentData.findIndex(x=>x.ceco===r.ceco))"><span class="tr">'+(i+1)+'</span><div class="tn"><div class="tnm">'+(r.nombre||'Sin nombre')+'</div><div class="tc">'+(r.ciudad||'')+' · '+(r.region||'')+'</div></div><div class="tt"><div class="tp" style="color:'+c+'">'+r.crit_pct.toFixed(0)+'%</div>'+(hD?'<div class="td2" style="color:'+dCl+'">'+dStr+'</div>':'')+'</div></div>';}).join('');
}

function fillCiud(year){
  const sel=document.getElementById('fciud');
  const cur=sel.value;
  const cities=[...new Set((DATA[year]||[]).map(r=>r.ciudad).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  sel.innerHTML='<option value="">Todas las ciudades</option>'+cities.map(c=>'<option value="'+c.toLowerCase()+'"'+(cur===c.toLowerCase()?' selected':'')+'>'+c+'</option>').join('');
}

function fil(){
  const s=document.getElementById('si').value.toLowerCase();
  const rg=document.getElementById('freg').value;
  const zn=document.getElementById('fzona').value;
  const cn=document.getElementById('fconc').value;
  const cd=document.getElementById('fciud').value;
  currentData=(DATA[activeYear]||[]).filter(r=>
    (!s||[r.nombre,r.ciudad,r.departamento,r.am,r.dm].join(' ').toLowerCase().includes(s))
    &&(!rg||r.region.toLowerCase()===rg)
    &&(!zn||r.zona.toLowerCase()===zn)
    &&(!cn||r.concepto.toLowerCase()===cn)
    &&(!cd||r.ciudad.toLowerCase()===cd)
    &&(!activeNivel||r.nivel.toLowerCase()===activeNivel)
  );
  renderLista(currentData);buildMap(currentData);updateResumen(currentData);renderKPIs(currentData);
}

function setYear(year){
  activeYear=year;
  document.querySelectorAll('.yb').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.y)===year));
  const mes=LAST_MES[year]||1;
  const hasPrev=DATA[year-1]&&DATA[year-1].length>0;
  document.getElementById('periodTxt').innerHTML='<strong>'+year+'</strong> · Datos al '+MESES[mes]+' '+year+(hasPrev?' · Comparativo vs '+(year-1):' · Sin comparativo');
  fillCiud(year);
  fil();
}

function setNivel(nivel){
  activeNivel=nivel;
  const map_={'':'all','high':'high','medium':'med','low':'low'};
  ['all','high','med','low'].forEach(k=>{const el=document.getElementById('nb-'+k);if(el){el.className='nbtn';if(map_[nivel]===k)el.className='nbtn a-'+k;}});
  ['rc-high','rc-med','rc-low'].forEach(id=>{const rc=document.getElementById(id);if(rc){rc.style.borderColor='transparent';}});
  if(nivel){const rcMap={high:'rc-high',medium:'rc-med',low:'rc-low'};const rc=document.getElementById(rcMap[nivel]);if(rc)rc.style.borderColor=COLOR[nivel.charAt(0).toUpperCase()+nivel.slice(1)]||'#CC0000';}
  fil();
}

function showTab(name){document.getElementById('tab-lista').style.display=name==='lista'?'':'none';document.getElementById('tab-kpis').style.display=name==='kpis'?'':'none';document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['lista','kpis'][i]===name));if(name==='kpis')renderKPIs(currentData);}

function dl(name,mime,content){const b=new Blob([content],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function expCSV(){const h=['Año','Mes','CECO','Nombre','Ciudad','Departamento','Region','Zona','Concepto','Criticidad%','Nivel','Weighted','Delta_vs_AñoAnt','Crit_AñoAnt','FTE_Ratio','Attrition','Abs_Ratio','Acc%','ProcDisc%','Quejas%','HExtra_Ratio','AM','DM','Lat','Lon'];const rows=currentData.map(r=>{const e=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return[r.anio,r.mes,r.ceco,r.nombre,r.ciudad,r.departamento,r.region,r.zona,r.concepto,r.crit_pct,r.nivel,r.weighted,r.delta??'',r.prev_crit_pct??'',r.fte_ratio,r.attrition,r.abs_ratio,r.acc_pct,r.proc_disc_pct,r.quejas_pct,r.horas_extra_ratio,r.am,r.dm,r.lat,r.lon].map(e).join(',');});dl('criticidad_ara_'+activeYear+'.csv','text/csv;charset=utf-8;','\uFEFF'+[h.map(x=>'"'+x+'"').join(','),...rows].join('\n'));}
function expJSON(){dl('criticidad_ara_'+activeYear+'.json','application/json',JSON.stringify(currentData,null,2));}

setYear(2026);
