// Neuron 0.3.1/scripts/arquivar.js - CENTRALIZED CONFIG
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'arquivar';
    const SCRIPT_ID = 'arquivar'; // Usado para buscar config.featureSettings[SCRIPT_ID]
    const CONFIG_STORAGE_KEY_ARQUIVAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_ARQUIVAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar';
    const LABEL_CLASS_NEURON = 'neuronLabelArquivar';
    const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
    const INPUT_JUSTIFICATIVA_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
    const NUMERO_MANIFESTACAO_ID_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    const URL_ALVO_DO_SCRIPT = 'ArquivarManifestacao.aspx';
    const STYLE_CLASS_NEURON = `neuron-${SCRIPT_NOME_PARA_LOG}-styles`;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsArquivar = {}; // Apenas a seção "Arquivar" dos modelos de texto

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;
    let neuronDropdownElement = null;
    let neuronLabelElement = null;

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
                // Define um fallback mínimo para evitar que a extensão quebre completamente
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

    function inserirEstilosNeuron() {
        if (document.querySelector('.' + STYLE_CLASS_NEURON)) return;
        const style = document.createElement('style');
        style.className = STYLE_CLASS_NEURON;
        style.textContent = `
            .${LABEL_CLASS_NEURON} { display: block; margin-top: 15px; margin-bottom: 5px; font-weight: bold; color: #333; }
            #${DROPDOWN_ID_NEURON} { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; }
        `;
        document.head.appendChild(style);
    }

    function removerEstilosNeuron() {
        document.querySelector('.' + STYLE_CLASS_NEURON)?.remove();
    }

    function removerElementosCriadosArquivar() {
        neuronDropdownElement?.remove();
        neuronLabelElement?.remove();
        neuronDropdownElement = null;
        neuronLabelElement = null;
    }

    function criarOuAtualizarUIArquivar() {
        if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            removerElementosCriadosArquivar();
            return;
        }

        const motivoArquivamentoLabelAncora = document.querySelector(`label[for="${LABEL_FOR_MOTIVO_ORIGINAL}"]`);
        const justificativaInputAlvo = document.getElementById(INPUT_JUSTIFICATIVA_ID_PAGINA);
        const numeroManifestacaoElement = document.getElementById(NUMERO_MANIFESTACAO_ID_PAGINA);

        if (!motivoArquivamentoLabelAncora || !justificativaInputAlvo || !numeroManifestacaoElement) {
            return;
        }
        
        if (neuronDropdownElement) {
            removerElementosCriadosArquivar();
        }

        const numeroManifestacao = numeroManifestacaoElement.innerText.trim() || '{NUP_NAO_ENCONTRADO}';
        
        neuronLabelElement = document.createElement('label');
        neuronLabelElement.setAttribute('for', DROPDOWN_ID_NEURON);
        neuronLabelElement.textContent = 'Neuron - Justificativa Pré-definida:';
        neuronLabelElement.className = LABEL_CLASS_NEURON;

        neuronDropdownElement = document.createElement('select');
        neuronDropdownElement.id = DROPDOWN_ID_NEURON;

        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Selecione uma justificativa...';
        neuronDropdownElement.appendChild(optDefault);

        Object.entries(textModelsArquivar).forEach(([key, textoTemplate]) => {
            const option = document.createElement('option');
            let textoFinalOpcao = textoTemplate;
            if (typeof textoTemplate === 'string') {
                 textoFinalOpcao = textoTemplate.replace(/\(NUP\)/g, `(${numeroManifestacao})`);
            }
            option.value = textoFinalOpcao; 
            option.textContent = key;
            neuronDropdownElement.appendChild(option);
        });

        neuronDropdownElement.addEventListener('change', function () {
            if(justificativaInputAlvo) justificativaInputAlvo.value = this.value || '';
        });

        const parentOfAncora = motivoArquivamentoLabelAncora.parentNode;
        if (parentOfAncora) {
            // Insere o label antes do select original, e o dropdown Neuron depois do label Neuron
            parentOfAncora.insertBefore(neuronLabelElement, neuronDropdownElement.nextElementSibling);
            parentOfAncora.insertBefore(neuronDropdownElement, neuronLabelElement.nextElementSibling);

        } else {
             neuronLabelElement?.remove(); neuronDropdownElement?.remove();
             return;
        }
        inserirEstilosNeuron();
    }

    async function verificarEstadoAtualEAgirArquivar() {
        await carregarConfiguracoesArquivar();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            criarOuAtualizarUIArquivar();
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalArquivar();
            }
        } else {
            removerElementosCriadosArquivar();
            removerEstilosNeuron();
            desconectarObserverPrincipalArquivar();
        }
    }

    function configurarObserverPrincipalArquivar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!document.getElementById(DROPDOWN_ID_NEURON)) {
                    criarOuAtualizarUIArquivar();
                }
            } else {
                removerElementosCriadosArquivar();
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

    function desconectarObserverPrincipalArquivar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            observerConfiguradoGlobal = false;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_ARQUIVAR]) {
            verificarEstadoAtualEAgirArquivar();
        }
    });

    async function initArquivar() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgirArquivar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initArquivar();
    }
})();