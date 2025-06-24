// /modules/notificacoes/notificacoes.js (Adaptado para novas configs)
(async function () {
    'use strict';
    // Se o módulo já foi carregado, sai.
    if (window.NEURON_MODULES && window.NEURON_MODULES.notificacoes) return;

    // --- Constantes ---
    const SCRIPT_NOME_PARA_LOG = 'notificacoes';
    const SCRIPT_ID = 'notificacoes';
    const CONFIG_STORAGE_KEY = 'neuronUserConfig'; // Chave da configuração principal (local storage)
    const DEFAULT_CONFIG_PATH = 'config/config.json'; // Caminho para o config.json padrão
    const STORAGE_KEY_AVISOS = 'neuronNotificacoesVencimento'; // Chave para avisos salvos
    const ICON_ID = 'neuron-notificacao-icon';
    const PANEL_ID = 'neuron-notificacao-panel';
    const COUNT_ID = 'neuron-notificacao-count';
    const CHAT_AREA_ID = 'neuron-chat-area';
    const CLEAR_BTN_ID = 'neuron-notificacao-clear-btn';
    const CLOSE_BTN_ID = 'neuron-panel-close-btn';
    const ICONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="32px" height="32px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>`;
    const NEURON_LOGO_IMG = `<img src="${chrome.runtime.getURL('images/neuron64.png')}" class="neuron-bubble-logo-img" alt="Logo Neuron">`;

    // --- Estado do Módulo ---
    let currentMasterEnabled = false;
    let currentFeatureEnabled = false;
    let expandedGroups = new Set();
    let notificationSettings = {}; // Configurações específicas das notificações

    // --- Funções Principais ---

    async function carregarConfiguracoes() {
        // Tenta carregar a configuração geral da extensão do storage.local
        const result = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
        let fullConfig = {};
        if (result[CONFIG_STORAGE_KEY] && typeof result[CONFIG_STORAGE_KEY] === 'object') {
            fullConfig = result[CONFIG_STORAGE_KEY];
        } else {
            // Se não encontrar no local storage, carrega do config.json padrão
            try {
                const response = await fetch(chrome.runtime.getURL(DEFAULT_CONFIG_PATH));
                if (!response.ok) throw new Error(`Erro HTTP ao carregar config padrão: ${response.status}`);
                fullConfig = await response.json();
            } catch (e) {
                console.error(`Neuron (${SCRIPT_NOME_PARA_LOG}): Erro crítico ao carregar ${DEFAULT_CONFIG_PATH}:`, e);
                fullConfig = { masterEnableNeuron: false, featureSettings: {} }; // Fallback mínimo
            }
        }

        // Extrai o estado geral e específico da funcionalidade
        currentMasterEnabled = fullConfig.masterEnableNeuron !== false;
        currentFeatureEnabled = fullConfig.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        
        // Carrega as configurações específicas do módulo de notificações
        const featureConfig = fullConfig.featureSettings?.[SCRIPT_ID]?.config;
        if (featureConfig) {
            notificationSettings.showProrrogada = featureConfig.showProrrogada !== false;
            notificationSettings.showComplementada = featureConfig.showComplementada !== false;
            notificationSettings.showRespondida = featureConfig.showRespondida !== false;
            notificationSettings.daysLookahead = featureConfig.daysLookahead ?? 2;
        } else {
            // Define padrões se a config específica não for encontrada
            notificationSettings = {
                showProrrogada: true,
                showComplementada: true,
                showRespondida: true,
                daysLookahead: 2
            };
        }
    }
    
    function removerEstruturaUI() {
        document.getElementById(ICON_ID)?.remove();
        document.getElementById(PANEL_ID)?.remove();
    }

    function filtrarAvisosConformeConfig(avisos) {
        if (!Array.isArray(avisos)) return [];
        return avisos.filter(aviso => {
            if (aviso.tipo === 'status_respondida' && !notificationSettings.showRespondida) return false;
            if (aviso.tipo === 'status_prorrogada' && !notificationSettings.showProrrogada) return false;
            if (aviso.tipo === 'status_complementada' && !notificationSettings.showComplementada) return false;
            return true;
        });
    }

    async function atualizarUI(avisos = []) {
        // Redundância para garantir que a UI não seja criada se a funcionalidade estiver desabilitada
        if (!currentMasterEnabled || !currentFeatureEnabled) {
            removerEstruturaUI();
            return;
        }

        // Tenta pegar os elementos existentes para evitar recriá-los desnecessariamente
        let panel = document.getElementById(PANEL_ID);
        let icone = document.getElementById(ICON_ID);

        // Se a estrutura não existe, cria
        if (!panel || !icone) {
            removerEstruturaUI(); // Garante limpeza total antes de recriar
            criarEstruturaUI();
            panel = document.getElementById(PANEL_ID);
            icone = document.getElementById(ICON_ID);
            // Re-adiciona listeners quando a estrutura é criada
            adicionarListenersUI(); 
        }

        const contador = document.getElementById(COUNT_ID);
        const chatArea = document.getElementById(CHAT_AREA_ID);
        
        if (!contador || !chatArea || !icone) return; // Se por algum motivo falhou em criar

        const scrollPositions = {};
        // Salva a posição de scroll das listas expandidas antes de recarregar o conteúdo
        chatArea.querySelectorAll('.notification-item-list').forEach(list => {
            if (list.id && !list.classList.contains('collapsed')) { // Apenas para listas visíveis
                scrollPositions[list.id] = list.scrollTop;
            }
        });

        const numAvisos = avisos.length;
        contador.textContent = numAvisos;
        contador.style.display = numAvisos > 0 ? 'flex' : 'none';
        icone.classList.toggle('neuron-has-notifications', numAvisos > 0);

        let chatHTML = `
            <div class="neuron-chat-bubble-container">
                <div class="bubble-logo">${NEURON_LOGO_IMG}</div>
                <div class="neuron-chat-bubble welcome-bubble">
                    Olá! Encontrei <strong>${numAvisos} aviso(s)</strong> para você.
                </div>
            </div>`;

        if (numAvisos > 0) {
            const titulosGrupos = {
                'prorrogar_interno': '⏰ Prazos Internos Próximos',
                'cobranca_hoje': '⚠️ Cobranças Próximas',
                'prorrogar_se_aprox': '➡️ Prorrogações Próximas',
                'status_respondida': '✅ Possíveis Respondidas',
                'status_prorrogada': '🔄 Status: Prorrogada',
                'status_complementada': '✍️ Status: Em Complementação'
            };
            const ordemGrupos = ['prorrogar_interno', 'cobranca_hoje', 'prorrogar_se_aprox', 'status_respondida', 'status_prorrogada', 'status_complementada'];
            const avisosAgrupados = avisos.reduce((acc, aviso) => {
                (acc[aviso.tipo] = acc[aviso.tipo] || []).push(aviso);
                return acc;
            }, {});

            ordemGrupos.forEach(tipo => {
                if (avisosAgrupados[tipo]) {
                    const contentId = `group-content-${tipo}`;
                    // Mantém o estado de expansão
                    const isExpanded = expandedGroups.has(contentId);
                    const titleExpandedClass = isExpanded ? 'expanded' : '';
                    const listCollapsedClass = isExpanded ? '' : 'collapsed';

                    chatHTML += `
                        <div class="neuron-chat-bubble-container neuron-group-container">
                            <div class="bubble-logo">${NEURON_LOGO_IMG}</div>
                            <div class="neuron-chat-bubble notification-group-bubble aviso-group-${tipo}">
                                <h4 class="group-title ${titleExpandedClass}" data-group-target="${contentId}">
                                    ${titulosGrupos[tipo] || 'Outros Avisos'}
                                    <span class="group-counter">(${avisosAgrupados[tipo].length})</span>
                                </h4>
                                <div id="${contentId}" class="notification-item-list ${listCollapsedClass}">
                                    ${avisosAgrupados[tipo].map(aviso => {
                                        let actionsHTML = '';
                                        if (aviso.tipo === 'status_respondida') {
                                            actionsHTML += `<em class="fas fa-eye neuron-nup-link-in-panel" data-nup="${aviso.nup}" style="color: gray; cursor: pointer;" title="Ver manifestação na página"></em>`;
                                        }
                                        actionsHTML += `<input type="checkbox" class="neuron-check-notification" data-nup="${aviso.nup}" ${aviso.checked ? 'checked' : ''} title="Marcar como verificado">`;

                                        return `
                                            <div class="notification-item ${aviso.checked ? 'checked' : ''}">
                                                <div class="notification-content">
                                                    <strong class="neuron-nup-link-in-panel" data-nup="${aviso.nup}" title="Clique para copiar o NUP">${aviso.nup}:</strong>
                                                    <span>${aviso.mensagem}</span>
                                                </div>
                                                <div class="notification-actions">
                                                    ${actionsHTML}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>`;
                }
            });
        }
        
        chatArea.innerHTML = chatHTML;
        
        // Restaura a posição de scroll após a atualização do conteúdo
        for (const listId in scrollPositions) {
            const newList = document.getElementById(listId);
            if (newList) {
                newList.scrollTop = scrollPositions[listId];
            }
        }
        // Os listeners são re-adicionados pela chamada de adicionarListenersUI quando a estrutura é criada.
        // Se a estrutura já existia e não foi recriada, precisamos re-adicionar listeners aos elementos internos.
        // Uma forma é chamar adicionarListenersUI() após o innerHTML, se a estrutura não foi recriada.
        // No entanto, para simplicidade e dada a natureza dinâmica, recriar os listeners para elementos específicos é melhor.
        // Esta parte foi ajustada para ser chamada APENAS quando a estrutura é CRIADA, e não a cada atualização.
        // Se a estrutura já existia e foi apenas o innerHTML que mudou, precisamos REAPLICAR os listeners internos.
        // Solução: Mover a chamada de adicionarListenersUI para depois de chatArea.innerHTML = chatHTML;
        adicionarListenersUI(); // Chama sempre para re-aplicar listeners aos elementos recriados no chatArea
    }
    
    function calcularDiferencaDeDias(dataFutura, dataBase) {
        const d1 = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate());
        const d2 = new Date(dataFutura.getFullYear(), dataFutura.getMonth(), dataFutura.getDate());
        return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    }

    async function capturarEsalvarAvisos() {
        const hoje = new Date();
        // Carrega avisos existentes (que já foram verificados e não são duplicados)
        const { [STORAGE_KEY_AVISOS]: avisosSalvos = [] } = await chrome.storage.local.get(STORAGE_KEY_AVISOS);
        // Cria um Set para verificação rápida de NUPs já salvos
        const nupsJaSalvos = new Set(avisosSalvos.map(aviso => aviso.nup));
        let novosAvisosAdicionados = false; // Flag para saber se houve novas adições

        // Processa notificações de "Status: Tratamento finalizado."
        if (notificationSettings.showRespondida) {
            document.querySelectorAll('div.col-md-3.coluna2dalista').forEach(colunaResponsavel => {
                // Procura pelo ícone de check OU pelo ícone de olho para indicar resposta
                const temIndicadorDeResposta = colunaResponsavel.querySelector('em.fa-check-circle, em.fa-eye');
                
                if (temIndicadorDeResposta) {
                    const linhaPrincipal = colunaResponsavel.closest('.row');
                    // Tenta encontrar o link do NUP na linha principal
                    const nupLink = linhaPrincipal?.querySelector('a[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]');
                    if (nupLink) {
                        const nup = nupLink.textContent.trim();
                        // Se o NUP ainda não foi salvo como aviso, adiciona
                        if (!nupsJaSalvos.has(nup)) {
                            avisosSalvos.push({ nup, mensagem: 'Status: Tratamento finalizado.', tipo: 'status_respondida', checked: false });
                            novosAvisosAdicionados = true;
                        }
                    }
                }
            });
        }

        // Processa notificações de prazo (prorrogar_interno, cobranca_hoje, prorrogar_se_aprox)
        // e notificações de status (status_prorrogada, status_complementada)
        const prazoSpans = document.querySelectorAll("span[data-neuron-prazo-final]"); // Elementos criados pelo módulo tratar-triar
        for (const prazoSpan of prazoSpans) {
            const nupLink = document.getElementById(prazoSpan.id.replace('lblPrazoResposta', 'lnkNumero'));
            const nup = nupLink?.textContent.trim();
            const situacao = prazoSpan.dataset.neuronSituacao; // Situação da manifestação do data-set

            if (!nup || !situacao || nupsJaSalvos.has(nup)) continue; // Pula se NUP ou situação ausentes, ou já salvo

            let isStatusNotification = false;
            // Notificações de status baseadas na situação
            if (notificationSettings.showProrrogada && situacao === 'Prorrogada') {
                avisosSalvos.push({ nup, mensagem: 'Status: Prorrogada', tipo: 'status_prorrogada', checked: false });
                novosAvisosAdicionados = true;
                isStatusNotification = true;
            }
            if (notificationSettings.showComplementada && (situacao === 'Complementada' || situacao === 'Complementação Solicitada')) {
                avisosSalvos.push({ nup, mensagem: `Status: ${situacao}`, tipo: 'status_complementada', checked: false });
                novosAvisosAdicionados = true;
                isStatusNotification = true;
            }
            if (isStatusNotification) continue; // Se já é uma notificação de status, não verifica prazos

            // Notificações de prazo, se não for uma notificação de status
            const checkPrazo = (dataStr, msgTemplate, tipo) => {
                if (!dataStr) return; // Sai se a data não existe
                const data = new Date(dataStr); // Converte string para objeto Date
                const diff = calcularDiferencaDeDias(data, hoje); // Calcula diferença em dias
                if (diff >= 0 && diff <= notificationSettings.daysLookahead) { // Se o prazo está dentro da janela de alerta
                    avisosSalvos.push({ nup, mensagem: msgTemplate.replace('{dias}', diff), tipo, checked: false });
                    novosAvisosAdicionados = true;
                }
            };
            checkPrazo(prazoSpan.dataset.neuronTramitarData, 'Prazo Interno em {dias} dia(s).', 'prorrogar_interno');
            checkPrazo(prazoSpan.dataset.neuronCobrancaData, 'Cobrança em {dias} dia(s).', 'cobranca_hoje');
            checkPrazo(prazoSpan.dataset.neuronDataProrrogacao, 'Prazo de prorrogar em {dias} dia(s).', 'prorrogar_se_aprox');
        }

        // Salva os avisos se houver novas adições
        if (novosAvisosAdicionados) {
            await chrome.storage.local.set({ [STORAGE_KEY_AVISOS]: avisosSalvos });
        }
    }

    async function revalidarDadosEAtualizarUI() {
        await carregarConfiguracoes(); // Recarrega as configurações
        
        if (!currentMasterEnabled || !currentFeatureEnabled) {
            removerEstruturaUI();
            return;
        }

        await capturarEsalvarAvisos(); // Recaptura e salva novos avisos
        const { [STORAGE_KEY_AVISOS]: avisos } = await chrome.storage.local.get(STORAGE_KEY_AVISOS);
        const avisosFiltrados = filtrarAvisosConformeConfig(avisos || []);
        await atualizarUI(avisosFiltrados); // Atualiza a UI com os avisos mais recentes e filtrados
    }
    
    // Função para criar a estrutura HTML inicial do painel e ícone de notificação
    function criarEstruturaUI() {
        // Assume que já verificou que os elementos não existem antes de chamar esta função
        const painel = document.createElement('div');
        painel.id = PANEL_ID;
        painel.className = 'neuron-chat-panel';
        painel.innerHTML = `
            <div class="neuron-chat-header">
                <div class="header-logo">${NEURON_LOGO_IMG}</div>
                <span class="header-title">Assistente Neuron</span>
                <button id="neuron-panel-refresh-btn" class="header-refresh-btn" title="Atualizar Avisos"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
                <button id="${CLOSE_BTN_ID}" class="header-close-btn">&times;</button>
            </div>
            <div id="${CHAT_AREA_ID}" class="neuron-chat-area"></div>
            <div class="neuron-chat-footer">
                <button id="neuron-notificacao-update-btn" class="neuron-footer-btn neuron-update-btn">Atualizar</button>
                <button id="${CLEAR_BTN_ID}" class="neuron-footer-btn neuron-clear-btn">Limpar Avisos</button>
            </div>`;
        document.body.appendChild(painel);

        const icone = document.createElement('div');
        icone.id = ICON_ID;
        icone.innerHTML = `${ICONE_SVG}<span id="${COUNT_ID}">0</span>`;
        document.body.appendChild(icone);
    }

    // Adiciona todos os listeners de evento para a UI
    function adicionarListenersUI() {
        document.getElementById(ICON_ID)?.addEventListener('click', () => { 
            const panel = document.getElementById(PANEL_ID);
            if (panel) panel.style.display = 'flex'; 
        });
        document.getElementById(CLOSE_BTN_ID)?.addEventListener('click', () => { 
            const panel = document.getElementById(PANEL_ID);
            if (panel) panel.style.display = 'none'; 
        });
        document.getElementById('neuron-panel-refresh-btn')?.addEventListener('click', revalidarDadosEAtualizarUI);
        document.getElementById('neuron-notificacao-update-btn')?.addEventListener('click', revalidarDadosEAtualizarUI);
        document.getElementById(CLEAR_BTN_ID)?.addEventListener('click', async () => {
            expandedGroups.clear(); // Limpa grupos expandidos
            await chrome.storage.local.remove(STORAGE_KEY_AVISOS); // Remove avisos salvos
            const panel = document.getElementById(PANEL_ID);
            if (panel) panel.style.display = 'none'; // Esconde o painel
            await revalidarDadosEAtualizarUI(); // Revalida para atualizar contagem e UI
        });
        // Adiciona listeners para elementos que são recriados no chatArea
        document.querySelectorAll('.neuron-nup-link-in-panel').forEach(link => link.addEventListener('click', handleNupClickInPanel));
        document.querySelectorAll('.group-title').forEach(title => title.addEventListener('click', handleToggleGroup));
        document.querySelectorAll('.neuron-check-notification').forEach(checkbox => checkbox.addEventListener('change', handleCheckNotification));
    }

    function handleNupClickInPanel(event) {
        const nupToFind = event.currentTarget.dataset.nup;
        if (!nupToFind) return;
        const link = Array.from(document.querySelectorAll('a[id^="ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lnkNumero_"]'))
            .find(a => a.textContent.trim() === nupToFind);
        
        const parentItem = event.currentTarget.closest('.notification-item');
        parentItem.querySelector('.neuron-nup-not-found-msg')?.remove(); // Remove msg antiga se houver

        if (link) {
            const row = link.closest('div.row');
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('neuron-highlight'); // Adiciona destaque
                setTimeout(() => row.classList.remove('neuron-highlight'), 2500); // Remove destaque
            }
        } else {
            const notFoundMsg = document.createElement('div');
            notFoundMsg.className = 'neuron-nup-not-found-msg';
            notFoundMsg.textContent = 'Não encontrado nesta página.';
            parentItem.appendChild(notFoundMsg);
            setTimeout(() => notFoundMsg.remove(), 3500); // Remove msg após tempo
        }
    }

    function handleToggleGroup(event) {
        const title = event.currentTarget;
        const contentId = title.dataset.groupTarget;
        const content = document.getElementById(contentId);
        if (content) {
            const isExpanding = !title.classList.contains('expanded');
            title.classList.toggle('expanded', isExpanding);
            content.classList.toggle('collapsed', !isExpanding);
            if (isExpanding) expandedGroups.add(contentId); // Adiciona ao set de grupos expandidos
            else expandedGroups.delete(contentId); // Remove do set
        }
    }

    async function handleCheckNotification(event) {
        const nupToUpdate = event.target.dataset.nup;
        const isChecked = event.target.checked;
        event.target.closest('.notification-item')?.classList.toggle('checked', isChecked);

        const { [STORAGE_KEY_AVISOS]: avisos = [] } = await chrome.storage.local.get(STORAGE_KEY_AVISOS);
        const aviso = avisos.find(a => a.nup === nupToUpdate);
        if (aviso) {
            aviso.checked = isChecked; // Atualiza o status do checkbox
            await chrome.storage.local.set({ [STORAGE_KEY_AVISOS]: avisos }); // Salva de volta
        }
    }

    async function handleStorageChange(changes, namespace) {
        if (namespace !== 'local') return; // Só interessa mudanças no storage.local
        
        // Verifica se a mudança é na configuração geral ou nos avisos salvos
        if (changes[CONFIG_STORAGE_KEY] || changes[STORAGE_KEY_AVISOS]) {
            await revalidarDadosEAtualizarUI(); // Revalida tudo e atualiza a UI
        }
    }

    async function init() {
        await carregarConfiguracoes(); // Carrega configs iniciais

        if (currentMasterEnabled && currentFeatureEnabled) {
            // Se a funcionalidade está ativa, captura e exibe avisos
            await capturarEsalvarAvisos();
            const { [STORAGE_KEY_AVISOS]: avisos } = await chrome.storage.local.get(STORAGE_KEY_AVISOS);
            const avisosFiltrados = filtrarAvisosConformeConfig(avisos || []);
            await atualizarUI(avisosFiltrados);
        } else {
            removerEstruturaUI(); // Se não está ativa, remove a UI
        }

        // Adiciona o listener de mudança no storage UMA VEZ na inicialização
        chrome.storage.onChanged.addListener(handleStorageChange);

        // Expõe funções para outros módulos (ex: tratar-triar para disparar atualização)
        window.NEURON_MODULES = { 
            ...window.NEURON_MODULES, 
            notificacoes: true, 
            runNotificationCheck: revalidarDadosEAtualizarUI 
        };
        console.log(`%cNeuron (${SCRIPT_NOME_PARA_LOG}): Módulo pronto.`, "color: purple;");
    }

    // Inicia o módulo
    init();
})();