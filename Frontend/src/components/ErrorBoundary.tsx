import React from 'react';
import CasinoBackground from '@/components/ui/CasinoBackground';
import Button from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort safety net for uncaught render errors. Without this, a single bad render
 * (e.g. an unexpected API shape) would blank the whole page instead of showing something
 * a user can act on. Deliberately dependency-light (no router hooks, no framer-motion) so
 * this component itself can't fail for the same reasons the tree it's guarding might.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Unhandled error in render tree:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[var(--base)] relative overflow-hidden flex items-center justify-center">
        <CasinoBackground />
        <main className="relative z-10 text-center px-8 max-w-lg">
          <span className="text-8xl font-serif font-bold text-[var(--gold)] block leading-none mb-6">
            500
          </span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[var(--text)] mb-4">
            Something Went Wrong
          </h1>
          <p className="text-base text-[var(--text-2)] mb-8 leading-relaxed">
            The house hit an unexpected snag. Reloading the page usually clears it up.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button variant="gold" size="lg" onClick={() => { window.location.href = '/'; }}>
              Return to Lobby
            </Button>
          </div>
        </main>
      </div>
    );
  }
}

export default ErrorBoundary;
