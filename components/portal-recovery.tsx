import { Component, type ReactNode } from 'react';

/** Keep the event available if an on-demand app download fails. */
export class PortalRecovery extends Component<
  { children: ReactNode; onClose: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="portal-recovery" role="alert">
        <p>AIR FORCE STATION SURATGARH</p>
        <h1>We couldn’t open My entry.</h1>
        <p>Check your connection and try again. Your saved entry is safe.</p>
        <div>
          <button onClick={() => window.location.reload()}>Try again</button>
          <button onClick={this.props.onClose}>Return to event</button>
        </div>
      </main>
    );
  }
}
