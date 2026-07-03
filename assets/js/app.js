/* =========================================================================
 * 国試ドリル ― アプリロジック
 * 依存: data/questions.js が window.QUESTIONS を定義していること
 * =======================================================================*/
(function () {
  "use strict";

  const BUILTIN = window.QUESTIONS || [];
  const STORE_KEY = "kokushi-drill-v1";
  const CUSTOM_KEY = "kokushi-drill-custom-v1";

  /* ---------- 自作問題ストア ---------- */
  function loadCustom() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCustom(arr) {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  let customQuestions = loadCustom();

  // 出題対象＝組み込み問題＋自作問題
  function getAllQuestions() {
    return BUILTIN.concat(customQuestions);
  }

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
  function currentSubjects() {
    return [...new Set(getAllQuestions().map((q) => q.subject))];
  }

  // 科目チップを（再）生成。新規科目は選択済み状態で追加する。
  function renderSubjectChips() {
    const subjects = currentSubjects();
    const box = $("#subject-filters");
    // 初回はすべて選択、以降は既存の選択を保持しつつ新科目を有効化
    const firstRun = box.dataset.init !== "1";
    const known = new Set($$(".chip", box).map((c) => c.dataset.subject));
    subjects.forEach((s) => {
      if (firstRun || !known.has(s)) selectedSubjects.add(s);
    });
    // 既に存在しない科目を選択集合から除去
    [...selectedSubjects].forEach((s) => { if (!subjects.includes(s)) selectedSubjects.delete(s); });

    box.innerHTML = "";
    const allActive = subjects.length > 0 && subjects.every((s) => selectedSubjects.has(s));
    const allChip = el("button", "chip" + (allActive ? " active" : ""), "すべて");
    allChip.dataset.subject = "__all__";
    box.appendChild(allChip);
    subjects.forEach((s) => {
      const active = selectedSubjects.has(s);
      const c = el("button", "chip" + (active ? " active" : ""), escapeHtml(s));
      c.dataset.subject = s;
      box.appendChild(c);
    });
    box.dataset.init = "1";
  }

  function initStartScreen() {
    renderSubjectChips();
    const box = $("#subject-filters");
    const allChipSel = () => $('.chip[data-subject="__all__"]', box);

    box.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const subjects = currentSubjects();
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
        allChipSel().classList.toggle("active", selectedSubjects.size === subjects.length);
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
    let pool = getAllQuestions().filter(
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

    // 手書きメモをこの問題用に切り替え
    Sketch.setQuestion(q.id);
  }

  function toggleChoice(li, shape) {
    const list = $("#q-choices");
    if (list.classList.contains("answered")) return;
    // 直前に選択肢へ手書きした場合は、そのタップで解答を選ばない
    if (Sketch.choiceJustDrew()) return;
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
    $("#open-editor-btn").addEventListener("click", openEditor);
    $("#editor-home-btn").addEventListener("click", () => {
      renderLifetimeStats();
      updatePoolInfo();
      showScreen("start-screen");
    });

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

  /* =====================================================================
   * 問題エディタ（自作問題の作成・編集・削除・入出力）
   * ===================================================================*/
  function initEditor() {
    updateSubjectDatalist();
    // 初期の選択肢行（4つ）
    if ($$(".choice-row", $("#choices-editor")).length === 0) {
      for (let i = 0; i < 4; i++) addChoiceRow();
    }
    $("#add-choice-btn").addEventListener("click", () => addChoiceRow());
    $("#q-form").addEventListener("submit", (e) => { e.preventDefault(); saveQuestion(); });
    $("#cancel-edit-btn").addEventListener("click", resetForm);
    $("#export-btn").addEventListener("click", exportJSON);
    $("#import-btn").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", importJSON);
    renderCustomList();
  }

  function updateSubjectDatalist() {
    const dl = $("#subject-list");
    dl.innerHTML = "";
    currentSubjects().forEach((s) => {
      const o = document.createElement("option");
      o.value = s;
      dl.appendChild(o);
    });
  }

  function addChoiceRow(data) {
    data = data || {};
    const row = el("div", "choice-row");
    row.innerHTML =
      '<div class="cr-main">' +
        '<input type="text" class="cr-text" placeholder="選択肢の文" />' +
        '<input type="text" class="cr-note" placeholder="この選択肢の解説（任意）" />' +
      '</div>' +
      '<label class="cr-toggle"><input type="checkbox" class="cr-correct" /><span>正</span></label>' +
      '<label class="cr-toggle forbid"><input type="checkbox" class="cr-forbid" /><span>禁忌</span></label>' +
      '<button type="button" class="cr-del" title="この選択肢を削除">×</button>';
    row.querySelector(".cr-text").value = data.text || "";
    row.querySelector(".cr-note").value = data.note || "";
    row.querySelector(".cr-correct").checked = !!data.correct;
    row.querySelector(".cr-forbid").checked = !!data.forbidden;
    const sync = () => {
      row.classList.toggle("is-correct", row.querySelector(".cr-correct").checked);
      row.classList.toggle("is-forbid", row.querySelector(".cr-forbid").checked);
    };
    row.querySelector(".cr-correct").addEventListener("change", sync);
    row.querySelector(".cr-forbid").addEventListener("change", sync);
    row.querySelector(".cr-del").addEventListener("click", () => {
      if ($$(".choice-row", $("#choices-editor")).length <= 2) {
        flashError("選択肢は2つ以上必要です。");
        return;
      }
      row.remove();
    });
    sync();
    $("#choices-editor").appendChild(row);
  }

  function flashError(msg) {
    const box = $("#form-error");
    box.textContent = msg;
    box.classList.remove("hidden");
  }
  function clearError() { $("#form-error").classList.add("hidden"); }

  function readForm() {
    const choices = $$(".choice-row", $("#choices-editor"))
      .map((row) => ({
        text: row.querySelector(".cr-text").value.trim(),
        correct: row.querySelector(".cr-correct").checked,
        forbidden: row.querySelector(".cr-forbid").checked,
        note: row.querySelector(".cr-note").value.trim()
      }))
      .filter((c) => c.text.length > 0);
    return {
      subject: $("#f-subject").value.trim(),
      topic: $("#f-topic").value.trim(),
      importance: Number($("#f-importance").value),
      type: $("#f-type").value,
      stem: $("#f-stem").value.trim(),
      choices,
      explanation: $("#f-explanation").value.trim(),
      pearl: $("#f-pearl").value.trim()
    };
  }

  function validate(q) {
    if (!q.subject) return "科目を入力してください。";
    if (!q.topic) return "テーマを入力してください。";
    if (!q.stem) return "問題文を入力してください。";
    if (q.choices.length < 2) return "文が入力された選択肢が2つ以上必要です。";
    const correct = q.choices.filter((c) => c.correct).length;
    if (correct === 0) return "正答（「正」）を少なくとも1つ指定してください。";
    if (q.type === "single" && correct !== 1)
      return "「1つ選べ」形式では正答はちょうど1つにしてください。";
    if (q.type === "multiple" && correct < 2)
      return "「複数選べ」形式では正答を2つ以上指定してください。";
    return null;
  }

  function saveQuestion() {
    clearError();
    const q = readForm();
    const err = validate(q);
    if (err) { flashError(err); return; }
    if (q.type === "multiple") q.pick = q.choices.filter((c) => c.correct).length;

    const id = $("#f-id").value;
    if (id) {
      const idx = customQuestions.findIndex((c) => c.id === id);
      if (idx >= 0) customQuestions[idx] = Object.assign({}, q, { id, custom: true });
    } else {
      q.id = "usr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      q.custom = true;
      customQuestions.push(q);
    }
    saveCustom(customQuestions);
    afterCustomChange();
    resetForm();
    renderCustomList();
    // 保存できたことを一瞬示す
    const btn = $("#save-q-btn");
    const orig = btn.textContent;
    btn.textContent = "✔ 保存しました";
    setTimeout(() => { btn.textContent = orig; }, 1400);
  }

  function editQuestion(id) {
    const q = customQuestions.find((c) => c.id === id);
    if (!q) return;
    $("#editor-title").textContent = "問題を編集";
    $("#f-id").value = q.id;
    $("#f-subject").value = q.subject;
    $("#f-topic").value = q.topic;
    $("#f-importance").value = String(q.importance);
    $("#f-type").value = q.type;
    $("#f-stem").value = q.stem;
    $("#f-explanation").value = q.explanation || "";
    $("#f-pearl").value = q.pearl || "";
    $("#choices-editor").innerHTML = "";
    q.choices.forEach((c) => addChoiceRow(c));
    $("#cancel-edit-btn").classList.remove("hidden");
    clearError();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteQuestion(id) {
    if (!confirm("この問題を削除します。よろしいですか？")) return;
    customQuestions = customQuestions.filter((c) => c.id !== id);
    saveCustom(customQuestions);
    afterCustomChange();
    renderCustomList();
    if ($("#f-id").value === id) resetForm();
  }

  function resetForm() {
    $("#q-form").reset();
    $("#f-id").value = "";
    $("#editor-title").textContent = "問題を作成";
    $("#choices-editor").innerHTML = "";
    for (let i = 0; i < 4; i++) addChoiceRow();
    $("#cancel-edit-btn").classList.add("hidden");
    clearError();
  }

  // 自作問題が変化したら、科目チップ・datalist・成績表示・出題数を更新
  function afterCustomChange() {
    renderSubjectChips();
    updateSubjectDatalist();
    updatePoolInfo();
  }

  function renderCustomList() {
    const list = $("#custom-list");
    const empty = $("#custom-empty");
    $("#custom-count").textContent = customQuestions.length;
    list.innerHTML = "";
    if (customQuestions.length === 0) {
      empty.classList.remove("hidden");
      $("#export-btn").disabled = true;
      return;
    }
    empty.classList.add("hidden");
    $("#export-btn").disabled = false;
    customQuestions.forEach((q) => {
      const forbidCount = q.choices.filter((c) => c.forbidden).length;
      const item = el("li", "custom-item");
      item.innerHTML =
        '<div class="ci-body">' +
          '<div class="ci-title">' + escapeHtml(q.topic || "(無題)") + "</div>" +
          '<div class="ci-sub">' + escapeHtml(q.subject) + " ・ " +
            "★".repeat(q.importance) +
            (forbidCount ? ' ・ <span class="ci-forbid">禁忌肢' + forbidCount + "</span>" : "") +
          "</div>" +
        "</div>" +
        '<div class="ci-actions">' +
          '<button class="btn ghost small" data-act="edit">編集</button>' +
          '<button class="btn ghost small" data-act="del">削除</button>' +
        "</div>";
      item.querySelector('[data-act="edit"]').addEventListener("click", () => editQuestion(q.id));
      item.querySelector('[data-act="del"]').addEventListener("click", () => deleteQuestion(q.id));
      list.appendChild(item);
    });
  }

  function exportJSON() {
    if (customQuestions.length === 0) return;
    const blob = new Blob([JSON.stringify(customQuestions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kokushi-questions-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const arr = Array.isArray(data) ? data : [data];
        let added = 0;
        arr.forEach((raw) => {
          const q = sanitizeImported(raw);
          if (!q) return;
          // ID重複は新規採番
          if (!q.id || customQuestions.some((c) => c.id === q.id)) {
            q.id = "usr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
          }
          q.custom = true;
          customQuestions.push(q);
          added++;
        });
        saveCustom(customQuestions);
        afterCustomChange();
        renderCustomList();
        alert(added > 0 ? added + " 問を読み込みました。" : "読み込める問題が見つかりませんでした。");
      } catch (err) {
        alert("JSONの読み込みに失敗しました：" + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  // インポート時の最低限の検証・整形
  function sanitizeImported(raw) {
    if (!raw || typeof raw !== "object") return null;
    const q = {
      subject: String(raw.subject || "").trim() || "その他",
      topic: String(raw.topic || "").trim() || "(無題)",
      importance: [1, 2, 3].includes(Number(raw.importance)) ? Number(raw.importance) : 2,
      type: raw.type === "multiple" ? "multiple" : "single",
      stem: String(raw.stem || "").trim(),
      explanation: String(raw.explanation || "").trim(),
      pearl: String(raw.pearl || "").trim(),
      choices: Array.isArray(raw.choices) ? raw.choices.map((c) => ({
        text: String(c && c.text || "").trim(),
        correct: !!(c && c.correct),
        forbidden: !!(c && c.forbidden),
        note: String(c && c.note || "").trim()
      })).filter((c) => c.text) : []
    };
    if (raw.id) q.id = String(raw.id);
    // 妥当な問題のみ採用
    if (!q.stem || q.choices.length < 2 || !q.choices.some((c) => c.correct)) return null;
    if (q.type === "multiple") q.pick = q.choices.filter((c) => c.correct).length;
    return q;
  }

  function openEditor() {
    resetForm();
    renderCustomList();
    updateSubjectDatalist();
    showScreen("editor-screen");
  }

  /* =====================================================================
   * 手書き描画（Apple Pencil / タッチ / マウス）
   * ---------------------------------------------------------------------
   * ・Pointer Events を使用し、ペンの筆圧で線の太さを変える
   * ・ペン使用を検知したらタッチ入力は無視（パームリジェクション）
   * ・描画は問題IDごとに localStorage へベクター（点列）で保存
   * ・2つの描画面を持つ：
   *     memoPad   … 問題の下の手書きメモ欄
   *     choicePad … 問題カード上のオーバーレイ（選択肢への書き込み）
   *   ペン・色・太さの設定は共有し、下部のツールバーで操作する。
   * ===================================================================*/
  const MEMO_KEY = "kokushi-drill-sketch-v1";
  const CHOICE_KEY = "kokushi-drill-choice-v1";
  const COLORS = ["#1b2333", "#2563eb", "#dc2626", "#16a34a", "#d97706"];

  // ペン・色・太さは両描画面で共有
  const penSettings = { tool: "pen", color: "#1b2333", size: 3 };

  // 選択肢オーバーレイ：指・マウスでも書き込むモード
  let annotateChoices = false;

  function makeSketch(opts) {
    // opts: { canvas, target, storeKey, shouldDraw, noDrawSelector }
    const canvas = opts.canvas;
    const target = opts.target || canvas;
    const ctx = canvas.getContext("2d");
    let dpr = 1;
    let strokes = [];
    let current = null;
    let qid = null;
    let store = {};
    let penSeen = false;
    let drawing = false;
    let activeId = null;
    let lastEnd = 0;

    try { store = JSON.parse(localStorage.getItem(opts.storeKey) || "{}") || {}; }
    catch (e) { store = {}; }

    function persist() {
      try {
        if (qid == null) return;
        if (strokes.length) store[qid] = strokes; else delete store[qid];
        localStorage.setItem(opts.storeKey, JSON.stringify(store));
      } catch (e) {}
    }

    function ptFromEvent(e) {
      const r = canvas.getBoundingClientRect();
      const p = e.pointerType === "pen" ? (e.pressure > 0 ? e.pressure : 0.4) : 0.6;
      return { x: e.clientX - r.left, y: e.clientY - r.top, p };
    }
    function lineWidthFor(s, p) {
      const mult = s.tool === "eraser" ? 3.2 : (0.4 + 1.3 * (p != null ? p : 0.5));
      return Math.max(0.6, s.size * mult);
    }
    function drawStroke(s) {
      const pts = s.points;
      if (!pts || pts.length === 0) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (s.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = ctx.fillStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = ctx.fillStyle = s.color;
      }
      if (pts.length === 1) {
        const p = pts[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, lineWidthFor(s, p.p) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          ctx.beginPath();
          ctx.lineWidth = lineWidthFor(s, b.p);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    function redraw() {
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      strokes.forEach(drawStroke);
      if (current) drawStroke(current);
    }
    function resize() {
      // canvas は置換要素で inset:0 では伸びないため、計測用要素からCSSサイズを明示指定する
      const measureEl = opts.sizeEl || canvas;
      const r = measureEl.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return; // 非表示時はスキップ
      if (opts.sizeEl) {
        canvas.style.width = r.width + "px";
        canvas.style.height = r.height + "px";
      }
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }

    function allowed(e) {
      // ボタン等の操作要素の上では描かない（タップを通す）
      if (opts.noDrawSelector && e.target && e.target.closest &&
          e.target.closest(opts.noDrawSelector)) return false;
      return opts.shouldDraw ? opts.shouldDraw(e) : true;
    }

    function onDown(e) {
      if (e.pointerType === "pen") penSeen = true;
      if (e.pointerType === "touch" && penSeen) return; // パームリジェクション
      if (!allowed(e)) return;                          // 選択モードでの指/マウス等は通す
      if (drawing) return;
      drawing = true;
      activeId = e.pointerId;
      try { target.setPointerCapture(e.pointerId); } catch (_) {}
      current = { tool: penSettings.tool, color: penSettings.color, size: penSettings.size, points: [ptFromEvent(e)] };
      redraw();
      e.preventDefault();
    }
    function onMove(e) {
      if (!drawing || e.pointerId !== activeId) return;
      if (e.pointerType === "touch" && penSeen) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach((ev) => current.points.push(ptFromEvent(ev)));
      redraw();
      e.preventDefault();
    }
    function onUp(e) {
      if (!drawing || e.pointerId !== activeId) return;
      drawing = false;
      activeId = null;
      lastEnd = Date.now();
      try { target.releasePointerCapture(e.pointerId); } catch (_) {}
      if (current && current.points.length) strokes.push(current);
      current = null;
      redraw();
      persist();
    }

    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
    target.addEventListener("pointerleave", onUp);

    return {
      resize,
      setQuestion(id) {
        qid = id;
        strokes = store[id] ? JSON.parse(JSON.stringify(store[id])) : [];
        current = null;
        resize();
      },
      undo() { strokes.pop(); redraw(); persist(); },
      clear(ask) {
        if (ask && strokes.length && !confirm("この書き込みを全て消去しますか？")) return;
        strokes = []; redraw(); persist();
      },
      hasInk() { return strokes.length > 0; },
      justDrew() { return Date.now() - lastEnd < 250; }
    };
  }

  let memoPad = null;
  let choicePad = null;

  const Sketch = {
    init() {
      // 共有ツールバー（メモ欄の下）
      const cbox = $("#pen-colors");
      COLORS.forEach((c, i) => {
        const b = el("button", "swatch" + (i === 0 ? " active" : ""));
        b.type = "button";
        b.style.background = c;
        b.dataset.color = c;
        b.title = "色";
        b.addEventListener("click", () => setColor(c));
        cbox.appendChild(b);
      });
      $$("#sketch-card .tool").forEach((b) =>
        b.addEventListener("click", () => setTool(b.dataset.tool)));
      $("#pen-size").addEventListener("input", (e) => { penSettings.size = Number(e.target.value); });
      $("#undo-btn").addEventListener("click", () => memoPad && memoPad.undo());
      $("#clear-btn").addEventListener("click", () => memoPad && memoPad.clear(true));
      $("#sketch-toggle").addEventListener("click", () => {
        const body = $("#sketch-body");
        const hidden = body.classList.toggle("collapsed");
        $("#sketch-toggle").textContent = hidden ? "メモを表示" : "メモを隠す";
        if (!hidden && memoPad) memoPad.resize();
      });

      // メモ欄：全入力で描画
      memoPad = makeSketch({
        canvas: $("#sketch-canvas"),
        storeKey: MEMO_KEY
      });

      // 選択肢オーバーレイ：ペンは常に描画、指/マウスは「書き込みモード」時のみ。
      // ボタン等の上では描かず、タップを通す。
      choicePad = makeSketch({
        canvas: $("#choice-canvas"),
        target: $("#question-card"),
        sizeEl: $("#question-card"),
        storeKey: CHOICE_KEY,
        noDrawSelector: ".q-actions, .annotate-tools, button, a, input, select, textarea",
        shouldDraw: (e) => annotateChoices || e.pointerType === "pen"
      });

      // 選択肢書き込みのコントロール
      $("#annotate-toggle").addEventListener("click", () => {
        annotateChoices = !annotateChoices;
        $("#annotate-toggle").classList.toggle("active", annotateChoices);
        $("#question-card").classList.toggle("annotating", annotateChoices);
      });
      $("#choice-undo").addEventListener("click", () => choicePad && choicePad.undo());
      $("#choice-clear").addEventListener("click", () => choicePad && choicePad.clear(true));

      window.addEventListener("resize", () => {
        if (memoPad) memoPad.resize();
        if (choicePad) choicePad.resize();
      });

      function setTool(t) {
        penSettings.tool = t;
        $$("#sketch-card .tool").forEach((b) => b.classList.toggle("active", b.dataset.tool === t));
      }
      function setColor(c) {
        penSettings.color = c;
        if (penSettings.tool === "eraser") setTool("pen");
        $$("#pen-colors .swatch").forEach((s) => s.classList.toggle("active", s.dataset.color === c));
      }
    },

    // 問題の切り替え時に両描画面を対象問題へ
    setQuestion(id) {
      // 新しい問題では選択モードに戻す（誤操作防止。ペンは常に書ける）
      annotateChoices = false;
      $("#annotate-toggle").classList.remove("active");
      $("#question-card").classList.remove("annotating");
      if (memoPad) memoPad.setQuestion(id);
      if (choicePad) choicePad.setQuestion(id);
    },

    // 選択肢の直前にペン描画があったか（タップ選択の抑止に使用）
    choiceJustDrew() { return choicePad ? choicePad.justDrew() : false; }
  };

  /* ---------- 起動 ---------- */
  if (getAllQuestions().length === 0) {
    document.body.innerHTML =
      '<p style="padding:40px;text-align:center">問題データを読み込めませんでした。</p>';
    return;
  }
  initStartScreen();
  initEditor();
  Sketch.init();
  bindGlobal();
})();
