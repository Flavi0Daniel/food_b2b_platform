# Smoke test da API (Postman)

Percorre o fluxo de ponta a ponta inteiro: catálogo → fornecedor/transportadora → cliente →
encomenda → pagamento → aprovação → logística → entrega → dashboard. Confirma que o contrato real
da API (não só a leitura do código) está a funcionar, antes de começarmos a integrar o frontend.

## Como usar

1. Garante que o servidor está a correr (`npm run dev`) e que já existe uma conta `ADMIN`
   (`npm run create-admin`).
2. Abre o **Postman** (ou Insomnia/Thunder Client, que também importam coleções v2.1) e importa
   `smoke-test.postman_collection.json`.
3. Na coleção, abre **Variables** e preenche `adminEmail` e `adminPassword` com a conta ADMIN que
   criaste. `baseUrl` já vem pronto para `http://localhost:3000/api` — muda se usares outra porta.
4. Corre os pedidos **de cima para baixo, pasta a pasta** (ou usa "Run collection" do Postman,
   que já respeita esta ordem). Cada pedido guarda nas Collection Variables o que o próximo precisa
   (tokens, IDs) — não precisas de copiar nada à mão.
5. **Única exceção manual**: no pedido *"Transportadora conclui a entrega (POD)"* (pasta 5), antes
   de enviar, vai a Body → form-data → campo `photo` e escolhe qualquer imagem `.jpg`/`.png` do teu
   computador. O Postman não anexa ficheiros sozinho.
6. No fim, o último pedido confirma `orderStatus = DELIVERED` e mostra o resumo do `/dashboard`.

## Se algo falhar

A resposta de erro já diz o essencial (`message`, e por vezes `errors` com o campo exato do Zod).
Os casos mais comuns:
- **401** num pedido com `auth=bearer`: o pedido anterior que gera o token falhou ou ainda não
  correu nesta sessão (os tokens vivem só em memória da coleção, não persistem entre reinícios
  do Postman a menos que guardes a coleção).
- **409** a aprovar a encomenda ou a mudar estado de PO/guia: confirma que correste os passos
  anteriores pela ordem certa (cada transição de estado só aceita o "próximo passo" exato).
- **400** com `errors`: o corpo do pedido não bate certo com o schema Zod — compara com a secção
  correspondente no README principal do backend.

Esta coleção **cria dados novos a cada corrida** (categoria, produto, fornecedor, transportadora e
cliente usam `{{$timestamp}}`/`{{$randomEmail}}`), por isso é seguro correr várias vezes seguidas
sem conflitos de email duplicado.
