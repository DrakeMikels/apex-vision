'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-900/90 text-white rounded-lg m-4 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm mb-4">We encountered an error on your device.</p>
          <div className="bg-black/50 p-4 rounded text-xs font-mono overflow-auto max-h-40 mb-4">
            {this.state.error?.message}
            <br />
            {this.state.error?.stack}
          </div>
          <button
            className="bg-white text-black px-4 py-2 rounded font-bold hover:bg-zinc-200"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

