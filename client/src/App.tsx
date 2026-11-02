import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/profil/:slug" component={ProfilePage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}
export default function App() {
  return <ErrorBoundary><TooltipProvider><Toaster /><Router /></TooltipProvider></ErrorBoundary>;
}
