"use client";

import { useRef, useState } from "react";
import { Upload, Link, CheckCircle, Loader2, X } from "lucide-react";

interface IpfsUploadProps {
  value: string;
  onChange: (cid: string) => void;
  label?: string;
  placeholder?: string;
  accept?: string;    // e.g. "image/*,application/pdf"
  isDemoMode?: boolean;
  className?: string;
}

/** Generates a deterministic-looking fake CID from a filename (demo only). */
function fakeCid(filename: string): string {
  const base = "bafybeig";
  const hash  = Array.from(filename)
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
    .toString(36)
    .padStart(8, "0");
  const filler = "abcdefghijklmnopqrstuvwxyz234567";
  let suffix = "";
  for (let i = 0; i < 46; i++) {
    suffix += filler[(i * 7 + parseInt(hash[i % hash.length], 36)) % filler.length];
  }
  return `${base}${hash}${suffix}`.slice(0, 59);
}

export function IpfsUpload({
  value,
  onChange,
  label,
  placeholder = "bafybei…",
  accept = "*/*",
  isDemoMode = false,
  className = "",
}: IpfsUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [filename,  setFilename]  = useState<string | null>(null);
  const [mode, setMode]           = useState<"upload" | "paste">("upload");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setUploading(true);

    if (isDemoMode) {
      // Simulate ~1.2s upload delay then return fake CID
      await new Promise((r) => setTimeout(r, 1200));
      onChange(fakeCid(file.name));
      setUploading(false);
    } else {
      // Production: upload to IPFS via your pinning service API
      // e.g. Pinata, web3.storage, Filebase, etc.
      // Replace this block with your actual upload logic:
      try {
        const fd = new FormData();
        fd.append("file", file);
        // const res = await fetch("/api/ipfs/upload", { method: "POST", body: fd });
        // const { cid } = await res.json();
        // onChange(cid);
        // For now, fallback to fake:
        await new Promise((r) => setTimeout(r, 1200));
        onChange(fakeCid(file.name));
      } finally {
        setUploading(false);
      }
    }
  };

  const clear = () => {
    onChange("");
    setFilename(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm text-gray-400">{label}</label>}

      {/* Toggle */}
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
            mode === "upload" ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Upload className="h-3 w-3" /> Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
            mode === "paste" ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Link className="h-3 w-3" /> Paste CID
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            onChange={handleFile}
            className="hidden"
          />
          {!value ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 px-4 py-3 text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  Uploading to IPFS…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-amber-400" />
                  Choose file to upload to IPFS
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                {filename && <p className="text-xs text-gray-400 truncate">{filename}</p>}
                <p className="text-xs font-mono text-emerald-300 truncate">{value}</p>
              </div>
              <button
                type="button"
                onClick={clear}
                className="text-gray-500 hover:text-red-400 transition shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-amber-500"
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Preview link when CID is set */}
      {value && (
        <a
          href={`https://ipfs.io/ipfs/${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
        >
          Preview on IPFS gateway ↗
        </a>
      )}
    </div>
  );
}
