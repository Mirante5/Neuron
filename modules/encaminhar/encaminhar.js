// Neuron/scripts/encaminhar.js (Adaptado para novas configs)
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'encaminhar';
    const SCRIPT_ID = 'encaminhar';
    const CONFIG_STORAGE_KEY_ENCAMINHAR = 'neuronUserConfig'; // Chave geral da config principal
    const CUSTOM_TEXT_MODELS_STORAGE_KEY = 'customTextModels'; // Nova chave para modelos de texto customizados
    const DEFAULT_CONFIG_PATH_ENCAMINHAR = 'config/config.json'; // Caminho para a config padrão

    const DROPDOWN_ID_NEURON = 'neuronDropdownEncaminhar';
    const LABEL_CLASS_NEURON = 'neuronLabelEncaminhar'; 
    // IDs dos campos originais da página
    const ID_CAMPO_ESFERA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbEsferaOuvidoriaDestino';
    const ID_CAMPO_OUVIDORIA_DESTINO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbOuvidoriaDestino';
    const ID_NOTIFICACAO_DESTINATARIO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoDestinatario';
    const ID_NOTIFICACAO_SOLICITANTE_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoSolicitante';
    const ID_NUMERO_MANIFESTACAO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    
    const URL_ALVO_DO_SCRIPT = 'EncaminharManifestacao.aspx';
    const TEMPLATE_URL = chrome.runtime.getURL('modules/encaminhar/encaminhar.html');

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let customTextModels = {}; // Renomeado para customTextModels

    let uiMutationObserver = null;
    let observerConfiguradoGlobal = false;
    let ouvidoriaDestinoSelectObserver = null;

    let destinatarioManualmenteEditado = false;
    let solicitanteManualmenteEditado = false;

    async function carregarConfiguracoesEncaminhar() {
        // Carrega a configuração geral da extensão
        const resultGeneral = await chrome.storage.local.get(CONFIG_STORAGE_KEY_ENCAMINHAR);
        let fullConfig = {};
        if (resultGeneral[CONFIG_STORAGE_KEY_ENCAMINHAR] && typeof resultGeneral[CONFIG_STORAGE_KEY_ENCAMINHAR] === 'object') {
            fullConfig = resultGeneral[CONFIG_STORAGE_KEY_ENCAMINHAR];
        } else {
            // Fallback para o config.json padrão se a configuração geral não for encontrada
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_ENCAMINHAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_ENCAMINHAR}:`, e);
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
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_ENCAMINHAR));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                const defaultConfig = await response.json();
                customTextModels = defaultConfig.textModels || {}; // Pega a parte 'textModels' do config.json
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar modelos de texto padrão:`, e);
                customTextModels = {};
            }
        }

        // Garante que a seção 'Encaminhar' esteja acessível
        if (!customTextModels.Encaminhar || Object.keys(customTextModels.Encaminhar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Encaminhar' não encontrada ou vazia nos modelos de texto customizados/padrão.`);
            customTextModels.Encaminhar = { "Erro": { destinatario: "Modelos de encaminhamento não carregados.", solicitante: "Modelos de encaminhamento não carregados." } };
        }
    }

    function preencherTextosComBaseNoDropdown(dropdownElement) {
        const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
        const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);

        if (!dropdownElement || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) return;
        
        const selectedOptionValue = dropdownElement.value;
        if (!selectedOptionValue) {
            notificacaoDestinatarioInput.value = ''; // Limpa se nada selecionado
            notificacaoSolicitanteInput.value = ''; // Limpa se nada selecionado
            return;
        }

        // Os modelos de encaminhamento agora são objetos aninhados (ex: "Encaminhamento em geral": {destinatario: "...", solicitante: "..."})
        const textosSelecionados = customTextModels.Encaminhar[selectedOptionValue]; 
        
        // Verifica se o modelo selecionado é um objeto com as chaves 'destinatario' e 'solicitante'
        if (!textosSelecionados || typeof textosSelecionados.destinatario === 'undefined' || typeof textosSelecionados.solicitante === 'undefined') {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Modelo de encaminhamento selecionado ('${selectedOptionValue}') inválido ou incompleto.`);
            notificacaoDestinatarioInput.value = ''; 
            notificacaoSolicitanteInput.value = '';
            return;
        }
        
        const textoOuvidoriaDestino = campoOuvidoriaDestinoSelect?.selectedOptions[0]?.text.trim() || '{OUVIDORIA_DESTINO_NAO_SELECIONADA}';
        const numeroManifestacao = document.getElementById(ID_NUMERO_MANIFESTACAO_PAGINA)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        const novoTextoDestinatario = textosSelecionados.destinatario || '';
        if (!destinatarioManualmenteEditado) { // Preenche apenas se não foi editado manualmente
            notificacaoDestinatarioInput.value = novoTextoDestinatario;
        }
        
        let textoSolicitanteFinal = textosSelecionados.solicitante || '';
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\{OUVIDORIA\}/g, textoOuvidoriaDestino);
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\$\{numeroManifestacao\}/g, numeroManifestacao);
        
        if (!solicitanteManualmenteEditado) { // Preenche apenas se não foi editado manualmente
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
        const dropdownOuvidoriaDestino = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA); 
        const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
        const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
        let dropdownElement = document.getElementById(DROPDOWN_ID_NEURON); // Tenta pegar o elemento existente

        if (!dropdownOuvidoriaDestino || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Elementos cruciais da página (Ouvidoria Destino ou campos de texto) não encontrados.`);
            removerElementosCriadosEncaminhar(); // Remove se os alvos não estiverem presentes
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

                // Adiciona listeners UMA VEZ ao criar o elemento
                notificacaoDestinatarioInput.addEventListener('input', () => {
                    destinatarioManualmenteEditado = true;
                });
                notificacaoSolicitanteInput.addEventListener('input', () => {
                    solicitanteManualmenteEditado = true;
                });

                dropdownElement.addEventListener('change', () => {
                    // Reseta as flags de edição manual quando um modelo é selecionado
                    destinatarioManualmenteEditado = false;
                    solicitanteManualmenteEditado = false;
                    preencherTextosComBaseNoDropdown(dropdownElement);
                });
                
                const parentDoDropdownOuvidoria = dropdownOuvidoriaDestino.parentNode;
                if (parentDoDropdownOuvidoria) {
                    dropdownOuvidoriaDestino.after(dropdownElement);
                } else {
                    throw new Error('Nó pai do campo "Ouvidoria de Destino" não encontrado.');
                }

            } catch (error) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao criar UI a partir do template:`, error);
                return; // Sai da função se a criação falhar
            }
        } else {
            // Se o dropdown já existe, limpa as opções (exceto a primeira)
            dropdownElement.innerHTML = `<option value="">Neuron - Selecione um modelo de texto...</option>`;
            // Limpa os campos de texto alvo
            notificacaoDestinatarioInput.value = '';
            notificacaoSolicitanteInput.value = '';
            // Reseta flags de edição manual
            destinatarioManualmenteEditado = false;
            solicitanteManualmenteEditado = false;
        }

        // Popula/Atualiza as opções do dropdown
        // Itera sobre as chaves da seção 'Encaminhar' dos modelos de texto
        Object.entries(customTextModels.Encaminhar).forEach(([chave, _objValue]) => {
            const option = document.createElement('option');
            option.value = chave; // O valor da opção é a chave do modelo (ex: "Encaminhamento em geral")
            option.textContent = chave;
            dropdownElement.appendChild(option);
        });

        // Configura o observer para o campo de ouvidoria destino (se não estiver configurado)
        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);
        if (campoOuvidoriaDestinoSelect && !ouvidoriaDestinoSelectObserver) { // Verifica se observer já existe
            ouvidoriaDestinoSelectObserver = new MutationObserver(() => {
                preencherTextosComBaseNoDropdown(dropdownElement);
            });
            ouvidoriaDestinoSelectObserver.observe(campoOuvidoriaDestinoSelect, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'disabled', 'class'], characterData: true });
        }
        
        // Preenche os textos inicialmente se já houver uma seleção no dropdown do Neuron
        if (dropdownElement.value) {
            preencherTextosComBaseNoDropdown(dropdownElement);
        }
    }

    async function verificarEstadoAtualEAgirEncaminhar() {
        await carregarConfiguracoesEncaminhar();

        // Só tenta criar/atualizar a UI se o script estiver habilitado e na URL correta
        if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
            await criarOuAtualizarUIEncaminhar();
            // Configura o observer principal somente se ainda não estiver configurado
            if (!observerConfiguradoGlobal) {
                configurarObserverPrincipalEncaminhar();
            }
        } else {
            // Se o script não deve estar ativo, remove a UI e desconecta o observer
            removerElementosCriadosEncaminhar();
            desconectarObserverPrincipalEncaminhar();
        }
    }

    function configurarObserverPrincipalEncaminhar() {
        if (observerConfiguradoGlobal && uiMutationObserver) return;

        uiMutationObserver = new MutationObserver(async (mutations) => {
            const dropdownOuvidoriaDestino = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA); 
            const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
            const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
            const uiExiste = !!document.getElementById(DROPDOWN_ID_NEURON);

            if (currentMasterEnabled && currentScriptEnabled && window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
                // Se elementos âncora apareceram e UI não existe, cria
                if (dropdownOuvidoriaDestino && notificacaoDestinatarioInput && notificacaoSolicitanteInput && !uiExiste) { 
                    await criarOuAtualizarUIEncaminhar();
                } else if (!dropdownOuvidoriaDestino || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) {
                    // Se os elementos âncora desapareceram, remove a UI
                    removerElementosCriadosEncaminhar();
                }
            } else {
                // Se o script não deve estar ativo, remove a UI
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
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer configurado para a página.`);
            }
        }, 100);
    }

    function desconectarObserverPrincipalEncaminhar() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            observerConfiguradoGlobal = false;
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer desconectado.`);
        }
        desconectarObserverOuvidoriaDestino(); 
    }

    // Listener para mudanças nas configurações globais ou nos modelos de texto
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && (changes[CONFIG_STORAGE_KEY_ENCAMINHAR] || changes[CUSTOM_TEXT_MODELS_STORAGE_KEY])) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração ou modelos de texto alterados. Reavaliando...`);
            await verificarEstadoAtualEAgirEncaminhar();
        }
    });

    async function initEncaminhar() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Página carregada. Inicializando...`);
        await verificarEstadoAtualEAgirEncaminhar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) {
        initEncaminhar();
    }
})();