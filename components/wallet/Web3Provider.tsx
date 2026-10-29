"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { robinhoodChain, ROBINHOOD_RPC_URL } from "@/lib/chain/robinhood";

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [robinhoodChain.id]: http(ROBINHOOD_RPC_URL),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 8_000,
            refetchOnWindowFocus: true,
            retry: 2,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
