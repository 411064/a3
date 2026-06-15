# 部署與使用說明

1) 建立 Google 試算表
- 建立一個新的 Google 試算表，命名例如「Vocabulary」。
- 記下試算表 ID（在 URL 中，/spreadsheets/d/{THIS_ID}/...）。

2) 建立 Google Apps Script 並部署為 Web App
- 在 Google Drive 中建立新的 Apps Script 專案，將 `/google_apps_script/Code.gs` 的內容貼上到專案中。
- 在 Apps Script 的 `Project Properties` -> `Script Properties` 中新增一個 `SHEET_ID`，值為第 1 步的試算表 ID。
- 點選「Deploy」→「New deployment」，選擇「Web app」。
  - 設定「Execute as」為「Me」。
  - 設定「Who has access」為「Anyone」或「Anyone, even anonymous」（視需求），然後部署。
- 取得部署後的 Web App URL（例如 `https://script.google.com/macros/s/XXX/exec`）。

3) 在前端填入 Web App URL
- 打開 `admin.html`，在上方的 `Apps Script Web App URL` 欄位貼上剛剛取得的 Web App URL，瀏覽器會將它儲存在 localStorage 中。

4) 使用管理介面
- 打開 `admin.html`，輸入英文單字，點擊「自動填入」會向 Apps Script 發出 POST 請求（action=autofill），Apps Script 會嘗試使用 `LanguageApp.translate` 取得中文翻譯，並向 dictionaryapi.dev 取得詞性與例句，最後回傳給前端填入表單欄位。
- 點擊「儲存單字」會先將資料加入 localStorage（供背單字頁面使用），然後向 Apps Script 發出 POST（action=save）將資料寫入 Google 試算表（工作表名稱 `Words`）。

5) 在背單字頁面查看
- 打開 `index.html`，會從 localStorage 載入已儲存的單字。點擊卡片或「翻頁」按鈕可翻轉卡片。

注意事項與權限
- Apps Script 使用 `LanguageApp` 與 `UrlFetchApp`，部署時需要授權讀寫試算表與連網權限。
- 若要避免跨域問題，建議將前端放在可公開的網域或使用本地伺服器（例如 `python -m http.server`）來測試。

檔案清單（已建立）
- [index.html](index.html)
- [admin.html](admin.html)
- [styles.css](styles.css)
- [app.js](app.js)
- [google_apps_script/Code.gs](google_apps_script/Code.gs)

如需我協助部署 Apps Script（貼上程式、設定 Script Properties、部署步驟截圖教學），我可以一步一步帶您完成。
