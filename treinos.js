// Workout management functionality
import { ref, set, get, push, remove, update, onValue } from 'firebase/database';
import { database } from './firebase-config.js';
import { updateExercicioDropdowns } from './exercicios.js';

// Global variable for selected student
window.selectedAlunoId = null;

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

function loadTreinosForAluno(alunoId) {
    const treinosAlunoRef = ref(database, `treinos/${alunoId}`);
    const treinosContainer = document.getElementById('treinos-container');
    
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
        observacoes
    };
    
    const treinoModal = new bootstrap.Modal(document.getElementById('treinoModal'));
    
    // Only add creation date for new treinos, not when updating
    if (!treinoId) {
        treinoData.dataCriacao = Date.now();
        
        // Code for creating new treino
        const treinoRef = ref(database, `treinos/${alunoId}`);
        push(treinoRef, treinoData)
            .then(() => {
                document.getElementById('treino-form').reset();
                treinoModal.hide();
                
                // Reload treinos for this aluno
                loadTreinosForAluno(alunoId);
            })
            .catch((error) => {
                alert(`Erro ao adicionar treino: ${error.message}`);
            });
    } else {
        // For existing treinos, preserve the original dataCriacao
        get(ref(database, `treinos/${alunoId}/${treinoId}/dataCriacao`))
            .then((snapshot) => {
                if (snapshot.exists()) {
                    treinoData.dataCriacao = snapshot.val();
                } else {
                    // If for some reason dataCriacao is missing, add current timestamp
                    treinoData.dataCriacao = Date.now();
                }
                
                // Update the treino with complete data
                const treinoRef = ref(database, `treinos/${alunoId}/${treinoId}`);
                update(treinoRef, treinoData)
                    .then(() => {
                        document.getElementById('treino-form').reset();
                        treinoModal.hide();
                        
                        // Reload treinos for this aluno
                        loadTreinosForAluno(alunoId);
                    })
                    .catch((error) => {
                        alert(`Erro ao atualizar treino: ${error.message}`);
                    });
            });
    }
}

function editTreino(alunoId, treinoId) {
    const treinoRef = ref(database, `treinos/${alunoId}/${treinoId}`);
    const treinoModal = new bootstrap.Modal(document.getElementById('treinoModal'));
    
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
            document.getElementById('exercicios-container').innerHTML = '';
            
            // Add exercicios
            if (treino.exercicios && treino.exercicios.length > 0) {
                treino.exercicios.forEach((ex, index) => {
                    addExercicioRow();
                    
                    // Update after DOM is updated and dropdowns are populated
                    setTimeout(() => {
                        const item = document.getElementById('exercicios-container').children[index];
                        
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
    document.getElementById('treino-form').reset();
    
    // Uncheck all day checkboxes
    document.querySelectorAll('input[type="checkbox"][id^="dia-"]').forEach(el => {
        el.checked = false;
    });
    
    // Reset exercicios container to have one empty exercicio
    document.getElementById('exercicios-container').innerHTML = '';
    addExercicioRow();
}

function addExercicioRow() {
    const exerciciosContainer = document.getElementById('exercicios-container');
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

export {
    handleSaveTreino,
    editTreino,
    excluirTreino,
    resetTreinoForm,
    addExercicioRow,
    loadTreinosForAluno,
    renderExerciciosTreino
};