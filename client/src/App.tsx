import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import type { ComponentType } from "react";
import AdminGuard from "./components/AdminGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminCategories from "./pages/AdminCategories";
import AdminCutTypes from "./pages/AdminCutTypes";
import AdminQuickQuantities from "./pages/AdminQuickQuantities";
import AdminSettings from "./pages/AdminSettings";
import AdminLogin from "./pages/AdminLogin";
import AdminUsers from "./pages/AdminUsers";
import OrderConfirmation from "./pages/OrderConfirmation";

/** Rota do painel: só renderiza depois que o servidor confirma a sessão. */
function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentType;
}) {
  return (
    <Route path={path}>
      <AdminGuard>
        <Component />
      </AdminGuard>
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/order/confirmation/:id" component={OrderConfirmation} />

      <Route path="/admin/login" component={AdminLogin} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <AdminRoute path="/admin/products" component={AdminProducts} />
      <AdminRoute path="/admin/orders" component={AdminOrders} />
      <AdminRoute path="/admin/categories" component={AdminCategories} />
      <AdminRoute path="/admin/cut-types" component={AdminCutTypes} />
      <AdminRoute path="/admin/quick-quantities" component={AdminQuickQuantities} />
      <AdminRoute path="/admin/settings" component={AdminSettings} />
      <AdminRoute path="/admin/users" component={AdminUsers} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
