(async function () {
    'use strict';

    const SCRIPT_ID = 'tramitar';
    const CONFIG_KEY = 'neuronUserConfig';
    
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';

    let config = {};

    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
    }

    function calcularData(tipoPrazo) {
        if (!window.DateUtils) return '';

        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        if (!spanPrazo?.innerText.trim()) return '';

        const prazoStr = spanPrazo.innerText.trim();
        const prazosSettings = config.prazosSettings || {};
        
        const offsetDays = parseInt(prazosSettings[tipoPrazo], 10);
        const useWorkingDays = prazosSettings.tratarNovoModoCalculo === 'diasUteis';
        
        const dataBase = window.DateUtils.parsearData(prazoStr);
        if (!dataBase) return '';

        const dataCalculada = useWorkingDays 
            ? window.DateUtils.adicionarDiasUteis(dataBase, offsetDays)
            : window.DateUtils.adicionarDiasCorridos(dataBase, offsetDays);
            
        const dataFinal = window.DateUtils.ajustarDataFinal(dataCalculada);

        return window.DateUtils.formatarData(dataFinal);
    }
    
    function preencherCamposDeData() {
        const prazoInternoCalculado = calcularData('tratarNovoPrazoInternoDias');
        const campoDataTratamento = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoDataTratamento) {
            campoDataTratamento.value = prazoInternoCalculado;
        }
    }

    function criarOuAtualizarUI() {
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (!mensagemField) return;

        removerElementosCriados();
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

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();

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