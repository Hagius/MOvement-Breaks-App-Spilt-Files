/**
 * Hagius Active Journey - Exercise Admin
 * Manages the exercise database for the Active Journey app
 */

// Wrap everything in an IIFE to avoid global namespace pollution
(function() {
  // Constants
  const STORAGE_KEY = 'hagius_exercises';
  const DEFAULT_EXERCISES_URL = 'exercises.json';
  const AUTH_KEY = 'hagius_admin_auth';
  
  // DOM Elements
  const elements = {
    exerciseTableBody: document.getElementById('exerciseTableBody'),
    addExerciseBtn: document.getElementById('addExerciseBtn'),
    exportBtn: document.getElementById('exportBtn'),
    resetDefaultBtn: document.getElementById('resetDefaultBtn'),
    importBtn: document.getElementById('importBtn'),
    jsonImport: document.getElementById('jsonImport'),
    
    // Error/Success containers
    errorContainer: document.getElementById('errorContainer'),
    successContainer: document.getElementById('successContainer'),
    modalError: document.getElementById('modalError'),
    
    // Exercise modal elements
    exerciseModal: document.getElementById('exerciseModal'),
    modalTitle: document.getElementById('modalTitle'),
    closeModal: document.getElementById('closeModal'),
    exerciseForm: document.getElementById('exerciseForm'),
    exerciseId: document.getElementById('exerciseId'),
    exerciseName: document.getElementById('exerciseName'),
    exerciseDescription: document.getElementById('exerciseDescription'),
    exerciseUnilateral: document.getElementById('exerciseUnilateral'),
    exerciseImage: document.getElementById('exerciseImage'),
    imagePreview: document.getElementById('imagePreview'),
    exerciseProbability: document.getElementById('exerciseProbability'),
    
    // Delete modal elements
    deleteModal: document.getElementById('deleteModal'),
    closeDeleteModal: document.getElementById('closeDeleteModal'),
    deleteExerciseName: document.getElementById('deleteExerciseName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    
    // Reset modal elements
    resetModal: document.getElementById('resetModal'),
    closeResetModal: document.getElementById('closeResetModal'),
    confirmResetBtn: document.getElementById('confirmResetBtn'),
    cancelResetBtn: document.getElementById('cancelResetBtn'),
    
    // Toast
    toast: document.getElementById('toast')
  };
  
  // State
  let exercises = [];
  let defaultExercises = [];
  let currentExerciseIndex = -1;
  
  // Check authentication first
  function checkAuth() {
    const isAuthenticated = sessionStorage.getItem(AUTH_KEY) === 'true';
    
    if (!isAuthenticated) {
      window.location.href = 'admin-access.html';
      return false;
    }
    
    return true;
  }
  
  // Utility Functions
  const utils = {
    /**
     * Show a message in the error container
     * @param {string} message - Error message to display
     * @param {HTMLElement} container - Container to show error in
     */
    showError: (message, container = elements.errorContainer) => {
      container.textContent = message;
      container.style.display = 'block';
      
      // Auto hide after 5 seconds
      setTimeout(() => {
        container.style.display = 'none';
      }, 5000);
    },
    
    /**
     * Show a success message
     * @param {string} message - Success message to display
     */
    showSuccess: (message) => {
      elements.successContainer.textContent = message;
      elements.successContainer.style.display = 'block';
      
      // Auto hide after 3 seconds
      setTimeout(() => {
        elements.successContainer.style.display = 'none';
      }, 3000);
    },
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {number} duration - How long to show in ms
     */
    showToast: (message, duration = 3000) => {
      elements.toast.textContent = message;
      elements.toast.classList.add('show');
      
      setTimeout(() => {
        elements.toast.classList.remove('show');
      }, duration);
    },
    
    /**
     * Save exercises to localStorage
     */
    saveExercises: () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
        return true;
      } catch (error) {
        console.error('Error saving exercises:', error);
        utils.showError('Failed to save exercises. Local storage may be full or disabled.');
        return false;
      }
    },
    
    /**
     * Load exercises from localStorage
     */
    loadExercises: () => {
      try {
        const savedExercises = localStorage.getItem(STORAGE_KEY);
        
        if (savedExercises) {
          exercises = JSON.parse(savedExercises);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error loading exercises:', error);
        utils.showError('Failed to load saved exercises. Loading defaults instead.');
        return false;
      }
    },
    
    /**
     * Load default exercises from JSON file
     */
    loadDefaultExercises: async () => {
      try {
        const response = await fetch(DEFAULT_EXERCISES_URL);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        defaultExercises = data;
        
        // If no saved exercises, use defaults
        if (!utils.loadExercises() || exercises.length === 0) {
          exercises = [...defaultExercises];
          utils.saveExercises();
        }
        
        return true;
      } catch (error) {
        console.error('Error loading default exercises:', error);
        utils.showError('Failed to load default exercises. Try refreshing the page.');
        return false;
      }
    },
    
    /**
     * Validate an exercise object
     * @param {Object} exercise - Exercise to validate
     * @returns {string|null} Error message or null if valid
     */
    validateExercise: (exercise) => {
      if (!exercise.name || exercise.name.trim() === '') {
        return 'Exercise name is required';
      }
      
      if (!exercise.description || exercise.description.trim() === '') {
        return 'Exercise description is required';
      }
      
      if (!exercise.image || exercise.image.trim() === '') {
        return 'Image URL is required';
      }
      
      if (typeof exercise.unilateral !== 'boolean') {
        return 'Unilateral must be true or false';
      }
      
      if (isNaN(parseFloat(exercise.probability))) {
        return 'Probability must be a number';
      }
      
      return null;
    },
    
    /**
     * Handle errors with appropriate feedback
     * @param {Error} error - The error object
     * @param {string} context - Context where error occurred
     * @param {HTMLElement} container - Error container (optional)
     */
    handleError: (error, context, container = null) => {
      console.error(`Error in ${context}:`, error);
      
      let message = `An error occurred while ${context}. Please try again.`;
      
      if (error.message) {
        message += ` (${error.message})`;
      }
      
      if (container) {
        utils.showError(message, container);
      } else {
        utils.showError(message);
      }
    }
  };
  
  // UI Functions
  const ui = {
    /**
     * Render exercises table
     */
    renderExercisesTable: () => {
      elements.exerciseTableBody.innerHTML = '';
      
      if (exercises.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" style="text-align: center;">No exercises found. Add your first exercise or reset to defaults.</td>';
        elements.exerciseTableBody.appendChild(emptyRow);
        return;
      }
      
      exercises.forEach((exercise, index) => {
        const row = document.createElement('tr');
        
        // Image cell
        let imageCell = `<td><img src="${exercise.image}" alt="${exercise.name}" class="image-preview"></td>`;
        
        // Fix for any missing images
        if (!exercise.image) {
          imageCell = '<td><div class="image-preview" style="background:#333;display:flex;align-items:center;justify-content:center;">No IMG</div></td>';
        }
        
        // Format probability display
        let frequencyDisplay = 'Normal';
        if (exercise.probability === 0.5) {
          frequencyDisplay = 'Low';
        } else if (exercise.probability === 2) {
          frequencyDisplay = 'High';
        }
        
        // Create row with all exercise data
        row.innerHTML = `
          ${imageCell}
          <td>${exercise.name}</td>
          <td>${exercise.description}</td>
          <td>${exercise.unilateral ? 'Yes' : 'No'}</td>
          <td>${frequencyDisplay}</td>
          <td class="action-cell">
            <button class="btn edit-btn" data-index="${index}">Edit</button>
            <button class="btn btn-danger delete-btn" data-index="${index}">Delete</button>
          </td>
        `;
        
        elements.exerciseTableBody.appendChild(row);
      });
      
      // Attach event listeners to buttons
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.getAttribute('data-index'));
          ui.openExerciseModal(index);
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.getAttribute('data-index'));
          ui.openDeleteModal(index);
        });
      });
    },
    
    /**
     * Open exercise modal for adding/editing
     * @param {number} index - Index of exercise to edit, -1 for new
     */
    openExerciseModal: (index = -1) => {
      currentExerciseIndex = index;
      
      // Reset form
      elements.exerciseForm.reset();
      elements.modalError.style.display = 'none';
      
      if (index === -1) {
        // Adding new exercise
        elements.modalTitle.textContent = 'Add New Exercise';
        elements.exerciseId.value = '';
        elements.imagePreview.src = 'placeholder.png';
      } else {
        // Editing existing exercise
        elements.modalTitle.textContent = 'Edit Exercise';
        
        const exercise = exercises[index];
        elements.exerciseId.value = index;
        elements.exerciseName.value = exercise.name || '';
        elements.exerciseDescription.value = exercise.description || '';
        elements.exerciseUnilateral.checked = !!exercise.unilateral;
        elements.exerciseImage.value = exercise.image || '';
        elements.exerciseProbability.value = exercise.probability || 1;
        elements.imagePreview.src = exercise.image || 'placeholder.png';
      }
      
      // Show modal
      elements.exerciseModal.classList.add('active');
    },
    
    /**
     * Close exercise modal
     */
    closeExerciseModal: () => {
      elements.exerciseModal.classList.remove('active');
    },
    
    /**
     * Open delete confirmation modal
     * @param {number} index - Index of exercise to delete
     */
    openDeleteModal: (index) => {
      currentExerciseIndex = index;
      elements.deleteExerciseName.textContent = exercises[index].name;
      elements.deleteModal.classList.add('active');
    },
    
    /**
     * Close delete confirmation modal
     */
    closeDeleteModal: () => {
      elements.deleteModal.classList.remove('active');
    },
    
    /**
     * Open reset confirmation modal
     */
    openResetModal: () => {
      elements.resetModal.classList.add('active');
    },
    
    /**
     * Close reset confirmation modal
     */
    closeResetModal: () => {
      elements.resetModal.classList.remove('active');
    }
  };
  
  // Event Handlers
  const handlers = {
    /**
     * Handle form submission for adding/editing exercises
     * @param {Event} e - Form submit event
     */
    handleFormSubmit: (e) => {
      e.preventDefault();
      
      try {
        // Get form values
        const exercise = {
          name: elements.exerciseName.value.trim(),
          description: elements.exerciseDescription.value.trim(),
          unilateral: elements.exerciseUnilateral.checked,
          image: elements.exerciseImage.value.trim(),
          probability: parseFloat(elements.exerciseProbability.value)
        };
        
        // Validate exercise
        const validationError = utils.validateExercise(exercise);
        if (validationError) {
          utils.showError(validationError, elements.modalError);
          return;
        }
        
        if (currentExerciseIndex === -1) {
          // Add new exercise
          exercises.push(exercise);
          utils.showToast('Exercise added successfully!');
        } else {
          // Update existing exercise
          exercises[currentExerciseIndex] = exercise;
          utils.showToast('Exercise updated successfully!');
        }
        
        // Save and refresh
        utils.saveExercises();
        ui.renderExercisesTable();
        ui.closeExerciseModal();
      } catch (error) {
        utils.handleError(error, 'saving exercise', elements.modalError);
      }
    },
    
    /**
     * Handle image URL input change to update preview
     */
    handleImageUrlChange: () => {
      try {
        const imageUrl = elements.exerciseImage.value.trim();
        
        if (imageUrl) {
          elements.imagePreview.src = imageUrl;
          
          // Handle loading errors
          elements.imagePreview.onerror = () => {
            elements.imagePreview.src = 'placeholder.png';
          };
        } else {
          elements.imagePreview.src = 'placeholder.png';
        }
      } catch (error) {
        console.warn('Error updating image preview:', error);
        elements.imagePreview.src = 'placeholder.png';
      }
    },
    
    /**
     * Handle exercise deletion
     */
    handleDeleteExercise: () => {
      try {
        if (currentExerciseIndex > -1) {
          const exerciseName = exercises[currentExerciseIndex].name;
          exercises.splice(currentExerciseIndex, 1);
          
          utils.saveExercises();
          ui.renderExercisesTable();
          ui.closeDeleteModal();
          
          utils.showToast(`"${exerciseName}" has been deleted.`);
        }
      } catch (error) {
        utils.handleError(error, 'deleting exercise');
        ui.closeDeleteModal();
      }
    },
    
    /**
     * Handle reset to default exercises
     */
    handleResetToDefault: () => {
      try {
        exercises = [...defaultExercises];
        utils.saveExercises();
        ui.renderExercisesTable();
        ui.closeResetModal();
        
        utils.showToast('Reset to default exercises successfully.');
      } catch (error) {
        utils.handleError(error, 'resetting exercises');
        ui.closeResetModal();
      }
    },
    
    /**
     * Handle export of exercises to JSON
     */
    handleExportExercises: () => {
      try {
        // Format JSON with indentation for readability
        const jsonData = JSON.stringify(exercises, null, 2);
        
        // Create a blob and download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hagius_exercises.json';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        utils.showToast('Exercises exported successfully!');
      } catch (error) {
        utils.handleError(error, 'exporting exercises');
      }
    },
    
    /**
     * Handle import of exercises from JSON
     */
    handleImportExercises: () => {
      try {
        const jsonText = elements.jsonImport.value.trim();
        
        if (!jsonText) {
          utils.showError('Please paste a valid JSON array of exercises.');
          return;
        }
        
        const importedExercises = JSON.parse(jsonText);
        
        // Validate that it's an array
        if (!Array.isArray(importedExercises)) {
          utils.showError('The imported data is not a valid array.');
          return;
        }
        
        // Validate each exercise
        let validationErrors = [];
        importedExercises.forEach((ex, index) => {
          const error = utils.validateExercise(ex);
          if (error) {
            validationErrors.push(`Exercise #${index + 1}: ${error}`);
          }
        });
        
        if (validationErrors.length > 0) {
          utils.showError(`Validation errors: ${validationErrors.join(', ')}`);
          return;
        }
        
        // Ask for confirmation if replacing existing exercises
        if (exercises.length > 0) {
          if (!confirm(`This will replace your existing ${exercises.length} exercises with ${importedExercises.length} imported exercises. Continue?`)) {
            return;
          }
        }
        
        // Replace exercises
        exercises = importedExercises;
        utils.saveExercises();
        ui.renderExercisesTable();
        elements.jsonImport.value = '';
        
        utils.showSuccess(`Successfully imported ${exercises.length} exercises!`);
      } catch (error) {
        utils.handleError(error, 'importing exercises');
      }
    }
  };
  
  // Initialization
  async function init() {
    try {
      // Check authentication
      if (!checkAuth()) {
        return;
      }
      
      // Load exercises
      await utils.loadDefaultExercises();
      
      // Render exercises table
      ui.renderExercisesTable();
      
      // Attach event listeners
      elements.addExerciseBtn.addEventListener('click', () => ui.openExerciseModal());
      elements.closeModal.addEventListener('click', ui.closeExerciseModal);
      elements.exerciseForm.addEventListener('submit', handlers.handleFormSubmit);
      elements.exerciseImage.addEventListener('input', handlers.handleImageUrlChange);
      
      // Delete modal events
      elements.closeDeleteModal.addEventListener('click', ui.closeDeleteModal);
      elements.cancelDeleteBtn.addEventListener('click', ui.closeDeleteModal);
      elements.confirmDeleteBtn.addEventListener('click', handlers.handleDeleteExercise);
      
      // Reset modal events
      elements.resetDefaultBtn.addEventListener('click', ui.openResetModal);
      elements.closeResetModal.addEventListener('click', ui.closeResetModal);
      elements.cancelResetBtn.addEventListener('click', ui.closeResetModal);
      elements.confirmResetBtn.addEventListener('click', handlers.handleResetToDefault);
      
      // Import/Export
      elements.exportBtn.addEventListener('click', handlers.handleExportExercises);
      elements.importBtn.addEventListener('click', handlers.handleImportExercises);
      
      // Close modals when clicking outside
      elements.exerciseModal.addEventListener('click', (e) => {
        if (e.target === elements.exerciseModal) {
          ui.closeExerciseModal();
        }
      });
      
      elements.deleteModal.addEventListener('click', (e) => {
        if (e.target === elements.deleteModal) {
          ui.closeDeleteModal();
        }
      });
      
      elements.resetModal.addEventListener('click', (e) => {
        if (e.target === elements.resetModal) {
          ui.closeResetModal();
        }
      });
      
      console.log('Exercise Admin initialized successfully!');
    } catch (error) {
      console.error('Initialization error:', error);
      utils.showError('Failed to initialize the exercise admin. Please refresh the page.');
    }
  }
  
  // Start the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();