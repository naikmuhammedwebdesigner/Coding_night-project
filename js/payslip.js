
/* HCM LITE — PAYROLL & PAYSLIP CENTER */

const payrollMonth = document.getElementById("payroll-month");
const payrollTableBody = document.getElementById("payroll-table-body");
const payrollSearch = document.getElementById("payroll-search");
const payrollEmpty = document.getElementById("payroll-empty");

const createPayrollButton = document.getElementById("create-payroll-button");
const emptyCreateButton = document.getElementById("payroll-empty-create");

const money = amount =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

function getEmployees() {
  return getData("hcm_users", []).filter(
    user => user && user.role === "employee"
  );
}

function getPayrollRecords() {
  return getData("hcm_payroll", []);
}

function savePayrollRecords(records) {
  return saveData("hcm_payroll", records);
}

function getSelectedMonth() {
  return payrollMonth.value;
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

function calculateNetSalary(basicSalary, allowances, deductions) {
  return Math.max(
    0,
    Number(basicSalary) + Number(allowances) - Number(deductions)
  );
}

function updatePayrollStats(records) {
  const total = records.reduce((sum, record) => sum + record.netSalary, 0);
  const paid = records.filter(record => record.paymentStatus === "paid").length;
  const pending = records.filter(record => record.paymentStatus === "pending").length;
  const average = records.length ? total / records.length : 0;

  document.getElementById("payroll-total").textContent = money(total);
  document.getElementById("payroll-paid-count").textContent = paid;
  document.getElementById("payroll-pending-count").textContent = pending;
  document.getElementById("payroll-average").textContent = money(average);
}

function renderPayroll() {
  const month = getSelectedMonth();
  const employees = getEmployees();
  const allRecords = getPayrollRecords();

  // Show records for the selected month only.
  const monthRecords = allRecords.filter(record => record.month === month);

  const query = payrollSearch.value.trim().toLowerCase();

  const filteredRecords = monthRecords.filter(record => {
    const employee = employees.find(item => item.id === record.employeeId);
    const employeeName = employee?.name || record.employeeName || "Unknown";
    return employeeName.toLowerCase().includes(query);
  });

  updatePayrollStats(monthRecords);
  payrollTableBody.replaceChildren();

  filteredRecords.forEach(record => {
    const employee = employees.find(item => item.id === record.employeeId);
    const employeeName = employee?.name || record.employeeName || "Unknown employee";
    const row = document.createElement("tr");

    const values = [
      employeeName,
      money(record.basicSalary),
      money(record.allowances),
      money(record.deductions),
      money(record.netSalary)
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");

      if (index === 0) {
        cell.textContent = value;
        cell.style.fontWeight = "600";
      } else {
        cell.textContent = value;
      }

      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `status ${record.paymentStatus === "paid" ? "status-success" : "status-warning"}`;
    status.textContent = record.paymentStatus === "paid" ? "Paid" : "Pending";
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");

    const payslipButton = document.createElement("button");
    payslipButton.type = "button";
    payslipButton.className = "btn btn-secondary";
    payslipButton.textContent = "Payslip";
    payslipButton.addEventListener("click", () => printPayslip(record));

    actionsCell.appendChild(payslipButton);

    if (record.paymentStatus === "pending") {
      const payButton = document.createElement("button");
      payButton.type = "button";
      payButton.className = "btn btn-primary";
      payButton.textContent = "Mark Paid";
      payButton.style.marginLeft = "6px";

      payButton.addEventListener("click", () => markPayrollPaid(record.id));
      actionsCell.appendChild(payButton);
    }

    row.appendChild(actionsCell);
    payrollTableBody.appendChild(row);
  });

  payrollEmpty.hidden = filteredRecords.length > 0;
  payrollEmpty.querySelector("h3").textContent =
    monthRecords.length === 0 ? "No payroll records yet" : "No matching employees";
  payrollEmpty.querySelector("p").textContent =
    monthRecords.length === 0
      ? "Create payroll to generate monthly salary records."
      : "Try another employee name or create payroll for this month.";

  document.querySelector(".payroll-table-card .table-wrap").hidden =
    filteredRecords.length === 0;
}

function createMonthlyPayroll() {
  const month = getSelectedMonth();

  if (!month) {
    alert("Please select a payroll month first.");
    return;
  }

  const employees = getEmployees();

  if (employees.length === 0) {
    alert("Please add employees before creating payroll.");
    return;
  }

  const records = getPayrollRecords();
  let created = 0;

  employees.forEach(employee => {
    const alreadyExists = records.some(
      record => record.employeeId === employee.id && record.month === month
    );

    if (alreadyExists) return;

    const basicSalary = Math.max(0, Number(employee.salary) || 0);
    const allowances = 0;
    const deductions = 0;

    records.push({
      id: crypto.randomUUID(),
      employeeId: employee.id,
      employeeName: employee.name,
      month,
      basicSalary,
      allowances,
      deductions,
      netSalary: calculateNetSalary(
        basicSalary,
        allowances,
        deductions
      ),
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      paidAt: null
    });

    created++;
  });

  if (!savePayrollRecords(records)) {
    alert("Payroll could not be saved. Check browser storage availability.");
    return;
  }

  renderPayroll();

  alert(
    created > 0
      ? `${created} payroll record(s) created for ${month}.`
      : `Payroll records already exist for all employees in ${month}.`
  );
}

function markPayrollPaid(recordId) {
  const records = getPayrollRecords();
  const record = records.find(item => item.id === recordId);

  if (!record || record.paymentStatus === "paid") return;

  const confirmed = confirm(
    `Mark ${record.employeeName}'s salary of ${money(record.netSalary)} as paid?`
  );

  if (!confirmed) return;

  record.paymentStatus = "paid";
  record.paidAt = new Date().toISOString();

  if (!savePayrollRecords(records)) {
    alert("Could not save the payment status.");
    return;
  }

  renderPayroll();
}

function printPayslip(record) {
  const employee = getEmployees().find(
    item => item.id === record.employeeId
  );

  const employeeName = employee?.name || record.employeeName || "Employee";
  const department = employee?.department || "Not specified";

  const printWindow = window.open("", "_blank", "width=800,height=700");

  if (!printWindow) {
    alert("Please allow pop-ups to print the payslip.");
    return;
  }

  const safeName = escapeHTML(employeeName);
  const safeDepartment = escapeHTML(department);
  const safeMonth = escapeHTML(record.month);
  const safeStatus = escapeHTML(record.paymentStatus);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payslip - ${safeName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #182338;
          max-width: 760px;
          margin: 40px auto;
          padding: 24px;
        }
        header { border-bottom: 3px solid #315eed; padding-bottom: 18px; }
        h1 { margin-bottom: 6px; }
        .muted { color: #667085; }
        .details { margin: 24px 0; line-height: 1.9; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 14px; border: 1px solid #dce2ec; text-align: left; }
        th { background: #f3f6fc; }
        .total { font-size: 20px; font-weight: bold; }
        .actions { margin-top: 28px; }
        button { padding: 10px 18px; cursor: pointer; }
        @media print { .actions { display: none; } body { margin: 0; } }
      </style>
    </head>
    <body>
      <header>
        <h1>HCM Lite</h1>
        <p class="muted">Employee Salary Payslip</p>
      </header>

      <section class="details">
        <strong>Employee:</strong> ${safeName}<br>
        <strong>Department:</strong> ${safeDepartment}<br>
        <strong>Payroll month:</strong> ${safeMonth}<br>
        <strong>Payment status:</strong> ${safeStatus.toUpperCase()}
      </section>

      <table>
        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          <tr><td>Basic salary</td><td>${money(record.basicSalary)}</td></tr>
          <tr><td>Allowances</td><td>${money(record.allowances)}</td></tr>
          <tr><td>Deductions</td><td>- ${money(record.deductions)}</td></tr>
          <tr><td class="total">Net salary</td><td class="total">${money(record.netSalary)}</td></tr>
        </tbody>
      </table>

      <p class="muted">This payslip was generated by HCM Lite.</p>
      <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
}

function setDefaultPayrollMonth() {
  const now = new Date();
  payrollMonth.value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

createPayrollButton.addEventListener("click", createMonthlyPayroll);
emptyCreateButton.addEventListener("click", createMonthlyPayroll);
payrollMonth.addEventListener("change", renderPayroll);
payrollSearch.addEventListener("input", renderPayroll);

setDefaultPayrollMonth();
renderPayroll();

window.addEventListener("storage", event => {
  if (["hcm_users", "hcm_payroll"].includes(event.key)) {
    renderPayroll();
  }
});
