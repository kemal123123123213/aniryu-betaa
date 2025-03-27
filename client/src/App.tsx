import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import AnimeDetailPage from "@/pages/anime-detail-page";
import AnimeWatchPage from "@/pages/anime-watch-page";
import ProfilePage from "@/pages/profile-page";
import SearchPage from "@/pages/search-page";
import CategoryPage from "@/pages/category-page";
import AdminPage from "@/pages/admin-page";

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <ProtectedRoute component={HomePage} />}
      </Route>
      <Route path="/izle/:id/:episode">
        {() => <ProtectedRoute component={AnimeWatchPage} />}
      </Route>
      <Route path="/anime/:id">
        {() => <ProtectedRoute component={AnimeDetailPage} />}
      </Route>
      <Route path="/profil">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/ara">
        {() => <ProtectedRoute component={SearchPage} />}
      </Route>
      <Route path="/kategori/:genre">
        {() => <ProtectedRoute component={CategoryPage} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} />}
      </Route>
      <Route path="/auth">
        <AuthPage />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
