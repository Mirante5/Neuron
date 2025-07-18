// File: modules/ouvidoria/arquivar/arquivar.js

// Primeiro, certifica-te de que o script da fábrica é carregado antes deste no manifest.json

createNeuronModule({
    scriptId: 'arquivar',
    configKey: 'neuronUserConfig',

    /**
     * Função chamada quando a funcionalidade deve estar ativa.
     * @param {object} context - O contexto fornecido pela fábrica.
     * @param {object} context.config - A configuração carregada.
     * @param {function} context.log - Função de log personalizada.
     */
    onScriptAtivo: ({ config, log }) => {
        const DROPDOWN_ID_NEURON = 'neuronDropdownArquivar';
        const LABEL_FOR_MOTIVO_ORIGINAL = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoArquivamento';
        const INPUT_JUSTIFICATIVA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaArquivamento';
        const NUMERO_MANIFESTACAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';
        
        // Se a UI já existe, não faz nada.
        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        const motivoAncora = document.getElementById(LABEL_FOR_MOTIVO_ORIGINAL);
        const justificativaInput = document.getElementById(INPUT_JUSTIFICATIVA_ID);

        if (!motivoAncora || !justificativaInput) return;
        
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
        
        const modelosArquivar = config.textModels?.Arquivar || { "Erro": "Modelos não carregados." };
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
        
        // Insere a UI no local correto da página
        motivoAncora.parentElement.insertAdjacentElement('afterend', container);
        log("UI de arquivamento criada.");
    },

    /**
     * Função chamada para remover a UI e limpar event listeners quando a funcionalidade é desativada.
     */
    onScriptInativo: () => {
        const elemento = document.getElementById('neuronDropdownArquivar');
        if (elemento) {
            elemento.parentElement.remove();
        }
    }
});