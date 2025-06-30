/**
 * @file arquivar.js
 * @version 2.1 (Lógica Simplificada)
 * @description Injeta a UI na página "Arquivar Manifestação", utilizando a configuração centralizada.
 */

(async function () {
    'use strict';

    // --- Constantes de Configuração e Metadados ---
    const SCRIPT_ID = 'arquivar';
    const CONFIG_KEY = 'neuronUserConfig';

    // --- Constantes de Seletores do DOM ---
    const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar';
    const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
    const INPUT_JUSTIFICATIVA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
    const NUMERO_MANIFESTACAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';

    // --- Variáveis de Estado ---
    let config = {}; // Armazena a configuração completa.
    let uiMutationObserver = null;

    /**
     * Carrega a configuração unificada diretamente do storage.
     */
    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        // Garante que config seja sempre um objeto, mesmo que o storage esteja vazio.
        config = result[CONFIG_KEY] || {}; 
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações carregadas.`, "color: blue; font-weight: bold;");
    }

    /**
     * Verifica se o script deve estar ativo, considerando a configuração global e a da funcionalidade.
     * A verificação de URL foi removida para confiar no manifest.json.
     */
    function isScriptAtivo() {
        // A verificação da URL foi removida.
        return config.masterEnableNeuron && config.featureSettings?.[SCRIPT_ID]?.enabled;
    }

    function criarOuAtualizarUI() {
        const motivoAncora = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
        const justificativaInput = document.getElementById(INPUT_JUSTIFICATIVA_ID);
        if (!motivoAncora || !justificativaInput) return;

        // Se a UI já existe, não faz nada.
        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        removerElementosCriados(); // Garante a limpeza antes de criar.

        // Cria o contêiner para o nosso dropdown.
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

        // Popula o dropdown com as opções
        dropdown.innerHTML = '<option value="">Selecione um modelo...</option>'; // Opção padrão
        
        const modelosArquivar = config.textModels?.Arquivar || { "Erro": "Modelos de arquivamento não carregados." };
        const numeroManifestacao = document.getElementById(NUMERO_MANIFESTACAO_ID)?.innerText.trim() || '{NUP_NAO_ENCONTRADO}';

        for (const [key, textoTemplate] of Object.entries(modelosArquivar)) {
            const option = document.createElement('option');
            const textoFinal = String(textoTemplate).replace(/\(NUP\)/g, `(${numeroManifestacao})`);
            option.value = textoFinal;
            option.textContent = key;
            dropdown.appendChild(option);
        }

        // Adiciona o evento para preencher a justificativa
        dropdown.addEventListener('change', (e) => {
            if (justificativaInput) {
                justificativaInput.value = e.target.value;
                // Simula um evento de input para que a página possa detectar a mudança, se necessário.
                justificativaInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        // Insere a nossa UI logo após o campo de motivo original.
        motivoAncora.parentElement.insertAdjacentElement('afterend', container);
        console.log(`%cNeuron (${SCRIPT_ID}): UI de arquivamento criada.`, "color: green;");
    }

    function removerElementosCriados() {
        const elemento = document.getElementById(DROPDOWN_ID_NEURON);
        if (elemento) {
            elemento.parentElement.remove();
            console.log(`%cNeuron (${SCRIPT_ID}): UI removida da página.`, "color: orange;");
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
        console.log(`%cNeuron (${SCRIPT_ID}): Observer da página configurado.`, "color: green;");
    }

    function desconectarObserverDaPagina() {
        if (uiMutationObserver) {
            uiMutationObserver.disconnect();
            uiMutationObserver = null;
            console.log(`%cNeuron (${SCRIPT_ID}): Observer DESCONECTADO.`, "color: red;");
        }
    }

    // Listener para quando as configurações são alteradas na página de opções.
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            console.log(`%cNeuron (${SCRIPT_ID}): Configuração alterada. Reavaliando...`, "color: orange; font-weight: bold;");
            verificarEstadoAtualEAgir();
        }
    });

    // Função de inicialização do script.
    async function init() {
        // Garante que o DOM está pronto antes de executar.
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        verificarEstadoAtualEAgir();
    }

    init();

})();