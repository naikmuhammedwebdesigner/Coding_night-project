
/* =========================================
   HCM LITE — LEAVE MANAGEMENT CENTER
   ========================================= */

const leaveForm = document.getElementById("leave-form");
const leaveEmployee = document.getElementById("leave-employee");
const leaveType = document.getElementById("leave-type");
const leaveStart = document.getElementById("leave-start");
const leaveEnd = document.getElementById("leave-end");
const leaveReason = document.getElementById("leave-reason");
const leaveMessage = document.getElementById("leave-form-message");
const leaveSearch = document.getElementById("leave-search");
const leaveFilter = document.getElementById("leave-status-filter");
const leaveTableBody = document.getElementById("leave-table-body");
const leaveEmpty = document.getElementById("leave-empty");

function getEmployees() {
  return getData("hcm_users", []).filter(
    user => user && user.role === "employee"
  );
}

function getLeaveRequests() {
  return getData("hcm_leaves", []);
}

function saveLeaveRequests(requests) {
  return saveData("hcm_leaves", requests);
}

function todayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  return Math.round((end - start) / 86400000) + 1;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showLeaveMessage(message, isError = false) {
  leaveMessage.textContent = message;
  leaveMessage.style.color = isError
    ? "var(--danger)"
    : "var(--success)";
}

function populateLeaveEmployees() {
  const employees = getEmployees();
  const previousValue = leaveEmployee.value;

  leaveEmployee.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = employees.length
    ? "Select an employee"
    : "Add employees in People Studio first";

  leaveEmployee.appendChild(placeholder);

  employees.forEach(employee => {
    const option = document.createElement("option");
    option.value = employee.id;
    option.textContent = employee.name;
    leaveEmployee.appendChild(option);
  });

  if (employees.some(employee => employee.id === previousValue)) {
    leaveEmployee.value = previousValue;
  }
}

function renderLeaveStats(requests) {
  document.getElementById("leave-total").textContent = requests.length;

  document.getElementById("leave-pending").textContent =
    requests.filter(request => request.status === "pending").length;

  document.getElementById("leave-approved").textContent =
    requests.filter(request => request.status === "approved").length;

  document.getElementById("leave-rejected").textContent =
    requests.filter(request => request.status === "rejected").length;
}

function renderLeaveRequests() {
  const requests = getLeaveRequests();
  const employees = getEmployees();
  const employeeMap = new Map(
    employees.map(employee => [employee.id, employee])
  );

  const query = leaveSearch.value.trim().toLowerCase();
  const selectedStatus = leaveFilter.value;

  renderLeaveStats(requests);

  const filtered = requests.filter(request => {
    const employee = employeeMap.get(request.employeeId);
    const name = employee?.name || request.employeeName || "Unknown employee";

    return (
      name.toLowerCase().includes(query) &&
      (!selectedStatus || request.status === selectedStatus)
    );
  });

  // Newest applications first.
  filtered.sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );

  leaveTableBody.replaceChildren();

  document.getElementById("leave-record-count").textContent =
    `${filtered.length} ${filtered.length === 1 ? "request" : "requests"}`;

  leaveEmpty.hidden = filtered.length !== 0;

  document.querySelector(".leave-table-wrap").hidden =
    filtered.length === 0;

  document.getElementById("leave-empty-title").textContent =
    requests.length === 0
      ? "No leave requests yet"
      : "No matching requests";

  document.getElementById("leave-empty-description").textContent =
    requests.length === 0
      ? "Submit a leave application to get started."
      : "Try changing your search or status filter.";

  filtered.forEach(request => {
    const employee = employeeMap.get(request.employeeId);
    const name = employee?.name || request.employeeName || "Unknown employee";
    const department = employee?.department || "";

    const row = document.createElement("tr");

    // Employee name and department.
    const personCell = document.createElement("td");
    const person = document.createElement("div");
    person.className = "person-cell";

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
    person.append(avatar, details);
    personCell.appendChild(person);

    // Leave type.
    const typeCell = document.createElement("td");
    typeCell.textContent = `${request.leaveType || "Leave"} leave`;

    // Date range.
    const datesCell = document.createElement("td");
    datesCell.textContent =
      `${formatDate(request.startDate)} – ${formatDate(request.endDate)}`;

    // Number of calendar days, including start and end.
    const daysCell = document.createElement("td");
    daysCell.textContent = `${calculateLeaveDays(
      request.startDate,
      request.endDate
    )} ${calculateLeaveDays(
      request.startDate,
      request.endDate
    ) === 1 ? "day" : "days"}`;

    // Status badge.
    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    const status = ["pending", "approved", "rejected"].includes(request.status)
      ? request.status
      : "pending";

    badge.className = `status status-${status}`;
    badge.textContent =
      status.charAt(0).toUpperCase() + status.slice(1);

    statusCell.appendChild(badge);

    // Actions.
    const actionCell = document.createElement("td");

    if (status === "pending") {
      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.className = "btn btn-primary";
      approveButton.textContent = "Approve";
      approveButton.addEventListener("click", () => {
        updateLeaveStatus(request.id, "approved");
      });

      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.className = "btn btn-danger";
      rejectButton.textContent = "Reject";
      rejectButton.style.marginLeft = "6px";
      rejectButton.addEventListener("click", () => {
        updateLeaveStatus(request.id, "rejected");
      });

      actionCell.append(approveButton, rejectButton);
    } else {
      actionCell.textContent = "—";
    }

    row.append(
      personCell,
      typeCell,
      datesCell,
      daysCell,
      statusCell,
      actionCell
    );

    leaveTableBody.appendChild(row);
  });
}

function updateLeaveStatus(requestId, newStatus) {
  if (!["approved", "rejected"].includes(newStatus)) return;

  const requests = getLeaveRequests();
  const request = requests.find(item => item.id === requestId);

  if (!request || request.status !== "pending") {
    showLeaveMessage(
      "This request has already been reviewed or no longer exists.",
      true
    );
    renderLeaveRequests();
    return;
  }

  // Prevent overlapping approved leave for the same employee.
  if (newStatus === "approved") {
    const overlapping = requests.some(other =>
      other.id !== request.id &&
      other.employeeId === request.employeeId &&
      other.status === "approved" &&
      other.startDate <= request.endDate &&
      other.endDate >= request.startDate
    );

    if (overlapping) {
      showLeaveMessage(
        "This employee already has approved leave during these dates.",
        true
      );
      return;
    }
  }

  request.status = newStatus;
  request.reviewedAt = new Date().toISOString();

  if (!saveLeaveRequests(requests)) {
    showLeaveMessage("Could not save the decision. Please try again.", true);
    return;
  }

  showLeaveMessage(
    `Leave request ${newStatus} successfully.`
  );

  renderLeaveRequests();
}

leaveForm.addEventListener("submit", event => {
  event.preventDefault();

  const employee = getEmployees().find(
    person => person.id === leaveEmployee.value
  );

  if (!employee) {
    showLeaveMessage("Please select a team member.", true);
    return;
  }

  const startDate = leaveStart.value;
  const endDate = leaveEnd.value;
  const reason = leaveReason.value.trim();

  if (!leaveType.value || !startDate || !endDate || !reason) {
    showLeaveMessage("Please complete all required fields.", true);
    return;
  }

  if (endDate < startDate) {
    showLeaveMessage(
      "The end date cannot be earlier than the start date.",
      true
    );
    return;
  }

  if (reason.length > 500) {
    showLeaveMessage("The reason must be 500 characters or fewer.", true);
    return;
  }

  const requests = getLeaveRequests();

  // Prevent overlapping pending or approved requests.
  const overlapping = requests.some(request =>
    request.employeeId === employee.id &&
    ["pending", "approved"].includes(request.status) &&
    request.startDate <= endDate &&
    request.endDate >= startDate
  );

  if (overlapping) {
    showLeaveMessage(
      "This employee already has a pending or approved request for overlapping dates.",
      true
    );
    return;
  }

  const request = {
    id: crypto.randomUUID(),
    employeeId: employee.id,
    employeeName: employee.name,
    leaveType: leaveType.value,
    startDate,
    endDate,
    days: calculateLeaveDays(startDate, endDate),
    reason,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  requests.push(request);

  if (!saveLeaveRequests(requests)) {
    showLeaveMessage(
      "Could not save the application. Please try again.",
      true
    );
    return;
  }

  leaveForm.reset();
  showLeaveMessage(
    `Application submitted for ${employee.name}. It is now pending review.`
  );

  renderLeaveRequests();
});

leaveSearch.addEventListener("input", renderLeaveRequests);
leaveFilter.addEventListener("change", renderLeaveRequests);

leaveForm.addEventListener("reset", () => {
  leaveMessage.textContent = "";
});

function initializeLeaveManagement() {
  document.getElementById("leave-today").textContent =
    new Date().toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  populateLeaveEmployees();
  renderLeaveRequests();
}

initializeLeaveManagement();

// Refresh if employee or leave data changes in another browser tab.
window.addEventListener("storage", event => {
  if (["hcm_users", "hcm_leaves"].includes(event.key)) {
    populateLeaveEmployees();
    renderLeaveRequests();
  }
});
