(function() {
    'use strict';
    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_KEY = 'neuronUserConfig';
    let observer = null;
    let debounceTimer;

    async function isScriptAtivo() {
        if (!chrome.runtime?.id) return false;
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            const config = result[CONFIG_KEY] || {};
            return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        } catch (e) {
            return false;
        }
    }

    const executarExtracao = async () => {
        if (!await isScriptAtivo()) return;

        const todosOsLinksDeNumero = document.querySelectorAll('a[id*="lvwTriagem_lnkNumero_"]');
        if (todosOsLinksDeNumero.length === 0) return;

        const manifestacoesParaProcessar = [];

        todosOsLinksDeNumero.forEach(linkNumero => {
            try {
                const idCompleto = linkNumero.id;
                const indice = idCompleto.split('_').pop();

                const situacaoElement = document.getElementById(`ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblSituacaoManifestacao_${indice}`);
                const prazoElement = document.getElementById(`ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblPrazoResposta_${indice}`);
                const cadastroElement = document.getElementById(`ConteudoForm_ConteudoGeral_ConteudoFormComAjax_lvwTriagem_lblDataRegistro_${indice}`);
                const urlRelativo = linkNumero.getAttribute('navigateurl');

                let iconeRespondida = null;
                let iconeObservacao = null;
                let todosOsResponsaveis = []; 

                const primeiroRow = linkNumero.closest('.row');
                
                if (primeiroRow) {
                    const segundoRow = primeiroRow.nextElementSibling;
                    if (segundoRow && segundoRow.classList.contains('row')) {
                        const colunaDetalhes = segundoRow.querySelector('.coluna2dalista');
                        if (colunaDetalhes) {
                            iconeRespondida = colunaDetalhes.querySelector('em.fas.fa-check-circle[style*="green"]');
                            iconeObservacao = colunaDetalhes.querySelector('em.fas.fa-eye');

                            const itensDaLista = colunaDetalhes.querySelectorAll('li');
                            
                            for (const item of itensDaLista) {
                                const cloneDoItem = item.cloneNode(true);
                                const iconeParaRemover = cloneDoItem.querySelector('span > span');
                                if (iconeParaRemover) {
                                    iconeParaRemover.remove();
                                }
                                
                                todosOsResponsaveis.push(cloneDoItem.textContent.trim());
                            }
                        }
                    }
                }

                manifestacoesParaProcessar.push({
                    numero: linkNumero.innerText.trim(),
                    href: urlRelativo ? `https://falabr.cgu.gov.br${urlRelativo}` : null,
                    situacao: situacaoElement?.innerText.trim() || '',
                    prazo: prazoElement?.innerText.trim() || '',
                    dataCadastro: cadastroElement?.innerText.trim() || '',
                    responsaveis: todosOsResponsaveis, 
                    possivelRespondida: !!iconeRespondida,
                    possivelobservacao: !!iconeObservacao,
                    idPrazoOriginal: prazoElement?.id || null,
                    idCadastroOriginal: cadastroElement?.id || null
                });
            } catch (error) {
                console.error(`%cNeuron (${SCRIPT_ID}): Erro ao extrair demanda: ${linkNumero.innerText.trim()}`, "color: red;", error);
            }
        });

        if (manifestacoesParaProcessar.length > 0) {
            // As linhas de console.log e console.table foram removidas daqui.
            
            const evento = new CustomEvent('dadosExtraidosNeuron', { detail: manifestacoesParaProcessar });
            document.dispatchEvent(evento);
        }
    };

    async function gerenciarEstado() {
        if (await isScriptAtivo()) {
            if (observer) return;
            const onMutation = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(executarExtracao, 500);
            };
            document.addEventListener('NEURON_SOLICITAR_ATUALIZACAO', executarExtracao);
            const alvo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_upTriagem');
            if (alvo) {
                observer = new MutationObserver(onMutation);
                observer.observe(alvo, { childList: true, subtree: true });
                onMutation();
            }
        } else {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            document.removeEventListener('NEURON_SOLICITAR_ATUALIZACAO', executarExtracao);
        }
    }
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (!chrome.runtime?.id) return;
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            gerenciarEstado();
        }
    });
    gerenciarEstado();
})();