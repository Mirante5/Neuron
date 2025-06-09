// Neuron/scripts/prorrogar.js - CSS e HTML Externalizados
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'prorrogar';
    const SCRIPT_ID = 'prorrogar';
    const CONFIG_STORAGE_KEY_PRORROGAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_PRORROGAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
    const LABEL_CLASS_NEURON = 'neuronLabelProrrogar'; // Usado para aplicar ao label do template
    const ID_SELECT_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
    const ID_INPUT_JUSTIFICATIVA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';
    const URL_ALVO_DO_SCRIPT = 'ProrrogarManifestacao.aspx';
    const TEMPLATE_URL = chrome.runtime.getURL('templates/prorrogar.html');
    // STYLE_CLASS_NEURON não é mais necessária

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsProrrogar = {};

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;
    // neuronDropdownElement e neuronLabelElement serão referenciados localmente ao criar a UI

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
                fullConfig = { masterEnableNeuron: false, featureSettings: {}, textModels: { Prorrogar: {} } };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        textModelsProrrogar = fullConfig.textModels?.Prorrogar || fullConfig.textModels?.Prorrogacao || {};

        if (Object.keys(textModelsProrrogar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Prorrogar' (ou 'Prorrogacao') não encontrada ou vazia.`);
            textModelsProrrogar = { "Erro": "Modelos de prorrogação não carregados." };
        }
    }

    // Funções inserirEstilosNeuron() e removerEstilosNeuron() REMOVIDAS

    function removerElementosCriadosProrrogar() {
        document.getElementById(DROPDOWN_ID_NEURON)?.remove();
        document.querySelector('.' + LABEL_CLASS_NEURON)?.remove();
    }

 async function criarOuAtualizarUIProrrogar() {
    if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        removerElementosCriadosProrrogar();
        return;
    }

    const originalSelectMotivo = document.getElementById(ID_SELECT_MOTIVO_ORIGINAL);
    const justificativaInputAlvo = document.getElementById(ID_INPUT_JUSTIFICATIVA_PAGINA);

    if (!originalSelectMotivo || !justificativaInputAlvo) {
        console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora ou input de justificativa não encontrados.`);
        return; 
    }
    
    removerElementosCriadosProrrogar(); // Garante que não haja duplicatas

    try {
        const response = await fetch(TEMPLATE_URL);
        if (!response.ok) {
            throw new Error(`Erro HTTP ao carregar template de prorrogação: ${response.status} ${response.statusText}`);
        }
        let htmlTemplate = await response.text();

        // MODIFICADO: A substituição do placeholder do label foi removida.
        htmlTemplate = htmlTemplate.replace('{{DEFAULT_OPTION_TEXT}}', 'Neuron - Selecione um modelo de texto...');

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = htmlTemplate;

        // MODIFICADO: A referência ao label foi removida.
        const dropdownElement = tempContainer.querySelector('#' + DROPDOWN_ID_NEURON);

        if (!dropdownElement) {
            throw new Error('Elemento dropdown não encontrado no template HTML processado.');
        }

        Object.entries(textModelsProrrogar).forEach(([titulo, texto]) => {
            const opt = document.createElement('option');
            opt.value = texto; 
            opt.textContent = titulo;
            dropdownElement.appendChild(opt);
        });

        dropdownElement.addEventListener('change', function () {
            if (justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
        });

        // MODIFICADO: Lógica de inserção simplificada usando .after().
        const parentOfOriginalSelect = originalSelectMotivo.parentNode;
        if (parentOfOriginalSelect) {
            // Insere o dropdown do Neuron logo após o select de motivo original.
            originalSelectMotivo.after(dropdownElement);
        } else {
            throw new Error('Nó pai do select de motivo original não encontrado.');
        }

    } catch (error) {
        console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao criar UI a partir do template:`, error);
    }
}

    async function verificarEstadoAtualEAgirProrrogar() {
        await carregarConfiguracoesProrrogar();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            await criarOuAtualizarUIProrrogar(); 
            if (!observerConfiguradoGlobal) { 
                configurarObserverPrincipalProrrogar();
            }
        } else {
            removerElementosCriadosProrrogar();
            desconectarObserverPrincipalProrrogar(); 
        }
    }

    function configurarObserverPrincipalProrrogar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return; 
        
        uiMutationObserver = new MutationObserver(async () => { // Adicionado async
            const uiExiste = !!document.getElementById(DROPDOWN_ID_NEURON);
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!uiExiste) { 
                    await criarOuAtualizarUIProrrogar(); // Adicionado await
                }
            } else {
                if (uiExiste) {
                    removerElementosCriadosProrrogar();
                }
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

    chrome.storage.onChanged.addListener(async (changes, namespace) => { // Adicionado async
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_PRORROGAR]) {
            await verificarEstadoAtualEAgirProrrogar(); // Adicionado await
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