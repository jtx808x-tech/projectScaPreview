import { ChevronsUpDown, LogOut, Moon, Sun, ShieldCheck, Users, Globe } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * NavUser — pola dari dashboard starter (components/nav-user.tsx).
 *
 * Footer sidebar berisi avatar + identitas user yang membuka dropdown
 * (tema, bahasa, keluar). Tombol Keluar langsung tetap disediakan supaya
 * aksi paling sering dipakai tetap satu klik.
 */

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export default function NavUser({ user, isSuper, lang, setLang, onLogout }) {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="nav-user-trigger"
            className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors duration-200 ease-out hover:bg-secondary"
          >
            <Avatar className="h-9 w-9 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">{user?.name}</span>
              <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {isSuper ? <ShieldCheck className="h-3 w-3 text-primary" /> : <Users className="h-3 w-3" />}
                {isSuper ? "Superadmin" : "Admin/PIC"}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate font-semibold">{user?.name}</span>
                <span className="truncate text-xs text-muted-foreground">@{user?.username}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem data-testid="nav-user-theme" onClick={() => setTheme(dark ? "light" : "dark")}>
              {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Tema {dark ? "Terang" : "Gelap"}
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="nav-user-lang" onClick={() => setLang(lang === "id" ? "en" : "id")}>
              <Globe className="mr-2 h-4 w-4" /> Bahasa: {lang === "id" ? "Indonesia" : "English"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="nav-user-logout" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" className="w-full justify-start gap-2" data-testid="logout-button" onClick={onLogout}>
        <LogOut className="h-4 w-4" /> Keluar
      </Button>
    </div>
  );
}
