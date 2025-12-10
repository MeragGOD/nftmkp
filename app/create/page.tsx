"use client";

import { useNFT } from "@/hooks/useNFT";
import { useWeb3 } from "@/components/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";

export default function CreateNFT() {
  const { connect, isConnected } = useWeb3();
  const { createNFT, isLoading } = useNFT();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLocale();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    
    setError(null);
    setPending(false);

    try {
      console.log("Starting NFT creation...");
      await createNFT(file, name, description, category || undefined);
      console.log("NFT created successfully!");
      
      // Set success state
      setSuccess(true);
      
      // Reset form
      setFile(null);
      setName("");
      setDescription("");
      setCategory("");
      setPreview(null);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push("/my-nfts");
      }, 2000);
    } catch (error: any) {
      console.error("Error creating NFT:", error);
      
      // Check if the error indicates a pending transaction
      if (error.message && error.message.includes("timed out")) {
        setPending(true);
      } else {
        setError(error instanceof Error ? error.message : "Failed to create NFT");
      }
    }
  };

  if (success) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Alert className="bg-green-50 border-green-200 mb-4">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <AlertDescription className="text-green-700">
              NFT created successfully! Redirecting to your NFTs...
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (pending) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Alert className="bg-yellow-50 border-yellow-200 mb-4">
            <Clock className="h-4 w-4 text-yellow-600 mr-2" />
            <AlertDescription className="text-yellow-700">
              Your transaction is pending and may take longer than expected. Check your wallet for confirmation.
              <div className="mt-2">
                <Button onClick={() => router.push("/my-nfts")} variant="outline" size="sm">
                  View my NFTs
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {!isConnected ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Create NFT
          </h2>
          <p className="text-gray-500 mb-8">
            Connect your wallet to create NFTs
          </p>
          <Button onClick={connect}>Connect Wallet</Button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t("create_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="bg-red-50 border-red-200 mb-4">
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="image">{t("image")}</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => document.getElementById("image")?.click()}
                  >
                    {preview ? (
                      <div className="relative w-full h-48">
                        <img
                          src={preview}
                          alt="Preview"
                          className="object-contain w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="py-8">
                        <p>Click to select image</p>
                        <p className="text-sm text-gray-500 mt-1">
                          PNG, JPG, GIF (max 5MB)
                        </p>
                      </div>
                    )}
                    <input
                      id="image"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="NFT name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="NFT description"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Art, Music, Collectible"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !file || !name.trim()}
                >
                  {isLoading ? "Creating..." : "Create NFT"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
} 