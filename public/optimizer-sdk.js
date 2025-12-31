const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('image');
const fileNamesDiv = document.getElementById('file-names');
const sizeOption = document.getElementById('sizeOption');
const dimensionInputs = document.getElementById('dimensionInputs');
const customWidth = document.getElementById('customWidth');
const customHeight = document.getElementById('customHeight');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const optimizeBtn = document.getElementById('optimize-btn');
const originalPreviewContainer = document.getElementById('originalPreviewContainer');
const optimizedPreviewContainer = document.getElementById('optimizedPreviewContainer');
const noPreview = document.getElementById('noPreview');
const originalPreview = document.getElementById('originalPreview');
const optimizedPreview = document.getElementById('optimizedPreview');
const originalInfo = document.getElementById('originalInfo');
const optimizedInfo = document.getElementById('optimizedInfo');
const loader = document.getElementById('loader');
const loaderOverlay = document.getElementById('loaderOverlay');

let droppedFiles = [];
let currentImage = null;
let originalAspectRatio = 1;
let originalFileSize = 0;

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('hover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('hover'), false);
});

dropArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    droppedFiles = Array.from(dt.files);
    fileInput.files = dt.files;
    displayFileNames();
    loadPreview();
}

fileInput.addEventListener('change', () => {
    droppedFiles = Array.from(fileInput.files);
    displayFileNames();
    loadPreview();
});

function displayFileNames() {
    fileNamesDiv.innerHTML = '';
    if (droppedFiles.length > 0) {
        droppedFiles.forEach(file => {
            const p = document.createElement('p');
            p.textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
            fileNamesDiv.appendChild(p);
        });
        optimizeBtn.disabled = false;
        optimizeBtn.textContent = droppedFiles.length === 1 ? 'Optimize Image' : `Optimize ${droppedFiles.length} Images`;
    }
}

function loadPreview() {
    if (droppedFiles.length === 0) return;

    const file = droppedFiles[0];
    originalFileSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            originalAspectRatio = img.width / img.height;
            originalPreview.src = e.target.result;
            originalInfo.textContent = `${img.width} × ${img.height} | ${formatFileSize(file.size)}`;

            // Add spacing to upload section when preview is shown
            const uploadSection = document.getElementById('uploadSection');
            uploadSection.style.marginTop = '2rem';

            // Show preview containers and hide placeholder
            originalPreviewContainer.classList.add('active');
            optimizedPreviewContainer.classList.add('active');
            noPreview.style.display = 'none';
            document.getElementById('settingsDivider').style.display = 'block';
            document.getElementById('settingsTitle').style.display = 'block';

            updateOptimizedPreview();
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

async function updateOptimizedPreview() {
    if (!currentImage) return;

    const fileType = document.getElementById('fileType').value;
    const quality = parseInt(qualitySlider.value) / 100;
    const sizeOpt = sizeOption.value;

    let targetWidth = currentImage.width;
    let targetHeight = currentImage.height;

    if (sizeOpt === 'custom' && customWidth.value) {
        targetWidth = parseInt(customWidth.value);
        targetHeight = Math.round(targetWidth / originalAspectRatio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(currentImage, 0, 0, targetWidth, targetHeight);

    const mimeType = fileType === 'webp' ? 'image/webp' : fileType === 'png' ? 'image/png' : 'image/jpeg';

    canvas.toBlob((blob) => {
        if (blob) {
            const url = URL.createObjectURL(blob);
            optimizedPreview.src = url;

            // Update file size with color coding
            const optimizedSize = blob.size;
            const compressionRatio = optimizedSize / originalFileSize;
            const sizeInKB = optimizedSize / 1024;

            optimizedInfo.textContent = `${targetWidth} × ${targetHeight} | ${formatFileSize(blob.size)}`;

            // Remove existing classes
            optimizedInfo.classList.remove('size-increase', 'size-excellent');

            // Color code based on size
            if (optimizedSize > originalFileSize) {
                // Size increased - red
                optimizedInfo.classList.add('size-increase');
            } else if (compressionRatio < 0.5 || sizeInKB < 20) {
                // Compressed to under 50% or under 20KB - green
                optimizedInfo.classList.add('size-excellent');
            }
        }
    }, mimeType, quality);
}

// Size option change
sizeOption.addEventListener('change', () => {
    if (sizeOption.value === 'custom') {
        dimensionInputs.classList.add('active');
    } else {
        dimensionInputs.classList.remove('active');
    }
    updateOptimizedPreview();
});

// Custom width change
customWidth.addEventListener('input', () => {
    if (customWidth.value && originalAspectRatio) {
        const height = Math.round(parseInt(customWidth.value) / originalAspectRatio);
        customHeight.value = height;
        updateOptimizedPreview();
    }
});

// Quality slider
qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
    updateOptimizedPreview();
});

// Optimize button
optimizeBtn.addEventListener('click', async () => {
    if (droppedFiles.length === 0) return;

    const fileType = document.getElementById('fileType').value;
    const quality = parseInt(qualitySlider.value) / 100;
    const sizeOpt = sizeOption.value;

    loader.classList.add('active');
    loaderOverlay.classList.add('active');

    try {
        if (droppedFiles.length === 1) {
            const optimizedFile = await optimizeImage(droppedFiles[0], sizeOpt, quality, fileType);
            downloadFile(optimizedFile, generateFileName(droppedFiles[0].name, fileType));
        } else {
            const zip = new JSZip();

            for (let i = 0; i < droppedFiles.length; i++) {
                const file = droppedFiles[i];
                const optimizedFile = await optimizeImage(file, sizeOpt, quality, fileType);
                const fileName = generateFileName(file.name, fileType);
                zip.file(fileName, optimizedFile);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            downloadFile(zipBlob, 'optimized-images.zip');
        }
    } catch (error) {
        console.error('Error optimizing images:', error);
        alert('Error optimizing images. Please try again.');
    } finally {
        loader.classList.remove('active');
        loaderOverlay.classList.remove('active');
    }
});

async function optimizeImage(file, sizeOpt, quality, outputFormat) {
    return new Promise(async (resolve, reject) => {
        try {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = async (e) => {
                img.onload = async () => {
                    let targetWidth = img.width;
                    let targetHeight = img.height;

                    if (sizeOpt === 'custom' && customWidth.value) {
                        targetWidth = parseInt(customWidth.value);
                        targetHeight = Math.round(targetWidth * (img.height / img.width));
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                    const mimeType = outputFormat === 'webp' ? 'image/webp' :
                        outputFormat === 'png' ? 'image/png' : 'image/jpeg';

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    }, mimeType, quality);
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        } catch (error) {
            reject(error);
        }
    });
}

function generateFileName(originalName, fileType) {
    const baseName = originalName.split('.').slice(0, -1).join('.');
    const quality = qualitySlider.value;
    return `${baseName}-optimized-q${quality}.${fileType}`;
}

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
