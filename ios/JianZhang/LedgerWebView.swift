import SwiftUI
import WebKit

struct LedgerWebView: UIViewRepresentable {
    @Binding var loading: Bool
    @Binding var offline: Bool
    private let homepage = URL(string: "https://zonglianpan-commits.github.io/JianZhang/")!

    func makeCoordinator() -> Coordinator {
        Coordinator(loading: $loading, offline: $offline, homepage: homepage)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = WKWebsiteDataStore.default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = UIColor(red: 9/255, green: 17/255, blue: 27/255, alpha: 1)
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.navigationDelegate = context.coordinator
        context.coordinator.webView = view
        view.load(URLRequest(url: homepage, cachePolicy: .returnCacheDataElseLoad))
        context.coordinator.observer = NotificationCenter.default.addObserver(
            forName: .reloadLedger, object: nil, queue: .main
        ) { [weak view] _ in
            view?.load(URLRequest(url: self.homepage, cachePolicy: .reloadIgnoringLocalCacheData))
        }
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        if let observer = coordinator.observer {
            NotificationCenter.default.removeObserver(observer)
        }
        uiView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        @Binding private var loading: Bool
        @Binding private var offline: Bool
        let homepage: URL
        weak var webView: WKWebView?
        var observer: NSObjectProtocol?

        init(loading: Binding<Bool>, offline: Binding<Bool>, homepage: URL) {
            self._loading = loading
            self._offline = offline
            self.homepage = homepage
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            loading = false
            offline = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            loading = false
            offline = true
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            loading = false
            offline = true
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if let scheme = url.scheme?.lowercased(), ["http", "https"].contains(scheme),
               url.host?.lowercased() != homepage.host?.lowercased() {
                // Trusted auth email links and external resources should open outside.
                if navigationAction.navigationType == .linkActivated {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }
            }
            decisionHandler(.allow)
        }
    }
}
