// Neuron/modules/tratar-triar/tratar-triar.js
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tratarTriar';
    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_STORAGE_KEY_TRATARTRIAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRATARTRIAR = 'config/config.json';

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
    let isRevalidating = false;

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

    function calculateAdjustedDate(baseDateStr, offsetDays, useWorkingDays, holidaysTimestamps, weekendRule, holidayRule) {
        if (typeof baseDateStr !== 'string' || !baseDateStr.trim()) {
            console.warn('calculateAdjustedDate: baseDateStr inválida.');
            return null;
        }

        const parts = baseDateStr.split('/');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        let date = new Date(year, month, day);
        if (isNaN(date.getTime()) || date.getDate() !== day) {
            // Data inválida como "31/02/2025"
            return null;
        }

        const isHoliday = (d) => {
            const normalizedTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            return holidaysTimestamps.includes(normalizedTime);
        };

        if (useWorkingDays) {
            let daysToAdd = Math.abs(offsetDays);
            const increment = offsetDays >= 0 ? 1 : -1;
            while (daysToAdd > 0) {
                date.setDate(date.getDate() + increment);
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(date)) {
                    daysToAdd--;
                }
            }
        } else {
            date.setDate(date.getDate() + offsetDays);
        }

        // Ajuste final para garantir que a data não caia em fim de semana ou feriado
        let maxIterations = 10; // Evita loop infinito
        while (maxIterations > 0) {
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isTodayHoliday = !isWeekend && isHoliday(date);

            if (!isWeekend && !isTodayHoliday) {
                break; // É um dia útil, terminamos
            }

            if (isWeekend) {
                if (weekendRule === 'next') {
                    date.setDate(date.getDate() + (dayOfWeek === 6 ? 2 : 1));
                } else if (weekendRule === 'previous') {
                    date.setDate(date.getDate() - (dayOfWeek === 0 ? 2 : 1));
                } else { // split (ou qualquer outro fallback)
                    date.setDate(date.getDate() + (dayOfWeek === 6 ? -1 : 1));
                }
            } else if (isTodayHoliday) {
                if (holidayRule === 'next') {
                    date.setDate(date.getDate() + 1);
                } else if (holidayRule === 'previous') {
                    date.setDate(date.getDate() - 1);
                } else { // "none" ou fallback, não faz nada
                    break;
                }
            }
            maxIterations--;
        }

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

            // Proteção contra elemento de situação ausente
            const situacaoSpan = document.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao']")[index];
            if (!situacaoSpan) { // Se o span de situação não for encontrado para este item, pule a iteração
                return;
            }

            if (span.dataset.neuronPrazoOriginal && !currentScriptEnabled) {
                span.innerHTML = span.dataset.neuronPrazoOriginal;
                const fields = ['neuronPrazoOriginalProcessed', 'neuronPrazoOriginal', 'neuronPrazoFinal', 'neuronDataProrrogacao', 'neuronTramitarData', 'neuronCobrancaData', 'neuronCobrancaProrrogadoData', 'neuronSituacao'];
                fields.forEach(field => delete span.dataset[field]);
                span.className = '';
                return;
            }

            if (span.dataset.neuronPrazoOriginal) {
                prazoOriginalStr = span.dataset.neuronPrazoOriginal;
            } else {
                prazoOriginalStr = span.textContent.trim();
                span.dataset.neuronPrazoOriginal = prazoOriginalStr;
            }
            if (!prazoOriginalStr) return;

            span.className = 'neuron-prazo-info';

            const prazoDataOriginalObj = calculateAdjustedDate(prazoOriginalStr, 0, false, holidaysTT, weekendRuleTT, holidayRuleTT);
            if (!prazoDataOriginalObj) return;

            const dataAtual = new Date();
            dataAtual.setHours(0, 0, 0, 0);

            const tramitarData = calculateAdjustedDate(prazoOriginalStr, tramitacaoInternaDiasTT, tramitacaoInternaDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const cobrancaData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesDiasTT, cobrancaAntesDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const prorrogarEmCalculatedData = calculateAdjustedDate(prazoOriginalStr, prorrogarEmDiasTT, prorrogarEmDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const improrrogavelData = calculateAdjustedDate(prazoOriginalStr, improrrogavelAposProrrogacaoDiasTT, improrrogavelAposProrrogacaoDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);
            const cobrancaProrrogadoData = calculateAdjustedDate(prazoOriginalStr, cobrancaAntesProrrogadoDiasTT, cobrancaAntesProrrogadoDiasUteisTT, holidaysTT, weekendRuleTT, holidayRuleTT);

            const diasUteisTramitar = calcularDiasUteis(dataAtual, tramitarData);
            const diasUteisCobranca = calcularDiasUteis(dataAtual, cobrancaData);
            const diasUteisProrrogar = calcularDiasUteis(dataAtual, prorrogarEmCalculatedData);
            const diasUteisImprorrogavel = calcularDiasUteis(dataAtual, improrrogavelData);

            const situacao = situacaoSpan.textContent.trim();

            span.dataset.neuronPrazoFinal = prazoDataOriginalObj.toISOString();
            span.dataset.neuronSituacao = situacao;
            if (tramitarData) span.dataset.neuronTramitarData = tramitarData.toISOString();
            if (cobrancaData) span.dataset.neuronCobrancaData = cobrancaData.toISOString();
            if (prorrogarEmCalculatedData) span.dataset.neuronDataProrrogacao = prorrogarEmCalculatedData.toISOString();
            if (cobrancaProrrogadoData) span.dataset.neuronCobrancaProrrogadoData = cobrancaProrrogadoData.toISOString();

            let htmlOutput = `<span class="prazo-original">Original: ${prazoOriginalStr}</span>`;
            if (situacao === "Prorrogada") {
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
                }
                if (cobrancaData) {
                    const classeAtraso = cobrancaData < dataAtual ? 'prazo-atrasado' : '';
                    htmlOutput += `<span class="prazo-linha">Cobrança: <b class="${classeAtraso}">${cobrancaData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisCobranca} Dias Úteis]</span>`;
                }
                if (prorrogarEmCalculatedData) {
                    const classeAtraso = prorrogarEmCalculatedData < dataAtual ? 'prazo-atrasado' : '';
                    htmlOutput += `<span class="prazo-linha">Prorrogar: <b class="${classeAtraso}">${prorrogarEmCalculatedData.toLocaleDateString('pt-BR')}</b> [Restam ${diasUteisProrrogar} Dias Úteis]</span>`;
                }
                htmlOutput += `<span class="prazo-linha">Improrrogável: <b>${improrrogavelData ? improrrogavelData.toLocaleDateString('pt-BR') : 'N/A'}</b> [Restam ${diasUteisImprorrogavel} Dias Úteis]</span>`;
            }

            if (span.innerHTML !== htmlOutput) {
                span.innerHTML = htmlOutput;
            }
            span.dataset.neuronPrazoOriginalProcessed = 'true';
        });

        if (window.NEURON_MODULES && typeof window.NEURON_MODULES.runNotificationCheck === 'function') {
            window.NEURON_MODULES.runNotificationCheck();
        }
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
            if (span.dataset.neuronPrazoOriginal) {
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
            return; // O observador já está configurado.
        }
        if (!currentMasterEnabled || !currentScriptEnabled) {
            return; // Não configurar se a feature estiver desabilitada.
        }

        // Esta é a função que será executada após o debounce
        const handleMutation = () => {
            // --- INÍCIO DA CORREÇÃO ---
            // Adicionamos esta verificação para respeitar o processo de revalidação.
            // Se a configuração estiver sendo alterada, o observer não deve interferir.
            if (isRevalidating) {
                return;
            }
            // --- FIM DA CORREÇÃO ---

            // Verifica as condições novamente, pois o estado pode ter mudado durante o debounce
            if (!pageMutationObserver || !currentMasterEnabled || !currentScriptEnabled || isAdjustingPageSize) {
                return;
            }

            // Pausa o observador para evitar que ele detecte as próprias mudanças que vamos fazer
            pageMutationObserver.disconnect();

            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Aplicando melhorias de conteúdo via observer...`, "color: green;");
            aplicarMelhoriasDeConteudo();

            // Se a feature ainda estiver ativa, reinicia o observador
            if (pageMutationObserver && currentMasterEnabled && currentScriptEnabled) {
                const alvo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_upTriagem') || document.body;
                try {
                    pageMutationObserver.observe(alvo, { childList: true, subtree: true });
                } catch (e) {
                    console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao REINICIAR observação após aplicar melhorias: ${e.message}`);
                }
            }
        };

        // O observador apenas agenda a execução da função `handleMutation` com um debounce.
        pageMutationObserver = new MutationObserver(() => {
            clearTimeout(aplicarMelhoriasTimeout);
            aplicarMelhoriasTimeout = setTimeout(handleMutation, DEBOUNCE_DELAY_MS);
        });

        const alvoObservacao = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_upTriagem') || document.body;
        try {
            pageMutationObserver.observe(alvoObservacao, { childList: true, subtree: true });
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Observer da página configurado para observar ${alvoObservacao.id || 'document.body'}.`, "color: green;");
        } catch (e) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao INICIAR observação: ${e.message}`);
            pageMutationObserver = null;
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
        if (isRevalidating) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Revalidação já em andamento. Ignorando nova mudança.`);
            return;
        }

        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRATARTRIAR]) {
            isRevalidating = true;
            console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Configuração alterada via storage.onChanged. Reavaliando...`, "color: orange; font-weight: bold;");

            try {
                await verificarEstadoAtualEAgir();
            } catch (error) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro durante a revalidação.`, error);
            } finally {
                isRevalidating = false;
            }
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
    if (urlAtual.includes("/Manifestacao/TratarManifestacoes") || urlAtual.includes("/Manifestacao/TriarManifestacoes") || urlAtual.includes("/Manifestacao/GerenciarManifestacaoServidor.aspx")) {
        init();
    }
})();