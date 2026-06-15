// Google Apps Script Web App
// 說明：部署為 Web App，接受 POST JSON {action:'autofill'|'save', ...}

// 如果你給了試算表連結，我們可以把 ID 預設放在這裡，方便測試與部署。
var DEFAULT_SHEET_ID = '1Cwv5_-q9pHu2uPTAz9HgBeCgv_nbs2LAl8SPAsVuG9o';

function doPost(e){
  try{
    var body = e.postData.contents
    var data = JSON.parse(body)
    var action = data.action
    if(action=='autofill'){
      var word = data.word || ''
      var translation = ''
      try{ translation = LanguageApp.translate(word,'en','zh-CN') }catch(e){ translation = '' }

      var pos = ''
      var example = ''
      try{
        var dictUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word)
        var resp = UrlFetchApp.fetch(dictUrl, {muteHttpExceptions:true})
        var dict = JSON.parse(resp.getContentText())
        if(Array.isArray(dict) && dict[0].meanings && dict[0].meanings[0]){
          pos = dict[0].meanings[0].partOfSpeech || ''
          var def = dict[0].meanings[0].definitions && dict[0].meanings[0].definitions[0]
          if(def && def.example) example = def.example
        }
      }catch(e){ }

      var root = ''
      try{
        // 簡單字根分析示例：去掉常見字尾
        root = word.replace(/(ing|ed|ly|s|es)$/i,'')
      }catch(e){ root = '' }

      return ContentService.createTextOutput(JSON.stringify({success:true,translation:translation,pos:pos,example:example,root:root})).setMimeType(ContentService.MimeType.JSON)
    }

    if(action=='save'){
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID') || DEFAULT_SHEET_ID
      if(!sheetId) throw '請在 Apps Script 設定 SHEET_ID 至欲寫入的試算表 ID 或在程式中設定 DEFAULT_SHEET_ID'
      var ss = SpreadsheetApp.openById(sheetId)
      var sheet = ss.getSheetByName('Words')
      if(!sheet) sheet = ss.insertSheet('Words')
      // 如果空表則加入標題
      if(sheet.getLastRow()==0){ sheet.appendRow(['word','translation','pos','example','root','createdAt']) }
      sheet.appendRow([data.word||'',data.translation||'',data.pos||'',data.example||'',data.root||'',new Date()])
      return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON)
    }

    return ContentService.createTextOutput(JSON.stringify({success:false,error:'unknown action'})).setMimeType(ContentService.MimeType.JSON)
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({success:false,error:err.toString()})).setMimeType(ContentService.MimeType.JSON)
  }
}
