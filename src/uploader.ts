const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
type GduProgressFn = (value: number) => void;

interface GduOptions {
  file: File;
  token: string; // from Google api
  folder: string; // parent folder id
  chunkSize: number;
  onProgress: GduProgressFn;
}

async function gdUpload({ file, token, folder, chunkSize, onProgress }
  : GduOptions) {
  if (!(file && token)) throw "bad param";
  if (!onProgress) onProgress = (_v: number) => {};
  if (!chunkSize) chunkSize = DEFAULT_CHUNK_SIZE;

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
  const location = response.headers.get("location") || "";
  if (!location) throw "no location";

  uploadChunk(0);

  async function uploadChunk(start: number) {
    onProgress(start / file.size);

    let end = start + chunkSize;
    if (end > file.size) end = file.size;
    console.log("start:end", start, end);

    const reader = new FileReader();
    const blob = file.slice(start, end);
    reader.readAsArrayBuffer(blob);

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
      throw `chunk fetch: (${error})`;
    }
    if (response.status == 308) { // upload next chunk
      const r = response.headers.get("Range");
      if (!r) throw "no range in response";
      const realEnd = parseInt(r.substr(r.indexOf("-") + 1));
      if (!Number.isInteger(realEnd) || realEnd < start) throw "bad range: " + r;
      uploadChunk(realEnd + 1);

    } else if (response.ok) onProgress(1); // all done
    else throw "chunk status: " + response.status;
  }
}
