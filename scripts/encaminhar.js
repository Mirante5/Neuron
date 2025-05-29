// Neuron 0.1.5 β/scripts/encaminhar.js - REFATORADO COM JSON DINÂMICO
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'encaminhar';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_encaminhar';

    // IDs e Seletores da página e do script
    const DROPDOWN_ID_NEURON = 'neuronDropdownEncaminhar';
    const LABEL_ID_NEURON_CLASS = 'neuronLabelEncaminhar'; // Usaremos como classe
    const ID_CAMPO_ESFERA_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbEsferaOuvidoriaDestino'; // Âncora para inserção
    const ID_NOTIFICACAO_DESTINATARIO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoDestinatario';
    const ID_NOTIFICACAO_SOLICITANTE_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoSolicitante';
    const ID_CAMPO_OUVIDORIA_DESTINO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbOuvidoriaDestino'; // Observado para {OUVIDORIA}
    const ID_NUMERO_MANIFESTACAO_PAGINA = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero'; // Para ${numeroManifestacao}
    const URL_ALVO_DO_SCRIPT = 'EncaminharManifestacao.aspx';
    const STYLE_CLASS_NEURON = `neuron-${SCRIPT_NOME_PARA_LOG}-styles`;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let textConfig = { Encaminhar: {} }; // Configuração carregada

    let uiMutationObserver = null; // Observer principal do body
    let observerConfiguradoGlobal = false;
    let ouvidoriaDestinoSelectObserver = null; // Observer específico para o select de Ouvidoria Destino

    // Referências aos elementos da UI criados pelo Neuron
    let neuronDropdownElement = null;
    let neuronLabelElement = null;

    // --- Carregamento de Configuração JSON ---
    async function carregarTextConfigNeuron() {
        try {
            const storageResult = await chrome.storage.local.get('userTextJson');
            if (storageResult.userTextJson && typeof storageResult.userTextJson === 'string') {
                const parsedConfig = JSON.parse(storageResult.userTextJson);
                textConfig = parsedConfig;
            } else {
                const response = await fetch(chrome.runtime.getURL('config/text.json')); //
                if (!response.ok) throw new Error(`Erro HTTP ao carregar padrão: ${response.status}`);
                textConfig = await response.json(); //
            }
            if (!textConfig.Encaminhar) {
                textConfig.Encaminhar = {};
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Encaminhar' não encontrada no text.json.`);
            }
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar text.json:`, e);
            textConfig = { Encaminhar: { "Erro": { destinatario: "Erro", solicitante: "Erro" } } }; // Fallback
        }
    }

    // --- Estilos ---
    function inserirEstilosNeuron() { //
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

    // --- Lógica de Preenchimento de Campos ---
    function preencherTextosComBaseNoDropdown() {
        const notificacaoDestinatarioInput = document.getElementById(ID_NOTIFICACAO_DESTINATARIO_PAGINA);
        const notificacaoSolicitanteInput = document.getElementById(ID_NOTIFICACAO_SOLICITANTE_PAGINA);
        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);

        if (!neuronDropdownElement || !notificacaoDestinatarioInput || !notificacaoSolicitanteInput) {
            return;
        }
        
        const selectedOptionValue = neuronDropdownElement.value; // Chave do modelo
        if (!selectedOptionValue) { // Se "Selecione um modelo..." estiver marcado, não faz nada ou limpa.
                                    // Para evitar limpar digitação manual, só age se um modelo REAL for selecionado.
            // notificacaoDestinatarioInput.value = ''; // Opcional: limpar se "Selecione..."
            // notificacaoSolicitanteInput.value = ''; // Opcional: limpar se "Selecione..."
            return;
        }

        const textosSelecionados = textConfig.Encaminhar[selectedOptionValue];
        if (!textosSelecionados || typeof textosSelecionados.destinatario === 'undefined' || typeof textosSelecionados.solicitante === 'undefined') {
            return;
        }
        
        const textoOuvidoriaDestino = campoOuvidoriaDestinoSelect?.selectedOptions[0]?.text.trim() || '{OUVIDORIA_DESTINO_NAO_SELECIONADA}';
        const numeroManifestacao = document.getElementById(ID_NUMERO_MANIFESTACAO_PAGINA)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        const novoTextoDestinatario = textosSelecionados.destinatario || '';
        if (notificacaoDestinatarioInput.value !== novoTextoDestinatario) {
            notificacaoDestinatarioInput.value = novoTextoDestinatario;
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo Destinatário atualizado pelo Neuron.`);
        }
        
        let textoSolicitanteFinal = textosSelecionados.solicitante || '';
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\{OUVIDORIA\}/g, textoOuvidoriaDestino);
        textoSolicitanteFinal = textoSolicitanteFinal.replace(/\$\{numeroManifestacao\}/g, numeroManifestacao);
        
        if (notificacaoSolicitanteInput.value !== textoSolicitanteFinal) {
            notificacaoSolicitanteInput.value = textoSolicitanteFinal;
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Campo Solicitante atualizado pelo Neuron.`);
        }
    }
    
    // --- Criação e Remoção de UI ---
    function desconectarObserverOuvidoriaDestino() {
        if (ouvidoriaDestinoSelectObserver) {
            ouvidoriaDestinoSelectObserver.disconnect();
            ouvidoriaDestinoSelectObserver = null;
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Observer de Ouvidoria Destino desconectado.`);
        }
    }

    function removerElementosCriadosEncaminhar() {
        neuronDropdownElement?.remove();
        neuronLabelElement?.remove();
        neuronDropdownElement = null;
        neuronLabelElement = null;
        desconectarObserverOuvidoriaDestino();
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): UI de Encaminhamento removida.`);
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
        if (neuronDropdownElement) { // Remove para recriar, especialmente se JSON mudou
            removerElementosCriadosEncaminhar();
            uiRecriada = true; // Sinaliza que estamos recriando, não na primeira carga
        }
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Criando/Recriando UI de Encaminhamento.`);

        const encaminhamentosConfig = textConfig?.Encaminhar || {};
        // ... (criação de neuronLabelElement e neuronDropdownElement como antes) ...
        neuronLabelElement = document.createElement('label'); /* ... */ neuronLabelElement.className = LABEL_ID_NEURON_CLASS;  neuronLabelElement.textContent = 'Neuron - Modelos de Notificação:'; neuronLabelElement.setAttribute('for', DROPDOWN_ID_NEURON);
        neuronDropdownElement = document.createElement('select'); neuronDropdownElement.id = DROPDOWN_ID_NEURON;
        const optDefault = document.createElement('option'); optDefault.value = ''; optDefault.textContent = 'Selecione um modelo...'; neuronDropdownElement.appendChild(optDefault);
        Object.entries(encaminhamentosConfig).forEach(([chave, _objValue]) => {
            const option = document.createElement('option'); option.value = chave; option.textContent = chave; neuronDropdownElement.appendChild(option);
        });
        // Fim da criação


        neuronDropdownElement.addEventListener('change', preencherTextosComBaseNoDropdown);

        const parentOfAncora = campoEsferaAncora.parentNode;
        if (parentOfAncora) {
            parentOfAncora.insertBefore(neuronLabelElement, neuronDropdownElement.nextSibling);
            parentOfAncora.insertBefore(neuronDropdownElement, neuronLabelElement.nextSibling);
        } else {
            neuronLabelElement?.remove(); neuronDropdownElement?.remove();
            return;
        }

        const campoOuvidoriaDestinoSelect = document.getElementById(ID_CAMPO_OUVIDORIA_DESTINO_PAGINA);
        if (campoOuvidoriaDestinoSelect) {
            desconectarObserverOuvidoriaDestino(); 
            ouvidoriaDestinoSelectObserver = new MutationObserver(() => {
                preencherTextosComBaseNoDropdown(); 
            });
            ouvidoriaDestinoSelectObserver.observe(campoOuvidoriaDestinoSelect, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
        }
        
        // **NÃO** chama preencherTextosComBaseNoDropdown() automaticamente aqui.
        // Apenas se for a primeira vez E houver um valor padrão/salvo no dropdown Neuron.
        // Ou, mais simples: o usuário deve interagir com o dropdown Neuron para preencher.
        // Se a UI foi recriada E o dropdown Neuron JÁ TEM um valor selecionado, aí sim podemos repopular.
        if (uiRecriada && neuronDropdownElement.value) {
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): UI Recriada, dropdown Neuron tem valor, repopulando campos.`);
            preencherTextosComBaseNoDropdown();
        }
        
        inserirEstilosNeuron();
    }

    // --- Controle da Extensão e Observer Principal ---
    async function verificarEstadoAtualEAgirEncaminhar() {
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY, 'userTextJson']);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;

        await carregarTextConfigNeuron();

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
        if (namespace === 'local') {
            if (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY] || changes.userTextJson) {
                verificarEstadoAtualEAgirEncaminhar();
            }
        }
    });

    async function initEncaminhar() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgirEncaminhar();
    }

    if (window.location.href.includes(URL_ALVO_DO_SCRIPT)) { //
        initEncaminhar();
    }
})();