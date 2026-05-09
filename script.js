const MAX_MONTH = 36;
const LIVING_COST = 160000;

const investmentDefs = {
  fund: { label: "投資信託", min: -0.03, max: 0.05, fee: 0.01 },
  stock: { label: "個別株", min: -0.1, max: 0.15, fee: 0.02 },
  crypto: { label: "仮想通貨", min: -0.3, max: 0.5, fee: 0.05 },
};

let state;

const statusGrid = document.getElementById("statusGrid");
const message = document.getElementById("message");
const summary = document.getElementById("monthlySummary");
const eventLog = document.getElementById("eventLog");
const investmentType = document.getElementById("investmentType");
const sellBtn = document.getElementById("sellBtn");
const restartBtn = document.getElementById("restartBtn");

function resetGame() {
  state = {
    month: 1,
    age: 22,
    education: "大卒",
    job: "中小企業の新人会社員",
    cash: 200000,
    income: 200000,
    hp: 80,
    stress: 20,
    debt: 0,
    investmentBalance: 0,
    investmentType: null,
    lastInvestMonth: null,
    gameOver: false,
    cleared: false,
    logs: [],
    goodWorkFlag: false,
  };
  summary.textContent = "まだ行動していません。";
  message.textContent = "新しいゲームを開始しました。";
  render();
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randRate(min, max) { return min + Math.random() * (max - min); }
function netWorth() { return state.cash + state.investmentBalance - state.debt; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function canSell() { return state.investmentBalance > 0 && state.lastInvestMonth !== state.month; }

function doAction(action) {
  if (state.gameOver || state.cleared) return;
  const beforeNet = netWorth();
  const rec = { month: state.month, action, income: 0, expense: 0, investPnL: 0, debtRepay: 0, event: "なし" };

  if (action === "work") {
    state.cash += state.income; rec.income += state.income;
    state.hp -= 10; state.stress += 8;
  } else if (action === "sidejob") {
    const side = randInt(50000, 120000);
    state.cash += state.income + side; rec.income += state.income + side;
    state.hp -= 20; state.stress += 15;
  } else if (action === "rest") {
    state.cash += 150000; rec.income += 150000;
    state.hp += 20; state.stress -= 15;
  } else if (action === "invest") {
    state.cash += state.income; rec.income += state.income;
    if (state.cash >= 50000) {
      const t = investmentType.value;
      if (t === "crypto" && state.month <= 12) {
        message.textContent = "仮想通貨は13ヶ月目から解禁です。投資信託/個別株を選択してください。";
        render();
        return;
      }
      state.cash -= 50000;
      state.investmentBalance += 50000;
      state.investmentType = t;
      state.lastInvestMonth = state.month;
      rec.expense += 50000;
    } else {
      message.textContent = "現金不足で投資できませんでした。今月は通常勤務のみ。";
    }
  } else if (action === "borrow") {
    state.cash += state.income + 100000; rec.income += state.income + 100000;
    state.debt += 100000;
  }

  const ev = rollEvent();
  applyEvent(ev, rec);

  if (state.investmentBalance > 0 && state.investmentType) {
    const def = investmentDefs[state.investmentType];
    const rate = randRate(def.min, def.max);
    const delta = Math.round(state.investmentBalance * rate);
    state.investmentBalance += delta;
    rec.investPnL += delta;
  }

  state.cash -= LIVING_COST; rec.expense += LIVING_COST;

  if (state.debt > 0) {
    let repayment = state.debt < 10000 ? state.debt : Math.max(10000, Math.floor(state.debt * 0.1));
    if (state.cash >= repayment) {
      state.cash -= repayment;
      state.debt -= repayment;
      rec.debtRepay = repayment;
      rec.expense += repayment;
    } else {
      state.stress += 20;
      state.debt += 20000;
      rec.event += " / 延滞ペナルティ";
    }
    state.debt = Math.round(state.debt * 1.03);
  }

  if (state.month === 12 || state.month === 24) {
    const badCount = [state.stress >= 80, state.hp <= 20, state.debt >= 400000].filter(Boolean).length;
    const canRaise = badCount === 0 || (state.goodWorkFlag && badCount <= 1);
    if (canRaise) {
      state.income += 10000;
      rec.event += " / 昇給+10000";
    } else {
      rec.event += " / 昇給なし";
    }
    state.goodWorkFlag = false;
  }

  state.hp = clamp(state.hp, 0, 100);
  state.stress = clamp(state.stress, 0, 100);

  if (state.cash < 0 || state.hp <= 0 || state.debt >= 500000) state.gameOver = true;
  if (!state.gameOver && state.month === MAX_MONTH && netWorth() >= 1000000) state.cleared = true;

  const deltaNet = netWorth() - beforeNet;
  rec.deltaNet = deltaNet;
  state.logs.unshift(rec);
  showSummary(rec);

  if (!state.gameOver && !state.cleared && state.month < MAX_MONTH) state.month += 1;
  else if (!state.gameOver && !state.cleared && state.month === MAX_MONTH) state.gameOver = true;

  message.textContent = state.cleared ? "クリア！純資産100万円達成！" : state.gameOver ? "ゲーム終了。リスタートでもう一度挑戦！" : "次の月へ進みました。";
  render();
}

function rollEvent() {
  const options = [
    { key: "bonus", w: 12 },
    { key: "review", w: 10 },
    { key: "sick", w: 12 },
    { key: "expense", w: 12 },
    { key: "overtime", w: 10 },
  ];
  if (state.investmentBalance > 0) {
    options.push({ key: "investUp", w: 10 }, { key: "investDown", w: 10 });
  }
  if (state.hp <= 30) options.find(o => o.key === "sick").w += 15;
  if (state.stress >= 70) {
    options.find(o => o.key === "sick").w += 10;
    options.find(o => o.key === "expense").w += 10;
  }
  if (state.debt >= 300000) {
    options.find(o => o.key === "sick").w += 5;
    options.find(o => o.key === "expense").w += 5;
    options.find(o => o.key === "overtime").w += 5;
  }

  const sum = options.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * sum;
  for (const o of options) {
    r -= o.w;
    if (r <= 0) return o.key;
  }
  return options[0].key;
}

function applyEvent(key, rec) {
  const names = {
    bonus: "臨時収入", review: "仕事評価", investUp: "投資好調",
    sick: "体調不良", expense: "急な出費", overtime: "残業続き", investDown: "投資下落"
  };
  rec.event = names[key];
  if (key === "bonus") { state.cash += 30000; rec.income += 30000; }
  if (key === "review") state.goodWorkFlag = true;
  if (key === "investUp" && state.investmentBalance > 0) {
    const up = Math.round(state.investmentBalance * 0.05);
    state.investmentBalance += up; rec.investPnL += up;
  }
  if (key === "sick") { state.cash -= 20000; state.hp -= 10; rec.expense += 20000; }
  if (key === "expense") { state.cash -= 30000; rec.expense += 30000; }
  if (key === "overtime") { state.cash += 10000; state.hp -= 10; state.stress += 15; rec.income += 10000; }
  if (key === "investDown" && state.investmentBalance > 0) {
    const down = Math.round(state.investmentBalance * 0.05);
    state.investmentBalance -= down; rec.investPnL -= down;
  }
}

function sellAll() {
  if (state.gameOver || state.cleared) return;
  if (!canSell()) { message.textContent = "売却は購入翌月以降に可能です。"; return; }
  const def = investmentDefs[state.investmentType];
  const fee = Math.round(state.investmentBalance * def.fee);
  const received = state.investmentBalance - fee;
  state.cash += received;
  state.logs.unshift({ month: state.month, action: "売却", income: received, expense: fee, investPnL: 0, debtRepay: 0, event: `${def.label}を全額売却`, deltaNet: 0 });
  state.investmentBalance = 0;
  state.investmentType = null;
  state.lastInvestMonth = null;
  message.textContent = `${def.label}を売却しました（手数料${fee.toLocaleString()}円）。`;
  render();
}

function showSummary(rec) {
  summary.innerHTML = `
  <ul>
    <li>今月の行動：${rec.action}</li>
    <li>収入：${rec.income.toLocaleString()}円</li>
    <li>支出：${rec.expense.toLocaleString()}円</li>
    <li>投資損益：${rec.investPnL.toLocaleString()}円</li>
    <li>借金返済額：${rec.debtRepay.toLocaleString()}円</li>
    <li>発生イベント：${rec.event}</li>
    <li>純資産増減：${rec.deltaNet.toLocaleString()}円</li>
  </ul>`;
}

function render() {
  if (state.month <= 12) investmentType.querySelector("option[value='crypto']").disabled = true;
  else investmentType.querySelector("option[value='crypto']").disabled = false;

  const items = {
    "現在月": `${state.month} / ${MAX_MONTH}`,
    "年齢": `${state.age}歳`,
    "学歴": state.education,
    "職業": state.job,
    "現金": `${state.cash.toLocaleString()}円`,
    "投資残高": `${Math.round(state.investmentBalance).toLocaleString()}円`,
    "借金": `${state.debt.toLocaleString()}円`,
    "純資産": `${netWorth().toLocaleString()}円`,
    "月収": `${state.income.toLocaleString()}円`,
    "体力": state.hp,
    "ストレス": state.stress,
    "現在の投資タイプ": state.investmentType ? investmentDefs[state.investmentType].label : "なし",
    "売却可能": canSell() ? "可能" : "不可",
  };
  statusGrid.innerHTML = Object.entries(items).map(([k,v]) => `<div class="status-item"><strong>${k}</strong>${v}</div>`).join("");

  eventLog.innerHTML = state.logs.map(log => `<li>${log.month}ヶ月目: ${log.action} / ${log.event}</li>`).join("");
  sellBtn.disabled = !canSell() || state.gameOver || state.cleared;
  document.querySelectorAll("[data-action]").forEach(btn => btn.disabled = state.gameOver || state.cleared);
}

document.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", () => doAction(btn.dataset.action)));
sellBtn.addEventListener("click", sellAll);
restartBtn.addEventListener("click", resetGame);

resetGame();
