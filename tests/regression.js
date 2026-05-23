const fs = require('fs');
const vm = require('vm');

function createEl() {
  return {
    hidden: false,
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    className: '',
    listeners: {},
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    querySelector() { return createEl(); },
    querySelectorAll() { return []; }
  };
}

function createHarness(search = '') {
  const ids = [
    'statusGrid','message','monthlySummary','eventLog','eventCard','investmentType','sellBtn','restartBtn','wealthFill','milestoneMessage','quickStatusBar','refreshCooldown',
    'debugPanel','debugInfo','debugHistoryInfo','debugStateInput','applyDebugStateBtn','copyDebugStateBtn','debugForceEvent','applyDebugEventBtn'
  ];
  const byId = Object.fromEntries(ids.map((id) => [id, createEl()]));
  byId.investmentType.value = 'fund';

  const actionBtns = ['work','sidejob','rest','invest','borrow','refresh','rebalance'].map((action) => {
    const b = createEl();
    b.dataset = { action };
    return b;
  });
  const presetBtns = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((k) => {
    const b = createEl();
    b.dataset = { debugPreset: k };
    return b;
  });

  const document = {
    getElementById(id) { return byId[id] || createEl(); },
    querySelectorAll(selector) {
      if (selector === '[data-action]') return actionBtns;
      if (selector === '[data-debug-preset]') return presetBtns;
      return [];
    }
  };

  const context = {
    console,
    Math,
    JSON,
    Date,
    setTimeout,
    clearTimeout,
    navigator: { clipboard: { writeText() {} } },
    URLSearchParams,
    window: { location: { search }, __TEST_MODE: true },
    document
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('script.js', 'utf8'), context, { filename: 'script.js' });
  return { api: context.window.__gameTestApi, byId };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function run() {
  // A
  {
    const { api } = createHarness('?debug=1');
    api.applyPreset('A');
    const s = api.getState();
    assert(s.month === 36 && s.finished === false && s.resultType === null, 'A preset invalid');
  }
  // B
  {
    const { api } = createHarness('?debug=1');
    api.applyPreset('N');
    api.setForcedEvent('review');
    api.doAction('work');
    const s = api.getState();
    assert(s.finished && s.resultType === 'clear' && !s.gameOver, 'B clear failed');
  }
  // C
  {
    const { api } = createHarness('?debug=1');
    api.applyPreset('O');
    api.setForcedEvent('mistake');
    api.doAction('work');
    const s = api.getState();
    assert(s.finished && s.resultType === 'timeUp' && !s.gameOver, 'C timeUp failed');
  }
  // D
  {
    const { api } = createHarness('?debug=1');
    api.setState({ month: 36, cash: 2100000, debt: 0, hp: 1, stress: 95, stressDangerMonths: 2, finished: false, resultType: null, gameOver: false, cleared: false });
    api.setForcedEvent('mental');
    api.doAction('work');
    const s = api.getState();
    assert(s.resultType === 'gameOver' && s.gameOver, 'D gameOver priority failed');
  }
  // E
  {
    const { api } = createHarness('?debug=1');
    api.setState({ month: 20, cash: 2100000, debt: 0, finished: false, resultType: null, gameOver: false, cleared: false });
    api.setForcedEvent('review');
    api.doAction('work');
    const s = api.getState();
    assert(!s.finished && s.resultType === null, 'E early clear lock wrong');
    assert(s.reachedTargetOnce === true && s.firstReachMonth === 20, 'E reach tracking failed');
  }
  // F
  {
    const { api } = createHarness('?debug=1');
    api.applyPreset('P');
    api.setForcedEvent('mistake');
    api.doAction('work');
    const s = api.getState();
    assert(s.resultType === 'timeUp' && s.reachedTargetOnce === true && s.firstReachMonth === 24, 'F post-reach drop failed');
  }
  // G/H/I/J/K/L combined
  {
    const { api } = createHarness('?debug=1');
    const h0 = api.getState().history.length;
    api.setForcedEvent('review');
    api.doAction('work');
    const s1 = api.getState();
    assert(s1.history.length === h0 + 1, 'G history valid action failed');
    const last = s1.history[s1.history.length - 1];
    ['month','cash','investmentBalance','debt','netWorth','hp','stress'].forEach((k) => assert(k in last, `G history missing ${k}`));

    // H investment overwrite no-op
    api.setState({ month: 10, cash: 500000, debt: 0, investmentBalance: 50000, investmentType: 'fund', finished: false, resultType: null });
    api.setInvestmentType('stock');
    const b = api.getState();
    api.doAction('invest');
    const a = api.getState();
    assert(a.month === b.month && a.cash === b.cash && a.investmentBalance === b.investmentBalance && a.investmentType === b.investmentType && a.history.length === b.history.length, 'H overwrite no-op failed');

    // I insufficient cash no-op
    api.setState({ month: 11, cash: 100000, debt: 0, investmentBalance: 0, investmentType: null, finished: false, resultType: null });
    api.setInvestmentType('fund');
    const c0 = api.getState();
    api.doAction('invest');
    const c1 = api.getState();
    assert(c1.month === c0.month && c1.cash === c0.cash && c1.history.length === c0.history.length, 'I insufficient cash no-op failed');

    // J sell
    api.setState({ month: 20, cash: 500000, debt: 0, investmentBalance: 300000, investmentType: 'fund', investmentStreak: 4, lastInvestMonth: 18, finished: false, resultType: null });
    const j0 = api.getState();
    api.setForcedEvent('realizeProfit');
    api.doAction('sell');
    const j1 = api.getState();
    assert(j1.investmentBalance === 0 && j1.investmentType === null && j1.investmentStreak === 0, 'J sell reset failed');
    assert(j1.cash > j0.cash, 'J sell cash not reflected');
    assert(j1.history.length === j0.history.length + 1, 'J sell history failed');
    api.setInvestmentType('stock');
    const j2 = api.getState();
    api.doAction('invest');
    const j3 = api.getState();
    assert(j3.investmentType === 'stock', 'J reinvest type switch failed');

    // K stress danger logic
    api.setState({ month: 22, cash: 600000, debt: 0, hp: 80, stress: 100, stressDangerMonths: 0, finished: false, resultType: null, gameOver: false });
    api.setForcedEvent('review');
    api.doAction('work');
    const k1 = api.getState();
    assert(k1.stressDangerMonths >= 1, 'K stress 100 progress failed');
    api.setState({ month: 23, cash: 600000, debt: 0, hp: 80, stress: 95, stressDangerMonths: 2, finished: false, resultType: null, gameOver: false });
    api.setForcedEvent('review');
    api.doAction('work');
    const k2 = api.getState();
    assert(k2.stressDangerMonths >= 2, 'K stress 90-99 hold failed');
    api.setState({ month: 24, cash: 600000, debt: 0, hp: 80, stress: 40, stressDangerMonths: 2, finished: false, resultType: null, gameOver: false });
    api.setForcedEvent('review');
    api.doAction('work');
    const k3 = api.getState();
    assert(k3.stressDangerMonths === 0, 'K stress <90 reset failed');

    // L post-finish lock
    api.setState({ finished: true, resultType: 'timeUp', gameOver: false });
    const l0 = api.getState();
    api.doAction('work');
    const l1 = api.getState();
    assert(JSON.stringify(l0) === JSON.stringify(l1), 'L finished lock failed');
  }

  // M debug panel visibility by URL gate
  {
    const normal = createHarness('');
    assert(normal.api.isDebugMode() === false, 'M normal debug mode false failed');
    const debug = createHarness('?debug=1');
    assert(debug.api.isDebugMode() === true, 'M debug mode true failed');
  }

  console.log('All regression checks passed.');
}

run();
