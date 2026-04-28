import SwiftUI
import WebKit

struct WebAppView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.04, green: 0.06, blue: 0.08, alpha: 1.0)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        loadApp(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            loadApp(in: webView)
        }
    }

    private func loadApp(in webView: WKWebView) {
        guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html") else {
            webView.loadHTMLString("<h1>Championship Predictions</h1><p>Missing app bundle.</p>", baseURL: nil)
            return
        }

        webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
    }
}
