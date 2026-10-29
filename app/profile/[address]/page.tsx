import React from "react";
import { PlayerProfileView } from "@/components/profile/PlayerProfileView";

export default function ProfileAddressPage({
  params,
}: {
  params: { address: string };
}) {
  return <PlayerProfileView inspectedAddress={params.address} />;
}

