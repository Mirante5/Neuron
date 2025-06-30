/**
 * @file tramitar.js
 * @version 5.0 (Refatoração Final para Usar DateUtils)
 * @description Versão final que depende exclusivamente do date_utils.js para todos os cálculos de data.
 */

(async function () {
    'use strict';

    // --- Constantes ---
    const SCRIPT_ID = 'tramitar';
    const CONFIG_KEY = 'neuronUserConfig';
    
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';

    // --- Variáveis de Estado ---
    let config = {};

    // --- Lógica de Configuração e Inicialização ---
    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }

    // --- LÓGICA DE DATAS (AGORA 100% DEPENDENTE DE DATEUTILS) ---
    function calcularData(tipoPrazo) {
        // Garante que o DateUtils está pronto
        if (!window.DateUtils) return '';

        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        if (!spanPrazo?.innerText.trim()) return '';

        const prazoStr = spanPrazo.innerText.trim();
        const prazosSettings = config.prazosSettings || {};
        
        // Determina o offset e o modo de cálculo com base no tipo de prazo solicitado
        const offsetDays = parseInt(prazosSettings[tipoPrazo], 10);
        const useWorkingDays = prazosSettings.tratarNovoModoCalculo === 'diasUteis';
        
        const dataBase = window.DateUtils.parsearData(prazoStr);
        if (!dataBase) return '';

        // Chama as funções corretas do DateUtils
        const dataCalculada = useWorkingDays 
            ? window.DateUtils.adicionarDiasUteis(dataBase, offsetDays)
            : window.DateUtils.adicionarDiasCorridos(dataBase, offsetDays);
            
        const dataFinal = window.DateUtils.ajustarDataFinal(dataCalculada);

        return window.DateUtils.formatarData(dataFinal);
    }
    
    function preencherCamposDeData() {
        // Calcula e preenche o Prazo Interno
        const prazoInternoCalculado = calcularData('tratarNovoPrazoInternoDias');
        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoDataTratamento) {
            campoDataTratamento.value = prazoInternoCalculado;
        }

        // Você poderia facilmente preencher outros campos de data aqui, se necessário.
        // Ex: const prazoCobranca = calcularData('tratarNovoCobrancaInternaDias');
        //    document.getElementById('outro_campo_data').value = prazoCobranca;
    }


    // --- Lógica da UI ---
    function criarOuAtualizarUI() {
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (!mensagemField) return;

        removerElementosCriados();
        
        // Preenche as datas ANTES de criar os modelos de texto
        preencherCamposDeData();

        const modelos = config.textModels?.Tramitar;
        if (!modelos || Object.keys(modelos).length === 0) {
            return;
        }

        const selectContainer = document.createElement('div');
        selectContainer.id = 'neuronSelectMensagensTramitarContainer';
        selectContainer.className = 'form-group';
        
        const selectElement = document.createElement('select');
        selectElement.id = 'neuronSelectMensagensTramitar';
        selectElement.className = 'form-control';
        
        selectElement.innerHTML = '<option value="">Neuron: Selecione um modelo de mensagem...</option>';

        Object.keys(modelos).sort().forEach(chave => {
            const option = document.createElement('option');
            option.value = chave;
            option.textContent = chave;
            selectElement.appendChild(option);
        });

        selectElement.addEventListener('change', function () {
            if (!this.value) {
                mensagemField.value = '';
                return;
            }
            // Pega a data já calculada do campo
            const dataLimite = document.getElementById(ID_CAMPO_DATA_TRATAMENTO)?.value || ''; 
            const secretariaTag = document.getElementById(ID_CAMPO_TAGS_INFO)?.value || '{SECRETARIA}';
            
            let templateText = modelos[this.value] || '';
            templateText = templateText.replace(/\{SECRETARIA\}/g, secretariaTag);
            templateText = templateText.replace(/\{PRAZO\}/g, dataLimite);
            mensagemField.value = templateText;
        });
        
        selectContainer.appendChild(selectElement);
        mensagemField.parentNode.insertBefore(selectContainer, mensagemField);
    }

    function removerElementosCriados() {
        document.getElementById('neuronSelectMensagensTramitarContainer')?.remove();
    }

    // --- Controle Principal ---
    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();

        // Espera o DateUtils estar pronto antes de continuar
        if (window.DateUtils && typeof window.DateUtils.ready.then === 'function') {
            await window.DateUtils.ready;
        }

        if (isScriptAtivo()) {
            criarOuAtualizarUI();
        } else {
            removerElementosCriados();
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        await verificarEstadoAtualEAgir();
    }

    init();

})();