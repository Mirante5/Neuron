/**
 * @file date_utils.js
 * @version 4.0 (Sincronização com Promise)
 * @description Módulo central para operações de data que expõe uma Promise 'ready' 
 * para sinalizar quando as configurações foram carregadas.
 */

window.DateUtils = (function() {
    'use strict';

    let holidays = [];
    let globalRules = {};
    let resolveReadyPromise;

    // Cria a Promise que outros scripts podem aguardar.
    const readyPromise = new Promise(resolve => {
        resolveReadyPromise = resolve;
    });

    /**
     * Carrega as configurações e, ao final, resolve a Promise 'ready'.
     */
    (async function carregarConfiguracoes() {
        try {
            const result = await chrome.storage.local.get('neuronUserConfig');
            if (result.neuronUserConfig) {
                const config = result.neuronUserConfig;

                globalRules.weekend = config.prazosSettings?.tratarNovoAjusteFds || 'next';
                globalRules.holiday = config.prazosSettings?.tratarNovoAjusteFeriado || 'proximo_dia';
                holidays = config.holidays || [];

                console.log("DATE_UTILS v4.0: Regras e feriados carregados.", { globalRules, holidays: holidays.length });
            } else {
                console.error("DATE_UTILS v4.0: Objeto 'neuronUserConfig' não encontrado no storage.");
            }
        } catch (error) {
            console.error("DATE_UTILS: Falha crítica ao carregar configurações.", error);
        } finally {
            // Independentemente de sucesso ou falha, sinaliza que a inicialização terminou.
            resolveReadyPromise();
        }
    })();
    
    function parsearData(str) {
        if (!str || !/^\d{2}\/\d{2}\/\d{4}/.test(str)) return null;
        const [dia, mes, ano] = str.split('/');
        return new Date(ano, mes - 1, dia);
    }

    function formatarData(date) {
        if (!(date instanceof Date) || isNaN(date)) return 'Data inválida';
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    function isFeriado(date) {
        return holidays.some(f => f.date === formatarData(date));
    }
    
    function ajustarDataFinal(data, ruleOverrides = {}) {
        let dataAjustada = new Date(data.valueOf());
        
        const fdsRule = ruleOverrides.ajusteFds || globalRules.weekend;
        const holidayRule = ruleOverrides.ajusteFeriado || globalRules.holiday;
        
        if (holidayRule !== 'none') {
            while (isFeriado(dataAjustada)) {
                dataAjustada.setDate(dataAjustada.getDate() + (holidayRule === 'dia_anterior' ? -1 : 1));
            }
        }

        const diaDaSemana = dataAjustada.getDay();
        if (diaDaSemana === 6) { // Sábado
            if (fdsRule === 'modo1' || fdsRule === 'modo3') dataAjustada.setDate(dataAjustada.getDate() - 1);
            else dataAjustada.setDate(dataAjustada.getDate() + 2);
        } else if (diaDaSemana === 0) { // Domingo
            if (fdsRule === 'modo2' || fdsRule === 'modo3') dataAjustada.setDate(dataAjustada.getDate() + 1);
            else dataAjustada.setDate(dataAjustada.getDate() - 2);
        }
        
        if (holidayRule !== 'none') {
             while (isFeriado(dataAjustada)) {
                dataAjustada.setDate(dataAjustada.getDate() + (holidayRule === 'dia_anterior' ? -1 : 1));
            }
        }
        return dataAjustada;
    }

    function adicionarDiasCorridos(dataInicial, dias) {
        const novaData = new Date(dataInicial.valueOf());
        novaData.setDate(novaData.getDate() + dias);
        return novaData;
    }
    
    function adicionarDiasUteis(dataInicial, dias) {
        let novaData = new Date(dataInicial.valueOf());
        let diasAdicionados = 0;
        const direcao = dias > 0 ? 1 : -1;

        while (diasAdicionados < Math.abs(dias)) {
            novaData.setDate(novaData.getDate() + direcao);
            const diaDaSemana = novaData.getDay();
            if (diaDaSemana !== 0 && diaDaSemana !== 6 && !isFeriado(novaData)) {
                diasAdicionados++;
            }
        }
        return novaData;
    }

    function calcularDiasRestantes(dataAlvo) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataFinal = (dataAlvo instanceof Date) ? dataAlvo : parsearData(dataAlvo);
        if (!dataFinal) return '';
        const diffTime = dataFinal.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return '(Hoje)';
        if (diffDays === 1) return '(Amanhã)';
        if (diffDays === -1) return '(Ontem)';
        if (diffDays > 1) return `(em ${diffDays} dias)`;
        return `(${Math.abs(diffDays)} dias atrás)`;
    }

    // Exporta a Promise 'ready' junto com as outras funções.
    return {
        ready: readyPromise,
        parsearData,
        formatarData,
        adicionarDiasCorridos,
        adicionarDiasUteis,
        ajustarDataFinal,
        calcularDiasRestantes
    };
})();