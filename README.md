# File Chunks Uploader

## Description

A file upload tool that helps you upload file by chunks.

## example

```js
import uploader from "file-chunks-uploader";
const cancelHandler = uploader({
  file: File,
  chunkSize: 20 * 1024 * 1024,
  ignoreChunks: [1, 2, 3],
  url: "/upload",
  method: "post",
  maxInOneTime: 3,
  timeout: 15000,
  data: (chunk, index) => {
    return {
      current: chunk,
      index,
      aaa: "aaa",
    };
    // use Promise
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve({
    //       current: chunk,
    //       index,
    //       aaa: "aaa",
    //     });
    //   }, 500);
    // });
  },
  onChunkUploadSuccess(res) {},
  onChunkUploadFailed(reason) {},
  onUploadSuccess() {},
  onUploadFailed(reason) {},
  onUploadProgress(percent) {},
});

// cancel upload in somewhere
cancelHandler();
```

For detail: 

```bash
# compiler source code in watch mode
cd file-chunks-uploder
yarn
yarn dev

# start the example server
cd file-chunks-uploder/example
yarn
node server.js
```

## API

The `uploader` function returns a function, it is used to cancel the whole upload, and call `onUploadFailed` with a reason "abort".

The `uploader` function's `options` parameter is shown below.

**file:** The file to upload.

**method:** Http method. Default `post`.

**url:** Upload url.

**timeout:** Http timeout. Default `15000`.

**chunkSize:** Max size for each upload chunk, in bytes. Default `10M`.

**ignoreChunks:** Chunks that do not need to be uploaded. Default `[]`.

**data:** The data will be uploaded in each request, it must return an object or a Promise. Default `{}`.

**maxInOneTime:** How many upload request can exist at a time. Default `3`.

**maxRetryTimes:** How many times can retry when a upload fails. Default `3`.

**onChunkUploadSuccess:** Invoked when a chunk upload success.

**onChunkUploadFailed:** Invoked when a chunk uplaod fails and all retry fails too.

**onUploadProgress:** Invoked when upload is in progress.

**onUploadSuccess:** Invoked when the file upload success.

**onUploadFailed:** Invoked when the file upload fails.
