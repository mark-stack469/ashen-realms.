const $=id=>document.getElementById(id);
let token="",user=null,character=null,socket=null,selfId=null,players=new Map(),mobs=[],world={width:1800,height:1200};
const authScreen=$("auth"),createScreen=$("create"),gameScreen=$("game");
async function api(path,body){const r=await fetch("/api"+path,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||"Ошибка");return d}
function show(el){[authScreen,createScreen,gameScreen].forEach(x=>x.classList.add("hidden"));el.classList.remove("hidden")}
async function enter(data){token=data.token;user=data.user;character=data.character;if(!character){show(createScreen);return}startGame()}
$("loginBtn").onclick=async()=>{try{const d=await api("/login",{username:$("username").value,password:$("password").value});await enter(d)}catch(e){$("authError").textContent=e.message}};
$("registerBtn").onclick=async()=>{try{const d=await api("/register",{username:$("username").value,password:$("password").value});await enter(d)}catch(e){$("authError").textContent=e.message}};
$("createBtn").onclick=async()=>{try{const d=await api("/character",{name:$("charName").value});character=d.character;startGame()}catch(e){$("createError").textContent=e.message}};
function startGame(){show(gameScreen);$("heroName").textContent=character.name;$("heroLevel").textContent=character.level;connect();resize();requestAnimationFrame(draw)}
function connect(){socket=io({auth:{token}});socket.on("connect",()=>addChat("Система","Подключение к миру установлено"));socket.on("connect_error",e=>addChat("Ошибка",e.message));socket.on("world:init",d=>{selfId=d.selfId;world=d.world;players.clear();d.players.forEach(p=>players.set(p.id,p));mobs=d.mobs||[];updateOnline()});socket.on("player:join",p=>{players.set(p.id,p);updateOnline();addChat("Мир",p.name+" вошёл в мир")});socket.on("player:leave",p=>{players.delete(p.id);updateOnline()});socket.on("player:move",p=>{const old=players.get(p.id);if(old)Object.assign(old,p)});socket.on("chat:message",m=>addChat(m.name+" ["+m.level+"]",m.message))}
function updateOnline(){$("onlineCount").textContent=players.size+1}
function addChat(name,msg){const p=document.createElement("p");p.textContent=name+": "+msg;$("chatLog").appendChild(p);$("chatLog").scrollTop=$("chatLog").scrollHeight}
$("chatForm").onsubmit=e=>{e.preventDefault();const v=$("chatInput").value.trim();if(v&&socket?.connected)socket.emit("chat:send",v);$("chatInput").value=""};
const canvas=$("world"),ctx=canvas.getContext("2d");let cw=0,ch=0,lastMove=0,keys={x:0,y:0};
function resize(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);cw=r.width;ch=r.height;canvas.width=cw*d;canvas.height=ch*d;ctx.setTransform(d,0,0,d,0,0)}
window.addEventListener("resize",resize);
function ground(x,y){const v=(Math.sin(x*.04)+Math.cos(y*.05)+Math.sin((x+y)*.025))/3;return v>.45?"#35352c":v<-.4?"#24252a":"#2d2c29"}
function draw(){if(gameScreen.classList.contains("hidden"))return;ctx.clearRect(0,0,cw,ch);const me=character;const camX=me.x-cw/2,camY=me.y-ch/2;
ctx.fillStyle="#252522";ctx.fillRect(0,0,cw,ch);
const tile=64;for(let y=Math.floor(camY/tile)*tile;y<camY+ch+tile;y+=tile)for(let x=Math.floor(camX/tile)*tile;x<camX+cw+tile;x+=tile){ctx.fillStyle=ground(x,y);ctx.fillRect(x-camX,y-camY,tile-1,tile-1);if((Math.floor(x/128)+Math.floor(y/128))%5===0){ctx.fillStyle="#171719";ctx.fillRect(x-camX+20,y-camY+18,22,15)}}
for(let i=0;i<18;i++){const x=(i*173+220)%world.width,y=(i*251+100)%world.height;if(Math.abs(x-me.x)<cw&&Math.abs(y-me.y)<ch){ctx.fillStyle="#171719";ctx.beginPath();ctx.ellipse(x-camX,y-camY+8,17,7,0,0,7);ctx.fill();ctx.fillStyle="#49423a";ctx.fillRect(x-camX-7,y-camY-13,14,20);ctx.fillStyle="#75634b";ctx.fillRect(x-camX-12,y-camY-20,24,10)}}
mobs.forEach(m=>drawActor(m,camX,camY,"#78834f","☠"));
players.forEach(p=>drawActor(p,camX,camY,"#7793a0",""));
drawActor({...me,x:me.x,y:me.y,name:me.name},camX,camY,"#b18a61","✦",true);
requestAnimationFrame(draw)}
function drawActor(p,cx,cy,color,symbol="",self=false){const x=p.x-cx,y=p.y-cy;if(x<-40||y<-60||x>cw+40||y>ch+60)return;ctx.fillStyle="#111";ctx.beginPath();ctx.ellipse(x,y+10,13,6,0,0,7);ctx.fill();ctx.fillStyle=color;ctx.fillRect(x-9,y-18,18,25);ctx.fillStyle="#c4a58b";ctx.beginPath();ctx.arc(x,y-24,9,0,7);ctx.fill();ctx.fillStyle="#211a1b";ctx.fillRect(x-7,y-28,14,5);if(symbol){ctx.fillStyle="#e3d1b4";ctx.font="13px serif";ctx.fillText(symbol,x-5,y-13)}ctx.fillStyle=self?"#f0d7a7":"#ddd0bc";ctx.font="11px Arial";ctx.textAlign="center";ctx.fillText(p.name||"Упырь",x,y-39);ctx.textAlign="left"}
function move(dx,dy){if(!character)return;const len=Math.hypot(dx,dy)||1;dx/=Math.max(1,len);dy/=Math.max(1,len);character.x=Math.max(30,Math.min(world.width-30,character.x+dx*3.2));character.y=Math.max(30,Math.min(world.height-30,character.y+dy*3.2));const now=Date.now();if(now-lastMove>60&&socket?.connected){socket.emit("player:move",{x:character.x,y:character.y});lastMove=now}}
const stick=$("stick"),knob=$("knob");let dragging=false,origin=null;
function stickStart(e){dragging=true;const r=stick.getBoundingClientRect();origin={x:r.left+r.width/2,y:r.top+r.height/2};stick.setPointerCapture?.(e.pointerId);stickMove(e)}
function stickMove(e){if(!dragging||!origin)return;let dx=e.clientX-origin.x,dy=e.clientY-origin.y;const l=Math.hypot(dx,dy),max=34;if(l>max){dx=dx/l*max;dy=dy/l*max}knob.style.transform=`translate(${dx}px,${dy}px)`;keys={x:dx/max,y:dy/max};move(keys.x,keys.y)}
function stickEnd(){dragging=false;keys={x:0,y:0};knob.style.transform="translate(0,0)"}
stick.addEventListener("pointerdown",stickStart);stick.addEventListener("pointermove",stickMove);stick.addEventListener("pointerup",stickEnd);stick.addEventListener("pointercancel",stickEnd);
$("attack").onclick=()=>{addChat("Система","Ты замахнулся оружием. Боевая система будет расширена в следующем этапе.")};
document.addEventListener("keydown",e=>{if(["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){const dx=(e.key==="a"||e.key==="ArrowLeft"?-1:0)+(e.key==="d"||e.key==="ArrowRight"?1:0),dy=(e.key==="w"||e.key==="ArrowUp"?-1:0)+(e.key==="s"||e.key==="ArrowDown"?1:0);move(dx,dy)}});
