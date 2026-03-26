Responsável pela revisão: Tales Vinícius Alves da Cunha  
Responsável pelo sistema: Samuel Brasileiro dos Santos Neto : https://github.com/samuelbrasileiro/code-ia-exp-1/tree/main
## O sistema está funcionando com as funcionalidades solicitadas?
Sim. O sistema está funcionando conforme o esperado. A execução dos testes de aceitação (npm run test:acceptance via Cucumber) cobriu com sucesso todas as funcionalidades especificadas, passando em 29 cenários e 131 passos sem apresentar erros. Isso comprova que os fluxos de criação de questões, provas, geração de variantes e PDFs, exportação de gabaritos (inclusive por soma de potências de 2) e correções de respostas estão operacionais de ponta a ponta.
## Quais os problemas de qualidade do código e dos testes?
### Problemas de Qualidade de Código:
-  Acoplamento e Lógica nos Controladores (Rotas): A lógica de negócios pesada está misturada diretamente dentro das definições de rotas (como no arquivo corrections.ts, que possui mais de 100 linhas de parsing de CSV, lógica de soma/potência de dois e matemática de correções dentro de um único .post()).
- Ausência de Linters e Formatadores: O projeto não possui configuração de ferramentas como ESLint ou Prettier (ausentes no package.json). Isso leva a falta de padronização na base de código.
### Problemas de Qualidade dos Testes:
1. Falta de Testes Unitários: O projeto depende exclusivamente de Testes de Aceitação BDD (E2E com Cucumber). Não existem testes unitários (como Jest ou Vitest no backend) para validar individualmente o comportamento de funções complexas. 
2. Ausência de Testes no Frontend: Todos os testes parecem estar direcionados à API/Backend, indicando que a camada de React não possui validações implementadas. 

##  Comparação de Funcionalidade
A nível de funcionalidades de negócios, ambos sistemas consguem satisfazer os requerimentos.
- Gestão de Dados: Ambos permitem gerir banco de questões, criar provas, e gerar cópias randomizadas.
- Geração de Arquivos: Ambos conseguem gerar PDFs e exportar o gabarito no formato CSV.
- Correções: A lógica de correção de gabaritos via CSV de estudantes atende os mesmos requisitos, suportando cálculo por "Letras" ou "Soma de Potências de 2", além de contemplarem os cenários de correção rígida (strict) e tolerante (lenient).
2. Comparação de Qualidade e Arquitetura (Onde o seu sistema brilha)
O **code-ia-exp-1** mistura lógica de negócio com rotas, usa arquivos JSON locais (o que aumenta o risco de perda de dados e problemas de concorrência), possui testes mais limitados e um tratamento de erros simples e inconsistente.


# histórico do desenvolvimento

## Estratégias de interação utilizada

1. Abordagem "Top-Down" com Planejamento: Alisson iniciou utilizando um "Plan Mode", pedindo para que o agente assumisse o papel de Engenheiro Fullstack e detalhasse o plano e a arquitetura (React + Node + JSON file) antes de gerar código.
2. Delegação de Implementação: Em seguida, utilizou prompts curtos e genéricos como "Implement the plan" para que o agente gerasse o código em massa a partir do planejamento.
3. Refatoração Incremental Baseada em Feedback Visuais: A maior parte das iterações ocorreu para corrigir decisões de design que não agradaram, como melhorias de layout, troca de ícones por SVGs e adição de campos que haviam sido esquecidos.
4. Deploy Guiado: Solicitou que o agente o instruísse passo a passo sobre como fazer o deploy da aplicação no serviço Render.

## Situações em que o agente funcionou melhor ou pior
Funcionou Melhor:
- Execução inicial: A criação rápida da estrutura do projeto e implementação do CRUD básico funcionou perfeitamente logo na primeira tentativa.
- Alteração de Regras de Negócio Genéricas: Quando solicitado para alterar o modelo de dados para suportar múltiplas alternativas corretas e ajustar os modais.
- Instruções de Deploy: O guia gerado para o deploy no Render foi bem assertivo e ajudou a esclarecer a lógica de publicação.
Funcionou Pior:
- Tarefas de Posicionamento Visual: O agente falhou na tentativa de alinhar à direita os campos "Nome" e "CPF" no rodapé do PDF, sendo incapaz de resolver o problema mesmo após 4 tentativas.
- Interpretação de Formatos Complexos: Ao solicitar a adoção de arquivos CSV "estilo Google Forms", o agente se confundiu na implementação, quebrou a lógica de correção "lenient" e gerou travamentos graves no backend.

 ## Tipos de problemas observados (por exemplo, código incorreto ou inconsistências)
1. Travamento do Backend: A geração do PDF falhou ao criar um looping infinito no pacote pdfkit (RangeError: Maximum call stack size exceeded), exigindo envio do stack trace para correção.
2. Inconsistências de UI/UX: O agente interpretou mal o pedido de ícones e colocou simplesmente a primeira letra da sessão em vez de buscar SVGs adequados.
3. Alucinações em Arquivos de Configuração: Durante a correção do deploy, o agente sugeriu tipos inválidos como static ou static_site para o arquivo render.yaml, bem como configurações de discos que não eram suportadas pelo plano gratuito.
4. Acúmulo de Débito Técnico: A falta de testes contínuos durante o desenvolvimento fez com que as adições de funcionalidades (como soma de potências) quebrassem funcionalidades anteriores silenciosamente.

## Avaliação geral da utilidade do agente no desenvolvimento

O agente mostrou-se uma ferramenta incrivelmente valiosa para superar a "síndrome da página em branco". Ele construiu a base do monorepo, arquivos de configuração e rotas básicas muito mais rápido do que a digitação manual permitiria. No entanto, demonstrou ser muito frágil no trabalho de "polimento" (fine-tuning de design no PDF) e na manutenção de código legado se não houver um guia restrito. Como o próprio Alisson apontou no relatório: foi essencial para ganho de velocidade, mas exigiu alta supervisão para aderir aos requisitos.

## Comparação com a sua experiência de uso do agente
Minha experiência foi bem diferente  devido à estratégia de prompt:
- No controle arquitetural: Enquanto o Samuel pediu para o agente decidir a stack e a arquitetura (o que resultou em arquivos JSON vulneráveis para persistência de dados e rotas altamente acopladas), na minha abordagem eu forcei o agente a utilizar padrões rígidos desde o primeiro prompt (Drizzle ORM, SQLite, Repositórios, Services e  separação de responsabilidades). Também fiz o uso de agents e skills especificas.
- Orientação a Testes (TDD vs "Testes no final"): Eu solicitei a criação de cenários BDD e testes Playwright/Supertest antes da implementação dos serviços, forçando o agente a programar de forma modularizada e validável. Já o colega delegou tudo de uma vez e só aplicou os testes no final para achar erros que já haviam sido injetados na base.
- Tamanho dos Passos: O projeto do colega baseou-se em "crie o plano" e "implemente o plano inteiro". Minha estratégia utilizou micro-passos (primeiro criar a tabela schema.ts, garantir compilação, em seguida repositórios, depois rotas), o que minimizou alucinações de arquivos não instalados e garantiu um software de qualidade muito mais estável, robusto e escalável que o dele.