import { useState, useCallback } from "react";
import { useContract } from "./use-contract";
import { useWeb3 } from "./use-web3";
import { NFT, NFTMetadata } from "@/types/nft";
import { useToast } from "@/components/ui/use-toast";

export function useNFT() {
  const { account } = useWeb3();
  const { nftContract, marketplaceContract } = useContract();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!nftContract || !marketplaceContract) return [];

    try {
      setIsLoading(true);
      const items: NFT[] = [];
      const itemCount = await nftContract.balanceOf(account);
      
      for (let i = 0; i < itemCount; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
        const tokenURI = await nftContract.tokenURI(tokenId);
        const metadata: NFTMetadata = await fetch(tokenURI).then(res => res.json());
        
        const item = {
          tokenId: tokenId.toString(),
          price: "0",
          seller: account,
          owner: account,
          image: metadata.image,
          name: metadata.name,
          description: metadata.description,
          isListed: false
        };
        
        items.push(item);
      }
      
      return items;
    } catch (error) {
      console.error("Error loading NFTs:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [nftContract, marketplaceContract, account]);

  const loadMarketplaceItems = useCallback(async (): Promise<NFT[]> => {
    if (!nftContract || !marketplaceContract) return [];

    try {
      setIsLoading(true);
      const items: NFT[] = [];
      const itemCount = await marketplaceContract.itemCount();
      
      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplaceContract.items(i);
        if (!item.isListed) continue;

        const tokenURI = await nftContract.tokenURI(item.tokenId);
        const metadata: NFTMetadata = await fetch(tokenURI).then(res => res.json());
        
        items.push({
          tokenId: item.tokenId.toString(),
          price: item.price.toString(),
          seller: item.seller,
          owner: item.owner,
          image: metadata.image,
          name: metadata.name,
          description: metadata.description,
          isListed: true
        });
      }
      
      return items;
    } catch (error) {
      console.error("Error loading marketplace items:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [nftContract, marketplaceContract]);

  const createNFT = useCallback(async (file: File, name: string, description: string) => {
    if (!nftContract) return;

    try {
      setIsLoading(true);
      // Upload file to local upload endpoint
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('File upload failed');
      }

      const uploadJson = await uploadRes.json();
      const imageUrl = uploadJson.url; // e.g. /uploads/123-filename.png

      // Prepare metadata and upload it as JSON to the same endpoint
      const metadata = { name, description, image: imageUrl };

      const metadataRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });

      if (!metadataRes.ok) {
        throw new Error('Metadata upload failed');
      }

      const metadataJson = await metadataRes.json();
      const metadataUrl = metadataJson.url; // e.g. /uploads/metadata-123.json

      // Use absolute URL for tokenURI so that tokenURI is accessible
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const tokenURI = origin ? `${origin}${metadataUrl}` : metadataUrl;

      // Mint NFT with tokenURI
      const tx = await nftContract.mint(tokenURI);
      if (tx.wait) await tx.wait();

      toast({
        title: "Success",
        description: "NFT created successfully!",
      });
    } catch (error) {
      console.error("Error creating NFT:", error);
      toast({
        title: "Error",
        description: "Failed to create NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [nftContract]);

  const buyNFT = useCallback(async (tokenId: string, price: string) => {
    if (!marketplaceContract) return;

    try {
      setIsLoading(true);
      const tx = await marketplaceContract.buyItem(tokenId, { value: price });
      await tx.wait();

      toast({
        title: "Success",
        description: "NFT purchased successfully!",
      });
    } catch (error) {
      console.error("Error buying NFT:", error);
      toast({
        title: "Error",
        description: "Failed to buy NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract]);

  const listNFT = useCallback(async (tokenId: string, price: string) => {
    if (!nftContract || !marketplaceContract) return;

    try {
      setIsLoading(true);
      const tx = await nftContract.approve(marketplaceContract.address, tokenId);
      await tx.wait();

      const listTx = await marketplaceContract.listItem(tokenId, price);
      await listTx.wait();

      toast({
        title: "Success",
        description: "NFT listed successfully!",
      });
    } catch (error) {
      console.error("Error listing NFT:", error);
      toast({
        title: "Error",
        description: "Failed to list NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [nftContract, marketplaceContract]);

  const unlistNFT = useCallback(async (tokenId: string) => {
    if (!marketplaceContract) return;

    try {
      setIsLoading(true);
      const tx = await marketplaceContract.unlistItem(tokenId);
      await tx.wait();

      toast({
        title: "Success",
        description: "NFT unlisted successfully!",
      });
    } catch (error) {
      console.error("Error unlisting NFT:", error);
      toast({
        title: "Error",
        description: "Failed to unlist NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract]);

  return {
    isLoading,
    loadNFTs,
    loadMarketplaceItems,
    createNFT,
    buyNFT,
    listNFT,
    unlistNFT,
  };
} 