import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { FeaturesSection } from './components/FeaturesSection';
import { DashboardHeader } from './components/DashboardHeader';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { DependencyGraph } from './components/DependencyGraph';
import { AnalyticsChart } from './components/AnalyticsChart';
import { VulnerabilityLogsView } from './components/VulnerabilityLogsView';
import { SettingsModal } from './components/SettingsModal';
import { ThreatDrawer } from './components/ThreatDrawer';
import { ScanningModal } from './components/ScanningModal';
import { CommandPalette } from './components/CommandPalette';
import { InfoModals } from './components/InfoModals';
import { AuroraBackground } from './components/AuroraBackground';
import { SandboxCapsuleView } from './components/SandboxCapsuleView';
import { 
  initialNodes, 
  initialEdges, 
  mockActivityLogs, 
  mockNotifications 
} from './data/mockData';
import { DependencyNode, ActiveTab, ScanHistoryEntry } from './types';
import { Shield, AlertCircle, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { GithubIcon, formatGithubUrl } from './components/GithubIcon';
import logoImg from './assets/logo.png';
import { scanRepository, transformBackendResponse, saveScanToHistory, getLocalScanHistory } from './services/api';

export const App: React.FC = () => {
  // Page mode: 'landing' or 'dashboard'
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard'>('landing');

  // Dashboard active tab - isolated to 'sandbox' per Dev 4 directives
  const [activeTab, setActiveTab] = useState<ActiveTab>('sandbox');

  // Data states
  const [nodes, setNodes] = useState<DependencyNode[]>(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [currentRepo, setCurrentRepo] = useState('psf/requests');
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [scanTxHash, setScanTxHash] = useState<string | null>(null);

  // Modals
  const [scanningRepo, setScanningRepo] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [infoModalType, setInfoModalType] = useState<'pricing' | 'ecosystem' | 'docs' | null>(null);

  // History (client-side)
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    setScanHistory(getLocalScanHistory());
  }, []);

  // Keyboard shortcut listener for Command + Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actual API scan execution
  const executeScan = useCallback(async (repoUrl: string) => {
    setScanLoading(true);
    setScanError(null);
    
    try {
      const backendResponse = await scanRepository(repoUrl);
      const { nodes: newNodes, edges: newEdges, scanTxHash: txHash } = transformBackendResponse(backendResponse);
      
      setNodes(newNodes);
      setEdges(newEdges);
      setScanTxHash(txHash);
      
      const cleanName = repoUrl.replace('https://github.com/', '').replace('.git', '');
      setCurrentRepo(cleanName || 'psf/requests');
      
      // Save to local history
      const criticalCount = newNodes.filter(n => n.status === 'critical').length;
      const warningCount = newNodes.filter(n => n.status === 'warning').length;
      const safeCount = newNodes.filter(n => n.status === 'safe').length;
      const overallRiskScore = newNodes.length > 0 
        ? Math.round(newNodes.reduce((sum, n) => sum + n.riskScore, 0) / newNodes.length)
        : 0;
      
      const historyEntry = saveScanToHistory({
        repoUrl,
        repoName: cleanName || 'unknown',
        timestamp: new Date().toISOString(),
        transactionHash: txHash,
        totalPackages: newNodes.length,
        criticalCount,
        warningCount,
        safeCount,
        overallRiskScore,
      });
      
      setScanHistory(prev => [historyEntry, ...prev].slice(0, 50));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during scan';
      setScanError(errorMessage);
      console.error('Scan failed:', err);
    } finally {
      setScanLoading(false);
    }
  }, []);

  // Initiate scan from input or chips
  const handleStartScan = useCallback((repoUrl: string) => {
    setScanningRepo(repoUrl);
    executeScan(repoUrl);
  }, [executeScan]);

  // When scan modal completes, navigate to dashboard
  const handleScanComplete = useCallback(() => {
    setScanningRepo(null);
    setCurrentView('dashboard');
    setActiveTab('overview');
  }, []);

  // Cancel scan
  const handleScanCancel = useCallback(() => {
    setScanningRepo(null);
    setScanLoading(false);
    setScanError(null);
  }, []);

  // Node isolation action
  const handleIsolateNode = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, status: 'warning' as const, riskScore: 35 } : n))
    );
  }, []);

  // Node override action
  const handleOverrideNode = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, status: 'safe' as const, riskScore: 15 } : n))
    );
  }, []);

  // Trigger package detail from activity or card
  const handleSelectPackageByName = useCallback((name: string) => {
    const found = nodes.find((n) => 
      n.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(n.name.toLowerCase())
    );
    if (found) {
      setSelectedNode(found);
    } else if (nodes.length > 0) {
      setSelectedNode(nodes[1]); // Default to high-risk package
    }
    setCurrentView('dashboard');
  }, [nodes]);

  // Calculate stats for dashboard
  const criticalCount = nodes.filter(n => n.status === 'critical').length;
  const warningCount = nodes.filter(n => n.status === 'warning').length;
  const safeCount = nodes.filter(n => n.status === 'safe').length;
  const totalPackages = nodes.length;

  return (
    <div className="min-h-screen bg-[#0b0d0c] text-stone-100 flex flex-col font-sans selection:bg-lime-600/30 selection:text-lime-200 antialiased">
      
      {/* LANDING PAGE VIEW */}
      {currentView === 'landing' ? (
        <div className="flex-1 flex flex-col">
          {/* Top Navbar */}
          <Navbar
            onLaunchConsole={() => setCurrentView('dashboard')}
            onOpenDocs={() => setInfoModalType('docs')}
            onOpenPricing={() => setInfoModalType('pricing')}
            onOpenEcosystem={() => setInfoModalType('ecosystem')}
            isDashboard={false}
            currentRepo={currentRepo}
          />

          {/* Hero Section */}
          <main className="flex-1">
            <LandingHero 
              onStartScan={handleStartScan} 
              currentRepo={currentRepo}
              onRepoChange={setCurrentRepo}
            />
            <FeaturesSection onExploreFeature={() => {
              setCurrentView('dashboard');
              setActiveTab('sandbox');
            }} />
          </main>

          {/* Landing Footer */}
          <footer className="border-t border-stone-800/80 py-12 bg-[#0b0d0c]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-sans text-stone-400">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-[#121412] border border-stone-800 flex items-center justify-center">
                  <img src={logoImg} alt="ChainRoute Logo" className="w-5 h-5 object-contain" />
                </div>
                <div>
                  <span className="font-bold text-white tracking-wider">ChainRoute</span>
                  <span className="text-stone-500 block text-[10px]">
                    Autonomous Python 3.12/3.13 Dependency Resilience
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <button onClick={() => setInfoModalType('docs')} className="hover:text-lime-400 transition-colors">
                  Documentation
                </button>
                <button onClick={() => setInfoModalType('pricing')} className="hover:text-lime-400 transition-colors">
                  Pricing
                </button>
                <button onClick={() => setInfoModalType('ecosystem')} className="hover:text-lime-400 transition-colors">
                  Ecosystem
                </button>
                <a
                  href={formatGithubUrl(currentRepo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 hover:text-white transition-colors text-stone-400"
                  title={currentRepo ? `Open ${currentRepo} directly on GitHub` : 'Open GitHub'}
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 text-[11px] text-stone-400 font-sans">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121412] border border-stone-800 text-stone-300 font-mono text-[10px]">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Model: Gemma 4 • Google GenAI SDK v1.0+</span>
                  <a href="https://ai.google.dev/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Terms</a>
                </span>
                <span>Python 3.12/3.13 Sandbox • Two-Ledger Architecture</span>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        /* MAIN SECURITY CONTROL CENTER (DASHBOARD) */
        <div className="flex-1 flex min-h-screen relative overflow-hidden bg-[#0b0d0c]">
          {/* Ambient Cinematic Aurora Gradient Motion (Video + Fluid Mesh) */}
          <AuroraBackground opacity={0.75} />

          {/* Left Slim Vertical Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onBackToLanding={() => setCurrentView('landing')}
          />

          {/* Main Dashboard Column */}
          <div className="flex-1 flex flex-col min-w-0 relative z-10 ml-[72px] sm:ml-20">
            {/* Top Floating Glassmorphic Utility Header */}
            <DashboardHeader
              onOpenSearch={() => setShowCommandPalette(true)}
              onBackToLanding={() => setCurrentView('landing')}
              notifications={mockNotifications}
              currentRepo={currentRepo}
              onSelectRepo={(repo) => setCurrentRepo(repo)}
              onSelectPackage={handleSelectPackageByName}
              nodes={nodes}
            />

            {/* Main Content Area */}
            <main className="flex-1 p-5 sm:p-7 lg:p-8 overflow-y-auto bg-transparent min-h-[calc(100vh-5rem)]">
              {/* Deprecated views commented out per Hackathon Dev 4 isolation directives */}
              {/* Overview Tab: 3-Row Bento Box */}
              {/* {activeTab === 'overview' && (
                <DashboardOverview
                  onScanRepo={() => handleStartScan(`https://github.com/${currentRepo}`)}
                  onNavigateToSandbox={() => setActiveTab('sandbox')}
                  onCtaClick={() => setInfoModalType('pricing')}
                  onSelectItem={handleSelectPackageByName}
                  currentRepo={currentRepo}
                  scanTxHash={scanTxHash}
                  stats={{ criticalCount, warningCount, safeCount, totalPackages }}
                />
              )} */}

              {/* Sandbox & Exit Capsule Tab (Two Ledgers - PRIMARY ISOLATED VIEW) */}
              {activeTab === 'sandbox' && (
                <SandboxCapsuleView
                  currentRepo={currentRepo}
                />
              )}

              {/* Dependency Map Tab */}
              {/* {activeTab === 'graph' && (
                <div className="space-y-4 max-w-[1600px] mx-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h2 className="text-2xl font-sans font-bold text-stone-100">
                        Transitive Risk Matrix &amp; Cascade Grid
                      </h2>
                      <p className="text-xs text-stone-400 font-sans mt-0.5">
                        Tiered AST vulnerability breakdown and direct/transitive blast radius for{' '}
                        <a
                          href={`https://github.com/${currentRepo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-300 hover:text-emerald-400 inline-flex items-center gap-1 font-medium transition-colors"
                          title={`Open ${currentRepo} on GitHub`}
                        >
                          <span>{currentRepo}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </p>
                    </div>
                  </div>
                  <DependencyGraph
                    nodes={nodes}
                    edges={edges}
                    onSelectNode={(node) => setSelectedNode(node)}
                    selectedNodeId={selectedNode?.id}
                    isFullScreen={true}
                  />
                </div>
              )} */}

              {/* Threat Analytics Tab */}
              {/* {activeTab === 'analytics' && (
                <div className="space-y-6 max-w-[1600px] mx-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h2 className="text-2xl font-sans font-bold text-stone-100">
                        Threat Analytics &amp; Risk Metrics
                      </h2>
                      <p className="text-xs text-stone-400 font-sans mt-0.5">
                        Time-series anomaly progressions, dormant code spikes, and risk index
                      </p>
                    </div>
                  </div>
                  <AnalyticsChart history={scanHistory} />
                </div>
              )} */}

              {/* Vulnerability Logs Tab */}
              {/* {activeTab === 'vulnerabilities' && (
                <div className="max-w-[1600px] mx-auto">
                  <VulnerabilityLogsView
                    nodes={nodes}
                    onSelectNode={(node) => setSelectedNode(node)}
                  />
                </div>
              )} */}

              {/* Blockchain Proofs Tab - Deprecated per Hackathon Dev 4 isolation directives */}
              {/* {activeTab === 'blockchain' && (
                <div className="max-w-[1600px] mx-auto">
                  <BlockchainProofsView scanTxHash={scanTxHash} />
                </div>
              )} */}
              {/* Settings Tab */}
              {/* {activeTab === 'settings' && (
                <div className="max-w-[1600px] mx-auto">
                  <SettingsModal />
                </div>
              )} */}
            </main>
          </div>
        </div>
      )}

      {/* INTERACTIVE THREAT DRAWER */}
      <ThreatDrawer
        node={selectedNode}
        onClose={() => {
          setSelectedNode(null);
          setCurrentView('dashboard');
        }}
        onIsolate={handleIsolateNode}
        onOverride={handleOverrideNode}
      />

      {/* HUD SCANNING SIMULATION MODAL - Now with real API integration */}
      {scanningRepo && (
        <ScanningModal
          repoUrl={scanningRepo}
          onComplete={handleScanComplete}
          onCancel={handleScanCancel}
          isLoading={scanLoading}
          error={scanError}
        />
      )}

      {/* AUTONOMOUS SUPPLY CHAIN ATTACK SURFACE MODAL - DEPRECATED FOR DECOUPLING
      {showVRModal && (
        <VRARViewModal
          onClose={() => setShowVRModal(false)}
          onSelectNodeByName={(name) => {
            const found = nodes.find((n) => n.name === name);
            if (found) {
              setSelectedNode(found);
              setCurrentView('dashboard');
              setShowVRModal(false);
            }
          }}
        />
      )}
      */}
      {/* COMMAND PALETTE (⌘ + Space) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        nodes={nodes}
        onSelectNode={(node) => {
          setSelectedNode(node);
          setCurrentView('dashboard');
        }}
        onNavigateTab={(tab) => {
          setCurrentView('dashboard');
          setActiveTab(tab);
        }}
      />

      {/* INFO MODALS (Pricing, Ecosystem, Docs) */}
      <InfoModals
        type={infoModalType}
        onClose={() => setInfoModalType(null)}
      />

    </div>
  );
};

export default App;