// Main application entry point
import { checkExistingLogin, handleAuth, handleLogout } from './auth.js';
import { loadAlunos } from './alunos.js';
import { loadExercicios, handleImagePreview } from './exercicios.js';
import { loadTreinosForAluno, handleSaveTreino, addExercicioRow } from './treinos.js';
import { loadDashboardData } from './dashboard.js';
import { showSection } from './utils.js';
import { loadComponent } from './component-loader.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("App initialized");
    
    // Load all HTML components
    await loadComponents();
    
    // Initialize image preview handler
    handleImagePreview();
    
    // Auth listeners
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // Navigation listeners
    document.getElementById('nav-dashboard').addEventListener('click', () => 
        showSection(document.getElementById('dashboard-section'))
    );
    document.getElementById('nav-alunos').addEventListener('click', () => 
        showSection(document.getElementById('alunos-section'))
    );
    document.getElementById('nav-exercicios').addEventListener('click', () => 
        showSection(document.getElementById('exercicios-section'))
    );
    document.getElementById('nav-treinos').addEventListener('click', () => 
        showSection(document.getElementById('treinos-section'))
    );
    
    // Student navigation
    document.getElementById('nav-meus-treinos')?.addEventListener('click', () => {
        document.getElementById('main-content').classList.add('d-none');
        document.getElementById('student-view').classList.remove('d-none');
    });
    
    // Save button listeners
    document.getElementById('salvar-aluno').addEventListener('click', () => {
        import('./alunos.js').then(module => {
            module.handleSaveAluno();
        });
    });
    
    document.getElementById('salvar-exercicio').addEventListener('click', () => {
        import('./exercicios.js').then(module => {
            module.handleSaveExercicio();
        });
    });
    
    document.getElementById('salvar-treino').addEventListener('click', handleSaveTreino);
    
    // Treino listeners
    document.getElementById('btn-adicionar-treino').addEventListener('click', () => {
        document.getElementById('treino-aluno-id').value = window.selectedAlunoId;
        document.getElementById('treino-id').value = '';
        import('./treinos.js').then(module => {
            module.resetTreinoForm();
        });
        new bootstrap.Modal(document.getElementById('treinoModal')).show();
    });
    
    document.getElementById('adicionar-exercicio').addEventListener('click', addExercicioRow);
    
    // Listen for remove exercise buttons using event delegation
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('remover-exercicio')) {
            const exercicioItem = e.target.closest('.exercicio-item');
            const exerciciosContainer = document.getElementById('exercicios-container');
            if (exerciciosContainer.children.length > 1) {
                exercicioItem.remove();
            }
        }
    });
    
    // Setup event delegation for dynamically added inputs to handle uppercase
    document.addEventListener('focusin', function(e) {
        if ((e.target.tagName === 'INPUT' && e.target.type === 'text') || 
            e.target.tagName === 'TEXTAREA') {
            // Skip inputs in auth section
            if (!document.getElementById('auth-section').contains(e.target)) {
                // Add input event if not already added
                if (!e.target.dataset.uppercaseHandler) {
                    e.target.dataset.uppercaseHandler = 'true';
                    e.target.addEventListener('input', function() {
                        const start = this.selectionStart;
                        const end = this.selectionEnd;
                        this.value = this.value.toUpperCase();
                        this.setSelectionRange(start, end);
                    });
                    
                    // Convert existing value
                    if (e.target.value) {
                        e.target.value = e.target.value.toUpperCase();
                    }
                }
            }
        }
    });
    
    // Initialize data loading
    loadAlunos();
    loadExercicios();
    
    // Check for existing login on page load
    checkExistingLogin();
});

// Function to load all HTML components
async function loadComponents() {
    const componentLoads = [
        loadComponent('auth-section', 'components/auth-section.html'),
        loadComponent('dashboard-section', 'components/dashboard-section.html'),
        loadComponent('alunos-section', 'components/alunos-section.html'),
        loadComponent('exercicios-section', 'components/exercicios-section.html'),
        loadComponent('treinos-section', 'components/treinos-section.html'),
        loadComponent('student-view', 'components/student-view.html'),
        loadComponent('modals-container', 'components/modals.html')
    ];
    
    try {
        await Promise.all(componentLoads);
        console.log('All components loaded successfully');
    } catch (error) {
        console.error('Error loading components:', error);
    }
}