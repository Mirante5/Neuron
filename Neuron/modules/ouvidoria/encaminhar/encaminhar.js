// File: modules/ouvidoria/encaminhar/encaminhar.js

createNeuronModule({
    scriptId: 'encaminhar',
    configKey: 'neuronUserConfig',

    onScriptAtivo: ({ config, log }) => {
        const DROPDOWN_ID_NEURON = 'neuronDropdownEncaminhar';
        const OUVIDORIA_DESTINO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbOuvidoriaDestino';
        const DESTINATARIO_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoDestinatario';
        const SOLICITANTE_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtNotificacaoSolicitante';
        const NUMERO_MANIFESTACAO_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumero';

        let destinatarioManualmenteEditado = false;
        let solicitanteManualmenteEditado = false;

        // Se a UI já existe, não faz nada.
        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        const ouvidoriaAncora = document.getElementById(OUVIDORIA_DESTINO_ID);
        if (!ouvidoriaAncora) return;

        // Função para preencher os campos de texto
        const preencherTextos = (modeloKey) => {
            const destinatarioInput = document.getElementById(DESTINATARIO_TEXTAREA_ID);
            const solicitanteInput = document.getElementById(SOLICITANTE_TEXTAREA_ID);
            
            if (!modeloKey) {
                if (!destinatarioManualmenteEditado) destinatarioInput.value = '';
                if (!solicitanteManualmenteEditado) solicitanteInput.value = '';
                return;
            }

            const modelo = config.textModels?.Encaminhar?.[modeloKey];
            if (!modelo) return;

            const textoOuvidoria = ouvidoriaAncora.selectedOptions[0]?.text.trim() || '{OUVIDORIA_DESTINO}';
            const numeroManifestacao = document.getElementById(NUMERO_MANIFESTACAO_ID)?.innerText.trim() || '{NUP}';
            
            if (!destinatarioManualmenteEditado && modelo.destinatario) {
                destinatarioInput.value = modelo.destinatario.replace(/\{OUVIDORIA\}/g, textoOuvidoria).replace(/\{NUP\}/g, numeroManifestacao);
            }
            if (!solicitanteManualmenteEditado && modelo.solicitante) {
                solicitanteInput.value = modelo.solicitante.replace(/\{OUVIDORIA\}/g, textoOuvidoria).replace(/\{NUP\}/g, numeroManifestacao);
            }
        };

        // Criação da UI
        const container = document.createElement('div');
        container.className = 'form-group neuron-encaminhar-container';
        container.innerHTML = `
            <label for="${DROPDOWN_ID_NEURON}">Modelos de Texto (Neuron):</label>
            <select id="${DROPDOWN_ID_NEURON}" class="form-control">
                <option value="">Selecione um modelo...</option>
            </select>
        `;
        
        const dropdown = container.querySelector(`#${DROPDOWN_ID_NEURON}`);
        const modelos = config.textModels?.Encaminhar || {};
        for (const key in modelos) {
            dropdown.innerHTML += `<option value="${key}">${key}</option>`;
        }
        
        // Adiciona os event listeners
        dropdown.addEventListener('change', () => {
            destinatarioManualmenteEditado = false;
            solicitanteManualmenteEditado = false;
            preencherTextos(dropdown.value);
        });

        ouvidoriaAncora.addEventListener('change', () => preencherTextos(dropdown.value));
        document.getElementById(DESTINATARIO_TEXTAREA_ID)?.addEventListener('input', () => { destinatarioManualmenteEditado = true; }, { once: true });
        document.getElementById(SOLICITANTE_TEXTAREA_ID)?.addEventListener('input', () => { solicitanteManualmenteEditado = true; }, { once: true });

        // Insere a UI na página
        ouvidoriaAncora.closest('.form-group').insertAdjacentElement('afterend', container);
        log("UI de encaminhamento criada.");
    },

    onScriptInativo: () => {
        document.querySelector('.neuron-encaminhar-container')?.remove();
    }
});