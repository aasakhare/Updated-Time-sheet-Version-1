let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];

/* ADD ENTRY */
function addEntry() {
  const date = document.getElementById("date").value;
  const task = document.getElementById("task").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!date || !task || !start || !end) {
    alert("Please fill all fields");
    return;
  }

  const startTime = new Date(`1970-01-01T${start}`);
  const endTime = new Date(`1970-01-01T${end}`);
  const hours = (endTime - startTime) / 3600000;

  if (hours <= 0) {
    alert("Invalid time range");
    return;
  }

  entries.push({
    id: Date.now(),
    date,
    task,
    start,
    end,
    hours: Number(hours)
  });

  localStorage.setItem("timesheetEntries", JSON.stringify(entries));
  renderTodayEntries();
  updateDashboard();

  document.getElementById("task").value = "";
  document.getElementById("start").value = "";
  document.getElementById("end").value = "";
}

/* DELETE ENTRY */
function deleteEntry(id) {
  if (!confirm("Delete this entry?")) return;

  entries = entries.filter(e => e.id !== id);
  localStorage.setItem("timesheetEntries", JSON.stringify(entries));

  renderTodayEntries();
  renderAllEntries();
  updateDashboard();
}

/* TODAY ENTRIES (ADD PAGE) */
function renderTodayEntries() {
  const list = document.getElementById("entryList");
  if (!list) return;

  const today = new Date().toISOString().split("T")[0];
  list.innerHTML = "";
  let total = 0;

  entries.filter(e => e.date === today).forEach(e => {
    total += e.hours;
    list.innerHTML += `
      <div class="entry">
        <strong>${e.task}</strong><br>
        ${e.start} – ${e.end} (${e.hours.toFixed(2)} hrs)
        <button onclick="deleteEntry(${e.id})">Delete</button>
      </div>`;
  });

  list.innerHTML += `<strong>Total Today: ${total.toFixed(2)} hrs</strong>`;
}

/* VIEW ALL */
function renderAllEntries() {
  const container = document.getElementById("entries");
  if (!container) return;

  container.innerHTML = "";
  entries.forEach(e => {
    container.innerHTML += `
      <div class="entry">
        <strong>${e.date}</strong> – ${e.task}<br>
        ${e.start} – ${e.end} (${e.hours.toFixed(2)} hrs)
        <button onclick="deleteEntry(${e.id})">Delete</button>
      </div>`;
  });
}

/* DASHBOARD TOTALS */
function updateDashboard() {
  const t = document.getElementById("todayHours");
  const w = document.getElementById("weekHours");
  const m = document.getElementById("monthHours");
  const y = document.getElementById("yearHours");

  if (!t || !w || !m || !y) return;

  let today = 0, week = 0, month = 0, year = 0;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const weekStart = new Date(now);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);

  entries.forEach(e => {
    const hrs = Number(e.hours);
    if (!Number.isFinite(hrs)) return;

    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);

    if (e.date === todayStr) today += hrs;
    if (d >= weekStart) week += hrs;
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month += hrs;
    if (d.getFullYear() === now.getFullYear()) year += hrs;
  });

  t.innerText = today.toFixed(2);
  w.innerText = week.toFixed(2);
  m.innerText = month.toFixed(2);
  y.innerText = year.toFixed(2);
}

/* AUTO LOAD */
window.onload = () => {
  updateDashboard();
  renderTodayEntries();
};

/***************************************
 * TIMESHEET EXCEL EXPORT – FULL CODE
 * Storage Key: timesheetEntries
 ***************************************/

/* Utility: Convert YYYY-MM-DD to Date */
function toDate(dateStr) {
    return new Date(dateStr + "T00:00:00");
}

/* Core Excel Export Function */
function exportExcel(data, fileName) {
    if (!data || data.length === 0) {
        alert("No data available for export");
        return;
    }

    const formattedData = data.map((e, index) => ({
        "Sr No": index + 1,
        "Date": e.date,
        "Task Description": e.task,
        "Start Time": e.startTime,
        "End Time": e.endTime,
        "Hours Worked": Number(e.hours)
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");

    XLSX.writeFile(workbook, fileName);
}

/* ===============================
   WEEKLY EXPORT (MON–FRI, 5 DAYS)
   =============================== */
function exportWeekly() {
    const selectedDate = document.getElementById("weekDate").value;
    if (!selectedDate) {
        alert("Please select a date");
        return;
    }

    const entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];
    const refDate = toDate(selectedDate);

    const day = refDate.getDay(); // 0=Sun
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1));

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const weeklyData = entries.filter(e => {
        const d = toDate(e.date);
        return d >= monday && d <= friday;
    });

    exportExcel(weeklyData, "Weekly_Timesheet.xlsx");
}

/* ===============================
   DATE RANGE EXPORT
   =============================== */
function exportByDateRange() {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;

    if (!from || !to) {
        alert("Please select both From and To dates");
        return;
    }

    const entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];
    const fromDate = toDate(from);
    const toDateVal = toDate(to);

    const rangeData = entries.filter(e => {
        const d = toDate(e.date);
        return d >= fromDate && d <= toDateVal;
    });

    exportExcel(rangeData, "Date_Range_Timesheet.xlsx");
}

/* ===============================
   MONTHLY EXPORT
   =============================== */
function exportMonthly() {
    const monthValue = document.getElementById("monthSelect").value;
    if (!monthValue) {
        alert("Please select a month");
        return;
    }

    const entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];

    const monthlyData = entries.filter(e =>
        e.date.startsWith(monthValue) // YYYY-MM
    );

    exportExcel(monthlyData, `Timesheet_${monthValue}.xlsx`);
}


