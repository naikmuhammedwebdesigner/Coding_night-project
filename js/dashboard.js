
function updateAdminDashboard() {
  const users = getData("hcm_users", []);
  const attendance = getData("hcm_attendance", []);
  const leaves = getData("hcm_leaves", []);

  const employees = users.filter(
    user => user.role === "employee"
  );

  // Use the computer's local date.
  const now = new Date();
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  const todayAttendance = attendance.filter(
    record => record.date === todayKey
  );

  const approvedLeaves = leaves.filter(leave => {
    return (
      String(leave.status || "").toLowerCase() === "approved" &&
      leave.startDate <= todayKey &&
      leave.endDate >= todayKey
    );
  });

  const onLeaveEmployeeIds = new Set(
    approvedLeaves.map(leave =>
      leave.employeeId || leave.userId
    )
  );

  const onLeaveCount = employees.filter(employee =>
    onLeaveEmployeeIds.has(employee.id)
  ).length;

  const presentCount = todayAttendance.filter(record =>
    ["present", "late", "half-day"].includes(
      String(record.status || "").toLowerCase()
    )
  ).length;

  const lateCount = todayAttendance.filter(record =>
    String(record.status || "").toLowerCase() === "late"
  ).length;

  // Update dashboard statistics.
  setText("total-employees", employees.length);
  setText("present-today", presentCount);
  setText("on-leave-today", onLeaveCount);
  setText("late-today", lateCount);

  // Show attendance records in the dashboard.
  renderDashboardAttendance(todayAttendance);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

// Escape text before inserting employee information into HTML.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatDashboardTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderDashboardAttendance(records) {
  const tableBody = document.getElementById(
    "attendance-table-body"
  );

  if (!tableBody) return;

  const sortedRecords = [...records].sort((a, b) => {
    return new Date(b.checkIn) - new Date(a.checkIn);
  });

  if (sortedRecords.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="muted">
          No attendance records for today yet.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = sortedRecords.map(record => {
    const status = String(record.status || "unknown")
      .toLowerCase();

    const statusLabel = status
      .replace("-", " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());

    return `
      <tr>
        <td>${escapeHTML(record.employeeName || "Unknown")}</td>
        <td>${escapeHTML(record.date || "—")}</td>
        <td>${escapeHTML(formatDashboardTime(record.checkIn))}</td>
        <td>${escapeHTML(formatDashboardTime(record.checkOut))}</td>
        <td>
          <span class="status status-${escapeHTML(status)}">
            ${escapeHTML(statusLabel)}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

// Initial dashboard load.
updateAdminDashboard();

// Refresh when data changes in another browser tab.
window.addEventListener("storage", event => {
  if (
    ["hcm_users", "hcm_attendance", "hcm_leaves"].includes(event.key)
  ) {
    updateAdminDashboard();
  }
});
