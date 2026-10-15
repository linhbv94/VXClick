import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lỗi giao diện VXClick:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-[310px] p-3 rounded-xl bg-slate-900 border border-rose-500/50 text-rose-300 text-xs font-mono select-none">
          <div className="font-bold text-rose-400 mb-1">Đã xảy ra lỗi giao diện VXClick:</div>
          <div className="text-[11px] text-slate-300 break-words mb-2">
            {this.state.error?.message}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-sans"
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
