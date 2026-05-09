const MAX_MONTH = 36;
const BASE_LIVING_COST = 170000;
const INVEST_AMOUNT = 50000;
const REFRESH_COOLDOWN = 4;
const REBALANCE_COOLDOWN = 6;
const TARGET_NET_WORTH = 1500000;
const LIFE_PLAN_COST = [170000, 160000, 155000, 150000];

const actionLabels = {
  work: "普通に働く", sidejob: "副業を頑張る", rest: "休養する", invest: "投資を増やす", borrow: "借金する", refresh: "思い切ってリフレッシュ", rebalance: "生活を見直す", sell: "売却する"
};
const investmentDefs = { fund: { label: "投資信託", min: -0.02, max: 0.03, fee: 0.01 }, stock: { label: "個別株", min: -0.1, max: 0.15, fee: 0.02 }, crypto: { label: "仮想通貨", min: -0.35, max: 0.55, fee: 0.05 } };

const events = {
  overtime:["WARN","残業続き","仕事が立て込み、少し稼げたが消耗。","現金 +10,000 / 体力 -10 / ストレス +10",s=>{s.cash+=10000;s.hp-=10;s.stress+=10}],
  review:["GOOD","仕事評価","本業の働きが評価された。","昇給フラグ +1 / ストレス -3",s=>{s.goodWorkFlag=true;s.stress-=3}],
  mistake:["BAD","小さなミス","本業でミスをしてしまった。","現金 -8,000 / ストレス +8",s=>{s.cash-=8000;s.stress+=8}],
  sideSuccess:["GOOD","副業案件成功","副業がうまく回った。","現金 +20,000",s=>{s.cash+=20000}],
  deadline:["WARN","納期トラブル","副業納期で追い込まれた。","ストレス +15 / 体力 -8",s=>{s.stress+=15;s.hp-=8}],
  sideCancel:["BAD","案件キャンセル","想定収入が消えた。","現金 -20,000 / ストレス +6",s=>{s.cash-=20000;s.stress+=6}],
  mainImpact:["BAD","本業への影響","副業疲れで本業に悪影響。","ストレス +10 / 昇給フラグ無効",s=>{s.stress+=10;s.goodWorkFlag=false}],
  sick:["BAD","体調不良","無理がたたって通院。","現金 -15,000 / 体力 -8",s=>{s.cash-=15000;s.hp-=8}],
  sleep:["WARN","睡眠不足","眠りが浅く集中力低下。","体力 -7 / ストレス +7",s=>{s.hp-=7;s.stress+=7}],
  mental:["BAD","メンタル不調","気持ちが沈んだ。","ストレス +12 / 体力 -4",s=>{s.stress+=12;s.hp-=4}],
  recovery:["GOOD","休養が効いた","しっかり休んで回復。","体力 +10 / ストレス -12",s=>{s.hp+=10;s.stress-=12}],
  refreshMood:["GOOD","気分転換成功","気持ちを切り替えられた。","ストレス -10",s=>{s.stress-=10}],
  save:["GOOD","節約成功","固定費見直しが効いた。","現金 +15,000",s=>{s.cash+=15000}],
  expense:["WARN","急な出費","小さな想定外の支払い。","現金 -12,000",s=>{s.cash-=12000}],
  appliance:["BAD","家電故障","出費が痛い。","現金 -25,000",s=>{s.cash-=25000}],
  ceremony:["WARN","冠婚葬祭","付き合い出費が発生。","現金 -15,000",s=>{s.cash-=15000}],
  investUp:["GOOD","投資好調","保有資産が伸びた。","投資残高 +4%",s=>{if(s.investmentBalance>0)s.investmentBalance+=Math.round(s.investmentBalance*0.04)}],
  investDown:["BAD","投資下落","相場が崩れた。","投資残高 -5%",s=>{if(s.investmentBalance>0)s.investmentBalance-=Math.round(s.investmentBalance*0.05)}],
  marketFear:["WARN","市場不安","悪材料で神経質な相場。","投資残高 -3% / ストレス +6",s=>{if(s.investmentBalance>0)s.investmentBalance-=Math.round(s.investmentBalance*0.03);s.stress+=6}],
  debtPressure:["BAD","返済プレッシャー","返済不安で気持ちが重い。","ストレス +8",s=>{s.stress+=8}],
  paymentNotice:["WARN","支払い通知","返済通知が届いた。","現金 -8,000 / ストレス +6",s=>{s.cash-=8000;s.stress+=6}],
  bonus:["GOOD","臨時収入","思わぬ収入があった。","現金 +25,000",s=>{s.cash+=25000}],
  waste:["WARN","無駄遣い","つい散財した。","現金 -12,000 / ストレス +4",s=>{s.cash-=12000;s.stress+=4}],
  subCleanup:["GOOD","サブスク整理","不要な契約を解約。","現金 +5,000",s=>{s.cash+=5000}],
  cookStart:["GOOD","自炊を始めた","生活のリズムが改善。","体力 +3 / ストレス -4",s=>{s.hp+=3;s.stress-=4}],
  ledger:["GOOD","家計簿が続いた","お金の流れが見えた。","現金 +10,000 / ストレス -5",s=>{s.cash+=10000;s.stress-=5}],
  sellStuff:["GOOD","不用品を売った","家が片付き資金も増えた。","現金 +15,000",s=>{s.cash+=15000}],
  savingFatigue:["WARN","節約疲れ","我慢で疲れが出た。","ストレス +8",s=>{s.stress+=8}],
  catPark:["GOOD","公園の猫と遊んだ","少し癒やされて気分転換。","ストレス -5",s=>{s.stress-=5}],
  bath:["GOOD","湯船にゆっくり浸かった","体がほぐれた。","体力 +5 / ストレス -5",s=>{s.hp+=5;s.stress-=5}],
  lateNight:["WARN","夜ふかしした","翌朝に疲れが残った。","体力 -8",s=>{s.hp-=8}],
  doomscroll:["WARN","スマホを見すぎた","時間を溶かしてしまった。","体力 -3 / ストレス +5",s=>{s.hp-=3;s.stress+=5}],
  friendTalk:["GOOD","友人と話した","気持ちが軽くなった。","ストレス -8",s=>{s.stress-=8}],
  fundRoutine:["INFO","積立が習慣になった","淡々と続けられている。","ストレス -3",s=>{s.stress-=3}],
  fundTight:["WARN","余裕資金が少ない","節約の窮屈さを感じる。","ストレス +5",s=>{s.stress+=5}],
  earningsBeat:["GOOD","決算が好調","保有株に追い風。","投資残高 +8%",s=>{if(s.investmentBalance>0)s.investmentBalance+=Math.round(s.investmentBalance*0.08)}],
  scandal:["BAD","不祥事が発覚","信用不安で株価が急落。","投資残高 -12% / ストレス +12",s=>{if(s.investmentBalance>0)s.investmentBalance-=Math.round(s.investmentBalance*0.12);s.stress+=12}],
  dividend:["GOOD","配当金が入った","少し嬉しいインカム。","現金 +8,000",s=>{s.cash+=8000}],
  shareholderPerk:["GOOD","株主優待が届いた","ちょっと得した気分。","ストレス -8",s=>{s.stress-=8}],
  cryptoSwingStress:["WARN","乱高下ストレス","値動きが激しく気が休まらない。","ストレス +12",s=>{s.stress+=12}],
  cryptoTempt:["INFO","利確の誘惑","売るべきか迷う。","ストレス +6",s=>{s.stress+=6}],
  realizeProfit:["GOOD","利益確定できた","冷静に利確して一息ついた。","ストレス -5",s=>{s.stress-=5}],
  backToCash:["GOOD","現金に戻して安心","相場から距離を置いて気持ちが落ち着いた。","ストレス -8",s=>{s.stress-=8}],
  soldTooEarly:["WARN","売った直後に値上がり","早売りだったかもと後悔した。","ストレス +8",s=>{s.stress+=8}],
  sellFeePain:["WARN","手数料が思ったより痛い","想定よりコストを重く感じた。","現金 -3,000",s=>{s.cash-=3000}],
  sellHesitation:["INFO","売却判断に迷った","本当に正解か自信が持てない。","ストレス +5",s=>{s.stress+=5}],

};

const $ = id => document.getElementById(id);
const statusGrid=$("statusGrid"),message=$("message"),summary=$("monthlySummary"),eventLog=$("eventLog"),eventCard=$("eventCard"),investmentType=$("investmentType"),sellBtn=$("sellBtn"),restartBtn=$("restartBtn"),wealthFill=$("wealthFill"),milestoneMessage=$("milestoneMessage"),quickStatusBar=$("quickStatusBar"),refreshCooldownEl=$("refreshCooldown");
let state;
const livingCost=()=>LIFE_PLAN_COST[state.lifePlanLevel];
const net=()=>Math.round(state.cash+state.investmentBalance-state.debt);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rand=(a,b)=>a+Math.random()*(b-a);

function resetGame(){state={month:1,cash:100000,income:200000,hp:80,stress:20,debt:0,investmentBalance:0,investmentType:null,lastInvestMonth:null,gameOver:false,cleared:false,logs:[],goodWorkFlag:false,sidejobStreak:0,investmentStreak:0,lastEvents:[],refreshCooldown:0,lifePlanLevel:0,rebalanceCooldown:0};setEventCard(["INFO","ゲーム開始","今月の行動を選んでください。","なし"]);summary.textContent="まだ行動していません。";message.textContent="生活を立て直しながら、資産150万円を目指そう。";render();}
function canSell(){return state.investmentBalance>0&&state.lastInvestMonth!==state.month;}

function pickEvent(action){
  let pool=[];
  if(action==="work") pool=["overtime","review","mistake","catPark","doomscroll","save","expense"];
  if(action==="sidejob") pool=["sideSuccess","deadline","sideCancel","mainImpact","sleep","waste"];
  if(action==="rest") pool=["recovery","refreshMood","catPark","bath","friendTalk","save","waste","lateNight"];
  if(action==="invest") pool=["investUp","investDown","marketFear","bonus","expense"];
  if(action==="invest"&&state.investmentType==="fund") pool.push("fundRoutine","fundTight");
  if(action==="invest"&&state.investmentType==="stock") pool.push("earningsBeat","scandal","dividend","shareholderPerk");
  if(action==="invest"&&state.investmentType==="crypto") pool.push("cryptoSwingStress","cryptoTempt");
  if(action==="borrow") pool=["debtPressure","paymentNotice","expense","bonus"];
  if(action==="refresh") pool=["refreshMood","recovery","save","bonus","expense","waste"];
  if(action==="rebalance") pool=["subCleanup","cookStart","ledger","sellStuff","savingFatigue","refreshMood"];
  if(action==="sell") pool=["realizeProfit","backToCash","soldTooEarly","sellFeePain","sellHesitation"];

  pool=pool.filter(k=>!( ["investUp","investDown","marketFear"].includes(k)&&state.investmentBalance<=0));
  if(state.debt<=0) pool=pool.filter(k=>!["debtPressure","paymentNotice"].includes(k));

  const w={}; pool.forEach(k=>w[k]=1);
  if(state.stress<50){["recovery","review","refreshMood","cookStart"].forEach(k=>{if(w[k])w[k]+=0.4;});}
  if(state.stress>=70) pool.forEach(k=>{if(["BAD","WARN"].includes(events[k][0]))w[k]*=1.2;});
  ["bonus","save","ledger","sideSuccess","overtime"].forEach(k=>{if(w[k])w[k]*=0.7;});
  ["expense","appliance","ceremony"].forEach(k=>{if(w[k])w[k]*=0.75;});
  if(state.stress>=90){["waste","mental","mistake","sick","mainImpact","deadline"].forEach(k=>{if(w[k])w[k]+=1.2;});}
  if(state.hp<=30){["sick","sleep"].forEach(k=>{if(w[k])w[k]+=1;});}
  if(state.sidejobStreak>=2){["deadline","mainImpact","sleep","sideCancel"].forEach(k=>{if(w[k])w[k]+=1;}); ["review"].forEach(k=>{if(w[k])w[k]*=0.3;});}
  if(state.investmentType==="crypto"){["marketFear","investDown","cryptoSwingStress"].forEach(k=>{if(w[k])w[k]+=1;});}
  if(state.investmentStreak>=2){["fundTight","cryptoSwingStress","deadline","mental"].forEach(k=>{if(w[k])w[k]+=0.8;});}
  state.lastEvents.forEach(k=>{if(w[k])w[k]*=0.2;});

  let sum=0; pool.forEach(k=>sum+=w[k]); let r=Math.random()*sum;
  for(const k of pool){r-=w[k]; if(r<=0) return k;}
  return pool[0];
}

function doAction(action){
  if(state.gameOver||state.cleared) return;
  if(action==="refresh"&&state.refreshCooldown>0){message.textContent=`リフレッシュはあと${state.refreshCooldown}ヶ月`;render();return;}
  if(action==="refresh"&&state.cash<80000){message.textContent="現金80,000円未満では使えません。";render();return;}
  if(action==="rebalance"&&state.lifePlanLevel>=3){message.textContent="生活見直しは最大レベルです。";render();return;}
  if(action==="rebalance"&&state.rebalanceCooldown>0){message.textContent=`生活見直しはあと${state.rebalanceCooldown}ヶ月`;render();return;}
  if(action==="borrow"&&state.debt>=300000){message.textContent="借金30万円以上では追加借入不可";render();return;}
  if(action==="sell"&&!canSell()){message.textContent="売却は購入翌月以降";render();return;}
  if(action==="invest"){
    const selectedType=investmentType.value;
    if(selectedType==="crypto"&&state.month<=12){message.textContent="仮想通貨は13ヶ月目から";render();return;}
    if(state.debt>=200000){message.textContent="借金20万円以上では新規投資不可";render();return;}
    if(state.investmentBalance>0 && state.investmentType && selectedType!==state.investmentType){message.textContent=`現在は${investmentDefs[state.investmentType].label}を保有中です。別の投資先に変えるには先に全額売却してください。`;render();return;}
    if(state.cash<250000||(state.cash-INVEST_AMOUNT)<livingCost()){message.textContent="投資条件未達（現金25万円＋生活費確保）";render();return;}
  }
  const rec={month:state.month,action:actionLabels[action]||"不明",income:0,expense:0,investPnL:0,debtRepay:0,event:"なし",eventEffect:"-"};
  const before=net(); if(state.refreshCooldown>0) state.refreshCooldown--;
  if(state.rebalanceCooldown>0) state.rebalanceCooldown--;

  if(action==="work"){state.cash+=state.income; rec.income+=state.income; state.hp-=10; state.stress+=8; state.sidejobStreak=0; state.investmentStreak=0;}
  if(action==="sidejob"){const base=Math.round(rand(45000,100000)*(state.stress>=85?0.9:1)); state.cash+=state.income+base; rec.income+=state.income+base; state.hp-=(20+(state.sidejobStreak>=3?6:0)); state.stress+=(14+(state.sidejobStreak>=2?6:0)); state.sidejobStreak++; state.investmentStreak=0;}
  if(action==="rest"){state.cash+=145000; rec.income+=145000; state.hp+=24; state.stress-=25; state.sidejobStreak=0; state.investmentStreak=0;}
  if(action==="refresh"){state.cash+=70000; rec.income+=150000; rec.expense+=80000; state.hp+=15; state.stress-=70; state.sidejobStreak=0; state.investmentStreak=0; state.refreshCooldown=REFRESH_COOLDOWN;}
  if(action==="rebalance"){state.cash+=150000; rec.income+=150000; state.hp-=5; state.stress+=3; state.lifePlanLevel+=1; state.sidejobStreak=0; state.investmentStreak=0; state.rebalanceCooldown=state.lifePlanLevel>=3?0:REBALANCE_COOLDOWN;}
  if(action==="invest"){state.cash+=state.income; rec.income+=state.income; state.sidejobStreak=0; const selectedType=investmentType.value; state.cash-=INVEST_AMOUNT;state.investmentBalance+=INVEST_AMOUNT; if(!state.investmentType) state.investmentType=selectedType; state.lastInvestMonth=state.month; rec.expense+=INVEST_AMOUNT; state.investmentStreak += 1; if(state.debt>0)state.stress+=5;}
  if(action==="borrow"){state.cash+=state.income+100000; rec.income+=state.income+100000; state.debt+=100000; state.sidejobStreak=0; state.investmentStreak=0;}
  if(action==="sell"){
    const d=investmentDefs[state.investmentType];
    const fee=Math.round(state.investmentBalance*d.fee);
    const received=state.investmentBalance-fee;
    state.cash+=received;
    rec.income+=received;
    rec.expense+=fee;
    rec.event=`${d.label}を全額売却`;
    rec.eventEffect=`手数料 ${fee.toLocaleString()}円`;
    state.investmentBalance=0;
    state.investmentType=null;
    state.lastInvestMonth=null;
    state.sidejobStreak=0;
    state.investmentStreak=0;
  }

  const evKey=pickEvent(action); const ev=events[evKey]; const beforeInv=state.investmentBalance; ev[4](state); rec.event=ev[1]; rec.eventEffect=ev[3];

  if(state.investmentBalance>0&&state.investmentType){const def=investmentDefs[state.investmentType]; const d=Math.round(state.investmentBalance*rand(def.min,def.max)); state.investmentBalance+=d; rec.investPnL+=state.investmentBalance-beforeInv; if(state.investmentType==="crypto"&&d<0&&Math.abs(d)>state.investmentBalance*0.12){state.stress+=16; rec.eventEffect+=` / 追加影響: 乱高下ストレス +16`;}}

  state.cash-=livingCost(); rec.expense+=livingCost();
  if(state.debt>0){if(state.debt>=200000)state.stress+=3; let repay=state.debt<10000?state.debt:Math.max(10000,Math.floor(state.debt*0.1)); if(state.cash>=repay){state.cash-=repay;state.debt-=repay;rec.debtRepay=repay;rec.expense+=repay;} else {state.stress+=18;state.debt+=20000;rec.event+=" / 延滞";} state.debt=Math.round(state.debt*1.03);}

  if(state.month===12||state.month===24){const badCount=[state.stress>=80,state.hp<=20,state.debt>=400000].filter(Boolean).length;const raise=(badCount===0||(state.goodWorkFlag&&badCount<=1))&&state.sidejobStreak<3;if(raise){state.income+=10000;rec.event+=" / 昇給+10,000";}else rec.event+=" / 昇給なし";state.goodWorkFlag=false;}

  state.hp=clamp(state.hp,0,100); state.stress=clamp(state.stress,0,100);
  let reason=""; if(state.cash<0)reason="cash"; if(state.hp<=0)reason="hp"; if(state.debt>=500000)reason="debt"; if(reason)state.gameOver=true;
  if(!state.gameOver&&state.month===MAX_MONTH&&net()>=TARGET_NET_WORTH&&state.debt<200000)state.cleared=true;

  rec.deltaNet=net()-before; state.logs.unshift(rec); state.lastEvents.unshift(evKey); state.lastEvents=state.lastEvents.slice(0,3); setEventCard(ev); showSummary(rec);
  if(!state.gameOver&&!state.cleared&&state.month<MAX_MONTH)state.month++; else if(!state.gameOver&&!state.cleared&&state.month===MAX_MONTH){state.gameOver=true;reason="time";}
  message.textContent=state.cleared?"🎉 クリア！純資産150万円以上＆借金20万円未満達成":state.gameOver?gameOverMessage(reason):"今月の行動を選んでください。";
  render();
}

function gameOverMessage(r){if(r==="cash")return"現金不足で生活が崩壊した。";if(r==="hp")return"体力が尽きて行動不能。";if(r==="debt")return"借金が膨張し身動き不能。";return"36ヶ月終了。目標条件を満たせなかった。";}
function setEventCard(ev){eventCard.className=`event-card ${ev[0].toLowerCase()}`;eventCard.innerHTML=`<div class='event-badge'>${ev[0]}</div><h3>${ev[1]}</h3><p>${ev[2]}</p><p class='event-effect'>効果：${ev[3]}</p>`;}
function showSummary(r){const b=state.cleared?"<div class='result-banner clear'>🎉 クリア達成</div>":state.gameOver?"<div class='result-banner over'>GAME OVER</div>":"";summary.innerHTML=`${b}<ul><li>今月の行動：${r.action}</li><li>収入：${r.income.toLocaleString()}円</li><li>支出：${r.expense.toLocaleString()}円</li><li>投資損益：${r.investPnL.toLocaleString()}円</li><li>借金返済額：${r.debtRepay.toLocaleString()}円</li><li>発生イベント：${r.event}</li><li>イベント効果：${r.eventEffect}</li><li>純資産増減：${r.deltaNet.toLocaleString()}円</li></ul>`;}

function render(){
  investmentType.querySelector("option[value='crypto']").disabled=state.month<=12;
  const nw=net();
  const items=[["現在月",`${state.month}/${MAX_MONTH}`],["現金",`${state.cash.toLocaleString()}円`],["純資産",`${nw.toLocaleString()}円`],["生活費",`${livingCost().toLocaleString()}円`],["生活見直しLv",state.lifePlanLevel],["投資残高",`${Math.round(state.investmentBalance).toLocaleString()}円`],["借金",`${state.debt.toLocaleString()}円`],["月収",`${state.income.toLocaleString()}円`],["体力",state.hp],["ストレス",state.stress],["副業連続",`${state.sidejobStreak}ヶ月`],["投資連続",`${state.investmentStreak}ヶ月`],["投資タイプ",state.investmentType?investmentDefs[state.investmentType].label:"なし"],["売却可否",canSell()?"可能":"不可"]];
  statusGrid.innerHTML=items.map(([k,v])=>`<div class='status-item ${(k==="体力"&&state.hp<=20)||(k==="借金"&&state.debt>=400000)?"bad":""} ${(k==="ストレス"&&state.stress>=80)||(k==="現金"&&state.cash<livingCost())||(k==="借金"&&state.debt>=200000)?"warn":""}'><strong>${k}</strong>${v}</div>`).join("");

  const rebalanceStatus = state.lifePlanLevel>=3 ? "生活見直し: 最大Lv" : state.rebalanceCooldown>0 ? `生活見直し不可(${state.rebalanceCooldown}ヶ月)` : "生活見直し可";
  const chips=[`現在月 ${state.month}/${MAX_MONTH}`,`現金 ${state.cash.toLocaleString()}円`,`純資産 ${nw.toLocaleString()}円`,`体力 ${state.hp}`,`ストレス ${state.stress}`,`借金 ${state.debt.toLocaleString()}円`,`生活費 ${livingCost().toLocaleString()}円`,`生活見直しLv ${state.lifePlanLevel}`,`投資連続 ${state.investmentStreak}ヶ月`,rebalanceStatus,state.refreshCooldown>0?`リフレッシュ不可(${state.refreshCooldown}ヶ月)`:"リフレッシュ可"];
  quickStatusBar.innerHTML=chips.map(t=>{let c="quick-pill";if(t.includes("現金")&&state.cash<livingCost())c+=" warn";if(t.includes("体力")&&state.hp<=20)c+=" bad";if(t.includes("ストレス")&&state.stress>=80)c+=" warn";if(t.includes("借金")&&state.debt>=200000)c+=" warn";if(t.includes("不可"))c+=" warn";return `<span class='${c}'>${t}</span>`;}).join("");
  refreshCooldownEl.textContent=`リフレッシュ: ${state.refreshCooldown>0?`あと${state.refreshCooldown}ヶ月`:`使用可能`} / 生活見直し: ${state.lifePlanLevel>=3?`最大Lv`:state.rebalanceCooldown>0?`あと${state.rebalanceCooldown}ヶ月`:`使用可能`}`;

  wealthFill.style.width=`${clamp(nw/TARGET_NET_WORTH*100,0,100)}%`; milestoneMessage.textContent=nw>=TARGET_NET_WORTH?"目標資産到達圏":nw>=1000000?"あと50万円で目標":nw>=700000?"土台ができてきた":"まずは生活安定";
  eventLog.innerHTML=state.logs.map(l=>`<li>${l.month}ヶ月目：${l.action} / ${l.event}（${l.eventEffect}）</li>`).join("");
  sellBtn.disabled=!canSell()||state.gameOver||state.cleared;
  document.querySelectorAll("[data-action]").forEach(btn=>{btn.disabled=state.gameOver||state.cleared||(btn.dataset.action==="refresh"&&state.refreshCooldown>0)||(btn.dataset.action==="rebalance"&&(state.lifePlanLevel>=3||state.rebalanceCooldown>0));});
}

document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>doAction(btn.dataset.action)));
sellBtn.addEventListener("click",()=>doAction("sell"));
restartBtn.addEventListener("click",resetGame);
resetGame();
