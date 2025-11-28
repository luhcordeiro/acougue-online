import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Senha hardcoded para simplicidade - em produção, deve ser configurável
    const ADMIN_PASSWORD = "admin123";
    
    if (password === ADMIN_PASSWORD) {
      // Salvar no sessionStorage para manter durante a sessão
      sessionStorage.setItem("adminAuthenticated", "true");
      toast.success("Login realizado com sucesso!");
      setLocation("/admin");
    } else {
      toast.error("Senha incorreta!");
      setPassword("");
    }
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
            <CardDescription>Digite a senha para acessar o painel admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full">
              Entrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLocation("/")}
            >
              Voltar para Home
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
