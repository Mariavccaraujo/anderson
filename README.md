# Gestor+ (com banco de dados de verdade)

Agora o site tem um **backend Node.js com banco SQLite real** por trás — não é mais só o navegador guardando dados. Isso quer dizer que os dados ficam salvos em um arquivo `gestor.db` no servidor, e qualquer pessoa acessando esse mesmo servidor vê os mesmos dados.

## O que tem aqui

```
server.js       -> o backend (API + serve o site)
schema.sql       -> estrutura do banco (tabelas, relações, triggers)
package.json      -> dependências
data/               -> dados de exemplo usados só na primeira vez que o banco é criado
public/
  index.html          -> o site (agora conversa com a API em vez do navegador)
```

Ao rodar pela primeira vez, o servidor cria automaticamente o arquivo `gestor.db` a partir do `schema.sql` e o popula com os dados de exemplo da pasta `data/`. Da próxima vez que você rodar, ele já reaproveita esse `gestor.db`.

## Como rodar no VS Code

**Pré-requisito:** Node.js 22.5 ou mais novo (esse projeto usa o módulo `node:sqlite`, nativo do Node, então não precisa instalar nenhum banco separado). Confira sua versão:

```bash
node --version
```

**Passo a passo:**

1. Abra a pasta `gestor-plus` no VS Code
2. Abra o terminal integrado (`` Ctrl+` ``)
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Suba o servidor:
   ```bash
   npm start
   ```
5. Você vai ver:
   ```
   Gestor+ rodando em http://localhost:3000
   ```
6. Abra `http://localhost:3000` no navegador.

Pronto — agora o site lê e grava direto no banco SQLite (`gestor.db`), pela API do próprio servidor. Cadastre um cliente, feche o navegador, abra de novo: os dados continuam lá, porque estão no arquivo do banco, não no navegador.

## Ver os dados direto no banco (opcional)

Se quiser inspecionar o `gestor.db` diretamente, instale a extensão **SQLite Viewer** no VS Code e abra o arquivo `gestor.db` gerado na raiz do projeto depois de rodar o servidor pela primeira vez.

## Zerar o banco

Pare o servidor e apague o arquivo `gestor.db`. Na próxima vez que rodar `npm start`, ele recria tudo do zero com os dados de exemplo.

```bash
rm gestor.db
npm start
```

## Como funciona por baixo dos panos

- O `server.js` sobe um servidor **Express** que serve o `public/index.html` e expõe uma API REST em `/api/clientes`, `/api/servicos`, `/api/pedidos`, `/api/agenda` e `/api/financeiro` (GET, POST, PUT, DELETE).
- O banco é **SQLite**, acessado pelo módulo `node:sqlite`, nativo do Node — sem instalar driver externo.
- O `schema.sql` define as tabelas com chaves estrangeiras (ex: um pedido pertence a um cliente) e um trigger que recalcula automaticamente o total do pedido sempre que um item é adicionado, editado ou removido.

## Publicar de verdade (fora do seu computador)

Pra deixar isso acessível pela internet (não só em `localhost`), você pode hospedar em serviços como **Render**, **Railway** ou **Fly.io**, que rodam projetos Node.js gratuitamente em planos básicos. O código já está pronto pra isso — não precisa mudar nada, só configurar o deploy no serviço escolhido. Me avisa se quiser ajuda com esse passo.
