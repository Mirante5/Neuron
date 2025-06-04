// Neuron 0.3.1/scripts/tratar-triar.js - CENTRALIZED CONFIG
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratarTriar';
    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_STORAGE_KEY_TRATARTRIAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRATARTRIAR = 'config/config.json';
    const NEURON_STYLE_ID = 'neuronTratarTriarStyles';

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let holidaysTT = [];
    let weekendRuleTT = 'next';
    let holidayRuleTT = 'next';
    let qtdItensConfiguradaTT = 15;

    // Prazos específicos desta tela, com defaults
    let tramitacaoInternaDiasTT = -10;
    let tramitacaoInternaDiasUteisTT = false;
    let cobrancaAntesDiasTT = -5;
    let cobrancaAntesDiasUteisTT = true;
    let prorrogarEmDiasTT = 0;
    let prorrogarEmDiasUteisTT = false;
    let improrrogavelAposProrrogacaoDiasTT = 30;
    let improrrogavelAposProrrogacaoDiasUteisTT = true;
    let cobrancaAntesProrrogadoDiasTT = -5;
    let cobrancaAntesProrrogadoDiasUteisTT = true;

    let pageMutationObserver = null;
    let isAdjustingPageSize = false;
    let aplicarMelhoriasTimeout = null;
    const DEBOUNCE_DELAY_MS = 350;
    const coresSituacaoOriginal = {"Complementação Solicitada": { fundo: "yellow", texto: "black" },"Complementada": { fundo: "green", texto: "white" },"Prorrogada": { fundo: "red", texto: "white" }};

    async function carregarConfiguracoesTratarTriar() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_TRATARTRIAR);
        let fullConfig = {};

        if (result[CONFIG_STORAGE_KEY_TRATARTRIAR] && typeof result[CONFIG_STORAGE_KEY_TRATARTRIAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_TRATARTRIAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRATARTRIAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_TRATARTRIAR}:`, e);
                fullConfig = { 
                    masterEnableNeuron: false, 
                    featureSettings: {}, 
                    generalSettings: { qtdItensTratarTriar: 15 },
                    holidays: [],
                    prazosSettings: {} // Preencher com defaults abaixo se necessário
                };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        qtdItensConfiguradaTT = fullConfig.generalSettings?.qtdItensTratarTriar || 15;
        
        const holidaysFromConfig = fullConfig.holidays || [];
        holidaysTT = holidaysFromConfig.map(h => {
            const [dia, mes, ano] = h.date.split('/');
            return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime();
        });

        const prazosSettings = fullConfig.prazosSettings || {};
        tramitacaoInternaDiasTT = prazosSettings.configTramitacaoInternaDias !== undefined ? parseInt(prazosSettings.configTramitacaoInternaDias) : -10;
        tramitacaoInternaDiasUteisTT = prazosSettings.configTramitacaoInternaDiasUteis !== undefined ? prazosSettings.configTramitacaoInternaDiasUteis : false;
        cobrancaAntesDiasTT = prazosSettings.cobrancaAntesDias !== undefined ? parseInt(prazosSettings.cobrancaAntesDias) : -5;
        cobrancaAntesDiasUteisTT = prazosSettings.cobrancaAntesDiasUteis !== undefined ? prazosSettings.cobrancaAntesDiasUteis : true;
        prorrogarEmDiasTT = prazosSettings.prorrogarEmDias !== undefined ? parseInt(prazosSettings.prorrogarEmDias) : 0;
        prorrogarEmDiasUteisTT = prazosSettings.prorrogarEmDiasUteis !== undefined ? prazosSettings.prorrogarEmDiasUteis : false;
        improrrogavelAposProrrogacaoDiasTT = prazosSettings.improrrogavelAposProrrogacaoDias !== undefined ? parseInt(prazosSettings.improrrogavelAposProrrogacaoDias) : 30;
        improrrogavelAposProrrogacaoDiasUteisTT = prazosSettings.improrrogavelAposProrrogacaoDiasUteis !== undefined ? prazosSettings.improrrogavelAposProrrogacaoDiasUteis : true;
        cobrancaAntesProrrogadoDiasTT = prazosSettings.cobrancaAntesProrrogadoDias !== undefined ? parseInt(prazosSettings.cobrancaAntesProrrogadoDias) : -5;
        cobrancaAntesProrrogadoDiasUteisTT = prazosSettings.cobrancaAntesProrrogadoDiasUteis !== undefined ? prazosSettings.cobrancaAntesProrrogadoDiasUteis : true;
        weekendRuleTT = prazosSettings.weekendAdjustmentRule || 'next';
        holidayRuleTT = prazosSettings.holidayAdjustmentRule || 'next';
    }

    function calculateAdjustedDate(baseDateStr, offsetDays, useWorkingDaysForOffset, holidaysTimestamps, weekendRule, holidayRule) {
        const parts = baseDateStr.split('/');
        if (parts.length !== 3) return null;
        let day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > 2200) return null;

        let date = new Date(year, month, day);
        if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
            return null; 
        }
        const isHoliday = (d) => {
            if (!d || isNaN(d.getTime())) return false;
            const normalizedTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return holidaysTimestamps.includes(normalizedTime);
        };

        if (useWorkingDaysForOffset) {
            const increment = offsetDays >= 0 ? 1 : -1;
            const absOffset = Math.abs(offsetDays);
            if (absOffset > 0) {
                for (let i = 0; i < absOffset; ) {
                    date.setDate(date.getDate() + increment);
                    if (date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date)) {
                        i++; 
                    }
                }
            }
        } else {
            date.setDate(date.getDate() + offsetDays);
        }

        let keepAdjusting = true;
        let iterations = 0; 
        while (keepAdjusting && iterations < 30) { 
            iterations++;
            keepAdjusting = false; 
            const dayOfWeek = date.getDay(); 
            if (dayOfWeek === 0 || dayOfWeek === 6) { 
                keepAdjusting = true;
                if (weekendRule === "next") date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1)); 
                else if (weekendRule === "previous") date.setDate(date.getDate() - (dayOfWeek === 0 ? 2 : 1)); 
                else if (weekendRule === "split") { if (dayOfWeek === 6) date.setDate(date.getDate() - 1); else date.setDate(date.getDate() + 1); }                  
                else date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1));
            } else if (isHoliday(date)) { 
                if (holidayRule === "next") { keepAdjusting = true; date.setDate(date.getDate() + 1); } 
                else if (holidayRule === "previous") { keepAdjusting = true; date.setDate(date.getDate() - 1); } 
                else if (holidayRule === "none") keepAdjusting = false; 
                else { keepAdjusting = true; date.setDate(date.getDate() + 1); }
            }
        }
        if (iterations >= 30) console.warn(`Neuron: calculateAdjustedDate exceeded max iterations for ${baseDateStr}.`);
        return date;
    }

    function calcularDiasUteis(inicio, fim) {
        if (!(inicio instanceof Date) || !(fim instanceof Date) || isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
        let diasUteis = 0;
        let dataAtualCalc = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
        let dataFim = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
        if (dataAtualCalc > dataFim) return 0;
        if (dataAtualCalc.getTime() === dataFim.getTime()) return 0;
        
        const isHolidayLocal = (d) => {
            const normalizedTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return holidaysTT.includes(normalizedTime);
        };

        while (dataAtualCalc < dataFim) {
            dataAtualCalc.setDate(dataAtualCalc.getDate() + 1);
            if (dataAtualCalc.getDay() !== 0 && dataAtualCalc.getDay() !== 6 && !isHolidayLocal(dataAtualCalc)) {
                if (dataAtualCalc <= dataFim) diasUteis++;
            }
        }
        return diasUteis;
    }
    
    function ajustarItensPorPaginaComVerificacao() {
        if (isAdjustingPageSize) return;
        const input = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_txtTamanhoPagina');
        const botao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_btnAlterarTamanhoPagina');
        if (input && botao) {
            if (input.value !== String(qtdItensConfiguradaTT)) {
                isAdjustingPageSize = true;
                input.value = qtdItensConfiguradaTT;
                botao.click();
                setTimeout(() => { isAdjustingPageSize = false; }, 3000);
            } else {
                isAdjustingPageSize = false;
            }
        } else {
            isAdjustingPageSize = false;
        }
    }

    function aplicarCoresDeSituacao() {
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

    function aplicarInformacoesDePrazo() {
        const spansDePrazo = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']");
        spansDePrazo.forEach((span, index) => {
            let prazoOriginalStr;
            if (span.dataset.neuronPrazoOriginalProcessed === 'true') return;
            if (span.dataset.neuronPrazoOriginal) {
                prazoOriginalStr = span.dataset.neuronPrazoOriginal;
            } else {
                prazoOriginalStr = span.textContent.trim();
                span.dataset.neuronPrazoOriginal = prazoOriginalStr;
            }
            if (!prazoOriginalStr) return;
            if (span.innerHTML.includes("Original:") && span.innerHTML.includes("Cobrança em:")) {
                 span.dataset.neuronPrazoOriginalProcessed = 'true';
                 return;
            }

            const prazoDataOriginalObj = calculateAdjustedDate(prazoOriginalStr, 0, false, holidaysTT, weekendRuleTT, holidayRuleTT);
            if (!prazoDataOriginalObj) {
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao calcular prazoDataOriginalObj para ${prazoOriginalStr}`);
                return;
            }
            const dataAtual = new Date(); dataAtual.setHours(0,0,0,0);

            const tramitarData = calculateAdjustedDate(prazoOriginalStr, tramitacaoInternaDiasTT, tramitacaoInternaDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const cobrancaData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesDiasTT, cobrancaAntesDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const prorrogarEmCalculatedData = calculateAdjustedDate(prazoOriginalStr, prorrogarEmDiasTT, prorrogarEmDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const improrrogavelData = calculateAdjustedDate(prazoOriginalStr, improrrogavelAposProrrogacaoDiasTT, improrrogavelAposProrrogacaoDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);

            if (!tramitarData || !cobrancaData || !improrrogavelData || !prorrogarEmCalculatedData) {
                 console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao calcular uma ou mais datas para ${prazoOriginalStr}`);
                return;
            }

            const diasUteisTramitar = calcularDiasUteis(dataAtual, tramitarData);
            const diasUteisCobranca = calcularDiasUteis(dataAtual, cobrancaData);
            const diasUteisProrrogar = calcularDiasUteis(dataAtual, prorrogarEmCalculatedData);
            const diasUteisImprorrogavel = calcularDiasUteis(dataAtual, improrrogavelData);
            
            const situacaoSpan = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")[index];
            const situacao = situacaoSpan ? situacaoSpan.textContent.trim() : "";
            let htmlOutput = `<span style="font-size:0.9em; color:#777;">Original: ${prazoOriginalStr}</span><br>`;

            if (situacao === "Prorrogada") {
                const cobrancaProrrogadoData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesProrrogadoDiasTT, cobrancaAntesProrrogadoDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
                const diasUteisCobrancaProrrogado = calcularDiasUteis(dataAtual, cobrancaProrrogadoData);
                htmlOutput += `Prazo de resposta: --- (Já prorrogado)<br>`;
                if (cobrancaProrrogadoData && cobrancaProrrogadoData >= dataAtual) htmlOutput += `Cobrança em: <b>${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisCobrancaProrrogado} Dias Úteis]<br>`;
                else if (cobrancaProrrogadoData) htmlOutput += `Cobrança em: <b style="color:red;">${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> (ATRASADO) [Restam ${diasUteisCobrancaProrrogado} Dias Úteis]<br>`;
                else htmlOutput += `Cobrança em: (erro cálculo)<br>`;
                htmlOutput += `Prazo Final: <b>${prazoDataOriginalObj ? prazoDataOriginalObj.toLocaleDateString('pt-BR') : 'N/A'}</b>`;
            } else {
                if (tramitarData && tramitarData >= dataAtual) htmlOutput += `Tramitar em: <b>${tramitarData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisTramitar} Dias Úteis]<br>`;
                else if (tramitarData) htmlOutput += `Tramitar em: <b style="color:red;">${tramitarData.toLocaleDateString('pt-BR')}</b> (VERIFICAR) [Restam ${diasUteisTramitar} Dias Úteis]<br>`;
                else htmlOutput += `Tramitar em: (erro cálculo)<br>`;

                if (cobrancaData && cobrancaData >= dataAtual) htmlOutput += `Cobrança em: <b>${cobrancaData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisCobranca} Dias Úteis]<br>`;
                else if (cobrancaData) htmlOutput += `Cobrança em: <b style="color:red;">${cobrancaData.toLocaleDateString('pt-BR')}</b> (ATRASADO) [Restam ${diasUteisCobranca} Dias Úteis]<br>`;
                else htmlOutput += `Cobrança em: (erro cálculo)<br>`;

                if (prorrogarEmCalculatedData && prorrogarEmCalculatedData >= dataAtual) htmlOutput += `Prorrogar em: <b>${prorrogarEmCalculatedData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisProrrogar} Dias Úteis]<br>`;
                else if (prorrogarEmCalculatedData) htmlOutput += `Prorrogar em: <b style="color:red;">${prorrogarEmCalculatedData.toLocaleDateString('pt-BR')}</b> (ATRASADO) [Restam ${diasUteisProrrogar} Dias Úteis]<br>`;
                else htmlOutput += `Prorrogar em: (erro cálculo)<br>`;
                
                htmlOutput += `Improrrogável em: <b>${improrrogavelData ? improrrogavelData.toLocaleDateString('pt-BR') : 'N/A'}</b> [Restam ${diasUteisImprorrogavel} Dias Úteis]`;
            }
            span.innerHTML = htmlOutput;
            span.dataset.neuronPrazoOriginalProcessed = 'true';
        });
    }
    
    function aplicarRemocaoHrefLinks() {
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

    function copiarNupAction(event) {
        event.preventDefault();
        const nup = event.currentTarget.textContent.trim();
        if (nup) {
            navigator.clipboard.writeText(nup).then(() => {
                const msg = document.createElement('span');
                msg.textContent = 'Copiado!';
                msg.className = 'neuron-copiado-msg';
                msg.style.marginLeft = '8px'; msg.style.color = 'green'; msg.style.fontWeight = 'bold';
                event.currentTarget.parentNode.insertBefore(msg, event.currentTarget.nextSibling);
                setTimeout(() => msg.remove(), 1200);
            });
        }
    }

    function removerMensagemTesteExistente() {
        document.querySelectorAll('.neuron-copiado-msg').forEach(el => el.remove());
    }

    function injetarEstilosCSSNecessarios() {
        let style = document.getElementById(NEURON_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = NEURON_STYLE_ID;
            document.head.appendChild(style);
        }
        // Adiciona ou sobrescreve o conteúdo do estilo
        // Garante que outras regras Neuron não sejam perdidas se esta função for chamada múltiplas vezes
        // ou se outros scripts também injetarem estilos no mesmo elemento <style>.
        // Para este caso, vamos apenas adicionar a nova regra. Se precisar de mais complexidade,
        // seria melhor ter uma gestão centralizada de estilos dinâmicos.
        const novaRegra = `
            .col-md-3.coluna1dalista {
                font-size: 12px !important; /* !important para garantir que sobrescreva, se necessário */
            }
        `;
        
        // Verifica se a regra já existe para não duplicar (simplificado)
        if (!style.textContent.includes('.col-md-3.coluna1dalista')) {
            style.textContent += novaRegra;
        }
    }

    function removerEstilosCSSInjetados() {
        const styleElement = document.getElementById(NEURON_STYLE_ID);
        if (styleElement) {
            // Se você só quer remover a regra específica, precisaria de uma lógica mais complexa
            // para parsear e remover apenas essa regra.
            // Para simplificar, remover o elemento <style> inteiro se Neuron for desabilitado
            // ou, se outros scripts podem usar o mesmo NEURON_STYLE_ID, apenas limpar o conteúdo relevante.
            // Neste caso, como é a única regra adicionada aqui (ou deveria ser a única gerenciada por esta função),
            // podemos apenas limpar a regra específica.
            // Mas como a função original remove tudo, vamos manter esse comportamento por enquanto.
            // Para uma solução mais robusta, cada script deveria ter seu próprio <style> id ou
            // uma forma de adicionar/remover regras específicas.
            styleElement.remove();
        }
    }

    function aplicarMelhoriasDeConteudo() {
        if (isAdjustingPageSize) return;
        aplicarCoresDeSituacao();
        aplicarInformacoesDePrazo();
        aplicarRemocaoHrefLinks();
    }

    function criarOuAtualizarUI() {
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados(); return;
        }
        injetarEstilosCSSNecessarios(); // Chamada para injetar os estilos
        ajustarItensPorPaginaComVerificacao(); 
        if (!isAdjustingPageSize) aplicarMelhoriasDeConteudo();
        configurarObserverDaPagina();
    }

    function removerElementosCriados() {
        removerEstilosCSSInjetados();
        removerMensagemTesteExistente();
        desconectarObserverDaPagina();
        document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']").forEach(span => {
            if(span.dataset.neuronPrazoOriginal) span.innerHTML = span.dataset.neuronPrazoOriginal; 
            delete span.dataset.neuronPrazoOriginal; delete span.dataset.neuronPrazoOriginalProcessed;
        });
        document.querySelectorAll('[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]').forEach(link => {
            if (link.classList.contains('neuron-nup-link')) {
                link.removeEventListener('click', copiarNupAction);
                link.style.cursor = ''; link.title = ''; link.classList.remove('neuron-nup-link');
            }
        });
         document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")
            .forEach(span => {
                span.style.backgroundColor = ''; span.style.color = ''; span.style.padding = '';
                span.style.borderRadius = ''; span.style.display = '';
            });
    }

    async function verificarEstadoAtualEAgir() {
        const previousQtdItens = qtdItensConfiguradaTT; 
        const previousScriptEnabled = currentScriptEnabled;
        await carregarConfiguracoesTratarTriar();
        
        if (currentMasterEnabled && currentScriptEnabled) {
            const qtdItensMudou = previousQtdItens !== qtdItensConfiguradaTT;
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

    function configurarObserverDaPagina() {
        if (pageMutationObserver) { pageMutationObserver.disconnect(); pageMutationObserver = null; }
        if (!currentMasterEnabled || !currentScriptEnabled) return;
        
        pageMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && !isAdjustingPageSize) {
                clearTimeout(aplicarMelhoriasTimeout);
                aplicarMelhoriasTimeout = setTimeout(aplicarMelhoriasDeConteudo, DEBOUNCE_DELAY_MS);
            }
        });
        const alvoObservacao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel1') || document.body;
        pageMutationObserver.observe(alvoObservacao, { childList: true, subtree: true });
    }

    function desconectarObserverDaPagina() {
        if (pageMutationObserver) { pageMutationObserver.disconnect(); pageMutationObserver = null; }
        clearTimeout(aplicarMelhoriasTimeout);
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRATARTRIAR]) {
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
            window.addEventListener('load', resolve, { once: true });
        });
        await verificarEstadoAtualEAgir();
    }

    const urlAtual = window.location.href;
    if (urlAtual.includes("/Manifestacao/TratarManifestacoes") || urlAtual.includes("/Manifestacao/TriarManifestacoes")) {
        init();
    }
})();