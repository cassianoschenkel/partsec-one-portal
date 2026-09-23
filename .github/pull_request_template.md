<!--
Preencha as seções abaixo. Remova o que não se aplicar, mas mantenha os
cabeçalhos para facilitar a revisão.
-->

## Summary

<!-- O que este PR faz e por quê, em poucas frases. -->

## Scope

<!-- O que está incluído neste PR. -->

## Database/migration impact

<!--
- Há mudança de schema? Se sim, a migration foi criada como arquivo mas
  NÃO foi aplicada em produção (isso é feito manualmente por um humano).
- Nenhuma mudança de schema? Diga isso explicitamente.
-->

## Security/tenant impact

<!--
- Este PR toca autorização, tenantId, ou dados entre tenants?
- Server mutations continuam se autoautenticando (não confiam em
  tenantId vindo do caller)?
- Alguma credencial, segredo, ou variável de ambiente é tocada?
-->

## Tests

<!-- O que foi testado e como (unit tests, validação manual, etc). -->

## Validation

<!-- Marque o que foi executado com sucesso antes de abrir o PR. -->

- [ ] `npx prisma format`
- [ ] `npx prisma validate`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `git diff --check`

## Out of scope

<!-- O que foi deliberadamente deixado de fora deste PR. -->

## Deployment notes

<!--
- Alguma ação manual é necessária no deploy (migration a aplicar,
  variável de ambiente nova, etc)?
- Deploy e merge continuam sendo ações humanas, fora deste PR.
-->
