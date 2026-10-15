import React from 'react';
import { MainBalanceChart } from './MainBalanceChart';
import { ThreatSurfaceMapWidget } from './ThreatSurfaceMapWidget';
import { PolygonTrustAnchorCard } from './PolygonTrustAnchorCard';
import { MonthlyBarChart } from './MonthlyBarChart';
import { RecentTransactionsList } from './RecentTransactionsList';
import { PromoCard } from './PromoCard';

interface DashboardOverviewProps {
  onScanRepo: () => void;
  onVerifyHash: () => void;
  onCtaClick: () => void;
  onSelectItem: (name: string) => void;
  onOpenVR?: () => void;
  currentRepo?: string;
  scanTxHash?: string | null;
  stats?: {
    criticalCount: number;
    warningCount: number;
    safeCount: number;
    totalPackages: number;
  };
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onScanRepo,
  onVerifyHash,
  onCtaClick,
  onSelectItem,
  onOpenVR,
  currentRepo = 'facebook/react',
  scanTxHash,
  stats,
}) => {
  const criticalCount = stats?.criticalCount ?? 0;
  const warningCount = stats?.warningCount ?? 0;
  const safeCount = stats?.safeCount ?? 0;
  const totalPackages = stats?.totalPackages ?? 0;

  return (
    <div className="space-y-6 sm:space-y-7 max-w-[1600px] mx-auto pb-6">
      
      {/* 1. TOP ROW EXPANSION: Codebase Security Index (Left) & Threat Surface Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-stretch">
        {/* Left: Codebase Security Index Curve Chart (7-8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-[390px]">
          <MainBalanceChart 
            criticalCount={criticalCount}
            warningCount={warningCount}
            safeCount={safeCount}
            totalPackages={totalPackages}
          />
        </div>

        {/* Right: Interactive 3D/Glass Network Node Preview Widget (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 min-h-[390px]">
          <ThreatSurfaceMapWidget
            onOpenSurfaceMap={onOpenVR}
            onSelectNode={onSelectItem}
          />
        </div>
      </div>

      {/* 2. MIDDLE ROW INTEGRATION: 3-Column Bento Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
        {/* Left Card: Polygon Trust Anchor with structural node block */}
        <div className="min-h-[350px]">
          <PolygonTrustAnchorCard
            currentRepo={currentRepo}
            onVerifyProof={onVerifyHash}
            onScanRepo={onScanRepo}
            scanTxHash={scanTxHash}
            stats={stats}
          />
        </div>

        {/* Center Card: Monthly Threat Mitigations Bar Chart */}
        <div className="min-h-[350px]">
          <MonthlyBarChart />
        </div>

        {/* Right Card: Recent Scans & Audit Events Activity Stream */}
        <div className="min-h-[350px]">
          <RecentTransactionsList onSelectItem={onSelectItem} />
        </div>
      </div>

      {/* 3. BOTTOM ROW INTEGRATION: Sentinel AI Shield Banner (Full Width) */}
      <div className="w-full">
        <PromoCard onCtaClick={onCtaClick} />
      </div>

    </div>
  );
};