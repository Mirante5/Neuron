// File: modules/ouvidoria/tratar/tratar.js

createNeuronModule({
    scriptId: 'tratar',
    configKey: 'neuronUserConfig',

    onScriptAtivo: ({ config, log }) => {
        const TARGET_DIV_SELECTOR = '#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel3';
        const BTN_IMPORTAR_ID = 'neuronBtnImportarCidadao';
        const BTN_PRORROGACAO_ID = 'neuronBtnTextoProrrogacao';

        const panel = document.querySelector(TARGET_DIV_SELECTOR);
        const contribInput = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtContribuicao');

        if (!panel || !contribInput || document.getElementById(BTN_IMPORTAR_ID)) return;
        
        const criarBotao = (id, label, onClick) => {
            const btn = document.createElement('input');
            btn.type = 'button'; // Usar 'button' para não submeter o formulário
            btn.id = id;
            btn.value = label;
            btn.className = 'btn btn-sm btn-primary neuron-btn-cidadao';
            btn.style.marginRight = '5px';
            btn.addEventListener('click', onClick);
            return btn;
        };

        const importarDadosAction = () => {
            const nome = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNomePF')?.textContent.trim() || '';
            const tipoDoc = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTipoDocPF')?.textContent.trim() || '';
            const documento = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtNumeroDocPF')?.textContent.trim() || '';
            const email = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtEmailPF')?.textContent.trim() || '';
            
            contribInput.value = `Nome: ${nome}\nDocumento (${tipoDoc}): ${documento}\nEmail: ${email}`;
        };

        const inserirTextoProrrogacaoAction = () => {
            const prazo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento')?.textContent.trim() || '{PRAZO}';
            const textoBase = config.textModels?.Tratar?.["Texto Padrão Prorrogação"] || "Prazo estendido até {datalimite}.";
            contribInput.value = textoBase.replace('{datalimite}', prazo);
        };

        const btnImportar = criarBotao(BTN_IMPORTAR_ID, 'Importar dados do cidadão', importarDadosAction);
        const btnTextoProrrogacao = criarBotao(BTN_PRORROGACAO_ID, 'Texto de Prorrogação', inserirTextoProrrogacaoAction);

        panel.appendChild(btnImportar);
        panel.appendChild(btnTextoProrrogacao);
        log("Botões auxiliares de 'Tratar' adicionados.");
    },

    onScriptInativo: () => {
        document.getElementById('neuronBtnImportarCidadao')?.remove();
        document.getElementById('neuronBtnTextoProrrogacao')?.remove();
    }
});