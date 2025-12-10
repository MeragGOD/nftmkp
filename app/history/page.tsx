"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNFT } from "@/hooks/useNFT";
import { useWeb3 } from "@/components/providers/web3-provider";
import { useEffect, useState } from "react";
import { RefreshCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export default function HistoryPage() {
  const { isConnected, connect } = useWeb3();
  const { loadMarketHistory, isLoading } = useNFT();
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useLocale();

  const load = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const events = await loadMarketHistory();
      setHistory(events);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      load();
    } else {
      setHistory([]);
    }
  }, [isConnected]);

  return (
    <MainLayout>
      {!isConnected ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-3">{t("history_title")}</h2>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view marketplace events.
          </p>
          <Button onClick={connect}>{t("connect_wallet")}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t("history_title")}</h2>
              <p className="text-sm text-muted-foreground">Listed, Sold, and Canceled events</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={load}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Reload
            </Button>
          </div>

          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {history.length === 0 ? (
            <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
              <Info className="mx-auto h-6 w-6 mb-3" />
              No events yet.
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {history.map((h) => (
                <div key={h.txHash + h.blockNumber} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "text-xs font-semibold rounded-full px-2 py-1",
                      h.type === "LISTED" && "bg-blue-500/10 text-blue-500",
                      h.type === "SOLD" && "bg-green-500/10 text-green-500",
                      h.type === "CANCELED" && "bg-amber-500/10 text-amber-500"
                    )}
                  >
                    {h.type}
                  </span>
                  <div className="text-sm">Token #{h.tokenId}</div>
                  <div className="text-sm text-muted-foreground">Item #{h.marketItemId}</div>
                  <div className="text-sm font-medium">{h.price} ETH</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[240px]">Tx: {h.txHash}</div>
                  {h.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.timestamp * 1000).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}

