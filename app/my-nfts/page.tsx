"use client";

import { useEffect, useState, useCallback } from "react";
import { useWeb3 } from "@/components/providers/web3-provider";
import { useNFT } from "@/hooks/useNFT";
import { NFT } from "@/types/nft";
import { NFTList } from "@/components/nft/nft-list";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/components/providers/locale-provider";

export default function MyNFTs() {
  const { isConnected, connect, account } = useWeb3();
  const { loadNFTs, isLoading, listNFT, unlistNFT } = useNFT();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { t } = useLocale();
  
  console.log("MyNFTs page - isConnected:", isConnected, "account:", account);

  // Load from localStorage on mount or when account changes
  useEffect(() => {
    if (typeof window !== "undefined" && account) {
      const storageKey = `closeland_my_nfts_${account.toLowerCase()}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNfts(parsed);
          setLoadingState("success");
        } catch (e) {
          console.error("Error loading cached NFTs:", e);
        }
      }
    }
  }, [account]);

  // Save to localStorage whenever NFTs change for this account
  useEffect(() => {
    if (typeof window !== "undefined" && account && nfts.length >= 0) {
      const storageKey = `closeland_my_nfts_${account.toLowerCase()}`;
      localStorage.setItem(storageKey, JSON.stringify(nfts));
    }
  }, [nfts, account]);

  const fetchNFTs = useCallback(async (forceRefresh = false) => {
    if (!isConnected) return;
    
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        // Only show loading if we don't have cached data
        if (nfts.length === 0) {
          setLoadingState("loading");
        }
      }
      
      setError(null);
      console.log("Fetching NFTs...");
      
      const items = await loadNFTs(forceRefresh);
      setNfts(items);
      
      console.log(`Fetched ${items.length} NFTs`);
      setLoadingState("success");
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setLoadingState("error");
      setError(err instanceof Error ? err.message : "Failed to load NFTs");
    } finally {
      setIsRefreshing(false);
    }
  }, [isConnected, loadNFTs, nfts.length]);

  useEffect(() => {
    if (isConnected) {
      console.log("Fetching NFTs - user is connected");
      fetchNFTs();
    } else {
      console.log("User not connected, clearing NFTs");
      setNfts([]);
      setLoadingState("idle");
    }
  }, [isConnected, fetchNFTs]);

  const handleList = async (tokenId: string, price: string) => {
    try {
      await listNFT(tokenId, price);
      // Just update the NFT status locally without full refresh
      setNfts(prev => prev.map(nft => 
        nft.tokenId === tokenId 
          ? { ...nft, isListed: true, price } 
          : nft
      ));
    } catch (err) {
      console.error("Error listing NFT:", err);
      setError(err instanceof Error ? err.message : "Failed to list NFT");
    }
  };

  const handleUnlist = async (tokenId: string) => {
    try {
      await unlistNFT(tokenId);
      // Just update the NFT status locally without full refresh
      setNfts(prev => prev.map(nft => 
        nft.tokenId === tokenId 
          ? { ...nft, isListed: false } 
          : nft
      ));
    } catch (err) {
      console.error("Error unlisting NFT:", err);
      setError(err instanceof Error ? err.message : "Failed to unlist NFT");
    }
  };

  return (
    <MainLayout>
      {!isConnected ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("my_nfts_title")}
          </h2>
          <p className="text-gray-500 mb-8">
            Connect your wallet to view your NFTs
          </p>
          <Button onClick={connect}>{t("connect_wallet")}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">{t("my_nfts_title")}</h2>
            <Button 
              onClick={() => fetchNFTs(true)} 
              disabled={isRefreshing || loadingState === "loading"}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t("loading") : t("refresh")}
            </Button>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loadingState === "success" && nfts.length === 0 && (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No NFTs Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                You don't own any NFTs yet. Visit the marketplace to buy some NFTs or create your own.
              </p>
            </div>
          )}

          {loadingState === "loading" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-xl overflow-hidden">
                  <Skeleton className="w-full h-64" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NFTList
              nfts={nfts}
              isLoading={isLoading}
              onList={handleList}
              onUnlist={handleUnlist}
            />
          )}
        </div>
      )}
    </MainLayout>
  );
} 