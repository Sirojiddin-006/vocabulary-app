import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppLocaleProvider } from "./contexts/AppLocaleContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Folder from "./pages/Folder";
import Memorize from "./pages/Memorize";
import Review from "./pages/Review";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Global from "./pages/Global";
import GlobalFolder from "./pages/GlobalFolder";
import GlobalMemorize from "./pages/GlobalMemorize";
import GlobalReview from "./pages/GlobalReview";
import BookUnitsPage from "./pages/BookUnitsPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/folder/:id"} component={Folder} />
      <Route path={"/review/:id"} component={Review} />
      <Route path={"/memorize/:id"} component={Memorize} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/signin"} component={SignIn} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/global"} component={Global} />
      <Route path={"/global/folder/:id"} component={GlobalFolder} />
      <Route path={"/book/:bookId/units"} component={BookUnitsPage} />
      <Route path={"/global/book/:bookId/units"} component={BookUnitsPage} />
      <Route path={"/global/review/:id"} component={GlobalReview} />
      <Route path={"/global/memorize/:id"} component={GlobalMemorize} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function MobileToolbarAssist() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent) ||
      window.matchMedia("(max-width: 768px)").matches;

    if (!isMobile) return;

    const collapseBrowserToolbar = () => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 1, left: 0, behavior: "auto" });
      });
    };

    const firstPass = window.setTimeout(collapseBrowserToolbar, 60);
    const secondPass = window.setTimeout(collapseBrowserToolbar, 320);

    return () => {
      window.clearTimeout(firstPass);
      window.clearTimeout(secondPass);
    };
  }, [location]);

  return null;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <AppLocaleProvider>
          <TooltipProvider>
            <MobileToolbarAssist />
            <Toaster />
            <Router />
          </TooltipProvider>
        </AppLocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
