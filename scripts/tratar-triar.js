// Neuron 0.1.5 β/scripts/tratar-triar.js - COMPLETO COM DIAGNÓSTICO E CORREÇÕES
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratarTriar';
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_tratarTriar';
    const NEURON_STYLE_ID = 'neuronTratarTriarStyles';

    const QTD_ITENS_STORAGE_KEY = 'neuronTratarTriarQtdItens';
    const QTD_ITENS_POR_PAGINA_DEFAULT = 15;

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let feriadosConfigurados = [];
    let qtdItensConfigurada = QTD_ITENS_POR_PAGINA_DEFAULT;

    let pageMutationObserver = null;
    let isAdjustingPageSize = false;
    let aplicarMelhoriasTimeout = null;
    const DEBOUNCE_DELAY_MS = 350; // Aumentei um pouco o delay

    // --- Carregamento de Configurações ---
    async function carregarConfiguracoesNeuron() {
        try {
            const result = await chrome.storage.local.get(['userHolidays', QTD_ITENS_STORAGE_KEY]);
            if (result.userHolidays && Array.isArray(result.userHolidays)) {
                feriadosConfigurados = result.userHolidays.map(dataStr => {
                    const [dia, mes, ano] = dataStr.split('/');
                    return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime();
                });
            } else {
                const DEFAULT_HOLIDAYS_STR = [
                    "01/01/2025", "03/03/2025", "04/03/2025", "18/04/2025", "21/04/2025",
                    "01/05/2025", "19/06/2025", "28/10/2025", "20/11/2025", "25/12/2025"
                ];
                feriadosConfigurados = DEFAULT_HOLIDAYS_STR.map(dataStr => {
                    const [dia, mes, ano] = dataStr.split('/');
                    return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime();
                });
                // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Usando feriados padrão. Total: ${feriadosConfigurados.length}`);
            }

            if (result[QTD_ITENS_STORAGE_KEY] && !isNaN(parseInt(result[QTD_ITENS_STORAGE_KEY],10))) {
                qtdItensConfigurada = parseInt(result[QTD_ITENS_STORAGE_KEY], 10);
            } else {
                qtdItensConfigurada = QTD_ITENS_POR_PAGINA_DEFAULT;
            }
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configs carregadas. Qtd Itens: ${qtdItensConfigurada}, Feriados: ${feriadosConfigurados.length > 0}`);
        } catch (e) {
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar configurações:`, e);
            feriadosConfigurados = [];
            qtdItensConfigurada = QTD_ITENS_POR_PAGINA_DEFAULT;
        }
    }
    
    const coresSituacaoOriginal = {"Complementação Solicitada": { fundo: "yellow", texto: "black" },"Complementada": { fundo: "green", texto: "white" },"Prorrogada": { fundo: "red", texto: "white" }}; //
    
    function ehFeriadoOriginal(data) { //
        if (!(data instanceof Date) || isNaN(data.getTime())) return false;
        const dataNormalizada = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
        return feriadosConfigurados.includes(dataNormalizada);
    }

    function ajustarDataOriginal(dataStr, dias, paraDiaUtil = false) { //
        const partes = dataStr.split('/');
        if (partes.length !== 3) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): ajustarDataOriginal - Formato de data inválido (não DD/MM/YYYY): "${dataStr}"`);
            return null;
        }
        let diaInt = parseInt(partes[0], 10);
        let mesInt = parseInt(partes[1], 10) - 1; // Mês é 0-indexed
        let anoInt = parseInt(partes[2], 10);

        if (isNaN(diaInt) || isNaN(mesInt) || isNaN(anoInt) || anoInt < 1900 || anoInt > 2200) { // Validação básica dos componentes
             console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): ajustarDataOriginal - Componentes da data inválidos: "${dataStr}"`);
            return null;
        }
        
        let data = new Date(anoInt, mesInt, diaInt);
        if (isNaN(data.getTime()) || data.getDate() !== diaInt || data.getMonth() !== mesInt || data.getFullYear() !== anoInt) { // Checa se a data é válida (ex: 31/02)
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): ajustarDataOriginal - Data inválida após parse (ex: dia não existe no mês): "${dataStr}" -> Resultou em: ${data}`);
            return null;
        }

        if (!paraDiaUtil) {
            data.setDate(data.getDate() + dias);
        } else {
            let diasMovidos = 0;
            const incremento = dias >= 0 ? 1 : -1;
            const diasAbsolutos = Math.abs(dias);

            while (diasMovidos < diasAbsolutos) {
                data.setDate(data.getDate() + incremento);
                if (data.getDay() !== 0 && data.getDay() !== 6 && !ehFeriadoOriginal(data)) {
                    diasMovidos++;
                }
            }
            // Garante que a data final seja um dia útil, avançando ou retrocedendo conforme o incremento original
            while (data.getDay() === 0 || data.getDay() === 6 || ehFeriadoOriginal(data)) {
                data.setDate(data.getDate() + incremento);
            }
        }
        return data;
    }

    function calcularDiasUteisOriginal(inicio, fim) { //
        if (!(inicio instanceof Date) || !(fim instanceof Date) || isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): calcularDiasUteisOriginal - Datas de início ou fim inválidas.`);
            return 0; // ou algum valor de erro
        }

        let diasUteis = 0;
        let dataAtual = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()); // Normaliza e copia
        let dataFim = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()); // Normaliza e copia

        if (dataAtual >= dataFim) return 0;

        // Se contarmos para frente (dataAtual < dataFim)
        while (dataAtual < dataFim) {
            dataAtual.setDate(dataAtual.getDate() + 1); // Avança um dia
            if (dataAtual.getDay() !== 0 && dataAtual.getDay() !== 6 && !ehFeriadoOriginal(dataAtual)) {
                // Se o dia avançado (que agora é dataAtual) for útil e ainda <= dataFim
                if (dataAtual <= dataFim) { // Evita contar o dia após dataFim se dataFim for fim de semana/feriado
                    diasUteis++;
                }
            }
        }
        return diasUteis;
    }
    
    function ajustarItensPorPaginaComVerificacao() { //
        if (isAdjustingPageSize) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Ajuste de itens já em progresso, pulando.`);
            return;
        }
        const input = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_txtTamanhoPagina');
        const botao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_btnAlterarTamanhoPagina');
        if (input && botao) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Verificando itens/pág. Input atual: "${input.value}", Configurado: "${qtdItensConfigurada}"`);
            if (input.value !== String(qtdItensConfigurada)) {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): NECESSÁRIO AJUSTE. Solicitando ${qtdItensConfigurada} itens.`);
                isAdjustingPageSize = true;
                input.value = qtdItensConfigurada;
                botao.click();
                setTimeout(() => {
                    console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Resetando isAdjustingPageSize (após timeout do ajuste de itens).`);
                    isAdjustingPageSize = false;
                }, 3000); // Aumentado para dar mais margem
            } else {
                isAdjustingPageSize = false;
            }
        } else {
            isAdjustingPageSize = false;
        }
    }

    function aplicarCoresDeSituacao() { //
        document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")
            .forEach(span => {
                const situacao = span.textContent.trim();
                if (coresSituacaoOriginal[situacao]) {
                    Object.assign(span.style, {
                        backgroundColor: coresSituacaoOriginal[situacao].fundo,
                        color: coresSituacaoOriginal[situacao].texto,
                        padding: "3px 5px", borderRadius: "5px", display: "inline-block"
                    });
                }
            });
    }

    function aplicarInformacoesDePrazo() { // - Com logs descomentados
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Iniciando aplicarInformacoesDePrazo. Feriados carregados: ${feriadosConfigurados.length}`);
        const spansDePrazo = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']");
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Encontrados ${spansDePrazo.length} spans de prazo.`);

        spansDePrazo.forEach((span, index) => {
            let prazoOriginalStr;
            if (span.dataset.neuronPrazoOriginalProcessed === 'true') {
                return;
            }
            if (span.dataset.neuronPrazoOriginal) {
                prazoOriginalStr = span.dataset.neuronPrazoOriginal;
            } else {
                prazoOriginalStr = span.textContent.trim();
                span.dataset.neuronPrazoOriginal = prazoOriginalStr;
            }
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Processando span ${index}, ID: ${span.id}, Texto Original Bruto: "${prazoOriginalStr}"`);
            if (!prazoOriginalStr) {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index} pulado (prazoOriginalStr vazio).`);
                return;
            }
            if (span.innerHTML.includes("Original:") && span.innerHTML.includes("Cobrança em:")) {
                 console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index} parece já formatado pelo Neuron, marcando como processado.`);
                 span.dataset.neuronPrazoOriginalProcessed = 'true';
                 return;
            }
            const prazoData = ajustarDataOriginal(prazoOriginalStr, 0, false);
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index}, após ajustarDataOriginal("${prazoOriginalStr}"):`, prazoData ? prazoData.toLocaleDateString('pt-BR') : null);
            if (!prazoData) {
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Não foi possível parsear prazoOriginalStr: "${prazoOriginalStr}" para o span ${index}.`);
                return;
            }
            const dataAtual = new Date(); dataAtual.setHours(0,0,0,0);
            const cobrancaData = ajustarDataOriginal(prazoOriginalStr, -5, true);
            const tramitarData = ajustarDataOriginal(prazoOriginalStr, -10, false);
            const prorrogarEmData = new Date(prazoData);
            const improrrogavelData = ajustarDataOriginal(prazoOriginalStr, 30, true);
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index}, Datas calculadas - Cobrança: ${cobrancaData?.toLocaleDateString('pt-BR')}, Tramitar: ${tramitarData?.toLocaleDateString('pt-BR')}, Prorrogar: ${prorrogarEmData?.toLocaleDateString('pt-BR')}, Improrrogável: ${improrrogavelData?.toLocaleDateString('pt-BR')}`);
            if (!tramitarData || !cobrancaData || !improrrogavelData) {
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index}, alguma data calculada é inválida. Pulando.`);
                return;
            }
            const diasUteisCobranca = calcularDiasUteisOriginal(dataAtual, cobrancaData);
            const diasUteisProrrogar = calcularDiasUteisOriginal(dataAtual, prorrogarEmData);
            const situacaoSpan = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")[index];
            const situacao = situacaoSpan ? situacaoSpan.textContent.trim() : "";
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index}, Situação: "${situacao}"`);
            let htmlOutput = `<span style="font-size:0.9em; color:#777;">Original: ${prazoOriginalStr}</span><br>`;
            if (situacao === "Prorrogada") {
                const prazoProrrogadoData = ajustarDataOriginal(prazoOriginalStr, 0, false);
                const cobrancaProrrogadoData = ajustarDataOriginal(prazoOriginalStr, -5, true);
                const diasUteisCobrancaProrrogado = calcularDiasUteisOriginal(dataAtual, cobrancaProrrogadoData);
                htmlOutput += `Tramitar em: --- (Já prorrogado)<br>`;
                if (cobrancaProrrogadoData && cobrancaProrrogadoData >= dataAtual) { htmlOutput += `Cobrança em: <b>${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> [${diasUteisCobrancaProrrogado} d.ú.]<br>`; }
                else if (cobrancaProrrogadoData) { htmlOutput += `Cobrança em: <b style="color:red;">${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> (ATRASADO)<br>`; }
                else { htmlOutput += `Cobrança em: (erro cálculo)<br>`; }
                htmlOutput += `Prazo Final: <b>${prazoProrrogadoData ? prazoProrrogadoData.toLocaleDateString('pt-BR') : 'N/A'}</b>`;
            } else {
                if (tramitarData && tramitarData >= dataAtual) { htmlOutput += `Tramitar em: <b>${tramitarData.toLocaleDateString('pt-BR')}</b><br>`; }
                else if (tramitarData) { htmlOutput += `Tramitar em: <b style="color:red;">${tramitarData.toLocaleDateString('pt-BR')}</b> (VERIFICAR)<br>`; }
                else { htmlOutput += `Tramitar em: (erro cálculo)<br>`; }
                if (cobrancaData && cobrancaData >= dataAtual) { htmlOutput += `Cobrança em: <b>${cobrancaData.toLocaleDateString('pt-BR')}</b> [${diasUteisCobranca} d.ú.]<br>`; }
                else if (cobrancaData){ htmlOutput += `Cobrança em: <b style="color:red;">${cobrancaData.toLocaleDateString('pt-BR')}</b> (ATRASADO)<br>`; }
                else { htmlOutput += `Cobrança em: (erro cálculo)<br>`; }
                if (prorrogarEmData && prorrogarEmData >= dataAtual) { htmlOutput += `Prorrogar em: <b>${prorrogarEmData.toLocaleDateString('pt-BR')}</b> [${diasUteisProrrogar} d.ú.]<br>`; }
                else if (prorrogarEmData) { htmlOutput += `Prorrogar em: <b style="color:red;">${prorrogarEmData.toLocaleDateString('pt-BR')}</b> (ATRASADO)<br>`; }
                else { htmlOutput += `Prorrogar em: (erro cálculo)<br>`; }
                htmlOutput += `Improrrogável (após prorr.): <b>${improrrogavelData ? improrrogavelData.toLocaleDateString('pt-BR') : 'N/A'}</b>`;
            }
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Span ${index}, HTML Final: "${htmlOutput.substring(0, 100)}..."`); // Log truncado
            span.innerHTML = htmlOutput;
            span.dataset.neuronPrazoOriginalProcessed = 'true';
        });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Finalizou aplicarInformacoesDePrazo.`);
    }
    
    function aplicarRemocaoHrefLinks() { //
        document.querySelectorAll('[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]')
            .forEach(link => {
                if (link.hasAttribute('href') || !link.classList.contains('neuron-nup-link')) {
                    link.removeAttribute('href');
                    link.style.cursor = 'copy';
                    link.title = 'Clique para copiar o NUP';
                    link.classList.add('neuron-nup-link');
                    link.removeEventListener('click', copiarNupAction); 
                    link.addEventListener('click', copiarNupAction);
                }
            });
    }

    // Função para copiar o NUP ao clicar no link
    function copiarNupAction(event) {
        event.preventDefault();
        const nup = event.currentTarget.textContent.trim();
        if (nup) {
            navigator.clipboard.writeText(nup).then(() => {
                // Mensagem visual opcional
                const msg = document.createElement('span');
                msg.textContent = 'Copiado!';
                msg.className = 'neuron-copiado-msg';
                msg.style.marginLeft = '8px';
                msg.style.color = 'green';
                event.currentTarget.parentNode.insertBefore(msg, event.currentTarget.nextSibling);
                setTimeout(() => msg.remove(), 1200);
            });
        }
    }

    // Função dummy para remover mensagem de teste (evita erro caso chamada)
    function removerMensagemTesteExistente() {
        document.querySelectorAll('.neuron-copiado-msg').forEach(el => el.remove());
    }
    function injetarEstilosCSSNecessarios() { //
        if (document.getElementById(NEURON_STYLE_ID)) return;
        const style = document.createElement('style'); style.id = NEURON_STYLE_ID;
        style.textContent = `/* Estilos Neuron para Tratar/Triar (ex: .neuron-copiado-msg se não for inline) */`;
        document.head.appendChild(style);
    }
    function removerEstilosCSSInjetados() { document.getElementById(NEURON_STYLE_ID)?.remove(); } //

    function aplicarMelhoriasDeConteudo() { //
        if (isAdjustingPageSize) { return; }
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Aplicando melhorias de conteúdo (cores, prazos, NUPs).`);
        aplicarCoresDeSituacao();
        aplicarInformacoesDePrazo();
        aplicarRemocaoHrefLinks();
    }

    function criarOuAtualizarUI() { //
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados(); return;
        }
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Ativando funcionalidades.`);
        injetarEstilosCSSNecessarios();
        ajustarItensPorPaginaComVerificacao(); 
        if (!isAdjustingPageSize) { aplicarMelhoriasDeConteudo(); }
        configurarObserverDaPagina();
    }

    function removerElementosCriados() { //
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Desativando funcionalidades.`);
        removerEstilosCSSInjetados();
        removerMensagemTesteExistente();
        desconectarObserverDaPagina();
        document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']").forEach(span => {
            if(span.dataset.neuronPrazoOriginal) {
                 span.innerHTML = span.dataset.neuronPrazoOriginal; 
            }
            delete span.dataset.neuronPrazoOriginal;
            delete span.dataset.neuronPrazoOriginalProcessed;
        });
        document.querySelectorAll('[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]').forEach(link => {
            if (link.classList.contains('neuron-nup-link')) {
                // Para reverter o link, precisaríamos saber o HREF original.
                // Por ora, apenas remove o listener e o estilo de cópia.
                link.removeEventListener('click', copiarNupAction);
                link.style.cursor = '';
                link.title = '';
                link.classList.remove('neuron-nup-link');
            }
        });
         document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")
            .forEach(span => { // Reverter cores de situação (simplificado: remove inline)
                span.style.backgroundColor = '';
                span.style.color = '';
                span.style.padding = '';
                span.style.borderRadius = '';
                span.style.display = '';
            });
    }

    async function verificarEstadoAtualEAgir() { //
        const previousQtdItens = qtdItensConfigurada; 
        const previousScriptEnabled = currentScriptEnabled;
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY]);
        currentMasterEnabled = settings.masterEnableNeuron !== false;
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false;
        await carregarConfiguracoesNeuron(); 
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Estado verificado. Master: ${currentMasterEnabled}, Script: ${currentScriptEnabled}, QtdItens: ${qtdItensConfigurada}`);
        if (currentMasterEnabled && currentScriptEnabled) {
            const qtdItensMudou = previousQtdItens !== qtdItensConfigurada;
            const habilitacaoMudouDeOffParaOn = !previousScriptEnabled && currentScriptEnabled;
            if (habilitacaoMudouDeOffParaOn || qtdItensMudou) {
                isAdjustingPageSize = false; 
                criarOuAtualizarUI();
            } else if (!pageMutationObserver) { 
                configurarObserverDaPagina(); 
                aplicarMelhoriasDeConteudo(); 
            } else { 
                if (!isAdjustingPageSize) aplicarMelhoriasDeConteudo();
            }
        } else {
            removerElementosCriados();
        }
    }

    function configurarObserverDaPagina() { //
        if (pageMutationObserver) { pageMutationObserver.disconnect(); pageMutationObserver = null; }
        if (!currentMasterEnabled || !currentScriptEnabled) return;
        pageMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && !isAdjustingPageSize) {
                clearTimeout(aplicarMelhoriasTimeout);
                aplicarMelhoriasTimeout = setTimeout(() => {
                    console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): DOM alterado (debounced), reaplicando melhorias de conteúdo.`);
                    aplicarMelhoriasDeConteudo();
                }, DEBOUNCE_DELAY_MS);
            }
        });
        const alvoObservacao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel1') || document.body;
        pageMutationObserver.observe(alvoObservacao, { childList: true, subtree: true });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): MutationObserver configurado para ${alvoObservacao.id || 'body'}.`);
    }

    function desconectarObserverDaPagina() { //
        if (pageMutationObserver) {
            pageMutationObserver.disconnect(); pageMutationObserver = null;
        }
        clearTimeout(aplicarMelhoriasTimeout);
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): MutationObserver desconectado.`);
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => { //
        if (namespace === 'local') {
            let reavaliarConfig = false;
            if (changes.masterEnableNeuron !== undefined || changes[SCRIPT_ID_STORAGE_KEY] !== undefined ||
                changes.userHolidays !== undefined || changes[QTD_ITENS_STORAGE_KEY] !== undefined) {
                reavaliarConfig = true;
            }
            if (reavaliarConfig) {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração mudou no storage. Reavaliando...`);
                verificarEstadoAtualEAgir();
            }
        }
    });

    async function init() { //
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Iniciando script.`);
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgir();
    }

    const urlAtual = window.location.href;
    if (urlAtual.includes("/Manifestacao/TratarManifestacoes") || urlAtual.includes("/Manifestacao/TriarManifestacoes")) {
        init();
    } else {
        // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): URL não corresponde, script inativo.`);
    }
})();