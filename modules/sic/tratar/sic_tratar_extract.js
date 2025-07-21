(function () {
    'use strict';

    // ID do corpo da tabela de manifestações do SIC
    const TBODY_ID = 'manifestacoesTable-table-body';

    // Configurações de prazos temporárias. No futuro, isto virá do config.json.
    const mockPrazosSettings = {
        tratarNovoModoCalculo: "diasUteis", // "diasUteis" ou "diasCorridos"
        tratarNovoAjusteFds: "modo3",       // "modo1", "modo2", "modo3", "none"
        tratarNovoAjusteFeriado: "proximo_dia", // "proximo_dia", "dia_anterior", "none"
        tratarNovoPrazoInternoDias: -10,
        tratarNovoCobrancaInternaDias: -12
    };

    /**
     * Exibe uma notificação flutuante na parte inferior da tela.
     * @param {string} text - O texto a ser exibido na notificação.
     */
    function showCopyNotification(text) {
        const notification = document.createElement('div');
        notification.innerText = text;
        Object.assign(notification.style, {
            position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#28a745', color: 'white', padding: '10px 20px',
            borderRadius: '5px', zIndex: '9999', transition: 'opacity 0.5s ease', opacity: '1'
        });
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }

    /**
     * Função principal que processa a tabela de manifestações do SIC.
     */
    async function processarTabelaSic() {
        if (typeof window.DateUtils === 'undefined') {
            console.error('[Neuron|SIC] Erro: A biblioteca date_utils.js não foi encontrada. Verifique o manifest.json.');
            return;
        }
        await window.DateUtils.ready;

        const DU = window.DateUtils;
        const corpoTabela = document.getElementById(TBODY_ID);
        if (!corpoTabela) return;

        const linhas = corpoTabela.querySelectorAll('tr');

        for (const linha of linhas) {
            if (linha.dataset.neuronProcessado) continue;

            const celulas = linha.querySelectorAll('td');
            if (celulas.length < 10) continue;

            // 1. EXTRAÇÃO DE DADOS
            const manifestacao = {
                protocolo: celulas[0]?.querySelector('a')?.innerText.trim() || '',
                linkElemento: celulas[0]?.querySelector('a'),
                dataCadastro: celulas[6]?.innerText.trim() || '',
                prazo: celulas[7]?.innerText.trim() || '',
                situacao: celulas[8]?.innerText.trim() || '',
                celulaCadastro: celulas[6], // <-- MODIFICADO: Referência à célula de cadastro
                celulaPrazo: celulas[7]
            };

            // 2. FUNCIONALIDADE DE COPIAR PROTOCOLO
            if (manifestacao.linkElemento) {
                manifestacao.linkElemento.style.cursor = 'copy';
                manifestacao.linkElemento.addEventListener('click', (event) => {
                    event.preventDefault();
                    navigator.clipboard.writeText(manifestacao.protocolo).then(() => {
                        showCopyNotification(`Protocolo ${manifestacao.protocolo} copiado!`);
                    });
                });
            }

            // 3. CÁLCULO E INSERÇÃO DE DATAS
            if (manifestacao.prazo && manifestacao.celulaPrazo) {
                const dataBase = DU.parsearData(manifestacao.prazo);
                if (!dataBase) continue;

                const funcaoDeCalculo = mockPrazosSettings.tratarNovoModoCalculo === 'diasUteis' ? DU.adicionarDiasUteis : DU.adicionarDiasCorridos;
                const modoTexto = mockPrazosSettings.tratarNovoModoCalculo === 'diasUteis' ? 'Dias Úteis' : 'Dias Corridos';
                
                const prazoInternoBase = funcaoDeCalculo(dataBase, mockPrazosSettings.tratarNovoPrazoInternoDias);
                const cobrancaBase = funcaoDeCalculo(dataBase, mockPrazosSettings.tratarNovoCobrancaInternaDias);

                const prazoFinal = DU.ajustarDataFinal(prazoInternoBase);
                const cobrancaFinal = DU.ajustarDataFinal(cobrancaBase);
                
                const nossoBloco = document.createElement('div');
                nossoBloco.className = 'neuron-date-block'; // <-- MODIFICADO: Usa a classe do CSS
                
                // --- MODIFICADO: O bloco de HTML foi atualizado para incluir a data de cadastro ---
                nossoBloco.innerHTML = `
                    <div style="padding-bottom: 2px; margin-bottom: 2px; border-bottom: 1px dashed #ccc; color: #343a40;">
                        <strong>Cadastro:</strong> ${manifestacao.dataCadastro}
                    </div>
                    <div style="padding-bottom: 2px; margin-bottom: 2px; border-bottom: 1px dashed #ccc;">
                        <strong>Prazo Original:</strong> ${DU.formatarData(dataBase)}
                        <span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(dataBase)}</span>
                    </div>
                    <div style="color: #0056b3;">
                        <strong>Prazo Interno:</strong> ${DU.formatarData(prazoFinal)}
                        <span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(prazoFinal)}</span>
                    </div>
                    <div style="color: #c82333;">
                        <strong>Cobrança Interna em:</strong> ${DU.formatarData(cobrancaFinal)}
                        <span style="color: #6c757d; font-style: italic;"> ${DU.calcularDiasRestantes(cobrancaFinal)}</span>
                    </div>
                    <div class="modo-calculo">(Modo: ${modoTexto})</div>
                `;
                
                manifestacao.celulaPrazo.innerHTML = '';
                manifestacao.celulaPrazo.appendChild(nossoBloco);

                // --- ADICIONADO: Limpa o conteúdo da célula de cadastro original ---
                if (manifestacao.celulaCadastro) {
                    manifestacao.celulaCadastro.innerHTML = '';
                }
            }

            linha.dataset.neuronProcessado = 'true';
        }
    }

    const observer = new MutationObserver((mutations, obs) => {
        const tabela = document.getElementById(TBODY_ID);
        if (tabela) {
            processarTabelaSic(); 
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();