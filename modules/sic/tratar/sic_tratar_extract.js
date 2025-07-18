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
        // Verifica se a biblioteca de datas está disponível
        if (typeof window.DateUtils === 'undefined') {
            console.error('[Neuron|SIC] Erro: A biblioteca date_utils.js não foi encontrada. Verifique o manifest.json.');
            return;
        }
        // Espera que a biblioteca de datas carregue as suas próprias configurações (feriados, etc.)
        await window.DateUtils.ready;

        const DU = window.DateUtils;
        const corpoTabela = document.getElementById(TBODY_ID);
        if (!corpoTabela) return;

        const linhas = corpoTabela.querySelectorAll('tr');

        for (const linha of linhas) {
            // Se a linha já foi processada, pula para a próxima
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

                // As regras de ajuste para feriados e fins de semana são aplicadas aqui
                const prazoFinal = DU.ajustarDataFinal(prazoInternoBase);
                const cobrancaFinal = DU.ajustarDataFinal(cobrancaBase);
                
                // Cria o novo bloco de HTML para injetar na célula
                const nossoBloco = document.createElement('div');
                nossoBloco.style.cssText = "border: 1px solid #e0e0e0; border-radius: 5px; padding: 5px; margin-top: 5px; font-size: 0.8em; line-height: 1.8;";
                nossoBloco.innerHTML = `
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
                    <div style="font-size: 0.9em; text-align: right; color: #888;">(Modo: ${modoTexto})</div>
                `;
                
                // Limpa a célula original e injeta o nosso bloco
                manifestacao.celulaPrazo.innerHTML = '';
                manifestacao.celulaPrazo.appendChild(nossoBloco);
            }

            // Marca a linha como processada para não a processarmos novamente
            linha.dataset.neuronProcessado = 'true';
        }
    }

    // Usamos um MutationObserver para esperar a tabela ser carregada na página
    const observer = new MutationObserver((mutations, obs) => {
        const tabela = document.getElementById(TBODY_ID);
        if (tabela) {
            processarTabelaSic(); // A tabela existe, então processamos
            // Podemos desconectar o observador se a tabela não for se alterar mais
            // obs.disconnect(); 
        }
    });

    // Começa a observar o corpo do documento por adições de elementos
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();