// Neuron/scripts/arquivar.js - HTML Externalizado para template (Corrigido Duplicação)
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'arquivar';
    const SCRIPT_ID = 'arquivar';
    const CONFIG_STORAGE_KEY_ARQUIVAR = 'neuronUserConfig';
    const CUSTOM_TEXT_MODELS_STORAGE_KEY = 'customTextModels';
    const DEFAULT_CONFIG_PATH_ARQUIVAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar';
    const LABEL_CLASS_NEURON = 'neuronLabelArquivar';
    const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
    const INPUT_JUSTIFICATIVA_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
    const NUMERO_MANIFESTACAO_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    const URL_ALVO_DO_SCRIPT = 'ArquivarManifestacao.aspx';
    const TEMPLATE_URL = chrome.runtime.getURL('modules/arquivar/arquivar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let customTextModels = {};

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;

    async function carregarConfiguracoesArquivar() {
        const resultGeneral = await chrome.storage.local.get(CONFIG_STORAGE_KEY_ARQUIVAR);
        let fullConfig = {};
        if (resultGeneral[CONFIG_STORAGE_KEY_ARQUIVAR] && typeof resultGeneral[CONFIG_STORAGE_KEY_ARQUIVAR] === 'object') {
            fullConfig = resultGeneral[CONFIG_STORAGE_KEY_ARQUIVAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_ARQUIVAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_ARQUIVAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {} };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;

        const resultTextModels = await chrome.storage.local.get(CUSTOM_TEXT_MODELS_STORAGE_KEY);
        if (resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] && typeof resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY] === 'object') {
            customTextModels = resultTextModels[CUSTOM_TEXT_MODELS_STORAGE_KEY];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_ARQUIVAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                const defaultConfig = await response.json();
                customTextModels = defaultConfig.textModels || {};
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar modelos de texto padrão:`, e);
                customTextModels = {};
            }
        }

        if (!customTextModels.Arquivar || Object.keys(customTextModels.Arquivar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Arquivar' não encontrada ou vazia nos modelos de texto customizados/padrão.`);
            customTextModels.Arquivar = { "Erro": "Modelos de arquivamento não carregados." };
        }
    }

    function removerElementosCriadosArquivar() {
        document.getElementById(DROPDOWN_ID_NEURON)?.remove();
        document.querySelector('.' + LABEL_CLASS_NEURON)?.remove();
    }

    async function criarOuAtualizarUIArquivar() {
        const motivoArquivamentoSelectAncora = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
        const justificativaInputAlvo = document.getElementById(INPUT_JUSTIFICATIVA_ID_PAGINA);
        const numeroManifestacaoElement = document.getElementById(NUMERO_MANIFESTACAO_ID_PAGINA);
        let dropdownElement = document.getElementById(DROPDOWN_ID_NEURON); // Tenta pegar o elemento existente

        if (!motivoArquivamentoSelectAncora || !justificativaInputAlvo || !numeroManifestacaoElement) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora ou alvo não encontrados. UI não será criada/atualizada.`);
            removerElementosCriadosArquivar(); // Remove se os alvos não estiverem presentes
            return;
        }
        
        // Se o dropdown não existe, cria-o
        if (!dropdownElement) {
            try {
                const response = await fetch(TEMPLATE_URL);
                if (!response.ok) {
                    throw new Error(`Erro HTTP ao carregar template: ${response.status} ${response.statusText}`);
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

                const parentOfAncora = motivoArquivamentoSelectAncora.parentNode;
                if (parentOfAncora) {
                    motivoArquivamentoSelectAncora.after(dropdownElement);
                } else {
                    throw new Error('Nó pai do select de motivo de arquivamento não encontrado.');
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
        const numeroManifestacao = numeroManifestacaoElement.innerText.trim() || '{NUP_NAO_ENCONTRADO}';
        Object.entries(customTextModels.Arquivar).forEach(([key, textoTemplate]) => {
            const option = document.createElement('option');
            let textoFinalOpcao = textoTemplate;
            if (typeof textoTemplate === 'string') {
                textoFinalOpcao = textoTemplate.replace(/\(NUP\)/g, `(${numeroManifestacao})`);
            }
            option.value = textoFinalOpcao;
            option.textContent = key;
            dropdownElement.appendChild(option);
        });
    }

    async function verificarEstadoAtualEAgirArquivar() {
        await carregarConfiguracoesArquivar();

        // Só tenta criar/atualizar a UI se o script estiver habilitado e na URL correta
        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            await criarOuAtualizarUIArquivar();
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalArquivar();
            }
        } else {
            // Se o script não deve estar ativo, remove a UI e desconecta o observer
            removerElementosCriadosArquivar();
            desconectarObserverPrincipalArquivar();
        }
    }

    function configurarObserverPrincipalArquivar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(async (mutations) => {
            // Verifica se os elementos âncora ainda existem antes de agir
            const motivoArquivamentoSelectAncora = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
            const justificativaInputAlvo = document.getElementById(INPUT_JUSTIFICATIVA_ID_PAGINA);
            const numeroManifestacaoElement = document.getElementById(NUMERO_MANIFESTACAO_ID_PAGINA);

            const uiExiste = !!document.getElementById(DROPDOWN_ID_NEURON);

            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                // Se os elementos âncora apareceram e a UI não existe, cria
                if (motivoArquivamentoSelectAncora && justificativaInputAlvo && numeroManifestacaoElement && !uiExiste) {
                    await criarOuAtualizarUIArquivar();
                } else if (!motivoArquivamentoSelectAncora || !justificativaInputAlvo || !numeroManifestacaoElement) {
                    // Se os elementos âncora desapareceram (página mudou dinamicamente ou renderizou diferente), remove a UI
                    removerElementosCriadosArquivar();
                }
            } else {
                // Se o script não deve estar ativo, remove a UI
                if (uiExiste) {
                    removerElementosCriadosArquivar();
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

    function desconectarObserverPrincipalArquivar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            observerConfiguradoGlobal = false;
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer desconectado.`);
        }
    }

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && (changes[CONFIG_STORAGE_KEY_ARQUIVAR] || changes[CUSTOM_TEXT_MODELS_STORAGE_KEY])) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração ou modelos de texto alterados. Reavaliando...`);
            await verificarEstadoAtualEAgirArquivar();
        }
    });

    async function initArquivar() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                return resolve();
            }
            window.addEventListener('load', resolve, { once: true });
        });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Página carregada. Inicializando...`);
        await verificarEstadoAtualEAgirArquivar();
    }

    // Inicia o script somente se estiver na URL alvo
    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initArquivar();
    }
})();