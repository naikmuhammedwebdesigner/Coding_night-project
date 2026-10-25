
/* =====================================================
   HCM LITE — SETTINGS & COMPANY PROFILE CENTER
   Features:
   1. Company profile
   2. Attendance rules
   3. Dark mode preference
   4. JSON backup export
   5. JSON backup import and restore
===================================================== */

"use strict";

// -----------------------------------------------------
// 1. ELEMENT REFERENCES
// -----------------------------------------------------

const companyForm = document.getElementById("company-form");
const attendanceForm = document.getElementById("attendance-settings-form");

const darkModeSetting = document.getElementById("dark-mode-setting");
const exportButton = document.getElementById("export-backup");
const importInput = document.getElementById("import-backup");

const STORAGE_KEYS = [
  "hcm_company",
  "hcm_users",
  "hcm_attendance",
  "hcm_leaves",
  "hcm_payroll",
  "hcm_session"
];

// -----------------------------------------------------
// 2. MESSAGE HELPER
// -----------------------------------------------------

function showMessage(id, message, isError = false) {
  const element = document.getElementById(id);

  if (!element) {
    console.warn(`Message element not found: ${id}`);
    return;
  }

  element.textContent = message;
  element.style.color = isError
    ? "var(--danger)"
    : "var(--success)";
}

// -----------------------------------------------------
// 3. COMPANY SETTINGS
// -----------------------------------------------------

function getCompanySettings() {
  return getData("hcm_company", {
    name: "HCM Lite",
    email: "",
    phone: "",
    address: "",
    officeStart: "09:00",
    gracePeriod: 15,
    workingDays: 22
  });
}

function loadSettings() {
  const company = getCompanySettings();

  document.getElementById("company-name").value =
    company.name || "HCM Lite";

  document.getElementById("company-email").value =
    company.email || "";

  document.getElementById("company-phone").value =
    company.phone || "";

  document.getElementById("company-address").value =
    company.address || "";

  document.getElementById("office-start").value =
    company.officeStart || "09:00";

  document.getElementById("grace-period").value =
    company.gracePeriod ?? 15;

  document.getElementById("working-days").value =
    company.workingDays ?? 22;

  darkModeSetting.checked =
    document.documentElement.dataset.theme === "dark";
}

// Save company profile
companyForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("company-name").value.trim();

  if (!name) {
    showMessage(
      "company-message",
      "Please enter a company name.",
      true
    );
    return;
  }

  const updatedCompany = {
    ...getCompanySettings(),
    name,
    email: document.getElementById("company-email").value.trim(),
    phone: document.getElementById("company-phone").value.trim(),
    address: document.getElementById("company-address").value.trim()
  };

  if (!saveData("hcm_company", updatedCompany)) {
    showMessage(
      "company-message",
      "Unable to save company details. Check browser storage.",
      true
    );
    return;
  }

  showMessage(
    "company-message",
    "Company profile saved successfully."
  );
});

// -----------------------------------------------------
// 4. ATTENDANCE RULES
// -----------------------------------------------------

attendanceForm.addEventListener("submit", event => {
  event.preventDefault();

  const officeStart =
    document.getElementById("office-start").value;

  const gracePeriod =
    Number(document.getElementById("grace-period").value);

  const workingDays =
    Number(document.getElementById("working-days").value);

  if (!officeStart) {
    showMessage(
      "attendance-message",
      "Please select the office start time.",
      true
    );
    return;
  }

  if (
    !Number.isInteger(gracePeriod) ||
    gracePeriod < 0 ||
    gracePeriod > 180
  ) {
    showMessage(
      "attendance-message",
      "Grace period must be between 0 and 180 minutes.",
      true
    );
    return;
  }

  if (
    !Number.isInteger(workingDays) ||
    workingDays < 1 ||
    workingDays > 31
  ) {
    showMessage(
      "attendance-message",
      "Working days must be between 1 and 31.",
      true
    );
    return;
  }

  const updatedCompany = {
    ...getCompanySettings(),
    officeStart,
    gracePeriod,
    workingDays
  };

  if (!saveData("hcm_company", updatedCompany)) {
    showMessage(
      "attendance-message",
      "Could not save attendance rules.",
      true
    );
    return;
  }

  showMessage(
    "attendance-message",
    "Attendance rules saved successfully."
  );
});

// -----------------------------------------------------
// 5. DARK MODE
// -----------------------------------------------------

function applyThemePreference(isDark) {
  const theme = isDark ? "dark" : "light";

  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem("hcm_theme", theme);
    showMessage(
      "preferences-message",
      "Theme preference updated."
    );
  } catch (error) {
    console.error("Theme preference could not be saved:", error);

    showMessage(
      "preferences-message",
      "Theme changed, but its preference could not be saved.",
      true
    );
  }
}

darkModeSetting.addEventListener("change", () => {
  applyThemePreference(darkModeSetting.checked);
});

// -----------------------------------------------------
// 6. DOWNLOAD JSON BACKUP
// -----------------------------------------------------

function downloadJSON(filename, data) {
  let objectURL = null;

  try {
    const json = JSON.stringify(data, null, 2);

    if (typeof json !== "string") {
      throw new Error("Could not convert backup data to JSON.");
    }

    const blob = new Blob(
      [json],
      { type: "application/json;charset=utf-8" }
    );

    objectURL = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectURL;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      if (objectURL) {
        URL.revokeObjectURL(objectURL);
      }
    }, 2000);

    showMessage(
      "backup-message",
      "Backup download requested. Check your browser's Downloads folder."
    );

    return true;
  } catch (error) {
    if (objectURL) {
      URL.revokeObjectURL(objectURL);
    }

    console.error("Backup export failed:", error);

    showMessage(
      "backup-message",
      "Export failed: " + error.message,
      true
    );

    return false;
  }
}

function exportBackup() {
  try {
    const backup = {
      app: "HCM Lite",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {}
    };

    // Read each saved HR data category.
    for (const key of STORAGE_KEYS) {
      const rawValue = localStorage.getItem(key);

      if (rawValue === null) {
        backup.data[key] =
          key === "hcm_company"
            ? getCompanySettings()
            : key === "hcm_session"
              ? null
              : [];
      } else {
        backup.data[key] = JSON.parse(rawValue);
      }
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `hcm-lite-backup-${date}.json`;

    downloadJSON(filename, backup);
  } catch (error) {
    console.error("Could not prepare backup:", error);

    showMessage(
      "backup-message",
      "Could not prepare backup. Check the browser console.",
      true
    );
  }
}

exportButton.addEventListener("click", exportBackup);

// -----------------------------------------------------
// 7. BACKUP VALIDATION
// -----------------------------------------------------

function isValidBackup(backup) {
  if (
    !backup ||
    typeof backup !== "object" ||
    Array.isArray(backup) ||
    backup.app !== "HCM Lite" ||
    !backup.data ||
    typeof backup.data !== "object" ||
    Array.isArray(backup.data)
  ) {
    return false;
  }

  const data = backup.data;

  if (
    !data.hcm_company ||
    typeof data.hcm_company !== "object" ||
    Array.isArray(data.hcm_company) ||
    !Array.isArray(data.hcm_users) ||
    !Array.isArray(data.hcm_attendance) ||
    !Array.isArray(data.hcm_leaves)
  ) {
    return false;
  }

  if (
    data.hcm_payroll !== undefined &&
    !Array.isArray(data.hcm_payroll)
  ) {
    return false;
  }

  if (
    data.hcm_session !== undefined &&
    data.hcm_session !== null &&
    typeof data.hcm_session !== "object"
  ) {
    return false;
  }

  return true;
}

// -----------------------------------------------------
// 8. IMPORT AND RESTORE BACKUP
// -----------------------------------------------------

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];

  if (!file) return;

  try {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Backup file is too large. Maximum size is 20 MB.");
    }

    const fileText = await file.text();
    const backup = JSON.parse(fileText);

    if (!isValidBackup(backup)) {
      throw new Error(
        "This file is not a valid HCM Lite backup."
      );
    }

    const confirmed = confirm(
      "Restore this backup? Your current local HR records will be replaced. Export a backup of your current data first if you need to preserve it."
    );

    if (!confirmed) return;

    // Keep the original values so a failed restore can be rolled back.
    const previousValues = {};

    for (const key of STORAGE_KEYS) {
      previousValues[key] = localStorage.getItem(key);
    }

    try {
      const defaults = {
        hcm_company: getCompanySettings(),
        hcm_users: [],
        hcm_attendance: [],
        hcm_leaves: [],
        hcm_payroll: [],
        hcm_session: null
      };

      for (const key of STORAGE_KEYS) {
        const value = Object.prototype.hasOwnProperty.call(
          backup.data,
          key
        )
          ? backup.data[key]
          : defaults[key];

        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (restoreError) {
      // Restore previous local data if any write fails.
      for (const key of STORAGE_KEYS) {
        try {
          if (previousValues[key] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, previousValues[key]);
          }
        } catch (rollbackError) {
          console.error(
            "Could not roll back storage key:",
            key,
            rollbackError
          );
        }
      }

      throw restoreError;
    }

    showMessage(
      "backup-message",
      "Backup restored. Reloading the Settings page..."
    );

    window.setTimeout(() => {
      window.location.reload();
    }, 700);

  } catch (error) {
    console.error("Backup import failed:", error);

    showMessage(
      "backup-message",
      error.message || "Import failed. Check the JSON backup file.",
      true
    );
  } finally {
    importInput.value = "";
  }
});

// -----------------------------------------------------
// 9. INITIALIZE SETTINGS PAGE
// -----------------------------------------------------

loadSettings();

// Update displayed values if another open tab changes settings.
window.addEventListener("storage", event => {
  if (STORAGE_KEYS.includes(event.key) || event.key === "hcm_theme") {
    loadSettings();
  }
});

console.log("HCM Lite Settings Center initialized successfully.");
