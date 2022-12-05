import request from "./request";
export default function uploader(options) {
    const { method = "post", url, file, chunkSize = 10 * 1024 * 1024, ignoreChunks = [], data, withCredentials, timeout, maxInOneTime = 3, maxRetryTimes = 3, onChunkUploadSuccess, onChunkUploadFailed, onUploadProgress, onUploadSuccess, onUploadFailed, } = options;
    const AC = new AbortController(), chunksLength = Math.ceil(file.size / chunkSize);
    let currentChunkIndex = 0, finished = false, initialSize, totalSize, 
    /** used for saving upload chunk's status */
    chunksMap;
    if (onUploadProgress) {
        // 计算已上传切片大小
        initialSize = ignoreChunks.reduce((prev, curr) => {
            const _end = (curr + 1) * chunkSize;
            const end = _end < file.size ? _end : file.size;
            return prev + file.slice(curr * chunkSize, end).size;
        }, 0);
        totalSize = file.size;
        chunksMap = new Map();
    }
    const pendingHandlers = new Map();
    function _next() {
        while (ignoreChunks.includes(currentChunkIndex)) {
            currentChunkIndex++;
            if (currentChunkIndex >= chunksLength) {
                _finish(pendingHandlers);
                return;
            }
        }
        const currentChunk = file.slice(currentChunkIndex * chunkSize, (currentChunkIndex + 1) * chunkSize);
        let _data;
        if (typeof data === "function") {
            _data = data(currentChunk, currentChunkIndex);
        }
        else if (typeof data === "object" && data !== null) {
            _data = Object.assign(Object.assign({}, data), { chunk: currentChunk });
        }
        else {
            _data = {};
        }
        // used in `onUploadProgress`
        const _currentChunkIndex = currentChunkIndex;
        const options = {
            method,
            url,
            withCredentials,
            timeout,
            data: _data,
            signal: AC.signal,
            onUploadProgress: onUploadProgress
                ? function (chunkProgress) {
                    chunksMap.set(_currentChunkIndex, chunkProgress);
                    const currentSize = [...chunksMap.values()].reduce((curr, prev) => curr + prev, initialSize);
                    const progress = currentSize / totalSize;
                    // 因为上传的数据不只有文件，因而这种算法可能会导致 progress 大于 1
                    // 对于大文件来说这些大于 1 的部分几乎可以忽略不计
                    onUploadProgress(progress > 1 ? 1 : progress);
                }
                : undefined,
        };
        const handler = upload(maxRetryTimes, options).then((res) => {
            onChunkUploadSuccess === null || onChunkUploadSuccess === void 0 ? void 0 : onChunkUploadSuccess(res);
            // remove this promise in `pendingHandlers` when the upload is finish
            pendingHandlers.delete(_currentChunkIndex);
            if (onUploadProgress) {
                // remove current chunk's uploaded size in `chunksMap`
                chunksMap.delete(_currentChunkIndex);
                // update `initialSize`
                initialSize += currentChunk.size;
            }
            if (currentChunkIndex < chunksLength) {
                // 继续上传下一个片段
                _next();
            }
            else {
                _finish(pendingHandlers);
            }
            return res;
        }, (err) => {
            onChunkUploadFailed === null || onChunkUploadFailed === void 0 ? void 0 : onChunkUploadFailed(err);
            AC.abort();
            _finish(pendingHandlers);
            return Promise.reject(err);
        });
        pendingHandlers.set(_currentChunkIndex, handler);
        currentChunkIndex++;
        return handler;
    }
    function _finish(handlers) {
        if (finished)
            return;
        finished = true;
        Promise.all(Array.from(handlers.values())).then(() => {
            // if `ignoreChunks` contains all chunks, then no upload request will trigger
            //
            onUploadProgress === null || onUploadProgress === void 0 ? void 0 : onUploadProgress(1);
            onUploadSuccess === null || onUploadSuccess === void 0 ? void 0 : onUploadSuccess();
        }, (err) => {
            onUploadFailed === null || onUploadFailed === void 0 ? void 0 : onUploadFailed(err);
        });
    }
    for (let i = 0; i < maxInOneTime; i++) {
        if (i >= chunksLength || finished)
            break;
        _next();
    }
    // abort
    return () => AC.abort();
}
function upload(retryTimes, options) {
    return request(options).catch((err) => {
        if (err instanceof ProgressEvent && err.type === "abort") {
            console.warn("上传取消");
            return Promise.reject("abort");
        }
        if (retryTimes > 0) {
            console.warn("上传出错，正在重试。剩余重试次数", retryTimes);
            return upload(--retryTimes, options);
        }
        console.warn("上传出错");
        return Promise.reject(err);
    });
}
