package com.jianzhang.ledger;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.ValueCallback;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * Offline-only shell for the same first-party finance ledger UI.
 * No INTERNET permission. Local assets are served via WebViewAssetLoader.
 * Files are exported using Android's system document picker.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int PICK_JSON = 1001;
    private static final int SAVE_DOCUMENT = 1002;
    private static final int MAX_EXPORT_CHARS = 8 * 1024 * 1024;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(10, 19, 27));
        getWindow().setNavigationBarColor(Color.rgb(10, 19, 27));

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(10, 19, 27));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setDefaultTextEncodingName("UTF-8");

        webView.addJavascriptInterface(new LocalExportBridge(), "JianZhangNative");
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("https".equals(u.getScheme()) && "appassets.androidplatform.net".equals(u.getHost())) {
                    return false;
                }
                if (request.isForMainFrame() && ("http".equals(u.getScheme()) || "https".equals(u.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); }
                    catch (Exception ignored) { Toast.makeText(MainActivity.this,"找不到打开链接的应用",Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*"); // Some document providers label JSON as octet-stream.
                try { startActivityForResult(picker, PICK_JSON); }
                catch (Exception ex) { fileCallback.onReceiveValue(null); fileCallback = null; return false; }
                return true;
            }
        });
        webView.loadUrl(HOME);
    }

    private final class LocalExportBridge {
        @JavascriptInterface public void save(String name, String content, String mime) {
            if (name == null || content == null || mime == null || content.length() > MAX_EXPORT_CHARS) return;
            if (!(mime.startsWith("application/json") || mime.startsWith("text/csv"))) return;
            final String safeName = name.replaceAll("[\\\\/\\r\\n:*?\"<>|]", "_").trim();
            if (safeName.length() == 0 || safeName.length() > 100) return;
            final byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            runOnUiThread(() -> {
                if (pendingExport != null) {
                    Toast.makeText(MainActivity.this, "请先完成正在进行的文件保存", Toast.LENGTH_SHORT).show();
                    return;
                }
                pendingExport = bytes;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mime.startsWith("application/json") ? "application/json" : "text/csv");
                intent.putExtra(Intent.EXTRA_TITLE, safeName);
                try { startActivityForResult(intent, SAVE_DOCUMENT); }
                catch (Exception ex) { pendingExport = null; Toast.makeText(MainActivity.this,"无法打开文件保存窗口",Toast.LENGTH_LONG).show(); }
            });
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_JSON) {
            if (fileCallback != null) {
                Uri[] selected = resultCode == RESULT_OK && data != null && data.getData() != null
                    ? new Uri[]{data.getData()} : null;
                fileCallback.onReceiveValue(selected);
                fileCallback = null;
            }
        } else if (requestCode == SAVE_DOCUMENT) {
            if (pendingExport != null && resultCode == RESULT_OK && data != null && data.getData() != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData(), "w")) {
                    if (out == null) throw new IllegalStateException("Missing output stream");
                    out.write(pendingExport);
                    out.flush();
                    Toast.makeText(this, "文件保存成功", Toast.LENGTH_SHORT).show();
                } catch (Exception ex) {
                    Toast.makeText(this, "文件保存失败，请重试", Toast.LENGTH_LONG).show();
                }
            }
            pendingExport = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (webView != null) { webView.removeJavascriptInterface("JianZhangNative"); webView.destroy(); }
        super.onDestroy();
    }
}
