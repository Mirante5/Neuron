// Neuron/scripts/tratar-triar.js - CSS Externalizado e Melhorias
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratarTriar';
    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_STORAGE_KEY_TRATARTRIAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRATARTRIAR = 'config/config.json';

    // ... (demais constantes e variáveis globais do script permanecem as mesmas) ...
    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let holidaysTT = [];
    let weekendRuleTT = 'next';
    let holidayRuleTT = 'next';
    let qtdItensConfiguradaTT = 15;

    let tramitacaoInternaDiasTT = -10, tramitacaoInternaDiasUteisTT = false;
    let cobrancaAntesDiasTT = -5, cobrancaAntesDiasUteisTT = true;
    let prorrogarEmDiasTT = 0, prorrogarEmDiasUteisTT = false;
    let improrrogavelAposProrrogacaoDiasTT = 30, improrrogavelAposProrrogacaoDiasUteisTT = true;
    let cobrancaAntesProrrogadoDiasTT = -5, cobrancaAntesProrrogadoDiasUteisTT = true;

    let pageMutationObserver = null;
    let isAdjustingPageSize = false;
    let aplicarMelhoriasTimeout = null;
    const DEBOUNCE_DELAY_MS = 350;

    async function carregarConfiguracoesTratarTriar() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Carregando configurações...`, "color: blue; font-weight: bold;");
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
                    masterEnableNeuron: false, featureSettings: {}, 
                    generalSettings: { qtdItensTratarTriar: 15 },
                    holidays: [], prazosSettings: {}
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
        tramitacaoInternaDiasTT = prazosSettings.configTramitacaoInternaDias ?? -10;
        tramitacaoInternaDiasUteisTT = prazosSettings.configTramitacaoInternaDiasUteis ?? false;
        cobrancaAntesDiasTT = prazosSettings.cobrancaAntesDias ?? -5;
        cobrancaAntesDiasUteisTT = prazosSettings.cobrancaAntesDiasUteis ?? true;
        prorrogarEmDiasTT = prazosSettings.prorrogarEmDias ?? 0;
        prorrogarEmDiasUteisTT = prazosSettings.prorrogarEmDiasUteis ?? false;
        improrrogavelAposProrrogacaoDiasTT = prazosSettings.improrrogavelAposProrrogacaoDias ?? 30;
        improrrogavelAposProrrogacaoDiasUteisTT = prazosSettings.improrrogavelAposProrrogacaoDiasUteis ?? true;
        cobrancaAntesProrrogadoDiasTT = prazosSettings.cobrancaAntesProrrogadoDias ?? -5;
        cobrancaAntesProrrogadoDiasUteisTT = prazosSettings.cobrancaAntesProrrogadoDiasUteis ?? true;
        weekendRuleTT = prazosSettings.weekendAdjustmentRule || 'next';
        holidayRuleTT = prazosSettings.holidayAdjustmentRule || 'next';
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configurações carregadas. Master: ${currentMasterEnabled}, Script: ${currentScriptEnabled}, QtdItens: ${qtdItensConfiguradaTT}`);
    }

    function calculateAdjustedDate(baseDateStr, offsetDays, useWorkingDaysForOffset, holidaysTimestamps, weekendRule, holidayRule) {
        const parts = baseDateStr.split('/');
        if (parts.length !== 3) return null;
        let day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > 2200) return null;
        let date = new Date(year, month, day);
        if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) return null; 
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
                    if (date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date)) i++; 
                }
            }
        } else {
            date.setDate(date.getDate() + offsetDays);
        }
        let keepAdjusting = true, iterations = 0; 
        while (keepAdjusting && iterations < 30) { 
            iterations++; keepAdjusting = false; 
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
        if (iterations >= 30) console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): calculateAdjustedDate exceeded max iterations for ${baseDateStr}.`);
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
                span.classList.remove(
                    'neuron-situacao-complementacao-solicitada', 
                    'neuron-situacao-complementada', 
                    'neuron-situacao-prorrogada',
                    'neuron-situacao' 
                );
                span.style.backgroundColor = ''; span.style.color = '';
                span.style.padding = ''; span.style.borderRadius = ''; span.style.display = '';

                let situacaoClass = '';
                if (situacao === "Complementação Solicitada") {
                    situacaoClass = 'neuron-situacao-complementacao-solicitada';
                } else if (situacao === "Complementada") {
                    situacaoClass = 'neuron-situacao-complementada';
                } else if (situacao === "Prorrogada") {
                    situacaoClass = 'neuron-situacao-prorrogada';
                }

                if (situacaoClass) {
                    span.classList.add('neuron-situacao', situacaoClass);
                }
            });
    }

    function aplicarInformacoesDePrazo() {
        const spansDePrazo = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']");
        spansDePrazo.forEach((span, index) => {
            let prazoOriginalStr;
            if (span.dataset.neuronPrazoOriginalProcessed === 'true' && !currentScriptEnabled) {
                 return;
            }
             if (span.dataset.neuronPrazoOriginal && !currentScriptEnabled) { 
                span.innerHTML = span.dataset.neuronPrazoOriginal;
                delete span.dataset.neuronPrazoOriginalProcessed;
                return;
            }

            if (span.dataset.neuronPrazoOriginal) {
                prazoOriginalStr = span.dataset.neuronPrazoOriginal;
            } else {
                prazoOriginalStr = span.textContent.trim();
                span.dataset.neuronPrazoOriginal = prazoOriginalStr;
            }
            if (!prazoOriginalStr) return;

            span.className = ''; 
            span.classList.add('neuron-prazo-info');

            const prazoDataOriginalObj = calculateAdjustedDate(prazoOriginalStr, 0, false, holidaysTT, weekendRuleTT, holidayRuleTT);
            if (!prazoDataOriginalObj) return;
            
            const dataAtual = new Date(); dataAtual.setHours(0,0,0,0);

            const tramitarData = calculateAdjustedDate(prazoOriginalStr, tramitacaoInternaDiasTT, tramitacaoInternaDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const cobrancaData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesDiasTT, cobrancaAntesDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const prorrogarEmCalculatedData = calculateAdjustedDate(prazoOriginalStr, prorrogarEmDiasTT, prorrogarEmDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const improrrogavelData = calculateAdjustedDate(prazoOriginalStr, improrrogavelAposProrrogacaoDiasTT, improrrogavelAposProrrogacaoDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);

            if (!tramitarData || !cobrancaData || !improrrogavelData || !prorrogarEmCalculatedData) return;

            const diasUteisTramitar = calcularDiasUteis(dataAtual, tramitarData);
            const diasUteisCobranca = calcularDiasUteis(dataAtual, cobrancaData);
            const diasUteisProrrogar = calcularDiasUteis(dataAtual, prorrogarEmCalculatedData);
            const diasUteisImprorrogavel = calcularDiasUteis(dataAtual, improrrogavelData);
            
            const situacaoSpan = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")[index];
            const situacao = situacaoSpan ? situacaoSpan.textContent.trim() : "";
            
            let htmlOutput = `<span class="prazo-original">Original: ${prazoOriginalStr}</span>`;

            if (situacao === "Prorrogada") {
                const cobrancaProrrogadoData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesProrrogadoDiasTT, cobrancaAntesProrrogadoDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
                const diasUteisCobrancaProrrogado = calcularDiasUteis(dataAtual, cobrancaProrrogadoData);
                htmlOutput += `<span class="prazo-linha">Prazo de resposta: --- (Já prorrogado)</span>`;
                if (cobrancaProrrogadoData) {
                    const classeAtraso = cobrancaProrrogadoData < dataAtual ? 'prazo-atrasado' : '';
                    htmlOutput += `<span class="prazo-linha">Cobrança em: <b class="${classeAtraso}">${cobrancaProrrogadoData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisCobrancaProrrogado} Dias Úteis]</span>`;
                } else { htmlOutput += `<span class="prazo-linha">Cobrança em: (erro cálculo)</span>`; }
                htmlOutput += `<span class="prazo-linha">Prazo Final: <b>${prazoDataOriginalObj ? prazoDataOriginalObj.toLocaleDateString('pt-BR') : 'N/A'}</b></span>`;
            } else {
                if (tramitarData) {
                    const classeAtraso = tramitarData < dataAtual ? 'prazo-atrasado' : '';
                    htmlOutput += `<span class="prazo-linha">Prazo Interno: <b class="${classeAtraso}">${tramitarData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisTramitar} Dias Úteis]</span>`;
                } else { htmlOutput += `<span class="prazo-linha">Prazo Interno: (erro cálculo)</span>`; }

                if (cobrancaData) {
                    const classeAtraso = cobrancaData < dataAtual ? 'prazo-atrasado' : '';
                    htmlOutput += `<span class="prazo-linha">Cobrança: <b class="${classeAtraso}">${cobrancaData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisCobranca} Dias Úteis]</span>`;
                } else { htmlOutput += `<span class="prazo-linha">Cobrança: (erro cálculo)</span>`; }

                if (prorrogarEmCalculatedData) {
                    const classeAtraso = prorrogarEmCalculatedData < dataAtual ? 'prazo-atrasado' : '';
                    htmlOutput += `<span class="prazo-linha">Prorrogar: <b class="${classeAtraso}">${prorrogarEmCalculatedData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisProrrogar} Dias Úteis]</span>`;
                } else { htmlOutput += `<span class="prazo-linha">Prorrogar: (erro cálculo)</span>`; }
                
                htmlOutput += `<span class="prazo-linha">Improrrogável: <b>${improrrogavelData ? improrrogavelData.toLocaleDateString('pt-BR') : 'N/A'}</b> [Restam ${diasUteisImprorrogavel} Dias Úteis]</span>`;
            }
            // Somente atualiza o innerHTML se for diferente, para minimizar mutações desnecessárias
            if (span.innerHTML !== htmlOutput) {
                span.innerHTML = htmlOutput;
            }
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
                removerMensagemCopiadoExistente(event.currentTarget.parentNode);

                const msg = document.createElement('span');
                msg.textContent = 'Copiado!';
                msg.className = 'neuron-copiado-msg-style'; 
                event.currentTarget.parentNode.insertBefore(msg, event.currentTarget.nextSibling);
                setTimeout(() => msg.remove(), 1200);
            }).catch(err => console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao copiar NUP: `, err));
        }
    }

    function removerMensagemCopiadoExistente(parentNode) {
        parentNode.querySelectorAll('.neuron-copiado-msg-style').forEach(el => el.remove());
    }

    function aplicarMelhoriasDeConteudo() {
        if (isAdjustingPageSize) return;
        // O log original problemático estava aqui. Removido ou movido para um local de menor frequência, se necessário.
        // Se precisar de um log aqui, considere torná-lo condicional ou menos frequente.
        // Por exemplo: console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Verificando e aplicando melhorias de conteúdo...`, "color: green;");
        aplicarCoresDeSituacao();
        aplicarInformacoesDePrazo();
        aplicarRemocaoHrefLinks();
    }

    function criarOuAtualizarUI() {
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados(); 
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): UI Neuron removida ou não será criada (desabilitado).`, "color: red;");
            return;
        }
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Criando ou atualizando UI Neuron...`, "color: blue;");
        ajustarItensPorPaginaComVerificacao(); 
        if (!isAdjustingPageSize) {
            aplicarMelhoriasDeConteudo();
        }
        configurarObserverDaPagina(); 
    }

    function removerElementosCriados() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Revertendo todas as modificações Neuron na página.`, "color: red;");
        document.querySelectorAll('.neuron-copiado-msg-style').forEach(el => el.remove());

        document.querySelectorAll("span.neuron-prazo-info[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta']").forEach(span => {
            if(span.dataset.neuronPrazoOriginal) {
                span.innerHTML = span.dataset.neuronPrazoOriginal; 
            }
            delete span.dataset.neuronPrazoOriginal; 
            delete span.dataset.neuronPrazoOriginalProcessed;
            span.className = ''; 
        });

        document.querySelectorAll('[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"].neuron-nup-link').forEach(link => {
            link.removeEventListener('click', copiarNupAction);
            link.style.cursor = ''; 
            link.title = ''; 
            link.classList.remove('neuron-nup-link');
        });

        document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao'].neuron-situacao")
            .forEach(span => {
                span.classList.remove(
                    'neuron-situacao-complementacao-solicitada', 
                    'neuron-situacao-complementada', 
                    'neuron-situacao-prorrogada',
                    'neuron-situacao'
                );
                span.style.backgroundColor = ''; span.style.color = '';
                span.style.padding = ''; span.style.borderRadius = ''; span.style.display = '';
            });
        
        desconectarObserverDaPagina();
    }

    async function verificarEstadoAtualEAgir() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Verificando estado atual e agindo...`, "color: blue;");
        const previousQtdItens = qtdItensConfiguradaTT; 
        const previousScriptEnabled = currentScriptEnabled; 
        await carregarConfiguracoesTratarTriar();
        
        if (currentMasterEnabled && currentScriptEnabled) {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Master e Script HABILITADOS. Aplicando UI.`);
            const qtdItensMudou = previousQtdItens !== qtdItensConfiguradaTT;
            if ((!previousScriptEnabled && currentScriptEnabled) || qtdItensMudou) {
                isAdjustingPageSize = false; 
                criarOuAtualizarUI(); 
            } else if (!pageMutationObserver) { 
                criarOuAtualizarUI();
            } else { 
                if (!isAdjustingPageSize) {
                    aplicarMelhoriasDeConteudo();
                }
            }
        } else {
            console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Master ou Script DESABILITADOS. Removendo UI.`);
            removerElementosCriados(); 
        }
    }

    function configurarObserverDaPagina() {
        if (pageMutationObserver) {
            // Se o observer já existe e está configurado, não faz nada para evitar recriação desnecessária.
            // A lógica de desconectar/reconectar será feita dentro do callback do observer.
            return;
        }
        if (!currentMasterEnabled || !currentScriptEnabled) {
            // console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Não configurando observer (desabilitado).`);
            return;
        }
        
        pageMutationObserver = new MutationObserver(() => {
            if (currentMasterEnabled && currentScriptEnabled && !isAdjustingPageSize) {
                clearTimeout(aplicarMelhoriasTimeout); // Limpa timeout anterior para debounce

                aplicarMelhoriasTimeout = setTimeout(() => {
                    // Verifica se o observer ainda existe (pode ter sido desconectado/anulado por outra lógica)
                    if (!pageMutationObserver) return; 

                    pageMutationObserver.disconnect(); // PAUSA o observer antes de modificar o DOM

                    // Log principal que estava causando repetição, agora é chamado após debounce e com o observer pausado.
                    console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Aplicando melhorias de conteúdo via observer...`, "color: green;");
                    aplicarMelhoriasDeConteudo(); // Executa as modificações

                    // RETOMA o observer para pegar futuras mutações da página, somente se ainda for necessário
                    if (currentMasterEnabled && currentScriptEnabled && pageMutationObserver) {
                        const alvo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel1') || document.body;
                        try {
                            pageMutationObserver.observe(alvo, { childList: true, subtree: true });
                        } catch (e) {
                             console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao REINICIAR observação após aplicar melhorias: ${e.message}`);
                        }
                    }
                }, DEBOUNCE_DELAY_MS);
            }
        });

        const alvoObservacao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_UpdatePanel1') || document.body;
        try {
            pageMutationObserver.observe(alvoObservacao, { childList: true, subtree: true });
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página configurado para observar ${alvoObservacao.id || 'document.body'}.`, "color: green;");
        } catch (e) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao INICIAR observação: ${e.message}`);
            pageMutationObserver = null; // Garante que não fique em estado inconsistente
        }
    }

    function desconectarObserverDaPagina() {
        if (pageMutationObserver) { 
            pageMutationObserver.disconnect(); 
            pageMutationObserver = null; 
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página DESCONECTADO.`, "color: red;");
        }
        clearTimeout(aplicarMelhoriasTimeout);
    }
    
    chrome.storage.onChanged.addListener(async (changes, namespace) => { 
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRATARTRIAR]) {
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Configuração alterada via storage.onChanged. Reavaliando...`, "color: orange; font-weight: bold;");
            await verificarEstadoAtualEAgir(); 
        }
    });

    async function init() {
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Inicializando script...`, "color: purple; font-weight: bold;");
        await new Promise(resolve => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                 resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            }
        });
        console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): Documento carregado/interativo.`);
        await verificarEstadoAtualEAgir();
    }

    const urlAtual = window.location.href;
    if (urlAtual.includes("/Manifestacao/TratarManifestacoes") || urlAtual.includes("/Manifestacao/TriarManifestacoes")) {
        init();
    }
})();