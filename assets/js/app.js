/* =========================================================================
 * 国試ドリル ― アプリロジック
 * 依存: data/questions.js が window.QUESTIONS を定義していること
 * =======================================================================*/
(function () {
  "use strict";

  const ALL = window.QUESTIONS || [];
  const STORE_KEY = "kokushi-drill-v1";

  /* ---------- 永続化（成績・要復習リスト） ---------- */
  const defaultStore = () => ({
    answered: 0,
    correct: 0,
    wrong: 0,
    forbiddenHits: 0,
    reviewIds: [] // 要復習の問題ID
  });

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultStore();
      return Object.assign(defaultStore(), JSON.parse(raw));
    } catch (e) {
      return defaultStore();
    }
  }
  function saveStore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  let store = loadStore();

  /* ---------- DOM ヘルパ ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  /* ---------- 出題設定の状態 ---------- */
  const selectedSubjects = new Set();
  const selectedImportance = new Set([3, 2, 1]);
  let mode = "practice"; // practice | exam | review

  /* ---------- セッション状態 ---------- */
  let session = null;

  /* =====================================================================
   * スタート画面のセットアップ
   * ===================================================================*/
  function initStartScreen() {
    // 科目チップを動的生成
    const subjects = [...new Set(ALL.map((q) => q.subject))];
    subjects.forEach((s) => selectedSubjects.add(s));
    const box = $("#subject-filters");
    box.innerHTML = "";
    const allChip = el("button", "chip active", "すべて");
    allChip.dataset.subject = "__all__";
    box.appendChild(allChip);
    subjects.forEach((s) => {
      const c = el("button", "chip active", escapeHtml(s));
      c.dataset.subject = s;
      box.appendChild(c);
    });

    box.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      if (chip.dataset.subject === "__all__") {
        const turnOn = !chip.classList.contains("active");
        $$(".chip", box).forEach((c) => c.classList.toggle("active", turnOn));
        selectedSubjects.clear();
        if (turnOn) subjects.forEach((s) => selectedSubjects.add(s));
      } else {
        chip.classList.toggle("active");
        const s = chip.dataset.subject;
        if (chip.classList.contains("active")) selectedSubjects.add(s);
        else selectedSubjects.delete(s);
        allChip.classList.toggle("active", selectedSubjects.size === subjects.length);
      }
      updatePoolInfo();
    });

    // 重要度チップ
    $$("#start-screen .chip-group .chip[data-imp]").forEach((chip) => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("active");
        const imp = Number(chip.dataset.imp);
        if (chip.classList.contains("active")) selectedImportance.add(imp);
        else selectedImportance.delete(imp);
        updatePoolInfo();
      });
    });

    // モードチップ
    $$(".mode-group .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".mode-group .chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        mode = chip.dataset.mode;
        updatePoolInfo();
      });
    });

    $("#count-select").addEventListener("change", updatePoolInfo);
    $("#start-btn").addEventListener("click", startSession);
    $("#reset-stats").addEventListener("click", resetProgress);

    renderLifetimeStats();
    updatePoolInfo();
  }

  function getPool() {
    let pool = ALL.filter(
      (q) => selectedSubjects.has(q.subject) && selectedImportance.has(q.importance)
    );
    if (mode === "review") {
      pool = pool.filter((q) => store.reviewIds.includes(q.id));
    }
    return pool;
  }

  function updatePoolInfo() {
    const pool = getPool();
    const info = $("#pool-info");
    const startBtn = $("#start-btn");
    if (mode === "review") {
      info.textContent = `要復習リスト内の該当問題: ${pool.length} 問`;
    } else {
      info.textContent = `条件に一致する問題: ${pool.length} 問`;
    }
    startBtn.disabled = pool.length === 0;
    startBtn.textContent = pool.length === 0 ? "該当する問題がありません" : "開始する";
  }

  /* =====================================================================
   * セッション開始
   * ===================================================================*/
  function startSession() {
    let pool = getPool();
    if (pool.length === 0) return;

    if ($("#shuffle-toggle").checked) pool = shuffle(pool);

    const count = Number($("#count-select").value);
    if (count > 0) pool = pool.slice(0, count);

    session = {
      questions: pool,
      index: 0,
      mode,
      results: [], // {id, correct, forbidden, question}
      correct: 0,
      wrong: 0,
      forbidden: 0
    };

    showScreen("quiz-screen");
    renderQuestion();
  }

  /* =====================================================================
   * 出題描画
   * ===================================================================*/
  function renderQuestion() {
    const q = session.questions[session.index];
    const total = session.questions.length;

    // 進捗
    $("#progress-bar").firstElementChild.style.width =
      `${(session.index / total) * 100}%`;
    $("#progress-text").textContent = `${session.index + 1} / ${total}`;

    updateLiveCounters();

    // メタ
    $("#q-subject").textContent = q.subject;
    const stars = "★".repeat(q.importance);
    $("#q-importance").textContent =
      { 3: `必修級 ${stars}`, 2: `頻出 ${stars}`, 1: `標準 ${stars}` }[q.importance];
    const pick = q.type === "multiple" ? (q.pick || 2) : 1;
    $("#q-type").textContent = q.type === "multiple" ? `${pick}つ選べ` : "1つ選べ";

    $("#q-stem").textContent = q.stem;

    // 選択肢
    const list = $("#q-choices");
    list.className = "choices";
    list.innerHTML = "";
    const shape = q.type === "multiple" ? "checkbox" : "radio";
    q.choices.forEach((choice, i) => {
      const li = el("li", "choice");
      li.dataset.shape = shape;
      li.dataset.i = i;
      li.innerHTML =
        `<span class="mark"></span>` +
        `<span class="body"><span class="text">${escapeHtml(choice.text)}</span>` +
        (choice.note ? `<span class="note">${escapeHtml(choice.note)}</span>` : "") +
        `</span>`;
      li.addEventListener("click", () => toggleChoice(li, shape));
      list.appendChild(li);
    });

    // フィードバック・ボタン初期化
    const fb = $("#feedback");
    fb.className = "feedback hidden";
    fb.innerHTML = "";
    $("#submit-btn").classList.remove("hidden");
    $("#submit-btn").disabled = true;
    $("#next-btn").classList.add("hidden");
  }

  function toggleChoice(li, shape) {
    const list = $("#q-choices");
    if (list.classList.contains("answered")) return;
    if (shape === "radio") {
      $$(".choice", list).forEach((c) => c.classList.remove("selected"));
      li.classList.add("selected");
    } else {
      li.classList.toggle("selected");
    }
    $("#submit-btn").disabled = $$(".choice.selected", list).length === 0;
  }

  /* =====================================================================
   * 採点
   * ===================================================================*/
  function submitAnswer() {
    const q = session.questions[session.index];
    const list = $("#q-choices");
    if (list.classList.contains("answered")) return;

    const selectedIdx = $$(".choice.selected", list).map((c) => Number(c.dataset.i));
    const correctIdx = q.choices.map((c, i) => (c.correct ? i : -1)).filter((i) => i >= 0);

    const pickedForbidden = selectedIdx.some((i) => q.choices[i].forbidden);
    const isCorrect =
      selectedIdx.length === correctIdx.length &&
      selectedIdx.every((i) => correctIdx.includes(i));

    // 選択肢の色付け
    list.classList.add("answered");
    $$(".choice", list).forEach((li) => {
      const i = Number(li.dataset.i);
      const c = q.choices[i];
      const picked = selectedIdx.includes(i);
      if (c.forbidden && picked) {
        li.classList.add("is-forbidden");
        li.querySelector(".text").insertAdjacentHTML("afterend", ' <span class="flag">禁忌</span>');
      } else if (c.correct) {
        li.classList.add("is-correct");
      } else if (picked) {
        li.classList.add("is-wrong");
      }
      // 禁忌だが未選択の場合も注意喚起（本番の学びのため薄く印）
      if (c.forbidden && !picked) {
        li.querySelector(".text").insertAdjacentHTML("afterend", ' <span class="flag" style="background:#9ca3af">禁忌肢</span>');
      }
    });

    // セッション集計
    if (isCorrect) session.correct++; else session.wrong++;
    if (pickedForbidden) session.forbidden++;
    session.results.push({ id: q.id, correct: isCorrect, forbidden: pickedForbidden, question: q });

    // 要復習リスト更新（不正解 or 禁忌ヒットで登録、正解なら外す）
    if (!isCorrect || pickedForbidden) addReview(q.id);
    else removeReview(q.id);

    // 生涯成績更新
    store.answered++;
    if (isCorrect) store.correct++; else store.wrong++;
    if (pickedForbidden) store.forbiddenHits++;
    saveStore(store);

    updateLiveCounters();

    // 練習モードは即時フィードバック、模試モードは静かに次へ
    if (session.mode === "exam") {
      // 模試: 色付けも最小限（正誤は伏せる）。ここでは選択のみ確定して次へ。
      resetExamStyling(list, selectedIdx, q);
      $("#submit-btn").classList.add("hidden");
      $("#next-btn").classList.remove("hidden");
    } else {
      showFeedback(q, isCorrect, pickedForbidden);
      $("#submit-btn").classList.add("hidden");
      $("#next-btn").classList.remove("hidden");
    }
  }

  // 模試モードでは正誤を隠し、選択のみ示す
  function resetExamStyling(list, selectedIdx, q) {
    $$(".choice", list).forEach((li) => {
      li.classList.remove("is-correct", "is-wrong", "is-forbidden");
      li.querySelectorAll(".flag").forEach((f) => f.remove());
      const i = Number(li.dataset.i);
      if (selectedIdx.includes(i)) li.classList.add("selected");
    });
    list.classList.remove("answered"); // 解説noteを隠す
    const fb = $("#feedback");
    fb.className = "feedback";
    fb.innerHTML = '<span class="verdict">解答を記録しました（採点は最後に表示）</span>';
    fb.classList.remove("hidden");
  }

  function showFeedback(q, isCorrect, pickedForbidden) {
    const fb = $("#feedback");
    let cls = isCorrect ? "correct" : "wrong";
    if (pickedForbidden) cls = "forbidden";
    fb.className = `feedback ${cls}`;

    let verdict;
    if (pickedForbidden) verdict = "☠ 禁忌選択肢を選びました ― 本番なら不合格級の致命的誤答";
    else if (isCorrect) verdict = "✔ 正解";
    else verdict = "✘ 不正解";

    let html = `<span class="verdict">${verdict}</span>`;
    html += `<div class="exp">${escapeHtml(q.explanation)}</div>`;
    if (q.pearl) html += `<div class="pearl">💡 ${escapeHtml(q.pearl)}</div>`;
    fb.innerHTML = html;
    fb.classList.remove("hidden");
  }

  function nextQuestion() {
    session.index++;
    if (session.index >= session.questions.length) {
      finishSession();
    } else {
      renderQuestion();
    }
  }

  function updateLiveCounters() {
    $("#c-correct").textContent = session.correct;
    $("#c-wrong").textContent = session.wrong;
    $("#c-forbidden").textContent = session.forbidden;
  }

  /* =====================================================================
   * 結果画面
   * ===================================================================*/
  function finishSession() {
    $("#progress-bar").firstElementChild.style.width = "100%";
    const total = session.questions.length;
    const rate = total ? Math.round((session.correct / total) * 100) : 0;

    $("#result-summary").innerHTML = `
      <div class="stat"><span class="num">${session.correct}/${total}</span><span class="lbl">正答</span></div>
      <div class="stat ok"><span class="num">${rate}%</span><span class="lbl">正答率</span></div>
      <div class="stat forbid"><span class="num">${session.forbidden}</span><span class="lbl">禁忌ヒット</span></div>
    `;

    const banner = $("#forbidden-warning");
    if (session.forbidden > 0) {
      banner.classList.remove("hidden");
      banner.innerHTML =
        `☠ この回で <b>${session.forbidden}</b> 個の禁忌選択肢を選びました。` +
        `禁忌肢は1つでも本番で不合格に直結します。該当問題は要復習に登録済みです。`;
    } else {
      banner.classList.remove("hidden");
      banner.style.background = "var(--ok-bg)";
      banner.style.borderColor = "var(--ok)";
      banner.style.color = "#14532d";
      banner.innerHTML = "✔ 禁忌選択肢の誤答はありませんでした。素晴らしい安全感覚です。";
    }

    const list = $("#result-list");
    list.innerHTML = "";
    session.results.forEach((r, i) => {
      let cls = r.correct ? "ok" : "ng";
      let badge = r.correct ? "✔" : "✘";
      if (r.forbidden) { cls = "forbid"; badge = "☠"; }
      const item = el("li", `result-item ${cls}`);
      item.innerHTML = `
        <span class="badge">${badge}</span>
        <div class="ri-body">
          <div class="ri-title">${i + 1}. ${escapeHtml(r.question.topic)}</div>
          <div class="ri-sub">${escapeHtml(r.question.subject)}${r.forbidden ? " ・禁忌肢を選択" : (r.correct ? " ・正解" : " ・不正解")}</div>
        </div>`;
      list.appendChild(item);
    });

    $("#review-wrong-btn").disabled = session.results.every((r) => r.correct && !r.forbidden);
    renderLifetimeStats();
    showScreen("result-screen");
  }

  function reviewWrongOnly() {
    const wrongQs = session.results
      .filter((r) => !r.correct || r.forbidden)
      .map((r) => r.question);
    if (wrongQs.length === 0) return;
    session = {
      questions: wrongQs,
      index: 0,
      mode: "practice",
      results: [],
      correct: 0,
      wrong: 0,
      forbidden: 0
    };
    showScreen("quiz-screen");
    renderQuestion();
  }

  /* =====================================================================
   * 要復習リスト・成績
   * ===================================================================*/
  function addReview(id) {
    if (!store.reviewIds.includes(id)) {
      store.reviewIds.push(id);
      saveStore(store);
    }
  }
  function removeReview(id) {
    const idx = store.reviewIds.indexOf(id);
    if (idx >= 0) {
      store.reviewIds.splice(idx, 1);
      saveStore(store);
    }
  }

  function renderLifetimeStats() {
    const rate = store.answered ? Math.round((store.correct / store.answered) * 100) : 0;
    $("#lifetime-stats").innerHTML = `
      <div class="stat"><span class="num">${store.answered}</span><span class="lbl">総解答数</span></div>
      <div class="stat ok"><span class="num">${rate}%</span><span class="lbl">累計正答率</span></div>
      <div class="stat forbid"><span class="num">${store.forbiddenHits}</span><span class="lbl">禁忌ヒット累計</span></div>
      <div class="stat ng"><span class="num">${store.reviewIds.length}</span><span class="lbl">要復習</span></div>
    `;
  }

  function resetProgress() {
    if (!confirm("累計成績と要復習リストをすべて消去します。よろしいですか？")) return;
    store = defaultStore();
    saveStore(store);
    renderLifetimeStats();
    updatePoolInfo();
  }

  /* =====================================================================
   * 画面遷移・ユーティリティ
   * ===================================================================*/
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.add("hidden"));
    $("#" + id).classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* =====================================================================
   * イベント束ね
   * ===================================================================*/
  function bindGlobal() {
    $("#submit-btn").addEventListener("click", submitAnswer);
    $("#next-btn").addEventListener("click", nextQuestion);
    $("#quit-btn").addEventListener("click", () => {
      if (confirm("この回を中断して設定画面に戻りますか？")) {
        renderLifetimeStats();
        updatePoolInfo();
        showScreen("start-screen");
      }
    });
    $("#home-btn").addEventListener("click", () => {
      renderLifetimeStats();
      updatePoolInfo();
      showScreen("start-screen");
    });
    $("#review-wrong-btn").addEventListener("click", reviewWrongOnly);

    // キーボード: 1-9で選択、Enterで解答/次へ
    document.addEventListener("keydown", (e) => {
      if ($("#quiz-screen").classList.contains("hidden")) return;
      if (/^[1-9]$/.test(e.key)) {
        const li = $(`#q-choices .choice[data-i="${Number(e.key) - 1}"]`);
        if (li && !$("#q-choices").classList.contains("answered")) {
          toggleChoice(li, li.dataset.shape);
        }
      } else if (e.key === "Enter") {
        if (!$("#next-btn").classList.contains("hidden")) nextQuestion();
        else if (!$("#submit-btn").disabled) submitAnswer();
      }
    });
  }

  /* ---------- 起動 ---------- */
  if (ALL.length === 0) {
    document.body.innerHTML =
      '<p style="padding:40px;text-align:center">問題データを読み込めませんでした。</p>';
    return;
  }
  initStartScreen();
  bindGlobal();
})();
