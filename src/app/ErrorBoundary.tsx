import { Component, type ErrorInfo, type ReactNode } from 'react';
import { backupService } from './services';

type State = { broken: boolean; saved: boolean };

/**
 * A calm page for when a screen breaks, so one fault never leaves a blank
 * window. What the person has recorded lives on the device, untouched; they
 * can reload, or keep a copy first.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { broken: false, saved: false };

  static getDerivedStateFromError(): Partial<State> {
    return { broken: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A screen stopped working.', error, info.componentStack);
  }

  private saveCopy = async () => {
    try {
      const file = await backupService.exportFile();
      const url = URL.createObjectURL(new Blob([file], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `proairetos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.setState({ saved: true });
    } catch {
      // If even this cannot run, the data is still on the device; reloading is the way forward.
    }
  };

  render() {
    if (!this.state.broken) return this.props.children;
    return (
      <main className="error-page" role="alert">
        <h1>That did not open.</h1>
        <p>What you have recorded is safe on this device. Reloading usually puts things right.</p>
        <div className="error-page__actions">
          <button type="button" className="button-accent" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button type="button" className="chip" onClick={this.saveCopy}>
            {this.state.saved ? 'Copy saved' : 'Save a copy first'}
          </button>
        </div>
      </main>
    );
  }
}
