
/* =====================================
   HCM LITE — LOCAL STORAGE SYSTEM
   ===================================== */

// Read data from localStorage
function getData(key, fallback = null) {
  try {
    const savedData = localStorage.getItem(key);

    if (savedData === null) {
      return fallback;
    }

    return JSON.parse(savedData);
  } catch (error) {
    console.error("Could not read data:", key, error);
    return fallback;
  }
}

// Save data to localStorage
function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save data:", key, error);
    return false;
  }
}

// Create default data if it does not exist
function initializeStorage() {
  const defaults = {
    hcm_company: {
      name: "HCM Lite",
      officeStart: "09:00",
      gracePeriod: 15,
      workingDays: 22
    },
    hcm_users: [],
    hcm_attendance: [],
    hcm_leaves: [],
    hcm_session: null
  };

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (localStorage.getItem(key) === null) {
      saveData(key, defaultValue);
    }
  });
}

// Initialize the system
initializeStorage();

console.log("HCM Lite storage system is ready!");
