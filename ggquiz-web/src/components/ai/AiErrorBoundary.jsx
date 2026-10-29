import { Component } from "react";

class AiErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Trợ thủ AI crashed:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <aside className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Trợ thủ AI gặp lỗi khi xử lý tệp.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
          >
            Thử lại
          </button>
        </aside>
      );
    }
    return this.props.children;
  }
}

export default AiErrorBoundary;
