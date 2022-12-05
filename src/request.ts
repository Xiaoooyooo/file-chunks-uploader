interface XhrOptions {
  url: string;
  method: string;
  withCredentials?: boolean;
  /**
   * 每次上传超时时间，毫秒
   * @default 30000
   */
  timeout?: number;
  /**
   * 当前分片上传过程调用的事件，接受一个参数表示当前已经上传的数据量
   */
  onUploadProgress?: (chunkProgress: number) => void;
}

export interface RequestOptions extends XhrOptions {
  data?: {
    [key: string]: any;
  };
  signal?: AbortSignal;
}

const signalMap = new WeakMap<AbortSignal, XMLHttpRequest[]>();

export default function request(options: RequestOptions) {
  // options
  const {
    method,
    url,
    data = {},
    signal,
    withCredentials = false,
    timeout = 30000,
    onUploadProgress,
  } = options;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = "json";
    xhr.withCredentials = withCredentials;
    xhr.timeout = timeout;
    xhr.onload = function () {
      const { status, statusText, response } = this;
      let handler: typeof resolve | typeof reject;
      if (status >= 200 && status < 300) {
        handler = resolve;
      } else {
        handler = reject;
      }
      handler({
        status,
        statusText,
        response,
      });
    };
    // download progress
    xhr.onprogress = function (event) {};
    // upload progress
    xhr.upload.onprogress = function (event) {
      onUploadProgress?.(event.loaded);
    };
    // errors
    xhr.onabort = function (event) {
      reject(event);
    };
    xhr.ontimeout = function (event) {
      reject(event);
    };
    xhr.onerror = function (event) {
      reject(event);
    };
    if (Object.prototype.toString.call(data) === "[object Promise]") {
      (data as Promise<any>).then(send);
    } else {
      send(data);
    }
    function send(data: { [key: string]: any }) {
      const form = new FormData();
      for (let key in data) {
        form.append(key, data[key]);
      }
      xhr.send(form);
    }
    //
    if (signal) {
      if (!signalMap.has(signal)) {
        signal.addEventListener(
          "abort",
          function () {
            const xhrs = signalMap.get(this);
            xhrs?.forEach((xhr) => {
              if (xhr.readyState !== xhr.DONE) {
                xhr.abort();
              }
            });
          },
          { once: true }
        );
      }
      const xhrs = signalMap.get(signal) || [];
      signalMap.set(signal, [...xhrs, xhr]);
    }
  });
}
