/**
 * @file loading.js
 * @version 2.0 (Lógica Padronizada com Config Central)
 * @description Modifica a tela de "Carregando..." do sistema com uma animação do Neuron,
 * respeitando a configuração global da extensão.
 */

(async function () {
    'use strict';

    // --- Constantes de Configuração e Metadados (PADRONIZADO) ---
    const SCRIPT_ID = 'loading';
    const CONFIG_KEY = 'neuronUserConfig';

    // --- Constantes do DOM e de Estilo ---
    const LOCK_PANE_ID = 'skm_LockPane';
    const LOCK_PANE_TEXT_ID = 'skm_LockPaneText';
    const NEURON_LOADING_CSS_CLASS = 'neuron-loading-active';
    const TEMPLATE_URL = chrome.runtime.getURL('modules/loading/loading.html');

    // --- Variáveis de Estado ---
    let config = {}; // Armazena a configuração completa.
    let paneObserver = null;
    let manifestVersion = 'v?.?.?';
    let activeAnimationFrameId = null;
    let isNeuronStyleApplied = false;
    let originalPaneTextInnerHTML = null;

    // --- Funções de Inicialização e Configuração (PADRONIZADO) ---

    /**
     * Carrega a configuração unificada do storage.
     */
    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    /**
     * Verifica se o script deve estar ativo.
     */
    function isScriptAtivo() {
        // Verifica a chave mestra e a configuração específica desta funcionalidade.
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }

    /**
     * Carrega a versão do manifest para exibição na tela de loading.
     */
    function carregarVersaoManifest() {
        try {
            const manifest = chrome.runtime.getManifest();
            if (manifest && manifest.version) {
                manifestVersion = "v" + manifest.version;
            }
        } catch (e) {
            console.warn(`Neuron (${SCRIPT_ID}): Não foi possível obter a versão do manifest.`, e);
        }
    }

    // --- Lógica Principal da Tela de Loading ---

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
        const intervalo = 350; // ms

        function animar(timestamp) {
            if (!isNeuronStyleApplied) { // Para a animação se o estilo for revertido
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

        // Guarda o conteúdo original apenas se não for o nosso
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
            console.error(`Neuron (${SCRIPT_ID}): Falha ao aplicar estilo de loading.`, error);
            reverterEstiloNeuron(); // Reverte para o estado original em caso de erro.
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

    // --- Observadores e Gerenciamento de Estado (PADRONIZADO) ---
    
    function observarMudancasNoPainel() {
        const lockPane = document.getElementById(LOCK_PANE_ID);
        if (!lockPane || paneObserver) return;

        paneObserver = new MutationObserver(async (mutationsList) => {
            const isVisible = lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff');
            if (isVisible) {
                await aplicarEstiloNeuron();
            } else {
                reverterEstiloNeuron();
            }
        });
        
        paneObserver.observe(lockPane, { attributes: ['style', 'class'] });

        // Aplica o estilo imediatamente se o painel já estiver visível quando o observer for criado
        if (lockPane.style.display !== 'none' && !lockPane.classList.contains('LockOff')) {
            aplicarEstiloNeuron();
        }
    }

    function desconectarObserver() {
        if (paneObserver) {
            paneObserver.disconnect();
            paneObserver = null;
        }
        reverterEstiloNeuron(); // Garante que a UI do Neuron seja removida ao desconectar
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
            console.log(`%cNeuron (${SCRIPT_ID}): Configuração alterada. Reavaliando...`, "color: orange; font-weight: bold;");
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        // Espera o painel de loading existir no DOM
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