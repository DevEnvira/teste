const $=s=>document.querySelector(s);
const brl=n=>(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dt=t=>new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const num=s=>parseFloat(String(s).replace(',','.'))||0;
const SEED=[["X-Salada",18],["X-Burger",16],["X-Bacon",24],["X-Tudo",28],["Batata frita",12],["Refrigerante",6]];
let S=load(),order={},tab='vendas',editId=null,cname='',payId=null,parts=[],payM='',payNote='',gnote='';

function load(){try{const d=JSON.parse(localStorage.getItem('rv'));if(d&&d.menu){if(d.shift){d.shift.orders=d.shift.orders||[];d.shift.next=d.shift.next||d.shift.sales.length}return d}}catch(e){}
  return{menu:SEED.map(([name,price])=>({id:uid(),name,price})),shift:null,history:[]}}
const save=()=>{try{localStorage.setItem('rv',JSON.stringify(S))}catch(e){}};

function stats(sh){
  const by={},pays={Dinheiro:0,Pix:0,'Cartão':0};let total=0,sup=0,san=0;
  sh.sales.forEach(s=>{total+=s.total;(s.pays||[{m:s.pay,v:s.total}]).forEach(x=>pays[x.m]+=x.v);
    s.items.forEach(i=>{const b=by[i.name]||(by[i.name]={qty:0,sum:0});b.qty+=i.qty;b.sum+=i.qty*i.price})});
  sh.moves.forEach(m=>m.type==='sup'?sup+=m.val:san+=m.val);
  return{by,pays,total,sup,san,orders:sh.sales.length,expected:sh.float+pays.Dinheiro+sup-san,
    items:Object.values(by).reduce((a,b)=>a+b.qty,0)}}
const orderTotal=()=>S.menu.reduce((a,m)=>a+m.price*(order[m.id]||0),0);
function byTable(by){const r=Object.entries(by).sort((a,b)=>b[1].qty-a[1].qty);
  return r.length?`<table><tr><th>Item</th><th class="r">Qtd.</th><th class="r">Total</th></tr>${r.map(([n,b])=>`<tr><td>${esc(n)}</td><td class="r"><b>${b.qty}</b></td><td class="r">${brl(b.sum)}</td></tr>`).join('')}</table>`:'<p class="mut">Nenhuma venda registrada.</p>'}

function payPanel(o,rem){
  return `<div class="paybox"><p style="margin:0 0 8px"><b>Pagamento</b> · falta <b class="${rem>0?'neg':'pos'}">${brl(rem)}</b></p>
  ${parts.map((p,i)=>`<div class="line"><span class="n">${p.m}</span><b>${brl(p.v)}</b><button data-act="paydel" data-i="${i}" title="Remover">×</button></div>`).join('')}
  ${rem>0?`<div class="seg">${['Dinheiro','Pix','Cartão'].map(m=>`<button class="${m===payM?'on':''}" data-act="paym" data-v="${m}">${m}</button>`).join('')}</div>
  <div class="row"><input id="pv" inputmode="decimal" placeholder="Valor (vazio = restante)" style="flex:1"><button class="btn alt" data-act="payadd">Adicionar</button></div>
  <p class="mut" style="margin:8px 0 0;font-size:13px">Toque na forma para escolher e toque de novo para confirmar o total${parts.length?' que falta':''}. Para dividir, digite o valor e use Adicionar.</p>`:''}
  ${payNote?`<p class="pos" style="margin:8px 0 0">${payNote}</p>`:''}
  <div class="row" style="margin-top:12px"><button class="btn" data-act="payok" ${rem>0?'disabled':''}>Confirmar pagamento</button><button class="btn alt sm" data-act="paycancel">Voltar</button></div></div>`}

function oCard(o,host){
  const paying=payId===o.id&&tab===host,rem=Math.round((o.total-parts.reduce((a,p)=>a+p.v,0))*100)/100;
  return `<div class="ocard ${o.served?'ok':''}"><div class="oh"><b>#${o.num} ${esc(o.name)}</b><span class="chip ${o.served?'g':'y'}">${o.served?'Atendido · falta pagar':'Em preparo · falta pagar'}</span></div>
  <div class="mut">${new Date(o.t).toLocaleTimeString('pt-BR',{timeStyle:'short'})}</div>
  ${o.items.map(i=>`<div class="line"><span class="n">${i.qty}× ${esc(i.name)}</span><span>${brl(i.qty*i.price)}</span></div>`).join('')}
  <div class="tot" style="font-size:18px;margin:10px 0"><span>Total</span><span>${brl(o.total)}</span></div>
  ${paying?payPanel(o,rem):`<div class="row">${o.served?`<button class="btn" data-act="payopen" data-id="${o.id}">Receber pagamento</button>`:`<button class="btn" data-act="serve" data-id="${o.id}">Marcar atendido</button>`}<button class="btn alt sm" data-act="cancelord" data-id="${o.id}">Cancelar</button></div>`}</div>`}

function rVendas(){
  const el=$('#vendas');
  if(!S.shift){el.innerHTML=`<div class="empty"><h2>Caixa fechado</h2><p class="mut">Abra o caixa para registrar os pedidos da noite.</p><button class="btn" data-act="tab" data-v="caixa">Abrir caixa</button></div>`;return}
  const sh=S.shift,st=stats(sh),lines=S.menu.filter(m=>order[m.id]),total=orderTotal(),last=sh.sales.slice(-3).reverse();
  el.innerHTML=`<div class="split"><div><h2>Novo pedido</h2>
  <p><input id="cn" placeholder="Nome do cliente" value="${esc(cname)}" oninput="cname=this.value" style="width:100%;font-size:17px"></p>
  <div class="menu">${S.menu.map(m=>`<button class="item" data-act="add" data-id="${m.id}"><b>${esc(m.name)}</b><span>${brl(m.price)}</span>${st.by[m.name]?`<i>${st.by[m.name].qty} pagos</i>`:''}</button>`).join('')||'<p class="mut">Cadastre os itens na aba Cardápio.</p>'}</div></div>
  <aside class="ticket"><h3>Pedido${cname.trim()?' de '+esc(cname.trim()):''}</h3>
  ${lines.map(m=>`<div class="line"><span class="n">${esc(m.name)}</span><button data-act="dec" data-id="${m.id}">−</button><b>${order[m.id]}</b><button data-act="inc" data-id="${m.id}">+</button><span style="width:70px;text-align:right">${brl(m.price*order[m.id])}</span></div>`).join('')||'<p class="mut">Toque em um item para adicionar.</p>'}
  <div class="tot"><span>Total</span><span>${brl(total)}</span></div>
  <button class="btn" data-act="gen" ${lines.length?'':'disabled'}>Gerar pedido</button>
  ${gnote?`<p class="pos" style="margin:10px 0 0;text-align:center">${esc(gnote)}</p>`:''}
  ${lines.length?'<p style="text-align:center;margin:10px 0 0"><button class="btn alt sm" data-act="clear">Limpar</button></p>':''}</aside></div>
  <h3 style="margin-top:28px">Últimos pagos</h3>
  ${last.map(s=>`<div class="line"><span class="mut">${new Date(s.t).toLocaleTimeString('pt-BR',{timeStyle:'short'})}</span><span class="n">${esc(s.name||'')} · ${s.items.map(i=>i.qty+'× '+esc(i.name)).join(', ')}</span><span>${(s.pays||[{m:s.pay}]).map(p=>p.m).join(' + ')}</span><b>${brl(s.total)}</b></div>`).join('')||'<p class="mut">Ainda sem pedidos pagos.</p>'}
  ${last.length?'<p><button class="btn alt sm" data-act="undo">Desfazer último pagamento</button></p>':''}`}

function rAbertos(){
  const el=$('#abertos');
  if(!S.shift){el.innerHTML=`<div class="empty"><h2>Caixa fechado</h2><p class="mut">Abra o caixa para ver os pedidos em aberto.</p><button class="btn" data-act="tab" data-v="caixa">Abrir caixa</button></div>`;return}
  const os=S.shift.orders,a=os.filter(o=>!o.served),b=os.filter(o=>o.served),sum=l=>l.reduce((x,o)=>x+o.total,0);
  const col=(t,l,c)=>`<div class="ocol"><div class="ohead"><h3>${t}</h3><span class="chip ${c}">${l.length} · ${brl(sum(l))}</span></div><div class="olist">${l.map(o=>oCard(o,'abertos')).join('')||'<p class="mut">Nenhum pedido aqui.</p>'}</div></div>`;
  el.innerHTML=`<div class="row" style="justify-content:space-between;margin-bottom:18px"><h2 style="margin:0">Pedidos em aberto</h2><span class="mut">${os.length} ${os.length===1?'pedido':'pedidos'} · ${brl(sum(os))} a receber</span></div>
  <div class="cols">${col('Em preparo',a,'y')+col('Atendidos, aguardando pagamento',b,'g')}</div>`}

function hist(){
  return S.history.length?S.history.map((h,i)=>`<details ${i?'':'open'}><summary>${dt(h.openedAt)} → ${dt(h.closedAt)} · vendeu ${brl(h.total)} · ${h.diff===0?'caixa batido':`<span class="${h.diff<0?'neg':'pos'}">${h.diff<0?'faltou ':'sobrou '}${brl(Math.abs(h.diff))}</span>`}</summary>
  <p class="mut">${h.orders} pedidos · Dinheiro ${brl(h.pays.Dinheiro)} · Pix ${brl(h.pays.Pix)} · Cartão ${brl(h.pays['Cartão'])} · Troco inicial ${brl(h.float)} · Contado ${brl(h.counted)}</p>${byTable(h.by)}</details>`).join(''):'<p class="mut">Nenhuma noite fechada ainda.</p>'}

function rCaixa(){
  const el=$('#caixa'),sh=S.shift;
  if(!sh){el.innerHTML=`<h2>Caixa</h2><div class="panel"><h3>Abrir caixa</h3><form id="fOpen" class="row"><input name="f" inputmode="decimal" placeholder="Troco inicial (R$)" value="0"><button class="btn">Abrir caixa</button></form></div><div class="panel"><h3>Noites anteriores</h3>${hist()}</div>`;return}
  const st=stats(sh);
  el.innerHTML=`<div class="row" style="justify-content:space-between"><h2>Caixa aberto</h2><span class="mut">desde ${dt(sh.openedAt)} <button class="btn alt sm noprint" data-act="print">Imprimir</button></span></div>
  <div class="cards"><div class="card hi"><small>Total vendido</small><b>${brl(st.total)}</b></div><div class="card"><small>Pedidos pagos</small><b>${st.orders}</b></div><div class="card"><small>Em aberto</small><b>${sh.orders.length}</b></div><div class="card"><small>Itens vendidos</small><b>${st.items}</b></div>
  <div class="card"><small>Dinheiro</small><b>${brl(st.pays.Dinheiro)}</b></div><div class="card"><small>Pix</small><b>${brl(st.pays.Pix)}</b></div><div class="card"><small>Cartão</small><b>${brl(st.pays['Cartão'])}</b></div></div>
  <div class="panel"><h3>Quantos saíram até agora</h3>${byTable(st.by)}</div>
  <div class="panel"><h3>Dinheiro na gaveta: ${brl(st.expected)}</h3><p class="mut">Troco inicial ${brl(sh.float)} + vendas em dinheiro ${brl(st.pays.Dinheiro)} + entradas ${brl(st.sup)} − retiradas ${brl(st.san)}</p>
  <form id="fMove" class="row"><select name="type"><option value="san">Retirada (sangria)</option><option value="sup">Entrada (reforço)</option></select><input name="v" inputmode="decimal" placeholder="Valor"><input name="note" placeholder="Motivo"><button class="btn alt">Registrar</button></form>
  ${sh.moves.map(m=>`<div class="line"><span class="mut">${new Date(m.t).toLocaleTimeString('pt-BR',{timeStyle:'short'})}</span><span class="n">${m.type==='san'?'Retirada':'Entrada'} ${esc(m.note||'')}</span><b class="${m.type==='san'?'neg':'pos'}">${brl(m.val)}</b></div>`).join('')}</div>
  <div class="panel noprint"><h3>Fechar caixa</h3><p class="mut">Conte o dinheiro da gaveta e informe o valor.</p><div class="row"><input id="cnt" inputmode="decimal" placeholder="Dinheiro contado" oninput="diff(${st.expected})"><b id="dif"></b><button class="btn red" data-act="close">Fechar caixa</button></div></div>
  <div class="panel noprint"><h3>Noites anteriores</h3>${hist()}</div>`}
function diff(exp){const v=$('#cnt').value,d=num(v)-exp,el=$('#dif');
  el.className=d<0?'neg':'pos';el.textContent=v?(Math.abs(d)<0.005?'Caixa batido':(d<0?'Faltam ':'Sobram ')+brl(Math.abs(d))):''}

function rMenu(){
  const e=S.menu.find(m=>m.id===editId)||{name:'',price:''};
  $('#cardapio').innerHTML=`<h2>Cardápio</h2><div class="panel"><h3>${editId?'Editar item':'Novo item'}</h3>
  <form id="fItem" class="row"><input name="name" placeholder="Nome (ex.: X-Salada)" value="${esc(e.name)}" required><input name="price" inputmode="decimal" placeholder="Preço" value="${e.price}" required><button class="btn">Salvar</button>${editId?'<button type="button" class="btn alt" data-act="cancel">Cancelar</button>':''}</form></div>
  <div class="panel"><table><tr><th>Item</th><th class="r">Preço</th><th></th></tr>${S.menu.map(m=>`<tr><td>${esc(m.name)}</td><td class="r">${brl(m.price)}</td><td class="r"><button class="btn alt sm" data-act="edit" data-id="${m.id}">Editar</button> <button class="btn alt sm" data-act="del" data-id="${m.id}">Excluir</button></td></tr>`).join('')}</table></div>`}

function render(){
  const s=$('#status');s.className='status'+(S.shift?' open':'');s.textContent=S.shift?'Caixa aberto':'Caixa fechado';
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===tab));
  document.querySelectorAll('main section').forEach(x=>x.hidden=x.id!==tab);
  const n=S.shift?S.shift.orders.length:0,nb=$('#nb');nb.textContent=n||'';nb.hidden=!n;
  rVendas();rAbertos();rCaixa();rMenu()}

const remOf=o=>Math.round((o.total-parts.reduce((a,p)=>a+p.v,0))*100)/100;
function settle(){
  const o=S.shift.orders.find(x=>x.id===payId);
  S.shift.sales.push({id:uid(),t:Date.now(),num:o.num,name:o.name,items:o.items,total:o.total,pays:parts});
  S.shift.orders=S.shift.orders.filter(x=>x.id!==payId);payId=null;parts=[];payNote='';payM=''}
const A={
  tab:d=>{tab=d.v},
  add:d=>{gnote='';order[d.id]=(order[d.id]||0)+1},
  inc:d=>{order[d.id]++},
  dec:d=>{if(--order[d.id]<=0)delete order[d.id]},
  clear:()=>{order={};cname=''},
  paym:d=>{
    const o=S.shift.orders.find(x=>x.id===payId);
    if(payM===d.v&&!($('#pv').value||'').trim()){parts.push({m:d.v,v:remOf(o)});settle();return}
    payM=d.v;payNote=''},
  gen:()=>{
    const items=S.menu.filter(m=>order[m.id]).map(m=>({name:m.name,price:m.price,qty:order[m.id]}));
    if(!items.length)return;
    S.shift.next=(S.shift.next||0)+1;
    S.shift.orders.push({id:uid(),num:S.shift.next,name:cname.trim()||'Cliente',t:Date.now(),items,total:orderTotal(),served:false});
    gnote='Pedido #'+S.shift.next+' de '+S.shift.orders[S.shift.orders.length-1].name+' enviado para Pedidos em aberto.';
    order={};cname=''},
  serve:d=>{S.shift.orders.find(o=>o.id===d.id).served=true},
  cancelord:d=>{if(confirm('Cancelar este pedido?')){S.shift.orders=S.shift.orders.filter(o=>o.id!==d.id);if(payId===d.id){payId=null;parts=[];payNote=''}}},
  payopen:d=>{payId=d.id;parts=[];payM='';payNote=''},
  paycancel:()=>{payId=null;parts=[];payNote=''},
  payadd:()=>{
    if(!payM){alert('Escolha a forma de pagamento.');return}
    const o=S.shift.orders.find(x=>x.id===payId),rem=Math.round((o.total-parts.reduce((a,p)=>a+p.v,0))*100)/100;
    let v=num($('#pv').value)||rem;if(v<=0)return;payNote='';
    if(v>rem){if(payM==='Dinheiro')payNote='Troco a devolver: '+brl(Math.round((v-rem)*100)/100);v=rem}
    parts.push({m:payM,v})},
  paydel:d=>{parts.splice(+d.i,1);payNote=''},
  payok:()=>settle(),
  undo:()=>{if(confirm('Desfazer o último pagamento?'))S.shift.sales.pop()},
  edit:d=>{editId=d.id},cancel:()=>{editId=null},
  del:d=>{if(confirm('Excluir este item? As vendas já feitas continuam salvas.'))S.menu=S.menu.filter(m=>m.id!==d.id)},
  print:()=>window.print(),
  close:()=>{
    if(S.shift.orders.length){alert('Ainda há pedidos em aberto. Receba ou cancele antes de fechar o caixa.');return}
    const raw=$('#cnt').value;if(!raw.trim()){alert('Informe o dinheiro contado na gaveta.');return}
    const sh=S.shift,st=stats(sh),v=num(raw);
    if(!confirm('Fechar o caixa? Isso encerra a noite.'))return;
    S.history.unshift({...sh,closedAt:Date.now(),counted:v,expected:st.expected,diff:Math.round((v-st.expected)*100)/100,total:st.total,by:st.by,pays:st.pays,orders:st.orders});
    S.shift=null;order={};cname=''}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');
  if(!b||!A[b.dataset.act])return;A[b.dataset.act](b.dataset);save();render()});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target,v=k=>f.elements[k].value;
  if(f.id==='fOpen')S.shift={id:uid(),openedAt:Date.now(),float:num(v('f')),sales:[],moves:[],orders:[],next:0};
  if(f.id==='fMove'){const val=num(v('v'));if(val>0)S.shift.moves.push({t:Date.now(),type:v('type'),val,note:v('note')})}
  if(f.id==='fItem'){const name=v('name').trim(),price=num(v('price'));if(!name)return;
    if(editId){const m=S.menu.find(x=>x.id===editId);m.name=name;m.price=price;editId=null}else S.menu.push({id:uid(),name,price})}
  save();render()});
render();
