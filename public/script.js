class PDFConverter {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.selectedFile = null;
        this.textHistory = [];
        this.currentHistoryIndex = -1;
        this.bulkSelectMode = false;
        this.selectedFiles = new Set();
        this.currentFileBaseId = null;
        this.currentPdfPath = null;
        this.currentPdfSize = null;
        
        // Load archive on startup
        this.loadArchive();
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
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.editBtn = document.getElementById('editBtn');
        this.tableBtn = document.getElementById('tableBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.saveToArchiveBtn = document.getElementById('saveToArchiveBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadMenu = document.getElementById('downloadMenu');
        this.downloadTxt = document.getElementById('downloadTxt');
        this.downloadJson = document.getElementById('downloadJson');
        this.downloadExcel = document.getElementById('downloadExcel');
        this.newConversionBtn = document.getElementById('newConversionBtn');
        this.retryBtn = document.getElementById('retryBtn');
        this.toggleViewBtn = document.getElementById('toggleViewBtn');
        this.resultContainer = document.querySelector('.result-container');
        this.pdfPreview = document.getElementById('pdfPreview');
        this.pdfEmbed = document.getElementById('pdfEmbed');
        this.translateBtn = document.getElementById('translateBtn');
        this.hideTranslationBtn = document.getElementById('hideTranslationBtn');
        this.translationContent = document.getElementById('translationContent');
        this.translationText = document.getElementById('translationText');
        this.extractSection = document.getElementById('extractSection');
        this.extractBtn = document.getElementById('extractBtn');
        this.extractResults = document.getElementById('extractResults');
        this.keywordsContent = document.getElementById('keywordsContent');
        this.summaryContent = document.getElementById('summaryContent');
        this.editKeywordsBtn = document.getElementById('editKeywordsBtn');
        this.editSummaryBtn = document.getElementById('editSummaryBtn');
        this.keywordsEditContent = document.getElementById('keywordsEditContent');
        this.summaryEditContent = document.getElementById('summaryEditContent');
        this.keywordsInput = document.getElementById('keywordsInput');
        this.summaryInput = document.getElementById('summaryInput');
        this.saveKeywordsBtn = document.getElementById('saveKeywordsBtn');
        this.saveSummaryBtn = document.getElementById('saveSummaryBtn');
        this.cancelKeywordsBtn = document.getElementById('cancelKeywordsBtn');
        this.cancelSummaryBtn = document.getElementById('cancelSummaryBtn');
        this.archiveSection = document.getElementById('archiveSection');
        this.archiveList = document.getElementById('archiveList');
        this.refreshArchiveBtn = document.getElementById('refreshArchiveBtn');
        this.bulkSelectBtn = document.getElementById('bulkSelectBtn');
        this.bulkActions = document.getElementById('bulkActions');
        this.selectedCount = document.getElementById('selectedCount');
        this.selectAllBtn = document.getElementById('selectAllBtn');
        this.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        this.bulkFormatSelect = document.getElementById('bulkFormatSelect');
        this.bulkDownloadBtn = document.getElementById('bulkDownloadBtn');
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
        this.saveToArchiveBtn.addEventListener('click', () => this.saveToArchive());
        this.downloadBtn.addEventListener('click', () => this.toggleDownloadMenu());
        this.downloadTxt.addEventListener('click', () => this.downloadAsTxt());
        this.downloadJson.addEventListener('click', () => this.downloadAsJson());
        this.downloadExcel.addEventListener('click', () => this.downloadAsExcel());
        this.newConversionBtn.addEventListener('click', () => this.resetUI());
        this.retryBtn.addEventListener('click', () => this.resetUI());
        this.toggleViewBtn.addEventListener('click', () => this.toggleSideBySideView());
        this.translateBtn.addEventListener('click', () => this.translateText());
        this.hideTranslationBtn.addEventListener('click', () => this.hideTranslation());
        this.extractBtn.addEventListener('click', () => this.extractKeywordsAndSummary());
        this.editKeywordsBtn.addEventListener('click', () => this.editKeywords());
        this.editSummaryBtn.addEventListener('click', () => this.editSummary());
        this.saveKeywordsBtn.addEventListener('click', () => this.saveKeywords());
        this.saveSummaryBtn.addEventListener('click', () => this.saveSummary());
        this.cancelKeywordsBtn.addEventListener('click', () => this.cancelKeywordsEdit());
        this.cancelSummaryBtn.addEventListener('click', () => this.cancelSummaryEdit());
        this.refreshArchiveBtn.addEventListener('click', () => this.loadArchive());
        this.bulkSelectBtn.addEventListener('click', () => this.toggleBulkSelectMode());
        this.selectAllBtn.addEventListener('click', () => this.selectAllFiles());
        this.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        this.bulkDownloadBtn.addEventListener('click', () => this.bulkDownload());
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.download-dropdown')) {
                this.downloadMenu.style.display = 'none';
            }
        });
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
        this.clearExtractedContent();
        this.resultSection.style.display = 'block';
        this.resultText.value = result.content;
        
        // Store PDF information for saving to archive
        this.currentPdfPath = result.pdfPath || null;
        this.currentPdfSize = result.pdfSize || null;
        this.currentFileBaseId = null; // This is a new conversion, not a revision
        
        // Show translate button and extract section
        this.translateBtn.style.display = 'inline-block';
        this.extractSection.style.display = 'block';
        
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
        
        // Check if result contains page markers and show indicator
        const hasPageMarkers = result.content.includes('--- PAGE');
        if (hasPageMarkers) {
            const pageCount = (result.content.match(/--- PAGE \d+ ---/g) || []).length;
            this.showPageMarkerNotification(pageCount);
        }
        
        // Default to side-by-side view when conversion completes
        this.resultContainer.classList.add('side-by-side');
        this.toggleViewBtn.textContent = '📝 Text Only View';
        this.resultText.style.height = '70vh';
    }


    showError(message) {
        this.hideAllSections();
        this.errorSection.style.display = 'block';
        this.errorMessage.textContent = message;
    }

    showPageMarkerNotification(pageCount) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'page-marker-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">📄</span>
                <span class="notification-text">Document processed with ${pageCount} page${pageCount > 1 ? 's' : ''} • Page markers added for better chunking</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to result section
        this.resultSection.insertBefore(notification, this.resultSection.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    hideAllSections() {
        this.progressSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.errorSection.style.display = 'none';
    }

    clearExtractedContent() {
        // Clear keywords and summary
        this.extractedKeywords = null;
        this.extractedSummary = null;
        
        // Clear display
        this.keywordsContent.innerHTML = '';
        this.summaryContent.textContent = '';
        
        // Hide extract results
        this.extractResults.style.display = 'none';
        
        // Hide translation content
        this.translationContent.style.display = 'none';
        this.translationText.value = '';
        
        // Reset extract button
        this.extractBtn.textContent = '🔍 Extract Keywords & Summary';
        this.extractBtn.style.background = '#8b5cf6';
        this.extractBtn.style.color = 'white';
        this.extractBtn.disabled = false;
        
        // Reset translate button
        this.translateBtn.textContent = '🌐 Translate to Korean';
        this.translateBtn.style.background = '#3b82f6';
        this.translateBtn.style.color = 'white';
        this.translateBtn.disabled = false;
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

    toggleDownloadMenu() {
        const isVisible = this.downloadMenu.style.display === 'block';
        this.downloadMenu.style.display = isVisible ? 'none' : 'block';
    }

    downloadAsTxt() {
        const filename = this.selectedFile.name.replace('.pdf', '.txt');
        
        let content = this.resultText.value;
        
        // Add keywords and summary if they exist
        if (this.extractedKeywords && this.extractedKeywords.length > 0) {
            content += '\n\n' + '='.repeat(50);
            content += '\nKEYWORDS:\n';
            content += this.extractedKeywords.join(', ');
        }
        
        if (this.extractedSummary) {
            content += '\n\n' + '='.repeat(50);
            content += '\nSUMMARY:\n';
            content += this.extractedSummary;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        this.downloadFile(blob, filename);
        this.downloadMenu.style.display = 'none';
    }

    downloadAsJson() {
        const filename = this.selectedFile.name.replace('.pdf', '.json');
        
        const jsonData = {
            filename: this.selectedFile.name,
            convertedText: this.resultText.value,
            keywords: this.extractedKeywords || [],
            summary: this.extractedSummary || '',
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, filename);
        this.downloadMenu.style.display = 'none';
    }

    downloadAsExcel() {
        const filename = this.selectedFile.name.replace('.pdf', '.csv');
        
        // Create CSV content with proper escaping
        const csvContent = [
            ['Field', 'Content'],
            ['Original Filename', `"${this.selectedFile.name.replace(/"/g, '""')}"`],
            ['Converted Text', `"${this.resultText.value.replace(/"/g, '""')}"`],
            ['Keywords', `"${(this.extractedKeywords || []).join('; ').replace(/"/g, '""')}"`],
            ['Summary', `"${(this.extractedSummary || '').replace(/"/g, '""')}"`],
            ['Export Date', new Date().toLocaleDateString()]
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadFile(blob, filename);
        this.downloadMenu.style.display = 'none';
    }

    downloadFile(blob, filename) {
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

    async translateText() {
        const textToTranslate = this.resultText.value;
        if (!textToTranslate.trim()) {
            alert('No text to translate.');
            return;
        }

        // Show loading state
        const originalText = this.translateBtn.textContent;
        this.translateBtn.textContent = '🤖 Translating...';
        this.translateBtn.disabled = true;

        try {
            const response = await fetch('/translate-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    text: textToTranslate,
                    targetLanguage: 'Korean'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Show translation
                this.translationText.value = result.translatedText;
                this.translationContent.style.display = 'block';
                
                // Update button text
                this.translateBtn.textContent = '✅ Translated!';
                this.translateBtn.style.background = '#10b981';
                this.translateBtn.style.color = 'white';
                
                setTimeout(() => {
                    this.translateBtn.textContent = '🔄 Re-translate';
                    this.translateBtn.style.background = '#3b82f6';
                    this.translateBtn.style.color = 'white';
                    this.translateBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to translate text');
            }
            
        } catch (error) {
            console.error('Translation error:', error);
            alert(`Could not translate text: ${error.message}`);
            
            // Reset button
            this.translateBtn.textContent = originalText;
            this.translateBtn.disabled = false;
        }
    }

    hideTranslation() {
        this.translationContent.style.display = 'none';
        this.translationText.value = '';
    }

    async extractKeywordsAndSummary() {
        const textToAnalyze = this.resultText.value;
        if (!textToAnalyze.trim()) {
            alert('No text to analyze.');
            return;
        }

        // Show loading state
        const originalText = this.extractBtn.textContent;
        this.extractBtn.textContent = '🤖 Extracting...';
        this.extractBtn.disabled = true;

        try {
            const response = await fetch('/extract-keywords-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    text: textToAnalyze
                })
            });

            const result = await response.json();

            if (result.success) {
                // Show results
                this.displayKeywords(result.keywords);
                this.displaySummary(result.summary);
                this.extractResults.style.display = 'block';
                
                // Store for download
                this.extractedKeywords = result.keywords;
                this.extractedSummary = result.summary;
                
                // Update button text
                this.extractBtn.textContent = '✅ Extracted!';
                this.extractBtn.style.background = '#10b981';
                this.extractBtn.style.color = 'white';
                
                setTimeout(() => {
                    this.extractBtn.textContent = '🔄 Re-extract';
                    this.extractBtn.style.background = '#8b5cf6';
                    this.extractBtn.style.color = 'white';
                    this.extractBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to extract keywords and summary');
            }
            
        } catch (error) {
            console.error('Extraction error:', error);
            alert(`Could not extract keywords and summary: ${error.message}`);
            
            // Reset button
            this.extractBtn.textContent = originalText;
            this.extractBtn.disabled = false;
            this.extractBtn.style.background = '#8b5cf6';
            this.extractBtn.style.color = 'white';
        }
    }

    displayKeywords(keywords) {
        this.keywordsContent.innerHTML = '';
        keywords.forEach(keyword => {
            const keywordTag = document.createElement('span');
            keywordTag.className = 'keyword-tag';
            keywordTag.textContent = keyword;
            this.keywordsContent.appendChild(keywordTag);
        });
    }

    displaySummary(summary) {
        this.summaryContent.textContent = summary;
    }

    editKeywords() {
        // Convert current keywords to comma-separated string
        const keywordsList = this.extractedKeywords ? this.extractedKeywords.join(', ') : '';
        this.keywordsInput.value = keywordsList;
        
        // Show edit mode
        this.keywordsContent.style.display = 'none';
        this.keywordsEditContent.style.display = 'block';
        this.editKeywordsBtn.textContent = 'Editing...';
        this.editKeywordsBtn.disabled = true;
        
        // Focus on input
        this.keywordsInput.focus();
    }

    editSummary() {
        // Set current summary text
        this.summaryInput.value = this.extractedSummary || '';
        
        // Show edit mode
        this.summaryContent.style.display = 'none';
        this.summaryEditContent.style.display = 'block';
        this.editSummaryBtn.textContent = 'Editing...';
        this.editSummaryBtn.disabled = true;
        
        // Focus on textarea
        this.summaryInput.focus();
    }

    saveKeywords() {
        const keywordsString = this.keywordsInput.value.trim();
        if (!keywordsString) {
            alert('Please enter some keywords');
            return;
        }
        
        // Convert comma-separated string to array and clean up
        const newKeywords = keywordsString
            .split(',')
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0);
        
        // Update stored keywords
        this.extractedKeywords = newKeywords;
        
        // Update display
        this.displayKeywords(newKeywords);
        
        // Hide edit mode
        this.keywordsEditContent.style.display = 'none';
        this.keywordsContent.style.display = 'flex';
        this.editKeywordsBtn.textContent = '✏️ Edit';
        this.editKeywordsBtn.disabled = false;
        
        // Show save confirmation
        const originalText = this.editKeywordsBtn.textContent;
        this.editKeywordsBtn.textContent = '✅ Saved!';
        this.editKeywordsBtn.style.background = '#10b981';
        this.editKeywordsBtn.style.color = 'white';
        
        setTimeout(() => {
            this.editKeywordsBtn.textContent = originalText;
            this.editKeywordsBtn.style.background = '#f3f4f6';
            this.editKeywordsBtn.style.color = '#6b7280';
        }, 2000);
    }

    saveSummary() {
        const summaryText = this.summaryInput.value.trim();
        if (!summaryText) {
            alert('Please enter a summary');
            return;
        }
        
        // Update stored summary
        this.extractedSummary = summaryText;
        
        // Update display
        this.displaySummary(summaryText);
        
        // Hide edit mode
        this.summaryEditContent.style.display = 'none';
        this.summaryContent.style.display = 'block';
        this.editSummaryBtn.textContent = '✏️ Edit';
        this.editSummaryBtn.disabled = false;
        
        // Show save confirmation
        const originalText = this.editSummaryBtn.textContent;
        this.editSummaryBtn.textContent = '✅ Saved!';
        this.editSummaryBtn.style.background = '#10b981';
        this.editSummaryBtn.style.color = 'white';
        
        setTimeout(() => {
            this.editSummaryBtn.textContent = originalText;
            this.editSummaryBtn.style.background = '#f3f4f6';
            this.editSummaryBtn.style.color = '#6b7280';
        }, 2000);
    }

    cancelKeywordsEdit() {
        // Hide edit mode without saving
        this.keywordsEditContent.style.display = 'none';
        this.keywordsContent.style.display = 'flex';
        this.editKeywordsBtn.textContent = '✏️ Edit';
        this.editKeywordsBtn.disabled = false;
        this.editKeywordsBtn.style.background = '#f3f4f6';
        this.editKeywordsBtn.style.color = '#6b7280';
    }

    cancelSummaryEdit() {
        // Hide edit mode without saving
        this.summaryEditContent.style.display = 'none';
        this.summaryContent.style.display = 'block';
        this.editSummaryBtn.textContent = '✏️ Edit';
        this.editSummaryBtn.disabled = false;
        this.editSummaryBtn.style.background = '#f3f4f6';
        this.editSummaryBtn.style.color = '#6b7280';
    }

    async saveToArchive() {
        if (!this.selectedFile || !this.resultText.value) {
            alert('No converted text to save');
            return;
        }

        // Show loading state
        const originalText = this.saveToArchiveBtn.textContent;
        this.saveToArchiveBtn.textContent = '💾 Saving...';
        this.saveToArchiveBtn.disabled = true;

        try {
            const response = await fetch('/save-converted-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    originalFilename: this.selectedFile.name,
                    convertedText: this.resultText.value,
                    keywords: this.extractedKeywords || [],
                    summary: this.extractedSummary || '',
                    pdfPath: this.currentPdfPath,
                    pdfSize: this.currentPdfSize,
                    baseId: this.currentFileBaseId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Show success feedback
                this.saveToArchiveBtn.textContent = '✅ Saved!';
                this.saveToArchiveBtn.style.background = '#10b981';
                this.saveToArchiveBtn.style.color = 'white';
                
                // Reload archive to show the new file
                await this.loadArchive();
                
                setTimeout(() => {
                    this.saveToArchiveBtn.textContent = originalText;
                    this.saveToArchiveBtn.style.background = '#f3f4f6';
                    this.saveToArchiveBtn.style.color = 'inherit';
                    this.saveToArchiveBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to save file');
            }
        } catch (error) {
            console.error('Error saving to archive:', error);
            alert(`Could not save file: ${error.message}`);
            
            // Reset button
            this.saveToArchiveBtn.textContent = originalText;
            this.saveToArchiveBtn.disabled = false;
        }
    }

    async loadArchive() {
        try {
            this.archiveList.innerHTML = '<div class="archive-loading">Loading converted files...</div>';
            
            const response = await fetch('/archive');
            const result = await response.json();

            if (result.success) {
                this.displayArchiveList(result.files);
            } else {
                throw new Error(result.error || 'Failed to load archive');
            }
        } catch (error) {
            console.error('Error loading archive:', error);
            this.archiveList.innerHTML = '<div class="archive-empty">Failed to load converted files</div>';
        }
    }

    displayArchiveList(files) {
        if (!files || files.length === 0) {
            this.archiveList.innerHTML = '<div class="archive-empty">No converted files yet. Convert a PDF to get started!</div>';
            return;
        }

        const archiveHTML = files.map(file => {
            const convertedDate = new Date(file.convertedAt).toLocaleDateString();
            const fileSize = this.formatFileSize(file.fileSize);
            const features = [];
            
            if (file.hasKeywords) features.push('<span class="feature-tag">Keywords</span>');
            if (file.hasSummary) features.push('<span class="feature-tag">Summary</span>');
            if (file.hasPdf) features.push('<span class="pdf-tag">PDF</span>');
            if (file.revision && file.revision > 1) features.push(`<span class="revision-tag">Rev ${file.revision}</span>`);

            const checkbox = this.bulkSelectMode ? 
                `<input type="checkbox" class="archive-checkbox" data-file-id="${file.id}" onchange="pdfConverter.updateFileSelection('${file.id}', this.checked)">` : '';

            const itemClass = this.bulkSelectMode ? 'archive-item selectable' : 'archive-item';

            return `
                <div class="${itemClass}" data-file-id="${file.id}">
                    ${checkbox}
                    <div class="archive-item-info">
                        <div class="archive-filename" title="${file.originalFilename}">${file.originalFilename}</div>
                        <div class="archive-metadata">
                            <div class="archive-date">📅 ${convertedDate}</div>
                            <div class="archive-size">📊 ${fileSize}</div>
                            <div class="archive-features">${features.join('')}</div>
                        </div>
                    </div>
                    <div class="archive-actions">
                        <button class="archive-btn view-btn" onclick="pdfConverter.viewArchivedFile('${file.id}')">👁️ View</button>
                        <button class="archive-btn delete-btn" onclick="pdfConverter.deleteArchivedFile('${file.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        this.archiveList.innerHTML = archiveHTML;
    }

    async viewArchivedFile(fileId) {
        try {
            const response = await fetch(`/archive/${fileId}`);
            const result = await response.json();

            if (result.success) {
                const file = result.file;
                
                // Clear any existing content first
                this.clearExtractedContent();
                
                // Set the result text
                this.resultText.value = file.convertedText;
                
                // Set keywords and summary if available
                if (file.keywords && file.keywords.length > 0) {
                    this.extractedKeywords = file.keywords;
                    this.displayKeywords(file.keywords);
                }
                
                if (file.summary) {
                    this.extractedSummary = file.summary;
                    this.displaySummary(file.summary);
                }
                
                // Store file information for potential revision saving
                this.currentFileBaseId = file.baseId;
                this.currentPdfPath = file.pdfPath;
                this.currentPdfSize = file.pdfSize;
                
                // Show relevant sections
                this.hideAllSections();
                this.resultSection.style.display = 'block';
                this.translateBtn.style.display = 'inline-block';
                this.extractSection.style.display = 'block';
                
                if (file.keywords.length > 0 || file.summary) {
                    this.extractResults.style.display = 'block';
                }
                
                // Set up PDF preview if available
                if (file.pdfPath) {
                    this.pdfEmbed.src = `/archive/${fileId}/pdf`;
                }
                
                // Set a mock selected file for downloads
                this.selectedFile = { name: file.originalFilename };
                
                // Default to side-by-side view
                this.resultContainer.classList.add('side-by-side');
                this.toggleViewBtn.textContent = '📝 Text Only View';
                this.resultText.style.height = '70vh';
                
            } else {
                throw new Error(result.error || 'Failed to load archived file');
            }
        } catch (error) {
            console.error('Error viewing archived file:', error);
            alert(`Could not load file: ${error.message}`);
        }
    }

    async deleteArchivedFile(fileId) {
        if (!confirm('Are you sure you want to delete this converted file? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/archive/${fileId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                // Reload archive to remove the deleted file
                await this.loadArchive();
            } else {
                throw new Error(result.error || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Error deleting archived file:', error);
            alert(`Could not delete file: ${error.message}`);
        }
    }

    toggleBulkSelectMode() {
        this.bulkSelectMode = !this.bulkSelectMode;
        this.selectedFiles.clear();
        
        if (this.bulkSelectMode) {
            this.bulkSelectBtn.textContent = '❌ Cancel Selection';
            this.bulkActions.style.display = 'block';
        } else {
            this.bulkSelectBtn.textContent = '☑️ Select Files';
            this.bulkActions.style.display = 'none';
        }
        
        this.updateSelectedCount();
        this.loadArchive(); // Refresh to show/hide checkboxes
    }

    updateFileSelection(fileId, isSelected) {
        if (isSelected) {
            this.selectedFiles.add(fileId);
        } else {
            this.selectedFiles.delete(fileId);
        }
        
        this.updateSelectedCount();
        this.updateBulkDownloadButton();
        
        // Update visual selection state
        const item = document.querySelector(`[data-file-id="${fileId}"]`);
        if (item) {
            item.classList.toggle('selected', isSelected);
        }
    }

    selectAllFiles() {
        const checkboxes = document.querySelectorAll('.archive-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedFiles.add(checkbox.dataset.fileId);
            const item = document.querySelector(`[data-file-id="${checkbox.dataset.fileId}"]`);
            if (item) item.classList.add('selected');
        });
        
        this.updateSelectedCount();
        this.updateBulkDownloadButton();
    }

    clearSelection() {
        const checkboxes = document.querySelectorAll('.archive-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const item = document.querySelector(`[data-file-id="${checkbox.dataset.fileId}"]`);
            if (item) item.classList.remove('selected');
        });
        
        this.selectedFiles.clear();
        this.updateSelectedCount();
        this.updateBulkDownloadButton();
    }

    updateSelectedCount() {
        const count = this.selectedFiles.size;
        this.selectedCount.textContent = `${count} files selected`;
    }

    updateBulkDownloadButton() {
        this.bulkDownloadBtn.disabled = this.selectedFiles.size === 0;
    }

    async bulkDownload() {
        if (this.selectedFiles.size === 0) {
            alert('Please select files to download');
            return;
        }

        const format = this.bulkFormatSelect.value;
        const fileIds = Array.from(this.selectedFiles);

        // Show loading state
        const originalText = this.bulkDownloadBtn.textContent;
        this.bulkDownloadBtn.textContent = '📥 Preparing...';
        this.bulkDownloadBtn.disabled = true;

        try {
            const response = await fetch('/archive/bulk-download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileIds: fileIds,
                    format: format
                })
            });

            if (response.ok) {
                // Create download
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `bulk-download.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Show success feedback
                this.bulkDownloadBtn.textContent = '✅ Downloaded!';
                this.bulkDownloadBtn.style.background = '#10b981';
                
                setTimeout(() => {
                    this.bulkDownloadBtn.textContent = originalText;
                    this.bulkDownloadBtn.style.background = '#059669';
                    this.bulkDownloadBtn.disabled = false;
                }, 2000);
            } else {
                const result = await response.json();
                throw new Error(result.error || 'Failed to create bulk download');
            }
        } catch (error) {
            console.error('Error with bulk download:', error);
            alert(`Could not download files: ${error.message}`);
            
            // Reset button
            this.bulkDownloadBtn.textContent = originalText;
            this.bulkDownloadBtn.disabled = false;
        }
    }

    resetUI() {
        this.hideAllSections();
        this.selectedFile = null;
        this.fileInput.value = '';
        this.convertBtn.disabled = true;
        this.uploadArea.classList.remove('file-selected');
        
        // Hide translation button and content
        this.translateBtn.style.display = 'none';
        this.translationContent.style.display = 'none';
        this.translationText.value = '';
        
        // Hide extract section and reset
        this.extractSection.style.display = 'none';
        this.extractResults.style.display = 'none';
        this.extractedKeywords = null;
        this.extractedSummary = null;
        
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
let pdfConverter;
document.addEventListener('DOMContentLoaded', () => {
    pdfConverter = new PDFConverter();
});