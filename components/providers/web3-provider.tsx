"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import { useToast } from "@/components/ui/use-toast";
import { NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, NFT_COLLECTION_ADDRESS, NFT_COLLECTION_ABI } from "@/config/contracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  marketplaceContract: ethers.Contract | null;
  nftContract: ethers.Contract | null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  provider: null,
  signer: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  marketplaceContract: null,
  nftContract: null,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [nftContract, setNftContract] = useState<ethers.Contract | null>(null);
  const { toast } = useToast();
  const connectionChecked = useRef(false);
  // Track if user explicitly disconnected to avoid silent auto-reconnect
  const manuallyDisconnected = useRef(false);

  // Function to initialize contracts
  const initializeContracts = async (signer: ethers.Signer) => {
    try {
      console.log("Initializing contracts with signer:", await signer.getAddress());
      // Ensure there is bytecode at the configured contract addresses
      try {
        const provider = signer.provider as any;
        // ethers.BrowserProvider supports getCode
        const marketplaceCode = await provider.getCode(NFT_MARKETPLACE_ADDRESS);
        const nftCode = await provider.getCode(NFT_COLLECTION_ADDRESS);

        if (!marketplaceCode || marketplaceCode === '0x') {
          throw new Error(`No contract deployed at marketplace address ${NFT_MARKETPLACE_ADDRESS}`);
        }
        if (!nftCode || nftCode === '0x') {
          throw new Error(`No contract deployed at NFT address ${NFT_COLLECTION_ADDRESS}`);
        }
      } catch (codeError) {
        console.error('Contract bytecode check failed:', codeError);
        // Inform the user and bail out without setting contracts
        try {
          (toast as any)({
            title: 'Contracts Missing',
            description: 'No contract bytecode found at configured addresses. Deploy contracts or update config/contracts.ts',
            variant: 'destructive',
          });
        } catch {}
        setMarketplaceContract(null);
        setNftContract(null);
        return;
      }

      // Create interfaces from ABIs for proper type checking
      const marketplaceInterface = new ethers.Interface(NFT_MARKETPLACE_ABI);
      const nftInterface = new ethers.Interface(NFT_COLLECTION_ABI);

      const marketplaceContract = new ethers.Contract(
        NFT_MARKETPLACE_ADDRESS,
        marketplaceInterface,
        signer
      );

      const nftContract = new ethers.Contract(
        NFT_COLLECTION_ADDRESS,
        nftInterface,
        signer
      );

      console.log("Contracts initialized successfully");
      setMarketplaceContract(marketplaceContract);
      setNftContract(nftContract);
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  };

  const connect = async () => {
    if (typeof window.ethereum === "undefined") {
      toast({
        title: "Error",
        description: "Please install MetaMask to use this application",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      manuallyDisconnected.current = false;
      
      // Ask wallet to show account selector instead of silently reusing last one
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permError) {
        // If wallet doesn't support the method, continue with regular request
        console.warn("wallet_requestPermissions not available", permError);
      }

      // Request account access (will open the wallet UI)
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setIsConnected(true);

      // Initialize contracts
      await initializeContracts(signer);

      toast({
        title: "Connected",
        description: "Successfully connected to MetaMask",
      });
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to MetaMask",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    manuallyDisconnected.current = true;
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setMarketplaceContract(null);
    setNftContract(null);
  };

  // Check if already connected - run only once when component mounts
  useEffect(() => {
    const checkConnection = async () => {
      if (connectionChecked.current) return;
      connectionChecked.current = true;
      
      console.log("Checking connection...");
      if (manuallyDisconnected.current) {
        console.log("Skip auto-connect after manual disconnect");
        return;
      }
      
      if (typeof window.ethereum !== "undefined") {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Try to get accounts directly from MetaMask
          // This will return accounts if already connected
          const accounts = await provider.send("eth_accounts", []);
          
          console.log("Found accounts:", accounts);
          
          if (accounts && accounts.length > 0) {
            const signer = await provider.getSigner();
            
            // Update state
            setProvider(provider);
            setSigner(signer);
            setAccount(accounts[0]);
            setIsConnected(true);
            console.log("Setting isConnected to true - found existing connection");

            // Initialize contracts
            await initializeContracts(signer);
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    // Run immediately to avoid delays
    checkConnection();
  }, []);
  
  // Log when isConnected changes
  useEffect(() => {
    console.log("isConnected state:", isConnected);
    console.log("Current account:", account);
    console.log("Contracts initialized:", !!marketplaceContract, !!nftContract);
  }, [isConnected, account, marketplaceContract, nftContract]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log("Accounts changed event:", accounts);
        
        if (accounts.length === 0) {
          // User disconnected
          disconnect();
        } else {
          // Only update if the account actually changed
          if (accounts[0] !== account) {
            try {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const signer = await provider.getSigner();
              
              setProvider(provider);
              setSigner(signer);
              setAccount(accounts[0]);
              setIsConnected(true);
              
              await initializeContracts(signer);
            } catch (error) {
              console.error("Error updating provider after account change:", error);
            }
          }
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      const handleConnect = () => {
        console.log("MetaMask connected event");
        if (manuallyDisconnected.current) {
          console.log("Ignored connect event after manual disconnect");
          return;
        }
        if (!isConnected) {
          connect();
        }
      };

      const handleDisconnect = (error: { code: number; message: string }) => {
        console.log("MetaMask disconnected event:", error);
        disconnect();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("connect", handleConnect);
      window.ethereum.on("disconnect", handleDisconnect);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("connect", handleConnect);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      };
    }
  }, [account, isConnected]);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        marketplaceContract,
        nftContract,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context); 