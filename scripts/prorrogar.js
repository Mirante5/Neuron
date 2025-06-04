// Neuron 0.3.1/scripts/prorrogar.js - CENTRALIZED CONFIG
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'prorrogar';
    const SCRIPT_ID = 'prorrogar';
    const CONFIG_STORAGE_KEY_PRORROGAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_PRORROGAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
    const LABEL_ID_NEURON_CLASS = 'neuronLabelProrrogar';
    const ID_SELECT_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
    const ID_INPUT_JUSTIFICATIVA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';
    const URL_ALVO_DO_SCRIPT = 'ProrrogarManifestacao.aspx';
    const STYLE_CLASS_NEURON = `neuron-${SCRIPT_NOME_PARA_LOG}-styles`;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsProrrogar = {}; // Deveria ser Prorrogar ou Prorrogacao conforme config.json

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;
    let neuronDropdownElement = null;
    let neuronLabelElement = null;

    async function carregarConfiguracoesProrrogar() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_PRORROGAR);
        let fullConfig = {};

        if (result[CONFIG_STORAGE_KEY_PRORROGAR] && typeof result[CONFIG_STORAGE_KEY_PRORROGAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_PRORROGAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_PRORROGAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_PRORROGAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {}, textModels: { Prorrogar: {} } }; // Chave "Prorrogar"
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        // A chave em text.json é "Prorrogacao", mas no config.json centralizado usei "Prorrogar"
        // Vamos verificar ambas por segurança ou padronizar para "Prorrogar"
        textModelsProrrogar = fullConfig.textModels?.Prorrogar || fullConfig.textModels?.Prorrogacao || {};


        if (Object.keys(textModelsProrrogar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Prorrogar' (ou 'Prorrogacao') não encontrada ou vazia.`);
            textModelsProrrogar = { "Erro": "Modelos de prorrogação não carregados." };
        }
    }

    function inserirEstilosNeuron() {
        if (document.querySelector('.' + STYLE_CLASS_NEURON)) return;
        const style = document.createElement('style');
        style.className = STYLE_CLASS_NEURON;
        style.textContent = `
            .${LABEL_ID_NEURON_CLASS} { display: block; margin-top: 20px; margin-bottom: 5px; font-weight: bold; color: #333; }
            #${DROPDOWN_ID_NEURON} { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; }
        `;
        document.head.appendChild(style);
    }

    function removerEstilosNeuron() {
        document.querySelector('.' + STYLE_CLASS_NEURON)?.remove();
    }

    function removerElementosCriadosProrrogar() {
        neuronDropdownElement?.remove();
        neuronLabelElement?.remove();
        neuronDropdownElement = null;
        neuronLabelElement = null;
    }

    function criarOuAtualizarUIProrrogar() {
        if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            removerElementosCriadosProrrogar();
            return;
        }

        const originalSelectMotivo = document.getElementById(ID_SELECT_MOTIVO_ORIGINAL);
        const justificativaInputAlvo = document.getElementById(ID_INPUT_JUSTIFICATIVA_PAGINA);

        if (!originalSelectMotivo || !justificativaInputAlvo) {
            return; 
        }
        
        if (neuronDropdownElement) {
            removerElementosCriadosProrrogar();
        }

        neuronLabelElement = document.createElement('label');
        neuronLabelElement.setAttribute('for', DROPDOWN_ID_NEURON);
        neuronLabelElement.textContent = 'Neuron - Justificativa Pré-definida:';
        neuronLabelElement.className = LABEL_ID_NEURON_CLASS;

        neuronDropdownElement = document.createElement('select');
        neuronDropdownElement.id = DROPDOWN_ID_NEURON;

        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Selecione uma justificativa...';
        neuronDropdownElement.appendChild(optDefault);

        Object.entries(textModelsProrrogar).forEach(([titulo, texto]) => {
            const opt = document.createElement('option');
            opt.value = texto; 
            opt.textContent = titulo;
            neuronDropdownElement.appendChild(opt);
        });

        neuronDropdownElement.addEventListener('change', function () {
            if (justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
        });

        const parentOfOriginalSelect = originalSelectMotivo.parentNode;
        if (parentOfOriginalSelect) {
             // Insere o label Neuron depois do select original
            parentOfOriginalSelect.insertBefore(neuronLabelElement, neuronDropdownElement.nextSibling);
            // Insere o dropdown Neuron depois do label Neuron que acabamos de inserir
            parentOfOriginalSelect.insertBefore(neuronDropdownElement, neuronLabelElement.nextSibling);
            inserirEstilosNeuron();
        } else {
            neuronLabelElement?.remove();
            neuronDropdownElement?.remove();
        }
    }

    async function verificarEstadoAtualEAgirProrrogar() {
        await carregarConfiguracoesProrrogar();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            criarOuAtualizarUIProrrogar(); 
            if (!observerConfiguradoGlobal) { 
                configurarObserverPrincipalProrrogar();
            }
        } else {
            removerElementosCriadosProrrogar();
            removerEstilosNeuron(); 
            desconectarObserverPrincipalProrrogar(); 
        }
    }

    function configurarObserverPrincipalProrrogar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return; 
        uiMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!document.getElementById(DROPDOWN_ID_NEURON)) { 
                    criarOuAtualizarUIProrrogar();
                }
            } else {
                removerElementosCriadosProrrogar();
            }
        });
        const awaitBodyInterval = setInterval(() => { 
            if (document.body) {
                clearInterval(awaitBodyInterval);
                uiMutationObserver.observe(document.body, { childList: true, subtree: true });
                observerConfiguradoGlobal = true;
            }
        }, 100);
    }

    function desconectarObserverPrincipalProrrogar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null; 
            observerConfiguradoGlobal = false;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_PRORROGAR]) {
            verificarEstadoAtualEAgirProrrogar();
        }
    });

    async function initProrrogar() {
        await new Promise(resolve => { 
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgirProrrogar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initProrrogar();
    }
})();