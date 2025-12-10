import { ReactNode } from "react";
import { UserProfileMenu } from "@/components/ui/user-profile-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Images,
  PlusSquare,
  Clock3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/components/providers/locale-provider";
import avatarPng from "@/app/avatar.png";

interface MainLayoutProps {
  children: ReactNode;
}

function Navigation() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = [
    { href: "/", label: t("nav_discover"), icon: Home },
    { href: "/my-nfts", label: t("nav_my_nfts"), icon: Images },
    { href: "/create", label: t("nav_create"), icon: PlusSquare },
    { href: "/history", label: t("nav_history"), icon: Clock3 },
  ];

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card/60 px-4 py-6 gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={(avatarPng as any).src ?? avatarPng} alt="App avatar" />
                <AvatarFallback>CL</AvatarFallback>
              </Avatar>
              <div className="text-lg font-semibold">CloseLand</div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
          <Navigation />
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 md:hidden">
                <ThemeToggle />
                <LanguageToggle />
                <div className="text-lg font-semibold">CloseLand</div>
              </div>
              <div className="ml-auto">
                <UserProfileMenu />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}