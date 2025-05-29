// Exercise management functionality
import { ref, set, get, push, remove, update, onValue } from 'firebase/database';
import { database, storage } from './firebase-config.js';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Handle save exercise
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
        document.getElementById('exercicio-form').reset();
        document.getElementById('imagem-preview').classList.add('d-none');
        const exercicioModal = new bootstrap.Modal(document.getElementById('exercicioModal'));
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
    const exercicioModal = new bootstrap.Modal(document.getElementById('exercicioModal'));
    
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

function loadExercicios() {
    const exerciciosRef = ref(database, 'exercicios');
    const exerciciosTableBody = document.getElementById('exercicios-table-body');
    
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

export { 
    handleSaveExercicio, 
    editExercicio, 
    excluirExercicio, 
    loadExercicios, 
    updateExercicioDropdowns,
    handleImagePreview
};