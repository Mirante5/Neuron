(async function () {
    'use strict';

    const SCRIPT_ID = 'loading';
    const CONFIG_KEY = 'neuronUserConfig';

    const LOCK_PANE_ID = 'skm_LockPane';
    const LOCK_PANE_TEXT_ID = 'skm_LockPaneText';
    const NEURON_LOADING_CSS_CLASS = 'neuron-loading-active';
    const TEMPLATE_URL = chrome.runtime.getURL('modules/loading/loading.html');

    let config = {};
    let paneObserver = null;
    let manifestVersion = 'v?.?.?';
    let activeAnimationFrameId = null;
    let isNeuronStyleApplied = false;
    let originalPaneTextInnerHTML = null;

    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`[Neuron|${SCRIPT_ID}] Configurações carregadas.`);
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }

    function carregarVersaoManifest() {
        try {
            const manifest = chrome.runtime.getManifest();
            if (manifest && manifest.version) {
                manifestVersion = "v" + manifest.version;
            }
        } catch (e) {
            console.warn(`[Neuron|${SCRIPT_ID}] Não foi possível obter a versão do manifest.`, e);
        }
    }

    function pararAnimacao() {
        if (activeAnimationFrameId) {
            cancelAnimationFrame(activeAnimationFrameId);
            activeAnimationFrameId = null;
        }
    }

    function iniciarAnimacao() {
        pararAnimacao();
        const rotatingChar = document.getElementById("neuronRotatingCharLoading");
        if (!rotatingChar) return;

        const frames = [".", "..", "...", "...."];
        let frameIndex = 0;
        let lastTime = 0;
        const intervalo = 350;

        function animar(timestamp) {
            if (!isNeuronStyleApplied) {
                pararAnimacao();
                return;
            }
            if (timestamp - lastTime >= intervalo) {
                rotatingChar.textContent = frames[frameIndex];
                frameIndex = (frameIndex + 1) % frames.length;
                lastTime = timestamp;
            }
            activeAnimationFrameId = requestAnimationFrame(animar);
        }
        activeAnimationFrameId = requestAnimationFrame(animar);
    }

    async function aplicarEstiloNeuron() {
        const lockPane = document.getElementById(LOCK_PANE_ID);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);

        if (!lockPane || !lockPaneText || isNeuronStyleApplied) {
            return;
        }

        if (originalPaneTextInnerHTML === null && !lockPaneText.querySelector('.neuron-loading-container')) {
            originalPaneTextInnerHTML = lockPaneText.innerHTML;
        }
        
        try {
            const response = await fetch(TEMPLATE_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            let htmlContent = await response.text();
            htmlContent = htmlContent.replace('{{GIF_URL}}', chrome.runtime.getURL('images/Intro-Neuron.gif'));
            htmlContent = htmlContent.replace('{{MANIFEST_VERSION}}', manifestVersion);

            lockPaneText.innerHTML = htmlContent;
            lockPane.classList.add(NEURON_LOADING_CSS_CLASS);
            isNeuronStyleApplied = true;
            iniciarAnimacao();
        } catch (error) {
            console.error(`[Neuron|${SCRIPT_ID}] Falha ao aplicar estilo de loading.`, error);
            reverterEstiloNeuron();
        }
    }

    function reverterEstiloNeuron() {
        pararAnimacao();
        const lockPane = document.getElementById(LOCK_PANE_ID);
        if (!lockPane || !isNeuronStyleApplied) return;

        lockPane.classList.remove(NEURON_LOADING_CSS_CLASS);
        const lockPaneText = document.getElementById(LOCK_PANE_TEXT_ID);
        if (lockPaneText) {
            lockPaneText.innerHTML = originalPaneTextInnerHTML || '';
            originalPaneTextInnerHTML = null;
        }
        isNeuronStyleApplied = false;
    }
    
    function observarMudancasNoPainel() {
        let lockPane = document.getElementById(LOCK_PANE_ID);
        if (!lockPane || paneObserver) return;

        paneObserver = new MutationObserver(async () => {
            lockPane = document.getElementById(LOCK_PANE_ID);
            if (!lockPane) {
                reverterEstiloNeuron();
                return;
            }
            const isVisible = lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff');
            if (isVisible) {
                await aplicarEstiloNeuron();
            } else {
                reverterEstiloNeuron();
            }
        });
        
        paneObserver.observe(lockPane, { attributes: ['style', 'class'], childList: true, subtree: false });

        if (lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff')) {
            aplicarEstiloNeuron();
        }
    }

    function desconectarObserver() {
        if (paneObserver) {
            paneObserver.disconnect();
            paneObserver = null;
        }
        reverterEstiloNeuron();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();

        if (isScriptAtivo()) {
            observarMudancasNoPainel();
        } else {
            desconectarObserver();
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            console.warn(`[Neuron|${SCRIPT_ID}] Configuração alterada. Reavaliando...`);
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        await new Promise(resolve => {
            const checkElement = () => {
                if (document.getElementById(LOCK_PANE_ID)) resolve();
                else setTimeout(checkElement, 100);
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkElement, { once: true });
            } else {
                checkElement();
            }
        });
        
        carregarVersaoManifest();
        verificarEstadoAtualEAgir();
    }

    init();
})();