/* 见账 v1 — no external services, no remote financial data transmission. */
(() => {
'use strict';
const STORE = 'jianzhang-ledger-v1';
const CATS = ['餐饮','出行','社交人情','购物','工作成本','生活缴费','烟酒','还款'];
const INCOME_CATS = ['工资收入','副业收入','投资收入','其他收入'];
const CAT_EMOJI = {'餐饮':'☕','出行':'🚕','社交人情':'🎁','购物':'🛍','工作成本':'💼','生活缴费':'💡','烟酒':'🚬','还款':'↗','工资收入':'💵','副业收入':'✨','投资收入':'◈','其他收入':'＋'};
const BAR_COLORS = ['#bcea91','#88e2c4','#a9a1f3','#f2c18b','#8bb7f5','#f2a8b4','#c3c9a5','#dfacdd'];
const TASKS = [{id:'daily',title:'补全本月日常收支'},{id:'assets',title:'核对资产账户余额'},{id:'debts',title:'检查负债与还款进度'},{id:'backup',title:'备份一次财务数据'}];
const ICONS = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 list:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 chart:'<path d="M4 20V10m5 10V4m5 16v-8m5 8V7"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.9 1.9-.06-.06A1.65 1.65 0 0 0 16 18.4a1.65 1.65 0 0 0-1 1.51V21h-6v-1.09A1.65 1.65 0 0 0 8 18.4a1.65 1.65 0 0 0-1.82.33l-.06.06-1.9-1.9.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H2v-4h1.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 1.9-1.9.06.06A1.65 1.65 0 0 0 8 5.6 1.65 1.65 0 0 0 9 4.09V3h6v1.09A1.65 1.65 0 0 0 16 5.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 1.9 1.9-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H22v4h-1.09A1.65 1.65 0 0 0 19.4 15z"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
 check:'<path d="m5 12 4 4L19 6"/>', wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h2"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>', calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>'
};
const icon = (name, size=20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.wallet}</svg>`;
const esc = value => String(value??'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const currentMonth = () => today().slice(0,7);
const monthAdd = (key, count) => {const [y,m]=key.split('-').map(Number);const d=new Date(y,m-1+count,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const monthTitle = key => {const [y,m]=key.split('-');return `${y}年${Number(m)}月`;};
const money = cents => '¥'+new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format((cents||0)/100);
const amountCents = value => {if(value==null || String(value).trim()==='' || !/^\d+(\.\d{1,2})?$/.test(String(value).trim()))return NaN;const [a,b='']=String(value).trim().split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return Number.isSafeInteger(n) && n<=1e12?n:NaN;};
const positive = n => Number.isSafeInteger(n)&&n>0&&n<=1e12;
const uid = () => typeof crypto!=='undefined' && crypto.randomUUID ? crypto.randomUUID(): `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const defaultData = () => ({version:1,accounts:[],debts:[],transactions:[],completed:{}});
function isValid(data){
 if(!data||data.version!==1||!Array.isArray(data.accounts)||!Array.isArray(data.debts)||!Array.isArray(data.transactions)||!data.completed||typeof data.completed!=='object'||Array.isArray(data.completed))return false;
 if(data.accounts.length>1000||data.debts.length>1000||data.transactions.length>50000)return false;
 const ids = arr => new Set(arr.map(a=>a.id));
 const accountIds=ids(data.accounts),debtIds=ids(data.debts),txIds=ids(data.transactions);
 if(accountIds.size!==data.accounts.length||debtIds.size!==data.debts.length||txIds.size!==data.transactions.length)return false;
 if(!data.accounts.every(a=>typeof a.id==='string'&&typeof a.name==='string'&&a.name.length<=120&&Number.isSafeInteger(a.opening)&&a.opening>=0&&a.opening<=1e12))return false;
 if(!data.debts.every(d=>typeof d.id==='string'&&typeof d.name==='string'&&d.name.length<=120&&Number.isSafeInteger(d.opening)&&d.opening>=0&&d.opening<=1e12))return false;
 if(!data.transactions.every(t=>typeof t.id==='string'&&['expense','income','repay','transfer'].includes(t.type)&&typeof t.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&positive(t.amount)&&accountIds.has(t.accountId)&&typeof t.note==='string'&&t.note.length<=500&&typeof t.category==='string'&&t.category.length<=60&&(!t.interest||Number.isSafeInteger(t.interest)&&t.interest>=0&&t.interest<=1e12)&& (t.type!=='transfer'||accountIds.has(t.targetAccountId)&&t.accountId!==t.targetAccountId)&&(t.type!=='repay'||debtIds.has(t.debtId))))return false;
 return Object.values(data.completed).every(v=>Array.isArray(v)&&v.length<100&&v.every(id=>typeof id==='string'));
}
function load(){try{const raw=localStorage.getItem(STORE);if(!raw)return defaultData();const parsed=JSON.parse(raw);return isValid(parsed)?parsed:defaultData();}catch{return defaultData();}}
let data=load();
let ui={page:'home',selectedMonth:currentMonth(),txFilter:'all',txType:'expense',stackExpanded:false,animating:false};
let toastTimer=null,timelineTimer=null,wheel=null;
const root=document.getElementById('page-root');
const dialogRoot=document.getElementById('dialog-root');
const save = () => {try{localStorage.setItem(STORE,JSON.stringify(data));return true;}catch{toast('本机存储失败，请立即导出备份','error');return false;}};
const balanceMaps = () => {
 const accounts=Object.fromEntries(data.accounts.map(a=>[a.id,a.opening]));
 const debts=Object.fromEntries(data.debts.map(d=>[d.id,d.opening]));
 for(const t of data.transactions){
  if(t.type==='income')accounts[t.accountId]+=t.amount;
  if(t.type==='expense')accounts[t.accountId]-=t.amount;
  if(t.type==='repay'){accounts[t.accountId]-=t.amount+(t.interest||0);debts[t.debtId]-=t.amount;}
  if(t.type==='transfer'){accounts[t.accountId]-=t.amount;accounts[t.targetAccountId]+=t.amount;}
 }
 return {accounts,debts};
};
const totals = () => {const b=balanceMaps();const assets=Object.values(b.accounts).reduce((s,n)=>s+n,0);const liabilities=Object.values(b.debts).reduce((s,n)=>s+n,0);return {...b,assets,liabilities,net:assets-liabilities};};
const monthTx = key => data.transactions.filter(t=>t.date.slice(0,7)===key);
const monthStats = key => monthTx(key).reduce((s,t)=>{if(t.type==='income')s.income+=t.amount;else if(t.type==='expense')s.expense+=t.amount;else if(t.type==='repay'){s.repayment+=t.amount;s.interest+=(t.interest||0);s.expense+=(t.interest||0);}return s;},{income:0,expense:0,repayment:0,interest:0});
const completedSet = () => new Set((data.completed[currentMonth()]||[]).filter(id=>TASKS.some(t=>t.id===id)));
function applyProgress(){
 const count=completedSet().size;const ratio=Math.min(count,TASKS.length)/TASKS.length;
 document.body.classList.toggle('all-done',ratio===1);
 const countEl=document.getElementById('goal-count'),percent=document.getElementById('goal-percent'),bar=document.getElementById('goal-progress');
 if(countEl)countEl.textContent=`${count} / ${TASKS.length}`;
 if(percent)percent.textContent=`${Math.round(ratio*100)}% 完成`;
 if(bar)bar.style.width=`${ratio*100}%`;
}
function toast(message,type='success'){
 const el=document.getElementById('toast');el.textContent=message;el.className='toast show'+(type==='error'?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',3000);
}
function emitParticles(btn){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(let i=0;i<13;i++){const particle=document.createElement('i');particle.className='particle';const angle=Math.PI*2*i/13;const radius=26+Math.random()*27;particle.style.setProperty('--dx',`${Math.cos(angle)*radius}px`);particle.style.setProperty('--dy',`${Math.sin(angle)*radius}px`);particle.style.setProperty('--particle-color',i%3===0?'#9f99fa':i%3===1?'#c3ef8e':'#8edfd7');btn.appendChild(particle);setTimeout(()=>particle.remove(),730);}
}
const subtitle = (tag,title,action='')=>`<div class="section-head"><div><div class="eyebrow">${tag}</div><h2 class="section-title">${title}</h2></div>${action}</div>`;
function renderHome(){
 const t=totals(),m=monthStats(currentMonth()),done=completedSet();
 const taskHTML=TASKS.map(task=>{const checked=done.has(task.id);return `<div class="goal-item ${checked?'completed':''}"><button type="button" class="task-done ${checked?'checked':''}" data-task="${task.id}" aria-label="${checked?'取消完成':'标记完成'}：${task.title}" aria-pressed="${checked}">${icon('check',16)}</button><span class="goal-text">${task.title}</span></div>`;}).join('');
 return `<div class="hero"><div class="hero-row"><div class="hero-overline">TOTAL NET WORTH · 当前净资产</div><div class="hero-deco">${icon('wallet',26)}</div></div><div class="hero-value"><em>¥</em> ${money(t.net).slice(1)}</div><div class="net-tip">资产减去负债，才是真正属于你的余额</div><div class="hero-stat-row"><div class="hero-mini"><small>↗ 总资产</small><strong>${money(t.assets)}</strong></div><div class="hero-mini"><small>↘ 总负债</small><strong>${money(t.liabilities)}</strong></div></div></div>
 <div class="action-row"><button class="action-primary" type="button" data-open="transaction">${icon('plus',17)} 记一笔</button><button class="action-secondary" type="button" data-open="asset">${icon('wallet',17)} 添加资产</button><button class="action-secondary" type="button" data-open="debt">${icon('plus',17)} 添加负债</button></div>
 <div class="home-grid"><section>${subtitle('MONTHLY RITUAL','本月财务行动','<span class="subtext">勾选有惊喜 ✨</span>')}<div class="goals-panel"><div class="goal-progress-row"><strong id="goal-count">${done.size} / ${TASKS.length}</strong><span id="goal-percent">${Math.round(done.size/TASKS.length*100)}% 完成</span></div><div class="progress-track"><div class="progress-fill" id="goal-progress" style="width:${done.size/TASKS.length*100}%"></div></div><div class="goals-list">${taskHTML}</div><div class="goal-note">这是理财行动清单，勾选不会自动生成资金流水。</div></div></section>
 <section>${subtitle('YOUR BALANCE SHEET','你的财务拼图','<button type="button" class="subtle-btn" data-toggle-stack>展开 / 收起 ⌄</button>')}<div class="stack-hint">点一下卡片，层层展开查看资产与负债</div><div id="stack-scene" class="stack-scene ${ui.stackExpanded?'expanded':''}"><button type="button" class="stack-card" style="--layer:0" data-toggle-stack><div><span class="stack-name">01 / ASSETS · 资产</span><strong>${money(t.assets)}</strong></div><span class="stack-decor">◈</span></button><button type="button" class="stack-card" style="--layer:1" data-toggle-stack><div><span class="stack-name">02 / LIABILITIES · 负债</span><strong>${money(t.liabilities)}</strong></div><span class="stack-decor">↘</span></button><button type="button" class="stack-card" style="--layer:2" data-toggle-stack><div><span class="stack-name">03 / NET WORTH · 净资产</span><strong>${money(t.net)}</strong></div><span class="stack-decor">✧</span></button></div><div class="account-details ${ui.stackExpanded?'is-open':''}" id="account-details"><div>${accountDetailsHTML(t)}</div></div></section>
 <section class="span-all">${subtitle('TIME MACHINE','月度收支时间线',`<button type="button" class="month-btn" data-open-wheel>${icon('calendar',15)} ${monthTitle(ui.selectedMonth)} ⌄</button>`)}<div class="section-card timeline-shell"><div class="timeline-scroll" id="timeline-scroll">${timelineItems()}</div><div class="timeline-foot">左右滑动自动吸附 · 稳定后绘制趋势线</div></div><div class="metric-grid" style="margin-top:14px"><div class="metric"><small>本月收入</small><strong class="green">${money(m.income)}</strong></div><div class="metric"><small>本月支出</small><strong class="red">${money(m.expense)}</strong></div><div class="metric"><small>本月还款本金</small><strong>${money(m.repayment)}</strong></div></div></section></div>`;
}
function accountDetailsHTML(t){
 const assets=data.accounts.length?data.accounts.map(a=>`<div class="mini-row"><div><strong>${esc(a.name)}</strong><small>${esc(a.type||'资产账户')}</small></div><div class="amount">${money(t.accounts[a.id])} <button type="button" class="mini-edit" data-edit-asset="${esc(a.id)}">编辑</button></div></div>`).join(''):'<div class="empty-compact">暂无资产账户，点击“添加资产”创建。</div>';
 const debts=data.debts.length?data.debts.map(d=>`<div class="mini-row"><div><strong>${esc(d.name)}</strong><small>${esc(d.creditor||'借款')}</small></div><div class="amount">${money(t.debts[d.id])} <button type="button" class="mini-edit" data-edit-debt="${esc(d.id)}">编辑</button></div></div>`).join(''):'<div class="empty-compact">暂无负债记录。</div>';
 return `<div class="mini-group-title"><span>资产账户 (${data.accounts.length})</span><button type="button" class="subtle-btn" data-open="asset">+ 添加</button></div><div class="mini-list">${assets}</div><div class="mini-group-title"><span>负债记录 (${data.debts.length})</span><button type="button" class="subtle-btn" data-open="debt">+ 添加</button></div><div class="mini-list">${debts}</div>`;
}
function timelineItems(){return Array.from({length:15},(_,i)=>monthAdd(ui.selectedMonth,i-9)).map(key=>{const s=monthStats(key),sel=key===ui.selectedMonth;return `<button type="button" class="timeline-item ${sel?'selected':''}" data-month="${key}"><small>${key.slice(0,4)} / ${key.slice(5)}月</small><strong>${money(s.expense)}</strong><div class="timeline-label">本月总支出</div><svg class="timeline-spark" viewBox="0 0 130 30" aria-hidden="true"><path d="M2 22 C21 23,28 6,45 14 S70 27,89 12 S112 8,128 3"/></svg></button>`;}).join('');}
function txLabel(t){return t.type==='repay'?'还款':t.type==='transfer'?'转账':t.type==='income'?'收入':t.category;}
function txListHTML(items){
 if(!items.length)return `<div class="empty-state"><div class="empty-art">✦</div><h3>还没有记账记录</h3><p>从第一笔收入或支出开始，慢慢拼出你的财务全貌。</p><button class="action-primary" type="button" data-open="transaction">${icon('plus',16)} 记第一笔</button></div>`;
 const aNames=Object.fromEntries(data.accounts.map(a=>[a.id,a.name]));const dNames=Object.fromEntries(data.debts.map(d=>[d.id,d.name]));
 return items.map(t=>{const label=txLabel(t),sign=t.type==='income'?'+':t.type==='transfer'?'→':'−';const description=t.type==='repay'?`${dNames[t.debtId]||'负债'} · 本金${money(t.amount)}${t.interest?' · 利息'+money(t.interest):''}`:t.type==='transfer'?`${aNames[t.accountId]||''} → ${aNames[t.targetAccountId]||''}`:`${aNames[t.accountId]||''}${t.note?' · '+t.note:''}`;const sum=t.type==='repay'?t.amount+(t.interest||0):t.amount;
 return `<div class="tx-row"><div class="tx-icon ${t.type}">${t.type==='transfer'?'⇄':t.type==='repay'?'↗':t.type==='income'?'↙':CAT_EMOJI[label]||'•'}</div><div class="tx-body"><strong>${esc(label)}${t.type==='repay'&&t.note?' · '+esc(t.note):''}</strong><small>${esc(description)}</small></div><div class="tx-right"><strong style="color:${t.type==='income'?'var(--mint)':t.type==='expense'?'var(--text)':'#d3c6ed'}">${sign}${money(sum)}</strong><small>${esc(t.date.slice(5))} <button type="button" class="delete-btn" data-delete-tx="${esc(t.id)}">删除</button></small></div></div>`;}).join('');
}
function renderLedger(){const s=monthStats(ui.selectedMonth);let items=monthTx(ui.selectedMonth).sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));if(ui.txFilter!=='all')items=items.filter(t=>t.type===ui.txFilter);
 const tags=[['all','全部'],['expense','支出'],['income','收入'],['repay','还款'],['transfer','转账']];
 return `${subtitle('MONEY JOURNAL','收支账单',`<button type="button" class="month-btn" data-open-wheel>${icon('calendar',15)} ${monthTitle(ui.selectedMonth)} ⌄</button>`)}<div class="metric-grid"><div class="metric"><small>总收入</small><strong class="green">${money(s.income)}</strong></div><div class="metric"><small>总支出 (含利息)</small><strong class="red">${money(s.expense)}</strong></div><div class="metric"><small>已还本金</small><strong>${money(s.repayment)}</strong></div></div>
 ${subtitle('TRANSACTIONS',`${items.length} 笔记录`,'<button type="button" class="subtle-btn" data-open="transaction">+ 新增记录</button>')}<div class="tag-row">${tags.map(([id,label])=>`<button type="button" class="filter-tag ${ui.txFilter===id?'active':''}" data-filter="${id}">${label}</button>`).join('')}</div><div class="tx-list">${txListHTML(items)}</div>`;
}
function renderReports(){const s=monthStats(ui.selectedMonth);const items=monthTx(ui.selectedMonth);const sums=Object.fromEntries(CATS.map(c=>[c,0]));for(const t of items){if(t.type==='expense'&&sums[t.category]!==undefined)sums[t.category]+=t.amount;if(t.type==='repay')sums['还款']+=(t.interest||0);}
 const rows=CATS.map((cat,i)=>({cat,value:sums[cat],color:BAR_COLORS[i]})).filter(v=>v.value>0).sort((a,b)=>b.value-a.value);
 return `${subtitle('MONEY INSIGHTS','财务月报',`<button type="button" class="month-btn" data-open-wheel>${icon('calendar',15)} ${monthTitle(ui.selectedMonth)} ⌄</button>`)}<div class="metric-grid"><div class="metric"><small>收入</small><strong class="green">${money(s.income)}</strong></div><div class="metric"><small>支出</small><strong class="red">${money(s.expense)}</strong></div><div class="metric"><small>收支结余</small><strong>${money(s.income-s.expense)}</strong></div></div>
 ${subtitle('SPENDING CATEGORIES','消费分类分析')}<div class="section-card">${rows.length?`<div class="chart-list">${rows.map(r=>`<div class="chart-item"><div class="chart-item-head"><span>${CAT_EMOJI[r.cat]} &nbsp;${r.cat}</span><b>${money(r.value)} <span class="muted" style="font-weight:400">${Math.round(r.value/s.expense*100)}%</span></b></div><div class="chart-track"><div class="chart-bar" style="width:${r.value/s.expense*100}%;--bar-color:${r.color}"></div></div></div>`).join('')}</div>`:'<div class="empty-compact">当月没有消费支出。新增一笔支出后，这里会自动出现分类图表。</div>'}</div>
 ${subtitle('DEBT INTELLIGENCE','还款专项')}<div class="section-card"><div class="data-row"><span>本月已还本金</span><strong>${money(s.repayment)}</strong></div><div class="data-row"><span>本月利息支出</span><strong>${money(s.interest)}</strong></div><div class="data-row"><span>当前剩余负债</span><strong>${money(totals().liabilities)}</strong></div></div><div class="report-note">💡 还款本金只是“用资产减少负债”，不会被重复计入消费；还款利息才计入当月支出。收入减支出不等于现金账户的全部变动，还款本金和转账也会影响现金流。</div>`;
}
function renderSettings(){const t=totals();return `${subtitle('YOUR PRIVATE LEDGER','我的账本')}<div class="settings-box"><div class="settings-title">🔐 你的数据，只在本机</div><p class="settings-desc">记账内容存储在当前浏览器设备，不会上传到 GitHub 或任何服务器。当前版本本地数据未加密，不建议在公用设备使用。清理浏览器数据、卸载 App 或换手机可能丢失记录，请定期导出 JSON 备份。</p><div class="settings-actions"><button class="btn-small" type="button" data-export-json>↓ 导出备份 JSON</button><button class="btn-small" type="button" data-export-csv>↓ 导出账单 CSV</button><button class="btn-small" type="button" data-import>↑ 导入 JSON</button></div></div>
 ${subtitle('ASSET MANAGEMENT','账户与负债')}<div class="settings-box"><div class="data-row"><span>资产账户</span><strong>${data.accounts.length} 个 · ${money(t.assets)}</strong></div><div class="data-row"><span>负债项目</span><strong>${data.debts.length} 笔 · ${money(t.liabilities)}</strong></div><div class="data-row"><span>历史记账</span><strong>${data.transactions.length} 笔</strong></div><div class="settings-actions" style="margin-top:15px"><button type="button" class="btn-small" data-open="asset">+ 管理资产</button><button type="button" class="btn-small" data-open="debt">+ 管理负债</button><button type="button" class="btn-small" data-nav="home">查看资产卡片</button></div></div>
 ${subtitle('DANGER ZONE','数据重置')}<div class="settings-box"><div class="settings-title">清空整个账本</div><p class="settings-desc">将永久清除本设备上的资产、负债、交易流水和完成状态，无法撤销。建议先导出备份。</p><button type="button" class="btn-small btn-danger" data-reset>清空所有数据</button></div><p class="subtext" style="text-align:center;padding:15px 0">见账 V1.0 · 离线优先 · 源码可自行部署</p>`;}
const pageTemplate = page=>page==='ledger'?renderLedger():page==='reports'?renderReports():page==='settings'?renderSettings():renderHome();
function render(){root.innerHTML=`<div class="page">${pageTemplate(ui.page)}</div>`;setNavState();applyProgress();afterRender();}
function setNavState(){document.querySelectorAll('.nav-item').forEach(b=>{const active=b.dataset.nav===ui.page;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
function navigate(page,source){if(!['home','ledger','reports','settings'].includes(page)||ui.animating)return;if(ui.page===page){window.scrollTo({top:0,behavior:'smooth'});return;}
 ui.page=page;setNavState();const old=root.querySelector('.page');if(!old||matchMedia('(prefers-reduced-motion: reduce)').matches){render();window.scrollTo(0,0);return;}
 ui.animating=true;const nr=document.createElement('div');nr.className='page reveal-page';nr.innerHTML=pageTemplate(page);const rr=root.getBoundingClientRect(),rect=source?.getBoundingClientRect();const x=(rect?rect.left+rect.width/2:innerWidth/2)-rr.left;const y=(rect?rect.top+rect.height/2:innerHeight/2)-rr.top;const farX=Math.max(Math.abs(x),Math.abs(rr.width-x));const farY=Math.max(Math.abs(y),Math.abs(Math.max(old.offsetHeight,nr.offsetHeight)-y));const radius=Math.ceil(Math.hypot(farX,farY)+80);
 root.style.position='relative';root.style.minHeight=Math.max(old.offsetHeight,nr.offsetHeight)+'px';nr.style.cssText=`position:absolute;inset:0;width:100%;z-index:4;clip-path:circle(0px at ${x}px ${y}px);background:var(--bg);transition:clip-path .64s cubic-bezier(.22,.72,.16,1);`;root.appendChild(nr);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{nr.style.clipPath=`circle(${radius}px at ${x}px ${y}px)`;}));
 setTimeout(()=>{root.innerHTML='';nr.classList.remove('reveal-page');nr.removeAttribute('style');root.appendChild(nr);root.style.minHeight='';root.style.position='';ui.animating=false;applyProgress();afterRender();window.scrollTo({top:0,behavior:'smooth'});},670);
}
function afterRender(){if(ui.page==='home')setupTimeline();}
function setupTimeline(){const wrap=document.getElementById('timeline-scroll');if(!wrap)return;const active=wrap.querySelector('.selected');if(active){wrap.scrollLeft=active.offsetLeft+active.offsetWidth/2-wrap.clientWidth/2;setTimeout(()=>active.classList.add('draw'),110);}wrap.addEventListener('scroll',()=>{clearTimeout(timelineTimer);wrap.querySelectorAll('.timeline-item.draw').forEach(el=>el.classList.remove('draw'));timelineTimer=setTimeout(()=>{
 const center=wrap.scrollLeft+wrap.clientWidth/2;const tiles=[...wrap.querySelectorAll('.timeline-item')];const closest=tiles.reduce((best,el)=>Math.abs(el.offsetLeft+el.offsetWidth/2-center)<Math.abs(best.offsetLeft+best.offsetWidth/2-center)?el:best,tiles[0]);if(!closest)return;ui.selectedMonth=closest.dataset.month;tiles.forEach(el=>el.classList.toggle('selected',el===closest));closest.classList.add('draw');const picker=document.querySelector('[data-open-wheel]');if(picker)picker.innerHTML=`${icon('calendar',15)} ${monthTitle(ui.selectedMonth)} ⌄`;
 },135);},{passive:true});}
function showDialog(content){dialogRoot.innerHTML=`<div class="dialog-backdrop" data-backdrop><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${content}</div></div>`;document.body.style.overflow='hidden';}
function closeDialog(){dialogRoot.innerHTML='';document.body.style.overflow='';wheel=null;}
function field(label,name,value='',extra=''){return `<label class="field"><span class="field-label">${label}</span><input name="${name}" value="${esc(value)}" ${extra} /></label>`;}
function selectField(label,name,items,selected=''){return `<label class="field"><span class="field-label">${label}</span><select name="${name}" required>${items.map(a=>`<option value="${esc(a.value)}" ${String(a.value)===String(selected)?'selected':''}>${esc(a.label)}</option>`).join('')}</select></label>`;}
const moneyInput = (label,name,value='')=>field(label,name,value,`type="number" inputmode="decimal" step="0.01" min="${name==='opening'?'0':'0.01'}" max="10000000000" required`);
const accountOptions=()=>data.accounts.map(a=>({value:a.id,label:`${a.name} · ${money(totals().accounts[a.id])}`}));
function transactionDialog(){
 const type=ui.txType;const acc=accountOptions();const debts=data.debts.map(d=>({value:d.id,label:`${d.name} · 待还 ${money(totals().debts[d.id])}`}));
 const labels=[['expense','支出'],['income','收入'],['repay','还款'],['transfer','转账']];
 const accountsReady=acc.length>0&&((type!=='transfer')||acc.length>=2)&&((type!=='repay')||debts.length>0);
 const extra=type==='repay'?`${selectField('偿还哪笔负债','debtId',debts)}${field('其中的利息（选填）','interest','0.00','type="number" inputmode="decimal" min="0" step="0.01"')}`:type==='transfer'?selectField('转入账户','targetAccountId',acc.slice().reverse()):selectField('记账分类','category',(type==='income'?INCOME_CATS:CATS).map(c=>({value:c,label:`${CAT_EMOJI[c]} ${c}`})));
 const note=type==='repay'?'<div class="form-helper">填写的金额是还款本金。还款后资产减少“本金 + 利息”，负债减少本金，利息计入支出。</div>':type==='expense'?'<div class="form-helper">偿还已有债务的本金，请选“还款”类型；普通支出中的“还款”分类适用于不关联负债的费用。</div>':'';
 showDialog(`<div class="dialog-title-row"><span class="dialog-title" id="dialog-title">记一笔 · ${labels.find(a=>a[0]===type)[1]}</span><button type="button" class="icon-button" data-close aria-label="关闭">×</button></div><div class="segmented">${labels.map(([id,label])=>`<button type="button" class="segment ${type===id?'active':''}" data-tx-type="${id}">${label}</button>`).join('')}</div>${accountsReady?`<form id="transaction-form">${moneyInput(type==='repay'?'还款本金（元）':'金额（元）','amount')}${selectField(type==='transfer'?'转出账户':'资金账户','accountId',acc)}${extra}<div class="form-grid">${field('发生日期','date',today(),'type="date" required')}${field('备注（可选）','note','','maxlength="200" placeholder="写点说明"')}</div>${note}<button type="submit" class="submit-btn">${icon('check',19)} 完成记账</button></form>`:`<div class="empty-state"><div class="empty-art">◈</div><h3>${!acc.length?'先添加一个资产账户':type==='repay'?'还没有负债项目':'至少需要两个资产账户'}</h3><p>记录交易需要确定资金从哪里来、到哪里去。</p><button type="button" class="action-primary" data-open="${type==='repay'?'debt':'asset'}">+ 添加${type==='repay'?'负债':'资产账户'}</button></div>`}`);
}
function assetDialog(id){const existing=data.accounts.find(a=>a.id===id);const name=existing?.name||'';const opening=existing?(existing.opening/100).toFixed(2):'';
 showDialog(`<div class="dialog-title-row"><span class="dialog-title" id="dialog-title">${existing?'编辑':'新增'}资产账户</span><button type="button" class="icon-button" data-close aria-label="关闭">×</button></div><form id="asset-form" data-edit="${esc(id||'')}">${field('账户名称','name',name,'required maxlength="60" placeholder="如：微信钱包、建设银行卡"')}${selectField('资产类型','type',['银行卡','现金','微信','支付宝','投资','其他资产'].map(x=>({value:x,label:x})),existing?.type||'银行卡')}${moneyInput('期初金额 / 资产估值（元）','opening',opening)}<div class="form-helper">期初金额是账户建立时的基准值；后续流水会自动增减余额。非现金资产可登记估值，但不要把同一笔钱在不同账户重复登记。</div><button type="submit" class="submit-btn">${icon('check')} ${existing?'保存修改':'创建资产账户'}</button></form>${existing?`<div class="settings-actions" style="margin-top:12px"><button type="button" class="btn-small btn-danger" data-delete-asset="${esc(id)}">删除此账户</button></div>`:''}`);
}
function debtDialog(id){const existing=data.debts.find(d=>d.id===id);showDialog(`<div class="dialog-title-row"><span class="dialog-title" id="dialog-title">${existing?'编辑':'新增'}负债</span><button type="button" class="icon-button" data-close aria-label="关闭">×</button></div><form id="debt-form" data-edit="${esc(id||'')}">${field('负债名称','name',existing?.name||'','required maxlength="60" placeholder="如：信用卡、银行贷款"')}${field('债权人 / 银行（选填）','creditor',existing?.creditor||'','maxlength="70" placeholder="如：某银行、某朋友"')}${moneyInput('当前未还本金（元）','opening',existing?(existing.opening/100).toFixed(2):'')}<div class="form-helper">填写创建账本时尚未归还的本金。今后的每笔“还款”都会扣减此负债。不自动把这笔借款增加到你的资产，避免历史借款重复计算。</div><button type="submit" class="submit-btn">${icon('check')} ${existing?'保存修改':'创建负债记录'}</button></form>${existing?`<div class="settings-actions" style="margin-top:12px"><button type="button" class="btn-small btn-danger" data-delete-debt="${esc(id)}">删除此负债</button></div>`:''}`);}
function openDialog(type,id){if(type==='transaction')transactionDialog();if(type==='asset')assetDialog(id);if(type==='debt')debtDialog(id);}
function invalid(message){toast(message,'error');return false;}
function successThenClose(form,message){const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.innerHTML=icon('check',23);btn.classList.add('success');emitParticles(btn);setTimeout(()=>{closeDialog();render();toast(message);},650);}
function submitTransaction(form){const f=new FormData(form),type=ui.txType,amount=amountCents(f.get('amount'));if(!positive(amount))return invalid('请输入有效的正数金额，最多两位小数');
 const accountId=String(f.get('accountId')||''),account=data.accounts.find(a=>a.id===accountId),date=String(f.get('date')||''),note=String(f.get('note')||'').trim();if(!account)return invalid('请选择有效资产账户');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime()))return invalid('请选择有效日期');
 const entry={id:uid(),type,accountId,date,amount,note,category:'',interest:0,createdAt:new Date().toISOString()};
 if(type==='income'||type==='expense'){entry.category=String(f.get('category')||'');if(!(type==='income'?INCOME_CATS:CATS).includes(entry.category))return invalid('分类无效');}
 if(type==='transfer'){entry.targetAccountId=String(f.get('targetAccountId')||'');entry.category='转账';if(!data.accounts.some(a=>a.id===entry.targetAccountId)||entry.targetAccountId===accountId)return invalid('转出和转入账户不能相同');}
 if(type==='repay'){entry.debtId=String(f.get('debtId')||'');entry.category='还款';entry.interest=amountCents(f.get('interest')||'0');if(!Number.isSafeInteger(entry.interest)||entry.interest<0)return invalid('利息金额无效');if(!data.debts.some(d=>d.id===entry.debtId))return invalid('请选择负债项目');if(totals().debts[entry.debtId]<amount)return invalid('还款本金不能超过该笔负债的剩余本金');}
 const spend=type==='repay'?amount+entry.interest:amount;
 if(type!=='income'&&totals().accounts[accountId]<spend)return invalid('账户余额不足，请核对期初余额或选择其他账户');
 data.transactions.push(entry);if(!save()){data.transactions.pop();return false;}successThenClose(form,'已记入账本 ✓');return true;
}
function submitAsset(form){const f=new FormData(form),name=String(f.get('name')||'').trim(),type=String(f.get('type')||'银行卡'),opening=amountCents(f.get('opening'));if(!name||name.length>60)return invalid('请输入资产账户名称');if(!Number.isSafeInteger(opening)||opening<0)return invalid('请输入有效的期初余额');const id=form.dataset.edit;const existing=data.accounts.find(a=>a.id===id);if(existing){const old={...existing};Object.assign(existing,{name,type,opening});const newBalance=totals().accounts[id];if(newBalance<0){Object.assign(existing,old);return invalid('调整后余额为负，请检查历史流水');}}else data.accounts.push({id:uid(),name,type,opening});if(!save())return false;successThenClose(form,'资产账户已保存');return true;}
function submitDebt(form){const f=new FormData(form),name=String(f.get('name')||'').trim(),creditor=String(f.get('creditor')||'').trim(),opening=amountCents(f.get('opening'));if(!name||name.length>60||creditor.length>70)return invalid('请输入有效的负债信息');if(!Number.isSafeInteger(opening)||opening<0)return invalid('请输入有效的本金');const id=form.dataset.edit;const existing=data.debts.find(d=>d.id===id);if(existing){const old={...existing};Object.assign(existing,{name,creditor,opening});if(totals().debts[id]<0){Object.assign(existing,old);return invalid('修改后剩余负债为负，请检查还款记录');}}else data.debts.push({id:uid(),name,creditor,opening});if(!save())return false;successThenClose(form,'负债记录已保存');return true;}
function toggleTask(id,btn){const done=completedSet(),next=!done.has(id);if(next)done.add(id);else done.delete(id);data.completed[currentMonth()]=[...done];if(!save())return;btn.classList.toggle('checked',next);btn.setAttribute('aria-pressed',String(next));btn.parentElement.classList.toggle('completed',next);if(next){btn.classList.add('celebrate');emitParticles(btn);setTimeout(()=>btn.classList.remove('celebrate'),750);}applyProgress();}
function deleteTransaction(id){const entry=data.transactions.find(t=>t.id===id);if(!entry)return;if(!confirm('确定删除这笔流水吗？关联账户余额与负债会自动重新计算。'))return;const next=data.transactions.filter(t=>t.id!==id);const old=data.transactions;data.transactions=next;const balances=totals();if(Object.values(balances.accounts).some(v=>v<0)||Object.values(balances.debts).some(v=>v<0)){data.transactions=old;return invalid('删除会导致其他账户或负债出现负余额，请先检查关联流水');}if(!save()){data.transactions=old;return;}render();toast('记录已删除');}
function deleteAccount(id){if(data.transactions.some(t=>t.accountId===id||t.targetAccountId===id))return invalid('该账户有关联流水，请先处理相关交易，不能直接删除');if(!confirm('确定删除这个资产账户吗？'))return;data.accounts=data.accounts.filter(a=>a.id!==id);save();closeDialog();render();toast('账户已删除');}
function deleteDebt(id){if(data.transactions.some(t=>t.debtId===id))return invalid('该负债有关联还款记录，不能直接删除');if(!confirm('确定删除这笔负债吗？'))return;data.debts=data.debts.filter(d=>d.id!==id);save();closeDialog();render();toast('负债已删除');}
function csvCell(value){let text=String(value??'');if(/^[=+@\-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
function download(name,content,mime){if(window.JianZhangNative&&typeof window.JianZhangNative.save==='function'){try{window.JianZhangNative.save(name,content,mime);toast('请选择保存文件的位置');}catch{toast('保存失败，请重试','error');}return;}const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function exportJSON(){download(`见账备份-${today()}.json`,JSON.stringify(data,null,2),'application/json;charset=utf-8');toast('JSON 备份已下载');}
function exportCSV(){const names=Object.fromEntries(data.accounts.map(a=>[a.id,a.name]));const debts=Object.fromEntries(data.debts.map(d=>[d.id,d.name]));const rows=[['日期','类型','分类','金额(元)','利息(元)','来源账户','目标账户/负债','备注']];for(const t of data.transactions){rows.push([t.date,{income:'收入',expense:'支出',repay:'还款',transfer:'转账'}[t.type],t.category,(t.amount/100).toFixed(2),((t.interest||0)/100).toFixed(2),names[t.accountId]||'',t.type==='repay'?debts[t.debtId]:t.type==='transfer'?names[t.targetAccountId]:'',t.note]);}download(`见账流水-${today()}.csv`,'\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('CSV 流水已下载');}
function importJSON(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(file.size>5*1024*1024)return invalid('备份文件过大（最大 5MB）');try{const parsed=JSON.parse(await file.text());if(!isValid(parsed))return invalid('文件格式或数据关联校验失败');if(!confirm('导入将覆盖当前账本的全部记录。建议先导出当前备份。确定继续吗？'))return;const old=data;data=parsed;if(!save()){data=old;return;}ui.selectedMonth=currentMonth();ui.page='home';ui.stackExpanded=false;render();toast('导入完成，共 '+data.transactions.length+' 笔流水');}catch{invalid('无法读取此 JSON 备份');}};input.click();}
function resetData(){if(!confirm('这将删除本机全部账目、账户及负债，且无法撤销。确定继续吗？'))return;if(!confirm('最后确认：你已经备份数据了吗？'))return;const old=data;data=defaultData();if(!save()){data=old;return;}ui={...ui,page:'home',selectedMonth:currentMonth(),stackExpanded:false};render();toast('本机账本已清空');}
// Momentum / rubber-band month wheel; snapping only after movement settles.
function openWheel(){const months=Array.from({length:49},(_,i)=>monthAdd(currentMonth(),i-36));const initial=Math.max(0,months.indexOf(ui.selectedMonth));showDialog(`<div class="dialog-title-row"><span class="dialog-title" id="dialog-title">选择月份</span><button type="button" class="icon-button" data-close aria-label="关闭">×</button></div><p class="subtext">轻拨带惯性，越界时弹性回弹</p><div class="wheel-area" id="wheel-area" tabindex="0" role="listbox" aria-label="月份滚轮，使用鼠标滚轮或上下拖动"><div class="wheel-lines"></div><div class="wheel-items" id="wheel-items">${months.map(key=>`<div class="wheel-row" data-wheel-key="${key}" role="option">${monthTitle(key)}</div>`).join('')}</div></div><div class="wheel-footer"><button type="button" class="cancel" data-close>取消</button><button type="button" class="confirm" id="wheel-confirm">确定</button></div>`);
 const area=document.getElementById('wheel-area'),track=document.getElementById('wheel-items');let pos=initial,velocity=0,lastY=0,lastT=0,dragging=false,raf=0;const max=months.length-1;
 const draw=()=>{track.style.transform=`translateY(${109-pos*52}px)`;const nearest=Math.min(max,Math.max(0,Math.round(pos)));track.querySelectorAll('.wheel-row').forEach((row,i)=>{row.classList.toggle('current',i===nearest);row.setAttribute('aria-selected',String(i===nearest));});};
 const physics=()=>{if(dragging)return;pos+=velocity;velocity*=.91;if(pos<0)velocity+=(0-pos)*.16;if(pos>max)velocity+=(max-pos)*.16;if(Math.abs(velocity)<.025&&pos>=-.1&&pos<=max+.1){const target=Math.min(max,Math.max(0,Math.round(pos)));pos+=(target-pos)*.27;if(Math.abs(target-pos)<.005){pos=target;velocity=0;raf=0;draw();return;}}draw();raf=requestAnimationFrame(physics);};
 const run=()=>{if(!raf)raf=requestAnimationFrame(physics);};
 area.addEventListener('pointerdown',e=>{if(raf){cancelAnimationFrame(raf);raf=0;}dragging=true;velocity=0;lastY=e.clientY;lastT=performance.now();area.setPointerCapture(e.pointerId);});
 area.addEventListener('pointermove',e=>{if(!dragging)return;const dy=e.clientY-lastY;const now=performance.now();pos-=dy/52;const deltaMs=Math.max(8,now-lastT);velocity=-dy/52*16/deltaMs;lastY=e.clientY;lastT=now;if(pos<0)pos*=.35;if(pos>max)pos=max+(pos-max)*.35;draw();});
 const release=()=>{if(!dragging)return;dragging=false;run();};area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);
 area.addEventListener('wheel',e=>{e.preventDefault();velocity+=Math.max(-3,Math.min(3,e.deltaY/52*.24));run();},{passive:false});
 area.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();pos=Math.max(0,Math.min(max,Math.round(pos)+(e.key==='ArrowDown'?1:-1)));velocity=0;draw();}});
 document.getElementById('wheel-confirm').addEventListener('click',()=>{if(raf)cancelAnimationFrame(raf);ui.selectedMonth=months[Math.max(0,Math.min(max,Math.round(pos)))];closeDialog();render();toast(`已切换至${monthTitle(ui.selectedMonth)}`);});
 wheel={dispose:()=>{if(raf)cancelAnimationFrame(raf);}};draw();}
// Event delegation maintains interactions across animated page replacements.
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b){if(e.target.matches('[data-backdrop]'))closeDialog();return;}
 if(b.dataset.close!==undefined){if(wheel)wheel.dispose();closeDialog();return;}
 if(b.dataset.nav){navigate(b.dataset.nav,b);return;}
 if(b.dataset.open){closeDialog();openDialog(b.dataset.open);return;}
 if(b.dataset.txType){ui.txType=b.dataset.txType;transactionDialog();return;}
 if(b.dataset.toggleStack!==undefined){ui.stackExpanded=!ui.stackExpanded;document.getElementById('stack-scene')?.classList.toggle('expanded',ui.stackExpanded);document.getElementById('account-details')?.classList.toggle('is-open',ui.stackExpanded);return;}
 if(b.dataset.task){toggleTask(b.dataset.task,b);return;}
 if(b.dataset.month){ui.selectedMonth=b.dataset.month;const scroll=document.getElementById('timeline-scroll');b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});scroll?.querySelectorAll('.timeline-item').forEach(t=>{t.classList.toggle('selected',t===b);t.classList.remove('draw');});return;}
 if(b.dataset.filter){ui.txFilter=b.dataset.filter;render();return;}
 if(b.dataset.openWheel!==undefined){openWheel();return;}
 if(b.dataset.editAsset){openDialog('asset',b.dataset.editAsset);return;}
 if(b.dataset.editDebt){openDialog('debt',b.dataset.editDebt);return;}
 if(b.dataset.deleteTx){deleteTransaction(b.dataset.deleteTx);return;}
 if(b.dataset.deleteAsset){deleteAccount(b.dataset.deleteAsset);return;}
 if(b.dataset.deleteDebt){deleteDebt(b.dataset.deleteDebt);return;}
 if(b.dataset.exportJson!==undefined){exportJSON();return;}
 if(b.dataset.exportCsv!==undefined){exportCSV();return;}
 if(b.dataset.import!==undefined){importJSON();return;}
 if(b.dataset.reset!==undefined){resetData();return;}
});
document.addEventListener('submit',e=>{if(!['transaction-form','asset-form','debt-form'].includes(e.target.id))return;e.preventDefault();if(e.target.id==='transaction-form')submitTransaction(e.target);else if(e.target.id==='asset-form')submitAsset(e.target);else submitDebt(e.target);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialogRoot.childElementCount){if(wheel)wheel.dispose();closeDialog();}});
document.querySelectorAll('.nav-icon').forEach(el=>el.innerHTML=icon(el.dataset.icon));
render();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
