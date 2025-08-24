
class FrameCompositeGenerator {
    constructor() {
        this.selectedFrame = null;
        this.frameImage = null;
        this.productImages = [];
        this.processedImages = [];
        this.frameDetectionCanvas = document.createElement('canvas');
        this.frameDetectionCtx = this.frameDetectionCanvas.getContext('2d');
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadPrebuiltFrames().then(() => {
            this.initializeDefaultFrame();
        });
    }

    initializeElements() {
        this.frameSelect = document.getElementById('frameSelect');
        this.customFrameUpload = document.getElementById('customFrameUpload');
        this.frameInput = document.getElementById('frameInput');
        this.frameDropZone = document.getElementById('frameDropZone');
        this.frameCanvas = document.getElementById('frameCanvas');
        this.framePreview = document.getElementById('framePreview');
        
        this.productInput = document.getElementById('productInput');
        this.productDropZone = document.getElementById('productDropZone');
        this.productPreviews = document.getElementById('productPreviews');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.generateBtn = document.getElementById('generateBtn');
        this.processingProgress = document.getElementById('processingProgress');
        this.processingFill = document.getElementById('processingFill');
        this.processingText = document.getElementById('processingText');
        
        this.downloadZipBtn = document.getElementById('downloadZipBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.resultPreviews = document.getElementById('resultPreviews');
    }

    setupEventListeners() {
        // Frame selection
        this.frameSelect.addEventListener('change', this.handleFrameSelection.bind(this));
        this.frameInput.addEventListener('change', this.handleCustomFrameUpload.bind(this));
        this.frameDropZone.addEventListener('click', () => this.frameInput.click());
        this.setupDropZone(this.frameDropZone, this.handleCustomFrameUpload.bind(this));
        
        // Product images upload
        this.productInput.addEventListener('change', this.handleProductUpload.bind(this));
        this.productDropZone.addEventListener('click', () => this.productInput.click());
        this.setupDropZone(this.productDropZone, this.handleProductUpload.bind(this));
        
        // Generate button
        this.generateBtn.addEventListener('click', this.generateComposites.bind(this));
        
        // Download ZIP
        this.downloadZipBtn.addEventListener('click', this.downloadZip.bind(this));
        
        // Download All Individually
        this.downloadAllBtn.addEventListener('click', this.downloadAllIndividually.bind(this));
    }

    setupDropZone(dropZone, handler) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            handler({ target: { files } });
        });
    }

    async loadPrebuiltFrames() {
        // Load frames from actual PNG files
        this.prebuiltFrames = {
            r1: await this.loadFrameFromFile('/r1.png'),
            r2: await this.loadFrameFromFile('/r2.png')
        };
    }

    async loadFrameFromFile(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Convert image to blob for consistency with the rest of the code
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/png');
            };
            img.onerror = reject;
            img.src = path;
        });
    }

    async initializeDefaultFrame() {
        // Set r1 as default frame
        if (this.prebuiltFrames && this.prebuiltFrames.r1) {
            this.frameImage = await this.createImageFromBlob(this.prebuiltFrames.r1);
            this.showFramePreview(this.frameImage);
            this.activateStep(2);
            this.updateGenerateButton();
        }
    }

    async handleFrameSelection(e) {
        const value = e.target.value;
        
        if (value === 'custom') {
            this.customFrameUpload.style.display = 'block';
            this.frameImage = null;
            this.hideFramePreview();
        } else if (value === 'r1' || value === 'r2') {
            this.customFrameUpload.style.display = 'none';
            this.frameImage = await this.createImageFromBlob(this.prebuiltFrames[value]);
            this.showFramePreview(this.frameImage);
            this.activateStep(2);
        } else {
            this.customFrameUpload.style.display = 'none';
            this.frameImage = null;
            this.hideFramePreview();
        }
        
        this.updateGenerateButton();
    }

    async handleCustomFrameUpload(e) {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (this.isValidImageFile(file)) {
                this.frameImage = await this.loadImage(file);
                this.showFramePreview(this.frameImage);
                this.activateStep(2);
                this.updateGenerateButton();
            } else {
                alert('Please upload a valid image file (JPG, PNG, GIF)');
            }
        }
    }

    async handleProductUpload(e) {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => this.isValidImageFile(file));
        
        if (validFiles.length === 0) {
            alert('Please upload valid image files (JPG, PNG, GIF)');
            return;
        }
        
        this.showUploadProgress();
        
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const image = await this.loadImage(file);
            this.productImages.push({
                file: file,
                image: image,
                id: Date.now() + i
            });
            
            this.updateUploadProgress(i + 1, validFiles.length);
            this.addProductThumbnail(image, this.productImages[this.productImages.length - 1].id);
        }
        
        this.hideUploadProgress();
        this.activateStep(3);
        this.updateGenerateButton();
    }

    showUploadProgress() {
        this.uploadProgress.style.display = 'block';
    }

    hideUploadProgress() {
        setTimeout(() => {
            this.uploadProgress.style.display = 'none';
        }, 1000);
    }

    updateUploadProgress(current, total) {
        const percentage = (current / total) * 100;
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${current} of ${total} files uploaded`;
    }

    addProductThumbnail(image, id) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        thumbnail.dataset.id = id;
        
        const img = document.createElement('img');
        img.src = image.src;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => this.removeProductImage(id));
        
        thumbnail.appendChild(img);
        thumbnail.appendChild(removeBtn);
        this.productPreviews.appendChild(thumbnail);
    }

    removeProductImage(id) {
        this.productImages = this.productImages.filter(img => img.id !== id);
        const thumbnail = this.productPreviews.querySelector(`[data-id="${id}"]`);
        if (thumbnail) {
            thumbnail.remove();
        }
        this.updateGenerateButton();
    }

    async generateComposites() {
        if (!this.frameImage || this.productImages.length === 0) return;
        
        this.activateStep(4);
        this.showProcessingProgress();
        this.processedImages = [];
        
        // Detect frame area
        const frameArea = await this.detectFrameArea(this.frameImage);
        
        for (let i = 0; i < this.productImages.length; i++) {
            const productImage = this.productImages[i];
            const composite = await this.createComposite(this.frameImage, productImage.image, frameArea);
            
            this.processedImages.push({
                canvas: composite,
                name: `${i + 1}.png`,
                originalName: productImage.file.name
            });
            
            this.updateProcessingProgress(i + 1, this.productImages.length);
            this.addResultPreview(composite, `${i + 1}.png`);
        }
        
        this.hideProcessingProgress();
        this.downloadZipBtn.disabled = false;
        this.downloadAllBtn.disabled = false;
    }

    async detectFrameArea(frameImage) {
        // Simple frame area detection - find the transparent/empty area
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = frameImage.width;
        canvas.height = frameImage.height;
        
        ctx.drawImage(frameImage, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        
        // Find bounds of transparent/light areas (assuming frame has darker edges)
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                const alpha = data[i + 3];
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                
                // Consider transparent or very bright areas as the frame opening
                if (alpha < 50 || brightness > 200) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // Fallback to center area if detection fails
        if (minX >= maxX || minY >= maxY) {
            const padding = Math.min(canvas.width, canvas.height) * 0.2;
            minX = padding;
            minY = padding;
            maxX = canvas.width - padding;
            maxY = canvas.height - padding;
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    async createComposite(frameImage, productImage, frameArea) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = frameImage.width;
        canvas.height = frameImage.height;
        
        // Calculate product image dimensions to fit in frame area while maintaining aspect ratio
        const frameAspectRatio = frameArea.width / frameArea.height;
        const productAspectRatio = productImage.width / productImage.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (productAspectRatio > frameAspectRatio) {
            // Product is wider, fit to width
            drawWidth = frameArea.width;
            drawHeight = frameArea.width / productAspectRatio;
            drawX = frameArea.x;
            drawY = frameArea.y + (frameArea.height - drawHeight) / 2;
        } else {
            // Product is taller, fit to height
            drawHeight = frameArea.height;
            drawWidth = frameArea.height * productAspectRatio;
            drawX = frameArea.x + (frameArea.width - drawWidth) / 2;
            drawY = frameArea.y;
        }
        
        // Draw product image first
        ctx.drawImage(productImage, drawX, drawY, drawWidth, drawHeight);
        
        // Draw frame on top
        ctx.drawImage(frameImage, 0, 0);
        
        return canvas;
    }

    showProcessingProgress() {
        this.processingProgress.style.display = 'block';
    }

    hideProcessingProgress() {
        setTimeout(() => {
            this.processingProgress.style.display = 'none';
        }, 1000);
    }

    updateProcessingProgress(current, total) {
        const percentage = (current / total) * 100;
        this.processingFill.style.width = `${percentage}%`;
        this.processingText.textContent = `Processing image ${current} of ${total}...`;
    }

    addResultPreview(canvas, filename) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        
        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'download-individual';
        downloadBtn.textContent = `Download ${filename}`;
        downloadBtn.href = canvas.toDataURL('image/png');
        downloadBtn.download = filename;
        
        resultItem.appendChild(img);
        resultItem.appendChild(downloadBtn);
        this.resultPreviews.appendChild(resultItem);
    }

    async downloadZip() {
        // For simplicity, we'll create individual downloads since ZIP creation 
        // requires additional libraries. In a real implementation, you'd use JSZip
        for (let i = 0; i < this.processedImages.length; i++) {
            const processedImage = this.processedImages[i];
            const link = document.createElement('a');
            link.download = processedImage.name;
            link.href = processedImage.canvas.toDataURL('image/png');
            link.click();
            
            // Small delay between downloads
            if (i < this.processedImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    async downloadAllIndividually() {
        // Download all processed images individually with a small delay
        for (let i = 0; i < this.processedImages.length; i++) {
            const processedImage = this.processedImages[i];
            const link = document.createElement('a');
            link.download = processedImage.name;
            link.href = processedImage.canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Small delay between downloads to prevent browser blocking
            if (i < this.processedImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }

    // Utility methods
    isValidImageFile(file) {
        return file.type.startsWith('image/') && 
               ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    createImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                resolve(img);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    showFramePreview(image) {
        const ctx = this.frameCanvas.getContext('2d');
        const maxSize = 300;
        
        let { width, height } = image;
        if (width > height) {
            if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }
        
        this.frameCanvas.width = width;
        this.frameCanvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
        this.frameCanvas.style.display = 'block';
        
        const previewText = this.framePreview.querySelector('.preview-text');
        if (previewText) {
            previewText.style.display = 'none';
        }
    }

    hideFramePreview() {
        this.frameCanvas.style.display = 'none';
        const previewText = this.framePreview.querySelector('.preview-text');
        if (previewText) {
            previewText.style.display = 'block';
        }
    }

    activateStep(stepNumber) {
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index < stepNumber) {
                step.classList.add('active');
            }
        });
    }

    updateGenerateButton() {
        const hasFrame = this.frameImage !== null;
        const hasProducts = this.productImages.length > 0;
        this.generateBtn.disabled = !(hasFrame && hasProducts);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FrameCompositeGenerator();
});
