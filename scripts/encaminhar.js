// Neuron 0.3.1/scripts/encaminhar.js - CENTRALIZED CONFIG
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'encaminhar';
    const SCRIPT_ID = 'encaminhar';
    const CONFIG_STORAGE_KEY_ENCAMINHAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_ENCAMINHAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownEncaminhar';
    const LABEL_ID_NEURON_CLASS = 'neuronLabelEncaminhar';
    const ID_CAMPO_ESFERA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbEsferaOuvidoriaDestino';
    const ID_NOTIFICACAO_DESTINATARIO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoDestinatario';
    const ID_NOTIFICACAO_SOLICITANTE_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoSolicitante';
    const ID_CAMPO_OUVIDORIA_DESTINO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbOuvidoriaDestino';
    const ID_NUMERO_MANIFESTACAO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    const URL_ALVO_DO_SCRIPT = 'EncaminharManifestacao.aspx';
    const STYLE_CLASS_NEURON = `neuron-${SCRIPT_NOME_PARA_LOG}-styles`;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsEncaminhar = {};

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;
    let ouvidoriaDestinoSelectObserver = null;
    let neuronDropdownElement = null;
    let neuronLabelElement = null;

    async function carregarConfiguracoesEncaminhar() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_ENCAMINHAR);
        let fullConfig = {};

        if (result[CONFIG_STORAGE_KEY_ENCAMINHAR] && typeof result[CONFIG_STORAGE_KEY_ENCAMINHAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_ENCAMINHAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_ENCAMINHAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_ENCAMINHAR}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {}, textModels: { Encaminhar: {} } };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        textModelsEncaminhar = fullConfig.textModels?.Encaminhar || {};

        if (Object.keys(textModelsEncaminhar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Encaminhar' não encontrada ou vazia.`);
            textModelsEncaminhar = { "Erro": { destinatario: "Modelos de encaminhamento não carregados.", solicitante: "Modelos de encaminhamento não carregados." } };
        }
    }

    function inserirEstilosNeuron() {
        if (document.querySelector('.' + STYLE_CLASS_NEURON)) return;
        const style = document.createElement('style');
        style.className = STYLE_CLASS_NEURON;
        style.textContent = `
            .${LABEL_ID_NEURON_CLASS} { display: block; margin-top: 15px; margin-bottom: 5px; font-weight: bold; color: #333; }
            #${DROPDOWN_ID_NEURON} { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; }
        `;
        document.head.appendChild(style);
    }
    function removerEstilosNeuron() {
        document.querySelector('.' + STYLE_CLASS_NEURON)?.remove();
    }

    function preencherTextosComBaseNoDropdown() {
        const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
        const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);

        if (!neuronDropdownElement || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) return;
        
        const selectedOptionValue = neuronDropdownElement.value;
        if (!selectedOptionValue) return;

        const textosSelecionados = textModelsEncaminhar[selectedOptionValue];
        if (!textosSelecionados || typeof textosSelecionados.destinatario === 'undefined' || typeof textosSelecionados.solicitante === 'undefined') return;
        
        const textoOuvidoriaDestino = campoOuvidoriaDestinoSelect?.selectedOptions[0]?.text.trim() || '{OUVIDORIA_DESTINO_NAO_SELECIONADA}';
        const numeroManifestacao = document.getElementById(ID_NUMERO_MANIFESTACAO_PAGINA)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        const novoTextoDestinatario = textosSelecionados.destinatario || '';
        if (notificacaoDestinatarioInput.value !== novoTextoDestinatario) {
            notificacaoDestinatarioInput.value = novoTextoDestinatario;
        }
        
        let textoSolicitanteFinal = textosSelecionados.solicitante || '';
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\{OUVIDORIA\}/g, textoOuvidoriaDestino);
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\$\{numeroManifestacao\}/g, numeroManifestacao); // Corrigido para ${} conforme config
        
        if (notificacaoSolicitanteInput.value !== textoSolicitanteFinal) {
            notificacaoSolicitanteInput.value = textoSolicitanteFinal;
        }
    }
    
    function desconectarObserverOuvidoriaDestino() {
        if (ouvidoriaDestinoSelectObserver) {
            ouvidoriaDestinoSelectObserver.disconnect();
            ouvidoriaDestinoSelectObserver = null;
        }
    }

    function removerElementosCriadosEncaminhar() {
        neuronDropdownElement?.remove();
        neuronLabelElement?.remove();
        neuronDropdownElement = null;
        neuronLabelElement = null;
        desconectarObserverOuvidoriaDestino();
    }

    function criarOuAtualizarUIEncaminhar() {
        if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            removerElementosCriadosEncaminhar();
            return;
        }

        const campoEsferaAncora = document.getElementById(ID_CAMPO_ESFERA_PAGINA);
        if (!campoEsferaAncora || !document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA) || !document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA)) {
            return;
        }

        let uiRecriada = false;
        if (neuronDropdownElement) {
            removerElementosCriadosEncaminhar();
            uiRecriada = true;
        }

        neuronLabelElement = document.createElement('label');
        neuronLabelElement.className = LABEL_ID_NEURON_CLASS;
        neuronLabelElement.textContent = 'Neuron - Modelos de Notificação:';
        neuronLabelElement.setAttribute('for', DROPDOWN_ID_NEURON);

        neuronDropdownElement = document.createElement('select');
        neuronDropdownElement.id = DROPDOWN_ID_NEURON;
        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Selecione um modelo...';
        neuronDropdownElement.appendChild(optDefault);

        Object.entries(textModelsEncaminhar).forEach(([chave, _objValue]) => {
            const option = document.createElement('option');
            option.value = chave;
            option.textContent = chave;
            neuronDropdownElement.appendChild(option);
        });

        neuronDropdownElement.addEventListener('change', preencherTextosComBaseNoDropdown);

        const parentOfAncora = campoEsferaAncora.parentNode;
        if (parentOfAncora) {
            parentOfAncora.insertBefore(neuronLabelElement, neuronDropdownElement.nextElementSibling);
            parentOfAncora.insertBefore(neuronDropdownElement, neuronLabelElement.nextElementSibling);
        } else {
            neuronLabelElement?.remove(); neuronDropdownElement?.remove();
            return;
        }

        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);
        if (campoOuvidoriaDestinoSelect) {
            desconectarObserverOuvidoriaDestino(); 
            ouvidoriaDestinoSelectObserver = new MutationObserver(preencherTextosComBaseNoDropdown);
            ouvidoriaDestinoSelectObserver.observe(campoOuvidoriaDestinoSelect, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'disabled'], characterData: true }); // Observar mais atributos
        }
        
        if (uiRecriada && neuronDropdownElement.value) {
            preencherTextosComBaseNoDropdown();
        }
        
        inserirEstilosNeuron();
    }

    async function verificarEstadoAtualEAgirEncaminhar() {
        await carregarConfiguracoesEncaminhar();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            criarOuAtualizarUIEncaminhar();
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalEncaminhar();
            }
        } else {
            removerElementosCriadosEncaminhar();
            removerEstilosNeuron();
            desconectarObserverPrincipalEncaminhar();
        }
    }

    function configurarObserverPrincipalEncaminhar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!document.getElementById(DROPDOWN_ID_NEURON)) {
                    criarOuAtualizarUIEncaminhar();
                }
            } else {
                removerElementosCriadosEncaminhar();
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

    function desconectarObserverPrincipalEncaminhar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            observerConfiguradoGlobal = false;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_ENCAMINHAR]) {
            verificarEstadoAtualEAgirEncaminhar();
        }
    });

    async function initEncaminhar() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgirEncaminhar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initEncaminhar();
    }
})();