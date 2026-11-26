/* الحاسبة الزرقا — JavaScript خالص بدون مكتبات */

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
  // optional demo state for screenshots: ?demo=36*27
const demo = new URLSearchParams(location.search).get("demo");
if (demo && /^[\d+\-*/.]+$/.test(demo)) {
  const v = safeEval(demo);
  if (v !== null) { historyEl.innerHTML = pretty(demo) + " ="; expr = trimNum(v); }
}

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
    showError("invalid operation");
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
  if (val === null) { showError("incomplete expression"); return; }
  historyEl.innerHTML = pretty(expr) + " =";
  expr = trimNum(val);
  render();
}

document.querySelectorAll(".key").forEach((btn) => {
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
  if (/^[0-9]$/.test(e.key)) pushDigit(e.key);
  else if (e.key === ".") pushDot();
  else if ("+-*/".includes(e.key)) pushOp(e.key);
  else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); }
  else if (e.key === "Backspace") { expr = expr.slice(0, -1); render(); }
  else if (e.key === "Escape") { expr = ""; historyEl.innerHTML = "&nbsp;"; render(); }
});

render();
