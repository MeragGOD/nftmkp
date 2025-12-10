"use client";

import React, { useId, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWeb3 } from "@/components/providers/web3-provider";
import { ethers } from "ethers";
import Image from "next/image";

interface ExpandableNFTCardProps {
  nft: {
    tokenId: string;
    price: string;
    seller: string;
    owner: string;
    image: string;
    name: string;
    description: string;
    isListed: boolean;
    category?: string;
  };
  onBuy?: (tokenId: string, price: string) => Promise<void>;
  onList?: (tokenId: string, price: string) => Promise<void>;
  onUnlist?: (tokenId: string) => Promise<void>;
}

// Optimization: Cache shortened addresses
const addressCache: Record<string, string> = {};

export function ExpandableNFTCard({ nft, onBuy, onList, onUnlist }: ExpandableNFTCardProps) {
  const [active, setActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [price, setPrice] = useState(nft.price || "0");
  const [imageError, setImageError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const { account } = useWeb3();

  // Memoize values that depend on props to prevent unnecessary recalculations
  const isOwner = useMemo(() => 
    account?.toLowerCase() === nft.owner.toLowerCase(), 
    [account, nft.owner]
  );
  
  const isSeller = useMemo(() => 
    account?.toLowerCase() === nft.seller.toLowerCase(), 
    [account, nft.seller]
  );

  // Format price for display - memoized
  const displayPrice = useMemo(() => 
    nft.price ? parseFloat(nft.price).toString() : "0", 
    [nft.price]
  );

  // Reset price input when NFT price changes
  useEffect(() => {
    setPrice(nft.price || "0");
  }, [nft.price]);

  // Shorten address for display with caching
  const shortenAddress = useCallback((address: string) => {
    if (!address) return "";
    
    // Use cached value if available
    if (addressCache[address]) {
      return addressCache[address];
    }
    
    // Create and cache new shortened address
    const shortened = `${address.slice(0, 6)}...${address.slice(-4)}`;
    addressCache[address] = shortened;
    return shortened;
  }, []);

  // Memoize shortened addresses
  const ownerShortened = useMemo(() => 
    shortenAddress(nft.owner), 
    [nft.owner, shortenAddress]
  );
  
  const sellerShortened = useMemo(() => 
    shortenAddress(nft.seller), 
    [nft.seller, shortenAddress]
  );

  // Handle Escape key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && active) {
        setActive(false);
      }
    };

    if (active) {
      document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "auto"; // Restore scrolling when modal is closed
    }

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  // Handle outside clicks
  useOutsideClick(ref as React.RefObject<HTMLElement>, () => {
    if (active) setActive(false);
  });

  // Memoize handlers to prevent unnecessary re-renders
  const handleBuy = useCallback(async () => {
    if (!onBuy) return;
    try {
      setIsLoading(true);
      await onBuy(nft.tokenId, nft.price);
      setActive(false); // Close the card after buying
    } catch (error) {
      console.error("Error buying NFT:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onBuy, nft.tokenId, nft.price]);

  const handleList = useCallback(async () => {
    if (!onList) return;
    try {
      setIsLoading(true);
      // Make sure price is a valid number and remove trailing zeros
      // This prevents "1.0" format which causes BigNumber conversion errors
      const cleanPrice = parseFloat(price).toString();
      await onList(nft.tokenId, cleanPrice);
      setActive(false); // Close the card after listing
    } catch (error) {
      console.error("Error listing NFT:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onList, nft.tokenId, price]);

  const handleUnlist = useCallback(async () => {
    if (!onUnlist) return;
    try {
      setIsLoading(true);
      await onUnlist(nft.tokenId);
      setActive(false); // Close the card after unlisting
    } catch (error) {
      console.error("Error unlisting NFT:", error);
    } finally {
      setIsLoading(false);
    }
  }, [onUnlist, nft.tokenId]);

  // Handle price input change
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  }, []);

  // Handle card click to open
  const handleCardClick = useCallback(() => {
    setActive(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setActive(false);
  }, []);
  
  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Fallback image when the NFT image fails to load
  const fallbackImage = "/placeholder-nft.svg";

  // Determine image source with error handling
  const imageSrc = useMemo(() => 
    imageError ? fallbackImage : nft.image,
    [nft.image, imageError]
  );

  // Descriptive name with fallback
  const displayName = useMemo(() => 
    nft.name || `NFT #${nft.tokenId}`,
    [nft.name, nft.tokenId]
  );

  // Descriptive description with fallback
  const displayDescription = useMemo(() => 
    nft.description || "No description provided",
    [nft.description]
  );

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
            onClick={handleCloseModal}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`button-close-${nft.tokenId}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.05 },
              }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white dark:bg-neutral-800 rounded-full h-8 w-8 shadow-md"
              onClick={handleCloseModal}
            >
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${nft.tokenId}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-xl"
            >
              <motion.div layoutId={`image-${nft.tokenId}-${id}`} className="relative">
                <div className="w-full h-72 relative">
                  <Image
                    src={imageSrc}
                    alt={displayName}
                    fill
                    className="sm:rounded-tr-lg sm:rounded-tl-lg object-cover"
                    priority={active} // Only prioritize loading when card is open
                    onError={handleImageError}
                    sizes="(max-width: 500px) 100vw, 500px"
                  />
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="font-semibold bg-black/60 text-white">
                    #{nft.tokenId}
                  </Badge>
                </div>
              </motion.div>

              <div>
                <div className="flex justify-between items-start p-4">
                  <div>
                    <motion.h3
                      layoutId={`title-${nft.tokenId}-${id}`}
                      className="font-bold text-lg text-neutral-700 dark:text-neutral-200"
                    >
                      {displayName}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${nft.tokenId}-${id}`}
                      className="text-neutral-600 dark:text-neutral-400"
                    >
                      {displayDescription}
                    </motion.p>
                  </div>

                  {nft.isListed && (
                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary font-bold">
                      {displayPrice} ETH
                    </Badge>
                  )}
                </div>

                <div className="pt-2 px-4 pb-6">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-neutral-600 dark:text-neutral-400 flex flex-col items-start gap-4"
                  >
                    <Separator className="w-full" />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm w-full">
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-medium">
                          {nft.isListed ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 mt-1">Listed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 mt-1">Not Listed</Badge>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Category</p>
                        <p className="font-medium mt-1">{nft.category || "—"}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500">Token ID</p>
                        <p className="font-medium mt-1">#{nft.tokenId}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-500">Owner</p>
                        <p className="font-medium mt-1" title={nft.owner}>
                          {ownerShortened}
                        </p>
                      </div>
                      
                      {nft.seller && nft.seller !== ethers.ZeroAddress && (
                        <div>
                          <p className="text-gray-500">Seller</p>
                          <p className="font-medium mt-1" title={nft.seller}>
                            {sellerShortened}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="w-full mt-2">
                      {nft.isListed ? (
                        isOwner ? (
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleUnlist}
                            disabled={isLoading}
                          >
                            {isLoading ? "Unlisting..." : "Unlist"}
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={handleBuy}
                            disabled={isLoading}
                          >
                            {isLoading ? "Buying..." : "Buy"}
                          </Button>
                        )
                      ) : isOwner ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="number"
                            value={price}
                            onChange={handlePriceChange}
                            className="flex-1 px-3 py-2 border rounded-md"
                            placeholder="Price in ETH"
                            min="0"
                            step="0.01"
                          />
                          <Button
                            onClick={handleList}
                            disabled={isLoading}
                          >
                            {isLoading ? "Listing..." : "List"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <motion.div
        layoutId={`card-${nft.tokenId}-${id}`}
        onClick={handleCardClick}
        className="p-4 rounded-xl cursor-pointer border transition-colors duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        whileHover={{ scale: 1.005, borderColor: 'rgba(0, 0, 0, 0.2)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 md:items-center gap-3">
          <div className="flex items-center gap-3">
            <motion.div layoutId={`image-${nft.tokenId}-${id}`} className="relative">
              <div className="h-12 w-12 relative rounded-lg overflow-hidden">
                <Image
                  src={imageSrc}
                  alt={displayName}
                  fill
                  className="object-cover"
                  onError={handleImageError}
                  sizes="48px"
                  loading="lazy"
                />
              </div>
            </motion.div>
            <div>
              <motion.h3
                layoutId={`title-${nft.tokenId}-${id}`}
                className="font-medium text-neutral-800 dark:text-neutral-200"
              >
                {displayName}
              </motion.h3>
              <p className="text-xs text-neutral-500">#{nft.tokenId}</p>
            </div>
          </div>

          <div className="text-sm text-neutral-700 dark:text-neutral-200">{nft.category || "—"}</div>
          <div className="text-sm font-semibold">{displayPrice} ETH</div>
          <div className="text-sm text-neutral-600 truncate" title={nft.seller}>{sellerShortened}</div>
          <div className="text-sm text-neutral-600 truncate" title={nft.owner}>{ownerShortened}</div>
          <div className="flex justify-end">
            {nft.isListed ? (
              <Badge variant="outline" className="bg-primary/10 text-primary font-bold">
                Listed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                Not listed
              </Badge>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Memoize the CloseIcon component to prevent unnecessary re-renders
export const CloseIcon = React.memo(() => {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.05 },
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black dark:text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
}); 