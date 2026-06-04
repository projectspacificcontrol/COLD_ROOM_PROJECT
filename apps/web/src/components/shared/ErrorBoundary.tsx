import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Dashboard error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#515856,#262c2d_52%,#1f2424)] p-6 text-white">
          <div className="w-full max-w-lg rounded-xl border border-rose-500/30 bg-zinc-900/90 p-8 shadow-glow shadow-rose-950/20 backdrop-blur-md">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-rose-500/10 p-4 ring-1 ring-rose-500/20 animate-pulse">
                <AlertOctagon className="h-10 w-10 text-rose-400" />
              </div>
              <h1 className="text-2xl font-black tracking-normal text-white">System Error Caught</h1>
              <p className="mt-2 text-sm font-semibold text-zinc-300">
                The dashboard application encountered a critical runtime exception.
              </p>
              
              <div className="my-6 w-full rounded-lg border border-white/5 bg-black/45 p-4 text-left font-mono text-xs">
                <p className="font-bold text-rose-300">Error Description:</p>
                <p className="mt-1 break-all text-zinc-300">{this.state.error?.message || "Unknown error"}</p>
                {this.state.error?.stack && (
                  <details className="mt-2 cursor-pointer text-zinc-400">
                    <summary className="font-bold text-zinc-300 hover:text-white">View stack trace</summary>
                    <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-all text-[10px] text-zinc-500">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-6 py-3 text-sm font-black text-white hover:bg-zinc-700 ring-2 ring-white/10 transition active:scale-95"
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Reload Application
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
