// Neuron 0.3.1/scripts/tramitar.js - CENTRALIZED CONFIG
(async function () {
    'use strict';

    const SCRIPT_NOME_PARA_LOG = 'tramitar';
    const SCRIPT_ID = 'tramitar';
    const CONFIG_STORAGE_KEY_TRAMITAR = 'neuronUserConfig';
    const DEFAULT_CONFIG_PATH_TRAMITAR = 'config/config.json';

    const ID_CAMPO_DATA_TRATAMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtDataTratamento';
    const ID_CAMPO_MENSAGEM = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtMensagem';
    const ID_CAMPO_TAGS_INFO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags';
    const ID_SPAN_PRAZO_ATENDIMENTO = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtPrazoAtendimento';
    const CONTAINER_PAINEL_SELECTOR = '.col-md-6.col-md-push-6.hidden-print';

    let currentMasterEnabled = false;
    let currentScriptEnabled = false;
    let focalPointsTramitar = {};
    let textModelsTramitar = {};
    let holidaysTramitar = [];
    let weekendRuleTramitar = 'next';
    let holidayRuleTramitar = 'next';
    let tramitacaoInternaDiasConfig = -10;
    let tramitacaoInternaDiasUteisConfig = false;

    let painelPontosFocaisElement = null;
    let selectMensagensElement = null;

    async function carregarConfiguracoesTramitar() {
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY_TRAMITAR);
        let fullConfig = {};

        if (result[CONFIG_STORAGE_KEY_TRAMITAR] && typeof result[CONFIG_STORAGE_KEY_TRAMITAR] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY_TRAMITAR];
        } else {
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH_TRAMITAR));
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH_TRAMITAR}:`, e);
                fullConfig = { 
                    masterEnableNeuron: false, 
                    featureSettings: {}, 
                    focalPoints: {}, 
                    textModels: { Tramitar: {} },
                    holidays: [],
                    prazosSettings: {
                        configTramitacaoInternaDias: -10,
                        configTramitacaoInternaDiasUteis: false,
                        weekendAdjustmentRule: "next",
                        holidayAdjustmentRule: "next"
                    }
                };
            }
        }
        
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentScriptEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        
        focalPointsTramitar = fullConfig.focalPoints || {};
        textModelsTramitar = fullConfig.textModels?.Tramitar || {};
        
        const holidaysFromConfig = fullConfig.holidays || [];
        holidaysTramitar = holidaysFromConfig.map(h => {
            const [dia, mes, ano] = h.date.split('/');
            return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).getTime();
        });

        const prazosSettings = fullConfig.prazosSettings || {};
        tramitacaoInternaDiasConfig = prazosSettings.configTramitacaoInternaDias !== undefined ? parseInt(prazosSettings.configTramitacaoInternaDias, 10) : -10;
        tramitacaoInternaDiasUteisConfig = prazosSettings.configTramitacaoInternaDiasUteis !== undefined ? prazosSettings.configTramitacaoInternaDiasUteis : false;
        weekendRuleTramitar = prazosSettings.weekendAdjustmentRule || 'next';
        holidayRuleTramitar = prazosSettings.holidayAdjustmentRule || 'next';

        if (Object.keys(textModelsTramitar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Seção 'Tramitar' não encontrada ou vazia nos modelos de texto.`);
        }
         if (Object.keys(focalPointsTramitar).length === 0) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Configuração de Pontos Focais não encontrada ou vazia.`);
        }
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

    function calcularPrazoParaMensagemTramitar() {
        const spanPrazo = document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO);
        if (!spanPrazo || !spanPrazo.innerText.trim()) return '';

        const prazoStr = spanPrazo.innerText.trim();
        const dataCalculada = calculateAdjustedDate(
            prazoStr,
            tramitacaoInternaDiasConfig,
            tramitacaoInternaDiasUteisConfig,
            holidaysTramitar,
            weekendRuleTramitar,
            holidayRuleTramitar
        );

        if (!dataCalculada) {
            console.warn(`Neuron (${SCRIPT_NOME_PARA_LOG}): Falha ao calcular data ajustada para ${prazoStr}`);
            return prazoStr;
        }
        const dF = dataCalculada.getDate().toString().padStart(2, '0');
        const mF = (dataCalculada.getMonth() + 1).toString().padStart(2, '0');
        return `${dF}/${mF}/${dataCalculada.getFullYear()}`;
    }

    function preencherCampoDataTratamentoConfiguravel() {
        const campoData = document.getElementById(ID_CAMPO_DATA_TRATAMENTO);
        if (campoData) {
            campoData.value = calcularPrazoParaMensagemTramitar();
        }
    }

    function exibirNomesParaSecretaria(selectElementId = 'neuronSecretariasList', ulElementId = 'neuronNomesSecretaria') {
        const select = document.getElementById(selectElementId);
        const ul = document.getElementById(ulElementId);
        if (!select || !ul) return;
        ul.innerHTML = '';
        const sigla = select.value;
        if (sigla && focalPointsTramitar && focalPointsTramitar[sigla]) {
            focalPointsTramitar[sigla].forEach(nome => {
                const li = document.createElement('li');
                li.textContent = nome;
                ul.appendChild(li);
            });
        }
    }
    
    function configurarAutotramitarOriginal(selectSecretariasId = 'neuronSecretariasList') {
        const sigla = document.getElementById(selectSecretariasId)?.value;
        if (!sigla || !focalPointsTramitar || !focalPointsTramitar[sigla] || focalPointsTramitar[sigla].length === 0) {
            alert('Selecione uma secretaria válida com pontos focais definidos ou verifique a configuração de Pontos Focais!');
            return;
        }
        const nomesParaAdicionar = focalPointsTramitar[sigla];
        const tabelaSelector = "#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades";
        const inputNomeSelector = 'selectize_0'; 
        const botaoAddSelector = 'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_btnIncluirUsuario';

        function getNomesNaTabela() {
            const tabela = document.querySelector(tabelaSelector);
            if (!tabela) return [];
            const spans = tabela.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades_lblNomeItem']");
            return Array.from(spans).map(span => span.textContent.trim().replace(' (Unidade)', ''));
        }

        let indexNomeAtual = 0;
        function adicionarProximoNome() {
            if (indexNomeAtual >= nomesParaAdicionar.length) {
                alert('Todos os nomes configurados para a secretaria foram processados!');
                return;
            }
            const nome = nomesParaAdicionar[indexNomeAtual];
            const nomesJaNaTabela = getNomesNaTabela();

            if (nomesJaNaTabela.includes(nome)) {
                console.log(`Neuron (${SCRIPT_NOME_PARA_LOG}): ${nome} já está na tabela. Pulando.`);
                indexNomeAtual++;
                setTimeout(adicionarProximoNome, 500); 
                return;
            }

            const inputNome = document.getElementById(inputNomeSelector);
            const botaoAdd = document.getElementById(botaoAddSelector);
            if (!inputNome || !botaoAdd) {
                alert('Erro: Elementos da página para adicionar usuário (input ou botão) não encontrados.');
                return;
            }
            inputNome.value = nome;
            inputNome.dispatchEvent(new Event('input', { bubbles: true })); 
            setTimeout(() => {
                inputNome.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
                setTimeout(() => { 
                    botaoAdd.click();
                    indexNomeAtual++;
                    setTimeout(adicionarProximoNome, 3000); 
                }, 1000);
            }, 500);
        }
        adicionarProximoNome();
    }

    function criarPainelPontosFocaisInterno() {
        if (painelPontosFocaisElement) painelPontosFocaisElement.remove();
        const painel = document.createElement('div');
        painel.id = 'neuronPainelPontosFocais';
        painel.className = 'panel panel-default';
        painel.style.marginBottom = '20px';

        const options = ['<option value="">Escolha uma Secretaria...</option>'];
        if (focalPointsTramitar) {
            const sortedSiglas = Object.keys(focalPointsTramitar).sort((a,b) => a.localeCompare(b));
            for (const sigla of sortedSiglas) {
                 // Usa a primeira descrição como display text, ou a própria sigla.
                const displayText = (Array.isArray(focalPointsTramitar[sigla]) && focalPointsTramitar[sigla].length > 0 && typeof focalPointsTramitar[sigla][0] === 'string') 
                                  ? focalPointsTramitar[sigla][0].split(" - ")[0] // Pega a parte antes do " - " se houver
                                  : sigla;
                options.push(`<option value="${sigla}">${displayText}</option>`);
            }
        }

        painel.innerHTML = `
            <div class="panel-heading"><h4 class="panel-title">Neuron - Pontos Focais</h4></div>
            <div class="panel-body">
                <label for="neuronSecretariasList">Selecione a Secretaria:</label>
                <select id="neuronSecretariasList" class="form-control" style="margin-bottom: 10px;">${options.join('\n')}</select>
                <div class="nomes-relacionados" style="margin-bottom: 10px;">
                    <label>Nome(s) relacionado(s) para adicionar:</label>
                    <ul id="neuronNomesSecretaria" style="list-style-type: disclosure-closed; max-height: 150px; overflow-y: auto; border: 1px solid #eee; padding: 5px 25px; background-color: #f9f9f9;"></ul>
                </div>
                <button id="neuronBtnAutotramitar" class="btn btn-info btn-sm" disabled>Auto-Tramitar Pontos Focais</button>
            </div>`;
        painelPontosFocaisElement = painel;
        const container = document.querySelector(CONTAINER_PAINEL_SELECTOR);
        if (container) {
            container.prepend(painelPontosFocaisElement);
            const selectSecretarias = document.getElementById('neuronSecretariasList');
            const btnAutotramitar = document.getElementById('neuronBtnAutotramitar');
            if (selectSecretarias) {
                selectSecretarias.addEventListener('change', () => exibirNomesParaSecretaria());
                const salvo = localStorage.getItem('neuronSecretariaSelecionadaTramitar');
                if (salvo && selectSecretarias.querySelector(`option[value="${salvo}"]`)) { // Verifica se a opção ainda existe
                   selectSecretarias.value = salvo; 
                   exibirNomesParaSecretaria(); 
                } else if (salvo) {
                    localStorage.removeItem('neuronSecretariaSelecionadaTramitar'); // Limpa se a opção não existe mais
                }
                selectSecretarias.addEventListener('change', () => localStorage.setItem('neuronSecretariaSelecionadaTramitar', selectSecretarias.value));
            }
            if (btnAutotramitar) btnAutotramitar.addEventListener('click', () => configurarAutotramitarOriginal());
        } else { painelPontosFocaisElement = null; }
    }

    function criarSelectMensagensInterno() {
        if (selectMensagensElement) selectMensagensElement.remove();
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        const tagsField = document.getElementById(ID_CAMPO_TAGS_INFO);
        if (!mensagemField || !textModelsTramitar || Object.keys(textModelsTramitar).length === 0) return;

        const select = document.createElement('select');
        select.id = 'neuronSelectMensagensTramitar';
        select.className = 'form-control';
        select.style.marginBottom = '10px';
        const defaultOption = document.createElement('option');
        defaultOption.text = 'Neuron: Selecione um modelo de mensagem...';
        defaultOption.value = '';
        select.appendChild(defaultOption);
        defaultOption.disabled = true; defaultOption.selected = true;

        const sortedMessageKeys = Object.keys(textModelsTramitar).sort((a,b) => a.localeCompare(b));
        for (const chave of sortedMessageKeys) {
            if (typeof textModelsTramitar[chave] === 'string') {
                const option = document.createElement('option');
                option.value = chave; option.text = chave;
                select.appendChild(option);
            }
        }
        select.addEventListener('change', function () {
            const dataLimiteCalculada = calcularPrazoParaMensagemTramitar(); 
            const secretariaTag = tagsField ? tagsField.value : '{SECRETARIA_NAO_ENCONTRADA}';
            let template = textModelsTramitar[this.value] || '';
            template = template.replace(/\{SECRETARIA\}/g, secretariaTag); // Regex global
            template = template.replace(/\{PRAZO\}/g, dataLimiteCalculada); // Regex global
            mensagemField.value = template;
        });
        selectMensagensElement = select;
        mensagemField.parentNode.insertBefore(selectMensagensElement, mensagemField);
    }

    function criarOuAtualizarUI() {
        if (!currentMasterEnabled || !currentScriptEnabled) {
            removerElementosCriados(); return;
        }
        preencherCampoDataTratamentoConfiguravel(); 
        criarPainelPontosFocaisInterno();
        criarSelectMensagensInterno();
        const mensagemField = document.getElementById(ID_CAMPO_MENSAGEM);
        if (mensagemField) {
            mensagemField.style.width = '100%'; 
            mensagemField.style.minHeight = '500px'; 
        }
    }

    function removerElementosCriados() {
        if (painelPontosFocaisElement) painelPontosFocaisElement.remove();
        painelPontosFocaisElement = null;
        if (selectMensagensElement) selectMensagensElement.remove();
        selectMensagensElement = null;
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoesTramitar();
        
        await new Promise(resolve => {
            const check = () => (document.getElementById(ID_CAMPO_MENSAGEM) && document.querySelector(CONTAINER_PAINEL_SELECTOR) && document.getElementById(ID_SPAN_PRAZO_ATENDIMENTO)) ? resolve() : setTimeout(check, 300);
            check();
        });
        
        if (currentMasterEnabled && currentScriptEnabled) criarOuAtualizarUI();
        else removerElementosCriados();
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_STORAGE_KEY_TRAMITAR]) {
            verificarEstadoAtualEAgir();
        }
    });
    
    async function init() {
        await new Promise(resolve => (document.readyState === 'complete' || document.readyState === 'interactive') ? resolve() : window.addEventListener('load', resolve, { once: true }));
        await verificarEstadoAtualEAgir();
    }

    if (window.location.href.includes('/Manifestacao/TramitarManifestacao.aspx')) init();
})();