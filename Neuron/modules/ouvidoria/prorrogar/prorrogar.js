// File: modules/ouvidoria/prorrogar/prorrogar.js

createNeuronModule({
    scriptId: 'prorrogar',
    configKey: 'neuronUserConfig',

    onScriptAtivo: ({ config, log }) => {
        const DROPDOWN_ID_NEURON = 'neuronDropdownProrrogar';
        const MOTIVO_DROPDOWN_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_cmbMotivoProrrogacao';
        const JUSTIFICATIVA_TEXTAREA_ID = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtJustificativaProrrogacao';
        
        if (document.getElementById(DROPDOWN_ID_NEURON)) return;
        
        const motivoAncora = document.getElementById(MOTIVO_DROPDOWN_ID);
        if (!motivoAncora) return;

        const container = document.createElement('div');
        container.className = 'form-group neuron-prorrogar-container';
        
        const label = document.createElement('label');
        label.htmlFor = DROPDOWN_ID_NEURON;
        label.textContent = 'Modelos de Justificativa (Neuron):';
        
        const dropdown = document.createElement('select');
        dropdown.id = DROPDOWN_ID_NEURON;
        dropdown.className = 'form-control';
        
        container.appendChild(label);
        container.appendChild(dropdown);
        
        dropdown.innerHTML = '<option value="">Selecione um modelo...</option>';
        const modelos = config.textModels?.Prorrogar || { "Erro": "Modelos não carregados." };
        
        for (const key in modelos) {
            const option = document.createElement('option');
            option.value = modelos[key];
            option.textContent = key;
            dropdown.appendChild(option);
        }
        
        dropdown.addEventListener('change', (e) => {
            const justificativaInput = document.getElementById(JUSTIFICATIVA_TEXTAREA_ID);
            if (justificativaInput) {
                justificativaInput.value = e.target.value;
            }
        });
        
        motivoAncora.closest('.form-group').insertAdjacentElement('afterend', container);
        log("UI de prorrogação criada.");
    },

    onScriptInativo: () => {
        document.querySelector('.neuron-prorrogar-container')?.remove();
    }
});