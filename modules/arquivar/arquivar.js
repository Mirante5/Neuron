(async function () {
    'use strict';

    const SCRIPT_ID = 'arquivar';
    const CONFIG_KEY = 'neuronUserConfig';

    const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar';
    const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
    const INPUT_JUSTIFICATIVA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
    const NUMERO_MANIFESTACAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';

    let config = {};
    let uiMutationObserver = null;

    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`[Neuron|${SCRIPT_ID}] Configurações carregadas.`);
    }

    function isScriptAtivo() {
        return config.masterEnableNeuron && config.featureSettings?.[SCRIPT_ID]?.enabled;
    }

    function criarOuAtualizarUI() {
        const motivoAncora = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
        const justificativaInput = document.getElementById(INPUT_JUSTIFICATIVA_ID);
        if (!motivoAncora || !justificativaInput) return;

        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        removerElementosCriados();

        const container = document.createElement('div');
        container.className = 'form-group';
        
        const label = document.createElement('label');
        label.className = 'neuronLabelArquivar';
        label.htmlFor = DROPDOWN_ID_NEURON;
        label.textContent = 'Modelos de Texto (Neuron):';
        
        const dropdown = document.createElement('select');
        dropdown.id = DROPDOWN_ID_NEURON;
        dropdown.className = 'form-control';
        
        container.appendChild(label);
        container.appendChild(dropdown);

        dropdown.innerHTML = '<option value="">Selecione um modelo...</option>';
        
        const modelosArquivar = config.textModels?.Arquivar || { "Erro": "Modelos de arquivamento não carregados." };
        const numeroManifestacao = document.getElementById(NUMERO_MANIFESTACAO_ID)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        for (const [key, textoTemplate] of Object.entries(modelosArquivar)) {
            const option = document.createElement('option');
            const textoFinal = String(textoTemplate).replace(/\(NUP\)/g, `(${numeroManifestacao})`);
            option.value = textoFinal;
            option.textContent = key;
            dropdown.appendChild(option);
        }

        dropdown.addEventListener('change', (e) => {
            if (justificativaInput) {
                justificativaInput.value = e.target.value;
                justificativaInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        motivoAncora.parentElement.insertAdjacentElement('afterend', container);
        console.log(`[Neuron|${SCRIPT_ID}] UI de arquivamento criada.`);
    }

    function removerElementosCriados() {
        const elemento = document.getElementById(DROPDOWN_ID_NEURON);
        if (elemento) {
            elemento.parentElement.remove();
            console.log(`[Neuron|${SCRIPT_ID}] UI removida da página.`);
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

        const observerAlvo = document.body;
        
        uiMutationObserver = new MutationObserver(() => {
            if (isScriptAtivo()) {
                criarOuAtualizarUI();
            } else {
                removerElementosCriados();
            }
        });
        
        uiMutationObserver.observe(observerAlvo, { childList: true, subtree: true });
        console.log(`[Neuron|${SCRIPT_ID}] Observer da página configurado.`);
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            console.log(`[Neuron|${SCRIPT_ID}] Observer DESCONECTADO.`);
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            console.warn(`[Neuron|${SCRIPT_ID}] Configuração alterada. Reavaliando...`);
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        verificarEstadoAtualEAgir();
    }

    init();

})();