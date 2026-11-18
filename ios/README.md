# 见账 iOS 版本

- **当前 iPhone 直接可用：**打开 [见账安装网页](https://zonglianpan-commits.github.io/JianZhang/download.html)，在 Safari 中选择「分享」→「添加到主屏幕」。这是 PWA 网页应用，不是原生 IPA。
- **原生 iOS 项目源码：**`ios/JianZhang`，SwiftUI + WKWebView 包装官方 HTTPS 记账网页。使用同一云账号可以同步，但前提是配置好 Supabase（详见 ../docs/CLOUD_SETUP.md）。
- 已增加 `ios/project.yml`，可通过 XcodeGen 生成 Xcode 工程，并在 GitHub macOS Runner 上执行模拟器编译验证。
- **目前没有可在 iPhone 安装的签名 IPA / TestFlight 链接。** 需要 Apple Developer 计划资格、证书、描述文件和 App Store Connect 配置，不能通过普通下载网站绕过 iOS 的签名/分发规则。
- 这个原生源码预览版在首次打开时需要联网加载站点；iPhone 不联网时建议通过 Safari 添加 PWA，并预先加载缓存。
- iOS 原生 WebView 的本地存储与 Safari PWA 彼此独立；即使使用同一设备，未登录同步服务时也不共享账目。
- 目前未进行真实 iPhone 真机测试，也不保证 App Store 审核通过；正式上架需要补充原生价值、隐私政策与必要适配。
