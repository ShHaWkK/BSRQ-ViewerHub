import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Conserver les détails pour diagnostic en prod
    try {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, info);
      window.__lastError = { error: String(error && error.message || error), stack: String(error && error.stack || ''), componentStack: String(info && info.componentStack || '') };
    } catch {}
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-bg">
          <div className="container" style={{ paddingTop: '6vh' }}>
            <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
              <h2 style={{ marginTop: 0 }}>Un problème est survenu</h2>
              <p className="muted">Nous avons intercepté une erreur d’exécution. Les détails ont été consignés dans la console.</p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                {(this.state.error && this.state.error.message) || 'Erreur inconnue'}
                {'\n'}
                {(this.state.info && this.state.info.componentStack) || ''}
              </pre>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

