# Uso de IA generativa

## No produto

O Confluência **não usa IA** para funcionar. Repercussão, atrasos, votação e notificações são regras fixas, escritas em SQL e TypeScript. A simulação de "antes e depois" é uma ilustração pronta por categoria.

## No desenvolvimento

O João usou o **Claude Code** (assistente de programação da Anthropic) como ferramenta de apoio na parte dele: escrever e revisar código do Feed e do visual (a repaginada), resolver conflitos na integração das branches, medir desempenho e redigir guias e documentação. Na Semana 5 foi o mesmo uso: o João pediu os nove pontos, a IA escreveu o código e os scripts, e as migrations foram testadas num Postgres local antes de qualquer envio.

A IA não substituiu ninguém do time. O módulo Projetos é trabalho da Ana, e o banco, a votação no servidor e o Supabase são trabalho do Guilherme (ver [Contribuições](contribuicoes.md)). As decisões de produto, de visual e do que entrava ou não foram do time.

Nada entrou na `main` sem PR, e o time corrigiu a IA várias vezes. Os principais casos:

- **Visual:** o time rejeitou efeitos que a IA propôs (lanterna no topo, cartões flutuando, fitas cruzadas), por parecerem genéricos, e pediu seções mais fortes e um carrossel no lugar de fotos com hover.
- **Desempenho:** a primeira landing travava; o time cobrou e o mapa 3D virou imagem estática, com animações em CSS.
- **Fatos:** a IA errou o nome de uma branch e foi corrigida. Na Semana 5, errou a data da apresentação nos documentos e o João a corrigiu. O que a documentação diz sobre o banco foi conferido com consultas reais.
