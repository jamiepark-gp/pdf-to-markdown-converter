class PDFConverter {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.selectedFile = null;
        this.textHistory = [];
        this.currentHistoryIndex = -1;
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultSection = document.getElementById('resultSection');
        this.resultText = document.getElementById('resultText');
        this.metadataSection = document.getElementById('metadataSection');
        this.metadataContent = document.getElementById('metadataContent');
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.editBtn = document.getElementById('editBtn');
        this.tableBtn = document.getElementById('tableBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newConversionBtn = document.getElementById('newConversionBtn');
        this.retryBtn = document.getElementById('retryBtn');
        this.includeMetadata = document.getElementById('includeMetadata');
        this.toggleViewBtn = document.getElementById('toggleViewBtn');
        this.resultContainer = document.querySelector('.result-container');
        this.pdfPreview = document.getElementById('pdfPreview');
        this.pdfEmbed = document.getElementById('pdfEmbed');
    }

    attachEventListeners() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Button events
        this.convertBtn.addEventListener('click', () => this.convertFile());
        this.editBtn.addEventListener('click', () => this.toggleEditMode());
        this.tableBtn.addEventListener('click', () => this.convertSelectionToTable());
        this.undoBtn.addEventListener('click', () => this.undoTextChange());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.downloadBtn.addEventListener('click', () => this.downloadResult());
        this.newConversionBtn.addEventListener('click', () => this.resetUI());
        this.retryBtn.addEventListener('click', () => this.resetUI());
        this.toggleViewBtn.addEventListener('click', () => this.toggleSideBySideView());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!this.validateFile(file)) {
            return;
        }

        this.selectedFile = file;
        this.updateUploadAreaUI(file);
        this.convertBtn.disabled = false;
    }

    validateFile(file) {
        if (file.type !== 'application/pdf') {
            this.showError('Please select a PDF file.');
            return false;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            this.showError('File size must be less than 50MB.');
            return false;
        }

        return true;
    }

    updateUploadAreaUI(file) {
        this.uploadArea.classList.add('file-selected');
        const uploadContent = this.uploadArea.querySelector('.upload-content');
        uploadContent.innerHTML = `
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3>✅ ${file.name}</h3>
            <p>File selected • ${this.formatFileSize(file.size)}</p>
            <small>Click to select a different file</small>
        `;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async convertFile() {
        if (!this.selectedFile) return;

        this.showProgress();
        
        const formData = new FormData();
        formData.append('pdf', this.selectedFile);
        
        const outputFormat = document.querySelector('input[name="outputFormat"]:checked').value;
        formData.append('outputFormat', outputFormat);
        formData.append('includeMetadata', this.includeMetadata.checked.toString());

        try {
            // Simulate progress
            this.updateProgress(20, 'Uploading file...');
            
            const response = await fetch('/convert-pdf', {
                method: 'POST',
                body: formData
            });

            this.updateProgress(60, 'Processing with Upstage API...');
            
            const result = await response.json();
            
            this.updateProgress(100, 'Conversion complete!');
            
            setTimeout(() => {
                if (result.success) {
                    this.showResult(result);
                } else {
                    this.showError(result.error || 'Conversion failed');
                }
            }, 500);

        } catch (error) {
            console.error('Error:', error);
            this.showError('Network error. Please check your connection and try again.');
        }
    }

    showProgress() {
        this.hideAllSections();
        this.progressSection.style.display = 'block';
        this.updateProgress(0, 'Preparing...');
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = text;
    }

    showResult(result) {
        this.hideAllSections();
        this.resultSection.style.display = 'block';
        this.resultText.value = result.content;
        
        // Initialize text history with the original converted text
        this.textHistory = [result.content];
        this.currentHistoryIndex = 0;
        this.updateUndoButton();
        
        // Set up PDF preview with the uploaded file (hide thumbnail pane)
        if (this.selectedFile) {
            const fileURL = URL.createObjectURL(this.selectedFile);
            // Add parameters to hide thumbnail navigation and toolbar
            this.pdfEmbed.src = fileURL + '#toolbar=0&navpanes=0&scrollbar=1';
        }
        
        // Default to side-by-side view when conversion completes
        this.resultContainer.classList.add('side-by-side');
        this.toggleViewBtn.textContent = '📝 Text Only View';
        this.resultText.style.height = '70vh';
        
        if (result.metadata && this.includeMetadata.checked) {
            this.showMetadata(result.metadata);
        }
    }

    showMetadata(metadata) {
        this.metadataSection.style.display = 'block';
        this.metadataContent.innerHTML = '';
        
        Object.entries(metadata).forEach(([key, value]) => {
            const item = document.createElement('div');
            item.className = 'metadata-item';
            item.innerHTML = `
                <span class="metadata-label">${this.formatMetadataKey(key)}:</span>
                <span class="metadata-value">${value}</span>
            `;
            this.metadataContent.appendChild(item);
        });
    }

    formatMetadataKey(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }

    showError(message) {
        this.hideAllSections();
        this.errorSection.style.display = 'block';
        this.errorMessage.textContent = message;
    }

    hideAllSections() {
        this.progressSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.errorSection.style.display = 'none';
        this.metadataSection.style.display = 'none';
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.resultText.value);
            
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '✅ Copied!';
            this.copyBtn.style.background = '#10b981';
            this.copyBtn.style.color = 'white';
            
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
                this.copyBtn.style.background = '#f3f4f6';
                this.copyBtn.style.color = 'inherit';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showError('Failed to copy to clipboard');
        }
    }

    downloadResult() {
        const filename = this.selectedFile.name.replace('.pdf', '.txt');
        
        const blob = new Blob([this.resultText.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    toggleEditMode() {
        const isReadOnly = this.resultText.hasAttribute('readonly');
        
        if (isReadOnly) {
            // Enable editing
            this.resultText.removeAttribute('readonly');
            this.editBtn.textContent = '💾 Save';
            this.resultText.focus();
            
            // Set cursor to the beginning of the text
            this.resultText.setSelectionRange(0, 0);
            this.resultText.scrollTop = 0;
            
            // Show table and undo buttons in edit mode
            this.tableBtn.style.display = 'inline-block';
            this.undoBtn.style.display = 'inline-block';
            
            // Add text change listener for history tracking
            this.textChangeTimeout = null;
            this.resultText.addEventListener('input', () => {
                clearTimeout(this.textChangeTimeout);
                this.textChangeTimeout = setTimeout(() => {
                    this.saveToHistory(this.resultText.value);
                }, 1000); // Save to history 1 second after user stops typing
            });
            
            // Show editing indicator
            const title = document.querySelector('.result-content h4');
            if (title) {
                title.textContent = '✏️ Editing Text (Select text and click "📊 To Table" to convert)';
            }
        } else {
            // Save and disable editing
            this.resultText.setAttribute('readonly', true);
            this.editBtn.textContent = '✏️ Edit';
            
            // Hide table and undo buttons when not editing
            this.tableBtn.style.display = 'none';
            this.undoBtn.style.display = 'none';
            
            // Clear text change timeout
            if (this.textChangeTimeout) {
                clearTimeout(this.textChangeTimeout);
                this.textChangeTimeout = null;
            }
            
            // Reset title
            const title = document.querySelector('.result-content h4');
            if (title) {
                title.textContent = '📝 Converted Text';
            }
            
            // Show save confirmation
            const originalText = this.editBtn.textContent;
            this.editBtn.textContent = '✅ Saved!';
            this.editBtn.style.background = '#10b981';
            this.editBtn.style.color = 'white';
            
            setTimeout(() => {
                this.editBtn.textContent = originalText;
                this.editBtn.style.background = '#f3f4f6';
                this.editBtn.style.color = 'inherit';
            }, 2000);
        }
    }

    async convertSelectionToTable() {
        const textarea = this.resultText;
        const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        
        if (!selectedText.trim()) {
            alert('Please select some text to convert to a table.');
            return;
        }

        // Show loading state
        const originalText = this.tableBtn.textContent;
        this.tableBtn.textContent = '🤖 Converting...';
        this.tableBtn.disabled = true;

        try {
            const response = await fetch('/convert-to-table', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: selectedText })
            });

            const result = await response.json();

            if (result.success) {
                // Replace selected text with the markdown table
                const beforeSelection = textarea.value.substring(0, textarea.selectionStart);
                const afterSelection = textarea.value.substring(textarea.selectionEnd);
                
                textarea.value = beforeSelection + result.table + afterSelection;
                
                // Save the new text to history after table conversion
                this.saveToHistory(textarea.value);
                
                // Show success feedback
                this.tableBtn.textContent = '✅ Converted!';
                this.tableBtn.style.background = '#10b981';
                this.tableBtn.style.color = 'white';
                
                setTimeout(() => {
                    this.tableBtn.textContent = originalText;
                    this.tableBtn.style.background = '#f3f4f6';
                    this.tableBtn.style.color = 'inherit';
                    this.tableBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to convert to table');
            }
            
        } catch (error) {
            console.error('Table conversion error:', error);
            alert(`Could not convert selected text to table: ${error.message}`);
            
            // Reset button
            this.tableBtn.textContent = originalText;
            this.tableBtn.disabled = false;
        }
    }

    saveToHistory(text) {
        // Remove any history after current index (if user did undo then made changes)
        this.textHistory = this.textHistory.slice(0, this.currentHistoryIndex + 1);
        
        // Add new state to history
        this.textHistory.push(text);
        this.currentHistoryIndex = this.textHistory.length - 1;
        
        // Limit history to 50 items to prevent memory issues
        if (this.textHistory.length > 50) {
            this.textHistory.shift();
            this.currentHistoryIndex--;
        }
        
        // Update undo button state
        this.updateUndoButton();
    }

    updateUndoButton() {
        const canUndo = this.currentHistoryIndex > 0;
        this.undoBtn.disabled = !canUndo;
        this.undoBtn.style.opacity = canUndo ? '1' : '0.5';
    }

    undoTextChange() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            const previousText = this.textHistory[this.currentHistoryIndex];
            this.resultText.value = previousText;
            this.updateUndoButton();
            
            // Show undo feedback
            const originalText = this.undoBtn.textContent;
            this.undoBtn.textContent = '✅ Undone!';
            this.undoBtn.style.background = '#10b981';
            this.undoBtn.style.color = 'white';
            
            setTimeout(() => {
                this.undoBtn.textContent = originalText;
                this.undoBtn.style.background = '#f3f4f6';
                this.undoBtn.style.color = 'inherit';
            }, 1500);
        }
    }

    toggleSideBySideView() {
        const isCurrentlySideBySide = this.resultContainer.classList.contains('side-by-side');
        
        if (isCurrentlySideBySide) {
            // Switch to single view
            this.resultContainer.classList.remove('side-by-side');
            this.toggleViewBtn.textContent = '👀 Side-by-Side View';
            this.resultText.style.height = '70vh';
        } else {
            // Switch to side-by-side view
            this.resultContainer.classList.add('side-by-side');
            this.toggleViewBtn.textContent = '📝 Text Only View';
            this.resultText.style.height = '70vh';
        }
    }

    resetUI() {
        this.hideAllSections();
        this.selectedFile = null;
        this.fileInput.value = '';
        this.convertBtn.disabled = true;
        this.uploadArea.classList.remove('file-selected');
        
        // Clean up PDF preview
        if (this.pdfEmbed.src) {
            URL.revokeObjectURL(this.pdfEmbed.src);
            this.pdfEmbed.src = '';
        }
        
        // Reset to single view
        this.resultContainer.classList.remove('side-by-side');
        this.toggleViewBtn.textContent = '👀 Side-by-Side View';
        
        // Reset upload area content
        const uploadContent = this.uploadArea.querySelector('.upload-content');
        uploadContent.innerHTML = `
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3>Drop your PDF here</h3>
            <p>or <span class="upload-link">browse files</span></p>
            <small>Maximum file size: 50MB</small>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PDFConverter();
});