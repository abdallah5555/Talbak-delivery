import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '../lib/monitoring';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  declare readonly props: Readonly<Props>;
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Talabak ErrorBoundary]', error, info);
    captureException(error);
  }

  private reload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-extrabold mb-2">حصل خطأ غير متوقع</h1>
          <p className="text-sm text-slate-600 leading-7 mb-5">حاول إعادة تحميل التطبيق، ولو استمرت المشكلة تواصل مع الدعم.</p>
          <button type="button" onClick={this.reload} className="w-full rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 transition">إعادة تحميل الصفحة</button>
        </div>
      </div>
    );
  }
}
