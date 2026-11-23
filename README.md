# Eternize — Planejador de Casamento (React + Tailwind + Firebase)

Aplicação web completa para planejamento de casamento com sincronização em tempo real via **Cloud Firestore**, autenticação via **Firebase Authentication**, identidade visual exclusiva em **Bege & Azul Marinho** (Modos Claro e Escuro) e painel completo de **Administração de Convidados e Envio de Convites**.

## Como rodar no VS Code

1. Extraia a pasta `eternize-wedding` e abra-a no VS Code (`Arquivo > Abrir Pasta`).
2. Abra o terminal integrado (`Ctrl + '`) e instale as dependências:
   ```bash
   npm install
   ```
3. Configure o Firebase:
   - Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).
   - Ative **Authentication** (métodos *E-mail/Senha* e/ou *Anônimo* / *Google*).
   - Crie um banco **Cloud Firestore** e cole o conteúdo de `firestore.rules` na aba **Regras**.
   - Em **Configurações do Projeto > Seus aplicativos**, registre um app Web e copie as chaves para o arquivo `.env.local`.
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
