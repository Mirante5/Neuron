// Neuron 0.1.5 β/scripts/style.js - GIF MAIOR, ANIMAÇÃO GARANTIDA
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'style';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_style';
    const LOCK_PANE_ID = 'skm_LockPane';
    const LOCK_PANE_TEXT_ID = 'skm_LockPaneText';
    const NEURON_LOADING_ACTIVE_CLASS = 'neuron-loading-active';

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;

    let originalPaneTextInnerHTML = null;
    let originalPaneStyles = {
        backgroundColor: null, backgroundImage: null, display: null,
        justifyContent: null, alignItems: null, padding: null,
        position: null, top: null, left: null, width: null, height: null, zIndex: null, transform: null,
        text_display: null, text_flexDirection: null, text_alignItems: null,
        text_justifyContent: null, text_textAlign: null, text_maxWidth: null,
        text_width: null, text_padding: null, text_position: null,
        text_backgroundColor: null, text_borderRadius: null, text_boxShadow: null
    };

    let paneObserver = null;
    let manifestVersion = 'v?.?.?';
    let activeAnimationFrameId = null; // Para controlar a animação globalmente

    try {
        const manifest = chrome.runtime.getManifest();
        if (manifest && manifest.version) {
            manifestVersion = "v" + manifest.version;
        }
    } catch (e) {
        console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Não foi possível obter a versão do manifest.`, e);
    }

    // --- Funções de Geração de Conteúdo Personalizado ---
    function criarIntroNeuronGifHTML() {
        const gifUrl = chrome.runtime.getURL('images/Intro-Neuron.gif');
        return `<img src="${gifUrl}" alt="Neuron Loading..." style="width: 100%; height: 100%;">`;
    }

    function criarTextoCarregamentoNeuron() { 
        return `<div style="font-size: 24px; color: #EAEAEA; margin-top: 1px;">Otimizando seu fluxo, aguarde<span id="neuronRotatingCharLoading" style="display: inline-block; color: #00BFFF; font-weight: bold;">.    |</span>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: ##C0C0C0; margin-top: 0px; text-shadow: 1px 1px 3px rgba(0,0,0,0.6);">
            Neuron <span style="color: #00BFFF; font-weight: bold;">${manifestVersion}</span>
        </div>`;
    }

    function criarCreditoArteHTML() { 
        return `<div style="font-size: 12px; color: #FFF; margin-top: 25px; position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);">
            Art by Bia
        </div>`;
    }

    function pararAnimacaoCaractereRotativo() {
        if (activeAnimationFrameId) {
            cancelAnimationFrame(activeAnimationFrameId);
            activeAnimationFrameId = null;
        }
    }

    // REMOVED THE FIRST (SIMPLER) animarCaractereRotativo FUNCTION

    function animarCaractereRotativo(charElementId = "neuronRotatingCharLoading") {
        pararAnimacaoCaractereRotativo(); 

        const rotatingChar = document.getElementById(charElementId);
        if (!rotatingChar) {
            return;
        }

        const frames = [".    |", "..   /", "...  —", ".... \\"];
        let frameIndex = 0;
        let lastTime = 0;
        const intervalo = 500; // ms

        function animarComIntervalo(timestamp) {
            const charElement = document.getElementById(charElementId); 
            if (!charElement) { 
                pararAnimacaoCaractereRotativo();
                return;
            }
            if (timestamp - lastTime >= intervalo) {
                charElement.textContent = frames[frameIndex];
                frameIndex = (frameIndex + 1) % frames.length;
                lastTime = timestamp;
            }
            activeAnimationFrameId = requestAnimationFrame(animarComIntervalo);
        }
        activeAnimationFrameId = requestAnimationFrame(animarComIntervalo);
    }

    // --- Funções de Aplicação e Reversão de Estilo ---
    function aplicarEstiloNeuronLoading() {
        const lockPane = document.getElementById(LOCK_PANE_ID);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);

        if (!lockPane || !lockPaneText || lockPane.classList.contains(NEURON_LOADING_ACTIVE_CLASS)) {
            return;
        }

        if (originalPaneStyles.position === null) { /* ... (lógica de guardar estilos originais) ... */ 
             Object.keys(originalPaneStyles).forEach(key => {
                if (key.startsWith('text_')) { const styleKey = key.substring(5); if (lockPaneText.style[styleKey] !== undefined) originalPaneStyles[key] = lockPaneText.style[styleKey];
                } else { if (lockPane.style[key] !== undefined) originalPaneStyles[key] = lockPane.style[key]; }
            });
            if (originalPaneTextInnerHTML === null) originalPaneTextInnerHTML = lockPaneText.innerHTML;
        }

        lockPaneText.innerHTML = `
            ${criarIntroNeuronGifHTML()}
            ${criarTextoCarregamentoNeuron()}
            ${criarCreditoArteHTML()}
        `;
        animarCaractereRotativo("neuronRotatingCharLoading"); 

        lockPane.style.position = "fixed"; 
        lockPane.style.top = "0"; 
        lockPane.style.left = "0"; 
        lockPane.style.width = "100%"; 
        lockPane.style.height = "100%"; 
        lockPane.style.zIndex = "2147483647"; 
        lockPane.style.transform = ""; 
        lockPane.style.backgroundColor = "rgba(0, 0, 0, 0.75)"; 
        lockPane.style.backgroundImage = "none"; 
        lockPane.style.display = "flex"; 
        lockPane.style.justifyContent = "center"; 
        lockPane.style.alignItems = "center";   
        lockPane.style.padding = "15px";       
        lockPane.style.overflow = "hidden"; 

        lockPaneText.style.display = "flex"; 
        lockPaneText.style.flexDirection = "column"; 
        lockPaneText.style.alignItems = "center";   
        lockPaneText.style.justifyContent = "center"; 
        lockPaneText.style.textAlign = "center";    
        lockPaneText.style.maxWidth = "70%";      
        lockPaneText.style.width = "100%";          
        lockPaneText.style.minWidth = "320px"; 
        lockPaneText.style.padding = "5px";   
        lockPaneText.style.position = "relative";   
        lockPaneText.style.backgroundColor = "transparent"; 
        lockPaneText.style.borderRadius = "0px"; 
        lockPaneText.style.boxShadow = "none"; 
        lockPaneText.style.overflow = "hidden";

        lockPane.classList.add(NEURON_LOADING_ACTIVE_CLASS);
    }

    function reverterEstiloNeuronLoading() {
        pararAnimacaoCaractereRotativo(); 
        const lockPane = document.getElementById(LOCK_PANE_ID);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);

        if (!lockPane || !lockPane.classList.contains(NEURON_LOADING_ACTIVE_CLASS)) {
            return;
        }

        if (lockPaneText && originalPaneTextInnerHTML !== null) {
            lockPaneText.innerHTML = originalPaneTextInnerHTML;
        }
        
        Object.keys(originalPaneStyles).forEach(key => { 
            const targetElement = key.startsWith('text_') ? lockPaneText : lockPane;
            const styleKey = key.startsWith('text_') ? key.substring(5) : key;
            if (targetElement && originalPaneStyles[key] !== null && targetElement.style[styleKey] !== undefined) {
                targetElement.style[styleKey] = originalPaneStyles[key];
            }
        });

        lockPane.classList.remove(NEURON_LOADING_ACTIVE_CLASS);
        originalPaneTextInnerHTML = null;
        Object.keys(originalPaneStyles).forEach(key => originalPaneStyles[key] = null);
    }

    async function verificarEstadoAtualEAgir() {
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY]);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;

        const lockPane = document.getElementById(LOCK_PANE_ID);
        if (!lockPane) {
            desconectarObserverLoadingPane();
            return;
        }

        if (currentMasterEnabled && currentScriptEnabled) {
            configurarObserverLoadingPane(lockPane);
            // Se o painel estiver visível (não tem LockOff), aplica o estilo Neuron
            if (!lockPane.classList.contains("LockOff")) {
                aplicarEstiloNeuronLoading();
            }
        } else {
            desconectarObserverLoadingPane();
            // Se o Neuron for desabilitado e o painel estiver visível com estilo Neuron, reverte
            if (!lockPane.classList.contains("LockOff") && lockPane.classList.contains(NEURON_LOADING_ACTIVE_CLASS)) {
                reverterEstiloNeuronLoading();
            }
        }
    }

    function configurarObserverLoadingPane(lockPaneElement) {
        if (paneObserver) return; // Já configurado

        paneObserver = new MutationObserver((mutationsList) => {
            if (!currentMasterEnabled || !currentScriptEnabled) {
                // Se o estilo Neuron estiver ativo mas o script/master foi desabilitado, reverte.
                if (lockPaneElement.classList.contains(NEURON_LOADING_ACTIVE_CLASS) && !lockPaneElement.classList.contains("LockOff")){
                     reverterEstiloNeuronLoading();
                }
                desconectarObserverLoadingPane(); // Desconecta se não estiver mais ativo
                return;
            }

            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!lockPaneElement.classList.contains("LockOff")) { // Ficou visível
                        aplicarEstiloNeuronLoading();
                    } else { // Ficou oculto
                        reverterEstiloNeuronLoading();
                    }
                }
            }
        });
        paneObserver.observe(lockPaneElement, { attributes: true });
    }

    function desconectarObserverLoadingPane() {
        pararAnimacaoCaractereRotativo(); 
        if (paneObserver) {
            paneObserver.disconnect();
            paneObserver = null;
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => { 
        if (namespace === 'local' && (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY])) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() { 
        await new Promise(resolve => { 
            const checkElements = () => {
                if (document.getElementById(LOCK_PANE_ID) && document.getElementById(LOCK_PANE_TEXT_ID)) {
                    resolve();
                } else { setTimeout(checkElements, 300); }
            };
            checkElements();
        });
        await verificarEstadoAtualEAgir();
    }
    init();
})();