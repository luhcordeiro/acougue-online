import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Lock, User } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AdminLogin() {
  // O guard manda para cá com ?sessao=expirada quando o cookie nao vale mais
  const sessaoExpirada =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("sessao") === "expirada";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: async (data) => {
      sessionStorage.setItem("adminUser", JSON.stringify(data.user));
      sessionStorage.setItem("adminAuthenticated", "true");

      /**
       * A sessão acabou de mudar, mas o cache de adminAuth.me ainda guarda o
       * null lido antes do login (a home consulta essa rota para o badge de
       * pedidos). Sem atualizar aqui, o AdminGuard leria o valor velho e
       * devolveria o usuário para a tela de login logo após entrar.
       */
      utils.adminAuth.me.setData(undefined, {
        adminId: data.user.id,
        username: data.user.username,
        name: data.user.name,
      });
      await utils.adminAuth.me.invalidate();

      toast.success("Login realizado com sucesso!");

      /**
       * Navegação completa, e não roteamento interno.
       *
       * Entrar acontece uma vez por sessão, e recarregar a página elimina
       * qualquer estado antigo em memória — cache de sessão, dados de outro
       * usuário. Vale o custo do recarregamento para não depender de o cache
       * estar coerente exatamente nesse momento.
       */
      window.location.href = "/admin";
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
      setPassword("");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Acesso Administrativo</CardTitle>
            <CardDescription>Digite seu usuário e senha para acessar o painel admin</CardDescription>
            {sessaoExpirada && (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Sua sessão não foi mantida. Se isso repetir logo após entrar,
                verifique se o navegador está bloqueando cookies deste site.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLocation("/")}
              disabled={loginMutation.isPending}
            >
              Voltar para Home
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
