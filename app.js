import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, get, push, remove, update, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7hkLfyuuSiaSautZtay4GMiGfUOPlO9E",
  authDomain: "folga-f510e.firebaseapp.com",
  databaseURL: "https://folga-f510e-default-rtdb.firebaseio.com",
  projectId: "folga-f510e",
  storageBucket: "folga-f510e.appspot.com",
  messagingSenderId: "512417416816",
  appId: "1:512417416816:web:9dea4f7668ccebb834d6b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// DOM Elements
// Auth elements
const authSection = document.getElementById('auth-section');
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Navigation
const navbar = document.getElementById('navbar');
const mainContent = document.getElementById('main-content');
const navDashboard = document.getElementById('nav-dashboard');
const navAlunos = document.getElementById('nav-alunos');
const navExercicios = document.getElementById('nav-exercicios');
const navTreinos = document.getElementById('nav-treinos');
const btnLogout = document.getElementById('btn-logout');

// Sections
const dashboardSection = document.getElementById('dashboard-section');
const alunosSection = document.getElementById('alunos-section');
const exerciciosSection = document.getElementById('exercicios-section');
const treinosSection = document.getElementById('treinos-section');

// Modals
const alunoModal = new bootstrap.Modal(document.getElementById('alunoModal'));
const exercicioModal = new bootstrap.Modal(document.getElementById('exercicioModal'));
const treinoModal = new bootstrap.Modal(document.getElementById('treinoModal'));

// Forms
const alunoForm = document.getElementById('aluno-form');
const exercicioForm = document.getElementById('exercicio-form');
const treinoForm = document.getElementById('treino-form');

// Save buttons
const salvarAluno = document.getElementById('salvar-aluno');
const salvarExercicio = document.getElementById('salvar-exercicio');
const salvarTreino = document.getElementById('salvar-treino');

// Tables
const alunosTableBody = document.getElementById('alunos-table-body');
const exerciciosTableBody = document.getElementById('exercicios-table-body');

// Dashboard elements
const totalAlunos = document.getElementById('total-alunos');
const totalExercicios = document.getElementById('total-exercicios');
const totalTreinos = document.getElementById('total-treinos');
const treinosRecentes = document.getElementById('treinos-recentes');

// Treinos elements
const alunosList = document.getElementById('alunos-list');
const treinoInfo = document.getElementById('treino-info');
const treinoEmpty = document.getElementById('treino-empty');
const alunoNomeTreino = document.getElementById('aluno-nome-treino');
const btnAdicionarTreino = document.getElementById('btn-adicionar-treino');
const treinosContainer = document.getElementById('treinos-container');
const adicionarExercicio = document.getElementById('adicionar-exercicio');
const exerciciosContainer = document.getElementById('exercicios-container');

// Auth state
let isLogin = true;
let currentUser = null;
let userRole = null; // 'admin' or 'student'
let selectedAlunoId = null;

// Auth Functions
function handleAuth(e) {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    console.log("Login attempt with:", email); // Debug logging
    
    // Check if credentials match the admin account
    if (email === 'fit@gmail.com' && password === 'personal') {
        // Direct admin login
        currentUser = { email: email, uid: 'admin-user' };
        userRole = 'admin';
        showApp();
        loadDashboardData();
        authForm.reset();
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
                        showStudentView(childSnapshot.key, aluno.nome);
                        authForm.reset();
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
    currentUser = null;
    userRole = null;
    hideApp();
    hideStudentView();
}

function showStudentView(alunoId, alunoNome) {
    // Hide auth and admin sections
    authSection.classList.add('d-none');
    navbar.classList.remove('d-none');
    
    // Show only student-relevant nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.classList.contains('student-visible')) {
            item.classList.add('d-none');
        }
    });
    
    // Show student view
    document.getElementById('student-view').classList.remove('d-none');
    document.getElementById('student-name').textContent = `Treinos de ${alunoNome}`;
    
    // Load student's workouts
    loadStudentTreinos(alunoId);
    
    // Add input event listeners to convert text to uppercase
    setupUppercaseInputs();
}

function hideStudentView() {
    document.getElementById('student-view').classList.add('d-none');
    
    // Reset nav items visibility
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('d-none');
    });
}

function renderExerciciosTreino(exercicios, dataCriacao) {
    if (!exercicios || exercicios.length === 0) {
        return '<li class="list-group-item">Nenhum exercício cadastrado</li>';
    }
    
    // Calculate days since creation if dataCriacao exists
    let daysInfo = '';
    if (dataCriacao) {
        const creationDate = new Date(dataCriacao);
        const today = new Date();
        const diffTime = Math.abs(today - creationDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysInfo = `<div class="badge bg-info text-white mb-2">Treino ativo há ${diffDays} dias</div>`;
    }
    
    return `
        ${daysInfo}
        ${exercicios.map(ex => {
            // Get image URL from the exercises list if available
            let imagemHTML = '';
            if (ex.imagemURL) {
                imagemHTML = `<img src="${ex.imagemURL}" class="exercicio-imagem-treino" alt="${ex.nomeExercicio}">`;
            }
            
            return `
                <li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            ${imagemHTML}
                            <strong>${ex.nomeExercicio}</strong>
                        </div>
                        <div>
                            ${ex.series} séries × ${ex.repeticoes} repetições | Descanso: ${ex.descanso}s
                        </div>
                    </div>
                    ${ex.observacoes ? `<small class="text-muted">${ex.observacoes}</small>` : ''}
                </li>
            `;
        }).join('')}
    `;
}

function loadStudentTreinos(alunoId) {
    const treinosRef = ref(database, `treinos/${alunoId}`);
    const studentTreinosContainer = document.getElementById('student-treinos-container');
    
    get(treinosRef).then((snapshot) => {
        studentTreinosContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const treino = childSnapshot.val();
                
                const card = document.createElement('div');
                card.className = 'card mb-3';
                
                // Format dias da semana
                let diasSemana = '';
                if (treino.dias && treino.dias.length > 0) {
                    diasSemana = treino.dias.join(', ');
                }
                
                card.innerHTML = `
                    <div class="card-header bg-secondary text-white">
                        <h5 class="mb-0">${treino.nome}</h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Dias:</strong> ${diasSemana || 'Não especificado'}</p>
                        <p><strong>Exercícios:</strong></p>
                        <ul class="list-group mb-3">
                            ${renderExerciciosTreino(treino.exercicios, treino.dataCriacao)}
                        </ul>
                        ${treino.observacoes ? `<p><strong>Observações:</strong> ${treino.observacoes}</p>` : ''}
                    </div>
                `;
                
                studentTreinosContainer.appendChild(card);
            });
        } else {
            studentTreinosContainer.innerHTML = '<div class="alert alert-info">Você ainda não possui treinos cadastrados.</div>';
        }
    });
}

function showApp() {
    authSection.classList.add('d-none');
    navbar.classList.remove('d-none');
    
    if (userRole === 'admin') {
        mainContent.classList.remove('d-none');
        document.getElementById('student-view').classList.add('d-none');
        
        // Load admin data
        loadAlunos();
        loadExercicios();
        loadTreinos();
        
        // Show dashboard by default
        showSection(dashboardSection);
    }
    
    // Add input event listeners to convert text to uppercase
    setupUppercaseInputs();
}

function handleSaveAluno() {
    const alunoId = document.getElementById('aluno-id').value;
    const nome = document.getElementById('aluno-nome').value;
    const email = document.getElementById('aluno-email').value;
    const senha = document.getElementById('aluno-senha').value;
    const telefone = document.getElementById('aluno-telefone').value;
    const observacoes = document.getElementById('aluno-observacoes').value;
    
    if (!nome || !email || !senha) {
        alert('Nome, email e senha são obrigatórios!');
        return;
    }
    
    const alunoData = {
        nome,
        email,
        senha,
        telefone,
        observacoes,
        dataCadastro: alunoId ? undefined : Date.now()
    };
    
    let alunoRef;
    
    if (alunoId) {
        // Update existing aluno
        alunoRef = ref(database, `alunos/${alunoId}`);
        update(alunoRef, alunoData)
            .then(() => {
                alunoForm.reset();
                alunoModal.hide();
            })
            .catch((error) => {
                alert(`Erro ao atualizar aluno: ${error.message}`);
            });
    } else {
        // Create new aluno
        alunoRef = ref(database, 'alunos');
        push(alunoRef, alunoData)
            .then(() => {
                alunoForm.reset();
                alunoModal.hide();
            })
            .catch((error) => {
                alert(`Erro ao adicionar aluno: ${error.message}`);
            });
    }
}

function editAluno(alunoId) {
    const alunoRef = ref(database, `alunos/${alunoId}`);
    
    get(alunoRef).then((snapshot) => {
        if (snapshot.exists()) {
            const aluno = snapshot.val();
            
            document.getElementById('aluno-id').value = alunoId;
            document.getElementById('aluno-nome').value = aluno.nome;
            document.getElementById('aluno-email').value = aluno.email;
            document.getElementById('aluno-senha').value = aluno.senha || '';
            document.getElementById('aluno-telefone').value = aluno.telefone || '';
            document.getElementById('aluno-observacoes').value = aluno.observacoes || '';
            
            alunoModal.show();
        }
    });
}

function loadAlunos() {
    const alunosRef = ref(database, 'alunos');
    onValue(alunosRef, (snapshot) => {
        alunosTableBody.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const alunoId = childSnapshot.key;
                const aluno = childSnapshot.val();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${aluno.nome}</td>
                    <td>${aluno.email}</td>
                    <td>${aluno.telefone || '-'}</td>
                    <td>${new Date(aluno.dataCadastro).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn btn-sm btn-primary editar-aluno" data-id="${alunoId}">Editar</button>
                        <button class="btn btn-sm btn-danger excluir-aluno" data-id="${alunoId}">Excluir</button>
                    </td>
                `;
                
                alunosTableBody.appendChild(row);
            });
            
            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.editar-aluno').forEach(btn => {
                btn.addEventListener('click', () => editAluno(btn.dataset.id));
            });
            
            document.querySelectorAll('.excluir-aluno').forEach(btn => {
                btn.addEventListener('click', () => excluirAluno(btn.dataset.id));
            });
        }
    });
}

function excluirAluno(alunoId) {
    if (confirm('Tem certeza que deseja excluir este aluno? Todos os treinos associados serão perdidos.')) {
        const alunoRef = ref(database, `alunos/${alunoId}`);
        const treinosAlunoRef = ref(database, `treinos/${alunoId}`);
        
        // Remove aluno and their workouts
        remove(alunoRef)
            .then(() => remove(treinosAlunoRef))
            .catch(error => {
                alert(`Erro ao excluir aluno: ${error.message}`);
            });
    }
}

function loadExercicios() {
    const exerciciosRef = ref(database, 'exercicios');
    
    onValue(exerciciosRef, (snapshot) => {
        exerciciosTableBody.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const exercicioId = childSnapshot.key;
                const exercicio = childSnapshot.val();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        ${exercicio.imagemURL ? 
                            `<img src="${exercicio.imagemURL}" class="exercicio-imagem-tabela" alt="${exercicio.nome}">` : 
                            '<div class="no-image">Sem imagem</div>'}
                    </td>
                    <td>${exercicio.nome}</td>
                    <td class="hide-on-mobile">${exercicio.grupo}</td>
                    <td class="hide-on-mobile">${exercicio.descricao || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary editar-exercicio mb-1" data-id="${exercicioId}">Editar</button>
                        <button class="btn btn-sm btn-danger excluir-exercicio" data-id="${exercicioId}">Excluir</button>
                    </td>
                `;
                
                exerciciosTableBody.appendChild(row);
            });
            
            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.editar-exercicio').forEach(btn => {
                btn.addEventListener('click', () => editExercicio(btn.dataset.id));
            });
            
            document.querySelectorAll('.excluir-exercicio').forEach(btn => {
                btn.addEventListener('click', () => excluirExercicio(btn.dataset.id));
            });
        }
        
        // Update exercise dropdowns in treino form
        updateExercicioDropdowns();
    });
}

async function handleSaveExercicio() {
    const exercicioId = document.getElementById('exercicio-id').value;
    const nome = document.getElementById('exercicio-nome').value;
    const grupo = document.getElementById('exercicio-grupo').value;
    const descricao = document.getElementById('exercicio-descricao').value;
    const imagemFile = document.getElementById('exercicio-imagem').files[0];
    
    if (!nome || !grupo) {
        alert('Nome e grupo muscular são obrigatórios!');
        return;
    }
    
    // Disable the save button to prevent multiple submissions
    const saveButton = document.getElementById('salvar-exercicio');
    saveButton.disabled = true;
    saveButton.innerHTML = 'Salvando...';
    
    try {
        let exercicioRef;
        let newExercicioId = exercicioId;
        
        const exercicioData = {
            nome,
            grupo,
            descricao
        };
        
        if (!exercicioId) {
            // Create new exercicio and get the ID
            exercicioRef = ref(database, 'exercicios');
            const newRef = push(exercicioRef);
            newExercicioId = newRef.key;
        } else {
            // Update existing exercicio
            exercicioRef = ref(database, `exercicios/${exercicioId}`);
        }
        
        // Handle image upload if a file is selected
        if (imagemFile) {
            const imageURL = await uploadExerciseImage(imagemFile, newExercicioId);
            if (imageURL) {
                exercicioData.imagemURL = imageURL;
            }
        } 
        
        // Save to database
        if (exercicioId) {
            await update(exercicioRef, exercicioData);
        } else {
            await set(ref(database, `exercicios/${newExercicioId}`), exercicioData);
        }
        
        // Reset form and close modal
        exercicioForm.reset();
        document.getElementById('imagem-preview').classList.add('d-none');
        exercicioModal.hide();
    } catch (error) {
        alert(`Erro ao salvar exercício: ${error.message}`);
    } finally {
        // Re-enable the save button
        saveButton.disabled = false;
        saveButton.innerHTML = 'Salvar';
    }
}

function editExercicio(exercicioId) {
    const exercicioRef = ref(database, `exercicios/${exercicioId}`);
    
    get(exercicioRef).then((snapshot) => {
        if (snapshot.exists()) {
            const exercicio = snapshot.val();
            
            document.getElementById('exercicio-id').value = exercicioId;
            document.getElementById('exercicio-nome').value = exercicio.nome;
            document.getElementById('exercicio-grupo').value = exercicio.grupo;
            document.getElementById('exercicio-descricao').value = exercicio.descricao || '';
            
            // Handle image preview if exists
            const preview = document.getElementById('imagem-preview');
            if (exercicio.imagemURL) {
                preview.src = exercicio.imagemURL;
                preview.classList.remove('d-none');
            } else {
                preview.classList.add('d-none');
            }
            
            exercicioModal.show();
        }
    });
}

async function excluirExercicio(exercicioId) {
    if (confirm('Tem certeza que deseja excluir este exercício?')) {
        try {
            // First delete the image if it exists
            await deleteExerciseImage(exercicioId);
            
            // Then delete the exercise data
            const exercicioRef = ref(database, `exercicios/${exercicioId}`);
            await remove(exercicioRef);
        } catch (error) {
            alert(`Erro ao excluir exercício: ${error.message}`);
        }
    }
}

function updateExercicioDropdowns() {
    const exerciciosRef = ref(database, 'exercicios');
    
    get(exerciciosRef).then((snapshot) => {
        const dropdowns = document.querySelectorAll('.exercicio-select');
        
        dropdowns.forEach(dropdown => {
            // Save the current selected value
            const selectedValue = dropdown.value;
            
            // Clear all options except the first one
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Add options from database
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const exercicioId = childSnapshot.key;
                    const exercicio = childSnapshot.val();
                    
                    const option = document.createElement('option');
                    option.value = exercicioId;
                    option.textContent = `${exercicio.nome} (${exercicio.grupo})`;
                    
                    dropdown.appendChild(option);
                });
            }
            
            // Restore the selected value if it exists
            if (selectedValue) {
                dropdown.value = selectedValue;
            }
        });
    });
}

function loadTreinos() {
    const treinosRef = ref(database, 'treinos');
    onValue(treinosRef, () => {
        // Update dashboard if it's visible
        if (!dashboardSection.classList.contains('d-none')) {
            loadDashboardData();
        }
    });
}

function loadAlunosList() {
    const alunosRef = ref(database, 'alunos');
    
    get(alunosRef).then((snapshot) => {
        alunosList.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const alunoId = childSnapshot.key;
                const aluno = childSnapshot.val();
                
                const item = document.createElement('a');
                item.href = '#';
                item.className = 'list-group-item list-group-item-action';
                item.dataset.id = alunoId;
                item.textContent = aluno.nome;
                
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remove active class from all items
                    document.querySelectorAll('.list-group-item').forEach(el => {
                        el.classList.remove('active');
                    });
                    
                    // Add active class to clicked item
                    item.classList.add('active');
                    
                    // Show treino info
                    treinoEmpty.classList.add('d-none');
                    treinoInfo.classList.remove('d-none');
                    
                    // Set selected aluno
                    selectedAlunoId = alunoId;
                    alunoNomeTreino.textContent = `Treinos de ${aluno.nome}`;
                    
                    // Load treinos for this aluno
                    loadTreinosForAluno(alunoId);
                });
                
                alunosList.appendChild(item);
            });
        }
    });
}

function loadTreinosForAluno(alunoId) {
    const treinosAlunoRef = ref(database, `treinos/${alunoId}`);
    
    get(treinosAlunoRef).then((snapshot) => {
        treinosContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const treinoId = childSnapshot.key;
                const treino = childSnapshot.val();
                
                const card = document.createElement('div');
                card.className = 'card mb-3';
                
                // Format dias da semana
                let diasSemana = '';
                if (treino.dias && treino.dias.length > 0) {
                    diasSemana = treino.dias.join(', ');
                }
                
                card.innerHTML = `
                    <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${treino.nome}</h5>
                        <div>
                            <button class="btn btn-sm btn-light editar-treino" data-id="${treinoId}">Editar</button>
                            <button class="btn btn-sm btn-danger excluir-treino" data-id="${treinoId}">Excluir</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p><strong>Dias:</strong> ${diasSemana || 'Não especificado'}</p>
                        <p><strong>Exercícios:</strong></p>
                        <ul class="list-group mb-3">
                            ${renderExerciciosTreino(treino.exercicios, treino.dataCriacao)}
                        </ul>
                        ${treino.observacoes ? `<p><strong>Observações:</strong> ${treino.observacoes}</p>` : ''}
                    </div>
                `;
                
                treinosContainer.appendChild(card);
                
                // Add event listeners
                card.querySelector('.editar-treino').addEventListener('click', () => editTreino(alunoId, treinoId));
                card.querySelector('.excluir-treino').addEventListener('click', () => excluirTreino(alunoId, treinoId));
            });
        } else {
            treinosContainer.innerHTML = '<div class="alert alert-info">Este aluno ainda não possui treinos cadastrados.</div>';
        }
    });
}

function handleSaveTreino() {
    const treinoId = document.getElementById('treino-id').value;
    const alunoId = document.getElementById('treino-aluno-id').value;
    const nome = document.getElementById('treino-nome').value;
    const observacoes = document.getElementById('treino-observacoes').value;
    
    // Collect dias da semana
    const dias = [];
    document.querySelectorAll('input[type="checkbox"][id^="dia-"]:checked').forEach(el => {
        dias.push(el.value);
    });
    
    // Collect exercícios
    const exercicios = [];
    document.querySelectorAll('.exercicio-item').forEach(item => {
        const exercicioId = item.querySelector('.exercicio-select').value;
        
        if (exercicioId) {
            const exercicioNome = item.querySelector('.exercicio-select option:checked').textContent;
            const series = item.querySelector('.exercicio-series').value;
            const repeticoes = item.querySelector('.exercicio-repeticoes').value;
            const descanso = item.querySelector('.exercicio-descanso').value;
            const observacoes = item.querySelector('.exercicio-obs').value;
            
            exercicios.push({
                exercicioId,
                nomeExercicio: exercicioNome,
                series,
                repeticoes,
                descanso,
                observacoes
            });
        }
    });
    
    if (!nome) {
        alert('Nome do treino é obrigatório!');
        return;
    }
    
    if (exercicios.length === 0) {
        alert('Adicione pelo menos um exercício ao treino!');
        return;
    }
    
    const treinoData = {
        nome,
        dias,
        exercicios,
        observacoes,
        dataCriacao: treinoId ? undefined : Date.now()
    };
    
    let treinoRef;
    
    if (treinoId) {
        // Update existing treino
        treinoRef = ref(database, `treinos/${alunoId}/${treinoId}`);
        update(treinoRef, treinoData)
            .then(() => {
                treinoForm.reset();
                treinoModal.hide();
                
                // Reload treinos for this aluno
                loadTreinosForAluno(alunoId);
            })
            .catch((error) => {
                alert(`Erro ao atualizar treino: ${error.message}`);
            });
    } else {
        // Create new treino
        treinoRef = ref(database, `treinos/${alunoId}`);
        push(treinoRef, treinoData)
            .then(() => {
                treinoForm.reset();
                treinoModal.hide();
                
                // Reload treinos for this aluno
                loadTreinosForAluno(alunoId);
            })
            .catch((error) => {
                alert(`Erro ao adicionar treino: ${error.message}`);
            });
    }
}

function editTreino(alunoId, treinoId) {
    const treinoRef = ref(database, `treinos/${alunoId}/${treinoId}`);
    
    get(treinoRef).then((snapshot) => {
        if (snapshot.exists()) {
            const treino = snapshot.val();
            
            // Reset form
            resetTreinoForm();
            
            // Set treino data
            document.getElementById('treino-id').value = treinoId;
            document.getElementById('treino-aluno-id').value = alunoId;
            document.getElementById('treino-nome').value = treino.nome;
            document.getElementById('treino-observacoes').value = treino.observacoes || '';
            
            // Set dias da semana
            if (treino.dias && treino.dias.length > 0) {
                treino.dias.forEach(dia => {
                    const checkbox = document.getElementById(`dia-${dia.toLowerCase()}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
            
            // Remove default exercicio item
            exerciciosContainer.innerHTML = '';
            
            // Add exercicios
            if (treino.exercicios && treino.exercicios.length > 0) {
                treino.exercicios.forEach((ex, index) => {
                    addExercicioRow();
                    
                    // Update after DOM is updated and dropdowns are populated
                    setTimeout(() => {
                        const item = exerciciosContainer.children[index];
                        
                        if (item) {
                            const selectEl = item.querySelector('.exercicio-select');
                            const seriesEl = item.querySelector('.exercicio-series');
                            const repeticoesEl = item.querySelector('.exercicio-repeticoes');
                            const descansoEl = item.querySelector('.exercicio-descanso');
                            const obsEl = item.querySelector('.exercicio-obs');
                            
                            selectEl.value = ex.exercicioId;
                            seriesEl.value = ex.series;
                            repeticoesEl.value = ex.repeticoes;
                            descansoEl.value = ex.descanso;
                            obsEl.value = ex.observacoes || '';
                        }
                    }, 100);
                });
            } else {
                // Add one empty exercicio row
                addExercicioRow();
            }
            
            treinoModal.show();
        }
    });
}

function excluirTreino(alunoId, treinoId) {
    if (confirm('Tem certeza que deseja excluir este treino?')) {
        const treinoRef = ref(database, `treinos/${alunoId}/${treinoId}`);
        
        remove(treinoRef)
            .then(() => {
                // Reload treinos for this aluno
                loadTreinosForAluno(alunoId);
            })
            .catch(error => {
                alert(`Erro ao excluir treino: ${error.message}`);
            });
    }
}

function resetTreinoForm() {
    treinoForm.reset();
    
    // Uncheck all day checkboxes
    document.querySelectorAll('input[type="checkbox"][id^="dia-"]').forEach(el => {
        el.checked = false;
    });
    
    // Reset exercicios container to have one empty exercicio
    exerciciosContainer.innerHTML = '';
    addExercicioRow();
}

function addExercicioRow() {
    const newExercicio = document.createElement('div');
    newExercicio.className = 'exercicio-item card mb-3';
    newExercicio.innerHTML = `
        <div class="card-body">
            <div class="row">
                <div class="col-md-4 mb-2">
                    <label class="form-label">Exercício</label>
                    <select class="form-control exercicio-select" required>
                        <option value="">Selecione...</option>
                    </select>
                </div>
                <div class="col-md-2 mb-2">
                    <label class="form-label">Séries</label>
                    <input type="number" class="form-control exercicio-series" min="1" value="3" required>
                </div>
                <div class="col-md-2 mb-2">
                    <label class="form-label">Repetições</label>
                    <input type="text" class="form-control exercicio-repeticoes" value="12" required placeholder="Ex: 12-15">
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">Descanso (seg)</label>
                    <input type="number" class="form-control exercicio-descanso" min="0" value="60" required>
                </div>
                <div class="col-md-1 d-flex align-items-end mb-2">
                    <button type="button" class="btn btn-danger btn-sm remover-exercicio">
                        <i class="bi bi-trash"></i>X
                    </button>
                </div>
            </div>
            <div class="row">
                <div class="col-12">
                    <label class="form-label">Observações</label>
                    <textarea class="form-control exercicio-obs" rows="2"></textarea>
                </div>
            </div>
        </div>
    `;
    
    exerciciosContainer.appendChild(newExercicio);
    
    // Update exercise dropdown in the new row
    updateExercicioDropdowns();
}

function loadDashboardData() {
    // Count alunos
    const alunosRef = ref(database, 'alunos');
    get(alunosRef).then((snapshot) => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        totalAlunos.textContent = count;
    });
    
    // Count exercicios
    const exerciciosRef = ref(database, 'exercicios');
    get(exerciciosRef).then((snapshot) => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        totalExercicios.textContent = count;
    });
    
    // Count treinos
    let treinosCount = 0;
    const treinosRef = ref(database, 'treinos');
    get(treinosRef).then((snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((alunoSnapshot) => {
                if (alunoSnapshot.exists()) {
                    treinosCount += Object.keys(alunoSnapshot.val()).length;
                }
            });
        }
        totalTreinos.textContent = treinosCount;
    });
    
    // Load recent treinos
    loadRecentTreinos();
}

function loadRecentTreinos() {
    treinosRecentes.innerHTML = '';
    
    const treinosRef = ref(database, 'treinos');
    
    get(treinosRef).then((snapshot) => {
        if (snapshot.exists()) {
            let recentTreinos = [];
            
            // Collect all treinos with their alunoId
            snapshot.forEach((alunoSnapshot) => {
                const alunoId = alunoSnapshot.key;
                
                if (alunoSnapshot.exists()) {
                    alunoSnapshot.forEach((treinoSnapshot) => {
                        const treinoId = treinoSnapshot.key;
                        const treino = treinoSnapshot.val();
                        
                        recentTreinos.push({
                            alunoId,
                            treinoId,
                            ...treino
                        });
                    });
                }
            });
            
            // Sort by dataCriacao (most recent first)
            recentTreinos.sort((a, b) => (b.dataCriacao || 0) - (a.dataCriacao || 0));
            
            // Get top 5
            recentTreinos = recentTreinos.slice(0, 5);
            
            // Get aluno names for these treinos
            const alunoIds = [...new Set(recentTreinos.map(t => t.alunoId))];
            const alunoPromises = alunoIds.map(id => get(ref(database, `alunos/${id}`)));
            
            Promise.all(alunoPromises).then((results) => {
                const alunoNames = {};
                results.forEach((result, index) => {
                    if (result.exists()) {
                        alunoNames[alunoIds[index]] = result.val().nome;
                    }
                });
                
                // Create treino items
                recentTreinos.forEach((treino) => {
                    const alunoNome = alunoNames[treino.alunoId] || 'Aluno desconhecido';
                    const dataCriacao = treino.dataCriacao ? new Date(treino.dataCriacao).toLocaleDateString('pt-BR') : 'Data desconhecida';
                    
                    const item = document.createElement('a');
                    item.href = '#';
                    item.className = 'list-group-item list-group-item-action';
                    item.innerHTML = `
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${treino.nome}</h6>
                            <small>${dataCriacao}</small>
                        </div>
                        <p class="mb-1">Aluno: ${alunoNome}</p>
                    `;
                    
                    item.addEventListener('click', () => {
                        // Show treinos section and select this aluno
                        showSection(treinosSection);
                        
                        // Find and click on the aluno in the list
                        setTimeout(() => {
                            const alunoItem = document.querySelector(`.list-group-item[data-id="${treino.alunoId}"]`);
                            if (alunoItem) {
                                alunoItem.click();
                            }
                        }, 100);
                    });
                    
                    treinosRecentes.appendChild(item);
                });
                
                if (recentTreinos.length === 0) {
                    treinosRecentes.innerHTML = '<div class="alert alert-info">Nenhum treino cadastrado ainda.</div>';
                }
            });
        } else {
            treinosRecentes.innerHTML = '<div class="alert alert-info">Nenhum treino cadastrado ainda.</div>';
        }
    });
}

function hideApp() {
    authSection.classList.remove('d-none');
    navbar.classList.add('d-none');
    mainContent.classList.add('d-none');
}

function showSection(section) {
    // Hide all sections
    dashboardSection.classList.add('d-none');
    alunosSection.classList.add('d-none');
    exerciciosSection.classList.add('d-none');
    treinosSection.classList.add('d-none');
    
    // Show the selected section
    section.classList.remove('d-none');
    
    // Additional actions based on section
    if (section === treinosSection) {
        loadAlunosList();
    } else if (section === dashboardSection) {
        loadDashboardData();
    }
}

function handleImagePreview() {
    const fileInput = document.getElementById('exercicio-imagem');
    const preview = document.getElementById('imagem-preview');
    
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.classList.remove('d-none');
            }
            
            reader.readAsDataURL(file);
        } else {
            preview.classList.add('d-none');
            preview.src = '';
        }
    });
}

async function uploadExerciseImage(file, exercicioId) {
    if (!file) return null;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const fileName = `exercicios/${exercicioId}.${fileExtension}`;
    const imageRef = storageRef(storage, fileName);
    
    try {
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        return null;
    }
}

async function deleteExerciseImage(exercicioId) {
    try {
        // Try both common extensions
        const imageRefJpg = storageRef(storage, `exercicios/${exercicioId}.jpg`);
        const imageRefPng = storageRef(storage, `exercicios/${exercicioId}.png`);
        const imageRefGif = storageRef(storage, `exercicios/${exercicioId}.gif`);
        
        try { await deleteObject(imageRefJpg); } catch (e) {}
        try { await deleteObject(imageRefPng); } catch (e) {}
        try { await deleteObject(imageRefGif); } catch (e) {}
        
        return true;
    } catch (error) {
        console.error("Error deleting image:", error);
        return false;
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized"); // Debug logging
    
    // Initialize image preview handler
    handleImagePreview();
    
    // Auth listeners
    authForm.addEventListener('submit', handleAuth);
    btnLogout.addEventListener('click', handleLogout);
    
    // Navigation listeners
    navDashboard.addEventListener('click', () => showSection(dashboardSection));
    navAlunos.addEventListener('click', () => showSection(alunosSection));
    navExercicios.addEventListener('click', () => showSection(exerciciosSection));
    navTreinos.addEventListener('click', () => showSection(treinosSection));
    
    // Student navigation
    document.getElementById('nav-meus-treinos')?.addEventListener('click', () => {
        if (userRole === 'student' && currentUser) {
            document.getElementById('main-content').classList.add('d-none');
            document.getElementById('student-view').classList.remove('d-none');
        }
    });
    
    // Save button listeners
    salvarAluno.addEventListener('click', handleSaveAluno);
    salvarExercicio.addEventListener('click', handleSaveExercicio);
    salvarTreino.addEventListener('click', handleSaveTreino);
    
    // Treino listeners
    btnAdicionarTreino.addEventListener('click', () => {
        document.getElementById('treino-aluno-id').value = selectedAlunoId;
        document.getElementById('treino-id').value = '';
        resetTreinoForm();
        treinoModal.show();
    });
    
    adicionarExercicio.addEventListener('click', addExercicioRow);
    
    // Listen for remove exercise buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('remover-exercicio')) {
            const exercicioItem = e.target.closest('.exercicio-item');
            if (exerciciosContainer.children.length > 1) {
                exercicioItem.remove();
            }
        }
    });
    
    // Setup event delegation for dynamically added inputs
    document.addEventListener('focusin', function(e) {
        if ((e.target.tagName === 'INPUT' && e.target.type === 'text') || 
            e.target.tagName === 'TEXTAREA') {
            // Skip inputs in auth section
            if (!authSection.contains(e.target)) {
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
});