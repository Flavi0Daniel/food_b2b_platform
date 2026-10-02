#!/usr/bin/env bash
# Smoke test de ponta a ponta via curl — equivalente à coleção Postman, mas 100% automático
# (gera até a imagem da prova de entrega sozinho, sem passos manuais).
#
# Uso:
#   chmod +x scripts/smoke-test.sh
#   ./scripts/smoke-test.sh
#
# Requisitos: servidor a correr (npm run dev), uma conta ADMIN já criada (npm run create-admin),
# e o utilitário `jq` instalado (sudo apt install jq).

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api}"

if ! command -v jq &> /dev/null; then
  echo "❌ Este script precisa do 'jq'. Instala com: sudo apt install jq"
  exit 1
fi

read -rp "Email do ADMIN: " ADMIN_EMAIL
read -rsp "Senha do ADMIN: " ADMIN_PASSWORD
echo

TS=$(date +%s)
step() { echo; echo "▶ $1"; }

# Faz um pedido e verifica success=true na resposta; aborta com o erro real da API se falhar.
# Uso: call MÉTODO PATH NOME_DA_VARIAVEL_DO_TOKEN(ou "") [argumentos extra do curl...]
call() {
  local method="$1" path="$2" authvar="$3"; shift 3
  local resp
  if [ -n "$authvar" ]; then
    resp=$(curl -s -X "$method" "$BASE_URL$path" -H "Authorization: Bearer ${!authvar}" "$@")
  else
    resp=$(curl -s -X "$method" "$BASE_URL$path" "$@")
  fi
  if [ "$(echo "$resp" | jq -r '.success // "false"')" != "true" ]; then
    echo "❌ Falhou: $method $path" >&2
    echo "$resp" | jq . >&2
    exit 1
  fi
  echo "$resp"
}

JSON=(-H "Content-Type: application/json")

# ---------------------------------------------------------------------------
step "0. Login Admin"
RESP=$(call POST /auth/login "" "${JSON[@]}" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
ADMIN_TOKEN=$(echo "$RESP" | jq -r '.data.accessToken')
echo "✅ token obtido"

# ---------------------------------------------------------------------------
step "1. Catálogo: criar categoria"
RESP=$(call POST /categories ADMIN_TOKEN "${JSON[@]}" -d "{\"name\":\"Categoria Teste $TS\"}")
CATEGORY_ID=$(echo "$RESP" | jq -r '.data.id')
echo "categoryId=$CATEGORY_ID"

step "1. Catálogo: criar produto"
RESP=$(call POST /products ADMIN_TOKEN "${JSON[@]}" \
  -d "{\"categoryId\":$CATEGORY_ID,\"name\":\"Produto Teste\",\"baseUnit\":\"KG\",\"sellPrice\":1500}")
PRODUCT_ID=$(echo "$RESP" | jq -r '.data.id')
echo "productId=$PRODUCT_ID"

step "1. Catálogo: disponibilizar produto"
call PATCH "/products/$PRODUCT_ID/availability" ADMIN_TOKEN "${JSON[@]}" -d '{"isAvailable":true}' > /dev/null
echo "✅ disponível"

# ---------------------------------------------------------------------------
step "2. Admin cria Fornecedor"
SUPPLIER_EMAIL="fornecedor.$TS@teste.com"
RESP=$(call POST /users ADMIN_TOKEN "${JSON[@]}" \
  -d "{\"name\":\"Fornecedor Teste\",\"email\":\"$SUPPLIER_EMAIL\",\"password\":\"Fornecedor@123\",\"role\":\"SUPPLIER\"}")
SUPPLIER_ID=$(echo "$RESP" | jq -r '.data.id')
echo "supplierId=$SUPPLIER_ID"

step "2. Login Fornecedor"
RESP=$(call POST /auth/login "" "${JSON[@]}" -d "{\"email\":\"$SUPPLIER_EMAIL\",\"password\":\"Fornecedor@123\"}")
SUPPLIER_TOKEN=$(echo "$RESP" | jq -r '.data.accessToken')

step "2. Fornecedor regista morada de recolha"
call POST /addresses SUPPLIER_TOKEN "${JSON[@]}" -d '{"street":"Rua do Fornecedor, 10","city":"Luanda"}' > /dev/null
echo "✅ morada registada"

step "2. Admin define preço de custo do Fornecedor"
call PUT "/supplier-products/$SUPPLIER_ID/$PRODUCT_ID" ADMIN_TOKEN "${JSON[@]}" \
  -d '{"costPrice":900,"isActive":true}' > /dev/null
echo "✅ preço de custo definido"

step "2. Admin cria Transportadora"
CARRIER_EMAIL="transportadora.$TS@teste.com"
RESP=$(call POST /users ADMIN_TOKEN "${JSON[@]}" \
  -d "{\"name\":\"Transportadora Teste\",\"email\":\"$CARRIER_EMAIL\",\"password\":\"Carrier@123\",\"role\":\"CARRIER\"}")
CARRIER_ID=$(echo "$RESP" | jq -r '.data.id')
echo "carrierId=$CARRIER_ID"

step "2. Login Transportadora"
RESP=$(call POST /auth/login "" "${JSON[@]}" -d "{\"email\":\"$CARRIER_EMAIL\",\"password\":\"Carrier@123\"}")
CARRIER_TOKEN=$(echo "$RESP" | jq -r '.data.accessToken')

# ---------------------------------------------------------------------------
step "3. Cliente regista-se"
CLIENT_EMAIL="cliente.$TS@teste.com"
RESP=$(call POST /auth/register "" "${JSON[@]}" \
  -d "{\"name\":\"Cliente Teste\",\"email\":\"$CLIENT_EMAIL\",\"password\":\"Cliente@123\"}")
CLIENT_TOKEN=$(echo "$RESP" | jq -r '.data.accessToken')
echo "clientEmail=$CLIENT_EMAIL"

step "3. Cliente regista morada de entrega"
RESP=$(call POST /addresses CLIENT_TOKEN "${JSON[@]}" -d '{"street":"Avenida do Cliente, 5","city":"Luanda"}')
ADDRESS_ID=$(echo "$RESP" | jq -r '.data.id')
echo "deliveryAddressId=$ADDRESS_ID"

# ---------------------------------------------------------------------------
step "4. Cliente cria encomenda"
TOMORROW=$(date -d "+1 day" +%F 2>/dev/null || date -v+1d +%F)
IDEM1=$(uuidgen 2>/dev/null || echo "idem-$TS-1")
RESP=$(call POST /orders CLIENT_TOKEN "${JSON[@]}" -H "X-Idempotency-Key: $IDEM1" \
  -d "{\"deliveryAddressId\":$ADDRESS_ID,\"requestedDeliveryDate\":\"$TOMORROW\",\"items\":[{\"productId\":$PRODUCT_ID,\"quantity\":5}]}")
ORDER_ID=$(echo "$RESP" | jq -r '.data.id')
ORDER_ITEM_ID=$(echo "$RESP" | jq -r '.data.items[0].id')
echo "orderId=$ORDER_ID orderItemId=$ORDER_ITEM_ID"

step "4. Cliente submete comprovativo de pagamento"
IDEM2=$(uuidgen 2>/dev/null || echo "idem-$TS-2")
RESP=$(call POST /payments CLIENT_TOKEN -H "X-Idempotency-Key: $IDEM2" \
  -F "orderId=$ORDER_ID" -F "method=MULTICAIXA_EXPRESS" -F "transactionRef=TESTE$TS")
PAYMENT_ID=$(echo "$RESP" | jq -r '.data.id')
echo "paymentId=$PAYMENT_ID"

step "4. Admin valida o pagamento"
call POST "/payments/$PAYMENT_ID/validate" ADMIN_TOKEN > /dev/null
echo "✅ pagamento validado"

step "4. Admin aprova a encomenda (gera PO + guia)"
IDEM3=$(uuidgen 2>/dev/null || echo "idem-$TS-3")
RESP=$(call POST "/orders/$ORDER_ID/approve" ADMIN_TOKEN "${JSON[@]}" -H "X-Idempotency-Key: $IDEM3" \
  -d "{\"assignments\":[{\"orderItemId\":$ORDER_ITEM_ID,\"supplierId\":$SUPPLIER_ID}],\"carrierId\":$CARRIER_ID}")
PO_ID=$(echo "$RESP" | jq -r '.data.purchaseOrders[0].id')
SHIPMENT_ID=$(echo "$RESP" | jq -r '.data.shipments[0].id')
echo "poId=$PO_ID shipmentId=$SHIPMENT_ID"

# ---------------------------------------------------------------------------
step "5. Fornecedor: RECEIVED → IN_PREPARATION → READY_FOR_PICKUP"
call PATCH "/purchase-orders/$PO_ID/status" SUPPLIER_TOKEN "${JSON[@]}" -d '{"status":"RECEIVED"}' > /dev/null
call PATCH "/purchase-orders/$PO_ID/status" SUPPLIER_TOKEN "${JSON[@]}" -d '{"status":"IN_PREPARATION"}' > /dev/null
call PATCH "/purchase-orders/$PO_ID/status" SUPPLIER_TOKEN "${JSON[@]}" -d '{"status":"READY_FOR_PICKUP"}' > /dev/null
echo "✅ mercadoria pronta para recolha"

step "5. Transportadora recolhe (COLLECTED)"
call PATCH "/shipments/$SHIPMENT_ID/status" CARRIER_TOKEN "${JSON[@]}" -d '{"status":"COLLECTED"}' > /dev/null
echo "✅ recolhido"

step "5. Transportadora conclui a entrega (POD)"
TMP_IMG=$(mktemp /tmp/pod-XXXXXX.png)
# Só a assinatura PNG (8 bytes) + padding: suficiente para passar a verificação de assinatura binária.
printf '\x89PNG\r\n\x1a\n0000000000000000' > "$TMP_IMG"
call POST "/shipments/$SHIPMENT_ID/deliver" CARRIER_TOKEN -F "photo=@$TMP_IMG;type=image/png" > /dev/null
rm -f "$TMP_IMG"
echo "✅ entregue"

# ---------------------------------------------------------------------------
step "6. Verificação final"
RESP=$(call GET "/orders/$ORDER_ID" ADMIN_TOKEN)
FINAL_STATUS=$(echo "$RESP" | jq -r '.data.orderStatus')
echo "Estado final da encomenda: $FINAL_STATUS"
if [ "$FINAL_STATUS" != "DELIVERED" ]; then
  echo "❌ Esperava DELIVERED, obteve $FINAL_STATUS"
  exit 1
fi

step "6. Dashboard"
RESP=$(call GET /dashboard ADMIN_TOKEN)
echo "$RESP" | jq '{revenue: .data.revenue, margin: .data.margin, pending: .data.pending}'

echo
echo "✅✅✅ Fluxo completo testado com sucesso! ✅✅✅"
