// Authentication related functionality
import { signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from './firebase-config.js';
import { showApp, hideApp, setupUppercaseInputs } from './utils.js';
import { loadDashboardData } from './dashboard.js';
import { showStudentView, hideStudentView } from './student-view.js';

// Auth state
let isLogin = true;
let currentUser = null;
let userRole = null; // 'admin' or 'student'

// Handle authentication form submission
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log("Login attempt with:", email);
    
    // Check if credentials match the admin account
    if (email === 'fit@gmail.com' && password === 'personal') {
        // Direct admin login
        currentUser = { email: email, uid: 'admin-user' };
        userRole = 'admin';
        
        // Save to localStorage for persistent login
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('userRole', userRole);
        
        showApp();
        loadDashboardData();
        document.getElementById('auth-form').reset();
    } else {
        // Try to authenticate as a student
        const alunosRef = ref(database, 'alunos');
        get(alunosRef).then((snapshot) => {
            let authenticated = false;
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const aluno = childSnapshot.val();
                    if (aluno.email === email && aluno.senha === password) {
                        authenticated = true;
                        currentUser = { email: email, uid: childSnapshot.key };
                        userRole = 'student';
                        
                        // Save to localStorage for persistent login
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        localStorage.setItem('userRole', userRole);
                        localStorage.setItem('studentName', aluno.nome);
                        
                        showStudentView(childSnapshot.key, aluno.nome);
                        document.getElementById('auth-form').reset();
                    }
                });
            }
            
            if (!authenticated) {
                alert('Credenciais inválidas. Por favor, tente novamente.');
            }
        });
    }
}

function handleLogout() {
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('studentName');
    
    currentUser = null;
    userRole = null;
    hideApp();
    hideStudentView();
}

// Check for existing login on page load
function checkExistingLogin() {
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole');
    
    if (savedUser && savedRole) {
        currentUser = JSON.parse(savedUser);
        userRole = savedRole;
        
        if (userRole === 'admin') {
            showApp();
            loadDashboardData();
        } else if (userRole === 'student') {
            const studentName = localStorage.getItem('studentName') || 'Aluno';
            showStudentView(currentUser.uid, studentName);
        }
    }
}

export { 
    handleAuth, 
    handleLogout, 
    checkExistingLogin, 
    currentUser, 
    userRole 
};