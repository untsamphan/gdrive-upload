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
