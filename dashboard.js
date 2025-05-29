// Dashboard related functionality
import { ref, get, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from './firebase-config.js';
import { showSection } from './utils.js';

// Load dashboard data (counts and recent workouts)
function loadDashboardData() {
    // Count alunos
    const alunosRef = ref(database, 'alunos');
    get(alunosRef).then((snapshot) => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        document.getElementById('total-alunos').textContent = count;
    });
    
    // Count exercicios
    const exerciciosRef = ref(database, 'exercicios');
    get(exerciciosRef).then((snapshot) => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        document.getElementById('total-exercicios').textContent = count;
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
        document.getElementById('total-treinos').textContent = treinosCount;
    });
    
    // Load recent treinos
    loadRecentTreinos();
}

function loadRecentTreinos() {
    const treinosRecentes = document.getElementById('treinos-recentes');
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
                        const treinosSection = document.getElementById('treinos-section');
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

export { loadDashboardData, loadRecentTreinos };