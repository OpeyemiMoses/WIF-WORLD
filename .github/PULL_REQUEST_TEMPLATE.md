## Summary of Changes

Please provide a concise summary of the changes introduced in this Pull Request.

## Related Issue(s)

Closes #

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New gameplay feature or UI enhancement
- [ ] Smart contract update (`contracts/src/WIFWorlds.sol`)
- [ ] Documentation / Community Standards update

## Verification & Pre-Merge Checklist

- [ ] `npx tsc --noEmit` passes with zero TypeScript errors
- [ ] `npm run build` succeeds cleanly
- [ ] All EVM addresses use canonical EIP-55 checksums (`getAddress(addr.toLowerCase())`)
- [ ] Onchain integrations with `WIFWorlds` (`0xaA2dd131f596249755cCcdcC48447C1434Ac109B`) and `$WIF` (`0x5173b8eA6923c2d40267890D45C46a3480954773`) remain intact (no mock data regressions)
- [ ] Admin routes (`/admin`) and privileged controls remain hidden from non-admin wallets
- [ ] Tested responsive layout on desktop and mobile landscape mode
