"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const signalMap = new WeakMap();
function request(options) {
    // options
    const { method, url, data = {}, signal, withCredentials = false, timeout = 30000, onUploadProgress, } = options;
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.responseType = "json";
        xhr.withCredentials = withCredentials;
        xhr.timeout = timeout;
        xhr.onload = function () {
            const { status, statusText, response } = this;
            let handler;
            if (status >= 200 && status < 300) {
                handler = resolve;
            }
            else {
                handler = reject;
            }
            handler({
                status,
                statusText,
                response,
            });
        };
        // download progress
        xhr.onprogress = function (event) { };
        // upload progress
        xhr.upload.onprogress = function (event) {
            onUploadProgress === null || onUploadProgress === void 0 ? void 0 : onUploadProgress(event.loaded);
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
            data.then(send);
        }
        else {
            send(data);
        }
        function send(data) {
            const form = new FormData();
            for (let key in data) {
                form.append(key, data[key]);
            }
            xhr.send(form);
        }
        //
        if (signal) {
            if (!signalMap.has(signal)) {
                signal.addEventListener("abort", function () {
                    const xhrs = signalMap.get(this);
                    xhrs === null || xhrs === void 0 ? void 0 : xhrs.forEach((xhr) => {
                        if (xhr.readyState !== xhr.DONE) {
                            xhr.abort();
                        }
                    });
                }, { once: true });
            }
            const xhrs = signalMap.get(signal) || [];
            signalMap.set(signal, [...xhrs, xhr]);
        }
    });
}
exports.default = request;
