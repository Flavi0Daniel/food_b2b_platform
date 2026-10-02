#!/usr/bin/env python3
"""Gera smoke-test.postman_collection.json a partir de uma descrição declarativa do fluxo.
Mantém a coleção fácil de editar sem escrever JSON do Postman à mão.
"""
import json
import re

RAW_MARK = "@@RAW@@"


def raw(var_expr):
    """Marca um placeholder do Postman para ser inserido SEM aspas no JSON (campo numérico puro,
    já que os schemas Zod do corpo usam z.number(), não z.coerce.number())."""
    return RAW_MARK + var_expr


def dumps_with_raw(obj):
    text = json.dumps(obj, ensure_ascii=False, indent=2)
    return re.sub(r'"' + re.escape(RAW_MARK) + r'([^"]*)"', r"\1", text)

AUTH_VAR = {
    None: None,
    "admin": "adminAccessToken",
    "client": "clientAccessToken",
    "supplier": "supplierAccessToken",
    "carrier": "carrierAccessToken",
}


def req(name, method, path, auth=None, json_body=None, form_fields=None, idem=False,
        pre=None, test=None, description=""):
    headers = []
    if idem:
        headers.append({"key": "X-Idempotency-Key", "value": "{{$guid}}", "type": "text"})

    body = None
    if json_body is not None:
        body = {
            "mode": "raw",
            "raw": dumps_with_raw(json_body),
            "options": {"raw": {"language": "json"}},
        }
    elif form_fields is not None:
        formdata = []
        for f in form_fields:
            if f.get("type") == "file":
                formdata.append({"key": f["key"], "type": "file", "src": [], "disabled": False})
            else:
                formdata.append({"key": f["key"], "value": f["value"], "type": "text"})
        body = {"mode": "formdata", "formdata": formdata}

    item = {
        "name": name,
        "request": {
            "method": method,
            "header": headers,
            "url": {
                "raw": "{{baseUrl}}" + path,
                "host": ["{{baseUrl}}"],
                "path": [p for p in path.lstrip("/").split("/")],
            },
            "description": description,
        },
        "response": [],
    }
    if body is not None:
        item["request"]["body"] = body

    auth_var = AUTH_VAR.get(auth)
    if auth_var:
        item["request"]["auth"] = {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{" + auth_var + "}}", "type": "string"}],
        }

    events = []
    if pre:
        events.append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre}})
    if test:
        events.append({"listen": "test", "script": {"type": "text/javascript", "exec": test}})
    if events:
        item["event"] = events

    return item


def folder(name, items, description=""):
    return {"name": name, "item": items, "description": description}


# --- script helpers --------------------------------------------------------

def set_var(var, js_expr):
    return f"pm.collectionVariables.set('{var}', {js_expr});"


def ok_test(extra=None):
    lines = [
        "pm.test('Status 2xx', () => pm.response.code >= 200 && pm.response.code < 300);",
    ]
    if extra:
        lines += extra
    return lines


# --- fluxo -------------------------------------------------------------------

items = []

items.append(folder("0. Configuração", [
    req(
        "Login Admin",
        "POST", "/auth/login",
        json_body={"email": "{{adminEmail}}", "password": "{{adminPassword}}"},
        test=ok_test([set_var("adminAccessToken", "pm.response.json().data.accessToken")]),
        description=(
            "Preenche as Collection Variables 'adminEmail' e 'adminPassword' com a conta "
            "criada via `npm run create-admin` antes de correr esta coleção."
        ),
    ),
], "Pré-requisito: o servidor tem de estar a correr e já deve existir uma conta ADMIN "
   "(ver `npm run create-admin` no README)."))

items.append(folder("1. Catálogo", [
    req(
        "Admin cria categoria",
        "POST", "/categories", auth="admin",
        json_body={"name": "Categoria Teste {{$timestamp}}"},
        test=ok_test([set_var("categoryId", "pm.response.json().data.id")]),
    ),
    req(
        "Admin cria produto",
        "POST", "/products", auth="admin",
        json_body={"categoryId": raw("{{categoryId}}"), "name": "Produto Teste", "baseUnit": "KG", "sellPrice": 1500},
        test=ok_test([set_var("productId", "pm.response.json().data.id")]),
        description="Nota: categoryId é injetado como número pelo Postman; o Zod aceita number diretamente.",
    ),
    req(
        "Admin disponibiliza o produto",
        "PATCH", "/products/{{productId}}/availability", auth="admin",
        json_body={"isAvailable": True},
        test=ok_test(),
    ),
]))

items.append(folder("2. Fornecedor e Transportadora", [
    req(
        "Admin cria Fornecedor",
        "POST", "/users", auth="admin",
        pre=[set_var("supplierEmail", "'fornecedor.' + Date.now() + '@teste.com'")],
        json_body={"name": "Fornecedor Teste", "email": "{{supplierEmail}}", "password": "Fornecedor@123", "role": "SUPPLIER"},
        test=ok_test([set_var("supplierId", "pm.response.json().data.id")]),
    ),
    req(
        "Login Fornecedor",
        "POST", "/auth/login",
        json_body={"email": "{{supplierEmail}}", "password": "Fornecedor@123"},
        test=ok_test([set_var("supplierAccessToken", "pm.response.json().data.accessToken")]),
    ),
    req(
        "Fornecedor regista morada de recolha",
        "POST", "/addresses", auth="supplier",
        json_body={"street": "Rua do Fornecedor, 10", "city": "Luanda"},
        test=ok_test(),
    ),
    req(
        "Admin define preço de custo do Fornecedor",
        "PUT", "/supplier-products/{{supplierId}}/{{productId}}", auth="admin",
        json_body={"costPrice": 900, "isActive": True},
        test=ok_test(),
    ),
    req(
        "Admin cria Transportadora",
        "POST", "/users", auth="admin",
        pre=[set_var("carrierEmail", "'transportadora.' + Date.now() + '@teste.com'")],
        json_body={"name": "Transportadora Teste", "email": "{{carrierEmail}}", "password": "Carrier@123", "role": "CARRIER"},
        test=ok_test([set_var("carrierId", "pm.response.json().data.id")]),
    ),
    req(
        "Login Transportadora",
        "POST", "/auth/login",
        json_body={"email": "{{carrierEmail}}", "password": "Carrier@123"},
        test=ok_test([set_var("carrierAccessToken", "pm.response.json().data.accessToken")]),
    ),
]))

items.append(folder("3. Cliente", [
    req(
        "Cliente regista-se",
        "POST", "/auth/register",
        json_body={"name": "Cliente Teste", "email": "{{$randomEmail}}", "password": "Cliente@123"},
        test=ok_test([
            set_var("clientAccessToken", "pm.response.json().data.accessToken"),
            set_var("clientId", "pm.response.json().data.user.id"),
        ]),
    ),
    req(
        "Cliente regista morada de entrega",
        "POST", "/addresses", auth="client",
        json_body={"street": "Avenida do Cliente, 5", "city": "Luanda"},
        test=ok_test([set_var("deliveryAddressId", "pm.response.json().data.id")]),
    ),
]))

items.append(folder("4. Encomenda e Pagamento", [
    req(
        "Cliente cria encomenda",
        "POST", "/orders", auth="client", idem=True,
        pre=[set_var("deliveryDate", "new Date(Date.now() + 86400000).toISOString().slice(0,10)")],
        json_body={
            "deliveryAddressId": raw("{{deliveryAddressId}}"),
            "requestedDeliveryDate": "{{deliveryDate}}",
            "items": [{"productId": raw("{{productId}}"), "quantity": 5}],
        },
        test=ok_test([
            set_var("orderId", "pm.response.json().data.id"),
            set_var("orderItemId", "pm.response.json().data.items[0].id"),
        ]),
    ),
    req(
        "Cliente submete comprovativo de pagamento",
        "POST", "/payments", auth="client", idem=True,
        form_fields=[
            {"key": "orderId", "value": "{{orderId}}"},
            {"key": "method", "value": "MULTICAIXA_EXPRESS"},
            {"key": "transactionRef", "value": "TESTE{{$timestamp}}"},
        ],
        test=ok_test([set_var("paymentId", "pm.response.json().data.id")]),
        description="Sem upload de ficheiro: a transactionRef já satisfaz o schema (proof OU transactionRef).",
    ),
    req(
        "Admin valida o pagamento",
        "POST", "/payments/{{paymentId}}/validate", auth="admin",
        test=ok_test(),
    ),
    req(
        "Admin aprova a encomenda (gera PO + guia)",
        "POST", "/orders/{{orderId}}/approve", auth="admin", idem=True,
        json_body={
            "assignments": [{"orderItemId": raw("{{orderItemId}}"), "supplierId": raw("{{supplierId}}")}],
            "carrierId": raw("{{carrierId}}"),
        },
        test=ok_test([
            set_var("poId", "pm.response.json().data.purchaseOrders[0].id"),
            set_var("shipmentId", "pm.response.json().data.shipments[0].id"),
        ]),
    ),
    req(
        "(Informativo) Admin consulta a encomenda após aprovação",
        "GET", "/orders/{{orderId}}", auth="admin",
        test=ok_test(),
        description="Confirma visualmente purchaseOrders[] e shipments[] já criados.",
    ),
]))

items.append(folder("5. Logística", [
    req("Fornecedor: RECEIVED", "PATCH", "/purchase-orders/{{poId}}/status", auth="supplier",
        json_body={"status": "RECEIVED"}, test=ok_test()),
    req("Fornecedor: IN_PREPARATION", "PATCH", "/purchase-orders/{{poId}}/status", auth="supplier",
        json_body={"status": "IN_PREPARATION"}, test=ok_test()),
    req("Fornecedor: READY_FOR_PICKUP", "PATCH", "/purchase-orders/{{poId}}/status", auth="supplier",
        json_body={"status": "READY_FOR_PICKUP"}, test=ok_test()),
    req("Transportadora: COLLECTED", "PATCH", "/shipments/{{shipmentId}}/status", auth="carrier",
        json_body={"status": "COLLECTED"}, test=ok_test()),
    req(
        "Transportadora conclui a entrega (POD)",
        "POST", "/shipments/{{shipmentId}}/deliver", auth="carrier",
        form_fields=[{"key": "photo", "type": "file"}],
        test=ok_test(),
        description="⚠️ AÇÃO MANUAL: antes de enviar, no separador Body > form-data, escolhe "
                    "qualquer ficheiro .jpg/.png no campo 'photo' (o Postman não anexa ficheiros sozinho).",
    ),
]))

items.append(folder("6. Verificação final", [
    req(
        "Confirmar encomenda entregue",
        "GET", "/orders/{{orderId}}", auth="admin",
        test=ok_test([
            "pm.test('order_status = DELIVERED', () => "
            "pm.expect(pm.response.json().data.orderStatus).to.eql('DELIVERED'));",
        ]),
    ),
    req(
        "Dashboard (resumo)",
        "GET", "/dashboard", auth="admin",
        test=ok_test(),
    ),
]))

collection = {
    "info": {
        "name": "Food B2B Platform — Smoke Test (fluxo completo)",
        "description": (
            "Percorre o fluxo de ponta a ponta: catálogo -> fornecedor/transportadora -> cliente -> "
            "encomenda -> pagamento -> aprovação -> logística -> entrega -> dashboard.\n\n"
            "Corre pasta a pasta, de cima para baixo (ou 'Run collection'). Cada pedido guarda os "
            "IDs/tokens de que precisa nas Collection Variables, para o próximo pedido usar."
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:3000/api"},
        {"key": "adminEmail", "value": ""},
        {"key": "adminPassword", "value": ""},
    ],
    "item": items,
}

with open("smoke-test.postman_collection.json", "w", encoding="utf-8") as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)

print("OK - smoke-test.postman_collection.json gerado")
