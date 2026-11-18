# 见账 Android APK（测试版）

这是 `JianZhang` 记账软件的 Android 原生 WebView 安装包工程，使用网站相同的本地资产、负债、交易流水界面。

## 使用与构建

- GitHub Actions 自动运行 [Build Android APK (preview)](../../actions/workflows/android-apk.yml)。
- 成功后在仓库 [Releases](../../releases/tag/v1.0.0-android-preview) 下载 `JianZhang-v1.0.0-preview.apk`。
- 也可以从 Actions 的 `JianZhang-Android-Preview` artifact 下载，调试包使用 GitHub Runner 临时 debug 签名。
- 这是 Android APK，不是简单的网页快捷方式；所有 HTML、CSS、JS、图标都打包到 APK 内，断网能打开。
- 安卓系统需要 Android 7.0 或更新版本。`applicationId=com.jianzhang.ledger`。

## 隐私与限制

- 可选云同步使用 INTERNET 权限。未配置 Supabase 云服务时不会上传财务数据；云服务配置好、用户登录并确认数据归属后才联网同步。账本依然保存在 APK 的独立 WebView 本地存储。
- 安装包采用 `WebViewAssetLoader` 通过 `https://appassets.androidplatform.net/assets/www/index.html` 加载本地资产。
- 资产账本导出 JSON 和 CSV 时打开系统“创建文件”窗口；JSON 导入使用系统选文件窗口。首次导入请先保存原账本备份。
- **重要**：测试包使用 runner 临时 debug 签名，未来构建可能无法覆盖安装（签名不一致）。发布正式长期使用版前需要使用签名密钥且妥善保存，配置 CI 仓库 Secrets。不要将签名私钥提交到公开 GitHub 仓库。
- 安装新版本前必须导出 JSON 备份；卸载应用将清除 APK 内的财务数据。请勿将备份文件上传到公开仓库。
- 目前仅构建验证，不能宣称已通过完整真机功能测试。

## 本地编译

在安装了 Android SDK 35、Java 17 和 Gradle 8.9 的电脑上：
```bash
mkdir -p android/app/src/main/assets/www/icons android/app/src/main/res/drawable-nodpi
cp index.html styles.css app.js android/app/src/main/assets/www/
cp icons/icon-{192,512}.png icons/icon.svg android/app/src/main/assets/www/icons/
cp icons/icon-192.png android/app/src/main/res/drawable-nodpi/app_icon.png
cd android && gradle :app:assembleDebug
```
