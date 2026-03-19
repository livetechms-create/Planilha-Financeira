// configuration and state
let currentScale = 2;
let currentModelType = 'thin';
let upscaler = null;

// Selectors
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const idleView = document.getElementById('idle-view');
const processingView = document.getElementById('processing-view');
const resultView = document.getElementById('result-view');
const originalPreview = document.getElementById('original-preview');
const upscaledPreview = document.getElementById('upscaled-preview');
const downloadLink = document.getElementById('download-link');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const upscaleLabel = document.getElementById('upscale-label');
const scaleBtns = document.querySelectorAll('.toggle-btn');
const modelSelect = document.getElementById('model-select');

let isProcessing = false;

// Configuração de Backend do TensorFlow para máxima performance
async function setupTF() {
    try {
        // Tenta usar WebGL (GPU) para não travar o processador
        await tf.setBackend('webgl');
        console.log("Usando GPU para processamento.");
    } catch (e) {
        console.warn("GPU não disponível, usando CPU (será mais lento).");
        await tf.setBackend('cpu');
    }
}
setupTF();
// Map for models - UPDATED to use High Definition 'thick' models by default
const MODEL_MAP = {
    '2-thin': 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@latest/models/2x/model.json',
    '2-regular': 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-thick@latest/models/2x/model.json',
    '3-thin': 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@latest/models/3x/model.json',
    '3-regular': 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-thick@latest/models/3x/model.json',
    '4-thin': 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@latest/models/4x/model.json',
    '4-regular': 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-thick@latest/models/4x/model.json',
};

// Check if dependencies are loaded
function checkDependencies() {
    if (typeof tf === 'undefined' || typeof Upscaler === 'undefined') {
        alert("Erro: Não foi possível carregar as bibliotecas de IA. Verifique sua conexão com a internet.");
        return false;
    }
    return true;
}

// Initialize or update upscaler
async function initUpscaler() {
    if (!checkDependencies()) return;
    
    try {
        const modelPath = MODEL_MAP[`${currentScale}-${currentModelType}`];
        console.log("Tentando carregar modelo:", modelPath);
        
        upscaler = new Upscaler({
            model: {
                path: modelPath,
                scale: currentScale,
            }
        });
        
        // Warm up the model
        await upscaler.warmup({ patchSize: 64, padding: 2 });
        console.log("Upscaler pronto!");
    } catch (e) {
        console.error("Erro ao inicializar upscaler:", e);
    }
}

// Handle Settings
scaleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        scaleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScale = parseInt(btn.dataset.scale);
        await initUpscaler();
    });
});

modelSelect.addEventListener('change', async (e) => {
    currentModelType = e.target.value;
    await initUpscaler();
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
});

async function processImage(file) {
    if (!checkDependencies()) return;
    if (isProcessing) return;
    
    isProcessing = true;
    document.body.classList.add('processing-active');
    
    // Mostramos o preview original imediatamente
    const objectUrl = URL.createObjectURL(file);
    originalPreview.src = objectUrl;
    
    idleView.classList.add('hidden');
    processingView.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.innerText = "Preparando...";

    const img = new Image();
    img.src = objectUrl;
    
    img.onload = async () => {
        try {
            // Garantir que o upscaler está inicializado
            if (!upscaler) await initUpscaler();

            // Aumentamos o limite para 1600 para manter muito mais detalhes originais
            // A IA precisa de uma base boa para gerar a Alta Definição
            const MAX_SIZE = 1600; 
            let processImg = img;
            
            if (img.width > MAX_SIZE || img.height > MAX_SIZE) {
                const canvas = document.createElement('canvas');
                const ratio = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false; // Desativar para não "borrar" antes da IA agir
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                processImg = canvas;
            }

            // PatchSize de 64 com Padding de 8 para evitar costuras e manter nitidez máxima
            const patchSize = 64; 

            progressText.innerText = "Processando em ULTRA HD...";
            upscaleLabel.innerText = `${currentScale}X Resolução Máxima`;
            
            // Usamos tf.tidy para limpar o lixo da memória automaticamente
            const upscaledSrc = await upscaler.upscale(processImg, {
                patchSize: patchSize,
                padding: 4,
                awaitNextFrame: true, // Voltamos a deixar o navegador respirar para evitar o alerta de "página pesada"
                progress: (percent) => {
                    const p = Math.round(percent * 100);
                    progressBar.style.width = `${p}%`;
                    progressText.innerText = `Reconstruindo: ${p}%`;
                }
            });
            
            upscaledPreview.src = upscaledSrc;
            
            // --- POST-PROCESSING PARA NITIDEZ EXTRA ---
            const postCanvas = document.createElement('canvas');
            const postCtx = postCanvas.getContext('2d');
            const finalImg = new Image();
            finalImg.src = upscaledSrc;
            
            await finalImg.decode();
            postCanvas.width = finalImg.width;
            postCanvas.height = finalImg.height;
            
            // 1. Aplicar a imagem base
            postCtx.drawImage(finalImg, 0, 0);
            
            // 2. Filtro de Nitidez (Convolution matrix)
            // Este filtro realça as bordas e faz a imagem "saltar"
            const amount = 0.3; // Nível de nitidez
            const weights = [
                0, -amount, 0,
                -amount, 1 + (amount * 4), -amount,
                0, -amount, 0
            ];
            
            const pixels = postCtx.getImageData(0, 0, postCanvas.width, postCanvas.height);
            const side = Math.round(Math.sqrt(weights.length));
            const halfSide = Math.floor(side / 2);
            const src = pixels.data;
            const sw = postCanvas.width;
            const sh = postCanvas.height;
            
            const output = postCtx.createImageData(sw, sh);
            const dst = output.data;
            
            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    const sy = y;
                    const sx = x;
                    const dstOff = (y * sw + x) * 4;
                    let r = 0, g = 0, b = 0;
                    for (let cy = 0; cy < side; cy++) {
                        for (let cx = 0; cx < side; cx++) {
                            const scy = sy + cy - halfSide;
                            const scx = sx + cx - halfSide;
                            if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                                const srcOff = (scy * sw + scx) * 4;
                                const wt = weights[cy * side + cx];
                                r += src[srcOff] * wt;
                                g += src[srcOff + 1] * wt;
                                b += src[srcOff + 2] * wt;
                            }
                        }
                    }
                    dst[dstOff] = r;
                    dst[dstOff + 1] = g;
                    dst[dstOff + 2] = b;
                    dst[dstOff + 3] = src[dstOff + 3]; // Alpha
                }
            }
            postCtx.putImageData(output, 0, 0);
            
            // Verificação de contraste
            postCtx.globalCompositeOperation = 'overlay';
            postCtx.fillStyle = 'rgba(128,128,128,0.1)'; // Sutil aumento de contraste
            postCtx.fillRect(0, 0, postCanvas.width, postCanvas.height);

            const finalDataUrl = postCanvas.toDataURL('image/png');
            upscaledPreview.src = finalDataUrl;
            downloadLink.href = finalDataUrl;
            
            processingView.classList.add('hidden');
            resultView.classList.remove('hidden');
            
            // Cleanup total
            URL.revokeObjectURL(objectUrl);
            
        } catch (error) {
            console.error(error);
            alert("Ocorreu um erro. Tente novamente com uma escala menor.");
            resetApp();
        } finally {
            isProcessing = false;
            document.body.classList.remove('processing-active');
        }
    };

    img.onerror = () => {
        alert("Erro ao ler imagem.");
        resetApp();
        isProcessing = false;
    };
}

function resetApp() {
    isProcessing = false;
    document.body.classList.remove('processing-active');
    idleView.classList.remove('hidden');
    processingView.classList.add('hidden');
    resultView.classList.add('hidden');
    fileInput.value = '';
    progressBar.style.width = '0%';
    if (originalPreview.src.startsWith('blob:')) {
        URL.revokeObjectURL(originalPreview.src);
    }
}

// Efeito dinâmico de fundo (Pausado durante processamento para não travar)
document.addEventListener('mousemove', (e) => {
    if (isProcessing) return; // Se estiver processando, não gasta energia com animação
    
    const glow = document.querySelector('.background-glow');
    if (glow) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        glow.style.transform = `translate(-50%, -50%) translate(${(x - 0.5) * 40}px, ${(y - 0.5) * 40}px)`;
    }
});

// Conectar botão principal
document.getElementById('select-btn').addEventListener('click', () => {
    fileInput.click();
});

// Inicialização automática
initUpscaler();
