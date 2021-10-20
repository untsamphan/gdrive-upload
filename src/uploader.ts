const GduChunkSize = 5 * 1024 * 1024;
type GduProgressFn = (value: number) => void;

interface GduOptions {
  file: File;
  token: string; // from Google App
  folder: string; // folder id
  buf: ArrayBuffer;
  onProgress: GduProgressFn;
}

async function gdUpload({ file, token, folder, buf, onProgress }: GduOptions) {
  if (!(file && token)) throw "bad param";
  if (!onProgress) onProgress = (_v: number) => { };

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
  doUpload(location, file, buf, onProgress);
}

function doUpload(location: string, file: File, buf: ArrayBuffer, onProgress: GduProgressFn) {
  uploadChunk(0);

  async function uploadChunk(start: number) {
    onProgress(start / file.size);
    let end = start + GduChunkSize;
    if (end > file.size) end = file.size;
    console.log("start:end", start, end);
    const data = buf.slice(start, end);
    let response: Response;

    try {
      response = await fetch(location, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end-1}/${file.size}`
        },
        body: data
      });
    } catch(error) {
      throw `chunk fetch: (${error})`;
    }
    if (response.status == 308) {
      const r = response.headers.get("Content-Range");
      if (!r) throw "no range in response";
      const next = Number(r.substring(r.indexOf("-")+1, r.indexOf("/")));
      if (!Number.isInteger(next) || next < start) throw "bad range: " + r;
      uploadChunk(next);
    } else if (response.ok) onProgress(1); // Done
    else throw "chunk status: " + response.status;
  }
}
