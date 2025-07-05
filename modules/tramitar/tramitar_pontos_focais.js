(async function () {
    'use strict';

    const SCRIPT_ID = 'tramitar_pontos_focais';
    const CONFIG_KEY = 'neuronUserConfig';
    const CONTAINER_PAINEL_SELECTOR = '.col-md-6.col-md-push-6.hidden-print';

    let config = {};

    async function carregarConfiguracoes() {
        const result = await chrome.storage.local.get(CONFIG_KEY);
        config = result[CONFIG_KEY] || {};
        console.log(`%cNeuron (${SCRIPT_ID}): Configurações de pontos focais carregadas.`, "color: blue; font-weight: bold;");
    }

    function isScriptAtivo() {
        if (!config || typeof config !== 'object') return false;
        return config.masterEnableNeuron !== false && config.featureSettings?.['tramitar']?.enabled !== false;
    }

    function exibirNomesParaSecretaria(selectElement, ulElement) {
        if (!selectElement || !ulElement) return;
        
        ulElement.innerHTML = '';
        const sigla = selectElement.value;
        const pontosFocais = config.focalPoints || {};
        
        if (sigla && pontosFocais[sigla]) {
            const nomes = pontosFocais[sigla];
            nomes.forEach(nome => {
                const li = document.createElement('li');
                li.textContent = nome;
                ulElement.appendChild(li);
            });
        }
    }
    
    function configurarAutotramitar() {
        const selectSecretarias = document.getElementById('neuronSecretariasList');
        if (!selectSecretarias) return;

        const sigla = selectSecretarias.value;
        const pontosFocais = config.focalPoints || {};
        
        if (!sigla || !pontosFocais[sigla] || pontosFocais[sigla].length === 0) {
            alert('Selecione uma secretaria com pontos focais definidos.');
            return;
        }

        const nomesParaAdicionar = pontosFocais[sigla];
        const tabela = document.querySelector("#ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades");
        const inputNome = document.getElementById('selectize_0');
        const botaoAdd = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_btnIncluirUsuario');

        if (!tabela || !inputNome || !botaoAdd) {
            alert('Erro: Elementos da página para adicionar usuário não encontrados.');
            return;
        }

        let nomesJaNaTabela = Array.from(tabela.querySelectorAll("span[id^='ConteudoForm_ConteudoGeral_ConteudoFormComAjax_grdUsuariosUnidades_lblNomeItem']"))
                                   .map(span => span.textContent.trim().replace(' (Unidade)', ''));

        let nomesAAdicionar = nomesParaAdicionar.filter(nome => !nomesJaNaTabela.includes(nome));

        if (nomesAAdicionar.length === 0) {
            alert('Todos os pontos focais para esta secretaria já foram adicionados.');
            return;
        }

        function adicionarProximoNome(index) {
            if (index >= nomesAAdicionar.length) {
                alert('Tramitação de pontos focais concluída!');
                return;
            }
            const nome = nomesAAdicionar[index];
            inputNome.value = nome;
            inputNome.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                inputNome.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                setTimeout(() => { 
                    botaoAdd.click();
                    setTimeout(() => adicionarProximoNome(index + 1), 3000); 
                }, 1000);
            }, 500);
        }
        adicionarProximoNome(0);
    }
    
    function criarOuAtualizarUI() {
        const container = document.querySelector(CONTAINER_PAINEL_SELECTOR);
        if (!container) return;

        removerElementosCriados();

        const painelWrapperDiv = document.createElement('div');
        painelWrapperDiv.id = 'neuronPainelPontosFocais';
        painelWrapperDiv.className = 'panel panel-default';
        
        painelWrapperDiv.innerHTML = `
            <div class="panel-heading">Neuron - Pontos Focais</div>
            <div class="panel-body">
                <div class="form-group">
                    <label for="neuronSecretariasList">Selecione a Secretaria:</label>
                    <select id="neuronSecretariasList" class="form-control">
                        <option value="">Escolha uma Secretaria...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Pontos Focais a serem adicionados:</label>
                    <ul id="neuronNomesSecretaria" class="list-group"></ul>
                </div>
                <button id="neuronBtnAutotramitar" class="btn btn-primary btn-block">Auto-Tramitar Pontos Focais</button>
            </div>
        `;
        
        const selectElement = painelWrapperDiv.querySelector('#neuronSecretariasList');
        const ulElement = painelWrapperDiv.querySelector('#neuronNomesSecretaria');
        const btnAutotramitar = painelWrapperDiv.querySelector('#neuronBtnAutotramitar');
        
        const pontosFocais = config.focalPoints || {};
        const sortedSiglas = Object.keys(pontosFocais).sort();

        for (const sigla of sortedSiglas) {
            const option = document.createElement('option');
            option.value = sigla;
            option.textContent = sigla; 
            selectElement.appendChild(option);
        }
        
        selectElement.addEventListener('change', () => {
            exibirNomesParaSecretaria(selectElement, ulElement);
            localStorage.setItem('neuronSecretariaSelecionadaTramitar', selectElement.value);
            btnAutotramitar.disabled = !selectElement.value;
        });

        const salvo = localStorage.getItem('neuronSecretariaSelecionadaTramitar');
        if (salvo && selectElement.querySelector(`option[value="${salvo}"]`)) {
           selectElement.value = salvo; 
           exibirNomesParaSecretaria(selectElement, ulElement);
        }
        btnAutotramitar.disabled = !selectElement.value;
        
        btnAutotramitar.addEventListener('click', configurarAutotramitar);
        container.prepend(painelWrapperDiv);
    }

    function removerElementosCriados() {
        document.getElementById('neuronPainelPontosFocais')?.remove();
    }

    async function verificarEstadoAtualEAgir() {
        await carregarConfiguracoes();

        if (isScriptAtivo()) {
            criarOuAtualizarUI();
        } else {
            removerElementosCriados();
        }
    }
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            console.log(`%cNeuron (${SCRIPT_ID}): Configuração alterada. Reavaliando...`, "color: orange; font-weight: bold;");
            verificarEstadoAtualEAgir();
        }
    });

    async function init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        await verificarEstadoAtualEAgir();
    }

    init();

})();