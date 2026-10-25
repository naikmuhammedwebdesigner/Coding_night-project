
/* =========================================
   HCM LITE — ATTENDANCE OPERATIONS
   ========================================= */

const employeeSelect = document.getElementById("attendance-employee");
const attendanceMessage = document.getElementById("attendance-message");
const attendanceSearch = document.getElementById("attendance-search");
const attendanceFilter = document.getElementById("attendance-status-filter");

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getTeamMembers() {
  return getData("hcm_users", []).filter(
    user => user && user.role === "employee"
  );
}

function getTodayAttendance() {
  const today = localDateKey();
  return getData("hcm_attendance", []).filter(
    record => record.date === today
  );
}

function getCompanySettings() {
  return {
    officeStart: "09:00",
    gracePeriod: 15,
    ...getData("hcm_company", {})
  };
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return "—";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function getStatus(record) {
  if (record.status === "half-day") return "half-day";
  if (record.checkOut) return "checked-out";
  if (record.status === "late") return "late";
  return "present";
}

function statusLabel(status) {
  const labels = {
    present: "Present",
    late: "Late",
    "half-day": "Half-day",
    "checked-out": "Checked out"
  };

  return labels[status] || status;
}

function showMessage(message, isError = false) {
  if (!attendanceMessage) return;

  attendanceMessage.textContent = message;
  attendanceMessage.style.color = isError
    ? "var(--danger)"
    : "var(--success)";
}

function populateEmployees() {
  if (!employeeSelect) return;

  const employees = getTeamMembers();
  const selectedId = employeeSelect.value;

  employeeSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = employees.length
    ? "Select an employee"
    : "Add employees first";

  employeeSelect.appendChild(placeholder);

  employees.forEach(employee => {
    const option = document.createElement("option");
    option.value = employee.id;
    option.textContent = employee.name;
    employeeSelect.appendChild(option);
  });

  if (employees.some(employee => employee.id === selectedId)) {
    employeeSelect.value = selectedId;
  }
}

function updateSelectedEmployee() {
  if (!employeeSelect) return;

  const employee = getTeamMembers().find(
    person => person.id === employeeSelect.value
  );

  const avatar = document.querySelector(".attendance-avatar");
  const name = document.getElementById("selected-employee-name");
  const department = document.getElementById("selected-employee-department");
  const status = document.getElementById("selected-attendance-status");
  const checkInButton = document.getElementById("check-in-button");
  const checkOutButton = document.getElementById("check-out-button");

  checkInButton.disabled = true;
  checkOutButton.disabled = true;

  if (!employee) {
    avatar.textContent = "N";
    name.textContent = "No employee selected";
    department.textContent = "Choose a team member above";
    status.textContent = "Not checked in";
    return;
  }

  avatar.textContent = employee.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");

  name.textContent = employee.name;
  department.textContent = employee.department || "No department";

  const record = getTodayAttendance().find(
    item => item.employeeId === employee.id
  );

  if (!record) {
    status.textContent = "Not checked in";
    checkInButton.disabled = false;
    return;
  }

  status.textContent = statusLabel(getStatus(record));

  if (!record.checkOut) {
    checkOutButton.disabled = false;
  }
}

function renderAttendance() {
  const employees = getTeamMembers();
  const records = getTodayAttendance();
  const query = attendanceSearch.value.trim().toLowerCase();
  const selectedStatus = attendanceFilter.value;

  // Employees with an open check-in session.
  const checkedInIds = new Set(
    records
      .filter(record => !record.checkOut)
      .map(record => record.employeeId)
  );

  const lateCount = records.filter(
    record => record.status === "late"
  ).length;

  document.getElementById("att-total").textContent = employees.length;
  document.getElementById("att-present").textContent = checkedInIds.size;
  document.getElementById("att-late").textContent = lateCount;

  document.getElementById("att-missing").textContent =
    employees.filter(employee =>
      !records.some(record => record.employeeId === employee.id)
    ).length;

  const membersById = new Map(
    employees.map(employee => [employee.id, employee])
  );

  const filtered = records.filter(record => {
    const employee = membersById.get(record.employeeId);
    const name = employee?.name || record.employeeName || "Unknown";
    const status = getStatus(record);

    return (
      name.toLowerCase().includes(query) &&
      (!selectedStatus || status === selectedStatus)
    );
  });

  const body = document.getElementById("attendance-table-body");
  const empty = document.getElementById("attendance-empty");
  const table = document.querySelector(
    ".attendance-records-card .people-table"
  );

  body.replaceChildren();

  document.getElementById("attendance-record-count").textContent =
    `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;

  empty.hidden = filtered.length > 0;
  table.hidden = filtered.length === 0;

  document.getElementById("attendance-empty-title").textContent =
    records.length === 0
      ? "No attendance yet"
      : "No matching records";

  document.getElementById("attendance-empty-description").textContent =
    records.length === 0
      ? "Check in an employee to start today's attendance records."
      : "Try changing your search or status filter.";

  filtered.sort((a, b) =>
    String(b.checkIn || "").localeCompare(String(a.checkIn || ""))
  );

  filtered.forEach(record => {
    const employee = membersById.get(record.employeeId);
    const name =
      employee?.name || record.employeeName || "Unknown employee";
    const department = employee?.department || "";

    const row = document.createElement("tr");

    // Column 1: Employee.
    const personCell = document.createElement("td");
    const personLayout = document.createElement("div");
    personLayout.className = "person-cell";

    const avatar = document.createElement("span");
    avatar.className = "person-avatar";
    avatar.textContent = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || "")
      .join("");

    const details = document.createElement("div");

    const nameElement = document.createElement("div");
    nameElement.className = "person-name";
    nameElement.textContent = name;

    const departmentElement = document.createElement("div");
    departmentElement.className = "person-email";
    departmentElement.textContent = department;

    details.append(nameElement, departmentElement);
    personLayout.append(avatar, details);
    personCell.appendChild(personLayout);

    // Column 2: Check-in.
    const checkInCell = document.createElement("td");
    checkInCell.textContent = formatTime(record.checkIn);

    // Column 3: Check-out.
    const checkOutCell = document.createElement("td");
    checkOutCell.textContent = formatTime(record.checkOut);

    // Column 4: Duration.
    const durationCell = document.createElement("td");
    durationCell.textContent =
      record.workMinutes === null ||
      record.workMinutes === undefined
        ? "In progress"
        : formatDuration(record.workMinutes);

    // Column 5: Status.
    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    const status = getStatus(record);

    statusBadge.className = `attendance-status ${status}`;
    statusBadge.textContent = statusLabel(status);
    statusCell.appendChild(statusBadge);

    // Exactly five cells, matching the HTML table headings.
    row.append(
      personCell,
      checkInCell,
      checkOutCell,
      durationCell,
      statusCell
    );

    body.appendChild(row);
  });
}

function refreshAttendance() {
  renderAttendance();
  updateSelectedEmployee();
}

// CHECK-IN
document.getElementById("check-in-button").addEventListener("click", () => {
  const employee = getTeamMembers().find(
    person => person.id === employeeSelect.value
  );

  if (!employee) {
    showMessage("Please select an employee first.", true);
    return;
  }

  const records = getData("hcm_attendance", []);
  const today = localDateKey();

  const alreadyCheckedIn = records.some(record =>
    record.employeeId === employee.id && record.date === today
  );

  if (alreadyCheckedIn) {
    showMessage("This employee already has a record for today.", true);
    refreshAttendance();
    return;
  }

  const now = new Date();
  const settings = getCompanySettings();
  const [startHour, startMinute] =
    settings.officeStart.split(":").map(Number);

  const officeStart = new Date(now);
  officeStart.setHours(startHour, startMinute, 0, 0);

  const gracePeriod = Math.max(0, Number(settings.gracePeriod) || 0);
  const late =
    now.getTime() > officeStart.getTime() + gracePeriod * 60000;

  records.push({
    id: crypto.randomUUID(),
    employeeId: employee.id,
    employeeName: employee.name,
    date: today,
    checkIn: now.toISOString(),
    checkOut: null,
    workMinutes: null,
    status: late ? "late" : "present"
  });

  if (!saveData("hcm_attendance", records)) {
    showMessage("Could not save attendance. Please try again.", true);
    return;
  }

  showMessage(`${employee.name} checked in successfully.`);
  refreshAttendance();
});

// CHECK-OUT
document.getElementById("check-out-button").addEventListener("click", () => {
  const employeeId = employeeSelect.value;
  const records = getData("hcm_attendance", []);
  const today = localDateKey();

  const record = records.find(item =>
    item.employeeId === employeeId &&
    item.date === today &&
    !item.checkOut
  );

  if (!record) {
    showMessage("No open check-in record was found.", true);
    refreshAttendance();
    return;
  }

  const now = new Date();
  const checkInTime = new Date(record.checkIn);

  const workMinutes = Math.max(
    0,
    Math.floor((now.getTime() - checkInTime.getTime()) / 60000)
  );

  // Don't allow an immediate, zero-minute checkout.
  if (workMinutes === 0) {
    showMessage(
      "Check-out must be at least one minute after check-in.",
      true
    );
    return;
  }

  record.checkOut = now.toISOString();
  record.workMinutes = workMinutes;

  if (workMinutes < 5 * 60) {
    record.status = "half-day";
  } else if (record.status === "half-day") {
    record.status = "present";
  }

  if (!saveData("hcm_attendance", records)) {
    showMessage("Could not save check-out. Please try again.", true);
    return;
  }

  showMessage(
    `Check-out recorded. Total time: ${formatDuration(workMinutes)}.`
  );

  refreshAttendance();
});

// SEARCH, FILTER, AND EMPLOYEE SELECTION.
employeeSelect.addEventListener("change", updateSelectedEmployee);
attendanceSearch.addEventListener("input", renderAttendance);
attendanceFilter.addEventListener("change", renderAttendance);

// LIVE DATE AND CLOCK.
function updateClock() {
  const now = new Date();

  document.getElementById("attendance-today").textContent =
    now.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  document.getElementById("live-clock").textContent =
    now.toLocaleTimeString();
}

function initializeAttendance() {
  const settings = getCompanySettings();

  document.getElementById("office-start-label").textContent =
    settings.officeStart;

  document.getElementById("grace-period-label").textContent =
    settings.gracePeriod;

  populateEmployees();
  updateClock();
  refreshAttendance();
}

initializeAttendance();
setInterval(updateClock, 1000);
