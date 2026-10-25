
const form = document.getElementById("employee-form");
const formPanel = document.getElementById("employee-form-panel");
const formMessage = document.getElementById("form-message");
const tableBody = document.getElementById("employee-table-body");
const countLabel = document.getElementById("employee-count");
const searchInput = document.getElementById("employee-search");
const departmentFilter = document.getElementById("department-filter");
const emptyState = document.getElementById("employee-empty");

const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

function getEmployees() {
  return getData("hcm_users", []).filter(
    person => person && person.role !== "admin"
  );
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderEmployees() {
  const employees = getEmployees();
  const query = searchInput.value.trim().toLowerCase();
  const selectedDepartment = departmentFilter.value;

  const departments = [...new Set(
    employees.map(person => person.department).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const previousDepartment = departmentFilter.value;
  departmentFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All departments";
  departmentFilter.appendChild(allOption);

  departments.forEach(department => {
    const option = document.createElement("option");
    option.value = department;
    option.textContent = department;
    departmentFilter.appendChild(option);
  });

  departmentFilter.value = departments.includes(previousDepartment)
    ? previousDepartment
    : "";

  const uniqueDepartments = new Set(
    employees.map(person => person.department.trim()).filter(Boolean)
  );

  const now = new Date();
  const addedThisMonth = employees.filter(person => {
    if (!person.createdAt) return false;
    const date = new Date(person.createdAt);

    return !Number.isNaN(date.getTime()) &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
  }).length;

  document.getElementById("total-people").textContent = employees.length;
  document.getElementById("total-departments").textContent =
    uniqueDepartments.size;
  document.getElementById("new-this-month").textContent = addedThisMonth;

  const filtered = employees.filter(person => {
    const matchesSearch = [
      person.name, person.email, person.department
    ].some(value => String(value || "").toLowerCase().includes(query));

    return matchesSearch &&
      (!departmentFilter.value ||
        person.department === departmentFilter.value);
  });

  tableBody.replaceChildren();
  countLabel.textContent =
    `${filtered.length} ${filtered.length === 1 ? "person" : "people"}`;

  emptyState.hidden = filtered.length > 0;
  document.querySelector(".people-table").hidden = filtered.length === 0;

  if (filtered.length === 0) {
    const searching = Boolean(query || departmentFilter.value);
    document.getElementById("empty-title").textContent = searching
      ? "No matching people"
      : "Your people space is ready";
    document.getElementById("empty-description").textContent = searching
      ? "Try another name or choose a different department."
      : "Add your first team member to start building your directory.";

    document.getElementById("empty-add-button").hidden = searching;
    return;
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  filtered.forEach(person => {
    const row = document.createElement("tr");

    const personCell = document.createElement("td");
    const personLayout = document.createElement("div");
    personLayout.className = "person-cell";

    const avatar = document.createElement("span");
    avatar.className = "person-avatar";
    avatar.textContent = initials(person.name);

    const details = document.createElement("div");
    const name = document.createElement("div");
    name.className = "person-name";
    name.textContent = person.name;

    const email = document.createElement("div");
    email.className = "person-email";
    email.textContent = person.email;

    details.append(name, email);
    personLayout.append(avatar, details);
    personCell.appendChild(personLayout);

    const departmentCell = document.createElement("td");
    const department = document.createElement("span");
    department.className = "person-department";
    department.textContent = person.department;
    departmentCell.appendChild(department);

    const salaryCell = makeCell(money.format(Number(person.salary) || 0));

    const date = person.createdAt
      ? new Date(person.createdAt).toLocaleDateString()
      : "—";
    const dateCell = makeCell(date);

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "person-delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${person.name}`);

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        `Delete ${person.name} from the directory?`
      );

      if (!confirmed) return;

      const current = getData("hcm_users", []);
      const updated = current.filter(item => item.id !== person.id);

      if (saveData("hcm_users", updated)) {
        renderEmployees();
      } else {
        window.alert("Could not delete this employee.");
      }
    });

    actionCell.appendChild(deleteButton);
    row.append(
      personCell, departmentCell, salaryCell, dateCell, actionCell
    );
    tableBody.appendChild(row);
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("employee-name").value.trim();
  const email = document.getElementById("employee-email").value.trim();
  const department = document.getElementById("employee-department")
    .value.trim();
  const salaryInput = document.getElementById("employee-salary").value;
  const salary = Number(salaryInput);

  if (!name || !email || !department ||
      salaryInput === "" || !Number.isFinite(salary) || salary < 0) {
    formMessage.textContent = "Please enter valid employee details.";
    return;
  }

  const employees = getData("hcm_users", []);
  const duplicate = employees.some(person =>
    person.email.toLowerCase() === email.toLowerCase()
  );

  if (duplicate) {
    formMessage.textContent = "This email is already registered.";
    return;
  }

  employees.push({
    id: crypto.randomUUID(),
    role: "employee",
    name,
    email,
    department,
    salary,
    createdAt: new Date().toISOString()
  });

  if (!saveData("hcm_users", employees)) {
    formMessage.textContent = "Could not save. Please try again.";
    return;
  }

  form.reset();
  formMessage.textContent = "Team member added successfully!";
  formPanel.hidden = true;
  renderEmployees();
});

document.getElementById("show-form-button").addEventListener("click", () => {
  formPanel.hidden = false;
  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("employee-name").focus();
});

document.getElementById("hide-form-button").addEventListener("click", () => {
  formPanel.hidden = true;
});

document.getElementById("empty-add-button").addEventListener("click", () => {
  formPanel.hidden = false;
  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("employee-name").focus();
});

searchInput.addEventListener("input", renderEmployees);
departmentFilter.addEventListener("change", renderEmployees);

renderEmployees();
