// Neuron/scripts/prorrogar.js - CSS e HTML Externalizados (Adaptado para novas configs)
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'prorrogar';
    const SCRIPT_ID = 'prorrogar';
    const CONFIG_STORAGE_KEY_PRORROGAR = 'neuronUserConfig'; // Chave geral da config principal
    const CUSTOM_TEXT_MODELS_STORAGE_KEY = 'customTextModels'; // Nova chave para modelos de texto customizados
    const DEFAULT_CONFIG_PATH_PRORROGAR = 'config/config.json'; // Caminho para a config padrão

    const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
    const LABEL_CLASS_NEURON = 'neuronLabelProrrogar';
    const ID_SELECT_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
    const ID_INPUT_JUSTIFICATIVA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';
    const URL_ALVO_DO_SCRIPT = 'ProrrogarManifestacao.aspx';
    const TEMPLATE_URL = chrome.runtime.getURL('modules/prorrogar/prorrogar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let customTextModels = {}; // Renomeado para customTextModels

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;

    async function carregarConfiguracoesProrrogar() {
        // Carrega a configuração geral da extensão
        const resultGeneral = await chrome.storage.local.get(CONFIG_STORAGE_KEY_PRORROGAR);
        let fullConfig = {};
        if (resultGeneral[CONFIG_STORAGE_KEY_PRORROGAR] && typeof resultGeneral[CONFIG_STORAGE_KEY_PRORROGAR] === 'object') {
            fullConfig = resultGeneral[CONFIG_STORAGE_KEY_PRORROGAR];
        } else {
            // Fallback para o config.json padrão se a configuração geral não for encontrada
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_PRORROGAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_PRORROGAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {} };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;

        // Carrega os modelos de texto customizados do storage.local
        const resultTextModels = await chrome.storage.local.get(CUSTOM_TEXT_MODELS_STORAGE_KEY);
        if (resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] && typeof resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] === 'object') {
            customTextModels = resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY];
        } else {
            // Se não houver customizados, carrega os padrões do config.json
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_PRORROGAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                const defaultConfig = await response.json();
                customTextModels = defaultConfig.textModels || {}; // Pega a parte 'textModels' do config.json
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar modelos de texto padrão:`, e);
                customTextModels = {};
            }
        }

        // Garante que a seção 'Prorrogar' esteja acessível
        // O prorrogar pode estar em 'Prorrogar' ou 'Prorrogacao' no config.json antigo. Prioriza 'Prorrogar'.
        const prorrogarModels = customTextModels.Prorrogar || customTextModels.Prorrogacao || {};
        if (Object.keys(prorrogarModels).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Prorrogar' (ou 'Prorrogacao') não encontrada ou vazia nos modelos de texto customizados/padrão.`);
            customTextModels.Prorrogar = { "Erro": "Modelos de prorrogação não carregados." };
        } else {
            // Garante que a chave 'Prorrogar' seja a usada, mesmo se veio de 'Prorrogacao'
            customTextModels.Prorrogar = prorrogarModels;
            if (customTextModels.Prorrogacao) delete customTextModels.Prorrogacao; // Remove a antiga se existir
        }
    }

    function removerElementosCriadosProrrogar() {
        document.getElementById(DROPDOWN_ID_NEURON)?.remove();
        document.querySelector('.' + LABEL_CLASS_NEURON)?.remove();
    }

    async function criarOuAtualizarUIProrrogar() {
        const originalSelectMotivo = document.getElementById(ID_SELECT_MOTIVO_ORIGINAL);
        const justificativaInputAlvo = document.getElementById(ID_INPUT_JUSTIFICATIVA_PAGINA);
        let dropdownElement = document.getElementById(DROPDOWN_ID_NEURON); // Tenta pegar o elemento existente

        if (!originalSelectMotivo || !justificativaInputAlvo) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora ou input de justificativa não encontrados.`);
            removerElementosCriadosProrrogar(); // Remove se os alvos não estiverem presentes
            return;
        }
        
        // Se o dropdown não existe, cria-o
        if (!dropdownElement) {
            try {
                const response = await fetch(TEMPLATE_URL);
                if (!response.ok) {
                    throw new Error(`Erro HTTP ao carregar template de prorrogação: ${response.status} ${response.statusText}`);
                }
                let htmlTemplate = await response.text();

                htmlTemplate = htmlTemplate.replace('{{DEFAULT_OPTION_TEXT}}', 'Neuron - Selecione um modelo de texto...');

                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlTemplate;

                dropdownElement = tempContainer.querySelector('#' + DROPDOWN_ID_NEURON); // Atribui ao dropdownElement

                if (!dropdownElement) {
                    throw new Error('Elemento dropdown não encontrado no template HTML processado.');
                }

                // Adiciona o listener de change UMA VEZ ao criar o elemento
                dropdownElement.addEventListener('change', function () {
                    if (justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
                });

                const parentOfOriginalSelect = originalSelectMotivo.parentNode;
                if (parentOfOriginalSelect) {
                    originalSelectMotivo.after(dropdownElement);
                } else {
                    throw new Error('Nó pai do select de motivo original não encontrado.');
                }
            } catch (error) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao criar UI a partir do template:`, error);
                return; // Sai da função se a criação falhar
            }
        } else {
            // Se o dropdown já existe, limpa as opções (exceto a primeira)
            dropdownElement.innerHTML = `<option value="">Neuron - Selecione um modelo de texto...</option>`;
            // Garante que o valor do input justificativa seja limpo quando as opções são atualizadas
            if (justificativaInputAlvo) justificativaInputAlvo.value = '';
        }

        // Popula/Atualiza as opções do dropdown
        Object.entries(customTextModels.Prorrogar).forEach(([titulo, texto]) => { // Usa customTextModels.Prorrogar
            const opt = document.createElement('option');
            opt.value = texto; 
            opt.textContent = titulo;
            dropdownElement.appendChild(opt);
        });
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
        
        uiMutationObserver = new MutationObserver(async (mutations) => {
            // Verifica se os elementos âncora ainda existem antes de agir
            const originalSelectMotivo = document.getElementById(ID_SELECT_MOTIVO_ORIGINAL);
            const justificativaInputAlvo = document.getElementById(ID_INPUT_JUSTIFICATIVA_PAGINA);

            const uiExiste = !!document.getElementById(DROPDOWN_ID_NEURON);

            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                // Se os elementos âncora apareceram e a UI não existe, cria
                if (originalSelectMotivo && justificativaInputAlvo && !uiExiste) {
                    await criarOuAtualizarUIProrrogar();
                } else if (!originalSelectMotivo || !justificativaInputAlvo) {
                    // Se os elementos âncora desapareceram, remove a UI
                    removerElementosCriadosProrrogar();
                }
            } else {
                // Se o script não deve estar ativo, remove a UI
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
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer configurado para a página.`);
            }
        }, 100);
    }

    function desconectarObserverPrincipalProrrogar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null; 
            observerConfiguradoGlobal = false;
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer desconectado.`);
        }
    }

    // Listener para mudanças nas configurações globais ou nos modelos de texto
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && (changes[CONFIG_STORAGE_KEY_PRORROGAR] || changes[CUSTOM_TEXT_MODELS_STORAGE_KEY])) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração ou modelos de texto alterados. Reavaliando...`);
            await verificarEstadoAtualEAgirProrrogar();
        }
    });

    async function initProrrogar() {
        await new Promise(resolve => { 
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Página carregada. Inicializando...`);
        await verificarEstadoAtualEAgirProrrogar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initProrrogar();
    }
})();