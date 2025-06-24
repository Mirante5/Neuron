// Neuron/modules/resposta/resposta.js

(function() {
    'use strict';

    let currentMapeamentoRespostas = {}; // Variável para armazenar as configurações (customizadas ou padrão)
    let novoDropdownElement = null; // Para armazenar a referência ao novo dropdown

    // Função para buscar as configurações (primeiro do storage.sync, depois do config.json)
    async function loadMapeamentoRespostas() {
        return new Promise((resolve) => {
            // Tenta carregar as configurações personalizadas das respostas automáticas
            chrome.storage.sync.get('customResponses', async (data) => {
                if (data.customResponses) {
                    currentMapeamentoRespostas = data.customResponses;
                    console.log('Mapeamento de respostas carregado do storage.sync (customizado):', currentMapeamentoRespostas);
                    resolve();
                } else {
                    // Se não há customizadas, carrega do config.json
                    try {
                        const response = await fetch(chrome.runtime.getURL('config/config.json'));
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const config = await response.json();
                        currentMapeamentoRespostas = config.defaultResponses; // Pega a parte defaultResponses do config.json
                        console.log('Mapeamento de respostas carregado do config.json (padrão):', currentMapeamentoRespostas);
                        resolve();
                    } catch (e) {
                        console.error('Erro ao carregar mapeamento de respostas do config.json:', e);
                        // Define um mapeamento vazio para evitar erros se a carga falhar
                        currentMapeamentoRespostas = {};
                        resolve();
                    }
                }
            });
        });
    }

    // Função para renderizar/atualizar as opções do novo dropdown e controlar o textarea
    function renderizarNovoDropdown(tipoRespostaSelecionado) {
        const novoDropdownList = document.getElementById('novoDropdown-list');
        const novoDropdownInput = document.getElementById('novoDropdown-select');
        const txtRespostaTextarea = document.getElementById('txtResposta-textarea');
        const responsavelRespostaInput = document.getElementById('responsavelResposta-input');

        if (!novoDropdownList || !novoDropdownInput || !txtRespostaTextarea || !responsavelRespostaInput) {
            console.warn('Elementos do dropdown, textarea ou responsável não encontrados para renderização.');
            return;
        }

        // Limpa as opções existentes
        novoDropdownList.innerHTML = '';
        novoDropdownInput.value = ''; // Limpa o valor do input do novo dropdown
        txtRespostaTextarea.value = ''; // Limpa o textarea
        responsavelRespostaInput.value = ''; // Limpa o responsável (estado inicial ou quando slTipoResposta muda)

        const data = currentMapeamentoRespostas[tipoRespostaSelecionado];

        if (data && data.novoDropdownOptions && data.novoDropdownOptions.length > 0) {
            // Habilita o novo dropdown
            novoDropdownInput.removeAttribute('disabled');
            
            data.novoDropdownOptions.forEach((opcao, index) => {
                const item = document.createElement('div');
                item.classList.add('br-item'); // Começa sem 'selected'
                item.setAttribute('tabindex', '-1');
                item.innerHTML = `
                    <div class="br-radio">
                        <input id="novoDropdown-list-item-input-${index}" type="radio" value="${opcao.value || `opcao_${index}`}">
                        <label for="novoDropdown-list-item-input-${index}">${opcao.text || `Opção ${index + 1}`}</label>
                    </div>
                `;
                novoDropdownList.appendChild(item);

                // Adicionar evento de clique para simular a seleção e mudar a classe
                item.addEventListener('click', () => {
                    // Remove 'selected' de todos os itens antes de adicionar ao clicado
                    Array.from(novoDropdownList.children).forEach(child => {
                        child.classList.remove('selected');
                        const radio = child.querySelector('input[type="radio"]');
                        if (radio) radio.checked = false;
                    });

                    item.classList.add('selected'); // Adiciona 'selected' ao item clicado
                    const radio = item.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;

                    novoDropdownInput.value = opcao.text || ''; // Atualiza o input do novo dropdown
                    txtRespostaTextarea.value = opcao.conteudoTextarea || ''; // Preenche o textarea

                    if (opcao.responsavel) {
                        responsavelRespostaInput.value = opcao.responsavel;
                    } else {
                        responsavelRespostaInput.value = '';
                    }

                    novoDropdownList.style.display = 'none'; // Oculta a lista
                });
            });
        } else {
            // Se nenhuma opção válida de slTipoResposta for selecionada, desabilita e limpa tudo
            novoDropdownInput.setAttribute('disabled', 'disabled');
            txtRespostaTextarea.value = '';
            responsavelRespostaInput.value = '';
        }
    }

    // Função principal para adicionar o dropdown e configurar listeners
    async function configurarDropdowns() { // Tornada async para aguardar loadMapeamentoRespostas
        await loadMapeamentoRespostas(); // Garante que as configurações foram carregadas

        // Encontrar o elemento existente (slTipoResposta)
        const tipoRespostaSelectContainer = document.getElementById('slTipoResposta');
        const tipoRespostaSelectInput = tipoRespostaSelectContainer ? tipoRespostaSelectContainer.querySelector('input[type="text"]') : null;
        const slTipoRespostaList = document.getElementById('slTipoResposta-list');
        const responsavelRespostaInput = document.getElementById('responsavelResposta-input');

        if (!tipoRespostaSelectInput || !responsavelRespostaInput) {
            console.warn('Elemento #slTipoResposta, seu input interno ou #responsavelResposta-input não encontrado. Não foi possível configurar os dropdowns.');
            return;
        }

        // Se o novo dropdown ainda não foi criado, cria
        if (!novoDropdownElement) {
            const novoDropdownContainer = document.createElement('div');
            novoDropdownContainer.classList.add('br-select', 'mb-3');
            novoDropdownContainer.id = 'novoDropdown';

            novoDropdownContainer.innerHTML = `
                <div class="br-input">
                    <label for="novoDropdown-select">Opções Adicionais</label>
                    <div class="input-group">
                        <div class="input-icon">
                            <i class="fas fa-search" aria-hidden="true"></i>
                        </div>
                        <input id="novoDropdown-select" name="novoDropdown" type="text" placeholder="Selecione..." autocomplete="off" disabled>
                    </div>
                    <button id="novoDropdown-clear-button" class="br-button mr-6" type="button" aria-label="Limpar valor">
                        <i class="fas fa-close" aria-hidden="true"></i>
                    </button>
                    <button id="novoDropdown-select-button" class="br-button" type="button" aria-label="Exibir lista" tabindex="-1" data-trigger="data-trigger">
                        <i class="fas fa-angle-down" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="br-list" tabindex="0" id="novoDropdown-list">
                    </div>
            `;
            tipoRespostaSelectContainer.parentNode.insertBefore(novoDropdownContainer, tipoRespostaSelectContainer);
            novoDropdownElement = novoDropdownContainer; // Armazena a referência
        }

        // Garante que o input do novo dropdown comece desabilitado ao carregar
        const novoDropdownInput = document.getElementById('novoDropdown-select');
        if (novoDropdownInput) {
            novoDropdownInput.setAttribute('disabled', 'disabled');
        }

        // Configura o listener para o dropdown 'slTipoResposta'
        if (slTipoRespostaList) {
            slTipoRespostaList.addEventListener('click', (event) => {
                const clickedItem = event.target.closest('.br-item');
                if (clickedItem) {
                    const selectedLabel = clickedItem.querySelector('label');
                    if (selectedLabel) {
                        const selectedText = selectedLabel.textContent.trim();
                        renderizarNovoDropdown(selectedText);

                        const novoDropdownButton = document.getElementById('novoDropdown-select-button');
                        if (novoDropdownButton) {
                            novoDropdownButton.removeAttribute('disabled');
                        }
                    }
                }
            });
        }

        // Funcionalidade de abrir/fechar o novo dropdown
        const novoDropdownButton = document.getElementById('novoDropdown-select-button');
        const novoDropdownList = document.getElementById('novoDropdown-list');
        const novoDropdownClearButton = document.getElementById('novoDropdown-clear-button');

        if (novoDropdownButton && novoDropdownInput && novoDropdownList && novoDropdownClearButton) {
            novoDropdownInput.addEventListener('focus', () => {
                if (!novoDropdownInput.hasAttribute('disabled')) {
                    novoDropdownList.style.display = 'block';
                }
            });

            novoDropdownButton.addEventListener('click', () => {
                if (!novoDropdownInput.hasAttribute('disabled')) {
                    const isHidden = novoDropdownList.style.display === 'none' || novoDropdownList.style.display === '';
                    novoDropdownList.style.display = isHidden ? 'block' : 'none';
                    if (isHidden) {
                        novoDropdownList.focus();
                    }
                }
            });

            novoDropdownClearButton.addEventListener('click', () => {
                if (!novoDropdownInput.hasAttribute('disabled')) {
                    novoDropdownInput.value = '';
                    Array.from(novoDropdownList.children).forEach(child => {
                        child.classList.remove('selected');
                        const radio = child.querySelector('input[type="radio"]');
                        if (radio) radio.checked = false;
                    });
                    document.getElementById('txtResposta-textarea').value = '';
                    responsavelRespostaInput.value = '';
                }
            });

            document.addEventListener('click', (event) => {
                if (novoDropdownElement && !novoDropdownElement.contains(event.target)) {
                    novoDropdownList.style.display = 'none';
                }
            });
        }

        // Inicializa o novo dropdown com base no valor atual do slTipoResposta (se houver)
        renderizarNovoDropdown(tipoRespostaSelectInput.value);
    }

    // Executar a função quando o DOM estiver completamente carregado
    document.addEventListener('DOMContentLoaded', configurarDropdowns);

    // Observador de mutação para garantir que o script funcione em SPAs como o Vue.js
    const observer = new MutationObserver((mutationsList, observer) => {
        const tipoRespostaInput = document.getElementById('slTipoResposta')?.querySelector('input[type="text"]');
        const txtRespostaTextarea = document.getElementById('txtResposta-textarea');
        const responsavelRespostaInput = document.getElementById('responsavelResposta-input');

        if (tipoRespostaInput && txtRespostaTextarea && responsavelRespostaInput && !novoDropdownElement) {
            configurarDropdowns(); // Chama a função que já lida com o carregamento das configs
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Listener para mudanças no storage: se as opções forem salvas na página de options,
    // o content script pode reagir e atualizar os dropdowns sem recarregar a página.
    chrome.storage.sync.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.customResponses) {
            console.log('Detectada mudança nas configurações de customResponses. Recarregando dropdowns.');
            currentMapeamentoRespostas = changes.customResponses.newValue;
            // Força uma re-renderização baseada na seleção atual de slTipoResposta
            const tipoRespostaSelectInput = document.getElementById('slTipoResposta')?.querySelector('input[type="text"]');
            if (tipoRespostaSelectInput) {
                renderizarNovoDropdown(tipoRespostaSelectInput.value);
            }
        }
    });


})();