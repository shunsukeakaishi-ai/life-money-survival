const MAX_MONTH = 36;
const BASE_LIVING_COST = 170000;
const INVEST_AMOUNT = 50000;
const REFRESH_COOLDOWN = 4;
const REBALANCE_COOLDOWN = 6;
const TARGET_NET_WORTH = 2000000;
const CLEAR_DEBT_LIMIT = 200000;
const LIFE_PLAN_COST = [170000, 160000, 155000, 150000];

const actionLabels = {
  work: "本業に集中する", sidejob: "副業を頑張る", rest: "休養する", invest: "投資を増やす", borrow: "借金する", refresh: "リフレッシュする", rebalance: "生活を見直す", sell: "売却する"
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
  investUp:["GOOD","投資好調","保有資産が伸びた。","評価額 +4%",s=>{if(s.investmentBalance>0)s.investmentBalance+=Math.round(s.investmentBalance*0.04)}],
  investDown:["BAD","投資下落","相場が崩れた。","評価額 -5%",s=>{if(s.investmentBalance>0)s.investmentBalance-=Math.round(s.investmentBalance*0.05)}],
  marketFear:["WARN","市場不安","悪材料で神経質な相場。","評価額 -3% / ストレス +6",s=>{if(s.investmentBalance>0)s.investmentBalance-=Math.round(s.investmentBalance*0.03);s.stress+=6}],
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
  earningsBeat:["GOOD","決算が好調","保有株に追い風。","評価額 +8%",s=>{if(s.investmentBalance>0)s.investmentBalance+=Math.round(s.investmentBalance*0.08)}],
  scandal:["BAD","不祥事が発覚","信用不安で株価が急落。","評価額 -12% / ストレス +12",s=>{if(s.investmentBalance>0)s.investmentBalance-=Math.round(s.investmentBalance*0.12);s.stress+=12}],
  dividend:["GOOD","配当金が入った","少し嬉しいインカム。","現金 +8,000",s=>{s.cash+=8000}],
  shareholderPerk:["GOOD","株主優待が届いた","ちょっと得した気分。","ストレス -8",s=>{s.stress-=8}],
  cryptoSwingStress:["WARN","乱高下ストレス","値動きが激しく気が休まらない。","ストレス +12",s=>{s.stress+=12}],
  cryptoTempt:["INFO","利確の誘惑","売るべきか迷う。","ストレス +6",s=>{s.stress+=6}],
  realizeProfit:["GOOD","利益確定できた","冷静に利確して一息ついた。","ストレス -5",s=>{s.stress-=5}],
  backToCash:["GOOD","現金に戻して安心","相場から距離を置いて気持ちが落ち着いた。","ストレス -8",s=>{s.stress-=8}],
  soldTooEarly:["WARN","売った直後に値上がり","早売りだったかもと後悔した。","ストレス +8",s=>{s.stress+=8}],
  sellFeePain:["WARN","手数料が思ったより痛い","想定よりコストを重く感じた。","現金 -3,000",s=>{s.cash-=3000}],
  sellHesitation:["INFO","売却判断に迷った","本当に正解か自信が持てない。","ストレス +5",s=>{s.stress+=5}],
  noFun:["WARN","娯楽を我慢している","ずっと我慢続きで気が張っている。","ストレス +8",s=>{s.stress+=8}],
  declineInvite:["WARN","友人の誘いを断った","人付き合いを後回しにした。","ストレス +6",s=>{s.stress+=6}],
  noMargin:["WARN","生活に余白がない","節約と相場チェックで疲れた。","ストレス +7 / 体力 -3",s=>{s.stress+=7;s.hp-=3}],
  marketDistract:["WARN","相場が気になって集中できない","価格チェックが止まらない。","ストレス +8",s=>{s.stress+=8}],
  overInvested:["WARN","投資額を増やしすぎたかも","少し不安がよぎる。","ストレス +6",s=>{s.stress+=6}],

};

const $ = id => document.getElementById(id);
const statusGrid=$("statusGrid"),message=$("message"),summary=$("monthlySummary"),eventLog=$("eventLog"),eventCard=$("eventCard"),investmentType=$("investmentType"),sellBtn=$("sellBtn"),restartBtn=$("restartBtn"),wealthFill=$("wealthFill"),milestoneMessage=$("milestoneMessage"),quickStatusBar=$("quickStatusBar"),refreshCooldownEl=$("refreshCooldown");
const debugPanel=$("debugPanel"),debugInfo=$("debugInfo"),debugStateInput=$("debugStateInput"),applyDebugStateBtn=$("applyDebugStateBtn"),copyDebugStateBtn=$("copyDebugStateBtn"),debugForceEventInput=$("debugForceEvent"),applyDebugEventBtn=$("applyDebugEventBtn");
let state;
const debugMode = new URLSearchParams(window.location.search).get("debug")==="1";
let debugForceEventKey = null;
const livingCost=()=>LIFE_PLAN_COST[state.lifePlanLevel];
const net=()=>Math.round(state.cash+state.investmentBalance-state.debt);
const isCleared=()=>net()>=TARGET_NET_WORTH&&state.debt<CLEAR_DEBT_LIMIT;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rand=(a,b)=>a+Math.random()*(b-a);

function resetGame(){state={month:1,cash:100000,income:200000,hp:80,stress:20,debt:0,investmentBalance:0,investmentType:null,lastInvestMonth:null,gameOver:false,cleared:false,finished:false,resultType:null,logs:[],goodWorkFlag:false,sidejobStreak:0,sidejobFatigue:0,mainJobScore:2,investmentStreak:0,stressDangerMonths:0,lastEvents:[],refreshCooldown:0,lifePlanLevel:0,rebalanceCooldown:0};setEventCard(["INFO","ゲーム開始","今月の行動を選んでください。","なし"]);summary.textContent="まだ行動していません。";message.textContent="生活を立て直しながら、資産200万円を目指そう。";render();}
function canSell(){return state.investmentBalance>0&&state.lastInvestMonth!==state.month;}

function pickEvent(action){
  let pool=[];
  if(action==="work") pool=["overtime","review","mistake","catPark","doomscroll","save","expense"];
  if(action==="sidejob") pool=["sideSuccess","deadline","sideCancel","mainImpact","sleep","waste"];
  if(action==="rest") pool=["recovery","refreshMood","catPark","bath","friendTalk","save"];
  if(action==="invest") pool=["investUp","investDown","marketFear","bonus","expense","noFun","declineInvite","noMargin","marketDistract","overInvested"];
  if(action==="invest"&&state.investmentType==="fund") pool.push("fundRoutine","fundTight");
  if(action==="invest"&&state.investmentType==="stock") pool.push("earningsBeat","scandal","dividend","shareholderPerk");
  if(action==="invest"&&state.investmentType==="crypto") pool.push("cryptoSwingStress","cryptoTempt");
  if(action==="borrow") pool=["debtPressure","paymentNotice","expense","bonus"];
  if(action==="refresh") pool=["refreshMood","recovery","save","bonus"];
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
  if(state.sidejobFatigue>=4){["deadline","mainImpact","sleep","sideCancel"].forEach(k=>{if(w[k])w[k]+=0.8;});}
  if(state.sidejobFatigue>=7){["deadline","mainImpact","sleep","sideCancel"].forEach(k=>{if(w[k])w[k]+=1.2;}); ["sideSuccess"].forEach(k=>{if(w[k])w[k]*=0.6;});}
  if(state.mainJobScore>=4){["review"].forEach(k=>{if(w[k])w[k]+=0.8;});}
  if(state.mainJobScore<=1){["mistake","mainImpact"].forEach(k=>{if(w[k])w[k]+=0.7;});}
  if(state.investmentType==="crypto"){["marketFear","investDown","cryptoSwingStress"].forEach(k=>{if(w[k])w[k]+=1;});}
  if(state.investmentStreak>=2){["fundTight","cryptoSwingStress","deadline","mental"].forEach(k=>{if(w[k])w[k]+=0.8;});}
  if(state.investmentStreak>=3){["noFun","declineInvite","noMargin","savingFatigue","marketDistract","overInvested"].forEach(k=>{if(w[k])w[k]+=1;});}
  if(state.investmentStreak>=5){["noFun","declineInvite","noMargin","savingFatigue","marketDistract","overInvested"].forEach(k=>{if(w[k])w[k]+=1.3;});}
  if(state.lifePlanLevel>=2&&state.investmentStreak>=3){["noFun","declineInvite","noMargin","savingFatigue"].forEach(k=>{if(w[k])w[k]+=0.8;});}
  if(action==="invest"&&state.investmentType==="fund"){["noFun","declineInvite","noMargin","overInvested"].forEach(k=>{if(w[k])w[k]+=0.4;});}
  if(action==="invest"&&state.investmentType==="stock"){["noFun","declineInvite","noMargin","marketDistract","overInvested"].forEach(k=>{if(w[k])w[k]+=0.8;});}
  if(action==="invest"&&state.investmentType==="crypto"){["noFun","declineInvite","noMargin","marketDistract","overInvested","cryptoSwingStress"].forEach(k=>{if(w[k])w[k]+=1.2;});}
  state.lastEvents.forEach(k=>{if(w[k])w[k]*=0.2;});

  let sum=0; pool.forEach(k=>sum+=w[k]); let r=Math.random()*sum;
  if(debugMode&&debugForceEventKey&&pool.includes(debugForceEventKey)) return debugForceEventKey;
  for(const k of pool){r-=w[k]; if(r<=0) return k;}
  return pool[0];
}

function doAction(action){
  if(state.finished||state.gameOver||state.cleared||state.resultType) return;
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
  const rec={month:state.month,action:actionLabels[action]||"不明",income:0,expense:0,investPnL:0,debtRepay:0,event:"なし",eventEffect:"-",salaryIncome:0,sideIncome:0,eventIncome:0,eventExpense:0,sellIncome:0,sellFee:0,investBuy:0,livingCost:0};
  const wasHighStress = state.stress>=90;
  const before=net(); if(state.refreshCooldown>0) state.refreshCooldown--;
  if(state.rebalanceCooldown>0) state.rebalanceCooldown--;

  if(action==="work"){state.cash+=state.income; rec.income+=state.income; rec.salaryIncome+=state.income; state.hp-=10; state.stress+=8; state.sidejobStreak=0; state.investmentStreak=0; state.sidejobFatigue-=1; state.mainJobScore+=1;}
  if(action==="sidejob"){let rate=(state.stress>=85?0.9:1); if(state.sidejobFatigue>=7)rate*=0.6; else if(state.sidejobFatigue>=4)rate*=0.8; const base=Math.round(rand(45000,100000)*rate); state.cash+=state.income+base; rec.income+=state.income+base; rec.salaryIncome+=state.income; rec.sideIncome+=base; state.hp-=(20+(state.sidejobStreak>=3?6:0)); state.stress+=(14+(state.sidejobStreak>=2?6:0)); state.sidejobStreak++; state.investmentStreak=0; state.sidejobFatigue += state.sidejobFatigue>=6?3:2; if(state.sidejobFatigue>=7) state.mainJobScore-=1;}
  if(action==="rest"){state.cash+=145000; rec.income+=145000; rec.salaryIncome+=145000; state.hp+=24; state.stress-=25; state.sidejobStreak=0; state.investmentStreak=0; state.sidejobFatigue-=2;}
  if(action==="refresh"){state.cash+=70000; rec.income+=150000; rec.salaryIncome+=150000; rec.expense+=80000; state.hp+=15; state.stress-=70; state.sidejobStreak=0; state.investmentStreak=0; state.refreshCooldown=REFRESH_COOLDOWN; state.sidejobFatigue-=4;}
  if(action==="rebalance"){state.cash+=150000; rec.income+=150000; state.hp-=5; state.stress+=3; state.lifePlanLevel+=1; state.sidejobStreak=0; state.investmentStreak=0; state.rebalanceCooldown=state.lifePlanLevel>=3?0:REBALANCE_COOLDOWN; state.sidejobFatigue-=1;}
  if(action==="invest"){state.cash+=state.income; rec.income+=state.income; rec.salaryIncome+=state.income; state.sidejobStreak=0; const selectedType=investmentType.value; state.cash-=INVEST_AMOUNT;state.investmentBalance+=INVEST_AMOUNT; if(!state.investmentType) state.investmentType=selectedType; state.lastInvestMonth=state.month; rec.expense+=INVEST_AMOUNT; rec.investBuy+=INVEST_AMOUNT; state.investmentStreak += 1; if(state.debt>0)state.stress+=5; state.sidejobFatigue-=1;}
  if(action==="borrow"){state.cash+=state.income+100000; rec.income+=state.income+100000; rec.salaryIncome+=state.income; state.debt+=100000; state.sidejobStreak=0; state.investmentStreak=0; state.sidejobFatigue-=1;}
  if(action==="sell"){
    state.cash+=state.income;
    rec.income+=state.income;
    rec.salaryIncome=state.income;
    const d=investmentDefs[state.investmentType];
    const fee=Math.round(state.investmentBalance*d.fee);
    const received=state.investmentBalance-fee;
    state.cash+=received;
    rec.income+=received;
    rec.expense+=fee;
    rec.sellIncome=received;
    rec.sellFee=fee;
    rec.event=`${d.label}を全額売却`;
    rec.eventEffect=`手数料 ${fee.toLocaleString()}円`;
    state.investmentBalance=0;
    state.investmentType=null;
    state.lastInvestMonth=null;
    state.sidejobStreak=0;
    state.investmentStreak=0;
    state.sidejobFatigue-=1;
  }

  const evKey=pickEvent(action); const ev=events[evKey]; const beforeInv=state.investmentBalance; const beforeEventCash=state.cash; ev[4](state); rec.event=ev[1]; rec.eventEffect=ev[3]; const eventCashDelta=state.cash-beforeEventCash; if(eventCashDelta>0)rec.eventIncome+=eventCashDelta; if(eventCashDelta<0)rec.eventExpense+=Math.abs(eventCashDelta);

  if(state.investmentBalance>0&&state.investmentType){const def=investmentDefs[state.investmentType]; const d=Math.round(state.investmentBalance*rand(def.min,def.max)); state.investmentBalance+=d; rec.investPnL+=state.investmentBalance-beforeInv; if(state.investmentType==="crypto"&&d<0&&Math.abs(d)>state.investmentBalance*0.12){state.stress+=16; rec.eventEffect+=` / 追加影響: 乱高下ストレス +16`;}}
  if(state.stress>=90 && ["work","sidejob","invest","borrow","sell"].includes(action)){state.hp-=3; rec.eventEffect+=` / 追加影響: 高ストレス疲労（体力 -3）`;}
  if(wasHighStress && action==="rest"){state.stress-=5; rec.eventEffect+=` / 追加影響: 久々に休めた（ストレス -5）`;}
  if(wasHighStress && action==="refresh"){state.stress-=8; rec.eventEffect+=` / 追加影響: しっかり切り替えた（ストレス -8）`;}

  state.cash-=livingCost(); rec.expense+=livingCost(); rec.livingCost=livingCost();
  if(state.debt>0){if(state.debt>=200000)state.stress+=3; let repay=state.debt<10000?state.debt:Math.max(10000,Math.floor(state.debt*0.1)); if(state.cash>=repay){state.cash-=repay;state.debt-=repay;rec.debtRepay=repay;rec.expense+=repay;} else {state.stress+=18;state.debt+=20000;rec.event+=" / 延滞";} state.debt=Math.round(state.debt*1.03);}

  if(state.month===12||state.month===24){const badCount=[state.stress>=80,state.hp<=20,state.debt>=400000].filter(Boolean).length;const raise=(badCount===0||(state.goodWorkFlag&&badCount<=1)||state.mainJobScore>=4)&&state.sidejobStreak<3&&state.mainJobScore>=2;if(raise){state.income+=10000;rec.event+=" / 昇給+10,000";}else rec.event+=" / 昇給なし";state.goodWorkFlag=false;}

  state.hp=clamp(state.hp,0,100); state.stress=clamp(state.stress,0,100); state.sidejobFatigue=clamp(state.sidejobFatigue,0,10); state.mainJobScore=clamp(state.mainJobScore,0,6);
  if(state.stress===100) state.stressDangerMonths+=1; else if(state.stress<90) state.stressDangerMonths=0;
  let reason=""; if(state.cash<0)reason="cash"; if(state.hp<=0)reason="hp"; if(state.debt>=500000)reason="debt"; if(state.stressDangerMonths>=3)reason="stress"; if(reason)state.gameOver=true;
  if(!state.gameOver&&isCleared())state.cleared=true;

  rec.deltaNet=net()-before; state.logs.unshift(rec); state.lastEvents.unshift(evKey); state.lastEvents=state.lastEvents.slice(0,3); showSummary(rec);
  const actedOnFinalMonth = state.month===MAX_MONTH;
  if(!state.gameOver&&!state.cleared&&state.month<MAX_MONTH)state.month++;
  if(state.gameOver){state.finished=true; state.resultType="gameOver";}
  else if(state.cleared){state.finished=true; state.resultType="clear";}
  else if(actedOnFinalMonth){state.finished=true; state.resultType="timeUp";}
  message.textContent=state.cleared?"🎉 クリア！純資産200万円以上＆借金20万円未満達成":state.gameOver?gameOverMessage(reason):"今月の行動を選んでください。";
  if(state.finished) setResultCard(reason); else setEventCard(ev);
  render();
}

function gameOverMessage(r){if(r==="cash")return"現金不足で生活が崩壊した。";if(r==="hp")return"体力が尽きて行動不能。";if(r==="debt")return"借金が膨張し身動き不能。";if(r==="stress")return"心身の限界END：ストレスが限界に達し、生活を続けられなくなった。";return"36ヶ月終了。目標条件を満たせなかった。";}
function setEventCard(ev){eventCard.className=`event-card ${ev[0].toLowerCase()}`;eventCard.innerHTML=`<div class='event-badge'>${ev[0]}</div><h3>${ev[1]}</h3><p>${ev[2]}</p><p class='event-effect'>効果：${ev[3]}</p>`;}
function setResultCard(gameOverReason){
  const nw=net();
  if(state.resultType==="gameOver"){
    setEventCard(["BAD","GAME OVER",gameOverMessage(gameOverReason),`最終純資産：${nw.toLocaleString()}円 / 借金：${state.debt.toLocaleString()}円`]);
    return;
  }
  if(state.resultType==="clear"){
    setEventCard(["GOOD","クリア達成","純資産200万円以上 & 借金20万円未満を達成した。",`達成月：${state.month}ヶ月目 / 純資産：${nw.toLocaleString()}円`]);
    return;
  }
  if(state.resultType==="timeUp"){
    const remain=Math.max(0,TARGET_NET_WORTH-nw);
    const debtCond=state.debt<CLEAR_DEBT_LIMIT?"達成":"未達";
    if(nw>=TARGET_NET_WORTH&&state.debt>=CLEAR_DEBT_LIMIT){
      setEventCard(["WARN","36ヶ月終了","純資産は目標に届いたが、借金条件を満たせなかった。",`最終純資産：${nw.toLocaleString()}円 / 借金：${state.debt.toLocaleString()}円 / 借金条件：未達`]);
    }else{
      setEventCard(["WARN","36ヶ月終了","目標の純資産200万円には届かなかった。",`最終純資産：${nw.toLocaleString()}円 / 目標まであと${remain.toLocaleString()}円 / 借金条件：${debtCond}`]);
    }
  }
}
function progressStatusText(){
  if(state.finished&&state.resultType==="gameOver") return "GAME OVER";
  if(state.finished&&state.resultType==="clear") return "クリア条件達成";
  if(state.finished&&state.resultType==="timeUp") return "36ヶ月終了：目標未達";
  const nw=net();
  if(nw<TARGET_NET_WORTH) return `目標まであと${(TARGET_NET_WORTH-nw).toLocaleString()}円`;
  if(state.debt<CLEAR_DEBT_LIMIT) return "クリア条件達成";
  return "純資産達成 / 借金条件未達";
}
function showSummary(r){
  const b=state.cleared?"<div class='result-banner clear'>🎉 クリア達成</div>":state.gameOver?"<div class='result-banner over'>GAME OVER</div>":"";
  summary.innerHTML=`${b}
  <ul>
    <li>今月の行動：${r.action}</li>
  </ul>
  <h4>収入</h4>
  <ul>
    <li>本業収入：${r.salaryIncome.toLocaleString()}円</li>
    <li>副業収入：${r.sideIncome.toLocaleString()}円</li>
    <li>イベント収入：${r.eventIncome.toLocaleString()}円</li>
  </ul>
  <h4>支出</h4>
  <ul>
    <li>生活費：${r.livingCost.toLocaleString()}円</li>
    <li>借金返済：${r.debtRepay.toLocaleString()}円</li>
    <li>イベント支出：${r.eventExpense.toLocaleString()}円</li>
    <li>売却手数料：${r.sellFee.toLocaleString()}円</li>
  </ul>
  <h4>資産移動</h4>
  <ul>
    <li>投資購入：${r.investBuy.toLocaleString()}円</li>
    <li>投資売却入金：${r.sellIncome.toLocaleString()}円</li>
  </ul>
  <h4>評価額変動</h4>
  <ul><li>投資損益：${r.investPnL.toLocaleString()}円</li></ul>
  <h4>結果</h4>
  <ul>
    <li>純資産増減：${r.deltaNet.toLocaleString()}円</li>
    <li>発生イベント：${r.event}</li>
    <li>イベント効果：${r.eventEffect}</li>
  </ul>`;
}

function render(){
  investmentType.querySelector("option[value='crypto']").disabled=state.month<=12;
  const nw=net();
  const items=[["現在月",`${state.month}/${MAX_MONTH}`],["現金",`${state.cash.toLocaleString()}円`],["純資産",`${nw.toLocaleString()}円`],["生活費",`${livingCost().toLocaleString()}円`],["生活見直しLv",state.lifePlanLevel],["投資評価額",`${Math.round(state.investmentBalance).toLocaleString()}円`],["借金",`${state.debt.toLocaleString()}円`],["月収",`${state.income.toLocaleString()}円`],["体力",state.hp],["ストレス",state.stress],["ストレス危険",`${state.stressDangerMonths}/3`],["副業疲労",state.sidejobFatigue],["本業評価",state.mainJobScore],["副業連続",`${state.sidejobStreak}ヶ月`],["投資連続",`${state.investmentStreak}ヶ月`],["投資タイプ",state.investmentType?investmentDefs[state.investmentType].label:"なし"],["売却可否",canSell()?"可能":"不可"]];
  statusGrid.innerHTML=items.map(([k,v])=>`<div class='status-item ${(k==="体力"&&state.hp<=20)||(k==="借金"&&state.debt>=400000)?"bad":""} ${(k==="ストレス"&&state.stress>=80)||(k==="現金"&&state.cash<livingCost())||(k==="借金"&&state.debt>=200000)?"warn":""}'><strong>${k}</strong>${v}</div>`).join("");

  const chips=[`現在月 ${state.month}/${MAX_MONTH}`,`現金 ${state.cash.toLocaleString()}円`,`純資産 ${nw.toLocaleString()}円`,`借金 ${state.debt.toLocaleString()}円`,`生活費 ${livingCost().toLocaleString()}円`,`体力 ${state.hp}`,`ストレス ${state.stress}`,...(state.stressDangerMonths>0||state.stress>=90?[`ストレス危険 ${state.stressDangerMonths}/3`]:[]),`副業疲労 ${state.sidejobFatigue}`,`本業評価 ${state.mainJobScore}`,`評価額 ${Math.round(state.investmentBalance).toLocaleString()}円`,`投資タイプ ${state.investmentType?investmentDefs[state.investmentType].label:"なし"}`,`投資連続 ${state.investmentStreak}ヶ月`];
  quickStatusBar.innerHTML=chips.map(t=>{let c="quick-pill";if(t.includes("現金")&&state.cash<livingCost())c+=" warn";if(t.includes("体力")&&state.hp<=20)c+=" bad";if(t.includes("ストレス")&&state.stress>=80)c+=" warn";if(t.includes("ストレス危険")&&state.stressDangerMonths>=2)c+=" bad";if(t.includes("副業疲労")&&state.sidejobFatigue>=7)c+=" bad";if(t.includes("本業評価")&&state.mainJobScore<=1)c+=" warn";if(t.includes("借金")&&state.debt>=200000)c+=" warn";if(t.includes("不可"))c+=" warn";return `<span class='${c}'>${t}</span>`;}).join("");
  refreshCooldownEl.textContent=`リフレッシュ：${state.refreshCooldown>0?`あと${state.refreshCooldown}ヶ月`:`使用可能`} / 生活見直し：${state.lifePlanLevel>=3?`最大Lv`:state.rebalanceCooldown>0?`あと${state.rebalanceCooldown}ヶ月`:`使用可能`}`;

  wealthFill.style.width=`${clamp(nw/TARGET_NET_WORTH*100,0,100)}%`; milestoneMessage.textContent=progressStatusText();
  eventLog.innerHTML=state.logs.map(l=>`<li>${l.month}ヶ月目：${l.action} / ${l.event}（${l.eventEffect}）</li>`).join("");
  sellBtn.disabled=!canSell()||state.finished||state.gameOver||state.cleared;
  document.querySelectorAll("[data-action]").forEach(btn=>{btn.disabled=state.finished||state.gameOver||state.cleared||(btn.dataset.action==="refresh"&&state.refreshCooldown>0)||(btn.dataset.action==="rebalance"&&(state.lifePlanLevel>=3||state.rebalanceCooldown>0));});
  if(debugMode) renderDebugPanel();
}

function renderDebugPanel(){
  if(!debugPanel) return;
  debugPanel.hidden=false;
  const lastLog=state.logs[0];
  const lastFx=lastLog?lastLog.eventEffect:"-";
  debugInfo.innerHTML=`<small>finished=${state.finished} / resultType=${state.resultType} / cleared=${state.cleared} / gameOver=${state.gameOver} / net=${net().toLocaleString()} / isCleared=${isCleared()} / gameOverMessage=${gameOverMessage(state.resultType==="gameOver"?"stress":"")} / 直近追加影響=${lastFx}</small>`;
  debugStateInput.value=JSON.stringify({
    month:state.month,cash:state.cash,debt:state.debt,hp:state.hp,stress:state.stress,stressDangerMonths:state.stressDangerMonths,income:state.income,lifePlanLevel:state.lifePlanLevel,refreshCooldown:state.refreshCooldown,rebalanceCooldown:state.rebalanceCooldown,sidejobFatigue:state.sidejobFatigue,mainJobScore:state.mainJobScore,investmentBalance:state.investmentBalance,investmentType:state.investmentType,investmentStreak:state.investmentStreak,lastInvestMonth:state.lastInvestMonth,finished:state.finished,resultType:state.resultType,gameOver:state.gameOver,cleared:state.cleared
  },null,2);
}
function applyDebugState(){
  try{const p=JSON.parse(debugStateInput.value);Object.assign(state,p);render();}catch(e){message.textContent="デバッグJSONの形式が不正です。";}
}
function applyPreset(k){
  const base={finished:false,resultType:null,gameOver:false,cleared:false,month:36,cash:500000,debt:0,hp:80,stress:20,stressDangerMonths:0,investmentBalance:0,investmentType:null,investmentStreak:0,sidejobFatigue:0,mainJobScore:2,lastInvestMonth:null};
  if(k==="A") Object.assign(state,base,{cash:600000,debt:0});
  if(k==="B") Object.assign(state,base,{cash:1980000,debt:0,income:220000});
  if(k==="C") Object.assign(state,base,{cash:1200000,debt:0,income:200000});
  if(k==="D") Object.assign(state,base,{cash:2200000,debt:220000,month:20});
  if(k==="E") Object.assign(state,base,{cash:2100000,debt:0,hp:0});
  if(k==="F") Object.assign(state,base,{month:20,stress:100,stressDangerMonths:2});
  if(k==="G") Object.assign(state,base,{month:20,stress:95,hp:50});
  if(k==="H") Object.assign(state,base,{month:20,stress:95,hp:40});
  if(k==="I") Object.assign(state,base,{month:20,cash:500000,investmentBalance:300000,investmentType:"fund",lastInvestMonth:18});
  if(k==="J") Object.assign(state,base,{month:10,cash:100000,debt:250000,investmentBalance:50000,investmentType:"fund",lastInvestMonth:10});
  render();
}

document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>doAction(btn.dataset.action)));
sellBtn.addEventListener("click",()=>doAction("sell"));
restartBtn.addEventListener("click",resetGame);
if(debugMode&&debugPanel){
  applyDebugStateBtn.addEventListener("click",applyDebugState);
  copyDebugStateBtn.addEventListener("click",()=>navigator.clipboard?.writeText(debugStateInput.value));
  applyDebugEventBtn.addEventListener("click",()=>{debugForceEventKey=(debugForceEventInput.value||"").trim()||null;render();});
  document.querySelectorAll("[data-debug-preset]").forEach(btn=>btn.addEventListener("click",()=>applyPreset(btn.dataset.debugPreset)));
}
resetGame();
