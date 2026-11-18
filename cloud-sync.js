/* 见账账号同步：Supabase Auth + PostgREST。未配置时仅本地记账。 */
(function(global){
'use strict';
const CONFIG=global.JIANZHANG_CLOUD_CONFIG||{};
const BASE=String(CONFIG.url||'').replace(/\/+$/,'');
const KEY=String(CONFIG.publishableKey||'');
const ENABLED=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(BASE)&&KEY.length>=25;
const SESSION_KEY='jianzhang-cloud-session-v1';
const CHECKPOINT_PREFIX='jianzhang-sync-checkpoint-';
let session=null, api=null, revision=null, connected=false, dirty=false, conflict=false;
let remoteRow=null, uploading=false, syncing=false, timer=null, interval=null, statusMessage='', failureCount=0;
try{session=ENABLED?JSON.parse(localStorage.getItem(SESSION_KEY)||'null'):null;}catch{session=null;}
if(session&&!session.user?.id)session=null;
function activeUserId(){return ENABLED&&session?.user?.id||null;}
function message(text){statusMessage=text;render();}
function checkpointKey(){return CHECKPOINT_PREFIX+activeUserId();}
function digest(value){let h=2166136261;const s=JSON.stringify(value);for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619);}return(h>>>0).toString(16)+':'+s.length;}
function checkpoint(){try{return JSON.parse(localStorage.getItem(checkpointKey())||'null')}catch{return null;}}
function markCheckpoint(data){if(!activeUserId())return;localStorage.setItem(checkpointKey(),JSON.stringify({revision,hash:digest(data)}));}
function persistSession(){if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);}
function clearSchedule(){clearTimeout(timer);timer=null;}
function errorMessage(data,status){return data?.msg||data?.message||data?.error_description||data?.error||('请求失败：HTTP '+status);}
async function request(path,method='GET',body,authorized=false,prefer){
 if(!ENABLED)throw new Error('账号同步服务尚未配置');
 let access=null;
 if(authorized)access=await getAccessToken();
 const headers={'apikey':KEY};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(access)headers['Authorization']='Bearer '+access;
 if(prefer)headers['Prefer']=prefer;
 let res;
 try{res=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}
 catch{throw new Error('网络不可用，请联网后重试；本机记账不受影响');}
 const raw=await res.text();
 let data;try{data=raw?JSON.parse(raw):null;}catch{data={message:raw.slice(0,240)};}
 if(!res.ok)throw new Error(errorMessage(data,res.status));
 return data;
}
async function getAccessToken(){
 if(!session)throw new Error('请先登录账号');
 if(session.expires_at&&Date.now()/1000<session.expires_at-60)return session.access_token;
 const body={refresh_token:session.refresh_token};
 const saved=session;
 try{
   const next=await request('/auth/v1/token?grant_type=refresh_token','POST',body);
   if(!next.access_token||!next.refresh_token)throw new Error('会话续期失败');
   session={...next,user:next.user||saved.user,expires_at:Math.floor(Date.now()/1000)+(next.expires_in||3600)};
   persistSession();return session.access_token;
 }catch(e){throw new Error('登录会话需重新验证：'+e.message);}
}
function updateSession(result){
 if(!result?.access_token||!result?.user?.id)return false;
 session={...result,expires_at:Math.floor(Date.now()/1000)+(result.expires_in||3600)};
 persistSession();return true;
}
function userEmail(){return session?.user?.email||'';}
function isNonempty(d){return !!(d&&(d.accounts?.length||d.debts?.length||d.transactions?.length));}
async function readRemote(){
 if(!activeUserId())throw new Error('尚未登录');
 const id=encodeURIComponent(activeUserId());
 const rows=await request('/rest/v1/jianzhang_ledgers?select=user_id,data,revision,updated_at&user_id=eq.'+id,'GET',undefined,true);
 if(!Array.isArray(rows))throw new Error('云端数据格式错误');
 if(rows[0]&&!api.validate(rows[0].data))throw new Error('云端数据未通过账本校验，不会覆盖本机');
 return rows[0]||null;
}
function remember(row){
 revision=row.revision;remoteRow=row;dirty=false;conflict=false;connected=true;
 markCheckpoint(api.getData());
}
function replaceRemote(row){
 if(!api.validate(row.data))throw new Error('远程账本格式校验失败');
 api.applyRemote(row.data);remember(row);
}
async function enterAccount(){
 clearSchedule();connected=false;dirty=false;conflict=false;revision=null;remoteRow=null;render();
 api.switchAccount(activeUserId());
 try{
   remoteRow=await readRemote();
   if(!remoteRow){message('此账号还没有云端账本。请确认是否上传本机账本。');return;}
   const local=api.getData(), point=checkpoint();
   if(point&&point.hash===digest(local)){
     // Same last-synced local snapshot: remote changes can safely be pulled.
     replaceRemote(remoteRow);message('云端账本已同步到本机');return;
   }
   if(digest(local)===digest(remoteRow.data)){
     remember(remoteRow);message('账本已连接，多设备同步已启用');return;
   }
   conflict=true;message('云端与本机账本不同，请先选择保留哪份，不会自动覆盖');
 }catch(e){message(e.message);}
}
async function signIn(email,password,signup){
 if(!ENABLED)return message('尚未配置同步服务');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8)return message('请输入有效邮箱和至少 8 位密码');
 try{
   const path=signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
   const result=await request(path,'POST',{email,password});
   if(!updateSession(result)){
     message(signup?'请到邮箱完成验证，然后返回此处登录':'账号尚未完成邮箱确认');
     return;
   }
   await enterAccount();
 }catch(e){message(e.message);}
}
async function signOut(){
 if(!session)return;
 if(dirty&&!confirm('本机有尚未上传的修改。退出后修改仍留在此设备对应账号的数据中，但不会同步到其他设备。确定退出吗？'))return;
 const access=session.access_token;
 clearSchedule();connected=false;dirty=false;conflict=false;revision=null;remoteRow=null;
 session=null;persistSession();
 api.switchAccount(null);
 render();
 message('已退出。此设备的账号数据仍缓存在本地，建议妥善保护设备。');
 // Best-effort revoke; never delay switching to guest.
 if(access)fetch(BASE+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+access}}).catch(()=>{});
}
async function upload(){
 if(!connected||!dirty||conflict||uploading||!navigator.onLine)return;
 uploading=true;
 try{
   const current=api.getData();
   if(!api.validate(current))throw new Error('账本内容校验失败，已阻止上传');
   const id=encodeURIComponent(activeUserId());
   const result=await request('/rest/v1/jianzhang_ledgers?user_id=eq.'+id+'&revision=eq.'+revision,
      'PATCH',{data:current,revision:revision+1},true,'return=representation');
   if(!Array.isArray(result)||result.length!==1){
     conflict=true;connected=false;remoteRow=await readRemote();
     throw new Error('检测到另一设备更新，已暂停上传；请在「我的」手动解决冲突。');
   }
   revision=result[0].revision;
   remoteRow=result[0];
   // If user edited during the HTTP request, keep dirty and re-upload from new revision.
   dirty=digest(current)!==digest(api.getData());
   if(!dirty)markCheckpoint(current);
   failureCount=0;
   message(dirty?'检测到新的本地修改，将继续同步':'已同步到云端');
 }catch(e){failureCount=Math.min(6,failureCount+1);message(e.message);}
 finally{uploading=false;if(dirty&&!conflict)scheduleUpload();}
}
function scheduleUpload(){if(!connected||!activeUserId()||conflict)return;clearSchedule();const wait=Math.min(60000,1500*Math.pow(2,failureCount));timer=setTimeout(()=>{upload().catch(()=>{});},wait);}
function onLocalChange(){if(!connected||!activeUserId())return;dirty=true;message('本地已保存，等待云端同步');scheduleUpload();}
async function initializeCloud(){
 if(!activeUserId()||!api)return;
 // Force a session refresh first to detect revoked or missing credentials.
 try{await getAccessToken();await enterAccount();}
 catch(e){message(e.message);}
}
async function poll(){
 if(!connected||!activeUserId()||conflict||uploading||syncing||document.hidden)return;
 syncing=true;
 try{
   const row=await readRemote();
   if(!row){connected=false;message('云端账本不存在，已暂停同步');return;}
   if(row.revision!==revision){
     if(dirty){connected=false;conflict=true;remoteRow=row;message('另一设备已修改账本，请解决同步冲突');}
     else{replaceRemote(row);message('已接收其他设备的新账目');}
   }else if(dirty)scheduleUpload();
 }catch(e){message(e.message);}
 finally{syncing=false;}
}
async function choose(mode){
 if(!session)return;
 try{
   if(mode==='pull'){
     if(!confirm('将使用云端账本替换当前设备上此账号的数据。建议先从「我的」导出 JSON 备份。确认覆盖吗？'))return;
     const fresh=await readRemote();
     if(!fresh)return message('云端还没有账本');
     replaceRemote(fresh);message('已下载云端账本，并启用自动同步');
   }else if(mode==='push'){
     if(!confirm('将以本机账本覆盖当前账号的云端账本，其他设备之后会看到本机数据。请确认已备份需要保留的记录。继续吗？'))return;
     const local=api.getData();
     if(!api.validate(local))throw new Error('本地账本无效，禁止上传');
     const fresh=await readRemote();
     if(!fresh){
       const row=await request('/rest/v1/jianzhang_ledgers','POST',{user_id:activeUserId(),data:local,revision:1},true,'return=representation');
       if(!row?.[0])throw new Error('创建云端账本失败');
       remember(row[0]);
     }else{
       const id=encodeURIComponent(activeUserId());
       const updated=await request('/rest/v1/jianzhang_ledgers?user_id=eq.'+id+'&revision=eq.'+fresh.revision,
         'PATCH',{data:local,revision:fresh.revision+1},true,'return=representation');
       if(!updated?.[0])throw new Error('另一个设备已修改账本，请重新选择');
       remember(updated[0]);
     }
     message('已上传本机账本，并启用自动同步');
   }
 }catch(e){message(e.message);}
}
async function syncNow(){
 if(conflict||!connected){await poll();return;}
 if(dirty)await upload();else await poll();
}
function el(tag,attrs={},txt){const node=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='class')node.className=v;else node.setAttribute(k,v);}if(txt!==undefined)node.textContent=txt;return node;}
function btn(text,handler,cls='btn-small'){const b=el('button',{type:'button',class:cls},text);b.addEventListener('click',handler);return b;}
function render(){
 const host=document.getElementById('cloud-account-panel');if(!host)return;
 host.replaceChildren();
 host.append(el('div',{class:'settings-title'},'☁ 账号登录与多设备同步'));
 if(!ENABLED){
   host.append(el('p',{class:'settings-desc'},'同步服务尚未接入。当前仍可离线记账；邮箱注册及跨设备同步需要先配置云端项目并执行数据表安全规则。'));
   host.append(el('p',{class:'sync-warning'},'目前登录不可用，不会上传你的资产或负债。'));
   const link=el('a',{href:'https://github.com/zonglianpan-commits/JianZhang/blob/main/docs/CLOUD_SETUP.md',target:'_blank',rel:'noopener noreferrer',class:'btn-small'},'查看账号同步配置教程 ↗');host.append(link);return;
 }
 if(!session){
   host.append(el('p',{class:'settings-desc'},'使用同一邮箱登录安卓、苹果和电脑，同步账本。首次登录会让你选择本机或云端数据，防止误覆盖。'));
   const form=el('form',{class:'sync-form'});
   const email=el('input',{type:'email',placeholder:'邮箱地址',required:'required',autocomplete:'username',maxlength:'160'});
   const pwd=el('input',{type:'password',placeholder:'登录密码（至少 8 位）',required:'required',autocomplete:'current-password',minlength:'8'});
   const actions=el('div',{class:'settings-actions'});
   const login=btn('登录账号',async()=>{login.disabled=true;await signIn(email.value.trim(),pwd.value,false);login.disabled=false;});
   const signup=btn('注册新账号',async()=>{signup.disabled=true;await signIn(email.value.trim(),pwd.value,true);signup.disabled=false;});
   actions.append(login,signup);form.append(email,pwd,actions);
   form.addEventListener('submit',e=>{e.preventDefault();login.click();});
   host.append(form);
 }else{
   host.append(el('p',{class:'settings-desc'},'已登录 '+userEmail()));
   host.append(el('p',{class:'sync-state'},conflict?'⚠ 本机与云端需要确认':connected?(dirty?'◌ 本机已保存，待同步':'✓ 云端同步已启用'):'◌ 当前未连接同步'));
   const row=el('div',{class:'settings-actions'});
   if(conflict||!connected){
     row.append(btn('使用云端账本',()=>choose('pull')),btn('上传本机账本',()=>choose('push')));
   }else row.append(btn('立即同步',()=>syncNow()));
   row.append(btn('退出账号',()=>signOut(),'btn-small btn-danger'));host.append(row);
 }
 if(statusMessage)host.append(el('p',{class:'sync-status',role:'status'},statusMessage));
 host.append(el('p',{class:'sync-warning'},'同步数据未经端到端加密；云服务管理员可能拥有数据库访问权限。不要与他人共用登录密码。'));
}
function init(callbacks){
 api=callbacks;render();
 if(ENABLED&&session)initializeCloud();
 if(ENABLED){
  if(interval)clearInterval(interval);
  interval=setInterval(()=>poll(),30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
  global.addEventListener('online',()=>{if(dirty)scheduleUpload();else poll();});
 }
}
global.JianZhangCloud={init,render,onLocalChange,activeUserId,enabled:ENABLED};
})(window);
