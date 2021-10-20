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

  const chunkpot = getChunkpot(GduChunkSize, file.size);
  const chunks = chunkpot.chunks.map((e: any) => ({
    data: buf.slice(e.startByte, e.endByte + 1),
    length: e.numByte,
    range: "bytes " + e.startByte + "-" + e.endByte + "/" + chunkpot.total
  }));
  onProgress(0);
  console.log("chunks:", chunks);

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
  doUpload(location, chunks, onProgress);
}

function doUpload(location: string, chunks: any, onProgress: GduProgressFn) {
  uploadChunk(0);

  async function uploadChunk(current: number) {
    onProgress(current / chunks.length);
    const chunk = chunks[current];
    let response: Response;

    try {
      response = await fetch(location, {
        method: "PUT",
        headers: { "Content-Range": chunk.range },
        body: chunk.data
      });
    } catch(error) {
      throw `chunk fetch: (${error})`;
    }
    if (response.ok) {
      onProgress(1);
    } else if (response.status == 308) {
      uploadChunk(current + 1);
    } else {
      throw "chunk status: " + response.status;
    }
  }
}

function getChunkpot(chunkSize: number, fileSize: number): any {
  var chunkPot = {} as any;
  chunkPot.total = fileSize;
  chunkPot.chunks = [];
  if (fileSize > chunkSize) {
    var numE = chunkSize;
    var endS = function (f, n) {
      var c = f % n;
      if (c == 0) {
        return 0;
      } else {
        return c;
      }
    }(fileSize, numE);
    var repeat = Math.floor(fileSize / numE);
    for (var i = 0; i <= repeat; i++) {
      var startAddress = i * numE;
      var c = {} as any;
      c.startByte = startAddress;
      if (i < repeat) {
        c.endByte = startAddress + numE - 1;
        c.numByte = numE;
        chunkPot.chunks.push(c);
      } else if (i == repeat && endS > 0) {
        c.endByte = startAddress + endS - 1;
        c.numByte = endS;
        chunkPot.chunks.push(c);
      }
    }
  } else {
    var chunk = {
      startByte: 0,
      endByte: fileSize - 1,
      numByte: fileSize,
    };
    chunkPot.chunks.push(chunk);
  }
  console.log("chunkPot: ", chunkPot);
  return chunkPot;
}
