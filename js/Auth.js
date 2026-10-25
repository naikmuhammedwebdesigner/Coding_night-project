/**
 * HCM Lite - Authentication & Role Management Module
 * Handles login, role verification, session state, security guards, and the welcome greeting.
 */

const AUTH_KEY = 'hcm_current_session';
const USERS_KEY = 'hcm_users_db';

// Hackathon Demo Credentials with explicit Admin and Employee accounts
const DEFAULT_ACCOUNTS = [
    {
        id: 'EMP-001',
        name: 'System Administrator',
        email: 'admin@hcmlite.com',
        password: 'AdminPassword123!',
        role: 'admin',
        department: 'Management',
        designation: 'HR Director'
    },
    {
        id: 'EMP-002',
        name: 'Alex Morgan',
        email: 'employee@hcmlite.com',
        password: 'EmployeePassword123!',
        role: 'employee',
        department: 'Engineering',
        designation: 'Software Engineer'
    }
];

class AuthService {
    constructor() {
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem(USERS_KEY)) {
            localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
        }
    }

    getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY)) || DEFAULT_ACCOUNTS;
        } catch (e) {
            return DEFAULT_ACCOUNTS;
        }
    }

    login(email, password, selectedRole) {
        const users = this.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (!user) {
            throw new Error('Invalid email or password. Please check your credentials.');
        }

        if (user.role !== selectedRole) {
            throw new Error(`Role mismatch. This account is registered as an ${user.role.toUpperCase()}.`);
        }

        const session = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return session;
    }

    logout() {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = '../index.html';
    }

    getCurrentUser() {
        try {
            const session = localStorage.getItem(AUTH_KEY);
            return session ? JSON.parse(session) : null;
        } catch (e) {
            return null;
        }
    }

    requireAuth(requiredRole = null) {
        const user = this.getCurrentUser();
        
        if (!user) {
            window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
            return;
        }

        if (requiredRole && user.role !== requiredRole) {
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'employee.html';
            }
        }
    }
}

const auth = new AuthService();

// Global Login Form Handler & UI Controller
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Top Tab Switcher Logic
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const role = tab.getAttribute('data-role');
            document.getElementById('role').value = role;
            
            const heading = document.getElementById('portalHeading');
            if (heading) {
                heading.textContent = role === 'admin' ? 'ADMIN LOGIN' : 'EMPLOYEE LOGIN';
            }

            // Auto-fill sample credentials based on active tab
            if (role === 'admin') {
                document.getElementById('email').value = 'admin@hcmlite.com';
                document.getElementById('password').value = 'AdminPassword123!';
            } else {
                document.getElementById('email').value = 'employee@hcmlite.com';
                document.getElementById('password').value = 'EmployeePassword123!';
            }
        });
    });

    // Demo Fill Quick Buttons
    document.querySelectorAll('.demo-fill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.getAttribute('data-role');
            // Also click the corresponding tab visual
            const targetTab = document.querySelector(`.role-tab[data-role="${role}"]`);
            if (targetTab) targetTab.click();
        });
    });

    // Form Submit Authentication
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const errorAlert = document.getElementById('loginError');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        errorAlert.style.display = 'none';
        submitBtn.disabled = true;

        setTimeout(() => {
            try {
                const session = auth.login(email, password, role);
                showCongratulationsScreen(session);
            } catch (err) {
                errorAlert.textContent = err.message;
                errorAlert.style.display = 'block';
                submitBtn.disabled = false;
            }
        }, 600);
    });
});

function showCongratulationsScreen(user) {
    const overlay = document.getElementById('congratsOverlay');
    const welcomeName = document.getElementById('welcomeUserName');
    const welcomeRole = document.getElementById('welcomeUserRole');
    
    if (welcomeName) welcomeName.textContent = user.name;
    if (welcomeRole) welcomeRole.textContent = `${user.role.toUpperCase()} Workspace Ready`;
    
    if (overlay) overlay.classList.add('active');

    setTimeout(() => {
        if (user.role === 'admin') {
            window.location.href = 'pages/admin.html';
        } else {
            window.location.href = 'pages/employee.html';
        }
    }, 1500);
}