import { useState, useCallback, useEffect } from "react";
import { useWeb3 } from "@/components/providers/web3-provider";
import { useToast } from "@/components/ui/use-toast";
import { ethers } from "ethers";
import { NFT } from "@/types/nft";

// Cache structure for NFTs with expiration time
interface NFTCache {
  nfts: NFT[];
  timestamp: number;
  account: string;
}

// Global cache to be shared across hook instances
let nftCache: NFTCache | null = null;
const CACHE_EXPIRY_MS = 30000; // 30 seconds cache expiry

export function useNFT() {
  const { marketplaceContract, nftContract, isConnected, signer, account } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Clear cache when account changes
  useEffect(() => {
    if (account && nftCache && nftCache.account !== account) {
      nftCache = null;
    }
  }, [account]);

  const loadMarketplaceItems = async (): Promise<NFT[]> => {
    if (!marketplaceContract || !nftContract) return [];

    try {
      setIsLoading(true);
      console.log("Loading available items from marketplace...");
      
      // Get all available items from the marketplace
      let items;
      try {
        items = await marketplaceContract.fetchAvailableMarketItems();
        console.log("Available marketplace items:", items);
      } catch (error) {
        console.error("Error calling fetchAvailableMarketItems:", error);
        // Handle case where no items are available
        return [];
      }
      
      // If no items returned or empty array
      if (!items || items.length === 0) {
        console.log("No marketplace items available");
        return [];
      }
      
      // Create a map of token URIs to reduce duplicate fetch calls
      const tokenURIPromises: Record<string, Promise<string>> = {};
      
      // Process all items in parallel and generate token URI promises
      for (const item of items) {
        if (!tokenURIPromises[item.tokenId.toString()]) {
          tokenURIPromises[item.tokenId.toString()] = nftContract.tokenURI(item.tokenId);
        }
      }
      
      // Resolve all token URI promises in parallel
      const tokenURIs: Record<string, string> = {};
      const tokenIdEntries = Object.entries(tokenURIPromises);
      const resolvedURIs = await Promise.all(tokenIdEntries.map(([_, promise]) => promise));
      
      tokenIdEntries.forEach(([tokenId], index) => {
        tokenURIs[tokenId] = resolvedURIs[index];
      });
      
      console.log("Fetched token URIs for all items");
      
      // Batch fetch metadata for all tokens
      const metadataPromises = Object.entries(tokenURIs).map(
        ([tokenId, uri]) => fetch(uri).then(res => res.json())
      );
      
      const metadataResults = await Promise.all(metadataPromises);
      const metadataByTokenId: Record<string, any> = {};
      
      Object.keys(tokenURIs).forEach((tokenId, index) => {
        metadataByTokenId[tokenId] = metadataResults[index];
      });
      
      console.log("Fetched metadata for all tokens");
      
      // Map the results to NFT objects
      const nfts: NFT[] = items.map((item: any) => {
        try {
          const tokenId = item.tokenId.toString();
          const metadata = metadataByTokenId[tokenId];
          
          if (!metadata) {
            console.warn(`No metadata found for token ${tokenId}`);
            return null;
          }
          
          return {
            tokenId: tokenId,
            price: ethers.formatEther(item.price),
            seller: item.seller,
            owner: item.owner,
            image: metadata.image,
            name: metadata.name,
            description: metadata.description,
            isListed: !item.sold && !item.canceled
          };
        } catch (err) {
          console.error(`Error processing marketplace item ${item.tokenId}:`, err);
          return null;
        }
      });

      // Filter out any null items
      const validNfts = nfts.filter(nft => nft !== null);
      console.log("Processed marketplace NFTs:", validNfts);
      
      return validNfts;
    } catch (error) {
      console.error("Error loading marketplace items:", error);
      toast({
        title: "Error",
        description: "Failed to load marketplace items",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadNFTs = useCallback(async (forceRefresh = false): Promise<NFT[]> => {
    if (!marketplaceContract || !nftContract || !account) return [];

    // Check if we have a valid cache
    const now = Date.now();
    if (
      !forceRefresh && 
      nftCache && 
      nftCache.account === account && 
      nftCache.timestamp + CACHE_EXPIRY_MS > now
    ) {
      console.log("Using cached NFTs data");
      return nftCache.nfts;
    }

    try {
      setIsLoading(true);
      console.log("Loading owned NFTs for account:", account);
      
      // Get tokens owned directly from NFT contract - more efficient than checking marketplace
      const ownedTokenIds = await nftContract.getTokensOwnedByMe();
      console.log("Tokens owned directly:", ownedTokenIds);
      
      if (ownedTokenIds.length === 0) {
        console.log("No tokens owned");
        nftCache = {
          nfts: [],
          timestamp: now,
          account
        };
        return [];
      }
      
      // Batch fetch all token URIs at once
      const tokenURIPromises = ownedTokenIds.map((tokenId: any) => 
        nftContract.tokenURI(tokenId)
      );
      
      const tokenURIs = await Promise.all(tokenURIPromises);
      console.log("Fetched all token URIs");
      
      // Batch all metadata requests with improved error handling
      const metadataPromises = tokenURIs.map((uri, index) => {
        // Check if URI is valid before fetching
        if (!uri || typeof uri !== 'string') {
          console.warn("Invalid token URI:", uri);
          return Promise.resolve({ 
            name: `NFT #${ownedTokenIds[index].toString()}`, 
            description: 'Metadata unavailable', 
            image: '/placeholder-nft.svg' 
          });
        }
        
        // Handle IPFS URIs correctly
        let fetchUri = uri;
        if (uri.startsWith('ipfs://')) {
          fetchUri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        
        // Try multiple IPFS gateways if one fails
        const tryFetch = async (uri: string, retries = 0): Promise<any> => {
          const gateways = [
            '', // original URL
            'https://ipfs.io/ipfs/', 
            'https://gateway.pinata.cloud/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/'
          ];
          
          // If we've tried all gateways, return default
          if (retries >= gateways.length) {
            console.warn(`Failed to fetch metadata after trying all gateways: ${uri}`);
            return { 
              name: `NFT #${ownedTokenIds[index].toString()}`, 
              description: 'Metadata unavailable', 
              image: '/placeholder-nft.svg' 
            };
          }
          
          let currentUri = uri;
          // If we're retrying with a different gateway and it's an IPFS hash
          if (retries > 0 && uri.includes('/ipfs/')) {
            const ipfsHash = uri.split('/ipfs/').pop();
            currentUri = ipfsHash ? `${gateways[retries]}${ipfsHash}` : uri;
          }
          
          try {
            const res = await fetch(currentUri, { method: 'GET' });
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return await res.json();
          } catch (error) {
            console.warn(`Gateway ${retries} failed for ${currentUri}:`, error);
            return tryFetch(uri, retries + 1);
          }
        };
        
        return tryFetch(fetchUri)
          .catch(error => {
            console.error(`Final error fetching metadata for token ${ownedTokenIds[index]}:`, error);
            return { 
              name: `NFT #${ownedTokenIds[index].toString()}`, 
              description: 'Metadata unavailable', 
              image: '/placeholder-nft.svg' 
            };
          });
      });
      
      const metadataResults = await Promise.all(metadataPromises);
      console.log("Fetched all metadata");
      
      // Get marketplace status for all tokens in a single batch if possible
      // Implementers should consider modifying the contract to support batch operations
      // but for now we'll optimize with a Promise.all
      const marketStatusPromises = ownedTokenIds.map((tokenId: any) => 
        marketplaceContract.getLatestMarketItemByTokenId(tokenId)
          .catch(() => [{ price: ethers.parseEther("0"), sold: true, canceled: true }, false])
      );
      
      const marketStatuses = await Promise.all(marketStatusPromises);
      console.log("Fetched all market statuses");
      
      // Create NFT objects from the collected data
      const nfts: NFT[] = ownedTokenIds.map((tokenId: any, index: number) => {
        const metadata = metadataResults[index];
        const [listing, exists] = marketStatuses[index];
        
        const isListed = exists && !listing.sold && !listing.canceled;
        const price = exists ? ethers.formatEther(listing.price) : "0";
        
        return {
          tokenId: tokenId.toString(),
          price,
          seller: isListed ? listing.seller : account,
          owner: account,
          image: metadata.image,
          name: metadata.name,
          description: metadata.description,
          isListed
        };
      });
      
      console.log("Processed all owned NFTs:", nfts);
      
      // Update cache
      nftCache = {
        nfts,
        timestamp: now,
        account
      };
      
      return nfts;
    } catch (error) {
      console.error("Error loading NFTs:", error);
      toast({
        title: "Error",
        description: "Failed to load NFTs",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [marketplaceContract, nftContract, account, toast]);

  const createNFT = async (file: File, name: string, description: string) => {
    if (!nftContract || !marketplaceContract) {
      console.error("Contracts not initialized:", { nftContract: !!nftContract, marketplaceContract: !!marketplaceContract });
      throw new Error("Blockchain contracts not initialized. Please ensure your wallet is connected.");
    }

    if (!signer) {
      console.error("Signer not available");
      throw new Error("No signer available. Please reconnect your wallet.");
    }

    try {
      setIsLoading(true);
      console.log("Web3 account:", account);
      console.log("NFT contract address:", await nftContract.getAddress());

      // Upload to IPFS
      console.log("Preparing to upload file:", file.name, file.type, file.size);
      const formData = new FormData();
      formData.append("file", file);

      // Upload file to IPFS
      console.log("Uploading file to IPFS...");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("File upload response status:", response.status);
      console.log("File upload response headers:", Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log("File upload response body:", responseText);

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.status} ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("JSON parse error:", e);
        throw new Error(`Invalid response format: ${responseText}`);
      }
      
      const uploadUrl = data.url;
      if (!uploadUrl) {
        console.error("No URL in response data:", data);
        throw new Error("No URL returned from upload");
      }
      
      const imageUrl = uploadUrl.startsWith('http') ? uploadUrl : `${window.location.origin}${uploadUrl}`;
      console.log("File uploaded:", imageUrl);

      // Create metadata
      const metadata = {
        name,
        description,
        image: imageUrl,
      };

      console.log("Uploading metadata:", metadata);
      const metadataResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });

      console.log("Metadata upload response status:", metadataResponse.status);
      console.log("Metadata upload response headers:", Object.fromEntries(metadataResponse.headers.entries()));
      
      const metadataResponseText = await metadataResponse.text();
      console.log("Metadata upload response body:", metadataResponseText);

      if (!metadataResponse.ok) {
        throw new Error(`Failed to upload metadata: ${metadataResponse.status} ${metadataResponseText}`);
      }

      let metadataData;
      try {
        metadataData = JSON.parse(metadataResponseText);
      } catch (e) {
        console.error("Metadata JSON parse error:", e);
        throw new Error(`Invalid metadata response format: ${metadataResponseText}`);
      }
      
      const metadataUrl = metadataData.url;
      if (!metadataUrl) {
        console.error("No URL in metadata response data:", metadataData);
        throw new Error("No URL returned from metadata upload");
      }
      
      const metadataURI = metadataUrl.startsWith('http') ? metadataUrl : `${window.location.origin}${metadataUrl}`;
      console.log("Metadata uploaded:", metadataURI);

      // Mint NFT using the contract
      console.log("Minting NFT with URI:", metadataURI);
      console.log("Contract details:", {
        address: await nftContract.getAddress(),
        signer: await signer.getAddress(),
      });

      console.log("Calling mintToken with metadataURI length", metadataURI.length);
      // Provide an explicit gasLimit to avoid RPC gas estimation failures in some local nodes
      const tx = await nftContract.mintToken(metadataURI, { gasLimit: 500000 });
      console.log("Minting transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      console.log("NFT minted successfully!");

      toast({
        title: "Success",
        description: "NFT created successfully",
      });
      
      return true;
    } catch (error: any) {
      console.error("Error creating NFT:", error);
      
      // Check if the error is a timeout
      if (error.message && error.message.includes("timed out")) {
        // Handle timeout - it might still complete
        setIsLoading(false);
        toast({
          title: "Transaction Pending",
          description: error.message,
          variant: "default",
        });
        
        // End the loading state but return success
        // The user can check their wallet for completion
        return true;
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create NFT",
        variant: "destructive",
      });
      throw error; // Re-throw to handle in the UI
    } finally {
      setIsLoading(false);
    }
  };

  const listNFT = async (tokenId: string, price: string) => {
    if (!marketplaceContract || !nftContract) return;

    try {
      setIsLoading(true);
      console.log(`Listing NFT #${tokenId} for price ${price} ETH`);

      // First approve the marketplace to transfer the NFT
      const approveTx = await nftContract.approve(
        await marketplaceContract.getAddress(),
        tokenId
      );
      console.log("Approve transaction sent:", approveTx.hash);
      await approveTx.wait();
      
      // Get the listing fee
      const listingFee = await marketplaceContract.getListingFee();
      console.log("Listing fee:", ethers.formatEther(listingFee), "ETH");

      // Ensure price is properly formatted (no trailing zeros that cause BigInt conversion issues)
      const cleanPrice = parseFloat(price).toString();
      console.log("Parsed price for blockchain:", cleanPrice);

      // List the item on the marketplace
      const createTx = await marketplaceContract.createMarketItem(
        await nftContract.getAddress(),
        tokenId,
        ethers.parseEther(cleanPrice),
        { value: listingFee }
      );
      
      console.log("Create market item transaction sent:", createTx.hash);
      await createTx.wait();
      console.log("NFT listed successfully!");

      toast({
        title: "Success",
        description: "NFT listed successfully",
      });
    } catch (error: any) {
      console.error("Error listing NFT:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to list NFT",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const buyNFT = async (tokenId: string, price: string) => {
    if (!marketplaceContract || !nftContract) return;

    try {
      setIsLoading(true);
      console.log(`Buying NFT #${tokenId} for ${price} ETH`);
      
      // First, we need to get the market item ID
      const [listing, exists] = await marketplaceContract.getLatestMarketItemByTokenId(tokenId);
      
      if (!exists) {
        throw new Error("NFT is not listed for sale");
      }
      
      // Ensure price is properly formatted (no trailing zeros that cause BigInt conversion issues)
      const cleanPrice = parseFloat(price).toString();
      console.log("Parsed price for purchase:", cleanPrice);
      
      // Buy the NFT
      const tx = await marketplaceContract.createMarketSale(
        await nftContract.getAddress(),
        listing.marketItemId,
        { value: ethers.parseEther(cleanPrice) }
      );
      
      console.log("Buy transaction sent:", tx.hash);
      await tx.wait();
      console.log("NFT purchased successfully!");

      toast({
        title: "Success",
        description: "NFT purchased successfully",
      });
    } catch (error: any) {
      console.error("Error buying NFT:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to buy NFT",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unlistNFT = async (tokenId: string) => {
    if (!marketplaceContract || !nftContract) return;

    try {
      setIsLoading(true);
      console.log(`Unlisting NFT #${tokenId}`);
      
      // First, get the market item ID
      const [listing, exists] = await marketplaceContract.getLatestMarketItemByTokenId(tokenId);
      
      if (!exists) {
        throw new Error("NFT is not listed");
      }
      
      // Cancel the market item
      const tx = await marketplaceContract.cancelMarketItem(
        await nftContract.getAddress(),
        listing.marketItemId
      );
      
      console.log("Cancel listing transaction sent:", tx.hash);
      await tx.wait();
      console.log("NFT unlisted successfully!");

      toast({
        title: "Success",
        description: "NFT unlisted successfully",
      });
    } catch (error: any) {
      console.error("Error unlisting NFT:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlist NFT",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    loadMarketplaceItems,
    loadNFTs,
    createNFT,
    listNFT,
    buyNFT,
    unlistNFT,
  };
} 