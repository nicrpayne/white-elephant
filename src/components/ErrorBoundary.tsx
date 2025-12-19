import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Could send to error reporting service here
    // e.g., Sentry.captureException(error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 bg-red-100 rounded-full p-4 w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center text-sm">
                We're sorry, but something unexpected happened. 
                Please try refreshing the page or going back to the home screen.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 rounded p-3 text-xs font-mono overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleReload} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              <Button 
                onClick={this.handleReset} 
                variant="ghost"
                className="w-full text-sm"
              >
                Try again without refreshing
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
