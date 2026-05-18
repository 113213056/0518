/* =============================================
   工具函式
   ============================================= */
const $=id=>document.getElementById(id);
const LS={
  get(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}},
  set(k,v){localStorage.setItem(k,JSON.stringify(v))}
};
const SS={
  get(k){try{return JSON.parse(sessionStorage.getItem(k))}catch{return null}},
  set(k,v){sessionStorage.setItem(k,JSON.stringify(v))}
};

/* =============================================
   資料初始化
   ============================================= */
if(!LS.get('users')) LS.set('users',[]);
if(!LS.get('posts')) LS.set('posts',[]);
let CUR=LS.get('curUser')||null;   // 當前登入者
let cpImgData=null;                 // 發文暫存圖片
let regAvData=null;                 // 註冊暫存頭貼

function safeAppend(id, el) {
  const container = $(id);
  if (container) container.appendChild(el);
  else document.body.appendChild(el); // Fallback for toast
}

/* =============================================
   Toast 通知
   ============================================= */
// 確保 body 內有 toast-box
if (!$('toastBox') && document.body) {
  const tb = document.createElement('div');
  tb.id = 'toastBox';
  tb.className = 'toast-box';
  document.body.appendChild(tb);
}

function toast(msg,type='ok'){
  const d=document.createElement('div');
  d.className='toast '+type;
  d.textContent=msg;
  let box = $('toastBox');
  if(!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-box';
      document.body.appendChild(box);
  }
  box.appendChild(d);
  setTimeout(()=>d.remove(),2800);
}

/* =============================================
   Modal
   ============================================= */
function showModal(){
  const m = $('modalBg');
  if(m) m.classList.add('show');
  else {
    alert('請先登入！');
    go('login');
  }
}
function closeModal(){
  const m = $('modalBg');
  if(m) m.classList.remove('show');
}

/* =============================================
   導覽列渲染
   ============================================= */
function renderNav(){
  const nav=$('navArea');
  if(!nav) return;
  if(CUR){
    nav.innerHTML=`
      <button class="nav-btn" onclick="go('index')">🏀 分享區</button>
      <button class="nav-btn" onclick="go('profile')">👤 我的</button>
      <button class="nav-btn red" onclick="logout()">登出</button>
      <img class="nav-avatar-small" src="${CUR.avatar}" onclick="go('profile')">
    `;
  }else{
    nav.innerHTML=`
      <button class="nav-btn" onclick="go('index')">🏀 分享區</button>
      <button class="nav-btn" onclick="go('login')">登入</button>
      <button class="nav-btn red" onclick="go('register')">註冊</button>
    `;
  }
}

/* =============================================
   頁面路由
   ============================================= */
function go(page){
  if(page==='feed') page='index';
  
  if(page==='profile' || page==='create'){
    if(!CUR){
      toast('請先登入','err');
      setTimeout(() => { window.location.href = 'login.html'; }, 500);
      return;
    }
  }
  window.location.href = page + '.html';
}

function viewUser(uid){
  window.location.href = 'profile.html?uid=' + uid;
}

/* =============================================
   頭貼預覽（註冊用）
   ============================================= */
function prevAv(e,targetId){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{
    regAvData=ev.target.result;
    $(targetId).innerHTML=`<img src="${regAvData}">`;
  };
  r.readAsDataURL(file);
}

/* =============================================
   註冊
   ============================================= */
function doRegister(){
  const id=$('regId').value.trim();
  const nm=$('regNm').value.trim();
  const pw=$('regPw').value;
  if(!id||!nm||!pw){toast('請填寫所有欄位','err');return;}
  if(pw.length<4){toast('密碼至少 4 碼','err');return;}
  const users=LS.get('users');
  if(users.find(u=>u.id===id)){toast('此 ID 已被使用','err');return;}
  const avatar=regAvData||genAvatar(nm);
  users.push({id,name:nm,password:pw,avatar});
  LS.set('users',users);
  regAvData=null;
  $('regId').value='';$('regNm').value='';$('regPw').value='';
  $('regAvPrev').innerHTML='📷';
  toast('🎉 註冊成功！請登入');
  setTimeout(()=>go('login'), 800);
}

function genAvatar(name){
  const c=document.createElement('canvas');c.width=100;c.height=100;
  const ctx=c.getContext('2d');
  const colors=['#1d428a','#c8102e','#552583','#006bb6','#ce1141','#007a33'];
  ctx.fillStyle=colors[Math.floor(Math.random()*colors.length)];
  ctx.fillRect(0,0,100,100);
  ctx.fillStyle='#fff';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(name.charAt(0).toUpperCase(),50,52);
  return c.toDataURL();
}

/* =============================================
   登入
   ============================================= */
function doLogin(){
  const id=$('liId').value.trim();
  const pw=$('liPw').value;
  if(!id||!pw){toast('請填寫帳號與密碼','err');return;}
  const users=LS.get('users');
  const u=users.find(x=>x.id===id&&x.password===pw);
  if(!u){toast('帳號或密碼錯誤','err');return;}
  
  const pendingUser=u;
  const current2FA=Math.floor(100000 + Math.random() * 900000).toString();
  
  // 存入 sessionStorage 跨頁面使用
  SS.set('pendingUser', pendingUser);
  SS.set('current2FA', current2FA);
  
  alert('【系統通知】您的雙重認證驗證碼為：' + current2FA + '\n\n(此為模擬發送，請將此驗證碼輸入到下個畫面)');
  go('2fa');
}

function verify2FA(){
  const pendingUser = SS.get('pendingUser');
  const current2FA = SS.get('current2FA');
  
  if(!pendingUser || !current2FA){
    toast('2FA 驗證已過期，請重新登入', 'err');
    setTimeout(()=>go('login'), 1000);
    return;
  }
  
  const code=$('faCode').value.trim();
  if(!code){toast('請輸入驗證碼','err');return;}
  if(code!==current2FA){toast('驗證碼錯誤','err');return;}
  
  CUR=pendingUser;
  LS.set('curUser',CUR);
  SS.set('pendingUser', null);
  SS.set('current2FA', null);
  
  toast('👋 歡迎回來，'+CUR.name+'！');
  setTimeout(()=>go('profile'), 800);
}

/* =============================================
   登出
   ============================================= */
function logout(){
  CUR=null;localStorage.removeItem('curUser');
  toast('已登出');
  setTimeout(()=>go('index'), 800);
}

/* =============================================
   個人首頁
   ============================================= */
function renderProfile(targetUid){
  const uid = targetUid || (CUR ? CUR.id : null);
  if(!uid) return;
  
  const users=LS.get('users');
  const user = users.find(u=>u.id===uid);
  if(!user) return;

  const isMe = (CUR && CUR.id === uid);

  $('profAv').src=user.avatar;
  $('profNm').textContent=user.name;
  $('profIdTxt').textContent='@'+user.id;
  
  const trigBox = document.querySelector('.new-trigger');
  const secTitle = document.querySelector('.sec-title');
  if(isMe){
    $('trigAv').src=CUR.avatar;
    trigBox.style.display='flex';
    secTitle.innerHTML='📝 我的貼文';
  }else{
    trigBox.style.display='none';
    secTitle.innerHTML='📝 '+esc(user.name)+' 的貼文';
  }

  const posts=LS.get('posts').filter(p=>p.userId===uid).sort((a,b)=>b.ts-a.ts);
  const box=$('myPosts');
  if(!posts.length){
    const msg = isMe ? '你還沒有發布任何貼文<br>點擊上方開始分享吧！' : '這個人還沒有發布任何貼文';
    box.innerHTML=`<div class="empty"><div class="ei">📭</div><p>${msg}</p></div>`;
    return;
  }
  box.innerHTML=posts.map(p=>postHTML(p)).join('');
}

/* =============================================
   發文頁
   ============================================= */
function renderCreate(){
  if(!$('cpAv')) return;
  $('cpAv').src=CUR.avatar;
  $('cpNm').textContent=CUR.name;
  $('cpId').textContent='@'+CUR.id;
  $('cpTitle').value='';$('cpContent').value='';
  cpImgData=null;
  $('cpImgPrev').style.display='none';
  $('cpImgUp').style.display='';
}

function prevCpImg(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{
    cpImgData=ev.target.result;
    $('cpImgTag').src=cpImgData;
    $('cpImgPrev').style.display='block';
    $('cpImgUp').style.display='none';
  };
  r.readAsDataURL(file);
}
function rmCpImg(){
  cpImgData=null;$('cpImgPrev').style.display='none';$('cpImgUp').style.display='';$('cpImgIn').value='';
}

function doPost(){
  const title=$('cpTitle').value.trim();
  const content=$('cpContent').value.trim();
  if(!title||!content){toast('請填寫主題與內容','err');return;}
  const posts=LS.get('posts');
  posts.push({
    pid:'p'+Date.now(),
    userId:CUR.id,
    userName:CUR.name,
    userAvatar:CUR.avatar,
    title,content,
    image:cpImgData||null,
    likes:[],
    comments:[],
    ts:Date.now()
  });
  LS.set('posts',posts);
  toast('🎉 貼文發布成功！');
  setTimeout(()=>go('profile'), 800);
}

/* =============================================
   分享區（動態牆）
   ============================================= */
function renderFeed(){
  if(!$('feedList')) return;
  const posts=LS.get('posts').sort((a,b)=>b.ts-a.ts);
  const box=$('feedList');
  if(!posts.length){
    box.innerHTML='<div class="empty"><div class="ei">🏀</div><p>目前還沒有任何貼文<br>成為第一個分享者吧！</p></div>';
    return;
  }
  box.innerHTML=posts.map(p=>postHTML(p)).join('');
}

/* =============================================
   貼文 HTML 模板
   ============================================= */
function postHTML(p){
  const liked=CUR&&p.likes.includes(CUR.id);
  const timeStr=timeAgo(p.ts);
  const imgPart=p.image?`<img class="post-img" src="${p.image}">`:'';
  const cmtList=p.comments.map(c=>`
    <div class="cm">
      <img src="${c.avatar}">
      <div class="cm-bub">
        <div class="cn">${esc(c.name)}</div>
        <div class="ct">${esc(c.text)}</div>
        <div class="ctime">${timeAgo(c.ts)}</div>
      </div>
    </div>`).join('');

  const cmtInput=CUR?`
    <div class="cm-input">
      <img src="${CUR.avatar}">
      <input type="text" placeholder="撰寫留言..." onkeydown="if(event.key==='Enter')sendCmt('${p.pid}',this)">
      <button class="send" onclick="sendCmt('${p.pid}',this.previousElementSibling)">➤</button>
    </div>`:'';

  const delBtn = (CUR && CUR.id === p.userId) ? `<button class="post-del-btn" onclick="deletePost('${p.pid}')" title="刪除貼文">🗑️</button>` : '';

  return `
  <div class="post" id="post-${p.pid}">
    <div class="post-h">
      <img src="${p.userAvatar}" onclick="viewUser('${p.userId}')" title="查看個人首頁">
      <div>
        <div class="n" onclick="viewUser('${p.userId}')">${esc(p.userName)} <span style="color:var(--text3);font-weight:400;font-size:11px">@${esc(p.userId)}</span></div>
        <div class="t">${timeStr}</div>
      </div>
      ${delBtn}
    </div>
    <div class="post-b">
      <div class="title">${esc(p.title)}</div>
      <div class="content">${esc(p.content)}</div>
    </div>
    ${imgPart}
    <div class="post-stats">
      <span>${p.likes.length?p.likes.length+' 人按讚':''}</span>
      <span>${p.comments.length?p.comments.length+' 則留言':''}</span>
    </div>
    <div class="post-acts">
      <button class="pa-btn ${liked?'liked':''}" onclick="toggleLike('${p.pid}')">
        <span class="ic">${liked?'❤️':'🤍'}</span> ${liked?'已按讚':'按讚'}
      </button>
      <button class="pa-btn" onclick="toggleCmt('${p.pid}')">
        <span class="ic">💬</span> 留言
      </button>
    </div>
    <div class="comments" id="cmt-${p.pid}">
      ${cmtList}
      ${cmtInput}
    </div>
  </div>`;
}

function esc(s){
  const d=document.createElement('div');
  d.textContent=s;
  return d.innerHTML;
}

function timeAgo(ts){
  const diff=Math.floor((Date.now()-ts)/1000);
  if(diff<60) return '剛剛';
  if(diff<3600) return Math.floor(diff/60)+' 分鐘前';
  if(diff<86400) return Math.floor(diff/3600)+' 小時前';
  if(diff<604800) return Math.floor(diff/86400)+' 天前';
  return new Date(ts).toLocaleDateString('zh-TW');
}

function deletePost(pid){
  if(!CUR) return;
  if(!confirm('確定要刪除這則貼文嗎？刪除後無法恢復。')) return;
  
  let posts=LS.get('posts');
  posts = posts.filter(p=>p.pid!==pid);
  LS.set('posts',posts);
  toast('🗑️ 貼文已刪除');
  refreshCurrent();
}

function toggleLike(pid){
  if(!CUR){showModal();return;}
  const posts=LS.get('posts');
  const p=posts.find(x=>x.pid===pid);
  if(!p)return;
  const idx=p.likes.indexOf(CUR.id);
  if(idx===-1) p.likes.push(CUR.id);
  else p.likes.splice(idx,1);
  LS.set('posts',posts);
  refreshCurrent();
}

function toggleCmt(pid){
  const el=$('cmt-'+pid);
  if(!el)return;
  if(el.classList.contains('show')){
    el.classList.remove('show');
  }else{
    if(!CUR){
      const posts=LS.get('posts');
      const p=posts.find(x=>x.pid===pid);
      if(p&&p.comments.length>0){
        el.classList.add('show');
      }else{
        showModal();
      }
      return;
    }
    el.classList.add('show');
    const input=el.querySelector('input');
    if(input) setTimeout(()=>input.focus(),100);
  }
}

function sendCmt(pid,inputEl){
  if(!CUR){showModal();return;}
  const text=inputEl.value.trim();
  if(!text)return;
  const posts=LS.get('posts');
  const p=posts.find(x=>x.pid===pid);
  if(!p)return;
  p.comments.push({
    cid:'c'+Date.now(),
    userId:CUR.id,
    name:CUR.name,
    avatar:CUR.avatar,
    text:text,
    ts:Date.now()
  });
  LS.set('posts',posts);
  inputEl.value='';
  toast('💬 留言成功！');
  refreshCurrent();
  setTimeout(()=>{
    const el=$('cmt-'+pid);
    if(el) el.classList.add('show');
  },50);
}

function refreshCurrent(){
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path.endsWith('/')) {
    renderFeed();
  } else if (path.includes('profile.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid') || (CUR ? CUR.id : null);
    renderProfile(uid);
  }
}

/* =============================================
   初始化頁面邏輯
   ============================================= */
window.addEventListener('DOMContentLoaded', () => {
  renderNav();
  
  const path = window.location.pathname;
  
  if (path.endsWith('index.html') || path.endsWith('/')) {
    renderFeed();
  } else if (path.includes('profile.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid') || (CUR ? CUR.id : null);
    renderProfile(uid);
  } else if (path.includes('create.html')) {
    renderCreate();
  }
});
