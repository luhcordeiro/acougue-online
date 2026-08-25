import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

export const ADMIN_AUTH_KEY = "adminAuthenticated";
export const ADMIN_USER_KEY = "adminUser";

/** Limpa apenas o cache de UI; a sessão real é o cookie httpOnly. */
export function clearAdminSessionCache() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

/**
 * Envolve as telas do painel: só renderiza depois que o servidor confirma
 * a sessão do admin (adminAuth.me). A autorização de verdade acontece no
 * backend, em adminProcedure - isto aqui evita renderizar a tela e disparar
 * queries que fatalmente falhariam.
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: admin, isLoading } = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isLoading && !admin) {
      clearAdminSessionCache();
      setLocation("/admin/login");
    }
  }, [admin, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!admin) return null;

  return <>{children}</>;
}
