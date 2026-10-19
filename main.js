var topZ = 10;

function bringToFront(el) {
  topZ = topZ + 1;
  el.style.zIndex = topZ;
}

function openWindow(id) {
  var w = document.getElementById(id);
  w.style.display = "block";
  bringToFront(w);
}

function closeWindow(id) {
  document.getElementById(id).style.display = "none";
}

document.getElementById("open-stopwatch").onclick = function () {
  openWindow("stopwatch-window");
};
document.getElementById("open-calculator").onclick = function () {
  openWindow("calculator-window");
};
document.getElementById("open-notepad").onclick = function () {
  openWindow("notepad-window");
};

// random colours for the dock icons
var icons = document.querySelectorAll(".dock-icon");
var startHue = Math.floor(Math.random() * 360);
for (var k = 0; k < icons.length; k++) {
  var hue = (startHue + k * 120) % 360;
  icons[k].style.background = "hsl(" + hue + ", 65%, 55%)";
}


function updateClock() {
  var now = new Date();
  document.getElementById("time").innerText =
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("date").innerText =
    now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}
updateClock();
setInterval(updateClock, 1000);


var swStart = 0;
var swElapsed = 0;
var swTimer = null;

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function showStopwatch() {
  var total = Math.floor(swElapsed / 10);
  var cs = total % 100;
  var s = Math.floor(total / 100) % 60;
  var m = Math.floor(total / 6000);
  document.getElementById("sw-display").innerText =
    pad(m) + ":" + pad(s) + "." + pad(cs);
}

function toggleStopwatch() {
  var btn = document.getElementById("sw-toggle");
  if (swTimer === null) {
    swStart = Date.now() - swElapsed;
    swTimer = setInterval(function () {
      swElapsed = Date.now() - swStart;
      showStopwatch();
    }, 30);
    btn.innerText = "Stop";
  } else {
    clearInterval(swTimer);
    swTimer = null;
    btn.innerText = "Start";
  }
}

function resetStopwatch() {
  clearInterval(swTimer);
  swTimer = null;
  swElapsed = 0;
  document.getElementById("sw-toggle").innerText = "Start";
  showStopwatch();
}


var expr = "";
var topLine = "";
var errorMsg = "";
var justEvaluated = false;
var calcHistory = [];

try {
  calcHistory = JSON.parse(localStorage.getItem("calcHistory")) || [];
} catch (e) {
  calcHistory = [];
}

function pretty(s) {
  return s.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
}

function isOperator(ch) {
  return "+-*/".indexOf(ch) !== -1;
}

function updateCalc() {
  document.getElementById("calc-expr").innerText = topLine;
  document.getElementById("calc-display").innerText =
    errorMsg || pretty(expr) || "0";
}

function renderHistory() {
  var list = document.getElementById("history-list");
  list.innerHTML = "";
  for (var i = 0; i < calcHistory.length; i++) {
    var item = document.createElement("div");
    item.className = "history-item";
    item.setAttribute("data-index", i);
    item.innerText = calcHistory[i].expr + " = " + calcHistory[i].result;
    item.onclick = function () {
      var entry = calcHistory[this.getAttribute("data-index")];
      expr = entry.result;
      topLine = "";
      errorMsg = "";
      justEvaluated = true;
      updateCalc();
    };
    list.appendChild(item);
  }
}

function saveHistory() {
  try {
    localStorage.setItem("calcHistory", JSON.stringify(calcHistory));
  } catch (e) {}
}

function clearHistory() {
  calcHistory = [];
  saveHistory();
  renderHistory();
}

function equals() {
  var clean = expr;
  if (clean !== "" && isOperator(clean.charAt(clean.length - 1))) {
    clean = clean.slice(0, -1);
  }
  if (clean === "" || !/^[0-9+\-*\/.]+$/.test(clean)) return;

  var result;
  try {
    result = Function('"use strict"; return (' + clean + ")")();
  } catch (e) {
    result = NaN;
  }

  topLine = pretty(clean) + " =";

  if (!isFinite(result)) {
    errorMsg = "Error";
    expr = "";
    justEvaluated = false;
    return;
  }

  var resultStr = String(parseFloat(result.toFixed(10)));
  if (resultStr.indexOf("e") !== -1) {
    errorMsg = "Too big";
    expr = "";
    justEvaluated = false;
    return;
  }

  calcHistory.unshift({ expr: pretty(clean), result: resultStr });
  if (calcHistory.length > 20) calcHistory.pop();
  saveHistory();
  renderHistory();

  expr = resultStr;
  justEvaluated = true;
}

function pressKey(key) {
  errorMsg = "";

  if (key === "C") {
    expr = "";
    topLine = "";
    justEvaluated = false;
  } else if (key === "=") {
    equals();
  } else if (key === "±") {
    if (expr !== "" && /^-?[0-9.]+$/.test(expr)) {
      expr = expr.charAt(0) === "-" ? expr.slice(1) : "-" + expr;
    }
  } else if (key === "%") {
    var m = expr.match(/(\d+\.?\d*)$/);
    if (m) {
      var v = parseFloat(m[1]) / 100;
      expr = expr.slice(0, expr.length - m[1].length) + String(parseFloat(v.toFixed(10)));
    }
  } else if (isOperator(key)) {
    if (expr === "") {
      if (key === "-") expr = "-";
    } else if (expr !== "-") {
      var last = expr.charAt(expr.length - 1);
      if (isOperator(last)) {
        expr = expr.slice(0, -1) + key;
      } else {
        expr = expr + key;
      }
    }
    justEvaluated = false;
  } else {
    if (justEvaluated) {
      expr = "";
      topLine = "";
      justEvaluated = false;
    }
    var parts = expr.split(/[+\-*\/]/);
    var lastNum = parts[parts.length - 1];
    if (key === ".") {
      if (lastNum.indexOf(".") !== -1) return;
      if (lastNum === "") expr = expr + "0";
    } else if (lastNum === "0") {
      expr = expr.slice(0, -1);
    }
    expr = expr + key;
  }

  updateCalc();
}

updateCalc();
renderHistory();

// notepad
var notes = [];
var currentId = null;

try {
  notes = JSON.parse(localStorage.getItem("notes")) || [];
} catch (e) {
  notes = [];
}

function saveNotes() {
  try {
    localStorage.setItem("notes", JSON.stringify(notes));
  } catch (e) {}
}

function findNote(id) {
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === id) return notes[i];
  }
  return null;
}

function formatNoteTime(ms) {
  var d = new Date(ms);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderNotes() {
  var list = document.getElementById("note-list");
  list.innerHTML = "";
  for (var i = 0; i < notes.length; i++) {
    var n = notes[i];
    var item = document.createElement("div");
    item.className = "note-item" + (n.id === currentId ? " active" : "");
    item.setAttribute("data-id", n.id);

    var title = document.createElement("div");
    title.className = "note-title";
    title.innerText = n.text.split("\n")[0].trim() || "New note";

    var time = document.createElement("div");
    time.className = "note-time";
    time.innerText = formatNoteTime(n.time);

    item.appendChild(title);
    item.appendChild(time);
    item.onclick = function () {
      selectNote(Number(this.getAttribute("data-id")));
    };
    list.appendChild(item);
  }
}

function selectNote(id) {
  currentId = id;
  var n = findNote(id);
  document.getElementById("note-text").value = n ? n.text : "";
  document.getElementById("note-status").innerText = "Saved";
  renderNotes();
}

function newNote() {
  var n = { id: Date.now(), text: "", time: Date.now() };
  notes.unshift(n);
  saveNotes();
  selectNote(n.id);
  document.getElementById("note-text").focus();
}

function deleteNote() {
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === currentId) {
      notes.splice(i, 1);
      break;
    }
  }
  if (notes.length === 0) {
    newNote();
    return;
  }
  saveNotes();
  selectNote(notes[0].id);
}

document.getElementById("note-text").oninput = function () {
  var n = findNote(currentId);
  if (!n) return;
  n.text = this.value;
  n.time = Date.now();
  saveNotes();
  document.getElementById("note-status").innerText = "Saved";
  renderNotes();
};

if (notes.length === 0) {
  newNote();
} else {
  selectNote(notes[0].id);
}


var dragged = null;
var offsetX = 0;
var offsetY = 0;

var windows = document.querySelectorAll(".window");
for (var w = 0; w < windows.length; w++) {
  windows[w].onmousedown = function () {
    bringToFront(this);
  };
}

var titlebars = document.querySelectorAll(".titlebar");
for (var i = 0; i < titlebars.length; i++) {
  titlebars[i].onmousedown = function (e) {
    if (e.target.className === "close") return;
    dragged = this.parentElement;
    offsetX = e.clientX - dragged.offsetLeft;
    offsetY = e.clientY - dragged.offsetTop;
  };
}

document.onmousemove = function (e) {
  if (dragged === null) return;
  var newTop = e.clientY - offsetY;
  if (newTop < 0) newTop = 0;
  dragged.style.left = (e.clientX - offsetX) + "px";
  dragged.style.top = newTop + "px";
};

document.onmouseup = function () {
  dragged = null;
};
