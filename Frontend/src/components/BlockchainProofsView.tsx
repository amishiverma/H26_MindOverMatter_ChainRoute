import React, { useState } from 'react';
import { Coins, CheckCircle2, Copy, Check, ExternalLink, ShieldCheck, Lock, Search, Clock } from 'lucide-react';
import { mockBlockchainProofs } from '../data/mockData';

interface BlockchainProofsViewProps {
  scanTxHash?: string | null;
}

export const BlockchainProofsView: React.FC<BlockchainProofsViewProps> = ({ scanTxHash }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Combine latest scan (if available) with mock history
  const allProofs = React.useMemo(() => {
    const proofs = [...mockBlockchainProofs];
    if (scanTxHash) {
      // Add latest scan as the first item
      proofs.unshift({
        id: 'latest-scan',
        txHash: scanTxHash,
        blockNumber: 5928174, // Would come from backend in reality
        network: 'Polygon Mainnet',
        timestamp: new Date().toISOString(),
        merkleRoot: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        repoScanDigest: 'sha256:' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        gasUsed: '42,190 Gwei',
        status: 'Confirmed',
        validator: '0xPolygonValidatorNode#14',
      });
    }
    return proofs;
  }, [scanTxHash]);

  const filteredProofs = allProofs.filter(
    (p) =>
      p.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.merkleRoot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-[#121412] p-7 relative overflow-hidden border border-stone-800 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-sans text-lime-400 font-medium block">
              Cryptographic Immutability Layer
            </span>
            <h2 className="text-2xl font-sans font-bold text-white">
              Polygon & Sepolia Trust Anchor Receipts
            </h2>
            <p className="text-sm text-stone-400 font-sans">
              Every repository AST hash is anchored as a Merkle tree root to public blockchain networks, ensuring zero-knowledge provenance verification.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-[#161816] border border-stone-800 text-center font-sans">
              <span className="text-[10px] text-stone-400 block font-medium">TOTAL PROOFS ANCHORED</span>
              <span className="text-xl font-bold text-emerald-400 font-sans">{allProofs.length + 14280}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#161816] border border-stone-800 text-center font-sans">
              <span className="text-[10px] text-stone-400 block font-medium">POLYGON FINALITY</span>
              <span className="text-xl font-bold text-emerald-400 font-sans">2.1s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Scan Highlight (if available) */}
      {scanTxHash && (
        <div className="rounded-2xl bg-gradient-to-r from-lime-950/30 via-emerald-950/20 to-transparent border border-lime-600/30 p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lime-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-lime-500/20 border border-lime-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-lime-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-sans font-bold text-stone-100 text-lg">Latest Scan Anchored</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-950/50 text-lime-400 border border-lime-800/40 font-medium">
                    JUST CONFIRMED
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-mono mt-0.5">
                  Transaction {scanTxHash.slice(0, 12)}...{scanTxHash.slice(-6)} • Polygon Mainnet
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => handleCopy('latest-tx', scanTxHash)}
                className="px-3 py-1.5 rounded-lg bg-[#0e100f] border border-stone-800 hover:border-lime-700/40 text-lime-400 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Tx Hash</span>
              </button>
              <a
                href={`https://polygonscan.com/tx/${scanTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-lime-600/20 border border-lime-600/40 hover:bg-lime-600/30 text-lime-400 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View on PolygonScan</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by Tx Hash, Merkle Root, or Network..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0e100f] border border-stone-800 rounded-full pl-9 pr-4 py-2.5 text-xs font-sans text-white placeholder-stone-500 focus:outline-none focus:border-lime-700/50"
        />
      </div>

      {/* Proofs List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProofs.map((proof) => (
          <div
            key={proof.id}
            className={`rounded-2xl bg-[#121412] p-6 border border-stone-800 hover:border-lime-700/40 transition-all font-sans text-xs space-y-4 shadow-lg ${proof.id === 'latest-scan' ? 'ring-1 ring-lime-500/30' : ''}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-800 gap-2">
              <div className="flex items-center space-x-2.5">
                <span className={`w-2 h-2 rounded-full ${proof.id === 'latest-scan' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="font-bold text-stone-100 text-sm font-sans">{proof.network}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#161a15] text-emerald-400 border border-emerald-800/40 font-medium font-sans">
                  {proof.status.toUpperCase()}
                </span>
                {proof.id === 'latest-scan' && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 font-medium font-sans flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    NEW
                  </span>
                )}
              </div>
              <span className="text-stone-400 text-[11px] font-sans">
                {isNaN(Date.parse(proof.timestamp)) ? proof.timestamp : new Date(proof.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-300">
              <div className="space-y-1 bg-[#0e100f] p-3.5 rounded-xl border border-stone-850 font-mono">
                <span className="text-stone-400 text-[10px] block font-sans font-medium">TRANSACTION HASH</span>
                <div className="flex items-center justify-between">
                  <span className="text-lime-400 truncate max-w-[280px]">
                    {proof.txHash}
                  </span>
                  <button
                    onClick={() => handleCopy(proof.id + '-tx', proof.txHash)}
                    className="p-1.5 rounded-full text-stone-400 hover:text-white"
                  >
                    {copiedId === proof.id + '-tx' ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 bg-[#0e100f] p-3.5 rounded-xl border border-stone-850 font-mono">
                <span className="text-stone-400 text-[10px] block font-sans font-medium">MERKLE ROOT HASH</span>
                <div className="flex items-center justify-between">
                  <span className="text-stone-300 truncate max-w-[280px]">
                    {proof.merkleRoot}
                  </span>
                  <button
                    onClick={() => handleCopy(proof.id + '-merkle', proof.merkleRoot)}
                    className="p-1.5 rounded-full text-stone-400 hover:text-white"
                  >
                    {copiedId === proof.id + '-merkle' ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-stone-800 text-[11px] text-stone-400 gap-2 font-sans">
              <div className="flex items-center space-x-4">
                <span>Block <span className="font-mono text-stone-300">#{proof.blockNumber}</span></span>
                <span>Gas: <span className="font-mono text-stone-300">{proof.gasUsed}</span></span>
                <span>Validator: <span className="font-mono text-stone-300">{proof.validator}</span></span>
              </div>

              <a
                href={`https://polygonscan.com/tx/${proof.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime-400 hover:underline flex items-center gap-1 font-sans"
              >
                <span>View on PolygonScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};