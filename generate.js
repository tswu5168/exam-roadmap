// 從 exam_phases.json 產生 index.html。
// 之後 exam_phases.json 若有校正（如⑦⑨暫定日期公布後更新），
// 重跑 `node generate.js` 即可重新產出整頁，不需手動改 HTML。
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'exam_phases.json');
const OUT_PATH = path.join(__dirname, 'index.html');

const { examPhases } = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function fmtRange(startISO, endISO, lastYearRef) {
  const [sy, sm, sd] = startISO.split('-');
  const [, em, ed] = endISO.split('-');
  const startPart = sy !== lastYearRef.year ? `${sy}/${sm}/${sd}` : `${sm}/${sd}`;
  lastYearRef.year = sy;
  return `${startPart}–${em}/${ed}`;
}

function isUrgent(task) {
  return task.startsWith('📣') || task.startsWith('🔴') || task.includes('黃金最後衝刺');
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}

const totalWeeks = examPhases.reduce((a, p) => a + p.weeks.length, 0);
const typeCounts = examPhases.reduce((acc, p) => { acc[p.type] = (acc[p.type] || 0) + 1; return acc; }, {});
const p10 = examPhases.find(p => p.type === '會考');
const examStartISO = p10.examStart;
const [ey, em, ed] = examStartISO.split('-');
const examDisplay = `${ey}/${em}/${ed}`;
const examEndDisplay = p10.examEnd.split('-').slice(1).join('/');

const tocHtml = examPhases.map(p => {
  const short = p.title.length > 8 ? p.title : p.title;
  return `    <a href="#p${p.examId}" data-type="${p.type}">${CIRCLED[p.examId - 1]} ${short}</a>`;
}).join('\n');

const lastYearRef = { year: null };
let flatWeekIndex = 0;

const phasesHtml = examPhases.map((p, pi) => {
  const isLastPhase = pi === examPhases.length - 1;
  const scopeTentative = p.scope.includes('暫定');
  const scopeClean = p.scope.replace(/[（(]暫定[）)]/, '').trim();
  const metaScope = scopeTentative
    ? `<span class="tentative">範圍：${scopeClean}（暫定，待學校公布校正）</span>`
    : `<span>範圍：${p.scope}</span>`;
  const dateDisplay = `${p.examStart.split('-').join('/')}–${p.examEnd.split('-').slice(1).join('/')}`;

  const weeksHtml = p.weeks.map((w, wi) => {
    flatWeekIndex++;
    const range = fmtRange(w.start, w.end, lastYearRef);
    const isFinalWeek = isLastPhase && wi === p.weeks.length - 1;
    const finalBadge = isFinalWeek
      ? `<br><span class="now-flag" style="background:var(--redpen)">考前當週</span>`
      : '';
    const tasksHtml = w.tasks.map(t =>
      `            <li${isUrgent(t) ? ' class="urgent"' : ''}>${t}</li>`
    ).join('\n');
    return `        <div class="week-row" data-start="${w.start}" data-end="${w.end}" data-index="${flatWeekIndex}">
          <div class="week-date"><span class="range">${range}</span>W${wi + 1}${finalBadge}</div>
          <ul class="week-tasks">
${tasksHtml}
          </ul>
        </div>`;
  }).join('\n');

  return `    <!-- P${p.examId} -->
    <section class="phase" id="p${p.examId}">
      <div class="nameplate">
        <div class="top-row">
          <span class="phase-num">${CIRCLED[p.examId - 1]}</span>
          <h2>${p.title}</h2>
          <span class="type-pill" data-type="${p.type}">${p.type}</span>
        </div>
        <div class="meta"><span>${dateDisplay}</span>${metaScope}</div>
        <p class="goal"><span class="tag">會考連結</span>${p.goal}</p>
      </div>
      <div class="sheet">
${weeksHtml}
      </div>
    </section>`;
}).join('\n\n');

const typeSummary = `模考 ${typeCounts['模考'] || 0}·段考 ${typeCounts['段考'] || 0}·會考 ${typeCounts['會考'] || 0}`;

const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>會考備考路線圖</title>
<style>
  :root {
    --board: #262a24;
    --board-deep: #1b1e19;
    --board-line: #3a3f37;
    --chalk: #f2efe3;
    --chalk-dim: #b9b6a8;
    --paper: #faf8f2;
    --paper-line: #e4e0d2;
    --ink: #2a2620;
    --ink-dim: #6b6558;
    --blue: #6f9cae;
    --amber: #c98a3a;
    --gold: #ab8620;
    --redpen: #a8402f;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Segoe UI", sans-serif;
    font-variant-numeric: tabular-nums;
    line-height: 1.6;
  }

  h1, h2, h3 {
    font-family: "Noto Serif TC", "Songti TC", "PMingLiU", serif;
    text-wrap: balance;
    margin: 0;
  }

  .page { max-width: 880px; margin: 0 auto; padding: 0 20px 80px; }

  .masthead {
    background: var(--board);
    color: var(--chalk);
    margin: 0 -20px 28px;
    padding: 40px 28px 32px;
    border-bottom: 3px solid var(--board-deep);
    position: relative;
  }
  .masthead::after {
    content: "";
    position: absolute;
    left: 28px; right: 28px; bottom: 18px;
    height: 1px;
    background: repeating-linear-gradient(90deg, var(--chalk-dim) 0 6px, transparent 6px 12px);
    opacity: .35;
  }
  .eyebrow {
    font-size: 13px;
    letter-spacing: .14em;
    color: var(--chalk-dim);
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .masthead h1 {
    font-size: clamp(26px, 4vw, 34px);
    font-weight: 600;
    color: var(--chalk);
  }
  .masthead .sub {
    margin-top: 10px;
    font-size: 15px;
    color: var(--chalk-dim);
    max-width: 62ch;
  }
  .countdown-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 28px;
    margin-top: 22px;
    font-size: 14px;
  }
  .countdown-row .metric b {
    display: block;
    font-family: "Noto Serif TC", serif;
    font-size: 22px;
    color: var(--chalk);
    font-weight: 600;
  }
  .countdown-row .metric span { color: var(--chalk-dim); font-size: 12.5px; }

  .principles {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
  .principle {
    border: 1px solid var(--board-line);
    border-radius: 3px;
    padding: 12px 14px;
    font-size: 13px;
    color: var(--chalk-dim);
  }
  .principle b { color: var(--chalk); display: block; margin-bottom: 3px; font-size: 13.5px; }

  .toc {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 36px;
    padding: 14px 16px;
    background: #fff;
    border: 1px solid var(--paper-line);
    border-radius: 4px;
  }
  .toc-label { width: 100%; font-size: 12px; letter-spacing: .1em; color: var(--ink-dim); text-transform: uppercase; margin-bottom: 4px; }
  .toc a {
    font-size: 13px;
    color: var(--ink);
    text-decoration: none;
    padding: 4px 9px;
    border: 1px solid var(--paper-line);
    border-radius: 3px;
    white-space: nowrap;
  }
  .toc a[data-type="模考"] { border-color: color-mix(in srgb, var(--blue) 45%, var(--paper-line)); }
  .toc a[data-type="段考"] { border-color: color-mix(in srgb, var(--amber) 45%, var(--paper-line)); }
  .toc a[data-type="會考"] { border-color: color-mix(in srgb, var(--gold) 55%, var(--paper-line)); font-weight: 600; }
  .toc a:hover { background: var(--paper); }
  .toc a.current { background: var(--ink); color: var(--paper); border-color: var(--ink); }

  .phase { margin-bottom: 30px; scroll-margin-top: 16px; }

  .nameplate {
    background: var(--board);
    color: var(--chalk);
    border-radius: 5px 5px 0 0;
    padding: 20px 24px;
  }
  .nameplate .top-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .phase-num {
    font-family: "Noto Serif TC", serif;
    font-size: 26px;
    line-height: 1;
  }
  .nameplate h2 { font-size: 19px; color: var(--chalk); }
  .type-pill {
    font-size: 11.5px;
    padding: 2px 9px;
    border-radius: 999px;
    letter-spacing: .04em;
    margin-left: auto;
  }
  .type-pill[data-type="模考"] { background: color-mix(in srgb, var(--blue) 30%, transparent); color: #cfe1e8; border: 1px solid color-mix(in srgb, var(--blue) 55%, transparent); }
  .type-pill[data-type="段考"] { background: color-mix(in srgb, var(--amber) 28%, transparent); color: #f0d3a8; border: 1px solid color-mix(in srgb, var(--amber) 55%, transparent); }
  .type-pill[data-type="會考"] { background: color-mix(in srgb, var(--gold) 30%, transparent); color: #ecd68f; border: 1px solid color-mix(in srgb, var(--gold) 60%, transparent); }

  .nameplate .meta {
    margin-top: 6px;
    font-size: 13px;
    color: var(--chalk-dim);
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .nameplate .meta .tentative { color: #e0b2a6; }

  .nameplate .goal {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed var(--board-line);
    font-size: 13.5px;
    color: var(--chalk);
    line-height: 1.65;
  }
  .nameplate .goal .tag {
    display: inline-block;
    font-size: 11px;
    letter-spacing: .08em;
    color: var(--chalk-dim);
    margin-right: 6px;
    text-transform: uppercase;
  }

  .sheet {
    background: #fff;
    border: 1px solid var(--paper-line);
    border-top: none;
    border-radius: 0 0 5px 5px;
    padding: 6px 4px;
  }
  .week-row {
    display: grid;
    grid-template-columns: 116px 1fr;
    gap: 4px 18px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--paper-line);
    align-items: start;
  }
  .week-row:last-child { border-bottom: none; }
  .week-row.is-now { background: color-mix(in srgb, var(--gold) 8%, transparent); }

  .week-date {
    font-size: 12.5px;
    color: var(--ink-dim);
    line-height: 1.5;
    padding-top: 2px;
  }
  .week-date .range { display: block; font-weight: 600; color: var(--ink); font-size: 13px; }
  .now-flag {
    display: inline-block;
    margin-top: 5px;
    font-size: 10.5px;
    letter-spacing: .06em;
    color: #fff;
    background: var(--gold);
    padding: 1.5px 7px;
    border-radius: 999px;
  }

  .week-tasks { margin: 0; padding: 0; list-style: none; }
  .week-tasks li {
    position: relative;
    padding-left: 14px;
    font-size: 14px;
    margin-bottom: 5px;
  }
  .week-tasks li:last-child { margin-bottom: 0; }
  .week-tasks li::before {
    content: "";
    position: absolute;
    left: 0; top: 9px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--ink-dim);
  }
  .week-tasks li.urgent { color: var(--redpen); font-weight: 500; }
  .week-tasks li.urgent::before { background: var(--redpen); }

  @media (max-width: 560px) {
    .week-row { grid-template-columns: 1fr; gap: 6px; }
    .week-date { padding-top: 0; }
  }

  footer.note {
    margin-top: 40px;
    padding-top: 18px;
    border-top: 1px dashed var(--paper-line);
    font-size: 12.5px;
    color: var(--ink-dim);
  }
</style>
</head>
<body>
<div class="page">

  <header class="masthead">
    <div class="eyebrow">2027 國中教育會考 · 10 考試階段備考路線圖</div>
    <h1>從現在到考場，一週一週的路</h1>
    <p class="sub">以下依 <code>exam_phases.json</code> 完整列出：從今天起，一直到會考前最後一週，每一週要做的事。模考順著會考長線走，段考切回學校課內，逢週日的休息不在此列（LINE 訊息另附）。以下數字每次開啟本頁時會依實際日期自動重算。</p>

    <div class="countdown-row">
      <div class="metric"><b id="today-date">–</b><span>今天</span></div>
      <div class="metric"><b id="days-left">–</b><span>距會考還有</span></div>
      <div class="metric"><b>${examPhases.length} 階段</b><span>考試階段（${typeSummary}）</span></div>
      <div class="metric"><b id="week-position">–</b><span>倒數進度（共 ${totalWeeks} 週）</span></div>
    </div>

    <div class="principles">
      <div class="principle"><b>模考不慌</b>跟著會考長線走就是驗收，不必另闢戰場。</div>
      <div class="principle"><b>段考才切換</b>考前收斂到學校課內，考後 48 小時內訂正回歸。</div>
      <div class="principle"><b>會考是主軸</b>每場考試都在替最後一天存底氣。</div>
    </div>
  </header>

  <nav class="toc">
    <span class="toc-label">跳至階段</span>
${tocHtml}
  </nav>

  <main>

${phasesHtml}

  </main>

  <footer class="note">
    <p>會考正式日期 ${examDisplay}–${examEndDisplay} 依 116 年公文暫訂；下學期段考日期標「暫定」者仍待學校行事曆公告校正，屆時本頁與 LINE 通知會同步更新。資料來源：<code>exam_phases.json</code>（${examPhases.length} 考試階段制，本頁由 <code>generate.js</code> 自動產生）。</p>
  </footer>

</div>
<script>
(function () {
  function taipeiToday() {
    var now = new Date();
    var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    var taipeiMs = utcMs + 8 * 3600000;
    var t = new Date(taipeiMs);
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function parseISO(s) {
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(d) { return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()); }

  var EXAM_START = parseISO('${examStartISO}');
  var DAY_MS = 86400000;
  var today = taipeiToday();
  var diffDays = Math.ceil((EXAM_START - today) / DAY_MS);

  document.getElementById('today-date').textContent = fmt(today);

  var daysEl = document.getElementById('days-left');
  if (diffDays > 1) daysEl.textContent = diffDays + ' 天';
  else if (diffDays === 1) daysEl.textContent = '明天！';
  else if (diffDays === 0) daysEl.textContent = '就是今天';
  else if (diffDays === -1) daysEl.textContent = '會考第二天';
  else daysEl.textContent = '已結束';

  var rows = Array.prototype.slice.call(document.querySelectorAll('.week-row[data-start]'));
  var weekEl = document.getElementById('week-position');
  var matched = null;

  rows.forEach(function (row) {
    var start = parseISO(row.getAttribute('data-start'));
    var end = parseISO(row.getAttribute('data-end'));
    if (today >= start && today <= end) matched = row;
  });

  if (matched) {
    matched.classList.add('is-now');
    var dateCell = matched.querySelector('.week-date');
    dateCell.appendChild(document.createElement('br'));
    var flag = document.createElement('span');
    flag.className = 'now-flag';
    flag.textContent = '現在';
    dateCell.appendChild(flag);

    var countdownWeek = ${totalWeeks} - Number(matched.getAttribute('data-index')) + 1;
    weekEl.textContent = '倒數第 ' + countdownWeek + ' 週';

    var phaseSection = matched.closest('.phase');
    if (phaseSection) {
      var link = document.querySelector('.toc a[href="#' + phaseSection.id + '"]');
      if (link) link.classList.add('current');
    }
  } else if (diffDays <= 0) {
    weekEl.textContent = '全部完成';
  } else {
    weekEl.textContent = '尚未開始';
  }
})();
</script>
</body>
</html>
`;

fs.writeFileSync(OUT_PATH, html);
console.log('index.html 已產生，共 ' + totalWeeks + ' 週、' + examPhases.length + ' 階段');
