"use strict";
const chunkSize = 5 * 1024 * 1024;
function gdUpload({ file, token, folder, buf, onProgress }) {
    console.log(file);
    const chunkpot = getChunkpot(chunkSize, file.size);
    const chunks = chunkpot.chunks.map((e) => ({
        data: buf.slice(e.startByte, e.endByte + 1),
        length: e.numByte,
        range: "bytes " + e.startByte + "-" + e.endByte + "/" + chunkpot.total
    }));
    onProgress(0);
    console.log("chunks:", chunks);
    const body = { mimeType: file.type, name: file.name };
    if (folder)
        body.parents = [folder];
    fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    }).then(response => {
        if (!response.ok) {
            throw ("status: " + response.status);
        }
        else {
            const location = response.headers.get("location");
            if (location) {
                doUpload(location, chunks, onProgress);
            }
            else
                throw "no location";
        }
    }).catch(error => { throw ("fetch: " + error); });
}
function doUpload(location, chunks, onProgress) {
    uploadChunk(0);
    function uploadChunk(current) {
        onProgress(current / chunks.length);
        const chunk = chunks[current];
        fetch(location, {
            method: "PUT",
            headers: { "Content-Range": chunk.range },
            body: chunk.data
        }).then(response => {
            if (response.ok) {
                onProgress(1);
            }
            else if (response.status == 308) {
                uploadChunk(current + 1);
            }
            else {
                throw "Chunk Error: " + response.status, "error";
            }
            ;
        }).catch(error => { throw "chunk fetch: " + error; });
    }
}
function getChunkpot(chunkSize, fileSize) {
    var chunkPot = {};
    chunkPot.total = fileSize;
    chunkPot.chunks = [];
    if (fileSize > chunkSize) {
        var numE = chunkSize;
        var endS = function (f, n) {
            var c = f % n;
            if (c == 0) {
                return 0;
            }
            else {
                return c;
            }
        }(fileSize, numE);
        var repeat = Math.floor(fileSize / numE);
        for (var i = 0; i <= repeat; i++) {
            var startAddress = i * numE;
            var c = {};
            c.startByte = startAddress;
            if (i < repeat) {
                c.endByte = startAddress + numE - 1;
                c.numByte = numE;
                chunkPot.chunks.push(c);
            }
            else if (i == repeat && endS > 0) {
                c.endByte = startAddress + endS - 1;
                c.numByte = endS;
                chunkPot.chunks.push(c);
            }
        }
    }
    else {
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
//# sourceMappingURL=uploader.js.map