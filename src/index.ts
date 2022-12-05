import { RequestOptions } from "./request";
import request from "./request";

type FileChunk = File | Blob;

interface UploaderOptions extends RequestOptions {
  /**
   * 需要上传的文件
   */
  file: File;
  /**
   * 切片大小，字节数，默认 10M
   * @default 10485760
   */
  chunkSize: number;
  /**
   * 跳过的切片编号
   * @default []
   */
  ignoreChunks: number[];
  /**
   * 需要上传的数据
   * 注意如果给定值为函数那么文件切片不会自动被包含到需要上传的数据中，需要在返回的数据中手动添加
   * @default {}
   */
  data?:
    | { [key: string]: any }
    | ((
        chunk: FileChunk,
        index: number
      ) => { [key: string]: any } | Promise<{ [key: string]: any }>);
  /**
   * 同一时间允许存在的最大上传请求个数
   * @default 3
   */
  maxInOneTime?: number;
  /**
   * 分片上传失败时允许的最多重试次数
   * @default 3
   */
  maxRetryTimes?: number;
  /**
   * 切片上传成功时调用的事件处理函数
   * @param res 服务器返回的数据
   */
  onChunkUploadSuccess?: (res: any) => void;
  /**
   * 切片上传失败时触发的事件处理函数，在重试上传也失败后才会调用
   * @param reason 服务区返回的数据
   */
  onChunkUploadFailed?: (reason: any) => void;
  /**
   * 上传过程中触发的事件处理函数，接受一个数值，表示当前上传进度
   * @param progress 当前上传进度 [0, 1]
   */
  onUploadProgress?: (progress: number) => void;
  /**
   * 上传成功后调用
   */
  onUploadSuccess?: () => void;
  /**
   * 上传失败后调用
   * @param err 失败的原因（当前分片上传失败后服务器返回的数据，或网络错误）
   */
  onUploadFailed?: (err: any) => void;
}

/**
 * 取消上传
 */
type AbortControler = () => void;

export default function uploader(options: UploaderOptions): AbortControler {
  const {
    method = "post",
    url,
    file,
    chunkSize = 10 * 1024 * 1024,
    ignoreChunks = [],
    data,
    withCredentials,
    timeout,
    maxInOneTime = 3,
    maxRetryTimes = 3,
    onChunkUploadSuccess,
    onChunkUploadFailed,
    onUploadProgress,
    onUploadSuccess,
    onUploadFailed,
  } = options;
  const AC = new AbortController(),
    chunksLength = Math.ceil(file.size / chunkSize);
  let currentChunkIndex = 0,
    finished = false,
    initialSize: number,
    totalSize: number,
    /** used for saving upload chunk's status */
    chunksMap: Map<number, number>;
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
  const pendingHandlers: Map<number, Promise<any>> = new Map();
  function _next() {
    while (ignoreChunks.includes(currentChunkIndex)) {
      currentChunkIndex++;
      if (currentChunkIndex >= chunksLength) {
        _finish(pendingHandlers);
        return;
      }
    }
    const currentChunk = file.slice(
      currentChunkIndex * chunkSize,
      (currentChunkIndex + 1) * chunkSize
    );
    let _data: { [key: string]: any };
    if (typeof data === "function") {
      _data = data(currentChunk, currentChunkIndex);
    } else if (typeof data === "object" && data !== null) {
      _data = { ...data, chunk: currentChunk };
    } else {
      _data = {};
    }
    // used in `onUploadProgress`
    const _currentChunkIndex = currentChunkIndex;
    const options: RequestOptions = {
      method,
      url,
      withCredentials,
      timeout,
      data: _data,
      signal: AC.signal,
      onUploadProgress: onUploadProgress
        ? function (chunkProgress) {
            chunksMap.set(_currentChunkIndex, chunkProgress);
            const currentSize = [...chunksMap.values()].reduce(
              (curr, prev) => curr + prev,
              initialSize
            );
            const progress = currentSize / totalSize;
            // 因为上传的数据不只有文件，因而这种算法可能会导致 progress 大于 1
            // 对于大文件来说这些大于 1 的部分几乎可以忽略不计
            onUploadProgress(progress > 1 ? 1 : progress);
          }
        : undefined,
    };
    const handler = upload(maxRetryTimes, options).then(
      (res: any) => {
        onChunkUploadSuccess?.(res);
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
        } else {
          _finish(pendingHandlers);
        }
        return res;
      },
      (err: any) => {
        onChunkUploadFailed?.(err);
        AC.abort();
        _finish(pendingHandlers);
        return Promise.reject(err);
      }
    );
    pendingHandlers.set(_currentChunkIndex, handler);
    currentChunkIndex++;
    return handler;
  }

  function _finish(handlers: Map<number, Promise<any>>) {
    if (finished) return;
    finished = true;
    Promise.all(Array.from(handlers.values())).then(
      () => {
        // if `ignoreChunks` contains all chunks, then no upload request will trigger
        //
        onUploadProgress?.(1);
        onUploadSuccess?.();
      },
      (err) => {
        onUploadFailed?.(err);
      }
    );
  }

  for (let i = 0; i < maxInOneTime; i++) {
    if (i >= chunksLength || finished) break;
    _next();
  }

  // abort
  return () => AC.abort();
}

function upload(retryTimes: number, options: RequestOptions) {
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
