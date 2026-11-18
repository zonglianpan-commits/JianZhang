import SwiftUI
import WebKit

/// 见账 iOS 原生工程预览。通过同一个 HTTPS 站点加载记账界面，
/// 云账号同步开启后可与安卓、电脑共用账户。
/// 分发到 TestFlight/App Store 仍需 Apple Developer 签名和审核。
@main
struct JianZhangApp: App {
    var body: some Scene {
        WindowGroup {
            LedgerScreen()
                .preferredColorScheme(.dark)
        }
    }
}

struct LedgerScreen: View {
    @State private var loading = true
    @State private var offline = false

    var body: some View {
        ZStack {
            Color(red: 9/255, green: 17/255, blue: 27/255)
                .ignoresSafeArea()
            LedgerWebView(loading: $loading, offline: $offline)
                .ignoresSafeArea(edges: .bottom)
            if loading {
                VStack(spacing: 13) {
                    Text("见账").font(.system(size: 30, weight: .bold))
                    ProgressView().tint(Color(red: 0.77, green: 0.94, blue: 0.56))
                    Text("正在加载账本…")
                        .foregroundColor(.gray)
                        .font(.footnote)
                }
            }
            if offline && !loading {
                VStack(spacing: 14) {
                    Image(systemName: "wifi.slash").font(.system(size: 34))
                    Text("网络暂时不可用").font(.title3.bold())
                    Text("原生预览版需要联网载入网页；可改用 Safari 安装 PWA 以支持已缓存的离线访问。")
                        .multilineTextAlignment(.center)
                        .font(.footnote)
                        .foregroundColor(.gray)
                    Button("重新连接") {
                        offline = false
                        loading = true
                        NotificationCenter.default.post(name: .reloadLedger, object: nil)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(28)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
                .padding()
            }
        }
    }
}

extension Notification.Name {
    static let reloadLedger = Notification.Name("JianZhangReload")
}
