// Student management functionality
import { ref, set, get, push, remove, update, onValue } from 'firebase/database';
import { database } from './firebase-config.js';

// Handle save student
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
    const alunoModal = new bootstrap.Modal(document.getElementById('alunoModal'));
    
    if (alunoId) {
        // Update existing aluno
        alunoRef = ref(database, `alunos/${alunoId}`);
        update(alunoRef, alunoData)
            .then(() => {
                document.getElementById('aluno-form').reset();
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
                document.getElementById('aluno-form').reset();
                alunoModal.hide();
            })
            .catch((error) => {
                alert(`Erro ao adicionar aluno: ${error.message}`);
            });
    }
}

function editAluno(alunoId) {
    const alunoRef = ref(database, `alunos/${alunoId}`);
    const alunoModal = new bootstrap.Modal(document.getElementById('alunoModal'));
    
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
    const alunosTableBody = document.getElementById('alunos-table-body');
    
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

// Load students list for workout section
function loadAlunosList() {
    const alunosRef = ref(database, 'alunos');
    const alunosList = document.getElementById('alunos-list');
    
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
                    document.getElementById('treino-empty').classList.add('d-none');
                    document.getElementById('treino-info').classList.remove('d-none');
                    
                    // Set selected aluno
                    window.selectedAlunoId = alunoId;
                    document.getElementById('aluno-nome-treino').textContent = `Treinos de ${aluno.nome}`;
                    
                    // Load treinos for this aluno
                    import('./treinos.js').then(module => {
                        module.loadTreinosForAluno(alunoId);
                    });
                });
                
                alunosList.appendChild(item);
            });
        }
    });
}

export { 
    handleSaveAluno, 
    editAluno, 
    loadAlunos, 
    excluirAluno, 
    loadAlunosList
};