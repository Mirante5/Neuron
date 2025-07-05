(function () {
    'use strict';

    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_KEY = 'neuronUserConfig';
    let isListenerAtivo = false;

    async function isScriptAtivo() {
        if (!chrome.runtime?.id) return false;
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            const config = result[CONFIG_KEY] || {};
            return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        } catch {
            return false;
        }
    }

    async function processarDemandas(event) {
        if (!await isScriptAtivo()) {
            removerBlocosInseridos();
            return;
        }
        
        await window.DateUtils.ready;
        const result = await chrome.storage.local.get(CONFIG_KEY);
        const config = result[CONFIG_KEY] || {};
        const demandas = event.detail;
        const DU = window.DateUtils;
        const prazosSettings = config.prazosSettings || {};

        demandas.forEach(demanda => {
            try {
                if (!demanda.prazo || !demanda.idPrazoOriginal) return;
                const elemPrazo = document.getElementById(demanda.idPrazoOriginal);
                if (!elemPrazo || elemPrazo.parentElement.dataset.calculado) return;

                const dataBase = DU.parsearData(demanda.prazo);
                if (!dataBase) return;
                
                const containerPrazo = elemPrazo.parentElement;
                containerPrazo.style.display = 'none';
                containerPrazo.dataset.calculado = 'true';

                const elemCadastro = document.getElementById(demanda.idCadastroOriginal);
                if (elemCadastro) elemCadastro.parentElement.style.display = 'none';

                const funcaoDeCalculo = prazosSettings.tratarNovoModoCalculo === 'diasUteis' ? DU.adicionarDiasUteis : DU.adicionarDiasCorridos;
                const modoTexto = prazosSettings.tratarNovoModoCalculo === 'diasUteis' ? 'Dias Úteis' : 'Dias Corridos';

                const prazoInternoBase = funcaoDeCalculo(dataBase, prazosSettings.tratarNovoPrazoInternoDias);
                const cobrancaBase = funcaoDeCalculo(dataBase, prazosSettings.tratarNovoCobrancaInternaDias);
                const improrrogavelBase = DU.adicionarDiasCorridos(dataBase, 31);

                const overrideRules = { ajusteFds: prazosSettings.tratarNovoAjusteFds, ajusteFeriado: prazosSettings.tratarNovoAjusteFeriado };
                
                const prazoFinal = DU.ajustarDataFinal(prazoInternoBase, overrideRules);
                const cobrancaFinal = DU.ajustarDataFinal(cobrancaBase, overrideRules);
                const improrrogavelFinal = DU.ajustarDataFinal(improrrogavelBase, overrideRules);

                let htmlImprorrogavel = '';
                if (!demanda.situacao.includes('Prorrogada')) {
                    htmlImprorrogavel = `<div style="color: #e0a800; font-weight: bold;"><strong>Improrrogável em:</strong> ${DU.formatarData(improrrogavelFinal)}<span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(improrrogavelFinal)}</span></div>`;
                }

                const nossoBloco = document.createElement('div');
                nossoBloco.style.cssText = "border: 1px solid #e0e0e0; border-radius: 5px; padding: 5px; margin-top: 5px; font-size: 0.8em; line-height: 1.8; width: 290px;";
                nossoBloco.innerHTML = `
                    <div style="padding-bottom: 2px; margin-bottom: 2px; border-bottom: 1px dashed #ccc;"><strong>Modo:</strong> ${modoTexto}</div>
                    <div><strong>Cadastro:</strong> ${demanda.dataCadastro}<span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(demanda.dataCadastro)}</span></div>
                    <div><strong>Prazo Original:</strong> ${DU.formatarData(dataBase)}<span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(dataBase)}</span></div>
                    <div style="color: #0056b3;"><strong>Prazo Interno:</strong> ${DU.formatarData(prazoFinal)}<span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(prazoFinal)}</span></div>
                    <div style="color: #c82333;"><strong>Cobrança Interna em:</strong> ${DU.formatarData(cobrancaFinal)}<span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(cobrancaFinal)}</span></div>
                    ${htmlImprorrogavel}
                `;
                
                containerPrazo.insertAdjacentElement('afterend', nossoBloco);
            } catch (error) {
                console.error(`%cNeuron (${SCRIPT_ID}): Erro ao processar demanda ${demanda.numero}`, "color: red;", error);
            }
        });
    }

    function removerBlocosInseridos() {
        document.querySelectorAll('div[data-calculado="true"]').forEach(container => {
        });
    }

    async function gerenciarEstado() {
        if (await isScriptAtivo()) {
            if (isListenerAtivo) return;
            document.addEventListener('dadosExtraidosNeuron', processarDemandas);
            isListenerAtivo = true;
        } else {
            document.removeEventListener('dadosExtraidosNeuron', processarDemandas);
            isListenerAtivo = false;
            removerBlocosInseridos();
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (!chrome.runtime?.id) return;
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            gerenciarEstado();
        }
    });

    gerenciarEstado();
})();