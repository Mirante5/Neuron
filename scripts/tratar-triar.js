// Neuron 0.1.5 β/scripts/tratar-triar.js - COM PRAZOS PARCIALMENTE COMPARTILHADOS E CORREÇÃO FERIADOS
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratarTriar'; //
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_tratarTriar'; //
    const NEURON_STYLE_ID = 'neuronTratarTriarStyles'; //

    const QTD_ITENS_STORAGE_KEY = 'neuronTratarTriarQtdItens'; //
    const QTD_ITENS_POR_PAGINA_DEFAULT = 15; //

    let currentMasterEnabled = false; //
    let currentScriptEnabled = false; //
    let feriadosConfigurados = []; // Timestamps of holidays //
    let neuronWeekendRule = 'next'; // Default weekend adjustment rule
    let neuronHolidayRule = 'next'; // Default holiday adjustment rule


    let qtdItensConfigurada = QTD_ITENS_POR_PAGINA_DEFAULT; //

    let sharedTramitacaoInternaDiasConfig_tt = -10; //
    let sharedTramitacaoInternaDiasUteisConfig_tt = false; //
    const DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_TT = -10; //
    const DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_UTEIS_TT = false; //

    let cobrancaAntesDiasConfig = -5; //
    let cobrancaAntesDiasUteisConfig = true; //
    let prorrogarEmDiasConfig = 0; //
    let prorrogarEmDiasUteisConfig = false; //
    let improrrogavelAposProrrogacaoDiasConfig = 30; //
    let improrrogavelAposProrrogacaoDiasUteisConfig = true; //
    let cobrancaAntesProrrogadoDiasConfig = -5; //
    let cobrancaAntesProrrogadoDiasUteisConfig = true; //

    const DEFAULT_COBRANCA_ANTES_DIAS = -5; //
    const DEFAULT_COBRANCA_ANTES_DIAS_UTEIS = true; //
    const DEFAULT_PRORROGAR_EM_DIAS = 0; //
    const DEFAULT_PRORROGAR_EM_DIAS_UTEIS = false; //
    const DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS = 30; //
    const DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS_UTEIS = true; //
    const DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS = -5; //
    const DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS_UTEIS = true; //


    let pageMutationObserver = null; //
    let isAdjustingPageSize = false; //
    let aplicarMelhoriasTimeout = null; //
    const DEBOUNCE_DELAY_MS = 350; //

    /**
     * Calculates an adjusted date by applying an offset and then ensuring the
     * resulting date is not a weekend or holiday based on provided rules.
     *
     * @param {string} baseDateStr - The base date string in "DD/MM/AAAA" format.
     * @param {number} offsetDays - The number of days to offset from the base date.
     * @param {boolean} useWorkingDaysForOffset - True to count only working days for the offset, false for calendar days.
     * @param {Array<number>} holidaysTimestamps - An array of holiday timestamps (Date.getTime() at start of day).
     * @param {string} weekendRule - How to adjust if landing on a weekend: "next", "previous", "split".
     * @param {string} holidayRule - How to adjust if landing on a holiday (on a weekday): "next", "previous", "none".
     * @returns {Date|null} The adjusted Date object, or null if baseDateStr is invalid.
     */
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
                if (weekendRule === "next") {
                    date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1)); 
                } else if (weekendRule === "previous") {
                    date.setDate(date.getDate() - (dayOfWeek === 0 ? 2 : 1)); 
                } else if (weekendRule === "split") {
                    if (dayOfWeek === 6) date.setDate(date.getDate() - 1); 
                    else date.setDate(date.getDate() + 1);                 
                } else { 
                    date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1));
                }
            } else if (isHoliday(date)) { 
                if (holidayRule === "next") {
                    keepAdjusting = true;
                    date.setDate(date.getDate() + 1);
                } else if (holidayRule === "previous") {
                    keepAdjusting = true;
                    date.setDate(date.getDate() - 1);
                } else if (holidayRule === "none") {
                    keepAdjusting = false;
                } else { 
                    keepAdjusting = true; 
                    date.setDate(date.getDate() + 1);
                }
            }
        }
        if (iterations >= 30) {
            console.warn(`Neuron: calculateAdjustedDate exceeded max iterations for ${baseDateStr}.`);
        }
        return date;
    }


    async function carregarConfiguracoesNeuron() { //
        try { //
            const keysToGet = [ //
                'userHolidays', QTD_ITENS_STORAGE_KEY, //
                'neuronSharedTramitacaoInternaDias', 'neuronSharedTramitacaoInternaDiasUteis', //
                'neuronTratarTriarCobrancaAntesDias', 'neuronTratarTriarCobrancaAntesDiasUteis', //
                'neuronTratarTriarProrrogarEmDias', 'neuronTratarTriarProrrogarEmDiasUteis', //
                'neuronTratarTriarImprorrogavelAposProrrogacaoDias', 'neuronTratarTriarImprorrogavelAposProrrogacaoDiasUteis', //
                'neuronTratarTriarCobrancaAntesProrrogadoDias', 'neuronTratarTriarCobrancaAntesProrrogadoDiasUteis', //
                'neuronWeekendAdjustment', 'neuronHolidayAdjustment'
            ];
            const result = await chrome.storage.local.get(keysToGet); //

            if (result.userHolidays && Array.isArray(result.userHolidays) && result.userHolidays.length > 0 && //
                typeof result.userHolidays[0] === 'object' && result.userHolidays[0].hasOwnProperty('date')) { //
                feriadosConfigurados = result.userHolidays.map(holidayObj => { //
                    const [dia, mes, ano] = holidayObj.date.split('/'); //
                    return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime(); //
                });
            } else { //
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): userHolidays não encontrado ou em formato incorreto no storage. Carregando de config/prazos_feriados.json.`); //
                try { //
                    const response = await fetch(chrome.runtime.getURL('config/prazos_feriados.json')); //
                    if (!response.ok) throw new Error(`Erro HTTP ao carregar prazos_feriados.json: ${response.status}`); //
                    const defaultConfig = await response.json(); //
                    if (defaultConfig.feriados && Array.isArray(defaultConfig.feriados)) { //
                        feriadosConfigurados = defaultConfig.feriados.map(holidayObj => { //
                            const [dia, mes, ano] = holidayObj.date.split('/'); //
                            return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime(); //
                        });
                    } else { //
                        throw new Error("Formato de feriados padrão incorreto em prazos_feriados.json"); //
                    }
                } catch (e) { //
                    console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao carregar feriados padrão de prazos_feriados.json. Usando lista vazia.`, e); //
                    feriadosConfigurados = []; //
                }
            }

            qtdItensConfigurada = result[QTD_ITENS_STORAGE_KEY] !== undefined && !isNaN(parseInt(result[QTD_ITENS_STORAGE_KEY],10)) //
                                ? parseInt(result[QTD_ITENS_STORAGE_KEY], 10) //
                                : QTD_ITENS_POR_PAGINA_DEFAULT; //

            let sharedDias = result.neuronSharedTramitacaoInternaDias; //
            sharedTramitacaoInternaDiasConfig_tt = (sharedDias !== undefined && !isNaN(parseInt(sharedDias, 10))) ? parseInt(sharedDias, 10) : DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_TT; //
            sharedTramitacaoInternaDiasUteisConfig_tt = result.neuronSharedTramitacaoInternaDiasUteis !== undefined ? result.neuronSharedTramitacaoInternaDiasUteis : DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_UTEIS_TT; //

            cobrancaAntesDiasConfig = result.neuronTratarTriarCobrancaAntesDias !== undefined ? parseInt(result.neuronTratarTriarCobrancaAntesDias, 10) : DEFAULT_COBRANCA_ANTES_DIAS; //
            if(isNaN(cobrancaAntesDiasConfig)) cobrancaAntesDiasConfig = DEFAULT_COBRANCA_ANTES_DIAS; //
            cobrancaAntesDiasUteisConfig = result.neuronTratarTriarCobrancaAntesDiasUteis !== undefined ? result.neuronTratarTriarCobrancaAntesDiasUteis : DEFAULT_COBRANCA_ANTES_DIAS_UTEIS; //
            
            prorrogarEmDiasConfig = result.neuronTratarTriarProrrogarEmDias !== undefined ? parseInt(result.neuronTratarTriarProrrogarEmDias, 10) : DEFAULT_PRORROGAR_EM_DIAS; //
            if(isNaN(prorrogarEmDiasConfig)) prorrogarEmDiasConfig = DEFAULT_PRORROGAR_EM_DIAS; //
            prorrogarEmDiasUteisConfig = result.neuronTratarTriarProrrogarEmDiasUteis !== undefined ? result.neuronTratarTriarProrrogarEmDiasUteis : DEFAULT_PRORROGAR_EM_DIAS_UTEIS; //

            improrrogavelAposProrrogacaoDiasConfig = result.neuronTratarTriarImprorrogavelAposProrrogacaoDias !== undefined ? parseInt(result.neuronTratarTriarImprorrogavelAposProrrogacaoDias, 10) : DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS; //
            if(isNaN(improrrogavelAposProrrogacaoDiasConfig)) improrrogavelAposProrrogacaoDiasConfig = DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS; //
            improrrogavelAposProrrogacaoDiasUteisConfig = result.neuronTratarTriarImprorrogavelAposProrrogacaoDiasUteis !== undefined ? result.neuronTratarTriarImprorrogavelAposProrrogacaoDiasUteis : DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS_UTEIS; //

            cobrancaAntesProrrogadoDiasConfig = result.neuronTratarTriarCobrancaAntesProrrogadoDias !== undefined ? parseInt(result.neuronTratarTriarCobrancaAntesProrrogadoDias, 10) : DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS; //
            if(isNaN(cobrancaAntesProrrogadoDiasConfig)) cobrancaAntesProrrogadoDiasConfig = DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS; //
            cobrancaAntesProrrogadoDiasUteisConfig = result.neuronTratarTriarCobrancaAntesProrrogadoDiasUteis !== undefined ? result.neuronTratarTriarCobrancaAntesProrrogadoDiasUteis : DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS_UTEIS; //

            neuronWeekendRule = result.neuronWeekendAdjustment || 'next';
            neuronHolidayRule = result.neuronHolidayAdjustment || 'next';

        } catch (e) { //
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar configs:`, e); //
            feriadosConfigurados = []; //
            qtdItensConfigurada = QTD_ITENS_POR_PAGINA_DEFAULT; //
            sharedTramitacaoInternaDiasConfig_tt = DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_TT; //
            sharedTramitacaoInternaDiasUteisConfig_tt = DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_UTEIS_TT; //
            cobrancaAntesDiasConfig = DEFAULT_COBRANCA_ANTES_DIAS; //
            cobrancaAntesDiasUteisConfig = DEFAULT_COBRANCA_ANTES_DIAS_UTEIS; //
            prorrogarEmDiasConfig = DEFAULT_PRORROGAR_EM_DIAS; //
            prorrogarEmDiasUteisConfig = DEFAULT_PRORROGAR_EM_DIAS_UTEIS; //
            improrrogavelAposProrrogacaoDiasConfig = DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS; //
            improrrogavelAposProrrogacaoDiasUteisConfig = DEFAULT_IMPRORROGAVEL_APOS_PRORROGACAO_DIAS_UTEIS; //
            cobrancaAntesProrrogadoDiasConfig = DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS; //
            cobrancaAntesProrrogadoDiasUteisConfig = DEFAULT_COBRANCA_ANTES_PRORROGADO_DIAS_UTEIS; //
            neuronWeekendRule = 'next';
            neuronHolidayRule = 'next';
        }
    }
    
    const coresSituacaoOriginal = {"Complementação Solicitada": { fundo: "yellow", texto: "black" },"Complementada": { fundo: "green", texto: "white" },"Prorrogada": { fundo: "red", texto: "white" }}; //

    // ehFeriadoOriginal is now encapsulated within calculateAdjustedDate's isHoliday helper
    // function ehFeriadoOriginal(data) { ... } // REMOVE THIS or keep if used elsewhere

    // ajustarDataOriginal is replaced by calculateAdjustedDate
    // function ajustarDataOriginal(dataStr, dias, paraDiaUtil = false) { ... } // REMOVE THIS

    function calcularDiasUteisOriginal(inicio, fim) { //
        if (!(inicio instanceof Date) || !(fim instanceof Date) || isNaN(inicio.getTime()) || isNaN(fim.getTime())) { //
            return 0; //
        }

        let diasUteis = 0; //
        let dataAtualCalc = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()); //
        let dataFim = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()); //

        if (dataAtualCalc > dataFim) return 0; //
        if (dataAtualCalc.getTime() === dataFim.getTime()) return 0; //
        
        const isHolidayLocal = (d) => { // Local helper for this function, using feriadosConfigurados
            const normalizedTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return feriadosConfigurados.includes(normalizedTime);
        };

        while (dataAtualCalc < dataFim) { //
            dataAtualCalc.setDate(dataAtualCalc.getDate() + 1); //
            if (dataAtualCalc.getDay() !== 0 && dataAtualCalc.getDay() !== 6 && !isHolidayLocal(dataAtualCalc)) { //
                if (dataAtualCalc <= dataFim) { //
                    diasUteis++; //
                }
            }
        }
        return diasUteis; //
    }
    
    function ajustarItensPorPaginaComVerificacao() { //
        if (isAdjustingPageSize) { //
            return; //
        }
        const input = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_txtTamanhoPagina'); //
        const botao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_pagTriagem_ctl03_btnAlterarTamanhoPagina'); //
        if (input && botao) { //
            if (input.value !== String(qtdItensConfigurada)) { //
                isAdjustingPageSize = true; //
                input.value = qtdItensConfigurada; //
                botao.click(); //
                setTimeout(() => { //
                    isAdjustingPageSize = false; //
                }, 3000); //
            } else { //
                isAdjustingPageSize = false; //
            }
        } else { //
            isAdjustingPageSize = false; //
        }
    }

    function aplicarCoresDeSituacao() { //
        document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']") //
            .forEach(span => { //
                const situacao = span.textContent.trim(); //
                if (coresSituacaoOriginal[situacao]) { //
                    Object.assign(span.style, { //
                        backgroundColor: coresSituacaoOriginal[situacao].fundo, //
                        color: coresSituacaoOriginal[situacao].texto, //
                        padding: "3px 5px", borderRadius: "5px", display: "inline-block" //
                    });
                }
            });
    }

    function aplicarInformacoesDePrazo() { //
        const spansDePrazo = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']"); //

        spansDePrazo.forEach((span, index) => { //
            let prazoOriginalStr; //
            if (span.dataset.neuronPrazoOriginalProcessed === 'true') { //
                return; //
            }
            if (span.dataset.neuronPrazoOriginal) { //
                prazoOriginalStr = span.dataset.neuronPrazoOriginal; //
            } else { //
                prazoOriginalStr = span.textContent.trim(); //
                span.dataset.neuronPrazoOriginal = prazoOriginalStr; //
            }

            if (!prazoOriginalStr) { //
                return; //
            }
            if (span.innerHTML.includes("Original:") && span.innerHTML.includes("Cobrança em:")) { //
                 span.dataset.neuronPrazoOriginalProcessed = 'true'; //
                 return; //
            }

            const prazoDataOriginalObj = calculateAdjustedDate(prazoOriginalStr, 0, false, feriadosConfigurados, neuronWeekendRule, neuronHolidayRule); //
            if (!prazoDataOriginalObj) { //
                console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao calcular prazoDataOriginalObj para ${prazoOriginalStr}`);
                return; //
            }

            const dataAtual = new Date(); dataAtual.setHours(0,0,0,0); //

            const tramitarData = calculateAdjustedDate(prazoOriginalStr, sharedTramitacaoInternaDiasConfig_tt, sharedTramitacaoInternaDiasUteisConfig_tt, feriadosConfigurados, neuronWeekendRule, neuronHolidayRule); //
            const cobrancaData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesDiasConfig, cobrancaAntesDiasUteisConfig, feriadosConfigurados, neuronWeekendRule, neuronHolidayRule); //
            const prorrogarEmCalculatedData = calculateAdjustedDate(prazoOriginalStr, prorrogarEmDiasConfig, prorrogarEmDiasUteisConfig, feriadosConfigurados, neuronWeekendRule, neuronHolidayRule); //
            const improrrogavelData = calculateAdjustedDate(prazoOriginalStr, improrrogavelAposProrrogacaoDiasConfig, improrrogavelAposProrrogacaoDiasUteisConfig, feriadosConfigurados, neuronWeekendRule, neuronHolidayRule); //

            if (!tramitarData || !cobrancaData || !improrrogavelData || !prorrogarEmCalculatedData) { //
                 console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao calcular uma ou mais datas para ${prazoOriginalStr}`);
                return; //
            }

            const diasUteisTramitar = calcularDiasUteisOriginal(dataAtual, tramitarData); //
            const diasUteisCobranca = calcularDiasUteisOriginal(dataAtual, cobrancaData); //
            const diasUteisProrrogar = calcularDiasUteisOriginal(dataAtual, prorrogarEmCalculatedData); //
            const diasUteisImprorrogavel = calcularDiasUteisOriginal(dataAtual, improrrogavelData); //
            
            const situacaoSpan = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")[index]; //
            const situacao = situacaoSpan ? situacaoSpan.textContent.trim() : ""; //
            
            let htmlOutput = `<span style="font-size:0.9em; color:#777;">Original: ${prazoOriginalStr}</span><br>`; //

            if (situacao === "Prorrogada") { //
                const cobrancaProrrogadoData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesProrrogadoDiasConfig, cobrancaAntesProrrogadoDiasUteisConfig, feriadosConfigurados, neuronWeekendRule, neuronHolidayRule); //
                const diasUteisCobrancaProrrogado = calcularDiasUteisOriginal(dataAtual, cobrancaProrrogadoData); //

                htmlOutput += `Prazo de resposta: --- (Já prorrogado)<br>`; //
                if (cobrancaProrrogadoData && cobrancaProrrogadoData >= dataAtual) { htmlOutput += `Cobrança em: <b>${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> [${diasUteisCobrancaProrrogado} Dias Úteis]<br>`; } //
                else if (cobrancaProrrogadoData) { htmlOutput += `Cobrança em: <b style="color:red;">${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> (ATRASADO) [${diasUteisCobrancaProrrogado} Dias Úteis]<br>`; } //
                else { htmlOutput += `Cobrança em: (erro cálculo)<br>`; } //
                htmlOutput += `Prazo Final: <b>${prazoDataOriginalObj ? prazoDataOriginalObj.toLocaleDateString('pt-BR') : 'N/A'}</b>`; //
            } else { //
                if (tramitarData && tramitarData >= dataAtual) { htmlOutput += `Prazo de resposta: <b>${tramitarData.toLocaleDateString('pt-BR')}</b> [${diasUteisTramitar} Dias Úteis]<br>`; } //
                else if (tramitarData) { htmlOutput += `Prazo de resposta: <b style="color:red;">${tramitarData.toLocaleDateString('pt-BR')}</b> (VERIFICAR) [${diasUteisTramitar} Dias Úteis]<br>`; } //
                else { htmlOutput += `Prazo de resposta: (erro cálculo)<br>`; } //

                if (cobrancaData && cobrancaData >= dataAtual) { htmlOutput += `Cobrança em: <b>${cobrancaData.toLocaleDateString('pt-BR')}</b> [${diasUteisCobranca} Dias Úteis]<br>`; } //
                else if (cobrancaData){ htmlOutput += `Cobrança em: <b style="color:red;">${cobrancaData.toLocaleDateString('pt-BR')}</b> (ATRASADO) [${diasUteisCobranca} Dias Úteis]<br>`; } //
                else { htmlOutput += `Cobrança em: (erro cálculo)<br>`; } //

                if (prorrogarEmCalculatedData && prorrogarEmCalculatedData >= dataAtual) { htmlOutput += `Prorrogar em: <b>${prorrogarEmCalculatedData.toLocaleDateString('pt-BR')}</b> [${diasUteisProrrogar} Dias Úteis]<br>`; } //
                else if (prorrogarEmCalculatedData) { htmlOutput += `Prorrogar em: <b style="color:red;">${prorrogarEmCalculatedData.toLocaleDateString('pt-BR')}</b> (ATRASADO) [${diasUteisProrrogar} Dias Úteis]<br>`; } //
                else { htmlOutput += `Prorrogar em: (erro cálculo)<br>`; } //
                
                htmlOutput += `Improrrogável em: <b>${improrrogavelData ? improrrogavelData.toLocaleDateString('pt-BR') : 'N/A'}</b> [${diasUteisImprorrogavel} Dias Úteis]`; //
            }
            span.innerHTML = htmlOutput; //
            span.dataset.neuronPrazoOriginalProcessed = 'true'; //
        });
    }
    
    function aplicarRemocaoHrefLinks() { //
        document.querySelectorAll('[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]') //
            .forEach(link => { //
                if (link.hasAttribute('href') || !link.classList.contains('neuron-nup-link')) { //
                    link.removeAttribute('href'); //
                    link.style.cursor = 'copy'; //
                    link.title = 'Clique para copiar o NUP'; //
                    link.classList.add('neuron-nup-link'); //
                    link.removeEventListener('click', copiarNupAction);  //
                    link.addEventListener('click', copiarNupAction); //
                }
            });
    }

    function copiarNupAction(event) { //
        event.preventDefault(); //
        const nup = event.currentTarget.textContent.trim(); //
        if (nup) { //
            navigator.clipboard.writeText(nup).then(() => { //
                const msg = document.createElement('span'); //
                msg.textContent = 'Copiado!'; //
                msg.className = 'neuron-copiado-msg'; //
                msg.style.marginLeft = '8px'; msg.style.color = 'green'; msg.style.fontWeight = 'bold'; //
                event.currentTarget.parentNode.insertBefore(msg, event.currentTarget.nextSibling); //
                setTimeout(() => msg.remove(), 1200); //
            });
        }
    }

    function removerMensagemTesteExistente() { //
        document.querySelectorAll('.neuron-copiado-msg').forEach(el => el.remove()); //
    }
    function injetarEstilosCSSNecessarios() { //
        if (document.getElementById(NEURON_STYLE_ID)) return; //
        const style = document.createElement('style'); style.id = NEURON_STYLE_ID; //
        style.textContent = `/* Estilos Neuron para Tratar/Triar */`; //
        document.head.appendChild(style); //
    }
    function removerEstilosCSSInjetados() { document.getElementById(NEURON_STYLE_ID)?.remove(); } //

    function aplicarMelhoriasDeConteudo() { //
        if (isAdjustingPageSize) { return; } //
        aplicarCoresDeSituacao(); //
        aplicarInformacoesDePrazo(); //
        aplicarRemocaoHrefLinks(); //
    }

    function criarOuAtualizarUI() { //
        if (!currentMasterEnabled || !currentScriptEnabled) { //
            removerElementosCriados(); return; //
        }
        injetarEstilosCSSNecessarios(); //
        ajustarItensPorPaginaComVerificacao();  //
        if (!isAdjustingPageSize) { aplicarMelhoriasDeConteudo(); } //
        configurarObserverDaPagina(); //
    }

    function removerElementosCriados() { //
        removerEstilosCSSInjetados(); //
        removerMensagemTesteExistente(); //
        desconectarObserverDaPagina(); //
        document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']").forEach(span => { //
            if(span.dataset.neuronPrazoOriginal) span.innerHTML = span.dataset.neuronPrazoOriginal;  //
            delete span.dataset.neuronPrazoOriginal; delete span.dataset.neuronPrazoOriginalProcessed; //
        });
        document.querySelectorAll('[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]').forEach(link => { //
            if (link.classList.contains('neuron-nup-link')) { //
                link.removeEventListener('click', copiarNupAction); //
                link.style.cursor = ''; link.title = ''; link.classList.remove('neuron-nup-link'); //
            }
        });
         document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']") //
            .forEach(span => { //
                span.style.backgroundColor = ''; span.style.color = ''; span.style.padding = ''; //
                span.style.borderRadius = ''; span.style.display = ''; //
            });
    }

    async function verificarEstadoAtualEAgir() { //
        const previousQtdItens = qtdItensConfigurada;  //
        const previousScriptEnabled = currentScriptEnabled; //
        const settings = await chrome.storage.local.get(['masterEnableNeuron', SCRIPT_ID_STORAGE_KEY]); //
        currentMasterEnabled = settings.masterEnableNeuron !== false; //
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false; //
        
        await carregarConfiguracoesNeuron(); //
        
        if (currentMasterEnabled && currentScriptEnabled) { //
            const qtdItensMudou = previousQtdItens !== qtdItensConfigurada; //
            const habilitacaoMudouDeOffParaOn = !previousScriptEnabled && currentScriptEnabled; //
            
            if (habilitacaoMudouDeOffParaOn || qtdItensMudou) { //
                isAdjustingPageSize = false;  //
                criarOuAtualizarUI();  //
            } else if (!pageMutationObserver) {  //
                configurarObserverDaPagina();  //
                aplicarMelhoriasDeConteudo();  //
            } else {  //
                if (!isAdjustingPageSize) aplicarMelhoriasDeConteudo(); //
            }
        } else { //
            removerElementosCriados(); //
        }
    }

    function configurarObserverDaPagina() { //
        if (pageMutationObserver) { pageMutationObserver.disconnect(); pageMutationObserver = null; } //
        if (!currentMasterEnabled || !currentScriptEnabled) return; //
        
        pageMutationObserver = new MutationObserver(() => { //
            if (currentMasterEnabled && currentScriptEnabled && !isAdjustingPageSize) { //
                clearTimeout(aplicarMelhoriasTimeout); //
                aplicarMelhoriasTimeout = setTimeout(() => { //
                    aplicarMelhoriasDeConteudo(); //
                }, DEBOUNCE_DELAY_MS); //
            }
        });
        const alvoObservacao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel1') || document.body; //
        pageMutationObserver.observe(alvoObservacao, { childList: true, subtree: true }); //
    }

    function desconectarObserverDaPagina() { //
        if (pageMutationObserver) { pageMutationObserver.disconnect(); pageMutationObserver = null; } //
        clearTimeout(aplicarMelhoriasTimeout); //
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => { //
        if (namespace === 'local') { //
            let reavaliarConfig = false; //
            const watchedKeys = [ //
                'masterEnableNeuron', SCRIPT_ID_STORAGE_KEY, 'userHolidays', QTD_ITENS_STORAGE_KEY, //
                'neuronSharedTramitacaoInternaDias', 'neuronSharedTramitacaoInternaDiasUteis', //
                'neuronTratarTriarCobrancaAntesDias', 'neuronTratarTriarCobrancaAntesDiasUteis', //
                'neuronTratarTriarProrrogarEmDias', 'neuronTratarTriarProrrogarEmDiasUteis', //
                'neuronTratarTriarImprorrogavelAposProrrogacaoDias', 'neuronTratarTriarImprorrogavelAposProrrogacaoDiasUteis', //
                'neuronTratarTriarCobrancaAntesProrrogadoDias', 'neuronTratarTriarCobrancaAntesProrrogadoDiasUteis', //
                'neuronWeekendAdjustment', 'neuronHolidayAdjustment'
            ];
            if (watchedKeys.some(key => changes[key] !== undefined)) { //
                reavaliarConfig = true; //
            }

            if (reavaliarConfig) { //
                verificarEstadoAtualEAgir(); //
            }
        }
    });

    async function init() { //
        await new Promise(resolve => { //
            if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve(); //
            window.addEventListener('load', resolve, { once: true }); //
        });
        await verificarEstadoAtualEAgir(); //
    }

    const urlAtual = window.location.href; //
    if (urlAtual.includes("/Manifestacao/TratarManifestacoes") || urlAtual.includes("/Manifestacao/TriarManifestacoes")) { //
        init(); //
    }
})();