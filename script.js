/*
 * 群訝山荘 / 謎解き進行スクリプト
 *
 * 本番公開前に、下の PUZZLES の answer を実際の答えに変更してください。
 * 問題数を増減するときは、PUZZLES の行を追加・削除するだけで大丈夫です。
 * answer は文字列でも、別解を含む配列でも設定できます。
 */

const PUZZLES = [
  { id: "puzzle-1", label: "第一の確認", answer: ["仮の答え1"] },
  { id: "puzzle-2", label: "第二の確認", answer: ["仮の答え2"] },
  { id: "puzzle-3", label: "第三の確認", answer: ["仮の答え3"] },
  { id: "puzzle-4", label: "第四の確認", answer: ["仮の答え4"] }
];

// 本番用：URLによるテストモード切り替えはありません。
const STORAGE_KEY = "gunkenSansoProgress_v1";
const innSite = document.getElementById("inn-site");
const liberationSite = document.getElementById("liberation-site");
const puzzleList = document.getElementById("puzzle-list");
const progressLabel = document.getElementById("progress-label");
const progressBar = document.getElementById("progress-bar");
const formStatus = document.getElementById("form-status");
const transitionScreen = document.getElementById("transition-screen");
const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

let solvedIds = new Set();
let transitionTimer = null;

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.solved)) {
      solvedIds = new Set(saved.solved.filter((id) => PUZZLES.some((puzzle) => puzzle.id === id)));
    }
  } catch (error) {
    // 保存データが読めない場合は、新しい進行状況として開始します。
    console.warn("群訝山荘：保存データを読み込めませんでした。", error);
    solvedIds = new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ solved: [...solvedIds] }));
    return true;
  } catch (error) {
    formStatus.textContent = "このブラウザでは進行状況を保存できません。ページを閉じずにお進みください。";
    console.warn("群訝山荘：進行状況を保存できませんでした。", error);
    return false;
  }
}

function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\u3000]+/g, "")
    .trim();
}

function getAcceptedAnswers(puzzle) {
  const values = Array.isArray(puzzle.answer) ? puzzle.answer : [puzzle.answer];
  return values.map(normalizeAnswer).filter(Boolean);
}

function updateProgress() {
  const total = PUZZLES.length;
  const count = solvedIds.size;
  progressLabel.textContent = `確認済み ${count} / ${total}`;
  progressBar.style.width = total > 0 ? `${(count / total) * 100}%` : "0%";
}

function createPuzzleRow(puzzle, index) {
  const row = document.createElement("div");
  row.className = "puzzle-row";
  row.dataset.puzzleId = puzzle.id;

  const label = document.createElement("label");
  label.className = "puzzle-label";
  label.htmlFor = `${puzzle.id}-input`;
  label.textContent = puzzle.label || `確認事項 ${String(index + 1).padStart(2, "0")}`;

  const input = document.createElement("input");
  input.className = "puzzle-input";
  input.id = `${puzzle.id}-input`;
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "答えを入力";
  input.setAttribute("aria-label", `${label.textContent}の答え`);

  const button = document.createElement("button");
  button.className = "puzzle-submit";
  button.type = "button";
  button.textContent = "照合する";

  const feedback = document.createElement("p");
  feedback.className = "puzzle-feedback";
  feedback.id = `${puzzle.id}-feedback`;
  feedback.setAttribute("aria-live", "polite");
  input.setAttribute("aria-describedby", feedback.id);

  const alreadySolved = solvedIds.has(puzzle.id);
  if (alreadySolved) {
    row.classList.add("is-solved");
    input.disabled = true;
    button.disabled = true;
    button.textContent = "確認済み";
    feedback.textContent = "確認しました。";
  }

  function checkAnswer() {
    if (solvedIds.has(puzzle.id)) return;
    const entered = normalizeAnswer(input.value);
    if (!entered) {
      feedback.textContent = "答えを入力してください。";
      input.focus();
      return;
    }

    const accepted = getAcceptedAnswers(puzzle);
    if (accepted.length === 0 || accepted.some((answer) => answer.startsWith("仮の答え"))) {
      feedback.textContent = "この確認事項は現在準備中です。";
      return;
    }

    if (accepted.includes(entered)) {
      solvedIds.add(puzzle.id);
      row.classList.add("is-solved");
      input.disabled = true;
      button.disabled = true;
      button.textContent = "確認済み";
      feedback.textContent = "確認しました。";
      updateProgress();
      saveProgress();
      formStatus.textContent = "確認事項を受け付けました。";

      if (solvedIds.size === PUZZLES.length && PUZZLES.length > 0) {
        formStatus.textContent = "すべての確認が完了しました。";
        window.setTimeout(showLiberationSite, 900);
      }
    } else {
      feedback.textContent = "入力内容をご確認ください。";
      input.setAttribute("aria-invalid", "true");
      input.addEventListener("input", () => input.removeAttribute("aria-invalid"), { once: true });
      input.focus();
    }
  }

  button.addEventListener("click", checkAnswer);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") checkAnswer();
  });

  row.append(label, input, button, feedback);
  return row;
}

function renderPuzzleFields() {
  puzzleList.replaceChildren();
  if (PUZZLES.length === 0) {
    const note = document.createElement("p");
    note.className = "loading-note";
    note.textContent = "確認事項は現在準備中です。";
    puzzleList.append(note);
    updateProgress();
    return;
  }
  PUZZLES.forEach((puzzle, index) => puzzleList.append(createPuzzleRow(puzzle, index)));
  updateProgress();
}

function showLiberationSite(withTransition = true) {
  if (!innSite || !liberationSite) return;
  if (transitionTimer) window.clearTimeout(transitionTimer);

  const reveal = () => {
    innSite.hidden = true;
    liberationSite.hidden = false;
    document.body.classList.add("is-liberation");
    document.title = "超常解放戦線 | INTERNAL NETWORK";
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#080909");
    window.scrollTo(0, 0);
    transitionScreen.classList.remove("is-active");
  };

  if (withTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    transitionScreen.classList.add("is-active");
    transitionTimer = window.setTimeout(reveal, 1100);
  } else {
    reveal();
  }
}

function setupMobileMenu() {
  if (!menuToggle || !mainNav) return;
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mainNav.classList.toggle("is-open", !isOpen);
  });
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      mainNav.classList.remove("is-open");
    });
  });
}

function initialize() {
  readProgress();
  renderPuzzleFields();
  setupMobileMenu();

  if (PUZZLES.length > 0 && solvedIds.size === PUZZLES.length) {
    showLiberationSite(false);
  }
}

// 管理者用：ブラウザの開発者コンソールで resetGunkenSanso() を実行すると、進行状況を消去できます。
window.resetGunkenSanso = function resetGunkenSanso() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.warn(error); }
  window.location.reload();
};

initialize();
