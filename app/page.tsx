"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NFTList } from "@/components/nft/nft-list";
import { useNFT } from "@/hooks/useNFT";
import { useWeb3 } from "@/components/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { NFT } from "@/types/nft";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/providers/locale-provider";

export default function Home() {
  const { connect, isConnected } = useWeb3();
  const { loadMarketplaceItems, buyNFT, loadMarketHistory, isLoading } = useNFT();
  const { account } = useWeb3();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [history, setHistory] = useState([]);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "price-asc" | "price-desc">("recent");
  const { t } = useLocale();

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("closeland_marketplace_nfts");
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
  }, []);

  // Save to localStorage whenever NFTs change
  useEffect(() => {
    if (typeof window !== "undefined" && nfts.length > 0) {
      localStorage.setItem("closeland_marketplace_nfts", JSON.stringify(nfts));
    }
  }, [nfts]);

  useEffect(() => {
    if (isConnected) {
      loadNFTs();
      loadHistory();
    } else {
      setNfts([]);
      setHistory([]);
      setLoadingState("idle");
    }
  }, [isConnected]);

  const loadNFTs = useCallback(async (forceRefresh = false) => {
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
      console.log("Loading marketplace NFTs...");
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<NFT[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Loading marketplace items timed out. Please try again."));
        }, 15000); // 15 seconds timeout
      });
      
      // Race the loadMarketplaceItems against the timeout
      const items = await Promise.race([
        loadMarketplaceItems(),
        timeoutPromise
      ]);
      
      setNfts(items);
      
      console.log(`Loaded ${items.length} marketplace NFTs`);
      setLoadingState("success");
    } catch (err) {
      console.error("Error loading marketplace NFTs:", err);
      setLoadingState("error");
      
      // Better error messages for users
      const errorMessage = err instanceof Error 
        ? err.message
        : "Failed to load marketplace NFTs";
        
      // Check for specific error messages
      if (errorMessage.includes('BAD_DATA') && errorMessage.includes('fetchAvailableMarketItems')) {
        setError("No marketplace items available. The marketplace might be empty.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMarketplaceItems, nfts.length]);

  const loadHistory = useCallback(async () => {
    try {
      const events = await loadMarketHistory();
      setHistory(events);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  }, [loadMarketHistory]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    let list = nfts.filter((n) => {
      const matchesSearch =
        n.name?.toLowerCase().includes(term) ||
        n.description?.toLowerCase().includes(term) ||
        n.category?.toLowerCase().includes(term);
      const matchesCategory = category === "all" || (n.category ?? "").toLowerCase() === category;
      return matchesSearch && matchesCategory;
    });

    if (sort === "price-asc") {
      list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    }
    return list;
  }, [nfts, search, category, sort]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    nfts.forEach((n) => n.category && set.add(n.category.toLowerCase()));
    return Array.from(set);
  }, [nfts]);

  const handleBuy = async (tokenId: string, price: string) => {
    try {
      await buyNFT(tokenId, price);
      // Just update the NFT status locally to remove it from the list
      setNfts(prev => prev.filter(nft => nft.tokenId !== tokenId));
    } catch (err) {
      console.error("Error buying NFT:", err);
      setError(err instanceof Error ? err.message : "Failed to buy NFT");
    }
  };

  return (
    <MainLayout>
      {!isConnected ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("available_nfts")}
          </h2>
          <p className="text-gray-500 mb-8">
            Connect your wallet to start buying and selling NFTs
          </p>
          <Button onClick={connect}>{t("connect_wallet")}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-2xl font-bold">{t("available_nfts")}</h2>
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder={t("search_placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={t("category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("category_all")}</SelectItem>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{t("sort_recent")}</SelectItem>
                    <SelectItem value="price-asc">{t("sort_price_asc")}</SelectItem>
                    <SelectItem value="price-desc">{t("sort_price_desc")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => loadNFTs(true)} 
                  disabled={isRefreshing || loadingState === "loading"}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? t("loading") : t("refresh")}
                </Button>
              </div>
            </div>
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
              <h3 className="text-lg font-medium text-gray-700 mb-2">{t("no_nfts")}</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are no NFTs available for sale at the moment. Create and list your own NFTs to get started.
              </p>
            </div>
          )}

          <NFTList
            nfts={filtered}
            isLoading={loadingState === "loading" || isLoading}
            onBuy={handleBuy}
          />

        </div>
      )}
    </MainLayout>
  );
}
