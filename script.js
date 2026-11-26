/* مختبر الرياضيات — JavaScript خالص بدون مكتبات */

// ---------- Tabs ----------
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach((p) => {
      p.classList.toggle("active", p.id === tab.dataset.panel);
    });
  });
});

// ---------- Calculator ----------
const historyEl = document.getElementById("calc-history");
const currentEl = document.getElementById("calc-current");

let expr = ""; // the expression being typed, using + - * / and digits

const displayMap = { "*": "×", "/": "÷", "-": "−" };
const pretty = (s) => s.replace(/[*\/\-]/g, (c) => displayMap[c]);

function render() {
  currentEl.textContent = expr === "" ? "0" : pretty(expr);
}

function pushDigit(d) {
  if (expr === "0") expr = d;
  else expr += d;
  render();
}

function pushDot() {
  // one dot per number segment
  const seg = expr.split(/[+\-*/]/).pop();
  if (!seg.includes(".")) {
    expr += expr === "" || /[+\-*/]$/.test(expr) ? "0." : ".";
    render();
  }
}

function pushOp(op) {
  if (expr === "") {
    if (op === "-") { expr = "-"; render(); }
    return;
  }
  if (/[+\-*/]$/.test(expr)) expr = expr.slice(0, -1) + op; // replace last op
  else expr += op;
  render();
}

function applyUnary(kind) {
  const val = safeEval(expr);
  if (val === null) return;
  let out;
  if (kind === "sqrt") out = val < 0 ? NaN : Math.sqrt(val);
  if (kind === "square") out = val * val;
  if (kind === "inverse") out = val === 0 ? NaN : 1 / val;
  if (kind === "percent") out = val / 100;
  if (kind === "negate") out = -val;
  if (kind === "pi") out = Math.PI;
  if (Number.isNaN(out) || !Number.isFinite(out)) {
    showError("عملية غير صالحة");
    return;
  }
  historyEl.innerHTML = pretty(expr) + " =";
  expr = trimNum(out);
  render();
}

function trimNum(n) {
  return String(Math.round(n * 1e10) / 1e10);
}

function showError(msg) {
  historyEl.textContent = msg;
  expr = "";
  render();
}

// Shunting-yard evaluation, no eval()
function safeEval(s) {
  if (s === "" || /[+\-*/.]$/.test(s)) return null;
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      const v = parseFloat(num);
      if (Number.isNaN(v)) return null;
      tokens.push({ t: "num", v });
      continue;
    }
    if ("+-*/".includes(c)) {
      // unary minus
      if (c === "-" && (tokens.length === 0 || tokens[tokens.length - 1].t === "op")) {
        let j = i + 1, num = "";
        while (j < s.length && /[0-9.]/.test(s[j])) num += s[j++];
        const v = parseFloat(num);
        if (Number.isNaN(v)) return null;
        tokens.push({ t: "num", v: -v });
        i = j;
        continue;
      }
      tokens.push({ t: "op", v: c });
    }
    i++;
  }
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const out = [], ops = [];
  for (const tk of tokens) {
    if (tk.t === "num") out.push(tk);
    else {
      while (ops.length && prec[ops[ops.length - 1].v] >= prec[tk.v]) out.push(ops.pop());
      ops.push(tk);
    }
  }
  while (ops.length) out.push(ops.pop());
  const st = [];
  for (const tk of out) {
    if (tk.t === "num") st.push(tk.v);
    else {
      const b = st.pop(), a = st.pop();
      if (a === undefined || b === undefined) return null;
      if (tk.v === "+") st.push(a + b);
      if (tk.v === "-") st.push(a - b);
      if (tk.v === "*") st.push(a * b);
      if (tk.v === "/") { if (b === 0) return null; st.push(a / b); }
    }
  }
  return st.length === 1 ? st[0] : null;
}

function equals() {
  const val = safeEval(expr);
  if (val === null) { showError("صيغة غير مكتملة"); return; }
  historyEl.innerHTML = pretty(expr) + " =";
  expr = trimNum(val);
  render();
}

document.querySelectorAll("#panel-calc .key").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.digit !== undefined) pushDigit(btn.dataset.digit);
    else if (btn.dataset.op) pushOp(btn.dataset.op);
    else {
      const a = btn.dataset.action;
      if (a === "clear") { expr = ""; historyEl.innerHTML = "&nbsp;"; render(); }
      if (a === "dot") pushDot();
      if (a === "equals") equals();
      if (a === "backspace") { expr = expr.slice(0, -1); render(); }
      if (["sqrt", "square", "inverse", "percent", "negate", "pi"].includes(a)) applyUnary(a);
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (!document.getElementById("panel-calc").classList.contains("active")) return;
  if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
  else if (e.key === ".") pushDot();
  else if ("+-*/".includes(e.key)) pushOp(e.key);
  else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); }
  else if (e.key === "Backspace") { expr = expr.slice(0, -1); render(); }
  else if (e.key === "Escape") { expr = ""; historyEl.innerHTML = "&nbsp;"; render(); }
});

// ---------- Equation solver ----------
const chips = document.querySelectorAll(".chip");
const formulaEl = document.getElementById("solver-formula");
const fieldC = document.getElementById("field-c");
const stepsEl = document.getElementById("steps");
let degree = 1;

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.toggle("active", c === chip));
    degree = Number(chip.dataset.degree);
    formulaEl.textContent = degree === 1 ? "a·x + b = 0" : "a·x² + b·x + c = 0";
    fieldC.classList.toggle("hidden", degree === 1);
    stepsEl.innerHTML = "";
  });
});

function fmt(n) {
  const r = Math.round(n * 1e6) / 1e6;
  return Object.is(r, -0) ? "0" : String(r);
}

function signed(n, first = false) {
  if (first) return n < 0 ? `-${fmt(Math.abs(n))}` : fmt(n);
  return n < 0 ? ` − ${fmt(Math.abs(n))}` : ` + ${fmt(n)}`;
}

function addStep(title, math, note = "", isResult = false) {
  const div = document.createElement("div");
  div.className = "step" + (isResult ? " result" : "");
  div.innerHTML =
    `<div class="step-title"></div>` +
    `<div class="step-math"></div>` +
    (note ? `<div class="step-note"></div>` : "");
  div.querySelector(".step-title").textContent = title;
  div.querySelector(".step-math").textContent = math;
  if (note) div.querySelector(".step-note").textContent = note;
  stepsEl.appendChild(div);
}

function solve() {
  const a = parseFloat(document.getElementById("in-a").value);
  const b = parseFloat(document.getElementById("in-b").value);
  const c = parseFloat(document.getElementById("in-c").value);
  stepsEl.innerHTML = "";

  if ([a, b].some(Number.isNaN) || (degree === 2 && Number.isNaN(c))) {
    addStep("تنبيه", "...", "املأ كل المعاملات بأرقام صحيحة الأول 🙏");
    return;
  }
  if (a === 0 && degree === 2) {
    addStep("تنبيه", "a ≠ 0", "لو a بصفر، المعادلة مش من الدرجة الثانية — جرّب الدرجة الأولى.");
    return;
  }
  if (a === 0) {
    addStep("تنبيه", "a ≠ 0", "لو a بصفر مفيش معادلة في x أصلًا — غيّر قيمة a.");
    return;
  }

  if (degree === 1) {
    addStep("المعادلة", `${fmt(a)}x${signed(b)} = 0`);
    addStep("الخطوة ١: نودّي b الناحية التانية بعكس الإشارة", `${fmt(a)}x = ${fmt(-b)}`);
    addStep("الخطوة ٢: نقسم على a", `x = ${fmt(-b)} ÷ ${fmt(a)}`);
    addStep("الحل ✅", `x = ${fmt(-b / a)}`, "", true);
  } else {
    const d = b * b - 4 * a * c;
    addStep("المعادلة", `${fmt(a)}x²${signed(b)}x${signed(c)} = 0`);
    addStep(
      "الخطوة ١: نحسب المميّز Δ",
      `Δ = b² − 4ac = (${fmt(b)})² − 4×${fmt(a)}×${fmt(c)} = ${fmt(d)}`,
      "المميّز بيحدد عدد الحلول"
    );
    if (d > 0) {
      const r1 = (-b + Math.sqrt(d)) / (2 * a);
      const r2 = (-b - Math.sqrt(d)) / (2 * a);
      addStep("الخطوة ٢: Δ موجب، يبقى في حلّين حقيقيين", `x = (−b ± √Δ) ÷ 2a = (${fmt(-b)} ± ${fmt(Math.sqrt(d))}) ÷ ${fmt(2 * a)}`);
      addStep("الحل ✅", `x₁ = ${fmt(r1)}    x₂ = ${fmt(r2)}`, "", true);
    } else if (d === 0) {
      const r = -b / (2 * a);
      addStep("الخطوة ٢: Δ بصفر، يبقى في حل واحد مكرر", `x = −b ÷ 2a = ${fmt(-b)} ÷ ${fmt(2 * a)}`);
      addStep("الحل ✅", `x = ${fmt(r)}`, "", true);
    } else {
      addStep("الخطوة ٢: Δ سالب", `Δ = ${fmt(d)} < 0`, "مفيش حلول حقيقية — الحلول مركّبة");
      const re = -b / (2 * a);
      const im = Math.sqrt(-d) / (2 * a);
      addStep("الحل (أعداد مركّبة) ✅", `x = ${fmt(re)} ± ${fmt(im)}i`, "", true);
    }
  }
}

document.getElementById("solve-btn").addEventListener("click", solve);

render();
