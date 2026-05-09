const MAX_MONTH = 36;
const LIVING_COST = 170000;
const INVEST_AMOUNT = 50000;

const actionLabels = {
  work: "普通に働く",
  sidejob: "副業を頑張る",
  rest: "休養する",
  invest: "投資を増やす",
  borrow: "借金する",
  sell: "売却する",
};

const investmentDefs = {
  fund: { label: "投資信託", min: -0.02, max: 0.03, fee: 0.01 },
  stock: { label: "個別株", min: -0.1, max: 0.15, fee: 0.02 },
  crypto: { label: "仮想通貨", min: -0.35, max: 0.55, fee: 0.05 },
};

const events = [
  { key: "overtime", title: "残業続き", text: "仕事が立て込み、少し稼げたが消耗した。", effect: "現金 +10,000 / 体力 -10 / ストレス +15", tag: "warn", apply: s => { s.cash += 10000; s.hp -= 10; s.stress += 15; } },
  { key: "review", title: "仕事評価", text: "地道な努力が上司に届いた。", effect: "昇給判定フラグ +1", tag: "good", apply: s => { s.goodWorkFlag = true; } },
  { key: "mistake", title: "小さなミス", text: "本業で小さな失敗。信頼は失っていないが痛い。", effect: "現金 -10,000 / ストレス +10", tag: "bad", apply: s => { s.cash -= 10000; s.stress += 10; } },
  { key: "raiseHint", title: "昇給の前兆", text: "来期評価の話が聞こえた。少し前向きになれた。", effect: "昇給判定フラグ +1 / ストレス -5", tag: "good", apply: s => { s.goodWorkFlag = true; s.stress -= 5; } },
  { key: "sick", title: "体調不良", text: "無理がたたり、通院で時間とお金が消えた。", effect: "現金 -20,000 / 体力 -12", tag: "bad", apply: s => { s.cash -= 20000; s.hp -= 12; } },
  { key: "sleep", title: "睡眠不足", text: "睡眠が浅く、集中力が落ちた。", effect: "体力 -8 / ストレス +8", tag: "warn", apply: s => { s.hp -= 8; s.stress += 8; } },
  { key: "mental", title: "メンタル不調", text: "気持ちが沈み、判断が雑になった。", effect: "体力 -5 / ストレス +15", tag: "bad", apply: s => { s.hp -= 5; s.stress += 15; } },
  { key: "recovery", title: "休養が効いた", text: "うまく休めて、生活リズムが整った。", effect: "体力 +8 / ストレス -8", tag: "good", apply: s => { s.hp += 8; s.stress -= 8; } },
  { key: "expense", title: "急な出費", text: "想定外の支払いが発生した。", effect: "現金 -30,000", tag: "bad", apply: s => { s.cash -= 30000; } },
  { key: "appliance", title: "家電故障", text: "冷蔵庫が壊れ、買い替えが必要に。", effect: "現金 -40,000", tag: "bad", apply: s => { s.cash -= 40000; } },
  { key: "ceremony", title: "冠婚葬祭", text: "急な式の出費。人付き合いは大事だ。", effect: "現金 -20,000 / ストレス +5", tag: "warn", apply: s => { s.cash -= 20000; s.stress += 5; } },
  { key: "save", title: "節約成功", text: "自炊と固定費見直しが効いた。", effect: "現金 +20,000", tag: "good", apply: s => { s.cash += 20000; } },
  { key: "investUp", title: "投資好調", text: "保有資産が順調に伸びた。", effect: "投資残高 +5%", tag: "good", apply: s => { if (s.investmentBalance > 0) s.investmentBalance += Math.round(s.investmentBalance * 0.05); } },
  { key: "investDown", title: "投資下落", text: "市場が冷え込み、資産が目減りした。", effect: "投資残高 -6%", tag: "bad", apply: s => { if (s.investmentBalance > 0) s.investmentBalance -= Math.round(s.investmentBalance * 0.06); } },
  { key: "marketFear", title: "市場不安", text: "悪材料が広がり、価格が乱高下した。", effect: "投資残高 -4% / ストレス +8", tag: "warn", apply: s => { if (s.investmentBalance > 0) s.investmentBalance -= Math.round(s.investmentBalance * 0.04); s.stress += 8; } },
  { key: "snsHype", title: "SNS投資煽り", text: "強気な投稿に心が揺れた。", effect: "ストレス +6", tag: "warn", apply: s => { s.stress += 6; } },
  { key: "debtPressure", title: "返済プレッシャー", text: "返済日が近づき気持ちが重い。", effect: "ストレス +10", tag: "bad", apply: s => { s.stress += 10; } },
  { key: "paymentNotice", title: "支払い通知", text: "督促通知に気持ちがざわつく。", effect: "現金 -10,000 / ストレス +8", tag: "bad", apply: s => { s.cash -= 10000; s.stress += 8; } },
  { key: "bonus", title: "臨時収入", text: "思わぬ入金があり、ひと息つけた。", effect: "現金 +30,000", tag: "good", apply: s => { s.cash += 30000; } },
  { key: "waste", title: "無駄遣い", text: "ストレスで散財してしまった。", effect: "現金 -25,000 / ストレス +5", tag: "warn", apply: s => { s.cash -= 25000; s.stress += 5; } },
];

const $ = (id) => document.getElementById(id);
const statusGrid = $("statusGrid");
const message = $("message");
const summary = $("monthlySummary");
const eventLog = $("eventLog");
const eventCard = $("eventCard");
const investmentType = $("investmentType");
const sellBtn = $("sellBtn");
const restartBtn = $("restartBtn");
const wealthFill = $("wealthFill");
const milestoneMessage = $("milestoneMessage");

let state;

function resetGame() {
  state = {
    month: 1, age: 22, education: "大卒", job: "中小企業の新人会社員",
    cash: 100000, income: 200000, hp: 80, stress: 20, debt: 0,
    investmentBalance: 0, investmentType: null, lastInvestMonth: null,
    gameOver: false, cleared: false, logs: [], goodWorkFlag: false,
    sidejobStreak: 0, lastEvent: null,
  };
  summary.textContent = "まだ行動していません。";
  message.textContent = "Phase 2開始：イベントが人生を揺らします。";
  setEventCard({ title: "ゲーム開始", text: "最初の一歩。今月の行動を選ぼう。", effect: "効果：なし", tag: "info" });
  render();
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randRate(min, max) { return min + Math.random() * (max - min); }
function netWorth() { return Math.round(state.cash + state.investmentBalance - state.debt); }
function canSell() { return state.investmentBalance > 0 && state.lastInvestMonth !== state.month; }

function doAction(action) {
  if (state.gameOver || state.cleared) return;
  const rec = { month: state.month, action: actionLabels[action], income: 0, expense: 0, investPnL: 0, debtRepay: 0, event: "なし", eventEffect: "-" };
  const beforeNet = netWorth();

  if (action === "work") { state.cash += state.income; rec.income += state.income; state.hp -= 10; state.stress += 8; state.sidejobStreak = 0; }
  if (action === "sidejob") {
    const base = randInt(45000, 100000);
    const penalty = state.sidejobStreak >= 2 ? 10 : 0;
    state.cash += state.income + base; rec.income += state.income + base;
    state.hp -= (20 + (state.sidejobStreak >= 3 ? 5 : 0));
    state.stress += (15 + penalty);
    state.sidejobStreak += 1;
  }
  if (action === "rest") { state.cash += 145000; rec.income += 145000; state.hp += 20; state.stress -= 15; state.sidejobStreak = 0; }
  if (action === "invest") {
    state.cash += state.income; rec.income += state.income; state.sidejobStreak = 0;
    const chosenType = investmentType.value;
    if (chosenType === "crypto" && state.month <= 12) {
      message.textContent = "仮想通貨は13ヶ月目から解禁です。"; render(); return;
    }
    if (state.cash < 250000 || (state.cash - INVEST_AMOUNT) < LIVING_COST) {
      message.textContent = "生活防衛資金不足：現金25万円以上かつ投資後も生活費を残す必要があります。";
    } else {
      state.cash -= INVEST_AMOUNT;
      state.investmentBalance += INVEST_AMOUNT;
      state.investmentType = chosenType;
      state.lastInvestMonth = state.month;
      rec.expense += INVEST_AMOUNT;
    }
  }
  if (action === "borrow") { state.cash += state.income + 100000; rec.income += state.income + 100000; state.debt += 100000; state.sidejobStreak = 0; }

  const event = rollEvent();
  const beforeEventInvest = state.investmentBalance;
  event.apply(state);
  rec.event = event.title;
  rec.eventEffect = event.effect;

  if (state.investmentBalance > 0 && state.investmentType) {
    const def = investmentDefs[state.investmentType];
    const delta = Math.round(state.investmentBalance * randRate(def.min, def.max));
    state.investmentBalance += delta;
    rec.investPnL += (state.investmentBalance - beforeEventInvest);
    if (state.investmentType === "crypto" && delta < 0 && Math.abs(delta) > state.investmentBalance * 0.12) {
      state.stress += 18;
      rec.event += "（暴落ショック）";
      rec.eventEffect += " / ストレス +18";
    }
  }

  state.cash -= LIVING_COST; rec.expense += LIVING_COST;

  if (state.debt > 0) {
    if (state.debt >= 200000) state.stress += 3;
    let repayment = state.debt < 10000 ? state.debt : Math.max(10000, Math.floor(state.debt * 0.1));
    if (state.cash >= repayment) {
      state.cash -= repayment; state.debt -= repayment; rec.debtRepay = repayment; rec.expense += repayment;
    } else {
      state.stress += 20; state.debt += 20000; rec.event += " / 延滞"; rec.eventEffect += " / 延滞ペナルティ";
    }
    state.debt = Math.round(state.debt * 1.03);
  }

  if (state.month === 12 || state.month === 24) {
    const badCount = [state.stress >= 80, state.hp <= 20, state.debt >= 400000].filter(Boolean).length;
    const canRaise = badCount === 0 || (state.goodWorkFlag && badCount <= 1);
    rec.event += canRaise ? " / 昇給+10,000" : " / 昇給なし";
    if (canRaise) state.income += 10000;
    state.goodWorkFlag = false;
  }

  state.hp = clamp(state.hp, 0, 100); state.stress = clamp(state.stress, 0, 100);
  let overReason = "";
  if (state.cash < 0) overReason = "cash";
  if (state.hp <= 0) overReason = "hp";
  if (state.debt >= 500000) overReason = "debt";
  if (overReason) state.gameOver = true;
  if (!state.gameOver && state.month === MAX_MONTH && netWorth() >= 1000000) state.cleared = true;

  rec.deltaNet = netWorth() - beforeNet;
  state.logs.unshift(rec);
  setEventCard({ title: event.title, text: event.text, effect: `効果：${event.effect}`, tag: event.tag });
  showSummary(rec, overReason);

  if (!state.gameOver && !state.cleared && state.month < MAX_MONTH) state.month += 1;
  else if (!state.gameOver && !state.cleared && state.month === MAX_MONTH) { state.gameOver = true; overReason = "time"; }

  if (state.cleared) message.textContent = "🎉 クリア！壊れずに資産100万円を達成。";
  else if (state.gameOver) message.textContent = gameOverMessage(overReason);
  else message.textContent = "次の月へ進みました。";
  render();
}

function gameOverMessage(reason) {
  if (reason === "cash") return "生活費を支払えなくなった。日々の生活が崩れてしまった。";
  if (reason === "hp") return "無理を続け、体が限界を迎えた。生活そのものが止まった。";
  if (reason === "debt") return "返済が膨らみ身動き不能。借金は未来への請求書だった。";
  return "36ヶ月終了。目標純資産に届かなかった。戦略を見直そう。";
}

function rollEvent() {
  const weights = {
    overtime: 7, review: 6, mistake: 6, raiseHint: 5,
    sick: 6, sleep: 6, mental: 5, recovery: 5,
    expense: 6, appliance: 4, ceremony: 5, save: 6,
    debtPressure: 4, paymentNotice: 4, bonus: 5, waste: 4,
    snsHype: 4,
  };

  if (state.investmentBalance > 0) {
    weights.investUp = 6; weights.investDown = 7; weights.marketFear = 6;
    if (state.investmentType === "crypto") { weights.marketFear += 6; weights.investDown += 4; }
  }
  if (state.hp <= 30) { weights.sick += 8; weights.sleep += 6; }
  if (state.stress >= 70) { weights.mental += 8; weights.expense += 5; weights.waste += 8; }
  if (state.debt >= 300000) { weights.debtPressure += 8; weights.paymentNotice += 8; }
  if (state.sidejobStreak >= 2) { weights.sleep += 6; weights.sick += 5; weights.mistake += 5; }

  const candidates = events.filter(e => weights[e.key]);
  let total = 0;
  candidates.forEach(e => total += weights[e.key]);
  let r = Math.random() * total;
  for (const e of candidates) {
    r -= weights[e.key];
    if (r <= 0) return e;
  }
  return candidates[0];
}

function sellAll() {
  if (state.gameOver || state.cleared) return;
  if (!canSell()) { message.textContent = "売却は購入翌月以降に可能です。"; return; }
  const def = investmentDefs[state.investmentType];
  const fee = Math.round(state.investmentBalance * def.fee);
  const receive = state.investmentBalance - fee;
  state.cash += receive;
  state.logs.unshift({ month: state.month, action: actionLabels.sell, income: receive, expense: fee, investPnL: 0, debtRepay: 0, event: `${def.label}を全額売却`, eventEffect: `手数料 ${fee.toLocaleString()}円`, deltaNet: receive - fee });
  state.investmentBalance = 0; state.investmentType = null; state.lastInvestMonth = null;
  message.textContent = `${def.label}を売却。手数料 ${fee.toLocaleString()}円。`;
  render();
}

function setEventCard({ title, text, effect, tag }) {
  eventCard.className = `event-card ${tag}`;
  eventCard.innerHTML = `<div class="event-badge">${tag.toUpperCase()}</div><h3>${title}</h3><p>${text}</p><p class="event-effect">${effect}</p>`;
}

function showSummary(rec) {
  const banner = state.cleared ? `<div class="result-banner clear">🎉 クリア達成</div>` : state.gameOver ? `<div class="result-banner over">GAME OVER</div>` : "";
  summary.innerHTML = `${banner}<ul>
    <li>今月の行動：${rec.action}</li>
    <li>収入：${rec.income.toLocaleString()}円</li>
    <li>支出：${rec.expense.toLocaleString()}円</li>
    <li>投資損益：${rec.investPnL.toLocaleString()}円</li>
    <li>借金返済額：${rec.debtRepay.toLocaleString()}円</li>
    <li>発生イベント：${rec.event}</li>
    <li>イベント効果：${rec.eventEffect}</li>
    <li>純資産増減：${rec.deltaNet.toLocaleString()}円</li>
  </ul>`;
}

function render() {
  investmentType.querySelector("option[value='crypto']").disabled = state.month <= 12;
  const nw = netWorth();
  const items = [
    ["現在月", `${state.month} / ${MAX_MONTH}`], ["現金", `${state.cash.toLocaleString()}円`], ["投資残高", `${Math.round(state.investmentBalance).toLocaleString()}円`],
    ["借金", `${state.debt.toLocaleString()}円`], ["純資産", `${nw.toLocaleString()}円`], ["月収", `${state.income.toLocaleString()}円`],
    ["体力", `${state.hp}`], ["ストレス", `${state.stress}`], ["副業連続", `${state.sidejobStreak}ヶ月`],
    ["投資タイプ", state.investmentType ? investmentDefs[state.investmentType].label : "なし"], ["売却可否", canSell() ? "可能" : "不可"]
  ];
  statusGrid.innerHTML = items.map(([k, v]) => {
    let cls = "status-item";
    if ((k === "体力" && state.hp <= 20) || (k === "借金" && state.debt >= 400000)) cls += " bad";
    if ((k === "ストレス" && state.stress >= 80) || (k === "借金" && state.debt >= 300000)) cls += " warn";
    return `<div class="${cls}"><strong>${k}</strong>${v}</div>`;
  }).join("");

  const pct = clamp((nw / 1000000) * 100, 0, 100);
  wealthFill.style.width = `${pct}%`;
  milestoneMessage.textContent = nw >= 1000000 ? "目標達成！" : nw >= 500000 ? "あと半分、ここからが勝負。" : nw >= 300000 ? "少し余裕が出てきた。油断禁物。" : "まずは生活を立て直そう。";

  eventLog.innerHTML = state.logs.map(log => `<li>${log.month}ヶ月目：${log.action} / ${log.event}（${log.eventEffect}）</li>`).join("");
  sellBtn.disabled = !canSell() || state.gameOver || state.cleared;
  document.querySelectorAll("[data-action]").forEach(btn => btn.disabled = state.gameOver || state.cleared);
}

document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => doAction(btn.dataset.action)));
sellBtn.addEventListener("click", sellAll);
restartBtn.addEventListener("click", resetGame);
resetGame();
