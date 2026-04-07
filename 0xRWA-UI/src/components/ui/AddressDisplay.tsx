"use client";

import { useState } from "react";
import { Copy, CheckCheck } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

export function AddressDisplay({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-sm font-mono text-gray-300 hover:bg-white/10 transition"
    >
      {shortenAddress(address)}
      {copied
        ? <CheckCheck className="h-3 w-3 text-green-400" />
        : <Copy className="h-3 w-3 text-gray-500" />
      }
    </button>
  );
}
