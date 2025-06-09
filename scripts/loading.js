// Neuron/scripts/loading.js - HTML da tela de loading externalizado
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'loading'; // Nome atualizado para o log
    const LOCK_PANE_ID = 'skm_LockPane';
    const LOCK_PANE_TEXT_ID = 'skm_LockPaneText';
    const NEURON_LOADING_CSS_CLASS = 'neuron-loading-active';
    const TEMPLATE_URL = chrome.runtime.getURL('templates/loading.html');

    let paneObserver = null;
    let manifestVersion = 'v?.?.?';
    let activeAnimationFrameId = null;
    let isNeuronStyleApplied = false;
    let originalPaneTextInnerHTML = null; // Para guardar o conteúdo original do painel de texto

    try {
        const manifest = chrome.runtime.getManifest();
        if (manifest && manifest.version) {
            manifestVersion = "v" + manifest.version;
        }
    } catch (e) {
        console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Não foi possível obter a versão do manifest.`, e);
    }

    function pararAnimacaoCaractereRotativo() {
        if (activeAnimationFrameId) {
            cancelAnimationFrame(activeAnimationFrameId);
            activeAnimationFrameId = null;
        }
        const charElement = document.getElementById("neuronRotatingCharLoading");
        if (charElement) {
            charElement.textContent = '.'; // Reseta para o estado inicial
        }
    }

    function animarCaractereRotativo(charElementId = "neuronRotatingCharLoading") {
        pararAnimacaoCaractereRotativo();
        const rotatingChar = document.getElementById(charElementId);
        if (!rotatingChar) return;

        const frames = [".", "..", "...", "...."];
        let frameIndex = 0;
        let lastTime = 0;
        const intervalo = 350; // ms

        function animarComIntervalo(timestamp) {
            const charElement = document.getElementById(charElementId);
            if (!charElement || !isNeuronStyleApplied) {
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

    async function aplicarEstiloNeuronLoading() {
        const lockPane = document.getElementById(LOCK_PANE_ID);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);

        if (!lockPane || !lockPaneText || lockPane.classList.contains(NEURON_LOADING_CSS_CLASS)) {
            return;
        }

        if (originalPaneTextInnerHTML === null && lockPaneText.innerHTML.trim() !== "") {
            if (!lockPaneText.querySelector('.neuron-loading-gif')) { // Não guarda se já for conteúdo Neuron
                originalPaneTextInnerHTML = lockPaneText.innerHTML;
            }
        }
        
        try {
            const response = await fetch(TEMPLATE_URL);
            if (!response.ok) {
                throw new Error(`Erro HTTP ao carregar template de loading: ${response.status} ${response.statusText}`);
            }
            let htmlContent = await response.text();

            // Substituir placeholders
            const gifUrl = chrome.runtime.getURL('images/Intro-Neuron.gif');
            htmlContent = htmlContent.replace('{{GIF_URL}}', gifUrl);
            htmlContent = htmlContent.replace('{{MANIFEST_VERSION}}', manifestVersion);

            lockPaneText.innerHTML = htmlContent;
            
            lockPane.classList.add(NEURON_LOADING_CSS_CLASS);
            isNeuronStyleApplied = true;
            animarCaractereRotativo("neuronRotatingCharLoading");

        } catch (error) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao carregar ou processar o template HTML da tela de loading:`, error);
            
            // ### INÍCIO DA CORREÇÃO ###
            // Em caso de erro, exibe uma mensagem simples sem aplicar o estilo completo do Neuron,
            // pois a estrutura para esse estilo pode não ter sido carregada.
            if (lockPaneText) {
                lockPaneText.innerHTML = `<p style="color: #333; font-family: sans-serif; font-weight: bold;">Neuron: Erro ao carregar animação.</p>`; // Fallback simples
            }
            // Não adicionamos a classe NEURON_LOADING_CSS_CLASS nem setamos isNeuronStyleApplied = true
            // para que a tela de loading padrão do sistema seja exibida com a nossa mensagem de erro.
            isNeuronStyleApplied = false;
            // ### FIM DA CORREÇÃO ###
        }
    }

    function reverterEstiloNeuronLoading() {
        pararAnimacaoCaractereRotativo();
        const lockPane = document.getElementById(LOCK_PANE_ID);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);

        if (!lockPane || !isNeuronStyleApplied) { // Verifica isNeuronStyleApplied em vez da classe diretamente
            return;
        }
        
        lockPane.classList.remove(NEURON_LOADING_CSS_CLASS);
        isNeuronStyleApplied = false;

        if (lockPaneText) { // Verifica se lockPaneText existe antes de modificar
            lockPaneText.innerHTML = ''; // Limpa o conteúdo do Neuron
            if (originalPaneTextInnerHTML !== null) {
                lockPaneText.innerHTML = originalPaneTextInnerHTML;
                originalPaneTextInnerHTML = null;
            }
        }
    }
    
    async function verificarMasterEnableEConfigurarObserver() {
        try {
            const result = await chrome.storage.local.get('neuronUserConfig');
            const config = result.neuronUserConfig || {};
            const masterEnabled = config.masterEnableNeuron !== false;
            const featureEnabled = config.featureSettings?.loading?.enabled !== false; 

            if (masterEnabled && featureEnabled) {
                const lockPane = document.getElementById(LOCK_PANE_ID);
                if (lockPane) {
                    configurarObserverLoadingPane(lockPane);
                    if (lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff')) {
                        await aplicarEstiloNeuronLoading(); // Adicionado await
                    }
                }
            } else {
                reverterEstiloNeuronLoading();
                desconectarObserverLoadingPane();
            }
        } catch (error) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao verificar masterEnable:`, error);
        }
    }

    function configurarObserverLoadingPane(lockPaneElement) {
        if (paneObserver) return;

        paneObserver = new MutationObserver(async (mutationsList) => { // Adicionado async
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    const isVisible = lockPaneElement.style.display !== 'none' && !lockPaneElement.classList.contains('LockOff');
                    
                    if (isVisible) {
                        if (!isNeuronStyleApplied) { // Verifica a flag interna
                            await aplicarEstiloNeuronLoading(); // Adicionado await
                        }
                    } else {
                        if (isNeuronStyleApplied) {
                            reverterEstiloNeuronLoading();
                        }
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
    
    chrome.storage.onChanged.addListener(async (changes, namespace) => { // Adicionado async
        if (namespace === 'local' && changes.neuronUserConfig) {
            // Reavalia o estado da funcionalidade ao detectar mudança na configuração
            await verificarMasterEnableEConfigurarObserver(); // Adicionado await
        }
    });

    async function init() {
        await new Promise(resolve => {
            const checkElements = () => {
                if (document.getElementById(LOCK_PANE_ID) && document.getElementById(LOCK_PANE_TEXT_ID)) {
                    resolve();
                } else {
                    setTimeout(checkElements, 200);
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkElements);
            } else {
                checkElements();
            }
        });
        await verificarMasterEnableEConfigurarObserver();
    }

    init();
})();