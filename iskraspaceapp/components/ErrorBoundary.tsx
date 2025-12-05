import React, { Component, ErrorInfo, ReactNode } from "react";
import { TriangleIcon } from "./icons";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-bg text-text p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mb-6 animate-pulse">
                <TriangleIcon className="w-10 h-10 text-danger" />
            </div>
            <h1 className="font-serif text-3xl text-danger mb-4">Разрыв Ткани</h1>
            <p className="text-text-muted max-w-md mb-8">
                Произошел сбой в контуре восприятия. Искра потеряла форму, но не суть.
            </p>
            <div className="bg-surface p-4 rounded-lg border border-white/5 mb-8 max-w-lg w-full overflow-auto text-left">
                <code className="text-xs font-mono text-danger/70">
                    {this.state.error?.toString()}
                </code>
            </div>
            <button 
                onClick={() => window.location.reload()} 
                className="button-primary"
            >
                Ритуал Восстановления (Reload)
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;