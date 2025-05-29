// Student view functionality
import { ref, get } from 'firebase/database';
import { database } from './firebase-config.js';
import { renderExerciciosTreino } from './treinos.js';
import { setupUppercaseInputs } from './utils.js';

function showStudentView(alunoId, alunoNome) {
    // Hide auth and admin sections
    document.getElementById('auth-section').classList.add('d-none');
    document.getElementById('navbar').classList.remove('d-none');
    
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

export { 
    showStudentView, 
    hideStudentView, 
    loadStudentTreinos 
};