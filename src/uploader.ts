interface _Options {
  file: File;
  token: string; // from Google api
  folder?: string; // parent folder id
  chunkSize?: number;
  onProgress?: _OnProgressFn;
}
type _OnProgressFn = (value: number) => void;
const _DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;


async function gdUpload({ file, token, folder, chunkSize, onProgress }
  : _Options) {
  if (!(file && token)) throw "bad param";
  const _onProgress = onProgress || ((_v: number) => {});
  const _chunkSize = chunkSize || _DEFAULT_CHUNK_SIZE;

  const location = await _getUploadLocation(file, token, folder);
  await _uploadChunks(file, location, _chunkSize, _onProgress);
  _onProgress(1);
}

async function _getUploadLocation(file: File, token: string, folder?: string) {
  const body = { mimeType: file.type, name: file.name } as any;
  if (folder) body.parents = [folder];
  let response: Response;

  try {
    response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
  } catch(error) {
    throw "init fetch: " + error;
  }

  if (!response.ok) throw "init fetch status: " + response.status;
  const location = response.headers.get("location");
  if (!location) throw "no location";
  return location;
}

async function _uploadChunks(file: File, location: string,
  chunkSize: number, onProgress: _OnProgressFn) {
  let ulEnd: number;

  for(let start = 0;; start = ulEnd + 1) {
    onProgress(start / file.size);

    let end = start + chunkSize;
    if (end > file.size) end = file.size;
    console.log("start:end", start, end);

    //const reader = new FileReader();
    const blob = await file.slice(start, end).arrayBuffer();
    //reader.readAsArrayBuffer(blob);

    let response: Response;
    try {
      response = await fetch(location, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end-1}/${file.size}`
        },
        body: blob
      });
    } catch(error) {
      throw "chunk fetch: " + error;
    }

    if (response.ok) break; // all done
    if (response.status != 308) throw "chunk fetch status: " + response.status;

    const r = response.headers.get("Range");
    if (!r) throw "no range in response";
    ulEnd = parseInt(r.substr(r.indexOf("-") + 1));
    if (!Number.isInteger(ulEnd) || ulEnd < start) throw "bad range: " + r;
  }
}
