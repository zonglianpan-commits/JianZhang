'use strict';
// Lightweight rendering regression checks with Node's built-in VM.
// No financial data, external SDK or browser dependency is required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const tx=(id,type,date,amount,category,extra={})=>({
  id,type,date,amount,category,accountId:'cash',note:id,interest:0,
  createdAt:date+'T12:00:00.000Z',...extra
});
const sample={
 version:1,
 accounts:[{id:'cash',name:'现金',type:'现金',opening:300000}],
 debts:[{id:'loan',name:'贷款',creditor:'银行',opening:120000}],
 transactions:[
  tx('eat1','expense','2026-11-18',2500,'餐饮'),
  tx('eat2','expense','2026-11-18',1500,'餐饮'),
  tx('eat3','expense','2026-11-17',3000,'餐饮'),
  tx('smoke','expense','2026-11-18',1200,'烟酒'),
  tx('salary','income','2026-11-18',50000,'工资收入'),
  tx('interest','repay','2026-11-18',20000,'还款',{debtId:'loan',interest:300})
 ],
 completed:{}
};
const dataStorage=new Map([['jianzhang-ledger-v1',JSON.stringify(sample)]]);
const handlers=new Map();
const root={innerHTML:'',style:{},querySelector:()=>null};
const dialog={innerHTML:'',childElementCount:0};
const toast={textContent:'',className:''};
const document={
 body:{classList:{toggle(){}}},
 getElementById(id){return id==='page-root'?root:id==='dialog-root'?dialog:id==='toast'?toast:null;},
 querySelectorAll(){return [];},
 addEventListener(type,handler){handlers.set(type,handler);}
};
const window={
 JianZhangCloud:undefined,
 scrollTo(){},
 matchMedia(){return {matches:true};}
};
const localStorage={
 getItem(key){return dataStorage.get(key)??null;},
 setItem(key,value){dataStorage.set(key,String(value));},
 removeItem(key){dataStorage.delete(key);}
};
const context={
 window,document,localStorage,location:{protocol:'file:'},navigator:{},
 matchMedia(){return {matches:true};},
 setTimeout(){return 1;},clearTimeout(){},
 console,Date,Intl
};
vm.runInNewContext(fs.readFileSync('app.js','utf8'),context,{filename:'app.js',timeout:3000});
function click(dataset){
 const b={dataset};
 const target={closest(tag){return tag==='button'?b:null;},matches(){return false;}};
 const fn=handlers.get('click');
 assert.ok(fn,'click handler registered');
 fn({target});
}
function setDate(date){
 const fn=handlers.get('change');
 assert.ok(fn,'date selector change handler registered');
 fn({target:{dataset:{reportDate:''},value:date}});
}
function includes(fragment,message){
 assert.ok(root.innerHTML.includes(fragment),message+': '+fragment);
}
click({nav:'reports'});
includes('月度分类统计','defaults to monthly reports');
includes('data-report-period="day"','daily toggle is present');
click({reportPeriod:'day'});
setDate('2026-11-18');
includes('当日分类统计','daily categories shown');
includes('¥55.00','daily expense counts only expenses and loan interest');
includes('¥500.00','daily income shown');
click({reportCategory:'餐饮'});
includes('餐饮 · 2 笔账单','drilldown on one day contains both meal expenses');
includes('¥40.00','meal total for selected day');
includes('eat1','transaction note 1 in details');
includes('eat2','transaction note 2 in details');
click({reportCategory:'还款'});
includes('还款 · 1 笔账单','interest-only repayment appears in details');
includes('¥3.00','loan interest counted as category expense');
includes('本金¥200.00','principal shown separately for verification');
click({reportDayShift:'-1'});
includes('value="2026-11-17"','previous day navigation');
includes('¥30.00','previous day expenses recomputed');
click({reportPeriod:'month'});
includes('月度分类统计','switches to monthly view');
includes('¥85.00','monthly expenses include meal smoke and interest');
click({reportCategory:'餐饮'});
includes('餐饮 · 3 笔账单','monthly category details include all 3 items');
includes('data-report-day="2026-11-18"','daily subtotal first date clickable');
includes('data-report-day="2026-11-17"','daily subtotal second date clickable');
includes('每日小计','daily subtotal section');
includes('¥70.00','monthly meal subtotal');
click({reportDay:'2026-11-17'});
includes('当日分类统计','clicking daily subtotal opens daily report');
includes('餐饮 · 1 笔账单','the selected day retains the expanded category');
includes('¥30.00','selected date category total');
setDate('2026-11-16');
includes('¥0.00','empty date has zero total');
includes('这一天','empty date displays helpful state');
console.log('PASS: daily/monthly category totals, date navigation, item drilldown, loan interest, empty dates');
