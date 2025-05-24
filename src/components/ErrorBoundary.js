import React from 'react';
import analyticsService from '../services/analyticsService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo || { componentStack: 'Unknown' }
    });

    // Track the error
    analyticsService.trackError(error, {
      context: 'error_boundary',
      component_stack: errorInfo?.componentStack || 'Unknown',
      error_boundary: this.props.name || 'unknown'
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚨 Something went wrong</h2>
            <p>The application encountered an unexpected error.</p>
            
            <div className="error-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  analyticsService.trackUserInteraction('error_boundary_retry', 'error_boundary');
                }}
              >
                Try Again
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  window.location.reload();
                  analyticsService.trackUserInteraction('error_boundary_reload', 'error_boundary');
                }}
              >
                Reload App
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo?.componentStack || 'Not available'}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;