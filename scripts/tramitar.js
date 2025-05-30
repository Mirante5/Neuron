// Neuron 0.1.5 β/scripts/tramitar.js - COM PRAZOS COMPARTILHADOS E FERIADOS
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tramitar'; //
    const SCRIPT_ID_STORAGE_KEY = 'scriptEnabled_tramitar'; //

    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento'; //
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem'; //
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags'; //
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento'; //
    const CONTAINER_PAINEL_SELECTOR = '.col-md-6.col-md-push-6.hidden-print';  //

    let currentMasterEnabled = false; //
    let currentScriptEnabled = false; //
    let pontosFocaisConfig = {}; //
    let textMessagesConfig = { Tramitar: {} };  //
    let feriadosConfiguradosTramitar = []; // Timestamps //
    let neuronWeekendRuleTramitar = 'next'; // Default
    let neuronHolidayRuleTramitar = 'next'; // Default


    let sharedTramitacaoInternaDiasConfig = -10;  //
    let sharedTramitacaoInternaDiasUteisConfig = false;  //
    const DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS = -10;  //
    const DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_UTEIS = false;  //

    let painelPontosFocaisElement = null; //
    let selectMensagensElement = null; //

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


    async function carregarPontosFocaisConfig() { //
        try { //
            const storageResult = await chrome.storage.local.get('userPontosFocaisJson'); //
            if (storageResult.userPontosFocaisJson && typeof storageResult.userPontosFocaisJson === 'string') { //
                pontosFocaisConfig = JSON.parse(storageResult.userPontosFocaisJson); //
            } else { //
                const response = await fetch(chrome.runtime.getURL('config/pontosfocais.json')); //
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`); //
                pontosFocaisConfig = await response.json(); //
            }
        } catch (e) { //
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar pontosfocais.json:`, e); //
            pontosFocaisConfig = {};  //
        }
    }

    async function carregarTextMessagesConfig() { //
        try { //
            const storageResult = await chrome.storage.local.get('userTextJson'); //
            if (storageResult.userTextJson && typeof storageResult.userTextJson === 'string') { //
                textMessagesConfig = JSON.parse(storageResult.userTextJson); //
            } else { //
                const response = await fetch(chrome.runtime.getURL('config/text.json')); //
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`); //
                textMessagesConfig = await response.json(); //
            }
            if (!textMessagesConfig.Tramitar) textMessagesConfig.Tramitar = {}; //
        } catch (e) { //
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar text.json:`, e); //
            textMessagesConfig = { Tramitar: {} };  //
        }
    }
    
    async function carregarConfiguracoesTramitar() {
        try {
            const result = await chrome.storage.local.get([ //
                'userHolidays', //
                'neuronSharedTramitacaoInternaDias', //
                'neuronSharedTramitacaoInternaDiasUteis', //
                'neuronWeekendAdjustment', 
                'neuronHolidayAdjustment'
            ]);
            
            if (result.userHolidays && Array.isArray(result.userHolidays) && result.userHolidays.length > 0 && //
                typeof result.userHolidays[0] === 'object' && result.userHolidays[0].hasOwnProperty('date')) { //
                feriadosConfiguradosTramitar = result.userHolidays.map(holidayObj => { //
                    const [dia, mes, ano] = holidayObj.date.split('/'); //
                    return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime(); //
                });
            } else { //
                 console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): userHolidays não encontrado ou em formato incorreto. Carregando de config/prazos_feriados.json.`); //
                const response = await fetch(chrome.runtime.getURL('config/prazos_feriados.json')); //
                if (!response.ok) throw new Error(`Erro HTTP ao carregar prazos_feriados.json: ${response.status}`); //
                const defaultConfig = await response.json(); //
                if (defaultConfig.feriados && Array.isArray(defaultConfig.feriados)) { //
                    feriadosConfiguradosTramitar = defaultConfig.feriados.map(holidayObj => { //
                        const [dia, mes, ano] = holidayObj.date.split('/'); //
                        return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime(); //
                    });
                } else { //
                     throw new Error("Formato de feriados padrão incorreto em prazos_feriados.json"); //
                }
            }

            let dias = result.neuronSharedTramitacaoInternaDias; //
            sharedTramitacaoInternaDiasConfig = (dias !== undefined && !isNaN(parseInt(dias, 10))) ? parseInt(dias, 10) : DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS; //
            sharedTramitacaoInternaDiasUteisConfig = result.neuronSharedTramitacaoInternaDiasUteis !== undefined ? result.neuronSharedTramitacaoInternaDiasUteis : DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_UTEIS; //
            
            neuronWeekendRuleTramitar = result.neuronWeekendAdjustment || 'next';
            neuronHolidayRuleTramitar = result.neuronHolidayAdjustment || 'next';

        } catch (e) { //
            console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro ao carregar config de prazo/feriados:`, e); //
            sharedTramitacaoInternaDiasConfig = DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS; //
            sharedTramitacaoInternaDiasUteisConfig = DEFAULT_SHARED_TRAMITACAO_INTERNA_DIAS_UTEIS; //
            feriadosConfiguradosTramitar = [];
            neuronWeekendRuleTramitar = 'next';
            neuronHolidayRuleTramitar = 'next';
        }
    }

    // ehFeriadoTramitar is now encapsulated in calculateAdjustedDate's isHoliday helper
    // function ehFeriadoTramitar(data) { ... } // REMOVE

    function calcularPrazoParaMensagemTramitar() { //
        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO); //
        if (!spanPrazo || !spanPrazo.innerText.trim()) return ''; //

        const prazoStr = spanPrazo.innerText.trim(); //
        
        const dataCalculada = calculateAdjustedDate(
            prazoStr,
            sharedTramitacaoInternaDiasConfig,
            sharedTramitacaoInternaDiasUteisConfig,
            feriadosConfiguradosTramitar, // Use the loaded holidays for this script
            neuronWeekendRuleTramitar,    // Use the loaded weekend rule
            neuronHolidayRuleTramitar     // Use the loaded holiday rule
        );

        if (!dataCalculada) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao calcular data ajustada para ${prazoStr}`);
            return prazoStr; // Fallback to original string if calculation fails //
        }

        const dF = dataCalculada.getDate().toString().padStart(2, '0'); //
        const mF = (dataCalculada.getMonth() + 1).toString().padStart(2, '0'); //
        return `${dF}/${mF}/${dataCalculada.getFullYear()}`; //
    }

    function preencherCampoDataTratamentoConfiguravel() { //
        const campoData = document.getElementById(ID_CAMPO_DATA_TRATAMENTO); //
        if (campoData) { //
            campoData.value = calcularPrazoParaMensagemTramitar(); //
        }
    }

    function exibirNomesParaSecretaria(selectElementId = 'neuronSecretariasList', ulElementId = 'neuronNomesSecretaria') { //
        const select = document.getElementById(selectElementId); //
        const ul = document.getElementById(ulElementId); //
        if (!select || !ul) return; //

        ul.innerHTML = ''; //
        const sigla = select.value; //

        if (sigla && pontosFocaisConfig && pontosFocaisConfig[sigla]) { //
            pontosFocaisConfig[sigla].forEach(nome => { //
                const li = document.createElement('li'); //
                li.textContent = nome; //
                ul.appendChild(li); //
            });
        }
    }
    
    function configurarAutotramitarOriginal(selectSecretariasId = 'neuronSecretariasList') { //
        const sigla = document.getElementById(selectSecretariasId)?.value; //
        if (!sigla || !pontosFocaisConfig || !pontosFocaisConfig[sigla]) { //
            alert('Selecione uma secretaria válida com pontos focais definidos!'); //
            return; //
        }
        const nomesParaAdicionar = pontosFocaisConfig[sigla]; //

        const tabelaSelector = "#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades"; //
        const inputNomeSelector = 'selectize_0';  //
        const botaoAddSelector = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_btnIncluirUsuario'; //

        function getNomesNaTabela() { //
            const tabela = document.querySelector(tabelaSelector); //
            if (!tabela) return []; //
            const spans = tabela.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades_lblNomeItem']"); //
            return Array.from(spans).map(span => span.textContent.trim().replace(' (Unidade)', '')); //
        }

        let indexNomeAtual = 0; //
        function adicionarProximoNome() { //
            if (indexNomeAtual >= nomesParaAdicionar.length) { //
                alert('Todos os nomes configurados para a secretaria foram processados!'); //
                return; //
            }

            const nome = nomesParaAdicionar[indexNomeAtual]; //
            const nomesJaNaTabela = getNomesNaTabela(); //

            if (nomesJaNaTabela.includes(nome)) { //
                indexNomeAtual++; //
                setTimeout(adicionarProximoNome, 500);  //
                return; //
            }

            const inputNome = document.getElementById(inputNomeSelector); //
            const botaoAdd = document.getElementById(botaoAddSelector); //

            if (!inputNome || !botaoAdd) { //
                alert('Erro: Elementos da página para adicionar usuário (input ou botão) não encontrados.'); //
                return; //
            }

            inputNome.value = nome; //
            inputNome.dispatchEvent(new Event('input', { bubbles: true }));  //

            setTimeout(() => { //
                inputNome.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })); //
                setTimeout(() => {  //
                    botaoAdd.click(); //
                    indexNomeAtual++; //
                    setTimeout(adicionarProximoNome, 3000);  //
                }, 1000); //
            }, 500); //
        }
        adicionarProximoNome(); //
    }

    function criarPainelPontosFocaisInterno() { //
        if (painelPontosFocaisElement) painelPontosFocaisElement.remove(); //

        const painel = document.createElement('div'); //
        painel.id = 'neuronPainelPontosFocais'; //
        painel.className = 'panel panel-default'; //
        painel.style.marginBottom = '20px'; //

        const options = ['<option value="">Escolha uma Secretaria...</option>']; //
        if (pontosFocaisConfig) { //
            for (const [sigla, descArray] of Object.entries(pontosFocaisConfig)) { //
                const displayText = (Array.isArray(descArray) && descArray.length > 0) ? descArray[0] : sigla; //
                options.push(`<option value="${sigla}">${displayText}</option>`); //
            }
        }

        painel.innerHTML = `
            <div class="panel-heading"><h4 class="panel-title">Neuron - Pontos Focais</h4></div>
            <div class="panel-body">
                <label for="neuronSecretariasList">Selecione a Secretaria:</label>
                <select id="neuronSecretariasList" class="form-control" style="margin-bottom: 10px;">${options.join('\n')}</select>
                <div class="nomes-relacionados" style="margin-bottom: 10px;">
                    <label>Nome(s) relacionado(s):</label>
                    <ul id="neuronNomesSecretaria" style="list-style-type: disclosure-closed; max-height: 150px; overflow-y: auto; border: 1px solid #eee; padding: 5px 25px;"></ul>
                </div>
                <button id="neuronBtnAutotramitar" class="btn btn-info btn-sm">Auto-Tramitar Pontos Focais</button>
            </div>`; //
        painelPontosFocaisElement = painel; //
        const container = document.querySelector(CONTAINER_PAINEL_SELECTOR); //
        if (container) { //
            container.prepend(painelPontosFocaisElement); //
            const selectSecretarias = document.getElementById('neuronSecretariasList'); //
            const btnAutotramitar = document.getElementById('neuronBtnAutotramitar'); //
            if (selectSecretarias) { //
                selectSecretarias.addEventListener('change', () => exibirNomesParaSecretaria()); //
                const salvo = localStorage.getItem('neuronSecretariaSelecionadaTramitar'); //
                if (salvo) { selectSecretarias.value = salvo; exibirNomesParaSecretaria(); } //
                selectSecretarias.addEventListener('change', () => localStorage.setItem('neuronSecretariaSelecionadaTramitar', selectSecretarias.value)); //
            }
            if (btnAutotramitar) btnAutotramitar.addEventListener('click', () => configurarAutotramitarOriginal()); //
        } else { painelPontosFocaisElement = null; } //
    }

    function criarSelectMensagensInterno() { //
        if (selectMensagensElement) selectMensagensElement.remove(); //
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM); //
        const tagsField = document.getElementById(ID_CAMPO_TAGS_INFO); //
        if (!mensagemField || !textMessagesConfig.Tramitar) return; //

        const select = document.createElement('select'); //
        select.id = 'neuronSelectMensagensTramitar'; //
        select.className = 'form-control'; //
        select.style.marginBottom = '10px'; //
        const defaultOption = document.createElement('option'); //
        defaultOption.text = 'Neuron: Selecione um modelo de mensagem...'; //
        defaultOption.value = ''; //
        select.appendChild(defaultOption); //
        defaultOption.disabled = true; defaultOption.selected = true; //

        const tramitarMensagens = textMessagesConfig.Tramitar; //
        for (const chave in tramitarMensagens) { //
            if (typeof tramitarMensagens[chave] === 'string') { //
                const option = document.createElement('option'); //
                option.value = chave; option.text = chave; //
                select.appendChild(option); //
            }
        }
        select.addEventListener('change', function () { //
            const dataLimiteCalculada = calcularPrazoParaMensagemTramitar();  //
            const secretariaTag = tagsField ? tagsField.value : '{SECRETARIA_NAO_ENCONTRADA}'; //
            let template = textMessagesConfig.Tramitar[this.value] || ''; //
            template = template.replace('{SECRETARIA}', secretariaTag); //
            template = template.replace('{PRAZO}', dataLimiteCalculada);  //
            mensagemField.value = template; //
        });
        selectMensagensElement = select; //
        mensagemField.parentNode.insertBefore(selectMensagensElement, mensagemField); //
    }

    function criarOuAtualizarUI() { //
        if (!currentMasterEnabled || !currentScriptEnabled) { //
            removerElementosCriados(); return; //
        }
        preencherCampoDataTratamentoConfiguravel();  //
        criarPainelPontosFocaisInterno(); //
        criarSelectMensagensInterno(); //
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM); //
        if (mensagemField) { //
            mensagemField.style.width = '100%';  //
            mensagemField.style.minHeight = '500px';  //
        }
    }

    function removerElementosCriados() { //
        if (painelPontosFocaisElement) painelPontosFocaisElement.remove(); //
        painelPontosFocaisElement = null; //
        if (selectMensagensElement) selectMensagensElement.remove(); //
        selectMensagensElement = null; //
    }

    async function verificarEstadoAtualEAgir() { //
        const settings = await chrome.storage.local.get([ //
            'masterEnableNeuron', SCRIPT_ID_STORAGE_KEY, //
            'userPontosFocaisJson', 'userTextJson' //
        ]);
        currentMasterEnabled = settings.masterEnableNeuron !== false; //
        currentScriptEnabled = settings[SCRIPT_ID_STORAGE_KEY] !== false; //

        await carregarPontosFocaisConfig(); //
        await carregarTextMessagesConfig(); //
        await carregarConfiguracoesTramitar(); 
        
        await new Promise(resolve => { //
            const check = () => (document.getElementById(ID_CAMPO_MENSAGEM) && document.querySelector(CONTAINER_PAINEL_SELECTOR) && document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO)) ? resolve() : setTimeout(check, 300); //
            check(); //
        });
        
        if (currentMasterEnabled && currentScriptEnabled) criarOuAtualizarUI(); //
        else removerElementosCriados(); //
    }

    chrome.storage.onChanged.addListener((changes, namespace) => { //
        if (namespace === 'local') { //
            if (changes.masterEnableNeuron || changes[SCRIPT_ID_STORAGE_KEY] ||  //
                changes.userPontosFocaisJson || changes.userTextJson || changes.userHolidays || //
                changes.neuronSharedTramitacaoInternaDias || changes.neuronSharedTramitacaoInternaDiasUteis || //
                changes.neuronWeekendAdjustment || changes.neuronHolidayAdjustment
            ) {
                verificarEstadoAtualEAgir(); //
            }
        }
    });
    
    async function init() { //
        await new Promise(resolve => (document.readyState === 'complete' || document.readyState === 'interactive') ? resolve() : window.addEventListener('load', resolve, { once: true })); //
        await verificarEstadoAtualEAgir(); //
    }

    if (window.location.href.includes('/Manifestacao/TramitarManifestacao.aspx')) init(); //
})();