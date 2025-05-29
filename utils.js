// Utility functions
import { loadDashboardData } from './dashboard.js';

// Function to show app after successful login
function showApp() {
    document.getElementById('auth-section').classList.add('d-none');
    document.getElementById('navbar').classList.remove('d-none');
    
    const mainContent = document.getElementById('main-content');
    mainContent.classList.remove('d-none');
    document.getElementById('student-view').classList.add('d-none');
    
    // Show dashboard by default
    showSection(document.getElementById('dashboard-section'));
    
    // Add input event listeners to convert text to uppercase
    setupUppercaseInputs();
}

// Function to hide app on logout
function hideApp() {
    document.getElementById('auth-section').classList.remove('d-none');
    document.getElementById('navbar').classList.add('d-none');
    document.getElementById('main-content').classList.add('d-none');
}

// Function to show a specific section and hide others
function showSection(section) {
    // Get all section elements
    const sections = [
        document.getElementById('dashboard-section'),
        document.getElementById('alunos-section'),
        document.getElementById('exercicios-section'),
        document.getElementById('treinos-section')
    ];
    
    // Hide all sections
    sections.forEach(s => s.classList.add('d-none'));
    
    // Show the selected section
    section.classList.remove('d-none');
    
    // Additional actions based on section
    if (section === document.getElementById('treinos-section')) {
        import('./alunos.js').then(module => {
            module.loadAlunosList();
        });
    } else if (section === document.getElementById('dashboard-section')) {
        loadDashboardData();
    }
}

// Function to setup uppercase transformation for all inputs
function setupUppercaseInputs() {
    // Apply to all text inputs, textareas, and select elements
    const inputElements = document.querySelectorAll('input[type="text"], textarea');
    inputElements.forEach(input => {
        // Convert existing value to uppercase
        if (input.value) {
            input.value = input.value.toUpperCase();
        }
        
        // Add event listener for future input
        input.addEventListener('input', function() {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(start, end);
        });
    });
}

export { 
    showApp, 
    hideApp, 
    showSection, 
    setupUppercaseInputs 
};