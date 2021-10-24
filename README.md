# gdriveUpload

Small JavaScript library, for uploading large or small files in chunks to Google Drive, using the [resumable upload](https://developers.google.com/drive/api/v3/manage-uploads#resumable) API</a>

- upload large files, e.g., 2GB
- minimal memory requirement (e.g., suitable for mobile), depending on the configurable `chunkSize`
- specify any metadata, e.g., name, description
- provide a callback to show progress
- return Promise, allow handling of success/failure case
- for use in Google Apps Script web app project

## Requirements

- [Apps Script](https://developers.google.com/apps-script). My initial use case is an Apps Script [web app](https://developers.google.com/apps-script/guides/web).
- Or any other way to [get an OAuth2 token](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow), such as the [Google API Client Library](https://github.com/google/google-api-javascript-client).

## Installation

Copy the file `dist/gdriveUpload.js` into your web app, or use it via jsdelivr by putting this in your HTML:-

```html
<script src="https://cdn.jsdelivr.net/gh/untsamphan/gdrive-upload@1.1/dist/gdriveUpload.min.js"></script>
```

## API

The function:-

```javascript
async function gdriveUpload(option: UploadOptions)
```

It returns `undefined` if success or an `Error` if failed.

The `option` parameters:-

```typescript
interface UploadOptions {
  file: File; // the file to upload
  token: string; // auth token from Google api
  folder?: string; // parent folder id to upload to (root if missing)
  metadata?: Metadata; // such as `name`, `description`
  chunkSize?: number; // must be multiple of 256*1024 (default 5M)
  onProgress?: OnProgressFn; // 0:start 1:done 0.x:progress
}
type OnProgressFn = (value: number) => void;
type Metadata = {[key: string]: any};
```

The parameter `file` and `token` are required. The rest are optional. For the list of available `metadata`, properties see the list at [file.create](https://developers.google.com/drive/api/v3/reference/files/create#request-body) API.

## Example

Sample code from an Apps Script web app. The Apps Script function `getFolderAndToken()` returns the folder id and OAuth token.

### Web app

```javascript
function uploadFile() {
  const file = document.getElementById("file").files[0];
  showUploadStart();

  const metadata = {};
  let v = document.getElementById("name").value;
  if (v && v !== file.name) metadata.name = v;
  v = document.getElementById("description").value;
  if (v) metadata.description = v;

  google.script.run.withSuccessHandler(doUpload).getFolderAndToken();

  function doUpload(result) {
    gdriveUpload({ ...result, file, metadata, onProgress: handleProgress })
    .then(error => {
      if (error) showMessage("Upload error: " + error.message);
    }).finally(showUploadEnd);
  }
}

function handleProgress(value) {
  if (value === 0) showMessage("Uploading...");
  else if (value === 1) showMessage("Done");
  document.getElementById("progress").innerHTML =
    `<progress max="1" value=${value}></progress>`;
}
```

### Apps Script

```javascript
function getFolderAndToken() {
  const folderName = "Uploads";
  const folders = DriveApp.getFoldersByName(folderName);
  const folder = (folders.hasNext()) ? folders.next() : DriveApp.createFolder(folderName);
  return {
    folder: folder.getId(),
    token: ScriptApp.getOAuthToken()
  };
}
```

### Example Project

You can `Make a copy` of the small project [GDrive Uploader](https://script.google.com/d/1bPT0XaNZct2PyGh93j84TfK7NCdACWixSBNCyPDd8sMektbXLa2rxBUC/edit?usp=sharing) to try the code.

## Credits

Based on

1. [Tanaike](https://tanaikech.github.io/about/)'s [Resumable_Upload_For_WebApps](https://github.com/tanaikech/Resumable_Upload_For_WebApps)
1. Mike Sallese's article [Upload a file in chunks via resumable upload with the Google Drive API](https://www.mikesallese.me/blog/google-drive-resumable-upload/)

## License

[CC0](https://choosealicense.com/licenses/cc0-1.0/)

## Contributing

Please don't hesitate to open an issue or pull request.
