// Neuron/scripts/arquivar.js - HTML Externalizado para template
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'arquivar';
    const SCRIPT_ID = 'arquivar';
    const CONFIG_STORAGE_KEY_ARQUIVAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_ARQUIVAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar'; // Usado para querySelector no template
    const LABEL_CLASS_NEURON = 'neuronLabelArquivar'; // Usado para querySelector no template
    const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
    const INPUT_JUSTIFICATIVA_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
    const NUMERO_MANIFESTACAO_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    const URL_ALVO_DO_SCRIPT = 'ArquivarManifestacao.aspx';
    const TEMPLATE_URL = chrome.runtime.getURL('templates/arquivar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsArquivar = {};

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;

    async function carregarConfiguracoesArquivar() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_ARQUIVAR);
        let fullConfig = {};

        if (result[CONFIG_STORAGE_KEY_ARQUIVAR] && typeof result[CONFIG_STORAGE_KEY_ARQUIVAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_ARQUIVAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_ARQUIVAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_ARQUIVAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {}, textModels: { Arquivar: {} } };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        textModelsArquivar = fullConfig.textModels?.Arquivar || {};

        if (Object.keys(textModelsArquivar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Arquivar' não encontrada ou vazia nos modelos de texto.`);
            textModelsArquivar = { "Erro": "Modelos de arquivamento não carregados." };
        }
    }

    function removerElementosCriadosArquivar() {
        // Remove os elementos pela ID e classe que seriam definidos no template
        document.getElementById(DROPDOWN_ID_NEURON)?.remove();
        document.querySelector('.' + LABEL_CLASS_NEURON)?.remove(); // Assume que só haverá um com essa classe
    }

async function criarOuAtualizarUIArquivar() {
    if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        removerElementosCriadosArquivar();
        return;
    }

    const motivoArquivamentoSelectAncora = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
    const justificativaInputAlvo = document.getElementById(INPUT_JUSTIFICATIVA_ID_PAGINA);
    const numeroManifestacaoElement = document.getElementById(NUMERO_MANIFESTACAO_ID_PAGINA);

    if (!motivoArquivamentoSelectAncora || !justificativaInputAlvo || !numeroManifestacaoElement) {
        console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos âncora ou alvo não encontrados. UI não será criada/atualizada.`);
        return;
    }
    
    removerElementosCriadosArquivar();

    try {
        const response = await fetch(TEMPLATE_URL);
        if (!response.ok) {
            throw new Error(`Erro HTTP ao carregar template: ${response.status} ${response.statusText}`);
        }
        let htmlTemplate = await response.text();

        // MODIFICADO: A substituição do placeholder do label foi removida.
        htmlTemplate = htmlTemplate.replace('{{DEFAULT_OPTION_TEXT}}', 'Neuron - Selecione um modelo de texto...');

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = htmlTemplate;

        const dropdownElement = tempContainer.querySelector('#' + DROPDOWN_ID_NEURON);

        if (!dropdownElement) {
            throw new Error('Elemento dropdown não encontrado no template HTML processado.');
        }

        const numeroManifestacao = numeroManifestacaoElement.innerText.trim() || '{NUP_NAO_ENCONTRADO}';
        Object.entries(textModelsArquivar).forEach(([key, textoTemplate]) => {
            const option = document.createElement('option');
            let textoFinalOpcao = textoTemplate;
            if (typeof textoTemplate === 'string') {
                textoFinalOpcao = textoTemplate.replace(/\(NUP\)/g, `(${numeroManifestacao})`);
            }
            option.value = textoFinalOpcao;
            option.textContent = key;
            dropdownElement.appendChild(option);
        });

        dropdownElement.addEventListener('change', function () {
            if (justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
        });

        // MODIFICADO: Lógica de inserção usando .after() para maior clareza.
        const parentOfAncora = motivoArquivamentoSelectAncora.parentNode;
        if (parentOfAncora) {
            // Insere o dropdown do Neuron logo após o select original.
            motivoArquivamentoSelectAncora.after(dropdownElement);
        } else {
            throw new Error('Nó pai do select de motivo de arquivamento não encontrado.');
        }

    } catch (error) {
        console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao criar UI a partir do template:`, error);
    }
}

    async function verificarEstadoAtualEAgirArquivar() {
        await carregarConfiguracoesArquivar();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            await criarOuAtualizarUIArquivar(); // Adicionado await pois criarOuAtualizarUI é async
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalArquivar();
            }
        } else {
            removerElementosCriadosArquivar();
            desconectarObserverPrincipalArquivar();
        }
    }

    function configurarObserverPrincipalArquivar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(async () => { // Adicionado async
            const uiExiste = !!document.getElementById(DROPDOWN_ID_NEURON);

            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!uiExiste) {
                    await criarOuAtualizarUIArquivar(); // Adicionado await
                }
            } else {
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
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_ARQUIVAR]) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração alterada. Reavaliando...`);
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

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initArquivar();
    }
})();