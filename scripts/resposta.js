(function() {
    'use strict';

    // Espera o carregamento da página antes de executar
    function esperarCarregamentoPagina() {
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (document.body) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
        });
    }
    // Função auxiliar para clicar em um elemento, se ele existir
    function clickElementById(id) {
        const element = document.getElementById(id);
        if (element) {
            element.click();
            console.log(`Elemento com ID '${id}' clicado.`);
        } else {
            console.warn(`Elemento com ID '${id}' não encontrado.`);
        }
    }

    // Função para definir o valor de um campo de texto, se ele existir
    function setValueById(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
            console.log(`Valor definido para o campo com ID '${id}': ${value}`);
        } else {
            console.warn(`Campo com ID '${id}' não encontrado.`);
        }
    }

    // Função para selecionar a opção no <select>
    function selectOptionByIdAndValue(selectId, value) {
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            selectElement.value = value; // Define o valor selecionado
            selectElement.dispatchEvent(new Event('change')); // Dispara o evento 'change'
            console.log(`Opção com value="${value}" selecionada no <select> com ID '${selectId}'.`);
        } else {
            console.warn(`Elemento <select> com ID '${selectId}' não encontrado.`);
        }
    }

// Copia a Tags para o campo de Responsável pela resposta
function copyValueToInput(sourceId, targetId) {
    const sourceElement = document.getElementById(sourceId);
    const targetElement = document.getElementById(targetId);

    if (sourceElement && targetElement) {
        const sourceValue = sourceElement.value.trim(); // Apenas remover espaços extras

        const allowedValues = [
            "Secretaria de Educação Superior - SESu",
            "Secretaria de Regulação e Supervisão da Educação Superior - SERES",
            "Secretaria de Educação Profissional e Tecnológica - SETEC",
            "Secretaria de Educação Básica - SEB",
            "Secretaria de Articulação Intersetorial e com os Sistemas de Ensino - SASE",
            "Secretaria de Educação Continuada, Alfabetização, Diversidade e Inclusão - SECADI",
            "Subsecretaria de Tecnologia da Informação e Comunicação - STIC",
            "Subsecretaria de Planejamento e Orçamento - SPO",
            "Subsecretaria de Gestão Administrativa - SGA",
            "Secretaria Executiva - SE",
            "Corregedoria - COR",
            "Consultoria Jurídica - CONJUR",
            "Assessoria Especial de Controle Interno - AECI",
            "Gabinete do Ministro - GM",
            "Conselho Nacional de Educação - CNE",
            "Inovação e Avaliação de Políticas Educacionais (Segape)"
        ];

        // Verifica se o valor do source está na lista de permitidos
        const match = allowedValues.find(val => sourceValue.includes(val));

        // Se houver correspondência, usa o valor encontrado, senão define "Ouvidoria do Ministério da Educação"
        targetElement.value = match ? match : "Ouvidoria do Ministério da Educação";

        console.log(`Valor do campo com ID '${sourceId}' copiado para o campo com ID '${targetId}': ${targetElement.value}`);
    } else {
        if (!sourceElement) {
            console.warn(`Elemento fonte com ID '${sourceId}' não encontrado.`);
        }
        if (!targetElement) {
            console.warn(`Elemento alvo com ID '${targetId}' não encontrado.`);
        }
    }
}

// Chamada para copiar o valor
copyValueToInput(
    'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_infoManifestacoes_infoManifestacao_txtTags',
    'ConteudoForm_ConteudoGeral_ConteudoFormComAjax_txtResponsavelResposta',
    'responsavelResposta-input'
);

    // Realiza as ações desejadas
    clickElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_rbDemandaConcluidaSim');
    clickElementById('rbDemandaResolvida-item-0');
    // Define valores nos campos

    setValueById('txtDtaGeracaoInformar');

// Adicione esta linha onde você deseja definir o valor
})();