(async function () {
    'use strict';

    const SCRIPT_ID = 'encaminhar';
    const CONFIG_KEY = 'neuronUserConfig';

    const DROPDOWN_ID_NEURON = 'neuronDropdownEncaminhar';
    const OUVIDORIA_DESTINO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbOuvidoriaDestino';
    const DESTINATARIO_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoDestinatario';
    const SOLICITANTE_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoSolicitante';
    const NUMERO_MANIFESTACAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
    
    let config = {};
    let uiMutationObserver = null;
    let ouvidoriaDestinoSelectObserver = null;
    let destinatarioManualmenteEditado = false;
    let solicitanteManualmenteEditado = false;

    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY];
        console.log(`[Neuron|${SCRIPT_ID}] Configurações carregadas.`);
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron && config.featureSettings?.[SCRIPT_ID]?.enabled;
    }

    function preencherTextosComBaseNoDropdown(dropdownElement) {
        const destinatarioInput = document.getElementById(DESTINATARIO_TEXTAREA_ID);
        const solicitanteInput = document.getElementById(SOLICITANTE_TEXTAREA_ID);
        const ouvidoriaSelect = document.getElementById(OUVIDORIA_DESTINO_ID);

        if (!dropdownElement || !destinatarioInput || !solicitanteInput) return;
        
        const modeloKey = dropdownElement.value;
        if (!modeloKey) {
            if (!destinatarioManualmenteEditado) destinatarioInput.value = '';
            if (!solicitanteManualmenteEditado) solicitanteInput.value = '';
            return;
        }

        const modelo = config.textModels?.Encaminhar?.[modeloKey];
        if (!modelo) {
            console.warn(`[Neuron|${SCRIPT_ID}] Modelo "${modeloKey}" não encontrado.`);
            return;
        }
        
        const textoOuvidoria = ouvidoriaSelect?.selectedOptions[0]?.text.trim() || '{OUVIDORIA_DESTINO}';
        const numeroManifestacao = document.getElementById(NUMERO_MANIFESTACAO_ID)?.innerText.trim() || '{NUP}';

        if (!destinatarioManualmenteEditado) {
            let textoDestinatario = modelo.destinatario || '';
            textoDestinatario = textoDestinatario.replace(/\{OUVIDORIA\}/g, textoOuvidoria).replace(/\$\{numeroManifestacao\}/g, numeroManifestacao);
            destinatarioInput.value = textoDestinatario;
        }
        
        if (!solicitanteManualmenteEditado) {
            let textoSolicitante = modelo.solicitante || '';
            textoSolicitante = textoSolicitante.replace(/\{OUVIDORIA\}/g, textoOuvidoria).replace(/\$\{numeroManifestacao\}/g, numeroManifestacao);
            solicitanteInput.value = textoSolicitante;
        }
    }

    function criarOuAtualizarUI() {
        const ouvidoriaAncora = document.getElementById(OUVIDORIA_DESTINO_ID);
        if (!ouvidoriaAncora) return;
        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        removerElementosCriados();

        const container = document.createElement('div');
        container.className = 'form-group neuron-encaminhar-container';
        
        const label = document.createElement('label');
        label.htmlFor = DROPDOWN_ID_NEURON;
        label.textContent = 'Modelos de Texto (Neuron):';
        
        const dropdown = document.createElement('select');
        dropdown.id = DROPDOWN_ID_NEURON;
        dropdown.className = 'form-control';
        
        container.appendChild(label);
        container.appendChild(dropdown);
        
        dropdown.innerHTML = '<option value="">Selecione um modelo...</option>';
        const modelos = config.textModels?.Encaminhar || { "Erro": {} };
        for (const key in modelos) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            dropdown.appendChild(option);
        }

        dropdown.addEventListener('change', () => {
            destinatarioManualmenteEditado = false;
            solicitanteManualmenteEditado = false;
            preencherTextosComBaseNoDropdown(dropdown);
        });

        ouvidoriaAncora.parentElement.appendChild(container);

        document.getElementById(DESTINATARIO_TEXTAREA_ID)?.addEventListener('input', () => destinatarioManualmenteEditado = true, { once: true });
        document.getElementById(SOLICITANTE_TEXTAREA_ID)?.addEventListener('input', () => solicitanteManualmenteEditado = true, { once: true });

        if (ouvidoriaAncora && !ouvidoriaDestinoSelectObserver) {
            ouvidoriaDestinoSelectObserver = new MutationObserver(() => preencherTextosComBaseNoDropdown(dropdown));
            ouvidoriaDestinoSelectObserver.observe(ouvidoriaAncora, { childList: true, subtree: true });
        }
    }

    function removerElementosCriados() {
        document.querySelector('.neuron-encaminhar-container')?.remove();
        if (ouvidoriaDestinoSelectObserver) {
            ouvidoriaDestinoSelectObserver.disconnect();
            ouvidoriaDestinoSelectObserver = null;
        }
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();
        if (isScriptAtivo()) {
            criarOuAtualizarUI();
            configurarObserverDaPagina();
        } else {
            removerElementosCriados();
            desconectarObserverDaPagina();
        }
    }

    function configurarObserverDaPagina() {
        if (uiMutationObserver) return;
        
        uiMutationObserver = new MutationObserver(() => {
            if (isScriptAtivo()) criarOuAtualizarUI();
            else removerElementosCriados();
        });
        
        uiMutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        await new Promise(resolve => {
            if (document.readyState !== 'loading') resolve();
            else window.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
        verificarEstadoAtualEAgir();
    }
    
    init();
})();