"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "vi";

type Messages = Record<string, string>;

const messages: Record<Locale, Messages> = {
  en: {
    nav_discover: "Discover",
    nav_my_nfts: "My NFTs",
    nav_create: "Create NFT",
    nav_history: "History",
    connect_wallet: "Connect Wallet",
    disconnect: "Disconnect",
    available_nfts: "Available NFTs",
    search_placeholder: "Search by name, description, category",
    category_all: "All categories",
    sort_recent: "Recent",
    sort_price_asc: "Price ↑",
    sort_price_desc: "Price ↓",
    refresh: "Refresh",
    loading: "Loading...",
    no_nfts: "No NFTs found",
    status_listed: "Listed",
    status_not_listed: "Not listed",
    price: "Price",
    seller: "Seller",
    owner: "Owner",
    category: "Category",
    token_id: "Token ID",
    history_title: "Transaction History",
    history_empty: "No events yet.",
    my_nfts_title: "My NFTs",
    create_title: "Create NFT",
    description: "Description",
    image: "NFT Image",
    submit: "Submit",
    buy: "Buy",
    list: "List",
    unlist: "Unlist",
  },
  vi: {
    nav_discover: "Khám phá",
    nav_my_nfts: "NFT của tôi",
    nav_create: "Tạo NFT",
    nav_history: "Lịch sử",
    connect_wallet: "Kết nối ví",
    disconnect: "Ngắt kết nối",
    available_nfts: "NFT đang bán",
    search_placeholder: "Tìm theo tên, mô tả, thể loại",
    category_all: "Tất cả thể loại",
    sort_recent: "Mới nhất",
    sort_price_asc: "Giá ↑",
    sort_price_desc: "Giá ↓",
    refresh: "Làm mới",
    loading: "Đang tải...",
    no_nfts: "Chưa có NFT",
    status_listed: "Đang bán",
    status_not_listed: "Chưa bán",
    price: "Giá",
    seller: "Người bán",
    owner: "Chủ sở hữu",
    category: "Thể loại",
    token_id: "Mã token",
    history_title: "Lịch sử giao dịch",
    history_empty: "Chưa có giao dịch.",
    my_nfts_title: "NFT của tôi",
    create_title: "Tạo NFT",
    description: "Mô tả",
    image: "Ảnh NFT",
    submit: "Tạo",
    buy: "Mua",
    list: "Đăng bán",
    unlist: "Gỡ bán",
  },
};

interface LocaleContextType {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  t: (k) => k,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("locale") : null;
    if (stored === "vi" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locale", l);
    }
  };

  const t = (key: string) => {
    return messages[locale][key] ?? key;
  };

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

