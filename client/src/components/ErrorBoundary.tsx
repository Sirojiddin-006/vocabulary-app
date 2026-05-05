import { getCopy } from "@/lib/appCopy";
import { Component, ReactNode } from "react";
import type { AppLocale } from "@/contexts/AppLocaleContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private getLocale(): AppLocale {
    if (typeof window === "undefined") {
      return "en";
    }

    const stored = localStorage.getItem("app-locale");
    return stored === "uz" || stored === "en" ? stored : "en";
  }

  render() {
    if (this.state.hasError) {
      if (import.meta.env.DEV) {
        return (
          <div style={{ padding: 24, fontFamily: "monospace" }}>
            <h2>Dev Error</h2>
            <pre style={{ color: "red" }}>
              {this.state.error?.toString()}
            </pre>
            <pre>{this.state.error?.stack}</pre>
          </div>
        );
      }

      const copy = getCopy(this.getLocale());

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">{copy.common.errorTitle}</h2>
          <p className="text-muted-foreground mb-4">{copy.common.errorMessage}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              {copy.common.errorRetry}
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
