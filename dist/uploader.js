"use strict";
const chunkSize = 5 * 1024 * 1024;
function gdUpload({ file, token, parent, buf }) {
    show("Initializing");
    showProgress();
    console.log(file);
    const chunkpot = getChunkpot(chunkSize, file.size);
    const chunks = chunkpot.chunks.map((e) => ({
        data: buf.slice(e.startByte, e.endByte + 1),
        length: e.numByte,
        range: "bytes " + e.startByte + "-" + e.endByte + "/" + chunkpot.total
    }));
    console.log("chunks:", chunks);
    fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mimeType: file.type, name: file.name, parents: [parent]
        })
    }).then(response => {
        if (!response.ok) {
            logError("status: " + response.status);
        }
        else {
            const location = response.headers.get("location");
            if (location) {
                doUpload(location, chunks);
            }
            else
                logError("no location");
        }
    }).catch(error => { logError("fetch: " + error); });
}
function doUpload(location, chunks) {
    show("Uploading...", "info");
    uploadChunk(0);
    function uploadChunk(current) {
        showProgress(current, chunks.length);
        const chunk = chunks[current];
        fetch(location, {
            method: "PUT",
            headers: { "Content-Range": chunk.range },
            body: chunk.data
        }).then(response => {
            if (response.ok) {
                show('Done', "success");
                showProgress(current + 1, chunks.length);
            }
            else if (response.status == 308) {
                uploadChunk(current + 1);
            }
            else {
                show("Chunk Error: " + response.status, "error");
            }
            ;
        }).catch(error => { logError("chunk fetch: " + error); });
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
function id(name) {
    const elem = document.getElementById(name);
    if (!elem)
        throw "element not found";
    return elem;
}
function show(text, mode) {
    const cls = (mode) ? ` class="${mode}"` : '';
    id("message").innerHTML = `<div${cls}>${text}</div>`;
    console.log(text);
}
function showProgress(value, max) {
    if (value === undefined || max === undefined) {
        id("progress").replaceChildren();
    }
    else {
        const percent = Math.floor(100 * value / max);
        console.log(`progress: ${percent}%`);
        id("progress").innerHTML =
            `<div>${percent}%</div>
      <div><progress max=${max} value=${value}>${percent}%</progress></div>`;
    }
}
function logError(text) {
    console.log(text);
    document.body.append(text);
}
//# sourceMappingURL=uploader.js.map