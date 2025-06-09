// Neuron/scripts/encaminhar.js
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'encaminhar';
    const SCRIPT_ID = 'encaminhar';
    const CONFIG_STORAGE_KEY_ENCAMINHAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_ENCAMINHAR = 'config/config.json';

    const DROPDOWN_ID_NEURON = 'neuronDropdownEncaminhar';
    const LABEL_CLASS_NEURON = 'neuronLabelEncaminhar'; 
    // IDs dos campos originais da página
    const ID_CAMPO_ESFERA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbEsferaOuvidoriaDestino';
    const ID_CAMPO_OUVIDORIA_DESTINO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbOuvidoriaDestino'; // "Dropdown Esfera"
    const ID_NOTIFICACAO_DESTINATARIO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoDestinatario';
    const ID_NOTIFICACAO_SOLICITANTE_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoSolicitante';
    const ID_NUMERO_MANIFESTACAO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    
    const URL_ALVO_DO_SCRIPT = 'EncaminharManifestacao.aspx';
    const TEMPLATE_URL = chrome.runtime.getURL('templates/encaminhar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textModelsEncaminhar = {};

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;
    let ouvidoriaDestinoSelectObserver = null;

    let destinatarioManualmenteEditado = false;
    let solicitanteManualmenteEditado = false;

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

    function preencherTextosComBaseNoDropdown(dropdownElement) {
        const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
        const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);

        if (!dropdownElement || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) return;
        
        const selectedOptionValue = dropdownElement.value;
        if (!selectedOptionValue) {
            return;
        }

        const textosSelecionados = textModelsEncaminhar[selectedOptionValue];
        if (!textosSelecionados || typeof textosSelecionados.destinatario === 'undefined' || typeof textosSelecionados.solicitante === 'undefined') return;
        
        const textoOuvidoriaDestino = campoOuvidoriaDestinoSelect?.selectedOptions[0]?.text.trim() || '{OUVIDORIA_DESTINO_NAO_SELECIONADA}';
        const numeroManifestacao = document.getElementById(ID_NUMERO_MANIFESTACAO_PAGINA)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        const novoTextoDestinatario = textosSelecionados.destinatario || '';
        if (!destinatarioManualmenteEditado && notificacaoDestinatarioInput.value !== novoTextoDestinatario) {
            notificacaoDestinatarioInput.value = novoTextoDestinatario;
        }
        
        let textoSolicitanteFinal = textosSelecionados.solicitante || '';
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\{OUVIDORIA\}/g, textoOuvidoriaDestino);
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\$\{numeroManifestacao\}/g, numeroManifestacao);
        
        if (!solicitanteManualmenteEditado && notificacaoSolicitanteInput.value !== textoSolicitanteFinal) {
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
        document.getElementById(DROPDOWN_ID_NEURON)?.remove();
        document.querySelector('.' + LABEL_CLASS_NEURON)?.remove();
        desconectarObserverOuvidoriaDestino();
    }

async function criarOuAtualizarUIEncaminhar() {
    if (!currentMasterEnabled || !currentScriptEnabled || !window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        removerElementosCriadosEncaminhar();
        return;
    }

    const dropdownOuvidoriaDestino = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA); 
    const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
    const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
    
    if (!dropdownOuvidoriaDestino || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) {
        console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos cruciais da página (Ouvidoria Destino ou campos de texto) não encontrados.`);
        return;
    }

    removerElementosCriadosEncaminhar(); 

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

        // MODIFICADO: A referência ao label foi removida.
        const dropdownElement = tempContainer.querySelector('#' + DROPDOWN_ID_NEURON);

        if (!dropdownElement) {
            throw new Error('Elemento dropdown não encontrado no template HTML processado.');
        }

        Object.entries(textModelsEncaminhar).forEach(([chave, _objValue]) => {
            const option = document.createElement('option');
            option.value = chave; 
            option.textContent = chave;
            dropdownElement.appendChild(option);
        });

        notificacaoDestinatarioInput.addEventListener('input', () => {
            destinatarioManualmenteEditado = true;
        });
        notificacaoSolicitanteInput.addEventListener('input', () => {
            solicitanteManualmenteEditado = true;
        });

        dropdownElement.addEventListener('change', () => {
            destinatarioManualmenteEditado = false;
            solicitanteManualmenteEditado = false;
            preencherTextosComBaseNoDropdown(dropdownElement);
        });
        
        // MODIFICADO: Lógica de inserção simplificada usando .after()
        const parentDoDropdownOuvidoria = dropdownOuvidoriaDestino.parentNode;
        if (parentDoDropdownOuvidoria) {
            // Insere o dropdown do Neuron logo após o dropdown de Ouvidoria de Destino.
            dropdownOuvidoriaDestino.after(dropdownElement);
        } else {
             throw new Error('Nó pai do campo "Ouvidoria de Destino" não encontrado.');
        }

        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);
        if (campoOuvidoriaDestinoSelect) {
            desconectarObserverOuvidoriaDestino(); 
            ouvidoriaDestinoSelectObserver = new MutationObserver(() => {
                preencherTextosComBaseNoDropdown(dropdownElement);
            });
            ouvidoriaDestinoSelectObserver.observe(campoOuvidoriaDestinoSelect, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'disabled', 'class'], characterData: true });
        }
        
        if (dropdownElement.value) {
            preencherTextosComBaseNoDropdown(dropdownElement);
        }

    } catch (error) {
        console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao criar UI a partir do template:`, error);
    }
}

    async function verificarEstadoAtualEAgirEncaminhar() {
        await carregarConfiguracoesEncaminhar();

        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            await criarOuAtualizarUIEncaminhar();
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalEncaminhar();
            }
        } else {
            removerElementosCriadosEncaminhar();
            desconectarObserverPrincipalEncaminhar();
        }
    }

    function configurarObserverPrincipalEncaminhar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(async () => {
            const uiExiste = !!document.getElementById(DROPDOWN_ID_NEURON);
            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                if (!uiExiste) { 
                    await criarOuAtualizarUIEncaminhar();
                }
            } else {
                if (uiExiste) { 
                    removerElementosCriadosEncaminhar();
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

    function desconectarObserverPrincipalEncaminhar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            observerConfiguradoGlobal = false;
        }
        desconectarObserverOuvidoriaDestino(); 
    }

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_ENCAMINHAR]) {
            await verificarEstadoAtualEAgirEncaminhar();
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