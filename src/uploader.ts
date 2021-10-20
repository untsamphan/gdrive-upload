const chunkSize = 5 * 1024 * 1024;

type GduProgressFn = (max: number, value: number) => void;

interface GduOptions {
  file: File;
  token: string; // from Google App
  folder: string; // folder id
  buf: ArrayBuffer;
	onProgress: GduProgressFn;
}

function gdUpload({file, token, folder, buf, onProgress}: GduOptions) {
	console.log(file);
	const chunkpot = getChunkpot(chunkSize, file.size);
	const chunks = chunkpot.chunks.map((e: any) => ({
		data: buf.slice(e.startByte, e.endByte + 1),
		length: e.numByte,
		range: "bytes " + e.startByte + "-" + e.endByte + "/" + chunkpot.total
	}));
	onProgress(chunks.length, 0);
  console.log("chunks:", chunks);

  fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mimeType: file.type, name: file.name, parents: [folder]
    })
  }).then(response => {
    if (!response.ok) { throw("status: " + response.status); }
    else {
      const location = response.headers.get("location");
      if (location) {
        doUpload(location, chunks, onProgress);
      } else throw "no location";
    }
  }).catch(error => { throw("fetch: " + error); });
}

function doUpload(location: string, chunks: any, onProgress: GduProgressFn) {
  uploadChunk(0);

	function uploadChunk(current: number) {
    onProgress(chunks.length, current);
		const chunk = chunks[current];

    fetch(location, {
      method: "PUT",
      headers: { "Content-Range": chunk.range },
      body: chunk.data
    }).then(response => {
			if (response.ok) {
        onProgress(chunks.length, current+1);
      } else if (response.status == 308) {
        uploadChunk(current+1);
      } else {
        throw "Chunk Error: " + response.status, "error";
      };
    }).catch(error => { throw "chunk fetch: " + error; });
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
