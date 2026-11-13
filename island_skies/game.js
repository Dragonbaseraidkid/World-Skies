/* USA Skies V8: Return-to-flight and landing scores — a self-contained canvas 3D flight simulator.
   No external libraries, no tracking, no network calls. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas=document.createElement('canvas'); canvas.id='flightCanvas'; $('game').appendChild(canvas);
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx){ $('bootError').classList.remove('hidden'); $('bootError').textContent='This browser cannot draw the game. Try a modern browser.'; return; }
const PI=Math.PI, TAU=PI*2, clamp=(x,a,b)=>Math.min(b,Math.max(a,x)), mix=(a,b,t)=>a+(b-a)*t;
const V=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z), mul=(a,t)=>V(a.x*t,a.y*t,a.z*t);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z, cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x), norm=a=>{let l=Math.hypot(a.x,a.y,a.z)||1;return mul(a,1/l)};
const d2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const deg=r=>((r*180/PI)%360+360)%360;
const fmt=n=>Math.round(n).toLocaleString('en-US');
function RNG(seed){let v=seed>>>0;return ()=>((v=(1664525*v+1013904223)>>>0)/4294967296)}
const random=RNG(62108);
const planes=[
 {name:'Skyhopper 172',type:'Single-engine trainer',price:0,max:78,cruise:55,accel:12,turn:.91,span:15,length:18,paint:'#eaf6ff',stripe:'#16bed1',engines:1},
 {name:'Island Twin',type:'Twin-engine island explorer',price:3200,max:104,cruise:78,accel:14,turn:.8,span:21,length:22,paint:'#f3fbff',stripe:'#f18a4f',engines:2},
 {name:'Coastal Commuter',type:'Fast turboprop transporter',price:9500,max:137,cruise:103,accel:17,turn:.72,span:25,length:27,paint:'#f8fbff',stripe:'#4d83eb',engines:2},
 {name:'Jetstream 900',type:'High-speed private jet',price:22000,max:176,cruise:141,accel:20,turn:.6,span:27,length:33,paint:'#f7faff',stripe:'#925df0',engines:3},
 {name:'Sky Titan',type:'Legendary wide-body jet',price:52000,max:216,cruise:171,accel:23,turn:.48,span:43,length:48,paint:'#f8f9fc',stripe:'#efad39',engines:4},
 {name:'Forest Ranger',type:'Rare exploration propeller · visit 8 states to unlock',price:0,max:112,cruise:85,accel:16,turn:1.03,span:21,length:23,paint:'#e4fdf1',stripe:'#268862',engines:2,special:true},
 {name:'Golden Eagle',type:'Rare racing aircraft · win 3 different tracks to unlock',price:0,max:205,cruise:154,accel:23,turn:.89,span:18,length:21,paint:'#fff1bb',stripe:'#d79626',engines:2,special:true},
 {name:'Midnight Aurora',type:'Rare jet · land perfectly 10 times to unlock',price:0,max:229,cruise:180,accel:24,turn:.54,span:31,length:34,paint:'#b4d8ed',stripe:'#263589',engines:3,special:true}
];
const stateAirports=[
 ['Maryland',-76.5,38.9],
 ['Florida',-84.3,30.4],
 ['Alabama',-86.3,32.4],
 ['Alaska',-149.9,61.2],
 ['Arizona',-112.1,33.4],
 ['Arkansas',-92.3,34.7],
 ['California',-121.5,38.6],
 ['Colorado',-104.9,39.7],
 ['Connecticut',-72.7,41.8],
 ['Delaware',-75.6,39.2],
 ['Georgia',-84.4,33.7],
 ['Hawaii',-157.9,21.3],
 ['Idaho',-116.2,43.6],
 ['Illinois',-89.7,39.8],
 ['Indiana',-86.2,39.8],
 ['Iowa',-93.6,41.6],
 ['Kansas',-95.7,39.0],
 ['Kentucky',-84.9,38.2],
 ['Louisiana',-91.1,30.5],
 ['Maine',-69.8,44.3],
 ['Massachusetts',-71.1,42.4],
 ['Michigan',-84.6,42.7],
 ['Minnesota',-93.1,44.9],
 ['Mississippi',-90.2,32.3],
 ['Missouri',-92.2,38.6],
 ['Montana',-112.0,46.6],
 ['Nebraska',-96.7,40.8],
 ['Nevada',-119.8,39.2],
 ['New Hampshire',-71.5,43.2],
 ['New Jersey',-74.8,40.2],
 ['New Mexico',-105.9,35.7],
 ['New York',-73.8,42.7],
 ['North Carolina',-78.6,35.8],
 ['North Dakota',-100.8,46.8],
 ['Ohio',-83.0,40.0],
 ['Oklahoma',-97.5,35.5],
 ['Oregon',-123.0,44.9],
 ['Pennsylvania',-76.9,40.3],
 ['Rhode Island',-71.4,41.8],
 ['South Carolina',-81.0,34.0],
 ['South Dakota',-100.4,44.4],
 ['Tennessee',-86.8,36.2],
 ['Texas',-97.7,30.3],
 ['Utah',-111.9,40.8],
 ['Vermont',-72.6,44.3],
 ['Virginia',-77.4,37.5],
 ['Washington',-122.9,47.0],
 ['West Virginia',-81.6,38.3],
 ['Wisconsin',-89.4,43.1],
 ['Wyoming',-104.8,41.1]
];
// A game-sized global map, with one capital-area airport in 230+ countries.
// Original U.S. airport IDs remain stable to preserve saved races and visits.
const WORLD_SCALE=3200;
const countryData=window.SKY_WORLD.countries;
const islands=stateAirports.map((d,i)=>({id:i,name:d[0],country:'United States',city:d[0],state:d[0],x:(d[1]+100)*WORLD_SCALE,z:(d[2]-38)*WORLD_SCALE,r:1200,emoji:i===1?'🏁':'🛫',heading:0,runwayLength:510,tri:[],runway:[],trees:[],buildings:[]}));
for(const [name,lon,lat,city,region] of countryData){const id=islands.length;islands.push({id,name,country:name,city,region,state:name,x:(lon+100)*WORLD_SCALE,z:(lat-38)*WORLD_SCALE,r:1200,emoji:'🌍',heading:0,runwayLength:510,tri:[],runway:[],trees:[],buildings:[]})}
const countryAirportIds=[0,...islands.filter(ap=>ap.id>=50).map(ap=>ap.id)];
const fullCountryCount=countryAirportIds.length;
const worldPolygons=window.SKY_WORLD.outlines;
const worldLandMask=Uint8Array.from(atob(window.SKY_WORLD.mask),c=>c.charCodeAt(0));


function local(isl,x,y,z){let h=isl.heading;return V(isl.x+x*Math.cos(h)+z*Math.sin(h),y,isl.z-x*Math.sin(h)+z*Math.cos(h))}
const saveKey='usa-skies-v6-landscapes'; const oldSaveKey='island-skies-usa-v4';
let saved={};try{saved=JSON.parse(localStorage.getItem(saveKey)||localStorage.getItem(oldSaveKey)||'{}')||{}}catch(e){}
const profile={cash:typeof saved.cash==='number'?Math.max(0,saved.cash):250,xp:typeof saved.xp==='number'?Math.max(0,saved.xp):0,owned:Array.isArray(saved.owned)?saved.owned.filter(i=>Number.isInteger(i)&&i>=0&&i<planes.length):[0],selected:clamp(saved.selected|0,0,planes.length-1),landings:Math.max(0,saved.landings||0),wins:Math.max(0,saved.wins||0)};
// Career and collections persist between sessions. No network or accounts.
profile.visited=Array.isArray(saved.visited)?saved.visited.filter(n=>Number.isInteger(n)&&n>=0&&n<islands.length):[0];
if(!profile.visited.includes(0))profile.visited.push(0);
profile.discovered=Array.isArray(saved.discovered)?saved.discovered.filter(n=>Number.isInteger(n)&&n>=0):[];
profile.upgrades=typeof saved.upgrades==='object'&&saved.upgrades?{handling:clamp(saved.upgrades.handling|0,0,3),cargo:clamp(saved.upgrades.cargo|0,0,3),landing:clamp(saved.upgrades.landing|0,0,3)}:{handling:0,cargo:0,landing:0};
profile.paint=typeof saved.paint==='number'?clamp(saved.paint|0,0,4):0;
profile.raceWins=typeof saved.raceWins==='object'&&saved.raceWins?saved.raceWins:{};
profile.goodLandings=Number.isFinite(saved.goodLandings)?saved.goodLandings:0;
profile.bestLanding=Number.isFinite(saved.bestLanding)?clamp(saved.bestLanding,0,100):0;
profile.perfectLandings=Number.isFinite(saved.perfectLandings)?Math.max(0,saved.perfectLandings):0;
if(!profile.owned.includes(0))profile.owned.unshift(0);
if(!profile.owned.includes(profile.selected))profile.selected=0;
profile.raceBest=(saved.raceBest&&typeof saved.raceBest==='object')?saved.raceBest:{};
profile.championClaimed=!!saved.championClaimed;
profile.simMode=saved.simMode===false?false:true; // On by default in the Simulator Edition. Easy Mode is one click away.
const oldAirline=(saved.airline&&typeof saved.airline==='object')?saved.airline:{};
profile.airline={
 pilots:Array.isArray(oldAirline.pilots)?oldAirline.pilots.filter(v=>v&&Number.isInteger(v.id)).slice(0,8):[],
 fleet:Array.isArray(oldAirline.fleet)?oldAirline.fleet.filter(v=>v&&Number.isInteger(v.id)&&Number.isInteger(v.type)).slice(0,10):[],
 hubs:(oldAirline.hubs&&typeof oldAirline.hubs==='object')?oldAirline.hubs:{},
 flights:Number.isFinite(oldAirline.flights)?oldAirline.flights:0,
 revenue:Number.isFinite(oldAirline.revenue)?oldAirline.revenue:0,
 nextId:Number.isFinite(oldAirline.nextId)?oldAirline.nextId:1
};
function stateValid(id){return Number.isInteger(id)&&id>=0&&id<islands.length}
function airlinePilot(id){return profile.airline.pilots.find(p=>p.id===id)}
function airlinePlane(id){return profile.airline.fleet.find(p=>p.id===id)}
function hubTier(airport,key){const h=profile.airline.hubs[airport];return h&&Number.isFinite(h[key])?clamp(h[key]|0,0,3):0}
function ownHub(airport){return !!profile.airline.hubs[airport]}
function hubBonus(airport){return (ownHub(airport)?1.07:1)+hubTier(airport,'terminal')*.1+hubTier(airport,'tower')*.03}
function initialAirlineId(){return profile.airline.nextId++}
function pilotHireCost(){return 800+profile.airline.pilots.length*400}
function hirePilot(){let a=profile.airline;if(a.pilots.length>=8){setToast('Maximum 8 employed pilots.');return}
 const cost=pilotHireCost();if(profile.cash<cost){setToast('You need $'+fmt(cost)+' to hire this pilot.');return}
 const names=['Skylar','Alex','Jordan','Morgan','Riley','Casey','Robin','Taylor'];const id=initialAirlineId();
 a.pilots.push({id,name:names[a.pilots.length],skill:1+(a.pilots.length%3),assigned:null,from:null,to:null,progress:0,earned:0});profile.cash-=cost;persist();showModal('airline');setToast('👩‍✈️ New pilot hired!');}
function purchaseAirlinePlane(type){if(!Number.isInteger(type)||type<0||type>4)return;
 const cost=Math.max(1300,planes[type].price*.75|0);if(profile.airline.fleet.length>=10||profile.cash<cost){setToast('Not enough money or fleet full.');return}
 profile.airline.fleet.push({id:initialAirlineId(),type});profile.cash-=cost;persist();showModal('airline');setToast('✈ Fleet aircraft purchased. Assign it to a pilot!')}
function beginAirlineRoute(pilotID,planeID,from,to){const pilot=airlinePilot(pilotID),plane=airlinePlane(planeID);
 if(!pilot||!plane||!stateValid(from)||!stateValid(to)||from===to){setToast('Select two different airports and a fleet aircraft.');return}
 if(profile.airline.pilots.some(p=>p.id!==pilotID&&p.assigned===planeID)){setToast('That aircraft belongs to another pilot!');return}
 Object.assign(pilot,{assigned:planeID,from,to,progress:0});persist();showModal('airline');setToast('🛫 '+pilot.name+' now flies '+islands[from].name+' ↔ '+islands[to].name+'!')}
function stopAirlineRoute(pilotID){const pilot=airlinePilot(pilotID);if(!pilot)return;pilot.assigned=null;pilot.progress=0;persist();showModal('airline');setToast('Route paused. No earnings while paused.')}
function airlineDuration(from,to){return clamp(d2(islands[from],islands[to])/650,55,270)}
function airlinePayout(pilot){const kilometers=d2(islands[pilot.from],islands[pilot.to])/1000;
 return Math.round((165+kilometers*2.1)*(1+.10*(pilot.skill-1))*hubBonus(pilot.from)*hubBonus(pilot.to));}
function tickAirline(dt){if(dt<=0)return;
 for(const p of profile.airline.pilots){if(p.assigned===null||!stateValid(p.from)||!stateValid(p.to)||!airlinePlane(p.assigned))continue;
  p.progress+=dt;const duration=airlineDuration(p.from,p.to);
  if(p.progress>=duration){p.progress-=duration;const paid=airlinePayout(p);
   profile.cash+=paid;profile.xp+=Math.max(8,Math.round(paid/25));profile.airline.flights++;profile.airline.revenue+=paid;p.earned+=paid;
   [p.from,p.to]=[p.to,p.from];persist();setToast('💵 Airline: '+p.name+' completed a flight! +$'+fmt(paid),5);
  }
 }
}
function purchaseHub(airport){if(!state.onGround||nearestIsland(state.pos).is.id!==airport){setToast('Land at this airport to develop it.');return}
 if(ownHub(airport)){setToast('You already own this hub.');return}let cost=1800;
 if(profile.cash<cost){setToast('You need $1,800 to open your airline hub.');return}
 profile.cash-=cost;profile.airline.hubs[airport]={terminal:0,hangar:0,runway:0,tower:0};persist();showModal('airports');setToast('🏢 '+islands[airport].name+' is now your airline hub!')}
const airportUpgradePrices={terminal:1400,hangar:1050,runway:1750,tower:1150};
function purchaseAirportUpgrade(airport,key){if(!Object.hasOwn(airportUpgradePrices,key)||!ownHub(airport)||!state.onGround||nearestIsland(state.pos).is.id!==airport){setToast('Land at an owned hub to improve it.');return}
 const tier=hubTier(airport,key);const price=airportUpgradePrices[key]*(tier+1);
 if(tier>=3||profile.cash<price){setToast('Airport upgrade unavailable or too expensive.');return}
 profile.cash-=price;profile.airline.hubs[airport][key]=tier+1;
 if(key==='runway'){const ap=islands[airport];ap.runwayLength=510+120*(tier+1);ap.tri=[];ap.runway=[];runwayGeo(ap)}
 persist();showModal('airports');setToast('🏗️ Airport '+key+' upgraded to Level '+(tier+1));}
function checkRarePlanes(){const unlocked=[{id:5,yes:profile.visited.length>=8},{id:6,yes:Object.values(profile.raceWins).filter(n=>n>0).length>=3},{id:7,yes:profile.perfectLandings>=10}];
 for(const u of unlocked){if(u.yes&&!profile.owned.includes(u.id)){profile.owned.push(u.id);persist();setToast('🎉 RARE PLANE UNLOCKED: '+planes[u.id].name+'! Visit the hangar.',7)}}}

function persist(){try{localStorage.setItem(saveKey,JSON.stringify(profile))}catch(e){}}
let planeId=profile.selected;
let state={pos:local(islands[0],0,29,-islands[0].runwayLength*.38),heading:0,pitch:0,bank:0,throttle:0,speed:0,gear:true,onGround:true,brake:false,flightTime:0,cam:0,prevPos:V(),currentIsland:0,vspeed:0,flaps:0,trim:0,stall:false,autopilot:false,apHeading:0,apAltitude:250,landingVSpeed:0};
let mission={from:0,to:1,visited:false,kind:'cargo'}; // Starter route; completed jobs lead to a fresh 3-choice board.
let race={active:false,time:0,next:0,ai:[],start:0,course:1}; let emergency={active:false,airport:null,condition:null}; let atcClearance=false;
// Each event gets ONE return point. A challenge is a temporary side activity,
// never a relocation of the actual player flight or assigned delivery.
let eventReturn=null, portalReady=true;
// Optional in-flight radio requests. No energy meters, mandatory grinding or penalties.
const skyRequests=[
 {kind:'cruise',name:'Cruise Control',icon:'🛫',info:'Stay airborne above 45 knots for 40 seconds.',goal:40,cash:160,xp:90},
 {kind:'altitude',name:'High-Altitude Hop',icon:'☁️',info:'Stay above 350 feet for 35 seconds.',goal:35,cash:190,xp:105},
 {kind:'spot',name:'Traffic Spotter',icon:'📻',info:'Find an AI airplane and press V to spot it.',goal:1,cash:220,xp:120}
];
let skyEventClock=0,skyNextEvent=90,skyOffer=null,skyTask=null,skyTaskElapsed=0,skyTaskProgress=0;
function skyEventUI(){
 const panel=$('skyEventBox');if(!panel)return;
 const hidden=race.active||emergency.active||(!skyOffer&&!skyTask);
 panel.classList.toggle('hidden',hidden);
 if(hidden)return;
 const req=skyOffer?skyOffer.req:skyTask;
 $('skyEventTitle').textContent=req.icon+' RADIO REQUEST: '+req.name;
 $('skyEventInfo').textContent=skyOffer?req.info:skyTask.kind==='spot'?'Press V or the AI spotting button.':req.info;
 $('skyEventReward').textContent='+$'+fmt(req.cash)+' · +'+req.xp+' XP';
 const active=!!skyTask;
 $('skyEventAccept').classList.toggle('hidden',active);
 $('skyEventSkip').textContent=active?'GIVE UP':'SKIP';
 $('skyEventProgress').textContent=active?(skyTask.kind==='spot'?'Find an aircraft · '+Math.max(0,Math.ceil(110-skyTaskElapsed))+'s left':Math.floor(skyTaskProgress)+' / '+skyTask.goal+'s held'):'OPTIONAL · NO PENALTY TO SKIP';
}
function skyNext(){skyOffer=null;skyTask=null;skyEventClock=0;skyNextEvent=220+Math.random()*100;skyEventUI()}
function skyAccept(){if(!skyOffer)return;skyTask=skyOffer.req;skyOffer=null;skyTaskElapsed=0;skyTaskProgress=0;skyEventUI();setToast('📻 Radio request accepted: '+skyTask.name,3)}
function skySkip(){skyNext();setToast('📻 Request skipped. Keep flying!',2.6)}
function skyComplete(){if(!skyTask)return;const req=skyTask;profile.cash+=req.cash;profile.xp+=req.xp;persist();skyNext();setToast('✅ RADIO MISSION COMPLETE: '+req.name+' · +$'+fmt(req.cash)+' · +'+req.xp+' XP!',6)}
function tickSkyEvents(dt){
 if(race.active||emergency.active)return;
 if(skyOffer){skyOffer.elapsed+=dt;if(skyOffer.elapsed>40)skyNext();}
 else if(skyTask){
  skyTaskElapsed+=dt;
  const valid=skyTask.kind==='cruise'?!state.onGround&&state.speed>=45:skyTask.kind==='altitude'?!state.onGround&&(state.pos.y-29)*3.28>=350:false;
  if(skyTask.kind!=='spot')skyTaskProgress=valid?skyTaskProgress+dt:0;
  if(skyTaskProgress>=skyTask.goal){skyComplete();return}
  if(skyTaskElapsed>110){skyNext();setToast('📻 Radio request expired. No penalty!',3)}
 }else if(!state.onGround){
  skyEventClock+=dt;
  if(skyEventClock>=skyNextEvent){skyOffer={req:skyRequests[Math.floor(Math.random()*skyRequests.length)],elapsed:0};skyEventClock=0;setToast('📻 Incoming optional radio request!',3.5)}
 }
}

// Optional multiplayer: no public chat, accounts, or tracking. State stays local unless user joins.
// A separate minimal server in this ZIP relays room positions only.
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const multiplayer={ws:null,connected:false,connecting:false,url:location.protocol==='https:'?'wss://'+location.host:location.protocol==='http:'?'ws://'+location.host:'ws://localhost:3000',room:'SKYCLUB',nick:'SKYPILOT',peers:new Map(),message:'Not connected. Play solo or connect to a room!',time:0};
function remotePlayers(){const current=Date.now();const results=[];for(const [id,p] of multiplayer.peers){if(current-p.time>6500){multiplayer.peers.delete(id);continue}
 results.push({id:'friend'+id,name:p.name,pos:V(p.x,p.y,p.z),heading:p.heading,bank:p.bank||0,model:(p.plane|0)%aiModels.length,scale:1.75,kind:'FRIEND'});}
 return results;}
function mpDisconnect(){if(multiplayer.ws){multiplayer.ws.onclose=null;multiplayer.ws.close();}multiplayer.ws=null;multiplayer.connected=false;multiplayer.connecting=false;multiplayer.peers.clear();multiplayer.message='Disconnected. Your solo progress is safe.';mpStatus();}
function mpStatus(){const button=$('mpChip');if(button)button.textContent='👥 '+(multiplayer.connected?multiplayer.peers.size+1:0)+' ONLINE · O';}
function mpConnect(url,room,nick){mpDisconnect();url=String(url||'').trim();room=String(room||'SKYCLUB').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,16);nick=String(nick||'SKYPILOT').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,16);
 if(!/^wss?:\/\//i.test(url)||!room||!nick){multiplayer.message='Use a valid ws:// or wss:// address, room, and nickname.';showModal('multiplayer');return}
 multiplayer.url=url;multiplayer.room=room;multiplayer.nick=nick;multiplayer.connecting=true;multiplayer.message='Connecting...';showModal('multiplayer');
 try{const ws=new WebSocket(url);multiplayer.ws=ws;
 ws.onopen=()=>{if(ws!==multiplayer.ws)return;ws.send(JSON.stringify({type:'join',room,nick}));};
 ws.onmessage=(e)=>{if(ws!==multiplayer.ws)return;let msg;try{msg=JSON.parse(e.data)}catch{return}
 if(msg.type==='welcome'){multiplayer.connecting=false;multiplayer.connected=true;multiplayer.message='Connected to room '+room+'! Other players will appear in green on your radar.';for(const peer of msg.peers||[])mpOnPeer(peer);mpSendState();mpStatus();if(modalType==='multiplayer')showModal('multiplayer');}
 else if(msg.type==='pilot'){mpOnPeer(msg);mpStatus();}
 else if(msg.type==='leave'){multiplayer.peers.delete(msg.id);mpStatus()}
 else if(msg.type==='error'){multiplayer.message=String(msg.message).slice(0,120);mpDisconnect();multiplayer.message=String(msg.message).slice(0,120);if(modalType==='multiplayer')showModal('multiplayer')}
 };
 ws.onerror=()=>{multiplayer.message='Cannot reach the game server. Check its address and that it is running.';};
 ws.onclose=()=>{if(multiplayer.ws!==ws)return;multiplayer.ws=null;multiplayer.connected=false;multiplayer.connecting=false;multiplayer.peers.clear();mpStatus();if(modalType==='multiplayer')showModal('multiplayer');};
 }catch(e){multiplayer.connecting=false;multiplayer.message='Could not connect: '+e.message;showModal('multiplayer')}
}
function mpOnPeer(msg){if(!msg||typeof msg.id!=='string'||typeof msg.name!=='string'||!msg.state)return;let p=msg.state;
 if(![p.x,p.y,p.z,p.heading].every(Number.isFinite))return;
 multiplayer.peers.set(msg.id,{name:msg.name.slice(0,16),x:p.x,y:p.y,z:p.z,heading:p.heading,bank:p.bank||0,plane:p.plane||0,time:Date.now()});}
function mpSendState(){if(!multiplayer.connected||!multiplayer.ws||multiplayer.ws.readyState!==1)return;const p=state.pos;multiplayer.ws.send(JSON.stringify({type:'state',state:{x:p.x,y:p.y,z:p.z,heading:state.heading,bank:state.bank,plane:planeId}}));}
function tickMultiplayer(dt){if(!multiplayer.connected||!multiplayer.ws||multiplayer.ws.readyState!==1)return;multiplayer.time+=dt;if(multiplayer.time<.32)return;multiplayer.time=0;mpSendState();}

let keys=new Set(),isPaused=true,modalType='',shownToastUntil=0,toastQueue=[];
// The nine giant gates form a permanent sky racetrack above Florida.
// All track geometry follows the island if the world spacing changes.
const ringPath=[
 [140,105,455],[195,120,765],[425,145,1030],[735,160,1000],
 [990,165,745],[970,145,420],[755,125,125],[450,110,45],[165,100,185]
];
let raceRings=ringPath.map(p=>local(islands[1],p[0],p[1],p[2]));
let raceStart=local(islands[1],100,95,135);
let racePortal=local(islands[1],0,96,-islands[1].runwayLength*.5-105);
const raceCourses=[{id:1,label:'Florida Coastline',difficulty:1,unlock:1},{id:27,label:'Nevada Desert Dash',difficulty:2,unlock:3},{id:7,label:'Colorado Rockies',difficulty:3,unlock:5},
 {id:31,label:'New York Skyline Sprint',difficulty:4,unlock:7},
 {id:36,label:'Oregon Forest Challenge',difficulty:5,unlock:9}];
function moveRaceCourse(id){const ap=islands[id];raceRings=ringPath.map(([x,y,z])=>local(ap,x,y+((id===7)?70:0),z));raceStart=local(ap,100,id===7?165:95,135);racePortal=local(ap,0,id===7?160:96,-ap.runwayLength*.5-105)}
function pilotLevel(){return Math.max(1,Math.floor(Math.sqrt(profile.xp/95))+1)}
function pilotTitle(){let level=pilotLevel();return level<3?'ROOKIE PILOT':level<5?'FIRST OFFICER':level<8?'CAPTAIN':level<12?'SENIOR CAPTAIN':'LEGENDARY AVIATOR'}
const PAINTS=['Classic White','Red Comet','Electric Blue','Sunset Gold','Midnight Black'];
const COLORS=['#eaf6ff','#ff6683','#54c7fd','#ffc460','#263e57'];
const landmarks=[
 ['Golden Gate Bridge',-122.48,37.82,'bridge'],['Statue of Liberty',-74.04,40.69,'statue'],
 ['Grand Canyon',-112.14,36.05,'canyon'],['Mount Rushmore',-103.46,43.88,'mountain'],
 ['Space Needle',-122.35,47.62,'needle'],['Hollywood Hills',-118.32,34.13,'hills'],
 ['Hoover Dam',-114.74,36.02,'dam'],['Niagara Falls',-79.07,43.08,'falls'],
 ['Gateway Arch',-90.18,38.63,'arch'],['Washington Monument',-77.04,38.89,'obelisk'],
 ['Las Vegas Strip',-115.17,36.11,'city'],['Yellowstone Geyser',-110.49,44.46,'geyser'],
 ['Mount Rainier',-121.76,46.85,'mountain'],['Miami Beach',-80.13,25.79,'beach'],
 ['Cape Canaveral',-80.60,28.39,'rocket'],['Chicago Skyline',-87.63,41.88,'city']
].map((p,i)=>({id:i,name:p[0],x:(p[1]+100)*WORLD_SCALE,z:(p[2]-38)*WORLD_SCALE,kind:p[3]}));

let W=0,H=0,DPR=1,focal=700,camPos=V(0,70,-200),camForward=V(0,0,1),camRight=V(1,0,0),camUp=V(0,1,0),now=0;
function resize(){const mobile=window.matchMedia('(pointer:coarse)').matches;DPR=Math.min(mobile?(innerWidth<750?1.1:1.35):1.7,window.devicePixelRatio||1);W=Math.max(320,innerWidth);H=Math.max(280,innerHeight);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);focal=Math.min(W*.85,H*1.24)}
window.addEventListener('resize',resize);resize();
function face(a,b,c,color,alpha=1,out){(out||this).push({a,b,c,color,alpha})}
function addQuad(out,a,b,c,d,color,alpha=1){out.push({a,b,c,color,alpha},{a,b:c,c:d,color,alpha})}
function boxMesh(out,cx,cy,cz,sx,sy,sz,colors){let p=[V(cx-sx/2,cy-sy/2,cz-sz/2),V(cx+sx/2,cy-sy/2,cz-sz/2),V(cx+sx/2,cy+sy/2,cz-sz/2),V(cx-sx/2,cy+sy/2,cz-sz/2),V(cx-sx/2,cy-sy/2,cz+sz/2),V(cx+sx/2,cy-sy/2,cz+sz/2),V(cx+sx/2,cy+sy/2,cz+sz/2),V(cx-sx/2,cy+sy/2,cz+sz/2)];let col=Array.isArray(colors)?colors:[colors,colors,colors,colors,colors,colors];[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]].forEach((f,i)=>addQuad(out,...f.map(k=>p[k]),col[i]||col[0]));}
function cylinder(out,x,y,z,r1,r2,len,color1,color2,axis='z',N=10){function pt(r,ang,t){let a=Math.cos(ang)*r,b=Math.sin(ang)*r;return axis==='z'?V(x+a,y+b,z+t):axis==='x'?V(x+t,y+a,z+b):V(x+a,y+t,z+b)};for(let j=0;j<N;j++){let a=j*TAU/N,b=(j+1)*TAU/N;let p1=pt(r1,a,-len/2),p2=pt(r1,b,-len/2),p3=pt(r2,b,len/2),p4=pt(r2,a,len/2);addQuad(out,p1,p2,p3,p4,j%2?color1:color2||color1)}}
function runwayGeo(is){let g=is.runway, L=is.runwayLength, width=is.id===0?77:52,y=24;
 const rp=(x,z,yy=y)=>local(is,x,yy,z);
 for(let zz=-L/2;zz<L/2;zz+=19){let z2=Math.min(L/2,zz+19);addQuad(g,rp(-width/2,zz),rp(width/2,zz),rp(width/2,z2),rp(-width/2,z2),'#303b49')}
 for(let z=-L/2+28;z<L/2-14;z+=41)addQuad(g,rp(-2,z,24.3),rp(2,z,24.3),rp(2,z+20,24.3),rp(-2,z+20,24.3),'#ecf5e9');
 for(let side of [-1,1])for(let z=-L/2+20;z<L/2-8;z+=15){let x=side*(width/2-4);addQuad(g,rp(x-1,z,24.25),rp(x+1,z,24.25),rp(x+1,z+5,24.25),rp(x-1,z+5,24.25),'#d8eaed')}
 for(let z of [-L/2+19,L/2-29])for(let j=-2;j<=2;j++){let x=j*9;addQuad(g,rp(x-3,z,24.5),rp(x+3,z,24.5),rp(x+3,z+10,24.5),rp(x-3,z+10,24.5),'#f2f6ef')}
 let taxiX=width/2+32;
 addQuad(g,rp(width/2,-L*.16,24.07),rp(taxiX+45,-L*.16,24.07),rp(taxiX+45,L*.12,24.07),rp(width/2,L*.12,24.07),'#56616c');
 g=is.tri; const b0=local(is,taxiX+90,38,-65);boxAtWorld(g,b0,76,30,95,['#d6e4e7','#b3cbd0','#d2dfe1','#b0c6cd','#b7d7e5','#c3c6bf']);
 const b1=local(is,taxiX+72,54,85);boxAtWorld(g,b1,21,62,23,['#e4ebe5','#bfd7de','#d1e5ee','#c6d6e2','#b6dfe9','#eef3e9']);
 const tow=local(is,taxiX+72,87,85);boxAtWorld(g,tow,34,11,33,['#306781','#4985a6','#356d91','#5a9abe','#9ac7d4','#47789a']);
 const hang=local(is,-taxiX-40,38,-45);boxAtWorld(g,hang,87,28,83,['#bcc8c8','#e4eeec','#b5d1d5','#d7e6e4','#c4d4d5','#aebfc6']);
 for(let j=0;j<7;j++){let pos=local(is,-taxiX-62+(j%3)*20,27,130+Math.floor(j/3)*36);boxAtWorld(g,pos,14,10,21,['#f7dcbf','#a4dde1','#f8cc94','#d2c0a6','#a9dcf2','#cdbaab'])}
}
function boxAtWorld(out,c,sx,sy,sz,cols){boxMesh(out,c.x,c.y,c.z,sx,sy,sz,cols)}
function makeIslandMesh(is){let n=52, rings=[{r:1.12,y:-6},{r:1.02,y:0},{r:.94,y:5},{r:.82,y:13},{r:.67,y:23},{r:.15,y:23}];let v=[];
 for(let k=0;k<rings.length;k++){v[k]=[];for(let j=0;j<n;j++){let a=j/n*TAU,r=rings[k].r*is.r*(1+0.052*Math.sin(a*5+is.id*1.7)+0.028*Math.cos(a*9+is.id));v[k].push(V(is.x+Math.cos(a)*r,rings[k].y,is.z+Math.sin(a)*r))}}
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){let j1=(j+1)%n,color=k===0?'#237aa1':k===1?'#f0d8a0':k===2?'#d9bf7f':k===3?(j%7===0?'#3b8e57':'#399b62'):(j%11===0?'#64a957':'#54a963');addQuad(is.tri,v[k][j],v[k][j1],v[k+1][j1],v[k+1][j],color)}
 let c=V(is.x,23,is.z);for(let j=0;j<n;j++)is.tri.push({a:c,b:v[v.length-1][j],c:v[v.length-1][(j+1)%n],color:'#58a45f',alpha:1});
 runwayGeo(is);
 let rand=RNG(is.id*811+219);
 for(let k=0;k<(is.id===0?75:34);k++){let a=rand()*TAU,rad=is.r*(.34+rand()*.39),x=is.x+Math.cos(a)*rad,z=is.z+Math.sin(a)*rad;
 // Keep the runway and surrounding taxiway uncluttered.
 let lx=(x-is.x)*Math.cos(is.heading)-(z-is.z)*Math.sin(is.heading),lz=(x-is.x)*Math.sin(is.heading)+(z-is.z)*Math.cos(is.heading);
 if(Math.abs(lx)<120&&Math.abs(lz)<is.runwayLength*.66)continue;
 let height=17+rand()*25,isPalm=rand()>.38;
 const trunk='#876045',greens=['#1c8154','#178a5d','#33a965','#197d53','#51ad65'];
 let brown=V(x,23+height*.47,z);cylinder(is.tri,x,23+height*.52,z,2.3,1.5,height,trunk,'#6b4a31','y',5);
 let crownBase=23+height*.65,top=23+height*1.36;
 for(let s=0;s<7;s++){let ang=s/7*TAU,rr=isPalm?13:10;let o=V(x+Math.cos(ang)*rr,crownBase,z+Math.sin(ang)*rr);is.tri.push({a:V(x,top,z),b:V(x+Math.cos(ang)*rr,crownBase,z+Math.sin(ang)*rr),c:V(x+Math.cos(ang+TAU/7)*rr,crownBase,z+Math.sin(ang+TAU/7)*rr),color:greens[(k+s)%greens.length],alpha:1})}
 }
 if(is.id===0){let rand2=RNG(8101);for(let k=0;k<27;k++){let ang=rand2()*TAU,rad=is.r*(.28+rand2()*.32),x=is.x+Math.cos(ang)*rad,z=is.z+Math.sin(ang)*rad;if(Math.abs(x)<170&&Math.abs(z)<360)continue;let hh=20+rand2()*70;boxAtWorld(is.tri,V(x,23+hh/2,z),22+rand2()*18,hh,23+rand2()*20,['#d9d8d2','#b2cbd4','#e7d9c3','#9fc1d8','#e2f0e5','#d4d9cc'])}}
}
// Natural Earth geographic outline. Lookup is sampled at half-degree resolution,
// with extra land beneath airports so small countries remain landable.
const worldOutlines=worldPolygons;
function onPolygon(lon,lat,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){let a=polygon[i],b=polygon[j];if(((a[1]>lat)!==(b[1]>lat))&&(lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
function isUSLand(x,z){
 const lon=x/WORLD_SCALE-100,lat=z/WORLD_SCALE+38;
 if(lon>=-180&&lon<180&&lat>=-90&&lat<90){const i=Math.floor((lon+180)*2),j=Math.floor((lat+90)*2),idx=j*720+i;if(worldLandMask[idx>>3]&(128>>(idx&7)))return true}
 // Render the ground around tiny island-country airports and small coastal airfields.
 for(const a of islands){if(Math.abs(a.x-x)<1800&&Math.abs(a.z-z)<1800&&d2(a,{x,z})<1800)return true}
 return false;
}
// Real geographic placement with procedurally modeled, stylized US landscapes.
// Lightweight height-field renderer: colored hills, ridges, farms, deserts, lakes and trees.
function hash2(x,z){let n=Math.sin(x*127.1+z*311.7)*43758.5453123;return n-Math.floor(n)}
function biomeAt(x,z){let lon=x/WORLD_SCALE-100,lat=z/WORLD_SCALE+38;
 if((lon>-18&&lon<55&&lat>10&&lat<34)||(lon>35&&lon<65&&lat>12&&lat<33)||(lon>110&&lon<145&&lat<-18)||(lon<-105&&lon>-120&&lat>20&&lat<38)||(lon>-76&&lon<-66&&lat<-33)||(lon>15&&lon<34&&lat<-32))return 'desert';
 if((lon>65&&lon<107&&lat>22&&lat<46)||(lon<-105&&lon>-125&&lat>36&&lat<62)||(lon>-77&&lon<-65&&lat<-30)||(lon>4&&lon<22&&lat>44)||(lon>130&&lon<155&&lat<-22))return 'mountain';
 if((lat>48&&lat<71)||(lat<-42&&lat>-58)||(lat>0&&lat<15&&lon>95)||(lat>-15&&lat<10&&lon>-78&&lon<-51))return 'forest';
 if(Math.abs(lat)<28)return 'coast';
 if((lon>-100&&lon<-85)||(lon>20&&lon<80&&lat>35&&lat<55))return 'prairie';
 return 'woodland'}
function groundColor(x,z){const biome=biomeAt(x,z),n=hash2(Math.floor(x/1400),Math.floor(z/1400));
 const colors={desert:['#cbb27d','#bba270','#d8ba83','#c1a276'],mountain:['#718569','#84917a','#777e6e','#779483'],forest:['#347e58','#49865d','#427b51','#347449'],coast:['#66a66d','#7fb774','#5e9b6e','#86b47c'],prairie:['#a2b772','#8eab68','#a6af6c','#c0b77d'],woodland:['#66a66b','#70af70','#538d66','#78b57a']};
 return colors[biome][Math.floor(n*4)]}
function terrainHeight(x,z){if(!isUSLand(x,z))return -6;
 let nearest=Infinity;for(const ap of islands){if(Math.abs(ap.x-x)>3200||Math.abs(ap.z-z)>3200)continue;let d=Math.hypot(ap.x-x,ap.z-z);if(d<nearest)nearest=d;if(nearest<1200)break}
 let airportFlatten=clamp((nearest-1350)/1900,0,1);
 if(airportFlatten===0)return 22;
 const biome=biomeAt(x,z),w1=Math.sin(x/2200+.7)*Math.cos(z/2400+1.6),w2=Math.sin(x/880+z/2100)*Math.cos(z/1230-x/1900),w3=Math.sin(x/460)*Math.sin(z/620);
 let amp=biome==='mountain'?470:biome==='desert'?100:biome==='forest'?115:biome==='prairie'?38:55;
 let h=Math.max(8,26+amp*(.38+.26*w1+.25*w2+.11*w3));
 if(biome==='mountain')h+=Math.max(0,amp*.38*(Math.sin(x/520+z/800)+Math.cos(z/580-x/950)));
 return mix(22,h,airportFlatten)}
function elevationColor(x,z,y){if(!isUSLand(x,z))return '#107d9b';let biome=biomeAt(x,z);
 if(biome==='mountain'&&y>450)return '#e7edf0';
 if(biome==='mountain'&&y>300)return '#a2a7a4';
 if(biome==='mountain'&&y>150)return '#72796f';
 return groundColor(x,z)}
const renderLand=[]; const renderDecor=[];
function addTreeMesh(out,x,z,h,desert=false){let y=terrainHeight(x,z);if(desert){cylinder(out,x,y+6,z,1.2,1.1,11,'#65806b','#739c78','y',5);return}
 // Three colored cone sections and narrow trunk.
 const tall=h,foliage=biomeAt(x,z)==='forest',green=foliage?'#185743':'#33754b',green2=foliage?'#32755a':'#469462';
 boxMesh(out,x,y+tall*.25,z,2.2,tall*.5,2.2,'#72583b');
 for(let k=0;k<2;k++){let yy=y+tall*(.28+k*.25),rad=tall*(.3-k*.08),tip=V(x,yy+tall*.45,z);for(let j=0;j<6;j++){let a=j*TAU/6,b=(j+1)*TAU/6;out.push({a:V(x+rad*Math.cos(a),yy,z+rad*Math.sin(a)),b:V(x+rad*Math.cos(b),yy,z+rad*Math.sin(b)),c:tip,color:j%2?green:green2,alpha:1})}}}
function makeLandscape(){renderLand.length=0;renderDecor.length=0;
 // Near player: 21x21 square terrain cells with elevation and biome-dependent colors.
 const tile=550, ix=Math.floor(state.pos.x/tile),iz=Math.floor(state.pos.z/tile);
 for(let i=-10;i<=10;i++)for(let j=-10;j<=10;j++){
  const x=(ix+i)*tile,z=(iz+j)*tile,cx=x+tile*.5,cz=z+tile*.5;
  if(!isUSLand(cx,cz))continue;
  const a=V(x,terrainHeight(x,z),z),b=V(x+tile,terrainHeight(x+tile,z),z),c=V(x+tile,terrainHeight(x+tile,z+tile),z+tile),d=V(x,terrainHeight(x,z+tile),z+tile);
  addQuad(renderLand,a,b,c,d,elevationColor(cx,cz,(a.y+b.y+c.y+d.y)/4));
  // Golden farms, trails, dark-green forest patches and lake inlets.
  if(hash2(ix+i,iz+j)<.11&&biomeAt(cx,cz)==='prairie'){
   let yy=terrainHeight(cx,cz)+2;
   addQuad(renderDecor,V(x+60,yy,z+65),V(x+tile-60,yy,z+65),V(x+tile-60,yy,z+tile-70),V(x+60,yy,z+tile-70),'#c7ad68');}
  if(hash2(ix+i+500,iz+j+700)<.046&&biomeAt(cx,cz)!=='desert'){
   let yy=terrainHeight(cx,cz)+3;
   addQuad(renderDecor,V(x+90,yy,z+90),V(x+tile-65,yy,z+90),V(x+tile-65,yy,z+tile-85),V(x+90,yy,z+tile-85),'#4e9ebe');}
 }
 // Landmarks are represented by individually constructed 3D objects and exploration rewards.
 for(const lm of landmarks){if(Math.hypot(lm.x-state.pos.x,lm.z-state.pos.z)<7400)makeLandmarkMesh(renderDecor,lm)}
 // Forests, cacti, clustered cities and farm structures regenerated deterministically.
 const cell=460,x0=Math.floor(state.pos.x/cell),z0=Math.floor(state.pos.z/cell);
 for(let i=-8;i<=8;i++)for(let j=-8;j<=8;j++){
  let gx=x0+i,gz=z0+j,n=hash2(gx,gz),x=(gx+.18+hash2(gx+10,gz)*.64)*cell,z=(gz+.2+hash2(gx,gz+9)*.6)*cell;
  if(!isUSLand(x,z))continue;
  let nearAp=false;for(const ap of islands){if(Math.abs(ap.x-x)<900&&Math.abs(ap.z-z)<900&&Math.hypot(ap.x-x,ap.z-z)<900){nearAp=true;break}}if(nearAp)continue;
  const biome=biomeAt(x,z),isForest=biome==='forest'||biome==='woodland';
  if(isForest&&n<.64){for(let k=0;k<3;k++){let xx=x+(hash2(gx+k,gz+6)-.5)*175,zz=z+(hash2(gx+11,gz+k)-.5)*175;addTreeMesh(renderDecor,xx,zz,25+hash2(gx+k,gz+27)*34)}}
  else if(biome==='desert'&&n<.28){for(let k=0;k<2;k++)addTreeMesh(renderDecor,x+k*36,z-k*18,15,true)}
  else if(biome==='prairie'&&n<.12){boxAtWorld(renderDecor,V(x,terrainHeight(x,z)+13,z),24,24,28,['#c2b590','#e7cfb3','#c4a67e','#d9bd95','#9f8562','#ded3ad'])}
 }
 // Roads connect local towns to the airport; deterministic terrain-following segments.
 for(const ap of islands){if(Math.abs(ap.x-state.pos.x)>6100||Math.abs(ap.z-state.pos.z)>6100)continue;
  for(let i=-3;i<=3;i++)for(let dir of [-1,1]){
   const x=ap.x+dir*450+i*170,z1=ap.z-2200,z2=ap.z+2200;
   if(i%2!==0)continue;
   for(let k=0;k<10;k++){let za=z1+(z2-z1)*k/10,zb=z1+(z2-z1)*(k+1)/10;
    if(!isUSLand(x,za)||!isUSLand(x,zb))continue;
    const ya=terrainHeight(x,za)+2,yb=terrainHeight(x,zb)+2;
    addQuad(renderDecor,V(x-10,ya,za),V(x+10,ya,za),V(x+10,yb,zb),V(x-10,yb,zb),'#717d77');
   }
  }
 }
 // Regional terrain props: planted orchards, highway overpasses, lakeside cabins,
 // desert mesas, and Alaska snow. All generated nearby, not across the entire world.
 for(const ap of islands){if(Math.hypot(ap.x-state.pos.x,ap.z-state.pos.z)>6000)continue;
  const biome=biomeAt(ap.x,ap.z),hubs=profile.airline.hubs[ap.id];
  const t=hubs?hubTier(ap.id,'terminal'):0,g=hubs?hubTier(ap.id,'hangar'):0,tw=hubs?hubTier(ap.id,'tower'):0;
  if(hubs){
   const term=local(ap,235,45+t*12,-180);boxAtWorld(renderDecor,term,110+t*30,35+t*25,75+t*23,['#9fc7e0','#cce0ea','#8eb7cc','#dce9ef','#a7c7d8','#8eafc9']);
   for(let k=0;k<g+1;k++){const box=local(ap,-230-k*95,37,-195);boxAtWorld(renderDecor,box,73,27+g*7,85,'#acbcbf')}
   const tower=local(ap,275,87+tw*23,65);boxAtWorld(renderDecor,tower,18,95+tw*45,18,'#becbd5');
   const deck=local(ap,275,137+tw*45,65);boxAtWorld(renderDecor,deck,49,18,45,'#275c78');
  }
  if(biome==='desert'){for(let i=0;i<12;i++){let a=i*TAU/12,r=1800+1200*hash2(i,ap.id),x=ap.x+Math.cos(a)*r,z=ap.z+Math.sin(a)*r;
   let ht=80+hash2(i+20,ap.id)*240;boxAtWorld(renderDecor,V(x,terrainHeight(x,z)+ht/2,z),75,ht,95,['#bb7a56','#e0a16a','#a65c42','#c47c5a','#e9b47c','#a77351']);}}
  if(biome==='forest'||biome==='woodland')for(let i=0;i<20;i++){let a=i*2.399,r=950+30*i,x=ap.x+Math.cos(a)*r,z=ap.z+Math.sin(a)*r;
   if(isUSLand(x,z))addTreeMesh(renderDecor,x,z,30+hash2(i,ap.id)*35)}
 }
 // A few distinctive airport-side cities and traffic-ready urban areas.
 for(const ap of islands){let distTo=Math.hypot(ap.x-state.pos.x,ap.z-state.pos.z);if(distTo>6200)continue;
  const rng=RNG(ap.id*753+1988);
  for(let j=0;j<(ap.id===31||ap.id===6||ap.id===10||ap.id===44?64:34);j++){
   let angle=rng()*TAU,r=700+rng()*2100,x=ap.x+Math.cos(angle)*r,z=ap.z+Math.sin(angle)*r;
   if(!isUSLand(x,z)||Math.abs(x-ap.x)<200&&Math.abs(z-ap.z)<900)continue;
   let metro=[31,6,10,44,13,45].includes(ap.id),tall=28+rng()*(metro?250:125),wide=22+rng()*(metro?46:30);
   boxAtWorld(renderDecor,V(x,terrainHeight(x,z)+tall/2,z),wide,tall,wide,['#e5ded0','#c2d0d6','#cfccc3','#acb8b2','#bec9d2','#d5d9d3']);
  }
 }
}
function makeLandmarkMesh(out,lm){const x=lm.x,z=lm.z,y=terrainHeight(x,z);
 function p(dx,dy,dz){return V(x+dx,y+dy,z+dz)}
 const stone=['#bfbec2','#dbd6cf','#8c969d','#b5b3ac','#dfd7bb','#c4c7cc'];
 if(lm.kind==='bridge'){for(const dx of [-110,110]){boxAtWorld(out,p(dx,90,0),20,180,24,'#c95343');for(let h=-2;h<=2;h++)boxAtWorld(out,p(dx,125,h*23),8,5,7,'#f39e74')}boxAtWorld(out,p(0,48,0),420,12,48,'#c66a54');for(let n=-200;n<=200;n+=25){let yy=60+Math.abs(n)*.43;boxAtWorld(out,p(n,yy/2+45,0),2,yy,2,'#c77765')}}
 else if(lm.kind==='statue'){boxAtWorld(out,p(0,26,0),54,52,54,'#bfc6c8');boxAtWorld(out,p(0,89,0),24,72,28,'#66ac9d');boxAtWorld(out,p(0,143,0),22,32,21,'#83c8b4');boxAtWorld(out,p(16,147,0),7,70,7,'#8ed2b6');boxAtWorld(out,p(16,195,0),14,24,14,'#ffdf80')}
 else if(lm.kind==='needle'){cylinder(out,x,y+110,z,10,4,220,'#bfcbd8','#e6f1f6','y',9);cylinder(out,x,y+210,z,42,24,14,'#8aaab9','#4c7e97','y',12);cylinder(out,x,y+255,z,2,2,80,'#d2e4ed','#e7f4f9','y',8)}
 else if(lm.kind==='arch'){for(let i=0;i<14;i++){let t=-PI/2+(i+.5)*PI/14,dx=150*Math.sin(t),dy=170*Math.cos(t)+9;boxAtWorld(out,p(dx,dy,0),18,24,18,'#dce2e2')}}
 else if(lm.kind==='rocket'){boxAtWorld(out,p(0,65,0),13,130,13,'#f8f9fb');cylinder(out,x,y+138,z,6,1,24,'#e8e9ed','#fff','y',8);for(let dir of [-1,1])boxAtWorld(out,p(dir*9,17,0),5,35,8,'#e56658')}
 else if(lm.kind==='obelisk'){boxAtWorld(out,p(0,105,0),26,210,26,'#ebe6d9');out.push({a:p(-13,210,-13),b:p(13,210,-13),c:p(0,248,0),color:'#e0dbcc'},{a:p(13,210,13),b:p(-13,210,13),c:p(0,248,0),color:'#c7c3bc'})}
 else if(lm.kind==='city'){for(let i=0;i<16;i++){let dx=(i%4-1.5)*65,dz=(Math.floor(i/4)-1.5)*65,tall=65+hash2(i,lm.id)*185;boxAtWorld(out,p(dx,tall/2,dz),35,tall,35,stone)}}
 else if(lm.kind==='canyon'){for(let k=0;k<5;k++){let rad=80+k*55,yy=6+k*18;for(let i=0;i<16;i++){let a=i*TAU/16,b=(i+1)*TAU/16;out.push({a:p(Math.cos(a)*rad,yy,Math.sin(a)*rad),b:p(Math.cos(b)*rad,yy,Math.sin(b)*rad),c:p(Math.cos((a+b)/2)*rad*.65,yy+22,Math.sin((a+b)/2)*rad*.65),color:k%2?'#b56b47':'#e3a06f'})}}}
 else if(lm.kind==='mountain'||lm.kind==='hills'){let height=lm.kind==='mountain'?270:110;for(let k=0;k<5;k++){let a=k*TAU/5,b=(k+1)*TAU/5;out.push({a:p(Math.cos(a)*145,0,Math.sin(a)*145),b:p(Math.cos(b)*145,0,Math.sin(b)*145),c:p(0,height,0),color:k%2?'#8c9289':'#697d74'});if(lm.kind==='mountain')out.push({a:p(Math.cos(a)*64,height*.6,Math.sin(a)*64),b:p(Math.cos(b)*64,height*.6,Math.sin(b)*64),c:p(0,height,0),color:'#eaf0ed'})}}
 else if(lm.kind==='dam'){boxAtWorld(out,p(0,70,0),250,140,40,'#b5b5ae');boxAtWorld(out,p(0,2,-110),280,4,145,'#4a9bc0')}
 else if(lm.kind==='falls'){boxAtWorld(out,p(-55,60,0),110,120,30,'#6b8963');boxAtWorld(out,p(55,60,0),100,120,30,'#61795a');boxAtWorld(out,p(0,47,0),18,95,35,'#d5eef5')}
 else if(lm.kind==='geyser'){for(let i=0;i<5;i++)cylinder(out,x+(i-2)*7,y+45+i*20,z,7,15,85,'#e7f4f4','#a6e6f1','y',8)}
 else if(lm.kind==='beach'){boxAtWorld(out,p(0,4,0),260,8,150,'#e9cf9d');for(let i=0;i<11;i++)addTreeMesh(out,x-115+i*21,z+40,40)}
}
// Airports now sit on continuous terrain rather than raised circular islands.
for(const is of islands){is.runwayLength=510+hubTier(is.id,'runway')*120;runwayGeo(is);}

// Airframe mesh builder; local nose points in +Z and Y is up.
function planeMesh(spec){let out=[],len=spec.length,span=spec.span,bodyW=spec.engines===4?4.4:spec.engines===3?2.6:1.9;
 let sections=[[-len*.53,.18],[-len*.44,.72],[-len*.23,1.0],[len*.12,1],[len*.35,.86],[len*.48,.47],[len*.56,.04]],N=12;
 for(let s=0;s<sections.length-1;s++){let [z1,r1]=sections[s],[z2,r2]=sections[s+1];for(let j=0;j<N;j++){let a=j*TAU/N,b=(j+1)*TAU/N;let v=(r,t,z)=>V(Math.cos(t)*r*bodyW,Math.sin(t)*r*bodyW*.95+1.3,z);let shade=j>3&&j<9?'#cbd8dc':spec.paint;addQuad(out,v(r1,a,z1),v(r1,b,z1),v(r2,b,z2),v(r2,a,z2),shade)}}
 // Top colored stripe and glass cockpit canopy.
 let zz=len*.23,canopyLen=len*.21;
 boxMesh(out,0,1.3+bodyW*.83,zz,bodyW*1.18,bodyW*.55,canopyLen,['#6cacc7','#193b67','#204469','#407fac','#2b6585','#2b4c6b']);
 for(let i=-1;i<=1;i+=2){let a=i*span*.05,b=i*span*.51;
 // Swept wing, upper and lower surfaces with colored tip.
 let y=.87,rootFront=len*.17,rootBack=-len*.15,tipFront=len*.035,tipBack=-len*.13;
 let r1=V(a,y,rootFront),r2=V(b,y-.65,tipFront),r3=V(b,y-.65,tipBack),r4=V(a,y,rootBack);
 addQuad(out,r1,r2,r3,r4,spec.paint);addQuad(out,V(r4.x,r4.y-.35,r4.z),V(r3.x,r3.y-.35,r3.z),V(r2.x,r2.y-.35,r2.z),V(r1.x,r1.y-.35,r1.z),'#b6cbd6');
 let t=V(i*span*.52,y-.3,tipFront*.5); boxMesh(out,t.x,t.y,t.z,span*.042,.8,1.35,spec.stripe);
 // Tailplane wing
 let ta=i*span*.04,tb=i*span*.20,tail=-len*.4;
 addQuad(out,V(ta,1.7,tail+len*.06),V(tb,1.8,tail+len*.015),V(tb,1.8,tail-len*.065),V(ta,1.7,tail-len*.09),'#e6f4f8');
 }
 // Vertical tail fin
 let tailZ=-len*.42;
 addQuad(out,V(0,1.7,tailZ-len*.10),V(0,1.7,tailZ+len*.05),V(0,1.7+span*.26,tailZ-len*.03),V(0,1.7+span*.26,tailZ-len*.08),spec.stripe);
 // Accent stripe along sides
 for(let sign of [-1,1])addQuad(out,V(sign*bodyW*.85,1.14,-len*.35),V(sign*bodyW*.85,1.14,len*.27),V(sign*bodyW*.86,1.35,len*.28),V(sign*bodyW*.86,1.35,-len*.33),spec.stripe);
 let enginePts=spec.engines===1?[0]:spec.engines===2?[-span*.26,span*.26]:spec.engines===3?[-span*.28,span*.28,0]:[-span*.35,-span*.20,span*.20,span*.35];
 for(let x of enginePts){let isJet=spec.engines>=3,engineZ=isJet?-len*.1:len*.05,engineY=isJet?-.15:.2;
 if(spec.engines===1){cylinder(out,x,engineY+1.22,len*.49,bodyW*.52,bodyW*.44,len*.22,'#dfe4e6','#bdc9d0','z',10)}
 else cylinder(out,x,engineY,engineZ,isJet?bodyW*.50:1.75,isJet?bodyW*.45:1.55,isJet?len*.23:len*.16,'#d7e4e8','#a1b6c5','z',10);
 if(!isJet){let az=spec.engines===1?len*.60:engineZ+len*.095;for(let a=0;a<3;a++){let angle=a*PI/3;let r=spec.engines===1?3.7:2.8;addQuad(out,V(x+Math.cos(angle)*r,engineY+Math.sin(angle)*r,az),V(x-Math.cos(angle)*r,engineY-Math.sin(angle)*r,az),V(x-Math.cos(angle)*r*.7,engineY-Math.sin(angle)*r*.7,az+.45),V(x+Math.cos(angle)*r*.7,engineY+Math.sin(angle)*r*.7,az+.45),'#324d62')}}
 else {const rad=bodyW*.46;out.push({a:V(x-rad,engineY,engineZ+len*.13),b:V(x,engineY+rad,engineZ+len*.13),c:V(x+rad,engineY,engineZ+len*.13),color:'#26445d',alpha:1})}
 }
 // Wheels + struts are in the model; hidden when gear is up via a mesh flag.
 let gear=[];for(let gx of [-span*.16,span*.16]){boxMesh(gear,gx,-1.45,-len*.05,.6,3,.65,'#8a9cab');cylinder(gear,gx,-3,-len*.05,1.45,1.45,1.45,'#1b293c','#26384a','x',9)}
 boxMesh(gear,0,-1.35,len*.35,.45,2.5,.65,'#9db1b9');cylinder(gear,0,-2.8,len*.35,1.07,1.07,1.1,'#172336','#2c3e50','x',9);
 return {body:out,gear};}
// V7: AI air traffic has actual 3D aircraft meshes, positions, labels and radar contacts.
const aiColors=[['#fff4d2','#ff754a'],['#d5eaff','#247fe8'],['#f9efff','#9d66f7'],['#e3fff4','#18bd8e'],['#fff2fb','#e85d9d'],['#ffe7bd','#e29a2c']];
const aiModels=aiColors.map(([paint,stripe],i)=>planeMesh({...planes[i%planes.length],paint,stripe}));
const trafficNames=['SUNBIRD 21','BLUEWING 08','SKYLINE 74','WANDERER 33','NORTHSTAR 12','TAXI 06'];
let trafficClock=0,trafficSpotUntil=0;
function aiTraffic(){
 const {is:ap,d}=nearestIsland(state.pos),contacts=[];
 if(d<2600){
   // Place the first plane in front of the starting runway; all aircraft MOVE.
   const specs=[
    {radius:390,phase:1.34,alt:175,rate:.055},
    {radius:590,phase:2.2,alt:260,rate:-.036},
    {radius:780,phase:.55,alt:350,rate:.028},
    {radius:980,phase:3.9,alt:210,rate:-.026},
    {radius:1050,phase:4.95,alt:300,rate:.024}
   ];
   specs.forEach((spec,i)=>{
    const a=spec.phase+trafficClock*spec.rate;
    const x=ap.x+Math.cos(a)*spec.radius,z=ap.z+Math.sin(a)*spec.radius;
    let heading=Math.atan2(-Math.sin(a)*spec.rate,Math.cos(a)*spec.rate);
    // heading follows a clockwise/counter-clockwise circular airport circuit.
    contacts.push({id:'traffic'+i,name:trafficNames[i],pos:V(x,Math.max(spec.alt,terrainHeight(x,z)+85),z),heading,bank:spec.rate>0?-.10:.10,model:i,scale:1.7,kind:'TRAFFIC'});
   });
   // An additional plane taxiing on the apron is easy to notice from the runway.
   const tx=ap.x+135,tz=ap.z-50+Math.sin(trafficClock*.032)*145;
   contacts.push({id:'taxi',name:trafficNames[5],pos:V(tx,terrainHeight(tx,tz)+17,tz),heading:Math.cos(trafficClock*.032)>=0?0:PI,bank:0,model:5,scale:1.45,kind:'TAXI'});
 }else{
   // Encounter en-route traffic even on long 30-minute flights away from airports.
   const f=V(Math.sin(state.heading),0,Math.cos(state.heading)),r=V(Math.cos(state.heading),0,-Math.sin(state.heading));
   const a=[{forward:550,side:150,alt:80},{forward:870,side:-260,alt:150},{forward:1220,side:340,alt:30}];
   a.forEach((v,i)=>{
    const drift=Math.sin(trafficClock*.14+i*2.1)*75;
    const x=state.pos.x+f.x*v.forward+r.x*(v.side+drift),z=state.pos.z+f.z*v.forward+r.z*(v.side+drift);
    contacts.push({id:'cruise'+i,name:trafficNames[i+1],pos:V(x,Math.max(terrainHeight(x,z)+100,state.pos.y+v.alt),z),heading:state.heading+Math.sin(trafficClock*.07+i)*.21,bank:.04,model:i+1,scale:1.8,kind:'AIRLINER'});
   });
 }
 return contacts;
}
function raceTraffic(){
 if(!race.active)return [];
 return race.ai.map((bot,i)=>{
  const t=clamp(bot.progress,0,raceRings.length-1.001),idx=Math.min(Math.floor(t),raceRings.length-2),q=t-idx;
  const prev=idx===0?raceStart:raceRings[idx-1],a=raceRings[idx],b=raceRings[idx+1];
  const heading=courseBearing(prev,b),side=(i-1)*31;
  return {id:'racer'+i,name:bot.name.toUpperCase(),pos:V(mix(a.x,b.x,q)+Math.cos(heading)*side,mix(a.y,b.y,q)+i*8-8,mix(a.z,b.z,q)-Math.sin(heading)*side),heading,bank:(i-1)*.13,model:i+1,scale:1.6,kind:'RACER'};
 });
}
function aiPlanes(){return [...aiTraffic(),...raceTraffic(),...remotePlayers()]}
function transformAI(p,ai){
 const sc=ai.scale||1.5,x=p.x*sc,y=p.y*sc,z=p.z*sc;
 const c=Math.cos(ai.bank||0),b=Math.sin(ai.bank||0);
 const xx=x*c-y*b,yy=x*b+y*c,h=ai.heading;
 return V(ai.pos.x+xx*Math.cos(h)+z*Math.sin(h),ai.pos.y+yy,ai.pos.z-xx*Math.sin(h)+z*Math.cos(h));
}
function addVisibleAI3D(){
 for(const ai of aiPlanes()){
  if(d2(state.pos,ai.pos)>3600)continue;
  const faces=aiModels[ai.model%aiModels.length].body;
  for(const f of faces)drawFace({a:transformAI(f.a,ai),b:transformAI(f.b,ai),c:transformAI(f.c,ai),color:f.color,layer:1.55});
 }
}
function drawAIIdentification(){
 const contacts=aiPlanes();
 for(const ai of contacts){
  const d=d2(state.pos,ai.pos);if(d>3400)continue;
  const pr=project(V(ai.pos.x,ai.pos.y+27*ai.scale,ai.pos.z));
  if(!pr||pr.z>3400||pr.x<18||pr.x>W-18||pr.y<65||pr.y>H-45)continue;
  const label=ai.kind==='RACER'?'🏁':ai.kind==='FRIEND'?'👥':'✈';
  const text=label+' '+ai.name+' · '+(d/1000).toFixed(1)+' km';
  ctx.save();ctx.textAlign='center';ctx.font='bold 12px system-ui';
  const tw=ctx.measureText(text).width;
  ctx.fillStyle=ai.kind==='RACER'?'rgba(66,30,87,.9)':ai.kind==='FRIEND'?'rgba(19,84,61,.92)':'rgba(5,38,69,.86)';
  ctx.strokeStyle=ai.kind==='RACER'?'#ffc475':'#61dafa';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(pr.x-tw/2-9,pr.y-20,tw+18,23,5);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.fillText(text,pr.x,pr.y-4);
  // Flashing wing light makes even distant planes easier to spot.
  const light=project(V(ai.pos.x,ai.pos.y,ai.pos.z));
  if(light&&light.z<3400){ctx.fillStyle=(Math.floor(trafficClock*2)%2===0)?'#fff8cc':'#ff8b6c';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=13;ctx.beginPath();ctx.arc(light.x,light.y,clamp(850/light.z,2.3,5),0,TAU);ctx.fill();}
  ctx.restore();
 }
}
function spotNearestAI(){
 if(trafficSpotUntil>performance.now()){trafficSpotUntil=0;setToast('Normal camera restored.',2);return}
 trafficSpotUntil=performance.now()+10000;
 if(skyTask?.kind==='spot'&&aiPlanes().some(ai=>d2(state.pos,ai.pos)<3500))skyComplete();
 else setToast('✈ CAMERA TRACKING AI — press V again to return, or wait 10 seconds.',5);
}
const planeModels=planes.map(planeMesh);function applyPaint(){planeModels.forEach((m,i)=>{m.body.forEach(f=>{if(f.defaultColor===undefined)f.defaultColor=f.color;f.color=f.defaultColor===planes[i].paint?COLORS[profile.paint]:f.defaultColor===planes[i].stripe?(profile.paint===0?planes[i].stripe:COLORS[(profile.paint+2)%COLORS.length]):f.defaultColor})})}applyPaint();
function transPlane(p){let x=p.x,y=p.y,z=p.z,cB=Math.cos(state.bank),sB=Math.sin(state.bank);let xx=x*cB-y*sB,yy=x*sB+y*cB;let cP=Math.cos(state.pitch),sP=Math.sin(state.pitch),y2=yy*cP+z*sP,z2=-yy*sP+z*cP;let h=state.heading;return V(state.pos.x+xx*Math.cos(h)+z2*Math.sin(h),state.pos.y+y2,state.pos.z-xx*Math.sin(h)+z2*Math.cos(h))}
function setCamera(dt){let f=V(Math.sin(state.heading),0,Math.cos(state.heading));let tgt=add(state.pos,add(mul(f,90),V(0,18+Math.sin(state.pitch)*22,0)));
 let desired=add(state.pos,add(mul(f,state.cam===0?-104:state.cam===1?-255:-22),V(0,state.cam===0?40:state.cam===1?90:12,0)));
 if(state.cam===2){desired=add(state.pos,add(mul(f,12),V(0,6,0)));tgt=add(state.pos,add(mul(f,420),V(0,18,0)))}
 camPos=add(camPos,mul(sub(desired,camPos),clamp(dt*4,0,1)));
 if(trafficSpotUntil>performance.now()){
  const candidates=aiPlanes().filter(ai=>d2(state.pos,ai.pos)<3500).sort((a,b)=>d2(a.pos,state.pos)-d2(b.pos,state.pos));
  if(candidates.length){tgt=candidates[0].pos;desired=add(state.pos,add(mul(f,-110),V(0,48,0)));camPos=add(camPos,mul(sub(desired,camPos),clamp(dt*4,0,1)));}
 }
 camForward=norm(sub(tgt,camPos));camRight=norm(cross(V(0,1,0),camForward));camUp=norm(cross(camForward,camRight));
 let roll=state.bank*(state.cam===2?.5:.17);let rr=add(mul(camRight,Math.cos(roll)),mul(camUp,Math.sin(roll)));let uu=add(mul(camUp,Math.cos(roll)),mul(camRight,-Math.sin(roll)));camRight=rr;camUp=uu;}
function project(p){let d=sub(p,camPos),z=dot(d,camForward);if(z<2.5)return null;return {x:W*.5+focal*dot(d,camRight)/z,y:H*.5-focal*dot(d,camUp)/z,z};}
let renderFaces=[];
function drawFace(face){if(!face||!face.a||!face.b||!face.c)return;let a=project(face.a),b=project(face.b),c=project(face.c);if(!a||!b||!c)return;
 let minX=Math.min(a.x,b.x,c.x),maxX=Math.max(a.x,b.x,c.x),minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y);
 if(maxX<0||minX>W||maxY<0||minY>H)return;
 renderFaces.push({a,b,c,depth:(a.z+b.z+c.z)/3,color:face.color,alpha:face.alpha||1,layer:face.layer||0});}
function drawWorld(){let horizon=H*.5+focal*camForward.y,sky=ctx.createLinearGradient(0,0,0,Math.max(H*.9,horizon+190));sky.addColorStop(0,'#4ca3f4');sky.addColorStop(.52,'#89ccf8');sky.addColorStop(1,'#d6edfc');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 let sea=ctx.createLinearGradient(0,Math.max(0,horizon),0,H);sea.addColorStop(0,'#75c7d3');sea.addColorStop(.22,'#1998bc');sea.addColorStop(1,'#08739f');ctx.fillStyle=sea;ctx.fillRect(0,clamp(horizon,0,H),W,H);if(isUSLand(state.pos.x,state.pos.z)){ctx.fillStyle=groundColor(state.pos.x,state.pos.z);ctx.fillRect(0,clamp(horizon,0,H),W,H);}
 // Time-of-day sky objects: sunrise / stars and moon. Ground tint handled later.
 const darkness=nightAmount();ctx.save();
 if(darkness>.15){ctx.fillStyle=`rgba(8,14,42,${darkness*.70})`;ctx.fillRect(0,0,W,Math.max(0,horizon));for(let k=0;k<95;k++){let px=(hash2(k,19)*W+Math.sin(now*.006+k)*4)%W,py=hash2(k+77,9)*Math.max(50,horizon-20);ctx.globalAlpha=darkness*(.25+.7*hash2(k+4,k+13));ctx.fillStyle='#f4f5ff';ctx.fillRect(px,py,1.5,1.5)}}
 let sunX=W*(.73-.35*(dayClock%3600)/3600),sunY=H*.22+Math.cos(dayClock/3600*TAU)*H*.16;
 ctx.globalAlpha=darkness>.5?.65:1;ctx.fillStyle=darkness>.5?'#e3eeff':'#fff2a2';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=darkness>.5?25:55;ctx.beginPath();ctx.arc(sunX,sunY,darkness>.5?17:26,0,TAU);ctx.fill();ctx.restore();
 // Water sparkle and haze lines.
 ctx.save();ctx.globalAlpha=isUSLand(state.pos.x,state.pos.z)?0:.14;ctx.strokeStyle='#cbf8ff';ctx.lineWidth=1;
 for(let j=0;j<35;j++){let yy=horizon+15+j*j*.42+(now*.8+j*13)%15;if(yy<0||yy>H)continue;ctx.beginPath();for(let k=0;k<10;k++){let xx=(k*149+j*53+Math.sin(now*.4+j)*23)%W;ctx.moveTo(xx,yy);ctx.lineTo(xx+13+j*.65,yy+.3)}ctx.stroke()}
 ctx.restore();
 // Fluffy cloud clusters in 3D space.
 for(let k=0;k<clouds.length;k++){let cc=clouds[k],p=project(cc.p);if(!p||p.z>6200||p.x<-270||p.x>W+270||p.y<-100||p.y>H+100)continue;let r=clamp(focal*cc.r/p.z,3,150);ctx.save();ctx.globalAlpha=clamp((6400-p.z)/2500,0,.55);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(p.x,p.y,r*1.5,r*.32,0,0,TAU);ctx.ellipse(p.x-r*.46,p.y-r*.12,r*.68,r*.4,0,0,TAU);ctx.ellipse(p.x+r*.36,p.y-r*.2,r*.73,r*.49,0,0,TAU);ctx.fill();ctx.restore()}
 renderFaces.length=0;makeLandscape();for(const f of renderLand)drawFace(f);for(const f of renderDecor)drawFace(f);
 for(let is of islands){let d=d2(state.pos,is);if(d>6600+is.r)continue;for(let f of is.tri)drawFace(f)}
 // Shadow under plane, fading with altitude.
 const shadow=V(state.pos.x,24.6,state.pos.z),sh=project(shadow);let alt=state.pos.y-27;
 if(sh&&alt<900){let a=clamp(.24-alt/4200,0,.25),r=focal*(planes[planeId].span*1.6)/sh.z;ctx.save();ctx.fillStyle=`rgba(2,29,46,${a})`;ctx.beginPath();ctx.ellipse(sh.x,sh.y,Math.max(3,r),Math.max(1.5,r*.3),0,0,TAU);ctx.fill();ctx.restore()}
 // Camera never intentionally goes inside the plane in cockpit mode.
 for(let is of islands){if(d2(state.pos,is)>6600+is.r)continue;for(let f of is.runway)drawFace({...f,layer:1})}
 addVisibleAI3D();
 if(state.cam!==2){let model=planeModels[planeId];for(let f of model.body)drawFace({a:transPlane(f.a),b:transPlane(f.b),c:transPlane(f.c),color:f.color,alpha:1,layer:2});if(state.gear)for(let f of model.gear)drawFace({a:transPlane(f.a),b:transPlane(f.b),c:transPlane(f.c),color:f.color,alpha:1,layer:2})}
 renderFaces.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);
 for(let f of renderFaces){ctx.globalAlpha=f.alpha;ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo(f.a.x,f.a.y);ctx.lineTo(f.b.x,f.b.y);ctx.lineTo(f.c.x,f.c.y);ctx.closePath();ctx.fill()}
 ctx.globalAlpha=1;
 // Airport lighting and the permanent glowing Florida sky racetrack.
 for(let is of islands){if(d2(state.pos,is)>3500)continue;drawAirportLights(is)}
 if(d2(state.pos,islands[race.course||1])<4800){
   drawRaceTrack();
   if(!race.active) drawRing(racePortal,53,'#33f6ff',true,-1);
 }
 drawAIIdentification();drawLandmarkLabels();
 weatherVisuals();const night=nightAmount();if(night>0){ctx.fillStyle='rgba(2,9,33,'+(night*.66)+')';ctx.fillRect(0,0,W,H)}if(state.cam===2)drawCockpit();
}
const clouds=Array.from({length:52},(_,i)=>({p:V((random()-.5)*27500,260+random()*600,(random()-.5)*27000),r:55+random()*130}));
function drawAirportLights(is){for(let n=-1;n<=1;n+=2)for(let j=-4;j<=4;j++){let p=project(local(is,n*(is.id===0?39:27),25,j*is.runwayLength*.09));if(!p||p.z>1700)continue;let r=clamp(focal*2.2/p.z,1.2,8);ctx.fillStyle='#efffde';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill()}ctx.globalAlpha=1;
 const s=project(V(is.x,60,is.z));if(!s||s.z>2900)return;let fs=clamp(24000/s.z,10,19);ctx.textAlign='center';ctx.font=`900 ${fs}px system-ui`;ctx.lineWidth=3;ctx.strokeStyle='#114b67';ctx.fillStyle='#fff';ctx.strokeText(is.emoji+' '+is.name.toUpperCase(),s.x,s.y);ctx.fillText(is.emoji+' '+is.name.toUpperCase(),s.x,s.y)}
function drawRing(pos,r,color,visible,index){
 if(!visible)return;
 let center=project(pos);if(!center||center.z>4100)return;
 let heading=0;
 if(index>=0){let prev=index===0?raceStart:raceRings[index-1],next=raceRings[Math.min(raceRings.length-1,index+1)];heading=Math.atan2(next.x-prev.x,next.z-prev.z)}
 let right=V(Math.cos(heading),0,-Math.sin(heading)),points=[];
 for(let k=0;k<=48;k++){let a=k/48*TAU,p=add(pos,add(mul(right,Math.cos(a)*r),V(0,Math.sin(a)*r,0))),q=project(p);if(!q)return;points.push(q)}
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=23;
 ctx.lineWidth=clamp(focal*6/center.z,3.5,17);ctx.beginPath();points.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
 ctx.shadowBlur=0;ctx.lineWidth=2.1;ctx.strokeStyle='#faffff';ctx.stroke();ctx.restore();
 ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#123448';ctx.fillStyle='#fff';
 if(index>=0){ctx.font='900 '+clamp(focal*20/center.z,12,24)+'px system-ui';ctx.strokeText(String(index+1),center.x,center.y+6);ctx.fillText(String(index+1),center.x,center.y+6)}
 else{ctx.font='900 '+clamp(focal*17/center.z,11,20)+'px system-ui';let y=center.y-r*focal/center.z-15;ctx.strokeText('🏁 PRESS R FOR RACES',center.x,y);ctx.fillText('🏁 PRESS R FOR RACES',center.x,y)}
}
function drawRaceTrack(){
 // Guide line between gates makes the ring course easy to spot from the air.
 ctx.save();ctx.strokeStyle=race.active?'#ffdb77bb':'#58ecf37c';ctx.lineWidth=3;ctx.setLineDash([9,12]);ctx.beginPath();
 let start=project(raceStart);if(start)ctx.moveTo(start.x,start.y);
 for(let p of raceRings){let q=project(p);if(q){if(start)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);start=q}else start=null}
 ctx.stroke();ctx.setLineDash([]);ctx.restore();
 raceRings.forEach((p,i)=>{
   let c=race.active?(i<race.next?'#6b9ab4':i===race.next?'#ffde4e':'#50d8ef'):'#3be3f3';
   drawRing(p,59,c,true,i);
 });
}
function drawLandmarkLabels(){for(const lm of landmarks){let d=Math.hypot(state.pos.x-lm.x,state.pos.z-lm.z);if(d>4600)continue;let q=project(V(lm.x,terrainHeight(lm.x,lm.z)+270,lm.z));if(!q||q.z>4600||q.x<70||q.x>W-70||q.y<80||q.y>H-90)continue;ctx.save();ctx.textAlign='center';ctx.font='900 13px system-ui';ctx.strokeStyle='#19344f';ctx.lineWidth=4;ctx.fillStyle='#fef6c3';ctx.strokeText('⭐ '+lm.name,q.x,q.y);ctx.fillText('⭐ '+lm.name,q.x,q.y);ctx.restore()}}
function drawCockpit(){
 ctx.save();
 const compact=W<650, sz=compact?Math.min(W*.95,370):Math.min(W*.70,640),mid=W*.5,bottom=H-6;
 ctx.fillStyle='#0e2437e8';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H*.89);ctx.quadraticCurveTo(W*.5,H*.72,W,H*.89);ctx.lineTo(W,H);ctx.fill();
 // An actual moving artificial horizon, with roll, pitch ladder, heading bug and vertical speed.
 const r=compact?37:55,cx=mid-(compact?55:110),cy=bottom-(compact?48:76);
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();ctx.translate(cx,cy);ctx.rotate(-state.bank);
 const py=clamp(state.pitch*180,-r*1.2,r*1.2);
 ctx.fillStyle='#5da9c7';ctx.fillRect(-2*r,-2*r+py,4*r,2*r);
 ctx.fillStyle='#9e6743';ctx.fillRect(-2*r,py,4*r,2*r);
 ctx.strokeStyle='#faf7cf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r*2,py);ctx.lineTo(r*2,py);ctx.stroke();
 for(const degrees of [-20,-10,10,20]){let off=py-degrees*1.3;if(Math.abs(off)>r*.92)continue;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r*.34,off);ctx.lineTo(r*.34,off);ctx.stroke()}
 ctx.restore();ctx.strokeStyle='#e5f8ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();
 ctx.strokeStyle='#ffe3a6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-r*.5,cy);ctx.lineTo(cx-r*.16,cy);ctx.lineTo(cx,cy+6);ctx.lineTo(cx+r*.16,cy);ctx.lineTo(cx+r*.5,cy);ctx.stroke();
 const rows=compact?3:4;const tx=mid+(compact?12:20),ty=bottom-(compact?81:120);const lh=compact?17:23;
 ctx.textAlign='left';ctx.font=(compact?'bold 11px':'bold 15px')+' ui-monospace,monospace';
 ctx.fillStyle='#a8e9f5';ctx.fillText('IAS  '+fmt(state.speed*1.94)+' kt',tx,ty+lh);
 ctx.fillText('ALT  '+fmt(Math.max(0,state.pos.y-29)*3.281)+' ft',tx,ty+lh*2);
 ctx.fillStyle=state.stall?'#ffc259':'#a8f5b7';ctx.fillText('V/S  '+(state.vspeed>=0?'+':'')+fmt(state.vspeed*196.85),tx,ty+lh*3);
 if(rows===4){ctx.fillStyle='#f4e6ad';ctx.fillText('HDG  '+String(Math.round(deg(state.heading))).padStart(3,'0')+'°',tx,ty+lh*4)}
 ctx.restore();
}

function runwayOffset(is,p){let dx=p.x-is.x,dz=p.z-is.z,c=Math.cos(is.heading),s=Math.sin(is.heading);return {x:dx*c-dz*s,z:dx*s+dz*c}}
function airportAt(p,range=1){let selected=null,dist0=Infinity;for(const is of islands){if(Math.abs(is.x-p.x)>950||Math.abs(is.z-p.z)>950)continue;let q=runwayOffset(is,p),width=is.id===0?77:52;if(Math.abs(q.x)<width*range&&Math.abs(q.z)<is.runwayLength*.53*range){let dd=d2(is,p);if(dd<dist0){selected=is;dist0=dd}}}return selected}
function nearestIsland(p){let best=islands[0],bestD=Infinity;for(let is of islands){let dd=d2(is,p);if(dd<bestD){best=is;bestD=dd}}return {is:best,d:bestD}}
function courseBearing(a,b){return Math.atan2(b.x-a.x,b.z-a.z)}
function setToast(message,seconds=3.4){$('toast').textContent=message;$('toast').classList.add('show');shownToastUntil=performance.now()+seconds*1000}
function jobReward(from,to,kind=mission.kind){const rate=kind==='rescue'?1.55:kind==='passenger'?1.28:1;return Math.round(Math.min(12500,(200+d2(islands[from],islands[to])/1000*4.5)*rate*(1+profile.upgrades.cargo*.14))/10)*10}
function getMissionType(){return mission.to===null?'CHOOSE ROUTE':mission.kind==='rescue'?'RESCUE':mission.kind==='passenger'?'PASSENGERS':'CARGO'}
function missionList(){
 let from=state.onGround?nearestIsland(state.pos).is.id:state.currentIsland;
 let available=islands.filter(i=>i.id!==from).sort((a,b)=>d2(a,islands[from])-d2(b,islands[from]));
 // Always three options: short, medium, long flights with different rewards.
 return [available[0],available[Math.floor(available.length*.42)],available[available.length-1]].filter(Boolean);
}
function assignMission(to,kind='cargo'){let from=state.onGround?nearestIsland(state.pos).is.id:state.currentIsland;if(from===to){setToast('Choose a different destination.');return}mission={from,to,visited:false,kind};setToast('📦 '+kind.toUpperCase()+' mission: '+islands[to].name);closeModal();updateHUD()}
// Worldwide route selection. Picking a departure airport deliberately relocates the
// player's plane; race/challenge return points still use the original snapshot system.
let expressCruise=0;
const CRUISE_FACTORS=[1,10,30];
let radarRangeIndex=1;
const RADAR_RANGES=[9e3,45e3,180e3,650e3];
function cruiseLabel(){return ['NORMAL','FAST ×10','EXPRESS ×30'][expressCruise]}
function cycleCruise(){if(race.active||emergency.active){setToast('Fast travel is unavailable during challenges.');return}
 expressCruise=(expressCruise+1)%3;setToast('🚀 '+cruiseLabel()+' · Quick Cruise follows your selected route. Press K to change.',4);updateTravelHUD();}
function updateTravelHUD(){const c=$('cruiseToggle');if(c){c.textContent='🚀 '+cruiseLabel()+' · K';c.classList.toggle('cruiseOn',expressCruise>0)}}
function cycleRadar(dir){radarRangeIndex=dir===0?(radarRangeIndex+1)%RADAR_RANGES.length:clamp(radarRangeIndex+dir,0,RADAR_RANGES.length-1);drawRadar()}
function countryOptions(selected){return countryAirportIds.map(id=>`<option value="${id}" ${id===selected?'selected':''}>${id===0?'United States':islands[id].name} — ${id===0?'Maryland':islands[id].city||'Airport'}</option>`).join('')}
function beginWorldRoute(from,to,kind='passenger'){
 if(!stateValid(from)||!stateValid(to)||from===to){setToast('Choose two different countries.');return}
 const dep=islands[from],arrival=islands[to];
 // Selecting an international departure is an explicit travel choice, not an activity.
 if(race.active||emergency.active)returnToFlight('↩ Returned to your flight before selecting a route.');
 state.pos=local(dep,0,29,-dep.runwayLength*.34);state.prevPos=V(state.pos.x,state.pos.y,state.pos.z);state.heading=0;state.pitch=0;state.bank=0;state.speed=0;state.throttle=0;state.gear=true;state.onGround=true;state.currentIsland=from;state.brake=true;state.vspeed=0;state.flaps=0;state.trim=0;state.stall=false;state.autopilot=false;
 camPos=add(state.pos,V(0,45,-130));mission={from,to,kind,visited:false};expressCruise=2;updateTravelHUD();closeModal();persist();updateHUD();
 setToast('🌍 '+dep.name+' → '+arrival.name+'! Take off, then EXPRESS ×30 follows the route. Switch with K.',7)
}
function tickExpress(dt){
 if(expressCruise===0||mission.to===null||race.active||emergency.active||state.onGround)return;
 const to=islands[mission.to];if(!to)return;
 const dx=to.x-state.pos.x,dz=to.z-state.pos.z,dis=Math.hypot(dx,dz);
 if(dis<2600){expressCruise=0;state.speed=Math.min(state.speed,planes[planeId].cruise);state.throttle=.42;state.pos.y=Math.min(state.pos.y,230);state.heading=Math.atan2(dx,dz);updateTravelHUD();setToast('🛬 Arriving at '+to.name+' — EXPRESS CRUISE OFF. Lower gear, control speed and land!',7);return}
 const bearing=Math.atan2(dx,dz),boosted=Math.max(planes[planeId].cruise,state.speed)*(CRUISE_FACTORS[expressCruise]-1)*dt;
 const advance=Math.min(boosted,Math.max(0,dis-2600));state.pos.x+=dx/dis*advance;state.pos.z+=dz/dis*advance;
 state.heading=bearing;state.bank=0;state.pitch=0;state.pos.y=mix(state.pos.y,850,clamp(dt*1.5,0,1));
}
function rememberFlight(){
 if(eventReturn) return; // Avoid overwriting the original return point on nested menus.
 eventReturn={expressCruise,state:{...state,pos:V(state.pos.x,state.pos.y,state.pos.z),prevPos:V(state.prevPos.x,state.prevPos.y,state.prevPos.z)},atcClearance,weatherIndex,weatherElapsed};
}
function updateReturnButton(){
 const button=$('returnFlight');
 if(!button)return;
 const active=race.active||emergency.active;
 button.classList.toggle('hidden',!active);
 button.textContent=race.active?'↩ EXIT RACE · RETURN TO FLIGHT':'↩ EXIT CHALLENGE · RETURN TO FLIGHT';
}
function returnToFlight(message='↩ Back to exactly where you were flying!'){
 const returnPoint=eventReturn;
 // Clear the activity first, before restoring position, so the next frame
 // runs ordinary flight physics and not the challenge's physics.
 race.active=false;race.course=1;race.next=0;race.ai=[];moveRaceCourse(1);
 emergency.active=false;
 $('raceHud').classList.add('hidden');
 if(returnPoint){
  Object.assign(state,returnPoint.state);
  state.pos=V(returnPoint.state.pos.x,returnPoint.state.pos.y,returnPoint.state.pos.z);
  state.prevPos=V(returnPoint.state.prevPos.x,returnPoint.state.prevPos.y,returnPoint.state.prevPos.z);
  expressCruise=returnPoint.expressCruise||0;updateTravelHUD();atcClearance=returnPoint.atcClearance;
  weatherIndex=returnPoint.weatherIndex;weatherElapsed=returnPoint.weatherElapsed;
  eventReturn=null;
  trafficSpotUntil=0;keys.clear();
  // Snap the chase camera to the restored airplane, not the race airport.
  const f=V(Math.sin(state.heading),0,Math.cos(state.heading));
  camPos=add(state.pos,add(mul(f,state.cam===1?-255:state.cam===2?12:-104),V(0,state.cam===1?90:state.cam===2?6:40,0)));
 }
 portalReady=false; // Prevent retriggering a portal we just restored inside.
 updateReturnButton();
 updateWeatherHUD();updateHUD();
 setToast(message,6);
}
function landingQuality(){
 // Smooth, centered approaches score highest. Designed to be achievable in a trainer.
 const ideal=Math.min(42,planes[planeId].max*.54);
 return Math.round(clamp(100-Math.abs(state.speed-ideal)*1.05-Math.abs(state.pitch)*135-Math.abs(state.bank)*95-(profile.simMode?Math.max(0,Math.abs(state.landingVSpeed)-3)*3.4:0)-(atcClearance?0:5),0,100));
}
function afterLanding(is){
 const score=landingQuality();
 // Landing challenges are simulations: award their result, then restore the
 // exact previous flight. Do NOT stamp the practice airport, complete an
 // unrelated delivery, or change the last real airport.
 if(emergency.active){
  const condition=emergency.condition;
  const success=is.id===emergency.airport;
  if(success){
   profile.cash+=1100+(score>=90?250:0);
   profile.xp+=380+(score>=90?75:0);
   profile.landings++;profile.goodLandings++;
   profile.bestLanding=Math.max(profile.bestLanding,score);
   if(score>=98)profile.perfectLandings++;
  }
  persist();
  returnToFlight(success?'🏅 '+condition.toUpperCase()+' CHALLENGE COMPLETE! Landing '+score+'/100 · Back to your flight.':'🛬 Wrong airport — returned to your original flight.');
  return;
 }
 state.onGround=true;state.pos.y=29;state.pitch=0;state.bank=0;state.vspeed=0;state.stall=false;state.autopilot=false;state.throttle=Math.min(state.throttle,.2);state.speed=Math.min(state.speed,24);state.currentIsland=is.id;
 profile.landings++;profile.xp+=35;profile.goodLandings++;
 profile.bestLanding=Math.max(profile.bestLanding,score);
 if(score>=98)profile.perfectLandings++;
 const scoreBonus=score>=90?250:0;
 if(scoreBonus){profile.cash+=scoreBonus;profile.xp+=75;}
 let message='🛬 Landing '+score+'/100 at '+is.name+(scoreBonus?' · Smooth-landing bonus +$250 +75 XP!':' · +35 XP');
 if(!profile.visited.includes(is.id)){profile.visited.push(is.id);profile.cash+=500;profile.xp+=200;message+=' · 🌎 New airport stamp +$500!'}
 if(atcClearance){profile.cash+=90;profile.xp+=25;atcClearance=false;}
 if(mission.to===is.id&&mission.from!==is.id){let reward=jobReward(mission.from,mission.to),exp=Math.round(reward*.34);profile.cash+=reward;profile.xp+=exp;message+=' · ✅ '+mission.kind.toUpperCase()+' +$'+fmt(reward);mission={from:is.id,to:null,visited:false,kind:'cargo'}}
 checkRarePlanes();persist();setToast(message,7);
}

function startRace(id=1){if(race.active){setToast('Already racing!');return}if(pilotLevel()<(raceCourses.find(c=>c.id===id)?.unlock||1)){setToast('🔒 Gain more pilot XP to unlock this race.');return}if(emergency.active)returnToFlight('Challenge ended. Starting race!');rememberFlight();portalReady=false;moveRaceCourse(id);
 closeModal();
 race={active:true,time:0,next:0,ai:[{name:'Maverick',progress:0,rate:.172},{name:'Sky Fox',progress:0,rate:.155},{name:'Ace',progress:0,rate:.183}],start:performance.now(),course:id};
 state.onGround=false;state.pos=V(raceStart.x,raceStart.y,raceStart.z);state.heading=courseBearing(state.pos,raceRings[0]);
 state.pitch=.04;state.bank=0;state.vspeed=0;state.speed=Math.max(58,Math.min(state.speed,92));state.throttle=Math.max(state.throttle,.78);state.gear=false;
 updateReturnButton();setToast('🏁 '+islands[id].name.toUpperCase()+' RACE! Clear 9 rings, then return to your previous flight.',5);
}
function finishRace(){let rank=1+race.ai.filter(ai=>ai.progress>=raceRings.length-1).length;let prize=rank===1?2200:rank===2?1100:rank===3?650:300;let xp=rank===1?360:190;
 profile.cash+=prize;profile.xp+=xp;
 profile.raceBest[race.course]=!profile.raceBest[race.course]||race.time<profile.raceBest[race.course]?race.time:profile.raceBest[race.course];
 if(rank===1){profile.wins++;profile.raceWins[race.course]=(profile.raceWins[race.course]||0)+1;
 if(raceCourses.every(c=>profile.raceWins[c.id]>0)&&!profile.championClaimed){profile.championClaimed=true;profile.cash+=7500;profile.xp+=1400;setToast('🏆 NATIONAL RACING CHAMPION! +$7,500 +1,400 XP',8)}}
 checkRarePlanes();persist();returnToFlight('🏆 FINISH! Place #'+rank+' · +$'+fmt(prize)+' · '+xp+' XP · Returned to your flight!');}

// Thirty minutes of daylight followed by thirty minutes of night, while flying.
const DAY_PHASE_SECONDS=1800;
let dayClock=0;
function tickDayNight(dt){const before=Math.floor(dayClock/DAY_PHASE_SECONDS);dayClock+=dt;const after=Math.floor(dayClock/DAY_PHASE_SECONDS);if(after!==before)setToast(after%2?'🌙 Night has fallen — watch the runway lights!':'☀️ Sunrise — daytime flying!',6)}
function nightAmount(){const phase=dayClock%3600;const edge=110;return phase<1800?clamp((phase-1800+edge)/edge,0,1):clamp((3600-phase)/edge,0,1)}
function updateDayHUD(){const night=Math.floor(dayClock/1800)%2===1;const remain=1800-dayClock%1800;const el=$('dayTimer');if(el)el.textContent=(night?'🌙 NIGHT':'☀️ DAY')+' · '+Math.floor(remain/60)+':'+String(Math.floor(remain%60)).padStart(2,'0')}
// Five-minute in-game weather cycle. Weather never causes engine failures.
const WEATHER_DURATION=300;
const WEATHER_TYPES=[
 {name:'CLEAR SKIES',icon:'☀️',info:'Easy flying · Calm winds',wind:0,gust:0,turn:1,visibility:1,cloud:0},
 {name:'PARTLY CLOUDY',icon:'⛅',info:'Easy flying · Light breeze',wind:1.1,gust:.18,turn:.98,visibility:.96,cloud:.18},
 {name:'WINDY',icon:'💨',info:'Harder flying · Crosswinds',wind:6.5,gust:.85,turn:.9,visibility:.95,cloud:.12},
 {name:'RAIN SHOWERS',icon:'🌧️',info:'Harder flying · Rain and gusts',wind:4.4,gust:.8,turn:.92,visibility:.78,cloud:.38,rain:1},
 {name:'FOGGY',icon:'🌫️',info:'Harder landings · Low visibility',wind:.9,gust:.1,turn:.97,visibility:.52,cloud:.45,fog:1},
 {name:'STORMY',icon:'⛈️',info:'Expert flying · Strong turbulence',wind:8,gust:1.45,turn:.83,visibility:.65,cloud:.6,rain:1.5}
];
let weatherIndex=0,weatherElapsed=0,weatherChanges=0;
function currentWeather(){return WEATHER_TYPES[weatherIndex]}
function changeWeather(){weatherIndex=Math.floor(Math.random()*WEATHER_TYPES.length);weatherChanges++;setToast(currentWeather().icon+' Weather changed: '+currentWeather().name+' — '+currentWeather().info,6)}
function tickWeather(dt){weatherElapsed+=dt;if(weatherElapsed>=WEATHER_DURATION){weatherElapsed-=WEATHER_DURATION;changeWeather()}}
function weatherVisuals(){const w=currentWeather();if(w.visibility===1)return;
 ctx.save();const darkness=(1-w.visibility)*.35;ctx.fillStyle='rgba(17,38,64,'+darkness+')';ctx.fillRect(0,0,W,H);
 if(w.fog){let fog=ctx.createLinearGradient(0,H*.18,0,H);fog.addColorStop(0,'rgba(220,232,239,.06)');fog.addColorStop(.55,'rgba(218,230,237,.44)');fog.addColorStop(1,'rgba(220,230,235,.68)');ctx.fillStyle=fog;ctx.fillRect(0,0,W,H)}
 if(w.rain){ctx.strokeStyle='rgba(209,231,251,.5)';ctx.lineWidth=1.3;const count=Math.floor(65*w.rain);for(let i=0;i<count;i++){let x=((i*137.31+now*170)% (W+80))-40,y=((i*79.13+now*360)%(H+100))-50;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-8*w.rain,y+18*w.rain);ctx.stroke()}}
 ctx.restore()}
function updateWeatherHUD(){let w=currentWeather(),seconds=Math.max(0,Math.ceil(WEATHER_DURATION-weatherElapsed));$('weatherIcon').textContent=w.icon;$('weatherName').textContent=w.name;$('weatherEffect').textContent=w.info;$('weatherTimer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');$('weatherFill').style.width=(100*(WEATHER_DURATION-weatherElapsed)/WEATHER_DURATION)+'%'}

// V13: a lightweight, game-scaled aerodynamic simulation. This is not a flight-training tool.
// Airspeed determines whether a wing can support the aircraft. Flaps change stall speed and
// drag; gear increases drag. Pitch trades horizontal speed for climb; trim sets hands-off pitch.
function stallSpeed(config){return config.max*(.35-state.flaps*.035)}
function headingError(target,current){return Math.atan2(Math.sin(target-current),Math.cos(target-current))}
function toggleSimMode(){profile.simMode=!profile.simMode;state.vspeed=0;state.stall=false;state.autopilot=false;persist();updateSimulatorUI();setToast(profile.simMode?'🛩️ SIMULATOR MODE: lift, drag, stalls and flaps active.':'🎮 EASY MODE: forgiving arcade-style handling.',5)}
function cycleFlaps(){state.flaps=(state.flaps+1)%3;state.autopilot=false;setToast('🛬 FLAPS '+['UP','15°','30°'][state.flaps],2);updateSimulatorUI()}
function toggleAutopilot(){
 if(!profile.simMode){setToast('Switch to SIM mode to use the autopilot.');return}
 if(state.onGround||state.stall){setToast('⚠️ Autopilot requires safe airborne flight.');return}
 state.autopilot=!state.autopilot;state.apHeading=state.heading;state.apAltitude=state.pos.y;
 setToast(state.autopilot?'🧭 AUTOPILOT ON · holding current altitude and heading.':'🧭 AUTOPILOT OFF · manual controls.',3);updateSimulatorUI();
}
function adjustTrim(direction){state.trim=clamp(state.trim+direction*.035,-.20,.20);setToast('Elevator trim '+Math.round(state.trim*100)+'%',1.5);updateSimulatorUI()}
function updateSimulatorUI(){
 const mode=$('simModeButton');if(mode){mode.textContent=profile.simMode?'🛩 SIM · 1':'🎮 EASY · 1';mode.classList.toggle('active',profile.simMode)}
 const mobile=$('mobileSim');if(mobile)mobile.textContent=profile.simMode?'🛩 SIM':'🎮 EASY';
 const flapButton=$('mobileFlaps');if(flapButton)flapButton.textContent='🛬 FLAPS '+['0°','15°','30°'][state.flaps];
 const ap=$('mobileAutopilot');if(ap)ap.textContent=state.autopilot?'🧭 AP ON':'🧭 AP OFF';
 const f=$('flapText');if(f)f.textContent=['UP','15°','30°'][state.flaps];
 const tr=$('trimText');if(tr)tr.textContent=Math.round(state.trim*100)+'%';
 const apState=$('autopilotText');if(apState)apState.textContent=state.autopilot?'AP ON':'AP OFF';
 const modeLabel=$('simModeText');if(modeLabel)modeLabel.textContent=profile.simMode?'SIMULATOR':'EASY';
 const vs=$('vsiText');if(vs)vs.textContent=(state.vspeed>=0?'+':'')+fmt(state.vspeed*196.85);
 const air=$('aircraftAlert');if(air){const text=state.stall&&!state.onGround?'⚠️ STALL · LOWER NOSE + POWER':!state.onGround&&state.speed>planes[planeId].max*.94?'⚠️ HIGH AIRSPEED':state.flaps===2&&state.speed>planes[planeId].max*.64?'⚠️ RETRACT FLAPS':'✓ FLIGHT NORMAL';air.textContent=text;air.classList.toggle('warn',text.startsWith('⚠️'))}
}
function simulatorPhysics(dt,config,wx,maxSpeed,pitchInput,yawInput,bankInput){
 if(state.autopilot&&(Math.abs(pitchInput)>0||Math.abs(yawInput)>0||Math.abs(bankInput)>0)){
  state.autopilot=false;setToast('🧭 AP disconnected: manual controls!',2);
 }
 const speed=state.speed;
 const stall=stallSpeed(config);
 // Bank and trim respond smoothly to physical controls.
 let bankTarget=state.autopilot?clamp(headingError(state.apHeading,state.heading)*1.9,-.30,.30):clamp(bankInput*.58+yawInput*.20,-.7,.7);
 state.bank=mix(state.bank,bankTarget,clamp(dt*1.45,0,1));
 const trimPitch=state.trim*.65;
 let targetPitch=state.autopilot?clamp((state.apAltitude-state.pos.y)*.0038,-.20,.20):clamp(pitchInput*.26+trimPitch,-.32,.32);
 state.pitch=mix(state.pitch,targetPitch,clamp(dt*1.3,0,1));
 // Increased bank creates load factor; stalls arrive sooner in steep turns.
 const loadFactor=1+Math.abs(state.bank)*.27;
 state.stall=speed<stall*loadFactor&&state.pos.y>32;
 if(state.stall){state.autopilot=false;state.pitch=mix(state.pitch,-.14,clamp(dt*.7,0,1));}
 // Throttle cannot instantly make the airplane cruise at top speed.
 const engineTarget=state.throttle*maxSpeed;
 const drag=(state.gear?2.8:0)+state.flaps*3.3+Math.abs(state.bank)*4.3+Math.max(0,state.pitch)*14;
 const acceleration=(engineTarget-speed)*.23-drag-(state.brake?13:0);
 state.speed=clamp(speed+acceleration*dt,8,maxSpeed);
 const availableLift=clamp((state.speed/stall-1)*.24,-1.2,.9);
 const liftClimb=Math.sin(state.pitch)*state.speed*.66+availableLift*3.8-Math.abs(state.bank)*2.3;
 const desiredVSpeed=state.stall?-6.7-Math.max(0,stall-state.speed)*1.25:liftClimb;
 state.vspeed=mix(state.vspeed,desiredVSpeed,clamp(dt*.92,0,1));
 state.pos.y+=state.vspeed*dt;
 const steering=(yawInput*.17+Math.sin(state.bank)*.43)*config.turn*wx.turn*(.5+Math.min(1,state.speed/Math.max(1,config.cruise))*.5);
 state.heading+=steering*dt;
 state.heading+=Math.sin(now*.73+weatherChanges*2)*wx.gust*.008*dt;
 if(state.stall&&performance.now()>shownToastUntil)setToast('⚠️ STALL! Lower the nose and add throttle to recover.',2.2);
}
function updatePhysics(dt){state.prevPos=V(state.pos.x,state.pos.y,state.pos.z);let config=planes[planeId];
 const accelerating=keys.has('KeyW'),reducing=keys.has('KeyS');
 if(accelerating)state.throttle=clamp(state.throttle+dt*.42,0,1);
 if(reducing)state.throttle=clamp(state.throttle-dt*.47,0,1);
 state.brake=keys.has('Space');
 const pitchInput=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);
 const yawInput=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
 const bankInput=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
 let maxSpeed=race.active?Math.min(config.max,118):config.max;
 const wx=currentWeather(); // Keep the aircraft engine speed exactly unchanged.
 if(state.onGround){state.stall=false;state.vspeed=0;state.autopilot=false;let acceleration=state.throttle*config.accel*(profile.simMode?1.05:1.75)-state.speed*.065-(state.brake?35:0);
 state.speed=clamp(state.speed+acceleration*dt,0,maxSpeed*.68);
 state.heading+=yawInput*dt*(state.speed>5?.48:.16);
 state.bank=mix(state.bank,0,clamp(dt*4,0,1));state.pitch=0;
 if(pitchInput>0&&state.speed>(profile.simMode?stallSpeed(config)*1.13:config.max*.38)){state.onGround=false;state.pos.y+=3.2;state.pitch=.1;state.speed=Math.max(state.speed,28);state.vspeed=3.5;setToast('🛫 Airborne! Keep your airspeed above the stall speed.',3.1)}
 }else if(profile.simMode){
 simulatorPhysics(dt,config,wx,maxSpeed,pitchInput,yawInput,bankInput);
 }else{
 let targetSpeed=state.throttle*maxSpeed;
 let acceleration=(targetSpeed-state.speed)*.38;
 if(state.brake)acceleration-=15;
 state.speed=clamp(state.speed+acceleration*dt,16,maxSpeed);
 let targetBank=clamp(bankInput*.5+yawInput*.32,-.72,.72);
 state.bank=mix(state.bank,targetBank,clamp(dt*2.2,0,1));
 state.heading+=(yawInput*.48+Math.sin(state.bank)*.46)*config.turn*(1+profile.upgrades.handling*.08)*wx.turn*dt*(.62+state.speed/maxSpeed*.38);
 state.heading+=Math.sin(now*.73+weatherChanges*2)*wx.gust*.008*dt;
 let pitchTarget=clamp(pitchInput*.25,-.28,.36);
 state.pitch=mix(state.pitch,pitchTarget,clamp(dt*1.5,0,1));
 const lift=Math.sin(state.pitch)*state.speed*.74+(state.speed<config.max*.28?-2.2:0);
 state.vspeed=lift;
 state.pos.y+=lift*dt;
 state.stall=false;
 }
 if(!state.onGround){state.pos.x+=(wx.wind*Math.sin(now*.17+.8)+Math.sin(now*2.7)*wx.gust)*dt;state.pos.z+=(wx.wind*Math.cos(now*.19+1.3)+Math.cos(now*2.1)*wx.gust)*dt;state.pos.y+=Math.sin(now*3.1)*wx.gust*.42*dt;}
 state.pos.x+=Math.sin(state.heading)*state.speed*dt;
 state.pos.z+=Math.cos(state.heading)*state.speed*dt;
 state.flightTime+=dt;trafficClock+=dt;
 if(!state.onGround){
 let landing=airportAt(state.pos,1.13),ground=landing?29:nearGroundHeight(state.pos);
 if(state.pos.y<=ground){
 if(landing&&state.gear&&state.speed<Math.max(75,config.max*(.52+profile.upgrades.landing*.07))&&Math.abs(state.pitch)<.25){state.landingVSpeed=state.vspeed;afterLanding(landing)}
 else {state.pos.y=Math.max(ground+4,30);state.pitch=.12;state.vspeed=4;state.speed=Math.max(state.speed*.85,25);if(performance.now()>shownToastUntil)setToast(landing?'⚠️ Slow down and LOWER GEAR to land!':'⚠️ Find an airport runway for a safe landing!',2)}
 }
 }
 state.pos.y=clamp(state.pos.y,1,1600);
 if(race.active){race.time+=dt;for(let ai of race.ai)ai.progress=Math.min(raceRings.length-1,race.time*ai.rate);
 let ring=raceRings[race.next];if(ring){let distance=dist(state.pos,ring);let last=race.next===0?raceStart:raceRings[race.next-1];let dir=norm(sub(ring,last));let forward=V(Math.sin(state.heading),Math.sin(state.pitch),Math.cos(state.heading));if(distance<64&&dot(forward,dir)>.15){race.next++;if(race.next===raceRings.length)finishRace();else setToast('⭕ Ring '+race.next+' / 9 cleared!',1.5)}}
 }
 if(dist(state.pos,racePortal)>110)portalReady=true;
 if(portalReady&&!race.active&&!emergency.active&&!state.onGround&&d2(state.pos,islands[race.course||1])<650&&dist(state.pos,racePortal)<56&&state.speed>22)startRace(race.course||1);
 for(const lm of landmarks){if(!profile.discovered.includes(lm.id)&&Math.hypot(state.pos.x-lm.x,state.pos.z-lm.z)<1700){profile.discovered.push(lm.id);profile.cash+=180;profile.xp+=85;persist();setToast('📍 Landmark discovered: '+lm.name+'! +$180 · +85 XP',5)}}
 if(emergency.active&&state.flightTime>emergency.startTime+240){returnToFlight('⏱️ Landing challenge expired — back to your original flight. Try again!')}
}
function nearGroundHeight(pos){return terrainHeight(pos.x,pos.z)+5}
function atcCall(){let ap=nearestIsland(state.pos).is;atcClearance=true;setToast(state.onGround?'📻 ATC: '+ap.name+' tower — cleared for takeoff!':'📻 ATC: '+ap.name+' tower — cleared to land. Gear down, reduce speed!',5)}
function beginLandingChallenge(cond){closeModal();if(race.active||emergency.active)returnToFlight('Previous event ended.');rememberFlight();const ap=islands[cond==='fog'?0:cond==='wind'?7:6];let start=local(ap,0,245,-1800);
 state.pos=start;state.heading=0;state.pitch=-.09;state.speed=65;state.vspeed=-4;state.throttle=.48;state.gear=true;state.onGround=false;state.currentIsland=ap.id;
 emergency={active:true,airport:ap.id,condition:cond,startTime:state.flightTime};atcClearance=true;race.active=false;
 weatherIndex=cond==='fog'?4:cond==='wind'?2:5;weatherElapsed=0;
 updateReturnButton();setToast('⚠️ CHALLENGE: '+cond.toUpperCase()+'! Land at '+ap.name+'; return to your flight afterward.',6)}
function upgradePrice(key){return 1300*(1+profile.upgrades[key])*(1+profile.upgrades[key])}
function buyUpgrade(key){if(!state.onGround){setToast('Visit an airport hangar to upgrade.');return}if(profile.upgrades[key]>=3){setToast('Already max level!');return}let price=upgradePrice(key);if(profile.cash<price){setToast('Not enough cash for upgrade.');return}profile.cash-=price;profile.upgrades[key]++;persist();showModal('shop');setToast('🔧 Upgrade installed!')}
function changePaint(id){if(!state.onGround){setToast('Land at an airport to customize.');return}profile.paint=id;applyPaint();persist();showModal('shop');setToast('🎨 New airplane paint equipped!')}
function collectStats(){return {stamps:profile.visited.length,total:50,landmarks:profile.discovered.length,allLandmarks:landmarks.length,raceTitles:raceCourses.filter(c=>profile.raceWins[c.id]>0).length}}
function updateHUD(){let level=Math.max(1,Math.floor(Math.sqrt(profile.xp/95))+1),old=95*(level-1)**2,next=95*level**2;
 $('cashText').textContent='$'+fmt(profile.cash);$('levelText').textContent=String(level).padStart(2,'0');$('xpLabel').textContent=fmt(profile.xp-old)+' / '+fmt(next-old)+' XP';$('xpFill').style.width=(100*(profile.xp-old)/(next-old))+'%';
 let hasMission=mission.to!==null,dest=race.active?raceRings[Math.min(race.next,raceRings.length-1)]:emergency.active?islands[emergency.airport]:hasMission?islands[mission.to]:null,current=islands[mission.from];
 let km=dest?dist(state.pos,V(dest.x,dest.y||25,dest.z))/1000:0;
 $('missionName').textContent=race.active?'Race to Ring '+(race.next+1):emergency.active?'Land safely in '+dest.name:hasMission?'Fly to '+dest.name:'Choose one of 3 deliveries';
 $('missionDistance').textContent=dest?km.toFixed(2)+' km remaining':'Open MISSIONS to pick a route';
 $('missionReward').textContent=race.active?'WIN UP TO $2,200':emergency.active?'LANDING BONUS +$1,100':hasMission?'+$'+fmt(jobReward(mission.from,mission.to)):'3 ROUTES AVAILABLE';
 $('missionType').textContent=race.active?'SKY RACE':emergency.active?'WEATHER CHALLENGE':getMissionType();
 let bearing=dest?deg(courseBearing(state.pos,dest)):deg(state.heading);
 $('missionBearing').textContent=dest?'↗ '+String(Math.round(bearing)).padStart(3,'0')+'°':'📦 SELECT';
 $('missionProgress').style.width=dest&&hasMission&&!emergency.active&&!race.active?clamp(100*(1-km/(Math.max(.1,d2(current,islands[mission.to])/1000))),0,100)+'%':'0%';
 $('flightPlane').textContent=planes[planeId].name;
 let status=state.onGround?'ON GROUND':state.pos.y<180?'LOW ALT':'FLYING';$('flightStatus').textContent=status;
 $('flightStatus').style.background=state.onGround?'#ffe082':'#49f0b4';
 $('speedText').textContent=fmt(state.speed*1.94);$('altText').textContent=fmt(Math.max(0,state.pos.y-29)*3.281);
 $('headingText').textContent=String(Math.round(deg(state.heading))).padStart(3,'0');
 $('throttleText').textContent=Math.round(state.throttle*100)+'%';$('throttleFill').style.width=(state.throttle*100)+'%';updateSimulatorUI();
 $('gearText').textContent=state.gear?'GEAR DOWN':'GEAR UP';$('cameraText').textContent=['CHASE CAMERA','FAR CAMERA','COCKPIT VIEW'][state.cam];
 const near=nearestIsland(state.pos);$('rankTag').textContent=pilotTitle()+' · '+profile.visited.length+'/'+islands.length+' airports';$('locationText').textContent=(near.d<near.is.r*1.5?near.is.name.toUpperCase()+' AIRSPACE' : (isUSLand(state.pos.x,state.pos.z)?'OVER LAND':'OVER WATER'))+(state.onGround?' · PARKED':'');
 $('targetArrow').classList.toggle('hidden',!dest);
 if(dest){$('targetLabel').textContent=(race.active?'RING '+(race.next+1):dest.name.toUpperCase())+' · '+km.toFixed(1)+' KM';
 let direction=(((bearing-deg(state.heading)+540)%360)-180);$('targetSymbol').style.transform='rotate('+direction+'deg)';}
 $('raceHud').classList.toggle('hidden',!race.active);if(race.active)$('raceHud').querySelector('.eyebrow').textContent='🏁 '+islands[race.course].name.toUpperCase()+' SKY RACE';
 if(race.active){$('raceCheckText').textContent='RING '+Math.min(9,race.next+1)+' / 9';let mm=Math.floor(race.time/60),ss=(race.time%60).toFixed(1);$('raceClock').textContent=String(mm).padStart(2,'0')+':'+String(ss).padStart(4,'0');let place=1+race.ai.filter(bot=>bot.progress>race.next).length;$('racePosition').textContent='POSITION #'+place+' OF 4';}
 const aiCount=aiPlanes().length;const chip=$('trafficButton');if(chip)chip.textContent='✈ '+aiCount+' AI PLANES · V TO SPOT';
 updateTravelHUD();drawRadar();}
function drawRadar(){
 const c=$('radarCanvas'),g=c.getContext('2d'),w=c.width,h=c.height,cx=w/2,cy=h/2,radius=w*.465;
 g.clearRect(0,0,w,h);g.fillStyle='#0b263e';g.fillRect(0,0,w,h);
 const grad=g.createRadialGradient(cx,cy,4,cx,cy,radius);grad.addColorStop(0,'#145874');grad.addColorStop(1,'#061e36');g.fillStyle=grad;g.beginPath();g.arc(cx,cy,radius,0,TAU);g.fill();
 const radiusWorld=RADAR_RANGES[radarRangeIndex],scale=radius/radiusWorld,angle=state.heading;
 const ca=Math.cos(-angle),sa=Math.sin(-angle);
 function pt(obj){let dx=obj.x-state.pos.x,dz=obj.z-state.pos.z,ux=dx*ca+dz*sa,uz=-dx*sa+dz*ca;return [cx+ux*scale,cy-uz*scale,Math.hypot(dx,dz)]}
 g.save();g.beginPath();g.arc(cx,cy,radius,0,TAU);g.clip();
 // Direction rings and range scale.
 g.strokeStyle='#77c7ec70';g.lineWidth=1.25;for(let k=1;k<=4;k++){g.beginPath();g.arc(cx,cy,radius*k/4,0,TAU);g.stroke()}
 g.beginPath();g.moveTo(cx,cy-radius);g.lineTo(cx,cy+radius);g.moveTo(cx-radius,cy);g.lineTo(cx+radius,cy);g.stroke();
 for(const ap of islands){let [x,y,d]=pt(ap);if(d>radiusWorld)continue;g.fillStyle=ap.id===mission.to?'#ffe56d':ap.id===mission.from?'#ffffff':'#6cf1b6';g.beginPath();g.arc(x,y,ap.id===mission.to?10:7.5,0,TAU);g.fill();if(ap.id===mission.to||ap.id===state.currentIsland){g.font='bold 17px system-ui';g.fillStyle='#fff';g.fillText(ap.name,x+12,y-10)}}
 const dest=mission.to!==null?islands[mission.to]:null;
 if(dest){const [x,y,dist]=pt(dest);const clipped=Math.min(1,radius/Math.max(1,Math.hypot(x-cx,y-cy)));g.setLineDash([8,7]);g.strokeStyle='#ffdb64';g.lineWidth=2.7;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+(x-cx)*clipped,cy+(y-cy)*clipped);g.stroke();g.setLineDash([]);if(dist>radiusWorld){g.fillStyle='#ffe17b';g.beginPath();g.arc(cx+(x-cx)*clipped*.96,cy+(y-cy)*clipped*.96,7,0,TAU);g.fill()}}
 for(const ai of aiPlanes()){const [x,y,d]=pt(ai.pos);if(d>radiusWorld)continue;g.fillStyle=ai.kind==='RACER'?'#ffc95e':ai.kind==='FRIEND'?'#4fffa1':'#ff7081';g.strokeStyle='#ffffff';g.lineWidth=1.1;g.beginPath();g.arc(x,y,9.5,0,TAU);g.fill();g.stroke();}
 g.restore();g.strokeStyle='#8fd9ed';g.lineWidth=2;g.beginPath();g.arc(cx,cy,radius,0,TAU);g.stroke();
 g.save();g.translate(cx,cy);g.fillStyle='#ffffff';g.beginPath();g.moveTo(0,-18);g.lineTo(-12,14);g.lineTo(0,6);g.lineTo(12,14);g.closePath();g.fill();g.restore();
 $('radarRange').textContent=Math.round(radiusWorld/1000).toLocaleString('en-US')+' GAME KM · 🔴 AI';
}
function previewPlane(index){let c=$('previewCanvas');if(!c)return;let w=c.width=470,h=c.height=280,g=c.getContext('2d');let grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#74c3f1');grad.addColorStop(1,'#d7eff3');g.fillStyle=grad;g.fillRect(0,0,w,h);
 let eye=V(36,19,58),fw=norm(mul(eye,-1)),right=norm(cross(V(0,1,0),fw)),up=norm(cross(fw,right)),rot=now*.55;
 let rotP=p=>{let x=p.x*Math.cos(rot)+p.z*Math.sin(rot),z=-p.x*Math.sin(rot)+p.z*Math.cos(rot),q=V(x,p.y,z),diff=sub(q,eye),depth=dot(diff,fw);return {x:w/2+460*dot(diff,right)/depth,y:h/2-460*dot(diff,up)/depth,z:depth}};
 let tris=[];for(let f of [...planeModels[index].body,...planeModels[index].gear]){let a=rotP(f.a),b=rotP(f.b),c=rotP(f.c);if(a.z>0&&b.z>0&&c.z>0)tris.push({a,b,c,color:f.color,z:(a.z+b.z+c.z)/3})}
 tris.sort((a,b)=>b.z-a.z);for(let t of tris){g.fillStyle=t.color;g.beginPath();g.moveTo(t.a.x,t.a.y);g.lineTo(t.b.x,t.b.y);g.lineTo(t.c.x,t.c.y);g.fill()}
 g.fillStyle='#113852';g.font='bold 12px system-ui';g.textAlign='center';g.fillText('3D AIRCRAFT PREVIEW · ROTATING',w/2,h-15)}
function showModal(type){modalType=type;$('modal').classList.remove('hidden');let dest=state.onGround?nearestIsland(state.pos).is:islands[state.currentIsland],grounded=state.onGround;let content='';
 if(type==='routes'){
 const current=countryAirportIds.includes(state.currentIsland)?state.currentIsland:0;
 const goal=countryAirportIds.includes(mission.to)?mission.to:countryAirportIds.find(id=>islands[id].name==='Japan')||countryAirportIds[1];
 content=`<h2>🌍 Plan a Flight Anywhere</h2><p class="subhead">Choose a departure country and a destination country. Your plane starts at the selected departure airport. Take off, then use <b>K</b> for normal, ×10, or ×30 Quick Cruise. The final approach is always flown at normal speed.</p>
 <div class="worldRoutes"><label>🛫 Depart from<select id="routeFrom">${countryOptions(current)}</select></label><label>🛬 Fly to<select id="routeTo">${countryOptions(goal)}</select></label><label>Mission type<select id="routeKind"><option value="passenger">👥 Passenger flight</option><option value="cargo">📦 Cargo delivery</option><option value="rescue">🚑 Rescue supplies</option></select></label></div>
 <div class="routeDetails" id="routeDetails">Choose two countries to preview the trip.</div>
 <button id="startWorldRoute" class="primaryAction worldGo">✈ START THIS INTERNATIONAL FLIGHT</button>
 <p class="subhead">Includes ${fullCountryCount} countries and territories. Capital-area airports are approximate game locations, not real-world runway charts. Your previous race trophies, fleet and money stay saved.</p>`;
 }else if(type==='jobs'){
 let list=missionList(),p=mission,labels=['🌿 SHORT FLIGHT','🌤️ MEDIUM FLIGHT','🌍 LONG FLIGHT'];
 content=`<h2>📦 Choose Your Delivery</h2><p class="subhead">Pick <b>one of three</b> delivery jobs. Longer flights earn more money. Land safely at the destination airport to collect your reward.</p><div class="topline"><strong>Departing: ${dest.emoji} ${dest.name}</strong><span class="moneytag">$${fmt(profile.cash)}</span></div><div class="missionGrid threeChoices" style="margin-top:14px">`+
 list.map((is,i)=>`<div class="selectionCard ${p.to===is.id?'selected':''}"><div class="flightDifficulty">${['📦 CARGO DELIVERY','👥 PASSENGER CHARTER','🚁 RESCUE SUPPLIES'][i]} · ${labels[i]}</div><h3>${is.emoji} ${is.name}</h3><small>${(d2(is,dest)/1000).toFixed(1)} km across the world</small><div class="contractReward">+$${fmt(jobReward(dest.id,is.id,['cargo','passenger','rescue'][i]))}</div><p>${i===0?'A shorter trip to get comfortable landing.':i===1?'Explore farther around the world.':'A big rescue run: longer distance, higher reward.'}</p><button data-job="${is.id}" data-kind="${['cargo','passenger','rescue'][i]}">${p.to===is.id?'✅ CURRENT DELIVERY':'CHOOSE THIS DELIVERY'}</button></div>`).join('')+'</div>'+(p.to!==null&&!list.some(is=>is.id===p.to)?`<p class="subhead" style="margin-top:16px">Current delivery: <b>${islands[p.to].name}</b>. Choose another option above to replace it.</p>`:'');
 }else if(type==='shop'){
 let selected=clamp(shopPreviewIndex,0,planes.length-1);content=`<h2>✈️ Aircraft Hangar</h2><p class="subhead">Buy faster aircraft with money earned on missions and race victories. Every airport has a hangar. Owned planes are saved on this device.</p><div class="topline"><b>${dest.emoji} ${dest.name} Airport</b><span class="moneytag">$${fmt(profile.cash)}</span></div>`;
 if(!grounded)content+='<p style="color:#ffd671;font-weight:800">🛬 Land at an airport first to buy or switch airplanes.</p>';
 content+=`<div class="shopLayout" style="margin-top:14px"><div class="shopPreview"><canvas id="previewCanvas" width="470" height="280"></canvas><b>${planes[selected].name}</b><small>Inspect your next airplane · 3D preview</small></div><div>`+
 planes.map((p,i)=>`<div class="planeRow ${i===selected?'selected':''}"><div class="planeDesc"><b>${i===planeId?'✅ ':''}${p.name}</b><small>${p.type} · ${Math.round(p.max*1.94)} kts</small></div><button data-preview="${i}">VIEW</button><button data-plane="${i}" ${!grounded||(!profile.owned.includes(i)&&(p.special||profile.cash<p.price))?'disabled':''}>${planeId===i?'EQUIPPED':profile.owned.includes(i)?'EQUIP':p.special?'🔒 ACHIEVEMENT':'$'+fmt(p.price)}</button></div>`).join('')+'</div></div>';
 content+=`<h3>🔧 Workshop · Upgrade your current fleet</h3><p class="subhead">Engine top speeds remain unchanged. Upgrade handling, landing tolerance and mission earnings.</p><div class="upgrade-grid">`+
 [['handling','🎮 Better handling'],['landing','🛬 Landing brakes'],['cargo','📦 Delivery bonuses']].map(([k,title])=>`<div class="selectionCard"><b>${title}</b><small>Level ${profile.upgrades[k]} / 3</small><button data-upgrade="${k}" ${!grounded||profile.upgrades[k]===3||profile.cash<upgradePrice(k)?'disabled':''}>${profile.upgrades[k]===3?'MAXED OUT':'$'+fmt(upgradePrice(k))}</button></div>`).join('')+'</div>';
 content+='<h3>🎨 Paint Shop</h3><div class="paint-row">'+PAINTS.map((name,i)=>`<button class="paintBtn" data-paint="${i}" ${!grounded?'disabled':''} style="border-color:${COLORS[i]}">${profile.paint===i?'✓ ':''}${name}</button>`).join('')+'</div>';
 }else if(type==='map'){
 content=`<h2>🌍 World Airport Map</h2><p class="subhead">Global country airports plus the 50 U.S. state airports. ✈ Your plane is white, your destination is yellow. Use ROUTES to select a flight between countries.</p><div class="mapBoard"><canvas id="gameMap" width="970" height="620"></canvas></div><div class="topline" style="margin-top:13px"><strong>🏁 Florida 9-Ring Sky Race</strong><button class="primaryAction" id="startRaceFromMap">START RACE AT FLORIDA</button></div>`;
  }else if(type==='career'){
 const st=collectStats(),races=st.raceTitles;
 content=`<h2>🏆 Pilot Career & World Passport</h2><p class="subhead"><b>${pilotTitle()}</b> · Level ${pilotLevel()} · ${fmt(profile.xp)} XP · ${fmt(profile.goodLandings)} safe landings. Best landing: <b>${profile.bestLanding}/100</b> · Perfect landings: ${profile.perfectLandings}. Earn XP by landing, taking contracts, discovering landmarks and winning races.</p>
 <div class="topline"><b>🌎 AIRPORT STAMPS ${profile.visited.length}/${islands.length}</b><b>📍 LANDMARKS ${st.landmarks}/${st.allLandmarks}</b><b>🏁 TROPHIES ${races}/${raceCourses.length}</b></div>
 <div class="passport-grid">${islands.map(ap=>`<div class="passport-stamp ${profile.visited.includes(ap.id)?'stamped':''}">${profile.visited.includes(ap.id)?'✅':'◌'} ${ap.name}</div>`).join('')}</div>
 <h3>📍 Landmark Collection</h3><div class="passport-grid">${landmarks.map(lm=>`<div class="passport-stamp ${profile.discovered.includes(lm.id)?'stamped':''}">${profile.discovered.includes(lm.id)?'⭐':'◌'} ${lm.name}</div>`).join('')}</div>
 <p class="subhead">Explore airports around the world for stamps. Fly within 1.7 km of landmarks to collect $180 and XP. Each newly visited airport awards $500 and 200 XP. Win all five race courses for a $7,500 championship bonus.</p>`;
 }else if(type==='challenges'){
 content=`<h2>⚠️ Weather Landing Academy</h2><p class="subhead">Practice a challenging approach. You start aligned about 1.8 km from an airport. Put your gear down, control your descent and land safely to earn $1,100 and 380 XP. When finished or canceled you return to your exact previous position, speed and direction. No engine failures.</p>
 <div class="challenge-grid"><button class="primaryAction" data-challenge="fog">🌫️ Fog approach · Maryland</button><button class="primaryAction" data-challenge="wind">💨 Crosswind approach · Colorado</button><button class="primaryAction" data-challenge="storm">⛈️ Storm approach · California</button></div>`;
 }else if(type==='race'){
 content=`<h2>🏁 United States Racing Championship</h2><p class="subhead">Five courses with nine glowing rings each, three named AI rivals, best-time records and medals. Earn XP to unlock tougher courses. Finish or cancel a race to return to your exact previous flight! Win all five to become National Sky Champion!</p><div class="race-grid">`+
 raceCourses.map((course,i)=>`<div class="selectionCard"><h3>${['🌴','🏜️','🏔️','🗽','🌲'][i]} ${course.label}</h3><div class="flightDifficulty">${['EASY','MEDIUM','HARD','EXPERT','LEGENDARY'][i]} · LVL ${course.unlock}+</div><p>9 sequential rings · 3 AI pilots · ${(profile.raceWins[course.id]||0)>0?'🏆 Gold claimed':'Gold available'} · Best time: ${profile.raceBest[course.id]?profile.raceBest[course.id].toFixed(1)+'s':'—'}</p><button data-race="${course.id}" ${pilotLevel()<course.unlock?'disabled':''}>${pilotLevel()<course.unlock?'🔒 UNLOCK AT LVL '+course.unlock:'START RACE'}</button></div>`).join('')+'</div>';
 }else if(type==='airline'){
 const a=profile.airline,planeOpts=a.fleet.map(f=>`<option value="${f.id}">${planes[f.type].name} · fleet #${f.id}</option>`).join('');
 const airportOpts=islands.map(ap=>`<option value="${ap.id}">${ap.name}</option>`).join('');
 content=`<h2>🏢 Your Airline Empire</h2><p class="subhead">Hire AI pilots, buy a dedicated company fleet, and assign routes. AI employees complete flights and pay your airline <b>while the game is running</b>. Their flights take 1–5 minutes in the management simulation; your airplane's actual speed is unchanged.</p>
 <div class="topline"><strong>👩‍✈️ ${a.pilots.length} employees · ✈ ${a.fleet.length} fleet aircraft</strong><b>💵 Airline profit $${fmt(a.revenue)} · ${fmt(a.flights)} flights</b></div>
 <div class="selectionCard"><h3>Grow your company</h3><button data-hire ${a.pilots.length>=8||profile.cash<pilotHireCost()?'disabled':''}>👨‍✈️ HIRE AI PILOT · $${fmt(pilotHireCost())}</button>
 ${[0,1,2,3,4].map((p)=>`<button data-fleet="${p}" ${a.fleet.length>=10||profile.cash<Math.max(1300,planes[p].price*.75|0)?'disabled':''}>✈ ${planes[p].name} · $${fmt(Math.max(1300,planes[p].price*.75|0))}</button>`).join('')}
 <p class="subhead">Fleet aircraft belong to the company. You still have your own aircraft hangar. To upgrade a terminal or runway, visit AIRPORTS.</p></div>
 ${a.pilots.map(p=>{const assigned=p.assigned!==null;const opt=planeOpts||'<option value="">Buy a fleet plane first</option>';
 return `<div class="selectionCard" style="margin-top:12px"><h3>👩‍✈️ ${p.name} · Level ${p.skill}</h3><p>${assigned?`🛫 ${islands[p.from]?.name} → ${islands[p.to]?.name} · ${Math.floor(p.progress/Math.max(1,airlineDuration(p.from,p.to))*100)}% · $${fmt(p.earned)} earned`:'Ready for assignment'} </p>
 <div class="airlineSelectors"><label>Fleet plane<select id="pilot-plane-${p.id}">${opt}</select></label><label>From<select id="pilot-from-${p.id}">${airportOpts}</select></label><label>To<select id="pilot-to-${p.id}">${airportOpts}</select></label></div>
 <button data-assign="${p.id}" ${a.fleet.length===0?'disabled':''}>${assigned?'CHANGE ROUTE':'ASSIGN ROUTE'}</button> ${assigned?`<button data-stop="${p.id}">STOP ROUTE</button>`:''}</div>`}).join('')||'<p class="subhead">No staff yet. Complete a few flights, then hire your first pilot.</p>'}`;
 }else if(type==='airports'){
 const ap=state.onGround?nearestIsland(state.pos).is:null,airport=ap?.id;
 const tiers=airport!==undefined?profile.airline.hubs[airport]:null;
 content=`<h2>🏗️ Airport Empire</h2><p class="subhead">Land at an airport to buy it as a hub. Improve its terminal, hangars, runway and tower. Upgrades appear as 3D buildings, longer runways and extra airline earnings. You must visit an airport before upgrading it.</p>
 <div class="topline"><b>🏢 ${Object.keys(profile.airline.hubs).length} owned hubs</b><b>$${fmt(profile.cash)} cash</b></div>
 <div class="selectionCard"><h3>📍 ${ap?ap.name:'Land at an airport to build'}</h3>
 ${airport===undefined?'<p>Currently flying — land to manage an airport.</p>':!tiers?`<p>Open your first hub for $1,800.</p><button data-buy-hub="${airport}" ${profile.cash<1800?'disabled':''}>BUY ${ap.name.toUpperCase()} AIRPORT HUB · $1,800</button>`:
 `<p>✅ Your airline hub in ${ap.name}</p><div class="upgrade-grid">${Object.entries(airportUpgradePrices).map(([k,v])=>{const lv=hubTier(airport,k),price=v*(lv+1);return `<div class="selectionCard"><b>${{terminal:'🏢 Terminal',hangar:'✈ Hangars',runway:'🛬 Longer runway',tower:'📻 ATC tower'}[k]}</b><small>Level ${lv}/3</small><button data-airport-upgrade="${airport}" data-upgrade-key="${k}" ${lv>=3||profile.cash<price?'disabled':''}>${lv>=3?'MAXED':'$'+fmt(price)}</button></div>`}).join('')}</div>`}
 </div><h3>Owned airports</h3><div class="passport-grid">${Object.keys(profile.airline.hubs).map(id=>`<div class="passport-stamp stamped">🏢 ${islands[id]?.name||'Airport'}</div>`).join('')||'<p class="subhead">No hubs yet — begin by landing at an airport.</p>'}</div>`;
 }else if(type==='multiplayer'){
 const status=multiplayer.connected?'🟢 CONNECTED':multiplayer.connecting?'🟡 CONNECTING':'⚪ OFFLINE';
 content=`<h2>🌍 Fly With Friends (optional)</h2><p class="subhead">Join a shared room to see friends' airplanes in the same sky. <b>This requires an online game server</b> or a local server on your network. The single-player game works without it. For safety, use a nickname — no real names or chat needed.</p>
 <div class="topline"><b>${status}</b><b>👥 ${multiplayer.peers.size+Number(multiplayer.connected)} pilots in room</b></div>
 <div class="airlineSelectors"><label>Server address<input id="mp-server" value="${escapeHTML(multiplayer.url)}" placeholder="ws://localhost:3000" /></label><label>Room code<input id="mp-room" value="${escapeHTML(multiplayer.room)}" maxlength="16" placeholder="SKYCLUB" /></label><label>Nickname<input id="mp-nick" value="${escapeHTML(multiplayer.nick)}" maxlength="16" placeholder="SKYPILOT" /></label></div>
 <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:15px"><button id="mp-join" ${multiplayer.connected?'disabled':''}>CONNECT TO ROOM</button><button id="mp-leave" ${!multiplayer.connected&&!multiplayer.connecting?'disabled':''}>DISCONNECT</button></div>
 <p class="subhead">${escapeHTML(multiplayer.message)}</p><p class="subhead">Host setup instructions are in <b>ONLINE_FRIENDS.txt</b>. No server is running automatically when you open the ZIP.</p>`;
 }else if(type==='help'){
 content=`<h2>🎮 Pilot Training</h2><p class="subhead">Fly like a pro. Practice takeoffs, smooth turns, and safe landings. No engine failures or random breakdowns.</p><div class="helpGrid">`+
 [['1','Toggle SIMULATOR / EASY flight model'],['2','Cycle flaps UP / 15° / 30°'],['3','Autopilot: heading and altitude hold'],['Q / Z','Adjust elevator trim'],['SIM cockpit','Press C until cockpit view: attitude indicator, IAS, altitude, vertical speed'],['W / S','Increase / decrease throttle'],['↑ / ↓','Pitch nose up / down'],['← / →','Steer airplane left / right'],['A / D','Bank left / right'],['G','Toggle landing gear'],['C','Change chase / far / cockpit camera'],['SPACE','Hold wheel brake / airbrake'],['E or H','Open hangar'],['M','Open U.S. map'],['J','Open flight contracts'],['R','Open five-course racing championship'],['P','Pilot career, visited state passport'],['B','Weather landing academy'],['T','Talk to air traffic control'],['V','Spot a nearby AI airplane for ten seconds'],['X','Leave race / challenge and return to your flight'],['Y','Manage your airline and AI pilots'],['U','Buy and upgrade airports'],['O','Multiplayer rooms (needs server)'],['F','Return to Maryland airport']].map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')+'</div><p class="helpFooter"><b>TAKEOFF:</b> In SIM mode set FLAPS 15°, raise throttle, wait for takeoff airspeed, and gently pull ↑. Avoid a stall; fly with the nose level to gain speed. <b>FLIGHT:</b> Point toward your destination, add throttle, and climb. <b>LAND:</b> Return to a runway, lower GEAR with G, slow down, and descend gently by pressing ↓. <b>RACE:</b> Fly through all nine bright rings in order. Winning earns bonus cash!</p>';
 }
 $('modalContent').innerHTML=content;
 if(type==='map')drawMap();if(type==='shop')previewPlane(shopPreviewIndex);
 $('modalContent').querySelectorAll('[data-job]').forEach(b=>b.addEventListener('click',()=>assignMission(+b.dataset.job,b.dataset.kind)));
 $('modalContent').querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{shopPreviewIndex=+b.dataset.preview;showModal('shop')}));
 $('modalContent').querySelectorAll('[data-plane]').forEach(b=>b.addEventListener('click',()=>buyPlane(+b.dataset.plane)));
 $('startRaceFromMap')?.addEventListener('click',()=>startRace(1));
 $('modalContent').querySelectorAll('[data-race]').forEach(b=>b.addEventListener('click',()=>startRace(+b.dataset.race)));
 $('modalContent').querySelectorAll('[data-challenge]').forEach(b=>b.addEventListener('click',()=>beginLandingChallenge(b.dataset.challenge)));
 $('modalContent').querySelectorAll('[data-upgrade]').forEach(b=>b.addEventListener('click',()=>buyUpgrade(b.dataset.upgrade)));
 if(type==='routes'){
  const updateRoute=()=>{const f=+$('routeFrom').value,t=+$('routeTo').value,distKm=Math.round(d2(islands[f],islands[t])/1000),estimated=Math.max(1,Math.ceil((Math.max(0,distKm*1000-2600)/(planes[planeId].cruise*30))/60));
  $('routeDetails').textContent=f===t?'Pick different countries.':`${islands[f].name} → ${islands[t].name} · ${fmt(distKm)} game km · Express flight around ${estimated} minutes plus takeoff and landing.`;
  $('startWorldRoute').disabled=f===t;};
  $('routeFrom').addEventListener('change',updateRoute);$('routeTo').addEventListener('change',updateRoute);
  $('startWorldRoute').addEventListener('click',()=>beginWorldRoute(+$('routeFrom').value,+$('routeTo').value,$('routeKind').value));updateRoute();
 }
 $('modalContent').querySelectorAll('[data-paint]').forEach(b=>b.addEventListener('click',()=>changePaint(+b.dataset.paint)));
 $('modalContent').querySelectorAll('[data-hire]').forEach(b=>b.addEventListener('click',hirePilot));
 $('modalContent').querySelectorAll('[data-fleet]').forEach(b=>b.addEventListener('click',()=>purchaseAirlinePlane(+b.dataset.fleet)));
 $('modalContent').querySelectorAll('[data-assign]').forEach(b=>b.addEventListener('click',()=>{const id=+b.dataset.assign;beginAirlineRoute(id,+$('pilot-plane-'+id).value,+$('pilot-from-'+id).value,+$('pilot-to-'+id).value)}));
 $('modalContent').querySelectorAll('[data-stop]').forEach(b=>b.addEventListener('click',()=>stopAirlineRoute(+b.dataset.stop)));
 $('modalContent').querySelectorAll('[data-buy-hub]').forEach(b=>b.addEventListener('click',()=>purchaseHub(+b.dataset.buyHub)));
 $('modalContent').querySelectorAll('[data-airport-upgrade]').forEach(b=>b.addEventListener('click',()=>purchaseAirportUpgrade(+b.dataset.airportUpgrade,b.dataset.upgradeKey)));
 $('mp-join')?.addEventListener('click',()=>mpConnect($('mp-server').value,$('mp-room').value,$('mp-nick').value));
 $('mp-leave')?.addEventListener('click',()=>{mpDisconnect();showModal('multiplayer')});
 if(type==='airline')for(const p of profile.airline.pilots){if(p.assigned!==null&&$('pilot-plane-'+p.id))$('pilot-plane-'+p.id).value=String(p.assigned);
 if(p.from!==null&&$('pilot-from-'+p.id))$('pilot-from-'+p.id).value=String(p.from);
 if(p.to!==null&&$('pilot-to-'+p.id))$('pilot-to-'+p.id).value=String(p.to);else if($('pilot-to-'+p.id))$('pilot-to-'+p.id).value='1';}
}
let shopPreviewIndex=planeId;
function buyPlane(id){if(!state.onGround){setToast('Land at an airport first.');return}let p=planes[id];if(!p)return;if(profile.owned.includes(id)){profile.selected=id;planeId=id;shopPreviewIndex=id;state.speed=Math.min(state.speed,p.max);persist();showModal('shop');setToast('✈️ Equipped: '+p.name);return}
 if(p.special){setToast('Earn the achievement to unlock this rare airplane!');return}if(profile.cash<p.price){setToast('Not enough cash for this airplane!');return}profile.cash-=p.price;profile.owned.push(id);profile.selected=id;planeId=id;shopPreviewIndex=id;persist();showModal('shop');setToast('🎉 Purchased '+p.name+'!');}
function drawMap(){let c=$('gameMap');if(!c)return;let g=c.getContext('2d'),w=c.width,h=c.height;let grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#086e95');grad.addColorStop(1,'#103e68');g.fillStyle=grad;g.fillRect(0,0,w,h);
 const minX=(-180+100)*WORLD_SCALE,maxX=(180+100)*WORLD_SCALE;
 const minZ=(-60-38)*WORLD_SCALE,maxZ=(85-38)*WORLD_SCALE;
 const pad=58,scale=Math.min((w-pad*2)/(maxX-minX),(h-pad*2)/(maxZ-minZ));
 const offX=(w-(maxX-minX)*scale)/2,offY=(h-(maxZ-minZ)*scale)/2;
 const px=x=>offX+(x-minX)*scale,py=z=>h-offY-(z-minZ)*scale;
 g.strokeStyle='#a1e4ed29';g.lineWidth=1;for(let i=0;i<=10;i++){g.beginPath();g.moveTo(i*w/10,0);g.lineTo(i*w/10,h);g.stroke()}for(let j=0;j<=10;j++){g.beginPath();g.moveTo(0,j*h/10);g.lineTo(w,j*h/10);g.stroke()}
 for(const poly of worldOutlines){g.beginPath();poly.forEach(([lon,lat],i)=>{let x=px((lon+100)*WORLD_SCALE),y=py((lat-38)*WORLD_SCALE);if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.closePath();g.fillStyle='#4e956b';g.fill();g.strokeStyle='#c6e5b7';g.lineWidth=1.6;g.stroke();}
 // State borders are approximate subdivisions, not surveyed political boundaries.
 for(let is of islands){let x=px(is.x),y=py(is.z);g.fillStyle=is.id===mission.to?'#ffe26d':ownHub(is.id)?'#ffbf83':'#67e4ac';g.beginPath();g.arc(x,y,ownHub(is.id)?6:4.5,0,TAU);g.fill();if(is.id===mission.to||is.id===mission.from){g.fillStyle='#fff';g.font='bold 11px system-ui';g.textAlign='center';g.fillText(is.name,x,y-8)}}
 // The Florida course is illustrated by a bright loop on the map.
 for(let lm of landmarks){let lx=px(lm.x),ly=py(lm.z);g.fillStyle=profile.discovered.includes(lm.id)?'#ffe777':'#ffffff';g.font='bold 15px system-ui';g.fillText('★',lx,ly);}
 g.strokeStyle='#47eaff';g.lineWidth=2.5;g.beginPath();raceRings.forEach((r,i)=>i?g.lineTo(px(r.x),py(r.z)):g.moveTo(px(r.x),py(r.z)));g.stroke();
 for(let r of raceRings){g.beginPath();g.arc(px(r.x),py(r.z),2.9,0,TAU);g.fillStyle='#f9e05c';g.fill()}
 let a=px(state.pos.x),b=py(state.pos.z),dest=mission.to===null?null:islands[mission.to];
 if(dest){g.strokeStyle='#ffde68';g.setLineDash([9,9]);g.lineWidth=3;g.beginPath();g.moveTo(a,b);g.lineTo(px(dest.x),py(dest.z));g.stroke();g.setLineDash([])}
 g.save();g.translate(a,b);g.rotate(-state.heading);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-11);g.lineTo(8,10);g.lineTo(0,4);g.lineTo(-8,10);g.closePath();g.fill();g.restore();
}
function closeModal(){modalType='';$('modal').classList.add('hidden')}
function recover(){race.active=false;emergency.active=false;eventReturn=null;portalReady=false;updateReturnButton();let is=islands[0];state.pos=local(is,0,29,-is.runwayLength*.35);state.heading=0;state.pitch=0;state.bank=0;state.throttle=0;state.speed=0;state.onGround=true;state.gear=true;state.vspeed=0;state.flaps=0;state.autopilot=false;state.currentIsland=0;closeModal();setToast('🏠 Back at Maryland airport.');}
const keyActions={Digit1:toggleSimMode,Digit2:cycleFlaps,Digit3:toggleAutopilot,KeyQ:()=>adjustTrim(-1),KeyZ:()=>adjustTrim(1),KeyL:()=>showModal('routes'),KeyK:cycleCruise,KeyN:()=>cycleRadar(0),KeyM:()=>showModal('map'),KeyJ:()=>showModal('jobs'),KeyH:()=>showModal('shop'),KeyE:()=>showModal('shop'),KeyC:()=>{state.cam=(state.cam+1)%3;setToast(['Chase camera','Far chase camera','Cockpit view'][state.cam],1.5)},KeyG:()=>{state.gear=!state.gear;setToast(state.gear?'Landing gear DOWN':'Landing gear UP',1.5)},KeyR:()=>showModal('race'),KeyT:atcCall,KeyV:spotNearestAI,KeyP:()=>showModal('career'),KeyB:()=>showModal('challenges'),KeyX:()=>{if(race.active||emergency.active)returnToFlight('↩ Challenge or race canceled — back to your flight!')},KeyY:()=>showModal('airline'),KeyU:()=>showModal('airports'),KeyO:()=>showModal('multiplayer'),KeyF:()=>{if(confirm('Return to Maryland airport? Your cash and owned planes stay saved.'))recover()},Escape:()=>closeModal()};
document.addEventListener('keydown',e=>{let code=e.code;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();if(!keys.has(code)&&!isPaused&&modalType===''&&keyActions[code])keyActions[code]();else if(code==='Escape')closeModal();keys.add(code)});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
$('playButton').addEventListener('click',()=>{$('splash').classList.add('hidden');$('hud').classList.remove('hidden');isPaused=false;camPos=add(state.pos,V(0,48,-130));setToast('🛩 SIM MODE: throttle up, reach safe takeoff speed, pull up gently. Use FLAPS 15° for takeoff. Press 1 for EASY mode.',7)});
$('simModeButton').addEventListener('click',toggleSimMode);$('routeButton').addEventListener('click',()=>showModal('routes'));$('cruiseToggle').addEventListener('click',cycleCruise);$('radarPlus').addEventListener('click',()=>cycleRadar(-1));$('radarMinus').addEventListener('click',()=>cycleRadar(1));$('radarExpand').addEventListener('click',()=>{$('radar').classList.toggle('expandedRadar');drawRadar()});
$('jobsButton').addEventListener('click',()=>showModal('jobs'));
 $('airlineButton').addEventListener('click',()=>showModal('airline'));
 $('airportButton').addEventListener('click',()=>showModal('airports'));
 $('multiplayerButton').addEventListener('click',()=>showModal('multiplayer'));
 $('mpChip').addEventListener('click',()=>showModal('multiplayer'));
$('shopButton').addEventListener('click',()=>showModal('shop'));
$('mapButton').addEventListener('click',()=>showModal('map'));
$('raceButton').addEventListener('click',()=>showModal('race'));
$('controlsButton').addEventListener('click',()=>showModal('help'));
 $('careerButton').addEventListener('click',()=>showModal('career'));
 $('challengeButton').addEventListener('click',()=>showModal('challenges'));
 $('atcButton').addEventListener('click',atcCall);
 $('trafficButton').addEventListener('click',spotNearestAI);
$('nextJobSmall').addEventListener('click',()=>showModal('jobs'));
$('quitRace').addEventListener('click',()=>returnToFlight('↩ Race canceled — back where you were!'));
 $('returnFlight').addEventListener('click',()=>returnToFlight('↩ Activity canceled — back where you were!'));
 $('skyEventAccept').addEventListener('click',skyAccept);
 $('skyEventSkip').addEventListener('click',skySkip);
$('closeModal').addEventListener('click',closeModal);document.querySelector('.modalback').addEventListener('click',closeModal);
// V12 touch controls: pointer capture keeps a held input working even if the thumb slides.
for(let b of document.querySelectorAll('[data-key]')){const key=b.dataset.key;
 b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);try{b.setPointerCapture(e.pointerId)}catch(_){}});
 for(let ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(key));
}
const joystick=$('touchJoystick'),knob=$('stickKnob');let joyPointer=null;
const steerKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
function steerFromPointer(e){const r=joystick.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/(r.width*.38),dy=(e.clientY-r.top-r.height/2)/(r.height*.38);const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}knob.style.transform='translate(calc(-50% + '+(dx*33)+'px),calc(-50% + '+(dy*33)+'px))';
 const active=new Set();if(dy<-.22)active.add('ArrowUp');if(dy>.22)active.add('ArrowDown');if(dx<-.22)active.add('ArrowLeft');if(dx>.22)active.add('ArrowRight');for(const key of steerKeys){if(active.has(key))keys.add(key);else keys.delete(key)}
}
function stopSteering(){joyPointer=null;knob.style.transform='translate(-50%,-50%)';for(const key of steerKeys)keys.delete(key)}
joystick.addEventListener('pointerdown',e=>{if(joyPointer!==null)return;e.preventDefault();joyPointer=e.pointerId;try{joystick.setPointerCapture(e.pointerId)}catch(_){}steerFromPointer(e)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer){e.preventDefault();steerFromPointer(e)}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(ev,e=>{if(e.pointerId===joyPointer)stopSteering()});
window.addEventListener('blur',stopSteering);
const mobileThrottle=$('touchThrottle');const mobileThrottleValue=$('mobileThrottleValue');
mobileThrottle.addEventListener('input',()=>{state.throttle=clamp(Number(mobileThrottle.value)/100,0,1);mobileThrottleValue.textContent=Math.round(state.throttle*100)+'%'});
mobileThrottle.addEventListener('change',()=>{state.throttle=clamp(Number(mobileThrottle.value)/100,0,1)});
$('mobileGear').addEventListener('click',()=>{state.gear=!state.gear;setToast(state.gear?'Gear DOWN':'Gear UP')});
$('mobileCamera').addEventListener('click',keyActions.KeyC);
$('mobileCruise').addEventListener('click',cycleCruise);
$('mobileRadar').addEventListener('click',()=>{$('radar').classList.toggle('expandedRadar');drawRadar()});$('mobileSim').addEventListener('click',toggleSimMode);$('mobileFlaps').addEventListener('click',cycleFlaps);$('mobileAutopilot').addEventListener('click',toggleAutopilot);
function updateMobileStatus(){if(window.matchMedia('(pointer:coarse)').matches||innerWidth<=740){const el=$('mobileMissionStatus');if(el){const name=$('missionName').textContent||'World flight';const dist=$('missionDistance').textContent||'';el.textContent=name+' · '+dist}mobileThrottleValue.textContent=Math.round(state.throttle*100)+'%';if(document.activeElement!==mobileThrottle){mobileThrottle.value=String(Math.round(state.throttle*100))}}}

let frame=0,lastTime=performance.now();function loop(t){let dt=clamp((t-lastTime)/1000,0,.058);lastTime=t;now=t/1000;
 try{if(!isPaused&&!modalType){tickWeather(dt);tickDayNight(dt);updatePhysics(dt);tickExpress(dt);tickAirline(dt);tickMultiplayer(dt);tickSkyEvents(dt)}if(!isPaused){setCamera(dt||.016);drawWorld();if(++frame%6===0){updateHUD();updateWeatherHUD();updateDayHUD();updateMobileStatus();skyEventUI();checkRarePlanes()}if(modalType==='shop')previewPlane(shopPreviewIndex)}else{setCamera(.016);drawWorld()}
 if(shownToastUntil&&performance.now()>shownToastUntil){$('toast').classList.remove('show');shownToastUntil=0}}
 catch(e){console.error('Island Skies render/update issue:',e);let boot=$('bootError');boot.classList.remove('hidden');boot.textContent='Something went wrong drawing the game: '+e.message}
 requestAnimationFrame(loop)}
// Draw the world behind the menu, and start the animation system.
camPos=add(state.pos,V(0,45,-130));updateSimulatorUI();requestAnimationFrame(loop);
})();
