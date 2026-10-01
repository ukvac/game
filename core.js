/* Calculation rules adapted from Brick_and_Olive_Inventory.xlsx. No formula evaluation. */
(function(root) {
  'use strict';
  const categories=['Food','Drinks','Cups & lids','Packaging','Cleaning','Equipment & decor','Fees','Fruits','Bread','Snacks','Coffee','Juice','Protein','Seasoning','Vegetables'];
  const numeric=v=>typeof v==='number' && Number.isFinite(v);
  const num=v=>v===''||v===null||v===undefined?null:(Number.isFinite(Number(v))?Number(v):null);
  const sum=(rows,fn)=>rows.reduce((s,r)=>s+(fn(r)||0),0);
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const validDate=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  const id=()=>globalThis.crypto.randomUUID();
  function purchase(p,state,asOf=today()) {
    const matches=state.items.filter(i=>i.name===p.item), item=matches.length===1?matches[0]:null;
    const size=p.receiptId?num(p.packSize):(num(p.packSize)??item?.packSize??null);
    const amount=numeric(p.packs)&&numeric(p.price)?p.packs*p.price:null;
    const quantity=numeric(p.packs)&&numeric(size)&&size>0?p.packs*size:null;
    const duplicate=!!p.receiptId&&p.line!==null&&p.line!==''&&state.purchases.filter(q=>q.receiptId===p.receiptId&&String(q.line)===String(p.line)&&q.location===p.location).length>1;
    let status='Recorded';
    if(!item)status='Check item name';else if(!validDate(p.date))status='Confirm date';else if(p.date>asOf)status='Check future date';else if(!['Shop','Home'].includes(p.location)&&item.category!=='Fees')status='Choose Shop / Home';else if(!(p.packs>0&&size>0))status='Confirm pack size';else if(!numeric(p.price)||p.price<0)status='Add actual price';else if(duplicate)status='Check duplicate';
    return {...p,category:item?.category||p.category||'Uncategorised',unit:item?.unit||'',size,amount,quantity,status,duplicate};
  }
  function stock(item,state,asOf=today(),purchases) {
    const s=state.counts[item.id]||{}, ps=purchases||state.purchases.map(p=>purchase(p,state,asOf));
    const fee=item.category==='Fees'; const dated=validDate(s.date)&&s.date<=asOf;
    const shop=!fee&&dated&&numeric(s.shop)?s.shop+sum(ps.filter(p=>p.item===item.name&&p.location==='Shop'&&p.date>s.date&&p.date<=asOf),p=>p.quantity):null;
    const home=!fee&&dated&&numeric(s.home)?s.home+sum(ps.filter(p=>p.item===item.name&&p.location==='Home'&&p.date>s.date&&p.date<=asOf),p=>p.quantity):null;
    const total=numeric(shop)&&numeric(home)?shop+home:null;
    const unitCost=item.packSize>0&&numeric(item.price)&&item.price>=0?item.price/item.packSize:null;
    const levels=numeric(item.minimum)&&item.minimum>=0&&numeric(item.target)&&item.target>=item.minimum&&item.packSize>0;
    const duplicate=state.items.filter(i=>i.name===item.name).length>1;
    const extra=sum(state.requests.filter(r=>r.item===item.name),r=>r.packs);
    const buy=!fee&&!duplicate&&levels&&numeric(total)?(total<=item.minimum?Math.ceil(Math.max(0,item.target-total)/item.packSize):0)+extra:null;
    const bring=!fee&&numeric(shop)&&numeric(home)&&numeric(item.minimum)?Math.min(home,Math.max(0,item.minimum-shop)):null;
    let status='In stock';
    if(fee)status='Expense only';else if(duplicate)status='Duplicate item';else if(!numeric(s.shop)||!numeric(s.home)||!validDate(s.date))status='Count both locations';else if(!dated)status='Check count date';else if(!numeric(item.minimum)||!numeric(item.target)||!(item.packSize>0))status='Set buying levels';else if(item.target<item.minimum)status='Check target';else if(!numeric(unitCost))status='Add pack price';else if(total<=item.minimum)status='Low stock';else if(extra>0)status='Extra requested';
    return {...item,...s,shop,home,total,unitCost,value:numeric(total)&&numeric(unitCost)?total*unitCost:null,buy,bring,extra,buyCost:numeric(buy)&&numeric(unitCost)?buy*item.price:null,status};
  }
  function receipt(r,state,ps) {
    const entered=sum((ps||state.purchases.map(p=>purchase(p,state))).filter(p=>p.receiptId===r.id),p=>p.amount);
    const refDuplicate=state.receipts.some(q=>q!==r&&q.supplier===r.supplier&&r.reference&&q.reference===r.reference);
    const dateDuplicate=state.receipts.some(q=>q!==r&&r.date&&q.date===r.date&&q.supplier===r.supplier&&q.total===r.total);
    const hashDuplicate=state.receipts.some(q=>q!==r&&r.hash&&q.hash===r.hash);
    const duplicateId=state.receipts.filter(q=>q.id===r.id).length>1;
    return {...r,entered,difference:numeric(r.total)?round(entered-r.total):null,status:duplicateId?'Duplicate receipt ID':hashDuplicate?'Duplicate photo':refDuplicate||dateDuplicate?'Possible duplicate':!validDate(r.date)?'Confirm date':!r.reference?'Add reference':numeric(r.total)&&Math.abs(round(entered-r.total))<.01?'Matched':'Check difference'};
  }
  function metrics(state,date=today()) {
    const ps=state.purchases.map(p=>purchase(p,state)), stocks=state.items.map(i=>stock(i,state,today(),ps));
    const d=new Date(date+'T12:00:00Z'), monday=new Date(d);monday.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
    const weekStart=monday.toISOString().slice(0,10);monday.setUTCDate(monday.getUTCDate()+7);const weekEnd=monday.toISOString().slice(0,10);
    return {ps,stocks,total:sum(ps,p=>p.amount),day:sum(ps.filter(p=>p.date===date),p=>p.amount),week:sum(ps.filter(p=>p.date>=weekStart&&p.date<weekEnd),p=>p.amount),month:sum(ps.filter(p=>p.date?.slice(0,7)===date.slice(0,7)),p=>p.amount),value:sum(stocks,s=>s.value),shopping:sum(stocks,s=>s.buyCost),low:stocks.filter(s=>s.status==='Low stock').length,uncounted:stocks.filter(s=>s.status==='Count both locations').length,incomplete:ps.filter(p=>p.status!=='Recorded').length};
  }
  function parseDate(v) {
    if(v instanceof Date)return v.toISOString().slice(0,10);
    if(numeric(v)){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return d.toISOString().slice(0,10);}
    if(!v)return ''; let s=String(v).trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
    const m=s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';
  }
  function fromWorkbook(wb,XLSX) {
    for(const name of ['Items','Stock','Purchases','Receipts'])if(!wb.Sheets[name])throw Error(`This file needs a ${name} sheet. Choose the Brick & Olive workbook.`);
    for(const [name,cell,expected] of [['Items','B6','Item'],['Stock','E6','Shop count'],['Purchases','B6','Item'],['Receipts','A6','Receipt ID']])if(wb.Sheets[name][cell]?.v!==expected)throw Error(`Unexpected ${name} layout. The import expects the original Brick & Olive columns.`);
    const raw={}; for(const name of wb.SheetNames){raw[name]={};for(const [key,c] of Object.entries(wb.Sheets[name]))if(!key.startsWith('!')&&!c.f)raw[name][key]=c.v;}
    return fromRaw(raw);
  }
  function fromRaw(raw) {
    const state={version:1,items:[],purchases:[],receipts:[],requests:[],counts:{},reportDate:parseDate(raw.Dashboard?.B7)||today(),updatedAt:null};
    const rows=(sheet,col,start)=>Object.keys(raw[sheet]||{}).filter(k=>new RegExp(`^${col}\\d+$`).test(k)).map(k=>+k.slice(col.length)).filter(r=>r>=start).sort((a,b)=>a-b);
    for(const r of rows('Items','B',7)){const s=raw.Items;state.items.push({id:String(s['A'+r]??id()),name:String(s['B'+r]),category:s['C'+r]||'',unit:s['D'+r]||'each',minimum:num(s['E'+r]),target:num(s['F'+r]),packSize:num(s['G'+r]),price:num(s['H'+r]),supplier:s['I'+r]||'',notes:s['J'+r]||''});}
    for(const r of rows('Stock','A',7)){const s=raw.Stock; if([s['E'+r],s['F'+r],s['G'+r],s['S'+r]].some(v=>v!==undefined))state.counts[String(s['A'+r])]={shop:num(s['E'+r]),home:num(s['F'+r]),date:parseDate(s['G'+r]),notes:s['S'+r]||''};}
    for(const r of rows('Purchases','B',7)){const s=raw.Purchases;state.purchases.push({id:'p-'+r,date:parseDate(s['A'+r]),item:String(s['B'+r]),location:s['C'+r]||'',packs:num(s['D'+r]),price:num(s['F'+r]),supplier:s['K'+r]||'',receiptId:String(s['N'+r]||''),line:num(s['O'+r]),packSize:num(s['P'+r]),notes:s['Q'+r]||'',quantityText:''});}
    for(const r of rows('Receipts','A',7)){const s=raw.Receipts;state.receipts.push({key:'r-'+r,id:String(s['A'+r]),date:parseDate(s['B'+r]),supplier:s['C'+r]||'',total:num(s['D'+r]),reference:s['G'+r]||'',notes:s['H'+r]||'',photo:s['K'+r]||'',hash:s['L'+r]||''});}
    for(const r of rows('Shopping','A',414)){const s=raw.Shopping;state.requests.push({id:'q-'+r,item:s['A'+r],packs:num(s['B'+r]),notes:s['D'+r]||''});}
    return state;
  }
  function validate(s) {
    if(!s||s.version!==1||!Array.isArray(s.items)||!Array.isArray(s.purchases)||!Array.isArray(s.receipts)||!Array.isArray(s.requests)||!s.counts||typeof s.counts!=='object'||Array.isArray(s.counts))throw Error('This is not a valid Brick & Olive backup.');
    const specs={items:{strings:['id','name','category','unit','supplier','notes'],numbers:['minimum','target','packSize','price']},purchases:{strings:['id','date','item','location','supplier','receiptId','notes','quantityText'],numbers:['packs','price','line','packSize']},receipts:{strings:['key','id','date','supplier','reference','notes','photo','hash'],numbers:['total']},requests:{strings:['id','item','notes'],numbers:['packs']}};
    for(const [list,sp] of Object.entries(specs)){if(s[list].length>30000)throw Error('Too many records in backup.');const ids=new Set();for(const row of s[list]){if(!row||typeof row!=='object')throw Error('Invalid record.');for(const key of sp.strings)if(typeof row[key]!=='string')throw Error(`Invalid ${list} ${key}.`);for(const key of sp.numbers)if(row[key]!==null&&!numeric(row[key]))throw Error(`Invalid ${list} ${key}.`);const key=list==='receipts'?row.key:row.id;if(ids.has(key))throw Error(`Duplicate record key in ${list}.`);ids.add(key);}}
    for(const c of Object.values(s.counts)){if(!c||typeof c.date!=='string'||typeof c.notes!=='string'||[c.shop,c.home].some(n=>n!==null&&(!numeric(n)||n<0)))throw Error('Invalid stock count.');}
    if(!validDate(s.reportDate))throw Error('Invalid report date.');return s;
  }
  root.BO={categories,numeric,num,sum,today,validDate,round,id,purchase,stock,receipt,metrics,parseDate,fromWorkbook,fromRaw,validate};
  if(typeof module!=='undefined')module.exports=root.BO;
})(globalThis);
