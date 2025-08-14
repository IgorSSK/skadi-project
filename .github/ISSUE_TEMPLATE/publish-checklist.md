# Publicação de Pacote @skadi/* Checklist

Use esta issue para revisar manualmente antes de publicar (caso necessário).

## Qualidade
- [ ] Build local ok (`pnpm build`)
- [ ] Testes passando (`pnpm test`)
- [ ] Cobertura >= 80%
- [ ] Lint sem erros (`pnpm lint`)
- [ ] Type-check sem erros (`pnpm type-check`)

## Documentação
- [ ] README atualizado com exemplos
- [ ] Changelog gerado via Changesets

## Versão
- [ ] Changeset criado
- [ ] Versão sem pular semântica (no breaking sem major, etc.)

## Publicação
- [ ] NPM_TOKEN válido no repositório
- [ ] Workflow de Release executou com sucesso
- [ ] Pacote aparece em https://www.npmjs.com/org/skadi
- [ ] Pacote aparece em https://github.com/orgs/IgorSSK/packages
